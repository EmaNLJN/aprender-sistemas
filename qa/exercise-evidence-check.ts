/* Single evidence rule and run interpretation (ADR 0003, points 7 and 8). */
import assert from 'node:assert/strict';
import { importModule } from './lib/sources.ts';

interface Evidence {
  id: string;
  passed: unknown;
}
interface ExerciseApi {
  testPassed: (result: unknown, testId: string) => boolean;
  hasPassingEvidence: (result: unknown, expectedTests: readonly { id: string }[]) => boolean;
  interpretRun: (
    exercise: { tests: readonly { id: string }[] },
    runnerResult: Record<string, unknown>,
    context: { code: string; customTest: string; now: number },
  ) => { result: Record<string, unknown>; solved: boolean };
  syncAfterRun: (dependencies: {
    syncSystems: () => void;
    syncCampaign: () => { xpGained?: number } | undefined;
    isCampaignMission: () => boolean;
    notify: (message: string) => void;
    logError: (error: unknown) => void;
    formatXp?: (xp: number) => string;
  }) => void;
}

const { testPassed, hasPassingEvidence, interpretRun, syncAfterRun } =
  await importModule<ExerciseApi>('frontend/src/entities/exercise/index.ts');

const expected = [{ id: 't1' }, { id: 't2' }];
const pass = (id: string): Evidence => ({ id, passed: true });
const fail = (id: string): Evidence => ({ id, passed: false });
const approved = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  code: 'fn main() {}',
  tests: [pass('t1'), pass('t2')],
  ...overrides,
});

let passed = 0;
function scenario(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

scenario('hasPassingEvidence: edge-case table', () => {
  const cases: [string, unknown, boolean][] = [
    ['fully approved', approved(), true],
    ['no result', undefined, false],
    ['result null', null, false],
    ['result is an array', [pass('t1'), pass('t2')], false],
    ['result is a string', 'success', false],
    ['success as string', approved({ success: 'true' }), false],
    ['success false', approved({ success: false }), false],
    ['transportError true', approved({ transportError: true }), false],
    ['transportError false', approved({ transportError: false }), true],
    ['empty code', approved({ code: '' }), false],
    ['whitespace-only code', approved({ code: ' \n\t ' }), false],
    ['code is not a string', approved({ code: 42 }), false],
    ['tests missing', { success: true, code: 'x' }, false],
    ['tests is not an array', approved({ tests: { t1: true } }), false],
    ['contradictory duplicates', approved({ tests: [pass('t1'), fail('t1'), pass('t2')] }), false],
    ['passing duplicates', approved({ tests: [pass('t1'), pass('t1'), pass('t2')] }), false],
    ['a test is missing', approved({ tests: [pass('t1')] }), false],
    ['extra test', approved({ tests: [pass('t1'), pass('t2'), pass('t3')] }), true],
    ['passed as string', approved({ tests: [pass('t1'), { id: 't2', passed: 'true' }] }), false],
    ['null entry among the tests', approved({ tests: [null, pass('t1'), pass('t2')] }), true],
  ];
  for (const [name, result, outcome] of cases)
    assert.equal(hasPassingEvidence(result, expected), outcome, name);
  assert.equal(hasPassingEvidence(approved(), []), false, 'no expected tests');
  assert.equal(
    hasPassingEvidence(approved({ tests: [] }), []),
    false,
    'empty tests and empty expected',
  );
});

scenario('testPassed: exactly one passing entry with that id', () => {
  const cases: [string, unknown, string, boolean][] = [
    ['passing', { tests: [pass('t1')] }, 't1', true],
    ['failing', { tests: [fail('t1')] }, 't1', false],
    ['absent', { tests: [pass('t2')] }, 't1', false],
    ['passing duplicate', { tests: [pass('t1'), pass('t1')] }, 't1', false],
    ['contradictory duplicate', { tests: [fail('t1'), pass('t1')] }, 't1', false],
    ['passed as string', { tests: [{ id: 't1', passed: 'true' }] }, 't1', false],
    ['tests missing', {}, 't1', false],
    ['tests is not an array', { tests: 'x' }, 't1', false],
    ['result null', null, 't1', false],
    ['null entry', { tests: [null, pass('t1')] }, 't1', true],
  ];
  for (const [name, result, id, outcome] of cases)
    assert.equal(testPassed(result, id), outcome, name);
});

const exercise = { tests: [{ id: 't1' }, { id: 't2' }] };
const context = { code: 'my code', customTest: '1 == 1', now: 1234 };
const marker = (id: string, outcome: 'PASS' | 'FAIL') => `__TALLER_TEST__${id}:${outcome}`;
const run = (runnerResult: Record<string, unknown>) =>
  interpretRun(exercise, runnerResult, context);

scenario('interpretRun: all PASS tests solve the exercise', () => {
  const stdout = [marker('t1', 'PASS'), marker('t2', 'PASS'), marker('custom', 'PASS')].join('\n');
  const outcome = run({ success: true, stdout, stderr: 'warning' });
  assert.equal(outcome.solved, true);
  assert.deepEqual(outcome.result, {
    code: 'my code',
    success: true,
    stdout,
    stderr: 'warning',
    transportError: false,
    tests: [
      { id: 't1', passed: true },
      { id: 't2', passed: true },
    ],
    time: 1234,
    customTest: '1 == 1',
    customPassed: true,
  });
  assert.deepEqual(Object.keys(outcome.result), [
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
});

scenario('interpretRun: a FAIL test does not solve it', () => {
  const outcome = run({
    success: true,
    stdout: marker('t1', 'PASS') + '\n' + marker('t2', 'FAIL'),
  });
  assert.equal(outcome.solved, false);
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: true },
    { id: 't2', passed: false },
  ]);
  assert.equal(outcome.result.customPassed, false);
});

scenario('interpretRun: a missing marker counts as a failure', () => {
  const outcome = run({ success: true, stdout: marker('t1', 'PASS') });
  assert.equal(outcome.solved, false);
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: true },
    { id: 't2', passed: false },
  ]);
});

scenario('interpretRun: a repeated id in the markers counts as a failure', () => {
  const stdout = [
    marker('t1', 'FAIL'),
    marker('t1', 'PASS'),
    marker('t2', 'PASS'),
    marker('t2', 'PASS'),
  ].join('\n');
  const outcome = run({ success: true, stdout });
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: false },
    { id: 't2', passed: false },
  ]);
  assert.equal(outcome.solved, false);
});

scenario('interpretRun: solved matches hasPassingEvidence and success 1 does not solve', () => {
  const stdout = marker('t1', 'PASS') + '\n' + marker('t2', 'PASS');
  const solving = run({ success: true, stdout });
  assert.equal(solving.solved, hasPassingEvidence(solving.result, exercise.tests));
  assert.equal(solving.solved, true);
  const truthy = run({ success: 1, stdout });
  assert.equal(truthy.result.success, false);
  assert.equal(truthy.solved, false);
});

scenario('interpretRun: surrounding text does not hide full-line markers', () => {
  const stdout = `hola\n${marker('t1', 'PASS')}  \nruido ${marker('t2', 'PASS')}\n${marker('t2', 'PASS')}\r\nfin`;
  const outcome = run({ success: true, stdout });
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: true },
    { id: 't2', passed: true },
  ]);
  assert.equal(outcome.solved, true);
});

scenario('interpretRun: a marker glued to other text on its line does not count', () => {
  const outcome = run({
    success: true,
    stdout: `ruido ${marker('t1', 'PASS')}\n${marker('t2', 'PASS')}`,
  });
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: false },
    { id: 't2', passed: true },
  ]);
});

scenario('interpretRun: transport error uses error as stderr', () => {
  const outcome = run({ success: false, error: 'Could not connect' });
  assert.equal(outcome.solved, false);
  assert.equal(outcome.result.transportError, true);
  assert.equal(outcome.result.stderr, 'Could not connect');
  assert.equal(outcome.result.stdout, '');
  assert.equal(outcome.result.success, false);
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: false },
    { id: 't2', passed: false },
  ]);
});

scenario('interpretRun: success false with compilation stderr is not transport', () => {
  const outcome = run({ success: false, stderr: 'error[E0308]: mismatched types', stdout: '' });
  assert.equal(outcome.result.transportError, false);
  assert.equal(outcome.result.stderr, 'error[E0308]: mismatched types');
  assert.equal(outcome.solved, false);
});

scenario(
  'interpretRun: error with success true is not transport and stderr wins over error',
  () => {
    const outcome = run({ success: true, error: 'aviso', stderr: 'salida' });
    assert.equal(outcome.result.transportError, false);
    assert.equal(outcome.result.stderr, 'salida');
  },
);

scenario('interpretRun: trims stdout to 12000 and stderr to 18000', () => {
  const outcome = run({ success: false, stdout: 'a'.repeat(13000), stderr: 'b'.repeat(19000) });
  assert.equal((outcome.result.stdout as string).length, 12000);
  assert.equal((outcome.result.stderr as string).length, 18000);
});

scenario('interpretRun: the custom marker does not count as an exercise test', () => {
  const stdout = [marker('t1', 'PASS'), marker('t2', 'PASS'), marker('custom', 'FAIL')].join('\n');
  const outcome = run({ success: true, stdout });
  assert.equal(outcome.solved, true);
  assert.equal(outcome.result.customPassed, false);
  assert.equal(outcome.result.customTest, '1 == 1');
  assert.equal((outcome.result.tests as unknown[]).length, 2);
});

scenario('interpretRun: success other than true is stored as false', () => {
  const outcome = run({ success: 'yes', stdout: marker('t1', 'PASS') });
  assert.equal(outcome.result.success, false);
});

function syncRun(overrides: Partial<Parameters<ExerciseApi['syncAfterRun']>[0]> = {}) {
  const notices: string[] = [],
    errors: unknown[] = [];
  syncAfterRun({
    syncSystems: () => {},
    syncCampaign: () => undefined,
    isCampaignMission: () => true,
    notify: (message) => notices.push(message),
    logError: (error) => errors.push(error),
    ...overrides,
  });
  return { notices, errors };
}

scenario('syncAfterRun: announces the campaign XP earned', () => {
  const { notices, errors } = syncRun({ syncCampaign: () => ({ xpGained: 20 }) });
  assert.deepEqual(notices, ['+20 XP. Tu progreso de campaña está actualizado.']);
  assert.deepEqual(errors, []);
});

scenario('syncAfterRun: does not announce without XP or outside a campaign mission', () => {
  assert.deepEqual(syncRun({ syncCampaign: () => ({ xpGained: 0 }) }).notices, []);
  assert.deepEqual(
    syncRun({ syncCampaign: () => ({ xpGained: 20 }), isCampaignMission: () => false }).notices,
    [],
  );
});

scenario('syncAfterRun: if Systems fails it reports and does not propagate', () => {
  const failure = new Error('Systems broken');
  const { notices, errors } = syncRun({
    syncSystems: () => {
      throw failure;
    },
  });
  assert.deepEqual(notices, [
    'No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.',
  ]);
  assert.deepEqual(errors, [failure]);
});

scenario('syncAfterRun: if Systems throws, campaign is still called and its XP announced', () => {
  const calls: string[] = [];
  const { notices, errors } = syncRun({
    syncSystems: () => {
      throw new Error('Systems broken');
    },
    syncCampaign: () => (calls.push('campaign'), { xpGained: 20 }),
  });
  assert.deepEqual(calls, ['campaign']);
  assert.equal(errors.length, 1);
  assert.deepEqual(notices, [
    '+20 XP. Tu progreso de campaña está actualizado.',
    'No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.',
  ]);
});

scenario('syncAfterRun: with both failing it records both errors and announces once', () => {
  const systemsFailure = new Error('Systems broken');
  const campaignFailure = new Error('Campaign broken');
  const { notices, errors } = syncRun({
    syncSystems: () => {
      throw systemsFailure;
    },
    syncCampaign: () => {
      throw campaignFailure;
    },
  });
  assert.deepEqual(errors, [systemsFailure, campaignFailure]);
  assert.deepEqual(notices, [
    'No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.',
  ]);
});

scenario('syncAfterRun: a custom formatXp gives the notice text', () => {
  const { notices } = syncRun({
    syncCampaign: () => ({ xpGained: 7 }),
    formatXp: (xp) => `You earned ${xp} points`,
  });
  assert.deepEqual(notices, ['You earned 7 points']);
});

scenario('syncAfterRun: if campaign or its query fails it reports and does not propagate', () => {
  const failure = new Error('Campaign broken');
  const throwing = () => {
    throw failure;
  };
  const expectedNotice = ['No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.'];
  for (const overrides of [
    { syncCampaign: throwing },
    { syncCampaign: () => ({ xpGained: 5 }), isCampaignMission: throwing },
  ]) {
    const { notices, errors } = syncRun(overrides);
    assert.deepEqual(notices, expectedNotice);
    assert.deepEqual(errors, [failure]);
  }
});

console.log(passed + ' exercise evidence scenarios passed.');
