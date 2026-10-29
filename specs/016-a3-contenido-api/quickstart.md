# Quickstart: cómo se verifica A3

**Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Contrato**: [contracts/front-interfaces.md](./contracts/front-interfaces.md)

Todos los comandos corren desde la raíz del worktree. Los que usan Docker piden permiso antes.

## 1. La línea base (T001)

Sobre `a3/base` recién creada (de `f11a/base` con F11a completa, o de `master` si F11a ya llegó), antes de cualquier cambio:

```sh
npm ci --offline --no-audit --no-fund
npm run build
npm test
npm run lint
npm run format:check
E2E_PORT=4173 npm run test:e2e
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
npm run lint 2>&1 | grep -c warning
node tools/content/dump-globals.ts . | sha256sum
git grep -n "const BOOT_SIZE_LIMIT" -- qa/build-check.ts
git grep -n "PROGRESS_API" -- qa/lib/content-server.ts
git grep -n "cookie: ''" -- qa/lib/boot-harness.ts
git grep -n "__CONTENT_VERSION__" -- qa/lib/sources.ts
git grep -n "'GET /api/progress'" -- qa/e2e/fixtures/api-double.ts
```

Se anotan en research.md, «Línea base de la implementación»:

- el hash de la base;
- `html.length`;
- los checks y las pruebas de Vitest;
- los avisos de lint;
- los E2E (la cuenta esperada desde acá: ningún número escrito en el plan la reemplaza);
- el sha256 de `dump-globals`;
- `BOOT_SIZE_LIMIT` (1 500 000 desde #76);
- las cuatro filas de F8 («está» o «falta»), según las cuatro últimas búsquedas.

El contraste del contrato y del código de F11a está en el plan (T001, pasos 3 y 4), y las ramas de F8, en el paso 5.

## 2. La compuerta de una unidad (plan, 0.2)

```sh
npm run build
npm test
npm run lint
npm run format:check
git diff --check
git diff a3/base -- package.json package-lock.json
git diff a3/base -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'
git diff a3/base -- qa/e2e | grep -E '^\+.*(Failed to load resource|query: url\.search|call\.query)'
E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
```

**Lo que se espera:**

- **todo en verde;**
- **los dos `git diff` y los dos `grep`** no imprimen nada;
- **el tamaño:** en U1 es igual al de T001; en U2, unos +6 700 caracteres.

**En U2, además:**

```sh
git diff --name-only a3/base -- qa/e2e/specs
node tools/content/dump-globals.ts . | sha256sum
ls dist/content
git grep -n -e static-content-source -e __CONTENT_VERSION__ -e readBuiltContent -- . ':!specs' ':!docs/plans'
E2E_PORT=4173 npm run test:e2e -- specs/content-gate.spec.ts -g "20 s cap" --repeat-each=30 --retries=0
```

**Lo que se espera:**

- la lista de E2E trae sólo `content-api.spec.ts`, `content-gate.spec.ts`, `session-stage.spec.ts` y `sign-in.spec.ts`;
- el sha256 es el de T001;
- `ls` falla;
- `git grep` no imprime nada;
- el tope de 20 s pasa las 30 veces.

**Una spec o un check sueltos:**

```sh
npm run test:unit -- frontend/src/shared/api/content
npm run test:unit -- frontend/src/app/boot
npm run curriculum && node qa/boot-check.ts
npm run build && node qa/dist-content-check.ts && node qa/build-check.ts
E2E_PORT=4194 npm run test:e2e -- specs/content-api.spec.ts
```

## 3. Contra el stack (T015 y T016)

Con permiso para Docker. El orden:

1. **Levantar el stack con la imagen web de A3:**

   ```sh
   sh backend/api/scripts/init-env.sh
   npm run build
   docker compose --profile sandbox-images build
   docker compose up --build -d --wait
   ```

   El tercer comando hace falta la primera vez, y una vez por semana (ADR 0005).
2. **El aula (SC-007 y SC-010):**

   ```sh
   node qa/classroom-boot-check.ts
   ```

   Imprime dos líneas, «Sin copia: …» y «Con copia: …», con 0 errores, la primera vista más rápida, la mediana y la última. Se anotan en research.md, contra los 151 ms de A2.
3. **La imagen web sin el archivo (SC-009):**

   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/content/
   curl -s -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:8080/content/curriculum.$(node -e "console.log(JSON.parse(require('fs').readFileSync('build/curriculum.meta.json','utf8')).documentHash.slice(0,32))").json"
   docker compose exec taller ls /usr/share/nginx/html
   ```

   Los dos `curl` dan `404`, y la lista no tiene `content`.
4. **A mano, en el navegador:**
   - **Con conexión:** con una cuenta (`docker compose exec php php artisan taller:invite ana@example.com` y el enlace), el taller arranca. Las herramientas del navegador muestran la sesión y los 17 pedidos a `/api/`, sin `X-XSRF-TOKEN`.
   - **La recarga:** hace sólo la sesión.
   - **La copia:** en «Application» → «IndexedDB» está `taller-contenido` → `copia` → `ultima`.
   - **Sin servidor:** `docker compose stop php` y recargar. Se ve el aviso con la fecha, fuera de `#main`, y el lector de pantalla lo anuncia una vez.
   - **«Salir»:** con `php` arrancado (`docker compose start php`), «Salir» desde «Tu cuenta». Después, con `php` detenido, se ve la vista de error, porque la copia se borró.
5. **La vista previa y `npm run dev`** (de F11a):

   ```sh
   docker compose -f docker/compose.preview.yaml up --build -d --wait
   ```

   `http://localhost:8765/` arranca con el contenido de la API del stack. Con `npm run dev`, `http://localhost:5173/` también, y `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5173/content/` no da 200.
6. **Detener:**

   ```sh
   docker compose -f docker/compose.preview.yaml down
   docker compose down
   ```

## 4. El peso, separado (T014, si hace falta)

`html.length` da el total. Si A3 pasa de la condición de corte, se separa cuánto pone cada archivo. Se empaqueta `main.tsx` con esbuild, que ya está instalado, y se lee su `metafile`. Es una medida de esbuild y no del bundle de Vite: sirve para la proporción.

El script es descartable y vive fuera del repositorio, en un archivo `measure-a3.mjs`:

```js
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.argv[2];
const { build } = createRequire(join(root, 'package.json'))('esbuild');

const OWN = [
  'frontend/src/shared/api/content/api-content-source.ts',
  'frontend/src/shared/api/content/content-copy.ts',
  'frontend/src/shared/api/content/content-copies.ts',
  'frontend/src/shared/api/content/indexeddb-copy-store.ts',
  'frontend/src/shared/api/content/portion-resources.ts',
  'frontend/src/shared/lib/wait.ts',
  'frontend/src/shared/lib/format-long-date.ts',
  'frontend/src/app/boot/attempt-budget.ts',
  'frontend/src/app/boot/session-reader.ts',
  'frontend/src/app/boot/copy-notice.ts',
];

const result = await build({
  absWorkingDir: root,
  entryPoints: ['frontend/src/app/main.tsx'],
  bundle: true,
  minify: true,
  write: false,
  metafile: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"production"' },
  outdir: 'out',
});

const totals = { 'A3 (módulos nuevos)': 0, resto: 0 };
for (const output of Object.values(result.metafile.outputs)) {
  for (const [path, { bytesInOutput }] of Object.entries(output.inputs)) {
    if (OWN.includes(path)) totals['A3 (módulos nuevos)'] += bytesInOutput;
    else totals.resto += bytesInOutput;
  }
}
console.table(totals);
```

Se corre con `node <ruta>/measure-a3.mjs "$PWD"`. Al planificar, los módulos nuevos midieron unos 6 600 caracteres, y los cambios en los archivos existentes se compensan con lo que se retira (research.md, R15).

## 5. Lo que cada unidad deja visible

| Unidad | En el navegador |
| --- | --- |
| U1 | Nada: los módulos no están cableados, y el arranque sigue con el archivo estático |
| U2 | Con `npm run build && npm run preview` no hay API: el arranque muestra la vista de error de A2 con `network`, que es lo esperado porque `vite preview` no pasa `/api/` (F11a). Con el stack, por la vista previa de Docker, todo lo de §3.4 |
| U3 | Lo mismo, contra el stack, y las mediciones |
