/* Real compiler QA. Explicit invocation sends the bundled educational source
 * to the official Rust or Go Playground. Requires Node 24+ and internet.
 * Usage: node qa/runtime-check.ts rust
 *        node qa/runtime-check.ts go
 *        node qa/runtime-check.ts rust starters
 *        node qa/runtime-check.ts go starters
 *        node qa/runtime-check.ts go --ids=go-28
 *        node qa/runtime-check.ts rust --from=51
 *        node qa/runtime-check.ts rust starters --all-starters --from=76
 *        node qa/runtime-check.ts go --audit-record
 * Uses the SAME program builder as the browser and isolates each exercise in
 * its own module/package. Go's txtar limit is 20 files, so batches contain 15.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { repoRoot as root, runSource } from './lib/sources.ts';
import { SYSTEMS_DOMAINS, systemsDomainSources } from './lib/legacy-sources.ts';

interface TestCase {
  id: string;
}
interface Exercise {
  id: string;
  language: string;
  starter: string;
  solution: string;
  tests: TestCase[];
}
interface LabApi {
  getExercises: () => Exercise[];
  buildProgram: (exercise: Exercise, code: string) => string;
}
interface ExerciseEntry {
  id: string;
  programHash: string;
  testCount: number;
  validated: boolean;
  validatedAt?: string;
  evidenceRun?: string;
}
interface BatchEvidence {
  ids: string[];
  inputHash: string;
  compilerSuccess: boolean;
  checkedAt: string;
  stdout: string;
  stderr: string;
  validated: boolean;
}
interface RunRecord extends StarterRun {
  id: string;
  startedAt: string;
  mode: string;
  sourceHash: string;
  compiler: Record<string, string | boolean>;
  exercises: ExerciseEntry[];
  batches: BatchEvidence[];
}
interface Summary {
  total: number;
  validated: number;
  assertions: number;
  pending: string[];
  starterChecks: { validatedAgainstCurrentSource: number; ids: string[] };
}
interface ValidationRecord {
  language?: string;
  mode?: string;
  checkedAt?: string;
  currentSourceHash?: string;
  sourceHashScope?: string[];
  exercises: ExerciseEntry[];
  runs: StarterRun[];
  summary?: Summary;
}
interface StarterRun {
  mode: string;
  exercises?: ExerciseEntry[];
}
interface PlaygroundEvent {
  Kind: string;
  Message: string;
}
interface PlaygroundResponse {
  success?: boolean;
  stdout?: string;
  stderr?: string;
  Errors?: string;
  Events?: PlaygroundEvent[] | null;
  Status?: number;
  VetErrors?: string;
}

const language = process.argv[2];
const options = process.argv.slice(3);
const starters = options.includes('starters');
const idsOption = options.find((option) => option.startsWith('--ids='));
const fromOption = options.find((option) => option.startsWith('--from='));
const hash = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');
if (!['rust', 'go'].includes(language)) throw new Error('Expected rust or go');
const window: { TallerLab?: LabApi } = {};
function requireLab(): LabApi {
  if (!window.TallerLab) throw new Error('TallerLab was not published by lab.js');
  return window.TallerLab;
}
const context = vm.createContext({
  window,
  localStorage: { getItem: () => null, setItem: () => {} },
});
// Catálogos del lenguaje: content/<lenguaje>/ (manifiesto, exercise.yaml y código); el hash
// sólo cubre las fuentes del lenguaje elegido (no el generador ni el otro lenguaje).
const catalogSources = fs
  .readdirSync(path.join(root, 'content', language), { recursive: true, encoding: 'utf8' })
  .map((entry) => path.posix.join('content', language, entry))
  .filter((file) => fs.statSync(path.join(root, file)).isFile())
  .sort();
// Mismas fuentes y orden que el resto de QA: los dominios portados tienen un adaptador.
const systemFiles = SYSTEMS_DOMAINS.flatMap((domain) => systemsDomainSources(domain));
const hashedSources = [...catalogSources, ...systemFiles].filter((file) =>
  fs.existsSync(path.join(root, file)),
);
for (const file of ['src/app/legacy/register-catalogs.ts', ...systemFiles, 'lab.js']) {
  runSource(context, file);
}
const lab = requireLab();
const allExercises = lab.getExercises().filter((ex) => ex.language === language);
const sourceHash = (): string =>
  hash(
    hashedSources
      .map((file) => file + '\n' + fs.readFileSync(path.join(root, file), 'utf8'))
      .join('\n'),
  );
let exercises = allExercises;
if (!Array.isArray(exercises) || !exercises.length) throw new Error('No exercise array');
if (idsOption) {
  const ids = new Set(idsOption.slice(6).split(','));
  exercises = exercises.filter((ex) => ids.has(ex.id));
  if (exercises.length !== ids.size) throw new Error('An exercise ID was not found');
}
if (fromOption) {
  const start = Number(fromOption.slice(7));
  if (!Number.isInteger(start) || start < 1)
    throw new Error('--from expects an exercise number >= 1');
  exercises = exercises.filter((ex) => Number(ex.id.split('-')[1]) >= start);
}
if (starters && !options.includes('--all-starters')) exercises = [exercises[0]];
if (!exercises.length || !exercises[0]) throw new Error('No matching exercises');

function built(ex: Exercise, useStarter = starters): string {
  // Prefix just the test identifiers, preserving the original compiler harness.
  return lab
    .buildProgram(ex, useStarter ? ex.starter : ex.solution)
    .replaceAll('__TALLER_TEST__', '__TALLER_TEST__' + ex.id.replace('-', '_') + '_');
}

const recordPath = path.join(import.meta.dirname, language + '-validation.json');
function currentRecord(): ValidationRecord {
  const previous: Partial<ValidationRecord> = fs.existsSync(recordPath)
    ? JSON.parse(fs.readFileSync(recordPath, 'utf8'))
    : {};
  if (previous.language && (previous.language !== language || previous.mode !== 'solutions')) {
    throw new Error('Existing validation record has an unexpected language or mode');
  }
  const byId = new Map((previous.exercises || []).map((entry) => [entry.id, entry]));
  const record: ValidationRecord = {
    ...previous,
    language,
    mode: 'solutions',
    checkedAt: new Date().toISOString(),
    currentSourceHash: sourceHash(),
    sourceHashScope: hashedSources,
    exercises: allExercises.map((ex) => {
      const prior = byId.get(ex.id);
      const programHash = hash(built(ex, false));
      const matches =
        prior &&
        prior.validated === true &&
        prior.programHash === programHash &&
        prior.testCount === ex.tests.length;
      return matches
        ? { ...prior }
        : { id: ex.id, programHash, testCount: ex.tests.length, validated: false };
    }),
    runs: previous.runs || [],
  };
  return record;
}
function summarize(record: ValidationRecord): Summary {
  const valid = record.exercises.filter((entry) => entry.validated);
  const testedStarters = new Map(
    record.runs
      .filter((run) => run.mode === 'starters')
      .flatMap((run) => run.exercises || [])
      .filter((entry) => entry.validated)
      .map((entry) => [entry.id, entry]),
  );
  const rejectedStarters = allExercises
    .filter((ex) => {
      const entry = testedStarters.get(ex.id);
      return (
        entry && entry.programHash === hash(built(ex, true)) && entry.testCount === ex.tests.length
      );
    })
    .map((ex) => ex.id);
  record.summary = {
    total: record.exercises.length,
    validated: valid.length,
    assertions: valid.reduce((sum, entry) => sum + entry.testCount, 0),
    pending: record.exercises.filter((entry) => !entry.validated).map((entry) => entry.id),
    starterChecks: {
      validatedAgainstCurrentSource: rejectedStarters.length,
      ids: rejectedStarters,
    },
  };
  return record.summary;
}
function saveRecord(record: ValidationRecord): void {
  record.checkedAt = new Date().toISOString();
  summarize(record);
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
}

function recordEntry(record: ValidationRecord, id: string): ExerciseEntry {
  const entry = record.exercises.find((candidate) => candidate.id === id);
  if (!entry) throw new Error('Missing record entry for ' + id);
  return entry;
}
function buildRust(items: Exercise[]): string {
  return (
    items
      .map(
        (ex, i) => 'mod e' + i + ' {\n' + built(ex).replace('fn main()', 'pub fn check()') + '\n}',
      )
      .join('\n') +
    '\nfn main() {\n' +
    items.map((_, i) => 'e' + i + '::check();').join('\n') +
    '\n}'
  );
}

function buildGo(items: Exercise[]): string {
  let code =
    'package main\nimport (\n' +
    items.map((_, i) => JSON.stringify('taller/e' + i)).join('\n') +
    '\n)\nfunc main() {\n' +
    items.map((_, i) => 'e' + i + '.Check()').join('\n') +
    '\n}\n-- go.mod --\nmodule taller\n\ngo 1.23\n';
  for (const [i, ex] of items.entries()) {
    code +=
      '-- e' +
      i +
      '/exercise.go --\n' +
      built(ex)
        .replace('package main', 'package e' + i)
        .replace('func main()', 'func Check()') +
      '\n';
  }
  return code;
}

async function main(): Promise<void> {
  const record = currentRecord();
  if (options.includes('--audit-record')) {
    const summary = summarize(record);
    console.log(
      language +
        ': ' +
        summary.validated +
        '/' +
        summary.total +
        ' current reference programs match validated hashes; ' +
        summary.assertions +
        ' assertions.',
    );
    if (summary.pending.length) {
      console.error('Missing or changed:', summary.pending.join(', '));
      process.exitCode = 1;
    }
    return;
  }
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'taller-runtime-qa-'));
  const batchSize = language === 'rust' ? 50 : 15;
  let checked = 0;
  const manifest = {
    language,
    mode: starters ? 'starters' : 'solutions',
    startedAt: new Date().toISOString(),
    sourceHash: sourceHash(),
    exercises: exercises.map((ex) => ({
      id: ex.id,
      programHash: hash(built(ex)),
      testCount: ex.tests.length,
      validated: false,
    })),
  };
  const manifestEntry = (id: string): ExerciseEntry => {
    const entry = manifest.exercises.find((candidate) => candidate.id === id);
    if (!entry) throw new Error('Missing manifest entry for ' + id);
    return entry;
  };
  const run: RunRecord = {
    id: path.basename(workdir),
    startedAt: manifest.startedAt,
    mode: manifest.mode,
    sourceHash: manifest.sourceHash,
    compiler:
      language === 'rust'
        ? { service: 'Rust Playground', channel: 'stable', edition: '2024', mode: 'debug' }
        : { service: 'Go Playground', version: '2', withVet: true },
    exercises: manifest.exercises,
    batches: [],
  };
  record.runs.push(run);
  fs.writeFileSync(path.join(workdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  for (let offset = 0; offset < exercises.length; offset += batchSize) {
    const batch = exercises.slice(offset, offset + batchSize);
    const code = language === 'rust' ? buildRust(batch) : buildGo(batch);
    fs.writeFileSync(path.join(workdir, language + '-' + offset + '.txt'), code);
    const endpoint =
      language === 'rust'
        ? 'https://play.rust-lang.org/execute'
        : 'https://play.golang.org/compile';
    const headers = {
      'Content-Type':
        language === 'rust' ? 'application/json' : 'application/x-www-form-urlencoded',
    };
    const body =
      language === 'rust'
        ? JSON.stringify({
            channel: 'stable',
            mode: 'debug',
            edition: '2024',
            crateType: 'bin',
            tests: false,
            code,
            backtrace: false,
          })
        : new URLSearchParams({ body: code, version: '2', withVet: 'true' }).toString();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = (await response.json()) as PlaygroundResponse;
    fs.writeFileSync(
      path.join(workdir, language + '-' + offset + '-result.json'),
      JSON.stringify(data, null, 2),
    );
    const stdout =
      language === 'rust'
        ? (data.stdout as string)
        : (data.Events || [])
            .filter((e) => e.Kind === 'stdout')
            .map((e) => e.Message)
            .join('');
    const stderr =
      language === 'rust'
        ? (data.stderr as string)
        : data.Errors +
          '\n' +
          (data.Events || [])
            .filter((e) => e.Kind === 'stderr')
            .map((e) => e.Message)
            .join('') +
          '\n' +
          (data.VetErrors || '');
    const ok = language === 'rust' ? (data.success as boolean) : !data.Errors && data.Status === 0;
    const evidence = {
      ids: batch.map((ex) => ex.id),
      inputHash: hash(code),
      compilerSuccess: ok,
      checkedAt: new Date().toISOString(),
      stdout,
      stderr,
      validated: false,
    };
    run.batches.push(evidence);
    if (!ok) {
      console.error(stderr);
      process.exitCode = 1;
      if (!starters) for (const ex of batch) recordEntry(record, ex.id).validated = false;
      saveRecord(record);
      continue;
    }
    const lines = new Set(stdout.trim().split(/\r?\n/));
    const marker = (ex: Exercise, test: TestCase, result: string): string =>
      '__TALLER_TEST__' + ex.id.replace('-', '_') + '_' + test.id + ':' + result;
    const expected = batch.flatMap((ex) => ex.tests.map((test) => marker(ex, test, 'PASS')));
    if (starters) {
      const bad = batch.filter(
        (ex) => !ex.tests.some((test) => lines.has(marker(ex, test, 'FAIL'))),
      );
      if (bad.length) {
        console.error(
          'Invalid baseline: these starters did not fail a test',
          bad.map((ex) => ex.id),
        );
        process.exitCode = 1;
        saveRecord(record);
        continue;
      }
    } else {
      const missing = expected.filter((value) => !lines.has(value));
      if (missing.length) {
        console.error('Missing passes:', missing);
        console.error(stdout);
        process.exitCode = 1;
        for (const ex of batch) recordEntry(record, ex.id).validated = false;
        saveRecord(record);
        continue;
      }
    }
    checked += batch.length;
    evidence.validated = true;
    for (const ex of batch) manifestEntry(ex.id).validated = true;
    if (!starters)
      for (const ex of batch)
        Object.assign(recordEntry(record, ex.id), {
          validated: true,
          validatedAt: evidence.checkedAt,
          evidenceRun: run.id,
        });
    saveRecord(record);
    fs.writeFileSync(path.join(workdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(
      language +
        ': ' +
        batch.length +
        (starters
          ? ' broken starter(s) correctly rejected'
          : ' solutions / ' + expected.length + ' assertions PASS') +
        ' (' +
        batch[0].id +
        ' → ' +
        batch[batch.length - 1].id +
        ').',
    );
  }
  console.log(
    language +
      ': ' +
      checked +
      '/' +
      exercises.length +
      ' ' +
      (starters ? 'starter checks' : 'reference solutions') +
      ' validated. Evidence: ' +
      workdir,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
