// Deterministic 32-bit PRNG used by the canonical mutation engine.
//
// Algorithm: mulberry32 (a single 32-bit state, documented widely, trivially
// portable between browsers and the Deno Edge runtime). Known-answer vectors are
// pinned in src/tests/prng.test.ts; do not change this without a rules version bump.

export interface Prng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [0, max). `max` must be a positive integer. */
  int(max: number): number;
  /** Integer in [min, max] inclusive. */
  range(min: number, max: number): number;
  /** Current state (for debugging/replay). */
  state(): number;
}

export function createPrng(seed: number): Prng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(max) {
      return Math.floor(next() * max);
    },
    range(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    state() {
      return a;
    },
  };
}

/** 32-bit integer hash (murmur3 finalizer). Combines inputs into a stream seed. */
export function mix32(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const part of parts) {
    h = (h ^ (part >>> 0)) >>> 0;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** Hash a string into an unsigned 32-bit integer (FNV-1a). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * The PRNG stream for one canonical transition. The same (seed, revision, entropy)
 * always yields the same stream, which is what makes replay possible.
 */
export function streamFor(seed: number, nextRevision: number, entropy: number): Prng {
  return createPrng(mix32(seed, nextRevision, entropy));
}

/**
 * Deterministic entropy used by the offline app and by tests, derived only from
 * public inputs. The shared server mixes in a server-owned secret instead.
 */
export function localEntropy(seed: number, nextRevision: number): number {
  return mix32(seed ^ 0x5bd1e995, nextRevision * 2654435761);
}
