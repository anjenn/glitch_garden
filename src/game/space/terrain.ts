// Terrain model of the illustrated scene in the 480×320 logical plane.
// Pure: used by the canonical reducer (so settled positions persist) and by the
// renderer (so characters sit on the ground, hover in the sky, or float in water).
//
// Calibrated against mockup/assets/angel-forest.png through the garden viewport:
//   - a stone plaza runs from the back step line (~y 232) to the front edge (~y 300)
//   - the waterfall basin in the middle is water
//   - above the plaza are ruins and the big tree; higher still is open sky

import { LEGAL_REGION, type Point } from '../types.ts';

export type Zone = 'ground' | 'water' | 'sky';

interface Knot {
  x: number;
  y: number;
}

/** Back edge of the walkable floor (characters fall down to this line). */
const FLOOR_TOP: readonly Knot[] = [
  { x: 0, y: 262 },
  { x: 40, y: 240 },
  { x: 80, y: 232 },
  { x: 400, y: 232 },
  { x: 440, y: 244 },
  { x: 480, y: 262 },
];

/** Front edge of the walkable floor (nothing stands past the waterfalls). */
const FLOOR_BOTTOM: readonly Knot[] = [
  { x: 0, y: 270 },
  { x: 40, y: 286 },
  { x: 100, y: 300 },
  { x: 380, y: 300 },
  { x: 440, y: 290 },
  { x: 480, y: 272 },
];

/** The waterfall basin in the centre of the plaza. */
export const POOL = { left: 196, right: 292, top: 248, bottom: 300 } as const;

/** Clicks this far above the floor count as sky: floating types may appear there. */
export const SKY_MARGIN = 48;

/** Horizontal band characters may occupy (the island has edges). */
export const ISLAND = { left: 24, right: 456 } as const;

function interpolate(knots: readonly Knot[], x: number): number {
  const first = knots[0]!;
  const last = knots[knots.length - 1]!;
  if (x <= first.x) return first.y;
  if (x >= last.x) return last.y;
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1]!;
    const b = knots[i]!;
    if (x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return Math.round(a.y + (b.y - a.y) * t);
    }
  }
  return last.y;
}

export function floorTop(x: number): number {
  return interpolate(FLOOR_TOP, x);
}

export function floorBottom(x: number): number {
  return interpolate(FLOOR_BOTTOM, x);
}

export function isInPool(point: Point): boolean {
  return (
    point.x >= POOL.left && point.x <= POOL.right && point.y >= POOL.top && point.y <= POOL.bottom
  );
}

/** Which zone a (settled) point belongs to. */
export function zoneAt(point: Point): Zone {
  if (isInPool(point)) return 'water';
  if (point.y < floorTop(point.x) - SKY_MARGIN) return 'sky';
  return 'ground';
}

export interface Settled {
  point: Point;
  zone: Zone;
  /** True when the point was moved down onto the floor. */
  fell: boolean;
}

function clampX(x: number): number {
  return Math.max(
    Math.max(ISLAND.left, LEGAL_REGION.minX),
    Math.min(Math.min(ISLAND.right, LEGAL_REGION.maxX), Math.round(x)),
  );
}

/**
 * Where a ground character ends up when something is dropped at `point`:
 * sky and wall clicks fall to the back edge of the floor, clicks past the
 * front edge are pulled back, the pool stays water.
 */
export function settleOnGround(point: Point): Settled {
  const x = clampX(point.x);
  const top = floorTop(x);
  const bottom = floorBottom(x);
  const y = Math.round(point.y);
  const fell = y < top;
  const settled = { x, y: Math.max(top, Math.min(bottom, y)) };
  return { point: settled, zone: isInPool(settled) ? 'water' : 'ground', fell };
}

/** A sky point, kept in the air but inside the legal region and island band. */
export function settleInSky(point: Point): Settled {
  const x = clampX(point.x);
  const y = Math.max(
    LEGAL_REGION.minY,
    Math.min(floorTop(x) - SKY_MARGIN - 1, Math.round(point.y)),
  );
  return { point: { x, y }, zone: 'sky', fell: false };
}

/** Depth 0 (back of the plaza) … 1 (front edge); used for perspective scaling. */
export function groundDepth(point: Point): number {
  const top = floorTop(point.x);
  const bottom = floorBottom(point.x);
  if (bottom <= top) return 1;
  return Math.max(0, Math.min(1, (point.y - top) / (bottom - top)));
}
