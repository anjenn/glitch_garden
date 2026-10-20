// Pixel maps for the 8 character archetypes. Pure data: no drawing here.
// Characters: '.' transparent, a primary, b secondary, c accent, d dark, w white.

import type { EntityType } from '../types.ts';

export type PixelMap = readonly string[];

export interface CharacterDef {
  /** Two idle-animation frames of identical dimensions. */
  frames: readonly [PixelMap, PixelMap];
}

const flower: CharacterDef = {
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

const tree: CharacterDef = {
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

const robot: CharacterDef = {
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

const crystal: CharacterDef = {
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

const shroom: CharacterDef = {
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

const portal: CharacterDef = {
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

const totem: CharacterDef = {
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

const slime: CharacterDef = {
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

export const CHARACTERS: Record<EntityType, CharacterDef> = {
  flower,
  robot,
  crystal,
  shroom,
  portal,
  totem,
  tree,
  slime,
};
