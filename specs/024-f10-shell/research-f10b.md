# Research: F10b · La raíz única, el shell y el router

**Spec:** [spec.md](./spec.md) (FR-012 a FR-053 y FR-058, y los compartidos FR-001 a FR-006, FR-059 y FR-060). **Plan:** [plan-f10b.md](./plan-f10b.md). **Validación:** [quickstart-f10b.md](./quickstart-f10b.md). **Contrato:** [contracts/f10b-shell-router.md](./contracts/f10b-shell-router.md). F10a está en [research.md](./research.md).

Las decisiones técnicas de F10b, con sus alternativas, la tabla de Context7 y las mediciones de sólo lectura (2026-10-28). Nada corrió: ni `npm`, ni un build, ni un navegador. El código citado sale de `master` (`431c9d90`), de los worktrees de implementación (`impl-f5` en `efaf39b2`, `impl-f6` en `b20028be`, `impl-f7a` en `fc88d450` e `impl-f11a` en `a7b3c71d`) y de los planes de F3, F6, F7b, F8, F9, F11a y F12a.

## R1 · El inventario es una compuerta, y las props se adaptan sin cambiar el comportamiento

**El problema.** F10b escribe contra código que todavía no existe. En los worktrees, F6 y F7a no llegaron a su corte: `impl-f6` termina en T014, con la página sin montar, e `impl-f7a`, en T012. F3, F7b, F8, F9 y F12a son sólo planes. Esos planes ya chocan entre sí:
- reclaman el mismo lugar de `LEGACY_MODULES`, después de `register-atlas`, que ocupa `register-project-page`;
- traen tres nombres para el ayudante de `boot-check`: `mountedText`, `renderedText` y `drawnText`;
- firman distinto sus adaptadores: `TallerLibrary.mount(host)`, `TallerRoute.mount(host, language, toast)` y `TallerProjectPage.mount(host, language)`.

**Decisión.** T015 levanta el inventario de la base real (FR-048) y lo compara con la tabla del contrato, §1. Cada diferencia queda escrita en «Inventario de la base», con la tarea que la absorbe.

**La regla de adaptación,** para el implementador:
- **Puede cambiar** la unión: el nombre de un import, el nombre o el tipo de una prop y de dónde sale su valor.
- **No puede cambiar** lo que se dibuja, lo que se escribe ni el orden de los efectos, porque eso fijan los E2E de cada port. Si una adaptación lo exige, para y lo informa.

**Alternativa descartada:** escribir F10b contra el código de hoy (`master`). Ese código no tiene ninguna de las páginas que F10b compone.

## R2 · El router propio reproduce `render()` en el mismo orden

**El orden de hoy** (`frontend/app.js:120-150` en `master`; los ports suman sus `unmount` y sus `mount`):
1. desmontar todas las páginas, y con eso `stop()` de la campaña y de Sistemas y `labRunner.abort()` del laboratorio;
2. `TallerCampaign.refresh()`;
3. `syncShell()`;
4. montar la página actual.

En una navegación, después vienen el desplazamiento arriba y el foco en `#main`. El primer dibujo no los mueve.

**Decisión.** `createNavigator` (contrato, §3) dibuja con dos `flushSync`:
1. el primero desmonta la página anterior, con sus efectos;
2. después corren `leavePages()`, `beforeEachPage()` y `enter(route)`;
3. el segundo `flushSync` muestra la página nueva con el shell al día.

`navigate()` copia literalmente la deduplicación de `lastNavigation`, para que `hashchange` y `popstate` no monten dos veces (FR-016).

- **Por qué dos `flushSync`.** Con uno solo, React desmontaría la página anterior *después* de `enter()`, y el orden de los efectos cambiaría: la limpieza del laboratorio correría después de que la campaña se actualizara. Con dos, el orden es el de `render()`. El observador de montajes de F10a ve una sola tanda, porque los dos `flushSync` corren en la misma tarea.
- **Por qué `flushSync` es seguro acá.** Corre en un oyente nativo (`hashchange` y `popstate`), en un manejador de React (el selector de idioma) o en la etapa del shell, nunca dentro de un render ni de un efecto. Context7, `react.dev/reference/react-dom/flushSync`: «React cannot flushSync in the middle of a render», y «flushSync in event handlers is safe».
- **Por qué `leavePages()` corre todos los pasos y no sólo los de la página que se va.** Así lo hacía `render()`, que llamaba a todos los `unmount`. Los E2E de F6 (`stop()` sin condición) y de F7a («leaving the lab cancels the run and saves no result») lo fijan.
- **`previousRoute()`.** Es la ruta mostrada antes de la navegación actual del documento, o `null` si se entró por enlace. La usa «Cerrar» de la administración (FR-043).
- **Alternativas descartadas:**
  - **Remontar con `key` y un solo `flushSync`:** cambia el orden de los efectos.
  - **Un componente `<Router>` con `useEffect` para los oyentes:** registra oyentes en un efecto, así que el primer dibujo no sería sincrónico. Además dejaría `flushSync` dentro de un efecto, donde no funciona.

## R3 · Una sola raíz desde el primer cuadro (F10-Q2)

**Decisión.**
- `main.tsx` importa las hojas en el orden de la base y llama a `startTaller(container)` con `#app-root`.
- `startTaller` (contrato, §4):
  1. activa `enableHistorySync()`;
  2. crea la única raíz;
  3. dibuja `<AppRoot />` con `flushSync`;
  4. recién entonces corre `runBoot(BOOT_STAGES)`.
- `index.html` queda con `<div id="app-root"></div>`, el `noscript` y el script.

**Por qué `flushSync` antes de las etapas:** la etapa de la sesión de F11a llama a `setShellInert(true)` sobre `.app-shell` y `.skip-link`, que ya tienen que existir. Además, la vista de la compuerta enfoca `#main` y `#content-retry`.

**El DOM después de arrancar** es el de hoy, con dos diferencias que se listan (FR-024):
- **el contenedor `#app-root`:** envuelve todo lo que antes colgaba de `<body>`. Ninguna regla de CSS usa `body >` (`grep` en las hojas: 0), y `.app-shell` sigue siendo el padre de la barra lateral fija;
- **el `aria-pressed` de `<body>`:** ya no está (F10-A1).

Hay una tercera diferencia, que la comparación normaliza: `#toast` queda sin atributo `class` donde hoy queda `class=""` después de ocultarse. `classList.remove` deja el atributo vacío; React lo quita.

**Alternativa descartada:** crear la raíz dentro de la etapa del shell. Así el acceso de F11a y la compuerta no tendrían dónde dibujarse.

## R4 · Las vistas de las etapas cambian de implementación, no de interfaz

**Decisión.** `GateView` (`content-gate.ts`) y `SessionView` (`session-gate.ts`, de F11a) conservan su interfaz, y los dos archivos no cambian ni un byte (FR-038). Sus implementaciones nuevas, `createGateView(bootScreens)` y `createSessionView(bootScreens)`:
- escriben en un almacén de Zustand (`app/boot/boot-screens.ts`) con `flushSync`;
- después mueven el foco, como hoy.

La raíz dibuja `ContentGateScreen` dentro de `#main` y `SessionStatus` en `#session-status`, con el mismo DOM que hoy produce `innerHTML`:
- `section.empty-state[data-content-gate]`, con `h2`, `p[role=alert]` y `button#content-retry`;
- `section.empty-state[data-session-gate]`, con `p[role=alert]` y `button#session-retry`.

**Lo que se conserva de cada vista:**

| Comportamiento | Hoy | En F10b |
| --- | --- | --- |
| `showLoading` con el foco en «Reintentar» | lleva el foco a `#main` (o a `#session-status`) | Igual, después del `flushSync` |
| `showFailure` | enfoca «Reintentar» | Igual |
| La espera de un 429 | deshabilita «Reintentar» y lo habilita y lo enfoca después de la espera (F11a, `session-view.ts:57-77`) | `waiting: true` en el almacén y el mismo temporizador |
| El temporizador de la espera, ante un dibujo nuevo | `render()` lo limpia | Igual |

- **Las specs de las vistas se reescriben** (`gate-view.spec.ts` y la de `session-view` de F11a). Pasan a ser specs de componente, con los mismos textos escritos a mano. No son E2E, así que FR-002 no las alcanza.
- **Los 17 E2E de A2 y los de F11a no se editan.**

## R5 · Lo que muestra el shell antes del contenido (F10-Q5)

**Decisión.** Mientras `ready` es falso (la etapa del shell todavía no corrió), la raíz dibuja:
- la marca, el lema, los ocho enlaces sin conteos, el selector de lenguaje sin `aria-pressed`, «Exportar mi progreso», la nota al pie, la barra superior y el pie;
- `#main` con la compuerta.

No dibuja:
- el avance (`.sidebar-progress`);
- el estado del guardado (`.save-status`);
- los conteos;
- el `data-language` de `<body>`.

Todo eso depende del almacén del recorrido o del contenido. Los dos botones del selector y «Exportar mi progreso» no hacen nada antes de `ready`, igual que hoy, cuando `app.js` todavía no registró sus oyentes.

**Por qué sin `aria-pressed`:** el idioma todavía no se conoce, y un `aria-pressed="false"` en los dos botones afirmaría algo falso. Sin el atributo, el lector de pantalla los anuncia como botones comunes hasta que llega el estado.

**Un cambio que la spec implica y no lista en «Lo que cambia a propósito» (hallazgo).** El salto al contenido *durante la carga* (spec, «Edge Cases»): hoy el enlace no tiene oyente hasta `startApp()`, así que la URL pasa a `#main`. En F10b el oyente está desde el primer cuadro: el foco va a `#main` y la URL no cambia. Su E2E falla contra la base, y por eso va en el commit rojo de U5 junto con los otros cambios visibles (plan-f10b.md, T026).

## R6 · El idioma: una función pura y una escritura en memoria

**Decisión.**
- **`linkedLanguage(route, search, catalog)`** (`app/router/linked-language.ts`) porta `syncLinkedLanguage` sin efectos:
  - en `sistemas`, `?lenguaje=` válido;
  - en `campana`, el idioma del mundo de `?mundo=`; si el mundo está en los dos idiomas, gana Go, como el bucle de hoy;
  - en `laboratorio`, el idioma del ejercicio de `?ejercicio=`.
- **El navegador la usa así:** con el resultado, `setLanguageInMemory(language)` hace `routeStore.getProgress().language = language`, sin guardar. Es la rareza que la spec conserva (FR-021).
- **El selector** (`app/shell/language.ts`) repite el orden de `app.js:505-518`:
  1. el mismo idioma no hace nada;
  2. si no, lo fija en memoria;
  3. reescribe la URL con `withLanguageQuery(new URL(location.href), viewFromHash(location.hash), language)`;
  4. guarda;
  5. llama a `redraw()`;
  6. avisa.

**`viewFromHash` y no `routeFromHash`:** en `#administracion`, `withLanguageQuery` recibe `recorrido`, como hoy recibiría la vista por omisión.

**El catálogo** sale de `getContent()` (los mundos) y de `labApi.getExercises()` (los ejercicios), sin `window` (FR-021).

## R7 · Los remontajes, las sesiones y el toast

- **Las sesiones de módulo** (FR-050) pasan de los adaptadores a módulos de `app/routes/`, con la misma vida:
  - las sesiones del Atlas por idioma, a `atlas-sessions.ts`;
  - la sesión de la campaña, a `campaign-session.ts`;
  - la del laboratorio sigue en `app/lab/lab-api.ts`, como dejó F7b;
  - el temporizador sigue en `pages/route`, como dejó F9.

  Sobreviven a la navegación por hash y se pierden al recargar (C8).
- **Remontar:** cada navegación y cada cambio de idioma dibujan de nuevo con `draw()` (FR-030). Importar y «Borrar todo» no remontan, como dejó F8: el shell se actualiza por la revisión de `routeStore.changes`.
- **El toast** es un almacén de módulo (`app/shell/toast.ts`) con un solo temporizador, que se reinicia en cada aviso (FR-028).
  - Las páginas reciben `notify` como prop, igual que antes recibían `toast`, sin pasar por intermedios: cada entrada de `page-entries.tsx` la importa.
  - `notify` sigue funcionando con la página desmontada, y por eso el fin del temporizador de F9 llega a `#toast` (plan de F9, F9P:2329-2387).
- **Alternativa descartada:** montar cada página una vez y dejar que reaccione al idioma. Lo descarta la spec, «Alternativas consideradas».

## R8 · Un solo `NuqsAdapter`, con `enableHistorySync()` una vez

**Decisión.**
- `app/legacy/url-state.tsx` (F5, que F3 reusa) pasa a `app/root/url-state.tsx` sin cambiar: `UrlStateProvider` con `history: 'replace'` y `startUrlStateSync()`.
- `AppRoot` envuelve todo en un solo `UrlStateProvider` (FR-020).
- `startTaller` llama una vez a `startUrlStateSync()`, antes de crear la raíz. Nunca se llama al evaluar un módulo (FR-040).
- Los adaptadores dejan de llamarlo en cada `mount`.

**Por qué el adaptador de SPA y no el de un router:** en modo hash, el adaptador de un router leería la query de adentro del hash (spec, FR-020). Context7, `/websites/nuqs_dev`: «Wrap the root component with NuqsAdapter from 'nuqs/adapters/react' to enable query state management in a React SPA».

**La escritura diferida (D1-bis)** no cambia con F10b. Las E2E nuevas que recargan después de un cambio con nuqs esperan la URL.

## R9 · Los globals de catálogos salen, y `qa/` lee el contenido de un solo paquete (F10-Q3)

**Decisión.**
- **En `qa/lib/app-modules.ts`** (contrato, §9), `loadAppModules(context)` evalúa un solo paquete, con una entrada virtual que reexporta:
  - `getContent`;
  - los dos motores;
  - `labApi`, el kit de proyecto y los modelos de Sistemas.

  Con la entrada virtual, todos los singletons son una misma instancia, como hoy los compartía `window`.
- **Usa la función de entrada virtual que tenga la base:** `runEntry` (plan de F8, F8P:2741-2823) o `runModuleEntry` (plan de F3, F3P:1124-1140). Si están las dos, la de F8.
- **Los checks que hoy usan `legacy-sources.ts`** pasan a `loadAppModules` con la sustitución mecánica del contrato, §9, sin cambiar un valor esperado:
  - `content-check`, `campaign-check`, `campaign-content-check`, `lab-state-check`, `project-kit-check`, `curriculum-ids-check`, `guide-content-check`, `runtime-check`, `systems-check` y `systems-<d>-check`;
  - además, `qa/lib/import-cases.ts`.

  `lab-bridge-check` ya lo retiró F7b. T015 confirma la lista con un `grep`.
- **Salen** `tools/content/dump-globals.ts` y la prueba de globals de `qa/dist-content-check.ts`. La equivalencia del contenido la siguen probando `build-check` y el resto de `dist-content-check`.

**Por qué antes del corte.** T025 cambia los checks mientras los globals todavía existen: la sustitución se verifica sola, con el mismo conteo de escenarios. Recién el corte, T028, borra los globals.

**Alternativa descartada:** un paquete por módulo. Daría dos instancias de `labStore` en un mismo check: una en el paquete del laboratorio y otra en el de los motores.

## R10 · R4 apunta a la raíz (FR-053)

**Decisión.** `INDEX_OWNERS` pasa a nombrar los cuatro módulos de `app/` que pueden importar valores de un índice de entidad (contrato, §8):
- `app/shell/shell-state.ts` (el recorrido);
- `app/lab/lab-api.ts` (los ejercicios y los dos motores);
- `app/routes/page-engines.ts` (los dos motores);
- `app/progress-backup/app-progress-backup.ts` (el recorrido y los dos motores, como dejó F8).

El resto de `app/` les pide a ellos.

- **Lo que se conserva:** que un módulo de `app/` no abra singletons por su cuenta, y que haya pocas puertas a los almacenes, las mismas que abre la etapa del shell.
- **El cambio de R4 va en el corte,** con sus fixtures en `seams-guard-check`:
  - el escenario «the four store owners, the legacy owners…» pasa a citar los dueños nuevos;
  - los de `app.js` y `lab.js` pasan a `shell-state.ts` y a `lab-api.ts`.
- **Alternativa descartada:** borrar R4. Dejaría cualquier componente de `app/` abriendo motores, y la spec pide conservar el invariante (FR-053).

## R11 · La administración como ruta (F10-Q4)

**Decisión.**
- **La ruta:** `routeFromHash('#administracion')` da `administracion`, y `resolveRoute` la deja pasar sólo si F12a está en la base y `isAdmin(sessionStore.getState().user)`. Si no, da `recorrido`, como un hash desconocido (FR-042).
- **El menú:** en la ruta de la administración, ningún enlace lleva `aria-current` (FR-029).
- **La entrada:** `AccountDialog` cambia el botón «Administrar el taller» por un enlace a `#administracion`, que antes de navegar cierra el diálogo con su `onClose`.
- **Lo que sale:** el panel `administration` de `AccountMenu`, `AdminDialog` y la regla `.admin-dialog` (plan de F12a, F12aP:4814 y 4819-4827).
- **«Cerrar»** lleva el hash a `previousRoute()` o a `recorrido` (FR-043).
- **`pages/admin` no cambia.**

**Las E2E de F12a que se reescriben,** en su propio commit rojo (FR-043). El plan de F12a nombra sólo dos, pero el inventario de su plan encuentra cinco que dependen del diálogo (F12aP:4967-5109 y 5642-5791):
1. «opens the administration on «Cuentas» without changing the URL or the history»;
2. «closes with Esc, gives the focus back to «Tu cuenta» and leaves nothing behind»;
3. «closes with «Cerrar» too»;
4. «disables an account with the keyboard only», que llega con el teclado hasta «Administrar el taller»;
5. «keeps no name, email or link…», que comprueba `history.length`.

Con una ruta por hash, abrir suma una entrada al historial, y Esc ya no cierra nada, porque no hay diálogo. T029 las reescribe con el método nuevo de `AdminPage.open()` y suma los escenarios de enlace y de recarga. Las de «admin-accounts» y «admin-invitations» abren sólo por `admin.open()`, así que no se editan.

**Un hallazgo para el coordinador:** la reescritura alcanza a cinco escenarios, no a los dos que nombra el plan de F12a. FR-043 lo autoriza («los E2E que abren y cierran el diálogo»), pero el PR tiene que listarlos.

## R12 · `#quiz-feedback` montada (X2)

**Decisión.**
- `LessonDialog` (`pages/route/ui/LessonDialog.tsx`, de F9) dibuja `#quiz-feedback` siempre que la lección está abierta: sin `hidden`, con `role="status"` y `aria-live="polite"`, y con el texto sólo si hay respuesta.
- Al final de `pages/route/ui/route.css` entra una regla `:empty`:

  ```css
  .quiz-feedback:empty {
    padding: 0;
    border-left: 0;
    margin: 0 !important;
  }
  ```

**Por qué `!important` en `margin`:** la regla de hoy (`frontend/styles.css:1146-1152`, que F9 muda a `route.css`) declara `margin: 12px 0 0 !important`, y sólo otra declaración `!important` la pisa. El relleno y el borde no la necesitan, porque `:empty` sube la especificidad.

**Descartado:** `display: none` y `visibility: hidden`, que sacan la región del árbol de accesibilidad (spec, «Alternativas»).

## R13 · La compuerta del `dist` y la complejidad

- **El tamaño:** `chars` queda bajo `BOOT_SIZE_LIMIT` (1 500 000). El PR informa el antes, el después y el aumento del router aparte; con el router propio, el aumento es el de sus módulos (FR-004).
- **`import.meta`** (TR-4): el conteo esperado es el de T015 menos un `import.meta` por cada sitio `import(` de `legacy-views.ts` en la base, incluidos los de `run()`: el `import('../../../app.js')` de `startApp` y, con F8, el `import('../progress-backup/app-progress-backup')`. `dynamicImports` sigue en 0.
  - Si Vite deja de incluir su ayudante de precarga cuando no queda ningún `import()`, el conteo puede bajar más. T033 lo mide y lo anota.
  - Lo que nunca puede pasar es que el conteo suba.
- **La complejidad** (FR-005): el total de `npm run lint` no sube, y no queda ningún aviso en `app.js`, que se borra. Ninguna función nueva pasa de 10: el navegador, el shell y las entradas son funciones chicas con nombre.
- **El DOM del shell** (FR-024): una comparación única entre la base y F10b. Para cada estado de la grilla, captura el `outerHTML` de todo lo que está fuera de `#main` y lo normaliza:
  - se quita `#app-root`;
  - un `class=""` cuenta como un atributo ausente;
  - los atributos van en orden alfabético.

  La grilla son las nueve rutas, los dos idiomas, con y sin avance, con el almacenamiento bloqueado y con y sin sesión de admin (quickstart-f10b.md, §4).
- **El aspecto** (SC-005): el barrido de estilo computado de la unidad 8 de F2b, ampliado al shell, da 0 diferencias en F10b. F10b no mueve CSS; eso es F10c.

## R14 · Lo que F10b no hace

- **No mueve las reglas del shell de `styles.css`** (F10c). La única regla nueva es la de `:empty` en `route.css` (FR-045), y la única que sale es `.admin-dialog` (FR-043).
- **No toca `allowJs`** (spec, «Queda fuera»): es un hallazgo para después de F10.
- **No cambia `withLanguageQuery`** ni los filtros de F3.
- **No instala nada** si ganó el router propio.

## Context7 y otras consultas (2026-10-28)

La segunda instancia de Context7 (`mcp__44441c24-…`), porque la primera agotó su cuota.

| Librería | Versión (lockfile) | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| React (`/websites/react_dev_reference`) | 19.2.8 | `flushSync`: cuándo es seguro | Fuerza el dibujo sincrónico. No funciona dentro de un render ni de un efecto, y es seguro en manejadores de eventos y fuera de React | Sí: R2 y R4 lo llaman sólo en oyentes, manejadores y etapas |
| React (`/react/react/v19.2.8`) | 19.2.8 | `createRoot`, `flushSync` y `createPortal` | Remite a react.dev; la consulta anterior trajo el detalle | No |
| Zustand (`/pmndrs/zustand/v5.0.12`) | 5.0.15 | `useStore(store, selector)` con un almacén `createStore` de `zustand/vanilla` | El selector extrae una parte del estado, y el componente se actualiza sólo con ella | Sí: cada `useStore` de F10b lleva un selector chico, y la guarda de TR-5 lo exige |
| nuqs (`/websites/nuqs_dev` y `/llmstxt/nuqs_dev_llms-full_txt`) | 2.10.2 | `NuqsAdapter` de `nuqs/adapters/react` en una SPA; `defaultOptions`; el throttle | Se envuelve la raíz; `defaultOptions` existe desde 2.5.0; el throttle no baja de 50 ms | Sí: R8, un solo adaptador en la raíz |
| Vitest (`/vitest-dev/vitest/v5.0.3`) | 5.0.3 | `vi.useFakeTimers`, `vi.advanceTimersByTime` y `vi.useRealTimers` | Avanza los temporizadores falsos, y `useRealTimers` descarta los pendientes | Sí: la spec del toast (T019) |
| Testing Library (`/testing-library/testing-library-docs`) | `@testing-library/react` 16.3.3 | `render`, `fireEvent` y `getByRole` con `name`, `pressed` y `current` | `render` y `fireEvent` van envueltos en `act`. `getByRole` filtra por `pressed` y `current`, pero no ve `aria-live`, que se comprueba aparte | Sí: las specs del shell usan `getByRole(..., { pressed })` y comprueban `aria-live` con `toHaveAttribute` |
| jsdom (`/jsdom/jsdom`) | 30.1.2 | `hashchange`, `popstate` y la navegación | Cambiar el hash dispara `hashchange`, y `back` dispara `popstate`, pero la navegación entre documentos no está implementada | Sí: la spec del navegador inyecta un entorno falso (`NavigatorEnvironment`) en lugar de navegar con jsdom |
| Playwright (`/microsoft/playwright/v1.63.0`) | 1.63.0 | `addInitScript` y `clock` | Ver research.md | No en F10b |

Las de React Router y TanStack Router están en research.md. Sólo hacen falta si ganó una librería (plan-f10b.md, «Si gana una librería»).

## Mediciones de sólo lectura (2026-10-28)

- **Los conteos del menú, en `build/curriculum.json`:**
  - `campaign`: 4 por idioma;
  - `workshops`: 8 + 8 + 8 + 1 = 25;
  - `lab`: 100 por idioma; `quests`: 12 por idioma; `cores`: 16 + 16 + 16 + 2 = 50, que suman 274 ejercicios;
  - `guide.resources`: 15;
  - los pasos del recorrido: 12 por idioma.

  Coinciden con FR-032.
- **El orden de los paquetes de Sistemas** en el adaptador de F5: `pc`, `lowlevel`, `infra` y `play` (`impl-f5`, `register-systems.tsx`, `packages()`). Los modelos: `pcModel`, `lowlevelModels`, `infraModels` y `playModels` (`entities/systems-simulation/index.ts:25-31`).
- **Los textos de los avisos de carga:** los de `describeLoadResult`, con las áreas «del recorrido», «de campaña», «de Sistemas» y «del laboratorio». El almacenamiento no disponible tiene su propio texto (`route-store.ts:44-48`).
- **`quiz-feedback`:** `frontend/styles.css:1146-1156`, con `margin` y `font-size` `!important`.
- **Las reglas que dependen de los hijos de `<body>`:** ninguna (`grep "body >"` en las hojas: 0).

## Inventario de la base

T015 completa esta sección con estas tablas:

| `window.*` | Archivo y línea | Métodos | Lectores (archivo y línea) | Diferencia con el contrato, §1 | Tarea que la absorbe |
| --- | --- | --- | --- | --- | --- |

| Entrada de `LEGACY_MODULES` | Orden |
| --- | --- |

| Marcado estático de `frontend/src/index.html` | Línea | Qué pasa en F10b |
| --- | --- | --- |

| Adaptador | Firma de `mount` | Props que pasa a la página | Lo que corre antes y después |
| --- | --- | --- | --- |

Debajo van:
- los valores de quickstart-f10b.md, §1;
- la forma de `boot-check` de la base;
- la función de entrada virtual de `qa/lib/sources.ts`;
- si F12a está en la base (FR-044);
- el router que eligió el spike.
