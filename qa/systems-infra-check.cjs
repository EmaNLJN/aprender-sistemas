'use strict';
// Pure-model invariants and observable learning outcomes; no compiler or network.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = {window: {}};
vm.createContext(context);
for (const file of ['systems-infra.js', 'systems-infra-labs.js', 'lab-rust.js', 'lab-go.js', 'quests-rust.js', 'quests-go.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}
const {workshops, models} = context.window.SYSTEMS_INFRA;
const labs = context.window.SYSTEMS_INFRA_LABS;
const expected = ['wal', 'lsm', 'quorum', 'clocks', 'network', 'backpressure', 'balancing', 'sharding'];
const allKnown = new Set([
  ...context.window.RUST_LAB, ...context.window.GO_LAB,
  ...context.window.RUST_QUESTS, ...context.window.GO_QUESTS, ...labs
].map(item => item.id));
let assertions = 0;
function check(condition, label) { assert.ok(condition, label); assertions++; }
function equal(actual, wanted, label) { assert.equal(JSON.stringify(actual), JSON.stringify(wanted), label); assertions++; }
const json = value => JSON.stringify(value);
function isJSONValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJSONValue);
  if (Object.prototype.toString.call(value) === '[object Object]') return Object.values(value).every(isJSONValue);
  return false;
}
const workshopFor = id => workshops.find(workshop => workshop.id === id);
function validateView(id, state) {
  const model = models[id], workshop = workshopFor(id), before = json(state);
  const view = model.view(state, workshop), achieved = model.achieved(state, workshop);
  check(typeof view.title === 'string' && typeof view.summary === 'string' && typeof view.explanation === 'string', id + ': textual model view');
  check(Array.isArray(view.metrics) && Array.isArray(view.cells) && Array.isArray(view.controls) && Array.isArray(view.log), id + ': collection view contract');
  check(view.cells.every(cell => ['active', 'good', 'bad', 'muted'].includes(cell.tone) && typeof cell.label === 'string' && typeof cell.value === 'string'), id + ': supported cell tones');
  check(view.controls.every(control => typeof control.action === 'string' && typeof control.label === 'string' && (control.value === undefined || typeof control.value === 'string')), id + ': control action/value contract');
  check(achieved.every(goal => workshop.objectives.some(objective => objective.id === goal)), id + ': achieved IDs belong to the workshop');
  if (view.rows) check(view.rows.every(row => row.length === view.columns.length && row.every(value => typeof value === 'string')), id + ': table shape');
  equal(state, JSON.parse(before), id + ': reading the view does not mutate state');
}
function simulation(id) {
  const model = models[id], workshop = workshopFor(id);
  let state = model.initial(workshop);
  return {
    get state() { return state; },
    step(action, value) {
      const old = state, before = json(old);
      state = model.act(old, action, value, workshop);
      check(state !== old && json(old) === before, id + ': transition returns a new state without mutating input');
      check(json(state) === json(model.act(JSON.parse(before), action, value, workshop)), id + ': deterministic replay');
      return state;
    },
    goals() { return [...model.achieved(state, workshop)].sort(); },
    complete() { equal(this.goals(), workshop.objectives.map(goal => goal.id).sort(), id + ': all three meaningful outcomes reachable'); validateView(id, state); }
  };
}

equal(workshops.map(workshop => workshop.id), expected, 'Eight distinct workshops in the agreed order');
check(labs.length === 16 && new Set(labs.map(item => item.id)).size === 16, 'Sixteen unique paired labs');
for (const [index, workshop] of workshops.entries()) {
  check(workshop.category === 'infra' && workshop.model === workshop.id && !!models[workshop.model], workshop.id + ': registered model');
  check(workshop.objectives.length === 3 && new Set(workshop.objectives.map(goal => goal.id)).size === 3, workshop.id + ': three unique objectives');
  check(workshop.steps.length === 4 && workshop.steps.every(step => step.title && step.task && step.why && typeof step.done === 'string'), workshop.id + ': four concrete construction steps');
  check(workshop.uses.length === 3 && workshop.limits && workshop.story && workshop.why && workshop.what, workshop.id + ': educational scope');
  check(workshop.sources.length > 0 && workshop.sources.every(source => /^https:\/\//.test(source.url)), workshop.id + ': primary source links');
  for (const language of ['rust', 'go']) {
    const exercise = labs.find(item => item.id === workshop.code[language]);
    check(exercise && exercise.id === language + '-' + (121 + index) && exercise.stage === 33 + index, workshop.id + ': lab mapping ' + language);
    check(exercise.level === workshop.level && exercise.visual === 'flow' && exercise.tests.length === 3 && exercise.hints.length === 3, exercise.id + ': exercise contract');
    check(exercise.tests.every(test => test.id && test.label && test.why && test.failure && typeof test.expression === 'string' && !/[\r\n\t]/.test(test.expression)), exercise.id + ': executable test expressions and feedback');
    check(exercise.prediction.options.length === 3 && exercise.prediction.answer >= 0 && exercise.prediction.answer <= 2 && exercise.review.success && exercise.review.pitfall && exercise.transfer, exercise.id + ': prediction and reviewer');
    check(workshop.related[language].length <= 3 && workshop.related[language].every(id => allKnown.has(id)), workshop.id + ': existing related IDs');
  }
  const initial = models[workshop.model].initial(workshop);
  check(models[workshop.model].achieved(initial, workshop).length === 0, workshop.id + ': no free goals at startup');
  validateView(workshop.id, initial);
}

// WAL: loss before the durability barrier; complete replay after it.
let run = simulation('wal');
run.step('put', '10'); run.step('commit');
check(run.state.visible === 10 && run.state.durable === 0, 'WAL visible commit is not yet durable');
run.step('crash'); run.step('recover');
check(run.state.visible === null && run.state.records.length === 0, 'WAL crash loses the unsynchronized commit');
run.step('put', '20'); run.step('commit'); run.step('sync'); run.step('crash'); run.step('recover');
check(run.state.visible === 20 && run.state.durable === 2, 'WAL synchronized commit survives recovery');
run.complete();
run = simulation('wal'); run.step('put', '10'); run.step('sync'); run.step('crash'); run.step('recover');
check(run.state.visible === null && run.goals().length === 0, 'WAL durable PUT without COMMIT remains unpublished');

// LSM: reproduce the concrete resurrection, then retain and safely reclaim.
run = simulation('lsm'); run.step('delete'); run.step('flush');
check(models.lsm.view(run.state).metrics[0].value === '∅', 'LSM tombstone hides an older external version');
run.step('unsafe');
check(models.lsm.view(run.state).metrics[0].value === 'cobre', 'Unsafe partial compaction resurrects the old value');
run.step('delete'); run.step('flush'); run.step('partial');
check(run.state.runs[0].some(entry => entry.deleted) && models.lsm.view(run.state).metrics[0].value === '∅', 'Safe partial compaction retains the deletion marker');
run.step('full');
check(run.state.runs.length === 1 && run.state.runs[0].every(entry => !entry.deleted) && run.state.runs[0].some(entry => entry.key === 'water') && !run.state.runs[0].some(entry => entry.key === 'ore'), 'Full compaction reclaims tombstone and stale value while preserving unrelated keys');
run.complete();

// Replication: partitioned write, stale single-copy read, unavailable minority, repair.
run = simulation('quorum'); run.step('isolate-c'); run.step('write');
equal(run.state.nodes.map(node => node.version), [1, 1, 0], 'Only reachable replicas install the modeled write');
run.step('heal');
equal(run.state.nodes.map(node => node.version), [1, 1, 0], 'Healing connectivity does not repair data');
run.step('read-one'); check(run.state.lastRead === 0, 'Single-copy read can be stale');
run.step('read-quorum'); check(run.state.lastRead === 1, 'Intersecting read sees the version under the stated single-writer assumptions');
run.step('minority'); run.step('write'); check(run.state.version === 1, 'Failed quorum does not create a committed version in this model');
run.step('heal'); run.step('repair'); equal(run.state.nodes.map(node => node.version), [1, 1, 1], 'Explicit repair converges replicas'); run.complete();

// Lamport: independent equal stamps, receive max+1, causal chain.
run = simulation('clocks'); run.step('local-a'); run.step('local-b');
equal(run.state.clocks, {A: 1, B: 1, C: 0}, 'Independent events may share a Lamport stamp');
run.step('send-ab'); run.step('deliver'); check(run.state.clocks.B === 3, 'Receiving increments beyond local and remote stamps');
run.step('send-bc'); run.step('deliver'); check(run.state.clocks.C === 5, 'A to B to C causal chain increases stamps'); run.complete();
run = simulation('clocks'); for (let i = 0; i < 5; i++) run.step('local-b'); run.step('send-ab'); run.step('deliver');
check(run.state.clocks.B === 6, 'A smaller received stamp cannot move the local clock backward');

// Reassembly: out-of-order, idempotent duplicate, loss/retry and conflicting duplicate.
run = simulation('network'); run.step('deliver', '2'); run.step('deliver', '0'); run.step('deliver', '0');
check(Object.keys(run.state.received).length === 2, 'Duplicate does not create a third fragment');
run.step('drop-one'); run.step('deliver', '1'); check(!Object.hasOwn(run.state.received, '1'), 'Lost transmission is not delivered without retry');
run.step('retry-one'); equal([0, 1, 2].map(index => run.state.received[index]).join(''), 'GOPHER', 'Retry fills the missing fragment in logical order');
run.step('conflict'); check(run.state.received[0] === 'GO' && run.state.conflicts === 1, 'Conflicting duplicate does not overwrite accepted bytes'); run.complete();

// Backpressure: a blocked producer retains its identity; consuming frees a slot.
run = simulation('backpressure'); run.step('produce'); run.step('produce'); run.step('produce');
equal(run.state.queue, [1, 2], 'Full bounded queue remains at capacity');
check(run.state.pending === 3, 'Rejected task stays with producer');
run.step('produce'); check(run.state.pending === 3 && run.state.next === 4, 'Repeated blocked attempts do not manufacture new tasks');
run.step('worker'); run.step('produce'); equal(run.state.queue, [2, 3], 'Producer retries the same task into the released slot');
for (let i = 0; i < 5; i++) run.step('worker');
equal(run.state.completed, [1, 2], 'Single worker completes accepted tasks FIFO');
check(run.state.queue.length <= 2 && run.state.pending === null, 'Queue and upstream state have distinct bounded roles'); run.complete();

// Eligibility, circuit trip, and actual work after a successful manual probe.
run = simulation('balancing'); run.step('health-a'); run.step('route');
check(run.state.last === 'B' && run.state.nodes[0].inflight === 0, 'Unhealthy A is excluded despite lower load');
run.step('route'); run.step('route'); check(run.state.nodes[1].inflight === 2, 'Backend admission respects the two-request budget');
run.step('fail-b'); run.step('fail-b'); check(run.state.nodes[1].open && run.state.nodes[1].inflight === 0, 'Two actual failed requests trip B and release their capacity');
run.step('route'); check(run.state.last === 'C', 'Open B is excluded from routing');
run.step('probe-b'); run.step('route'); check(run.state.last === 'B' && run.state.nodes[1].inflight === 1, 'Recovered B receives work after the probe'); run.complete();

// Consistent hash placement changes only the inserted token's predecessor interval.
run = simulation('sharding'); run.step('inspect-wrap'); run.step('add');
const rows = models.sharding.view(run.state).rows;
equal(rows.filter(row => row[1] !== row[2]), [['15', 'B', 'D']], 'Adding token 25 only moves sampled hash 15 in (10,25]');
run.step('compare'); run.complete(); run.step('remove');
check(models.sharding.view(run.state).rows.every(row => row[1] === row[2]), 'Removing the added token restores baseline assignments');

// Deterministic adversarial control sequences: valid state and public API invariants.
for (const id of expected) {
  const run = simulation(id);
  for (let index = 0; index < 36; index++) {
    const controls = models[id].view(run.state).controls;
    const position = index % controls.length;
    const control = controls[Math.floor(index / controls.length) % 2 === 0 ? position : controls.length - 1 - position];
    run.step(control.action, control.value);
    check(isJSONValue(run.state), id + ': state contains only finite JSON values');
    if (id === 'backpressure') check(run.state.queue.length <= run.state.capacity && new Set(run.state.queue).size === run.state.queue.length, 'Adversarial queue remains bounded without duplicate task identity');
    if (id === 'balancing') check(run.state.nodes.every(node => node.inflight >= 0 && node.inflight <= 2), 'Adversarial backend accounting stays within bounds');
    if (id === 'wal') check(run.state.durable <= run.state.records.length, 'Durable prefix never exceeds the surviving log');
  }
  validateView(id, run.state);
}

console.log(JSON.stringify({status: 'PASS', assertions, workshops: workshops.length, labs: labs.length, referenceAssertions: labs.length * 3,
  scope: 'Pure models, reachable semantic goals, state invariants, view/schema contracts; Rust/Go compilation is checked separately.'}));
