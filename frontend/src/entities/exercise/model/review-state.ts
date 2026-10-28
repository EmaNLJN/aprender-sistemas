import type { Diagnosis } from './diagnose';
import type { LabRecord } from './merge-record';
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

export const reviewStateOf: (
  exercise: ReviewedExercise,
  record: LabRecord,
  running: boolean,
) => ReviewState = () => {
  throw new Error('not implemented');
};
