// Characters: the living specimens of the garden (maps, colors, drawing).
export { CHARACTERS, type CharacterDef, type PixelMap } from './maps.ts';
export {
  CHARACTER_COLORS,
  CHARACTER_HIGHLIGHT,
  type CharacterColorSet,
  type CharacterColors,
} from './colors.ts';
export {
  blockSize,
  characterBounds,
  collectCharacterRects,
  drawCharacter,
  type CharacterBounds,
  type DrawnRect,
  type PixelSink,
} from './draw.ts';
