import assert from 'node:assert/strict';
import vm from 'node:vm';
import { plainJson as plain } from './lib/plain-json.ts';
import { loadSystemsDomain } from './lib/legacy-sources.ts';
import {
  achievedBelongToWorkshop,
  assertUnchanged,
  deepFreeze,
  hasViewCollections,
  isControlContract,
} from './lib/systems-model-contract.ts';
import type { ModelView, ModelWorkshop, SystemsModel } from './lib/systems-model-contract.ts';

interface PageEntry {
  frame: number;
  write: boolean;
}
interface Instruction {
  op: string;
  va?: number;
}
interface Trap {
  cause: string;
  pc: number;
  acc: number;
  mapped?: boolean;
  acked?: boolean;
}
interface PcState {
  ram: number[];
  pc: number;
  acc: number;
  program: Instruction[];
  table: (PageEntry | null)[];
  tlb: (PageEntry | null)[];
  hits: number;
  misses: number;
  faults: number;
  interrupts: number;
  retired: number;
  log: string[];
  phase: string;
  mode: string;
  physical: number;
  halted: boolean;
  irqPending: boolean;
  instruction: Instruction;
  trap: Trap;
  observed: Record<string, boolean | undefined>;
}
interface PcView extends ModelView {
  rows: string[][];
  columns: string[];
  scene: { shapes: Record<string, unknown>[] };
}
interface PcWorkshop extends ModelWorkshop {
  category: string;
  level: string;
  steps: unknown[];
  prediction: { options: unknown[]; answer: number };
  sources: { url: string }[];
  code: Record<'rust' | 'go', string>;
}
interface PcLab {
  id: string;
  language: string;
  stage: number;
  level: string;
  tests: { id: string; label: string; expression: string; why: string; failure: string }[];
  hints: unknown[];
  prediction: { options: unknown[] };
  intro: string;
  why: string;
  objective: string;
  transfer: string;
  starter: string;
  solution: string;
  review: { success: string; pitfall: string };
}
interface PcWindow {
  SYSTEMS_PC?: {
    workshops: PcWorkshop[];
    models: { pc: SystemsModel<PcState, PcView, PcWorkshop> };
  };
  SYSTEMS_PC_LABS?: PcLab[];
}

const context: { window: PcWindow } = { window: {} };
vm.createContext(context);
loadSystemsDomain(context, 'pc');
const pcDomain = context.window.SYSTEMS_PC;
if (!pcDomain) throw new Error('SYSTEMS_PC was not published by its adapter');
const { workshops, models } = pcDomain,
  w = workshops[0],
  model = models.pc;
let checks = 0,
  states = 0;
function test(name: string, fn: () => void): void {
  fn();
  checks++;
  process.stdout.write(`PASS ${name}\n`);
}
function present(entry: PageEntry | null): PageEntry {
  assert(entry, 'Expected a present page entry');
  return entry;
}
function assertEntry(entry: PageEntry | null): void {
  if (entry)
    assert(
      Number.isInteger(entry.frame) &&
        entry.frame >= 0 &&
        entry.frame < 3 &&
        typeof entry.write === 'boolean',
    );
}
function assertMachineInvariants(next: PcState): void {
  assert.equal(next.ram.length, 12);
  assert(next.ram.every((n) => Number.isInteger(n) && n >= 0 && n <= 255));
  assert(next.pc >= 0 && next.pc < next.program.length);
  assert.equal(next.table.length, 3);
  assert.equal(next.tlb.length, 3);
  assert(next.hits >= 0 && next.misses >= 0 && next.faults >= 0 && next.interrupts >= 0);
  assert(next.log.length <= 12);
  for (const entry of [...next.table, ...next.tlb]) assertEntry(entry);
}
function assertViewContract(v: PcView): void {
  assert(hasViewCollections(v) && Array.isArray(v.rows));
  assert.equal(v.columns.length, 4);
  for (const row of v.rows) assert.equal(row.length, 4);
  for (const control of v.controls) assert(isControlContract(control));
  assert(v.scene && Array.isArray(v.scene.shapes));
  for (const shape of v.scene.shapes)
    for (const [key, value] of Object.entries(shape))
      if (typeof value === 'number') assert(Number.isFinite(value), key);
}
function act(s: PcState, action: string, value?: string): PcState {
  const before = JSON.stringify(s);
  deepFreeze(s);
  const next = model.act(s, action, value, w);
  assertUnchanged(s, before, 'Input mutated');
  states++;
  assert(next !== s, 'Transition should return its own state');
  const snapshot = JSON.stringify(next),
    v = model.view(next, w);
  assertUnchanged(next, snapshot, 'View mutated state');
  assertMachineInvariants(next);
  assertViewContract(v);
  assert(achievedBelongToWorkshop(model.achieved(next, w), w));
  return next;
}
function steps(s: PcState, n: number): PcState {
  for (let i = 0; i < n; i++) s = act(s, 'step');
  return s;
}
function instruction(s: PcState): PcState {
  const retired = s.retired;
  for (let i = 0; i < 12; i++) {
    s = act(s, 'step');
    if (s.retired !== retired || s.mode === 'kernel' || s.halted) return s;
  }
  assert.fail('An instruction did not complete or trap within 12 transitions');
}
function auto(s: PcState): PcState {
  for (let i = 0; i < 100 && !s.halted; i++) {
    if (s.phase === 'fault' && s.trap.cause === 'absent')
      s = act(s, s.trap.mapped ? 'return' : 'map');
    else if (s.phase === 'fault') s = act(s, 'abort');
    else if (s.phase === 'irq') s = act(s, s.trap.acked ? 'return' : 'ack');
    else s = act(s, 'step');
  }
  assert(s.halted, 'Program did not halt within a bounded number of transitions');
  return s;
}

test('One workshop, two correctly linked original cores and full teaching metadata', () => {
  assert.equal(workshops.length, 1);
  assert.equal(w.id, 'pc');
  assert.equal(w.model, 'pc');
  assert.equal(w.category, 'machine');
  assert.equal(w.objectives.length, 3);
  assert.equal(w.steps.length, 4);
  assert.equal(w.prediction.options.length, 3);
  assert(w.prediction.answer >= 0 && w.prediction.answer < 3);
  assert.equal(new Set(w.objectives.map((o) => o.id)).size, 3);
  for (const source of w.sources) assert.equal(new URL(source.url).protocol, 'https:');
  const labs = context.window.SYSTEMS_PC_LABS;
  assert(labs, 'SYSTEMS_PC_LABS must be published by its adapter');
  assert.equal(labs.length, 2);
  for (const language of ['rust', 'go'] as const) {
    const item: PcLab | undefined = labs.find((x) => x.language === language);
    assert(item, `Missing ${language} core`);
    assert.equal(item.id, `${language}-137`);
    assert.equal(w.code[language], item.id);
    assert.equal(item.stage, 49);
    assert.equal(item.level, w.level);
    assert.equal(item.tests.length, 3);
    assert.equal(item.hints.length, 3);
    assert.equal(item.prediction.options.length, 3);
    assert.equal(new Set(item.tests.map((t) => t.id)).size, 3);
    for (const t of item.tests)
      for (const key of ['label', 'expression', 'why', 'failure'] as const) assert(t[key].trim());
    for (const key of ['intro', 'why', 'objective', 'transfer', 'starter', 'solution'] as const)
      assert(item[key].trim());
    assert.notEqual(item.starter, item.solution);
    assert(item.review.success && item.review.pitfall);
  }
});

test('Initial machines own independent RAM, PTE and program structures', () => {
  const a = model.initial(),
    b = model.initial();
  a.ram[0] = 99;
  present(a.table[0]).write = true;
  a.program[0].va = 7;
  assert.equal(b.ram[0], 10);
  assert.equal(present(b.table[0]).write, false);
  assert.equal(b.program[0].va, 1);
  assert.deepEqual(plain(model.achieved(b, w)), []);
});

test('A TLB miss walks a present PTE without entering the kernel', () => {
  let s = model.initial();
  const ram = plain(s.ram);
  s = act(s, 'step');
  assert.equal(s.phase, 'tlb');
  assert.equal(s.pc, 0);
  s = act(s, 'step');
  assert.equal(s.phase, 'walk');
  assert.equal(s.misses, 1);
  assert.equal(s.faults, 0);
  s = act(s, 'step');
  assert.equal(s.phase, 'permission');
  assert.equal(s.mode, 'user');
  assert.equal(s.faults, 0);
  assert.deepEqual(plain(s.tlb[0]), { frame: 1, write: false });
  s = act(s, 'step');
  assert.equal(s.phase, 'memory');
  assert.equal(s.physical, 5);
  assert.equal(s.pc, 0);
  assert.equal(s.acc, 0);
  s = act(s, 'step');
  assert.equal(s.pc, 1);
  assert.equal(s.acc, 21);
  assert.equal(s.retired, 1);
  assert.deepEqual(plain(s.ram), ram);
});

test('A subsequent load uses the cached translation and still checks permissions', () => {
  let s = instruction(model.initial());
  s = steps(s, 2);
  assert.equal(s.phase, 'permission');
  assert.equal(s.hits, 1);
  assert.equal(s.misses, 1);
  assert.equal(s.faults, 0);
  s = steps(s, 2);
  assert.equal(s.pc, 2);
  assert.equal(s.acc, 22);
  assert.equal(s.retired, 2);
  assert.deepEqual(plain(model.achieved(s, w)), ['translate']);
});

test('Absent page traps at the faulting PC and cannot return unresolved', () => {
  let s = instruction(instruction(model.initial()));
  const ram = plain(s.ram);
  s = steps(s, 3);
  assert.equal(s.phase, 'fault');
  assert.equal(s.trap.cause, 'absent');
  assert.equal(s.trap.pc, 2);
  assert.equal(s.pc, 2);
  assert.equal(s.retired, 2);
  assert.equal(s.faults, 1);
  assert.equal(s.mode, 'kernel');
  assert.deepEqual(plain(s.ram), ram);
  s = act(s, 'return');
  assert.equal(s.phase, 'fault');
  assert.equal(s.pc, 2);
  assert.equal(s.table[2], null);
});

test('Map then retry preserves PC, initializes a frame and retires only once', () => {
  let s = steps(instruction(instruction(model.initial())), 3);
  s = act(s, 'map');
  assert.equal(s.pc, 2);
  assert.equal(s.retired, 2);
  assert.deepEqual(plain(s.table[2]), { frame: 2, write: true });
  assert.equal(s.tlb[2], null);
  assert.deepEqual(plain(s.ram.slice(8)), [0, 0, 0, 0]);
  s = act(s, 'return');
  assert.equal(s.pc, 2);
  assert.equal(s.phase, 'fetch');
  s = instruction(s);
  assert.equal(s.pc, 3);
  assert.equal(s.acc, 0);
  assert.equal(s.retired, 3);
  assert.equal(s.misses, 3);
  assert.equal(s.faults, 1);
  assert(s.observed.recovered);
  s = instruction(s);
  assert.equal(s.ram[10], 77);
  assert.equal(s.acc, 0);
  assert.equal(s.retired, 4);
  s = instruction(s);
  assert.equal(s.acc, 77);
  assert.equal(s.retired, 5);
});

test('Protection rejects a write before RAM and does not grant permissions', () => {
  let s = act(model.initial(), 'program', 'protection');
  const ram = plain(s.ram);
  s = steps(s, 4);
  assert.equal(s.phase, 'fault');
  assert.equal(s.trap.cause, 'protection');
  assert.equal(s.pc, 0);
  assert.equal(s.retired, 0);
  assert.deepEqual(plain(s.ram), ram);
  assert.equal(s.ram[5], 21);
  assert(s.observed.protection);
  s = act(s, 'map');
  s = act(s, 'return');
  assert.equal(s.phase, 'fault');
  assert.equal(present(s.table[0]).write, false);
  assert.deepEqual(plain(s.ram), ram);
  s = act(s, 'abort');
  assert(s.halted);
  s = act(s, 'step');
  assert.deepEqual(plain(s.ram), ram);
});

test('Timer injected mid-access waits for retirement and saves the next PC', () => {
  let s = steps(model.initial(), 4);
  assert.equal(s.phase, 'memory');
  s = act(s, 'pulse');
  assert.equal(s.pc, 0);
  assert.equal(s.mode, 'user');
  s = act(s, 'step');
  assert.equal(s.pc, 1);
  assert.equal(s.acc, 21);
  assert.equal(s.retired, 1);
  s = act(s, 'step');
  assert.equal(s.phase, 'irq');
  assert.equal(s.trap.pc, 1);
  assert.equal(s.trap.acc, 21);
  assert.equal(s.pc, 1);
  assert.equal(s.interrupts, 1);
  const ram = plain(s.ram);
  s = act(s, 'return');
  assert.equal(s.phase, 'irq');
  assert(!s.observed.interrupt);
  s = act(s, 'ack');
  assert(!s.irqPending);
  s = act(s, 'return');
  assert.equal(s.pc, 1);
  assert.equal(s.acc, 21);
  assert.equal(s.mode, 'user');
  assert.equal(s.retired, 1);
  assert.deepEqual(plain(s.ram), ram);
  s = instruction(s);
  assert.equal(s.pc, 2);
  assert.equal(s.acc, 22);
  assert.equal(s.retired, 2);
  assert(s.observed.interrupt);
});

test('A pending timer never overwrites a synchronous fault trap frame', () => {
  let s = steps(instruction(instruction(model.initial())), 3);
  const trap = plain(s.trap);
  s = act(s, 'pulse');
  s = act(s, 'step');
  assert.equal(s.phase, 'fault');
  assert.deepEqual(plain(s.trap), trap);
  assert.equal(s.interrupts, 0);
  s = act(s, 'map');
  s = act(s, 'return');
  assert.equal(s.pc, 2);
  s = act(s, 'step');
  assert.equal(s.phase, 'irq');
  assert.equal(s.trap.pc, 2);
  s = act(s, 'ack');
  s = act(s, 'return');
  s = instruction(s);
  assert.equal(s.pc, 3);
  assert.equal(s.retired, 3);
  assert(s.observed.recovered);
  assert(s.observed.interrupt);
});

test('IRQ during a STORE commits that STORE exactly once before handling', () => {
  let s = steps(instruction(instruction(model.initial())), 3);
  s = act(s, 'map');
  s = act(s, 'return');
  s = instruction(s);
  s = steps(s, 3);
  assert.equal(s.phase, 'memory');
  assert.equal(s.instruction.op, 'STORE');
  assert.equal(s.ram[10], 0);
  s = act(s, 'pulse');
  s = act(s, 'step');
  assert.equal(s.ram[10], 77);
  assert.equal(s.pc, 4);
  assert.equal(s.retired, 4);
  s = act(s, 'step');
  s = act(s, 'ack');
  s = act(s, 'return');
  assert.equal(s.pc, 4);
  assert.equal(s.retired, 4);
  s = instruction(s);
  assert.equal(s.acc, 77);
  assert.equal(s.retired, 5);
  assert.equal(s.ram[10], 77);
});

test('Repeated pulses coalesce; a new pulse after ACK can be served later', () => {
  let s = act(model.initial(), 'pulse');
  s = act(s, 'pulse');
  s = act(s, 'step');
  assert.equal(s.interrupts, 1);
  s = act(s, 'pulse');
  assert.equal(s.interrupts, 1);
  s = act(s, 'ack');
  s = act(s, 'pulse');
  s = act(s, 'return');
  assert(s.irqPending);
  assert.equal(s.pc, 0);
  s = act(s, 'step');
  assert.equal(s.interrupts, 2);
  assert.equal(s.phase, 'irq');
  s = act(s, 'ack');
  s = act(s, 'return');
  s = instruction(s);
  assert.equal(s.pc, 1);
  assert.equal(s.retired, 1);
});

test('All objectives are reachable across scenarios; reset clears observations', () => {
  let s = act(model.initial(), 'pulse');
  s = auto(s);
  assert.equal(s.acc, 77);
  assert.equal(s.retired, 6);
  assert.equal(s.pc, 5);
  assert.equal(s.ram[10], 77);
  assert.equal(s.faults, 1);
  assert.equal(s.interrupts, 1);
  assert.deepEqual(plain(model.achieved(s, w)), ['translate', 'interrupt']);
  s = act(s, 'program', 'protection');
  s = auto(s);
  assert.deepEqual(plain(model.achieved(s, w)), ['translate', 'protect-retry', 'interrupt']);
  s = act(s, 'reset');
  assert.deepEqual(plain(model.achieved(s, w)), []);
  assert.deepEqual(plain(s), plain(model.initial()));
});

test('Unknown actions and values do not change machine state', () => {
  let s = model.initial();
  for (const [action, value] of [
    ['unknown', 'x'],
    ['program', 'bad'],
    ['ack'],
    ['map'],
    ['return'],
    ['abort'],
  ]) {
    const before = plain(s);
    s = act(s, action, value);
    assert.deepEqual(plain(s), before);
  }
});

process.stdout.write(
  `\n${checks} checks passed; ${states} immutable transitions; all 3 objectives reached.\n`,
);
