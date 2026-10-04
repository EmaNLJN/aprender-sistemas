/* Conceptos del Atlas en content/atlas/ (tools/content/atlas.ts).
 * node qa/content-atlas-check.ts
 *
 * Contrato: el manifiesto ordena los conceptos por lenguaje; cada concepto se publica tal cual y
 * `furtherSources` es la única clave opcional.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { loadAtlas } from '../tools/content/atlas.ts';
import { ContentError } from '../tools/content/content-error.ts';

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-atlas-'));
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

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-atlas scenarios PASS.`);
