import { describe, expect, it } from 'vitest';
import {
  draftOf,
  isDueForReview,
  isReflectionSolved,
  isResultCurrent,
  isReviewComplete,
  isSolved,
  levelOf,
  normalizeCustomTest,
  practicePointsOf,
} from './selectors';

const EXERCISE = {
  starter: 'fn inicio() {}',
  tests: [{ id: 't1' }, { id: 't2' }],
};

const passing = (code: string, customTest = '') => ({
  code,
  success: true,
  customTest,
  tests: [
    { id: 't1', passed: true },
    { id: 't2', passed: true },
  ],
});

describe('levelOf', () => {
  it('uses the level of the exercise when it has one', () => {
    expect(levelOf({ level: 'expert', stage: 1 })).toBe('expert');
  });

  it.each([
    [1, 'beginner'],
    [4, 'beginner'],
    [5, 'medium'],
    [8, 'medium'],
    [9, 'advanced'],
    [12, 'advanced'],
    [13, 'expert'],
    [20, 'expert'],
  ] as const)('stage %i without a level is %s', (stage, level) => {
    expect(levelOf({ stage })).toBe(level);
  });
});

describe('isSolved', () => {
  it('rust-09 of the frozen progress: solved, then failed with a variant, is still solved (F7-Q1)', () => {
    const rust09 = {
      solvedAt: 1791073357282,
      reviewAt: 1791159757282,
      attempts: 2,
      result: {
        code: 'variante',
        success: true,
        tests: [
          { id: 't1', passed: false },
          { id: 't2', passed: false },
          { id: 't3', passed: false },
        ],
      },
    };
    expect(isSolved(rust09)).toBe(true);
  });

  it('a passing result without solvedAt is not solved, and neither is no record', () => {
    expect(isSolved({ result: passing('x') })).toBe(false);
    expect(isSolved(undefined)).toBe(false);
  });
});

describe('isDueForReview', () => {
  it('is due from its date on, and never without one', () => {
    expect(isDueForReview({ reviewAt: 1000 }, 999)).toBe(false);
    expect(isDueForReview({ reviewAt: 1000 }, 1000)).toBe(true);
    expect(isDueForReview({ reviewAt: 0 }, 5000)).toBe(false);
    expect(isDueForReview({}, 5000)).toBe(false);
    expect(isDueForReview(undefined, 5000)).toBe(false);
  });
});

describe('practicePointsOf', () => {
  it('a solved record with the right prediction and a long reflection earns 20 + 5 + 5', () => {
    expect(
      practicePointsOf({
        solvedAt: 1,
        predictionCorrect: true,
        reflection: 'Con mut el compilador sabe que el valor cambia y me deja sumarle dos veces.',
      }),
    ).toBe(30);
  });

  it('a reflection counts from 40 characters without the spaces of its ends', () => {
    expect(practicePointsOf({ reflection: `  ${'a'.repeat(39)}  ` })).toBe(0);
    expect(practicePointsOf({ reflection: 'a'.repeat(40) })).toBe(5);
  });

  it('solving earns 20 and the right prediction 5, each on its own', () => {
    expect(practicePointsOf({ solvedAt: 1 })).toBe(20);
    expect(practicePointsOf({ predictionCorrect: true })).toBe(5);
  });

  it('no record earns nothing', () => {
    expect(practicePointsOf(undefined)).toBe(0);
  });
});

describe('draftOf and normalizeCustomTest', () => {
  it('the draft is the saved one, even empty, or else the starter', () => {
    expect(draftOf(EXERCISE, { draft: 'mío' })).toBe('mío');
    expect(draftOf(EXERCISE, { draft: '' })).toBe('');
    expect(draftOf(EXERCISE, {})).toBe('fn inicio() {}');
  });

  it('the custom test loses the spaces of its ends, a no-break space included', () => {
    expect(normalizeCustomTest('  energia(1) == 7\n')).toBe('energia(1) == 7');
    expect(normalizeCustomTest(' \t\u00a0 ')).toBe('');
    expect(normalizeCustomTest(undefined)).toBe('');
  });
});

describe('isResultCurrent', () => {
  it('is current while the draft and the trimmed custom test are the ones that ran', () => {
    expect(
      isResultCurrent(EXERCISE, { draft: 'a', customTest: ' x ', result: passing('a', 'x') }),
    ).toBe(true);
  });

  it('goes stale when the draft or the custom test change', () => {
    expect(isResultCurrent(EXERCISE, { draft: 'b', result: passing('a') })).toBe(false);
    expect(isResultCurrent(EXERCISE, { draft: 'a', customTest: 'y', result: passing('a') })).toBe(
      false,
    );
  });

  it('a result of the starter is current while there is no draft', () => {
    expect(isResultCurrent(EXERCISE, { result: passing('fn inicio() {}') })).toBe(true);
  });

  it('without a result there is nothing current', () => {
    expect(isResultCurrent(EXERCISE, {})).toBe(false);
  });
});

describe('isReviewComplete and isReflectionSolved', () => {
  it('the review is complete when every test passed and the run succeeded', () => {
    expect(isReviewComplete(EXERCISE, passing('a'))).toBe(true);
    expect(isReviewComplete(EXERCISE, { ...passing('a'), success: false })).toBe(false);
    expect(
      isReviewComplete(EXERCISE, {
        success: true,
        tests: [
          { id: 't1', passed: true },
          { id: 't2', passed: false },
        ],
      }),
    ).toBe(false);
  });

  it('«Explicá» counts as solved only with a current, successful result that passes each test', () => {
    expect(isReflectionSolved(EXERCISE, { draft: 'a', result: passing('a') })).toBe(true);
    expect(isReflectionSolved(EXERCISE, { draft: 'b', result: passing('a') })).toBe(false);
    expect(
      isReflectionSolved(EXERCISE, { draft: 'a', result: { ...passing('a'), success: false } }),
    ).toBe(false);
  });

  it('«Explicá» is not solved while a test of the current, successful run fails or is missing', () => {
    const failing = {
      ...passing('a'),
      tests: [
        { id: 't1', passed: true },
        { id: 't2', passed: false },
      ],
    };
    const missing = { ...passing('a'), tests: [{ id: 't1', passed: true }] };
    expect(isReflectionSolved(EXERCISE, { draft: 'a', result: failing })).toBe(false);
    expect(isReflectionSolved(EXERCISE, { draft: 'a', result: missing })).toBe(false);
  });
});
