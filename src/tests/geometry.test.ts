import { describe, expect, it } from 'vitest';
import { nearestEntity } from '../game/hitTest.ts';
import { clampToLegalRegion } from '../game/mutations.ts';
import { LEGAL_REGION, type PixelEntity } from '../game/types.ts';

const entity = (id: string, x: number, y: number): PixelEntity => ({
  id,
  type: 'flower',
  x,
  y,
  variant: 0,
  size: 1,
  phase: 0,
});

describe('nearestEntity', () => {
  it('returns null when nothing is inside the radius', () => {
    expect(nearestEntity([entity('a', 100, 100)], { x: 140, y: 100 })).toBeNull();
  });

  it('includes the boundary at exactly 21px', () => {
    expect(nearestEntity([entity('a', 100, 100)], { x: 121, y: 100 })?.id).toBe('a');
    expect(nearestEntity([entity('a', 100, 100)], { x: 122, y: 100 })).toBeNull();
  });

  it('picks the closest of several candidates', () => {
    const entities = [entity('far', 110, 100), entity('near', 103, 100), entity('mid', 95, 100)];
    expect(nearestEntity(entities, { x: 100, y: 100 })?.id).toBe('near');
  });

  it('breaks ties toward the lower index', () => {
    const entities = [entity('left', 90, 100), entity('right', 110, 100)];
    expect(nearestEntity(entities, { x: 100, y: 100 })?.id).toBe('left');
  });

  it('works with diagonal distances', () => {
    expect(nearestEntity([entity('a', 0, 0)], { x: 14, y: 14 })?.id).toBe('a'); // ~19.8
    expect(nearestEntity([entity('a', 0, 0)], { x: 15, y: 15 })).toBeNull(); // ~21.2
  });
});

describe('clampToLegalRegion', () => {
  it('rounds and clamps into the legal region', () => {
    expect(clampToLegalRegion({ x: -50, y: -50 })).toEqual({
      x: LEGAL_REGION.minX,
      y: LEGAL_REGION.minY,
    });
    expect(clampToLegalRegion({ x: 9999, y: 9999 })).toEqual({
      x: LEGAL_REGION.maxX,
      y: LEGAL_REGION.maxY,
    });
    expect(clampToLegalRegion({ x: 100.4, y: 200.6 })).toEqual({ x: 100, y: 201 });
  });
});
