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

assert.deepEqual(
  Object.fromEntries(Object.entries(fixture.kinds).map(([kind, spec]) => [kind, spec.rule])),
  { ...FIELD_KINDS },
  'los tipos de campo del fixture y los del módulo de fusión no coinciden',
);

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
