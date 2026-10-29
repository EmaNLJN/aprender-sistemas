# Research: F4 · Proyecto, el port de la página y de sus hitos

**Fecha:** 2026-10-28 · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md) · **Validación:** [quickstart.md](./quickstart.md)

Las decisiones técnicas del plan, con sus alternativas, la tabla de Context7 y lo que se midió en sólo lectura. Nada se ejecutó sobre el código: no corrieron `npm`, el build, los checks, los E2E ni Docker, y no se descargó nada. El código citado es el de `f2b-acum` (`2b37caf4`): `master` con F2a, A2 y las cuatro unidades de F2b, que entran a `master` antes de implementar F4.

## Decisiones

### R1. El catálogo de hitos y quién deriva a quién (Q1, FR-016 a FR-018)

- **Decisión:** el catálogo vive en `frontend/src/entities/guide/model/project-milestones.ts` (`PROJECT_MILESTONES`, `MILESTONE_LANGUAGES`, `milestoneId` y `milestoneHint`), y `MILESTONE_IDS` pasa a derivarse de él en `milestone-ids.ts`. La spec de F2a (`milestone-ids.spec.ts`), con los diez literales a mano, no se edita y sigue siendo la que fija la lista. Así los sufijos y su orden tienen una sola definición, y tres fuentes independientes los atan: esa spec, la del catálogo y `route-milestones-check` contra el fixture compartido.
- **Alternativas:**
  - **`MILESTONE_IDS` a mano y el catálogo indexado por sufijo:** son dos listas que pueden divergir, que FR-017 no acepta.
  - **El catálogo derivado de `MILESTONE_IDS`:** obliga a partir cada ID por el prefijo del idioma y a repetir los sufijos como claves de los textos.
- **Nombres de los campos:** `suffix`, `title`, `task`, `doneWhen` y `hint`. `doneWhen` reemplaza al `done` del arreglo de `app.js`, con el nombre que ya usa `GuideStep`. Es un nombre interno: no se guarda ni se publica.

### R2. La forma de la pista por idioma (Q4, FR-015 y FR-018)

- **Decisión:**
  - **El tipo:** `type MilestoneHint = string | Readonly<Record<GuideLanguage, string>>`, que lee `milestoneHint(milestone, language)`.
  - **Cuándo entra:** en el commit del port. Desde ahí el primer hito ya tiene una pista por idioma, con el texto de hoy en las dos.
  - **Qué cambia el commit de la pista (Q4):** sólo la cadena `go` y las tres pruebas que la fijan.
  - **El resto:** los otros cuatro hitos siguen con una cadena común. Las dos ramas del tipo se ejercitan desde el port.
- **Alternativas:**
  - **Introducir la forma en el commit de la pista:** ese commit mezclaría un cambio de tipo, de modelo y de texto.
  - **Un `hintByLanguage` opcional:** suma una segunda fuente de la misma pista.
  - **Un registro por idioma en los cinco hitos:** repite cuatro textos sin motivo.
- **Costo:** durante un commit, el texto de hoy aparece dos veces en el catálogo.

### R3. La operación de alternar (FR-009 y FR-036)

- **Decisión:** se suma un método al almacén: `routeStore.toggleMark(collection: RouteMarkCollection, id: string): boolean`, con `type RouteMarkCollection = 'completed' | 'milestones' | 'favorites'`.
  - **Qué hace:** alterna el ID con el mismo algoritmo que `toggleItem` de `app.js` (`indexOf`, `push` al final o `splice`), escribe una vez, sube la revisión una vez y devuelve si guardó.
  - **El nombre:** sigue el vocabulario de D1, donde `route.mark.step`, `route.mark.milestone` y `route.mark.favorite` son marcas de ruta.
  - **Quién lo reusa:** F3, para los favoritos, y F9, para los pasos.
- **Alternativas:**
  - **Una función pura y después `routeStore.save()` desde la página:** deja dos pasos donde FR-009 pide «una sola operación», y una página podría mutar sin guardar (la rotura 5).
  - **Un método por colección:** son tres métodos con el mismo cuerpo.
  - **Reusar `toggleItem` de `app.js`:** es una función interna del cierre de `startApp()`.
- **El nombre puede cambiar:** si F3 o F9 entran antes con otro nombre para la misma operación, F4 usa el suyo (plan, «Lo compartido con F3 y F9»).

### R4. El pie `#save-label` (FR-011 y FR-036)

- **Decisión:** el shell se suscribe a la revisión del recorrido en `startApp()`, justo después de `routeStore.open(data)`, con `routeStore.changes.subscribe(updateSaveLabel)`.
  - **Coincide con F3:** su spec lo fija igual (FR-014 de la 012).
  - **`save()` de `app.js` no cambia:** sigue llamando a `updateSaveLabel()`, que es idempotente.
  - **Cuándo dispara:** la revisión sube en cada `save`, `applyImport`, `reset` y `toggleMark`, aunque la escritura falle (`route-store.spec.ts`, «rises by one per save, even when the storage cannot write»).
  - **Qué prueba lo ve:** el pie sigue el `setItem` que falla a mitad de sesión del E2E 12b.
- **Alternativas:**
  - **Que la página llame a una función del shell:** la página conocería al shell.
  - **Un evento del DOM:** suma un contrato nuevo.
  - **Pasar el pie a React:** es F10.
- **Para F9:** su FR-022 también pide refrescar la barra lateral («N de 12» y el porcentaje) tras una escritura de la página. Ampliar el callback a `syncShell` es decisión de F9; F4 no lo necesita, porque los hitos no entran en la barra lateral.

### R5. Cómo lee la página el almacén (FR-010)

- **Decisión:** la página llama `useStore(routeStore.changes, selectRevision)` como sentencia, con el selector declarado a nivel de módulo, y lee `routeStore.getProgress()` en cada render.
  - **Por qué una sentencia:** una constante sin uso la marca ESLint.
  - **El modelo:** `pages/project/model/project-progress.ts` (`projectProgress(marked, language)`) deriva los cinco hitos del idioma, con el ID, el encabezado numerado, los textos, la pista del idioma y si está marcado, y su cuenta. La interfaz sólo dibuja.
  - **Sin copia:** no hay `useState` con el progreso ni un store propio.
- **Alternativas:**
  - **Una copia en `useState`:** es la segunda fuente que F2 evita.
  - **Un hook compartido `useRouteProgress`:** la spec de F3 lo deja para cuando se repita. Con F4 serían dos páginas con las mismas dos líneas, y el hook sumaría React a la API pública de `entities/guide`, que importan `app.js` y los checks. Queda como hallazgo para F9 o F10.
  - **Pasar el almacén por props:** el adaptador no puede importar valores de `entities/guide` (R4 del guard).

### R6. El adaptador (FR-024 y riesgo 12)

- **Decisión:** `frontend/src/app/legacy/register-project-page.tsx` publica `window.TallerProjectPage` con `mount(host, language)` y `unmount()`.
  - **Como el del Atlas:** una raíz por montaje, `root.render` asíncrono, el idioma saneado a `'rust' | 'go'` y `onUncaughtError` con un mensaje en español.
  - **Estado:** el único de módulo es la referencia a la raíz.
  - **Imports:** importa sólo el índice de `pages/project`.
- **Alternativas:**
  - **`TallerProject` y `register-project.tsx`:** se confunden con `TallerProjectKit` y `register-project-kit.ts`, como advierte FR-024.
  - **Montar con `flushSync`:** sería distinto del Atlas, y nada de `app.js` lee el DOM de Proyecto después de `render()`.

### R7. `render()` de `app.js` y la complejidad (FR-005)

- **Medición, por lectura con la variante `classic` de ESLint, que cuenta `if` y `?.` (`docs/architecture.md`). T001 mide el valor real, y la compuerta exige el de T001 más 1:**
  - **Hoy:** `render()` vale 11 (1 + 5 `if` + 5 `?.`) y es uno de los 35 avisos.
  - **Con el port:** `window.TallerProjectPage.unmount()` sin `?.` (+0) y un `if (currentView === 'proyecto')` (+1) la dejan en **12**. La cuenta de avisos no sube.
  - **El delegado de `change`:** pierde la rama `data-milestone`, que suma un `if` y un `?.`, y baja 2.
- **Por qué sin `?.`:** `load-order-check` exige que el adaptador se evalúe antes que `app.js`, y su motivo nombra los dos métodos. `app-shell-check` arma sus falsos desde `qa/lib/app-adapters.ts` (el único escenario que borra globals borra los motores, no las vistas). `boot-check` usa los adaptadores reales.
- **Justificación para la revisión:** es un `if` de montaje igual a los de las otras vistas. F10 retira `render()` con el router, y reescribirla ahora tocaría las vistas de F3, F5 a F9.
- **Alternativas:**
  - **Con `?.`:** daría 13.
  - **Una tabla de montaje:** reescribe las líneas de las otras vistas.
  - **Extraer `unmountViews()`:** mueve código ajeno.
- **Hallazgo:** F3 y F9 suman cada uno un `if`.

### R8. El CSS (Q2, X3 y FR-034)

- **Decisión:**
  - **Las reglas que se mudan:**
    - las 14 reglas base (`styles.css`, líneas 887 a 959 en `2b37caf4`);
    - las 5 del primer bloque `@media (max-width: 590px)` (líneas 1600 a 1616);
    - `.milestone` de la regla de impresión `.resource-card, .module, .milestone`.
  - **Dónde:** pasan, en su orden, a `frontend/src/pages/project/ui/project.css`. Esa hoja se importa en `main.tsx` inmediatamente después de `styles.css` y de las hojas de página que ya estén ahí, antes de `lab.css`.
  - **Qué se parte:** el bloque de 590 px pierde sus 5 reglas, y la regla de impresión pierde `.milestone`; si queda sin selectores, se borra.
  - **Un commit propio,** después del de los E2E y antes de las specs rojas.
- **Por qué esa posición:**
  - **Qué orden relativo cambia:** sólo el de las reglas de Proyecto respecto de las que siguen en `styles.css`. Las demás hojas ya iban después.
  - **Ninguna de esas reglas pisa a una de Proyecto:** se leyeron todas las que podrían aplicarse a los elementos de la página (`.small-label`, `.step-check`, `.page-heading`, `.eyebrow`, `.recommendation-strip`, `pre`, `details`, `summary` y el `touch-action` de controles), y ninguna tiene igual o más especificidad sobre la misma propiedad.
  - **Las clases no salen de la página:** ninguna otra vista usa `terminal`, `milestone` ni `project-hero` (`grep` en `lab.js`, `campaign.js`, `systems.js`, los exploradores y `frontend/src`).
- **Por qué un commit propio:**
  - **Se prueba solo:** el DOM sigue siendo el del legacy, así que la comparación de quickstart §3 sólo puede encontrar diferencias de cascada.
  - **No toca la regla del commit rojo:** el de las specs sigue siendo el único rojo.
- **Alternativas:**
  - **Importar la hoja desde la página:** con las vistas en la cadena de `import()` de A2, el lugar de la hoja en el `<style>` dependería del orden del grafo dinámico.
  - **Importarla después de `atlas.css`, como el Atlas:** cruza también `lab.css` y `atlas.css` sin necesidad.
  - **Mudarla dentro del commit del port:** mezcla las diferencias de cascada con las de DOM.

### R9. Las specs de componente con el singleton (riesgo 8 y FR-028)

- **Decisión:**
  - **Un almacén por archivo:** la spec de la página abre el `routeStore` real una vez por archivo (`beforeAll`), sobre un `StorageLike` en memoria con un interruptor `failWrites`. Vitest aísla cada archivo por omisión (`isolate: true`), así que el singleton es nuevo en cada uno.
  - **Entre pruebas:** `routeStore.reset()` y el almacenamiento vaciado.
  - **Cómo se siembra:** con `routeStore.applyImport({ state, lossy: false })`, y el registro de escrituras se vacía después.
  - **El contenido:** un `GuideData` literal mínimo en la spec, no `guide-fixture.ts`, que es interno de `entities/guide`.
  - **La suscripción:** «al desmontar no queda una suscripción» se prueba envolviendo `routeStore.changes.subscribe` con `vi.spyOn`. `useStore` llama a `api.subscribe` en cada render, por `useSyncExternalStore` (se leyó `zustand/esm/react.mjs` 5.0.15).
- **Alternativas:**
  - **`vi.resetModules()` con imports dinámicos por prueba:** arriesga dos copias de React entre el import de Testing Library y el de la página.
  - **`createRouteStore()` en la spec:** no prueba la página real, que importa el singleton.
- **Limitación:** `reset()` no restablece `storageAvailable()`. La spec de la página no la mira; la mira la del almacén, que abre una instancia por prueba.

### R10. La pila de DOM y fishery (FR-028, FR-033 y FR-036)

- **Decisión, si F4 es la primera en necesitarla (si F3 la instaló, no se toca):**
  - **La configuración:** `frontend/vitest.config.ts` pasa a dos proyectos en línea, `node` (`**/*.spec.ts`) y `jsdom` (`**/*.spec.tsx`). Cada uno lleva su `name`, su `environment` y su `include`, y la raíz sólo lleva `projects`: en Vitest 5 los proyectos en línea heredan la raíz y concatenan los arreglos.
  - **El setup:** `frontend/src/vitest-setup-dom.ts` importa `@testing-library/jest-dom/vitest` y llama a `cleanup()` después de cada prueba.
  - **Las versiones exactas,** en `devDependencies`: `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7 y `@testing-library/jest-dom` 7.0.1, las del ADR 0008 y la spec de F3.
- **El registro hoy:** muestra `jsdom` 30.1.3 (2026-10-15) y `user-event` 14.6.8 (2026-10-13). Se mantienen las fijadas para coincidir con F3, y el informe lo deja como hallazgo.
- **Sin archivos `jsdom` todavía:** el commit de la pila puede dejar ese proyecto vacío. Vitest 5.0.3 sólo falla con «No test files found» cuando no hay ningún archivo en ningún proyecto (`FilesNotFoundError`, leído en su `dist`).
- **fishery no entra:** las entradas son `RouteProgressV1` literales, hechos con `blankRouteProgress()` y el campo que cambia, así que no hay fábrica que gane su lugar y no se pide permiso.

### R11. Los checks de `qa/` (FR-019, FR-025 y FR-029)

| Check | Qué cambia | Qué no cambia |
| --- | --- | --- |
| `route-milestones-check` | En lugar de leer el texto de `app.js`, importa con `importModule` `project-milestones.ts` y `milestone-ids.ts`, los módulos y no el índice, para no evaluar el singleton. Compara con el fixture compartido las claves que arma con el catálogo y `MILESTONE_IDS` | El fixture compartido (sha256 `f955c92b…`) y el mensaje de éxito |
| `app-shell-check` | Retira los dos «g) hitos» y sus ayudantes (`milestoneSuffixes` y `renderedMilestones`). La correspondencia está en el plan (§5.4) | Los otros 56 escenarios, también los dos que usan `#proyecto` como vista inicial: filtran sus llamadas y no ven `ProjectPage.*` |
| `qa/lib/app-adapters.ts` y `app-shell-harness.ts` | `TallerProjectPage: ['mount', 'unmount']` y su entrada de comportamientos vacía | El resto de la lista |
| `boot-check` | `proyecto` pasa a la rama de los nodos montados, como el Atlas. El encabezado esperado se busca en el texto del árbol montado, con un ayudante `mountedText`, porque el `textContent` del DOM falso no baja a los hijos | `VIEW_HEADINGS.proyecto` sigue siendo «UNA IDEA QUE CRECE CON VOS» |
| `load-order-check` | El adaptador antes de `app.js`, con su motivo | Las demás restricciones |
| `legacy-views.ts` | Una línea `() => import('../legacy/register-project-page'),` después de la del Atlas | El resto de la cadena |

### R12. Los E2E (FR-027)

- **Las pruebas:** 18 en `qa/e2e/specs/project.spec.ts`. Son los 15 escenarios de FR-027 (el 12 tiene dos pruebas) y dos más de «Review Focus»: el regreso a `#proyecto` con Atrás y un ID guardado desconocido.
- **Qué pasa contra el legacy:**
  - **17 en verde,** también la 15, como `KNOWN DEFECT`;
  - **la 8 queda afuera:** es la de las pistas abiertas, y entra después, en el commit rojo.
- **El Page Object:** `qa/e2e/pages/project.ts` (`ProjectPage`), con fixture `project`. Ubica todo por rol y nombre, salvo la terminal (`pre.terminal`, sin nombre accesible) y el contenido de la pista (`details`), siempre dentro de la tarjeta del hito.
- **El modo «lee y no escribe»:** `StorageControl.blockWrites()`, con el nombre del `writesBlocked` del arnés de `app-shell-check`. Hace que `localStorage.setItem` lance un `QuotaExceededError` sin tocar `sessionStorage`.
  - **El orden importa:** se registra después de `seed()`, porque los init scripts corren en orden.
  - **Coincidencia con F3:** su spec pide el mismo modo, y el nombre se unifica en el informe.
- **El fixture compartido:** el E2E de los diez IDs lo lee como contrato desde `qa/e2e/lib/curriculum.ts` (`routeMilestoneIds`), nunca desde el catálogo.

### R13. El orden de los commits (FR-001)

Los cinco de FR-001, en su orden, más dos commits en verde que la spec no nombra. Son:

1. `test(e2e)`: los E2E contra el legacy (FR-001, 1);
2. `refactor(front)`: el CSS a `project.css` (R8);
3. `chore(front)`: la pila de DOM, **sólo si nadie la instaló antes** (R10);
4. `test(front)`: las specs nuevas y el E2E 8, el **único commit en rojo** (FR-001, 2);
5. `refactor(front)`: el port y el retiro del legacy, otra vez en verde (FR-001, 3);
6. `feat(front)`: la pista de Go, con TDD en un solo commit (FR-001, 4). El rojo se observa en local y queda en la descripción del PR;
7. `docs`: la documentación (FR-001, 5).

El PR abre con los E2E, como pide la hoja de ruta. Los dos commits que se suman son refinamientos de FR-001 y no cambian su orden.

### R14. El texto de la pista de Go (Q4: decisión del usuario)

- **Hoy, en los dos idiomas:** «Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.»
- **Texto aprobado para Go (el usuario, el 2026-10-28, al aprobar el plan #66, que traía este texto):** se conservan las dos primeras oraciones y se reemplaza sólo la de Rust:

  > Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Go podés empezar con un map[string]string creado con make; leé con valor, ok := datos[clave] para distinguir una clave que no existe de un valor vacío.

- **Por qué:**
  - **El paralelo con Rust:** la oración de Rust enseña el tipo con dueño y el costo de copiar. En Go, lo análogo para este hito es crear el mapa con `make` (escribir en un mapa `nil` entra en pánico) y la lectura con dos valores.
  - **Atado al hito:** el criterio del hito pide «un test comprueba qué ocurre si la clave no existe», y en Go una clave ausente devuelve la cadena vacía si no se usa `ok`.
  - **El estilo:** voseo, sin nombrar a Rust y con el mismo formato que la de Rust (un tipo entre las palabras).
- **Rust:** conserva su texto (Clarifications, lectura de Q4).

### R15. El tope de tamaño (FR-033)

- **El tope de F4:** `html.length` ≤ la medida de la base (T001) + 10 000 caracteres, y bajo `BOOT_SIZE_LIMIT` (1 250 000).
- **Las referencias:** la base de planificación es la de F2b acumulada, 1 141 337 caracteres (medida del coordinador). Quedan unos 108 600 hasta el tope global.
- **La estimación de F4:** de +1 500 a +3 500.
  - **Lo que sale de `app.js`:** unos 5 800 caracteres (el arreglo, `renderProject` y la rama).
  - **Lo que entra:**
    - los mismos textos en el catálogo, más la pista repetida, unos 3 500;
    - la página y su modelo, unos 2 500;
    - el adaptador, unos 400;
    - `toggleMark`, unos 150;
    - el binding de React de Zustand, de 739 bytes sin minificar.

### R16. El encargo, la spec y los E2E 8 y 15

- **Lo que dice el encargo:** «los de X1 y Q4 van en el commit en rojo».
- **Lo que dice la spec:** FR-001 (1), FR-027 (15) y SC-002 ponen el E2E 15 en el primer commit, en verde contra el legacy como `KNOWN DEFECT`, invertido una sola vez en el commit de la pista.
- **Por qué no puede seguirse el encargo literal:** un E2E con el texto nuevo en el commit rojo seguiría rojo después del port, y FR-001 (3) exige que ese commit deje la suite en verde.
- **Lo que hace el plan:** sigue la spec. El commit rojo lleva el E2E 8; el E2E 15 nace en verde y se invierte en el commit de la pista. Queda dicho en el informe.

## Context7

- **El primer servidor** (`mcp__context7__*`) agotó su cuota mensual en la primera consulta.
- **El segundo** (`mcp__44441c24…`) respondió todas las demás.
- **Cuando no tuvo el dato,** se dice en la fila y se resolvió leyendo el paquete ya instalado en otro worktree, sin descargar nada.

| Librería | Versión del lockfile o propuesta | ID y versión consultados | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| Zustand | 5.0.15 (lockfile) | `/pmndrs/zustand/v5.0.12` (la más cercana) y `zustand/esm/react.mjs` 5.0.15 leído en `a2-c/node_modules` | `useStore(api, selector)` con un store de `zustand/vanilla` | `useStore` llama a `React.useSyncExternalStore(api.subscribe, …)`: se suscribe al montar y se desuscribe al desmontar; el selector va a nivel de módulo; el binding pesa 739 bytes sin minificar | Sí: la prueba de la suscripción espía `routeStore.changes.subscribe` (R9) |
| Vitest | 5.0.3 (lockfile) | `/vitest-dev/vitest/v5.0.3` | `test.projects` en línea | Heredan la raíz por omisión (`extends: true`), concatenan los arreglos (`setupFiles` y los demás) y nunca heredan `name` ni `projects` | Sí: la raíz sólo lleva `projects` (R10) |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | Aislamiento por archivo | `isolate` es `true` por omisión: cada archivo tiene su grafo de módulos | Sí: el singleton se abre una vez por archivo (R9) |
| Vitest | 5.0.3 | Context7 no lo dice; `vitest/dist/chunks/index.DpLw24bj.js` leído en `a2-c` | ¿Un proyecto sin archivos hace fallar `vitest run`? | `FilesNotFoundError` sólo si no hay ningún archivo en ningún proyecto | Sí: el commit de la pila puede dejar `jsdom` vacío (R13) |
| React Testing Library | `@testing-library/react` 16.3.3 | `/testing-library/testing-library-docs` | Vitest sin `globals` | `cleanup()` en un `afterEach` del setup, e `import '@testing-library/jest-dom/vitest'` para los matchers | No: confirma el setup del ADR 0008 |
| Testing Library user-event | 14.6.7 | `/testing-library/user-event` | `userEvent.setup()` y `click` sobre una casilla | `setup()` crea la sesión y `click` alterna la casilla y la enfoca | No |
| jsdom | 30.1.2 | `/jsdom/jsdom/v29.0.1` (no hay una de la 30) | `<details>` y `<summary>`: la activación del resumen y el reflejo de la propiedad `open` | Sin documentación que coincida | Sí: nada depende de eso. La spec de componente abre la pista con `setAttribute('open', '')` y comprueba el atributo; Enter sobre el resumen se prueba en el E2E 7, en Chromium |
| React | 19.2.8 (lockfile) | `/websites/react_dev_reference` | Casilla controlada; `createRoot` y `root.unmount` desde una página que no es de React | La casilla controlada necesita actualizar su fuente de verdad de forma síncrona en `onChange` (`toggleMark` lo hace y `useSyncExternalStore` vuelve a dibujar); `root.unmount` libera suscripciones y manejadores, y una raíz desmontada no se reusa | No: confirma el adaptador del Atlas |
| Playwright | 1.63.0 (lockfile) | `/microsoft/playwright/v1.63.0` | `emulateMedia({ media: 'print' })`, `locator.filter({ has })` y `toHaveJSProperty` | Las tres existen con esa firma; `filter({ has })` admite un localizador de la página como interno | Sí: la comparación usa `emulateMedia` para la impresión, y el Page Object ubica cada tarjeta con `filter({ has })` |
| Vite | 8.3.2 (lockfile) | `/vitejs/vite/v8.0.10` (la más cercana) | Orden del CSS importado | Con `cssCodeSplit`, el CSS de un chunk asíncrono va aparte; con `vite-plugin-singlefile` todo se inlinea, y el orden de los imports estáticos de la entrada es el del `<style>` (así quedó `atlas.css`, medido por F2b) | Sí: `project.css` se importa en `main.tsx`, no en la página (R8) |
| fishery | 2.4.0 (propuesta del ADR) | No se consultó | — | No se usa (R10) | — |
| nuqs, React Hook Form | — | No aplica | — | F4 no los usa | — |
| Laravel, Pest, PHPStan, Docker, gVisor | — | No aplica | — | F4 no toca el backend; la imagen web se construye en la compuerta, con permiso | — |

## Mediciones de sólo lectura

Todas sobre `f2b-acum` (`2b37caf4`), salvo las del registro de npm.

- **`app.js`:**
  - el arreglo `milestones` ocupa las líneas 27 a 63;
  - `renderProject`, la 277 a la 282;
  - la rama `data-milestone` del delegado de `change`, la 516 a la 521;
  - `render()`, la 156 a la 181, con complejidad 11 contada a mano (R7).
- **`toggleItem`:** la usan la lección (`completed`), los favoritos y los pasos además de los hitos. Sigue en `app.js` mientras F3 o F9 no hayan entrado.
- **`styles.css`:**
  - 1 812 líneas;
  - las reglas de Proyecto, de la 887 a la 959;
  - el primer bloque de 590 px abre en la 1413, y las reglas de Proyecto dentro de él van de la 1600 a la 1616;
  - la regla de impresión compartida, de la 1711 a la 1715.
  - Ningún otro bloque `@media` nombra reglas de Proyecto.
- **El fixture compartido** `qa/fixtures/shared/route-milestones.json`: sha256 `f955c92bc3138f895ea27233bb9e1030c0266b7e2a08783f18d1c1feda8d1054`.
- **`app-shell-check`:** 58 escenarios, dos de ellos «g) hitos». Las aserciones sobre las llamadas a los adaptadores filtran por nombre.
- **El registro de npm:**

  | Paquete | Última versión | Licencia | Desempaquetado (de la última) |
  | --- | --- | --- | --- |
  | `jsdom` | 30.1.3 | MIT | 5 540 685 |
  | `@testing-library/react` | 16.3.3 | MIT | 339 581 |
  | `@testing-library/dom` | 10.4.2 | MIT | 2 467 302 |
  | `@testing-library/user-event` | 14.6.8 | MIT | 438 027 |
  | `@testing-library/jest-dom` | 7.0.1 | MIT | 331 873 |
  | `fishery` | 2.4.0 | MIT | 135 590 |

  - `jsdom` 30.1.3 pide `node ^22.22.2 || ^24.15.0 || >=26.0.0`.
  - El peer de `@testing-library/react` 16.3.3 admite React 19.
- **La línea base de planificación,** de los informes del coordinador sobre F2b acumulada:
  - 39 checks;
  - 719 pruebas de Vitest;
  - 123 E2E;
  - 35 avisos de complejidad;
  - 1 141 337 caracteres de `html.length`;
  - `import(` 0 e `import.meta` 22.
- **No se midió:**
  - el build, los checks ni los E2E de la base;
  - el tamaño real del port;
  - la comparación única.

  T001 toma la línea base real y T007 corre la comparación.

## Línea base de la implementación

Medida por T001 sobre `24ba9d3d` (`master` con F2a, A2 y F2b):

- **Suite:** 39 checks, 719 pruebas de Vitest en 29 archivos (todos del proyecto `node`; el `dom` existía y no tenía archivos), 123 E2E y 35 avisos de `complexity`.
- **Oráculos:** `build/curriculum.json` y `dist/content/curriculum.4555e8500e6ef5bd38cdaf46010d3f14.json` con sha256 `4555e850…fbb6`; `dump-globals` `859771e2…6fa1`; `frontend/src/index.html` `6c3b7e6a…2179`; `route-milestones.json` `f955c92b…1054`; `dist-content-check` en verde.
- **Dist:** `chars` 1 141 337 (tope de F4: 1 151 337), `dynamicImports` 0, `importMeta` 22; `script` `a0d182f0…9be94`, `style` `ae2971b0…7b79` y `markup` `562c5364…81d0`.
- **CSS:** 4319 reglas (4315 distintas) en el multiconjunto.
- **Complejidad:** `render()` de `app.js` vale 11.
- **Checks:** `app-shell-check` 58 escenarios, `boot-check` 25 y `load-order-check` con 24 imports y 16 restricciones de orden.
- **Lo compartido con F3 y F9:** nada estaba en `master` salvo `jsdom` 30.1.2 con los dos proyectos de Vitest; T004 no corrió.

Medida sobre el port: `chars` 1 144 143 en `f5f4602b` (+2 806) y 1 144 218 en `bd895dd1` y en HEAD, con la pista de Go (+2 881); los dos bajo el tope de 1 151 337. `importMeta` 23 (Vite suma un `import.meta.url` por cada `import()` de `legacy-views.ts`), `script` y `style` cambiados, `markup` igual, 35 avisos, `render()` en 12, 746 pruebas de Vitest, 141 E2E.
