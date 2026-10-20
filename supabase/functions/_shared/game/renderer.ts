// Compositor for the overlay canvas. Draw order (spec 02):
//   space sparkles → characters sorted by depth → space glitch → cursor → burst → dust.
// Characters come from ./characters, everything around them from ./space; this
// file decides the order and projects each character into the viewport with
// perspective, zone behaviour (ground / water / sky) and client-only animation.

import { characterBounds, drawCharacter, type PixelSink } from './characters/index.ts';
import { getPalette, type Palette } from './palettes.ts';
import {
  drawBurst,
  drawCursor,
  drawGlitch,
  drawParticles,
  drawSparkles,
  fallOffset,
  fill,
  groundDepth,
  isFlashing,
  projectionFor,
  scaleFor,
  snapRect,
  zoneAt,
  type Birth,
  type Burst,
  type Particle,
  type Projection,
  type SpaceFrame,
} from './space/index.ts';
import type { PixelEntity, Point, WorldState } from './types.ts';

export interface RenderOptions extends SpaceFrame {
  particles: readonly Particle[];
  /** Logical cursor position, or null when the pointer is elsewhere. */
  cursor: Point | null;
  burst: Burst | null;
  /** Client-only animation state keyed by entity id. */
  births: ReadonlyMap<string, Birth>;
  /** Entity under the cursor (within the transform radius), if any. */
  hoverId: string | null;
}

/** Characters further back on the plaza are drawn smaller; sky specimens are distant. */
function perspectiveScale(entity: PixelEntity): number {
  const zone = zoneAt(entity);
  if (zone === 'sky') return 0.8;
  return 0.85 + 0.35 * groundDepth(entity);
}

interface Placed {
  entity: PixelEntity;
  anchorX: number;
  anchorY: number;
  k: number;
  zone: ReturnType<typeof zoneAt>;
}

function placeCharacter(entity: PixelEntity, projection: Projection, opts: RenderOptions): Placed {
  const zone = zoneAt(entity);
  const birth = opts.births.get(entity.id);
  const drop = opts.reducedMotion ? 0 : fallOffset(birth, entity, opts.time);
  const bobStep = opts.reducedMotion ? 0 : Math.floor(opts.time / 420 + entity.phase) & 1;
  const hover = zone === 'sky' || entity.type === 'portal' ? bobStep * -2 : 0;
  const k =
    projection.spriteScale *
    perspectiveScale(entity) *
    (opts.reducedMotion ? 1 : scaleFor(birth, opts.time));
  return {
    entity,
    anchorX: projection.toCssX(entity.x),
    anchorY: projection.toCssY(entity.y + drop + hover),
    k,
    zone,
  };
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  placed: Placed,
  palette: Palette,
  projection: Projection,
) {
  const { entity, anchorX, k, zone } = placed;
  if (zone === 'sky') return;
  const bounds = characterBounds(entity);
  // The shadow stays on the spot even while the specimen is still falling.
  const groundY = projection.toCssY(entity.y);
  const half = bounds.width * k * (zone === 'water' ? 0.35 : 0.5);
  ctx.globalAlpha = zone === 'water' ? 0.18 : 0.3;
  snapRect(ctx, anchorX - half, groundY - 2, anchorX + half, groundY + 2, palette.space.shadow);
  ctx.globalAlpha = 1;
}

function drawRipples(
  ctx: CanvasRenderingContext2D,
  placed: Placed,
  palette: Palette,
  opts: RenderOptions,
) {
  const { entity, anchorX, anchorY, k } = placed;
  const bounds = characterBounds(entity);
  const phase = opts.reducedMotion ? 0 : Math.floor(opts.time / 500 + entity.phase) % 3;
  const spread = (bounds.width * k) / 2 + 4 + phase * 4;
  ctx.globalAlpha = 0.55 - phase * 0.15;
  fill(ctx, Math.round(anchorX - spread), Math.round(anchorY) - 1, 6, 2, palette.space.sparkle[1]);
  fill(
    ctx,
    Math.round(anchorX + spread) - 6,
    Math.round(anchorY) - 1,
    6,
    2,
    palette.space.sparkle[1],
  );
  ctx.globalAlpha = 1;
}

function drawBrackets(ctx: CanvasRenderingContext2D, placed: Placed, color: string) {
  const { entity, anchorX, anchorY, k } = placed;
  const bounds = characterBounds(entity);
  const left = Math.round(anchorX - (bounds.width * k) / 2) - 4;
  const right = Math.round(anchorX + (bounds.width * k) / 2) + 4;
  const top = Math.round(anchorY - bounds.height * k) - 4;
  const bottom = Math.round(anchorY) + 4;
  const arm = 6;
  fill(ctx, left, top, arm, 2, color);
  fill(ctx, left, top, 2, arm, color);
  fill(ctx, right - arm, top, arm, 2, color);
  fill(ctx, right - 2, top, 2, arm, color);
  fill(ctx, left, bottom - 2, arm, 2, color);
  fill(ctx, left, bottom - arm, 2, arm, color);
  fill(ctx, right - arm, bottom - 2, arm, 2, color);
  fill(ctx, right - 2, bottom - arm, 2, arm, color);
}

function drawCharacters(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  palette: Palette,
  opts: RenderOptions,
): void {
  const projection = projectionFor(opts.viewport);
  // Sky specimens are drawn first (they are far away), then the plaza from back to front.
  const sorted = [...world.entities].sort((a, b) => {
    const za = zoneAt(a) === 'sky' ? 0 : 1;
    const zb = zoneAt(b) === 'sky' ? 0 : 1;
    return za - zb || a.y - b.y || a.id.localeCompare(b.id);
  });
  const frameStep = opts.reducedMotion ? 0 : Math.floor(opts.time / 600);
  for (const entity of sorted) {
    const placed = placeCharacter(entity, projection, opts);
    const { anchorX, anchorY, k, zone } = placed;
    drawShadow(ctx, placed, palette, projection);
    const frame: 0 | 1 = ((frameStep + Math.floor(entity.phase)) & 1) as 0 | 1;
    const sink: PixelSink = {
      rect: (x, y, w, h, color) => {
        // Character-local logical coords → CSS, scaled uniformly around the anchor.
        const x0 = anchorX + (x - entity.x) * k;
        const y0 = anchorY + (y - entity.y) * k;
        snapRect(ctx, x0, y0, x0 + w * k, y0 + h * k, color);
      },
    };
    if (zone === 'water') {
      // Submerge the bottom quarter so the specimen sits in the pool.
      const bounds = characterBounds(entity);
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        Math.round(anchorX - bounds.width * k),
        Math.round(anchorY - bounds.height * k * 1.5),
        Math.round(bounds.width * k * 2),
        Math.round(bounds.height * k * 1.25),
      );
      ctx.clip();
      drawCharacter(sink, entity, palette.characters, frame, 0);
      ctx.restore();
      drawRipples(ctx, placed, palette, opts);
    } else {
      drawCharacter(sink, entity, palette.characters, frame, 0);
    }
    if (isFlashing(opts.births.get(entity.id), opts.time) && !opts.reducedMotion) {
      drawBrackets(ctx, placed, palette.space.sparkle[0]);
    } else if (opts.hoverId === entity.id) {
      drawBrackets(ctx, placed, palette.space.cursor);
    }
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
