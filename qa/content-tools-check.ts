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
import { expectSameIds, listDirectories, listYamlIds } from '../tools/content/catalog-files.ts';
import { child, ContentError, fail, filePlace } from '../tools/content/content-error.ts';
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
  assert.deepEqual(checkQuestion(question, place), {
    question: '¿?',
    options: ['a', 'b', 'c'],
    answer: 2,
    explanation: 'Porque.',
  });
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

test('readYamlFile rechaza lo que JSON no representaría igual', () => {
  const root = fixture({
    'content/alias.yaml': 'a: &x [1]\nb: *x\n',
    'content/vacia.yaml': '"": x\n',
    'content/compuesta.yaml': '? [a, b]\n: x\n',
    'content/nan.yaml': 'a: .nan\n',
    'content/grande.yaml': 'a: 12345678901234567890\n',
    'content/claves.yaml': '1: x\n"1": y\n',
    'content/set.yaml': 'a: !!set {x, y}\n',
  });
  // Guardado en Latin-1: decodificado como UTF-8 publicaría U+FFFD en lugar de la í y la ó.
  writeFileSync(join(root, 'content/latin1.yaml'), Buffer.from('título: canción\n', 'latin1'));
  throwsContent(
    () => readYamlFile(root, 'content/latin1.yaml'),
    'content/latin1.yaml: no es UTF-8 válido',
  );
  throwsContent(
    () => readYamlFile(root, 'content/alias.yaml'),
    'content/alias.yaml: no se admiten alias (*): cada valor se escribe completo',
  );
  throwsContent(
    () => readYamlFile(root, 'content/vacia.yaml'),
    'content/vacia.yaml: cada clave tiene que ser un texto no vacío',
  );
  throwsContent(
    () => readYamlFile(root, 'content/compuesta.yaml'),
    'content/compuesta.yaml: cada clave tiene que ser un texto no vacío',
  );
  throwsContent(
    () => readYamlFile(root, 'content/nan.yaml'),
    'content/nan.yaml: .nan no es un número que JSON represente',
  );
  throwsContent(
    () => readYamlFile(root, 'content/grande.yaml'),
    'content/grande.yaml: 12345678901234567890 no es un número que JSON represente',
  );
  // 1 y "1" quedarían como la misma clave de objeto; un tag de YAML no es un valor JSON.
  for (const [file, start] of [
    ['content/claves.yaml', 'Map keys must be unique'],
    ['content/set.yaml', 'Unresolved tag'],
  ]) {
    assert.throws(
      () => readYamlFile(root, file),
      (error: unknown) =>
        error instanceof ContentError &&
        error.message.startsWith(`${file}: YAML inválido: ${start}`),
    );
  }
});

test('readYamlFile lee YAML 1.2 aunque el archivo declare %YAML 1.1', () => {
  // Con YAML 1.1, `no` sería false y `010` sería 8.
  const root = fixture({ 'content/v11.yaml': '%YAML 1.1\n---\na: no\nb: 010\n' });
  assert.deepEqual(readYamlFile(root, 'content/v11.yaml'), { a: 'no', b: 10 });
});

test('las carpetas de content/ ignoran ocultos y rechazan entradas de otro tipo', () => {
  const root = fixture({
    'content/rust/exercises/rust-01/exercise.yaml': 'title: x\n',
    'content/rust/exercises/.DS_Store': '',
    'content/campaign/a.yaml': 'id: a\n',
    'content/campaign/.a.yaml.swp': '',
  });
  assert.deepEqual(listDirectories(root, 'content/rust/exercises'), ['rust-01']);
  assert.deepEqual(listYamlIds(root, 'content/campaign'), ['a']);
  writeFileSync(join(root, 'content/rust/exercises/rust-02.yaml'), 'title: x\n');
  throwsContent(
    () => listDirectories(root, 'content/rust/exercises'),
    'content/rust/exercises/rust-02.yaml: sólo se admiten carpetas <id>',
  );
  mkdirSync(join(root, 'content/campaign/sub'));
  throwsContent(
    () => listYamlIds(root, 'content/campaign'),
    'content/campaign/sub: sólo se admiten archivos <id>.yaml',
  );
  throwsContent(
    () => listYamlIds(root, 'content/campaign/a.yaml'),
    'content/campaign/a.yaml: se esperaba una carpeta',
  );
});

test('checkRecord valida las claves opcionales presentes y nombra rutas anidadas', () => {
  const place = filePlace('content/x.yaml');
  const spec = { title: expectText, tags: textList(1) };
  throwsContent(
    () => checkRecord({ title: 'a', tags: [' '] }, place, spec, ['tags']),
    'content/x.yaml: tags[0]: se esperaba un texto no vacío',
  );
  throwsContent(
    () => fail(child(child(place, 'a'), 'b'), 'mensaje'),
    'content/x.yaml: a.b: mensaje',
  );
  assert.equal(new ContentError('x').name, 'ContentError');
});

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-tools scenarios PASS.`);
