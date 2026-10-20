import { describe, expect, it } from 'vitest';
import { createPrng, hashString, localEntropy, mix32, streamFor } from '../game/prng.ts';

describe('mulberry32 PRNG', () => {
  // Known-answer vectors pinned from the reference implementation. If these
  // change, replay of every persisted world changes with them.
  const vectors: Array<[number, number[]]> = [
    [0, [0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111]],
    [1, [0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741]],
    [123456, [0.38233304349705577, 0.7972629074938595, 0.9965302373748273, 0.16001168475486338]],
    [0xffffffff, [0.8964226141106337, 0.189478256739676, 0.7156526781618595, 0.9440599093213677]],
  ];

  it.each(vectors)('seed %i produces the pinned sequence', (seed, expected) => {
    const rng = createPrng(seed);
    const actual = expected.map(() => rng.next());
    expect(actual).toEqual(expected);
  });

  it('is reproducible for the same seed', () => {
    const a = createPrng(42);
    const b = createPrng(42);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('keeps int/range within bounds', () => {
    const rng = createPrng(7);
    for (let i = 0; i < 10_000; i++) {
      const value = rng.int(8);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(8);
      const ranged = rng.range(3, 5);
      expect(ranged).toBeGreaterThanOrEqual(3);
      expect(ranged).toBeLessThanOrEqual(5);
    }
  });

  it('mix32 is stable', () => {
    expect(mix32(1, 2, 3)).toBe(2901138804);
    expect(mix32(123456, 1, 99)).toBe(2077291956);
    expect(mix32(0)).toBe(493009611);
  });

  it('hashString is stable and unsigned', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('glitch')).toBe(hashString('glitch'));
    expect(hashString('glitch')).not.toBe(hashString('garden'));
    expect(hashString('garden')).toBeGreaterThanOrEqual(0);
  });

  it('streams differ by revision and entropy', () => {
    const base = streamFor(99, 1, localEntropy(99, 1)).next();
    expect(streamFor(99, 2, localEntropy(99, 2)).next()).not.toBe(base);
    expect(streamFor(99, 1, 12345).next()).not.toBe(base);
    expect(streamFor(99, 1, localEntropy(99, 1)).next()).toBe(base);
  });
});
