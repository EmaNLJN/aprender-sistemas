export interface IdleRun {
  readonly status: 'idle';
}

export interface ActiveRun<Progress> {
  readonly status: 'running';
  readonly exerciseId: string;
  readonly progress: Progress | null;
}

export type RunState<Progress = never> = IdleRun | ActiveRun<Progress>;

export const IDLE_RUN: IdleRun = Object.freeze({ status: 'idle' });
