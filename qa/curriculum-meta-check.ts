// build/curriculum.meta.json corresponde al build/curriculum.json que generó el mismo
// `npm run curriculum` (pretypecheck) y respeta lo que content:import da por sentado (ADR 0006):
// - documentHash es el sha256 del documento;
// - hay una huella por cada una de las 17 porciones y por cada ejercicio publicado, ni una más
//   ni una menos, calculadas sobre los bytes que se publican (JSON.stringify de la parte);
// - cada etapa de taller tiene su clave estable, y las 100 etapas de v1 conservan la suya y su
//   índice congelado (qa/fixtures/workshop-steps-v1.json: contrato, nunca se regenera).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

assert.equal(meta.documentHash, sha256(document), 'documentHash es el sha256 de curriculum.json');

// Las 17 porciones, derivadas del documento ya escrito y no del objeto en memoria del generador.
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
assert.deepEqual(
  Object.keys(meta.portions),
  parts.map(([name]) => name),
  'las 17 porciones, en orden',
);
for (const [name, part] of parts) {
  assert.equal(meta.portions[name], sha256(JSON.stringify(part)), `portions.${name}`);
}

const exercises = [
  ...languages.flatMap((l) => curriculum.lab[l]),
  ...languages.flatMap((l) => curriculum.quests[l]),
  ...domains.flatMap((d) => curriculum.cores[d]),
];
assert.deepEqual(
  Object.keys(meta.exercises).sort(),
  exercises.map((exercise) => exercise.id as string).sort(),
  'un juego de huellas por ejercicio',
);
for (const exercise of exercises) {
  const hashes = meta.exercises[exercise.id as string];
  assert.equal(hashes.contentHash, sha256(JSON.stringify(exercise)), `${exercise.id}.contentHash`);
  for (const key of ['contentHash', 'gradingHash', 'starterHash'] as const) {
    assert.match(hashes[key], SHA256, `${exercise.id}.${key}`);
  }
}

// Una clave por etapa publicada, en el mismo orden, y ninguna repetida dentro del taller.
const workshops = domains.flatMap((d) => curriculum.workshops[d]);
assert.deepEqual(
  Object.keys(meta.workshopSteps).sort(),
  workshops.map((workshop) => workshop.id).sort(),
  'claves de etapa para cada taller',
);
for (const workshop of workshops) {
  const keys = meta.workshopSteps[workshop.id];
  assert.equal(keys.length, workshop.steps.length, `${workshop.id}: una clave por etapa`);
  assert.equal(
    new Set(keys.map((key) => key.id)).size,
    keys.length,
    `${workshop.id}: claves únicas`,
  );
}

// Contrato v1: cada etapa que ya existía conserva su clave y su índice. Se pueden sumar etapas
// nuevas (v1Index null), nunca cambiar ni quitar estas.
const frozen = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures', 'workshop-steps-v1.json'), 'utf8'),
) as Record<string, StepKey[]>;
for (const [workshop, keys] of Object.entries(frozen)) {
  for (const frozenKey of keys) {
    assert.ok(
      meta.workshopSteps[workshop]?.some(
        (key) => key.id === frozenKey.id && key.v1Index === frozenKey.v1Index,
      ),
      `${workshop}: la etapa ${frozenKey.id} (v1Index ${frozenKey.v1Index}) cambió o desapareció`,
    );
  }
}
assert.equal(Object.values(frozen).flat().length, 100, 'el contrato v1 fija las 100 etapas');

console.log(
  `curriculum-meta-check: ${parts.length} porciones, ${exercises.length} ejercicios y ${Object.values(meta.workshopSteps).flat().length} etapas con su huella y su clave PASS.`,
);
