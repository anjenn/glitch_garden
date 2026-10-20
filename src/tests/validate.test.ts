import { describe, expect, it } from 'vitest';
import { createInitialWorld } from '../game/initialWorld.ts';
import { isWorldState, parseClientIntent } from '../game/validate.ts';

const NOW = '2026-01-01T00:00:00.000Z';
const UUID = 'ef594e71-93bd-46d3-a789-2125ad6a68e2';

describe('isWorldState', () => {
  const valid = createInitialWorld(1, 'w', NOW);

  it('accepts a freshly generated world', () => {
    expect(isWorldState(valid)).toBe(true);
  });

  it.each([
    ['null', null],
    ['string', 'nope'],
    ['empty object', {}],
    ['wrong schema', { ...valid, schemaVersion: 2 }],
    ['negative revision', { ...valid, revision: -1 }],
    ['NaN chaos', { ...valid, chaos: Number.NaN }],
    ['chaos > 100', { ...valid, chaos: 101 }],
    ['palette 4', { ...valid, palette: 4 }],
    ['entities not array', { ...valid, entities: {} }],
    ['too many entities', { ...valid, entities: new Array(86).fill(valid.entities[0]) }],
    ['duplicate ids', { ...valid, entities: [valid.entities[0], valid.entities[0]] }],
    ['entity out of bounds', { ...valid, entities: [{ ...valid.entities[0], x: 9999 }] }],
    ['entity unknown type', { ...valid, entities: [{ ...valid.entities[0], type: 'dragon' }] }],
    ['entity fractional x', { ...valid, entities: [{ ...valid.entities[0], x: 10.5 }] }],
    ['entity infinite phase', { ...valid, entities: [{ ...valid.entities[0], phase: Infinity }] }],
  ])('rejects %s', (_label, value) => {
    expect(isWorldState(value)).toBe(false);
  });
});

describe('parseClientIntent', () => {
  it('accepts a click with a point', () => {
    expect(
      parseClientIntent({ clientEventId: UUID, action: 'click', point: { x: 240, y: 160 } }),
    ).toEqual({
      clientEventId: UUID,
      action: 'click',
      point: { x: 240, y: 160 },
    });
  });

  it('accepts random_mutation and palette_shift without a point', () => {
    expect(parseClientIntent({ clientEventId: UUID, action: 'random_mutation' })?.action).toBe(
      'random_mutation',
    );
    expect(parseClientIntent({ clientEventId: UUID, action: 'palette_shift' })?.action).toBe(
      'palette_shift',
    );
  });

  it.each([
    ['idle_growth is scheduler-only', { clientEventId: UUID, action: 'idle_growth' }],
    ['unknown action', { clientEventId: UUID, action: 'reset' }],
    ['missing clientEventId', { action: 'click', point: { x: 1, y: 1 } }],
    ['non-uuid clientEventId', { clientEventId: 'abc', action: 'click', point: { x: 1, y: 1 } }],
    ['click without point', { clientEventId: UUID, action: 'click' }],
    ['point out of range', { clientEventId: UUID, action: 'click', point: { x: 480, y: 0 } }],
    ['fractional point', { clientEventId: UUID, action: 'click', point: { x: 1.5, y: 0 } }],
    [
      'extra entities key',
      { clientEventId: UUID, action: 'click', point: { x: 1, y: 1 }, entities: [] },
    ],
    ['extra palette key', { clientEventId: UUID, action: 'palette_shift', palette: 3 }],
    ['point on non-click', { clientEventId: UUID, action: 'palette_shift', point: { x: 1, y: 1 } }],
    ['array', []],
    ['string', 'click'],
  ])('rejects %s', (_label, value) => {
    expect(parseClientIntent(value)).toBeNull();
  });
});
