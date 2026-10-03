/* Offline backup/proof regression checks at public lab and campaign interfaces. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const plain = (value) => JSON.parse(JSON.stringify(value));
let passed = 0,
  failed = 0;

function environment() {
  const exercise = {
    id: 'rust-1',
    language: 'rust',
    title: 'Example',
    prediction: { options: ['A', 'B'], answer: 0 },
    tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
  };
  const saved = new Map();
  const context = {
    window: { RUST_LAB: [exercise] },
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, value),
    },
  };
  vm.createContext(context);
  for (const file of ['lab.js', 'campaign-engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  const lab = context.window.TallerLab,
    campaign = context.window.TallerCampaignEngine;
  campaign.init({ exercises: [exercise], worlds: { rust: [], go: [] } });
  return { lab, campaign };
}

function backup(tests) {
  return {
    version: 1,
    records: { 'rust-1': { result: { code: 'recorded solution', success: true, tests } } },
  };
}
function test(name, run) {
  try {
    run();
    passed++;
    console.log('PASS ' + name);
  } catch (error) {
    failed++;
    console.error('FAIL ' + name + '\n' + error.stack);
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
