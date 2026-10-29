# Quickstart: F14a · Validación

Cómo se comprueba que F14a entrega «Uso del taller» sin tocar la red vigente, con uPlot detrás de un módulo y dentro del peso. Los valores de la base los toma T001 y quedan en «Línea base de la implementación» de [research.md](./research.md). Las tareas están en [plan.md](./plan.md). Todo corre desde la raíz del worktree de `f14a/base`, con Node 24 y sin descargar nada, salvo T002 con permiso.

## 1. La línea base (T001)

```sh
npm ci --offline
npm run build
node -e 'console.log(require("node:fs").readFileSync("dist/index.html","utf8").length)'   # la base de FR-057
npm test
npm run lint 2>&1 | grep -c complexity
E2E_PORT=4173 npm run test:e2e
```

Las ramas B1 a B8 del plan, con sus comandos, van a research.md. F14a no empieza si falta F12a (B1), si F11a está incompleta (B6) o si el doble de la API no guarda `search` (B7).

## 2. uPlot (T002)

Con el permiso del usuario:

```sh
npm install --save-exact uplot@1.6.32
npm ls uplot                                                     # uplot@1.6.32
npx esbuild node_modules/uplot/dist/uPlot.esm.js --bundle --minify --format=esm --log-level=error | wc -c
wc -c < node_modules/uplot/dist/uPlot.min.css                    # la suma no pasa de 60 000
tail -n 25 frontend/THIRD-PARTY-NOTICES.txt                      # el bloque «uPlot — https://github.com/leeoniya/uPlot»
```

## 3. Las pruebas de cada unidad

| Unidad | Comando | Esperado |
| --- | --- | --- |
| U1 | `npm run test:unit -- frontend/src/pages/admin/model frontend/src/pages/admin/lib frontend/src/pages/admin/api` | En verde: la lectura de C5, las reglas, el gráfico como datos, las opciones de uPlot y los pedidos |
| U1 | `node qa/boot-check.ts && node qa/dist-content-check.ts` | En verde, con la cuenta de T001 |
| U2 | `npm run test:unit -- frontend/src/pages/admin/ui/usage-hooks.spec.tsx frontend/src/pages/admin/ui/usage-pieces.spec.tsx` | En verde |
| U3 | `npm run test:unit -- frontend/src/pages/admin` | En verde, también **todas las specs de F12a sin editar** |
| U3 | `npm run build && npm test` | En verde, con uPlot en el bundle y su licencia en el HTML (`build-check`) |
| U4 | `npm run build && E2E_PORT=4195 npm run test:e2e -- specs/admin-usage-overview.spec.ts specs/admin-usage-exercises.spec.ts specs/admin-usage-runs.spec.ts specs/admin-usage-layout.spec.ts` | En verde después de T024 |
| Todas | `npm run lint && npm run format:check && git diff --check` | En verde, con los avisos de complejidad de T001 |

## 4. Las comprobaciones de la Review Focus

```sh
git grep -n "from 'uplot'" -- frontend/src
# lib/plot.ts, y como import type, lib/bar-plot-options.ts y su spec

git grep -n "style=\|\.cssText\|setAttribute('style'" -- frontend/src/pages/admin
# nada nuevo

git diff master --stat -- qa/e2e/specs
# sólo los cuatro admin-usage-*.spec.ts nuevos

git diff master -- qa/boot-check.ts qa/dist-content-check.ts qa/load-order-check.ts
# vacío: sólo cambian qa/lib/boot-harness.ts (dos globals) y qa/build-check.ts (una aserción)
```

**Review Focus 1, el arnés:** con uPlot en el bundle (después de T023),

```sh
git stash push qa/lib/boot-harness.ts
node qa/boot-check.ts        # falla: devicePixelRatio o matchMedia no existen
git stash pop
node qa/boot-check.ts        # en verde
```

**Review Focus 2, jsdom:** `npm run test:unit -- frontend/src/pages/admin/ui/admin-page.spec.tsx` (de F12a, sin editar) en verde, y en rojo sin el `matchMedia` de `frontend/src/vitest.setup.ts`.

## 5. El peso (T023 y T028)

```sh
npm run build
node -e 'console.log(require("node:fs").readFileSync("dist/index.html","utf8").length)'
```

La resta contra T001 no pasa de **80 000** (FR-057), y el total queda bajo **1 500 000** (`BOOT_SIZE_LIMIT`). Si se pasa, la tarea se detiene y decide el usuario. F14b mide contra la misma línea base de T001: F14 entera no pasa de **95 000**.

## 6. La red, antes de cada PR

```sh
E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0    # T024
E2E_PORT=4173 npm run test:e2e -- --repeat-each=5 --retries=0    # T028
```

Las anotaciones `SC-008` de `admin-usage-layout.spec.ts` (366 días por día y la respuesta con todos los ejercicios) van al PR.

## 7. La revisión manual (acción del usuario, Q4-A)

Con el stack local y datos armados (los comandos de medición de C5 siembran cuentas e intentos):

```sh
docker compose up --build -d --wait
```

En `http://localhost:8080`, con una cuenta de admin, se recorre «Uso del taller»:

- «Resumen» con un período de una semana, por día, y de un mes, por semana;
- «Ejercicios» con un catálogo, un lenguaje y el detalle de un ejercicio;
- «Ejecuciones» con «Actualizar», un filtro y «Más viejas».

Cada vista se recorre sólo con el teclado, a 320 px y con movimiento reducido. Al terminar, `docker compose down`.
