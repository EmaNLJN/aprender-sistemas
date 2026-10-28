# Quickstart: F7b · Cómo se verifica la vista del laboratorio

**Plan**: [plan-f7b.md](./plan-f7b.md) · **Decisiones**: [research-f7b.md](./research-f7b.md) · **Spec**: [spec.md](./spec.md)

Los comandos corren desde la raíz del worktree, en Linux o macOS. Los scripts de §3 corren fuera del repositorio, sobre dos raíces: la base y la rama de F7b.

## 1. La línea base (T018)

```sh
git log --oneline -15                          # F7a, F5 y F6 en master
node -e "require.resolve('jsdom')" && grep -n "jsdom" frontend/vitest.config.ts   # el arnés
grep -c "createPlaygroundTransport\|buildPlaygroundProgram" frontend/lab.js        # 2: rama A; 0: rama B
grep -n "exerciseContextHTML\|missionIDs\|returnURL" frontend/src/app/legacy/register-systems.tsx frontend/src/app/legacy/campaign-bridges.ts
npm ci --offline --no-audit --no-fund
npm run build && npm test && npm run lint && npm run format:check
E2E_PORT=4173 npm run test:e2e
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
npx eslint frontend/lab.js frontend/lab-explorers.js frontend/quest-explorers.js | grep -c complexity
node qa/lab-state-check.ts | tail -1
```

Lo que se anota, con lo que midió el prototipo:

| Qué | En la base del prototipo (F7a) | Después de F7b |
| --- | --- | --- |
| Avisos de `npm run lint` | 32 (13 de los tres archivos) | 19 |
| E2E | 184 | 193 |
| Checks y Vitest | 39 checks; 40 archivos y 843 pruebas | 37 checks; 45 archivos y 878 pruebas (más las 9 specs de componente, que no corrieron) |
| `lab-state-check` | 39 | 33 |
| `html.length` | 1 144 712 | 1 160 299 |

**El aporte de cada parte al paquete** (R12), con el script de §3.2 sobre cada raíz.

## 2. El retiro (T027 y T030)

Cada comando no imprime nada:

```sh
git ls-files frontend | grep -E "^frontend/(lab|lab-explorers|quest-explorers)\.(js|css)$"
git grep -nE "lab\.js|lab-explorers|quest-explorers\.js|register-editor|mount-code-editor" -- frontend qa ':!qa/e2e/specs'
git grep -nE "TallerExplorers|TallerQuestExplorers|TallerEditor|TallerRunner" -- frontend qa
git grep -nE "exerciseContextHTML|lockedExerciseHTML|missionIDs" -- frontend qa
git grep -nE "campaign-bridges|lab-bridge-check|quest-explorers-check" -- frontend qa
git diff <base> -- frontend/src qa | grep -E "^\+.*(style=|setAttribute\(.style.|\.cssText|style=\{)"
git diff <base> --stat -- qa/e2e/specs qa/e2e/fixtures qa/e2e/lib   # sólo los dos archivos nuevos
```

Y `window.TallerLab` publica diez métodos: lo verifica `boot-check` («adaptadores: cada window.Taller* real publica los métodos que consume app.js») contra `qa/lib/app-adapters.ts`.

## 3. Las comparaciones únicas (T028)

**Las dos raíces.** Un worktree de la base y la rama de F7b, cada una con su `npm ci --offline` y su `npm run build`. Los puertos 4501 y 4502 tienen que estar libres (`ss -ltn | grep -E ':450[12]\b'` no imprime nada).

```sh
git worktree add ../f7b-base <base>
(cd ../f7b-base && npm ci --offline --no-audit --no-fund && npm run build)
npm run build
node lab-parity.mjs ../f7b-base . dom          # 32 estados; esperado: 0 diferencias
node lab-parity.mjs ../f7b-base . explorers    # 73 trazas y 177 pasos; esperado: 0
node lab-parity.mjs ../f7b-base . style        # 384 capturas, unos 40 minutos; esperado: 0
```

`STATES=map,code` y `WIDTHS=1200` acotan una corrida. `SAMPLES=60` muestra más diferencias.

### 3.1 El script de las comparaciones

**Qué normaliza, y por qué** (la lista de FR-064):

- **En el legacy:** saca `#lab-line-numbers` y `#lab-code` (D2) antes de medir.
- **En el DOM:**
  - ignora los atributos `data-*`, `style`, `value` y `selected`;
  - compara las clases como un conjunto, sin `lab-reasoning`;
  - une los nodos de texto vecinos y colapsa los espacios;
  - el editor cuenta como un solo nodo.
- **En el estilo:** compara cada propiedad computada y la caja de cada elemento. No compara el tamaño de lo que está dentro de un `details` cerrado: no se dibuja, y Chrome devuelve un tamaño que depende de si alguna vez se midió.
- **En los exploradores:** compara el texto dibujado (`innerText`), la región viva y el elemento con el foco.

```js
// node lab-parity.mjs <legacy root> <page root> [dom|style|explorers]; WIDTHS=… and STATES=a,b narrow a run.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [legacyRoot, pageRoot, mode = 'dom'] = process.argv.slice(2);
const require = createRequire(pageRoot + '/package.json');
const { chromium } = require('@playwright/test');
const FROZEN = readFileSync(pageRoot + '/qa/fixtures/progress-master-2a278ad-storage.json', 'utf8');
const KINDS = JSON.parse(
  readFileSync(pageRoot + '/qa/fixtures/explorer-kinds-a179d03.json', 'utf8'),
);

function serve(root, port) {
  return spawn(
    root + '/node_modules/.bin/vite',
    [
      'preview',
      '--config',
      'frontend/vite.config.ts',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    { cwd: root, stdio: 'ignore' },
  );
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start: ' + url);
}

const ex = (id, phase, query = '') => `/?${query}ejercicio=${id}&paso=${phase}#laboratorio`;
const ALL_STATES = [
  ['map', '/#laboratorio'],
  ['map-go', ex('go-01', 'learn'), [['click', 'role=button[name="← Volver al mapa"]']]],
  ['map-frozen', '/#laboratorio', null, null, true],
  ['map-empty', '/#laboratorio', [['fill', '#lab-search', 'zzzz']]],
  ['map-search', '/#laboratorio', [['fill', '#lab-search', 'memoria']]],
  ['map-due', '/#laboratorio', [['click', 'role=button[name=/^Repasar pendientes/]']], null, true],
  ['learn', ex('rust-01', 'learn')],
  ['code', ex('rust-01', 'code')],
  ['reflect', ex('rust-01', 'reflect')],
  ['learn-predicted', ex('rust-02', 'learn'), null, null, true],
  ['code-passed', ex('rust-02', 'code'), null, null, true],
  ['code-failed', ex('rust-09', 'code'), null, null, true],
  ['reflect-solved', ex('rust-02', 'reflect'), null, null, true],
  ['code-go', ex('go-01', 'code')],
  ['mission', ex('rust-02', 'learn', 'campana=rust-world-1&')],
  ['mission-code', ex('rust-02', 'code', 'campana=rust-world-1&')],
  ['lock', ex('rust-103', 'learn', 'campana=rust-world-1&')],
  ['core', ex('rust-113', 'code', 'sistema=cache&')],
  ['tool', ex('rust-31', 'reflect', 'sistema=cache&')],
  [
    'hints',
    ex('rust-01', 'code'),
    [
      ['click', 'role=button[name="Dame una pista"]'],
      ['click', 'role=button[name="Otra pista"]'],
    ],
  ],
  ['dialog', ex('rust-01', 'code'), [['click', 'role=button[name="Restaurar inicio ↺"]']]],
  ['robot', ex('rust-103', 'learn')],
  ['packet-rust', ex('rust-106', 'learn')],
  ['packet-go', ex('go-106', 'learn')],
  ['channel', ex('rust-46', 'learn')],
  ['generic', ex('rust-36', 'learn')],
  ['pointer', ex('rust-51', 'learn')],
  ['ownership', ex('rust-05', 'learn')],
  ['slices', ex('go-11', 'learn')],
  ['flow', ex('rust-01', 'learn')],
  ['campaign-view', '/#campana'],
  ['systems-view', '/?lenguaje=rust&taller=cache&parte=build#sistemas'],
];
const STATES = process.env.STATES
  ? ALL_STATES.filter(([n]) => process.env.STATES.split(',').includes(n))
  : ALL_STATES;
const WIDTHS = (process.env.WIDTHS ?? '1200,981,850,700,650,590').split(',').map(Number);

// Listed differences (FR-064): the retired fallback editor nodes and the delegation attributes.
function normalizeLegacy() {
  document.querySelectorAll('#lab-line-numbers, #lab-code').forEach((node) => node.remove());
}

function serializeDom() {
  const LISTED_CLASSES = ['lab-reasoning'];
  const SKIP = (name) =>
    name.startsWith('data-') || name === 'style' || name === 'value' || name === 'selected';
  const children = (node) => {
    const out = [];
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (typeof out.at(-1) === 'object') out.at(-1).text += child.textContent;
        else out.push({ text: child.textContent });
      } else out.push(...walk(child));
    }
    return out
      .map((item) =>
        typeof item === 'object' ? 'T:' + item.text.replace(/\s+/g, ' ').trim() : item,
      )
      .filter((item) => item !== 'T:');
  };
  const walk = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    if (node.classList.contains('cm-editor')) return ['<cm-editor>'];
    const attrs = [...node.attributes]
      .filter((a) => !SKIP(a.name))
      .map((a) =>
        a.name === 'class'
          ? 'class=' +
            [...node.classList]
              .filter((c) => !LISTED_CLASSES.includes(c))
              .sort()
              .join(' ')
          : a.name + '=' + a.value,
      )
      .filter((a) => a !== 'class=')
      .sort();
    return [`<${node.localName} ${attrs.join(' ')}>`, ...children(node), `</${node.localName}>`];
  };
  const dialog = document.getElementById('lab-confirm-dialog');
  return [...walk(document.getElementById('main')), ...(dialog?.open ? walk(dialog) : [])];
}

function styleSnapshot() {
  const out = {};
  const keyOf = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const classes = (c) =>
        [...c.classList]
          .filter((name) => name !== 'lab-reasoning')
          .sort()
          .join('.');
      const same = [...n.parentElement.children].filter(
        (c) => c.localName === n.localName && c.id === n.id && classes(c) === classes(n),
      );
      parts.unshift(`${n.localName}#${n.id}.${classes(n)}:${same.indexOf(n)}`);
    }
    return parts.join('/');
  };
  for (const el of [document.documentElement, ...document.querySelectorAll('*')]) {
    if (el.closest('.cm-editor') && !el.classList.contains('cm-editor')) continue;
    const cs = getComputedStyle(el);
    const props = {};
    for (let i = 0; i < cs.length; i++) props[cs[i]] = cs.getPropertyValue(cs[i]);
    if (el.closest('details:not([open]) > :not(summary)')) {
      for (const name of [
        'block-size',
        'height',
        'inline-size',
        'width',
        'perspective-origin',
        'transform-origin',
      ])
        delete props[name];
    }
    const r = el.getBoundingClientRect();
    props['@rect'] = [r.x, r.y, r.width, r.height].map(Math.round).join(',');
    out[keyOf(el)] = props;
  }
  return out;
}

async function open(browser, origin, [, path, actions, language, frozen], width, motion, legacy) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: motion,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  });
  await context.addInitScript(
    ([frozenText, lang]) => {
      localStorage.clear();
      if (frozenText)
        localStorage.setItem(
          'taller-laboratorio-v1',
          JSON.parse(frozenText)['taller-laboratorio-v1'],
        );
      if (lang)
        localStorage.setItem('taller-learning-v1', JSON.stringify({ version: 1, language: lang }));
    },
    [frozen ? FROZEN : null, language],
  );
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-06T12:00:00Z'));
  await page.goto(origin + path);
  await page.waitForFunction(() => document.querySelector('#main')?.children.length > 0);
  for (const [kind, selector, value] of actions ?? []) {
    if (kind === 'fill') await page.fill(selector, value);
    else await page.locator(selector).first().click();
  }
  await page.waitForTimeout(50);
  if (legacy) await page.evaluate(normalizeLegacy);
  return { context, page };
}

async function compareStates(browser) {
  let compared = 0,
    differences = 0;
  const samples = [];
  const widths = mode === 'style' ? WIDTHS : [1200];
  const motions = mode === 'style' ? ['no-preference', 'reduce'] : ['no-preference'];
  for (const state of STATES)
    for (const width of widths)
      for (const motion of motions) {
        const a = await open(browser, 'http://127.0.0.1:4501', state, width, motion, true);
        const b = await open(browser, 'http://127.0.0.1:4502', state, width, motion, false);
        const ea = await a.page.evaluate(mode === 'style' ? styleSnapshot : serializeDom);
        const eb = await b.page.evaluate(mode === 'style' ? styleSnapshot : serializeDom);
        await a.context.close();
        await b.context.close();
        compared++;
        if (mode === 'style') {
          for (const key of new Set([...Object.keys(ea), ...Object.keys(eb)])) {
            const pa = ea[key] ?? {},
              pb = eb[key] ?? {};
            for (const prop of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
              if (pa[prop] !== pb[prop]) {
                differences++;
                const tail = key.split('/').slice(-3).join('/');
                const sample = [state[0], tail, prop, pa[prop], pb[prop]].join(' | ');
                if (
                  !samples.includes(sample) &&
                  samples.length < (Number(process.env.SAMPLES) || 25)
                )
                  samples.push(sample);
              }
            }
          }
        } else {
          const length = Math.max(ea.length, eb.length);
          for (let i = 0; i < length; i++)
            if (ea[i] !== eb[i]) {
              differences++;
              if (samples.length < 25) samples.push([state[0], i, ea[i], eb[i]].join(' | '));
              break;
            }
        }
      }
  return { compared, differences, samples };
}

async function compareExplorers(browser) {
  const ids = Object.entries(KINDS.kinds)
    .filter(([, kind]) => kind)
    .map(([id]) => id);
  let traces = 0,
    steps = 0,
    differences = 0;
  const samples = [];
  const trace = async (origin, id, legacy) => {
    const { context, page } = await open(
      browser,
      origin,
      [id, ex(id, 'learn')],
      1200,
      'no-preference',
      legacy,
    );
    const out = [];
    const region = '.quest-explorer, #lab-special-explorer';
    const count = await page.locator(`${region} button:not([disabled])`).count();
    for (let i = 0; i < Math.min(count, 12); i++) {
      const button = page.locator(`${region} button`).nth(i);
      if (await button.isDisabled()) continue;
      await button.click();
      await page.waitForTimeout(10);
      out.push(
        await page.evaluate((selector) => {
          const host = document.querySelector(selector);
          const live = host.querySelector('[role="status"]');
          const focused = document.activeElement;
          const text = (n) => n.innerText.replace(/\s+/g, ' ').trim();
          return [
            text(host),
            live ? text(live) : '',
            focused?.tagName +
              ':' +
              (focused ? text(focused) : '') +
              ':' +
              (focused?.getAttribute('aria-label') ?? ''),
          ].join(' ¦ ');
        }, region),
      );
    }
    await context.close();
    return out;
  };
  for (const id of ids) {
    const a = await trace('http://127.0.0.1:4501', id, true);
    const b = await trace('http://127.0.0.1:4502', id, false);
    traces++;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      steps++;
      if (a[i] !== b[i]) {
        differences++;
        const at = [...(a[i] ?? '')].findIndex((c, k) => c !== (b[i] ?? '')[k]);
        if (samples.length < 10)
          samples.push(
            [
              id,
              i,
              (a[i] ?? '').slice(Math.max(0, at - 60), at + 60),
              (b[i] ?? '').slice(Math.max(0, at - 60), at + 60),
            ].join('\n  '),
          );
      }
    }
  }
  return { traces, steps, differences, samples };
}

const legacy = serve(legacyRoot, 4501),
  page = serve(pageRoot, 4502);
try {
  await waitFor('http://127.0.0.1:4501/');
  await waitFor('http://127.0.0.1:4502/');
  const browser = await chromium.launch();
  const result =
    mode === 'explorers' ? await compareExplorers(browser) : await compareStates(browser);
  await browser.close();
  console.log(JSON.stringify({ mode, ...result, samples: undefined }));
  for (const s of result.samples) console.log(s);
} finally {
  legacy.kill();
  page.kill();
}
```

### 3.2 El aporte de cada parte al paquete (R12)

```sh
node contribution.mjs ../f7b-base   # legacy lab views: 66 773 bytes en el prototipo
node contribution.mjs .             # pages/lab: 82 539; lab adapter: 1 971
```

```js
// node contribution.mjs <root>: bytes each source adds to a minified bundle of main.tsx (esbuild metafile).
import { createRequire } from 'node:module';
const [root] = process.argv.slice(2);
const require = createRequire(root + '/package.json');
const esbuild = require('esbuild');
const result = await esbuild.build({
  entryPoints: [root + '/frontend/src/app/main.tsx'],
  bundle: true,
  minify: true,
  write: false,
  metafile: true,
  format: 'esm',
  target: 'es2020',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  absWorkingDir: root,
  define: { 'process.env.NODE_ENV': '"production"', __CONTENT_VERSION__: '"x"' },
  logLevel: 'silent',
});
const output = Object.values(result.metafile.outputs)[0];
const groups = {};
for (const [path, { bytesInOutput }] of Object.entries(output.inputs)) {
  const group = /frontend\/(lab|lab-explorers|quest-explorers)\.js$/.test(path)
    ? 'legacy lab views'
    : /app\/legacy\/register-editor\.ts$/.test(path)
      ? 'legacy lab views'
      : /pages\/lab\//.test(path)
        ? 'pages/lab'
        : /app\/legacy\/(register-lab\.tsx|lab-api\.ts)$/.test(path)
          ? 'lab adapter'
          : /shared\/ui\/code-editor\//.test(path)
            ? 'code-editor module'
            : /features\/run-exercise\//.test(path)
              ? 'features/run-exercise'
              : /node_modules\/(@codemirror|codemirror|@lezer|style-mod|w3c-keyname|crelt|@marijn|find-cluster-break)/.test(
                    path,
                  )
                ? 'CodeMirror'
                : /node_modules\/(react|react-dom|scheduler)\//.test(path)
                  ? 'React'
                  : /frontend\/(campaign|systems)\.js$/.test(path)
                    ? 'campaign.js + systems.js'
                    : 'rest';
  groups[group] = (groups[group] ?? 0) + bytesInOutput;
}
console.log(JSON.stringify({ total: output.bytes, ...groups }));
```

### 3.3 El control negativo (una vez, en una copia descartable)

En `frontend/src/pages/lab/ui/map/TopicGrid.tsx`, `` <span className="topic-fraction">{`${solvedTotal}/${total.length}`}</span> `` pasa a `{solvedTotal}/{total.length}`, partido en tres nodos. `npm run build` y `WIDTHS=1200 STATES=map node lab-parity.mjs ../f7b-base . style`: esperado, diferencias (784 en el prototipo). `STATES=map node lab-parity.mjs ../f7b-base . dom`: esperado, 0.

## 4. Las pruebas de que las pruebas detectan algo

Cada mutación se aplica sola, se corre su prueba y se revierte.

| Tarea | Mutación | Lo detecta | ¿Corrió al planificar? |
| --- | --- | --- | --- |
| T021 | `showExercise` crea el registro aunque haya bloqueo | `enter-lab.spec.ts`, «creates no record on the map nor behind a campaign lock» | Sí |
| T021 | `openLabSession` reinicia `level` al cambiar de idioma | `lab-session.spec.ts`, rareza 1 | Sí |
| T021 | `filterStatus` omite la búsqueda con `extraOnly` | `map-stats.spec.ts`, «names the extras after the search» | Sí |
| T024 | `writeField` de `CodePhase` sin `saveLab()` | `CodePhase.spec.tsx`, «writes each change of the editor…» | No (el arnés) |
| T024 | `ReflectPhase` sin `typedStatus` | `ReflectPhase.spec.tsx`, rareza 3 | No |
| T024 | `PredictionCard` sin `syncAfterPrediction` | `PredictionCard.spec.tsx`, el aviso de XP | No |
| T027 | `reset` de `lab-api.ts` sin `labRunner.abort()` | `lab-state-check`, «Reset during a run aborts it…» | Lo midió F7a sobre `lab.js`; el escenario es el mismo |
| T027 | `lab-api.ts` importa `campaignEngine` del índice | `lab-state-check` (el aislamiento) y `seams-guard-check` (R4) | Sí |
| T027 | `window.TallerLab` congelado | `boot-check`, dos escenarios | Sí |
| T027 | `replaceText` sin la anotación | E2E de F7a, «restoring the starter saves it once…» y «loading the solution asks first, saves once…» | Sí |
| T027 | el `select` genérico sin `select.focus()` | E2E de F7a, «generic (rust-36)…» | Sí |
| T028 | un texto partido en `.topic-fraction` | el barrido (§3.3) | Sí |

## 5. La compuerta final (T030)

```sh
npm ci --offline --no-audit --no-fund
npm run build
npm test
npm run lint                  # 0 errores; el total de T018 menos 13
npm run format:check
git diff --check
E2E_PORT=4173 npm run test:e2e   # todos, sin editar los de hoy
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"   # < 1 250 000 y ≤ T018 + 17 000
```

Más los `grep` de §2, las comparaciones de §3 y, con permiso, `docker compose build taller`. La comprobación con lector de pantalla (X2) la hace el usuario en la revisión del PR.
