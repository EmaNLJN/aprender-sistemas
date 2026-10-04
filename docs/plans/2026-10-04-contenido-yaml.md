# A1 — Contenido en YAML y código real, con oráculo idéntico: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usá superpowers:subagent-driven-development
> (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los
> pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que todo el contenido del taller viva en `content/`, como YAML más código Rust y
Go real, y que un generador TypeScript lo valide y escriba `build/curriculum.json`. Los
adaptadores legacy publican desde ese JSON los mismos catálogos que hoy: el oráculo
`dump-globals-v2` queda idéntico byte a byte.

**Arquitectura:**

- **`content/`** es la fuente:
  - `content/<rust|go>/manifest.yaml` ordena las etapas: recorrido (`lab`, etapas 1–20),
    desafíos (`quests`, 21–24) y núcleos de Sistemas (`systems`, por dominio, 25–49).
  - `content/<rust|go>/exercises/<id>/` guarda `exercise.yaml`, `starter.<rs|go>` y
    `solution.<rs|go>`.
  - Mundos, talleres y conceptos del Atlas son un `<id>.yaml` por registro con un
    `manifest.yaml` que agrupa y ordena; la guía tiene un manifiesto por recorrido y un archivo
    por recurso y por paso.
- **`tools/content/`** es el único lector de YAML (con el paquete `yaml`):
  - valida forma, campos obligatorios, IDs y manifiesto contra archivos;
  - arma cada ejercicio con la misma fusión que `add` y `defineQuest`: `defaults`, después la
    etapa y, en los desafíos, la posición; encima, `exercise.yaml` y el código;
  - publica las claves con el orden legacy de cada catálogo (`catalogs.ts`).
- **`build/curriculum.json`** es salida ignorada por Git. Su forma final, fija desde la tarea 5,
  es `{ lab, quests, cores, campaign, workshops, guide, atlas }`:
  - `lab.rust` → `RUST_LAB`, `lab.go` → `GO_LAB`;
  - `quests.<lenguaje>` → `RUST_QUESTS` y `GO_QUESTS`;
  - `cores.<dominio>` → `SYSTEMS_<DOMINIO>_LABS`;
  - `campaign.<lenguaje>` → `RUST_CAMPAIGN` y `GO_CAMPAIGN`;
  - `workshops.<dominio>` → `SYSTEMS_<DOMINIO>.workshops`;
  - `guide` → `GUIDE_DATA`; `atlas` → `atlasByLanguage`.
- **Adaptadores:** `register-catalogs.ts`, los `register-systems-*.ts` y el Atlas importan ese
  JSON. Los modelos de simulación siguen en TypeScript.
- **Migración por tipo de contenido:** cada tarea escribe un codemod de un solo uso que lee el
  catálogo vivo, escribe `content/`, se verifica con el cargador real y se borra en la misma
  tarea, junto con el módulo `.ts` que reemplaza.
- **Dos oráculos en el repo:** `dump-globals.ts` vuelca lo que publican las fuentes;
  `dump-dist-globals.ts`, lo que publica el `dist/index.html` construido.

**Tecnologías:**

- Node 24, que ejecuta TypeScript borrable sin compilar, y TypeScript 6.
- `yaml` 2.9.1 (eemeli/yaml), devDependency nueva.
- esbuild a través de `qa/lib/sources.ts`, Vite 8 y Prettier 3, que también formatea YAML.

**Spec:** [ADR 0004](../adr/0004-backend-laravel-mysql-contenido-y-progreso.md), sección 2
«Contenido»: fuente en Git y checks TypeScript. Las tablas, `content:import`, la API y los
hashes son de C2. Hoja de ruta: [2026-10-04-backend-hoja-de-ruta.md](2026-10-04-backend-hoja-de-ruta.md).

## Restricciones globales

- **Oráculo:**
  - `node tools/content/dump-globals.ts .` da sha256
    `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745` sobre `ec2e84f`.
  - Ese valor se repite al final de cada tarea y en los puntos intermedios que se indican.
  - Si el contenido cambió antes de ejecutar el plan, la tarea 2 recalcula la línea base sobre
    el commit de partida y ese valor reemplaza al de arriba en todo el plan.
- **Contenido idéntico:**
  - No se reformatea código ni texto.
  - `starter.rs` y `solution.rs` son el string publicado, byte a byte y sin salto final
    agregado; cada `.go` es `package main`, una línea en blanco y el string.
  - Los datos se mueven sólo con codemods que verifican el resultado con el cargador real.
- **Orden e IDs:**
  - El orden sale de los manifiestos, nunca del número del ID.
  - La etapa es la posición de su etapa en el manifiesto del lenguaje, y coincide con la de
    hoy.
  - Los IDs son nombres de carpeta o de archivo y no cambian.
- **Valores por defecto:** el manifiesto guarda los que completaban las fábricas, tomados de las
  fábricas mismas y no del catálogo publicado. `exercise.yaml` guarda sólo lo que difiere.
- **Orden de claves:** cada catálogo de ejercicios publica sus claves con el orden legacy. Mundos,
  talleres, Atlas y guía conservan el orden del YAML, que el codemod escribe igual al publicado.
- **Fuera de alcance:** los hashes (`content_hash`, `grading_hash`, `starter_hash`), las tablas
  y la API quedan para C2.
- **Lectores de YAML:** sólo `tools/content/` y los checks de `qa/` que lo prueban. Prettier
  formatea `content/**/*.yaml` como cualquier fuente.
- **Integración:**
  - El agente principal integra `package.json`, `package-lock.json`, `tsconfig*.json`,
    `.gitignore`, `.dockerignore`, `.claude/` y la documentación; los pasos que los tocan lo
    dicen.
  - También hace los commits, después de revisar el diff, con rutas explícitas.
  - Nunca `git add -A`: `content/` suma cientos de archivos y `build/` es salida.
  - Los archivos reemplazados se borran con `rm`, no con `git rm`. Algunos se editan antes en
    la misma tarea, y `git rm` rechaza un archivo con cambios locales. El `git add` del commit
    nombra la ruta borrada y así registra el borrado.
- **Descargas:** la única dependencia nueva es `yaml`, con permiso del usuario (tarea 1). La
  tarea 12 usa imágenes Docker sólo si ya están en el equipo; si faltan, pide permiso o informa
  la limitación.
- **Estilo:** comentarios y mensajes en español, nombres en inglés y sintaxis TypeScript
  borrable. El generador se escribe con TDD: la prueba falla primero porque el módulo todavía no
  existe.
- **Verificación de cada tarea:**
  - `npm test`, `npm run format:check` y `git diff --check`.
  - `npm run lint` sin errores; los 35 avisos de complejidad de hoy no aumentan.
  - En las tareas de ejercicios, `node qa/runtime-check.ts rust --audit-record` y su variante
    `go`: 137/137 programas y 411 aserciones por lenguaje. Necesitan los registros locales
    `qa/*-validation.json`, que no se versionan; sin ellos se informa la limitación.

## Foco de revisión

Cada línea es una entrada que un uso real va a encontrar. Su prueba vive en la tarea dueña del
código.

1. **Orden de claves de los seis catálogos de ejercicios:** el YAML puede tener cualquier orden y
   el JSON sale con el orden legacy. En los núcleos pc, `id` va después de `sources`; los de
   infra suman `workshopId` y `challengeType`. Pruebas: tarea 4 (escenarios «recorrido»,
   «desafíos» y «núcleos») y el oráculo en las tareas 5 a 8.
2. **Valores por defecto que el oráculo no ve:**
   - En Rust, las etapas 7 y 11 a 20 redefinen `sources` en sus cinco ejercicios; Go hace lo
     mismo con `imports` o `sources` en cinco etapas.
   - Un valor por defecto equivocado dejaría el oráculo idéntico.
   - Pruebas: el oráculo idéntico después de extraer `stageDefaults` (tareas 5 y 6) y de
     exportar `catalog` (tarea 7), y la aserción de cada codemod.
3. **Seis expresiones de prueba de `RUST_LAB` con tabuladores o espacios antes de un salto de
   línea:** pasan por YAML y Prettier sin cambiar y sin dejar espacios al final de línea.
   Pruebas: tarea 5 (aserción del codemod, oráculo después de Prettier y `git diff --check`).
4. **Código byte a byte:** Rust sin salto final agregado; Go con la cabecera exacta y un error
   con la ruta si falta. Pruebas: tarea 4 (escenarios «Go» y «Rust») y `runtime-check
   --audit-record` en las tareas 5 a 8.
5. **Contenido inválido:**
   - Casos: pistas distintas de 3, pruebas fuera de orden, respuesta fuera de las opciones,
     claves desconocidas o derivadas, carpetas o archivos huérfanos o faltantes, e IDs repetidos
     en un manifiesto, entre lenguajes o en la guía.
   - Cada error nombra archivo y campo, y el build falla.
   - Pruebas: tareas 3, 4, 9, 10 y 11, y el paso manual de la tarea 5 (`npm run curriculum`
     sale con código 1).
6. **`build/curriculum.json` ausente o viejo:** `npm run typecheck` (y por eso `build` y `test`)
   y `npm run dev` lo regeneran antes. Prueba: tarea 5 (borrar el JSON y correr `npm test`).
7. **Bundle:** `dist/index.html` no puede quedar idéntico byte a byte (ver «Decisiones
   interpretadas»), pero los catálogos que publica el dist construido son idénticos al oráculo.
   Pruebas: tarea 2 (dist de partida) y tarea 12 (dist final).

## Estructura de archivos

```
content/
  rust/manifest.yaml                     defaults; etapas de lab, quests y systems (por dominio)
  rust/exercises/<id>/exercise.yaml      lo que difiere de defaults y de la etapa
  rust/exercises/<id>/starter.rs         código byte a byte
  rust/exercises/<id>/solution.rs
  go/…                                   igual, con starter.go y solution.go (con package main)
  campaign/manifest.yaml                 IDs de mundos por lenguaje, en orden
  campaign/<world-id>.yaml
  workshops/manifest.yaml                IDs de talleres por dominio, en orden
  workshops/<workshop-id>.yaml
  atlas/manifest.yaml                    IDs de conceptos por lenguaje, en orden
  atlas/<concept-id>.yaml
  guide/manifest.yaml                    orden de la biblioteca
  guide/resources/<resource-id>.yaml
  guide/sources.yaml                     fuentes de la guía (sin IDs)
  guide/<rust|go>/manifest.yaml          título, descripción y módulos con los IDs de sus pasos
  guide/<rust|go>/steps/<step-id>.yaml
tools/content/
  dump-globals.ts                        oráculo de las fuentes (tarea 2)
  dump-dist-globals.ts                   catálogos del dist construido (tarea 2)
  content-error.ts                       ContentError y ubicación archivo + campo (tarea 3)
  yaml-file.ts                           lectura de YAML con errores con la ruta (tarea 3)
  shape.ts                               comprobaciones de forma (tarea 3)
  catalog-files.ts                       manifiesto ↔ carpeta (tarea 3)
  catalogs.ts                            lenguajes, dominios y orden de claves (tarea 4)
  exercises.ts                           manifiestos de lenguaje y ejercicios (tarea 4)
  load-curriculum.ts                     arma curriculum.json; crece de la tarea 5 a la 11
  build-curriculum.ts                    CLI: valida y escribe build/curriculum.json (tarea 5)
  records.ts, campaign.ts, workshops.ts  registros literales (tarea 9)
  guide.ts                               guía (tarea 10)
  atlas.ts                               Atlas (tarea 11)
qa/content-tools-check.ts                tareas 3, 4, 9, 10 y 11: un check por módulo
qa/content-exercises-check.ts
qa/content-records-check.ts
qa/content-guide-check.ts
qa/content-atlas-check.ts
src/pages/atlas/model/types.ts           tipos del Atlas (tarea 11)
src/pages/atlas/model/atlas-catalog.ts   atlasByLanguage desde el JSON (tarea 11)
build/curriculum.json, build/oracle/     salidas generadas e ignoradas
```

Se borran `src/entities/exercise/content/`, `src/entities/exercise/model/builders.ts`,
`src/entities/exercise/model/define-quest.ts`, `src/entities/campaign/content/`,
`src/entities/systems-workshop/content/`, `src/entities/guide/content/` y
`src/pages/atlas/content/`.

---

### Tarea 1: Dependencia `yaml`, con permiso del usuario (agente principal)

**Archivos:**
- Modificar: `package.json` (`devDependencies`) y `package-lock.json`.

**Interfaces:**
- Produce el paquete `yaml` 2.9.1, importable desde `tools/content/` y desde `qa/` con
  `import { parse, stringify, Document, visit, YAMLError } from 'yaml'`.

- [ ] **Paso 1: Pedir permiso al usuario**

El agente principal pregunta, con estos datos:

- paquete `yaml` 2.9.1 (proyecto eemeli/yaml, <https://github.com/eemeli/yaml>);
- origen: registro de npm (<https://registry.npmjs.org/yaml>);
- licencia ISC, sin dependencias, 233 archivos y unos 670 KiB desempaquetado (686 297 bytes);
- se instala como devDependency exacta. Lo usan el generador y los checks, y no entra al
  bundle, así que `THIRD-PARTY-NOTICES.txt` no cambia.

Sin un sí explícito del usuario, el plan se detiene acá.

- [ ] **Paso 2: Instalar**

```bash
npm install --save-dev --save-exact yaml@2.9.1
```

- [ ] **Paso 3: Verificar**

Ejecutar:
```bash
npm ls yaml && node --input-type=module -e "import { parse } from 'yaml'; console.log(parse('a: [1, 2]').a.length)" && git diff --stat
```
Esperado:
- `yaml@2.9.1` y después `2`;
- el diff toca sólo `package.json`, con `"yaml": "2.9.1"` al final de `devDependencies`, y
  `package-lock.json`.

- [ ] **Paso 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(contenido): yaml 2.9.1 como devDependency para leer content/"
```

---

### Tarea 2: Oráculos en el repo y línea base

El oráculo de la sesión del 2026-10-03 vive en un scratchpad que no sobrevive a la sesión. Esta
tarea lo porta a TypeScript dentro del repo y fija la línea base antes de tocar contenido.

**Archivos:**
- Crear: `tools/content/dump-globals.ts` y `tools/content/dump-dist-globals.ts`.
- Modificar (agente principal): `tsconfig.qa.json` (`include`) y `.gitignore` (`/build/`).

**Interfaces:**
- Produce `node tools/content/dump-globals.ts <raíz>`: escribe en stdout el JSON canónico
  `{ errors, globals, models, atlas }`, con los mismos bytes que `dump-globals-v2.mjs`.
- Produce `node tools/content/dump-dist-globals.ts <dist/index.html>`: escribe los globals de
  datos que publica el dist, con la forma exacta de `globals`.
- Produce `build/oracle/before.json`, la línea base de todas las tareas.

- [ ] **Paso 1: Configuración (lo integra el agente principal)**

En `tsconfig.qa.json`, reemplazar:
```json
  "include": ["qa/**/*.ts"]
```
por:
```json
  "include": ["qa/**/*.ts", "tools/content/**/*.ts"]
```

En `.gitignore`, después del bloque `# Generated by Vite.` (que termina en `/dist/`), agregar:
```gitignore

# Generated by tools/content: curriculum.json and the oracle dumps.
/build/
```

Esto se adelanta a la tarea 12 por una razón concreta. Prettier 3 lee `.gitignore`, así que sin
esta línea `npm run format:check` falla en cuanto exista `build/oracle/before.json`.

- [ ] **Paso 2: Escribir el oráculo de las fuentes**

`tools/content/dump-globals.ts`:
```ts
// Oráculo de equivalencia para refactors puros: evalúa en una VM, con stubs mínimos de
// navegador y en el orden de src/app/main.tsx, los adaptadores que publican catálogos y
// modelos, y escribe un volcado JSON canónico. Port a TypeScript de dump-globals-v2.mjs
// (sesión del 2026-10-03): sobre el mismo árbol produce exactamente los mismos bytes.
// Uso: node tools/content/dump-globals.ts <raíz del repo> > volcado.json
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

interface SystemsModel {
  initial(workshop: unknown): unknown;
  view(state: unknown, workshop: unknown): unknown;
  achieved(state: unknown, workshop: unknown): unknown;
}
interface SystemsGroup {
  workshops?: { id: string; model: string }[];
  models?: Record<string, SystemsModel>;
}

if (!process.argv[2]) throw new Error('Uso: node tools/content/dump-globals.ts <raíz del repo>');
const root = resolve(process.argv[2]);
// esbuild sale del árbol que se vuelca, así el oráculo también corre sobre otro checkout.
const esbuild = createRequire(join(root, 'package.json'))('esbuild') as typeof import('esbuild');

// Sólo fuentes de datos y modelos puros: las vistas necesitan un DOM real y las cubren QA y
// el navegador.
const files = [
  'src/app/legacy/register-catalogs.ts',
  ...['lowlevel', 'infra', 'play', 'pc'].map(
    (domain) => `src/app/legacy/register-systems-${domain}.ts`,
  ),
];

function loadInto(context: vm.Context, file: string): void {
  const result = esbuild.buildSync({
    entryPoints: [join(root, file)],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    logLevel: 'silent',
  });
  vm.runInContext(result.outputFiles[0].text, context, { filename: file, timeout: 5000 });
}

const window: Record<string, unknown> = {};
const context = vm.createContext({ window, console });
const errors: Record<string, string> = {};
for (const file of files) {
  try {
    loadInto(context, file);
  } catch (error) {
    errors[file] = String((error as Error | undefined)?.message);
  }
}

function canonical(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === 'function' ? '[function]' : v)),
  );
}

const out: Record<string, unknown> = { errors, globals: {} };
const globals = out.globals as Record<string, unknown>;
for (const name of Object.keys(window).sort()) globals[name] = canonical(window[name]);

// Modelos de Sistemas: estado inicial y primera vista por taller vuelven observable un port.
const models: Record<string, unknown> = {};
for (const domain of ['SYSTEMS_LOWLEVEL', 'SYSTEMS_INFRA', 'SYSTEMS_PLAY', 'SYSTEMS_PC']) {
  const group = window[domain] as SystemsGroup | undefined;
  if (!group) continue;
  for (const workshop of group.workshops || []) {
    const model = (group.models || {})[workshop.model];
    if (!model) {
      models[workshop.id] = 'missing-model';
      continue;
    }
    try {
      const state = model.initial(workshop);
      models[workshop.id] = {
        initial: canonical(state),
        view: canonical(model.view(state, workshop)),
        achieved: canonical(model.achieved(state, workshop)),
      };
    } catch (error) {
      models[workshop.id] = 'error: ' + String((error as Error | undefined)?.message);
    }
  }
}
out.models = models;

// Contenido del Atlas, con el mismo empaquetador. La primera ruta que exista gana.
const atlasCandidates = ['src/pages/atlas/content/atlas-content.ts'];
const atlasEntry = atlasCandidates
  .map((candidate) => join(root, candidate))
  .find((candidate) => existsSync(candidate));
if (!atlasEntry) throw new Error('No se encontró el módulo del Atlas');
const atlas = esbuild.buildSync({
  entryPoints: [atlasEntry],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  logLevel: 'silent',
});
const atlasUrl =
  'data:text/javascript;base64,' + Buffer.from(atlas.outputFiles[0].text).toString('base64');
const atlasModule = (await import(atlasUrl)) as { atlasByLanguage: unknown };
out.atlas = canonical(atlasModule.atlasByLanguage);

process.stdout.write(JSON.stringify(out));
```

- [ ] **Paso 3: Fijar la línea base y comprobar el port**

Ejecutar:
```bash
mkdir -p build/oracle && node tools/content/dump-globals.ts . > build/oracle/before.json && sha256sum build/oracle/before.json
```
Esperado: `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`.

Si el scratchpad de aquella sesión todavía existe, comparar además con el original:
```bash
SCRATCH=/tmp/claude-1000/-home-emanuel--config-Claude-scratch-workspaces-daf34359-6f08-435f-922f-1c1c9c0136c6-2b261808-484f-43ae-b3c9-7d3243ba94ed-scratch-2026-10-03-c56bdc/8f8d3bf2-0eeb-4a88-8c6a-574946252853/scratchpad
node "$SCRATCH/baseline/dump-globals-v2.mjs" "$PWD" | cmp - build/oracle/before.json && echo idénticos
```

Si el sha256 difiere porque el contenido cambió desde `ec2e84f`, se hace esto:

1. Correr el original sobre el commit de partida, si está disponible.
2. Confirmar que el port da los mismos bytes.
3. Anotar el valor nuevo en la descripción del commit de esta tarea y usarlo en las tareas
   siguientes.

Si no se puede confirmar que el port reproduce el original, el plan se detiene.

- [ ] **Paso 4: Escribir el oráculo del dist**

`tools/content/dump-dist-globals.ts`:
```ts
// Vuelca los catálogos que publica un dist/index.html ya construido: evalúa su script en una
// VM con un DOM permisivo hasta donde llegue (los adaptadores de catálogos corren primero) y
// escribe los globals de datos con la forma de la sección `globals` de dump-globals.ts.
// Compara el artefacto real de Vite, que no puede quedar idéntico byte a byte (plan A1).
// Uso: node tools/content/dump-dist-globals.ts dist/index.html > globals.json
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const file = process.argv[2];
if (!file) throw new Error('Uso: node tools/content/dump-dist-globals.ts <dist/index.html>');
const html = readFileSync(file, 'utf8');
const script = /<script\b[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
if (script === undefined) throw new Error(`${file} no tiene un script en línea`);

// Cualquier propiedad, llamada o construcción devuelve otro proxy: el DOM falso nunca lanza, y
// la evaluación sólo se corta cuando falta una API global (se informa por stderr).
function permissive(): unknown {
  const target = function () {};
  return new Proxy(target, {
    get: (_target, key) => (key === 'then' || typeof key === 'symbol' ? undefined : permissive()),
    apply: () => permissive(),
    construct: () => permissive() as object,
  });
}
const storage = { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 };
const window: Record<string, unknown> = {
  localStorage: storage,
  location: { hash: '' },
  addEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
};
const context = vm.createContext({
  window,
  document: permissive(),
  navigator: { userAgent: '' },
  console: { log() {}, warn() {}, error() {} },
  localStorage: storage,
  location: window.location,
  setTimeout,
  clearTimeout,
  queueMicrotask,
  requestAnimationFrame: () => 0,
  performance: { now: () => 0 },
});
try {
  vm.runInContext(script, context, { filename: file, timeout: 10000 });
} catch (error) {
  console.error(`La evaluación se detuvo en: ${String((error as Error | undefined)?.message)}`);
}

const DATA_GLOBAL = /^(GUIDE_DATA|RUST_|GO_|SYSTEMS_)/;
const globals: Record<string, unknown> = {};
for (const name of Object.keys(window)
  .filter((key) => DATA_GLOBAL.test(key))
  .sort()) {
  globals[name] = JSON.parse(
    JSON.stringify(window[name], (_key, v: unknown) =>
      typeof v === 'function' ? '[function]' : v,
    ),
  );
}
process.stdout.write(JSON.stringify(globals));
```

- [ ] **Paso 5: Línea base del dist**

Ejecutar:
```bash
npm run build && sha256sum dist/index.html && wc -c dist/index.html
node tools/content/dump-dist-globals.ts dist/index.html > build/oracle/dist-before.json
node -e "const fs = require('node:fs'); const oracle = JSON.parse(fs.readFileSync('build/oracle/before.json', 'utf8')).globals; process.exit(JSON.stringify(oracle) === fs.readFileSync('build/oracle/dist-before.json', 'utf8') ? 0 : 1)" && echo 'dist = oráculo'
```
Esperado:
- `dist = oráculo`, la única condición de este paso;
- por stderr, `La evaluación se detuvo en: URLSearchParams is not defined`. Pasa después de
  publicar los quince catálogos.

Anotar el sha256 y los bytes del dist de partida para el commit. El ensayo dio
`3cc65a91d7225badd55d39ce84ccb0e92b9e4ff01475a79317e3fb70da422181` y 2 044 640 bytes; con otra
versión de las herramientas pueden variar, y eso no bloquea.

El oráculo del dist queda probado: con el bundle de partida reproduce los `globals` del oráculo.

- [ ] **Paso 6: Verificar**

Ejecutar: `npm run typecheck && npm test && npm run lint && npm run format:check && git diff --check`
Esperado: todo en verde; `24 checks passed.`

- [ ] **Paso 7: Commit**

```bash
git add tools/content/dump-globals.ts tools/content/dump-dist-globals.ts tsconfig.qa.json .gitignore
git commit -m "test(contenido): oráculos de equivalencia en tools/content y línea base"
```

---

### Tarea 3: Base del generador: errores, YAML y forma

**Archivos:**
- Crear: `tools/content/content-error.ts`, `tools/content/yaml-file.ts`,
  `tools/content/shape.ts`, `tools/content/catalog-files.ts` y `qa/content-tools-check.ts`.
- Modificar: `qa/run-checks.ts`.

**Interfaces:**
- Produce `ContentError`, `Place { file, path }`, `filePlace(file)`, `child(place, key)` y
  `fail(place, message): never`.
- Produce `readYamlFile(root, file): unknown`: esquema core de YAML 1.2, claves únicas y errores
  con la ruta relativa.
- Produce en `shape.ts`:
  - los tipos `Json`, `JsonRecord` y `Check = (value, place) => unknown`;
  - `expectRecord`, `expectText`, `expectList`, `expectTextList`, `expectInteger` y
    `expectBoolean`;
  - las fábricas `oneOf`, `textList`, `integer` y `listOf`;
  - `checkRecord(value, place, spec, optional)`, `checkSource` y `checkQuestion`.
- Produce en `catalog-files.ts`: `listDirectories`, `listYamlIds` y
  `expectSameIds(listed, found, manifest, folder, suffix)`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`qa/content-tools-check.ts`:
```ts
/* Base del generador de content/ (tools/content): lectura de YAML, comprobaciones de forma
 * y correspondencia entre un manifiesto y su carpeta.
 * node qa/content-tools-check.ts
 *
 * Cada error nombra el archivo y el campo: es lo único que ve quien edita un YAML.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expectSameIds, listYamlIds } from '../tools/content/catalog-files.ts';
import { ContentError, filePlace } from '../tools/content/content-error.ts';
import { checkQuestion, checkRecord, expectText, textList } from '../tools/content/shape.ts';
import { readYamlFile } from '../tools/content/yaml-file.ts';

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-content-'));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

function throwsContent(run: () => unknown, message: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ContentError, `se esperaba ContentError: ${String(error)}`);
    assert.equal(error.message, message);
    return true;
  });
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

test('readYamlFile conserva el orden de claves del documento', () => {
  const root = fixture({ 'content/a.yaml': 'zeta: 1\nalfa: [x, y]\nmedio: {b: 2, a: 1}\n' });
  const value = readYamlFile(root, 'content/a.yaml');
  assert.deepEqual(value, { zeta: 1, alfa: ['x', 'y'], medio: { b: 2, a: 1 } });
  assert.deepEqual(Object.keys(value as object), ['zeta', 'alfa', 'medio']);
  assert.deepEqual(Object.keys((value as { medio: object }).medio), ['b', 'a']);
});

test('readYamlFile nombra el archivo inexistente o inválido', () => {
  const root = fixture({ 'content/doble.yaml': 'a: 1\na: 2\n' });
  throwsContent(() => readYamlFile(root, 'content/falta.yaml'), 'content/falta.yaml: no existe');
  assert.throws(
    () => readYamlFile(root, 'content/doble.yaml'),
    (error: unknown) =>
      error instanceof ContentError &&
      error.message.startsWith('content/doble.yaml: YAML inválido: Map keys must be unique'),
  );
});

test('checkRecord rechaza claves desconocidas y faltantes con su ruta', () => {
  const place = filePlace('content/x.yaml');
  const spec = { title: expectText, tags: textList(1) };
  throwsContent(
    () => checkRecord({ title: 'a', tags: ['b'], extra: 1 }, place, spec),
    'content/x.yaml: extra: clave desconocida',
  );
  throwsContent(
    () => checkRecord({ title: 'a' }, place, spec),
    'content/x.yaml: falta la clave «tags»',
  );
  throwsContent(
    () => checkRecord({ title: 'a', tags: ['b', ' '] }, place, spec),
    'content/x.yaml: tags[1]: se esperaba un texto no vacío',
  );
  assert.deepEqual(checkRecord({ title: 'a' }, place, spec, ['tags']), { title: 'a' });
});

test('checkQuestion exige que la respuesta sea una de las opciones', () => {
  const place = filePlace('content/x.yaml');
  const question = { question: '¿?', options: ['a', 'b', 'c'], answer: 2, explanation: 'Porque.' };
  assert.deepEqual(checkQuestion(question, place), question);
  throwsContent(
    () => checkQuestion({ ...question, answer: 3 }, place),
    'content/x.yaml: answer: 3 no es el índice de una opción: hay 3',
  );
  throwsContent(
    () => checkQuestion({ ...question, options: ['única'] }, place),
    'content/x.yaml: options: se esperaban al menos 2 elementos',
  );
});

test('expectSameIds detecta repetidos, faltantes y huérfanos', () => {
  const manifest = filePlace('content/campaign/manifest.yaml');
  expectSameIds(['b', 'a'], ['a', 'b'], manifest, 'content/campaign', '.yaml');
  throwsContent(
    () => expectSameIds(['a', 'a'], ['a'], manifest, 'content/campaign', '.yaml'),
    'content/campaign/manifest.yaml: ID repetido: a',
  );
  throwsContent(
    () => expectSameIds(['a', 'b'], ['a'], manifest, 'content/campaign', '.yaml'),
    'content/campaign/manifest.yaml: b no tiene content/campaign/b.yaml',
  );
  throwsContent(
    () => expectSameIds(['a'], ['a', 'c'], manifest, 'content/campaign', '.yaml'),
    'content/campaign/c.yaml: no figura en content/campaign/manifest.yaml',
  );
});

test('listYamlIds ignora el manifiesto y rechaza otros archivos', () => {
  const root = fixture({
    'content/campaign/manifest.yaml': 'rust: []\n',
    'content/campaign/b.yaml': 'id: b\n',
    'content/campaign/a.yaml': 'id: a\n',
  });
  assert.deepEqual(listYamlIds(root, 'content/campaign'), ['a', 'b']);
  // Una carpeta que no existe está vacía: el manifiesto informa después qué falta.
  assert.deepEqual(listYamlIds(root, 'content/atlas'), []);
  writeFileSync(join(root, 'content/campaign/notas.md'), '');
  throwsContent(
    () => listYamlIds(root, 'content/campaign'),
    'content/campaign/notas.md: sólo se admiten archivos <id>.yaml',
  );
});

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-tools scenarios PASS.`);
```

- [ ] **Paso 2: Correr las pruebas y ver que fallan**

Ejecutar: `node qa/content-tools-check.ts`
Esperado: FAIL con `ERR_MODULE_NOT_FOUND` por un módulo de `tools/content/` que todavía no
existe.

- [ ] **Paso 3: Implementar**

`tools/content/content-error.ts`:
```ts
// Errores de content/: cada mensaje nombra el archivo y el campo que fallan, para que quien
// edita un YAML sepa dónde mirar.
export class ContentError extends Error {}

// Ubicación de un valor: archivo relativo a la raíz y ruta dentro del documento.
export interface Place {
  file: string;
  path: string;
}

export function filePlace(file: string): Place {
  return { file, path: '' };
}

export function child(place: Place, key: string | number): Place {
  let step = `.${key}`;
  if (typeof key === 'number') step = `[${key}]`;
  else if (place.path === '') step = key;
  return { file: place.file, path: place.path + step };
}

export function fail(place: Place, message: string): never {
  const where = place.path === '' ? place.file : `${place.file}: ${place.path}`;
  throw new ContentError(`${where}: ${message}`);
}
```

`tools/content/yaml-file.ts`:
```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, YAMLError } from 'yaml';
import { ContentError } from './content-error.ts';

// Lee un YAML de content/. `file` es relativo a `root` y es lo que muestran los errores.
// El esquema core de YAML 1.2 sólo produce valores JSON y rechaza claves repetidas.
export function readYamlFile(root: string, file: string): unknown {
  const absolute = join(root, file);
  if (!existsSync(absolute)) throw new ContentError(`${file}: no existe`);
  try {
    return parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    if (error instanceof YAMLError) {
      throw new ContentError(`${file}: YAML inválido: ${error.message}`, { cause: error });
    }
    throw error;
  }
}
```

`tools/content/shape.ts`:
```ts
import { child, fail, type Place } from './content-error.ts';

// Valor JSON tal como lo devuelve el parser de YAML con el esquema core.
export type Json = string | number | boolean | null | Json[] | JsonRecord;
export interface JsonRecord {
  [key: string]: Json;
}

// Comprobación de un valor: falla con su ubicación o devuelve el valor ya tipado.
export type Check = (value: unknown, place: Place) => unknown;

export function expectRecord(value: unknown, place: Place): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(place, 'se esperaba un mapa de claves');
  }
  return value as JsonRecord;
}

export function expectText(value: unknown, place: Place): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(place, 'se esperaba un texto no vacío');
  }
  return value;
}

export function expectList(value: unknown, place: Place, minimum: number): unknown[] {
  if (!Array.isArray(value)) fail(place, 'se esperaba una lista');
  if (value.length < minimum) {
    fail(
      place,
      minimum === 1
        ? 'la lista no puede estar vacía'
        : `se esperaban al menos ${minimum} elementos`,
    );
  }
  return value;
}

export function expectTextList(value: unknown, place: Place, minimum: number): string[] {
  return expectList(value, place, minimum).map((item, index) =>
    expectText(item, child(place, index)),
  );
}

export function expectInteger(value: unknown, place: Place, minimum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) {
    fail(place, `se esperaba un entero mayor o igual que ${minimum}`);
  }
  return value;
}

export function expectBoolean(value: unknown, place: Place): boolean {
  if (typeof value !== 'boolean') fail(place, 'se esperaba true o false');
  return value;
}

export function oneOf(allowed: readonly string[]): Check {
  return (value, place) => {
    if (typeof value !== 'string' || !allowed.includes(value)) {
      fail(place, `se esperaba uno de: ${allowed.join(', ')}`);
    }
    return value;
  };
}

export function textList(minimum: number): Check {
  return (value, place) => expectTextList(value, place, minimum);
}

export function integer(minimum: number): Check {
  return (value, place) => expectInteger(value, place, minimum);
}

export function listOf(check: Check, minimum: number): Check {
  return (value, place) =>
    expectList(value, place, minimum).map((item, index) => check(item, child(place, index)));
}

// Un mapa con exactamente las claves de `spec`, salvo las opcionales; cada valor pasa su
// comprobación. No reordena: las claves quedan en el orden del YAML.
export function checkRecord(
  value: unknown,
  place: Place,
  spec: Record<string, Check>,
  optional: readonly string[] = [],
): JsonRecord {
  const record = expectRecord(value, place);
  for (const key of Object.keys(record)) {
    if (!Object.hasOwn(spec, key)) fail(child(place, key), 'clave desconocida');
  }
  for (const [key, check] of Object.entries(spec)) {
    if (Object.hasOwn(record, key)) check(record[key], child(place, key));
    else if (!optional.includes(key)) fail(place, `falta la clave «${key}»`);
  }
  return record;
}

export function checkSource(value: unknown, place: Place): JsonRecord {
  return checkRecord(value, place, { title: expectText, url: expectText });
}

// Predicción, quiz o checkpoint: `answer` es el índice de una de las opciones.
export function checkQuestion(value: unknown, place: Place): JsonRecord {
  const question = checkRecord(value, place, {
    question: expectText,
    options: textList(2),
    answer: integer(0),
    explanation: expectText,
  });
  const options = question.options as string[];
  const answer = question.answer as number;
  if (answer >= options.length) {
    fail(child(place, 'answer'), `${answer} no es el índice de una opción: hay ${options.length}`);
  }
  return question;
}
```

`tools/content/catalog-files.ts`:
```ts
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fail, filePlace, type Place } from './content-error.ts';

// Entradas de una carpeta de content/, ordenadas. Una carpeta que no existe está vacía: así
// el manifiesto informa qué falta en lugar de un ENOENT.
function entries(root: string, folder: string): string[] {
  const absolute = join(root, folder);
  return existsSync(absolute) ? readdirSync(absolute).sort() : [];
}

export function listDirectories(root: string, folder: string): string[] {
  return entries(root, folder).filter((name) => statSync(join(root, folder, name)).isDirectory());
}

// IDs de los <id>.yaml de una carpeta, sin contar su manifest.yaml. Otro archivo o una
// subcarpeta son un error: nada queda en content/ sin que el generador lo lea.
export function listYamlIds(root: string, folder: string): string[] {
  const ids: string[] = [];
  for (const name of entries(root, folder)) {
    if (name === 'manifest.yaml') continue;
    const isYaml = name.endsWith('.yaml') && statSync(join(root, folder, name)).isFile();
    if (!isYaml) fail(filePlace(`${folder}/${name}`), 'sólo se admiten archivos <id>.yaml');
    ids.push(name.slice(0, -'.yaml'.length));
  }
  return ids;
}

// Un manifiesto y su carpeta listan los mismos IDs: sin repetidos, faltantes ni huérfanos.
// `suffix` es '.yaml' para registros y '' para las carpetas de ejercicios.
export function expectSameIds(
  listed: readonly string[],
  found: readonly string[],
  manifest: Place,
  folder: string,
  suffix: string,
): void {
  const seen = new Set<string>();
  for (const id of listed) {
    if (seen.has(id)) fail(manifest, `ID repetido: ${id}`);
    seen.add(id);
    if (!found.includes(id)) fail(manifest, `${id} no tiene ${folder}/${id}${suffix}`);
  }
  for (const id of found) {
    if (!seen.has(id)) fail(filePlace(`${folder}/${id}${suffix}`), `no figura en ${manifest.file}`);
  }
}
```

- [ ] **Paso 4: Correr las pruebas y ver que pasan**

Ejecutar: `node qa/content-tools-check.ts`
Esperado: seis `PASS` y `6 content-tools scenarios PASS.`

- [ ] **Paso 5: Sumar el check a la suite**

En `qa/run-checks.ts`, después de `'load-order-check.ts',`, agregar:
```ts
  'content-tools-check.ts',
```

Ejecutar: `npm test && npm run lint && npm run format:check && git diff --check`
Esperado: `25 checks passed.` y el resto en verde.

- [ ] **Paso 6: Commit**

```bash
git add tools/content/content-error.ts tools/content/yaml-file.ts tools/content/shape.ts tools/content/catalog-files.ts qa/content-tools-check.ts qa/run-checks.ts
git commit -m "feat(contenido): base del generador con errores que nombran archivo y campo"
```

---

### Tarea 4: Cargador de ejercicios con el orden de claves legacy

Contrato del manifiesto de lenguaje, que escriben los codemods de las tareas 5 a 8:

```yaml
# content/rust/manifest.yaml: la primera etapa de cada sección, con valores reales
defaults: # valores de todas las etapas del lenguaje
  kind: completar
  imports: []
  visual: flow
lab: # RUST_LAB: etapas 1 a 20
  - topicId: rust-basics
    topic: Expresiones y mutabilidad
    minutes: 8 # una etapa puede fijar kind, minutes, imports, visual, sources y level
    sources:
      - title: The Rust Book · Expresiones y mutabilidad
        url: https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html
    exercises:
      - rust-01
      - rust-02
      - rust-03
      - rust-04
      - rust-05
quests: # RUST_QUESTS: etapas 21 a 24, con reparación, kata y jefe en ese orden
  - topicId: rust-quest-robot
    topic: Estación del robot
    level: beginner
    minutes: 12
    bossMinutes: 20
    exercises:
      - rust-101
      - rust-102
      - rust-103
systems: # SYSTEMS_<DOMINIO>_LABS: etapas 25 a 49, un núcleo por etapa
  lowlevel:
    - topicId: rust-systems-cache
      topic: Una caché que aprende tus visitas
      exercises:
        - rust-113
  infra:
    - topicId: rust-systems-wal
      topic: WAL y recuperación
      exercises:
        - rust-121
  play:
    - topicId: play-transforms
      topic: Coreografía de matrices
      exercises:
        - rust-129
  pc:
    - topicId: rust-systems-pc
      topic: Construí una PC de bolsillo
      exercises:
        - rust-137
```

Cada ejercicio se arma así:

1. Toma los valores de `defaults`.
2. Encima, los de su etapa.
3. En los desafíos, lo que fija la posición: `challengeType` repair, kata o boss; `kind`
   `reparar` en el primero; y en el jefe, `minutes` igual a `bossMinutes`.
4. Encima de todo, su `exercise.yaml`.
5. Al final se suman `id` (la carpeta), `language`, `topicId` y `topic` de la etapa, `stage` (la
   posición de la etapa contando todas las secciones) y el código.

`exercise.yaml` no puede traer esas claves derivadas. Las claves se publican con el orden de
`EXERCISE_KEY_ORDER`, sacado de las fábricas y de los literales actuales.

**Archivos:**
- Crear: `tools/content/catalogs.ts`, `tools/content/exercises.ts` y
  `qa/content-exercises-check.ts`.
- Modificar: `qa/run-checks.ts`.

**Interfaces:**
- Consume `readYamlFile`, `shape.ts` y `catalog-files.ts` (tarea 3) y `LEVEL_IDS` de
  `src/shared/config/levels.ts`.
- Produce en `catalogs.ts`: `Language`, `LANGUAGES`, `SystemsDomain`, `SYSTEMS_DOMAINS`,
  `Catalog`, `EXERCISE_KEY_ORDER` y `OPTIONAL_EXERCISE_KEYS`.
- Produce en `exercises.ts`:
  - `LanguageExercises { lab, quests, cores }` y `GO_HEADER`;
  - `loadLanguage(root, language)`;
  - `expectDistinctIds(rust, go)` e `interleaveCores(rust, go)`, que da
    `Record<SystemsDomain, JsonRecord[]>`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`qa/content-exercises-check.ts`:
```ts
/* Ejercicios de content/<lenguaje>/ (tools/content/exercises.ts).
 * node qa/content-exercises-check.ts
 *
 * Contrato: cada ejercicio hereda `defaults`, después su etapa y, en los desafíos, lo que
 * `defineQuest` derivaba de la posición; su exercise.yaml manda sobre todo eso. La etapa es la
 * posición en el manifiesto y las claves salen en el orden de cada catálogo legacy. Los
 * esperados están escritos a mano a partir de esas reglas.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ContentError } from '../tools/content/content-error.ts';
import { expectDistinctIds, interleaveCores, loadLanguage } from '../tools/content/exercises.ts';

const EXERCISE = `title: Sumar
intro: Una función suma.
why: Practicás expresiones.
objective: Sumá dos enteros.
instructions:
  - Completá la función.
tests:
  - id: t1
    label: Uno más uno
    expression: suma(1, 1) == 2
    why: Caso base.
    failure: Revisá el operador.
hints:
  - Pista uno.
  - Pista dos.
  - Pista tres.
review:
  success: Bien.
  pitfall: Ojo con el overflow.
transfer: Probá con restas.
prediction:
  question: ¿Cuánto da suma(1, 1)?
  options:
    - '1'
    - '2'
  answer: 1
  explanation: Uno más uno es dos.
`;

const DEFAULTS = `defaults:
  kind: completar
  imports: []
  visual: flow
`;

function labStage(topicId: string, ids: string[]): string {
  return `  - topicId: ${topicId}
    topic: Tema ${topicId}
    minutes: 8
    sources:
      - title: Libro · ${topicId}
        url: https://example.org/${topicId}
    exercises:
${ids.map((id) => `      - ${id}`).join('\n')}
`;
}

function exerciseFiles(language: 'rust' | 'go', id: string, yaml = EXERCISE) {
  const folder = `content/${language}/exercises/${id}`;
  const extension = language === 'rust' ? 'rs' : 'go';
  const header = language === 'go' ? 'package main\n\n' : '';
  return {
    [`${folder}/exercise.yaml`]: yaml,
    [`${folder}/starter.${extension}`]: `${header}// ${id}: inicial`,
    [`${folder}/solution.${extension}`]: `${header}// ${id}: resuelto`,
  };
}

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-exercises-'));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

function rustLab(extra: Record<string, string> = {}): string {
  return fixture({
    'content/rust/manifest.yaml': `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01', 'rust-02'])}`,
    ...exerciseFiles('rust', 'rust-01'),
    ...exerciseFiles('rust', 'rust-02', `level: medium\nkind: reparar\n${EXERCISE}`),
    ...extra,
  });
}

function throwsContent(run: () => unknown, message: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ContentError, `se esperaba ContentError: ${String(error)}`);
    assert.equal(error.message, message);
    return true;
  });
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

const SHARED_TEXT = {
  title: 'Sumar',
  intro: 'Una función suma.',
  why: 'Practicás expresiones.',
  objective: 'Sumá dos enteros.',
  instructions: ['Completá la función.'],
};
const SHARED_TAIL = {
  tests: [
    {
      id: 't1',
      label: 'Uno más uno',
      expression: 'suma(1, 1) == 2',
      why: 'Caso base.',
      failure: 'Revisá el operador.',
    },
  ],
  hints: ['Pista uno.', 'Pista dos.', 'Pista tres.'],
  review: { success: 'Bien.', pitfall: 'Ojo con el overflow.' },
  transfer: 'Probá con restas.',
  prediction: {
    question: '¿Cuánto da suma(1, 1)?',
    options: ['1', '2'],
    answer: 1,
    explanation: 'Uno más uno es dos.',
  },
};

test('recorrido: defaults, etapa y exercise.yaml se combinan en el orden de RUST_LAB', () => {
  const { lab } = loadLanguage(rustLab(), 'rust');
  const stageFields = {
    topicId: 'rust-a',
    topic: 'Tema rust-a',
    stage: 1,
  };
  const sources = [{ title: 'Libro · rust-a', url: 'https://example.org/rust-a' }];
  assert.deepEqual(lab, [
    {
      id: 'rust-01',
      language: 'rust',
      ...stageFields,
      kind: 'completar',
      minutes: 8,
      imports: [],
      visual: 'flow',
      sources,
      ...SHARED_TEXT,
      starter: '// rust-01: inicial',
      solution: '// rust-01: resuelto',
      ...SHARED_TAIL,
    },
    {
      id: 'rust-02',
      language: 'rust',
      ...stageFields,
      kind: 'reparar',
      minutes: 8,
      imports: [],
      visual: 'flow',
      sources,
      level: 'medium',
      ...SHARED_TEXT,
      starter: '// rust-02: inicial',
      solution: '// rust-02: resuelto',
      ...SHARED_TAIL,
    },
  ]);
  // deepEqual no mira el orden de las claves: el oráculo sí.
  assert.deepEqual(Object.keys(lab[1]), [
    'id',
    'language',
    'topicId',
    'topic',
    'stage',
    'kind',
    'minutes',
    'imports',
    'visual',
    'sources',
    'level',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'starter',
    'solution',
    'tests',
    'hints',
    'review',
    'transfer',
    'prediction',
  ]);
});

test('desafíos: la etapa sigue al recorrido y la posición fija tipo, kind y minutos', () => {
  const root = fixture({
    'content/rust/manifest.yaml': `${DEFAULTS}lab:
${labStage('rust-a', ['rust-01'])}${labStage('rust-b', ['rust-02'])}quests:
  - topicId: rust-quest-a
    topic: Mundo A
    level: beginner
    minutes: 12
    bossMinutes: 20
    exercises:
      - rust-101
      - rust-102
      - rust-103
`,
    ...exerciseFiles('rust', 'rust-01'),
    ...exerciseFiles('rust', 'rust-02'),
    ...exerciseFiles('rust', 'rust-101', `${EXERCISE}sources:\n  - title: A\n    url: https://a\n`),
    ...exerciseFiles('rust', 'rust-102', `${EXERCISE}sources:\n  - title: B\n    url: https://b\n`),
    ...exerciseFiles(
      'rust',
      'rust-103',
      `minutes: 25\n${EXERCISE}sources:\n  - title: C\n    url: https://c\n`,
    ),
  });
  const { lab, quests } = loadLanguage(root, 'rust');
  assert.deepEqual(
    lab.map((exercise) => exercise.stage),
    [1, 2],
  );
  const summary = quests.map(({ id, stage, level, challengeType, kind, minutes }) => ({
    id,
    stage,
    level,
    challengeType,
    kind,
    minutes,
  }));
  assert.deepEqual(summary, [
    {
      id: 'rust-101',
      stage: 3,
      level: 'beginner',
      challengeType: 'repair',
      kind: 'reparar',
      minutes: 12,
    },
    {
      id: 'rust-102',
      stage: 3,
      level: 'beginner',
      challengeType: 'kata',
      kind: 'completar',
      minutes: 12,
    },
    {
      id: 'rust-103',
      stage: 3,
      level: 'beginner',
      challengeType: 'boss',
      kind: 'completar',
      minutes: 25,
    },
  ]);
  assert.deepEqual(Object.keys(quests[0]), [
    'id',
    'language',
    'topicId',
    'topic',
    'stage',
    'level',
    'challengeType',
    'kind',
    'minutes',
    'imports',
    'visual',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'starter',
    'solution',
    'tests',
    'hints',
    'review',
    'transfer',
    'prediction',
    'sources',
  ]);
});

function coresFixture(): string {
  const files: Record<string, string> = {};
  for (const language of ['rust', 'go'] as const) {
    const domains = ['lowlevel', 'infra', 'play', 'pc']
      .map((domain, index) => {
        const id = `${language}-${113 + index}`;
        Object.assign(
          files,
          exerciseFiles(
            language,
            id,
            `level: expert\nminutes: 20\n${domain === 'infra' ? 'workshopId: wal\nchallengeType: kata\n' : ''}${EXERCISE}sources:\n  - title: S\n    url: https://s\n`,
          ),
        );
        return `  ${domain}:\n    - topicId: ${language}-systems-${domain}\n      topic: Núcleo ${domain}\n      exercises:\n        - ${id}\n`;
      })
      .join('');
    const lab = `${language}-01`;
    Object.assign(files, exerciseFiles(language, lab));
    files[`content/${language}/manifest.yaml`] =
      `${DEFAULTS}lab:\n${labStage(`${language}-a`, [lab])}systems:\n${domains}`;
  }
  return fixture(files);
}

test('núcleos: cada dominio con su orden de claves y Rust y Go intercalados', () => {
  const root = coresFixture();
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  assert.deepEqual(
    rust.cores.pc.map((core) => [core.id, core.stage]),
    [['rust-116', 5]],
  );
  assert.deepEqual(Object.keys(rust.cores.pc[0]), [
    'stage',
    'level',
    'kind',
    'minutes',
    'visual',
    'imports',
    'topic',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'hints',
    'review',
    'transfer',
    'prediction',
    'sources',
    'id',
    'language',
    'topicId',
    'starter',
    'solution',
    'tests',
  ]);
  assert.deepEqual(Object.keys(rust.cores.infra[0]).slice(0, 9), [
    'id',
    'language',
    'topicId',
    'topic',
    'workshopId',
    'stage',
    'level',
    'kind',
    'challengeType',
  ]);
  const cores = interleaveCores(rust, go);
  assert.deepEqual(
    cores.lowlevel.map((core) => core.id),
    ['rust-113', 'go-113'],
  );
  assert.deepEqual(
    cores.pc.map((core) => core.id),
    ['rust-116', 'go-116'],
  );
});

test('Go: el archivo empieza con package main y una línea en blanco, que no se publica', () => {
  const root = coresFixture();
  const { lab } = loadLanguage(root, 'go');
  assert.equal(lab[0].starter, '// go-01: inicial');
  writeFileSync(
    join(root, 'content/go/exercises/go-01/solution.go'),
    'package main\n// sin blanco',
  );
  throwsContent(
    () => loadLanguage(root, 'go'),
    'content/go/exercises/go-01/solution.go: debe empezar con «package main» y una línea en blanco',
  );
});

test('Rust: el código se publica byte a byte, sin agregar un salto final', () => {
  const root = rustLab();
  writeFileSync(join(root, 'content/rust/exercises/rust-01/starter.rs'), 'fn a() {\n\tb()\n}');
  assert.equal(loadLanguage(root, 'rust').lab[0].starter, 'fn a() {\n\tb()\n}');
});

const RUST_01 = 'content/rust/exercises/rust-01';

test('validación: pistas, pruebas y predicción', () => {
  const cases: [string, string][] = [
    [
      EXERCISE.replace('  - Pista tres.\n', ''),
      `${RUST_01}/exercise.yaml: hints: se esperaban 3 pistas y hay 2`,
    ],
    [
      EXERCISE.replace('  - id: t1\n', '  - id: t2\n'),
      `${RUST_01}/exercise.yaml: tests[0].id: se esperaba «t1»`,
    ],
    [
      EXERCISE.replace('  answer: 1\n', '  answer: 2\n'),
      `${RUST_01}/exercise.yaml: prediction.answer: 2 no es el índice de una opción: hay 2`,
    ],
    [EXERCISE.replace('title: Sumar\n', ''), `${RUST_01}/exercise.yaml: falta «title»`],
    [`color: rojo\n${EXERCISE}`, `${RUST_01}/exercise.yaml: color: clave desconocida en lab`],
    [
      `stage: 3\n${EXERCISE}`,
      `${RUST_01}/exercise.yaml: stage: no va en exercise.yaml: es la posición de la etapa en el manifiesto`,
    ],
    [
      `kind: arreglar\n${EXERCISE}`,
      `${RUST_01}/exercise.yaml: kind: se esperaba uno de: completar, reparar`,
    ],
  ];
  for (const [yaml, message] of cases) {
    const root = rustLab({ [`${RUST_01}/exercise.yaml`]: yaml });
    throwsContent(() => loadLanguage(root, 'rust'), message);
  }
});

test('validación: manifiesto y carpetas sin faltantes, huérfanos ni repetidos', () => {
  const manifest = 'content/rust/manifest.yaml';
  const orphan = rustLab(exerciseFiles('rust', 'rust-03'));
  throwsContent(
    () => loadLanguage(orphan, 'rust'),
    `content/rust/exercises/rust-03: no figura en ${manifest}`,
  );
  const missing = rustLab();
  rmSync(join(missing, 'content/rust/exercises/rust-02'), { recursive: true });
  throwsContent(
    () => loadLanguage(missing, 'rust'),
    `${manifest}: rust-02 no tiene content/rust/exercises/rust-02`,
  );
  const repeated = rustLab({
    [manifest]: `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01', 'rust-02', 'rust-01'])}`,
  });
  throwsContent(() => loadLanguage(repeated, 'rust'), `${manifest}: ID repetido: rust-01`);
  const extra = rustLab({ [`${RUST_01}/notas.md`]: 'borrador' });
  throwsContent(
    () => loadLanguage(extra, 'rust'),
    `${RUST_01}: debe tener exactamente exercise.yaml, solution.rs, starter.rs; tiene exercise.yaml, notas.md, solution.rs, starter.rs`,
  );
});

test('validación: cada mundo de desafíos tiene reparación, kata y jefe', () => {
  const root = rustLab({
    'content/rust/manifest.yaml': `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01', 'rust-02'])}quests:
  - topicId: rust-quest-a
    topic: Mundo A
    level: beginner
    minutes: 12
    bossMinutes: 20
    exercises:
      - rust-101
`,
    ...exerciseFiles('rust', 'rust-101'),
  });
  throwsContent(
    () => loadLanguage(root, 'rust'),
    'content/rust/manifest.yaml: quests[0].exercises: cada mundo tiene reparación, kata y jefe, en ese orden',
  );
});

test('validación: un ID no se repite entre lenguajes y cada taller tiene núcleo en los dos', () => {
  const root = coresFixture();
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  throwsContent(
    () => expectDistinctIds(rust, rust),
    'content/go/manifest.yaml: el ID rust-01 también está en content/rust/',
  );
  const shortGo = { ...go, cores: { ...go.cores, pc: [] } };
  throwsContent(
    () => interleaveCores(rust, shortGo),
    'content/go/manifest.yaml: systems.pc tiene 0 núcleos y el de Rust 1',
  );
});

test('validación: bossMinutes sólo existe en los mundos de desafíos', () => {
  const root = rustLab({
    'content/rust/manifest.yaml': `${DEFAULTS}lab:\n${labStage('rust-a', ['rust-01', 'rust-02'])}    bossMinutes: 20\n`,
  });
  throwsContent(
    () => loadLanguage(root, 'rust'),
    'content/rust/manifest.yaml: lab[0].bossMinutes: clave desconocida',
  );
});

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-exercises scenarios PASS.`);
```

- [ ] **Paso 2: Correr las pruebas y ver que fallan**

Ejecutar: `node qa/content-exercises-check.ts`
Esperado: FAIL con `ERR_MODULE_NOT_FOUND` por `tools/content/exercises.ts`.

- [ ] **Paso 3: Implementar**

`tools/content/catalogs.ts`:
```ts
// Forma de los catálogos que publica curriculum.json: lenguajes, dominios de Sistemas y el
// orden de claves de cada catálogo de ejercicios.
export type Language = 'rust' | 'go';
export const LANGUAGES: readonly Language[] = ['rust', 'go'];

export type SystemsDomain = 'lowlevel' | 'infra' | 'play' | 'pc';
export const SYSTEMS_DOMAINS: readonly SystemsDomain[] = ['lowlevel', 'infra', 'play', 'pc'];

// Catálogo publicado al que pertenece un ejercicio: RUST_LAB/GO_LAB, RUST_QUESTS/GO_QUESTS o
// uno de los SYSTEMS_<DOMINIO>_LABS.
export type Catalog = 'lab' | 'quests' | SystemsDomain;

// Orden de claves con que cada catálogo legacy publicaba sus ejercicios: las vistas legacy y
// el oráculo lo observan (Object.keys, JSON.stringify). Sale de `add` (recorrido),
// `defineQuest` (desafíos) y de los literales de cada dominio de núcleos. El orden del YAML
// no importa; una clave que no figure acá es un error.
export const EXERCISE_KEY_ORDER: Record<Catalog, readonly string[]> = {
  lab: [
    'id',
    'language',
    'topicId',
    'topic',
    'stage',
    'kind',
    'minutes',
    'imports',
    'visual',
    'sources',
    'level',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'starter',
    'solution',
    'tests',
    'hints',
    'review',
    'transfer',
    'prediction',
  ],
  quests: [
    'id',
    'language',
    'topicId',
    'topic',
    'stage',
    'level',
    'challengeType',
    'kind',
    'minutes',
    'imports',
    'visual',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'starter',
    'solution',
    'tests',
    'hints',
    'review',
    'transfer',
    'prediction',
    'sources',
  ],
  lowlevel: [
    'id',
    'language',
    'topicId',
    'topic',
    'stage',
    'level',
    'kind',
    'minutes',
    'visual',
    'imports',
    'intro',
    'why',
    'prediction',
    'sources',
    'title',
    'objective',
    'instructions',
    'hints',
    'review',
    'transfer',
    'starter',
    'solution',
    'tests',
  ],
  infra: [
    'id',
    'language',
    'topicId',
    'topic',
    'workshopId',
    'stage',
    'level',
    'kind',
    'challengeType',
    'minutes',
    'visual',
    'imports',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'hints',
    'review',
    'transfer',
    'prediction',
    'sources',
    'starter',
    'solution',
    'tests',
  ],
  play: [
    'id',
    'language',
    'stage',
    'level',
    'topicId',
    'topic',
    'kind',
    'minutes',
    'imports',
    'visual',
    'sources',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'hints',
    'review',
    'prediction',
    'transfer',
    'starter',
    'solution',
    'tests',
  ],
  pc: [
    'stage',
    'level',
    'kind',
    'minutes',
    'visual',
    'imports',
    'topic',
    'title',
    'intro',
    'why',
    'objective',
    'instructions',
    'hints',
    'review',
    'transfer',
    'prediction',
    'sources',
    'id',
    'language',
    'topicId',
    'starter',
    'solution',
    'tests',
  ],
};
// Sólo el recorrido tiene ejercicios sin nivel (75 de 100 por lenguaje).
export const OPTIONAL_EXERCISE_KEYS: Record<Catalog, readonly string[]> = {
  lab: ['level'],
  quests: [],
  lowlevel: [],
  infra: [],
  play: [],
  pc: [],
};
```

`tools/content/exercises.ts`:
```ts
// Ejercicios de content/<lenguaje>/. El manifiesto ordena etapas y ejercicios; cada ejercicio
// se arma como lo hacían las fábricas legacy (`add`, `defineQuest`): los valores de `defaults`,
// los de su etapa y, en los desafíos, los que fija su posición; encima, su exercise.yaml y el
// código de starter y solution. La etapa es la posición de la etapa en el manifiesto.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEVEL_IDS } from '../../src/shared/config/levels.ts';
import { expectSameIds, listDirectories } from './catalog-files.ts';
import {
  EXERCISE_KEY_ORDER,
  OPTIONAL_EXERCISE_KEYS,
  SYSTEMS_DOMAINS,
  type Catalog,
  type Language,
  type SystemsDomain,
} from './catalogs.ts';
import { child, fail, filePlace, type Place } from './content-error.ts';
import {
  checkQuestion,
  checkRecord,
  checkSource,
  expectList,
  expectRecord,
  expectText,
  expectTextList,
  integer,
  listOf,
  oneOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';
import { readYamlFile } from './yaml-file.ts';

export interface LanguageExercises {
  lab: JsonRecord[];
  quests: JsonRecord[];
  cores: Record<SystemsDomain, JsonRecord[]>;
}

// Claves que el manifiesto puede dar por defecto, en `defaults` o en cada etapa.
const DEFAULT_KEYS = ['kind', 'minutes', 'imports', 'visual', 'sources', 'level'];
// Claves que nunca van en exercise.yaml: salen de la carpeta, del manifiesto o del código.
const DERIVED_KEYS: Record<string, string> = {
  id: 'es el nombre de la carpeta',
  language: 'sale de content/<lenguaje>/',
  topicId: 'la define la etapa en el manifiesto',
  topic: 'la define la etapa en el manifiesto',
  stage: 'es la posición de la etapa en el manifiesto',
  starter: 'va en el archivo starter',
  solution: 'va en el archivo solution',
};
const QUEST_ROLES = ['repair', 'kata', 'boss'];
const VISUALS = [
  'flow',
  'memory',
  'ownership',
  'collections',
  'pointers',
  'generics',
  'concurrency',
];
const CODE_EXTENSION: Record<Language, string> = { rust: 'rs', go: 'go' };
// Cada .go empieza con esta cabecera para que gofmt lo pueda parsear; el código publicado,
// como antes, no la incluye.
export const GO_HEADER = 'package main\n\n';

function checkHints(value: unknown, place: Place): string[] {
  const hints = expectTextList(value, place, 1);
  if (hints.length !== 3) fail(place, `se esperaban 3 pistas y hay ${hints.length}`);
  return hints;
}

// Las pruebas se identifican t1, t2…, en orden: así sus IDs son únicos y estables.
function checkTests(value: unknown, place: Place): unknown[] {
  const tests = expectList(value, place, 1);
  tests.forEach((item, index) => {
    const at = child(place, index);
    const test = checkRecord(item, at, {
      id: expectText,
      label: expectText,
      expression: expectText,
      why: expectText,
      failure: expectText,
    });
    const expected = `t${index + 1}`;
    if (test.id !== expected) fail(child(at, 'id'), `se esperaba «${expected}»`);
  });
  return tests;
}

const EXERCISE_CHECKS: Record<string, Check> = {
  id: expectText,
  language: expectText,
  topicId: expectText,
  topic: expectText,
  stage: integer(1),
  level: oneOf(LEVEL_IDS),
  challengeType: oneOf(QUEST_ROLES),
  workshopId: expectText,
  kind: oneOf(['completar', 'reparar']),
  minutes: integer(1),
  imports: textList(0),
  visual: oneOf(VISUALS),
  sources: listOf(checkSource, 1),
  title: expectText,
  intro: expectText,
  why: expectText,
  objective: expectText,
  instructions: textList(1),
  starter: expectText,
  solution: expectText,
  tests: checkTests,
  hints: checkHints,
  review: (value, place) => checkRecord(value, place, { success: expectText, pitfall: expectText }),
  transfer: expectText,
  prediction: checkQuestion,
};

const DEFAULTS_SPEC: Record<string, Check> = Object.fromEntries(
  DEFAULT_KEYS.map((key) => [key, EXERCISE_CHECKS[key]]),
);
const STAGE_SPEC: Record<string, Check> = {
  topicId: expectText,
  topic: expectText,
  ...DEFAULTS_SPEC,
  exercises: textList(1),
};
// Un mundo de desafíos fija nivel y minutos; `bossMinutes` son los del jefe.
const QUEST_STAGE_SPEC: Record<string, Check> = { ...STAGE_SPEC, bossMinutes: integer(1) };
const QUEST_STAGE_OPTIONAL = ['kind', 'imports', 'visual', 'sources'];

function stageList(spec: Record<string, Check>, optional: readonly string[]): Check {
  return (value, place) =>
    expectList(value, place, 1).map((stage, index) =>
      checkRecord(stage, child(place, index), spec, optional),
    );
}

function checkQuestStages(value: unknown, place: Place): unknown[] {
  const stages = stageList(QUEST_STAGE_SPEC, QUEST_STAGE_OPTIONAL)(value, place) as JsonRecord[];
  stages.forEach((stage, index) => {
    if ((stage.exercises as string[]).length !== QUEST_ROLES.length) {
      fail(
        child(child(place, index), 'exercises'),
        'cada mundo tiene reparación, kata y jefe, en ese orden',
      );
    }
  });
  return stages;
}

const MANIFEST_SPEC: Record<string, Check> = {
  defaults: (value, place) => checkRecord(value, place, DEFAULTS_SPEC, DEFAULT_KEYS),
  lab: stageList(STAGE_SPEC, DEFAULT_KEYS),
  quests: checkQuestStages,
  systems: (value, place) =>
    checkRecord(
      value,
      place,
      Object.fromEntries(
        SYSTEMS_DOMAINS.map((domain) => [domain, stageList(STAGE_SPEC, DEFAULT_KEYS)]),
      ),
    ),
};
// El cargador acepta lenguajes sin desafíos ni núcleos (las pruebas los usan); que el currículo
// real los tenga lo exigen content-check y curriculum-ids-check.
const MANIFEST_OPTIONAL = ['quests', 'systems'];

interface Section {
  catalog: Catalog;
  stages: JsonRecord[];
}

// Secciones en el orden en que cuentan las etapas: recorrido, desafíos y núcleos por dominio.
function sectionsOf(manifest: JsonRecord): Section[] {
  const systems = (manifest.systems ?? {}) as JsonRecord;
  return [
    { catalog: 'lab', stages: manifest.lab as JsonRecord[] },
    { catalog: 'quests', stages: (manifest.quests ?? []) as JsonRecord[] },
    ...SYSTEMS_DOMAINS.map((domain) => ({
      catalog: domain,
      stages: (systems[domain] ?? []) as JsonRecord[],
    })),
  ];
}

function pickDefaults(record: JsonRecord): JsonRecord {
  const defaults: JsonRecord = {};
  for (const key of DEFAULT_KEYS) {
    if (Object.hasOwn(record, key)) defaults[key] = record[key];
  }
  return defaults;
}

// Lo que `defineQuest` derivaba de la posición dentro del mundo.
function questDefaults(stage: JsonRecord, position: number): JsonRecord {
  const challengeType = QUEST_ROLES[position];
  return {
    challengeType,
    kind: position === 0 ? 'reparar' : 'completar',
    minutes: challengeType === 'boss' ? stage.bossMinutes : stage.minutes,
  };
}

function checkExerciseFiles(root: string, folder: string, language: Language): void {
  const extension = CODE_EXTENSION[language];
  const expected = ['exercise.yaml', `solution.${extension}`, `starter.${extension}`];
  const found = readdirSync(join(root, folder)).sort();
  if (found.join() !== expected.join()) {
    fail(
      filePlace(folder),
      `debe tener exactamente ${expected.join(', ')}; tiene ${found.join(', ')}`,
    );
  }
}

function readCode(root: string, folder: string, language: Language, name: string): string {
  const file = `${folder}/${name}.${CODE_EXTENSION[language]}`;
  const text = readFileSync(join(root, file), 'utf8');
  if (language === 'rust') return text;
  if (!text.startsWith(GO_HEADER)) {
    fail(filePlace(file), 'debe empezar con «package main» y una línea en blanco');
  }
  return text.slice(GO_HEADER.length);
}

function orderExercise(fields: JsonRecord, catalog: Catalog, place: Place): JsonRecord {
  const order = EXERCISE_KEY_ORDER[catalog];
  for (const key of Object.keys(fields)) {
    if (!order.includes(key)) fail(child(place, key), `clave desconocida en ${catalog}`);
  }
  const exercise: JsonRecord = {};
  for (const key of order) {
    if (Object.hasOwn(fields, key)) {
      EXERCISE_CHECKS[key](fields[key], child(place, key));
      exercise[key] = fields[key];
    } else if (!OPTIONAL_EXERCISE_KEYS[catalog].includes(key)) {
      fail(place, `falta «${key}»`);
    }
  }
  return exercise;
}

interface Slot {
  language: Language;
  catalog: Catalog;
  defaults: JsonRecord;
  stage: JsonRecord;
  stageNumber: number;
  position: number;
  id: string;
}

function buildExercise(root: string, slot: Slot): JsonRecord {
  const folder = `content/${slot.language}/exercises/${slot.id}`;
  checkExerciseFiles(root, folder, slot.language);
  const file = `${folder}/exercise.yaml`;
  const place = filePlace(file);
  const own = expectRecord(readYamlFile(root, file), place);
  for (const [key, reason] of Object.entries(DERIVED_KEYS)) {
    if (Object.hasOwn(own, key)) fail(child(place, key), `no va en exercise.yaml: ${reason}`);
  }
  const fields: JsonRecord = {
    ...slot.defaults,
    ...pickDefaults(slot.stage),
    ...(slot.catalog === 'quests' ? questDefaults(slot.stage, slot.position) : {}),
    ...own,
    id: slot.id,
    language: slot.language,
    topicId: slot.stage.topicId,
    topic: slot.stage.topic,
    stage: slot.stageNumber,
    starter: readCode(root, folder, slot.language, 'starter'),
    solution: readCode(root, folder, slot.language, 'solution'),
  };
  return orderExercise(fields, slot.catalog, place);
}

export function loadLanguage(root: string, language: Language): LanguageExercises {
  const manifestFile = `content/${language}/manifest.yaml`;
  const manifestPlace = filePlace(manifestFile);
  const manifest = checkRecord(
    readYamlFile(root, manifestFile),
    manifestPlace,
    MANIFEST_SPEC,
    MANIFEST_OPTIONAL,
  );
  const sections = sectionsOf(manifest);
  const ids = sections.flatMap(({ stages }) =>
    stages.flatMap((stage) => stage.exercises as string[]),
  );
  const folder = `content/${language}/exercises`;
  expectSameIds(ids, listDirectories(root, folder), manifestPlace, folder, '');

  const result: LanguageExercises = {
    lab: [],
    quests: [],
    cores: { lowlevel: [], infra: [], play: [], pc: [] },
  };
  let stageNumber = 0;
  for (const { catalog, stages } of sections) {
    const target =
      catalog === 'lab' || catalog === 'quests' ? result[catalog] : result.cores[catalog];
    for (const stage of stages) {
      stageNumber += 1;
      (stage.exercises as string[]).forEach((id, position) => {
        const defaults = manifest.defaults as JsonRecord;
        target.push(
          buildExercise(root, { language, catalog, defaults, stage, stageNumber, position, id }),
        );
      });
    }
  }
  return result;
}

function allExercises(exercises: LanguageExercises): JsonRecord[] {
  return [
    ...exercises.lab,
    ...exercises.quests,
    ...SYSTEMS_DOMAINS.flatMap((domain) => exercises.cores[domain]),
  ];
}

// Un ID indexa el progreso: no puede repetirse entre content/rust y content/go.
export function expectDistinctIds(rust: LanguageExercises, go: LanguageExercises): void {
  const rustIds = new Set(allExercises(rust).map((exercise) => exercise.id));
  for (const exercise of allExercises(go)) {
    if (rustIds.has(exercise.id)) {
      fail(
        filePlace('content/go/manifest.yaml'),
        `el ID ${exercise.id} también está en content/rust/`,
      );
    }
  }
}

// Cada SYSTEMS_<DOMINIO>_LABS publica, etapa por etapa, el núcleo Rust y después el Go.
export function interleaveCores(
  rust: LanguageExercises,
  go: LanguageExercises,
): Record<SystemsDomain, JsonRecord[]> {
  const cores: Record<SystemsDomain, JsonRecord[]> = { lowlevel: [], infra: [], play: [], pc: [] };
  for (const domain of SYSTEMS_DOMAINS) {
    const rustCores = rust.cores[domain];
    const goCores = go.cores[domain];
    if (rustCores.length !== goCores.length) {
      fail(
        filePlace('content/go/manifest.yaml'),
        `systems.${domain} tiene ${goCores.length} núcleos y el de Rust ${rustCores.length}`,
      );
    }
    cores[domain] = rustCores.flatMap((core, index) => [core, goCores[index]]);
  }
  return cores;
}
```

- [ ] **Paso 4: Correr las pruebas y ver que pasan**

Ejecutar: `node qa/content-exercises-check.ts`
Esperado: diez `PASS` y `10 content-exercises scenarios PASS.`

- [ ] **Paso 5: Sumar el check a la suite**

En `qa/run-checks.ts`, después de `'content-tools-check.ts',`, agregar:
```ts
  'content-exercises-check.ts',
```

Ejecutar: `npm test && npm run lint && npm run format:check && git diff --check`
Esperado: `26 checks passed.`; `npm run lint` sin avisos nuevos.

- [ ] **Paso 6: Commit**

```bash
git add tools/content/catalogs.ts tools/content/exercises.ts qa/content-exercises-check.ts qa/run-checks.ts
git commit -m "feat(contenido): cargador de ejercicios con valores por defecto y orden de claves legacy"
```

---

### Tarea 5: Recorrido de Rust en YAML, generador y scripts

Primera migración completa: `RUST_LAB` pasa a `content/rust/` y aparecen el generador, los
scripts y la importación del JSON.

**Archivos:**
- Crear: `content/rust/manifest.yaml` y `content/rust/exercises/rust-01/` a `rust-100/`, escritos
  por el codemod; `tools/content/load-curriculum.ts` y `tools/content/build-curriculum.ts`.
- Crear y borrar en la misma tarea: `tools/content/migrate-rust-lab.ts`.
- Modificar:
  - `src/entities/exercise/content/rust-lab.ts`, sólo hasta borrarlo;
  - `src/app/legacy/register-catalogs.ts`;
  - `package.json` (scripts) y `tsconfig.app.json`, que integra el agente principal.
- Borrar: `src/entities/exercise/content/rust-lab.ts`.

**Interfaces:**
- Consume `loadLanguage` (tarea 4) e `importModule` y `repoRoot` de `qa/lib/sources.ts`.
- Produce `loadCurriculum(root): Curriculum`, por ahora con `lab.rust`, y `npm run curriculum`,
  que escribe `build/curriculum.json`.
- `pretypecheck` y `predev` corren `npm run curriculum`; `window.RUST_LAB` sale de
  `curriculum.lab.rust`.

- [ ] **Paso 1: Exponer los valores por defecto de la fábrica**

Las etapas 7 y 11 a 20 redefinen `sources` en sus cinco ejercicios, así que el catálogo publicado
no muestra el valor por defecto. El codemod lo toma de la fábrica. Este archivo se borra al final
de la tarea.

En `src/entities/exercise/content/rust-lab.ts`, reemplazar:
```ts
// El número es el ID publicado (rust-01…rust-100); la etapa se deriva de él.
function add(number: number, item: ExerciseDraft): void {
  const stage = Math.ceil(number / EXERCISES_PER_STAGE);
  const [topicId, topic, chapter] = topics[stage - 1];
  exercises.push({
    id: formatExerciseId('rust', number),
    language: 'rust',
    topicId,
    topic,
    stage,
    kind: 'completar',
    minutes: stage < 4 ? 8 : 12,
    imports: [],
    visual: 'flow',
    sources: [src('The Rust Book · ' + topic, 'https://doc.rust-lang.org/book/' + chapter)],
    ...item,
    tests: numberTests(item.tests),
  });
}
```
por:
```ts
// Valores por defecto de una etapa. Se exportan sólo durante la migración a content/ (plan A1,
// tarea 5): el codemod los copia al manifiesto y este archivo se borra en la misma tarea.
export function stageDefaults(stage: number) {
  const [topicId, topic, chapter] = topics[stage - 1];
  return {
    topicId,
    topic,
    kind: 'completar' as const,
    minutes: stage < 4 ? 8 : 12,
    imports: [] as string[],
    visual: 'flow' as const,
    sources: [src('The Rust Book · ' + topic, 'https://doc.rust-lang.org/book/' + chapter)],
  };
}

// El número es el ID publicado (rust-01…rust-100); la etapa se deriva de él.
function add(number: number, item: ExerciseDraft): void {
  const stage = Math.ceil(number / EXERCISES_PER_STAGE);
  const { topicId, topic, ...defaults } = stageDefaults(stage);
  exercises.push({
    id: formatExerciseId('rust', number),
    language: 'rust',
    topicId,
    topic,
    stage,
    ...defaults,
    ...item,
    tests: numberTests(item.tests),
  });
}
```

Ejecutar: `npx tsc --noEmit -p tsconfig.app.json && node tools/content/dump-globals.ts . | sha256sum`
Esperado: `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`. La extracción no
cambia nada observable.

- [ ] **Paso 2: Escribir el codemod**

`tools/content/migrate-rust-lab.ts`:
```ts
// Codemod de un solo uso (plan A1, tarea 5): pasa RUST_LAB de rust-lab.ts a content/rust/.
// Se borra en la misma tarea, después de verificar el oráculo.
// Uso: node tools/content/migrate-rust-lab.ts
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { Document, stringify, visit } from 'yaml';
import { importModule, repoRoot } from '../../qa/lib/sources.ts';
import { loadLanguage } from './exercises.ts';

type Fields = Record<string, unknown>;
interface RustLabModule {
  rustLab: Fields[];
  stageDefaults: (stage: number) => Fields;
}

const { rustLab, stageDefaults } = await importModule<RustLabModule>(
  'src/entities/exercise/content/rust-lab.ts',
);

// Lo que `add` da a todas las etapas va una sola vez en `defaults`.
const LANGUAGE_DEFAULTS: Fields = { kind: 'completar', imports: [], visual: 'flow' };
const DERIVED = new Set(['id', 'language', 'topicId', 'topic', 'stage', 'starter', 'solution']);
// Orden de lectura de exercise.yaml. No cambia el JSON: el generador publica cada catálogo con
// su orden de claves legacy.
const AUTHORING_ORDER = [
  'title',
  'level',
  'kind',
  'minutes',
  'imports',
  'visual',
  'workshopId',
  'challengeType',
  'intro',
  'why',
  'objective',
  'instructions',
  'tests',
  'hints',
  'review',
  'transfer',
  'prediction',
  'sources',
];
const HEADER = `# Etapas de Rust en orden. La etapa de un ejercicio es la posición de su etapa en este
# archivo, contando las secciones en orden: lab, quests y systems. Los IDs son inmutables:
# indexan el progreso guardado. El orden sale de acá, nunca del número del ID.
# Cada ejercicio toma \`defaults\`, después los valores de su etapa y encima su exercise.yaml.
`;

// Seis expresiones de prueba tienen tabuladores o espacios antes de un salto de línea. En
// estilo bloque dejarían espacios al final de la línea, que `git diff --check` rechaza y
// Prettier podría recortar; entre comillas dobles (con escapes JSON) quedan en una línea.
function toYaml(value: unknown): string {
  const document = new Document(value);
  visit(document, {
    Scalar(_key, node) {
      if (typeof node.value === 'string' && /\t|[ \t]\n/.test(node.value)) {
        node.type = 'QUOTE_DOUBLE';
      }
    },
  });
  return document.toString({ lineWidth: 0, doubleQuotedAsJSON: true });
}

function stageFields(stage: number): { topicId: unknown; topic: unknown; defaults: Fields } {
  const { topicId, topic, ...defaults } = stageDefaults(stage);
  return { topicId, topic, defaults };
}

function differing(values: Fields, base: Fields): Fields {
  const result: Fields = {};
  for (const [key, value] of Object.entries(values)) {
    if (!isDeepStrictEqual(value, base[key])) result[key] = value;
  }
  return result;
}

const stageIds = new Map<number, string[]>();
for (const exercise of rustLab) {
  const stage = exercise.stage as number;
  stageIds.set(stage, [...(stageIds.get(stage) ?? []), exercise.id as string]);
}
const lab = [...stageIds].map(([stage, exercises]) => {
  const { topicId, topic, defaults } = stageFields(stage);
  return { topicId, topic, ...differing(defaults, LANGUAGE_DEFAULTS), exercises };
});
mkdirSync(join(repoRoot, 'content/rust/exercises'), { recursive: true });
writeFileSync(
  join(repoRoot, 'content/rust/manifest.yaml'),
  HEADER + stringify({ defaults: LANGUAGE_DEFAULTS, lab }, { lineWidth: 0 }),
);

for (const exercise of rustLab) {
  const { defaults } = stageFields(exercise.stage as number);
  const inherited: Fields = { ...LANGUAGE_DEFAULTS, ...defaults };
  for (const key of Object.keys(exercise)) {
    assert.ok(DERIVED.has(key) || AUTHORING_ORDER.includes(key), `${exercise.id}: clave ${key}`);
  }
  const own: Fields = {};
  for (const key of AUTHORING_ORDER) {
    if (!Object.hasOwn(exercise, key)) continue;
    if (Object.hasOwn(inherited, key) && isDeepStrictEqual(exercise[key], inherited[key])) continue;
    own[key] = exercise[key];
  }
  const folder = join(repoRoot, 'content/rust/exercises', exercise.id as string);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'exercise.yaml'), toYaml(own));
  writeFileSync(join(folder, 'starter.rs'), exercise.starter as string);
  writeFileSync(join(folder, 'solution.rs'), exercise.solution as string);
}

// El cargador real tiene que reconstruir RUST_LAB idéntico, con el mismo orden de claves.
assert.equal(JSON.stringify(loadLanguage(repoRoot, 'rust').lab), JSON.stringify(rustLab));
console.log(
  `content/rust: ${lab.length} etapas y ${rustLab.length} ejercicios; RUST_LAB idéntico.`,
);
```

- [ ] **Paso 3: Correr el codemod y formatear**

Ejecutar:
```bash
node tools/content/migrate-rust-lab.ts && npx prettier --write content && (grep -rln '[[:space:]]$' content || echo 'sin espacios finales')
```
Esperado:
- `content/rust: 20 etapas y 100 ejercicios; RUST_LAB idéntico.`;
- `sin espacios finales`.

Las seis expresiones con `\t` o `\n` quedan entre comillas dobles. Por ejemplo, en
`content/rust/exercises/rust-19/exercise.yaml`:
`expression: "primera_orden(\" \t SET\nclave\") == \"SET\""`.

- [ ] **Paso 4: Escribir el generador**

`tools/content/load-curriculum.ts`:
```ts
// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos.
import { loadLanguage } from './exercises.ts';
import type { JsonRecord } from './shape.ts';

export interface Curriculum {
  lab: { rust: JsonRecord[] };
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  return {
    lab: { rust: rust.lab },
  };
}
```

`tools/content/build-curriculum.ts`:
```ts
// Valida content/ y escribe build/curriculum.json, que importan los adaptadores legacy.
// Lo corren `npm run typecheck` (y por eso build y test) y `npm run dev` antes de empezar.
// Uso: node tools/content/build-curriculum.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ContentError } from './content-error.ts';
import { loadCurriculum } from './load-curriculum.ts';

const root = resolve(import.meta.dirname, '..', '..');
try {
  const curriculum = loadCurriculum(root);
  mkdirSync(join(root, 'build'), { recursive: true });
  writeFileSync(join(root, 'build', 'curriculum.json'), JSON.stringify(curriculum, null, 2) + '\n');
} catch (error) {
  if (!(error instanceof ContentError)) throw error;
  console.error(`content/ no es válido: ${error.message}`);
  process.exitCode = 1;
}
```

- [ ] **Paso 5: Scripts y TypeScript (lo integra el agente principal)**

En `package.json`, dentro de `scripts`:
- antes de `"dev": "vite",`, agregar:
```json
    "curriculum": "node tools/content/build-curriculum.ts",
    "predev": "npm run curriculum",
```
- antes de la línea que empieza con `"typecheck":`, agregar:
```json
    "pretypecheck": "npm run curriculum",
```

`build` y `pretest` pasan por `typecheck`, así que `npm run build`, `npm test` y la imagen
Docker regeneran el JSON antes de tipar, empaquetar o correr los checks.

En `tsconfig.app.json`, después de `"jsx": "react-jsx",`, agregar:
```json
    "resolveJsonModule": true,
```

TypeScript 6 ya resuelve JSON con `moduleResolution: "Bundler"`; la opción explícita documenta
que los adaptadores importan `build/curriculum.json`.

- [ ] **Paso 6: El adaptador lee el JSON**

`src/app/legacy/register-catalogs.ts`:
```ts
// Los catálogos salen de content/ (YAML y código) a través de build/curriculum.json, que
// genera tools/content/build-curriculum.ts antes de `npm run typecheck` y de `npm run dev`.
import curriculum from '../../../build/curriculum.json';
import { goWorlds } from '../../entities/campaign/content/go-worlds';
import { rustWorlds } from '../../entities/campaign/content/rust-worlds';
import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import { goLab } from '../../entities/exercise/content/go-lab';
import { goQuests } from '../../entities/exercise/content/go-quests';
import { rustQuests } from '../../entities/exercise/content/rust-quests';
import { guideData, type GuideData } from '../../entities/guide';

declare global {
  interface Window {
    GUIDE_DATA: GuideData;
    RUST_LAB: Exercise[];
    GO_LAB: Exercise[];
    RUST_QUESTS: Exercise[];
    GO_QUESTS: Exercise[];
    RUST_CAMPAIGN: CampaignWorldDefinition[];
    GO_CAMPAIGN: CampaignWorldDefinition[];
  }
}

window.GUIDE_DATA = guideData;
window.RUST_LAB = curriculum.lab.rust as Exercise[];
window.GO_LAB = goLab;
window.RUST_QUESTS = rustQuests;
window.GO_QUESTS = goQuests;
window.RUST_CAMPAIGN = rustWorlds;
window.GO_CAMPAIGN = goWorlds;
```

- [ ] **Paso 7: Borrar la fuente reemplazada y el codemod**

```bash
rm src/entities/exercise/content/rust-lab.ts && rm tools/content/migrate-rust-lab.ts
```

- [ ] **Paso 8: Verificar el oráculo y el código**

Ejecutar:
```bash
npm run typecheck && node tools/content/dump-globals.ts . | sha256sum && node qa/runtime-check.ts rust --audit-record
```
Esperado:
- el oráculo da `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`;
- `rust: 137/137 current reference programs match validated hashes; 411 assertions.`

- [ ] **Paso 9: El JSON se regenera solo y un error se informa**

Ejecutar:
```bash
rm -f build/curriculum.json && npm test
```
Esperado: `26 checks passed.` (`pretest` regeneró el JSON).

Ejecutar:
```bash
cp content/rust/exercises/rust-01/exercise.yaml build/rust-01.yaml
node -e "const fs = require('node:fs'); const file = 'content/rust/exercises/rust-01/exercise.yaml'; fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('  - Escribí celdas * 7 sin punto y coma al final.\n', ''))"
npm run curriculum; echo "exit=$?"
cp build/rust-01.yaml content/rust/exercises/rust-01/exercise.yaml && npm run curriculum
```
Esperado:
- primero, `content/ no es válido: content/rust/exercises/rust-01/exercise.yaml: hints: se
  esperaban 3 pistas y hay 2` y `exit=1`;
- después de restaurar, `npm run curriculum` termina sin error.

- [ ] **Paso 10: Verificación completa**

Ejecutar: `npm run lint && npm run format:check && git add -N content/rust && git diff --check`
Esperado: sin errores, sin avisos nuevos y sin espacios finales.

`git add -N` registra los archivos nuevos sin contenido para que `git diff --check` los revise.

- [ ] **Paso 11: Commit**

```bash
git add content/rust tools/content/load-curriculum.ts tools/content/build-curriculum.ts src/app/legacy/register-catalogs.ts src/entities/exercise/content/rust-lab.ts package.json tsconfig.app.json
git commit -m "refactor(contenido): recorrido de Rust en content/rust y build/curriculum.json"
```

---

### Tarea 6: Recorrido de Go en YAML

**Archivos:**
- Crear: `content/go/manifest.yaml` y `content/go/exercises/go-01/` a `go-100/`, escritos por el
  codemod.
- Crear y borrar en la misma tarea: `tools/content/migrate-go-lab.ts`.
- Modificar: `src/entities/exercise/content/go-lab.ts` (sólo hasta borrarlo),
  `tools/content/load-curriculum.ts` y `src/app/legacy/register-catalogs.ts`.
- Borrar: `src/entities/exercise/content/go-lab.ts`.

**Interfaces:**
- Consume `loadLanguage`, `expectDistinctIds` y `GO_HEADER` (tarea 4).
- Produce `curriculum.lab.go`, que publica `window.GO_LAB`.

- [ ] **Paso 1: Exponer los valores por defecto de la fábrica**

En Go, la fábrica fija `visual` en las etapas 3, 4, 5, 11, 12 y 13, y `level` en las etapas 16
a 20. Además, cinco etapas redefinen `imports` o `sources` en todos sus ejercicios.

En `src/entities/exercise/content/go-lab.ts`, reemplazar:
```ts
// El número es el ID publicado (go-01…go-100); la etapa se deriva de él.
function add(number: number, exercise: ExerciseDraft): void {
  const stage = Math.ceil(number / EXERCISES_PER_STAGE);
  const topic = topics[stage - 1];
  exercises.push({
    id: formatExerciseId('go', number),
    language: 'go',
    topicId: topic[0],
    topic: topic[1],
    stage,
    kind: 'completar',
    minutes: stage < 5 ? 10 : 15,
    imports: [],
    visual: visualForStage(stage),
    sources: [{ title: topic[3], url: topic[2] }],
    ...(topic[4] ? { level: topic[4] } : {}),
    ...exercise,
    tests: numberTests(exercise.tests),
  });
}
```
por:
```ts
// Valores por defecto de una etapa. Se exportan sólo durante la migración a content/ (plan A1,
// tarea 6): el codemod los copia al manifiesto y este archivo se borra en la misma tarea.
export function stageDefaults(stage: number) {
  const topic = topics[stage - 1];
  return {
    topicId: topic[0],
    topic: topic[1],
    kind: 'completar' as const,
    minutes: stage < 5 ? 10 : 15,
    imports: [] as string[],
    visual: visualForStage(stage),
    sources: [{ title: topic[3], url: topic[2] }],
    ...(topic[4] ? { level: topic[4] } : {}),
  };
}

// El número es el ID publicado (go-01…go-100); la etapa se deriva de él.
function add(number: number, exercise: ExerciseDraft): void {
  const stage = Math.ceil(number / EXERCISES_PER_STAGE);
  const { topicId, topic, ...defaults } = stageDefaults(stage);
  exercises.push({
    id: formatExerciseId('go', number),
    language: 'go',
    topicId,
    topic,
    stage,
    ...defaults,
    ...exercise,
    tests: numberTests(exercise.tests),
  });
}
```

Ejecutar: `npm run typecheck && node tools/content/dump-globals.ts . | sha256sum`
Esperado: `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`.

- [ ] **Paso 2: Escribir el codemod**

`tools/content/migrate-go-lab.ts`:
```ts
// Codemod de un solo uso (plan A1, tarea 6): pasa GO_LAB de go-lab.ts a content/go/.
// Se borra en la misma tarea, después de verificar el oráculo.
// Uso: node tools/content/migrate-go-lab.ts
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { stringify } from 'yaml';
import { importModule, repoRoot } from '../../qa/lib/sources.ts';
import { GO_HEADER, loadLanguage } from './exercises.ts';

type Fields = Record<string, unknown>;
interface GoLabModule {
  goLab: Fields[];
  stageDefaults: (stage: number) => Fields;
}

const { goLab, stageDefaults } = await importModule<GoLabModule>(
  'src/entities/exercise/content/go-lab.ts',
);

// Lo que `add` da a todas las etapas va una sola vez en `defaults`.
const LANGUAGE_DEFAULTS: Fields = { kind: 'completar', imports: [], visual: 'flow' };
const DERIVED = new Set(['id', 'language', 'topicId', 'topic', 'stage', 'starter', 'solution']);
// Orden de lectura de exercise.yaml. No cambia el JSON: el generador publica cada catálogo con
// su orden de claves legacy.
const AUTHORING_ORDER = [
  'title',
  'level',
  'kind',
  'minutes',
  'imports',
  'visual',
  'workshopId',
  'challengeType',
  'intro',
  'why',
  'objective',
  'instructions',
  'tests',
  'hints',
  'review',
  'transfer',
  'prediction',
  'sources',
];
const HEADER = `# Etapas de Go en orden. La etapa de un ejercicio es la posición de su etapa en este
# archivo, contando las secciones en orden: lab, quests y systems. Los IDs son inmutables:
# indexan el progreso guardado. El orden sale de acá, nunca del número del ID.
# Cada ejercicio toma \`defaults\`, después los valores de su etapa y encima su exercise.yaml.
`;

function stageFields(stage: number): { topicId: unknown; topic: unknown; defaults: Fields } {
  const { topicId, topic, ...defaults } = stageDefaults(stage);
  return { topicId, topic, defaults };
}

function differing(values: Fields, base: Fields): Fields {
  const result: Fields = {};
  for (const [key, value] of Object.entries(values)) {
    if (!isDeepStrictEqual(value, base[key])) result[key] = value;
  }
  return result;
}

const stageIds = new Map<number, string[]>();
for (const exercise of goLab) {
  const stage = exercise.stage as number;
  stageIds.set(stage, [...(stageIds.get(stage) ?? []), exercise.id as string]);
}
const lab = [...stageIds].map(([stage, exercises]) => {
  const { topicId, topic, defaults } = stageFields(stage);
  return { topicId, topic, ...differing(defaults, LANGUAGE_DEFAULTS), exercises };
});
mkdirSync(join(repoRoot, 'content/go/exercises'), { recursive: true });
writeFileSync(
  join(repoRoot, 'content/go/manifest.yaml'),
  HEADER + stringify({ defaults: LANGUAGE_DEFAULTS, lab }, { lineWidth: 0 }),
);

for (const exercise of goLab) {
  const { defaults } = stageFields(exercise.stage as number);
  const inherited: Fields = { ...LANGUAGE_DEFAULTS, ...defaults };
  for (const key of Object.keys(exercise)) {
    assert.ok(DERIVED.has(key) || AUTHORING_ORDER.includes(key), `${exercise.id}: clave ${key}`);
  }
  const own: Fields = {};
  for (const key of AUTHORING_ORDER) {
    if (!Object.hasOwn(exercise, key)) continue;
    if (Object.hasOwn(inherited, key) && isDeepStrictEqual(exercise[key], inherited[key])) continue;
    own[key] = exercise[key];
  }
  const folder = join(repoRoot, 'content/go/exercises', exercise.id as string);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'exercise.yaml'), stringify(own, { lineWidth: 0 }));
  writeFileSync(join(folder, 'starter.go'), GO_HEADER + (exercise.starter as string));
  writeFileSync(join(folder, 'solution.go'), GO_HEADER + (exercise.solution as string));
}

// El cargador real tiene que reconstruir GO_LAB idéntico, con el mismo orden de claves.
assert.equal(JSON.stringify(loadLanguage(repoRoot, 'go').lab), JSON.stringify(goLab));
console.log(`content/go: ${lab.length} etapas y ${goLab.length} ejercicios; GO_LAB idéntico.`);
```

- [ ] **Paso 3: Correr el codemod y formatear**

Ejecutar:
```bash
node tools/content/migrate-go-lab.ts && npx prettier --write content && (grep -rln '[[:space:]]$' content || echo 'sin espacios finales')
```
Esperado: `content/go: 20 etapas y 100 ejercicios; GO_LAB idéntico.` y `sin espacios finales`.

Cada `.go` empieza con `package main` y una línea en blanco. El resto queda igual al string de
hoy, con su indentación de cuatro espacios.

- [ ] **Paso 4: Sumar Go al generador**

`tools/content/load-curriculum.ts`:
```ts
// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos.
import type { Language } from './catalogs.ts';
import { expectDistinctIds, loadLanguage } from './exercises.ts';
import type { JsonRecord } from './shape.ts';

export interface Curriculum {
  lab: Record<Language, JsonRecord[]>;
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  return {
    lab: { rust: rust.lab, go: go.lab },
  };
}
```

- [ ] **Paso 5: El adaptador lee `GO_LAB` del JSON**

`src/app/legacy/register-catalogs.ts`:
```ts
// Los catálogos salen de content/ (YAML y código) a través de build/curriculum.json, que
// genera tools/content/build-curriculum.ts antes de `npm run typecheck` y de `npm run dev`.
import curriculum from '../../../build/curriculum.json';
import { goWorlds } from '../../entities/campaign/content/go-worlds';
import { rustWorlds } from '../../entities/campaign/content/rust-worlds';
import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import { goQuests } from '../../entities/exercise/content/go-quests';
import { rustQuests } from '../../entities/exercise/content/rust-quests';
import { guideData, type GuideData } from '../../entities/guide';

declare global {
  interface Window {
    GUIDE_DATA: GuideData;
    RUST_LAB: Exercise[];
    GO_LAB: Exercise[];
    RUST_QUESTS: Exercise[];
    GO_QUESTS: Exercise[];
    RUST_CAMPAIGN: CampaignWorldDefinition[];
    GO_CAMPAIGN: CampaignWorldDefinition[];
  }
}

window.GUIDE_DATA = guideData;
window.RUST_LAB = curriculum.lab.rust as Exercise[];
window.GO_LAB = curriculum.lab.go as Exercise[];
window.RUST_QUESTS = rustQuests;
window.GO_QUESTS = goQuests;
window.RUST_CAMPAIGN = rustWorlds;
window.GO_CAMPAIGN = goWorlds;
```

- [ ] **Paso 6: Borrar la fuente reemplazada y el codemod**

```bash
rm src/entities/exercise/content/go-lab.ts && rm tools/content/migrate-go-lab.ts
```

- [ ] **Paso 7: Verificar**

Ejecutar:
```bash
npm run typecheck && node tools/content/dump-globals.ts . | sha256sum && node qa/runtime-check.ts go --audit-record
npm test && npm run lint && npm run format:check && git add -N content/go && git diff --check
```
Esperado:
- el oráculo da `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`;
- `go: 137/137 current reference programs match validated hashes; 411 assertions.`;
- `26 checks passed.` y el resto en verde.

- [ ] **Paso 8: Commit**

```bash
git add content/go tools/content/load-curriculum.ts src/app/legacy/register-catalogs.ts src/entities/exercise/content/go-lab.ts
git commit -m "refactor(contenido): recorrido de Go en content/go"
```

---

### Tarea 7: Desafíos de campaña

**Archivos:**
- Crear: la sección `quests` de los dos manifiestos y `content/<lenguaje>/exercises/<lenguaje>-101/`
  a `-112/`, escritos por el codemod.
- Crear y borrar en la misma tarea: `tools/content/migrate-quests.ts`.
- Modificar:
  - `src/entities/exercise/content/rust-quests.ts` y `go-quests.ts`, sólo hasta borrarlos;
  - `tools/content/load-curriculum.ts` y `src/app/legacy/register-catalogs.ts`;
  - `src/entities/exercise/model/types.ts` y `src/entities/exercise/index.ts`.
- Borrar:
  - `src/entities/exercise/content/rust-quests.ts` y `go-quests.ts`;
  - `src/entities/exercise/model/define-quest.ts` y `src/entities/exercise/model/builders.ts`,
    cuyos únicos consumidores eran los catálogos;
  - los tipos `ExerciseTestDraft`, `ExerciseDraft` y `QuestDraft`.

**Interfaces:**
- Consume `defineQuest` (sólo en el codemod) y `loadLanguage`.
- Produce `curriculum.quests.{rust,go}`, que publica `window.RUST_QUESTS` y `window.GO_QUESTS`.
- La API pública de `entities/exercise` deja de exportar los tipos de borrador.

- [ ] **Paso 1: Exponer el catálogo de cada fábrica**

En `src/entities/exercise/content/rust-quests.ts` y en `go-quests.ts`, reemplazar:
```ts
const catalog: QuestCatalog = {
```
por:
```ts
export const catalog: QuestCatalog = {
```

`bossMinutes` y los mundos son la configuración de `defineQuest`. El codemod llama a la fábrica
con un borrador vacío para ver qué completa en cada posición.

Ejecutar: `npm run curriculum && node tools/content/dump-globals.ts . | sha256sum`
Esperado: `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`.

- [ ] **Paso 2: Escribir el codemod**

`tools/content/migrate-quests.ts`:
```ts
// Codemod de un solo uso (plan A1, tarea 7): pasa RUST_QUESTS y GO_QUESTS a content/<lenguaje>/.
// Se borra en la misma tarea, después de verificar el oráculo.
// Uso: node tools/content/migrate-quests.ts
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { stringify } from 'yaml';
import { importModule, repoRoot } from '../../qa/lib/sources.ts';
import { GO_HEADER, loadLanguage } from './exercises.ts';

type Fields = Record<string, unknown>;
interface QuestCatalog {
  language: 'rust' | 'go';
  worlds: { topicId: string; topic: string; level: string }[];
  bossMinutes: number;
}
type DefineQuest = (catalog: QuestCatalog, number: number, draft: Fields) => Fields;

const { defineQuest } = await importModule<{ defineQuest: DefineQuest }>(
  'src/entities/exercise/model/define-quest.ts',
);
const DERIVED = new Set(['id', 'language', 'topicId', 'topic', 'stage', 'starter', 'solution']);
// Orden de lectura de exercise.yaml. No cambia el JSON: el generador publica cada catálogo con
// su orden de claves legacy.
const AUTHORING_ORDER = [
  'title',
  'level',
  'kind',
  'minutes',
  'imports',
  'visual',
  'workshopId',
  'challengeType',
  'intro',
  'why',
  'objective',
  'instructions',
  'tests',
  'hints',
  'review',
  'transfer',
  'prediction',
  'sources',
];
const FIRST_QUEST = 101;
const QUESTS_PER_WORLD = 3;

async function migrate(language: 'rust' | 'go', exportName: string): Promise<void> {
  const module = await importModule<Record<string, unknown>>(
    `src/entities/exercise/content/${language}-quests.ts`,
  );
  const quests = module[exportName] as Fields[];
  const catalog = module.catalog as QuestCatalog;
  // defineQuest con un borrador vacío muestra lo que la fábrica completa en cada posición.
  const probe = (index: number): Fields => defineQuest(catalog, FIRST_QUEST + index, { tests: [] });

  const stages = catalog.worlds.map((world, worldIndex) => {
    const first = worldIndex * QUESTS_PER_WORLD;
    return {
      topicId: world.topicId,
      topic: world.topic,
      level: world.level,
      minutes: probe(first).minutes,
      bossMinutes: probe(first + 2).minutes,
      exercises: quests.slice(first, first + QUESTS_PER_WORLD).map((quest) => quest.id),
    };
  });
  appendFileSync(
    join(repoRoot, `content/${language}/manifest.yaml`),
    stringify({ quests: stages }, { lineWidth: 0 }),
  );

  const extension = language === 'rust' ? 'rs' : 'go';
  const header = language === 'go' ? GO_HEADER : '';
  quests.forEach((quest, index) => {
    const inherited = probe(index);
    for (const key of Object.keys(quest)) {
      assert.ok(DERIVED.has(key) || AUTHORING_ORDER.includes(key), `${quest.id}: clave ${key}`);
    }
    const own: Fields = {};
    for (const key of AUTHORING_ORDER) {
      if (!Object.hasOwn(quest, key)) continue;
      if (Object.hasOwn(inherited, key) && isDeepStrictEqual(quest[key], inherited[key])) continue;
      own[key] = quest[key];
    }
    const folder = join(repoRoot, `content/${language}/exercises`, quest.id as string);
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'exercise.yaml'), stringify(own, { lineWidth: 0 }));
    writeFileSync(join(folder, `starter.${extension}`), header + (quest.starter as string));
    writeFileSync(join(folder, `solution.${extension}`), header + (quest.solution as string));
  });

  // El cargador real tiene que reconstruir el catálogo idéntico, con el mismo orden de claves.
  assert.equal(JSON.stringify(loadLanguage(repoRoot, language).quests), JSON.stringify(quests));
  console.log(
    `content/${language}: ${stages.length} mundos y ${quests.length} desafíos idénticos.`,
  );
}

await migrate('rust', 'rustQuests');
await migrate('go', 'goQuests');
```

- [ ] **Paso 3: Correr el codemod y formatear**

Ejecutar:
```bash
node tools/content/migrate-quests.ts && npx prettier --write content && (grep -rln '[[:space:]]$' content || echo 'sin espacios finales')
```
Esperado: `content/rust: 4 mundos y 12 desafíos idénticos.`, la misma línea para `content/go` y
`sin espacios finales`.

Cada manifiesto suma la sección `quests`, con `minutes: 12` y `bossMinutes` (20 en Rust, 25 en
Go). En `exercise.yaml` quedan sólo las diferencias reales: por ejemplo, `minutes: 25` en
`rust-109` y `rust-112`, `visual` y, en Go, `imports`.

- [ ] **Paso 4: Sumar los desafíos al generador**

`tools/content/load-curriculum.ts`:
```ts
// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos.
import type { Language } from './catalogs.ts';
import { expectDistinctIds, loadLanguage } from './exercises.ts';
import type { JsonRecord } from './shape.ts';

export interface Curriculum {
  lab: Record<Language, JsonRecord[]>;
  quests: Record<Language, JsonRecord[]>;
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  return {
    lab: { rust: rust.lab, go: go.lab },
    quests: { rust: rust.quests, go: go.quests },
  };
}
```

- [ ] **Paso 5: El adaptador lee los desafíos del JSON**

`src/app/legacy/register-catalogs.ts`:
```ts
// Los catálogos salen de content/ (YAML y código) a través de build/curriculum.json, que
// genera tools/content/build-curriculum.ts antes de `npm run typecheck` y de `npm run dev`.
import curriculum from '../../../build/curriculum.json';
import { goWorlds } from '../../entities/campaign/content/go-worlds';
import { rustWorlds } from '../../entities/campaign/content/rust-worlds';
import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import { guideData, type GuideData } from '../../entities/guide';

declare global {
  interface Window {
    GUIDE_DATA: GuideData;
    RUST_LAB: Exercise[];
    GO_LAB: Exercise[];
    RUST_QUESTS: Exercise[];
    GO_QUESTS: Exercise[];
    RUST_CAMPAIGN: CampaignWorldDefinition[];
    GO_CAMPAIGN: CampaignWorldDefinition[];
  }
}

window.GUIDE_DATA = guideData;
window.RUST_LAB = curriculum.lab.rust as Exercise[];
window.GO_LAB = curriculum.lab.go as Exercise[];
window.RUST_QUESTS = curriculum.quests.rust as Exercise[];
window.GO_QUESTS = curriculum.quests.go as Exercise[];
window.RUST_CAMPAIGN = rustWorlds;
window.GO_CAMPAIGN = goWorlds;
```

- [ ] **Paso 6: Borrar las fuentes reemplazadas, las fábricas y el codemod**

```bash
rm src/entities/exercise/content/rust-quests.ts src/entities/exercise/content/go-quests.ts src/entities/exercise/model/define-quest.ts src/entities/exercise/model/builders.ts
rm tools/content/migrate-quests.ts
```

En `src/entities/exercise/model/types.ts`, borrar desde
`export type ExerciseTestDraft = Omit<ExerciseTest, 'id'>;` hasta el final del archivo. Es este
bloque, que ya no tiene consumidores:
```ts
export type ExerciseTestDraft = Omit<ExerciseTest, 'id'>;

// Lo que declara cada llamada a una fábrica: el texto del ejercicio y, opcionalmente,
// los campos que reemplazan los valores por defecto de su etapa.
export interface ExerciseDraft {
  title: string;
  intro: string;
  why: string;
  objective: string;
  instructions: string[];
  starter: string;
  solution: string;
  tests: ExerciseTestDraft[];
  hints: string[];
  review: ExerciseReview;
  transfer: string;
  prediction: ExercisePrediction;
  sources?: ExerciseSource[];
  kind?: ExerciseKind;
  level?: LevelId;
  imports?: string[];
  visual?: ExerciseVisual;
  minutes?: number;
}

// Los desafíos no heredan fuentes de su mundo: cada uno declara las suyas.
export interface QuestDraft extends ExerciseDraft {
  sources: ExerciseSource[];
}
```

`src/entities/exercise/index.ts` queda así:
```ts
export { hasPassingEvidence, testPassed } from './model/passing-evidence';
export { interpretRun } from './model/run-outcome';
export { syncAfterRun } from './model/sync-after-run';
export { mergeRecord } from './model/merge-record';
export type {
  ChallengeType,
  Exercise,
  ExerciseKind,
  ExercisePrediction,
  ExerciseReview,
  ExerciseSource,
  ExerciseTest,
  ExerciseVisual,
  ExerciseLanguage,
} from './model/types';
```

- [ ] **Paso 7: Verificar**

Ejecutar:
```bash
npm run typecheck && node tools/content/dump-globals.ts . | sha256sum
npm test && npm run lint && npm run format:check && git add -N content && git diff --check
```
Esperado:
- el oráculo da `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`;
- `26 checks passed.` y el resto en verde.

- [ ] **Paso 8: Commit**

```bash
git add content tools/content/load-curriculum.ts src/app/legacy/register-catalogs.ts src/entities/exercise
git commit -m "refactor(contenido): desafíos de campaña en content/ y fin de defineQuest"
```

---

### Tarea 8: Núcleos de Sistemas

Los núcleos no tenían fábrica: cada uno era un literal. Su etapa del manifiesto lleva sólo
`topicId` y `topic`, y `exercise.yaml` guarda el resto, salvo lo que coincide con `defaults`.
`SYSTEMS_<DOMINIO>_LABS` intercala, etapa por etapa, el núcleo Rust y el Go, como hoy.

**Archivos:**
- Crear: la sección `systems` de los dos manifiestos y
  `content/<lenguaje>/exercises/<lenguaje>-113/` a `-137/`, escritos por el codemod.
- Crear y borrar en la misma tarea: `tools/content/migrate-cores.ts`.
- Modificar: `tools/content/load-curriculum.ts`, los cuatro
  `src/app/legacy/register-systems-{lowlevel,infra,play,pc}.ts` y `qa/runtime-check.ts`.
- Borrar: `src/entities/exercise/content/systems-{lowlevel,infra,play,pc}-cores.ts`. Con eso
  desaparece `src/entities/exercise/content/`.

**Interfaces:**
- Consume `loadLanguage` e `interleaveCores`.
- Produce `curriculum.cores.<dominio>`, que publica `window.SYSTEMS_<DOMINIO>_LABS`.
- `runtime-check` calcula el hash de fuentes sobre `content/<lenguaje>/`.

- [ ] **Paso 1: Escribir el codemod**

`tools/content/migrate-cores.ts`:
```ts
// Codemod de un solo uso (plan A1, tarea 8): pasa los núcleos de los cuatro
// systems-*-cores.ts a content/<lenguaje>/. Se borra en la misma tarea, después del oráculo.
// Uso: node tools/content/migrate-cores.ts
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { stringify } from 'yaml';
import { importModule, repoRoot } from '../../qa/lib/sources.ts';
import { SYSTEMS_DOMAINS, type SystemsDomain } from './catalogs.ts';
import { GO_HEADER, interleaveCores, loadLanguage } from './exercises.ts';

type Fields = Record<string, unknown>;
const EXPORTS: Record<SystemsDomain, string> = {
  lowlevel: 'systemsLowlevelCores',
  infra: 'systemsInfraCores',
  play: 'systemsPlayCores',
  pc: 'systemsPcCores',
};
// Los núcleos no tenían fábrica: sólo se omite lo que coincide con `defaults` del manifiesto.
const LANGUAGE_DEFAULTS: Fields = { kind: 'completar', imports: [], visual: 'flow' };
const DERIVED = new Set(['id', 'language', 'topicId', 'topic', 'stage', 'starter', 'solution']);
// Orden de lectura de exercise.yaml. No cambia el JSON: el generador publica cada catálogo con
// su orden de claves legacy.
const AUTHORING_ORDER = [
  'title',
  'level',
  'kind',
  'minutes',
  'imports',
  'visual',
  'workshopId',
  'challengeType',
  'intro',
  'why',
  'objective',
  'instructions',
  'tests',
  'hints',
  'review',
  'transfer',
  'prediction',
  'sources',
];

const live = {} as Record<SystemsDomain, Fields[]>;
for (const domain of SYSTEMS_DOMAINS) {
  const module = await importModule<Record<string, Fields[]>>(
    `src/entities/exercise/content/systems-${domain}-cores.ts`,
  );
  live[domain] = module[EXPORTS[domain]];
}

function writeCore(language: 'rust' | 'go', core: Fields): void {
  for (const key of Object.keys(core)) {
    assert.ok(DERIVED.has(key) || AUTHORING_ORDER.includes(key), `${core.id}: clave ${key}`);
  }
  const own: Fields = {};
  for (const key of AUTHORING_ORDER) {
    if (!Object.hasOwn(core, key)) continue;
    const inherited = Object.hasOwn(LANGUAGE_DEFAULTS, key);
    if (inherited && isDeepStrictEqual(core[key], LANGUAGE_DEFAULTS[key])) continue;
    own[key] = core[key];
  }
  const extension = language === 'rust' ? 'rs' : 'go';
  const header = language === 'go' ? GO_HEADER : '';
  const folder = join(repoRoot, `content/${language}/exercises`, core.id as string);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'exercise.yaml'), stringify(own, { lineWidth: 0 }));
  writeFileSync(join(folder, `starter.${extension}`), header + (core.starter as string));
  writeFileSync(join(folder, `solution.${extension}`), header + (core.solution as string));
}

for (const language of ['rust', 'go'] as const) {
  const systems: Record<string, Fields[]> = {};
  for (const domain of SYSTEMS_DOMAINS) {
    const cores = live[domain].filter((core) => core.language === language);
    systems[domain] = cores.map((core) => ({
      topicId: core.topicId,
      topic: core.topic,
      exercises: [core.id],
    }));
    for (const core of cores) writeCore(language, core);
  }
  appendFileSync(
    join(repoRoot, `content/${language}/manifest.yaml`),
    stringify({ systems }, { lineWidth: 0 }),
  );
}

// El cargador real tiene que reconstruir los cuatro catálogos idénticos, intercalados como antes.
const cores = interleaveCores(loadLanguage(repoRoot, 'rust'), loadLanguage(repoRoot, 'go'));
for (const domain of SYSTEMS_DOMAINS) {
  assert.equal(JSON.stringify(cores[domain]), JSON.stringify(live[domain]), domain);
}
console.log(
  `Núcleos idénticos: ${SYSTEMS_DOMAINS.map((d) => `${d} ${cores[d].length}`).join(', ')}.`,
);
```

- [ ] **Paso 2: Correr el codemod y formatear**

Ejecutar:
```bash
node tools/content/migrate-cores.ts && npx prettier --write content && (grep -rln '[[:space:]]$' content || echo 'sin espacios finales')
```
Esperado:
- `Núcleos idénticos: lowlevel 16, infra 16, play 16, pc 2.`;
- `sin espacios finales`;
- 137 carpetas en `content/rust/exercises/` y otras 137 en `content/go/exercises/`.

- [ ] **Paso 3: Sumar los núcleos al generador**

`tools/content/load-curriculum.ts`:
```ts
// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos.
import type { Language, SystemsDomain } from './catalogs.ts';
import { expectDistinctIds, interleaveCores, loadLanguage } from './exercises.ts';
import type { JsonRecord } from './shape.ts';

export interface Curriculum {
  lab: Record<Language, JsonRecord[]>;
  quests: Record<Language, JsonRecord[]>;
  cores: Record<SystemsDomain, JsonRecord[]>;
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  return {
    lab: { rust: rust.lab, go: go.lab },
    quests: { rust: rust.quests, go: go.quests },
    cores: interleaveCores(rust, go),
  };
}
```

- [ ] **Paso 4: Los adaptadores de Sistemas leen los núcleos del JSON**

`src/app/legacy/register-systems-lowlevel.ts`:
```ts
import curriculum from '../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import { lowlevelWorkshops } from '../../entities/systems-workshop/content/lowlevel-workshops';
import { lowlevelModels, type LowlevelModels } from '../../entities/systems-simulation';

declare global {
  interface Window {
    SYSTEMS_LOWLEVEL: {
      workshops: SystemsWorkshop[];
      models: LowlevelModels;
    };
    SYSTEMS_LOWLEVEL_LABS: Exercise[];
  }
}

window.SYSTEMS_LOWLEVEL = { workshops: lowlevelWorkshops, models: lowlevelModels };
window.SYSTEMS_LOWLEVEL_LABS = curriculum.cores.lowlevel as Exercise[];
```

`src/app/legacy/register-systems-infra.ts`:
```ts
import curriculum from '../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import { infraModels, type InfraModels } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import { infraWorkshops } from '../../entities/systems-workshop/content/infra-workshops';

declare global {
  interface Window {
    SYSTEMS_INFRA: {
      workshops: SystemsWorkshop[];
      models: InfraModels;
    };
    SYSTEMS_INFRA_LABS: Exercise[];
  }
}

window.SYSTEMS_INFRA = { workshops: infraWorkshops, models: infraModels };
window.SYSTEMS_INFRA_LABS = curriculum.cores.infra as Exercise[];
```

`src/app/legacy/register-systems-play.ts`:
```ts
import curriculum from '../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import { playModels } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import { playWorkshops } from '../../entities/systems-workshop/content/play-workshops';

declare global {
  interface Window {
    SYSTEMS_PLAY: {
      workshops: SystemsWorkshop[];
      models: typeof playModels;
    };
    SYSTEMS_PLAY_LABS: Exercise[];
  }
}

window.SYSTEMS_PLAY = { workshops: playWorkshops, models: playModels };
window.SYSTEMS_PLAY_LABS = curriculum.cores.play as Exercise[];
```

`src/app/legacy/register-systems-pc.ts`:
```ts
import curriculum from '../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import { pcModel, type PcState, type SystemsModel } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import { pcWorkshops } from '../../entities/systems-workshop/content/pc-workshops';

declare global {
  interface Window {
    SYSTEMS_PC: {
      workshops: SystemsWorkshop[];
      models: { pc: SystemsModel<PcState> };
    };
    SYSTEMS_PC_LABS: Exercise[];
  }
}

window.SYSTEMS_PC = { workshops: pcWorkshops, models: { pc: pcModel } };
window.SYSTEMS_PC_LABS = curriculum.cores.pc as Exercise[];
```

- [ ] **Paso 5: `runtime-check` apunta a `content/`**

El hash de fuentes que registran los manifiestos de evidencia filtraba con `existsSync` los
módulos borrados. Sin este cambio, el hash dejaría afuera el contenido sin avisar.

En `qa/runtime-check.ts`, reemplazar:
```ts
// Catálogos del lenguaje: los publica el adaptador desde los módulos TS; el hash
// sólo cubre las fuentes del lenguaje elegido (no el adaptador ni el otro lenguaje).
const catalogSources = [
  'src/entities/exercise/content/' + language + '-lab.ts',
  'src/entities/exercise/content/' + language + '-quests.ts',
];
```
por:
```ts
// Catálogos del lenguaje: content/<lenguaje>/ (manifiesto, exercise.yaml y código); el hash
// sólo cubre las fuentes del lenguaje elegido (no el generador ni el otro lenguaje).
const catalogSources = fs
  .readdirSync(path.join(root, 'content', language), { recursive: true, encoding: 'utf8' })
  .map((entry) => path.posix.join('content', language, entry))
  .filter((file) => fs.statSync(path.join(root, file)).isFile())
  .sort();
```

- [ ] **Paso 6: Borrar las fuentes reemplazadas y el codemod**

```bash
rm src/entities/exercise/content/systems-lowlevel-cores.ts src/entities/exercise/content/systems-infra-cores.ts src/entities/exercise/content/systems-play-cores.ts src/entities/exercise/content/systems-pc-cores.ts
rm tools/content/migrate-cores.ts
```

- [ ] **Paso 7: Verificar**

Ejecutar:
```bash
npm run typecheck && node tools/content/dump-globals.ts . | sha256sum
node qa/runtime-check.ts rust --audit-record && node qa/runtime-check.ts go --audit-record
npm test && npm run lint && npm run format:check && git add -N content && git diff --check
```
Esperado:
- el oráculo da `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`;
- 137/137 y 411 aserciones en cada lenguaje;
- `26 checks passed.` y el resto en verde.

- [ ] **Paso 8: Commit**

```bash
git add content tools/content/load-curriculum.ts src/app/legacy qa/runtime-check.ts src/entities/exercise
git commit -m "refactor(contenido): núcleos de Sistemas en content/ con el orden intercalado de siempre"
```

---

### Tarea 9: Mundos de campaña y talleres de Sistemas

Mundos y talleres son registros literales: cada `<id>.yaml` es el objeto publicado tal cual, con
su `id`, y conserva el orden de claves del archivo. Cada dominio de talleres tiene el suyo; por
ejemplo, en lowlevel `id` es la tercera clave.

**Archivos:**
- Crear:
  - `tools/content/records.ts`, `tools/content/campaign.ts`, `tools/content/workshops.ts` y
    `qa/content-records-check.ts`;
  - `content/campaign/` y `content/workshops/`, escritos por el codemod.
- Crear y borrar en la misma tarea: `tools/content/migrate-worlds-workshops.ts`.
- Modificar: `qa/run-checks.ts`, `tools/content/load-curriculum.ts`,
  `src/app/legacy/register-catalogs.ts` y los cuatro `src/app/legacy/register-systems-*.ts`.
- Borrar: `src/entities/campaign/content/` y `src/entities/systems-workshop/content/`.

**Interfaces:**
- Produce `loadRecord(root, file, id, spec, optional)` y
  `loadGroupedRecords(root, folder, groups, spec, optional)`: un manifiesto con un grupo por
  clave y un `<id>.yaml` por ID.
- Produce `loadCampaign(root)`, de tipo `Record<Language, JsonRecord[]>`, y `loadWorkshops(root)`,
  de tipo `Record<SystemsDomain, JsonRecord[]>`.
- Produce `curriculum.campaign` y `curriculum.workshops`, que publican `RUST_CAMPAIGN`,
  `GO_CAMPAIGN` y `SYSTEMS_<DOMINIO>.workshops`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`qa/content-records-check.ts`:
```ts
/* Registros literales de content/: mundos de campaña y talleres de Sistemas
 * (tools/content/records.ts, campaign.ts y workshops.ts).
 * node qa/content-records-check.ts
 *
 * Contrato: el manifiesto agrupa y ordena los IDs; cada <id>.yaml se publica tal cual, con
 * las claves en el orden del archivo, y su `id` coincide con el nombre del archivo.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { loadCampaign } from '../tools/content/campaign.ts';
import { ContentError } from '../tools/content/content-error.ts';
import { loadGroupedRecords } from '../tools/content/records.ts';
import { expectText } from '../tools/content/shape.ts';
import { loadWorkshops } from '../tools/content/workshops.ts';

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-records-'));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

function throwsContent(run: () => unknown, message: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ContentError, `se esperaba ContentError: ${String(error)}`);
    assert.equal(error.message, message);
    return true;
  });
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

const SPEC = { id: expectText, title: expectText, minutes: expectText };

test('el manifiesto ordena los grupos y cada registro conserva el orden del YAML', () => {
  const root = fixture({
    'content/x/manifest.yaml': 'a:\n  - b2\n  - b1\nb:\n  - c1\n',
    'content/x/b1.yaml': 'id: b1\ntitle: Uno\nminutes: diez\n',
    'content/x/b2.yaml': 'minutes: veinte\nid: b2\ntitle: Dos\n',
    'content/x/c1.yaml': 'title: Tres\nid: c1\nminutes: cinco\n',
  });
  const groups = loadGroupedRecords(root, 'content/x', ['a', 'b'], SPEC);
  assert.deepEqual(groups, {
    a: [
      { minutes: 'veinte', id: 'b2', title: 'Dos' },
      { id: 'b1', title: 'Uno', minutes: 'diez' },
    ],
    b: [{ title: 'Tres', id: 'c1', minutes: 'cinco' }],
  });
  assert.deepEqual(Object.keys(groups.a[0]), ['minutes', 'id', 'title']);
});

test('el id coincide con el archivo y no hay registros fuera del manifiesto', () => {
  const mismatch = fixture({
    'content/x/manifest.yaml': 'a:\n  - b1\nb:\n  - c1\n',
    'content/x/b1.yaml': 'id: otro\ntitle: Uno\nminutes: diez\n',
    'content/x/c1.yaml': 'id: c1\ntitle: Tres\nminutes: cinco\n',
  });
  throwsContent(
    () => loadGroupedRecords(mismatch, 'content/x', ['a', 'b'], SPEC),
    'content/x/b1.yaml: id: debe ser «b1», como el nombre del archivo',
  );
  const orphan = fixture({
    'content/x/manifest.yaml': 'a:\n  - b1\nb:\n  - c1\n',
    'content/x/b1.yaml': 'id: b1\ntitle: Uno\nminutes: diez\n',
    'content/x/c1.yaml': 'id: c1\ntitle: Tres\nminutes: cinco\n',
    'content/x/d1.yaml': 'id: d1\ntitle: Cuatro\nminutes: uno\n',
  });
  throwsContent(
    () => loadGroupedRecords(orphan, 'content/x', ['a', 'b'], SPEC),
    'content/x/d1.yaml: no figura en content/x/manifest.yaml',
  );
});

const WORLD = `id: rust-world-1
level: beginner
title: Estación
subtitle: Repará los controles.
story: Llegás a una estación.
concepts:
  - Estado
why: Porque el estado importa.
guide:
  - Entrená.
trainingIds:
  - rust-02
challengeIds:
  - rust-101
bossId: rust-101
checkpoint:
  question: ¿Cuándo descontar batería?
  options:
    - Antes
    - Después
  answer: 1
  explanation: Después de validar.
badge: Piloto
sources:
  - title: Rust Book
    url: https://doc.rust-lang.org/book/
`;

function campaignFixture(world = WORLD): string {
  return fixture({
    'content/campaign/manifest.yaml': 'rust:\n  - rust-world-1\ngo:\n  - go-world-1\n',
    'content/campaign/rust-world-1.yaml': world,
    'content/campaign/go-world-1.yaml': WORLD.replace('rust-world-1', 'go-world-1'),
  });
}

test('campaña: mundos por lenguaje, con el checkpoint validado', () => {
  const campaign = loadCampaign(campaignFixture());
  assert.deepEqual(
    campaign.rust.map((world) => world.id),
    ['rust-world-1'],
  );
  assert.deepEqual(
    campaign.go.map((world) => world.id),
    ['go-world-1'],
  );
  throwsContent(
    () => loadCampaign(campaignFixture(WORLD.replace('  answer: 1\n', '  answer: 5\n'))),
    'content/campaign/rust-world-1.yaml: checkpoint.answer: 5 no es el índice de una opción: hay 2',
  );
  throwsContent(
    () => loadCampaign(campaignFixture(WORLD.replace('badge: Piloto\n', ''))),
    'content/campaign/rust-world-1.yaml: falta la clave «badge»',
  );
});

const WORKSHOP = `id: cache
category: machine
model: cache
level: medium
minutes: 45
title: Una caché
subtitle: Localidad.
story: La cocina.
what: Una LRU.
why: Separar corrección de política.
uses:
  - Cachés
limits: Guarda claves.
objectives:
  - id: hit
    label: Provocá un hit
    why: Distingue hit de miss.
prediction:
  question: ¿Qué sale?
  options:
    - A
    - B
  answer: 1
  explanation: Sale B.
steps:
  - title: Dibujá
    task: Dibujá la traza.
    why: Para ver la política.
    done: Hay una traza.
sources:
  - title: OSTEP
    url: https://pages.cs.wisc.edu/~remzi/OSTEP/
code:
  rust: rust-113
  go: go-113
related:
  rust:
    - rust-15
  go:
    - go-15
bridge:
  rust: Exportá a Cargo.
  go: Exportá a un módulo.
`;

test('talleres: un grupo por dominio y la ficha completa por lenguaje', () => {
  const domains = ['lowlevel', 'infra', 'play', 'pc'];
  const files: Record<string, string> = {
    'content/workshops/manifest.yaml': domains
      .map((domain) => `${domain}:\n  - ${domain}-w\n`)
      .join(''),
  };
  for (const domain of domains) {
    files[`content/workshops/${domain}-w.yaml`] = WORKSHOP.replace('id: cache', `id: ${domain}-w`);
  }
  const workshops = loadWorkshops(fixture(files));
  assert.deepEqual(
    domains.map((domain) => workshops[domain as keyof typeof workshops][0].id),
    ['lowlevel-w', 'infra-w', 'play-w', 'pc-w'],
  );
  files['content/workshops/pc-w.yaml'] = WORKSHOP.replace('id: cache', 'id: pc-w').replace(
    '  go: Exportá a un módulo.\n',
    '',
  );
  throwsContent(
    () => loadWorkshops(fixture(files)),
    'content/workshops/pc-w.yaml: bridge: falta la clave «go»',
  );
});

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-records scenarios PASS.`);
```

- [ ] **Paso 2: Correr las pruebas y ver que fallan**

Ejecutar: `node qa/content-records-check.ts`
Esperado: FAIL con `ERR_MODULE_NOT_FOUND` por un módulo de `tools/content/` que todavía no
existe.

- [ ] **Paso 3: Implementar**

`tools/content/records.ts`:
```ts
// Registros literales de content/ (mundos, talleres, conceptos del Atlas y la guía): cada
// <id>.yaml es el objeto publicado tal cual, con su `id` igual al nombre del archivo y las
// claves en el orden del YAML. Un manifest.yaml agrupa y ordena los IDs.
import { expectSameIds, listYamlIds } from './catalog-files.ts';
import { child, fail, filePlace } from './content-error.ts';
import { checkRecord, textList, type Check, type JsonRecord } from './shape.ts';
import { readYamlFile } from './yaml-file.ts';

export function loadRecord(
  root: string,
  file: string,
  id: string,
  spec: Record<string, Check>,
  optional: readonly string[] = [],
): JsonRecord {
  const place = filePlace(file);
  const record = checkRecord(readYamlFile(root, file), place, spec, optional);
  if (record.id !== id) fail(child(place, 'id'), `debe ser «${id}», como el nombre del archivo`);
  return record;
}

// Lee <folder>/manifest.yaml (cada grupo con su lista de IDs, en orden) y un <id>.yaml por ID.
export function loadGroupedRecords<Group extends string>(
  root: string,
  folder: string,
  groups: readonly Group[],
  spec: Record<string, Check>,
  optional: readonly string[] = [],
): Record<Group, JsonRecord[]> {
  const manifestFile = `${folder}/manifest.yaml`;
  const manifestPlace = filePlace(manifestFile);
  const groupSpec = Object.fromEntries(groups.map((group) => [group, textList(1)]));
  const manifest = checkRecord(readYamlFile(root, manifestFile), manifestPlace, groupSpec);
  const ids = groups.flatMap((group) => manifest[group] as string[]);
  expectSameIds(ids, listYamlIds(root, folder), manifestPlace, folder, '.yaml');
  const result = {} as Record<Group, JsonRecord[]>;
  for (const group of groups) {
    result[group] = (manifest[group] as string[]).map((id) =>
      loadRecord(root, `${folder}/${id}.yaml`, id, spec, optional),
    );
  }
  return result;
}
```

`tools/content/campaign.ts`:
```ts
// Mundos de campaña: content/campaign/manifest.yaml ordena los IDs por lenguaje y cada
// content/campaign/<id>.yaml es un mundo de RUST_CAMPAIGN o GO_CAMPAIGN.
import { LEVEL_IDS } from '../../src/shared/config/levels.ts';
import { LANGUAGES, type Language } from './catalogs.ts';
import { loadGroupedRecords } from './records.ts';
import {
  checkQuestion,
  checkSource,
  expectText,
  listOf,
  oneOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';

const WORLD_SPEC: Record<string, Check> = {
  id: expectText,
  level: oneOf(LEVEL_IDS),
  title: expectText,
  subtitle: expectText,
  story: expectText,
  concepts: textList(1),
  why: expectText,
  guide: textList(1),
  trainingIds: textList(1),
  challengeIds: textList(1),
  bossId: expectText,
  checkpoint: checkQuestion,
  badge: expectText,
  sources: listOf(checkSource, 1),
};

export function loadCampaign(root: string): Record<Language, JsonRecord[]> {
  return loadGroupedRecords(root, 'content/campaign', LANGUAGES, WORLD_SPEC);
}
```

`tools/content/workshops.ts`:
```ts
// Talleres de Sistemas: content/workshops/manifest.yaml ordena los IDs por dominio y cada
// content/workshops/<id>.yaml es la ficha que publica SYSTEMS_<DOMINIO>.workshops. Cada dominio
// conserva su orden de claves legacy porque el YAML es el objeto tal cual.
import { LEVEL_IDS } from '../../src/shared/config/levels.ts';
import { SYSTEMS_DOMAINS, type SystemsDomain } from './catalogs.ts';
import { loadGroupedRecords } from './records.ts';
import {
  checkQuestion,
  checkRecord,
  checkSource,
  expectText,
  integer,
  listOf,
  oneOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';

const perLanguage =
  (check: Check): Check =>
  (value, place) =>
    checkRecord(value, place, { rust: check, go: check });

const WORKSHOP_SPEC: Record<string, Check> = {
  id: expectText,
  category: expectText,
  model: expectText,
  level: oneOf(LEVEL_IDS),
  minutes: integer(1),
  title: expectText,
  subtitle: expectText,
  story: expectText,
  what: expectText,
  why: expectText,
  uses: textList(1),
  limits: expectText,
  objectives: listOf(
    (value, place) =>
      checkRecord(value, place, { id: expectText, label: expectText, why: expectText }),
    1,
  ),
  prediction: checkQuestion,
  steps: listOf(
    (value, place) =>
      checkRecord(value, place, {
        title: expectText,
        task: expectText,
        why: expectText,
        done: expectText,
      }),
    1,
  ),
  sources: listOf(checkSource, 1),
  code: perLanguage(expectText),
  related: perLanguage(textList(1)),
  bridge: perLanguage(expectText),
};

export function loadWorkshops(root: string): Record<SystemsDomain, JsonRecord[]> {
  return loadGroupedRecords(root, 'content/workshops', SYSTEMS_DOMAINS, WORKSHOP_SPEC);
}
```

- [ ] **Paso 4: Correr las pruebas y ver que pasan**

Ejecutar: `node qa/content-records-check.ts`
Esperado: `4 content-records scenarios PASS.`

En `qa/run-checks.ts`, después de `'content-exercises-check.ts',`, agregar:
```ts
  'content-records-check.ts',
```

- [ ] **Paso 5: Escribir el codemod**

`tools/content/migrate-worlds-workshops.ts`:
```ts
// Codemod de un solo uso (plan A1, tarea 9): pasa los mundos de campaña y las fichas de los
// talleres a content/campaign/ y content/workshops/. Se borra en la misma tarea.
// Uso: node tools/content/migrate-worlds-workshops.ts
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { importModule, repoRoot } from '../../qa/lib/sources.ts';
import { loadCampaign } from './campaign.ts';
import { SYSTEMS_DOMAINS } from './catalogs.ts';
import { loadWorkshops } from './workshops.ts';

type Fields = Record<string, unknown>;

// Escribe <folder>/manifest.yaml con los IDs de cada grupo y un <id>.yaml por registro.
function writeGroups(folder: string, header: string, groups: Record<string, Fields[]>): void {
  mkdirSync(join(repoRoot, folder), { recursive: true });
  const manifest = Object.fromEntries(
    Object.entries(groups).map(([group, records]) => [group, records.map((record) => record.id)]),
  );
  writeFileSync(join(repoRoot, folder, 'manifest.yaml'), header + stringify(manifest));
  for (const record of Object.values(groups).flat()) {
    writeFileSync(join(repoRoot, folder, `${record.id}.yaml`), stringify(record, { lineWidth: 0 }));
  }
}

const { rustWorlds } = await importModule<{ rustWorlds: Fields[] }>(
  'src/entities/campaign/content/rust-worlds.ts',
);
const { goWorlds } = await importModule<{ goWorlds: Fields[] }>(
  'src/entities/campaign/content/go-worlds.ts',
);
const worlds = { rust: rustWorlds, go: goWorlds };
writeGroups(
  'content/campaign',
  '# Mundos de campaña por lenguaje, en orden. Los IDs son inmutables: indexan el progreso.\n',
  worlds,
);

const workshops: Record<string, Fields[]> = {};
for (const domain of SYSTEMS_DOMAINS) {
  const module = await importModule<Record<string, Fields[]>>(
    `src/entities/systems-workshop/content/${domain}-workshops.ts`,
  );
  workshops[domain] = module[`${domain}Workshops`];
}
writeGroups(
  'content/workshops',
  '# Talleres de Sistemas por dominio, en orden. Los IDs son inmutables: indexan el progreso.\n',
  workshops,
);

// Los cargadores reales tienen que reconstruir los catálogos idénticos.
assert.equal(JSON.stringify(loadCampaign(repoRoot)), JSON.stringify(worlds));
assert.equal(JSON.stringify(loadWorkshops(repoRoot)), JSON.stringify(workshops));
console.log('content/campaign y content/workshops idénticos a los catálogos.');
```

- [ ] **Paso 6: Correr el codemod y formatear**

Ejecutar:
```bash
node tools/content/migrate-worlds-workshops.ts && npx prettier --write content && (grep -rln '[[:space:]]$' content || echo 'sin espacios finales')
```
Esperado: `content/campaign y content/workshops idénticos a los catálogos.` y
`sin espacios finales`.

- [ ] **Paso 7: Generador y adaptadores**

`tools/content/load-curriculum.ts`:
```ts
// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos.
import { loadCampaign } from './campaign.ts';
import type { Language, SystemsDomain } from './catalogs.ts';
import { expectDistinctIds, interleaveCores, loadLanguage } from './exercises.ts';
import type { JsonRecord } from './shape.ts';
import { loadWorkshops } from './workshops.ts';

export interface Curriculum {
  lab: Record<Language, JsonRecord[]>;
  quests: Record<Language, JsonRecord[]>;
  cores: Record<SystemsDomain, JsonRecord[]>;
  campaign: Record<Language, JsonRecord[]>;
  workshops: Record<SystemsDomain, JsonRecord[]>;
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  return {
    lab: { rust: rust.lab, go: go.lab },
    quests: { rust: rust.quests, go: go.quests },
    cores: interleaveCores(rust, go),
    campaign: loadCampaign(root),
    workshops: loadWorkshops(root),
  };
}
```

`src/app/legacy/register-catalogs.ts`:
```ts
// Los catálogos salen de content/ (YAML y código) a través de build/curriculum.json, que
// genera tools/content/build-curriculum.ts antes de `npm run typecheck` y de `npm run dev`.
import curriculum from '../../../build/curriculum.json';
import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import { guideData, type GuideData } from '../../entities/guide';

declare global {
  interface Window {
    GUIDE_DATA: GuideData;
    RUST_LAB: Exercise[];
    GO_LAB: Exercise[];
    RUST_QUESTS: Exercise[];
    GO_QUESTS: Exercise[];
    RUST_CAMPAIGN: CampaignWorldDefinition[];
    GO_CAMPAIGN: CampaignWorldDefinition[];
  }
}

window.GUIDE_DATA = guideData;
window.RUST_LAB = curriculum.lab.rust as Exercise[];
window.GO_LAB = curriculum.lab.go as Exercise[];
window.RUST_QUESTS = curriculum.quests.rust as Exercise[];
window.GO_QUESTS = curriculum.quests.go as Exercise[];
window.RUST_CAMPAIGN = curriculum.campaign.rust as CampaignWorldDefinition[];
window.GO_CAMPAIGN = curriculum.campaign.go as CampaignWorldDefinition[];
```

`src/app/legacy/register-systems-lowlevel.ts`:
```ts
import curriculum from '../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import type { SystemsWorkshop } from '../../entities/systems-workshop';
import { lowlevelModels, type LowlevelModels } from '../../entities/systems-simulation';

declare global {
  interface Window {
    SYSTEMS_LOWLEVEL: {
      workshops: SystemsWorkshop[];
      models: LowlevelModels;
    };
    SYSTEMS_LOWLEVEL_LABS: Exercise[];
  }
}

window.SYSTEMS_LOWLEVEL = {
  workshops: curriculum.workshops.lowlevel as SystemsWorkshop[],
  models: lowlevelModels,
};
window.SYSTEMS_LOWLEVEL_LABS = curriculum.cores.lowlevel as Exercise[];
```

`src/app/legacy/register-systems-infra.ts`:
```ts
import curriculum from '../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import { infraModels, type InfraModels } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';

declare global {
  interface Window {
    SYSTEMS_INFRA: {
      workshops: SystemsWorkshop[];
      models: InfraModels;
    };
    SYSTEMS_INFRA_LABS: Exercise[];
  }
}

window.SYSTEMS_INFRA = {
  workshops: curriculum.workshops.infra as SystemsWorkshop[],
  models: infraModels,
};
window.SYSTEMS_INFRA_LABS = curriculum.cores.infra as Exercise[];
```

`src/app/legacy/register-systems-play.ts`:
```ts
import curriculum from '../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import { playModels } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';

declare global {
  interface Window {
    SYSTEMS_PLAY: {
      workshops: SystemsWorkshop[];
      models: typeof playModels;
    };
    SYSTEMS_PLAY_LABS: Exercise[];
  }
}

window.SYSTEMS_PLAY = {
  workshops: curriculum.workshops.play as SystemsWorkshop[],
  models: playModels,
};
window.SYSTEMS_PLAY_LABS = curriculum.cores.play as Exercise[];
```

`src/app/legacy/register-systems-pc.ts`:
```ts
import curriculum from '../../../build/curriculum.json';
import type { Exercise } from '../../entities/exercise';
import { pcModel, type PcState, type SystemsModel } from '../../entities/systems-simulation';
import type { SystemsWorkshop } from '../../entities/systems-workshop';

declare global {
  interface Window {
    SYSTEMS_PC: {
      workshops: SystemsWorkshop[];
      models: { pc: SystemsModel<PcState> };
    };
    SYSTEMS_PC_LABS: Exercise[];
  }
}

window.SYSTEMS_PC = {
  workshops: curriculum.workshops.pc as SystemsWorkshop[],
  models: { pc: pcModel },
};
window.SYSTEMS_PC_LABS = curriculum.cores.pc as Exercise[];
```

- [ ] **Paso 8: Borrar las fuentes reemplazadas y el codemod**

```bash
rm -r src/entities/campaign/content src/entities/systems-workshop/content
rm tools/content/migrate-worlds-workshops.ts
```

Los tipos de cada ficha (`PcWorkshop`, `InfraWorkshop`…) vivían en esos módulos y no tenían
otros consumidores. Los adaptadores siguen tipando con `SystemsWorkshop` y
`CampaignWorldDefinition`.

- [ ] **Paso 9: Verificar**

Ejecutar:
```bash
npm run typecheck && node tools/content/dump-globals.ts . | sha256sum
npm test && npm run lint && npm run format:check && git add -N content && git diff --check
```
Esperado:
- el oráculo da `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`;
- `27 checks passed.` y el resto en verde.

- [ ] **Paso 10: Commit**

```bash
git add tools/content/records.ts tools/content/campaign.ts tools/content/workshops.ts tools/content/load-curriculum.ts qa/content-records-check.ts qa/run-checks.ts content/campaign content/workshops src/app/legacy src/entities/campaign src/entities/systems-workshop
git commit -m "refactor(contenido): mundos de campaña y talleres de Sistemas en content/"
```

---

### Tarea 10: Guía

La guía se divide con el mismo criterio que los ejercicios:

- **Por recorrido:** un manifiesto en `content/guide/<rust|go>/manifest.yaml` con título,
  descripción y módulos en orden, cada uno con los IDs de sus pasos; un archivo por paso en
  `steps/`.
- **Biblioteca:** un archivo por recurso en `content/guide/resources/`, con el orden en
  `content/guide/manifest.yaml`.
- **Fuentes:** `content/guide/sources.yaml`, porque no tienen ID.

`loadGuide` arma `{ resources, tracks: { rust, go }, sources }` con el orden de claves de
`guide-data.ts`.

**Archivos:**
- Crear: `tools/content/guide.ts`, `qa/content-guide-check.ts` y `content/guide/`, escrito por el
  codemod.
- Crear y borrar en la misma tarea: `tools/content/migrate-guide.ts`.
- Modificar: `qa/run-checks.ts`, `tools/content/load-curriculum.ts`,
  `src/app/legacy/register-catalogs.ts` y `src/entities/guide/index.ts`.
- Borrar: `src/entities/guide/content/guide-data.ts`.

**Interfaces:**
- Consume `loadRecord`, `expectSameIds` y `listYamlIds`.
- Produce `loadGuide(root): JsonRecord` y `curriculum.guide`, que publica `window.GUIDE_DATA`.
- La API de `entities/guide` deja de exportar `guideData`; los tipos siguen.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`qa/content-guide-check.ts`:
```ts
/* Guía de content/guide/ (tools/content/guide.ts).
 * node qa/content-guide-check.ts
 *
 * Contrato: GUIDE_DATA se arma como { resources, tracks: { rust, go }, sources }; la biblioteca
 * sigue el orden de manifest.yaml y cada módulo del recorrido reemplaza sus IDs de pasos por los
 * pasos, en el mismo lugar.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ContentError } from '../tools/content/content-error.ts';
import { loadGuide } from '../tools/content/guide.ts';

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-guide-'));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

function throwsContent(run: () => unknown, message: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ContentError, `se esperaba ContentError: ${String(error)}`);
    assert.equal(error.message, message);
    return true;
  });
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

function resource(id: string, languages: string): string {
  return `id: ${id}
title: Recurso ${id}
url: https://example.org/${id}
languages:
  - ${languages}
category: ejercicios
cost: gratis
format: Ejercicios
description: Un recurso.
why: Porque sirve.
caveat: No es todo.
featured: true
`;
}

function step(id: string, answer = 0): string {
  return `id: ${id}
title: Paso ${id}
minutes: 25
objective: Aprender algo.
task: Hacé algo.
doneWhen: Podés explicarlo.
resourceIds:
  - r1
quiz:
  question: ¿Qué aprendiste?
  options:
    - Algo
    - Nada
  answer: ${answer}
  explanation: Algo, siempre.
`;
}

function track(language: string, steps: string[]): string {
  return `title: Recorrido ${language}
description: Un recorrido.
modules:
  - id: ${language}-m1
    title: Módulo uno
    subtitle: El primero.
    steps:
${steps.map((id) => `      - ${id}`).join('\n')}
`;
}

function guideFiles(): Record<string, string> {
  return {
    'content/guide/manifest.yaml': 'resources:\n  - r2\n  - r1\n',
    'content/guide/resources/r1.yaml': resource('r1', 'rust'),
    'content/guide/resources/r2.yaml': resource('r2', 'both'),
    'content/guide/sources.yaml':
      '- title: Fuente\n  url: https://example.org/f\n  note: Contexto.\n',
    'content/guide/rust/manifest.yaml': track('rust', ['rust-s2', 'rust-s1']),
    'content/guide/rust/steps/rust-s1.yaml': step('rust-s1'),
    'content/guide/rust/steps/rust-s2.yaml': step('rust-s2'),
    'content/guide/go/manifest.yaml': track('go', ['go-s1']),
    'content/guide/go/steps/go-s1.yaml': step('go-s1'),
  };
}

test('la guía se arma con la forma y el orden de GUIDE_DATA', () => {
  const guide = loadGuide(fixture(guideFiles())) as {
    resources: { id: string }[];
    tracks: Record<string, { modules: { id: string; steps: { id: string }[] }[] }>;
    sources: unknown[];
  };
  assert.deepEqual(Object.keys(guide), ['resources', 'tracks', 'sources']);
  assert.deepEqual(Object.keys(guide.tracks), ['rust', 'go']);
  assert.deepEqual(
    guide.resources.map((item) => item.id),
    ['r2', 'r1'],
  );
  const module = guide.tracks.rust.modules[0];
  assert.deepEqual(Object.keys(module), ['id', 'title', 'subtitle', 'steps']);
  assert.deepEqual(
    module.steps.map((item) => item.id),
    ['rust-s2', 'rust-s1'],
  );
  assert.deepEqual(guide.sources, [
    { title: 'Fuente', url: 'https://example.org/f', note: 'Contexto.' },
  ]);
});

test('validación: pasos faltantes, quiz y valores admitidos', () => {
  const missing = guideFiles();
  delete missing['content/guide/go/steps/go-s1.yaml'];
  throwsContent(
    () => loadGuide(fixture(missing)),
    'content/guide/go/manifest.yaml: go-s1 no tiene content/guide/go/steps/go-s1.yaml',
  );
  const quiz = { ...guideFiles(), 'content/guide/go/steps/go-s1.yaml': step('go-s1', 2) };
  throwsContent(
    () => loadGuide(fixture(quiz)),
    'content/guide/go/steps/go-s1.yaml: quiz.answer: 2 no es el índice de una opción: hay 2',
  );
  const language = { ...guideFiles(), 'content/guide/resources/r1.yaml': resource('r1', 'java') };
  throwsContent(
    () => loadGuide(fixture(language)),
    'content/guide/resources/r1.yaml: languages[0]: se esperaba uno de: rust, go, both',
  );
});

test('validación: los IDs de módulos y pasos no se repiten entre recorridos', () => {
  const files = {
    ...guideFiles(),
    'content/guide/go/manifest.yaml': track('go', ['go-s1']).replace('go-m1', 'rust-m1'),
  };
  throwsContent(
    () => loadGuide(fixture(files)),
    'content/guide/go/manifest.yaml: ID repetido en la guía: rust-m1',
  );
});

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-guide scenarios PASS.`);
```

- [ ] **Paso 2: Correr las pruebas y ver que fallan**

Ejecutar: `node qa/content-guide-check.ts`
Esperado: FAIL con `ERR_MODULE_NOT_FOUND` por `tools/content/guide.ts`.

- [ ] **Paso 3: Implementar**

`tools/content/guide.ts`:
```ts
// Guía (GUIDE_DATA) en content/guide/: la biblioteca ordenada por manifest.yaml, un archivo
// por recurso y por paso, el manifiesto de cada recorrido (módulos en orden con sus pasos) y
// las fuentes. Se arma con el mismo orden de claves que publicaba guide-data.ts.
import { expectSameIds, listYamlIds } from './catalog-files.ts';
import { LANGUAGES, type Language } from './catalogs.ts';
import { fail, filePlace } from './content-error.ts';
import { loadRecord } from './records.ts';
import {
  checkQuestion,
  checkRecord,
  expectBoolean,
  expectText,
  integer,
  listOf,
  oneOf,
  textList,
  type Check,
  type JsonRecord,
} from './shape.ts';
import { readYamlFile } from './yaml-file.ts';

const RESOURCE_SPEC: Record<string, Check> = {
  id: expectText,
  title: expectText,
  url: expectText,
  languages: listOf(oneOf(['rust', 'go', 'both']), 1),
  category: oneOf(['ejercicios', 'lectura', 'proyectos', 'herramientas']),
  cost: oneOf(['gratis', 'mixto']),
  format: expectText,
  description: expectText,
  why: expectText,
  caveat: expectText,
  featured: expectBoolean,
};

const STEP_SPEC: Record<string, Check> = {
  id: expectText,
  title: expectText,
  minutes: integer(1),
  objective: expectText,
  task: expectText,
  doneWhen: expectText,
  resourceIds: textList(1),
  quiz: checkQuestion,
};

const TRACK_SPEC: Record<string, Check> = {
  title: expectText,
  description: expectText,
  modules: listOf(
    (value, place) =>
      checkRecord(value, place, {
        id: expectText,
        title: expectText,
        subtitle: expectText,
        steps: textList(1),
      }),
    1,
  ),
};

const SOURCES: Check = listOf(
  (value, place) =>
    checkRecord(value, place, { title: expectText, url: expectText, note: expectText }),
  1,
);

function loadTrack(root: string, language: Language): JsonRecord {
  const folder = `content/guide/${language}`;
  const file = `${folder}/manifest.yaml`;
  const place = filePlace(file);
  const track = checkRecord(readYamlFile(root, file), place, TRACK_SPEC);
  const modules = track.modules as JsonRecord[];
  const stepIds = modules.flatMap((module) => module.steps as string[]);
  expectSameIds(stepIds, listYamlIds(root, `${folder}/steps`), place, `${folder}/steps`, '.yaml');
  return {
    ...track,
    modules: modules.map((module) => ({
      ...module,
      steps: (module.steps as string[]).map((id) =>
        loadRecord(root, `${folder}/steps/${id}.yaml`, id, STEP_SPEC),
      ),
    })),
  };
}

// Los IDs de módulos y pasos indexan el progreso del recorrido: no se repiten en toda la guía.
function expectUniqueTrackIds(tracks: Record<Language, JsonRecord>): void {
  const seen = new Set<string>();
  for (const language of LANGUAGES) {
    for (const module of tracks[language].modules as JsonRecord[]) {
      const steps = module.steps as JsonRecord[];
      for (const id of [module.id as string, ...steps.map((step) => step.id as string)]) {
        if (seen.has(id))
          fail(
            filePlace(`content/guide/${language}/manifest.yaml`),
            `ID repetido en la guía: ${id}`,
          );
        seen.add(id);
      }
    }
  }
}

export function loadGuide(root: string): JsonRecord {
  const manifestFile = 'content/guide/manifest.yaml';
  const manifestPlace = filePlace(manifestFile);
  const manifest = checkRecord(readYamlFile(root, manifestFile), manifestPlace, {
    resources: textList(1),
  });
  const resourceIds = manifest.resources as string[];
  const resourcesFolder = 'content/guide/resources';
  expectSameIds(
    resourceIds,
    listYamlIds(root, resourcesFolder),
    manifestPlace,
    resourcesFolder,
    '.yaml',
  );
  const resources = resourceIds.map((id) =>
    loadRecord(root, `${resourcesFolder}/${id}.yaml`, id, RESOURCE_SPEC),
  );
  const tracks = {} as Record<Language, JsonRecord>;
  for (const language of LANGUAGES) tracks[language] = loadTrack(root, language);
  expectUniqueTrackIds(tracks);
  const sourcesFile = 'content/guide/sources.yaml';
  const sources = SOURCES(readYamlFile(root, sourcesFile), filePlace(sourcesFile)) as JsonRecord[];
  return { resources, tracks, sources };
}
```

- [ ] **Paso 4: Correr las pruebas y ver que pasan**

Ejecutar: `node qa/content-guide-check.ts`
Esperado: `3 content-guide scenarios PASS.`

En `qa/run-checks.ts`, después de `'content-records-check.ts',`, agregar:
```ts
  'content-guide-check.ts',
```

- [ ] **Paso 5: Escribir el codemod**

`tools/content/migrate-guide.ts`:
```ts
// Codemod de un solo uso (plan A1, tarea 10): pasa GUIDE_DATA de guide-data.ts a
// content/guide/. Se borra en la misma tarea, después de verificar el oráculo.
// Uso: node tools/content/migrate-guide.ts
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';
import { importModule, repoRoot } from '../../qa/lib/sources.ts';
import { loadGuide } from './guide.ts';

type Fields = Record<string, unknown>;
interface GuideTrack {
  title: string;
  description: string;
  modules: (Fields & { steps: Fields[] })[];
}
interface GuideData {
  resources: Fields[];
  tracks: Record<string, GuideTrack>;
  sources: Fields[];
}

const { guideData } = await importModule<{ guideData: GuideData }>(
  'src/entities/guide/content/guide-data.ts',
);

function write(file: string, text: string): void {
  mkdirSync(dirname(join(repoRoot, file)), { recursive: true });
  writeFileSync(join(repoRoot, file), text);
}

write(
  'content/guide/manifest.yaml',
  '# Orden de la biblioteca. Los IDs de recursos y pasos son inmutables: indexan el progreso.\n' +
    stringify({ resources: guideData.resources.map((resource) => resource.id) }),
);
for (const resource of guideData.resources) {
  write(`content/guide/resources/${resource.id}.yaml`, stringify(resource, { lineWidth: 0 }));
}
write('content/guide/sources.yaml', stringify(guideData.sources, { lineWidth: 0 }));
for (const [language, track] of Object.entries(guideData.tracks)) {
  const modules = track.modules.map((module) => ({
    ...module,
    steps: module.steps.map((step) => step.id),
  }));
  write(
    `content/guide/${language}/manifest.yaml`,
    stringify({ ...track, modules }, { lineWidth: 0 }),
  );
  for (const step of track.modules.flatMap((module) => module.steps)) {
    write(`content/guide/${language}/steps/${step.id}.yaml`, stringify(step, { lineWidth: 0 }));
  }
}

// El cargador real tiene que reconstruir GUIDE_DATA idéntico, con el mismo orden de claves.
assert.equal(JSON.stringify(loadGuide(repoRoot)), JSON.stringify(guideData));
console.log('content/guide idéntico a GUIDE_DATA.');
```

- [ ] **Paso 6: Correr el codemod y formatear**

Ejecutar:
```bash
node tools/content/migrate-guide.ts && npx prettier --write content && (grep -rln '[[:space:]]$' content || echo 'sin espacios finales')
```
Esperado:
- `content/guide idéntico a GUIDE_DATA.` y `sin espacios finales`;
- 15 recursos, 24 pasos (12 por recorrido) y `sources.yaml` con 9 fuentes.

- [ ] **Paso 7: Generador y adaptador**

`tools/content/load-curriculum.ts`:
```ts
// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos.
import { loadCampaign } from './campaign.ts';
import type { Language, SystemsDomain } from './catalogs.ts';
import { expectDistinctIds, interleaveCores, loadLanguage } from './exercises.ts';
import { loadGuide } from './guide.ts';
import type { JsonRecord } from './shape.ts';
import { loadWorkshops } from './workshops.ts';

export interface Curriculum {
  lab: Record<Language, JsonRecord[]>;
  quests: Record<Language, JsonRecord[]>;
  cores: Record<SystemsDomain, JsonRecord[]>;
  campaign: Record<Language, JsonRecord[]>;
  workshops: Record<SystemsDomain, JsonRecord[]>;
  guide: JsonRecord;
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  return {
    lab: { rust: rust.lab, go: go.lab },
    quests: { rust: rust.quests, go: go.quests },
    cores: interleaveCores(rust, go),
    campaign: loadCampaign(root),
    workshops: loadWorkshops(root),
    guide: loadGuide(root),
  };
}
```

`src/app/legacy/register-catalogs.ts`:
```ts
// Los catálogos salen de content/ (YAML y código) a través de build/curriculum.json, que
// genera tools/content/build-curriculum.ts antes de `npm run typecheck` y de `npm run dev`.
import curriculum from '../../../build/curriculum.json';
import type { CampaignWorldDefinition } from '../../entities/campaign';
import type { Exercise } from '../../entities/exercise';
import type { GuideData } from '../../entities/guide';

declare global {
  interface Window {
    GUIDE_DATA: GuideData;
    RUST_LAB: Exercise[];
    GO_LAB: Exercise[];
    RUST_QUESTS: Exercise[];
    GO_QUESTS: Exercise[];
    RUST_CAMPAIGN: CampaignWorldDefinition[];
    GO_CAMPAIGN: CampaignWorldDefinition[];
  }
}

window.GUIDE_DATA = curriculum.guide as GuideData;
window.RUST_LAB = curriculum.lab.rust as Exercise[];
window.GO_LAB = curriculum.lab.go as Exercise[];
window.RUST_QUESTS = curriculum.quests.rust as Exercise[];
window.GO_QUESTS = curriculum.quests.go as Exercise[];
window.RUST_CAMPAIGN = curriculum.campaign.rust as CampaignWorldDefinition[];
window.GO_CAMPAIGN = curriculum.campaign.go as CampaignWorldDefinition[];
```

`src/entities/guide/index.ts`:
```ts
export type {
  GuideData,
  GuideLanguage,
  GuideModule,
  GuideQuiz,
  GuideResource,
  GuideResourceCategory,
  GuideResourceCost,
  GuideResourceLanguage,
  GuideSource,
  GuideStep,
  GuideTrack,
} from './model/types';
export { mergeRouteProgress } from './model/route-progress';
export type { RouteNotes, RouteProgressV1 } from './model/route-progress';
```

- [ ] **Paso 8: Borrar la fuente reemplazada y el codemod**

```bash
rm src/entities/guide/content/guide-data.ts && rm tools/content/migrate-guide.ts
```

- [ ] **Paso 9: Verificar**

Ejecutar:
```bash
npm run typecheck && node tools/content/dump-globals.ts . | sha256sum
npm test && npm run lint && npm run format:check && git add -N content && git diff --check
```
Esperado:
- el oráculo da `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`;
- `28 checks passed.`, con `guide-content-check` en verde, y el resto en verde.

- [ ] **Paso 10: Commit**

```bash
git add tools/content/guide.ts tools/content/load-curriculum.ts qa/content-guide-check.ts qa/run-checks.ts content/guide src/app/legacy/register-catalogs.ts src/entities/guide
git commit -m "refactor(contenido): guía en content/guide con un archivo por recurso y por paso"
```

---

### Tarea 11: Atlas

El Atlas es la única vista React que lee contenido. Sus tipos pasan a `model/types.ts` y
`atlasByLanguage`, a `model/atlas-catalog.ts`, que lee el JSON. El oráculo suma esa ruta como
primer candidato y conserva la vieja para poder correr sobre commits anteriores.

**Archivos:**
- Crear:
  - `tools/content/atlas.ts` y `qa/content-atlas-check.ts`;
  - `content/atlas/`, escrito por el codemod;
  - `src/pages/atlas/model/types.ts` y `src/pages/atlas/model/atlas-catalog.ts`.
- Crear y borrar en la misma tarea: `tools/content/migrate-atlas.ts`.
- Modificar:
  - `qa/run-checks.ts`, `tools/content/load-curriculum.ts` y `tools/content/dump-globals.ts`;
  - `src/pages/atlas/index.ts`, `src/pages/atlas/model/filter-concepts.ts` y cinco componentes
    de `src/pages/atlas/ui/`;
  - `qa/atlas-check.ts` y `qa/curriculum-ids-check.ts`.
- Borrar: `src/pages/atlas/content/atlas-content.ts`.

**Interfaces:**
- Produce `loadAtlas(root)`, de tipo `Record<Language, JsonRecord[]>`, y `curriculum.atlas`.
- `src/pages/atlas` sigue exportando `atlasByLanguage` y el tipo `AtlasLanguage` con los mismos
  nombres; cambia sólo de qué archivo salen.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`qa/content-atlas-check.ts`:
```ts
/* Conceptos del Atlas en content/atlas/ (tools/content/atlas.ts).
 * node qa/content-atlas-check.ts
 *
 * Contrato: el manifiesto ordena los conceptos por lenguaje; cada concepto se publica tal cual y
 * `furtherSources` es la única clave opcional.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { loadAtlas } from '../tools/content/atlas.ts';
import { ContentError } from '../tools/content/content-error.ts';

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'taller-atlas-'));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

function concept(id: string, extra = ''): string {
  return `id: ${id}
level: beginner
category: Fundamentos
title: Concepto ${id}
summary: Resumen.
why: Porque importa.
code: |-
  fn a() {
      b()
  }
explanation: Explicación.
comparison: Comparación.
pitfall: Trampa.
quiz:
  question: ¿Sí?
  options:
    - Sí
    - No
  answer: 0
  explanation: Sí.
labId: rust-01
source:
  title: Libro
  url: https://example.org/libro
${extra}`;
}

function atlasFiles(): Record<string, string> {
  return {
    'content/atlas/manifest.yaml': 'rust:\n  - rust-b\n  - rust-a\ngo:\n  - go-a\n',
    'content/atlas/rust-a.yaml': concept('rust-a'),
    'content/atlas/rust-b.yaml': concept(
      'rust-b',
      'furtherSources:\n  - title: Más\n    url: https://example.org/mas\n',
    ),
    'content/atlas/go-a.yaml': concept('go-a'),
  };
}

test('el Atlas sigue el orden del manifiesto y furtherSources es opcional', () => {
  const atlas = loadAtlas(fixture(atlasFiles()));
  assert.deepEqual(Object.keys(atlas), ['rust', 'go']);
  assert.deepEqual(
    atlas.rust.map((item) => item.id),
    ['rust-b', 'rust-a'],
  );
  assert.equal(atlas.rust[1].code, 'fn a() {\n    b()\n}');
  assert.deepEqual(atlas.rust[0].furtherSources, [
    { title: 'Más', url: 'https://example.org/mas' },
  ]);
  assert.equal(Object.hasOwn(atlas.rust[1], 'furtherSources'), false);
});

test('validación: furtherSources, si está, no puede quedar vacío', () => {
  const files = {
    ...atlasFiles(),
    'content/atlas/go-a.yaml': concept('go-a', 'furtherSources: []\n'),
  };
  assert.throws(
    () => loadAtlas(fixture(files)),
    (error: unknown) =>
      error instanceof ContentError &&
      error.message === 'content/atlas/go-a.yaml: furtherSources: la lista no puede estar vacía',
  );
});

for (const root of roots) rmSync(root, { recursive: true, force: true });
console.log(`${passed} content-atlas scenarios PASS.`);
```

- [ ] **Paso 2: Correr las pruebas y ver que fallan**

Ejecutar: `node qa/content-atlas-check.ts`
Esperado: FAIL con `ERR_MODULE_NOT_FOUND` por `tools/content/atlas.ts`.

- [ ] **Paso 3: Implementar**

`tools/content/atlas.ts`:
```ts
// Conceptos del Atlas: content/atlas/manifest.yaml los ordena por lenguaje y cada
// content/atlas/<id>.yaml es un concepto de atlasByLanguage. `furtherSources` es opcional.
import { LEVEL_IDS } from '../../src/shared/config/levels.ts';
import { LANGUAGES, type Language } from './catalogs.ts';
import { loadGroupedRecords } from './records.ts';
import {
  checkQuestion,
  checkSource,
  expectText,
  listOf,
  oneOf,
  type Check,
  type JsonRecord,
} from './shape.ts';

const CONCEPT_SPEC: Record<string, Check> = {
  id: expectText,
  level: oneOf(LEVEL_IDS),
  category: expectText,
  title: expectText,
  summary: expectText,
  why: expectText,
  code: expectText,
  explanation: expectText,
  comparison: expectText,
  pitfall: expectText,
  quiz: checkQuestion,
  labId: expectText,
  source: checkSource,
  furtherSources: listOf(checkSource, 1),
};

export function loadAtlas(root: string): Record<Language, JsonRecord[]> {
  return loadGroupedRecords(root, 'content/atlas', LANGUAGES, CONCEPT_SPEC, ['furtherSources']);
}
```

- [ ] **Paso 4: Correr las pruebas y ver que pasan**

Ejecutar: `node qa/content-atlas-check.ts`
Esperado: `2 content-atlas scenarios PASS.`

En `qa/run-checks.ts`, después de `'content-guide-check.ts',`, agregar:
```ts
  'content-atlas-check.ts',
```

- [ ] **Paso 5: Escribir el codemod**

`tools/content/migrate-atlas.ts`:
```ts
// Codemod de un solo uso (plan A1, tarea 11): pasa los conceptos del Atlas de atlas-content.ts
// a content/atlas/. Se borra en la misma tarea, después de verificar el oráculo.
// Uso: node tools/content/migrate-atlas.ts
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { importModule, repoRoot } from '../../qa/lib/sources.ts';
import { loadAtlas } from './atlas.ts';

type Fields = Record<string, unknown>;
const { atlasByLanguage } = await importModule<{ atlasByLanguage: Record<string, Fields[]> }>(
  'src/pages/atlas/content/atlas-content.ts',
);

const folder = join(repoRoot, 'content/atlas');
mkdirSync(folder, { recursive: true });
const manifest = Object.fromEntries(
  Object.entries(atlasByLanguage).map(([language, concepts]) => [
    language,
    concepts.map((concept) => concept.id),
  ]),
);
writeFileSync(
  join(folder, 'manifest.yaml'),
  '# Conceptos del Atlas por lenguaje, en orden. Los fragmentos ilustran conceptos; el\n' +
    '# laboratorio ejecuta los ejercicios. Los IDs son inmutables: indexan el progreso.\n' +
    stringify(manifest),
);
for (const concept of Object.values(atlasByLanguage).flat()) {
  writeFileSync(join(folder, `${concept.id}.yaml`), stringify(concept, { lineWidth: 0 }));
}

// El cargador real tiene que reconstruir atlasByLanguage idéntico, con el mismo orden de claves.
assert.equal(JSON.stringify(loadAtlas(repoRoot)), JSON.stringify(atlasByLanguage));
console.log('content/atlas idéntico a atlasByLanguage.');
```

- [ ] **Paso 6: Correr el codemod y formatear**

Ejecutar:
```bash
node tools/content/migrate-atlas.ts && npx prettier --write content && (grep -rln '[[:space:]]$' content || echo 'sin espacios finales')
```
Esperado:
- `content/atlas idéntico a atlasByLanguage.` y `sin espacios finales`;
- 32 conceptos. El `code` de cada uno queda como bloque literal `|-`.

- [ ] **Paso 7: Generador**

`tools/content/load-curriculum.ts`:
```ts
// Arma curriculum.json a partir de content/. Cada clave publica uno o más catálogos legacy;
// los adaptadores de src/app/legacy/ los asignan a window.* sin transformarlos.
import { loadAtlas } from './atlas.ts';
import { loadCampaign } from './campaign.ts';
import type { Language, SystemsDomain } from './catalogs.ts';
import { expectDistinctIds, interleaveCores, loadLanguage } from './exercises.ts';
import { loadGuide } from './guide.ts';
import type { JsonRecord } from './shape.ts';
import { loadWorkshops } from './workshops.ts';

export interface Curriculum {
  lab: Record<Language, JsonRecord[]>;
  quests: Record<Language, JsonRecord[]>;
  cores: Record<SystemsDomain, JsonRecord[]>;
  campaign: Record<Language, JsonRecord[]>;
  workshops: Record<SystemsDomain, JsonRecord[]>;
  guide: JsonRecord;
  atlas: Record<Language, JsonRecord[]>;
}

export function loadCurriculum(root: string): Curriculum {
  const rust = loadLanguage(root, 'rust');
  const go = loadLanguage(root, 'go');
  expectDistinctIds(rust, go);
  return {
    lab: { rust: rust.lab, go: go.lab },
    quests: { rust: rust.quests, go: go.quests },
    cores: interleaveCores(rust, go),
    campaign: loadCampaign(root),
    workshops: loadWorkshops(root),
    guide: loadGuide(root),
    atlas: loadAtlas(root),
  };
}
```

Ejecutar: `npm run curriculum`

- [ ] **Paso 8: El Atlas lee el JSON**

`src/pages/atlas/model/types.ts` lleva los tipos de `atlas-content.ts` sin cambios:
```ts
import type { LevelId } from '../../../shared/config/levels';

export type AtlasLanguage = 'rust' | 'go';
export type AtlasLevel = LevelId;

export interface AtlasSource {
  title: string;
  url: string;
}

export interface AtlasQuiz {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface AtlasConcept {
  id: string;
  level: AtlasLevel;
  category: string;
  title: string;
  summary: string;
  why: string;
  code: string;
  explanation: string;
  comparison: string;
  pitfall: string;
  quiz: AtlasQuiz;
  labId: string;
  source: AtlasSource;
  furtherSources?: AtlasSource[];
}

export type AtlasByLanguage = Record<AtlasLanguage, AtlasConcept[]>;
```

`src/pages/atlas/model/atlas-catalog.ts`:
```ts
import curriculum from '../../../../build/curriculum.json';
import type { AtlasByLanguage } from './types';

// Los conceptos viven en content/atlas/; tools/content/build-curriculum.ts los valida y los
// deja en build/curriculum.json, que `npm run typecheck` y `npm run dev` regeneran antes.
export const atlasByLanguage = curriculum.atlas as AtlasByLanguage;
```

`src/pages/atlas/index.ts`:
```ts
export { default as AtlasPage } from './ui/AtlasPage';
export { createAtlasSession, type AtlasSession } from './model/atlas-session';
export { atlasByLanguage } from './model/atlas-catalog';
export type { AtlasLanguage } from './model/types';
```

Imports de tipos:
- En `src/pages/atlas/ui/AdditionalSources.tsx`, `ConceptIndex.tsx`, `AtlasPage.tsx`,
  `ConceptDetail.tsx` y `ConceptQuiz.tsx`, reemplazar `from '../content/atlas-content';` por
  `from '../model/types';`.
- En `src/pages/atlas/model/filter-concepts.ts`, reemplazar `from '../content/atlas-content';` por
  `from './types';`.

En `qa/atlas-check.ts` y `qa/curriculum-ids-check.ts`, reemplazar
`'src/pages/atlas/content/atlas-content.ts'` por `'src/pages/atlas/model/atlas-catalog.ts'`.

- [ ] **Paso 9: El oráculo, a los dos lados del cambio de ruta**

Ejecutar: `node tools/content/dump-globals.ts . | sha256sum`
Esperado: `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`. Todavía lee
`atlas-content.ts`.

En `tools/content/dump-globals.ts`, reemplazar:
```ts
const atlasCandidates = ['src/pages/atlas/content/atlas-content.ts'];
```
por:
```ts
const atlasCandidates = [
  'src/pages/atlas/model/atlas-catalog.ts',
  'src/pages/atlas/content/atlas-content.ts',
];
```

Ejecutar: `node tools/content/dump-globals.ts . | sha256sum`
Esperado: el mismo sha256, ahora leyendo `atlas-catalog.ts`.

- [ ] **Paso 10: Borrar la fuente reemplazada y el codemod**

```bash
rm src/pages/atlas/content/atlas-content.ts && rm tools/content/migrate-atlas.ts
```

- [ ] **Paso 11: Verificar**

Ejecutar:
```bash
npm run typecheck && node tools/content/dump-globals.ts . | sha256sum && grep -rn "atlas-content" src qa tools
npm test && npm run lint && npm run format:check && git add -N content && git diff --check
```
Esperado:
- el oráculo da `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`;
- `grep` sólo encuentra la ruta vieja en la lista de candidatos de `dump-globals.ts`;
- `29 checks passed.`, con `atlas-check` y `curriculum-ids-check` en verde, y el resto en verde.

- [ ] **Paso 12: Commit**

```bash
git add tools/content/atlas.ts tools/content/load-curriculum.ts tools/content/dump-globals.ts qa/content-atlas-check.ts qa/run-checks.ts qa/atlas-check.ts qa/curriculum-ids-check.ts content/atlas src/pages/atlas
git commit -m "refactor(contenido): Atlas en content/atlas; la página lee build/curriculum.json"
```

---

### Tarea 12: Documentación, configuración y verificación final (agente principal)

Todos los cambios de esta tarea los integra el agente principal: documentación,
`.dockerignore`, `.claude/launch.json` y la hoja de ruta. `.gitignore` ya cambió en la tarea 2;
acá sólo se revisa.

**Archivos:**
- Modificar: `AGENTS.md`, `docs/architecture.md`, `README.md`, `qa/AGENTS.md`, `.dockerignore`,
  `.claude/launch.json` y `docs/plans/2026-10-04-backend-hoja-de-ruta.md`.

**Interfaces:**
- Consume todo lo anterior. No agrega código.

- [ ] **Paso 1: `AGENTS.md`**

En «Organización», después del punto ``- Antes de cambiar un flujo educativo, leé `README.md`.``,
agregar:
```markdown
- Para agregar o editar contenido del currículo (ejercicios, desafíos, núcleos, mundos,
  talleres, Atlas o guía), leé «Contenido del currículo» en `README.md`: se edita `content/`,
  nunca `build/`.
```

En el mismo bloque, reemplazar:
```markdown
`src/index.html` y `src/app/main.tsx` son las entradas Vite; `dist/` es la salida
generada. Los `CLAUDE.md` sólo importan este archivo y los de cada
```
por:
```markdown
`src/index.html` y `src/app/main.tsx` son las entradas Vite; `dist/` es la salida
generada. `content/` es la fuente del currículo (YAML y código Rust y Go real);
`tools/content/` la valida y genera `build/curriculum.json`, otra salida ignorada que
importan los adaptadores. Los `CLAUDE.md` sólo importan este archivo y los de cada
```

En «Comandos», reemplazar:
```markdown
Vite empaqueta React, las fuentes legacy y los estilos en `dist/index.html`.
```
por:
```markdown
Vite empaqueta React, las fuentes legacy, los estilos y `build/curriculum.json` en
`dist/index.html`. Ese JSON sale de `content/` con `npm run curriculum`, que corre antes de
`npm run typecheck` (y por eso de `build` y `test`) y de `npm run dev`.
```

- [ ] **Paso 2: `docs/architecture.md`**

En «Mapa de archivos», reemplazar en el mismo lugar nueve filas: las que empiezan con
«Contenido del recorrido y biblioteca», «Catálogos de contenido», «Ejercicios del recorrido»,
«Atlas migrado», «Desafíos nuevos de campaña», «Mundos de campaña», «Fichas de los talleres»,
«Núcleos Rust/Go de Sistemas» y «Construcción y dependencias». Quedan así:
```markdown
| Contenido del recorrido y biblioteca | `content/guide/`; tipos y progreso en `src/entities/guide/` |
| Catálogos de contenido (publicados en `window.*`) | `content/` → `tools/content/` → `build/curriculum.json`; adaptador `src/app/legacy/register-catalogs.ts` |
| Ejercicios del recorrido y tipo `Exercise` | sección `lab` de `content/{rust,go}/manifest.yaml` y `content/{rust,go}/exercises/<id>/`; `src/entities/exercise/model/types.ts` |
| Atlas migrado a React/TypeScript | `src/pages/atlas/` (`ui`, `model`, `lib`), conceptos en `content/atlas/` y adaptador `src/app/legacy/register-atlas.tsx` |
| Desafíos nuevos de campaña | sección `quests` de `content/{rust,go}/manifest.yaml` (la posición en el mundo fija tipo, `kind` y minutos del jefe) |
| Mundos de campaña | `content/campaign/` |
| Fichas de los talleres | `content/workshops/` |
| Núcleos Rust/Go de Sistemas | sección `systems` de `content/{rust,go}/manifest.yaml` y una carpeta por núcleo en `content/{rust,go}/exercises/` |
| Construcción y dependencias | configuración Vite, `package.json`, `package-lock.json`; generador del currículo en `tools/content/` (`npm run curriculum`, validación, `build/curriculum.json` y oráculos de equivalencia) |
```

En «Contratos que hay que preservar», después del primer punto, el de los IDs, agregar:
```markdown
- El contenido se edita en `content/` y nunca en `build/curriculum.json`. El orden de cada
  catálogo sale de su manifiesto, nunca del número del ID. El orden de claves de los
  ejercicios lo fija `tools/content/catalogs.ts`, porque el código legacy lo observa. Si un
  cambio no debe alterar los catálogos, `node tools/content/dump-globals.ts .` da los mismos
  bytes antes y después.
```

- [ ] **Paso 3: `README.md`**

En «Desarrollo», reemplazar el párrafo que empieza con `Archivos principales:` por:
```markdown
Archivos principales: `content/` (el currículo en YAML: ejercicios del recorrido, 24 desafíos nuevos y núcleos de Sistemas con su código Rust y Go real, mundos, talleres, Atlas y guía), `tools/content/` (valida `content/` y genera `build/curriculum.json`), `src/pages/atlas/` (Atlas React: componentes y modelo), `src/app/` (entrada y adaptadores legacy, que publican los catálogos de `build/curriculum.json`), `src/shared/` (helpers comunes, transporte a los Playgrounds en `api/playground`, editor CodeMirror en `ui/code-editor`), `src/entities/exercise/` (evidencia y ejecución), `src/features/download-project-kit/` (kits ZIP), `src/entities/guide/` (tipos y progreso de la guía), `src/entities/campaign/` (reglas de la campaña), `lab.js` (aprendizaje y revisión), `lab-explorers.js` (modelos y misiones), `app.js` (shell y recorrido), `campaign.js` / `campaign.css` (interfaz de campaña).
```

En el párrafo siguiente, que empieza con `Sistemas separa los datos y modelos puros:`, reemplazar:
```markdown
las fichas de los talleres están en `src/entities/systems-workshop/content/` y los núcleos Rust/Go en `src/entities/exercise/content/systems-*-cores.ts`.
```
por:
```markdown
las fichas de los talleres están en `content/workshops/` y los núcleos Rust/Go, en la sección `systems` de `content/<lenguaje>/manifest.yaml`, con una carpeta por núcleo en `content/<lenguaje>/exercises/`.
```

Antes de `## Verificación`, agregar:
````markdown
### Contenido del currículo

El currículo se edita en `content/`; `build/curriculum.json` es una salida generada que no se versiona.

```
content/<rust|go>/manifest.yaml      etapas en orden (recorrido, desafíos y núcleos) y sus valores por defecto
content/<rust|go>/exercises/<id>/    exercise.yaml, starter.<rs|go> y solution.<rs|go>
content/campaign/  content/workshops/  content/atlas/
                                     manifest.yaml con el orden y un <id>.yaml por registro
content/guide/                       biblioteca, fuentes y un manifiesto con sus pasos por recorrido
```

Para agregar un ejercicio:

1. Elegí un ID que nunca se haya usado: los IDs indexan el progreso guardado. El orden y la etapa salen del manifiesto, no del número del ID.
2. Agregalo a la lista `exercises` de su etapa en `content/<lenguaje>/manifest.yaml`.
3. Creá `content/<lenguaje>/exercises/<id>/` con tres archivos:
   - `exercise.yaml`, sólo con lo que difiere de `defaults` y de la etapa: título, textos, instrucciones, pruebas `t1`, `t2`…, tres pistas, revisión, transferencia y predicción; si hace falta, también `level`, `kind`, `minutes`, `imports`, `visual` o `sources`;
   - `starter.<rs|go>` y `solution.<rs|go>`, con el código tal cual. Los `.go` empiezan con `package main` y una línea en blanco.
4. Corré `npm run curriculum`, que valida todo `content/` y nombra el archivo y el campo de cada error. Después, `npm test`.

Un ejercicio nuevo cambia a propósito contratos que se actualizan a mano: `qa/fixtures/curriculum-ids.json` y las cantidades que esperan `content-check` y este README. `npm run format` también formatea los YAML.
````

- [ ] **Paso 4: `qa/AGENTS.md`**

Después del punto que empieza con ``- `qa/lib/legacy-sources.ts` concentra``, agregar:
```markdown
- Los catálogos se publican desde `build/curriculum.json`, que `tools/content/` genera a partir
  de `content/`. `npm test` lo regenera por `pretypecheck`; antes de un check suelto, después
  de editar `content/`, corré `npm run curriculum`.
```

En la tabla «Elegir comprobaciones», después de la fila de IDs, agregar:
```markdown
| Contenido en `content/` o generador en `tools/content/` | `npm run curriculum`; el `node qa/content-*-check.ts` del módulo tocado; si ningún catálogo debe cambiar, `node tools/content/dump-globals.ts .` da los mismos bytes antes y después |
```

En «Red de seguridad para refactors», después del punto de `load-order-check`, agregar:
```markdown
- `tools/content/dump-globals.ts` es el oráculo de equivalencia. Vuelca en JSON canónico lo que
  publican los adaptadores, los modelos de Sistemas y el Atlas. `tools/content/dump-dist-globals.ts`
  hace lo mismo con un `dist/index.html` construido. Un refactor puro deja ambos volcados
  idénticos.
```

- [ ] **Paso 5: Configuración**

En `.dockerignore`, después de la línea `dist`, agregar:
```
build
```
La imagen regenera `build/` con `npm run build`. Una copia local vieja no debe entrar al
contexto.

En `.claude/launch.json`, la configuración `dev` queda así:
```json
    {
      "name": "dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "--", "--port", "5173", "--strictPort"],
      "port": 5173
    }
```
`npx vite` salteaba `predev` y podía servir un `build/curriculum.json` viejo o inexistente.

Revisar que `.gitignore` tenga `/build/` (tarea 2) y que ni `.gitignore` ni `.dockerignore`
excluyan `content/` ni `tools/content/`.

- [ ] **Paso 6: Hoja de ruta**

En `docs/plans/2026-10-04-backend-hoja-de-ruta.md`, la fila A1 queda:
```markdown
| A1 | Contenido en YAML y código real, con oráculo idéntico | — | `content/` reemplaza los catálogos `.ts`; `curriculum.json` generado; oráculo `dump-globals-v2` idéntico y catálogos del bundle idénticos (los bytes del bundle no pueden serlo) | [2026-10-04-contenido-yaml.md](2026-10-04-contenido-yaml.md) |
```

- [ ] **Paso 7: Verificación final**

Ejecutar:
```bash
npm run build && npm test && npm run lint && npm run format:check && git diff --check
node tools/content/dump-globals.ts . > build/oracle/after.json && sha256sum build/oracle/after.json
node tools/content/dump-dist-globals.ts dist/index.html > build/oracle/dist-after.json
node -e "const fs = require('node:fs'); const oracle = JSON.parse(fs.readFileSync('build/oracle/after.json', 'utf8')).globals; process.exit(JSON.stringify(oracle) === fs.readFileSync('build/oracle/dist-after.json', 'utf8') ? 0 : 1)" && echo 'dist = oráculo'
sha256sum dist/index.html && wc -c dist/index.html
node qa/runtime-check.ts rust --audit-record && node qa/runtime-check.ts go --audit-record
```
Esperado:
- `29 checks passed.`, ESLint con 0 errores y los 35 avisos de siempre, Prettier y
  `git diff --check` limpios;
- `build/oracle/after.json` da `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`
  y se lee `dist = oráculo`. La comparación usa el volcado recién hecho, que por su sha256 es
  igual a la línea base, así que no depende de que `build/oracle/before.json` siga ahí;
- el sha256 del dist es distinto del de partida. Ronda los 2 202 074 bytes y `build-check` pasa
  por debajo de 2 500 000 caracteres;
- 137/137 y 411 aserciones por lenguaje.

Anotar en el commit el sha256 y los bytes del dist antes (tarea 2) y después.

- [ ] **Paso 8: Go parseable y Docker**

Si la imagen `golang:1.27-alpine`, ya aprobada para B1, está en el equipo, ejecutar:
```bash
docker run --rm --network none -v "$PWD/content:/content:ro" golang:1.27-alpine sh -c 'bad=0; for f in $(find /content -name "*.go"); do gofmt -e "$f" > /dev/null || bad=$((bad + 1)); done; echo "sin parsear: $bad"'
```
Esperado: `sin parsear: 0`. Los 274 archivos `.go` se parsean. `gofmt -l` los lista igual
porque conservan su indentación de cuatro espacios: no se reformatea código. Si la imagen no
está, se informa la limitación; no se descarga.

La imagen web usa `node:24-alpine` y `nginxinc/nginx-unprivileged:stable-alpine`, las dos
fijadas por digest en `Dockerfile`.
- Si están en el equipo, ejecutar
  `docker compose up --build -d --wait && curl -fsS http://localhost:8080/healthz && docker compose down`.
- Si no están, consultar en el registro el tamaño de cada imagen y pedir permiso al usuario con
  nombre, origen y tamaño. Sin permiso, informar que esta verificación quedó pendiente.

- [ ] **Paso 9: Navegador**

Ejecutar `npm run build` y abrir la configuración `preview` de `.claude/launch.json`
(`vite preview` en el puerto 4173). Comprobar:

- **Laboratorio:** `rust-01` y `go-01` muestran su código inicial; el de Go no muestra
  `package main`.
- **Pruebas:** las pruebas de `rust-19` muestran el texto con tabuladores.
- **Campaña:** los cuatro mundos de cada lenguaje con sus misiones.
- **Sistemas:** el taller `cache`, con su núcleo Rust y el Go.
- **Atlas y biblioteca:** un concepto del Atlas y la biblioteca de la guía.

No hay cambios de interfaz: el objetivo es ver que los catálogos llegan al navegador.

- [ ] **Paso 10: Revisión adversarial**

El agente principal le pide al `revisor` (Opus) que revise A1 contra el ADR 0004 (sección 2) y
este plan:
- orden de claves y valores por defecto;
- código byte a byte;
- validaciones y sus mensajes;
- borrado de los módulos reemplazados;
- documentación.

Los hallazgos se corrigen con TDD antes de cerrar A1.

- [ ] **Paso 11: Commit**

```bash
git add AGENTS.md docs/architecture.md README.md qa/AGENTS.md .dockerignore .claude/launch.json docs/plans/2026-10-04-backend-hoja-de-ruta.md
git commit -m "docs(contenido): content/ como fuente del currículo, comandos y verificación de A1"
```

---

## Decisiones interpretadas y límites

Este plan se ensayó completo sobre una copia de `ec2e84f`, de la tarea 1 a la 12, con el código
que figura acá. Resultados:
- el oráculo dio `cd1f9e62…` en todos los puntos de control;
- la suite pasó de 24 a 29 checks y ESLint siguió en 35 avisos;
- `runtime-check --audit-record` dio 137/137 por lenguaje;
- `build/curriculum.json` pesa unos 1,36 MB, el generador tarda menos de medio segundo y
  `content/` suma 935 archivos.

1. **El bundle no puede quedar idéntico byte a byte.** Se pedía comprobarlo o explicar por qué
   no.
   - Las fábricas (`add`, `defineQuest`, `numberTests` y los constructores) salen del bundle, y
     Vite incrusta el JSON como un `JSON.parse(...)` por clave de primer nivel.
   - Ese JSON, con todas sus claves entre comillas, pesa más que los literales minificados: el
     ensayo dio 2 202 074 bytes contra 2 044 640. `build-check` sigue por debajo de su tope de
     2,5 millones de caracteres.
   - En su lugar se verifica que el dist construido publique exactamente los catálogos del
     oráculo, con `dump-dist-globals.ts` (tareas 2 y 12), además de `boot-check` y el navegador.
2. **El orden de claves sale de una plantilla por catálogo, no del orden del YAML.** La fusión de
   valores es la de las fábricas, como se pedía.
   - Los núcleos eran literales con cuatro órdenes distintos: en pc, `id` va después de
     `sources`. Un spread de valores por defecto no los reproduce.
   - `EXERCISE_KEY_ORDER` los fija y vuelve el resultado independiente de cómo se escriba el
     YAML. Además, rechaza claves desconocidas.
   - Mundos, talleres, Atlas y guía, que eran literales sin fusión, conservan el orden del YAML.
3. **Pruebas con ID explícito.** `exercise.yaml` guarda `id: t1`, `t2`… en lugar de numerarlas en
   el cargador como `numberTests`.
   - Así se puede validar que las pruebas tengan IDs únicos y en orden, y C2 indexa
     `exercise_tests` por `(exercise_id, test_key)`.
   - La salida es la misma.
4. **Valores por defecto tomados de las fábricas.**
   - En las tareas 5 a 7, el codemod lee los valores de la fábrica: `stageDefaults` se exporta
     y `catalog` se exporta y se prueba con borradores vacíos. Esas exportaciones viven sólo
     dentro de la tarea que borra el módulo.
   - Leerlos del catálogo publicado no alcanza: donde todos los ejercicios de una etapa los
     redefinen, el valor por defecto no se ve y el oráculo no detectaría uno equivocado.
5. **Núcleos sin fábrica.** Su etapa lleva sólo `topicId` y `topic`, y `exercise.yaml` guarda lo
   demás, salvo lo que coincide con `defaults`.
   - Los bloques que Rust y Go compartían en TypeScript (`cacheShared`, `walCommon`…) quedan
     repetidos en los dos `exercise.yaml`.
   - Las 178 referencias compartidas pasan a ser copias. Ningún consumidor muta los catálogos:
     se revisaron `lab.js`, `systems.js`, `campaign.js`, `app.js` y los exploradores.
6. **Desafíos.** El cargador aplica la regla de posición de `defineQuest`: repair, kata y boss;
   `reparar` en el primero; y en el jefe, los minutos de `bossMinutes`. El manifiesto da los
   datos del mundo, incluidos `minutes: 12` y `bossMinutes`.
7. **Secciones opcionales del cargador.** `quests` y `systems` son opcionales en
   `loadLanguage` para que las pruebas armen lenguajes chicos. Que el contenido real las tenga
   lo exigen `content-check` (12 desafíos y 25 núcleos por lenguaje) y `curriculum-ids-check`.
8. **División de la guía,** con el criterio de los ejercicios:
   - un manifiesto por recorrido con sus módulos y los IDs de sus pasos, como el manifiesto de
     lenguaje con sus etapas;
   - un archivo por paso y por recurso, porque tienen ID;
   - las fuentes, que no tienen ID, en un solo archivo.
9. **Prettier formatea `content/**/*.yaml`;** no se ignora.
   - Razones: el YAML es fuente escrita a mano de ahora en adelante, `npm run format:check` lo
     revisa como al resto del código y Prettier es el único formateador del repo. Ignorarlo
     dejaría a cada autor con su propio estilo.
   - Riesgo: Prettier pasa a comillas simples las cadenas que pueden. Por eso cada tarea vuelve
     a correr el oráculo después de `prettier --write content`.
   - En el ensayo el contenido no cambió, y las seis cadenas con `\t` o `\n` siguen entre
     comillas dobles.
10. **`/build/` entra a `.gitignore` en la tarea 2** y no junto con la documentación de la tarea
    12. Prettier 3 lee `.gitignore`, y sin esa línea `format:check` falla con los volcados del
    oráculo.
11. **Oráculo en TypeScript** (`tools/content/dump-globals.ts`), porque `AGENTS.md` pide `.ts`
    cuando el archivo puede serlo.
    - Para que siga funcionando con `atlas-content.ts` borrado, la tarea 11 le suma la ruta
      nueva como primer candidato.
    - La equivalencia con `dump-globals-v2.mjs` se prueba por sha256 en la tarea 2.
12. **Go parseable.** Los 274 `.go` del ensayo pasan `gofmt -e`, aunque `gofmt -l` los lista
    porque conservan cuatro espacios en lugar de tabuladores. La tarea 12 lo repite con
    `golang:1.27-alpine` si la imagen está en el equipo.
13. **Ningún check suelto regenera el JSON.** `npm test`, `npm run build`, `npm run typecheck` y
    `npm run dev` sí lo regeneran. Después de editar `content/`, un `node qa/<check>.ts` suelto
    lee el JSON anterior hasta correr `npm run curriculum`; `qa/AGENTS.md` lo documenta.
14. **Niveles de dificultad.** El generador importa `LEVEL_IDS` directo de
    `src/shared/config/levels.ts` para no duplicar la lista.
    - Funciona porque ese archivo no tiene imports: Node lo ejecuta y `tsconfig.qa.json` lo
      tipa con NodeNext.
    - Si algún día suma un import sin extensión, hay que mover la lista a un módulo sin
      dependencias.
15. **Comandos literales ensayados.** Los borrados con `rm` y los `git add` de cada commit se
    corrieron tal cual sobre una copia limpia. Cada commit quedó igual al del ensayo, sin
    archivos sueltos, incluso donde la tarea edita el módulo antes de borrarlo.
