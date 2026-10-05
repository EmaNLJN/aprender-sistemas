'use strict';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { plainJson as plain } from './lib/plain-json.ts';
import { loadSystemsDomain } from './lib/legacy-sources.ts';
import {
  achievedBelongToWorkshop,
  assertUnchanged,
  deepFreeze,
  hasSupportedTones,
  hasViewCollections,
} from './lib/systems-model-contract.ts';
import type { ModelWorkshop, SystemsModel } from './lib/systems-model-contract.ts';

interface BaseState {
  flags: Record<string, boolean | undefined>;
}
interface CacheState extends BaseState {
  entries: string[];
  hits: number;
  misses: number;
  evictions: number;
}
interface HeapBlock {
  start: number;
  size: number;
  owner: string | null;
}
interface HeapState extends BaseState {
  blocks: HeapBlock[];
  failures: number;
}
interface MmuState extends BaseState {
  last: string;
  faults: number;
}
interface TlbState extends BaseState {
  last: string;
  tableFrame: number;
  cachedFrame: number | null;
  hits: number;
  misses: number;
}
interface VmState extends BaseState {
  pc: number;
  accumulator: number;
  executed: number;
  stopped: boolean;
  error: string;
}
interface StackState extends BaseState {
  frames: { name: string; local: number }[];
  pc: number;
}
interface SchedulerState extends BaseState {
  time: number;
  jobs: Record<string, number>;
  ready: string[];
  blocked: string[];
  done: string[];
  running: string;
}
interface InterruptsState extends BaseState {
  pending: boolean;
  inService: boolean;
  data: number;
  received: number[];
  overruns: number;
}
interface States {
  cache: CacheState;
  heap: HeapState;
  mmu: MmuState;
  tlb: TlbState;
  vm: VmState;
  stack: StackState;
  scheduler: SchedulerState;
  interrupts: InterruptsState;
}
type ModelId = keyof States;
type Models = { [Id in ModelId]: SystemsModel<States[Id]> };
type Action = [action: string, value?: string];
interface LowLevelLab {
  id: string;
  stage: number;
  level: string;
  tests: unknown[];
  hints: unknown[];
  starter: string;
  solution: string;
}
interface LowLevelWorkshop extends ModelWorkshop {
  id: ModelId;
  model: ModelId;
  level: string;
  steps: unknown[];
  prediction: { options: unknown[] };
  code: Record<'rust' | 'go', string>;
}
interface LowLevelWindow {
  SYSTEMS_LOWLEVEL?: { workshops: LowLevelWorkshop[]; models: Models };
  SYSTEMS_LOWLEVEL_LABS?: LowLevelLab[];
}

const context: { window: LowLevelWindow } = { window: {} };
vm.createContext(context);
loadSystemsDomain(context, 'lowlevel');
const lowLevel = context.window.SYSTEMS_LOWLEVEL;
if (!lowLevel) throw new Error('SYSTEMS_LOWLEVEL was not published by its adapter');
const { workshops, models } = lowLevel;
let passed = 0;
function test(name: string, fn: () => void): void {
  fn();
  passed++;
  process.stdout.write(`PASS ${name}\n`);
}
function workshopOf(id: ModelId): LowLevelWorkshop {
  const workshop = workshops.find((w) => w.id === id);
  if (!workshop) throw new Error(`Missing workshop ${id}`);
  return workshop;
}
function advance<Id extends ModelId>(
  id: Id,
  state: States[Id],
  action: string,
  value?: string,
): States[Id] {
  const model: SystemsModel<States[Id]> = models[id],
    workshop = workshopOf(id),
    before = JSON.stringify(state);
  deepFreeze(state);
  const next = model.act(state, action, value, workshop);
  assertUnchanged(state, before, `${id}: act mutated its input`);
  assert.doesNotThrow(() => JSON.stringify(next));
  const viewBefore = JSON.stringify(next),
    rendered = model.view(next, workshop);
  assertUnchanged(next, viewBefore, `${id}: view mutated state`);
  assert(hasViewCollections(rendered));
  assert(rendered.log.length <= 12);
  assert(hasSupportedTones(rendered.cells));
  assert(achievedBelongToWorkshop(model.achieved(next, workshop), workshop), 'Unknown objective');
  return next;
}
function play<Id extends ModelId>(id: Id, actions: Action[]): States[Id] {
  const model: SystemsModel<States[Id]> = models[id];
  let state = model.initial(workshopOf(id));
  for (const action of actions) state = advance(id, state, action[0], action[1]);
  return state;
}
function allGoals<Id extends ModelId>(id: Id, state: States[Id]): void {
  const model: SystemsModel<States[Id]> = models[id];
  assert.deepEqual(
    plain(model.achieved(state)).sort(),
    plain(workshopOf(id).objectives.map((o) => o.id)).sort(),
  );
}

function assertResetYieldsFreshState<Id extends ModelId>(w: LowLevelWorkshop & { id: Id }): void {
  const model: SystemsModel<States[Id]> = models[w.id];
  const initial = model.initial(w),
    other = model.initial(w);
  initial.flags.probe = true;
  assert.equal(other.flags.probe, undefined);
  const clean = model.act(initial, 'reset', undefined, w);
  assert.deepEqual(plain(clean), plain(other));
}

test('Eight models, sixteen executable cores and unambiguous links', () => {
  assert.equal(workshops.length, 8);
  const labs = context.window.SYSTEMS_LOWLEVEL_LABS;
  assert(labs, 'SYSTEMS_LOWLEVEL_LABS must be published by its adapter');
  assert.equal(labs.length, 16);
  assert.equal(new Set(labs.map((x) => x.id)).size, 16);
  for (const [index, w] of workshops.entries()) {
    assert.equal(w.objectives.length, 3);
    assert.equal(w.steps.length, 4);
    assert.equal(w.prediction.options.length, 3);
    assert(models[w.model]);
    for (const language of ['rust', 'go'] as const) {
      assert.equal(w.code[language], `${language}-${113 + index}`);
      const lab: LowLevelLab | undefined = labs.find((x) => x.id === w.code[language]);
      assert(lab, `${w.id}: missing ${language} lab`);
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
  assert.equal(s.frames.at(-1)?.name, 'f');
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
  for (const w of workshops) assertResetYieldsFreshState(w);
});
process.stdout.write(`\n${passed} low-level model checks passed.\n`);
