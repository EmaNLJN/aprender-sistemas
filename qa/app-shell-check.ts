/* Caracterización de app.js: shell, recorrido y respaldo global de progreso.
 * node qa/app-shell-check.ts
 * Ejecuta content.js y app.js sobre un DOM falso mínimo (sin dependencias) y adaptadores
 * falsos de Lab, Campaña, Sistemas y Atlas que registran sus llamadas. Fija el
 * comportamiento vigente (ADR 0003: carga sin escritura, respaldo antes de perder datos,
 * avisos acumulados e importación atómica).
 * Los valores esperados están escritos a mano desde el contrato del respaldo y de content.js.
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { plainJson } from './lib/plain-json.ts';
import { runSource } from './lib/sources.ts';

const STORAGE_KEY = 'taller-learning-v1';
const BACKUP_KEY = 'taller-learning-v1:respaldo';
const FIXED_NOW = '2026-03-04T05:06:07.000Z';

type Handler = (event: FakeEvent) => unknown;
interface FakeEvent {
  type: string;
  target: FakeElement;
  preventDefault(): void;
  [extra: string]: unknown;
}
interface FakeFile {
  size: number;
  text(): Promise<string>;
}

class FakeClassList {
  readonly names = new Set<string>();
  add(name: string): void {
    this.names.add(name);
  }
  remove(name: string): void {
    this.names.delete(name);
  }
  contains(name: string): boolean {
    return this.names.has(name);
  }
  toggle(name: string, force?: boolean): boolean {
    const on = force ?? !this.names.has(name);
    if (on) this.names.add(name);
    else this.names.delete(name);
    return on;
  }
}

class FakeElement {
  readonly dataset: Record<string, string> = {};
  readonly classList = new FakeClassList();
  readonly style: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Handler[]>();
  readonly children: FakeElement[] = [];
  files: FakeFile[] = [];
  innerHTML = '';
  textContent = '';
  value = '';
  checked = false;
  hidden = false;
  open = false;
  href = '';
  download = '';
  max = 0;
  isConnected = true;
  clicks = 0;
  focused = 0;

  readonly tag: string;
  readonly id: string;

  constructor(tag: string, id = '') {
    this.tag = tag;
    this.id = id;
  }

  addEventListener(type: string, handler: Handler): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]);
  }
  removeEventListener(type: string, handler: Handler): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((item) => item !== handler),
    );
  }
  // Despacha un evento a mano y espera a los manejadores asíncronos.
  async dispatch(type: string, extra: Record<string, unknown> = {}): Promise<void> {
    const event: FakeEvent = { type, target: this, preventDefault: () => undefined, ...extra };
    for (const handler of this.listeners.get(type) ?? []) await handler(event);
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  toggleAttribute(name: string, force?: boolean): boolean {
    const on = force ?? !this.attributes.has(name);
    if (on) this.attributes.set(name, '');
    else this.attributes.delete(name);
    return on;
  }
  focus(): void {
    this.focused++;
  }
  click(): void {
    this.clicks++;
    void this.dispatch('click');
  }
  closest(): FakeElement | null {
    return null;
  }
  querySelector(): FakeElement | null {
    return null;
  }
  querySelectorAll(): FakeElement[] {
    return [];
  }
  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }
  remove(): void {
    this.isConnected = false;
  }
  scrollIntoView(): void {}
  select(): void {}
  showModal(): void {
    this.open = true;
  }
  close(): void {
    this.open = false;
    void this.dispatch('close');
  }
}

class FakeBlob {
  readonly parts: string[];
  readonly options: { type?: string };
  readonly text: string;

  constructor(parts: string[], options: { type?: string } = {}) {
    this.parts = parts;
    this.options = options;
    this.text = parts.join('');
  }
}

interface Timer {
  callback: () => void;
  delay: number;
}

interface Harness {
  context: vm.Context;
  elements: Record<string, FakeElement>;
  calls: string[];
  callArgs: Record<string, unknown>;
  blobs: FakeBlob[];
  revoked: string[];
  timers: Timer[];
  storage: Map<string, string>;
  downloads: FakeElement[];
  toast(): string;
  languageButtons: FakeElement[];
  storedState(): Record<string, unknown>;
}

interface HarnessOptions {
  hash?: string;
  search?: string;
  stored?: unknown;
  storedRaw?: string;
  blocked?: boolean;
  backup?: string;
  warnings?: Partial<Record<'lab' | 'campaign' | 'systems', string>>;
  failValidate?: Partial<Record<'lab' | 'campaign' | 'systems', string>>;
  failImport?: Partial<Record<'lab' | 'campaign' | 'systems', string>>;
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
];

// Datos controlados que devuelven los adaptadores al exportar.
const labExport = { version: 1, marker: 'lab', records: {} };
const campaignExport = { version: 1, marker: 'campaign', xp: 30 };
const systemsExport = { version: 1, marker: 'systems', workshops: {} };

function buildHarness(options: HarnessOptions = {}): Harness {
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
  const storage = new Map<string, string>();
  if (options.stored !== undefined) storage.set(STORAGE_KEY, JSON.stringify(options.stored));
  if (options.storedRaw !== undefined) storage.set(STORAGE_KEY, options.storedRaw);
  if (options.backup !== undefined) storage.set(BACKUP_KEY, options.backup);

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
  const adapter = (prefix: string, key: 'lab' | 'campaign' | 'systems', exported: object) => ({
    exportState: () => (record(`${prefix}.exportState`), exported),
    validateImport: (raw: unknown) => {
      record(`${prefix}.validateImport`, [raw]);
      const failure = options.failValidate?.[key];
      if (failure) throw new Error(failure);
    },
    importState: (raw: unknown) => {
      record(`${prefix}.importState`, [raw]);
      const failure = options.failImport?.[key];
      if (failure) throw new Error(failure);
    },
    reset: () => record(`${prefix}.reset`),
  });
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
        if (options.blocked) throw new Error('almacenamiento bloqueado');
        storage.set(key, String(value));
      },
      removeItem: (key: string) => {
        if (options.blocked) throw new Error('almacenamiento bloqueado');
        storage.delete(key);
      },
    },
    history: { replaceState: () => undefined },
    navigator: {},
    setTimeout: (callback: () => void, delay: number) => timers.push({ callback, delay }),
    clearTimeout: () => undefined,
    setInterval: () => 0,
    clearInterval: () => undefined,
    addEventListener: () => undefined,
    scrollTo: () => undefined,
    TallerLab: {
      ...adapter('Lab', 'lab', labExport),
      loadWarning: () => options.warnings?.lab ?? '',
      mount: () => record('Lab.mount'),
      unmount: () => record('Lab.unmount'),
      getExercises: () => (record('Lab.getExercises'), []),
    },
    TallerCampaign: {
      init: () => (record('Campaign.init'), { loadWarning: options.warnings?.campaign ?? '' }),
      sync: () => record('Campaign.sync'),
      mount: () => record('Campaign.mount'),
      unmount: () => record('Campaign.unmount'),
    },
    TallerCampaignEngine: adapter('CampaignEngine', 'campaign', campaignExport),
    TallerSystems: {
      init: () => (record('Systems.init'), { loadWarning: options.warnings?.systems ?? '' }),
      mount: () => record('Systems.mount'),
      unmount: () => record('Systems.unmount'),
      resetSimulations: () => record('Systems.resetSimulations'),
    },
    TallerSystemsEngine: adapter('SystemsEngine', 'systems', systemsExport),
    TallerAtlas: {
      mount: () => record('Atlas.mount'),
      unmount: () => record('Atlas.unmount'),
    },
  } as Record<string, unknown>;
  context.window = context;
  vm.createContext(context);
  runSource(context, 'content.js');
  runSource(context, 'app.js');
  return {
    context,
    elements,
    calls,
    callArgs,
    blobs,
    revoked,
    timers,
    storage,
    downloads,
    languageButtons,
    toast: () => elements['toast']?.textContent ?? '',
    storedState: () => JSON.parse(storage.get(STORAGE_KEY) ?? 'null') as Record<string, unknown>,
  };
}

function importFile(harness: Harness, text: string): Promise<void> {
  const input = harness.elements['import-file'];
  assert.ok(input);
  input.files = [{ size: text.length, text: () => Promise.resolve(text) }];
  return input.dispatch('change');
}

async function exportedProgress(harness: Harness): Promise<Record<string, unknown>> {
  const before = harness.blobs.length;
  await harness.elements['export-progress']?.dispatch('click');
  const blob = harness.blobs[before];
  assert.ok(blob, 'la exportación no creó un Blob');
  return JSON.parse(blob.text) as Record<string, unknown>;
}

const localProgress = {
  version: 1,
  language: 'go',
  completed: ['rust-ownership', 'go-save'],
  milestones: ['go-memory'],
  favorites: ['rustlings'],
  quizAnswers: { 'rust-ownership': 1, 'go-save': 0 },
  notes: {
    rust: { learned: 'rust local aprendido', next: 'rust local siguiente' },
    go: { learned: 'go local aprendido', next: 'go local siguiente' },
  },
  minutes: 45,
};

const validImport = {
  version: 1,
  language: 'rust',
  completed: ['go-save', 'rust-first-session'],
  milestones: ['go-files', 'rust-memory'],
  favorites: ['rustlings', 'go-tour'],
  quizAnswers: { 'rust-ownership': 2, 'rust-errors': 0 },
  notes: {
    rust: { learned: 'rust importado', next: '' },
    go: { learned: '', next: 'go importado siguiente' },
  },
  minutes: 15,
  lab: { marker: 'lab-importado' },
  campaign: { marker: 'campaign-importado' },
  systems: { marker: 'systems-importado' },
};

let passed = 0;
let failed = 0;
async function test(name: string, run: () => Promise<void> | void): Promise<void> {
  try {
    await run();
    passed++;
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failed++;
    process.stderr.write(`FAIL ${name}\n${(error as Error).stack}\n`);
  }
}

await test('a) exportar: Blob JSON con el recorrido en la raíz y los adaptadores', async () => {
  const harness = buildHarness({ stored: localProgress });
  const exported = await exportedProgress(harness);
  assert.deepEqual(exported, {
    version: 1,
    language: 'go',
    completed: ['rust-ownership', 'go-save'],
    milestones: ['go-memory'],
    favorites: ['rustlings'],
    quizAnswers: { 'rust-ownership': 1, 'go-save': 0 },
    notes: localProgress.notes,
    minutes: 45,
    lab: labExport,
    campaign: campaignExport,
    systems: systemsExport,
    exportedAt: '2026-03-04T05:06:07.000Z',
  });
  assert.equal(harness.blobs[0]?.options.type, 'application/json');
  assert.deepEqual(Object.keys(exported), [
    'version',
    'language',
    'completed',
    'milestones',
    'favorites',
    'quizAnswers',
    'notes',
    'minutes',
    'lab',
    'campaign',
    'systems',
    'exportedAt',
  ]);
});

await test('a) exportar: descarga taller-progreso-AAAA-MM-DD.json y avisa', async () => {
  const harness = buildHarness({ stored: localProgress });
  await exportedProgress(harness);
  const link = harness.downloads[0];
  assert.ok(link);
  assert.equal(link.download, 'taller-progreso-2026-03-04.json');
  assert.equal(link.href, 'blob:fake-1');
  assert.equal(link.clicks, 1);
  assert.equal(link.isConnected, false);
  assert.equal(harness.toast(), 'Copia de progreso exportada.');
  assert.deepEqual(harness.revoked, []);
  const revoke = harness.timers.find((timer) => timer.delay === 1000);
  assert.ok(revoke, 'falta el temporizador que libera la URL');
  revoke.callback();
  assert.deepEqual(harness.revoked, ['blob:fake-1']);
});

await test('b) importar una copia válida combina el recorrido y llama a cada adaptador', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), 'Copia importada y combinada con tu avance actual.');
  const state = harness.storedState();
  assert.deepEqual(state.completed, ['rust-ownership', 'go-save', 'rust-first-session']);
  assert.deepEqual(state.milestones, ['go-memory', 'go-files', 'rust-memory']);
  assert.deepEqual(state.favorites, ['rustlings', 'go-tour']);
  assert.deepEqual(state.quizAnswers, { 'rust-ownership': 2, 'go-save': 0, 'rust-errors': 0 });
  assert.equal(harness.elements['import-file']?.value, '');
});

await test('b) importar: una nota no vacía pisa la local y una vacía no', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, JSON.stringify(validImport));
  assert.deepEqual(harness.storedState().notes, {
    rust: { learned: 'rust importado', next: 'rust local siguiente' },
    go: { learned: 'go local aprendido', next: 'go importado siguiente' },
  });
});

await test('b) importar: se conservan los minutes y el language locales', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, JSON.stringify(validImport));
  const state = harness.storedState();
  assert.equal(state.minutes, 45);
  assert.equal(state.language, 'go');
});

await test('b) importar: valida primero y después importa en lab, campaña y sistemas', async () => {
  const harness = buildHarness({ stored: localProgress });
  const before = harness.calls.length;
  await importFile(harness, JSON.stringify(validImport));
  const importCalls = harness.calls
    .slice(before)
    .filter((name) => /validateImport|importState/.test(name));
  assert.deepEqual(importCalls, [
    'CampaignEngine.validateImport',
    'Lab.validateImport',
    'SystemsEngine.validateImport',
    'CampaignEngine.importState',
    'Lab.importState',
    'SystemsEngine.importState',
  ]);
  assert.deepEqual(plainJson(harness.callArgs['CampaignEngine.importState']), {
    marker: 'campaign-importado',
  });
  assert.deepEqual(plainJson(harness.callArgs['Lab.importState']), { marker: 'lab-importado' });
  assert.deepEqual(plainJson(harness.callArgs['SystemsEngine.importState']), {
    marker: 'systems-importado',
  });
});

await test('b) importar: sin lab, campaign ni systems no llama a ningún adaptador', async () => {
  const harness = buildHarness({ stored: localProgress });
  const adapterKeys = ['lab', 'campaign', 'systems'];
  const onlyRoute = Object.fromEntries(
    Object.entries(validImport).filter(([key]) => !adapterKeys.includes(key)),
  );
  await importFile(harness, JSON.stringify(onlyRoute));
  assert.equal(harness.toast(), 'Copia importada y combinada con tu avance actual.');
  assert.deepEqual(
    harness.calls.filter((name) => /validateImport|importState/.test(name)),
    [],
  );
});

await test('c) copia con version 2: no aplica nada y avisa el formato', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, JSON.stringify({ ...validImport, version: 2 }));
  assert.equal(harness.toast(), 'No se pudo importar: Formato de progreso no compatible.');
  assert.deepEqual(harness.storedState(), localProgress);
  assert.deepEqual(
    harness.calls.filter((name) => /validateImport|importState/.test(name)),
    [],
  );
});

await test('d) JSON roto: el aviso dice que no contiene JSON válido', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, '{"version": 1, ');
  assert.equal(harness.toast(), 'No se pudo importar: el archivo no contiene JSON válido.');
  assert.deepEqual(harness.storedState(), localProgress);
});

await test('d) archivo mayor de 10 MB: se rechaza antes de leerlo', async () => {
  const harness = buildHarness({ stored: localProgress });
  const input = harness.elements['import-file'];
  assert.ok(input);
  input.files = [{ size: 10 * 1024 * 1024 + 1, text: () => Promise.reject(new Error('leído')) }];
  await input.dispatch('change');
  assert.equal(
    harness.toast(),
    'No se pudo importar: El archivo supera el tamaño permitido (10 MB).',
  );
});

await test('e) atomicidad: si validateImport de Sistemas lanza, nada se importa', async () => {
  const harness = buildHarness({
    stored: localProgress,
    failValidate: { systems: 'Sistemas rechazó la copia.' },
  });
  const before = await exportedProgress(harness);
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), 'No se pudo importar: Sistemas rechazó la copia.');
  assert.deepEqual(
    harness.calls.filter((name) => name.endsWith('.importState')),
    [],
  );
  assert.deepEqual(harness.storedState(), localProgress);
  assert.deepEqual(await exportedProgress(harness), before);
});

await test('e) atomicidad: si importState de Sistemas lanza a mitad, notas y pasos locales no cambian', async () => {
  const harness = buildHarness({
    stored: localProgress,
    failImport: { systems: 'Sistemas falló al aplicar.' },
  });
  const before = await exportedProgress(harness);
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), 'No se pudo importar: Sistemas falló al aplicar.');
  assert.deepEqual(
    harness.calls.filter((name) => name.endsWith('.importState')),
    ['CampaignEngine.importState', 'Lab.importState', 'SystemsEngine.importState'],
  );
  const after = await exportedProgress(harness);
  assert.deepEqual(after.notes, localProgress.notes);
  assert.deepEqual(after.completed, localProgress.completed);
  assert.deepEqual(after.milestones, localProgress.milestones);
  assert.deepEqual(after.favorites, localProgress.favorites);
  assert.deepEqual(after.quizAnswers, localProgress.quizAnswers);
  assert.deepEqual(after, before);
  assert.deepEqual(harness.storedState(), localProgress);
});

const unknownProgress = {
  version: 1,
  language: 'go',
  completed: ['paso-desconocido', 'go-save'],
  milestones: ['go-memory', 'go-inexistente'],
  favorites: ['favorito-inexistente', 'go-tour'],
  quizAnswers: { 'go-save': 1, 'paso-desconocido': 0 },
  notes: { go: { learned: 42, next: 'sigo con tests' } },
  minutes: 99,
};
const droppedNotice =
  'Se descartaron 6 registros del recorrido que esta versión no reconoce; se conservó una copia en taller-learning-v1:respaldo.';

await test('f) cargar no escribe taller-learning-v1, ni siquiera con datos que se descartan', () => {
  const raw = JSON.stringify(unknownProgress);
  const harness = buildHarness({ storedRaw: raw });
  assert.equal(harness.storage.get(STORAGE_KEY), raw);
  const empty = buildHarness();
  assert.equal(empty.storage.has(STORAGE_KEY), false);
  assert.equal(empty.storage.has(BACKUP_KEY), false);
  assert.equal(empty.toast(), '');
});

await test('f) con descartes: respaldo con el texto original, aviso y estado podado en memoria', async () => {
  const raw = JSON.stringify(unknownProgress);
  const harness = buildHarness({ storedRaw: raw });
  assert.equal(harness.storage.get(BACKUP_KEY), raw);
  assert.equal(harness.toast(), droppedNotice);
  const exported = await exportedProgress(harness);
  assert.equal(exported.language, 'go');
  assert.deepEqual(exported.completed, ['go-save']);
  assert.deepEqual(exported.milestones, ['go-memory']);
  assert.deepEqual(exported.favorites, ['go-tour']);
  assert.deepEqual(exported.quizAnswers, { 'go-save': 1 });
  assert.deepEqual(exported.notes, {
    rust: { learned: '', next: '' },
    go: { learned: '', next: 'sigo con tests' },
  });
  assert.equal(exported.minutes, 25);
});

await test('f) la primera acción del alumno guarda el estado podado y conserva el respaldo', () => {
  const raw = JSON.stringify(unknownProgress);
  const harness = buildHarness({ storedRaw: raw });
  void harness.languageButtons[0]?.dispatch('click');
  assert.equal(harness.storedState().language, 'rust');
  assert.deepEqual(harness.storedState().completed, ['go-save']);
  assert.equal(harness.storage.get(BACKUP_KEY), raw);
});

await test('f) un respaldo previo no se pisa al cargar datos con descartes', () => {
  const harness = buildHarness({
    storedRaw: JSON.stringify(unknownProgress),
    backup: 'respaldo anterior',
  });
  assert.equal(harness.storage.get(BACKUP_KEY), 'respaldo anterior');
});

await test('f) JSON ilegible: respaldo, aviso y la clave queda intacta', async () => {
  const harness = buildHarness({ storedRaw: '{roto' });
  assert.equal(harness.storage.get(BACKUP_KEY), '{roto');
  assert.equal(harness.storage.get(STORAGE_KEY), '{roto');
  assert.equal(
    harness.toast(),
    'No se pudo leer el progreso del recorrido guardado; se conservó una copia en taller-learning-v1:respaldo.',
  );
  const exported = await exportedProgress(harness);
  assert.equal(exported.language, 'rust');
  assert.deepEqual(exported.completed, []);
});

await test('f) una copia de otra forma o versión avisa y arranca con valores por defecto', async () => {
  for (const stored of ['no es un objeto de progreso', { ...localProgress, version: 2 }]) {
    const harness = buildHarness({ stored });
    assert.equal(
      harness.toast(),
      'No se pudo leer el progreso del recorrido guardado; se conservó una copia en taller-learning-v1:respaldo.',
    );
    assert.equal(harness.storage.get(BACKUP_KEY), JSON.stringify(stored));
    assert.deepEqual((await exportedProgress(harness)).completed, []);
  }
});

await test('f) con el almacenamiento bloqueado: aviso de no disponible y la app funciona', async () => {
  const harness = buildHarness({ blocked: true });
  assert.equal(
    harness.toast(),
    'No se pudo leer o guardar el avance. Podés exportarlo al terminar.',
  );
  assert.equal(harness.elements['save-label']?.textContent, 'Exportá para conservar tu avance');
  assert.deepEqual((await exportedProgress(harness)).completed, []);
});

await test('avisos: los de campaña y laboratorio se muestran juntos en un único toast', () => {
  const harness = buildHarness({
    warnings: { campaign: 'Aviso de campaña.', lab: 'Aviso del laboratorio.' },
  });
  assert.equal(harness.toast(), 'Aviso de campaña. · Aviso del laboratorio.');
});

await test('avisos: recorrido, campaña, Sistemas y laboratorio se acumulan sin perder ninguno', () => {
  const harness = buildHarness({
    storedRaw: '{roto',
    warnings: { campaign: 'C.', systems: 'S.', lab: 'L.' },
  });
  assert.equal(
    harness.toast(),
    'No se pudo leer el progreso del recorrido guardado; se conservó una copia en taller-learning-v1:respaldo. · C. · S. · L.',
  );
});

await test('h) borrar todo: elimina el respaldo del recorrido y reinicia a los motores', () => {
  const harness = buildHarness({ stored: localProgress, backup: 'copia anterior' });
  const before = harness.calls.length;
  void harness.elements['confirm-reset']?.dispatch('click');
  assert.equal(harness.storage.has(BACKUP_KEY), false);
  assert.deepEqual(harness.storedState().completed, []);
  assert.deepEqual(
    harness.calls.slice(before).filter((name) => name.endsWith('.reset')),
    ['Lab.reset', 'CampaignEngine.reset', 'SystemsEngine.reset'],
  );
  assert.equal(harness.toast(), 'Progreso reiniciado. Un nuevo comienzo.');
});

const milestoneSuffixes = ['memory', 'commands', 'files', 'measure', 'network'];

function renderedMilestones(harness: Harness): string[] {
  const html = harness.elements['main']?.innerHTML ?? '';
  return [...html.matchAll(/data-milestone="([^"]+)"/g)].map((match) => match[1] ?? '');
}

await test('g) hitos: #proyecto muestra los 5 hitos del lenguaje activo (rust)', () => {
  const harness = buildHarness({ hash: '#proyecto' });
  assert.deepEqual(
    renderedMilestones(harness),
    milestoneSuffixes.map((suffix) => `rust-${suffix}`),
  );
  const html = harness.elements['main']?.innerHTML ?? '';
  assert.match(html, /PROYECTO PERSONAL · 0 \/ 5 HITOS/);
  assert.match(html, /Un pequeño almacén clave-valor en Rust\./);
});

await test('g) hitos: con Go activo aparecen go-* y el avance marca los completados', () => {
  const harness = buildHarness({
    hash: '#proyecto',
    stored: { ...localProgress, milestones: ['go-memory', 'rust-files'] },
  });
  assert.deepEqual(
    renderedMilestones(harness),
    milestoneSuffixes.map((suffix) => `go-${suffix}`),
  );
  const html = harness.elements['main']?.innerHTML ?? '';
  assert.match(html, /PROYECTO PERSONAL · 1 \/ 5 HITOS/);
  assert.match(html, /data-milestone="go-memory"[^>]* checked>/);
  assert.doesNotMatch(html, /data-milestone="go-files"[^>]* checked>/);
});

await test('shell: al cargar se inicializan campaña y Sistemas y se sincroniza la barra lateral', () => {
  const harness = buildHarness({ hash: '#proyecto' });
  assert.ok(harness.calls.includes('Campaign.init'));
  assert.ok(harness.calls.includes('Systems.init'));
  assert.equal(harness.elements['sidebar-language']?.textContent, 'RUST');
  assert.equal(harness.elements['sidebar-completed']?.textContent, '0 de 12');
  assert.equal(harness.context.document.body.dataset.language, 'rust');
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
