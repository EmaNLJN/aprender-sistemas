// FR-028, FR-029, FR-031 (ADR 0006 D10, D14): curriculum.meta.json describes the curriculum.json
// written by the same build. qa/fixtures/workshop-steps-v1.json is a frozen contract: never
// regenerate it.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { JsonRecord } from '../tools/content/shape.ts';
import { exerciseHashes } from '../tools/content/meta.ts';

interface Hashes {
  contentHash: string;
  gradingHash: string;
  starterHash: string;
}
interface StepKey {
  id: string;
  v1Index: number | null;
}
interface Meta {
  documentHash: string;
  sourceCommit: string | null;
  languages: string[];
  catalogs: { code: string; sliceBy: string; chainPosition: number | null }[];
  portions: Record<string, string>;
  exercises: Record<string, Hashes>;
  workshopSteps: Record<string, StepKey[]>;
}
type Part = Record<string, unknown>[];
interface Curriculum {
  lab: Record<string, Part>;
  quests: Record<string, Part>;
  cores: Record<string, Part>;
  campaign: Record<string, Part>;
  workshops: Record<string, { id: string; steps: unknown[] }[]>;
  guide: unknown;
  atlas: Record<string, Part>;
}

const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
const SHA256 = /^[0-9a-f]{64}$/;

const build = join(import.meta.dirname, '..', 'build');
const document = readFileSync(join(build, 'curriculum.json'));
const meta = JSON.parse(readFileSync(join(build, 'curriculum.meta.json'), 'utf8')) as Meta;
const curriculum = JSON.parse(document.toString('utf8')) as Curriculum;

assert.equal(meta.documentHash, sha256(document), 'documentHash is the sha256 of curriculum.json');

const languages = ['rust', 'go'];
const domains = ['lowlevel', 'infra', 'play', 'pc'];
const parts: [string, unknown][] = [
  ...languages.map((l): [string, unknown] => [`lab.${l}`, curriculum.lab[l]]),
  ...languages.map((l): [string, unknown] => [`quests.${l}`, curriculum.quests[l]]),
  ...domains.map((d): [string, unknown] => [`cores.${d}`, curriculum.cores[d]]),
  ...languages.map((l): [string, unknown] => [`campaign.${l}`, curriculum.campaign[l]]),
  ...domains.map((d): [string, unknown] => [`workshops.${d}`, curriculum.workshops[d]]),
  ...languages.map((l): [string, unknown] => [`atlas.${l}`, curriculum.atlas[l]]),
  ['guide', curriculum.guide],
];
assert.equal(parts.length, 17);
// The 18th portion, the harness, is not in curriculum.json: build/harness.json holds the exact
// bytes the API serves, and its hash is the last one of the meta (B2 FR-035).
const harness = readFileSync(join(build, 'harness.json'));
assert.deepEqual(
  Object.keys(meta.portions),
  [...parts.map(([name]) => name), 'harness'],
  'the 17 portions and then the harness, in order',
);
for (const [name, part] of parts) {
  assert.equal(meta.portions[name], sha256(JSON.stringify(part)), `portions.${name}`);
}
assert.equal(
  meta.portions.harness,
  sha256(harness),
  'portions.harness is the sha256 of harness.json',
);
assert.deepEqual(
  Object.keys(JSON.parse(harness.toString('utf8')) as object),
  languages,
  'the harness has one template per language',
);

const exercises = [
  ...languages.flatMap((l) => curriculum.lab[l]),
  ...languages.flatMap((l) => curriculum.quests[l]),
  ...domains.flatMap((d) => curriculum.cores[d]),
];
assert.deepEqual(
  Object.keys(meta.exercises).sort(),
  exercises.map((exercise) => exercise.id as string).sort(),
  'one set of fingerprints per exercise',
);
for (const exercise of exercises) {
  const hashes = meta.exercises[exercise.id as string];
  assert.equal(hashes.contentHash, sha256(JSON.stringify(exercise)), `${exercise.id}.contentHash`);
  for (const key of ['contentHash', 'gradingHash', 'starterHash'] as const) {
    assert.match(hashes[key], SHA256, `${exercise.id}.${key}`);
  }
}

const workshops = domains.flatMap((d) => curriculum.workshops[d]);
assert.deepEqual(
  Object.keys(meta.workshopSteps).sort(),
  workshops.map((workshop) => workshop.id).sort(),
  'stage keys for each workshop',
);
for (const workshop of workshops) {
  const keys = meta.workshopSteps[workshop.id];
  assert.equal(keys.length, workshop.steps.length, `${workshop.id}: one key per stage`);
  assert.equal(new Set(keys.map((key) => key.id)).size, keys.length, `${workshop.id}: unique keys`);
}

// FR-029: new stages (v1Index null) may be added; the v1 ones never change or disappear.
const frozen = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures', 'workshop-steps-v1.json'), 'utf8'),
) as Record<string, StepKey[]>;
for (const [workshop, keys] of Object.entries(frozen)) {
  for (const frozenKey of keys) {
    assert.ok(
      meta.workshopSteps[workshop]?.some(
        (key) => key.id === frozenKey.id && key.v1Index === frozenKey.v1Index,
      ),
      `${workshop}: stage ${frozenKey.id} (v1Index ${frozenKey.v1Index}) changed or disappeared`,
    );
  }
}
assert.equal(Object.values(frozen).flat().length, 100, 'the v1 contract fixes the 100 stages');

// B2 FR-037: the imports of a Go exercise join its grading hash, sorted and without repeats, and
// only when there are some. The expected values are the sha256 of the canonical text below, taken
// with sha256sum and not with this code:
//   {"imports":["errors","strings"],"prediction":{"answer":1,"options":["1","2"]},"tests":[{"expression":"Suma(1, 1) == 2","id":"t1"}]}
//   {"prediction":{"answer":1,"options":["1","2"]},"tests":[{"expression":"Suma(1, 1) == 2","id":"t1"}]}
const WITH_IMPORTS = 'da25b107559e0b0b2b8faa1fe5c0e64066facbe55ce837a612d662f1baad6171';
const WITHOUT_IMPORTS = '84911bb7bb1cc8bdfe4b1e7c61e307524ac28aab73b1e6f613e3ecea2de35ecd';
function grade(language: string, imports: string[]): string {
  const exercise = {
    language,
    imports,
    tests: [{ id: 't1', label: 'Suma', expression: 'Suma(1, 1) == 2', why: 'x', failure: 'y' }],
    prediction: { options: ['1', '2'], answer: 1 },
    starter: 'func Suma(a, b int) int { return 0 }',
  };
  return exerciseHashes(exercise as JsonRecord).gradingHash;
}
assert.equal(
  grade('go', ['strings', 'errors', 'strings']),
  WITH_IMPORTS,
  'sorted and without repeats',
);
assert.equal(
  grade('go', ['errors', 'strings']),
  WITH_IMPORTS,
  'reordering is not a grading change',
);
assert.equal(grade('go', []), WITHOUT_IMPORTS, 'a Go exercise without imports keeps its hash');
assert.equal(grade('rust', ['strings']), WITHOUT_IMPORTS, 'Rust has no imports in its harness');

console.log(
  `curriculum-meta-check: ${parts.length} portions plus the harness, ${exercises.length} exercises and ${Object.values(meta.workshopSteps).flat().length} stages with their fingerprint and key PASS.`,
);
