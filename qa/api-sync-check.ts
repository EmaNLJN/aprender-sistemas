import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { request, type IncomingHttpHeaders } from 'node:http';
import { loadavg } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { openAccount, type CheckAccount } from './lib/api-account.ts';

type Json = Record<string, unknown>;

interface Client {
  account: CheckAccount;
  cookie: string;
  xsrf: string;
  userId: number;
  epoch: number;
  revision: number;
  contentVersion: string | null;
}

interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: Json;
  bytes: number;
  milliseconds: number;
}

interface Result {
  id: string;
  status: string;
  reason?: string;
}

interface Envelope {
  epoch?: number;
  sentAt?: string;
  knownRevision?: number;
  knownContentVersion?: string | null;
  operations?: Json[];
}

interface References {
  rustExercise: string;
  otherRustExercise: string;
  goExercise: string;
  hintedExercise: string;
  worldId: string;
  workshopId: string;
  objectiveKey: string;
  stepKey: string;
  guideStepId: string;
  resourceId: string;
}

interface ClockMeasure {
  seconds: number[];
  rejected: number;
}

const INVITATION_WINDOW_MS = 61_000;
const ACCOUNT_BUDGET_MS = 600_000;
const CLASSROOM_SIZE = 30;
const CLASSROOM_ROUNDS = 3;
const TYPICAL_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 200;
const MAX_TEXT_CHARS = 10_000;
const REQUEST_BODY_LIMIT = 2 * 1024 * 1024;
const PER_MINUTE_LIMIT = 60;
const PRUNE_AGE_DAYS = 15;
const TOMBSTONE_GAP_MS = 10_000;
const SEEDED_EXERCISES = 274;
const TABLES_WITH_USER_ID = [
  'sync_operations',
  'drafts',
  'campaign_checkpoints',
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
      'api-sync-check: cannot find the running taller service; start the stack with `docker compose up -d --wait` or set TALLER_URL',
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
  payload?: string,
): Promise<Reply> {
  const headers: Record<string, string> = { Accept: 'application/json', Cookie: client.cookie };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    headers['X-XSRF-TOKEN'] = client.xsrf;
    headers['X-Taller-User'] = String(client.userId);
  }
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const outgoing = request(`${base}${path}`, { method, headers, agent: false }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        const raw = Buffer.concat(chunks);
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: parseBody(raw.toString('utf8')),
          bytes: raw.length,
          milliseconds: performance.now() - startedAt,
        });
      });
    });
    outgoing.on('error', reject);
    outgoing.end(payload);
  });
}

function xsrfOf(cookie: string): string {
  const pair = cookie.split('; ').find((entry) => entry.startsWith('XSRF-TOKEN='));
  return decodeURIComponent(pair?.slice('XSRF-TOKEN='.length) ?? '');
}

async function openClient(base: string): Promise<Client> {
  const account = await openAccount(base);
  try {
    const probe = { cookie: account.cookie } as Client;
    const reply = await call(base, 'GET', '/api/session', probe);
    const user = reply.body.user as { id?: number } | null;
    assert.ok(user && typeof user.id === 'number', 'GET /api/session did not return the account');
    return {
      account,
      cookie: account.cookie,
      xsrf: xsrfOf(account.cookie),
      userId: user.id,
      epoch: 1,
      revision: 0,
      contentVersion: null,
    };
  } catch (error) {
    account.close();
    throw error;
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isInvitationThrottled(error: unknown): boolean {
  return error instanceof Error && error.message === 'accepting the invitation replied 429';
}

async function openClientWhenAllowed(base: string, deadline: number): Promise<Client | null> {
  while (Date.now() < deadline) {
    try {
      return await openClient(base);
    } catch (error) {
      if (!isInvitationThrottled(error)) throw error;
      await sleep(INVITATION_WINDOW_MS);
    }
  }
  return null;
}

function shareSession(client: Client): Client {
  return { ...client, revision: 0, contentVersion: null };
}

function operation(type: string, fields: Json, ageMilliseconds = 0): Json {
  return {
    id: randomUUID(),
    type,
    at: new Date(Date.now() - ageMilliseconds).toISOString(),
    ...fields,
  };
}

function envelope(client: Client, operations: Json[], overrides: Envelope = {}): string {
  const body: Json = {
    epoch: client.epoch,
    sentAt: new Date().toISOString(),
    knownRevision: client.revision,
    format: 2,
    operations,
    ...overrides,
  };
  if (client.contentVersion !== null) body.knownContentVersion = client.contentVersion;
  if (overrides.knownContentVersion !== undefined) {
    body.knownContentVersion = overrides.knownContentVersion;
  }
  return JSON.stringify(body);
}

function adopt(client: Client, reply: Reply): void {
  if (reply.status !== 200) return;
  client.revision = reply.body.revision as number;
  client.contentVersion = reply.body.contentVersion as string;
  client.epoch = reply.body.epoch as number;
}

async function sync(
  base: string,
  client: Client,
  operations: Json[],
  overrides: Envelope = {},
): Promise<Reply> {
  const reply = await call(
    base,
    'POST',
    '/api/sync',
    client,
    envelope(client, operations, overrides),
  );
  adopt(client, reply);
  return reply;
}

async function syncApplied(base: string, client: Client, operations: Json[]): Promise<Reply> {
  const reply = await sync(base, client, operations);
  assert.equal(
    reply.status,
    200,
    `POST /api/sync replied ${reply.status}: ${JSON.stringify(reply.body)}`,
  );
  const results = reply.body.results as Result[];
  assert.deepEqual(
    results.map((result) => result.id),
    operations.map((entry) => entry.id),
    'the results do not follow the order of the request',
  );
  const refused = results.filter((result) => result.status !== 'applied');
  assert.deepEqual(refused, [], `operations not applied: ${JSON.stringify(refused)}`);
  return reply;
}

async function progressOf(base: string, client: Client): Promise<Json> {
  const reply = await call(base, 'GET', '/api/progress', client);
  assert.equal(reply.status, 200, `GET /api/progress replied ${reply.status}`);
  return reply.body;
}

function withoutServerTime(snapshot: Json): Json {
  const copy = { ...snapshot };
  delete copy.serverTime;
  return copy;
}

function rowsOf(value: unknown): Json[] {
  return value as Json[];
}

function rowWhere(rows: Json[], key: Json): Json {
  const found = rows.find((row) =>
    Object.entries(key).every(([name, expected]) => row[name] === expected),
  );
  assert.ok(found, `no row with the key ${JSON.stringify(key)}`);
  return found;
}

function changesOf(reply: Reply): Json {
  return reply.body.changes as Json;
}

function mentions(reply: Reply, marker: string): boolean {
  return JSON.stringify(changesOf(reply)).includes(marker);
}

function report(message: string): void {
  console.log(`  ok   ${message}`);
}

function discoverReferences(): References {
  const first = (statement: string): string => queryDatabase(statement).split('\n')[0].trim();
  const pair = first(
    `SELECT o.workshop_id, o.objective_key, (SELECT s.step_key FROM workshop_steps s WHERE s.workshop_id = o.workshop_id AND s.status = 'active' ORDER BY s.position LIMIT 1) FROM workshop_objectives o WHERE o.status = 'active' ORDER BY o.workshop_id, o.position LIMIT 1`,
  ).split('\t');
  const exercises = queryDatabase(
    `SELECT id FROM exercises WHERE status = 'active' AND language = 'rust' ORDER BY id LIMIT 2`,
  ).split('\n');
  return {
    rustExercise: exercises[0],
    otherRustExercise: exercises[1],
    goExercise: first(
      `SELECT id FROM exercises WHERE status = 'active' AND language = 'go' ORDER BY id LIMIT 1`,
    ),
    hintedExercise: first(
      `SELECT exercise_id FROM exercise_hints WHERE status = 'active' ORDER BY exercise_id LIMIT 1`,
    ),
    worldId: first(`SELECT id FROM worlds WHERE status = 'active' ORDER BY id LIMIT 1`),
    workshopId: pair[0],
    objectiveKey: pair[1],
    stepKey: pair[2],
    guideStepId: first(`SELECT id FROM guide_steps WHERE status = 'active' ORDER BY id LIMIT 1`),
    resourceId: first(`SELECT id FROM guide_resources WHERE status = 'active' ORDER BY id LIMIT 1`),
  };
}

async function checkConvergence(
  base: string,
  account: Client,
  references: References,
  order: string,
): Promise<void> {
  const clients: Record<string, Client> = { A: account, B: shareSession(account) };
  const exerciseId = references.rustExercise;
  const edits: Record<string, Json[]> = {
    A: [
      operation('exercise.reflection', { exerciseId, text: 'reflexion de A' }, 20_000),
      operation(
        'workshop.note',
        { workshopId: references.workshopId, language: 'rust', text: 'nota de taller de A' },
        20_000,
      ),
    ],
    B: [
      operation('exercise.reflection', { exerciseId, text: 'reflexion de B' }, 10_000),
      operation(
        'route.note',
        { language: 'rust', field: 'learned', body: 'nota de ruta de B' },
        10_000,
      ),
    ],
  };
  const markers: Record<string, string> = { A: 'nota de taller de A', B: 'nota de ruta de B' };
  const [first, second] = [order[0], order[1]];
  const firstReply = await syncApplied(base, clients[first], edits[first]);
  const secondReply = await syncApplied(base, clients[second], edits[second]);
  const returningReply = await syncApplied(base, clients[first], []);

  assert.equal(
    mentions(firstReply, markers[second]),
    false,
    `the first sync (${first}) carries what ${second} wrote later`,
  );
  assert.equal(
    mentions(secondReply, markers[first]),
    true,
    `the second sync (${second}) lacks what ${first} wrote`,
  );
  assert.equal(
    returningReply.body.revision,
    secondReply.body.revision,
    'the query changed the revision',
  );
  assert.equal(changesOf(returningReply).full, false, 'the returning client did not get a delta');
  assert.equal(
    mentions(returningReply, markers[second]),
    true,
    `${first} did not learn what ${second} wrote`,
  );
  const winner = rowWhere(rowsOf(changesOf(secondReply).exercises), { exerciseId });
  assert.equal(
    (winner.reflection as Json).text,
    'reflexion de B',
    `${second} did not receive the winning reflection`,
  );

  const snapshotOfA = withoutServerTime(await progressOf(base, clients.A));
  const snapshotOfB = withoutServerTime(await progressOf(base, clients.B));
  assert.deepEqual(
    snapshotOfA,
    snapshotOfB,
    `order ${order}: the two clients read different snapshots`,
  );
  const exercise = rowWhere(rowsOf(snapshotOfA.exercises), { exerciseId });
  assert.equal(
    (exercise.reflection as Json).text,
    'reflexion de B',
    `order ${order}: the newest clock lost`,
  );
  const workshops = snapshotOfA.workshops as Json;
  const note = rowWhere(rowsOf(workshops.progress), {
    workshopId: references.workshopId,
    language: 'rust',
  });
  assert.equal(
    (note.note as Json).text,
    'nota de taller de A',
    `order ${order}: A's workshop note was lost`,
  );
  const route = snapshotOfA.route as Json;
  const learned = rowWhere(rowsOf(route.notes), { language: 'rust', field: 'learned' });
  assert.equal(learned.body, 'nota de ruta de B', `order ${order}: B's route note was lost`);
  report(`SC-002 order ${order}: the two clients converge on the same snapshot`);
}

async function checkRetries(base: string, client: Client, references: References): Promise<void> {
  const original = operation('preference.set', { name: 'routeLanguage', value: 'go' }, 60_000);
  const baseline = (await syncApplied(base, client, [])).body.revision as number;
  const statuses: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reply = await sync(base, client, [original]);
    statuses.push((reply.body.results as Result[])[0].status);
    assert.equal(
      reply.body.revision,
      baseline + 1,
      `attempt ${attempt + 1}: the revision did not rise exactly once`,
    );
  }
  assert.deepEqual(statuses, ['applied', 'duplicate', 'duplicate'], 'the same batch three times');
  report('SC-003: the same batch three times is applied once and the revision rises once');

  const reused = await sync(base, client, [{ ...original, value: 'rust' }]);
  assert.equal(
    (reused.body.results as Result[])[0].status,
    'uuid_reused',
    'the same id with other content',
  );
  const afterReuse = (await progressOf(base, client)).preferences as Json;
  assert.equal(
    (afterReuse.routeLanguage as Json).value,
    'go',
    'uuid_reused overwrote the stored value',
  );
  report('SC-003: the same id with another content is uuid_reused and writes nothing');

  const twin = [
    operation('exercise.assist', { exerciseId: references.rustExercise, assisted: true }),
  ];
  const before = (await syncApplied(base, client, [])).body.revision as number;
  const [left, right] = await Promise.all([sync(base, client, twin), sync(base, client, twin)]);
  const concurrent = [left, right]
    .map((reply) => (reply.body.results as Result[])[0].status)
    .sort();
  assert.deepEqual(concurrent, ['applied', 'duplicate'], 'the same batch from two tabs at once');
  assert.equal(left.body.revision, before + 1, 'two tabs: the revision did not rise exactly once');
  assert.equal(right.body.revision, before + 1, 'two tabs: the revision did not rise exactly once');
  client.revision = before + 1;
  report('SC-003: the same batch sent twice at once is applied once');

  await checkPrune(base, client, original);
}

async function checkPrune(base: string, client: Client, older: Json): Promise<void> {
  const newer = operation('preference.set', { name: 'routeLanguage', value: 'rust' }, 30_000);
  await syncApplied(base, client, [newer]);
  const revision = client.revision;
  queryDatabase(
    `UPDATE sync_operations SET received_at = received_at - INTERVAL ${PRUNE_AGE_DAYS} DAY WHERE user_id = ${client.userId}`,
  );
  const output = compose(['exec', '-T', 'php', 'php', 'artisan', 'progress:prune-sync-operations']);
  assert.match(output, /borradas: [1-9][0-9]*/, `the prune deleted nothing: ${output.trim()}`);
  const replay = await sync(base, client, [older]);
  assert.equal(
    (replay.body.results as Result[])[0].status,
    'applied',
    'the pruned operation was not applied again',
  );
  assert.equal(replay.body.revision, revision, 'a stale replay moved the revision');
  const stored = (await progressOf(base, client)).preferences as Json;
  assert.equal(
    (stored.routeLanguage as Json).value,
    'rust',
    'the old operation overwrote a newer value',
  );
  report(
    'SC-003: after the prune an old operation is applied again and does not overwrite a newer value',
  );
}

function offsetOf(client: Client, operationId: string): number {
  const hex = operationId.replaceAll('-', '');
  return Number(
    queryDatabase(
      `SELECT clock_offset_ms FROM sync_operations WHERE user_id = ${client.userId} AND operation_id = UNHEX('${hex}')`,
    ),
  );
}

async function checkSkewedClock(
  base: string,
  client: Client,
  references: References,
): Promise<void> {
  const exerciseId = references.otherRustExercise;
  const sentAt = Date.now() + 3_600_000;
  const skewed: Json = {
    ...operation('exercise.reflection', { exerciseId, text: 'reloj adelantado' }),
    at: new Date(sentAt - 5_000).toISOString(),
  };
  const reply = await sync(base, client, [skewed], { sentAt: new Date(sentAt).toISOString() });
  assert.equal(
    (reply.body.results as Result[])[0].status,
    'applied',
    'the skewed batch was not applied',
  );
  const serverTime = Date.parse(reply.body.serverTime as string);
  const stored = rowWhere(rowsOf((await progressOf(base, client)).exercises), { exerciseId });
  const storedAt = Date.parse((stored.reflection as Json).at as string);
  assert.ok(
    Math.abs(storedAt - (serverTime - 5_000)) < 3_000,
    `the operation was dated ${new Date(storedAt).toISOString()}, not five seconds before the server time`,
  );
  assert.ok(
    Math.abs(offsetOf(client, skewed.id as string) + 3_600_000) < 10_000,
    'clock_offset_ms is not near -3600000',
  );

  const onTime = operation('exercise.reflection', { exerciseId, text: 'reloj en hora' });
  await syncApplied(base, client, [onTime]);
  const winner = rowWhere(rowsOf((await progressOf(base, client)).exercises), { exerciseId });
  assert.equal(
    (winner.reflection as Json).text,
    'reloj en hora',
    'the device with the right clock did not win',
  );
  report(
    'SC-002 clocks: a device one hour ahead is dated five seconds before the server and then loses',
  );
}

function seedBatches(references: References): Json[][] {
  const language = 'rust';
  const { workshopId } = references;
  return [
    [
      operation('exercise.prediction', {
        exerciseId: references.rustExercise,
        answer: 0,
        correct: true,
        contentVersion: '{version}',
      }),
      operation('exercise.assist', {
        exerciseId: references.rustExercise,
        assisted: true,
        solutionSeen: true,
      }),
      operation('exercise.hints', { exerciseId: references.hintedExercise, revealed: 1 }),
      operation('exercise.reflection', {
        exerciseId: references.goExercise,
        text: 'una reflexión',
      }),
      operation('exercise.customTest', { exerciseId: references.goExercise, text: 'true' }),
    ],
    [
      operation('exercise.review', {
        exerciseId: references.rustExercise,
        confidence: 'practice',
        reviewedAt: '2026-10-01T00:00:00.000Z',
        reviewDueAt: '2026-10-04T00:00:00.000Z',
      }),
      operation('exercise.draft', {
        exerciseId: references.rustExercise,
        code: 'fn main() {}',
        starterHash: 'a'.repeat(64),
      }),
      operation('checkpoint.answer', {
        worldId: references.worldId,
        answer: 0,
        passed: true,
        contentVersion: '{version}',
      }),
      operation('workshop.prediction', {
        workshopId,
        language,
        answer: 0,
        correct: true,
        contentVersion: '{version}',
      }),
      operation('workshop.note', { workshopId, language, text: 'nota' }),
    ],
    [
      operation('workshop.objective', {
        workshopId,
        language,
        objectiveKey: references.objectiveKey,
      }),
      operation('workshop.step', {
        workshopId,
        language,
        stepKey: references.stepKey,
        marked: true,
      }),
      operation('route.mark', { kind: 'step', itemKey: references.guideStepId, marked: true }),
      operation('route.mark', { kind: 'milestone', itemKey: 'rust-memory', marked: true }),
      operation('route.mark', { kind: 'favorite', itemKey: references.resourceId, marked: true }),
    ],
    [
      operation('route.quiz', {
        stepId: references.guideStepId,
        answer: 0,
        contentVersion: '{version}',
      }),
      operation('route.note', { language: 'go', field: 'next', body: 'lo que sigue' }),
      operation('preference.set', { name: 'focusMinutes', value: 25 }),
      operation('preference.set', { name: 'labSelectedRust', value: references.rustExercise }),
    ],
    [
      operation('workshop.step', {
        workshopId,
        language,
        stepKey: references.stepKey,
        marked: false,
      }),
      operation('route.mark', { kind: 'favorite', itemKey: references.resourceId, marked: false }),
      operation('exercise.draft', {
        exerciseId: references.rustExercise,
        code: null,
        starterHash: null,
      }),
    ],
  ];
}

function olderBy(entry: Json, milliseconds: number): Json {
  return { ...entry, at: new Date(Date.parse(entry.at as string) - milliseconds).toISOString() };
}

function withContentVersion(batch: Json[], contentVersion: string): Json[] {
  return batch.map((entry) =>
    entry.contentVersion === '{version}' ? { ...entry, contentVersion } : entry,
  );
}

const NATURAL_KEYS: Array<[string[], string[]]> = [
  [['exercises'], ['exerciseId']],
  [['drafts'], ['exerciseId']],
  [['campaign', 'checkpoints'], ['worldId']],
  [
    ['workshops', 'progress'],
    ['workshopId', 'language'],
  ],
  [
    ['workshops', 'objectives'],
    ['workshopId', 'language', 'objectiveKey'],
  ],
  [
    ['workshops', 'steps'],
    ['workshopId', 'language', 'stepKey'],
  ],
  [
    ['route', 'marks'],
    ['kind', 'itemKey'],
  ],
  [['route', 'quiz'], ['stepId']],
  [
    ['route', 'notes'],
    ['language', 'field'],
  ],
];

function areaOf(source: Json, path: string[]): Json[] {
  const value = path.reduce<unknown>((current, name) => (current as Json)[name], source);
  return value as Json[];
}

function keyOf(row: Json, names: string[]): string {
  return JSON.stringify(names.map((name) => row[name]));
}

function upsertRows(current: Json[], incoming: Json[], names: string[]): Json[] {
  const byKey = new Map(current.map((row) => [keyOf(row, names), row]));
  for (const row of incoming) byKey.set(keyOf(row, names), row);
  return [...byKey.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([, row]) => row);
}

function applyChanges(local: Json, changes: Json): Json {
  const next = structuredClone(local);
  for (const [path, names] of NATURAL_KEYS) {
    const parent = path.length === 2 ? (next[path[0]] as Json) : next;
    const area = path[path.length - 1];
    parent[area] = upsertRows(areaOf(next, path), areaOf(changes, path), names);
  }
  if (changes.preferences !== null) next.preferences = changes.preferences;
  return next;
}

function sortedSnapshot(snapshot: Json): Json {
  const copy = withoutServerTime(structuredClone(snapshot));
  for (const [path, names] of NATURAL_KEYS) {
    const parent = path.length === 2 ? (copy[path[0]] as Json) : copy;
    const area = path[path.length - 1];
    parent[area] = upsertRows([], areaOf(copy, path), names);
  }
  return copy;
}

async function checkSnapshotPlusDelta(
  base: string,
  client: Client,
  references: References,
): Promise<void> {
  const batches = seedBatches(references).map((batch, index, all) =>
    index === all.length - 1 ? batch : batch.map((entry) => olderBy(entry, TOMBSTONE_GAP_MS)),
  );
  const contentVersion = (await syncApplied(base, client, [])).body.contentVersion as string;
  await syncApplied(base, client, withContentVersion(batches[0], contentVersion));
  const anchorRevision = client.revision;
  let local = await progressOf(base, client);
  const anchor = structuredClone(local);
  for (const batch of batches.slice(1)) {
    const reply = await syncApplied(base, client, withContentVersion(batch, contentVersion));
    assert.equal(changesOf(reply).full, false, 'a follow-up batch answered with the full snapshot');
    local = { ...applyChanges(local, changesOf(reply)), revision: reply.body.revision };
  }
  const full = await progressOf(base, client);
  assert.deepEqual(
    sortedSnapshot(local),
    sortedSnapshot(full),
    'snapshot plus the deltas differs from the full snapshot',
  );

  const oneDelta = await sync(base, client, [], { knownRevision: anchorRevision });
  assert.equal(changesOf(oneDelta).full, false, 'the single delta was full');
  const rebuilt = {
    ...applyChanges(anchor, changesOf(oneDelta)),
    revision: oneDelta.body.revision,
  };
  assert.deepEqual(
    sortedSnapshot(rebuilt),
    sortedSnapshot(full),
    'snapshot plus one delta differs from the full snapshot',
  );
  client.revision = oneDelta.body.revision as number;
  const draft = rowWhere(rowsOf(full.drafts), { exerciseId: references.rustExercise });
  assert.equal(draft.code, null, 'the draft tombstone is not in the snapshot');
  report(
    'SC-006: snapshot plus deltas equals the full snapshot for all sixteen types, tombstones included',
  );
}

async function checkFullTriggers(base: string, client: Client): Promise<void> {
  const unknownVersion = await sync(base, client, [], { knownContentVersion: 'f'.repeat(32) });
  const noRevision = await sync(base, client, [], { knownRevision: 0 });
  const future = await sync(base, client, [], { knownRevision: client.revision + 1_000 });
  const current = await sync(base, client, []);
  assert.equal(
    changesOf(unknownVersion).full,
    true,
    'another contentVersion did not give full: true',
  );
  assert.equal(changesOf(noRevision).full, true, 'knownRevision 0 did not give full: true');
  assert.equal(
    changesOf(future).full,
    true,
    'a knownRevision above the server did not give full: true',
  );
  assert.equal(changesOf(current).full, false, 'a current client did not get a delta');
  assert.equal(
    unknownVersion.body.contentVersion,
    current.body.contentVersion,
    'the contentVersion changed',
  );
  report('US6: another contentVersion, revision 0 and a future revision give full: true');
}

async function checkEpoch(base: string, client: Client): Promise<void> {
  const writes = [operation('preference.set', { name: 'focusMinutes', value: 45 })];
  const before = await syncApplied(base, client, []);
  queryDatabase(`UPDATE progress_heads SET epoch = 2 WHERE user_id = ${client.userId}`);
  const stale = await sync(base, client, writes);
  assert.equal(stale.status, 409, `an old epoch replied ${stale.status}`);
  assert.equal(stale.body.code, 'epoch_mismatch', 'the code of the old epoch');
  assert.equal(stale.body.epoch, 2, 'the 409 does not carry the current epoch');
  assert.equal(
    stale.body.revision,
    before.body.revision,
    'the 409 does not carry the current revision',
  );
  client.epoch = 2;
  const unchanged = (await progressOf(base, client)).preferences as Json;
  assert.equal((unchanged.focusMinutes as Json).value, 25, 'the 409 wrote something');
  const retried = await sync(base, client, writes);
  assert.equal(
    (retried.body.results as Result[])[0].status,
    'applied',
    'the 409 batch remembered its UUIDs',
  );
  assert.equal(
    retried.body.revision,
    (before.body.revision as number) + 1,
    'the retried batch did not raise the revision once',
  );
  report('FR-043: a stale epoch gets 409 epoch_mismatch, writes nothing and forgets the UUIDs');
}

async function checkLogsWithoutText(
  base: string,
  client: Client,
  references: References,
): Promise<void> {
  const sentinel = `TALLER_CENTINELA_${randomBytes(8).toString('hex')}`;
  const { workshopId } = references;
  await syncApplied(base, client, [
    operation('exercise.reflection', { exerciseId: references.goExercise, text: sentinel }),
    operation('exercise.draft', {
      exerciseId: references.goExercise,
      code: `// ${sentinel}`,
      starterHash: 'b'.repeat(64),
    }),
    operation('workshop.note', { workshopId, language: 'go', text: sentinel }),
    operation('route.note', { language: 'go', field: 'learned', body: sentinel }),
  ]);
  const logs = compose(['logs', '--no-color', 'php', 'taller', 'scheduler']);
  const leaked = logs.split('\n').filter((line) => line.includes(sentinel));
  assert.equal(leaked.length, 0, `${leaked.length} log lines carry the sentinel ${sentinel}`);
  const syncLines = logs.split('\n').filter((line) => line.includes('/api/sync'));
  assert.ok(syncLines.length > 0, 'Nginx logged no POST /api/sync');
  assert.equal(
    syncLines.some((line) => line.includes('user_id')),
    false,
    'a D1a route logged a user_id',
  );
  report('FR-057: php, taller and scheduler logs carry no text and no user_id on /api/sync');
}

async function checkLimits(base: string, client: Client): Promise<void> {
  const tooMany = Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, index) =>
    operation('preference.set', { name: 'focusMinutes', value: index % 2 === 0 ? 15 : 25 }),
  );
  const rejected = await sync(base, client, tooMany);
  assert.equal(rejected.status, 422, `201 operations replied ${rejected.status}`);
  assert.equal(rejected.body.code, 'validation_failed', 'the code of 201 operations');
  const untouched = await progressOf(base, client);
  assert.equal(untouched.revision, 0, '201 operations wrote something');
  report('SC-008: 201 operations get 422 and apply nothing');

  let sent = 1;
  let last = rejected;
  while (last.status !== 429 && sent <= PER_MINUTE_LIMIT + 10) {
    last = await sync(base, client, []);
    sent += 1;
  }
  assert.equal(last.status, 429, 'no 429 after the per-minute limit');
  assert.equal(
    sent,
    PER_MINUTE_LIMIT + 1,
    `the 429 came at request ${sent}, not ${PER_MINUTE_LIMIT + 1}`,
  );
  assert.match(
    String(last.headers['retry-after'] ?? ''),
    /^[1-9][0-9]*$/,
    'the 429 has no Retry-After',
  );
  assert.equal(last.body.code, 'too_many_requests', 'the code of the 429');
  report('SC-008: the 61st sync of the minute gets 429 with Retry-After');
}

function seedFullAccount(userId: number): void {
  const now = 'NOW(3)';
  queryDatabase(
    [
      `INSERT INTO progress_heads (user_id, epoch, revision, created_at, updated_at) VALUES (${userId}, 1, 1, ${now}, ${now})`,
      `INSERT INTO attempts (user_id, exercise_id, epoch, legacy, outcome, grading_hash, code_sha256, attempted_at, finished_at, created_at) SELECT ${userId}, id, 1, 0, 'passed', grading_hash, SHA2(id, 256), ${now}, ${now}, ${now} FROM exercises`,
      `INSERT INTO attempt_tests (attempt_id, test_key, exercise_id, position, outcome) SELECT a.id, t.test_key, t.exercise_id, t.position, 'pass' FROM attempts a JOIN exercise_tests t ON t.exercise_id = a.exercise_id WHERE a.user_id = ${userId} AND t.status = 'active' AND t.position IS NOT NULL`,
      `INSERT INTO exercise_progress (user_id, exercise_id, solved_at, server_solved_at, proof_attempt_id, proof_at, last_attempt_id, last_attempt_at, attempt_count, prediction_answer, prediction_answer_set_at, prediction_correct, prediction_correct_at, hints_revealed, reflection, reflection_set_at, custom_test, custom_test_set_at, confidence, reviewed_at, review_due_at, review_set_at, revision, created_at, updated_at) SELECT ${userId}, e.id, ${now}, ${now}, a.id, ${now}, a.id, ${now}, 3, 1, ${now}, 1, ${now}, 1, REPEAT('Reflexion sobre el ejercicio. ', 40), ${now}, 'true', ${now}, 'confident', ${now}, ${now} + INTERVAL 3 DAY, ${now}, 1, ${now}, ${now} FROM exercises e JOIN attempts a ON a.exercise_id = e.id AND a.user_id = ${userId}`,
      `INSERT INTO drafts (user_id, exercise_id, code, starter_hash, set_at, revision, created_at, updated_at) SELECT ${userId}, id, solution, starter_hash, ${now}, 1, ${now}, ${now} FROM exercises`,
    ].join('; '),
  );
}

function percentile(sortedValues: number[], fraction: number): number {
  if (sortedValues.length === 0) return Number.NaN;
  const rank = Math.ceil(fraction * sortedValues.length);
  return sortedValues[Math.max(rank - 1, 0)];
}

function describeTimings(label: string, measure: ClockMeasure): string {
  const sorted = [...measure.seconds].sort((left, right) => left - right);
  const format = (value: number): string => (value * 1000).toFixed(0);
  return `${label}: ${sorted.length} replies, median ${format(percentile(sorted, 0.5))} ms, p95 ${format(percentile(sorted, 0.95))} ms, slowest ${format(sorted[sorted.length - 1] ?? Number.NaN)} ms, not 200: ${measure.rejected}`;
}

async function measureSnapshot(base: string, client: Client): Promise<void> {
  seedFullAccount(client.userId);
  const reply = await call(base, 'GET', '/api/progress', client);
  assert.equal(reply.status, 200, `GET /api/progress replied ${reply.status}`);
  const exercises = rowsOf(reply.body.exercises);
  assert.equal(
    exercises.length,
    SEEDED_EXERCISES,
    'the snapshot does not hold the seeded exercises',
  );
  assert.ok(
    exercises.every((row) => row.proof !== null),
    'a seeded exercise has no proof',
  );
  const raw = Buffer.from(JSON.stringify(reply.body));
  console.log(
    `  SC-010 full snapshot, ${exercises.length} exercises with attempt, drafts, proofs and reflections: ${reply.bytes} bytes (${gzipSync(raw).length} bytes gzipped, ${reply.milliseconds.toFixed(0)} ms)`,
  );
  adopt(client, reply);
}

async function measureLargestBatch(base: string, client: Client): Promise<void> {
  const exerciseIds = queryDatabase(
    `SELECT id FROM exercises ORDER BY id LIMIT ${MAX_BATCH_SIZE}`,
  ).split('\n');
  const text = 'x'.repeat(MAX_TEXT_CHARS);
  const operations = exerciseIds.map((exerciseId) =>
    operation('exercise.reflection', { exerciseId, text }),
  );
  const body = envelope(client, operations);
  const requestBytes = Buffer.byteLength(body);
  assert.ok(
    requestBytes < REQUEST_BODY_LIMIT,
    `the largest batch is ${requestBytes} bytes, over 2 MiB`,
  );
  const reply = await call(base, 'POST', '/api/sync', client, body);
  assert.equal(reply.status, 200, `the largest batch replied ${reply.status}`);
  const refused = (reply.body.results as Result[]).filter((result) => result.status !== 'applied');
  assert.deepEqual(refused, [], 'the largest batch was not fully applied');
  console.log(
    `  SC-010 largest admitted batch, ${MAX_BATCH_SIZE} reflections of ${MAX_TEXT_CHARS} characters: request ${requestBytes} of ${REQUEST_BODY_LIMIT} bytes, response ${reply.bytes} bytes, ${reply.milliseconds.toFixed(0)} ms`,
  );
}

async function typicalRound(
  base: string,
  clients: Client[],
  exerciseId: string,
): Promise<ClockMeasure> {
  const replies = await Promise.all(
    clients.map((client) => {
      const operations = Array.from({ length: TYPICAL_BATCH_SIZE }, (_, index) =>
        operation('exercise.reflection', {
          exerciseId,
          text: `reflexión ${index} ${randomUUID()}`,
        }),
      );
      return sync(base, client, operations);
    }),
  );
  return {
    seconds: replies
      .filter((reply) => reply.status === 200)
      .map((reply) => reply.milliseconds / 1000),
    rejected: replies.filter((reply) => reply.status !== 200).length,
  };
}

async function measureClassroom(
  base: string,
  classroom: Client[],
  exerciseId: string,
): Promise<void> {
  if (classroom.length < CLASSROOM_SIZE) {
    console.log(
      `  LIMIT SC-010 classroom: only ${classroom.length} accounts opened, not ${CLASSROOM_SIZE}; the figures below are not the 30-account classroom`,
    );
  }
  const total: ClockMeasure = { seconds: [], rejected: 0 };
  for (let round = 0; round < CLASSROOM_ROUNDS; round += 1) {
    const measure = await typicalRound(base, classroom, exerciseId);
    total.seconds.push(...measure.seconds);
    total.rejected += measure.rejected;
  }
  console.log(
    `  ${describeTimings(`SC-010 POST /api/sync, ${classroom.length} accounts at once, ${TYPICAL_BATCH_SIZE} operations per batch, ${CLASSROOM_ROUNDS} rounds`, total)}`,
  );
  const heavy = await Promise.all(
    classroom.map((client) => {
      const operations = Array.from({ length: TYPICAL_BATCH_SIZE * 8 }, () =>
        operation('exercise.reflection', { exerciseId, text: randomUUID() }),
      );
      return sync(base, client, operations);
    }),
  );
  console.log(
    `  ${describeTimings(
      `SC-010 POST /api/sync, ${classroom.length} accounts at once, ${TYPICAL_BATCH_SIZE * 8} operations per batch, 1 round`,
      {
        seconds: heavy
          .filter((reply) => reply.status === 200)
          .map((reply) => reply.milliseconds / 1000),
        rejected: heavy.filter((reply) => reply.status !== 200).length,
      },
    )}`,
  );
  console.log(
    '  SC-010 ADR 0006 estimate: 1000 accounts, one batch every 10 s, 100 requests per second against PHP-FPM with 12 to 16 children',
  );
}

function leftoverRows(userIds: number[]): string[] {
  const list = userIds.length > 0 ? userIds.join(',') : '0';
  const leftovers: string[] = [];
  for (const table of TABLES_WITH_USER_ID) {
    const count = Number(queryDatabase(`SELECT COUNT(*) FROM ${table} WHERE user_id IN (${list})`));
    if (count > 0) leftovers.push(`${table}: ${count}`);
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

async function openNamed(base: string, count: number, deadline: number): Promise<Client[]> {
  const opened: Client[] = [];
  while (opened.length < count) {
    const client = await openClientWhenAllowed(base, deadline);
    if (client === null) break;
    opened.push(client);
  }
  return opened;
}

const base = address();
const clients: Client[] = [];
let failure: unknown;
try {
  const references = discoverReferences();
  const deadline = Date.now() + ACCOUNT_BUDGET_MS;
  const opened = await openNamed(base, 5, deadline);
  clients.push(...opened);
  assert.equal(opened.length, 5, 'the five scenario accounts could not be opened in time');
  const [forward, backward, shared, limited, measured] = opened;

  console.log('SC-002 convergence (quickstart 4)');
  await checkConvergence(base, forward, references, 'ABA');
  await checkConvergence(base, backward, references, 'BAB');
  console.log(
    'Idempotency, clocks, snapshot, delta, content version and epoch (quickstart 5 to 8, 10)',
  );
  await checkRetries(base, shared, references);
  await checkSkewedClock(base, shared, references);
  await checkSnapshotPlusDelta(base, shared, references);
  await checkFullTriggers(base, shared);
  await checkLogsWithoutText(base, shared, references);
  await checkEpoch(base, shared);
  console.log('Limits (quickstart 9)');
  await checkLimits(base, limited);

  console.log('SC-010 measurement (quickstart 12)');
  console.log(
    `  load average before measuring (other work on this machine shows here): ${loadavg()
      .map((value) => value.toFixed(2))
      .join(' ')}`,
  );
  await measureSnapshot(base, measured);
  await measureLargestBatch(base, measured);
  const pool = await openNamed(base, CLASSROOM_SIZE, deadline);
  clients.push(...pool);
  await measureClassroom(base, pool, references.rustExercise);
  console.log(
    `  load average after measuring: ${loadavg()
      .map((value) => value.toFixed(2))
      .join(' ')}`,
  );
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
    if (leftovers.length === 0) report('cleanup: no D1a or B2 row and no check account is left');
  }
}
if (failure !== undefined) throw failure;
console.log('api-sync-check: PASS (read the LIMIT lines above: they are not passes).');
