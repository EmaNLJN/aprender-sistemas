/* Arranque real de la aplicación: empaqueta frontend/src/app/main.tsx con esbuild (CSS ignorado,
 * JSX automático, plataforma browser) y lo ejecuta en un contexto vm con el DOM falso
 * de qa/lib/fake-dom.ts. node qa/boot-check.ts
 *
 * Cubre lo que los checks por módulo no ven: que cada adaptador real publique los
 * métodos que app.js consume (qa/lib/app-adapters.ts), que la app arranque, que cada
 * vista se pueda navegar por hash y que «Borrar todo» termine. Un adaptador al que le
 * falta un método (unmount, resetSimulations, reset...) rompe el arranque o deja el
 * reinicio a medias, y ningún check con adaptadores falsos lo detecta.
 *
 * Límite: el DOM falso no parsea HTML ni calcula layout; sólo se verifica que renderizar
 * no lance y que las vistas dejen contenido, no su aspecto.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { missingAdapterMethods } from './lib/app-adapters.ts';
import {
  createBootHarness,
  describeError,
  publishedGlobals,
  VIEWS,
  type BootHarness,
  type HarnessOptions,
} from './lib/boot-harness.ts';
import {
  createContentServer,
  type ContentBehavior,
  type ContentServer,
} from './lib/content-server.ts';
import { contentVersion, curriculumDocument } from './lib/content-document.ts';
import type { FakeElement } from './lib/fake-dom.ts';
import { loadAppShell, type AppShellModule } from './lib/legacy-sources.ts';
import { bundleApp, runSource } from './lib/sources.ts';

const ENTRY = 'frontend/src/app/main.tsx';

async function boot(
  initialStorage: Record<string, string> = {},
  server: ContentServer = createContentServer(),
): Promise<BootHarness> {
  const harness = createBootHarness({ fetch: server.fetch });
  for (const [key, text] of Object.entries(initialStorage)) harness.storage.set(key, text);
  try {
    vm.runInContext(await bundleApp(ENTRY), harness.context, { filename: ENTRY });
  } catch (error) {
    harness.bootError = describeError(error);
    return harness;
  }
  await harness.flush();
  return harness;
}

// Arranca y exige que la evaluación de main.tsx no haya lanzado.
async function bootApp(initialStorage: Record<string, string> = {}): Promise<BootHarness> {
  const harness = await boot(initialStorage);
  assert.equal(harness.bootError, undefined, 'main.tsx lanzó al evaluarse');
  return harness;
}

let passed = 0;
let failed = 0;
async function test(name: string, run: () => Promise<void> | void): Promise<void> {
  try {
    await run();
    passed++;
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failed++;
    process.stderr.write(`FAIL ${name}\n${describeError(error)}\n`);
  }
}

await test('arranque: main.tsx se evalúa sin excepciones y #main queda con contenido', async () => {
  const { elements, errors } = await bootApp();
  assert.deepEqual(errors, []);
  assert.notEqual(elements['main']?.innerHTML, '');
});

await test('adaptadores: cada window.Taller* real publica los métodos que consume app.js', async () => {
  const { context } = await boot();
  assert.deepEqual(missingAdapterMethods(context), []);
});

// Texto del encabezado que cada vista escribe en #main; es la señal de que renderizó.
const VIEW_HEADINGS: Record<(typeof VIEWS)[number], string> = {
  recorrido: 'TU TALLER DE RUST',
  campana: 'CAMPAÑA · RUST',
  sistemas: 'SISTEMAS · APRENDER DESARMANDO',
  atlas: '',
  laboratorio: 'LABORATORIO · RUST',
  biblioteca: 'RECURSOS CON INTENCIÓN',
  proyecto: 'UNA IDEA QUE CRECE CON VOS',
  metodo: 'HACER ESPACIO PARA APRENDER',
};

await test('navegación: cada vista se renderiza por hash sin lanzar', async () => {
  // Un único recorrido en la misma sesión: cada vista desmonta a la anterior.
  const harness = await bootApp();
  const main = harness.elements['main'];
  assert.ok(main);
  for (const view of VIEWS) {
    harness.navigate(view);
    await harness.flush();
    assert.deepEqual(harness.errors, [], `errores al navegar a #${view}`);
    if (view === 'atlas') {
      // El Atlas es React: monta nodos reales en #main en lugar de escribir innerHTML.
      assert.ok(main.childNodes.length > 0, 'el Atlas no montó nodos en #main');
    } else {
      assert.ok(main.innerHTML.includes(VIEW_HEADINGS[view]), `#${view} no mostró su encabezado`);
    }
  }
});

const STORAGE_KEY = 'taller-learning-v1';
const BACKUP_KEY = 'taller-learning-v1:respaldo';
const RESET_METHODS = [
  ['TallerLab', 'reset'],
  ['TallerCampaignEngine', 'reset'],
  ['TallerSystemsEngine', 'reset'],
  ['TallerSystems', 'resetSimulations'],
] as const;

await test('borrar todo: confirm-reset reinicia cada adaptador y deja el recorrido en blanco', async () => {
  const harness = await bootApp();
  const progress = { version: 1, completed: ['rust-ownership'], favorites: ['rustlings'] };
  harness.storage.set(STORAGE_KEY, JSON.stringify(progress));
  harness.storage.set(BACKUP_KEY, 'copia anterior');
  const reset: string[] = [];
  for (const [adapter, method] of RESET_METHODS) {
    const target = harness.context[adapter] as Record<string, (...args: unknown[]) => unknown>;
    const original = target[method];
    // Si falta, no se espía: el clic falla con el `not a function` real de app.js.
    if (!original) continue;
    target[method] = (...args) => (reset.push(`${adapter}.${method}`), original(...args));
  }
  await harness.elements['confirm-reset']?.dispatch('click');
  await harness.flush();
  assert.deepEqual(harness.errors, []);
  assert.deepEqual(
    reset,
    RESET_METHODS.map(([adapter, method]) => `${adapter}.${method}`),
  );
  assert.equal(harness.storage.has(BACKUP_KEY), false);
  const saved = JSON.parse(harness.storage.get(STORAGE_KEY) ?? 'null') as { completed: string[] };
  assert.deepEqual(saved.completed, []);
  assert.equal(harness.elements['toast']?.textContent, 'Progreso reiniciado. Un nuevo comienzo.');
});

// Las cuatro claves que escribió master 2a278ad: contrato congelado de compatibilidad.
const MASTER_STORAGE = JSON.parse(
  readFileSync('qa/fixtures/progress-master-2a278ad-storage.json', 'utf8'),
) as Record<string, string>;

// Un arranque sano no debe escribir, respaldar ni avisar.
function assertQuietBoot(harness: BootHarness, expected: Record<string, string>): void {
  assert.deepEqual(harness.errors, []);
  assert.deepEqual(Object.fromEntries(harness.storage), expected);
  assert.deepEqual(
    [...harness.storage.keys()].filter((key) => key.includes(':respaldo')),
    [],
  );
  assert.equal(harness.elements['toast']?.textContent, '', 'la carga mostró un aviso');
}

await test('compatibilidad: arrancar con el progreso de master no escribe, no respalda ni avisa', async () => {
  const harness = await bootApp(MASTER_STORAGE);
  assertQuietBoot(harness, MASTER_STORAGE);
});

await test('compatibilidad: lo que escribe esta versión se relee sin respaldos ni avisos', async () => {
  const first = await bootApp(MASTER_STORAGE);
  // El recorrido sólo guarda ante una acción del alumno: cambiar de idioma y volver al
  // original provoca la escritura real del mismo estado, normalizado por app.js.
  const buttons = (
    first.context.document as { querySelectorAll(s: string): FakeElement[] }
  ).querySelectorAll('[data-language]');
  const original = JSON.parse(MASTER_STORAGE['taller-learning-v1'] ?? '{}').language as string;
  for (const language of [original === 'go' ? 'rust' : 'go', original]) {
    await buttons.find((button) => button.dataset.language === language)?.dispatch('click');
    await first.flush();
  }
  const exported = (adapter: string): string =>
    JSON.stringify((first.context[adapter] as { exportState(): unknown }).exportState());
  const written: Record<string, string> = {
    'taller-learning-v1': first.storage.get('taller-learning-v1') ?? '',
    'taller-laboratorio-v1': exported('TallerLab'),
    'taller-campaign-v1': exported('TallerCampaignEngine'),
    'taller-systems-v1': exported('TallerSystemsEngine'),
  };
  const second = await bootApp(written);
  assertQuietBoot(second, written);
});

const CAMPAIGN_KEY = 'taller-campaign-v1';
const SYSTEMS_KEY = 'taller-systems-v1';
const LAB_KEY = 'taller-laboratorio-v1';
// Evidencia aprobada de rust-02 (misión del mundo 1 de Rust) tomada del laboratorio de master.
const LAB_WITH_PASSED_RUST_MISSION = MASTER_STORAGE[LAB_KEY] ?? '';

// Recorre las vistas que montan campaña, Sistemas y laboratorio: cada una sincroniza al renderizar.
async function visitProgressViews(harness: BootHarness): Promise<void> {
  for (const view of ['campana', 'sistemas', 'laboratorio']) {
    harness.navigate(view);
    await harness.flush();
  }
}

await test('integridad: una copia de campaña ilegible sobrevive al arranque y a la navegación', async () => {
  // Copia `version: 2` con un checkpoint: esta versión no la entiende y no puede fusionarla.
  const unreadable = JSON.stringify({
    version: 2,
    seals: {},
    checkpoints: { 'rust-world-1': { passed: true, lastAnswer: 0 } },
  });
  const harness = await bootApp({
    [CAMPAIGN_KEY]: unreadable,
    [LAB_KEY]: LAB_WITH_PASSED_RUST_MISSION,
  });
  assert.equal(harness.storage.get(CAMPAIGN_KEY), unreadable);
  assert.equal(harness.storage.get(`${CAMPAIGN_KEY}:respaldo`), unreadable);
  await visitProgressViews(harness);
  assert.deepEqual(harness.errors, []);
  assert.equal(
    harness.storage.get(CAMPAIGN_KEY),
    unreadable,
    'la navegación pisó la copia ilegible',
  );
  assert.equal(harness.storage.get(`${CAMPAIGN_KEY}:respaldo`), unreadable);
  assert.equal(harness.storage.has(SYSTEMS_KEY), false, 'la navegación creó la clave de Sistemas');
});

await test('integridad: con la clave de campaña ausente, arrancar y navegar no la crean', async () => {
  const harness = await bootApp({ [LAB_KEY]: LAB_WITH_PASSED_RUST_MISSION });
  await visitProgressViews(harness);
  assert.deepEqual(harness.errors, []);
  assert.equal(harness.storage.has(CAMPAIGN_KEY), false, 'se creó la clave de campaña');
  assert.equal(harness.storage.has(SYSTEMS_KEY), false, 'se creó la clave de Sistemas');
});

// Exportaciones reales de master 2a278ad y d0e1b49: contrato congelado de compatibilidad.
const FROZEN_EXPORTS = [
  'qa/fixtures/progress-master-2a278ad-export.json',
  'qa/fixtures/progress-d0e1b49-export.json',
];

for (const file of FROZEN_EXPORTS) {
  await test(`importación: ${file} se combina sin omisiones con los adaptadores reales`, async () => {
    const harness = await bootApp();
    const text = readFileSync(file, 'utf8');
    const input = harness.elements['import-file'];
    assert.ok(input);
    input.files = [{ size: text.length, text: () => Promise.resolve(text) }];
    await input.dispatch('change');
    await harness.flush();
    assert.deepEqual(harness.errors, []);
    assert.equal(
      harness.elements['toast']?.textContent,
      'Copia importada y combinada con tu avance actual.',
    );
  });
}

const LEGACY_SOURCES = [
  'frontend/app.js',
  'frontend/lab.js',
  'frontend/campaign.js',
  'frontend/systems.js',
  'frontend/lab-explorers.js',
  'frontend/quest-explorers.js',
];

await test('each legacy source evaluated alone neither throws nor touches the storage', () => {
  const problems: string[] = [];
  for (const source of LEGACY_SOURCES) {
    const harness = createBootHarness({ blockStorage: true });
    try {
      runSource(harness.context, source);
    } catch (error) {
      problems.push(`${source} threw: ${(error as Error).message}`);
      continue;
    }
    if (harness.storageAccesses !== 0) {
      problems.push(`${source} read the storage ${harness.storageAccesses} time(s)`);
    }
  }
  assert.deepEqual(problems, []);
});

interface UnstartedApp {
  harness: BootHarness;
  startApp: AppShellModule['startApp'];
}

async function evaluateWithoutStartCall(options: HarnessOptions = {}): Promise<UnstartedApp> {
  const harness = createBootHarness({ fetch: createContentServer().fetch, ...options });
  vm.runInContext(await bundleApp(ENTRY, { withoutStartCall: true }), harness.context, {
    filename: ENTRY,
  });
  await harness.flush();
  return { harness, startApp: loadAppShell(harness.context).startApp };
}

await test('main.tsx without its call evaluates quietly and leaves #main empty', async () => {
  const { harness } = await evaluateWithoutStartCall({ blockStorage: true });
  assert.equal(harness.storageAccesses, 0);
  assert.equal(harness.listenerCount(), 0);
  assert.equal(harness.intervals, 0);
  assert.equal(harness.elements['main']?.innerHTML, '');
});

const STORAGE_KEYS_IN_ORDER = [
  'taller-laboratorio-v1',
  'taller-learning-v1',
  'taller-campaign-v1',
  'taller-systems-v1',
];
const INITIALIZERS = [
  ['TallerLab', 'init'],
  ['TallerCampaign', 'init'],
  ['TallerSystems', 'init'],
] as const;

function recordInitializations(harness: BootHarness): string[] {
  const initializations: string[] = [];
  for (const [adapter, method] of INITIALIZERS) {
    const target = harness.context[adapter] as Record<string, (...args: unknown[]) => unknown>;
    const original = target[method];
    if (!original) continue;
    target[method] = (...args) => {
      const mainWasEmpty = harness.elements['main']?.innerHTML === '';
      initializations.push(`${adapter}.${method}${mainWasEmpty ? '' : ' after drawing'}`);
      return original(...args);
    };
  }
  return initializations;
}

await test('startApp initializes in order and draws the first view', async () => {
  const { harness, startApp } = await evaluateWithoutStartCall();
  const initializations = recordInitializations(harness);
  startApp();
  assert.deepEqual(initializations, [
    'TallerLab.init',
    'TallerCampaign.init',
    'TallerSystems.init',
  ]);
  const firstReads = [
    ...new Set(
      harness.storageCalls
        .filter((call) => call.startsWith('getItem '))
        .map((call) => call.slice('getItem '.length))
        .filter((key) => STORAGE_KEYS_IN_ORDER.includes(key)),
    ),
  ];
  assert.deepEqual(firstReads, STORAGE_KEYS_IN_ORDER);
  assert.notEqual(harness.elements['main']?.innerHTML, '');
});

await test('a second startApp call fails', async () => {
  const { harness, startApp } = await evaluateWithoutStartCall();
  startApp();
  const listenersBefore = harness.listenerCount();
  const intervalsBefore = harness.intervals;
  assert.throws(
    () => startApp(),
    (error: unknown) =>
      (error as Error).message === 'startApp ya se llamó: el arranque corre una sola vez.',
  );
  assert.equal(harness.listenerCount(), listenersBefore);
  assert.equal(harness.intervals, intervalsBefore);
});

const CONTENT_URL = `/content/curriculum.${contentVersion()}.json`;
const LOADING_MESSAGE = 'Cargando el contenido del taller';

await test('the gate publishes before any view or catalog exists', async () => {
  const { published } = await boot();
  assert.equal(published.length, 1, 'the gate did not publish the content once');
  assert.deepEqual(published[0]?.globals, []);
});

await test('the happy path never shows the loading state and asks for the content once', async () => {
  const server = createContentServer();
  const harness = await boot({}, server);
  assert.deepEqual(server.requests, [CONTENT_URL]);
  assert.equal(harness.published.length, 1, 'the gate did not publish the content');
  assert.deepEqual(
    harness.mainWrites.filter((markup) => markup.includes(LOADING_MESSAGE)),
    [],
  );
  assert.deepEqual(harness.errors, []);
});

function withoutPortion(): unknown {
  const document = curriculumDocument<{ lab: Record<string, unknown> }>();
  return { ...document, lab: { rust: document.lab['rust'] } };
}

function withMalformedPortion(): unknown {
  const document = curriculumDocument<{ quests: Record<string, unknown> }>();
  return { ...document, quests: { ...document.quests, rust: {} } };
}

interface FailureCase {
  mode: string;
  behavior: ContentBehavior;
  failure: string;
  extraText?: string;
}

const FAILURE_CASES: FailureCase[] = [
  { mode: 'network', behavior: { kind: 'reject' }, failure: 'network' },
  {
    mode: '404',
    behavior: { kind: 'status', status: 404 },
    failure: 'version',
    extraText: 'Recargá la página',
  },
  { mode: '500', behavior: { kind: 'status', status: 500 }, failure: 'status' },
  { mode: 'timeout', behavior: { kind: 'hang' }, failure: 'timeout' },
  { mode: 'body', behavior: { kind: 'text', body: '<html>' }, failure: 'body' },
  {
    mode: 'missing portion',
    behavior: { kind: 'document', document: withoutPortion() },
    failure: 'missing',
  },
  {
    mode: 'malformed portion',
    behavior: { kind: 'document', document: withMalformedPortion() },
    failure: 'shape',
  },
];

function retryButton(harness: BootHarness): FakeElement {
  const button = harness.elements['content-retry'];
  assert.ok(button, 'there is no «Reintentar» button');
  return button;
}

for (const { mode, behavior, failure, extraText } of FAILURE_CASES) {
  await test(`a failed content request (${mode}) leaves the views unevaluated and offers a retry`, async () => {
    const harness = await boot(MASTER_STORAGE, createContentServer([behavior]));
    assert.equal(harness.bootError, undefined);
    assert.deepEqual(harness.errors, []);
    assert.deepEqual(publishedGlobals(harness.context), []);
    assert.deepEqual(harness.storageCalls, []);
    assert.deepEqual(Object.fromEntries(harness.storage), MASTER_STORAGE);
    assert.equal(harness.elements['toast']?.textContent, '');
    const markup = harness.elements['main']?.innerHTML ?? '';
    assert.ok(markup.includes('No se pudo cargar el contenido'), 'the error is not in #main');
    assert.ok(markup.includes('Reintentar'));
    assert.ok(markup.includes(`data-failure="${failure}"`), `the failure is not ${failure}`);
    if (extraText) assert.ok(markup.includes(extraText));
    assert.equal(retryButton(harness).focused, 1);
  });
}

await test('a retry that succeeds starts the views without a second boot', async () => {
  const server = createContentServer([{ kind: 'reject' }, { kind: 'serve' }]);
  const harness = await boot({}, server);
  await retryButton(harness).dispatch('click');
  await harness.flush();
  assert.deepEqual(harness.errors, []);
  assert.ok(publishedGlobals(harness.context).includes('TallerLab'), 'the views did not start');
  const markup = harness.elements['main']?.innerHTML ?? '';
  assert.notEqual(markup, '');
  assert.equal(markup.includes('No se pudo cargar el contenido'), false);
  assert.equal(server.requests.length, 2);
});

await test('two consecutive clicks on retry make a single request', async () => {
  const server = createContentServer([{ kind: 'reject' }, { kind: 'serve' }]);
  const harness = await boot({}, server);
  const button = retryButton(harness);
  await Promise.all([button.dispatch('click'), button.dispatch('click')]);
  await harness.flush();
  assert.equal(server.requests.length, 2);
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
