// The canonical mutation reducer (spec 05). Intent in; deterministic state out.
// No Math.random, Date.now, DOM, storage or network access in this file.

import { nearestEntity } from './hitTest.ts';
import { pickSize, pickVariant } from './initialWorld.ts';
import { nextPaletteId } from './palettes.ts';
import { streamFor, type Prng } from './prng.ts';
import {
  ENTITY_TYPES,
  GROWTH_TYPES,
  LEGAL_REGION,
  MAX_ENTITIES,
  TRANSFORM_PROBABILITY,
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

/** Change the type and variant of one entity in place (immutably). */
function transform(
  entities: readonly PixelEntity[],
  target: PixelEntity,
  rng: Prng,
): PixelEntity[] {
  const others = ENTITY_TYPES.filter((type) => type !== target.type);
  const type = pickType(rng, others);
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
      const point =
        action.kind === 'click' ? clampToLegalRegion(action.point) : randomLegalPoint(rng);
      const nearby = nearestEntity(world.entities, point);
      const roll = rng.next();
      if (nearby && roll < TRANSFORM_PROBABILITY) {
        entities = transform(world.entities, nearby, rng);
        result = 'transform';
        eventEntityId = nearby.id;
      } else {
        const type = pickType(rng, ENTITY_TYPES);
        entities = spawn(world.entities, point, type, entityId, rng);
        result = 'spawn';
        eventEntityId = entityId;
      }
      chaosDelta = rng.range(1, 5);
      growthDelta = rng.range(1, 3);
      break;
    }
    case 'idle_growth': {
      const point = randomLegalPoint(rng);
      // Autonomous growth prefers the ground band so the garden visibly "grows".
      point.y = Math.max(point.y, 200);
      const type = pickType(rng, GROWTH_TYPES);
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
