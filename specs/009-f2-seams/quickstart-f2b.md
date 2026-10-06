# Quickstart: F2b · Validación

Cómo se comprueba que una unidad de F2b no cambió nada de lo que ve ni guarda el alumno: los comandos, los valores esperados y los scripts de las comparaciones únicas. Los valores de la base están en «Línea base de planificación» de [research-f2b.md](./research-f2b.md), y el procedimiento de cada compuerta, en la sección 0 del [plan de F2b](./plan-f2b.md). Todo corre desde la raíz del worktree, con Node 24 y sin descargar nada.

## 0. Una función para el hash

Portable entre Linux y macOS, como en F2a:

```sh
sha() { node -e 'const h=require("node:crypto").createHash("sha256");process.stdin.on("data",d=>h.update(d)).on("end",()=>console.log(h.digest("hex")))'; }
```

## 1. La línea base (T020)

1. En un worktree limpio de la base de implementación: `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`: todo en verde (31 checks, 186 pruebas de Vitest y 106 E2E, si la base es la de la planificación).
2. Los oráculos:

   ```sh
   sha < build/curriculum.json                                            # ef8f5715…
   node tools/content/dump-globals.ts . | sha                             # cd1f9e62…
   node tools/content/dump-dist-globals.ts dist/index.html 2>/dev/null | sha   # daf2bc71… (antes del corte de A2)
   sha < frontend/src/index.html                                          # 6c3b7e6a…
   ```

3. El dist, en partes:

   ```sh
   node -e '
   const fs=require("node:fs"),c=require("node:crypto");
   const sha=(s)=>c.createHash("sha256").update(s).digest("hex");
   const html=fs.readFileSync("dist/index.html","utf8");
   const style=/<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
   const script=/<script\b[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
   const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,"<script></script>").replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,"<style></style>");
   console.log(JSON.stringify({chars:html.length,bytes:Buffer.byteLength(html),script:sha(script),style:sha(style),markup:sha(markup),dynamicImports:(html.match(/\bimport\(/g)||[]).length,importMeta:(html.match(/import\.meta/g)||[]).length}));'
   ```

   Esperado en `c5d497d`: `chars` 2 190 106, `bytes` 2 205 733, `script` `d4051c59…`, `style` `850ef821…`, `markup` `562c5364…`, `dynamicImports` 0 e `importMeta` 0.
4. El multiconjunto del CSS: `node css-multiset.mjs <base> <base>` (§3.1) da `base: 4319` y `distinctBase: 4315`.
5. Los avisos de complejidad (`npm run lint 2>&1 | grep -c complexity`: 35) y los escenarios de cada check (`node qa/<check>.ts | grep -c '^PASS'`): `app-shell` 53, `boot` 14, `lab-bridge` 21, `lab-state` 37, `systems` 46, `project-kit` 11, `campaign` 34, `versioned-storage` 34 y `seams-guard` 18; `node qa/quest-explorers-check.ts` imprime `"assertions":47`.
6. Un commit de documentación con esos valores en «Línea base de la implementación» de research-f2b.md.

## 2. La compuerta de una unidad

Después de la unidad, con el build hecho: repetir los pasos 2 y 3 de §1 y comparar con T020.

| Salida | U8 | U5, U7 y U6 |
| --- | --- | --- |
| `build/curriculum.json`, `dump-globals` y `dump-dist-globals` (o, después del corte de A2, su check del bundle) | iguales | iguales |
| `script` | igual | cambia |
| `style` | cambia; `css-multiset.mjs` sin diferencias y el barrido en 0 (§3.1) | igual |
| `markup` y `frontend/src/index.html` | iguales | iguales |
| `chars` | acumulado ≤ base de T020 + 8 000 y bajo el tope de `build-check` | ← |

Y los comandos:

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=<puerto> npm run test:e2e
git diff --name-only <base> | grep -E 'register-(catalogs|systems-(lowlevel|infra|play|pc))\.ts|atlas-catalog\.ts|src/app/main\.tsx|src/app/boot/'   # vacío
git diff <base> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'                                     # vacío
git diff <base> -- package.json package-lock.json                                                                                               # vacío
```

## 3. Las comparaciones únicas

Se corren fuera del repositorio, sobre dos raíces: un worktree del commit base y la de la unidad. Ninguno de estos archivos se commitea. Los scripts resuelven sus dependencias (`esbuild`, `postcss` y `@playwright/test`) desde el `node_modules` de la raíz que reciben, así que se pueden guardar en cualquier carpeta temporal (`$TMPDIR/f2b-compare/`).

```sh
git worktree add "$TMPDIR/f2b-base" <base>          # el commit base de T020
ln -s "$PWD/node_modules" "$TMPDIR/f2b-base/node_modules"
(cd "$TMPDIR/f2b-base" && npm run build)            # regenera build/ y dist/ en la base
npm run build                                       # en la raíz de la unidad
```

### 3.1 Unidad 8: el CSS del dist

**(a) El multiconjunto de declaraciones.** Separa cada lista de selectores para no depender de cómo `lightningcss` junta reglas. Esperado: `base` y `unit` en 4 319, y `onlyBase` y `onlyUnit` en 0.

```js
// node css-multiset.mjs <raíz base> <raíz de la unidad>
import fs from 'node:fs';
import { createRequire } from 'node:module';
function tuples(root) {
  const require = createRequire(root + '/package.json');
  const postcss = require('postcss');
  const html = fs.readFileSync(root + '/dist/index.html', 'utf8');
  const css = /<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
  const out = [];
  postcss.parse(css).walkRules((rule) => {
    const context = [];
    for (let p = rule.parent; p && p.type !== 'root'; p = p.parent) if (p.type === 'atrule') context.unshift('@' + p.name + ' ' + p.params);
    for (const selector of rule.selectors)
      for (const decl of rule.nodes.filter((n) => n.type === 'decl'))
        out.push([context.join(' | '), selector, decl.prop, decl.value, decl.important ? '!important' : ''].join(' ¦ '));
  });
  return out;
}
const count = (list) => list.reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map());
const [a, b] = [tuples(process.argv[2]), tuples(process.argv[3])];
const [ca, cb] = [count(a), count(b)];
const onlyA = [], onlyB = [];
for (const [t, n] of ca) if ((cb.get(t) ?? 0) < n) onlyA.push(t + ' ×' + (n - (cb.get(t) ?? 0)));
for (const [t, n] of cb) if ((ca.get(t) ?? 0) < n) onlyB.push(t + ' ×' + (n - (ca.get(t) ?? 0)));
console.log(JSON.stringify({ base: a.length, unit: b.length, distinctBase: ca.size, distinctUnit: cb.size, onlyBase: onlyA.length, onlyUnit: onlyB.length }));
for (const t of onlyA.slice(0, 20)) console.log('- ' + t);
for (const t of onlyB.slice(0, 20)) console.log('+ ' + t);
```

**(b) El barrido de estilo computado.** Es la comparación decisiva: el multiconjunto no ve la cascada. Sirve cada `dist/` con su `vite preview`, carga 14 páginas a seis anchos y con las dos preferencias de movimiento, y compara cada propiedad computada de cada elemento. Esperado: `snapshots` 168 y `differences` 0, en unos 6 minutos. Antes de correrlo, los puertos 4501 y 4502 tienen que estar libres (`ss -ltn | grep -E ':450[12]\b'` no imprime nada): si no, se compararía contra un servidor viejo.

```js
// node style-sweep.mjs <raíz base> <raíz de la unidad>; PAGES=a,b y WIDTHS=590,981 acotan la corrida
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const [baseRoot, unitRoot] = process.argv.slice(2);
const require = createRequire(baseRoot + '/package.json');
const { chromium } = require('@playwright/test');

function serve(root, port) {
  const child = spawn(root + '/node_modules/.bin/vite', ['preview', '--config', 'frontend/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
  return child;
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('server did not start: ' + url);
}
const ALL_PAGES = [
  ['recorrido', '/#recorrido'], ['campana', '/#campana'], ['sistemas', '/#sistemas'], ['atlas', '/#atlas'],
  ['laboratorio', '/#laboratorio'], ['biblioteca', '/#biblioteca'], ['proyecto', '/#proyecto'], ['metodo', '/#metodo'],
  ['mission', '/?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio'],
  ['lock', '/?campana=rust-world-1&ejercicio=rust-103&paso=learn#laboratorio'],
  ['core', '/?sistema=cache&ejercicio=rust-113&paso=code#laboratorio'],
  ['workshop', '/?lenguaje=rust&taller=cache&parte=explore#sistemas'],
  ['lab-empty', '/#laboratorio', '#lab-search'],
  ['sys-empty', '/?lenguaje=rust#sistemas', '#sys-search'],
];
const WIDTHS = (process.env.WIDTHS ?? '1280,981,850,650,590,375').split(',').map(Number);
const PAGES = process.env.PAGES ? ALL_PAGES.filter(([name]) => process.env.PAGES.split(',').includes(name)) : ALL_PAGES;
const MOTIONS = ['no-preference', 'reduce'];
async function snapshot(browser, origin, [, path, search], width, motion) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: motion, locale: 'es-AR' });
  const page = await context.newPage();
  await page.goto(origin + path);
  await page.waitForFunction(() => document.querySelector('#main')?.children.length > 0);
  if (search) { await page.fill(search, 'zzzz'); await page.waitForSelector('.lab-empty'); }
  const result = await page.evaluate(() => {
    const out = {};
    const pathOf = (el) => { const parts = []; for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const i = [...n.parentElement.children].indexOf(n); parts.unshift(n.tagName.toLowerCase() + ':' + i); } return parts.join('/'); };
    for (const el of [document.documentElement, ...document.querySelectorAll('*')]) {
      const cs = getComputedStyle(el); const props = {};
      for (let i = 0; i < cs.length; i++) props[cs[i]] = cs.getPropertyValue(cs[i]);
      out[pathOf(el)] = props;
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
  for (const pageSpec of PAGES) for (const width of WIDTHS) for (const motion of MOTIONS) {
    const a = await snapshot(browser, 'http://127.0.0.1:4501', pageSpec, width, motion);
    const b = await snapshot(browser, 'http://127.0.0.1:4502', pageSpec, width, motion);
    snapshots++;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      elements++;
      const pa = a[key] ?? {}, pb = b[key] ?? {};
      for (const prop of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
        values++;
        if (pa[prop] !== pb[prop]) { differences++; if (samples.length < 15) samples.push([pageSpec[0], width, motion, key, prop, pa[prop], pb[prop]].join(' | ')); }
      }
    }
  }
  await browser.close();
  console.log(JSON.stringify({ snapshots, elements, values, differences }));
  for (const s of samples) console.log(s);
} finally { base.kill(); unit.kill(); }
```

**(c) El control negativo** (en una copia descartable, una vez): las mismas reglas al principio de `styles.css` en lugar del final. Esperado: el multiconjunto con 0 diferencias y el barrido con diferencias. Al planificar dio 702 con `PAGES=laboratorio,biblioteca,sys-empty WIDTHS=590,981`: la barra lateral a 590 px pasa de 204 a 250 px de alto.

### 3.2 Unidad 5: las URL y los puentes

**(a) Las URL.** Compara la gramática de la unidad con los fragmentos de hoy, copiados textualmente de `c5d497d`. Si la base de implementación cambió alguno de esos fragmentos, se vuelven a copiar desde ella. Esperado: `compared` 2 569 y `different` 0.

```js
// node compare-urls.mjs <raíz de la unidad>
import { createRequire } from 'node:module';
const root = process.argv[2];
const esbuild = createRequire(`${root}/package.json`)('esbuild');
const built = esbuild.buildSync({ entryPoints: [root + '/frontend/src/shared/config/url-grammar.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const g = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
// Today's code, copied from c5d497d (campaign.js, systems.js, lab.js, app.js, ConceptDetail.tsx).
const old = {
  worldURL: (id) => `?mundo=${encodeURIComponent(id)}#campana`,
  missionURL: (world, id) => `?campana=${encodeURIComponent(world.id)}&ejercicio=${encodeURIComponent(id)}&paso=learn#laboratorio`,
  systemsReturnURL: (id, lang = 'rust') => `?taller=${encodeURIComponent(id)}&parte=build&lenguaje=${lang === 'go' ? 'go' : 'rust'}#sistemas`,
  codeURL: (workshop, id) => `?sistema=${encodeURIComponent(workshop.id)}&ejercicio=${encodeURIComponent(id)}&paso=code#laboratorio`,
  labLink: (labId) => `?ejercicio=${encodeURIComponent(labId)}&paso=learn#laboratorio`,
  locationForSelection(href, language, selected, phase) { const url = new URL(href); url.search = ''; url.searchParams.set('lenguaje', language); if (selected) { url.searchParams.set('taller', selected); url.searchParams.set('parte', phase); } return url.href; },
  worldClick(href, selected) { const url = new URL(href); url.search = ''; url.searchParams.set('mundo', selected); return url.href; },
  syncLocation(href, mode, selectedId, phase) { const url = new URL(href); if (mode === 'map') { url.searchParams.delete('campana'); url.searchParams.delete('sistema'); } if (mode === 'exercise') { url.searchParams.set('ejercicio', selectedId); url.searchParams.set('paso', phase); } else { url.searchParams.delete('ejercicio'); url.searchParams.delete('paso'); } return url.href; },
  languageSwitch(href, currentView, language) { const url = new URL(href); if (currentView === 'sistemas') url.searchParams.set('lenguaje', language); else url.search = ''; return url.href; },
  currentView(hash) { const views = ['recorrido','campana','sistemas','atlas','laboratorio','biblioteca','proyecto','metodo']; return views.includes(hash.slice(1)) ? hash.slice(1) : 'recorrido'; },
  labPhase(search) { const p = new URLSearchParams(search); return ['learn', 'code', 'reflect'].includes(p.get('paso')) ? p.get('paso') : 'learn'; },
  systemsPart(search) { const p = new URLSearchParams(search); return ['explore', 'build', 'ship'].includes(p.get('parte')) ? p.get('parte') : 'explore'; },
};
const ids = ['rust-world-1', 'go-world-4', 'rust-113', 'go-137', 'cache', 'pc', 'mundo raro/1', 'a b', "!'()*~", 'ñandú', '%41', '&x=1', '#frag', '+', ''];
const hrefs = ['http://taller.test/#campana', 'http://taller.test/?basura=1#sistemas', 'http://taller.test/?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio', 'http://taller.test/?#laboratorio', 'http://taller.test/?sistema=cache&ejercicio=rust-113&paso=code#laboratorio', 'http://taller.test/?mundo=a%20b#campana', 'http://taller.test/?taller=cache&parte=build&lenguaje=rust#sistemas', 'http://taller.test/?ejercicio=a+b&x=%7E#laboratorio', 'http://taller.test/#laboratorio'];
const searches = ['?sistema=', '?campana=', '?sistema=cache&campana=rust-world-1', '?paso=code', '?paso=CODE', '?paso=', '?parte=ship', '?parte=x', '?paso=reflect&parte=build', '?ejercicio=rust-02&paso=learn&paso=code', '?parte=build&parte=ship'];
const hashes = ['', '#', '#recorrido', '#campana', '#sistemas', '#atlas', '#laboratorio', '#biblioteca', '#proyecto', '#metodo', '#invitacion=abc', '#Laboratorio', '#laboratorio?x'];
let compared = 0, different = 0; const diffs = [];
const check = (label, a, b) => { compared++; if (a !== b) { different++; if (diffs.length < 10) diffs.push([label, a, b].join(' | ')); } };
for (const id of ids) {
  check('worldHref', old.worldURL(id), g.worldHref(id));
  check('exerciseHref', old.labLink(id), g.exerciseHref(id, 'learn'));
  for (const lang of ['rust', 'go', 'otro', undefined]) check('workshopReturnHref', old.systemsReturnURL(id, lang), g.workshopReturnHref(id, lang ?? 'rust'));
  for (const other of ids) {
    check('campaignMissionHref', old.missionURL({ id }, other), g.campaignMissionHref(id, other));
    check('workshopExerciseHref', old.codeURL({ id }, other), g.workshopExerciseHref(id, other));
  }
}
for (const href of hrefs) {
  for (const id of ids) {
    check('withWorldQuery', old.worldClick(href, id), g.withWorldQuery(new URL(href), id).href);
    for (const lang of ['rust', 'go']) for (const part of ['explore', 'build', 'ship']) {
      check('withWorkshopQuery', old.locationForSelection(href, lang, id, part), g.withWorkshopQuery(new URL(href), lang, id, part).href);
    }
    for (const phase of ['learn', 'code', 'reflect']) for (const mode of ['map', 'exercise']) check('withLabQuery', old.syncLocation(href, mode, id, phase), g.withLabQuery(new URL(href), mode, id, phase).href);
  }
  for (const lang of ['rust', 'go']) {
    check('withWorkshopQuery(null)', old.locationForSelection(href, lang, null, 'explore'), g.withWorkshopQuery(new URL(href), lang, null, 'explore').href);
    for (const view of ['recorrido', 'campana', 'sistemas', 'atlas', 'laboratorio', 'biblioteca', 'proyecto', 'metodo']) check('withLanguageQuery', old.languageSwitch(href, view, lang), g.withLanguageQuery(new URL(href), view, lang).href);
  }
}
for (const search of searches) {
  const p = new URLSearchParams(search), link = g.readLinkQuery(search);
  check('hasSistema', p.has('sistema'), link.missionWorkshop !== null);
  for (const [name, field] of [['ejercicio', 'exercise'], ['campana', 'missionWorld'], ['sistema', 'missionWorkshop'], ['mundo', 'world'], ['lenguaje', 'language'], ['taller', 'workshop']])
    check(name, p.get(name), link[field]);
  check('phase', old.labPhase(search), g.exercisePhaseOr(link.phase, 'learn'));
  check('part', old.systemsPart(search), g.workshopPartOr(link.part, 'explore'));
}
for (const hash of hashes) check('viewFromHash', old.currentView(hash), g.viewFromHash(hash));
console.log(JSON.stringify({ compared, different }));
for (const d of diffs) console.log(d);
```

**(b) Los adaptadores.** Carga `campaign.js` y `systems.js` con sus motores reales en cada raíz, como `lab-bridge-check`, y compara sus respuestas para todos los mundos, talleres y ejercicios, los dos lenguajes, los parámetros presentes y vacíos y dos estados del laboratorio. Esperado: `compared` 55 880 y `different` 0, en unos 4 segundos.

```ts
// node compare-bridges.ts <raíz base> <raíz de la unidad>
import fs from 'node:fs';
import vm from 'node:vm';

const [baseRoot, unitRoot] = process.argv.slice(2);
const master = JSON.parse(fs.readFileSync(`${baseRoot}/qa/fixtures/progress-master-2a278ad-storage.json`, 'utf8'));
const labStates = { empty: { records: {} }, master: JSON.parse(master['taller-laboratorio-v1']) };
const LAB_GLOBALS = ['RUST_LAB', 'RUST_QUESTS', 'GO_LAB', 'GO_QUESTS', 'SYSTEMS_PC_LABS', 'SYSTEMS_LOWLEVEL_LABS', 'SYSTEMS_INFRA_LABS', 'SYSTEMS_PLAY_LABS'];

async function bridges(root: string, kind: 'campaign' | 'systems', search: string, labState: unknown) {
  const lib = await import(`${root}/qa/lib/legacy-sources.ts`);
  const storage = new Map<string, string>();
  const context: Record<string, unknown> = {
    URL, URLSearchParams,
    localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, String(v)), removeItem: (k: string) => void storage.delete(k) },
    location: { search, hash: '', href: `http://taller.test/${search}` },
    history: { replaceState: () => undefined },
  };
  context.window = context;
  vm.createContext(context);
  lib.loadLabCatalogs(context);
  const exercises = LAB_GLOBALS.flatMap((name) => context[name] as { id: string }[]);
  context.TallerLab = { getExercises: () => exercises, exportState: () => labState };
  if (kind === 'campaign') { lib.loadCampaignWorlds(context); lib.loadCampaignEngine(context); lib.loadCampaignUi(context); }
  else { lib.loadSystemsEngine(context); lib.loadSystemsUi(context); }
  const api = (kind === 'campaign' ? context.TallerCampaign : context.TallerSystems) as Record<string, (...args: unknown[]) => unknown>;
  api.init();
  return { api, exercises, context };
}

const worlds = ['rust-world-1', 'rust-world-2', 'rust-world-3', 'rust-world-4', 'go-world-1', 'go-world-2', 'go-world-3', 'go-world-4', 'no-existe'];
const hostile = ['mundo raro/1', 'a b', "!'()*~", ''];
let compared = 0, different = 0;
const samples: string[] = [];
const check = (label: string, a: unknown, b: unknown) => { compared++; const [x, y] = [JSON.stringify(a), JSON.stringify(b)]; if (x !== y) { different++; if (samples.length < 8) samples.push(`${label}: ${x} ≠ ${y}`); } };

for (const [stateName, labState] of Object.entries(labStates)) {
  for (const search of ['', '?campana=', ...worlds.map((w) => `?campana=${w}`)]) {
    const a = await bridges(baseRoot, 'campaign', search, labState), b = await bridges(unitRoot, 'campaign', search, labState);
    const ids = [...a.exercises.map((e) => e.id), 'nope'];
    for (const id of ids) for (const lang of ['rust', 'go']) {
      check(`context ${stateName} ${search} ${id} ${lang}`, a.api.exerciseContextHTML(id, lang), b.api.exerciseContextHTML(id, lang));
      check(`lock ${stateName} ${search} ${id} ${lang}`, a.api.lockedExerciseHTML(id, lang), b.api.lockedExerciseHTML(id, lang));
    }
    for (const id of [...worlds, ...hostile]) check(`returnURL ${id}`, a.api.returnURL(id), b.api.returnURL(id));
  }
  const workshopIds = ['cache', 'heap', 'mmu', 'pc', 'minimax', 'wal', 'raster', 'no-existe'];
  const allWorkshops = (await bridges(baseRoot, 'systems', '', labState)).context;
  const workshopList = ['SYSTEMS_PC', 'SYSTEMS_LOWLEVEL', 'SYSTEMS_INFRA', 'SYSTEMS_PLAY'].flatMap((n) => (allWorkshops[n] as { workshops: { id: string }[] }).workshops.map((w) => w.id));
  for (const search of ['', '?sistema=', ...[...workshopList, 'no-existe'].map((w) => `?sistema=${w}`)]) {
    const a = await bridges(baseRoot, 'systems', search, labState), b = await bridges(unitRoot, 'systems', search, labState);
    const ids = [...a.exercises.map((e) => e.id), 'nope'];
    for (const id of ids) for (const lang of ['rust', 'go']) check(`systems context ${stateName} ${search} ${id} ${lang}`, a.api.exerciseContextHTML(id, lang), b.api.exerciseContextHTML(id, lang));
    if (search === '') {
      for (const w of [...workshopList, ...workshopIds, ...hostile]) for (const lang of ['rust', 'go', 'otro', undefined]) {
        check(`missionIDs ${w} ${lang}`, a.api.missionIDs(w, lang), b.api.missionIDs(w, lang));
        check(`returnURL ${w} ${lang}`, lang === undefined ? a.api.returnURL(w) : a.api.returnURL(w, lang), lang === undefined ? b.api.returnURL(w) : b.api.returnURL(w, lang));
      }
      check('missionIDs()', a.api.missionIDs(), b.api.missionIDs());
    }
  }
}
console.log(JSON.stringify({ compared, different }));
for (const s of samples) console.log(s);
```

### 3.3 Unidad 7: la fixture y los exploradores

**La fixture (T028).** Se genera una vez, desde la raíz del commit base, y se commitea. Esperado: 274 ids; 21 `channel`, 20 `generic`, 20 `pointer`, 6 `robot`, 6 `packet` y 201 `null`. La salida ya cumple Prettier.

```sh
node explorer-kinds-fixture.cjs "$TMPDIR/f2b-base" "$(git rev-parse <base>)" > qa/fixtures/explorer-kinds-<base>.json
npx prettier --check qa/fixtures/explorer-kinds-<base>.json
```

```js
// node explorer-kinds-fixture.cjs <raíz del commit base> <hash completo del commit base>
const [root, commit] = process.argv.slice(2);
const c = require(`${root}/build/curriculum.json`);
const groups = [c.lab.rust, c.quests.rust, c.lab.go, c.quests.go, c.cores.lowlevel, c.cores.infra, c.cores.play, c.cores.pc];
// The two regular expressions of the base commit, copied from lab-explorers.js:kind and quest-explorers.js:descriptor.
function labKind(item) {
  const topic = (item.topic + ' ' + item.title + ' ' + item.visual).toLowerCase();
  if (/goroutine|concurren|canal|threads|mutex|worker|waitgroup|atomic|sync\./.test(topic)) return 'channel';
  if (/generic|genéric|constraint|dispatch|trait|asociado/.test(topic)) return 'generic';
  if (/puntero|pointer|box|refcell|\brc\b|\bweak\b|\bunsafe\b/.test(topic)) return 'pointer';
  return '';
}
function questMode(item) {
  const match = /^(rust|go)-(10[1-6])$/.exec(item?.id || '');
  return match ? (Number(match[2]) < 104 ? 'robot' : 'packet') : null;
}
const kinds = {};
for (const item of groups.flat()) {
  const quest = questMode(item), lab = labKind(item);
  if (quest && lab) throw new Error(`${item.id} has two explorers`);
  kinds[item.id] = quest ?? (lab || null);
}
process.stdout.write(JSON.stringify({ commit, kinds }, null, 2) + '\n');
```

**La comparación.** Dibuja los dos exploradores para los 274 ejercicios y, en los 73 que tienen uno, aplica una traza de operaciones y compara el HTML, la región viva y el foco después de cada paso. Esperado: `compared` 2 214 y `different` 0. La clasificación del mapa contra la fixture la prueba `explorer-kinds.spec.ts`.

```ts
// node compare-explorers.ts <raíz base> <raíz de la unidad>
import fs from 'node:fs';
import vm from 'node:vm';
const [baseRoot, unitRoot] = process.argv.slice(2);
const curriculum = JSON.parse(fs.readFileSync(`${baseRoot}/build/curriculum.json`, 'utf8'));
const items = [curriculum.lab.rust, curriculum.quests.rust, curriculum.lab.go, curriculum.quests.go, curriculum.cores.lowlevel, curriculum.cores.infra, curriculum.cores.play, curriculum.cores.pc].flat();

async function load(root: string) {
  const { runSource } = await import(`${root}/qa/lib/sources.ts`);
  const context = vm.createContext({ window: {} as Record<string, unknown> });
  runSource(context, 'frontend/lab-explorers.js');
  runSource(context, 'frontend/quest-explorers.js');
  const w = (context as { window: Record<string, any> }).window;
  return { lab: w.TallerExplorers, quest: w.TallerQuestExplorers };
}
function labHost() {
  const special = { innerHTML: '' };
  let focused = '';
  return { special, get focused() { return focused; }, querySelector(selector: string) {
    if (selector === '#lab-special-explorer') return special;
    const m = /\[data-(operation|explorer)="([^"]+)"\]/.exec(selector);
    return m ? { disabled: new RegExp(`data-operation="${m[2]}" disabled`).test(special.innerHTML), focus() { focused = m[2]; } } : null;
  } };
}
function questPanel(id: string, html: string) {
  const view = { innerHTML: html }, live = { textContent: '' };
  let focused = '';
  const panel = { dataset: { questExplorer: id }, querySelector(s: string) { if (s === '[data-q-view]') return view; if (s === '[data-q-status]') return live; return null; },
    querySelectorAll() { return [...view.innerHTML.matchAll(/<button[^>]*data-quest-op="([^"]+)"([^>]*)>/g)].map((m) => ({ dataset: { questOp: m[1] }, disabled: /\bdisabled\b/.test(m[2]), focus() { focused = m[1]; } })); } };
  return { panel, view, live, get focused() { return focused; } };
}
const LAB_OPS = ['send', 'receive', 'capacity-2', 'send', 'send', 'send', 'receive', 'receive', 'pointer-copy', 'pointer-ref', 'reset', 'receive', 'send', 'capacity-0', 'send', 'receive'];
const CHOICES: [string, string][] = [['constraint', 'comparable'], ['type', 'record'], ['constraint', 'display'], ['type', 'string'], ['constraint', 'ordered'], ['type', 'record']];
const QUEST_OPS = ['move-O', 'move-N', 'move-N', 'move-E', 'move-E', 'move-S', 'predict-0', 'predict-1', 'battery-2', 'move-N', 'move-N', 'move-N', 'battery-6', 'bit-7', 'bit-4', 'bit-0', 'size-0', 'corrupt', 'size-260', 'size-6', 'corrupt', 'bad-length', 'reverse-endian', 'bad-length', 'packet-reset', 'predict-2', 'nope'];

async function trace(root: string) {
  const { lab, quest } = await load(root);
  const out: string[] = [];
  for (const item of items) { out.push(`${item.id} lab ${lab.render(item)}`); out.push(`${item.id} quest ${quest.render(item)}`); }
  for (const item of items) {
    if (lab.render(item)) {
      lab.reset(); const host = labHost(); host.special.innerHTML = lab.render(item);
      for (const op of LAB_OPS) { lab.act({ dataset: { operation: op } }, item, host); out.push(`${item.id} ${op} ${host.special.innerHTML} ${host.focused}`); }
      for (const [field, value] of CHOICES) { lab.change({ dataset: { explorer: field }, value }, item, host); out.push(`${item.id} ${field}=${value} ${host.special.innerHTML} ${host.focused}`); }
    }
    const html = quest.render(item);
    if (html) {
      quest.reset(); const p = questPanel(item.id, quest.render(item));
      for (const op of QUEST_OPS) { quest.act({ dataset: { questOp: op }, closest: () => p.panel }, item, null); out.push(`${item.id} ${op} ${p.view.innerHTML} ${p.live.textContent} ${p.focused}`); }
    }
  }
  return out;
}
const [a, b] = [await trace(baseRoot), await trace(unitRoot)];
let different = 0; const samples: string[] = [];
for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { different++; if (samples.length < 3) samples.push(`${(a[i] ?? '').slice(0, 160)}\n≠ ${(b[i] ?? '').slice(0, 160)}`); }
console.log(JSON.stringify({ items: items.length, compared: a.length, different }));
for (const s of samples) console.log(s);
```

### 3.4 Unidad 6: exportar, importar y «Borrar todo» con los adaptadores reales

No corrió al planificar. Se arma como la comparación de las unidades 1 y 3 de F2a (quickstart.md, §3): se copia de `qa/boot-check.ts` todo lo que hay antes de `let passed = 0;` (el DOM falso y `createBootHarness`), y se arma un `driver` por raíz que evalúa `bundleApp('frontend/src/app/main.tsx')` y hace `await harness.flush()`.

1. **Cuatro casos:** el almacenamiento con las cuatro claves de `qa/fixtures/progress-master-2a278ad-storage.json`; el almacenamiento vacío; el vacío con `progress-master-2a278ad-export.json` importado; y el vacío con `progress-d0e1b49-export.json` importado. Las importaciones se hacen como el escenario «importación» de `boot-check`.
2. **En cada caso se capturan:**
   - el JSON de «Exportar progreso», sin `exportedAt`, con un `URL.createObjectURL` que guarde el `Blob`;
   - el almacenamiento completo;
   - el texto de `#toast`.
3. **Después, «Borrar todo»:** se despacha el clic en `#confirm-reset`, se espera, y se capturan el almacenamiento, `#toast` y el orden de las llamadas a `TallerLab.reset`, a los `reset` de los dos motores y a `TallerSystems.resetSimulations`, con espías como los de `boot-check`.
4. **Se compara** cada captura entre las dos raíces.

Esperado: 4 casos × 6 capturas = 24 pares iguales.

## 4. Las pruebas de que las pruebas detectan algo

Cada una se hace en una copia de trabajo y se deshace con `git checkout -- <archivo>`; ninguna se commitea.

| Tarea | Rotura | Falla |
| --- | --- | --- |
| T021 | las reglas movidas al principio de `styles.css` | el barrido (§3.1 c) |
| T023 | quitar `exercise/explorers` de `STATELESS_ENTRIES` | el escenario de `quest-explorers.js` que importa la entrada |
| T024 y T025 | escribir `withWorldQuery` con `encodeURIComponent` | la spec de la codificación de la gramática |
| T024 y T025 | `workshopMissionIds` sin `Set` | «un `related` que repite el núcleo no lo repite» |
| T024 y T025 | `bridge.ts` que reexporta `campaignEngine` | `entities/campaign/bridge.spec.ts` |
| T029 y T030 | el mapa con un objeto literal en lugar de un `Map` | `explorerKindOf('constructor')` en `explorer-kinds.spec.ts` |
| T029 y T030 | una entrada del mapa cambiada (`go-61` como `generic`) | la comparación contra la fixture |
| T030 | `applyLabExplorerOperation` que muta el estado recibido | «ninguna función muta el estado que recibe» |
| T033 y T034 | `resetAll` con `Promise.all` | «cada `reset` empieza cuando el anterior resolvió» (el registro de inicios y fines de las áreas asíncronas) |
| T033 y T034 | `applyImport` que sincroniza los sellos antes de aplicar | el orden de las llamadas de la spec |
| T036 | el `reset` de un motor sin `async` y `await` | el gemelo «an engine that resolves { removed: false }» |
| T034 y T036 | correr los `sessionResets` antes de los `reset` de las áreas | la spec del orden de «Borrar todo» y `boot-check`, «borrar todo» (`TallerSystems.resetSimulations` antes que los motores) |

## 5. El cierre (T038)

Con las cuatro unidades en `master`:

- **Los bytes:** los de §2, acumulados contra T020: el `<style>` cambió sólo en la unidad 8, y el script, en las otras tres.
- **El tamaño:** la medida final del HTML, que tiene que ser como mucho la base más 8 000.
- **Dependencias:** `git diff <base> -- package.json package-lock.json` vacío.
- **Checks y avisos:** `node qa/seams-guard-check.ts` en verde, con R6, y `npm run lint` con 35 avisos.
- **Las entradas sin estado:** `grep -rn "entities/[a-z-]*/model/" frontend/*.js frontend/src/app` no imprime nada.
