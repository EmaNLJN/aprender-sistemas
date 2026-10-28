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
  const exercises = [
    ...groups.rustLab,
    ...groups.rustQuests,
    ...groups.goLab,
    ...groups.goQuests,
    ...groups.systemsLowlevel,
    ...groups.systemsInfra,
    ...groups.systemsPlay,
    ...groups.systemsPc,
  ];
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return { exercises, byId };
}

export function createExerciseCatalogHolder(): ExerciseCatalogHolder {
  let catalog: ExerciseCatalog | null = null;

  function initialized(): ExerciseCatalog {
    if (!catalog) throw new Error('Inicializá el catálogo de ejercicios antes de usarlo.');
    return catalog;
  }

  return {
    get exercises() {
      return initialized().exercises;
    },
    get byId() {
      return initialized().byId;
    },
    init(groups) {
      if (catalog) throw new Error('El catálogo de ejercicios ya está inicializado.');
      catalog = createExerciseCatalog(groups);
    },
  };
}

export const exerciseCatalog = createExerciseCatalogHolder();
