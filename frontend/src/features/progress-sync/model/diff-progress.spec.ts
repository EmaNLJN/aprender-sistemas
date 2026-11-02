import { describe, expect, it } from 'vitest';
import { diffCampaign, diffLab, diffRoute, diffSystems } from './diff-progress';
import {
  CONTENT_VERSION,
  STARTER_HASH,
  blankSnapshot,
  progressContext,
} from './progress-context.fixture';

const before = blankSnapshot();

describe('diffRoute', () => {
  it('marks, unmarks and favorites become route.mark operations', () => {
    const start = { ...before.route, completed: ['rust-1-1'] };
    const after = { ...start, completed: ['rust-1-2'], favorites: ['book'] };
    expect(diffRoute(start, after, progressContext)).toEqual([
      { type: 'route.mark', kind: 'step', itemKey: 'rust-1-2', marked: true },
      { type: 'route.mark', kind: 'step', itemKey: 'rust-1-1', marked: false },
      { type: 'route.mark', kind: 'favorite', itemKey: 'book', marked: true },
    ]);
  });

  it('sends the language, the allowed focus minutes, a quiz answer and a note', () => {
    const after = {
      ...before.route,
      language: 'go' as const,
      minutes: 45,
      quizAnswers: { 'rust-1-1': 2 },
      notes: {
        ...before.route.notes,
        go: { learned: 'Aprendí \uD800', next: '' },
      },
    };
    expect(diffRoute(before.route, after, progressContext)).toEqual([
      { type: 'preference.set', name: 'routeLanguage', value: 'go' },
      { type: 'preference.set', name: 'focusMinutes', value: 45 },
      {
        type: 'route.quiz',
        stepId: 'rust-1-1',
        answer: 2,
        contentVersion: CONTENT_VERSION,
      },
      {
        type: 'route.note',
        language: 'go',
        field: 'learned',
        body: 'Aprendí �',
      },
    ]);
  });

  it('does not send focus minutes the API rejects', () => {
    expect(diffRoute(before.route, { ...before.route, minutes: 30 }, progressContext)).toEqual([]);
  });
});

describe('diffLab', () => {
  it('turns the editable fields of a record into one operation each', () => {
    const after = {
      ...before.lab,
      selected: { rust: 'rust-01', go: null },
      records: {
        'rust-01': {
          prediction: 1,
          predictionCorrect: false,
          assisted: true,
          solutionSeen: false,
          hints: 2,
          reflection: 'Primera idea',
          customTest: 'assert_eq!(f(1), 2);',
          draft: 'fn a() {}',
          confidence: 'practice',
          reviewedAt: Date.UTC(2026, 9, 5, 11),
          reviewAt: Date.UTC(2026, 9, 6, 11),
        },
      },
    };
    expect(diffLab(before.lab, after, progressContext)).toEqual([
      { type: 'preference.set', name: 'labSelectedRust', value: 'rust-01' },
      {
        type: 'exercise.prediction',
        exerciseId: 'rust-01',
        answer: 1,
        correct: false,
        contentVersion: CONTENT_VERSION,
      },
      { type: 'exercise.assist', exerciseId: 'rust-01', assisted: true },
      { type: 'exercise.hints', exerciseId: 'rust-01', revealed: 2 },
      {
        type: 'exercise.reflection',
        exerciseId: 'rust-01',
        text: 'Primera idea',
      },
      {
        type: 'exercise.customTest',
        exerciseId: 'rust-01',
        text: 'assert_eq!(f(1), 2);',
      },
      {
        type: 'exercise.draft',
        exerciseId: 'rust-01',
        code: 'fn a() {}',
        starterHash: STARTER_HASH,
      },
      {
        type: 'exercise.review',
        exerciseId: 'rust-01',
        confidence: 'practice',
        reviewedAt: '2026-10-05T11:00:00.000Z',
        reviewDueAt: '2026-10-06T11:00:00.000Z',
      },
    ]);
  });

  it('sends the tombstone of «restaurar inicio» when the draft disappears', () => {
    const start = {
      ...before.lab,
      records: { 'rust-01': { draft: 'fn a() {}' } },
    };
    const after = { ...before.lab, records: { 'rust-01': {} } };
    expect(diffLab(start, after, progressContext)).toEqual([
      {
        type: 'exercise.draft',
        exerciseId: 'rust-01',
        code: null,
        starterHash: null,
      },
    ]);
  });

  it('never sends what only executions or the import write (FR-009)', () => {
    const after = {
      ...before.lab,
      records: {
        'rust-01': {
          solvedAt: 1_760_000_000_000,
          attempts: 3,
          result: { success: true },
        },
      },
    };
    expect(diffLab(before.lab, after, progressContext)).toEqual([]);
  });

  it('sends nothing for the empty record the lab keeps on display (D1c-9)', () => {
    const after = {
      ...before.lab,
      records: {
        'rust-02': {
          predictionCorrect: false,
          assisted: false,
          solutionSeen: false,
        },
      },
    };
    expect(diffLab(before.lab, after, progressContext)).toEqual([]);
  });

  it('waits for the three review fields before sending the group', () => {
    const after = {
      ...before.lab,
      records: { 'rust-01': { reviewAt: Date.UTC(2026, 9, 6) } },
    };
    expect(diffLab(before.lab, after, progressContext)).toEqual([]);
  });
});

describe('diffCampaign and diffSystems', () => {
  it('sends a checkpoint answer and never the seals', () => {
    const after = {
      ...before.campaign,
      seals: { 'rust-01': { code: true, prediction: true, assisted: false } },
      checkpoints: { 'rust-world-1': { passed: true, lastAnswer: 1 } },
    };
    expect(diffCampaign(before.campaign, after, progressContext)).toEqual([
      {
        type: 'checkpoint.answer',
        worldId: 'rust-world-1',
        answer: 1,
        passed: true,
        contentVersion: CONTENT_VERSION,
      },
    ]);
  });

  it('translates the step positions to step keys and skips a position with no step', () => {
    const start = {
      version: 1 as const,
      records: {
        'rust:ws-cache': {
          observed: [],
          code: false,
          predicted: false,
          answer: null,
          steps: [0],
          note: '',
        },
      },
    };
    const after = {
      version: 1 as const,
      records: {
        'rust:ws-cache': {
          observed: ['hit'],
          code: true,
          predicted: true,
          answer: 0,
          steps: [2, 9],
          note: 'Nota A',
        },
      },
    };
    expect(diffSystems(start, after, progressContext)).toEqual([
      {
        type: 'workshop.prediction',
        workshopId: 'ws-cache',
        language: 'rust',
        answer: 0,
        correct: true,
        contentVersion: CONTENT_VERSION,
      },
      {
        type: 'workshop.note',
        workshopId: 'ws-cache',
        language: 'rust',
        text: 'Nota A',
      },
      {
        type: 'workshop.objective',
        workshopId: 'ws-cache',
        language: 'rust',
        objectiveKey: 'hit',
      },
      {
        type: 'workshop.step',
        workshopId: 'ws-cache',
        language: 'rust',
        stepKey: 'e3',
        marked: true,
      },
      {
        type: 'workshop.step',
        workshopId: 'ws-cache',
        language: 'rust',
        stepKey: 'e1',
        marked: false,
      },
    ]);
  });
});
