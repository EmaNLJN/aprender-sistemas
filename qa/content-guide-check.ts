/* Guía de content/guide/ (tools/content/guide.ts).
 * node qa/content-guide-check.ts
 *
 * Contrato: GUIDE_DATA se arma como { resources, tracks: { rust, go }, sources }; la biblioteca
 * sigue el orden de manifest.yaml y cada módulo del recorrido reemplaza sus IDs de pasos por los
 * pasos, en el mismo lugar.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ContentError } from '../tools/content/content-error.ts';
import { loadGuide } from '../tools/content/guide.ts';

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-guide-'));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

function throwsContent(run: () => unknown, message: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ContentError, `se esperaba ContentError: ${String(error)}`);
    assert.equal(error.message, message);
    return true;
  });
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

function resource(id: string, languages: string): string {
  return `id: ${id}
title: Recurso ${id}
url: https://example.org/${id}
languages:
  - ${languages}
category: ejercicios
cost: gratis
format: Ejercicios
description: Un recurso.
why: Porque sirve.
caveat: No es todo.
featured: true
`;
}

function step(id: string, answer = 0): string {
  return `id: ${id}
title: Paso ${id}
minutes: 25
objective: Aprender algo.
task: Hacé algo.
doneWhen: Podés explicarlo.
resourceIds:
  - r1
quiz:
  question: ¿Qué aprendiste?
  options:
    - Algo
    - Nada
  answer: ${answer}
  explanation: Algo, siempre.
`;
}

function track(language: string, steps: string[]): string {
  return `title: Recorrido ${language}
description: Un recorrido.
modules:
  - id: ${language}-m1
    title: Módulo uno
    subtitle: El primero.
    steps:
${steps.map((id) => `      - ${id}`).join('\n')}
`;
}

function guideFiles(): Record<string, string> {
  return {
    'content/guide/manifest.yaml': 'resources:\n  - r2\n  - r1\n',
    'content/guide/resources/r1.yaml': resource('r1', 'rust'),
    'content/guide/resources/r2.yaml': resource('r2', 'both'),
    'content/guide/sources.yaml':
      '- title: Fuente\n  url: https://example.org/f\n  note: Contexto.\n',
    'content/guide/rust/manifest.yaml': track('rust', ['rust-s2', 'rust-s1']),
    'content/guide/rust/steps/rust-s1.yaml': step('rust-s1'),
    'content/guide/rust/steps/rust-s2.yaml': step('rust-s2'),
    'content/guide/go/manifest.yaml': track('go', ['go-s1']),
    'content/guide/go/steps/go-s1.yaml': step('go-s1'),
  };
}

test('la guía se arma con la forma y el orden de GUIDE_DATA', () => {
  const guide = loadGuide(fixture(guideFiles())) as {
    resources: { id: string }[];
    tracks: Record<string, { modules: { id: string; steps: { id: string }[] }[] }>;
    sources: unknown[];
  };
  assert.deepEqual(Object.keys(guide), ['resources', 'tracks', 'sources']);
  assert.deepEqual(Object.keys(guide.tracks), ['rust', 'go']);
  assert.deepEqual(
    guide.resources.map((item) => item.id),
    ['r2', 'r1'],
  );
  const module = guide.tracks.rust.modules[0];
  assert.deepEqual(Object.keys(module), ['id', 'title', 'subtitle', 'steps']);
  assert.deepEqual(
    module.steps.map((item) => item.id),
    ['rust-s2', 'rust-s1'],
  );
  assert.deepEqual(guide.sources, [
    { title: 'Fuente', url: 'https://example.org/f', note: 'Contexto.' },
  ]);
});

test('validación: pasos faltantes, quiz y valores admitidos', () => {
  const missing = guideFiles();
  delete missing['content/guide/go/steps/go-s1.yaml'];
  throwsContent(
    () => loadGuide(fixture(missing)),
    'content/guide/go/manifest.yaml: go-s1 no tiene content/guide/go/steps/go-s1.yaml',
  );
  const quiz = { ...guideFiles(), 'content/guide/go/steps/go-s1.yaml': step('go-s1', 2) };
  throwsContent(
    () => loadGuide(fixture(quiz)),
    'content/guide/go/steps/go-s1.yaml: quiz.answer: 2 no es el índice de una opción: hay 2',
  );
  const language = { ...guideFiles(), 'content/guide/resources/r1.yaml': resource('r1', 'java') };
  throwsContent(
    () => loadGuide(fixture(language)),
    'content/guide/resources/r1.yaml: languages[0]: se esperaba uno de: rust, go, both',
  );
});

test('validación: los IDs de módulos y pasos no se repiten entre recorridos', () => {
  const files = {
    ...guideFiles(),
    'content/guide/go/manifest.yaml': track('go', ['go-s1']).replace('go-m1', 'rust-m1'),
  };
  throwsContent(
    () => loadGuide(fixture(files)),
    'content/guide/go/manifest.yaml: ID repetido en la guía: rust-m1',
  );
});

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-guide scenarios PASS.`);
