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
export {
  floorBottom,
  floorTop,
  groundDepth,
  isInPool,
  settleInSky,
  settleOnGround,
  zoneAt,
  ISLAND,
  POOL,
  SKY_MARGIN,
  type Settled,
  type Zone,
} from './terrain.ts';
export {
  fallOffset,
  isFlashing,
  registerChanges,
  scaleFor,
  takeLanding,
  FALL_MS,
  FLASH_MS,
  GROW_MS,
  type Birth,
} from './animation.ts';
