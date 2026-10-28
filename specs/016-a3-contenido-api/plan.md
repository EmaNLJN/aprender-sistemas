# Implementation Plan: A3 · El front lee el contenido de la API

**Branch**: `016-a3-contenido-api` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de A3 con su clarify (Q1 a Q4, R1, F11-Q1 y el ruling C1): FR-001 a FR-043, SC-001 a SC-010 y las historias 1 a 6. Decisiones y mediciones: [research.md](./research.md). La copia: [data-model.md](./data-model.md). Interfaces: [contracts/front-interfaces.md](./contracts/front-interfaces.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md).

**Objetivo:** que el arranque lea las 17 porciones de la API, detrás de la sesión, con el protocolo del ADR 0006 §7. El navegador guarda la última copia y, sin servidor, la usa con un aviso quien no cerró su sesión, y el archivo estático sale del build y de la imagen web.

**Arquitectura:**

- **Las cuatro etapas de F11a no cambian:** `runBoot([tokenStage, sessionStage, contentGate, legacyViews])`.
- **La etapa de sesión ya no muestra errores.** Pide la sesión y el ingreso, y deja lo que leyó (`takeRead()`).
- **La compuerta de A2, con una fuente nueva,** hace el resto del intento: las rondas de las 17 porciones con `If-None-Match`, la sesión en cada ronda, el 401, la copia en IndexedDB y la vista de error con «Reintentar».
- **Un presupuesto compartido** cuenta los 20 s de todo el intento y se detiene durante el ingreso.

**Stack:** TypeScript y React 19.2.8 con Vite 8.3.2 y Zustand 5.0.15. Las pruebas: Vitest 5.0.3, los checks de `qa/` en Node 24.21.0 y Playwright 1.63.0. No hay dependencias nuevas (FR-034).

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Restricciones globales», las «Reglas para todos los agentes», el contrato y la sección de tu tarea. `tasks.md` tiene una línea por tarea (T001 a T016) y remite acá.
> - **La base.** A3 se implementa después de que F11a llegue a `master`. Las unidades U1 a U3 son PR contra la rama de integración `a3/base`, que sale de ese `master`, y A3 llega a `master` en un solo PR (research.md, R16).
> - **El código ya corrió.** El código de producción y las specs de Vitest de este plan se probaron en una copia descartable: 115 pruebas en verde, y `tsc`, ESLint y Prettier limpios, con lo de F11a reemplazado por sus firmas (research.md, «Cómo se verificó»). Los checks de `qa/`, el build, los E2E y Docker no corrieron.

## Summary

A3 cambia la fuente del contenido y le suma la copia. El enfoque:

- **Tres unidades apiladas y un solo merge a `master`** (R16).
  - **U1, los módulos nuevos sin cablear:** la fuente de la API, la copia y su almacén, el presupuesto, el lector de la sesión y el aviso, con sus specs.
  - **U2, el corte (FR-031).** Un solo PR cablea la fuente nueva y retira el archivo estático. También adapta los checks, los E2E de A2 y los de F11a, suma los E2E de A3 y cambia la documentación.
  - **U3, contra el stack:** la imagen web, la vista previa, los 40 arranques de un aula y el PR a `master`.
- **La etapa de sesión lee y la compuerta decide** (R1). Toda falla del intento, también la de la sesión, termina en la vista de error de A2 o en la copia. Es la decisión D1 del informe.
- **Un fetch propio para las porciones** (R3): el cliente de F11a no expone los encabezados de la respuesta y trata el 304 como una falla. El cliente sigue para la sesión y el ingreso.
- **La copia en IndexedDB:** el adaptador nunca cuelga ni rechaza, y se cumple el invariante «la copia es lo último que este navegador publicó, o nada» (R4 a R7).
- **Ninguna dependencia nueva** (R12). IndexedDB se prueba con un doble chico en Vitest y con la base real en Chromium. `fake-indexeddb` queda como decisión del usuario (D2).

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; Node 24.21.0.

**Primary Dependencies**: las de `master` con F11a. Ninguna nueva: `package.json` y `package-lock.json` no cambian (FR-034).

**Storage**:

- **La copia:** IndexedDB del navegador, en la base `taller-contenido` v1, el almacén `copia` y la clave `ultima` (data-model.md).
- **Web Storage:** nada nuevo. El progreso no se lee ni se escribe antes de publicar (FR-020).

**Testing**:

- **Vitest, proyecto `node`.** Las specs nuevas no necesitan DOM: el aviso y la vista de la sesión se prueban con `document` simulado con `vi.stubGlobal`.
- **Los checks de `qa/`**, con un servidor simulado que sirve la sesión y los 17 recursos con los bytes del generador.
- **Playwright,** con el doble de la API de F11a extendido.

Los valores esperados salen del contrato de C2 (la tabla de recursos, el `ETag` y `Content-Version`), del generador (`build/curriculum.json` y su meta) y de la spec, nunca del código que se prueba.

**Target Platform**: navegador moderno con IndexedDB, Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web (front React/TypeScript con vistas legacy), sin cambios en el backend.

**Performance Goals**: con la copia al día, una recarga hace un solo pedido (SC-002). El tiempo hasta la primera vista se informa sin umbral (SC-010).

**Scale/Scope**:

- **Producción:** 9 archivos nuevos en `frontend/src/` y unos 13 que cambian.
- **Pruebas:**
  - 12 specs de Vitest, entre nuevas y adaptadas;
  - 3 ayudas de specs;
  - 7 archivos de `qa/` que cambian y uno nuevo;
  - 1 E2E nuevo y 2 adaptados.

## Restricciones globales

Valen para toda tarea. Los valores están copiados de la spec, del contrato de F11a y de la constitución.

- **La red de pruebas:**
  - **los 106 E2E de F1 no se editan** (FR-038). Sólo cambia el doble de la API (`qa/e2e/fixtures/api-double.ts`) y la ayuda `qa/e2e/lib/content-requests.ts`;
  - **los 17 E2E de A2** (`qa/e2e/specs/content-gate.spec.ts`) se adaptan en un commit propio, con la tabla de «Compatibilidad» (FR-039);
  - **los E2E de F11a** se adaptan en otro commit propio: dos de `session-stage.spec.ts`, por D1, y la cuenta de pedidos de uno de `sign-in.spec.ts`, porque el contenido pasa de un archivo a 17 recursos;
  - **`load-order-check` y `main.tsx`** no cambian (la tabla de etapas tampoco).
- **Los topes:**
  - 20 000 ms por intento, con la sesión, las porciones, las esperas de `Retry-After` y las rondas, sin el tiempo de «pedir el ingreso» (FR-010);
  - el estado de carga, a los 400 ms;
  - 3 rondas por intento (FR-008);
  - 3 000 ms por operación del almacén de la copia (R4).
- **Los pedidos:** como mucho 18 por ronda, la sesión y las 17 porciones, sin contar los que repite un `Retry-After` (FR-014). Los de contenido van con `credentials: 'same-origin'` y nunca llevan `X-XSRF-TOKEN` ni `X-Taller-User`.
- **El progreso:** antes de publicar no se lee ni se escribe ninguna clave de Web Storage (FR-020). Las fixtures congeladas arrancan sin escribir, respaldar ni avisar (FR-041).
- **Los oráculos:** `node tools/content/dump-globals.ts .` da los mismos bytes antes y después de A3 (FR-035).
- **Los textos:** los de la spec, tal cual:
  - **el aviso (FR-025):** «No se pudo traer el contenido del servidor del taller. Estás usando la copia que guardó este navegador, que estaba al día el {fecha}. Tu progreso sigue guardado en este navegador. Recargá la página más tarde para traer el contenido al día.»;
  - **`version` (FR-028):** «El contenido del taller se está actualizando. Tu progreso sigue guardado en este navegador. Probá de nuevo en unos segundos.»;
  - **`access` (FR-028):** «Tu cuenta no puede ver el contenido del taller. Si creés que es un error, consultá con quien administra el taller.»;
  - **el resto:** el título, el texto general, «Reintentar» y «Cargando el contenido del taller…» siguen como en A2.
- **El estilo:** ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText`. Las reglas nuevas van al final de `frontend/styles.css`.
- **El peso:** `dist/index.html` bajo 1 250 000 caracteres (`qa/build-check.ts`). A3 estima unos +6 700 sobre la línea base de T001, y la condición de corte está en T014.
- **La complejidad:** ninguna función nueva de más de 10. Los avisos de `npm run lint` no suben respecto de T001.
- **La accesibilidad:**
  - el aviso es una región `status` que no toma el foco ni se anima;
  - el aviso está en el flujo, fuera de `#main`;
  - el aviso no desborda a 390 px (FR-026);
  - «Reintentar» conserva el foco y `Enter` (FR-027).
- **El backend:** no cambia. Los contratos de C2 y C3a se consumen tal cual.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md). Resultado antes y después del diseño: pasa. Complexity Tracking registra dos decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules, `interface` para las formas, exports nombrados, capas FSD: la fuente y la copia en `shared/api/content`, las etapas en `app/boot`. Sin Zustand nuevo, sin nuqs ni dependencias. `AGENTS.md` cambia en lo que describe (T013) |
| II. TDD y pruebas útiles | Sí | Cada tarea de código abre con su spec en rojo. Los valores esperados salen de C2, del generador y de la spec. Los dobles (`fake-content-api`, `fake-copy-store` y `fake-indexed-db`) simulan el protocolo, no la implementación |
| III. Código entendible | Sí | La fuente se parte por paso: el pedido, la respuesta, la ronda y el cierre de la ronda. El almacén nunca rechaza, y el presupuesto es un objeto con cuatro operaciones |
| IV. Contenido en Git, IDs estables | Sí | `content/`, el progreso, los IDs y las URL no cambian, y `dump-globals` da los mismos bytes |
| V. Capas y contratos explícitos | Sí | `shared` no importa de capas superiores: la sesión y el ingreso llegan a la fuente como funciones. El contrato está en `contracts/` |
| VI. Español, accesibilidad y portabilidad | Sí | Los textos de la spec; el aviso como `status` en el flujo, sin animación, probado en 390 px |
| VII. Secretos y salidas generadas fuera de Git | Sí | `dist/content/` deja de existir. No hay salidas nuevas ni dependencias |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit |

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Q1:** A3 espera sólo a F11a | `a3/base` sale de `master` con F11a, y T001 contrasta su contrato | T001 |
| **Q2:** sin servidor, la copia sólo para quien no cerró la sesión | `user: null` y «Salir» borran la copia; el token en la URL la prohíbe | T004, T005, T009, T010 y T012 |
| **Q3:** la vista previa pasa `/api/` (es de F11a) | A3 no toca `compose.preview.yaml` ni el proxy, y T016 verifica que el contenido llega por ahí | T016 |
| **Q4:** la copia en IndexedDB | `createIndexedDbCopyStore` y `contentCopies` | T006 y T007 |
| **R1:** «pedir el ingreso» se espera y no se vuelve atrás | El lector de la sesión y el 401 de la fuente lo esperan dentro de `budget.pausedWhile` | T004 a T007 |
| **C1:** la etapa de sesión es de F11a y A3 la extiende | `session-gate.ts` y `account-stages.ts` cambian; `main.tsx` y `load-order-check` no | T009 y T010 |
| **El tope de 3 rondas** (propuesta de la spec) | `MAX_ROUNDS = 3`. Sin el stack no se midió un import, y T015 anota las rondas contra el stack | T006, T007 y T015 |
| **La plantilla del harness** (propuesta de la spec) | No se pide al arrancar, y la copia admite una porción de más | T002 y T003 |

## Project Structure

### Documentation (this feature)

```text
specs/016-a3-contenido-api/
├── spec.md                         # la spec, con su clarify
├── research.md                     # decisiones, consultas de documentación y mediciones
├── data-model.md                   # la copia en IndexedDB, la lectura y el presupuesto
├── plan.md                         # este archivo
├── quickstart.md                   # cómo se verifica la entrega
├── contracts/front-interfaces.md   # las interfaces que deja A3 y las que cambia
├── checklists/requirements.md      # de la spec
└── tasks.md                        # T001 a T016
```

### Source Code (repository root)

Los archivos nuevos y los que cambian, con su dueño («Reparto en paralelo»):

```text
frontend/src/
├── index.html                                   # cambia (G): #content-copy-notice después de #session-status
├── shared/
│   ├── lib/
│   │   ├── wait.ts (+ .spec.ts)                 # nuevo (S): una espera que se corta al abortar
│   │   └── format-long-date.ts (+ .spec.ts)     # nuevo (B): «7 de octubre de 2026»
│   └── api/content/
│       ├── content-source.ts                    # cambia (S en U1, G en U2): ServedPortion, ContentReading, 'access'
│       ├── portion-resources.ts                 # nuevo (S): la tabla de los 17 recursos de C2
│       ├── content-copy.ts (+ .spec.ts)         # nuevo (S): la forma de la copia, su validación y sus conversiones
│       ├── indexeddb-copy-store.ts (+ .spec.ts) # nuevo (S): el almacén sobre IndexedDB
│       ├── content-copies.ts                    # nuevo (S): el almacén del navegador y forgetContentCopy
│       ├── api-content-source.ts (+ .spec.ts)   # nuevo (S): el protocolo del ADR 0006 §7
│       ├── fake-copy-store.ts                   # nuevo (S): ayuda de specs, un almacén en memoria
│       ├── fake-content-api.ts                  # nuevo (S): ayuda de specs, un fetch con respuestas reales
│       ├── fake-indexed-db.ts                   # nuevo (S): ayuda de specs, un IDBFactory chico
│       ├── index.ts                             # cambia (S en U1, G en U2)
│       └── static-content-source.ts (+ .spec.ts)# se borra (G, en el corte)
├── app/
│   ├── content/content.ts                       # cambia (G): CONTENT_COPY_SAVED_EVENT
│   └── boot/
│       ├── attempt-budget.ts (+ .spec.ts)       # nuevo (B): el presupuesto del intento
│       ├── session-reader.ts (+ .spec.ts)       # nuevo (B): la sesión con el ingreso, el 429 y el borrado de la copia
│       ├── copy-notice.ts (+ .spec.ts)          # nuevo (B): el aviso sin servidor
│       ├── session-gate.ts (+ .spec.ts)         # cambia (G): usa el lector y el presupuesto, y deja takeRead()
│       ├── session-view.ts (+ .spec.ts)         # cambia (G): sólo la espera
│       ├── content-gate.ts (+ .spec.ts)         # cambia (G): la lectura, el presupuesto y onPublished
│       ├── gate-view.ts (+ .spec.ts)            # cambia (G): los textos de version y access
│       ├── account-stages.ts                    # cambia (G): el presupuesto y el lector de la compuerta
│       └── content-stage.ts                     # cambia (G): la fuente de la API, la copia y el aviso
├── features/sign-in/
│   ├── model/sign-out.ts (+ .spec.ts)           # cambia (G): forgetContentCopy
│   └── ui/PrivacyReacceptance.tsx               # cambia (G): pasa forgetContentCopy
└── pages/account/ui/SignOutSection.tsx          # cambia (G): pasa forgetContentCopy
frontend/styles.css                              # cambia (G): .content-copy-notice, al final
frontend/vite.config.ts                          # cambia (G): el plugin sólo emite los avisos de licencia
qa/
├── lib/boot-harness.ts                          # cambia (Q): los temporizadores por vencimiento
├── lib/content-server.ts                        # cambia (Q): la API simulada (sesión y 17 recursos)
├── lib/built-page.ts                            # cambia (Q): sale readBuiltContent
├── lib/sources.ts                               # cambia (Q): sale __CONTENT_VERSION__
├── boot-check.ts                                # cambia (Q): la tabla de compatibilidad y los casos de A3
├── dist-content-check.ts                        # cambia (Q): la sesión y los 17 pedidos, sin los bytes servidos
├── build-check.ts                               # cambia (Q): dist/content no existe y el HTML no lleva la versión
├── classroom-boot-check.ts                      # nuevo (K): 40 arranques contra el stack (fuera de npm test)
└── e2e/
    ├── lib/content-portions.ts                  # nuevo (E): la tabla de C2 y los bytes del generador
    ├── lib/content-requests.ts                  # cambia (E): cuenta porciones y sesiones
    ├── lib/content-copy.ts                      # nuevo (E): la señal, el bloqueo y la lectura de la copia
    ├── fixtures/api-double.ts                   # cambia (E): la query, If-None-Match, abort, contentVersion y las 17
    └── specs/content-gate.spec.ts, session-stage.spec.ts (adaptados) y content-api.spec.ts (nuevo)   # (E)
specs/015-f11-acceso-cuenta/contracts/front-interfaces.md   # cambia (G): las firmas que A3 cambia de F11a
AGENTS.md, README.md, docs/architecture.md, qa/AGENTS.md, docs/refactor-roadmap.md   # cambian (K, T013)
```

**Structure Decision:**

- **La fuente y la copia en `shared/api/content`,** junto a la interfaz de A2 (supuesto de la spec sobre F2b). La sesión y el ingreso no se importan ahí: llegan como funciones (`readSession` y `requestAccess`), porque `shared` no puede importar `entities` ni `features`.
- **El presupuesto, el lector de la sesión y el aviso en `app/boot`,** con las etapas.
- **Ningún slice nuevo.**

## Review Focus

Lo que el revisor mira primero:

- **El corte es atómico (FR-031):** ningún commit de `master` lee las dos fuentes, y la copia sólo guarda contenido de la API. U1 no cablea nada; U2 cablea y retira en el mismo PR.
- **El invariante (FR-016):**
  - la fuente borra la copia antes de entregar contenido del servidor;
  - la escritura va después de publicar;
  - si borrar falla, publica igual.
- **La sesión manda:**
  - con `user: null` no se piden porciones y no se usa la copia: se borra y se espera el ingreso;
  - con un 403 y con un token en la URL nunca se usa la copia sin servidor.
- **Los temporizadores:** el presupuesto, la espera de carga y los `Retry-After` no hacen nada después de resolver, aunque `clearTimeout` no haga nada. El ingreso no corre bajo ningún tope.
- **Los pedidos:** como mucho 18 por ronda, sin CSRF, con el `ETag` guardado tal como llegó.
- **La red sin editar:** el diff de `qa/e2e/specs/` toca sólo `content-gate.spec.ts`, en su commit; `session-stage.spec.ts` y `sign-in.spec.ts`, juntos en otro; y el archivo nuevo.
- **Los oráculos:** `dump-globals` da los mismos bytes, y `dist-content-check` compara los globals y las 17 huellas.
- **El peso,** contra el presupuesto que queda (T014).

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba.** Cada caso, con la prueba que lo fija y la tarea que la suma:

1. **Una sesión de 15 s y porciones de 10 s.** El intento falla a los 20 s, no a los 35. Además, un ingreso de un minuto en medio no cuenta. Lo fijan dos pruebas: `content-gate.spec.ts`, «keeps the budget that the session stage started: with 15 s spent, a hanging read fails 5 s later», y `attempt-budget.spec.ts`, «does not count the time inside pausedWhile» (T004 y T009).
2. **Un IndexedDB que abre y nunca contesta** no traba el arranque. Lo fija `indexeddb-copy-store.spec.ts`, «settles at the limit when the database never answers» (T006).
3. **Borrar la copia falla antes de publicar otra versión.** Se publica igual (FR-019). Lo fija `api-content-source.spec.ts`, «still hands the server reading when the store cannot clear the copy» (T006).
4. **Un 304 para una porción que la copia no tiene** es una falla `status`, no un dato `undefined`. Lo fija `api-content-source.spec.ts`, «fails with status for a 304 of a portion that the copy does not have» (T006).
5. **Un `ETag` débil (`W/"…"`)** se guarda tal cual y vuelve igual en `If-None-Match`. Lo fija `api-content-source.spec.ts`, «keeps a weak ETag as it came and sends it back as it is» (T006).

## Reparto en paralelo

Los dueños tienen archivos disjuntos («Project Structure»). Cada uno trabaja en su worktree sobre `a3/base` y entrega una rama.

- **Delegables al subagente `implementador`:** S, B, G, Q y E (`AGENTS.md`, «Trabajo con subagentes»). Se les dan sus archivos, el contrato, los valores exactos y los checks, y se les dice que no dejen comentarios.
- **K, el coordinador,** es el agente principal. Hace U0, la documentación, `classroom-boot-check`, Docker, las compuertas y la revisión de cada diff.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001 (U0) |
| 1 | S y B a la vez | **S:** T002, T003, T006 y T007. **B:** T004 y T005 |
| 2 | K | T008 (compuerta de U1) |
| 3 | G, Q y E a la vez; K | **G:** T009 y T010. **Q:** T011. **E:** T012. **K:** T013 |
| 4 | K | T014 (compuerta de U2) |
| 5 | K | T015 y T016 (U3) |

**Puntos de sincronización:**

- **S1:** U1 integrada en `a3/base` (T008). G, Q y E parten de ahí.
- **S2:** G entregó T010. Recién ahí los checks de Q y los E2E de E pasan de rojo a verde. Q y E escriben antes, en rojo, contra la fuente estática, y corren en verde sobre la rama de G integrada.

**Puertos de los E2E** (`vite preview` usa `--strictPort`): K `E2E_PORT=4173` y E `4194`.

**La integración:**

- **Las unidades:** son PR contra `a3/base`, que sale de `master` con F11a, y cada una se revierte sola ahí.
- **El merge a `master`:** lo abre K en T016.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y la constitución;
  - la spec (FR-001 a FR-043), research.md, data-model.md, el contrato y tu tarea;
  - el contrato de F11a, `specs/015-f11-acceso-cuenta/contracts/front-interfaces.md` (llega a `master` con el plan de F11a; hasta entonces, en su rama);
  - las skills `tdd`, `clean-code`, `codebase-design` y `vitest` y, si escribís E2E, `playwright-best-practices`.
- **TDD, siempre.**
  - Cada módulo nuevo empieza con su firma lanzando `throw new Error('not implemented')`, para que su spec falle por comportamiento y no por un import.
  - La spec en rojo y su implementación van en commits separados: el commit rojo no pasa `npm test`, y el PR entero sí.
  - Si una prueba de la base falla, el error está en el código nuevo. Sólo cambian los valores esperados que nombra la tabla de «Compatibilidad».
- **Los valores esperados** salen de la tabla de C2 (spec, «Key Entities»), de `build/curriculum.json` y de su meta, o de la spec. Nunca del módulo que se prueba.
- **Los archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Las importaciones:**
  - un slice se importa por su `index.ts`, y dentro de tu slice, por ruta directa;
  - las ayudas de specs (`fake-*.ts`) se importan por ruta directa, sólo desde specs.
- **Los comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>` y `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`);
  - `npm run typecheck` y `npm run lint`;
  - `npx prettier --write <tus archivos>` antes de cada commit y, después, `npm run format:check`;
  - `npm run build` y, después, `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **El estilo:**
  - el código, los nombres de test y los comentarios, en inglés; la interfaz, en español rioplatense, con el texto exacto de la spec;
  - **sin comentarios.** Los únicos permitidos son los que este plan escribe en el código, que son referencias puntuales;
  - `interface` para las formas de objetos, y exports nombrados;
  - ningún `style=`.
- **Los commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`:
  - `test(front): …` o `test(qa): …` para la spec en rojo;
  - `feat(front): …` para lo que cambia a propósito;
  - `refactor(…)` sólo para lo que no cambia comportamiento;
  - `docs: …` para la documentación.
- **Al terminar,** informá:
  - las tareas cerradas;
  - los comandos que corriste, con su resultado real;
  - lo que no pudiste verificar;
  - cualquier desvío del plan.

## 0. U0 · La base (coordinador K, onda 0)

### Tarea 0.1 · La línea base y el contrato de F11a (T001)

- **Quién y cuándo:** K, sobre `a3/base` recién creada (`master` con F11a) y antes de cualquier cambio.
- **Entrega:** un commit de documentación que suma a research.md la sección «Línea base de la implementación». Lleva:
  - el hash de la base y la fecha;
  - `html.length` de `dist/index.html`;
  - la cantidad de checks de `npm test` y de pruebas de Vitest;
  - los avisos de `npm run lint`;
  - la cantidad de E2E: los 123 de F1 y A2 más los de F11a;
  - el sha256 del stdout de `node tools/content/dump-globals.ts .`.
- **Pasos:**
  1. Correr, todo en verde:
     - `npm ci --offline --no-audit --no-fund`;
     - `npm run build`, `npm test`, `npm run lint` y `npm run format:check`;
     - `E2E_PORT=4173 npm run test:e2e`.

     Si algo falla, A3 no empieza.
  2. Medir:
     - `node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"`;
     - `npm run lint 2>&1 | grep -c warning`;
     - `node tools/content/dump-globals.ts . | sha256sum`.
  3. **Contrastar F11a con su contrato** (Q1). Estas firmas tienen que estar en `master` tal como las usa este plan:
     - `createSessionGate` y `SessionGateOptions` (con `timeoutMs`), `createSessionView` y `SessionView`, y `sessionStage` y `tokenStage` de `app/boot/account-stages.ts`;
     - `fetchSession`, `sessionStore`, `SessionOutcome` y `SessionSnapshot` de `entities/session`;
     - `requestSignIn`, `RequestSignIn`, `AccessToken`, `signOut` y `SignOutDependencies` de `features/sign-in`;
     - `ApiDouble`, `ApiCall`, `ApiReply` y `ApiRoute` de `qa/e2e/fixtures/api-double.ts`;
     - `qa/lib/content-server.ts` con `sessionRequests` y `order`;
     - el escenario «the session is asked once, before the content» de `boot-check`.

     Si alguna difiere, se anota y el plan se corrige antes de U1.
- **Compuerta:** los pasos 1 a 3, con los valores anotados.
- **Vuelta atrás:** revertir el commit; nada depende de él.

### 0.2 · La compuerta de cada unidad

K la corre antes de integrar cada unidad en `a3/base` (T008, T014 y T016). Cada dueño corre en lo suyo los pasos 2 y 3, sin Docker. La unidad no se integra con una sola casilla en rojo.

1. **Antes de empezar,** sobre su base: `npm test` y la red E2E en verde.
2. **Los comandos:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y `E2E_PORT=4173 npm run test:e2e`.
3. **Sin dependencias:** `git diff a3/base -- package.json package-lock.json` no imprime nada (FR-034).
4. **Sin estilos en línea:** `git diff a3/base -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'` no imprime nada.
5. **La complejidad:** `npm run lint` da 0 errores y, como mucho, los avisos de T001.
6. **El peso:** `html.length`, anotado en la descripción del PR con la diferencia contra T001.
7. **El PR,** contra `a3/base`, con título y descripción en inglés. La descripción cuenta:
   - el contexto y qué faltaba;
   - qué cambia;
   - cómo se verificó, con los comandos y las medidas de arriba;
   - qué queda pendiente.

## 1. U1 · Los módulos nuevos, sin cablear (onda 1: S y B; onda 2: K)

**Cubre (en unidad):**

- FR-005 a FR-009, FR-011, FR-012, FR-014 a FR-019, FR-021 a FR-025;
- la parte de FR-010 que es del presupuesto;
- los casos de Vitest de SC-002 a SC-006.

**Entrega:** los módulos nuevos de `shared/lib`, `shared/api/content` y `app/boot`, con sus specs. Nada los importa todavía: la fuente estática sigue siendo la única activa (FR-031), y `dist/index.html` no cambia.

### Tarea 1.1 · Las specs de la espera y de la copia, en rojo (T002, S)

**Archivos:**

- los stubs de `frontend/src/shared/lib/wait.ts` y `frontend/src/shared/api/content/content-copy.ts`;
- `frontend/src/shared/api/content/portion-resources.ts`, entero, porque es una tabla;
- las specs `wait.spec.ts` y `content-copy.spec.ts`;
- la ayuda `fake-copy-store.ts`.

**Consume:** `PORTION_NAMES`, `PortionName` y `findPortionProblem` de `portions.ts` (A2). **Produce:** lo que el contrato dice de `shared/lib/wait.ts`, `content-copy.ts` y `portion-resources.ts`.

1. **`content-source.ts` suma, sin cambiar lo de A2,** los tipos que usa la copia. `ContentSource` sigue devolviendo `SourcePortion[]` hasta el corte. El archivo queda así:

   ```ts
   import type { PortionName } from './portions';

   export interface SourcePortion {
     readonly name: PortionName;
     readonly version: string;
     readonly data: unknown;
   }

   export interface ServedPortion extends SourcePortion {
     readonly etag: string;
   }

   export type ReadingOrigin = 'server' | 'confirmed-copy' | 'offline-copy';

   export interface ContentReading {
     readonly version: string;
     readonly origin: ReadingOrigin;
     readonly confirmedAt: string;
     readonly portions: readonly ServedPortion[];
   }

   export interface ContentRequest {
     readonly signal: AbortSignal;
   }

   export interface ContentSource {
     read(names: readonly PortionName[], request: ContentRequest): Promise<readonly SourcePortion[]>;
   }

   export type ContentFailureKind =
     'network' | 'status' | 'timeout' | 'body' | 'missing' | 'shape' | 'version' | 'access';

   export class ContentLoadError extends Error {
     readonly kind: ContentFailureKind;
     readonly detail: string;

     constructor(kind: ContentFailureKind, detail = '') {
       super(`No se pudo cargar el contenido (${kind}${detail ? `: ${detail}` : ''}).`);
       this.name = 'ContentLoadError';
       this.kind = kind;
       this.detail = detail;
     }
   }
   ```

2. **`portion-resources.ts`,** con la tabla de C2 (spec, «Key Entities»):

   ```ts
   import type { PortionName } from './portions';

   export const PORTION_RESOURCES: Readonly<Record<PortionName, string>> = {
     'lab.rust': '/api/exercises?catalog=lab&language=rust',
     'lab.go': '/api/exercises?catalog=lab&language=go',
     'quests.rust': '/api/exercises?catalog=quests&language=rust',
     'quests.go': '/api/exercises?catalog=quests&language=go',
     'cores.lowlevel': '/api/exercises?catalog=cores&domain=lowlevel',
     'cores.infra': '/api/exercises?catalog=cores&domain=infra',
     'cores.play': '/api/exercises?catalog=cores&domain=play',
     'cores.pc': '/api/exercises?catalog=cores&domain=pc',
     'campaign.rust': '/api/worlds?language=rust',
     'campaign.go': '/api/worlds?language=go',
     'workshops.lowlevel': '/api/workshops?domain=lowlevel',
     'workshops.infra': '/api/workshops?domain=infra',
     'workshops.play': '/api/workshops?domain=play',
     'workshops.pc': '/api/workshops?domain=pc',
     'atlas.rust': '/api/atlas?language=rust',
     'atlas.go': '/api/atlas?language=go',
     guide: '/api/guide',
   };
   ```

3. **Los stubs.**
   - `wait.ts` exporta `wait(ms, signal)`.
   - `content-copy.ts` exporta, con los tipos del contrato:
     - `COPY_FORMAT = 1`;
     - las interfaces `CopiedPortion`, `ContentCopy` y `ContentCopyStore`;
     - `usableCopy`, `copyOf` y `readingOf`, que lanzan `not implemented`.
4. **`frontend/src/shared/lib/wait.spec.ts`:**

   ```ts
   import { afterEach, beforeEach, describe, expect, it } from 'vitest';
   import { vi } from 'vitest';
   import { wait } from './wait';

   describe('wait', () => {
     beforeEach(() => {
       vi.useFakeTimers();
     });

     afterEach(() => {
       vi.useRealTimers();
     });

     it('resolves once the time has passed, and not before', async () => {
       let done = false;
       void wait(2_000, new AbortController().signal).then(() => {
         done = true;
       });
       await vi.advanceTimersByTimeAsync(1_999);
       expect(done).toBe(false);
       await vi.advanceTimersByTimeAsync(1);
       expect(done).toBe(true);
     });

     it('resolves as soon as the signal aborts', async () => {
       const controller = new AbortController();
       let done = false;
       void wait(60_000, controller.signal).then(() => {
         done = true;
       });
       controller.abort();
       await vi.advanceTimersByTimeAsync(0);
       expect(done).toBe(true);
     });

     it('resolves at once with a signal that already aborted', async () => {
       const controller = new AbortController();
       controller.abort();
       await expect(wait(60_000, controller.signal)).resolves.toBeUndefined();
     });
   });
   ```

5. **`frontend/src/shared/api/content/fake-copy-store.ts`:**

   ```ts
   import type { ContentCopy, ContentCopyStore } from './content-copy';

   export interface FakeCopyStore extends ContentCopyStore {
     readonly writes: ContentCopy[];
     readonly events: string[];
     stored(): unknown;
   }

   export interface FakeCopyFailures {
     readonly write?: boolean;
     readonly clear?: boolean;
   }

   export function createFakeCopyStore(
     initial: unknown = null,
     failures: FakeCopyFailures = {},
   ): FakeCopyStore {
     let record = initial;
     const writes: ContentCopy[] = [];
     const events: string[] = [];
     return {
       writes,
       events,
       stored: () => record,
       async read() {
         events.push('read');
         return record;
       },
       async write(copy) {
         events.push('write');
         writes.push(copy);
         if (failures.write === true) return false;
         record = copy;
         return true;
       },
       async clear() {
         events.push('clear');
         if (failures.clear === true) return false;
         record = null;
         return true;
       },
     };
   }
   ```

6. **`frontend/src/shared/api/content/content-copy.spec.ts`.** Los datos salen de `build/curriculum.json`:

   ```ts
   import { describe, expect, it } from 'vitest';
   import curriculum from '../../../../../build/curriculum.json';
   import { COPY_FORMAT, copyOf, readingOf, usableCopy } from './content-copy';
   import type { ContentReading } from './content-source';
   import { PORTION_NAMES, type PortionName } from './portions';

   const VERSION = '4555e8500e6ef5bd38cdaf46010d3f14';
   const CONFIRMED_AT = '2026-10-07T18:00:00.000Z';

   function realPortion(name: PortionName): unknown {
     const [group = '', slice] = name.split('.');
     const value = (curriculum as Record<string, unknown>)[group];
     return slice === undefined ? value : (value as Record<string, unknown>)[slice];
   }

   function storedRecord(): Record<string, unknown> {
     return {
       format: 1,
       version: VERSION,
       confirmedAt: CONFIRMED_AT,
       portions: Object.fromEntries(
         PORTION_NAMES.map((name) => [name, { etag: `"${name}"`, data: realPortion(name) }]),
       ),
     };
   }

   describe('usableCopy', () => {
     it('accepts a record of the current format with the 17 portions in their shape', () => {
       const copy = usableCopy(storedRecord());
       expect(copy?.version).toBe(VERSION);
       expect(copy?.confirmedAt).toBe(CONFIRMED_AT);
       expect(copy?.portions['guide']).toEqual({ etag: '"guide"', data: realPortion('guide') });
     });

     it('ignores an extra portion, so an optional one does not invalidate older copies', () => {
       const record = storedRecord();
       (record.portions as Record<string, unknown>)['harness'] = { etag: '"h"', data: {} };
       expect(usableCopy(record)).not.toBeNull();
       expect(Object.keys(usableCopy(record)?.portions ?? {})).toHaveLength(17);
     });

     it.each([
       ['another format', { format: 2 }],
       ['no version', { version: 7 }],
       ['no date', { confirmedAt: null }],
       ['no portions', { portions: [] }],
     ])('rejects a record with %s', (_case, change) => {
       expect(usableCopy({ ...storedRecord(), ...change })).toBeNull();
     });

     it('rejects a record that lacks a portion, has a portion without its ETag or of another shape', () => {
       const withoutGuide = storedRecord();
       delete (withoutGuide.portions as Record<string, unknown>)['guide'];
       const withoutEtag = storedRecord();
       (withoutEtag.portions as Record<string, unknown>)['lab.go'] = { data: realPortion('lab.go') };
       const malformed = storedRecord();
       (malformed.portions as Record<string, unknown>)['quests.rust'] = { etag: '"q"', data: {} };
       expect(usableCopy(withoutGuide)).toBeNull();
       expect(usableCopy(withoutEtag)).toBeNull();
       expect(usableCopy(malformed)).toBeNull();
       expect(usableCopy(null)).toBeNull();
     });
   });

   describe('copyOf and readingOf', () => {
     it('keep the version, the date, each ETag and the very same data', () => {
       const reading: ContentReading = {
         version: VERSION,
         origin: 'server',
         confirmedAt: CONFIRMED_AT,
         portions: PORTION_NAMES.map((name) => ({
           name,
           version: VERSION,
           etag: `W/"${name}"`,
           data: realPortion(name),
         })),
       };
       const copy = copyOf(reading);
       expect(copy.format).toBe(COPY_FORMAT);
       expect(copy.portions['atlas.go']).toEqual({
         etag: 'W/"atlas.go"',
         data: realPortion('atlas.go'),
       });
       const back = readingOf(copy, 'offline-copy', CONFIRMED_AT);
       expect(back.origin).toBe('offline-copy');
       expect(back.portions.map((portion) => portion.name)).toEqual([...PORTION_NAMES]);
       expect(back.portions.find((portion) => portion.name === 'lab.rust')?.data).toBe(
         realPortion('lab.rust'),
       );
       expect(back.portions.every((portion) => portion.version === VERSION)).toBe(true);
     });
   });
   ```

7. **Correr** `npm run test:unit -- frontend/src/shared/lib/wait.spec.ts frontend/src/shared/api/content/content-copy.spec.ts`. Fallan con `not implemented`, y las de A2 siguen en verde.
8. **Commit:** `test(front): specs de la espera y de la copia del contenido, en rojo`.

### Tarea 1.2 · La espera y la copia (T003, S)

**Archivos:** `frontend/src/shared/lib/wait.ts` y `frontend/src/shared/api/content/content-copy.ts`.

1. **`wait.ts`:**

   ```ts
   export function wait(ms: number, signal: AbortSignal): Promise<void> {
     return new Promise((resolve) => {
       if (signal.aborted) {
         resolve();
         return;
       }
       const finish = (): void => {
         clearTimeout(timer);
         signal.removeEventListener('abort', finish);
         resolve();
       };
       const timer = setTimeout(finish, ms);
       signal.addEventListener('abort', finish);
     });
   }
   ```

2. **`content-copy.ts`:**

   ```ts
   import { isPlainObject } from '../../lib/is-plain-object';
   import type { ContentReading, ReadingOrigin } from './content-source';
   import { PORTION_NAMES, findPortionProblem, type PortionName } from './portions';

   export const COPY_FORMAT = 1;

   export interface CopiedPortion {
     readonly etag: string;
     readonly data: unknown;
   }

   export interface ContentCopy {
     readonly format: number;
     readonly version: string;
     readonly confirmedAt: string;
     readonly portions: Readonly<Record<PortionName, CopiedPortion>>;
   }

   export interface ContentCopyStore {
     read(): Promise<unknown>;
     write(copy: ContentCopy): Promise<boolean>;
     clear(): Promise<boolean>;
   }

   function copiedPortion(name: PortionName, value: unknown): CopiedPortion | null {
     if (!isPlainObject(value) || typeof value.etag !== 'string') return null;
     return findPortionProblem(name, value.data) === null
       ? { etag: value.etag, data: value.data }
       : null;
   }

   export function usableCopy(record: unknown): ContentCopy | null {
     if (!isPlainObject(record) || record.format !== COPY_FORMAT) return null;
     const { version, confirmedAt, portions } = record;
     if (typeof version !== 'string' || typeof confirmedAt !== 'string') return null;
     if (!isPlainObject(portions)) return null;
     const copied: Partial<Record<PortionName, CopiedPortion>> = {};
     for (const name of PORTION_NAMES) {
       const portion = copiedPortion(name, portions[name]);
       if (portion === null) return null;
       copied[name] = portion;
     }
     return {
       format: COPY_FORMAT,
       version,
       confirmedAt,
       portions: copied as Record<PortionName, CopiedPortion>,
     };
   }

   export function copyOf(reading: ContentReading): ContentCopy {
     const portions: Partial<Record<PortionName, CopiedPortion>> = {};
     for (const portion of reading.portions)
       portions[portion.name] = { etag: portion.etag, data: portion.data };
     return {
       format: COPY_FORMAT,
       version: reading.version,
       confirmedAt: reading.confirmedAt,
       portions: portions as Record<PortionName, CopiedPortion>,
     };
   }

   export function readingOf(
     copy: ContentCopy,
     origin: Exclude<ReadingOrigin, 'server'>,
     confirmedAt: string,
   ): ContentReading {
     return {
       version: copy.version,
       origin,
       confirmedAt,
       portions: PORTION_NAMES.map((name) => ({
         name,
         version: copy.version,
         etag: copy.portions[name].etag,
         data: copy.portions[name].data,
       })),
     };
   }
   ```

3. **Correr** las dos specs de T002, en verde, y después `npm run typecheck` y `npm run lint`.
4. **Commit:** `feat(front): la forma de la copia del contenido y una espera que se corta`.

### Tarea 1.3 · Las specs del presupuesto, del lector de la sesión, del aviso y de la fecha, en rojo (T004, B)

**Archivos:**

- los stubs de `frontend/src/app/boot/attempt-budget.ts`, `session-reader.ts` y `copy-notice.ts`, y de `frontend/src/shared/lib/format-long-date.ts`;
- sus specs `attempt-budget.spec.ts`, `session-reader.spec.ts`, `copy-notice.spec.ts` y `format-long-date.spec.ts`.

**Consume:**

- de F11a (contrato): `SessionOutcome`, `SessionSnapshot`, `PublishedUser`, `AccessToken` y `RequestSignIn`;
- de S: `SessionRead`, que en este punto se declara en el stub de `api-content-source.ts` de T006. Si B empieza antes que S, declara `SessionRead` igual en su stub de `session-reader.ts` y lo cambia por el import cuando S entrega T006.

**Produce:** lo que el contrato dice de `app/boot` para el presupuesto, el lector y el aviso, y `formatLongDate`.

1. **Los stubs,** con las firmas del contrato, que lanzan `not implemented`.
2. **`frontend/src/app/boot/attempt-budget.spec.ts`:**

   ```ts
   import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
   import { createAttemptBudget } from './attempt-budget';

   const TOTAL_MS = 20_000;

   function startedBudget() {
     const budget = createAttemptBudget({ totalMs: TOTAL_MS, now: () => Date.now() });
     budget.begin();
     return budget;
   }

   describe('the attempt budget', () => {
     beforeEach(() => {
       vi.useFakeTimers();
     });

     afterEach(() => {
       vi.useRealTimers();
     });

     it('expires once the 20 s are spent, and not before', async () => {
       const budget = startedBudget();
       const expired = vi.fn();
       budget.onExpired(expired);
       await vi.advanceTimersByTimeAsync(TOTAL_MS - 1);
       expect(expired).not.toHaveBeenCalled();
       expect(budget.remainingMs()).toBe(1);
       await vi.advanceTimersByTimeAsync(1);
       expect(expired).toHaveBeenCalledOnce();
       expect(budget.remainingMs()).toBe(0);
     });

     it('keeps counting for a listener that arrives later: 15 s spent leave 5 s', async () => {
       const budget = startedBudget();
       await vi.advanceTimersByTimeAsync(15_000);
       const expired = vi.fn();
       budget.onExpired(expired);
       await vi.advanceTimersByTimeAsync(4_999);
       expect(expired).not.toHaveBeenCalled();
       await vi.advanceTimersByTimeAsync(1);
       expect(expired).toHaveBeenCalledOnce();
     });

     it('does not count the time inside pausedWhile', async () => {
       const budget = startedBudget();
       const expired = vi.fn();
       budget.onExpired(expired);
       await vi.advanceTimersByTimeAsync(5_000);
       let finishSignIn: () => void = () => {};
       const signIn = budget.pausedWhile(
         () =>
           new Promise<void>((resolve) => {
             finishSignIn = resolve;
           }),
       );
       await vi.advanceTimersByTimeAsync(120_000);
       expect(expired).not.toHaveBeenCalled();
       expect(budget.remainingMs()).toBe(15_000);
       finishSignIn();
       await signIn;
       await vi.advanceTimersByTimeAsync(14_999);
       expect(expired).not.toHaveBeenCalled();
       await vi.advanceTimersByTimeAsync(1);
       expect(expired).toHaveBeenCalledOnce();
     });

     it('starts a whole budget again with begin', async () => {
       const budget = startedBudget();
       const expired = vi.fn();
       budget.onExpired(expired);
       await vi.advanceTimersByTimeAsync(15_000);
       budget.begin();
       await vi.advanceTimersByTimeAsync(TOTAL_MS - 1);
       expect(expired).not.toHaveBeenCalled();
       await vi.advanceTimersByTimeAsync(1);
       expect(expired).toHaveBeenCalledOnce();
     });

     it('leaves a removed listener and a replaced timer harmless, even if clearTimeout does nothing', async () => {
       vi.stubGlobal('clearTimeout', () => {});
       const budget = startedBudget();
       const removed = vi.fn();
       const stop = budget.onExpired(removed);
       stop();
       const kept = vi.fn();
       budget.onExpired(kept);
       budget.begin();
       await vi.advanceTimersByTimeAsync(TOTAL_MS);
       expect(removed).not.toHaveBeenCalled();
       expect(kept).toHaveBeenCalledOnce();
       vi.unstubAllGlobals();
     });
   });
   ```

3. **`frontend/src/app/boot/session-reader.spec.ts`.** El ingreso del doble dura un minuto, para ver que no gasta el presupuesto:

   ```ts
   import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
   import type { PublishedUser, SessionOutcome, SessionSnapshot } from '../../entities/session';
   import type { AccessToken, RequestSignIn } from '../../features/sign-in';
   import { createAttemptBudget } from './attempt-budget';
   import { createSessionReader } from './session-reader';

   const ANA: PublishedUser = {
     id: 41,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     privacyAccepted: true,
   };
   const INVITATION: AccessToken = { kind: 'invitation', token: 'k3J8' };
   const VERSION = 'v1';

   function sessionOf(user: PublishedUser | null): SessionOutcome {
     const snapshot: SessionSnapshot = {
       user,
       features: { passwordReset: false, registration: false },
       contentVersion: VERSION,
     };
     return { kind: 'session', snapshot };
   }

   function rateLimited(retryAfterSeconds: number | null): SessionOutcome {
     return { kind: 'rate-limited', message: 'Demasiados intentos.', retryAfterSeconds };
   }

   function setup(outcomes: readonly SessionOutcome[]) {
     let index = 0;
     const fetchSession = vi.fn(async () => {
       const next = outcomes[Math.min(index, outcomes.length - 1)];
       index += 1;
       if (next === undefined) throw new Error('no outcome');
       return next;
     });
     const budget = createAttemptBudget({ totalMs: 20_000, now: () => Date.now() });
     budget.begin();
     const events: string[] = [];
     const requestSignIn = vi.fn<RequestSignIn>(async () => {
       events.push(`sign-in with ${budget.remainingMs()} ms left`);
       await new Promise((resolve) => setTimeout(resolve, 60_000));
       return ANA;
     });
     const forgetContentCopy = vi.fn(async () => {
       events.push('forget the copy');
     });
     const storeSession = vi.fn<(snapshot: SessionSnapshot) => void>();
     const read = createSessionReader({
       fetchSession,
       storeSession,
       requestSignIn,
       forgetContentCopy,
       budget,
     });
     return { fetchSession, requestSignIn, forgetContentCopy, storeSession, budget, events, read };
   }

   describe('the session reader', () => {
     beforeEach(() => {
       vi.useFakeTimers();
     });

     afterEach(() => {
       vi.useRealTimers();
     });

     it('hands the content version of an account that is ready and stores the session', async () => {
       const { storeSession, requestSignIn, read } = setup([sessionOf(ANA)]);
       expect(await read({ signal: new AbortController().signal })).toEqual({
         kind: 'ready',
         contentVersion: VERSION,
       });
       expect(storeSession).toHaveBeenCalledOnce();
       expect(requestSignIn).not.toHaveBeenCalled();
     });

     it('with user: null forgets the copy, asks for the sign-in as a page and reads again', async () => {
       const { fetchSession, requestSignIn, events, read } = setup([sessionOf(null), sessionOf(ANA)]);
       const result = read({ signal: new AbortController().signal });
       await vi.advanceTimersByTimeAsync(60_000);
       expect(await result).toEqual({ kind: 'ready', contentVersion: VERSION });
       expect(requestSignIn).toHaveBeenCalledWith({
         presentation: 'page',
         reason: 'boot',
         token: null,
       });
       expect(events[0]).toBe('forget the copy');
       expect(fetchSession).toHaveBeenCalledTimes(2);
     });

     it('does not spend the budget while the sign-in lasts', async () => {
       const { budget, read } = setup([sessionOf(null), sessionOf(ANA)]);
       const result = read({ signal: new AbortController().signal });
       await vi.advanceTimersByTimeAsync(60_000);
       await result;
       expect(budget.remainingMs()).toBe(20_000);
     });

     it('asks for the access with the token even with a live session, and only once', async () => {
       const { requestSignIn, forgetContentCopy, read } = setup([sessionOf(ANA), sessionOf(ANA)]);
       const result = read({ signal: new AbortController().signal, token: INVITATION });
       await vi.advanceTimersByTimeAsync(60_000);
       await result;
       expect(requestSignIn).toHaveBeenCalledOnce();
       expect(requestSignIn).toHaveBeenCalledWith({
         presentation: 'page',
         reason: 'boot',
         token: INVITATION,
       });
       expect(forgetContentCopy).not.toHaveBeenCalled();
     });

     it('asks for the access of an account that has not accepted the current notice', async () => {
       const { requestSignIn, forgetContentCopy, read } = setup([
         sessionOf({ ...ANA, privacyAccepted: false }),
         sessionOf(ANA),
       ]);
       const result = read({ signal: new AbortController().signal });
       await vi.advanceTimersByTimeAsync(60_000);
       await result;
       expect(requestSignIn).toHaveBeenCalledOnce();
       expect(forgetContentCopy).not.toHaveBeenCalled();
     });

     it('waits a Retry-After that fits and asks once more', async () => {
       const { fetchSession, read } = setup([rateLimited(2), sessionOf(ANA)]);
       let result: unknown;
       void read({ signal: new AbortController().signal }).then((value) => {
         result = value;
       });
       await vi.advanceTimersByTimeAsync(1_999);
       expect(fetchSession).toHaveBeenCalledOnce();
       await vi.advanceTimersByTimeAsync(1);
       expect(result).toEqual({ kind: 'ready', contentVersion: VERSION });
     });

     it.each([60, null])('is unreachable with status when Retry-After is %s', async (seconds) => {
       const { fetchSession, read } = setup([rateLimited(seconds)]);
       expect(await read({ signal: new AbortController().signal })).toEqual({
         kind: 'unreachable',
         failure: 'status',
       });
       expect(fetchSession).toHaveBeenCalledOnce();
     });

     it('is unreachable with network, or with timeout once the attempt aborted', async () => {
       const network = setup([{ kind: 'unreachable' }]);
       expect(await network.read({ signal: new AbortController().signal })).toEqual({
         kind: 'unreachable',
         failure: 'network',
       });
       const controller = new AbortController();
       controller.abort();
       const timeout = setup([{ kind: 'unreachable' }]);
       expect(await timeout.read({ signal: controller.signal })).toEqual({
         kind: 'unreachable',
         failure: 'timeout',
       });
     });
   });
   ```

4. **`frontend/src/shared/lib/format-long-date.spec.ts`:**

   ```ts
   import { describe, expect, it } from 'vitest';
   import { formatLongDate } from './format-long-date';

   describe('formatLongDate', () => {
     it('writes the day, the month and the year in Spanish', () => {
       expect(formatLongDate('2026-10-07T15:00:00.000Z', 'America/Argentina/Buenos_Aires')).toBe(
         '7 de octubre de 2026',
       );
     });

     it('uses the day of the time zone it is given', () => {
       expect(formatLongDate('2026-10-08T01:30:00.000Z', 'America/Argentina/Buenos_Aires')).toBe(
         '7 de octubre de 2026',
       );
       expect(formatLongDate('2026-10-08T01:30:00.000Z', 'UTC')).toBe('8 de octubre de 2026');
     });
   });
   ```

5. **`frontend/src/app/boot/copy-notice.spec.ts`.** El texto esperado es el de FR-025 con la fecha escrita a mano. `document` y `requestAnimationFrame` se simulan, sin entorno DOM:

   ```ts
   import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
   import { copyNoticeText, showCopyNotice } from './copy-notice';

   const NOTICE =
     'No se pudo traer el contenido del servidor del taller. Estás usando la copia que guardó este navegador, que estaba al día el 7 de octubre de 2026. Tu progreso sigue guardado en este navegador. Recargá la página más tarde para traer el contenido al día.';

   function hostStub() {
     const attributes = new Map<string, string>();
     return {
       attributes,
       innerHTML: '',
       focused: false,
       setAttribute(name: string, value: string) {
         attributes.set(name, value);
       },
       focus() {
         this.focused = true;
       },
     };
   }

   describe('the notice without the server', () => {
     beforeEach(() => {
       vi.useFakeTimers();
       vi.stubGlobal('requestAnimationFrame', (callback: () => void) => setTimeout(callback, 16));
     });

     afterEach(() => {
       vi.useRealTimers();
       vi.unstubAllGlobals();
     });

     it('says where the content comes from and the day the server last confirmed it (FR-025)', () => {
       expect(copyNoticeText('2026-10-07T18:00:00.000Z', 'America/Argentina/Buenos_Aires')).toBe(
         NOTICE,
       );
     });

     it('becomes a status region first and writes the text on the next frame, without taking the focus', async () => {
       const host = hostStub();
       vi.stubGlobal('document', {
         getElementById: (id: string) => (id === 'content-copy-notice' ? host : null),
       });
       showCopyNotice('2026-10-07T18:00:00.000Z');
       expect(host.attributes.get('role')).toBe('status');
       expect(host.innerHTML).toBe('');
       await vi.advanceTimersByTimeAsync(16);
       expect(host.innerHTML).toMatch(/^<p>No se pudo traer el contenido del servidor del taller\./);
       expect(host.innerHTML).not.toContain('style=');
       expect(host.focused).toBe(false);
     });

     it('does nothing without its element', () => {
       vi.stubGlobal('document', { getElementById: () => null });
       expect(() => showCopyNotice('2026-10-07T18:00:00.000Z')).not.toThrow();
     });
   });
   ```

6. **Correr** `npm run test:unit -- frontend/src/app/boot frontend/src/shared/lib/format-long-date.spec.ts`. Las nuevas fallan con `not implemented`, y las de A2 y F11a siguen en verde.
7. **Commit:** `test(front): specs del presupuesto del intento, del lector de la sesión y del aviso sin servidor, en rojo`.

### Tarea 1.4 · El presupuesto, el lector de la sesión, el aviso y la fecha (T005, B)

**Archivos:** `attempt-budget.ts`, `session-reader.ts` y `copy-notice.ts` de `frontend/src/app/boot/`, y `frontend/src/shared/lib/format-long-date.ts`.

1. **`attempt-budget.ts`.** El comentario es la referencia puntual al arnés de `boot-check`, como en `content-gate.ts`:

   ```ts
   export interface AttemptBudget {
     begin(): void;
     remainingMs(): number;
     pausedWhile<T>(work: () => Promise<T>): Promise<T>;
     onExpired(listener: () => void): () => void;
   }

   export interface AttemptBudgetOptions {
     readonly totalMs: number;
     readonly now: () => number;
   }

   // One timer stands for the budget at a time. A timer that a later one replaced does nothing when it
   // fires: the harness of boot-check runs every queued timer on flush() and never cancels one.
   export function createAttemptBudget({ totalMs, now }: AttemptBudgetOptions): AttemptBudget {
     const listeners = new Set<() => void>();
     let spentMs = 0;
     let runningSince: number | null = null;
     let generation = 0;

     function remainingMs(): number {
       const running = runningSince === null ? 0 : now() - runningSince;
       return Math.max(0, totalMs - spentMs - running);
     }

     function arm(): void {
       generation += 1;
       if (runningSince === null || listeners.size === 0) return;
       const armed = generation;
       setTimeout(() => {
         if (armed !== generation) return;
         for (const listener of [...listeners]) listener();
       }, remainingMs());
     }

     return {
       begin() {
         spentMs = 0;
         runningSince = now();
         arm();
       },
       remainingMs,
       async pausedWhile(work) {
         if (runningSince !== null) spentMs += now() - runningSince;
         runningSince = null;
         arm();
         try {
           return await work();
         } finally {
           runningSince = now();
           arm();
         }
       },
       onExpired(listener) {
         listeners.add(listener);
         arm();
         return () => {
           listeners.delete(listener);
         };
       },
     };
   }
   ```

2. **`session-reader.ts`:**

   ```ts
   import type { SessionOutcome, SessionSnapshot } from '../../entities/session';
   import type { AccessToken, RequestSignIn } from '../../features/sign-in';
   import type { SessionRead } from '../../shared/api/content';
   import { wait } from '../../shared/lib/wait';
   import type { AttemptBudget } from './attempt-budget';

   export interface SessionReaderOptions {
     readonly fetchSession: (request: { readonly signal: AbortSignal }) => Promise<SessionOutcome>;
     readonly storeSession: (snapshot: SessionSnapshot) => void;
     readonly requestSignIn: RequestSignIn;
     readonly forgetContentCopy: () => Promise<void>;
     readonly budget: AttemptBudget;
   }

   export interface SessionReadRequest {
     readonly signal: AbortSignal;
     readonly token?: AccessToken | null;
   }

   export type ReadSession = (request: SessionReadRequest) => Promise<SessionRead>;

   type RateLimited = Extract<SessionOutcome, { kind: 'rate-limited' }>;

   function needsAccess(snapshot: SessionSnapshot, token: AccessToken | null): boolean {
     if (token !== null) return true;
     return snapshot.user === null || !snapshot.user.privacyAccepted;
   }

   function retryAfterMs(outcome: RateLimited): number | null {
     return outcome.retryAfterSeconds === null ? null : outcome.retryAfterSeconds * 1000;
   }

   export function createSessionReader(options: SessionReaderOptions): ReadSession {
     return async ({ signal, token: firstToken = null }) => {
       let token = firstToken;
       for (;;) {
         const outcome = await options.fetchSession({ signal });
         if (outcome.kind === 'unreachable') {
           return { kind: 'unreachable', failure: signal.aborted ? 'timeout' : 'network' };
         }
         if (outcome.kind === 'rate-limited') {
           const waitMs = retryAfterMs(outcome);
           if (waitMs === null || waitMs > options.budget.remainingMs()) {
             return { kind: 'unreachable', failure: 'status' };
           }
           await wait(waitMs, signal);
           continue;
         }
         options.storeSession(outcome.snapshot);
         if (outcome.snapshot.user === null) await options.forgetContentCopy();
         if (!needsAccess(outcome.snapshot, token)) {
           return { kind: 'ready', contentVersion: outcome.snapshot.contentVersion };
         }
         const pending = token;
         token = null;
         await options.budget.pausedWhile(() =>
           options.requestSignIn({ presentation: 'page', reason: 'boot', token: pending }),
         );
       }
     };
   }
   ```

3. **`format-long-date.ts`:**

   ```ts
   export function formatLongDate(iso: string, timeZone?: string): string {
     return new Intl.DateTimeFormat('es-AR', {
       day: 'numeric',
       month: 'long',
       year: 'numeric',
       timeZone,
     }).format(new Date(iso));
   }
   ```

4. **`copy-notice.ts`:**

   ```ts
   import { escapeHtml } from '../../shared/lib/escape-html';
   import { formatLongDate } from '../../shared/lib/format-long-date';

   export const COPY_NOTICE_ID = 'content-copy-notice';

   export function copyNoticeText(confirmedAt: string, timeZone?: string): string {
     return (
       'No se pudo traer el contenido del servidor del taller. ' +
       `Estás usando la copia que guardó este navegador, que estaba al día el ${formatLongDate(confirmedAt, timeZone)}. ` +
       'Tu progreso sigue guardado en este navegador. Recargá la página más tarde para traer el contenido al día.'
     );
   }

   export function showCopyNotice(confirmedAt: string): void {
     const host = document.getElementById(COPY_NOTICE_ID);
     if (host === null) return;
     host.setAttribute('role', 'status');
     requestAnimationFrame(() => {
       host.innerHTML = `<p>${escapeHtml(copyNoticeText(confirmedAt))}</p>`;
     });
   }
   ```

5. **Correr** las specs de T004, en verde, y después `npm run typecheck` y `npm run lint`. Ninguna función pasa de 10.
6. **Commit:** `feat(front): el presupuesto del intento, el lector de la sesión y el aviso sin servidor`.

### Tarea 1.5 · Las specs de la fuente de la API y del almacén, en rojo (T006, S, desde T003)

**Archivos:**

- los stubs de `frontend/src/shared/api/content/api-content-source.ts`, `indexeddb-copy-store.ts` y `content-copies.ts`;
- las ayudas `fake-content-api.ts` y `fake-indexed-db.ts`;
- las specs `api-content-source.spec.ts` e `indexeddb-copy-store.spec.ts`.

**Consume:** lo de T003. **Produce:** lo que el contrato dice de la fuente, del almacén y de `contentCopies`.

1. **Los stubs.**
   - **`api-content-source.ts`** exporta:
     - los tipos `SessionRead`, `ContentResponse`, `ContentFetch`, `ApiContentSourceOptions` y `ApiContentSource`;
     - `MAX_ROUNDS = 3`;
     - `createApiContentSource`, cuyo `read` lanza `not implemented`.
   - **`indexeddb-copy-store.ts`** exporta las cuatro constantes del contrato y `createIndexedDbCopyStore`, que lanza `not implemented`.
   - **`content-copies.ts`** queda entero, como en T007.
2. **`fake-content-api.ts`.** Devuelve `Response` reales de Node; un 304 va sin cuerpo:

   ```ts
   import type { ContentFetch, ContentResponse } from './api-content-source';

   export interface FetchCall {
     readonly path: string;
     readonly headers: Readonly<Record<string, string>>;
     readonly credentials: RequestCredentials | undefined;
     readonly signal: AbortSignal | undefined;
   }

   export type FakeAnswer =
     | {
         readonly status: number;
         readonly body?: string;
         readonly headers?: Readonly<Record<string, string>>;
       }
     | 'network-error'
     | 'hang';

   export interface FakeContentApi {
     readonly fetch: ContentFetch;
     readonly calls: FetchCall[];
   }

   const NULL_BODY_STATUS = 304;

   function abortError(): DOMException {
     return new DOMException('The operation was aborted.', 'AbortError');
   }

   export function createFakeContentApi(
     answer: (call: FetchCall, count: number) => FakeAnswer,
   ): FakeContentApi {
     const calls: FetchCall[] = [];
     const counts = new Map<string, number>();
     return {
       calls,
       async fetch(input, init) {
         const call: FetchCall = {
           path: input,
           headers: { ...(init.headers as Record<string, string>) },
           credentials: init.credentials,
           signal: init.signal ?? undefined,
         };
         calls.push(call);
         if (call.signal?.aborted === true) throw abortError();
         const count = (counts.get(input) ?? 0) + 1;
         counts.set(input, count);
         const reply = answer(call, count);
         if (reply === 'network-error') throw new TypeError('Failed to fetch');
         if (reply === 'hang') {
           return new Promise<ContentResponse>((_resolve, reject) => {
             call.signal?.addEventListener('abort', () => reject(abortError()));
           });
         }
         const body = reply.status === NULL_BODY_STATUS ? null : (reply.body ?? '');
         return new Response(body, { status: reply.status, headers: reply.headers });
       },
     };
   }
   ```

3. **`api-content-source.spec.ts`.** La tabla de C2 se escribe en la spec, aparte de `PORTION_RESOURCES`, y los datos y los `ETag` salen del generador. Fija los casos 3, 4 y 5 de la «Review Focus» y los 18 casos de SC-003:

   ```ts
   import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
   import curriculum from '../../../../../build/curriculum.json';
   import meta from '../../../../../build/curriculum.meta.json';
   import { createApiContentSource, type SessionRead } from './api-content-source';
   import { ContentLoadError, type ContentFailureKind, type ContentReading } from './content-source';
   import { createFakeContentApi, type FakeAnswer, type FetchCall } from './fake-content-api';
   import { createFakeCopyStore, type FakeCopyStore } from './fake-copy-store';
   import { PORTION_NAMES, type PortionName } from './portions';

   // The 17 resources of C2 (spec 016, «Key Entities»).
   const C2_RESOURCES: Readonly<Record<string, PortionName>> = {
     '/api/exercises?catalog=lab&language=rust': 'lab.rust',
     '/api/exercises?catalog=lab&language=go': 'lab.go',
     '/api/exercises?catalog=quests&language=rust': 'quests.rust',
     '/api/exercises?catalog=quests&language=go': 'quests.go',
     '/api/exercises?catalog=cores&domain=lowlevel': 'cores.lowlevel',
     '/api/exercises?catalog=cores&domain=infra': 'cores.infra',
     '/api/exercises?catalog=cores&domain=play': 'cores.play',
     '/api/exercises?catalog=cores&domain=pc': 'cores.pc',
     '/api/worlds?language=rust': 'campaign.rust',
     '/api/worlds?language=go': 'campaign.go',
     '/api/workshops?domain=lowlevel': 'workshops.lowlevel',
     '/api/workshops?domain=infra': 'workshops.infra',
     '/api/workshops?domain=play': 'workshops.play',
     '/api/workshops?domain=pc': 'workshops.pc',
     '/api/atlas?language=rust': 'atlas.rust',
     '/api/atlas?language=go': 'atlas.go',
     '/api/guide': 'guide',
   };

   const VERSION = meta.documentHash.slice(0, 32);
   const NEXT = 'b'.repeat(32);
   const OLD = 'a'.repeat(32);
   const NOW = new Date('2026-10-28T15:00:00.000Z');
   const COPY_DATE = '2026-10-07T18:00:00.000Z';
   const BUDGET_MS = 20_000;

   function realPortion(name: PortionName): unknown {
     const [group = '', slice] = name.split('.');
     const value = (curriculum as Record<string, unknown>)[group];
     return slice === undefined ? value : (value as Record<string, unknown>)[slice];
   }

   function etagOf(name: PortionName): string {
     return `"${(meta.portions as Record<string, string>)[name]?.slice(0, 32)}"`;
   }

   function nameOf(call: FetchCall): PortionName {
     const name = C2_RESOURCES[call.path];
     if (name === undefined) throw new Error(`not a resource of C2: ${call.path}`);
     return name;
   }

   function served(name: PortionName, version = VERSION): FakeAnswer {
     return {
       status: 200,
       body: JSON.stringify(realPortion(name)),
       headers: { ETag: etagOf(name), 'Content-Version': version, 'Content-Type': 'application/json' },
     };
   }

   function notModified(name: PortionName, version = VERSION): FakeAnswer {
     return { status: 304, headers: { ETag: etagOf(name), 'Content-Version': version } };
   }

   function storedCopy(version = OLD): Record<string, unknown> {
     return {
       format: 1,
       version,
       confirmedAt: COPY_DATE,
       portions: Object.fromEntries(
         PORTION_NAMES.map((name) => [name, { etag: etagOf(name), data: realPortion(name) }]),
       ),
     };
   }

   interface SetupOptions {
     readonly sessions?: readonly SessionRead[];
     readonly answer?: (name: PortionName, call: FetchCall, count: number) => FakeAnswer;
     readonly copies?: FakeCopyStore;
     readonly mayUseCopy?: boolean;
     readonly remainingMs?: () => number;
   }

   function setup(options: SetupOptions = {}) {
     const sessions = options.sessions ?? [{ kind: 'ready', contentVersion: VERSION }];
     let sessionReads = 0;
     const readSession = vi.fn(async (): Promise<SessionRead> => {
       const read = sessions[Math.min(sessionReads, sessions.length - 1)];
       sessionReads += 1;
       if (read === undefined) throw new Error('no session read');
       return read;
     });
     const requestAccess = vi.fn(async () => {});
     const api = createFakeContentApi((call, count) =>
       (options.answer ?? ((name) => served(name)))(nameOf(call), call, count),
     );
     const copies = options.copies ?? createFakeCopyStore();
     const source = createApiContentSource({
       fetch: api.fetch,
       readSession,
       requestAccess,
       copies,
       mayUseCopy: () => options.mayUseCopy ?? true,
       remainingMs: options.remainingMs ?? (() => BUDGET_MS),
       now: () => NOW,
     });
     const read = (signal = new AbortController().signal) => source.read(PORTION_NAMES, { signal });
     return { api, copies, readSession, requestAccess, read };
   }

   async function failureOf(promise: Promise<unknown>): Promise<ContentLoadError> {
     const error = await promise.then(
       () => undefined,
       (rejection: unknown) => rejection,
     );
     expect(error).toBeInstanceOf(ContentLoadError);
     return error as ContentLoadError;
   }

   function dataOf(reading: ContentReading, name: PortionName): unknown {
     return reading.portions.find((portion) => portion.name === name)?.data;
   }

   describe('the content source of the API', () => {
     beforeEach(() => {
       vi.useFakeTimers();
     });

     afterEach(() => {
       vi.useRealTimers();
     });

     it('asks the 17 resources of C2 once, same origin and without the headers of a change', async () => {
       const { api, read } = setup();
       await read();
       expect(api.calls.map((call) => call.path).sort()).toEqual(Object.keys(C2_RESOURCES).sort());
       for (const call of api.calls) {
         expect(call.credentials).toBe('same-origin');
         expect(call.headers['Accept']).toBe('application/json');
         expect(Object.keys(call.headers)).not.toContain('X-XSRF-TOKEN');
         expect(Object.keys(call.headers)).not.toContain('X-Taller-User');
         expect(Object.keys(call.headers)).not.toContain('If-None-Match');
       }
     });

     it('hands a server reading with one version, the ETag of each portion and the time of the answer', async () => {
       const { read } = setup();
       const reading = await read();
       expect(reading.origin).toBe('server');
       expect(reading.version).toBe(VERSION);
       expect(reading.confirmedAt).toBe(NOW.toISOString());
       expect(reading.portions).toHaveLength(17);
       expect(dataOf(reading, 'guide')).toEqual(realPortion('guide'));
       expect(reading.portions.find((portion) => portion.name === 'atlas.go')?.etag).toBe(
         etagOf('atlas.go'),
       );
     });

     it('clears the stored copy before it hands a server reading of another version', async () => {
       const copies = createFakeCopyStore(storedCopy(OLD));
       const { read } = setup({ copies });
       await read();
       expect(copies.events).toEqual(['read', 'clear']);
       expect(copies.stored()).toBeNull();
     });

     it('still hands the server reading when the store cannot clear the copy', async () => {
       const copies = createFakeCopyStore(storedCopy(OLD), { clear: true });
       const { read } = setup({ copies });
       expect((await read()).origin).toBe('server');
     });

     it('with a copy in the version of the session asks no portion and hands the copy, confirmed now', async () => {
       const { api, read } = setup({ copies: createFakeCopyStore(storedCopy(VERSION)) });
       const reading = await read();
       expect(api.calls).toHaveLength(0);
       expect(reading.origin).toBe('confirmed-copy');
       expect(reading.confirmedAt).toBe(NOW.toISOString());
       expect(dataOf(reading, 'lab.rust')).toEqual(realPortion('lab.rust'));
     });

     it('with a copy of another version sends each ETag: a 304 takes the copy and a 200 the body', async () => {
       const changedGuide = { ...(realPortion('guide') as Record<string, unknown>), changed: true };
       const { api, read } = setup({
         copies: createFakeCopyStore(storedCopy(OLD)),
         answer: (name) =>
           name === 'guide'
             ? {
                 status: 200,
                 body: JSON.stringify(changedGuide),
                 headers: { ETag: '"new-guide"', 'Content-Version': VERSION },
               }
             : notModified(name),
       });
       const reading = await read();
       expect(api.calls.map((call) => call.headers['If-None-Match']).sort()).toEqual(
         PORTION_NAMES.map(etagOf).sort(),
       );
       expect(dataOf(reading, 'guide')).toEqual(changedGuide);
       expect(dataOf(reading, 'lab.go')).toEqual(realPortion('lab.go'));
       expect(reading.portions.find((portion) => portion.name === 'guide')?.etag).toBe('"new-guide"');
       expect(reading.portions.find((portion) => portion.name === 'lab.go')?.etag).toBe(
         etagOf('lab.go'),
       );
     });

     it('fails with status for a 304 of a portion that the copy does not have', async () => {
       const { read } = setup({
         answer: (name) => (name === 'atlas.rust' ? notModified(name) : served(name)),
       });
       expect((await failureOf(read())).kind).toBe('status');
     });

     it('keeps a weak ETag as it came and sends it back as it is', async () => {
       const weak = (name: PortionName): FakeAnswer => ({
         status: 200,
         body: JSON.stringify(realPortion(name)),
         headers: { ETag: `W/${etagOf(name)}`, 'Content-Version': OLD },
       });
       const first = setup({ sessions: [{ kind: 'ready', contentVersion: OLD }], answer: weak });
       const reading = await first.read();
       expect(reading.portions.find((portion) => portion.name === 'guide')?.etag).toBe(
         `W/${etagOf('guide')}`,
       );
       const copies = createFakeCopyStore({
         format: 1,
         version: OLD,
         confirmedAt: COPY_DATE,
         portions: Object.fromEntries(
           reading.portions.map((p) => [p.name, { etag: p.etag, data: p.data }]),
         ),
       });
       const second = setup({ copies, answer: (name) => notModified(name) });
       await second.read();
       expect(
         second.api.calls.find((call) => call.path === '/api/guide')?.headers['If-None-Match'],
       ).toBe(`W/${etagOf('guide')}`);
     });

     it('repeats the session and the round when a Content-Version differs, and publishes one version', async () => {
       const { api, readSession, read } = setup({
         sessions: [
           { kind: 'ready', contentVersion: VERSION },
           { kind: 'ready', contentVersion: NEXT },
         ],
         answer: (name) => served(name, NEXT),
       });
       const reading = await read();
       expect(readSession).toHaveBeenCalledTimes(2);
       expect(api.calls).toHaveLength(34);
       expect(reading.version).toBe(NEXT);
       expect(reading.portions.every((portion) => portion.version === NEXT)).toBe(true);
     });

     it('gives up after three rounds of a moving version: version, or the copy', async () => {
       const moving = {
         sessions: [{ kind: 'ready', contentVersion: VERSION }] as const,
         answer: (name: PortionName) => served(name, NEXT),
       };
       const withoutCopy = setup(moving);
       expect((await failureOf(withoutCopy.read())).kind).toBe('version');
       expect(withoutCopy.readSession).toHaveBeenCalledTimes(3);
       expect(withoutCopy.api.calls).toHaveLength(51);
       const withCopy = setup({ ...moving, copies: createFakeCopyStore(storedCopy(OLD)) });
       expect((await withCopy.read()).origin).toBe('offline-copy');
     });

     it('waits a Retry-After that fits and repeats only that request', async () => {
       const { api, read } = setup({
         answer: (name, _call, count) =>
           name === 'guide' && count === 1
             ? { status: 429, body: '{}', headers: { 'Retry-After': '2' } }
             : served(name),
       });
       let reading: ContentReading | undefined;
       void read().then((value) => {
         reading = value;
       });
       await vi.advanceTimersByTimeAsync(1_999);
       expect(reading).toBeUndefined();
       await vi.advanceTimersByTimeAsync(1);
       expect(reading?.origin).toBe('server');
       expect(api.calls).toHaveLength(18);
     });

     it('fails at once with status when the Retry-After does not fit, like the 60 s of content_not_imported', async () => {
       const { api, read } = setup({
         remainingMs: () => 12_000,
         answer: (name) =>
           name === 'lab.rust'
             ? { status: 503, body: '{}', headers: { 'Retry-After': '60' } }
             : served(name),
       });
       expect((await failureOf(read())).kind).toBe('status');
       expect(api.calls).toHaveLength(17);
     });

     it('asks for the access once on a 401, then repeats the session and the round', async () => {
       const { api, readSession, requestAccess, read } = setup({
         answer: (name, _call, count) =>
           name === 'guide' && count === 1 ? { status: 401, body: '{}' } : served(name),
       });
       expect((await read()).origin).toBe('server');
       expect(requestAccess).toHaveBeenCalledOnce();
       expect(readSession).toHaveBeenCalledTimes(2);
       expect(api.calls).toHaveLength(34);
     });

     it('fails with status on a second 401 in the same attempt', async () => {
       const { requestAccess, read } = setup({
         answer: (name) => (name === 'guide' ? { status: 401, body: '{}' } : served(name)),
       });
       const failure = await failureOf(read());
       expect(failure.kind).toBe('status');
       expect(requestAccess).toHaveBeenCalledOnce();
     });

     it('fails with access on a 403 and never uses the copy', async () => {
       const { read } = setup({
         copies: createFakeCopyStore(storedCopy(OLD)),
         answer: (name) => (name === 'guide' ? { status: 403, body: '{}' } : served(name)),
       });
       expect((await failureOf(read())).kind).toBe('access');
     });

     it('asks no portion while the session has no content (contentVersion: null)', async () => {
       const { api, read } = setup({ sessions: [{ kind: 'ready', contentVersion: null }] });
       expect((await failureOf(read())).kind).toBe('status');
       expect(api.calls).toHaveLength(0);
     });

     const modes: readonly {
       readonly mode: string;
       readonly kind: ContentFailureKind;
       readonly sessions?: readonly SessionRead[];
       readonly answer?: (name: PortionName) => FakeAnswer;
     }[] = [
       {
         mode: 'the session does not answer',
         kind: 'network',
         sessions: [{ kind: 'unreachable', failure: 'network' }],
       },
       {
         mode: 'the session outlasts the budget',
         kind: 'timeout',
         sessions: [{ kind: 'unreachable', failure: 'timeout' }],
       },
       {
         mode: 'a 429 of the session does not fit',
         kind: 'status',
         sessions: [{ kind: 'unreachable', failure: 'status' }],
       },
       {
         mode: 'nothing was imported',
         kind: 'status',
         sessions: [{ kind: 'ready', contentVersion: null }],
       },
       {
         mode: 'a portion does not arrive',
         kind: 'network',
         answer: (name) => (name === 'atlas.go' ? 'network-error' : served(name)),
       },
       {
         mode: 'a portion answers 500',
         kind: 'status',
         answer: (name) => (name === 'guide' ? { status: 500, body: '' } : served(name)),
       },
       {
         mode: 'a 503 does not fit',
         kind: 'status',
         answer: (name) =>
           name === 'guide'
             ? { status: 503, body: '{}', headers: { 'Retry-After': '60' } }
             : served(name),
       },
       {
         mode: 'a body is not JSON',
         kind: 'body',
         answer: (name) =>
           name === 'guide'
             ? { status: 200, body: '<html>', headers: { ETag: '"x"', 'Content-Version': VERSION } }
             : served(name),
       },
       {
         mode: 'a portion has another shape',
         kind: 'shape',
         answer: (name) =>
           name === 'quests.rust'
             ? { status: 200, body: '{}', headers: { ETag: '"x"', 'Content-Version': VERSION } }
             : served(name),
       },
     ];

     it.each(modes)('without the server ($mode) hands the copy with its own date', async (mode) => {
       const { read } = setup({ ...mode, copies: createFakeCopyStore(storedCopy(OLD)) });
       const reading = await read();
       expect(reading.origin).toBe('offline-copy');
       expect(reading.version).toBe(OLD);
       expect(reading.confirmedAt).toBe(COPY_DATE);
     });

     it.each(modes)('without the server ($mode) and without a copy fails with $kind', async (mode) => {
       const { read } = setup(mode);
       expect((await failureOf(read())).kind).toBe(mode.kind);
     });

     it('does not use the copy without the server when the URL brought a token', async () => {
       const { read } = setup({
         sessions: [{ kind: 'unreachable', failure: 'network' }],
         copies: createFakeCopyStore(storedCopy(OLD)),
         mayUseCopy: false,
       });
       expect((await failureOf(read())).kind).toBe('network');
     });

     it('discards and clears a stored copy that is not usable', async () => {
       const copies = createFakeCopyStore({ ...storedCopy(OLD), format: 0 });
       const { read } = setup({ sessions: [{ kind: 'unreachable', failure: 'network' }], copies });
       expect((await failureOf(read())).kind).toBe('network');
       expect(copies.events).toEqual(['read', 'clear']);
     });

     it('fails with timeout when the attempt aborts a request that hangs', async () => {
       const controller = new AbortController();
       const { read } = setup({ answer: (name) => (name === 'guide' ? 'hang' : served(name)) });
       const failure = failureOf(read(controller.signal));
       await vi.advanceTimersByTimeAsync(0);
       controller.abort();
       expect((await failure).kind).toBe('timeout');
     });
   });
   ```

4. **`fake-indexed-db.ts`,** un `IDBFactory` chico con el orden de eventos de MDN:
   - `open` dispara `upgradeneeded` la primera vez y después `success`;
   - la transacción dispara `complete` después de su pedido, o `abort`.

   Sólo conoce lo que usa el almacén:

   ```ts
   export type OpenBehavior = 'answer' | 'error' | 'blocked' | 'silent';

   export interface FakeIndexedDb {
     readonly factory: IDBFactory;
     readonly records: Map<string, unknown>;
     readonly upgrades: string[];
     readonly counts: { opened: number; closed: number };
     failWrites: boolean;
   }

   interface Handlers {
     onsuccess: (() => void) | null;
     onerror: (() => void) | null;
     onblocked: (() => void) | null;
     onupgradeneeded: (() => void) | null;
   }

   interface FakeTransaction {
     oncomplete: (() => void) | null;
     onabort: (() => void) | null;
   }

   export function createFakeIndexedDb(open: OpenBehavior = 'answer'): FakeIndexedDb {
     const stores = new Set<string>();
     const records = new Map<string, unknown>();
     const upgrades: string[] = [];
     const counts = { opened: 0, closed: 0 };

     const state = { failWrites: false };

     function transaction(mode: IDBTransactionMode) {
       const handlers: FakeTransaction = { oncomplete: null, onabort: null };
       const request = (run: () => unknown) => {
         const pending = { result: undefined as unknown };
         queueMicrotask(() => {
           if (mode === 'readwrite' && state.failWrites) {
             handlers.onabort?.();
             return;
           }
           pending.result = run();
           handlers.oncomplete?.();
         });
         return pending;
       };
       const objectStore = () => ({
         get: (key: string) => request(() => records.get(key)),
         put: (value: unknown, key: string) =>
           request(() => {
             records.set(key, structuredClone(value));
             return key;
           }),
         delete: (key: string) =>
           request(() => {
             records.delete(key);
             return undefined;
           }),
       });
       return Object.assign(handlers, { objectStore });
     }

     const database = {
       createObjectStore(name: string) {
         stores.add(name);
         upgrades.push(name);
       },
       transaction(name: string, mode: IDBTransactionMode) {
         if (!stores.has(name)) throw new DOMException('No such store', 'NotFoundError');
         return transaction(mode);
       },
       close() {
         counts.closed += 1;
       },
     };

     const factory = {
       open() {
         counts.opened += 1;
         const request: Handlers & { result: unknown } = {
           result: database,
           onsuccess: null,
           onerror: null,
           onblocked: null,
           onupgradeneeded: null,
         };
         queueMicrotask(() => {
           if (open === 'silent') return;
           if (open === 'error') return request.onerror?.();
           if (open === 'blocked') return request.onblocked?.();
           if (stores.size === 0) request.onupgradeneeded?.();
           request.onsuccess?.();
         });
         return request;
       },
     } as unknown as IDBFactory;

     return {
       factory,
       records,
       upgrades,
       counts,
       get failWrites() {
         return state.failWrites;
       },
       set failWrites(value: boolean) {
         state.failWrites = value;
       },
     };
   }
   ```

5. **`indexeddb-copy-store.spec.ts`.** Fija el caso 2 de la «Review Focus»:

   ```ts
   import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
   import type { ContentCopy } from './content-copy';
   import { createFakeIndexedDb, type OpenBehavior } from './fake-indexed-db';
   import { createIndexedDbCopyStore } from './indexeddb-copy-store';

   const LIMIT_MS = 3_000;

   const COPY = {
     format: 1,
     version: 'a'.repeat(32),
     confirmedAt: '2026-10-07T18:00:00.000Z',
     portions: {},
   } as unknown as ContentCopy;

   function storeOver(open: OpenBehavior = 'answer') {
     const fake = createFakeIndexedDb(open);
     const store = createIndexedDbCopyStore({ factory: () => fake.factory, limitMs: LIMIT_MS });
     return { fake, store };
   }

   describe('the copy store over IndexedDB', () => {
     beforeEach(() => {
       vi.useFakeTimers();
     });

     afterEach(() => {
       vi.useRealTimers();
     });

     it('writes the copy under one key, reads it back and clears it', async () => {
       const { fake, store } = storeOver();
       expect(await store.read()).toBeNull();
       expect(await store.write(COPY)).toBe(true);
       expect(fake.records.size).toBe(1);
       expect(await store.read()).toEqual(COPY);
       expect(await store.clear()).toBe(true);
       expect(await store.read()).toBeNull();
       expect(fake.upgrades).toEqual(['copia']);
       expect(fake.counts.closed).toBe(fake.counts.opened);
     });

     it('answers false and keeps the previous copy when a write aborts', async () => {
       const { fake, store } = storeOver();
       await store.write(COPY);
       fake.failWrites = true;
       expect(await store.write({ ...COPY, version: 'b'.repeat(32) })).toBe(false);
       expect(await store.clear()).toBe(false);
       fake.failWrites = false;
       expect(await store.read()).toEqual(COPY);
     });

     it.each(['error', 'blocked'] as const)(
       'settles with the fallback when opening ends in %s',
       async (open) => {
         const { store } = storeOver(open);
         expect(await store.read()).toBeNull();
         expect(await store.write(COPY)).toBe(false);
         expect(await store.clear()).toBe(false);
       },
     );

     it('settles at the limit when the database never answers', async () => {
       const { store } = storeOver('silent');
       let read: unknown = 'pending';
       void store.read().then((value) => {
         read = value;
       });
       await vi.advanceTimersByTimeAsync(LIMIT_MS - 1);
       expect(read).toBe('pending');
       await vi.advanceTimersByTimeAsync(1);
       expect(read).toBeNull();
     });

     it('settles with the fallback without IndexedDB, or when reaching it throws', async () => {
       const missing = createIndexedDbCopyStore({ factory: () => undefined, limitMs: LIMIT_MS });
       const blocked = createIndexedDbCopyStore({
         factory: () => {
           throw new DOMException('IndexedDB is blocked', 'SecurityError');
         },
         limitMs: LIMIT_MS,
       });
       expect(await missing.read()).toBeNull();
       expect(await missing.write(COPY)).toBe(false);
       expect(await blocked.read()).toBeNull();
       expect(await blocked.clear()).toBe(false);
     });
   });
   ```

6. **Correr** `npm run test:unit -- frontend/src/shared/api/content`. Las nuevas fallan con `not implemented`, y las de A2 (la fuente estática, el almacén del contenido y las porciones) siguen en verde.
7. **Commit:** `test(front): specs de la fuente de la API y del almacén de la copia, en rojo`.

### Tarea 1.6 · La fuente de la API y el almacén de la copia (T007, S)

**Archivos:** `api-content-source.ts`, `indexeddb-copy-store.ts`, `content-copies.ts` e `index.ts`, en `frontend/src/shared/api/content/`.

1. **`api-content-source.ts`.** En U1 devuelve `ApiContentSource`, que tiene la firma que `ContentSource` tendrá desde el corte:

   ```ts
   import { wait } from '../../lib/wait';
   import {
     readingOf,
     usableCopy,
     type ContentCopy,
     type ContentCopyStore,
     type CopiedPortion,
   } from './content-copy';
   import {
     ContentLoadError,
     type ContentFailureKind,
     type ContentReading,
     type ContentRequest,
     type ServedPortion,
   } from './content-source';
   import { PORTION_RESOURCES } from './portion-resources';
   import { findPortionProblem, type PortionName } from './portions';

   export type SessionRead =
     | { readonly kind: 'ready'; readonly contentVersion: string | null }
     | { readonly kind: 'unreachable'; readonly failure: 'network' | 'timeout' | 'status' };

   export interface ContentResponse {
     readonly status: number;
     readonly headers: { get(name: string): string | null };
     text(): Promise<string>;
   }

   export type ContentFetch = (input: string, init: RequestInit) => Promise<ContentResponse>;

   export interface ApiContentSourceOptions {
     readonly fetch: ContentFetch;
     readonly readSession: (request: ContentRequest) => Promise<SessionRead>;
     readonly requestAccess: () => Promise<void>;
     readonly copies: ContentCopyStore;
     readonly mayUseCopy: () => boolean;
     readonly remainingMs: () => number;
     readonly now: () => Date;
   }

   type PortionAnswer =
     | { readonly kind: 'portion'; readonly portion: ServedPortion }
     | { readonly kind: 'unauthorized' }
     | { readonly kind: 'forbidden' }
     | { readonly kind: 'failed'; readonly failure: ContentFailureKind };

   type Problem = Exclude<PortionAnswer, { kind: 'portion' }>;

   type RoundOutcome =
     | { readonly kind: 'complete'; readonly portions: readonly ServedPortion[] }
     | { readonly kind: 'version-changed' }
     | Problem;

   interface AttemptState {
     rounds: number;
     signedInAgain: boolean;
   }

   export const MAX_ROUNDS = 3;
   const OK = 200;
   const NOT_MODIFIED = 304;
   const UNAUTHORIZED = 401;
   const FORBIDDEN = 403;
   const WAIT_STATUSES = new Set([429, 503]);
   const PROBLEM_ORDER = ['unauthorized', 'forbidden', 'failed'] as const;

   function failed(failure: ContentFailureKind): PortionAnswer {
     return { kind: 'failed', failure };
   }

   function requestFor(copied: CopiedPortion | undefined, signal: AbortSignal): RequestInit {
     const headers: Record<string, string> = { Accept: 'application/json' };
     if (copied !== undefined) headers['If-None-Match'] = copied.etag;
     return { method: 'GET', credentials: 'same-origin', headers, signal };
   }

   function retryAfterMs(response: ContentResponse): number | null {
     if (!WAIT_STATUSES.has(response.status)) return null;
     const value = response.headers.get('Retry-After')?.trim() ?? '';
     return /^\d+$/.test(value) ? Number(value) * 1000 : null;
   }

   function notModifiedAnswer(
     name: PortionName,
     version: string | null,
     copied: CopiedPortion | undefined,
   ): PortionAnswer {
     if (copied === undefined || version === null) return failed('status');
     return { kind: 'portion', portion: { name, version, etag: copied.etag, data: copied.data } };
   }

   async function servedAnswer(
     name: PortionName,
     response: ContentResponse,
     version: string | null,
     signal: AbortSignal,
   ): Promise<PortionAnswer> {
     let data: unknown;
     try {
       data = JSON.parse(await response.text());
     } catch {
       return failed(signal.aborted ? 'timeout' : 'body');
     }
     const etag = response.headers.get('ETag');
     if (version === null || etag === null) return failed('body');
     if (findPortionProblem(name, data) !== null) return failed('shape');
     return { kind: 'portion', portion: { name, version, etag, data } };
   }

   async function answerOf(
     name: PortionName,
     response: ContentResponse,
     copied: CopiedPortion | undefined,
     signal: AbortSignal,
   ): Promise<PortionAnswer> {
     if (response.status === UNAUTHORIZED) return { kind: 'unauthorized' };
     if (response.status === FORBIDDEN) return { kind: 'forbidden' };
     const version = response.headers.get('Content-Version');
     if (response.status === NOT_MODIFIED) return notModifiedAnswer(name, version, copied);
     if (response.status !== OK) return failed('status');
     return servedAnswer(name, response, version, signal);
   }

   function firstProblem(answers: readonly PortionAnswer[]): Problem | null {
     for (const kind of PROBLEM_ORDER) {
       const answer = answers.find((item) => item.kind === kind);
       if (answer !== undefined && answer.kind !== 'portion') return answer;
     }
     return null;
   }

   export interface ApiContentSource {
     read(names: readonly PortionName[], request: ContentRequest): Promise<ContentReading>;
   }

   export function createApiContentSource(options: ApiContentSourceOptions): ApiContentSource {
     const stamp = (): string => options.now().toISOString();

     async function fetchPortion(
       name: PortionName,
       copied: CopiedPortion | undefined,
       signal: AbortSignal,
     ): Promise<PortionAnswer> {
       for (;;) {
         let response: ContentResponse;
         try {
           response = await options.fetch(PORTION_RESOURCES[name], requestFor(copied, signal));
         } catch {
           return failed(signal.aborted ? 'timeout' : 'network');
         }
         const waitMs = retryAfterMs(response);
         if (waitMs === null) return answerOf(name, response, copied, signal);
         if (waitMs > options.remainingMs()) return failed('status');
         await wait(waitMs, signal);
       }
     }

     async function fetchRound(
       names: readonly PortionName[],
       version: string,
       copy: ContentCopy | null,
       signal: AbortSignal,
     ): Promise<RoundOutcome> {
       const answers = await Promise.all(
         names.map((name) => fetchPortion(name, copy?.portions[name], signal)),
       );
       const problem = firstProblem(answers);
       if (problem !== null) return problem;
       const portions = answers.flatMap((answer) =>
         answer.kind === 'portion' ? [answer.portion] : [],
       );
       if (portions.some((portion) => portion.version !== version)) return { kind: 'version-changed' };
       return { kind: 'complete', portions };
     }

     async function readStoredCopy(): Promise<ContentCopy | null> {
       const record = await options.copies.read();
       if (record === null) return null;
       const copy = usableCopy(record);
       if (copy === null) await options.copies.clear();
       return copy;
     }

     function fallBack(copy: ContentCopy | null, failure: ContentFailureKind): ContentReading {
       if (copy === null || !options.mayUseCopy()) throw new ContentLoadError(failure);
       return readingOf(copy, 'offline-copy', copy.confirmedAt);
     }

     async function settleRound(
       round: RoundOutcome,
       version: string,
       copy: ContentCopy | null,
       state: AttemptState,
     ): Promise<ContentReading | null> {
       switch (round.kind) {
         case 'complete':
           await options.copies.clear();
           return { version, origin: 'server', confirmedAt: stamp(), portions: round.portions };
         case 'unauthorized':
           if (state.signedInAgain) throw new ContentLoadError('status', '401');
           state.signedInAgain = true;
           await options.requestAccess();
           return null;
         case 'forbidden':
           throw new ContentLoadError('access', '403');
         case 'failed':
           return fallBack(copy, round.failure);
         case 'version-changed':
           state.rounds += 1;
           return state.rounds < MAX_ROUNDS ? null : fallBack(copy, 'version');
       }
     }

     return {
       async read(names, { signal }) {
         const storedCopy = readStoredCopy();
         const state: AttemptState = { rounds: 0, signedInAgain: false };
         for (;;) {
           const session = await options.readSession({ signal });
           const copy = await storedCopy;
           if (session.kind === 'unreachable') return fallBack(copy, session.failure);
           if (session.contentVersion === null) return fallBack(copy, 'status');
           if (copy?.version === session.contentVersion)
             return readingOf(copy, 'confirmed-copy', stamp());
           const round = await fetchRound(names, session.contentVersion, copy, signal);
           const reading = await settleRound(round, session.contentVersion, copy, state);
           if (reading !== null) return reading;
         }
       },
     };
   }
   ```

2. **`indexeddb-copy-store.ts`.** El comentario de `settleWithin` es la referencia puntual a FR-019 y al arnés de `boot-check`:

   ```ts
   import type { ContentCopy, ContentCopyStore } from './content-copy';

   export const COPY_DATABASE = 'taller-contenido';
   export const COPY_DATABASE_VERSION = 1;
   export const COPY_OBJECT_STORE = 'copia';
   export const COPY_KEY = 'ultima';

   export interface IndexedDbCopyStoreOptions {
     readonly factory: () => IDBFactory | undefined;
     readonly limitMs: number;
   }

   // Every operation settles: with the fallback when the store fails, is missing or does not answer
   // within limitMs (FR-019). Its timer does nothing once the operation settled: the harness of
   // boot-check runs every queued timer on flush() and never cancels one.
   function settleWithin<T>(
     limitMs: number,
     fallback: T,
     work: (finish: (value: T) => void) => void,
   ): Promise<T> {
     return new Promise((resolve) => {
       let settled = false;
       const finish = (value: T): void => {
         if (settled) return;
         settled = true;
         resolve(value);
       };
       setTimeout(() => finish(fallback), limitMs);
       try {
         work(finish);
       } catch {
         finish(fallback);
       }
     });
   }

   export function createIndexedDbCopyStore({
     factory,
     limitMs,
   }: IndexedDbCopyStoreOptions): ContentCopyStore {
     function run<T>(
       mode: IDBTransactionMode,
       operate: (store: IDBObjectStore) => IDBRequest,
       resultOf: (request: IDBRequest) => T,
       fallback: T,
     ): Promise<T> {
       return settleWithin(limitMs, fallback, (finish) => {
         const indexedDb = factory();
         if (indexedDb === undefined) {
           finish(fallback);
           return;
         }
         const opening = indexedDb.open(COPY_DATABASE, COPY_DATABASE_VERSION);
         opening.onupgradeneeded = () => {
           opening.result.createObjectStore(COPY_OBJECT_STORE);
         };
         opening.onerror = () => finish(fallback);
         opening.onblocked = () => finish(fallback);
         opening.onsuccess = () => {
           const database = opening.result;
           try {
             const transaction = database.transaction(COPY_OBJECT_STORE, mode);
             const request = operate(transaction.objectStore(COPY_OBJECT_STORE));
             transaction.oncomplete = () => {
               database.close();
               finish(resultOf(request));
             };
             transaction.onabort = () => {
               database.close();
               finish(fallback);
             };
           } catch {
             database.close();
             finish(fallback);
           }
         };
       });
     }

     return {
       read: () =>
         run<unknown>(
           'readonly',
           (store) => store.get(COPY_KEY),
           (request) => request.result ?? null,
           null,
         ),
       write: (copy: ContentCopy) =>
         run(
           'readwrite',
           (store) => store.put(copy, COPY_KEY),
           () => true,
           false,
         ),
       clear: () =>
         run(
           'readwrite',
           (store) => store.delete(COPY_KEY),
           () => true,
           false,
         ),
     };
   }
   ```

3. **`content-copies.ts`:**

   ```ts
   import { createIndexedDbCopyStore } from './indexeddb-copy-store';

   const COPY_LIMIT_MS = 3_000;

   export const contentCopies = createIndexedDbCopyStore({
     factory: () => globalThis.indexedDB,
     limitMs: COPY_LIMIT_MS,
   });

   export async function forgetContentCopy(): Promise<void> {
     await contentCopies.clear();
   }
   ```

4. **`index.ts`.** Suma lo nuevo y conserva la fuente estática hasta el corte:

   ```ts
   export { storeContent, readStoredContent } from './content-holder';
   export { ContentLoadError } from './content-source';
   export type {
     ContentFailureKind,
     ContentReading,
     ContentRequest,
     ContentSource,
     ReadingOrigin,
     ServedPortion,
     SourcePortion,
   } from './content-source';
   export { PORTION_NAMES, SYSTEMS_DOMAINS, findPortionProblem } from './portions';
   export type { PortionName, PortionProblem, SystemsDomain } from './portions';
   export { PORTION_RESOURCES } from './portion-resources';
   export { COPY_FORMAT, copyOf, readingOf, usableCopy } from './content-copy';
   export type { ContentCopy, ContentCopyStore, CopiedPortion } from './content-copy';
   export { createApiContentSource, MAX_ROUNDS } from './api-content-source';
   export type {
     ApiContentSource,
     ApiContentSourceOptions,
     ContentFetch,
     ContentResponse,
     SessionRead,
   } from './api-content-source';
   export { contentCopies, forgetContentCopy } from './content-copies';
   export { createStaticContentSource } from './static-content-source';
   export type { StaticContentSourceOptions } from './static-content-source';
   ```

5. **Correr:**
   - `npm run test:unit -- frontend/src/shared/api/content`, en verde;
   - `npm run typecheck`, `npm run lint` y `node qa/seams-guard-check.ts`;
   - `npm run build`. `dist/index.html` no cambia de largo, porque nadie importa lo nuevo.
6. **Commit:** `feat(front): la fuente de la API con su copia en IndexedDB, todavía sin cablear`.

### Tarea 1.7 · La compuerta de U1 (T008, K)

La compuerta de 0.2, con estos puntos propios:

- **`html.length` igual al de T001,** y la red E2E sin cambios.
- **Ningún archivo fuera de `shared/lib` y `shared/api/content` cambió.** Excepción: `app/boot/attempt-budget.ts`, `session-reader.ts` y `copy-notice.ts`, que son nuevos.
- **El PR:** `feat(front): API content source, IndexedDB copy, attempt budget and session reader, not wired yet (A3 U1)`, contra `a3/base`.

**Reversión de U1:** se revierten T007, T006, T005, T004, T003 y T002, en ese orden.

## 2. U2 · El corte (onda 3: G, Q, E y K; onda 4: K)

**Cubre (en unidad):**

- FR-001 a FR-004, FR-010, FR-013, FR-015, FR-020, FR-021, FR-023 a FR-031 y FR-035 a FR-041 en el arranque real, y FR-043;
- SC-001 a SC-006, SC-008 y SC-009.

**Entrega:**

- el arranque lee la API, guarda y usa la copia, y muestra el aviso;
- el archivo estático sale del build, del servidor de desarrollo y de los checks;
- los checks y los E2E de A2 y de F11a, adaptados;
- los E2E de A3 y la documentación.

**Es un solo PR (FR-031).** Mientras dura, cada dueño trabaja en su rama. Los checks y los E2E escritos antes de que G entregue están en rojo contra la fuente estática, y pasan a verde sobre la rama de G (S2).

### Tarea 2.1 · Las specs del corte en el front, en rojo (T009, G)

**Archivos:** las specs de `frontend/src/app/boot/`:

- `content-gate.spec.ts`, `gate-view.spec.ts`, `session-gate.spec.ts` y `session-view.spec.ts`;
- `frontend/src/features/sign-in/model/sign-out.spec.ts`.

**Consume:** de U1, `createAttemptBudget`, `ServedPortion` y `ContentReading`; de F11a, los tipos de su contrato.

**Produce:** las pruebas que piden las firmas nuevas de `content-gate.ts`, `session-gate.ts`, `session-view.ts` y `sign-out.ts` del contrato.

1. **`content-gate.spec.ts`,** adaptada:
   - **los casos de A2 conservan sus valores esperados.** Cambia sólo el arnés: la fuente simulada envuelve las porciones en una lectura de la versión `v1`, y el presupuesto se empieza en `setup`;
   - **se suman cuatro casos:**
     - `onPublished`, una vez y después del evento;
     - el presupuesto que dejó la etapa de sesión, que es el caso 1 de la «Review Focus»;
     - el ingreso en pausa;
     - el presupuesto entero en cada «Reintentar».

   ```ts
   import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
   import curriculum from '../../../../build/curriculum.json';
   import type {
     ContentReading,
     ContentRequest,
     ContentSource,
     PortionName,
     ServedPortion,
   } from '../../shared/api/content';
   import { createAttemptBudget, type AttemptBudget } from './attempt-budget';
   import type { ContentGateOptions, GateView } from './content-gate';

   const VERSION = 'v1';
   const TIMEOUT_MS = 20_000;
   const LOADING_DELAY_MS = 400;
   const CONFIRMED_AT = '2026-10-28T15:00:00.000Z';

   function realPortion(name: PortionName): unknown {
     const [group = '', slice] = name.split('.');
     const value = (curriculum as Record<string, unknown>)[group];
     return slice === undefined ? value : (value as Record<string, unknown>)[slice];
   }

   async function load() {
     const api = await import('../../shared/api/content');
     const gate = await import('./content-gate');
     const content = await import('../content/content');
     const realPortions: ServedPortion[] = api.PORTION_NAMES.map((name) => ({
       name,
       version: VERSION,
       etag: `"${name}"`,
       data: realPortion(name),
     }));
     return { ...api, ...gate, ...content, realPortions };
   }

   function fakeView() {
     return {
       showLoading: vi.fn<GateView['showLoading']>(),
       showFailure: vi.fn<GateView['showFailure']>(),
       clear: vi.fn<GateView['clear']>(),
     };
   }

   function readingOf(portions: readonly ServedPortion[]): ContentReading {
     return { version: VERSION, origin: 'server', confirmedAt: CONFIRMED_AT, portions };
   }

   function sourceReturning(read: (request: ContentRequest) => Promise<readonly ServedPortion[]>) {
     const source = {
       read: vi.fn(async (_names: readonly PortionName[], request: ContentRequest) =>
         readingOf(await read(request)),
       ),
     };
     return source satisfies ContentSource;
   }

   function startedBudget(): AttemptBudget {
     const budget = createAttemptBudget({ totalMs: TIMEOUT_MS, now: () => Date.now() });
     budget.begin();
     return budget;
   }

   function deferred<T>() {
     let resolve: (value: T) => void = () => {};
     let reject: (reason: unknown) => void = () => {};
     const promise = new Promise<T>((onResolve, onReject) => {
       resolve = onResolve;
       reject = onReject;
     });
     return { promise, resolve, reject };
   }

   function whenAborted(request: ContentRequest): Promise<never> {
     return new Promise((_resolve, reject) => {
       request.signal.addEventListener('abort', () => reject(request.signal.reason));
     });
   }

   async function flushMicrotasks() {
     await vi.advanceTimersByTimeAsync(0);
   }

   describe('content gate', () => {
     let published: CustomEvent[];

     beforeEach(() => {
       vi.resetModules();
       vi.useFakeTimers();
       const fakeWindow = new EventTarget();
       published = [];
       fakeWindow.addEventListener('taller:content-published', (event) => {
         published.push(event as CustomEvent);
       });
       vi.stubGlobal('window', fakeWindow);
     });

     afterEach(() => {
       vi.useRealTimers();
       vi.unstubAllGlobals();
     });

     async function setup(
       read: (request: ContentRequest, portions: ServedPortion[]) => Promise<readonly ServedPortion[]>,
       overrides: Partial<ContentGateOptions> = {},
     ) {
       const loaded = await load();
       const view = fakeView();
       const source = sourceReturning((request) => read(request, loaded.realPortions));
       const onPublished = vi.fn<ContentGateOptions['onPublished']>();
       const budget = overrides.budget ?? startedBudget();
       const gate = loaded.createContentGate({
         source,
         view,
         budget,
         loadingDelayMs: LOADING_DELAY_MS,
         onPublished,
         ...overrides,
       });
       return { ...loaded, view, source, gate, onPublished, budget };
     }

     it('publishes everything at once, clears the view and announces it once', async () => {
       const { gate, view, getContent } = await setup(async (_request, portions) => portions);
       await gate.run();
       const content = getContent();
       expect(content.lab.rust).toBe(realPortion('lab.rust'));
       expect(view.clear).toHaveBeenCalledTimes(1);
       expect(published).toHaveLength(1);
       expect(published[0]?.detail).toBe(content);
     });

     it('never shows the loading state when the content arrives fast', async () => {
       const { gate, view } = await setup(async (_request, portions) => portions);
       await gate.run();
       await vi.advanceTimersByTimeAsync(TIMEOUT_MS * 2);
       expect(view.showLoading).not.toHaveBeenCalled();
     });

     it('shows the loading state at 400 ms and not before', async () => {
       const pending = deferred<readonly ServedPortion[]>();
       const { gate, view } = await setup(() => pending.promise);
       void gate.run();
       await vi.advanceTimersByTimeAsync(LOADING_DELAY_MS - 1);
       expect(view.showLoading).not.toHaveBeenCalled();
       await vi.advanceTimersByTimeAsync(1);
       expect(view.showLoading).toHaveBeenCalledTimes(1);
     });

     it('aborts a hanging request at the cap, fails with timeout and publishes nothing', async () => {
       let signal: AbortSignal | undefined;
       const { gate, view, getContent } = await setup((request) => {
         signal = request.signal;
         return whenAborted(request);
       });
       void gate.run();
       await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
       expect(signal?.aborted).toBe(false);
       expect(view.showFailure).not.toHaveBeenCalled();
       await vi.advanceTimersByTimeAsync(1);
       expect(signal?.aborted).toBe(true);
       expect(view.showFailure.mock.calls[0]?.[0].kind).toBe('timeout');
       expect(published).toHaveLength(0);
       expect(() => getContent()).toThrow();
     });

     it('retries with the loading state at once, ignores a second click and resumes the boot', async () => {
       const retryRead = deferred<readonly ServedPortion[]>();
       let calls = 0;
       const { gate, view, source, ContentLoadError, realPortions, getContent } = await setup(() => {
         calls += 1;
         if (calls === 1) return Promise.reject(new Error('offline'));
         return retryRead.promise;
       });
       let resumed = false;
       void gate.run().then(() => {
         resumed = true;
       });
       await flushMicrotasks();
       expect(view.showFailure).toHaveBeenCalledTimes(1);
       expect(view.showFailure.mock.calls[0]?.[0]).toBeInstanceOf(ContentLoadError);
       expect(view.showFailure.mock.calls[0]?.[0].kind).toBe('network');
       expect(view.showLoading).not.toHaveBeenCalled();

       const retry = view.showFailure.mock.calls[0]?.[1] ?? (() => {});
       retry();
       expect(view.showLoading).toHaveBeenCalledTimes(1);
       retry();
       await flushMicrotasks();
       expect(source.read).toHaveBeenCalledTimes(2);
       expect(resumed).toBe(false);

       retryRead.resolve(realPortions);
       await flushMicrotasks();
       expect(resumed).toBe(true);
       expect(source.read).toHaveBeenCalledTimes(2);
       expect(getContent().guide).toBe(realPortion('guide'));
       expect(published).toHaveLength(1);
     });

     it('fails with version and publishes nothing when the source answers another version', async () => {
       const { gate, view, getContent } = await setup(async (_request, portions) =>
         portions.map((portion) => ({ ...portion, version: 'other' })),
       );
       void gate.run();
       await flushMicrotasks();
       expect(view.showFailure.mock.calls[0]?.[0].kind).toBe('version');
       expect(published).toHaveLength(0);
       expect(() => getContent()).toThrow();
     });

     it('fails with missing when a portion is not in the answer', async () => {
       const { gate, view, getContent } = await setup(async (_request, portions) =>
         portions.filter((portion) => portion.name !== 'atlas.go'),
       );
       void gate.run();
       await flushMicrotasks();
       const failure = view.showFailure.mock.calls[0]?.[0];
       expect(failure?.kind).toBe('missing');
       expect(failure?.detail).toBe('atlas.go');
       expect(() => getContent()).toThrow();
     });

     it('fails with shape when a portion has another form', async () => {
       const { gate, view, getContent } = await setup(async (_request, portions) =>
         portions.map((portion) =>
           portion.name === 'quests.go' ? { ...portion, data: [] } : portion,
         ),
       );
       void gate.run();
       await flushMicrotasks();
       const failure = view.showFailure.mock.calls[0]?.[0];
       expect(failure?.kind).toBe('shape');
       expect(failure?.detail).toBe('quests.go');
       expect(published).toHaveLength(0);
       expect(() => getContent()).toThrow();
     });

     it('leaves its timers harmless after success even if clearTimeout does nothing', async () => {
       vi.stubGlobal('clearTimeout', () => {});
       let signal: AbortSignal | undefined;
       const { gate, view } = await setup(async (request, portions) => {
         signal = request.signal;
         return portions;
       });
       await gate.run();
       await vi.advanceTimersByTimeAsync(TIMEOUT_MS * 2);
       expect(view.showLoading).not.toHaveBeenCalled();
       expect(signal?.aborted).toBe(false);
     });

     it('hands the reading to onPublished once, after the publication event', async () => {
       const order: string[] = [];
       window.addEventListener('taller:content-published', () => order.push('published'));
       const { gate, onPublished } = await setup(async (_request, portions) => portions);
       onPublished.mockImplementation(() => {
         order.push('onPublished');
       });
       await gate.run();
       expect(onPublished).toHaveBeenCalledOnce();
       expect(onPublished.mock.calls[0]?.[0].version).toBe(VERSION);
       expect(order).toEqual(['published', 'onPublished']);
     });

     it('keeps the budget that the session stage started: with 15 s spent, a hanging read fails 5 s later', async () => {
       const budget = startedBudget();
       await vi.advanceTimersByTimeAsync(15_000);
       const { gate, view } = await setup((request) => whenAborted(request), { budget });
       void gate.run();
       await vi.advanceTimersByTimeAsync(4_999);
       expect(view.showFailure).not.toHaveBeenCalled();
       await vi.advanceTimersByTimeAsync(1);
       expect(view.showFailure.mock.calls[0]?.[0].kind).toBe('timeout');
     });

     it('does not count a sign-in that the source waits inside the budget pause', async () => {
       const budget = startedBudget();
       const { gate, view } = await setup(
         async (_request, portions) => {
           await budget.pausedWhile(() => new Promise((resolve) => setTimeout(resolve, 60_000)));
           return portions;
         },
         { budget },
       );
       void gate.run();
       await vi.advanceTimersByTimeAsync(60_000);
       expect(view.showFailure).not.toHaveBeenCalled();
       expect(published).toHaveLength(1);
     });

     it('starts a whole budget again for a retry', async () => {
       let calls = 0;
       const { gate, view, budget } = await setup((request) => {
         calls += 1;
         if (calls === 1) return Promise.reject(new Error('offline'));
         return whenAborted(request);
       });
       void gate.run();
       await vi.advanceTimersByTimeAsync(15_000);
       view.showFailure.mock.calls[0]?.[1]();
       expect(budget.remainingMs()).toBe(TIMEOUT_MS);
       await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
       expect(view.showFailure).toHaveBeenCalledTimes(1);
       await vi.advanceTimersByTimeAsync(1);
       expect(view.showFailure.mock.calls[1]?.[0].kind).toBe('timeout');
     });
   });
   ```

2. **`gate-view.spec.ts`,** con los textos de FR-028. El caso de `version` cambia su valor esperado, porque FR-028 cambia el texto:

   ```ts
   import { describe, expect, it } from 'vitest';
   import type { ContentFailureKind } from '../../shared/api/content';
   import { failureMarkup } from './gate-view';

   const GENERAL_KINDS: ContentFailureKind[] = [
     'network',
     'status',
     'timeout',
     'body',
     'missing',
     'shape',
   ];
   const VERSION_TEXT =
     'El contenido del taller se está actualizando. Tu progreso sigue guardado en este navegador. Probá de nuevo en unos segundos.';
   const ACCESS_TEXT =
     'Tu cuenta no puede ver el contenido del taller. Si creés que es un error, consultá con quien administra el taller.';

   describe('failureMarkup', () => {
     it('says the content is being updated for a version failure', () => {
       expect(failureMarkup('version')).toContain(VERSION_TEXT);
     });

     it('says the account cannot see the content for an access failure', () => {
       expect(failureMarkup('access')).toContain(ACCESS_TEXT);
     });

     it.each(GENERAL_KINDS)('gives the general message for a %s failure', (kind) => {
       const markup = failureMarkup(kind);
       expect(markup).toContain('Revisá tu conexión');
       expect(markup).not.toContain('se está actualizando');
     });

     it.each([...GENERAL_KINDS, 'version'] as ContentFailureKind[])(
       'reassures about saved progress and offers a retry for %s',
       (kind) => {
         const markup = failureMarkup(kind);
         expect(markup).toContain('Tu progreso sigue guardado en este navegador');
         expect(markup).toContain(`data-failure="${kind}"`);
         expect(markup).toContain('role="alert"');
         expect(markup).toContain('id="content-retry"');
         expect(markup).not.toContain('style=');
       },
     );

     it('offers a retry for an access failure too', () => {
       const markup = failureMarkup('access');
       expect(markup).toContain('data-failure="access"');
       expect(markup).toContain('id="content-retry"');
     });
   });
   ```

3. **`session-gate.spec.ts`,** reescrita según la tabla de «Compatibilidad» (D1). Los casos de F11a que siguen valiendo conservan su intención. Los de la falla y el reintento pasan a «deja lo que leyó»:

   ```ts
   import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
   import type { PublishedUser, SessionOutcome, SessionSnapshot } from '../../entities/session';
   import type { AccessToken, RequestSignIn } from '../../features/sign-in';
   import { createAttemptBudget } from './attempt-budget';
   import { createSessionGate, type SessionGateOptions } from './session-gate';
   import type { SessionView } from './session-view';

   const ANA: PublishedUser = {
     id: 41,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     privacyAccepted: true,
   };
   const INVITATION: AccessToken = { kind: 'invitation', token: 'k3J8' };

   function snapshotOf(user: PublishedUser | null): SessionSnapshot {
     return { user, features: { passwordReset: false, registration: false }, contentVersion: 'v1' };
   }

   function sessionOf(user: PublishedUser | null): SessionOutcome {
     return { kind: 'session', snapshot: snapshotOf(user) };
   }

   function deferred<T>() {
     let resolve: (value: T) => void = () => {};
     const promise = new Promise<T>((onResolve) => {
       resolve = onResolve;
     });
     return { promise, resolve };
   }

   function setup(
     outcomes: readonly (SessionOutcome | Promise<SessionOutcome>)[],
     overrides: Partial<SessionGateOptions> = {},
   ) {
     let index = 0;
     const fetchSession = vi.fn(async () => {
       const next = outcomes[Math.min(index, outcomes.length - 1)];
       index += 1;
       if (next === undefined) throw new Error('no outcome');
       return next;
     });
     const signIn = deferred<PublishedUser>();
     const view = {
       showLoading: vi.fn<SessionView['showLoading']>(),
       clear: vi.fn<SessionView['clear']>(),
     };
     const budget = createAttemptBudget({ totalMs: 20_000, now: () => Date.now() });
     const options: SessionGateOptions = {
       fetchSession,
       storeSession: vi.fn(),
       takeAccessToken: vi.fn(() => null),
       requestSignIn: vi.fn<RequestSignIn>(() => signIn.promise),
       forgetContentCopy: vi.fn(async () => {}),
       onReady: vi.fn(),
       view,
       budget,
       loadingDelayMs: 400,
       ...overrides,
     };
     const stage = createSessionGate(options);
     let resolved = false;
     const finished = stage.run().then(() => {
       resolved = true;
     });
     return { options, view, fetchSession, signIn, stage, finished, isResolved: () => resolved };
   }

   const flush = () => vi.advanceTimersByTimeAsync(0);

   describe('the session stage', () => {
     beforeEach(() => {
       vi.useFakeTimers();
     });

     afterEach(() => {
       vi.useRealTimers();
     });

     it('asks for the session once, resolves when the account is ready and leaves its read once', async () => {
       const { options, fetchSession, stage, finished } = setup([sessionOf(ANA)]);
       await finished;
       expect(fetchSession).toHaveBeenCalledOnce();
       expect(options.storeSession).toHaveBeenCalledWith(snapshotOf(ANA));
       expect(options.onReady).toHaveBeenCalledOnce();
       expect(options.requestSignIn).not.toHaveBeenCalled();
       expect(stage.takeRead()).toEqual({ kind: 'ready', contentVersion: 'v1' });
       expect(stage.takeRead()).toBeNull();
     });

     it('leaves no timer acting after a fast answer', async () => {
       const { view, finished } = setup([sessionOf(ANA)]);
       await finished;
       await vi.advanceTimersByTimeAsync(30_000);
       expect(view.showLoading).not.toHaveBeenCalled();
     });

     it('says it is connecting after 400 ms', async () => {
       const pending = deferred<SessionOutcome>();
       const { view } = setup([pending.promise]);
       await vi.advanceTimersByTimeAsync(399);
       expect(view.showLoading).not.toHaveBeenCalled();
       await vi.advanceTimersByTimeAsync(1);
       expect(view.showLoading).toHaveBeenCalledOnce();
     });

     it('without an account forgets the copy, asks for the sign-in as a page and asks for the session once more', async () => {
       const { options, fetchSession, signIn, finished, isResolved } = setup([
         sessionOf(null),
         sessionOf(ANA),
       ]);
       await flush();
       expect(options.forgetContentCopy).toHaveBeenCalledOnce();
       expect(options.requestSignIn).toHaveBeenCalledWith({
         presentation: 'page',
         reason: 'boot',
         token: null,
       });
       expect(isResolved()).toBe(false);
       signIn.resolve(ANA);
       await finished;
       expect(fetchSession).toHaveBeenCalledTimes(2);
       expect(options.onReady).toHaveBeenCalledOnce();
     });

     it('fires no cap and shows no wait while a sign-in lasts longer than the cap', async () => {
       const { view, fetchSession, signIn, stage, finished } = setup([
         sessionOf(null),
         sessionOf(ANA),
       ]);
       await flush();
       await vi.advanceTimersByTimeAsync(120_000);
       expect(view.showLoading).not.toHaveBeenCalled();
       expect(fetchSession).toHaveBeenCalledOnce();
       signIn.resolve(ANA);
       await finished;
       expect(stage.takeRead()).toEqual({ kind: 'ready', contentVersion: 'v1' });
     });

     it('with a token asks for the access even with a live session, and only once', async () => {
       const takeAccessToken = vi
         .fn<() => AccessToken | null>()
         .mockReturnValueOnce(INVITATION)
         .mockReturnValue(null);
       const { options, signIn, finished } = setup([sessionOf(ANA), sessionOf(ANA)], {
         takeAccessToken,
       });
       await flush();
       expect(options.requestSignIn).toHaveBeenCalledWith({
         presentation: 'page',
         reason: 'boot',
         token: INVITATION,
       });
       signIn.resolve(ANA);
       await finished;
       expect(options.requestSignIn).toHaveBeenCalledOnce();
     });

     it('asks for the access when the account has not accepted the current notice', async () => {
       const { options, signIn, finished } = setup([
         sessionOf({ ...ANA, privacyAccepted: false }),
         sessionOf(ANA),
       ]);
       await flush();
       expect(options.requestSignIn).toHaveBeenCalledOnce();
       signIn.resolve(ANA);
       await finished;
       expect(options.onReady).toHaveBeenCalledOnce();
     });

     it('resolves without the account when the session does not answer, and leaves the failure to the content', async () => {
       const { options, view, stage, finished } = setup([{ kind: 'unreachable' }]);
       await finished;
       expect(options.onReady).not.toHaveBeenCalled();
       expect(view.clear).toHaveBeenCalledOnce();
       expect(stage.takeRead()).toEqual({ kind: 'unreachable', failure: 'network' });
     });

     it('aborts the request at the 20 s of the attempt and leaves a timeout', async () => {
       const fetchSession = vi.fn(
         ({ signal }: { readonly signal: AbortSignal }) =>
           new Promise<SessionOutcome>((resolve) => {
             signal.addEventListener('abort', () => resolve({ kind: 'unreachable' }));
           }),
       );
       const { stage, isResolved } = setup([], { fetchSession });
       await vi.advanceTimersByTimeAsync(19_999);
       expect(isResolved()).toBe(false);
       await vi.advanceTimersByTimeAsync(1);
       expect(isResolved()).toBe(true);
       expect(stage.takeRead()).toEqual({ kind: 'unreachable', failure: 'timeout' });
     });

     it('waits a Retry-After that fits and asks again; one that does not fit leaves status', async () => {
       const limited = (seconds: number): SessionOutcome => ({
         kind: 'rate-limited',
         message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
         retryAfterSeconds: seconds,
       });
       const fits = setup([limited(2), sessionOf(ANA)]);
       await vi.advanceTimersByTimeAsync(2_000);
       await fits.finished;
       expect(fits.fetchSession).toHaveBeenCalledTimes(2);
       expect(fits.stage.takeRead()).toEqual({ kind: 'ready', contentVersion: 'v1' });
       const tooLong = setup([limited(30)]);
       await tooLong.finished;
       expect(tooLong.stage.takeRead()).toEqual({ kind: 'unreachable', failure: 'status' });
     });
   });
   ```

4. **`session-view.spec.ts`,** sólo con la espera. `document` se simula, y la directiva `// @vitest-environment jsdom` de F11a sale con lo que probaba:

   ```ts
   import { afterEach, describe, expect, it, vi } from 'vitest';
   import { SESSION_LOADING_MARKUP, createSessionView } from './session-view';

   function hostStub() {
     return { innerHTML: '<p>antes</p>' };
   }

   describe('the session view', () => {
     afterEach(() => {
       vi.unstubAllGlobals();
     });

     it('says it is connecting, as a status', () => {
       expect(SESSION_LOADING_MARKUP).toContain('Conectando con el taller…');
       expect(SESSION_LOADING_MARKUP).toContain('role="status"');
       expect(SESSION_LOADING_MARKUP).not.toContain('Reintentar');
     });

     it('draws the wait in #session-status and leaves nothing behind when it clears', () => {
       const host = hostStub();
       vi.stubGlobal('document', {
         getElementById: (id: string) => (id === 'session-status' ? host : null),
       });
       const view = createSessionView();
       view.showLoading();
       expect(host.innerHTML).toBe(SESSION_LOADING_MARKUP);
       view.clear();
       expect(host.innerHTML).toBe('');
     });

     it('does nothing without its element', () => {
       vi.stubGlobal('document', { getElementById: () => null });
       expect(() => createSessionView().showLoading()).not.toThrow();
     });
   });
   ```

5. **`sign-out.spec.ts`.** En cada llamada a `signOut` del archivo de F11a, `{ client, userId: 41 }` pasa a `{ client, userId: 41, forgetContentCopy }`, con `const forgetContentCopy = vi.fn(async () => {});` al principio de cada prueba. Sus valores esperados no cambian. Se suman dos casos al final del `describe`:

   ```ts
   it('forgets the copy of the content before it is done', async () => {
     const { client } = clientWith([{ status: 204 }]);
     const events: string[] = [];
     const forgetContentCopy = vi.fn(async () => {
       events.push('forget the copy');
     });
     const outcome = await signOut({ client, userId: 41, forgetContentCopy });
     events.push(outcome.kind);
     expect(events).toEqual(['forget the copy', 'signed-out']);
   });

   it('keeps the copy when the sign-out fails', async () => {
     const { client } = clientWith(['network-error']);
     const forgetContentCopy = vi.fn(async () => {});
     await signOut({ client, userId: 41, forgetContentCopy });
     expect(forgetContentCopy).not.toHaveBeenCalled();
   });
   ```

   El import de Vitest de la spec suma `vi`.
6. **Correr** `npm run test:unit -- frontend/src/app/boot frontend/src/features/sign-in/model`. Las adaptadas fallan por las firmas y los comportamientos nuevos (`budget`, `onPublished`, `takeRead` y `forgetContentCopy`), y `typecheck` falla por lo mismo.
7. **Commit:** `test(front): specs del corte de A3 en las etapas, la compuerta y «Salir», en rojo`.

### Tarea 2.2 · El corte en el front (T010, G)

**Archivos:**

- en `frontend/src/shared/api/content/`: `content-source.ts`, `api-content-source.ts` e `index.ts`; y se borran `static-content-source.ts` y su spec;
- en `frontend/src/app/boot/`: `content-gate.ts`, `gate-view.ts`, `session-gate.ts`, `session-view.ts`, `account-stages.ts` y `content-stage.ts`;
- `frontend/src/app/content/content.ts`;
- `frontend/src/index.html`, `frontend/styles.css` y `frontend/vite.config.ts`;
- `frontend/src/features/sign-in/model/sign-out.ts`, `frontend/src/features/sign-in/ui/PrivacyReacceptance.tsx` y `frontend/src/pages/account/ui/SignOutSection.tsx`;
- el contrato de F11a, `specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`.

1. **`content-source.ts`.** `ContentSource.read` devuelve la lectura:

   ```ts
   import type { PortionName } from './portions';

   export interface SourcePortion {
     readonly name: PortionName;
     readonly version: string;
     readonly data: unknown;
   }

   export interface ServedPortion extends SourcePortion {
     readonly etag: string;
   }

   export type ReadingOrigin = 'server' | 'confirmed-copy' | 'offline-copy';

   export interface ContentReading {
     readonly version: string;
     readonly origin: ReadingOrigin;
     readonly confirmedAt: string;
     readonly portions: readonly ServedPortion[];
   }

   export interface ContentRequest {
     readonly signal: AbortSignal;
   }

   export interface ContentSource {
     read(names: readonly PortionName[], request: ContentRequest): Promise<ContentReading>;
   }

   export type ContentFailureKind =
     'network' | 'status' | 'timeout' | 'body' | 'missing' | 'shape' | 'version' | 'access';

   export class ContentLoadError extends Error {
     readonly kind: ContentFailureKind;
     readonly detail: string;

     constructor(kind: ContentFailureKind, detail = '') {
       super(`No se pudo cargar el contenido (${kind}${detail ? `: ${detail}` : ''}).`);
       this.name = 'ContentLoadError';
       this.kind = kind;
       this.detail = detail;
     }
   }
   ```

2. **`api-content-source.ts`.** Se borra la interfaz `ApiContentSource`, `createApiContentSource` devuelve `ContentSource` y el import de `./content-source` suma `type ContentSource`. Nada más cambia.
3. **`index.ts`.** Salen la fuente estática y `ApiContentSource`. Después, borrar `static-content-source.ts` y `static-content-source.spec.ts`:

   ```ts
   export { storeContent, readStoredContent } from './content-holder';
   export { ContentLoadError } from './content-source';
   export type {
     ContentFailureKind,
     ContentReading,
     ContentRequest,
     ContentSource,
     ReadingOrigin,
     ServedPortion,
     SourcePortion,
   } from './content-source';
   export { PORTION_NAMES, SYSTEMS_DOMAINS, findPortionProblem } from './portions';
   export type { PortionName, PortionProblem, SystemsDomain } from './portions';
   export { PORTION_RESOURCES } from './portion-resources';
   export { COPY_FORMAT, copyOf, readingOf, usableCopy } from './content-copy';
   export type { ContentCopy, ContentCopyStore, CopiedPortion } from './content-copy';
   export { createApiContentSource, MAX_ROUNDS } from './api-content-source';
   export type {
     ApiContentSourceOptions,
     ContentFetch,
     ContentResponse,
     SessionRead,
   } from './api-content-source';
   export { contentCopies, forgetContentCopy } from './content-copies';
   ```

4. **`content-gate.ts`.** El comentario de `attemptOnce` es el de A2:

   ```ts
   import {
     ContentLoadError,
     PORTION_NAMES,
     findPortionProblem,
     storeContent,
     type ContentReading,
     type ContentSource,
   } from '../../shared/api/content';
   import { assembleContent } from '../content/assemble-content';
   import { CONTENT_PUBLISHED_EVENT, type Content } from '../content/content';
   import type { AttemptBudget } from './attempt-budget';
   import type { BootStage } from './run-boot';

   export interface GateView {
     showLoading(): void;
     showFailure(failure: ContentLoadError, retry: () => void): void;
     clear(): void;
   }

   export interface ContentGateOptions {
     readonly source: ContentSource;
     readonly view: GateView;
     readonly budget: AttemptBudget;
     readonly loadingDelayMs: number;
     readonly onPublished: (reading: ContentReading) => void;
   }

   type Outcome = { reading: ContentReading; content: Content } | { failure: ContentLoadError };

   function checkPortions(reading: ContentReading): void {
     const byName = new Map(reading.portions.map((portion) => [portion.name, portion]));
     for (const name of PORTION_NAMES) {
       const portion = byName.get(name);
       if (!portion) throw new ContentLoadError('missing', name);
       if (portion.version !== reading.version) throw new ContentLoadError('version', name);
     }
     for (const name of PORTION_NAMES) {
       const problem = findPortionProblem(name, byName.get(name)?.data);
       if (problem) throw new ContentLoadError(problem, name);
     }
   }

   function toFailure(error: unknown, timedOut: boolean): ContentLoadError {
     if (timedOut) return new ContentLoadError('timeout');
     if (error instanceof ContentLoadError) return error;
     return new ContentLoadError('network', error instanceof Error ? error.message : String(error));
   }

   // One attempt. Its timers do nothing once it has settled: the harness of boot-check runs every
   // queued timer on flush() and never cancels one.
   async function attemptOnce(
     options: ContentGateOptions,
     showLoadingAfterDelay: boolean,
   ): Promise<Outcome> {
     const controller = new AbortController();
     let settled = false;
     let timedOut = false;
     const loadingTimer = showLoadingAfterDelay
       ? setTimeout(() => {
           if (!settled) options.view.showLoading();
         }, options.loadingDelayMs)
       : undefined;
     const stopCap = options.budget.onExpired(() => {
       if (settled) return;
       timedOut = true;
       controller.abort();
     });
     try {
       const reading = await options.source.read(PORTION_NAMES, { signal: controller.signal });
       checkPortions(reading);
       return { reading, content: assembleContent(reading.portions) };
     } catch (error) {
       return { failure: toFailure(error, timedOut) };
     } finally {
       settled = true;
       clearTimeout(loadingTimer);
       stopCap();
     }
   }

   export function createContentGate(options: ContentGateOptions): BootStage {
     return {
       name: 'contentGate',
       run: () =>
         new Promise<void>((resolve) => {
           let inFlight = false;

           async function attempt(isRetry: boolean): Promise<void> {
             if (inFlight) return;
             inFlight = true;
             if (isRetry) {
               options.view.showLoading();
               options.budget.begin();
             }
             const outcome = await attemptOnce(options, !isRetry);
             inFlight = false;
             if ('failure' in outcome) {
               options.view.showFailure(outcome.failure, () => void attempt(true));
               return;
             }
             options.view.clear();
             storeContent(outcome.content);
             window.dispatchEvent(
               new CustomEvent(CONTENT_PUBLISHED_EVENT, { detail: outcome.content }),
             );
             options.onPublished(outcome.reading);
             resolve();
           }

           void attempt(false);
         }),
     };
   }
   ```

5. **`gate-view.ts`:**

   ```ts
   import type { ContentFailureKind } from '../../shared/api/content';
   import type { GateView } from './content-gate';

   const GENERAL_DETAIL =
     'El contenido del taller no se pudo cargar. Tu progreso sigue guardado en este navegador. Revisá tu conexión y probá de nuevo.';
   const VERSION_DETAIL =
     'El contenido del taller se está actualizando. Tu progreso sigue guardado en este navegador. Probá de nuevo en unos segundos.';
   const ACCESS_DETAIL =
     'Tu cuenta no puede ver el contenido del taller. Si creés que es un error, consultá con quien administra el taller.';

   export const LOADING_MARKUP =
     '<section class="empty-state" data-content-gate="loading"><p role="status">Cargando el contenido del taller…</p></section>';

   function detailOf(kind: ContentFailureKind): string {
     if (kind === 'version') return VERSION_DETAIL;
     if (kind === 'access') return ACCESS_DETAIL;
     return GENERAL_DETAIL;
   }

   export function failureMarkup(kind: ContentFailureKind): string {
     return (
       `<section class="empty-state" data-content-gate="failed" data-failure="${kind}">` +
       '<h2>No se pudo cargar el contenido</h2>' +
       `<p role="alert">${detailOf(kind)}</p>` +
       '<button class="button" id="content-retry" type="button">Reintentar</button>' +
       '</section>'
     );
   }

   export function createGateView(): GateView {
     const render = (markup: string): HTMLElement | null => {
       const main = document.getElementById('main');
       if (main) main.innerHTML = markup;
       return main;
     };
     return {
       showLoading() {
         const hadFocus = document.activeElement?.id === 'content-retry';
         const main = render(LOADING_MARKUP);
         if (hadFocus) main?.focus();
       },
       showFailure(failure, retry) {
         render(failureMarkup(failure.kind));
         const button = document.getElementById('content-retry');
         button?.addEventListener('click', retry);
         button?.focus();
       },
       clear() {
         render('');
       },
     };
   }
   ```

6. **`session-view.ts`.** Salen la falla, su marcado, «Reintentar» y la espera del 429 (D1):

   ```ts
   export interface SessionView {
     showLoading(): void;
     clear(): void;
   }

   export const SESSION_LOADING_MARKUP =
     '<section class="empty-state" data-session-gate="loading"><p role="status">Conectando con el taller…</p></section>';

   export function createSessionView(): SessionView {
     const render = (markup: string): void => {
       const host = document.getElementById('session-status');
       if (host) host.innerHTML = markup;
     };
     return {
       showLoading() {
         render(SESSION_LOADING_MARKUP);
       },
       clear() {
         render('');
       },
     };
   }
   ```

7. **`session-gate.ts`.** El comentario es la referencia puntual de F11a:

   ```ts
   import type { SessionOutcome, SessionSnapshot } from '../../entities/session';
   import type { AccessToken, RequestSignIn } from '../../features/sign-in';
   import type { SessionRead } from '../../shared/api/content';
   import type { AttemptBudget } from './attempt-budget';
   import type { BootStage } from './run-boot';
   import { createSessionReader } from './session-reader';
   import type { SessionView } from './session-view';

   export interface SessionGateOptions {
     readonly fetchSession: (request: { readonly signal: AbortSignal }) => Promise<SessionOutcome>;
     readonly storeSession: (snapshot: SessionSnapshot) => void;
     readonly takeAccessToken: () => AccessToken | null;
     readonly requestSignIn: RequestSignIn;
     readonly forgetContentCopy: () => Promise<void>;
     readonly onReady: () => void;
     readonly view: SessionView;
     readonly budget: AttemptBudget;
     readonly loadingDelayMs: number;
   }

   export interface SessionStage extends BootStage {
     takeRead(): SessionRead | null;
   }

   // One request. Its timer does nothing once it has settled: the harness of boot-check runs every
   // queued timer on flush() and never cancels one.
   async function fetchShowingLoading(
     options: SessionGateOptions,
     request: { readonly signal: AbortSignal },
   ): Promise<SessionOutcome> {
     let settled = false;
     const loadingTimer = setTimeout(() => {
       if (!settled) options.view.showLoading();
     }, options.loadingDelayMs);
     try {
       return await options.fetchSession(request);
     } finally {
       settled = true;
       clearTimeout(loadingTimer);
     }
   }

   export function createSessionGate(options: SessionGateOptions): SessionStage {
     const readSession = createSessionReader({
       fetchSession: (request) => fetchShowingLoading(options, request),
       storeSession: options.storeSession,
       requestSignIn: options.requestSignIn,
       forgetContentCopy: options.forgetContentCopy,
       budget: options.budget,
     });
     let read: SessionRead | null = null;
     return {
       name: 'sessionStage',
       async run() {
         options.budget.begin();
         const controller = new AbortController();
         const stopCap = options.budget.onExpired(() => controller.abort());
         try {
           read = await readSession({ signal: controller.signal, token: options.takeAccessToken() });
         } finally {
           stopCap();
         }
         options.view.clear();
         if (read.kind === 'ready') options.onReady();
       },
       takeRead() {
         const taken = read;
         read = null;
         return taken;
       },
     };
   }
   ```

8. **`account-stages.ts`:**

   ```ts
   import { fetchSession, sessionStore, type SessionSnapshot } from '../../entities/session';
   import { requestSignIn, type RequestSignIn } from '../../features/sign-in';
   import { forgetContentCopy } from '../../shared/api/content';
   import { apiClient } from '../account/api-client';
   import { mountAccountRoot } from '../account/mount-account-root';
   import { createTokenStage } from './access-tokens';
   import { createAttemptBudget } from './attempt-budget';
   import { createSessionGate } from './session-gate';
   import { createSessionReader } from './session-reader';
   import { createSessionView } from './session-view';

   const ATTEMPT_BUDGET_MS = 20_000;
   const LOADING_DELAY_MS = 400;

   const fetchFromApi = (request: { readonly signal: AbortSignal }) =>
     fetchSession(apiClient, request);
   const storeSession = (snapshot: SessionSnapshot): void => {
     sessionStore.getState().applySnapshot(snapshot);
   };

   export const attemptBudget = createAttemptBudget({
     totalMs: ATTEMPT_BUDGET_MS,
     now: () => Date.now(),
   });

   export const tokenStage = createTokenStage({ location: window.location, history: window.history });

   export const signInFromBoot: RequestSignIn = (options) => {
     mountAccountRoot();
     return requestSignIn(options);
   };

   export const sessionStage = createSessionGate({
     fetchSession: fetchFromApi,
     storeSession,
     takeAccessToken: () => tokenStage.take(),
     requestSignIn: signInFromBoot,
     forgetContentCopy,
     onReady: mountAccountRoot,
     view: createSessionView(),
     budget: attemptBudget,
     loadingDelayMs: LOADING_DELAY_MS,
   });

   export const readSessionForContent = createSessionReader({
     fetchSession: fetchFromApi,
     storeSession,
     requestSignIn: signInFromBoot,
     forgetContentCopy,
     budget: attemptBudget,
   });
   ```

9. **`content-stage.ts`:**

   ```ts
   import {
     contentCopies,
     copyOf,
     createApiContentSource,
     type ContentReading,
   } from '../../shared/api/content';
   import { CONTENT_COPY_SAVED_EVENT } from '../content/content';
   import {
     attemptBudget,
     readSessionForContent,
     sessionStage,
     signInFromBoot,
     tokenStage,
   } from './account-stages';
   import { createContentGate } from './content-gate';
   import { showCopyNotice } from './copy-notice';
   import { createGateView } from './gate-view';

   const LOADING_DELAY_MS = 400;

   function announceCopySaved(saved: boolean): void {
     window.dispatchEvent(new CustomEvent(CONTENT_COPY_SAVED_EVENT, { detail: { saved } }));
   }

   function afterPublish(reading: ContentReading): void {
     if (reading.origin === 'offline-copy') {
       showCopyNotice(reading.confirmedAt);
       return;
     }
     void contentCopies.write(copyOf(reading)).then(announceCopySaved);
   }

   export const contentGate = createContentGate({
     source: createApiContentSource({
       fetch: (input, init) => window.fetch(input, init),
       readSession: (request) => {
         const bootRead = sessionStage.takeRead();
         return bootRead === null ? readSessionForContent(request) : Promise.resolve(bootRead);
       },
       requestAccess: async () => {
         await attemptBudget.pausedWhile(() =>
           signInFromBoot({ presentation: 'page', reason: 'expired' }),
         );
       },
       copies: contentCopies,
       mayUseCopy: () => !tokenStage.hadToken,
       remainingMs: () => attemptBudget.remainingMs(),
       now: () => new Date(),
     }),
     view: createGateView(),
     budget: attemptBudget,
     loadingDelayMs: LOADING_DELAY_MS,
     onPublished: afterPublish,
   });
   ```

10. **`frontend/src/app/content/content.ts`.** Debajo de `export const CONTENT_PUBLISHED_EVENT = 'taller:content-published';` se suma:

    ```ts
    export const CONTENT_COPY_SAVED_EVENT = 'taller:content-copy-saved';
    ```

11. **`frontend/src/index.html`.** Justo después de la línea de F11a `<div class="session-status" id="session-status" tabindex="-1"></div>` se suma, con la misma sangría:

    ```html
          <div class="content-copy-notice" id="content-copy-notice"></div>
    ```

12. **`frontend/styles.css`.** Al final del archivo, después de las reglas de `.session-status` de F11a, con sus mismos rellenos. Vacío no mide nada, y no usa `display: none`, para que la región quede en el árbol de accesibilidad (research.md, R11):

    ```css
    .content-copy-notice {
      max-width: 1330px;
      margin: auto;
      padding: 44px 52px 0;
    }
    .content-copy-notice:empty {
      padding: 0;
    }
    .content-copy-notice p {
      margin: 0;
      padding: 14px 18px;
      border: 1px solid var(--line);
      border-left: 4px solid var(--accent);
      border-radius: 8px;
      background: var(--surface);
      color: var(--ink);
      line-height: 1.5;
    }
    @media (max-width: 1150px) {
      .content-copy-notice:not(:empty) {
        padding: 34px 32px 0;
      }
    }
    @media (max-width: 590px) {
      .content-copy-notice:not(:empty) {
        padding: 29px 20px 0;
      }
    }
    ```

13. **`frontend/vite.config.ts`.** El plugin queda sólo con los avisos de licencia (FR-029):
    - salen `createHash`, `buildDirectory`, `readCurriculum`, el gancho `config` (el `define` de `__CONTENT_VERSION__`) y `configureServer`;
    - el `server.proxy` y el `preview.proxy` de F11a no cambian.

    El plugin queda así:

    ```ts
    const NOTICES = ['EDITOR-LICENSES.txt', 'THIRD-PARTY-NOTICES.txt'];

    function webRootFiles(): Plugin {
      return {
        name: 'taller-web-root-files',
        generateBundle() {
          for (const notice of NOTICES) {
            const source = readFileSync(resolve(import.meta.dirname, notice));
            this.emitFile({ type: 'asset', fileName: notice, source });
          }
        },
      };
    }
    ```

    Los imports de arriba quedan en `readFileSync`, `resolve`, `react`, `defineConfig`, `Plugin` y `viteSingleFile`.

14. **`features/sign-in/model/sign-out.ts`** (R17):

    ```ts
    import type { ApiClient, ApiFailure } from '../../../shared/api/http';

    export interface SignOutDependencies {
      readonly client: ApiClient;
      readonly userId: number;
      readonly forgetContentCopy: () => Promise<void>;
    }

    export type SignOutOutcome =
      | { readonly kind: 'signed-out' }
      | { readonly kind: 'failed'; readonly failure: ApiFailure };

    const UNAUTHENTICATED = 401;
    const ACCOUNT_DISABLED = 'account_disabled';

    function alreadySignedOut(failure: ApiFailure): boolean {
      if (failure.kind === 'signed-out') return true;
      if (failure.kind !== 'response') return false;
      return failure.status === UNAUTHENTICATED || failure.code === ACCOUNT_DISABLED;
    }

    export async function signOut({
      client,
      userId,
      forgetContentCopy,
    }: SignOutDependencies): Promise<SignOutOutcome> {
      const result = await client.send('POST', '/api/auth/logout', undefined, { asUser: userId });
      if (!result.ok && !alreadySignedOut(result.failure)) {
        return { kind: 'failed', failure: result.failure };
      }
      await forgetContentCopy();
      return { kind: 'signed-out' };
    }
    ```

    Si el `sign-out.ts` de `master` difiere del plan de F11a, se conserva el de `master` y se le suman sólo `forgetContentCopy` en la interfaz y `await forgetContentCopy();` antes de devolver `signed-out`.
15. **Los dos que llaman.** En `pages/account/ui/SignOutSection.tsx`, `signOut({ client, userId })` pasa a `signOut({ client, userId, forgetContentCopy })`, con `import { forgetContentCopy } from '../../../shared/api/content';`. En `features/sign-in/ui/PrivacyReacceptance.tsx`, `signOut({ client, userId: account.id })` pasa a `signOut({ client, userId: account.id, forgetContentCopy })`, con el mismo import.
16. **El contrato de F11a** (`specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`), en el mismo commit. Cambia:
    - «`app/boot`: las etapas»: `SessionGateOptions` sin `timeoutMs` y con `forgetContentCopy` y `budget`; `createSessionGate` devuelve `SessionStage`; `SessionView` sin `showFailure`; y sale `SessionFailure`;
    - la lista «A3 extiende la etapa de sesión» pasa a remitir a [`specs/016-a3-contenido-api/contracts/front-interfaces.md`](./contracts/front-interfaces.md);
    - «`shared/api/http`», en «Lo que suman otros ítems»: «A3 pide las porciones con su propio `fetch` (research de A3, R3) y usa el cliente sólo para la sesión»;
    - «`features/sign-in`»: `SignOutDependencies` con `forgetContentCopy`;
    - «`qa/e2e`: el doble de la API»: `ApiCall` con `query` e `ifNoneMatch`, `ApiReply` con `abort`, `contentVersion` y las 17 rutas por omisión.
17. **Correr:**
    - `npm run test:unit`, en verde, con las specs de T009;
    - `npm run typecheck`, `npm run lint` y `npm run build`;
    - `git grep -n -e static-content-source -e __CONTENT_VERSION__ -- frontend/src frontend/vite.config.ts`, que no imprime nada;
    - `ls dist/content`, que falla con «No such file or directory».
18. **Commits:**
    - `feat(front): el arranque lee el contenido de la API, guarda la última copia y avisa sin servidor`, con todo lo de esta tarea menos el contrato de F11a;
    - `docs(specs): el contrato de F11a con lo que A3 cambia de sus etapas, de «Salir» y del doble`, con el contrato.

### Tarea 2.3 · Los checks con la API simulada (T011, Q)

**Archivos (todos en `qa/`):**

- en `lib/`: `boot-harness.ts`, `content-server.ts`, `built-page.ts` y `sources.ts`;
- `boot-check.ts`, `dist-content-check.ts` y `build-check.ts`.

**Consume:** el arranque de T010 (para el verde). **Produce:** lo que el contrato dice de `qa/lib`.

**Por qué así:**

- **El servidor simulado** sirve la sesión y los 17 recursos con los bytes del generador, su `ETag` y su `Content-Version`, y contesta 304 ante un `If-None-Match` igual (FR-036 y FR-037). Sus respuestas leen el cuerpo en una microtarea (R14).
- **El arnés** corre los temporizadores por vencimiento, para que la espera de un `Retry-After` vaya antes que el tope del intento (R14).
- **Los valores esperados de `boot-check`** cambian sólo donde lo dice la tabla de «Compatibilidad».

1. **Primero, los casos nuevos y los cambios de `boot-check.ts` y de `build-check.ts`, en rojo,** según los pasos 3 y 6. Correr `node qa/boot-check.ts` contra la fuente estática: fallan por la razón esperada (no hay pedidos a `/api/` de porciones). Commit: `test(qa): boot-check y build-check esperan la API y no el archivo estático, en rojo`.
2. **`qa/lib/content-server.ts`, entero:**

   ```ts
   import { contentVersion, curriculumDocument, curriculumMeta } from './content-document.ts';

   export const SESSION_PATH = '/api/session';

   // The 17 resources of C2 (spec 016, «Key Entities»), in the order of the portions.
   export const PORTION_PATHS: Readonly<Record<string, string>> = {
     'lab.rust': '/api/exercises?catalog=lab&language=rust',
     'lab.go': '/api/exercises?catalog=lab&language=go',
     'quests.rust': '/api/exercises?catalog=quests&language=rust',
     'quests.go': '/api/exercises?catalog=quests&language=go',
     'cores.lowlevel': '/api/exercises?catalog=cores&domain=lowlevel',
     'cores.infra': '/api/exercises?catalog=cores&domain=infra',
     'cores.play': '/api/exercises?catalog=cores&domain=play',
     'cores.pc': '/api/exercises?catalog=cores&domain=pc',
     'campaign.rust': '/api/worlds?language=rust',
     'campaign.go': '/api/worlds?language=go',
     'workshops.lowlevel': '/api/workshops?domain=lowlevel',
     'workshops.infra': '/api/workshops?domain=infra',
     'workshops.play': '/api/workshops?domain=play',
     'workshops.pc': '/api/workshops?domain=pc',
     'atlas.rust': '/api/atlas?language=rust',
     'atlas.go': '/api/atlas?language=go',
     guide: '/api/guide',
   };

   export const PORTION_URLS: readonly string[] = Object.values(PORTION_PATHS);

   export type ContentBehavior =
     | { kind: 'serve' }
     | { kind: 'reject' }
     | { kind: 'status'; status: number; retryAfter?: string }
     | { kind: 'text'; body: string }
     | { kind: 'document'; document: unknown }
     | { kind: 'version'; version: string }
     | { kind: 'hang' };

   export type SessionBehavior =
     | { kind: 'account' }
     | { kind: 'signed-out' }
     | { kind: 'no-content' }
     | { kind: 'reject' }
     | { kind: 'hang' };

   export interface ContentServerOptions {
     readonly session?: readonly SessionBehavior[];
     readonly portions?: readonly ContentBehavior[];
     readonly only?: { readonly name: string; readonly behaviors: readonly ContentBehavior[] };
   }

   export interface FakeResponse {
     ok: boolean;
     status: number;
     headers: Headers;
     text(): Promise<string>;
     json(): Promise<unknown>;
   }

   export interface FetchInit {
     signal?: AbortSignal;
     headers?: Record<string, string>;
   }

   export interface ContentServer {
     fetch: (url: string, init?: FetchInit) => Promise<FakeResponse>;
     requests: string[];
     sessionRequests: string[];
     order: string[];
   }

   const ACCOUNT = {
     id: 41,
     name: 'Ana Pérez',
     email: 'ana@x.com',
     role: 'student',
     privacyAccepted: true,
   };
   const FEATURES = { passwordReset: false, registration: false };
   const PATH_PORTIONS = new Map(Object.entries(PORTION_PATHS).map(([name, path]) => [path, name]));

   function respond(status: number, body: string, headers: Record<string, string> = {}): FakeResponse {
     return {
       ok: status >= 200 && status < 300,
       status,
       headers: new Headers(headers),
       text: async () => body,
       json: async () => JSON.parse(body) as unknown,
     };
   }

   function hangUntilAborted(init: FetchInit | undefined): Promise<FakeResponse> {
     return new Promise((_resolve, reject) => {
       init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
     });
   }

   function portionOf(document: unknown, name: string): unknown {
     const [group = '', slice] = name.split('.');
     const value = (document as Record<string, unknown> | null)?.[group];
     if (slice === undefined) return value;
     return (value as Record<string, unknown> | null | undefined)?.[slice];
   }

   function etagOf(name: string): string {
     return `"${(curriculumMeta().portions[name] ?? '').slice(0, 32)}"`;
   }

   function pick<T>(behaviors: readonly T[] | undefined, count: number, fallback: T): T {
     if (behaviors === undefined || behaviors.length === 0) return fallback;
     return behaviors[Math.min(count, behaviors.length - 1)] ?? fallback;
   }

   function sessionResponse(
     behavior: SessionBehavior,
     init: FetchInit | undefined,
   ): Promise<FakeResponse> {
     if (behavior.kind === 'reject') return Promise.reject(new TypeError('fetch failed'));
     if (behavior.kind === 'hang') return hangUntilAborted(init);
     const body = {
       user: behavior.kind === 'signed-out' ? null : ACCOUNT,
       features: FEATURES,
       contentVersion: behavior.kind === 'no-content' ? null : contentVersion(),
       catalogs: [],
     };
     return Promise.resolve(
       respond(200, JSON.stringify(body), {
         'Content-Type': 'application/json',
         'Cache-Control': 'no-store',
       }),
     );
   }

   function servedPortion(
     name: string,
     data: unknown,
     version: string,
     init: FetchInit | undefined,
   ): FakeResponse {
     const etag = etagOf(name);
     const headers = { ETag: etag, 'Content-Version': version, 'Cache-Control': 'private, no-cache' };
     if (init?.headers?.['If-None-Match'] === etag) return respond(304, '', headers);
     return respond(200, JSON.stringify(data), { ...headers, 'Content-Type': 'application/json' });
   }

   export function createContentServer(
     options: ContentServerOptions | ContentBehavior[] = {},
   ): ContentServer {
     const settings: ContentServerOptions = Array.isArray(options) ? { portions: options } : options;
     const document = curriculumDocument<unknown>();
     const requests: string[] = [];
     const sessionRequests: string[] = [];
     const order: string[] = [];
     const counts = new Map<string, number>();

     function portionResponse(
       name: string,
       behavior: ContentBehavior,
       init: FetchInit | undefined,
     ): Promise<FakeResponse> {
       switch (behavior.kind) {
         case 'serve':
           return Promise.resolve(
             servedPortion(name, portionOf(document, name), contentVersion(), init),
           );
         case 'version':
           return Promise.resolve(
             servedPortion(name, portionOf(document, name), behavior.version, init),
           );
         case 'document': {
           const data = portionOf(behavior.document, name);
           if (data === undefined) return Promise.reject(new TypeError('fetch failed'));
           return Promise.resolve(servedPortion(name, data, contentVersion(), init));
         }
         case 'reject':
           return Promise.reject(new TypeError('fetch failed'));
         case 'status': {
           const headers: Record<string, string> =
             behavior.retryAfter === undefined ? {} : { 'Retry-After': behavior.retryAfter };
           return Promise.resolve(respond(behavior.status, 'error', headers));
         }
         case 'text':
           return Promise.resolve(
             respond(200, behavior.body, { ETag: etagOf(name), 'Content-Version': contentVersion() }),
           );
         case 'hang':
           return hangUntilAborted(init);
       }
     }

     function behaviorFor(name: string, count: number): ContentBehavior {
       const serve: ContentBehavior = { kind: 'serve' };
       if (settings.only !== undefined)
         return settings.only.name === name ? pick(settings.only.behaviors, count, serve) : serve;
       return pick(settings.portions, count, serve);
     }

     return {
       requests,
       sessionRequests,
       order,
       fetch(url, init) {
         order.push(url);
         const count = counts.get(url) ?? 0;
         counts.set(url, count + 1);
         if (url === SESSION_PATH) {
           sessionRequests.push(url);
           return sessionResponse(pick(settings.session, count, { kind: 'account' }), init);
         }
         requests.push(url);
         const name = PATH_PORTIONS.get(url);
         if (name === undefined) return Promise.resolve(respond(404, 'not found'));
         return portionResponse(name, behaviorFor(name, count), init);
       },
     };
   }
   ```

3. **`qa/boot-check.ts`:**
   - **los imports:** el de `./lib/content-server.ts` pasa a `createContentServer`, `PORTION_URLS`, `type ContentBehavior`, `type ContentServer` y `type ContentServerOptions`;
   - **las constantes:** sale `contentVersion` del import de `./lib/content-document.ts` (queda `curriculumDocument`), y `const CONTENT_URL = …` pasa a `const SESSION_URL = '/api/session';`;
   - **«the happy path never shows the loading state and asks for the content once»:** `assert.deepEqual(server.requests, [CONTENT_URL]);` pasa a dos líneas:

     ```ts
     assert.deepEqual(server.sessionRequests, [SESSION_URL]);
     assert.deepEqual(server.requests, PORTION_URLS);
     ```

   - **el escenario de F11a «the session is asked once, before the content»:** pasa a `assert.deepEqual(server.order, [SESSION_URL, ...PORTION_URLS]);`;
   - **en `FAILURE_CASES`:**
     - el caso `'404'` pasa a `{ mode: '404', behavior: { kind: 'status', status: 404 }, failure: 'status' }`, sin `extraText` (FR-011);
     - el caso `'missing portion'` pasa a `failure: 'network'`: la porción que falta en el documento no llega (tabla de FR-039);
   - **el cuerpo del `for` de `FAILURE_CASES`** pasa a una función, sin cambiar sus aserciones, que también usan los casos nuevos:

     ```ts
     async function expectFailureShown(
       server: ContentServer,
       failure: string,
       extraText?: string,
     ): Promise<void> {
       const harness = await boot(MASTER_STORAGE, server);
       assert.equal(harness.bootError, undefined);
       assert.deepEqual(harness.errors, []);
       assert.deepEqual(publishedGlobals(harness.context), []);
       assert.deepEqual(harness.storageCalls, []);
       assert.deepEqual(Object.fromEntries(harness.storage), MASTER_STORAGE);
       assert.equal(harness.elements['toast']?.textContent, '');
       const markup = harness.elements['main']?.innerHTML ?? '';
       assert.ok(markup.includes('No se pudo cargar el contenido'), 'the error is not in #main');
       assert.ok(markup.includes('Reintentar'));
       assert.ok(markup.includes(`data-failure="${failure}"`), `the failure is not ${failure}`);
       if (extraText) assert.ok(markup.includes(extraText));
       assert.equal(retryButton(harness).focused, 1);
     }

     for (const { mode, behavior, failure, extraText } of FAILURE_CASES) {
       await test(`a failed content request (${mode}) leaves the views unevaluated and offers a retry`, () =>
         expectFailureShown(createContentServer([behavior]), failure, extraText),
       );
     }
     ```

   - **los dos reintentos:** `assert.equal(server.requests.length, 2);` pasa a `assert.equal(server.sessionRequests.length, 2);` («Reintentar» repite la sesión, FR-027);
   - **los casos nuevos de A3,** antes de la línea final de `process.stdout.write`:

     ```ts
     const MOVED_VERSION = 'f'.repeat(32);

     const API_FAILURE_CASES: { mode: string; options: ContentServerOptions; failure: string }[] = [
       { mode: 'the session does not answer', options: { session: [{ kind: 'reject' }] }, failure: 'network' },
       { mode: 'the session outlasts the budget', options: { session: [{ kind: 'hang' }] }, failure: 'timeout' },
       { mode: 'nothing was imported', options: { session: [{ kind: 'no-content' }] }, failure: 'status' },
       {
         mode: 'a 503 whose Retry-After does not fit',
         options: { only: { name: 'lab.rust', behaviors: [{ kind: 'status', status: 503, retryAfter: '60' }] } },
         failure: 'status',
       },
       {
         mode: 'a 429 whose Retry-After does not fit',
         options: { only: { name: 'guide', behaviors: [{ kind: 'status', status: 429, retryAfter: '60' }] } },
         failure: 'status',
       },
       {
         mode: 'a version that keeps moving',
         options: { portions: [{ kind: 'version', version: MOVED_VERSION }] },
         failure: 'version',
       },
       {
         mode: 'a 403',
         options: { only: { name: 'guide', behaviors: [{ kind: 'status', status: 403 }] } },
         failure: 'access',
       },
     ];

     for (const { mode, options, failure } of API_FAILURE_CASES) {
       await test(`without a copy, when ${mode}, the error is shown and the progress is untouched`, () =>
         expectFailureShown(createContentServer(options), failure),
       );
     }

     await test('user: null asks for no portion and waits for the sign-in', async () => {
       const server = createContentServer({ session: [{ kind: 'signed-out' }] });
       const harness = await boot(MASTER_STORAGE, server);
       assert.deepEqual(harness.errors, []);
       assert.deepEqual(server.sessionRequests, [SESSION_URL]);
       assert.deepEqual(server.requests, []);
       assert.equal(harness.published.length, 0);
       assert.deepEqual(harness.storageCalls, []);
       assert.equal((harness.elements['main']?.innerHTML ?? '').includes('No se pudo cargar'), false);
     });

     await test('a Content-Version that moves asks for the session again and publishes one version', async () => {
       const server = createContentServer({
         portions: [{ kind: 'version', version: MOVED_VERSION }, { kind: 'serve' }],
       });
       const harness = await boot({}, server);
       assert.deepEqual(harness.errors, []);
       assert.equal(server.sessionRequests.length, 2);
       assert.deepEqual(server.requests, [...PORTION_URLS, ...PORTION_URLS]);
       assert.equal(harness.published.length, 1);
     });

     await test('a 429 with a Retry-After that fits repeats only that request', async () => {
       const behaviors: ContentBehavior[] = [{ kind: 'status', status: 429, retryAfter: '1' }, { kind: 'serve' }];
       const server = createContentServer({ only: { name: 'guide', behaviors } });
       const harness = await boot({}, server);
       assert.deepEqual(harness.errors, []);
       assert.deepEqual(server.requests, [...PORTION_URLS, '/api/guide']);
       assert.equal(harness.published.length, 1);
     });

     await test('a 401 in a portion asks for the sign-in and shows no error meanwhile', async () => {
       const server = createContentServer({ only: { name: 'guide', behaviors: [{ kind: 'status', status: 401 }] } });
       const harness = await boot(MASTER_STORAGE, server);
       assert.deepEqual(harness.errors, []);
       assert.deepEqual(server.requests, PORTION_URLS);
       assert.equal(harness.published.length, 0);
       assert.deepEqual(harness.storageCalls, []);
       assert.equal((harness.elements['main']?.innerHTML ?? '').includes('No se pudo cargar'), false);
     });
     ```

   - **en `evaluateWithoutStartCall`,** `createContentServer().fetch` sigue igual: el servidor nuevo sirve la sesión y las porciones por omisión.
4. **`qa/lib/boot-harness.ts`,** los temporizadores por vencimiento (R14):
   - la lista `const timers: (() => void)[] = [];` pasa a esto:

     ```ts
     const timers: { callback: () => void; due: number; order: number }[] = [];
     let clock = 0;
     let scheduled = 0;
     const schedule = (callback: () => void, delay?: number): number => {
       scheduled += 1;
       timers.push({ callback, due: clock + Math.max(0, Number(delay) || 0), order: scheduled });
       return scheduled;
     };
     ```

   - en el contexto, `setTimeout: (callback: () => void) => timers.push(callback),` pasa a `setTimeout: schedule,`, y `requestAnimationFrame: (callback: () => void) => timers.push(callback),` pasa a `requestAnimationFrame: (callback: () => void) => schedule(callback, 16),`;
   - el cuerpo de `flush()` pasa a esto:

     ```ts
     async flush() {
       for (let round = 0; round < 1000; round++) {
         await new Promise((resolve) => setImmediate(resolve));
         timers.sort((a, b) => a.due - b.due || a.order - b.order);
         const next = timers.shift();
         if (!next) return;
         clock = next.due;
         try {
           next.callback();
         } catch (error) {
           errors.push(describeError(error));
         }
       }
     },
     ```

5. **`qa/dist-content-check.ts`:**
   - el import de `./lib/built-page.ts` queda en `evaluateBuiltPage, readBuiltPage`;
   - el de `./lib/content-server.ts` suma `PORTION_URLS` y `SESSION_PATH`;
   - sale `const builtContent = readBuiltContent();`;
   - sale el caso «the served file has the generator bytes (documentHash)» (FR-036);
   - «the bundle publishes the content once and asks for the file once» pasa a esto:

     ```ts
     test('the bundle asks for the session and the 17 portions once, and publishes once', () => {
       assert.equal(harness.published.length, 1);
       assert.deepEqual(server.sessionRequests, [SESSION_PATH]);
       assert.deepEqual(server.requests, PORTION_URLS);
     });
     ```

   Los casos de las 17 huellas y de los globals contra `dump-globals` no cambian.
6. **`qa/build-check.ts`:**
   - los imports quedan en `type BuiltPage, readBuiltPage` y en `contentVersion, curriculumDocumentText, curriculumMarkers`, y sale `createHash`;
   - desde `const servedContent = readBuiltContent();` hasta el `assert.equal(createHash…, documentHash, …)` inclusive, se reemplaza por esto (FR-030 y FR-013):

     ```ts
     assert(
       !fs.existsSync(path.join(root, 'dist', 'content')),
       'dist/content must not exist: the content comes from the API (A3)',
     );
     const curriculumText = curriculumDocumentText();
     for (const { family, markers } of curriculumMarkers()) {
       for (const marker of markers) {
         assert(curriculumText.includes(marker), `marker «${marker}» of ${family} must be in build/curriculum.json`);
         assert(
           !page.bootText.includes(marker),
           `marker «${marker}» of ${family} must not be in the HTML: the curriculum comes from the API`,
         );
       }
     }
     assert(
       !page.bootText.includes(contentVersion()),
       'the HTML must not carry a content version: the session gives it (A3 FR-013)',
     );
     ```

   El tope (`BOOT_SIZE_LIMIT`), los avisos de licencia y `assertSinglefileDocument` no cambian.
7. **`qa/lib/built-page.ts`:** sale `readBuiltContent`, con los imports que sólo usaba él (`assert` y `readdirSync`).
8. **`qa/lib/sources.ts`:** en `bundleApp` sale la línea `__CONTENT_VERSION__: JSON.stringify(contentVersion()),`, y el import queda en `curriculumDocumentText`.
9. **Correr,** sobre la rama de G integrada (S2):
   - `npm run curriculum`;
   - `node qa/boot-check.ts`, con todos los casos, los de hoy y los nuevos, en verde;
   - `npm run build && node qa/dist-content-check.ts && node qa/build-check.ts`;
   - `npm run typecheck` y `npm run lint`.

   Si un caso de hoy de `boot-check` falla por el orden de los temporizadores, se lleva al coordinador, porque sus valores no se tocan.
10. **Commits:**
    - el rojo del paso 1;
    - `test(qa): la API simulada para los checks, con la sesión y los 17 recursos`, con los pasos 2, 4, 5, 7 y 8.

### Tarea 2.4 · La red E2E: el doble, las adaptaciones y los E2E de A3 (T012, E)

**Archivos:**

- en `qa/e2e/lib/`: `content-portions.ts` (nuevo), `content-requests.ts` y `content-copy.ts` (nuevo);
- en `qa/e2e/fixtures/`: `api-double.ts`;
- en `qa/e2e/specs/`: `content-gate.spec.ts` y `session-stage.spec.ts`, adaptados, y `content-api.spec.ts`, nuevo.

**Consume:** el arranque de T010 (para el verde) y, de F11a, el doble, sus Page Objects (`access` y `account`), `STUDENT` y `errorBody`. **Produce:** lo que el contrato dice de `qa/e2e`.

**El orden de los commits** (FR-039 y D1): primero el doble y las ayudas, después la adaptación de A2, después la de F11a y al final los E2E nuevos, cada uno en su commit.

1. **`qa/e2e/lib/content-portions.ts`.** La tabla de C2 se escribe acá otra vez, aparte de la del front, y los bytes salen del generador:

   ```ts
   import { readFileSync } from 'node:fs';
   import { resolve } from 'node:path';

   // The 17 resources of C2 (spec 016, «Key Entities»).
   export const PORTION_PATHS = {
     'lab.rust': '/api/exercises?catalog=lab&language=rust',
     'lab.go': '/api/exercises?catalog=lab&language=go',
     'quests.rust': '/api/exercises?catalog=quests&language=rust',
     'quests.go': '/api/exercises?catalog=quests&language=go',
     'cores.lowlevel': '/api/exercises?catalog=cores&domain=lowlevel',
     'cores.infra': '/api/exercises?catalog=cores&domain=infra',
     'cores.play': '/api/exercises?catalog=cores&domain=play',
     'cores.pc': '/api/exercises?catalog=cores&domain=pc',
     'campaign.rust': '/api/worlds?language=rust',
     'campaign.go': '/api/worlds?language=go',
     'workshops.lowlevel': '/api/workshops?domain=lowlevel',
     'workshops.infra': '/api/workshops?domain=infra',
     'workshops.play': '/api/workshops?domain=play',
     'workshops.pc': '/api/workshops?domain=pc',
     'atlas.rust': '/api/atlas?language=rust',
     'atlas.go': '/api/atlas?language=go',
     guide: '/api/guide',
   } as const;

   export type PortionName = keyof typeof PORTION_PATHS;
   export const PORTION_NAMES = Object.keys(PORTION_PATHS) as PortionName[];

   const buildDirectory = resolve(import.meta.dirname, '../../../build');
   const curriculum = JSON.parse(
     readFileSync(resolve(buildDirectory, 'curriculum.json'), 'utf8'),
   ) as Record<string, unknown>;
   const meta = JSON.parse(readFileSync(resolve(buildDirectory, 'curriculum.meta.json'), 'utf8')) as {
     documentHash: string;
     portions: Record<string, string>;
   };

   export const CONTENT_VERSION = meta.documentHash.slice(0, 32);

   export function portionData(name: PortionName): unknown {
     const [group = '', slice] = name.split('.');
     const value = curriculum[group];
     return slice === undefined ? value : (value as Record<string, unknown>)[slice];
   }

   export function portionBody(name: PortionName): string {
     return JSON.stringify(portionData(name));
   }

   export function portionEtag(name: PortionName): string {
     return `"${(meta.portions[name] ?? '').slice(0, 32)}"`;
   }

   export function portionHeaders(
     name: PortionName,
     version: string = CONTENT_VERSION,
   ): Record<string, string> {
     return {
       ETag: portionEtag(name),
       'Content-Version': version,
       'Cache-Control': 'private, no-cache',
     };
   }

   export function isPortion(name: PortionName): (url: URL) => boolean {
     return (url) => `${url.pathname}${url.search}` === PORTION_PATHS[name];
   }

   export function isSession(url: URL): boolean {
     return url.pathname === '/api/session';
   }
   ```

2. **`qa/e2e/lib/content-requests.ts`.** Sale `CONTENT_URL`. Los que llaman a `trackContentRequests` (`session-stage.spec.ts` y `sign-in.spec.ts` de F11a) cuentan desde ahora las porciones de la API:

   ```ts
   import type { Page, Request } from '@playwright/test';

   const PORTION_PATH = /^\/api\/(exercises|worlds|workshops|atlas|guide)$/;

   function track(page: Page, matches: (pathname: string) => boolean): Request[] {
     const requests: Request[] = [];
     page.on('request', (request) => {
       if (matches(new URL(request.url()).pathname)) requests.push(request);
     });
     return requests;
   }

   export function trackContentRequests(page: Page): Request[] {
     return track(page, (pathname) => PORTION_PATH.test(pathname));
   }

   export function trackSessionRequests(page: Page): Request[] {
     return track(page, (pathname) => pathname === '/api/session');
   }
   ```

3. **`qa/e2e/lib/content-copy.ts`.** La señal se escucha con un script de inicio. Su orden respecto de los otros scripts no importa (research.md, consulta 4):

   ```ts
   import type { BrowserContext, Page } from '@playwright/test';

   interface WatchedWindow {
     __e2eCopySaved?: boolean[];
   }

   export async function watchCopySaved(context: BrowserContext): Promise<void> {
     await context.addInitScript(() => {
       const saved: boolean[] = [];
       (window as WatchedWindow).__e2eCopySaved = saved;
       window.addEventListener('taller:content-copy-saved', (event) => {
         saved.push((event as CustomEvent<{ saved: boolean }>).detail.saved);
       });
     });
   }

   export async function copySaved(page: Page): Promise<boolean> {
     await page.waitForFunction(() => ((window as WatchedWindow).__e2eCopySaved?.length ?? 0) > 0);
     return page.evaluate(() => (window as WatchedWindow).__e2eCopySaved?.[0] === true);
   }

   export async function blockContentCopy(context: BrowserContext): Promise<void> {
     await context.addInitScript(() => {
       Object.defineProperty(window, 'indexedDB', {
         get() {
           throw new DOMException('IndexedDB is blocked', 'SecurityError');
         },
       });
     });
   }

   export async function blockCopyWrites(
     context: BrowserContext,
   ): Promise<{ dispose(): Promise<void> }> {
     return context.addInitScript(() => {
       IDBObjectStore.prototype.put = () => {
         throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
       };
     });
   }

   export async function readStoredCopy(page: Page): Promise<unknown> {
     return page.evaluate(async () => {
       const databases = await indexedDB.databases();
       if (!databases.some((database) => database.name === 'taller-contenido')) return null;
       return new Promise<unknown>((resolve) => {
         const opening = indexedDB.open('taller-contenido');
         opening.onerror = () => resolve(null);
         opening.onsuccess = () => {
           const database = opening.result;
           if (!database.objectStoreNames.contains('copia')) {
             database.close();
             resolve(null);
             return;
           }
           const request = database.transaction('copia').objectStore('copia').get('ultima');
           request.onsuccess = () => {
             database.close();
             resolve(request.result ?? null);
           };
           request.onerror = () => {
             database.close();
             resolve(null);
           };
         };
       });
     });
   }
   ```

4. **`qa/e2e/fixtures/api-double.ts`.** Los cambios son aditivos; si el archivo de `master` difiere del plan de F11a, se aplican sobre lo que haya:
   - **los imports** suman:

     ```ts
     import {
       CONTENT_VERSION,
       PORTION_NAMES,
       PORTION_PATHS,
       portionBody,
       portionEtag,
       portionHeaders,
       type PortionName,
     } from '../lib/content-portions';
     ```

     Salen las constantes `META` y `CONTENT_VERSION` de F11a, y sus imports de `node:fs` y `node:path` si no los usa nada más.
   - **`ApiCall` y `ApiReply`** suman `query: string;` e `ifNoneMatch: string | undefined;` en `ApiCall`, y `abort?: boolean;` en `ApiReply`;
   - **`callOf`** queda así:

     ```ts
     function callOf(request: Request): ApiCall {
       const headers = request.headers();
       const text = request.postData();
       const url = new URL(request.url());
       return {
         method: request.method(),
         path: url.pathname,
         query: url.search,
         ifNoneMatch: headers['if-none-match'],
         xsrf: headers['x-xsrf-token'],
         user: headers['x-taller-user'],
         body: text ? (JSON.parse(text) as unknown) : undefined,
       };
     }
     ```

   - **en la clase:**
     - suma `contentVersion: string = CONTENT_VERSION;` junto a `signInAccount`;
     - `callsTo` queda así:

       ```ts
       callsTo(route: ApiRoute): ApiCall[] {
         const [method, target = ''] = route.split(' ');
         return this.calls.filter(
           (call) =>
             call.method === method &&
             (target.includes('?') ? `${call.path}${call.query}` === target : call.path === target),
         );
       }
       ```

     - en `handle`, antes del `fulfill`: `if (reply.abort === true) { await route.abort(); return; }`;
   - **`replyTo`** busca primero con la query y después sin ella:

     ```ts
     private async replyTo(call: ApiCall): Promise<ApiReply> {
       const exact = `${call.method} ${call.path}${call.query}` as ApiRoute;
       const general = `${call.method} ${call.path}` as ApiRoute;
       if (MODIFYING.has(call.method) && call.xsrf !== this.xsrfValue()) {
         return { status: 419, json: errorBody('csrf_token_mismatch') };
       }
       for (const route of [exact, general]) {
         const next = this.queued.get(route)?.shift();
         if (next !== undefined) return next;
         const handler = this.handlers.get(route);
         if (handler !== undefined) return handler(call);
       }
       this.unhandled.push(exact);
       return { status: 404, json: errorBody('not_found') };
     }
     ```

   - **en `installDefaults`:**
     - la sesión responde `contentVersion: this.contentVersion`;
     - al final se suman las 17 porciones:

       ```ts
       for (const name of PORTION_NAMES) {
         this.on(`GET ${PORTION_PATHS[name]}`, (call) => this.portionReply(name, call));
       }
       ```

   - **el método nuevo:**

     ```ts
     private portionReply(name: PortionName, call: ApiCall): ApiReply {
       const headers = portionHeaders(name, this.contentVersion);
       if (call.ifNoneMatch === portionEtag(name)) return { status: 304, headers };
       return { status: 200, headers, body: portionBody(name), contentType: 'application/json' };
     }
     ```

5. **Correr** `npm run build && E2E_PORT=4194 npm run test:e2e`. Sobre la rama de G integrada, los 106 de F1 pasan sin editarlos. Commit: `test(qa): el doble de la API sirve las 17 porciones con sus validadores`.
6. **La adaptación de los 17 E2E de A2 (FR-039),** en `qa/e2e/specs/content-gate.spec.ts`, entero. Lo que cambia, caso por caso, está en la tabla de «Compatibilidad». Commit propio: `test(qa): los E2E de A2 contra la API simulada, con su tabla de compatibilidad`:

   ```ts
   import type { Page, Route } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { copySaved, watchCopySaved } from '../lib/content-copy';
   import { isPortion, isSession, portionHeaders } from '../lib/content-portions';
   import { trackContentRequests, trackSessionRequests } from '../lib/content-requests';
   import { curriculumIds, frozenProgress, type StorageKey } from '../lib/curriculum';
   import { documentWasReloaded, markDocument } from '../lib/document-marker';
   import { readStorageAccess, watchStorageAccess } from '../lib/storage-access';
   import { urls } from '../lib/urls';
   import type { StorageControl } from '../fixtures/storage-control';
   import type { CampaignPage } from '../pages/campaign';
   import type { LabPage } from '../pages/lab';
   import type { ShellPage } from '../pages/shell';
   import type { SystemsPage } from '../pages/systems';

   interface Pages {
     lab: LabPage;
     campaign: CampaignPage;
     systems: SystemsPage;
     shell: ShellPage;
   }

   const STORAGE_KEYS = Object.keys(frozenProgress) as StorageKey[];
   const PROGRESS_SAVED = 'Tu progreso sigue guardado';
   const FAILED_RESOURCE = /Failed to load resource/;
   const PORTIONS_PER_START = 17;

   async function failFirstSessionThenFallBack(page: Page, fail: (route: Route) => Promise<void>) {
     let requests = 0;
     await page.route(isSession, async (route) => {
       requests += 1;
       if (requests === 1) await fail(route);
       else await route.fallback();
     });
   }

   test.describe('the five deep links and the full reload', () => {
     const links = [
       {
         name: '?ejercicio=&paso=#laboratorio',
         url: urls.exercise('rust-02', 'code'),
         expectView: async ({ lab }: Pick<Pages, 'lab'>) => {
           await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
           await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
         },
       },
       {
         name: '?campana=&ejercicio=#laboratorio',
         url: urls.campaignMission('rust-world-1', 'rust-02'),
         expectView: async ({ lab }: Pick<Pages, 'lab'>) => {
           await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
           await expect(lab.tab('learn')).toHaveAttribute('aria-selected', 'true');
         },
       },
       {
         name: '?sistema=&ejercicio=#laboratorio',
         url: urls.systemsCode('cache', 'go-113'),
         expectView: async ({ lab, shell }: Pick<Pages, 'lab' | 'shell'>) => {
           await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['go-113'].title);
           await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
           await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
         },
       },
       {
         name: '?mundo=#campana',
         url: urls.world('rust-world-2'),
         expectView: async ({ campaign, shell }: Pick<Pages, 'campaign' | 'shell'>) => {
           await expect(shell.menuLink('campana')).toHaveAttribute('aria-current', 'page');
           await expect(campaign.world('Puerto de señales')).toBeVisible();
         },
       },
       {
         name: '?lenguaje=&taller=&parte=#sistemas',
         url: urls.workshop('go', 'cache', 'ship'),
         expectView: async ({ systems, shell }: Pick<Pages, 'systems' | 'shell'>) => {
           await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
           await expect(systems.workshopHeading('Una caché que aprende tus visitas')).toBeVisible();
           await expect(systems.part('ship')).toHaveAttribute('aria-pressed', 'true');
         },
       },
     ];

     for (const link of links) {
       test(`${link.name} opens with the 17 portions and reloads with the session alone`, async ({
         shell,
         lab,
         campaign,
         systems,
         context,
         page,
       }) => {
         await watchCopySaved(context);
         const portionRequests = trackContentRequests(page);
         const sessionRequests = trackSessionRequests(page);

         await shell.goto(link.url);
         await link.expectView({ lab, campaign, systems, shell });
         expect(await copySaved(page)).toBe(true);
         expect(portionRequests).toHaveLength(PORTIONS_PER_START);
         expect(sessionRequests).toHaveLength(1);
         await expect(shell.contentFailure).toHaveCount(0);

         await markDocument(page);
         await page.reload();
         await shell.contentFailure.or(page.locator('#main h1')).first().waitFor();
         expect(await documentWasReloaded(page)).toBe(true);
         await link.expectView({ lab, campaign, systems, shell });
         expect(portionRequests).toHaveLength(PORTIONS_PER_START);
         expect(sessionRequests).toHaveLength(2);
         await expect(page).toHaveURL(link.url);
       });
     }
   });

   test.describe('the content does not arrive', () => {
     const failures: {
       name: string;
       kind: string;
       url: (url: URL) => boolean;
       respond: (route: Route) => Promise<void>;
       console?: RegExp;
     }[] = [
       {
         name: 'the session request is aborted',
         kind: 'network',
         url: isSession,
         respond: (route) => route.abort(),
         console: FAILED_RESOURCE,
       },
       {
         name: 'a portion answers 404',
         kind: 'status',
         url: isPortion('guide'),
         respond: (route) => route.fulfill({ status: 404, body: 'no existe' }),
         console: FAILED_RESOURCE,
       },
       {
         name: 'a portion answers 500',
         kind: 'status',
         url: isPortion('guide'),
         respond: (route) => route.fulfill({ status: 500, body: 'falló' }),
         console: FAILED_RESOURCE,
       },
       {
         name: 'the body of a portion is not JSON',
         kind: 'body',
         url: isPortion('guide'),
         respond: (route) =>
           route.fulfill({
             status: 200,
             contentType: 'application/json',
             headers: portionHeaders('guide'),
             body: '<<<basura>>>',
           }),
       },
       {
         name: 'a portion does not arrive',
         kind: 'network',
         url: isPortion('atlas.go'),
         respond: (route) => route.abort(),
         console: FAILED_RESOURCE,
       },
       {
         name: 'a portion has another shape',
         kind: 'shape',
         url: isPortion('quests.rust'),
         respond: (route) =>
           route.fulfill({ status: 200, headers: portionHeaders('quests.rust'), json: {} }),
       },
     ];

     for (const failure of failures) {
       test(`shows the error and leaves the progress untouched when ${failure.name}`, async ({
         shell,
         storage,
         context,
         pageIssues,
         page,
       }) => {
         if (failure.console) pageIssues.expectIssue(failure.console, `the ${failure.name} request`);
         await page.route(failure.url, failure.respond);
         await storage.seed(frozenProgress);
         await watchStorageAccess(context);

         await shell.goto(urls.exercise('rust-02', 'code'));

         await expect(shell.contentAlert).toContainText(PROGRESS_SAVED);
         await expect(shell.contentFailure).toHaveAttribute('data-failure', failure.kind);
         await expect(shell.retryButton).toBeVisible();
         await expect(page.getByRole('tab', { name: /Experimentá/ })).toHaveCount(0);
         await expect(shell.menu).toHaveCount(1);
         await expectProgressUntouched({ storage, page });
       });
     }

     test('shows the error when the session outlasts the 20 s cap', async ({
       shell,
       storage,
       context,
       page,
     }) => {
       await page.clock.install();
       await page.route(isSession, () => {});
       await storage.seed(frozenProgress);
       await watchStorageAccess(context);

       await page.goto(urls.exercise('rust-02', 'code'));
       await expect(shell.contentFailure).toHaveCount(0);
       await page.clock.fastForward(20_000);

       await expect(shell.contentAlert).toContainText(PROGRESS_SAVED);
       await expect(shell.contentFailure).toHaveAttribute('data-failure', 'timeout');
       await expectProgressUntouched({ storage, page });
     });
   });

   async function expectProgressUntouched({ storage, page }: { storage: StorageControl; page: Page }) {
     expect(await readStorageAccess(page)).toEqual({ reads: 0, writes: 0 });
     const stored = await storage.snapshot();
     for (const key of STORAGE_KEYS) expect(stored[key]).toBe(frozenProgress[key]);
     expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
   }

   test.describe('retrying', () => {
     test('recovers the start on the second session without reloading the page', async ({
       shell,
       lab,
       storage,
       context,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the first session request');
       await failFirstSessionThenFallBack(page, (route) => route.abort());
       await storage.seed(frozenProgress);
       const sessionRequests = trackSessionRequests(page);
       await shell.goto(urls.exercise('rust-02', 'code'));
       await expect(shell.contentAlert).toContainText(PROGRESS_SAVED);
       await markDocument(page);
       await watchStorageAccess(context);

       await shell.retryButton.click();

       await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
       await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
       await expect(shell.contentFailure).toHaveCount(0);
       expect(await documentWasReloaded(page)).toBe(false);
       expect(sessionRequests).toHaveLength(2);
       const stored = await storage.snapshot();
       for (const key of STORAGE_KEYS) expect(stored[key]).toBe(frozenProgress[key]);
     });

     test('shows the error again when the second session fails too', async ({
       shell,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'both session requests');
       await page.route(isSession, (route) => route.abort());
       const sessionRequests = trackSessionRequests(page);
       await shell.goto(urls.view('recorrido'));

       await shell.retryButton.click();

       await expect(shell.contentAlert).toContainText(PROGRESS_SAVED);
       await expect(shell.retryButton).toBeFocused();
       expect(sessionRequests).toHaveLength(2);
     });
   });

   test.describe('the keyboard', () => {
     test('leaves the focus on «Reintentar» and Enter operates it', async ({
       shell,
       lab,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the first session request');
       await failFirstSessionThenFallBack(page, (route) => route.abort());

       await shell.goto(urls.exercise('rust-02', 'code'));
       await expect(shell.retryButton).toBeFocused();
       await page.keyboard.press('Enter');

       await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
       await expect(shell.contentFailure).toHaveCount(0);
     });
   });

   test.describe('on a phone', () => {
     test.use({ viewport: { width: 390, height: 844 } });

     async function expectNoHorizontalOverflow(page: Page) {
       const overflow = await page.evaluate(
         () => document.documentElement.scrollWidth - window.innerWidth,
       );
       expect(overflow).toBeLessThanOrEqual(0);
     }

     test('opens a deep link', async ({ shell, lab, page }) => {
       await shell.goto(urls.exercise('rust-02', 'code'));

       await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
       await expectNoHorizontalOverflow(page);
     });

     test('shows the error inside the screen and retries with a tap', async ({
       shell,
       lab,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the first session request');
       await failFirstSessionThenFallBack(page, (route) => route.abort());

       await shell.goto(urls.exercise('rust-02', 'code'));

       await expect(shell.contentAlert).toBeInViewport();
       await expect(shell.retryButton).toBeInViewport();
       await expect(shell.retryButton).toBeFocused();
       await expectNoHorizontalOverflow(page);
       await shell.retryButton.click();
       await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
     });
   });
   ```

7. **La adaptación de los E2E de F11a (D1 y el transporte),** en su propio commit (`test(qa): los E2E de F11a con la falla de la sesión en la vista de A2 y las 17 porciones`). En `session-stage.spec.ts`:
   - sale la constante `UNREACHABLE`;
   - en «asks for the session once, before the content», `trackApiAndContent` cuenta las porciones de la API en lugar de `/content/`. La condición pasa a `pathname === '/api/session' || /^\/api\/(exercises|worlds|workshops|atlas|guide)$/.test(pathname)`, y se suma `expect(seen).toHaveLength(18);`;
   - el `describe('the session does not answer', …)` queda así:

     ```ts
     test.describe('the session does not answer', () => {
       test('shows the error of the content, evaluates no legacy source and retries without reloading', async ({
         api,
         lab,
         pageIssues,
         page,
       }) => {
         pageIssues.expectIssue(FAILED_RESOURCE, 'the 502 of the first session request');
         api.reply('GET /api/session', { status: 502, body: '<html>Bad Gateway</html>', contentType: 'text/html' });
         await page.goto(urls.exercise('rust-02', 'code'));
         await expect(page.locator('#main [data-content-gate="failed"]')).toHaveAttribute('data-failure', 'network');
         await expect(page.getByRole('alert')).toContainText('Tu progreso sigue guardado en este navegador');
         expect(await legacyEvaluated(page)).toBe(false);
         const retry = page.getByRole('button', { name: 'Reintentar' });
         await expect(retry).toBeFocused();
         await retry.click();
         await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
         expect(api.callsTo('GET /api/session')).toHaveLength(2);
       });

       test('with a 429 whose Retry-After fits, waits and starts without an error', async ({
         api,
         lab,
         pageIssues,
         page,
       }) => {
         pageIssues.expectIssue(FAILED_RESOURCE, 'the 429 of the first session request');
         api.reply('GET /api/session', {
           status: 429,
           headers: { 'Retry-After': '1' },
           json: { message: MESSAGES.too_many_requests, code: 'too_many_requests' },
         });
         await page.goto(urls.exercise('rust-02', 'code'));
         await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
         await expect(page.locator('#main [data-content-gate="failed"]')).toHaveCount(0);
         expect(api.callsTo('GET /api/session')).toHaveLength(2);
       });

       test('with a 429 whose Retry-After does not fit, shows the error at once', async ({
         api,
         pageIssues,
         page,
       }) => {
         pageIssues.expectIssue(FAILED_RESOURCE, 'the 429 of the session request');
         api.reply('GET /api/session', {
           status: 429,
           headers: { 'Retry-After': '60' },
           json: { message: MESSAGES.too_many_requests, code: 'too_many_requests' },
         });
         await page.goto(urls.view('recorrido'));
         await expect(page.locator('#main [data-content-gate="failed"]')).toHaveAttribute('data-failure', 'status');
         expect(api.callsTo('GET /api/session')).toHaveLength(1);
       });
     });
     ```

   Los demás casos del archivo (sin cuenta, los dos tokens) no cambian. En el mismo commit, en `qa/e2e/specs/sign-in.spec.ts` de F11a, el caso «goes on to the requested view without reloading, with the CSRF token and without X-Taller-User» cambia `expect(contentRequests).toHaveLength(1);` por `expect(contentRequests).toHaveLength(17);`: después del ingreso se piden las 17 porciones y no el archivo. Nada más de ese archivo cambia.
8. **`qa/e2e/specs/content-api.spec.ts`, los E2E de A3 (FR-040),** en rojo hasta que G entregue. Commit: `test(qa): E2E de A3: la copia, sin servidor, la sesión y las rondas`:

   ```ts
   import type { Page } from '@playwright/test';
   import { expect, test } from '../fixtures';
   import { STUDENT, errorBody } from '../lib/api-contract';
   import {
     blockContentCopy,
     blockCopyWrites,
     copySaved,
     readStoredCopy,
     watchCopySaved,
   } from '../lib/content-copy';
   import {
     CONTENT_VERSION,
     PORTION_NAMES,
     PORTION_PATHS,
     isSession,
     portionData,
     portionEtag,
   } from '../lib/content-portions';
   import { trackContentRequests, trackSessionRequests } from '../lib/content-requests';
   import { curriculumIds, frozenProgress, type StorageKey } from '../lib/curriculum';
   import { documentWasReloaded, markDocument, observeReload } from '../lib/document-marker';
   import { urls } from '../lib/urls';
   import type { StorageControl } from '../fixtures/storage-control';

   const FAILED_RESOURCE = /Failed to load resource/;
   const NEXT_VERSION = 'b'.repeat(32);
   const NOTICE = '#content-copy-notice';
   const COPY_DAY = new Date('2026-10-07T15:00:00-03:00');
   const NOTICE_TEXT =
     'No se pudo traer el contenido del servidor del taller. Estás usando la copia que guardó este navegador, que estaba al día el 7 de octubre de 2026. Tu progreso sigue guardado en este navegador. Recargá la página más tarde para traer el contenido al día.';
   const STORAGE_KEYS = Object.keys(frozenProgress) as StorageKey[];

   interface StoredCopy {
     format: number;
     version: string;
     confirmedAt: string;
     portions: Record<string, { etag: string; data: unknown }>;
   }

   async function expectProgressUntouched(storage: StorageControl): Promise<void> {
     const stored = await storage.snapshot();
     for (const key of STORAGE_KEYS) expect(stored[key]).toBe(frozenProgress[key]);
     expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
   }

   async function cutTheServer(page: Page): Promise<void> {
     await page.route(isSession, (route) => route.abort());
   }

   function trackPortionStatuses(page: Page): number[] {
     const statuses: number[] = [];
     page.on('response', (response) => {
       const { pathname } = new URL(response.url());
       if (/^\/api\/(exercises|worlds|workshops|atlas|guide)$/.test(pathname))
         statuses.push(response.status());
     });
     return statuses;
   }

   test.describe('the copy of the content', () => {
     test('is saved with the version, the date and the 17 portions with their ETag, without touching the progress', async ({
       shell,
       storage,
       context,
       page,
     }) => {
       await storage.seed(frozenProgress);
       await watchCopySaved(context);
       await shell.goto(urls.view('recorrido'));
       expect(await copySaved(page)).toBe(true);
       const copy = (await readStoredCopy(page)) as StoredCopy;
       expect(copy.format).toBe(1);
       expect(copy.version).toBe(CONTENT_VERSION);
       expect(Number.isNaN(Date.parse(copy.confirmedAt))).toBe(false);
       expect(Object.keys(copy.portions).sort()).toEqual([...PORTION_NAMES].sort());
       for (const name of PORTION_NAMES) {
         expect(copy.portions[name]?.etag).toBe(portionEtag(name));
         expect(copy.portions[name]?.data).toEqual(portionData(name));
       }
       await expectProgressUntouched(storage);
     });

     test('a new import brings only what changed: 16 answers 304 and one 200', async ({
       shell,
       api,
       context,
       page,
     }) => {
       await watchCopySaved(context);
       await shell.goto(urls.view('recorrido'));
       expect(await copySaved(page)).toBe(true);

       api.contentVersion = NEXT_VERSION;
       const changedGuide = { ...(portionData('guide') as Record<string, unknown>), changed: true };
       api.on(`GET ${PORTION_PATHS.guide}`, () => ({
         status: 200,
         headers: { ETag: '"changed-guide"', 'Content-Version': NEXT_VERSION },
         json: changedGuide,
       }));
       const sessionRequests = trackSessionRequests(page);
       const statuses = trackPortionStatuses(page);
       await page.reload();
       await expect(shell.heading('recorrido')).toBeVisible();

       expect(sessionRequests).toHaveLength(1);
       expect(statuses.filter((status) => status === 304)).toHaveLength(16);
       expect(statuses.filter((status) => status === 200)).toHaveLength(1);
     });

     test('with the store of the copy blocked, the workshop still opens from the server', async ({
       shell,
       context,
       page,
     }) => {
       await blockContentCopy(context);
       await watchCopySaved(context);
       const portionRequests = trackContentRequests(page);
       await shell.goto(urls.view('recorrido'));
       await expect(shell.heading('recorrido')).toBeVisible();
       expect(await copySaved(page)).toBe(false);
       await page.reload();
       await expect(shell.heading('recorrido')).toBeVisible();
       expect(portionRequests).toHaveLength(34);
       await expect(shell.contentFailure).toHaveCount(0);
     });
   });

   test.describe('without the server', () => {
     test('with a copy opens the views with the notice and its date, out of #main and without moving the focus', async ({
       shell,
       storage,
       context,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the session request of the second start');
       await page.clock.install({ time: COPY_DAY });
       await storage.seed(frozenProgress);
       await storage.watchWrites();
       await watchCopySaved(context);
       await shell.goto(urls.exercise('rust-02', 'code'));
       expect(await copySaved(page)).toBe(true);

       await cutTheServer(page);
       await page.reload();

       await expect(page.locator(NOTICE)).toHaveAttribute('role', 'status');
       await expect(page.locator(NOTICE)).toHaveText(NOTICE_TEXT);
       await expect(page.locator(`#main ${NOTICE}`)).toHaveCount(0);
       await expect(page.getByRole('tab', { name: /Experimentá/ })).toBeVisible();
       expect(
         await page.evaluate(() => document.activeElement?.closest('#content-copy-notice') ?? null),
       ).toBeNull();
       await expectProgressUntouched(storage);
       expect(await storage.writes()).toEqual([]);
     });

     test.describe('on a phone', () => {
       test.use({ viewport: { width: 390, height: 844 } });

       test('the notice fits the screen and leaves the menu free', async ({
         shell,
         context,
         pageIssues,
         page,
       }) => {
         pageIssues.expectIssue(FAILED_RESOURCE, 'the session request of the second start');
         await watchCopySaved(context);
         await shell.goto(urls.view('recorrido'));
         expect(await copySaved(page)).toBe(true);
         await cutTheServer(page);
         await page.reload();
         await expect(page.locator(NOTICE)).toBeInViewport();
         const overflow = await page.evaluate(
           () => document.documentElement.scrollWidth - window.innerWidth,
         );
         expect(overflow).toBeLessThanOrEqual(0);
         await expect(page.locator(NOTICE)).toHaveCSS('position', 'static');
       });
     });

     test('with a token in the URL does not use the copy', async ({
       shell,
       context,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the session request with the token');
       await watchCopySaved(context);
       await shell.goto(urls.view('recorrido'));
       expect(await copySaved(page)).toBe(true);
       await cutTheServer(page);
       await page.goto('about:blank');
       await page.goto('/#invitacion=k3J8xQ2mN7pL4vR9tY6wZ1aB5cD0eF3gH8iJ2kL7mN4');
       await expect(shell.contentFailure).toHaveAttribute('data-failure', 'network');
       await expect(page.locator(NOTICE)).toBeEmpty();
     });

     test('a browser that published a new version and could not keep it does not open the old one', async ({
       shell,
       api,
       storage,
       context,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the session request of the third start');
       await storage.seed(frozenProgress);
       await watchCopySaved(context);
       await shell.goto(urls.view('recorrido'));
       expect(await copySaved(page)).toBe(true);

       api.contentVersion = NEXT_VERSION;
       const blocked = await blockCopyWrites(context);
       await page.reload();
       await expect(shell.heading('recorrido')).toBeVisible();
       expect(await copySaved(page)).toBe(false);
       expect(await readStoredCopy(page)).toBeNull();
       await blocked.dispose();

       await cutTheServer(page);
       await page.reload();
       await expect(shell.contentFailure).toHaveAttribute('data-failure', 'network');
       await expectProgressUntouched(storage);
     });
   });

   test.describe('the session decides', () => {
     test.describe('without an account', () => {
       test.use({ sessionAccount: null });

       test('asks for no portion until the sign-in, and then starts without reloading', async ({
         access,
         lab,
         page,
       }) => {
         const portionRequests = trackContentRequests(page);
         await page.goto(urls.exercise('rust-02', 'code'));
         await expect(access.heading('Ingresá al taller')).toBeVisible();
         expect(portionRequests).toHaveLength(0);
         await markDocument(page);
         await access.signIn(STUDENT.email, 'una contraseña larga de prueba');
         await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
         expect(portionRequests).toHaveLength(17);
         expect(await documentWasReloaded(page)).toBe(false);
       });
     });

     test('a 401 in a portion asks for the sign-in and repeats the round without reloading', async ({
       api,
       access,
       lab,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 401 of the guide');
       api.reply(`GET ${PORTION_PATHS.guide}`, { status: 401, json: errorBody('unauthenticated') });
       const sessionRequests = trackSessionRequests(page);
       const portionRequests = trackContentRequests(page);
       await page.goto(urls.exercise('rust-02', 'code'));
       await expect(page.getByText('Tu sesión venció. Ingresá de nuevo para seguir.')).toBeVisible();
       await markDocument(page);
       await access.signIn(STUDENT.email, 'una contraseña larga de prueba');
       await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
       expect(sessionRequests).toHaveLength(2);
       expect(portionRequests).toHaveLength(34);
       expect(await documentWasReloaded(page)).toBe(false);
     });

     test('a 403 shows the access error and does not use the copy', async ({
       shell,
       api,
       context,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 403 of the guide');
       await watchCopySaved(context);
       await shell.goto(urls.view('recorrido'));
       expect(await copySaved(page)).toBe(true);
       api.contentVersion = NEXT_VERSION;
       api.reply(`GET ${PORTION_PATHS.guide}`, {
         status: 403,
         json: { message: 'Prohibido.', code: 'forbidden' },
       });
       await page.reload();
       await expect(shell.contentFailure).toHaveAttribute('data-failure', 'access');
       await expect(shell.contentAlert).toHaveText(
         'Tu cuenta no puede ver el contenido del taller. Si creés que es un error, consultá con quien administra el taller.',
       );
     });

     test('a session that answers user: null leaves no copy', async ({
       shell,
       api,
       access,
       context,
       page,
     }) => {
       await watchCopySaved(context);
       await shell.goto(urls.view('recorrido'));
       expect(await copySaved(page)).toBe(true);
       api.account = null;
       await page.reload();
       await expect(access.heading('Ingresá al taller')).toBeVisible();
       await expect.poll(() => readStoredCopy(page)).toBeNull();
     });

     test('«Salir» leaves no copy', async ({ shell, account, context, page }) => {
       await watchCopySaved(context);
       await shell.goto(urls.view('recorrido'));
       expect(await copySaved(page)).toBe(true);
       await account.open();
       expect(await observeReload(page, () => account.signOut())).toBe(true);
       expect(await readStoredCopy(page)).toBeNull();
     });
   });

   test.describe('the rounds and the limits', () => {
     test('an import in the middle of the start repeats the session and publishes one version', async ({
       shell,
       api,
       context,
       page,
     }) => {
       api.reply('GET /api/session', {
         status: 200,
         headers: { 'Cache-Control': 'no-store' },
         json: {
           user: STUDENT,
           features: { passwordReset: false, registration: false },
           contentVersion: NEXT_VERSION,
           catalogs: [],
         },
       });
       await watchCopySaved(context);
       const sessionRequests = trackSessionRequests(page);
       const portionRequests = trackContentRequests(page);
       await shell.goto(urls.view('recorrido'));
       expect(await copySaved(page)).toBe(true);
       expect(sessionRequests).toHaveLength(2);
       expect(portionRequests).toHaveLength(34);
       expect(((await readStoredCopy(page)) as StoredCopy).version).toBe(CONTENT_VERSION);
     });

     test('a 429 with a Retry-After that fits waits and repeats only that request', async ({
       shell,
       api,
       pageIssues,
       page,
     }) => {
       pageIssues.expectIssue(FAILED_RESOURCE, 'the 429 of the guide');
       api.reply(`GET ${PORTION_PATHS.guide}`, {
         status: 429,
         headers: { 'Retry-After': '1' },
         json: errorBody('too_many_requests'),
       });
       const portionRequests = trackContentRequests(page);
       await shell.goto(urls.view('recorrido'));
       await expect(shell.heading('recorrido')).toBeVisible();
       expect(portionRequests).toHaveLength(18);
       await expect(shell.contentFailure).toHaveCount(0);
     });

     test('a portion request never carries the headers of a change', async ({ shell, api }) => {
       await shell.goto(urls.view('recorrido'));
       const portions = api.calls.filter((call) => call.path !== '/api/session');
       expect(portions).toHaveLength(17);
       for (const call of portions) {
         expect(call.xsrf).toBeUndefined();
         expect(call.user).toBeUndefined();
       }
     });
   });
   ```

9. **Correr,** sobre la rama de G integrada:
   - `npm run build && E2E_PORT=4194 npm run test:e2e -- --repeat-each=3 --retries=0`, con los 106 de F1, los 17 de A2, los de F11a y los de A3 en verde, tres veces seguidas;
   - el tope de 20 s, aparte: `E2E_PORT=4194 npm run test:e2e -- specs/content-gate.spec.ts -g "20 s cap" --repeat-each=30 --retries=0`.

### Tarea 2.5 · La documentación (T013, K)

**El mismo cambio (FR-043).** Se edita sobre lo que dejó F11a (su T034). Cada pasaje se busca por el texto citado:

| Archivo | Pasaje de hoy | Qué dice después |
| --- | --- | --- |
| `AGENTS.md` | «Vite construye un HTML y su contenido, y Nginx los sirve» | Que Vite construye el HTML, Nginx lo sirve y el contenido llega de la API de C2, detrás de la sesión |
| `AGENTS.md` | «`build/curriculum.json`, otra salida ignorada que el build copia a `dist/content/` y lee la compuerta de arranque» | Que la API lo importa (C2) y el arranque lo pide a `/api/` (`frontend/src/app/boot/` y `frontend/src/shared/api/content/`). Los checks y la red E2E lo sirven con una API simulada |
| `AGENTS.md` | «y copia `build/curriculum.json` a `dist/content/curriculum.<versión>.json`» | Que el currículo no sale en el build: el navegador guarda la última copia en IndexedDB |
| `AGENTS.md` | la vista previa, «el HTML, el contenido y los avisos de licencia, montados enteros» | El HTML y los avisos; el contenido llega por `/api/` del stack |
| `README.md` | «`dist/index.html` ya no es autónomo: pide el currículo a `dist/content/`…» | Que pide el contenido a la API con la sesión. Sin servidor, quien ya estudió en ese navegador y no salió sigue con la última copia y un aviso con su fecha |
| `README.md` | «deja el currículo junto a él, en `dist/content/curriculum.<versión>.json`» | Que el currículo llega de la API |
| `README.md` | «Comprueban el documento y su contenido» | Que comprueban el documento sin el currículo y el arranque contra una API simulada |
| `README.md` | la vista previa «con `dist/` entero montado en modo lectura» | Que monta `dist/` (el HTML y los avisos) y pasa `/api/` al stack |
| `docs/architecture.md` | la fila «Catálogos de contenido (publicados en `window.*`)» | `content/` → `tools/content/` → `build/curriculum.json` → la API (C2) → la fuente de la API y la última copia (`frontend/src/shared/api/content/`) → la compuerta (`frontend/src/app/boot/`) → `register-catalogs.ts` |
| `docs/architecture.md` | la fila «Documento, entrada ESM, arranque y adaptadores legacy» | Suma el aviso sin servidor (`#content-copy-notice`) y el presupuesto del intento |
| `docs/architecture.md` | la fila «Construcción y dependencias», «su plugin copia el currículo y los avisos de licencia a `dist/`» | «su plugin copia los avisos de licencia a `dist/`» |
| `docs/architecture.md` | la fila «Servicio web, API y preview», «`dist/` entero, con el HTML y su contenido» | «`dist/` entero, con el HTML y los avisos de licencia» |
| `docs/architecture.md` | «La salida es `dist/index.html` más `dist/content/curriculum.<versión>.json` (A2), que A3 retira…» | «La salida es `dist/index.html` y los dos avisos de licencia; el contenido llega de la API (A3)» |
| `qa/AGENTS.md` | «Los catálogos se publican desde el contenido que carga la compuerta de arranque: `build/curriculum.json`, que … el build copia a `dist/content/`» | Que los checks y la red E2E lo sirven con una API simulada (`qa/lib/content-server.ts` y el doble de `qa/e2e/fixtures/api-double.ts`) |
| `qa/AGENTS.md` | `dist-content-check` «evalúa el `dist/` construido con su contenido» | Que evalúa el `dist/` con la API simulada: la sesión, los 17 recursos, los globals contra `dump-globals` y las 17 huellas |
| `qa/AGENTS.md` | «deja `dist/index.html` con su contenido en `dist/content/`» | «deja `dist/index.html`, sin el currículo» |
| `qa/AGENTS.md` | la fila «Arranque, compuerta del contenido, …» | Suma `qa/e2e/specs/content-api.spec.ts` y las specs de `frontend/src/shared/api/content/` y `frontend/src/app/boot/` |
| `qa/AGENTS.md` | la descripción de `boot-check` | Que corre los temporizadores por vencimiento y sirve la API simulada con sus comportamientos (`session`, `portions` y `only`) |
| `qa/AGENTS.md` | (nuevo) | `qa/classroom-boot-check.ts`: 40 arranques contra el stack, con permiso y fuera de `npm test` |
| `docs/refactor-roadmap.md` | «viaja aparte en `dist/content/`» | «llega de la API (A3)» |

**Comprobar:**

- `git grep -n -e 'dist/content' -e '__CONTENT_VERSION__' -- AGENTS.md README.md docs qa/AGENTS.md` no imprime nada;
- las rutas, los comandos y los enlaces locales de cada pasaje;
- `git diff --check`.

**Commit:** `docs: el contenido llega de la API, con la última copia en el navegador (A3)`.

### Tarea 2.6 · La compuerta de U2 (T014, K)

La compuerta de 0.2 sobre las ramas de G, Q, E y K integradas, con estos puntos propios:

- **La red:**
  - `E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0` en verde, con los 106 de F1, los 17 de A2, los de F11a y los de A3;
  - el tope de 20 s de A2, aparte, 30 veces (T012, paso 9).
- **Lo que no se edita:** `git diff --name-only a3/base -- qa/e2e/specs` lista sólo `content-gate.spec.ts`, `session-stage.spec.ts`, `sign-in.spec.ts` y `content-api.spec.ts`. `git log --format=%s a3/base.. -- qa/e2e/specs/content-gate.spec.ts qa/e2e/specs/session-stage.spec.ts qa/e2e/specs/sign-in.spec.ts` muestra un commit para la adaptación de A2 y otro para la de F11a.
- **Los oráculos:** el sha256 de `node tools/content/dump-globals.ts .` es el de T001 (FR-035), y `dist-content-check` está en verde.
- **El retiro:**
  - `ls dist/content` falla;
  - `git grep -n -e static-content-source -e __CONTENT_VERSION__ -e readBuiltContent` no imprime nada fuera de `specs/` y `docs/plans/`.
- **El peso.**
  - **Cómo se mide:** `html.length` contra T001.
  - **Lo que se espera:** unos +6 700 (research.md, R15).
  - **La condición de corte:** si A3 suma más de 12 000 caracteres, el doble de lo estimado, o el total llega a 1 250 000, A3 no cierra. Se informa la medida separada con el script de quickstart.md §4, y decide el usuario.
- **El PR:** `feat(front): read the content from the API with the last copy in the browser, and retire the static file (A3 U2)`, contra `a3/base`. La descripción en inglés lleva:
  - la tabla de compatibilidad;
  - el peso;
  - la decisión D1 y su adaptación.

**Reversión de U2:** el PR entero, porque es un corte. Después de revertirlo, la fuente estática vuelve a ser la única, y U1 queda sin cablear.

## 3. U3 · Contra el stack, la imagen web y el cierre (onda 5: K)

**Cubre:** FR-030 (la imagen web), FR-032 y FR-033 (verificados, de F11a), FR-042, SC-007, SC-009 y SC-010.

### Tarea 3.1 · Cuarenta arranques desde una IP (T015, K)

**Archivos:** `qa/classroom-boot-check.ts` (nuevo). No entra en `qa/run-checks.ts`: necesita el stack y el Chrome Headless Shell de `npm run test:e2e:install`.

1. **El script:**

   ```ts
   /* Cuarenta arranques a la vez desde una misma IP contra el stack (A3, FR-042 y SC-007).
    * Con el stack levantado y la imagen web de A3: node qa/classroom-boot-check.ts
    */
   import assert from 'node:assert/strict';
   import { chromium, type BrowserContext } from '@playwright/test';
   import { openAccount } from './lib/api-account.ts';

   const BASE = `http://127.0.0.1:${process.env.TALLER_PORT ?? '8080'}`;
   const CLASSROOM = 40;
   const FIRST_VIEW = '#main h1, #main [data-content-gate="failed"]';
   const FAILED = '#main [data-content-gate="failed"]';

   interface Start {
     failed: boolean;
     ms: number;
   }

   function cookiesOf(header: string): { name: string; value: string; url: string }[] {
     return header.split('; ').map((pair) => {
       const separator = pair.indexOf('=');
       return { name: pair.slice(0, separator), value: pair.slice(separator + 1), url: BASE };
     });
   }

   async function start(context: BrowserContext, load: 'goto' | 'reload'): Promise<Start> {
     const page = context.pages()[0] ?? (await context.newPage());
     const started = Date.now();
     if (load === 'goto') await page.goto(`${BASE}/#recorrido`);
     else await page.reload();
     await page.locator(FIRST_VIEW).first().waitFor({ timeout: 60_000 });
     return { failed: (await page.locator(FAILED).count()) > 0, ms: Date.now() - started };
   }

   async function copySaved(context: BrowserContext): Promise<void> {
     const page = context.pages()[0];
     if (page === undefined) throw new Error('the context has no page');
     await page.waitForFunction(
       () => ((window as unknown as { __copySaved?: boolean[] }).__copySaved?.length ?? 0) > 0,
     );
   }

   function summary(name: string, starts: readonly Start[]): string {
     const times = starts.map((item) => item.ms).sort((a, b) => a - b);
     const failed = starts.filter((item) => item.failed).length;
     return `${name}: ${failed} errores; primera vista en ${times[0]} ms la más rápida, ${times[Math.floor(times.length / 2)]} ms la mediana y ${times.at(-1)} ms la última`;
   }

   const account = await openAccount(BASE);
   const browser = await chromium.launch();
   try {
     const contexts = await Promise.all(
       Array.from({ length: CLASSROOM }, async () => {
         const context = await browser.newContext();
         await context.addCookies(cookiesOf(account.cookie));
         await context.addInitScript(() => {
           const saved: boolean[] = [];
           (window as unknown as { __copySaved: boolean[] }).__copySaved = saved;
           window.addEventListener('taller:content-copy-saved', (event) => {
             saved.push((event as CustomEvent<{ saved: boolean }>).detail.saved);
           });
         });
         await context.newPage();
         return context;
       }),
     );
     const cold = await Promise.all(contexts.map((context) => start(context, 'goto')));
     await Promise.all(contexts.map((context) => copySaved(context)));
     const warm = await Promise.all(contexts.map((context) => start(context, 'reload')));
     console.log(summary('Sin copia', cold));
     console.log(summary('Con copia', warm));
     assert.equal(cold.filter((item) => item.failed).length, 0, 'algún arranque sin copia vio la vista de error');
     assert.equal(warm.filter((item) => item.failed).length, 0, 'algún arranque con copia vio la vista de error');
   } finally {
     await browser.close();
     account.close();
   }
   ```

   El comentario de cabecera es el que llevan los checks de `qa/`.
2. **Correr, con permiso para Docker** (quickstart.md §3):
   - `npm run build`;
   - `docker compose build taller`;
   - `docker compose up --build -d --wait`;
   - `node qa/classroom-boot-check.ts`.

   **Lo que se espera:** 0 errores en las dos rondas (SC-007). Las dos líneas de tiempos se anotan en research.md, «Mediciones contra el stack», contra los 151 ms de A2 (SC-010).
3. **Si alguna ronda tiene errores:**
   - se anota cuántos y con qué `data-failure`;
   - se informa al coordinador, porque es una entrada para C4, que afina los límites de Nginx;
   - el script no se relaja.
4. **Commit:** `test(qa): cuarenta arranques contra el stack, con y sin copia (A3)`.

### Tarea 3.2 · La imagen web, la vista previa y el PR a `master` (T016, K)

1. **La imagen web** (FR-030 y SC-009), con el stack de T015:
   - `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/content/` da `404`;
   - `curl -s -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:8080/content/curriculum.$(node -e "console.log(JSON.parse(require('fs').readFileSync('build/curriculum.meta.json','utf8')).documentHash.slice(0,32))").json"` da `404`;
   - `docker compose exec taller ls /usr/share/nginx/html` lista `index.html` y los dos avisos, sin `content`.
2. **La vista previa** (FR-033, de F11a):
   - `docker compose -f docker/compose.preview.yaml up --build -d --wait`;
   - en el navegador, con una sesión del stack, `http://localhost:8765/` abre el taller;
   - las herramientas del navegador muestran la sesión y los 17 pedidos a `/api/`, y una recarga hace sólo la sesión.
3. **`npm run dev`** (FR-032, de F11a): con el stack, el contenido llega por el proxy. Un `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5173/content/` no da 200.
4. **A mano, sin servidor** (SC-003):
   - con la copia guardada, `docker compose stop php` y recargar: se ve el aviso con la fecha;
   - después de «Salir», con `php` detenido, se ve la vista de error;
   - `docker compose start php` para volver.
5. **La compuerta final:** la de 0.2 sobre `a3/base`, con la red completa cinco veces seguidas (`--repeat-each=5 --retries=0`).
6. **Detener:** `docker compose -f docker/compose.preview.yaml down` y `docker compose down`.
7. **El PR** de `a3/base` a `master`: `feat(front): the content comes from the API behind the session, with the last copy in the browser (A3)`. La descripción en inglés lleva:
   - la reversión por unidad;
   - el peso;
   - la medición del aula;
   - la verificación a mano;
   - lo que queda para F11d, D1c, A4 y C4.

## 4. Compatibilidad: lo que se conserva y lo que cambia

**Los 17 E2E de A2** (`content-gate.spec.ts`, FR-039). Cada uno arranca con un contexto vacío, sin copia:

| E2E de A2 | Se conserva | Cambia |
| --- | --- | --- |
| Los cinco enlaces profundos y la recarga (5) | Las URL, lo que se ve en cada vista, la detección de la recarga, la URL final y que no haya error | El nombre del caso y la cuenta: 17 porciones y una sesión al abrir; en la recarga, sólo otra sesión (la copia está al día). Esperan la señal de la copia guardada antes de recargar |
| El contenido no llega (6) | La alerta con «Tu progreso sigue guardado», `data-failure`, «Reintentar», ninguna vista evaluada, el menú y el progreso intacto (0 lecturas y 0 escrituras de Web Storage) | La ruta simulada: la sesión abortada (`network`); una porción con 404, que pasa a `status` y antes era `version`; una con 500 (`status`); un cuerpo que no es JSON (`body`); «una porción no llega», abortada (`network`, antes `missing`); y una de otra forma (`shape`) |
| El tope de 20 s (1) | El reloj simulado, el texto, `timeout` y el progreso intacto | Lo que no responde es la sesión |
| El reintento (2) | La recuperación sin recargar, el foco en «Reintentar» y el progreso intacto | Falla la primera sesión (`route.fallback()` para la segunda), y se cuentan sesiones |
| El teclado (1) y el teléfono (2) | El foco, `Enter`, los 390 × 844 y que no haya desborde | La ruta simulada: la primera sesión |

**Los de F11a** (D1):

| Archivo y caso | Se conserva | Cambia |
| --- | --- | --- |
| `session-stage.spec.ts`, «asks for the session once, before the content» | Una sesión y que sea el primer pedido | Se cuentan las porciones de la API en lugar de `/content/`: 18 pedidos |
| `session-stage.spec.ts`, «the session does not answer…» | El 502, ninguna vista evaluada, el foco en «Reintentar», la recuperación sin recargar y dos sesiones | Se ve la vista de A2 (`data-failure="network"` y «Tu progreso sigue guardado»), no «No pudimos conectar…» |
| `session-stage.spec.ts`, «with a 429 waits for Retry-After before letting retry» | Que un 429 se respeta | Pasa a dos casos: un `Retry-After: 1` que cabe se espera solo y arranca (FR-009); un `Retry-After: 60`, que no cabe, muestra `status` enseguida |
| `session-gate.spec.ts` (Vitest) | Una sesión, ningún temporizador después de resolver, la espera a los 400 ms, el ingreso como página y la sesión otra vez, ningún tope durante el ingreso, el token y el aviso sin aceptar | La falla, el reintento, el tope de 20 s y el 429: la etapa no muestra errores y deja `takeRead()`. La lectura sin cuenta borra la copia |
| `session-view.spec.ts` (Vitest) | La espera, `role="status"` y que no haga nada sin su elemento | Salen la falla, «Reintentar» y la espera del 429, que no se usan desde A3. `document` se simula, sin jsdom |
| `sign-in.spec.ts`, «goes on to the requested view without reloading…» | Todo, menos una cuenta | La cuenta de pedidos de contenido pasa de 1 a 17: las porciones de la API en lugar del archivo |
| `sign-out.spec.ts` (Vitest) | Todos sus casos y valores | Cada llamada pasa `forgetContentCopy`, y se suman dos casos |

**`boot-check`** (FR-037). Cambia su arnés (`content-server.ts` y los temporizadores de `boot-harness.ts`) y, en tres casos de A2 y uno de F11a, el valor esperado:

| Caso | Antes | Después | Por qué |
| --- | --- | --- | --- |
| «the happy path… asks for the content once» | `requests` = `[CONTENT_URL]` | Una sesión, y `requests` = las 17 rutas | Ya no hay un documento: hay 17 recursos |
| `FAILURE_CASES`, `'404'` | `version`, con «Recargá la página» | `status` | FR-011 |
| `FAILURE_CASES`, `'missing portion'` | `missing` | `network` | La tabla de FR-039: la API no puede omitir una porción |
| Los dos reintentos | `requests.length` = 2 | `sessionRequests.length` = 2 | «Reintentar» repite la sesión (FR-027) |
| «the session is asked once, before the content» (F11a) | `order` = `['/api/session', CONTENT_URL]` | `['/api/session', …17 rutas]` | Lo mismo |

**Los specs de Vitest de A2:**

- **`content-gate.spec.ts`:** sólo cambia el arnés (lectura y presupuesto), y sus valores esperados no.
- **`gate-view.spec.ts`:** cambia el texto de `version`, por FR-028.
- **`static-content-source.spec.ts`:** se borra con la fuente (FR-029).

## 5. Lo que A4, D1c, F11d, E1 y C4 toman de A3

- **A4:** A3 no pide la plantilla del harness. Si A4 la guarda en la copia, la suma como porción extra, y `usableCopy` la ignora sin invalidar copias.
- **D1c:**
  - reutiliza `sessionStage` y `readSessionForContent`, y compara la cuenta con `sessionStore`;
  - la versión del contenido publicado está en `ContentReading.version`, y `onPublished` la recibe;
  - el riesgo 7 de la spec es suyo.
- **F11d:** al activar «computadora compartida», llama a `forgetContentCopy()` de `shared/api/content`. A partir de ahí, `afterPublish` (en `content-stage.ts`) no tiene que escribir la copia: es el único punto de escritura, y F11d le suma la condición.
- **E1:** si suma una porción obligatoria, la agrega en tres lugares y sube `COPY_FORMAT`:
  - `PORTION_NAMES`;
  - `PORTION_RESOURCES`;
  - la tabla de los dos dobles.
- **C4:**
  - FR-022 de C4 se cumple con T011 y T016;
  - la medición de T015 es su entrada para los límites de Nginx.

## Cobertura de requisitos

| Requisito | Tareas |
| --- | --- |
| FR-001 | T004 y T005 (lector), T009 y T010 (etapa y cableado), T011 (la sesión en cada ronda) |
| FR-002 | T004 y T005, T006 y T007 (ninguna porción sin la sesión lista), T011, T012 |
| FR-003 | T009 y T010 (`takeRead`, la etapa termina sin error), T012 |
| FR-004 | T006 y T007, T011 |
| FR-005 | T006 y T007, T012 (la recarga con un pedido) |
| FR-006, FR-007 | T006 y T007, T012 (16 respuestas 304 y un 200) |
| FR-008 | T006 y T007, T011, T012 |
| FR-009 | T004 y T005 (la sesión), T006 y T007 (las porciones), T011, T012 |
| FR-010 | T004 y T005 (el presupuesto), T009 y T010 (las dos etapas lo comparten), T012 (el tope de 20 s) |
| FR-011 | T006 y T007, T011 |
| FR-012 | T006 y T007, T011, T012 |
| FR-013 | T010 (sale `__CONTENT_VERSION__`), T011 (`build-check`) |
| FR-014 | T006 y T007 (los encabezados), T012 (sin CSRF en las porciones) |
| FR-015 | T002 y T003 (el formato), T010 (`afterPublish` y la señal), T012 |
| FR-016 | T006 y T007 (borrar antes), T012 (el invariante) |
| FR-017 | T002 y T003 (`usableCopy`), T006 y T007 (borrar la que no sirve) |
| FR-018 | T002 y T003 (`COPY_FORMAT`), T013 |
| FR-019 | T006 y T007 (el almacén no rechaza), T012 (el almacén bloqueado) |
| FR-020 | T011 (Web Storage intacto), T012 (los contadores de A2) |
| FR-021 | T004 y T005 (`user: null`), T009 y T010 («Salir»), T012 |
| FR-022 | T006 y T007 (una clave, un `put` por transacción) |
| FR-023 | T006 y T007 (los 9 modos), T011, T012 |
| FR-024 | T006 y T007 (`mayUseCopy`), T010 (`tokenStage.hadToken`), T012 |
| FR-025 | T004 y T005, T012 |
| FR-026 | T004 y T005, T010 (el elemento y el CSS), T012 (el teléfono y el foco) |
| FR-027 | T009 y T010 (el reintento empieza el presupuesto y repite la sesión), T011, T012 |
| FR-028 | T009 y T010 (los textos), T011, T012 |
| FR-029 | T010 (el plugin y la fuente estática), T011 (`sources.ts`) |
| FR-030 | T011 (`build-check`), T016 (la imagen web) |
| FR-031 | U2 como un solo PR; T014 |
| FR-032, FR-033 | De F11a; T016 los verifica |
| FR-034 | La compuerta de 0.2, paso 3, en cada unidad |
| FR-035 | T011 (`dist-content-check`), T014 (el sha256 de `dump-globals`) |
| FR-036 | T011 |
| FR-037 | T011 |
| FR-038 | T012 (el doble), T014 (los 106 sin editar) |
| FR-039 | T012 (su commit) |
| FR-040 | T012 (`content-api.spec.ts`) |
| FR-041 | T011, T012 |
| FR-042 | T015 |
| FR-043 | T013 |
| SC-001 | T011 (`dist-content-check`), T014 |
| SC-002 | T006 y T007, T012 (una sesión, y 16 respuestas 304 con un 200), T012 (el almacén bloqueado: 17 y 17) |
| SC-003 | T006 y T007 (los 18 casos), T011 (los 9 sin copia), T012 (con copia y sin copia) |
| SC-004 | T012 (el invariante y el token) |
| SC-005 | T004 y T005, T009 y T010, T011, T012 |
| SC-006 | T006 y T007, T011, T012 |
| SC-007 | T015 |
| SC-008 | T014 |
| SC-009 | T011, T014 y T016 |
| SC-010 | T015 |

## Descargas y permisos

- **Ninguna dependencia nueva** (FR-034). `package.json` y `package-lock.json` no cambian.
- **La alternativa, si el usuario la pide (D2 del informe):** `fake-indexeddb` 6.2.6, del registro de npm. Es Apache-2.0, pesa 490 834 bytes desempaquetados y no tiene dependencias. Va como dependencia de desarrollo y enmienda FR-034. No está en ninguna tarea.
- **Docker:** sólo K y con permiso, en T015 y T016.
- **El navegador de Playwright:** el que ya instaló F1 (`npm run test:e2e:install`).

## Riesgos y lo que quedó sin verificar

1. **El código de F11a puede diferir de su plan.**
   - *Mitigación:* T001 contrasta las firmas. Las tareas que tocan archivos de F11a (T010 y T012) dicen qué conservar si difieren.
2. **El orden de los temporizadores de `boot-check`** (R14). El arnés pasa a correrlos por vencimiento.
   - *Mitigación:* T011 corre todos los casos de hoy, y uno que falle por el orden se lleva al coordinador sin tocar sus valores.
3. **El tiempo de la red E2E.** Cada arranque sin copia pasa 17 porciones por el doble.
   - *Mitigación:* la copia deja en un pedido las navegaciones siguientes de cada prueba.
   - T014 compara el tiempo de la red con T001, y si crece más de un 50 %, lo informa.
4. **D1 cambia lo que muestra F11a sin servidor.** «No pudimos conectar con el taller» pasa a ser la vista de error de A2, y FR-009 de la spec 015 queda desactualizado.
   - *Mitigación:* lo decide el usuario. El hallazgo va a la hoja de ruta.
5. **IndexedDB puede desalojar la copia** (riesgo 8 de la spec). Se acepta.
6. **Un almacén que falla al borrar y después vuelve a funcionar** (riesgo residual 1 de la spec). Se acepta y se documenta: el invariante depende de que borrar funcione.
7. **Nada de los checks, del build ni de Docker corrió al planificar** (research.md, «Lo que no se verificó»).

## Complexity Tracking

| Decisión | Por qué hace falta | La alternativa más simple, y por qué no |
| --- | --- | --- |
| Un presupuesto compartido entre dos etapas (`AttemptBudget`) | FR-010 pide un solo tope para la sesión, las porciones, las esperas y las rondas, sin el ingreso | Un tope por etapa: el intento llegaba a 40 s, y el ingreso tenía que parar dos relojes |
| Un `fetch` propio para las porciones, aparte del cliente de F11a | Las porciones necesitan los encabezados de la respuesta y el 304 como éxito (R3) | Extender `ApiClient`: agranda un contrato de cuatro ítems por un solo consumidor |
