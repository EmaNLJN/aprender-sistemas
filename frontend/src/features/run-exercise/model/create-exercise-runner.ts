import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  attemptPatch,
  draftOf,
  ensureRecord,
  hasPassingEvidence,
  normalizeCustomTest,
  passedRunPatch,
  syncAfterRun,
  type Exercise,
  type LabResultV1,
  type LabStateV1,
} from '../../../entities/exercise';
import { buildRunResult } from './build-run-result';
import { IDLE_RUN, type RunState } from './run-state';
import type { ExerciseTransport, RunVerdict } from './transport';

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

interface ActiveExecution {
  readonly controller: AbortController;
}

function isAbortError(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'AbortError';
}

function thrownMessage(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message !== '' ? message : TRANSPORT_FALLBACK;
}

export function createExerciseRunner<Progress = never>(
  dependencies: ExerciseRunnerDependencies<Progress>,
): ExerciseRunner<Progress> {
  const state = createStore<RunState<Progress>>(() => IDLE_RUN);
  let active: ActiveExecution | null = null;

  function becomeIdle(): void {
    if (state.getState() !== IDLE_RUN) state.setState(IDLE_RUN, true);
  }

  function stop(): void {
    active?.controller.abort();
    active = null;
    becomeIdle();
  }

  function finish(execution: ActiveExecution): void {
    if (active !== execution) return;
    active = null;
    becomeIdle();
  }

  function saveResult(exercise: Exercise, result: LabResultV1): boolean {
    const record = ensureRecord(dependencies.store.getProgress(), exercise.id);
    record.result = result;
    const solved = hasPassingEvidence(result, exercise.tests);
    if (solved) {
      const first = !record.solvedAt;
      Object.assign(record, passedRunPatch(record, result.time));
      dependencies.notify(first ? FIRST_SOLVE_NOTICE : SOLVED_AGAIN_NOTICE);
    }
    dependencies.store.save();
    return solved;
  }

  function syncDerivedProgress(exercise: Exercise): void {
    syncAfterRun({
      syncSystems: dependencies.syncSystems,
      syncCampaign: dependencies.syncCampaign,
      isCampaignMission: () => dependencies.isCampaignMission(exercise),
      notify: dependencies.notify,
      logError: dependencies.logError,
    });
  }

  async function execute(
    exercise: Exercise,
    draft: string,
    customTest: string,
    execution: ActiveExecution,
  ): Promise<void> {
    let verdict: RunVerdict;
    try {
      verdict = await dependencies.transport.run(
        { exercise, draft, customTest, signal: execution.controller.signal },
        (progress) => {
          if (active !== execution) return;
          state.setState({ status: 'running', exerciseId: exercise.id, progress }, true);
        },
      );
    } catch (error) {
      if (active !== execution || isAbortError(error)) return;
      const failure: RunVerdict = { kind: 'transport-failure', message: thrownMessage(error) };
      saveResult(
        exercise,
        buildRunResult(exercise, failure, { code: draft, customTest, now: dependencies.now() }),
      );
      return;
    }
    if (active !== execution) return;
    saveResult(
      exercise,
      buildRunResult(exercise, verdict, { code: draft, customTest, now: dependencies.now() }),
    );
    syncDerivedProgress(exercise);
  }

  async function run(exercise: Exercise): Promise<void> {
    if (active) return;
    if (dependencies.isLocked(exercise)) {
      dependencies.notify(LOCKED_NOTICE);
      return;
    }
    const record = ensureRecord(dependencies.store.getProgress(), exercise.id);
    const draft = draftOf(exercise, record);
    const customTest = normalizeCustomTest(record.customTest);
    if (!draft.trim()) {
      dependencies.notify(EMPTY_DRAFT_NOTICE);
      return;
    }
    if (dependencies.transport.countsLocalAttempts) {
      Object.assign(record, attemptPatch(record));
      dependencies.store.save();
    }
    const execution: ActiveExecution = { controller: new AbortController() };
    active = execution;
    state.setState({ status: 'running', exerciseId: exercise.id, progress: null }, true);
    try {
      await execute(exercise, draft, customTest, execution);
    } finally {
      finish(execution);
    }
  }

  function cancel(): void {
    stop();
    dependencies.notify(CANCELLED_NOTICE);
  }

  return { state, run, cancel, abort: stop };
}
