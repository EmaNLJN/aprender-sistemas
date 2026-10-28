import { describe, expect, it } from 'vitest';
import type { RunInput, RunResult } from '../../../shared/api/playground';
import type { RunnableExercise } from '../model/transport';
import { buildPlaygroundProgram, createPlaygroundTransport } from './playground-transport';

const EXERCISE: RunnableExercise = {
  id: 'rust-01',
  language: 'rust',
  tests: [
    { id: 't1', expression: 'energia(3) == 21' },
    { id: 't2', expression: 'energia(0) == 0' },
  ],
  imports: [],
};

function transportReplying(result: RunResult) {
  const inputs: RunInput[] = [];
  const transport = createPlaygroundTransport(async (input) => {
    inputs.push(input);
    return result;
  });
  return { transport, inputs };
}

const signal = new AbortController().signal;
const ignoreProgress = () => undefined;

describe('createPlaygroundTransport', () => {
  it('counts local attempts, as the lab always did', () => {
    expect(
      createPlaygroundTransport(async () => ({ success: true }) as RunResult).countsLocalAttempts,
    ).toBe(true);
  });

  it('sends the program built with the custom test, in the language of the exercise, with the signal', async () => {
    const { transport, inputs } = transportReplying({
      success: true,
      stdout: '',
      stderr: '',
      exitDetail: '',
      service: 'Rust Playground',
    });
    await transport.run(
      { exercise: EXERCISE, draft: 'fn energia() {}', customTest: 'energia(1) == 7', signal },
      ignoreProgress,
    );
    expect(inputs).toEqual([
      {
        language: 'rust',
        code: buildPlaygroundProgram(EXERCISE, 'fn energia() {}', 'energia(1) == 7'),
        signal,
      },
    ]);
    expect(inputs[0].code).toContain(
      'std::panic::catch_unwind(|| { energia(1) == 7 }).unwrap_or(false);',
    );
    expect(inputs[0].code).toContain('println!("__TALLER_TEST__custom:{}"');
  });

  it('reads the markers into a verdict, without trimming the output', async () => {
    const stdout = '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:FAIL\n__TALLER_TEST__custom:PASS\n';
    const { transport } = transportReplying({
      success: true,
      stdout: stdout + 'x'.repeat(13000),
      stderr: 'warning',
      exitDetail: '',
      service: 'Rust Playground',
    });
    const verdict = await transport.run(
      { exercise: EXERCISE, draft: 'fn x() {}', customTest: '', signal },
      ignoreProgress,
    );
    expect(verdict).toEqual({
      kind: 'executed',
      success: true,
      stdout: stdout + 'x'.repeat(13000),
      stderr: 'warning',
      tests: new Map([
        ['t1', true],
        ['t2', false],
      ]),
      customPassed: true,
    });
  });

  it('a repeated marker does not pass, as interpretRun decides', async () => {
    const { transport } = transportReplying({
      success: true,
      stdout: '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:PASS\n',
      stderr: '',
      exitDetail: '',
      service: 'Rust Playground',
    });
    const verdict = await transport.run(
      { exercise: EXERCISE, draft: 'fn x() {}', customTest: '', signal },
      ignoreProgress,
    );
    expect(verdict.kind === 'executed' && [...verdict.tests]).toEqual([
      ['t1', false],
      ['t2', true],
    ]);
  });

  it('a Playground failure is a transport failure with its message', async () => {
    const { transport } = transportReplying({
      success: false,
      stdout: '',
      stderr: '',
      error: 'No se pudo conectar al Playground.',
      errorType: 'network',
    });
    const verdict = await transport.run(
      { exercise: EXERCISE, draft: 'fn x() {}', customTest: '', signal },
      ignoreProgress,
    );
    expect(verdict).toEqual({
      kind: 'transport-failure',
      message: 'No se pudo conectar al Playground.',
    });
  });

  it('never reports progress', async () => {
    const reported: unknown[] = [];
    const { transport } = transportReplying({
      success: true,
      stdout: '',
      stderr: '',
      exitDetail: '',
      service: 'Rust Playground',
    });
    await transport.run(
      { exercise: EXERCISE, draft: 'fn x() {}', customTest: '', signal },
      (progress) => void reported.push(progress),
    );
    expect(reported).toEqual([]);
  });
});
