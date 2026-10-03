// Pure-model invariants and observable learning outcomes; no compiler or network.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadLabExercises, loadSystemsDomain } from './lib/legacy-sources.ts';
import {
  achievedBelongToWorkshop,
  hasSupportedTones,
  hasTextFields,
  hasViewCollections,
  isControlContract,
  isFiniteJsonValue,
  rowsMatchColumns,
} from './lib/systems-model-contract.ts';
import type { ModelView, ModelWorkshop, SystemsModel } from './lib/systems-model-contract.ts';

type Language = 'rust' | 'go';
interface WalState {
  visible: number | null;
  durable: number;
  records: unknown[];
}
interface LsmEntry {
  key: string;
  deleted?: boolean;
}
interface LsmState {
  runs: LsmEntry[][];
}
interface QuorumState {
  nodes: { version: number }[];
  lastRead: number;
  version: number;
}
interface ClocksState {
  clocks: Record<'A' | 'B' | 'C', number>;
}
interface NetworkState {
  received: Record<number, string>;
  conflicts: number;
}
interface BackpressureState {
  queue: number[];
  pending: number | null;
  next: number;
  completed: number[];
  capacity: number;
}
interface BalancingState {
  last: string;
  nodes: { inflight: number; open: boolean }[];
}
interface ShardingState {
  [key: string]: unknown;
}
interface States {
  wal: WalState;
  lsm: LsmState;
  quorum: QuorumState;
  clocks: ClocksState;
  network: NetworkState;
  backpressure: BackpressureState;
  balancing: BalancingState;
  sharding: ShardingState;
}
type ModelId = keyof States;
interface InfraView extends ModelView {
  metrics: { label: string; value: string }[];
}
interface InfraWorkshop extends ModelWorkshop {
  id: ModelId;
  model: ModelId;
  category: string;
  level: string;
  steps: { title: string; task: string; why: string; done: string }[];
  uses: unknown[];
  limits: string;
  story: string;
  why: string;
  what: string;
  sources: { url: string }[];
  code: Record<Language, string>;
  related: Record<Language, string[]>;
}
type Models = { [Id in ModelId]: SystemsModel<States[Id], InfraView, InfraWorkshop> };
interface InfraLab {
  id: string;
  stage: number;
  level: string;
  visual: string;
  tests: {
    id: string;
    label: string;
    why: string;
    failure: string;
    expression: string;
  }[];
  hints: unknown[];
  prediction: { options: unknown[]; answer: number };
  review: { success: string; pitfall: string };
  transfer: string;
}
interface IdItem {
  id: string;
}
interface InfraWindow {
  SYSTEMS_INFRA?: { workshops: InfraWorkshop[]; models: Models };
  SYSTEMS_INFRA_LABS?: InfraLab[];
  RUST_LAB?: IdItem[];
  GO_LAB?: IdItem[];
  RUST_QUESTS?: IdItem[];
  GO_QUESTS?: IdItem[];
}

const context: { window: InfraWindow } = { window: {} };
vm.createContext(context);
loadSystemsDomain(context, 'infra');
loadLabExercises(context);
const infra = context.window.SYSTEMS_INFRA;
const labs = context.window.SYSTEMS_INFRA_LABS;
if (!infra || !labs) throw new Error('SYSTEMS_INFRA was not published by systems-infra.js');
const { workshops, models } = infra;
const expected: ModelId[] = [
  'wal',
  'lsm',
  'quorum',
  'clocks',
  'network',
  'backpressure',
  'balancing',
  'sharding',
];
// A missing catalog global must fail loudly, not shrink the set of known IDs.
function published<T>(list: T[] | undefined, name: string): T[] {
  if (!Array.isArray(list)) throw new Error(`${name} was not published by its source`);
  return list;
}
const allKnown = new Set(
  [
    ...published(context.window.RUST_LAB, 'RUST_LAB'),
    ...published(context.window.GO_LAB, 'GO_LAB'),
    ...published(context.window.RUST_QUESTS, 'RUST_QUESTS'),
    ...published(context.window.GO_QUESTS, 'GO_QUESTS'),
    ...labs,
  ].map((item) => item.id),
);
let assertions = 0;
function check(condition: unknown, label: string): void {
  assert.ok(condition, label);
  assertions++;
}
function equal(actual: unknown, wanted: unknown, label: string): void {
  assert.equal(JSON.stringify(actual), JSON.stringify(wanted), label);
  assertions++;
}
const json = (value: unknown): string => JSON.stringify(value);
const workshopFor = (id: ModelId): InfraWorkshop => {
  const workshop = workshops.find((item) => item.id === id);
  if (!workshop) throw new Error(`Missing workshop ${id}`);
  return workshop;
};
function validateView(id: ModelId, state: States[ModelId]): void {
  const model = models[id] as SystemsModel<States[ModelId], InfraView, InfraWorkshop>,
    workshop = workshopFor(id),
    before = json(state);
  const view = model.view(state, workshop),
    achieved = model.achieved(state, workshop);
  check(hasTextFields(view), id + ': textual model view');
  check(hasViewCollections(view), id + ': collection view contract');
  check(
    hasSupportedTones(view.cells) &&
      view.cells.every((cell) => typeof cell.label === 'string' && typeof cell.value === 'string'),
    id + ': supported cell tones',
  );
  check(view.controls.every(isControlContract), id + ': control action/value contract');
  check(achievedBelongToWorkshop(achieved, workshop), id + ': achieved IDs belong to the workshop');
  if (view.rows) check(rowsMatchColumns(view), id + ': table shape');
  equal(state, JSON.parse(before), id + ': reading the view does not mutate state');
}
function simulation<Id extends ModelId>(id: Id) {
  const model: SystemsModel<States[Id], InfraView, InfraWorkshop> = models[id],
    workshop = workshopFor(id);
  let state = model.initial(workshop);
  return {
    get state(): States[Id] {
      return state;
    },
    step(action: string, value?: string): States[Id] {
      const old = state,
        before = json(old);
      state = model.act(old, action, value, workshop);
      check(
        state !== old && json(old) === before,
        id + ': transition returns a new state without mutating input',
      );
      check(
        json(state) === json(model.act(JSON.parse(before) as States[Id], action, value, workshop)),
        id + ': deterministic replay',
      );
      return state;
    },
    goals(): string[] {
      return [...model.achieved(state, workshop)].sort();
    },
    complete(): void {
      equal(
        this.goals(),
        workshop.objectives.map((goal) => goal.id).sort(),
        id + ': all three meaningful outcomes reachable',
      );
      validateView(id, state);
    },
  };
}

equal(
  workshops.map((workshop) => workshop.id),
  expected,
  'Eight distinct workshops in the agreed order',
);
check(
  labs.length === 16 && new Set(labs.map((item) => item.id)).size === 16,
  'Sixteen unique paired labs',
);
for (const [index, workshop] of workshops.entries()) {
  check(
    workshop.category === 'infra' && workshop.model === workshop.id && !!models[workshop.model],
    workshop.id + ': registered model',
  );
  check(
    workshop.objectives.length === 3 &&
      new Set(workshop.objectives.map((goal) => goal.id)).size === 3,
    workshop.id + ': three unique objectives',
  );
  check(
    workshop.steps.length === 4 &&
      workshop.steps.every(
        (step) => step.title && step.task && step.why && typeof step.done === 'string',
      ),
    workshop.id + ': four concrete construction steps',
  );
  check(
    workshop.uses.length === 3 &&
      workshop.limits &&
      workshop.story &&
      workshop.why &&
      workshop.what,
    workshop.id + ': educational scope',
  );
  check(
    workshop.sources.length > 0 &&
      workshop.sources.every((source) => /^https:\/\//.test(source.url)),
    workshop.id + ': primary source links',
  );
  for (const language of ['rust', 'go'] as const) {
    const exercise: InfraLab | undefined = labs.find((item) => item.id === workshop.code[language]);
    assert.ok(exercise, workshop.id + ': lab mapping ' + language);
    check(
      exercise && exercise.id === language + '-' + (121 + index) && exercise.stage === 33 + index,
      workshop.id + ': lab mapping ' + language,
    );
    check(
      exercise.level === workshop.level &&
        exercise.visual === 'flow' &&
        exercise.tests.length === 3 &&
        exercise.hints.length === 3,
      exercise.id + ': exercise contract',
    );
    check(
      exercise.tests.every(
        (test) =>
          test.id &&
          test.label &&
          test.why &&
          test.failure &&
          typeof test.expression === 'string' &&
          !/[\r\n\t]/.test(test.expression),
      ),
      exercise.id + ': executable test expressions and feedback',
    );
    check(
      exercise.prediction.options.length === 3 &&
        exercise.prediction.answer >= 0 &&
        exercise.prediction.answer <= 2 &&
        exercise.review.success &&
        exercise.review.pitfall &&
        exercise.transfer,
      exercise.id + ': prediction and reviewer',
    );
    check(
      workshop.related[language].length <= 3 &&
        workshop.related[language].every((id) => allKnown.has(id)),
      workshop.id + ': existing related IDs',
    );
  }
  const model = models[workshop.model] as SystemsModel<States[ModelId], InfraView, InfraWorkshop>;
  const initial = model.initial(workshop);
  check(model.achieved(initial, workshop).length === 0, workshop.id + ': no free goals at startup');
  validateView(workshop.id, initial);
}

// WAL: loss before the durability barrier; complete replay after it.
let wal = simulation('wal');
wal.step('put', '10');
wal.step('commit');
check(wal.state.visible === 10 && wal.state.durable === 0, 'WAL visible commit is not yet durable');
wal.step('crash');
wal.step('recover');
check(
  wal.state.visible === null && wal.state.records.length === 0,
  'WAL crash loses the unsynchronized commit',
);
wal.step('put', '20');
wal.step('commit');
wal.step('sync');
wal.step('crash');
wal.step('recover');
check(
  wal.state.visible === 20 && wal.state.durable === 2,
  'WAL synchronized commit survives recovery',
);
wal.complete();
wal = simulation('wal');
wal.step('put', '10');
wal.step('sync');
wal.step('crash');
wal.step('recover');
check(
  wal.state.visible === null && wal.goals().length === 0,
  'WAL durable PUT without COMMIT remains unpublished',
);

// LSM: reproduce the concrete resurrection, then retain and safely reclaim.
const lsm = simulation('lsm');
lsm.step('delete');
lsm.step('flush');
check(
  models.lsm.view(lsm.state).metrics[0].value === '∅',
  'LSM tombstone hides an older external version',
);
lsm.step('unsafe');
check(
  models.lsm.view(lsm.state).metrics[0].value === 'cobre',
  'Unsafe partial compaction resurrects the old value',
);
lsm.step('delete');
lsm.step('flush');
lsm.step('partial');
check(
  lsm.state.runs[0].some((entry) => entry.deleted) &&
    models.lsm.view(lsm.state).metrics[0].value === '∅',
  'Safe partial compaction retains the deletion marker',
);
lsm.step('full');
check(
  lsm.state.runs.length === 1 &&
    lsm.state.runs[0].every((entry) => !entry.deleted) &&
    lsm.state.runs[0].some((entry) => entry.key === 'water') &&
    !lsm.state.runs[0].some((entry) => entry.key === 'ore'),
  'Full compaction reclaims tombstone and stale value while preserving unrelated keys',
);
lsm.complete();

// Replication: partitioned write, stale single-copy read, unavailable minority, repair.
const quorum = simulation('quorum');
quorum.step('isolate-c');
quorum.step('write');
equal(
  quorum.state.nodes.map((node) => node.version),
  [1, 1, 0],
  'Only reachable replicas install the modeled write',
);
quorum.step('heal');
equal(
  quorum.state.nodes.map((node) => node.version),
  [1, 1, 0],
  'Healing connectivity does not repair data',
);
quorum.step('read-one');
check(quorum.state.lastRead === 0, 'Single-copy read can be stale');
quorum.step('read-quorum');
check(
  quorum.state.lastRead === 1,
  'Intersecting read sees the version under the stated single-writer assumptions',
);
quorum.step('minority');
quorum.step('write');
check(
  quorum.state.version === 1,
  'Failed quorum does not create a committed version in this model',
);
quorum.step('heal');
quorum.step('repair');
equal(
  quorum.state.nodes.map((node) => node.version),
  [1, 1, 1],
  'Explicit repair converges replicas',
);
quorum.complete();

// Lamport: independent equal stamps, receive max+1, causal chain.
let clocks = simulation('clocks');
clocks.step('local-a');
clocks.step('local-b');
equal(clocks.state.clocks, { A: 1, B: 1, C: 0 }, 'Independent events may share a Lamport stamp');
clocks.step('send-ab');
clocks.step('deliver');
check(clocks.state.clocks.B === 3, 'Receiving increments beyond local and remote stamps');
clocks.step('send-bc');
clocks.step('deliver');
check(clocks.state.clocks.C === 5, 'A to B to C causal chain increases stamps');
clocks.complete();
clocks = simulation('clocks');
for (let i = 0; i < 5; i++) clocks.step('local-b');
clocks.step('send-ab');
clocks.step('deliver');
check(clocks.state.clocks.B === 6, 'A smaller received stamp cannot move the local clock backward');

// Reassembly: out-of-order, idempotent duplicate, loss/retry and conflicting duplicate.
const network = simulation('network');
network.step('deliver', '2');
network.step('deliver', '0');
network.step('deliver', '0');
check(
  Object.keys(network.state.received).length === 2,
  'Duplicate does not create a third fragment',
);
network.step('drop-one');
network.step('deliver', '1');
check(
  !Object.hasOwn(network.state.received, '1'),
  'Lost transmission is not delivered without retry',
);
network.step('retry-one');
equal(
  [0, 1, 2].map((index) => network.state.received[index]).join(''),
  'GOPHER',
  'Retry fills the missing fragment in logical order',
);
network.step('conflict');
check(
  network.state.received[0] === 'GO' && network.state.conflicts === 1,
  'Conflicting duplicate does not overwrite accepted bytes',
);
network.complete();

// Backpressure: a blocked producer retains its identity; consuming frees a slot.
const backpressure = simulation('backpressure');
backpressure.step('produce');
backpressure.step('produce');
backpressure.step('produce');
equal(backpressure.state.queue, [1, 2], 'Full bounded queue remains at capacity');
check(backpressure.state.pending === 3, 'Rejected task stays with producer');
backpressure.step('produce');
check(
  backpressure.state.pending === 3 && backpressure.state.next === 4,
  'Repeated blocked attempts do not manufacture new tasks',
);
backpressure.step('worker');
backpressure.step('produce');
equal(backpressure.state.queue, [2, 3], 'Producer retries the same task into the released slot');
for (let i = 0; i < 5; i++) backpressure.step('worker');
equal(backpressure.state.completed, [1, 2], 'Single worker completes accepted tasks FIFO');
check(
  backpressure.state.queue.length <= 2 && backpressure.state.pending === null,
  'Queue and upstream state have distinct bounded roles',
);
backpressure.complete();

// Eligibility, circuit trip, and actual work after a successful manual probe.
const balancing = simulation('balancing');
balancing.step('health-a');
balancing.step('route');
check(
  balancing.state.last === 'B' && balancing.state.nodes[0].inflight === 0,
  'Unhealthy A is excluded despite lower load',
);
balancing.step('route');
balancing.step('route');
check(balancing.state.nodes[1].inflight === 2, 'Backend admission respects the two-request budget');
balancing.step('fail-b');
balancing.step('fail-b');
check(
  balancing.state.nodes[1].open && balancing.state.nodes[1].inflight === 0,
  'Two actual failed requests trip B and release their capacity',
);
balancing.step('route');
check(balancing.state.last === 'C', 'Open B is excluded from routing');
balancing.step('probe-b');
balancing.step('route');
check(
  balancing.state.last === 'B' && balancing.state.nodes[1].inflight === 1,
  'Recovered B receives work after the probe',
);
balancing.complete();

// Consistent hash placement changes only the inserted token's predecessor interval.
const sharding = simulation('sharding');
sharding.step('inspect-wrap');
sharding.step('add');
const rows = models.sharding.view(sharding.state).rows;
equal(
  rows?.filter((row) => row[1] !== row[2]),
  [['15', 'B', 'D']],
  'Adding token 25 only moves sampled hash 15 in (10,25]',
);
sharding.step('compare');
sharding.complete();
sharding.step('remove');
check(
  models.sharding.view(sharding.state).rows?.every((row) => row[1] === row[2]),
  'Removing the added token restores baseline assignments',
);

// Deterministic adversarial control sequences: valid state and public API invariants.
function assertAdversarialInvariants(id: ModelId, state: States[ModelId]): void {
  if (id === 'backpressure') {
    const { queue, capacity } = state as BackpressureState;
    check(
      queue.length <= capacity && new Set(queue).size === queue.length,
      'Adversarial queue remains bounded without duplicate task identity',
    );
  }
  if (id === 'balancing')
    check(
      (state as BalancingState).nodes.every((node) => node.inflight >= 0 && node.inflight <= 2),
      'Adversarial backend accounting stays within bounds',
    );
  if (id === 'wal')
    check(
      (state as WalState).durable <= (state as WalState).records.length,
      'Durable prefix never exceeds the surviving log',
    );
}
function runAdversarialSequence<Id extends ModelId>(id: Id): void {
  const model: SystemsModel<States[Id], InfraView, InfraWorkshop> = models[id];
  const run = simulation(id);
  for (let index = 0; index < 36; index++) {
    const controls = model.view(run.state).controls;
    const position = index % controls.length;
    const control =
      controls[
        Math.floor(index / controls.length) % 2 === 0 ? position : controls.length - 1 - position
      ];
    run.step(control.action, control.value);
    check(isFiniteJsonValue(run.state), id + ': state contains only finite JSON values');
    assertAdversarialInvariants(id, run.state);
  }
  validateView(id, run.state);
}
for (const id of expected) runAdversarialSequence(id);

console.log(
  JSON.stringify({
    status: 'PASS',
    assertions,
    workshops: workshops.length,
    labs: labs.length,
    referenceAssertions: labs.length * 3,
    scope:
      'Pure models, reachable semantic goals, state invariants, view/schema contracts; Rust/Go compilation is checked separately.',
  }),
);
