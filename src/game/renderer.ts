// Compositor for the overlay canvas. Draw order (spec 02):
//   space sparkles → characters sorted by y → space glitch → cursor → burst → dust.
// Characters come from ./characters, everything around them from ./space; this
// file only decides the order and projects characters into the viewport.

import { characterBounds, drawCharacter, type PixelSink } from './characters/index.ts';
import { getPalette, type Palette } from './palettes.ts';
import {
  drawBurst,
  drawCursor,
  drawGlitch,
  drawParticles,
  drawSparkles,
  projectionFor,
  snapRect,
  type Burst,
  type Particle,
  type SpaceFrame,
} from './space/index.ts';
import type { Point, WorldState } from './types.ts';

export interface RenderOptions extends SpaceFrame {
  particles: readonly Particle[];
  /** Logical cursor position, or null when the pointer is elsewhere. */
  cursor: Point | null;
  burst: Burst | null;
}

/** Characters sorted by y, each projected into the viewport with a ground shadow. */
function drawCharacters(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  palette: Palette,
  opts: RenderOptions,
): void {
  const projection = projectionFor(opts.viewport);
  const sorted = [...world.entities].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
  const frameStep = opts.reducedMotion ? 0 : Math.floor(opts.time / 600);
  const k = projection.spriteScale;
  for (const entity of sorted) {
    const anchorX = projection.toCssX(entity.x);
    const anchorY = projection.toCssY(entity.y);
    const bounds = characterBounds(entity);
    ctx.globalAlpha = 0.3;
    snapRect(
      ctx,
      anchorX - bounds.width * k * 0.5,
      anchorY - 2,
      anchorX + bounds.width * k * 0.5,
      anchorY + 2,
      palette.space.shadow,
    );
    ctx.globalAlpha = 1;
    const frame: 0 | 1 = ((frameStep + Math.floor(entity.phase)) & 1) as 0 | 1;
    const floats = entity.type === 'portal' || entity.type === 'crystal';
    const bob =
      floats && !opts.reducedMotion ? (Math.floor(opts.time / 400 + entity.phase) & 1) * -2 : 0;
    const sink: PixelSink = {
      rect: (x, y, w, h, color) => {
        // Character-local logical coords → CSS, scaled uniformly around the anchor.
        const x0 = anchorX + (x - entity.x) * k;
        const y0 = anchorY + (y - entity.y) * k;
        snapRect(ctx, x0, y0, x0 + w * k, y0 + h * k, color);
      },
    };
    drawCharacter(sink, entity, palette.characters, frame, bob);
  }
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
  drawSparkles(ctx, world, palette.space, opts);
  drawCharacters(ctx, world, palette, opts);
  drawGlitch(ctx, world, palette.space, opts);
  if (opts.cursor) drawCursor(ctx, palette.space, opts.cursor, projection);
  if (opts.burst) drawBurst(ctx, palette.space, opts.burst, opts.time, projection);
  drawParticles(ctx, palette.space, opts.particles, projection);
}
