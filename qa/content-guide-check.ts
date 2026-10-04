/* Guía de content/guide/ (tools/content/guide.ts).
 * node qa/content-guide-check.ts
 *
 * Contrato: GUIDE_DATA se arma como { resources, tracks: { rust, go }, sources }; la biblioteca
 * sigue el orden de manifest.yaml y cada módulo del recorrido reemplaza sus IDs de pasos por los
 * pasos, en el mismo lugar.
 */
import assert from 'node:assert/strict';
import { loadGuide } from '../tools/content/guide.ts';
import { fixture, scenarios, throwsContent } from './lib/content-fixtures.ts';

const { test, done } = scenarios('content-guide');

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
    'content/guide/go/manifest.yaml: modules[0].steps[0]: go-s1 no tiene content/guide/go/steps/go-s1.yaml',
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
    'content/guide/go/manifest.yaml: modules[0].id: ID repetido en la guía: rust-m1',
  );
});

test('un paso de un recorrido no puede ser también paso de otro', () => {
  const files = guideFiles();
  delete files['content/guide/go/steps/go-s1.yaml'];
  throwsContent(
    () =>
      loadGuide(
        fixture({
          ...files,
          'content/guide/go/manifest.yaml': track('go', ['rust-s1']),
          'content/guide/go/steps/rust-s1.yaml': step('rust-s1'),
        }),
      ),
    'content/guide/go/manifest.yaml: modules[0].steps[0]: ID repetido en la guía: rust-s1',
  );
});

test('validación: nada suelto en content/guide/ ni en cada recorrido', () => {
  throwsContent(
    () => loadGuide(fixture({ ...guideFiles(), 'content/guide/notas.yaml': 'a: 1\n' })),
    'content/guide/notas.yaml: sólo se admiten manifest.yaml, sources.yaml, resources/, rust/ y go/',
  );
  throwsContent(
    () => loadGuide(fixture({ ...guideFiles(), 'content/guide/rust/extra.yaml': 'a: 1\n' })),
    'content/guide/rust/extra.yaml: sólo se admiten manifest.yaml y steps/',
  );
  const goAsFile = Object.fromEntries(
    Object.entries(guideFiles()).filter(([file]) => !file.startsWith('content/guide/go/')),
  );
  throwsContent(
    () => loadGuide(fixture({ ...goAsFile, 'content/guide/go': 'no es una carpeta\n' })),
    'content/guide/go: se esperaba una carpeta',
  );
  const hidden = { ...guideFiles(), 'content/guide/.DS_Store': '', 'content/guide/go/.swp': '' };
  assert.deepEqual(Object.keys(loadGuide(fixture(hidden))), ['resources', 'tracks', 'sources']);
});

test('validación: IDs de un recorrido con su campo, recursos huérfanos y fuentes inválidas', () => {
  const repeatedStep = {
    ...guideFiles(),
    'content/guide/rust/manifest.yaml': track('rust', ['rust-s1']).replace(
      '      - rust-s1\n',
      '      - rust-s1\n  - id: rust-m2\n    title: Dos\n    subtitle: Segundo.\n    steps:\n      - rust-s1\n',
    ),
  };
  throwsContent(
    () => loadGuide(fixture(repeatedStep)),
    'content/guide/rust/manifest.yaml: modules[1].steps[0]: ID repetido: rust-s1',
  );
  const repeatedModule = {
    ...guideFiles(),
    'content/guide/rust/manifest.yaml': track('rust', ['rust-s1']).replace(
      '      - rust-s1\n',
      '      - rust-s1\n  - id: rust-m1\n    title: Dos\n    subtitle: Segundo.\n    steps:\n      - rust-s2\n',
    ),
  };
  throwsContent(
    () => loadGuide(fixture(repeatedModule)),
    'content/guide/rust/manifest.yaml: modules[1].id: ID repetido: rust-m1',
  );
  throwsContent(
    () =>
      loadGuide(
        fixture({ ...guideFiles(), 'content/guide/resources/r3.yaml': resource('r3', 'rust') }),
      ),
    'content/guide/resources/r3.yaml: no figura en content/guide/manifest.yaml',
  );
  throwsContent(
    () => loadGuide(fixture({ ...guideFiles(), 'content/guide/sources.yaml': '- title: Sola\n' })),
    'content/guide/sources.yaml: [0]: falta la clave «url»',
  );
});

done();
