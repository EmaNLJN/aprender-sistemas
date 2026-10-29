# Implementation Plan: F10a · El spike del router y la red de E2E

**Branch**: `024-f10-shell` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F10, en su parte a: FR-007 a FR-011, FR-056 y FR-057, y los compartidos FR-001 a FR-006 y FR-059.
- Decisiones y mediciones: [research.md](./research.md).
- Validación: [quickstart.md](./quickstart.md).
- Tareas: [tasks.md](./tasks.md).
- Correspondencia de los checks: [contracts/f10a-check-correspondence.md](./contracts/f10a-check-correspondence.md).
- F10b tiene su plan en `plan-f10b.md`, y F10c tiene el suyo.

**Objetivo:** decidir con datos qué router usa F10b y dejar en verde, contra la base sin tocar, la red de E2E del shell y del arranque que F10b no puede romper.

**Arquitectura:**
- El spike mide en una copia descartable de la base tres candidatos contra el contrato de URL (C1 a C8) y contra el peso del `dist`, y aplica la regla de FR-010.
- Las E2E nuevas observan el shell y el arranque sólo desde afuera, con roles, sondas inyectadas con `addInitScript` y el almacenamiento, sin ganchos en producción. Así pasan igual contra `app.js` y contra la raíz única de F10b.
- La tabla de correspondencia deja escrito dónde queda cubierto cada escenario de los tres checks que F10b retira.

**Stack:** Playwright 1.63.0 con los fixtures de `qa/e2e/fixtures/` y el doble de la API de F11a; Node 24.21.0; nuqs 2.10.2 (lo trae F3 o F5); `npm view` para el registro. Ninguna dependencia nueva en el repositorio.

> **Para quien lo implementa.**
>
> - **Qué leer:** las «Restricciones globales», la sección 0 y la sección de tu tarea. `tasks.md` tiene una línea por tarea (T001 a T014) y remite acá.
> - **Cuándo empieza:** F10a espera a que F3, F4, F5, F6, F7a, F7b, F8, F9, F11a y F12a estén en `master` (spec, «La partición»). Su base es ese `master`. Si alguno no entró, F10a no empieza.
> - **Código verificado:** nada corrió al planificar. El código de este plan sale de leer `master` (`431c9d90`), los worktrees de implementación y los planes de F3 a F12a (research.md, «Cómo se planificó»). Cada número de la base sale de T001.

## Summary

F10a no cambia código de producción. Hace tres cosas, en este orden:

1. **El spike** (FR-007 a FR-011). Mide el router propio, React Router y TanStack Router en una copia descartable de la base, con un seam de una línea en `app.js` (research.md, R1). La regla de FR-010 decide con el margen que T001 calcula sobre el tope de 1 500 000. Las descargas de los candidatos piden permiso antes (R3).
2. **La red del shell y del arranque** (FR-056 y FR-057). Cinco archivos de E2E nuevos, escritos con el Page Object del shell ampliado:
   - `shell-navigation`, `shell-mounts`, `shell-language`, `shell-sidebar` y `boot-order`;
   - dos sondas: `main-mounts`, que cuenta montajes, y `store-openings`, que registra el orden de apertura de los almacenes.

   Todas pasan contra la base. Cada una tiene una mutación que la hace fallar.
3. **La tabla de correspondencia** (FR-052 y SC-007) de `boot-check`, `app-shell-check` y `load-order-check`, reconciliada con la base.

## Technical Context

**Language/Version**: TypeScript como ES modules en `qa/e2e/`. Node 24.21.0, `@playwright/test` 1.63.0, Vite 8.3.2 y React 19.2.8, que no cambian.

**Primary Dependencies**: ninguna nueva en el repositorio. En la copia descartable del spike, sólo con permiso: `react-router` 8.5.1 y `@tanstack/react-router` 1.170.46, con sus dependencias (research.md, R3).

**Storage**: las cuatro claves de `localStorage` y sus ranuras `:respaldo`. Las E2E las siembran, las observan y las comparan; no cambia ningún formato.

**Testing**: Playwright contra el `dist` construido. Los valores esperados salen de la spec (FR-016 a FR-037), de la red de F1, de los textos de `describeLoadResult` y de las fixtures congeladas, nunca de la implementación.

**Target Platform**: Chromium de Playwright; Linux y macOS.

**Project Type**: aplicación web. F10a sólo agrega pruebas y la decisión del router.

**Performance Goals**: ninguno. Se informa el tiempo de `npm run test:e2e` antes y después.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**:
- **Archivos nuevos:** 5 specs de E2E, 2 sondas en `qa/e2e/lib/` y 1 contrato.
- **Archivos que cambian:** `qa/e2e/pages/shell.ts`, `research.md` (el resultado del spike) y el contrato reconciliado.
- **Pruebas nuevas:** unas 40.

## Restricciones globales

Los valores son exactos y valen para toda tarea.

- **El tope del HTML:**
  - `BOOT_SIZE_LIMIT` es 1 500 000 caracteres, en `qa/build-check.ts`, desde #76 (spec, enmienda del 2026-10-28; FR-004 y SC-008);
  - F10a no cambia el `dist`: `chars`, `script`, `style`, `markup`, `dynamicImports` e `importMeta` son los de T001 (quickstart.md, §1).
- **La regla del spike** (FR-010): entra el router propio, salvo que una librería pase C1 a C8, resuelva algo nombrado que F10 necesita y el propio no, y sume sobre la variante del propio como mucho `(BOOT_SIZE_LIMIT − chars de T001) / 4`.
- **La red sin editar** (FR-002):
  - los 106 E2E de F1, los 17 de A2 y los de F3 a F9, F11a y F12a pasan sin editarse;
  - F10a no edita ningún archivo existente de `qa/e2e/specs/`;
  - F10a amplía `qa/e2e/pages/shell.ts` sin cambiar lo que ya expone.
- **Sin código de producción:** `git diff --name-only <base>` no muestra nada fuera de `qa/e2e/` y `specs/024-f10-shell/`.
- **Ningún gancho en producción** (FR-056): las sondas usan `addInitScript`, `page.evaluate`, el almacenamiento y los roles.
- **Localizadores:** por rol y nombre accesible (FR-056). Las excepciones son las que la spec nombra por id: `#main` (FR-016 y FR-019) y `#toast` (ya en `ShellPage`).
- **Las rarezas conservadas** llevan `KNOWN DEFECT` en el nombre del test (FR-056).
- **nuqs escribe con demora** (D1-bis, aceptada): después de un cambio con nuqs, la prueba espera la URL con `page.waitForURL` antes de recargar o de contar montajes (research.md, R5).
- **Los ayudantes de E2E que ya existen se reusan:**
  - `markDocument`, `documentWasReloaded` y `observeReload` de `qa/e2e/lib/document-marker.ts`;
  - `StorageControl.seed`, `block`, `blockWrites` y `watchWrites` (TR-7).

  `blockWrites()` va después de `seed()` y no se combina con `watchWrites()`. Ninguna E2E suma su propia marca en `window` para detectar recargas.
- **El doble de la API** es el de F11a, con la ruta antes del CSRF y `ApiCall.search` (TR-11). Para arrancar sin sesión: `test.use({ sessionAccount: null })`.
- **Las listas blancas de error** usan `/status of NNN/` con el código exacto, nunca `/Failed to load resource/` (TR-11).
- **Las descargas:** ninguna en el repositorio. En la copia del spike, sólo lo que el usuario permita en T002.
- **Estilo:**
  - código y nombres de test en inglés, sin comentarios;
  - los textos que lee el alumno, exactos y en español;
  - `interface` para formas de objetos y exports nombrados.
- **Commits:** en español, con prefijo Angular (`test(e2e): …` y `docs(specs): …`) y el trailer `Co-Authored-By` del modelo, sin `git push`.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md). Resultado antes y después del diseño: pasa.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules en `qa/e2e/`, ninguna dependencia ni global nuevo y código en inglés. La documentación la integra F10b (FR-060). |
| II. TDD y pruebas útiles | Sí | Las E2E de F10a son de caracterización: se escriben contra la base y pasan. Su rojo es una mutación en una copia descartable, que cada tarea nombra y que tiene que hacerlas fallar por la razón esperada. Los valores esperados salen de la spec y de las fixtures. |
| III. Código entendible | Sí | Dos sondas chicas con nombre y contrato (`main-mounts.ts` y `store-openings.ts`), y un Page Object ampliado con localizadores por rol. |
| IV. Contenido en Git, IDs estables | Sí | Las pruebas usan los IDs y los textos de hoy, y `curriculumIds` y `frozenProgress`, que están congeladas. |
| V. Capas y contratos explícitos | Sí | Las pruebas no tocan producción. El contrato de correspondencia deja explícito qué cubre cada escenario retirado. |
| VI. Español, accesibilidad y portabilidad | Sí | Las E2E fijan el foco, el salto al contenido, `aria-pressed`, `aria-current` y la región del toast. Los comandos son portables. |
| VII. Secretos y salidas generadas fuera de Git | Sí | La copia del spike vive en la scratchpad y se borra. Ningún `dist`, informe de Playwright ni `node_modules` entra en Git. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. |

## Decisiones del usuario que aplica este plan

| Decisión | Cómo la aplica | Dónde |
| --- | --- | --- |
| **F10-Q1:** ninguno por omisión, y una librería sólo si gana con la regla | El spike con sus tres candidatos y la regla de R2 | §2 (T003 a T006) |
| **P4:** F10a es el spike y la red, sin código de producción | Ningún archivo fuera de `qa/e2e/` y de esta carpeta | Todo el plan |
| **El tope de 1 500 000** (noche del 2026-10-28) | El margen de la regla y la medida del `dist`; la spec enmendada | §0 y §2 |
| **D1-bis, la escritura diferida de nuqs** | `waitForURL` en C3, en C5 y en las E2E con nuqs; `--repeat-each` en el spike | §2.3 y §3 |
| **No hay `KNOWN DEFECT` del menú** | Ninguna prueba lo fija. «Laboratorio» (`?#laboratorio`) recarga sólo si cambia lo que va antes del hash (L1 y L2 de F1) | §3 |
| **F10-A1, el `aria-pressed` de `<body>`** | No es de F10a: su E2E falla contra la base y va en F10b | plan-f10b.md |

## Project Structure

### Documentation (this feature)

```text
specs/024-f10-shell/
├── spec.md                       # la spec de F10, con la enmienda del 2026-10-28
├── plan.md                       # este archivo (F10a)
├── research.md                   # F10a: decisiones, Context7 y el resultado del spike
├── quickstart.md                 # F10a: la línea base, el spike y la compuerta
├── tasks.md                      # F10a: T001 a T014
├── contracts/
│   ├── f10a-check-correspondence.md   # F10a: dónde queda cubierto cada escenario retirado
│   └── f10b-shell-router.md           # F10b
├── plan-f10b.md, research-f10b.md, quickstart-f10b.md, tasks-f10b.md   # F10b
└── checklists/requirements.md
```

### Source Code (repository root)

```text
qa/e2e/
├── pages/shell.ts                   (cambia)  main, skipLink, sidebar, progressBar, exportButton y sidebarText
├── lib/main-mounts.ts               (nuevo)   watchMainMounts, startCountingMounts y mountsSinceStart
├── lib/store-openings.ts            (nuevo)   watchStoreOpenings y storeOpenings
└── specs/
    ├── shell-navigation.spec.ts     (nuevo)   el foco, el desplazamiento, Atrás y Adelante, el hash desconocido y el salto
    ├── shell-mounts.spec.ts         (nuevo)   un montaje por navegación (SC-010) y C5
    ├── shell-language.spec.ts       (nuevo)   el idioma: escritura, aviso, tema y enlaces
    ├── shell-sidebar.spec.ts        (nuevo)   la barra lateral, los conteos, la exportación y el toast
    └── boot-order.spec.ts           (nuevo)   el arranque observado por sus efectos (FR-057)
```

**Structure Decision:** las sondas van en `qa/e2e/lib/`, junto a `document-marker.ts` y `storage-access.ts`, que tienen la misma forma (un `addInitScript` y una lectura). El Page Object del shell crece en el mismo archivo, porque F10b no puede cambiarlo sin editar las E2E que lo usan (FR-001).

## Review Focus

Lo que el revisor mira primero:

- **Que las E2E pasen igual contra F10b.**
  - Ninguna mira el marcado estático de `index.html`, el orden de los scripts ni un `window.Taller*`.
  - `main-mounts` mira `document`, busca `#main` en cada tanda y cuenta desde que la página está dibujada (research.md, R4).
  - Los conteos del menú se leen con el contenido ya cargado, y por eso pasan con la aparición diferida de F10-Q5.
- **Que el spike no confunda una inestabilidad con un fallo.** C3 y C5 corren con `--repeat-each=5` y esperan la URL después de cada escritura de nuqs (R5).
- **La regla, aplicada con números.** El margen sale de T001, y el aumento se mide contra la variante del router propio en la misma copia (R2).
- **El permiso, antes de medir:** T002 se cierra antes que T004 y T005. Una librería sin permiso queda «no medida», y la regla elige el propio (R3).
- **La tabla:** ningún escenario de la base sin cobertura ni motivo, y cada prueba citada existe con ese nombre (R7).

**Lo que la spec implica y ninguna prueba de hoy ejercita**, cada caso con la tarea que suma su prueba:

1. **`hashchange` y `popstate` por una sola navegación** (spec, «Edge Cases»). Nada cuenta montajes hoy. Lo fijan «Back mounts the previous page once» y los seis «the menu link to #… mounts the page once» (T009). Su mutación quita `lastNavigation` en una copia.
2. **Volver con Atrás a una URL con query a la que se llegó por hash** (spec, «Edge Cases»). Nadie lo prueba. Lo fija «Back to an address with a query reads that query again» (T008).
3. **Dos avisos seguidos** (US3, escenario 6). Ninguna E2E mide los 4,5 s. Lo fija «a second notice replaces the first and stays 4.5 s from the second», con `page.clock` (T011).
4. **El idioma de un enlace en una navegación por hash, no al arrancar** (FR-021: «al arrancar y en cada navegación»). F1 lo prueba sólo al arrancar. Lo fijan «a world in the query sets its language on a hash navigation» y «a language in the query sets it on a hash navigation to Sistemas» (T010).
5. **Nada del taller detrás del acceso, sin la sonda de `window.TallerLab`** (R6). Hoy lo prueba `'TallerLab' in window`, que F10b deja vacía. Lo fija «behind the access no page is drawn» (T012).

## Unidades y orden

| Unidad | Tareas | Compuerta |
| --- | --- | --- |
| U0 · Línea base | T001 | Todo en verde sobre la base y los valores de quickstart.md §1 anotados |
| U1 · El spike | T002 a T006 | El resultado en research.md, reproducible con la regla (SC-002) |
| U2 · La red | T007 a T012 | Cada spec nueva en verde contra la base, con su mutación fallando |
| U3 · La tabla | T013 | Ninguna fila sin salida (SC-007) |
| U4 · El cierre | T014 | La compuerta de §0.2 y el PR |

U1 y U2 pueden avanzar a la vez: el spike corre en la copia, y la red, en el repositorio. Las únicas dependencias son tres:
- T004 y T005 esperan el permiso de T002;
- T003 copia a la copia las sondas y las specs de §3.1, §3.2 y §3.3, que están completas en este plan aunque todavía no estén commiteadas;
- T014 espera a todas.

## 0. La línea base y la compuerta

### Tarea 0.1 · La línea base (T001)

- **Quién:** el agente principal, sobre `master` con F3 a F9, F11a y F12a.
- **Entrega:** un commit que agrega a research.md la sección «Línea base de la implementación».
- **Pasos:**
  1. `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`. Todo en verde; si algo falla, F10a no empieza.
  2. Anotar lo de quickstart.md §1:
     - el hash de la base;
     - `BOOT_SIZE_LIMIT`;
     - `chars`, `script`, `style`, `markup`, `dynamicImports` e `importMeta` del `dist`;
     - el margen y su cuarto;
     - la cantidad de E2E por archivo, los avisos de `npm run lint` y la cantidad de escenarios de los tres checks.
  3. Anotar el inventario de lectura que usa el spike: las entradas de `LEGACY_MODULES` y las dos líneas de `app.js` que registran `hashchange` y `popstate`, con su número de línea.
  4. Comprobar las claves que usan las E2E de §3:
     - `LIBRARY_QUERY_KEYS.language` en `frontend/src/pages/library/model/library-query.ts`; el plan de F3 dice `'en'`;
     - el primer taller de `qa/fixtures/curriculum-ids.json` (`cache` en `master`);
     - los títulos de los mundos de Go.

     Si alguna difiere, la tarea que la usa toma la de la base y lo anota en el informe.
- **Compuerta:** los pasos 1 a 4, con los valores anotados.
- **Commit:** `docs(specs): línea base de F10a`.

### 0.2 · La compuerta de F10a

La corre el agente principal antes del PR (T014). F10a no se integra con una sola casilla en rojo.

1. `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y `E2E_PORT=4173 npm run test:e2e`, todos en verde.
2. Las cinco specs nuevas, también con `--repeat-each=5`: `npx playwright test --config qa/e2e/playwright.config.ts shell-navigation shell-mounts shell-language shell-sidebar boot-order --repeat-each=5`.
3. **El `dist`:** `chars`, `script`, `style`, `markup`, `dynamicImports` e `importMeta` iguales a T001 (quickstart.md, §1).
4. **Sólo pruebas:** `git diff --name-only <base> -- . ':!qa/e2e' ':!specs/024-f10-shell'` no imprime nada.
5. **Ningún E2E existente editado:** `git diff --name-only <base> -- qa/e2e/specs` lista sólo los cinco archivos nuevos.
6. **La tabla:** contracts/f10a-check-correspondence.md, reconciliada (T013).
7. **El spike:** research.md, «Resultado del spike», completo (T006).
8. **El PR,** con título y descripción en inglés: `test(e2e): F10a, the router spike and the shell and boot safety net`. Lleva:
   - el resultado del spike con la regla aplicada;
   - las cinco specs con su cantidad de pruebas y la mutación de cada una;
   - la tabla de correspondencia;
   - los tiempos de `npm run test:e2e` antes y después;
   - lo pendiente: el permiso de instalación, si ganó una librería, y F10b.

## 1. El permiso de las descargas (T002)

**Cubre:** FR-011 y research.md, R3.

**Es una acción del usuario:** el agente no descarga nada hasta tener la respuesta.

- **Pasos:**
  1. El día del spike, leer el registro sin descargar nada:

     ```sh
     for p in react-router @tanstack/react-router; do npm view "$p" version license dist.unpackedSize dependencies peerDependencies --json; done
     ```

     Repetir `npm view <dependencia>@<rango> version license dist.unpackedSize --json` con cada dependencia que liste cada uno, hasta las hojas. Al 2026-10-28 eran las de la tabla de R3.
  2. Pedir el permiso con una tabla por candidato, con estas columnas:
     - el nombre y la versión exacta;
     - el origen (`https://registry.npmjs.org`);
     - la licencia, marcando las que no sean MIT (al 2026-10-28, `isbot` es Unlicense);
     - el tamaño desempaquetado de cada paquete y el total por candidato.

     Decir que la instalación es `npm install --no-save` en una copia de la scratchpad, que `package.json` y el lockfile del repositorio no cambian y que la copia se borra al terminar.
  3. Anotar la respuesta en research.md, «Resultado del spike»: qué candidatos se pueden medir. Si el usuario niega uno, ese candidato queda «no medido: sin permiso de descarga».
- **Sin commit propio:** la respuesta va en el commit de T006.

## 2. El spike (T003 a T006)

**Cubre:** FR-007 a FR-011, SC-002, C1 a C8 y research.md, R1 a R5.

### 2.1 La copia y el seam (T003)

- **Pasos:**
  1. Crear la copia, fuera del repositorio:

     ```sh
     SPIKE="$SCRATCHPAD/f10-spike" && rm -rf "$SPIKE" && mkdir -p "$SPIKE"
     git archive "$(git rev-parse HEAD)" | tar -x -C "$SPIKE"
     cd "$SPIKE" && npm ci --offline --no-audit --no-fund
     ```

     `$SCRATCHPAD` es la scratchpad del agente. Si `npm ci --offline` intenta descargar, parar y pedir permiso.
  2. En `$SPIKE/frontend/app.js`, reemplazar las dos líneas que T001 anotó:

     ```js
     window.addEventListener('hashchange', navigateFromLocation);
     window.addEventListener('popstate', navigateFromLocation);
     ```

     por `startSpikeRouter(navigateFromLocation);`, y agregar al bloque de imports de `app.js` `import { startSpikeRouter } from './src/app/spike-router';`.
  3. Copiar a la copia, sin commitearlos, los archivos de §3.1 (las sondas y el Page Object), §3.2 (`shell-navigation.spec.ts`, que trae el caso nuevo de C7) y §3.3 (`shell-mounts.spec.ts`), tal como están en este plan.
  4. Escribir la variante del router propio en `$SPIKE/frontend/src/app/spike-router.tsx` (quickstart.md, §2.2, variante A).
  5. Correr la medida de quickstart.md, §2.4: el build, `chars` y las E2E de C1 a C8 con `--repeat-each=5` en C3 y C5. Todo en verde, porque es el comportamiento de hoy. Anotar `chars` como la referencia del propio.
- **Compuerta:** la variante A pasa C1 a C8. Si no pasa, el seam está mal: se corrige antes de seguir.

### 2.2 React Router (T004)

- **Antes:** el permiso de T002 para `react-router`.
- **Pasos:**
  1. `cd "$SPIKE" && npm install --no-save react-router@<versión de T002>`.
  2. La variante B1 de quickstart.md, §2.2 (`createHashRouter` con `RouterProvider`), en `spike-router.tsx`.
  3. La medida de §2.4: `chars`, C1 a C8 y el primer error de cada criterio que falle.
  4. Si B1 falla algún criterio, la variante B2 (`HashRouter`) y la misma medida.
  5. Anotar las dos filas en la tabla de «Resultado del spike».
- **La regla para el código de unión:** si el tipo de un parámetro difiere en la versión instalada, se ajusta sólo la unión (los tipos y los nombres importados), y el informe lo anota. Nunca se cambia la URL que se escribe ni la que se lee.

### 2.3 TanStack Router (T005)

- **Antes:** el permiso de T002 para `@tanstack/react-router`.
- **Pasos:**
  1. `cd "$SPIKE" && git checkout -- . 2>/dev/null; npm install --no-save @tanstack/react-router@<versión de T002>`. Si la copia no es un repositorio, volver `spike-router.tsx` a mano a la variante que corresponda.
  2. La variante C1 de quickstart.md, §2.2 (`createHashHistory`), y la medida de §2.4.
  3. Si C1 falla C1 o C2 del contrato, la variante C2 (una historia propia con `createHistory`) y la misma medida.
  4. Anotar las filas.
- **La misma regla para el código de unión** que en T004.

### 2.4 La decisión (T006)

- **Pasos:**
  1. Completar «Resultado del spike» en research.md:
     - la tabla, con una fila por variante medida o «no medido: sin permiso de descarga»;
     - la línea base de T001: el tope, `chars`, el margen y el cuarto;
     - la regla aplicada paso a paso: por qué pasa o no cada condición y qué entra.
  2. Para cada librería que pase C1 a C8, escribir en una frase qué necesidad de la spec resuelve que el propio no (research.md, R2), o «nada».
  3. Si gana una librería, escribir el pedido de instalación para el repositorio, con el nombre, la versión exacta, el origen, el peso medido y la licencia. Ésa es la acción del usuario entre F10a y F10b (spec, «Acciones del usuario»). Si gana el propio, escribir «ninguna descarga».
  4. Borrar la copia: `rm -rf "$SCRATCHPAD/f10-spike"`.
- **Commit:** `docs(specs): resultado del spike del router de F10`.
- **Compuerta:** otra persona puede reproducir la decisión desde research.md (SC-002).

## 3. La red del shell y del arranque (T007 a T012)

**Cubre:** FR-001, FR-002, FR-056 y FR-057; SC-001, SC-006 y SC-010; US1 a US4.

**Cada tarea de esta sección sigue el mismo ciclo:**
1. **Escribir la spec** tal como está acá.
2. **Construir y correrla contra la base:** `npm run build` y `E2E_PORT=4173 npx playwright test --config qa/e2e/playwright.config.ts <archivo>`. Tiene que pasar entera.
   - Si una prueba falla contra la base, el valor esperado sale de la spec y no se cambia. Se para y se informa: es un hallazgo, porque la base no hace lo que la spec dice que hace hoy.
   - La única excepción es un nombre de la base que difiera, como la clave de un filtro o un título, anotado en T001.
3. **Correrla con `--repeat-each=5`:** en verde.
4. **La mutación:** en una copia descartable de la base (`git archive` a la scratchpad, como en §2.1), aplicar el cambio que la tarea nombra, construir y correr la spec. Tiene que fallar la prueba nombrada, por la razón nombrada. Borrar la copia.
5. **Los checks:** `npm run typecheck`, `npm run lint` y `npm run format:check`.
6. **El commit:** `test(e2e): …`, con el nombre que da la tarea.

### 3.1 El Page Object y las sondas (T007)

**Archivos:** `qa/e2e/pages/shell.ts` (cambia), `qa/e2e/lib/main-mounts.ts` (nuevo) y `qa/e2e/lib/store-openings.ts` (nuevo).

**Interfaces que produce:**
- `ShellPage`: `main`, `skipLink`, `sidebar`, `progressBar`, `exportButton` y `sidebarText(text: string): Locator`;
- `watchMainMounts(context: BrowserContext): Promise<void>`, `startCountingMounts(page: Page): Promise<void>` y `mountsSinceStart(page: Page): Promise<number>`;
- `watchStoreOpenings(context: BrowserContext): Promise<void>` y `storeOpenings(page: Page): Promise<string[]>`.

**`qa/e2e/pages/shell.ts`**: se agregan cinco campos y un método. Lo que existe no cambia: los campos nuevos van al final de la lista de campos, sus asignaciones al final del constructor y el método al final de la clase.

```ts
  readonly main: Locator;
  readonly skipLink: Locator;
  readonly sidebar: Locator;
  readonly progressBar: Locator;
  readonly exportButton: Locator;
```

```ts
    this.main = page.locator('#main');
    this.skipLink = page.getByRole('link', { name: 'Ir al contenido' });
    this.sidebar = page.getByRole('complementary').filter({ has: this.menu });
    this.progressBar = this.sidebar.getByRole('progressbar', { name: 'Pasos completados' });
    this.exportButton = this.sidebar.getByRole('button', { name: 'Exportar mi progreso' });
```

```ts
  sidebarText(text: string): Locator {
    return this.sidebar.getByText(text, { exact: true });
  }
```

**`qa/e2e/lib/main-mounts.ts`** (research.md, R4):

```ts
import type { BrowserContext, Page } from '@playwright/test';

interface MainMounts {
  count: number;
  counting: boolean;
}

interface MountWindow {
  __e2eMainMounts?: MainMounts;
}

export async function watchMainMounts(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const mounts: MainMounts = { count: 0, counting: false };
    (window as MountWindow).__e2eMainMounts = mounts;
    const addsAPage = (record: MutationRecord): boolean => {
      const main = document.getElementById('main');
      if (main === null) return false;
      const added = [...record.addedNodes].filter((node) => node instanceof Element);
      if (record.target === main) return added.length > 0;
      return main.firstElementChild !== null && added.some((node) => node.contains(main));
    };
    new MutationObserver((records) => {
      if (mounts.counting && records.some(addsAPage)) mounts.count += 1;
    }).observe(document, { childList: true, subtree: true });
  });
}

export async function startCountingMounts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const mounts = (window as MountWindow).__e2eMainMounts;
    if (mounts === undefined) throw new Error('watchMainMounts was not installed');
    mounts.count = 0;
    mounts.counting = true;
  });
}

export async function mountsSinceStart(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            setTimeout(() => resolve((window as MountWindow).__e2eMainMounts?.count ?? -1), 0),
          ),
        );
      }),
  );
}
```

**`qa/e2e/lib/store-openings.ts`** (research.md, R6):

```ts
import type { BrowserContext, Page } from '@playwright/test';
import type { StorageKey } from './curriculum';

const STORE_KEYS: StorageKey[] = [
  'taller-learning-v1',
  'taller-laboratorio-v1',
  'taller-campaign-v1',
  'taller-systems-v1',
];

interface OpeningWindow {
  __e2eStoreOpenings?: string[];
}

export async function watchStoreOpenings(context: BrowserContext): Promise<void> {
  await context.addInitScript((keys: string[]) => {
    const openings: string[] = [];
    (window as OpeningWindow).__e2eStoreOpenings = openings;
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (this: Storage, key: string) {
      if (this === window.localStorage && keys.includes(key) && !openings.includes(key))
        openings.push(key);
      return getItem.call(this, key);
    };
  }, STORE_KEYS);
}

export async function storeOpenings(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as OpeningWindow).__e2eStoreOpenings ?? []);
}
```

- **Prueba de las sondas:** las usan las specs de T009, T010 y T012; cada una tiene su mutación. T007 corre `npm run typecheck` y `npm run lint`, y la suite completa sigue en verde (las sondas no cambian nada si nadie las instala).
- **Commit:** `test(e2e): el Page Object del shell y las sondas de montajes y de apertura de almacenes`.

### 3.2 La navegación (T008)

**Archivo:** `qa/e2e/specs/shell-navigation.spec.ts`. **Cubre:** FR-016 a FR-019, US1 (escenarios 3, 5 y 6) y el borde de Atrás con query.

```ts
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

const GO_WORLD = 'go-world-1';
const GO_WORLD_TITLE = 'La estación del rover';

async function scrollPosition(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

test.describe('a hash navigation', () => {
  test('scrolls to the top at once and leaves the focus on #main', async ({ shell, page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await shell.goto(urls.view('recorrido'));
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
    );
    expect(await scrollPosition(page)).toBeGreaterThan(0);

    await shell.openFromMenu('biblioteca');

    await expect(shell.heading('biblioteca')).toBeVisible();
    await expect(shell.main).toBeFocused();
    expect(await scrollPosition(page)).toBe(0);
  });

  test('Back and Forward show the view of each entry', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));
    await shell.openFromMenu('biblioteca');
    await expect(shell.heading('biblioteca')).toBeVisible();
    await shell.openFromMenu('proyecto');
    await expect(shell.heading('proyecto')).toBeVisible();

    await page.goBack();
    await expect(shell.heading('biblioteca')).toBeVisible();
    await expect(shell.menuLink('biblioteca')).toHaveAttribute('aria-current', 'page');

    await page.goForward();
    await expect(shell.heading('proyecto')).toBeVisible();
    await expect(shell.menuLink('proyecto')).toHaveAttribute('aria-current', 'page');
  });

  test('Back to an address with a query reads that query again', async ({
    shell,
    campaign,
    page,
  }) => {
    await shell.goto(urls.world(GO_WORLD));
    await expect(campaign.world(GO_WORLD_TITLE)).toBeVisible();
    await shell.openFromMenu('biblioteca');
    await expect(page).toHaveURL(`/?mundo=${GO_WORLD}#biblioteca`);

    await page.goBack();

    await expect(shell.heading('campana')).toBeVisible();
    await expect(campaign.world(GO_WORLD_TITLE)).toBeVisible();
    await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('the first draw', () => {
  test('moves neither the focus nor the scroll', async ({ shell, page }) => {
    await shell.goto(urls.view('metodo'));

    await expect(shell.heading('metodo')).toBeVisible();
    await expect(shell.main).not.toBeFocused();
    expect(await scrollPosition(page)).toBe(0);
  });
});

test.describe('an address without a known view', () => {
  for (const address of ['/', '/#', '/#loquesea']) {
    test(`${address} shows the route and keeps the address`, async ({ shell, page }) => {
      await shell.goto(address);

      await expect(shell.heading('recorrido')).toBeVisible();
      await expect(shell.menuLink('recorrido')).toHaveAttribute('aria-current', 'page');
      await expect(page).toHaveURL(address);
    });
  }
});

test.describe('the skip link', () => {
  test('moves the focus to #main and keeps the address and the view', async ({ shell, page }) => {
    await shell.goto(urls.view('atlas'));

    await page.keyboard.press('Tab');
    await expect(shell.skipLink).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(shell.main).toBeFocused();
    await expect(page).toHaveURL(urls.view('atlas'));
    await expect(shell.heading('atlas')).toBeVisible();
  });
});
```

- **Lo que no entra:** el salto al contenido *durante la carga* (spec, «Edge Cases»). En la base, el oyente del salto lo registra `startApp()`, después de la compuerta, y el enlace sin oyente lleva la URL a `#main`. Esa prueba falla contra la base, así que va en F10b, en su commit rojo (plan-f10b.md, §6).
- **La mutación:** en la copia, quitar `window.scrollTo({ top: 0, behavior: 'instant' });` de `navigateFromLocation`. Falla «scrolls to the top at once and leaves the focus on #main», porque `scrollY` no vuelve a 0.
- **Commit:** `test(e2e): la navegación del shell, el foco y el salto al contenido contra la base`.

### 3.3 Los montajes (T009)

**Archivo:** `qa/e2e/specs/shell-mounts.spec.ts`. **Cubre:** FR-016, FR-017, FR-030, SC-010 y C5.

```ts
import { expect, test } from '../fixtures';
import { curriculumIds } from '../lib/curriculum';
import { mountsSinceStart, startCountingMounts, watchMainMounts } from '../lib/main-mounts';
import { urls, type View } from '../lib/urls';

const FROM_THE_ROUTE: View[] = ['campana', 'sistemas', 'atlas', 'biblioteca', 'proyecto', 'metodo'];
const WORKSHOP = Object.keys(curriculumIds.workshops)[0];
const LIBRARY_LANGUAGE_KEY = 'en';

test.beforeEach(async ({ context }) => {
  await watchMainMounts(context);
});

test.describe('one mount per navigation', () => {
  for (const view of FROM_THE_ROUTE) {
    test(`the menu link to #${view} mounts the page once`, async ({ shell, page }) => {
      await shell.goto(urls.view('recorrido'));
      await expect(shell.heading('recorrido')).toBeVisible();
      await startCountingMounts(page);

      await shell.openFromMenu(view);

      await expect(shell.heading(view)).toBeVisible();
      expect(await mountsSinceStart(page)).toBe(1);
    });
  }

  test('Back mounts the previous page once', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));
    await shell.openFromMenu('biblioteca');
    await expect(shell.heading('biblioteca')).toBeVisible();
    await startCountingMounts(page);

    await page.goBack();

    await expect(shell.heading('recorrido')).toBeVisible();
    expect(await mountsSinceStart(page)).toBe(1);
  });

  test('the other language mounts the page once and the active one mounts nothing', async ({
    shell,
    page,
  }) => {
    await shell.goto(urls.view('proyecto'));
    await startCountingMounts(page);

    await shell.switchLanguage('go');
    await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
    expect(await mountsSinceStart(page)).toBe(1);

    await startCountingMounts(page);
    await shell.switchLanguage('go');
    expect(await mountsSinceStart(page)).toBe(0);
  });
});

test.describe('the writes with replaceState mount nothing', () => {
  test('the next exercise rewrites the query in place', async ({ shell, lab, page }) => {
    await shell.goto(urls.exercise('rust-01', 'learn'));
    await expect(lab.exerciseTitle()).toBeVisible();
    await startCountingMounts(page);

    await lab.nextButton().click();

    await page.waitForURL((url) => url.searchParams.get('ejercicio') !== 'rust-01');
    expect(await mountsSinceStart(page)).toBe(0);
  });

  test('a workshop part is written by nuqs and mounts nothing', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto(urls.workshop('rust', WORKSHOP, 'explore'));
    await expect(systems.part('build')).toBeVisible();
    await startCountingMounts(page);

    await systems.part('build').click();

    await page.waitForURL((url) => url.searchParams.get('parte') === 'build');
    expect(await mountsSinceStart(page)).toBe(0);
  });

  test('a library filter is written by nuqs and mounts nothing', async ({ shell, page }) => {
    await shell.goto(urls.view('biblioteca'));
    await startCountingMounts(page);

    await page.getByRole('combobox', { name: 'Filtrar por lenguaje' }).selectOption('rust');

    await page.waitForURL((url) => url.searchParams.get(LIBRARY_LANGUAGE_KEY) === 'rust');
    expect(await mountsSinceStart(page)).toBe(0);
  });
});
```

- **Los valores de la base:** `WORKSHOP` y `LIBRARY_LANGUAGE_KEY` son los que T001 comprobó. Si una transición da distinto de 0 contra la base, se la reemplaza por otra transición de la misma página que dé 0, y el informe lo anota (research.md, R4). Ejemplos: el ejercicio anterior en lugar del siguiente, o la parte `ship` en lugar de `build`.
- **La mutación:** en la copia, borrar la línea `if (lastNavigation === location.href) return;` de `navigateFromLocation`. Falla «Back mounts the previous page once» con 2, porque `popstate` y `hashchange` llegan en tareas distintas (research.md, R4).
- **Commit:** `test(e2e): un montaje por navegación y ninguno por replaceState, contra la base`.

### 3.4 El idioma (T010)

**Archivo:** `qa/e2e/specs/shell-language.spec.ts`. **Cubre:** FR-021 a FR-023 y US2 (escenarios 2 a 5). La reescritura de la URL desde cada vista ya la fija `url-contract.spec.ts` de F1, sin editar.

```ts
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { mountsSinceStart, startCountingMounts, watchMainMounts } from '../lib/main-mounts';
import { urls } from '../lib/urls';

const ROUTE_WRITE = 'set taller-learning-v1';
const GO_WORLD = 'go-world-1';
const GO_WORLD_TITLE = 'La estación del rover';

test.describe('the language switch', () => {
  test('the other language saves the route once, remounts the page, announces it and themes the body', async ({
    context,
    shell,
    storage,
    page,
  }) => {
    await watchMainMounts(context);
    await storage.watchWrites();
    await shell.goto(urls.view('proyecto'));
    await startCountingMounts(page);

    await shell.switchLanguage('go');

    await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
    await expect(shell.languageButton('rust')).toHaveAttribute('aria-pressed', 'false');
    await expect(shell.toast).toHaveText('Recorrido de Go. Tu otro avance sigue guardado.');
    await expect(shell.body).toHaveAttribute('data-language', 'go');
    expect(await storage.writes()).toEqual([ROUTE_WRITE]);
    expect(await mountsSinceStart(page)).toBe(1);
  });

  test('the active language writes nothing, announces nothing and mounts nothing', async ({
    context,
    shell,
    storage,
    page,
  }) => {
    await watchMainMounts(context);
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));
    await startCountingMounts(page);

    await shell.switchLanguage('rust');

    expect(await mountsSinceStart(page)).toBe(0);
    expect(await storage.writes()).toEqual([]);
    await expect(shell.toast).toHaveText('');
  });
});

test.describe('the language of a link', () => {
  test('KNOWN DEFECT (kept): a lab link in the other language switches it in memory and does not save it', async ({
    shell,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await storage.watchWrites();

    await shell.goto(urls.exercise('rust-02', 'learn'));

    await expect(shell.languageButton('rust')).toHaveAttribute('aria-pressed', 'true');
    expect(await storage.writes()).not.toContain(ROUTE_WRITE);
    await shell.goto(urls.view('recorrido'));
    await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a world in the query sets its language on a hash navigation', async ({
    shell,
    campaign,
  }) => {
    await shell.goto(`/?mundo=${GO_WORLD}#biblioteca`);
    await expect(shell.languageButton('rust')).toHaveAttribute('aria-pressed', 'true');

    await shell.openFromMenu('campana');

    await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
    await expect(campaign.world(GO_WORLD_TITLE)).toBeVisible();
  });

  test('a language in the query sets it on a hash navigation to Sistemas', async ({ shell }) => {
    await shell.goto('/?lenguaje=go#proyecto');
    await expect(shell.languageButton('rust')).toHaveAttribute('aria-pressed', 'true');

    await shell.openFromMenu('sistemas');

    await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
    await expect(shell.heading('sistemas')).toBeVisible();
  });
});
```

- **`frozenProgress`** guarda el idioma `go` (`qa/fixtures/progress-master-2a278ad-storage.json`), y por eso el enlace de Rust demuestra el cambio en memoria.
- **La mutación:** en la copia, borrar la llamada `syncLinkedLanguage();` de `navigateFromLocation`. Falla «a world in the query sets its language on a hash navigation», porque el botón Go no queda marcado.
- **Commit:** `test(e2e): el idioma del shell y de los enlaces, contra la base`.

### 3.5 La barra lateral, los conteos, la exportación y el toast (T011)

**Archivo:** `qa/e2e/specs/shell-sidebar.spec.ts`. **Cubre:** FR-025 a FR-028 y FR-032; US3 (escenarios 1, 2, 3, 5 y 6).

```ts
import { readFile } from 'node:fs/promises';
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { documentWasReloaded, markDocument } from '../lib/document-marker';
import { urls, type View } from '../lib/urls';

const VIEWS: View[] = [
  'recorrido',
  'campana',
  'sistemas',
  'atlas',
  'laboratorio',
  'biblioteca',
  'proyecto',
  'metodo',
];
const EXPORT_FILE = /^taller-progreso-\d{4}-\d{2}-\d{2}\.json$/;
const EXPORT_KEYS = ['version', 'language', 'completed', 'lab', 'campaign', 'systems', 'exportedAt'];
const START = new Date('2026-10-28T08:00:00-03:00');
const PAUSE = new Date('2026-10-28T09:00:00-03:00');

test.describe('the sidebar', () => {
  test('marking the first step updates the route progress without reloading', async ({
    shell,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await markDocument(page);

    await page.getByRole('checkbox', { name: /^Marcar como completado: / }).first().check();

    await expect(shell.sidebarText('RECORRIDO GUIADO · RUST')).toBeVisible();
    await expect(shell.sidebarText('1 de 12')).toBeVisible();
    await expect(shell.sidebarText('8%')).toBeVisible();
    await expect(shell.progressBar).toHaveJSProperty('value', 1);
    await expect(shell.progressBar).toHaveJSProperty('max', 12);
    expect(await documentWasReloaded(page)).toBe(false);
  });

  test('the menu shows the counts of today', async ({ shell }) => {
    await shell.goto(urls.view('recorrido'));

    await expect(shell.menuLink('campana')).toHaveAccessibleName('Campaña 4');
    await expect(shell.menuLink('sistemas')).toHaveAccessibleName('Sistemas 25');
    await expect(shell.menuLink('laboratorio')).toHaveAccessibleName('Laboratorio 274');
    await expect(shell.menuLink('biblioteca')).toHaveAccessibleName('Biblioteca 15');

    await shell.switchLanguage('go');
    await expect(shell.menuLink('campana')).toHaveAccessibleName('Campaña 4');
  });

  test('«Exportar mi progreso» downloads the copy of today from every view and announces it', async ({
    shell,
    storage,
    page,
  }) => {
    await storage.seed(frozenProgress);
    for (const view of VIEWS) {
      await shell.goto(urls.view(view));

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        shell.exportButton.click(),
      ]);

      expect(download.suggestedFilename()).toMatch(EXPORT_FILE);
      const copy = JSON.parse(await readFile(await download.path(), 'utf8')) as object;
      expect(Object.keys(copy)).toEqual(expect.arrayContaining(EXPORT_KEYS));
      await expect(shell.toast).toHaveText('Copia de progreso exportada.');
    }
  });

  test('with the storage blocked, marking a step keeps the footer and the start notice', async ({
    shell,
    storage,
    page,
  }) => {
    await storage.block();
    await shell.goto(urls.view('recorrido'));
    await expect(shell.toast).toHaveText(
      'No se pudo leer o guardar el avance. Podés exportarlo al terminar.',
    );

    await page.getByRole('checkbox', { name: /^Marcar como completado: / }).first().check();

    await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
    await expect(shell.sidebarText('1 de 12')).toBeVisible();
  });
});

test.describe('the toast', () => {
  test('a second notice replaces the first and stays 4.5 s from the second', async ({
    shell,
    page,
  }) => {
    await page.clock.install({ time: START });
    await shell.goto(urls.view('proyecto'));
    await page.clock.pauseAt(PAUSE);

    await shell.switchLanguage('go');
    await expect(shell.toast).toHaveText('Recorrido de Go. Tu otro avance sigue guardado.');
    await page.clock.runFor(3000);
    await shell.switchLanguage('rust');
    await expect(shell.toast).toHaveText('Recorrido de Rust. Tu otro avance sigue guardado.');
    await expect(shell.toast).toHaveClass(/\bvisible\b/);

    await page.clock.runFor(4400);
    await expect(shell.toast).toHaveClass(/\bvisible\b/);
    await page.clock.runFor(200);
    await expect(shell.toast).not.toHaveClass(/\bvisible\b/);
  });
});
```

- **Los números esperados** son los de la spec: «1 de 12» y «8%» (US3, escenario 1) y 4, 25, 274 y 15 (FR-032). Ninguno sale del contenido.
- **La mutación:** en la copia, cambiar `clearTimeout(toastTimeout);` de `toast()` por nada. Falla «a second notice replaces the first and stays 4.5 s from the second», porque el primer temporizador apaga el aviso a los 4,5 s del primero.
- **Commit:** `test(e2e): la barra lateral, los conteos, la exportación y el toast, contra la base`.

### 3.6 El arranque (T012)

**Archivo:** `qa/e2e/specs/boot-order.spec.ts`. **Cubre:** FR-035 a FR-037 y FR-057; US4 (escenarios 1, 3 y 5); SC-006. Las fixtures congeladas y el almacenamiento bloqueado ya los fija `startup-storage.spec.ts` de F1.

```ts
import { expect, test } from '../fixtures';
import { CONTENT_URL } from '../lib/content-requests';
import { frozenProgress, type StorageKey } from '../lib/curriculum';
import { storeOpenings, watchStoreOpenings } from '../lib/store-openings';
import { urls, type View } from '../lib/urls';

const ROUTE_KEY: StorageKey = 'taller-learning-v1';
const LAB_KEY: StorageKey = 'taller-laboratorio-v1';
const CAMPAIGN_KEY: StorageKey = 'taller-campaign-v1';
const SYSTEMS_KEY: StorageKey = 'taller-systems-v1';
const UNREADABLE = '{';
const UNREADABLE_CAMPAIGN = JSON.stringify({
  version: 2,
  seals: {},
  checkpoints: { 'rust-world-1': { passed: true, lastAnswer: 0 } },
});
const PROGRESS_VIEWS: View[] = ['campana', 'sistemas', 'laboratorio'];
const UNREADABLE_NOTICE = [
  'No se pudo leer el progreso del recorrido guardado; se conservó una copia en taller-learning-v1:respaldo.',
  'No se pudo leer el progreso de campaña guardado; se conservó una copia en taller-campaign-v1:respaldo.',
  'No se pudo leer el progreso de Sistemas guardado; se conservó una copia en taller-systems-v1:respaldo.',
  'No se pudo leer el progreso del laboratorio guardado; se conservó una copia en taller-laboratorio-v1:respaldo.',
].join(' · ');

test.describe('the start', () => {
  test('opens the lab, the route, the campaign and Sistemas, in that order', async ({
    context,
    shell,
    page,
  }) => {
    await watchStoreOpenings(context);

    await shell.goto(urls.view('recorrido'));

    expect(await storeOpenings(page)).toEqual([LAB_KEY, ROUTE_KEY, CAMPAIGN_KEY, SYSTEMS_KEY]);
  });

  test('four unreadable copies give one toast in the order route, campaign, Sistemas and lab', async ({
    shell,
    storage,
  }) => {
    await storage.seed({
      [ROUTE_KEY]: UNREADABLE,
      [LAB_KEY]: UNREADABLE,
      [CAMPAIGN_KEY]: UNREADABLE,
      [SYSTEMS_KEY]: UNREADABLE,
    });

    await shell.goto(urls.view('recorrido'));

    await expect(shell.toast).toHaveText(UNREADABLE_NOTICE);
    const stored = await storage.snapshot();
    for (const key of [ROUTE_KEY, LAB_KEY, CAMPAIGN_KEY, SYSTEMS_KEY])
      expect(stored[`${key}:respaldo`]).toBe(UNREADABLE);
  });

  test('what this version writes is read again without backups or notices', async ({
    shell,
    storage,
    page,
  }) => {
    await storage.seed(frozenProgress);
    await shell.goto(urls.view('recorrido'));
    await shell.switchLanguage('rust');
    await shell.switchLanguage('go');
    await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(shell.heading('recorrido')).toBeVisible();

    await expect(shell.toast).toHaveText('');
    const stored = await storage.snapshot();
    expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
  });
});

test.describe('the integrity of the campaign copy', () => {
  test('an unreadable campaign copy survives the start and the navigation', async ({
    shell,
    storage,
  }) => {
    await storage.seed({ [CAMPAIGN_KEY]: UNREADABLE_CAMPAIGN, [LAB_KEY]: frozenProgress[LAB_KEY] });
    await shell.goto(urls.view('recorrido'));

    for (const view of PROGRESS_VIEWS) {
      await shell.openFromMenu(view);
      await expect(shell.heading(view)).toBeVisible();
    }

    const stored = await storage.snapshot();
    expect(stored[CAMPAIGN_KEY]).toBe(UNREADABLE_CAMPAIGN);
    expect(stored[`${CAMPAIGN_KEY}:respaldo`]).toBe(UNREADABLE_CAMPAIGN);
    expect(stored[SYSTEMS_KEY]).toBeUndefined();
  });

  test('an absent campaign key is not created by the start nor by the navigation', async ({
    shell,
    storage,
  }) => {
    await storage.seed({ [LAB_KEY]: frozenProgress[LAB_KEY] });
    await shell.goto(urls.view('recorrido'));

    for (const view of PROGRESS_VIEWS) {
      await shell.openFromMenu(view);
      await expect(shell.heading(view)).toBeVisible();
    }

    const stored = await storage.snapshot();
    expect(stored[CAMPAIGN_KEY]).toBeUndefined();
    expect(stored[SYSTEMS_KEY]).toBeUndefined();
  });
});

test.describe('what is drawn before the content', () => {
  test('the menu, the language switch and the skip link are there while the content loads', async ({
    shell,
    page,
  }) => {
    let release: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(CONTENT_URL, async (route) => {
      await released;
      await route.continue();
    });

    await page.goto(urls.view('recorrido'));
    await expect(page.locator('#main [data-content-gate="loading"]')).toBeVisible();

    await expect(shell.menuLink('recorrido')).toBeVisible();
    await expect(shell.languageButton('rust')).toBeVisible();
    await expect(shell.skipLink).toBeAttached();
    release();
    await expect(shell.heading('recorrido')).toBeVisible();
  });
});

test.describe('behind the access', () => {
  test.use({ sessionAccount: null });

  test('behind the access no page is drawn', async ({ access, shell, page }) => {
    await page.goto(urls.view('campana'));

    await expect(access.heading('Ingresá al taller')).toBeVisible();
    await expect(shell.main).toBeEmpty();
  });
});
```

- **«Laboratorio» recarga el documento** (`?#laboratorio`, L1 de F1). Las pruebas de integridad navegan igual, y la recarga es parte del recorrido que hacía `boot-check` con `visitProgressViews`.
- **El cambio de idioma de ida y vuelta** provoca la escritura real del recorrido normalizado, como el escenario de `boot-check` que reemplaza. Con `frozenProgress` (idioma Go), las dos escrituras son la de Rust y la de Go.
- **La mutación:** en la copia, mover `window.TallerLab.init();` de `startApp()` a después de `const systemsInit = …`. Falla «opens the lab, the route, the campaign and Sistemas, in that order», con el laboratorio último.
- **Commit:** `test(e2e): el arranque observado por sus efectos, contra la base`.

## 4. La tabla de correspondencia (T013)

**Archivo:** `specs/024-f10-shell/contracts/f10a-check-correspondence.md`. **Cubre:** FR-052 (la tabla que F10a deja armada) y SC-007.

- **Pasos:**
  1. Listar los escenarios de la base:

     ```sh
     grep -nE "^\s*(await )?test\(" qa/boot-check.ts qa/app-shell-check.ts
     ```

     Para `load-order-check`, listar `CONSTRAINTS`, `STAGE_CONSTRAINTS` y las tres comprobaciones fijas: la primera hoja, `app.js` último y `startApp` una vez.
  2. Para cada escenario de la base, buscar su fila en el contrato.
     - **Si no está,** se agrega con una de las tres salidas.
     - **Si el contrato tiene una fila que la base no tiene,** se marca «no está en la base» y se deja.
  3. Verificar que existe cada prueba citada:
     - para las E2E, `grep -rn "<nombre>" qa/e2e/specs`;
     - para las de Vitest, `grep -rn "<nombre>" frontend/src`;
     - las de F10b se citan con el nombre que fija `contracts/f10b-shell-router.md`, §7, y se verifican en F10b.
  4. **Las dos ramas condicionales** de las importaciones congeladas (§1 del contrato): si la base no tiene las E2E de F8 que importan esas exportaciones, se suman a `boot-order.spec.ts` dos pruebas, en un commit `test(e2e): …` aparte. Las dos llevan los nombres del contrato y usan `MethodPage.importFile` del Page Object de F8. Cada una:
     - siembra el almacenamiento vacío;
     - importa el archivo;
     - comprueba que el toast dice «Copia importada y combinada con tu avance actual.», el aviso sin omisiones de `importNotice` (`frontend/src/features/progress-backup/model/create-progress-backup.ts:113` en `master`);
     - comprueba que `taller-learning-v1` incluye los pasos de la exportación.
- **Compuerta:** cada escenario de la base tiene una fila con salida, y cada prueba citada de F1 a F9, F11a, F12a y F10a existe.
- **Commit:** `docs(specs): la correspondencia de los tres checks, reconciliada con la base`.

## 5. El cierre (T014)

La compuerta de §0.2 y el PR. Cubre FR-001 a FR-006, FR-059 y SC-001, SC-002, SC-006, SC-007, SC-008, SC-010 y SC-012.

**La reversión:** el PR de F10a se revierte entero sin afectar producción, porque sólo agrega pruebas y documentación.

## Puntos de integración

- **F10b espera a F10a:** usa sus E2E sin editarlas, su tabla y la decisión del spike.
- **El permiso de la librería,** si gana una, se pide entre F10a y F10b (spec, «Acciones del usuario»).
- **FR-059:** si A3, A4, D1c, C4, F11b, F11c, F11d, F12b o F13 están en curso, se integran de a uno. El que llega después rebasa. Un cambio de esos ítems que toque el shell o el arranque puede cambiar un nombre que las E2E de F10a usan, como un rol o un texto. Si pasa, la prueba no se edita: se informa como cambio de comportamiento de ese ítem.

## Complexity Tracking

Sin violaciones de la constitución.
