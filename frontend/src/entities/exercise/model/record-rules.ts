import type { LabStateV1 } from './lab-state';
import type { LabRecord } from './merge-record';
import type { Exercise } from './types';

export const HINT_LIMIT = 3;
export const DAY_MS = 86400000;

export type Confidence = 'again' | 'practice' | 'confident';

export const CONFIDENCE_DAYS: Readonly<Record<Confidence, number>> = {
  again: 1,
  practice: 3,
  confident: 7,
};

export function ensureRecord(progress: LabStateV1, id: string): LabRecord {
  return progress.records[id] || (progress.records[id] = {});
}

export const hintPatch: (record: LabRecord) => { hints: number } = () => {
  throw new Error('not implemented');
};

export const predictionPatch: (
  exercise: Pick<Exercise, 'prediction'>,
  answer: number,
) => { prediction: number; predictionCorrect?: true } = () => {
  throw new Error('not implemented');
};

export const revealSolutionPatch: () => { solutionSeen: true; assisted: true } = () => {
  throw new Error('not implemented');
};

export const loadSolutionPatch: (exercise: Pick<Exercise, 'solution'>) => {
  draft: string;
  assisted: true;
} = () => {
  throw new Error('not implemented');
};

export const restoreStarterPatch: (exercise: Pick<Exercise, 'starter'>) => {
  draft: string;
} = () => {
  throw new Error('not implemented');
};

export const selfAssessmentPatch: (
  confidence: Confidence,
  now: number,
) => { confidence: Confidence; reviewedAt: number; reviewAt: number } = () => {
  throw new Error('not implemented');
};

export const attemptPatch: (record: LabRecord) => { attempts: number } = () => {
  throw new Error('not implemented');
};

export const passedRunPatch: (
  record: LabRecord,
  now: number,
) => { solvedAt: number; reviewAt?: number } = () => {
  throw new Error('not implemented');
};
