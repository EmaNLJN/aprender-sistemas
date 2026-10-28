import {
  isDueForReview,
  isSolved,
  levelOf,
  type Exercise,
  type LabRecord,
} from '../../../entities/exercise';
import type { LevelId } from '../../../shared/config/levels';
import { normalizeSearchText } from '../../../shared/lib/normalize-search-text';

export type LevelFilter = LevelId | 'all';

export interface MapFilters {
  query: string;
  dueOnly: boolean;
  extraOnly: boolean;
  level: LevelFilter;
}

export type LabRecords = Readonly<Record<string, LabRecord>>;

const EXTRA_FIRST_STAGE = 16;
const EXTRA_LAST_STAGE = 20;

export function isExtraChallenge(exercise: Pick<Exercise, 'stage'>): boolean {
  return exercise.stage >= EXTRA_FIRST_STAGE && exercise.stage <= EXTRA_LAST_STAGE;
}

function matchesLevelAndExtras(
  exercise: Exercise,
  filters: Pick<MapFilters, 'level' | 'extraOnly'>,
): boolean {
  if (filters.extraOnly && !isExtraChallenge(exercise)) return false;
  return filters.level === 'all' || levelOf(exercise) === filters.level;
}

function matchesQuery(exercise: Exercise, query: string): boolean {
  if (!query) return true;
  const text = [exercise.title, exercise.topic, exercise.intro, exercise.why].join(' ');
  return normalizeSearchText(text).includes(normalizeSearchText(query));
}

export function matchesMapFilters(
  exercise: Exercise,
  records: LabRecords,
  filters: MapFilters,
  now: number,
): boolean {
  if (filters.dueOnly && !isDueForReview(records[exercise.id], now)) return false;
  return matchesLevelAndExtras(exercise, filters) && matchesQuery(exercise, filters.query);
}

export function todayChallenge(
  exercises: readonly Exercise[],
  records: LabRecords,
  filters: Pick<MapFilters, 'level' | 'extraOnly'>,
  now: number,
): Exercise | undefined {
  const candidates = exercises.filter((exercise) => matchesLevelAndExtras(exercise, filters));
  return (
    candidates.find((exercise) => !isSolved(records[exercise.id])) ||
    candidates.find((exercise) => isDueForReview(records[exercise.id], now)) ||
    candidates[0] ||
    exercises[0]
  );
}

export function surprisePool(
  exercises: readonly Exercise[],
  records: LabRecords,
  filters: MapFilters,
  now: number,
): Exercise[] {
  const candidates = exercises.filter((exercise) =>
    matchesMapFilters(exercise, records, filters, now),
  );
  const pending = candidates.filter(
    (exercise) => isDueForReview(records[exercise.id], now) || !isSolved(records[exercise.id]),
  );
  return pending.length ? pending : candidates;
}
