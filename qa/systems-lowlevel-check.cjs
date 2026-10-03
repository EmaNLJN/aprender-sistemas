/* Pure-model tests: no browser, network, timers or compiler service calls. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
for (const filename of ['systems-lowlevel.js', 'systems-lowlevel-labs.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, filename), 'utf8'), context, { filename });
}
const { workshops, models } = context.window.SYSTEMS_LOWLEVEL;
const plain = (value) => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  process.stdout.write(`PASS ${name}\n`);
}
function advance(id, state, action, value) {
  const model = models[id],
    workshop = workshops.find((w) => w.id === id),
    before = JSON.stringify(state);
  freeze(state);
  const next = model.act(state, action, value, workshop);
  assert.equal(JSON.stringify(state), before, `${id}: act mutated its input`);
  assert.doesNotThrow(() => JSON.stringify(next));
  const viewBefore = JSON.stringify(next),
    rendered = model.view(next, workshop);
  assert.equal(JSON.stringify(next), viewBefore, `${id}: view mutated state`);
  assert(
    Array.isArray(rendered.controls) &&
      Array.isArray(rendered.metrics) &&
      Array.isArray(rendered.cells),
  );
  assert(Array.isArray(rendered.log) && rendered.log.length <= 12);
  for (const cell of rendered.cells) assert(['active', 'good', 'bad', 'muted'].includes(cell.tone));
  const objectiveIds = workshop.objectives.map((o) => o.id);
  for (const id of model.achieved(next, workshop))
    assert(objectiveIds.includes(id), 'Unknown objective');
  return next;
}
function play(id, actions) {
  let state = models[id].initial(workshops.find((w) => w.id === id));
  for (const action of actions) state = advance(id, state, action[0], action[1]);
  return state;
}
function allGoals(id, state) {
  assert.deepEqual(
    plain(models[id].achieved(state)).sort(),
    plain(workshops.find((w) => w.id === id).objectives.map((o) => o.id)).sort(),
  );
}

test('Eight models, sixteen executable cores and unambiguous links', () => {
  assert.equal(workshops.length, 8);
  const labs = context.window.SYSTEMS_LOWLEVEL_LABS;
  assert.equal(labs.length, 16);
  assert.equal(new Set(labs.map((x) => x.id)).size, 16);
  for (const [index, w] of workshops.entries()) {
    assert.equal(w.objectives.length, 3);
    assert.equal(w.steps.length, 4);
    assert.equal(w.prediction.options.length, 3);
    assert(models[w.model]);
    for (const language of ['rust', 'go']) {
      assert.equal(w.code[language], `${language}-${113 + index}`);
      const lab = labs.find((x) => x.id === w.code[language]);
      assert.equal(lab.stage, 25 + index);
      assert.equal(lab.level, w.level);
      assert.equal(lab.tests.length, 3);
      assert.equal(lab.hints.length, 3);
      assert.notEqual(lab.starter, lab.solution);
    }
  }
});

test('LRU promotes hits and evicts the actual least recent key', () => {
  const s = play(
    'cache',
    ['A', 'B', 'C', 'A', 'D'].map((key) => ['read', key]),
  );
  assert.deepEqual(plain(s.entries), ['C', 'A', 'D']);
  assert.equal(s.hits, 1);
  assert.equal(s.misses, 4);
  assert.equal(s.evictions, 1);
  assert.equal(new Set(s.entries).size, s.entries.length);
  allGoals('cache', s);
});

test('Cache remains bounded under repeated and alternating access', () => {
  let s = models.cache.initial();
  for (let i = 0; i < 40; i++) {
    s = advance('cache', s, 'read', ['A', 'B', 'A', 'C', 'D'][i % 5]);
    assert(s.entries.length <= 3);
    assert.equal(new Set(s.entries).size, s.entries.length);
    assert.equal(s.hits + s.misses, i + 1);
  }
});

test('Heap distinguishes total free from the largest contiguous hole', () => {
  let s = play('heap', [
    ['allocate', '6'],
    ['allocate', '6'],
    ['allocate', '6'],
    ['allocate', '6'],
    ['free', 'A2'],
    ['free', 'A4'],
  ]);
  const before = plain(s.blocks);
  s = advance('heap', s, 'allocate', '8');
  assert.equal(s.failures, 1);
  assert.deepEqual(plain(s.blocks), before);
  s = advance('heap', s, 'free', 'A3');
  s = advance('heap', s, 'coalesce');
  assert.deepEqual(plain(s.blocks), [
    { start: 0, size: 6, owner: 'A1' },
    { start: 6, size: 18, owner: null },
  ]);
  allGoals('heap', s);
  s = advance('heap', s, 'allocate', '12');
  assert.deepEqual(plain(s.blocks), [
    { start: 0, size: 6, owner: 'A1' },
    { start: 6, size: 12, owner: 'A5' },
    { start: 18, size: 6, owner: null },
  ]);
});

test('Heap partition preserves all 24 units through split/free/coalesce', () => {
  let s = models.heap.initial();
  for (const [action, value] of [
    ['allocate', '4'],
    ['allocate', '8'],
    ['allocate', '6'],
    ['free', 'A2'],
    ['allocate', '6'],
    ['free', 'A1'],
    ['free', 'A3'],
    ['coalesce'],
    ['free', 'missing'],
  ]) {
    s = advance('heap', s, action, value);
    let cursor = 0;
    for (const b of s.blocks) {
      assert.equal(b.start, cursor);
      assert(b.size > 0);
      cursor += b.size;
    }
    assert.equal(cursor, 24);
    const owners = s.blocks.filter((b) => b.owner !== null).map((b) => b.owner);
    assert.equal(new Set(owners).size, owners.length);
  }
});

test('MMU distinguishes successful translation, protection and missing mappings', () => {
  let s = play('mmu', [['access', '1:r']]);
  assert.equal(s.last, 'VA 1 → PA 9');
  s = advance('mmu', s, 'access', '1:w');
  assert.equal(s.last, 'Fallo de protección');
  s = advance('mmu', s, 'access', '9:r');
  assert.equal(s.last, 'Fallo: no presente');
  assert.equal(s.faults, 2);
  s = advance('mmu', s, 'map');
  s = advance('mmu', s, 'access', '9:r');
  assert.equal(s.last, 'VA 9 → PA 13');
  allGoals('mmu', s);
  s = advance('mmu', s, 'write-enable');
  s = advance('mmu', s, 'access', '1:w');
  assert.equal(s.last, 'VA 1 → PA 9');
  assert.equal(s.faults, 2);
});

test('TLB demonstrates stale data and recovers only after invalidation/refill', () => {
  let s = play('tlb', [['read'], ['read'], ['remap'], ['read']]);
  assert.equal(s.last, 'VA 1 → PA 5');
  assert.equal(s.tableFrame, 3);
  assert.equal(s.cachedFrame, 1);
  assert.equal(s.flags.recover, undefined);
  s = advance('tlb', s, 'invalidate');
  assert.equal(s.cachedFrame, null);
  s = advance('tlb', s, 'read');
  assert.equal(s.last, 'VA 1 → PA 13');
  assert.equal(s.hits, 2);
  assert.equal(s.misses, 2);
  allGoals('tlb', s);
});

test('VM byte offsets trace a countdown and halt at the known instruction count', () => {
  let s = models.vm.initial();
  const expected = [
    [2, 3],
    [3, 2],
    [2, 2],
    [3, 1],
    [2, 1],
    [3, 0],
    [5, 0],
    [5, 0],
  ];
  for (const [pc, acc] of expected) {
    s = advance('vm', s, 'step');
    assert.equal(s.pc, pc);
    assert.equal(s.accumulator, acc);
  }
  assert.equal(s.executed, 8);
  assert.equal(s.stopped, true);
  assert.equal(s.error, '');
  const unchanged = advance('vm', s, 'step');
  assert.deepEqual(plain(unchanged), plain(s));
  s = advance('vm', s, 'loop');
  for (let i = 0; i < 5; i++) s = advance('vm', s, 'step');
  assert.equal(s.executed, 4);
  assert.equal(s.error, 'Presupuesto agotado');
  allGoals('vm', s);
});

test('Stack preserves locals and restores nested continuations', () => {
  let s = play('stack', [['call', 'f'], ['local'], ['call', 'g'], ['local']]);
  assert.deepEqual(plain(s.frames.map((f) => f.local)), [1, 1, 1]);
  s = advance('stack', s, 'return');
  assert.equal(s.pc, 2);
  assert.equal(s.frames.at(-1).name, 'f');
  s = advance('stack', s, 'return');
  assert.equal(s.pc, 1);
  assert.equal(s.frames[0].local, 1);
  const root = plain(s.frames);
  s = advance('stack', s, 'return');
  assert.deepEqual(plain(s.frames), root);
  allGoals('stack', s);
});

test('Stack rejects overflow without overwriting saved return addresses', () => {
  let s = play('stack', [
    ['call', 'f'],
    ['call', 'g'],
    ['call', 'f'],
  ]);
  const before = plain(s.frames);
  s = advance('stack', s, 'call', 'g');
  assert.equal(s.frames.length, 4);
  assert.deepEqual(plain(s.frames), before);
  assert.equal(s.flags.guard, true);
});

test('Round-robin with block/wake conserves total CPU work', () => {
  let s = models.scheduler.initial();
  const events = ['tick', 'block', 'tick', 'wake', 'tick', 'tick', 'tick', 'tick'];
  for (const action of events) {
    s = advance('scheduler', s, action);
    assert.equal(s.time + Object.values(s.jobs).reduce((a, b) => a + b, 0), 6);
    const membership = [...s.ready, ...s.blocked, ...s.done];
    assert.equal(membership.length, 3);
    assert.equal(new Set(membership).size, 3);
    assert(Object.values(s.jobs).every((n) => n >= 0));
  }
  assert.equal(s.time, 6);
  assert.deepEqual(plain(s.done), ['C', 'A', 'B']);
  allGoals('scheduler', s);
});

test('Idle cannot consume blocked work', () => {
  const s = play('scheduler', [['block'], ['block'], ['block'], ['tick']]);
  assert.equal(s.time, 0);
  assert.equal(s.running, 'Idle');
  assert.deepEqual(plain(s.jobs), { A: 3, B: 2, C: 1 });
});

test('Masked IRQ stays pending, ACK clears only after service and new events work', () => {
  let s = play('interrupts', [['inject'], ['dispatch']]);
  assert.equal(s.pending, true);
  assert.equal(s.inService, false);
  assert.equal(s.data, 65);
  s = advance('interrupts', s, 'ack');
  assert.equal(s.pending, true);
  for (const action of ['toggle', 'dispatch', 'ack', 'inject', 'dispatch', 'ack'])
    s = advance('interrupts', s, action);
  assert.deepEqual(plain(s.received), [65, 66]);
  assert.equal(s.pending, false);
  assert.equal(s.inService, false);
  allGoals('interrupts', s);
});

test('An overrun loses the arriving byte, not the byte already pending', () => {
  let s = play('interrupts', [['inject'], ['inject']]);
  assert.equal(s.overruns, 1);
  assert.equal(s.data, 65);
  for (const action of ['toggle', 'dispatch', 'ack', 'inject', 'dispatch', 'ack'])
    s = advance('interrupts', s, action);
  assert.deepEqual(plain(s.received), [65, 67]);
});

test('Reset yields fresh isolated state for every workshop', () => {
  for (const w of workshops) {
    const initial = models[w.id].initial(w),
      other = models[w.id].initial(w);
    initial.flags.probe = true;
    assert.equal(other.flags.probe, undefined);
    const clean = models[w.id].act(initial, 'reset', undefined, w);
    assert.deepEqual(plain(clean), plain(other));
  }
});
process.stdout.write(`\n${passed} low-level model checks passed.\n`);
