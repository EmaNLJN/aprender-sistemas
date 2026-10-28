# Quickstart: F6 · Validación

Cómo se comprueba que el port de la campaña no cambió nada de lo que el alumno ve ni guarda, salvo lo que el usuario aceptó. Están los comandos, los valores esperados y los scripts de las comparaciones únicas. El procedimiento de cada tarea está en el [plan](./plan.md), y las decisiones en [research.md](./research.md).

Todo corre desde la raíz del worktree, con Node 24 y sin descargar nada.

## 0. Una función para el hash

Portable entre Linux y macOS, como en F2b:

```sh
sha() { node -e 'const h=require("node:crypto").createHash("sha256");process.stdin.on("data",d=>h.update(d)).on("end",()=>console.log(h.digest("hex")))'; }
```

## 1. La línea base (T001)

1. **En un worktree limpio de la base de implementación,** todo en verde:

   ```sh
   npm ci --offline --no-audit --no-fund
   npm run build && npm test && npm run lint && npm run format:check
   E2E_PORT=4173 npm run test:e2e
   ```

2. **Los oráculos del contenido:**

   ```sh
   sha < build/curriculum.json
   node tools/content/dump-globals.ts . | sha
   sha < frontend/src/index.html
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
   console.log(JSON.stringify({chars:html.length,bytes:Buffer.byteLength(html),script:sha(script),style:sha(style),markup:sha(markup),scripts:(html.match(/<script\b/g)||[]).length,styles:(html.match(/<style\b/g)||[]).length}));'
   ```

   Lo esperado según la medida del coordinador: `chars` cerca de 1 141 337, `scripts` 1 y `styles` 1.
4. **El multiconjunto del CSS:** `node css-multiset.mjs <base> <base>` (§3.1).
5. **Los avisos de complejidad:** `npm run lint 2>&1 | grep -c complexity`, con las dos funciones de `campaign.js` (`missionHTML` y `onClick`) en la lista.
6. **Los escenarios:**
   - `node qa/<check>.ts | grep -c '^PASS'` para `boot-check`, `app-shell-check`, `lab-bridge-check`, `campaign-check` y `seams-guard-check`;
   - la última línea de `node qa/load-order-check.ts`, con las restricciones;
   - `npx playwright test --config qa/e2e/playwright.config.ts --list | tail -1`, con los E2E.
7. **Los predicados de research.md R13 y R12:**

   ```sh
   node -e "require.resolve('jsdom')" && echo arnés presente || echo falta el arnés
   git grep -n "TallerEffects" -- 'frontend/*.js' 'frontend/src' ':!frontend/src/app/legacy/register-effects.ts' ':!frontend/campaign.js'
   git grep -n "SYSTEMS_UI_SOURCE = 'frontend/systems.js'" qa/lib/legacy-sources.ts
   ```

8. **Un commit de documentación** con esos valores, en la «Línea base de la implementación» de research.md.

## 2. La compuerta del PR (T020)

Después del corte, con el build hecho, se repiten los pasos 2 y 3 de §1 y se compara con T001:

| Salida | Esperado |
| --- | --- |
| `build/curriculum.json`, `dump-globals` y `frontend/src/index.html` | iguales |
| `markup` | igual |
| `style` | distinto, con el multiconjunto igual (§3.1) |
| `script` | distinto |
| `chars` | bajo 1 250 000, con el aumento informado; si pasa de 15 000, se avisa antes del PR |
| `scripts` y `styles` | 1 y 1 |

Y los comandos:

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=4173 npm run test:e2e
git diff <base> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'          # vacío
git diff --name-only <base> -- frontend/quest-explorers.js frontend/quest-explorers.css frontend/lab-explorers.js \
  content tools/content frontend/src/entities/campaign/model/rules.ts \
  frontend/src/entities/campaign/model/create-campaign-engine.ts frontend/src/entities/campaign/model/progress.ts     # vacío
git grep -n -E 'campaign\.(js|css)' -- . ':!specs' ':!docs/plans' ':!docs/adr' ':!docs/refactor-roadmap.md'
# sólo qa/e2e/specs/css-contract.spec.ts (R6, R7, R8, R10 y dos comentarios) y qa/seams-guard-check.ts (fuentes virtuales)
git diff <base> -- package.json package-lock.json   # vacío, salvo que T002 haya traído el arnés
```

## 3. Las comparaciones únicas

Se corren fuera del repositorio, sobre dos raíces: un worktree de la base de T001 y la rama con el corte. Ninguno de estos archivos se commitea. Los scripts resuelven `postcss`, `esbuild` y `@playwright/test` desde el `node_modules` de la raíz que reciben, así que se guardan en una carpeta temporal (`$TMPDIR/f6-compare/`).

```sh
git worktree add "$TMPDIR/f6-base" <base>          # el commit base de T001
ln -s "$PWD/node_modules" "$TMPDIR/f6-base/node_modules"
(cd "$TMPDIR/f6-base" && npm run build)
npm run build                                      # en la raíz de F6
ss -ltn | grep -E ':450[12]\b'                     # vacío: los puertos 4501 y 4502 libres
```

### 3.1 El CSS (T009 y T018 a)

**(a) El multiconjunto de declaraciones** es `css-multiset.mjs`, el mismo de la unidad 8 de F2b ([quickstart-f2b.md §3.1 (a)](../009-f2-seams/quickstart-f2b.md)):

- uso: `node css-multiset.mjs <raíz base> <raíz de F6>`;
- esperado: `onlyBase` 0 y `onlyUnit` 0, con `base` igual a `unit`.

**(b) El barrido de T009** es `style-sweep.mjs`, el de la unidad 8 de F2b ([quickstart-f2b.md §3.1 (b)](../009-f2-seams/quickstart-f2b.md)), acotado a las páginas que dibujan `.quest-direct-lock` o la campaña:

```sh
PAGES=lock,mission,campana node style-sweep.mjs "$TMPDIR/f6-base" "$PWD"
```

Esperado: `snapshots` 36 y `differences` 0.

### 3.2 El DOM, el estilo computado y la accesibilidad (T018 b)

`campaign-compare.mjs` recorre los 19 estados de research.md R14 y las dos páginas del laboratorio que dibujan campaña. En cada estado:

- abre un contexto por preferencia de movimiento;
- siembra el almacenamiento antes de cargar, carga y hace las acciones;
- espera a que no quede ninguna animación, a que se oculte el aviso del shell y mueve el puntero a (0, 0);
- captura el DOM normalizado y el `ariaSnapshot()` de `#main` (a 1 280 px, sin movimiento reducido);
- captura el estilo computado de cada elemento del documento a los seis anchos.

Esperado: `differences` 0, en unos 10 minutos.

```js
// node campaign-compare.mjs <raíz base> <raíz de F6>; STATES=S01,S15 y WIDTHS=1280 acotan la corrida
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const [baseRoot, unitRoot] = process.argv.slice(2);
const require = createRequire(baseRoot + '/package.json');
const { chromium } = require('@playwright/test');
const read = (path) => JSON.parse(fs.readFileSync(baseRoot + path, 'utf8'));
const master = read('/qa/fixtures/progress-master-2a278ad-storage.json');
const ids = read('/qa/fixtures/curriculum-ids.json');
const missions = (world) => [...ids.worlds[world].trainingIds, ...ids.worlds[world].challengeIds];
const saved = ({ mastered = [], codeOnly = [], passed = {} }) =>
  JSON.stringify({
    version: 1,
    seals: Object.fromEntries([
      ...mastered.map((id) => [id, { code: true, prediction: true, assisted: false }]),
      ...codeOnly.map((id) => [id, { code: true, prediction: false, assisted: false }]),
    ]),
    checkpoints: Object.fromEntries(Object.entries(passed).map(([world, answer]) => [world, { passed: true, lastAnswer: answer }])),
  });
const ALL_RUST = ['rust-world-1', 'rust-world-2', 'rust-world-3', 'rust-world-4'].flatMap(missions);
const MASTER_RUST = Object.fromEntries(['taller-laboratorio-v1', 'taller-campaign-v1', 'taller-systems-v1'].map((key) => [key, master[key]]));
const LAB_ONLY = { 'taller-laboratorio-v1': master['taller-laboratorio-v1'] };
const THREE_PASSED = { 'rust-world-1': 1, 'rust-world-2': 2, 'rust-world-3': 1 };

const CAMPAIGN = '/#campana';
const ALL_STATES = [
  ['S01', CAMPAIGN, {}, []],
  ['S02', CAMPAIGN, {}, [['language', 'Go']]],
  ['S03', CAMPAIGN, MASTER_RUST, []],
  ['S04', CAMPAIGN, master, []],
  ['S05', CAMPAIGN, MASTER_RUST, [['world', 1]]],
  ['S06', CAMPAIGN, MASTER_RUST, [['world', 2]]],
  ['S07', CAMPAIGN, MASTER_RUST, [['world', 3]]],
  ['S08', CAMPAIGN, MASTER_RUST, [['world', 4]]],
  ['S09', CAMPAIGN, MASTER_RUST, [['filter', 'Entrenamiento']]],
  ['S10', CAMPAIGN, MASTER_RUST, [['filter', 'Reparación']]],
  ['S11', CAMPAIGN, MASTER_RUST, [['filter', 'Kata']]],
  ['S12', CAMPAIGN, MASTER_RUST, [['filter', 'Desafío final']]],
  ['S13', CAMPAIGN, LAB_ONLY, []],
  ['S14', CAMPAIGN, LAB_ONLY, [['answer', 'A']]],
  ['S15', CAMPAIGN, LAB_ONLY, [['answer', 'B']]],
  ['S16', CAMPAIGN, { 'taller-campaign-v1': saved({ mastered: ALL_RUST, passed: THREE_PASSED }) }, []],
  ['S17', CAMPAIGN, { 'taller-campaign-v1': saved({ mastered: ALL_RUST, passed: { ...THREE_PASSED, 'rust-world-4': 2 } }) }, []],
  ['S18', CAMPAIGN, 'blocked', []],
  ['S19', CAMPAIGN, { 'taller-campaign-v1': saved({ codeOnly: ['rust-02'] }) }, []],
  ['lock', '/?campana=rust-world-1&ejercicio=rust-103&paso=learn#laboratorio', {}, []],
  ['mission', '/?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio', {}, []],
];
const STATES = process.env.STATES ? ALL_STATES.filter(([name]) => process.env.STATES.split(',').includes(name)) : ALL_STATES;
const WIDTHS = (process.env.WIDTHS ?? '1280,981,850,650,590,375').split(',').map(Number);
const MOTIONS = ['no-preference', 'reduce'];
const DROPPED = ['data-quest', 'data-id', 'data-filter', 'data-answer'];

function serve(root, port) {
  return spawn(root + '/node_modules/.bin/vite', ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('server did not start: ' + url);
}
async function perform(page, [kind, value]) {
  if (kind === 'language') await page.getByRole('group', { name: 'Lenguaje del recorrido' }).getByRole('button', { name: new RegExp(`^${value}`) }).click();
  if (kind === 'world') await page.getByRole('navigation', { name: 'Mundos de la campaña' }).getByRole('button', { name: new RegExp(`^Mundo ${value}: `) }).click();
  if (kind === 'filter') await page.getByRole('group', { name: 'Tipo de misión' }).getByRole('button', { name: value, exact: true }).click();
  if (kind === 'answer') await page.locator('#quest-checkpoint').getByRole('button', { name: new RegExp(`^${value}`) }).click();
}
async function settle(page) {
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
  await page.waitForFunction(() => !document.querySelector('#toast.visible'), null, { timeout: 10000 });
}
async function open(browser, origin, [, path, seed, actions], motion) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: motion, locale: 'es-AR' });
  if (seed === 'blocked')
    await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage is blocked', 'SecurityError'); } }));
  else
    await context.addInitScript((entries) => { for (const [key, text] of Object.entries(entries)) localStorage.setItem(key, text); }, seed);
  const page = await context.newPage();
  await page.goto(origin + path);
  await page.locator('#main > :not([data-content-gate="loading"])').first().waitFor();
  for (const action of actions) await perform(page, action);
  await settle(page);
  return { context, page };
}
const domOf = (page) =>
  page.evaluate((dropped) => {
    const clone = document.querySelector('#main').cloneNode(true);
    clone.normalize();
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return /^\s*$/.test(node.data) ? null : { text: node.data };
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      const attributes = [...node.attributes].filter((a) => !dropped.includes(a.name)).map((a) => [a.name, a.value]).sort(([a], [b]) => a.localeCompare(b));
      return { tag: node.tagName.toLowerCase(), attributes, children: [...node.childNodes].map(walk).filter(Boolean) };
    };
    return JSON.stringify(walk(clone));
  }, DROPPED);
const styleOf = (page) =>
  page.evaluate(() => {
    const out = {};
    const pathOf = (el) => { const parts = []; for (let n = el; n && n !== document.documentElement; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + ':' + [...n.parentElement.children].indexOf(n)); return parts.join('/'); };
    for (const el of [document.documentElement, ...document.querySelectorAll('*')]) {
      const cs = getComputedStyle(el); const props = {};
      for (let i = 0; i < cs.length; i++) props[cs[i]] = cs.getPropertyValue(cs[i]);
      out[pathOf(el)] = props;
    }
    return out;
  });

const base = serve(baseRoot, 4501), unit = serve(unitRoot, 4502);
try {
  await waitFor('http://127.0.0.1:4501/'); await waitFor('http://127.0.0.1:4502/');
  const browser = await chromium.launch();
  let states = 0, doms = 0, trees = 0, snapshots = 0, elements = 0, values = 0, differences = 0;
  const samples = [];
  const note = (line) => { differences++; if (samples.length < 20) samples.push(line); };
  for (const state of STATES) {
    states++;
    for (const motion of MOTIONS) {
      const a = await open(browser, 'http://127.0.0.1:4501', state, motion);
      const b = await open(browser, 'http://127.0.0.1:4502', state, motion);
      if (motion === 'no-preference') {
        doms++; trees++;
        if ((await domOf(a.page)) !== (await domOf(b.page))) note(`${state[0]} DOM`);
        const [ta, tb] = [await a.page.locator('#main').ariaSnapshot(), await b.page.locator('#main').ariaSnapshot()];
        if (ta !== tb) note(`${state[0]} accessibility\n--- base\n${ta}\n--- F6\n${tb}`);
      }
      for (const width of WIDTHS) {
        for (const { page } of [a, b]) { await page.setViewportSize({ width, height: 900 }); await settle(page); }
        const [sa, sb] = [await styleOf(a.page), await styleOf(b.page)];
        snapshots++;
        for (const key of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
          elements++;
          const pa = sa[key] ?? {}, pb = sb[key] ?? {};
          for (const prop of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
            values++;
            if (pa[prop] !== pb[prop]) note([state[0], width, motion, key, prop, pa[prop], pb[prop]].join(' | '));
          }
        }
      }
      await a.context.close(); await b.context.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify({ states, doms, trees, snapshots, elements, values, differences }));
  for (const sample of samples) console.log(sample);
} finally { base.kill(); unit.kill(); }
```

Esperado: `states` 21, `doms` 21, `trees` 21, `snapshots` 252 (21 × 6 × 2) y `differences` 0 fuera de las aceptadas.

De las diferencias que la spec aceptó, sólo una puede aparecer: la del foco. Se acepta si son propiedades `outline*` del elemento enfocado y las dos versiones enfocan el mismo elemento, y se anota en el PR. Las otras no aparecen:
- los `data-*` los quita el normalizador;
- los `<details>` no se abren;
- las transiciones se esperan.

Cualquier otra diferencia se corrige en el código, nunca devolviendo el comportamiento del legacy.

Si aparece una diferencia del DOM, se compara a mano con `STATES=<estado>`, guardando las dos salidas de `domOf` en archivos. La causa suele ser:

- una clase con otro espacio;
- un `type` o un `data-*` de más;
- un texto sin su espacio.

### 3.3 Los puentes (T018 c)

`compare-campaign-bridges.ts` adapta la comparación de la unidad 5 de F2b:

- **La base** carga `campaign.js` y llama `TallerCampaign.init()`.
- **F6** carga `campaign-bridges.ts` con `loadCampaignBridges` y llama `TallerCampaignEngine.init(…)` con la configuración de `startApp()`.

Esperado: `compared` 24 486 y `different` 0. Son 2 estados del laboratorio, 11 búsquedas y, en cada una, 275 ids × 2 lenguajes × 2 funciones más 13 `returnURL`.

```ts
// node compare-campaign-bridges.ts <raíz base> <raíz de F6>
import fs from 'node:fs';
import vm from 'node:vm';

interface Bridges {
  exerciseContextHTML(id: string, language: string): string;
  lockedExerciseHTML(id: string, language: string): string;
  returnURL(worldId: string): string;
}

const [baseRoot, unitRoot] = process.argv.slice(2);
const master = JSON.parse(fs.readFileSync(`${baseRoot}/qa/fixtures/progress-master-2a278ad-storage.json`, 'utf8'));
const labStates = { empty: { records: {} }, master: JSON.parse(master['taller-laboratorio-v1']) };
const LAB_GLOBALS = ['RUST_LAB', 'RUST_QUESTS', 'GO_LAB', 'GO_QUESTS', 'SYSTEMS_PC_LABS', 'SYSTEMS_LOWLEVEL_LABS', 'SYSTEMS_INFRA_LABS', 'SYSTEMS_PLAY_LABS'];

async function bridges(root: string, search: string, labState: unknown): Promise<{ api: Bridges; exercises: { id: string }[] }> {
  const lib = await import(`${root}/qa/lib/legacy-sources.ts`);
  const storage = new Map<string, string>();
  const context: Record<string, unknown> = {
    URL,
    URLSearchParams,
    localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, String(v)), removeItem: (k: string) => void storage.delete(k) },
    location: { search, hash: '', href: `http://taller.test/${search}` },
    history: { replaceState: () => undefined },
  };
  context.window = context;
  vm.createContext(context);
  lib.loadLabCatalogs(context);
  const exercises = LAB_GLOBALS.flatMap((name) => context[name] as { id: string }[]);
  context.TallerLab = { getExercises: () => exercises, exportState: () => labState };
  lib.loadCampaignWorlds(context);
  lib.loadCampaignEngine(context);
  if (typeof lib.loadCampaignUi === 'function') {
    lib.loadCampaignUi(context);
    (context.TallerCampaign as { init(): unknown }).init();
    return { api: context.TallerCampaign as Bridges, exercises };
  }
  const api = lib.loadCampaignBridges(context) as Bridges;
  const config = { exercises, worlds: { rust: context.RUST_CAMPAIGN ?? [], go: context.GO_CAMPAIGN ?? [] } };
  (context.TallerCampaignEngine as { init(config: unknown, lab: unknown): unknown }).init(config, labState);
  return { api, exercises };
}

const worlds = ['rust-world-1', 'rust-world-2', 'rust-world-3', 'rust-world-4', 'go-world-1', 'go-world-2', 'go-world-3', 'go-world-4', 'no-existe'];
const hostile = ['mundo raro/1', 'a b', "!'()*~", ''];
let compared = 0, different = 0;
const samples: string[] = [];
const check = (label: string, a: unknown, b: unknown) => {
  compared++;
  const [x, y] = [JSON.stringify(a), JSON.stringify(b)];
  if (x !== y) { different++; if (samples.length < 8) samples.push(`${label}: ${x} ≠ ${y}`); }
};

for (const [stateName, labState] of Object.entries(labStates)) {
  for (const search of ['', '?campana=', ...worlds.map((world) => `?campana=${world}`)]) {
    const a = await bridges(baseRoot, search, labState);
    const b = await bridges(unitRoot, search, labState);
    for (const id of [...a.exercises.map((exercise) => exercise.id), 'nope'])
      for (const language of ['rust', 'go']) {
        check(`context ${stateName} ${search} ${id} ${language}`, a.api.exerciseContextHTML(id, language), b.api.exerciseContextHTML(id, language));
        check(`lock ${stateName} ${search} ${id} ${language}`, a.api.lockedExerciseHTML(id, language), b.api.lockedExerciseHTML(id, language));
      }
    for (const id of [...worlds, ...hostile]) check(`returnURL ${id}`, a.api.returnURL(id), b.api.returnURL(id));
  }
}
console.log(JSON.stringify({ compared, different }));
for (const sample of samples) console.log(sample);
```

### 3.4 El control negativo del barrido (T018)

En una copia descartable de F6, `import '../pages/campaign/ui/campaign-page.css';` pasa a ir antes de `import '../../lab.css';` en `main.tsx`. Con `npm run build` y `STATES=S01,S05 WIDTHS=1280,650 node campaign-compare.mjs …`, `differences` tiene que ser mayor que 0. El multiconjunto (§3.1 a) sigue en 0: es la prueba de que el barrido ve la cascada y el multiconjunto no.

## 4. Las roturas deliberadas (T019)

Cada una se hace en una copia de trabajo y se deshace con `git checkout -- <archivo>`. Ninguna se commitea. Se informa N de N en el PR.

| Protección | Rotura | Falla en |
| --- | --- | --- |
| FR-030 | En `MissionSeal`, `{points}` pasa a `20` cuando `label === 'Pruebas'` | `CampaignPage.constants.spec.tsx` («○ Pruebas · 7») |
| FR-026 | `useStore(campaignEngine.changes)` sin selector en `CampaignPage.tsx` | `npm run lint` (`no-restricted-syntax`) |
| FR-039 | Las cuatro reglas de `.quest-direct-lock` borradas de `lab.css` | `css-contract`, R10 |
| FR-025 | `localStorage.getItem('taller-campaign-v1')` en `CampaignPage.tsx` | `seams-guard-check`, R1 en el árbol real |
| FR-021 y FR-023 | `campaignBridges.sync()` en lugar de `refresh()` en `mount` | `register-campaign.spec.tsx` («mount draws … writes nothing»), con la siembra de laboratorio |
| FR-035 | `Ver mi mapa →` sin la flecha en `lockedExerciseHTML` | `lab-bridge-check`, escenario 7, y la comparación de §3.3 |
| FR-019 | `key={index}` en lugar de `key={mission.id}` en `OpenWorld` | `CampaignPage.spec.tsx` (10) y `campaign-kept-state.spec.ts` («the requirements…») |
| FR-018 | El `status` de la retroalimentación con `key={answer ?? 'none'}` | `CampaignPage.spec.tsx` (9) y `campaign-kept-state.spec.ts` («the checkpoint feedback…») |
| FR-016 | `chooseWorld` sin `flushSync` | `CampaignPage.spec.tsx` (4) y el flujo (c) |
| FR-017 y R10 | `unmount` sin `stop()` | `register-campaign.spec.tsx` («unmount stops…») |
| R4 | `missionTypeLabel` importado de `../../entities/campaign` en `campaign-bridges.ts` | `seams-guard-check` en el árbol real |
| FR-031 | «Seis misiones» cambiado por «Siete misiones» en `OpenWorld.tsx` | `CampaignPage.editorial.spec.tsx`, con el mensaje que nombra el archivo |
| FR-032 | `{counts.worlds}` cambiado por `{4}` en `CampaignHero.tsx` | `CampaignPage.catalog.spec.tsx` («5 mundos») |
| FR-013 | `mount` que no guarda el resultado de `openCampaignSession` en `session` | `register-campaign.spec.tsx` («a second mount … keeps the chosen world») |

## 5. Lo que va en la descripción del PR (T022)

- **El dist y la complejidad:**
  - `chars` antes y después, y el aumento;
  - los hashes de §2;
  - los avisos antes y después (−2).
- **Las pruebas:**
  - los escenarios de cada check adaptado;
  - los E2E (123 más 21 más 5);
  - las specs nuevas de Vitest.
- **Las comparaciones y las roturas:**
  - las salidas de §3.1, §3.2, §3.3 y §3.4;
  - las roturas, N de N.
- **La tabla de correspondencia** del plan, §4.4.
- **Las dos decisiones** del informe y lo que queda para el usuario: el lector de pantalla y Docker.
