import type { StoreApi } from 'zustand/vanilla';
import type { Exercise, LabStateV1 } from '../../../entities/exercise';
import type { RunState } from './run-state';
import type { ExerciseTransport } from './transport';

export const LOCKED_NOTICE = 'Completá los requisitos de esta misión en tu campaña.';
export const EMPTY_DRAFT_NOTICE = 'Escribí una solución o restaurá el inicio.';
export const CANCELLED_NOTICE = 'Ejecución cancelada. Tu código sigue guardado.';
export const FIRST_SOLVE_NOTICE =
  '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.';
export const SOLVED_AGAIN_NOTICE = 'Estos casos siguen funcionando. Probá una variante.';
export const TRANSPORT_FALLBACK = 'No se pudo conectar al compilador.';

export interface RunnerStore {
  getProgress(): LabStateV1;
  save(): boolean;
}

export interface ExerciseRunnerDependencies<Progress = never> {
  store: RunnerStore;
  transport: ExerciseTransport<Progress>;
  now: () => number;
  notify: (message: string) => void;
  isLocked: (exercise: Exercise) => boolean;
  isCampaignMission: (exercise: Exercise) => boolean;
  syncSystems: () => void;
  syncCampaign: () => { xpGained?: number } | undefined;
  logError: (error: unknown) => void;
}

export interface ExerciseRunner<Progress = never> {
  readonly state: StoreApi<RunState<Progress>>;
  run(exercise: Exercise): Promise<void>;
  cancel(): void;
  abort(): void;
}

export const createExerciseRunner: <Progress = never>(
  dependencies: ExerciseRunnerDependencies<Progress>,
) => ExerciseRunner<Progress> = () => {
  throw new Error('not implemented');
};
