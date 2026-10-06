# Referencia de la fusión: código verificado

**Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contrato**: [merge-rules.md](./contracts/merge-rules.md)

Este es el código de TypeScript de D1a, **ejecutado al planificar** sobre una copia de `master` en el scratchpad (sin tocar el repositorio, sin Docker, PHP ni descargas). Lo aplica el dueño F (tareas T005 y T006) con TDD y lo ajusta hasta que pasen las pruebas; el contrato obliga, no este código. Lo que se ejecutó, con su resultado, está en la sección 7. El PHP y el SQL de D1a **no** están acá: no hay PHP ni MySQL en el host (ver «Lo que quedó sin verificar» de [plan.md](./plan.md)).

## 1. `frontend/src/features/progress-sync/model/merge-rules.ts`

Las reglas puras de fusión. Cuatro formas de estado y una función por regla; `lww-group` y `tombstone` usan `mergeRegister` con un valor compuesto o booleano.

```ts
// Pure merge rules of the progress fields (ADR 0004 §3, ADR 0006 D22 and D09).
// `Clock` is an ISO 8601 UTC instant with milliseconds; `null` is a legacy clock.
export type Clock = string | null;

export interface Written<V> {
  value: V;
  at: Clock;
}

export interface Merged<S> {
  state: S;
  changed: boolean;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// A stored register without a clock loses to any write; with a clock, the incoming write wins
// when its clock is not older (equal clocks: the write that arrives later wins).
export function incomingWins(stored: Written<unknown> | null, incoming: Written<unknown>): boolean {
  if (stored === null || stored.at === null) return true;
  return incoming.at !== null && incoming.at >= stored.at;
}

export function mergeRegister<V>(
  stored: Written<V> | null,
  incoming: Written<V>,
): Merged<Written<V>> {
  if (!incomingWins(stored, incoming)) return { state: stored as Written<V>, changed: false };
  const state = { value: incoming.value, at: incoming.at };
  return { state, changed: stored === null || !sameJson(stored, state) };
}

// The earliest date that is known: a missing date is unknown, not "earlier than everything".
function earliestKnown(a: Clock, b: Clock): Clock {
  if (a === null) return b;
  if (b === null) return a;
  return a <= b ? a : b;
}

export function mergeFlag(stored: boolean, incoming: boolean): Merged<boolean> {
  return { state: stored || incoming, changed: !stored && incoming };
}

export function mergeMax(stored: number | null, incoming: number): Merged<number> {
  const changed = stored === null || incoming > stored;
  return { state: changed ? incoming : (stored as number), changed };
}

export interface DatedFlag {
  value: boolean;
  at: Clock;
}

export function mergeDatedFlag(stored: DatedFlag | null, incoming: DatedFlag): Merged<DatedFlag> {
  const base = stored ?? { value: false, at: null };
  if (!incoming.value) return { state: base, changed: false };
  const state = { value: true, at: earliestKnown(base.at, incoming.at) };
  return { state, changed: !base.value || state.at !== base.at };
}

export interface Observed {
  key: string;
  at: Clock;
}

export function mergeObserved(stored: readonly Observed[], incoming: Observed): Merged<Observed[]> {
  const existing = stored.find((item) => item.key === incoming.key);
  const at = existing === undefined ? incoming.at : earliestKnown(existing.at, incoming.at);
  const changed = existing === undefined || existing.at !== at;
  const others = stored.filter((item) => item.key !== incoming.key);
  const state = [...others, { key: incoming.key, at }].sort((x, y) => (x.key < y.key ? -1 : 1));
  return { state: changed ? state : [...stored], changed };
}
```

## 2. `frontend/src/features/progress-sync/model/field-kinds.ts`

Los 25 tipos de campo con su regla, el registro que el check compara con `kinds` del fixture.

```ts
// The fields the server merges, by the rule that governs each one (contracts/merge-rules.md).
export type Rule =
  'lww' | 'lww-group' | 'tombstone' | 'flag-or' | 'max' | 'dated-flag' | 'observed';

export const FIELD_KINDS: Readonly<Record<string, Rule>> = {
  'exercise.prediction.answer': 'lww',
  'exercise.reflection': 'lww',
  'exercise.customTest': 'lww',
  'checkpoint.lastAnswer': 'lww',
  'workshop.answer': 'lww',
  'workshop.note': 'lww',
  'route.quiz': 'lww',
  'route.note': 'lww',
  'preference.routeLanguage': 'lww',
  'preference.focusMinutes': 'lww',
  'preference.labSelectedRust': 'lww',
  'preference.labSelectedGo': 'lww',
  'exercise.review': 'lww-group',
  'exercise.draft': 'lww-group',
  'workshop.step': 'tombstone',
  'route.mark.step': 'tombstone',
  'route.mark.milestone': 'tombstone',
  'route.mark.favorite': 'tombstone',
  'exercise.assisted': 'flag-or',
  'exercise.solutionSeen': 'flag-or',
  'exercise.hintsRevealed': 'max',
  'exercise.predictionCorrect': 'dated-flag',
  'checkpoint.passed': 'dated-flag',
  'workshop.predictionCorrect': 'dated-flag',
  'workshop.objective': 'observed',
};
```

## 3. `qa/lib/merge-fixture.ts`

El lector del fixture, con su huella congelada, y las situaciones que cada regla tiene que mostrar. D1c lo importa para correr los mismos casos contra el cliente.

```ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Rule } from '../../frontend/src/features/progress-sync/model/field-kinds.ts';

export interface MergeCase {
  id: string;
  kind: string;
  situation: string;
  order?: 'ab' | 'ba';
  only?: 'ts' | 'php';
  stored: unknown;
  incoming: unknown[];
  expect: { state: unknown; changed: boolean[] };
}

export interface ServerCase {
  id: string;
  family: 'clock-correction' | 'stale-content' | 'rejection';
  batches: { serverNow: string; sentAt: string; operations: Record<string, unknown>[] }[];
  expect: { results: { status: string; reason?: string }[]; stored: unknown[] };
}

export interface MergeFixture {
  format: number;
  contract: string;
  world: Record<string, unknown>;
  kinds: Record<
    string,
    { rule: Rule; target: string; op: string; samples?: Record<string, unknown> }
  >;
  cases: MergeCase[];
  serverCases: ServerCase[];
}

const SHARED = join(import.meta.dirname, '..', 'fixtures', 'shared');

export function readMergeFixture(directory: string = SHARED): MergeFixture {
  const bytes = readFileSync(join(directory, 'merge-cases.json'));
  const pinned = readFileSync(join(directory, 'merge-cases.sha256'), 'utf8').trim().split(/\s+/)[0];
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== pinned) {
    throw new Error(
      `merge-cases.json cambió (${actual}) y merge-cases.sha256 dice ${pinned}: es un fixture congelado`,
    );
  }
  return JSON.parse(bytes.toString('utf8')) as MergeFixture;
}

// The situations every kind of a rule must show, in both arrival orders where the rule has them.
const TIME_FAMILY = ['absent', 'identical'];
const PAIRED = ['newer', 'older', 'equal', 'empty-stored', 'empty-incoming'];
const GROW_ONLY: Partial<Record<Rule, string[]>> = {
  'flag-or': ['absent', 'false-then-true', 'true-then-true', 'true-then-false'],
  max: ['absent', 'raise', 'lower-ignored', 'equal'],
  'dated-flag': [
    'absent',
    'earlier-date-wins',
    'later-date-ignored',
    'legacy-date-filled',
    'incoming-without-date-ignored',
    'row-with-false-flag',
    'not-correct-ignored',
    'same-date',
  ],
  observed: [
    'absent',
    'earlier-date-wins',
    'later-date-ignored',
    'legacy-date-filled',
    'other-objective-added.ab',
    'other-objective-added.ba',
    'same-objective-same-date',
  ],
};

export function requiredCaseIds(kind: string, rule: Rule): string[] {
  if (rule === 'lww' || rule === 'lww-group' || rule === 'tombstone') {
    const impossible =
      rule === 'tombstone' || kind === 'exercise.draft'
        ? ['empty-stored.ba', 'empty-incoming.ab']
        : [];
    const ids = [
      ...TIME_FAMILY,
      ...PAIRED.flatMap((situation) => [`${situation}.ab`, `${situation}.ba`]),
    ];
    return ids.filter((id) => !impossible.includes(id)).map((id) => `${kind}/${id}`);
  }
  return (GROW_ONLY[rule] ?? []).map((id) => `${kind}/${id}`);
}

// The server-only cases of merge-rules.md, section 7: TypeScript checks that they exist, not what they give.
const REJECTIONS = [
  'unknown-type',
  'server-owned-field',
  'importer-only-field',
  'wrong-type',
  'assist-with-false',
  'assist-without-flags',
  'draft-null-code-with-hash',
  'review-unknown-confidence',
  'lab-selected-of-other-language',
  'answer-outside-options',
  'hints-beyond-the-exercise',
  'hints-zero',
  'focus-minutes-not-allowed',
  'reflection-too-long',
  'custom-test-too-long',
  'draft-too-long',
  'workshop-note-too-long',
  'route-note-too-long',
  'unknown-exercise',
  'unknown-world',
  'unknown-workshop',
  'unknown-objective',
  'unknown-step-key',
  'unknown-guide-step',
  'unknown-resource',
  'unknown-milestone',
  'unknown-lab-selected',
  'mixed-batch-applies-the-valid-one',
];
const CLOCKS = [
  'in-sync',
  'device-ahead-one-hour',
  'device-behind-one-hour',
  'operation-after-send-is-capped',
  'old-offline-operation-keeps-its-age',
  'before-floor-is-out-of-range',
  'ahead-device-does-not-win-forever',
];
const ANSWERS = ['exercise.prediction', 'checkpoint.answer', 'workshop.prediction', 'route.quiz'];

export const REQUIRED_SERVER_CASE_IDS: string[] = [
  ...CLOCKS.map((name) => `clock/${name}`),
  ...ANSWERS.flatMap((type) => [`stale/${type}/current`, `stale/${type}/stale`]),
  ...REJECTIONS.map((name) => `reject/${name}`),
];
```

## 4. `qa/merge-fixture-check.ts`

El check de `npm test`: el registro de tipos coincide con el fixture, la cobertura de la matriz, las propiedades de convergencia y desempate (sin una regla de fusión), los casos del servidor (existen, sin ejecutarlos) y las reglas puras contra lo escrito a mano.

```ts
import assert from 'node:assert/strict';
import {
  FIELD_KINDS,
  type Rule,
} from '../frontend/src/features/progress-sync/model/field-kinds.ts';
import {
  mergeDatedFlag,
  mergeFlag,
  mergeMax,
  mergeObserved,
  mergeRegister,
  type DatedFlag,
  type Merged,
  type Observed,
  type Written,
} from '../frontend/src/features/progress-sync/model/merge-rules.ts';
import {
  readMergeFixture,
  requiredCaseIds,
  REQUIRED_SERVER_CASE_IDS,
  type MergeCase,
} from './lib/merge-fixture.ts';

interface Outcome {
  state: unknown;
  changed: boolean[];
}

// Applies the writes of a case one after the other, the way the server receives them.
function fold<S, W>(
  initial: S,
  writes: W[],
  step: (state: S, write: W) => Merged<S>,
): { state: S; changed: boolean[] } {
  const changed: boolean[] = [];
  let state = initial;
  for (const write of writes) {
    const merged = step(state, write);
    state = merged.state;
    changed.push(merged.changed);
  }
  return { state, changed };
}

const RUNNERS: Record<Rule, (item: MergeCase) => Outcome> = {
  lww: (item) =>
    fold(
      item.stored as Written<unknown> | null,
      item.incoming as Written<unknown>[],
      mergeRegister,
    ),
  'lww-group': (item) => RUNNERS.lww(item),
  tombstone: (item) => RUNNERS.lww(item),
  'flag-or': (item) => {
    const stored = (item.stored as { value: boolean } | null)?.value ?? false;
    const incoming = (item.incoming as { value: boolean }[]).map((write) => write.value);
    const { state, changed } = fold(stored, incoming, mergeFlag);
    return { state: { value: state }, changed };
  },
  max: (item) => {
    const stored = (item.stored as { value: number } | null)?.value ?? null;
    const incoming = (item.incoming as { value: number }[]).map((write) => write.value);
    const { state, changed } = fold<number | null, number>(stored, incoming, mergeMax);
    return { state: { value: state }, changed };
  },
  'dated-flag': (item) =>
    fold(item.stored as DatedFlag | null, item.incoming as DatedFlag[], mergeDatedFlag),
  observed: (item) => {
    const stored = (item.stored as { observed: Observed[] } | null)?.observed ?? [];
    const { state, changed } = fold(stored, item.incoming as Observed[], mergeObserved);
    return { state: { observed: state }, changed };
  },
};

const fixture = readMergeFixture();

// 1. The fixture and the module name the same fields, by the same rule.
assert.deepEqual(
  Object.fromEntries(Object.entries(fixture.kinds).map(([kind, spec]) => [kind, spec.rule])),
  { ...FIELD_KINDS },
  'los tipos de campo del fixture y los del módulo de fusión no coinciden',
);

// 2. Every kind shows every situation its rule needs, and no case is repeated.
const ids = new Set<string>();
for (const item of fixture.cases) {
  assert.ok(!ids.has(item.id), `caso repetido: ${item.id}`);
  ids.add(item.id);
  assert.ok(item.kind in fixture.kinds, `${item.id}: tipo de campo desconocido`);
}
for (const [kind, spec] of Object.entries(fixture.kinds)) {
  for (const required of requiredCaseIds(kind, spec.rule))
    assert.ok(ids.has(required), `falta el caso ${required}`);
}

// 2b. The server-only cases exist, are the ones of the contract and say one result per operation.
assert.deepEqual(
  fixture.serverCases.map((item) => item.id),
  REQUIRED_SERVER_CASE_IDS,
  'los casos del servidor no son los del contrato',
);
for (const item of fixture.serverCases) {
  const operations = item.batches.flatMap((batch) => batch.operations);
  assert.equal(
    item.expect.results.length,
    operations.length,
    `${item.id}: un resultado por operación`,
  );
}

// 3. Properties of the hand-written expectations that need no merge rule: the same two writes in
// the two arrival orders converge, except with equal clocks, where the later arrival wins.
function writesOf(item: MergeCase): string {
  const all = [item.stored, ...item.incoming].filter((write) => write !== null);
  return JSON.stringify(all.map((write) => JSON.stringify(write)).sort());
}
const groups = new Map<string, MergeCase[]>();
for (const item of fixture.cases) {
  if (item.order === undefined) continue;
  const key = `${item.kind}|${writesOf(item)}`;
  groups.set(key, [...(groups.get(key) ?? []), item]);
}
for (const [key, members] of groups) {
  assert.equal(members.length, 2, `${key}: se esperaban los dos órdenes de llegada`);
  const [first, second] = members;
  const sameFinal = JSON.stringify(first.expect.state) === JSON.stringify(second.expect.state);
  if (first.situation === 'equal')
    assert.ok(!sameFinal, `${first.id}: con relojes iguales el orden de llegada decide`);
  else
    assert.ok(
      sameFinal,
      `${first.id} y ${second.id}: sin empate, los dos órdenes tienen que converger`,
    );
}

// 4. The pure merge rules give the hand-written result.
const clientCases = fixture.cases.filter((item) => item.only !== 'php');
const failures = clientCases
  .filter(
    (item) =>
      JSON.stringify(RUNNERS[fixture.kinds[item.kind].rule](item)) !== JSON.stringify(item.expect),
  )
  .map((item) => item.id);
assert.deepEqual(failures, [], `${failures.length} casos no dan el resultado escrito a mano`);

console.log(
  `merge-fixture-check: ${fixture.cases.length} casos de fusión (${clientCases.length} corridos en TypeScript), ${fixture.serverCases.length} del servidor y ${Object.keys(fixture.kinds).length} tipos de campo PASS.`,
);
```

## 5. `qa/route-milestones-check.ts` y `qa/fixtures/shared/route-milestones.json`

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const source = readFileSync(join(root, 'frontend', 'app.js'), 'utf8');

// The route milestones live in the legacy shell until F2 moves them to entities/guide: only this path changes then.
const start = source.indexOf('const milestones = [');
const end = source.indexOf('\n  ];', start);
assert.ok(start >= 0 && end > start, 'no se encontró el arreglo milestones en frontend/app.js');

const ids = [...source.slice(start, end).matchAll(/^\s{6}id: '([a-z-]+)',/gm)].map(
  (match) => match[1],
);
const expected = ['rust', 'go'].flatMap((language) => ids.map((id) => `${language}-${id}`));
const shared = JSON.parse(
  readFileSync(join(root, 'qa', 'fixtures', 'shared', 'route-milestones.json'), 'utf8'),
) as string[];

assert.deepEqual(
  shared,
  expected,
  'route-milestones.json no coincide con los hitos de frontend/app.js',
);
console.log(`route-milestones-check: ${shared.length} hitos PASS.`);
```

```json
[
  "rust-memory",
  "rust-commands",
  "rust-files",
  "rust-measure",
  "rust-network",
  "go-memory",
  "go-commands",
  "go-files",
  "go-measure",
  "go-network"
]
```

## 6. El generador de una vez (no versionado)

Arma `qa/fixtures/shared/merge-cases.json` expandiendo las tablas de [merge-rules.md](./contracts/merge-rules.md). **No importa ninguna regla de fusión**: los esperados son las tablas de verdad, escritas a mano en el propio script. Se corre una vez, se formatea con Prettier (`npx prettier --write qa/fixtures/shared/merge-cases.json`), se revisa caso por caso, se fija la huella (`sha256sum qa/fixtures/shared/merge-cases.json | sed 's#qa/fixtures/shared/##' > qa/fixtures/shared/merge-cases.sha256`) y se descarta. No se vuelve a correr para que un check pase. Precedente: el generador de las 21 migraciones de C2.

```js
// One-shot generator of qa/fixtures/shared/merge-cases.json (never versioned, never re-run to fix a failing check).
// The expected values come from the truth tables written below by hand from contracts/merge-rules.md;
// this file must not import merge-rules.ts.
import { writeFileSync } from 'node:fs';

const T = {
  t1: '2026-10-05T12:00:01.000Z',
  t2: '2026-10-05T12:00:02.000Z',
  t3: '2026-10-05T12:00:03.000Z',
};
const HASH_A = 'a'.repeat(64);
const clock = (token) => (token === null ? null : T[token]);

const world = {
  contentVersion: '0123456789abcdef0123456789abcdef',
  staleContentVersion: 'fedcba9876543210fedcba9876543210',
  exercises: [
    { id: 'fx-rust-01', language: 'rust', hints: 3, predictionOptions: 3 },
    { id: 'fx-rust-02', language: 'rust', hints: 2, predictionOptions: 3 },
    { id: 'fx-go-01', language: 'go', hints: 3, predictionOptions: 3 },
    { id: 'fx-go-02', language: 'go', hints: 3, predictionOptions: 3 },
  ],
  worlds: [{ id: 'fx-world-1', checkpointOptions: 3 }],
  workshops: [
    { id: 'fx-workshop-1', predictionOptions: 3, objectives: ['fx-obj-1', 'fx-obj-2'], steps: ['e1', 'e2', 'e3', 'e4'] },
  ],
  guide: { steps: [{ id: 'fx-step-1', quizOptions: 3 }], resources: ['fx-res-1'] },
  milestones: ['rust-memory', 'go-memory'],
};

// kind -> [rule, target, op, sample A, sample B]
const REVIEW_A = { confidence: 'again', reviewedAt: '2026-10-05T11:00:00.000Z', reviewDueAt: '2026-10-06T11:00:00.000Z' };
const REVIEW_B = { confidence: 'confident', reviewedAt: '2026-10-05T11:30:00.000Z', reviewDueAt: '2026-10-12T11:30:00.000Z' };
const KINDS = {
  'exercise.prediction.answer': ['lww', 'exercise', 'exercise.prediction', 0, 2],
  'exercise.reflection': ['lww', 'exercise', 'exercise.reflection', 'Primera idea', 'Segunda idea'],
  'exercise.customTest': ['lww', 'exercise', 'exercise.customTest', 'assert_eq!(f(1), 2);', 'assert_eq!(f(2), 4);'],
  'checkpoint.lastAnswer': ['lww', 'world', 'checkpoint.answer', 0, 2],
  'workshop.answer': ['lww', 'workshop', 'workshop.prediction', 0, 2],
  'workshop.note': ['lww', 'workshop', 'workshop.note', 'Nota A', 'Nota B'],
  'route.quiz': ['lww', 'guideStep', 'route.quiz', 0, 2],
  'route.note': ['lww', 'language', 'route.note', 'Aprendí A', 'Aprendí B'],
  'preference.routeLanguage': ['lww', 'account', 'preference.set', 'rust', 'go'],
  'preference.focusMinutes': ['lww', 'account', 'preference.set', 15, 45],
  'preference.labSelectedRust': ['lww', 'account', 'preference.set', 'fx-rust-01', 'fx-rust-02'],
  'preference.labSelectedGo': ['lww', 'account', 'preference.set', 'fx-go-01', 'fx-go-02'],
  'exercise.review': ['lww-group', 'exercise', 'exercise.review', REVIEW_A, REVIEW_B],
  'exercise.draft': ['lww-group', 'exercise', 'exercise.draft', { code: 'fn a() {}', starterHash: HASH_A }, { code: null, starterHash: null }],
  'workshop.step': ['tombstone', 'workshop', 'workshop.step', true, false],
  'route.mark.step': ['tombstone', 'guideStep', 'route.mark', true, false],
  'route.mark.milestone': ['tombstone', 'milestone', 'route.mark', true, false],
  'route.mark.favorite': ['tombstone', 'resource', 'route.mark', true, false],
  'exercise.assisted': ['flag-or', 'exercise', 'exercise.assist', null, null],
  'exercise.solutionSeen': ['flag-or', 'exercise', 'exercise.assist', null, null],
  'exercise.hintsRevealed': ['max', 'exercise', 'exercise.hints', null, null],
  'exercise.predictionCorrect': ['dated-flag', 'exercise', 'exercise.prediction', null, null],
  'checkpoint.passed': ['dated-flag', 'world', 'checkpoint.answer', null, null],
  'workshop.predictionCorrect': ['dated-flag', 'workshop', 'workshop.prediction', null, null],
  'workshop.objective': ['observed', 'workshop', 'workshop.objective', null, null],
};

const kinds = {};
for (const [id, [rule, target, op, a, b]] of Object.entries(KINDS)) {
  kinds[id] = { rule, target, op };
  if (a !== null) kinds[id].samples = { A: a, B: b };
}

// Hand-written truth table of the last-write-wins family (contracts/merge-rules.md, section 4).
// [case, situation, order, stored [sample, clock] | null, incoming [sample, clock], expected [sample, clock, changed]]
const LWW_TABLE = [
  ['absent', 'absent', null, null, ['A', 't1'], ['A', 't1', true]],
  ['newer.ab', 'newer', 'ab', ['A', 't1'], ['B', 't2'], ['B', 't2', true]],
  ['newer.ba', 'newer', 'ba', ['B', 't1'], ['A', 't2'], ['A', 't2', true]],
  ['older.ab', 'older', 'ab', ['A', 't2'], ['B', 't1'], ['A', 't2', false]],
  ['older.ba', 'older', 'ba', ['B', 't2'], ['A', 't1'], ['B', 't2', false]],
  ['equal.ab', 'equal', 'ab', ['A', 't1'], ['B', 't1'], ['B', 't1', true]],
  ['equal.ba', 'equal', 'ba', ['B', 't1'], ['A', 't1'], ['A', 't1', true]],
  ['empty-stored.ab', 'empty-stored', 'ab', ['A', null], ['B', 't1'], ['B', 't1', true]],
  ['empty-stored.ba', 'empty-stored', 'ba', ['B', null], ['A', 't1'], ['A', 't1', true]],
  ['empty-incoming.ab', 'empty-incoming', 'ab', ['A', 't1'], ['B', null], ['A', 't1', false]],
  ['empty-incoming.ba', 'empty-incoming', 'ba', ['B', 't1'], ['A', null], ['B', 't1', false]],
  ['identical', 'identical', null, ['A', 't1'], ['A', 't1'], ['A', 't1', false]],
];
// A tombstone or a draft tombstone (sample B) cannot exist without a clock (the writer enforces
// marked = 1 OR set_at IS NOT NULL): the two rows that need that state are not cases.
const IMPOSSIBLE_FOR_TOMBSTONES = new Set(['empty-stored.ba', 'empty-incoming.ab']);

const cases = [];
const sample = (kind, token) => structuredClone(kinds[kind].samples[token]);
const write = (kind, pair) => (pair === null ? null : { value: sample(kind, pair[0]), at: clock(pair[1]) });

for (const [kind, spec] of Object.entries(kinds)) {
  if (!['lww', 'lww-group', 'tombstone'].includes(spec.rule)) continue;
  const tombstoneLike = spec.rule === 'tombstone' || kind === 'exercise.draft';
  for (const [name, situation, order, stored, incoming, expected] of LWW_TABLE) {
    if (tombstoneLike && IMPOSSIBLE_FOR_TOMBSTONES.has(name)) continue;
    cases.push({
      id: `${kind}/${name}`,
      kind,
      situation,
      ...(order === null ? {} : { order }),
      stored: write(kind, stored),
      incoming: [write(kind, incoming)],
      expect: { state: write(kind, [expected[0], expected[1]]), changed: [expected[2]] },
    });
  }
}

// Text kinds: the comparison that decides `changed` must be exact (no case, accent or trailing-space folding).
const TEXT_KINDS = ['exercise.reflection', 'exercise.customTest', 'workshop.note', 'route.note'];
const TEXT_PAIRS = [
  ['case-only', 'Casa', 'casa'],
  ['accent-only', 'cafe', 'café'],
  ['trailing-space', 'a', 'a '],
  ['to-empty-string', 'x', ''],
  ['emoji', 'hola', 'hola 🙂'],
  ['whitespace-kept', 'x', '  sangría\n  '],
];
for (const kind of TEXT_KINDS) {
  for (const [name, from, to] of TEXT_PAIRS) {
    cases.push({
      id: `${kind}/text/${name}`,
      kind,
      situation: 'text-exact',
      stored: { value: from, at: T.t1 },
      incoming: [{ value: to, at: T.t2 }],
      expect: { state: { value: to, at: T.t2 }, changed: [true] },
    });
  }
}

// Tombstone against an older mark (FR-082).
for (const kind of ['workshop.step', 'route.mark.step']) {
  cases.push({
    id: `${kind}/sequence/late-older-mark-does-not-resurrect`,
    kind,
    situation: 'tombstone-vs-older-mark',
    stored: { value: true, at: T.t1 },
    incoming: [{ value: false, at: T.t3 }, { value: true, at: T.t2 }],
    expect: { state: { value: false, at: T.t3 }, changed: [true, false] },
  });
  cases.push({
    id: `${kind}/sequence/newer-mark-resurrects`,
    kind,
    situation: 'tombstone-vs-older-mark',
    stored: { value: true, at: T.t1 },
    incoming: [{ value: false, at: T.t2 }, { value: true, at: T.t3 }],
    expect: { state: { value: true, at: T.t3 }, changed: [true, true] },
  });
}

// Grow-only families.
const flag = (id, kind, stored, incoming, expected, changed, only) => cases.push({
  id: `${kind}/${id}`, kind, situation: id, ...(only ? { only } : {}), stored, incoming: [incoming], expect: { state: expected, changed: [changed] },
});
for (const kind of ['exercise.assisted', 'exercise.solutionSeen']) {
  flag('absent', kind, null, { value: true }, { value: true }, true);
  flag('false-then-true', kind, { value: false }, { value: true }, { value: true }, true);
  flag('true-then-true', kind, { value: true }, { value: true }, { value: true }, false);
  flag('true-then-false', kind, { value: true }, { value: false }, { value: true }, false, 'ts');
}
const kind = 'exercise.hintsRevealed';
flag('absent', kind, null, { value: 2 }, { value: 2 }, true);
flag('raise', kind, { value: 2 }, { value: 3 }, { value: 3 }, true);
flag('lower-ignored', kind, { value: 3 }, { value: 2 }, { value: 3 }, false);
flag('equal', kind, { value: 2 }, { value: 2 }, { value: 2 }, false);
for (const kind of ['exercise.predictionCorrect', 'checkpoint.passed', 'workshop.predictionCorrect']) {
  flag('absent', kind, null, { value: true, at: T.t2 }, { value: true, at: T.t2 }, true);
  flag('earlier-date-wins', kind, { value: true, at: T.t2 }, { value: true, at: T.t1 }, { value: true, at: T.t1 }, true);
  flag('later-date-ignored', kind, { value: true, at: T.t1 }, { value: true, at: T.t2 }, { value: true, at: T.t1 }, false);
  flag('legacy-date-filled', kind, { value: true, at: null }, { value: true, at: T.t1 }, { value: true, at: T.t1 }, true);
  flag('incoming-without-date-ignored', kind, { value: true, at: T.t1 }, { value: true, at: null }, { value: true, at: T.t1 }, false);
  flag('row-with-false-flag', kind, { value: false, at: null }, { value: true, at: T.t1 }, { value: true, at: T.t1 }, true);
  flag('not-correct-ignored', kind, { value: true, at: T.t1 }, { value: false, at: null }, { value: true, at: T.t1 }, false);
  flag('same-date', kind, { value: true, at: T.t1 }, { value: true, at: T.t1 }, { value: true, at: T.t1 }, false);
}
const objective = 'workshop.objective';
const obs = (key, at) => ({ key, at });
const union = (id, stored, incoming, expected, changed) => cases.push({
  id: `${objective}/${id}`, kind: objective, situation: id, stored: stored === null ? null : { observed: stored },
  incoming: [incoming], expect: { state: { observed: expected }, changed: [changed] },
});
union('absent', null, obs('fx-obj-1', T.t2), [obs('fx-obj-1', T.t2)], true);
union('earlier-date-wins', [obs('fx-obj-1', T.t2)], obs('fx-obj-1', T.t1), [obs('fx-obj-1', T.t1)], true);
union('later-date-ignored', [obs('fx-obj-1', T.t1)], obs('fx-obj-1', T.t2), [obs('fx-obj-1', T.t1)], false);
union('legacy-date-filled', [obs('fx-obj-1', null)], obs('fx-obj-1', T.t1), [obs('fx-obj-1', T.t1)], true);
union('other-objective-added.ab', [obs('fx-obj-1', T.t1)], obs('fx-obj-2', T.t2), [obs('fx-obj-1', T.t1), obs('fx-obj-2', T.t2)], true);
union('other-objective-added.ba', [obs('fx-obj-2', T.t2)], obs('fx-obj-1', T.t1), [obs('fx-obj-1', T.t1), obs('fx-obj-2', T.t2)], true);
union('same-objective-same-date', [obs('fx-obj-1', T.t1)], obs('fx-obj-1', T.t1), [obs('fx-obj-1', T.t1)], false);


// ---- Server-only cases (contracts/merge-rules.md, section 7): they run in Pest through SyncService. ----
const NOW = '2026-10-05T12:10:00.000Z';
let serial = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`;
const reflection = (at, text = 'Hola', extra = {}) => ({ id: uuid(), type: 'exercise.reflection', at, exerciseId: 'fx-rust-01', text, ...extra });
const batch = (operations, sentAt = NOW, serverNow = NOW) => ({ serverNow, sentAt, operations });
const stored = (kind, value, at) => ({ kind, state: { value, at } });
const serverCases = [];
const serverCase = (id, family, batches, results, storedKinds) =>
  serverCases.push({ id, family, batches, expect: { results, stored: storedKinds } });

const applied = { status: 'applied' };
serverCase('clock/in-sync', 'clock-correction', [batch([reflection('2026-10-05T12:09:58.000Z')])], [applied], [stored('exercise.reflection', 'Hola', '2026-10-05T12:09:58.000Z')]);
serverCase('clock/device-ahead-one-hour', 'clock-correction', [batch([reflection('2026-10-05T13:09:55.000Z')], '2026-10-05T13:10:00.000Z')], [applied], [stored('exercise.reflection', 'Hola', '2026-10-05T12:09:55.000Z')]);
serverCase('clock/device-behind-one-hour', 'clock-correction', [batch([reflection('2026-10-05T11:09:55.000Z')], '2026-10-05T11:10:00.000Z')], [applied], [stored('exercise.reflection', 'Hola', '2026-10-05T12:09:55.000Z')]);
serverCase('clock/operation-after-send-is-capped', 'clock-correction', [batch([reflection('2026-10-05T12:10:10.000Z')])], [applied], [stored('exercise.reflection', 'Hola', NOW)]);
serverCase('clock/old-offline-operation-keeps-its-age', 'clock-correction', [batch([reflection('2026-10-02T12:10:00.000Z')])], [applied], [stored('exercise.reflection', 'Hola', '2026-10-02T12:10:00.000Z')]);
serverCase('clock/before-floor-is-out-of-range', 'clock-correction', [batch([reflection('2019-12-31T23:59:59.000Z')])], [{ status: 'rejected', reason: 'out_of_range' }], []);
serverCase(
  'clock/ahead-device-does-not-win-forever',
  'clock-correction',
  [
    batch([reflection('2026-10-05T13:10:00.000Z', 'Hola A')], '2026-10-05T13:10:00.000Z', NOW),
    batch([reflection('2026-10-05T12:10:30.000Z', 'Hola B')], '2026-10-05T12:10:30.000Z', '2026-10-05T12:10:30.000Z'),
  ],
  [applied, applied],
  [stored('exercise.reflection', 'Hola B', '2026-10-05T12:10:30.000Z')],
);

const AT = '2026-10-05T12:09:58.000Z';
const answers = [
  ['exercise.prediction', { exerciseId: 'fx-rust-01', answer: 1, correct: true }, ['exercise.prediction.answer', 'exercise.predictionCorrect']],
  ['checkpoint.answer', { worldId: 'fx-world-1', answer: 1, passed: true }, ['checkpoint.lastAnswer', 'checkpoint.passed']],
  ['workshop.prediction', { workshopId: 'fx-workshop-1', language: 'rust', answer: 1, correct: true }, ['workshop.answer', 'workshop.predictionCorrect']],
  ['route.quiz', { stepId: 'fx-step-1', answer: 1 }, ['route.quiz']],
];
for (const [type, fields, [answerKind, flagKind]] of answers) {
  for (const current of [true, false]) {
    const operation = { id: uuid(), type, at: AT, ...fields, contentVersion: current ? world.contentVersion : world.staleContentVersion };
    const expectStored = [stored(answerKind, 1, AT)];
    if (flagKind !== undefined) expectStored.push(stored(flagKind, current, current ? AT : null));
    serverCase(`stale/${type}/${current ? 'current' : 'stale'}`, 'stale-content', [batch([operation])], [current ? applied : { status: 'stale_content' }], expectStored);
  }
}

const op = (type, fields) => ({ id: uuid(), type, at: AT, ...fields });
const reject = (id, reason, operation) => serverCase(`reject/${id}`, 'rejection', [batch([operation])], [{ status: 'rejected', reason }], []);
const E = { exerciseId: 'fx-rust-01' };
const longText = (times) => ({ repeat: 'x', times });
reject('unknown-type', 'invalid', op('exercise.solved', E));
reject('server-owned-field', 'invalid', op('exercise.prediction', { ...E, answer: 1, correct: true, contentVersion: world.contentVersion, solvedAt: AT }));
reject('importer-only-field', 'invalid', op('workshop.prediction', { workshopId: 'fx-workshop-1', language: 'rust', answer: 1, correct: true, contentVersion: world.contentVersion, codeSealed: true }));
reject('wrong-type', 'invalid', op('exercise.prediction', { ...E, answer: '1', correct: true, contentVersion: world.contentVersion }));
reject('assist-with-false', 'invalid', op('exercise.assist', { ...E, assisted: false }));
reject('assist-without-flags', 'invalid', op('exercise.assist', E));
reject('draft-null-code-with-hash', 'invalid', op('exercise.draft', { ...E, code: null, starterHash: HASH_A }));
reject('review-unknown-confidence', 'invalid', op('exercise.review', { ...E, confidence: 'sure', reviewedAt: AT, reviewDueAt: AT }));
reject('lab-selected-of-other-language', 'invalid', op('preference.set', { name: 'labSelectedRust', value: 'fx-go-01' }));
reject('answer-outside-options', 'out_of_range', op('exercise.prediction', { ...E, answer: 3, correct: false, contentVersion: world.contentVersion }));
reject('hints-beyond-the-exercise', 'out_of_range', op('exercise.hints', { ...E, revealed: 4 }));
reject('hints-zero', 'out_of_range', op('exercise.hints', { ...E, revealed: 0 }));
reject('focus-minutes-not-allowed', 'out_of_range', op('preference.set', { name: 'focusMinutes', value: 20 }));
reject('reflection-too-long', 'out_of_range', op('exercise.reflection', { ...E, text: longText(10001) }));
reject('custom-test-too-long', 'out_of_range', op('exercise.customTest', { ...E, text: longText(3001) }));
reject('draft-too-long', 'out_of_range', op('exercise.draft', { ...E, code: longText(30001), starterHash: HASH_A }));
reject('workshop-note-too-long', 'out_of_range', op('workshop.note', { workshopId: 'fx-workshop-1', language: 'rust', text: longText(10001) }));
reject('route-note-too-long', 'out_of_range', op('route.note', { language: 'rust', field: 'learned', body: longText(20001) }));
reject('unknown-exercise', 'unknown_reference', op('exercise.reflection', { exerciseId: 'fx-no-existe', text: 'x' }));
reject('unknown-world', 'unknown_reference', op('checkpoint.answer', { worldId: 'fx-no-existe', answer: 0, passed: false, contentVersion: world.contentVersion }));
reject('unknown-workshop', 'unknown_reference', op('workshop.note', { workshopId: 'fx-no-existe', language: 'rust', text: 'x' }));
reject('unknown-objective', 'unknown_reference', op('workshop.objective', { workshopId: 'fx-workshop-1', language: 'rust', objectiveKey: 'fx-no-existe' }));
reject('unknown-step-key', 'unknown_reference', op('workshop.step', { workshopId: 'fx-workshop-1', language: 'rust', stepKey: 'e9', marked: true }));
reject('unknown-guide-step', 'unknown_reference', op('route.mark', { kind: 'step', itemKey: 'fx-no-existe', marked: true }));
reject('unknown-resource', 'unknown_reference', op('route.mark', { kind: 'favorite', itemKey: 'fx-no-existe', marked: true }));
reject('unknown-milestone', 'unknown_reference', op('route.mark', { kind: 'milestone', itemKey: 'rust-fx-no-existe', marked: true }));
reject('unknown-lab-selected', 'unknown_reference', op('preference.set', { name: 'labSelectedGo', value: 'fx-no-existe' }));
serverCase(
  'reject/mixed-batch-applies-the-valid-one',
  'rejection',
  [batch([op('exercise.solved', E), reflection(AT, 'Hola'), op('exercise.hints', { ...E, revealed: 4 })])],
  [{ status: 'rejected', reason: 'invalid' }, applied, { status: 'rejected', reason: 'out_of_range' }],
  [stored('exercise.reflection', 'Hola', AT)],
);

const fixture = { format: 1, contract: 'specs/007-d1-progreso-sincronizacion/contracts/merge-rules.md', world, kinds, cases, serverCases };
const text = JSON.stringify(fixture, null, 2) + '\n';
writeFileSync(process.argv[2] ?? 'qa/fixtures/shared/merge-cases.json', text);
console.log('cases', cases.length, 'serverCases', serverCases.length, 'bytes', text.length);
```

## 7. Qué se ejecutó y qué dio

Sobre la copia de `master` (2426bae) con ese código aplicado:

| Comprobación | Resultado |
| --- | --- |
| `node qa/merge-fixture-check.ts` | `merge-fixture-check: 277 casos de fusión (277 corridos en TypeScript), 43 del servidor y 25 tipos de campo PASS.` |
| `node qa/route-milestones-check.ts` | `route-milestones-check: 10 hitos PASS.` |
| `npx eslint` sobre los cinco archivos de TypeScript | 0 problemas (la primera versión de `run` tenía complejidad 19: se partió en un `RUNNERS` por regla) |
| `npx tsc --noEmit -p tsconfig.qa.json` y `-p frontend/tsconfig.app.json` | sin errores |
| `npx prettier --check` sobre los mismos archivos y el fixture | formato correcto |
| El fixture generado | 277 casos de fusión (168 `lww`, 22 `lww-group`, 44 `tombstone`, 8 `flag-or`, 4 `max`, 24 `dated-flag`, 7 `observed`), 43 del servidor (7, 8 y 28), 188 KB y 8.179 líneas con Prettier |
| Mutaciones de `merge-rules.ts` (merge-rules.md, sección 9) | M1 rompe 36 casos, M2 31, M3 31, M4 8, M5 2, M6 18, M7 2 y M8 2 |
| Un caso mal escrito a mano (`equal.ab` que espera el guardado; `newer.ab` que espera el guardado) | el check lo rechaza: «con relojes iguales el orden de llegada decide» y «sin empate, los dos órdenes tienen que converger» |
| Un caso que falta, un tipo de campo de más y un fixture editado sin su huella | el check lo rechaza |

## 8. La comparación del id de etapa

El script que se corre una vez al implementar T007, con la copia de antes y la de después del cambio del generador. Está probado contra las dos copias del scratchpad; su resultado esperado, con los valores de ese día, está en [quickstart.md](./quickstart.md), escenario 1.

```js
// One-shot proof that publishing the step ids changed nothing else (not versioned).
// usage: node step-ids-delta.mjs <root before> <root after>   (both with build/ and dump-globals output)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const [before, after] = process.argv.slice(2);
const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const read = (root, file) => readFileSync(join(root, 'build', file), 'utf8');
const dump = (root) => execFileSync('node', [join(root, 'tools/content/dump-globals.ts'), root], { maxBuffer: 1 << 28 }).toString('utf8');
const withoutIds = (steps) => steps.forEach((step) => delete step.id);

const [oldMeta, newMeta] = [before, after].map((root) => JSON.parse(read(root, 'curriculum.meta.json')));
const [oldText, newText] = [before, after].map((root) => read(root, 'curriculum.json'));
const newDocument = JSON.parse(newText);

// 1. Only the four workshop portions change; the other 13, the 274 exercise hashes and the step keys do not.
const changed = Object.keys(oldMeta.portions).filter((name) => oldMeta.portions[name] !== newMeta.portions[name]);
assert.deepEqual(changed, ['workshops.lowlevel', 'workshops.infra', 'workshops.play', 'workshops.pc']);
assert.deepEqual(newMeta.exercises, oldMeta.exercises);
assert.deepEqual(newMeta.workshopSteps, oldMeta.workshopSteps);
assert.notEqual(newMeta.documentHash, oldMeta.documentHash);

// 2. Taking the ids out of the new document gives the old bytes, for the document and for each portion.
let steps = 0;
for (const [domain, workshops] of Object.entries(newDocument.workshops)) {
  for (const workshop of workshops) {
    assert.deepEqual(workshop.steps.map((step) => Object.keys(step).join()), workshop.steps.map(() => 'id,title,task,why,done'));
    assert.deepEqual(workshop.steps.map((step) => step.id), newMeta.workshopSteps[workshop.id].map((key) => key.id));
    steps += workshop.steps.length;
    withoutIds(workshop.steps);
  }
  assert.equal(sha(JSON.stringify(workshops)), oldMeta.portions[`workshops.${domain}`], `workshops.${domain} sin ids`);
}
assert.equal(JSON.stringify(newDocument, null, 2) + '\n', oldText);

// 3. The oracle: the dump changes only in the ids of the steps of the four SYSTEMS_* groups.
const newDump = JSON.parse(dump(after));
for (const group of Object.values(newDump.globals)) {
  const workshops = group?.workshops;
  if (Array.isArray(workshops) && workshops.every((w) => Array.isArray(w.steps))) workshops.forEach((w) => withoutIds(w.steps));
}
assert.equal(JSON.stringify(newDump), dump(before));

console.log(`OK: ${steps} etapas; document ${sha(newText).slice(0, 8)} (antes ${sha(oldText).slice(0, 8)}); ${changed.length} porciones cambian`);
```
