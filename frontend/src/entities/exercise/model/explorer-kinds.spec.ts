import { describe, expect, it } from 'vitest';
import frozen from '../../../../../qa/fixtures/explorer-kinds-a179d03.json';
import { explorerKindOf, labExplorerKindOf, questExplorerOf } from './explorer-kinds';

const kinds = frozen.kinds as Record<string, string | null>;
const ids = Object.keys(kinds);

describe('explorerKindOf against the frozen classification of a179d03', () => {
  it('has the 274 exercises with the hand-counted distribution', () => {
    const count = (kind: string | null) => ids.filter((id) => kinds[id] === kind).length;
    expect(ids).toHaveLength(274);
    expect([
      count('channel'),
      count('generic'),
      count('pointer'),
      count('robot'),
      count('packet'),
      count(null),
    ]).toEqual([21, 20, 20, 6, 6, 201]);
  });

  it.each(ids)('classifies %s as in the fixture', (id) => {
    expect(explorerKindOf(id)).toBe(kinds[id]);
  });

  it('covers every explorer of the map with an exercise of the fixture', () => {
    const mapped = ids.filter((id) => explorerKindOf(id) !== null);
    expect(mapped).toHaveLength(73);
  });
});

describe('hand-written points of the map', () => {
  it('sends the concurrency exercises that only match by visual to channel', () => {
    expect(labExplorerKindOf('go-61')).toBe('channel');
    expect(labExplorerKindOf('go-112')).toBe('channel');
  });

  it('classifies a generic and a pointer exercise', () => {
    expect(labExplorerKindOf('rust-36')).toBe('generic');
    expect(labExplorerKindOf('go-21')).toBe('pointer');
  });

  it('describes the twelve mission explorers with language and mode', () => {
    expect(questExplorerOf('rust-101')).toEqual({ language: 'rust', mode: 'robot' });
    expect(questExplorerOf('rust-102')).toEqual({ language: 'rust', mode: 'robot' });
    expect(questExplorerOf('rust-103')).toEqual({ language: 'rust', mode: 'robot' });
    expect(questExplorerOf('rust-104')).toEqual({ language: 'rust', mode: 'packet' });
    expect(questExplorerOf('rust-105')).toEqual({ language: 'rust', mode: 'packet' });
    expect(questExplorerOf('rust-106')).toEqual({ language: 'rust', mode: 'packet' });
    expect(questExplorerOf('go-101')).toEqual({ language: 'go', mode: 'robot' });
    expect(questExplorerOf('go-102')).toEqual({ language: 'go', mode: 'robot' });
    expect(questExplorerOf('go-103')).toEqual({ language: 'go', mode: 'robot' });
    expect(questExplorerOf('go-104')).toEqual({ language: 'go', mode: 'packet' });
    expect(questExplorerOf('go-105')).toEqual({ language: 'go', mode: 'packet' });
    expect(questExplorerOf('go-106')).toEqual({ language: 'go', mode: 'packet' });
  });

  it.each([
    'go-100',
    'rust-107',
    'go-110',
    'evil-101',
    'go-101x',
    '<script>',
    'constructor',
    '__proto__',
    'toString',
    '',
  ])('gives no explorer to %j', (id) => {
    expect(explorerKindOf(id)).toBeNull();
    expect(labExplorerKindOf(id)).toBeNull();
    expect(questExplorerOf(id)).toBeNull();
  });
});
