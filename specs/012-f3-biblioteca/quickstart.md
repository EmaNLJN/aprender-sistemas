# Quickstart: validar F3 · Biblioteca

**Plan**: [plan.md](./plan.md) · **Decisiones**: [research.md](./research.md) · **Contrato**: [contracts/library-url.md](./contracts/library-url.md)

Los comandos corren desde la raíz del worktree. Las copias descartables (`../f3-*`) y los scripts de las comparaciones viven fuera del repositorio y no se commitean. Antes de un check suelto, corré `npm run curriculum`.

## 0. Una función para el hash

```sh
sha() { sha256sum | cut -c1-16; }
```

## 1. La línea base (T001)

### 1.1 Los comandos

```sh
npm ci --offline --no-audit --no-fund
npm run build && npm test && npm run lint && npm run format:check
E2E_PORT=4173 npm run test:e2e
npx playwright test --config qa/e2e/playwright.config.ts --list | tail -1
```

### 1.2 Los valores que se anotan

```sh
node -e "
const fs = require('node:fs');
const html = fs.readFileSync('dist/index.html', 'utf8');
const script = /<script type=\"module\"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
const style = /<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
const markup = html.replace(script, '').replace(style, '');
const hash = (text) => require('node:crypto').createHash('sha256').update(text).digest('hex').slice(0, 16);
console.log(JSON.stringify({
  htmlLength: html.length,
  script: hash(script),
  style: hash(style),
  markup: hash(markup),
  dynamicImports: (script.match(/import\(/g) || []).length,
  importMeta: (script.match(/import\.meta/g) || []).length,
}));
"
sha < frontend/src/index.html
sha < build/curriculum.json
node tools/content/dump-globals.ts . | sha
npm run lint 2>&1 | grep -c "complexity"
node qa/boot-check.ts | grep -c '^PASS'
node qa/app-shell-check.ts | grep -c '^PASS'
```

También se anota el multiconjunto del CSS del dist: el script de §5.1, con la misma raíz como base y como unidad.

### 1.3 Qué ya está en la base

Cada línea imprime algo si la pieza está. Lo que imprimen va a la tabla «Qué ya está en la base» de research.md, y decide qué rama sigue cada tarea condicional.

```sh
grep -nE '"(nuqs|jsdom|fishery|@testing-library/react)"' package.json        # T005, T015
test -f frontend/src/vitest-setup.ts && echo vitest-setup                       # T006
grep -n "projects" frontend/vitest.config.ts                                    # T006
grep -n "callee.name='useStore'" eslint.config.ts                               # T006
grep -n "toggleItem" frontend/src/entities/guide/index.ts                        # T007
grep -n "routeStore" qa/lib/legacy-sources.ts                                    # T008
grep -n "routeStore.changes.subscribe" frontend/app.js                           # T009
grep -n "REACT_VIEWS" qa/boot-check.ts                                           # T013
test -f frontend/src/app/legacy/url-state.tsx && echo url-state                  # T016
grep -nE "^\s+\.resource-card,$" frontend/styles.css                             # T019: si imprime, nadie partió la impresión
ls frontend/src/pages                                                            # las páginas ya migradas
```

## 2. La verificación de nuqs (T002)

En la copia descartable (`git worktree add --detach ../f3-nuqs-probe <hash de T001>`), con nuqs instalado y el proyecto `jsdom` de T006 en `frontend/vitest.config.ts`, va `frontend/src/nuqs-probe.spec.tsx`:

```tsx
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createParser, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { NuqsAdapter, enableHistorySync } from 'nuqs/adapters/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

const parsers = {
  query: parseAsString.withDefault(''),
  category: parseAsStringLiteral(['all', 'lectura', 'proyectos'] as const).withDefault('all'),
};
const urlKeys = { query: 'buscar', category: 'tipo' } as const;
const trimmed = createParser({
  parse: (value: string) => value,
  serialize: (value: string) => value,
  eq: (a: string, b: string) => a.trim() === b.trim(),
});

const Probe = () => {
  const [filters, setFilters] = useQueryStates(parsers, { history: 'replace', urlKeys });
  return (
    <>
      <input aria-label="query" value={filters.query} onChange={(event) => setFilters({ query: event.target.value })} />
      <p>category: {filters.category}</p>
      <button onClick={() => setFilters({ category: 'lectura' })}>lectura</button>
      <button onClick={() => setFilters(null)}>clear</button>
    </>
  );
};

const TrimmedProbe = () => {
  const [filters, setFilters] = useQueryStates(
    { query: trimmed.withDefault('') },
    { history: 'replace', urlKeys: { query: 'buscar' } },
  );
  return <input aria-label="query" value={filters.query} onChange={(event) => setFilters({ query: event.target.value })} />;
};

const mount = (node: ReactNode) => render(<NuqsAdapter>{node}</NuqsAdapter>);

describe('nuqs 2.10.2 in a hash app', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/?basura=1#biblioteca');
  });

  it('1 · replaces the URL, keeps the hash and the foreign keys, and adds no history entry', async () => {
    const user = userEvent.setup();
    const entries = history.length;
    mount(<Probe />);

    await user.click(screen.getByRole('button', { name: 'lectura' }));

    await waitFor(() => expect(location.search).toBe('?basura=1&tipo=lectura'));
    expect(location.hash).toBe('#biblioteca');
    expect(history.length).toBe(entries);
  });

  it('2 · keeps a query of only spaces in the field and in the URL with parseAsString', async () => {
    const user = userEvent.setup();
    mount(<Probe />);

    await user.type(screen.getByRole('textbox', { name: 'query' }), '   ');

    expect(screen.getByRole('textbox', { name: 'query' })).toHaveValue('   ');
    await waitFor(() => expect(new URLSearchParams(location.search).get('buscar')).toBe('   '));
  });

  it('3 · empties the field for a query of only spaces with a trimmed eq', async () => {
    const user = userEvent.setup();
    mount(<TrimmedProbe />);

    await user.type(screen.getByRole('textbox', { name: 'query' }), ' ');

    expect(screen.getByRole('textbox', { name: 'query' })).toHaveValue('');
  });

  it('4 · lets the first of a repeated key win', () => {
    history.replaceState(null, '', '/?tipo=lectura&tipo=proyectos#biblioteca');
    mount(<Probe />);

    expect(screen.getByText('category: lectura')).toBeInTheDocument();
  });

  it('5 · clears its keys with null and keeps the foreign ones', async () => {
    history.replaceState(null, '', '/?tipo=zzz&basura=1#biblioteca');
    const user = userEvent.setup();
    mount(<Probe />);
    expect(screen.getByText('category: all')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'clear' }));

    await waitFor(() => expect(location.search).toBe('?basura=1'));
  });

  it('6 · shows a foreign replaceState once the history sync is on', async () => {
    enableHistorySync();
    mount(<Probe />);

    act(() => history.replaceState(null, '', '/?tipo=proyectos#biblioteca'));

    expect(await screen.findByText('category: proyectos')).toBeInTheDocument();
  });

  it('7 · jsdom updates location on replaceState', () => {
    history.replaceState(null, '', '/?a=1#x');

    expect(location.search).toBe('?a=1');
    expect(location.hash).toBe('#x');
  });
});
```

Se corre con `npx vitest run --config frontend/vitest.config.ts --project jsdom src/nuqs-probe.spec.tsx`. El resultado de cada caso va a research.md («Verificación de nuqs»). El caso 3 documenta la opción B de D1, que el plan no usa: tiene que pasar.

## 3. La compuerta

### 3.1 La de cada tarea de código

- La prueba de la tarea en rojo antes y en verde después.
- `npm run typecheck`, `npm run lint` y `npm run format:check`.
- `npm test` y `git diff --check`.

Las tareas que tocan `app.js`, el adaptador o la página suman `npm run build` y `E2E_PORT=<puerto> npm run test:e2e`.

**SC-005 (T013 en adelante).** Este `grep` no imprime nada:

```sh
grep -nE "renderLibrary|renderResourceResults|normalizeSearchText|filters\.|'favorite'|'category'|'clear-filters'|filter-language|filter-cost|filter-favorites|resource-search|resource-results-label|resource-grid" frontend/app.js
```

**Sin estilos en línea nuevos.** Este `grep` no imprime nada:

```sh
git diff <base de T001> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'
```

**Ninguna copia de los filtros ni de los favoritos (T018 en adelante).** Los dos `grep` no imprimen nada:

```sh
grep -rn "useState\|useMemo\|useEffect" frontend/src/pages/library
grep -rnE "useStore\([^,]+\)" frontend/src
```

### 3.2 La del PR (T023)

1. `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`.
2. `E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0`. La red de F1 (106), los 17 de A2, `url-contract` con su caso nuevo y la Biblioteca pasan tres veces.
3. **Los bytes, contra T001:**

   | Salida | Esperado |
   | --- | --- |
   | `frontend/src/index.html` | sin diff |
   | El marcado del dist, con los scripts y el estilo vaciados | el mismo hash |
   | `build/curriculum.json` y `dump-globals` | el mismo hash |
   | `node qa/dist-content-check.ts` | en verde |
   | El `<style>` del dist | otro hash, el mismo multiconjunto (§5.1) |
   | `html.length` | ≤ T001 + 30 000 si F3 instaló nuqs, o ≤ T001 + 15 000 si no, y < 1 250 000 |
   | `import(` e `import.meta` | se informan: la forma de A2 suma una entrada a `legacy-views.ts` |

4. **La complejidad:** `npm run lint` da un aviso menos que en T001, porque sale el predicado de 11 de `renderResourceResults`, y ninguna función nueva pasa de 10.
5. **El tamaño de nuqs, aparte:** el que midió T002.
6. Con permiso, `docker compose build taller`.

## 4. La comparación única, legacy contra port (T020)

Dos raíces construidas: el commit de T001 (`../f3-legacy`) y el último del PR (`../f3-port`), cada una con `npm ci --offline` y `npm run build`. Los puertos 4501 y 4502 tienen que estar libres: `ss -ltn | grep -E ':450[12]\b'` no imprime nada.

```js
// node compare-library.mjs <raíz del legacy> <raíz del port>
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [legacyRoot, portRoot] = process.argv.slice(2);
const require = createRequire(legacyRoot + '/package.json');
const { chromium } = require('@playwright/test');
const frozen = JSON.parse(readFileSync(legacyRoot + '/qa/fixtures/progress-master-2a278ad-storage.json', 'utf8'));

function serve(root, port) {
  return spawn(root + '/node_modules/.bin/vite', ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('server did not start: ' + url);
}

const search = (page, text) => page.getByRole('searchbox', { name: 'Buscar recursos' }).fill(text);
const language = (page, value) => page.getByRole('combobox', { name: 'Filtrar por lenguaje' }).selectOption(value);
const cost = (page, value) => page.getByRole('combobox', { name: 'Filtrar por acceso' }).selectOption(value);
const type = (page, name) => page.getByRole('group', { name: 'Tipo de recurso' }).getByRole('button', { name, exact: true }).click();
const favoritesOnly = (page) => page.getByRole('checkbox', { name: 'Solo mis favoritos' }).check();

const STATES = [
  ['initial', async () => {}],
  ['search tour of', (page) => search(page, 'tour of')],
  ['search ejercicios', (page) => search(page, 'ejercicios')],
  ['rust', (page) => language(page, 'rust')],
  ['go', (page) => language(page, 'go')],
  ['free', (page) => cost(page, 'gratis')],
  ['mixed', (page) => cost(page, 'mixto')],
  ...['Ejercicios', 'Proyectos', 'Lectura', 'Herramientas'].map((name) => [`type ${name}`, (page) => type(page, name)]),
  ['favorites only, none', favoritesOnly],
  ['favorites only, frozen', favoritesOnly, { seeded: true }],
  ['empty', (page) => search(page, 'zzz')],
  ['favorite marked', (page) => page.getByRole('button', { name: 'Guardar en favoritos: A Tour of Go' }).click()],
];
const WIDTHS = [981, 850, 650, 590];

async function capture(browser, origin, [, act, options = {}], width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'es-AR' });
  if (options.seeded) await context.addInitScript((entries) => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, frozen);
  const page = await context.newPage();
  await page.goto(origin + '/#biblioteca');
  await page.getByRole('status').filter({ hasText: 'recursos · abrí' }).waitFor();
  await act(page);
  await page.waitForTimeout(150);
  const dom = await page.evaluate(() => {
    const ATTRIBUTES = ['id', 'role', 'href', 'target', 'rel', 'type', 'placeholder'];
    const PROPERTIES = ['value', 'checked', 'selected', 'open'];
    const nodes = [];
    const walk = (element, path) => {
      const entry = { path, tag: element.tagName.toLowerCase(), classes: [...element.classList].sort().join(' ') };
      for (const name of ATTRIBUTES) if (element.hasAttribute(name)) entry[name] = element.getAttribute(name);
      for (const attribute of element.attributes) if (attribute.name.startsWith('aria-')) entry[attribute.name] = attribute.value;
      for (const name of PROPERTIES) if (name in element) entry['.' + name] = element[name];
      entry.text = element.textContent.replace(/\s+/g, ' ');
      const style = getComputedStyle(element);
      entry.style = Object.fromEntries([...style].map((property) => [property, style.getPropertyValue(property)]));
      nodes.push(entry);
      [...element.children].forEach((child, index) => walk(child, `${path}/${child.tagName.toLowerCase()}:${index}`));
    };
    [...document.querySelector('#main').children].forEach((child, index) => walk(child, `${child.tagName.toLowerCase()}:${index}`));
    return nodes;
  });
  const aria = await page.locator('#main').ariaSnapshot();
  await context.close();
  return { dom, aria };
}

const legacy = serve(legacyRoot, 4501), port = serve(portRoot, 4502);
try {
  await waitFor('http://127.0.0.1:4501/'); await waitFor('http://127.0.0.1:4502/');
  const browser = await chromium.launch();
  let snapshots = 0, elements = 0, properties = 0, differences = 0;
  const samples = [];
  for (const state of STATES) for (const width of WIDTHS) {
    const a = await capture(browser, 'http://127.0.0.1:4501', state, width);
    const b = await capture(browser, 'http://127.0.0.1:4502', state, width);
    snapshots++;
    if (a.aria !== b.aria) { differences++; samples.push([state[0], width, 'aria'].join(' | ')); }
    const count = Math.max(a.dom.length, b.dom.length);
    for (let i = 0; i < count; i++) {
      elements++;
      const ea = a.dom[i] ?? {}, eb = b.dom[i] ?? {};
      const flat = (entry) => ({ ...entry, style: undefined, ...Object.fromEntries(Object.entries(entry.style ?? {}).map(([k, v]) => ['style:' + k, v])) });
      const fa = flat(ea), fb = flat(eb);
      for (const key of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
        properties++;
        if (fa[key] !== fb[key]) { differences++; if (samples.length < 20) samples.push([state[0], width, ea.path ?? eb.path, key, fa[key], fb[key]].join(' | ')); }
      }
    }
  }
  await browser.close();
  console.log(JSON.stringify({ states: STATES.length, widths: WIDTHS.length, snapshots, elements, properties, differences }));
  for (const sample of samples) console.log(sample);
} finally { legacy.kill(); port.kill(); }
```

**Esperado:** `states` 15, `snapshots` 60 y `differences` 0.

**Lo que el script no ve, a propósito** (la lista de FR-036):
- los `data-*`;
- el espacio final de `class="pill "`, porque las clases van por tokens;
- la query de la URL y el foco, que no se comparan;
- el detalle abierto, porque ningún estado lo abre;
- el recuento montado, porque no se compara la identidad de los nodos;
- el turno de React, porque se espera a que el recuento esté dibujado.

Una diferencia fuera de eso es un defecto del port.

## 5. Las comparaciones de CSS (T019)

La base es una copia del árbol de T018 (`../f3-css-base`) y la unidad, el worktree con T019. Las dos están construidas.

### 5.1 El multiconjunto de declaraciones

Es el script `css-multiset.mjs` de [quickstart-f2b.md §3.1 (a)](../009-f2-seams/quickstart-f2b.md), sin cambios: `node css-multiset.mjs ../f3-css-base .`. Se espera `base` igual a `unit` y `onlyBase` y `onlyUnit` en 0.

### 5.2 El barrido de estilo computado

Es el script `style-sweep.mjs` de [quickstart-f2b.md §3.1 (b)](../009-f2-seams/quickstart-f2b.md), con tres cambios:

1. **Cada entrada de `ALL_PAGES`** puede llevar una acción en el tercer lugar: una función `(page) => Promise<void>` en lugar del selector de búsqueda. En `snapshot`, `if (search) …` pasa a:
   ```js
   if (typeof search === 'function') await search(page);
   else if (search) { await page.fill(search, 'zzzz'); await page.waitForSelector('.lab-empty'); }
   ```
2. **Las entradas de la Biblioteca,** al final de `ALL_PAGES`:
   ```js
   ['lib-search', '/#biblioteca', (page) => page.getByRole('searchbox', { name: 'Buscar recursos' }).fill('tour of')],
   ['lib-empty', '/#biblioteca', (page) => page.getByRole('searchbox', { name: 'Buscar recursos' }).fill('zzz')],
   ['lib-favorite', '/#biblioteca', (page) => page.getByRole('button', { name: 'Guardar en favoritos: A Tour of Go' }).click()],
   ['lib-only-favorites', '/#biblioteca', (page) => page.getByRole('checkbox', { name: 'Solo mis favoritos' }).check()],
   ['lib-go-mixed', '/#biblioteca', async (page) => { await page.getByRole('combobox', { name: 'Filtrar por lenguaje' }).selectOption('go'); await page.getByRole('combobox', { name: 'Filtrar por acceso' }).selectOption('mixto'); }],
   ```
   Con `biblioteca`, que ya está, son seis estados de la Biblioteca.
3. **La impresión.** `MEDIA = (process.env.MEDIA ?? 'screen,print').split(',')`. El bucle principal recorre también `MEDIA`, y `snapshot` llama a `await page.emulateMedia({ media })` antes de `goto`. Las capturas de `print` se acotan a `biblioteca`, `recorrido` y `proyecto` (`PAGES` y `WIDTHS=981,590`), que son las páginas con reglas en el bloque de impresión partido.

**Las dos corridas:**

```sh
node style-sweep.mjs ../f3-css-base .
MEDIA=print PAGES=biblioteca,recorrido,proyecto WIDTHS=981,590 node style-sweep.mjs ../f3-css-base .
```

Se espera `differences` 0 en las dos. Las cantidades de `snapshots`, `elements` y `values` van al PR.

**El control negativo** (una vez y sin commitear): en `library.css` de la unidad, el bloque de 850 px se mueve después del primero de 590 px. Después, `npm run build` y `PAGES=biblioteca WIDTHS=590 node style-sweep.mjs ../f3-css-base .`. Se esperan más de 0 diferencias: `.resource-card` toma 20 px de `padding` en lugar de 22, y `.resource-grid`, `gap: 13px`. El multiconjunto da 0. Se restaura.

## 6. Las roturas deliberadas (T021)

Cada una se hace en una copia descartable del último commit, una por vez y sin commitear. Se construye lo que haga falta, se corre la prueba prevista y se anota si falla.

| # | Rotura | Dónde | Falla |
| --- | --- | --- | --- |
| 1 | Volver a la rama `favorite` del delegado de `app.js` y sumar `data-action="favorite" data-id={resource.id}` a la estrella: el clic alterna dos veces | `app.js` y `ResourceCard.tsx` | E2E (e): la estrella queda en ☆ y hay dos escrituras |
| 2 | Abrir `taller-learning-v1` desde la página (`openVersionedStore('taller-learning-v1', …)`) | `LibraryPage.tsx` | `node qa/seams-guard-check.ts` (R1 y R2) |
| 3 | `useStore(routeStore.changes)` sin selector | `LibraryPage.tsx` | `npm run lint` (`no-restricted-syntax`) |
| 4 | Guardar una copia de los favoritos: `const [favorites] = useState(() => [...routeStore.getProgress().favorites])` | `LibraryPage.tsx` | La spec de la página: «shows what another consumer saves…» y «a star saves once…» |
| 5 | Sacar el `flushSync` de `toggleFavorite`, dejando su cuerpo | `LibraryPage.tsx` | La spec de la página: «moves to Limpiar filtros when no favorite is left» |
| 6 | Copiar los filtros a un `useState` inicializado con lo que devuelve `useQueryStates`, y filtrar con la copia | `LibraryPage.tsx` | E2E: «a foreign write of the query reaches the filters while the library is mounted» |
| 7 | Reemplazar la búsqueda por la del Atlas, palabra por palabra: `needle.split(/\s+/).every((word) => text.includes(word))` | `filter-resources.ts` | La spec del modelo: «matches the whole query as a substring» («of tour» da `['go-tour']`) |
| 8 | Sacar `category` de `libraryFilterParsers` y llevar el tipo en un `useState` | `library-query.ts` y `LibraryPage.tsx` | La spec de la página: «writes each change to the query with replace» |
| 9 | Sacar `startUrlStateSync()` de `mount` | `register-library.tsx` | E2E: «a foreign write of the query reaches the filters…» |
| 10 | Sacar `routeStore.changes.subscribe(updateSaveLabel)` | `app.js` | `node qa/app-shell-check.ts`: «un guardado de otro consumidor actualiza el pie»; E2E (h) |
| 11 | Mover el bloque de 850 px después del primero de 590 px | `library.css` | El barrido (§5.2), con el multiconjunto en 0 |
| 12 | Sacar el `<span className="sr-only" />` del enlace | `ResourceCard.tsx` | E2E de F1, `css-contract` R5 |
| 13 | Duplicar el campo de búsqueda | `LibraryFiltersBar.tsx` | E2E de F1, `css-contract` R4 (`getByRole('searchbox')` estricto) |
| 14 | Sacar la rama `biblioteca` de `withLanguageQuery` | `url-grammar.ts` | La spec de la gramática («keeps the library filters…») y el E2E (l) |

**Esperado:** 14 de 14 fallan en la prueba prevista. Si una no falla, la protección no existe: se informa y se corrige la prueba antes del PR.

## 7. Lo que se informa en el PR

- La línea base de T001 y la verificación de T002 (exports, peso y los siete casos).
- La red: 106 + 17 + 1 caso de `url-contract`, y la Biblioteca, tres veces sin reintentos.
- Los bytes y el tamaño de §3.2, con nuqs aparte.
- La comparación única: estados, elementos, propiedades y diferencias.
- El multiconjunto y el barrido, con su control negativo.
- Las roturas: 14 de 14.
- La correspondencia de `qa/` (research.md, R10).
- La complejidad antes y después.
- Lo que no se verificó: la imagen web sin permiso, macOS, Firefox y WebKit, y la comprobación con lector de pantalla, que hace el usuario.
