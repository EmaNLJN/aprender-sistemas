# Implementation Plan: F10b · La raíz única, el shell y el router

**Branch**: `024-f10-shell` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F10, en su parte b: FR-012 a FR-053 y FR-058, y los compartidos FR-001 a FR-006, FR-059 y FR-060.
- Decisiones y mediciones: [research-f10b.md](./research-f10b.md).
- Validación: [quickstart-f10b.md](./quickstart-f10b.md).
- Tareas: [tasks-f10b.md](./tasks-f10b.md).
- Interfaces: [contracts/f10b-shell-router.md](./contracts/f10b-shell-router.md).
- F10a, que va antes: [plan.md](./plan.md). F10c, que va después, tiene su propio plan.

**Objetivo:** que todo el taller sea una sola raíz de React, que dibuja el acceso, la compuerta, el shell y la página actual con un router propio sobre `url-grammar`, y retirar `app.js`, los adaptadores `window.Taller*`, los `register-*`, los globals de catálogos y los tres checks que existían para ellos, sin que el alumno lo note.

**Arquitectura:**
- `main.tsx` crea la única raíz y la dibuja antes de las etapas. Las etapas conservan su lógica: la compuerta y la sesión escriben en un almacén que la raíz dibuja con el DOM de hoy. Una etapa nueva, la del shell, abre los almacenes en el orden de `startApp()` y arranca el router.
- El router (`createNavigator`) repite el ciclo de `render()`: desmontar, actualizar la campaña, entrar a la página nueva y dibujarla con `flushSync`, y después mover el foco. Cada página se compone en `app/routes/`, con las props que hoy arma su adaptador, y sin `window`.

**Stack:** React 19.2.8 (`createRoot`, `flushSync`), Zustand 5.0.15 (`zustand/vanilla` y `useStore` con selector), nuqs 2.10.2 (un `NuqsAdapter` de `nuqs/adapters/react`), Vite 8.3.2 con `vite-plugin-singlefile`, Vitest 5.0.3 (proyectos `node` y `dom`, con jsdom y Testing Library) y Playwright 1.63.0. Ninguna dependencia nueva si ganó el router propio.

> **Para quien lo implementa.**
>
> - **Qué leer:** las «Restricciones globales», «La regla de adaptación», la sección 0 y la sección de tu tarea. `tasks-f10b.md` tiene una línea por tarea (T015 a T035).
> - **Cuándo empieza:** después de F10a, con su PR integrado, y con el resultado del spike en `research.md`. Si el spike eligió una librería, también hace falta el permiso del usuario para instalarla (spec, «Acciones del usuario»), y vale la sección «Si gana una librería».
> - **Contra qué está escrito:** contra el router propio (FR-010, la opción por omisión) y contra los contratos de los ports, citados con su plan y su línea. El código de los ports todavía no existía al planificar (research-f10b.md, R1).
> - **Delegable:** U1 a U4, U6 y U7 son slices para el subagente `implementador`, con sus archivos, sus interfaces y sus checks. U0, el corte de U5 y U8 los hace el agente principal, porque tocan `main.tsx`, `package.json`, las configuraciones y la documentación (`AGENTS.md`, «Trabajo con subagentes»).

## Summary

F10b es el último port del tronco. Junta en una sola raíz lo que hoy hacen `app.js`, once adaptadores, cinco `register-*` de catálogos y la raíz de la cuenta de F11a. El enfoque:

1. **Inventario primero** (U0, FR-048). La base real se compara con la tabla del contrato, §1. Cada diferencia de props se absorbe con la regla de adaptación, nunca cambiando el comportamiento.
2. **Las piezas puras, sin montar** (U1): la ruta de la administración en `url-grammar`, `linkedLanguage`, los conteos del menú, el resumen del recorrido, el toast y el router. Cada una abre con su spec roja.
3. **Las vistas del arranque como componentes** (U2), detrás de `GateView` y `SessionView`, que no cambian. `content-gate.ts` y `session-gate.ts` quedan intactos.
4. **El shell en React** (U3): la barra lateral, el menú, el selector y el salto al contenido, con el DOM de hoy y specs de componente.
5. **La composición sin `window`** (U4):
   - las entradas de las páginas;
   - los motores y el laboratorio importados por sus dueños de R4;
   - el armado de `progress-backup` sin `window`;
   - los checks de `qa/` leyendo el contenido de un solo paquete, mientras los globals todavía existen.
6. **El corte** (U5), en un commit, después de sus pruebas rojas: la raíz única, `index.html` sin el shell, y el retiro de `app.js`, `legacyViews`, los `register-*`, los globals, la raíz de la cuenta, los tres checks y sus arneses, más `seams-guard` apuntando a la raíz.
7. **Lo que cambia a propósito,** cada cosa en su commit con TDD: la administración como ruta (U6, si F12a está en la base) y `#quiz-feedback` montada (U7). El `aria-pressed` de `<body>`, los conteos con el contenido y el salto durante la carga van con el corte, cada uno con su prueba roja antes.
8. **El cierre** (U8): la comparación del DOM del shell, el barrido de estilo computado, el tamaño, `import.meta`, la complejidad, la documentación y el PR.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`. Al terminar, no queda JavaScript legacy en `frontend/`: `allowJs` queda sin uso, y es un hallazgo para el coordinador. Node 24.21.0.

**Primary Dependencies**: las del lockfile. React 19.2.8, Zustand 5.0.15, nuqs 2.10.2 (lo instaló F3 o F5), `@testing-library/react` 16.3.3, jsdom 30.1.2 y `@playwright/test` 1.63.0.

**Storage**: las cuatro claves de `localStorage` y sus ranuras, sin cambios de formato (ADR 0003). F10b abre los almacenes en el mismo orden y no agrega ninguna lectura ni escritura.

**Testing**:
- **Vitest:** `node` para la lógica (`*.spec.ts`) y `dom` para los componentes y lo que lee `window` al evaluarse (`*.spec.tsx`).
- **Playwright:** contra el `dist`. La red de F1, A2, F3 a F9, F11a, F12a y F10a, sin editar, salvo las filas de «Lo que cambia a propósito».
- **Comparaciones únicas** del DOM y del estilo.

Los valores esperados salen de la spec, de `frontend/src/index.html` de la base y de los contratos de cada port.

**Target Platform**: navegador moderno y Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web. Es un port: no cambia nada visible fuera de lo listado.

**Performance Goals**: ninguno. Se informa el tamaño del `dist` antes y después.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**:
- **Archivos nuevos en `frontend/src/app/`:** unos 30, en `router/`, `shell/`, `root/`, `routes/` y `boot/`.
- **Archivos que se borran:** `app.js`, `legacy-views.ts`, todo `app/legacy/` (unos 18 `register-*` y adaptadores, más los que trae el inventario), `app/account/AccountRoot.tsx`, `mount-account-root.tsx` y `AdminDialog.tsx`, más tres checks y cinco arneses de `qa/`.
- **Specs nuevas de Vitest:** unas 15.
- **E2E nuevas:** 3 archivos. Se edita 1 escenario de F1 y se reescriben 5 de F12a.

## Restricciones globales

- **El tope:** `dist/index.html` bajo `BOOT_SIZE_LIMIT`, 1 500 000 caracteres (`qa/build-check.ts`; spec, enmienda del 2026-10-28; FR-004 y SC-008). Con un script y un estilo en línea, y el contenido en su archivo.
- **`import.meta`** (TR-4): `importMeta` del `dist` no sube nunca. Lo esperado es el valor de T015 menos un `import.meta` por cada sitio `import(` de `legacy-views.ts` en la base, incluidos los de `run()` (research-f10b.md, R13). `dynamicImports` sigue en 0.
- **La red sin editar** (FR-002): pasan todos los E2E de la base, incluidos los 5 archivos de F10a. Se editan sólo estos:
  - `views.spec.ts`, «KNOWN DEFECT (new, found by F1): <body> carries aria-pressed…» (F10-A1, FR-046);
  - los 5 escenarios de F12a que dependen del diálogo (research-f10b.md, R11; FR-043).

  Cada edición va en su propio commit rojo.
- **La escritura diferida de nuqs** (D1-bis): una E2E nueva que recarga después de un cambio con nuqs espera la URL.
- **Ningún estilo en línea nuevo** (FR-003): ningún `style=`, `setAttribute('style', …)` ni `style.cssText`. La propiedad `style` de React del SVG de Sistemas (F5-Q2) ya existía y no se toca.
- **Ningún global:** al terminar, `grep -rn "window\.Taller\|register-\|legacyViews\|startApp" frontend/` da 0, `frontend/app.js` no existe y `createRoot(` aparece una vez en `frontend/src` (SC-003).
- **Evaluar no arranca nada** (F2-I1, FR-040): ningún módulo de `frontend/src`, salvo `main.tsx`, abre almacenes, lee el almacenamiento, registra oyentes ni crea temporizadores al evaluarse.
- **`useStore` siempre con selector:** la guarda canónica de `eslint.config.ts` (TR-5) lo exige, y cada selector devuelve un primitivo o una referencia estable.
- **`boot-check` se retira** con su forma canónica (`REACT_VIEWS` y el `mountedText` de F4). F10b no lo edita antes de borrarlo.
- **El doble de la API** es el de F11a (ruta antes del CSRF, `ApiCall.search`). Las listas blancas de error:
  - un error HTTP, con `/status of NNN/`;
  - un pedido abortado con `route.abort()`, con `/net::ERR_FAILED/` (`qa/e2e/specs/cycle.spec.ts:71`).
- **Los stubs del rojo** van como `const` tipados que lanzan `not implemented`. Los componentes stub son `FunctionComponent<Props>` sin parámetros sin usar (TR-2).
- **Los nombres del stack de pruebas** son los de `master`: el proyecto `dom` y el setup `frontend/src/vitest.setup.ts` (TR-6).
- **Estilo:**
  - código y nombres de test en inglés, sin comentarios. Un comentario existente que se mueve con su código se conserva;
  - los textos del alumno, exactos y en español;
  - `interface` para formas de objetos;
  - componentes como `const` con nombre y `export default` al final;
  - exports nombrados en los demás módulos.
- **Commits:** en español, con prefijo Angular (`test(front): …`, `test(e2e): …`, `feat(front): …`, `refactor(front): …`, `test(qa): …`, `refactor(qa): …` y `docs: …`) y el trailer `Co-Authored-By` del modelo, sin `git push`. Cada spec roja va en un commit aparte de su implementación.

## La regla de adaptación

F10b compone código que llega con F3 a F9, F11a y F12a. Las firmas de este plan salen de sus planes, con su cita. Cuando el inventario (T015) encuentra otra cosa en la base:

1. **Se puede cambiar** la unión: un nombre importado, el nombre o el tipo de una prop, un ayudante de la página (por ejemplo, `downloadJsonFile` en lugar de `downloadBlob`) y de dónde sale un valor, siempre que sea sin `window`.
2. **No se puede cambiar** lo que se dibuja, lo que se escribe ni el orden de los efectos que hoy tiene el adaptador. Si la adaptación lo exige, se para y se informa.
3. **Cada adaptación** queda en research-f10b.md, «Inventario de la base», con la tarea y el archivo.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md). Resultado antes y después del diseño: pasa.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, Feature-Sliced Design (todo lo nuevo en `app/`, la única capa que compone páginas), Zustand con selectores chicos, nuqs con un solo adaptador, ningún servidor ni dependencia nueva. `AGENTS.md` cambia en el mismo PR (FR-060). |
| II. TDD y pruebas útiles | Sí | Cada módulo abre con su spec roja contra un stub. Cada cambio visible abre con su E2E roja. Las E2E de F10a, en verde antes, son la red del corte. Los valores esperados salen de la spec, de `index.html` de la base y de fixtures escritas a mano. |
| III. Código entendible | Sí | El router es una función de unas 50 líneas con el ciclo de `render()` explícito. Las entradas de las páginas son una tabla, y ninguna función nueva pasa de 10 de complejidad. |
| IV. Contenido en Git, IDs estables | Sí | Los conteos salen del contenido. Los IDs, las claves, las URL y los textos no cambian. |
| V. Capas y contratos explícitos | Sí | El contrato, §1 a §9; R4 nombra los cuatro módulos de `app/` que abren singletons (§8). |
| VI. Español, accesibilidad y portabilidad | Sí | Se conservan los roles, `aria-*`, el foco, el salto al contenido y la región del toast. `#quiz-feedback` queda montada (X2), y la comprobación con lector de pantalla es del usuario. |
| VII. Secretos y salidas generadas fuera de Git | Sí | Las comparaciones únicas corren fuera del repositorio. No entra ninguna salida generada. |
| VIII. Flow-forward | Sí | `tasks-f10b.md` tiene una línea por tarea. |

## Decisiones del usuario que aplica este plan

| Decisión | Cómo la aplica | Dónde |
| --- | --- | --- |
| **F10-Q1:** ninguno por omisión | El router propio sobre `url-grammar`; el delta de una librería en «Si gana una librería» | §1.5 y el final |
| **F10-Q2:** una sola raíz desde el primer cuadro | `startTaller` crea la raíz y la dibuja antes de las etapas; las vistas de las etapas, detrás de sus interfaces | §2, §5.3 |
| **F10-Q3:** los globals de catálogos salen | `getContent()` en `app/`; `qa/lib/app-modules.ts` en `qa/`; sale `dump-globals` | §4.3, §5.3 |
| **F10-Q4:** `#administracion` | `routeFromHash`, `resolveRoute` con `isAdmin` y el enlace en «Tu cuenta» | §1.1, §6 |
| **F10-Q5:** lo fijo antes del contenido | `ready` en el estado del router; sin conteos, idioma ni avance antes | §3 |
| **F10-A1:** `<body>` sin `aria-pressed` | Su E2E roja y el shell que no lo pone | §5.1 |
| **X2:** `#quiz-feedback` montada | `LessonDialog` sin `hidden` y la regla `:empty` | §7 |
| **F12-Q1:** la administración pasa a ruta | U6, con sus E2E reescritas | §6 |
| **El tope de 1 500 000 y D1-bis** (noche del 2026-10-28) | Las restricciones globales | — |
| **Los adaptadores de página con la forma `Taller<Página>Page`** (coordinador) | El inventario los nombra así: `TallerProjectPage` y `TallerMethodPage` | §0 |

## Project Structure

### Documentation (this feature)

```text
specs/024-f10-shell/
├── plan-f10b.md, research-f10b.md, quickstart-f10b.md, tasks-f10b.md   # F10b
├── contracts/f10b-shell-router.md                                     # F10b: interfaces
├── plan.md, research.md, quickstart.md, tasks.md                       # F10a
└── contracts/f10a-check-correspondence.md                              # F10a: la tabla que F10b copia en su PR
```

### Source Code (repository root)

```text
frontend/src/
├── index.html                            (U5)  queda con #app-root, el noscript y el script
├── shared/config/url-grammar.ts + spec   (U1)  ADMIN_VIEW, Route, ADMIN_HREF y routeFromHash
└── app/
    ├── main.tsx                          (U5)  las hojas en el orden de la base y startTaller
    ├── main-entry.spec.ts                (U5)  styles.css primero, las hojas en el orden de la base
    ├── boot/
    │   ├── start-taller.tsx              (U5)  la única raíz: enableHistorySync, createRoot, flushSync y runBoot
    │   ├── boot-stages.ts + .spec.tsx    (U5)  BOOT_STAGES y la instancia de shellStage
    │   ├── shell-stage.ts + .spec.ts     (U5)  createShellStage
    │   ├── boot-modules.spec.tsx         (U5)  evaluar no arranca nada (FR-040)
    │   ├── boot-screens.ts               (U2)  el almacén, createGateView y createSessionView
    │   ├── ContentGateScreen.tsx         (U2)  la carga y el error de la compuerta, con el DOM de hoy
    │   ├── SessionStatus.tsx             (U2)  la conexión y el error de la sesión, con el DOM de hoy
    │   ├── boot-screens.spec.tsx         (U2)
    │   ├── content-stage.ts              (U5)  la vista nueva
    │   ├── account-stages.ts             (U5)  la vista nueva; requestSignIn sin montar otra raíz
    │   ├── session-view.ts               (U5)  queda sólo con sus tipos (session-gate.ts los importa)
    │   ├── gate-view.ts + spec           (U5)  se borran
    │   └── legacy-views.ts               (U5)  se borra
    ├── router/
    │   ├── navigator.ts + spec           (U1)  createNavigator: el ciclo de render() y los oyentes
    │   ├── linked-language.ts + spec     (U1)  syncLinkedLanguage, sin efectos
    │   └── app-navigator.ts              (U5)  la instancia, con el entorno del navegador
    ├── shell/
    │   ├── toast.ts + spec, ToastRegion.tsx       (U1, U3)
    │   ├── menu-counts.ts + spec                  (U1)
    │   ├── route-summary.ts + spec                (U1)
    │   ├── shell-state.ts                         (U3)  dueño de R4 del recorrido
    │   ├── Sidebar.tsx, NavigationMenu.tsx, RouteProgress.tsx, LanguageSwitch.tsx, SkipLink.tsx + specs (U3)
    │   ├── Shell.tsx                              (U5)  el contenedor conectado
    │   ├── language.ts, export-progress.ts        (U5)
    ├── root/
    │   ├── AppRoot.tsx                   (U5)  la raíz: Shell, #account-root y #toast
    │   └── url-state.tsx + spec          (U5)  movido de app/legacy, sin cambios
    ├── routes/
    │   ├── page-entries.tsx              (U4)  enterPage, leavePages y resolveRoute
    │   ├── page-engines.ts               (U4)  dueño de R4 de los motores
    │   ├── atlas-sessions.ts, campaign-session.ts, campaign-missions.ts, project-kit.ts (U4)
    ├── lab/lab-api.ts                    (U4)  movido de app/legacy, sin window
    ├── progress-backup/                  (U4)  el armado de F8, sin window
    ├── account/                          (U5, U6) se van AccountRoot.tsx, mount-account-root.tsx y AdminDialog.tsx
    └── legacy/                           (U5)  se borra entero
frontend/app.js                           (U5)  se borra
qa/
├── lib/app-modules.ts                    (U4)  un paquete con el contenido, los motores, el laboratorio y el kit
├── <los checks de legacy-sources>        (U4)  leen app-modules
├── dist-content-check.ts                 (U5)  sin evaluar el dist (research-f10b.md, R9)
├── lib/seams-guard.ts, seams-guard-check.ts (U5) R4 apunta a la raíz
├── boot-check.ts, load-order-check.ts, app-shell-check.ts y qa/lib/{app-adapters,boot-harness,app-shell-harness,fake-dom,legacy-sources}.ts (U5) se borran
├── run-checks.ts                         (U5)  sin los tres checks
└── e2e/
    ├── specs/views.spec.ts               (U5)  el escenario de aria-pressed (F10-A1)
    ├── specs/shell-changes.spec.ts       (U5)  los conteos con el contenido y el salto durante la carga
    ├── specs/admin-route.spec.ts y los 5 escenarios de F12a (U6)
    ├── pages/admin.ts                    (U6)  AdminPage.open() por el enlace
    └── specs/route-lesson-feedback.spec.ts (U7)
tools/content/dump-globals.ts             (U5)  se borra
```

**Structure Decision:** todo lo que compone va en `app/`, la única capa que puede componer páginas (`docs/architecture.md`). Se separan cinco carpetas por responsabilidad: `router/` (qué página), `shell/` (lo que la rodea), `root/` (la raíz y sus proveedores), `routes/` (cómo se arma cada página) y `boot/` (el arranque). No se crea ninguna capa ni slice nuevo: el shell no es una entidad ni una feature, sino la composición de la aplicación.

## Review Focus

Lo que el revisor mira primero:

- **El orden del ciclo:** desmontar (`flushSync`), `leavePages` (`labRunner.abort()` y `stop()`), `refreshCampaign()`, `enter()`, dibujar (`flushSync`) y, sólo en una navegación, el desplazamiento y el foco. Es el de `render()` (research-f10b.md, R2).
- **La deduplicación literal:** `if (lastNavigation === location.href) return;`, que se anota después de dibujar, como hoy.
- **El toast vive fuera de las páginas.** `notify` sigue funcionando con la página desmontada, para el aviso del temporizador de F9.
- **Una raíz y un dueño por contenedor:**
  - `createRoot(` aparece una vez;
  - nadie escribe `#main` ni `#session-status` con `innerHTML`;
  - las vistas de las etapas escriben en el almacén;
  - `content-gate.ts` y `session-gate.ts` no tienen diff.
- **`enableHistorySync()`** se llama una vez, en `startTaller`, nunca al evaluar un módulo.
- **R4:** sólo `shell-state.ts`, `lab-api.ts`, `page-engines.ts` y `app-progress-backup.ts` importan valores de los índices de entidades.
- **Lo que no cambia:** la red de F1, A2, F3 a F9, F11a, F12a y F10a. La única E2E de F1 editada es la de `aria-pressed`, y las de F12a reescritas son las 5 listadas.

**Lo que la spec implica y ninguna prueba de una tarea ejercita**, cada caso con la prueba que lo fija y su tarea:

1. **El rol que se pierde con la administración abierta** (spec, «Edge Cases»): al recargar, `#administracion` muestra el Recorrido. Lo fija «a student at #administracion sees the route, keeps the address and asks nothing of /api/admin», que arranca con la sesión de alumno en esa URL (T029).
2. **Una navegación con la lección de F9 abierta** (spec, «Edge Cases»): la lección se cierra con la página. Hoy nadie lo prueba a nivel del shell. Lo fija «a hash navigation closes the open lesson» en `shell-changes.spec.ts` (T026). Pasa contra la base, y por eso no va en el commit rojo: entra en T026 como prueba de caracterización, en su propio commit, antes de las rojas.
3. **`hashchange` sin `popstate`** (un navegador que dispare sólo uno): el router tiene que dibujar igual. Lo fija la spec del navegador, «a lone hashchange draws the page» (T020).
4. **Un `notify` que llega antes de `ready`**, por ejemplo un aviso de una etapa: la región existe desde el primer cuadro (FR-028). Lo fija «the toast region exists before the content arrives» en `shell-changes.spec.ts` (T026), con el pedido del contenido retenido.
5. **Una página que lanza al dibujarse**: hoy la atrapa el `onUncaughtError` de cada raíz, que registra «No se pudo mostrar…» con el nombre de la página. Con una sola raíz, `startTaller` registra «No se pudo mostrar el taller.» en la consola, y el alumno no ve ninguna diferencia. Lo fija «startTaller reports an uncaught render error on the console» en `start-taller.spec.tsx` (T027).

## Unidades y orden

| Unidad | Tareas | Quién | Compuerta |
| --- | --- | --- | --- |
| U0 · El inventario | T015 | Agente principal | La tabla del contrato, §1, reconciliada; la base en verde |
| U1 · Las piezas puras | T016 a T020 | `implementador`, en paralelo | Cada spec en verde; la red sin cambios (nada está montado) |
| U2 · Las vistas del arranque | T021 | `implementador` | Las specs de componente en verde |
| U3 · El shell en React | T022 | `implementador` | Las specs de componente en verde |
| U4 · La composición sin `window` | T023 a T025 | `implementador` | `npm test` en verde, con los checks leyendo `app-modules` |
| U5 · El corte | T026 a T028 | Agente principal | La red entera en verde, salvo nada; SC-003 |
| U6 · La administración como ruta | T029 y T030 | `implementador` | Las E2E de F12a reescritas y las nuevas, en verde |
| U7 · `#quiz-feedback` montada | T031 y T032 | `implementador`, con la acción del usuario | Su E2E en verde; la comprobación con lector de pantalla |
| U8 · El cierre | T033 a T035 | Agente principal | §0.2 y el PR |

- **El paralelismo:** U1, U2 y U3 tocan archivos disjuntos y pueden ir a la vez. U4 espera a U1, por `routeFromHash` y `notify`. U5 espera a todas las anteriores. U6 y U7 esperan a U5, y son disjuntas entre sí.
- **Si F12a no está en la base** (FR-044), U6 no se hace. `resolveRoute` sigue mandando `administracion` al Recorrido, y el informe lo dice.

## 0. El inventario y la compuerta

### Tarea 0.1 · El inventario de la base (T015)

**Cubre:** FR-048, FR-059 y R1.

- **Pasos:**
  1. Sobre `master` con F10a: `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`. Todo en verde; si no, F10b no empieza.
  2. Anotar lo de quickstart-f10b.md §1: el `dist` en partes, los avisos de `npm run lint` con su función, la cantidad de E2E por archivo y el tope.
  3. **Los globales:**
     - `grep -rn "window\.\(Taller\|GUIDE_DATA\|RUST_\|GO_\|SYSTEMS_\)" frontend/ qa/`;
     - `grep -rn "declare global" frontend/src`.

     Llenar la primera tabla de research-f10b.md, «Inventario de la base», con cada global, sus métodos y sus lectores, y la diferencia con el contrato, §1.
  4. **Los adaptadores:** para cada `register-*.tsx` de página, copiar la firma de `mount`, las props que pasa y lo que corre antes y después. Comparar con §5 del contrato. Cada diferencia lleva su tarea.
  5. **El marcado estático:** `frontend/src/index.html` línea por línea (diálogos, regiones y controles), con lo que pasa con cada uno en F10b. Con F8 y F9 entregados, no deberían quedar `#lesson-dialog`, `#confirm-dialog` ni `#import-file` (FR-048).
  6. **La cadena:** las entradas de `LEGACY_MODULES` en orden, y los sitios `import(` de `legacy-views.ts`, con `grep -c "import(" frontend/src/app/boot/legacy-views.ts`.
  7. **Los nombres de `qa/`:**
     - la función de entrada virtual de `qa/lib/sources.ts` (`runEntry` de F8 o `runModuleEntry` de F3), y si acepta `RunOptions`;
     - los consumidores de cada archivo de `qa/lib`, con `grep -rln "<archivo>" qa/`;
     - los checks que importan `legacy-sources.ts`.
  8. **F12a:** si `frontend/src/pages/admin/index.ts` existe y exporta `AdminPage`, U6 se hace (FR-044).
  9. **El spike:** el router que eligió, de `research.md`, «Resultado del spike».
  10. **Las hojas:** el orden de los `import '…css'` de `main.tsx`, que fija la spec de U5.
- **Compuerta:** la tabla reconciliada, sin ningún global del taller que el contrato no reemplace.
- **Commit:** `docs(specs): inventario de la base de F10b`.

### 0.2 · La compuerta de F10b

La corre el agente principal antes del PR (T035).

1. `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y `E2E_PORT=4173 npm run test:e2e`, todos en verde. Las E2E de F10a, también con `--repeat-each=5`.
2. **SC-003:**

   ```sh
   test ! -e frontend/app.js
   grep -rn "window\.Taller\|register-\|legacyViews\|startApp" frontend/
   grep -rn "createRoot(" frontend/src --include=*.ts --include=*.tsx | grep -v "\.spec\."
   ```

   La primera pasa, la segunda no imprime nada y la tercera imprime una línea, la de `start-taller.tsx`.
3. **El `dist`** (quickstart-f10b.md, §1):
   - `chars` bajo 1 500 000, con el antes y el después;
   - `dynamicImports` en 0;
   - `importMeta` igual a lo esperado de R13, nunca más alto.
4. **La complejidad:** el total de `npm run lint` no sube respecto de T015, y no queda ningún aviso de `app.js` (FR-005; SC-009).
5. **Las comparaciones únicas** (T033): el DOM del shell con las diferencias listadas (SC-004), y el barrido de estilo computado y el multiconjunto con 0 diferencias (SC-005).
6. **`seams-guard-check`** en 0 violaciones (FR-053).
7. **Los dos archivos que no cambian:** `git diff --stat <base> -- frontend/src/app/boot/content-gate.ts frontend/src/app/boot/session-gate.ts` vacío (FR-038).
8. **Docker,** con permiso: `docker compose build taller`.
9. **El PR,** con título y descripción en inglés: `feat(front): F10b, one React root with the shell and the router`. Lleva:
   - el contexto y qué cambia;
   - la tabla de correspondencia de F10a, completa (FR-052);
   - los cambios a propósito, cada uno con su commit;
   - las adaptaciones del inventario;
   - el tamaño, `import.meta` y la complejidad;
   - las dos comparaciones;
   - la comprobación con lector de pantalla del usuario (X2);
   - lo pendiente: F10c, `allowJs` y el hallazgo de la sonda `'TallerLab' in window`.

## 1. U1 · Las piezas puras (T016 a T020)

**Cubre:** FR-012, FR-016 a FR-018, FR-021, FR-028, FR-032, FR-033 y FR-058.

**Cada tarea sigue el mismo ciclo:**
1. el stub, que lanza `not implemented` (TR-2);
2. la spec;
3. `npm run test:unit -- <ruta>` con el fallo esperado (`not implemented`), y el commit `test(front): …`;
4. la implementación;
5. la spec en verde, más `npm run typecheck`, `npm run lint` y `npm run format:check`;
6. el commit `feat(front): …`.

Nada se monta todavía, así que la red no cambia.

### 1.1 La ruta de la administración en la gramática (T016)

**Archivos:** `frontend/src/shared/config/url-grammar.ts` y su spec, `url-grammar.spec.ts` (se suma un `describe`).

**Stub:**

```ts
export const ADMIN_VIEW = 'administracion';
export type Route = View | typeof ADMIN_VIEW;
export const ADMIN_HREF = `#${ADMIN_VIEW}`;
export const routeFromHash: (hash: string) => Route = () => {
  throw new Error('not implemented');
};
```

**Spec:**

```ts
describe('routeFromHash', () => {
  it('reads #administracion as the administration route', () => {
    expect(routeFromHash('#administracion')).toBe('administracion');
  });

  it('reads each of the eight views like viewFromHash', () => {
    expect(routeFromHash('#recorrido')).toBe('recorrido');
    expect(routeFromHash('#campana')).toBe('campana');
    expect(routeFromHash('#sistemas')).toBe('sistemas');
    expect(routeFromHash('#atlas')).toBe('atlas');
    expect(routeFromHash('#laboratorio')).toBe('laboratorio');
    expect(routeFromHash('#biblioteca')).toBe('biblioteca');
    expect(routeFromHash('#proyecto')).toBe('proyecto');
    expect(routeFromHash('#metodo')).toBe('metodo');
  });

  it.each(['', '#', '#loquesea', '#administracion/', '#Administracion', '#/administracion', 'administracion'])(
    'falls back to the route for %j',
    (hash) => {
      expect(routeFromHash(hash)).toBe('recorrido');
    },
  );

  it('leaves the eight views of the menu as they are', () => {
    expect(VIEWS).toEqual([
      'recorrido',
      'campana',
      'sistemas',
      'atlas',
      'laboratorio',
      'biblioteca',
      'proyecto',
      'metodo',
    ]);
  });
});
```

**Implementación:**

```ts
export function routeFromHash(hash: string): Route {
  return hash === ADMIN_HREF ? ADMIN_VIEW : viewFromHash(hash);
}
```

**Commits:** `test(front): la ruta de la administración en la gramática de URL` y `feat(front): routeFromHash conoce #administracion`.

### 1.2 El idioma de un enlace, sin efectos (T017)

**Archivos:** `frontend/src/app/router/linked-language.ts` y `linked-language.spec.ts`. **Cubre:** FR-021.

**Implementación** (el stub es `export const linkedLanguage: (route: Route, search: string, catalog: LinkedLanguageCatalog) => GuideLanguage | null = () => { throw new Error('not implemented'); };`, con las mismas interfaces):

```ts
import type { GuideLanguage } from '../../entities/guide';
import { isLinkLanguage, readLinkQuery, type Route } from '../../shared/config/url-grammar';

export interface LinkedLanguageCatalog {
  readonly worlds: Readonly<Record<GuideLanguage, readonly { readonly id: string }[]>>;
  exerciseLanguage(id: string): GuideLanguage | undefined;
}

const LANGUAGES: readonly GuideLanguage[] = ['rust', 'go'];

function worldLanguage(worldId: string | null, catalog: LinkedLanguageCatalog): GuideLanguage | null {
  let found: GuideLanguage | null = null;
  for (const language of LANGUAGES)
    if (catalog.worlds[language].some((world) => world.id === worldId)) found = language;
  return found;
}

function exerciseLanguage(exerciseId: string | null, catalog: LinkedLanguageCatalog): GuideLanguage | null {
  if (exerciseId === null) return null;
  return catalog.exerciseLanguage(exerciseId) ?? null;
}

export function linkedLanguage(
  route: Route,
  search: string,
  catalog: LinkedLanguageCatalog,
): GuideLanguage | null {
  const query = readLinkQuery(search);
  if (route === 'sistemas') return isLinkLanguage(query.language) ? query.language : null;
  if (route === 'campana') return worldLanguage(query.world, catalog);
  if (route === 'laboratorio') return exerciseLanguage(query.exercise, catalog);
  return null;
}
```

**Spec:**

```ts
import { describe, expect, it } from 'vitest';
import type { GuideLanguage } from '../../entities/guide';
import { linkedLanguage, type LinkedLanguageCatalog } from './linked-language';

const EXERCISES: Record<string, GuideLanguage> = { 'rust-02': 'rust', 'go-113': 'go' };

const catalog: LinkedLanguageCatalog = {
  worlds: {
    rust: [{ id: 'rust-world-1' }, { id: 'shared-world' }],
    go: [{ id: 'go-world-1' }, { id: 'shared-world' }],
  },
  exerciseLanguage: (id) => EXERCISES[id],
};

describe('linkedLanguage', () => {
  it('takes a valid lenguaje on #sistemas', () => {
    expect(linkedLanguage('sistemas', '?lenguaje=go', catalog)).toBe('go');
    expect(linkedLanguage('sistemas', '?lenguaje=rust&taller=cache', catalog)).toBe('rust');
  });

  it('ignores an invalid or absent lenguaje on #sistemas', () => {
    expect(linkedLanguage('sistemas', '?lenguaje=python', catalog)).toBeNull();
    expect(linkedLanguage('sistemas', '', catalog)).toBeNull();
  });

  it('takes the language of the world on #campana', () => {
    expect(linkedLanguage('campana', '?mundo=go-world-1', catalog)).toBe('go');
    expect(linkedLanguage('campana', '?mundo=rust-world-1', catalog)).toBe('rust');
  });

  it('lets Go win when the world is in both languages, like the loop of today', () => {
    expect(linkedLanguage('campana', '?mundo=shared-world', catalog)).toBe('go');
  });

  it('ignores an unknown or absent world on #campana', () => {
    expect(linkedLanguage('campana', '?mundo=nada', catalog)).toBeNull();
    expect(linkedLanguage('campana', '', catalog)).toBeNull();
  });

  it('takes the language of the exercise on #laboratorio', () => {
    expect(linkedLanguage('laboratorio', '?ejercicio=go-113&paso=code', catalog)).toBe('go');
    expect(linkedLanguage('laboratorio', '?ejercicio=rust-02&paso=learn', catalog)).toBe('rust');
  });

  it('ignores an unknown or absent exercise on #laboratorio', () => {
    expect(linkedLanguage('laboratorio', '?ejercicio=nada', catalog)).toBeNull();
    expect(linkedLanguage('laboratorio', '?paso=code', catalog)).toBeNull();
  });

  it('ignores the query on every other route', () => {
    expect(linkedLanguage('biblioteca', '?lenguaje=go', catalog)).toBeNull();
    expect(linkedLanguage('recorrido', '?mundo=go-world-1', catalog)).toBeNull();
    expect(linkedLanguage('administracion', '?ejercicio=go-113', catalog)).toBeNull();
  });
});
```

**Commits:** `test(front): el idioma de un enlace, como syncLinkedLanguage` y `feat(front): linkedLanguage porta syncLinkedLanguage sin efectos`.

### 1.3 Los conteos del menú y el resumen del recorrido (T018)

**Archivos:** `frontend/src/app/shell/menu-counts.ts`, `route-summary.ts` y sus specs. **Cubre:** FR-025 y FR-032.

**`menu-counts.ts`:**

```ts
import type { GuideLanguage } from '../../entities/guide';

export interface MenuCountSource {
  readonly campaign: Readonly<Record<GuideLanguage, readonly unknown[]>>;
  readonly workshops: Readonly<Record<string, readonly unknown[]>>;
  readonly lab: Readonly<Record<GuideLanguage, readonly unknown[]>>;
  readonly quests: Readonly<Record<GuideLanguage, readonly unknown[]>>;
  readonly cores: Readonly<Record<string, readonly unknown[]>>;
  readonly guide: { readonly resources: readonly unknown[] };
}

export interface MenuCounts {
  readonly campana: number;
  readonly sistemas: number;
  readonly laboratorio: number;
  readonly biblioteca: number;
}

function countAll(groups: Readonly<Record<string, readonly unknown[]>>): number {
  return Object.values(groups).flat().length;
}

export function menuCounts(content: MenuCountSource, language: GuideLanguage): MenuCounts {
  const exercises =
    content.lab.rust.length +
    content.lab.go.length +
    content.quests.rust.length +
    content.quests.go.length +
    countAll(content.cores);
  return {
    campana: content.campaign[language].length,
    sistemas: countAll(content.workshops),
    laboratorio: exercises,
    biblioteca: content.guide.resources.length,
  };
}
```

**`menu-counts.spec.ts`:** los valores salen de contar a mano la fixture.

```ts
import { describe, expect, it } from 'vitest';
import { menuCounts, type MenuCountSource } from './menu-counts';

const content: MenuCountSource = {
  campaign: { rust: ['r1', 'r2'], go: ['g1', 'g2', 'g3'] },
  workshops: { lowlevel: ['cache', 'heap'], pc: ['pc'] },
  lab: { rust: ['rust-01', 'rust-02'], go: ['go-01'] },
  quests: { rust: ['rust-q1'], go: [] },
  cores: { lowlevel: ['core-1', 'core-2'], pc: ['core-3'] },
  guide: { resources: ['a', 'b', 'c', 'd'] },
};

describe('menuCounts', () => {
  it('counts the worlds of the active language for the campaign', () => {
    expect(menuCounts(content, 'rust').campana).toBe(2);
    expect(menuCounts(content, 'go').campana).toBe(3);
  });

  it('counts every workshop of every domain for Sistemas', () => {
    expect(menuCounts(content, 'rust').sistemas).toBe(3);
  });

  it('counts the lab, the quests and the cores of both languages for the lab', () => {
    expect(menuCounts(content, 'rust').laboratorio).toBe(7);
    expect(menuCounts(content, 'go').laboratorio).toBe(7);
  });

  it('counts the resources for the library', () => {
    expect(menuCounts(content, 'go').biblioteca).toBe(4);
  });
});
```

**`route-summary.ts`:**

```ts
import type { GuideLanguage } from '../../entities/guide';

export interface RouteSummaryGuide {
  readonly tracks: Readonly<
    Record<GuideLanguage, { readonly modules: readonly { readonly steps: readonly { readonly id: string }[] }[] }>
  >;
}

export interface RouteSummaryProgress {
  readonly language: GuideLanguage;
  readonly completed: readonly string[];
}

export interface RouteSummary {
  readonly languageLabel: string;
  readonly done: number;
  readonly total: number;
  readonly percent: number;
}

const LANGUAGE_LABELS: Readonly<Record<GuideLanguage, string>> = { rust: 'RUST', go: 'GO' };

export function summarizeRoute(guide: RouteSummaryGuide, progress: RouteSummaryProgress): RouteSummary {
  const steps = guide.tracks[progress.language].modules.flatMap((module) => module.steps);
  const done = steps.filter((step) => progress.completed.includes(step.id)).length;
  return {
    languageLabel: LANGUAGE_LABELS[progress.language],
    done,
    total: steps.length,
    percent: Math.round((done / steps.length) * 100),
  };
}
```

**`route-summary.spec.ts`:**

```ts
import { describe, expect, it } from 'vitest';
import { summarizeRoute, type RouteSummaryGuide } from './route-summary';

const guide: RouteSummaryGuide = {
  tracks: {
    rust: { modules: [{ steps: [{ id: 'r1' }, { id: 'r2' }] }, { steps: [{ id: 'r3' }] }] },
    go: { modules: [{ steps: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'g4' }] }] },
  },
};

describe('summarizeRoute', () => {
  it('counts the completed steps of the active track and rounds the percentage', () => {
    expect(summarizeRoute(guide, { language: 'rust', completed: ['r1'] })).toEqual({
      languageLabel: 'RUST',
      done: 1,
      total: 3,
      percent: 33,
    });
  });

  it('ignores the completed steps of the other track', () => {
    expect(summarizeRoute(guide, { language: 'go', completed: ['g1', 'g2', 'r1', 'r2'] })).toEqual({
      languageLabel: 'GO',
      done: 2,
      total: 4,
      percent: 50,
    });
  });

  it('starts at zero of the total', () => {
    expect(summarizeRoute(guide, { language: 'rust', completed: [] })).toEqual({
      languageLabel: 'RUST',
      done: 0,
      total: 3,
      percent: 0,
    });
  });
});
```

**Commits:** `test(front): los conteos del menú y el resumen del recorrido` y `feat(front): los conteos del menú y el resumen del recorrido salen del contenido`.

### 1.4 El toast (T019)

**Archivos:** `frontend/src/app/shell/toast.ts` y `toast.spec.ts`. **Cubre:** FR-028.

**Implementación** (el stub exporta los mismos nombres; `notify` lanza `not implemented`):

```ts
import { createStore } from 'zustand/vanilla';

export interface ToastState {
  readonly message: string;
  readonly visible: boolean;
}

export const TOAST_MS = 4500;

export const toastState = createStore<ToastState>(() => ({ message: '', visible: false }));

let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function notify(message: string): void {
  clearTimeout(hideTimer);
  toastState.setState({ message, visible: true });
  hideTimer = setTimeout(() => toastState.setState({ visible: false }), TOAST_MS);
}
```

**Spec:** cada prueba importa el módulo de nuevo, para empezar sin temporizadores.

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function freshToast() {
  vi.resetModules();
  return import('./toast');
}

describe('the toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a notice at once and hides it after 4.5 s, keeping its text', async () => {
    const { notify, toastState } = await freshToast();

    notify('Copia de progreso exportada.');
    expect(toastState.getState()).toEqual({ message: 'Copia de progreso exportada.', visible: true });

    vi.advanceTimersByTime(4499);
    expect(toastState.getState().visible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(toastState.getState()).toEqual({ message: 'Copia de progreso exportada.', visible: false });
  });

  it('lets a second notice replace the first and restart the 4.5 s', async () => {
    const { notify, toastState } = await freshToast();

    notify('Primero.');
    vi.advanceTimersByTime(3000);
    notify('Segundo.');
    expect(toastState.getState().message).toBe('Segundo.');

    vi.advanceTimersByTime(4499);
    expect(toastState.getState().visible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(toastState.getState().visible).toBe(false);
  });

  it('starts empty and hidden', async () => {
    const { toastState } = await freshToast();
    expect(toastState.getState()).toEqual({ message: '', visible: false });
  });
});
```

**Commits:** `test(front): el toast del shell` y `feat(front): el toast del shell como almacén con un solo temporizador`.

### 1.5 El router propio (T020)

**Archivos:** `frontend/src/app/router/navigator.ts` y `navigator.spec.ts`. **Cubre:** FR-016 a FR-018 y FR-030; la entrada 3 de la «Review Focus».

**Implementación** (las interfaces son las del contrato, §3; el stub exporta las mismas, y `createNavigator` lanza `not implemented`):

```ts
import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { routeFromHash, type Route } from '../../shared/config/url-grammar';

export interface NavigationState {
  readonly route: Route;
  readonly page: ReactElement | null;
  readonly mountKey: number;
  readonly ready: boolean;
}

export interface NavigatorEnvironment {
  readonly location: Pick<Location, 'href' | 'hash' | 'search'>;
  addEventListener(type: 'hashchange' | 'popstate', listener: () => void): void;
  scrollToTop(): void;
  focusMain(): void;
}

export interface NavigatorSteps {
  resolveRoute(route: Route): Route;
  syncLinkedLanguage(route: Route, search: string): void;
  leavePages(): void;
  beforeEachPage(): void;
  enter(route: Route): ReactElement;
}

export interface Navigator {
  readonly state: StoreApi<NavigationState>;
  start(): void;
  redraw(): void;
  previousRoute(): Route | null;
}

export function createNavigator(environment: NavigatorEnvironment, steps: NavigatorSteps): Navigator {
  const state = createStore<NavigationState>(() => ({
    route: 'recorrido',
    page: null,
    mountKey: 0,
    ready: false,
  }));
  let lastNavigation = '';
  let previous: Route | null = null;

  function routeOfLocation(): Route {
    return steps.resolveRoute(routeFromHash(environment.location.hash));
  }

  function draw(route: Route): void {
    flushSync(() => state.setState({ page: null }));
    steps.leavePages();
    steps.beforeEachPage();
    const page = steps.enter(route);
    flushSync(() =>
      state.setState((current) => ({ route, page, mountKey: current.mountKey + 1, ready: true })),
    );
  }

  function navigate(): void {
    if (lastNavigation === environment.location.href) return;
    const route = routeOfLocation();
    steps.syncLinkedLanguage(route, environment.location.search);
    previous = state.getState().route;
    draw(route);
    lastNavigation = environment.location.href;
    environment.scrollToTop();
    environment.focusMain();
  }

  return {
    state,
    start() {
      const route = routeOfLocation();
      steps.syncLinkedLanguage(route, environment.location.search);
      draw(route);
      lastNavigation = environment.location.href;
      environment.addEventListener('hashchange', navigate);
      environment.addEventListener('popstate', navigate);
    },
    redraw() {
      draw(state.getState().route);
    },
    previousRoute: () => previous,
  };
}
```

**Spec** (proyecto `node`: el entorno es falso, y `flushSync` sin raíces no dibuja nada):

```ts
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { Route } from '../../shared/config/url-grammar';
import { createNavigator, type Navigator, type NavigatorSteps } from './navigator';

type NavigationEvent = 'hashchange' | 'popstate';

function fakeEnvironment(address: string) {
  const log: string[] = [];
  const listeners = new Map<NavigationEvent, () => void>();
  const url = new URL(address);
  const location = { href: url.href, hash: url.hash, search: url.search };
  return {
    log,
    location,
    addEventListener(type: NavigationEvent, listener: () => void) {
      listeners.set(type, listener);
      log.push(`listen ${type}`);
    },
    scrollToTop: () => log.push('scroll'),
    focusMain: () => log.push('focus'),
    moveTo(next: string) {
      const moved = new URL(next);
      location.href = moved.href;
      location.hash = moved.hash;
      location.search = moved.search;
    },
    fire(type: NavigationEvent) {
      listeners.get(type)?.();
    },
  };
}

function recordingSteps(log: string[], resolveRoute: (route: Route) => Route = (route) => route): NavigatorSteps {
  return {
    resolveRoute,
    syncLinkedLanguage: (route, search) => log.push(`language ${route}|${search}`),
    leavePages: () => log.push('leave'),
    beforeEachPage: () => log.push('refresh'),
    enter: (route) => {
      log.push(`enter ${route}`);
      return createElement('p', null, route);
    },
  };
}

function started(address: string, resolveRoute?: (route: Route) => Route) {
  const environment = fakeEnvironment(address);
  const navigator: Navigator = createNavigator(environment, recordingSteps(environment.log, resolveRoute));
  navigator.start();
  return { environment, navigator };
}

describe('the navigator', () => {
  it('registers nothing until it starts', () => {
    const environment = fakeEnvironment('http://taller.test/#recorrido');
    createNavigator(environment, recordingSteps(environment.log));
    expect(environment.log).toEqual([]);
  });

  it('draws the first page after syncing the language, and moves neither the scroll nor the focus', () => {
    const { environment, navigator } = started('http://taller.test/?mundo=go-world-1#campana');

    expect(environment.log).toEqual([
      'language campana|?mundo=go-world-1',
      'leave',
      'refresh',
      'enter campana',
      'listen hashchange',
      'listen popstate',
    ]);
    expect(navigator.state.getState()).toMatchObject({ route: 'campana', mountKey: 1, ready: true });
  });

  it('draws once when popstate and hashchange both arrive for one navigation', () => {
    const { environment, navigator } = started('http://taller.test/#recorrido');
    environment.log.length = 0;

    environment.moveTo('http://taller.test/#biblioteca');
    environment.fire('popstate');
    environment.fire('hashchange');

    expect(environment.log).toEqual([
      'language biblioteca|',
      'leave',
      'refresh',
      'enter biblioteca',
      'scroll',
      'focus',
    ]);
    expect(navigator.state.getState()).toMatchObject({ route: 'biblioteca', mountKey: 2 });
  });

  it('a lone hashchange draws the page', () => {
    const { environment, navigator } = started('http://taller.test/#recorrido');

    environment.moveTo('http://taller.test/#metodo');
    environment.fire('hashchange');

    expect(navigator.state.getState().route).toBe('metodo');
  });

  it('draws nothing when the address did not change', () => {
    const { environment } = started('http://taller.test/#proyecto');
    environment.log.length = 0;

    environment.fire('popstate');

    expect(environment.log).toEqual([]);
  });

  it('empties the page before the pages leave', () => {
    const environment = fakeEnvironment('http://taller.test/#atlas');
    const pagesWhenLeaving: (unknown | null)[] = [];
    const steps = recordingSteps(environment.log);
    const navigator = createNavigator(environment, {
      ...steps,
      leavePages: () => pagesWhenLeaving.push(navigator.state.getState().page),
    });

    navigator.start();
    environment.moveTo('http://taller.test/#proyecto');
    environment.fire('hashchange');

    expect(pagesWhenLeaving).toEqual([null, null]);
  });

  it('redraws the current route without scrolling or moving the focus', () => {
    const { environment, navigator } = started('http://taller.test/#proyecto');
    environment.log.length = 0;

    navigator.redraw();

    expect(environment.log).toEqual(['leave', 'refresh', 'enter proyecto']);
    expect(navigator.state.getState().mountKey).toBe(2);
  });

  it('shows what resolveRoute decides for an address', () => {
    const { environment, navigator } = started('http://taller.test/#administracion', (route) =>
      route === 'administracion' ? 'recorrido' : route,
    );

    expect(navigator.state.getState().route).toBe('recorrido');
    expect(environment.log).toContain('enter recorrido');
  });

  it('remembers the route shown before each navigation, and none after the start', () => {
    const { environment, navigator } = started('http://taller.test/#campana');
    expect(navigator.previousRoute()).toBeNull();

    environment.moveTo('http://taller.test/#administracion');
    environment.fire('hashchange');

    expect(navigator.previousRoute()).toBe('campana');
  });
});
```

- **La mutación** que la spec detecta: borrar la línea de `lastNavigation`. Falla «draws once when popstate and hashchange both arrive for one navigation».
- **Commits:** `test(front): el router propio del shell` y `feat(front): createNavigator repite el ciclo de render() con la deduplicación de hoy`.

## 2. U2 · Las vistas del arranque como componentes (T021)

**Cubre:** FR-034 y FR-038 (research-f10b.md, R4). **Archivos nuevos:** `frontend/src/app/boot/boot-screens.ts`, `ContentGateScreen.tsx`, `SessionStatus.tsx` y `boot-screens.spec.tsx`.

Nada se conecta todavía. `gate-view.ts` y `session-view.ts` siguen en uso hasta el corte (T028), que cambia las dos etapas a estas vistas y borra el `innerHTML`.

**`boot-screens.ts`:**

```ts
import { flushSync } from 'react-dom';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { ContentFailureKind } from '../../shared/api/content';
import type { GateView } from './content-gate';
import type { SessionFailure, SessionView } from './session-view';

export type GateScreen =
  | { readonly kind: 'none' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failure'; readonly failure: ContentFailureKind; readonly retry: () => void };

export type SessionScreen =
  | { readonly kind: 'none' }
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'failure';
      readonly failure: SessionFailure;
      readonly retry: () => void;
      readonly waiting: boolean;
    };

export interface BootScreens {
  readonly gate: GateScreen;
  readonly session: SessionScreen;
}

const CONTENT_RETRY_ID = 'content-retry';
const SESSION_RETRY_ID = 'session-retry';

export const bootScreens = createStore<BootScreens>(() => ({
  gate: { kind: 'none' },
  session: { kind: 'none' },
}));

function show(screens: StoreApi<BootScreens>, next: Partial<BootScreens>): void {
  flushSync(() => screens.setState(next));
}

function focusById(id: string): void {
  document.getElementById(id)?.focus();
}

function waitOf(failure: SessionFailure): number {
  return failure.kind === 'rate-limited' ? (failure.retryAfterSeconds ?? 0) : 0;
}

export function createGateView(screens: StoreApi<BootScreens>): GateView {
  return {
    showLoading() {
      const hadFocus = document.activeElement?.id === CONTENT_RETRY_ID;
      show(screens, { gate: { kind: 'loading' } });
      if (hadFocus) focusById('main');
    },
    showFailure(failure, retry) {
      show(screens, { gate: { kind: 'failure', failure: failure.kind, retry } });
      focusById(CONTENT_RETRY_ID);
    },
    clear() {
      show(screens, { gate: { kind: 'none' } });
    },
  };
}

export function createSessionView(screens: StoreApi<BootScreens>): SessionView {
  let enableTimer: ReturnType<typeof setTimeout> | undefined;
  const showSession = (session: SessionScreen): void => {
    clearTimeout(enableTimer);
    show(screens, { session });
  };
  return {
    showLoading() {
      const hadFocus = document.activeElement?.id === SESSION_RETRY_ID;
      showSession({ kind: 'loading' });
      if (hadFocus) focusById('session-status');
    },
    showFailure(failure, retry) {
      const wait = waitOf(failure);
      showSession({ kind: 'failure', failure, retry, waiting: wait > 0 });
      if (wait === 0) {
        focusById(SESSION_RETRY_ID);
        return;
      }
      enableTimer = setTimeout(() => {
        show(screens, { session: { kind: 'failure', failure, retry, waiting: false } });
        focusById(SESSION_RETRY_ID);
      }, wait * 1000);
    },
    clear() {
      showSession({ kind: 'none' });
    },
  };
}
```

**`ContentGateScreen.tsx`** (los textos, copiados de `gate-view.ts` de la base):

```tsx
import type { StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { BootScreens } from './boot-screens';

const GENERAL_DETAIL =
  'El contenido del taller no se pudo cargar. Tu progreso sigue guardado en este navegador. Revisá tu conexión y probá de nuevo.';
const VERSION_DETAIL =
  'El contenido del taller no se pudo cargar: puede que haya una versión nueva. Tu progreso sigue guardado en este navegador. Recargá la página y, si sigue igual, probá de nuevo.';

interface ContentGateScreenProps {
  readonly screens: StoreApi<BootScreens>;
}

const ContentGateScreen = ({ screens }: ContentGateScreenProps) => {
  const gate = useStore(screens, (state) => state.gate);
  if (gate.kind === 'loading')
    return (
      <section className="empty-state" data-content-gate="loading">
        <p role="status">Cargando el contenido del taller…</p>
      </section>
    );
  if (gate.kind === 'none') return null;
  return (
    <section className="empty-state" data-content-gate="failed" data-failure={gate.failure}>
      <h2>No se pudo cargar el contenido</h2>
      <p role="alert">{gate.failure === 'version' ? VERSION_DETAIL : GENERAL_DETAIL}</p>
      <button className="button" id="content-retry" type="button" onClick={gate.retry}>
        Reintentar
      </button>
    </section>
  );
};

export default ContentGateScreen;
```

**`SessionStatus.tsx`** (los textos, copiados de `session-view.ts` de F11a; React escapa el mensaje, así que `escapeHtml` ya no hace falta):

```tsx
import type { StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { formatWait } from '../../shared/lib/format-wait';
import type { BootScreens } from './boot-screens';
import type { SessionFailure } from './session-view';

const UNREACHABLE = 'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.';

function failureText(failure: SessionFailure): string {
  if (failure.kind === 'unreachable') return UNREACHABLE;
  if (failure.retryAfterSeconds === null) return failure.message;
  return `${failure.message} Podés volver a intentar en ${formatWait(failure.retryAfterSeconds)}.`;
}

interface SessionStatusProps {
  readonly screens: StoreApi<BootScreens>;
}

const SessionStatus = ({ screens }: SessionStatusProps) => {
  const session = useStore(screens, (state) => state.session);
  if (session.kind === 'loading')
    return (
      <section className="empty-state" data-session-gate="loading">
        <p role="status">Conectando con el taller…</p>
      </section>
    );
  if (session.kind === 'none') return null;
  return (
    <section className="empty-state" data-session-gate="failed" data-failure={session.failure.kind}>
      <p role="alert">{failureText(session.failure)}</p>
      <button
        className="button"
        id="session-retry"
        type="button"
        disabled={session.waiting}
        onClick={session.retry}
      >
        Reintentar
      </button>
    </section>
  );
};

export default SessionStatus;
```

**`boot-screens.spec.tsx`.** El marcado esperado es el que hoy escriben `gate-view.ts` y `session-view.ts`, copiado a mano:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { ContentLoadError, type ContentFailureKind } from '../../shared/api/content';
import { createGateView, createSessionView, type BootScreens } from './boot-screens';
import ContentGateScreen from './ContentGateScreen';
import SessionStatus from './SessionStatus';

const LOADING =
  '<section class="empty-state" data-content-gate="loading"><p role="status">Cargando el contenido del taller…</p></section>';
const OTHER_KINDS: ContentFailureKind[] = ['network', 'status', 'timeout', 'body', 'missing', 'shape'];

function emptyScreens() {
  return createStore<BootScreens>(() => ({ gate: { kind: 'none' }, session: { kind: 'none' } }));
}

function drawGate(screens = emptyScreens()) {
  render(
    <main id="main" tabIndex={-1}>
      <ContentGateScreen screens={screens} />
    </main>,
  );
  return { screens, main: document.getElementById('main') as HTMLElement };
}

function drawSession(screens = emptyScreens()) {
  render(
    <div id="session-status" tabIndex={-1}>
      <SessionStatus screens={screens} />
    </div>,
  );
  return { screens, host: document.getElementById('session-status') as HTMLElement };
}

describe('the content gate screen', () => {
  it('draws nothing while the gate has nothing to show', () => {
    const { main } = drawGate();
    expect(main).toBeEmptyDOMElement();
  });

  it('draws the loading state of today', () => {
    const { screens, main } = drawGate();
    act(() => createGateView(screens).showLoading());
    expect(main.innerHTML).toBe(LOADING);
  });

  it('draws the version failure and focuses «Reintentar», which calls the retry', () => {
    const { screens } = drawGate();
    const retry = vi.fn();

    act(() => createGateView(screens).showFailure(new ContentLoadError('version'), retry));

    expect(screen.getByRole('alert')).toHaveTextContent('puede que haya una versión nueva');
    expect(screen.getByRole('alert')).toHaveTextContent('Recargá la página');
    const button = screen.getByRole('button', { name: 'Reintentar' });
    expect(button).toHaveFocus();
    expect(button.closest('section')).toHaveAttribute('data-failure', 'version');
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it.each(OTHER_KINDS)('gives the general detail for a %s failure', (kind) => {
    const { screens } = drawGate();
    act(() => createGateView(screens).showFailure(new ContentLoadError(kind), () => undefined));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'El contenido del taller no se pudo cargar. Tu progreso sigue guardado en este navegador. Revisá tu conexión y probá de nuevo.',
    );
  });

  it('moves the focus from «Reintentar» to #main when a retry starts loading', () => {
    const { screens, main } = drawGate();
    const view = createGateView(screens);
    act(() => view.showFailure(new ContentLoadError('network'), () => undefined));

    act(() => view.showLoading());

    expect(main).toHaveFocus();
  });

  it('clears to nothing', () => {
    const { screens, main } = drawGate();
    const view = createGateView(screens);
    act(() => view.showLoading());
    act(() => view.clear());
    expect(main).toBeEmptyDOMElement();
  });
});

describe('the session status', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('draws the connection state of today', () => {
    const { screens, host } = drawSession();
    act(() => createSessionView(screens).showLoading());
    expect(host.innerHTML).toBe(
      '<section class="empty-state" data-session-gate="loading"><p role="status">Conectando con el taller…</p></section>',
    );
  });

  it('draws the unreachable failure and focuses «Reintentar»', () => {
    const { screens } = drawSession();
    act(() => createSessionView(screens).showFailure({ kind: 'unreachable' }, () => undefined));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.',
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toHaveFocus();
  });

  it('keeps «Reintentar» disabled during the wait of a rate limit and then focuses it', () => {
    vi.useFakeTimers();
    const { screens } = drawSession();
    act(() =>
      createSessionView(screens).showFailure(
        { kind: 'rate-limited', message: 'Demasiados intentos.', retryAfterSeconds: 3 },
        () => undefined,
      ),
    );
    const button = screen.getByRole('button', { name: 'Reintentar' });
    expect(button).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/^Demasiados intentos\. Podés volver a intentar en /);

    act(() => vi.advanceTimersByTime(3000));

    expect(button).toBeEnabled();
    expect(button).toHaveFocus();
  });

  it('shows a message with HTML as text', () => {
    const { screens } = drawSession();
    act(() =>
      createSessionView(screens).showFailure(
        { kind: 'rate-limited', message: '<b>Esperá</b>', retryAfterSeconds: null },
        () => undefined,
      ),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('<b>Esperá</b>');
  });
});
```

- **El rojo:** con los tres archivos como stubs (`createGateView` y `createSessionView` lanzan `not implemented`, y los dos componentes son `FunctionComponent<Props>` que devuelven `null`), la spec falla por comportamiento.
- **Commits:** `test(front): las vistas del arranque como componentes, con el DOM de hoy` y `feat(front): la compuerta y la sesión se dibujan desde un almacén, sin innerHTML`.

## 3. U3 · El shell en React, sin montar (T022)

**Cubre:** FR-019, FR-022, FR-024 a FR-029 y FR-033. **Archivos nuevos en `frontend/src/app/shell/`:**
- `NavigationMenu.tsx`, `RouteProgress.tsx`, `Sidebar.tsx`, `LanguageSwitch.tsx`, `SkipLink.tsx` y `ToastRegion.tsx`;
- `NavigationMenu.spec.tsx`, `Sidebar.spec.tsx`, `LanguageSwitch.spec.tsx`, `SkipLink.spec.tsx` y `ToastRegion.spec.tsx`.

Son componentes de presentación: reciben todo por props, salvo `ToastRegion`, que lee `toastState`. El DOM es el de `frontend/src/index.html` de la base. Los textos con números van en un solo nodo, armados con un template literal (TR-13).

**`NavigationMenu.tsx`:**

```tsx
import { FREE_LAB_HREF, type Route, type View } from '../../shared/config/url-grammar';
import type { MenuCounts } from './menu-counts';

interface MenuEntry {
  readonly view: View;
  readonly href: string;
  readonly symbol: string;
  readonly label: string;
  readonly count?: keyof MenuCounts;
  readonly countClass?: string;
  readonly countId?: string;
}

const MENU: readonly MenuEntry[] = [
  { view: 'recorrido', href: '#recorrido', symbol: '↗', label: 'Mi recorrido' },
  { view: 'campana', href: '#campana', symbol: '✳', label: 'Campaña', count: 'campana', countClass: 'nav-count' },
  { view: 'sistemas', href: '#sistemas', symbol: '▧', label: 'Sistemas', count: 'sistemas', countClass: 'nav-count' },
  { view: 'atlas', href: '#atlas', symbol: '{ }', label: 'Atlas del lenguaje' },
  {
    view: 'laboratorio',
    href: FREE_LAB_HREF,
    symbol: '⌁',
    label: 'Laboratorio',
    count: 'laboratorio',
    countClass: 'nav-count lab-nav-count',
  },
  {
    view: 'biblioteca',
    href: '#biblioteca',
    symbol: '▤',
    label: 'Biblioteca',
    count: 'biblioteca',
    countClass: 'nav-count',
    countId: 'resource-count',
  },
  { view: 'proyecto', href: '#proyecto', symbol: '⌘', label: 'Mi proyecto' },
  { view: 'metodo', href: '#metodo', symbol: '✎', label: 'Método y notas' },
];

interface NavigationMenuProps {
  readonly current: Route | null;
  readonly counts: MenuCounts | null;
}

function countOf(entry: MenuEntry, counts: MenuCounts | null): number | null {
  if (counts === null || entry.count === undefined) return null;
  return counts[entry.count];
}

const NavigationMenu = ({ current, counts }: NavigationMenuProps) => (
  <nav aria-label="Navegación principal" className="navigation">
    {MENU.map((entry) => {
      const count = countOf(entry, counts);
      return (
        <a
          key={entry.view}
          href={entry.href}
          data-view={entry.view}
          aria-current={entry.view === current ? 'page' : undefined}
        >
          <span className="nav-symbol" aria-hidden="true">
            {entry.symbol}
          </span>
          {count === null ? ` ${entry.label}` : ` ${entry.label} `}
          {count !== null && (
            <span className={entry.countClass} id={entry.countId}>
              {count}
            </span>
          )}
        </a>
      );
    })}
  </nav>
);

export default NavigationMenu;
```

**`RouteProgress.tsx`:**

```tsx
import type { RouteSummary } from './route-summary';

interface RouteProgressProps {
  readonly summary: RouteSummary;
}

const RouteProgress = ({ summary }: RouteProgressProps) => (
  <div className="sidebar-progress">
    <div className="small-label">
      RECORRIDO GUIADO · <span id="sidebar-language">{summary.languageLabel}</span>
    </div>
    <div className="progress-caption">
      <strong id="sidebar-completed">{`${summary.done} de ${summary.total}`}</strong>
      <span id="sidebar-percent">{`${summary.percent}%`}</span>
    </div>
    <progress
      id="sidebar-progress"
      value={summary.done}
      max={summary.total}
      aria-label="Pasos completados"
    />
  </div>
);

export default RouteProgress;
```

**`Sidebar.tsx`:**

```tsx
import type { Route } from '../../shared/config/url-grammar';
import type { MenuCounts } from './menu-counts';
import NavigationMenu from './NavigationMenu';
import RouteProgress from './RouteProgress';
import type { RouteSummary } from './route-summary';

interface SidebarProps {
  readonly route: Route | null;
  readonly counts: MenuCounts | null;
  readonly summary: RouteSummary | null;
  readonly storageAvailable: boolean | null;
  readonly onExport: () => void;
}

const Sidebar = ({ route, counts, summary, storageAvailable, onExport }: SidebarProps) => (
  <aside className="sidebar">
    <a className="brand" href="#recorrido" aria-label="Taller, inicio">
      <span className="brand-mark" aria-hidden="true">
        [t]
      </span>{' '}
      taller<span className="brand-dot">.</span>
    </a>
    <p className="sidebar-tagline">
      Un poco cada día.
      <br />
      Más profundo cada vez.
    </p>
    <NavigationMenu current={route} counts={counts} />
    <div className="sidebar-bottom">
      {summary !== null && <RouteProgress summary={summary} />}
      {storageAvailable !== null && (
        <div className="save-status">
          <span className="status-dot" aria-hidden="true"></span>
          <span id="save-label">
            {storageAvailable ? 'Guardado en este navegador' : 'Exportá para conservar tu avance'}
          </span>
        </div>
      )}
      <button className="text-button export-button" id="export-progress" onClick={onExport}>
        Exportar mi progreso <span aria-hidden="true">↗</span>
      </button>
      <p className="sidebar-footnote">A tu ritmo. Sin rachas que mantener.</p>
    </div>
  </aside>
);

export default Sidebar;
```

**`LanguageSwitch.tsx`:**

```tsx
import type { GuideLanguage } from '../../entities/guide';

interface LanguageSwitchProps {
  readonly active: GuideLanguage | null;
  readonly onChoose: (language: GuideLanguage) => void;
}

function pressed(active: GuideLanguage | null, language: GuideLanguage): boolean | undefined {
  return active === null ? undefined : active === language;
}

const LanguageSwitch = ({ active, onChoose }: LanguageSwitchProps) => (
  <div className="language-switch" role="group" aria-label="Lenguaje del recorrido">
    <button data-language="rust" aria-pressed={pressed(active, 'rust')} onClick={() => onChoose('rust')}>
      Rust <span className="recommended-dot" aria-hidden="true"></span>
    </button>
    <button data-language="go" aria-pressed={pressed(active, 'go')} onClick={() => onChoose('go')}>
      Go
    </button>
  </div>
);

export default LanguageSwitch;
```

**`SkipLink.tsx`:**

```tsx
import type { MouseEvent } from 'react';

function skipToContent(event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  const main = document.getElementById('main');
  main?.focus();
  main?.scrollIntoView({ block: 'start' });
}

const SkipLink = () => (
  <a className="skip-link" href="#main" onClick={skipToContent}>
    Ir al contenido
  </a>
);

export default SkipLink;
```

**`ToastRegion.tsx`:**

```tsx
import { useStore } from 'zustand';
import { toastState } from './toast';

const ToastRegion = () => {
  const message = useStore(toastState, (state) => state.message);
  const visible = useStore(toastState, (state) => state.visible);
  return (
    <div id="toast" role="status" aria-live="polite" className={visible ? 'visible' : undefined}>
      {message}
    </div>
  );
};

export default ToastRegion;
```

**Las specs.** Cada valor esperado sale del `index.html` de la base o de la spec.

```tsx
// NavigationMenu.spec.tsx
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NavigationMenu from './NavigationMenu';

const COUNTS = { campana: 4, sistemas: 25, laboratorio: 274, biblioteca: 15 };

function menuLinks() {
  return within(screen.getByRole('navigation', { name: 'Navegación principal' })).getAllByRole('link');
}

describe('the navigation menu', () => {
  it('lists the eight views with the links of today', () => {
    render(<NavigationMenu current="recorrido" counts={COUNTS} />);
    expect(menuLinks().map((link) => link.getAttribute('href'))).toEqual([
      '#recorrido',
      '#campana',
      '#sistemas',
      '#atlas',
      '?#laboratorio',
      '#biblioteca',
      '#proyecto',
      '#metodo',
    ]);
    expect(menuLinks().map((link) => link.textContent)).toEqual([
      '↗ Mi recorrido',
      '✳ Campaña 4',
      '▧ Sistemas 25',
      '{ } Atlas del lenguaje',
      '⌁ Laboratorio 274',
      '▤ Biblioteca 15',
      '⌘ Mi proyecto',
      '✎ Método y notas',
    ]);
  });

  it('draws the counted links with the markup of today', () => {
    render(<NavigationMenu current={null} counts={COUNTS} />);
    const [, campaign, , , lab, library] = menuLinks();
    expect(campaign.outerHTML).toBe(
      '<a href="#campana" data-view="campana"><span class="nav-symbol" aria-hidden="true">✳</span> Campaña <span class="nav-count">4</span></a>',
    );
    expect(lab.outerHTML).toBe(
      '<a href="?#laboratorio" data-view="laboratorio"><span class="nav-symbol" aria-hidden="true">⌁</span> Laboratorio <span class="nav-count lab-nav-count">274</span></a>',
    );
    expect(library.outerHTML).toBe(
      '<a href="#biblioteca" data-view="biblioteca"><span class="nav-symbol" aria-hidden="true">▤</span> Biblioteca <span class="nav-count" id="resource-count">15</span></a>',
    );
  });

  it('marks only the current view', () => {
    render(<NavigationMenu current="sistemas" counts={COUNTS} />);
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute('href', '#sistemas');
  });

  it('marks no view on the administration route or before the content', () => {
    const { rerender } = render(<NavigationMenu current="administracion" counts={COUNTS} />);
    expect(screen.queryByRole('link', { current: 'page' })).toBeNull();
    rerender(<NavigationMenu current={null} counts={null} />);
    expect(screen.queryByRole('link', { current: 'page' })).toBeNull();
  });

  it('draws no counts before the content', () => {
    render(<NavigationMenu current={null} counts={null} />);
    expect(menuLinks().map((link) => link.textContent)).toContain('✳ Campaña');
    expect(document.querySelector('.nav-count')).toBeNull();
  });
});
```

```tsx
// Sidebar.spec.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Sidebar from './Sidebar';

const SUMMARY = { languageLabel: 'RUST', done: 1, total: 12, percent: 8 };

describe('the sidebar', () => {
  it('draws the route progress of today', () => {
    render(<Sidebar route="recorrido" counts={null} summary={SUMMARY} storageAvailable onExport={() => undefined} />);
    expect(document.querySelector('.sidebar-progress')?.outerHTML).toBe(
      '<div class="sidebar-progress"><div class="small-label">RECORRIDO GUIADO · <span id="sidebar-language">RUST</span></div><div class="progress-caption"><strong id="sidebar-completed">1 de 12</strong><span id="sidebar-percent">8%</span></div><progress id="sidebar-progress" value="1" max="12" aria-label="Pasos completados"></progress></div>',
    );
  });

  it('says where the progress is saved', () => {
    const { rerender } = render(
      <Sidebar route={null} counts={null} summary={null} storageAvailable onExport={() => undefined} />,
    );
    expect(screen.getByText('Guardado en este navegador')).toBeInTheDocument();
    rerender(<Sidebar route={null} counts={null} summary={null} storageAvailable={false} onExport={() => undefined} />);
    expect(screen.getByText('Exportá para conservar tu avance')).toBeInTheDocument();
  });

  it('draws neither the progress nor the footer before the content, and keeps the export button', () => {
    render(<Sidebar route={null} counts={null} summary={null} storageAvailable={null} onExport={() => undefined} />);
    expect(document.querySelector('.sidebar-progress')).toBeNull();
    expect(document.querySelector('.save-status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Exportar mi progreso' })).toBeInTheDocument();
  });
});
```

```tsx
// LanguageSwitch.spec.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LanguageSwitch from './LanguageSwitch';

describe('the language switch', () => {
  it('presses the active language only', () => {
    render(<LanguageSwitch active="go" onChoose={() => undefined} />);
    const group = screen.getByRole('group', { name: 'Lenguaje del recorrido' });
    expect(group).toContainElement(screen.getByRole('button', { name: 'Go', pressed: true }));
    expect(screen.getByRole('button', { name: 'Rust', pressed: false })).toBeInTheDocument();
  });

  it('carries no aria-pressed before the language is known', () => {
    render(<LanguageSwitch active={null} onChoose={() => undefined} />);
    for (const button of screen.getAllByRole('button')) expect(button).not.toHaveAttribute('aria-pressed');
  });

  it('hands the chosen language to onChoose', () => {
    const onChoose = vi.fn();
    render(<LanguageSwitch active="rust" onChoose={onChoose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onChoose).toHaveBeenCalledWith('go');
  });
});
```

```tsx
// SkipLink.spec.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SkipLink from './SkipLink';

describe('the skip link', () => {
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  });

  it('focuses #main, scrolls it to the start and keeps the address', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    render(
      <>
        <SkipLink />
        <main id="main" tabIndex={-1} />
      </>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Ir al contenido' }));

    expect(document.getElementById('main')).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(window.location.hash).toBe('');
  });
});
```

```tsx
// ToastRegion.spec.tsx
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toastState } from './toast';
import ToastRegion from './ToastRegion';

describe('the toast region', () => {
  it('is one polite status region that shows the message and its visibility', () => {
    render(<ToastRegion />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('id', 'toast');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();

    act(() => toastState.setState({ message: 'Copia de progreso exportada.', visible: true }));
    expect(region).toHaveTextContent('Copia de progreso exportada.');
    expect(region).toHaveClass('visible');

    act(() => toastState.setState({ visible: false }));
    expect(region).toHaveTextContent('Copia de progreso exportada.');
    expect(region).not.toHaveClass('visible');
  });
});
```

- **El rojo:** los seis componentes como `FunctionComponent<Props>` que devuelven `null`. Las specs fallan por comportamiento.
- **El orden de los atributos en `outerHTML`:** React los escribe en el orden de las props del JSX. El JSX de arriba sigue el orden de `index.html`, así que las comparaciones exactas pasan.
- **Commits:** `test(front): el shell en React con el DOM de hoy` y `feat(front): la barra lateral, el menú, el selector, el salto y el toast en React`.

## 4. U4 · La composición sin `window` (T023 a T025)

**Cubre:** FR-031, FR-049 a FR-051 y FR-053 (la parte de los dueños nuevos).

Todo sigue sin montar hasta el corte. Los globals y los adaptadores siguen vivos, así que la red pasa entera después de cada tarea.

### 4.1 Las entradas de las páginas, los motores y el laboratorio (T023)

**Archivos:**
- se mueve `frontend/src/app/legacy/lab-api.ts` a `frontend/src/app/lab/lab-api.ts`, con `git mv`;
- se crean `frontend/src/app/shell/shell-state.ts` y, en `frontend/src/app/routes/`, `page-engines.ts`, `page-entries.tsx`, `atlas-sessions.ts`, `campaign-session.ts`, `campaign-missions.ts` y `project-kit.ts`;
- cambian `frontend/src/app/legacy/register-lab.tsx` (la ruta del import), `qa/lib/legacy-sources.ts` (`LAB_SOURCE`), `qa/lib/seams-guard.ts` (`INDEX_OWNERS`), `qa/seams-guard-check.ts` y `frontend/src/app/shell/Sidebar.spec.tsx`, que suma un escenario.

**1. `lab-api.ts`, sin `window`** (el código de la base es el del plan de F7b, 6635-6731). Tres cambios, nada más:
- los imports suman `import { campaignEngine } from '../../entities/campaign';`, `import { systemsEngine } from '../../entities/systems-workshop';` e `import { getContent } from '../content/content';`;
- `window.TallerCampaignEngine` pasa a `campaignEngine` y `window.TallerSystemsEngine` pasa a `systemsEngine`, en las tres apariciones;
- `init()` lee el contenido:

  ```ts
  function init(): void {
    const content = getContent();
    exerciseCatalog.init({
      rustLab: content.lab.rust,
      rustQuests: content.quests.rust,
      goLab: content.lab.go,
      goQuests: content.quests.go,
      systemsLowlevel: content.cores.lowlevel,
      systemsInfra: content.cores.infra,
      systemsPlay: content.cores.play,
      systemsPc: content.cores.pc,
    });
    // Nunca escribe al cargar: la primera escritura es una acción del alumno.
    labStore.open(exerciseCatalog);
  }
  ```

  El comentario existente se conserva. Los `|| []` salen, porque `getContent()` siempre trae las ocho porciones.

**2. `shell-state.ts`,** el único módulo de `app/` que toca el almacén del recorrido (R4):

```ts
import { useStore } from 'zustand';
import {
  routeStore,
  type GuideData,
  type GuideLanguage,
  type RouteProgressV1,
  type RouteStore,
} from '../../entities/guide';

export type SaveStatusSource = Pick<RouteStore, 'changes' | 'storageAvailable'>;

export function openRoute(guide: GuideData): string {
  routeStore.open(guide);
  return routeStore.loadWarning();
}

export function currentLanguage(): GuideLanguage {
  return routeStore.getProgress().language;
}

export function setLanguageInMemory(language: GuideLanguage): void {
  routeStore.getProgress().language = language;
}

export function saveRoute(): boolean {
  return routeStore.save();
}

export function routeProgress(): RouteProgressV1 {
  return routeStore.getProgress();
}

export function useSaveStatus(open: boolean, store: SaveStatusSource = routeStore): boolean | null {
  useStore(store.changes, (state) => state.revision);
  return open ? store.storageAvailable() : null;
}
```

`useSaveStatus` recibe `open` porque `routeStore.storageAvailable()` lanza antes de `routeStore.open()` (`route-store.spec.ts`, «throws when used before it is opened»). Así el hook se suscribe desde el primer cuadro, pero no lee nada hasta que la etapa del shell abrió el almacén. Por lo mismo, `currentLanguage()` y `routeProgress()` sólo se llaman con `ready`.

**El escenario que suma `Sidebar.spec.tsx`,** con el nombre que fija el contrato, §7:

```tsx
import { act } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';
import { useSaveStatus, type SaveStatusSource } from './shell-state';

function fakeRouteStore(available: boolean) {
  let current = available;
  const changes = createStore(() => ({ revision: 0 }));
  const store: SaveStatusSource = { changes, storageAvailable: () => current };
  return {
    store,
    write(next: boolean) {
      current = next;
      changes.setState((state) => ({ revision: state.revision + 1 }));
    },
  };
}

interface ConnectedSidebarProps {
  readonly store: SaveStatusSource;
}

const ConnectedSidebar = ({ store }: ConnectedSidebarProps) => (
  <Sidebar route={null} counts={null} summary={null} storageAvailable={useSaveStatus(true, store)} onExport={() => undefined} />
);

it('the footer reads storageAvailable after every revision', () => {
  const route = fakeRouteStore(true);
  render(<ConnectedSidebar store={route.store} />);
  expect(screen.getByText('Guardado en este navegador')).toBeInTheDocument();

  act(() => route.write(false));

  expect(screen.getByText('Exportá para conservar tu avance')).toBeInTheDocument();
});
```

**3. `page-engines.ts`,** el único módulo de `app/` que toca los motores, además de `lab-api.ts` y del armado de `progress-backup`. Repite el `init` de F5 (`impl-f5`, `register-systems.tsx`), el de F6 (plan de F6, 2312-2323) y los `refresh` y `sync` de los adaptadores:

```ts
import { campaignEngine } from '../../entities/campaign';
import {
  infraModels,
  lowlevelModels,
  mergeModelGroups,
  pcModel,
  playModels,
} from '../../entities/systems-simulation';
import { systemsEngine } from '../../entities/systems-workshop';
import type { SystemsModelRegistry } from '../../pages/systems';
import type { Content } from '../content/content';
import { labApi } from '../lab/lab-api';

let models: SystemsModelRegistry = {};

export function initCampaign(content: Content): string {
  const result = campaignEngine.init(
    { exercises: labApi.getExercises(), worlds: { rust: content.campaign.rust, go: content.campaign.go } },
    labApi.exportState(),
  );
  return result.loadWarning;
}

export function initSystems(content: Content): string {
  models = mergeModelGroups([{ pc: pcModel }, lowlevelModels, infraModels, playModels]) as SystemsModelRegistry;
  const { pc, lowlevel, infra, play } = content.workshops;
  const result = systemsEngine.init({
    workshops: [...pc, ...lowlevel, ...infra, ...play],
    models,
    exercises: labApi.getExercises(),
  });
  return result.loadWarning;
}

export function systemsModels(): SystemsModelRegistry {
  return models;
}

export function refreshCampaign(): void {
  campaignEngine.refreshFromLab(labApi.exportState());
}

export function refreshSystems(): void {
  systemsEngine.refreshFromLab(labApi.exportState());
}

export function syncCampaign(): unknown {
  return campaignEngine.syncLab(labApi.exportState());
}

export function syncSystems(): unknown {
  return systemsEngine.syncLab(labApi.exportState());
}
```

El orden de los paquetes (`pc`, `lowlevel`, `infra` y `play`) es el de `packages()` de F5. Si la base arma los talleres o los modelos con otro tipo, rige la regla de adaptación.

**4. Las sesiones de módulo** (FR-050), que salen de los adaptadores con la misma vida:

```ts
// app/routes/atlas-sessions.ts
import { createAtlasSession, type AtlasLanguage, type AtlasSession } from '../../pages/atlas';

const sessions: Record<AtlasLanguage, AtlasSession> = {
  rust: createAtlasSession(),
  go: createAtlasSession(),
};

export function atlasSession(language: AtlasLanguage): AtlasSession {
  return sessions[language];
}

export function keepAtlasSession(language: AtlasLanguage, session: AtlasSession): void {
  sessions[language] = session;
}
```

```ts
// app/routes/campaign-session.ts
import { createCampaignSession, type CampaignSession } from '../../pages/campaign';

let session: CampaignSession = createCampaignSession();

export function campaignSession(): CampaignSession {
  return session;
}

export function keepCampaignSession(next: CampaignSession): void {
  session = next;
}
```

```ts
// app/routes/campaign-missions.ts (movido de register-campaign.tsx, plan de F6: 2081-2088)
import type { CampaignLanguage } from '../../entities/campaign';
import type { MissionContent } from '../../pages/campaign';
import type { Content } from '../content/content';

export function missionContentFor(content: Content, language: CampaignLanguage): Map<string, MissionContent> {
  return new Map(
    [...content.lab[language], ...content.quests[language]].map((exercise) => [
      exercise.id,
      { title: exercise.title, objective: exercise.objective, challengeType: exercise.challengeType },
    ]),
  );
}
```

**5. `project-kit.ts`** (movido de `register-project-kit.ts`, sin `window`):

```ts
import {
  buildKitFiles,
  findCoreExercise,
  zipKit,
  type Kit,
  type KitArchive,
  type KitDraftRecord,
  type KitExercise,
  type KitLanguage,
  type KitOptions,
  type KitWorkshop,
} from '../../features/download-project-kit';
import { downloadBlob } from '../../shared/lib/download-file';
import { labApi } from '../lab/lab-api';

interface KitLab {
  getExercises(): readonly KitExercise[];
  exportState(): { records: Record<string, KitDraftRecord | undefined> };
}

const lab: KitLab = labApi;

export function kitFiles(workshop: KitWorkshop, language: string, options: KitOptions = {}): Kit {
  const exercise = findCoreExercise(workshop, language, lab.getExercises());
  const record = lab.exportState().records[exercise.id] || {};
  return buildKitFiles(workshop, language as KitLanguage, exercise, record, options);
}

export function kitArchive(workshop: KitWorkshop, language: string, options?: KitOptions): KitArchive {
  return zipKit(kitFiles(workshop, language, options));
}

export function downloadProjectKit(workshop: KitWorkshop, language: string): void {
  const result = kitArchive(workshop, language);
  downloadBlob(new Blob([result.bytes], { type: 'application/zip' }), result.name);
}
```

`KitLab` es la misma forma que `LabBridge` de `register-project-kit.ts` (F7b la cambió a `readonly KitExercise[]`). Si `labApi` no la cumple en la base, rige la regla de adaptación.

**6. `page-entries.tsx`:** cada entrada repite el `mount` de su adaptador, sin `createRoot` (contrato, §5). Hasta U6, la administración cae en el Recorrido.

```tsx
import type { ReactElement } from 'react';
import type { GuideLanguage } from '../../entities/guide';
import { AtlasPage } from '../../pages/atlas';
import { CampaignPage, openCampaignSession } from '../../pages/campaign';
import { LabPage, enterLab, type LabWorkshop } from '../../pages/lab';
import { LibraryPage } from '../../pages/library';
import { MethodPage } from '../../pages/method';
import { ProjectPage } from '../../pages/project';
import { RoutePage } from '../../pages/route';
import { SystemsPage, type SystemsWorkshopView } from '../../pages/systems';
import { ADMIN_VIEW, readLinkQuery, type Route, type View } from '../../shared/config/url-grammar';
import { stop } from '../../shared/lib/celebration';
import { reloadDocument } from '../../shared/lib/reload-document';
import { getContent } from '../content/content';
import {
  announceWith,
  currentLabSession,
  keepLabSession,
  labApi,
  labCatalog,
  labRunner,
  programBuilder,
} from '../lab/lab-api';
import { appProgressBackup } from '../progress-backup/app-progress-backup';
import { notify } from '../shell/toast';
import { atlasSession, keepAtlasSession } from './atlas-sessions';
import { missionContentFor } from './campaign-missions';
import { campaignSession, keepCampaignSession } from './campaign-session';
import { refreshCampaign, refreshSystems, systemsModels } from './page-engines';
import { downloadProjectKit } from './project-kit';

export interface PageContext {
  readonly language: GuideLanguage;
}

type PageEntry = (context: PageContext) => ReactElement;

function scrollMainToTop(): void {
  document.getElementById('main')?.scrollIntoView({ block: 'start' });
}

function labWorkshops(): LabWorkshop[] {
  const { pc, lowlevel, infra, play } = getContent().workshops;
  return [...pc, ...lowlevel, ...infra, ...play] as unknown as LabWorkshop[];
}

function enterCampaign({ language }: PageContext): ReactElement {
  refreshCampaign();
  const session = openCampaignSession(campaignSession(), language, readLinkQuery(location.search).world);
  keepCampaignSession(session);
  return (
    <CampaignPage
      language={language}
      missions={missionContentFor(getContent(), language)}
      initialSession={session}
      notify={notify}
      onSessionChange={keepCampaignSession}
    />
  );
}

function enterSystems({ language }: PageContext): ReactElement {
  refreshSystems();
  return (
    <SystemsPage
      language={language}
      models={systemsModels()}
      exercises={labApi.getExercises()}
      notify={notify}
      downloadKit={(workshop: SystemsWorkshopView) => downloadProjectKit(workshop, language)}
      scrollToTop={scrollMainToTop}
    />
  );
}

function enterLaboratory({ language }: PageContext): ReactElement {
  announceWith(notify);
  const session = enterLab(currentLabSession(), language, readLinkQuery(location.search), labCatalog);
  keepLabSession(session);
  return (
    <LabPage
      language={language}
      catalog={labCatalog}
      workshops={labWorkshops()}
      runner={labRunner}
      programBuilder={programBuilder}
      initialSession={session}
      notify={notify}
      scrollToTop={scrollMainToTop}
      onSessionChange={keepLabSession}
    />
  );
}

const ENTRIES: Readonly<Record<View, PageEntry>> = {
  recorrido: ({ language }) => <RoutePage guide={getContent().guide} language={language} notify={notify} />,
  campana: enterCampaign,
  sistemas: enterSystems,
  atlas: ({ language }) => (
    <AtlasPage
      entries={getContent().atlas[language]}
      initialSession={atlasSession(language)}
      language={language}
      onSessionChange={(session) => keepAtlasSession(language, session)}
    />
  ),
  laboratorio: enterLaboratory,
  biblioteca: () => <LibraryPage resources={getContent().guide.resources} />,
  proyecto: ({ language }) => <ProjectPage language={language} />,
  metodo: () => (
    <MethodPage
      sources={getContent().guide.sources}
      progressBackup={appProgressBackup()}
      notify={notify}
      reloadDocument={reloadDocument}
    />
  ),
};

export function resolveRoute(route: Route): View {
  return route === ADMIN_VIEW ? 'recorrido' : route;
}

export function enterPage(route: Route, context: PageContext): ReactElement {
  return ENTRIES[resolveRoute(route)](context);
}

export function leavePages(): void {
  labRunner.abort();
  stop();
}
```

- **`leavePages`** corre lo que corrían los `unmount` de `render()`: el del laboratorio (`labRunner.abort()`) y los de la campaña y Sistemas (`stop()`, que es idempotente y hoy corría dos veces).
- **`refreshCampaign()` dentro de `enterCampaign`** es el `campaignBridges.refresh()` que el adaptador llamaba al montar, aparte del de `render()`. Se conserva para no cambiar el orden de efectos.

**7. `qa/lib/seams-guard.ts`.** `INDEX_OWNERS` suma los dueños nuevos, y conserva los de la base hasta el corte:

```ts
const LAB_MODULE = 'frontend/src/app/lab/lab-api.ts';
const PAGE_ENGINES = 'frontend/src/app/routes/page-engines.ts';
const SHELL_STATE = 'frontend/src/app/shell/shell-state.ts';
const PROGRESS_BACKUP_ASSEMBLY = 'frontend/src/app/progress-backup/app-progress-backup.ts';

const INDEX_OWNERS: Readonly<Record<string, readonly string[]>> = {
  guide: ['frontend/app.js', SHELL_STATE, PROGRESS_BACKUP_ASSEMBLY],
  exercise: [LAB_MODULE],
  campaign: ['frontend/src/app/legacy/register-campaign-engine.ts', LAB_MODULE, PAGE_ENGINES, PROGRESS_BACKUP_ASSEMBLY],
  'systems-workshop': [
    'frontend/src/app/legacy/register-systems-engine.ts',
    LAB_MODULE,
    PAGE_ENGINES,
    PROGRESS_BACKUP_ASSEMBLY,
  ],
};
```

Si `PROGRESS_BACKUP_ASSEMBLY` ya existe en la base (F8), se reusa la constante. En `qa/seams-guard-check.ts`, la entrada de `LEGACY_OWNERS` que nombra `app/legacy/lab-api.ts` pasa a `app/lab/lab-api.ts`.

- **Los pasos:**
  1. Sumar el escenario de `Sidebar.spec.tsx`, correrlo y ver que falla, porque `shell-state.ts` todavía no existe. Commit `test(front): el pie lee storageAvailable después de cada revisión`.
  2. Escribir los ocho archivos y el movimiento de `lab-api.ts`, con `register-lab.tsx` importando `../lab/lab-api` y `LAB_SOURCE` apuntando a `frontend/src/app/lab/lab-api.ts`.
  3. `npm run typecheck`, `npm run lint`, `npm run test:unit`, `node qa/seams-guard-check.ts` y `npm test`, todo en verde.
  4. `npm run build` y `E2E_PORT=4173 npm run test:e2e`, toda la red en verde: `lab-api.ts` ya no lee `window`, y es la misma instancia.
- **La red de estas entradas** son las E2E de cada port, cuando el corte las conecte. Las entradas repiten el `mount` de cada adaptador («Mover no reescribe»), como la unidad 8 de F2b, que se probó con la red de F1.
- **Commit:** `refactor(front): las páginas se componen en app/routes y el laboratorio deja de leer window`.

### 4.2 El armado de `progress-backup`, sin `window` (T024)

**Archivos:** `frontend/src/app/progress-backup/progress-areas.ts`, `app-progress-backup.ts` y sus specs, de F8 (plan de F8, 1595-1716 y 4178-4197).

**La sustitución,** lectura por lectura:

| Hoy, en el armado de F8 | En F10b |
| --- | --- |
| `legacy().TallerLab.exportState()`, `planImport`, `applyImport`, `reset` y `backups?.()` | `lab.exportState()` y los demás, con `lab: labApi` |
| `legacy().TallerCampaign?.sync()` | `syncCampaign()` de `app/routes/page-engines.ts` |
| `legacy().TallerSystems?.sync()` | `syncSystems()` de `page-engines.ts` |
| `() => legacyWindow().TallerSystems?.resetSimulations()` en `sessionResets` | `resetSimulations` de `pages/systems` |
| `() => window.TallerRoute?.resetTimer()` (rama A de F9) o `() => focusTimer.reset()` (rama B) | `() => focusTimer.reset()`, con `focusTimer` de `pages/route` |
| El tipo `LegacyProgressWindow` y la fuente `legacy` | Una fuente `lab: LabProgress` y dos funciones, `syncCampaign` y `syncSystems`, en `ProgressSources` |

- **`progress-areas.spec.ts`** cambia su doble de `window` por un doble de `lab` y dos funciones espía, con los mismos valores esperados y el mismo orden de llamadas.
- **Los pasos:**
  1. Cambiar la spec y verla fallar, porque `createProgressAreas` todavía pide `legacy`. Commit `test(front): el armado de progress-backup recibe el laboratorio y las sincronizaciones`.
  2. Cambiar los dos archivos.
  3. `npm run test:unit`, `npm test` y, con el build, las E2E de F8 (`method-*.spec.ts`) y `shell-sidebar.spec.ts` de F10a, en verde.
- **Commit:** `refactor(front): el armado de progress-backup importa sus fuentes en lugar de leer window`.

### 4.3 Los checks de `qa/` leen el contenido de un solo paquete (T025)

**Archivos:** `qa/lib/app-modules.ts` (nuevo), los checks que importan `qa/lib/legacy-sources.ts` (T015 tiene la lista; research-f10b.md, R9) y `qa/lib/import-cases.ts`.

**`qa/lib/app-modules.ts`:** si la base llama `runModuleEntry` a la función de entrada virtual, se usa ese nombre. Si no acepta `RunOptions`, se le suma `options: RunOptions = {}` y se pasa a su paquete como hace `runSource`.

```ts
import type vm from 'node:vm';
import type { SystemsDomain } from '../../tools/content/catalogs.ts';
import { runEntry } from './sources.ts';

type Language = 'rust' | 'go';

export interface AppContent {
  readonly guide: unknown;
  readonly lab: Readonly<Record<Language, unknown>>;
  readonly quests: Readonly<Record<Language, unknown>>;
  readonly campaign: Readonly<Record<Language, unknown>>;
  readonly workshops: Readonly<Record<SystemsDomain, unknown>>;
  readonly cores: Readonly<Record<SystemsDomain, unknown>>;
  readonly atlas: unknown;
}

export interface AppModules {
  readonly content: AppContent;
  readonly campaignEngine: unknown;
  readonly systemsEngine: unknown;
  readonly labApi: unknown;
  readonly projectKit: { readonly files: unknown; readonly archive: unknown };
  readonly systemsModels: Readonly<Record<SystemsDomain, unknown>>;
}

interface AppModuleExports {
  getContent(): AppContent;
  campaignEngine: unknown;
  systemsEngine: unknown;
  labApi: unknown;
  kitFiles: unknown;
  kitArchive: unknown;
  pcModel: unknown;
  lowlevelModels: unknown;
  infraModels: unknown;
  playModels: unknown;
}

const APP_MODULES_ENTRY = [
  "export { getContent } from './frontend/src/app/content/content.ts';",
  "export { campaignEngine } from './frontend/src/entities/campaign/index.ts';",
  "export { systemsEngine } from './frontend/src/entities/systems-workshop/index.ts';",
  "export { labApi } from './frontend/src/app/lab/lab-api.ts';",
  "export { kitFiles, kitArchive } from './frontend/src/app/routes/project-kit.ts';",
  "export { pcModel, lowlevelModels, infraModels, playModels } from './frontend/src/entities/systems-simulation/index.ts';",
].join('\n');

export function loadAppModules(context: vm.Context): AppModules {
  const modules = runEntry<AppModuleExports>(context, 'app-modules', APP_MODULES_ENTRY, {
    withContent: true,
  });
  return {
    content: modules.getContent(),
    campaignEngine: modules.campaignEngine,
    systemsEngine: modules.systemsEngine,
    labApi: modules.labApi,
    projectKit: { files: modules.kitFiles, archive: modules.kitArchive },
    systemsModels: {
      pc: { pc: modules.pcModel },
      lowlevel: modules.lowlevelModels,
      infra: modules.infraModels,
      play: modules.playModels,
    },
  };
}
```

Las rutas de la entrada virtual siguen la forma de la entrada virtual de la base: relativas a la raíz, como `APP_SHELL_ENTRY` de F8. Si la base resuelve desde otro directorio, se ajusta el prefijo.

**La sustitución en cada check** (contrato, §9). Es mecánica:
- cada `loadX(context)` de `legacy-sources.ts` pasa a una sola llamada, `const app = loadAppModules(context)`, al principio;
- cada lectura de `context.window.<GLOBAL>` pasa a la expresión de la tabla, sobre `app`;
- los casts que hoy tienen esas lecturas se conservan;
- un `loadLab(context)` pasa a `(app.labApi as { init(): void }).init()`, donde estaba la llamada;
- `TallerProjectKit.files` y `archive` pasan a `app.projectKit.files` y `app.projectKit.archive`.

**Ningún valor esperado cambia,** y cada check imprime el mismo conteo de escenarios que en T015.

- **Los pasos:**
  1. Escribir `app-modules.ts`.
  2. Cambiar los checks de a uno. Después de cada uno, `npm run curriculum && node qa/<check>.ts`, con el mismo conteo que en T015.
  3. `npm test` en verde.
  4. **La mutación:** en una copia, cambiar en `app-modules.ts` `content.lab.rust` por `content.lab.go` para un check que cuente ejercicios de Rust (por ejemplo, `content-check`). Tiene que fallar.
- **Lo que no se toca todavía:** `legacy-sources.ts` sigue, porque lo usan `boot-check` y `app-shell-check` (`loadAppShell`) hasta el corte.
- **Commit:** `refactor(qa): los checks leen el contenido, los motores y el laboratorio de un solo paquete`.

## 5. U5 · El corte (T026 a T028)

**Cubre:** FR-012 a FR-040, FR-046 a FR-053 y FR-058; SC-001, SC-003, SC-006 y SC-009. Lo hace el agente principal, porque toca `main.tsx`, `index.html`, `qa/run-checks.ts` y la configuración del guard.

### 5.1 Las E2E de lo que cambia con el corte (T026)

Cuatro commits, en este orden:

1. **La caracterización que faltaba,** en verde contra la base: `qa/e2e/specs/shell-edges.spec.ts`. Fija dos entradas de la «Review Focus» que hoy pasan.

   ```ts
   import { expect, test } from '../fixtures';
   import { CONTENT_URL } from '../lib/content-requests';
   import { urls } from '../lib/urls';

   test.describe('the edges of the shell', () => {
     test('a hash navigation closes the open lesson', async ({ shell, page }) => {
       await shell.goto(urls.view('recorrido'));
       await page.getByRole('button', { name: /^Empezar esta sesión/ }).click();
       await expect(page.getByRole('dialog')).toBeVisible();

       await page.evaluate(() => {
         location.hash = '#biblioteca';
       });

       await expect(shell.heading('biblioteca')).toBeVisible();
       await expect(page.getByRole('dialog')).toHaveCount(0);
     });

     test('the toast region exists before the content arrives', async ({ shell, page }) => {
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

       await expect(shell.toast).toBeAttached();
       await expect(shell.toast).toHaveAttribute('role', 'status');
       await expect(shell.toast).toHaveAttribute('aria-live', 'polite');
       release();
       await expect(shell.heading('recorrido')).toBeVisible();
     });
   });
   ```

   Commit `test(e2e): los bordes del shell, contra la base`.
2. **El rojo de F10-A1** (FR-046): en `qa/e2e/specs/views.spec.ts`, el escenario «KNOWN DEFECT (new, found by F1): <body> carries aria-pressed because [data-language] matches it» pasa a:

   ```ts
   test('<body> carries no aria-pressed', async ({ shell }) => {
     await shell.goto(urls.view('recorrido'));

     await expect(shell.body).not.toHaveAttribute('aria-pressed');
   });
   ```

   Corre contra la base y falla, porque `<body>` lleva `aria-pressed="true"`. Commit `test(e2e): <body> no lleva aria-pressed (F10-A1, en rojo)`.
3. **El arreglo, todavía en `app.js`,** para que el cambio tenga su propio commit: en `syncShell`, `$$('[data-language]')` pasa a `$$('.language-switch [data-language]')`. La E2E del paso 2 pasa, y el resto de la red también. Commit `fix(front): <body> deja de llevar aria-pressed (F10-A1)`. El shell de React del corte no lo pone nunca.
4. **El rojo de F10-Q5 y del salto durante la carga:** `qa/e2e/specs/shell-changes.spec.ts`, que falla contra la base por la razón esperada (los conteos son estáticos, y el salto lleva la URL a `#main`). El corte lo pone en verde.

   ```ts
   import type { Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { CONTENT_URL } from '../lib/content-requests';
   import { urls } from '../lib/urls';

   async function holdContent(page: Page): Promise<() => void> {
     let release: () => void = () => undefined;
     const released = new Promise<void>((resolve) => {
       release = resolve;
     });
     await page.route(CONTENT_URL, async (route) => {
       await released;
       await route.continue();
     });
     return release;
   }

   test.describe('what the shell draws before the content', () => {
     test('the menu has no counts while the content loads, and they arrive with it', async ({
       shell,
       page,
     }) => {
       const release = await holdContent(page);
       await page.goto(urls.view('recorrido'));
       await expect(page.locator('#main [data-content-gate="loading"]')).toBeVisible();

       await expect(shell.menuLink('campana')).toHaveAccessibleName('Campaña');
       await expect(shell.menuLink('sistemas')).toHaveAccessibleName('Sistemas');
       await expect(shell.menuLink('laboratorio')).toHaveAccessibleName('Laboratorio');
       await expect(shell.menuLink('biblioteca')).toHaveAccessibleName('Biblioteca');

       release();
       await expect(shell.menuLink('campana')).toHaveAccessibleName('Campaña 4');
       await expect(shell.menuLink('biblioteca')).toHaveAccessibleName('Biblioteca 15');
     });

     test('the skip link moves the focus to #main while the content loads and keeps the address', async ({
       shell,
       page,
     }) => {
       const release = await holdContent(page);
       await page.goto(urls.view('recorrido'));
       await expect(page.locator('#main [data-content-gate="loading"]')).toBeVisible();

       await page.keyboard.press('Tab');
       await page.keyboard.press('Enter');

       await expect(shell.main).toBeFocused();
       await expect(page).toHaveURL(urls.view('recorrido'));
       release();
       await expect(shell.heading('recorrido')).toBeVisible();
     });
   });
   ```

   Commit `test(e2e): los conteos llegan con el contenido y el salto funciona durante la carga (en rojo)`.

### 5.2 Las specs rojas de la raíz (T027)

**Archivos:**
- stubs: `frontend/src/app/boot/shell-stage.ts`, `boot-stages.ts` y `start-taller.tsx`;
- specs: `shell-stage.spec.ts`, `boot-stages.spec.tsx`, `boot-modules.spec.tsx`, `start-taller.spec.tsx` y `frontend/src/app/main-entry.spec.ts`.

**Los stubs:**
- `export const createShellStage: (steps: ShellStageSteps) => BootStage = () => { throw new Error('not implemented'); };`, con la interfaz del contrato, §4;
- `export const BOOT_STAGES: readonly BootStage[] = [];`;
- `export const startTaller: (container: HTMLElement) => Promise<void> = () => { throw new Error('not implemented'); };`.

**`shell-stage.spec.ts`** (proyecto `node`):

```ts
import { describe, expect, it } from 'vitest';
import { createShellStage, type ShellStageSteps } from './shell-stage';

type Store = 'lab' | 'route' | 'campaign' | 'systems';

function recordingSteps(warnings: Partial<Record<Store, string>> = {}) {
  const calls: string[] = [];
  const open = (store: Store) => () => {
    calls.push(store);
    return warnings[store] ?? '';
  };
  const steps: ShellStageSteps = {
    openLab: open('lab'),
    openRoute: open('route'),
    openCampaign: open('campaign'),
    openSystems: open('systems'),
    startNavigation: () => {
      calls.push('navigation');
    },
    notify: (message) => {
      calls.push(`notify ${message}`);
    },
  };
  return { calls, steps };
}

describe('the shell stage', () => {
  it('is named shellStage', () => {
    expect(createShellStage(recordingSteps().steps).name).toBe('shellStage');
  });

  it('the shell stage opens the stores in the order of startApp', async () => {
    const { calls, steps } = recordingSteps();

    await createShellStage(steps).run();

    expect(calls).toEqual(['lab', 'route', 'campaign', 'systems', 'navigation']);
  });

  it('joins the load notices in the order route, campaign, Sistemas and lab', async () => {
    const { calls, steps } = recordingSteps({
      lab: 'Aviso del laboratorio.',
      route: 'Aviso del recorrido.',
      systems: 'Aviso de Sistemas.',
    });

    await createShellStage(steps).run();

    expect(calls.at(-1)).toBe('notify Aviso del recorrido. · Aviso de Sistemas. · Aviso del laboratorio.');
  });

  it('announces nothing when no store warns', async () => {
    const { calls, steps } = recordingSteps();
    await createShellStage(steps).run();
    expect(calls.some((call) => call.startsWith('notify'))).toBe(false);
  });

  it('the shell stage runs once', async () => {
    const stage = createShellStage(recordingSteps().steps);
    await stage.run();
    await expect(stage.run()).rejects.toThrow(
      'La etapa del shell ya corrió: el arranque corre una sola vez.',
    );
  });
});
```

**`boot-stages.spec.tsx`** (proyecto `dom`, porque las etapas de F11a leen `window.location` al evaluarse):

```tsx
import { describe, expect, it } from 'vitest';
import { BOOT_STAGES } from './boot-stages';

describe('the boot stages', () => {
  it('the stages run as tokens, session, content and shell', () => {
    expect(BOOT_STAGES.map((stage) => stage.name)).toEqual([
      'tokenStage',
      'sessionStage',
      'contentGate',
      'shellStage',
    ]);
  });
});
```

**`boot-modules.spec.tsx`** (FR-040):

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('the boot modules', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('evaluating the boot modules touches no storage, adds no listener and starts no timer', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const windowListeners = vi.spyOn(window, 'addEventListener');
    const documentListeners = vi.spyOn(document, 'addEventListener');
    const reads = vi.spyOn(Storage.prototype, 'getItem');
    const writes = vi.spyOn(Storage.prototype, 'setItem');

    await import('./start-taller');

    expect(windowListeners).not.toHaveBeenCalled();
    expect(documentListeners).not.toHaveBeenCalled();
    expect(reads).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
```

Con el stub, pasa: el stub no importa nada. Es la red del corte, que tiene que seguir en verde cuando `start-taller.tsx` importe la raíz entera.

**`start-taller.spec.tsx`:**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { startTaller } from './start-taller';

vi.mock('../root/AppRoot', () => ({
  default: () => {
    throw new Error('broken page');
  },
}));
vi.mock('../root/url-state', () => ({ startUrlStateSync: vi.fn(), UrlStateProvider: () => null }));
vi.mock('./boot-stages', () => ({ BOOT_STAGES: [] }));

describe('startTaller', () => {
  it('startTaller reports an uncaught render error on the console', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const container = document.createElement('div');

    await startTaller(container);

    expect(consoleError).toHaveBeenCalledWith('No se pudo mostrar el taller.', expect.any(Error));
  });
});
```

**`main-entry.spec.ts`** (proyecto `node`; FR-052):

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const BASE_SHEETS: readonly string[] = [
  '../../styles.css',
  '../pages/route/ui/route.css',
  '../pages/library/ui/library.css',
  '../pages/project/ui/project.css',
  '../pages/method/ui/method.css',
  '../pages/lab/ui/lab.css',
  '../pages/lab/ui/lab-page.css',
  '../pages/atlas/ui/atlas.css',
  '../pages/campaign/ui/campaign-page.css',
  '../pages/lab/ui/quest-explorers.css',
  '../pages/systems/ui/systems.css',
  '../shared/ui/form/form.css',
  '../entities/privacy-notice/ui/privacy-notice.css',
  '../features/sign-in/ui/access.css',
  '../pages/account/ui/account.css',
  '../pages/admin/ui/admin.css',
];

function sheetsOf(source: string): string[] {
  return [...source.matchAll(/^import '([^']+\.css)';$/gm)].map((match) => match[1] ?? '');
}

describe('the entry module', () => {
  it('main.tsx imports styles.css first and the sheets in the order of the base', () => {
    const source = readFileSync(resolve(import.meta.dirname, 'main.tsx'), 'utf8');
    expect(sheetsOf(source)).toEqual(BASE_SHEETS);
  });
});
```

**`BASE_SHEETS` se copia del paso 10 de T015,** con el orden real de la base. La lista de arriba es la que se deriva de los planes de F3, F4, F5, F7b, F8, F9, F11a y F12a. Si la base trae otra, manda la de la base, porque esta spec fija lo que hay, no lo que debería haber. Contra la base, la spec pasa: es la red de la cascada durante el corte.

- **El rojo esperado:** `shell-stage.spec.ts` y `start-taller.spec.tsx` fallan con `not implemented`, y `boot-stages.spec.tsx`, con la lista vacía. `boot-modules.spec.tsx` y `main-entry.spec.ts` pasan.
- **Commit:** `test(front): la raíz única, sus etapas y la hoja primera, en rojo`.

### 5.3 El corte (T028)

Un commit: `feat(front): una sola raíz de React con el shell y el router, sin app.js`. Al terminar, la red entera está en verde, incluidas las rojas de T026 y T027.

**1. Los módulos nuevos de `frontend/src/app/`:**

`router/app-navigator.ts`:

```ts
import { getContent } from '../content/content';
import { labApi } from '../lab/lab-api';
import { enterPage, leavePages, resolveRoute } from '../routes/page-entries';
import { refreshCampaign } from '../routes/page-engines';
import { currentLanguage, setLanguageInMemory } from '../shell/shell-state';
import { linkedLanguage, type LinkedLanguageCatalog } from './linked-language';
import { createNavigator, type Navigator } from './navigator';

function linkedLanguageCatalog(): LinkedLanguageCatalog {
  return {
    worlds: getContent().campaign,
    exerciseLanguage: (id) => labApi.getExercises().find((exercise) => exercise.id === id)?.language,
  };
}

export const appNavigator: Navigator = createNavigator(
  {
    location: window.location,
    addEventListener: (type, listener) => window.addEventListener(type, listener),
    scrollToTop: () => window.scrollTo({ top: 0, behavior: 'instant' }),
    focusMain: () => document.getElementById('main')?.focus({ preventScroll: true }),
  },
  {
    resolveRoute,
    syncLinkedLanguage: (route, search) => {
      const language = linkedLanguage(route, search, linkedLanguageCatalog());
      if (language !== null) setLanguageInMemory(language);
    },
    leavePages,
    beforeEachPage: refreshCampaign,
    enter: (route) => enterPage(route, { language: currentLanguage() }),
  },
);
```

`shell/language.ts`:

```ts
import type { GuideLanguage } from '../../entities/guide';
import { viewFromHash, withLanguageQuery } from '../../shared/config/url-grammar';
import { appNavigator } from '../router/app-navigator';
import { currentLanguage, saveRoute, setLanguageInMemory } from './shell-state';
import { notify } from './toast';

const LANGUAGE_NAMES: Readonly<Record<GuideLanguage, string>> = { rust: 'Rust', go: 'Go' };

export function chooseLanguage(language: GuideLanguage): void {
  if (!appNavigator.state.getState().ready || currentLanguage() === language) return;
  setLanguageInMemory(language);
  history.replaceState(
    null,
    '',
    withLanguageQuery(new URL(location.href), viewFromHash(location.hash), language),
  );
  saveRoute();
  appNavigator.redraw();
  notify(`Recorrido de ${LANGUAGE_NAMES[language]}. Tu otro avance sigue guardado.`);
}
```

`shell/export-progress.ts` (el nombre del ayudante de descarga es el de F8; si difiere en la base, rige la regla de adaptación):

```ts
import { downloadJsonFile } from '../../shared/lib/download-file';
import { appProgressBackup } from '../progress-backup/app-progress-backup';
import { appNavigator } from '../router/app-navigator';
import { notify } from './toast';

export function exportProgress(): void {
  if (!appNavigator.state.getState().ready) return;
  downloadJsonFile(appProgressBackup().exportProgress());
  notify('Copia de progreso exportada.');
}
```

`shell/Shell.tsx`:

```tsx
import { useLayoutEffect, type ReactNode, type Ref } from 'react';
import { useStore } from 'zustand';
import { getContent } from '../content/content';
import { appNavigator } from '../router/app-navigator';
import { exportProgress } from './export-progress';
import { chooseLanguage } from './language';
import LanguageSwitch from './LanguageSwitch';
import { menuCounts } from './menu-counts';
import { summarizeRoute } from './route-summary';
import { currentLanguage, routeProgress, useSaveStatus } from './shell-state';
import Sidebar from './Sidebar';
import SkipLink from './SkipLink';

interface ShellProps {
  readonly entryRef: Ref<HTMLDivElement>;
  readonly sessionStatus: ReactNode;
  readonly main: ReactNode;
}

const Shell = ({ entryRef, sessionStatus, main }: ShellProps) => {
  const ready = useStore(appNavigator.state, (state) => state.ready);
  const route = useStore(appNavigator.state, (state) => state.route);
  const storageAvailable = useSaveStatus(ready);
  const language = ready ? currentLanguage() : null;
  const content = ready ? getContent() : null;

  useLayoutEffect(() => {
    if (language !== null) document.body.dataset.language = language;
  }, [language]);

  return (
    <>
      <SkipLink />
      <div className="app-shell">
        <Sidebar
          route={ready ? route : null}
          counts={content !== null && language !== null ? menuCounts(content, language) : null}
          summary={content !== null ? summarizeRoute(content.guide, routeProgress()) : null}
          storageAvailable={storageAvailable}
          onExport={exportProgress}
        />
        <div className="workspace">
          <header className="topbar">
            <span className="topbar-label">APRENDER ES CONSTRUIR</span>
            <div className="topbar-actions">
              <LanguageSwitch active={language} onChoose={chooseLanguage} />
              <div className="account-entry" id="account-entry" ref={entryRef}></div>
            </div>
          </header>
          <div className="session-status" id="session-status" tabIndex={-1}>
            {sessionStatus}
          </div>
          <main id="main" tabIndex={-1}>
            {main}
          </main>
          <footer className="main-footer">
            <span>Hecho para la curiosidad, no para correr.</span>
            <span>Recursos revisados · 02 OCT 2026</span>
          </footer>
        </div>
      </div>
    </>
  );
};

export default Shell;
```

`root/url-state.tsx` y su spec: `git mv` desde `app/legacy/`, sin cambios.

`root/AppRoot.tsx`, con el DOM de `index.html` de la base después de `.app-shell` (`#account-root` de F11a y `#toast`):

```tsx
import { useState } from 'react';
import { useStore } from 'zustand';
import { AccessGate, accessRequests } from '../../features/sign-in';
import { AccountMenu } from '../../pages/account';
import { ApiClientContext } from '../../shared/api/http';
import { reloadDocument } from '../../shared/lib/reload-document';
import AdminDialog from '../account/AdminDialog';
import { apiClient } from '../account/api-client';
import { setShellInert } from '../account/shell-inertness';
import { bootScreens } from '../boot/boot-screens';
import ContentGateScreen from '../boot/ContentGateScreen';
import SessionStatus from '../boot/SessionStatus';
import { appNavigator } from '../router/app-navigator';
import Shell from '../shell/Shell';
import ToastRegion from '../shell/ToastRegion';
import { UrlStateProvider } from './url-state';

const MainContent = () => {
  const ready = useStore(appNavigator.state, (state) => state.ready);
  const page = useStore(appNavigator.state, (state) => state.page);
  return ready ? page : <ContentGateScreen screens={bootScreens} />;
};

const AppRoot = () => {
  const [entryHost, setEntryHost] = useState<HTMLDivElement | null>(null);
  return (
    <ApiClientContext value={apiClient}>
      <UrlStateProvider>
        <Shell
          entryRef={setEntryHost}
          sessionStatus={<SessionStatus screens={bootScreens} />}
          main={<MainContent />}
        />
        <div id="account-root">
          <AccessGate
            requests={accessRequests}
            setShellInert={setShellInert}
            reloadDocument={reloadDocument}
          />
          {entryHost !== null && (
            <AccountMenu entryHost={entryHost} administration={AdminDialog} reloadDocument={reloadDocument} />
          )}
        </div>
        <ToastRegion />
      </UrlStateProvider>
    </ApiClientContext>
  );
};

export default AppRoot;
```

`AccountMenu` y su prop `administration` son los de F12a (plan de F12a, 1829-1890). Si F12a no está en la base, la línea va sin `administration` y sin el import de `AdminDialog`.

`boot/shell-stage.ts`:

```ts
import type { BootStage } from './run-boot';

export interface ShellStageSteps {
  openLab(): string;
  openRoute(): string;
  openCampaign(): string;
  openSystems(): string;
  startNavigation(): void;
  notify(message: string): void;
}

export function createShellStage(steps: ShellStageSteps): BootStage {
  let ran = false;
  return {
    name: 'shellStage',
    run() {
      if (ran) return Promise.reject(new Error('La etapa del shell ya corrió: el arranque corre una sola vez.'));
      ran = true;
      const lab = steps.openLab();
      const route = steps.openRoute();
      const campaign = steps.openCampaign();
      const systems = steps.openSystems();
      steps.startNavigation();
      const notices = [route, campaign, systems, lab].filter((notice) => notice !== '');
      if (notices.length > 0) steps.notify(notices.join(' · '));
      return Promise.resolve();
    },
  };
}
```

`run()` devuelve una promesa sin ser `async`, porque no espera nada. Por eso la segunda llamada devuelve una promesa rechazada en lugar de lanzar, como pide «the shell stage runs once» (`rejects.toThrow`).

`boot/boot-stages.ts`:

```ts
import { getContent } from '../content/content';
import { labApi } from '../lab/lab-api';
import { appNavigator } from '../router/app-navigator';
import { initCampaign, initSystems } from '../routes/page-engines';
import { openRoute } from '../shell/shell-state';
import { notify } from '../shell/toast';
import { sessionStage, tokenStage } from './account-stages';
import { contentGate } from './content-stage';
import type { BootStage } from './run-boot';
import { createShellStage } from './shell-stage';

export const shellStage: BootStage = createShellStage({
  openLab: () => {
    labApi.init();
    return labApi.loadWarning();
  },
  openRoute: () => openRoute(getContent().guide),
  openCampaign: () => initCampaign(getContent()),
  openSystems: () => initSystems(getContent()),
  startNavigation: () => appNavigator.start(),
  notify,
});

export const BOOT_STAGES: readonly BootStage[] = [tokenStage, sessionStage, contentGate, shellStage];
```

`boot/start-taller.tsx`:

```tsx
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import AppRoot from '../root/AppRoot';
import { startUrlStateSync } from '../root/url-state';
import { BOOT_STAGES } from './boot-stages';
import { runBoot } from './run-boot';

export function startTaller(container: HTMLElement): Promise<void> {
  startUrlStateSync();
  const root = createRoot(container, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar el taller.', error);
    },
  });
  flushSync(() => root.render(<AppRoot />));
  return runBoot(BOOT_STAGES);
}
```

**2. Lo que cambia:**
- **`main.tsx`:**

  ```tsx
  import '../../styles.css';
  // …las demás hojas, una por línea, en el orden de BASE_SHEETS…

  import { startTaller } from './boot/start-taller';

  const container = document.getElementById('app-root');
  if (container === null) throw new Error('Falta #app-root en frontend/src/index.html.');
  startTaller(container).catch((error: unknown) => {
    console.error('No se pudo iniciar el taller.', error);
  });
  ```

  Las hojas son las de la base, sin cambiar ninguna ni su orden; la línea con «…» no se copia. El comentario sobre `qa/load-order-check.ts` sale, porque ese check se retira.
- **`index.html`:** el `<body>` queda así; el `<head>` no cambia.

  ```html
  <body>
    <div id="app-root"></div>
    <noscript><div class="noscript">Esta guía necesita JavaScript para mostrar el recorrido y guardar tu avance. Activá JavaScript en tu navegador.</div></noscript>
    <script type="module" src="./app/main.tsx"></script>
  </body>
  ```

- **`boot/content-stage.ts`:** `import { createGateView } from './gate-view';` pasa a `import { bootScreens, createGateView } from './boot-screens';`, y `view: createGateView()` pasa a `view: createGateView(bootScreens)`.
- **`boot/account-stages.ts`** (de F11a):
  - `import { createSessionView } from './session-view';` pasa a `import { bootScreens, createSessionView } from './boot-screens';`, y `view: createSessionView()` pasa a `view: createSessionView(bootScreens)`;
  - `requestSignIn: (options) => { mountAccountRoot(); return requestSignIn(options); }` pasa a `requestSignIn`;
  - `onReady: mountAccountRoot` pasa a `onReady: () => undefined`, porque la raíz ya dibuja «Tu cuenta» desde el primer cuadro;
  - sale el import de `mountAccountRoot`.
- **`boot/session-view.ts`:** quedan sólo los tipos `SessionFailure` y `SessionView`, que importa `session-gate.ts`. Salen `SESSION_LOADING_MARKUP`, `sessionFailureMarkup`, `createSessionView` y sus ayudantes. Su spec sale: la cubre `boot-screens.spec.tsx`.

**3. Lo que se borra** (`git rm`):
- `frontend/app.js` y `frontend/src/app/boot/legacy-views.ts`;
- `frontend/src/app/boot/gate-view.ts` y `gate-view.spec.ts`;
- `frontend/src/app/legacy/` entera: cada `register-*` del inventario y `url-state.tsx`, que ya se movió;
- `frontend/src/app/account/AccountRoot.tsx` y `mount-account-root.tsx`;
- `tools/content/dump-globals.ts`.

**4. `qa/`:**
- **Se borran** `qa/boot-check.ts`, `qa/load-order-check.ts`, `qa/app-shell-check.ts`, `qa/lib/app-adapters.ts`, `qa/lib/boot-harness.ts`, `qa/lib/app-shell-harness.ts`, `qa/lib/fake-dom.ts` y `qa/lib/legacy-sources.ts`. Cualquier otro archivo de `qa/lib` que quede sin consumidores, también (`grep -rln "<archivo>" qa/`): `built-page.ts` (`evaluateBuiltPage`) o `content-server.ts`, si sólo los usaban esos.
- **`qa/run-checks.ts`** pierde las tres líneas de los checks borrados.
- **`qa/dist-content-check.ts`** deja de evaluar el `dist` (research-f10b.md, R9):
  - salen el relanzamiento con `--experimental-vm-modules`, el arnés y el servidor de contenido;
  - salen las pruebas «the bundle boots without errors», «the bundle publishes the content once and asks for the file once» y «the globals of the bundle equal the dump-globals oracle». Las dos primeras las cubre `content-gate.spec.ts` de A2 en un navegador real, contra el mismo `dist`, con el fixture `pageIssues`; la tercera sale por F10-Q3;
  - quedan «the served file has the generator bytes (documentHash)» y el script único;
  - la de las porciones pasa a leer el archivo servido: «the served file has the 17 portions of the generator», con `portionsOf(JSON.parse(builtContent.bytes.toString('utf8')))` comparado con las porciones de la meta, menos `harness`. La equivalencia del ensamblado la sigue probando `frontend/src/app/content/assemble-content.spec.ts`.
- **`qa/lib/seams-guard.ts`:** `INDEX_OWNERS` queda como en el contrato, §8, sin `frontend/app.js` ni los dos `register-*-engine.ts`. En `qa/seams-guard-check.ts`, las fixtures que nombran `frontend/app.js` como dueño del recorrido pasan a `frontend/src/app/shell/shell-state.ts`, y las que nombran los adaptadores de los motores, a `frontend/src/app/routes/page-engines.ts`. Los escenarios y sus reglas esperadas no cambian.
- **`qa/lib/sources.ts`:** salen las piezas que sólo usaban los checks borrados (`START_CALL_STATEMENT`, `withoutStartCall` y `expose` de F8, y `bundleApp` si nadie más lo usa), comprobado con `grep`.

**5. Los pasos:**
  1. Escribir los módulos de 1, los cambios de 2 y los borrados de 3.
  2. `npm run typecheck`, `npm run lint` y `npm run test:unit`: las specs de T027 en verde.
  3. Los cambios de 4. `npm test`: todos los checks que quedan, en verde.
  4. `npm run build` y el `dist` de quickstart-f10b.md §1: `chars` bajo el tope e `importMeta` como lo espera R13.
  5. `E2E_PORT=4173 npm run test:e2e`: toda la red, con las rojas de T026 en verde. Las de F10a, también con `--repeat-each=5`.
  6. SC-003, con los tres comandos de §0.2, punto 2.
  7. `git diff --stat <base> -- frontend/src/app/boot/content-gate.ts frontend/src/app/boot/session-gate.ts`: vacío.
- **Si una E2E de un port falla:** la composición de su entrada (§4.1) no repite el `mount` de su adaptador. Se compara con el adaptador de la base, que sigue en `git show <base>:frontend/src/app/legacy/register-<página>.tsx`. Ninguna E2E se edita.

## 6. U6 · La administración como ruta (T029 y T030)

**Cubre:** FR-029, FR-041 a FR-044; US5; SC-011. **Sólo si F12a está en la base** (T015, paso 8).

### 6.1 El rojo (T029)

Un commit: `test(e2e): la administración como ruta enlazable (F12-Q1, en rojo)`.

**1. `qa/e2e/pages/admin.ts`:** `open()` pasa a usar el enlace. Es el único método de apertura (FR-063 de F12a):

```ts
async open(): Promise<void> {
  await this.account.open();
  await this.page.getByRole('link', { name: 'Administrar el taller' }).click();
  await this.region.waitFor();
}
```

**2. Los cinco escenarios de F12a** (research-f10b.md, R11) se reescriben así. Los nombres nuevos reemplazan a los viejos:

| Escenario de F12a | Pasa a |
| --- | --- |
| «opens the administration on «Cuentas» without changing the URL or the history» | «opens the administration on «Cuentas» at #administracion with one history entry»: después de `admin.open()`, la URL es `/#administracion`, `history.length` sube en 1 y la sección es «Cuentas» |
| «closes with Esc, gives the focus back to «Tu cuenta» and leaves nothing behind» | «Cerrar goes back to the view it came from and focuses #main»: desde `#campana`, `admin.open()` y «Cerrar» llevan a `/#campana`, con la campaña visible, el foco en `#main` y ningún `dialog` abierto |
| «closes with «Cerrar» too» | «after entering by the link, Cerrar goes to #recorrido»: `page.goto('/#administracion')` y «Cerrar» llevan a `/#recorrido` |
| «disables an account with the keyboard only» | El mismo escenario, con el camino de teclado hasta el enlace «Administrar el taller» (Tab y Enter en lugar del botón); el resto no cambia |
| «keeps no name, email or link…» | El mismo escenario, sin la aserción de `history.length`. En su lugar, después de cada acción, la URL es exactamente `/#administracion` |

**3. `qa/e2e/specs/admin-route.spec.ts`:** la cuenta admin y la de alumno son las del contrato de F12a (`qa/e2e/lib/admin-contract.ts`). Si sus nombres difieren, rige la regla de adaptación.

```ts
import { expect, test } from '../fixtures';
import { ADMIN_ACCOUNT } from '../lib/admin-contract';
import { urls } from '../lib/urls';

const ADMIN_ADDRESS = '/#administracion';

test.describe('the administration route for an admin', () => {
  test.use({ sessionAccount: ADMIN_ACCOUNT });

  test('opens from «Tu cuenta» at #administracion, with no menu link current', async ({ shell, admin, page }) => {
    await shell.goto(urls.view('campana'));

    await admin.open();

    await expect(page).toHaveURL(ADMIN_ADDRESS);
    await expect(admin.region).toBeVisible();
    await expect(shell.menu.getByRole('link', { current: 'page' })).toHaveCount(0);
  });

  test('a reload keeps the administration', async ({ shell, admin, page }) => {
    await shell.goto(urls.view('campana'));
    await admin.open();

    await page.reload();

    await expect(page).toHaveURL(ADMIN_ADDRESS);
    await expect(admin.region).toBeVisible();
  });

  test('the address carries no name, email, filter or link', async ({ shell, admin, page }) => {
    await shell.goto(urls.view('recorrido'));
    await admin.open();
    await admin.openSection('Invitaciones');

    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('#administracion');
  });
});

test.describe('the administration route for a student', () => {
  test('a student at #administracion sees the route, keeps the address and asks nothing of /api/admin', async ({
    shell,
    api,
    page,
  }) => {
    await shell.goto(ADMIN_ADDRESS);

    await expect(shell.heading('recorrido')).toBeVisible();
    await expect(page).toHaveURL(ADMIN_ADDRESS);
    expect(api.calls.filter((call) => call.path.startsWith('/api/admin'))).toEqual([]);
  });
});
```

`admin.openSection('Invitaciones')` es el método del Page Object de F12a (plan de F12a, 2059-2127). La cuenta de alumno es la que el doble usa por omisión (`sessionAccount: STUDENT`).

**4. Las specs de componente de `pages/account`** (de F11a y F12a), en el mismo commit rojo:
- la de `AccountDialog` pasa de «calls onAdminister» al enlace «Administrar el taller» con `href="#administracion"`, que cierra el diálogo al activarse;
- la de `AccountMenu` pierde el panel `administration` y comprueba que el enlace aparece sólo con `isAdmin`.

### 6.2 La ruta (T030)

**Archivos:**
- `frontend/src/app/routes/page-entries.tsx`, `router/app-navigator.ts` y `root/AppRoot.tsx`;
- `pages/account/ui/AccountDialog.tsx`, `AccountMenu.tsx` y `pages/account/index.ts`;
- se borran `app/account/AdminDialog.tsx` y `admin-dialog.spec.tsx`;
- `pages/admin/ui/admin.css`, que pierde la regla `.admin-dialog`.

**1. `page-entries.tsx`:**

```tsx
import { isAdmin, sessionStore } from '../../entities/session';
import { AdminPage } from '../../pages/admin';

export interface PageActions {
  closeAdministration(): void;
}

export interface PageContext {
  readonly language: GuideLanguage;
  readonly actions: PageActions;
}

const ENTRIES: Readonly<Record<Route, PageEntry>> = {
  administracion: ({ actions }) => (
    <AdminPage initialSection="accounts" onClose={actions.closeAdministration} />
  ),
};

export function resolveRoute(route: Route): Route {
  if (route !== ADMIN_VIEW) return route;
  return isAdmin(sessionStore.getState().user) ? ADMIN_VIEW : 'recorrido';
}

export function enterPage(route: Route, context: PageContext): ReactElement {
  return ENTRIES[route](context);
}
```

- **`ENTRIES`** suma la entrada `administracion` a las ocho de §4.1, que no cambian: cada una desestructura de `PageContext` sólo lo que usa. Su tipo pasa de `Record<View, PageEntry>` a `Record<Route, PageEntry>`.
- **`PageContext`** suma `actions`.
- **`enterPage`** ya no resuelve la ruta, porque el navegador se la pasa resuelta.

**2. `app-navigator.ts`:**

```ts
import { ADMIN_VIEW } from '../../shared/config/url-grammar';

function closeAdministration(): void {
  const previous = appNavigator.previousRoute();
  location.hash = previous === null || previous === ADMIN_VIEW ? '#recorrido' : `#${previous}`;
}
```

`enter` pasa a `(route) => enterPage(route, { language: currentLanguage(), actions: { closeAdministration } })`. `closeAdministration` se declara después de `appNavigator` y sólo se usa dentro de `enter`, así que no hay ninguna referencia antes de tiempo.

**3. «Tu cuenta»:**
- `AccountDialog` cambia `onAdminister?(): void` por `administers: boolean`. Con `administers`, dibuja `<a className="text-button" href={ADMIN_HREF} onClick={onClose}>Administrar el taller</a>` en el lugar del botón. `onClose` cierra el diálogo, y el navegador sigue el enlace.
- `AccountMenu` pierde la prop `administration`, `AdministrationProps` y el panel `'administration'`, y pasa `administers={isAdmin(account)}`.
- `pages/account/index.ts` deja de exportar `AdministrationProps`.
- `AppRoot` pierde `administration={AdminDialog}` y su import.

**4. Los pasos:**
  1. Los cambios.
  2. `npm run test:unit`: las specs de `pages/account` en verde.
  3. `npm run build` y las E2E de F12a y `admin-route.spec.ts`, en verde.
  4. La red entera.
- **Commit:** `feat(front): la administración es la ruta #administracion (F12-Q1)`.

## 7. U7 · `#quiz-feedback` montada (T031 y T032)

**Cubre:** FR-045; US6; X2.

### 7.1 El rojo y la comprobación sobre la base (T031)

- **Antes de cambiar nada,** la acción del usuario: la comprobación con lector de pantalla sobre la base (spec, «Acciones del usuario»). Abrir una lección, responder y anotar qué anuncia el lector. El resultado va en research-f10b.md, «Inventario de la base».
- **`qa/e2e/specs/route-lesson-feedback.spec.ts`:**

  ```ts
  import type { Locator, Page } from '@playwright/test';
  import { expect, test } from '../fixtures';
  import { urls } from '../lib/urls';

  const FEEDBACK = /^(Bien pensado\.|Revisemos la idea\.) /;

  async function openLesson(page: Page): Promise<Locator> {
    await page.getByRole('button', { name: /^Empezar esta sesión/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    return dialog;
  }

  function firstOption(dialog: Locator): Locator {
    return dialog.getByRole('button').filter({ hasText: /^A/ }).first();
  }

  test.describe('the feedback of the lesson', () => {
    test('exists empty before an answer, as a polite status that takes no space', async ({ shell, page }) => {
      await shell.goto(urls.view('recorrido'));
      await openLesson(page);

      const feedback = page.locator('#quiz-feedback');
      await expect(feedback).toBeAttached();
      await expect(feedback).toHaveAttribute('role', 'status');
      await expect(feedback).toHaveAttribute('aria-live', 'polite');
      await expect(feedback).toBeEmpty();
      expect((await feedback.boundingBox())?.height ?? 0).toBe(0);
    });

    test('shows the answer in the same region, without recreating it', async ({ shell, page }) => {
      await shell.goto(urls.view('recorrido'));
      const dialog = await openLesson(page);
      const region = await page.locator('#quiz-feedback').elementHandle();

      await firstOption(dialog).click();

      await expect(page.locator('#quiz-feedback')).toHaveText(FEEDBACK);
      expect(
        await page.evaluate((before) => before === document.getElementById('quiz-feedback'), region),
      ).toBe(true);
    });

    test('opens an answered lesson with its feedback', async ({ shell, page }) => {
      await shell.goto(urls.view('recorrido'));
      const dialog = await openLesson(page);
      await firstOption(dialog).click();
      await dialog.getByRole('button', { name: 'Seguir después' }).click();

      await openLesson(page);

      await expect(page.locator('#quiz-feedback')).toHaveText(FEEDBACK);
    });
  });
  ```

  Contra la base fallan las dos primeras, porque hoy la región está oculta (`hidden`) y se recrea. La tercera ya pasa.
- **Las E2E de F9 que miran la devolución** (`route-lesson.spec.ts`): las que comprueban que `#quiz-feedback` está oculta antes de responder pasan a comprobar que está vacía. Se editan en este mismo commit rojo, porque son la fila «`#quiz-feedback` queda montada» de «Lo que cambia a propósito», y el PR las lista.
- **Commit:** `test(e2e): la devolución de la lección queda montada (X2, en rojo)`.

### 7.2 El cambio (T032)

**Archivos:** `frontend/src/pages/route/ui/LessonDialog.tsx` y `frontend/src/pages/route/ui/route.css`, de F9.

1. **En `LessonDialog`,** el `<p id="quiz-feedback">` de F9 (plan de F9, 3408-3416) deja de llevar `hidden`. Se dibuja siempre que la lección está abierta, con `role="status"` y `aria-live="polite"`. La clase es `quiz-feedback` más ` correct` cuando la respuesta es correcta, y el texto es el de hoy, sólo si hay respuesta.
2. **Al final de `route.css`,** después de `.quiz-feedback.correct`:

   ```css
   .quiz-feedback:empty {
     padding: 0;
     border-left: 0;
     margin: 0 !important;
   }
   ```

3. `npm run test:unit` (la spec de componente de `LessonDialog` de F9 se actualiza si comprobaba `hidden`, en este commit), `npm run build` y las E2E de T031 y de F9, en verde.
4. **La acción del usuario:** la comprobación con lector de pantalla sobre F10b, con el resultado al lado del de T031.

- **Commit:** `feat(front): #quiz-feedback queda montada con su regla :empty (X2)`.

## 8. U8 · El cierre (T033 a T035)

### 8.1 Las comparaciones únicas (T033)

**Cubre:** FR-024, SC-004 y SC-005. Corren fuera del repositorio, sobre dos raíces: un worktree descartable de la base de F10b y la punta de F10b (quickstart-f10b.md, §4).

1. **El DOM del shell:** la grilla de estados, normalizada como dice research-f10b.md, R13. Las únicas diferencias admitidas son el contenedor `#app-root` y el `aria-pressed` de `<body>`.
2. **El estilo computado:** el barrido de la unidad 8 de F2b sobre las mismas páginas y anchos, más el shell, con 0 diferencias. Antes de capturar, el puntero se mueve fuera (TR-13).
3. **El multiconjunto de declaraciones:** el de la base menos `.admin-dialog` (si U6 se hizo) más `.quiz-feedback:empty`.
4. **El tamaño y `import.meta`:** las cifras de quickstart-f10b.md §1, con el antes y el después.

Las cantidades van en la descripción del PR. Commit: `docs(specs): las comparaciones de F10b`, que suma a research-f10b.md la sección «Comparaciones del cierre».

### 8.2 La documentación (T034)

Lo hace el agente principal (FR-060):
- **`AGENTS.md`:**
  - «Organización» ya no lista vistas legacy en `frontend/`: no queda ninguna;
  - la frase de `app/legacy/` y los adaptadores `window.Taller*` pasa a describir la raíz única (`app/root`, `app/shell`, `app/router` y `app/routes`);
  - los comandos no cambian.
- **`docs/architecture.md`:**
  - el mapa de fuentes;
  - la secuencia de arranque (`main.tsx` → `startTaller` → las cuatro etapas → el router);
  - R4 con sus cuatro dueños;
  - que `dump-globals` y los tres checks salieron.
- **`qa/AGENTS.md`:**
  - los checks retirados y sus arneses;
  - `qa/lib/app-modules.ts` como el cargador de los checks;
  - qué cubre `dist-content-check` ahora;
  - las cinco specs de E2E de F10a y las tres de F10b.

Commit `docs: la raíz única, el shell y el router en la guía, la arquitectura y qa`.

### 8.3 La compuerta y el PR (T035)

La compuerta de §0.2, entera, y el PR. Cubre FR-001 a FR-006, FR-059 y FR-060, y SC-001, SC-003 a SC-005, SC-008, SC-009, SC-011 y SC-012.

**La reversión:** el PR de F10b se revierte entero. La red de F10a vuelve a pasar contra `app.js`, porque nunca se editó.

## Si gana una librería

El plan está escrito contra el router propio, la opción por omisión de FR-010. Si el spike de F10a eligió una librería y el usuario dio el permiso, cambian sólo estas tareas:

| Tarea | Qué cambia | Cómo |
| --- | --- | --- |
| T015 | El inventario suma la instalación | `npm install --save-exact <paquete>@<versión>` con el permiso, `package.json` y el lockfile sincronizados, y el aviso de licencia de cada paquete en `frontend/THIRD-PARTY-NOTICES.txt` (FR-011) |
| T016 | Nada | `url-grammar` sigue siendo la única que conoce las URL: la librería recibe la vista de `routeFromHash`, o su historia propia la calcula con esa función (FR-012) |
| T020 | La implementación de `createNavigator`, no su interfaz | `Navigator` y `NavigatorSteps` no cambian. Los dos oyentes se reemplazan por la suscripción de la historia de la librería (la variante del spike que pasó C1 a C8: `createHashRouter`, `HashRouter` o la historia propia de TanStack), y `navigate()` sigue con la deduplicación, el ciclo de dibujo y el foco. `navigator.spec.ts` no cambia, salvo el entorno falso, que imita la suscripción de esa historia |
| T028 | La raíz suma el proveedor de la librería | `AppRoot` envuelve el shell en el proveedor que usó el spike, sin rutas anidadas, y la página la sigue dibujando `MainContent` desde el estado del navegador. El adaptador de nuqs sigue siendo el de SPA (FR-020) |
| T033 | El tamaño | El aumento de la librería se informa aparte, y tiene que coincidir con el del spike con un margen de 1 000 caracteres. Si no coincide, se para y se informa |

El resto del plan no cambia: las etapas, el shell, las entradas, el retiro, `qa/`, la administración y `#quiz-feedback`.

## Puntos de integración

- **F10b espera a F10a** (su PR, la tabla y el spike) y, si el spike eligió una librería, al permiso del usuario.
- **F10c espera a F10b:** muda las reglas del shell desde `styles.css`. F10b no mueve CSS, salvo `.quiz-feedback:empty` y `.admin-dialog`.
- **FR-059:** A3, A4, D1c, C4, F11b, F11c, F11d, F12b y F13 se integran de a uno. Algunos tocan lo mismo que F10b:
  - A3 (la etapa de sesión);
  - D1c (`progress-backup`);
  - C4 (los estilos en línea y el `dist`);
  - F11b, F11c y F11d (las pantallas de la cuenta, dentro de `#account-root`).

  El que llega después rebasa. Si A3 entra antes, su extensión de la etapa de sesión queda como está: `account-stages.ts` cambia sólo en la vista y en `requestSignIn` (§5.3).
- **El hallazgo de la sonda de F11a:** `session-stage.spec.ts` pregunta `'TallerLab' in window`, y después de F10b esa aserción pasa siempre. FR-002 impide editarla. La reemplaza, como prueba de comportamiento, «behind the access no page is drawn» de F10a. El coordinador decide si F11a la cambia en un PR propio.

## Complexity Tracking

Sin violaciones de la constitución. Dos decisiones que el revisor puede discutir:

| Decisión | Por qué | La alternativa más simple, descartada |
| --- | --- | --- |
| El elemento de la página vive en el estado del router (Zustand), no en un `switch` del render | El ciclo de `render()` exige que las entradas corran sus efectos (actualizar la campaña, abrir la sesión del laboratorio) antes de dibujar, fuera del render de React | Un `switch` en `MainContent` correría esos efectos durante el render, o en un efecto, con `flushSync` donde no funciona |
| R4 con cuatro dueños en `app/` | Se conserva el invariante (pocas puertas a los singletons), y queda explícito quién abre cada almacén | Borrar R4 dejaría a cualquier módulo de `app/` abriendo motores |
