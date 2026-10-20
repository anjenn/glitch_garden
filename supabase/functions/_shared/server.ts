// Helpers shared by the interact and growth Edge Functions (Deno runtime).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { hashString, mix32 } from './game/prng.ts';
import type { WorldEvent, WorldEventDraft, WorldState } from './game/types.ts';
import { isWorldState } from './game/validate.ts';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export type ErrorCode =
  'INVALID_INPUT' | 'UNAUTHORIZED' | 'REVISION_CONFLICT' | 'RATE_LIMITED' | 'WORLD_UNAVAILABLE';

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra },
  });
}

export function fail(
  code: ErrorCode,
  message: string,
  extra: Record<string, string> = {},
): Response {
  const status =
    code === 'INVALID_INPUT'
      ? 400
      : code === 'UNAUTHORIZED'
        ? 401
        : code === 'REVISION_CONFLICT'
          ? 409
          : code === 'RATE_LIMITED'
            ? 429
            : 503;
  return json({ error: { code, message } }, status, extra);
}

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing env ${name}`);
  return value;
}

export function serviceClient(): SupabaseClient {
  // Service credentials exist only in Edge Function secrets, never in VITE_ variables.
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Server-owned step entropy: mixes a secret the browser cannot know. */
export function serverEntropy(seed: number, nextRevision: number): number {
  const secret = Deno.env.get('WORLD_ENTROPY_SECRET') ?? 'glitch-garden-default-entropy';
  return mix32(hashString(secret), seed, nextRevision);
}

export async function readWorld(
  client: SupabaseClient,
  worldId: string,
): Promise<{ world: WorldState; revision: number } | null> {
  const { data, error } = await client
    .from('world_state')
    .select('revision, state')
    .eq('id', worldId)
    .maybeSingle();
  if (error || !data) return null;
  const state: unknown = data.state;
  if (!isWorldState(state)) return null;
  if (state.revision !== Number(data.revision)) return null;
  return { world: state, revision: Number(data.revision) };
}

export interface CommitInput {
  worldId: string;
  expectedRevision: number;
  state: WorldState;
  event: WorldEventDraft;
  subjectHash?: string;
  clientEventId?: string;
  growthBucket?: string;
}

export interface CommitResult {
  status: 'committed' | 'conflict' | 'duplicate' | 'read_only' | 'missing';
  revision?: number;
  eventId?: string;
}

export async function commit(client: SupabaseClient, input: CommitInput): Promise<CommitResult> {
  const { data, error } = await client.rpc('commit_world_mutation', {
    p_world_id: input.worldId,
    p_expected_revision: input.expectedRevision,
    p_state: input.state,
    p_event: input.event,
    p_subject_hash: input.subjectHash ?? null,
    p_client_event_id: input.clientEventId ?? null,
    p_growth_bucket: input.growthBucket ?? null,
  });
  if (error) throw new Error(`commit failed: ${error.message}`);
  return data as CommitResult;
}

export function toPublicEvent(draft: WorldEventDraft, eventId: string): WorldEvent {
  return { eventId, ...draft };
}
