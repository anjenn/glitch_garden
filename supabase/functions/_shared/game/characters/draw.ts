// Turns a character map into integer rectangles through a PixelSink. Knows
// nothing about the canvas, the viewport or the space around the character.

import type { EntitySize, PixelEntity } from '../types.ts';
import { CHARACTER_HIGHLIGHT, type CharacterColors, type CharacterColorSet } from './colors.ts';
import { CHARACTERS } from './maps.ts';

export interface PixelSink {
  rect(x: number, y: number, w: number, h: number, color: string): void;
}

export interface CharacterBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Logical pixels per map cell for each entity size (2–4 px blocks). */
export function blockSize(size: EntitySize): number {
  return size + 1;
}

/** Bounding box in logical coordinates (anchor = bottom-center at entity.x/y). */
export function characterBounds(
  entity: Pick<PixelEntity, 'type' | 'x' | 'y' | 'size'>,
): CharacterBounds {
  const map = CHARACTERS[entity.type].frames[0];
  const block = blockSize(entity.size);
  const width = (map[0]?.length ?? 0) * block;
  const height = map.length * block;
  return { left: entity.x - Math.floor(width / 2), top: entity.y - height, width, height };
}

function colorFor(ch: string, colors: CharacterColors, swap: boolean): string | null {
  switch (ch) {
    case 'a':
      return swap ? colors[1] : colors[0];
    case 'b':
      return swap ? colors[0] : colors[1];
    case 'c':
      return colors[2];
    case 'd':
      return colors[3];
    case 'w':
      return CHARACTER_HIGHLIGHT;
    default:
      return null;
  }
}

/**
 * Draw one character. Variant 1/3 mirror the map, variant 2/3 swap primary and
 * secondary colors; `frame` selects the idle animation frame; `yOffset` lets
 * the caller bob floating characters without touching canonical state.
 */
export function drawCharacter(
  sink: PixelSink,
  entity: PixelEntity,
  colors: CharacterColorSet,
  frame: 0 | 1 = 0,
  yOffset = 0,
): void {
  const map = CHARACTERS[entity.type].frames[frame];
  const block = blockSize(entity.size);
  const palette = colors[entity.type];
  const mirror = entity.variant === 1 || entity.variant === 3;
  const swap = entity.variant === 2 || entity.variant === 3;
  const { left, top } = characterBounds(entity);
  const originY = top + yOffset;

  for (let row = 0; row < map.length; row++) {
    const line = map[row] ?? '';
    const cols = line.length;
    let runStart = -1;
    let runColor: string | null = null;
    const flush = (endCol: number) => {
      if (runStart >= 0 && runColor) {
        sink.rect(
          left + runStart * block,
          originY + row * block,
          (endCol - runStart) * block,
          block,
          runColor,
        );
      }
      runStart = -1;
      runColor = null;
    };
    for (let col = 0; col < cols; col++) {
      const source = mirror ? cols - 1 - col : col;
      const color = colorFor(line[source] ?? '.', palette, swap);
      if (color !== runColor) {
        flush(col);
        if (color) {
          runStart = col;
          runColor = color;
        }
      }
    }
    flush(cols);
  }
}

export interface DrawnRect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

/** Collect every rectangle a character draws (tests, hit-area debugging). */
export function collectCharacterRects(
  entity: PixelEntity,
  colors: CharacterColorSet,
  frame: 0 | 1 = 0,
): DrawnRect[] {
  const rects: DrawnRect[] = [];
  drawCharacter(
    { rect: (x, y, w, h, color) => rects.push({ x, y, w, h, color }) },
    entity,
    colors,
    frame,
  );
  return rects;
}
