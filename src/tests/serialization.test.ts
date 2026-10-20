import { describe, expect, it } from 'vitest';
import { MAX_ENTITIES, MAX_VISIBLE_EVENTS } from '../game/types.ts';
import { isWorldState } from '../game/validate.ts';
import {
  LEGACY_STORAGE_KEY,
  LocalWorldRepository,
  migrateLegacyState,
  STORAGE_KEY,
  type StorageLike,
} from '../store/localWorldStore.ts';

const NOW = '2026-01-01T00:00:00.000Z';

class MemoryStorage implements StorageLike {
  readonly map = new Map<string, string>();
  failWrites = false;
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

function repo(storage: StorageLike | null, seed = 4242) {
  return new LocalWorldRepository({ storage, now: () => NOW, seed: () => seed });
}

describe('LocalWorldRepository', () => {
  it('creates a fresh world, counts the visit and persists it', async () => {
    const storage = new MemoryStorage();
    const snapshot = await repo(storage).load();
    expect(snapshot.visits).toBe(1);
    expect(snapshot.persistent).toBe(true);
    expect(isWorldState(snapshot.world)).toBe(true);
    expect(storage.map.has(STORAGE_KEY)).toBe(true);
  });

  it('round-trips the same world and increments visits on reload', async () => {
    const storage = new MemoryStorage();
    const first = repo(storage);
    await first.load();
    await first.interact({ kind: 'click', point: { x: 200, y: 200 } });
    await first.interact({ kind: 'palette_shift' });
    const before = (await first.interact({ kind: 'random_mutation' })).world;

    const second = await repo(storage, 1).load();
    expect(second.world).toEqual(before);
    expect(second.visits).toBe(2);
    expect(second.events).toHaveLength(3);
    expect(second.events[0]?.action).toBe('random_mutation');
  });

  it('keeps only the most recent visible events', async () => {
    const storage = new MemoryStorage();
    const r = repo(storage);
    await r.load();
    for (let i = 0; i < 20; i++) await r.interact({ kind: 'random_mutation' });
    const snapshot = await repo(storage).load();
    expect(snapshot.events).toHaveLength(MAX_VISIBLE_EVENTS);
    expect(snapshot.events[0]?.revision).toBe(20);
  });

  it.each([
    ['malformed JSON', '{not json'],
    ['wrong shape', JSON.stringify({ hello: 'world' })],
    ['null', 'null'],
    ['array', '[]'],
    [
      'tampered entities',
      JSON.stringify({ schemaVersion: 1, world: { entities: 'x' }, events: [], visits: 1 }),
    ],
    ['future schema', JSON.stringify({ schemaVersion: 99, world: {}, events: [], visits: 1 })],
  ])('recovers from %s in storage with a fresh world', async (_label, raw) => {
    const storage = new MemoryStorage();
    storage.map.set(STORAGE_KEY, raw);
    const snapshot = await repo(storage).load();
    expect(isWorldState(snapshot.world)).toBe(true);
    expect(snapshot.visits).toBe(1);
  });

  it('rejects a persisted world with more than the entity cap', async () => {
    const storage = new MemoryStorage();
    const r = repo(storage);
    const good = await r.load();
    const bloated = JSON.parse(storage.map.get(STORAGE_KEY)!) as { world: { entities: unknown[] } };
    bloated.world.entities = new Array(MAX_ENTITIES + 1).fill(good.world.entities[0]);
    storage.map.set(STORAGE_KEY, JSON.stringify(bloated));
    const snapshot = await repo(storage, 77).load();
    expect(snapshot.world.seed).toBe(77); // fresh, not the bloated one
  });

  it('falls back to memory when storage is unavailable', async () => {
    const r = repo(null);
    const snapshot = await r.load();
    expect(snapshot.persistent).toBe(false);
    const next = await r.interact({ kind: 'random_mutation' });
    expect(next.world.mutations).toBe(1);
    expect(next.persistent).toBe(false);
  });

  it('keeps working in memory when writes start failing', async () => {
    const storage = new MemoryStorage();
    const r = repo(storage);
    await r.load();
    storage.failWrites = true;
    const next = await r.interact({ kind: 'random_mutation' });
    expect(next.world.mutations).toBe(1);
    expect(next.persistent).toBe(false);
  });

  it('reset produces a new seed and clears history', async () => {
    const storage = new MemoryStorage();
    let seed = 1;
    const r = new LocalWorldRepository({ storage, now: () => NOW, seed: () => seed++ });
    await r.load();
    await r.interact({ kind: 'random_mutation' });
    const fresh = await r.reset();
    expect(fresh.world.seed).toBe(2);
    expect(fresh.world.mutations).toBe(0);
    expect(fresh.events).toHaveLength(0);
    expect(fresh.visits).toBe(1);
  });

  it('notifies subscribers after every mutation', async () => {
    const r = repo(new MemoryStorage());
    await r.load();
    let calls = 0;
    const unsubscribe = r.subscribe(() => calls++);
    await r.interact({ kind: 'random_mutation' });
    await r.interact({ kind: 'palette_shift' });
    unsubscribe();
    await r.interact({ kind: 'random_mutation' });
    expect(calls).toBe(2);
  });
});

describe('legacy mockup migration', () => {
  const legacy = {
    seed: 123456,
    visits: 5,
    mutations: 9,
    wonder: 40,
    growth: 70,
    creatures: [
      { x: 0.5, y: 0.5, type: 0, born: 1, variant: 1 },
      { x: 0.9, y: 0.2, type: 4, born: 2, variant: 2 },
      { x: 'bad', y: 0.2, type: 1 },
      { x: 5, y: -5, type: 99, variant: 99 },
    ],
    history: [],
    seq: 4,
  };

  it('maps creatures into valid entities and preserves counters', () => {
    const migrated = migrateLegacyState(legacy, NOW);
    expect(migrated).not.toBeNull();
    expect(isWorldState(migrated!.world)).toBe(true);
    expect(migrated!.world.seed).toBe(123456);
    expect(migrated!.world.mutations).toBe(9);
    expect(migrated!.world.chaos).toBe(40);
    expect(migrated!.world.growth).toBe(70);
    expect(migrated!.visits).toBe(5);
    expect(migrated!.world.entities).toHaveLength(3);
    expect(migrated!.world.entities[0]).toMatchObject({
      type: 'flower',
      x: 240,
      y: 160,
      variant: 1,
    });
    expect(migrated!.world.entities[1]?.type).toBe('totem');
  });

  it('is picked up automatically by the repository', async () => {
    const storage = new MemoryStorage();
    storage.map.set(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
    const snapshot = await repo(storage).load();
    expect(snapshot.world.seed).toBe(123456);
    expect(snapshot.visits).toBe(6);
    expect(storage.map.has(STORAGE_KEY)).toBe(true);
  });

  it('ignores garbage', () => {
    expect(migrateLegacyState(null, NOW)).toBeNull();
    expect(migrateLegacyState({ seed: 'x' }, NOW)).toBeNull();
    expect(
      migrateLegacyState({ seed: 1, creatures: 'nope' }, NOW)?.world.entities.length,
    ).toBeGreaterThan(0);
  });
});
