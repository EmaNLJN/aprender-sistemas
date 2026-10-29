# Quickstart: F7b · Cómo se verifica la vista del laboratorio

**Plan**: [plan-f7b.md](./plan-f7b.md) · **Decisiones**: [research-f7b.md](./research-f7b.md) · **Spec**: [spec.md](./spec.md)

Los comandos corren desde la raíz del worktree, en Linux o macOS. Los scripts de §3 corren fuera del repositorio, sobre dos raíces: la base y la rama de F7b.

## 1. La línea base (T018)

```sh
git log --oneline -15                          # F7a, F5 y F6 en master, sobre 431c9d90 (F4, #67 y #76)
node -e "require.resolve('jsdom')" && grep -n "name: 'dom'" frontend/vitest.config.ts && test -f frontend/src/vitest.setup.ts   # el arnés de #67
grep -c "createPlaygroundTransport(" frontend/lab.js                              # 1 o más: rama A; 0: rama B
grep -n "exerciseContextHTML\|missionIDs\|returnURL" frontend/src/app/legacy/register-systems.tsx frontend/src/app/legacy/campaign-bridges.ts
grep -n "REACT_VIEWS" qa/boot-check.ts                                            # el conjunto de la base (TR-3)
grep -n "useStore needs a selector" eslint.config.ts                              # la guarda de F5 o F6 (TR-5)
grep -c "quest-direct-lock" frontend/lab.css                                      # 5: las reglas que mudó F6 (F7b-9)
grep -n "result: LabResultV1" frontend/src/entities/exercise/model/run-outcome.ts # con salida: A4 unificó las formas (F7b-4)
grep -n "BOOT_SIZE_LIMIT =" qa/build-check.ts                                     # 1500000
npm ci --offline --no-audit --no-fund
npm run build && npm test && npm run lint && npm run format:check
E2E_PORT=4173 npm run test:e2e
node -e "const html=require('fs').readFileSync('dist/index.html','utf8'); console.log(JSON.stringify({chars:html.length,dynamicImports:(html.match(/\bimport\(/g)||[]).length,importMeta:(html.match(/import\.meta/g)||[]).length}))"
npx eslint frontend/lab.js frontend/lab-explorers.js frontend/quest-explorers.js | grep -c complexity
node qa/lab-state-check.ts | tail -1
```

Lo que se anota, con lo que midió el prototipo:

| Qué | En la base del prototipo (F7a) | Después de F7b |
| --- | --- | --- |
| Avisos de `npm run lint` | 32 (13 de los tres archivos) | 19 |
| E2E | 184 (61 de F7a, según su plan) | 193 |
| Checks y Vitest | 39 checks; 40 archivos y 843 pruebas | 37 checks; 45 archivos y 878 pruebas (más las 9 specs de componente, que no corrieron) |
| `lab-state-check` | 39 | 33 |
| `html.length` | 1 144 712 | 1 160 218 |
| `importMeta` y `dynamicImports` | no se midieron | el de T018 menos 3, y 0 |

**En la base real** (R17), cada conteo se anota en T018 y se espera como delta: los E2E son 185 de F1, A2 y F7a (106, 17 y 62), más los de F4 (`project.spec.ts`), F5 y F6; después de F7b, N + 9. Los checks bajan 2, los escenarios de `lab-state-check` bajan 6 y los avisos, los 13 de los tres archivos.

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
git grep -n "quest-direct-lock" -- ':(glob)frontend/*.css' frontend/src/pages/campaign   # las reglas del bloqueo viajaron con lab.css (F7b-9)
```

Y `grep -c "quest-direct-lock" frontend/src/pages/lab/ui/lab.css` da lo que anotó T018 en `frontend/lab.css` (5).

Y `window.TallerLab` publica diez métodos: lo verifica `boot-check` («adaptadores: cada window.Taller* real publica los métodos que consume app.js») contra `qa/lib/app-adapters.ts`.

## 3. Las comparaciones únicas (T028)

**Las dos raíces.** Un worktree de la base y la rama de F7b, cada una con su `npm ci --offline` y su `npm run build`. Los puertos 4501 y 4502 tienen que estar libres (`ss -ltn | grep -E ':450[12]\b'` no imprime nada).

```sh
git worktree add ../f7b-base <base>
(cd ../f7b-base && npm ci --offline --no-audit --no-fund && npm run build)
npm run build
node lab-parity.mjs ../f7b-base . dom          # 39 estados; esperado: 0 diferencias
node lab-parity.mjs ../f7b-base . explorers    # 274 trazas y 720 pasos; esperado: 0
node lab-parity.mjs ../f7b-base . style        # 468 capturas, cerca de una hora; esperado: 0
node lab-parity.mjs ../f7b-base . writes       # 22 secuencias y 51 escrituras; esperado: 0 (SC-003)
node lab-parity.mjs ../f7b-base . exports      # 3 fixtures; esperado: 0 escrituras y la misma exportación (SC-012)
```

`STATES=map,code` y `WIDTHS=1200` acotan una corrida. `SAMPLES=60` muestra más diferencias.

### 3.1 El script de las comparaciones

**Qué normaliza, y por qué** (la lista de FR-064):

- **En el legacy:** saca `#lab-line-numbers` y `#lab-code` (D2) antes de medir.
- **En los dos lados:** después de las acciones, lleva el puntero fuera de la página (`page.mouse.move(-1, -1)`). React conserva el nodo bajo el puntero y su `:hover` persiste después de un clic, mientras que el legacy lo reemplazaba (TR-13 y R17).
- **En el DOM:**
  - ignora los atributos `data-*`, `style`, `value` y `selected`;
  - compara las clases como un conjunto, sin `lab-reasoning`;
  - une los nodos de texto vecinos y colapsa los espacios;
  - el editor cuenta como un solo nodo.
- **En el estilo:** compara cada propiedad computada y la caja de cada elemento, con dos excepciones:
  - el tamaño de lo que está dentro de un `details` cerrado: no se dibuja, y Chrome devuelve un tamaño que depende de si alguna vez se midió;
  - el `transform` y la caja de un elemento con una animación en curso, porque su fase depende del momento de la captura. Con movimiento reducido no hay animación, y se compara todo.
- **En los exploradores:** recorre los 274 ejercicios y anota cuál se dibuja (o ninguno). Compara el texto dibujado (`innerText`), la región viva y el elemento con el foco.
- **En las escrituras y la exportación:** reloj fijo (2026-10-06 12:00 UTC), `Math.random` fijo y el doble del compilador de `qa/e2e/lib/compiler-results.ts`. Envuelve `localStorage.setItem` y guarda cada escritura de la clave del laboratorio.

```js
// node lab-parity.mjs <legacy root> <page root> [dom|style|explorers]; WIDTHS=… and STATES=a,b narrow a run.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [legacyRoot, pageRoot, mode = 'dom'] = process.argv.slice(2);
const { PLAYGROUND_ENDPOINT, RUST_01, compilerReply } = await import(
  pageRoot + '/qa/e2e/lib/compiler-results.ts'
);
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
  [
    'review-running',
    ex('rust-01', 'code'),
    [
      ['compiler', 'hold'],
      ['click', '#lab-run'],
      ['wait', 100],
    ],
  ],
  [
    'review-transport',
    ex('rust-01', 'code'),
    [['compiler', 'transportError'], ['click', '#lab-run'], ['settle']],
  ],
  [
    'review-error',
    ex('rust-01', 'code'),
    [['compiler', 'compileError'], ['click', '#lab-run'], ['settle']],
  ],
  [
    'review-partial',
    ex('rust-01', 'code'),
    [['compiler', 'failedTest'], ['click', '#lab-run'], ['settle']],
  ],
  [
    'review-passed',
    ex('rust-01', 'code'),
    [['compiler', 'passed'], ['click', '#lab-run'], ['settle']],
  ],
  [
    'review-stale',
    ex('rust-01', 'code'),
    [['compiler', 'passed'], ['click', '#lab-run'], ['settle'], ['type', '.cm-content', 'x']],
  ],
  [
    'reflect-after-run',
    ex('rust-01', 'code'),
    [
      ['compiler', 'passed'],
      ['click', '#lab-run'],
      ['settle'],
      ['click', 'role=tab[name=/Explicá/]'],
    ],
  ],
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
    const animated = el.getAnimations().some((animation) => animation.playState === 'running');
    if (animated) delete props.transform;
    const r = el.getBoundingClientRect();
    if (!animated) props['@rect'] = [r.x, r.y, r.width, r.height].map(Math.round).join(',');
    out[keyOf(el)] = props;
  }
  return out;
}

async function act(page, [kind, target, value]) {
  if (kind === 'fill') await page.fill(target, value);
  else if (kind === 'type') {
    await page.locator(target).first().click();
    await page.keyboard.type(value);
  } else if (kind === 'press') await page.keyboard.press(target);
  else if (kind === 'compiler') {
    await page.route(PLAYGROUND_ENDPOINT.rust, async (route) => {
      if (target === 'hold') return;
      const reply = compilerReply(RUST_01, target);
      if (reply.kind === 'abort') await route.abort('failed');
      else await route.fulfill({ status: 200, contentType: 'application/json', json: reply.body });
    });
  } else if (kind === 'settle')
    await page.waitForFunction(() => !document.querySelector('#lab-run')?.disabled);
  else if (kind === 'wait') await page.waitForTimeout(target);
  else await page.locator(target).first().click();
}

async function open(browser, origin, [, path, actions, , seed], width, motion, legacy) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: motion,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  });
  const seedText = seed === true ? JSON.parse(FROZEN)['taller-laboratorio-v1'] : seed || null;
  await context.addInitScript((text) => {
    Math.random = () => 0.5;
    if (!sessionStorage.getItem('parity-seeded')) {
      localStorage.clear();
      if (text) localStorage.setItem('taller-laboratorio-v1', text);
      sessionStorage.setItem('parity-seeded', '1');
    }
    const writes = JSON.parse(sessionStorage.getItem('parity-writes') ?? '[]');
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === 'taller-laboratorio-v1') {
        writes.push(value);
        sessionStorage.setItem('parity-writes', JSON.stringify(writes));
      }
      return setItem.call(this, key, value);
    };
  }, seedText);
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-06T12:00:00Z'));
  await page.goto(origin + path);
  await page.waitForFunction(() => document.querySelector('#main')?.children.length > 0);
  for (const action of actions ?? []) await act(page, action);
  await page.mouse.move(-1, -1);
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

const RUN = (kind) => [['compiler', kind], ['click', '#lab-run'], ['settle']];
const SOLUTION = 'text=Ver una solución razonada';
const CONTINUE = 'role=button[name="Continuar"]';
const WRITE_ROWS = [
  [
    'browse-map',
    '/#laboratorio',
    [
      ['click', 'role=button[name=/^Inicial/]'],
      ['fill', '#lab-search', 'memoria'],
      ['click', 'role=button[name=/^Clásicos y sistemas/]'],
      ['click', 'role=button[name=/^Repasar pendientes|^Ver todos/]'],
    ],
  ],
  [
    'browse-exercise',
    ex('rust-01', 'learn'),
    [
      ['click', 'role=tab[name=/Experimentá/]'],
      ['click', 'role=tab[name=/Explicá/]'],
      ['click', 'role=tab[name=/Descubrí/]'],
      ['click', 'role=button[name="Siguiente paso →"]'],
      ['click', 'role=button[name=/^← Volver al/]'],
    ],
  ],
  ['open-node', '/#laboratorio', [['click', 'role=button[name="La energía del reactor"]']]],
  [
    'open-today',
    '/#laboratorio',
    [['click', 'role=button[name=/Entrar al laboratorio|Seguir aprendiendo/]']],
  ],
  ['open-surprise', '/#laboratorio', [['click', 'role=button[name="Sorprendeme ↗"]']]],
  ['next', ex('rust-01', 'learn'), [['click', 'role=button[name="Ejercicio siguiente"]']]],
  ['predict', ex('rust-02', 'learn'), [['click', '.lab-prediction']]],
  ['draft-keys', ex('rust-01', 'code'), [['type', '.cm-content', 'ab']]],
  [
    'custom-keys',
    ex('rust-01', 'code'),
    [
      ['click', 'text=＋ Inventá tu propio caso'],
      ['type', '#lab-custom-test', 'x > 1'],
    ],
  ],
  [
    'variant',
    ex('rust-01', 'code'),
    [
      ['click', '.test-case summary'],
      ['click', 'role=button[name="Inventar una variante ↗"]'],
    ],
  ],
  [
    'hints',
    ex('rust-01', 'code'),
    [
      ['click', 'role=button[name="Dame una pista"]'],
      ['click', 'role=button[name="Otra pista"]'],
    ],
  ],
  [
    'solution',
    ex('rust-01', 'code'),
    [
      ['click', SOLUTION],
      ['click', SOLUTION],
      ['click', SOLUTION],
    ],
  ],
  [
    'restore',
    ex('rust-01', 'code'),
    [
      ['type', '.cm-content', 'q'],
      ['click', 'role=button[name="Restaurar inicio ↺"]'],
      ['click', CONTINUE],
    ],
  ],
  [
    'load-solution',
    ex('rust-01', 'code'),
    [
      ['click', SOLUTION],
      ['click', 'role=button[name="Cargarla y experimentar"]'],
      ['click', CONTINUE],
    ],
  ],
  ['run-passed', ex('rust-01', 'code'), RUN('passed')],
  ['run-failed', ex('rust-01', 'code'), RUN('failedTest')],
  ['run-transport', ex('rust-01', 'code'), RUN('transportError')],
  [
    'run-cancel',
    ex('rust-01', 'code'),
    [
      ['compiler', 'hold'],
      ['click', '#lab-run'],
      ['wait', 100],
      ['click', 'role=button[name="Cancelar ejecución"]'],
    ],
  ],
  ['reflection-keys', ex('rust-01', 'reflect'), [['type', '#lab-reflection', 'abc']]],
  [
    'self-assessment',
    ex('rust-01', 'reflect'),
    [['click', 'role=button[name=/^Lo entiendo, quiero otra vuelta/]']],
  ],
  [
    'combined',
    ex('rust-02', 'learn'),
    [
      ['click', '.lab-prediction'],
      ['click', 'role=tab[name=/Experimentá/]'],
      ['click', 'role=button[name="Dame una pista"]'],
      ['type', '.cm-content', 'z'],
      ...RUN('passed'),
      ['click', 'role=tab[name=/Explicá/]'],
      ['type', '#lab-reflection', 'porque sí'],
      ['click', 'role=button[name=/^Puedo explicarlo sin mirar/]'],
      ['click', 'role=button[name=/Siguiente experimento/]'],
    ],
  ],
  [
    'combined-frozen',
    ex('rust-09', 'code'),
    [['type', '.cm-content', 'w'], ...RUN('passed'), ['click', 'role=button[name=/^← Volver al/]']],
    ,
    true,
  ],
];

function frozenLab(name) {
  const text = readFileSync(pageRoot + '/qa/fixtures/' + name, 'utf8');
  return name.endsWith('-storage.json')
    ? JSON.parse(text)['taller-laboratorio-v1']
    : JSON.stringify(JSON.parse(text).lab);
}
const FROZEN_FIXTURES = [
  'progress-master-2a278ad-storage.json',
  'progress-master-2a278ad-export.json',
  'progress-d0e1b49-export.json',
];
const VISITS = [
  '/#laboratorio',
  ex('rust-09', 'learn'),
  ex('rust-09', 'code'),
  ex('rust-09', 'reflect'),
  ex('rust-112', 'learn', 'campana=rust-world-4&'),
];

async function written(page) {
  return page.evaluate(() => ({
    writes: JSON.parse(sessionStorage.getItem('parity-writes') ?? '[]'),
    final: localStorage.getItem('taller-laboratorio-v1'),
    exported: JSON.stringify(window.TallerLab.exportState()),
  }));
}

async function compareWrites(browser) {
  let rows = 0,
    writes = 0,
    differences = 0;
  const samples = [];
  for (const row of WRITE_ROWS) {
    const a = await open(browser, 'http://127.0.0.1:4501', row, 1200, 'no-preference', false);
    const b = await open(browser, 'http://127.0.0.1:4502', row, 1200, 'no-preference', false);
    await a.page.waitForTimeout(200);
    await b.page.waitForTimeout(200);
    const wa = await written(a.page);
    const wb = await written(b.page);
    await a.context.close();
    await b.context.close();
    rows++;
    writes += wa.writes.length;
    const same = JSON.stringify(wa.writes) === JSON.stringify(wb.writes) && wa.final === wb.final;
    if (!same) {
      differences++;
      samples.push(
        `${row[0]} | legacy ${wa.writes.length} writes | page ${wb.writes.length} writes`,
      );
    }
    samples.push(`  ${row[0]}: ${wa.writes.length} writes`);
  }
  return { rows, writes, differences, samples };
}

async function compareExports(browser) {
  let fixtures = 0,
    differences = 0;
  const samples = [];
  for (const name of FROZEN_FIXTURES) {
    const result = [];
    for (const [origin, legacy] of [
      ['http://127.0.0.1:4501', true],
      ['http://127.0.0.1:4502', false],
    ]) {
      const { context, page } = await open(
        browser,
        origin,
        [name, VISITS[0], [], , frozenLab(name)],
        1200,
        'no-preference',
        legacy,
      );
      for (const visit of VISITS.slice(1)) {
        await page.goto(origin + visit);
        await page.waitForFunction(() => document.querySelector('#main')?.children.length > 0);
      }
      await page.waitForTimeout(100);
      result.push(await written(page));
      await context.close();
    }
    fixtures++;
    const [a, b] = result;
    samples.push(`  ${name}: export of ${a.exported.length} characters, ${a.writes.length} writes`);
    if (a.exported !== b.exported || a.writes.length || b.writes.length) {
      differences++;
      samples.push(
        `${name} | writes ${a.writes.length}/${b.writes.length} | export equal ${a.exported === b.exported}`,
      );
    }
  }
  return { fixtures, differences, samples };
}

async function compareExplorers(browser) {
  const ids = Object.keys(KINDS.kinds);

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
    const region = '.quest-explorer, .lab-explorer';
    const snapshot = () =>
      page.evaluate((selector) => {
        const host = document.querySelector(selector);
        if (!host) return 'none';
        const live = host.querySelector('[role="status"]');
        const focused = document.activeElement;
        const text = (n) => n.innerText.replace(/\s+/g, ' ').trim();
        return [
          text(host),
          live ? text(live) : '',
          `${focused?.tagName}:${focused ? text(focused) : ''}:${focused?.getAttribute('aria-label') ?? ''}`,
        ].join(' ¦ ');
      }, region);
    out.push(await snapshot());
    const count = await page.locator(`${region} button`).count();
    for (let i = 0; i < Math.min(count, 12); i++) {
      const button = page.locator(`${region} button`).nth(i);
      if (await button.isDisabled()) continue;
      await button.click();
      await page.waitForTimeout(10);
      out.push(await snapshot());
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
    mode === 'explorers'
      ? await compareExplorers(browser)
      : mode === 'writes'
        ? await compareWrites(browser)
        : mode === 'exports'
          ? await compareExports(browser)
          : await compareStates(browser);
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
node -e "const html=require('fs').readFileSync('dist/index.html','utf8'); console.log(JSON.stringify({chars:html.length,dynamicImports:(html.match(/\bimport\(/g)||[]).length,importMeta:(html.match(/import\.meta/g)||[]).length}))"   # chars < 1 500 000 y ≤ T018 + 17 000; importMeta = T018 − 3; dynamicImports 0
```

Más los `grep` de §2, las comparaciones de §3 y, con permiso, `docker compose build taller`. La comprobación con lector de pantalla (X2) la hace el usuario en la revisión del PR.
