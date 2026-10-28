import type { LabResultV1 } from '../../../entities/exercise';
import type { RunVerdict } from './transport';

const STDOUT_LIMIT = 12000;
const STDERR_LIMIT = 18000;

export interface RunContext {
  code: string;
  customTest: string;
  now: number;
}

export function buildRunResult(
  exercise: { readonly tests: readonly { readonly id: string }[] },
  verdict: RunVerdict,
  context: RunContext,
): LabResultV1 {
  const executed = verdict.kind === 'executed';
  const result: LabResultV1 = {
    code: context.code,
    success: executed && verdict.success,
    stdout: executed ? verdict.stdout.slice(0, STDOUT_LIMIT) : '',
    stderr: (executed ? verdict.stderr : verdict.message).slice(0, STDERR_LIMIT),
    transportError: !executed,
    tests: exercise.tests.map((test) => ({
      id: test.id,
      passed: executed && verdict.tests.get(test.id) === true,
    })),
    time: context.now,
    customTest: context.customTest,
    customPassed: executed && verdict.customPassed,
  };
  if (verdict.attemptId !== undefined) result.attemptId = verdict.attemptId;
  return result;
}
