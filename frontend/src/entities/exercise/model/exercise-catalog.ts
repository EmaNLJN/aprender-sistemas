import type { Exercise } from './types';

export interface ExerciseGroups {
  rustLab: readonly Exercise[];
  rustQuests: readonly Exercise[];
  goLab: readonly Exercise[];
  goQuests: readonly Exercise[];
  systemsLowlevel: readonly Exercise[];
  systemsInfra: readonly Exercise[];
  systemsPlay: readonly Exercise[];
  systemsPc: readonly Exercise[];
}

export interface ExerciseCatalog {
  readonly exercises: readonly Exercise[];
  readonly byId: ReadonlyMap<string, Exercise>;
}

export interface ExerciseCatalogHolder extends ExerciseCatalog {
  init(groups: ExerciseGroups): void;
}

export function createExerciseCatalog(groups: ExerciseGroups): ExerciseCatalog {
  throw new Error('not implemented');
}

export function createExerciseCatalogHolder(): ExerciseCatalogHolder {
  throw new Error('not implemented');
}

export const exerciseCatalog: ExerciseCatalogHolder = {
  get exercises(): readonly Exercise[] {
    throw new Error('not implemented');
  },
  get byId(): ReadonlyMap<string, Exercise> {
    throw new Error('not implemented');
  },
  init() {
    throw new Error('not implemented');
  },
};
