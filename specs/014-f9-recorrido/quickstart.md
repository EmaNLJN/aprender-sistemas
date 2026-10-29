# Quickstart: F9 · Validación

**Plan:** [plan.md](./plan.md) · **Research:** [research.md](./research.md)

Los comandos que verifican la entrega: la línea base, la compuerta, las dos comparaciones únicas y las pruebas de que las pruebas detectan algo. Se corren desde la raíz de un worktree.

Los scripts de §3 y §4 son descartables: viven fuera del repositorio, por ejemplo en `/tmp/f9-compare/`, y no se agregan a Git.

## 0. Una función para el hash

```sh
sha() { sha256sum "$@" 2>/dev/null || shasum -a 256 "$@"; }
```

## 1. La línea base (T001)

### 1.1 Los valores

Sobre la base de implementación, después de `npm ci --offline --no-audit --no-fund` y `npm run build`:

```sh
git rev-parse --short HEAD
node -e "const h=require('fs').readFileSync('dist/index.html','utf8');console.log(h.length)"
node -e "const h=require('fs').readFileSync('dist/index.html','utf8');const s=/<script type=\"module\"[^>]*>([\s\S]*?)<\/script>/.exec(h)[1];console.log('import(', (s.match(/import\(/g)||[]).length, 'import.meta', (s.match(/import\.meta/g)||[]).length)"
grep -n "BOOT_SIZE_LIMIT =" qa/build-check.ts
node -e "const h=require('fs').readFileSync('dist/index.html','utf8');for (const [n,r] of [['script',/<script\b[^>]*>([\s\S]*?)<\/script>/],['style',/<style\b[^>]*>([\s\S]*?)<\/style>/]]) console.log(n, require('crypto').createHash('sha256').update(r.exec(h)[1]).digest('hex'))"
node -e "const h=require('fs').readFileSync('dist/index.html','utf8');console.log(require('crypto').createHash('sha256').update(h.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/g,'\$1\$2').replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/g,'\$1\$2')).digest('hex'))"
sha build/curriculum.json && node tools/content/dump-globals.ts . | sha
npm test 2>&1 | tail -5
npm run lint 2>&1 | tail -3
npx eslint frontend/app.js -f json | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));for (const m of r[0].messages) if (m.ruleId==='complexity') console.log(m.line, m.message)"
E2E_PORT=4173 npm run test:e2e 2>&1 | tail -3
node qa/boot-check.ts | grep -c '^PASS'
node qa/app-shell-check.ts | grep -c '^PASS'
```

Se anotan en research.md («Línea base de la implementación»):

- el hash;
- `html.length` y `BOOT_SIZE_LIMIT` (1 500 000 desde #76);
- la cantidad de `import(` y de `import.meta` del script del dist (la base de TR-4);
- los hashes del script, del estilo, del marcado sin script ni estilo, de `build/curriculum.json` y de `dump-globals`;
- los avisos de lint y la línea de `render()` y de `renderRoute`;
- los E2E: 106 + 17, o lo que haya dejado F11a;
- los PASS de `boot-check` y de `app-shell-check`;
- la cantidad de pruebas de Vitest.

Después se anota la rama de cada fila de «Lo compartido con F3, F4 y F8» del plan, con sus comandos de detección.

### 1.2 El worktree de la base

```sh
git worktree add ../f9-base "$(git rev-parse HEAD)"
cd ../f9-base && npm ci --offline --no-audit --no-fund && npm run build && cd -
```

Las comparaciones de §3 y §4 lo usan como `<raíz base>`.

## 2. La compuerta

La corre K antes de abrir el PR, y cada dueño en lo que toca. Con una sola casilla en rojo, no se integra.

1. **Los comandos:**
   - `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`;
   - `E2E_PORT=<puerto> npm run test:e2e`;
   - con permiso, `docker compose build taller`.
2. **Los bytes,** contra T001:

   | Salida | T010 (CSS) | T018 (corte) |
   | --- | --- | --- |
   | `build/curriculum.json`, `dump-globals` y el check del bundle de A2 | igual | igual |
   | Script del dist | **igual** | cambia |
   | `<style>` del dist | cambia, con el multiconjunto igual (§3.1) | igual al de T010 |
   | Marcado del dist sin script ni estilo | igual | cambia sólo por la línea de `#lesson-dialog` |
   | `html.length` | | por debajo de 1 500 000 (`BOOT_SIZE_LIMIT`, #76); si crece más de 8 000 contra T001, lo revisa K |
   | `import.meta` en el script del dist | igual | T001 + 1: la entrada nueva de `LEGACY_MODULES` (`register-route`), porque Vite envuelve cada `import()` de `legacy-views.ts` con `import.meta.url` (TR-4). Otro número se informa a K antes de seguir |
   | `import(` en el script del dist | igual | igual |

3. **El marcado:** `git diff <base> -- frontend/src/index.html` muestra una sola línea borrada, la de `<dialog id="lesson-dialog" …>`.
4. **Sin estilos en línea nuevos:** `git diff <base> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'` no imprime nada.
5. **El retiro:**
   - `grep -nE "renderRoute|timerMarkup|updateTimer|setInterval|openLesson|lesson-dialog|data-step-check|data-dialog-action" frontend/app.js` no imprime nada;
   - `node qa/seams-guard-check.ts` da 0 violaciones.
6. **La complejidad:**
   - `npm run lint` da 0 errores, y los avisos no superan los de T001;
   - `renderRoute` ya no está;
   - `render()` se informa antes y después.
7. **La correspondencia** de los checks, en la descripción del PR (plan, «La correspondencia de los checks»).

## 3. El CSS (T010 y T019)

### 3.1 El multiconjunto y el barrido

**(a) El multiconjunto de declaraciones.** Es el script de [quickstart-f2b.md §3.1 (a)](../009-f2-seams/quickstart-f2b.md), sin cambios: cuenta por selector individual, así que partir las reglas de impresión no da diferencias.

```sh
node css-multiset.mjs ../f9-base .
```

Esperado: `onlyBase` y `onlyUnit` en 0.

**(b) El barrido de estilo computado.** Es el script de quickstart-f2b.md §3.1 (b), con seis cambios. Los dos últimos evitan las trampas del barrido que encontró F5 (TR-13):

1. **La clave de cada elemento** sale del ancestro más cercano con `id`, y nunca de la posición en `<body>`. Así, el lugar de la lección no corre los índices de los hermanos.
2. **`#lesson-dialog` cerrado no se mira.** Es el estático de hoy, invisible, que el port quita (FR-017).
3. **Se suman los estados del Recorrido** que pide FR-041.
4. **Se suman dos capturas en impresión.**
5. **El puntero fuera.** React conserva el nodo que quedó bajo el puntero después de un clic, así que conserva su `:hover`. `await page.mouse.move(0, 0);` va después de `prepare` y antes de capturar.
6. **Lo de adentro de un `<details>` cerrado no se compara,** salvo su `<summary>`: un `<details>` cerrado da otro tamaño computado si alguna vez se midió. Son los módulos cerrados del Recorrido.

**Si aparecen diferencias sub-píxel** en `width`, `inline-size` o `*-origin` de un texto, primero se busca un texto que JSX partió en varios nodos (una expresión pegada a un texto, o un `{' '}` de Prettier) y se arma en un solo nodo, con un template literal: el kerning cambia el ancho. Nunca se aceptan con una tolerancia. El `<pre>` de la ilustración empieza con `fn` y `func`, sin salto de línea inicial, así que la trampa del primer salto que descarta el analizador de HTML no aplica.

Esperado: `differences` en 0.

```js
// node route-style-sweep.mjs <raíz base> <raíz del cambio>; PAGES=a,b y WIDTHS=590,981 acotan la corrida
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const [baseRoot, unitRoot] = process.argv.slice(2);
const require = createRequire(baseRoot + '/package.json');
const { chromium } = require('@playwright/test');

const RUST_IDS = ['rust-first-session', 'rust-ownership', 'rust-errors', 'rust-kv-memory', 'rust-kv-cli', 'rust-kv-tests', 'rust-save', 'rust-load', 'rust-measure', 'rust-protocol', 'rust-local-server', 'rust-next-challenge'];
const route = (overrides) => JSON.stringify({ version: 1, language: 'rust', completed: [], milestones: [], favorites: [], quizAnswers: {}, notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } }, minutes: 25, ...overrides });
const clickSummary = (page, title) => page.locator('details.module summary', { hasText: title }).click();

const ALL_PAGES = [
  { name: 'recorrido', path: '/#recorrido' }, { name: 'campana', path: '/#campana' }, { name: 'sistemas', path: '/#sistemas' },
  { name: 'atlas', path: '/#atlas' }, { name: 'laboratorio', path: '/#laboratorio' }, { name: 'biblioteca', path: '/#biblioteca' },
  { name: 'proyecto', path: '/#proyecto' }, { name: 'metodo', path: '/#metodo' },
  { name: 'mission', path: '/?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio' },
  { name: 'lock', path: '/?campana=rust-world-1&ejercicio=rust-103&paso=learn#laboratorio' },
  { name: 'core', path: '/?sistema=cache&ejercicio=rust-113&paso=code#laboratorio' },
  { name: 'workshop', path: '/?lenguaje=rust&taller=cache&parte=explore#sistemas' },
  { name: 'lab-empty', path: '/#laboratorio', prepare: async (page) => { await page.fill('#lab-search', 'zzzz'); await page.waitForSelector('.lab-empty'); } },
  { name: 'sys-empty', path: '/?lenguaje=rust#sistemas', prepare: async (page) => { await page.fill('#sys-search', 'zzzz'); await page.waitForSelector('.lab-empty'); } },
  { name: 'route-some', path: '/#recorrido', seed: route({ completed: RUST_IDS.slice(0, 5) }) },
  { name: 'route-all', path: '/#recorrido', seed: route({ completed: RUST_IDS }) },
  { name: 'route-go', path: '/#recorrido', seed: route({ language: 'go', completed: ['go-first-session'] }) },
  { name: 'route-modules', path: '/#recorrido', prepare: async (page) => {
    await clickSummary(page, 'Construí tu almacén clave-valor');
    await clickSummary(page, 'Abrí la puerta a las redes');
    await clickSummary(page, 'Ganá confianza con el compilador');
  } },
  { name: 'lesson-right', path: '/#recorrido', prepare: async (page) => {
    await page.getByRole('button', { name: 'Empezar esta sesión' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Ese caso comprobó/ }).click();
  } },
  { name: 'lesson-wrong', path: '/#recorrido', prepare: async (page) => {
    await page.getByRole('button', { name: 'Empezar esta sesión' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /El programa es correcto/ }).click();
  } },
  { name: 'print-route', path: '/#recorrido', media: 'print' },
  { name: 'print-route-all', path: '/#recorrido', seed: route({ completed: RUST_IDS }), media: 'print' },
];
const WIDTHS = (process.env.WIDTHS ?? '1280,981,850,650,590,375').split(',').map(Number);
const PAGES = process.env.PAGES ? ALL_PAGES.filter(({ name }) => process.env.PAGES.split(',').includes(name)) : ALL_PAGES;
const MOTIONS = ['no-preference', 'reduce'];

function serve(root, port) {
  return spawn(root + '/node_modules/.bin/vite', ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('server did not start: ' + url);
}
async function snapshot(browser, origin, spec, width, motion) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: motion, locale: 'es-AR' });
  if (spec.seed) await context.addInitScript((seed) => { localStorage.setItem('taller-learning-v1', seed); }, spec.seed);
  const page = await context.newPage();
  await page.goto(origin + spec.path);
  await page.waitForFunction(() => document.querySelector('#main')?.children.length > 0);
  if (spec.prepare) await spec.prepare(page);
  await page.mouse.move(0, 0);
  if (spec.media) await page.emulateMedia({ media: spec.media });
  const result = await page.evaluate(() => {
    const keyOf = (element) => {
      const parts = [];
      for (let node = element; node; node = node.parentElement) {
        if (node.id) { parts.unshift('#' + node.id); break; }
        if (node === document.documentElement) { parts.unshift('html'); break; }
        const siblings = [...node.parentElement.children].filter((child) => child.id !== 'lesson-dialog');
        parts.unshift(node.tagName.toLowerCase() + ':' + siblings.indexOf(node));
      }
      return parts.join('/');
    };
    const out = {};
    for (const element of [document.documentElement, ...document.querySelectorAll('*')]) {
      if (element.closest('#lesson-dialog:not([open])')) continue;
      const details = element.parentElement?.closest('details');
      if (details && !details.open && element.closest('summary') === null) continue;
      const style = getComputedStyle(element); const props = {};
      for (let i = 0; i < style.length; i++) props[style[i]] = style.getPropertyValue(style[i]);
      out[keyOf(element)] = props;
    }
    return out;
  });
  await context.close();
  return result;
}

const base = serve(baseRoot, 4501), unit = serve(unitRoot, 4502);
try {
  await waitFor('http://127.0.0.1:4501/'); await waitFor('http://127.0.0.1:4502/');
  const browser = await chromium.launch();
  let snapshots = 0, elements = 0, values = 0, differences = 0; const samples = [];
  for (const spec of PAGES) for (const width of WIDTHS) for (const motion of MOTIONS) {
    const a = await snapshot(browser, 'http://127.0.0.1:4501', spec, width, motion);
    const b = await snapshot(browser, 'http://127.0.0.1:4502', spec, width, motion);
    snapshots++;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      elements++;
      const pa = a[key] ?? {}, pb = b[key] ?? {};
      for (const prop of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
        values++;
        if (pa[prop] !== pb[prop]) { differences++; if (samples.length < 15) samples.push([spec.name, width, motion, key, prop, pa[prop], pb[prop]].join(' | ')); }
      }
    }
  }
  await browser.close();
  console.log(JSON.stringify({ snapshots, elements, values, differences }));
  for (const sample of samples) console.log(sample);
} finally { base.kill(); unit.kill(); }
```

Antes de correrlo, los puertos 4501 y 4502 tienen que estar libres: `ss -ltn | grep -E ':450[12]\b'` no imprime nada.

**Cuándo se corre y qué se espera:**

| Tarea | Base | Cambio | Esperado |
| --- | --- | --- | --- |
| T010 | `../f9-base` (legacy con `styles.css`) | el worktree de C (legacy con `route.css`) | 264 capturas (22 × 6 × 2) y 0 diferencias |
| T019 | `../f9-base` | la rama con T018 (la página de React) | 264 capturas y 0 diferencias. Una diferencia sólo en una clave que existe de un lado y no del otro es un nodo de más o de menos: la mira §4 |

### 3.2 El control negativo (T010, una vez)

En una copia descartable del worktree de C, el import de `route.css` pasa antes del de `styles.css` en `main.tsx`. Después, `npm run build` y el barrido con `PAGES=recorrido WIDTHS=1280`.

- **Esperado:** el multiconjunto, con 0 diferencias, y el barrido con diferencias en el botón «↺» (`text-decoration-line`: `.text-button` le gana a `.timer-reset`).
- **Si da 0,** el barrido no está mirando lo que tiene que mirar: se para y se informa.

## 4. La comparación única del HTML (T019, SC-003)

Compara el DOM del legacy (`../f9-base`) con el de la página (la rama con T018) sobre la misma grilla.

**La normalización:**

- saca los `data-*` de delegación (`data-action`, `data-id`, `data-minutes`, `data-step-check`, `data-dialog-action` y `data-answer`);
- lee `checked` y `open` como propiedades y no como atributos;
- ordena los atributos;
- descarta los nodos de texto que sólo tienen espacios, salvo dentro de `<pre>`;
- junta los nodos de texto vecinos.

**Las diferencias de serialización que la normalización ya absorbe:**

- los `\n    ` entre las secciones de `#main`, que dejaba la plantilla de `renderRoute`;
- un mismo texto partido en varios nodos por React;
- el atributo `checked` del legacy, que React pone como propiedad.

**La que se comprueba aparte:** que el diálogo de la lección cuelgue de `<body>` en los dos.

**Esperado:** 0 diferencias en 72 páginas y 192 lecciones.

```js
// node route-html-compare.mjs <raíz base> <raíz del cambio>
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [baseRoot, unitRoot] = process.argv.slice(2);
const require = createRequire(baseRoot + '/package.json');
const { chromium } = require('@playwright/test');
const guide = JSON.parse(readFileSync(baseRoot + '/build/curriculum.json', 'utf8')).guide;
const stepsOf = (language) => guide.tracks[language].modules.flatMap((module) => module.steps);
const route = (overrides) => JSON.stringify({ version: 1, language: 'rust', completed: [], milestones: [], favorites: [], quizAnswers: {}, notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } }, minutes: 25, ...overrides });

function serve(root, port) {
  return spawn(root + '/node_modules/.bin/vite', ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('server did not start: ' + url);
}

const NORMALIZE = () => {
  const DROPPED = new Set(['data-action', 'data-id', 'data-minutes', 'data-step-check', 'data-dialog-action', 'data-answer', 'checked']);
  const normalize = (node, insidePre) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const pre = insidePre || node.tagName === 'PRE';
    const attrs = [...node.attributes].filter((a) => !DROPPED.has(a.name)).map((a) => [a.name, a.value]).sort();
    const props = {};
    if (node.tagName === 'INPUT') props.checked = node.checked;
    if (node.tagName === 'DETAILS' || node.tagName === 'DIALOG') props.open = node.open;
    const children = [];
    for (const child of node.childNodes) {
      const value = normalize(child, pre);
      if (value === null) continue;
      if (typeof value === 'string') {
        if (!pre && value.trim() === '') continue;
        if (typeof children.at(-1) === 'string') children[children.length - 1] += value;
        else children.push(value);
      } else children.push(value);
    }
    return { tag: node.tagName.toLowerCase(), attrs, props, children };
  };
  window.__normalize = (element) => (element ? JSON.stringify(normalize(element, false)) : 'missing');
};

async function capture(browser, origin, { seed, timer, minutes, lessons }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-AR' });
  await context.addInitScript((value) => localStorage.setItem('taller-learning-v1', value), seed);
  await context.addInitScript(NORMALIZE);
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-05T12:00:00-03:00') });
  await page.clock.pauseAt(new Date('2026-10-05T12:00:01-03:00'));
  await page.goto(origin + '/#recorrido');
  await page.waitForFunction(() => document.querySelector('#main')?.children.length > 0);
  const out = [];
  if (timer !== 'idle') {
    await page.getByRole('button', { name: 'Iniciar foco' }).click();
    await page.clock.runFor(timer === 'finished' ? minutes * 60_000 : 60_000);
    if (timer === 'paused') await page.getByRole('button', { name: 'Pausar' }).click();
  }
  if (!lessons) out.push(await page.evaluate(() => window.__normalize(document.querySelector('#main'))));
  for (const step of lessons ?? []) {
    await page.evaluate(() => document.querySelectorAll('details.module').forEach((module) => { module.open = true; }));
    await page.getByRole('button', { name: `Abrir ${step.title}`, exact: true }).click();
    await page.getByRole('dialog').waitFor();
    out.push(await page.evaluate(() => {
      const dialog = document.querySelector('#lesson-dialog');
      return (dialog?.parentElement === document.body ? 'body ' : 'elsewhere ') + window.__normalize(dialog);
    }));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  }
  await context.close();
  return out;
}

const grid = [];
for (const language of ['rust', 'go']) {
  const ids = stepsOf(language).map((step) => step.id);
  for (const completed of [[], ids.slice(0, 5), ids])
    for (const minutes of [15, 25, 45])
      for (const timer of ['idle', 'running', 'paused', 'finished'])
        grid.push({ name: `${language} ${completed.length} ${minutes} ${timer}`, seed: route({ language, completed, minutes }), timer, minutes });
  for (const completed of [[], ids])
    for (const answer of [undefined, 0, 1, 2])
      grid.push({ name: `${language} lessons ${completed.length} ${answer}`, seed: route({ language, completed, quizAnswers: answer === undefined ? {} : Object.fromEntries(ids.map((id) => [id, answer])) }), timer: 'idle', minutes: 25, lessons: stepsOf(language) });
}

const base = serve(baseRoot, 4503), unit = serve(unitRoot, 4504);
try {
  await waitFor('http://127.0.0.1:4503/'); await waitFor('http://127.0.0.1:4504/');
  const browser = await chromium.launch();
  let pages = 0, lessons = 0, differences = 0; const samples = [];
  for (const state of grid) {
    const a = await capture(browser, 'http://127.0.0.1:4503', state);
    const b = await capture(browser, 'http://127.0.0.1:4504', state);
    if (state.lessons) lessons += a.length; else pages += a.length;
    a.forEach((value, index) => { if (value !== b[index]) { differences++; if (samples.length < 5) samples.push(`${state.name} #${index}\n- ${value.slice(0, 400)}\n+ ${b[index]?.slice(0, 400)}`); } });
  }
  await browser.close();
  console.log(JSON.stringify({ pages, lessons, differences }));
  for (const sample of samples) console.log(sample);
} finally { base.kill(); unit.kill(); }
```

**Esperado:** `{"pages":72,"lessons":192,"differences":0}`. Una diferencia se busca en el JSX de la tarea dueña: un espacio, una clase o un orden. Nunca en la normalización, salvo que sea una diferencia de serialización de React que no esté en la lista de arriba. En ese caso se agrega a la lista con su motivo y se informa en el PR.

## 5. Las pruebas de que las pruebas detectan algo

Cada mutación se hace en una copia descartable, una vez, y su resultado va al informe de la tarea:

| Mutación | Tarea | Tiene que fallar |
| --- | --- | --- |
| En `focus-timer.ts`, `pause()` sin `stopTicking()` | T014 | «pausing freezes the remaining time and leaves no timer alive» |
| En `RouteModules.tsx`, `open={index === defaultOpenModule(track.modules, completed)}` | T016 | «leaves the modules as the student left them…» (Vitest) y, después de T018, los dos de módulos de `route-kept-state.spec.ts` |
| En `FocusCard.tsx`, `key={next.id}` en el botón | T016 | «completes with one write, closes, announces and returns the focus to the card» |
| En `app.js`, sin `routeStore.changes.subscribe(() => syncShell())` | T018 | «checking the first step updates the counters, the card and the sidebar with one write» (`1 de 12`) |
| En `route.css`, la regla `.focus-timer` de impresión, que vuelve a la lista compartida de `styles.css` | T010 | «printing hides the focus timer and keeps the next step» y el barrido en impresión |
| El import de `route.css` antes del de `styles.css` | T010 | el barrido (§3.2) |
| En `app.js`, el `setInterval(updateTimer, 500)` de vuelta | T018 | `boot-check`: «startApp registers no interval» |

## 6. El cierre (T021)

- La compuerta de §2 sobre la rama entera.
- Las cantidades de §3 y §4.
- La tabla de correspondencia y las ramas aplicadas, en la descripción del PR.
- `git worktree remove ../f9-base` al terminar.
