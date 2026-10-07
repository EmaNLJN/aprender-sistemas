import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { request, type IncomingHttpHeaders } from 'node:http';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { openAccount, type CheckAccount } from './lib/api-account.ts';

type Json = Record<string, unknown>;

interface Client {
  account: CheckAccount;
  cookies: Map<string, string>;
  userId: number;
}

interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: Json;
  milliseconds: number;
}

interface ImportCase {
  id: string;
  raw: string;
  normalized: Json;
  source: string;
  expect: { written: Json };
}

interface Stage {
  name: string;
  run: (client: Client) => Promise<void>;
}

const INVITATION_WINDOW_MS = 61_000;
const BODY_LIMIT_BYTES = 24 * 1024 * 1024;
const DRAFT_CHARS = 30_000;
const SEEDED_EXERCISES = 274;
const RAW_LIMIT_BYTES = 10 * 1024 * 1024;
const LOCK_PROBE_DELAY_MS = 150;
const TABLES_WITH_USER_ID = [
  'sync_operations',
  'drafts',
  'campaign_checkpoints',
  'campaign_seals',
  'workshop_progress',
  'workshop_observations',
  'workshop_step_marks',
  'route_marks',
  'route_quiz_answers',
  'route_notes',
  'preferences',
  'progress_heads',
  'exercise_progress',
  'attempts',
  'progress_imports',
  'runs',
];

const root = join(import.meta.dirname, '..');

function compose(args: string[]): string {
  return execFileSync('docker', ['compose', ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

function publishedAddress(): string {
  try {
    return compose(['port', 'taller', '8080']).trim();
  } catch {
    return '';
  }
}

function address(): string {
  if (process.env.TALLER_URL) return process.env.TALLER_URL.replace(/\/$/, '');
  const published = publishedAddress();
  if (published === '') {
    throw new Error(
      'api-import-check: cannot find the running taller service; start the stack with `docker compose up -d --wait` or set TALLER_URL',
    );
  }
  return `http://${published}`;
}

function queryDatabase(statement: string): string {
  return compose([
    'exec',
    '-T',
    'mysql',
    'sh',
    '-c',
    'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -N -B -e "$1" 2>/dev/null',
    'sh',
    statement,
  ]).trim();
}

function parseCookies(header: string): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const pair of header.split('; ')) {
    const separator = pair.indexOf('=');
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  return cookies;
}

function rememberCookies(client: Client, headers: IncomingHttpHeaders): void {
  for (const header of headers['set-cookie'] ?? []) {
    const [pair] = header.split(';');
    const separator = pair.indexOf('=');
    client.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function parseBody(text: string): Json {
  try {
    return JSON.parse(text) as Json;
  } catch {
    return { unparsed: text.slice(0, 200) };
  }
}

function call(
  base: string,
  method: 'GET' | 'POST',
  path: string,
  client: Client,
  payload?: string | Buffer,
): Promise<Reply> {
  const cookie = [...client.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  const headers: Record<string, string> = { Accept: 'application/json', Cookie: cookie };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    headers['X-XSRF-TOKEN'] = decodeURIComponent(client.cookies.get('XSRF-TOKEN') ?? '');
    headers['X-Taller-User'] = String(client.userId);
  }
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const outgoing = request(`${base}${path}`, { method, headers, agent: false }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        rememberCookies(client, response.headers);
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: parseBody(Buffer.concat(chunks).toString('utf8')),
          milliseconds: performance.now() - startedAt,
        });
      });
    });
    outgoing.on('error', reject);
    outgoing.end(payload);
  });
}

async function openClient(base: string): Promise<Client> {
  const account = await openAccount(base);
  try {
    const client: Client = { account, cookies: parseCookies(account.cookie), userId: 0 };
    const reply = await call(base, 'GET', '/api/session', client);
    const user = reply.body.user as { id?: number } | null;
    assert.ok(user && typeof user.id === 'number', 'GET /api/session did not return the account');
    client.userId = user.id;
    return client;
  } catch (error) {
    account.close();
    throw error;
  }
}

function isInvitationThrottled(error: unknown): boolean {
  return error instanceof Error && error.message === 'accepting the invitation replied 429';
}

async function openClientWhenAllowed(base: string): Promise<Client> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await openClient(base);
    } catch (error) {
      if (!isInvitationThrottled(error)) throw error;
      await sleep(INVITATION_WINDOW_MS);
    }
  }
  throw new Error('the invitation limit did not let the check account open');
}

function importCases(): ImportCase[] {
  const file = join(root, 'qa', 'fixtures', 'shared', 'import-cases.json');
  return (JSON.parse(readFileSync(file, 'utf8')) as { cases: ImportCase[] }).cases;
}

function importBody(
  importCase: Pick<ImportCase, 'raw' | 'normalized' | 'source'>,
  epoch: number,
  overrides: Json = {},
): string {
  return JSON.stringify({
    format: 2,
    importId: randomUUID(),
    epoch,
    source: importCase.source,
    raw: importCase.raw,
    normalized: importCase.normalized,
    ...overrides,
  });
}

async function postImport(base: string, client: Client, body: string): Promise<Reply> {
  return call(base, 'POST', '/api/progress/import', client, body);
}

function describeReply(label: string, reply: Reply): string {
  return `${label} replied ${reply.status}: ${JSON.stringify(reply.body).slice(0, 300)}`;
}

async function snapshotOf(base: string, client: Client): Promise<Json> {
  const reply = await call(base, 'GET', '/api/progress', client);
  assert.equal(reply.status, 200, describeReply('GET /api/progress', reply));
  return reply.body;
}

function rowsOf(value: unknown): Json[] {
  return Array.isArray(value) ? (value as Json[]) : [];
}

function report(line: string): void {
  console.log(`  ok  ${line}`);
}

async function importEachCaseTwice(base: string, client: Client, importCase: ImportCase) {
  const body = importBody(importCase, 1);
  const first = await postImport(base, client, body);
  assert.equal(first.status, 201, describeReply(`${importCase.id} first import`, first));
  const firstReport = (first.body.report as Json).written;
  assert.deepEqual(firstReport, importCase.expect.written, `${importCase.id}: rows written`);

  const second = await postImport(base, client, importBody(importCase, 1));
  assert.equal(second.status, 200, describeReply(`${importCase.id} repeated import`, second));
  assert.deepEqual(second.body, first.body, `${importCase.id}: the repeat is not the saved report`);

  const snapshot = await snapshotOf(base, client);
  const exercises = rowsOf(snapshot.exercises);
  assert.equal(exercises.length, 11, `${importCase.id}: exercises in the snapshot`);
  const proofStates = exercises.map((exercise) => (exercise.proof as Json | null)?.state);
  assert.ok(
    proofStates.every((state) => state === 'legacy' || state === undefined),
    `${importCase.id}: a proof that is not legacy: ${JSON.stringify(proofStates)}`,
  );
  assert.ok(proofStates.includes('legacy'), `${importCase.id}: no legacy proof in the snapshot`);
  const seals = rowsOf((snapshot.campaign as Json).seals);
  assert.equal(seals.length, 9, `${importCase.id}: campaign seals in the snapshot`);
  report(`${importCase.id}: 201, then 200 with the same report; 11 exercises, 9 seals`);
}

async function confirmPassword(base: string, client: Client): Promise<void> {
  const reply = await call(
    base,
    'POST',
    '/api/auth/confirm-password',
    client,
    JSON.stringify({ password: client.account.password }),
  );
  assert.equal(reply.status, 201, describeReply('confirm-password', reply));
}

async function resetEverything(base: string, client: Client, importCase: ImportCase) {
  const first = await postImport(base, client, importBody(importCase, 1, { confirm: true }));
  assert.equal(first.status, 201, describeReply('import before the reset', first));
  const before = await snapshotOf(base, client);
  assert.equal(rowsOf(before.exercises).length, 11, 'exercises before the reset');

  const unconfirmed = await call(
    base,
    'POST',
    '/api/progress/reset',
    client,
    JSON.stringify({ format: 2, epoch: 1 }),
  );
  assert.equal(unconfirmed.status, 423, describeReply('reset without the password', unconfirmed));
  assert.equal(unconfirmed.body.code, 'password_confirmation_required');

  await confirmPassword(base, client);
  const reset = await call(
    base,
    'POST',
    '/api/progress/reset',
    client,
    JSON.stringify({ format: 2, epoch: 1 }),
  );
  assert.equal(reset.status, 200, describeReply('reset', reset));
  assert.equal(reset.body.epoch, 2, 'the epoch after the reset');
  assert.equal(
    reset.body.revision,
    (before.revision as number) + 1,
    'the revision after the reset',
  );
  report('«Borrar todo» with the confirmed password answers 200 and raises the epoch');

  const emptied = await snapshotOf(base, client);
  assert.equal(rowsOf(emptied.exercises).length, 0, 'exercises after the reset');
  assert.equal(rowsOf((emptied.campaign as Json).seals).length, 0, 'seals after the reset');

  const stale = await call(
    base,
    'POST',
    '/api/sync',
    client,
    JSON.stringify({
      epoch: 1,
      sentAt: new Date().toISOString(),
      knownRevision: 0,
      format: 2,
      operations: [],
    }),
  );
  assert.equal(stale.status, 409, describeReply('sync with the old epoch', stale));
  assert.equal(stale.body.code, 'epoch_mismatch');
  assert.equal(stale.body.epoch, 2, 'the 409 of the sync carries the new epoch');
  report('the old sync gets 409 epoch_mismatch with the new epoch');

  const needsConfirmation = await postImport(base, client, importBody(importCase, 2));
  assert.equal(needsConfirmation.status, 409, describeReply('reimport', needsConfirmation));
  assert.equal(needsConfirmation.body.code, 'import_needs_confirmation');
  const restored = await postImport(base, client, importBody(importCase, 2, { confirm: true }));
  assert.equal(restored.status, 201, describeReply('reimport with confirm', restored));
  const after = await snapshotOf(base, client);
  assert.equal(rowsOf(after.exercises).length, 11, 'exercises after the reimport');
  report('the export gets 409 import_needs_confirmation and then 201 with confirm');
}

async function checkBodyLimit(base: string): Promise<void> {
  const oversized = Buffer.alloc(BODY_LIMIT_BYTES + 1, 0x20);
  const client: Client = { account: null as never, cookies: new Map(), userId: 0 };
  const reply = await call(base, 'POST', '/api/progress/import', client, oversized);
  assert.equal(reply.status, 413, `a body of 24 MiB plus one byte replied ${reply.status}`);
  report('a body of 24 MiB plus one byte gets 413 from Nginx');
}

function syntheticImport(exerciseIds: string[]): ImportCase {
  const draft = 'let value = compute(input); // a draft line\n'.repeat(1).padEnd(DRAFT_CHARS, 'x');
  const records: Json = {};
  for (const id of exerciseIds) {
    records[id] = { predictionCorrect: false, assisted: false, solutionSeen: false, draft };
  }
  const lab = { version: 1, records, selected: { rust: null, go: null } };
  return {
    id: 'synthetic-274-drafts',
    source: 'storage',
    raw: JSON.stringify({ 'taller-laboratorio-v1': JSON.stringify(lab) }),
    normalized: { lab },
    expect: { written: {} },
  };
}

function logLinesOf(importId: string): Json[] {
  const output = compose(['logs', '--no-log-prefix', 'php']);
  return output
    .split('\n')
    .filter((line) => line.includes('progress.import.applied') && line.includes(importId))
    .map((line) => parseBody(line.slice(line.indexOf('{'))));
}

function fpmMemoryLimit(): string {
  const info = compose(['exec', '-T', 'php', 'php-fpm', '-i']);
  return info.match(/^memory_limit => (\S+)/m)?.[1] ?? 'unknown';
}

async function measureImport(base: string, client: Client): Promise<void> {
  const exerciseIds = queryDatabase(
    `SELECT id FROM exercises WHERE status = 'active' ORDER BY id`,
  ).split('\n');
  assert.equal(exerciseIds.length, SEEDED_EXERCISES, 'active exercises in the content');
  const synthetic = syntheticImport(exerciseIds);
  const rawBytes = Buffer.byteLength(synthetic.raw, 'utf8');
  assert.ok(rawBytes < RAW_LIMIT_BYTES, `the synthetic raw is ${rawBytes} bytes, over the limit`);

  const idleSync = await call(
    base,
    'POST',
    '/api/sync',
    client,
    JSON.stringify({
      epoch: 1,
      sentAt: new Date().toISOString(),
      knownRevision: 0,
      format: 2,
      operations: [],
    }),
  );
  assert.equal(idleSync.status, 200, describeReply('idle sync', idleSync));

  const importId = randomUUID();
  const body = importBody(synthetic, 1, { importId });
  const importing = postImport(base, client, body);
  await sleep(LOCK_PROBE_DELAY_MS);
  const probeStartedAt = performance.now();
  const probe = await call(
    base,
    'POST',
    '/api/sync',
    client,
    JSON.stringify({
      epoch: 1,
      sentAt: new Date().toISOString(),
      knownRevision: 0,
      format: 2,
      operations: [],
    }),
  );
  const probeFinishedAfterMs = performance.now() - probeStartedAt + LOCK_PROBE_DELAY_MS;
  const imported = await importing;
  assert.equal(imported.status, 201, describeReply('synthetic import', imported));
  assert.equal(probe.status, 200, describeReply('sync during the import', probe));
  assert.equal(
    (imported.body.report as { written: Json }).written.drafts,
    SEEDED_EXERCISES,
    'drafts written by the synthetic import',
  );

  await sleep(500);
  const [applied] = logLinesOf(importId);
  assert.ok(applied, 'no progress.import.applied line in the php logs');
  const context = (applied.context ?? applied) as Json;
  const peakMib = (context.peak_memory_bytes as number) / 1024 / 1024;
  const limit = fpmMemoryLimit();
  const limitMib = Number.parseInt(limit, 10);
  console.log(
    `  measurement: ${SEEDED_EXERCISES} drafts of ${DRAFT_CHARS} chars, raw ${rawBytes} bytes`,
  );
  console.log(`    request duration (client): ${imported.milliseconds.toFixed(0)} ms`);
  console.log(`    duration (progress.import.applied): ${String(context.duration_ms)} ms`);
  console.log(
    `    concurrent sync of the same account waited ${probe.milliseconds.toFixed(0)} ms (idle sync: ${idleSync.milliseconds.toFixed(0)} ms); it returned ${probeFinishedAfterMs.toFixed(0)} ms after the import started, so the lock was held about that long`,
  );
  console.log(`    peak memory: ${peakMib.toFixed(1)} MiB of memory_limit ${limit}`);
  console.log(`    written: ${JSON.stringify(context.written)}`);
  if (peakMib > limitMib * 0.7) {
    console.log(`    WARNING: the peak memory passes 70% of memory_limit`);
  }
}

function leftoverRows(userIds: number[]): string[] {
  const leftovers: string[] = [];
  const ids = userIds.join(',');
  if (userIds.length > 0) {
    for (const table of TABLES_WITH_USER_ID) {
      const count = Number(
        queryDatabase(`SELECT COUNT(*) FROM ${table} WHERE user_id IN (${ids})`),
      );
      if (count > 0) leftovers.push(`${table}: ${count}`);
    }
  }
  const accounts = Number(
    queryDatabase(`SELECT COUNT(*) FROM users WHERE email LIKE 'check-%@taller.invalid'`),
  );
  if (accounts > 0) leftovers.push(`users: ${accounts}`);
  const invitations = Number(
    queryDatabase(`SELECT COUNT(*) FROM invitations WHERE email LIKE 'check-%@taller.invalid'`),
  );
  if (invitations > 0) leftovers.push(`invitations: ${invitations}`);
  return leftovers;
}

function closeAll(clients: Client[]): unknown {
  let failure: unknown;
  for (const client of clients) {
    try {
      client.account.close();
    } catch (error) {
      failure ??= error;
    }
  }
  return failure;
}

async function runStages(base: string, clients: Client[]): Promise<void> {
  const cases = importCases();
  assert.equal(cases.length, 3, 'import-cases.json has three cases');
  const stages: Stage[] = [
    ...cases.map((importCase): Stage => ({
      name: `Import fixture ${importCase.id}`,
      run: (client) => importEachCaseTwice(base, client, importCase),
    })),
    {
      name: 'Borrar todo and the export',
      run: (client) => resetEverything(base, client, cases[1]),
    },
    { name: 'SC-010 measurement', run: (client) => measureImport(base, client) },
  ];
  for (const stage of stages) {
    console.log(stage.name);
    const client = await openClientWhenAllowed(base);
    clients.push(client);
    await stage.run(client);
  }
  console.log('Nginx body limit');
  await checkBodyLimit(base);
}

const base = address();
const clients: Client[] = [];
let failure: unknown;
try {
  await runStages(base, clients);
} catch (error) {
  failure = error;
} finally {
  const closeFailure = closeAll(clients);
  failure ??= closeFailure;
  if (closeFailure === undefined) {
    const leftovers = leftoverRows(clients.map((client) => client.userId));
    if (leftovers.length > 0 && failure === undefined) {
      failure = new Error(`rows left for the check accounts: ${leftovers.join(', ')}`);
    }
    if (leftovers.length === 0) report('cleanup: no row and no check account is left');
  }
}
if (failure !== undefined) throw failure;
console.log('api-import-check: PASS');
