import { HIT_RADIUS, type PixelEntity, type Point } from './types.ts';

/**
 * Nearest entity to `point` within `radius` logical pixels, or null.
 * Ties resolve to the lower index so the result is deterministic.
 */
export function nearestEntity(
  entities: readonly PixelEntity[],
  point: Point,
  radius: number = HIT_RADIUS,
): PixelEntity | null {
  let best: PixelEntity | null = null;
  let bestDistance = radius * radius;
  for (const entity of entities) {
    const dx = entity.x - point.x;
    const dy = entity.y - point.y;
    const distance = dx * dx + dy * dy;
    if (distance <= bestDistance && (best === null || distance < bestDistance)) {
      best = entity;
      bestDistance = distance;
    }
  }
  return best;
}
