import type { Exercise, LabRecord } from '../../../entities/exercise';
import type { LevelId } from '../../../shared/config/levels';

export type LevelFilter = LevelId | 'all';

export interface MapFilters {
  query: string;
  dueOnly: boolean;
  extraOnly: boolean;
  level: LevelFilter;
}

export type LabRecords = Readonly<Record<string, LabRecord>>;

const notImplemented = (): never => {
  throw new Error('not implemented');
};

export const isExtraChallenge: (exercise: Pick<Exercise, 'stage'>) => boolean = notImplemented;
export const matchesMapFilters: (
  exercise: Exercise,
  records: LabRecords,
  filters: MapFilters,
  now: number,
) => boolean = notImplemented;
export const todayChallenge: (
  exercises: readonly Exercise[],
  records: LabRecords,
  filters: Pick<MapFilters, 'level' | 'extraOnly'>,
  now: number,
) => Exercise | undefined = notImplemented;
export const surprisePool: (
  exercises: readonly Exercise[],
  records: LabRecords,
  filters: MapFilters,
  now: number,
) => Exercise[] = notImplemented;
