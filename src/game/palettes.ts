import type { EntityType, PaletteId } from './types.ts';

/** Colors for one sprite archetype: [primary, secondary, accent, dark]. */
export type SpriteColors = readonly [string, string, string, string];

export interface Palette {
  id: PaletteId;
  name: string;
  sky: string;
  skyBand: string;
  terrain: string;
  terrainDeep: string;
  horizon: string;
  star: string;
  starDim: string;
  moon: string;
  moonShade: string;
  skyline: string;
  glitch: string;
  cursor: string;
  particle: readonly [string, string];
  sprites: Record<EntityType, SpriteColors>;
}

const midnight: Palette = {
  id: 0,
  name: 'MIDNIGHT',
  sky: '#10152d',
  skyBand: '#141a36',
  terrain: '#23284c',
  terrainDeep: '#1a1f3d',
  horizon: '#2d3360',
  star: '#f5f4e8',
  starDim: '#9fa9c7',
  moon: '#bb9fff',
  moonShade: '#8d74d6',
  skyline: '#171c3a',
  glitch: '#7ceade',
  cursor: '#dbff79',
  particle: ['#7ceade', '#ff8fa7'],
  sprites: {
    flower: ['#ff8fa7', '#dbff79', '#f5f4e8', '#4b2d4a'],
    robot: ['#9fa9c7', '#7ceade', '#ff8fa7', '#2a3057'],
    crystal: ['#bb9fff', '#7ceade', '#f5f4e8', '#4a3c80'],
    shroom: ['#ff8fa7', '#f5f4e8', '#dbff79', '#5a2f45'],
    portal: ['#bb9fff', '#7ceade', '#10152d', '#3a2f6d'],
    totem: ['#dbff79', '#ff8fa7', '#7ceade', '#3b3f2a'],
    tree: ['#8fe07a', '#dbff79', '#4b7a3a', '#5a3d2b'],
    slime: ['#7ceade', '#dbff79', '#f5f4e8', '#235c5a'],
  },
};

const sunset: Palette = {
  id: 1,
  name: 'SUNSET',
  sky: '#2b1536',
  skyBand: '#3d1b45',
  terrain: '#4a2340',
  terrainDeep: '#3a1b33',
  horizon: '#6a2d4f',
  star: '#ffe9c4',
  starDim: '#c98e8a',
  moon: '#ffb05c',
  moonShade: '#e07a3e',
  skyline: '#321a3d',
  glitch: '#ffb05c',
  cursor: '#ffe9c4',
  particle: ['#ffb05c', '#ff6f91'],
  sprites: {
    flower: ['#ff6f91', '#ffb05c', '#ffe9c4', '#4a1f33'],
    robot: ['#c98e8a', '#ffe9c4', '#ff6f91', '#3a1b33'],
    crystal: ['#ffb05c', '#ffe9c4', '#fff6e0', '#7a3f2a'],
    shroom: ['#ff6f91', '#ffe9c4', '#ffb05c', '#4a1f33'],
    portal: ['#ff6f91', '#ffb05c', '#2b1536', '#5a2a4a'],
    totem: ['#ffb05c', '#ff6f91', '#ffe9c4', '#4a2a1e'],
    tree: ['#e07a3e', '#ffb05c', '#8c3b2a', '#4a2318'],
    slime: ['#ffb05c', '#ffe9c4', '#fff6e0', '#7a4a2a'],
  },
};

const handheld: Palette = {
  id: 2,
  name: 'HANDHELD',
  sky: '#0f380f',
  skyBand: '#1b4a1b',
  terrain: '#306230',
  terrainDeep: '#214a21',
  horizon: '#3f7a3f',
  star: '#9bbc0f',
  starDim: '#8bac0f',
  moon: '#9bbc0f',
  moonShade: '#8bac0f',
  skyline: '#173f17',
  glitch: '#9bbc0f',
  cursor: '#e0f8d0',
  particle: ['#9bbc0f', '#e0f8d0'],
  sprites: {
    flower: ['#9bbc0f', '#e0f8d0', '#e0f8d0', '#0f380f'],
    robot: ['#8bac0f', '#e0f8d0', '#9bbc0f', '#0f380f'],
    crystal: ['#e0f8d0', '#9bbc0f', '#e0f8d0', '#306230'],
    shroom: ['#9bbc0f', '#e0f8d0', '#8bac0f', '#0f380f'],
    portal: ['#9bbc0f', '#e0f8d0', '#0f380f', '#306230'],
    totem: ['#8bac0f', '#9bbc0f', '#e0f8d0', '#0f380f'],
    tree: ['#8bac0f', '#9bbc0f', '#306230', '#0f380f'],
    slime: ['#9bbc0f', '#e0f8d0', '#e0f8d0', '#306230'],
  },
};

const vapor: Palette = {
  id: 3,
  name: 'VAPOR',
  sky: '#1a0b2e',
  skyBand: '#241040',
  terrain: '#2e1a52',
  terrainDeep: '#22123d',
  horizon: '#ff71ce',
  star: '#fdfdff',
  starDim: '#b967ff',
  moon: '#01cdfe',
  moonShade: '#0190b8',
  skyline: '#1f0f38',
  glitch: '#ff71ce',
  cursor: '#fffb96',
  particle: ['#01cdfe', '#ff71ce'],
  sprites: {
    flower: ['#ff71ce', '#fffb96', '#fdfdff', '#4a1f5e'],
    robot: ['#b967ff', '#01cdfe', '#ff71ce', '#2a1448'],
    crystal: ['#01cdfe', '#fdfdff', '#fffb96', '#3a2a7a'],
    shroom: ['#ff71ce', '#fdfdff', '#fffb96', '#4a1f5e'],
    portal: ['#01cdfe', '#ff71ce', '#1a0b2e', '#3a2a7a'],
    totem: ['#fffb96', '#ff71ce', '#01cdfe', '#3a2a3a'],
    tree: ['#05ffa1', '#fffb96', '#0b8a5a', '#4a2a5e'],
    slime: ['#05ffa1', '#fffb96', '#fdfdff', '#1f5e4a'],
  },
};

export const PALETTES: readonly [Palette, Palette, Palette, Palette] = [
  midnight,
  sunset,
  handheld,
  vapor,
];

export function getPalette(id: PaletteId): Palette {
  return PALETTES[id];
}

export function nextPaletteId(id: PaletteId): PaletteId {
  return ((id + 1) % 4) as PaletteId;
}
