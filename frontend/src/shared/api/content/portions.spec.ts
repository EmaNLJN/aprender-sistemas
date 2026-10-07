import { describe, expect, it } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import meta from '../../../../../build/curriculum.meta.json';
import { PORTION_NAMES, findPortionProblem, type PortionName } from './portions';

function realPortion(name: PortionName): unknown {
  const [group = '', slice] = name.split('.');
  const value = (curriculum as Record<string, unknown>)[group];
  return slice === undefined ? value : (value as Record<string, unknown>)[slice];
}

describe('PORTION_NAMES', () => {
  it('lists the portions of the built document in the same order', () => {
    expect([...PORTION_NAMES]).toEqual(Object.keys(meta.portions));
  });
});

describe('findPortionProblem', () => {
  it.each([...PORTION_NAMES])('accepts the real portion %s', (name) => {
    expect(findPortionProblem(name, realPortion(name))).toBeNull();
  });

  it('reports a portion the source does not have as missing', () => {
    expect(findPortionProblem('lab.rust', undefined)).toBe('missing');
  });

  it('rejects an empty list because it would discard saved progress', () => {
    expect(findPortionProblem('lab.go', [])).toBe('shape');
  });

  it('rejects an entry without id', () => {
    expect(findPortionProblem('quests.rust', [{ id: 'a' }, { title: 'b' }])).toBe('shape');
  });

  it('rejects an entry with an empty id', () => {
    expect(findPortionProblem('quests.rust', [{ id: '' }])).toBe('shape');
  });

  it('rejects an object where a list belongs', () => {
    expect(findPortionProblem('cores.pc', { id: 'a' })).toBe('shape');
  });

  it('rejects a guide that lacks the track of a language', () => {
    const guide = realPortion('guide') as { tracks: Record<string, unknown> };
    const withoutGo = { ...guide, tracks: { rust: guide.tracks.rust } };
    expect(findPortionProblem('guide', withoutGo)).toBe('shape');
  });

  it('rejects a guide without resources', () => {
    const guide = realPortion('guide') as object;
    expect(findPortionProblem('guide', { ...guide, resources: [] })).toBe('shape');
  });
});
