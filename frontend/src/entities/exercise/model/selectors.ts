import { LEVEL_IDS, type LevelId } from '../../../shared/config/levels';
import type { LabTestOutcome } from './lab-result';
import type { LabRecord } from './merge-record';
import type { Exercise } from './types';

const SOLVED_POINTS = 20;
const PREDICTION_POINTS = 5;
const REFLECTION_POINTS = 5;
const REFLECTION_MINIMUM = 40;

interface ExpectedTests {
  tests: readonly { id: string }[];
}

interface StoredResult {
  code?: unknown;
  success?: unknown;
  customTest?: unknown;
  tests?: readonly LabTestOutcome[];
}

export function levelOf(exercise: Pick<Exercise, 'level' | 'stage'>): LevelId {
  if (exercise.level !== undefined && LEVEL_IDS.includes(exercise.level)) return exercise.level;
  if (exercise.stage <= 4) return 'beginner';
  if (exercise.stage <= 8) return 'medium';
  if (exercise.stage <= 12) return 'advanced';
  return 'expert';
}

export function isSolved(record: LabRecord | undefined): boolean {
  return Boolean(record?.solvedAt);
}

export function isDueForReview(record: LabRecord | undefined, now: number): boolean {
  const reviewAt = record?.reviewAt as number | undefined;
  return Boolean(reviewAt) && (reviewAt as number) <= now;
}

export function practicePointsOf(record: LabRecord | undefined): number {
  if (!record) return 0;
  const reflection = typeof record.reflection === 'string' ? record.reflection.trim() : '';
  return (
    (record.solvedAt ? SOLVED_POINTS : 0) +
    (record.predictionCorrect ? PREDICTION_POINTS : 0) +
    (reflection.length >= REFLECTION_MINIMUM ? REFLECTION_POINTS : 0)
  );
}

export function draftOf(exercise: Pick<Exercise, 'starter'>, record: LabRecord): string {
  return record.draft ?? exercise.starter;
}

export function normalizeCustomTest(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

export function isResultCurrent(exercise: Pick<Exercise, 'starter'>, record: LabRecord): boolean {
  const result = record.result as StoredResult | undefined;
  if (!result) return false;
  return (
    result.code === draftOf(exercise, record) &&
    (result.customTest || '') === normalizeCustomTest(record.customTest)
  );
}

export function isReviewComplete(
  exercise: ExpectedTests,
  result: { success: boolean; tests: readonly LabTestOutcome[] },
): boolean {
  const passed = result.tests.filter((test) => test.passed).length;
  return passed === exercise.tests.length && result.success;
}

export function isReflectionSolved(
  exercise: ExpectedTests & Pick<Exercise, 'starter'>,
  record: LabRecord,
): boolean {
  const result = record.result as StoredResult | undefined;
  if (!result?.success || !isResultCurrent(exercise, record)) return false;
  const outcomes = result.tests ?? [];
  return exercise.tests.every((test) =>
    outcomes.some((outcome) => outcome.id === test.id && outcome.passed),
  );
}
