// Transient pixel dust that lives in the space. Client-only, bounded, never persisted.

import { MAX_PARTICLES, WORLD_HEIGHT, WORLD_WIDTH, type Point } from '../types.ts';

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

/** Advance particles one frame (logical units). Mutates the bounded array in place. */
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
