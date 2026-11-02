import { describe, expect, it } from 'vitest';
import { applyRows, pendingClocks } from './apply-rows';
import type { Operation } from './operations';
import { blankSnapshot, progressContext } from './progress-context.fixture';
import { areasWith, exerciseRowFactory } from './server-rows.factory';

const T1 = '2026-10-05T12:00:00.000Z';
const T2 = '2026-10-05T12:00:01.000Z';
const nothingPending = pendingClocks([]);

describe('applyRows', () => {
  it('writes an exercise row into the lab record, with dates in milliseconds', () => {
    const areas = areasWith({
      exercises: [
        exerciseRowFactory.build({
          prediction: { answer: 2, at: T1 },
          predictionCorrect: { value: true, at: T1 },
          hintsRevealed: 3,
          reflection: { text: 'Segunda idea', at: T1 },
          review: {
            confidence: 'confident',
            reviewedAt: T1,
            reviewDueAt: T2,
            at: T1,
          },
          solvedAt: T1,
        }),
      ],
      drafts: [
        {
          exerciseId: 'rust-01',
          code: 'fn b() {}',
          starterHash: null,
          at: T1,
          revision: 1,
        },
      ],
    });
    const next = applyRows(blankSnapshot(), areas, nothingPending, progressContext);
    expect(next.lab.records['rust-01']).toEqual({
      predictionCorrect: true,
      assisted: false,
      solutionSeen: false,
      prediction: 2,
      hints: 3,
      reflection: 'Segunda idea',
      confidence: 'confident',
      reviewedAt: Date.parse(T1),
      reviewAt: Date.parse(T2),
      solvedAt: Date.parse(T1),
      draft: 'fn b() {}',
    });
  });

  it('keeps a pending local change unless the row is newer (merge-rules.md §3)', () => {
    const snapshot = blankSnapshot();
    snapshot.lab.records['rust-01'] = { reflection: 'local' };
    const pending = (at: string): Operation[] => [
      {
        id: 'a',
        at,
        type: 'exercise.reflection',
        exerciseId: 'rust-01',
        text: 'local',
      },
    ];
    const areas = areasWith({
      exercises: [exerciseRowFactory.build({ reflection: { text: 'remota', at: T1 } })],
    });
    const kept = applyRows(snapshot, areas, pendingClocks(pending(T2)), progressContext);
    const replaced = applyRows(
      snapshot,
      areas,
      pendingClocks(pending('2026-10-05T11:59:59.000Z')),
      progressContext,
    );
    expect(kept.lab.records['rust-01'].reflection).toBe('local');
    expect(replaced.lab.records['rust-01'].reflection).toBe('remota');
  });

  it('deletes nothing for an absent row, so an empty photo keeps the local state (FR-011)', () => {
    const snapshot = blankSnapshot();
    snapshot.route.completed = ['rust-1-1'];
    snapshot.lab.records['rust-01'] = {
      reflection: 'mía',
      result: { success: true },
    };
    expect(applyRows(snapshot, areasWith({}), nothingPending, progressContext)).toEqual(snapshot);
  });

  it('removes a mark on a tombstone and adds it on a newer mark', () => {
    const snapshot = blankSnapshot();
    snapshot.route.completed = ['rust-1-1'];
    const areas = areasWith({
      route: {
        marks: [
          {
            kind: 'step',
            itemKey: 'rust-1-1',
            marked: false,
            at: T1,
            revision: 2,
          },
          {
            kind: 'favorite',
            itemKey: 'book',
            marked: true,
            at: T1,
            revision: 2,
          },
        ],
        quiz: [{ stepId: 'rust-1-2', answer: 1, at: T1, revision: 2 }],
        notes: [
          {
            language: 'go',
            field: 'next',
            body: 'Seguir',
            at: T1,
            revision: 2,
          },
        ],
      },
    });
    const next = applyRows(snapshot, areas, nothingPending, progressContext);
    expect(next.route.completed).toEqual([]);
    expect(next.route.favorites).toEqual(['book']);
    expect(next.route.quizAnswers).toEqual({ 'rust-1-2': 1 });
    expect(next.route.notes.go.next).toBe('Seguir');
  });

  it('skips rows the published content does not know (risk 7 of A3)', () => {
    const areas = areasWith({
      exercises: [
        exerciseRowFactory.build({
          exerciseId: 'rust-999',
          reflection: { text: 'x', at: T1 },
        }),
      ],
      route: {
        marks: [
          {
            kind: 'step',
            itemKey: 'retired',
            marked: true,
            at: T1,
            revision: 1,
          },
        ],
        quiz: [],
        notes: [],
      },
      workshops: {
        progress: [],
        objectives: [],
        steps: [
          {
            workshopId: 'ws-cache',
            language: 'rust',
            stepKey: 'e9',
            marked: true,
            at: T1,
            revision: 1,
          },
        ],
      },
    });
    expect(applyRows(blankSnapshot(), areas, nothingPending, progressContext)).toEqual(
      blankSnapshot(),
    );
  });

  it('turns step keys into positions and combines the only-growing workshop flags', () => {
    const areas = areasWith({
      workshops: {
        progress: [
          {
            workshopId: 'ws-cache',
            language: 'rust',
            codeSealed: true,
            predictionCorrect: { value: true, at: null },
            answer: { value: 0, at: T1 },
            note: { text: 'Nota B', at: T1 },
            revision: 3,
          },
        ],
        objectives: [
          {
            workshopId: 'ws-cache',
            language: 'rust',
            objectiveKey: 'miss',
            observedAt: T1,
            revision: 3,
          },
        ],
        steps: [
          {
            workshopId: 'ws-cache',
            language: 'rust',
            stepKey: 'e2',
            marked: true,
            at: T1,
            revision: 3,
          },
        ],
      },
    });
    const next = applyRows(blankSnapshot(), areas, nothingPending, progressContext);
    expect(next.systems.records['rust:ws-cache']).toEqual({
      observed: ['miss'],
      code: true,
      predicted: true,
      answer: 0,
      steps: [1],
      note: 'Nota B',
    });
  });

  it('applies the preferences and the checkpoints, with OR on passed', () => {
    const snapshot = blankSnapshot();
    snapshot.campaign.checkpoints['rust-world-1'] = {
      passed: true,
      lastAnswer: 2,
    };
    const areas = areasWith({
      campaign: {
        seals: [
          {
            exerciseId: 'rust-02',
            code: false,
            prediction: true,
            assisted: false,
            revision: 1,
          },
        ],
        checkpoints: [
          {
            worldId: 'rust-world-1',
            passed: false,
            passedAt: null,
            lastAnswer: { value: 0, at: T1 },
            revision: 1,
          },
        ],
      },
      preferences: {
        routeLanguage: { value: 'go', at: T1 },
        focusMinutes: { value: 15, at: T1 },
        labSelected: { rust: { value: 'rust-02', at: T1 }, go: null },
        revision: 1,
      },
    });
    const next = applyRows(snapshot, areas, nothingPending, progressContext);
    expect(next.campaign.checkpoints['rust-world-1']).toEqual({
      passed: true,
      lastAnswer: 0,
    });
    expect(next.campaign.seals['rust-02']).toEqual({
      code: false,
      prediction: true,
      assisted: false,
    });
    expect([next.route.language, next.route.minutes, next.lab.selected.rust]).toEqual([
      'go',
      15,
      'rust-02',
    ]);
  });
});
