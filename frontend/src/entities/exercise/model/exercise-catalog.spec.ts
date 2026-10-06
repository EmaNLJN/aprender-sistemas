import { beforeAll, describe, expect, it } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import fixture from '../../../../../qa/fixtures/curriculum-ids.json';
import {
  createExerciseCatalog,
  createExerciseCatalogHolder,
  type ExerciseCatalog,
  type ExerciseGroups,
} from './exercise-catalog';
import type { Exercise } from './types';

function stub(id: string): Exercise {
  return { id } as Exercise;
}

function stubs(...ids: string[]): Exercise[] {
  return ids.map(stub);
}

function smallGroups(): ExerciseGroups {
  return {
    rustLab: stubs('a1', 'a2'),
    rustQuests: stubs('b1'),
    goLab: stubs('c1'),
    goQuests: stubs('d1'),
    systemsLowlevel: stubs('e1'),
    systemsInfra: stubs('f1'),
    systemsPlay: stubs('g1'),
    systemsPc: stubs('h1'),
  };
}

function realGroups(): ExerciseGroups {
  return {
    rustLab: curriculum.lab.rust as Exercise[],
    rustQuests: curriculum.quests.rust as Exercise[],
    goLab: curriculum.lab.go as Exercise[],
    goQuests: curriculum.quests.go as Exercise[],
    systemsLowlevel: curriculum.cores.lowlevel as Exercise[],
    systemsInfra: curriculum.cores.infra as Exercise[],
    systemsPlay: curriculum.cores.play as Exercise[],
    systemsPc: curriculum.cores.pc as Exercise[],
  };
}

describe('createExerciseCatalog', () => {
  it('joins the eight groups in the order of the Rust lab, quests, Go lab, quests and the four Systems cores', () => {
    const catalog = createExerciseCatalog(smallGroups());

    expect(catalog.exercises.map((exercise) => exercise.id)).toEqual([
      'a1',
      'a2',
      'b1',
      'c1',
      'd1',
      'e1',
      'f1',
      'g1',
      'h1',
    ]);
  });

  it('indexes every exercise by id', () => {
    const catalog = createExerciseCatalog(smallGroups());

    expect(catalog.byId.get('g1')?.id).toBe('g1');
    expect(catalog.byId.get('missing')).toBeUndefined();
  });

  describe('with the real curriculum', () => {
    let catalog: ExerciseCatalog;
    let ids: string[];

    beforeAll(() => {
      catalog = createExerciseCatalog(realGroups());
      ids = catalog.exercises.map((exercise) => exercise.id);
    });

    it('has the 274 ids of the frozen fixture, without repeats', () => {
      expect(ids).toHaveLength(274);
      expect(new Set(ids).size).toBe(274);
      expect([...ids].sort()).toEqual(Object.keys(fixture.exercises).sort());
    });

    it('puts each group where it starts, in order', () => {
      const firstOfEachGroup = [0, 100, 112, 212, 224, 240, 256, 272].map((index) => ids[index]);

      expect(firstOfEachGroup).toEqual([
        'rust-01',
        'rust-101',
        'go-01',
        'go-101',
        'rust-113',
        'rust-121',
        'rust-129',
        'rust-137',
      ]);
      expect(ids[273]).toBe('go-137');
    });

    it('finds one exercise of each group by id', () => {
      for (const id of [
        'rust-01',
        'rust-101',
        'go-01',
        'go-101',
        'rust-113',
        'rust-121',
        'rust-129',
        'go-137',
      ]) {
        expect(catalog.byId.get(id)?.id).toBe(id);
      }
    });
  });
});

describe('createExerciseCatalogHolder', () => {
  it('throws before init', () => {
    const holder = createExerciseCatalogHolder();

    expect(() => holder.exercises).toThrow('Inicializá el catálogo de ejercicios antes de usarlo.');
    expect(() => holder.byId).toThrow('Inicializá el catálogo de ejercicios antes de usarlo.');
  });

  it('serves the catalog it was initialized with', () => {
    const holder = createExerciseCatalogHolder();

    holder.init(smallGroups());

    expect(holder.exercises).toHaveLength(9);
    expect(holder.byId.get('d1')?.id).toBe('d1');
  });

  it('throws on a second init', () => {
    const holder = createExerciseCatalogHolder();
    holder.init(smallGroups());

    expect(() => holder.init(smallGroups())).toThrow(
      'El catálogo de ejercicios ya está inicializado.',
    );
  });
});
