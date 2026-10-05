import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { plainJson as plain } from './lib/plain-json.ts';
import {
  LAB_EXERCISE_SOURCES,
  LAB_SOURCE,
  SYSTEMS_CATALOG_SOURCES,
  loadLab,
  loadLabCatalogs,
  loadSystemsEngine,
} from './lib/legacy-sources.ts';
import { repoRoot as root } from './lib/sources.ts';
import {
  achievedBelongToWorkshop,
  assertFiniteJson,
  assertUnchanged,
  deepFreeze,
  hasSupportedTones,
  isControlContract,
  rowsMatchColumns,
} from './lib/systems-model-contract.ts';
import type { ModelView, SystemsModel } from './lib/systems-model-contract.ts';

const KEY = 'taller-systems-v1';

type Language = 'rust' | 'go';
interface Progress {
  observed: string[];
  code: boolean;
  predicted: boolean;
  answer: number | null;
  steps: number[];
  note: string;
}
type ProgressOverrides = { [Field in keyof Progress]?: unknown };
interface Backup {
  version: number;
  records: Record<string, unknown>;
}
interface WorkshopProgress {
  seals: number;
  completed: boolean;
  modelDone: boolean;
  storageAvailable: boolean;
  progress: Progress;
}
interface EngineStatus {
  storageAvailable: boolean;
  loadWarning?: string;
}
interface TestRef {
  id: string;
}
interface CatalogObjective {
  id: string;
  label: string;
  why: string;
}
interface CatalogStep {
  title: string;
  task: string;
  why: string;
  done: string;
}
interface Prediction {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}
interface Source {
  title: string;
  url: string;
}
interface FixtureWorkshop {
  id: string;
  title: string;
  model: string;
  objectives: CatalogObjective[];
  steps: CatalogStep[];
  prediction: Prediction;
  code: Record<Language, string>;
}
interface Workshop extends FixtureWorkshop {
  subtitle: string;
  story: string;
  what: string;
  why: string;
  limits: string;
  category: string;
  level: string;
  minutes: number;
  uses: string[];
  sources: Source[];
  related: Record<Language, string[]>;
  bridge: Record<Language, string>;
}
interface Exercise {
  id: string;
  language: Language;
  tests: TestRef[];
}
interface CoreTest extends TestRef {
  label: string;
  expression: string;
  why: string;
  failure: string;
}
interface Lab {
  id: string;
  topicId: string;
  topic: string;
  title: string;
  intro: string;
  why: string;
  objective: string;
  starter: string;
  solution: string;
  transfer: string;
  tests: CoreTest[];
  hints: string[];
  instructions: string[];
  imports: string[];
  level: string;
  kind: string;
  review: { success: string; pitfall: string };
  prediction: Prediction;
  sources: Source[];
}
type CatalogModel = SystemsModel<unknown, ModelView, Workshop>;
interface Config {
  workshops: FixtureWorkshop[];
  exercises: Exercise[];
  models: Record<string, unknown>;
}
interface Engine {
  init(config: Config): EngineStatus;
  get(id: string, language: string): WorkshopProgress;
  observe(
    id: string,
    language: string,
    objectives: unknown[],
  ): { added: string[]; modelDone: boolean; progress: Progress };
  answer(id: string, language: string, index: unknown): { correct: boolean; progress: Progress };
  setStep(id: string, language: string, index: number, done: boolean): unknown;
  setNote(id: string, language: string, note: string): unknown;
  syncLab(labs: unknown): { changed: boolean; storageAvailable: boolean };
  refreshFromLab(labs: unknown): { changed: boolean; storageAvailable: boolean };
  exportState(): Backup & { records: Record<string, Progress> };
  planImport(raw: unknown): ImportPlan;
  applyImport(plan: ImportPlan): { changed: boolean; storageAvailable: boolean };
  backups(): { key: string; text: string }[];
  reset(): { removed: boolean };
}
function importState(engine: Engine, raw: unknown): void {
  engine.applyImport(engine.planImport(raw));
}
interface ImportPlan {
  state: Backup & { records: Record<string, Progress> };
  lossy: boolean;
}
interface LabResult {
  code: unknown;
  success: unknown;
  transportError: unknown;
  tests: { id: string; passed: unknown }[];
}
interface LabRecords {
  records: Record<string, { result: LabResult; draft?: string }>;
}
interface Storage {
  data: Map<string, string>;
  writes: number;
  failRead: boolean;
  failWrite: boolean;
  failRemove: boolean;
  getItem(key: string): string | null;
  setItem(key: string, value: unknown): void;
  removeItem(key: string): void;
}
interface SystemsWindow {
  TallerSystemsEngine?: Engine;
  SYSTEMS_LOWLEVEL?: Domain;
  SYSTEMS_INFRA?: Domain;
  SYSTEMS_PLAY?: Domain;
  SYSTEMS_PC?: Domain;
  SYSTEMS_LOWLEVEL_LABS?: Lab[];
  SYSTEMS_INFRA_LABS?: Lab[];
  SYSTEMS_PLAY_LABS?: Lab[];
  SYSTEMS_PC_LABS?: Lab[];
  TallerLab?: { getExercises(): Exercise[] };
}
interface Domain {
  workshops: Workshop[];
  models: Record<string, CatalogModel>;
}
interface Sandbox {
  window: SystemsWindow;
  localStorage?: Storage;
}
interface Catalog extends Config {
  workshops: Workshop[];
  context: Sandbox;
  domains: Domain[];
  models: Record<string, CatalogModel>;
  labs: Lab[];
}

let passed = 0,
  failed = 0;
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
function storage(seed: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(seed));
  return {
    data,
    writes: 0,
    failRead: false,
    failWrite: false,
    failRemove: false,
    getItem(key: string) {
      if (this.failRead) throw new Error('Storage blocked');
      return data.get(key) ?? null;
    },
    setItem(key: string, value: unknown) {
      if (this.failWrite) throw new Error('Storage full');
      this.writes++;
      data.set(key, String(value));
    },
    removeItem(key: string) {
      if (this.failRemove) throw new Error('Storage locked');
      data.delete(key);
    },
  };
}
function fixture(): Config {
  const workshops: FixtureWorkshop[] = ['alpha', 'beta'].map((id, i) => ({
    id,
    title: id,
    model: id,
    objectives: ['a', 'b', 'c'].map((id) => ({ id, label: id, why: 'Observable transition' })),
    steps: Array.from({ length: 4 }, (_, index) => ({
      title: `Stage ${index}`,
      task: 'Implement',
      why: 'Reason',
      done: 'Criterion',
    })),
    prediction: {
      question: 'Which invariant?',
      options: ['A', 'B', 'C'],
      answer: 1,
      explanation: 'Because B.',
    },
    code: { rust: `rust-${113 + i}`, go: `go-${113 + i}` },
  }));
  const exercises: Exercise[] = workshops.flatMap((w) =>
    (['rust', 'go'] as const).map((language) => ({
      id: w.code[language],
      language,
      tests: ['t1', 't2', 't3'].map((id) => ({ id })),
    })),
  );
  return { workshops, exercises, models: { alpha: {}, beta: {} } };
}
function environment(store = storage(), config: Config = fixture()) {
  const context: Sandbox = { window: {}, localStorage: store };
  vm.createContext(context);
  loadSystemsEngine(context);
  const engine = context.window.TallerSystemsEngine;
  if (!engine) throw new Error('TallerSystemsEngine was not published by its adapter');
  const status = engine.init(config);
  return { engine, status, store, context };
}
type LabOverrides = Partial<Record<keyof LabResult, unknown>>;
function result(overrides: LabOverrides = {}): LabResult {
  return {
    code: 'verified solution',
    success: true,
    transportError: false,
    tests: ['t1', 't2', 't3'].map((id) => ({ id, passed: true })),
    ...overrides,
  } as LabResult;
}
function labResult(id = 'rust-113', overrides: LabOverrides = {}): LabRecords {
  return { records: { [id]: { result: result(overrides) } } };
}
function progress(overrides: ProgressOverrides = {}) {
  return {
    observed: [],
    code: false,
    predicted: false,
    answer: null,
    steps: [],
    note: '',
    ...overrides,
  };
}
const backup = (records: Record<string, unknown>) => ({ version: 1, records });

test('Empty progress starts without earned seals', () => {
  const { engine, status } = environment();
  assert.equal(status.storageAvailable, true);
  for (const language of ['rust', 'go'])
    for (const id of ['alpha', 'beta']) {
      const w = engine.get(id, language);
      assert.equal(w.seals, 0);
      assert.equal(w.completed, false);
      assert.equal(w.modelDone, false);
    }
});

test('A core without verification cases is rejected without replacing earned progress', () => {
  const { engine } = environment();
  engine.observe('alpha', 'rust', ['a']);
  engine.setNote('alpha', 'rust', 'Keep my project note');
  const before = plain(engine.exportState()),
    invalid = fixture();
  invalid.exercises[0].tests = [];
  assert.throws(() => engine.init(invalid), /pruebas/i);
  assert.deepEqual(plain(engine.exportState()), before);
  assert.equal(engine.get('alpha', 'rust').progress.note, 'Keep my project note');
});

test('Duplicate verification IDs are rejected without replacing earned progress', () => {
  const { engine } = environment();
  engine.observe('alpha', 'rust', ['a']);
  const before = plain(engine.exportState()),
    invalid = fixture();
  invalid.exercises[0].tests = [{ id: 't1' }, { id: 't1' }, { id: 't3' }];
  assert.throws(() => engine.init(invalid), /pruebas/i);
  assert.deepEqual(plain(engine.exportState()), before);
});

test('Invalid verification IDs are rejected before replacing the usable catalog', () => {
  const { engine } = environment();
  engine.setNote('alpha', 'rust', 'Keep this note');
  const before = plain(engine.exportState()),
    invalid = fixture();
  invalid.exercises[0].tests = [{ id: '' }, { id: 't2' }, { id: 't3' }];
  assert.throws(() => engine.init(invalid), /pruebas/i);
  assert.deepEqual(plain(engine.exportState()), before);
});

test('Observe filters unknown objectives and is idempotent', () => {
  const { engine, store } = environment();
  const first = engine.observe('alpha', 'rust', ['a', 'a', 'unknown', null, 7]);
  assert.deepEqual(plain(first.added), ['a']);
  assert.deepEqual(plain(first.progress.observed), ['a']);
  const writes = store.writes;
  const second = engine.observe('alpha', 'rust', ['a', 'unknown']);
  assert.deepEqual(plain(second.added), []);
  assert.equal(store.writes, writes);
  assert.equal(second.modelDone, false);
});

test('Language and workshop progress are isolated', () => {
  const { engine } = environment();
  engine.observe('alpha', 'rust', ['a', 'b', 'c']);
  engine.answer('alpha', 'rust', 1);
  engine.syncLab(labResult());
  assert.equal(engine.get('alpha', 'rust').completed, true);
  assert.equal(engine.get('alpha', 'go').seals, 0);
  assert.equal(engine.get('beta', 'rust').seals, 0);
});

test('Completion requires three observations, verified code and prediction', () => {
  const { engine } = environment();
  engine.syncLab(labResult());
  assert.equal(engine.get('alpha', 'rust').seals, 1);
  engine.observe('alpha', 'rust', ['a', 'b']);
  engine.answer('alpha', 'rust', 1);
  assert.equal(engine.get('alpha', 'rust').seals, 2);
  assert.equal(engine.get('alpha', 'rust').completed, false);
  engine.observe('alpha', 'rust', ['c']);
  assert.equal(engine.get('alpha', 'rust').seals, 3);
  assert.equal(engine.get('alpha', 'rust').completed, true);
});

test('Manual project checkboxes and notes do not earn proof seals', () => {
  const { engine } = environment();
  for (let i = 0; i < 4; i++) engine.setStep('alpha', 'rust', i, true);
  engine.setNote('alpha', 'rust', 'Completed my implementation.');
  assert.equal(engine.get('alpha', 'rust').seals, 0);
  engine.setStep('alpha', 'rust', 1, false);
  assert.deepEqual(plain(engine.get('alpha', 'rust').progress.steps), [0, 2, 3]);
  assert.equal(engine.get('alpha', 'rust').progress.note, 'Completed my implementation.');
});

test('A correct prediction stays earned after another answer', () => {
  const { engine } = environment();
  assert.equal(engine.answer('alpha', 'rust', 0).correct, false);
  assert.equal(engine.get('alpha', 'rust').progress.predicted, false);
  assert.equal(engine.answer('alpha', 'rust', 1).correct, true);
  const last = engine.answer('alpha', 'rust', 2);
  assert.equal(last.correct, false);
  assert.equal(last.progress.predicted, true);
  assert.equal(last.progress.answer, 2);
});

test('Invalid questions, languages and stages do not modify progress', () => {
  const { engine, store } = environment();
  const before = JSON.stringify(engine.exportState()),
    writes = store.writes;
  for (const index of [-1, 3, 1.5, '1', NaN])
    assert.throws(() => engine.answer('alpha', 'rust', index));
  assert.throws(() => engine.observe('alpha', 'python', ['a']));
  assert.throws(() => engine.observe('missing', 'rust', ['a']));
  assert.throws(() => engine.setStep('alpha', 'rust', 4, true));
  assert.equal(JSON.stringify(engine.exportState()), before);
  assert.equal(store.writes, writes);
});

test('Valid core evidence earns exactly its own seal once', () => {
  const { engine, store } = environment();
  assert.equal(engine.syncLab(labResult('go-113')).changed, true);
  const writes = store.writes;
  assert.equal(engine.syncLab(labResult('go-113')).changed, false);
  assert.equal(store.writes, writes);
  assert.equal(engine.get('alpha', 'go').progress.code, true);
  assert.equal(engine.get('alpha', 'rust').progress.code, false);
});

test('Sync rejects failed transport, missing/blank code and non-success', () => {
  const rejected = [
    { success: false },
    { success: 'true' },
    { success: undefined },
    { transportError: true },
    { code: '' },
    { code: ' \n\t ' },
    { code: null },
    { code: 12 },
    { tests: null },
    { tests: {} },
    { tests: [] },
  ];
  for (const invalid of rejected) {
    const { engine, store } = environment();
    engine.syncLab(labResult('rust-113', invalid));
    assert.equal(engine.get('alpha', 'rust').progress.code, false, JSON.stringify(invalid));
    assert.deepEqual(savedCodeSeals(store), [], JSON.stringify(invalid));
  }
});

test('Sync requires all three expected test IDs exactly once and truly passed', () => {
  const rejected = [
    [
      { id: 't1', passed: true },
      { id: 't2', passed: true },
    ],
    [
      { id: 't1', passed: true },
      { id: 't2', passed: true },
      { id: 'wrong', passed: true },
    ],
    [
      { id: 't1', passed: true },
      { id: 't2', passed: false },
      { id: 't3', passed: true },
    ],
    [
      { id: 't1', passed: true },
      { id: 't2', passed: 'true' },
      { id: 't3', passed: true },
    ],
    [
      { id: 't1', passed: true },
      { id: 't1', passed: false },
      { id: 't2', passed: true },
      { id: 't3', passed: true },
    ],
    [
      { id: 't1', passed: true },
      { id: 't1', passed: true },
      { id: 't2', passed: true },
      { id: 't3', passed: true },
    ],
  ];
  for (const tests of rejected) {
    const { engine, store } = environment();
    engine.syncLab(labResult('rust-113', { tests }));
    assert.equal(engine.get('alpha', 'rust').progress.code, false, JSON.stringify(tests));
    assert.deepEqual(savedCodeSeals(store), [], JSON.stringify(tests));
  }
});

test('An independent optional test does not change the core contract', () => {
  const { engine } = environment();
  const r = result();
  r.tests.push({ id: 'custom', passed: false });
  assert.equal(engine.syncLab({ records: { 'rust-113': { result: r } } }).changed, true);
});

test('An old verified code snapshot can earn and retains its historical seal', () => {
  const { engine } = environment();
  const lab = labResult();
  lab.records['rust-113'].draft = 'new unverified draft';
  engine.syncLab(lab);
  assert.equal(engine.get('alpha', 'rust').progress.code, true);
  engine.syncLab(labResult('rust-113', { success: false, tests: [] }));
  engine.syncLab({ records: {} });
  assert.equal(engine.get('alpha', 'rust').progress.code, true);
});

test('Import preflight is pure and filters IDs/steps without mutating its input', () => {
  const { engine, store } = environment();
  engine.setNote('alpha', 'rust', 'Local note');
  const originalState = JSON.stringify(engine.exportState()),
    writes = store.writes;
  const raw = backup({
    'rust:alpha': progress({
      observed: ['a', 'a', 'unknown'],
      steps: [0, 0, 3, 4, -1, '2'],
      note: 'n'.repeat(10005),
    }),
  });
  const originalInput = JSON.stringify(raw),
    clean = engine.planImport(raw).state;
  assert.equal(JSON.stringify(engine.exportState()), originalState);
  assert.equal(store.writes, writes);
  assert.equal(JSON.stringify(raw), originalInput);
  assert.deepEqual(plain(clean.records['rust:alpha'].observed), ['a']);
  assert.deepEqual(plain(clean.records['rust:alpha'].steps), [0, 3]);
  assert.equal(clean.records['rust:alpha'].note.length, 10000);
});

test('A corrupt later import record cannot partially apply earlier valid progress', () => {
  const { engine, store } = environment();
  engine.observe('beta', 'go', ['b']);
  engine.setNote('alpha', 'rust', 'Keep me');
  const before = JSON.stringify(engine.exportState()),
    writes = store.writes;
  const raw = backup({
    'rust:alpha': progress({ observed: ['a', 'b', 'c'], code: true, predicted: true }),
    'go:beta': progress({ code: 'true' }),
  });
  assert.throws(() => importState(engine, raw));
  assert.equal(JSON.stringify(engine.exportState()), before);
  assert.equal(store.writes, writes);
});

test('Malformed imports reject instead of coercing proof fields', () => {
  const malformed = [
    42,
    [],
    { version: 2, records: {} },
    { version: 1, records: [] },
    backup({ 'rust:alpha': progress({ observed: null }) }),
    backup({ 'rust:alpha': progress({ steps: null }) }),
    backup({ 'rust:alpha': progress({ predicted: 1 }) }),
    backup({ 'rust:alpha': progress({ answer: 9 }) }),
    backup({ 'rust:alpha': progress({ note: { text: 'x' } }) }),
  ];
  for (const raw of malformed) {
    const { engine } = environment();
    const before = JSON.stringify(engine.exportState());
    assert.throws(() => importState(engine, raw));
    assert.equal(JSON.stringify(engine.exportState()), before);
  }
});

test('Import unions achievements and stages, updates nonempty notes, preserves answer on null', () => {
  const { engine } = environment();
  engine.observe('alpha', 'rust', ['a']);
  engine.answer('alpha', 'rust', 1);
  engine.setStep('alpha', 'rust', 0, true);
  engine.setNote('alpha', 'rust', 'Earlier');
  importState(
    engine,
    backup({
      'rust:alpha': progress({ observed: ['b', 'c'], code: true, steps: [1], note: 'Imported' }),
    }),
  );
  const merged = engine.get('alpha', 'rust');
  assert.equal(merged.completed, true);
  assert.deepEqual(plain(merged.progress.steps), [0, 1]);
  assert.equal(merged.progress.answer, 1);
  assert.equal(merged.progress.note, 'Imported');
  importState(engine, backup({ 'rust:alpha': progress() }));
  assert.equal(engine.get('alpha', 'rust').completed, true);
  assert.equal(engine.get('alpha', 'rust').progress.note, 'Imported');
});

test('Unknown import IDs and optional old-backup payloads are harmless', () => {
  const { engine } = environment();
  importState(
    engine,
    backup({ 'rust:unknown': null, 'python:alpha': null, 'rust:alpha:extra': null }),
  );
  const before = JSON.stringify(engine.exportState());
  importState(engine, undefined);
  importState(engine, null);
  assert.equal(JSON.stringify(engine.exportState()), before);
});

test('Progress including notes and checkboxes survives reload', () => {
  const shared = storage(),
    first = environment(shared).engine;
  first.observe('alpha', 'go', ['a', 'b', 'c']);
  first.answer('alpha', 'go', 1);
  first.syncLab(labResult('go-113'));
  first.setStep('alpha', 'go', 2, true);
  first.setNote('alpha', 'go', 'Proof by example');
  const second = environment(shared).engine,
    restored = second.get('alpha', 'go');
  assert.equal(restored.completed, true);
  assert.deepEqual(plain(restored.progress.steps), [2]);
  assert.equal(restored.progress.note, 'Proof by example');
  assert.equal(second.get('alpha', 'rust').seals, 0);
});

test('Unavailable storage keeps session progress exportable; the shell reports the limitation', () => {
  const store = storage();
  store.failRead = true;
  store.failWrite = true;
  const { engine, status } = environment(store);
  assert.equal(status.storageAvailable, false);
  assert.equal(status.loadWarning, '');
  engine.observe('alpha', 'rust', ['a', 'b', 'c']);
  engine.answer('alpha', 'rust', 1);
  engine.syncLab(labResult());
  assert.equal(engine.get('alpha', 'rust').completed, true);
  assert.equal(engine.get('alpha', 'rust').storageAvailable, false);
  assert.equal(engine.exportState().records['rust:alpha'].code, true);
  store.failRead = false;
  store.failWrite = false;
  // The load could not read the key: overwriting it could clobber unseen progress, so the session stays in memory until a new load.
  engine.setNote('alpha', 'rust', 'Storage returned');
  assert.equal(engine.get('alpha', 'rust').storageAvailable, false);
  assert.equal(store.data.has(KEY), false);
  const reloaded = environment(store).engine;
  reloaded.setNote('alpha', 'rust', 'After reload');
  assert.equal(reloaded.get('alpha', 'rust').storageAvailable, true);
});

const BACKUP_KEY = 'taller-systems-v1:respaldo';

test('Unreadable saved JSON starts blank, keeps a backup copy and warns without touching the key', () => {
  for (const saved of ['{broken', 'null', JSON.stringify({ version: 2, records: {} })]) {
    const store = storage({ [KEY]: saved });
    const { engine, status } = environment(store);
    assert.equal(
      status.loadWarning,
      'No se pudo leer el progreso de Sistemas guardado; se conservó una copia en taller-systems-v1:respaldo.',
    );
    assert.equal(status.storageAvailable, true);
    assert.equal(engine.get('alpha', 'rust').seals, 0);
    assert.equal(store.data.get(BACKUP_KEY), saved);
    assert.equal(store.data.get(KEY), saved);
    assert.equal(store.writes, 1);
  }
});

test('Loading drops only invalid or unknown records, keeps the rest and backs up the original text', () => {
  const good = progress({ observed: ['a', 'b'], code: true, note: 'kept note' });
  const saved = JSON.stringify(
    backup({
      'rust:alpha': good,
      'go:beta': progress({ code: 'yes' }),
      'rust:beta': { observed: 'a' },
      'go:alpha': progress({ answer: 9 }),
      'rust:ghost': progress(),
      'python:alpha': progress(),
    }),
  );
  const store = storage({ [KEY]: saved });
  const { engine, status } = environment(store);
  assert.equal(
    status.loadWarning,
    'Se descartaron 5 registros de Sistemas que esta versión no reconoce; se conservó una copia en taller-systems-v1:respaldo.',
  );
  assert.equal(status.storageAvailable, true);
  assert.deepEqual(plain(engine.exportState()), {
    version: 1,
    records: { 'rust:alpha': good },
  });
  assert.equal(store.data.get(BACKUP_KEY), saved);
  assert.equal(store.data.get(KEY), saved);
  assert.equal(store.writes, 1);
});

test('Loading a record with unknown objectives or out-of-range steps keeps the valid ones, backs up the original and warns', () => {
  const original = JSON.stringify(
    backup({ 'go:alpha': progress({ observed: ['a', 'a', 'zzz'], steps: [1, 1, 7, 'x'] }) }),
  );
  const store = storage({ [KEY]: original });
  const { engine, status } = environment(store);
  assert.equal(
    status.loadWarning,
    'Se descartaron datos de Sistemas que esta versión no reconoce; se conservó una copia en taller-systems-v1:respaldo.',
  );
  assert.equal(store.data.get(BACKUP_KEY), original);
  const loaded = engine.get('alpha', 'go').progress;
  assert.deepEqual(plain(loaded.observed), ['a']);
  assert.deepEqual(plain(loaded.steps), [1]);
});

test('The first save after an unreadable load keeps the original in the backup', () => {
  const store = storage({ [KEY]: '{broken' });
  const { engine } = environment(store);
  engine.setNote('alpha', 'rust', 'fresh start');
  assert.equal(store.data.get(BACKUP_KEY), '{broken');
  assert.equal(JSON.parse(store.data.get(KEY) ?? '').records['rust:alpha'].note, 'fresh start');
});

test('Imports stay strict: one invalid record rejects the whole backup', () => {
  const { engine } = environment();
  engine.setNote('alpha', 'rust', 'local note');
  const before = JSON.stringify(engine.exportState());
  const mixed = backup({
    'rust:alpha': progress({ code: true }),
    'go:beta': progress({ code: 1 }),
  });
  assert.throws(() => engine.planImport(mixed), /Sello de taller inválido: beta/);
  assert.throws(() => importState(engine, mixed), /Sello de taller inválido: beta/);
  assert.equal(JSON.stringify(engine.exportState()), before);
});

test('Returned objects cannot mutate internal earned state', () => {
  const { engine } = environment();
  engine.observe('alpha', 'rust', ['a']);
  const first = engine.get('alpha', 'rust');
  first.progress.observed.push('b');
  first.progress.code = true;
  const exported = engine.exportState();
  exported.records['rust:alpha'].note = 'External mutation';
  assert.deepEqual(plain(engine.get('alpha', 'rust').progress.observed), ['a']);
  assert.equal(engine.get('alpha', 'rust').progress.code, false);
  assert.equal(engine.get('alpha', 'rust').progress.note, '');
});

test('Reset clears all languages, removes the saved progress and its backup, and survives reload', () => {
  const shared = storage({ [BACKUP_KEY]: 'copia previa' }),
    { engine } = environment(shared);
  engine.observe('alpha', 'rust', ['a']);
  engine.setNote('beta', 'go', 'Remove this');
  assert.equal(shared.data.has(KEY), true);
  engine.reset();
  assert.equal(shared.data.has(KEY), false);
  assert.equal(shared.data.has(BACKUP_KEY), false);
  assert.deepEqual(plain(engine.exportState()), { version: 1, records: {} });
  const reloaded = environment(shared).engine;
  assert.equal(reloaded.get('alpha', 'rust').seals, 0);
  assert.equal(reloaded.get('beta', 'go').progress.note, '');
});

const BACKUP_SLOTS = [BACKUP_KEY, ...[2, 3, 4, 5].map((n) => `${BACKUP_KEY}-${n}`)];
function fullBackupSlots(mainText = '{broken'): Storage {
  return storage({
    [KEY]: mainText,
    ...Object.fromEntries(BACKUP_SLOTS.map((slot) => [slot, 'otro texto ' + slot])),
  });
}
function savedCodeSeals(store: Storage): string[] {
  if (!store.data.has(KEY)) return [];
  return Object.entries(savedRecords(store))
    .filter(([, saved]) => saved.code)
    .map(([name]) => name);
}
function savedRecords(store: Storage): Record<string, Progress> {
  return (JSON.parse(store.data.get(KEY) ?? 'null') as { records: Record<string, Progress> })
    .records;
}

test('refreshFromLab derives the core seal in memory without writing; syncLab then seals and writes', () => {
  const { engine, store } = environment();
  const refreshed = engine.refreshFromLab(labResult('go-113'));
  assert.equal(refreshed.changed, true);
  assert.equal(store.data.has(KEY), false);
  assert.equal(store.writes, 0);
  assert.equal(engine.get('alpha', 'go').progress.code, true);
  const synced = engine.syncLab(labResult('go-113'));
  assert.equal(synced.changed, true);
  assert.equal(savedRecords(store)['go:alpha'].code, true);
  assert.equal(engine.syncLab(labResult('go-113')).changed, false);
});

test('Two tabs: a stale tab keeps the objectives the other one observed when it saves a note', () => {
  const shared = storage();
  const tabA = environment(shared).engine;
  const tabB = environment(shared).engine;
  tabA.observe('alpha', 'rust', ['a', 'b', 'c']);
  tabB.setNote('alpha', 'rust', 'nota de B');
  const saved = savedRecords(shared)['rust:alpha'];
  assert.deepEqual(plain(saved.observed), ['a', 'b', 'c']);
  assert.equal(saved.note, 'nota de B');
  assert.deepEqual(plain(tabB.get('alpha', 'rust').progress.observed), ['a', 'b', 'c']);
});

test('Single tab: unchecking a stage and clearing the note survive a reload', () => {
  const shared = storage();
  const { engine } = environment(shared);
  engine.setStep('alpha', 'rust', 1, true);
  engine.setStep('alpha', 'rust', 2, true);
  engine.setNote('alpha', 'rust', 'algo');
  engine.setStep('alpha', 'rust', 1, false);
  engine.setNote('alpha', 'rust', '');
  const restored = environment(shared).engine.get('alpha', 'rust').progress;
  assert.deepEqual(plain(restored.steps), [2]);
  assert.equal(restored.note, '');
});

test('A degraded load without a backup slot leaves the main key alone: sync, observe, note and import stay in memory', () => {
  const store = fullBackupSlots();
  const before = new Map(store.data);
  const { engine, status } = environment(store);
  assert.equal(status.storageAvailable, false);
  assert.match(status.loadWarning ?? '', /no se pudo guardar una copia/);
  assert.equal(engine.syncLab(labResult('go-113')).storageAvailable, false);
  engine.observe('alpha', 'rust', ['a']);
  engine.setNote('alpha', 'rust', 'solo en memoria');
  importState(engine, backup({ 'rust:beta': progress({ code: true }) }));
  assert.equal(engine.get('alpha', 'rust').storageAvailable, false);
  assert.equal(engine.get('beta', 'rust').progress.code, true);
  assert.deepEqual([...store.data], [...before]);
  assert.equal(store.writes, 0);
});

test('planImport is pure, and applyImport merges it into memory and persists', () => {
  const { engine, store } = environment();
  engine.setNote('alpha', 'rust', 'mi nota');
  const memory = JSON.stringify(engine.exportState()),
    stored = store.data.get(KEY),
    writes = store.writes;
  const raw = backup({ 'rust:alpha': progress({ observed: ['a'], code: true }) });
  const input = JSON.stringify(raw);
  const plan = engine.planImport(raw);
  assert.equal(plan.lossy, false);
  assert.equal(plan.state.records['rust:alpha'].code, true);
  assert.equal(plan.state.records['rust:alpha'].note, 'mi nota');
  assert.equal(JSON.stringify(engine.exportState()), memory);
  assert.equal(store.data.get(KEY), stored);
  assert.equal(store.writes, writes);
  assert.equal(JSON.stringify(raw), input);
  assert.equal(engine.applyImport(plan).changed, true);
  assert.equal(savedRecords(store)['rust:alpha'].code, true);
  assert.equal(engine.get('alpha', 'rust').progress.code, true);
});

test('planImport without a Systems section plans no change; with an invalid record it throws', () => {
  const { engine } = environment();
  engine.setNote('alpha', 'rust', 'mi nota');
  for (const absent of [undefined, null]) {
    const plan = engine.planImport(absent);
    assert.equal(plan.lossy, false);
    assert.deepEqual(plain(plan.state), plain(engine.exportState()));
  }
  assert.throws(() => engine.planImport(backup({ 'go:beta': progress({ code: 1 }) })));
});

test('planImport marks as lossy a backup with unknown IDs, objectives or steps', () => {
  const { engine } = environment();
  assert.equal(engine.planImport(backup({ 'rust:ghost': progress() })).lossy, true);
  assert.equal(
    engine.planImport(backup({ 'rust:alpha': progress({ observed: ['zzz'] }) })).lossy,
    true,
  );
  assert.equal(engine.planImport(backup({ 'rust:alpha': progress({ steps: [9] }) })).lossy, true);
  assert.equal(
    engine.planImport(backup({ 'rust:alpha': progress({ observed: ['a'] }) })).lossy,
    false,
  );
});

test('Importing a blank note does not erase the local note', () => {
  const { engine } = environment();
  engine.setNote('alpha', 'rust', 'mi nota');
  importState(engine, backup({ 'rust:alpha': progress({ note: '   ' }) }));
  assert.equal(engine.get('alpha', 'rust').progress.note, 'mi nota');
  importState(engine, backup({ 'rust:alpha': progress({ note: '' }) }));
  assert.equal(engine.get('alpha', 'rust').progress.note, 'mi nota');
});

test('reset reports whether the key and its backup slots were removed', () => {
  const store = storage({ [BACKUP_KEY]: 'copia previa' });
  const { engine } = environment(store);
  engine.setNote('alpha', 'rust', 'algo');
  assert.deepEqual(plain(engine.reset()), { removed: true });
  assert.equal(store.data.has(KEY) || store.data.has(BACKUP_KEY), false);
  const locked = storage({ [BACKUP_KEY]: 'copia previa' });
  locked.failRemove = true;
  assert.equal(environment(locked).engine.reset().removed, false);
});

test('backups lists the slot that secured the original text after a degraded load', () => {
  const { engine } = environment(storage({ [KEY]: '{broken' }));
  assert.deepEqual(plain(engine.backups()), [{ key: BACKUP_KEY, text: '{broken' }]);
  assert.deepEqual(plain(environment().engine.backups()), []);
});

const SOURCE_HOSTS = new Set([
  'doc.rust-lang.org',
  'go.dev',
  'pkg.go.dev',
  'pages.cs.wisc.edu',
  'os.phil-opp.com',
  'pdos.csail.mit.edu',
  'github.com',
  'www.nand2tetris.org',
  'tinygo.org',
  'sqlite.org',
  'www.sqlite.org',
  'docs.tigerbeetle.com',
  'www.allthingsdistributed.com',
  'raft.github.io',
  'lamport.azurewebsites.net',
  'datatracker.ietf.org',
  'www.envoyproxy.io',
  'www.cs.cornell.edu',
  'zingl.github.io',
  'raytracing.github.io',
  'www.redblobgames.com',
  'gafferongames.com',
  'www.cs.princeton.edu',
  'dlmf.nist.gov',
  'inst.eecs.berkeley.edu',
  'developer.mozilla.org',
  'www.khronos.org',
  'www.w3.org',
  'www.open-std.org',
  'janmr.com',
  'ripes.dk',
  'ripes.me',
  'nand2tetris.github.io',
]);
function nonempty(value: unknown, label: string): void {
  assert.equal(typeof value, 'string', label);
  assert((value as string).trim(), label);
}
function trustedSource(source: Source, owner: string): void {
  nonempty(source.title, `${owner}: source title`);
  const url = new URL(source.url);
  assert.equal(url.protocol, 'https:', `${owner}: source must use HTTPS`);
  assert.equal(url.username, '');
  assert.equal(url.password, '');
  assert(
    SOURCE_HOSTS.has(url.hostname),
    `${owner}: review primary-source hostname ${url.hostname} before adding it to the allowlist`,
  );
}
function validateView(view: ModelView, owner: string): void {
  for (const field of ['title', 'summary', 'explanation'] as const)
    nonempty(view[field], `${owner}: view.${field}`);
  for (const field of ['metrics', 'cells', 'controls', 'log'] as const)
    assert(Array.isArray(view[field]), `${owner}: view.${field}`);
  for (const m of view.metrics) {
    nonempty(m.label, owner);
    assert(['string', 'number'].includes(typeof m.value), owner);
  }
  for (const c of view.cells) {
    nonempty(c.label, owner);
    assert(['string', 'number'].includes(typeof c.value), owner);
  }
  assert(hasSupportedTones(view.cells), owner);
  for (const control of view.controls) {
    nonempty(control.action, owner);
    nonempty(control.label, owner);
    assert(isControlContract(control), owner);
  }
  assert(rowsMatchColumns(view), owner);
  for (const label of view.columns || []) assert.equal(typeof label, 'string', owner);
  view.log.forEach((line) => assert.equal(typeof line, 'string', owner));
  assertFiniteJson(view, owner);
}

if (process.argv.includes('--engine-only')) {
  process.stdout.write(
    'Catalog checks explicitly skipped (--engine-only); run without the flag for the release gate.\n',
  );
} else {
  let real: Catalog | undefined;
  test('All four workshop domains and lab integration files are available', () => {
    const files = [...LAB_EXERCISE_SOURCES, ...SYSTEMS_CATALOG_SOURCES, LAB_SOURCE];
    const context: Sandbox = { window: {}, localStorage: storage() };
    vm.createContext(context);
    for (const file of files) {
      assert(fs.existsSync(path.join(root, file)), `Awaiting completed snapshot: ${file}`);
    }
    loadLabCatalogs(context);
    loadLab(context);
    const w = context.window,
      domains = [w.SYSTEMS_LOWLEVEL, w.SYSTEMS_INFRA, w.SYSTEMS_PLAY, w.SYSTEMS_PC].filter(
        (domain): domain is Domain => Boolean(domain),
      );
    assert(domains.length === 4, 'All four global domain objects must exist.');
    assert(
      [w.SYSTEMS_LOWLEVEL_LABS, w.SYSTEMS_INFRA_LABS, w.SYSTEMS_PLAY_LABS, w.SYSTEMS_PC_LABS].every(
        Array.isArray,
      ),
      'All four lab globals must exist.',
    );
    real = {
      context,
      workshops: domains.flatMap((d) => d.workshops),
      domains,
      models: Object.assign({}, ...domains.map((d) => d.models)) as Record<string, CatalogModel>,
      labs: [
        ...(w.SYSTEMS_LOWLEVEL_LABS ?? []),
        ...(w.SYSTEMS_INFRA_LABS ?? []),
        ...(w.SYSTEMS_PLAY_LABS ?? []),
        ...(w.SYSTEMS_PC_LABS ?? []),
      ],
      exercises: (w.TallerLab as { getExercises(): Exercise[] }).getExercises(),
    };
  });
  if (real) {
    const catalog: Catalog = real;
    test('Complete release catalog contains 25 workshops, 50 new cores and 274 unique exercises', () => {
      assert.equal(catalog.workshops.length, 25);
      assert.equal(catalog.labs.length, 50);
      assert.equal(catalog.exercises.length, 274);
      assert.equal(new Set(catalog.workshops.map((w) => w.id)).size, 25);
      assert.equal(new Set(catalog.exercises.map((e) => e.id)).size, 274);
      assert.equal(
        Object.keys(catalog.models).length,
        25,
        'Model names must not collide across domains.',
      );
      for (const lang of ['rust', 'go'] as const) {
        assert.equal(catalog.exercises.filter((e) => e.language === lang).length, 137);
        for (let id = 113; id <= 137; id++)
          assert(
            catalog.exercises.some((e) => e.id === `${lang}-${id}`),
            `${lang}-${id}`,
          );
      }
    });

    test('Every workshop has its complete educational contract and valid exercise links', () => {
      const byId = new Map(catalog.exercises.map((e) => [e.id, e])),
        usedCores = new Set();
      for (const w of catalog.workshops) {
        for (const field of [
          'id',
          'title',
          'subtitle',
          'story',
          'what',
          'why',
          'limits',
          'model',
        ] as const)
          nonempty(w[field], `${w.id}.${field}`);
        nonempty(w.category, `${w.id}.category`);
        assert(['beginner', 'medium', 'advanced', 'expert'].includes(w.level));
        assert(Number.isFinite(w.minutes) && w.minutes > 0);
        assert.equal(w.uses.length, 3);
        w.uses.forEach((use) => nonempty(use, w.id));
        assert.equal(w.objectives.length, 3);
        assert.equal(new Set(w.objectives.map((g) => g.id)).size, 3);
        for (const goal of w.objectives)
          for (const field of ['id', 'label', 'why'] as const)
            nonempty(goal[field], `${w.id}.${field}`);
        assert.equal(w.steps.length, 4);
        for (const step of w.steps)
          for (const field of ['title', 'task', 'why', 'done'] as const)
            nonempty(step[field], `${w.id}.${field}`);
        assert.equal(w.prediction.options.length, 3);
        assert(
          Number.isInteger(w.prediction.answer) &&
            w.prediction.answer >= 0 &&
            w.prediction.answer < 3,
        );
        w.prediction.options.forEach((option) => nonempty(option, `${w.id}.prediction.option`));
        nonempty(w.prediction.question, w.id);
        nonempty(w.prediction.explanation, w.id);
        assert(Array.isArray(w.sources) && w.sources.length > 0);
        w.sources.forEach((s) => trustedSource(s, w.id));
        for (const lang of ['rust', 'go'] as const) {
          assert.equal(byId.get(w.code[lang])?.language, lang, `${w.id}: missing ${lang} core`);
          assert(!usedCores.has(w.code[lang]), `${w.id}: a core is assigned to two workshops`);
          usedCores.add(w.code[lang]);
          assert(Array.isArray(w.related[lang]) && w.related[lang].length <= 3);
          for (const id of w.related[lang])
            assert.equal(byId.get(id)?.language, lang, `${w.id}: related ${id}`);
          nonempty(w.bridge[lang], `${w.id}: bridge ${lang}`);
        }
      }
    });

    test('All 50 new cores expose meaningful test/reviewer metadata without changing the language contract', () => {
      for (const ex of catalog.labs) {
        for (const field of [
          'id',
          'topicId',
          'topic',
          'title',
          'intro',
          'why',
          'objective',
          'starter',
          'solution',
          'transfer',
        ] as const)
          nonempty(ex[field], `${ex.id}.${field}`);
        assert.equal(ex.tests.length, 3);
        assert.equal(new Set(ex.tests.map((t) => t.id)).size, 3);
        assert.notEqual(ex.starter, ex.solution);
        assert.equal(ex.hints.length, 3);
        assert(Array.isArray(ex.instructions) && ex.instructions.length >= 2);
        ex.instructions.forEach((instruction) => nonempty(instruction, `${ex.id}.instruction`));
        ex.hints.forEach((hint) => nonempty(hint, `${ex.id}.hint`));
        assert(Array.isArray(ex.imports));
        assert(['beginner', 'medium', 'advanced', 'expert'].includes(ex.level));
        assert(['completar', 'reparar'].includes(ex.kind));
        for (const t of ex.tests)
          for (const field of ['id', 'label', 'expression', 'why', 'failure'] as const)
            nonempty(t[field], `${ex.id}.${field}`);
        nonempty(ex.review.success, ex.id);
        nonempty(ex.review.pitfall, ex.id);
        assert.equal(ex.prediction.options.length, 3);
        assert(
          Number.isInteger(ex.prediction.answer) &&
            ex.prediction.answer >= 0 &&
            ex.prediction.answer < 3,
        );
        assert(Array.isArray(ex.sources) && ex.sources.length);
        ex.sources.forEach((s) => trustedSource(s, ex.id));
      }
    });

    test('Every model has finite deterministic initial/view data and valid control actions', () => {
      for (const workshop of catalog.workshops) {
        const model = catalog.models[workshop.model];
        for (const name of ['initial', 'act', 'view', 'achieved'] as const)
          assert.equal(typeof model[name], 'function', `${workshop.id}.${name}`);
        const initial = model.initial(workshop),
          before = JSON.stringify(initial);
        assertFiniteJson(initial, workshop.id);
        deepFreeze(initial);
        const first = model.view(initial, workshop),
          second = model.view(initial, workshop);
        validateView(first, workshop.id);
        assert.equal(
          JSON.stringify(first),
          JSON.stringify(second),
          `${workshop.id}: nondeterministic view`,
        );
        assertUnchanged(initial, before, `${workshop.id}: view mutated state`);
        assert(achievedBelongToWorkshop(model.achieved(initial, workshop), workshop));
        for (const control of first.controls) {
          const next = model.act(initial, control.action, control.value, workshop);
          const repeated = model.act(initial, control.action, control.value, workshop);
          assertFiniteJson(next, `${workshop.id}/${control.action}`);
          assert.equal(
            JSON.stringify(next),
            JSON.stringify(repeated),
            `${workshop.id}: nondeterministic action`,
          );
          assertUnchanged(initial, before, `${workshop.id}: act mutated input`);
          validateView(model.view(next, workshop), workshop.id);
          assert(
            achievedBelongToWorkshop(model.achieved(next, workshop), workshop),
            `${workshop.id}: unregistered earned objective`,
          );
        }
      }
    });

    test('planImport is not lossy for the Systems section of the frozen progress exports', () => {
      const { engine } = environment(storage(), catalog);
      for (const file of ['progress-master-2a278ad-export.json', 'progress-d0e1b49-export.json']) {
        const exported = JSON.parse(
          fs.readFileSync(path.join(root, 'qa/fixtures', file), 'utf8'),
        ) as { systems: unknown };
        assert.equal(engine.planImport(exported.systems).lossy, false, file);
      }
    });

    test('Real catalog can earn each workshop in one language without granting the other', () => {
      const { engine } = environment(storage(), catalog);
      for (const w of catalog.workshops) {
        engine.observe(
          w.id,
          'rust',
          w.objectives.map((g) => g.id),
        );
        engine.answer(w.id, 'rust', w.prediction.answer);
        const ex = catalog.exercises.find((e) => e.id === w.code.rust);
        if (!ex) throw new Error(`${w.id}: missing rust core ${w.code.rust}`);
        engine.syncLab({
          records: {
            [ex.id]: {
              result: result({ tests: ex.tests.map((t) => ({ id: t.id, passed: true })) }),
            },
          },
        });
        assert.equal(engine.get(w.id, 'rust').completed, true, w.id);
        assert.equal(engine.get(w.id, 'go').seals, 0, w.id);
      }
    });
  }
}

process.stdout.write(`\n${passed} systems checks passed; ${failed} failed.\n`);
if (failed) process.exitCode = 1;
