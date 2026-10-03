/* Offline backup/proof regression checks at public lab and campaign interfaces. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadCampaignEngine, loadLab } from './lib/legacy-sources.ts';
import { plainJson as plain } from './lib/plain-json.ts';

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
  reset: () => void;
  importState: (raw: unknown) => void;
  exportState: () => LabState;
  validateImport: (raw: unknown) => LabState;
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
  lab.importState(
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
  lab.importState(
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
  lab.importState(
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
  lab.importState({
    version: 1,
    records: { 'rust-1': { draft: 'keep this draft', reflection: 'keep this note' } },
  });
  const before = plain(lab.exportState());
  assert.throws(() => lab.importState({ version: 1, records: [] }), /compatible/);
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
  const clean = plain(lab.validateImport(raw));
  assert.deepEqual(plain(raw), before);
  assert.deepEqual(plain(lab.exportState()), stateBefore);
  lab.importState(raw);
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
  lab.importState({ version: 1, records: { 'rust-1': local } });
  lab.importState({ version: 1, records: { 'rust-1': incoming } });
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
    lab.importState({ version: 1, records: { 'rust-1': validRecord } });
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

test('An invalid selected entry alone is not a dropped record', () => {
  const text = JSON.stringify({
    version: 1,
    records: { 'rust-1': validRecord },
    selected: { rust: 'go-1', go: 7 },
  });
  const { lab, saved } = environment(text);
  assert.equal(lab.loadWarning(), '');
  assert.equal(saved.has(LAB_BACKUP_KEY), false);
  assert.equal(plain(lab.exportState()).selected.rust, null);
});

test('Blocked storage loads blank without a load warning and saving is the only failure', () => {
  const { lab, saved } = environment(undefined, true);
  assert.equal(lab.loadWarning(), '');
  assert.equal(saved.size, 0);
  assert.doesNotThrow(() => lab.importState({ version: 1, records: { 'rust-1': validRecord } }));
  assert.equal(plain(lab.exportState()).records['rust-1'].attempts, 2);
});

test('Reset removes the saved progress copy and its backup', () => {
  const { lab, saved } = environment('{roto');
  lab.importState({ version: 1, records: { 'rust-1': validRecord } });
  assert.equal(saved.has(LAB_BACKUP_KEY), true);
  lab.reset();
  assert.equal(saved.has(LAB_BACKUP_KEY), false);
  assert.deepEqual(plain(lab.exportState()).records, {});
  assert.equal(lab.loadWarning(), '');
});

console.log(passed + ' lab state scenarios passed; ' + failed + ' failed.');
if (failed) process.exitCode = 1;
