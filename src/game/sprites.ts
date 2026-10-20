// Pure pixel primitives. Every archetype is a small character map drawn with
// integer rectangles through a PixelSink, so the same code is unit-testable
// without a canvas and renders crisp at 2–4 logical px per block.

import type { Palette, SpriteColors } from './palettes.ts';
import type { EntitySize, EntityType, PixelEntity } from './types.ts';

export interface PixelSink {
  rect(x: number, y: number, w: number, h: number, color: string): void;
}

/** Map characters: '.' transparent, a primary, b secondary, c accent, d dark, w white. */
type PixelMap = readonly string[];

interface SpriteDef {
  frames: readonly [PixelMap, PixelMap];
}

const flower: SpriteDef = {
  frames: [
    [
      '....c....',
      '...cac...',
      '..caaac..',
      '.caawaac.',
      '..caaac..',
      '...cac...',
      '....d....',
      '.b..d..b.',
      '.bb.d.bb.',
      '..bbdbb..',
      '....d....',
      '....d....',
    ],
    [
      '....c....',
      '...cac...',
      '..caaac..',
      '.caawaac.',
      '..caaac..',
      '...cac...',
      '....d....',
      '....d..b.',
      '.b..d.bb.',
      '.bbbdbb..',
      '....d....',
      '....d....',
    ],
  ],
};

const tree: SpriteDef = {
  frames: [
    [
      '...aaa...',
      '..aaaaa..',
      '.aabaaaa.',
      '.aaaaaba.',
      'aaaaaaaaa',
      'abaaaaaaa',
      '.aaaabaa.',
      '..aaaaa..',
      '....d....',
      '....d....',
      '....d....',
      '...ddd...',
    ],
    [
      '...aaa...',
      '..aaaaa..',
      '.aaaaaba.',
      '.aabaaaa.',
      'aaaaaaaaa',
      'aaaaabaaa',
      '.abaaaaa.',
      '..aaaaa..',
      '....d....',
      '....d....',
      '....d....',
      '...ddd...',
    ],
  ],
};

const robot: SpriteDef = {
  frames: [
    [
      '....c....',
      '...ddd...',
      '.ddddddd.',
      '.dwdddwd.',
      '.ddddddd.',
      '.ddaaadd.',
      '..ddddd..',
      '.b.ddd.b.',
      '.b.ddd.b.',
      '...d.d...',
      '...d.d...',
      '..dd.dd..',
    ],
    [
      '....c....',
      '...ddd...',
      '.ddddddd.',
      '.ddddddd.',
      '.ddddddd.',
      '.ddaaadd.',
      '..ddddd..',
      '.b.ddd.b.',
      '.b.ddd.b.',
      '...d.d...',
      '...d.d...',
      '..dd.dd..',
    ],
  ],
};

const crystal: SpriteDef = {
  frames: [
    [
      '...a...',
      '..awa..',
      '..aba..',
      '.aabba.',
      '.aabba.',
      'aaabbaa',
      'aaabbaa',
      '.aabba.',
      '.aabba.',
      '..aba..',
      '..ddd..',
      '.ddddd.',
    ],
    [
      '...a...',
      '..aba..',
      '..awa..',
      '.aabba.',
      '.aabba.',
      'aaabbaa',
      'aaabbaa',
      '.aabba.',
      '.aabba.',
      '..aba..',
      '..ddd..',
      '.ddddd.',
    ],
  ],
};

const shroom: SpriteDef = {
  frames: [
    [
      '..aaaaa..',
      '.aacaaca.',
      'aaaaaaaaa',
      'acaaacaaa',
      'aaaaaaaaa',
      '.ddddddd.',
      '...bbb...',
      '...bbb...',
      '...bbb...',
      '..bbbbb..',
      '..ddddd..',
    ],
    [
      '..aaaaa..',
      '.aacaaca.',
      'aaaaaaaaa',
      'acaaacaaa',
      'aaaaaaaaa',
      '.ddddddd.',
      '...bbb...',
      '...bbb...',
      '...bbb...',
      '..bbbbb..',
      '..ddddd..',
    ],
  ],
};

const portal: SpriteDef = {
  frames: [
    [
      '..ddddd..',
      '.daaaaad.',
      'dabbbbbad',
      'dabcccbad',
      'dabcwcbad',
      'dabcccbad',
      'dabbbbbad',
      '.daaaaad.',
      '..ddddd..',
      '....d....',
      '...ddd...',
      '..ddddd..',
    ],
    [
      '..ddddd..',
      '.daaaaad.',
      'dabbbbbad',
      'dabcccbad',
      'dabccwbad',
      'dabcccbad',
      'dabbbbbad',
      '.daaaaad.',
      '..ddddd..',
      '....d....',
      '...ddd...',
      '..ddddd..',
    ],
  ],
};

const totem: SpriteDef = {
  frames: [
    [
      '.ddddd.',
      '.dadad.',
      '.daaad.',
      '.ddddd.',
      '.dbbbd.',
      '.dbwbd.',
      '.dbbbd.',
      '.ddddd.',
      '.dcccd.',
      '.dc.cd.',
      '.dcccd.',
      '.ddddd.',
      'ddddddd',
    ],
    [
      '.ddddd.',
      '.dadad.',
      '.daaad.',
      '.ddddd.',
      '.dbbbd.',
      '.dbbbd.',
      '.dbwbd.',
      '.ddddd.',
      '.dcccd.',
      '.dc.cd.',
      '.dcccd.',
      '.ddddd.',
      'ddddddd',
    ],
  ],
};

const slime: SpriteDef = {
  frames: [
    [
      '...aaa...',
      '.aaaaaaa.',
      'aawaaawaa',
      'aadaaadaa',
      'aaaaaaaaa',
      'aaaaaaaaa',
      '.aaaaaaa.',
      '..aa.aa..',
    ],
    [
      '.........',
      '..aaaaa..',
      'aawaaawaa',
      'aadaaadaa',
      'aaaaaaaaa',
      'aaaaaaaaa',
      '.aaaaaaa.',
      '.aaa.aaa.',
    ],
  ],
};

export const SPRITES: Record<EntityType, SpriteDef> = {
  flower,
  robot,
  crystal,
  shroom,
  portal,
  totem,
  tree,
  slime,
};

/** Logical pixels per map cell for each entity size. */
export function blockSize(size: EntitySize): number {
  return size + 1;
}

function colorFor(ch: string, colors: SpriteColors, swap: boolean): string | null {
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
      return '#f5f4e8';
    default:
      return null;
  }
}

export interface SpriteBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Bounding box of an entity sprite in logical coordinates (anchor = bottom-center). */
export function spriteBounds(entity: Pick<PixelEntity, 'type' | 'x' | 'y' | 'size'>): SpriteBounds {
  const map = SPRITES[entity.type].frames[0];
  const block = blockSize(entity.size);
  const width = (map[0]?.length ?? 0) * block;
  const height = map.length * block;
  return {
    left: entity.x - Math.floor(width / 2),
    top: entity.y - height,
    width,
    height,
  };
}

/**
 * Draw one entity. Variant 1/3 mirror the map, variant 2/3 swap primary and
 * secondary colors; `frame` selects the idle animation frame.
 */
export function drawEntity(
  sink: PixelSink,
  entity: PixelEntity,
  palette: Palette,
  frame: 0 | 1 = 0,
  yOffset = 0,
): void {
  const def = SPRITES[entity.type];
  const map = def.frames[frame];
  const block = blockSize(entity.size);
  const colors = palette.sprites[entity.type];
  const mirror = entity.variant === 1 || entity.variant === 3;
  const swap = entity.variant === 2 || entity.variant === 3;
  const { left, top } = spriteBounds(entity);
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
      const color = colorFor(line[source] ?? '.', colors, swap);
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

/** Collect every rectangle drawn for an entity (used by tests and hit-area debugging). */
export function collectRects(
  entity: PixelEntity,
  palette: Palette,
  frame: 0 | 1 = 0,
): Array<{ x: number; y: number; w: number; h: number; color: string }> {
  const rects: Array<{ x: number; y: number; w: number; h: number; color: string }> = [];
  drawEntity(
    { rect: (x, y, w, h, color) => rects.push({ x, y, w, h, color }) },
    entity,
    palette,
    frame,
  );
  return rects;
}
