/* Production ZIP roundtrip + optional real Cargo/Go tests in disposable containers.
 * node qa/project-kit-check.ts --docker --write-report
 * --partial allows only domains whose metadata is already available during authoring.
 * --only=pc recompiles PC plus every changed/unverified kit; unchanged exact hashes
 * retain their earlier compiler evidence. ZIP/artifact checks still cover every kit.
 * --changed recompiles only changed/unverified kits, with no forced workshop.
 * This script never pulls images, opens ports, or mounts the application workspace.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import {
  SYSTEMS_DOMAINS,
  loadLab,
  loadLabExercises,
  loadSystemsDomain,
  systemsDomainSources,
} from './lib/legacy-sources.ts';
import { bundleSource, repoRoot as root, runSource } from './lib/sources.ts';

type Language = 'rust' | 'go';
interface TestCase {
  id: string;
  label: string;
  expression: string;
  why: string;
}
interface Exercise {
  id: string;
  language: Language;
  objective: string;
  instructions: string[];
  why: string;
  starter: string;
  solution: string;
  imports: string[];
  tests: TestCase[];
}
interface WorkshopStep {
  title: string;
  task: string;
  why: string;
  done: string;
}
interface Workshop {
  id: string;
  title: string;
  code: Record<string, string>;
  steps: WorkshopStep[];
  limits: string;
  bridge: Record<string, string>;
  sources: { title: string; url: string }[];
  progress: { note: string };
}
function projectKit(ctx: FakeContext): ProjectKitApi {
  const api = ctx.window.TallerProjectKit;
  if (!api) throw new Error('TallerProjectKit was not published by register-project-kit.ts');
  return api;
}
interface Draft {
  draft?: string;
  customTest?: string;
}
interface Kit {
  name: string;
  files: Record<string, string>;
}
interface Archive {
  name: string;
  bytes: Uint8Array;
}
interface ProjectKitApi {
  files(workshop: Workshop, language: string, options?: { solution?: boolean }): Kit;
  archive(workshop: Workshop, language: string, options?: { solution?: boolean }): Archive;
}
interface LabApi {
  getExercises(): Exercise[];
  exportState?(): unknown;
}
interface BrowserWindow {
  TallerLab?: LabApi;
  TallerProjectKit?: ProjectKitApi;
  [global: string]: unknown;
}
interface FakeContext {
  window: BrowserWindow;
  [name: string]: unknown;
}
interface Prepared {
  kit: Kit;
  language: Language;
  workshop: string;
  exercise?: string;
  kind: string;
  expectedTests: number;
}
interface Evidence {
  checkedAt?: string;
  filesSHA256: string;
  testsPassed: number;
  image?: string;
  imageID: string;
  repoDigests?: string[];
  toolchain: string;
  output?: string;
  method?: string;
  poisonedReferenceTextExcluded?: boolean;
}
interface KitRow {
  name: string;
  language: Language;
  workshop: string;
  exercise: string | null;
  kind: string;
  expectedTests: number;
  filesSHA256: string;
  compiled: boolean;
  compileThisRun: boolean;
  verification: string;
  evidence?: Evidence;
}
interface ContainerReport {
  image?: string;
  imageID?: string;
  repoDigests?: string[];
  network?: string;
  portsPublished?: boolean;
  toolchain?: string;
  milliseconds?: number;
  exitCode?: number | null;
  testsPassed?: number;
}
interface Report {
  checkedAt: string;
  partial: boolean;
  bundleSHA256: string;
  sourceSHA256: string;
  checks: { name: string; passed: boolean; error?: string }[];
  kits: KitRow[];
  containers: Partial<Record<Language, ContainerReport>>;
  officialImageSources: string[];
  schemaVersion?: number;
  selection?: {
    requestedWorkshop: string | null;
    policy: string;
    reusedExactHashes?: number;
    projectsToCompile?: number;
  };
  previousManifestSHA256?: string;
  previousCheckedAt?: string;
  compilerHistory?: unknown[];
  workshops?: number;
  exerciseRegistry?: number;
  temporaryDirectory?: string;
  passedChecks?: number;
  failedChecks?: number;
  referenceKitsCompiled?: number;
  referenceTestsVerified?: number;
  referenceKitsCompiledThisRun?: number;
  referenceKitsReused?: number;
  fullReferenceValidation?: boolean;
}
type PriorKit = Omit<KitRow, 'compileThisRun' | 'verification'> &
  Partial<Pick<KitRow, 'compileThisRun' | 'verification'>>;
interface PriorReport {
  checkedAt: string;
  failedChecks: number;
  fullReferenceValidation: boolean;
  kits: PriorKit[];
  containers: Partial<Record<string, ContainerReport>>;
  temporaryDirectory: string;
  bundleSHA256?: string;
  sourceSHA256?: string;
  compilerHistory?: unknown[];
  referenceKitsCompiled?: number;
}
interface RealCatalog {
  ctx: FakeContext;
  workshops: Workshop[];
  exercises: Exercise[];
}
const partial = process.argv.includes('--partial'),
  useDocker = process.argv.includes('--docker');
const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length) || null;
const incremental = Boolean(only) || process.argv.includes('--changed');
const reportPath = path.join(import.meta.dirname, 'project-kit-validation.json');
const previousText =
  incremental && fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : null;
const previous: PriorReport | null = previousText ? JSON.parse(previousText) : null;
const IMAGE: Record<Language, string> = { rust: 'rust:1.90-alpine', go: 'golang:1.25-alpine' };
const digest = (data: string | Uint8Array): string =>
  crypto.createHash('sha256').update(data).digest('hex');
const ADAPTER = 'frontend/src/app/legacy/register-project-kit.ts';
const KIT_SOURCES = [
  ADAPTER,
  'frontend/src/features/download-project-kit/index.ts',
  'frontend/src/features/download-project-kit/lib/archive.ts',
  'frontend/src/features/download-project-kit/model/kit-files.ts',
  'frontend/src/shared/lib/download-file.ts',
].sort();
const bundle = bundleSource(ADAPTER, { minify: true });
const report: Report = {
  checkedAt: new Date().toISOString(),
  partial,
  bundleSHA256: digest(bundle),
  sourceSHA256: digest(
    Buffer.concat(KIT_SOURCES.map((file) => fs.readFileSync(path.join(root, file)))),
  ),
  checks: [],
  kits: [],
  containers: {},
  officialImageSources: ['https://hub.docker.com/_/rust', 'https://hub.docker.com/_/golang'],
};
report.schemaVersion = 2;
const selection: NonNullable<Report['selection']> = {
  requestedWorkshop: only,
  policy: incremental
    ? only
      ? 'Requested workshop plus every kit without matching complete prior evidence'
      : 'Every kit without matching complete prior evidence'
    : 'Compile every kit',
};
report.selection = selection;
if (previous && previousText) {
  report.previousManifestSHA256 = digest(previousText);
  report.previousCheckedAt = previous.checkedAt;
  report.compilerHistory = [
    ...(previous.compilerHistory || []),
    {
      checkedAt: previous.checkedAt,
      bundleSHA256: previous.bundleSHA256,
      sourceSHA256: previous.sourceSHA256,
      containers: previous.containers,
      temporaryDirectory: previous.temporaryDirectory,
      referenceKitsCompiled: previous.referenceKitsCompiled,
      fullReferenceValidation: previous.fullReferenceValidation,
    },
  ];
}
let passed = 0,
  failed = 0;
function check(name: string, run: () => void): void {
  try {
    run();
    passed++;
    report.checks.push({ name, passed: true });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failed++;
    const failure = error instanceof Error ? error : new Error(String(error));
    report.checks.push({ name, passed: false, error: failure.message });
    process.stderr.write(`FAIL ${name}\n${failure.stack}\n`);
  }
}
function context(): FakeContext {
  const context: FakeContext = {
    window: {},
    Uint8Array,
    Uint16Array,
    Int32Array,
    TextEncoder,
    TextDecoder,
    localStorage: { getItem: () => null, setItem() {} },
  };
  vm.createContext(context);
  return context;
}

// Independent ZIP reader: central directory, inflateRaw from Node, and CRC-32.
// It deliberately does not use fflate to decode a ZIP produced by fflate.
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function unzip(bytes: Uint8Array): Map<string, string> {
  const zip = Buffer.from(bytes);
  let end = -1;
  for (let at = zip.length - 22; at >= Math.max(0, zip.length - 65557); at--) {
    if (zip.readUInt32LE(at) === 0x06054b50) {
      end = at;
      break;
    }
  }
  assert(end >= 0, 'Missing ZIP end-of-central-directory');
  assert.equal(zip.readUInt16LE(end + 4), 0);
  assert.equal(zip.readUInt16LE(end + 6), 0);
  const count = zip.readUInt16LE(end + 10),
    centralBytes = zip.readUInt32LE(end + 12);
  let at = zip.readUInt32LE(end + 16);
  const centralStart = at,
    files = new Map<string, string>();
  for (let entry = 0; entry < count; entry++) {
    assert.equal(zip.readUInt32LE(at), 0x02014b50, 'Invalid central directory header');
    const flags = zip.readUInt16LE(at + 8),
      method = zip.readUInt16LE(at + 10),
      crc = zip.readUInt32LE(at + 16);
    const compressed = zip.readUInt32LE(at + 20),
      uncompressed = zip.readUInt32LE(at + 24);
    const nameLength = zip.readUInt16LE(at + 28),
      extraLength = zip.readUInt16LE(at + 30),
      commentLength = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42),
      name = zip.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    assert.equal(flags & 1, 0, 'Archive unexpectedly encrypted');
    assert(
      !name.startsWith('/') && !name.split('/').includes('..') && !name.includes('\\'),
      'Unsafe ZIP path',
    );
    assert(!files.has(name), 'Duplicate ZIP path');
    assert.equal(zip.readUInt32LE(local), 0x04034b50);
    const payload = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const packed = zip.subarray(payload, payload + compressed);
    assert.equal(packed.length, compressed, 'Truncated ZIP payload');
    assert([0, 8].includes(method), 'Unexpected compression method');
    const raw = method === 0 ? packed : zlib.inflateRawSync(packed);
    assert.equal(raw.length, uncompressed, 'ZIP size mismatch');
    assert.equal(crc32(raw), crc, 'ZIP CRC mismatch');
    files.set(name, raw.toString('utf8'));
    at += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(at - centralStart, centralBytes);
  return files;
}
function roundtrip(kit: Kit, archive: Archive): Map<string, string> {
  assert.equal(archive.name, `${kit.name}.zip`);
  const restored = unzip(archive.bytes),
    expected = Object.entries(kit.files);
  assert.equal(restored.size, expected.length);
  for (const [file, text] of expected)
    assert.equal(restored.get(`${kit.name}/${file}`), text, `${kit.name}/${file}`);
  return restored;
}
function fixture(): {
  workshop: Workshop;
  exercises: Exercise[];
  records: Record<string, Draft>;
} {
  const workshop: Workshop = {
    id: 'fixture',
    title: 'Kit ñ · Unicode λ',
    code: { rust: 'rust-901', go: 'go-901' },
    steps: Array.from({ length: 4 }, (_, i) => ({
      title: `Etapa ${i + 1}`,
      task: 'Implementá una variante.',
      why: 'Probá una hipótesis.',
      done: 'Existe evidencia concreta.',
    })),
    limits: 'Este kit prueba un núcleo, no un sistema completo.',
    bridge: { rust: 'Cargo local.', go: 'Módulo Go local.' },
    sources: [{ title: 'Rust Book', url: 'https://doc.rust-lang.org/book/' }],
    progress: { note: 'Conservar mi próxima hipótesis: áéíóú.' },
  };
  const shared = {
    objective: 'Duplicar enteros pequeños.',
    instructions: ['Implementá el cálculo.', 'Probá los bordes.'],
    why: 'Los tests describen el contrato.',
  };
  const rust: Exercise = {
    ...shared,
    id: 'rust-901',
    language: 'rust',
    starter: 'fn doble(n:i32)->i32 { todo!() }',
    solution: 'fn doble(n:i32)->i32 { n+n }',
    imports: [],
    tests: [0, 3, -2].map((n, i) => ({
      id: `t${i + 1}`,
      label: `Entrada ${n}`,
      expression: `doble(${n}) == ${n * 2}`,
      why: `Comprueba ${n}.`,
    })),
  };
  const go: Exercise = {
    ...shared,
    id: 'go-901',
    language: 'go',
    starter: 'func Doble(n int) int { return 0 }',
    solution: 'func Doble(n int) int { return n+n }',
    imports: [],
    tests: [0, 3, -2].map((n, i) => ({
      id: `t${i + 1}`,
      label: `Entrada ${n}`,
      expression: `Doble(${n}) == ${n * 2}`,
      why: `Comprueba ${n}.`,
    })),
  };
  const records = {
    'rust-901': {
      draft: '// DRAFT_SENTINEL ñ\nfn doble(n:i32)->i32 { n*2 }',
      customTest: '  { /* CUSTOM_SENTINEL */ doble(5) == 10 }  ',
    },
    'go-901': {
      draft: '// DRAFT_SENTINEL ñ\nfunc Doble(n int) int { return n*2 }',
      customTest: '  fmt.Sprint(Doble(5)) == "10" /* CUSTOM_SENTINEL */  ',
    },
  };
  return { workshop, exercises: [rust, go], records };
}
const prepared: Prepared[] = [],
  sample = fixture(),
  fx = context();
fx.window.TallerLab = {
  getExercises: () => sample.exercises,
  exportState: () => ({ version: 1, records: sample.records }),
};
runSource(fx, ADAPTER, { minify: true });

check('Normal export preserves exact drafts, custom tests, UTF-8 and personal notes', () => {
  for (const language of ['rust', 'go'] as const) {
    const kit = projectKit(fx).files(sample.workshop, language),
      record = sample.records[sample.workshop.code[language]] as Required<Draft>;
    const executable = kit.files[language === 'rust' ? 'src/lib.rs' : 'exercise_test.go'];
    assert(executable.includes(record.draft));
    assert(executable.includes(record.customTest.trim()));
    assert(kit.files['README.md'].includes(sample.workshop.progress.note));
    assert(kit.files['README.md'].includes(sample.workshop.title));
    const tests =
      executable.match(language === 'rust' ? /#\[test\]/g : /func TestCaso\d+\(/g) || [];
    assert.equal(tests.length, 4);
    roundtrip(kit, projectKit(fx).archive(sample.workshop, language));
    prepared.push({ kit, language, workshop: 'fixture', kind: 'draft-fixture', expectedTests: 4 });
  }
});

check('Reference export chooses the solution and omits the user custom case', () => {
  for (const language of ['rust', 'go'] as const) {
    const kit = projectKit(fx).files(sample.workshop, language, { solution: true });
    const file = kit.files[language === 'rust' ? 'src/lib.rs' : 'exercise_test.go'];
    assert(
      file.includes((sample.exercises.find((e) => e.language === language) as Exercise).solution),
    );
    assert(!file.includes('DRAFT_SENTINEL'));
    assert(!file.includes('CUSTOM_SENTINEL'));
    assert.equal(
      (file.match(language === 'rust' ? /#\[test\]/g : /func TestCaso\d+\(/g) || []).length,
      3,
    );
    roundtrip(kit, projectKit(fx).archive(sample.workshop, language, { solution: true }));
  }
});

check('A missing draft uses the starter; an intentionally empty draft stays empty', () => {
  const old = sample.records['rust-901'];
  sample.records['rust-901'] = {};
  assert(
    projectKit(fx)
      .files(sample.workshop, 'rust')
      .files['src/lib.rs'].startsWith(sample.exercises[0].starter),
  );
  sample.records['rust-901'] = { draft: '' };
  const file = projectKit(fx).files(sample.workshop, 'rust').files['src/lib.rs'];
  assert(!file.includes(sample.exercises[0].starter));
  assert(!file.includes('fn doble('));
  sample.records['rust-901'] = old;
});

check(
  'Reference files are text-only and README explains command, limits and four project stages',
  () => {
    for (const language of ['rust', 'go'] as const) {
      const kit = projectKit(fx).files(sample.workshop, language);
      const referenceFiles = Object.keys(kit.files).filter((name) => name.startsWith('reference/'));
      assert.deepEqual(referenceFiles, [
        `reference/solution.${language === 'rust' ? 'rs' : 'go'}.txt`,
      ]);
      const readme = kit.files['README.md'];
      assert(readme.includes(language === 'rust' ? 'cargo test' : 'go test -v ./...'));
      assert(readme.includes('no se compile automáticamente'));
      assert(readme.includes('Comprobación manual:'));
      assert.equal((readme.match(/^### \d+\./gm) || []).length, 4);
      assert(readme.includes(sample.workshop.limits));
      assert(readme.includes(sample.workshop.sources[0].url));
    }
  },
);

check(
  'Go imports cover custom fmt cases and all declarations live in the test package file',
  () => {
    const kit = projectKit(fx).files(sample.workshop, 'go'),
      file = kit.files['exercise_test.go'];
    assert(/^package workshop\b/.test(file));
    assert(file.includes('"testing"'));
    assert(file.includes('"fmt"'), 'Custom test uses fmt: exported imports must include it.');
    assert(file.includes('func Doble(') && file.includes('func TestCaso4('));
    assert(
      !Object.keys(kit.files).some((name) => name.endsWith('.go') && name !== 'exercise_test.go'),
    );
  },
);

check('Go regression fixture preserves fmt only in learner comments and strings', () => {
  const old = sample.records['go-901'];
  try {
    sample.records['go-901'] = {
      draft:
        '// fmt.Println aparece solamente en este comentario.\nfunc Doble(n int) int { return n*2 }',
      customTest: 'Doble(5) == 10 && "fmt.Sprint no es una llamada" != ""',
    };
    const workshop = { ...sample.workshop, id: 'fixture-comment' };
    const kit = projectKit(fx).files(workshop, 'go');
    const fixtureRecord = sample.records['go-901'] as Required<Draft>;
    assert(kit.files['exercise_test.go'].includes(fixtureRecord.draft));
    assert(kit.files['exercise_test.go'].includes(fixtureRecord.customTest));
    assert(kit.files['exercise_test.go'].includes('"fmt"'));
    roundtrip(kit, projectKit(fx).archive(workshop, 'go'));
    prepared.push({
      kit,
      language: 'go',
      workshop: 'fixture-comment',
      kind: 'draft-fixture',
      expectedTests: 4,
    });
  } finally {
    sample.records['go-901'] = old;
  }
});

check('Unknown language/core is rejected rather than producing a misleading kit', () => {
  assert.throws(() => projectKit(fx).files(sample.workshop, 'python'));
  assert.throws(() =>
    projectKit(fx).files({ ...sample.workshop, code: { rust: 'rust-unknown' } }, 'rust'),
  );
});

let real = undefined as RealCatalog | undefined;
check('Load the actual workshop catalog and the production lab registry', () => {
  const ctx = context();
  loadLabExercises(ctx);
  const domains: { workshops: Workshop[] }[] = [];
  for (const name of SYSTEMS_DOMAINS) {
    const global = `SYSTEMS_${name.toUpperCase()}`;
    if (!systemsDomainSources(name).every((file) => fs.existsSync(path.join(root, file)))) {
      assert(
        partial,
        `Missing final domain snapshot: ${name}. Use --partial only while authoring.`,
      );
      continue;
    }
    loadSystemsDomain(ctx, name);
    domains.push(ctx.window[global] as { workshops: Workshop[] });
  }
  loadLab(ctx);
  runSource(ctx, ADAPTER, { minify: true });
  const workshops = domains.flatMap((d) => d.workshops),
    exercises = ctx.window.TallerLab?.getExercises() ?? [];
  if (!partial) {
    assert.equal(workshops.length, 25);
    assert.equal(exercises.length, 274);
  }
  real = { ctx, workshops, exercises };
  report.workshops = workshops.length;
  report.exerciseRegistry = exercises.length;
});

const catalog = real;
if (catalog) {
  check(
    'Every real reference kit roundtrips through ZIP with exact file contents and three tests',
    () => {
      for (const workshop of catalog.workshops)
        for (const language of ['rust', 'go'] as const) {
          const item: Exercise | undefined = catalog.exercises.find(
            (e) => e.id === workshop.code[language],
          );
          assert(item, workshop.code[language]);
          const kit: Kit = projectKit(catalog.ctx).files(workshop, language, {
            solution: true,
          });
          const executable: string =
            kit.files[language === 'rust' ? 'src/lib.rs' : 'exercise_test.go'];
          assert(executable.includes(item.solution));
          assert.equal(
            (executable.match(language === 'rust' ? /#\[test\]/g : /func TestCaso\d+\(/g) || [])
              .length,
            3,
          );
          const restored = roundtrip(
            kit,
            projectKit(catalog.ctx).archive(workshop, language, { solution: true }),
          );
          assert.equal(restored.size, 5);
          prepared.push({
            kit,
            language,
            workshop: workshop.id,
            exercise: item.id,
            kind: 'reference',
            expectedTests: 3,
          });
        }
    },
  );

  check('Every Go reference declares fmt when code or any exported test uses it', () => {
    for (const p of prepared.filter((p) => p.language === 'go')) {
      const code = p.kit.files['exercise_test.go'];
      if (/\bfmt\./.test(code))
        assert(code.includes('"fmt"'), `${p.exercise || 'draft fixture'} missing fmt import`);
    }
  });
}

function reusableEvidence(
  prior: PriorReport | null,
  candidate: Prepared,
  filesSHA256: string,
): Evidence | null {
  if (!prior || !prior.fullReferenceValidation || prior.failedChecks !== 0) return null;
  const matches = prior.kits.filter((k) => k.name === candidate.kit.name);
  if (matches.length !== 1) return null;
  const old = matches[0];
  if (
    !old.compiled ||
    old.filesSHA256 !== filesSHA256 ||
    old.language !== candidate.language ||
    old.workshop !== candidate.workshop ||
    old.exercise !== (candidate.exercise || null) ||
    old.kind !== candidate.kind ||
    old.expectedTests !== candidate.expectedTests
  )
    return null;
  if (old.evidence) {
    if (
      old.evidence.filesSHA256 !== filesSHA256 ||
      old.evidence.testsPassed !== candidate.expectedTests ||
      !old.evidence.imageID ||
      !old.evidence.toolchain
    )
      return null;
    return old.evidence;
  }
  const container = prior.containers[candidate.language];
  if (
    !container ||
    container.exitCode !== 0 ||
    !container.toolchain ||
    !container.imageID ||
    (container.testsPassed ?? Infinity) < candidate.expectedTests
  )
    return null;
  return {
    checkedAt: prior.checkedAt,
    filesSHA256,
    testsPassed: candidate.expectedTests,
    image: container.image,
    imageID: container.imageID,
    repoDigests: container.repoDigests,
    toolchain: container.toolchain,
    output: path.join(prior.temporaryDirectory, `${candidate.language}-test-output.txt`),
    method: 'docker',
    poisonedReferenceTextExcluded: true,
  };
}

check(
  'Incremental evidence requires exact files, identity, test count and a complete successful prior run',
  () => {
    const candidate: Prepared = {
      kit: { name: 'taller-example-rust', files: {} },
      language: 'rust',
      workshop: 'example',
      exercise: 'rust-999',
      kind: 'reference',
      expectedTests: 3,
    };
    const kit: PriorKit = {
      name: candidate.kit.name,
      language: 'rust',
      workshop: 'example',
      exercise: 'rust-999',
      kind: 'reference',
      expectedTests: 3,
      filesSHA256: 'exact',
      compiled: true,
    };
    const prior: PriorReport = {
      checkedAt: '2026-01-01T00:00:00Z',
      failedChecks: 0,
      fullReferenceValidation: true,
      kits: [kit],
      temporaryDirectory: '/tmp/fixture',
      containers: {
        rust: {
          exitCode: 0,
          toolchain: 'rustc fixture',
          imageID: 'sha256:fixture',
          testsPassed: 3,
        },
      },
    };
    assert(reusableEvidence(prior, candidate, 'exact'));
    assert.equal(reusableEvidence(prior, candidate, 'changed'), null);
    assert.equal(reusableEvidence({ ...prior, failedChecks: 1 }, candidate, 'exact'), null);
    assert.equal(
      reusableEvidence({ ...prior, fullReferenceValidation: false }, candidate, 'exact'),
      null,
    );
    assert.equal(reusableEvidence(prior, { ...candidate, expectedTests: 4 }, 'exact'), null);
    assert.equal(reusableEvidence(prior, { ...candidate, exercise: 'rust-998' }, 'exact'), null);
    assert.equal(reusableEvidence({ ...prior, kits: [kit, kit] }, candidate, 'exact'), null);
    assert.equal(
      reusableEvidence({ ...prior, kits: [{ ...kit, compiled: false }] }, candidate, 'exact'),
      null,
    );
  },
);

function preparePlan(catalog: RealCatalog): void {
  if (only)
    assert(
      catalog.workshops.some((w) => w.id === only),
      `Unknown --only workshop: ${only}`,
    );
  for (const p of prepared) {
    const filesSHA256 = digest(JSON.stringify(p.kit.files));
    const evidence =
      incremental && p.workshop !== only ? reusableEvidence(previous, p, filesSHA256) : null;
    const row = {
      name: p.kit.name,
      language: p.language,
      workshop: p.workshop,
      exercise: p.exercise || null,
      kind: p.kind,
      expectedTests: p.expectedTests,
      filesSHA256,
      compiled: Boolean(evidence),
      compileThisRun: useDocker && !evidence,
      verification: evidence ? 'reused-exact-hash' : 'not-executed',
      ...(evidence ? { evidence } : {}),
    };
    report.kits.push(row);
    if (row.compileThisRun)
      process.stdout.write(
        `COMPILE ${p.kit.name}${p.workshop === only ? ' (requested)' : ' (new, changed or unverified)'}\n`,
      );
  }
  selection.reusedExactHashes = report.kits.filter(
    (k) => k.verification === 'reused-exact-hash',
  ).length;
  selection.projectsToCompile = report.kits.filter((k) => k.compileThisRun).length;
}

function writePrepared(): string {
  const directory = fs.mkdtempSync('/tmp/taller-project-kits-');
  const selected = new Set(report.kits.filter((k) => k.compileThisRun).map((k) => k.name));
  for (const p of prepared.filter((p) => selected.has(p.kit.name))) {
    assert(/^taller-[a-z][a-z0-9-]*-(rust|go)$/.test(p.kit.name));
    const projectDirectory = path.join(directory, p.language, p.kit.name);
    for (const [file, text] of Object.entries(p.kit.files)) {
      assert(!path.isAbsolute(file) && !file.split('/').includes('..'));
      const destination = path.join(projectDirectory, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      // Invalid code in reference/*.txt proves it cannot be compiled accidentally.
      fs.writeFileSync(
        destination,
        text +
          (file.startsWith('reference/') ? '\nTHIS IS DELIBERATELY INVALID SOURCE !@#$\n' : ''),
      );
    }
  }
  for (const language of ['rust', 'go'] as const) {
    const command =
      language === 'rust' ? 'cargo test --offline --quiet' : 'go test -count=1 -v ./...';
    const version = language === 'rust' ? 'rustc --version' : 'go version';
    const script = `#!/bin/sh\nset -u\ncp -R /kits/${language} /tmp/work\nexport CARGO_TARGET_DIR=/tmp/target\nexport GOCACHE=/tmp/go-cache\nexport GOMODCACHE=/tmp/go-mod\nexport GOTOOLCHAIN=local\nprintf 'TOOLCHAIN|${language}|'\n${version}\nfailed=0\nfor project in /tmp/work/taller-*; do\n  [ -d "$project" ] || continue\n  name="\${project##*/}"\n  if (cd "$project" && ${command}) >"$project/qa.log" 2>&1; then\n    printf 'KIT_RESULT|%s|PASS\\n' "$name"\n    cat "$project/qa.log"\n  else\n    printf 'KIT_RESULT|%s|FAIL\\n' "$name"\n    cat "$project/qa.log"\n    failed=1\n  fi\ndone\nexit "$failed"\n`;
    fs.writeFileSync(path.join(directory, `run-${language}.sh`), script);
  }
  report.temporaryDirectory = directory;
  return directory;
}
async function runContainer(language: Language, directory: string): Promise<void> {
  const image = IMAGE[language];
  const inspection = (
    JSON.parse(execFileSync('docker', ['image', 'inspect', image], { encoding: 'utf8' })) as {
      Id: string;
      RepoDigests: string[];
    }[]
  )[0] as { Id: string; RepoDigests: string[] };
  const container: ContainerReport = {
    image,
    imageID: inspection.Id,
    repoDigests: inspection.RepoDigests,
    network: 'none',
    portsPublished: false,
  };
  report.containers[language] = container;
  const args = [
    'run',
    '--rm',
    '--network',
    'none',
    '--read-only',
    '--memory',
    '2g',
    '--cpus',
    '2',
    '--pids-limit',
    '256',
    '--tmpfs',
    '/tmp:rw,exec,size=1073741824',
    '--mount',
    `type=bind,src=${directory},dst=/kits,readonly`,
    image,
    'sh',
    `/kits/run-${language}.sh`,
  ];
  const started = Date.now();
  let output = '';
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      for (const line of text.split('\n'))
        if (line.startsWith('KIT_RESULT|') || line.startsWith('TOOLCHAIN|'))
          process.stdout.write(line + '\n');
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', reject);
    child.once('close', resolve);
  });
  const results = [...output.matchAll(/^KIT_RESULT\|([^|]+)\|(PASS|FAIL)$/gm)];
  const toolchain = output.match(/^TOOLCHAIN\|[^|]+\|(.+)$/m)?.[1] || '';
  container.toolchain = toolchain;
  container.milliseconds = Date.now() - started;
  container.exitCode = exitCode;
  const expected = report.kits.filter((k) => k.language === language && k.compileThisRun);
  for (const k of expected) {
    const row = results.find((r) => r[1] === k.name);
    k.compiled = row?.[2] === 'PASS';
    k.verification = k.compiled ? 'compiled-this-run' : 'failed-this-run';
  }
  fs.writeFileSync(path.join(directory, `${language}-test-output.txt`), output);
  check(
    `${language}: every generated project passes real tests, with poisoned reference text excluded`,
    () => {
      assert.equal(
        results.length,
        expected.length,
        `${language}: missing project results; see ${directory}/${language}-test-output.txt`,
      );
      assert.equal(
        exitCode,
        0,
        `${language}: test failure; see ${directory}/${language}-test-output.txt\n${output.slice(-12000)}`,
      );
      assert(expected.every((k) => k.compiled));
      const count =
        language === 'rust'
          ? [...output.matchAll(/test result: ok\. (\d+) passed; 0 failed/g)].reduce(
              (sum, m) => sum + Number(m[1]),
              0,
            )
          : [...output.matchAll(/^--- PASS: TestCaso\d+ /gm)].length;
      const wanted = expected.reduce((sum, k) => sum + k.expectedTests, 0);
      assert.equal(count, wanted, `${language}: expected test cases were not all executed`);
      container.testsPassed = count;
      for (const k of expected)
        k.evidence = {
          checkedAt: report.checkedAt,
          filesSHA256: k.filesSHA256,
          testsPassed: k.expectedTests,
          image,
          imageID: inspection.Id,
          repoDigests: inspection.RepoDigests,
          toolchain,
          output: path.join(directory, `${language}-test-output.txt`),
          method: 'docker',
          poisonedReferenceTextExcluded: true,
        };
    },
  );
}
async function main() {
  if (catalog) preparePlan(catalog);
  if (useDocker && catalog) {
    const directory = writePrepared();
    process.stdout.write(`Generated project files: ${directory}\n`);
    const languages = (['rust', 'go'] as const).filter((language) =>
      report.kits.some((k) => k.language === language && k.compileThisRun),
    );
    const results = await Promise.allSettled(
      languages.map((language) => runContainer(language, directory)),
    );
    for (let i = 0; i < results.length; i++) {
      const outcome = results[i];
      if (outcome?.status === 'rejected') {
        check(`Container execution ${languages[i]}`, () => {
          throw outcome.reason;
        });
      }
    }
  } else {
    process.stdout.write(
      'Compiler execution not requested or catalog unavailable. Use --docker after images are present.\n',
    );
  }
  report.passedChecks = passed;
  report.failedChecks = failed;
  report.referenceKitsCompiled = report.kits.filter(
    (k) => k.kind === 'reference' && k.compiled,
  ).length;
  report.referenceTestsVerified = report.kits
    .filter((k) => k.kind === 'reference' && k.compiled)
    .reduce((sum, k) => sum + k.expectedTests, 0);
  report.referenceKitsCompiledThisRun = report.kits.filter(
    (k) => k.kind === 'reference' && k.verification === 'compiled-this-run',
  ).length;
  report.referenceKitsReused = report.kits.filter(
    (k) => k.kind === 'reference' && k.verification === 'reused-exact-hash',
  ).length;
  report.fullReferenceValidation =
    !partial &&
    report.referenceKitsCompiled === 50 &&
    failed === 0 &&
    report.kits
      .filter((k) => k.kind === 'reference')
      .every((k) => k.evidence?.filesSHA256 === k.filesSHA256);
  if (process.argv.includes('--write-report'))
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(
    `\n${passed} project-kit checks passed; ${failed} failed. Reference kits compiled: ${report.referenceKitsCompiled}.\n`,
  );
  if (failed) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
