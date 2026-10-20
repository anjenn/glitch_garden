// LocalWorldRepository: applies the engine directly and persists to localStorage.
// Handles schema migration, validation, and an in-memory fallback when storage
// is disabled, full, or throws (private browsing).

import { createInitialWorld, LOCAL_WORLD_ID, randomSeed } from '../game/initialWorld.ts';
import { applyMutation } from '../game/mutations.ts';
import { localEntropy } from '../game/prng.ts';
import {
  ENTITY_TYPES,
  LEGAL_REGION,
  MAX_VISIBLE_EVENTS,
  SCHEMA_VERSION,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type CanonicalAction,
  type EntityType,
  type PixelEntity,
  type WorldEvent,
  type WorldState,
} from '../game/types.ts';
import { isRecord, isWorldEvent, isWorldState } from '../game/validate.ts';
import type { WorldRepository, WorldSnapshot } from './repository.ts';

export const STORAGE_KEY = 'glitch-garden:v1';
/** Key used by the original standalone mockup; migrated once, then left alone. */
export const LEGACY_STORAGE_KEY = 'glitch-garden-pastel-v1';
const MAX_VISITS = 999_999;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistedLocalState {
  schemaVersion: typeof SCHEMA_VERSION;
  world: WorldState;
  events: WorldEvent[];
  visits: number;
}

export interface LocalStoreOptions {
  storage: StorageLike | null;
  now?: () => string;
  seed?: () => number;
}

function isPersistedState(value: unknown): value is PersistedLocalState {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== SCHEMA_VERSION) return false;
  if (!isWorldState(value.world)) return false;
  if (!Array.isArray(value.events) || !value.events.every(isWorldEvent)) return false;
  if (!Number.isInteger(value.visits) || (value.visits as number) < 0) return false;
  return true;
}

/** Map the mockup's 6 species onto the production allowlist. */
const LEGACY_TYPES: readonly EntityType[] = [
  'flower',
  'tree',
  'crystal',
  'shroom',
  'totem',
  'portal',
];

/**
 * Best-effort migration of the mockup's `{seed, creatures:[{x,y,type,variant}]}`
 * shape. Anything that does not fit is dropped; the result is validated like any
 * other state, so a hostile payload can at worst produce an empty garden.
 */
export function migrateLegacyState(raw: unknown, now: string): PersistedLocalState | null {
  if (!isRecord(raw)) return null;
  if (!Number.isInteger(raw.seed)) return null;
  const seed = (raw.seed as number) >>> 0;
  const base = createInitialWorld(seed, LOCAL_WORLD_ID, now);
  const creatures = Array.isArray(raw.creatures) ? raw.creatures.slice(-85) : [];
  const entities: PixelEntity[] = [];
  creatures.forEach((creature, index) => {
    if (!isRecord(creature)) return;
    const nx = creature.x;
    const ny = creature.y;
    if (
      typeof nx !== 'number' ||
      typeof ny !== 'number' ||
      !Number.isFinite(nx) ||
      !Number.isFinite(ny)
    )
      return;
    const typeIndex = Number.isInteger(creature.type) ? (creature.type as number) : 0;
    const type = LEGACY_TYPES[typeIndex] ?? ENTITY_TYPES[0];
    const variantRaw = Number.isInteger(creature.variant) ? (creature.variant as number) : 0;
    entities.push({
      id: `m-${index}`,
      type,
      x: Math.max(LEGAL_REGION.minX, Math.min(LEGAL_REGION.maxX, Math.round(nx * WORLD_WIDTH))),
      y: Math.max(LEGAL_REGION.minY, Math.min(LEGAL_REGION.maxY, Math.round(ny * WORLD_HEIGHT))),
      variant: Math.max(0, Math.min(3, variantRaw)) as PixelEntity['variant'],
      size: 2,
      phase: 0,
    });
  });
  const mutations = Number.isInteger(raw.mutations) ? Math.max(0, raw.mutations as number) : 0;
  const clampPct = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.max(0, Math.min(100, Math.round(v)))
      : fallback;
  const world: WorldState = {
    ...base,
    entities: entities.length > 0 ? entities : base.entities,
    mutations,
    revision: mutations,
    chaos: clampPct(raw.wonder, base.chaos),
    growth: clampPct(raw.growth, base.growth),
  };
  if (!isWorldState(world)) return null;
  const visits = Number.isInteger(raw.visits) ? Math.max(0, raw.visits as number) : 0;
  return { schemaVersion: SCHEMA_VERSION, world, events: [], visits };
}

export class LocalWorldRepository implements WorldRepository {
  readonly mode = 'local' as const;
  readonly ownsIdleGrowth = true;

  private readonly storage: StorageLike | null;
  private readonly now: () => string;
  private readonly seed: () => number;
  private readonly listeners = new Set<(next: WorldSnapshot) => void>();
  private state: PersistedLocalState | null = null;
  private persistent = true;

  constructor(options: LocalStoreOptions) {
    this.storage = options.storage;
    this.now = options.now ?? (() => new Date().toISOString());
    this.seed = options.seed ?? randomSeed;
  }

  private read(): PersistedLocalState | null {
    if (!this.storage) {
      this.persistent = false;
      return null;
    }
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isPersistedState(parsed)) return parsed;
      }
      const legacy = this.storage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const migrated = migrateLegacyState(JSON.parse(legacy), this.now());
        if (migrated) return migrated;
      }
    } catch {
      // Corrupt JSON or blocked storage: fall through to a fresh world.
    }
    return null;
  }

  private write(): void {
    if (!this.storage || !this.state) {
      this.persistent = false;
      return;
    }
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.persistent = true;
    } catch {
      this.persistent = false;
    }
  }

  private fresh(): PersistedLocalState {
    return {
      schemaVersion: SCHEMA_VERSION,
      world: createInitialWorld(this.seed(), LOCAL_WORLD_ID, this.now()),
      events: [],
      visits: 0,
    };
  }

  private snapshot(): WorldSnapshot {
    if (!this.state) throw new Error('repository not loaded');
    return {
      world: this.state.world,
      events: this.state.events,
      visits: this.state.visits,
      persistent: this.persistent,
    };
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  async load(): Promise<WorldSnapshot> {
    const stored = this.read();
    this.state = stored ?? this.fresh();
    this.state.visits = Math.min(MAX_VISITS, this.state.visits + 1);
    this.write();
    return this.snapshot();
  }

  async interact(action: CanonicalAction): Promise<WorldSnapshot> {
    if (!this.state) await this.load();
    const current = this.state!;
    const world = current.world;
    const { next, event } = applyMutation(
      world,
      action,
      localEntropy(world.seed, world.revision + 1),
      this.now(),
    );
    const stored: WorldEvent = { eventId: `local-${event.revision}`, ...event };
    this.state = {
      ...current,
      world: next,
      events: [stored, ...current.events].slice(0, MAX_VISIBLE_EVENTS),
    };
    this.write();
    this.emit();
    return this.snapshot();
  }

  async reset(): Promise<WorldSnapshot> {
    this.state = { ...this.fresh(), visits: 1 };
    this.write();
    this.emit();
    return this.snapshot();
  }

  subscribe(listener: (next: WorldSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/** Returns window.localStorage when it is usable, otherwise null. */
export function safeLocalStorage(): StorageLike | null {
  try {
    const storage = globalThis.localStorage;
    const probe = '__glitch_garden_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
