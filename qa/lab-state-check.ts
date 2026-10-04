/* Offline backup/proof regression checks at public lab and campaign interfaces. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadCampaignEngine, loadLab, loadLabCatalogs } from './lib/legacy-sources.ts';
import { plainJson as plain } from './lib/plain-json.ts';
import { importModule, repoRoot } from './lib/sources.ts';

interface Evidence {
  id: string;
  passed: boolean;
}
interface LabRecord {
  draft?: string;
  reflection?: string;
  customTest?: string;
  attempts?: number;
  hints?: number;
  solvedAt?: number;
  reviewAt?: number;
  predictionCorrect?: boolean;
  assisted?: boolean;
  solutionSeen?: boolean;
  result?: { code?: string; success?: boolean; stdout: string; customPassed: boolean };
}
interface LabState {
  records: Record<string, LabRecord>;
  selected: Record<string, string>;
}
interface TallerLabApi {
  loadWarning: () => string;
  reset: () => boolean;
  exportState: () => LabState;
  planImport: (raw: unknown) => { state: LabState; lossy: boolean };
  applyImport: (plan: { state: LabState; lossy: boolean }) => boolean;
  backups: () => { key: string; text: string }[];
  getExercises: () => { id: string; tests: { id: string }[] }[];
  mount: (host: unknown, language: string, notify: (message: string) => void) => void;
}
interface CampaignApi {
  init: (config: { exercises: unknown[]; worlds: Record<string, unknown[]> }) => void;
  syncLab: (state: LabState) => { xpGained: number };
  getSummary: (language: string) => { totalXP: number };
}
interface LabWindow {
  RUST_LAB: unknown[];
  TallerLab: TallerLabApi;
  TallerCampaignEngine: CampaignApi;
}
const { mergeRecord } = await importModule<{
  mergeRecord: (
    local: Record<string, unknown> | undefined,
    incoming: Record<string, unknown>,
    expectedTests: { id: string }[],
  ) => { result?: { code?: string } };
}>('src/entities/exercise/index.ts');
let passed = 0,
  failed = 0;

const LAB_KEY = 'taller-laboratorio-v1';
const LAB_BACKUP_KEY = 'taller-laboratorio-v1:respaldo';
interface Environment {
  lab: TallerLabApi;
  campaign: CampaignApi;
  saved: Map<string, string>;
}

function environment(stored?: string, blocked = false): Environment {
  const exercise = {
    id: 'rust-1',
    language: 'rust',
    title: 'Example',
    prediction: { options: ['A', 'B'], answer: 0 },
    tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
  };
  const saved = new Map<string, string>(stored === undefined ? [] : [[LAB_KEY, stored]]);
  const window = { RUST_LAB: [exercise] } as LabWindow;
  const guard = (): void => {
    if (blocked) throw new Error('almacenamiento bloqueado');
  };
  const context = vm.createContext({
    window,
    localStorage: {
      getItem: (key: string) => (guard(), saved.get(key) ?? null),
      setItem: (key: string, value: string) => (guard(), saved.set(key, value)),
      removeItem: (key: string) => (guard(), saved.delete(key)),
    },
  });
  loadLab(context);
  loadCampaignEngine(context);
  const lab = window.TallerLab,
    campaign = window.TallerCampaignEngine;
  campaign.init({ exercises: [exercise], worlds: { rust: [], go: [] } });
  return { lab, campaign, saved };
}

// Importa en dos fases, como app.js: planifica la copia y aplica el plan.
function importState(lab: TallerLabApi, raw: unknown): void {
  lab.applyImport(lab.planImport(raw));
}
function backup(tests: Evidence[]) {
  return {
    version: 1,
    records: { 'rust-1': { result: { code: 'recorded solution', success: true, tests } } },
  };
}
function test(name: string, run: () => void): void {
  try {
    run();
    passed++;
    console.log('PASS ' + name);
  } catch (error) {
    failed++;
    console.error('FAIL ' + name + '\n' + (error as Error).stack);
  }
}

test('Contradictory duplicate evidence cannot earn a code seal through lab import', () => {
  const { lab, campaign } = environment();
  importState(
    lab,
    backup([
      { id: 't1', passed: true },
      { id: 't1', passed: false },
      { id: 't2', passed: true },
      { id: 't3', passed: true },
    ]),
  );
  assert.equal(campaign.syncLab(lab.exportState()).xpGained, 0);
  assert.equal(campaign.getSummary('rust').totalXP, 0);
});

test('Repeated passing evidence cannot become unique proof through lab import', () => {
  const { lab, campaign } = environment();
  importState(
    lab,
    backup([
      { id: 't1', passed: true },
      { id: 't1', passed: true },
      { id: 't2', passed: true },
      { id: 't3', passed: true },
    ]),
  );
  assert.equal(campaign.syncLab(lab.exportState()).xpGained, 0);
});

test('Unique passing evidence remains compatible with legacy backups and earns code XP once', () => {
  const { lab, campaign } = environment();
  importState(
    lab,
    backup([
      { id: 't1', passed: true },
      { id: 't2', passed: true },
      { id: 't3', passed: true },
    ]),
  );
  assert.equal(campaign.syncLab(lab.exportState()).xpGained, 20);
  assert.equal(campaign.syncLab(lab.exportState()).xpGained, 0);
});

test('An array of lab records is rejected before replacing existing progress', () => {
  const { lab } = environment();
  importState(lab, {
    version: 1,
    records: { 'rust-1': { draft: 'keep this draft', reflection: 'keep this note' } },
  });
  const before = plain(lab.exportState());
  assert.throws(() => importState(lab, { version: 1, records: [] }), /compatible/);
  assert.deepEqual(plain(lab.exportState()), before);
});

test('Backup preflight is pure and preserves valid notes, selection and proof fields', () => {
  const { lab } = environment();
  const raw = {
    version: 1,
    records: {
      'rust-1': {
        draft: 'my draft',
        reflection: 'my explanation',
        customTest: '1 == 1',
        attempts: 2,
        hints: 1,
        solvedAt: 100,
        reviewAt: 200,
        reviewedAt: 150,
        prediction: 0,
        predictionCorrect: true,
        assisted: true,
        solutionSeen: true,
        confidence: 'practice',
        result: {
          code: 'old verified draft',
          success: true,
          stdout: 'output',
          stderr: 'warning',
          tests: [
            { id: 't1', passed: true },
            { id: 't2', passed: true },
            { id: 't3', passed: true },
          ],
          customTest: '1 == 1',
          customPassed: true,
          time: 90,
        },
      },
    },
    selected: { rust: 'rust-1' },
  };
  const before = plain(raw),
    stateBefore = plain(lab.exportState());
  const clean = plain(lab.planImport(raw).state);
  assert.deepEqual(plain(raw), before);
  assert.deepEqual(plain(lab.exportState()), stateBefore);
  importState(lab, raw);
  const restored = plain(lab.exportState());
  assert.equal(restored.selected.rust, 'rust-1');
  assert.equal(restored.records['rust-1'].reflection, 'my explanation');
  assert.equal(restored.records['rust-1'].attempts, 2);
  assert.equal(restored.records['rust-1'].reviewAt, 200);
  assert.equal(restored.records['rust-1'].assisted, true);
  assert.equal(clean.records['rust-1'].result?.customPassed, true);
  assert.equal(clean.records['rust-1'].result?.stdout, 'output');
});

const allPassed: Evidence[] = [
  { id: 't1', passed: true },
  { id: 't2', passed: true },
  { id: 't3', passed: true },
];
const noneRan: Evidence[] = allPassed.map(({ id }) => ({ id, passed: false }));

function importTwice(local: object, incoming: object): LabRecord {
  const { lab } = environment();
  importState(lab, { version: 1, records: { 'rust-1': local } });
  importState(lab, { version: 1, records: { 'rust-1': incoming } });
  return plain(lab.exportState()).records['rust-1'];
}

test('A backup without help marks does not clear local ones', () => {
  const merged = importTwice(
    { assisted: true, solutionSeen: true, predictionCorrect: true },
    { attempts: 1 },
  );
  assert.equal(merged.assisted, true);
  assert.equal(merged.solutionSeen, true);
  assert.equal(merged.predictionCorrect, true);
  assert.equal(merged.attempts, 1);
});

test('A backup with help marks adds them to a clean local record', () => {
  const merged = importTwice({ attempts: 3 }, { assisted: true, predictionCorrect: true });
  assert.equal(merged.assisted, true);
  assert.equal(merged.predictionCorrect, true);
  assert.equal(merged.solutionSeen, false);
});

test('solvedAt keeps the oldest value when both sides have one', () => {
  assert.equal(importTwice({ solvedAt: 100 }, { solvedAt: 500 }).solvedAt, 100);
  assert.equal(importTwice({ solvedAt: 500 }, { solvedAt: 100 }).solvedAt, 100);
});

test('solvedAt 0 on one side keeps the positive value of the other', () => {
  assert.equal(importTwice({ solvedAt: 0 }, { solvedAt: 300 }).solvedAt, 300);
  assert.equal(importTwice({ solvedAt: 300 }, { solvedAt: 0 }).solvedAt, 300);
});

test('solvedAt from only one side is kept', () => {
  assert.equal(importTwice({ attempts: 1 }, { solvedAt: 300 }).solvedAt, 300);
  assert.equal(importTwice({ solvedAt: 300 }, { attempts: 1 }).solvedAt, 300);
});

test('A local result with passing evidence is not replaced by one without it', () => {
  const merged = importTwice(
    { result: { code: 'local solution', success: true, stdout: 'ok', tests: allPassed } },
    { result: { code: 'failed attempt', success: true, stdout: 'bad', tests: noneRan } },
  );
  assert.equal(merged.result?.code, 'local solution');
  assert.equal(merged.result?.stdout, 'ok');
});

test('A local result whose own tests are not the expected ones does not count as proof', () => {
  const expectedTests = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];
  const incoming = { result: { code: 'imported attempt', success: true, tests: noneRan } };
  for (const tests of [[], [{ id: 't1', passed: true }]]) {
    const local = { result: { code: 'local', success: true, tests } };
    assert.equal(mergeRecord(local, incoming, expectedTests).result?.code, 'imported attempt');
  }
  const proving = { result: { code: 'local', success: true, tests: allPassed } };
  assert.equal(mergeRecord(proving, incoming, expectedTests).result?.code, 'local');
});

test('An imported result replaces a local one without evidence, or one with evidence', () => {
  const failing = { code: 'local attempt', success: false, stdout: 'local', tests: noneRan };
  const solving = { code: 'imported solution', success: true, stdout: 'ok', tests: allPassed };
  assert.equal(
    importTwice({ result: failing }, { result: solving }).result?.code,
    'imported solution',
  );
  assert.equal(
    importTwice({ result: solving }, { result: { ...solving, code: 'newer solution' } }).result
      ?.code,
    'newer solution',
  );
  assert.equal(importTwice({ result: failing }, { attempts: 2 }).result?.code, 'local attempt');
});

test('Empty imported drafts and reflections do not overwrite local ones', () => {
  const merged = importTwice(
    { draft: 'local draft', reflection: 'local note' },
    { draft: '', reflection: '' },
  );
  assert.equal(merged.draft, 'local draft');
  assert.equal(merged.reflection, 'local note');
});

test('Non-empty imported drafts and reflections replace local ones', () => {
  const merged = importTwice(
    { draft: 'local draft', reflection: 'local note' },
    { draft: 'imported draft', reflection: 'imported note' },
  );
  assert.equal(merged.draft, 'imported draft');
  assert.equal(merged.reflection, 'imported note');
});

test('Other imported fields still replace local ones', () => {
  const merged = importTwice(
    { attempts: 9, hints: 3, reviewAt: 900, customTest: '1 == 1' },
    { attempts: 2, hints: 1, reviewAt: 100, customTest: '2 == 2' },
  );
  assert.equal(merged.attempts, 2);
  assert.equal(merged.hints, 1);
  assert.equal(merged.reviewAt, 100);
  assert.equal(merged.customTest, '2 == 2');
});

const validRecord = { draft: 'borrador conservado', attempts: 2 };

test('Loading a valid copy keeps it, warns nothing and writes nothing', () => {
  const text = JSON.stringify({ version: 1, records: { 'rust-1': validRecord } });
  const { lab, saved } = environment(text);
  assert.equal(lab.loadWarning(), '');
  assert.equal(plain(lab.exportState()).records['rust-1'].draft, 'borrador conservado');
  assert.deepEqual([...saved.keys()], [LAB_KEY]);
  assert.equal(saved.get(LAB_KEY), text);
});

test('An unreadable copy starts blank, keeps a backup and the first save does not lose it', () => {
  for (const text of ['{roto', JSON.stringify({ version: 2, records: {} })]) {
    const { lab, saved } = environment(text);
    assert.equal(
      lab.loadWarning(),
      'No se pudo leer el progreso del laboratorio guardado; se conservó una copia en taller-laboratorio-v1:respaldo.',
    );
    assert.deepEqual(plain(lab.exportState()).records, {});
    assert.equal(saved.get(LAB_BACKUP_KEY), text);
    assert.equal(saved.get(LAB_KEY), text);
    importState(lab, { version: 1, records: { 'rust-1': validRecord } });
    assert.equal(saved.get(LAB_BACKUP_KEY), text);
    assert.equal(JSON.parse(saved.get(LAB_KEY) ?? '').records['rust-1'].attempts, 2);
  }
});

test('Loading drops records of unknown ids or non-objects, keeps the rest and backs up the text', () => {
  const text = JSON.stringify({
    version: 1,
    records: {
      'rust-1': validRecord,
      'desconocido-9': { draft: 'x' },
      'rust-2': 'texto',
      'rust-3': null,
    },
    selected: { rust: 'rust-1', go: 'go-999' },
  });
  const { lab, saved } = environment(text);
  assert.equal(
    lab.loadWarning(),
    'Se descartaron 3 registros del laboratorio que esta versión no reconoce; se conservó una copia en taller-laboratorio-v1:respaldo.',
  );
  const state = plain(lab.exportState());
  assert.deepEqual(Object.keys(state.records), ['rust-1']);
  assert.equal(state.selected.rust, 'rust-1');
  assert.equal(saved.get(LAB_BACKUP_KEY), text);
  assert.equal(saved.get(LAB_KEY), text);
});

test('A known id whose record is not an object is dropped too', () => {
  const text = JSON.stringify({ version: 1, records: { 'rust-1': 'texto' } });
  const { lab, saved } = environment(text);
  assert.match(lab.loadWarning(), /^Se descartó 1 registro del laboratorio /);
  assert.deepEqual(plain(lab.exportState()).records, {});
  assert.equal(saved.get(LAB_BACKUP_KEY), text);
});

test('An invalid selected entry is not a dropped record but is a loss: backup and data warning', () => {
  const text = JSON.stringify({
    version: 1,
    records: { 'rust-1': validRecord },
    selected: { rust: 'go-1', go: 7 },
  });
  const { lab, saved } = environment(text);
  assert.equal(
    lab.loadWarning(),
    'Se descartaron datos del laboratorio que esta versión no reconoce; se conservó una copia en taller-laboratorio-v1:respaldo.',
  );
  assert.equal(saved.get(LAB_BACKUP_KEY), text);
  assert.equal(plain(lab.exportState()).selected.rust, null);
});

test('A saved copy with solvedAt 0 loads unsolved, with a backup and a data warning', () => {
  const text = JSON.stringify({
    version: 1,
    records: { 'rust-1': { ...validRecord, solvedAt: 0 } },
  });
  const { lab, saved } = environment(text);
  assert.equal(plain(lab.exportState()).records['rust-1'].solvedAt, undefined);
  assert.equal(
    lab.loadWarning(),
    'Se descartaron datos del laboratorio que esta versión no reconoce; se conservó una copia en taller-laboratorio-v1:respaldo.',
  );
  assert.equal(saved.get(LAB_BACKUP_KEY), text);
});

test('Blocked storage loads blank without a load warning and saving is the only failure', () => {
  const { lab, saved } = environment(undefined, true);
  assert.equal(lab.loadWarning(), '');
  assert.equal(saved.size, 0);
  assert.doesNotThrow(() => importState(lab, { version: 1, records: { 'rust-1': validRecord } }));
  assert.equal(plain(lab.exportState()).records['rust-1'].attempts, 2);
});

test('Reset removes the saved progress copy and its backup', () => {
  const { lab, saved } = environment('{roto');
  importState(lab, { version: 1, records: { 'rust-1': validRecord } });
  assert.equal(saved.has(LAB_BACKUP_KEY), true);
  lab.reset();
  assert.equal(saved.has(LAB_BACKUP_KEY), false);
  assert.deepEqual(plain(lab.exportState()).records, {});
  assert.equal(lab.loadWarning(), '');
});

async function testAsync(name: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
    passed++;
    console.log('PASS ' + name);
  } catch (error) {
    failed++;
    console.error('FAIL ' + name + '\n' + (error as Error).stack);
  }
}

// --- Pestañas con el catálogo real y un DOM mínimo para disparar los handlers de lab.js ---

const SLOT_KEYS = [LAB_BACKUP_KEY, ...[2, 3, 4, 5].map((number) => `${LAB_BACKUP_KEY}-${number}`)];
const SYNC_FAILURE_NOTICE = 'No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.';

interface StubElement {
  innerHTML: string;
  textContent: string;
  open: boolean;
  value: string;
  classList: { toggle(): void; add(): void };
  setAttribute(): void;
  replaceWith(): void;
  focus(): void;
  select(): void;
  scrollIntoView(): void;
  content: { querySelector(): StubElement; firstElementChild: StubElement };
}
interface TabOptions {
  failRemove?: boolean;
  campaignSync?: () => { xpGained?: number } | undefined;
  runner?: () => Promise<unknown>;
}
interface Tab {
  lab: TallerLabApi;
  notices: string[];
  errors: unknown[];
  host: StubElement;
  click(action: string, data?: Record<string, string>): void;
  type(id: string, value: string): StubElement;
  element(selector: string): StubElement;
}

function stubElement(): StubElement {
  const element: StubElement = {
    innerHTML: '',
    textContent: '',
    open: false,
    value: '',
    classList: { toggle: () => undefined, add: () => undefined },
    setAttribute: () => undefined,
    replaceWith: () => undefined,
    focus: () => undefined,
    select: () => undefined,
    scrollIntoView: () => undefined,
    content: {
      querySelector: () => element,
      get firstElementChild() {
        return element;
      },
    },
  };
  return element;
}

// Una pestaña del navegador sobre el almacenamiento compartido `saved`. El host acepta los
// listeners que registra mount y devuelve el mismo elemento falso por selector, salvo el
// contexto de campaña, que sólo existe si el check lo agrega.
function openTab(saved: Map<string, string>, options: TabOptions = {}): Tab {
  const listeners = new Map<string, (event: unknown) => void>();
  const elements = new Map<string, StubElement>();
  const element = (selector: string): StubElement => {
    if (!elements.has(selector)) elements.set(selector, stubElement());
    return elements.get(selector) as StubElement;
  };
  const host = {
    ...stubElement(),
    addEventListener: (type: string, listener: (event: unknown) => void) =>
      void listeners.set(type, listener),
    removeEventListener: () => undefined,
    querySelector: (selector: string) =>
      selector === '.quest-lab-context' ? null : element(selector),
    querySelectorAll: () => [],
  };
  const notices: string[] = [];
  const errors: unknown[] = [];
  const window: Record<string, unknown> = {};
  const context = vm.createContext({
    window,
    URL,
    URLSearchParams,
    AbortController,
    location: { search: '', hash: '', href: 'http://taller.test/' },
    history: { replaceState: () => undefined },
    document: { createElement: stubElement, activeElement: null },
    console: { error: (error: unknown) => errors.push(error) },
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => void saved.set(key, value),
      removeItem: (key: string) => {
        if (options.failRemove) throw new Error('no se puede borrar');
        saved.delete(key);
      },
    },
  });
  loadLabCatalogs(context);
  if (options.campaignSync) {
    window.TallerCampaign = {
      sync: options.campaignSync,
      refresh: () => undefined,
      exerciseContextHTML: () => '',
      lockedExerciseHTML: () => '',
    };
    window.TallerCampaignEngine = { canAttempt: () => ({ worldId: 'mundo-1' }) };
  }
  if (options.runner) window.TallerRunner = { run: options.runner };
  loadLab(context);
  const lab = window.TallerLab as TallerLabApi;
  lab.mount(host, 'rust', (message) => notices.push(message));
  const dispatch = (type: string, event: object): void => {
    (listeners.get(type) as (event: unknown) => void)(event);
  };
  return {
    lab,
    notices,
    errors,
    host,
    element,
    click(action, data = {}) {
      const target = { dataset: { labAction: action, ...data }, closest: () => target };
      dispatch('click', { target });
    },
    type(id, value) {
      const target = element('#' + id);
      Object.assign(target, { id, value });
      dispatch('input', { target });
      return element('#' + id + '-status');
    },
  };
}

function fullProof(lab: TallerLabApi, id: string): LabRecord {
  const tests = (lab.getExercises().find((exercise) => exercise.id === id)?.tests ?? []).map(
    (item) => ({ id: item.id, passed: true }),
  );
  return {
    solvedAt: 100,
    result: { code: 'solución de A', success: true, stdout: '', customPassed: false, tests },
  } as LabRecord;
}

function storedRecords(saved: Map<string, string>): Record<string, LabRecord> {
  return JSON.parse(saved.get(LAB_KEY) ?? '{}').records;
}

test('Two tabs: a stale tab keeps the other tab progress and its own consecutive saves', () => {
  const saved = new Map<string, string>();
  const tabA = openTab(saved),
    tabB = openTab(saved);
  const { lab } = tabA;
  const proof = fullProof(lab, 'rust-01');
  assert.equal(
    lab.applyImport(lab.planImport({ version: 1, records: { 'rust-01': proof } })),
    true,
  );
  tabB.click('open', { id: 'rust-02' });
  tabB.click('predict', { answer: '1' });
  tabB.click('hint');
  const records = storedRecords(saved);
  assert.equal(records['rust-01'].solvedAt, 100);
  assert.equal(records['rust-01'].result?.success, true);
  assert.equal((records['rust-02'] as { prediction?: number }).prediction, 1);
  assert.equal(records['rust-02'].hints, 1);
  assert.equal(JSON.parse(saved.get(LAB_KEY) ?? '{}').selected.rust, 'rust-02');
});

test('Two tabs: the merge happens in place, so a record held across the merging save keeps mutating', () => {
  const saved = new Map<string, string>();
  const tabA = openTab(saved),
    tabB = openTab(saved);
  tabB.click('open', { id: 'rust-02' }); // crea el registro vacío de rust-02 al renderizar
  const { lab } = tabA;
  lab.applyImport(
    lab.planImport({ version: 1, records: { 'rust-01': fullProof(lab, 'rust-01') } }),
  );
  tabB.click('predict', { answer: '1' }); // este guardado fusiona lo de A
  tabB.click('hint');
  tabB.click('hint');
  const records = storedRecords(saved);
  assert.equal(records['rust-01'].solvedAt, 100);
  assert.equal((records['rust-02'] as { prediction?: number }).prediction, 1);
  assert.equal(records['rust-02'].hints, 2);
});

// Un solo handler guarda dos veces sobre el mismo `record`: la ejecución suma el intento
// (primer guardado, que fusiona lo de A) y, al volver del compilador, escribe el resultado
// sobre la referencia que ya tenía.
await testAsync(
  'Two tabs: a run keeps writing its held record after the save that merged the other tab',
  async () => {
    const saved = new Map<string, string>();
    const tabA = openTab(saved);
    const tabB = openTab(saved, { runner: () => Promise.reject(new Error('sin red')) });
    tabB.click('open', { id: 'rust-02' });
    const { lab } = tabA;
    lab.applyImport(
      lab.planImport({ version: 1, records: { 'rust-01': fullProof(lab, 'rust-01') } }),
    );
    tabB.click('run');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const records = storedRecords(saved);
    assert.equal(records['rust-01'].solvedAt, 100);
    assert.equal(records['rust-02'].attempts, 1);
    assert.equal((records['rust-02'].result as { transportError?: boolean }).transportError, true);
  },
);

test('One tab: emptied draft and reflection reload empty, without merging anything', () => {
  const saved = new Map<string, string>();
  const first = openTab(saved);
  first.click('open', { id: 'rust-02' });
  first.type('lab-reflection', 'mi explicación');
  first.type('lab-code', 'fn main() {}');
  first.type('lab-reflection', '');
  first.type('lab-code', '');
  const reloaded = openTab(saved).lab.exportState();
  assert.equal(reloaded.records['rust-02'].reflection, '');
  assert.equal(reloaded.records['rust-02'].draft, '');
});

test('planImport is pure and applyImport persists the planned state', () => {
  const saved = new Map<string, string>();
  const { lab } = openTab(saved);
  const raw = { version: 1, records: { 'rust-02': { draft: 'borrador importado', attempts: 2 } } };
  const rawBefore = plain(raw),
    stateBefore = plain(lab.exportState()),
    storageBefore = [...saved.entries()];
  const plan = lab.planImport(raw);
  assert.equal(plan.state.records['rust-02'].draft, 'borrador importado');
  assert.deepEqual(plain(raw), rawBefore);
  assert.deepEqual(plain(lab.exportState()), stateBefore);
  assert.deepEqual([...saved.entries()], storageBefore);
  assert.equal(lab.applyImport(plan), true);
  assert.equal(plain(lab.exportState()).records['rust-02'].draft, 'borrador importado');
  assert.equal(storedRecords(saved)['rust-02'].draft, 'borrador importado');
});

test('planImport rejects an invalid shape as the import always did', () => {
  const { lab } = openTab(new Map());
  assert.throws(() => lab.planImport({ version: 1, records: [] }), /compatible/);
});

test('planImport reports a lossy import for unknown ids and a lossless one for real exports', () => {
  const { lab } = openTab(new Map());
  const unknown = { version: 1, records: { 'desconocido-9': { draft: 'x' } } };
  assert.equal(lab.planImport(unknown).lossy, true);
  for (const name of ['progress-master-2a278ad-export.json', 'progress-d0e1b49-export.json']) {
    const exported = JSON.parse(fs.readFileSync(path.join(repoRoot, 'qa/fixtures', name), 'utf8'));
    assert.equal(lab.planImport(exported.lab).lossy, false, name);
  }
});

function predictionTab(campaignSync: TabOptions['campaignSync']): Tab {
  const tab = openTab(new Map(), { campaignSync });
  tab.click('open', { id: 'rust-02' });
  return tab;
}

test('A failing campaign sync after a prediction is not propagated and is reported once', () => {
  const tab = predictionTab(() => {
    throw new Error('campaña caída');
  });
  assert.doesNotThrow(() => tab.click('predict', { answer: '1' }));
  assert.deepEqual(tab.notices, [SYNC_FAILURE_NOTICE]);
  assert.equal(tab.errors.length, 1);
});

test('A prediction that earns campaign XP announces them', () => {
  const tab = predictionTab(() => ({ xpGained: 15 }));
  tab.click('predict', { answer: '1' });
  assert.deepEqual(tab.notices, ['+15 XP por razonar tu predicción.']);
});

test('Reset reports success and clears the backup slots; a failing removal reports false', () => {
  const saved = new Map<string, string>([[LAB_KEY, '{roto']]);
  const { lab } = openTab(saved);
  assert.equal(saved.get(LAB_BACKUP_KEY), '{roto');
  assert.equal(lab.reset(), true);
  for (const slot of SLOT_KEYS) assert.equal(saved.has(slot), false, slot);
  const stuck = new Map<string, string>([[LAB_KEY, '{roto']]);
  assert.equal(openTab(stuck, { failRemove: true }).lab.reset(), false);
});

test('backups lists the slot created by a degraded load', () => {
  const { lab } = openTab(new Map([[LAB_KEY, '{roto']]));
  assert.deepEqual(plain(lab.backups()), [{ key: LAB_BACKUP_KEY, text: '{roto' }]);
});

test('A degraded load without a secured copy never touches the key and never says saved', () => {
  const saved = new Map<string, string>([[LAB_KEY, '{roto']]);
  SLOT_KEYS.forEach((slot, index) => saved.set(slot, `otro texto ${index}`));
  const before = [...saved.entries()];
  const tab = openTab(saved);
  assert.ok(tab.host.innerHTML.includes('El guardado local no está disponible'));
  tab.click('open', { id: 'rust-02' });
  const status = tab.type('lab-reflection', 'no se puede guardar');
  assert.equal(status.textContent, 'El guardado no está disponible: exportá tu avance.');
  assert.equal(tab.lab.applyImport(tab.lab.planImport({ version: 1, records: {} })), false);
  assert.deepEqual([...saved.entries()], before);
});

console.log(passed + ' lab state scenarios passed; ' + failed + ' failed.');
if (failed) process.exitCode = 1;
