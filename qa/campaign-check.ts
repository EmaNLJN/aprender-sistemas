/* Offline behavior checks for the campaign ledger and its prerequisite chain. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { plainJson } from './lib/plain-json.ts';
import { loadCampaignEngine } from './lib/legacy-sources.ts';

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
  xpGained: number;
  storageAvailable: boolean;
}
interface InitResult {
  storageAvailable: boolean;
  loadWarning?: string;
}
interface CampaignEngine {
  init(config: { exercises: ExerciseFixture[]; worlds: Worlds }): InitResult;
  syncLab(payload: unknown): SyncResult;
  getWorlds(language: string): WorldView[];
  getSummary(language: string): Summary;
  canAttempt(exerciseId: string, language: string): Attempt;
  answerCheckpoint(worldId: string, answer: number): CheckpointResult;
  exportState(): LedgerState;
  importState(state: unknown): { changed: boolean };
  validateImport(state: unknown): unknown;
  reset(): void;
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
function fresh(saved?: string, failStorage = false): Fresh {
  const store = new Map<string, string>(saved === undefined ? [] : [[storageKey, saved]]);
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
        if (failStorage) throw Error('unavailable');
        store.delete(key);
      },
    },
  });
  loadCampaignEngine(context);
  const engine = context.window.TallerCampaignEngine as CampaignEngine;
  const initialized = engine.init({ exercises, worlds });
  return { engine, store, initialized };
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
function sync(engine: CampaignEngine, ids: string[], prediction = false): SyncResult {
  return engine.syncLab({
    version: 1,
    records: Object.fromEntries(ids.map((id) => [id, good(prediction)])),
  });
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
test('Blocked storage is the only case that reports storageAvailable false, without a load warning', () => {
  const offline = fresh(undefined, true);
  assert.equal(offline.initialized.storageAvailable, false);
  assert.equal(offline.initialized.loadWarning, '');
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
console.log(passed + ' campaign behavior scenarios PASS.');
