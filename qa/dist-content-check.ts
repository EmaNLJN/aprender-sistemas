import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { createBootHarness, describeError } from './lib/boot-harness.ts';
import { evaluateBuiltPage, readBuiltContent, readBuiltPage } from './lib/built-page.ts';
import { curriculumMeta } from './lib/content-document.ts';
import { createContentServer } from './lib/content-server.ts';
import { repoRoot } from './lib/sources.ts';
import { portionsOf, sha256Hex } from '../tools/content/meta.ts';

const VM_MODULES_FLAGS = ['--experimental-vm-modules', '--disable-warning=ExperimentalWarning'];
const DATA_GLOBAL = /^(GUIDE_DATA|RUST_|GO_|SYSTEMS_)/;

if (vm.SourceTextModule === undefined) {
  const relaunched = spawnSync(
    process.execPath,
    [...VM_MODULES_FLAGS, ...process.execArgv, ...process.argv.slice(1)],
    { stdio: 'inherit' },
  );
  process.exit(relaunched.status ?? 1);
}

function dataGlobalsOf(globals: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const name of Object.keys(globals).sort()) {
    if (DATA_GLOBAL.test(name)) picked[name] = globals[name];
  }
  return picked;
}

function canonical(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === 'function' ? '[function]' : item,
    ),
  );
}

function oracleGlobals(): Record<string, unknown> {
  const dump = execFileSync(process.execPath, ['tools/content/dump-globals.ts', repoRoot], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  });
  return dataGlobalsOf((JSON.parse(dump) as { globals: Record<string, unknown> }).globals);
}

const meta = curriculumMeta();
const builtContent = readBuiltContent();
const server = createContentServer();
const harness = createBootHarness({ fetch: server.fetch });
const page = readBuiltPage();
assert.equal(page.scripts.length, 1, 'dist/index.html debe tener un solo script de arranque');

await evaluateBuiltPage(page, harness.context);
await harness.flush();

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try {
    run();
    passed++;
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failed++;
    process.stderr.write(`FAIL ${name}\n${describeError(error)}\n`);
  }
}

test('the bundle boots without errors', () => {
  assert.deepEqual(harness.errors, []);
});

test('the bundle publishes the content once and asks for the file once', () => {
  assert.equal(harness.published.length, 1);
  assert.deepEqual(server.requests, [`/content/${builtContent.fileName}`]);
});

test('the served file has the generator bytes (documentHash)', () => {
  assert.equal(sha256Hex(builtContent.bytes.toString('utf8')), meta.documentHash);
});

test('the published content has the 17 portions of the generator', () => {
  const published = harness.published[0]?.content as Parameters<typeof portionsOf>[0];
  const actual: Record<string, string> = {};
  for (const [name, portion] of Object.entries(portionsOf(published))) {
    actual[name] = sha256Hex(JSON.stringify(portion));
  }
  // B2 FR-035: the harness templates are the 18th portion of the meta and travel outside curriculum.json.
  const curriculumPortions = Object.fromEntries(
    Object.entries(meta.portions).filter(([name]) => name !== 'harness'),
  );
  assert.equal(Object.keys(actual).length, 17);
  assert.deepEqual(actual, curriculumPortions);
});

test('the globals of the bundle equal the dump-globals oracle', () => {
  const published = dataGlobalsOf(harness.context);
  assert.notDeepEqual(Object.keys(published), []);
  assert.deepEqual(canonical(published), oracleGlobals());
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exitCode = 1;
