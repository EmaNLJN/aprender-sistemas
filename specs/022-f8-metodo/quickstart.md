# Quickstart: F8 · Validación

**Plan:** [plan.md](./plan.md) · **Spec:** [spec.md](./spec.md)

Los comandos corren desde la raíz del worktree de F8. `$SCRATCH` es una carpeta fuera del repositorio: los scripts de las comparaciones viven ahí y no se commitean.

## 1. La línea base (T001)

### 1.1 Las medidas

```sh
git log --oneline -1
npm ci --offline
npm run build
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
npm run lint 2>&1 | grep -c complexity
npx eslint frontend/app.js --rule '{"complexity":["warn",{"max":1,"variant":"classic"}]}' 2>&1 | grep "Function 'render'"
node qa/app-shell-check.ts | tail -1
node qa/boot-check.ts | tail -1
node qa/seams-guard-check.ts | tail -1
npm run test:unit 2>&1 | tail -5
E2E_PORT=4173 npm run test:e2e 2>&1 | tail -3
```

**Guardar la base para las comparaciones.** Un worktree descartable en el SHA de T001, con su `dist/`:

```sh
git worktree add "$SCRATCH/f8-base" HEAD
(cd "$SCRATCH/f8-base" && npm ci --offline && npm run build)
```

### 1.2 Lo que trae la base («Ramas»)

| Pieza | Comando | «Está» si |
| --- | --- | --- |
| B1 | `git grep -n "routeStore.changes.subscribe(" -- frontend/app.js` | imprime una línea; anotar si llama a `syncShell` o a `updateSaveLabel` |
| B2 | `git grep -n "routeStore" -- qa/lib/legacy-sources.ts` | imprime algo |
| B3 | `git grep -n "REACT_VIEWS\|renderedText\|drawnText" -- qa` | imprime algo |
| B4 | `test -f qa/e2e/pages/method.ts && echo está` | imprime «está» |
| B5 | `test -f frontend/src/pages/systems/index.ts && echo está` | imprime «está» |
| B6 | `git grep -n "focusTimer" -- frontend/src/pages/route/index.ts` | imprime algo |
| B7 | `git log --oneline a24154d4..HEAD -- frontend/styles.css` | lista commits de F3, F4 o F9 |
| B8 | `git grep -ln "confirmReset()" -- qa/e2e/specs` | lista archivos |
| B9 | `git grep -n "projects" -- frontend/vitest.config.ts` | imprime algo (si no, parar) |
| B10 | `git grep -n "api.on('GET /api/" -- qa/e2e` | imprime algo: A3 sirve el contenido por la API (plan, «Rama A3») |

F11a tiene que estar:

```sh
ls frontend/src/app/account/api-client.ts frontend/src/shared/ui/form/index.ts qa/e2e/fixtures/api-double.ts
```

## 2. La compuerta de cada unidad

```sh
npm run build
npm test
npm run lint
npm run format:check
git diff --check
E2E_PORT=4173 npm run test:e2e -- --repeat-each=2 --retries=0
npm run lint 2>&1 | grep -c complexity
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
```

Lo que tiene que dar cada unidad:

| Unidad | Lo que queda en rojo a propósito | Lo que se compara |
| --- | --- | --- |
| U1 | `method-kept-state.spec.ts` (3) | — |
| U2 | Lo mismo | El multiconjunto y el barrido (§3.1) |
| U3 | Nada | La búsqueda de FR-010, `render()` en T001 + 1 y 21 escenarios en `app-shell-check` |
| U4 | Nada | La verificación a mano (§4) |
| U5 | Nada | §3.2, §3.3 y §5 |

## 3. Las comparaciones únicas

### 3.1 El CSS (T005)

**(a) El multiconjunto de declaraciones.** Es el script de F2b, sin cambios: [quickstart-f2b.md](../009-f2-seams/quickstart-f2b.md), §3.1(a).

```sh
node "$SCRATCH/css-multiset.mjs" "$SCRATCH/f8-base" .
```

Esperado: `onlyBase` 0 y `onlyUnit` 1, que es `.routine-note ¦ margin ¦ 22px 0 0`.

**(b) El barrido de estilo computado de Método.** Compara cuatro estados de Método:

- la página sola;
- con una ranura de respaldo;
- con notas;
- con la confirmación abierta.

Los recorre a seis anchos, con las dos preferencias de movimiento y en pantalla e impresión. La sesión se responde con `context.route`, porque desde F11a el arranque la pide. Esperado: `snapshots` 96 y `differences` 0. Antes de correrlo, los puertos 4511 y 4512 tienen que estar libres (`ss -ltn | grep -E ':451[12]\b'` no imprime nada).

```js
// node style-sweep-method.mjs <raíz base> <raíz de la unidad>
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [baseRoot, unitRoot] = process.argv.slice(2);
const require = createRequire(baseRoot + '/package.json');
const { chromium } = require('@playwright/test');
const STUDENT = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };
const WIDTHS = [1280, 981, 850, 650, 590, 375];
const MOTIONS = ['no-preference', 'reduce'];
const MEDIA = ['screen', 'print'];
const STATES = [
  ['metodo', {}, async () => {}],
  ['respaldo', { 'taller-campaign-v1': '{roto' }, async () => {}],
  ['notas', {}, async (page) => {
    await page.fill('#note-learned', 'Una nota larga para ver el campo con texto y su alto mínimo.');
    await page.fill('#note-next', 'Escribir un test.');
  }],
  ['confirmacion', {}, async (page) => {
    await page.getByRole('button', { name: 'Borrar mi progreso' }).click();
    await page.waitForSelector('#confirm-dialog[open]');
  }],
];

function serve(root, port) {
  return spawn(root + '/node_modules/.bin/vite', ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('server did not start: ' + url);
}
function contentVersion(root) {
  return JSON.parse(readFileSync(root + '/build/curriculum.meta.json', 'utf8')).documentHash.slice(0, 32);
}
async function snapshot(browser, origin, root, [, seeded, setup], width, motion, media) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: motion, locale: 'es-AR' });
  await context.route('**/api/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: STUDENT, features: { passwordReset: false, registration: false }, contentVersion: contentVersion(root), catalogs: [] }),
  }));
  await context.addInitScript((entries) => { for (const [key, text] of Object.entries(entries)) localStorage.setItem(key, text); }, seeded);
  const page = await context.newPage();
  await page.goto(origin + '/#metodo');
  await page.getByRole('heading', { name: 'Tu progreso te pertenece.' }).waitFor();
  await setup(page);
  await page.emulateMedia({ media });
  const result = await page.evaluate(() => {
    const out = {};
    const pathOf = (el) => { const parts = []; for (let n = el; n && n !== document.documentElement; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : ':' + [...n.parentElement.children].indexOf(n))); return parts.join('/'); };
    for (const el of document.querySelectorAll('#main *, #confirm-dialog, #confirm-dialog *')) {
      const cs = getComputedStyle(el); const props = {};
      for (let i = 0; i < cs.length; i++) props[cs[i]] = cs.getPropertyValue(cs[i]);
      out[pathOf(el)] = props;
    }
    return out;
  });
  await context.close();
  return result;
}

const base = serve(baseRoot, 4511), unit = serve(unitRoot, 4512);
try {
  await waitFor('http://127.0.0.1:4511/'); await waitFor('http://127.0.0.1:4512/');
  const browser = await chromium.launch();
  let snapshots = 0, values = 0, differences = 0; const samples = [];
  for (const state of STATES) for (const width of WIDTHS) for (const motion of MOTIONS) for (const media of MEDIA) {
    const a = await snapshot(browser, 'http://127.0.0.1:4511', baseRoot, state, width, motion, media);
    const b = await snapshot(browser, 'http://127.0.0.1:4512', unitRoot, state, width, motion, media);
    snapshots++;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const pa = a[key] ?? {}, pb = b[key] ?? {};
      for (const prop of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
        values++;
        if (pa[prop] !== pb[prop]) { differences++; if (samples.length < 15) samples.push([state[0], width, motion, media, key, prop, pa[prop], pb[prop]].join(' | ')); }
      }
    }
  }
  await browser.close();
  console.log(JSON.stringify({ snapshots, values, differences }));
  for (const s of samples) console.log(s);
} finally { base.kill(); unit.kill(); }
```

`pathOf` usa el id cuando existe, así que en el barrido de T005 el mismo DOM da las mismas claves. En T005 los dos lados son el legacy, y el `<p>` del `style=` pasa a la clase sin cambiar su lugar.

**(c) El control negativo.** Se hace una vez, en una copia descartable: dentro de `method.css`, el `@media print { .data-actions { … } }` va antes de la regla base `.data-actions`. Esperado:

- el multiconjunto, con las mismas cuentas;
- el barrido, con diferencias en impresión, porque `.data-actions` pasa de `display: none` a `flex`.

### 3.2 El DOM de Método (T021)

Compara el legacy de T005 (`git worktree add "$SCRATCH/f8-legacy" <SHA de T005>`, con su build) contra `f8/u3-port`. La serialización es canónica:

- las etiquetas en minúsculas y los atributos ordenados;
- sin `data-action`, `data-key` ni `data-note`;
- los nodos de texto vecinos, unidos;
- el `value` de cada `textarea`.

`#import-file` y `#confirm-dialog` se comparan aparte, porque cambian de lugar. Esperado: `differences` 0, con la cuenta de estados y de elementos.

```js
// node dom-compare-method.mjs <raíz legacy> <raíz del port>
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [legacyRoot, portRoot] = process.argv.slice(2);
const require = createRequire(legacyRoot + '/package.json');
const { chromium } = require('@playwright/test');
const STUDENT = { id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };
const route = (language, learned, next) => JSON.stringify({ version: 1, language, completed: [], milestones: [], favorites: [], quizAnswers: {}, notes: { rust: { learned, next }, go: { learned, next } }, minutes: 25 });
const STATES = [];
for (const language of ['rust', 'go']) for (const notes of [['', ''], ['<b>nota</b>', 'un paso']]) for (const backup of [false, true]) for (const open of [false, true]) {
  const seeded = { 'taller-learning-v1': route(language, ...notes), ...(backup ? { 'taller-campaign-v1': '{roto' } : {}) };
  STATES.push({ name: [language, notes[0] ? 'notas' : 'vacía', backup ? 'respaldo' : 'sin respaldo', open ? 'abierta' : 'cerrada'].join(' · '), seeded, open, blocked: false });
}
STATES.push({ name: 'almacenamiento bloqueado', seeded: {}, open: false, blocked: true });

function serve(root, port) {
  return spawn(root + '/node_modules/.bin/vite', ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('server did not start: ' + url);
}
async function capture(browser, origin, root, state) {
  const context = await browser.newContext({ locale: 'es-AR' });
  const contentVersion = JSON.parse(readFileSync(root + '/build/curriculum.meta.json', 'utf8')).documentHash.slice(0, 32);
  await context.route('**/api/session', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: STUDENT, features: { passwordReset: false, registration: false }, contentVersion, catalogs: [] }) }));
  if (state.blocked) await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage is blocked', 'SecurityError'); } }));
  else await context.addInitScript((entries) => { for (const [key, text] of Object.entries(entries)) localStorage.setItem(key, text); }, state.seeded);
  const page = await context.newPage();
  await page.goto(origin + '/#metodo');
  await page.getByRole('heading', { name: 'Tu progreso te pertenece.' }).waitFor();
  if (state.open) { await page.getByRole('button', { name: 'Borrar mi progreso' }).click(); await page.waitForSelector('#confirm-dialog[open]'); }
  const result = await page.evaluate(() => {
    const IGNORED = new Set(['data-action', 'data-key', 'data-note']);
    const canon = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.data;
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      if (node.id === 'import-file' || node.id === 'confirm-dialog') return '';
      const attributes = [...node.attributes].filter((a) => !IGNORED.has(a.name)).map((a) => `${a.name}="${a.value}"`).sort().join(' ');
      const value = node.tagName === 'TEXTAREA' ? ` value="${node.value}"` : '';
      const children = [...node.childNodes].map(canon).join('');
      return `<${node.tagName.toLowerCase()} ${attributes}${value}>${children}</${node.tagName.toLowerCase()}>`;
    };
    const element = (id) => { const found = document.getElementById(id); return found ? canon(Object.assign(found.cloneNode(true), { id: id + '-copy' })) : null; };
    return { main: canon(document.getElementById('main')), elements: document.querySelectorAll('#main *').length, importFile: element('import-file'), dialog: document.getElementById('confirm-dialog')?.open ? element('confirm-dialog') : null };
  });
  await context.close();
  return result;
}

const legacy = serve(legacyRoot, 4521), port = serve(portRoot, 4522);
try {
  await waitFor('http://127.0.0.1:4521/'); await waitFor('http://127.0.0.1:4522/');
  const browser = await chromium.launch();
  let elements = 0, differences = 0;
  for (const state of STATES) {
    const a = await capture(browser, 'http://127.0.0.1:4521', legacyRoot, state);
    const b = await capture(browser, 'http://127.0.0.1:4522', portRoot, state);
    elements += a.elements;
    for (const part of ['main', 'importFile', 'dialog']) {
      if (a[part] !== b[part]) { differences++; console.log(`${state.name} · ${part}\n- ${a[part]}\n+ ${b[part]}`); }
    }
  }
  await browser.close();
  console.log(JSON.stringify({ states: STATES.length, elements, differences }));
} finally { legacy.kill(); port.kill(); }
```

- **Después de U4,** se corre otra vez contra la punta final. Las diferencias de `dialog` en los estados con la confirmación abierta se listan en el PR: son las de Q1 (plan, T021). Ninguna otra parte puede cambiar.
- **Cuando la comparación encuentra algo,** se corrige el componente, salvo que sea una de las diferencias admitidas de FR-035, y se vuelve a correr.

### 3.3 Los bytes del archivo exportado (T021)

En los dos builds, con la fixture de master sembrada y `page.clock.setFixedTime('2026-03-04T05:06:07Z')`, se exporta desde Método y se guarda la descarga. Es el mismo flujo del E2E «from the page downloads the seeded progress…», con `download.saveAs`.

```sh
sha256sum "$SCRATCH/export-legacy.json" "$SCRATCH/export-port.json"
```

Esperado: el mismo hash.

## 4. La verificación a mano contra el stack (T020)

Con permiso para Docker, y con un alumno invitado:

```sh
docker compose up --build -d --wait
```

En `http://localhost:8080/#metodo`:

1. Escribir una nota y recargar: la nota sigue.
2. Abrir «Borrar mi progreso»: el foco está en «Tu contraseña».
3. Confirmar con una contraseña incorrecta: el mensaje queda en el campo, y las claves (herramientas del navegador, «Application» → «Local Storage») no cambian.
4. Confirmar con la correcta: «Progreso reiniciado. Un nuevo comienzo.», sólo `taller-learning-v1` en blanco y el foco en «Borrar mi progreso».
5. En la pestaña de red: `confirm-password` 201, `progress` 200 y `reset` 200, en ese orden.

```sh
docker compose down
```

## 5. El peso (T023)

```sh
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
```

Si crece más de 9 000 caracteres respecto de T001, la medida por módulo sale del `metafile` de esbuild:

```js
// node weight-by-module.mjs
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const esbuild = require('esbuild');
const result = await esbuild.build({
  entryPoints: ['frontend/src/app/main.tsx'], bundle: true, minify: true, write: false, metafile: true,
  format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, outdir: 'out',
  define: { 'process.env.NODE_ENV': '"production"', __CONTENT_VERSION__: '"x"' },
});
const groups = { 'pages/method': 0, 'app/progress-backup': 0, 'app/legacy/register-method': 0, otros: 0 };
for (const output of Object.values(result.metafile.outputs)) for (const [path, { bytesInOutput }] of Object.entries(output.inputs)) {
  const group = Object.keys(groups).find((name) => path.includes(name)) ?? 'otros';
  groups[group] += bytesInOutput;
}
console.log(groups);
```
