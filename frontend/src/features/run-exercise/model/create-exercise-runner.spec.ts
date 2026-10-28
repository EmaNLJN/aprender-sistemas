import { describe, expect, it } from 'vitest';
import type { Exercise, LabResultV1, LabStateV1 } from '../../../entities/exercise';
import { createExerciseRunner, type ExerciseRunnerDependencies } from './create-exercise-runner';
import type { ExerciseTransport, RunRequest, RunVerdict } from './transport';

const NOW = Date.parse('2026-10-06T12:00:00Z');
const DAY = 86400000;

const EXERCISE = {
  id: 'rust-01',
  language: 'rust',
  starter: 'fn energia(celdas: i32) -> i32 {\n    todo!()\n}',
  tests: [
    { id: 't1', expression: 'energia(3) == 21' },
    { id: 't2', expression: 'energia(0) == 0' },
  ],
  imports: [],
} as unknown as Exercise;

const PASSED: RunVerdict = {
  kind: 'executed',
  success: true,
  stdout: '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:PASS\n',
  stderr: '',
  tests: new Map([
    ['t1', true],
    ['t2', true],
  ]),
  customPassed: false,
};

const FAILED: RunVerdict = {
  kind: 'executed',
  success: true,
  stdout: '',
  stderr: '',
  tests: new Map([
    ['t1', true],
    ['t2', false],
  ]),
  customPassed: false,
};

const COMPILE_ERROR: RunVerdict = {
  kind: 'executed',
  success: false,
  stdout: '',
  stderr: 'error[E0384]: cannot assign twice to immutable variable',
  tests: new Map(),
  customPassed: false,
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

interface Harness {
  progress: LabStateV1;
  saved: string[];
  notices: string[];
  errors: unknown[];
  requests: RunRequest[];
  events: string[];
  dependencies: ExerciseRunnerDependencies<unknown>;
}

function harness(
  transport: (request: RunRequest, report: (progress: unknown) => void) => Promise<RunVerdict>,
  overrides: Partial<ExerciseRunnerDependencies<unknown>> & { countsLocalAttempts?: boolean } = {},
): Harness {
  const progress: LabStateV1 = { version: 1, records: {}, selected: { rust: null, go: null } };
  const result: Harness = {
    progress,
    saved: [],
    notices: [],
    errors: [],
    requests: [],
    events: [],
    dependencies: undefined as unknown as ExerciseRunnerDependencies<unknown>,
  };
  const port: ExerciseTransport<unknown> = {
    countsLocalAttempts: overrides.countsLocalAttempts ?? true,
    run(request, report) {
      result.requests.push(request);
      result.events.push('transport');
      return transport(request, report);
    },
  };
  result.dependencies = {
    store: {
      getProgress: () => progress,
      save: () => {
        result.saved.push(JSON.stringify(progress.records));
        result.events.push('save');
        return true;
      },
    },
    transport: port,
    now: () => NOW,
    notify: (message) => {
      result.notices.push(message);
      result.events.push(`notify ${message}`);
    },
    isLocked: () => false,
    isCampaignMission: () => false,
    syncSystems: () => void result.events.push('sync systems'),
    syncCampaign: () => {
      result.events.push('sync campaign');
      return undefined;
    },
    logError: (error) => void result.errors.push(error),
    ...overrides,
  };
  return result;
}

describe('createExerciseRunner: what it refuses', () => {
  it('refuses a locked mission with its notice, without saving nor sending', async () => {
    const test = harness(async () => PASSED, { isLocked: () => true });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.notices).toEqual(['Completá los requisitos de esta misión en tu campaña.']);
    expect(test.saved).toEqual([]);
    expect(test.requests).toEqual([]);
  });

  it('refuses a blank draft without counting an attempt', async () => {
    const test = harness(async () => PASSED);
    test.progress.records['rust-01'] = { draft: ' \n\t ' };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.notices).toEqual(['Escribí una solución o restaurá el inicio.']);
    expect(test.progress.records['rust-01']).toEqual({ draft: ' \n\t ' });
    expect(test.requests).toEqual([]);
  });

  it('refuses a second run while one is active: one request', async () => {
    const pending = deferred<RunVerdict>();
    const test = harness(() => pending.promise);
    const runner = createExerciseRunner(test.dependencies);
    const first = runner.run(EXERCISE);
    await runner.run(EXERCISE);
    expect(test.progress.records['rust-01'].attempts).toBe(1);
    pending.resolve(PASSED);
    await first;
    expect(test.requests).toHaveLength(1);
    expect(test.progress.records['rust-01'].attempts).toBe(1);
  });
});

describe('createExerciseRunner: the port', () => {
  it('sends the exercise, the draft as is, the trimmed custom test and a signal, never a program', async () => {
    const test = harness(async () => PASSED);
    test.progress.records['rust-01'] = {
      draft: '  fn x() {}  ',
      customTest: '  energia(1) == 7\n',
    };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    const [request] = test.requests;
    expect(Object.keys(request).sort()).toEqual(['customTest', 'draft', 'exercise', 'signal']);
    expect(request.exercise).toBe(EXERCISE);
    expect(request.draft).toBe('  fn x() {}  ');
    expect(request.customTest).toBe('energia(1) == 7');
    expect(request.signal.aborted).toBe(false);
  });

  it('sends no custom test when the field holds only spaces, a tab or a no-break space', async () => {
    const test = harness(async () => PASSED);
    test.progress.records['rust-01'] = { customTest: ' \t  ' };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.requests[0].customTest).toBe('');
  });

  it('counts and saves the attempt before sending, when the adapter says so', async () => {
    const test = harness(async () => PASSED);
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.events.slice(0, 2)).toEqual(['save', 'transport']);
    expect(JSON.parse(test.saved[0])['rust-01']).toEqual({ attempts: 1 });
  });

  it('leaves attempts alone when the adapter does not count them', async () => {
    const test = harness(async () => ({ ...PASSED, attemptId: 41 }), {
      countsLocalAttempts: false,
    });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].attempts).toBeUndefined();
    expect(test.events[0]).toBe('transport');
  });
});

describe('createExerciseRunner: an adapter that builds no program and counts no attempt', () => {
  it('runs the whole cycle: approved, partial, error and transport failure', async () => {
    const verdicts: RunVerdict[] = [
      PASSED,
      FAILED,
      COMPILE_ERROR,
      { kind: 'transport-failure', message: 'Sin red.' },
    ];
    const test = harness(async () => verdicts.shift()!, { countsLocalAttempts: false });
    const runner = createExerciseRunner(test.dependencies);
    const outcomes: unknown[] = [];
    for (let run = 0; run < 4; run++) {
      await runner.run(EXERCISE);
      const result = test.progress.records['rust-01'].result as LabResultV1;
      outcomes.push([result.success, result.transportError, result.tests.map((t) => t.passed)]);
    }
    expect(outcomes).toEqual([
      [true, false, [true, true]],
      [true, false, [true, false]],
      [false, false, [false, false]],
      [false, true, [false, false]],
    ]);
    expect(test.progress.records['rust-01']).toMatchObject({ solvedAt: NOW, reviewAt: NOW + DAY });
    expect(test.progress.records['rust-01'].attempts).toBeUndefined();
    expect(test.requests.every((request) => !('program' in request))).toBe(true);
  });
});

describe('createExerciseRunner: the result', () => {
  it('a first approval saves the result, solvedAt, the review in a day and announces it', async () => {
    const test = harness(async () => PASSED);
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01']).toEqual({
      attempts: 1,
      result: {
        code: 'fn energia(celdas: i32) -> i32 {\n    todo!()\n}',
        success: true,
        stdout: '__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:PASS\n',
        stderr: '',
        transportError: false,
        tests: [
          { id: 't1', passed: true },
          { id: 't2', passed: true },
        ],
        time: NOW,
        customTest: '',
        customPassed: false,
      },
      solvedAt: NOW,
      reviewAt: NOW + DAY,
    });
    expect(test.notices).toEqual([
      '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.',
    ]);
  });

  it('an approval after the first keeps solvedAt and reviewAt and says it still works', async () => {
    const test = harness(async () => PASSED);
    test.progress.records['rust-01'] = { solvedAt: 100, reviewAt: 200 };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01']).toMatchObject({ solvedAt: 100, reviewAt: 200 });
    expect(test.notices).toEqual(['Estos casos siguen funcionando. Probá una variante.']);
  });

  it('a failing result after an approval does not erase it (F7-Q1)', async () => {
    const test = harness(async () => FAILED);
    test.progress.records['rust-01'] = { solvedAt: 100, reviewAt: 200 };
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01']).toMatchObject({ solvedAt: 100, reviewAt: 200 });
    expect(test.notices).toEqual([]);
  });

  it('a transport failure saves a result that neither approves nor fails, and syncs', async () => {
    const test = harness(async () => ({ kind: 'transport-failure', message: 'Sin red.' }));
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].result).toMatchObject({
      success: false,
      stdout: '',
      stderr: 'Sin red.',
      transportError: true,
      tests: [
        { id: 't1', passed: false },
        { id: 't2', passed: false },
      ],
    });
    expect(test.progress.records['rust-01'].solvedAt).toBeUndefined();
    expect(test.progress.records['rust-01'].reviewAt).toBeUndefined();
    expect(test.notices).toEqual([]);
    expect(test.events).toContain('sync systems');
  });

  it('an adapter that throws saves a transport result with its message, without syncing', async () => {
    const test = harness(async () => {
      throw new Error('falló el adaptador');
    });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].result).toMatchObject({
      stderr: 'falló el adaptador',
      transportError: true,
    });
    expect(test.events).not.toContain('sync systems');
  });

  it('an adapter that throws without a message saves the fallback text', async () => {
    const test = harness(() => Promise.reject(new Error('')));
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].result).toMatchObject({
      stderr: 'No se pudo conectar al compilador.',
    });
  });

  it('an AbortError from the adapter saves nothing', async () => {
    const test = harness(() => Promise.reject(new DOMException('aborted', 'AbortError')));
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.progress.records['rust-01'].result).toBeUndefined();
  });

  it('keeps the attempt id of the verdict only when there is one', async () => {
    const withId = harness(async () => ({ ...PASSED, attemptId: 41 }));
    await createExerciseRunner(withId.dependencies).run(EXERCISE);
    expect(withId.progress.records['rust-01'].result).toMatchObject({ attemptId: 41 });
    const without = harness(async () => PASSED);
    await createExerciseRunner(without.dependencies).run(EXERCISE);
    expect(without.progress.records['rust-01'].result).not.toHaveProperty('attemptId');
  });

  it('writes the result on the record it reads after waiting, so a replaced state keeps it', async () => {
    const pending = deferred<RunVerdict>();
    const test = harness(() => pending.promise);
    const runner = createExerciseRunner(test.dependencies);
    const running = runner.run(EXERCISE);
    test.progress.records = { 'rust-02': { solvedAt: 5 } };
    pending.resolve(PASSED);
    await running;
    expect(Object.keys(test.progress.records)).toEqual(['rust-02', 'rust-01']);
    expect(test.progress.records['rust-01'].solvedAt).toBe(NOW);
  });
});

describe('createExerciseRunner: campaign and Systems', () => {
  it('syncs Systems and then the campaign after saving, and announces XP in a mission', async () => {
    const test = harness(async () => PASSED, {
      isCampaignMission: (exercise) => exercise.id === 'rust-01',
      syncCampaign: () => ({ xpGained: 20 }),
    });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.notices.at(-1)).toBe('+20 XP. Tu progreso de campaña está actualizado.');
    expect(test.events.indexOf('sync systems')).toBeGreaterThan(test.events.lastIndexOf('save'));
  });

  it('a failing sync is reported once and the result stays saved', async () => {
    const test = harness(async () => PASSED, {
      syncCampaign: () => {
        throw new Error('campaña caída');
      },
    });
    await createExerciseRunner(test.dependencies).run(EXERCISE);
    expect(test.notices.at(-1)).toBe(
      'No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.',
    );
    expect(test.errors).toHaveLength(1);
    expect(test.progress.records['rust-01'].result).toBeDefined();
  });
});

describe('createExerciseRunner: the state and the cancellation', () => {
  it('goes running and back to idle after saving, notifying and syncing', async () => {
    const test = harness(async () => PASSED);
    const runner = createExerciseRunner(test.dependencies);
    runner.state.subscribe((state) => test.events.push(`state ${state.status}`));
    await runner.run(EXERCISE);
    expect(test.events).toEqual([
      'save',
      'state running',
      'transport',
      'notify ¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.',
      'save',
      'sync systems',
      'sync campaign',
      'state idle',
    ]);
  });

  it('exposes what the adapter reports without reading it', async () => {
    const pending = deferred<RunVerdict>();
    let report: (progress: unknown) => void = () => undefined;
    const test = harness((_request, reportProgress) => {
      report = reportProgress;
      return pending.promise;
    });
    const runner = createExerciseRunner(test.dependencies);
    const running = runner.run(EXERCISE);
    expect(runner.state.getState()).toEqual({
      status: 'running',
      exerciseId: 'rust-01',
      progress: null,
    });
    report({ phase: 'queued', position: 3 });
    expect(runner.state.getState()).toEqual({
      status: 'running',
      exerciseId: 'rust-01',
      progress: { phase: 'queued', position: 3 },
    });
    pending.resolve(PASSED);
    await running;
    expect(runner.state.getState()).toEqual({ status: 'idle' });
  });

  it('cancel aborts the signal, goes idle at once, says so and discards the late result', async () => {
    const pending = deferred<RunVerdict>();
    const test = harness(() => pending.promise);
    const runner = createExerciseRunner(test.dependencies);
    const running = runner.run(EXERCISE);
    runner.cancel();
    expect(test.requests[0].signal.aborted).toBe(true);
    expect(runner.state.getState()).toEqual({ status: 'idle' });
    expect(test.notices).toEqual(['Ejecución cancelada. Tu código sigue guardado.']);
    pending.resolve(PASSED);
    await running;
    expect(test.progress.records['rust-01']).toEqual({ attempts: 1 });
  });

  it('abort is silent and discards the late result too', async () => {
    const pending = deferred<RunVerdict>();
    const test = harness(() => pending.promise);
    const runner = createExerciseRunner(test.dependencies);
    const running = runner.run(EXERCISE);
    runner.abort();
    pending.resolve(PASSED);
    await running;
    expect(test.notices).toEqual([]);
    expect(test.progress.records['rust-01'].result).toBeUndefined();
  });

  it('a run started right after a cancel is not overwritten by the late first result', async () => {
    const first = deferred<RunVerdict>();
    const second = deferred<RunVerdict>();
    const replies = [first.promise, second.promise];
    const test = harness(() => replies.shift()!);
    const runner = createExerciseRunner(test.dependencies);
    const firstRun = runner.run(EXERCISE);
    runner.cancel();
    const secondRun = runner.run(EXERCISE);
    first.resolve(PASSED);
    await firstRun;
    expect(runner.state.getState().status).toBe('running');
    expect(test.progress.records['rust-01'].result).toBeUndefined();
    second.resolve(FAILED);
    await secondRun;
    expect(test.progress.records['rust-01'].result).toMatchObject({
      tests: [
        { id: 't1', passed: true },
        { id: 't2', passed: false },
      ],
    });
    expect(test.progress.records['rust-01'].attempts).toBe(2);
  });
});
