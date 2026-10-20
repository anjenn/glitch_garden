// Space: the viewport the characters live in, plus everything drawn around them.
export { SPACE_COLORS, type SpaceColors } from './colors.ts';
export {
  gardenViewport,
  insideViewport,
  projectionFor,
  type Projection,
  type Viewport,
} from './viewport.ts';
export { emitParticles, stepParticles, type Particle } from './particles.ts';
export {
  drawBurst,
  drawCursor,
  drawGlitch,
  drawParticles,
  drawSparkles,
  fill,
  snapRect,
  type Burst,
  type SpaceFrame,
} from './atmosphere.ts';
