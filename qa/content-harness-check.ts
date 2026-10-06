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
