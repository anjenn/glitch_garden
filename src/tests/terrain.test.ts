import { describe, expect, it } from 'vitest';
import { createInitialWorld } from '../game/initialWorld.ts';
import { applyMutation, placeDrop, typesForZone } from '../game/mutations.ts';
import { createPrng } from '../game/prng.ts';
import {
  floorBottom,
  floorTop,
  groundDepth,
  isInPool,
  ISLAND,
  POOL,
  settleInSky,
  settleOnGround,
  SKY_MARGIN,
  zoneAt,
} from '../game/space/terrain.ts';
import { GROWTH_TYPES, SKY_TYPES, WATER_TYPES, type WorldState } from '../game/types.ts';

const NOW = '2026-01-01T00:00:00.000Z';

describe('terrain profile', () => {
  it('floor top is always above floor bottom across the island', () => {
    for (let x = 0; x <= 480; x += 4) {
      expect(floorTop(x)).toBeLessThan(floorBottom(x));
      expect(Number.isInteger(floorTop(x))).toBe(true);
      expect(Number.isInteger(floorBottom(x))).toBe(true);
    }
  });

  it('classifies zones', () => {
    expect(zoneAt({ x: 240, y: 40 })).toBe('sky');
    expect(zoneAt({ x: 240, y: floorTop(240) - SKY_MARGIN - 1 })).toBe('sky');
    expect(zoneAt({ x: 240, y: floorTop(240) - SKY_MARGIN })).toBe('ground');
    expect(zoneAt({ x: 240, y: 260 })).toBe('water');
    expect(zoneAt({ x: 100, y: 260 })).toBe('ground');
  });

  it('drops wall and sky clicks onto the back edge of the floor', () => {
    const settled = settleOnGround({ x: 300, y: 10 });
    expect(settled).toEqual({ point: { x: 300, y: floorTop(300) }, zone: 'ground', fell: true });
  });

  it('pulls clicks past the front edge back onto the floor', () => {
    const settled = settleOnGround({ x: 150, y: 319 });
    expect(settled.point.y).toBe(floorBottom(150));
    expect(settled.fell).toBe(false);
  });

  it('keeps floor clicks where they are and recognises the pool', () => {
    expect(settleOnGround({ x: 120, y: 270 }).point).toEqual({ x: 120, y: 270 });
    const pool = settleOnGround({ x: 240, y: 270 });
    expect(pool.zone).toBe('water');
    expect(isInPool(pool.point)).toBe(true);
  });

  it('clamps x to the island', () => {
    expect(settleOnGround({ x: -40, y: 250 }).point.x).toBe(ISLAND.left);
    expect(settleOnGround({ x: 999, y: 250 }).point.x).toBe(ISLAND.right);
    expect(settleInSky({ x: 999, y: 10 }).point.x).toBe(ISLAND.right);
  });

  it('sky settles never sink below the sky line', () => {
    const settled = settleInSky({ x: 200, y: 400 });
    expect(settled.point.y).toBeLessThanOrEqual(floorTop(200) - SKY_MARGIN);
    expect(settled.zone).toBe('sky');
  });

  it('ground depth runs 0 at the back to 1 at the front', () => {
    expect(groundDepth({ x: 240, y: floorTop(240) })).toBe(0);
    expect(groundDepth({ x: 240, y: floorBottom(240) })).toBe(1);
    expect(groundDepth({ x: 240, y: 10 })).toBe(0);
  });
});

describe('placement rules (v2)', () => {
  it('sky drops either float as sky types or fall to the floor', () => {
    let floated = 0;
    let fell = 0;
    for (let i = 0; i < 500; i++) {
      const rng = createPrng(i);
      const placed = placeDrop({ x: 240, y: 100 }, rng);
      if (placed.zone === 'sky') {
        floated++;
        expect(placed.point.y).toBe(100);
      } else {
        fell++;
        expect(placed.point.y).toBe(floorTop(240));
      }
    }
    expect(floated).toBeGreaterThan(220);
    expect(fell).toBeGreaterThan(120);
  });

  it('zone allowlists are subsets of the archetypes', () => {
    expect(typesForZone('sky')).toEqual(SKY_TYPES);
    expect(typesForZone('water')).toEqual(WATER_TYPES);
    expect(typesForZone('ground')).toHaveLength(8);
  });

  it('every spawned character stands in a legal zone for its type', () => {
    let world: WorldState = { ...createInitialWorld(77, 'w', NOW), entities: [] };
    for (let i = 0; i < 1500; i++) {
      const action =
        i % 4 === 3
          ? ({ kind: 'random_mutation' } as const)
          : ({ kind: 'click', point: { x: (i * 53) % 480, y: (i * 97) % 320 } } as const);
      const { next, event } = applyMutation(world, action, i, NOW);
      if (event.result === 'spawn') {
        const spawned = next.entities.find((e) => e.id === event.entityId)!;
        const zone = zoneAt(spawned);
        expect(typesForZone(zone)).toContain(spawned.type);
        if (zone === 'ground') {
          expect(spawned.y).toBeGreaterThanOrEqual(floorTop(spawned.x));
          expect(spawned.y).toBeLessThanOrEqual(floorBottom(spawned.x));
          expect(isInPool(spawned)).toBe(false);
        }
      }
      world = next;
    }
  });

  it('transforms keep a specimen inside its zone', () => {
    const base: WorldState = {
      ...createInitialWorld(9, 'w', NOW),
      entities: [
        { id: 'sky', type: 'portal', x: 240, y: 100, variant: 0, size: 1, phase: 0 },
        { id: 'pool', type: 'slime', x: 240, y: 270, variant: 0, size: 1, phase: 0 },
      ],
    };
    let seen = 0;
    for (let i = 0; i < 400; i++) {
      const sky = applyMutation(base, { kind: 'click', point: { x: 242, y: 102 } }, i, NOW);
      if (sky.event.result === 'transform') {
        seen++;
        const e = sky.next.entities.find((x) => x.id === 'sky')!;
        expect(SKY_TYPES).toContain(e.type);
        expect(e.type).not.toBe('portal');
      }
      const pool = applyMutation(base, { kind: 'click', point: { x: 242, y: 272 } }, i, NOW);
      if (pool.event.result === 'transform') {
        const e = pool.next.entities.find((x) => x.id === 'pool')!;
        expect(WATER_TYPES).toContain(e.type);
        expect(e.type).toBe('flower');
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('idle growth sprouts on the plaza, flowers only in the pool', () => {
    let world = createInitialWorld(3, 'w', NOW);
    for (let i = 0; i < 300; i++) {
      const { next, event } = applyMutation(world, { kind: 'idle_growth' }, i, NOW);
      const e = next.entities.find((x) => x.id === event.entityId)!;
      expect(zoneAt(e)).not.toBe('sky');
      if (isInPool(e)) expect(e.type).toBe('flower');
      else expect(GROWTH_TYPES).toContain(e.type);
      world = next;
    }
  });

  it('starter gardens never put a tree in the pool', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const e of createInitialWorld(seed, 'w', NOW).entities) {
        if (e.type !== 'slime') expect(isInPool(e)).toBe(false);
        expect(e.y).toBeGreaterThanOrEqual(floorTop(e.x));
        expect(e.y).toBeLessThanOrEqual(floorBottom(e.x));
      }
    }
  });

  it('pool bounds sit inside the floor band', () => {
    expect(POOL.top).toBeGreaterThanOrEqual(floorTop(POOL.left));
    expect(POOL.bottom).toBeLessThanOrEqual(floorBottom(POOL.right));
  });
});
