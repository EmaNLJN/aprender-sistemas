/* Offline backup/proof regression checks at public lab and campaign interfaces. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { runSource } from './lib/sources.ts';
import { plainJson as plain } from './lib/plain-json.ts';

interface Evidence {
  id: string;
  passed: boolean;
}
interface LabRecord {
  reflection?: string;
  attempts?: number;
  reviewAt?: number;
  assisted?: boolean;
  result: { stdout: string; customPassed: boolean };
}
interface LabState {
  records: Record<string, LabRecord>;
  selected: Record<string, string>;
}
interface TallerLabApi {
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

function environment(): { lab: TallerLabApi; campaign: CampaignApi } {
  const exercise = {
    id: 'rust-1',
    language: 'rust',
    title: 'Example',
    prediction: { options: ['A', 'B'], answer: 0 },
    tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
  };
  const saved = new Map<string, string>();
  const window = { RUST_LAB: [exercise] } as LabWindow;
  const context = vm.createContext({
    window,
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  });
  for (const file of ['lab.js', 'campaign-engine.js']) runSource(context, file);
  const lab = window.TallerLab,
    campaign = window.TallerCampaignEngine;
  campaign.init({ exercises: [exercise], worlds: { rust: [], go: [] } });
  return { lab, campaign };
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
  assert.equal(clean.records['rust-1'].result.customPassed, true);
  assert.equal(clean.records['rust-1'].result.stdout, 'output');
});

console.log(passed + ' lab state scenarios passed; ' + failed + ' failed.');
if (failed) process.exitCode = 1;
