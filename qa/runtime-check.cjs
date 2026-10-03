/* Real compiler QA. Explicit invocation sends the bundled educational source
 * to the official Rust or Go Playground. Requires Node 20+ and internet.
 * Usage: node qa/runtime-check.cjs rust
 *        node qa/runtime-check.cjs go
 *        node qa/runtime-check.cjs rust starters
 *        node qa/runtime-check.cjs go starters
 *        node qa/runtime-check.cjs go --ids=go-28
 *        node qa/runtime-check.cjs rust --from=51
 *        node qa/runtime-check.cjs rust starters --all-starters --from=76
 *        node qa/runtime-check.cjs go --audit-record
 * Uses the SAME program builder as the browser and isolates each exercise in
 * its own module/package. Go's txtar limit is 20 files, so batches contain 15.
 */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const language = process.argv[2];
const options = process.argv.slice(3);
const starters = options.includes('starters');
const idsOption = options.find(option => option.startsWith('--ids='));
const fromOption = options.find(option => option.startsWith('--from='));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
if (!['rust', 'go'].includes(language)) throw new Error('Expected rust or go');
const context = {window: {}, localStorage: {getItem: () => null, setItem: () => {}}};
const questFile = 'quests-' + language + '.js';
const systemFiles=['lowlevel','infra','play','pc'].flatMap(domain=>['systems-'+domain+'.js','systems-'+domain+'-labs.js']).filter(file=>fs.existsSync(path.join(root,file)));
for (const file of ['lab-' + language + '.js', ...(fs.existsSync(path.join(root, questFile)) ? [questFile] : []), ...systemFiles, 'lab.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const lab = context.window.TallerLab;
const allExercises = lab.getExercises().filter(ex => ex.language === language);
const sourceHash = () => hash(['lab-' + language + '.js', questFile,...systemFiles].filter(file => fs.existsSync(path.join(root, file)))
  .map(file => file + '\n' + fs.readFileSync(path.join(root, file), 'utf8')).join('\n'));
let exercises = allExercises;
if (!Array.isArray(exercises) || !exercises.length) throw new Error('No exercise array');
if (idsOption) {
  const ids = new Set(idsOption.slice(6).split(','));
  exercises = exercises.filter(ex => ids.has(ex.id));
  if (exercises.length !== ids.size) throw new Error('An exercise ID was not found');
}
if (fromOption) {
  const start = Number(fromOption.slice(7));
  if (!Number.isInteger(start) || start < 1) throw new Error('--from expects an exercise number >= 1');
  exercises = exercises.filter(ex => Number(ex.id.split('-')[1]) >= start);
}
if (starters && !options.includes('--all-starters')) exercises = [exercises[0]];
if (!exercises.length || !exercises[0]) throw new Error('No matching exercises');

function built(ex, useStarter = starters) {
  // Prefix just the test identifiers, preserving the original compiler harness.
  return lab.buildProgram(ex, useStarter ? ex.starter : ex.solution)
    .replaceAll('__TALLER_TEST__', '__TALLER_TEST__' + ex.id.replace('-', '_') + '_');
}

const recordPath = path.join(__dirname, language + '-validation.json');
function currentRecord() {
  const previous = fs.existsSync(recordPath) ? JSON.parse(fs.readFileSync(recordPath, 'utf8')) : {};
  if (previous.language && (previous.language !== language || previous.mode !== 'solutions')) {
    throw new Error('Existing validation record has an unexpected language or mode');
  }
  const byId = new Map((previous.exercises || []).map(entry => [entry.id, entry]));
  const record = {...previous, language, mode: 'solutions',
    checkedAt: new Date().toISOString(),
    currentSourceHash: sourceHash(),
    sourceHashScope: ['lab-' + language + '.js', questFile,...systemFiles].filter(file => fs.existsSync(path.join(root, file))),
    exercises: allExercises.map(ex => {
      const prior = byId.get(ex.id);
      const programHash = hash(built(ex, false));
      const matches = prior && prior.validated === true && prior.programHash === programHash && prior.testCount === ex.tests.length;
      return matches ? {...prior} : {id: ex.id, programHash, testCount: ex.tests.length, validated: false};
    }), runs: previous.runs || []};
  return record;
}
function summarize(record) {
  const valid = record.exercises.filter(entry => entry.validated);
  const testedStarters = new Map(record.runs.filter(run => run.mode === 'starters')
    .flatMap(run => run.exercises || []).filter(entry => entry.validated).map(entry => [entry.id, entry]));
  const rejectedStarters = allExercises.filter(ex => {
    const entry = testedStarters.get(ex.id);
    return entry && entry.programHash === hash(built(ex, true)) && entry.testCount === ex.tests.length;
  }).map(ex => ex.id);
  record.summary = {total: record.exercises.length, validated: valid.length,
    assertions: valid.reduce((sum, entry) => sum + entry.testCount, 0),
    pending: record.exercises.filter(entry => !entry.validated).map(entry => entry.id),
    starterChecks: {validatedAgainstCurrentSource: rejectedStarters.length, ids: rejectedStarters}};
  return record.summary;
}
function saveRecord(record) {
  record.checkedAt = new Date().toISOString();
  summarize(record);
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
}

function buildRust(items) {
  return items.map((ex, i) => 'mod e' + i + ' {\n' + built(ex).replace('fn main()', 'pub fn check()') + '\n}')
    .join('\n') + '\nfn main() {\n' + items.map((_, i) => 'e' + i + '::check();').join('\n') + '\n}';
}

function buildGo(items) {
  let code = 'package main\nimport (\n' + items.map((_, i) => JSON.stringify('taller/e' + i)).join('\n')
    + '\n)\nfunc main() {\n' + items.map((_, i) => 'e' + i + '.Check()').join('\n')
    + '\n}\n-- go.mod --\nmodule taller\n\ngo 1.23\n';
  for (const [i, ex] of items.entries()) {
    code += '-- e' + i + '/exercise.go --\n' + built(ex)
      .replace('package main', 'package e' + i).replace('func main()', 'func Check()') + '\n';
  }
  return code;
}

async function main() {
  const record = currentRecord();
  if (options.includes('--audit-record')) {
    const summary = summarize(record);
    console.log(language + ': ' + summary.validated + '/' + summary.total + ' current reference programs match validated hashes; ' + summary.assertions + ' assertions.');
    if (summary.pending.length) {
      console.error('Missing or changed:', summary.pending.join(', '));
      process.exitCode = 1;
    }
    return;
  }
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'taller-runtime-qa-'));
  const batchSize = language === 'rust' ? 50 : 15;
  let checked = 0;
  const manifest = {language, mode: starters ? 'starters' : 'solutions', startedAt: new Date().toISOString(),
    sourceHash: sourceHash(),
    exercises: exercises.map(ex => ({id: ex.id, programHash: hash(built(ex)), testCount: ex.tests.length, validated: false}))};
  const run = {id: path.basename(workdir), startedAt: manifest.startedAt, mode: manifest.mode,
    sourceHash: manifest.sourceHash,
    compiler: language === 'rust' ? {service: 'Rust Playground', channel: 'stable', edition: '2024', mode: 'debug'}
      : {service: 'Go Playground', version: '2', withVet: true}, exercises: manifest.exercises, batches: []};
  record.runs.push(run);
  fs.writeFileSync(path.join(workdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  for (let offset = 0; offset < exercises.length; offset += batchSize) {
    const batch = exercises.slice(offset, offset + batchSize);
    const code = language === 'rust' ? buildRust(batch) : buildGo(batch);
    fs.writeFileSync(path.join(workdir, language + '-' + offset + '.txt'), code);
    const endpoint = language === 'rust' ? 'https://play.rust-lang.org/execute' : 'https://play.golang.org/compile';
    const headers = {'Content-Type': language === 'rust' ? 'application/json' : 'application/x-www-form-urlencoded'};
    const body = language === 'rust'
      ? JSON.stringify({channel: 'stable', mode: 'debug', edition: '2024', crateType: 'bin', tests: false, code, backtrace: false})
      : new URLSearchParams({body: code, version: '2', withVet: 'true'}).toString();
    const response = await fetch(endpoint, {method: 'POST', headers, body, signal: AbortSignal.timeout(60000)});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    fs.writeFileSync(path.join(workdir, language + '-' + offset + '-result.json'), JSON.stringify(data, null, 2));
    const stdout = language === 'rust' ? data.stdout : (data.Events || []).filter(e => e.Kind === 'stdout').map(e => e.Message).join('');
    const stderr = language === 'rust' ? data.stderr : data.Errors + '\n' + (data.Events || []).filter(e => e.Kind === 'stderr').map(e => e.Message).join('') + '\n' + (data.VetErrors || '');
    const ok = language === 'rust' ? data.success : !data.Errors && data.Status === 0;
    const evidence = {ids: batch.map(ex => ex.id), inputHash: hash(code), compilerSuccess: ok,
      checkedAt: new Date().toISOString(), stdout, stderr, validated: false};
    run.batches.push(evidence);
    if (!ok) {
      console.error(stderr);
      process.exitCode = 1;
      if (!starters) for (const ex of batch) record.exercises.find(entry => entry.id === ex.id).validated = false;
      saveRecord(record);
      continue;
    }
    const lines = new Set(stdout.trim().split(/\r?\n/));
    const marker = (ex, test, result) => '__TALLER_TEST__' + ex.id.replace('-', '_') + '_' + test.id + ':' + result;
    const expected = batch.flatMap(ex => ex.tests.map(test => marker(ex, test, 'PASS')));
    if (starters) {
      const bad = batch.filter(ex => !ex.tests.some(test => lines.has(marker(ex, test, 'FAIL'))));
      if (bad.length) {
        console.error('Invalid baseline: these starters did not fail a test', bad.map(ex => ex.id));
        process.exitCode = 1;
        saveRecord(record);
        continue;
      }
    } else {
      const missing = expected.filter(value => !lines.has(value));
      if (missing.length) {
        console.error('Missing passes:', missing);
        console.error(stdout);
        process.exitCode = 1;
        for (const ex of batch) record.exercises.find(entry => entry.id === ex.id).validated = false;
        saveRecord(record);
        continue;
      }
    }
    checked += batch.length;
    evidence.validated = true;
    for (const ex of batch) manifest.exercises.find(entry => entry.id === ex.id).validated = true;
    if (!starters) for (const ex of batch) Object.assign(record.exercises.find(entry => entry.id === ex.id),
      {validated: true, validatedAt: evidence.checkedAt, evidenceRun: run.id});
    saveRecord(record);
    fs.writeFileSync(path.join(workdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(language + ': ' + batch.length + (starters ? ' broken starter(s) correctly rejected' : ' solutions / ' + expected.length + ' assertions PASS') + ' (' + batch[0].id + ' → ' + batch[batch.length - 1].id + ').');
  }
  console.log(language + ': ' + checked + '/' + exercises.length + ' ' + (starters ? 'starter checks' : 'reference solutions') + ' validated. Evidence: ' + workdir);
}
main().catch(error => {console.error(error); process.exitCode = 1;});
