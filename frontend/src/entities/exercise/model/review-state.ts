import { diagnose, type Diagnosis } from './diagnose';
import type { LabResultV1 } from './lab-result';
import type { LabRecord } from './merge-record';
import { isResultCurrent, isReviewComplete } from './selectors';
import type { Exercise } from './types';

export type ReviewState =
  | { kind: 'running' }
  | { kind: 'unrun' }
  | { kind: 'stale' }
  | { kind: 'transport-failure'; message: string }
  | { kind: 'passed'; passedCount: number }
  | { kind: 'partial'; passedCount: number; failure: string }
  | { kind: 'error'; diagnosis: Diagnosis };

type ReviewedExercise = Pick<Exercise, 'language' | 'starter' | 'tests' | 'review'>;

function firstFailure(exercise: ReviewedExercise, result: LabResultV1): string {
  const failing = exercise.tests.find(
    (test) => !result.tests.find((outcome) => outcome.id === test.id)?.passed,
  );
  return failing?.failure || exercise.review.pitfall;
}

function finishedState(exercise: ReviewedExercise, result: LabResultV1): ReviewState {
  const passedCount = result.tests.filter((test) => test.passed).length;
  if (isReviewComplete(exercise, result)) return { kind: 'passed', passedCount };
  if (result.success)
    return { kind: 'partial', passedCount, failure: firstFailure(exercise, result) };
  return { kind: 'error', diagnosis: diagnose(result.stderr, exercise.language) };
}

export function reviewStateOf(
  exercise: ReviewedExercise,
  record: LabRecord,
  running: boolean,
): ReviewState {
  if (running) return { kind: 'running' };
  const result = record.result as LabResultV1 | undefined;
  if (!result) return { kind: 'unrun' };
  if (!isResultCurrent(exercise, record)) return { kind: 'stale' };
  if (result.transportError) return { kind: 'transport-failure', message: result.stderr };
  return finishedState(exercise, result);
}
