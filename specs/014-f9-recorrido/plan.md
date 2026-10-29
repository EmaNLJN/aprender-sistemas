# Implementation Plan: F9 · Port de Recorrido a React

**Branch**: `014-f9-recorrido` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F9, con su clarify del 2026-10-28 (Q1 a Q4, más X1 con el ruling C2). Las decisiones técnicas y las mediciones están en [research.md](./research.md); la validación, en [quickstart.md](./quickstart.md); el contrato del adaptador y de la API pública, en [contracts/taller-route.md](./contracts/taller-route.md); las tareas, en [tasks.md](./tasks.md).

> **Para quien lo implementa:**
>
> - **Qué leer.** Leé enteras las «Restricciones globales», «Reglas para todos los agentes», «Lo compartido con F3, F4 y F8» y la sección de tu tarea. Cada tarea trae sus archivos, sus interfaces y el código completo; `tasks.md` es una línea por tarea y remite acá.
> - **La base.** Al planificar fue `master` con F2a, A2 y las cuatro unidades de F2b, la misma que se leyó en el worktree `f2b-acum` (`2b37caf4`). Las líneas que cita este plan son de esa base, salvo las de la enmienda. La base de implementación es `master` desde `431c9d90`, que ya tiene la pila de componentes (#67), el tope de 1 500 000 (#76) y F4 (#77). Ubicá todo por texto: F3, F5 o F6 pueden haber entrado antes y movido las líneas.
> - **La enmienda del 2026-10-28 (noche).** El plan se alineó con lo que la implementación de F4 (en `master`), F5 (`impl-f5`, `efaf39b2`) y F6 (`impl-f6`, `b20028be`) ya fijó: `routeStore.toggleMark('completed', id)` en lugar de `toggleRouteItem`, el Page Object de Método de F5, la guarda de `useStore` de F6, la pila de #67 con el proyecto `dom`, la forma canónica de `boot-check` (`REACT_VIEWS` y el `mountedText` de F4, sin ayudantes en `fake-dom.ts`), la suscripción del shell que dejó F4, la compuerta de `import.meta`, los stubs del rojo, las trampas del barrido y el tope de 1 500 000. Cada cambio, con su fuente, está en research.md (R17).
> - **Lo que no corrió.** Nada se ejecutó al planificar: sin `npm`, sin navegador y sin Docker. Los textos esperados salen de `content/guide/`, de `qa/fixtures/progress-master-2a278ad-storage.json` y del código leído. Lo que el plan supone y no verificó está en «Riesgos y lo que quedó sin verificar».

## Summary

**Objetivo.** Llevar el Recorrido (`#recorrido`, la vista de entrada) a una página de React que conserva el aspecto, los textos, el teclado, las URL y el progreso guardado, saca de `app.js` todo lo suyo y el `setInterval` global, y deja un adaptador mínimo `window.TallerRoute`.

**Arquitectura.**

- **La página** (`frontend/src/pages/route/`) lee el progreso vivo de `routeStore` y escribe una vez por acción.
- **El temporizador** es un módulo de sesión de la página con un intervalo que existe sólo mientras corre.
- **La lección** es un `<dialog>` nativo dibujado con un portal a `body`.
- **El shell** se entera de cada escritura por la revisión del almacén, a la que `app.js` se suscribe.
- **Los selectores de pasos** pasan a `entities/guide`, como única fuente para la página y la barra lateral. **La operación de alternar** ya está ahí: `routeStore.toggleMark('completed', id)`, de F4.
- **El CSS:** las 114 reglas del Recorrido, y dos selectores de impresión, se mudan a `route.css` en un commit propio, antes del port.

**Stack.** React 19.2.8, Zustand 5.0.15 (el store de vanilla y `useStore`), Vite 8.3.2, Vitest 5.0.3 (los proyectos `node` y `dom`, este con jsdom y Testing Library, que llegaron con #67) y Playwright 1.63.0 con `page.clock`. No entra ninguna dependencia de ejecución.

**Spec:** [spec.md](./spec.md).

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; JavaScript legacy en `frontend/app.js`. Node 24.21.0.

**Primary Dependencies**:

- `react` y `react-dom` 19.2.8 y `zustand` 5.0.15, ya instalados.
- Sólo para pruebas, ya instalada con #67: la pila de DOM del ADR 0008, que es `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1. T002 sólo la verifica.

**Storage**: `taller-learning-v1` por `routeStore`, sin cambiar su forma (ADR 0003). El temporizador vive en memoria y no se guarda.

**Testing**:

- Vitest: modelo en el proyecto `node` y componentes en el proyecto `dom` (entorno jsdom, setup `frontend/src/vitest.setup.ts`).
- Los checks de `qa/` que cargan `app.js`.
- E2E con Playwright contra el build servido: cinco specs nuevas y la red de F1 y A2 sin editar.
- Dos comparaciones únicas contra la base: el barrido de estilo computado con el multiconjunto, y el HTML.

**Target Platform**: navegador moderno (Chrome en las pruebas), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web; un port de una vista legacy.

**Performance Goals**: ninguna. Se informan el tamaño del HTML y el tiempo de `npm test` y de `npm run test:e2e`.

**Constraints**: ver «Restricciones globales».

**Scale/Scope**:

- **Producción, archivos nuevos (14):**
  - la página: 7 componentes, 3 módulos de modelo, su índice y `route.css`;
  - el adaptador;
  - en `entities/guide`, 1 módulo (`route-selectors.ts`).
- **Specs nuevas:** 6 de Vitest y 5 de E2E, con 1 Page Object y un módulo de datos de E2E. El Page Object de Método se extiende (lo creó F5); si F9 entra antes que F5, se crea con la clase de F5.
- **Producción, archivos que cambian (6):** `app.js`, `styles.css`, `index.html`, el índice de `entities/guide`, `main.tsx` y `legacy-views.ts`.
- **QA, archivos que cambian (7, u 8 con `method.ts`):** `boot-check`, `app-shell-check`, `load-order-check`, los dos arneses, `app-adapters` y las fixtures de E2E. `qa/lib/fake-dom.ts` no cambia.
- **La pila de componentes ya está (#67).** Sólo `eslint.config.ts`, si ni F5 ni F6 trajeron la guarda de `useStore`.
- **Documentación:** 2 documentos.

## Restricciones globales

Los valores exactos, copiados de la spec, de la hoja de ruta y de la constitución. Valen para toda tarea.

- **La red sin editar** (FR-002, SC-001): los 106 E2E de F1 y los 17 de A2 pasan sin editar ningún archivo de `qa/e2e/specs/` que ya exista. `reload.spec.ts` («the focus timer survives a hash navigation and is lost on a reload») es el contrato del dueño del temporizador. Si F11a entró antes, la red es la que deja F11a, con su doble de la API automático (T001 anota la cantidad).
- **Los E2E nuevos** (FR-001, FR-043):
  - pasan contra el legacy antes de portar y sin editarse después;
  - los de X1 y Q4 (`route-kept-state.spec.ts`) fallan contra el legacy por la razón esperada, en su propio commit;
  - cada rareza de lógica lleva `KNOWN DEFECT` en el nombre; los de X1 no.
- **El tamaño** (FR-004, SC-008):
  - `dist/index.html` queda por debajo de 1 500 000 caracteres (`BOOT_SIZE_LIMIT` de `qa/build-check.ts`, desde #76; T001 lo relee del check), con el antes (T001) y el después en el PR;
  - si crece más de 8 000, el coordinador lo revisa antes de seguir;
  - la forma de A2 no cambia: un documento con un script y un estilo en línea, y el contenido en `dist/content/curriculum.<versión>.json`;
  - `import.meta` en el script del dist cuenta **la base de T001 más uno**, por la entrada nueva de `LEGACY_MODULES` (`register-route`), e `import(` queda como en T001 (TR-4: Vite envuelve cada `import()` de `legacy-views.ts` con `import.meta.url`). Otro número se informa al coordinador antes de seguir.
- **Los mismos bytes** (SC-005): `build/curriculum.json`, `node tools/content/dump-globals.ts .` y los catálogos del dist (el check del bundle de A2).
- **El marcado:** de `frontend/src/index.html` sale una sola línea, `<dialog id="lesson-dialog" aria-labelledby="lesson-title"><div class="dialog-content" id="lesson-content"></div></dialog>` (FR-017).
- **El estilo** (FR-041, SC-005):
  - el multiconjunto de declaraciones del CSS del dist (por selector individual) da 0 diferencias contra la base;
  - el barrido de estilo computado da 0 diferencias a 1 280, 981, 850, 650, 590 y 375 px, con el movimiento reducido encendido y apagado, y en impresión para el Recorrido.
- **Lo guardado** (FR-020, FR-021, SC-004):
  - una sola escritura de `taller-learning-v1` por acción; alternar un paso es `routeStore.toggleMark('completed', id)` de F4 (`entities/guide/model/route-store.ts:97`), sin una operación de alternar propia;
  - cero al montar, al contar el tiempo y al abrir o cerrar la lección sin responder;
  - las claves en el orden `version`, `language`, `completed`, `milestones`, `favorites`, `quizAnswers`, `notes` y `minutes`;
  - las tres fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar.
- **El temporizador** (FR-013, FR-026 a FR-032):
  - `startApp()` no registra ningún intervalo;
  - un solo intervalo de 500 ms, sólo en marcha;
  - el restante sale del vencimiento;
  - el aviso de fin, «Terminó tu rato de foco. Anotá qué entendiste y por dónde seguir.», sale una vez por `#toast`, esté o no montada la página;
  - no se guarda en ningún almacenamiento.
- **El adaptador** (FR-014, FR-015):
  - `window.TallerRoute`, con `mount`, `unmount` y `resetTimer` en la rama A, o sólo `mount` y `unmount` en la rama B;
  - no importa `routeStore`;
  - evaluarlo no toca el almacenamiento, no registra oyentes ni crea intervalos;
  - `mount` vuelve con la página dibujada, y un error al dibujar se registra con `console.error('No se pudo mostrar el recorrido.', error)`.
- **El código de `app.js`** (FR-011, SC-006): `frontend/app.js` no contiene `renderRoute`, `timerMarkup`, `updateTimer`, `setInterval`, `openLesson`, `lesson-dialog`, `data-step-check` ni `data-dialog-action`.
- **Las guardas:** `seams-guard-check` da 0 violaciones. Ningún `style=`, `setAttribute('style', …)` ni `style.cssText` nuevo (FR-003). Ninguna dependencia de ejecución nueva.
- **La complejidad** (FR-005, SC-009):
  - `npm run lint` da 0 errores;
  - los avisos no suben de los que mide T001 (35 según el plan de F2b), y `renderRoute` (12) desaparece;
  - ninguna función nueva supera 10;
  - `render()` de `app.js` sube 2 (un desmontaje y un montaje), como en cada port hasta F10, y se informa.
- **Los textos exactos** de la interfaz son los de hoy y los copian los bloques de código de cada tarea:
  - «Empezar esta sesión» y «Continuar mi proyecto»;
  - «TU PRÓXIMO PASO · NN / MM», «TU SIGUIENTE EXPERIMENTO» y «N DE MM COMPLETADOS»;
  - «UN RATO PARA VOS», «Duración de la sesión», «Tiempo restante», «Iniciar foco», «Pausar», «Continuar», «Reiniciar temporizador» y «El tiempo acompaña. La comprensión marca el ritmo.»;
  - «Cerrar sesión», «Tu desafío», «LO LOGRASTE CUANDO», «Antes de seguir: », «Bien pensado. », «Revisemos la idea. », «Seguir después», «Marcar como hecho», «Volver a practicar» y «✓»;
  - los avisos «Un paso más. Dejá una nota para tu próxima sesión.» y «Paso disponible para volver a practicar.».
- **El código y las pruebas**, en inglés y sin comentarios (`AGENTS.md`). Un comentario que ya existe y se mueve con su código se conserva.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. «Complexity Tracking» registra dos decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules; `export default` con nombre para los componentes y exports nombrados para el modelo; `interface` para props y contratos; Zustand con selectores chicos; ningún servidor ni framework nuevo. `AGENTS.md` no cambia |
| II. TDD y pruebas útiles | Sí | Cada módulo empieza con su spec en rojo y su firma lanzando `not implemented`. Los E2E van contra el legacy antes del port, y los de X1, en su commit en rojo. Los valores esperados salen de `content/guide/` y de las fixtures congeladas, nunca del módulo que se prueba |
| III. Código entendible | Sí | Componentes por región visual (héroe, tarjeta, temporizador, módulos, recomendación y lección); un módulo de modelo por responsabilidad; ninguna función nueva supera 10; sin comentarios |
| IV. Contenido en Git, IDs estables | Sí | `content/guide/` no cambia; los IDs de los pasos y la forma de `taller-learning-v1` tampoco |
| V. Capas y contratos | Sí | `app → pages → entities → shared`; la página no importa `app/`; el adaptador no importa `routeStore`; la API pública del slice es chica (`RoutePage` y `focusTimer`) |
| VI. Español, accesibilidad y portabilidad | Sí | La interfaz, sin un cambio de texto; el diálogo nativo con su foco; el teclado y el orden de tabulación fijados por E2E; el movimiento reducido sigue en la regla global; la impresión, protegida |
| VII. Secretos y salidas fuera de Git | Sí | No hay salidas nuevas; los scripts de comparación viven fuera del repositorio |
| VIII. Flow-forward | Sí | `tasks.md` corto, con una línea por tarea; el detalle está acá |

## Decisiones del usuario (clarify del 2026-10-28)

- **Q1:** las notas, `#note-state` y el pedido al tutor son de F8. La página no los dibuja ni los escribe. Siguen por `routeStore` porque F9 no toca `renderMethod`.
- **Q2 (X3):** el CSS del Recorrido se muda con el port, probado con el barrido de estilo computado y el multiconjunto (T010).
- **Q3 (X2):** `#quiz-feedback` se recrea en cada apertura, como hoy, hasta F10. La comprobación con lector de pantalla es del usuario (T009 y T022).
- **Q4:** la lección vive en la raíz de la página, con un portal a `body`, y se cierra al navegar (T016; E2E en T008).
- **X1 con C2:**
  - los módulos quedan como los dejó el alumno (FR-025);
  - el foco vuelve a quien abrió la lección por cualquier camino (FR-036), y eso reemplaza a `restoreStepFocus`.

  Las rarezas de lógica se conservan, con `KNOWN DEFECT`.
- **F8-Q2:** `resetTimer` lo retira el último de F8 y F9 que entre. El plan escribe las dos ramas (R14 de research.md y la sección «Lo compartido»).

## Project Structure

### Documentation (this feature)

```text
specs/014-f9-recorrido/
├── spec.md                      # con su clarify; F9 no la cambia
├── plan.md                      # este archivo
├── research.md                  # decisiones, Context7 y mediciones
├── quickstart.md                # línea base, compuertas, comparaciones y mutaciones
├── contracts/taller-route.md    # window.TallerRoute, la API pública de pages/route y lo que suma entities/guide
├── tasks.md                     # una línea por tarea, T001 a T022
└── checklists/requirements.md
```

No hay `data-model.md`: F9 no cambia ninguna forma guardada, y el estado del temporizador está en el contrato.

### Source Code (repository root)

```text
frontend/
├── app.js                                   (A, T018) pierde el Recorrido; pasa la suscripción de F4 a syncShell; sessionResets
├── styles.css                               (C, T010) pierde 114 reglas y 2 selectores de impresión
├── vitest.config.ts                         sin cambios: los proyectos node y dom ya están (#67)
└── src/
    ├── index.html                           (A, T018) sale <dialog id="lesson-dialog">
    ├── app/
    │   ├── main.tsx                         (K, T010) importa route.css después de styles.css
    │   ├── boot/legacy-views.ts             (A, T018; lo integra K) carga register-route antes de app.js
    │   └── legacy/register-route.tsx        (A, T018) window.TallerRoute
    ├── entities/guide/
    │   ├── index.ts                         (M, T012) exporta los selectores (routeStore.toggleMark ya está, F4)
    │   └── model/
    │       └── route-selectors.ts + .spec.ts      (M, T011–T012) trackSteps, countCompletedSteps, nextPendingStep
    └── pages/route/
        ├── index.ts                         (P, T016) RoutePage y focusTimer
        ├── model/
        │   ├── focus-timer.ts + .spec.ts    (M, T013–T014) el módulo de sesión del temporizador
        │   ├── route-actions.ts + .spec.ts  (M, T013–T014) las escrituras de la página
        │   └── route-view.ts + .spec.ts     (M, T013–T014) lo que la página deriva para dibujar
        └── ui/
            ├── route.css                    (C, T010) las reglas mudadas
            ├── RoutePage.tsx + .spec.tsx    (P, T015–T016) la raíz: lee, escribe y coordina la lección
            ├── RouteHero.tsx                (P, T016) el encabezado con la ilustración
            ├── FocusCard.tsx                (P, T016) la tarjeta «Sesión de hoy»
            ├── FocusTimerPanel.tsx          (P, T016) el temporizador
            ├── RouteModules.tsx             (P, T016) el contador, la introducción y los módulos
            ├── RouteRecommendation.tsx      (P, T016) la franja de recursos
            └── LessonDialog.tsx + .spec.tsx (P, T015–T016) la lección, con el portal
qa/
├── boot-check.ts                            (A, T017 y T018)
├── app-shell-check.ts                       (A, T018) el escenario «almacén»
├── load-order-check.ts                      (C, T010: las hojas; A, T018: el adaptador)
├── lib/
│   ├── boot-harness.ts, app-shell-harness.ts (A, T018) los ids de la lección y TallerRoute
│   └── app-adapters.ts                      (A, T018) TallerRoute
└── e2e/
    ├── fixtures/index.ts                    (E, T003) route y method
    ├── lib/route-progress.ts                (E, T003) los pasos, los módulos y el progreso v1
    ├── pages/route.ts, pages/method.ts      (E, T003) el Page Object del Recorrido; el de Método lo creó F5 y se extiende
    └── specs/route-steps, route-lesson, route-timer, route-progress, route-kept-state (.spec.ts) (E, T004–T008)
eslint.config.ts                             (K, T002) la guarda de useStore de F6, sólo si ni F5 ni F6 la trajeron
docs/architecture.md, qa/AGENTS.md           (K, T020)
```

**Structure Decision:**

- **`pages/route`** sigue la forma del Atlas: `ui`, `model` y un índice con una API pública chica.
- **Lo que también necesita la barra lateral** va a `entities/guide`, cuyo índice ya posee `app.js` (research.md, R3). Alternar un paso es `routeStore.toggleMark('completed', id)`, que ya está ahí (F4).
- **No se crean** `features`, `widgets` ni un slice nuevo de `entities`.

## Review Focus

Lo que el revisor mira primero:

- **El dueño del temporizador:**
  - un intervalo sólo en `running`, cancelado en la pausa, «↺», el fin, la duración y `reset()`;
  - el restante calculado desde el vencimiento;
  - el aviso una sola vez y por el `notify` que se guardó al iniciar;
  - `focus-timer.ts` no importa `routeStore`.
- **La cascada.** `route.css` va justo después de `styles.css`, con las reglas enteras y en el orden de hoy. Los selectores `.focus-timer` y `.module` salen de las dos reglas compartidas de impresión: si no, la regla base mudada le gana al `display: none` de impresión. Lo prueba el barrido; el multiconjunto sólo dice que nada se perdió.
- **El DOM.** Es el de hoy, con las diferencias listadas en quickstart §4: los `data-*`, los nodos de texto vacíos, `checked` como propiedad y el lugar de la lección en `<body>`. Los textos de JSX tienen sus espacios: « TU TALLER DE …», «Empezar esta sesión ↗» y el código de la ilustración por segmentos.
- **Los módulos y el foco (X1).**
  - `open` sale de un `useState` fijado al montar, nunca de un cálculo por render.
  - El botón de la tarjeta no lleva `key`.
  - `onClose` devuelve el foco al abridor; si ya no está, va a la acción de la tarjeta.
- **Una sola instancia.** La página importa `routeStore`; el adaptador, no. `boot-check` monta el Recorrido sin el error «Abrí el almacén del recorrido antes de usarlo.».
- **El shell.** `routeStore.changes.subscribe(() => syncShell())` está en `startApp()`, antes del `render();` final, y la línea de F4 (`routeStore.changes.subscribe(updateSaveLabel);`, después de `routeStore.open(data);`) ya no está: `syncShell` lee `const` que se declaran después, como `stepsFor`. Las llamadas a `updateSaveLabel()` que la suscripción vuelve redundantes salieron (la de `save()` y la que sigue a `applyImport`). Sin la suscripción, el E2E de la barra lateral falla.
- **La rama de `resetTimer`.** Hay que ver cuál se aplicó y por qué (T001), y que el orden de «Borrar todo» sea los cuatro almacenes, las simulaciones, el temporizador y después `save()`.

**Lo que la spec implica y ninguna prueba de las tareas ejercitaba**, cada caso con la prueba que lo fija y su tarea dueña:

1. **Completar el último paso pendiente desde la tarjeta.**
   - **Qué pasa:** el `<button>` abridor se reemplaza por el `<a>` «Continuar mi proyecto».
   - **El hueco:** FR-036 no dice adónde va el foco.
   - **Lo que hace el plan:** lo manda al enlace (decisión 1 del informe).
   - **La prueba:** «completing the last pending step from the card moves the focus to «Continuar mi proyecto»», en `route-kept-state.spec.ts` (T008). Está en rojo contra el legacy, que manda el foco al título del paso.
2. **Imprimir el Recorrido.**
   - **El hueco:** ni el barrido de F2b ni ningún E2E miran `print`, y la mudanza puede hacer que el temporizador se imprima.
   - **Las pruebas:**
     - «printing hides the focus timer», en `route-steps.spec.ts` (T004), que pasa contra el legacy;
     - la emulación de impresión del barrido (T010 y T019).
3. **Navegar con Atrás mientras la lección está abierta.**
   - **El hueco:** la spec deja este caso sin E2E (Q4).
   - **La prueba:** «navigating back with the lesson open closes it», en `route-kept-state.spec.ts` (T008). Está en rojo contra el legacy, donde la lección queda abierta sobre la otra vista. Además, la fixture `pageIssues` hace fallar la prueba ante un error de consola por una actualización después del desmontaje.
4. **«Borrar todo» entrando directo a `#metodo`.**
   - **El hueco:** el temporizador nunca se dibujó, y `resetTimer()` corre sin `notify`.
   - **Las pruebas:**
     - ««Borrar todo» straight from #metodo works with a timer that was never shown», en `route-timer.spec.ts` (T006);
     - «reset before any use does nothing and creates no timer», en `focus-timer.spec.ts` (T013).
5. **Pausar dentro del primer segundo.**
   - **Qué pasa:** el restante sigue igual a la duración, así que el botón dice «Iniciar foco» y no «Continuar», y al reanudar parte de la duración entera. Es una regla de la tabla de la spec que ninguna prueba ejerce.
   - **Las pruebas:**
     - «a pause within the first second shows «Iniciar foco» and resumes from the full duration», en `focus-timer.spec.ts` (T013);
     - «a double click on «Iniciar foco» starts and pauses», en `route-timer.spec.ts` (T006).

## Reparto en paralelo

**Los dueños:**

- **Delegables:** E, C, M, P y A son slices para el subagente `implementador`. Se le dan los archivos, las interfaces, el código de su tarea y los checks, y se le dice que no deje comentarios.
- **K, el coordinador:** lo hace el agente principal. Integra `main.tsx`, `legacy-views.ts`, `package.json`, las configuraciones y la documentación, revisa cada diff y corre las compuertas.

**Las ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001: la línea base y la detección de ramas. T002: la verificación de la pila de #67 y, si falta, la guarda de `useStore` de F6 |
| 1 | E, C, M y el usuario a la vez | **E:** T003 a T008 (los E2E). **C:** T010 (el CSS), con K para la línea de `main.tsx`. **M:** T011 a T014 (el modelo). **Usuario:** T009 (el lector de pantalla sobre el legacy), apenas T001 deja el build de la base |
| 2 | P | T015 y T016 (la página), cuando T002 y T014 están integrados |
| 3 | A | T017 y T018 (el corte), cuando T008, T010 y T016 están integrados |
| 4 | K y el usuario | **K:** T019 a T021 (las comparaciones, la documentación y el PR). **Usuario:** T022 |

**Archivos e interfaces de cada dueño:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| K · Coordinador | `eslint.config.ts`, `frontend/src/app/main.tsx`, `docs/**`, `qa/AGENTS.md`, `specs/014-f9-recorrido/**` | todo | la línea base, la verificación de la pila y la guarda, las compuertas, las comparaciones, la integración y el PR |
| E · E2E | `qa/e2e/fixtures/index.ts`, `qa/e2e/lib/route-progress.ts`, `qa/e2e/pages/route.ts`, `qa/e2e/pages/method.ts`, `qa/e2e/specs/route-*.spec.ts` | el legacy de la base | la red del Recorrido: cuatro specs verdes y una roja |
| C · CSS | `frontend/styles.css`, `frontend/src/pages/route/ui/route.css` y, en `qa/load-order-check.ts`, las dos restricciones de las hojas | — | las reglas mudadas, con el barrido en 0 |
| M · Modelo | `frontend/src/entities/guide/index.ts`, `frontend/src/entities/guide/model/route-selectors*`, `frontend/src/pages/route/model/**` | `routeStore.toggleMark` de F4 | las firmas de §3.0 |
| P · Página | `frontend/src/pages/route/ui/*.tsx`, `frontend/src/pages/route/index.ts` | de M, §3.0 | `RoutePage` y el índice de §4.0 |
| A · Corte | `frontend/app.js`, `frontend/src/index.html`, `frontend/src/app/legacy/register-route.tsx`, `frontend/src/app/boot/legacy-views.ts` (K lo integra), `qa/boot-check.ts`, `qa/app-shell-check.ts`, `qa/lib/boot-harness.ts`, `qa/lib/app-shell-harness.ts`, `qa/lib/app-adapters.ts` y, en `qa/load-order-check.ts`, la fila del adaptador | de P, `RoutePage` y `focusTimer` del índice | el corte de §5 |

**Puntos de sincronización:**

- **S0:** T001 hecha y las ramas anotadas. Todos parten de ahí.
- **S1:** T014 y T002 integradas. P empieza.
- **S2:** T008, T010 y T016 integradas. A empieza.
- **S3:** T018 integrada. K compara y cierra.

**Puertos.** Para `E2E_PORT`: K 4173, E 4191, C 4192, P 4193 y A 4194. El barrido usa 4501 y 4502; la comparación del HTML, 4503 y 4504.

**Un solo PR.** Todas las tareas van en un PR, con la red primero: los commits de T003 a T008 abren la rama (FR-006).

## Lo compartido con F3, F4 y F8

F9 se integra de a uno con F3, F4 y F8 (FR-045). T001 mira qué ya está en `master` y anota en research.md, en «Línea base de la implementación», qué rama de cada fila aplica. El código de cada tarea trae la rama «F9 primero»; la otra rama dice qué cambia. Con F4 y #67 en la base (`431c9d90`), las filas de la suscripción, la operación de alternar, la pila y `boot-check` ya están en la rama «después», y el código de sus tareas trae esa rama (research.md, R17).

| Pieza | Si F9 entra primero | Si F9 entra después | Cómo se detecta |
| --- | --- | --- | --- |
| La suscripción del shell (FR-022; F3 FR-014; F4 FR-011) | No aplica: F4 ya entró y se suscribió con `updateSaveLabel` (`frontend/app.js:29`) | T018 borra la línea de F4 y agrega `routeStore.changes.subscribe(() => syncShell());` antes del `render();` final de `startApp()`; si ya es `syncShell`, no toca nada. Saca las llamadas a `updateSaveLabel()` que quedan redundantes, salvo que F8 ya lo haya hecho | `grep -n "routeStore.changes.subscribe\|updateSaveLabel()" frontend/app.js` |
| La operación de alternar (F4 FR-036) | No aplica: F4 ya entró y dejó `routeStore.toggleMark(collection, id)` en `entities/guide` | `toggleStep` llama `store.toggleMark('completed', stepId)`; F9 no crea `toggleRouteItem`. `toggleItem` de `app.js`: si F3 ya entró, T018 la borra (no le quedan llamadas); si no, la deja para la rama `favorite` y la borra F3 | `grep -n "toggleMark" frontend/src/entities/guide/model/route-store.ts` y `grep -n "toggleItem(" frontend/app.js` |
| Los selectores de pasos | T011 y T012 los crean y T018 los usa en `app.js` | Si otro ítem ya los creó con otro nombre, se usan esos y no se duplican | `grep -n "trackSteps\|nextPendingStep" frontend/src/entities/guide/index.ts` |
| Los bloques compartidos de CSS (X3) | T010 saca las reglas del Recorrido de los `@media` de 1550, 1150, 850 y 590 px, que conservan las demás reglas, y parte las dos reglas de impresión | T010 rebasa: ubica cada regla por su texto en el `styles.css` vigente, saca sólo las del Recorrido y quita `.focus-timer` y `.module` de las reglas de impresión que queden; los selectores de otras páginas ya pueden no estar | `git log --oneline -- frontend/styles.css` |
| La pila de componentes (ADR 0008) | No aplica: llegó con #67 (proyectos `node` y `dom`, setup `frontend/src/vitest.setup.ts`) | T002 sólo verifica la pila y, si ni F5 ni F6 la trajeron, agrega la guarda de `useStore` de F6. No pide nada | `grep -n "name: 'dom'" frontend/vitest.config.ts` y `grep -n "callee.name='useStore'" eslint.config.ts` |
| `boot-check` (FR-044) | No aplica: F4 ya dejó `mountedText` y la condición `atlas \|\| proyecto` | T017 usa la forma canónica: el conjunto `REACT_VIEWS` (lo crea con `atlas`, `proyecto` y `recorrido` si encuentra la condición de F4, o le suma `recorrido` si ya está) y `mountedText` de F4 en las cinco lecturas; no agrega ayudantes a `qa/lib/fake-dom.ts` | `grep -nE "REACT_VIEWS\|function mountedText\|innerHTML" qa/boot-check.ts` |
| El escenario «almacén» de `app-shell-check` | T018 saca la parte del paso y renombra el escenario | Si F3 y F8 ya sacaron sus partes, T018 retira el escenario entero; si sólo una, saca la del paso y deja la otra | Leer el escenario en `qa/app-shell-check.ts` |
| El patrón `store` por prop de las specs de componente | T015 y T016 lo fijan | Lo siguen | Leer la página que entró antes |
| `resetTimer` (F8-Q2) | Rama A: `TallerRoute` publica `resetTimer` y `sessionResets` lo llama | Rama B, si F8 ya entró: el armado de `src/app/` importa `focusTimer` y `TallerRoute` publica dos métodos | `ls frontend/src/app/*.ts` y `grep -n "sessionResets\|timer" frontend/app.js frontend/src/app/*.ts` |
| El Page Object de Método | Si F5 todavía no entró, T003 crea `qa/e2e/pages/method.ts` con la clase de F5 (`resetProgress()` y `confirmReset()`) más `resetAllProgress` e `importCopy` | F5 lo creó: T003 le suma `resetAllProgress` e `importCopy`. Si F8 ya lo reemplazó, T003 usa el suyo. Si «Borrar todo» ya pide la contraseña y el servidor (F8-Q1), T006 usa su flujo con el doble de la API de F11a | `ls qa/e2e/pages/` y `grep -n "confirmReset\|resetEverything" qa/e2e/pages/method.ts` |

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y la constitución;
  - la spec (FR-001 a FR-046) y research.md;
  - tu tarea;
  - las skills `tdd`, `clean-code`, `vitest` y, para E2E, `playwright-best-practices`.
- **TDD, siempre:**
  - Cada módulo nuevo empieza con su firma lanzando `throw new Error('not implemented')`, para que su spec falle por comportamiento y no por un import. **Los stubs del rojo van como `const` tipados** (TR-2): el prefijo `_` no silencia `no-unused-vars` en este repositorio, así que el stub no declara parámetros. Una función, `export const trackSteps: (track: GuideTrack) => GuideStep[] = () => { throw new Error('not implemented'); };`; un componente, `const RoutePage: FunctionComponent<RoutePageProps> = () => { throw new Error('not implemented'); };`, con `import type { FunctionComponent } from 'react';` y su `export default`. La implementación vuelve a la forma de la sección de la tarea (`export function …` o el componente con sus props).
  - La spec en rojo y su implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
  - Si una prueba que ya existe falla, el error está en el código nuevo: su valor esperado no se toca.
  - Los valores esperados salen de `content/guide/`, de las fixtures congeladas o de un ejemplo resuelto a mano.
- **Mover no reescribe.** Las reglas de CSS se mudan enteras, con su texto. Lo que se saca de `app.js` no se corrige de paso:
  - el `<body>` con `aria-pressed`;
  - la complejidad de `syncLinkedLanguage`;
  - las rarezas con `KNOWN DEFECT`.
- **Archivos ajenos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline` y `npm run test:unit -- <ruta>`;
  - `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`);
  - `npm run typecheck`, `npm run lint` y `npm run format:check`;
  - `npm run build` y después `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Estilo:**
  - el código, los nombres de test y los mensajes de error para desarrolladores, en inglés; los textos que lee el alumno, en español rioplatense y con el texto exacto de hoy;
  - **sin comentarios;**
  - `interface` para formas y props;
  - componentes como `const` con `export default` al final y el archivo con su nombre;
  - exports nombrados en el modelo;
  - ningún `useStore` sin selector;
  - ningún `style=`;
  - ninguna memoización.
- **Commits** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(e2e): …`, `test(front): …` o `test(qa): …` para lo rojo y para la red;
  - `refactor(front): …` para mover;
  - `feat(front): …` para el port;
  - `build(front): …` para la guarda de `useStore`, si T002 la suma.
- **Al terminar,** informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Línea base, ramas y pila (coordinador K, onda 0)

**Cubre:** FR-003, FR-004, FR-045; SC-008 y SC-011.

### Tarea 0.1 · La línea base y las ramas (T001)

- **Quién y cuándo:** K, sobre la base de implementación (`master` desde `431c9d90`, con F2a, A2, F2b, la pila de #67, el tope de #76 y F4 de #77; y F3, F5, F6 u F8 si entraron antes), antes de cualquier cambio.
- **Entrega:** un commit de documentación que agrega a [research.md](./research.md) la sección «Línea base de la implementación», con los valores y las ramas.
- **Pasos:**
  1. `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`: todo en verde. Si algo falla, F9 no empieza.
  2. Anotar los valores de quickstart §1:
     - el hash de la base;
     - `html.length` de `dist/index.html`, y `BOOT_SIZE_LIMIT` de `qa/build-check.ts` (1 500 000 desde #76);
     - la cantidad de `import(` y de `import.meta` del script del dist, que es la base de la compuerta de TR-4;
     - los hashes del script, el estilo y el marcado del dist;
     - los avisos de lint, con la complejidad de `render()` de `app.js`;
     - la cantidad de E2E y de escenarios de `boot-check` y `app-shell-check`;
     - la cantidad de pruebas de Vitest.
  3. Correr los comandos de detección de «Lo compartido con F3, F4 y F8» y anotar la rama de cada fila.
  4. Crear el worktree de la base para las comparaciones (quickstart §1.2): `git worktree add ../f9-base <hash>`; adentro, `npm ci --offline` y `npm run build`.
  5. Con permiso, `docker compose build taller`, e informar el resultado.
- **Compuerta:** los pasos 1 a 4, con los valores anotados.
- **Vuelta atrás:** revertí el commit; nada depende de él.

### Tarea 0.2 · La pila de pruebas de componentes (T002)

- **La pila ya está en la base** (#67, `7aa96018`): `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7, `@testing-library/jest-dom` 7.0.1 y `fishery` 2.4.0, en `devDependencies`; `frontend/vitest.config.ts` con los proyectos `node` (`**/*.spec.ts`) y `dom` (entorno jsdom, `**/*.spec.tsx`); y el setup `frontend/src/vitest.setup.ts`, que suma jest-dom y llama a `cleanup()`. F9 no instala nada, no pide permiso, no crea `frontend/src/app/test-setup.ts` y no toca `frontend/vitest.config.ts`. Sus specs `*.spec.tsx` corren en el proyecto `dom`.
- **La verificación:**
  1. `npm ls jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom` lista las versiones de arriba.
  2. `grep -n "name: 'dom'" frontend/vitest.config.ts` y `test -f frontend/src/vitest.setup.ts` imprimen algo.

  Si falta algo, es un hallazgo: K lo informa al coordinador y no lo instala por su cuenta.
- **La guarda de `useStore`** (SC-011) es el bloque canónico de F6 (`impl-f6`, `b20028be`, `eslint.config.ts:43-54`, commit `e30ad0bf`), que F5 copió igual (`impl-f5`, `efaf39b2`, commit `c6e7ebda`). F4 usa `useStore` y no la trajo: entra con F5 o con F6, el que llegue primero.
  - **Si T001 la encontró:** no se cambia nada; se corre sólo la verificación del paso 2 de abajo.
  - **Si falta:**
    1. K suma este bloque exacto en `eslint.config.ts`, **inmediatamente antes del bloque de `complexity`**, con el mismo selector y el mismo mensaje, sin variantes:

       ```ts
       {
         files: ['frontend/src/**/*.{ts,tsx}'],
         rules: {
           'no-restricted-syntax': [
             'error',
             {
               selector: "CallExpression[callee.name='useStore'][arguments.length=1]",
               message: 'useStore needs a selector: without one it subscribes to the whole store.',
             },
           ],
         },
       },
       ```

    2. **La verificación de la guarda.** Escribir un archivo descartable `frontend/src/lint-probe.ts` con `import { useStore } from 'zustand'; import { createStore } from 'zustand/vanilla'; export const probe = () => useStore(createStore(() => ({ a: 1 })));`. `npx eslint frontend/src/lint-probe.ts` tiene que dar el error con el mensaje de arriba. Al final, borrar el archivo.
    3. **Los checks:** `npm run test:unit` (los dos proyectos, con la misma cantidad de pruebas que en T001), `npm run typecheck` y `npm run lint`.
    4. **El commit:** `build(front): la guarda de useStore sin selector, el bloque de F6`.
- **Vuelta atrás:** revertí el commit, si lo hubo.

## 1. La red del Recorrido contra el legacy (dueño E, onda 1)

**Cubre:** FR-001, FR-016, FR-020 a FR-022, FR-024, FR-025, FR-028 a FR-031, FR-033 a FR-036, FR-038, FR-040 (`KNOWN DEFECT`) y FR-043; US1 a US4; SC-002 y SC-004.

**Contra qué corre:** el `dist/` de la base, con `npm run build`. Las specs de T004 a T007 pasan contra el legacy y las de T008 fallan contra el legacy por la razón que dice cada una. Ninguna se edita después.

### Tarea 1.1 · Los Page Objects, las fixtures y los datos (T003)

**Crea** `qa/e2e/lib/route-progress.ts`:

```ts
import type { Language } from './curriculum';

export const RUST_MODULES = [
  'Ganá confianza con el compilador',
  'Construí tu almacén clave-valor',
  'Mirá qué pasa en disco y en el tiempo',
  'Abrí la puerta a las redes',
] as const;

export const RUST_STEPS = [
  { id: 'rust-first-session', title: 'Tu primer cambio comprobable' },
  { id: 'rust-ownership', title: 'Seguí el recorrido de un valor' },
  { id: 'rust-errors', title: 'Tratamiento de entradas inválidas' },
  { id: 'rust-kv-memory', title: 'Guardá y recuperá dos valores' },
  { id: 'rust-kv-cli', title: 'Dale una conversación por terminal' },
  { id: 'rust-kv-tests', title: 'Protegé las decisiones con tests' },
  { id: 'rust-save', title: 'Guardá una foto del almacén' },
  { id: 'rust-load', title: 'Reiniciá sin perder el estado' },
  { id: 'rust-measure', title: 'Medí antes de optimizar' },
  { id: 'rust-protocol', title: 'Especificá antes de conectar' },
  { id: 'rust-local-server', title: 'Atendé una conexión local' },
  { id: 'rust-next-challenge', title: 'Elegí tu próximo problema real' },
] as const;

export const ROUTE_KEYS = [
  'version',
  'language',
  'completed',
  'milestones',
  'favorites',
  'quizAnswers',
  'notes',
  'minutes',
];

interface RouteSeed {
  language?: Language;
  completed?: string[];
  quizAnswers?: Record<string, number>;
  minutes?: number;
}

export function routeProgress(seed: RouteSeed = {}): string {
  return JSON.stringify({
    version: 1,
    language: seed.language ?? 'rust',
    completed: seed.completed ?? [],
    milestones: [],
    favorites: [],
    quizAnswers: seed.quizAnswers ?? {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: seed.minutes ?? 25,
  });
}
```

**Crea** `qa/e2e/pages/route.ts`:

```ts
import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class RoutePage {
  readonly card: Locator;
  readonly lesson: Locator;

  constructor(readonly page: Page) {
    this.card = page.getByRole('region', { name: 'Sesión de hoy' });
    this.lesson = page.getByRole('dialog');
  }

  nextStepLabel(): Locator {
    return this.card.getByText(/^TU (PRÓXIMO PASO · \d{2} \/ \d+|SIGUIENTE EXPERIMENTO)$/);
  }

  nextStepTitle(): Locator {
    return this.card.getByRole('heading', { level: 2 });
  }

  startSession(): Locator {
    return this.card.getByRole('button', { name: 'Empezar esta sesión' });
  }

  continueProject(): Locator {
    return this.card.getByRole('link', { name: 'Continuar mi proyecto' });
  }

  completedCounter(): Locator {
    return this.page.getByText(/^\d+ DE \d+ COMPLETADOS$/);
  }

  completionBanner(): Locator {
    return this.page.getByText(/^Completaste tu recorrido inicial\./);
  }

  module(title: string): Locator {
    return this.page
      .locator('details.module')
      .filter({ has: this.page.getByText(title, { exact: true }) });
  }

  moduleSummary(title: string): Locator {
    return this.module(title).locator('summary');
  }

  moduleCount(title: string): Locator {
    return this.module(title).getByText(/^\d+\/\d+$/);
  }

  stepCheckbox(title: string): Locator {
    return this.page.getByRole('checkbox', {
      name: `Marcar como completado: ${title}`,
      exact: true,
    });
  }

  stepTitle(title: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(title)}`) });
  }

  stepOpen(title: string): Locator {
    return this.page.getByRole('button', { name: `Abrir ${title}`, exact: true });
  }

  lessonLabel(): Locator {
    return this.lesson.getByText(/· UNA SESIÓN ORIENTATIVA$/);
  }

  lessonClose(): Locator {
    return this.lesson.getByRole('button', { name: 'Cerrar sesión' });
  }

  continueLater(): Locator {
    return this.lesson.getByRole('button', { name: 'Seguir después' });
  }

  markDone(): Locator {
    return this.lesson.getByRole('button', { name: 'Marcar como hecho' });
  }

  practiceAgain(): Locator {
    return this.lesson.getByRole('button', { name: 'Volver a practicar' });
  }

  quizOption(text: string): Locator {
    return this.lesson.getByRole('button', { name: new RegExp(`${escapeRegExp(text)}$`) });
  }

  quizFeedback(): Locator {
    return this.lesson.getByRole('status');
  }

  lessonResources(): Locator {
    return this.lesson.getByRole('link');
  }

  timer(): Locator {
    return this.page.getByRole('timer', { name: 'Tiempo restante' });
  }

  duration(minutes: 15 | 25 | 45): Locator {
    return this.page
      .getByRole('group', { name: 'Duración de la sesión' })
      .getByRole('button', { name: `${minutes} min`, exact: true });
  }

  timerButton(label: 'Iniciar foco' | 'Pausar' | 'Continuar'): Locator {
    return this.page.getByRole('button', { name: label, exact: true });
  }

  resetTimer(): Locator {
    return this.page.getByRole('button', { name: 'Reiniciar temporizador' });
  }

  codeArt(): Locator {
    return this.page.locator(
      '[aria-label="Ilustración de código, no es un ejercicio ejecutable"]',
    );
  }

  libraryLink(): Locator {
    return this.page.getByRole('link', { name: 'Explorá la biblioteca' });
  }

  sidebarCompleted(): Locator {
    return this.page.locator('#sidebar-completed');
  }

  sidebarPercent(): Locator {
    return this.page.locator('#sidebar-percent');
  }

  async focusMain(): Promise<void> {
    await this.page.locator('#main').focus();
  }

  async scrollY(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  async focusIsInsideLessonOrNowhere(): Promise<boolean> {
    return this.page.evaluate(() => {
      const active = document.activeElement;
      return active === null || active === document.body || active.closest('dialog[open]') !== null;
    });
  }

  async exportProgress(): Promise<Record<string, unknown>> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByRole('button', { name: 'Exportar mi progreso' }).click(),
    ]);
    return JSON.parse(await readFile(await download.path(), 'utf8')) as Record<string, unknown>;
  }
}
```

**`qa/e2e/pages/method.ts` ya existe: lo creó F5** (`impl-f5`, commit `d7944d81`, en `efaf39b2`), con la clase `MethodPage`, dos localizadores, `resetProgress()` y `confirmReset()`, y la fixture `method` en `qa/e2e/fixtures/index.ts`; `systems.spec.ts` los usa. F9 **lo extiende**: suma `resetAllProgress()` e `importCopy()` a esa clase, sin recrear el archivo y sin cambiar los dos métodos de F5. `resetAllProgress()` reusa los localizadores de F5.

- **Si el archivo está** (F5 entró antes): después de `confirmReset()` se suman los dos métodos de abajo, y nada más.
- **Si F9 entra antes que F5:** se crea el archivo entero de abajo, que es la clase de F5 tal cual más los dos métodos, para que el rebase de F5 encuentre lo mismo.
- **Si F8 ya entró:** su B4 reemplaza el Page Object y lleva los E2E a `method.resetEverything()`; T006 usa los métodos equivalentes del suyo.

```ts
import type { Locator, Page } from '@playwright/test';

export class MethodPage {
  constructor(readonly page: Page) {}

  resetProgress(): Locator {
    return this.page.getByRole('button', { name: 'Borrar mi progreso' });
  }

  confirmReset(): Locator {
    return this.page
      .getByRole('dialog', { name: '¿Borrar tu progreso?' })
      .getByRole('button', { name: 'Borrar todo' });
  }

  async resetAllProgress(): Promise<void> {
    await this.resetProgress().click();
    await this.confirmReset().click();
  }

  async importCopy(text: string): Promise<void> {
    await this.page.locator('#import-file').setInputFiles({
      name: 'taller-progreso.json',
      mimeType: 'application/json',
      buffer: Buffer.from(text, 'utf8'),
    });
  }
}
```

**Cambia** `qa/e2e/fixtures/index.ts`:

- importa `RoutePage` de `'../pages/route'` y, si F5 no lo hizo, `MethodPage` de `'../pages/method'`;
- suma `route: RoutePage;` a `Fixtures` y, si F5 no lo hizo, `method: MethodPage;`;
- en `base.extend`, después de `atlas`, suma la fixture `route` y, si F5 no la sumó, la de `method`:

```ts
  route: async ({ page }, use) => use(new RoutePage(page)),
  method: async ({ page }, use) => use(new MethodPage(page)),
```
**Pasos:**

1. `npm run typecheck`.
2. Un commit: `test(e2e): Page Objects del Recorrido y de Método`.

**Vuelta atrás:** revertí el commit.

### Tarea 1.2 · Los pasos (T004, verde contra el legacy)

**Crea** `qa/e2e/specs/route-steps.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { RUST_MODULES, RUST_STEPS, routeProgress } from '../lib/route-progress';
import { urls } from '../lib/urls';

const [FIRST, SECOND, THIRD] = RUST_STEPS;

test.describe('the steps of the route', () => {
  test('an empty browser shows the first step, the counters and only the first module open', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await expect(shell.heading('recorrido')).toBeVisible();
    await expect(route.nextStepLabel()).toHaveText('TU PRÓXIMO PASO · 01 / 12');
    await expect(route.nextStepTitle()).toHaveText(FIRST.title);
    await expect(route.completedCounter()).toHaveText('0 DE 12 COMPLETADOS');
    await expect(route.module(RUST_MODULES[0])).toHaveAttribute('open', '');
    await expect(route.moduleCount(RUST_MODULES[0])).toHaveText('0/3');
    for (const title of RUST_MODULES.slice(1)) {
      await expect(route.module(title)).not.toHaveAttribute('open');
    }
    await expect(route.sidebarCompleted()).toHaveText('0 de 12');
  });

  test('checking the first step updates the counters, the card and the sidebar with one write', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await route.stepCheckbox(FIRST.title).check();

    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(route.moduleCount(RUST_MODULES[0])).toHaveText('1/3');
    await expect(route.nextStepLabel()).toHaveText('TU PRÓXIMO PASO · 02 / 12');
    await expect(route.nextStepTitle()).toHaveText(SECOND.title);
    await expect(route.sidebarCompleted()).toHaveText('1 de 12');
    await expect(route.sidebarPercent()).toHaveText('8%');
    await expect(route.stepCheckbox(FIRST.title)).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(stored.completed).toEqual(['rust-first-session']);

    await page.reload();
    await expect(route.stepCheckbox(FIRST.title)).toBeChecked();
  });

  test('the frozen progress of master shows the Go route quietly and the Rust one after switching', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await expect(route.nextStepLabel()).toHaveText('TU PRÓXIMO PASO · 01 / 12');
    await expect(route.nextStepTitle()).toHaveText('Modificá tu primer ejemplo');
    expect(await storage.writes()).toEqual([]);
    await expect(shell.toast).toHaveText('');

    await shell.switchLanguage('rust');

    await expect(route.completedCounter()).toHaveText('2 DE 12 COMPLETADOS');
    await expect(route.nextStepLabel()).toHaveText('TU PRÓXIMO PASO · 03 / 12');
    await expect(route.nextStepTitle()).toHaveText(THIRD.title);
    await expect(shell.toast).toHaveText('Recorrido de Rust. Tu otro avance sigue guardado.');
  });

  test('with every step done the banner appears, the last module opens and the card leads to the project', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.seed({
      'taller-learning-v1': routeProgress({ completed: RUST_STEPS.map((step) => step.id) }),
    });
    await shell.goto(urls.view('recorrido'));

    await expect(route.completionBanner()).toBeVisible();
    await expect(route.nextStepLabel()).toHaveText('TU SIGUIENTE EXPERIMENTO');
    await expect(route.module(RUST_MODULES[3])).toHaveAttribute('open', '');
    await route.continueProject().click();

    await expect(page).toHaveURL(urls.view('proyecto'));
    await expect(shell.heading('proyecto')).toBeVisible();
  });

  test('a hash navigation away and back shows the saved progress and marks the menu', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed({ 'taller-learning-v1': routeProgress({ completed: [FIRST.id] }) });
    await shell.goto(urls.view('recorrido'));

    await shell.openFromMenu('biblioteca');
    await shell.openFromMenu('recorrido');

    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(route.stepCheckbox(FIRST.title)).toBeChecked();
    await expect(shell.menuLink('recorrido')).toHaveAttribute('aria-current', 'page');
  });

  test('the keyboard opens the modules, checks a step, opens a lesson and chooses a duration', async ({
    shell,
    route,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await route.moduleSummary(RUST_MODULES[1]).focus();
    await page.keyboard.press('Enter');
    await expect(route.module(RUST_MODULES[1])).toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(route.module(RUST_MODULES[1])).not.toHaveAttribute('open');

    await route.stepCheckbox(FIRST.title).focus();
    await page.keyboard.press('Space');
    await expect(route.stepCheckbox(FIRST.title)).toBeChecked();

    await route.stepTitle(SECOND.title).focus();
    await page.keyboard.press('Enter');
    await expect(route.lesson).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(route.lesson).toBeHidden();

    await route.duration(45).focus();
    await page.keyboard.press('Space');
    await expect(route.duration(45)).toHaveAttribute('aria-pressed', 'true');
  });

  test('the tab order of the page is the one of today', async ({ shell, route, page }) => {
    await shell.goto(urls.view('recorrido'));
    const order = [
      route.startSession(),
      route.duration(15),
      route.duration(25),
      route.duration(45),
      route.timerButton('Iniciar foco'),
      route.resetTimer(),
      route.moduleSummary(RUST_MODULES[0]),
      ...[FIRST, SECOND, THIRD].flatMap((step) => [
        route.stepCheckbox(step.title),
        route.stepTitle(step.title),
        route.stepOpen(step.title),
      ]),
      route.moduleSummary(RUST_MODULES[1]),
      route.moduleSummary(RUST_MODULES[2]),
      route.moduleSummary(RUST_MODULES[3]),
      route.libraryLink(),
    ];

    await route.focusMain();
    for (const element of order) {
      await page.keyboard.press('Tab');
      await expect(element).toBeFocused();
    }
  });

  test('printing hides the focus timer and keeps the next step', async ({ shell, route, page }) => {
    await shell.goto(urls.view('recorrido'));

    await page.emulateMedia({ media: 'print' });

    await expect(route.timer()).toBeHidden();
    await expect(route.nextStepTitle()).toBeVisible();
  });

  test('KNOWN DEFECT the code illustration has an aria-label without a role (spec F9, FR-040)', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await expect(route.codeArt()).toBeVisible();
    await expect(route.codeArt()).not.toHaveAttribute('role');
  });
});
```

**Pasos:**

1. `npm run build` en la base y `E2E_PORT=4191 npm run test:e2e -- specs/route-steps.spec.ts`: 9 de 9.
2. **Si una prueba falla contra el legacy:**
   - **si la causa es el localizador,** se corrige el Page Object;
   - **si la causa es el valor esperado,** el valor sale del contrato y se revisa contra `content/guide/`. Si el legacy hace otra cosa, la diferencia se informa al coordinador antes de seguir, porque puede ser una rareza que lleva `KNOWN DEFECT`.
   - **El caso previsible es la casilla con Enter:** Enter no marca una casilla en Chrome, por eso la prueba usa Espacio. FR-038 dice «Enter y Espacio», y el E2E fija lo que hace hoy el navegador (hallazgo del analyze).
3. `--repeat-each=3 --retries=0` sobre el archivo: 27 de 27.
4. Un commit: `test(e2e): los pasos del Recorrido, contra el legacy`.

### Tarea 1.3 · La lección (T005, verde contra el legacy)

**Crea** `qa/e2e/specs/route-lesson.spec.ts`:

```ts
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { RUST_STEPS, routeProgress } from '../lib/route-progress';
import { urls } from '../lib/urls';
import type { RoutePage } from '../pages/route';

const [FIRST, SECOND] = RUST_STEPS;
const RIGHT = 'Ese caso comprobó la propiedad expresada por el test.';
const WRONG = 'El programa es correcto para cualquier entrada.';
const EXPLANATION =
  'Un test verifica un caso y sus condiciones. Todavía pueden faltar entradas, propiedades y comportamientos por cubrir.';

const OPENERS = [
  { name: 'the card', locate: (route: RoutePage) => route.startSession() },
  { name: 'the step title', locate: (route: RoutePage) => route.stepTitle(FIRST.title) },
  { name: 'the arrow', locate: (route: RoutePage) => route.stepOpen(FIRST.title) },
];

const CLOSERS = [
  { name: '×', close: (route: RoutePage) => route.lessonClose().click() },
  { name: 'Seguir después', close: (route: RoutePage) => route.continueLater().click() },
  { name: 'Escape', close: (route: RoutePage, page: Page) => page.keyboard.press('Escape') },
];

test.describe('the lesson', () => {
  test('opened from the card it shows its content and focuses the close button', async ({
    shell,
    route,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await route.startSession().click();

    await expect(page.getByRole('dialog', { name: FIRST.title })).toBeVisible();
    await expect(route.lessonLabel()).toHaveText('RUST · UNA SESIÓN ORIENTATIVA');
    await expect(
      route.lesson.getByText(
        'Arrancar con una victoria pequeña y aprender a leer el resultado de un test.',
      ),
    ).toBeVisible();
    await expect(route.lesson.getByRole('heading', { name: 'Tu desafío' })).toBeVisible();
    await expect(route.lesson.getByText('LO LOGRASTE CUANDO')).toBeVisible();
    await expect(route.lessonResources()).toHaveText([
      '100 Exercises to Learn Rust ↗',
      '100 Exercises en RustRover ↗',
    ]);
    for (const link of await route.lessonResources().all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await expect(
      route.lesson.getByRole('heading', {
        name: 'Antes de seguir: Un test acaba de pasar. ¿Qué conclusión está justificada?',
      }),
    ).toBeVisible();
    await expect(route.quizOption(WRONG)).toHaveAttribute('aria-pressed', 'false');
    await expect(route.quizOption(RIGHT)).toHaveAttribute('aria-pressed', 'false');
    await expect(
      route.quizOption('La implementación ya es la más rápida posible.'),
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(route.quizFeedback()).toBeHidden();
    await expect(route.markDone()).toBeVisible();
    await expect(route.lessonClose()).toBeFocused();
  });

  test('answering B marks it, explains it and writes once; answering A asks to review', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));
    await route.startSession().click();

    await route.quizOption(RIGHT).click();

    await expect(route.quizOption(RIGHT)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.quizFeedback()).toHaveText(`Bien pensado. ${EXPLANATION}`);
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(stored.quizAnswers).toEqual({ 'rust-first-session': 1 });

    await route.quizOption(WRONG).click();

    await expect(route.quizOption(WRONG)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.quizOption(RIGHT)).toHaveAttribute('aria-pressed', 'false');
    await expect(route.quizFeedback()).toHaveText(`Revisemos la idea. ${EXPLANATION}`);
  });

  test('with the frozen progress in Rust the answered and completed lesson opens as it was left', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await shell.goto(urls.view('recorrido'));
    await shell.switchLanguage('rust');

    await route.stepTitle(FIRST.title).click();

    await expect(route.quizOption(RIGHT)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.quizFeedback()).toHaveText(`Bien pensado. ${EXPLANATION}`);
    await expect(route.practiceAgain()).toBeVisible();
  });

  for (const opener of OPENERS) {
    for (const closer of CLOSERS) {
      test(`closed with ${closer.name} after opening it from ${opener.name}, the focus goes back without scrolling or writing`, async ({
        shell,
        route,
        storage,
        page,
      }) => {
        await storage.watchWrites();
        await shell.goto(urls.view('recorrido'));
        const button = opener.locate(route);
        await button.scrollIntoViewIfNeeded();
        const scroll = await route.scrollY();

        await button.click();
        await expect(route.lesson).toBeVisible();
        await closer.close(route, page);

        await expect(route.lesson).toBeHidden();
        await expect(button).toBeFocused();
        expect(await route.scrollY()).toBe(scroll);
        expect(await storage.writes()).toEqual([]);
      });
    }
  }

  test('a click on the backdrop does not close it', async ({ shell, route, page }) => {
    await shell.goto(urls.view('recorrido'));
    await route.startSession().click();

    await page.mouse.click(5, 5);

    await expect(route.lesson).toBeVisible();
  });

  test('completing a step opened from its title writes once, announces it and keeps the focus on the title', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await route.stepTitle(SECOND.title).click();
    await route.markDone().click();

    await expect(route.lesson).toBeHidden();
    await expect(route.stepCheckbox(SECOND.title)).toBeChecked();
    await expect(shell.toast).toHaveText('Un paso más. Dejá una nota para tu próxima sesión.');
    await expect(route.nextStepTitle()).toHaveText(FIRST.title);
    await expect(route.stepTitle(SECOND.title)).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
  });

  test('KNOWN DEFECT «Volver a practicar» reviews nothing: it marks the step pending (spec F9, FR-035)', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed({ 'taller-learning-v1': routeProgress({ completed: [SECOND.id] }) });
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await route.stepTitle(SECOND.title).click();
    await route.practiceAgain().click();

    await expect(route.lesson).toBeHidden();
    await expect(route.stepCheckbox(SECOND.title)).not.toBeChecked();
    await expect(shell.toast).toHaveText('Paso disponible para volver a practicar.');
    await expect(route.stepTitle(SECOND.title)).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(stored.completed).toEqual([]);
  });

  test('Tab and Shift+Tab keep the focus inside the lesson', async ({ shell, route, page }) => {
    await shell.goto(urls.view('recorrido'));
    await route.startSession().click();

    for (let press = 0; press < 10; press++) {
      await page.keyboard.press('Tab');
      expect(await route.focusIsInsideLessonOrNowhere()).toBe(true);
    }
    for (let press = 0; press < 10; press++) {
      await page.keyboard.press('Shift+Tab');
      expect(await route.focusIsInsideLessonOrNowhere()).toBe(true);
    }
  });
});
```

**Por qué estos dos casos pasan contra el legacy:**

- **Completar desde el título del segundo paso:** el próximo paso sigue siendo el primero, así que la tarjeta no tiene un botón de `rust-ownership`, y `restoreStepFocus` encuentra el título.
- **La rareza de «Volver a practicar»:** el paso reabierto no pasa a ser el próximo, porque el primero sigue pendiente.

Los casos en que el foco de hoy va a otro lado están en T008.

**Pasos:**

1. `E2E_PORT=4191 npm run test:e2e -- specs/route-lesson.spec.ts` contra la base: 16 de 16. Son 3 de contenido, 9 combinaciones de abridor y cierre, el fondo, el de completar, la rareza y el de Tab.
2. Si el foco al abrir no es «×», se informa al coordinador: es lo que la spec dejó «a fijar contra el legacy» (FR-036) y se escribe lo que hace hoy.
3. `--repeat-each=3 --retries=0`.
4. Un commit: `test(e2e): la lección del Recorrido, contra el legacy`.

### Tarea 1.4 · El temporizador (T006, verde contra el legacy)

**Crea** `qa/e2e/specs/route-timer.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

const FINISHED = 'Terminó tu rato de foco. Anotá qué entendiste y por dónde seguir.';
const FROZEN_EXPORT = readFileSync(
  resolve(import.meta.dirname, '../../fixtures/progress-master-2a278ad-export.json'),
  'utf8',
);

async function pauseTheClock(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-10-05T12:00:00-03:00') });
  await page.clock.pauseAt(new Date('2026-10-05T12:00:01-03:00'));
}

test.describe('the focus timer', () => {
  test('an empty browser rests at 25:00 and choosing 45 min writes once and leaves it stopped', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    await expect(route.duration(25)).toHaveAttribute('aria-pressed', 'true');

    await route.duration(45).click();

    await expect(route.timer()).toHaveText('45:00');
    await expect(route.duration(45)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.duration(25)).toHaveAttribute('aria-pressed', 'false');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(stored.minutes).toBe(45);
  });

  test('it counts once per second from the start, pauses, continues and resets without writing', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));

    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(999);
    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Pausar')).toBeVisible();
    await page.clock.runFor(1);
    await expect(route.timer()).toHaveText('24:59');
    await page.clock.runFor(59_000);
    await expect(route.timer()).toHaveText('24:00');

    await route.timerButton('Pausar').click();
    await expect(route.timerButton('Continuar')).toBeVisible();
    await page.clock.runFor(120_000);
    await expect(route.timer()).toHaveText('24:00');

    await route.timerButton('Continuar').click();
    await page.clock.runFor(60_000);
    await expect(route.timer()).toHaveText('23:00');

    await route.resetTimer().click();
    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    expect(await storage.writes()).toEqual([]);
  });

  test('a double click on «Iniciar foco» starts and pauses', async ({ shell, route, page }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));

    await route.timerButton('Iniciar foco').dblclick();
    await page.clock.runFor(60_000);

    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
  });

  test('it keeps running across a hash navigation', async ({ shell, route, page }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await shell.openFromMenu('biblioteca');
    await page.clock.runFor(60_000);
    await shell.openFromMenu('recorrido');

    await expect(route.timer()).toHaveText('23:00');
    await expect(route.timerButton('Pausar')).toBeVisible();
  });

  test('the end is announced once in #toast from another view and the route then reads 00:00', async ({
    shell,
    route,
    page,
  }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await shell.openFromMenu('biblioteca');

    await page.clock.runFor('25:00');
    await expect(shell.toast).toHaveText(FINISHED);
    await expect(shell.toast).toHaveClass(/visible/);
    await page.clock.runFor(5_000);
    await expect(shell.toast).not.toHaveClass(/visible/);
    await page.clock.runFor(60_000);
    await expect(shell.toast).not.toHaveClass(/visible/);

    await shell.openFromMenu('recorrido');
    await expect(route.timer()).toHaveText('00:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
  });

  test('switching the language keeps it running', async ({ shell, route, page }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await shell.switchLanguage('go');
    await expect(shell.toast).toHaveText('Recorrido de Go. Tu otro avance sigue guardado.');
    await page.clock.runFor(60_000);

    await expect(route.timer()).toHaveText('23:00');
    await expect(route.timerButton('Pausar')).toBeVisible();
  });

  test('importing a copy keeps it running', async ({ shell, route, method, page }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await shell.openFromMenu('metodo');
    await method.importCopy(FROZEN_EXPORT);
    await expect(shell.toast).toHaveText('Copia importada y combinada con tu avance actual.');
    await page.clock.runFor(60_000);
    await shell.openFromMenu('recorrido');

    await expect(route.timer()).toHaveText('23:00');
    await expect(route.timerButton('Pausar')).toBeVisible();
  });

  test('«Borrar todo» stops it and goes back to the 25 minutes of a blank route', async ({
    shell,
    route,
    method,
    page,
  }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.duration(45).click();
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await shell.openFromMenu('metodo');
    await method.resetAllProgress();
    await expect(shell.toast).toHaveText('Progreso reiniciado. Un nuevo comienzo.');
    await shell.openFromMenu('recorrido');

    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    await expect(route.duration(25)).toHaveAttribute('aria-pressed', 'true');
  });

  test('«Borrar todo» straight from #metodo works with a timer that was never shown', async ({
    shell,
    route,
    method,
  }) => {
    await shell.goto(urls.view('metodo'));

    await method.resetAllProgress();
    await expect(shell.toast).toHaveText('Progreso reiniciado. Un nuevo comienzo.');
    await shell.openFromMenu('recorrido');

    await expect(route.timer()).toHaveText('25:00');
  });

  test('KNOWN DEFECT choosing the duration already chosen writes again and restarts the running timer (spec F9, FR-020 and FR-028)', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await route.duration(25).click();

    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
  });

  test('KNOWN DEFECT the end of the focus time is announced over an open lesson (spec F9, FR-029)', async ({
    shell,
    route,
    page,
  }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(1_499_000);
    await route.startSession().click();

    await page.clock.runFor(1_000);

    await expect(shell.toast).toHaveText(FINISHED);
    await expect(route.lesson).toBeVisible();
  });
});
```

**Si F8 ya entró:**

- «Borrar todo» pide la contraseña y llama al servidor (F8-Q1). Las dos pruebas de «Borrar todo» usan el método de reinicio del Page Object de F8, con el doble de la API que deja F11a, y los textos de F8.
- `importCopy` también puede ser el de F8.

**Pasos:**

1. `E2E_PORT=4191 npm run test:e2e -- specs/route-timer.spec.ts` contra la base: 11 de 11.
2. `--repeat-each=3 --retries=0`.
3. Un commit: `test(e2e): el temporizador del Recorrido con page.clock, contra el legacy`.

### Tarea 1.5 · Lo guardado (T007, verde contra el legacy)

**Crea** `qa/e2e/specs/route-progress.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { frozenProgress, type StorageKey } from '../lib/curriculum';
import { ROUTE_KEYS, RUST_STEPS } from '../lib/route-progress';
import { urls } from '../lib/urls';

const [FIRST] = RUST_STEPS;
const RIGHT = 'Ese caso comprobó la propiedad expresada por el test.';

test.describe('what the route saves', () => {
  test('the frozen progress writes nothing while the timer runs and a lesson opens and closes', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.seed(frozenProgress);
    await storage.watchWrites();
    await page.clock.install({ time: new Date('2026-10-05T12:00:00-03:00') });
    await page.clock.pauseAt(new Date('2026-10-05T12:00:01-03:00'));
    await shell.goto(urls.view('recorrido'));

    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(5_000);
    await route.timerButton('Pausar').click();
    await route.stepTitle('Modificá tu primer ejemplo').click();
    await route.continueLater().click();

    expect(await storage.writes()).toEqual([]);
    const stored = await storage.snapshot();
    for (const key of Object.keys(frozenProgress) as StorageKey[]) {
      expect(stored[key]).toBe(frozenProgress[key]);
    }
    expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
    await expect(shell.toast).toHaveText('');
  });

  test('each action of the student writes the route once, with the keys of today', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));
    const actions = [
      () => route.stepCheckbox(FIRST.title).check(),
      () => route.stepCheckbox(FIRST.title).uncheck(),
      () => route.duration(45).click(),
      () => route.duration(45).click(),
      async () => {
        await route.stepTitle(FIRST.title).click();
        await route.quizOption(RIGHT).click();
      },
      () => route.markDone().click(),
      async () => {
        await route.stepTitle(FIRST.title).click();
        await route.practiceAgain().click();
      },
    ];

    for (const [index, act] of actions.entries()) {
      await act();
      await expect
        .poll(async () => (await storage.writes()).length)
        .toBe(index + 1);
    }

    expect(new Set(await storage.writes())).toEqual(new Set(['set taller-learning-v1']));
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(Object.keys(stored)).toEqual(ROUTE_KEYS);
    expect(stored.completed).toEqual([]);
    expect(stored.quizAnswers).toEqual({ 'rust-first-session': 1 });
    expect(stored.minutes).toBe(45);

    await page.reload();
    await expect(route.stepCheckbox(FIRST.title)).not.toBeChecked();
    await expect(route.duration(45)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.timer()).toHaveText('45:00');
  });

  test('with the storage blocked the route works and the footer asks to export', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.block();
    await shell.goto(urls.view('recorrido'));
    await expect(shell.toast).toHaveText(
      'No se pudo leer o guardar el avance. Podés exportarlo al terminar.',
    );

    await route.stepCheckbox(FIRST.title).check();

    await expect(route.stepCheckbox(FIRST.title)).toBeChecked();
    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
  });

  test('a step checked on the page travels in the export with the shape of today', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await route.stepCheckbox(FIRST.title).check();

    const exported = await route.exportProgress();

    expect(Object.keys(exported)).toEqual([
      ...ROUTE_KEYS,
      'lab',
      'campaign',
      'systems',
      'exportedAt',
    ]);
    expect(exported.completed).toEqual(['rust-first-session']);
  });
});
```

**Pasos:**

1. `E2E_PORT=4191 npm run test:e2e -- specs/route-progress.spec.ts` contra la base: 4 de 4.
2. **Si la exportación de un navegador vacío no trae alguna sección** (porque su `exportState` devuelve `undefined`), la lista esperada se ajusta a lo que exporta hoy el legacy. Se informa, porque US4-4 la nombra.
3. `--repeat-each=3 --retries=0`.
4. Un commit: `test(e2e): lo que guarda el Recorrido, contra el legacy`.

### Tarea 1.6 · Lo que adopta React, en rojo (T008)

**Crea** `qa/e2e/specs/route-kept-state.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { RUST_MODULES, RUST_STEPS, routeProgress } from '../lib/route-progress';
import { urls } from '../lib/urls';

const [FIRST, SECOND] = RUST_STEPS;

test.describe('what the page keeps because it is no longer rebuilt (X1 and Q4)', () => {
  test('a module opened by hand stays open when a step of another module is checked', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await route.moduleSummary(RUST_MODULES[1]).click();
    await expect(route.module(RUST_MODULES[1])).toHaveAttribute('open', '');

    await route.stepCheckbox(FIRST.title).check();

    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(route.module(RUST_MODULES[0])).toHaveAttribute('open', '');
    await expect(route.module(RUST_MODULES[1])).toHaveAttribute('open', '');
    await expect(route.module(RUST_MODULES[2])).not.toHaveAttribute('open');
    await expect(route.module(RUST_MODULES[3])).not.toHaveAttribute('open');
  });

  test('a module closed by hand stays closed when a step of another module is checked', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await route.moduleSummary(RUST_MODULES[1]).click();
    await route.moduleSummary(RUST_MODULES[0]).click();
    await expect(route.module(RUST_MODULES[0])).not.toHaveAttribute('open');

    await route.stepCheckbox(RUST_STEPS[3].title).check();

    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(route.module(RUST_MODULES[0])).not.toHaveAttribute('open');
    await expect(route.module(RUST_MODULES[1])).toHaveAttribute('open', '');
  });

  test('completing the lesson opened from the card returns the focus to the card button', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await route.startSession().click();
    await route.markDone().click();

    await expect(route.lesson).toBeHidden();
    await expect(route.nextStepTitle()).toHaveText(SECOND.title);
    await expect(route.startSession()).toBeFocused();
  });

  test('reopening a step that becomes the next one returns the focus to its title', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed({ 'taller-learning-v1': routeProgress({ completed: [FIRST.id] }) });
    await shell.goto(urls.view('recorrido'));

    await route.stepTitle(FIRST.title).click();
    await route.practiceAgain().click();

    await expect(route.lesson).toBeHidden();
    await expect(route.nextStepTitle()).toHaveText(FIRST.title);
    await expect(route.stepTitle(FIRST.title)).toBeFocused();
  });

  test('completing the last pending step from the card moves the focus to «Continuar mi proyecto»', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed({
      'taller-learning-v1': routeProgress({
        completed: RUST_STEPS.slice(0, 11).map((step) => step.id),
      }),
    });
    await shell.goto(urls.view('recorrido'));

    await route.startSession().click();
    await route.markDone().click();

    await expect(route.completionBanner()).toBeVisible();
    await expect(route.continueProject()).toBeFocused();
  });

  test('navigating back with the lesson open closes it', async ({ shell, route, page }) => {
    await shell.goto(urls.view('biblioteca'));
    await shell.openFromMenu('recorrido');
    await route.startSession().click();
    await expect(route.lesson).toBeVisible();

    await page.goBack();

    await expect(shell.heading('biblioteca')).toBeVisible();
    await expect(route.lesson).toBeHidden();
  });
});
```

**Pasos:**

1. `E2E_PORT=4191 npm run test:e2e -- specs/route-kept-state.spec.ts` contra la base: las 6 fallan, cada una en la aserción que fija el comportamiento nuevo:
   - los dos módulos fallan en el `open` del módulo que el alumno tocó;
   - los tres de foco fallan en `toBeFocused`: hoy el foco va al título, a la tarjeta y al título del último paso;
   - el de Atrás falla en `toBeHidden`.

   Si alguna falla antes de esa aserción, el error está en la prueba.
2. Un commit: `test(e2e): lo que adopta React en el Recorrido, X1 y Q4 (rojas)`.
3. **La compuerta de la red,** con T003 a T008:
   - 106 + 17 E2E de la red y los 40 nuevos de T004 a T007 en verde contra la base;
   - T008, 6 en rojo;
   - `npm run typecheck` y `npm run lint`.

**Vuelta atrás:** revertí el commit.

**La decisión 1 del informe:** la cuarta prueba fija el foco en «Continuar mi proyecto». Si el usuario elige conservar el destino de hoy, que es el título del paso con su módulo abierto, esa prueba cambia antes de T016.

### Tarea 1.7 · El lector de pantalla sobre el legacy (T009, usuario)

**Qué hace el usuario,** con un lector de pantalla (Orca en Linux o VoiceOver en macOS), sobre el build de la base servido con `npm run preview`:

1. abre la lección del primer paso;
2. responde B y anota qué se anuncia;
3. responde A y anota qué se anuncia;
4. la cierra, la vuelve a abrir y anota si se anuncia la devolución guardada.

Es la comprobación de X2 antes del port. K la anota en research.md.

## 2. El CSS del Recorrido en su hoja (dueño C, onda 1)

**Cubre:** FR-039, FR-041; SC-005.

### Tarea 2.1 · Mudar las reglas (T010)

**Cambia** `frontend/styles.css`. **Crea** `frontend/src/pages/route/ui/route.css`. **K** suma la línea de `main.tsx` en el mismo commit. **C** suma las dos restricciones de `qa/load-order-check.ts`.

**Pasos:**

1. **La base.** `npm run build` en el worktree de la base (T001) y en el tuyo antes de tocar nada.
2. **Las reglas base.** Cortar de `styles.css` las 71 reglas de la tabla «Base» de research.md («Mediciones de sólo lectura»), cada una con su texto exacto, y pegarlas al principio de `route.css` en el mismo orden.
3. **Los cuatro `@media`.** Para cada bloque de 1550, 1150, 850 px y el primero de 590 px, en ese orden:
   - cortar del bloque de `styles.css` las reglas del Recorrido de la tabla;
   - dejar en ese bloque las demás reglas, en su orden;
   - pegar las del Recorrido, en su orden, dentro de un bloque nuevo con la misma condición al final de `route.css`.

   El segundo `@media (max-width: 590px)` de `styles.css` (el del menú) no tiene reglas del Recorrido.
4. **La impresión.** En el `@media print` de `styles.css`:
   - quitar la línea `.focus-timer,` de la lista que oculta;
   - cambiar el selector `.resource-card, .module, .milestone` por `.resource-card, .milestone`;
   - cortar la regla `.code-window { box-shadow: none; }`.

   Agregar al final de `route.css`:

   ```css
   @media print {
     .focus-timer {
       display: none;
     }
     .module {
       break-inside: avoid;
     }
     .code-window {
       box-shadow: none;
     }
   }
   ```

   **Si F3 o F4 entraron antes,** esas listas ya pueden tener menos selectores. Se quitan sólo `.focus-timer` y `.module`, y la regla compartida queda con lo que tenga.
5. **`main.tsx` (K).** Agregar `import '../pages/route/ui/route.css';` en la línea siguiente a `import '../../styles.css';`.
6. **`qa/load-order-check.ts`.**
   - Agregar dos constantes junto a `STYLES`: `const ROUTE_STYLES = 'frontend/src/pages/route/ui/route.css';` y `const LAB_STYLES = 'frontend/lab.css';`.
   - Agregar al final de `CONSTRAINTS`:

     ```ts
     [
       STYLES,
       ROUTE_STYLES,
       'route.css holds rules that left styles.css: it goes after it to keep the cascade',
     ],
     [
       ROUTE_STYLES,
       LAB_STYLES,
       'the route rules lived in styles.css, which loads before lab.css',
     ],
     ```

7. **El formato y el build.** `npx prettier --check frontend/styles.css frontend/src/pages/route/ui/route.css`, `node qa/load-order-check.ts` y `npm run build`. El script y el marcado del dist son idénticos a los de la base (quickstart §2).
8. **Las comparaciones** de quickstart §3.1, legacy contra legacy:
   - el multiconjunto da 0 diferencias;
   - el barrido da 0 diferencias en las 14 páginas de F2b, más los estados del Recorrido y la impresión.

   Si el barrido da diferencias, se busca qué regla cambió de lugar con las propiedades que difieren. Nunca se edita una declaración. El script ya mueve el puntero fuera y salta lo de adentro de los `<details>` cerrados (quickstart §3.1, cambios 5 y 6). Los conteos del multiconjunto salen de T001, nunca de un número de este plan (TR-15): F4 ya partió la regla de impresión, que en la base queda `.resource-card, .module`.
9. **El control negativo** (quickstart §3.2), en una copia descartable: el import de `route.css` antes del de `styles.css`. El barrido tiene que dar diferencias en el botón «↺», porque `.text-button` le gana a `.timer-reset` en `text-decoration`. Si da 0, el barrido no mira lo que tiene que mirar: se para y se informa.
10. `E2E_PORT=4192 npm run test:e2e`: la red entera, con `css-contract`, y los E2E de T004 a T007.
11. Un commit: `refactor(front): las reglas del Recorrido viven en route.css`.

**Compuerta:** los pasos 7 a 10, con las cantidades del barrido en el informe.

**Vuelta atrás:** revertí el commit. Las hojas y `main.tsx` vuelven, y el legacy no notó nada.

## 3. El modelo (dueño M, onda 1)

**Cubre:** FR-018 a FR-021, FR-023, FR-026 a FR-028, FR-031, FR-032 y FR-042; US1, US3 y US4; SC-004 y SC-007.

### 3.0 Contratos

```ts
// frontend/src/entities/guide/model/route-selectors.ts
export function trackSteps(track: GuideTrack): GuideStep[];
export function countCompletedSteps(steps: readonly GuideStep[], completed: readonly string[]): number;
export function nextPendingStep(steps: readonly GuideStep[], completed: readonly string[]): GuideStep | undefined;

// frontend/src/entities/guide/model/route-store.ts, from F4 (master): used as is
toggleMark(collection: RouteMarkCollection, id: string): boolean;

// frontend/src/pages/route/model/focus-timer.ts
export const FOCUS_TICK_MS = 500;
export const FOCUS_FINISHED_NOTICE = 'Terminó tu rato de foco. Anotá qué entendiste y por dónde seguir.';
export type FocusTimerPhase = 'idle' | 'running' | 'paused' | 'finished';
export interface FocusTimerState { phase: FocusTimerPhase; remaining: number; deadline: number }
export interface FocusTimer {
  readonly state: StoreApi<FocusTimerState>;
  toggle(minutes: number, notify: (message: string) => void): void;
  reset(): void;
}
export function createFocusTimer(): FocusTimer;
export function displayedSeconds(state: Pick<FocusTimerState, 'phase' | 'remaining'>, minutes: number): number;
export function timerDigits(seconds: number): string;
export function timerButtonLabel(phase: FocusTimerPhase, seconds: number, minutes: number): string;
export const focusTimer: FocusTimer;

// frontend/src/pages/route/model/route-actions.ts
export function toggleStep(store: RouteStore, stepId: string): void;
export function answerQuiz(store: RouteStore, stepId: string, answer: number): void;
export function chooseMinutes(store: RouteStore, minutes: number): void;

// frontend/src/pages/route/model/route-view.ts
export const LESSON_COMPLETED_NOTICE = 'Un paso más. Dejá una nota para tu próxima sesión.';
export const LESSON_REOPENED_NOTICE = 'Paso disponible para volver a practicar.';
export interface QuizFeedback { correct: boolean; text: string }
export function languageName(language: GuideLanguage): string;
export function defaultOpenModule(modules: readonly GuideModule[], completed: readonly string[]): number;
export function nextStepLabel(steps: readonly GuideStep[], next: GuideStep | undefined): string;
export function findStep(guide: GuideData, stepId: string): GuideStep | undefined;
export function lessonResources(step: GuideStep, resources: readonly GuideResource[]): GuideResource[];
export function quizFeedback(step: GuideStep, answer: number | undefined): QuizFeedback | undefined;
```

**La operación de alternar es la de F4:** `routeStore.toggleMark(collection, id)` (`frontend/src/entities/guide/model/route-store.ts`: el tipo `RouteMarkCollection` en `:21`, la firma en `:27` y la implementación en `:97`). Agrega el id al final o lo quita, escribe una vez y avisa una vez, y `route-store.spec.ts` ya la prueba con `completed`. F9 no crea `toggleRouteItem` ni otra operación propia: `toggleStep` la llama. Si ya existen selectores equivalentes, se usan.

### Tarea 3.1 · Las specs de `entities/guide`, en rojo (T011)

**Crea** `frontend/src/entities/guide/model/route-selectors.ts`, con las firmas de §3.0 como stubs `const` tipados (Reglas): `export const trackSteps: (track: GuideTrack) => GuideStep[] = () => { throw new Error('not implemented'); };`, `export const countCompletedSteps: (steps: readonly GuideStep[], completed: readonly string[]) => number = () => { throw new Error('not implemented'); };` y `export const nextPendingStep: (steps: readonly GuideStep[], completed: readonly string[]) => GuideStep | undefined = () => { throw new Error('not implemented'); };`, con `import type { GuideStep, GuideTrack } from './types';`. **Crea** también su spec:

```ts
// frontend/src/entities/guide/model/route-selectors.spec.ts
import { describe, expect, it } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import { buildGuide } from './guide-fixture';
import { countCompletedSteps, nextPendingStep, trackSteps } from './route-selectors';
import type { GuideData } from './types';

const guide = curriculum.guide as GuideData;
const rustSteps = trackSteps(guide.tracks.rust);

describe('trackSteps', () => {
  it('lists the twelve Rust steps in the order of their modules', () => {
    expect(rustSteps.map((step) => step.id)).toEqual([
      'rust-first-session',
      'rust-ownership',
      'rust-errors',
      'rust-kv-memory',
      'rust-kv-cli',
      'rust-kv-tests',
      'rust-save',
      'rust-load',
      'rust-measure',
      'rust-protocol',
      'rust-local-server',
      'rust-next-challenge',
    ]);
  });

  it('gives no step for a track without modules', () => {
    expect(trackSteps(buildGuide().tracks.go)).toEqual([]);
  });
});

describe('countCompletedSteps', () => {
  it('counts only the completed steps of the given list', () => {
    expect(countCompletedSteps(rustSteps, ['rust-first-session', 'go-save', 'rust-ownership'])).toBe(
      2,
    );
  });
});

describe('nextPendingStep', () => {
  it('is the first step that is not completed', () => {
    expect(nextPendingStep(rustSteps, ['rust-first-session', 'rust-errors'])?.title).toBe(
      'Seguí el recorrido de un valor',
    );
  });

  it('is undefined when every step is completed', () => {
    expect(
      nextPendingStep(
        rustSteps,
        rustSteps.map((step) => step.id),
      ),
    ).toBeUndefined();
  });
});
```

No hay spec de una operación de alternar: es `routeStore.toggleMark` de F4, ya probada en `route-store.spec.ts` («toggling a mark of the route»).

**Pasos:**

1. `npm run test:unit -- frontend/src/entities/guide`: la spec nueva falla con `not implemented`, las de siempre pasan y `npm run lint` no da `no-unused-vars`.
2. Un commit: `test(front): los selectores de pasos (rojos)`.

### Tarea 3.2 · `entities/guide` (T012)

**Cambia** el módulo de T011 y el índice:

```ts
// frontend/src/entities/guide/model/route-selectors.ts
import type { GuideStep, GuideTrack } from './types';

export function trackSteps(track: GuideTrack): GuideStep[] {
  return track.modules.flatMap((module) => module.steps);
}

export function countCompletedSteps(
  steps: readonly GuideStep[],
  completed: readonly string[],
): number {
  return steps.filter((step) => completed.includes(step.id)).length;
}

export function nextPendingStep(
  steps: readonly GuideStep[],
  completed: readonly string[],
): GuideStep | undefined {
  return steps.find((step) => !completed.includes(step.id));
}
```

En `frontend/src/entities/guide/index.ts`, después de la línea de `MILESTONE_IDS`:

```ts
export { countCompletedSteps, nextPendingStep, trackSteps } from './model/route-selectors';
```

**Pasos:**

1. Las specs de T011 pasan.
2. `node qa/seams-guard-check.ts`, `npm run typecheck` y `npm run lint`.
3. Un commit: `refactor(front): los selectores de pasos viven en entities/guide`.

### Tarea 3.3 · Las specs del modelo de la página, en rojo (T013)

**Crea** los tres módulos de `frontend/src/pages/route/model/` con las firmas de §3.0 lanzando `not implemented`, cada función como un stub `const` tipado sin parámetros (Reglas; por ejemplo, `export const toggleStep: (store: RouteStore, stepId: string) => void = () => { throw new Error('not implemented'); };`). Las constantes de texto llevan ya su valor.

**El temporizador en rojo:** `createFocusTimer()` devuelve `{ state: createStore<FocusTimerState>(() => IDLE), toggle() { throw new Error('not implemented'); }, reset() { throw new Error('not implemented'); } }`, y `focusTimer` es `createFocusTimer()`. Así, evaluar el módulo no lanza y las specs fallan por comportamiento, no por el import. Las tres funciones puras lanzan, como stubs `const` tipados.

**Crea** también sus specs:

```ts
// frontend/src/pages/route/model/focus-timer.spec.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFocusTimer,
  displayedSeconds,
  FOCUS_FINISHED_NOTICE,
  timerButtonLabel,
  timerDigits,
  type FocusTimer,
} from './focus-timer';

const START = new Date('2026-10-05T15:00:00.000Z');

function shown(timer: FocusTimer, minutes = 25): { digits: string; label: string } {
  const state = timer.state.getState();
  const seconds = displayedSeconds(state, minutes);
  return { digits: timerDigits(seconds), label: timerButtonLabel(state.phase, seconds, minutes) };
}

describe('the focus timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rests at the chosen duration without any timer', () => {
    const timer = createFocusTimer();
    expect(shown(timer, 45)).toEqual({ digits: '45:00', label: 'Iniciar foco' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('counts down from the deadline with a single 500 ms interval', () => {
    const timer = createFocusTimer();
    timer.toggle(25, vi.fn());
    expect(shown(timer)).toEqual({ digits: '25:00', label: 'Pausar' });
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(999);
    expect(shown(timer).digits).toBe('25:00');
    vi.advanceTimersByTime(1);
    expect(shown(timer).digits).toBe('24:59');
    vi.advanceTimersByTime(59_000);
    expect(shown(timer).digits).toBe('24:00');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('pausing freezes the remaining time and leaves no timer alive', () => {
    const timer = createFocusTimer();
    timer.toggle(25, vi.fn());
    vi.advanceTimersByTime(60_000);
    timer.toggle(25, vi.fn());
    expect(shown(timer)).toEqual({ digits: '24:00', label: 'Continuar' });
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(600_000);
    expect(shown(timer).digits).toBe('24:00');
  });

  it('continuing starts again from the remaining time', () => {
    const timer = createFocusTimer();
    timer.toggle(25, vi.fn());
    vi.advanceTimersByTime(60_000);
    timer.toggle(25, vi.fn());
    timer.toggle(25, vi.fn());
    expect(shown(timer)).toEqual({ digits: '24:00', label: 'Pausar' });
    vi.advanceTimersByTime(60_000);
    expect(shown(timer).digits).toBe('23:00');
  });

  it('a pause within the first second shows «Iniciar foco» and resumes from the full duration', () => {
    const timer = createFocusTimer();
    timer.toggle(25, vi.fn());
    vi.advanceTimersByTime(400);
    timer.toggle(25, vi.fn());
    expect(shown(timer)).toEqual({ digits: '25:00', label: 'Iniciar foco' });
    timer.toggle(25, vi.fn());
    vi.advanceTimersByTime(1_000);
    expect(shown(timer).digits).toBe('24:59');
  });

  it('announces the end once, stops at 00:00 and leaves no timer alive', () => {
    const timer = createFocusTimer();
    const notify = vi.fn();
    timer.toggle(25, notify);
    vi.advanceTimersByTime(1_500_000);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(FOCUS_FINISHED_NOTICE);
    expect(shown(timer)).toEqual({ digits: '00:00', label: 'Iniciar foco' });
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('a pause at the deadline ends the session and announces it once', () => {
    const timer = createFocusTimer();
    const notify = vi.fn();
    timer.toggle(25, notify);
    vi.advanceTimersByTime(1_499_700);
    vi.setSystemTime(START.getTime() + 1_500_000);
    timer.toggle(25, notify);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(shown(timer)).toEqual({ digits: '00:00', label: 'Iniciar foco' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts again from the chosen duration after the end', () => {
    const timer = createFocusTimer();
    timer.toggle(25, vi.fn());
    vi.advanceTimersByTime(1_500_000);
    timer.toggle(15, vi.fn());
    expect(shown(timer, 15)).toEqual({ digits: '15:00', label: 'Pausar' });
  });

  it('reset stops it and goes back to the chosen duration', () => {
    const timer = createFocusTimer();
    timer.toggle(25, vi.fn());
    vi.advanceTimersByTime(60_000);
    timer.reset();
    expect(timer.state.getState().phase).toBe('idle');
    expect(shown(timer, 45)).toEqual({ digits: '45:00', label: 'Iniciar foco' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reset before any use does nothing and creates no timer', () => {
    const timer = createFocusTimer();
    const listener = vi.fn();
    timer.state.subscribe(listener);
    timer.reset();
    expect(listener).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('timerDigits', () => {
  it.each([
    [1500, '25:00'],
    [2700, '45:00'],
    [900, '15:00'],
    [59, '00:59'],
    [0, '00:00'],
  ])('shows %i seconds as %s', (seconds, digits) => {
    expect(timerDigits(seconds)).toBe(digits);
  });
});
```

```ts
// frontend/src/pages/route/model/route-actions.spec.ts
import { describe, expect, it } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import { createRouteStore, type GuideData, type RouteStore } from '../../../entities/guide';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { answerQuiz, chooseMinutes, toggleStep } from './route-actions';

const KEY = 'taller-learning-v1';
const ROUTE_KEYS = [
  'version',
  'language',
  'completed',
  'milestones',
  'favorites',
  'quizAnswers',
  'notes',
  'minutes',
];

interface RecordingStorage extends StorageLike {
  items: Map<string, string>;
  writes: string[];
}

function recordingStorage(initial: Record<string, string> = {}): RecordingStorage {
  const items = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    items,
    writes,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(key);
      items.set(key, value);
    },
    removeItem: (key) => void items.delete(key),
  };
}

function openStore(storage: StorageLike): RouteStore {
  const store = createRouteStore();
  store.open(curriculum.guide as GuideData, { storage });
  return store;
}

function saved(storage: RecordingStorage): Record<string, unknown> {
  return JSON.parse(storage.items.get(KEY) ?? '{}') as Record<string, unknown>;
}

describe('the writes of the route page', () => {
  it('toggleStep marks a step with one write, one revision and the keys of today', () => {
    const storage = recordingStorage();
    const store = openStore(storage);
    toggleStep(store, 'rust-first-session');
    expect(storage.writes).toEqual([KEY]);
    expect(store.changes.getState().revision).toBe(1);
    expect(saved(storage).completed).toEqual(['rust-first-session']);
    expect(Object.keys(saved(storage))).toEqual(ROUTE_KEYS);
  });

  it('toggleStep unmarks a marked step and a new store reads it back', () => {
    const storage = recordingStorage();
    const store = openStore(storage);
    toggleStep(store, 'rust-first-session');
    toggleStep(store, 'rust-ownership');
    toggleStep(store, 'rust-first-session');
    expect(storage.writes).toEqual([KEY, KEY, KEY]);
    expect(openStore(storage).getProgress().completed).toEqual(['rust-ownership']);
  });

  it('answerQuiz keeps the chosen option with one write', () => {
    const storage = recordingStorage();
    answerQuiz(openStore(storage), 'rust-errors', 2);
    expect(storage.writes).toEqual([KEY]);
    expect(saved(storage).quizAnswers).toEqual({ 'rust-errors': 2 });
  });

  it('chooseMinutes keeps the duration with one write', () => {
    const storage = recordingStorage();
    chooseMinutes(openStore(storage), 45);
    expect(storage.writes).toEqual([KEY]);
    expect(saved(storage).minutes).toBe(45);
  });

  it('KNOWN DEFECT chooseMinutes writes again when the duration does not change (spec F9, FR-020)', () => {
    const storage = recordingStorage();
    chooseMinutes(openStore(storage), 25);
    expect(storage.writes).toEqual([KEY]);
  });
});
```

```ts
// frontend/src/pages/route/model/route-view.spec.ts
import { describe, expect, it } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import { trackSteps, type GuideData, type GuideStep } from '../../../entities/guide';
import {
  defaultOpenModule,
  findStep,
  languageName,
  lessonResources,
  nextStepLabel,
  quizFeedback,
} from './route-view';

const guide = curriculum.guide as GuideData;
const rust = guide.tracks.rust;
const rustSteps = trackSteps(rust);
const EXPLANATION =
  'Un test verifica un caso y sus condiciones. Todavía pueden faltar entradas, propiedades y comportamientos por cubrir.';

function step(id: string): GuideStep {
  const found = findStep(guide, id);
  if (!found) throw new Error(`missing step ${id}`);
  return found;
}

describe('defaultOpenModule', () => {
  it('opens the first module in an empty browser', () => {
    expect(defaultOpenModule(rust.modules, [])).toBe(0);
  });

  it('opens the first module that still has a pending step', () => {
    expect(
      defaultOpenModule(rust.modules, ['rust-first-session', 'rust-ownership', 'rust-errors']),
    ).toBe(1);
  });

  it('opens the last module when every step is done', () => {
    expect(
      defaultOpenModule(
        rust.modules,
        rustSteps.map((item) => item.id),
      ),
    ).toBe(3);
  });
});

describe('nextStepLabel', () => {
  it('pads the position of the next step and shows the total', () => {
    expect(nextStepLabel(rustSteps, step('rust-errors'))).toBe('TU PRÓXIMO PASO · 03 / 12');
  });

  it('invites to the next experiment when nothing is pending', () => {
    expect(nextStepLabel(rustSteps, undefined)).toBe('TU SIGUIENTE EXPERIMENTO');
  });
});

describe('findStep', () => {
  it('finds a step of either track', () => {
    expect(step('go-save').title).toBe('Escribí un archivo que puedas leer');
  });

  it('gives undefined for an unknown id', () => {
    expect(findStep(guide, 'rust-unknown')).toBeUndefined();
  });
});

describe('lessonResources', () => {
  it('lists the resources of a step in its order', () => {
    expect(
      lessonResources(step('rust-first-session'), guide.resources).map((item) => item.title),
    ).toEqual(['100 Exercises to Learn Rust', '100 Exercises en RustRover']);
  });

  it('leaves out a resource that is no longer in the guide', () => {
    const withGone = { ...step('rust-first-session'), resourceIds: ['rust-100', 'gone', 'rust-rover'] };
    expect(lessonResources(withGone, guide.resources).map((item) => item.title)).toEqual([
      '100 Exercises to Learn Rust',
      '100 Exercises en RustRover',
    ]);
  });
});

describe('quizFeedback', () => {
  it('is undefined without an answer', () => {
    expect(quizFeedback(step('rust-first-session'), undefined)).toBeUndefined();
  });

  it('praises the right answer', () => {
    expect(quizFeedback(step('rust-first-session'), 1)).toEqual({
      correct: true,
      text: `Bien pensado. ${EXPLANATION}`,
    });
  });

  it('asks to review a wrong answer', () => {
    expect(quizFeedback(step('rust-first-session'), 0)).toEqual({
      correct: false,
      text: `Revisemos la idea. ${EXPLANATION}`,
    });
  });
});

describe('languageName', () => {
  it('names the two languages as the interface writes them', () => {
    expect([languageName('rust'), languageName('go')]).toEqual(['Rust', 'Go']);
  });
});
```

**Pasos:**

1. `npm run test:unit -- frontend/src/pages/route/model`: las tres specs fallan con `not implemented`.
2. Un commit: `test(front): el temporizador, las escrituras y lo que deriva el Recorrido (rojas)`.

### Tarea 3.4 · El modelo de la página (T014)

```ts
// frontend/src/pages/route/model/focus-timer.ts
import { createStore, type StoreApi } from 'zustand/vanilla';

export const FOCUS_TICK_MS = 500;
export const FOCUS_FINISHED_NOTICE =
  'Terminó tu rato de foco. Anotá qué entendiste y por dónde seguir.';

export type FocusTimerPhase = 'idle' | 'running' | 'paused' | 'finished';

export interface FocusTimerState {
  phase: FocusTimerPhase;
  remaining: number;
  deadline: number;
}

export interface FocusTimer {
  readonly state: StoreApi<FocusTimerState>;
  toggle(minutes: number, notify: (message: string) => void): void;
  reset(): void;
}

const IDLE: FocusTimerState = { phase: 'idle', remaining: 0, deadline: 0 };

function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export function createFocusTimer(): FocusTimer {
  const state = createStore<FocusTimerState>(() => IDLE);
  let ticker: ReturnType<typeof setInterval> | undefined;
  let announce: (message: string) => void = () => undefined;

  function stopTicking(): void {
    if (ticker === undefined) return;
    clearInterval(ticker);
    ticker = undefined;
  }

  function finish(): void {
    stopTicking();
    state.setState({ phase: 'finished', remaining: 0, deadline: 0 });
    announce(FOCUS_FINISHED_NOTICE);
  }

  function tick(): void {
    const remaining = secondsUntil(state.getState().deadline);
    if (remaining === 0) {
      finish();
      return;
    }
    if (remaining !== state.getState().remaining) state.setState({ remaining });
  }

  function start(minutes: number): void {
    const current = state.getState();
    const seconds = current.phase === 'paused' ? current.remaining : minutes * 60;
    state.setState({ phase: 'running', remaining: seconds, deadline: Date.now() + seconds * 1000 });
    ticker = setInterval(tick, FOCUS_TICK_MS);
  }

  function pause(): void {
    const remaining = secondsUntil(state.getState().deadline);
    if (remaining === 0) {
      finish();
      return;
    }
    stopTicking();
    state.setState({ phase: 'paused', remaining, deadline: 0 });
  }

  return {
    state,
    toggle(minutes, notify) {
      if (state.getState().phase === 'running') {
        pause();
        return;
      }
      announce = notify;
      start(minutes);
    },
    reset() {
      stopTicking();
      state.setState(IDLE, true);
    },
  };
}

export function displayedSeconds(
  state: Pick<FocusTimerState, 'phase' | 'remaining'>,
  minutes: number,
): number {
  return state.phase === 'idle' ? minutes * 60 : state.remaining;
}

export function timerDigits(seconds: number): string {
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secondsPart = String(seconds % 60).padStart(2, '0');
  return `${minutesPart}:${secondsPart}`;
}

export function timerButtonLabel(phase: FocusTimerPhase, seconds: number, minutes: number): string {
  if (phase === 'running') return 'Pausar';
  if (seconds === minutes * 60 || seconds === 0) return 'Iniciar foco';
  return 'Continuar';
}

export const focusTimer: FocusTimer = createFocusTimer();
```

**Por qué `setState(IDLE, true)`:** reemplaza el estado por el mismo objeto `IDLE`. Así, un segundo `reset()` en reposo no notifica a nadie: Zustand compara con `Object.is` lo que recibe contra el estado. La spec «reset before any use…» lo fija.

```ts
// frontend/src/pages/route/model/route-actions.ts
import type { RouteStore } from '../../../entities/guide';

export function toggleStep(store: RouteStore, stepId: string): void {
  store.toggleMark('completed', stepId);
}

export function answerQuiz(store: RouteStore, stepId: string, answer: number): void {
  store.getProgress().quizAnswers[stepId] = answer;
  store.save();
}

export function chooseMinutes(store: RouteStore, minutes: number): void {
  store.getProgress().minutes = minutes;
  store.save();
}
```

```ts
// frontend/src/pages/route/model/route-view.ts
import {
  trackSteps,
  type GuideData,
  type GuideLanguage,
  type GuideModule,
  type GuideResource,
  type GuideStep,
} from '../../../entities/guide';

export const LESSON_COMPLETED_NOTICE = 'Un paso más. Dejá una nota para tu próxima sesión.';
export const LESSON_REOPENED_NOTICE = 'Paso disponible para volver a practicar.';

export interface QuizFeedback {
  correct: boolean;
  text: string;
}

const LANGUAGE_NAMES: Record<GuideLanguage, string> = { rust: 'Rust', go: 'Go' };

export function languageName(language: GuideLanguage): string {
  return LANGUAGE_NAMES[language];
}

export function defaultOpenModule(
  modules: readonly GuideModule[],
  completed: readonly string[],
): number {
  const firstPending = modules.findIndex((module) =>
    module.steps.some((step) => !completed.includes(step.id)),
  );
  return firstPending === -1 ? modules.length - 1 : firstPending;
}

export function nextStepLabel(steps: readonly GuideStep[], next: GuideStep | undefined): string {
  if (!next) return 'TU SIGUIENTE EXPERIMENTO';
  const position = String(steps.indexOf(next) + 1).padStart(2, '0');
  return `TU PRÓXIMO PASO · ${position} / ${steps.length}`;
}

export function findStep(guide: GuideData, stepId: string): GuideStep | undefined {
  return Object.values(guide.tracks)
    .flatMap((track) => trackSteps(track))
    .find((step) => step.id === stepId);
}

export function lessonResources(
  step: GuideStep,
  resources: readonly GuideResource[],
): GuideResource[] {
  return step.resourceIds
    .map((resourceId) => resources.find((resource) => resource.id === resourceId))
    .filter((resource): resource is GuideResource => resource !== undefined);
}

export function quizFeedback(step: GuideStep, answer: number | undefined): QuizFeedback | undefined {
  if (answer === undefined) return undefined;
  const correct = answer === step.quiz.answer;
  const opening = correct ? 'Bien pensado. ' : 'Revisemos la idea. ';
  return { correct, text: `${opening}${step.quiz.explanation}` };
}
```

**Pasos:**

1. Las specs de T013 pasan.
2. `npm run typecheck`, `npm run lint` (ninguna función nueva supera 10) y `node qa/seams-guard-check.ts`.
3. **La mutación descartada:** en `start`, crear el intervalo también al pausar (por ejemplo, no llamar a `stopTicking()` en `pause`). Tiene que fallar «pausing freezes the remaining time and leaves no timer alive».
4. Un commit: `feat(front): el temporizador del Recorrido como módulo de sesión, sin intervalo global`.

**Vuelta atrás:** revertí el commit; nadie usa el modelo todavía.

## 4. La página (dueño P, onda 2)

**Cubre:** FR-007 a FR-010, FR-016, FR-017, FR-019, FR-023 a FR-025, FR-033 a FR-038, FR-040 y FR-042; US1 a US3.

**Parte de:** S1. P necesita el modelo de T014 y el proyecto `dom` de #67, que T002 verificó.

### 4.0 Contratos

```ts
// frontend/src/pages/route/index.ts
export { default as RoutePage } from './ui/RoutePage';
export { focusTimer } from './model/focus-timer';
export type { FocusTimer, FocusTimerPhase, FocusTimerState } from './model/focus-timer';

// frontend/src/pages/route/ui/RoutePage.tsx
interface RoutePageProps {
  guide: GuideData;
  language: GuideLanguage;
  notify: (message: string) => void;
  store?: RouteStore;
}

// frontend/src/pages/route/ui/LessonDialog.tsx
interface LessonDialogProps {
  step: GuideStep;
  language: GuideLanguage;
  resources: readonly GuideResource[];
  answer: number | undefined;
  completed: boolean;
  onAnswer: (answer: number) => void;
  onComplete: () => void;
  onClose: () => void;
}
```

**Los stubs de jsdom.** Las specs que abren la lección definen, en un `beforeAll` del archivo, `HTMLDialogElement.prototype.showModal` (pone `open` en `true`) y `close` (pone `open` en `false` y despacha `close` de forma síncrona). jsdom no los trae (research.md, Context7). El foco al abrir, Esc y el destino del foco cuando el abridor desaparece se prueban sólo en E2E: el `close` del navegador es asíncrono y el stub no.

### Tarea 4.1 · Las specs de componente, en rojo (T015)

**Crea** `frontend/src/pages/route/ui/RoutePage.tsx` y `LessonDialog.tsx`, cada uno como un componente que lanza `not implemented` con su `export default`, como stub `const` tipado sin parámetros (Reglas): `const RoutePage: FunctionComponent<RoutePageProps> = () => { throw new Error('not implemented'); };` y lo mismo con `LessonDialog` y `LessonDialogProps`, con las interfaces de §4.0 y `import type { FunctionComponent } from 'react';`. **Crea** también las dos specs:

```tsx
// frontend/src/pages/route/ui/RoutePage.spec.tsx
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import { createRouteStore, type GuideData, type RouteStore } from '../../../entities/guide';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { focusTimer } from '../model/focus-timer';
import RoutePage from './RoutePage';

const KEY = 'taller-learning-v1';
const guide = curriculum.guide as GuideData;

interface RecordingStorage extends StorageLike {
  items: Map<string, string>;
  writes: string[];
}

function recordingStorage(initial: Record<string, string> = {}): RecordingStorage {
  const items = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    items,
    writes,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(key);
      items.set(key, value);
    },
    removeItem: (key) => void items.delete(key),
  };
}

function savedRoute(overrides: Record<string, unknown> = {}): Record<string, string> {
  return {
    [KEY]: JSON.stringify({
      version: 1,
      language: 'rust',
      completed: [],
      milestones: [],
      favorites: [],
      quizAnswers: {},
      notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
      minutes: 25,
      ...overrides,
    }),
  };
}

function openStore(storage: StorageLike): RouteStore {
  const store = createRouteStore();
  store.open(guide, { storage });
  return store;
}

interface PageOptions {
  language?: 'rust' | 'go';
  notify?: (message: string) => void;
  guideData?: GuideData;
}

function renderPage(store: RouteStore, options: PageOptions = {}) {
  return render(
    <RoutePage
      guide={options.guideData ?? guide}
      language={options.language ?? 'rust'}
      notify={options.notify ?? vi.fn()}
      store={store}
    />,
  );
}

function moduleTitled(title: string): HTMLDetailsElement {
  const module = screen.getByText(title, { selector: 'strong' }).closest('details');
  if (!module) throw new Error(`missing module ${title}`);
  return module;
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  focusTimer.reset();
  vi.useRealTimers();
});

describe('the steps', () => {
  it('shows the next step, the counters and only the first module open', () => {
    renderPage(openStore(recordingStorage()));
    const card = screen.getByRole('region', { name: 'Sesión de hoy' });
    expect(within(card).getByText('TU PRÓXIMO PASO · 01 / 12')).toBeInTheDocument();
    expect(
      within(card).getByRole('heading', { name: 'Tu primer cambio comprobable' }),
    ).toBeInTheDocument();
    expect(screen.getByText('0 DE 12 COMPLETADOS')).toBeInTheDocument();
    expect(screen.getByText('4 etapas')).toBeInTheDocument();
    expect(screen.getByText('12 sesiones a tu ritmo')).toBeInTheDocument();
    expect(moduleTitled('Ganá confianza con el compilador').open).toBe(true);
    expect(moduleTitled('Construí tu almacén clave-valor').open).toBe(false);
  });

  it('checks a step with one write, moves the card and keeps the focus on the checkbox', async () => {
    const user = userEvent.setup();
    const storage = recordingStorage();
    const store = openStore(storage);
    renderPage(store);
    const checkbox = screen.getByRole('checkbox', {
      name: 'Marcar como completado: Tu primer cambio comprobable',
    });

    await user.click(checkbox);

    expect(storage.writes).toEqual([KEY]);
    expect(store.changes.getState().revision).toBe(1);
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveFocus();
    expect(screen.getByText('TU PRÓXIMO PASO · 02 / 12')).toBeInTheDocument();
    expect(screen.getByText('1 DE 12 COMPLETADOS')).toBeInTheDocument();
  });

  it('keeps an unchecked step when the store is opened again', async () => {
    const user = userEvent.setup();
    const storage = recordingStorage(
      savedRoute({ language: 'go', completed: ['rust-ownership', 'go-save'] }),
    );
    renderPage(openStore(storage), { language: 'go' });

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Marcar como completado: Escribí un archivo que puedas leer',
      }),
    );

    expect(openStore(storage).getProgress().completed).toEqual(['rust-ownership']);
  });

  it('leaves the modules as the student left them after an action of the page', async () => {
    const user = userEvent.setup();
    renderPage(openStore(recordingStorage()));
    const first = moduleTitled('Ganá confianza con el compilador');
    const second = moduleTitled('Construí tu almacén clave-valor');
    first.open = false;
    second.open = true;

    await user.click(
      screen.getByRole('checkbox', { name: 'Marcar como completado: Guardá y recuperá dos valores' }),
    );

    expect(screen.getByText('1 DE 12 COMPLETADOS')).toBeInTheDocument();
    expect(first.open).toBe(false);
    expect(second.open).toBe(true);
  });

  it('shows what another consumer saved and what a reset leaves', () => {
    const store = openStore(recordingStorage());
    renderPage(store);

    act(() => {
      store.getProgress().completed.push('rust-first-session');
      store.save();
    });
    expect(screen.getByText('1 DE 12 COMPLETADOS')).toBeInTheDocument();

    act(() => {
      store.reset();
    });
    expect(screen.getByText('0 DE 12 COMPLETADOS')).toBeInTheDocument();
  });

  it('shows the text of the guide as text, never as markup', () => {
    const hostile = structuredClone(guide);
    hostile.tracks.rust.modules[0].steps[0].title = '<img src=x onerror=alert(1)>';
    renderPage(openStore(recordingStorage()), { guideData: hostile });
    expect(
      screen.getByRole('checkbox', { name: 'Marcar como completado: <img src=x onerror=alert(1)>' }),
    ).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('the lesson', () => {
  it('opens under body, answers with one write and shows the feedback', async () => {
    const user = userEvent.setup();
    const storage = recordingStorage();
    const store = openStore(storage);
    renderPage(store);

    await user.click(screen.getByRole('button', { name: 'Empezar esta sesión' }));
    const dialog = screen.getByRole('dialog', { name: 'Tu primer cambio comprobable' });
    expect(dialog.parentElement).toBe(document.body);
    expect(within(dialog).getByText('RUST · UNA SESIÓN ORIENTATIVA')).toBeInTheDocument();
    expect(document.getElementById('quiz-feedback')).not.toBeVisible();

    await user.click(
      within(dialog).getByRole('button', {
        name: /Ese caso comprobó la propiedad expresada por el test\.$/,
      }),
    );

    expect(storage.writes).toEqual([KEY]);
    expect(store.getProgress().quizAnswers).toEqual({ 'rust-first-session': 1 });
    expect(within(dialog).getByRole('button', { name: /Ese caso comprobó/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Bien pensado. Un test verifica un caso y sus condiciones. Todavía pueden faltar entradas, propiedades y comportamientos por cubrir.',
    );
  });

  it('completes with one write, closes, announces and returns the focus to the card', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    const storage = recordingStorage();
    renderPage(openStore(storage), { notify });
    const start = screen.getByRole('button', { name: 'Empezar esta sesión' });

    await user.click(start);
    await user.click(screen.getByRole('button', { name: 'Marcar como hecho' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(storage.writes).toEqual([KEY]);
    expect(notify).toHaveBeenCalledWith('Un paso más. Dejá una nota para tu próxima sesión.');
    expect(
      screen.getByRole('checkbox', { name: 'Marcar como completado: Tu primer cambio comprobable' }),
    ).toBeChecked();
    expect(screen.getByText('TU PRÓXIMO PASO · 02 / 12')).toBeInTheDocument();
    expect(start).toHaveFocus();
  });

  it('reopens a completed lesson, marks the step pending and announces it', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    const storage = recordingStorage(savedRoute({ completed: ['rust-first-session'] }));
    renderPage(openStore(storage), { notify });

    await user.click(screen.getByRole('button', { name: /^Tu primer cambio comprobable/ }));
    await user.click(screen.getByRole('button', { name: 'Volver a practicar' }));

    expect(storage.writes).toEqual([KEY]);
    expect(notify).toHaveBeenCalledWith('Paso disponible para volver a practicar.');
    expect(
      screen.getByRole('checkbox', { name: 'Marcar como completado: Tu primer cambio comprobable' }),
    ).not.toBeChecked();
  });

  it('recreates the feedback region on every opening', async () => {
    const user = userEvent.setup();
    renderPage(
      openStore(recordingStorage(savedRoute({ quizAnswers: { 'rust-first-session': 0 } }))),
    );

    await user.click(screen.getByRole('button', { name: 'Empezar esta sesión' }));
    const first = document.getElementById('quiz-feedback');
    expect(first).toHaveTextContent('Revisemos la idea.');
    await user.click(screen.getByRole('button', { name: 'Seguir después' }));
    await user.click(screen.getByRole('button', { name: 'Empezar esta sesión' }));
    const second = document.getElementById('quiz-feedback');

    expect(second).not.toBe(first);
    expect(second).toHaveTextContent('Revisemos la idea.');
  });
});

describe('the focus timer', () => {
  it('starts, counts down and a duration stops it with one write', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T15:00:00.000Z'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const storage = recordingStorage();
    renderPage(openStore(storage));
    const digits = screen.getByRole('timer', { name: 'Tiempo restante' });
    expect(digits).toHaveTextContent('25:00');

    await user.click(screen.getByRole('button', { name: 'Iniciar foco' }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(digits).toHaveTextContent('24:00');
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '45 min' }));
    expect(digits).toHaveTextContent('45:00');
    expect(screen.getByRole('button', { name: '45 min' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Iniciar foco' })).toBeInTheDocument();
    expect(storage.writes).toEqual([KEY]);
  });

  it('the reset button stops it without writing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T15:00:00.000Z'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const storage = recordingStorage();
    renderPage(openStore(storage));

    await user.click(screen.getByRole('button', { name: 'Iniciar foco' }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    await user.click(screen.getByRole('button', { name: 'Reiniciar temporizador' }));

    expect(screen.getByRole('timer', { name: 'Tiempo restante' })).toHaveTextContent('25:00');
    expect(screen.getByRole('button', { name: 'Iniciar foco' })).toBeInTheDocument();
    expect(storage.writes).toEqual([]);
  });

  it('keeps running after the page unmounts and updates nothing there', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T15:00:00.000Z'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { unmount } = renderPage(openStore(recordingStorage()));

    await user.click(screen.getByRole('button', { name: 'Iniciar foco' }));
    unmount();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(focusTimer.state.getState()).toMatchObject({ phase: 'running', remaining: 1440 });
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
```

```tsx
// frontend/src/pages/route/ui/LessonDialog.spec.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import type { GuideData, GuideStep } from '../../../entities/guide';
import { findStep } from '../model/route-view';
import LessonDialog from './LessonDialog';

const guide = curriculum.guide as GuideData;

function step(id: string): GuideStep {
  const found = findStep(guide, id);
  if (!found) throw new Error(`missing step ${id}`);
  return found;
}

function renderLesson(props: Partial<ComponentProps<typeof LessonDialog>> = {}) {
  return render(
    <LessonDialog
      step={step('go-first-session')}
      language="go"
      resources={guide.resources}
      answer={undefined}
      completed={false}
      onAnswer={vi.fn()}
      onComplete={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

describe('LessonDialog', () => {
  it('KNOWN DEFECT labels the lesson with the active language, not with the language of the step (spec F9, FR-033)', () => {
    renderLesson({ language: 'rust' });
    expect(screen.getByText('RUST · UNA SESIÓN ORIENTATIVA')).toBeInTheDocument();
  });

  it('leaves out a resource that is no longer in the guide', () => {
    renderLesson({ step: { ...step('go-first-session'), resourceIds: ['gone', 'go-tour'] } });
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'A Tour of Go ↗',
    ]);
  });

  it('opens the resources in another tab without the opener', () => {
    renderLesson();
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('marks a stored wrong answer and explains it when it opens', () => {
    renderLesson({ answer: 0 });
    expect(
      screen.getByRole('button', { name: /Ejecutarlo una sola vez y mirar la salida\.$/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Revisemos la idea. La predicción te obliga a formular un modelo. Compararla con el resultado muestra dónde ese modelo necesita ajustes.',
    );
    expect(screen.getByRole('status')).not.toHaveClass('correct');
  });

  it('names the main action by whether the step was completed', () => {
    renderLesson({ completed: true });
    expect(screen.getByRole('button', { name: 'Volver a practicar' })).toBeInTheDocument();
  });

  it('reports one close when the student leaves it for later', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderLesson({ onClose });
    await user.click(screen.getByRole('button', { name: 'Seguir después' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

**Pasos:**

1. `npm run test:unit -- frontend/src/pages/route/ui`: las dos specs fallan por `not implemented`.
2. Las specs corren en el proyecto `dom` de #67, que ya tiene archivos: no hay `passWithNoTests` que sacar.
3. Un commit: `test(front): la página y la lección del Recorrido (rojas)`.

### Tarea 4.2 · La página (T016)

**Crea** los componentes y el índice. `RoutePage.tsx` y `LessonDialog.tsx` reemplazan a los de T015.

**Los cuidados del JSX,** que mide la comparación de T019:

- **Los espacios.** Los textos con espacios contra un elemento van en la misma línea o en una plantilla: « TU TALLER DE RUST», «Empezar esta sesión ↗», «… practicar ✓» y el enlace «Explorá la biblioteca».
- **El código de la ilustración** va por segmentos, sin saltos de JSX dentro de `<pre>`.
- **Un texto, un nodo** (TR-13). JSX parte en varios nodos de texto un texto con una expresión o con un `{' '}`, y el kerning cambia el ancho que mide el barrido aunque la comparación del DOM, que une los textos, no lo vea. Cada texto que hoy es un solo nodo va en una sola expresión, con un template literal, como los de abajo. Si Prettier parte una línea larga de texto y mete un `{' '}`, el texto se arma en una plantilla en lugar de aceptar el nodo extra.

```tsx
// frontend/src/pages/route/ui/RouteHero.tsx
import { Fragment } from 'react';
import type { GuideLanguage } from '../../../entities/guide';
import { languageName } from '../model/route-view';

interface CodeSegment {
  kind?: 'token' | 'comment';
  text: string;
}

interface CodeArt {
  fileName: string;
  segments: CodeSegment[];
}

const CODE_ART: Record<GuideLanguage, CodeArt> = {
  rust: {
    fileName: 'main.rs',
    segments: [
      { kind: 'token', text: 'fn' },
      { text: ' main() {\n  ' },
      { kind: 'token', text: 'let' },
      { text: ' curiosidad = ' },
      { kind: 'token', text: 'true' },
      { text: ';\n  ' },
      { kind: 'comment', text: '// Un problema a la vez.' },
      { text: '\n  aprender(curiosidad);\n}' },
    ],
  },
  go: {
    fileName: 'main.go',
    segments: [
      { kind: 'token', text: 'func' },
      { text: ' main() {\n  curiosidad := ' },
      { kind: 'token', text: 'true' },
      { text: '\n  ' },
      { kind: 'comment', text: '// Un problema a la vez.' },
      { text: '\n  aprender(curiosidad)\n}' },
    ],
  },
};

const TRACK_PILL: Record<GuideLanguage, string> = {
  rust: 'Rust · recomendado para vos',
  go: 'Go · construir y experimentar',
};

interface RouteHeroProps {
  language: GuideLanguage;
  moduleCount: number;
  stepCount: number;
}

const RouteHero = ({ language, moduleCount, stepCount }: RouteHeroProps) => {
  const art = CODE_ART[language];
  return (
    <section className="hero" aria-label="Bienvenida">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-line" />
          {` TU TALLER DE ${languageName(language).toUpperCase()}`}
        </div>
        <h1>
          Entendé lo que
          <br />
          pasa <em>por dentro.</em>
        </h1>
        <p className="hero-description">
          Ya sabés programar. Ahora construí una comprensión más profunda, con desafíos pequeños y
          cosas que funcionan.
        </p>
        <div className="hero-meta">
          <span className="pill accent">{TRACK_PILL[language]}</span>
          <span>{`${moduleCount} etapas`}</span>
          <span aria-hidden="true">·</span>
          <span>{`${stepCount} sesiones a tu ritmo`}</span>
        </div>
      </div>
      <div className="code-art" aria-label="Ilustración de código, no es un ejercicio ejecutable">
        <div className="code-window">
          <div className="window-top">
            <div className="window-dots">
              <i />
              <i />
              <i />
            </div>
            <span>{art.fileName}</span>
          </div>
          <pre>
            {art.segments.map((segment, index) =>
              segment.kind ? (
                <span key={index} className={segment.kind}>
                  {segment.text}
                </span>
              ) : (
                <Fragment key={index}>{segment.text}</Fragment>
              ),
            )}
          </pre>
        </div>
        <p className="art-caption">MENOS MIRAR. MÁS PROBAR. ↗</p>
      </div>
    </section>
  );
};

export default RouteHero;
```

```tsx
// frontend/src/pages/route/ui/FocusCard.tsx
import type { ReactNode } from 'react';
import type { GuideStep } from '../../../entities/guide';

interface FocusCardProps {
  next: GuideStep | undefined;
  label: string;
  keepAction: (element: HTMLElement | null) => void;
  onOpenLesson: (stepId: string, opener: HTMLElement) => void;
  children: ReactNode;
}

const DEFAULT_TITLE = 'Llevá tu idea un paso más allá';
const DEFAULT_OBJECTIVE =
  'Tu almacén clave-valor puede aprender a guardar archivos, medir operaciones y recibir comandos por una conexión de red.';

const FocusCard = ({ next, label, keepAction, onOpenLesson, children }: FocusCardProps) => (
  <section className="focus-card" aria-label="Sesión de hoy">
    <div className="focus-content">
      <span className="small-label">{label}</span>
      <h2>{next?.title || DEFAULT_TITLE}</h2>
      <p>{next?.objective || DEFAULT_OBJECTIVE}</p>
      {next ? (
        <button
          ref={keepAction}
          className="button"
          onClick={(event) => onOpenLesson(next.id, event.currentTarget)}
        >
          Empezar esta sesión <span aria-hidden="true">↗</span>
        </button>
      ) : (
        <a ref={keepAction} className="button" href="#proyecto">
          Continuar mi proyecto <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
    {children}
  </section>
);

export default FocusCard;
```

```tsx
// frontend/src/pages/route/ui/FocusTimerPanel.tsx
import { useStore } from 'zustand';
import {
  displayedSeconds,
  focusTimer,
  timerButtonLabel,
  timerDigits,
} from '../model/focus-timer';

const DURATIONS = [15, 25, 45] as const;

interface FocusTimerPanelProps {
  minutes: number;
  notify: (message: string) => void;
  onChooseMinutes: (minutes: number) => void;
}

const FocusTimerPanel = ({ minutes, notify, onChooseMinutes }: FocusTimerPanelProps) => {
  const phase = useStore(focusTimer.state, (state) => state.phase);
  const remaining = useStore(focusTimer.state, (state) => state.remaining);
  const seconds = displayedSeconds({ phase, remaining }, minutes);
  return (
    <div className="focus-timer">
      <span className="small-label">UN RATO PARA VOS</span>
      <div className="timer-options" role="group" aria-label="Duración de la sesión">
        {DURATIONS.map((option) => (
          <button
            key={option}
            aria-pressed={minutes === option}
            onClick={() => onChooseMinutes(option)}
          >
            {`${option} min`}
          </button>
        ))}
      </div>
      <div className="timer-digits" role="timer" aria-label="Tiempo restante">
        {timerDigits(seconds)}
      </div>
      <div className="timer-controls">
        <button
          className="text-button timer-toggle"
          onClick={() => focusTimer.toggle(minutes, notify)}
        >
          {timerButtonLabel(phase, seconds, minutes)}
        </button>
        <button
          className="text-button timer-reset"
          aria-label="Reiniciar temporizador"
          onClick={() => focusTimer.reset()}
        >
          ↺
        </button>
      </div>
      <p className="timer-note">El tiempo acompaña. La comprensión marca el ritmo.</p>
    </div>
  );
};

export default FocusTimerPanel;
```

```tsx
// frontend/src/pages/route/ui/RouteModules.tsx
import { useState } from 'react';
import { countCompletedSteps, type GuideTrack } from '../../../entities/guide';
import { defaultOpenModule } from '../model/route-view';

interface RouteModulesProps {
  track: GuideTrack;
  completed: readonly string[];
  completedCount: number;
  stepCount: number;
  onToggleStep: (stepId: string) => void;
  onOpenLesson: (stepId: string, opener: HTMLElement) => void;
}

const ROUTE_INTRO_TAIL =
  'Cada sesión es orientativa: podés dividirla y volver. Marcá un paso cuando puedas demostrar su resultado.';

const RouteModules = ({
  track,
  completed,
  completedCount,
  stepCount,
  onToggleStep,
  onOpenLesson,
}: RouteModulesProps) => {
  const [initiallyOpen] = useState(() => defaultOpenModule(track.modules, completed));
  return (
    <section aria-labelledby="route-title">
      <div className="section-heading">
        <div>
          <h2 id="route-title">Un camino, paso a paso.</h2>
        </div>
        <span className="small-label">{`${completedCount} DE ${stepCount} COMPLETADOS`}</span>
      </div>
      <p className="route-intro">{`${track.description} ${ROUTE_INTRO_TAIL}`}</p>
      <div className="modules">
        {track.modules.map((module, index) => (
          <details key={module.id} className="module" open={index === initiallyOpen}>
            <summary>
              <span className="module-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="module-title">
                <strong>{module.title}</strong>
                <span>{module.subtitle}</span>
              </span>
              <span className="module-count">
                {`${countCompletedSteps(module.steps, completed)}/${module.steps.length}`}
              </span>
              <span className="module-chevron" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="module-steps">
              {module.steps.map((step) => (
                <div key={step.id} className="step-row">
                  <input
                    className="step-check"
                    type="checkbox"
                    aria-label={`Marcar como completado: ${step.title}`}
                    checked={completed.includes(step.id)}
                    onChange={() => onToggleStep(step.id)}
                  />
                  <button
                    className="step-title"
                    onClick={(event) => onOpenLesson(step.id, event.currentTarget)}
                  >
                    {step.title}
                    <span>{`Una sesión orientativa · ${step.minutes} min`}</span>
                  </button>
                  <button
                    className="step-open"
                    aria-label={`Abrir ${step.title}`}
                    onClick={(event) => onOpenLesson(step.id, event.currentTarget)}
                  >
                    ↗
                  </button>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};

export default RouteModules;
```

```tsx
// frontend/src/pages/route/ui/RouteRecommendation.tsx
import type { GuideLanguage } from '../../../entities/guide';

const RECOMMENDATION: Record<GuideLanguage, string> = {
  rust: 'Usá 100 Exercises como hilo conductor y el libro de Brown para destrabar conceptos. Rustlings es otra forma de practicar; no hace falta terminar todos los cursos.',
  go: 'Empezá con el Tour y seguí con Learn Go with Tests. Usá Exercism para practicar un concepto o Gophercises para cambiar de desafío.',
};

interface RouteRecommendationProps {
  language: GuideLanguage;
}

const RouteRecommendation = ({ language }: RouteRecommendationProps) => (
  <div className="recommendation-strip">
    <span className="strip-icon" aria-hidden="true">
      i
    </span>
    <p>
      <strong>Un recurso principal. Un proyecto propio.</strong>
      <br />
      {`${RECOMMENDATION[language]} `}
      <a href="#biblioteca">Explorá la biblioteca</a>.
    </p>
  </div>
);

export default RouteRecommendation;
```

```tsx
// frontend/src/pages/route/ui/LessonDialog.tsx
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GuideLanguage, GuideResource, GuideStep } from '../../../entities/guide';
import { languageName, lessonResources, quizFeedback } from '../model/route-view';

interface LessonDialogProps {
  step: GuideStep;
  language: GuideLanguage;
  resources: readonly GuideResource[];
  answer: number | undefined;
  completed: boolean;
  onAnswer: (answer: number) => void;
  onComplete: () => void;
  onClose: () => void;
}

const LessonDialog = ({
  step,
  language,
  resources,
  answer,
  completed,
  onAnswer,
  onComplete,
  onClose,
}: LessonDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const feedback = quizFeedback(step, answer);

  useLayoutEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const close = () => dialogRef.current?.close();
  const complete = () => {
    onComplete();
    close();
  };

  return createPortal(
    <dialog ref={dialogRef} id="lesson-dialog" aria-labelledby="lesson-title" onClose={onClose}>
      <div className="dialog-content" id="lesson-content">
        <div className="dialog-top">
          <span className="small-label">
            {`${languageName(language).toUpperCase()} · UNA SESIÓN ORIENTATIVA`}
          </span>
          <button className="close-dialog" aria-label="Cerrar sesión" onClick={close}>
            ×
          </button>
        </div>
        <h2 id="lesson-title">{step.title}</h2>
        <p>{step.objective}</p>
        <div className="lesson-block">
          <h3>Tu desafío</h3>
          <p>{step.task}</p>
        </div>
        <div className="done-criteria">
          <span className="small-label">LO LOGRASTE CUANDO</span>
          <p>{step.doneWhen}</p>
        </div>
        <div className="lesson-resources">
          {lessonResources(step, resources).map((resource) => (
            <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer">
              {`${resource.title} ↗`}
            </a>
          ))}
        </div>
        <div className="quiz">
          <h3>{`Antes de seguir: ${step.quiz.question}`}</h3>
          <div className="quiz-options">
            {step.quiz.options.map((option, index) => (
              <button
                key={index}
                className="quiz-option"
                aria-pressed={answer === index}
                onClick={() => onAnswer(index)}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>
          <p
            className={feedback?.correct ? 'quiz-feedback correct' : 'quiz-feedback'}
            id="quiz-feedback"
            role="status"
            aria-live="polite"
            hidden={!feedback}
          >
            {feedback?.text}
          </p>
        </div>
        <div className="dialog-actions">
          <button className="button secondary" onClick={close}>
            Seguir después
          </button>
          <button className="button" onClick={complete}>
            {`${completed ? 'Volver a practicar' : 'Marcar como hecho'} `}
            <span aria-hidden="true">✓</span>
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
};

export default LessonDialog;
```

```tsx
// frontend/src/pages/route/ui/RoutePage.tsx
import { useRef, useState } from 'react';
import { useStore } from 'zustand';
import {
  countCompletedSteps,
  nextPendingStep,
  routeStore,
  trackSteps,
  type GuideData,
  type GuideLanguage,
  type RouteStore,
} from '../../../entities/guide';
import { focusTimer } from '../model/focus-timer';
import { answerQuiz, chooseMinutes, toggleStep } from '../model/route-actions';
import {
  findStep,
  LESSON_COMPLETED_NOTICE,
  LESSON_REOPENED_NOTICE,
  nextStepLabel,
} from '../model/route-view';
import FocusCard from './FocusCard';
import FocusTimerPanel from './FocusTimerPanel';
import LessonDialog from './LessonDialog';
import RouteHero from './RouteHero';
import RouteModules from './RouteModules';
import RouteRecommendation from './RouteRecommendation';

interface RoutePageProps {
  guide: GuideData;
  language: GuideLanguage;
  notify: (message: string) => void;
  store?: RouteStore;
}

interface OpenLesson {
  stepId: string;
  opener: HTMLElement;
}

const COMPLETION_BANNER =
  'Completaste tu recorrido inicial. Elegí un proyecto, repetí un desafío con otra condición o volvé a un tema que quieras afianzar.';

const RoutePage = ({ guide, language, notify, store = routeStore }: RoutePageProps) => {
  useStore(store.changes, (state) => state.revision);
  const [lesson, setLesson] = useState<OpenLesson | null>(null);
  const cardAction = useRef<HTMLElement | null>(null);
  const progress = store.getProgress();
  const track = guide.tracks[language];
  const steps = trackSteps(track);
  const next = nextPendingStep(steps, progress.completed);
  const lessonStep = lesson ? findStep(guide, lesson.stepId) : undefined;

  const openLesson = (stepId: string, opener: HTMLElement) => setLesson({ stepId, opener });

  const closeLesson = () => {
    const target = lesson?.opener.isConnected ? lesson.opener : cardAction.current;
    setLesson(null);
    target?.focus({ preventScroll: true });
  };

  const completeLesson = (stepId: string) => {
    const wasComplete = store.getProgress().completed.includes(stepId);
    toggleStep(store, stepId);
    notify(wasComplete ? LESSON_REOPENED_NOTICE : LESSON_COMPLETED_NOTICE);
  };

  const chooseDuration = (minutes: number) => {
    chooseMinutes(store, minutes);
    focusTimer.reset();
  };

  return (
    <>
      <RouteHero language={language} moduleCount={track.modules.length} stepCount={steps.length} />
      {next ? null : <div className="completion-banner">{COMPLETION_BANNER}</div>}
      <FocusCard
        next={next}
        label={nextStepLabel(steps, next)}
        keepAction={(element) => {
          cardAction.current = element;
        }}
        onOpenLesson={openLesson}
      >
        <FocusTimerPanel
          minutes={progress.minutes}
          notify={notify}
          onChooseMinutes={chooseDuration}
        />
      </FocusCard>
      <RouteModules
        track={track}
        completed={progress.completed}
        completedCount={countCompletedSteps(steps, progress.completed)}
        stepCount={steps.length}
        onToggleStep={(stepId) => toggleStep(store, stepId)}
        onOpenLesson={openLesson}
      />
      <RouteRecommendation language={language} />
      {lessonStep ? (
        <LessonDialog
          step={lessonStep}
          language={language}
          resources={guide.resources}
          answer={progress.quizAnswers[lessonStep.id]}
          completed={progress.completed.includes(lessonStep.id)}
          onAnswer={(answer) => answerQuiz(store, lessonStep.id, answer)}
          onComplete={() => completeLesson(lessonStep.id)}
          onClose={closeLesson}
        />
      ) : null}
    </>
  );
};

export default RoutePage;
```

```ts
// frontend/src/pages/route/index.ts
export { default as RoutePage } from './ui/RoutePage';
export { focusTimer } from './model/focus-timer';
export type { FocusTimer, FocusTimerPhase, FocusTimerState } from './model/focus-timer';
```

**Lo que asegura cada decisión** (research.md, R5, R8 y R9):

- **`useStore(store.changes, …)`** vuelve a dibujar en cada escritura, y el progreso se lee vivo.
- **`initiallyOpen`** se fija al montar.
- **El botón de la tarjeta** no lleva `key`.
- **`closeLesson`** devuelve el foco al abridor o, si se desconectó, a la acción de la tarjeta.
- **El diálogo** existe sólo con una lección abierta.

**Pasos:**

1. Las specs de T015 pasan.
2. `npm run typecheck`, `npm run lint` (sin avisos en `pages/route`) y `node qa/seams-guard-check.ts`.
3. **Las mutaciones descartadas:**
   - **el módulo abierto por render:** cambiar `open={index === initiallyOpen}` por `open={index === defaultOpenModule(track.modules, completed)}` tiene que hacer fallar «leaves the modules as the student left them…»;
   - **el botón con `key`:** ponerle `key={next.id}` al botón de la tarjeta tiene que hacer fallar «completes with one write, closes, announces and returns the focus to the card».
4. Un commit: `feat(front): la página del Recorrido en React, todavía sin montar`.

**Vuelta atrás:** revertí el commit; nadie monta la página todavía.

## 5. El corte (dueño A, onda 3)

**Cubre:** FR-002, FR-005, FR-009, FR-011 a FR-015, FR-017, FR-018, FR-022, FR-031 y FR-044; US5; SC-001, SC-006, SC-007 y SC-010.

**Parte de:** S2. A rebasa sobre `master` con T008, T010 y T016 integradas.

### Tarea 5.1 · `boot-check` lee los nodos y exige 0 intervalos (T017, rojo)

**Cambia** `qa/boot-check.ts`, y nada más: `qa/lib/fake-dom.ts` no cambia. La forma canónica, decidida el 2026-10-28 (noche), es el conjunto `REACT_VIEWS` con la rama que mira los nodos montados y `mountedText`, el de F4 (`master`, `qa/boot-check.ts:85-87`), que también lee el `textContent` del elemento porque React lo usa cuando el único hijo es un texto. F9 no trae ayudantes propios (ni `hasDrawn` ni `drawnText`) y no cambia `mountedText`.

El Recorrido es la vista por omisión: con React, `#main.innerHTML` queda vacío, y cuatro escenarios lo usan como señal de que se dibujó. Esas cuatro lecturas pasan a mirar `innerHTML` **y** los nodos, con `main.innerHTML + mountedText(main)`. Sirven antes y después del port, así que no cambia ningún valor esperado. La rama de «navegación» pasa al conjunto en el corte (T018), como hace cada port con su vista.

- **«arranque: main.tsx se evalúa sin excepciones y #main queda con contenido»:** `assert.notEqual(elements['main']?.innerHTML, '');` pasa a:

  ```ts
  const main = elements['main'];
  assert.notEqual(main ? main.innerHTML + mountedText(main) : '', '');
  ```

- **En `recordInitializations`:** `const mainWasEmpty = harness.elements['main']?.innerHTML === '';` pasa a:

  ```ts
  const main = harness.elements['main'];
  const mainWasEmpty = main !== undefined && main.innerHTML + mountedText(main) === '';
  ```

- **«startApp initializes in order and draws the first view»:** la última línea pasa a:

  ```ts
  const main = harness.elements['main'];
  assert.notEqual(main ? main.innerHTML + mountedText(main) : '', '');
  ```

- **«a retry that succeeds starts the views without a second boot»:** la primera de sus tres líneas de `markup` pasa a las dos de abajo, y las otras dos quedan igual:

  ```ts
  const main = harness.elements['main'];
  const markup = main ? main.innerHTML + mountedText(main) : '';
  ```

- **Un escenario nuevo,** después de «a second startApp call fails»:

  ```ts
  await test('startApp registers no interval', async () => {
    const { harness, startApp } = await evaluateWithoutStartCall();
    startApp();
    assert.equal(harness.intervals, 0);
  });
  ```

`mountedText` es una declaración de función del módulo, así que el escenario «arranque», que va antes en el archivo, ya la puede usar. El import de `./lib/fake-dom.ts` no cambia.

**Pasos:**

1. `node qa/boot-check.ts` sobre `master` con T016: todos pasan salvo «startApp registers no interval», que falla con `1 !== 0` por el `setInterval(updateTimer, 500)` de `app.js`.
2. Un commit: `test(qa): boot-check lee los nodos de #main y exige que startApp no registre intervalos (roja)`.

**Vuelta atrás:** revertí el commit.

### Tarea 5.2 · El corte (T018, un commit)

FR-012 pide que todo vaya en un solo commit: las ramas de los delegados salen junto con el montaje.

**Crea** `frontend/src/app/legacy/register-route.tsx`:

```tsx
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { focusTimer, RoutePage } from '../../pages/route';
import { getContent } from '../content/content';

declare global {
  interface Window {
    TallerRoute: Readonly<{
      mount: typeof mount;
      unmount: typeof unmount;
      resetTimer: typeof resetTimer;
    }>;
  }
}

let root: Root | null = null;

function unmount(): void {
  root?.unmount();
  root = null;
}

function mount(
  host: HTMLElement | null,
  requestedLanguage: string,
  toast: (message: string) => void,
): void {
  unmount();
  if (!host) return;

  const language = requestedLanguage === 'go' ? 'go' : 'rust';
  const current = createRoot(host, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar el recorrido.', error);
    },
  });
  root = current;
  flushSync(() => {
    current.render(<RoutePage guide={getContent().guide} language={language} notify={toast} />);
  });
}

function resetTimer(): void {
  focusTimer.reset();
}

window.TallerRoute = Object.freeze({ mount, unmount, resetTimer });
```

**En la rama B** (F8 ya entró):

- el adaptador no declara ni publica `resetTimer`, y no importa `focusTimer`;
- el armado de `src/app/` que dejó F8 importa `focusTimer` de `'../pages/route'` (o la ruta relativa que corresponda) y registra `() => focusTimer.reset()` como el último paso de sesión, después del de las simulaciones;
- `startApp()` deja de registrar el cierre del temporizador;
- `app-adapters.ts` lista sólo `['mount', 'unmount']`.

**Cambia** `frontend/src/app/boot/legacy-views.ts` (lo integra K): agregar `() => import('../legacy/register-route'),` en la línea siguiente a `() => import('../legacy/register-atlas'),`. Es la única entrada nueva de `LEGACY_MODULES`: `import.meta` del dist sube uno (TR-4).

**Cambia `frontend/app.js`,** ubicando cada fragmento por su texto:

1. **El import** de la línea 1 pasa a `import { countCompletedSteps, routeStore, trackSteps } from './src/entities/guide';`. No suma ninguna operación de alternar: las páginas usan `routeStore.toggleMark` (paso 6).
2. **Las declaraciones que se borran:**
   - las tres líneas de `const allSteps = …`;
   - `let currentStepId = null;` y `let lessonOpener = null;`;
   - `const timer = { running: false, remaining: routeState().minutes * 60, deadline: 0 };`;
   - la función `restoreStepFocus` entera.
3. **`stepsFor` y `completedCount`** pasan a:

   ```js
   const stepsFor = () => trackSteps(data.tracks[routeState().language]);
   const completedCount = () => countCompletedSteps(stepsFor(), routeState().completed);
   ```

4. **En `render()`:**
   - agregar `window.TallerRoute?.unmount();` después de `window.TallerAtlas?.unmount();`;
   - cambiar `recorrido: renderRoute,` por `recorrido: () => '',`;
   - agregar, antes de `if (currentView === 'campana')`:

     ```js
     if (currentView === 'recorrido')
       window.TallerRoute.mount($('#main'), routeState().language, toast);
     ```

   - borrar la llamada final `updateTimer();`.
5. **Las funciones que se borran:** `routeCode`, `renderRoute`, `timerMarkup` y `updateTimer`, con la línea `setInterval(updateTimer, 500);`.
6. **`toggleItem`,** la función local de `startApp`. F4 ya entró, así que sólo queda F3:
   - si F3 ya entró, después de este corte no le queda ninguna llamada y se borra (`grep -n "toggleItem(" frontend/app.js` no imprime nada);
   - si F3 no entró, queda como está, para la rama `favorite`, y la borra el corte de F3.

   Ninguna llamada pasa a otra operación: no hay `toggleRouteItem`.
7. **En `createProgressBackup`,** el segundo elemento de `sessionResets`, el cierre de cuatro líneas sobre `timer`, pasa a `() => window.TallerRoute?.resetTimer(),`. Es la rama A; en la rama B, ver arriba.
8. **Lo de la lección que se borra:** `openLesson`, `showQuizFeedback` y los dos oyentes de `$('#lesson-dialog')`, el de `click` y el de `close`.
9. **En el delegado de `click` de `#main`,** se borran las líneas de `action === 'lesson'`, `'duration'`, `'timer'` y `'timer-reset'`.
10. **En el delegado de `change`,** se borra el bloque `if (target.dataset.stepCheck) { … }`.
11. **La suscripción del shell.** F4 dejó `routeStore.changes.subscribe(updateSaveLabel);` inmediatamente después de `routeStore.open(data);` (`frontend/app.js:29`). Esa línea se borra, y antes del `render();` final de `startApp()` va:

    ```js
    routeStore.changes.subscribe(() => syncShell());
    ```

    No se cambia en su lugar: `syncShell` usa `const` que `startApp()` declara después (`stepsFor`, `completedCount` y `languageName`) y `currentView`, que estarían en su zona muerta si algo avisara antes. Si la línea ya es `() => syncShell()` (F3 u F8 la ampliaron), no se toca.
12. **Las llamadas a `updateSaveLabel()` que la suscripción vuelve redundantes** salen, salvo que F8 ya las haya sacado: la de `save()` (que queda `function save() { return routeStore.save(); }`) y la que sigue a `progressBackup.applyImport(plan)` en el oyente de `#import-file`. Cada escritura del almacén avisa, y el oyente llama a `syncShell`, que llama a `updateSaveLabel`. La llamada dentro de `syncShell` se queda.

**Cambia el resto:**

- **`frontend/src/index.html`:** se borra la línea `<dialog id="lesson-dialog" aria-labelledby="lesson-title"><div class="dialog-content" id="lesson-content"></div></dialog>`.
- **`qa/lib/app-adapters.ts`:** después de `TallerAtlas`, `TallerRoute: ['mount', 'unmount', 'resetTimer'],` (en la rama B, `['mount', 'unmount']`).
- **`qa/lib/app-shell-harness.ts`:** se borran `'lesson-dialog'` y `'lesson-content'` de `ids`, y se agrega `TallerRoute: {},` en `behaviors`, después de `TallerAtlas: {},`.
- **`qa/lib/boot-harness.ts`:** se borran `'lesson-dialog'` y `'lesson-content'` de `ELEMENT_IDS`.
- **`qa/load-order-check.ts`:**
  - se agrega `const ROUTE = 'frontend/src/app/legacy/register-route.tsx';` junto a `ATLAS`;
  - en `BEFORE_APP_REASONS` se agrega `[ROUTE]: 'render() de app.js llama a window.TallerRoute.mount() sin guarda opcional en la vista recorrido, que es la vista por omisión',`.
- **`qa/boot-check.ts`, en «navegación: cada vista se renderiza por hash sin lanzar»:** el Recorrido pasa a la rama de las vistas de React, con la forma canónica y sin otro ayudante (TR-3).
  - **Si T001 encontró `REACT_VIEWS`** (F3 o F5 entraron antes): sólo se suma `'recorrido'` al conjunto.
  - **Si encontró la condición de F4** (`if (view === 'atlas' || view === 'proyecto') {`): pasa al conjunto, con la forma de F5 (`impl-f5`, `efaf39b2`, `qa/boot-check.ts:85`). La constante va inmediatamente antes de `function mountedText`, que queda igual:

    ```ts
    const REACT_VIEWS: ReadonlySet<string> = new Set(['atlas', 'proyecto', 'recorrido']);
    ```

    y la rama pasa a:

    ```ts
    if (REACT_VIEWS.has(view)) {
      assert.ok(main.childNodes.length > 0, `#${view} no montó nodos en #main`);
      assert.ok(
        mountedText(main).includes(VIEW_HEADINGS[view]),
        `#${view} no mostró su encabezado`,
      );
    } else {
      assert.ok(main.innerHTML.includes(VIEW_HEADINGS[view]), `#${view} no mostró su encabezado`);
    }
    ```

    Sale el comentario que F4 dejó dentro de la rama, como en F5. El encabezado esperado sigue siendo «TU TALLER DE RUST».
- **`qa/boot-check.ts`, en «borrar todo: confirm-reset reinicia cada adaptador y deja el recorrido en blanco»:**
  - `RESET_METHODS` suma `['TallerRoute', 'resetTimer'],` al final. En la rama B, no.
  - **El espía cambia cómo observa.** `window.TallerRoute` está congelado, como los demás adaptadores de `app/legacy/`, y el check corre en modo estricto: asignarle un método lanza un `TypeError`. Para un adaptador congelado, el espía reemplaza el global por una copia congelada con el método envuelto. `app.js` lee `window.TallerRoute?.resetTimer()` al llamarlo, así que ve la copia. Para los demás, envuelve el método como hoy. El bloque del bucle pasa a:

    ```ts
    for (const [adapter, method] of RESET_METHODS) {
      const target = harness.context[adapter] as Record<string, (...args: unknown[]) => unknown>;
      const original = target[method];
      // Si falta, no se espía: el clic falla con el `not a function` real de app.js.
      if (!original) continue;
      const spy = (...args: unknown[]) => (reset.push(`${adapter}.${method}`), original(...args));
      if (Object.isFrozen(target)) harness.context[adapter] = Object.freeze({ ...target, [method]: spy });
      else target[method] = spy;
    }
    ```

    El comentario es el que ya está en el check; se conserva.
- **`qa/app-shell-check.ts`,** el escenario «almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar»:
  - se borra la línea `await changeField(harness, 'change', { stepCheck: 'go-save' });`;
  - se borra la aserción `assert.deepEqual(exported.completed, ['rust-ownership']);`;
  - el nombre pasa a «almacén: quitar un favorito y vaciar una nota se conservan al recargar».

  Si F3 y F8 ya sacaron sus partes, el escenario queda sin acción y se borra entero. La spec de `RoutePage`, «keeps an unchecked step when the store is opened again», toma el paso con los mismos valores.

**Pasos:**

1. **`grep`:**
   - `grep -nE "renderRoute|timerMarkup|updateTimer|setInterval|openLesson|lesson-dialog|data-step-check|data-dialog-action" frontend/app.js` no imprime nada;
   - `grep -n "lesson-dialog" frontend/src/index.html` tampoco.
2. **`npm test`:**
   - `boot-check`, con «startApp registers no interval» en verde y la navegación por el Recorrido sin el error «Abrí el almacén del recorrido antes de usarlo.»;
   - `app-shell-check`, `load-order-check`, `seams-guard-check`, `route-progress-check`, `versioned-storage-check` y `curriculum-ids-check`;
   - y Vitest.

   **Si el DOM falso no alcanza para montar la página** (`details`, la casilla o el portal), se agrega a `qa/lib/fake-dom.ts` lo mínimo que React pida, en este commit, y se lista en el PR. Es soporte del DOM, no un ayudante de lectura: las lecturas siguen con `mountedText`. No se saca el Recorrido del recorrido de `boot-check`.
3. **El resto de los checks:** `npm run typecheck`, `npm run lint` (con la cuenta de avisos y la complejidad de `render()` antes y después) y `npm run format:check`.
4. **La red:** `npm run build` y `E2E_PORT=4194 npm run test:e2e`, con la de F1 y A2 sin editar, T004 a T007 y T008, que ahora pasa: los 46 E2E del Recorrido en verde.
5. **Las mutaciones descartadas:**
   - **la suscripción del shell:** borrarla tiene que hacer fallar «checking the first step updates the counters, the card and the sidebar with one write» (`1 de 12`);
   - **el `flushSync`:** cambiar `flushSync(() => current.render(…))` por `current.render(…)` tiene que hacer fallar «navegación» de `boot-check` o el foco de `#main` de algún E2E. Si nada falla, se informa en el PR: la prueba de FR-009 queda sólo en la revisión.
6. Un commit: `feat(front): el Recorrido es una página de React y app.js pierde su vista, su lección y su intervalo`.

**Compuerta:** los pasos 1 a 5 y quickstart §2.

**Vuelta atrás:** revertí T018. Vuelven la vista legacy, el intervalo, `#lesson-dialog` y los checks. Después, revertí T017 si se quiere sacar la aserción de 0 intervalos.

## 6. Comparaciones, documentación y PR (coordinador K, onda 4)

### Tarea 6.1 · Las comparaciones únicas (T019)

**Qué corre** (quickstart §3 y §4), con el worktree de la base de T001 y el de la rama con T018:

1. **El multiconjunto de declaraciones del CSS del dist:** 0 diferencias.
2. **El barrido de estilo computado, de la base contra el port:** 0 diferencias en las 14 páginas de F2b, los estados del Recorrido (pasos completos, módulos abiertos a mano, el aviso de recorrido completo y la lección abierta con una respuesta correcta y otra incorrecta) y la impresión. El barrido evita las trampas de TR-13 (quickstart §3.1, cambios 5 y 6): mueve el puntero fuera antes de capturar, porque React conserva el nodo bajo el puntero y su `:hover`, y no compara lo de adentro de un `<details>` cerrado. Si aparece una diferencia sub-píxel en el ancho de un texto, primero se busca un texto que JSX partió en varios nodos y se arma en uno (T016, «Un texto, un nodo»); nunca se acepta con una tolerancia.
3. **La comparación única del HTML (SC-003):** 0 diferencias después de normalizar lo listado en quickstart §4.
   - **Las páginas:** 72 estados, que son los dos lenguajes por ningún paso, cinco y todos completos, por las tres duraciones y por los cuatro estados del temporizador.
   - **Las lecciones:** 192 aperturas, que son los 24 pasos por las cuatro respuestas (ninguna, A, B y C) y por completo y sin completar.

**Entrega:** las cantidades, en la descripción del PR y en research.md («Comparaciones de la implementación»), en un commit de documentación.

### Tarea 6.2 · La documentación (T020)

En el PR, integrada por K (FR-046):

- **`docs/architecture.md`:**
  - en el mapa, la fila «Navegación, recorrido y progreso general» deja de decir que `app.js` dibuja el recorrido;
  - una fila nueva: «Recorrido migrado a React/TypeScript: `frontend/src/pages/route/` (`ui`, `model`), con el temporizador como módulo de sesión (`model/focus-timer.ts`), y el adaptador `frontend/src/app/legacy/register-route.tsx`, que lee `getContent().guide` al montar»;
  - en «Feature-Sliced Design incremental», el estado actual suma `pages/route`, y `entities/guide` suma los selectores de pasos.
- **`qa/AGENTS.md`:**
  - la fila «Recorrido, biblioteca o respaldo global» suma las specs de `pages/route` y los cinco E2E `route-*.spec.ts`;
  - «Pruebas del front» ya nombra el proyecto `dom` y el setup `frontend/src/vitest.setup.ts` (#67): no se toca. Si T002 sumó la guarda de `useStore`, la fila de «Almacenes, motores…» la nombra en `npm run lint`.
- **`docs/adr/0008-pruebas-del-front.md`** no cambia: la pila, los proyectos y el setup ya los registró la enmienda de F4.
- **Verificación:** las rutas, los comandos y los enlaces locales, y `git diff --check`.
- Un commit: `docs: el Recorrido en React, su temporizador y sus pruebas`.

### Tarea 6.3 · La compuerta final y el PR (T021)

**La compuerta** de quickstart §2:

- `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check`;
- con permiso, `docker compose build taller`;
- los bytes;
- el tamaño, contra el de T001;
- la cuenta de avisos;
- el `grep` de estilos en línea.

**El PR** se titula `feat(front): port the Recorrido view to React with its timer and lesson`. La descripción, en inglés:

- el contexto: el qué y el porqué de F9;
- lo que cambia;
- las ramas aplicadas de «Lo compartido»;
- los cambios de comportamiento aceptados (X1, Q4 y la decisión 1);
- las rarezas con `KNOWN DEFECT`;
- la tabla de correspondencia de los checks (más abajo);
- las comparaciones y sus cantidades;
- el tamaño antes y después;
- los avisos de complejidad;
- lo que queda: F10 retira `mount`, `unmount` y `#quiz-feedback`; F8 retira `resetTimer` en la rama A; y F3 borra `toggleItem` de `app.js`, si F9 no lo hizo porque F3 todavía no había entrado.

**Al final,** se le avisa al coordinador lo que toca a las hojas de ruta y a las specs de F3, F4 y F8 (el informe).

### Tarea 6.4 · El lector de pantalla sobre la página (T022, usuario)

**Qué hace el usuario:** lo mismo que T009, sobre el build de la rama. Compara lo que se anuncia con lo que anotó en T009. Si difiere, se informa antes del merge: la región se recrea igual que hoy, así que no debería diferir.

## La correspondencia de los checks (FR-044, SC-010)

| Check | Escenario | Qué le pasa | Cubierto por |
| --- | --- | --- | --- |
| `boot-check` | «arranque: main.tsx se evalúa sin excepciones y #main queda con contenido» | Lee `innerHTML` y los nodos (`main.innerHTML + mountedText(main)`) | El mismo escenario |
| `boot-check` | «navegación: cada vista se renderiza por hash sin lanzar», el Recorrido | Pasa a `REACT_VIEWS` y lee los nodos con `mountedText` (F4), con el mismo texto, «TU TALLER DE RUST» | El mismo escenario; además, `views.spec.ts` de F1 |
| `boot-check` | «startApp initializes in order and draws the first view» | La bandera «after drawing» y la última aserción leen los nodos | El mismo escenario |
| `boot-check` | «a retry that succeeds starts the views without a second boot» | Lee los nodos | El mismo escenario |
| `boot-check` | «borrar todo: confirm-reset reinicia cada adaptador y deja el recorrido en blanco» | Suma `TallerRoute.resetTimer` al final del orden (rama A); el espía reemplaza el global de un adaptador congelado en lugar de asignarle el método | El mismo escenario; `route-timer.spec.ts` (««Borrar todo» stops it…») |
| `boot-check` | «startApp registers no interval» (nuevo) | Fija FR-013 | — |
| `app-shell-check` | «almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar» | Pierde el paso; el nombre cambia | El paso: `RoutePage.spec.tsx` («keeps an unchecked step when the store is opened again», `completed: ['rust-ownership']`) y `route-progress.spec.ts` |
| `app-shell-check` | Los demás (todos arrancan en el Recorrido) | Ven `Route.mount` en lugar del HTML de `renderRoute`; ningún valor esperado cambia | Los mismos escenarios |
| `load-order-check` | La cadena y las hojas | Suma `register-route.tsx` antes que `app.js` y `route.css` entre `styles.css` y `lab.css` | El mismo check |
| `app-adapters.ts` | La lista de métodos | Suma `TallerRoute` | `boot-check` («adaptadores») y los fakes de `app-shell-check` |

Ningún check se retira.

## Cobertura de requisitos

| Requisito | Tareas |
| --- | --- |
| FR-001 | T003 a T008 |
| FR-002 | T008 (compuerta), T018 y T021 |
| FR-003 | T002 y T021 (el `grep` de estilos en línea) |
| FR-004 | T001 y T021 |
| FR-005 | T014, T016, T018 y T021 |
| FR-006 | Toda la sección 0 a 6 (un PR); T021 |
| FR-007 | T016 y T019 |
| FR-008 | T016 (la página no dibuja notas) y T019 (el DOM de hoy, sin notas) |
| FR-009 | T018 (`flushSync` y `onUncaughtError`) y T017 |
| FR-010 | T016 y T018; R5 de `seams-guard-check` |
| FR-011 y FR-012 | T018 (el `grep` y un solo commit) |
| FR-013 | T017 (rojo) y T018 |
| FR-014 y FR-015 | T018 y el contrato |
| FR-016 | T004 (el idioma), T006 (el idioma con el temporizador) y T016 |
| FR-017 | T008 (Atrás), T016 y T018 |
| FR-018 | T014, T016 y T018 (`seams-guard-check`) |
| FR-019 | T015 («shows what another consumer saved…») y T002 (la guarda) |
| FR-020 | T007, T013 y T015 |
| FR-021 | T007 y T018 (`route-progress-check` y las fixtures en `boot-check`) |
| FR-022 | T004 (la barra lateral) y T018 (la suscripción) |
| FR-023 | T011, T012, T016 y T018 (`stepsFor` y `completedCount`) |
| FR-024 | T004 y T015 |
| FR-025 | T008 y T015 |
| FR-026 y FR-027 | T013, T014 y T006; `reload.spec.ts` |
| FR-028 | T006, T013 y T015 |
| FR-029 | T006 (desde otra vista y con la lección abierta) |
| FR-030 | T006 (navegar, el idioma y la importación) y `reload.spec.ts` |
| FR-031 | T006 (dos escenarios), T013 y T018 (`boot-check`) |
| FR-032 | T013 (`getTimerCount`) y T015 (el desmontaje) |
| FR-033 y FR-034 | T005, T015 y T016 |
| FR-035 | T005, T008 y T015 |
| FR-036 | T005, T008 y T015 |
| FR-037 | T015 (se recrea), T009 y T022 |
| FR-038 | T004 (el teclado y el orden) y T005 (Tab dentro de la lección) |
| FR-039 | T010 (sólo reglas mudadas) y T019 (el barrido con movimiento reducido) |
| FR-040 | T019 y T004 (`KNOWN DEFECT`) |
| FR-041 | T010 y T019 |
| FR-042 | T011, T013 y T015 |
| FR-043 | T003 a T008 |
| FR-044 | T017, T018 y T021 (la correspondencia) |
| FR-045 | «Lo compartido con F3, F4 y F8» y T001 |
| FR-046 | T020 |
| SC-001 | T018 y T021 |
| SC-002 | T003 a T008 |
| SC-003 | T019 |
| SC-004 | T007 |
| SC-005 | T010, T019 y T021 |
| SC-006 | T018 |
| SC-007 | T013, T017 y T018 |
| SC-008 | T001 y T021 |
| SC-009 | T021 |
| SC-010 | T021 |
| SC-011 | T002 |
| SC-012 | T021 |

## Descargas y permisos

- **La pila de componentes no se pide:** llegó con #67 (research.md, R13 y R17).
- **fishery no se pide** (research.md, R13); también llegó con #67, y F9 no la usa.
- **Ninguna otra descarga:** el navegador de Playwright ya está desde F1.
- **`docker compose build taller`** lo corre K, con permiso.

## Riesgos y lo que quedó sin verificar

1. **Nada corrió al planificar.** Los textos esperados salen de `content/guide/` y del código leído, y los E2E de T004 a T007 se escribieron contra lo que se leyó en `app.js`. Su primera corrida contra el legacy es la verificación: si un valor no coincide, se informa antes de seguir.
2. **El foco del `<dialog>`.** Que el foco caiga en «×» al abrir, que Tab no salga del diálogo y el orden del evento `close` contra el redibujo de React se infirieron de la especificación de HTML. Los fijan T005 y T008 en el primer contacto con un navegador.
3. **El DOM falso de `boot-check`** con `details`, casillas controladas y `flushSync` no se probó. T018 suma lo mínimo si hace falta (paso 2).
4. **La guarda de `useStore`.** Es el bloque de F6, con `[arguments.length=1]`, que ya corre en las ramas de F5 y F6 (`impl-f6`, `e30ad0bf`). T002 la verifica con un archivo descartable, o la suma tal cual si ni F5 ni F6 entraron.
5. **Las reglas de React Compiler en `eslint-plugin-react-hooks` 7.1.1.** La regla `refs` puede marcar el callback `keepAction` de `RoutePage`, que escribe `cardAction.current` y se pasa a un componente propio, no a un `ref` de un elemento.
   - **Dónde aparece:** en el paso de lint de T016.
   - **El respaldo:** `FocusCard` recibe `actionRef: RefObject<HTMLElement | null>` y la asigna en el `ref` de su propio botón o enlace, con un callback (`ref={(element) => { actionRef.current = element; }}`). `RoutePage` le pasa `cardAction`.
   - **El efecto:** el comportamiento no cambia, y la mutación del botón con `key` sigue fallando.
6. **La exportación de un navegador vacío.** Que traiga `lab`, `campaign` y `systems` se supuso de US4-4. T007 lo fija contra el legacy.
7. **El tamaño.** No se midió: T001 y T021.
8. **Las otras ramas.** Al planificar F9, F3, F4 y F8 no tenían plan escrito. F4 ya entró (la suscripción con `updateSaveLabel`, `toggleMark`, `mountedText` y los bloques de CSS que partió), y el plan se alineó en la enmienda del 2026-10-28 (research.md, R17). Lo que hagan F3 y F8 puede tener otros nombres; «Lo compartido» dice cómo detectarlo.
9. **macOS, Firefox, WebKit, Docker y la CI** no corrieron.

## Complexity Tracking

| Decisión | Por qué hace falta | Alternativa más simple descartada |
| --- | --- | --- |
| `RoutePage` recibe `store` con el singleton por omisión | Las specs de componente necesitan un almacén abierto sobre memoria por caso, y el singleton se abre una sola vez | `vi.resetModules()` y un `import()` dinámico por caso: esconde el contrato de la página y hace más frágil cada spec |
| La acción de la tarjeta se guarda en una ref para el foco | FR-036 pide que el foco no se pierda, y completar el último paso desde la tarjeta reemplaza al abridor (decisión 1) | No hacer nada: el foco caería en `<body>` |
