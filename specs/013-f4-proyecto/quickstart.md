# Quickstart: F4 · Validación

Cómo se comprueba que el port de Proyecto no cambió nada de lo que el alumno ve ni guarda, salvo los dos cambios aprobados: los comandos, los valores esperados, el script de la comparación única y las roturas deliberadas. El procedimiento de cada tarea está en el [plan](./plan.md) y las decisiones, en [research.md](./research.md). Todo corre desde la raíz del worktree, con Node 24 y sin descargar nada.

## 0. Una función para el hash

Portable entre Linux y macOS, como en F2:

```sh
sha() { node -e 'const h=require("node:crypto").createHash("sha256");process.stdin.on("data",d=>h.update(d)).on("end",()=>console.log(h.digest("hex")))'; }
```

## 1. La línea base (T001)

1. **La base en verde:** en un worktree limpio de la base de implementación, `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4190 npm run test:e2e`. Con la base de planificación son 39 checks, 719 pruebas de Vitest, 123 E2E y 35 avisos; anotá los reales.
2. **Los oráculos:**

   ```sh
   sha < build/curriculum.json
   for f in dist/content/curriculum.*.json; do echo "$f"; sha < "$f"; done
   node tools/content/dump-globals.ts . | sha
   sha < frontend/src/index.html
   sha < qa/fixtures/shared/route-milestones.json   # f955c92bc3138f895ea27233bb9e1030c0266b7e2a08783f18d1c1feda8d1054
   node qa/dist-content-check.ts
   ```

3. **El dist, en partes:**

   ```sh
   node -e '
   const fs=require("node:fs"),c=require("node:crypto");
   const sha=(s)=>c.createHash("sha256").update(s).digest("hex");
   const html=fs.readFileSync("dist/index.html","utf8");
   const style=/<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
   const script=/<script\b[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
   const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,"<script></script>").replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,"<style></style>");
   console.log(JSON.stringify({chars:html.length,script:sha(script),style:sha(style),markup:sha(markup),dynamicImports:(html.match(/\bimport\(/g)||[]).length,importMeta:(html.match(/import\.meta/g)||[]).length}));'
   ```

   - **Con la base de planificación:** `chars` 1 141 337, `dynamicImports` 0 e `importMeta` 22.
   - **El tope de F4** es `chars` de la base + 10 000, y siempre menos de 1 250 000.
4. **El multiconjunto del CSS:** `node css-multiset.mjs <base> <base>` (§3.1) da `onlyBase: 0` y `onlyUnit: 0`. Anotá `base`.
5. **La complejidad:**
   - `npm run lint 2>&1 | grep -c complexity` da la cantidad de avisos;
   - `npx eslint frontend/app.js --rule '{"complexity":["warn",{"max":1,"variant":"classic"}]}' 2>&1 | grep "Function 'render'"` da el valor de `render()`, que por lectura es 11.
6. **Los checks y Vitest:**
   - **`app-shell-check`:** `node qa/app-shell-check.ts | grep -c '^PASS'` da 58 en `2b37caf4`.
   - **`boot-check`:** `node qa/boot-check.ts | grep -c '^PASS'`.
   - **`load-order-check`:** `node qa/load-order-check.ts` imprime la cantidad de restricciones.
   - **Vitest:** `npx vitest list --config frontend/vitest.config.ts --filesOnly | wc -l` da los archivos (con `--project node` si ya hay dos proyectos) y `npm run test:unit` las pruebas.
7. **Lo compartido:** qué hay en `master` de «Lo compartido con F3 y F9» del plan. Por ejemplo, `grep -n "routeStore.changes.subscribe" frontend/app.js`, `grep -n "toggleMark\|toggle" frontend/src/entities/guide/model/route-store.ts`, `grep -n jsdom package.json` y `grep -n "blockWrites\|setItem" qa/e2e/fixtures/storage-control.ts`.
8. **Todo va a `$TMPDIR/f4-baseline.txt`;** T010 lo copia a research.md.

## 2. La compuerta de un commit y del PR

Con el build hecho, se repiten §1.2 y §1.3, y se compara con T001:

| Salida | Commit 2 (CSS) | Commits 5 y 6 (port y pista) |
| --- | --- | --- |
| `build/curriculum.json`, `dist/content/…`, `dump-globals`, `dist-content-check` y `route-milestones.json` | iguales | iguales |
| `script` | igual | cambia |
| `style` | cambia; el multiconjunto en 0 y la comparación §3.2 en 0 | igual al del commit 2 |
| `markup` y `frontend/src/index.html` | iguales | iguales |
| `dynamicImports` e `importMeta` | los de la base | los de la base |
| `chars` | ≤ base + 200 | ≤ base + 10 000 y < 1 250 000 |

Y estos comandos:

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=<puerto> npm run test:e2e
git diff <base> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText|dangerouslySetInnerHTML)'   # vacío
git diff <base> --stat -- backend/ content/ frontend/src/features/download-project-kit/ frontend/src/app/legacy/register-project-kit.ts frontend/src/entities/guide/model/milestone-ids.spec.ts   # vacío
git diff <base> -- package.json package-lock.json   # vacío, salvo el commit de T004
grep -nE "renderProject|const milestones|data-milestone" frontend/app.js   # vacío desde el commit 5
npm run lint 2>&1 | grep -c complexity   # igual a T001
npx eslint frontend/app.js --rule '{"complexity":["warn",{"max":1,"variant":"classic"}]}' 2>&1 | grep "Function 'render'"   # T001 + 1 desde el commit 5
```

Los E2E esperados:

| Después de | Pasan | Fallan |
| --- | --- | --- |
| T001 (base) | 123 | — |
| Commit 1 (E2E) | 140 | — |
| Commit 2 (CSS) | 140 | — |
| Commit 4 (specs rojas) | 140 | el E2E 8, en `toHaveJSProperty('open', true)` |
| Commit 5 (port) | 141 | — |
| Commit 6 (pista de Go) | 141 | — |

## 3. Las comparaciones únicas

- **Dónde corren:** fuera del repositorio, sobre dos raíces: un worktree del commit base de T001 y la del commit que se compara.
- **Qué no se commitea:** ninguno de estos archivos.
- **Sus dependencias:** los scripts resuelven `postcss` y `@playwright/test` desde el `node_modules` de la raíz que reciben, así que se guardan en cualquier carpeta temporal (`$TMPDIR/f4-compare/`).

```sh
git worktree add "$TMPDIR/f4-base" <base>        # el commit base de T001
ln -s "$PWD/node_modules" "$TMPDIR/f4-base/node_modules"
(cd "$TMPDIR/f4-base" && npm run build)          # regenera build/ y dist/ en la base
npm run build                                    # en la raíz del commit que se compara
ss -ltn | grep -E ':460[12]\b'                   # vacío: los puertos 4601 y 4602 libres
```

### 3.1 El CSS (T003; y otra vez en T007)

- **(a) El multiconjunto de reglas:** es `css-multiset.mjs` de [quickstart-f2b.md §3.1](../009-f2-seams/quickstart-f2b.md), sin cambios.
  - **Qué compara:** cada selector por separado, con su contexto `@media`, su propiedad, su valor y su `!important`. Así, partir la regla de impresión no cuenta como diferencia.
  - **Esperado:** `onlyBase: 0` y `onlyUnit: 0`, con `base` igual a `unit`.
- **(b) La comparación de §3.2** entre la base y el commit 2. Esperado: `treeDifferences: 0` y `styleDifferences: 0`. El DOM de las dos raíces es el del legacy, así que cualquier diferencia de estilo es de cascada.
- **(c) El control negativo,** una vez, en una copia descartable del commit 2:
  - **Qué se cambia:** se mueve el bloque `@media (max-width: 590px) { … }` de `project.css` al principio de la hoja, antes de `.project-hero`, y se construye.
  - **Esperado:** el multiconjunto sigue en 0 y la comparación da diferencias a 590 px, por ejemplo el `padding` de `.milestone`, que pasa de 19 px a 22 px. Si no las da, la comparación no ve la cascada y no sirve como prueba.

### 3.2 El DOM y el estilo computado de la página (T003 y T007)

Siete estados, sembrados en `localStorage` antes de cargar, se capturan con la página en `#proyecto`:

- **Rust:** sin hitos, con el primero marcado y con los cinco marcados;
- **Go:** lo mismo;
- **la fixture congelada de master:** Go activo y `rust-memory` marcado.

De cada estado se toman:

- **el árbol de `#main`,** a 1 280 px, normalizado: los nodos de texto adyacentes unidos, los atributos ordenados, `data-milestone`, `data-project-library` y el atributo `checked` ignorados, y `checked` y `open` comparados como propiedades;
- **el estilo computado** de cada elemento del documento, a 1 600, 1 280, 981, 850, 650 y 590 px, y en impresión a 1 280 px: 49 capturas.

**Esperado:** `trees` 7, `treeDifferences` 0, `captures` 49 y `styleDifferences` 0. Tarda unos minutos.

```js
// node project-compare.mjs <raíz base> <raíz que se compara>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const [baseRoot, otherRoot] = process.argv.slice(2);
const require = createRequire(baseRoot + '/package.json');
const { chromium } = require('@playwright/test');

function serve(root, port) {
  return spawn(
    root + '/node_modules/.bin/vite',
    ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: root, stdio: 'ignore' },
  );
}

async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('server did not start: ' + url);
}

const SUFFIXES = ['memory', 'commands', 'files', 'measure', 'network'];
const route = (language, milestones) =>
  JSON.stringify({
    version: 1,
    language,
    completed: [],
    milestones,
    favorites: [],
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
  });
const master = JSON.parse(
  fs.readFileSync(baseRoot + '/qa/fixtures/progress-master-2a278ad-storage.json', 'utf8'),
);
const STATES = [
  ['rust-none', { 'taller-learning-v1': route('rust', []) }],
  ['rust-first', { 'taller-learning-v1': route('rust', ['rust-memory']) }],
  ['rust-all', { 'taller-learning-v1': route('rust', SUFFIXES.map((suffix) => 'rust-' + suffix)) }],
  ['go-none', { 'taller-learning-v1': route('go', []) }],
  ['go-first', { 'taller-learning-v1': route('go', ['go-memory']) }],
  ['go-all', { 'taller-learning-v1': route('go', SUFFIXES.map((suffix) => 'go-' + suffix)) }],
  ['master', master],
];
const CAPTURES = [
  [1600, 'screen'],
  [1280, 'screen'],
  [981, 'screen'],
  [850, 'screen'],
  [650, 'screen'],
  [590, 'screen'],
  [1280, 'print'],
];

async function open(browser, origin, storage, width, media) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'es-AR' });
  await context.addInitScript((entries) => {
    for (const [key, text] of Object.entries(entries)) localStorage.setItem(key, text);
  }, storage);
  const page = await context.newPage();
  await page.goto(origin + '/#proyecto');
  await page.waitForSelector('#main .milestones article.milestone');
  await page.emulateMedia({ media });
  return { context, page };
}

function readTree() {
  const IGNORED = new Set(['data-milestone', 'data-project-library', 'checked']);
  const main = document.querySelector('#main').cloneNode(true);
  main.normalize();
  const serialize = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return { text: node.data };
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const entry = {
      tag: node.localName,
      attributes: [...node.attributes]
        .filter((attribute) => !IGNORED.has(attribute.name))
        .map((attribute) => [attribute.name, attribute.value])
        .sort(),
    };
    if (node.localName === 'input') entry.checked = node.checked;
    if (node.localName === 'details') entry.open = node.open;
    entry.children = [...node.childNodes].map(serialize).filter(Boolean);
    return entry;
  };
  const articles = [...document.querySelectorAll('#main article.milestone')];
  const texts = articles.flatMap((article) =>
    [...article.querySelectorAll('h2, :scope > p, details > p')].map((element) => element.textContent),
  );
  return { tree: JSON.stringify(serialize(main)), texts };
}

function readStyles() {
  const out = {};
  const pathOf = (element) => {
    const parts = [];
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      parts.unshift(node.tagName.toLowerCase() + ':' + [...node.parentElement.children].indexOf(node));
    }
    return parts.join('/');
  };
  for (const element of [document.documentElement, ...document.querySelectorAll('*')]) {
    const computed = getComputedStyle(element);
    const properties = {};
    for (let i = 0; i < computed.length; i++) properties[computed[i]] = computed.getPropertyValue(computed[i]);
    out[pathOf(element)] = properties;
  }
  return out;
}

function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return [a.slice(Math.max(0, i - 120), i + 120), b.slice(Math.max(0, i - 120), i + 120)];
}

const baseServer = serve(baseRoot, 4601);
const otherServer = serve(otherRoot, 4602);
try {
  await waitFor('http://127.0.0.1:4601/');
  await waitFor('http://127.0.0.1:4602/');
  const browser = await chromium.launch();
  let trees = 0, treeDifferences = 0, texts = 0, captures = 0, elements = 0, values = 0, styleDifferences = 0;
  const samples = [];
  for (const [name, storage] of STATES) {
    for (const [width, media] of CAPTURES) {
      const a = await open(browser, 'http://127.0.0.1:4601', storage, width, media);
      const b = await open(browser, 'http://127.0.0.1:4602', storage, width, media);
      if (width === 1280 && media === 'screen') {
        trees++;
        const [ta, tb] = [await a.page.evaluate(readTree), await b.page.evaluate(readTree)];
        texts += ta.texts.length;
        if (ta.tree !== tb.tree || JSON.stringify(ta.texts) !== JSON.stringify(tb.texts)) {
          treeDifferences++;
          samples.push(['tree', name, ...firstDifference(ta.tree, tb.tree)].join(' | '));
        }
      }
      const [sa, sb] = [await a.page.evaluate(readStyles), await b.page.evaluate(readStyles)];
      captures++;
      for (const key of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
        elements++;
        const pa = sa[key] ?? {}, pb = sb[key] ?? {};
        for (const property of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
          values++;
          if (pa[property] !== pb[property]) {
            styleDifferences++;
            if (samples.length < 20) samples.push(['style', name, width, media, key, property, pa[property], pb[property]].join(' | '));
          }
        }
      }
      await a.context.close();
      await b.context.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify({ trees, treeDifferences, texts, captures, elements, values, styleDifferences }));
  for (const sample of samples) console.log(sample);
} finally {
  baseServer.kill();
  otherServer.kill();
}
```

- **`texts`:** da 140, que son 7 estados por 5 hitos por 4 campos (FR-030). Desde T008, los estados de Go difieren en la pista del primer hito; por eso la comparación se corre antes de T008 (FR-030, SC-004).
- **Si algo da distinto de cero,** las muestras dicen dónde. Una diferencia de árbol es un defecto del port o un texto copiado mal. Una de estilo con el árbol igual es de cascada (§3.1, c). Ninguna se resuelve editando el script.

## 4. Las roturas deliberadas (T009)

- **Dónde:** cada una se aplica en una copia descartable del árbol con T008, sin commit, y se revierte antes de la siguiente.
- **Si la prueba prevista es un E2E:** antes, `npm run build`.
- **Esperado:** cada prueba de la columna derecha falla. Son 11 de 11 (SC-007).

| # | Rotura (FR-031) | Cómo se aplica | Falla |
| --- | --- | --- | --- |
| 1 | Renombrar un sufijo del catálogo | `suffix: 'files'` → `'file'` en `project-milestones.ts` | `project-milestones.spec.ts` («builds the ten persisted ids…»), `milestone-ids.spec.ts`, `node qa/route-milestones-check.ts` y el E2E «each of the ten milestones…» |
| 2 | Intercambiar dos hitos | Cambiar de lugar las entradas `commands` y `files` | `project-milestones.spec.ts` (los títulos y los IDs), `project-progress.spec.ts` y los E2E 1 y 11 |
| 3 | Fijar el prefijo `rust-` al alternar | En `ProjectPage.tsx`, `routeStore.toggleMark('milestones', milestone.id.replace(/^go-/, 'rust-'))` | `ProjectPage.spec.tsx` («saves the id of a checked milestone…», en Go) y los E2E «Rust and Go keep separate progress» y «each of the ten milestones…» |
| 4 | Dejar la rama `data-milestone` en `app.js` junto con el atributo en la página | Restaurar la rama del delegado de `change` y sumar `data-milestone={milestone.id}` a la casilla de `MilestoneCard.tsx` | Los E2E «checking a milestone saves its id with one write…» y «a checked milestone stays checked after a reload» |
| 5 | Alternar sin guardar | En `toggleMark`, borrar `const saved = write(current);` y devolver `true` | `route-store.spec.ts` («appends an absent id… saves once») y el E2E «a checked milestone stays checked after a reload» |
| 6 | Guardar dos veces por alternancia | En `toggleMark`, llamar dos veces a `write(current)` | `route-store.spec.ts` (`writes` igual a `[KEY]`), `ProjectPage.spec.tsx` («…with one write…») y el E2E «…with one write…» |
| 7 | No actualizar el pie tras un guardado que falla | Borrar `routeStore.changes.subscribe(updateSaveLabel);` de `app.js` | El E2E «when setItem fails mid-session, the footer changes on the first save» |
| 8 | Perder los saltos de línea de la terminal | Cambiar `' SET curiosidad encendida\nOK\n'` por `' SET curiosidad encendida OK '` en `ProjectPage.tsx` | `ProjectPage.spec.tsx` («writes the example terminal…») y el E2E 1 (`textContent`) |
| 9 | La página abre su propia instancia del almacén | En `ProjectPage.tsx`, importar `createRouteStore` y usar una instancia abierta con `window.GUIDE_DATA` en lugar de `routeStore` | `node qa/seams-guard-check.ts` (R3) y el E2E «a milestone unchecked in Rust stays unchecked after switching to Go and back» |
| 10 | Cerrar las pistas abiertas al alternar, como hoy | En `ProjectPage.tsx`, `<div className="milestones" key={routeStore.changes.getState().revision}>` | `ProjectPage.spec.tsx` («keeps the same checkbox focused and an open hint open…») y el E2E «an open hint stays open…» |
| 11 | Dejar la pista de Go como está | Volver la cadena `go` del primer hito al texto de Rust | `project-milestones.spec.ts`, `project-progress.spec.ts` y el E2E «the hint of the first milestone is one per language…» |

## 5. La pista de Go (T008)

1. **Antes del cambio de texto:** con la prueba ya cambiada, `npm run test:unit` falla en dos pruebas (las dos specs de Vitest de la pista). `E2E_PORT=4193 npm run test:e2e -- specs/project.spec.ts -g "one per language"` falla en `toHaveText(FIRST_HINT_GO)`. La salida va al PR.
2. **Después:**
   - `npm run test:unit` y `E2E_PORT=4193 npm run test:e2e` en verde, con 141 de 141;
   - `grep -c "En Rust podés empezar" frontend/src/entities/guide/model/project-milestones.ts` da 1, sólo la de Rust.

## 6. La documentación (T010)

- **Las rutas:** las que nombran `docs/architecture.md`, `qa/AGENTS.md` y el ADR existen (`ls`).
- **Los enlaces relativos** de los archivos cambiados resuelven.
- **El formato:** `git diff --check` limpio.
