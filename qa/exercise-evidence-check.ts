/* Regla única de evidencia e interpretación de la ejecución (ADR 0003, puntos 7 y 8). */
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
  }) => void;
}

const { testPassed, hasPassingEvidence, interpretRun, syncAfterRun } =
  await importModule<ExerciseApi>('src/entities/exercise/index.ts');

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

scenario('hasPassingEvidence: tabla de casos límite', () => {
  const cases: [string, unknown, boolean][] = [
    ['aprobado completo', approved(), true],
    ['sin result', undefined, false],
    ['result null', null, false],
    ['result es arreglo', [pass('t1'), pass('t2')], false],
    ['result es string', 'success', false],
    ['success en string', approved({ success: 'true' }), false],
    ['success falso', approved({ success: false }), false],
    ['transportError true', approved({ transportError: true }), false],
    ['transportError false', approved({ transportError: false }), true],
    ['code vacío', approved({ code: '' }), false],
    ['code sólo espacios', approved({ code: ' \n\t ' }), false],
    ['code no es string', approved({ code: 42 }), false],
    ['tests ausentes', { success: true, code: 'x' }, false],
    ['tests no es arreglo', approved({ tests: { t1: true } }), false],
    [
      'duplicados contradictorios',
      approved({ tests: [pass('t1'), fail('t1'), pass('t2')] }),
      false,
    ],
    ['duplicados aprobados', approved({ tests: [pass('t1'), pass('t1'), pass('t2')] }), false],
    ['falta una prueba', approved({ tests: [pass('t1')] }), false],
    ['prueba extra', approved({ tests: [pass('t1'), pass('t2'), pass('t3')] }), true],
    ['passed en string', approved({ tests: [pass('t1'), { id: 't2', passed: 'true' }] }), false],
    ['entrada null entre las pruebas', approved({ tests: [null, pass('t1'), pass('t2')] }), true],
  ];
  for (const [name, result, outcome] of cases)
    assert.equal(hasPassingEvidence(result, expected), outcome, name);
  assert.equal(hasPassingEvidence(approved({ tests: [] }), []), true, 'sin pruebas esperadas');
});

scenario('testPassed: exactamente una entrada aprobada con ese id', () => {
  const cases: [string, unknown, string, boolean][] = [
    ['aprobada', { tests: [pass('t1')] }, 't1', true],
    ['fallida', { tests: [fail('t1')] }, 't1', false],
    ['ausente', { tests: [pass('t2')] }, 't1', false],
    ['duplicada aprobada', { tests: [pass('t1'), pass('t1')] }, 't1', false],
    ['duplicada contradictoria', { tests: [fail('t1'), pass('t1')] }, 't1', false],
    ['passed en string', { tests: [{ id: 't1', passed: 'true' }] }, 't1', false],
    ['tests ausentes', {}, 't1', false],
    ['tests no es arreglo', { tests: 'x' }, 't1', false],
    ['result null', null, 't1', false],
    ['entrada null', { tests: [null, pass('t1')] }, 't1', true],
  ];
  for (const [name, result, id, outcome] of cases)
    assert.equal(testPassed(result, id), outcome, name);
});

const exercise = { tests: [{ id: 't1' }, { id: 't2' }] };
const context = { code: 'my code', customTest: '1 == 1', now: 1234 };
const marker = (id: string, outcome: 'PASS' | 'FAIL') => `__TALLER_TEST__${id}:${outcome}`;
const run = (runnerResult: Record<string, unknown>) =>
  interpretRun(exercise, runnerResult, context);

scenario('interpretRun: todas las pruebas PASS resuelven el ejercicio', () => {
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

scenario('interpretRun: una prueba FAIL no resuelve', () => {
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

scenario('interpretRun: un marcador ausente cuenta como fallo', () => {
  const outcome = run({ success: true, stdout: marker('t1', 'PASS') });
  assert.equal(outcome.solved, false);
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: true },
    { id: 't2', passed: false },
  ]);
});

scenario('interpretRun: con marcador duplicado gana el último', () => {
  const stdout = [
    marker('t1', 'FAIL'),
    marker('t1', 'PASS'),
    marker('t2', 'PASS'),
    marker('t2', 'FAIL'),
  ].join('\n');
  const outcome = run({ success: true, stdout });
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: true },
    { id: 't2', passed: false },
  ]);
  assert.equal(outcome.solved, false);
});

scenario('interpretRun: texto alrededor no oculta los marcadores de línea completa', () => {
  const stdout = `hola\n${marker('t1', 'PASS')}  \nruido ${marker('t2', 'PASS')}\n${marker('t2', 'PASS')}\r\nfin`;
  const outcome = run({ success: true, stdout });
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: true },
    { id: 't2', passed: true },
  ]);
  assert.equal(outcome.solved, true);
});

scenario('interpretRun: un marcador pegado a otro texto en su línea no cuenta', () => {
  const outcome = run({
    success: true,
    stdout: `ruido ${marker('t1', 'PASS')}\n${marker('t2', 'PASS')}`,
  });
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: false },
    { id: 't2', passed: true },
  ]);
});

scenario('interpretRun: error de transporte usa error como stderr', () => {
  const outcome = run({ success: false, error: 'No se pudo conectar' });
  assert.equal(outcome.solved, false);
  assert.equal(outcome.result.transportError, true);
  assert.equal(outcome.result.stderr, 'No se pudo conectar');
  assert.equal(outcome.result.stdout, '');
  assert.equal(outcome.result.success, false);
  assert.deepEqual(outcome.result.tests, [
    { id: 't1', passed: false },
    { id: 't2', passed: false },
  ]);
});

scenario('interpretRun: success false con stderr de compilación no es transporte', () => {
  const outcome = run({ success: false, stderr: 'error[E0308]: mismatched types', stdout: '' });
  assert.equal(outcome.result.transportError, false);
  assert.equal(outcome.result.stderr, 'error[E0308]: mismatched types');
  assert.equal(outcome.solved, false);
});

scenario('interpretRun: error con success true no es transporte y stderr gana sobre error', () => {
  const outcome = run({ success: true, error: 'aviso', stderr: 'salida' });
  assert.equal(outcome.result.transportError, false);
  assert.equal(outcome.result.stderr, 'salida');
});

scenario('interpretRun: recorta stdout a 12000 y stderr a 18000', () => {
  const outcome = run({ success: false, stdout: 'a'.repeat(13000), stderr: 'b'.repeat(19000) });
  assert.equal((outcome.result.stdout as string).length, 12000);
  assert.equal((outcome.result.stderr as string).length, 18000);
});

scenario('interpretRun: el marcador custom no cuenta como prueba del ejercicio', () => {
  const stdout = [marker('t1', 'PASS'), marker('t2', 'PASS'), marker('custom', 'FAIL')].join('\n');
  const outcome = run({ success: true, stdout });
  assert.equal(outcome.solved, true);
  assert.equal(outcome.result.customPassed, false);
  assert.equal(outcome.result.customTest, '1 == 1');
  assert.equal((outcome.result.tests as unknown[]).length, 2);
});

scenario('interpretRun: success distinto de true se guarda como false', () => {
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

scenario('syncAfterRun: avisa los XP de campaña ganados', () => {
  const { notices, errors } = syncRun({ syncCampaign: () => ({ xpGained: 20 }) });
  assert.deepEqual(notices, ['+20 XP. Tu progreso de campaña está actualizado.']);
  assert.deepEqual(errors, []);
});

scenario('syncAfterRun: no avisa sin XP ni fuera de una misión de campaña', () => {
  assert.deepEqual(syncRun({ syncCampaign: () => ({ xpGained: 0 }) }).notices, []);
  assert.deepEqual(
    syncRun({ syncCampaign: () => ({ xpGained: 20 }), isCampaignMission: () => false }).notices,
    [],
  );
});

scenario('syncAfterRun: si Sistemas falla informa y no propaga', () => {
  const failure = new Error('Sistemas roto');
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

scenario('syncAfterRun: si campaña o su consulta fallan informa y no propaga', () => {
  const failure = new Error('Campaña rota');
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
