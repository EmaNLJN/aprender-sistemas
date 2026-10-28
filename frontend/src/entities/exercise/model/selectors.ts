import type { LevelId } from '../../../shared/config/levels';
import type { LabTestOutcome } from './lab-result';
import type { LabRecord } from './merge-record';
import type { Exercise } from './types';

interface ExpectedTests {
  tests: readonly { id: string }[];
}

export const levelOf: (exercise: Pick<Exercise, 'level' | 'stage'>) => LevelId = () => {
  throw new Error('not implemented');
};

export const isSolved: (record: LabRecord | undefined) => boolean = () => {
  throw new Error('not implemented');
};

export const isDueForReview: (record: LabRecord | undefined, now: number) => boolean = () => {
  throw new Error('not implemented');
};

export const practicePointsOf: (record: LabRecord | undefined) => number = () => {
  throw new Error('not implemented');
};

export const draftOf: (exercise: Pick<Exercise, 'starter'>, record: LabRecord) => string = () => {
  throw new Error('not implemented');
};

export const normalizeCustomTest: (raw: unknown) => string = () => {
  throw new Error('not implemented');
};

export const isResultCurrent: (
  exercise: Pick<Exercise, 'starter'>,
  record: LabRecord,
) => boolean = () => {
  throw new Error('not implemented');
};

export const isReviewComplete: (
  exercise: ExpectedTests,
  result: { success: boolean; tests: readonly LabTestOutcome[] },
) => boolean = () => {
  throw new Error('not implemented');
};

export const isReflectionSolved: (
  exercise: ExpectedTests & Pick<Exercise, 'starter'>,
  record: LabRecord,
) => boolean = () => {
  throw new Error('not implemented');
};
