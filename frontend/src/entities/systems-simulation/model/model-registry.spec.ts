import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { infraModels } from '../models/infra';
import { lowlevelModels } from '../models/lowlevel';
import { pcModel } from '../models/pc';
import { playModels } from '../models/play';
import { mergeModelGroups } from './model-registry';

const EXPECTED_ORDER = [
  'pc',
  'cache',
  'heap',
  'mmu',
  'tlb',
  'vm',
  'stack',
  'scheduler',
  'interrupts',
  'wal',
  'lsm',
  'quorum',
  'clocks',
  'network',
  'backpressure',
  'balancing',
  'sharding',
  'transforms',
  'raster',
  'raycast',
  'pathfinding',
  'physics',
  'life',
  'algebra',
  'minimax',
];

describe('mergeModelGroups', () => {
  it('joins the groups and their keys in order', () => {
    const merged = mergeModelGroups([{ b: 1, a: 2 }, { c: 3 }, { d: 4 }]);

    expect(Object.keys(merged)).toEqual(['b', 'a', 'c', 'd']);
    expect(merged).toEqual({ b: 1, a: 2, c: 3, d: 4 });
  });

  it('keeps the same object for each model', () => {
    const model = { initial: () => ({}) };

    expect(mergeModelGroups([{ model }]).model).toBe(model);
  });

  it('throws when two groups define the same name', () => {
    expect(() => mergeModelGroups([{ cache: 1 }, { heap: 2 }, { cache: 3 }])).toThrow(
      'Modelo de Sistemas repetido: cache',
    );
  });

  it('merges the four real groups into the 25 models the workshops reference', () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL('../../../../../qa/fixtures/curriculum-ids.json', import.meta.url),
        'utf8',
      ),
    ) as { workshops: Record<string, { model: string }> };
    const referenced = new Set(Object.values(fixture.workshops).map((workshop) => workshop.model));

    const merged = mergeModelGroups([{ pc: pcModel }, lowlevelModels, infraModels, playModels]);

    expect(Object.keys(merged)).toEqual(EXPECTED_ORDER);
    expect(new Set(Object.keys(merged))).toEqual(new Set([...referenced, 'pc']));
  });
});
