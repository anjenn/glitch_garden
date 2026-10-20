// Overlay renderer. The illustrated scene is CSS artwork behind a transparent
// canvas; this module draws the living layer on top: ambient sparkles →
// entities sorted by y → chaos glitch → cursor → burst → particles.
//
// The 480×320 logical plane is mapped onto the "garden" rectangle of the
// viewport. Every rectangle is snapped to integer CSS pixels by rounding its
// edges, so sprites stay crisp and gap-free at any scale.

import { getPalette, type Palette } from './palettes.ts';
import { createPrng, mix32 } from './prng.ts';
import { drawEntity, spriteBounds, type PixelSink } from './sprites.ts';
import { MAX_PARTICLES, WORLD_HEIGHT, WORLD_WIDTH, type Point, type WorldState } from './types.ts';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  tint: 0 | 1;
}

/** CSS-pixel rectangle the logical world is projected onto. */
export interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RenderOptions {
  /** Milliseconds; drives visual-only oscillation. */
  time: number;
  reducedMotion: boolean;
  particles: readonly Particle[];
  /** Logical cursor position, or null when the pointer is elsewhere. */
  cursor: Point | null;
  burst: { point: Point; startedAt: number } | null;
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  devicePixelRatio: number;
}

export interface Projection {
  toCssX(x: number): number;
  toCssY(y: number): number;
  /** Uniform sprite scale (CSS px per logical px), clamped for legibility. */
  spriteScale: number;
}

export function projectionFor(viewport: Viewport): Projection {
  const kx = viewport.width / WORLD_WIDTH;
  const ky = viewport.height / WORLD_HEIGHT;
  const spriteScale = Math.max(0.7, Math.min(1.4, kx));
  return {
    toCssX: (x) => viewport.left + x * kx,
    toCssY: (y) => viewport.top + y * ky,
    spriteScale,
  };
}

function fill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Integer-snapped rectangle: edges are rounded so adjacent cells never leave seams. */
function snapRect(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
) {
  const left = Math.round(x0);
  const top = Math.round(y0);
  const right = Math.round(x1);
  const bottom = Math.round(y1);
  if (right <= left || bottom <= top) return;
  fill(ctx, left, top, right - left, bottom - top, color);
}

function drawSparkles(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  palette: Palette,
  opts: RenderOptions,
) {
  const rng = createPrng(mix32(world.seed, 0x5a7));
  const step = opts.reducedMotion ? 0 : Math.floor(opts.time / 700);
  for (let i = 0; i < 26; i++) {
    const x = rng.next() * opts.canvasWidth;
    const y = rng.next() * opts.canvasHeight * 0.78;
    const offset = rng.int(5);
    const drift = opts.reducedMotion ? 0 : Math.round(Math.sin(opts.time / 4600 + i) * 4) * 2;
    const phase = (step + offset) % 5;
    if (phase === 0 || phase === 1) continue;
    const size = i % 4 === 0 ? 3 : 2;
    const color = i % 3 === 0 ? palette.sparkle[0] : palette.sparkle[1];
    const px = Math.round(x + drift);
    const py = Math.round(y);
    ctx.globalAlpha = phase === 2 ? 0.45 : 0.8;
    fill(ctx, px - size, py, size * 2 + 1, 2, color);
    fill(ctx, px, py - size, 2, size * 2 + 1, color);
    fill(ctx, px + 1, py + 1, 2, 2, '#ffffff');
  }
  ctx.globalAlpha = 1;
}

function drawEntities(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  palette: Palette,
  opts: RenderOptions,
) {
  const projection = projectionFor(opts.viewport);
  const sorted = [...world.entities].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
  const frameStep = opts.reducedMotion ? 0 : Math.floor(opts.time / 600);
  for (const entity of sorted) {
    const anchorX = projection.toCssX(entity.x);
    const anchorY = projection.toCssY(entity.y);
    const k = projection.spriteScale;
    const bounds = spriteBounds(entity);
    // Soft ground shadow so specimens sit on the illustration.
    ctx.globalAlpha = 0.3;
    snapRect(
      ctx,
      anchorX - bounds.width * k * 0.5,
      anchorY - 2,
      anchorX + bounds.width * k * 0.5,
      anchorY + 2,
      palette.shadow,
    );
    ctx.globalAlpha = 1;
    const frame: 0 | 1 = ((frameStep + Math.floor(entity.phase)) & 1) as 0 | 1;
    const floats = entity.type === 'portal' || entity.type === 'crystal';
    const bob =
      floats && !opts.reducedMotion ? (Math.floor(opts.time / 400 + entity.phase) & 1) * -2 : 0;
    const sink: PixelSink = {
      rect: (x, y, w, h, color) => {
        // Sprite-local logical coords → CSS, scaled uniformly around the anchor.
        const x0 = anchorX + (x - entity.x) * k;
        const y0 = anchorY + (y - entity.y) * k;
        snapRect(ctx, x0, y0, x0 + w * k, y0 + h * k, color);
      },
    };
    drawEntity(sink, entity, palette, frame, bob);
  }
}

/**
 * Chaos glitch: horizontal slices of the garden are shifted sideways. Band
 * count scales with chaos; positions change every 480ms unless reduced motion
 * is on, in which case they stay fixed.
 */
function drawGlitch(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  palette: Palette,
  opts: RenderOptions,
) {
  const bands = Math.min(5, Math.floor(world.chaos / 20));
  if (bands === 0) return;
  const tick = opts.reducedMotion ? 0 : Math.floor(opts.time / 480);
  const rng = createPrng(mix32(world.seed, tick, world.revision));
  const { viewport, devicePixelRatio: dpr } = opts;
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
      fill(ctx, shift > 0 ? sx : sx + sw + shift, y, Math.abs(shift), h, palette.glitch);
      ctx.globalAlpha = 1;
    }
  }
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  cursor: Point,
  projection: Projection,
) {
  const x = Math.round(projection.toCssX(cursor.x));
  const y = Math.round(projection.toCssY(cursor.y));
  fill(ctx, x - 9, y - 1, 6, 2, palette.cursor);
  fill(ctx, x + 3, y - 1, 6, 2, palette.cursor);
  fill(ctx, x - 1, y - 9, 2, 6, palette.cursor);
  fill(ctx, x - 1, y + 3, 2, 6, palette.cursor);
}

function drawBurst(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  burst: NonNullable<RenderOptions['burst']>,
  time: number,
  projection: Projection,
) {
  const age = time - burst.startedAt;
  if (age < 0 || age > 360) return;
  const step = Math.floor(age / 90);
  const r = 8 + step * 7;
  const x = Math.round(projection.toCssX(burst.point.x));
  const y = Math.round(projection.toCssY(burst.point.y));
  const color = step % 2 === 0 ? palette.particle[0] : palette.particle[1];
  fill(ctx, x - r, y - 1, 4, 2, color);
  fill(ctx, x + r - 4, y - 1, 4, 2, color);
  fill(ctx, x - 1, y - r, 2, 4, color);
  fill(ctx, x - 1, y + r - 4, 2, 4, color);
  fill(ctx, x - r + 2, y - r + 2, 2, 2, color);
  fill(ctx, x + r - 4, y - r + 2, 2, 2, color);
  fill(ctx, x - r + 2, y + r - 4, 2, 2, color);
  fill(ctx, x + r - 4, y + r - 4, 2, 2, color);
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  particles: readonly Particle[],
  projection: Projection,
) {
  const count = Math.min(particles.length, MAX_PARTICLES);
  for (let i = 0; i < count; i++) {
    const p = particles[i]!;
    const alpha = 1 - p.age / p.life;
    if (alpha <= 0) continue;
    // Stepped opacity keeps the look chunky instead of smoothly fading.
    ctx.globalAlpha = alpha > 0.66 ? 1 : alpha > 0.33 ? 0.6 : 0.3;
    const x = Math.round(projection.toCssX(p.x));
    const y = Math.round(projection.toCssY(p.y));
    fill(ctx, x, y, p.size, p.size, palette.particle[p.tint]);
  }
  ctx.globalAlpha = 1;
}

export function renderOverlay(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  opts: RenderOptions,
): void {
  const palette = getPalette(world.palette);
  const projection = projectionFor(opts.viewport);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, opts.canvasWidth, opts.canvasHeight);
  drawSparkles(ctx, world, palette, opts);
  drawEntities(ctx, world, palette, opts);
  drawGlitch(ctx, world, palette, opts);
  if (opts.cursor) drawCursor(ctx, palette, opts.cursor, projection);
  if (opts.burst) drawBurst(ctx, palette, opts.burst, opts.time, projection);
  drawParticles(ctx, palette, opts.particles, projection);
}

/** Advance transient particles one frame (logical units). Mutates the bounded array in place. */
export function stepParticles(particles: Particle[]): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.age++;
    if (p.age >= p.life || p.x < -4 || p.x > WORLD_WIDTH + 4 || p.y > WORLD_HEIGHT + 4) {
      particles.splice(i, 1);
    }
  }
}

/** Spawn particles around a logical point; the array never exceeds MAX_PARTICLES. */
export function emitParticles(
  particles: Particle[],
  origin: Point,
  count: number,
  random: () => number = Math.random,
): void {
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const speed = 0.5 + random() * 1.6;
    particles.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      age: 0,
      life: 20 + Math.floor(random() * 22),
      size: random() < 0.3 ? 4 : 2,
      tint: random() < 0.5 ? 0 : 1,
    });
  }
  if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
}
