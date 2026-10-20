import { WORLD_HEIGHT, WORLD_WIDTH, type Point } from '../game/types.ts';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** CSS pixel position → integer logical world coordinate (spec 07). */
export function toLogicalPoint(clientX: number, clientY: number, rect: Rect): Point {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const x = Math.floor(((clientX - rect.left) / rect.width) * WORLD_WIDTH);
  const y = Math.floor(((clientY - rect.top) / rect.height) * WORLD_HEIGHT);
  return {
    x: Math.max(0, Math.min(WORLD_WIDTH - 1, x)),
    y: Math.max(0, Math.min(WORLD_HEIGHT - 1, y)),
  };
}

export function isInsideWorld(point: Point): boolean {
  return point.x >= 0 && point.x < WORLD_WIDTH && point.y >= 0 && point.y < WORLD_HEIGHT;
}

/** Tracks pointer velocity in logical px per ms so fast moves can emit trails. */
export class VelocityTracker {
  private last: { point: Point; time: number } | null = null;

  /** Returns speed in logical px/ms since the previous sample (0 on first sample). */
  sample(point: Point, time: number): number {
    const previous = this.last;
    this.last = { point, time };
    if (!previous) return 0;
    const dt = time - previous.time;
    if (dt <= 0) return 0;
    const distance = Math.hypot(point.x - previous.point.x, point.y - previous.point.y);
    return distance / dt;
  }

  reset(): void {
    this.last = null;
  }
}
