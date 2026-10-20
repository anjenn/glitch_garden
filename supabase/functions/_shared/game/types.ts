// Pure domain types and constants for GLITCH.GARDEN.
// This module must stay free of DOM, storage and network concerns: it is shared
// by the browser app, the unit tests and the Supabase Edge Function.

export const WORLD_WIDTH = 480;
export const WORLD_HEIGHT = 320;
export const MAX_ENTITIES = 85;
export const MAX_PARTICLES = 160;
export const MAX_VISIBLE_EVENTS = 7;
export const HIT_RADIUS = 21;
export const TRANSFORM_PROBABILITY = 0.35;
export const SCHEMA_VERSION = 1 as const;
export const MUTATION_RULES_VERSION = 1 as const;

/** Entities are only ever spawned inside this region of the 480×320 plane. */
export const LEGAL_REGION = { minX: 8, maxX: 471, minY: 72, maxY: 304 } as const;

export const ENTITY_TYPES = [
  'flower',
  'robot',
  'crystal',
  'shroom',
  'portal',
  'totem',
  'tree',
  'slime',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Types that autonomous growth is allowed to produce. */
export const GROWTH_TYPES = ['flower', 'tree'] as const satisfies readonly EntityType[];

export const ACTION_KINDS = ['click', 'random_mutation', 'palette_shift', 'idle_growth'] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

/** Actions an anonymous visitor may submit. `idle_growth` is scheduler-only. */
export const PUBLIC_ACTION_KINDS = ['click', 'random_mutation', 'palette_shift'] as const;

export type PaletteId = 0 | 1 | 2 | 3;
export type Variant = 0 | 1 | 2 | 3;
export type EntitySize = 1 | 2 | 3;
export type EventResult = 'spawn' | 'transform' | 'palette';

export interface Point {
  x: number;
  y: number;
}

export interface PixelEntity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  variant: Variant;
  size: EntitySize;
  phase: number;
}

export interface WorldState {
  schemaVersion: typeof SCHEMA_VERSION;
  worldId: string;
  seed: number;
  revision: number;
  mutations: number;
  chaos: number;
  growth: number;
  palette: PaletteId;
  entities: PixelEntity[];
  updatedAt: string;
}

export interface WorldEvent {
  eventId: string;
  clientEventId?: string;
  worldId: string;
  revision: number;
  action: ActionKind;
  result: EventResult;
  entityId?: string;
  createdAt: string;
}

/** Event produced by the reducer; the persistence layer assigns `eventId`. */
export interface WorldEventDraft {
  worldId: string;
  revision: number;
  action: ActionKind;
  result: EventResult;
  entityId?: string;
  createdAt: string;
}

export type CanonicalAction =
  | { kind: 'click'; point: Point }
  | { kind: 'random_mutation' }
  | { kind: 'palette_shift' }
  | { kind: 'idle_growth' };

/** What a client is allowed to ask for. The server decides the outcome. */
export interface ClientMutationIntent {
  clientEventId: string;
  action: (typeof PUBLIC_ACTION_KINDS)[number];
  point?: Point;
}

export type RuntimeMode = 'local' | 'shared';
