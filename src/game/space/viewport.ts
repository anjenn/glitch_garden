// The space: how the 480×320 logical plane sits inside the illustrated scene.

import { WORLD_HEIGHT, WORLD_WIDTH } from '../types.ts';

/** CSS-pixel rectangle the logical world is projected onto. */
export interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Projection {
  toCssX(x: number): number;
  toCssY(y: number): number;
  /** Uniform character scale (CSS px per logical px), clamped for legibility. */
  spriteScale: number;
}

/** The garden region of the page, mirroring the illustrated scene's focal area. */
export function gardenViewport(width: number, height: number): Viewport {
  if (width <= 700) {
    return { left: width * 0.11, top: height * 0.31, width: width * 0.77, height: height * 0.44 };
  }
  return { left: width * 0.31, top: height * 0.23, width: width * 0.46, height: height * 0.56 };
}

export function projectionFor(viewport: Viewport): Projection {
  const kx = viewport.width / WORLD_WIDTH;
  const ky = viewport.height / WORLD_HEIGHT;
  const spriteScale = Math.max(0.8, Math.min(1.6, kx * 1.1));
  return {
    toCssX: (x) => viewport.left + x * kx,
    toCssY: (y) => viewport.top + y * ky,
    spriteScale,
  };
}

export function insideViewport(x: number, y: number, viewport: Viewport): boolean {
  return (
    x >= viewport.left &&
    x <= viewport.left + viewport.width &&
    y >= viewport.top &&
    y <= viewport.top + viewport.height
  );
}
