import type { RunInput, RunResult } from '../../../shared/api/playground';
import type { ExerciseTransport, ProgramBuilder } from '../model/transport';

export type RunCode = (input: RunInput) => Promise<RunResult>;

export const buildPlaygroundProgram: ProgramBuilder = () => {
  throw new Error('not implemented');
};

export const createPlaygroundTransport: (runCode?: RunCode) => ExerciseTransport = () => {
  throw new Error('not implemented');
};
