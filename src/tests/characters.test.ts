import { describe, expect, it } from 'vitest';
import {
  blockSize,
  CHARACTER_COLORS,
  CHARACTERS,
  characterBounds,
  collectCharacterRects,
} from '../game/characters/index.ts';
import { ENTITY_TYPES, type EntitySize, type PixelEntity, type Variant } from '../game/types.ts';

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

describe('character maps', () => {
  it.each(ENTITY_TYPES)('%s has two rectangular frames of equal size', (type) => {
    const [a, b] = CHARACTERS[type].frames;
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
          const bounds = characterBounds(e);
          const block = blockSize(size);
          const rects = collectCharacterRects(e, CHARACTER_COLORS[0]);
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

  it('mirrored variants cover the same area', () => {
    const base = collectCharacterRects(entity({ type: 'robot', variant: 0 }), CHARACTER_COLORS[0]);
    const mirrored = collectCharacterRects(
      entity({ type: 'robot', variant: 1 }),
      CHARACTER_COLORS[0],
    );
    expect(mirrored.length).toBe(base.length);
    const area = (rects: typeof base) => rects.reduce((sum, r) => sum + r.w * r.h, 0);
    expect(area(mirrored)).toBe(area(base));
  });

  it('a different palette changes colors but not geometry', () => {
    const a = collectCharacterRects(entity({ type: 'tree' }), CHARACTER_COLORS[0]);
    const b = collectCharacterRects(entity({ type: 'tree' }), CHARACTER_COLORS[3]);
    expect(a.map(({ x, y, w, h }) => [x, y, w, h])).toEqual(
      b.map(({ x, y, w, h }) => [x, y, w, h]),
    );
    expect(a.map((r) => r.color)).not.toEqual(b.map((r) => r.color));
  });

  it('every palette defines colors for every archetype', () => {
    for (const id of [0, 1, 2, 3] as const) {
      for (const type of ENTITY_TYPES) expect(CHARACTER_COLORS[id][type]).toHaveLength(4);
    }
  });
});
