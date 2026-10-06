import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { get, type IncomingHttpHeaders } from 'node:http';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { openAccount } from './lib/api-account.ts';

interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

interface Meta {
  documentHash: string;
  portions: Record<string, string>;
  exercises: Record<string, { contentHash: string }>;
}

// FR-047: enough slow clients on the two ~300 KB lab portions for Nginx to spill to
// /tmp/fastcgi_temp, a 32 MB tmpfs that counts against the mem_limit of `taller`.
const SLOW_CLIENTS = 40;

// The content portions sit behind the session: every request carries the check account's cookie.
let sessionCookie = '';

const root = join(import.meta.dirname, '..');
const sha256 = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex');

// node:http sends no Accept-Encoding unless asked; Nginx weakens the ETag only when it compresses
// (ADR 0006 D11).
function request(url: string, headers: Record<string, string> = {}, pauseMs = 0): Promise<Reply> {
  return new Promise((resolve, reject) => {
    get(url, { headers: { ...headers, Cookie: sessionCookie }, agent: false }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        if (pauseMs > 0) {
          response.pause();
          setTimeout(() => response.resume(), pauseMs);
        }
      });
      response.on('end', () =>
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: Buffer.concat(chunks),
        }),
      );
    }).on('error', reject);
  });
}

function urlOf(base: string, portion: string): string {
  const [group, slice] = portion.split('.');
  const query = (resource: string, parameters: string) => `${base}/api/${resource}?${parameters}`;
  if (group === 'lab' || group === 'quests') {
    return query('exercises', `catalog=${group}&language=${slice}`);
  }
  if (group === 'cores') return query('exercises', `catalog=cores&domain=${slice}`);
  if (group === 'campaign') return query('worlds', `language=${slice}`);
  if (group === 'workshops') return query('workshops', `domain=${slice}`);
  if (group === 'atlas') return query('atlas', `language=${slice}`);
  if (group === 'harness') return `${base}/api/harness`;
  return `${base}/api/guide`;
}

function address(): string {
  if (process.env.TALLER_URL) return process.env.TALLER_URL.replace(/\/$/, '');
  const published = execFileSync('docker', ['compose', 'port', 'taller', '8080'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  return `http://${published}`;
}

execFileSync(process.execPath, [join(root, 'tools', 'content', 'build-curriculum.ts')], {
  stdio: 'inherit',
});
const meta = JSON.parse(readFileSync(join(root, 'build', 'curriculum.meta.json'), 'utf8')) as Meta;
const base = address();
const portions = Object.entries(meta.portions);
const version = meta.documentHash.slice(0, 32);

const account = await openAccount(base);
sessionCookie = account.cookie;
try {
  const strong = new Map<string, string>();
  for (const [portion, hash] of portions) {
    const url = urlOf(base, portion);
    const reply = await request(url);
    assert.equal(reply.status, 200, `${url} replied ${reply.status}`);
    assert.equal(
      sha256(reply.body),
      hash,
      `${portion}: the body is not the one the generator fixed`,
    );
    const etag = String(reply.headers.etag);
    assert.match(etag, /^"[0-9a-f]{32}"$/, `${portion}: ETag`);
    assert.equal(etag, `"${hash.slice(0, 32)}"`, `${portion}: the ETag is not the body hash`);
    assert.equal(reply.headers['content-version'], version, `${portion}: Content-Version`);
    const cacheControl = String(reply.headers['cache-control']);
    assert.ok(
      cacheControl.includes('private') && cacheControl.includes('no-cache'),
      `${portion}: Cache-Control «${cacheControl}»`,
    );
    assert.equal(
      reply.headers.vary?.includes('Cookie') ?? false,
      false,
      `${portion}: Vary: Cookie`,
    );
    strong.set(portion, etag);
  }

  for (const [portion, hash] of portions) {
    const reply = await request(urlOf(base, portion), { 'Accept-Encoding': 'gzip' });
    assert.equal(reply.headers['content-encoding'], 'gzip', `${portion}: Nginx did not compress`);
    assert.equal(reply.headers.etag, `W/${strong.get(portion)}`, `${portion}: ETag with gzip`);
    assert.equal(sha256(gunzipSync(reply.body)), hash, `${portion}: the decompressed body`);
  }

  for (const [portion] of portions) {
    const etag = strong.get(portion) as string;
    for (const [validator, encoding] of [
      [etag, undefined],
      [`W/${etag}`, undefined],
      [etag, 'gzip'],
      [`W/${etag}`, 'gzip'],
    ] as const) {
      const headers: Record<string, string> = { 'If-None-Match': validator };
      if (encoding) headers['Accept-Encoding'] = encoding;
      const reply = await request(urlOf(base, portion), headers);
      assert.equal(reply.status, 304, `${portion} with ${validator}: ${reply.status}`);
      assert.equal(reply.body.length, 0, `${portion}: the 304 carries a body`);
      assert.equal(reply.headers.etag, etag, `${portion}: the 304 lacks a strong ETag`);
      assert.equal(
        reply.headers['content-version'],
        version,
        `${portion}: the 304 lacks Content-Version`,
      );
    }
  }

  const since = new Date().toISOString();
  const labs = ['lab.rust', 'lab.go'];
  const slow = await Promise.all(
    Array.from({ length: SLOW_CLIENTS }, (_, index) => {
      const portion = labs[index % labs.length];
      return request(urlOf(base, portion), {}, 15).then((reply) => ({ portion, reply }));
    }),
  );
  for (const { portion, reply } of slow) {
    assert.equal(reply.status, 200, `${portion} slow: ${reply.status}`);
    assert.equal(sha256(reply.body), meta.portions[portion], `${portion} slow: incomplete body`);
  }
  if (process.env.TALLER_URL) {
    console.log(
      'api-content-check: with TALLER_URL the Nginx log is not read; that check was skipped.',
    );
  } else {
    const log = execFileSync(
      'docker',
      ['compose', 'logs', '--no-log-prefix', '--since', since, 'taller'],
      {
        cwd: root,
        encoding: 'utf8',
      },
    );
    assert.equal(
      log.includes('No space left on device'),
      false,
      'Nginx ran out of space on its tmpfs',
    );
  }

  const [exerciseId, { contentHash }] = Object.entries(meta.exercises)[0];
  const exercise = await request(`${base}/api/exercises/${exerciseId}`);
  assert.equal(exercise.status, 200, `${exerciseId}: replied ${exercise.status}`);
  assert.equal(
    sha256(exercise.body),
    contentHash,
    `${exerciseId}: the body is not the one the generator fixed`,
  );
  assert.equal(exercise.headers.etag, `"${contentHash.slice(0, 32)}"`, `${exerciseId}: ETag`);

  console.log(
    `api-content-check: ${portions.length} portions identical to the generator's (with and without gzip, with strong and weak 304) and ${SLOW_CLIENTS} slow clients with their full body. PASS.`,
  );
} finally {
  account.close();
}
