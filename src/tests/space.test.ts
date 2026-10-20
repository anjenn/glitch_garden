import { describe, expect, it } from 'vitest';
import { getPalette, PALETTES } from '../game/palettes.ts';
import {
  emitParticles,
  gardenViewport,
  insideViewport,
  projectionFor,
  SPACE_COLORS,
  stepParticles,
  type Particle,
} from '../game/space/index.ts';
import { MAX_PARTICLES, WORLD_HEIGHT, WORLD_WIDTH } from '../game/types.ts';
import { toLogicalPoint } from '../input/pointer.ts';

describe('viewport & projection', () => {
  it('keeps the garden inside the page at desktop and phone sizes', () => {
    const sizes: Array<[number, number]> = [
      [1440, 900],
      [1024, 768],
      [390, 844],
      [360, 800],
    ];
    for (const [w, h] of sizes) {
      const v = gardenViewport(w, h);
      expect(v.left).toBeGreaterThanOrEqual(0);
      expect(v.top).toBeGreaterThanOrEqual(0);
      expect(v.left + v.width).toBeLessThanOrEqual(w);
      expect(v.top + v.height).toBeLessThanOrEqual(h);
    }
  });

  it('projects logical corners onto the viewport edges', () => {
    const v = { left: 100, top: 50, width: 480, height: 320 };
    const p = projectionFor(v);
    expect(p.toCssX(0)).toBe(100);
    expect(p.toCssY(0)).toBe(50);
    expect(p.toCssX(WORLD_WIDTH)).toBe(580);
    expect(p.toCssY(WORLD_HEIGHT)).toBe(370);
    expect(p.spriteScale).toBeCloseTo(1.1);
  });

  it('clamps the character scale for legibility', () => {
    expect(projectionFor({ left: 0, top: 0, width: 100, height: 60 }).spriteScale).toBe(0.8);
    expect(projectionFor({ left: 0, top: 0, width: 2000, height: 1200 }).spriteScale).toBe(1.6);
  });

  it('insideViewport is inclusive of the edges', () => {
    const v = { left: 10, top: 10, width: 20, height: 20 };
    expect(insideViewport(10, 10, v)).toBe(true);
    expect(insideViewport(30, 30, v)).toBe(true);
    expect(insideViewport(31, 30, v)).toBe(false);
    expect(insideViewport(9, 20, v)).toBe(false);
  });
});

describe('particles', () => {
  it('never exceed the cap and die out', () => {
    const particles: Particle[] = [];
    let n = 0;
    const random = () => ((n++ * 7919) % 1000) / 1000;
    for (let i = 0; i < 50; i++) emitParticles(particles, { x: 240, y: 160 }, 40, random);
    expect(particles.length).toBe(MAX_PARTICLES);
    for (let i = 0; i < 200; i++) stepParticles(particles);
    expect(particles.length).toBe(0);
  });
});

describe('palette composition', () => {
  it('pairs space colors with character colors by id', () => {
    for (const palette of PALETTES) {
      expect(palette.space).toBe(SPACE_COLORS[palette.id]);
      expect(palette.name).toBe(SPACE_COLORS[palette.id].name);
      expect(Object.keys(palette.characters)).toHaveLength(8);
    }
    expect(getPalette(2).name).toBe('MINT');
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
