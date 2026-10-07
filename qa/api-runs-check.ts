import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { request, type IncomingHttpHeaders } from 'node:http';
import { join } from 'node:path';
import { openAccount, type CheckAccount } from './lib/api-account.ts';

interface Session {
  account: CheckAccount;
  userId: number;
  xsrf: string;
}

interface RunTest {
  key: string;
  outcome: string;
}

interface Run {
  id: string;
  status: string;
  reason: string | null;
  tests: RunTest[];
}

interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

interface Exercise {
  id: string;
  starter: string;
  solution: string;
}

interface Expectation {
  status: string;
  reason: string | null;
  tests?: RunTest[];
}

interface RunCase {
  name: string;
  code: string;
  customTest?: string;
  expected: Expectation;
}

interface Timing {
  seconds: number;
  rejected: boolean;
}

const POLL_MS = 500;
const CLASSROOM_POLL_MS = 1000;
const FINAL_STATE_TIMEOUT_MS = 90_000;
const POOL_SIZE = 40;
const CLASSROOM_SIZE = 30;
const POOL_BUDGET_MS = 360_000;
const INVITATION_WINDOW_MS = 61_000;
const PER_MINUTE_LIMIT = 10;
const IDLE_RUNS = 5;
const TERMINAL_STATUSES = new Set([
  'passed',
  'failed',
  'compile_error',
  'runtime_error',
  'timeout',
  'infra_error',
  'canceled',
]);

const root = join(import.meta.dirname, '..');
const sentinel = `TALLER_CENTINELA_${randomBytes(8).toString('hex')}`;

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
      'api-runs-check: cannot find the running taller service; start the stack with `docker compose up -d --wait` or set TALLER_URL',
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
    'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -N -e "$1"',
    'sh',
    statement,
  ]).trim();
}

function containsProgramField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsProgramField);
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, nested]) => key === 'program' || containsProgramField(nested),
  );
}

function parseBody(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { unparsed: text.slice(0, 200) };
  }
}

function call(
  base: string,
  method: 'GET' | 'POST',
  path: string,
  session: { cookie: string; xsrf?: string; userId?: number },
  payload?: Record<string, unknown>,
): Promise<Reply> {
  const headers: Record<string, string> = { Accept: 'application/json', Cookie: session.cookie };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    headers['X-XSRF-TOKEN'] = session.xsrf ?? '';
    headers['X-Taller-User'] = String(session.userId);
  }
  return new Promise((resolve, reject) => {
    const outgoing = request(`${base}${path}`, { method, headers, agent: false }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        const body = parseBody(text);
        assert.equal(
          containsProgramField(body),
          false,
          `${method} ${path}: the response carries the assembled program`,
        );
        resolve({ status: response.statusCode ?? 0, headers: response.headers, body });
      });
    });
    outgoing.on('error', reject);
    outgoing.end(payload === undefined ? undefined : JSON.stringify(payload));
  });
}

function xsrfOf(cookie: string): string {
  const pair = cookie.split('; ').find((entry) => entry.startsWith('XSRF-TOKEN='));
  return decodeURIComponent(pair?.slice('XSRF-TOKEN='.length) ?? '');
}

async function openSession(base: string): Promise<Session> {
  const account = await openAccount(base);
  try {
    const reply = await call(base, 'GET', '/api/session', { cookie: account.cookie });
    const user = reply.body.user as { id?: number } | null;
    assert.ok(user && typeof user.id === 'number', 'GET /api/session did not return the account');
    return { account, userId: user.id, xsrf: xsrfOf(account.cookie) };
  } catch (error) {
    account.close();
    throw error;
  }
}

function submit(
  base: string,
  session: Session,
  exerciseId: string,
  code: string,
  customTest?: string,
): Promise<Reply> {
  const payload: Record<string, unknown> = { clientRunId: randomUUID(), exerciseId, code };
  if (customTest !== undefined) payload.customTest = customTest;
  return call(
    base,
    'POST',
    '/api/runs',
    { cookie: session.account.cookie, xsrf: session.xsrf, userId: session.userId },
    payload,
  );
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForFinalState(
  base: string,
  session: Session,
  runId: string,
  pollMs: number,
): Promise<Run> {
  const deadline = Date.now() + FINAL_STATE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const reply = await call(base, 'GET', `/api/runs/${runId}`, {
      cookie: session.account.cookie,
    });
    assert.equal(reply.status, 200, `GET /api/runs/${runId} replied ${reply.status}`);
    const run = reply.body.data as Run;
    if (TERMINAL_STATUSES.has(run.status)) return run;
    await sleep(pollMs);
  }
  throw new Error(`run ${runId} did not reach a final state in ${FINAL_STATE_TIMEOUT_MS / 1000} s`);
}

async function submitAndWait(
  base: string,
  session: Session,
  exerciseId: string,
  code: string,
  customTest?: string,
): Promise<Run> {
  const reply = await submit(base, session, exerciseId, code, customTest);
  assert.equal(
    reply.status,
    202,
    `POST /api/runs replied ${reply.status}: ${JSON.stringify(reply.body)}`,
  );
  return waitForFinalState(base, session, (reply.body.data as Run).id, POLL_MS);
}

function readExercises(): Record<string, Exercise> {
  const curriculum = JSON.parse(readFileSync(join(root, 'build', 'curriculum.json'), 'utf8')) as {
    lab: Record<string, Exercise[]>;
  };
  const exercises: Record<string, Exercise> = {};
  for (const list of Object.values(curriculum.lab)) {
    for (const exercise of list) {
      if (exercise.id === 'rust-01' || exercise.id === 'go-01') exercises[exercise.id] = exercise;
    }
  }
  assert.ok(
    exercises['rust-01'] && exercises['go-01'],
    'rust-01 or go-01 is not in the curriculum',
  );
  return exercises;
}

function allTests(outcomes: string[]): RunTest[] {
  return outcomes.map((outcome, index) => ({ key: `t${index + 1}`, outcome }));
}

function rustCases(exercise: Exercise): RunCase[] {
  const noReason = null;
  return [
    {
      name: 'reference solution',
      code: exercise.solution,
      expected: { status: 'passed', reason: noReason, tests: allTests(['pass', 'pass', 'pass']) },
    },
    {
      name: 'starter code',
      code: exercise.starter,
      expected: { status: 'failed', reason: noReason, tests: allTests(['fail', 'fail', 'fail']) },
    },
    {
      name: 'compile error',
      code: `${exercise.solution}\n)`,
      expected: { status: 'compile_error', reason: noReason },
    },
    {
      name: 'non-zero exit',
      code: `${exercise.solution}\n// ${sentinel}`,
      customTest: `{ println!("${sentinel}"); std::process::exit(101) }`,
      expected: { status: 'runtime_error', reason: noReason },
    },
    {
      name: 'infinite loop',
      code: exercise.solution,
      customTest: '{ loop {} }',
      expected: { status: 'timeout', reason: noReason },
    },
    {
      name: 'overflowing output',
      code: exercise.solution,
      customTest: '{ for _ in 0..200 { println!("{}", "x".repeat(1024)); } true }',
      expected: { status: 'failed', reason: 'output_limit' },
    },
  ];
}

function goCases(exercise: Exercise): RunCase[] {
  const noReason = null;
  return [
    {
      name: 'reference solution',
      code: exercise.solution,
      expected: { status: 'passed', reason: noReason, tests: allTests(['pass', 'pass', 'pass']) },
    },
    {
      name: 'starter code',
      code: exercise.starter,
      expected: { status: 'failed', reason: noReason, tests: allTests(['fail', 'pass', 'fail']) },
    },
    {
      name: 'compile error',
      code: `${exercise.solution}\n)`,
      expected: { status: 'compile_error', reason: noReason },
    },
    {
      name: 'non-zero exit',
      code: `${exercise.solution}\n\nfunc init() { println("${sentinel}"); panic("boom ${sentinel}") }`,
      customTest: `len("${sentinel}") > 0`,
      expected: { status: 'runtime_error', reason: noReason },
    },
    {
      name: 'infinite loop',
      code: exercise.solution,
      customTest: 'func() bool { for {} }()',
      expected: { status: 'timeout', reason: noReason },
    },
    {
      name: 'overflowing output',
      code: exercise.solution,
      customTest:
        'func() bool { for i := 0; i < 200; i++ { fmt.Println(fmt.Sprintf("%01024d", 0)) }; return true }()',
      expected: { status: 'failed', reason: 'output_limit' },
    },
  ];
}

function describeRun(run: Run): string {
  const tests = run.tests.map((test) => `${test.key}=${test.outcome}`).join(',');
  return `status ${run.status}, reason ${run.reason}, tests [${tests}]`;
}

function mismatchesOf(label: string, run: Run, expected: Expectation): string[] {
  const mismatches: string[] = [];
  if (run.status !== expected.status || run.reason !== expected.reason) {
    mismatches.push(
      `${label}: expected status ${expected.status} reason ${expected.reason}, got ${describeRun(run)}`,
    );
  } else if (
    expected.tests !== undefined &&
    JSON.stringify(run.tests) !== JSON.stringify(expected.tests)
  ) {
    mismatches.push(
      `${label}: expected tests ${JSON.stringify(expected.tests)}, got ${describeRun(run)}`,
    );
  }
  return mismatches;
}

async function runLanguageCases(
  base: string,
  session: Session,
  exercise: Exercise,
  cases: RunCase[],
): Promise<string[]> {
  const mismatches: string[] = [];
  for (const testCase of cases) {
    const label = `${exercise.id} ${testCase.name}`;
    const run = await submitAndWait(base, session, exercise.id, testCase.code, testCase.customTest);
    const found = mismatchesOf(label, run, testCase.expected);
    console.log(`  ${found.length === 0 ? 'ok  ' : 'FAIL'} ${label}: ${describeRun(run)}`);
    mismatches.push(...found);
  }
  return mismatches;
}

function assertRetryAfter(reply: Reply, label: string): void {
  const retryAfter = String(reply.headers['retry-after'] ?? '');
  assert.match(retryAfter, /^[1-9][0-9]*$/, `${label}: Retry-After «${retryAfter}»`);
}

function rowsOf(table: string, userIds: number[]): number {
  if (userIds.length === 0) return 0;
  const list = userIds.join(',');
  return Number(queryDatabase(`SELECT COUNT(*) FROM ${table} WHERE user_id IN (${list})`));
}

async function checkQuotas(base: string, session: Session, exercise: Exercise): Promise<void> {
  const first = await submit(base, session, exercise.id, exercise.solution);
  assert.equal(first.status, 202, `first run replied ${first.status}`);
  const second = await submit(base, session, exercise.id, exercise.solution);
  assert.equal(second.status, 429, `the simultaneous second run replied ${second.status}`);
  assert.equal(second.body.code, 'quota_exceeded', 'the second run: code');
  assert.equal(second.body.quota, 'active', 'the second run: quota');
  assertRetryAfter(second, 'active quota');
  await waitForFinalState(base, session, (first.body.data as Run).id, POLL_MS);

  const startedAt = Date.now();
  for (let accepted = 1; accepted < PER_MINUTE_LIMIT; accepted += 1) {
    const run = await submitAndWait(base, session, exercise.id, exercise.solution);
    assert.equal(run.status, 'passed', `quick run ${accepted + 1}: ${describeRun(run)}`);
  }
  const eleventh = await submit(base, session, exercise.id, exercise.solution);
  const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
  assert.equal(
    eleventh.status,
    429,
    `the 11th run in ${elapsedSeconds} s replied ${eleventh.status}; the minute window needs the ten before it within 60 s`,
  );
  assert.equal(eleventh.body.code, 'quota_exceeded', 'the 11th run: code');
  assert.equal(eleventh.body.quota, 'per_minute', 'the 11th run: quota');
  assertRetryAfter(eleventh, 'per_minute quota');
  assert.equal(
    rowsOf('runs', [session.userId]),
    PER_MINUTE_LIMIT,
    'a rejected request left a run behind',
  );
  console.log(
    `  ok   quotas: 2nd simultaneous run and 11th in ${elapsedSeconds} s answer 429 with Retry-After`,
  );
}

function isInvitationThrottled(error: unknown): boolean {
  return error instanceof Error && error.message === 'accepting the invitation replied 429';
}

// C3a throttles invitation acceptance to 10 a minute per network, so the pool waits out each window.
async function openPool(base: string, opened: Session[]): Promise<void> {
  const target = opened.length + POOL_SIZE;
  const startedAt = Date.now();
  while (opened.length < target) {
    if (Date.now() - startedAt > POOL_BUDGET_MS) return;
    try {
      opened.push(await openSession(base));
    } catch (error) {
      if (!isInvitationThrottled(error)) throw error;
      await sleep(INVITATION_WINDOW_MS);
    }
  }
}

async function checkQueueBurst(base: string, pool: Session[], exercise: Exercise): Promise<void> {
  const replies = await Promise.all(
    pool.map((session) => submit(base, session, exercise.id, exercise.solution)),
  );
  const accepted: Array<{ session: Session; runId: string }> = [];
  const rejectedUserIds: number[] = [];
  replies.forEach((reply, index) => {
    if (reply.status === 202) {
      accepted.push({ session: pool[index], runId: (reply.body.data as Run).id });
      return;
    }
    assert.equal(reply.status, 503, `burst request ${index}: replied ${reply.status}`);
    assert.equal(reply.body.code, 'queue_full', `burst request ${index}: code`);
    assertRetryAfter(reply, `burst request ${index}`);
    rejectedUserIds.push(pool[index].userId);
  });
  assert.ok(
    rejectedUserIds.length > 0,
    `none of the ${pool.length} simultaneous runs answered 503 queue_full`,
  );
  assert.equal(rowsOf('runs', rejectedUserIds), 0, 'a request rejected with 503 left a run behind');
  await Promise.all(
    accepted.map(({ session, runId }) =>
      waitForFinalState(base, session, runId, CLASSROOM_POLL_MS),
    ),
  );
  console.log(
    `  ok   burst of ${pool.length} accounts: ${accepted.length} accepted, ${rejectedUserIds.length} answered 503 queue_full with Retry-After and left no run`,
  );
}

async function timeRun(
  base: string,
  session: Session,
  exercise: Exercise,
  pollMs: number,
): Promise<Timing> {
  const startedAt = Date.now();
  const reply = await submit(base, session, exercise.id, exercise.solution);
  if (reply.status === 503) return { seconds: 0, rejected: true };
  assert.equal(reply.status, 202, `measured run replied ${reply.status}`);
  const run = await waitForFinalState(base, session, (reply.body.data as Run).id, pollMs);
  assert.equal(run.status, 'passed', `measured run: ${describeRun(run)}`);
  return { seconds: (Date.now() - startedAt) / 1000, rejected: false };
}

function percentile(sortedValues: number[], fraction: number): number {
  if (sortedValues.length === 0) return Number.NaN;
  const rank = Math.ceil(fraction * sortedValues.length);
  return sortedValues[Math.max(rank - 1, 0)];
}

function summarize(label: string, timings: Timing[]): void {
  const seconds = timings
    .filter((timing) => !timing.rejected)
    .map((timing) => timing.seconds)
    .sort((left, right) => left - right);
  const rejected = timings.filter((timing) => timing.rejected).length;
  const format = (value: number): string => value.toFixed(1);
  console.log(
    `  SC-012 ${label}: ${seconds.length} finished, median ${format(percentile(seconds, 0.5))} s, p95 ${format(percentile(seconds, 0.95))} s, last ${format(seconds[seconds.length - 1] ?? Number.NaN)} s, 503: ${rejected}`,
  );
}

async function measureIdle(base: string, session: Session, exercise: Exercise): Promise<void> {
  const timings: Timing[] = [];
  for (let run = 0; run < IDLE_RUNS; run += 1) {
    timings.push(await timeRun(base, session, exercise, POLL_MS));
  }
  summarize('idle, one account (ADR 0005 expects a median of 1.5 to 3 s)', timings);
}

async function measureClassroom(base: string, pool: Session[], exercise: Exercise): Promise<void> {
  const students = pool.slice(0, CLASSROOM_SIZE);
  if (students.length < CLASSROOM_SIZE) {
    console.log(
      `  LIMIT SC-012 classroom: only ${students.length} accounts opened, not ${CLASSROOM_SIZE}; the figures below are not the 30-account classroom`,
    );
  }
  const timings = await Promise.all(
    students.map((session) => timeRun(base, session, exercise, CLASSROOM_POLL_MS)),
  );
  summarize(
    `classroom of ${students.length} accounts at once (ADR 0006 expects about 20 s for the last of 30)`,
    timings,
  );
}

function assertSentinelAbsentFromLogs(): void {
  const logs = compose(['logs', '--no-color', 'php', 'worker-runs', 'scheduler']);
  const lines = logs.split('\n').filter((line) => line.includes(sentinel));
  assert.equal(lines.length, 0, `${lines.length} log lines carry the sentinel ${sentinel}`);
  console.log('  ok   SC-008: php, worker-runs and scheduler logs carry no sentinel line');
}

function assertNoRowsLeft(userIds: number[]): void {
  for (const table of ['runs', 'attempts', 'exercise_progress', 'progress_heads']) {
    assert.equal(rowsOf(table, userIds), 0, `${table} keeps rows of the check accounts`);
  }
  console.log('  ok   cleanup: no B2 row is left for the check accounts');
}

const base = address();
execFileSync(process.execPath, [join(root, 'tools', 'content', 'build-curriculum.ts')], {
  stdio: 'inherit',
});
const exercises = readExercises();
const rustExercise = exercises['rust-01'];
const goExercise = exercises['go-01'];

const sessions: Session[] = [];
let failure: unknown;
try {
  const [rustSession, goSession, quotaSession] = [
    await openSession(base),
    await openSession(base),
    await openSession(base),
  ];
  sessions.push(rustSession, goSession, quotaSession);

  console.log('SC-001: twelve cases against the real executor');
  const caseMismatches = (
    await Promise.all([
      runLanguageCases(base, rustSession, rustExercise, rustCases(rustExercise)),
      runLanguageCases(base, goSession, goExercise, goCases(goExercise)),
    ])
  ).flat();
  assert.deepEqual(caseMismatches, [], `SC-001 mismatches:\n${caseMismatches.join('\n')}`);

  console.log('SC-003: quotas and queue');
  await checkQuotas(base, quotaSession, goExercise);
  await openPool(base, sessions);
  const pool = sessions.slice(3);
  if (pool.length < POOL_SIZE) {
    console.log(
      `  LIMIT SC-003 burst: ${pool.length} of ${POOL_SIZE} accounts opened within ${POOL_BUDGET_MS / 1000} s; the 503 queue_full tramo was skipped`,
    );
  } else {
    await checkQueueBurst(base, pool, rustExercise);
  }

  console.log('SC-012: measurement');
  if (pool.length > 0) {
    await measureIdle(base, pool[0], rustExercise);
    await measureClassroom(base, pool, rustExercise);
  } else {
    console.log('  LIMIT SC-012: no pool accounts were opened; nothing was measured');
  }

  console.log('SC-008: logs');
  assertSentinelAbsentFromLogs();
} catch (error) {
  failure = error;
} finally {
  const closeFailures: unknown[] = [];
  for (const session of sessions) {
    try {
      session.account.close();
    } catch (error) {
      closeFailures.push(error);
    }
  }
  if (failure === undefined && closeFailures.length === 0) {
    try {
      assertNoRowsLeft(sessions.map((session) => session.userId));
    } catch (error) {
      failure = error;
    }
  }
  if (failure === undefined && closeFailures.length > 0) failure = closeFailures[0];
}
if (failure !== undefined) throw failure;
console.log('api-runs-check: PASS (read the LIMIT lines above: they are not passes).');
