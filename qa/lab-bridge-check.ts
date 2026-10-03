/* Caracterización del puente entre el laboratorio y la campaña / Sistemas.
 * node qa/lab-bridge-check.ts
 * Fija el contrato actual de window.TallerCampaign y window.TallerSystems frente a
 * lab.js: URLs de regreso, bloque de contexto del ejercicio y bloqueo de misiones.
 * Los valores esperados están escritos a mano desde los catálogos y el formato de URL
 * vigente; no se recalculan con el algoritmo de producción.
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { plainJson } from './lib/plain-json.ts';
import { runSource } from './lib/sources.ts';

interface LabTest {
  id: string;
}
interface LabExercise {
  id: string;
  tests: LabTest[];
}
interface Workshop {
  id: string;
}
interface CampaignApi {
  init(): { ready: boolean; storageAvailable: boolean; loadWarning: string };
  sync(): unknown;
  returnURL(worldId: string): string;
  exerciseContextHTML(id: string, lang: string): string;
  lockedExerciseHTML(id: string, lang: string): string;
}
interface SystemsApi {
  init(): { storageAvailable: boolean; loadWarning: string };
  returnURL(workshopId: string, lang?: string): string;
  missionIDs(workshopId?: string, lang?: string): string[];
  exerciseContextHTML(id: string, lang: string): string;
}
interface LabRecord {
  result: {
    success: boolean;
    code: string;
    tests: { id: string; passed: boolean }[];
  };
  predictionCorrect?: boolean;
}
interface LabState {
  records: Record<string, LabRecord>;
}
interface BridgeContext extends vm.Context {
  window: BridgeContext;
  location: { search: string; hash: string; href: string };
  RUST_CAMPAIGN?: unknown[];
  SYSTEMS_PC?: { workshops: Workshop[] };
  SYSTEMS_LOWLEVEL?: { workshops: Workshop[] };
  SYSTEMS_INFRA?: { workshops: Workshop[] };
  SYSTEMS_PLAY?: { workshops: Workshop[] };
  TallerCampaign?: CampaignApi;
  TallerSystems?: SystemsApi;
  [name: string]: unknown;
}

const catalogScripts = [
  'lab-rust.js',
  'lab-go.js',
  'quests-rust.js',
  'quests-go.js',
  'systems-lowlevel.js',
  'systems-lowlevel-labs.js',
  'systems-infra.js',
  'systems-infra-labs.js',
  'systems-play.js',
  'systems-play-labs.js',
  'systems-pc.js',
  'systems-pc-labs.js',
];
const labGlobals = [
  'RUST_LAB',
  'RUST_QUESTS',
  'GO_LAB',
  'GO_QUESTS',
  'SYSTEMS_PC_LABS',
  'SYSTEMS_LOWLEVEL_LABS',
  'SYSTEMS_INFRA_LABS',
  'SYSTEMS_PLAY_LABS',
];

function createContext(search: string, labState: LabState): BridgeContext {
  const storage = new Map<string, string>();
  const context = {
    URL,
    URLSearchParams,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, String(value)),
    },
    location: { search, hash: '', href: `http://taller.test/${search}` },
    history: { replaceState: () => undefined },
  } as unknown as BridgeContext;
  context.window = context;
  vm.createContext(context);
  for (const script of catalogScripts) runSource(context, script);
  const exercises = labGlobals.flatMap((name) => context[name] as LabExercise[]);
  context.TallerLab = { getExercises: () => exercises, exportState: () => labState };
  return context;
}

function campaignBridge(search: string, labState: LabState = { records: {} }): CampaignApi {
  const context = createContext(search, labState);
  for (const script of ['campaign-rust.js', 'campaign-go.js', 'campaign-engine.js', 'campaign.js'])
    runSource(context, script);
  const api = context.TallerCampaign;
  assert.ok(api, 'campaign.js no publicó TallerCampaign');
  assert.deepEqual(plainJson(api.init()), { ready: true, storageAvailable: true, loadWarning: '' });
  return api;
}

function systemsBridge(
  search: string,
  labState: LabState = { records: {} },
): { api: SystemsApi; context: BridgeContext } {
  const context = createContext(search, labState);
  for (const script of ['systems-engine.js', 'systems.js']) runSource(context, script);
  const api = context.TallerSystems;
  assert.ok(api, 'systems.js no publicó TallerSystems');
  assert.deepEqual(plainJson(api.init()), { storageAvailable: true, loadWarning: '' });
  return { api, context };
}

function labExercise(search: string, id: string): LabExercise {
  const exercises = (
    createContext(search, { records: {} }).TallerLab as {
      getExercises(): LabExercise[];
    }
  ).getExercises();
  const found = exercises.find((item) => item.id === id);
  assert.ok(found, `ejercicio inexistente: ${id}`);
  return found;
}

function passedRecord(exercise: LabExercise, predictionCorrect: boolean): LabRecord {
  return {
    result: {
      success: true,
      code: 'fn main() {}',
      tests: exercise.tests.map((test) => ({ id: test.id, passed: true })),
    },
    predictionCorrect,
  };
}

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try {
    run();
    passed++;
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failed++;
    process.stderr.write(`FAIL ${name}\n${(error as Error).stack}\n`);
  }
}

// Núcleo programable de cada taller de Sistemas: el número es el mismo en Rust y Go.
const coreNumbers: Record<string, number> = {
  pc: 137,
  cache: 113,
  heap: 114,
  mmu: 115,
  tlb: 116,
  vm: 117,
  stack: 118,
  scheduler: 119,
  interrupts: 120,
  wal: 121,
  lsm: 122,
  quorum: 123,
  clocks: 124,
  network: 125,
  backpressure: 126,
  balancing: 127,
  sharding: 128,
  transforms: 129,
  raster: 130,
  raycast: 131,
  pathfinding: 132,
  physics: 133,
  life: 134,
  algebra: 135,
  minimax: 136,
};

test('campaña: returnURL conserva el formato ?mundo=<id>#campana', () => {
  const campaign = campaignBridge('');
  assert.equal(campaign.returnURL('rust-world-2'), '?mundo=rust-world-2#campana');
  assert.equal(campaign.returnURL('go-world-4'), '?mundo=go-world-4#campana');
  assert.equal(campaign.returnURL('mundo raro/1'), '?mundo=mundo%20raro%2F1#campana');
});

test('campaña: una misión de entrenamiento muestra mundo, XP y tipo', () => {
  const campaign = campaignBridge('?campana=rust-world-1&ejercicio=rust-02&paso=learn');
  assert.equal(
    campaign.exerciseContextHTML('rust-02', 'rust'),
    '<div class="quest-lab-context"><a href="?mundo=rust-world-1#campana">← Estación del robot</a><span>0/30 XP · Entrenamiento</span><span>○ Pruebas ○ Predicción</span></div>',
  );
});

test('campaña: el tipo de misión distingue reparación, kata y desafío final', () => {
  const campaign = campaignBridge('?campana=rust-world-1');
  assert.match(campaign.exerciseContextHTML('rust-101', 'rust'), /0\/30 XP · Reparación · lings/);
  assert.match(campaign.exerciseContextHTML('rust-102', 'rust'), /0\/30 XP · Kata/);
  assert.match(campaign.exerciseContextHTML('rust-103', 'rust'), /0\/30 XP · Desafío final/);
});

test('campaña: el contexto de Go usa el mundo de Go', () => {
  const campaign = campaignBridge('?campana=go-world-1');
  assert.match(
    campaign.exerciseContextHTML('go-06', 'go'),
    /<a href="\?mundo=go-world-1#campana">← La estación del rover<\/a>/,
  );
  assert.match(campaign.exerciseContextHTML('go-103', 'go'), /Desafío final/);
});

test('campaña: un ejercicio fuera de campaña devuelve cadena vacía', () => {
  const inWorld = campaignBridge('?campana=rust-world-1');
  assert.equal(inWorld.exerciseContextHTML('rust-01', 'rust'), '');
  assert.equal(inWorld.exerciseContextHTML('rust-02', 'go'), '');
  assert.equal(campaignBridge('?campana=no-existe').exerciseContextHTML('rust-02', 'rust'), '');
  assert.equal(campaignBridge('').exerciseContextHTML('rust-02', 'rust'), '');
  assert.equal(campaignBridge('?ejercicio=rust-02').exerciseContextHTML('rust-02', 'rust'), '');
});

test('campaña: el contexto refleja las pruebas y la predicción del laboratorio', () => {
  const exercise = labExercise('', 'rust-02');
  const labState = { records: { 'rust-02': passedRecord(exercise, true) } };
  const campaign = campaignBridge('?campana=rust-world-1', labState);
  const html = campaign.exerciseContextHTML('rust-02', 'rust');
  assert.match(html, /<span>30\/30 XP · Entrenamiento<\/span>/);
  assert.match(html, /<span>✓ Pruebas ✓ Predicción<\/span>/);
  const onlyCode = campaignBridge('?campana=rust-world-1', {
    records: { 'rust-02': passedRecord(exercise, false) },
  });
  assert.match(onlyCode.exerciseContextHTML('rust-02', 'rust'), /20\/30 XP · Entrenamiento/);
  assert.match(onlyCode.exerciseContextHTML('rust-02', 'rust'), /✓ Pruebas ○ Predicción/);
});

test('campaña: un jefe bloqueado muestra los motivos y el regreso al mapa', () => {
  const campaign = campaignBridge('?campana=rust-world-1&ejercicio=rust-103&paso=learn');
  assert.equal(
    campaign.lockedExerciseHTML('rust-103', 'rust'),
    '<section class="quest-direct-lock"><div class="eyebrow">CAMPAÑA · ACCESO A LA MISIÓN</div><h1>Primero, las piezas<br><em>que te preparan.</em></h1><p>Esta misión todavía no está disponible en tu campaña.</p><ul>' +
      '<li>Verificá las pruebas de «Repará el contador inmutable» (rust-02).</li>' +
      '<li>Verificá las pruebas de «Elegí una ruta con if» (rust-06).</li>' +
      '<li>Verificá las pruebas de «El método conoce su rectángulo» (rust-22).</li>' +
      '<li>Verificá las pruebas de «Reparación · La brújula cruzada» (rust-101).</li>' +
      '<li>Verificá las pruebas de «Kata · El inventario no puede desbordarse» (rust-102).</li>' +
      '</ul><a class="button" href="?mundo=rust-world-1#campana">Ver mi mapa →</a></section>',
  );
});

test('campaña: una misión permitida o sin enlace de campaña no se bloquea', () => {
  const campaign = campaignBridge('?campana=rust-world-1');
  assert.equal(campaign.lockedExerciseHTML('rust-02', 'rust'), '');
  assert.equal(campaign.lockedExerciseHTML('rust-101', 'rust'), '');
  assert.equal(campaignBridge('').lockedExerciseHTML('rust-103', 'rust'), '');
});

test('campaña: el jefe se habilita al verificar las cinco misiones previas y sincronizar', () => {
  const ids = ['rust-02', 'rust-06', 'rust-22', 'rust-101', 'rust-102'];
  const records = Object.fromEntries(
    ids.map((id) => [id, passedRecord(labExercise('', id), true)]),
  );
  const campaign = campaignBridge('?campana=rust-world-1', { records });
  // lockedExerciseHTML no sincroniza por sí misma: usa el último estado sincronizado.
  assert.match(campaign.lockedExerciseHTML('rust-103', 'rust'), /quest-direct-lock/);
  campaign.sync();
  assert.equal(campaign.lockedExerciseHTML('rust-103', 'rust'), '');
});

test('campaña: un enlace que no pertenece al mundo explica el problema', () => {
  const html = campaignBridge('?campana=rust-world-1').lockedExerciseHTML('rust-01', 'rust');
  assert.match(html, /<li>El enlace no corresponde a una misión de este mundo\.<\/li>/);
  assert.match(html, /<a class="button" href="\?mundo=rust-world-1#campana">Ver mi mapa →<\/a>/);
  const unknownWorld = campaignBridge('?campana=no-existe').lockedExerciseHTML('rust-02', 'rust');
  assert.match(unknownWorld, /El enlace no corresponde a una misión de este mundo\./);
  assert.match(unknownWorld, /<a class="button" href="#campana">Ver mi mapa →<\/a>/);
});

test('sistemas: el catálogo expone los 25 talleres esperados', () => {
  const { context } = systemsBridge('');
  const ids = [
    context.SYSTEMS_PC,
    context.SYSTEMS_LOWLEVEL,
    context.SYSTEMS_INFRA,
    context.SYSTEMS_PLAY,
  ]
    .flatMap((source) => source?.workshops ?? [])
    .map((workshop) => workshop.id);
  assert.deepEqual([...ids].sort(), Object.keys(coreNumbers).sort());
});

test('sistemas: missionIDs termina en el núcleo de cada taller (50 núcleos)', () => {
  const { api } = systemsBridge('');
  const cores: string[] = [];
  for (const [id, number] of Object.entries(coreNumbers))
    for (const lang of ['rust', 'go']) {
      const ids = api.missionIDs(id, lang);
      assert.equal(ids.at(-1), `${lang}-${number}`, `${id}/${lang}`);
      cores.push(ids.at(-1) as string);
    }
  assert.equal(cores.length, 50);
  assert.equal(new Set(cores).size, 50);
});

test('sistemas: missionIDs lista primero las herramientas previas y después el núcleo', () => {
  const { api } = systemsBridge('');
  assert.deepEqual(plainJson(api.missionIDs('cache', 'rust')), ['rust-31', 'rust-35', 'rust-113']);
  assert.deepEqual(plainJson(api.missionIDs('heap', 'go')), ['go-16', 'go-75', 'go-114']);
  assert.deepEqual(plainJson(api.missionIDs('pc', 'rust')), [
    'rust-115',
    'rust-116',
    'rust-120',
    'rust-137',
  ]);
  assert.deepEqual(plainJson(api.missionIDs('minimax', 'go')), [
    'go-06',
    'go-10',
    'go-86',
    'go-136',
  ]);
});

test('sistemas: missionIDs devuelve vacío sin taller o con un taller desconocido', () => {
  // Diferencia con el contrato descrito: no existe una lista global; exige taller e idioma.
  const { api } = systemsBridge('');
  assert.deepEqual(plainJson(api.missionIDs()), []);
  assert.deepEqual(plainJson(api.missionIDs('no-existe', 'rust')), []);
});

test('sistemas: returnURL conserva el formato ?taller=&parte=build&lenguaje=#sistemas', () => {
  const { api } = systemsBridge('');
  assert.equal(api.returnURL('cache'), '?taller=cache&parte=build&lenguaje=rust#sistemas');
  assert.equal(api.returnURL('cache', 'rust'), '?taller=cache&parte=build&lenguaje=rust#sistemas');
  assert.equal(api.returnURL('cache', 'go'), '?taller=cache&parte=build&lenguaje=go#sistemas');
  assert.equal(api.returnURL('cache', 'otro'), '?taller=cache&parte=build&lenguaje=rust#sistemas');
  assert.equal(api.returnURL('a b'), '?taller=a%20b&parte=build&lenguaje=rust#sistemas');
});

test('sistemas: el núcleo muestra el título del taller y el regreso', () => {
  const { api } = systemsBridge('?sistema=cache&ejercicio=rust-113&paso=code');
  assert.equal(
    api.exerciseContextHTML('rust-113', 'rust'),
    '<div class="quest-lab-context"><a href="?taller=cache&parte=build&lenguaje=rust#sistemas">← Una caché que aprende tus visitas</a><span>Núcleo del taller</span><span>Tres pruebas para verificar el núcleo</span></div>',
  );
  assert.match(
    api.exerciseContextHTML('go-113', 'go'),
    /<a href="\?taller=cache&parte=build&lenguaje=go#sistemas">← Una caché que aprende tus visitas<\/a><span>Núcleo del taller<\/span>/,
  );
});

test('sistemas: una herramienta previa se rotula como tal', () => {
  const { api } = systemsBridge('?sistema=cache');
  assert.match(api.exerciseContextHTML('rust-31', 'rust'), /<span>Herramienta previa<\/span>/);
});

test('sistemas: un ejercicio que no es núcleo ni previo devuelve cadena vacía', () => {
  const { api } = systemsBridge('?sistema=cache');
  assert.equal(api.exerciseContextHTML('rust-01', 'rust'), '');
  assert.equal(api.exerciseContextHTML('rust-113', 'go'), '');
  assert.equal(api.exerciseContextHTML('go-113', 'rust'), '');
  assert.equal(systemsBridge('?sistema=no-existe').api.exerciseContextHTML('rust-113', 'rust'), '');
  assert.equal(systemsBridge('').api.exerciseContextHTML('rust-113', 'rust'), '');
});

test('sistemas: el contexto marca el núcleo verificado por el laboratorio', () => {
  const labState = { records: { 'rust-113': passedRecord(labExercise('', 'rust-113'), false) } };
  const { api } = systemsBridge('?sistema=cache', labState);
  assert.match(api.exerciseContextHTML('rust-113', 'rust'), /<span>✓ Núcleo verificado<\/span>/);
  assert.match(api.exerciseContextHTML('go-113', 'go'), /Tres pruebas para verificar el núcleo/);
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
