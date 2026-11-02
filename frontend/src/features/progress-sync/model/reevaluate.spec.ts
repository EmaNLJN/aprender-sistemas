import { describe, expect, it } from 'vitest';
import type { Operation } from './operations';
import { CONTENT_VERSION, progressContext } from './progress-context.fixture';
import { reevaluate } from './reevaluate';

const OLD = 'ffffffffffffffffffffffffffffffff';
const stamped = { id: 'op-1', at: '2026-10-05T12:00:00.000Z' };

describe('reevaluate', () => {
  it('sends again, with the published version, an answer that is right with that content', () => {
    const operation: Operation = {
      ...stamped,
      type: 'exercise.prediction',
      exerciseId: 'rust-01',
      answer: 2,
      correct: false,
      contentVersion: OLD,
    };
    expect(reevaluate(operation, progressContext)).toEqual({
      type: 'exercise.prediction',
      exerciseId: 'rust-01',
      answer: 2,
      correct: true,
      contentVersion: CONTENT_VERSION,
    });
  });

  it('drops a wrong answer and a quiz answer, which has no flag to earn', () => {
    const wrong: Operation = {
      ...stamped,
      type: 'checkpoint.answer',
      worldId: 'rust-world-1',
      answer: 0,
      passed: true,
      contentVersion: OLD,
    };
    const quiz: Operation = {
      ...stamped,
      type: 'route.quiz',
      stepId: 'rust-1-1',
      answer: 1,
      contentVersion: OLD,
    };
    expect([reevaluate(wrong, progressContext), reevaluate(quiz, progressContext)]).toEqual([
      null,
      null,
    ]);
  });
});
