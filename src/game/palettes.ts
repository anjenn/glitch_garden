// A palette is the composition of character colors and space colors for one id.
// The illustrated scene behind the canvas is static artwork; palettes only
// touch what we draw.

import { CHARACTER_COLORS, type CharacterColorSet } from './characters/colors.ts';
import { SPACE_COLORS, type SpaceColors } from './space/colors.ts';
import type { PaletteId } from './types.ts';

export interface Palette {
  id: PaletteId;
  name: string;
  space: SpaceColors;
  characters: CharacterColorSet;
}

function compose(id: PaletteId): Palette {
  return {
    id,
    name: SPACE_COLORS[id].name,
    space: SPACE_COLORS[id],
    characters: CHARACTER_COLORS[id],
  };
}

export const PALETTES: readonly [Palette, Palette, Palette, Palette] = [
  compose(0),
  compose(1),
  compose(2),
  compose(3),
];

export function getPalette(id: PaletteId): Palette {
  return PALETTES[id];
}

export function nextPaletteId(id: PaletteId): PaletteId {
  return ((id + 1) % 4) as PaletteId;
}
