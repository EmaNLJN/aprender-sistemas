import { hasPassingEvidence } from './passing-evidence';

interface ExerciseTests {
  tests: readonly { id: string }[];
}

interface RunnerResult {
  success?: unknown;
  stdout?: unknown;
  stderr?: unknown;
  error?: unknown;
}

interface RunContext {
  code: string;
  customTest: string;
  now: number;
}

export interface RunOutcome {
  result: {
    code: string;
    success: boolean;
    stdout: string;
    stderr: string;
    transportError: boolean;
    tests: { id: string; passed: boolean }[];
    time: number;
    customTest: string;
    customPassed: boolean;
  };
  solved: boolean;
}

const MARKER_PATTERN = /^__TALLER_TEST__(\w+):(PASS|FAIL)\s*$/gm;

function readMarkers(stdout: string): Map<string, boolean> {
  const markers = new Map<string, boolean>();
  for (const match of stdout.matchAll(MARKER_PATTERN)) {
    const [, id, outcome] = match;
    markers.set(id, !markers.has(id) && outcome === 'PASS');
  }
  return markers;
}

export function interpretRun(
  exercise: ExerciseTests,
  runnerResult: RunnerResult,
  { code, customTest, now }: RunContext,
): RunOutcome {
  const markers = readMarkers(String(runnerResult.stdout || ''));
  const tests = exercise.tests.map((test) => ({
    id: test.id,
    passed: markers.get(test.id) === true,
  }));
  const result = {
    code,
    success: runnerResult.success === true,
    stdout: String(runnerResult.stdout || '').slice(0, 12000),
    stderr: String(runnerResult.stderr || runnerResult.error || '').slice(0, 18000),
    transportError: Boolean(runnerResult.error) && !runnerResult.success,
    tests,
    time: now,
    customTest,
    customPassed: markers.get('custom') === true,
  };
  return { result, solved: hasPassingEvidence(result, exercise.tests) };
}
