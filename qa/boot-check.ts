/* Arranque real de la aplicación: empaqueta src/app/main.tsx con esbuild (CSS ignorado,
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
import vm from 'node:vm';
import { missingAdapterMethods } from './lib/app-adapters.ts';
import { FakeElement, FakeText } from './lib/fake-dom.ts';
import { bundleApp } from './lib/sources.ts';

const ENTRY = 'src/app/main.tsx';
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
  navigate(view: string): void;
  flush(): Promise<void>;
}

// Los errores creados dentro del contexto vm no son `instanceof Error` del host.
function describeError(value: unknown): string {
  const stack = (value as { stack?: unknown } | null)?.stack;
  return typeof stack === 'string' ? stack : String(value);
}

function createBootHarness(): BootHarness {
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
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, String(value)),
      removeItem: (key: string) => void storage.delete(key),
    },
    // Los temporizadores se encolan y `flush` los ejecuta: React planifica su render así.
    setTimeout: (callback: () => void) => timers.push(callback),
    clearTimeout: () => undefined,
    requestAnimationFrame: (callback: () => void) => timers.push(callback),
    cancelAnimationFrame: () => undefined,
    setInterval: () => 0,
    clearInterval: () => undefined,
    addEventListener: (type: string, listener: Listener) =>
      listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    removeEventListener: () => undefined,
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

async function boot(): Promise<BootHarness> {
  const harness = createBootHarness();
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
async function bootApp(): Promise<BootHarness> {
  const harness = await boot();
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

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
