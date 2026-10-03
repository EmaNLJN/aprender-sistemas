/* Caracterización del puente entre el laboratorio y la campaña / Sistemas.
 * node qa/lab-bridge-check.ts
 * Fija el contrato actual de window.TallerCampaign y window.TallerSystems frente a
 * lab.js: URLs de regreso, bloque de contexto del ejercicio y bloqueo de misiones.
 * Los valores esperados están escritos a mano desde los catálogos y el formato de URL
 * vigente; no se recalculan con el algoritmo de producción.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { plainJson } from './lib/plain-json.ts';
import {
  loadCampaignEngine,
  loadCampaignUi,
  loadCampaignWorlds,
  loadLabCatalogs,
  loadSystemsEngine,
  loadSystemsUi,
} from './lib/legacy-sources.ts';
import { repoRoot } from './lib/sources.ts';

interface LabTest {
  id: string;
}
interface LabExercise {
  id: string;
  tests: LabTest[];
}
interface Workshop {
  id: string;
  title: string;
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
  loadLabCatalogs(context);
  const exercises = labGlobals.flatMap((name) => context[name] as LabExercise[]);
  context.TallerLab = { getExercises: () => exercises, exportState: () => labState };
  return context;
}

type ContextHook = (context: BridgeContext) => void;

function campaignBridge(
  search: string,
  labState: LabState = { records: {} },
  afterCatalogs?: ContextHook,
): CampaignApi {
  const context = createContext(search, labState);
  loadCampaignWorlds(context);
  afterCatalogs?.(context);
  loadCampaignEngine(context);
  loadCampaignUi(context);
  const api = context.TallerCampaign;
  assert.ok(api, 'campaign.js no publicó TallerCampaign');
  assert.deepEqual(plainJson(api.init()), { ready: true, storageAvailable: true, loadWarning: '' });
  return api;
}

function systemsBridge(
  search: string,
  labState: LabState = { records: {} },
  afterCatalogs?: ContextHook,
): { api: SystemsApi; context: BridgeContext } {
  const context = createContext(search, labState);
  afterCatalogs?.(context);
  loadSystemsEngine(context);
  loadSystemsUi(context);
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

// Núcleo programable de cada taller de Sistemas: lo fija el fixture de IDs del currículo.
interface WorkshopContract {
  cores: Record<'rust' | 'go', string>;
}
const fixture = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'qa', 'fixtures', 'curriculum-ids.json'), 'utf8'),
) as { workshops: Record<string, WorkshopContract> };
const workshopIds = Object.keys(fixture.workshops);

function coreOf(workshopId: string, language: 'rust' | 'go'): string {
  const workshop = fixture.workshops[workshopId];
  assert.ok(workshop, `el fixture no declara el taller ${workshopId}`);
  return workshop.cores[language];
}

// Los enlaces se comparan por contenido (parámetros y hash), no por su texto exacto.
interface ParsedLink {
  params: Record<string, string>;
  hash: string;
}

function parseLink(url: string): ParsedLink {
  const parsed = new URL(url, 'http://taller.test/');
  return { params: Object.fromEntries(parsed.searchParams), hash: parsed.hash };
}

function hrefsIn(html: string): ParsedLink[] {
  return [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((match) =>
    parseLink((match[1] ?? '').replaceAll('&amp;', '&')),
  );
}

function listItemsIn(html: string): string[] {
  return [...html.matchAll(/<li>(.*?)<\/li>/g)].map((match) => match[1] ?? '');
}

test('campaña: returnURL conserva el formato ?mundo=<id>#campana', () => {
  const campaign = campaignBridge('');
  assert.deepEqual(parseLink(campaign.returnURL('rust-world-2')), {
    params: { mundo: 'rust-world-2' },
    hash: '#campana',
  });
  assert.deepEqual(parseLink(campaign.returnURL('go-world-4')), {
    params: { mundo: 'go-world-4' },
    hash: '#campana',
  });
  // Los caracteres reservados deben sobrevivir al ciclo codificar y decodificar.
  assert.deepEqual(parseLink(campaign.returnURL('mundo raro/1')), {
    params: { mundo: 'mundo raro/1' },
    hash: '#campana',
  });
});

test('campaña: una misión de entrenamiento muestra mundo, XP y tipo', () => {
  const campaign = campaignBridge('?campana=rust-world-1&ejercicio=rust-02&paso=learn');
  const html = campaign.exerciseContextHTML('rust-02', 'rust');
  assert.match(html, /^<div class="quest-lab-context">/);
  assert.deepEqual(hrefsIn(html), [{ params: { mundo: 'rust-world-1' }, hash: '#campana' }]);
  assert.match(html, />← Estación del robot<\/a>/);
  assert.match(html, /<span>0\/30 XP · Entrenamiento<\/span>/);
  assert.match(html, /<span>○ Pruebas ○ Predicción<\/span>/);
});

test('campaña: el tipo de misión distingue reparación, kata y desafío final', () => {
  const campaign = campaignBridge('?campana=rust-world-1');
  assert.match(campaign.exerciseContextHTML('rust-101', 'rust'), /0\/30 XP · Reparación · lings/);
  assert.match(campaign.exerciseContextHTML('rust-102', 'rust'), /0\/30 XP · Kata/);
  assert.match(campaign.exerciseContextHTML('rust-103', 'rust'), /0\/30 XP · Desafío final/);
});

test('campaña: el contexto de Go usa el mundo de Go', () => {
  const campaign = campaignBridge('?campana=go-world-1');
  const html = campaign.exerciseContextHTML('go-06', 'go');
  assert.deepEqual(hrefsIn(html), [{ params: { mundo: 'go-world-1' }, hash: '#campana' }]);
  assert.match(html, />← La estación del rover<\/a>/);
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
  const html = campaign.lockedExerciseHTML('rust-103', 'rust');
  assert.match(html, /^<section class="quest-direct-lock">/);
  assert.match(html, /Esta misión todavía no está disponible en tu campaña\./);
  assert.deepEqual(listItemsIn(html), [
    'Verificá las pruebas de «Repará el contador inmutable» (rust-02).',
    'Verificá las pruebas de «Elegí una ruta con if» (rust-06).',
    'Verificá las pruebas de «El método conoce su rectángulo» (rust-22).',
    'Verificá las pruebas de «Reparación · La brújula cruzada» (rust-101).',
    'Verificá las pruebas de «Kata · El inventario no puede desbordarse» (rust-102).',
  ]);
  assert.deepEqual(hrefsIn(html), [{ params: { mundo: 'rust-world-1' }, hash: '#campana' }]);
  assert.match(html, /<a class="button" [^>]*>Ver mi mapa →<\/a>/);
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
  campaign.sync();
  assert.equal(campaign.lockedExerciseHTML('rust-103', 'rust'), '');
});

test('campaña: un enlace que no pertenece al mundo explica el problema', () => {
  const html = campaignBridge('?campana=rust-world-1').lockedExerciseHTML('rust-01', 'rust');
  assert.match(html, /<li>El enlace no corresponde a una misión de este mundo\.<\/li>/);
  assert.deepEqual(hrefsIn(html), [{ params: { mundo: 'rust-world-1' }, hash: '#campana' }]);
  assert.match(html, />Ver mi mapa →<\/a>/);
  const unknownWorld = campaignBridge('?campana=no-existe').lockedExerciseHTML('rust-02', 'rust');
  assert.match(unknownWorld, /El enlace no corresponde a una misión de este mundo\./);
  assert.deepEqual(hrefsIn(unknownWorld), [{ params: {}, hash: '#campana' }]);
  assert.match(unknownWorld, />Ver mi mapa →<\/a>/);
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
  assert.deepEqual([...ids].sort(), [...workshopIds].sort());
});

test('sistemas: missionIDs termina en el núcleo de cada taller (50 núcleos)', () => {
  const { api } = systemsBridge('');
  const cores: string[] = [];
  for (const id of workshopIds)
    for (const lang of ['rust', 'go'] as const) {
      const ids = api.missionIDs(id, lang);
      assert.equal(ids.at(-1), coreOf(id, lang), `${id}/${lang}`);
      cores.push(ids.at(-1) as string);
    }
  assert.equal(cores.length, 50);
  assert.equal(new Set(cores).size, 50);
});

test('sistemas: missionIDs lista primero las herramientas previas y después el núcleo', () => {
  const { api } = systemsBridge('');
  assert.deepEqual(plainJson(api.missionIDs('cache', 'rust')), [
    'rust-31',
    'rust-35',
    coreOf('cache', 'rust'),
  ]);
  assert.deepEqual(plainJson(api.missionIDs('heap', 'go')), [
    'go-16',
    'go-75',
    coreOf('heap', 'go'),
  ]);
  assert.deepEqual(plainJson(api.missionIDs('pc', 'rust')), [
    coreOf('mmu', 'rust'),
    coreOf('tlb', 'rust'),
    coreOf('interrupts', 'rust'),
    coreOf('pc', 'rust'),
  ]);
  assert.deepEqual(plainJson(api.missionIDs('minimax', 'go')), [
    'go-06',
    'go-10',
    'go-86',
    coreOf('minimax', 'go'),
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
  const systemsLink = (taller: string, lenguaje: string): ParsedLink => ({
    params: { taller, parte: 'build', lenguaje },
    hash: '#sistemas',
  });
  assert.deepEqual(parseLink(api.returnURL('cache')), systemsLink('cache', 'rust'));
  assert.deepEqual(parseLink(api.returnURL('cache', 'rust')), systemsLink('cache', 'rust'));
  assert.deepEqual(parseLink(api.returnURL('cache', 'go')), systemsLink('cache', 'go'));
  assert.deepEqual(parseLink(api.returnURL('cache', 'otro')), systemsLink('cache', 'rust'));
  assert.deepEqual(parseLink(api.returnURL('a b')), systemsLink('a b', 'rust'));
});

test('sistemas: el núcleo muestra el título del taller y el regreso', () => {
  const { api } = systemsBridge(`?sistema=cache&ejercicio=${coreOf('cache', 'rust')}&paso=code`);
  const rust = api.exerciseContextHTML(coreOf('cache', 'rust'), 'rust');
  assert.match(rust, /^<div class="quest-lab-context">/);
  assert.deepEqual(hrefsIn(rust), [
    { params: { taller: 'cache', parte: 'build', lenguaje: 'rust' }, hash: '#sistemas' },
  ]);
  assert.match(rust, />← Una caché que aprende tus visitas<\/a>/);
  assert.match(rust, /<span>Núcleo del taller<\/span>/);
  assert.match(rust, /<span>Tres pruebas para verificar el núcleo<\/span>/);
  const go = api.exerciseContextHTML(coreOf('cache', 'go'), 'go');
  assert.deepEqual(hrefsIn(go), [
    { params: { taller: 'cache', parte: 'build', lenguaje: 'go' }, hash: '#sistemas' },
  ]);
  assert.match(go, /<span>Núcleo del taller<\/span>/);
});

test('sistemas: una herramienta previa se rotula como tal', () => {
  const { api } = systemsBridge('?sistema=cache');
  assert.match(api.exerciseContextHTML('rust-31', 'rust'), /<span>Herramienta previa<\/span>/);
});

test('sistemas: un ejercicio que no es núcleo ni previo devuelve cadena vacía', () => {
  const { api } = systemsBridge('?sistema=cache');
  assert.equal(api.exerciseContextHTML('rust-01', 'rust'), '');
  assert.equal(api.exerciseContextHTML(coreOf('cache', 'rust'), 'go'), '');
  assert.equal(api.exerciseContextHTML(coreOf('cache', 'go'), 'rust'), '');
  assert.equal(
    systemsBridge('?sistema=no-existe').api.exerciseContextHTML(coreOf('cache', 'rust'), 'rust'),
    '',
  );
  assert.equal(systemsBridge('').api.exerciseContextHTML(coreOf('cache', 'rust'), 'rust'), '');
});

test('sistemas: el contexto marca el núcleo verificado por el laboratorio', () => {
  const core = coreOf('cache', 'rust');
  const labState = { records: { [core]: passedRecord(labExercise('', core), false) } };
  const { api } = systemsBridge('?sistema=cache', labState);
  assert.match(api.exerciseContextHTML(core, 'rust'), /<span>✓ Núcleo verificado<\/span>/);
  assert.match(
    api.exerciseContextHTML(coreOf('cache', 'go'), 'go'),
    /Tres pruebas para verificar el núcleo/,
  );
});

// Título con HTML, comillas y &: debe aparecer escapado, nunca como marcado.
const hostileTitle = 'Caché <b>"rápida"</b> & cía';
const escapedTitle = 'Caché &lt;b&gt;&quot;rápida&quot;&lt;/b&gt; &amp; cía';

test('escape: el título del primer mundo de campaña se muestra escapado en el contexto', () => {
  const campaign = campaignBridge('?campana=rust-world-1', { records: {} }, (context) => {
    const [firstWorld] = context.RUST_CAMPAIGN as { title: string }[];
    assert.ok(firstWorld, 'RUST_CAMPAIGN está vacío');
    firstWorld.title = hostileTitle;
  });
  const html = campaign.exerciseContextHTML('rust-02', 'rust');
  assert.ok(html.includes(`← ${escapedTitle}</a>`), html);
  assert.ok(!html.includes('<b>'), 'el título inyectó una etiqueta b');
});

test('escape: el título del primer taller de Sistemas se muestra escapado en el contexto', () => {
  const { api } = systemsBridge('?sistema=cache', { records: {} }, (context) => {
    const firstWorkshop = context.SYSTEMS_LOWLEVEL?.workshops[0];
    assert.ok(firstWorkshop, 'SYSTEMS_LOWLEVEL no tiene talleres');
    firstWorkshop.title = hostileTitle;
  });
  const html = api.exerciseContextHTML(coreOf('cache', 'rust'), 'rust');
  assert.ok(html.includes(`← ${escapedTitle}</a>`), html);
  assert.ok(!html.includes('<b>'), 'el título inyectó una etiqueta b');
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
