import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadCurriculum } from '../tools/content/load-curriculum.ts';
import { scenarios } from './lib/content-fixtures.ts';
import {
  describeMissing,
  missingWarmPackages,
  warmPackages,
  type GoExerciseImports,
} from './lib/go-warm-cache.ts';
import { repoRoot } from './lib/sources.ts';

const { test, done } = scenarios('go-warm-cache');

const warmSource = readFileSync(
  path.join(repoRoot, 'backend/executor/images/go/warm/main.go'),
  'utf8',
);
const curriculum = loadCurriculum(repoRoot);
const goExercises: GoExerciseImports[] = [
  ...curriculum.lab.go,
  ...curriculum.quests.go,
  ...Object.values(curriculum.cores).flat(),
]
  .filter((exercise) => exercise.language === 'go')
  .map((exercise) => ({ id: String(exercise.id), imports: exercise.imports as string[] }));

test('reads the blank and the plain imports of warm/main.go', () => {
  assert.deepEqual(warmPackages('package main\n\nimport (\n\t_ "bufio"\n\t"fmt"\n)\n'), [
    'bufio',
    'fmt',
  ]);
});

test('every package that a Go exercise imports is in the warm cache today (SC-006)', () => {
  assert.deepEqual(
    missingWarmPackages(goExercises, warmPackages(warmSource)).map(describeMissing),
    [],
  );
  const withImports = goExercises.filter((exercise) => exercise.imports.length > 0);
  const packages = new Set(withImports.flatMap((exercise) => exercise.imports));
  console.log(
    `  ${packages.size} paquetes en ${withImports.length} ejercicios de Go, todos en el caché`,
  );
});

test('a package missing from the list fails with the exercise and the package', () => {
  const missing = missingWarmPackages(
    [{ id: 'go-69', imports: ['net/http', 'strings'] }],
    ['strings'],
  );
  assert.deepEqual(missing.map(describeMissing), [
    'go-69 importa net/http, que no está en backend/executor/images/go/warm/main.go: sumalo a la lista y reconstruí la imagen de Go con «docker compose --profile sandbox-images build».',
  ]);
});

test('a new import of an exercise that the list lacks fails', () => {
  const exercises = [...goExercises, { id: 'go-999', imports: ['net/url'] }];
  assert.deepEqual(missingWarmPackages(exercises, warmPackages(warmSource)), [
    { exercise: 'go-999', package: 'net/url' },
  ]);
});

test('a package of the list that no exercise imports is not an error', () => {
  assert.deepEqual(missingWarmPackages([{ id: 'go-01', imports: [] }], ['net/http']), []);
});

test('fmt needs no entry: the harness imports it', () => {
  assert.deepEqual(missingWarmPackages([{ id: 'go-01', imports: ['fmt'] }], []), []);
});

test('a warm/main.go without an import block is reported', () => {
  assert.throws(() => warmPackages('package main\n'), /falta el bloque «import \( … \)»/);
});

done();
