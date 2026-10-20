import { describe, expect, it } from 'vitest';
import { createInitialWorld } from '../game/initialWorld.ts';
import { applyMutation } from '../game/mutations.ts';
import { createPrng, localEntropy } from '../game/prng.ts';
import {
  ENTITY_TYPES,
  GROWTH_TYPES,
  LEGAL_REGION,
  MAX_ENTITIES,
  type CanonicalAction,
  type WorldState,
} from '../game/types.ts';
import { isWorldState } from '../game/validate.ts';

const NOW = '2026-01-01T00:00:00.000Z';
const WORLD_ID = 'test-world';

function step(world: WorldState, action: CanonicalAction, now = NOW) {
  return applyMutation(world, action, localEntropy(world.seed, world.revision + 1), now);
}

describe('createInitialWorld', () => {
  it('is deterministic and valid', () => {
    const a = createInitialWorld(123456, WORLD_ID, NOW);
    const b = createInitialWorld(123456, WORLD_ID, NOW);
    expect(a).toEqual(b);
    expect(isWorldState(a)).toBe(true);
    expect(a.revision).toBe(0);
    expect(a.entities.length).toBeGreaterThan(0);
  });

  it('differs between seeds', () => {
    const a = createInitialWorld(1, WORLD_ID, NOW);
    const b = createInitialWorld(2, WORLD_ID, NOW);
    expect(a.entities).not.toEqual(b.entities);
  });
});

describe('applyMutation', () => {
  it('is deterministic: same world + action + entropy gives byte-equal state', () => {
    const world = createInitialWorld(777, WORLD_ID, NOW);
    const action: CanonicalAction = { kind: 'click', point: { x: 240, y: 160 } };
    const a = applyMutation(world, action, 4242, NOW);
    const b = applyMutation(world, action, 4242, NOW);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different entropy changes the outcome', () => {
    const world = createInitialWorld(777, WORLD_ID, NOW);
    const action: CanonicalAction = { kind: 'random_mutation' };
    const a = applyMutation(world, action, 1, NOW);
    const b = applyMutation(world, action, 2, NOW);
    expect(a.next.entities).not.toEqual(b.next.entities);
  });

  it('does not mutate its input', () => {
    const world = createInitialWorld(5, WORLD_ID, NOW);
    const frozen = JSON.stringify(world);
    step(world, { kind: 'click', point: { x: 10, y: 10 } });
    step(world, { kind: 'palette_shift' });
    step(world, { kind: 'idle_growth' });
    expect(JSON.stringify(world)).toBe(frozen);
  });

  it('increments revision and mutations by exactly one', () => {
    const world = createInitialWorld(5, WORLD_ID, NOW);
    const { next, event } = step(world, { kind: 'click', point: { x: 100, y: 150 } });
    expect(next.revision).toBe(1);
    expect(next.mutations).toBe(1);
    expect(event.revision).toBe(1);
    expect(event.worldId).toBe(WORLD_ID);
    expect(event.createdAt).toBe(NOW);
    expect(next.updatedAt).toBe(NOW);
  });

  it('a click in empty space spawns a settled specimen with the next id', () => {
    const world: WorldState = { ...createInitialWorld(5, WORLD_ID, NOW), entities: [] };
    const { next, event } = step(world, { kind: 'click', point: { x: -100, y: 9999 } });
    expect(event.result).toBe('spawn');
    expect(event.entityId).toBe('e-1');
    const spawned = next.entities.find((e) => e.id === 'e-1');
    expect(spawned).toBeDefined();
    expect(spawned!.x).toBeGreaterThanOrEqual(LEGAL_REGION.minX);
    expect(spawned!.y).toBeLessThanOrEqual(LEGAL_REGION.maxY);
    expect(ENTITY_TYPES).toContain(spawned?.type);
  });

  it('clicking next to an entity sometimes transforms it (probability ≈ 0.35)', () => {
    const base: WorldState = {
      ...createInitialWorld(9, WORLD_ID, NOW),
      entities: [{ id: 'target', type: 'flower', x: 200, y: 200, variant: 0, size: 1, phase: 0 }],
    };
    let transforms = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const { next, event } = applyMutation(
        base,
        { kind: 'click', point: { x: 205, y: 203 } },
        i,
        NOW,
      );
      if (event.result === 'transform') {
        transforms++;
        expect(event.entityId).toBe('target');
        expect(next.entities).toHaveLength(1);
        const target = next.entities[0]!;
        expect(target.type).not.toBe('flower');
        expect(target.x).toBe(200);
        expect(target.y).toBe(200);
      } else {
        expect(next.entities).toHaveLength(2);
      }
    }
    const ratio = transforms / trials;
    expect(ratio).toBeGreaterThan(0.28);
    expect(ratio).toBeLessThan(0.42);
  });

  it('a click far from every entity never transforms', () => {
    const base: WorldState = {
      ...createInitialWorld(9, WORLD_ID, NOW),
      entities: [{ id: 'target', type: 'flower', x: 200, y: 200, variant: 0, size: 1, phase: 0 }],
    };
    for (let i = 0; i < 300; i++) {
      const { event } = applyMutation(base, { kind: 'click', point: { x: 400, y: 100 } }, i, NOW);
      expect(event.result).toBe('spawn');
    }
  });

  it('palette_shift cycles 0→1→2→3→0 and leaves entities untouched', () => {
    let world = createInitialWorld(11, WORLD_ID, NOW);
    const entities = JSON.stringify(world.entities);
    const seen: number[] = [world.palette];
    for (let i = 0; i < 4; i++) {
      const { next, event } = step(world, { kind: 'palette_shift' });
      expect(event.result).toBe('palette');
      expect(event.entityId).toBeUndefined();
      expect(JSON.stringify(next.entities)).toBe(entities);
      expect(next.mutations).toBe(world.mutations + 1);
      world = next;
      seen.push(world.palette);
    }
    expect(seen).toEqual([0, 1, 2, 3, 0]);
  });

  it('idle_growth spawns only flowers or trees and never raises chaos', () => {
    let world = createInitialWorld(13, WORLD_ID, NOW);
    for (let i = 0; i < 50; i++) {
      const { next, event } = step(world, { kind: 'idle_growth' });
      expect(event.result).toBe('spawn');
      const spawned = next.entities.find((e) => e.id === event.entityId)!;
      expect(GROWTH_TYPES).toContain(spawned.type);
      expect(next.chaos).toBe(world.chaos);
      expect(next.growth).toBeGreaterThanOrEqual(world.growth);
      world = next;
    }
  });

  it('user mutations raise chaos by 1–5 and growth by 1–3 (until clamped)', () => {
    const world = { ...createInitialWorld(13, WORLD_ID, NOW), chaos: 50, growth: 50 };
    for (let i = 0; i < 200; i++) {
      const { next } = applyMutation(world, { kind: 'random_mutation' }, i, NOW);
      expect(next.chaos - world.chaos).toBeGreaterThanOrEqual(1);
      expect(next.chaos - world.chaos).toBeLessThanOrEqual(5);
      expect(next.growth - world.growth).toBeGreaterThanOrEqual(1);
      expect(next.growth - world.growth).toBeLessThanOrEqual(3);
    }
  });

  it('replaces the oldest specimen when the world is full', () => {
    let world: WorldState = { ...createInitialWorld(21, WORLD_ID, NOW), entities: [] };
    for (let i = 0; i < MAX_ENTITIES; i++) {
      world = step(world, {
        kind: 'click',
        point: { x: 8 + ((i * 37) % 460), y: 80 + ((i * 53) % 220) },
      }).next;
    }
    // Some clicks may have transformed instead of spawning; keep going until full.
    while (world.entities.length < MAX_ENTITIES) {
      world = step(world, { kind: 'idle_growth' }).next;
    }
    expect(world.entities).toHaveLength(MAX_ENTITIES);
    const oldest = world.entities[0]!.id;
    const { next } = step(world, { kind: 'idle_growth' });
    expect(next.entities).toHaveLength(MAX_ENTITIES);
    expect(next.entities.some((e) => e.id === oldest)).toBe(false);
    expect(next.entities[MAX_ENTITIES - 1]!.id).toBe(`e-${next.revision}`);
  });

  it('10,000 mixed mutations keep every invariant', () => {
    let world = createInitialWorld(0xdeadbeef, WORLD_ID, NOW);
    const chooser = createPrng(99);
    const kinds: CanonicalAction['kind'][] = [
      'click',
      'random_mutation',
      'palette_shift',
      'idle_growth',
    ];
    for (let i = 0; i < 10_000; i++) {
      const kind = kinds[chooser.int(kinds.length)]!;
      const action: CanonicalAction =
        kind === 'click'
          ? { kind, point: { x: chooser.int(2000) - 500, y: chooser.int(2000) - 500 } }
          : { kind };
      const { next, event } = step(world, action);
      expect(next.revision).toBe(world.revision + 1);
      expect(next.mutations).toBe(world.mutations + 1);
      expect(event.revision).toBe(next.revision);
      world = next;
    }
    expect(world.entities.length).toBeLessThanOrEqual(MAX_ENTITIES);
    expect(isWorldState(world)).toBe(true);
    const ids = new Set(world.entities.map((e) => e.id));
    expect(ids.size).toBe(world.entities.length);
    for (const entity of world.entities) {
      expect(Number.isInteger(entity.x)).toBe(true);
      expect(Number.isInteger(entity.y)).toBe(true);
      expect(entity.x).toBeGreaterThanOrEqual(LEGAL_REGION.minX);
      expect(entity.x).toBeLessThanOrEqual(LEGAL_REGION.maxX);
      expect(entity.y).toBeGreaterThanOrEqual(LEGAL_REGION.minY);
      expect(entity.y).toBeLessThanOrEqual(LEGAL_REGION.maxY);
      expect(Number.isFinite(entity.phase)).toBe(true);
    }
    expect(world.chaos).toBeGreaterThanOrEqual(0);
    expect(world.chaos).toBeLessThanOrEqual(100);
    expect(world.growth).toBeGreaterThanOrEqual(0);
    expect(world.growth).toBeLessThanOrEqual(100);
    expect([0, 1, 2, 3]).toContain(world.palette);
  });

  it('replays the same input sequence to the same snapshot', () => {
    const run = () => {
      let world = createInitialWorld(31337, WORLD_ID, NOW);
      for (let i = 0; i < 500; i++) {
        const action: CanonicalAction =
          i % 3 === 0
            ? { kind: 'click', point: { x: (i * 7) % 480, y: (i * 11) % 320 } }
            : i % 3 === 1
              ? { kind: 'random_mutation' }
              : { kind: 'idle_growth' };
        world = step(world, action).next;
      }
      return JSON.stringify(world);
    };
    expect(run()).toBe(run());
  });
});
