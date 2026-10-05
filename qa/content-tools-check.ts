import assert from 'node:assert/strict';
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  expectSameIds,
  listDirectories,
  listFiles,
  listYamlIds,
} from '../tools/content/catalog-files.ts';
import { child, ContentError, fail, filePlace } from '../tools/content/content-error.ts';
import { loadCurriculum } from '../tools/content/load-curriculum.ts';
import { checkQuestion, checkRecord, expectText, textList } from '../tools/content/shape.ts';
import { readContentText, readYamlFile } from '../tools/content/yaml-file.ts';
import { fixture, scenarios, throwsContent } from './lib/content-fixtures.ts';

const { test, done } = scenarios('content-tools');

test('readYamlFile keeps the document key order', () => {
  const root = fixture({ 'content/a.yaml': 'zeta: 1\nalfa: [x, y]\nmedio: {b: 2, a: 1}\n' });
  const value = readYamlFile(root, 'content/a.yaml');
  assert.deepEqual(value, { zeta: 1, alfa: ['x', 'y'], medio: { b: 2, a: 1 } });
  assert.deepEqual(Object.keys(value as object), ['zeta', 'alfa', 'medio']);
  assert.deepEqual(Object.keys((value as { medio: object }).medio), ['b', 'a']);
});

test('readYamlFile names the missing or invalid file', () => {
  const root = fixture({ 'content/doble.yaml': 'a: 1\na: 2\n' });
  throwsContent(() => readYamlFile(root, 'content/falta.yaml'), 'content/falta.yaml: no existe');
  assert.throws(
    () => readYamlFile(root, 'content/doble.yaml'),
    (error: unknown) =>
      error instanceof ContentError &&
      error.message.startsWith('content/doble.yaml: YAML inválido: Map keys must be unique'),
  );
});

test('checkRecord rejects unknown and missing keys with their path', () => {
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

test('checkQuestion requires the answer to be one of the options', () => {
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

test('expectSameIds detects duplicates, missing and orphans', () => {
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

test('listYamlIds ignores the manifest and rejects other files', () => {
  const root = fixture({
    'content/campaign/manifest.yaml': 'rust: []\n',
    'content/campaign/b.yaml': 'id: b\n',
    'content/campaign/a.yaml': 'id: a\n',
  });
  assert.deepEqual(listYamlIds(root, 'content/campaign'), ['a', 'b']);
  assert.deepEqual(listYamlIds(root, 'content/atlas'), []);
  writeFileSync(join(root, 'content/campaign/notas.md'), '');
  throwsContent(
    () => listYamlIds(root, 'content/campaign'),
    'content/campaign/notas.md: sólo se admiten archivos <id>.yaml',
  );
});

test('readYamlFile rejects what JSON would not represent identically', () => {
  const root = fixture({
    'content/alias.yaml': 'a: &x [1]\nb: *x\n',
    'content/clave-alias.yaml': 'base: &k clave\n*k : valor\n',
    'content/vacia.yaml': '"": x\n',
    'content/compuesta.yaml': '? [a, b]\n: x\n',
    'content/nan.yaml': 'a: .nan\n',
    'content/grande.yaml': 'a: 12345678901234567890\n',
    'content/claves.yaml': '1: x\n"1": y\n',
    'content/set.yaml': 'a: !!set {x, y}\n',
    'content/comentario.yaml': 'a: Recibir #2 antes de #0\n',
    'content/comentario-lista.yaml': 'objectives:\n  - label: Recibir #2\n',
    'content/comentario-sangria.yaml': 'a: x\n  # n\nb: y\n',
    'content/comentario-vacio.yaml': 'a: #[test]\n',
  });
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
    () => readYamlFile(root, 'content/clave-alias.yaml'),
    'content/clave-alias.yaml: no se admiten alias (*): cada valor se escribe completo',
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
  const advice =
    'si el # es parte del texto, escribí el valor entre comillas; si es un comentario, pasalo a su propia línea, sin más sangría que la clave';
  const cuts = (value: string): string =>
    `un # después de un espacio empieza un comentario y corta el texto en «${value}»: ${advice}`;
  throwsContent(
    () => readYamlFile(root, 'content/comentario.yaml'),
    `content/comentario.yaml: a: ${cuts('Recibir')}`,
  );
  throwsContent(
    () => readYamlFile(root, 'content/comentario-lista.yaml'),
    `content/comentario-lista.yaml: objectives[0].label: ${cuts('Recibir')}`,
  );
  throwsContent(
    () => readYamlFile(root, 'content/comentario-sangria.yaml'),
    `content/comentario-sangria.yaml: a: ${cuts('x')}`,
  );
  throwsContent(
    () => readYamlFile(root, 'content/comentario-vacio.yaml'),
    `content/comentario-vacio.yaml: a: un # después de un espacio empieza un comentario y deja el valor vacío: ${advice}`,
  );
});

test('readYamlFile admits # inside quotes, without a preceding space, in blocks and on their own lines', () => {
  const root = fixture({
    'content/numeral.yaml':
      '# cabecera\na: \'Recibir #2 antes de #0\'\nb: "[#2 #5]"\nc: foo#bar\n# entre claves\nd: |\n  #[test]\n',
  });
  assert.deepEqual(readYamlFile(root, 'content/numeral.yaml'), {
    a: 'Recibir #2 antes de #0',
    b: '[#2 #5]',
    c: 'foo#bar',
    d: '#[test]\n',
  });
});

test('loadCurriculum: nada suelto en content/', () => {
  const allowed = 'sólo se admiten atlas/, campaign/, guide/, workshops/, rust/ y go/';
  throwsContent(
    () => loadCurriculum(fixture({ 'content/notas.yaml': 'a: 1\n' })),
    `content/notas.yaml: ${allowed}`,
  );
  throwsContent(
    () => loadCurriculum(fixture({ 'content/esenciales/manifest.yaml': 'a: 1\n' })),
    `content/esenciales: ${allowed}`,
  );
});

test('readYamlFile reads YAML 1.2 even if the file declares %YAML 1.1', () => {
  const root = fixture({ 'content/v11.yaml': '%YAML 1.1\n---\na: no\nb: 010\n' });
  assert.deepEqual(readYamlFile(root, 'content/v11.yaml'), { a: 'no', b: 10 });
});

test('content/ folders ignore hidden entries and reject entries of another kind', () => {
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

test('checkRecord validates the optional keys present and names nested paths', () => {
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

test('readContentText rejects what is not a file and drops the BOM', () => {
  const root = fixture({ 'content/dir.yaml/dentro.txt': 'x' });
  throwsContent(
    () => readContentText(root, 'content/dir.yaml'),
    'content/dir.yaml: no es un archivo',
  );
  throwsContent(() => readContentText(root, 'content/falta.yaml'), 'content/falta.yaml: no existe');
  writeFileSync(join(root, 'content/bom.yaml'), '\uFEFFa: 1\n');
  assert.equal(readContentText(root, 'content/bom.yaml'), 'a: 1\n');
  assert.deepEqual(readYamlFile(root, 'content/bom.yaml'), { a: 1 });
});

test('a symlink in a records folder is rejected with its own message', () => {
  const root = fixture({ 'content/campaign/real.yaml': 'id: real\n' });
  symlinkSync(join(root, 'content/campaign/real.yaml'), join(root, 'content/campaign/a.yaml'));
  throwsContent(
    () => listYamlIds(root, 'content/campaign'),
    'content/campaign/a.yaml: es un enlace simbólico; copiá el archivo o la carpeta',
  );
});

test('listFiles ignores hidden entries and rejects what is not a file with the given message', () => {
  const root = fixture({ 'content/e/a.rs': '', 'content/e/.DS_Store': '' });
  assert.deepEqual(listFiles(root, 'content/e', 'sólo archivos'), ['a.rs']);
  mkdirSync(join(root, 'content/e/sub'));
  throwsContent(
    () => listFiles(root, 'content/e', 'sólo archivos'),
    'content/e/sub: sólo archivos',
  );
});

test('build-curriculum: an invalid content/ gives a readable error and writes no JSON', () => {
  const root = fixture({ 'content/rust/exercises/.keep': '' });
  const run = spawnSync(
    process.execPath,
    [join(import.meta.dirname, '..', 'tools', 'content', 'build-curriculum.ts'), root],
    { encoding: 'utf8' },
  );
  assert.equal(run.status, 1);
  assert.ok(
    run.stderr.startsWith('content/ no es válido: content/'),
    `unexpected stderr: ${run.stderr}`,
  );
  assert.equal(existsSync(join(root, 'build', 'curriculum.json')), false);
});

done();
