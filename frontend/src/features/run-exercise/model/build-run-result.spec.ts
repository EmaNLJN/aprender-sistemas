import { describe, expect, it } from 'vitest';
import { interpretRun } from '../../../entities/exercise';
import { buildRunResult } from './build-run-result';
import type { RunVerdict } from './transport';

const EXERCISE = { tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }] };
const CONTEXT = { code: 'fn energia() {}', customTest: 'energia(1) == 7', now: 1700 };

describe('buildRunResult', () => {
  it('builds the v1 result of an executed run, in the stored key order', () => {
    const verdict: RunVerdict = {
      kind: 'executed',
      success: true,
      stdout: 'out',
      stderr: 'err',
      tests: new Map([
        ['t1', true],
        ['t3', true],
        ['extra', true],
      ]),
      customPassed: true,
    };
    const result = buildRunResult(EXERCISE, verdict, CONTEXT);
    expect(Object.keys(result)).toEqual([
      'code',
      'success',
      'stdout',
      'stderr',
      'transportError',
      'tests',
      'time',
      'customTest',
      'customPassed',
    ]);
    expect(result).toEqual({
      code: 'fn energia() {}',
      success: true,
      stdout: 'out',
      stderr: 'err',
      transportError: false,
      tests: [
        { id: 't1', passed: true },
        { id: 't2', passed: false },
        { id: 't3', passed: true },
      ],
      time: 1700,
      customTest: 'energia(1) == 7',
      customPassed: true,
    });
  });

  it('trims the output once, to 12 000 and 18 000 characters', () => {
    const verdict: RunVerdict = {
      kind: 'executed',
      success: false,
      stdout: 'a'.repeat(12001),
      stderr: 'b'.repeat(18001),
      tests: new Map(),
      customPassed: false,
    };
    const result = buildRunResult(EXERCISE, verdict, CONTEXT);
    expect(result.stdout).toHaveLength(12000);
    expect(result.stderr).toHaveLength(18000);
  });

  it('builds a transport failure that neither approves nor fails a test', () => {
    const verdict: RunVerdict = { kind: 'transport-failure', message: 'Sin red.', attemptId: 9 };
    expect(buildRunResult(EXERCISE, verdict, CONTEXT)).toEqual({
      code: 'fn energia() {}',
      success: false,
      stdout: '',
      stderr: 'Sin red.',
      transportError: true,
      tests: [
        { id: 't1', passed: false },
        { id: 't2', passed: false },
        { id: 't3', passed: false },
      ],
      time: 1700,
      customTest: 'energia(1) == 7',
      customPassed: false,
      attemptId: 9,
    });
  });

  it('gives, for the four results of F1, the same result as interpretRun did', () => {
    const markers = '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:FAIL\n__TALLER_TEST__t3:PASS\n';
    const cases: { runner: Record<string, unknown>; verdict: RunVerdict }[] = [
      {
        runner: { success: true, stdout: markers, stderr: '' },
        verdict: {
          kind: 'executed',
          success: true,
          stdout: markers,
          stderr: '',
          tests: new Map([
            ['t1', true],
            ['t2', false],
            ['t3', true],
          ]),
          customPassed: false,
        },
      },
      {
        runner: { success: false, stdout: '', stderr: 'error[E0384]' },
        verdict: {
          kind: 'executed',
          success: false,
          stdout: '',
          stderr: 'error[E0384]',
          tests: new Map(),
          customPassed: false,
        },
      },
      {
        runner: { success: false, stdout: '', stderr: '', error: 'Sin red.' },
        verdict: { kind: 'transport-failure', message: 'Sin red.' },
      },
    ];
    for (const { runner, verdict } of cases)
      expect(buildRunResult(EXERCISE, verdict, CONTEXT)).toEqual(
        interpretRun(EXERCISE, runner, CONTEXT).result,
      );
  });
});
