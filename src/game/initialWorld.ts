import { createPrng, mix32 } from './prng.ts';
import { floorBottom, floorTop, isInPool } from './space/terrain.ts';
import {
  ENTITY_TYPES,
  LEGAL_REGION,
  SCHEMA_VERSION,
  type EntitySize,
  type EntityType,
  type PixelEntity,
  type Variant,
  type WorldState,
} from './types.ts';

export const LOCAL_WORLD_ID = 'local-garden';
/** Number of specimens a brand-new garden starts with. */
export const STARTER_ENTITY_COUNT = 9;

/** Size distribution: small is most common so the world never feels crowded. */
export function pickSize(roll: number): EntitySize {
  if (roll < 0.5) return 1;
  if (roll < 0.85) return 2;
  return 3;
}

export function pickVariant(roll: number): Variant {
  return Math.min(3, Math.floor(roll * 4)) as Variant;
}

/** A new world from a seed. Deterministic: same seed → same starter garden. */
export function createInitialWorld(seed: number, worldId: string, now: string): WorldState {
  const rng = createPrng(mix32(seed >>> 0, 0xa11ce));
  const entities: PixelEntity[] = [];
  const starterTypes: readonly EntityType[] = ['flower', 'tree', 'shroom', 'crystal', 'slime'];
  for (let i = 0; i < STARTER_ENTITY_COUNT; i++) {
    const type = starterTypes[rng.int(starterTypes.length)] ?? ENTITY_TYPES[0];
    const x = rng.range(LEGAL_REGION.minX + 32, LEGAL_REGION.maxX - 32);
    let y = rng.range(floorTop(x), floorBottom(x));
    // Starter specimens stand on the plaza; only slimes may start in the pool.
    if (type !== 'slime' && isInPool({ x, y })) y = floorTop(x);
    entities.push({
      id: `s-${i}`,
      type,
      x,
      y,
      variant: pickVariant(rng.next()),
      size: pickSize(rng.next()),
      phase: rng.next() * Math.PI * 2,
    });
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    worldId,
    seed: seed >>> 0,
    revision: 0,
    mutations: 0,
    chaos: 12,
    growth: 24,
    palette: 0,
    entities,
    updatedAt: now,
  };
}

/** Seed for a brand-new local world. Randomness here is fine: it is not a canonical transition. */
export function randomSeed(random: () => number = Math.random): number {
  return Math.floor(random() * 0xffffffff) >>> 0;
}
