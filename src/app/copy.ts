// All UI text lives here so a future locale can swap it without touching the renderer.
import type { ActionKind, EntityType, EventResult } from '../game/types.ts';

export const COPY = {
  brand: 'GLITCH.GARDEN',
  modeLocal: 'LOCAL DEMO',
  modeShared: 'SHARED WORLD',
  modeConnecting: 'CONNECTING…',
  nav: { world: 'THE WORLD', dna: 'WORLD DNA', help: 'HOW IT WORKS' },
  tagline: 'A LITTLE WORLD THAT BLOOMS',
  paletteShort: 'PALETTE',
  copySeed: 'COPY SEED',
  canvasLabel: 'Interactive angel forest. Click, tap, or press Enter to grow a creature or plant.',
  dnaTitle: 'WORLD DNA',
  howto: {
    title: 'HOW TO PLAY',
    badge: '3 STEPS',
    steps: [
      {
        icon: '✦',
        title: 'CLICK',
        body: 'Plant something where you click, or transform a neighbour.',
      },
      {
        icon: '→',
        title: 'MOVE',
        body: 'Fast pointer moves leave stardust. It never changes the world.',
      },
      { icon: '◷', title: 'IDLE', body: 'Stop for ~16 seconds and the garden grows on its own.' },
    ],
  },
  guide: { title: 'FIELD GUIDE' },
  journalTitle: 'GARDEN JOURNAL',
  journalLive: 'LIVE ●',
  journalEmpty: 'NOTHING HAS BLOOMED YET',
  stats: {
    generation: 'GENERATION',
    mutations: 'MUTATIONS',
    specimens: 'CREATURES + SPROUTS',
    visits: 'LOCAL VISITS',
    revision: 'WORLD REVISION',
    chaos: 'WONDER INDEX',
    growth: 'GARDEN GROWTH',
  },
  controls: {
    mutate: 'MUTATE THE GARDEN',
    palette: '✿ PALETTE',
    newWorld: '↻ NEW WORLD',
    help: '? HOW TO PLAY',
    helper: 'CLICK ANYWHERE IN THE GARDEN TO PLANT MAGIC ✦',
    helperBorn: 'A LITTLE PIECE OF MAGIC WAS BORN ✦',
    helperTransformed: 'SOMETHING CHANGED ITS SHAPE ✧',
    helperPalette: 'THE COLORS OF THE WORLD SHIFTED ✿',
    helperIdle: 'THE WORLD IS BLOOMING ALL BY ITSELF ✧',
    helperFresh: 'A BRAND-NEW LITTLE WORLD HAS AWAKENED ✧',
    helperBusy: 'SENDING YOUR MAGIC TO THE SHARED WORLD…',
    helperOutside: 'CLICK THE FLOATING GARDEN TO GROW MAGIC',
  },
  help: {
    title: '✧ HOW THIS LITTLE WORLD WORKS',
    steps: [
      '① Click the garden or press the main button to grow a pixel flower, tree, crystal, shroom, robot, portal, totem or slime.',
      '② Click right next to a specimen and it may transform instead.',
      '③ Move your pointer to leave glittering stardust. Dust never changes the world.',
      '④ Leave the page open and the garden sometimes blooms on its own.',
    ],
    localNote:
      '⑤ Your changes are saved locally in this browser. The shared-world version is optional and must be enabled by the site owner.',
    sharedNote: '⑤ Your changes are checked by the server before everyone sees them.',
    close: 'Close instructions',
  },
  toasts: {
    click: '✿ A TINY MIRACLE APPEARED',
    transform: '✧ A SPECIMEN TRANSFORMED',
    mutate: '✿ NEW LIFE IN THE CLOUDS',
    key: '✦ THE GARDEN HAS MUTATED',
    palette: '✿ THE PALETTE SHIFTED',
    growth: '✧ THE GARDEN GREW QUIETLY',
    seedCopied: '✦ WORLD SEED COPIED: ',
    seedPrompt: 'Copy your world seed:',
    newWorld: '✧ A NEW WORLD BEGINS',
    dna: 'WORLD DNA • YOUR LOCAL GARDEN',
    dnaShared: 'WORLD DNA • THE SHARED GARDEN',
    rateLimited: '✧ TOO FAST. THE GARDEN NEEDS A BREATH.',
    conflict: '✧ SOMEONE MUTATED FIRST. TRY AGAIN.',
    offline: '✧ CONNECTION LOST. SHOWING THE LAST KNOWN WORLD.',
    error: '✧ THAT MUTATION DID NOT TAKE',
    storageWarning: '✧ STORAGE IS OFF: THIS GARDEN VANISHES ON RELOAD',
  },
  confirmReset: 'Start a fresh local cloud garden? Your current garden will be replaced.',
  footerLocal: '✧ EXPERIMENT 001 · LOCAL DEMO · NO TRACKING',
  footerShared: '✧ EXPERIMENT 001 · SHARED WORLD · SERVER-VALIDATED',
  sharedUnavailable: '✧ SHARED WORLD UNAVAILABLE · SHOWING LOCAL DEMO',
} as const;

export const ENTITY_LABELS: Record<EntityType, string> = {
  flower: 'PINK BLOOM',
  robot: 'TIN ROBOT',
  crystal: 'STAR CRYSTAL',
  shroom: 'CLOUD MUSHROOM',
  portal: 'WISH PORTAL',
  totem: 'LITTLE TOTEM',
  tree: 'MINT TREE',
  slime: 'JELLY SLIME',
};

export const ENTITY_ICONS: Record<EntityType, string> = {
  flower: '✿',
  robot: '♧',
  crystal: '✧',
  shroom: '❀',
  portal: '✦',
  totem: '♡',
  tree: '♧',
  slime: '✦',
};

export function describeEvent(action: ActionKind, result: EventResult, type?: EntityType): string {
  if (result === 'palette') return 'THE PALETTE SHIFTED';
  const what = type ? ENTITY_LABELS[type] : 'SPECIMEN';
  if (result === 'transform') return `A ${what} TRANSFORMED`;
  if (action === 'idle_growth') return 'THE GARDEN GREW QUIETLY';
  return `A ${what} APPEARED`;
}
