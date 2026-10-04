/* Base del generador de content/ (tools/content): lectura de YAML, comprobaciones de forma
 * y correspondencia entre un manifiesto y su carpeta.
 * node qa/content-tools-check.ts
 *
 * Cada error nombra el archivo y el campo: es lo único que ve quien edita un YAML.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expectSameIds, listYamlIds } from '../tools/content/catalog-files.ts';
import { ContentError, filePlace } from '../tools/content/content-error.ts';
import { checkQuestion, checkRecord, expectText, textList } from '../tools/content/shape.ts';
import { readYamlFile } from '../tools/content/yaml-file.ts';

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-content-'));
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

test('readYamlFile conserva el orden de claves del documento', () => {
  const root = fixture({ 'content/a.yaml': 'zeta: 1\nalfa: [x, y]\nmedio: {b: 2, a: 1}\n' });
  const value = readYamlFile(root, 'content/a.yaml');
  assert.deepEqual(value, { zeta: 1, alfa: ['x', 'y'], medio: { b: 2, a: 1 } });
  assert.deepEqual(Object.keys(value as object), ['zeta', 'alfa', 'medio']);
  assert.deepEqual(Object.keys((value as { medio: object }).medio), ['b', 'a']);
});

test('readYamlFile nombra el archivo inexistente o inválido', () => {
  const root = fixture({ 'content/doble.yaml': 'a: 1\na: 2\n' });
  throwsContent(() => readYamlFile(root, 'content/falta.yaml'), 'content/falta.yaml: no existe');
  assert.throws(
    () => readYamlFile(root, 'content/doble.yaml'),
    (error: unknown) =>
      error instanceof ContentError &&
      error.message.startsWith('content/doble.yaml: YAML inválido: Map keys must be unique'),
  );
});

test('checkRecord rechaza claves desconocidas y faltantes con su ruta', () => {
  const place = filePlace('content/x.yaml');
  const spec = { title: expectText, tags: textList(1) };
  throwsContent(
    () => checkRecord({ title: 'a', tags: ['b'], extra: 1 }, place, spec),
    'content/x.yaml: extra: clave desconocida',
  );
  throwsContent(
    () => checkRecord({ title: 'a' }, place, spec),
    'content/x.yaml: falta la clave «tags»',
  );
  throwsContent(
    () => checkRecord({ title: 'a', tags: ['b', ' '] }, place, spec),
    'content/x.yaml: tags[1]: se esperaba un texto no vacío',
  );
  assert.deepEqual(checkRecord({ title: 'a' }, place, spec, ['tags']), { title: 'a' });
});

test('checkQuestion exige que la respuesta sea una de las opciones', () => {
  const place = filePlace('content/x.yaml');
  const question = { question: '¿?', options: ['a', 'b', 'c'], answer: 2, explanation: 'Porque.' };
  assert.deepEqual(checkQuestion(question, place), question);
  throwsContent(
    () => checkQuestion({ ...question, answer: 3 }, place),
    'content/x.yaml: answer: 3 no es el índice de una opción: hay 3',
  );
  throwsContent(
    () => checkQuestion({ ...question, options: ['única'] }, place),
    'content/x.yaml: options: se esperaban al menos 2 elementos',
  );
});

test('expectSameIds detecta repetidos, faltantes y huérfanos', () => {
  const manifest = filePlace('content/campaign/manifest.yaml');
  expectSameIds(['b', 'a'], ['a', 'b'], manifest, 'content/campaign', '.yaml');
  throwsContent(
    () => expectSameIds(['a', 'a'], ['a'], manifest, 'content/campaign', '.yaml'),
    'content/campaign/manifest.yaml: ID repetido: a',
  );
  throwsContent(
    () => expectSameIds(['a', 'b'], ['a'], manifest, 'content/campaign', '.yaml'),
    'content/campaign/manifest.yaml: b no tiene content/campaign/b.yaml',
  );
  throwsContent(
    () => expectSameIds(['a'], ['a', 'c'], manifest, 'content/campaign', '.yaml'),
    'content/campaign/c.yaml: no figura en content/campaign/manifest.yaml',
  );
});

test('listYamlIds ignora el manifiesto y rechaza otros archivos', () => {
  const root = fixture({
    'content/campaign/manifest.yaml': 'rust: []\n',
    'content/campaign/b.yaml': 'id: b\n',
    'content/campaign/a.yaml': 'id: a\n',
  });
  assert.deepEqual(listYamlIds(root, 'content/campaign'), ['a', 'b']);
  // Una carpeta que no existe está vacía: el manifiesto informa después qué falta.
  assert.deepEqual(listYamlIds(root, 'content/atlas'), []);
  writeFileSync(join(root, 'content/campaign/notas.md'), '');
  throwsContent(
    () => listYamlIds(root, 'content/campaign'),
    'content/campaign/notas.md: sólo se admiten archivos <id>.yaml',
  );
});

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-tools scenarios PASS.`);
