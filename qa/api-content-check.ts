// Criterio de aceptación de C2 contra el stack vivo (ADR 0006 R7 y D11): las 17 porciones que sirve
// la API, a través de Nginx y de su compresión, son las que fijó el generador. Requiere el stack
// levantado con `docker compose up --build -d --wait`, construido desde este mismo árbol; no forma
// parte de `npm test`. Uso: npm run api:content:check. Con TALLER_URL=http://host:puerto apunta a
// otro despliegue (sin el log de Nginx, que sólo se lee del Compose de este directorio).
//
// node:http no manda Accept-Encoding salvo que se lo pidan: sin gzip, el cuerpo y el ETag llegan
// tal cual; con gzip, Nginx comprime y debilita el ETag (W/"…"), como lo ve un navegador.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { get, type IncomingHttpHeaders } from 'node:http';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

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

// Los clientes lentos simultáneos sobre las dos porciones de lab (unas 300 KB cada una): Nginx
// desborda a /tmp/fastcgi_temp, un tmpfs de 32 MB que cuenta contra el mem_limit de `taller`.
const SLOW_CLIENTS = 40;

const root = join(import.meta.dirname, '..');
const sha256 = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex');

function request(url: string, headers: Record<string, string> = {}, pauseMs = 0): Promise<Reply> {
  return new Promise((resolve, reject) => {
    get(url, { headers, agent: false }, (response) => {
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

// Un recurso por porción, con los parámetros que la cortan.
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
  return `${base}/api/guide`;
}

function address(): string {
  if (process.env.TALLER_URL) return process.env.TALLER_URL.replace(/\/$/, '');
  // La dirección sale de Compose, como en api/scripts/smoke.sh: respeta TALLER_PORT y el proyecto.
  const published = execFileSync('docker', ['compose', 'port', 'taller', '8080'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  return `http://${published}`;
}

// El meta que genera este árbol: el oráculo de lo que tiene que servir la API.
execFileSync(process.execPath, [join(root, 'tools', 'content', 'build-curriculum.ts')], {
  stdio: 'inherit',
});
const meta = JSON.parse(readFileSync(join(root, 'build', 'curriculum.meta.json'), 'utf8')) as Meta;
const base = address();
const portions = Object.entries(meta.portions);
const version = meta.documentHash.slice(0, 32);

// 1. Sin compresión: 200, ETag fuerte con los primeros 32 hex del sha256 del cuerpo, versión
//    igual en las 17 y las cabeceras de caché.
const strong = new Map<string, string>();
for (const [portion, hash] of portions) {
  const url = urlOf(base, portion);
  const reply = await request(url);
  assert.equal(reply.status, 200, `${url} respondió ${reply.status}`);
  assert.equal(sha256(reply.body), hash, `${portion}: el cuerpo no es el que fijó el generador`);
  const etag = String(reply.headers.etag);
  assert.match(etag, /^"[0-9a-f]{32}"$/, `${portion}: ETag`);
  assert.equal(etag, `"${hash.slice(0, 32)}"`, `${portion}: el ETag no es el hash del cuerpo`);
  assert.equal(reply.headers['content-version'], version, `${portion}: Content-Version`);
  const cacheControl = String(reply.headers['cache-control']);
  assert.ok(
    cacheControl.includes('private') && cacheControl.includes('no-cache'),
    `${portion}: Cache-Control «${cacheControl}»`,
  );
  assert.equal(reply.headers.vary?.includes('Cookie') ?? false, false, `${portion}: Vary: Cookie`);
  strong.set(portion, etag);
}

// 2. Con gzip: Nginx comprime y debilita el ETag; el cuerpo descomprimido es el mismo.
for (const [portion, hash] of portions) {
  const reply = await request(urlOf(base, portion), { 'Accept-Encoding': 'gzip' });
  assert.equal(reply.headers['content-encoding'], 'gzip', `${portion}: Nginx no comprimió`);
  assert.equal(reply.headers.etag, `W/${strong.get(portion)}`, `${portion}: ETag con gzip`);
  assert.equal(sha256(gunzipSync(reply.body)), hash, `${portion}: el cuerpo descomprimido`);
}

// 3. Revalidar con el ETag tal como llegó, fuerte y débil, con y sin gzip: 304 sin cuerpo.
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
    assert.equal(reply.status, 304, `${portion} con ${validator}: ${reply.status}`);
    assert.equal(reply.body.length, 0, `${portion}: el 304 trae cuerpo`);
    assert.equal(reply.headers.etag, etag, `${portion}: el 304 sin ETag fuerte`);
    assert.equal(
      reply.headers['content-version'],
      version,
      `${portion}: el 304 sin Content-Version`,
    );
  }
}

// 4 y 5. Clientes lentos: reciben el cuerpo completo, aunque Nginx tenga que pasarlo por disco.
const since = new Date().toISOString();
const labs = ['lab.rust', 'lab.go'];
const slow = await Promise.all(
  Array.from({ length: SLOW_CLIENTS }, (_, index) => {
    const portion = labs[index % labs.length];
    return request(urlOf(base, portion), {}, 15).then((reply) => ({ portion, reply }));
  }),
);
for (const { portion, reply } of slow) {
  assert.equal(reply.status, 200, `${portion} lento: ${reply.status}`);
  assert.equal(sha256(reply.body), meta.portions[portion], `${portion} lento: cuerpo incompleto`);
}
if (process.env.TALLER_URL) {
  console.log(
    'api-content-check: con TALLER_URL no se lee el log de Nginx; ese chequeo se omitió.',
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
    'Nginx se quedó sin espacio en su tmpfs',
  );
}

// 6. Un ejercicio suelto, a mano: su ETag son los primeros 32 hex de su contentHash.
const [exerciseId, { contentHash }] = Object.entries(meta.exercises)[0];
const exercise = await request(`${base}/api/exercises/${exerciseId}`);
assert.equal(exercise.status, 200, `${exerciseId}: respondió ${exercise.status}`);
assert.equal(
  sha256(exercise.body),
  contentHash,
  `${exerciseId}: el cuerpo no es el que fijó el generador`,
);
assert.equal(exercise.headers.etag, `"${contentHash.slice(0, 32)}"`, `${exerciseId}: ETag`);

console.log(
  `api-content-check: ${portions.length} porciones idénticas a las del generador (con y sin gzip, con 304 fuerte y débil) y ${SLOW_CLIENTS} clientes lentos con su cuerpo completo. PASS.`,
);
