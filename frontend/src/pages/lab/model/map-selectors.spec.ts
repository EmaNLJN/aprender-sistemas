import { describe, expect, it } from 'vitest';
import type { Exercise } from '../../../entities/exercise';
import {
  isExtraChallenge,
  matchesMapFilters,
  surprisePool,
  todayChallenge,
  type MapFilters,
} from './map-selectors';

const NOW = 5000;

function exercise(id: string, stage: number, title = id, level?: Exercise['level']): Exercise {
  return { id, stage, level, title, topic: 'Tema', intro: '', why: '' } as unknown as Exercise;
}

const FIRST = exercise('r-1', 1, 'Energía del reactor');
const SOLVED = exercise('r-2', 2, 'Contador inmutable');
const DUE = exercise('r-3', 9, 'Préstamos');
const EXTRA = exercise('r-4', 16, 'Un clásico');
const EXERCISES = [FIRST, SOLVED, DUE, EXTRA];
const RECORDS = {
  'r-1': { solvedAt: 10, reviewAt: 9000 },
  'r-2': { solvedAt: 10, reviewAt: 9000 },
  'r-3': { solvedAt: 10, reviewAt: 4000 },
};
const NO_FILTERS: MapFilters = { query: '', dueOnly: false, extraOnly: false, level: 'all' };

describe('isExtraChallenge', () => {
  it('«Clásicos y sistemas» are the stages 16 to 20', () => {
    expect([15, 16, 20, 21].map((stage) => isExtraChallenge({ stage }))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});

describe('matchesMapFilters', () => {
  const visible = (filters: Partial<MapFilters>) =>
    EXERCISES.filter((item) =>
      matchesMapFilters(item, RECORDS, { ...NO_FILTERS, ...filters }, NOW),
    ).map((item) => item.id);

  it('without filters, everything is visible', () => {
    expect(visible({})).toEqual(['r-1', 'r-2', 'r-3', 'r-4']);
  });

  it('«Repasar pendientes» keeps what is due', () => {
    expect(visible({ dueOnly: true })).toEqual(['r-3']);
  });

  it('a level keeps its stages, or the level of the exercise', () => {
    expect(visible({ level: 'beginner' })).toEqual(['r-1', 'r-2']);
    expect(visible({ level: 'advanced' })).toEqual(['r-3']);
  });

  it('the search ignores case and accents', () => {
    expect(visible({ query: 'ENERGIA' })).toEqual(['r-1']);
    expect(visible({ query: 'prestamos' })).toEqual(['r-3']);
  });

  it('«Clásicos y sistemas» keeps the stages 16 to 20', () => {
    expect(visible({ extraOnly: true })).toEqual(['r-4']);
  });
});

describe('todayChallenge', () => {
  it('is the first unsolved one of the level and «Clásicos y sistemas», ignoring the search', () => {
    expect(todayChallenge(EXERCISES, RECORDS, NO_FILTERS, NOW)?.id).toBe('r-4');
  });

  it('when everything is solved, it is the first due one, and else the first one', () => {
    const allSolved = { ...RECORDS, 'r-4': { solvedAt: 10, reviewAt: 9000 } };
    expect(todayChallenge(EXERCISES, allSolved, NO_FILTERS, NOW)?.id).toBe('r-3');
    const nothingDue = { ...allSolved, 'r-3': { solvedAt: 10, reviewAt: 9000 } };
    expect(todayChallenge(EXERCISES, nothingDue, NO_FILTERS, NOW)?.id).toBe('r-1');
  });

  it('with no candidate in the filters, it is the first exercise of the language', () => {
    expect(
      todayChallenge([FIRST, SOLVED], RECORDS, { level: 'expert', extraOnly: false }, NOW)?.id,
    ).toBe('r-1');
  });
});

describe('surprisePool', () => {
  it('prefers the due and the unsolved ones among the filtered', () => {
    expect(surprisePool(EXERCISES, RECORDS, NO_FILTERS, NOW).map((item) => item.id)).toEqual([
      'r-3',
      'r-4',
    ]);
  });

  it('falls back to every filtered one when none is pending', () => {
    expect(
      surprisePool(EXERCISES, RECORDS, { ...NO_FILTERS, level: 'beginner' }, NOW).map(
        (item) => item.id,
      ),
    ).toEqual(['r-1', 'r-2']);
  });

  it('is empty when the filters leave nothing', () => {
    expect(surprisePool(EXERCISES, RECORDS, { ...NO_FILTERS, query: 'zzz' }, NOW)).toEqual([]);
  });
});
