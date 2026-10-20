import type { EntityType, PaletteId } from './types.ts';

/** Colors for one sprite archetype: [primary, secondary, accent, dark]. */
export type SpriteColors = readonly [string, string, string, string];

/**
 * A palette recolors sprites, sparkles and particles. The illustrated scene
 * behind the canvas is static artwork, so palettes only touch what we draw.
 */
export interface Palette {
  id: PaletteId;
  name: string;
  sparkle: readonly [string, string];
  particle: readonly [string, string];
  cursor: string;
  glitch: string;
  shadow: string;
  sprites: Record<EntityType, SpriteColors>;
}

const angel: Palette = {
  id: 0,
  name: 'ANGEL',
  sparkle: ['#fff7cc', '#ffffff'],
  particle: ['#fff9d3', '#ffbdd9'],
  cursor: '#e78eae',
  glitch: '#fff2f7',
  shadow: '#baadc2',
  sprites: {
    flower: ['#f7b7d4', '#81c6a5', '#ffe19c', '#7cbca2'],
    robot: ['#d9d3f3', '#e4d6fb', '#ffd2e2', '#9f8dac'],
    crystal: ['#bed8ff', '#c8c3ff', '#fef0ff', '#a8bcd5'],
    shroom: ['#e8a1c0', '#fff4dc', '#ffedf7', '#9f8dac'],
    portal: ['#ffe1ad', '#ffedbc', '#fffafa', '#e0c08a'],
    totem: ['#fff5f8', '#ffe6ac', '#f3bad0', '#b7a3c9'],
    tree: ['#a1e0bc', '#cff0d0', '#8edab3', '#6ba89d'],
    slime: ['#bcf2ce', '#dcffeb', '#ffffff', '#80bba0'],
  },
};

const dusk: Palette = {
  id: 1,
  name: 'DUSK',
  sparkle: ['#ffd9b3', '#fff1e6'],
  particle: ['#ffc9a3', '#d7b7ff'],
  cursor: '#c48ad9',
  glitch: '#f3e3ff',
  shadow: '#a893b8',
  sprites: {
    flower: ['#ffb3a7', '#a3a8e6', '#ffe6a3', '#9b7fb6'],
    robot: ['#c9bde8', '#e9d6ff', '#ffb3a7', '#8a74a8'],
    crystal: ['#d7b7ff', '#f3e3ff', '#ffffff', '#9b7fb6'],
    shroom: ['#ffb3a7', '#fff1e6', '#ffe6a3', '#8a74a8'],
    portal: ['#ffd9b3', '#ffe6a3', '#fff8ee', '#d1a46f'],
    totem: ['#fff1e6', '#ffd9b3', '#d7b7ff', '#a893b8'],
    tree: ['#b6d7c9', '#dbeee6', '#9ec6b6', '#769a8f'],
    slime: ['#d7b7ff', '#f3e3ff', '#ffffff', '#9b7fb6'],
  },
};

const mint: Palette = {
  id: 2,
  name: 'MINT',
  sparkle: ['#eafff3', '#ffffff'],
  particle: ['#bdf5d6', '#fff9d3'],
  cursor: '#6fbf9a',
  glitch: '#eafff3',
  shadow: '#9fc3b2',
  sprites: {
    flower: ['#fff3b0', '#8edab3', '#ffffff', '#6fbf9a'],
    robot: ['#cfe9dc', '#eafff3', '#fff3b0', '#80a894'],
    crystal: ['#bdf5d6', '#eafff3', '#ffffff', '#88c9a7'],
    shroom: ['#ffd9e6', '#fffaf0', '#fff3b0', '#80a894'],
    portal: ['#fff3b0', '#fffaf0', '#ffffff', '#d4c57a'],
    totem: ['#fffaf0', '#fff3b0', '#bdf5d6', '#9fc3b2'],
    tree: ['#8edab3', '#bdf5d6', '#6fbf9a', '#4f8f74'],
    slime: ['#bdf5d6', '#eafff3', '#ffffff', '#6fbf9a'],
  },
};

const candy: Palette = {
  id: 3,
  name: 'CANDY',
  sparkle: ['#fff0f6', '#ffffff'],
  particle: ['#ff9ec6', '#9fd8ff'],
  cursor: '#ff6fa8',
  glitch: '#ffe6f1',
  shadow: '#c9a0bb',
  sprites: {
    flower: ['#ff9ec6', '#9fd8ff', '#fff4a3', '#d96a9b'],
    robot: ['#dfe6ff', '#9fd8ff', '#ff9ec6', '#8c93c9'],
    crystal: ['#9fd8ff', '#dfe6ff', '#ffffff', '#6fa9d9'],
    shroom: ['#ff9ec6', '#fff4a3', '#ffffff', '#d96a9b'],
    portal: ['#fff4a3', '#ffe27a', '#ffffff', '#d9b84a'],
    totem: ['#ffffff', '#fff4a3', '#ff9ec6', '#c9a0bb'],
    tree: ['#a7f0c5', '#d6ffe5', '#79d6a3', '#5aa47f'],
    slime: ['#9fd8ff', '#dfe6ff', '#ffffff', '#6fa9d9'],
  },
};

export const PALETTES: readonly [Palette, Palette, Palette, Palette] = [angel, dusk, mint, candy];

export function getPalette(id: PaletteId): Palette {
  return PALETTES[id];
}

export function nextPaletteId(id: PaletteId): PaletteId {
  return ((id + 1) % 4) as PaletteId;
}
