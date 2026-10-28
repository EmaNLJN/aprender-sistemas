import { describe, expect, it } from 'vitest';
import type { LabStateV1 } from './lab-state';
import {
  attemptPatch,
  ensureRecord,
  hintPatch,
  loadSolutionPatch,
  passedRunPatch,
  predictionPatch,
  restoreStarterPatch,
  revealSolutionPatch,
  selfAssessmentPatch,
} from './record-rules';

const NOW = Date.parse('2026-10-06T12:00:00Z');
const EXERCISE = {
  starter: 'fn inicio() {}',
  solution: 'fn resuelto() {}',
  prediction: { question: '', options: ['a', 'b', 'c'], answer: 1, explanation: '' },
};

describe('ensureRecord', () => {
  it('returns the record in place, creating an empty one when it is missing', () => {
    const progress: LabStateV1 = {
      version: 1,
      records: { a: { hints: 1 } },
      selected: { rust: null, go: null },
    };
    expect(ensureRecord(progress, 'a')).toBe(progress.records.a);
    const created = ensureRecord(progress, 'b');
    expect(created).toEqual({});
    expect(progress.records.b).toBe(created);
  });
});

describe('the rules that change a record', () => {
  it('a hint adds one, up to three', () => {
    expect(hintPatch({})).toEqual({ hints: 1 });
    expect(hintPatch({ hints: 2 })).toEqual({ hints: 3 });
    expect(hintPatch({ hints: 3 })).toEqual({ hints: 3 });
  });

  it('the right prediction marks predictionCorrect; a wrong one only records the answer', () => {
    expect(predictionPatch(EXERCISE, 1)).toEqual({ prediction: 1, predictionCorrect: true });
    expect(predictionPatch(EXERCISE, 2)).toEqual({ prediction: 2 });
  });

  it('a wrong prediction after the right one does not clear it once applied', () => {
    const record = { prediction: 1, predictionCorrect: true };
    Object.assign(record, predictionPatch(EXERCISE, 0));
    expect(record).toEqual({ prediction: 0, predictionCorrect: true });
  });

  it('opening the solution marks it seen and assisted', () => {
    expect(revealSolutionPatch()).toEqual({ solutionSeen: true, assisted: true });
  });

  it('loading the solution replaces the draft and marks it assisted', () => {
    expect(loadSolutionPatch(EXERCISE)).toEqual({ draft: 'fn resuelto() {}', assisted: true });
  });

  it('restoring the starter replaces only the draft', () => {
    expect(restoreStarterPatch(EXERCISE)).toEqual({ draft: 'fn inicio() {}' });
  });

  it.each([
    ['again', '2026-10-07T12:00:00Z'],
    ['practice', '2026-10-09T12:00:00Z'],
    ['confident', '2026-10-13T12:00:00Z'],
  ] as const)('a self-assessment «%s» schedules the review on %s', (confidence, reviewAt) => {
    expect(selfAssessmentPatch(confidence, NOW)).toEqual({
      confidence,
      reviewedAt: NOW,
      reviewAt: Date.parse(reviewAt),
    });
  });

  it('a self-assessment keeps the order of the fields it writes', () => {
    expect(Object.keys(selfAssessmentPatch('again', NOW))).toEqual([
      'confidence',
      'reviewedAt',
      'reviewAt',
    ]);
  });

  it('an attempt adds one', () => {
    expect(attemptPatch({})).toEqual({ attempts: 1 });
    expect(attemptPatch({ attempts: 4 })).toEqual({ attempts: 5 });
  });

  it('a first approval sets solvedAt and a review in a day', () => {
    expect(passedRunPatch({}, NOW)).toEqual({
      solvedAt: NOW,
      reviewAt: Date.parse('2026-10-07T12:00:00Z'),
    });
  });

  it('a later approval keeps solvedAt and an existing review', () => {
    expect(passedRunPatch({ solvedAt: 100, reviewAt: 200 }, NOW)).toEqual({ solvedAt: 100 });
    expect(passedRunPatch({ solvedAt: 100 }, NOW)).toEqual({
      solvedAt: 100,
      reviewAt: Date.parse('2026-10-07T12:00:00Z'),
    });
  });
});
