import { isBlankText } from '../../../shared/lib/is-blank-text';
import { hasPassingEvidence } from './passing-evidence';

type HelpFlag = 'predictionCorrect' | 'assisted' | 'solutionSeen';
type TextField = 'draft' | 'reflection';

export interface LabRecord {
  draft?: string;
  reflection?: string;
  solvedAt?: number;
  predictionCorrect?: boolean;
  assisted?: boolean;
  solutionSeen?: boolean;
  result?: unknown;
  [field: string]: unknown;
}

const HELP_FLAGS: HelpFlag[] = ['predictionCorrect', 'assisted', 'solutionSeen'];
const TEXT_FIELDS: TextField[] = ['draft', 'reflection'];

interface ExpectedTest {
  id: string;
}

// Evidence is measured against the exercise's expected tests, not against the ones the
// result carries: a result with `tests: []` proves nothing.
function resultProves(record: LabRecord, expectedTests: readonly ExpectedTest[]): boolean {
  return hasPassingEvidence(record.result, expectedTests);
}

// Valid resolution date: only positive values count.
function isSolvedAt(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

// Merges an imported record with the local one without losing achievements (ADR 0003, point 5):
// help flags combine with OR, `solvedAt` keeps the oldest positive value, a result with
// evidence is not replaced by one without it, and blank texts do not overwrite.
// The remaining imported fields replace the local ones.
export function mergeRecord(
  local: LabRecord | undefined,
  incoming: LabRecord,
  expectedTests: readonly ExpectedTest[],
): LabRecord {
  const current = local ?? {};
  const merged: LabRecord = { ...current, ...incoming };
  for (const flag of HELP_FLAGS) merged[flag] = current[flag] === true || incoming[flag] === true;
  for (const field of TEXT_FIELDS) {
    if (isBlankText(incoming[field])) merged[field] = current[field];
  }
  const solvedTimes = [current.solvedAt, incoming.solvedAt].filter(isSolvedAt);
  if (solvedTimes.length > 0) merged.solvedAt = Math.min(...solvedTimes);
  else delete merged.solvedAt;
  if (resultProves(current, expectedTests) && !resultProves(incoming, expectedTests))
    merged.result = current.result;
  return merged;
}
