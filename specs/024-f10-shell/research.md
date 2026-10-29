# Research: F10a · El spike del router y la red de E2E

**Spec:** [spec.md](./spec.md) (FR-001 a FR-011, FR-056, FR-057 y FR-059; SC-001, SC-002, SC-006, SC-007, SC-008, SC-010 y SC-012). **Plan:** [plan.md](./plan.md). **Validación:** [quickstart.md](./quickstart.md). **Tabla de correspondencia:** [contracts/f10a-check-correspondence.md](./contracts/f10a-check-correspondence.md).

Este documento junta las decisiones técnicas de F10a, sus alternativas y las mediciones de sólo lectura que se hicieron al planificar (2026-10-28). F10b tiene su propia investigación en [research-f10b.md](./research-f10b.md).

## Cómo se planificó

- **El código leído:**
  - `master` en `431c9d90` (F2a, F2b, A2, el stack de componentes #67, el tope de #76 y F4 en React #77);
  - los worktrees de implementación, sólo para leer: `impl-f5` (`efaf39b2`), `impl-f6` (`b20028be`), `impl-f7a` (`fc88d450`) e `impl-f11a` (`a7b3c71d`).
- **Los planes:** F3 (`specs/012-f3-biblioteca/plan.md`), F6 (`019`), F7a y F7b (`021`), F8 (`022`), F9 (`014`), F11a (`015`) y F12a (`023`).
- **Lo que no corrió:** `npm`, un build, Docker ni un navegador. Las únicas consultas al registro fueron con `npm view`, que no descarga nada.
- **La base real de F10a no existe todavía.** F10a empieza cuando F3 a F9, F11a y F12a están en `master` (spec, «La partición»). Por eso cada número de la base sale de la línea base de T001 y nunca de este documento (TR-15 de los hallazgos).

## R1 · El spike corre en una copia descartable, con un seam de una línea

**Decisión.** El spike copia la base de F10a con `git archive` a un directorio de la scratchpad del implementador, fuera del repositorio. Instala con `npm ci --offline` y, para cada librería con permiso, `npm install --no-save <paquete>@<versión>`. En la copia, `frontend/app.js` cambia dos líneas: los dos `window.addEventListener` de `hashchange` y `popstate` pasan a `startSpikeRouter(navigateFromLocation)`. Cada candidato implementa esa función en `frontend/src/app/spike-router.tsx` de la copia (quickstart.md, §2.2).

- **Por qué así.** Lo que el contrato pregunta (C1 a C8) es qué hace la historia de cada librería con la URL: si reescribe `#vista` a `#/vista`, si lee la query de adentro del hash, si suma o pisa entradas y si reacciona a los `replaceState` de las páginas y de nuqs. Para eso alcanza con que la librería escuche y avise, mientras `app.js` sigue dibujando. El peso, en cambio, sí depende de cómo se use: cada variante monta el proveedor del router con las nueve rutas, como lo haría F10b (`createHashRouter` con `RouterProvider`, o `createRouter` con `RouterProvider`).
- **La variante del router propio** es la de hoy: los dos oyentes y `navigateFromLocation` con su `lastNavigation`. Es la referencia del peso. El aumento de una librería se mide contra ella (FR-009), así que el código del shell no se carga a ninguna.
- **Alternativas descartadas:**
  - **Portar el shell entero en la copia para cada candidato:** mide lo mismo y cuesta un F10b por candidato.
  - **Un proyecto mínimo aparte:** no ejercita la red de F1 ni las páginas reales, que es justo lo que piden C3, C5 y C8.

## R2 · La regla de decisión, con el tope vigente

**Decisión.** La regla de FR-010, con el tope de `qa/build-check.ts` que T001 lee de la base (`BOOT_SIZE_LIMIT`, 1 500 000 desde #76):

```text
margen     = BOOT_SIZE_LIMIT − chars(dist/index.html de la base, T001)
aumento(L) = chars(dist con L) − chars(dist con el router propio), las dos sobre la misma copia
entra L    ⇔ L pasa C1 a C8  ∧  L resuelve algo nombrado que F10 necesita y el propio no  ∧  aumento(L) ≤ margen / 4
```

- Si ninguna librería cumple las tres condiciones, entra el router propio. Si dos las cumplen, entra la de menor aumento, y el informe lo dice.
- **La cifra de la spec queda vieja.** El ejemplo de Q1 (margen 108 663 y cuarto 27 165) se hizo con el tope de 1 250 000. Con 1 500 000 y la medida de F2b (1 141 337), el margen es 358 663 y el cuarto, 89 665. Ver la enmienda en `spec.md`, «Clarifications».
- **Lo que ya consumieron los ítems previos:**

  | Ítem | Aumento medido | Fuente |
  | --- | --- | --- |
  | F4 | +2 881 (1 144 218) | `.coordinador/pr-impl-f4.md:58` |
  | F5 | +25 648, sobre su base | `ledger impl-f5:75` |
  | F11a hasta T012 | +12 508 | `ledger impl-f11a:55` |

  Con eso, el margen al empezar F10a rondará los 310 000, y el cuarto, los 77 000. Es sólo una orientación: el número que decide es el de T001.
- **«Resuelve algo nombrado que F10 necesita».** La spec ya lista lo que F10 no necesita: loaders, actions, rutas anidadas o con parámetros, carga por ruta, partir el código y prefetch (spec, «YAGNI»). Lo que F10 necesita es leer la vista del hash, reaccionar a `hashchange` y `popstate` sin duplicar y no interceptar los enlaces con query. El router propio ya hace eso. El informe del spike tiene que nombrar, para cada librería, una necesidad de la spec que el propio no cubra, o escribir «nada».
- **Alternativa descartada:** medir con bundlephobia. Da el paquete entero, no lo que queda después del tree shaking, y la spec pide medir el `dist` (FR-009).

## R3 · Las descargas del spike piden permiso antes de medir

**Hallazgo (hueco de la spec).** «Acciones del usuario» de la spec pide permiso sólo para instalar la librería que *gane*. Pero medir el `dist` con React Router o con TanStack Router exige instalarlos en la copia, y eso ya es una descarga. Este plan lo resuelve con una tarea propia (T002), antes de medir, que pide el permiso con los datos de cada paquete.

**Lo que se pide** (`npm view` del 2026-10-28; T002 los vuelve a leer el día del spike y pide con los de ese día):

| Paquete | Versión | Licencia | Desempaquetado (bytes) | Lo trae |
| --- | --- | --- | --- | --- |
| `react-router` | 8.5.1 | MIT | 3 010 360 | candidato |
| `cookie-es` | 3.1.1 | MIT | 28 783 | `react-router` |
| `@remix-run/route-pattern` | 0.22.1 | MIT | 217 061 | `react-router` |
| `@tanstack/react-router` | 1.170.46 | MIT | 1 073 323 | candidato |
| `@tanstack/history` | 1.162.5 | MIT | 128 058 | `@tanstack/react-router` y `router-core` |
| `@tanstack/react-store` | 0.11.2 | MIT | 63 848 | `@tanstack/react-router` |
| `@tanstack/store` | 0.11.2 | MIT | 123 762 | `@tanstack/react-store` |
| `use-sync-external-store` | 1.7.0 | MIT | 28 183 | `@tanstack/react-store` |
| `@tanstack/router-core` | 1.171.39 | MIT | 3 076 623 | `@tanstack/react-router` |
| `seroval` | 1.7.3 | MIT | 605 096 | `router-core` |
| `seroval-plugins` | 1.7.3 | MIT | 100 441 | `router-core` |
| `isbot` | 5.2.2 | **Unlicense** | 48 820 | `@tanstack/react-router` |

- **El origen** es el registro de npm (`https://registry.npmjs.org`). Las versiones con `^` se resolvieron a la última del rango.
- **Las dependencias de pares** se cumplen con lo instalado: `react-router` pide `react` y `react-dom` 19.2.7 o más, y el lockfile tiene 19.2.8. `@tanstack/react-router` pide 18 o 19.
- **`isbot` no es MIT.** Si TanStack Router ganara, su aviso de licencia (Unlicense) entra en `frontend/THIRD-PARTY-NOTICES.txt` junto con los MIT (FR-011).
- **Si el usuario no da el permiso,** o lo da para una sola librería, el spike mide lo que pueda. Cada librería sin medir queda en el informe como «no medida: sin permiso de descarga», y la regla elige el router propio, que es la opción por omisión de FR-010. SC-002 se cumple con el motivo escrito en lugar de las medidas.
- **Nada de esto toca `package.json` ni el lockfile del repositorio:** la copia se borra al terminar.

## R4 · Los montajes se cuentan por tandas del observador sobre `#main`

**Decisión.** `qa/e2e/lib/main-mounts.ts` inyecta con `addInitScript` un `MutationObserver` sobre `document`, con `childList` y `subtree`. Una tanda del observador cuenta como **un montaje** si alguno de sus registros agrega un elemento como hijo de `#main`, o agrega un `#main` que ya trae un primer hijo. El conteo empieza cuando la prueba llama a `startCountingMounts`, con la vista ya dibujada, y se lee después de dos cuadros y una tarea (`mountsSinceStart`).

- **Por qué por tandas y no por registros:** React agrega cada nodo de primer nivel de una página por separado, así que una página con dos nodos daría 2 por registro. El observador entrega una tanda por punto de control de microtareas, y un montaje de React o un `innerHTML` caen en una sola tanda.
- **Por qué detecta el montaje doble que importa:** en Chromium, un enlace de hash dispara `popstate` en el acto y `hashchange` en una tarea aparte. Sin `lastNavigation`, `render()` corre dos veces en tareas distintas, y el conteo da 2. La mutación de T009 lo prueba.
- **Lo que no detecta, a propósito:** dos `render()` en la misma tarea. El alumno ve un solo dibujo, así que no cambia el comportamiento.
- **Por qué pasa sin editarse en F10b** (FR-001), aunque en F10b `#main` lo dibuje React y no exista cuando corre el script:
  - el observador mira `document` desde el principio, sin buscar `#main`;
  - busca `#main` de nuevo en cada tanda, así que no le importa si se reemplaza;
  - el conteo arranca recién con la página dibujada, después de la compuerta y su marcado de carga.
- **La regla para C5 contra la base.** Un cambio de estado que reescribe el `<div>` de primer nivel de una página sin remontarla contaría como montaje. T009 elige transiciones que, en la base, dan 0: el ejercicio siguiente dentro del modo ejercicio, la parte de un taller y un filtro de la Biblioteca. Si una da distinto de 0 en la base, se reemplaza por otra transición de la misma página, y el informe lo anota.
- **Alternativas descartadas:**
  - **Contar `createRoot`:** exige un gancho en producción, y FR-056 lo prohíbe.
  - **Comparar la identidad de `firstElementChild`:** dos dibujos en tareas distintas pueden dejar el mismo primer elemento si la página lo reusa, y el conteo se perdería.

## R5 · nuqs escribe tarde: las pruebas esperan la URL

**Hecho.** nuqs escribe la URL con un throttle de 50 ms o más, que no baja de 50 (Context7, `/llmstxt/nuqs_dev_llms-full_txt`: «values lower than 50ms will be ignored»). El usuario aceptó la diferencia (`clarify-decisiones.md`, «Decisiones del 2026-10-28 (noche)»).

**Decisión, en C3, en C5 y en toda E2E de F10a:**
- después de un cambio con nuqs (la parte o el taller de Sistemas, un filtro de la Biblioteca), la prueba llama a `page.waitForURL(<expresión>)` antes de contar montajes o de recargar;
- las medidas de C3 y C5 del spike corren con `--repeat-each=5`, para que un candidato no se descarte ni se apruebe por una corrida inestable. TR-1 midió 16 fallas de 20 sin esperar la URL.

**Lo que hace F10a con F10-3:** describe y mide. La decisión del arreglo, si hiciera falta, es del coordinador.

## R6 · La red del arranque se observa por sus efectos

`boot-check` prueba el arranque en un DOM falso. FR-057 pide reemplazar en un navegador lo que eso cubría, sin ganchos en producción. Cada efecto tiene un observador:

| Lo que fija | Cómo lo observa la E2E | Archivo |
| --- | --- | --- |
| El orden de apertura (el laboratorio, el recorrido, la campaña y Sistemas) | La primera lectura de cada una de las cuatro claves, con un `getItem` envuelto por `addInitScript` (`qa/e2e/lib/store-openings.ts`) | `boot-order.spec.ts` |
| Los avisos juntos, en orden | Las cuatro claves ilegibles: un solo toast con los cuatro textos de `describeLoadResult`, unidos por « · » | `boot-order.spec.ts` |
| La copia de campaña ilegible sobrevive | La copia `version: 2` de `boot-check`, la misma clave antes y después de navegar, y su ranura `:respaldo` | `boot-order.spec.ts` |
| La clave ausente no se crea | Arrancar y navegar sin la clave de campaña ni la de Sistemas | `boot-order.spec.ts` |
| El shell está antes de la compuerta | Con el pedido del contenido retenido, el menú y el selector de lenguaje están visibles | `boot-order.spec.ts` |
| Nada del taller se dibuja antes del ingreso | Con la sesión vencida del doble de la API: ningún encabezado de página y `#main` sin páginas | `boot-order.spec.ts` |
| Las fixtures congeladas y el almacenamiento bloqueado | Ya lo fija `startup-storage.spec.ts` de F1, sin editar | — |

- **Lo que un navegador no puede provocar** queda en Vitest: el motor de campaña que lanza si se usa antes de `init` (`frontend/src/app/engine-init-order.spec.ts`, ya en `master`).
- **El orden de las etapas** sigue en `load-order-check` hasta F10b, que lo pasa a una spec (FR-052).
- **El último renglón reemplaza una sonda que F10b deja vacía (hallazgo).** `session-stage.spec.ts` de F11a pregunta `'TallerLab' in window` para saber si se evaluó una fuente legacy (`impl-f11a/qa/e2e/specs/session-stage.spec.ts:17-18`). Sin `window.TallerLab`, esa aserción pasa siempre. FR-002 prohíbe editarla, así que F10a suma la prueba del comportamiento real: detrás del acceso no hay ninguna página dibujada.

## R7 · La tabla de correspondencia sale de la base, no de este plan

**Decisión.** T013 lista los escenarios de `boot-check`, `app-shell-check` y `load-order-check` en la base de F10a, con un `grep` de sus nombres. Cada uno queda en [contracts/f10a-check-correspondence.md](./contracts/f10a-check-correspondence.md) con una de tres salidas:

- **cubierto por una E2E**, con su archivo y su nombre exacto;
- **cubierto por una spec de Vitest**, con su archivo y su nombre exacto;
- **descartado**, con su motivo; por ejemplo, «each legacy source evaluated alone», porque F10b no deja fuentes legacy.

**Las listas cambian con cada port.** F8 retira 38 escenarios de `app-shell-check` (plan de F8, §3.9); F4 lo llevó de 58 a 56 (TR-15); y F3, F5, F6, F7b, F8 y F9 cambian `boot-check`. La tabla del contrato trae los escenarios de `master` (`431c9d90`) con su cobertura prevista, más los que suman los planes. T013 la reconcilia con la base: agrega lo que falte, marca lo que ya no exista y verifica que cada prueba citada exista con ese nombre.

**F10a no retira nada:** lo hace F10b con esta tabla (FR-052; SC-007).

## R8 · Lo que F10a no escribe

- **Las E2E de «Lo que cambia a propósito»** (el `aria-pressed` de `<body>`, los conteos que aparecen con el contenido, `#quiz-feedback` montada y la administración como ruta) fallan contra la base por la razón esperada. Por eso van en F10b, cada una en su commit rojo (FR-001).
- **Código de producción:** ninguno. F10a cambia sólo `qa/e2e/` y esta carpeta. El `dist` no cambia: `chars`, `script`, `style` y `markup` son los de T001, y `dynamicImports` e `importMeta` también.

## Context7 y otras consultas (2026-10-28)

El servidor `mcp__context7__*` agotó su cuota mensual. Las consultas se hicieron con la segunda instancia, como indica `.coordinador/planes-comun.md`.

| Librería | Versión (lockfile o referencia) | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| nuqs (`/llmstxt/nuqs_dev_llms-full_txt`) | 2.10.2 (F5) | `limitUrlUpdates`, `throttle` y `defaultOptions` de `NuqsAdapter` | El throttle es de 50 ms por omisión (120 en Safari) y los valores menores a 50 se ignoran. No hay escritura síncrona | Sí: R5, `waitForURL` en C3 y C5 y `--repeat-each` en el spike |
| React Router (`/remix-run/react-router`) | 8.5.1 (registro); docs 7.x | `createHashRouter`, `HashRouter`, `parsePath` y `createPath` | `createHashRouter(routes, opts)` va fuera del árbol, con `RouterProvider`. `HashRouter` guarda la ubicación en el hash. No devolvió el código de la historia por hash | No: si escribe `#/vista` lo decide el spike (C1 y C2) |
| TanStack Router (`/tanstack/router`) | 1.170.46 (registro) | `createHashHistory`, `RouterHistory` y `createHistory` | `createHistory({ getLocation, getLength, pushState, replaceState, go, back, forward, createHref, notifyOnIndexChange })` arma una historia propia, y `createRouter({ history })` la usa | Sí: la variante de historia propia del spike (quickstart.md, §2.2) usa `createHistory` |
| Playwright (`/microsoft/playwright`) | 1.63.0 | `addInitScript` (corre antes de los scripts del documento; el orden entre varios no está definido); `clock.install`, `pauseAt` y `runFor` | Las sondas de R4 y R6 pueden instalarse antes del arranque. Con el reloj instalado antes de navegar, `pauseAt` y `runFor` controlan los 4,5 s del toast | Sí: el observador mira `document` y no depende del orden de otros scripts; el toast se prueba con `page.clock` |
| React (`/websites/react_dev_reference`) | 19.2.8 | `flushSync` | Fuerza el dibujo sincrónico; no corre dentro de un efecto. Lo usa F10b, no F10a | No en F10a (ver research-f10b.md) |
| El registro de npm (`npm view`) | — | Versión, licencia, tamaño y dependencias de los candidatos | La tabla de R3; `isbot` es Unlicense | Sí: T002 y el aviso de licencias si gana TanStack |

Testing Library, Vitest, Zustand y jsdom no entran en F10a: F10a no suma specs de Vitest. Sus consultas están en `research-f10b.md`.

## Mediciones de sólo lectura (2026-10-28)

- **`LEGACY_MODULES` en `master`:** 19 entradas, una de ellas `app.js`.
- **`load-order-check` en `master`:** 26 imports (7 hojas más 19 de la cadena), las restricciones de la tabla y 1 de etapas. En impl-f11a la de etapas pasa a 3 (`tokenStage → sessionStage → contentGate`).
- **Los escenarios en `master`:** `boot-check` tiene 18 llamadas a `test`, dos de ellas en bucles (las dos importaciones y los tres modos de falla). `app-shell-check` tiene 56. La lista completa está en el contrato.
- **`import.meta` en el `dist`:** 22 antes de F4 y 23 con F4, con 0 `import(` reales (`.coordinador/pr-impl-f4.md:33`). Vite envuelve cada `import()` de `legacy-views.ts` con `import.meta.url`. En F10a no cambia.
- **El tope:** `BOOT_SIZE_LIMIT = 1500000` en `qa/build-check.ts:11` (`4c2bdbdb`, #76).
- **La red de `master`:** 141 E2E (`.coordinador/pr-impl-f4.md:68`). Son los 106 de F1, los 17 de A2 y los 18 de F4. La base de F10a suma los de F3, F5, F6, F7a, F7b, F8, F9, F11a y F12a, y T001 los cuenta.

## Resultado del spike

T006 completa esta sección con las medidas de T003 a T005. Las columnas son fijas:

| Candidato | Versión | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | `chars` del dist | Aumento sobre el propio | Licencia, dependencias y desempaquetado | Qué resuelve que el propio no |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Debajo de la tabla van:
- la línea base: el tope, `chars` de la base, el margen y el cuarto;
- la regla aplicada paso a paso, con el resultado;
- las corridas fallidas con su primer error;
- la fecha y las versiones del registro de ese día.
