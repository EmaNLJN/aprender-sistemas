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
import { FakeElement, FakeText } from './lib/fake-dom.ts';
import { loadAppShell, type AppShellModule } from './lib/legacy-sources.ts';
import { bundleApp, runSource } from './lib/sources.ts';

const ENTRY = 'frontend/src/app/main.tsx';
const VIEWS = [
  'recorrido',
  'campana',
  'sistemas',
  'atlas',
  'laboratorio',
  'biblioteca',
  'proyecto',
  'metodo',
] as const;
const ELEMENT_IDS = [
  'main',
  'save-label',
  'toast',
  'sidebar-language',
  'sidebar-completed',
  'sidebar-percent',
  'sidebar-progress',
  'resource-count',
  'lesson-dialog',
  'lesson-content',
  'confirm-dialog',
  'cancel-reset',
  'confirm-reset',
  'import-file',
  'export-progress',
];

type Listener = () => void;

interface BootHarness {
  context: vm.Context;
  elements: Record<string, FakeElement>;
  storage: Map<string, string>;
  // Excepciones y errores que la app reporta sin lanzar (console.error, reportError, timers).
  errors: string[];
  // Excepción que escapó de la evaluación de main.tsx; los adaptadores ya están publicados.
  bootError?: string;
  storageCalls: string[];
  storageAccesses: number;
  intervals: number;
  listenerCount(): number;
  navigate(view: string): void;
  flush(): Promise<void>;
}

interface HarnessOptions {
  blockStorage?: boolean;
}

// Los errores creados dentro del contexto vm no son `instanceof Error` del host.
function describeError(value: unknown): string {
  const stack = (value as { stack?: unknown } | null)?.stack;
  return typeof stack === 'string' ? stack : String(value);
}

function createBootHarness(options: HarnessOptions = {}): BootHarness {
  const elements: Record<string, FakeElement> = {};
  for (const id of ELEMENT_IDS) elements[id] = new FakeElement('div', id);
  elements['import-file'] = new FakeElement('input', 'import-file');
  elements['skip-link'] = new FakeElement('a');
  const languageButtons = ['rust', 'go'].map((language) => {
    const button = new FakeElement('button');
    button.dataset.language = language;
    return button;
  });
  const viewLinks = VIEWS.map((view) => {
    const link = new FakeElement('a');
    link.dataset.view = view;
    return link;
  });
  const errors: string[] = [];
  const storage = new Map<string, string>();
  const storageCalls: string[] = [];
  const trackedElements: FakeElement[] = [];
  const counters = { storageAccesses: 0, intervals: 0 };
  const listeners = new Map<string, Listener[]>();
  const timers: (() => void)[] = [];
  const location = {
    search: '',
    hash: '',
    get href() {
      return `http://taller.test/${this.search}${this.hash}`;
    },
  };
  const create = (tag: string): FakeElement => {
    const element = new FakeElement(tag);
    element.ownerDocument = document;
    trackedElements.push(element);
    return element;
  };
  // El DOM falso no parsea HTML: un id que aparece en el marcado de #main se registra
  // como elemento vacío, para que el código de la vista pueda escribir en él.
  const byId = (id: string): FakeElement | null => {
    const known = elements[id];
    if (known) return known;
    if (!elements['main']?.innerHTML.includes(`id="${id}"`)) return null;
    const created = create('div');
    elements[id] = created;
    return created;
  };
  const document: Record<string, unknown> = {
    nodeType: 9,
    nodeName: '#document',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    activeElement: null,
    querySelector: (selector: string) =>
      selector.startsWith('#')
        ? byId(selector.slice(1))
        : selector === '.skip-link'
          ? elements['skip-link']
          : null,
    querySelectorAll: (selector: string) =>
      selector === '[data-language]'
        ? languageButtons
        : selector === '[data-view]'
          ? viewLinks
          : [],
    getElementById: byId,
    createElement: create,
    createElementNS: (_namespace: string, tag: string) => create(tag),
    createTextNode: (text: string) => new FakeText(text),
  };
  document.body = create('body');
  document.documentElement = create('html');
  for (const element of Object.values(elements)) element.ownerDocument = document;
  trackedElements.push(...Object.values(elements), ...languageButtons, ...viewLinks);
  const context = {
    console: {
      error: (...args: unknown[]) => errors.push(args.map(describeError).join(' ')),
      warn: () => undefined,
      log: () => undefined,
    },
    reportError: (error: unknown) => errors.push(describeError(error)),
    URL,
    URLSearchParams,
    Blob,
    TextEncoder,
    TextDecoder,
    queueMicrotask,
    performance,
    structuredClone,
    document,
    location,
    navigator: { userAgent: 'node', platform: 'Linux', vendor: '', language: 'es' },
    history: { replaceState: () => undefined },
    get localStorage() {
      counters.storageAccesses++;
      if (options.blockStorage) throw new Error('storage is blocked');
      return {
        getItem: (key: string) => {
          storageCalls.push(`getItem ${key}`);
          return storage.get(key) ?? null;
        },
        setItem: (key: string, value: string) => {
          storageCalls.push(`setItem ${key}`);
          storage.set(key, String(value));
        },
        removeItem: (key: string) => {
          storageCalls.push(`removeItem ${key}`);
          storage.delete(key);
        },
      };
    },
    // Los temporizadores se encolan y `flush` los ejecuta: React planifica su render así.
    setTimeout: (callback: () => void) => timers.push(callback),
    clearTimeout: () => undefined,
    requestAnimationFrame: (callback: () => void) => timers.push(callback),
    cancelAnimationFrame: () => undefined,
    setInterval: () => ++counters.intervals,
    clearInterval: () => undefined,
    addEventListener: (type: string, listener: Listener) =>
      listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    removeEventListener: (type: string, listener: Listener) =>
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((item) => item !== listener),
      ),
    scrollTo: () => undefined,
    // react-dom hace instanceof contra estos constructores del navegador.
    HTMLIFrameElement: class {},
    HTMLElement: FakeElement,
    Element: FakeElement,
    Node: class {},
  } as Record<string, unknown>;
  context.window = context;
  context.self = context;
  document.defaultView = context;
  vm.createContext(context);
  return {
    context,
    elements,
    storage,
    errors,
    storageCalls,
    get storageAccesses() {
      return counters.storageAccesses;
    },
    get intervals() {
      return counters.intervals;
    },
    listenerCount() {
      const windowListeners = [...listeners.values()].reduce((sum, item) => sum + item.length, 0);
      return trackedElements.reduce(
        (sum, element) =>
          sum + [...element.listeners.values()].reduce((count, item) => count + item.length, 0),
        windowListeners,
      );
    },
    navigate(view) {
      location.hash = `#${view}`;
      for (const listener of listeners.get('hashchange') ?? []) listener();
    },
    // Deja correr los microtasks (React los usa) y después los temporizadores
    // encolados, hasta que no quede trabajo pendiente o se agote el tope.
    async flush() {
      for (let round = 0; round < 1000; round++) {
        await new Promise((resolve) => setImmediate(resolve));
        const callback = timers.shift();
        if (!callback) return;
        try {
          callback();
        } catch (error) {
          errors.push(describeError(error));
        }
      }
    },
  };
}

async function boot(initialStorage: Record<string, string> = {}): Promise<BootHarness> {
  const harness = createBootHarness();
  for (const [key, text] of Object.entries(initialStorage)) harness.storage.set(key, text);
  try {
    vm.runInContext(bundleApp(ENTRY), harness.context, { filename: ENTRY });
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

function evaluateWithoutStartCall(options: HarnessOptions = {}): UnstartedApp {
  const harness = createBootHarness(options);
  vm.runInContext(bundleApp(ENTRY, { withoutStartCall: true }), harness.context, {
    filename: ENTRY,
  });
  return { harness, startApp: loadAppShell(harness.context).startApp };
}

await test('main.tsx without its call evaluates quietly and leaves #main empty', () => {
  const { harness } = evaluateWithoutStartCall({ blockStorage: true });
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

await test('startApp initializes in order and draws the first view', () => {
  const { harness, startApp } = evaluateWithoutStartCall();
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

await test('a second startApp call fails', () => {
  const { harness, startApp } = evaluateWithoutStartCall();
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

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
