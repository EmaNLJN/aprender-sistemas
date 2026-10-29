# Quickstart: F10c · Validación

Cómo se comprueba que F10c no cambió nada de lo que ve el alumno: los comandos, los valores esperados y los scripts de las comparaciones. Las decisiones están en [research-f10c.md](./research-f10c.md) y las tareas, en [plan-f10c.md](./plan-f10c.md). Todo corre desde la raíz del worktree, con Node 24 y sin descargar nada.

## 0. Una función para el hash

Portable entre Linux y macOS, como en F2a y F2b:

```sh
sha() { node -e 'const h=require("node:crypto").createHash("sha256");process.stdin.on("data",d=>h.update(d)).on("end",()=>console.log(h.digest("hex")))'; }
```

## 1. La línea base (T036)

1. **La red,** en el worktree de F10c sobre `master` con F10b:

   ```sh
   npm ci --offline --no-audit --no-fund
   npm run build && npm test && npm run lint && npm run format:check
   E2E_PORT=4193 npm run test:e2e
   npm run lint 2>&1 | grep -c complexity
   ```

   Todo en verde. Se anotan las E2E, las pruebas de Vitest y los avisos de complejidad.
2. **El dist, en partes:**

   ```sh
   node -e '
   const fs=require("node:fs"),c=require("node:crypto");
   const sha=(s)=>c.createHash("sha256").update(s).digest("hex");
   const html=fs.readFileSync("dist/index.html","utf8");
   const style=/<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
   const script=/<script\b[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
   const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,"<script></script>").replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,"<style></style>");
   console.log(JSON.stringify({chars:html.length,bytes:Buffer.byteLength(html),script:sha(script),style:sha(style),markup:sha(markup),styleElements:(html.match(/<style\b/g)||[]).length,scriptElements:(markup.match(/<script\b/g)||[]).length}));'
   ```

   `scriptElements` cuenta elementos sobre el marcado sin el contenido del script, no apariciones del texto (TR-16): da 1. `styleElements` da 1.
3. **La copia de la base,** que usan todas las comparaciones:

   ```sh
   git worktree add --detach "$TMPDIR/f10c-base" HEAD
   ln -s "$PWD/node_modules" "$TMPDIR/f10c-base/node_modules"
   (cd "$TMPDIR/f10c-base" && npm run build)
   ```

4. **Los scripts,** en `$TMPDIR/f10c-compare/`: `css-multiset.mjs` (quickstart-f2b.md §3.1 a, sin cambios), y `grid.mjs`, `style-sweep.mjs`, `rule-evidence.mjs`, `tokenize.mjs` y `resolved-multiset.mjs` de §3. Resuelven `postcss` y `@playwright/test` desde el `node_modules` de la raíz que reciben.
5. **El control de determinismo** (§3.5 a) y **la evidencia de la base** (§3.4), con las verificaciones del plan, T036, pasos 4 a 8.
6. **Al cerrar (T044),** cada copia descartable se borra sin tocar el `node_modules` real al que apunta su enlace: primero el enlace, después el worktree.

   ```sh
   rm "$TMPDIR/f10c-base/node_modules"
   git worktree remove --force "$TMPDIR/f10c-base"
   git worktree prune
   git worktree list   # ya no la muestra
   ```

   Lo mismo con las copias de los controles de §3.5.

## 2. La compuerta de cada tarea de código

Con el build hecho, contra la copia de la base:

| Salida | T037 y T038 | T039 y T040 | T041 | T042 |
| --- | --- | --- | --- | --- |
| `script` y `markup` del dist | iguales | iguales | iguales | iguales |
| `style` | igual | distinto | distinto si se borró algo | distinto |
| El multiconjunto (§3.1) | — | `onlyBase` 0 y `onlyUnit` 0 | `onlyBase` igual a las tuplas borradas, `onlyUnit` 0 | cambia a propósito: no se usa |
| El multiconjunto resuelto (§3.7) | — | — | — | igual al de T041: `onlyBase` 0 y `onlyUnit` 0 |
| El barrido (§3.3) | — | 0 diferencias, `unhandled` vacío, `newTokens` 0 | ← | 0 diferencias, `unhandled` vacío, `newTokens` 61 |
| `chars` | — | como mucho T036 + 1 000 | ← | como mucho T036 + 5 000 |

Y los comandos:

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=4193 npm run test:e2e
git diff <base> -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'   # vacío
git diff <base> -- package.json package-lock.json                                               # vacío
git diff --name-only <base> -- qa/e2e/specs | grep -v shell-style.spec.ts                        # vacío: ningún E2E de la base editado
```

## 3. Las comparaciones

Antes de correrlas, los puertos 4701, 4702 y 4703 están libres:

```sh
ss -ltn | grep -E ':470[123]\b'   # no imprime nada
```

### 3.1 El multiconjunto de declaraciones

```sh
node "$TMPDIR/f10c-compare/css-multiset.mjs" "$TMPDIR/f10c-base" .
```

Cuenta cada selector por separado, con su contexto `@media`, su propiedad, su valor y su `!important`, así que partir `.small-label, .eyebrow, .topbar-label` no da diferencias. La única diferencia aceptada en T039 es la de research-f10c.md, R4: una declaración pisada que Lightning CSS descarta al juntar dos bloques que la mudanza dejó contiguos.

### 3.2 La grilla (`grid.mjs`)

Los 35 estados y las 15 capturas que comparten el barrido y la evidencia. `PAGES=a,b` y `WIDTHS=590,981` acotan una corrida. Los valores del doble de la API copian `installDefaults()` de `qa/e2e/fixtures/api-double.ts` y el E2E de F12a que abre la administración; T036 los verifica.

```js
// $TMPDIR/f10c-compare/grid.mjs
// The F10c grid: the states that style-sweep.mjs compares and rule-evidence.mjs measures.
// PAGES=a,b and WIDTHS=590,981 narrow a run; both scripts import this module.
import fs from 'node:fs';
import { spawn } from 'node:child_process';

export const WIDTHS = (process.env.WIDTHS ?? '1600,1280,981,850,650,590,375').split(',').map(Number);
export const MOTIONS = ['no-preference', 'reduce'];
export const CAPTURES = [
  ...WIDTHS.flatMap((width) => MOTIONS.map((motion) => ({ width, motion, media: 'screen' }))),
  ...(WIDTHS.includes(1280) ? [{ width: 1280, motion: 'no-preference', media: 'print' }] : []),
];

export const STUDENT = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };
export const ADMIN = { id: 1, name: 'Olga Ruiz', email: 'olga@x.com', role: 'admin', privacyAccepted: true };
const adminRow = (fields) => ({
  role: 'student',
  status: 'active',
  emailVerified: true,
  privacyVersion: '2026-10-dev',
  createdAt: '2026-10-05T12:00:00.000Z',
  updatedAt: '2026-10-05T12:00:00.000Z',
  ...fields,
});
const ADMIN_USERS = {
  data: [
    adminRow({ id: ADMIN.id, name: ADMIN.name, email: ADMIN.email, role: 'admin' }),
    adminRow({ id: 12, name: 'Ana Pérez', email: 'ana@x.com' }),
  ],
  meta: { page: 1, perPage: 25, total: 2, lastPage: 1 },
};

// The dialogs that a page portals to <body> belong to that page, not to the shell.
export const PAGE_DIALOGS = { 'lesson-dialog': 'route', 'confirm-dialog': 'method', 'lab-confirm-dialog': 'lab' };

const routeSeed = (language) =>
  JSON.stringify({
    version: 1,
    language,
    completed: [],
    milestones: [],
    favorites: [],
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
  });
const mainReady = () => document.querySelector('#main > :not([data-content-gate="loading"])') !== null;
const searchFor = (text, empty) => async (page) => {
  await page.locator('#main').getByRole('searchbox').first().fill(text);
  await page.waitForSelector(empty);
};

const VIEWS = [
  ['recorrido', 'route'],
  ['campana', 'campaign'],
  ['sistemas', 'systems'],
  ['atlas', 'atlas'],
  ['laboratorio', 'lab'],
  ['biblioteca', 'library'],
  ['proyecto', 'project'],
  ['metodo', 'method'],
];

export const ALL_STATES = [
  ...VIEWS.flatMap(([hash, main]) => [
    { name: `${hash}-rust`, path: `/#${hash}`, main },
    { name: `${hash}-go`, path: `/#${hash}`, main, seed: { 'taller-learning-v1': routeSeed('go') } },
  ]),
  { name: 'mission', path: '/?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio', main: 'lab' },
  { name: 'lock', path: '/?campana=rust-world-1&ejercicio=rust-103&paso=learn#laboratorio', main: 'lab' },
  { name: 'core', path: '/?sistema=cache&ejercicio=rust-113&paso=code#laboratorio', main: 'lab' },
  { name: 'workshop', path: '/?lenguaje=rust&taller=cache&parte=explore#sistemas', main: 'systems' },
  { name: 'reflect', path: '/?ejercicio=rust-02&paso=reflect#laboratorio', main: 'lab' },
  { name: 'workshop-ship', path: '/?lenguaje=rust&taller=cache&parte=ship#sistemas', main: 'systems' },
  { name: 'lab-empty', path: '/#laboratorio', main: 'lab', setup: searchFor('zzzz', '.lab-empty') },
  { name: 'sys-empty', path: '/?lenguaje=rust#sistemas', main: 'systems', setup: searchFor('zzzz', '.lab-empty') },
  { name: 'library-empty', path: '/#biblioteca', main: 'library', setup: searchFor('zzzz', '.empty-state') },
  {
    name: 'lesson',
    path: '/#recorrido',
    main: 'route',
    setup: async (page) => {
      await page.getByRole('button', { name: /^Empezar esta sesión/ }).click();
      await page.getByRole('dialog').waitFor();
    },
  },
  {
    name: 'reset-confirm',
    path: '/#metodo',
    main: 'method',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Borrar mi progreso' }).click();
      await page.getByRole('dialog').waitFor();
    },
  },
  {
    name: 'toast',
    path: '/#recorrido',
    main: 'route',
    setup: async (page) => {
      await page.getByRole('group', { name: 'Lenguaje del recorrido' }).getByRole('button', { name: 'Go', exact: true }).click();
      await page.waitForSelector('#toast.visible');
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'skip-focus',
    path: '/#recorrido',
    main: 'route',
    setup: async (page) => {
      await page.keyboard.press('Tab');
      await page.getByRole('link', { name: 'Ir al contenido' }).evaluate((link) => {
        if (document.activeElement !== link) throw new Error('the skip link is not the first stop');
      });
    },
  },
  {
    name: 'noscript',
    path: '/#recorrido',
    main: 'route',
    setup: (page) =>
      page.evaluate(() => {
        const noscript = document.querySelector('noscript');
        noscript.insertAdjacentHTML('afterend', noscript.textContent);
      }),
  },
  {
    name: 'account',
    path: '/#recorrido',
    main: 'route',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Tu cuenta' }).click();
      await page.getByRole('dialog').waitFor();
    },
  },
  { name: 'admin', path: '/#administracion', main: 'admin', account: ADMIN, ready: () => document.body.textContent.includes('ana@x.com') },
  { name: 'sign-in', path: '/#recorrido', main: 'shell', account: null, ready: () => document.querySelector('form') !== null },
  { name: 'session-error', path: '/#recorrido', main: 'shell', sessionStatus: 503, ready: () => document.querySelector('[role="alert"]') !== null },
  { name: 'gate-error', path: '/#recorrido', main: 'shell', contentStatus: 500, ready: () => document.querySelector('[data-content-gate="failed"]') !== null },
];
export const STATES = process.env.PAGES
  ? ALL_STATES.filter((state) => process.env.PAGES.split(',').includes(state.name))
  : ALL_STATES;

export function serve(root, port) {
  return spawn(
    root + '/node_modules/.bin/vite',
    ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: root, stdio: 'ignore' },
  );
}

export async function waitFor(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('server did not start: ' + url);
}

function contentVersion(root) {
  const meta = JSON.parse(fs.readFileSync(root + '/build/curriculum.meta.json', 'utf8'));
  return meta.documentHash.slice(0, 32);
}

// The default answers of qa/e2e/fixtures/api-double.ts (installDefaults), plus F12a's first admin list.
async function installApi(context, root, state, unhandled) {
  const account = state.account === undefined ? STUDENT : state.account;
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const key = request.method() + ' ' + new URL(request.url()).pathname;
    const json = (status, body, headers) =>
      route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    if (key === 'GET /api/session' && state.sessionStatus)
      return json(state.sessionStatus, { message: 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.', code: 'server_error' });
    if (key === 'GET /api/session')
      return json(200, { user: account, features: { passwordReset: false, registration: false }, contentVersion: contentVersion(root), catalogs: [] }, { 'Cache-Control': 'no-store' });
    if (key === 'GET /api/admin/users') return json(200, ADMIN_USERS);
    unhandled.add(state.name + ': ' + key);
    return json(404, { message: 'No existe lo que pedís.', code: 'not_found' });
  });
}

// Opens one state at one capture. The pointer leaves the page before the caller reads anything (TR-13).
export async function open(browser, origin, root, state, capture, unhandled, beforeGoto) {
  const context = await browser.newContext({
    viewport: { width: capture.width, height: 900 },
    reducedMotion: capture.motion,
    locale: 'es-AR',
  });
  if (state.seed)
    await context.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    }, state.seed);
  await installApi(context, root, state, unhandled);
  if (state.contentStatus)
    await context.route('**/content/curriculum.*.json', (route) => route.fulfill({ status: state.contentStatus, body: 'falló' }));
  const page = await context.newPage();
  if (beforeGoto) await beforeGoto(page);
  await page.goto(origin + state.path);
  await page.waitForFunction(state.ready ?? mainReady);
  if (state.setup) await state.setup(page);
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  if (capture.media === 'print') await page.emulateMedia({ media: 'print' });
  return { context, page };
}
```

### 3.3 El barrido de estilo computado (`style-sweep.mjs`)

Sirve cada `dist/` con su `vite preview`, abre cada estado en cada captura en un contexto nuevo y compara cada propiedad computada de cada elemento. La clave de un elemento sale del ancestro más cercano con `id` (F9), y lo de adentro de un `<details>` cerrado no se compara (TR-13: su tamaño depende de si alguna vez se midió). Esperado: `{"snapshots":525,…,"differences":0,"byState":{},"newTokens":0,"unhandled":[]}` hasta T041, y `"newTokens":61` desde T042. Chromium enumera las propiedades personalizadas en el estilo computado: una propiedad `--*` que la base no tiene es un token nuevo y se cuenta aparte; cualquier otra diferencia, también la de un token que ya existía, cuenta. Tarda entre 25 y 30 minutos (el prototipo comparó 405 capturas en unos 20): no está colgado.

```js
// $TMPDIR/f10c-compare/style-sweep.mjs
// node style-sweep.mjs <base root> <compared root>; PAGES and WIDTHS narrow the run (grid.mjs).
import { createRequire } from 'node:module';
import { CAPTURES, STATES, open, serve, waitFor } from './grid.mjs';

const [baseRoot, otherRoot] = process.argv.slice(2);
const { chromium } = createRequire(baseRoot + '/package.json')('@playwright/test');

function readStyles() {
  const keyOf = (element) => {
    const parts = [];
    for (let node = element; node; node = node.parentElement) {
      if (node.id) {
        parts.unshift('#' + node.id);
        break;
      }
      if (node === document.documentElement) {
        parts.unshift('html');
        break;
      }
      parts.unshift(node.tagName.toLowerCase() + ':' + [...node.parentElement.children].indexOf(node));
    }
    return parts.join('/');
  };
  const out = {};
  const insideClosedDetails = (element) => {
    const closed = element.parentElement?.closest('details:not([open])');
    if (!closed) return false;
    const summary = closed.querySelector(':scope > summary');
    return !summary?.contains(element);
  };
  for (const element of [document.documentElement, ...document.querySelectorAll('*')]) {
    if (insideClosedDetails(element)) continue;
    const style = getComputedStyle(element);
    const properties = {};
    for (let index = 0; index < style.length; index++) properties[style[index]] = style.getPropertyValue(style[index]);
    out[keyOf(element)] = properties;
  }
  return out;
}

const baseServer = serve(baseRoot, 4701);
const otherServer = serve(otherRoot, 4702);
const unhandled = new Set();
try {
  await waitFor('http://127.0.0.1:4701/');
  await waitFor('http://127.0.0.1:4702/');
  const browser = await chromium.launch();
  let snapshots = 0;
  let elements = 0;
  let differences = 0;
  const newTokens = new Set();
  const byState = {};
  const samples = [];
  for (const state of STATES)
    for (const capture of CAPTURES) {
      const a = await open(browser, 'http://127.0.0.1:4701', baseRoot, state, capture, unhandled);
      const before = await a.page.evaluate(readStyles);
      await a.context.close();
      const b = await open(browser, 'http://127.0.0.1:4702', otherRoot, state, capture, unhandled);
      const after = await b.page.evaluate(readStyles);
      await b.context.close();
      snapshots++;
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        elements++;
        const first = before[key] ?? {};
        const second = after[key] ?? {};
        for (const property of new Set([...Object.keys(first), ...Object.keys(second)])) {
          if (first[property] === second[property]) continue;
          if (property.startsWith('--') && !(property in first)) {
            newTokens.add(property);
            continue;
          }
          differences++;
          byState[state.name] = (byState[state.name] ?? 0) + 1;
          if (samples.length < 20)
            samples.push([state.name, capture.width, capture.motion, capture.media, key, property, first[property], second[property]].join(' | '));
        }
      }
    }
  await browser.close();
  console.log(JSON.stringify({ snapshots, elements, differences, byState, newTokens: newTokens.size, unhandled: [...unhandled] }));
  for (const sample of samples) console.log(sample);
} finally {
  baseServer.kill();
  otherServer.kill();
}
```

### 3.4 La evidencia de cada regla (`rule-evidence.mjs`)

```sh
node "$TMPDIR/f10c-compare/rule-evidence.mjs" . frontend/styles.css frontend/src/app/shell/shell.css > evidence.tsv
```

Una fila por selector: la hoja, la línea, el contexto, el selector, la clase (research-f10c.md, R2), los dueños medidos, los que da la búsqueda en las fuentes, los que sólo da la búsqueda (`staticOnly`), en cuántas capturas se usó y lo que dice la cobertura de Chromium. La salida de error trae `coverageMatchesStyle` (tiene que ser `true`), los pedidos a `/api/` sin respuesta y los centinelas que fallaron; con alguno, el script sale con 1. Con la grilla entera tarda unos 15 minutos (el prototipo midió 465 capturas en unos 10).

```js
// $TMPDIR/f10c-compare/rule-evidence.mjs
// node rule-evidence.mjs <root> <sheet> [<sheet>…] > evidence.tsv
// For each selector of the sheets: where it matched in the grid (the page whose #main holds the element, or
// the shell), which source files name its classes, whether Chromium's CSS coverage saw it, and its class.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { CAPTURES, PAGE_DIALOGS, STATES, open, serve, waitFor } from './grid.mjs';

const [root, ...sheets] = process.argv.slice(2);
const require = createRequire(root + '/package.json');
const postcss = require('postcss');
const { chromium } = require('@playwright/test');

const TOKENS = new Set([':root', "body[data-language='go']"]);
const SENTINELS = [
  ['', '#toast.visible'],
  ['', '.noscript'],
  ['(min-width: 1550px)', 'main'],
  ['print', '.app-shell'],
];

const tuples = [];
for (const sheet of sheets) {
  postcss.parse(fs.readFileSync(path.join(root, sheet), 'utf8')).walkRules((rule) => {
    const media = [];
    for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'keyframes') return;
      if (parent.type === 'atrule') media.unshift(parent.params);
    }
    for (const selector of rule.selectors)
      tuples.push({ sheet, line: rule.source.start.line, media, selector, owners: new Set(), states: 0, covered: false });
  });
}

function measure({ tuples, dialogs, main }) {
  const strip = (selector) =>
    selector
      .replace(/::?(?:-webkit-|-moz-)[\w-]+/g, '')
      .replace(/::?(?:after|before|backdrop|placeholder|marker)\b/g, '')
      .replace(/:(?:hover|focus-visible|focus-within|focus|active|checked|disabled|visited)\b/g, '')
      .trim() || '*';
  const host = document.getElementById('main');
  const ownerOf = (element) => {
    const dialog = element.closest('dialog');
    if (dialog && dialogs[dialog.id]) return dialogs[dialog.id];
    if (host && element !== host && host.contains(element)) return main;
    return 'shell';
  };
  return tuples.map(({ media, selector }) => {
    if (!media.every((query) => matchMedia(query).matches)) return [];
    let matched;
    try {
      matched = [...document.querySelectorAll(strip(selector))];
    } catch {
      return ['invalid'];
    }
    return [...new Set(matched.map(ownerOf))];
  });
}

const normalize = (text) =>
  text
    .replace(/\s*([>+~,()])\s*/g, '$1')
    .replace(/\[([\w-]+)=(['"])([^'"]*)\2\]/g, '[$1=$3]')
    .replace(/\s+/g, ' ')
    .trim();
const normalizeMedia = (params) => params.replace(/\s+/g, '');
function coveredSelectors(entries) {
  const used = new Set();
  for (const entry of entries) {
    if (!entry.text) continue;
    const parsed = postcss.parse(entry.text);
    parsed.walkRules((rule) => {
      const start = rule.source.start.offset;
      const end = rule.source.end.offset + 1;
      if (!entry.ranges.some((range) => range.start < end && range.end > start)) return;
      const media = [];
      for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent)
        if (parent.type === 'atrule') media.unshift(normalizeMedia(parent.params));
      for (const selector of rule.selectors) used.add(media.join('|') + ' ¦ ' + normalize(selector));
    });
  }
  return used;
}

const server = serve(root, 4703);
const unhandled = new Set();
let coverageEntries = 0;
let coverageMatchesStyle = false;
const covered = new Set();
try {
  await waitFor('http://127.0.0.1:4703/');
  const browser = await chromium.launch();
  const style = /<style\b[^>]*>([\s\S]*?)<\/style>/.exec(fs.readFileSync(root + '/dist/index.html', 'utf8'))[1];
  for (const state of STATES)
    for (const capture of CAPTURES) {
      const { context, page } = await open(browser, 'http://127.0.0.1:4703', root, state, capture, unhandled, (page) =>
        page.coverage.startCSSCoverage({ resetOnNavigation: false }),
      );
      const result = await page.evaluate(measure, {
        tuples: tuples.map(({ media, selector }) => ({ media, selector })),
        dialogs: PAGE_DIALOGS,
        main: state.main,
      });
      const entries = await page.coverage.stopCSSCoverage();
      coverageEntries = Math.max(coverageEntries, entries.length);
      if (entries.some((entry) => entry.text?.trim() === style.trim())) coverageMatchesStyle = true;
      for (const key of coveredSelectors(entries)) covered.add(key);
      result.forEach((owners, index) => {
        if (owners.length) tuples[index].states++;
        for (const owner of owners) tuples[index].owners.add(owner);
      });
      await context.close();
    }
  await browser.close();
} finally {
  server.kill();
}

function walk(directory, out = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|html)$/.test(entry.name) && !/\.(spec|test|factory)\./.test(entry.name)) out.push(full);
  }
  return out;
}
const sources = walk(path.join(root, 'frontend/src')).map((file) => [path.relative(path.join(root, 'frontend/src'), file), fs.readFileSync(file, 'utf8')]);
const staticOwner = (file) => {
  if (file === 'index.html' || file.startsWith('app/') || file.startsWith('pages/account/') || file.startsWith('features/sign-in/')) return 'shell';
  const page = /^pages\/([^/]+)\//.exec(file);
  return page ? page[1] : 'other:' + file.split('/').slice(0, 2).join('/');
};
function staticOwners(selector) {
  const names = [...selector.replace(/:not\([^)]*\)/g, '').matchAll(/[.#]([\w-]+)/g)].map((match) => match[1]);
  if (!names.length) return [];
  const patterns = names.map((name) => new RegExp('(?<![\\w-])' + name.replace(/-/g, '\\-') + '(?![\\w-])'));
  return [...new Set(sources.filter(([, text]) => patterns.every((pattern) => pattern.test(text))).map(([file]) => staticOwner(file)))].sort();
}
function classify(selector, owners) {
  if (TOKENS.has(selector)) return 'token';
  if (/^main\b/.test(selector)) return 'shell';
  if (!/[.#]/.test(selector.replace(/:not\([^)]*\)/g, ''))) return 'global';
  if (owners.has('invalid')) return 'invalid';
  if (owners.size === 0) return 'orphan';
  if (owners.size === 1 && owners.has('shell')) return 'shell';
  if (owners.size === 1) return 'single:' + [...owners][0];
  return 'base';
}

let failures = 0;
for (const [media, selector] of SENTINELS) {
  const tuple = tuples.find((item) => item.selector === selector && item.media.join('|') === media);
  if (tuple && tuple.states === 0) {
    failures++;
    console.error(`sentinel never matched: ${media} ${selector}`);
  }
}
console.error(JSON.stringify({ tuples: tuples.length, coverageEntries, coverageMatchesStyle, unhandled: [...unhandled] }));
console.log(['sheet', 'line', 'media', 'selector', 'class', 'measured', 'static', 'staticOnly', 'states', 'coverage'].join('\t'));
for (const tuple of tuples) {
  const measured = [...tuple.owners].sort();
  const fromSource = staticOwners(tuple.selector);
  const staticOnly = fromSource.filter((owner) => !owner.startsWith('other:') && !tuple.owners.has(owner));
  const key = tuple.media.map(normalizeMedia).join('|') + ' ¦ ' + normalize(tuple.selector);
  console.log([tuple.sheet, tuple.line, tuple.media.join('|') || '-', tuple.selector, classify(tuple.selector, tuple.owners), measured.join('+') || '-', fromSource.join('+') || '-', staticOnly.join('+') || '-', tuple.states, covered.has(key) ? 'used' : 'unused'].join('\t'));
}
process.exitCode = failures ? 1 : 0;
```

Para contar las clases:

```sh
awk -F'\t' 'NR>1{print $5}' evidence.tsv | sort | uniq -c
awk -F'\t' 'NR>1 && ($5=="orphan" || $5 ~ /^single:/ || $8!="-")' evidence.tsv
```

### 3.5 Los controles

**(a) El determinismo** (T036, y otra vez si el barrido cambia): la base contra sí misma.

```sh
node "$TMPDIR/f10c-compare/style-sweep.mjs" "$TMPDIR/f10c-base" "$TMPDIR/f10c-base"
```

Esperado: `differences` 0 y `unhandled` vacío. Si no, el script tiene ruido y se corrige antes de comparar nada.

**(b) El orden** (T039, una vez, en una copia descartable de la rama): el primer bloque `@media (max-width: 590px)` de `shell.css` pasa a estar justo antes del primer `@media (max-width: 850px)`. Después, `npm run build` en la copia y:

```sh
node "$TMPDIR/f10c-compare/css-multiset.mjs" . <copia>
PAGES=recorrido-rust WIDTHS=850,590,375 node "$TMPDIR/f10c-compare/style-sweep.mjs" . <copia>
```

Esperado: el multiconjunto en 0 y 0; el barrido con diferencias sólo a 590 y 375 px, entre ellas `.sidebar` con `display` `flex` → `grid` y `.topbar` con `height` `61px` → `68px`. Si da 0, el barrido no ve el orden: se para y se informa.

**(c) El borrado** (T041, una vez, en una copia descartable de la rama): se borra la regla `#toast.visible` de `shell.css`. Después, `npm run build` en la copia y:

```sh
PAGES=toast,recorrido-rust WIDTHS=1280 node "$TMPDIR/f10c-compare/style-sweep.mjs" . <copia>
```

Esperado: diferencias sólo en el estado `toast` (`opacity` `1` → `0` y el `transform` del toast), y en la evidencia de la rama, `#toast.visible` usada sólo en ese estado (`states` en 15, sus 15 capturas). Demuestra que la grilla tiene el estado y que el barrido lo ve.

**(d) Los alias en Go** (T042, una vez, en una copia descartable de la rama): se sacan del bloque `body[data-language='go']` de `styles.css` las tres líneas `--accent: var(--color-accent);`, `--accent-dark: var(--color-accent-dark);` y `--accent-soft: var(--color-accent-soft);`. Después, `npm run build` en la copia y:

```sh
node "$TMPDIR/f10c-compare/resolved-multiset.mjs" . <copia>
PAGES=campana-go,campana-rust WIDTHS=1280 node "$TMPDIR/f10c-compare/style-sweep.mjs" . <copia>
```

Esperado: el multiconjunto resuelto en 0 y 0, porque resuelve con `:root`; el barrido con diferencias sólo en `campana-go`, en los colores que la hoja de la campaña toma de `var(--accent)`: en Go vuelven al tono de Rust. Demuestra que el barrido ve lo que el multiconjunto resuelto no.

### 3.6 Los tokens (`tokenize.mjs`, T042)

El codemod de T042: reemplaza el `:root` y el bloque de Go por los de research-f10c.md, R12, y reescribe las declaraciones de las dos hojas con los tokens. Falla si una entrada de `LAYOUT` no se aplica exactamente una vez. Después, `npx prettier --write` de las dos hojas.

```js
// $TMPDIR/f10c-compare/tokenize.mjs
// node tokenize.mjs <root> frontend/styles.css <shell sheet>
// Rewrites the token blocks of styles.css and makes both sheets use the tokens (T042).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [root, stylesFile, shellFile] = process.argv.slice(2);
const postcss = createRequire(root + '/package.json')('postcss');

const ROOT_BLOCK = `:root {
  --color-paper: #f6f3ed;
  --color-surface: #fffdf8;
  --color-ink: #272c28;
  --color-muted: #656b60;
  --color-line: #dddcd2;
  --color-accent: #ac4829;
  --color-accent-dark: #86341d;
  --color-accent-soft: #f1e3d8;
  --color-sage: #e8ecdf;
  --color-green: #38614a;
  --color-white: white;
  --color-sidebar: #eeeee5;
  --color-nav-hover: #e4e6dc;
  --color-switch-line: #cccfc2;
  --color-recommended: #e69a70;
  --color-count-ink: #fff9ef;
  --color-count-current: #d4a280;
  --color-count-current-ink: #222b23;
  --color-track: #d7dace;
  --color-line-strong: #bdc4b3;
  --color-check-line: #b9bfae;
  --color-backdrop: #20282088;
  --font-serif: Georgia, 'Times New Roman', serif;
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  --text-8: 8px;
  --text-9: 9px;
  --text-10: 10px;
  --text-11: 11px;
  --text-12: 12px;
  --text-13: 13px;
  --text-14: 14px;
  --text-15: 15px;
  --text-16: 16px;
  --text-20: 20px;
  --text-21: 21px;
  --text-22: 22px;
  --text-23: 23px;
  --text-24: 24px;
  --text-26: 26px;
  --text-29: 29px;
  --text-30: 30px;
  --text-31: 31px;
  --text-35: 35px;
  --text-40: 40px;
  --text-48: 48px;
  --font-weight-400: 400;
  --font-weight-500: 500;
  --font-weight-550: 550;
  --font-weight-650: 650;
  --container-main: 1330px;
  --spacing-sidebar: 240px;
  --spacing-sidebar-compact: 205px;
  --spacing-topbar: 88px;
  --spacing-topbar-compact: 68px;
  --spacing-topbar-phone: 61px;
  --spacing-gutter: 52px;
  --spacing-gutter-compact: 32px;
  --spacing-gutter-phone: 20px;
  --shadow-dialog: 0 20px 90px #20282033;
  --shadow-toast: 0 5px 25px #0002;
  --paper: var(--color-paper);
  --surface: var(--color-surface);
  --ink: var(--color-ink);
  --muted: var(--color-muted);
  --line: var(--color-line);
  --accent: var(--color-accent);
  --accent-dark: var(--color-accent-dark);
  --accent-soft: var(--color-accent-soft);
  --sage: var(--color-sage);
  --green: var(--color-green);
  --serif: var(--font-serif);
  --sans: var(--font-sans);
  --mono: var(--font-mono);
}`;
const GO_BLOCK = `body[data-language='go'] {
  --color-accent: #22626b;
  --color-accent-dark: #174a52;
  --color-accent-soft: #e1ebea;
  --accent: var(--color-accent);
  --accent-dark: var(--color-accent-dark);
  --accent-soft: var(--color-accent-soft);
}`;

const RENAMED = ['paper', 'surface', 'ink', 'muted', 'line', 'accent-dark', 'accent-soft', 'accent', 'sage', 'green'];
const COLORS = [
  ['#fffdf8', 'var(--color-surface)'],
  ['#eeeee5', 'var(--color-sidebar)'],
  ['#e4e6dc', 'var(--color-nav-hover)'],
  ['#cccfc2', 'var(--color-switch-line)'],
  ['#e69a70', 'var(--color-recommended)'],
  ['#fff9ef', 'var(--color-count-ink)'],
  ['#d4a280', 'var(--color-count-current)'],
  ['#222b23', 'var(--color-count-current-ink)'],
  ['#d7dace', 'var(--color-track)'],
  ['#bdc4b3', 'var(--color-line-strong)'],
  ['#b9bfae', 'var(--color-check-line)'],
  ['#20282088', 'var(--color-backdrop)'],
];
const SHADOWS = [
  ['0 20px 90px #20282033', 'var(--shadow-dialog)'],
  ['0 5px 25px #0002', 'var(--shadow-toast)'],
];
const SIZES = new Set([8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 26, 29, 30, 31, 35, 40, 48]);
const WEIGHTS = new Set(['400', '500', '550', '650']);
// [media, selector, property, before, after]: the layout of the shell, one entry per declaration.
const LAYOUT = [
  ['', '.app-shell', 'grid-template-columns', '240px minmax(0, 1fr)', 'var(--spacing-sidebar) minmax(0, 1fr)'],
  ['', '.topbar', 'height', '88px', 'var(--spacing-topbar)'],
  ['', '.topbar', 'padding', '0 52px', '0 var(--spacing-gutter)'],
  ['', 'main', 'max-width', '1330px', 'var(--container-main)'],
  ['', 'main', 'padding', '44px 52px 52px', '44px var(--spacing-gutter) 52px'],
  ['', '.main-footer', 'max-width', '1330px', 'var(--container-main)'],
  ['', '.main-footer', 'padding', '20px 52px 26px', '20px var(--spacing-gutter) 26px'],
  ['', '.session-status', 'max-width', '1330px', 'var(--container-main)'],
  ['', '.session-status', 'padding', '44px 52px 0', '44px var(--spacing-gutter) 0'],
  ['(max-width: 1150px)', '.app-shell', 'grid-template-columns', '205px minmax(0, 1fr)', 'var(--spacing-sidebar-compact) minmax(0, 1fr)'],
  ['(max-width: 1150px)', '.topbar', 'padding', '0 32px', '0 var(--spacing-gutter-compact)'],
  ['(max-width: 1150px)', 'main', 'padding', '34px 32px', '34px var(--spacing-gutter-compact)'],
  ['(max-width: 1150px)', '.main-footer', 'padding-left', '32px', 'var(--spacing-gutter-compact)'],
  ['(max-width: 1150px)', '.main-footer', 'padding-right', '32px', 'var(--spacing-gutter-compact)'],
  ['(max-width: 1150px)', '.session-status', 'padding', '34px 32px 0', '34px var(--spacing-gutter-compact) 0'],
  ['(max-width: 850px)', '.topbar', 'height', '68px', 'var(--spacing-topbar-compact)'],
  ['(max-width: 590px)', '.topbar', 'padding', '0 20px', '0 var(--spacing-gutter-phone)'],
  ['(max-width: 590px)', '.topbar', 'height', '61px', 'var(--spacing-topbar-phone)'],
  ['(max-width: 590px)', 'main', 'padding', '29px 20px 35px', '29px var(--spacing-gutter-phone) 35px'],
  ['(max-width: 590px)', '.main-footer', 'padding', '19px 20px', '19px var(--spacing-gutter-phone)'],
  ['(max-width: 590px)', '.session-status', 'padding', '29px 20px 0', '29px var(--spacing-gutter-phone) 0'],
];

const TOKEN_RULES = new Set([':root', "body[data-language='go']"]);
const applied = new Map(LAYOUT.map((entry) => [entry.join('¦'), 0]));

function rewrite(decl) {
  const rule = decl.parent;
  const media = rule.parent.type === 'atrule' ? rule.parent.params : '';
  for (const entry of LAYOUT) {
    const [m, selector, property, before, after] = entry;
    if (m === media && rule.selector === selector && decl.prop === property && decl.value === before) {
      decl.value = after;
      applied.set(entry.join('¦'), applied.get(entry.join('¦')) + 1);
    }
  }
  let value = decl.value;
  for (const name of RENAMED) value = value.split(`var(--${name})`).join(`var(--color-${name})`);
  for (const name of ['serif', 'sans', 'mono']) value = value.split(`var(--${name})`).join(`var(--font-${name})`);
  for (const [literal, token] of SHADOWS) if (value === literal) value = token;
  for (const [literal, token] of COLORS) value = value.replace(new RegExp(literal + '\\b', 'gi'), token);
  value = value.replace(/(^|[\s(,])white\b/g, '$1var(--color-white)');
  if (decl.prop === 'font-size') {
    const size = /^(\d+)px$/.exec(value);
    if (size && SIZES.has(Number(size[1]))) value = `var(--text-${size[1]})`;
  }
  if (decl.prop === 'font-weight' && WEIGHTS.has(value)) value = `var(--font-weight-${value})`;
  decl.value = value;
}

for (const file of [stylesFile, shellFile]) {
  const full = path.join(root, file);
  const sheet = postcss.parse(fs.readFileSync(full, 'utf8'));
  sheet.walkRules((rule) => {
    if (rule.selector === ':root') return rule.replaceWith(postcss.parse(ROOT_BLOCK).first);
    if (rule.selector === "body[data-language='go']") return rule.replaceWith(postcss.parse(GO_BLOCK).first);
    if (TOKEN_RULES.has(rule.selector)) return;
    rule.walkDecls((decl) => {
      if (!decl.prop.startsWith('--')) rewrite(decl);
    });
  });
  fs.writeFileSync(full, sheet.toString());
}
const missing = [...applied].filter(([, count]) => count !== 1).map(([key, count]) => `${key} → ${count}`);
if (missing.length) {
  console.error('layout entries not applied exactly once:\n' + missing.join('\n'));
  process.exitCode = 1;
}
```

### 3.7 El multiconjunto resuelto (`resolved-multiset.mjs`, T042 y T044)

El de §3.1, con cada `var()` resuelto por los tokens de `:root` del dist y cada valor normalizado por Lightning CSS, sin las propiedades personalizadas. Así, `font-size:var(--text-12)` y `font-size:12px` son la misma tupla.

```sh
node "$TMPDIR/f10c-compare/resolved-multiset.mjs" "$TMPDIR/f10c-base" .
```

```js
// $TMPDIR/f10c-compare/resolved-multiset.mjs
// node resolved-multiset.mjs <base root> <compared root>
// The multiset of css-multiset.mjs with every var() resolved by the custom properties of :root, and each
// value normalized by Lightning CSS. Custom properties themselves are left out: they are the tokens.
import fs from 'node:fs';
import { createRequire } from 'node:module';

function tuples(root) {
  const require = createRequire(root + '/package.json');
  const postcss = require('postcss');
  const { transform } = require('lightningcss');
  const html = fs.readFileSync(root + '/dist/index.html', 'utf8');
  const css = /<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
  const parsed = postcss.parse(css);
  const tokens = new Map();
  parsed.walkRules((rule) => {
    if (rule.parent.type !== 'root' || !rule.selectors.includes(':root')) return;
    for (const decl of rule.nodes) if (decl.type === 'decl' && decl.prop.startsWith('--')) tokens.set(decl.prop, decl.value.trim());
  });
  const resolve = (value, depth = 0) => {
    if (depth > 20) throw new Error('var() cycle in ' + value);
    return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (whole, name, fallback) => {
      if (tokens.has(name)) return resolve(tokens.get(name), depth + 1);
      if (fallback !== undefined) return resolve(fallback, depth + 1);
      throw new Error('undefined token ' + name);
    });
  };
  const normalize = (prop, value) =>
    transform({ filename: 'value.css', code: Buffer.from(`a{${prop}:${value}}`), minify: true })
      .code.toString()
      .replace(/^a\{/, '')
      .replace(/\}$/, '');
  const out = [];
  parsed.walkRules((rule) => {
    const context = [];
    for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent)
      if (parent.type === 'atrule') context.unshift('@' + parent.name + ' ' + parent.params);
    for (const decl of rule.nodes.filter((node) => node.type === 'decl' && !node.prop.startsWith('--'))) {
      const value = normalize(decl.prop, resolve(decl.value));
      for (const selector of rule.selectors)
        out.push([context.join(' | '), selector, value, decl.important ? '!important' : ''].join(' ¦ '));
    }
  });
  return out;
}

const count = (list) => list.reduce((map, tuple) => map.set(tuple, (map.get(tuple) ?? 0) + 1), new Map());
const [a, b] = [tuples(process.argv[2]), tuples(process.argv[3])];
const [ca, cb] = [count(a), count(b)];
const onlyA = [];
const onlyB = [];
for (const [tuple, n] of ca) if ((cb.get(tuple) ?? 0) < n) onlyA.push(tuple + ' ×' + (n - (cb.get(tuple) ?? 0)));
for (const [tuple, n] of cb) if ((ca.get(tuple) ?? 0) < n) onlyB.push(tuple + ' ×' + (n - (ca.get(tuple) ?? 0)));
console.log(JSON.stringify({ base: a.length, unit: b.length, onlyBase: onlyA.length, onlyUnit: onlyB.length }));
for (const tuple of onlyA.slice(0, 20)) console.log('- ' + tuple);
for (const tuple of onlyB.slice(0, 20)) console.log('+ ' + tuple);
```

## 4. Lo que va en el PR (T044)

En inglés, con el problema completo:

- **El contexto:** qué dejaron los ports en `styles.css` y qué pide FR-054.
- **Qué se mudó:** el conteo de la evidencia por clase (`token`, `global`, `base`, `shell`, `single:*` y `orphan`), la ruta de la hoja del shell y su lugar en `main.tsx`, y la partición de `.small-label, .eyebrow, .topbar-label`.
- **Los tokens:** la tabla de research-f10c.md, R12, los alias que quedan para F15 y el multiconjunto resuelto.
- **FR-055:** la lista de reglas borradas, cada una con su evidencia, o «0 rules», con el conteo de la evidencia y los centinelas.
- **Las comparaciones:** el multiconjunto, el barrido (capturas y diferencias), el control de determinismo y los dos controles negativos con sus diferencias.
- **El tamaño:** `chars` antes y después y su diferencia; el aumento del router es 0.
- **Los hallazgos:** las reglas sin efecto de `.navigation a:last-child` (R8 de `css-contract`) y lo que la evidencia encuentre sin uso en las hojas de página.
- **Lo pendiente:** nada de F10c; los hallazgos van a sus dueños.
