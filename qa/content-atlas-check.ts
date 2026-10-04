/* Conceptos del Atlas en content/atlas/ (tools/content/atlas.ts).
 * node qa/content-atlas-check.ts
 *
 * Contrato: el manifiesto ordena los conceptos por lenguaje; cada concepto se publica tal cual y
 * `furtherSources` es la única clave opcional.
 */
import assert from 'node:assert/strict';
import { loadAtlas } from '../tools/content/atlas.ts';
import { fixture, scenarios, throwsContent } from './lib/content-fixtures.ts';

const { test, done } = scenarios('content-atlas');

function concept(id: string, extra = ''): string {
  return `id: ${id}
level: beginner
category: Fundamentos
title: Concepto ${id}
summary: Resumen.
why: Porque importa.
code: |-
  fn a() {
      b()
  }
explanation: Explicación.
comparison: Comparación.
pitfall: Trampa.
quiz:
  question: ¿Sí?
  options:
    - Sí
    - No
  answer: 0
  explanation: Sí.
labId: rust-01
source:
  title: Libro
  url: https://example.org/libro
${extra}`;
}

function atlasFiles(): Record<string, string> {
  return {
    'content/atlas/manifest.yaml': 'rust:\n  - rust-b\n  - rust-a\ngo:\n  - go-a\n',
    'content/atlas/rust-a.yaml': concept('rust-a'),
    'content/atlas/rust-b.yaml': concept(
      'rust-b',
      'furtherSources:\n  - title: Más\n    url: https://example.org/mas\n',
    ),
    'content/atlas/go-a.yaml': concept('go-a'),
  };
}

test('el Atlas sigue el orden del manifiesto y furtherSources es opcional', () => {
  const atlas = loadAtlas(fixture(atlasFiles()));
  assert.deepEqual(Object.keys(atlas), ['rust', 'go']);
  assert.deepEqual(
    atlas.rust.map((item) => item.id),
    ['rust-b', 'rust-a'],
  );
  assert.equal(atlas.rust[1].code, 'fn a() {\n    b()\n}');
  assert.deepEqual(atlas.rust[0].furtherSources, [
    { title: 'Más', url: 'https://example.org/mas' },
  ]);
  assert.equal(Object.hasOwn(atlas.rust[1], 'furtherSources'), false);
});

test('validación: furtherSources, si está, no puede quedar vacío', () => {
  const files = {
    ...atlasFiles(),
    'content/atlas/go-a.yaml': concept('go-a', 'furtherSources: []\n'),
  };
  throwsContent(
    () => loadAtlas(fixture(files)),
    'content/atlas/go-a.yaml: furtherSources: la lista no puede estar vacía',
  );
});

done();
