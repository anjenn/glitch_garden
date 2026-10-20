// Hand-written type guards (no runtime dependency) shared by the browser store
// and the server endpoint. Anything that fails here is treated as untrusted.

import {
  ACTION_KINDS,
  ENTITY_TYPES,
  LEGAL_REGION,
  MAX_ENTITIES,
  PUBLIC_ACTION_KINDS,
  SCHEMA_VERSION,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type ActionKind,
  type ClientMutationIntent,
  type EntityType,
  type PixelEntity,
  type Point,
  type WorldEvent,
  type WorldState,
} from './types.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

export function isEntityType(value: unknown): value is EntityType {
  return typeof value === 'string' && (ENTITY_TYPES as readonly string[]).includes(value);
}

export function isActionKind(value: unknown): value is ActionKind {
  return typeof value === 'string' && (ACTION_KINDS as readonly string[]).includes(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isPoint(value: unknown): value is Point {
  return (
    isRecord(value) &&
    isIntegerInRange(value.x, 0, WORLD_WIDTH - 1) &&
    isIntegerInRange(value.y, 0, WORLD_HEIGHT - 1)
  );
}

export function isPixelEntity(value: unknown): value is PixelEntity {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 64 &&
    isEntityType(value.type) &&
    isIntegerInRange(value.x, LEGAL_REGION.minX, LEGAL_REGION.maxX) &&
    isIntegerInRange(value.y, LEGAL_REGION.minY, LEGAL_REGION.maxY) &&
    isIntegerInRange(value.variant, 0, 3) &&
    isIntegerInRange(value.size, 1, 3) &&
    isFiniteNumber(value.phase) &&
    value.phase >= 0 &&
    value.phase < Math.PI * 2
  );
}

export function isWorldState(value: unknown): value is WorldState {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof value.worldId !== 'string' || value.worldId.length === 0) return false;
  if (!isIntegerInRange(value.seed, 0, 0xffffffff)) return false;
  if (!isIntegerInRange(value.revision, 0, Number.MAX_SAFE_INTEGER)) return false;
  if (!isIntegerInRange(value.mutations, 0, Number.MAX_SAFE_INTEGER)) return false;
  if (!isFiniteNumber(value.chaos) || value.chaos < 0 || value.chaos > 100) return false;
  if (!isFiniteNumber(value.growth) || value.growth < 0 || value.growth > 100) return false;
  if (!isIntegerInRange(value.palette, 0, 3)) return false;
  if (typeof value.updatedAt !== 'string') return false;
  if (!Array.isArray(value.entities) || value.entities.length > MAX_ENTITIES) return false;
  const ids = new Set<string>();
  for (const entity of value.entities) {
    if (!isPixelEntity(entity)) return false;
    if (ids.has(entity.id)) return false;
    ids.add(entity.id);
  }
  return true;
}

export function isWorldEvent(value: unknown): value is WorldEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.eventId === 'string' &&
    typeof value.worldId === 'string' &&
    isIntegerInRange(value.revision, 0, Number.MAX_SAFE_INTEGER) &&
    isActionKind(value.action) &&
    (value.result === 'spawn' || value.result === 'transform' || value.result === 'palette') &&
    (value.entityId === undefined || typeof value.entityId === 'string') &&
    (value.clientEventId === undefined || typeof value.clientEventId === 'string') &&
    typeof value.createdAt === 'string'
  );
}

/**
 * Strict allowlist for what a visitor may send. Unknown keys are rejected so
 * nobody can smuggle entity arrays, counters or palette values alongside an intent.
 */
export function parseClientIntent(value: unknown): ClientMutationIntent | null {
  if (!isRecord(value)) return null;
  const allowedKeys = new Set(['worldId', 'clientEventId', 'action', 'point']);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) return null;
  }
  if (!isUuid(value.clientEventId)) return null;
  const action = value.action;
  if (typeof action !== 'string' || !(PUBLIC_ACTION_KINDS as readonly string[]).includes(action))
    return null;
  if (action === 'click') {
    if (!isPoint(value.point)) return null;
    return { clientEventId: value.clientEventId, action, point: value.point };
  }
  if (value.point !== undefined) return null;
  return {
    clientEventId: value.clientEventId,
    action: action as 'random_mutation' | 'palette_shift',
  };
}
