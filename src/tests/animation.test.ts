import { describe, expect, it } from 'vitest';
import {
  FALL_MS,
  FLASH_MS,
  GROW_MS,
  fallOffset,
  isFlashing,
  registerChanges,
  scaleFor,
  takeLanding,
  type Birth,
} from '../game/space/animation.ts';
import type { PixelEntity } from '../game/types.ts';

const entity = (id: string, overrides: Partial<PixelEntity> = {}): PixelEntity => ({
  id,
  type: 'flower',
  x: 240,
  y: 260,
  variant: 0,
  size: 1,
  phase: 0,
  ...overrides,
});

describe('registerChanges', () => {
  it('registers a spawn that falls from a recent click above it', () => {
    const births = new Map<string, Birth>();
    registerChanges(births, new Map(), [entity('a')], 1000, { point: { x: 236, y: 120 }, at: 900 });
    expect(births.get('a')).toEqual({ kind: 'spawn', at: 1000, fromY: 120, landed: false });
  });

  it('registers a plain grow-in when the click was elsewhere or old', () => {
    const births = new Map<string, Birth>();
    registerChanges(births, new Map(), [entity('a')], 1000, { point: { x: 40, y: 120 }, at: 900 });
    expect(births.get('a')).toEqual({ kind: 'spawn', at: 1000, landed: true });
    registerChanges(births, new Map(), [entity('b')], 5000, { point: { x: 240, y: 120 }, at: 900 });
    expect(births.get('b')?.fromY).toBeUndefined();
  });

  it('registers transforms and forgets finished animations', () => {
    const births = new Map<string, Birth>();
    const before = new Map([['a', entity('a')]]);
    registerChanges(births, before, [entity('a', { type: 'robot' })], 1000, null);
    expect(births.get('a')?.kind).toBe('transform');
    const after = new Map([['a', entity('a', { type: 'robot' })]]);
    registerChanges(births, after, [entity('a', { type: 'robot' })], 1000 + FLASH_MS + 1000, null);
    expect(births.has('a')).toBe(false);
  });
});

describe('poses', () => {
  const fall: Birth = { kind: 'spawn', at: 0, fromY: 100, landed: false };
  const grow: Birth = { kind: 'spawn', at: 0, landed: true };
  const flash: Birth = { kind: 'transform', at: 0, landed: true };

  it('falls from the drop point to the spot in 4px rows and lands once', () => {
    const e = entity('a', { y: 260 });
    expect(fallOffset(fall, e, 0)).toBe(-160);
    const mid = fallOffset(fall, e, FALL_MS / 2);
    expect(mid).toBeLessThan(0);
    expect(mid).toBeGreaterThan(-160);
    expect(Math.abs(mid % 4)).toBe(0);
    expect(fallOffset(fall, e, FALL_MS)).toBe(0);
    expect(takeLanding(fall, FALL_MS - 1)).toBe(false);
    expect(takeLanding(fall, FALL_MS)).toBe(true);
    expect(takeLanding(fall, FALL_MS + 50)).toBe(false);
  });

  it('grows in steps and pulses on transform', () => {
    expect(scaleFor(grow, 0)).toBeCloseTo(0.35);
    expect(scaleFor(grow, GROW_MS / 2)).toBeCloseTo(0.675);
    expect(scaleFor(grow, GROW_MS)).toBe(1);
    expect(scaleFor(flash, 0)).toBeCloseTo(1.25);
    expect(scaleFor(flash, FLASH_MS)).toBe(1);
    expect(isFlashing(flash, FLASH_MS - 1)).toBe(true);
    expect(isFlashing(flash, FLASH_MS)).toBe(false);
    expect(scaleFor(undefined, 0)).toBe(1);
  });
});
