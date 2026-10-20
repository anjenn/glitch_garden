// The canonical mutation reducer (spec 05, rules v2). Intent in; deterministic state out.
// No Math.random, Date.now, DOM, storage or network access in this file.
//
// Rules v2 adds terrain awareness (space/terrain.ts): a specimen dropped in the
// sky or on a wall falls to the plaza floor, the waterfall pool only accepts
// water types, and sky clicks sometimes leave a floating specimen in the air.

import { nearestEntity } from './hitTest.ts';
import { pickSize, pickVariant } from './initialWorld.ts';
import { nextPaletteId } from './palettes.ts';
import { streamFor, type Prng } from './prng.ts';
import {
  floorBottom,
  floorTop,
  isInPool,
  settleInSky,
  settleOnGround,
  zoneAt,
  type Zone,
} from './space/terrain.ts';
import {
  ENTITY_TYPES,
  GROWTH_TYPES,
  LEGAL_REGION,
  MAX_ENTITIES,
  SKY_FLOAT_PROBABILITY,
  SKY_TYPES,
  TRANSFORM_PROBABILITY,
  WATER_TYPES,
  type CanonicalAction,
  type EntityType,
  type PixelEntity,
  type Point,
  type WorldEventDraft,
  type WorldState,
} from './types.ts';

export interface MutationResult {
  next: WorldState;
  event: WorldEventDraft;
}

export class MutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MutationError';
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampToLegalRegion(point: Point): Point {
  return {
    x: clamp(Math.round(point.x), LEGAL_REGION.minX, LEGAL_REGION.maxX),
    y: clamp(Math.round(point.y), LEGAL_REGION.minY, LEGAL_REGION.maxY),
  };
}

function randomLegalPoint(rng: Prng): Point {
  return {
    x: rng.range(LEGAL_REGION.minX, LEGAL_REGION.maxX),
    y: rng.range(LEGAL_REGION.minY, LEGAL_REGION.maxY),
  };
}

function pickType(rng: Prng, allowlist: readonly EntityType[]): EntityType {
  const type = allowlist[rng.int(allowlist.length)];
  if (!type) throw new MutationError('empty type allowlist');
  return type;
}

/** Types allowed to exist in a zone. */
export function typesForZone(zone: Zone): readonly EntityType[] {
  switch (zone) {
    case 'sky':
      return SKY_TYPES;
    case 'water':
      return WATER_TYPES;
    default:
      return ENTITY_TYPES;
  }
}

/**
 * Decide where a dropped specimen ends up. Sky drops either float (a sky type
 * stays where it was clicked) or fall onto the floor; everything else settles
 * on the ground or in the pool.
 */
export function placeDrop(point: Point, rng: Prng): { point: Point; zone: Zone } {
  const clamped = clampToLegalRegion(point);
  if (zoneAt(clamped) === 'sky' && rng.next() < SKY_FLOAT_PROBABILITY) {
    const sky = settleInSky(clamped);
    return { point: sky.point, zone: 'sky' };
  }
  const ground = settleOnGround(clamped);
  return { point: ground.point, zone: ground.zone };
}

/** Spawn at `point`; when the world is full, the oldest indexed specimen is replaced. */
function spawn(
  entities: readonly PixelEntity[],
  point: Point,
  type: EntityType,
  id: string,
  rng: Prng,
): PixelEntity[] {
  const entity: PixelEntity = {
    id,
    type,
    x: point.x,
    y: point.y,
    variant: pickVariant(rng.next()),
    size: pickSize(rng.next()),
    phase: rng.next() * Math.PI * 2,
  };
  const kept =
    entities.length >= MAX_ENTITIES ? entities.slice(entities.length - MAX_ENTITIES + 1) : entities;
  return [...kept, entity];
}

/** Change the type and variant of one entity (immutably), staying inside its zone. */
function transform(
  entities: readonly PixelEntity[],
  target: PixelEntity,
  rng: Prng,
): PixelEntity[] {
  const allowed = typesForZone(zoneAt(target));
  const others = allowed.filter((type) => type !== target.type);
  const type = pickType(rng, others.length > 0 ? others : allowed);
  const variant = pickVariant(rng.next());
  return entities.map((entity) =>
    entity.id === target.id ? { ...entity, type, variant } : entity,
  );
}

/**
 * Apply one canonical action to a world. `serverEntropy` is a persisted step seed
 * (server-owned in shared mode, derived from public inputs in local mode) and
 * `now` is the ISO timestamp the caller wants stamped on the result.
 */
export function applyMutation(
  world: Readonly<WorldState>,
  action: CanonicalAction,
  serverEntropy: number,
  now: string,
): MutationResult {
  if (!Number.isInteger(world.revision) || world.revision < 0) {
    throw new MutationError('invalid world revision');
  }
  if (world.entities.length > MAX_ENTITIES) {
    throw new MutationError('entity cap exceeded before mutation');
  }
  const nextRevision = world.revision + 1;
  const rng = streamFor(world.seed, nextRevision, serverEntropy);
  const entityId = `e-${nextRevision}`;

  let entities: PixelEntity[] = world.entities;
  let result: WorldEventDraft['result'];
  let eventEntityId: string | undefined;
  let chaosDelta = 0;
  let growthDelta = 0;

  switch (action.kind) {
    case 'click':
    case 'random_mutation': {
      const raw =
        action.kind === 'click' ? clampToLegalRegion(action.point) : randomLegalPoint(rng);
      // Transform checks the raw point so a floating specimen can be clicked in the sky.
      const nearby = nearestEntity(world.entities, raw);
      const roll = rng.next();
      if (nearby && roll < TRANSFORM_PROBABILITY) {
        entities = transform(world.entities, nearby, rng);
        result = 'transform';
        eventEntityId = nearby.id;
      } else {
        const placed = placeDrop(raw, rng);
        const type = pickType(rng, typesForZone(placed.zone));
        entities = spawn(world.entities, placed.point, type, entityId, rng);
        result = 'spawn';
        eventEntityId = entityId;
      }
      chaosDelta = rng.range(1, 5);
      growthDelta = rng.range(1, 3);
      break;
    }
    case 'idle_growth': {
      // Autonomous growth sprouts from the plaza itself: never the sky, flowers only in water.
      const x = rng.range(LEGAL_REGION.minX + 16, LEGAL_REGION.maxX - 16);
      const point = settleOnGround({ x, y: rng.range(floorTop(x), floorBottom(x)) }).point;
      const type = isInPool(point) ? 'flower' : pickType(rng, GROWTH_TYPES);
      entities = spawn(world.entities, point, type, entityId, rng);
      result = 'spawn';
      eventEntityId = entityId;
      growthDelta = rng.range(1, 3);
      break;
    }
    case 'palette_shift': {
      result = 'palette';
      chaosDelta = rng.range(1, 5);
      break;
    }
    default: {
      const never: never = action;
      throw new MutationError(`unknown action ${String(never)}`);
    }
  }

  const next: WorldState = {
    ...world,
    revision: nextRevision,
    mutations: world.mutations + 1,
    chaos: clamp(world.chaos + chaosDelta, 0, 100),
    growth: clamp(world.growth + growthDelta, 0, 100),
    palette: action.kind === 'palette_shift' ? nextPaletteId(world.palette) : world.palette,
    entities,
    updatedAt: now,
  };

  const event: WorldEventDraft = {
    worldId: world.worldId,
    revision: nextRevision,
    action: action.kind,
    result,
    createdAt: now,
    ...(eventEntityId !== undefined ? { entityId: eventEntityId } : {}),
  };

  return { next, event };
}
