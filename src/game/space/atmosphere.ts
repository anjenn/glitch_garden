// Space effects drawn around the characters: ambient sparkles, chaos glitch
// bands, the cursor crosshair, mutation bursts and dust. All visual-only.

import { createPrng, mix32 } from '../prng.ts';
import { MAX_PARTICLES, type Point, type WorldState } from '../types.ts';
import type { SpaceColors } from './colors.ts';
import type { Particle } from './particles.ts';
import type { Projection, Viewport } from './viewport.ts';

export interface Burst {
  point: Point;
  startedAt: number;
}

export interface SpaceFrame {
  /** Milliseconds; drives visual-only oscillation. */
  time: number;
  reducedMotion: boolean;
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  devicePixelRatio: number;
}

export function fill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Integer-snapped rectangle: edges are rounded so adjacent cells never leave seams. */
export function snapRect(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
): void {
  const left = Math.round(x0);
  const top = Math.round(y0);
  const right = Math.round(x1);
  const bottom = Math.round(y1);
  if (right <= left || bottom <= top) return;
  fill(ctx, left, top, right - left, bottom - top, color);
}

export function drawSparkles(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  colors: SpaceColors,
  frame: SpaceFrame,
): void {
  const rng = createPrng(mix32(world.seed, 0x5a7));
  const step = frame.reducedMotion ? 0 : Math.floor(frame.time / 700);
  for (let i = 0; i < 26; i++) {
    const x = rng.next() * frame.canvasWidth;
    const y = rng.next() * frame.canvasHeight * 0.78;
    const offset = rng.int(5);
    const drift = frame.reducedMotion ? 0 : Math.round(Math.sin(frame.time / 4600 + i) * 4) * 2;
    const phase = (step + offset) % 5;
    if (phase === 0 || phase === 1) continue;
    const size = i % 4 === 0 ? 3 : 2;
    const color = i % 3 === 0 ? colors.sparkle[0] : colors.sparkle[1];
    const px = Math.round(x + drift);
    const py = Math.round(y);
    ctx.globalAlpha = phase === 2 ? 0.45 : 0.8;
    fill(ctx, px - size, py, size * 2 + 1, 2, color);
    fill(ctx, px, py - size, 2, size * 2 + 1, color);
    fill(ctx, px + 1, py + 1, 2, 2, '#ffffff');
  }
  ctx.globalAlpha = 1;
}

/**
 * Chaos glitch: horizontal slices of the garden are shifted sideways. Band
 * count scales with chaos; positions change every 480ms unless reduced motion
 * is on, in which case they stay fixed.
 */
export function drawGlitch(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  colors: SpaceColors,
  frame: SpaceFrame,
): void {
  const bands = Math.min(5, Math.floor(world.chaos / 20));
  if (bands === 0) return;
  const tick = frame.reducedMotion ? 0 : Math.floor(frame.time / 480);
  const rng = createPrng(mix32(world.seed, tick, world.revision));
  const { viewport, devicePixelRatio: dpr } = frame;
  for (let i = 0; i < bands; i++) {
    const y = Math.round(viewport.top + rng.next() * viewport.height);
    const h = 2 + rng.int(3) * 2;
    const shift = (rng.int(5) - 2) * 3;
    if (shift === 0) continue;
    const sx = Math.round(viewport.left);
    const sw = Math.round(viewport.width);
    ctx.drawImage(ctx.canvas, sx * dpr, y * dpr, sw * dpr, h * dpr, sx + shift, y, sw, h);
    if (rng.next() < 0.4) {
      ctx.globalAlpha = 0.5;
      fill(ctx, shift > 0 ? sx : sx + sw + shift, y, Math.abs(shift), h, colors.glitch);
      ctx.globalAlpha = 1;
    }
  }
}

export function drawCursor(
  ctx: CanvasRenderingContext2D,
  colors: SpaceColors,
  cursor: Point,
  projection: Projection,
): void {
  const x = Math.round(projection.toCssX(cursor.x));
  const y = Math.round(projection.toCssY(cursor.y));
  fill(ctx, x - 9, y - 1, 6, 2, colors.cursor);
  fill(ctx, x + 3, y - 1, 6, 2, colors.cursor);
  fill(ctx, x - 1, y - 9, 2, 6, colors.cursor);
  fill(ctx, x - 1, y + 3, 2, 6, colors.cursor);
}

export function drawBurst(
  ctx: CanvasRenderingContext2D,
  colors: SpaceColors,
  burst: Burst,
  time: number,
  projection: Projection,
): void {
  const age = time - burst.startedAt;
  if (age < 0 || age > 360) return;
  const step = Math.floor(age / 90);
  const r = 8 + step * 7;
  const x = Math.round(projection.toCssX(burst.point.x));
  const y = Math.round(projection.toCssY(burst.point.y));
  const color = step % 2 === 0 ? colors.particle[0] : colors.particle[1];
  fill(ctx, x - r, y - 1, 4, 2, color);
  fill(ctx, x + r - 4, y - 1, 4, 2, color);
  fill(ctx, x - 1, y - r, 2, 4, color);
  fill(ctx, x - 1, y + r - 4, 2, 4, color);
  fill(ctx, x - r + 2, y - r + 2, 2, 2, color);
  fill(ctx, x + r - 4, y - r + 2, 2, 2, color);
  fill(ctx, x - r + 2, y + r - 4, 2, 2, color);
  fill(ctx, x + r - 4, y + r - 4, 2, 2, color);
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  colors: SpaceColors,
  particles: readonly Particle[],
  projection: Projection,
): void {
  const count = Math.min(particles.length, MAX_PARTICLES);
  for (let i = 0; i < count; i++) {
    const p = particles[i]!;
    const alpha = 1 - p.age / p.life;
    if (alpha <= 0) continue;
    // Stepped opacity keeps the look chunky instead of smoothly fading.
    ctx.globalAlpha = alpha > 0.66 ? 1 : alpha > 0.33 ? 0.6 : 0.3;
    const x = Math.round(projection.toCssX(p.x));
    const y = Math.round(projection.toCssY(p.y));
    fill(ctx, x, y, p.size, p.size, colors.particle[p.tint]);
  }
  ctx.globalAlpha = 1;
}
