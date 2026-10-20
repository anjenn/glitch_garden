// Client-only character animation state: births (grow-in / fall-in) and
// transforms (flash pulse). Nothing here is canonical; it is derived from
// snapshot diffs and the clock, and it stays stepped so it reads as pixel art.

import type { PixelEntity, Point } from '../types.ts';

export const FALL_MS = 360;
export const GROW_MS = 320;
export const FLASH_MS = 420;
const FORGET_AFTER_MS = Math.max(FALL_MS, GROW_MS, FLASH_MS) + 200;

export interface Birth {
  kind: 'spawn' | 'transform';
  at: number;
  /** Logical y the specimen was dropped from, when it fell onto its spot. */
  fromY?: number;
  /** Set once the landing dust has been emitted. */
  landed: boolean;
}

/** Stepped ease: `n` discrete stages instead of a smooth tween. */
export function steps(t: number, n = 4): number {
  return Math.min(n, Math.floor(Math.max(0, t) * n)) / n;
}

/** Visual scale multiplier for a specimen (grow-in on spawn, pulse on transform). */
export function scaleFor(birth: Birth | undefined, now: number): number {
  if (!birth) return 1;
  const age = now - birth.at;
  if (birth.kind === 'transform') {
    const t = age / FLASH_MS;
    return t < 1 ? 1 + 0.25 * (1 - steps(t)) : 1;
  }
  if (birth.fromY !== undefined) return 1; // falling specimens arrive full-size
  return age < GROW_MS ? 0.35 + 0.65 * steps(age / GROW_MS) : 1;
}

/** True while a transform flash is showing. */
export function isFlashing(birth: Birth | undefined, now: number): boolean {
  return birth?.kind === 'transform' && now - birth.at < FLASH_MS;
}

/** Logical y offset while falling (negative = still above its spot), snapped to 4px rows. */
export function fallOffset(
  birth: Birth | undefined,
  entity: Pick<PixelEntity, 'y'>,
  now: number,
): number {
  if (!birth || birth.kind !== 'spawn' || birth.fromY === undefined) return 0;
  const t = Math.min(1, (now - birth.at) / FALL_MS);
  const remaining = (entity.y - birth.fromY) * (1 - t * t);
  return -Math.round(remaining / 4) * 4 || 0;
}

/** Returns true exactly once, on the first call after the fall completes. */
export function takeLanding(birth: Birth, now: number): boolean {
  if (birth.kind !== 'spawn' || birth.fromY === undefined || birth.landed) return false;
  if (now - birth.at < FALL_MS) return false;
  birth.landed = true;
  return true;
}

/**
 * Diff two entity lists to register new births and transforms. `drop` is the
 * logical point of a click that happened recently, if any, so a freshly
 * spawned specimen below it can fall from there.
 */
export function registerChanges(
  births: Map<string, Birth>,
  previous: ReadonlyMap<string, PixelEntity>,
  next: readonly PixelEntity[],
  now: number,
  drop: { point: Point; at: number } | null,
): void {
  for (const entity of next) {
    const before = previous.get(entity.id);
    if (!before) {
      const fromDrop =
        drop !== null &&
        now - drop.at < 1200 &&
        Math.abs(drop.point.x - entity.x) <= 40 &&
        drop.point.y < entity.y - 8;
      births.set(entity.id, {
        kind: 'spawn',
        at: now,
        landed: !fromDrop,
        ...(fromDrop ? { fromY: drop.point.y } : {}),
      });
    } else if (before.type !== entity.type || before.variant !== entity.variant) {
      births.set(entity.id, { kind: 'transform', at: now, landed: true });
    }
  }
  const alive = new Set(next.map((e) => e.id));
  for (const [id, birth] of births) {
    if (!alive.has(id) || now - birth.at > FORGET_AFTER_MS) births.delete(id);
  }
}
