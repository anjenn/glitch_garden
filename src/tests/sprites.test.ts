import { describe, expect, it } from 'vitest';
import { getPalette, PALETTES } from '../game/palettes.ts';
import { blockSize, collectRects, SPRITES, spriteBounds } from '../game/sprites.ts';
import { ENTITY_TYPES, type EntitySize, type PixelEntity, type Variant } from '../game/types.ts';
import { toLogicalPoint } from '../input/pointer.ts';

const entity = (overrides: Partial<PixelEntity>): PixelEntity => ({
  id: 'x',
  type: 'flower',
  x: 240,
  y: 200,
  variant: 0,
  size: 2,
  phase: 0,
  ...overrides,
});

describe('sprite maps', () => {
  it.each(ENTITY_TYPES)('%s has two rectangular frames of equal size', (type) => {
    const [a, b] = SPRITES[type].frames;
    expect(a.length).toBe(b.length);
    const width = a[0]!.length;
    for (const row of [...a, ...b]) expect(row.length).toBe(width);
    for (const row of [...a, ...b]) expect(row).toMatch(/^[.abcdw]+$/);
  });

  it('draws only integer rectangles aligned to the block grid inside the bounds', () => {
    for (const type of ENTITY_TYPES) {
      for (const size of [1, 2, 3] as EntitySize[]) {
        for (const variant of [0, 1, 2, 3] as Variant[]) {
          const e = entity({ type, size, variant });
          const bounds = spriteBounds(e);
          const block = blockSize(size);
          const rects = collectRects(e, getPalette(0));
          expect(rects.length).toBeGreaterThan(0);
          for (const r of rects) {
            expect(Number.isInteger(r.x) && Number.isInteger(r.y)).toBe(true);
            expect(Number.isInteger(r.w) && Number.isInteger(r.h)).toBe(true);
            expect(r.h).toBe(block);
            expect(r.w % block).toBe(0);
            expect(r.x).toBeGreaterThanOrEqual(bounds.left);
            expect(r.x + r.w).toBeLessThanOrEqual(bounds.left + bounds.width);
            expect(r.y).toBeGreaterThanOrEqual(bounds.top);
            expect(r.y + r.h).toBeLessThanOrEqual(bounds.top + bounds.height);
          }
        }
      }
    }
  });

  it('mirrored variants cover the same cells reflected around the center', () => {
    const base = collectRects(entity({ type: 'robot', variant: 0 }), getPalette(0));
    const mirrored = collectRects(entity({ type: 'robot', variant: 1 }), getPalette(0));
    expect(mirrored.length).toBe(base.length);
    const area = (rects: typeof base) => rects.reduce((sum, r) => sum + r.w * r.h, 0);
    expect(area(mirrored)).toBe(area(base));
  });

  it('palette swap changes colors but not geometry', () => {
    const a = collectRects(entity({ type: 'tree' }), getPalette(0));
    const b = collectRects(entity({ type: 'tree' }), getPalette(3));
    expect(a.map(({ x, y, w, h }) => [x, y, w, h])).toEqual(
      b.map(({ x, y, w, h }) => [x, y, w, h]),
    );
    expect(a.map((r) => r.color)).not.toEqual(b.map((r) => r.color));
  });

  it('every palette defines colors for every archetype', () => {
    for (const palette of PALETTES) {
      for (const type of ENTITY_TYPES) expect(palette.sprites[type]).toHaveLength(4);
    }
  });
});

describe('toLogicalPoint', () => {
  const rect = { left: 100, top: 50, width: 960, height: 640 };
  it('maps corners and center to the 480×320 plane', () => {
    expect(toLogicalPoint(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(toLogicalPoint(580, 370, rect)).toEqual({ x: 240, y: 160 });
    expect(toLogicalPoint(1059, 689, rect)).toEqual({ x: 479, y: 319 });
  });
  it('clamps outside positions', () => {
    expect(toLogicalPoint(0, 0, rect)).toEqual({ x: 0, y: 0 });
    expect(toLogicalPoint(5000, 5000, rect)).toEqual({ x: 479, y: 319 });
  });
  it('handles a degenerate rect', () => {
    expect(toLogicalPoint(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});
