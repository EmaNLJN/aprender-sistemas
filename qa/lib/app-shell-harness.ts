import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadAppShell, loadGuideContent } from './legacy-sources.ts';
import { APP_ADAPTER_METHODS, APP_ADAPTER_NAMES, type AdapterName } from './app-adapters.ts';
import { FakeBlob, FakeElement } from './fake-dom.ts';

export const STORAGE_KEY = 'taller-learning-v1';
export const BACKUP_KEY = 'taller-learning-v1:respaldo';
const FIXED_NOW = '2026-03-04T05:06:07.000Z';

export interface Timer {
  callback: () => void;
  delay: number;
}

export interface Harness {
  context: vm.Context;
  elements: Record<string, FakeElement>;
  calls: string[];
  callArgs: Record<string, unknown>;
  // Lo que la app registró con console.error.
  errors: string[];
  blobs: FakeBlob[];
  revoked: string[];
  timers: Timer[];
  storage: Map<string, string>;
  downloads: FakeElement[];
  toast(): string;
  languageButtons: FakeElement[];
  viewLinks: FakeElement[];
  storedState(): Record<string, unknown>;
  intervalCount(): number;
  listenerCount(): number;
}

export type ModuleKey = 'lab' | 'campaign' | 'systems';

export interface HarnessOptions {
  hash?: string;
  search?: string;
  stored?: unknown;
  storedRaw?: string;
  blocked?: boolean;
  // El acceso mismo a `localStorage` lanza (navegador con el almacenamiento deshabilitado).
  storageInaccessible?: boolean;
  // Lecturas válidas pero setItem lanza (cuota llena, modo privado).
  writesBlocked?: boolean;
  backup?: string;
  // Claves extra del almacenamiento (por ejemplo, las demás ranuras de respaldo).
  extraStorage?: Record<string, string>;
  warnings?: Partial<Record<ModuleKey, string>>;
  // El plan o la aplicación de la sección lanzan este mensaje.
  failPlan?: Partial<Record<ModuleKey, string>>;
  failApply?: Partial<Record<ModuleKey, string>>;
  // El plan de la sección informa que la normalización quitó datos.
  lossy?: Partial<Record<ModuleKey, boolean>>;
  // Resultado de reset de cada adaptador (por defecto, borrado completo).
  resets?: Partial<Record<ModuleKey, boolean>>;
  // Ranuras de respaldo que publica cada adaptador; la lista es mutable a propósito.
  backups?: Partial<Record<ModuleKey, { key: string; text: string }[]>>;
  // Campaña o Sistemas lanzan al sincronizar los sellos del laboratorio importado.
  failSync?: boolean;
  // Sólo la sincronización de Sistemas lanza; la de campaña funciona.
  failSystemsSync?: boolean;
  // Valor que devuelve applyImport de la sección (por defecto, true: se guardó).
  applyResults?: Partial<Record<ModuleKey, boolean>>;
}

const ids = [
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
  // Los usan la biblioteca (favoritos) y la bitácora (notas) al guardar.
  'resource-results-label',
  'resource-grid',
  'note-state',
  'tutor-prompt',
];

// Datos controlados que devuelven los adaptadores al exportar.
export const labExport = { version: 1, marker: 'lab', records: {} };
export const campaignExport = { version: 1, marker: 'campaign', xp: 30 };
export const systemsExport = { version: 1, marker: 'systems', workshops: {} };

// Los fakes salen de la lista única de métodos que app.js consume (qa/lib/app-adapters.ts):
// cada método registra su llamada como `Adaptador.método` y devuelve lo que fije `behaviors`.
type Behavior = (...args: unknown[]) => unknown;

function fakeAdapters(
  record: (name: string, args?: unknown[]) => void,
  options: HarnessOptions,
): Record<AdapterName, Record<string, Behavior>> {
  const failure = (kind: 'failPlan' | 'failApply', key: ModuleKey) => {
    const message = options[kind]?.[key];
    if (message) throw new Error(message);
  };
  const planFor = (key: ModuleKey): Behavior => {
    return (raw) => {
      failure('failPlan', key);
      return { state: raw, lossy: options.lossy?.[key] ?? false };
    };
  };
  const applyFor = (key: ModuleKey): Behavior => {
    return () => {
      failure('failApply', key);
      return options.applyResults?.[key] ?? true;
    };
  };
  const backupsFor =
    (key: ModuleKey): Behavior =>
    () =>
      options.backups?.[key] ?? [];
  const syncBehavior: Behavior = () => {
    if (options.failSync) throw new Error('sync falló');
  };
  const behaviors: Record<AdapterName, Record<string, Behavior>> = {
    TallerLab: {
      exportState: () => labExport,
      planImport: planFor('lab'),
      applyImport: applyFor('lab'),
      reset: () => options.resets?.lab ?? true,
      backups: backupsFor('lab'),
      loadWarning: () => options.warnings?.lab ?? '',
      getExercises: () => [],
    },
    TallerAtlas: {},
    TallerCampaign: {
      init: () => ({ loadWarning: options.warnings?.campaign ?? '' }),
      sync: syncBehavior,
    },
    TallerSystems: {
      init: () => ({ loadWarning: options.warnings?.systems ?? '' }),
      sync: () => {
        if (options.failSystemsSync) throw new Error('sync de Sistemas falló');
        syncBehavior();
      },
    },
    TallerCampaignEngine: {
      exportState: () => campaignExport,
      planImport: planFor('campaign'),
      applyImport: applyFor('campaign'),
      reset: () => ({ removed: options.resets?.campaign ?? true }),
      backups: backupsFor('campaign'),
    },
    TallerSystemsEngine: {
      exportState: () => systemsExport,
      planImport: planFor('systems'),
      applyImport: applyFor('systems'),
      reset: () => ({ removed: options.resets?.systems ?? true }),
      backups: backupsFor('systems'),
    },
  };
  const fakes = {} as Record<AdapterName, Record<string, Behavior>>;
  for (const name of APP_ADAPTER_NAMES) {
    const prefix = name.replace(/^Taller/, '');
    fakes[name] = {};
    for (const method of APP_ADAPTER_METHODS[name]) {
      fakes[name][method] = (...args) => {
        record(`${prefix}.${method}`, args);
        return behaviors[name][method]?.(...args);
      };
    }
  }
  return fakes;
}

// Contenido inicial del almacenamiento: el recorrido, un respaldo y las claves extra.
function initialStorage(options: HarnessOptions): Map<string, string> {
  const storage = new Map<string, string>();
  if (options.stored !== undefined) storage.set(STORAGE_KEY, JSON.stringify(options.stored));
  if (options.storedRaw !== undefined) storage.set(STORAGE_KEY, options.storedRaw);
  if (options.backup !== undefined) storage.set(BACKUP_KEY, options.backup);
  for (const [key, text] of Object.entries(options.extraStorage ?? {})) storage.set(key, text);
  return storage;
}

export function createHarness(options: HarnessOptions = {}): Harness {
  const elements: Record<string, FakeElement> = {};
  for (const id of ids) elements[id] = new FakeElement('div', id);
  elements['skip-link'] = new FakeElement('a');
  elements['import-file'] = new FakeElement('input', 'import-file');
  const languageButtons = ['rust', 'go'].map((language) => {
    const button = new FakeElement('button');
    button.dataset.language = language;
    return button;
  });
  const viewLinks = ['recorrido', 'proyecto'].map((view) => {
    const link = new FakeElement('a');
    link.dataset.view = view;
    return link;
  });
  const body = new FakeElement('body');
  const downloads: FakeElement[] = [];
  const blobs: FakeBlob[] = [];
  const revoked: string[] = [];
  const timers: Timer[] = [];
  const calls: string[] = [];
  const callArgs: Record<string, unknown> = {};
  const errors: string[] = [];
  const storage = initialStorage(options);
  const counters = { intervals: 0, windowListeners: 0 };

  const query = (selector: string): FakeElement | null => {
    if (selector.startsWith('#')) return elements[selector.slice(1)] ?? null;
    if (selector === '.skip-link') return elements['skip-link'] ?? null;
    return null;
  };
  const queryAll = (selector: string): FakeElement[] => {
    if (selector === '[data-language]') return languageButtons;
    if (selector === '[data-view]') return viewLinks;
    return [];
  };
  const document = {
    body,
    activeElement: null,
    querySelector: query,
    querySelectorAll: queryAll,
    getElementById: (id: string) => elements[id] ?? null,
    createElement: (tag: string) => {
      const element = new FakeElement(tag);
      if (tag === 'a') downloads.push(element);
      return element;
    },
  };

  class FixedDate extends Date {
    constructor(...args: [] | [string | number | Date]) {
      if (args.length === 0) super(FIXED_NOW);
      else super(args[0] as string);
    }
    static override now(): number {
      return new Date(FIXED_NOW).getTime();
    }
  }
  class FakeURL extends URL {
    static createObjectURL(blob: unknown): string {
      blobs.push(blob as FakeBlob);
      return `blob:fake-${blobs.length}`;
    }
    static revokeObjectURL(url: string): void {
      revoked.push(url);
    }
  }

  const location = {
    search: options.search ?? '',
    hash: options.hash ?? '',
    href: `http://taller.test/${options.search ?? ''}${options.hash ?? ''}`,
  };
  const record = (name: string, args: unknown[] = []): void => {
    calls.push(name);
    if (args.length) callArgs[name] = args[0];
  };
  const context = {
    URL: FakeURL,
    URLSearchParams,
    Blob: FakeBlob,
    Date: FixedDate,
    document,
    location,
    localStorage: {
      getItem: (key: string) => {
        if (options.blocked) throw new Error('almacenamiento bloqueado');
        return storage.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        if (options.blocked || options.writesBlocked) throw new Error('almacenamiento bloqueado');
        storage.set(key, String(value));
      },
      removeItem: (key: string) => {
        if (options.blocked || options.writesBlocked) throw new Error('almacenamiento bloqueado');
        storage.delete(key);
      },
    },
    console: { error: (...args: unknown[]) => errors.push(args.map(String).join(' ')) },
    history: { replaceState: () => undefined },
    navigator: {},
    setTimeout: (callback: () => void, delay: number) => timers.push({ callback, delay }),
    clearTimeout: () => undefined,
    setInterval: () => counters.intervals++,
    clearInterval: () => undefined,
    addEventListener: () => counters.windowListeners++,
    scrollTo: () => undefined,
    ...fakeAdapters(record, options),
  } as Record<string, unknown>;
  if (options.storageInaccessible) {
    Object.defineProperty(context, 'localStorage', {
      get() {
        throw new Error('acceso al almacenamiento bloqueado');
      },
    });
  }
  context.window = context;
  vm.createContext(context);
  loadGuideContent(context);
  return {
    context,
    elements,
    calls,
    callArgs,
    errors,
    blobs,
    revoked,
    timers,
    storage,
    downloads,
    languageButtons,
    viewLinks,
    toast: () => elements['toast']?.textContent ?? '',
    storedState: () => JSON.parse(storage.get(STORAGE_KEY) ?? 'null') as Record<string, unknown>,
    intervalCount: () => counters.intervals,
    listenerCount: () =>
      [...Object.values(elements), ...languageButtons, ...viewLinks].reduce(
        (sum, element) =>
          sum + [...element.listeners.values()].reduce((count, item) => count + item.length, 0),
        counters.windowListeners,
      ),
  };
}

export function buildHarness(options: HarnessOptions = {}): Harness {
  const harness = createHarness(options);
  loadAppShell(harness.context).startApp();
  return harness;
}

export function importFile(harness: Harness, text: string): Promise<void> {
  const input = harness.elements['import-file'];
  assert.ok(input);
  // Un valor previo hace significativa la aserción de que app.js limpia el input.
  input.value = 'C:\\fakepath\\copia.json';
  input.files = [{ size: text.length, text: () => Promise.resolve(text) }];
  return input.dispatch('change');
}

// El DOM falso no resuelve `closest`: el destino simulado de un clic o cambio se devuelve a sí mismo.
function actionTarget(dataset: Record<string, string>, value = ''): FakeElement {
  const target = new FakeElement('button');
  Object.assign(target.dataset, dataset);
  target.value = value;
  target.closest = () => target;
  return target;
}

// Simula un clic del alumno sobre un elemento con `data-action` dentro de #main.
export async function clickAction(
  harness: Harness,
  dataset: Record<string, string>,
): Promise<void> {
  await harness.elements['main']?.dispatch('click', { target: actionTarget(dataset) });
}

export async function changeField(
  harness: Harness,
  type: 'change' | 'input',
  dataset: Record<string, string>,
  value = '',
): Promise<void> {
  await harness.elements['main']?.dispatch(type, { target: actionTarget(dataset, value) });
}

export async function exportedProgress(harness: Harness): Promise<Record<string, unknown>> {
  const before = harness.blobs.length;
  await harness.elements['export-progress']?.dispatch('click');
  const blob = harness.blobs[before];
  assert.ok(blob, 'la exportación no creó un Blob');
  return JSON.parse(blob.text) as Record<string, unknown>;
}
