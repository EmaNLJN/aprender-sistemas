import { describe, expect, it } from 'vitest';
import { reviewStateOf } from './review-state';

const EXERCISE = {
  language: 'rust' as const,
  starter: 'fn inicio() {}',
  tests: [
    { id: 't1', label: '', expression: '', why: '', failure: 'Falla del primero.' },
    { id: 't2', label: '', expression: '', why: '', failure: 'Falla del segundo.' },
  ],
  review: { success: 'Bien.', pitfall: 'Cuidado.' },
};

function result(overrides: Record<string, unknown>) {
  return {
    code: 'a',
    success: true,
    stdout: '',
    stderr: '',
    transportError: false,
    tests: [
      { id: 't1', passed: true },
      { id: 't2', passed: true },
    ],
    time: 1,
    customTest: '',
    customPassed: false,
    ...overrides,
  };
}

describe('reviewStateOf', () => {
  it('a run of this exercise in progress is running, whatever was saved', () => {
    expect(reviewStateOf(EXERCISE, { draft: 'a', result: result({}) }, true)).toEqual({
      kind: 'running',
    });
  });

  it('without a result there is nothing to review yet', () => {
    expect(reviewStateOf(EXERCISE, {}, false)).toEqual({ kind: 'unrun' });
  });

  it('a result of another version of the code is stale', () => {
    expect(reviewStateOf(EXERCISE, { draft: 'b', result: result({}) }, false)).toEqual({
      kind: 'stale',
    });
  });

  it('a transport failure carries its message', () => {
    expect(
      reviewStateOf(
        EXERCISE,
        {
          draft: 'a',
          result: result({ success: false, transportError: true, stderr: 'Sin red.', tests: [] }),
        },
        false,
      ),
    ).toEqual({ kind: 'transport-failure', message: 'Sin red.' });
  });

  it('every test passed and the run succeeded: passed', () => {
    expect(reviewStateOf(EXERCISE, { draft: 'a', result: result({}) }, false)).toEqual({
      kind: 'passed',
      passedCount: 2,
    });
  });

  it('a successful run with a failing test is partial, with the why of the first failure', () => {
    const partial = result({
      tests: [
        { id: 't1', passed: true },
        { id: 't2', passed: false },
      ],
    });
    expect(reviewStateOf(EXERCISE, { draft: 'a', result: partial }, false)).toEqual({
      kind: 'partial',
      passedCount: 1,
      failure: 'Falla del segundo.',
    });
  });

  it('a run that did not succeed is an error, diagnosed from its output', () => {
    const failed = result({
      success: false,
      stderr: 'error[E0384]: cannot assign twice',
      tests: [],
    });
    expect(reviewStateOf(EXERCISE, { draft: 'a', result: failed }, false)).toEqual({
      kind: 'error',
      diagnosis: {
        explanation:
          'Estás intentando modificar un binding o acceder con mutabilidad donde no está permitida. La mutabilidad es una decisión explícita.',
        action:
          'Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
      },
    });
  });

  it('a run in progress is running even before its first result', () => {
    expect(reviewStateOf(EXERCISE, {}, true)).toEqual({ kind: 'running' });
  });

  it('a transport failure of another version of the code is stale', () => {
    const failure = result({ success: false, transportError: true, stderr: 'Sin red.', tests: [] });
    expect(reviewStateOf(EXERCISE, { draft: 'b', result: failure }, false)).toEqual({
      kind: 'stale',
    });
  });

  it('the first failing test explains a partial run, and the pitfall stands in for an empty why', () => {
    const bothFail = result({
      tests: [
        { id: 't1', passed: false },
        { id: 't2', passed: false },
      ],
    });
    expect(reviewStateOf(EXERCISE, { draft: 'a', result: bothFail }, false)).toEqual({
      kind: 'partial',
      passedCount: 0,
      failure: 'Falla del primero.',
    });
    const withoutWhy = {
      ...EXERCISE,
      tests: [{ ...EXERCISE.tests[0], failure: '' }, EXERCISE.tests[1]],
    };
    expect(reviewStateOf(withoutWhy, { draft: 'a', result: bothFail }, false)).toEqual({
      kind: 'partial',
      passedCount: 0,
      failure: 'Cuidado.',
    });
  });
});
