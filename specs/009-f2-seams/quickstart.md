# Quickstart: F2a · Validación

Cómo se comprueba que una unidad no cambió nada de lo que ve ni guarda el alumno, con los comandos y los valores esperados. Los valores de la base están en la tabla «Línea base» de [research.md](./research.md); el procedimiento de cada compuerta, en «Línea base y compuerta de cada unidad» del [plan](./plan.md). Todo corre desde la raíz del worktree, con Node 24 y sin descargar nada; la única descarga de F2a, la de Zustand, es la de T008.

## 0. Una función para el hash

Portable entre Linux y macOS (no depende de `sha256sum`). Sirve para un archivo (`sha < archivo`) y para la salida de un comando (`comando | sha`):

```sh
sha() { node -e 'const h=require("node:crypto").createHash("sha256");process.stdin.on("data",d=>h.update(d)).on("end",()=>console.log(h.digest("hex")))'; }
```

## 1. La línea base (T001)

1. En un worktree limpio de la base de implementación: `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`: todo en verde.
2. Los oráculos, con el build recién hecho:

   ```sh
   sha < build/curriculum.json                                       # ef8f5715…
   node -e 'console.log(require("./build/curriculum.meta.json").documentHash)'   # igual al anterior
   node tools/content/dump-globals.ts . | sha                        # cd1f9e62… si lo anterior es ef8f5715…
   node tools/content/dump-dist-globals.ts dist/index.html 2>/dev/null | sha     # daf2bc71…
   sha < frontend/src/index.html                                     # 6c3b7e6a…
   ```

3. La medida del dist (caracteres, bytes, estilo, marcado y `import(`):

   ```sh
   node -e '
   const fs=require("node:fs"),c=require("node:crypto");
   const sha=(s)=>c.createHash("sha256").update(s).digest("hex");
   const html=fs.readFileSync("dist/index.html","utf8");
   const style=/<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
   const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,"<script></script>").replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,"<style></style>");
   console.log(JSON.stringify({chars:html.length,bytes:Buffer.byteLength(html),style:sha(style),markup:sha(markup),dynamicImports:(html.match(/\bimport\(/g)||[]).length,importMeta:(html.match(/import\.meta/g)||[]).length}));'
   ```

   Esperado en la base de planificación: `chars` 2 186 460, `bytes` 2 202 074, `style` `850ef821…`, `markup` `562c5364…`, `dynamicImports` 0 e `importMeta` 0.
4. Los avisos de complejidad y los escenarios de cada check: `npm run lint 2>&1 | grep -c complexity` (35) y `node qa/<check>.ts | grep -c '^PASS'` para `boot`, `app-shell`, `lab-state`, `lab-bridge`, `systems`, `project-kit`, `campaign` y `versioned-storage`.
5. Un commit de documentación con esos valores en «Línea base de la implementación» de research.md.

## 2. La compuerta de una unidad

Después de la unidad, con el build hecho: repetir los pasos 2 y 3 de §1 y comparar con T001.

| Salida | Esperado |
| --- | --- |
| `build/curriculum.json`, `dump-globals`, `dump-dist-globals` (stdout), `style` y `markup` | iguales a T001 |
| `frontend/src/index.html` | `git diff --quiet <base> -- frontend/src/index.html` |
| `chars` | `≤ 2 198 460` (se informa la medida) |
| `dynamicImports` e `importMeta` | 0 y 0 |

Y los comandos de la compuerta del plan:

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=<puerto> npm run test:e2e
git diff --name-only <base> | grep -E 'register-(catalogs|systems-(lowlevel|infra|play|pc))\.ts|atlas-catalog\.ts'   # vacío
git diff <base> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'          # vacío
```

## 3. Las comparaciones únicas

Se corren con scripts descartables en el directorio temporal, nunca en el repositorio, sobre dos raíces: la base y la unidad.

```sh
git worktree add "$TMPDIR/f2a-base" <base>       # el commit base de T001
ln -s "$PWD/node_modules" "$TMPDIR/f2a-base/node_modules"
(cd "$TMPDIR/f2a-base" && npm run curriculum)
```

### Unidad 2: los 274 programas

Es el script que corrió al planificar (`node compare-programs.ts <raíz base> <raíz unidad>`). Evalúa el `lab.js` de la base con los catálogos de los adaptadores y compara su `buildProgram` con el del módulo de la unidad, con tres entradas por ejercicio:

```ts
import path from 'node:path';
import vm from 'node:vm';

type Build = (exercise: Exercise, code: string, customTest?: string) => string;
interface Exercise { id: string; starter: string; solution: string }

const [baseRoot, unitRoot] = process.argv.slice(2).map((dir) => path.resolve(dir));
const baseSources = await import(`${baseRoot}/qa/lib/sources.ts`);
const baseLegacy = await import(`${baseRoot}/qa/lib/legacy-sources.ts`);
const unitSources = await import(`${unitRoot}/qa/lib/sources.ts`);

const storage = new Map<string, string>();
const context = vm.createContext({
  window: {},
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  },
});
baseLegacy.loadLabCatalogs(context);
baseSources.runSource(context, 'frontend/lab.js');
const lab = (context.window as { TallerLab: { getExercises(): Exercise[]; buildProgram: Build } }).TallerLab;
const next = await unitSources.importModule<{ buildProgram: Build }>('frontend/src/entities/exercise/index.ts');

let compared = 0;
let different = 0;
for (const exercise of lab.getExercises()) {
  for (const [code, custom] of [[exercise.starter, undefined], [exercise.solution, undefined], [exercise.solution, 'true']] as const) {
    compared++;
    if (lab.buildProgram(exercise, code, custom) !== next.buildProgram(exercise, code, custom)) different++;
  }
}
console.log({ exercises: lab.getExercises().length, compared, different });
```

Esperado: `{ exercises: 274, compared: 822, different: 0 }`. Además, la lista de ids de `lab.getExercises()` de la base y la de `createExerciseCatalog` con los mismos globals: 274 ids en el mismo orden.

### Unidad 4: los modelos que recibe el motor

Con el mismo esqueleto: en cada raíz, evaluar los cuatro adaptadores de Sistemas con `loadSystemsCatalogs`, poner en el contexto un `TallerSystemsEngine` falso cuyo `init(config)` guarde la configuración, evaluar `systems.js`, llamar a `TallerSystems.init()` y devolver `Object.keys(config.models)` y, por cada clave, si `config.models[nombre] === window.SYSTEMS_<DOMINIO>.models[nombre]`. Esperado: las 25 claves en el orden `pc`, `cache`, `heap`, `mmu`, `tlb`, `vm`, `stack`, `scheduler`, `interrupts`, `wal`, `lsm`, `quorum`, `clocks`, `network`, `backpressure`, `balancing`, `sharding`, `transforms`, `raster`, `raycast`, `pathfinding`, `physics`, `life`, `algebra` y `minimax`, todas idénticas en las dos raíces y todas iguales al objeto del global.

### Unidades 1 y 3: arrancar con las tres fixtures

Un solo script sirve para las dos unidades. Se arma copiando de `qa/boot-check.ts` todo lo que hay antes de `let passed = 0;` (el DOM falso y `createBootHarness`), y con un `driver` por raíz:

1. Poner el almacenamiento en una de las tres fixtures: las cuatro claves de `qa/fixtures/progress-master-2a278ad-storage.json`, o vacío más una de las dos exportaciones (`progress-master-2a278ad-export.json` y `progress-d0e1b49-export.json`) importada como lo hace el escenario «importación» de `boot-check`. Un caso más, con el almacenamiento vacío.
2. Envolver `localStorage` para registrar cada `getItem`, `setItem` y `removeItem` con su clave, en orden.
3. Evaluar `bundleApp('frontend/src/app/main.tsx')` (con su llamada final, que arranca la app en las dos raíces) y `await harness.flush()`.
4. Capturar el JSON de «Exportar progreso» con un `URL.createObjectURL` que guarde el `Blob` (como el `FakeURL` de `app-shell-check`), sin `exportedAt`; el contenido final del almacenamiento; el texto del aviso (`#toast`).
5. Comparar lo capturado entre la raíz de la base y la de la unidad.

Esperado: en la unidad 1, 5 pares de JSON, de almacenamientos y de avisos iguales y 0 escrituras en el arranque. En la unidad 3, 4 secuencias de lecturas y escrituras iguales: con la fixture de master, `get taller-laboratorio-v1`, `get taller-learning-v1`, `get taller-campaign-v1` y `get taller-systems-v1`, y nada más.

## 4. Las pruebas de que las pruebas detectan algo

Cada una se hace en una copia de trabajo y se deshace con `git checkout -- <archivo>`; ninguna se commitea.

| Tarea | Rotura | Falla |
| --- | --- | --- |
| T002 | `buildProgram` que agrega un espacio al final del programa de Rust | `build-program.spec.ts` |
| T006 | quitar el `throw` de `mergeModelGroups` | «un nombre repetido lanza» |
| T008 | agregar `zustand` sin `--save-exact` (`^5.0.15` en `package.json`) | el diff de la compuerta: la versión no es exacta |
| T009 | quitar la fusión en `route-store.ts` (dejar la escritura sin `merge`) | la spec de fusión y, por el estado compartido, ninguna de las otras |
| T010 | quitar `requireStore()` de `list` en `create-systems-engine.ts` | `engine-init-order.spec.ts` |
| T011 | que `absorbStored` devuelva un estado nuevo en lugar de mutar `local` | la spec de identidad del laboratorio |
| T009 a T011 | avisar antes de escribir (mover `notify` antes de `write`), o avisar dos veces en `applyImport` | «el oyente ya ve lo escrito» y «la revisión sube en uno por operación» de la spec de cada pieza |
| T014 | abrir una clave en un archivo de `pages/`; importar una fábrica; importar `routeStore` desde `campaign.js`; importar el JSON desde `entities/` | R1 y R2; R3; R4; R5 |
| T017 | invertir el orden de `TallerLab.init` y `routeStore.open`; sacar la guarda; quitar `startApp();` de `main.tsx` | «startApp initializes in order»; «a second startApp call fails»; `load-order-check` y `boot-check` |

## 5. La entrega a A2 (T019)

Con las cuatro unidades en `master`, para cada fila de F2-I1 a F2-I6 del plan:

- **F2-I1:** `grep -n "export function startApp" frontend/app.js` y `node qa/boot-check.ts` (los cuatro escenarios del arranque en verde).
- **F2-I2 y F2-I6:** `node qa/seams-guard-check.ts` (R5 en verde) y `grep -n "curriculum.json\|window\." frontend/src/entities/exercise/model/exercise-catalog.ts` sin resultados.
- **F2-I3:** `npx vitest run --config frontend/vitest.config.ts frontend/src/app/singletons-import.spec.ts`.
- **F2-I4:** `git diff --stat <base> -- frontend/src/app/legacy` lista sólo los dos `register-*-engine.ts`.
- **F2-I5:** los cinco hashes de §2 contra los de T001, acumulados.
- **FR-010, la única dependencia nueva:** `git diff <base> -- package.json package-lock.json frontend/THIRD-PARTY-NOTICES.txt` muestra `zustand` 5.0.15 exacta en `dependencies`, un solo paquete nuevo en el lockfile y un aviso de licencia; `grep -rn "from 'zustand" frontend/src` sólo da `zustand/vanilla`.
