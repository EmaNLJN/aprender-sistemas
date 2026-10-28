# Quickstart: F5 · Validación

**Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

Los comandos y los scripts que verifican F5. Los scripts no se commitean: viven en `$TMPDIR/f5-compare/` y resuelven sus dependencias (`esbuild`, `@playwright/test`) desde el `node_modules` de la raíz que reciben. Todo se corre desde la raíz del worktree, salvo que se diga otra cosa.

```sh
mkdir -p "$TMPDIR/f5-compare"
git worktree add "$TMPDIR/f5-base" <base>            # el commit base de T001
ln -s "$PWD/node_modules" "$TMPDIR/f5-base/node_modules"
(cd "$TMPDIR/f5-base" && npm run build)
```

## 1. La línea base (T001)

### 1.1 Los valores

Después de `npm run build`:

```js
// $TMPDIR/f5-compare/dist-hashes.mjs — node dist-hashes.mjs <raíz>
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const root = process.argv[2];
const sha = (text) => createHash('sha256').update(text).digest('hex');
const html = fs.readFileSync(root + '/dist/index.html', 'utf8');
const script = /<script\b[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
const style = /<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
const markup = html
  .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/g, '$1$2')
  .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/g, '$1$2');
const dump = execFileSync(process.execPath, ['tools/content/dump-globals.ts', '.'], { cwd: root });
console.log(
  JSON.stringify({
    chars: html.length,
    script: sha(script),
    style: sha(style),
    markup: sha(markup),
    curriculum: sha(fs.readFileSync(root + '/build/curriculum.json')),
    dumpGlobals: sha(dump),
  }),
);
```

```sh
node "$TMPDIR/f5-compare/dist-hashes.mjs" .
npm run lint 2>&1 | grep complexity            # cada aviso con su función; contar con grep -c
for check in boot lab-bridge app-shell systems; do echo "$check $(node qa/$check-check.ts | grep -c '^PASS')"; done
npx playwright test --config qa/e2e/playwright.config.ts --workers=1 --reporter=line | tail -2   # «N passed (Xs)»
```

### 1.2 Qué entró antes

Cada comando contesta una pregunta de R13 (research.md). Se anota la respuesta.

| Pregunta | Comando | Si imprime algo |
| --- | --- | --- |
| ¿nuqs está instalado? | `grep -n '"nuqs"' package.json` | Lo instaló F3: T002 no lo pide y T008 reusa su raíz |
| ¿La pila de componentes está? | `grep -n '"jsdom"\|"@testing-library/react"' package.json` | La trajo otro port: T007 no corre |
| ¿fishery está? | `grep -n '"fishery"' package.json` | T002 no la pide |
| ¿Hay una raíz de nuqs? | `git grep -n "enableHistorySync" -- frontend/src` | Se usa la de F3: ver dónde llama a `enableHistorySync()` (tiene que ser en un montaje) |
| ¿F6 entró? | `ls frontend/campaign.js` | Si **no** existe, F6 entró: rama D2 de T024 |
| ¿Hay un ayudante de grupos? | `git grep -n "runSourceGroup\|bundleSourceGroup" -- qa` | T009 lo reusa |
| ¿`boot-check` ya tiene vistas de React? | `git grep -n "REACT_VIEWS" -- qa/boot-check.ts` | T010 no corre; T024 suma `'sistemas'` |
| ¿F8 entró? | `git grep -n "createProgressBackup" -- frontend/app.js` | Si **no** imprime nada, F8 sacó el armado de `app.js`: rama F8 de T024 |

## 2. Las verificaciones previas (T003 y T009)

### 2.1 V6: el adaptador real de nuqs en jsdom

En la copia descartable del spike (`git worktree add "$TMPDIR/f5-spike" HEAD`, con nuqs y la pila de componentes instalados), se crea `frontend/src/pages/systems/model/v6-spike.spec.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { NuqsAdapter, enableHistorySync } from 'nuqs/adapters/react';
import { describe, expect, it } from 'vitest';

const parsers = {
  lenguaje: parseAsStringLiteral(['rust', 'go'] as const),
  taller: parseAsString,
  parte: parseAsStringLiteral(['explore', 'build', 'ship'] as const)
    .withDefault('explore')
    .withOptions({ clearOnDefault: false }),
};

const Probe = () => {
  const [query, setQuery] = useQueryStates(parsers, { history: 'replace' });
  return (
    <>
      <p>
        taller: {query.taller ?? 'none'} parte: {query.parte}
      </p>
      <button onClick={() => setQuery({ lenguaje: 'rust', taller: 'cache', parte: 'explore' })}>open</button>
      <button onClick={() => setQuery({ lenguaje: 'rust', taller: null, parte: null })}>close</button>
      <button onClick={() => setQuery({ lenguaje: 'rust', taller: 'cache', parte: 'ship' })}>ship</button>
    </>
  );
};

function mountAt(url: string) {
  history.replaceState(null, '', url);
  render(
    <NuqsAdapter>
      <Probe />
    </NuqsAdapter>,
  );
  return userEvent.setup();
}

describe('V6 with the real React adapter of nuqs 2.10.2', () => {
  it('1. jsdom updates location with replaceState', () => {
    history.replaceState(null, '', '/?a=1#x');
    expect(location.search).toBe('?a=1');
    expect(location.hash).toBe('#x');
  });

  it('2 and 3. opening from /#sistemas writes the three keys in order, keeps the hash and adds no entry', async () => {
    const user = mountAt('/#sistemas');
    const entries = history.length;
    await user.click(screen.getByRole('button', { name: 'open' }));
    await waitFor(() => expect(location.search).toBe('?lenguaje=rust&taller=cache&parte=explore'));
    expect(location.hash).toBe('#sistemas');
    expect(history.length).toBe(entries);
  });

  it('4. closing leaves only the language', async () => {
    const user = mountAt('/?lenguaje=rust&taller=cache&parte=explore#sistemas');
    await user.click(screen.getByRole('button', { name: 'close' }));
    await waitFor(() => expect(location.search).toBe('?lenguaje=rust'));
  });

  it('5. a foreign parameter stays', async () => {
    const user = mountAt('/?basura=1&lenguaje=rust#sistemas');
    await user.click(screen.getByRole('button', { name: 'open' }));
    await waitFor(() => expect(location.search).toBe('?basura=1&lenguaje=rust&taller=cache&parte=explore'));
  });

  it('6. the keys already in the query keep their order', async () => {
    const user = mountAt('/?taller=cache&parte=build&lenguaje=rust#sistemas');
    await user.click(screen.getByRole('button', { name: 'ship' }));
    await waitFor(() => expect(location.search).toBe('?taller=cache&parte=ship&lenguaje=rust'));
  });

  it('7. with enableHistorySync a foreign replaceState reaches the hook', async () => {
    enableHistorySync();
    mountAt('/?lenguaje=rust#sistemas');
    history.replaceState(null, '', '/?lenguaje=go&taller=wal&parte=build#sistemas');
    expect(await screen.findByText('taller: wal parte: build')).toBeInTheDocument();
  });
});
```

```sh
npm run test:unit -- src/pages/systems/model/v6-spike.spec.tsx
grep -n "^export" node_modules/nuqs/dist/adapters/react.js              # export { NuqsAdapter, enableHistorySync }
grep -ln "localStorage" node_modules/nuqs/dist/*.js node_modules/nuqs/dist/adapters/react.js   # sólo debug-*.js y debug.js
```

Esperado:

- los siete casos en verde, con los valores de arriba (research.md, R2);
- la exportación de `enableHistorySync`;
- `localStorage` sólo en los archivos de depuración, que el código nunca importa.

**Si el caso 1 falla** (jsdom no actualiza `location`), los demás no dicen nada: V6 pasa a correrse con los E2E «Abrir y volver» y `systems-url.spec.ts` después del corte, antes del PR, y la decisión vuelve al usuario igual.

### 2.2 V1: el peso de nuqs y de `useStore`

```js
// $TMPDIR/f5-compare/v1-size.mjs — node v1-size.mjs <raíz>
import { createRequire } from 'node:module';
import path from 'node:path';
const root = path.resolve(process.argv[2]);
const esbuild = createRequire(path.join(root, 'package.json'))('esbuild');
const entry = `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { NuqsAdapter, enableHistorySync } from 'nuqs/adapters/react';
const store = createStore(() => ({ revision: 0 }));
function Probe() {
  const revision = useStore(store, (state) => state.revision);
  const [query] = useQueryStates({
    taller: parseAsString,
    parte: parseAsStringLiteral(['explore', 'build', 'ship']).withDefault('explore'),
  });
  return createElement('p', null, String(revision) + query.parte + (query.taller ?? ''));
}
enableHistorySync();
createRoot(document.body).render(createElement(NuqsAdapter, null, createElement(Probe)));
`;
const result = esbuild.buildSync({
  stdin: { contents: entry, resolveDir: root, loader: 'js' },
  bundle: true,
  minify: true,
  write: false,
  metafile: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'silent',
});
const inputs = Object.values(result.metafile.outputs)[0].inputs;
const bytes = (pattern) =>
  Object.entries(inputs)
    .filter(([file]) => pattern.test(file))
    .reduce((total, [, info]) => total + info.bytesInOutput, 0);
console.log(
  JSON.stringify({
    nuqs: bytes(/node_modules[\\/]nuqs[\\/]/),
    zustandReact: bytes(/node_modules[\\/]zustand[\\/]esm[\\/](index|react)\.mjs$/),
    standardSchema: bytes(/@standard-schema/),
  }),
);
```

**Esperado:** `standardSchema` en 0, y `nuqs` y `zustandReact` en los rangos de R12. Es una estimación: esbuild minifica distinto que Vite. La medida real es la diferencia de `html.length` de T025.

### 2.3 V3: cuántos motores hay en un contexto

```js
// $TMPDIR/f5-compare/v3-engines.mjs — node v3-engines.mjs <raíz> <separate|group> <archivo>...
import { createRequire } from 'node:module';
import path from 'node:path';
const [rootArgument, mode, ...files] = process.argv.slice(2);
const root = path.resolve(rootArgument);
const esbuild = createRequire(path.join(root, 'package.json'))('esbuild');
const options = {
  bundle: true,
  write: false,
  metafile: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'silent',
};
const enginesIn = (result) =>
  Object.keys(result.metafile.inputs).filter((file) => file.endsWith('create-systems-engine.ts')).length;
const bundles =
  mode === 'group'
    ? [
        esbuild.buildSync({
          ...options,
          stdin: {
            contents: files.map((file) => `import ${JSON.stringify(path.join(root, file))};`).join('\n'),
            resolveDir: root,
            loader: 'js',
          },
        }),
      ]
    : files.map((file) => esbuild.buildSync({ ...options, entryPoints: [path.join(root, file)] }));
console.log(JSON.stringify({ mode, engines: bundles.reduce((total, result) => total + enginesIn(result), 0) }));
```

| Momento | Comando | Esperado |
| --- | --- | --- |
| Antes de T009 | `node v3-engines.mjs . separate frontend/src/app/legacy/register-systems-engine.ts frontend/systems.js` | `engines: 1` (`systems.js` no importa el índice) |
| Después de T009 | `node v3-engines.mjs . group frontend/src/app/legacy/register-systems-engine.ts frontend/systems.js` | `engines: 1` |
| Después del corte | `node v3-engines.mjs . group frontend/src/app/legacy/register-systems-engine.ts frontend/src/app/legacy/register-systems.tsx` | `engines: 1` |
| Control negativo, después del corte | lo mismo con `separate` | `engines: 2`: por eso `loadSystemsUi` agrupa |

## 3. La compuerta y las comparaciones únicas (T024 y T025)

### 3.1 La compuerta

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=4173 npm run test:e2e
node "$TMPDIR/f5-compare/dist-hashes.mjs" .
git diff <base> --stat -- qa/e2e/specs/
git diff <base> -- frontend/app.js
git grep -n "systems\.js\|systems\.css" -- frontend docker package.json eslint.config.ts tsconfig*.json
git grep -nE "innerHTML|dangerouslySetInnerHTML|style=\"" -- frontend/src/pages/systems ':!*.spec.tsx'
git grep -n "style={" -- frontend/src/pages/systems ':!*.spec.tsx'
git grep -n "nuqs/debug" -- frontend/src
git grep -nE "window\.|getContent|localStorage" -- frontend/src/pages/systems ':!*.spec.tsx' ':!*.factory.ts'
node qa/seams-guard-check.ts && node qa/dist-content-check.ts && node qa/build-check.ts
for check in boot lab-bridge app-shell systems; do echo "$check $(node qa/$check-check.ts | grep -c '^PASS')"; done
```

| Salida | Esperado |
| --- | --- |
| `curriculum` y `dumpGlobals` | iguales a T001 |
| `style` | **igual** a T001: la hoja se mudó sin editar y sigue última |
| `markup` | igual a T001 |
| `script` | cambia |
| `chars` | bajo 1 250 000 y con el aumento dentro del subpresupuesto (+40 000 si F5 instaló nuqs, +25 000 si no) |
| La diferencia de las specs de `qa/e2e/specs/` | sólo `systems.spec.ts`, `systems-react.spec.ts` y, con D1, `systems-url.spec.ts` |
| La diferencia de `frontend/app.js` | vacía |
| `systems.js` o `systems.css` en producción y configuraciones | nada |
| `innerHTML`, `dangerouslySetInnerHTML` o `style="` en `pages/systems` | nada |
| `style={` en `pages/systems` | exactamente una línea, en `ui/SceneView.tsx` |
| `nuqs/debug` | nada |
| `window.`, `getContent` o `localStorage` en el código de producción de `pages/systems` (FR-020) | nada |
| Avisos de complejidad | los de T001 menos `onClick` y `modelView` de `systems.js` |
| Escenarios de `boot`, `lab-bridge`, `app-shell` y `systems` | los de T001; `lab-bridge`, 21 |

### 3.2 El DOM y las escenas (V4, FR-027 y FR-043)

```sh
(cd "$TMPDIR/f5-base" && git log -1 --format=%h)    # la base: master sin F5
ss -ltn | grep -E ':450[12]\b'                      # vacío
node "$TMPDIR/f5-compare/dom-compare.mjs" "$TMPDIR/f5-base" .
```

```js
// $TMPDIR/f5-compare/dom-compare.mjs — node dom-compare.mjs <raíz base> <raíz de la rama>
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const [baseRoot, branchRoot] = process.argv.slice(2);
const { chromium } = createRequire(branchRoot + '/package.json')('@playwright/test');
const ids = Object.keys(JSON.parse(fs.readFileSync(branchRoot + '/qa/fixtures/curriculum-ids.json', 'utf8')).workshops);
const frozen = JSON.parse(
  fs.readFileSync(branchRoot + '/qa/fixtures/progress-master-2a278ad-storage.json', 'utf8'),
);
const SCENES = ['pc', 'transforms', 'raster', 'raycast', 'pathfinding', 'physics', 'life', 'algebra', 'minimax'];

function serve(root, port) {
  return spawn(
    root + '/node_modules/.bin/vite',
    ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: root, stdio: 'ignore' },
  );
}
async function waitFor(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('server did not start: ' + url);
}

const workshop = (language, id, part) => `/?lenguaje=${language}&taller=${id}&parte=${part}#sistemas`;
const firstControl = (page) =>
  page.getByRole('group', { name: 'Acciones del modelo' }).getByRole('button').first().click();
const STATES = [
  { name: 'catalog rust', path: '/?lenguaje=rust#sistemas' },
  { name: 'catalog go', path: '/?lenguaje=go#sistemas' },
  ...['Todo el taller', 'Dentro de la máquina', 'Datos e infraestructura', 'Gráficos, álgebra y juegos'].map(
    (family) => ({
      name: `family ${family}`,
      path: '/?lenguaje=rust#sistemas',
      setup: (page) => page.getByRole('button', { name: family, exact: true }).click(),
    }),
  ),
  { name: 'search LRU', path: '/?lenguaje=rust#sistemas', setup: (page) => page.fill('#sys-search', 'LRU') },
  { name: 'search empty', path: '/?lenguaje=rust#sistemas', setup: (page) => page.fill('#sys-search', 'zzzz') },
  ...ids.flatMap((id) =>
    ['rust', 'go'].flatMap((language) =>
      ['explore', 'build', 'ship'].map((part) => ({ name: `${language} ${id} ${part}`, path: workshop(language, id, part) })),
    ),
  ),
  ...ids.map((id) => ({ name: `rust ${id} after an action`, path: workshop('rust', id, 'explore'), setup: firstControl })),
  {
    name: 'heap with the checkpoint answered',
    path: workshop('rust', 'heap', 'explore'),
    setup: (page) => page.locator('.sys-answers button').nth(1).click(),
  },
  ...['explore', 'build', 'ship'].map((part) => ({
    name: `pc with the frozen seals, ${part}`,
    path: workshop('rust', 'pc', part),
    seed: frozen,
  })),
];

function snapshotMain() {
  const normalize = (element) => {
    const node = { tag: element.tagName.toLowerCase(), attributes: [], children: [] };
    const formControl = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
    for (const { name, value } of element.attributes) {
      if (name.startsWith('data-') || name === 'style') continue;
      if (formControl && (name === 'value' || name === 'checked')) continue;
      if (name === 'class') {
        const tokens = [...element.classList].sort().join(' ');
        if (tokens) node.attributes.push(['class', tokens]);
        continue;
      }
      node.attributes.push([name, value]);
    }
    node.attributes.sort(([first], [second]) => first.localeCompare(second));
    if (element.hasAttribute('style')) node.background = getComputedStyle(element).backgroundColor;
    if (formControl) {
      node.value = element.value;
      if (element.type === 'checkbox') node.checked = element.checked;
      if (element instanceof HTMLTextAreaElement) return node;
    }
    let text = '';
    const flush = () => {
      if (text !== '' && (element.id !== 'main' || text.trim() !== '')) node.children.push(text.replace(/\s+/g, ' '));
      text = '';
    };
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text += child.nodeValue;
      else if (child.nodeType === Node.ELEMENT_NODE) {
        flush();
        node.children.push(normalize(child));
      }
    }
    flush();
    return node;
  };
  return normalize(document.querySelector('#main'));
}

function firstDifference(first, second, path = 'main') {
  if (JSON.stringify(first) === JSON.stringify(second)) return null;
  if (typeof first !== 'object' || typeof second !== 'object' || !first || !second)
    return `${path}: ${JSON.stringify(first)} ≠ ${JSON.stringify(second)}`;
  for (const key of ['tag', 'attributes', 'background', 'value', 'checked'])
    if (JSON.stringify(first[key]) !== JSON.stringify(second[key]))
      return `${path}.${key}: ${JSON.stringify(first[key])} ≠ ${JSON.stringify(second[key])}`;
  const length = Math.max(first.children.length, second.children.length);
  for (let index = 0; index < length; index++) {
    const child = first.children[index];
    const found = firstDifference(child, second.children[index], `${path}/${index}:${child?.tag ?? 'text'}`);
    if (found) return found;
  }
  return `${path}: children differ`;
}

async function capture(browser, origin, state) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-AR' });
  if (state.seed)
    await context.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    }, state.seed);
  const page = await context.newPage();
  await page.goto(origin + state.path);
  await page.waitForFunction(() => document.querySelector('#main')?.children.length > 0);
  if (state.setup) await state.setup(page);
  await page.waitForTimeout(100);
  const tree = await page.evaluate(snapshotMain);
  await context.close();
  return tree;
}

const base = serve(baseRoot, 4501);
const branch = serve(branchRoot, 4502);
try {
  await waitFor('http://127.0.0.1:4501/');
  await waitFor('http://127.0.0.1:4502/');
  const browser = await chromium.launch();
  let different = 0;
  let scenes = 0;
  const samples = [];
  for (const state of STATES) {
    const before = await capture(browser, 'http://127.0.0.1:4501', state);
    const after = await capture(browser, 'http://127.0.0.1:4502', state);
    const difference = firstDifference(before, after);
    if (difference) {
      different++;
      if (samples.length < 15) samples.push(`${state.name} | ${difference}`);
    }
    if (SCENES.some((id) => state.path === workshop('rust', id, 'explore')) && JSON.stringify(after).includes('"svg"'))
      scenes++;
  }
  await browser.close();
  console.log(JSON.stringify({ states: STATES.length, different, scenes }));
  for (const sample of samples) console.log(sample);
} finally {
  base.kill();
  branch.kill();
}
```

**Esperado:** `{"states":187,"different":0,"scenes":9}`, en unos 4 minutos.

**Qué hacer con una diferencia:** se corrige el componente, nunca la comparación. Las únicas normalizaciones son las de research.md, R7: las clases como conjunto, `class=""` como ausente, los `data-*` fuera, el `style` por su fondo calculado, `value` y `checked` como propiedades, y los espacios. Los estados no ejercen ninguna conducta de C2 (no cierran la traza ni vuelven al catálogo), así que ninguna diferencia está permitida.

### 3.3 El barrido de estilo computado ampliado (FR-044, SC-003)

Es el script de [quickstart-f2b.md, §3.1 b](../009-f2-seams/quickstart-f2b.md) con dos cambios: cada página puede llevar una semilla y unos pasos, y se suman las nueve páginas que la spec pide (23 en total).

```js
// $TMPDIR/f5-compare/style-sweep.mjs — node style-sweep.mjs <raíz base> <raíz de la rama>; PAGES y WIDTHS acotan
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const [baseRoot, branchRoot] = process.argv.slice(2);
const { chromium } = createRequire(baseRoot + '/package.json')('@playwright/test');
const frozen = JSON.parse(
  fs.readFileSync(branchRoot + '/qa/fixtures/progress-master-2a278ad-storage.json', 'utf8'),
);

function serve(root, port) {
  return spawn(
    root + '/node_modules/.bin/vite',
    ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: root, stdio: 'ignore' },
  );
}
async function waitFor(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('server did not start: ' + url);
}

const workshop = (id, part) => `/?lenguaje=rust&taller=${id}&parte=${part}#sistemas`;
const fill = (selector, value) => (page) => page.fill(selector, value).then(() => page.waitForSelector('.lab-empty'));
const firstControl = (page) =>
  page.getByRole('group', { name: 'Acciones del modelo' }).getByRole('button').first().click();
const ALL_PAGES = [
  { name: 'recorrido', path: '/#recorrido' },
  { name: 'campana', path: '/#campana' },
  { name: 'sistemas', path: '/#sistemas' },
  { name: 'atlas', path: '/#atlas' },
  { name: 'laboratorio', path: '/#laboratorio' },
  { name: 'biblioteca', path: '/#biblioteca' },
  { name: 'proyecto', path: '/#proyecto' },
  { name: 'metodo', path: '/#metodo' },
  { name: 'mission', path: '/?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio' },
  { name: 'lock', path: '/?campana=rust-world-1&ejercicio=rust-103&paso=learn#laboratorio' },
  { name: 'core', path: '/?sistema=cache&ejercicio=rust-113&paso=code#laboratorio' },
  { name: 'workshop', path: workshop('cache', 'explore') },
  { name: 'lab-empty', path: '/#laboratorio', setup: fill('#lab-search', 'zzzz') },
  { name: 'sys-empty', path: '/?lenguaje=rust#sistemas', setup: fill('#sys-search', 'zzzz') },
  {
    name: 'sys-family',
    path: '/?lenguaje=rust#sistemas',
    setup: (page) => page.getByRole('button', { name: 'Datos e infraestructura', exact: true }).click(),
  },
  { name: 'sys-pc-seals-explore', path: workshop('pc', 'explore'), seed: frozen },
  { name: 'sys-pc-seals-build', path: workshop('pc', 'build'), seed: frozen },
  { name: 'sys-pc-seals-ship', path: workshop('pc', 'ship'), seed: frozen },
  { name: 'sys-pc-action', path: workshop('pc', 'explore'), setup: firstControl },
  { name: 'sys-raster-action', path: workshop('raster', 'explore'), setup: firstControl },
  { name: 'sys-cache-build', path: workshop('cache', 'build') },
  { name: 'sys-cache-ship', path: workshop('cache', 'ship') },
  {
    name: 'sys-checkpoint',
    path: workshop('heap', 'explore'),
    setup: (page) => page.locator('.sys-answers button').nth(1).click(),
  },
];
const WIDTHS = (process.env.WIDTHS ?? '1280,981,850,650,590,375').split(',').map(Number);
const PAGES = process.env.PAGES
  ? ALL_PAGES.filter((page) => process.env.PAGES.split(',').includes(page.name))
  : ALL_PAGES;
const MOTIONS = ['no-preference', 'reduce'];

async function snapshot(browser, origin, spec, width, motion) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: motion, locale: 'es-AR' });
  if (spec.seed)
    await context.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    }, spec.seed);
  const page = await context.newPage();
  await page.goto(origin + spec.path);
  await page.waitForFunction(() => document.querySelector('#main')?.children.length > 0);
  if (spec.setup) await spec.setup(page);
  await page.waitForTimeout(100);
  const result = await page.evaluate(() => {
    const out = {};
    const pathOf = (element) => {
      const parts = [];
      for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
        const index = [...node.parentElement.children].indexOf(node);
        parts.unshift(node.tagName.toLowerCase() + ':' + index);
      }
      return parts.join('/');
    };
    for (const element of [document.documentElement, ...document.querySelectorAll('*')]) {
      const style = getComputedStyle(element);
      const properties = {};
      for (let index = 0; index < style.length; index++)
        properties[style[index]] = style.getPropertyValue(style[index]);
      out[pathOf(element)] = properties;
    }
    return out;
  });
  await context.close();
  return result;
}

const base = serve(baseRoot, 4501);
const branch = serve(branchRoot, 4502);
try {
  await waitFor('http://127.0.0.1:4501/');
  await waitFor('http://127.0.0.1:4502/');
  const browser = await chromium.launch();
  let snapshots = 0;
  let differences = 0;
  const samples = [];
  for (const spec of PAGES)
    for (const width of WIDTHS)
      for (const motion of MOTIONS) {
        const before = await snapshot(browser, 'http://127.0.0.1:4501', spec, width, motion);
        const after = await snapshot(browser, 'http://127.0.0.1:4502', spec, width, motion);
        snapshots++;
        for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
          const first = before[key] ?? {};
          const second = after[key] ?? {};
          for (const property of new Set([...Object.keys(first), ...Object.keys(second)])) {
            if (first[property] === second[property]) continue;
            differences++;
            if (samples.length < 15)
              samples.push([spec.name, width, motion, key, property, first[property], second[property]].join(' | '));
          }
        }
      }
  await browser.close();
  console.log(JSON.stringify({ snapshots, differences }));
  for (const sample of samples) console.log(sample);
} finally {
  base.kill();
  branch.kill();
}
```

**Esperado:** `{"snapshots":276,"differences":0}`, en unos 10 minutos.

**El control negativo** se corre una vez, en una copia descartable de la rama: mover la última regla de `pages/systems/ui/systems.css` al principio de la hoja. El barrido tiene que dar diferencias con `PAGES=sys-pc-seals-explore,sys-cache-ship WIDTHS=375,1280`, y `style` (§3.1) tiene que cambiar.

### 3.4 V2: la propiedad `style` de React bajo una CSP sin `style-src-attr`

```js
// $TMPDIR/f5-compare/csp-check.mjs — node csp-check.mjs <raíz> <puerto>
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const [root, port] = process.argv.slice(2);
const { chromium } = createRequire(root + '/package.json')('@playwright/test');
const server = spawn(
  root + '/node_modules/.bin/vite',
  ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', port, '--strictPort'],
  { cwd: root, stdio: 'ignore' },
);
const POLICY =
  "default-src 'self'; script-src 'nonce-v2'; style-src 'self' 'nonce-v2' 'report-sample'; img-src 'self' data:; connect-src 'self'";
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const body = (await response.text())
      .replace(/<script\b/g, '<script nonce="v2"')
      .replace(/<style\b/g, '<style nonce="v2"');
    await route.fulfill({ response, body, headers: { ...response.headers(), 'content-security-policy': POLICY } });
  });
  await context.addInitScript(() => {
    window.__violations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      window.__violations.push({ directive: event.effectiveDirective, sample: event.sample }),
    );
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/?lenguaje=rust&taller=raster&parte=explore#sistemas`);
  await page.waitForSelector('svg.sys-scene');
  const background = await page.locator('svg.sys-scene').evaluate((element) => getComputedStyle(element).backgroundColor);
  const violations = await page.evaluate(() => window.__violations);
  console.log(
    JSON.stringify({
      background,
      sceneViolations: violations.filter((violation) => violation.sample.includes('14271f')).length,
      allViolations: violations.length,
    }),
  );
  await browser.close();
} finally {
  server.kill();
}
```

| Raíz | Esperado |
| --- | --- |
| La rama | `background: "rgb(20, 39, 31)"` y `sceneViolations: 0` |
| La base (control negativo) | `sceneViolations` de 1 o más, porque el atributo `style="background:#14271f"` se bloquea |

`allViolations` se informa como dato para C4 (otros estilos en línea del shell). No es parte de la compuerta de F5.

## 4. Las pruebas de que las pruebas detectan algo

Cada mutación se aplica en una copia descartable, una vez, y tiene que hacer fallar la prueba que nombra.

| Tarea | Mutación | Falla |
| --- | --- | --- |
| T008 | Quitar `enableHistorySync()` de `startUrlStateSync` | «shows a foreign replaceState while mounted…» |
| T009 | Cargar `loadSystemsEngine` además del grupo | El script de §2.3 da `engines: 2` |
| T010 | `'sistemas'` en `REACT_VIEWS` antes del corte | «#sistemas no montó nodos» |
| T012 | Cortar después de filtrar los tipos desconocidos | «cuts at 2 500 before dropping…» |
| T012 | Quitar el `/i` de `SAFE_COLOR` | «… in any case» |
| T014 | `.trim()` en la query | «does not trim the query» |
| T015 | `resetSimulations` también vacía el filtro | «resets the simulations and keeps the family and the search» |
| T016 | Sin `clearOnDefault: false` | «opening writes…» (`?lenguaje=rust&taller=cache`) |
| T016 | `{ taller, parte, lenguaje }` | «opening writes…» (el orden) |
| T018 | `ModelTrace` con `open={log.length > 0}` y una `key` que cambia con el largo | «leaves the trace closed when the student closed it…» |
| T020 | `control.value` sin `?? ''` | «a control without a value reaches the model as an empty string» |
| T020 | `celebrate()` después del aviso | «celebrates before announcing the third seal» |
| T022 | Sin el `useLayoutEffect` de `returnFocusTo` | «focuses «Explorar →» of the workshop it returns from» |
| T023 | Sin `flushSync` en `openWorkshop` | ««Explorar →» writes the query, focuses the title…» |
| T024 | `Object.freeze(window.TallerSystems)` | `boot-check`, «startApp initializes in order…» |
| T025 | La hoja de Sistemas importada antes que `atlas.css` en `main.tsx` | El barrido de §3.3 y el sha256 de `style` |

### 4.1 Los textos son los de la plantilla

```js
// $TMPDIR/f5-compare/texts.mjs — node texts.mjs <raíz base> <raíz de la rama>
import fs from 'node:fs';
const [baseRoot, branchRoot] = process.argv.slice(2);
const collapse = (text) => text.replace(/\s+/g, ' ');
const legacy = collapse(fs.readFileSync(baseRoot + '/frontend/systems.js', 'utf8'));
const directory = branchRoot + '/frontend/src/pages/systems/ui/';
const segments = new Set();
for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.tsx') && !name.endsWith('.spec.tsx'))) {
  const source = fs.readFileSync(directory + file, 'utf8');
  for (const match of source.matchAll(/>([^<>{}]+)</g)) {
    const text = collapse(match[1]).trim();
    if (text.length >= 6 && /\p{L}/u.test(text) && !/[=;()]/.test(text)) segments.add(text);
  }
  for (const match of source.matchAll(/'([^'\n]{12,})'/g))
    if (/[áéíóúñ¿·→↓↗↺]/.test(match[1])) segments.add(collapse(match[1]));
}
const missing = [...segments].filter((text) => !legacy.includes(text));
console.log(JSON.stringify({ segments: segments.size, missing: missing.length }));
for (const text of missing) console.log('- ' + text);
```

**Esperado:** `missing: 0`. Un fragmento que falte es un texto que cambió (FR-003): se corrige el componente.

## 5. El cierre (T026)

- research.md tiene «Línea base de la implementación», «Resultados de V6 y V1» y «Resultados de la compuerta», con los números de §1 a §3.
- La descripción del PR lleva:
  - la tabla de los nueve métodos (contracts/taller-systems.md), verificada contra el código;
  - la correspondencia de los checks (research.md, R9);
  - el único `style={`;
  - C2 y X2;
  - las diferencias de D1;
  - las medidas de §3.
- `docker compose build taller`, con permiso.
- La comprobación con lector de pantalla de las cuatro regiones de X2 la hace el usuario: queda como pendiente en el PR.
