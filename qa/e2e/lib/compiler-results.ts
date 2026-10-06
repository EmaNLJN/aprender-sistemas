import type { Language } from './curriculum';

export interface ExerciseUnderTest {
  id: string;
  language: Language;
  testIds: readonly string[];
}

export const RUST_02: ExerciseUnderTest = {
  id: 'rust-02',
  language: 'rust',
  testIds: ['t1', 't2', 't3'],
};
export const GO_113: ExerciseUnderTest = {
  id: 'go-113',
  language: 'go',
  testIds: ['t1', 't2', 't3'],
};

export type CompilerKind = 'passed' | 'failedTest' | 'compileError' | 'transportError';

export type CompilerReply = { kind: 'json'; body: unknown } | { kind: 'abort' };

// Marker format of ADR 0003, point 7.
function markers(exercise: ExerciseUnderTest, failing: readonly string[]): string {
  return exercise.testIds
    .map((id) => `__TALLER_TEST__${id}:${failing.includes(id) ? 'FAIL' : 'PASS'}\n`)
    .join('');
}

function rustReply(success: boolean, stdout: string, stderr: string): CompilerReply {
  return {
    kind: 'json',
    body: { success, exitDetail: success ? '' : 'exit status: 101', stdout, stderr },
  };
}

function goReply(errors: string, stdout: string, status: number): CompilerReply {
  return {
    kind: 'json',
    body: {
      Errors: errors,
      Events: stdout ? [{ Message: stdout, Kind: 'stdout', Delay: 0 }] : null,
      Status: status,
      IsTest: false,
      TestsFailed: 0,
    },
  };
}

const COMPILE_ERROR = {
  rust: 'error[E0384]: cannot assign twice to immutable variable `nivel`\n',
  go: 'prog.go:12:2: declared and not used: x\n',
};

export function compilerReply(exercise: ExerciseUnderTest, kind: CompilerKind): CompilerReply {
  if (kind === 'transportError') return { kind: 'abort' };
  const failing = kind === 'failedTest' ? ['t2'] : [];
  if (exercise.language === 'rust') {
    if (kind === 'compileError') return rustReply(false, '', COMPILE_ERROR.rust);
    return rustReply(true, markers(exercise, failing), '');
  }
  if (kind === 'compileError') return goReply(COMPILE_ERROR.go, '', 2);
  return goReply('', markers(exercise, failing), 0);
}

export const PLAYGROUND_ENDPOINT: Record<Language, string> = {
  rust: 'https://play.rust-lang.org/execute',
  go: 'https://play.golang.org/compile',
};
