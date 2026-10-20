// Per-palette colors for the space around the characters: sparkles, dust,
// cursor, glitch bands and ground shadow. Palette ids match characters/colors.ts.

import type { PaletteId } from '../types.ts';

export interface SpaceColors {
  name: string;
  sparkle: readonly [string, string];
  particle: readonly [string, string];
  cursor: string;
  glitch: string;
  shadow: string;
}

export const SPACE_COLORS: Record<PaletteId, SpaceColors> = {
  0: {
    name: 'ANGEL',
    sparkle: ['#fff7cc', '#ffffff'],
    particle: ['#fff9d3', '#ffbdd9'],
    cursor: '#e78eae',
    glitch: '#fff2f7',
    shadow: '#baadc2',
  },
  1: {
    name: 'DUSK',
    sparkle: ['#ffd9b3', '#fff1e6'],
    particle: ['#ffc9a3', '#d7b7ff'],
    cursor: '#c48ad9',
    glitch: '#f3e3ff',
    shadow: '#a893b8',
  },
  2: {
    name: 'MINT',
    sparkle: ['#eafff3', '#ffffff'],
    particle: ['#bdf5d6', '#fff9d3'],
    cursor: '#6fbf9a',
    glitch: '#eafff3',
    shadow: '#9fc3b2',
  },
  3: {
    name: 'CANDY',
    sparkle: ['#fff0f6', '#ffffff'],
    particle: ['#ff9ec6', '#9fd8ff'],
    cursor: '#ff6fa8',
    glitch: '#ffe6f1',
    shadow: '#c9a0bb',
  },
};
