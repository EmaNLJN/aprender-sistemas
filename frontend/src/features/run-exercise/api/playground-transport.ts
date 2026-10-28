import { buildProgram, readTestMarkers } from '../../../entities/exercise';
import {
  runCode as playgroundRunCode,
  type RunInput,
  type RunResult,
} from '../../../shared/api/playground';
import type { ExerciseTransport, ProgramBuilder, RunRequest, RunVerdict } from '../model/transport';

export type RunCode = (input: RunInput) => Promise<RunResult>;

export const buildPlaygroundProgram: ProgramBuilder = (exercise, draft, customTest) =>
  buildProgram(exercise, draft, customTest);

function verdictOf(request: RunRequest, result: RunResult): RunVerdict {
  if ('error' in result) return { kind: 'transport-failure', message: result.error };
  const markers = readTestMarkers(result.stdout);
  return {
    kind: 'executed',
    success: result.success,
    stdout: result.stdout,
    stderr: result.stderr,
    tests: new Map(request.exercise.tests.map((test) => [test.id, markers.get(test.id) === true])),
    customPassed: markers.get('custom') === true,
  };
}

export function createPlaygroundTransport(runCode: RunCode = playgroundRunCode): ExerciseTransport {
  return {
    countsLocalAttempts: true,
    async run(request) {
      const result = await runCode({
        language: request.exercise.language,
        code: buildPlaygroundProgram(request.exercise, request.draft, request.customTest),
        signal: request.signal,
      });
      return verdictOf(request, result);
    },
  };
}
