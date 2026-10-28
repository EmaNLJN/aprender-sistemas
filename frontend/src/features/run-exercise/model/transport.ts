import type { ExerciseLanguage } from '../../../entities/exercise';

export interface RunnableExercise {
  readonly id: string;
  readonly language: ExerciseLanguage;
  readonly tests: readonly { readonly id: string; readonly expression: string }[];
  readonly imports?: readonly string[];
}

export interface RunRequest {
  readonly exercise: RunnableExercise;
  readonly draft: string;
  readonly customTest: string;
  readonly signal: AbortSignal;
}

export interface ExecutedVerdict {
  readonly kind: 'executed';
  readonly success: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly tests: ReadonlyMap<string, boolean>;
  readonly customPassed: boolean;
  readonly attemptId?: number;
}

export interface TransportFailureVerdict {
  readonly kind: 'transport-failure';
  readonly message: string;
  readonly attemptId?: number;
}

export type RunVerdict = ExecutedVerdict | TransportFailureVerdict;

export type ReportProgress<Progress> = (progress: Progress) => void;

export interface ExerciseTransport<Progress = never> {
  readonly countsLocalAttempts: boolean;
  run(request: RunRequest, report: ReportProgress<Progress>): Promise<RunVerdict>;
}

export type ProgramBuilder = (
  exercise: RunnableExercise,
  draft: string,
  customTest: string,
) => string;
