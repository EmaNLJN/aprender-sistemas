# Research: F9 · Port de Recorrido a React

**Plan:** [plan.md](./plan.md) · **Spec:** [spec.md](./spec.md) · **Validación:** [quickstart.md](./quickstart.md) · **Contrato del adaptador:** [contracts/taller-route.md](./contracts/taller-route.md)

Las decisiones técnicas del plan, con sus alternativas, la tabla de Context7 y lo que se midió en sólo lectura. Se planificó sin tocar código de producción, sin correr `npm` en ningún worktree y sin descargar nada. El código que se leyó es el de `f2b-acum` (`2b37caf4`, del 2026-10-28): `master` con F2a, A2 y las cuatro unidades de F2b integradas, que es la base real sobre la que se implementa F9. La spec describe `f2a` (`2ffbbc6`); donde la base cambió, se dice.

## Decisiones

### R1. El slice, el adaptador y los nombres

- **Decisión:** la página vive en `frontend/src/pages/route/` (`ui/`, `model/` e `index.ts`), el adaptador es `frontend/src/app/legacy/register-route.tsx` y el global es `window.TallerRoute`. Los nombres provisionales de la spec quedan confirmados.
- **Por qué:** «route» ya es el nombre del código (`routeStore`, `renderRoute`, `taller-learning-v1` en `entities/guide`), y el Atlas fijó la forma `pages/<vista>` con su `register-<vista>.tsx`.
- **Alternativa descartada:** `pages/recorrido`. Mezcla español en un identificador de código (`AGENTS.md`).

### R2. El dueño del temporizador

- **Decisión:** un módulo de sesión de la página, `pages/route/model/focus-timer.ts`, con una fábrica (`createFocusTimer`) y un singleton (`focusTimer`) que exporta la API pública del slice.
  - **El estado** es un store de `zustand/vanilla` con `{ phase, remaining, deadline }`. `phase` vale `idle`, `running`, `paused` o `finished`.
  - **El intervalo** es un `setInterval` de 500 ms (`FOCUS_TICK_MS`) que existe sólo en `running`. Lo cancelan la pausa, «↺», el fin, la duración y `reset()`.
  - **El aviso de fin** sale por el `notify` que la página le pasa a `toggle(minutes, notify)` al iniciar. Es el `toast` del shell, que el adaptador recibe en `mount`, así que sigue sirviendo con la página desmontada.
  - **El módulo no lee `routeStore`.** En `idle` los dígitos salen de los minutos vivos que pasa la página. Por eso evaluar el módulo no toca el almacenamiento, y `reset()` antes de cualquier montaje no lanza ni necesita un `notify`.
- **Equivalencia con hoy** (el objeto `timer` y `updateTimer` de `app.js`, líneas 98 y 207 a 226 de la base):
  - `idle` es «`running` falso y `remaining` igual a `minutes * 60`». Hoy los minutos sólo cambian junto con un reinicio del temporizador: la duración, «Borrar todo» y la importación, que conserva los minutos locales. Por eso derivar el reposo de los minutos vivos da los mismos dígitos.
  - Pausar recalcula el restante desde el vencimiento antes de detenerse; si da 0, termina y avisa, como el `updateTimer()` que hoy corre antes de `running = false`.
  - Iniciar desde `finished` o desde `idle` parte de `minutes * 60`; desde `paused`, del restante.
  - El rótulo es «Pausar» en marcha; «Iniciar foco» si los segundos mostrados son `minutes * 60` o 0; y «Continuar» en otro caso.
  - El restante es `Math.max(0, Math.ceil((deadline - Date.now()) / 1000))` y nunca una cuenta de ticks (FR-027).
- **El ritmo:** hoy el intervalo corre desde el arranque y el nuevo, desde el clic. Con el reloj de Playwright en pausa, el arranque y el clic ocurren en el mismo instante, así que `reload.spec.ts` (iniciar, `runFor(60_000)`, «24:00») da lo mismo. Fuera de las pruebas, la diferencia es de menos de 500 ms en el momento del aviso.
- **Alternativas:**
  - Un intervalo siempre activo, como hoy: la hoja de ruta lo retira.
  - Un `setTimeout` al vencimiento más un intervalo de dígitos sólo con la página montada: son dos temporizadores para un mismo estado, y un desmontaje en el momento justo deja los dígitos viejos al volver. Lo de arriba usa uno solo.
  - `useSyncExternalStore` con una suscripción escrita a mano: Zustand ya está instalado y es el patrón de `changes`.
  - Guardar el temporizador en `sessionStorage`: cambia el contrato de `reload.spec.ts` (spec, «Alternativas consideradas»).

### R3. Los selectores de pasos y la operación de alternar, en `entities/guide`

> **Enmienda del 2026-10-28 (noche):** la operación de alternar es `routeStore.toggleMark` de F4, ya en `master`; F9 no crea `toggleRouteItem` (R17). Lo de abajo sobre `toggleRouteItem` queda como historia.

- **Decisión:**
  - `entities/guide/model/route-selectors.ts` exporta `trackSteps`, `countCompletedSteps` y `nextPendingStep`, y `app.js` los usa en `stepsFor` y `completedCount` para la barra lateral. Es la «una sola fuente» de FR-023.
  - `entities/guide/model/toggle-route-item.ts` exporta `toggleRouteItem`, con la semántica de `toggleItem`: agrega al final o quita con `splice`, sobre el arreglo vivo.
- **Por qué no en la página:** `app.js` es el dueño del índice de `entities/guide` (R4 de `seams-guard-check`) y puede importar de ahí sin más. Si importara de `pages/route`, el bundle de `app-shell-check` arrastraría una página de React.
- **Lo compartido con F3 y F4:** `toggleRouteItem` es la operación de FR-036 de F4. Si F3 o F4 ya la crearon con otro nombre, F9 usa la suya. `toggleItem` de `app.js` lo borra el último de F3, F4 y F9: si F9 no es el último, lo deja, porque Biblioteca y Proyecto lo siguen usando.

### R4. Cómo se entera el shell de una escritura de la página

- **Decisión:** `startApp()` se suscribe a la revisión del recorrido y redibuja el shell entero: `routeStore.changes.subscribe(() => syncShell())`.
- **Con F4 en la base** (enmienda del 2026-10-28, R17): F4 se suscribió con `routeStore.changes.subscribe(updateSaveLabel);` inmediatamente después de `routeStore.open(data);` (`frontend/app.js:29`). F9 borra esa línea y pone la suya antes del `render();` final, porque `syncShell` lee `const` que se declaran después (`stepsFor`, `completedCount`, `languageName`) y `currentView`; y saca las llamadas a `updateSaveLabel()` que la suscripción vuelve redundantes (la de `save()` y la que sigue a `applyImport`), salvo que F8 ya lo haya hecho.
- **Por qué `syncShell` y no sólo `updateSaveLabel`:** FR-022 pide la barra lateral («N de 12», el porcentaje y la barra de progreso) además de la etiqueta. `syncShell` termina llamando a `updateSaveLabel`, y todo lo que escribe es idempotente: `aria-pressed`, `aria-current`, los textos y `#resource-count`.
- **Lo compartido:** F3 (FR-014) propone la suscripción sólo para el pie.
  - Si F3 entró antes, F9 cambia su `updateSaveLabel` por `syncShell`, que lo contiene.
  - Si F9 entra primero, la crea con `syncShell`, y F3, F4 y F8 la heredan.
- **Alternativas:**
  - Un callback que el adaptador le pasa a la página: ata la página al shell que F10 reemplaza.
  - Que la página llame a `syncShell`: la spec lo descarta.

### R5. Las specs de componente y el singleton del almacén

- **Decisión:** `RoutePage` recibe `store?: RouteStore`, con `routeStore` por omisión. El adaptador no lo pasa, porque R4 le prohíbe importarlo. Cada spec de componente abre una instancia de `createRouteStore()` sobre un `StorageLike` en memoria. R3 de `seams-guard-check` ignora las specs.
- **Por qué:** el singleton se abre una sola vez por contexto. Reabrirlo en cada caso exigiría `vi.resetModules()` y un `import()` dinámico por prueba, y eso esconde el contrato de la página.
- **Lo compartido:** F3 y F4 tienen el mismo problema. El primero que se integre fija este patrón, que va como hallazgo en el informe.
- **El temporizador** no recibe una inyección: la spec de componente usa el singleton `focusTimer` y lo reinicia en `afterEach`. La spec del modelo usa la fábrica.

### R6. El idioma y el contenido llegan por props

- **Decisión:**
  - `mount(host, language, toast)` conserva la firma de FR-014.
  - El adaptador valida el idioma como el Atlas (`'go'` o, si no, `'rust'`) y le pasa a la página `guide={getContent().guide}`, `language` y `notify={toast}`.
  - La página elige `guide.tracks[language]` y lee el progreso vivo con `store.getProgress()` en cada render.
- **Por qué es el idioma vivo (FR-016):** `app.js` pasa `routeState().language` en cada `render()`, y cambiar de idioma, navegar, importar y «Borrar todo» siempre vuelven a montar la página. Mientras está montada, el idioma no cambia por otra vía. Hasta `syncLinkedLanguage` corre sólo dentro de `navigateFromLocation`, antes de `render()`.

### R7. El montaje es síncrono

- **Decisión:** `flushSync(() => root.render(...))` en `mount`, como recomienda la documentación de React para cuando el código que sigue depende del DOM.
- **Por qué:** cuando `mount` vuelve, la página tiene que estar dibujada (FR-009). Lo que sigue en `app.js` depende de eso: el foco en `#main` de `navigateFromLocation` y la lectura de `boot-check`.
- **Alternativa descartada:** la forma del Atlas, que monta en el cuadro siguiente.
- **El aviso de error** usa `onUncaughtError` con «No se pudo mostrar el recorrido.», como el del Atlas.

### R8. El diálogo de la lección

- **Decisión:**
  - **Cuándo existe:** `LessonDialog` se dibuja sólo mientras hay una lección abierta, con `createPortal` a `document.body` desde la raíz de la página (Q4). Conserva `id="lesson-dialog"`, `aria-labelledby="lesson-title"` y el `div.dialog-content#lesson-content`, así el DOM abierto es el de hoy (FR-040).
  - **La apertura:** `showModal()` corre en un `useLayoutEffect` al montarse, después de que el contenido está en el DOM. El foco cae donde lo pone el navegador, que se espera que sea «×».
  - **El cierre:** `onClose` atiende los tres caminos (Esc, «×» y «Seguir después») y también los cierres que dispara la página («Marcar como hecho» y «Volver a practicar»). Devuelve el foco al abridor con `preventScroll` y vacía el estado, lo que desmonta el diálogo.
  - **La región viva:** `#quiz-feedback` se recrea en cada apertura, porque el diálogo se vuelve a montar (X2).
- **La diferencia con hoy:** con la lección cerrada no hay ningún `<dialog id="lesson-dialog">` en `<body>`. Hoy hay uno cerrado e invisible, que FR-017 saca de `index.html`. Abierto, cuelga de `<body>` al final, y no entre `.app-shell` y `#confirm-dialog`. El barrido y la comparación lo tienen en cuenta: quickstart, §4.
- **El desmontaje con la lección abierta** (Atrás o Adelante): el diálogo sale del DOM sin evento `close`, así que no hay `setState` después del desmontaje. `navigateFromLocation` pone el foco en `#main`, como en cualquier navegación.
- **Los eventos del portal** se propagan por el árbol de React (documentación de `createPortal`). Ningún ancestro de la lección tiene `onClick`: el diálogo es hermano de las secciones. En el DOM, sus clics no suben por `#main`, así que los delegados de `app.js` no los ven.
- **Cuando el abridor desapareció:** completar el último paso pendiente desde la tarjeta cambia el `<button>` «Empezar esta sesión» por el `<a>` «Continuar mi proyecto». FR-036 no dice adónde va el foco en ese caso. El plan lo manda a ese enlace, que ocupa el lugar del abridor. Es la decisión 1 del informe, y su E2E va en el commit en rojo.
- **Alternativas:**
  - Un `<dialog>` siempre montado en el portal: el DOM cerrado se parecería más al de hoy, pero suma un contador de aperturas y un efecto que reacciona a él.
  - Una librería de diálogos: la spec la descarta.

### R9. Los módulos se abren al montar y después son del alumno

- **Decisión:**
  - `RouteModules` calcula el módulo abierto una vez, con `useState(() => defaultOpenModule(...))`, y pasa `open={index === initiallyOpen}`. Como esa prop no cambia mientras la página vive, React nunca vuelve a tocar el atributo, y lo que el alumno abrió o cerró queda así (FR-025, X1).
  - No es una copia del progreso (FR-019): es estado de interfaz que se fija al montar.
  - El botón de la tarjeta no lleva `key` por paso, para que React lo conserve al pasar de un paso al siguiente y el foco vuelva a él (US2-5).
- **Alternativa descartada:** recalcular `open` en cada render. Así vuelve el comportamiento de hoy, y los módulos que el alumno abrió se cierran.

### R10. El CSS se muda en su propio commit, antes del port

- **Decisión:** las 114 reglas del Recorrido y dos selectores de impresión pasan a `frontend/src/pages/route/ui/route.css`, que `main.tsx` importa justo después de `styles.css` y antes de `lab.css`.
- **El orden del commit:** es un commit propio, antes de montar la página. El primer barrido compara el legacy con `styles.css` contra el legacy con `route.css`: el mismo DOM, así que cualquier diferencia es de cascada. El barrido final compara la base contra el port.
- **Por qué justo después de `styles.css`:** cada regla movida queda antes de `lab.css`, `atlas.css`, `campaign.css` y `systems.css`, como hoy. Sólo cambia su lugar respecto del resto de `styles.css`.
- **Los dos selectores de impresión no son opcionales:** `.focus-timer` y `.module` viven hoy dentro de dos reglas compartidas de `@media print` (las líneas 1690 y 1711 de la base). Si quedaran ahí, la regla base mudada `.focus-timer { display: flex }` vendría después y le ganaría al `display: none` de impresión: el temporizador se imprimiría.
  - Se parte cada regla: el selector del Recorrido pasa a un `@media print` al final de `route.css`, con la misma declaración, y la regla de `styles.css` pierde ese selector.
  - El multiconjunto por selector individual no cuenta la partición como diferencia. El barrido suma la emulación de impresión, y un E2E fija que al imprimir el temporizador no se ve.
- **El riesgo que queda:** una regla que se queda en `styles.css` con la misma especificidad que una del Recorrido, sobre el mismo elemento y la misma propiedad, que hoy gana por venir después y que al mudar pierde.
  - Se revisaron a mano los cruces de la base: `.dialog-content p` contra `.lesson-block p` y `.done-criteria p` (las del Recorrido ya ganaban y siguen ganando), `.dialog-content p` contra `.quiz-feedback` (gana la especificidad, y `.quiz-feedback` usa `!important`), `[hidden]` (`!important`) y `@media (max-width: 590px) .button` (ninguna regla del Recorrido apunta a `.button`). No se encontró ninguno.
  - El barrido es la prueba.
- **`load-order-check`** suma dos restricciones: `styles.css` antes que `route.css`, y `route.css` antes que `lab.css`.
- **Alternativa descartada:** importar la hoja desde `RoutePage.tsx`. La página entra en un chunk dinámico (la cadena de `legacy-views.ts`), y Vite trata aparte el CSS de un chunk asíncrono (documentación de `build.cssCodeSplit`). Su lugar en el `<style>` final dejaría de controlarse desde `main.tsx`. Por eso el Atlas importa su hoja en `main.tsx`.

### R11. Cómo cambian `boot-check` y `app-shell-check`

- **`boot-check`:**
  - El Recorrido es la vista por omisión. Con React, `#main.innerHTML` queda vacío, y cinco lecturas lo usaban como señal de que se dibujó: el escenario «arranque», la rama del Recorrido de «navegación», «startApp initializes in order and draws the first view», la bandera «after drawing» de `recordInitializations` y «a retry that succeeds».
  - `FakeElement.textContent` no junta el texto de los hijos. Al planificar, el plan sumaba `hasDrawn` y `drawnText` a `qa/lib/fake-dom.ts`. **Con la enmienda del 2026-10-28** (R17) se usa la forma canónica: `mountedText`, el de F4, que ya está en `qa/boot-check.ts`. Las cuatro lecturas que no son la navegación pasan a `main.innerHTML + mountedText(main)`, que sirve antes y después del port, así que el cambio va en un commit previo al corte, sin tocar ningún valor esperado. La navegación pasa el Recorrido a `REACT_VIEWS` en el corte.
  - El mismo commit suma «startApp registers no interval», que falla contra el legacy por el `setInterval` de `app.js` (FR-013, US5-3).
  - En el commit del corte, `RESET_METHODS` suma `TallerRoute.resetTimer` después de `TallerSystems.resetSimulations` (FR-031).
- **`app-shell-check`:**
  - El escenario «almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar» desmarca el paso por el delegado de `change`, que el port retira. Pierde su parte del paso, con su aserción, y la spec de `RoutePage` la toma con los mismos valores (`completed: ['rust-ownership']`).
  - Si F3 y F8 ya sacaron sus partes, el escenario queda sin acción y se retira con su fila de correspondencia.
  - Como todo arnés arranca en el Recorrido, `TallerRoute` entra en `qa/lib/app-adapters.ts`, y el arnés suma `TallerRoute: {}`.

### R12. Los E2E

- **El Page Object:** `qa/e2e/pages/route.ts` (la clase `RoutePage`, como `AtlasPage`) y su fixture `route`. Para «Borrar todo», el Page Object de Método que creó F5 (`qa/e2e/pages/method.ts`, con `resetProgress()` y `confirmReset()` y la fixture `method`; `impl-f5`, `d7944d81`): F9 le suma `resetAllProgress()` e `importCopy()`. Si F9 entra antes que F5, lo crea con la clase de F5 más sus dos métodos. Si F8 ya entró, se usa el suyo.
- **Cinco specs:**
  - `route-steps.spec.ts`: US1, el teclado y la impresión;
  - `route-lesson.spec.ts`: US2, salvo el foco que cambia;
  - `route-timer.spec.ts`: US3, con `page.clock`;
  - `route-progress.spec.ts`: US4;
  - `route-kept-state.spec.ts`: lo que adopta React por X1 y Q4.
- **Los cuatro primeros pasan contra el legacy en un commit.** El quinto falla contra el legacy, por la razón esperada, en un commit en rojo propio.
- **El rojo, escenario por escenario:**
  - el módulo abierto a mano sigue abierto;
  - el foco vuelve al botón de la tarjeta después de «Marcar como hecho» (hoy va al título);
  - el foco vuelve al título después de «Volver a practicar» cuando el paso pasa a ser el próximo (hoy va a la tarjeta);
  - completar el último paso desde la tarjeta deja el foco en «Continuar mi proyecto» (hoy va al título);
  - navegar con la lección abierta la cierra (hoy queda abierta sobre la otra vista).
- **El foco de la casilla** pasa contra el legacy, porque `restoreStepFocus(id, true)` vuelve a la casilla nueva y el localizador la vuelve a resolver. Por eso va en el commit verde.
- **Lo que un E2E contra el legacy no puede probar:** «no queda ningún intervalo con el temporizador detenido» y «`startApp` deja 0 intervalos». Hoy siempre hay uno. Van en Vitest (`vi.getTimerCount()`) y en `boot-check`.

### R13. La pila de pruebas de componentes

> **Enmienda del 2026-10-28 (noche):** la pila llegó con #67 (`7aa96018`): los proyectos `node` y `dom` y el setup `frontend/src/vitest.setup.ts`, no `frontend/src/app/test-setup.ts`. F9 no la instala ni la configura. La guarda de `useStore` es el bloque de F6 (`[arguments.length=1]`), que entra con F5 o F6, o con T002 si ninguno entró (R17). Lo de abajo queda como historia.

- **Si F9 es el primero en traerla,** pide permiso para las versiones del ADR 0008: `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1. Todas son MIT, sólo `devDependencies`. En el registro hay parches más nuevos (`jsdom` 30.1.3 y `user-event` 14.6.8): el plan se queda con las del ADR y lo informa.
- **`frontend/vitest.config.ts`** pasa a dos proyectos en línea, `node` (`**/*.spec.ts`) y `jsdom` (`**/*.spec.tsx`, con su setup). La raíz deja de tener `name`, `environment` e `include`. En Vitest 5 los proyectos en línea heredan la raíz por omisión y concatenan los arreglos: si la raíz conservara su `include`, el proyecto `jsdom` también correría los `*.spec.ts`.
- **El setup** es `frontend/src/app/test-setup.ts`, dentro de `frontend/src/` para que `tsc` vea los tipos de jest-dom (ADR 0008). Importa `@testing-library/jest-dom/vitest` y llama a `cleanup()` en `afterEach`, porque no hay `globals`.
- **La guarda de `useStore`** (SC-011) va en `eslint.config.ts`: `no-restricted-syntax` sobre `useStore` con menos de dos argumentos.
- **Si F3 o F4 ya trajeron la pila,** F9 la usa como está y no pide nada.
- **fishery no entra:** los datos salen de `build/curriculum.json` (la guía real, como en `lab-store.spec.ts`) y de objetos escritos a mano. Ninguna entrada se repite tanto como para justificar una fábrica (FR-042).

### R14. `resetTimer`, con sus dos ramas (F8-Q2)

- **Rama A, F9 antes que F8** (la esperada: F9 va en la primera ola y F8 espera a F11a):
  - `TallerRoute` publica `resetTimer`;
  - `sessionResets` de `app.js`, de la unidad 6 de F2b, cambia su segundo cierre por `() => window.TallerRoute?.resetTimer()`, en el orden de hoy;
  - F8 lo retira después, cuando el armado de `src/app/` importa `focusTimer` de `pages/route`.
- **Rama B, F8 antes que F9:**
  - el armado ya vive en un módulo de `src/app/`;
  - F9 le suma `() => focusTimer.reset()` como el último paso de sesión, después del de las simulaciones;
  - `startApp()` deja de registrar el cierre del temporizador;
  - `TallerRoute` publica sólo `mount` y `unmount`.

  Eso contradice el «tres métodos» de FR-014, SC-006 y US5-2. Es un hallazgo: manda la regla de orden de F8-Q2, que el usuario decidió después de la spec.

### R15. Lo que comparte con F3 y F4, si entra primero y si entra después

Está en el plan, en «Lo compartido con F3, F4 y F8». En resumen:

| Pieza | Si F9 entra primero | Si F9 entra después |
| --- | --- | --- |
| La suscripción del shell | La crea con `syncShell` | Cambia la de F3 por `syncShell`, si era sólo `updateSaveLabel` |
| La operación de alternar | No aplica: F4 dejó `routeStore.toggleMark` | `toggleStep` llama `store.toggleMark('completed', id)`; si F3 ya entró, borra `toggleItem` de `app.js` |
| Los bloques compartidos de CSS | Saca sus reglas de los `@media` compartidos y parte las dos reglas de impresión | Rebasa: saca lo suyo de bloques que otro ya tocó, por texto y no por número de línea |
| La pila de componentes | No aplica: llegó con #67 | La usa como está; suma la guarda de F6 sólo si falta |
| `boot-check` | No aplica: F4 dejó `mountedText` | Usa `mountedText` en las cuatro lecturas y agrega `recorrido` a `REACT_VIEWS`, sin ayudantes en `fake-dom.ts` |
| El patrón `store` por prop | Lo fija | Lo sigue |

### R16. El tamaño

La base `f2b-acum` no tiene un `dist/`. Al planificar no se reconstruyó: la medida de partida la toma T001. La hoja de ruta registra 1 141 337 caracteres con F2b (medida del coordinador). El tope de `qa/build-check` era 1 250 000 al planificar; desde #76 es 1 500 000 (`BOOT_SIZE_LIMIT`).

- **Lo que sale de `app.js`:** cerca de 9 000 caracteres de fuente con sus plantillas.
- **Lo que entra:** siete componentes, tres módulos de modelo, el adaptador y el hook `useStore` de Zustand, que el bundle todavía no tenía (F2a sólo usaba `zustand/vanilla`).
- **La compuerta:** el HTML queda bajo 1 500 000, con el antes y el después en el PR. Si crece más de 8 000 caracteres, el coordinador lo revisa antes de seguir. `import.meta` del script del dist cuenta la base de T001 más uno, por la entrada nueva de `LEGACY_MODULES` (TR-4).

### R17. Lo que fijaron F4 a F6 (enmienda del 2026-10-28, noche)

El plan se escribió antes de que F4, F5 y F6 se implementaran. Lo que fijaron manda sobre el plan, según las entradas `aplicar` de «F9» y «Transversal» de `.coordinador/hallazgos-para-planes.md` y las decisiones de esa noche (`.coordinador/clarify-decisiones.md`). El código se leyó con `git show` en estos commits, sin correr nada:

| Pieza | Qué fijó la implementación | Dónde | Qué cambia en F9 |
| --- | --- | --- | --- |
| Alternar un paso | `routeStore.toggleMark(collection: RouteMarkCollection, id: string): boolean`: agrega al final o quita, escribe una vez y avisa una vez | `master` `431c9d90`, `frontend/src/entities/guide/model/route-store.ts:21`, `:27` y `:97`; probado en `route-store.spec.ts` con `completed` | §3.0, T011, T012 y T014: sin `toggleRouteItem`; `toggleStep` llama `store.toggleMark('completed', stepId)`. T018 borra `toggleItem` de `app.js` sólo si F3 ya entró |
| La suscripción del shell | `routeStore.changes.subscribe(updateSaveLabel);` después de `routeStore.open(data);` | `master`, `frontend/app.js:29`; `.coordinador/pr-impl-f4.md:26` | T018 borra esa línea, pone `() => syncShell()` antes del `render();` final y saca las llamadas redundantes a `updateSaveLabel()` |
| El Page Object de Método | `qa/e2e/pages/method.ts` con `MethodPage`, `resetProgress()` y `confirmReset()`, y la fixture `method` | `impl-f5` `efaf39b2` (commit `d7944d81`) | T003 le suma `resetAllProgress()` e `importCopy()`; si F9 entra antes que F5, lo crea con la clase de F5 |
| La pila de componentes | jsdom, Testing Library y fishery; los proyectos `node` y `dom`; el setup `frontend/src/vitest.setup.ts` | `master` (#67, `7aa96018`), `frontend/vitest.config.ts` | T002 sólo verifica; no hay `app/test-setup.ts`, ni proyecto `jsdom`, ni `passWithNoTests` |
| La guarda de `useStore` | El bloque con `CallExpression[callee.name='useStore'][arguments.length=1]` y su mensaje, antes del de `complexity` | `impl-f6` `b20028be`, `eslint.config.ts:43-54` (commit `e30ad0bf`); igual en `impl-f5` (commit `c6e7ebda`) | T002 lo suma tal cual sólo si ni F5 ni F6 entraron |
| `boot-check` | La condición de F4 (`view === 'atlas' \|\| view === 'proyecto'`) con `mountedText`, que lee también el `textContent` del elemento; F5 la pasa a `REACT_VIEWS` | `master`, `qa/boot-check.ts:85-87` y `:111`; `impl-f5`, `qa/boot-check.ts:85` | T017 usa `mountedText` en las cuatro lecturas de la vista por omisión, sin `hasDrawn` ni `drawnText`; T018 pasa el Recorrido a `REACT_VIEWS` |
| `import.meta` en el dist | Vite envuelve cada `import()` de `legacy-views.ts` con `import.meta.url`: F4 lo llevó de 22 a 23 | `.coordinador/pr-impl-f4.md:33`; `frontend/src/app/boot/legacy-views.ts:4` | La compuerta espera la base de T001 más uno |
| El tope del HTML | `BOOT_SIZE_LIMIT = 1500000` | `master`, `qa/build-check.ts:11` (#76) | 1 500 000 en «Restricciones globales», T001, R16 y quickstart §2 |
| Los stubs del rojo | `const` tipados, sin parámetros; los componentes como `FunctionComponent<Props>` | `.coordinador/hallazgos-para-planes.md`, TR-2 | Reglas, T011, T013 y T015 |
| Las trampas del barrido | El puntero sobre un nodo que React conserva, el `<details>` cerrado ya medido y los textos que JSX parte | TR-13 (`impl-f5/.superpowers/sdd/plan/T025-report.md:49-53`) | T016 («Un texto, un nodo»), T010, T019 y quickstart §3.1 |

**Lo que no cambia:** la forma de la página, el temporizador, la lección, los E2E y sus valores, las ramas de `resetTimer` y el patrón `store` por prop.

## Context7

El servidor `mcp__context7__*` agotó su cuota mensual el 2026-10-28, a la primera consulta. Todas las consultas de abajo salieron del segundo servidor de Context7 (`mcp__44441c24-…`), que devuelve la misma documentación. Cuando Context7 no tenía la versión exacta o el dato, se usó la documentación oficial con `WebFetch`, como se indica.

| Librería | Versión del lockfile | ID y versión consultada | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | `vi.useFakeTimers`, `advanceTimersByTime`, `getTimerCount`, `useRealTimers` | Por omisión falsea `setTimeout`, `setInterval`, sus `clear*`, `setImmediate` y `Date`; `getTimerCount()` cuenta los temporizadores en espera; `useRealTimers()` descarta los pendientes | Sí: la spec del temporizador usa `Date.now()` falso y `getTimerCount()` para «0 intervalos» (FR-032), sin inyectar un reloj |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | `test.projects` en línea: herencia y fusión | Los proyectos en línea heredan la raíz por omisión desde la 5.0 (`extends: true`); los arreglos (`include`, `setupFiles`) se concatenan; `name` no se hereda | Sí: la raíz sólo lleva `projects` (R13) |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `page.clock`: `install`, `pauseAt`, `runFor`, `fastForward` | `pauseAt` detiene el tiempo y sólo `runFor`, `fastForward`, `pauseAt` o `resume` disparan temporizadores; `runFor` dispara todos los del intervalo; `fastForward` dispara los vencidos una sola vez | Sí: los E2E del temporizador usan `install` + `pauseAt` antes de navegar y `runFor`, como `reload.spec.ts`; el ritmo de 500 ms se fija con `runFor(999)` y `runFor(1)` |
| React | 19.2.8 | `/websites/react_dev_reference` (sin versión; la documentación vigente es la de 19.2) | `createPortal` | Lo dibujado en un portal se comporta como hijo del componente: los eventos de React suben por el árbol de React, no por el del DOM | Sí: el diálogo es hermano de las secciones, sin `onClick` en ningún ancestro (R8) |
| React | 19.2.8 | `/websites/react_dev_reference` | `flushSync` y `root.render` | `root.render` no es síncrono; envolverlo en `flushSync` hace el primer render completo antes de volver | Sí: el montaje síncrono de FR-009 (R7) |
| React | 19.2.8 | `/websites/react_dev_reference` | Eventos de `<dialog>` y `<details>` | React expone `onCancel` y `onClose` para `<dialog>` y `onToggle` para `<details>` | Sí: el cierre por Esc se sincroniza con `onClose` (FR-033). `onToggle` no hace falta (R9) |
| React | 19.2.8 | `/react/react/v19.2.8` | Lo mismo de `<dialog>`, en el repositorio con versión | Sin resultados para la consulta | No: se usó la referencia de react.dev |
| Zustand | 5.0.15 | `/pmndrs/zustand/v5.0.12` (la más cercana publicada en Context7) | `createStore` de `zustand/vanilla` y `useStore(store, selector)` | `useStore` lee un store de vanilla con un selector; `subscribe` notifica en cada `setState` | Sí: el temporizador es un store de vanilla, y la página lee `phase` y `remaining` con dos selectores chicos (SC-011) |
| Testing Library | `@testing-library/react` 16.3.3 (instalada con #67) | `/testing-library/testing-library-docs` | `cleanup` sin `globals` en Vitest; jest-dom con Vitest | Sin `globals`, `cleanup()` va en un `afterEach` del setup; los matchers entran con `import '@testing-library/jest-dom/vitest'` | Sí: `app/test-setup.ts` (R13) |
| user-event | 14.6.7 (instalada con #67) | `/testing-library/testing-library-docs` | `userEvent.setup({ advanceTimers })` con temporizadores falsos | Con timers falsos hay que pasar la función que avanza el reloj; `delay: null` no se recomienda | Sí: las specs de componente con el temporizador usan `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` |
| jsdom | 30.1.2 (instalada con #67) | `/jsdom/jsdom/v29.0.1` (la más nueva en Context7) | `HTMLDialogElement` y el foco | Context7 no trae el IDL del diálogo. Sí confirma que `activeElement` vuelve a `body` cuando el elemento con foco sale del DOM | La fuente oficial (abajo) decidió |
| jsdom | 30.1.2 | `WebFetch` de `jsdom/jsdom`, rama `main`, `lib/jsdom/living/nodes/HTMLDialogElement.webidl` | `show`, `showModal` y `close` | Sólo `open` está declarado; los tres métodos siguen comentados (como verificó el ADR 0008) | Sí: la spec del diálogo define un stub de `showModal` y `close`; el foco y Esc van al E2E (FR-042) |
| Vite | 8.3.2 | `/vitejs/vite/v8.0.10` (la más nueva en Context7) | `build.cssCodeSplit` y el CSS de los chunks asíncronos | El CSS de un chunk asíncrono se trata aparte; desactivar el code split junta todo en un archivo | Sí: `route.css` se importa en `main.tsx` y no desde la página (R10) |
| fishery | 2.4.0 | — | — | No se consultó: no entra (R13) | — |
| nuqs | — | — | — | No aplica: el Recorrido no pone nada en la URL (FR-016) | — |
| React Hook Form | — | — | — | No aplica: el Recorrido no tiene formularios | — |
| ESLint | 10.12.0 | `/eslint/eslint` (enmienda del 2026-10-28) | Selectores de `no-restricted-syntax` con igualdad sobre un atributo anidado | `[attr=123]` y `[attr.level2=…]` están soportados; el ejemplo oficial usa `[arguments.length!=2]` | Sí: la guarda canónica de F6 (`[arguments.length=1]`) en T002, en lugar de `[arguments.length<2]` y su respaldo |

## Mediciones de sólo lectura

Se midieron con `postcss` 8.5.28 (de `node_modules` del worktree `f2a`, sin instalar nada) sobre `f2b-acum/frontend/styles.css` y leyendo las fuentes, desde scripts en el scratchpad.

**Las reglas de `styles.css` en la base.** Son 354, no las 336 de la spec, porque la unidad 8 de F2b sumó 18 al final.

**La clasificación.** Una regla es del Recorrido si cada selector nombra al menos una clase que sólo dibujan `routeCode`, `renderRoute`, `timerMarkup`, `openLesson` y `showQuizFeedback` (líneas 184 a 226 y 343 a 374 de `app.js`). Las clases que también dibujan otra función de `app.js`, otra vista, un componente de React o `index.html` no cuentan: `.button`, `.secondary`, `.eyebrow`, `.eyebrow-line`, `.pill`, `.accent`, `.small-label`, `.text-button`, `.step-check`, `.recommendation-strip`, `.strip-icon` (que también dibuja `renderProject`) y `.dialog-actions` (que también usa `#confirm-dialog`). El resultado coincide con la spec: 71 reglas base y 43 en cinco `@media`, más dos selectores dentro de reglas compartidas de impresión.

| Bloque | Reglas, en el orden de hoy |
| --- | --- |
| Base (71) | `.hero`, `.hero h1`, `.hero h1 em`, `.hero-description`, `.hero-meta`, `.code-art`, `.code-window`, `.window-top`, `.window-dots`, `.window-dots i`, `.code-window pre`, `.code-window .token`, `.code-window .comment`, `.art-caption`, `.section-heading`, `.section-heading h2`, `.section-heading p`, `.section-heading .small-label`, `.focus-card`, `.focus-content`, `.focus-content .small-label`, `.focus-content h2`, `.focus-content p`, `.focus-timer`, `.timer-options`, `.timer-options button`, `.timer-options button[aria-pressed='true']`, `.timer-digits`, `.timer-controls`, `.timer-controls button`, `.timer-reset`, `.timer-note`, `.route-intro`, `.modules`, `.module`, `.module summary`, `.module summary::-webkit-details-marker`, `.module-number`, `.module-title`, `.module-title strong`, `.module-title span`, `.module-count`, `.module-chevron`, `.module[open] .module-chevron`, `.module[open]`, `.module-steps`, `.step-row`, `.step-row:last-child`, `.step-title`, `.step-title span`, `.step-check:checked + .step-title`, `.step-open`, `.dialog-top`, `.close-dialog`, `.lesson-block`, `.lesson-block h3`, `.lesson-block p`, `.done-criteria`, `.done-criteria .small-label`, `.done-criteria p`, `.lesson-resources`, `.lesson-resources a`, `.quiz`, `.quiz h3`, `.quiz-options`, `.quiz-option`, `.quiz-option .option-letter`, `.quiz-option[aria-pressed='true']`, `.quiz-feedback`, `.quiz-feedback.correct`, `.completion-banner` |
| `@media (min-width: 1550px)` (2) | `.hero`, `.hero h1` |
| `@media (max-width: 1150px)` (7) | `.hero`, `.hero h1`, `.code-window`, `.code-window pre`, `.focus-card`, `.focus-content`, `.focus-timer` |
| `@media (max-width: 850px)` (4) | `.hero h1`, `.hero`, `.code-window`, `.focus-card` |
| `@media (max-width: 590px)`, el primero de los dos (29) | `.hero`, `.hero h1`, `.hero h1 em`, `.hero-description`, `.hero .eyebrow`, `.code-art`, `.hero-meta`, `.focus-card`, `.focus-content`, `.focus-content h2`, `.focus-content p`, `.focus-timer`, `.focus-timer > .small-label`, `.timer-options`, `.timer-options button`, `.timer-digits`, `.timer-controls`, `.timer-note`, `.section-heading`, `.section-heading h2`, `.section-heading .small-label`, `.module summary`, `.module-title strong`, `.module-title span`, `.module-count`, `.module-number`, `.module-steps`, `.step-row`, `.quiz-option` |
| `@media print` (1 regla y 2 selectores) | la regla `.code-window`; el selector `.focus-timer` de la lista que oculta (`.sidebar, .topbar, .focus-timer, …, #toast { display: none }`) y el selector `.module` de `.resource-card, .module, .milestone { break-inside: avoid }` |

Las líneas de la base van de 287 a 1237 para las reglas base y de 1291 a 1719 para los `@media`, pero las tareas ubican cada regla por texto y no por número de línea: F3 y F4 pueden haberlas corrido.

**Lo que hoy cuelga del Recorrido en `app.js`** (base `2b37caf4`):

- `allSteps` (24);
- `currentStepId`, `lessonOpener` y `timer` (95 a 98);
- `restoreStepFocus` (115);
- `routeCode`, `renderRoute`, `timerMarkup` y `updateTimer` (184 a 225);
- `setInterval(updateTimer, 500)` (226);
- el segundo `sessionResets` (316 a 319);
- `openLesson` y `showQuizFeedback` (343 a 374);
- los dos oyentes de `#lesson-dialog` (375 a 408);
- las ramas `lesson`, `duration`, `timer` y `timer-reset` del clic (448 a 477);
- la rama `stepCheck` del `change` (510 a 515);
- `recorrido: renderRoute` y el `updateTimer()` final de `render()` (164 y 182).

`stepsFor`, `completedCount`, `languageName`, `toggleItem`, `syncShell`, `save`, `updateSaveLabel` y `toast` siguen, porque los usan el shell y otras páginas. Con la enmienda (R17), `toggleItem` sale si F3 ya entró, porque no le quedan llamadas.

**Los checks que tocan el Recorrido:**

- `boot-check`: cinco lecturas de `#main.innerHTML` (R11), «borrar todo» con `RESET_METHODS` y los ids `lesson-dialog` y `lesson-content` en `qa/lib/boot-harness.ts`.
- `app-shell-check`: un escenario con `stepCheck` («almacén: desmarcar un paso…») y los mismos dos ids en `qa/lib/app-shell-harness.ts`.
- `load-order-check`: la cadena y las hojas de `main.tsx`.
- Ningún E2E de F1 abre una lección ni marca un paso, salvo `startup-storage.spec.ts`, que marca la primera casilla y recarga. `reload.spec.ts` fija el temporizador.

**Metadatos del registro** (`npm view <paquete>@<versión> version dist.unpackedSize license`, 2026-10-28):

| Paquete | Desempaquetado | Licencia |
| --- | --- | --- |
| `jsdom` 30.1.2 | 5 533 799 B | MIT |
| `@testing-library/react` 16.3.3 | 339 581 B | MIT |
| `@testing-library/dom` 10.4.2 | 2 467 302 B | MIT |
| `@testing-library/user-event` 14.6.7 | 437 525 B | MIT |
| `@testing-library/jest-dom` 7.0.1 | 331 873 B | MIT |

Con sus dependencias, la estimación del ADR 0008 sigue siendo de 56 paquetes, unos 26,3 MB desempaquetados y 5,0 MB comprimidos. Si la tarea de permiso llega después de que otro ítem los instaló, no hace falta.

**Lo que no se midió** y mide T001 sobre la base de implementación:

- el tamaño del HTML;
- los avisos de complejidad (35 según el plan de F2b);
- la cantidad de E2E (106 de F1 y 17 de A2);
- los escenarios de cada check;
- los hashes del dist.
