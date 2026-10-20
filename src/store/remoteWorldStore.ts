// RemoteWorldRepository: sends intents to the server, reads committed snapshots,
// and reconciles Realtime notifications by revision (spec 03/06).
//
// Nothing here decides a mutation outcome; the server does. This module only
// knows how to ask, how to read back, and how to recover from gaps.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  MAX_VISIBLE_EVENTS,
  PUBLIC_ACTION_KINDS,
  type CanonicalAction,
  type WorldEvent,
  type WorldState,
} from '../game/types.ts';
import { isRecord, isWorldState } from '../game/validate.ts';
import { RepositoryError, type WorldRepository, type WorldSnapshot } from './repository.ts';

export interface RemoteConfig {
  url: string;
  anonKey: string;
  worldId: string;
}

interface EventRow {
  id: string;
  world_id: string;
  revision: number | string;
  action: string;
  event: unknown;
  created_at: string;
}

function rowToEvent(row: EventRow): WorldEvent | null {
  const payload = row.event;
  if (!isRecord(payload)) return null;
  const result = payload.result;
  if (result !== 'spawn' && result !== 'transform' && result !== 'palette') return null;
  const action = row.action;
  if (
    action !== 'click' &&
    action !== 'random_mutation' &&
    action !== 'palette_shift' &&
    action !== 'idle_growth'
  )
    return null;
  const entityId = typeof payload.entityId === 'string' ? payload.entityId : undefined;
  return {
    eventId: row.id,
    worldId: row.world_id,
    revision: Number(row.revision),
    action,
    result,
    createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : row.created_at,
    ...(entityId !== undefined ? { entityId } : {}),
  };
}

export class RemoteWorldRepository implements WorldRepository {
  readonly mode = 'shared' as const;
  readonly ownsIdleGrowth = false;

  private readonly listeners = new Set<(next: WorldSnapshot) => void>();
  private snapshot: WorldSnapshot | null = null;
  private channel: RealtimeChannel | null = null;
  private seenEventIds = new Set<string>();
  private refreshing: Promise<WorldSnapshot> | null = null;
  private online = true;

  constructor(
    private readonly client: SupabaseClient,
    private readonly config: RemoteConfig,
  ) {}

  private async accessToken(): Promise<string> {
    const { data } = await this.client.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
    const { data: anon, error } = await this.client.auth.signInAnonymously();
    if (error || !anon.session)
      throw new RepositoryError('UNAUTHORIZED', 'anonymous sign-in failed');
    return anon.session.access_token;
  }

  private async fetchSnapshot(): Promise<WorldSnapshot> {
    const [stateResult, eventsResult] = await Promise.all([
      this.client
        .from('world_state')
        .select('revision, state')
        .eq('id', this.config.worldId)
        .maybeSingle(),
      this.client
        .from('world_events')
        .select('id, world_id, revision, action, event, created_at')
        .eq('world_id', this.config.worldId)
        .order('revision', { ascending: false })
        .limit(MAX_VISIBLE_EVENTS),
    ]);
    if (stateResult.error || !stateResult.data) {
      throw new RepositoryError('WORLD_UNAVAILABLE', stateResult.error?.message ?? 'world missing');
    }
    const state: unknown = stateResult.data.state;
    if (!isWorldState(state))
      throw new RepositoryError('WORLD_UNAVAILABLE', 'invalid world payload');
    const world: WorldState = state;
    const events = ((eventsResult.data ?? []) as EventRow[])
      .map(rowToEvent)
      .filter((event): event is WorldEvent => event !== null);
    for (const event of events) this.seenEventIds.add(event.eventId);
    const next: WorldSnapshot = { world, events, visits: 0, persistent: true };
    // Never move backwards: a stale fetch racing a newer one is ignored.
    if (this.snapshot && this.snapshot.world.revision > world.revision) return this.snapshot;
    this.snapshot = next;
    return next;
  }

  /** Coalesces concurrent refreshes into one request. */
  private refresh(): Promise<WorldSnapshot> {
    if (!this.refreshing) {
      this.refreshing = this.fetchSnapshot().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private emit(): void {
    if (!this.snapshot) return;
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private subscribeRealtime(): void {
    if (this.channel) return;
    this.channel = this.client
      .channel(`world:${this.config.worldId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'world_events',
          filter: `world_id=eq.${this.config.worldId}`,
        },
        (payload) => {
          const row = payload.new as Partial<EventRow>;
          if (typeof row.id !== 'string' || this.seenEventIds.has(row.id)) return;
          const revision = Number(row.revision);
          const current = this.snapshot?.world.revision ?? -1;
          if (!Number.isFinite(revision) || revision <= current) return;
          // Any newer revision (contiguous or a gap) → fetch the authoritative snapshot.
          void this.refresh()
            .then(() => this.emit())
            .catch(() => undefined);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (!this.online) {
            this.online = true;
            void this.refresh()
              .then(() => this.emit())
              .catch(() => undefined);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.online = false;
        }
      });
  }

  async load(): Promise<WorldSnapshot> {
    await this.accessToken();
    const snapshot = await this.refresh();
    this.subscribeRealtime();
    return snapshot;
  }

  async interact(action: CanonicalAction): Promise<WorldSnapshot> {
    if (!(PUBLIC_ACTION_KINDS as readonly string[]).includes(action.kind)) {
      throw new RepositoryError('INVALID_INPUT', `${action.kind} is server-only`);
    }
    const token = await this.accessToken();
    const body = {
      worldId: this.config.worldId,
      clientEventId: crypto.randomUUID(),
      action: action.kind,
      ...(action.kind === 'click' ? { point: action.point } : {}),
    };
    let response: Response;
    try {
      response = await fetch(`${this.config.url}/functions/v1/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: this.config.anonKey,
        },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      throw new RepositoryError(
        'NETWORK',
        cause instanceof Error ? cause.message : 'network error',
      );
    }
    if (!response.ok) {
      const retryAfter = Number(response.headers.get('Retry-After') ?? '0') * 1000;
      let code: RepositoryError['code'] = 'WORLD_UNAVAILABLE';
      let message = `HTTP ${response.status}`;
      try {
        const payload: unknown = await response.json();
        if (isRecord(payload) && isRecord(payload.error)) {
          const candidate = payload.error.code;
          if (
            candidate === 'INVALID_INPUT' ||
            candidate === 'UNAUTHORIZED' ||
            candidate === 'REVISION_CONFLICT' ||
            candidate === 'RATE_LIMITED' ||
            candidate === 'WORLD_UNAVAILABLE'
          )
            code = candidate;
          if (typeof payload.error.message === 'string') message = payload.error.message;
        }
      } catch {
        // keep defaults
      }
      throw new RepositoryError(code, message, retryAfter || undefined);
    }
    // The committed snapshot is the truth; the Realtime notification may also arrive, deduped by eventId.
    const snapshot = await this.refresh();
    this.emit();
    return snapshot;
  }

  subscribe(listener: (next: WorldSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.channel) {
      void this.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export async function createRemoteRepository(config: RemoteConfig): Promise<WorldRepository> {
  if (!config.url || !config.anonKey) throw new Error('shared mode is not configured');
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  const repository = new RemoteWorldRepository(client, config);
  // Fail fast so the app can fall back to the local demo with an honest label.
  await repository.load();
  return repository;
}
