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

export function hintPatch(record: LabRecord): { hints: number } {
  const taken = typeof record.hints === 'number' ? record.hints : 0;
  return { hints: Math.min(HINT_LIMIT, taken + 1) };
}

export function predictionPatch(
  exercise: Pick<Exercise, 'prediction'>,
  answer: number,
): { prediction: number; predictionCorrect?: true } {
  return answer === exercise.prediction.answer
    ? { prediction: answer, predictionCorrect: true }
    : { prediction: answer };
}

export function revealSolutionPatch(): { solutionSeen: true; assisted: true } {
  return { solutionSeen: true, assisted: true };
}

export function loadSolutionPatch(exercise: Pick<Exercise, 'solution'>): {
  draft: string;
  assisted: true;
} {
  return { draft: exercise.solution, assisted: true };
}

export function restoreStarterPatch(exercise: Pick<Exercise, 'starter'>): { draft: string } {
  return { draft: exercise.starter };
}

export function selfAssessmentPatch(
  confidence: Confidence,
  now: number,
): { confidence: Confidence; reviewedAt: number; reviewAt: number } {
  return { confidence, reviewedAt: now, reviewAt: now + CONFIDENCE_DAYS[confidence] * DAY_MS };
}

export function attemptPatch(record: LabRecord): { attempts: number } {
  const attempts = typeof record.attempts === 'number' ? record.attempts : 0;
  return { attempts: attempts + 1 };
}

export function passedRunPatch(
  record: LabRecord,
  now: number,
): { solvedAt: number; reviewAt?: number } {
  const solvedAt = (record.solvedAt as number | undefined) || now;
  return record.reviewAt ? { solvedAt } : { solvedAt, reviewAt: now + DAY_MS };
}
