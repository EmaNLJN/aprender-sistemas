# Código de referencia verificado: el generador, la plantilla y el fixture

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Investigación**: [research.md](./research.md)

Es el código de las tareas T004, T005 y T006, que **se ejecutó al planificar** sobre una copia de trabajo del repositorio fuera del árbol (`git archive` de esta rama, con el `node_modules` de la raíz enlazado), con Node 24.21.0. Con estos cambios aplicados pasan `content-tools-check`, `content-exercises-check`, `content-records-check`, `curriculum-meta-check`, `content-check`, `curriculum-ids-check` y el check nuevo `content-harness-check`, además de Prettier, ESLint y `tsc` (`tsconfig.node.json` y `tsconfig.qa.json`), y el generador deja `curriculum.json` igual, las 17 porciones iguales, el oráculo `dump-globals` en `cd1f9e62…`, 18 porciones en el meta y exactamente 49 `gradingHash` distintos (ver [research.md](./research.md), «Cómo se verificó al planificar»). Las plantillas (`content/harness/rust.tpl` y `go.tpl`) están en [contracts/harness-template.md](./contracts/harness-template.md).

Quien implemente aplica estos cambios con TDD (cada tarea abre con sus pruebas, que fallan antes) y vuelve a correr los mismos checks: el código ya está formateado con Prettier. Las referencias a `README.md` y a `qa/AGENTS.md` los integra el coordinador (T021).

## 1. Cambios a archivos que ya existen

```diff
--- a/tools/content/exercises.ts
+++ b/tools/content/exercises.ts
@@ -74,8 +74,14 @@
   return hints;
 }

+// A test key is stable and never reused (ADR 0006 D14): the evidence markers and the stored
+// verdicts name it. `custom` is the student's own test.
+const TEST_KEY = /^[A-Za-z0-9_]{1,64}$/;
+const RESERVED_TEST_KEY = 'custom';
+
 function checkTests(value: unknown, place: Place): unknown[] {
   const tests = expectList(value, place, 1);
+  const keys = new Set<string>();
   tests.forEach((item, index) => {
     const at = child(place, index);
     const test = checkRecord(item, at, {
@@ -85,8 +91,19 @@
       why: expectText,
       failure: expectText,
     });
-    const expected = `t${index + 1}`;
-    if (test.id !== expected) fail(child(at, 'id'), `se esperaba «${expected}»`);
+    const key = test.id as string;
+    const keyPlace = child(at, 'id');
+    if (!TEST_KEY.test(key)) {
+      fail(
+        keyPlace,
+        'la clave de una prueba tiene de 1 a 64 letras ASCII, dígitos o guiones bajos',
+      );
+    }
+    if (key === RESERVED_TEST_KEY) {
+      fail(keyPlace, `«${RESERVED_TEST_KEY}» está reservada para la prueba propia del alumno`);
+    }
+    if (keys.has(key)) fail(keyPlace, `la clave «${key}» se repite en el ejercicio`);
+    keys.add(key);
   });
   return tests;
 }
--- a/tools/content/meta.ts
+++ b/tools/content/meta.ts
@@ -3,6 +3,7 @@
 import { createHash } from 'node:crypto';
 import { CATALOGS, LANGUAGES, SYSTEMS_DOMAINS } from './catalogs.ts';
 import { ContentError } from './content-error.ts';
+import { harnessBody, type HarnessTemplates } from './harness.ts';
 import type { Curriculum } from './load-curriculum.ts';
 import type { JsonRecord } from './shape.ts';
 import type { WorkshopStepKeys } from './workshops.ts';
@@ -41,24 +42,34 @@
   return createHash('sha256').update(text, 'utf8').digest('hex');
 }

+// The Go harness imports these packages, so they decide what compiles (B2 FR-037): sorted and
+// without repeats, so reordering them is not a grading change. Rust has none.
+function gradingImports(exercise: JsonRecord): string[] {
+  if (exercise.language !== 'go') return [];
+  return [...new Set(exercise.imports as string[])].sort();
+}
+
 // contentHash covers the published bytes (FR-031); gradingHash and starterHash use canonical JSON,
-// so reordering keys is not a grading change (ADR 0004 §2, "Hashes").
+// so reordering keys is not a grading change (ADR 0004 §2, "Hashes"). The imports join the
+// grading hash only when there are some: the other exercises keep the hash they had.
 export function exerciseHashes(exercise: JsonRecord): ExerciseHashes {
   const tests = exercise.tests as JsonRecord[];
   const prediction = exercise.prediction as JsonRecord;
+  const grading: Record<string, unknown> = {
+    tests: tests.map((test) => ({ id: test.id, expression: test.expression })),
+    prediction: { options: prediction.options, answer: prediction.answer },
+  };
+  const imports = gradingImports(exercise);
+  if (imports.length > 0) grading.imports = imports;
   return {
     contentHash: sha256Hex(JSON.stringify(exercise)),
-    gradingHash: sha256Hex(
-      canonicalJson({
-        tests: tests.map((test) => ({ id: test.id, expression: test.expression })),
-        prediction: { options: prediction.options, answer: prediction.answer },
-      }),
-    ),
+    gradingHash: sha256Hex(canonicalJson(grading)),
     starterHash: sha256Hex(canonicalJson(exercise.starter)),
   };
 }

-// The 17 portions of ADR 0006 D11, in the order of PHP's Portion enum.
+// The 17 portions of ADR 0006 D11 that come from curriculum.json, in the order of PHP's Portion
+// enum; the 18th, the harness, comes from content/harness/ (portionHashes).
 export function portionsOf(curriculum: Curriculum): Record<string, unknown> {
   const portions: Record<string, unknown> = {};
   for (const language of LANGUAGES) portions[`lab.${language}`] = curriculum.lab[language];
@@ -91,6 +102,7 @@
   document: string,
   sourceCommit: string | null,
   workshopSteps: WorkshopStepKeys,
+  harness: HarnessTemplates,
 ): CurriculumMeta {
   const exercises: Record<string, ExerciseHashes> = {};
   const catalogs = [
@@ -100,12 +112,13 @@
   ];
   for (const exercise of catalogs.flat())
     exercises[exercise.id as string] = exerciseHashes(exercise);
-  const portions = Object.fromEntries(
+  const portions: Record<string, string> = Object.fromEntries(
     Object.entries(portionsOf(curriculum)).map(([name, part]) => [
       name,
       sha256Hex(JSON.stringify(part)),
     ]),
   );
+  portions.harness = sha256Hex(harnessBody(harness));
   return {
     documentHash: sha256Hex(document),
     sourceCommit,
--- a/tools/content/load-curriculum.ts
+++ b/tools/content/load-curriculum.ts
@@ -4,6 +4,7 @@
 import { LANGUAGES, type Language, type SystemsDomain } from './catalogs.ts';
 import { expectDistinctIds, interleaveCores, loadLanguage } from './exercises.ts';
 import { loadGuide } from './guide.ts';
+import { loadHarness, type HarnessTemplates } from './harness.ts';
 import type { JsonRecord } from './shape.ts';
 import { loadWorkshops, type WorkshopStepKeys } from './workshops.ts';

@@ -20,14 +21,15 @@
 export interface CurriculumSource {
   curriculum: Curriculum;
   workshopSteps: WorkshopStepKeys;
+  harness: HarnessTemplates;
 }

 export function loadCurriculumSource(root: string): CurriculumSource {
   expectOnlyEntries(
     root,
     'content',
-    ['atlas', 'campaign', 'guide', 'workshops', ...LANGUAGES],
-    'sólo se admiten atlas/, campaign/, guide/, workshops/, rust/ y go/',
+    ['atlas', 'campaign', 'guide', 'harness', 'workshops', ...LANGUAGES],
+    'sólo se admiten atlas/, campaign/, guide/, harness/, workshops/, rust/ y go/',
   );
   const rust = loadLanguage(root, 'rust');
   const go = loadLanguage(root, 'go');
@@ -42,7 +44,7 @@
     guide: loadGuide(root),
     atlas: loadAtlas(root),
   };
-  return { curriculum, workshopSteps: stepKeys };
+  return { curriculum, workshopSteps: stepKeys, harness: loadHarness(root) };
 }

 export function loadCurriculum(root: string): Curriculum {
--- a/tools/content/build-curriculum.ts
+++ b/tools/content/build-curriculum.ts
@@ -1,6 +1,7 @@
 import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
 import { join, resolve } from 'node:path';
 import { ContentError } from './content-error.ts';
+import { harnessBody } from './harness.ts';
 import { loadCurriculumSource } from './load-curriculum.ts';
 import { curriculumMeta, sourceCommitFrom } from './meta.ts';

@@ -12,14 +13,16 @@

 const root = resolve(process.argv[2] ?? join(import.meta.dirname, '..', '..'));
 try {
-  const { curriculum, workshopSteps } = loadCurriculumSource(root);
+  const { curriculum, workshopSteps, harness } = loadCurriculumSource(root);
   const sourceCommit = sourceCommitFrom(process.env);
   const document = JSON.stringify(curriculum, null, 2) + '\n';
   mkdirSync(join(root, 'build'), { recursive: true });
-  // Document first, meta second: a crash in between leaves a stale meta that content:import
-  // rejects by documentHash (FR-039).
+  // Document and harness first, meta last: a crash in between leaves a stale meta that
+  // content:import rejects by documentHash or by the hash of the harness (FR-039). harness.json
+  // holds exactly the bytes the API serves for the 18th portion.
   writeAtomically(join(root, 'build', 'curriculum.json'), document);
-  const meta = curriculumMeta(curriculum, document, sourceCommit, workshopSteps);
+  writeAtomically(join(root, 'build', 'harness.json'), harnessBody(harness));
+  const meta = curriculumMeta(curriculum, document, sourceCommit, workshopSteps, harness);
   writeAtomically(
     join(root, 'build', 'curriculum.meta.json'),
     JSON.stringify(meta, null, 2) + '\n',
--- a/qa/content-check.ts
+++ b/qa/content-check.ts
@@ -133,8 +133,11 @@
       3,
       ex.id + ': duplicate test expressions',
     );
-    for (const [i, test] of ex.tests.entries()) {
-      assert.equal(test.id, 't' + (i + 1));
+    const keys = ex.tests.map((test) => test.id);
+    assert.equal(new Set(keys).size, keys.length, ex.id + ': test keys are unique');
+    for (const test of ex.tests) {
+      assert.match(test.id, /^[A-Za-z0-9_]{1,64}$/, ex.id + ': test key shape');
+      assert.notEqual(test.id, 'custom', ex.id + ': custom is the student test');
       for (const field of ['label', 'expression', 'why', 'failure'])
         assert.ok(test[field] && test[field].trim(), ex.id + ': test ' + field);
       assert.ok(
--- a/qa/content-exercises-check.ts
+++ b/qa/content-exercises-check.ts
@@ -360,6 +360,34 @@

 const RUST_01 = 'content/rust/exercises/rust-01';

+// A second test after the first one, with the key under test.
+function withSecondTest(key: string): string {
+  return EXERCISE.replace(
+    'hints:\n',
+    `  - id: ${key}
+    label: Cero más cero
+    expression: suma(0, 0) == 0
+    why: Caso nulo.
+    failure: Revisá el neutro.
+hints:\n`,
+  );
+}
+
+test('test keys: non-consecutive keys are accepted and kept in order', () => {
+  const root = rustLab({ [`${RUST_01}/exercise.yaml`]: withSecondTest('t7') });
+  const exercise = loadLanguage(root, 'rust').lab[0];
+  const keys = (exercise.tests as { id: string }[]).map((test) => test.id);
+  assert.deepEqual(keys, ['t1', 't7']);
+  const retired = rustLab({
+    [`${RUST_01}/exercise.yaml`]: EXERCISE.replace('  - id: t1\n', '  - id: prueba_unica_2\n'),
+  });
+  const renamed = loadLanguage(retired, 'rust').lab[0].tests as { id: string }[];
+  assert.deepEqual(
+    renamed.map((test) => test.id),
+    ['prueba_unica_2'],
+  );
+});
+
 test('validation: hints, tests and prediction', () => {
   const cases: [string, string][] = [
     [
@@ -367,8 +395,24 @@
       `${RUST_01}/exercise.yaml: hints: se esperaban 3 pistas y hay 2`,
     ],
     [
-      EXERCISE.replace('  - id: t1\n', '  - id: t2\n'),
-      `${RUST_01}/exercise.yaml: tests[0].id: se esperaba «t1»`,
+      EXERCISE.replace('  - id: t1\n', '  - id: custom\n'),
+      `${RUST_01}/exercise.yaml: tests[0].id: «custom» está reservada para la prueba propia del alumno`,
+    ],
+    [
+      EXERCISE.replace('  - id: t1\n', '  - id: t-1\n'),
+      `${RUST_01}/exercise.yaml: tests[0].id: la clave de una prueba tiene de 1 a 64 letras ASCII, dígitos o guiones bajos`,
+    ],
+    [
+      EXERCISE.replace('  - id: t1\n', `  - id: ${'k'.repeat(65)}\n`),
+      `${RUST_01}/exercise.yaml: tests[0].id: la clave de una prueba tiene de 1 a 64 letras ASCII, dígitos o guiones bajos`,
+    ],
+    [
+      EXERCISE.replace('  - id: t1\n', '  - id: ñ1\n'),
+      `${RUST_01}/exercise.yaml: tests[0].id: la clave de una prueba tiene de 1 a 64 letras ASCII, dígitos o guiones bajos`,
+    ],
+    [
+      withSecondTest('t1'),
+      `${RUST_01}/exercise.yaml: tests[1].id: la clave «t1» se repite en el ejercicio`,
     ],
     [
       EXERCISE.replace('  answer: 1\n', '  answer: 2\n'),
--- a/qa/content-tools-check.ts
+++ b/qa/content-tools-check.ts
@@ -195,7 +195,7 @@
 });

 test('loadCurriculum: nada suelto en content/', () => {
-  const allowed = 'sólo se admiten atlas/, campaign/, guide/, workshops/, rust/ y go/';
+  const allowed = 'sólo se admiten atlas/, campaign/, guide/, harness/, workshops/, rust/ y go/';
   throwsContent(
     () => loadCurriculum(fixture({ 'content/notas.yaml': 'a: 1\n' })),
     `content/notas.yaml: ${allowed}`,
--- a/qa/curriculum-meta-check.ts
+++ b/qa/curriculum-meta-check.ts
@@ -5,6 +5,8 @@
 import { createHash } from 'node:crypto';
 import { readFileSync } from 'node:fs';
 import { join } from 'node:path';
+import type { JsonRecord } from '../tools/content/shape.ts';
+import { exerciseHashes } from '../tools/content/meta.ts';

 interface Hashes {
   contentHash: string;
@@ -57,14 +59,27 @@
   ['guide', curriculum.guide],
 ];
 assert.equal(parts.length, 17);
+// The 18th portion, the harness, is not in curriculum.json: build/harness.json holds the exact
+// bytes the API serves, and its hash is the last one of the meta (B2 FR-035).
+const harness = readFileSync(join(build, 'harness.json'));
 assert.deepEqual(
   Object.keys(meta.portions),
-  parts.map(([name]) => name),
-  'the 17 portions, in order',
+  [...parts.map(([name]) => name), 'harness'],
+  'the 17 portions and then the harness, in order',
 );
 for (const [name, part] of parts) {
   assert.equal(meta.portions[name], sha256(JSON.stringify(part)), `portions.${name}`);
 }
+assert.equal(
+  meta.portions.harness,
+  sha256(harness),
+  'portions.harness is the sha256 of harness.json',
+);
+assert.deepEqual(
+  Object.keys(JSON.parse(harness.toString('utf8')) as object),
+  languages,
+  'the harness has one template per language',
+);

 const exercises = [
   ...languages.flatMap((l) => curriculum.lab[l]),
@@ -112,6 +127,36 @@
 }
 assert.equal(Object.values(frozen).flat().length, 100, 'the v1 contract fixes the 100 stages');

+// B2 FR-037: the imports of a Go exercise join its grading hash, sorted and without repeats, and
+// only when there are some. The expected values are the sha256 of the canonical text below, taken
+// with sha256sum and not with this code:
+//   {"imports":["errors","strings"],"prediction":{"answer":1,"options":["1","2"]},"tests":[{"expression":"Suma(1, 1) == 2","id":"t1"}]}
+//   {"prediction":{"answer":1,"options":["1","2"]},"tests":[{"expression":"Suma(1, 1) == 2","id":"t1"}]}
+const WITH_IMPORTS = 'da25b107559e0b0b2b8faa1fe5c0e64066facbe55ce837a612d662f1baad6171';
+const WITHOUT_IMPORTS = '84911bb7bb1cc8bdfe4b1e7c61e307524ac28aab73b1e6f613e3ecea2de35ecd';
+function grade(language: string, imports: string[]): string {
+  const exercise = {
+    language,
+    imports,
+    tests: [{ id: 't1', label: 'Suma', expression: 'Suma(1, 1) == 2', why: 'x', failure: 'y' }],
+    prediction: { options: ['1', '2'], answer: 1 },
+    starter: 'func Suma(a, b int) int { return 0 }',
+  };
+  return exerciseHashes(exercise as JsonRecord).gradingHash;
+}
+assert.equal(
+  grade('go', ['strings', 'errors', 'strings']),
+  WITH_IMPORTS,
+  'sorted and without repeats',
+);
+assert.equal(
+  grade('go', ['errors', 'strings']),
+  WITH_IMPORTS,
+  'reordering is not a grading change',
+);
+assert.equal(grade('go', []), WITHOUT_IMPORTS, 'a Go exercise without imports keeps its hash');
+assert.equal(grade('rust', ['strings']), WITHOUT_IMPORTS, 'Rust has no imports in its harness');
+
 console.log(
-  `curriculum-meta-check: ${parts.length} portions, ${exercises.length} exercises and ${Object.values(meta.workshopSteps).flat().length} stages with their fingerprint and key PASS.`,
+  `curriculum-meta-check: ${parts.length} portions plus the harness, ${exercises.length} exercises and ${Object.values(meta.workshopSteps).flat().length} stages with their fingerprint and key PASS.`,
 );
--- a/qa/run-checks.ts
+++ b/qa/run-checks.ts
@@ -5,6 +5,7 @@
   'build-check.ts',
   'load-order-check.ts',
   'content-tools-check.ts',
+  'content-harness-check.ts',
   'content-exercises-check.ts',
   'content-records-check.ts',
   'content-guide-check.ts',
```

`qa/run-checks.ts` suma `content-harness-check.ts` a la lista de `npm test`. El texto que dice «hasta B2» en `README.md` (la línea de «Una prueba quitada de un ejercicio no puede volver…») lo cambia T021.

## 2. `tools/content/harness.ts` (nuevo)

```ts
// The harness templates (ADR 0005 §4, B2 FR-035): one text per language that wraps the student's
// code and prints the evidence. The grammar is shared with the PHP renderer and with A4's
// preview, and qa/fixtures/shared/harness-cases.json is its contract.
import { LANGUAGES, type Language } from './catalogs.ts';
import { fail, type Place } from './content-error.ts';
import { readContentText } from './yaml-file.ts';

export type HarnessTemplates = Record<Language, string>;

type Section = 'tests' | 'imports';
type Marker = 'code' | 'count' | 'nonce' | 'tests' | 'imports';

interface Scan {
  open: Section | null;
  bodyLines: number;
  seen: Record<Marker, number>;
}

const FILES: Record<Language, string> = {
  rust: 'content/harness/rust.tpl',
  go: 'content/harness/go.tpl',
};
const OUTSIDE = ['code', 'nonce', 'count'];
const INSIDE: Record<Section, string[]> = {
  tests: ['nonce', 'id', 'expression'],
  imports: ['name'],
};
const SECTION_LINE = /^\{\{([#/])(tests|imports)\}\}$/;
const TOKEN = /\{\{([#/]?)([A-Za-z]+)\}\}/g;

function line(file: string, number: number): Place {
  return { file, path: `línea ${number}` };
}

function openSection(name: Section, place: Place, scan: Scan): void {
  if (scan.open !== null)
    fail(place, `la sección ${scan.open} sigue abierta: las secciones no se anidan`);
  if (scan.seen[name] > 0) fail(place, `la sección ${name} aparece más de una vez`);
  scan.seen[name]++;
  scan.open = name;
  scan.bodyLines = 0;
}

function closeSection(name: Section, place: Place, scan: Scan): void {
  if (scan.open !== name) fail(place, `{{/${name}}} cierra una sección que no está abierta`);
  if (scan.bodyLines === 0) fail(place, `la sección ${name} está vacía`);
  scan.open = null;
}

function readPlaceholders(text: string, place: Place, scan: Scan): void {
  for (const [token, mark, name] of text.matchAll(TOKEN)) {
    if (mark !== '') fail(place, `${token}: las etiquetas de sección van solas en su línea`);
    const allowed = scan.open === null ? OUTSIDE : INSIDE[scan.open];
    if (!allowed.includes(name)) {
      const where =
        scan.open === null ? 'fuera de las secciones' : `dentro de la sección ${scan.open}`;
      const valid = allowed.map((valid) => `{{${valid}}}`).join(', ');
      fail(place, `${token}: marcador desconocido ${where}; los válidos son ${valid}`);
    }
    if (scan.open === null) scan.seen[name as Marker]++;
  }
}

function checkTotals(file: string, language: Language, scan: Scan): void {
  const whole = { file, path: '' };
  const { seen } = scan;
  if (scan.open !== null) fail(whole, `la sección ${scan.open} no se cierra`);
  if (seen.code !== 1)
    fail(whole, `{{code}} tiene que aparecer una sola vez y aparece ${seen.code}`);
  if (seen.nonce < 1)
    fail(whole, 'falta {{nonce}} fuera de las secciones: el centinela lleva el nonce');
  if (seen.count !== 1)
    fail(whole, `{{count}} tiene que aparecer una sola vez y aparece ${seen.count}`);
  if (seen.tests !== 1) fail(whole, 'falta la sección {{#tests}} … {{/tests}}');
  if (language === 'go' && seen.imports !== 1)
    fail(whole, 'falta la sección {{#imports}} … {{/imports}}');
  if (language !== 'go' && seen.imports !== 0) fail(whole, 'sólo Go tiene la sección {{#imports}}');
}

// Validates the grammar: tags alone on their line, known placeholders in the right place, one
// `code`, one `tests` section and, only in Go, one `imports` section.
function checkTemplate(text: string, language: Language): void {
  const file = FILES[language];
  const whole = { file, path: '' };
  if (text.includes('\r')) fail(whole, 'tiene que usar saltos de línea LF');
  if (!text.endsWith('\n') || text.endsWith('\n\n')) {
    fail(whole, 'tiene que terminar con un solo salto de línea');
  }
  const scan: Scan = {
    open: null,
    bodyLines: 0,
    seen: { code: 0, count: 0, nonce: 0, tests: 0, imports: 0 },
  };
  text
    .slice(0, -1)
    .split('\n')
    .forEach((content, index) => {
      const place = line(file, index + 1);
      const tag = SECTION_LINE.exec(content);
      if (tag === null) {
        if (scan.open !== null) scan.bodyLines++;
        readPlaceholders(content, place, scan);
      } else if (tag[1] === '#') {
        openSection(tag[2] as Section, place, scan);
      } else {
        closeSection(tag[2] as Section, place, scan);
      }
    });
  checkTotals(file, language, scan);
}

export function loadHarness(root: string): HarnessTemplates {
  const templates = {} as HarnessTemplates;
  for (const language of LANGUAGES) {
    const text = readContentText(root, FILES[language]);
    checkTemplate(text, language);
    templates[language] = text;
  }
  return templates;
}

// The exact bytes of the 18th portion, and what its hash covers.
export function harnessBody(templates: HarnessTemplates): string {
  return JSON.stringify(
    Object.fromEntries(LANGUAGES.map((language) => [language, templates[language]])),
  );
}
```

## 3. `qa/content-harness-check.ts` (nuevo)

```ts
// B2 FR-035 (ADR 0005 §4): the harness templates are content. The generator validates their grammar
// and publishes them as the 18th portion; the shared fixture (qa/fixtures/shared/harness-cases.json)
// is the contract for how they render.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { harnessBody, loadHarness } from '../tools/content/harness.ts';
import { fixture, scenarios, throwsContent } from './lib/content-fixtures.ts';

const repo = join(import.meta.dirname, '..');
const RUST = readFileSync(join(repo, 'content/harness/rust.tpl'), 'utf8');
const GO = readFileSync(join(repo, 'content/harness/go.tpl'), 'utf8');
const RUST_FILE = 'content/harness/rust.tpl';
const GO_FILE = 'content/harness/go.tpl';

function root(rust = RUST, go = GO): string {
  return fixture({ [RUST_FILE]: rust, [GO_FILE]: go });
}

const { test, done } = scenarios('content-harness');

test('the real templates load, one per language, and the body is their compact JSON', () => {
  const templates = loadHarness(repo);
  assert.deepEqual(Object.keys(templates), ['rust', 'go']);
  assert.equal(harnessBody(templates), JSON.stringify({ rust: RUST, go: GO }));
  assert.ok(harnessBody(templates).startsWith('{"rust":"'));
});

test('a missing template names its file', () => {
  const missing = fixture({ [RUST_FILE]: RUST });
  throwsContent(() => loadHarness(missing), `${GO_FILE}: no existe`);
});

test('the grammar: line endings, final newline, placeholders and sections', () => {
  const cases: [string, string, string][] = [
    [RUST_FILE, RUST.replaceAll('\n', '\r\n'), `${RUST_FILE}: tiene que usar saltos de línea LF`],
    [RUST_FILE, RUST.trimEnd(), `${RUST_FILE}: tiene que terminar con un solo salto de línea`],
    [RUST_FILE, `${RUST}\n`, `${RUST_FILE}: tiene que terminar con un solo salto de línea`],
    [
      RUST_FILE,
      RUST.replace('{{code}}', 'fn x() {}'),
      `${RUST_FILE}: {{code}} tiene que aparecer una sola vez y aparece 0`,
    ],
    [
      RUST_FILE,
      RUST.replace('fn main', '{{code}}\nfn main'),
      `${RUST_FILE}: {{code}} tiene que aparecer una sola vez y aparece 2`,
    ],
    [
      RUST_FILE,
      RUST.replace('fn main', '{{otro}}\nfn main'),
      `${RUST_FILE}: línea 3: {{otro}}: marcador desconocido fuera de las secciones; los válidos son {{code}}, {{nonce}}, {{count}}`,
    ],
    [
      RUST_FILE,
      RUST.replace('fn main', '{{id}}\nfn main'),
      `${RUST_FILE}: línea 3: {{id}}: marcador desconocido fuera de las secciones; los válidos son {{code}}, {{nonce}}, {{count}}`,
    ],
    [
      RUST_FILE,
      RUST.replace('{{expression}}', '{{name}}'),
      `${RUST_FILE}: línea 6: {{name}}: marcador desconocido dentro de la sección tests; los válidos son {{nonce}}, {{id}}, {{expression}}`,
    ],
    [
      RUST_FILE,
      RUST.replace('fn main', 'x {{#tests}}\nfn main'),
      `${RUST_FILE}: línea 3: {{#tests}}: las etiquetas de sección van solas en su línea`,
    ],
    [
      RUST_FILE,
      RUST.replace('{{/tests}}\n    println!("__TALLER_END__{{nonce}}:{{count}}");\n', ''),
      `${RUST_FILE}: la sección tests no se cierra`,
    ],
    [
      RUST_FILE,
      RUST.replace('{{#tests}}', '{{/tests}}\n{{#tests}}'),
      `${RUST_FILE}: línea 5: {{/tests}} cierra una sección que no está abierta`,
    ],
    [
      RUST_FILE,
      RUST.replace('{{#tests}}\n', '{{#tests}}\n{{#imports}}\n'),
      `${RUST_FILE}: línea 6: la sección tests sigue abierta: las secciones no se anidan`,
    ],
    [
      RUST_FILE,
      RUST.replace('{{#tests}}\n', '{{#tests}}\n{{/tests}}\n{{#tests}}\n'),
      `${RUST_FILE}: línea 6: la sección tests está vacía`,
    ],
    [
      RUST_FILE,
      RUST.replace('{{/tests}}', '{{/tests}}\n{{#tests}}\n    x\n{{/tests}}'),
      `${RUST_FILE}: línea 9: la sección tests aparece más de una vez`,
    ],
    [
      RUST_FILE,
      RUST.replaceAll('{{nonce}}', 'N'),
      `${RUST_FILE}: falta {{nonce}} fuera de las secciones: el centinela lleva el nonce`,
    ],
    [
      RUST_FILE,
      RUST.replace('{{count}}', '3'),
      `${RUST_FILE}: {{count}} tiene que aparecer una sola vez y aparece 0`,
    ],
    [
      RUST_FILE,
      RUST.replace('{{#tests}}', '{{#imports}}\n    "x"\n{{/imports}}\n{{#tests}}'),
      `${RUST_FILE}: sólo Go tiene la sección {{#imports}}`,
    ],
    [
      GO_FILE,
      GO.replace(/\{\{#imports\}\}\n.*\n\{\{\/imports\}\}\n/, ''),
      `${GO_FILE}: falta la sección {{#imports}} … {{/imports}}`,
    ],
  ];
  for (const [file, text, message] of cases) {
    const files = file === RUST_FILE ? root(text) : root(RUST, text);
    throwsContent(() => loadHarness(files), message);
  }
});

done();
```

## 4. `qa/fixtures/shared/harness-cases.json` (nuevo)

Los textos esperados están escritos a mano y son independientes de los dos renderizadores (R2). Once casos: ver la tabla de [contracts/harness-template.md](./contracts/harness-template.md).

```json
{
  "nonce": "0123456789abcdef0123456789abcdef",
  "cases": [
    {
      "name": "rust: two tests",
      "language": "rust",
      "code": "fn doble(n: i32) -> i32 {\n    n * 2\n}",
      "tests": [
        {
          "id": "t1",
          "expression": "doble(2) == 4"
        },
        {
          "id": "t2",
          "expression": "doble(0) == 0"
        }
      ],
      "program": [
        "fn doble(n: i32) -> i32 {",
        "    n * 2",
        "}",
        "",
        "fn main() {",
        "    std::panic::set_hook(Box::new(|_| {}));",
        "    let passed = std::panic::catch_unwind(|| { doble(2) == 4 }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:t1:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    let passed = std::panic::catch_unwind(|| { doble(0) == 0 }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:t2:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    println!(\"__TALLER_END__0123456789abcdef0123456789abcdef:2\");",
        "}"
      ]
    },
    {
      "name": "rust: a custom test is trimmed of spaces, tabs and line breaks, comes last and counts in the sentinel",
      "language": "rust",
      "code": "fn doble(n: i32) -> i32 { n * 2 }",
      "tests": [
        {
          "id": "t1",
          "expression": "doble(2) == 4"
        }
      ],
      "customTest": "\t  doble(5) == 10\r\n",
      "program": [
        "fn doble(n: i32) -> i32 { n * 2 }",
        "",
        "fn main() {",
        "    std::panic::set_hook(Box::new(|_| {}));",
        "    let passed = std::panic::catch_unwind(|| { doble(2) == 4 }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:t1:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    let passed = std::panic::catch_unwind(|| { doble(5) == 10 }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:custom:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    println!(\"__TALLER_END__0123456789abcdef0123456789abcdef:2\");",
        "}"
      ]
    },
    {
      "name": "rust: a custom test of only whitespace is ignored",
      "language": "rust",
      "code": "fn uno() -> i32 { 1 }",
      "tests": [
        {
          "id": "t1",
          "expression": "uno() == 1"
        }
      ],
      "customTest": " \n\t ",
      "program": [
        "fn uno() -> i32 { 1 }",
        "",
        "fn main() {",
        "    std::panic::set_hook(Box::new(|_| {}));",
        "    let passed = std::panic::catch_unwind(|| { uno() == 1 }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:t1:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    println!(\"__TALLER_END__0123456789abcdef0123456789abcdef:1\");",
        "}"
      ]
    },
    {
      "name": "rust: only ASCII whitespace is trimmed from the custom test",
      "language": "rust",
      "code": "fn uno() -> i32 { 1 }",
      "tests": [
        {
          "id": "t1",
          "expression": "uno() == 1"
        }
      ],
      "customTest": " uno() == 1 ",
      "program": [
        "fn uno() -> i32 { 1 }",
        "",
        "fn main() {",
        "    std::panic::set_hook(Box::new(|_| {}));",
        "    let passed = std::panic::catch_unwind(|| { uno() == 1 }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:t1:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    let passed = std::panic::catch_unwind(|| {  uno() == 1  }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:custom:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    println!(\"__TALLER_END__0123456789abcdef0123456789abcdef:2\");",
        "}"
      ]
    },
    {
      "name": "rust: placeholders inside the student's values are not expanded",
      "language": "rust",
      "code": "fn marca() -> String {\n    format!(\"{{id}} {{code}} {{nonce}}\")\n}",
      "tests": [
        {
          "id": "t1",
          "expression": "marca() == \"{id} {code} {nonce}\""
        }
      ],
      "program": [
        "fn marca() -> String {",
        "    format!(\"{{id}} {{code}} {{nonce}}\")",
        "}",
        "",
        "fn main() {",
        "    std::panic::set_hook(Box::new(|_| {}));",
        "    let passed = std::panic::catch_unwind(|| { marca() == \"{id} {code} {nonce}\" }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:t1:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    println!(\"__TALLER_END__0123456789abcdef0123456789abcdef:1\");",
        "}"
      ]
    },
    {
      "name": "rust: code that ends with a newline and an expression of two lines",
      "language": "rust",
      "code": "fn verdad() -> bool { true }\n",
      "tests": [
        {
          "id": "t1",
          "expression": "let x = verdad();\n    x"
        }
      ],
      "program": [
        "fn verdad() -> bool { true }",
        "",
        "",
        "fn main() {",
        "    std::panic::set_hook(Box::new(|_| {}));",
        "    let passed = std::panic::catch_unwind(|| { let x = verdad();",
        "    x }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:t1:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    println!(\"__TALLER_END__0123456789abcdef0123456789abcdef:1\");",
        "}"
      ]
    },
    {
      "name": "rust: test keys that are not t1 to t3 go through as they are",
      "language": "rust",
      "code": "fn dos() -> i32 { 2 }",
      "tests": [
        {
          "id": "base",
          "expression": "dos() == 2"
        },
        {
          "id": "t7",
          "expression": "dos() > 1"
        },
        {
          "id": "con_guion_2",
          "expression": "dos() < 3"
        }
      ],
      "program": [
        "fn dos() -> i32 { 2 }",
        "",
        "fn main() {",
        "    std::panic::set_hook(Box::new(|_| {}));",
        "    let passed = std::panic::catch_unwind(|| { dos() == 2 }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:base:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    let passed = std::panic::catch_unwind(|| { dos() > 1 }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:t7:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    let passed = std::panic::catch_unwind(|| { dos() < 3 }).unwrap_or(false);",
        "    println!(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:con_guion_2:{}\", if passed { \"PASS\" } else { \"FAIL\" });",
        "    println!(\"__TALLER_END__0123456789abcdef0123456789abcdef:3\");",
        "}"
      ]
    },
    {
      "name": "go: without imports only fmt is imported",
      "language": "go",
      "code": "func Doble(n int) int {\n    return n * 2\n}",
      "tests": [
        {
          "id": "t1",
          "expression": "Doble(2) == 4"
        }
      ],
      "program": [
        "package main",
        "",
        "import (",
        "    \"fmt\"",
        ")",
        "",
        "func Doble(n int) int {",
        "    return n * 2",
        "}",
        "",
        "func __tallerCheck(id string, test func() bool) {",
        "    passed := false",
        "    func() {",
        "        defer func() { _ = recover() }()",
        "        passed = test()",
        "    }()",
        "    if passed {",
        "        fmt.Println(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:\" + id + \":PASS\")",
        "    } else {",
        "        fmt.Println(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:\" + id + \":FAIL\")",
        "    }",
        "}",
        "",
        "func main() {",
        "    __tallerCheck(\"t1\", func() bool { return Doble(2) == 4 })",
        "    fmt.Println(\"__TALLER_END__0123456789abcdef0123456789abcdef:1\")",
        "}"
      ]
    },
    {
      "name": "go: the imports of the exercise follow fmt, in order",
      "language": "go",
      "code": "func Ordenar(xs []string) []string {\n    sort.Strings(xs)\n    return xs\n}",
      "tests": [
        {
          "id": "t1",
          "expression": "strings.Join(Ordenar([]string{\"b\", \"a\"}), \"\") == \"ab\""
        }
      ],
      "imports": ["sort", "strings"],
      "program": [
        "package main",
        "",
        "import (",
        "    \"fmt\"",
        "    \"sort\"",
        "    \"strings\"",
        ")",
        "",
        "func Ordenar(xs []string) []string {",
        "    sort.Strings(xs)",
        "    return xs",
        "}",
        "",
        "func __tallerCheck(id string, test func() bool) {",
        "    passed := false",
        "    func() {",
        "        defer func() { _ = recover() }()",
        "        passed = test()",
        "    }()",
        "    if passed {",
        "        fmt.Println(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:\" + id + \":PASS\")",
        "    } else {",
        "        fmt.Println(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:\" + id + \":FAIL\")",
        "    }",
        "}",
        "",
        "func main() {",
        "    __tallerCheck(\"t1\", func() bool { return strings.Join(Ordenar([]string{\"b\", \"a\"}), \"\") == \"ab\" })",
        "    fmt.Println(\"__TALLER_END__0123456789abcdef0123456789abcdef:1\")",
        "}"
      ]
    },
    {
      "name": "go: fmt and repeated imports are dropped and the first appearance decides the order",
      "language": "go",
      "code": "func Uno() int { return 1 }",
      "tests": [
        {
          "id": "t1",
          "expression": "Uno() == 1"
        }
      ],
      "imports": ["strings", "fmt", "strings", "sort", "sort"],
      "program": [
        "package main",
        "",
        "import (",
        "    \"fmt\"",
        "    \"strings\"",
        "    \"sort\"",
        ")",
        "",
        "func Uno() int { return 1 }",
        "",
        "func __tallerCheck(id string, test func() bool) {",
        "    passed := false",
        "    func() {",
        "        defer func() { _ = recover() }()",
        "        passed = test()",
        "    }()",
        "    if passed {",
        "        fmt.Println(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:\" + id + \":PASS\")",
        "    } else {",
        "        fmt.Println(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:\" + id + \":FAIL\")",
        "    }",
        "}",
        "",
        "func main() {",
        "    __tallerCheck(\"t1\", func() bool { return Uno() == 1 })",
        "    fmt.Println(\"__TALLER_END__0123456789abcdef0123456789abcdef:1\")",
        "}"
      ]
    },
    {
      "name": "go: three tests, a custom test and an import",
      "language": "go",
      "code": "func Duplicar(n int) (int, error) {\n    if n < 0 {\n        return 0, errors.New(\"negativo\")\n    }\n    return n * 2, nil\n}",
      "tests": [
        {
          "id": "t1",
          "expression": "first(Duplicar(2)) == 4"
        },
        {
          "id": "t2",
          "expression": "first(Duplicar(0)) == 0"
        },
        {
          "id": "t3",
          "expression": "second(Duplicar(-1)) != nil"
        }
      ],
      "customTest": "first(Duplicar(3)) == 6",
      "imports": ["errors"],
      "program": [
        "package main",
        "",
        "import (",
        "    \"fmt\"",
        "    \"errors\"",
        ")",
        "",
        "func Duplicar(n int) (int, error) {",
        "    if n < 0 {",
        "        return 0, errors.New(\"negativo\")",
        "    }",
        "    return n * 2, nil",
        "}",
        "",
        "func __tallerCheck(id string, test func() bool) {",
        "    passed := false",
        "    func() {",
        "        defer func() { _ = recover() }()",
        "        passed = test()",
        "    }()",
        "    if passed {",
        "        fmt.Println(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:\" + id + \":PASS\")",
        "    } else {",
        "        fmt.Println(\"__TALLER_TEST__0123456789abcdef0123456789abcdef:\" + id + \":FAIL\")",
        "    }",
        "}",
        "",
        "func main() {",
        "    __tallerCheck(\"t1\", func() bool { return first(Duplicar(2)) == 4 })",
        "    __tallerCheck(\"t2\", func() bool { return first(Duplicar(0)) == 0 })",
        "    __tallerCheck(\"t3\", func() bool { return second(Duplicar(-1)) != nil })",
        "    __tallerCheck(\"custom\", func() bool { return first(Duplicar(3)) == 6 })",
        "    fmt.Println(\"__TALLER_END__0123456789abcdef0123456789abcdef:4\")",
        "}"
      ]
    }
  ]
}
```
