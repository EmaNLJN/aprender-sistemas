/* Offline behavior checks for the campaign ledger and its prerequisite chain. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { plainJson } from './lib/plain-json.ts';
import {
  SYSTEMS_DOMAINS,
  loadCampaignEngine,
  loadCampaignWorlds,
  loadLabExercises,
  loadSystemsDomain,
} from './lib/legacy-sources.ts';

interface TestRef {
  id: string;
}
interface ExerciseFixture {
  id: string;
  language: string;
  title: string;
  tests: TestRef[];
}
interface Checkpoint {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}
interface WorldFixture {
  id: string;
  level: string;
  title: string;
  badge: string;
  trainingIds: string[];
  challengeIds: string[];
  bossId: string;
  checkpoint: Checkpoint;
}
type Worlds = Record<string, WorldFixture[]>;
interface Mission {
  points: number;
  assisted: boolean;
  code: boolean;
}
interface WorldView {
  unlocked: boolean;
  reasons: string[];
  missions: Mission[];
  score: number;
  completed: boolean;
  bossReady: boolean;
  checkpointReady: boolean;
  checkpointReasons: string[];
  checkpointAnswer: number;
}
interface Summary {
  totalXP: number;
  score: number;
  maxScore: number;
  completedWorlds: number;
  badges: string[];
}
interface Attempt {
  allowed: boolean;
  reasons: string[];
}
interface CheckpointResult {
  accepted: boolean;
  passed: boolean;
  explanation: string;
}
interface Seal {
  code: boolean;
  prediction: boolean;
  assisted: boolean;
}
interface LedgerState {
  version: number;
  seals: Record<string, Seal>;
  checkpoints: Record<string, unknown>;
}
interface SyncResult {
  changed: boolean;
  xpGained: number;
  storageAvailable: boolean;
}
interface RefreshResult {
  changed: boolean;
  storageAvailable: boolean;
}
interface ImportPlan {
  state: LedgerState;
  lossy: boolean;
}
interface BackupEntry {
  key: string;
  text: string;
}
interface InitResult {
  storageAvailable: boolean;
  loadWarning?: string;
}
interface CampaignEngine {
  init(config: { exercises: ExerciseFixture[]; worlds: Worlds }): InitResult;
  syncLab(payload: unknown): SyncResult;
  refreshFromLab(payload: unknown): RefreshResult;
  getWorlds(language: string): WorldView[];
  getSummary(language: string): Summary;
  canAttempt(exerciseId: string, language: string): Attempt;
  answerCheckpoint(worldId: string, answer: number): CheckpointResult;
  exportState(): LedgerState;
  importState(state: unknown): RefreshResult;
  validateImport(state: unknown): unknown;
  planImport(raw: unknown): ImportPlan;
  applyImport(plan: ImportPlan): RefreshResult;
  backups(): BackupEntry[];
  reset(): { storageAvailable: boolean; removed: boolean };
}
interface Fresh {
  engine: CampaignEngine;
  store: Map<string, string>;
  initialized: InitResult;
}
interface RecordedResult {
  code: string;
  success: boolean;
  tests: { id: string; passed: boolean }[];
}
const languages = ['rust', 'go'];
const levels = ['beginner', 'medium', 'advanced', 'expert'];
const exercises: ExerciseFixture[] = languages.flatMap((language) =>
  Array.from({ length: 25 }, (_, i) => ({
    id: language + '-' + (i + 1),
    language,
    title: language + ' ejercicio ' + (i + 1),
    tests: ['t1', 't2', 't3'].map((id) => ({ id })),
  })),
);
const worlds: Worlds = Object.fromEntries(
  languages.map((language) => [
    language,
    levels.map((level, i) => ({
      id: language + '-world-' + (i + 1),
      level,
      title: language + ' mundo ' + (i + 1),
      badge: 'Insignia ' + (i + 1),
      trainingIds: [1, 2, 3].map((n) => language + '-' + (i * 6 + n)),
      challengeIds: [4, 5, 6].map((n) => language + '-' + (i * 6 + n)),
      bossId: language + '-' + (i * 6 + 6),
      checkpoint: {
        question: '¿Por qué?',
        options: ['Por una regla', 'Por azar'],
        answer: 0,
        explanation: 'La regla conserva el contrato.',
      },
    })),
  ]),
);
const storageKey = 'taller-campaign-v1';
const backupKey = 'taller-campaign-v1:respaldo';
interface FreshOptions {
  failStorage?: boolean;
  failRemove?: boolean;
  // Almacenamiento compartido: dos motores sobre el mismo mapa son dos pestañas.
  store?: Map<string, string>;
}
function freshWith(options: FreshOptions): Fresh {
  const { failStorage = false, failRemove = false, store = new Map<string, string>() } = options;
  const context = vm.createContext({
    window: {} as { TallerCampaignEngine?: unknown },
    localStorage: {
      getItem(key: string) {
        if (failStorage) throw Error('unavailable');
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        if (failStorage) throw Error('unavailable');
        store.set(key, value);
      },
      removeItem(key: string) {
        if (failStorage || failRemove) throw Error('unavailable');
        store.delete(key);
      },
    },
  });
  loadCampaignEngine(context);
  const engine = context.window.TallerCampaignEngine as CampaignEngine;
  const initialized = engine.init({ exercises, worlds });
  return { engine, store, initialized };
}
function fresh(saved?: string, failStorage = false): Fresh {
  const store = new Map<string, string>(saved === undefined ? [] : [[storageKey, saved]]);
  return freshWith({ store, failStorage });
}
function good(prediction = false): { predictionCorrect: boolean; result: RecordedResult } {
  return {
    predictionCorrect: prediction,
    result: {
      code: 'a real recorded program',
      success: true,
      tests: ['t1', 't2', 't3'].map((id) => ({ id, passed: true })),
    },
  };
}
function labWith(ids: string[], prediction = false): { version: number; records: object } {
  return { version: 1, records: Object.fromEntries(ids.map((id) => [id, good(prediction)])) };
}
function sync(engine: CampaignEngine, ids: string[], prediction = false): SyncResult {
  return engine.syncLab(labWith(ids, prediction));
}
function world(engine: CampaignEngine, index = 0, lang = 'rust'): WorldView {
  return engine.getWorlds(lang)[index];
}
function eligible(engine: CampaignEngine, index = 0, lang = 'rust'): void {
  const ids = [...worlds[lang][index].trainingIds, ...worlds[lang][index].challengeIds];
  sync(engine, ids);
  for (const id of [ids[0], ids[1], ids[5]])
    engine.syncLab({ records: { [id]: { predictionCorrect: true } } });
}
let passed = 0;
function test(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log('PASS ' + name);
}

test('First world unlocked; later worlds and bosses explain prerequisites', () => {
  const { engine } = fresh();
  assert.equal(world(engine).unlocked, true);
  assert.equal(world(engine, 1).unlocked, false);
  assert.match(world(engine, 1).reasons.join(' '), /mundo 1/);
  assert.equal(engine.canAttempt('rust-1', 'rust').allowed, true);
  assert.equal(engine.canAttempt('rust-6', 'rust').allowed, false);
  assert.equal(engine.canAttempt('rust-25', 'rust').allowed, true); // Free-lab exercise outside campaign.
  assert.equal(engine.canAttempt('rust-1', 'go').allowed, false);
  assert.equal(engine.canAttempt('missing', 'rust').allowed, false);
});
test('Code seals require success, nonempty recorded code and every expected test', () => {
  const invalid = [
    { solvedAt: 12 },
    { result: { ...good().result, success: false } },
    { result: { ...good().result, code: '  ' } },
    { result: { ...good().result, transportError: true } },
    {
      result: {
        ...good().result,
        tests: [
          { id: 't1', passed: true },
          { id: 't2', passed: true },
        ],
      },
    },
    { result: { ...good().result, tests: [...good().result.tests, { id: 't1', passed: true }] } },
    {
      result: {
        ...good().result,
        tests: good().result.tests.map((t) => ({ ...t, passed: t.id !== 't3' })),
      },
    },
  ];
  for (const record of invalid) {
    const { engine } = fresh();
    engine.syncLab({ records: { 'rust-1': record } });
    assert.equal(engine.getSummary('rust').totalXP, 0);
  }
  const { engine } = fresh();
  assert.equal(sync(engine, ['rust-1']).xpGained, 20);
});
test('Predictions earn10 once; code earns20 once; reflections and assistance earn no XP', () => {
  const { engine } = fresh();
  assert.equal(
    engine.syncLab({
      records: { 'rust-1': { reflection: 'x'.repeat(9000), attempts: 99, assisted: true } },
    }).xpGained,
    0,
  );
  assert.equal(engine.syncLab({ records: { 'rust-1': { predictionCorrect: true } } }).xpGained, 10);
  assert.equal(sync(engine, ['rust-1'], true).xpGained, 20);
  for (let i = 0; i < 20; i++) assert.equal(sync(engine, ['rust-1'], true).xpGained, 0);
  const mission = world(engine).missions[0];
  assert.equal(mission.points, 30);
  assert.equal(mission.assisted, true);
  assert.equal(engine.getSummary('rust').totalXP, 30);
});
test('Previously earned seals survive draft edits, failed runs and wrong later predictions', () => {
  const { engine } = fresh();
  sync(engine, ['rust-1'], true);
  engine.syncLab({
    records: {
      'rust-1': {
        draft: 'broken',
        predictionCorrect: false,
        result: { success: false, code: 'broken', tests: [] },
      },
    },
  });
  assert.equal(world(engine).score, 30);
  assert.equal(engine.exportState().seals['rust-1'].code, true);
});
test('Legacy lab progress is recognized by recorded evidence, not solvedAt or current draft', () => {
  const { engine } = fresh();
  engine.syncLab({
    version: 1,
    records: { 'rust-1': { ...good(true), draft: 'a later edit' }, 'rust-2': { solvedAt: 1 } },
  });
  assert.equal(world(engine).score, 30);
  assert.equal(world(engine).missions[1].code, false);
});
test('Boss requires five earlier code seals but does not require their predictions', () => {
  const { engine } = fresh();
  sync(engine, ['rust-1', 'rust-2', 'rust-3', 'rust-4']);
  assert.equal(engine.canAttempt('rust-6', 'rust').allowed, false);
  assert.match(engine.canAttempt('rust-6', 'rust').reasons.join(' '), /rust-5/);
  sync(engine, ['rust-5']);
  assert.equal(world(engine).bossReady, true);
  assert.equal(engine.canAttempt('rust-6', 'rust').allowed, true);
  assert.equal(world(engine).score, 100);
});
test('Checkpoint blocks early answers, then permits retry without granting extra points', () => {
  const { engine } = fresh();
  const locked = engine.answerCheckpoint('rust-world-1', 0);
  assert.equal(locked.accepted, false);
  assert.equal(locked.explanation, '');
  eligible(engine);
  assert.equal(world(engine).score, 150);
  assert.equal(world(engine).checkpointReady, true);
  const wrong = engine.answerCheckpoint('rust-world-1', 1);
  assert.equal(wrong.accepted, true);
  assert.equal(wrong.passed, false);
  assert.ok(wrong.explanation);
  assert.equal(world(engine, 1).unlocked, false);
  assert.equal(engine.answerCheckpoint('rust-world-1', 0).passed, true);
  assert.equal(world(engine, 1).unlocked, true);
  assert.equal(world(engine).checkpointAnswer, 0);
  assert.equal(engine.answerCheckpoint('rust-world-1', 1).passed, true); // Earned checkpoint stays earned.
  assert.equal(world(engine).score, 150);
  assert.equal(engine.getSummary('rust').completedWorlds, 1);
  assert.deepEqual(plainJson(engine.getSummary('rust').badges), ['Insignia 1']);
});
test('150 points alone do not bypass the boss code and prediction requirement', () => {
  const { engine } = fresh();
  sync(engine, ['rust-1', 'rust-2', 'rust-3', 'rust-4', 'rust-5'], true);
  assert.equal(world(engine).score, 150);
  assert.equal(world(engine).checkpointReady, false);
  sync(engine, ['rust-6']);
  assert.equal(world(engine).checkpointReady, false);
  engine.syncLab({ records: { 'rust-6': { predictionCorrect: true } } });
  assert.equal(world(engine).score, 180);
  assert.equal(world(engine).checkpointReady, true);
});
test('A boss solved in the free lab cannot bypass any of the five earlier code missions', () => {
  const { engine } = fresh();
  sync(engine, ['rust-2', 'rust-3', 'rust-4', 'rust-5', 'rust-6'], true);
  assert.equal(world(engine).score, 150);
  assert.equal(world(engine).missions[5].code, true);
  assert.equal(world(engine).bossReady, false);
  assert.equal(world(engine).checkpointReady, false);
  assert.match(world(engine).checkpointReasons.join(' '), /rust-1/);
  assert.equal(engine.answerCheckpoint('rust-world-1', 0).accepted, false);
  sync(engine, ['rust-1']);
  assert.equal(world(engine).checkpointReady, true);
});
test('A complete future world cannot skip an incomplete prerequisite chain', () => {
  const { engine } = fresh();
  const futureIds = [...worlds.rust[1].trainingIds, ...worlds.rust[1].challengeIds];
  engine.importState({
    version: 1,
    seals: Object.fromEntries(
      futureIds.map((id) => [id, { code: true, prediction: true, assisted: false }]),
    ),
    checkpoints: { 'rust-world-2': { passed: true, lastAnswer: 0 } },
  });
  assert.equal(world(engine, 1).score, 180);
  assert.equal(world(engine, 1).completed, false);
  assert.equal(world(engine, 2).unlocked, false);
  assert.equal(engine.canAttempt('rust-12', 'rust').allowed, false);
  eligible(engine);
  engine.answerCheckpoint('rust-world-1', 0);
  assert.equal(world(engine, 1).completed, true);
  assert.equal(world(engine, 2).unlocked, true);
});
test('Languages are isolated and exercise achievements outside campaign do not inflate world scores', () => {
  const { engine } = fresh();
  sync(engine, ['go-1', 'rust-25'], true);
  assert.equal(engine.getSummary('go').score, 30);
  assert.equal(engine.getSummary('rust').score, 0);
  assert.equal(engine.getSummary('rust').totalXP, 30);
  assert.equal(engine.getSummary('rust').maxScore, 720);
});
test('Import honors local progress, merges monotonically, and accepts absent legacy campaign', () => {
  const { engine } = fresh();
  sync(engine, ['rust-1'], true);
  engine.importState({
    version: 1,
    seals: {
      'rust-1': { code: false, prediction: false, assisted: true },
      'unknown-id': { code: 'ignored' },
    },
    checkpoints: {},
  });
  assert.equal(world(engine).score, 30);
  assert.equal(world(engine).missions[0].assisted, true);
  assert.equal(engine.importState(undefined).changed, false);
  assert.equal(engine.importState(null).changed, false);
  const exported = engine.exportState();
  exported.seals['rust-1'].code = false;
  assert.equal(world(engine).missions[0].code, true); // Snapshot cannot mutate the ledger.
});
test('Corrupt imports are rejected atomically, including out-of-range checkpoint answers', () => {
  const { engine } = fresh();
  sync(engine, ['rust-1'], true);
  const before = plainJson(engine.exportState());
  for (const invalid of [
    { version: 2, seals: {}, checkpoints: {} },
    { version: 1, seals: [], checkpoints: {} },
    {
      version: 1,
      seals: { 'rust-2': { code: true }, 'rust-3': { code: 'true' } },
      checkpoints: {},
    },
    { version: 1, seals: {}, checkpoints: { 'rust-world-1': { passed: true, lastAnswer: 9 } } },
  ]) {
    assert.throws(() => engine.importState(invalid));
    assert.deepEqual(plainJson(engine.exportState()), before);
  }
});
test('Import preflight is pure so the app can validate multiple backup sections before applying any', () => {
  const { engine, store } = fresh();
  const data = {
    version: 1,
    seals: { 'rust-1': { code: true, prediction: true, assisted: false } },
    checkpoints: {},
  };
  assert.deepEqual(plainJson(engine.validateImport(data)), data);
  assert.equal(engine.getSummary('rust').score, 0);
  assert.equal(store.has(storageKey), false);
  assert.equal(engine.validateImport(undefined), undefined);
  assert.throws(() => engine.validateImport({ version: 1, seals: [], checkpoints: {} }));
  assert.equal(engine.getSummary('rust').score, 0);
});
test('Storage reload preserves achievements; unavailable storage keeps in-memory progress', () => {
  const { engine, store } = fresh();
  sync(engine, ['rust-1'], true);
  const restored = fresh(store.get(storageKey));
  assert.equal(world(restored.engine).score, 30);
  const offline = fresh(undefined, true);
  assert.equal(offline.initialized.storageAvailable, false);
  assert.equal(sync(offline.engine, ['rust-1'], true).storageAvailable, false);
  assert.equal(world(offline.engine).score, 30);
});
test('Unreadable saved progress starts blank, keeps a backup copy and warns without touching the key', () => {
  for (const saved of ['{bad json', JSON.stringify({ version: 2, seals: {}, checkpoints: {} })]) {
    const corrupt = fresh(saved);
    assert.equal(
      corrupt.initialized.loadWarning,
      'No se pudo leer el progreso de campaña guardado; se conservó una copia en taller-campaign-v1:respaldo.',
    );
    assert.equal(corrupt.initialized.storageAvailable, true);
    assert.equal(world(corrupt.engine).score, 0);
    assert.equal(corrupt.store.get(backupKey), saved);
    assert.equal(corrupt.store.get(storageKey), saved);
  }
});
test('Loading drops only invalid or unknown entries, keeps the rest and backs up the original text', () => {
  const saved = JSON.stringify({
    version: 1,
    seals: {
      'rust-1': { code: true, prediction: false, assisted: false },
      'rust-2': { code: 'yes' },
      'rust-3': 'broken',
      'ghost-id': { code: true },
    },
    checkpoints: {
      'rust-world-1': { passed: true, lastAnswer: 9 },
      'ghost-world': { passed: true, lastAnswer: 0 },
    },
  });
  const loaded = fresh(saved);
  assert.equal(
    loaded.initialized.loadWarning,
    'Se descartaron 5 registros de campaña que esta versión no reconoce; se conservó una copia en taller-campaign-v1:respaldo.',
  );
  assert.equal(loaded.initialized.storageAvailable, true);
  assert.deepEqual(plainJson(loaded.engine.exportState()), {
    version: 1,
    seals: { 'rust-1': { code: true, prediction: false, assisted: false } },
    checkpoints: {},
  });
  assert.equal(world(loaded.engine).score, 20);
  assert.equal(loaded.store.get(backupKey), saved);
  assert.equal(loaded.store.get(storageKey), saved);
});
test('A valid saved copy loads without warning, backup or writes; the first save keeps the backup', () => {
  const valid = JSON.stringify({
    version: 1,
    seals: { 'rust-1': { code: true, prediction: true, assisted: false } },
    checkpoints: {},
  });
  const loaded = fresh(valid);
  assert.equal(loaded.initialized.loadWarning, '');
  assert.equal(loaded.store.has(backupKey), false);
  assert.equal(world(loaded.engine).score, 30);
  const corrupt = fresh('{bad json');
  sync(corrupt.engine, ['rust-1']);
  assert.equal(corrupt.store.get(backupKey), '{bad json');
  assert.equal(JSON.parse(corrupt.store.get(storageKey) ?? '').seals['rust-1'].code, true);
});
test('Blocked storage reports storageAvailable false without a load warning', () => {
  const offline = fresh(undefined, true);
  assert.equal(offline.initialized.storageAvailable, false);
  assert.equal(offline.initialized.loadWarning, '');
});
test('A degraded load with no room for a backup also reports storageAvailable false, with its own warning', () => {
  const { initialized, store, engine } = fullBackupSlots('{bad json');
  assert.equal(initialized.storageAvailable, false);
  assert.match(initialized.loadWarning ?? '', /no se pudo guardar una copia/);
  assert.equal(store.get(storageKey), '{bad json');
  assert.equal(sync(engine, ['rust-1']).storageAvailable, false);
});
test('Reset removes the saved progress and its backup copy', () => {
  const { engine, store } = fresh('{bad json');
  sync(engine, ['rust-1']);
  assert.equal(store.has(storageKey) && store.has(backupKey), true);
  engine.reset();
  assert.equal(store.has(storageKey), false);
  assert.equal(store.has(backupKey), false);
});
test('Reset clears both languages and checkpoints, then legacy sync can restore real lab achievements', () => {
  const { engine } = fresh();
  eligible(engine);
  engine.answerCheckpoint('rust-world-1', 0);
  sync(engine, ['go-1'], true);
  engine.reset();
  assert.deepEqual(plainJson(engine.exportState()), { version: 1, seals: {}, checkpoints: {} });
  assert.equal(engine.getSummary('rust').completedWorlds, 0);
  assert.equal(engine.getSummary('go').score, 0);
  sync(engine, ['rust-1'], true);
  assert.equal(world(engine).score, 30);
});
test('Configuration rejects duplicate missions and invalid checkpoints before replacing a working campaign', () => {
  const { engine } = fresh();
  sync(engine, ['rust-1'], true);
  const badWorlds = plainJson(worlds);
  badWorlds.rust[1].trainingIds[0] = 'rust-1';
  assert.throws(() => engine.init({ exercises, worlds: badWorlds }));
  assert.equal(world(engine).score, 30);
  const badQuestion = plainJson(worlds);
  badQuestion.rust[0].checkpoint.answer = 3;
  assert.throws(() => engine.init({ exercises, worlds: badQuestion }));
});
// Las cinco ranuras ocupadas con otros textos: la copia de un texto ilegible no tiene lugar.
function fullBackupSlots(mainText: string): Fresh {
  const store = new Map<string, string>([[storageKey, mainText]]);
  for (const slot of [backupKey, ...[2, 3, 4, 5].map((n) => `${backupKey}-${n}`)])
    store.set(slot, 'otro texto ' + slot);
  return freshWith({ store });
}
function savedLedger(store: Map<string, string>): LedgerState {
  return JSON.parse(store.get(storageKey) ?? 'null') as LedgerState;
}

test('refreshFromLab derives evidence in memory without writing; syncLab then writes and reports the XP', () => {
  const { engine, store } = fresh();
  const lab = labWith(['rust-1']);
  const refreshed = engine.refreshFromLab(lab);
  assert.equal(refreshed.changed, true);
  assert.equal(refreshed.storageAvailable, true);
  assert.equal(store.has(storageKey), false);
  assert.equal(engine.getSummary('rust').totalXP, 20);
  // Trampa del render intermedio: el XP derivado antes no se pierde ni deja de escribirse.
  const synced = engine.syncLab(lab);
  assert.equal(synced.xpGained, 20);
  assert.equal(synced.changed, true);
  assert.equal(savedLedger(store).seals['rust-1'].code, true);
  assert.equal(engine.syncLab(lab).xpGained, 0);
});
test('Two tabs: a stale tab keeps the checkpoint the other one passed when it saves its own evidence', () => {
  const store = new Map<string, string>();
  const tabA = freshWith({ store }).engine;
  const tabB = freshWith({ store }).engine; // Carga antes de que A escriba.
  eligible(tabA);
  assert.equal(tabA.answerCheckpoint('rust-world-1', 0).passed, true);
  sync(tabB, ['rust-1', 'go-1']);
  const saved = savedLedger(store);
  assert.deepEqual(saved.checkpoints['rust-world-1'], { passed: true, lastAnswer: 0 });
  assert.equal(saved.seals['go-1'].code, true);
  assert.equal(saved.seals['rust-6'].prediction, true);
  assert.equal(saved.seals['rust-1'].code, true);
});
test('Single tab: reloading after saving keeps exactly what the engine exported', () => {
  const { engine, store } = fresh();
  eligible(engine);
  engine.answerCheckpoint('rust-world-1', 1);
  const reloaded = fresh(store.get(storageKey));
  assert.deepEqual(plainJson(reloaded.engine.exportState()), plainJson(engine.exportState()));
  assert.equal(world(reloaded.engine).checkpointAnswer, 1);
});
test('A degraded load without a backup slot never writes the main key: sync, checkpoint and import stay in memory', () => {
  const { engine, store } = fullBackupSlots('{bad json');
  const before = new Map(store);
  assert.equal(sync(engine, ['rust-1']).storageAvailable, false);
  assert.equal(engine.getSummary('rust').totalXP, 20);
  eligible(engine);
  assert.equal(engine.answerCheckpoint('rust-world-1', 0).accepted, true);
  assert.equal(
    engine.importState({ version: 1, seals: { 'go-1': { code: true } }, checkpoints: {} })
      .storageAvailable,
    false,
  );
  assert.deepEqual([...store], [...before]);
});
test('planImport is pure: it leaves memory, storage and its input untouched, and applyImport persists', () => {
  const { engine, store } = fresh();
  sync(engine, ['rust-1']);
  const stored = store.get(storageKey);
  const memory = JSON.stringify(engine.exportState());
  const raw = {
    version: 1,
    seals: { 'go-1': { code: true, prediction: true, assisted: false } },
    checkpoints: {},
  };
  const input = JSON.stringify(raw);
  const plan = engine.planImport(raw);
  assert.equal(plan.lossy, false);
  assert.equal(plan.state.seals['go-1'].code, true);
  assert.equal(plan.state.seals['rust-1'].code, true); // Fusión con lo local.
  assert.equal(JSON.stringify(engine.exportState()), memory);
  assert.equal(store.get(storageKey), stored);
  assert.equal(JSON.stringify(raw), input);
  const applied = engine.applyImport(plan);
  assert.deepEqual(plainJson(applied), { changed: true, storageAvailable: true });
  assert.equal(savedLedger(store).seals['go-1'].prediction, true);
  assert.equal(engine.getSummary('go').score, 30);
});
test('planImport without a campaign section plans no change; with an invalid record it throws', () => {
  const { engine } = fresh();
  sync(engine, ['rust-1']);
  for (const absent of [undefined, null]) {
    const plan = engine.planImport(absent);
    assert.equal(plan.lossy, false);
    assert.deepEqual(plainJson(plan.state), plainJson(engine.exportState()));
  }
  assert.throws(() => engine.planImport({ version: 1, seals: [], checkpoints: {} }));
});
test('planImport marks as lossy a backup with IDs this catalog does not know', () => {
  const { engine } = fresh();
  const plan = engine.planImport({
    version: 1,
    seals: { 'rust-1': { code: true }, 'ghost-id': { code: true } },
    checkpoints: { 'ghost-world': { passed: true, lastAnswer: 0 } },
  });
  assert.equal(plan.lossy, true);
  assert.equal(engine.planImport({ version: 1, seals: {}, checkpoints: {} }).lossy, false);
});
test('planImport is not lossy for the campaign section of the frozen progress exports', () => {
  const context = vm.createContext({
    window: {} as Record<string, unknown>,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  loadLabExercises(context);
  loadCampaignWorlds(context);
  const catalogExercises: ExerciseFixture[] = [];
  const realWorlds: Worlds = {};
  for (const language of languages) {
    const name = language.toUpperCase();
    realWorlds[language] = context.window[name + '_CAMPAIGN'] as WorldFixture[];
    catalogExercises.push(
      ...(context.window[name + '_LAB'] as ExerciseFixture[]),
      ...(context.window[name + '_QUESTS'] as ExerciseFixture[]),
    );
  }
  for (const domain of SYSTEMS_DOMAINS) {
    loadSystemsDomain(context, domain);
    catalogExercises.push(
      ...(context.window['SYSTEMS_' + domain.toUpperCase() + '_LABS'] as ExerciseFixture[]),
    );
  }
  loadCampaignEngine(context);
  const engine = context.window.TallerCampaignEngine as CampaignEngine;
  engine.init({ exercises: catalogExercises, worlds: realWorlds });
  for (const file of ['progress-master-2a278ad-export.json', 'progress-d0e1b49-export.json']) {
    const exported = JSON.parse(readFileSync('qa/fixtures/' + file, 'utf8')) as {
      campaign: unknown;
    };
    assert.equal(engine.planImport(exported.campaign).lossy, false, file);
  }
});
test('reset reports whether the key and its backup slots were removed', () => {
  const { engine, store } = fresh('{bad json');
  sync(engine, ['rust-1']);
  assert.deepEqual(plainJson(engine.reset()), { storageAvailable: true, removed: true });
  assert.equal(store.has(storageKey) || store.has(backupKey), false);
  const stuck = freshWith({ store: new Map([[storageKey, '{bad json']]), failRemove: true });
  assert.equal(stuck.engine.reset().removed, false);
});
test('After reset the XP baseline restarts: the next sync reports the XP of the evidence again', () => {
  const { engine } = fresh();
  assert.equal(sync(engine, ['rust-1']).xpGained, 20);
  engine.reset();
  assert.equal(sync(engine, ['rust-1']).xpGained, 20);
});
test('backups lists the slot that secured the original text after a degraded load', () => {
  const { engine } = fresh('{bad json');
  assert.deepEqual(plainJson(engine.backups()), [{ key: backupKey, text: '{bad json' }]);
  assert.deepEqual(plainJson(fresh().engine.backups()), []);
});
console.log(passed + ' campaign behavior scenarios PASS.');
