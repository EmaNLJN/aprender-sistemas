# Implementation Plan: D1c · El cliente v2 del progreso

**Branch**: `007-d1-progreso-sincronizacion` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de D1, en su parte c: el cliente v2 (FR-060 a FR-079, FR-085 y FR-086, con SC-004 y la parte de D1c de SC-008 a SC-011, FR-087 y FR-088), con las enmiendas al FR-070, al FR-074 y al FR-077 que registra su sesión de `## Clarifications` del 2026-10-28. Decisiones y consultas: [research-d1c.md](./research-d1c.md). Datos: [data-model-d1c.md](./data-model-d1c.md). Interfaz pública: [contracts/sync-client-d1c.md](./contracts/sync-client-d1c.md). Validación: [quickstart-d1c.md](./quickstart-d1c.md). Tareas: [tasks-d1c.md](./tasks-d1c.md). Los planes de D1a ([plan.md](./plan.md)) y de D1b ([plan-d1b.md](./plan-d1b.md)) fijan los contratos HTTP que este plan consume y no repite.

**Objetivo.** Que el progreso del alumno viva en un espacio de su cuenta en el navegador, se sincronice solo con `/api/sync` y `/api/progress`, y que importar y «Borrar todo» pasen por la API, sin que las vistas cambien lo que leen.

**Arquitectura.** Un motor puro en `features/progress-sync` compara cada estado de los almacenes con su línea base, encola operaciones con UUID, las envía en lotes y escribe en los almacenes las filas que vuelven. Una etapa de arranque (`progressStage`, entre la compuerta del contenido y las vistas) elige el modo, limpia los espacios ajenos, pide la foto y vincula el espacio de la cuenta en `versioned-storage`, así que los cuatro singletons de F2 leen y escriben ahí sin que nadie los reabra. F11d y F13 consumen el estado, los avisos y las acciones del contrato; D1c no dibuja.

**Stack.** TypeScript como ES modules; Zustand 5.0.15 (`zustand/vanilla`) para el estado; Vitest 5.0.3 en el proyecto `node` con fishery 2.4.0; Playwright 1.63.0 para los E2E; el cliente de la API de F11a; ninguna dependencia nueva.

> **Para quien lo implementa.**
>
> - **Qué leer.** Leé completas las «Restricciones globales», las «Reglas para todos los agentes», la sección 0 y la sección de tu unidad. `tasks-d1c.md` tiene una línea por tarea (T001 a T028) y remite acá.
> - **Dónde están los archivos.** El coordinador pidió los archivos de D1c en `specs/007-d1-progreso-sincronizacion/`, con `d1c` en el nombre; los de D1a y D1b quedan como están (research-d1b.md, R23, explica por qué los scripts de Spec Kit no sirven con nombres sufijados).
> - **El código ya corrió, en parte.** Los módulos de las unidades 1 y 2, `progress-storage`, el cambio de `versioned-storage`, el puerto de `signOut` y el envoltorio de `app/progress-backup` corrieron en una copia descartable del árbol, con TypeScript 6.0.2, Vitest 5.0.3, Zustand 5.0.15, fishery 2.4.0, el ESLint y el Prettier del repositorio: 114 pruebas en verde, `tsc` y ESLint sin avisos, y `sha256Hex` igual a los 274 `starterHash` de `build/curriculum.meta.json`. La capa `app/progress-sync` pasó `tsc` contra tipos de reemplazo de las entidades. **No corrieron:** los cambios en las entidades, `boot-check`, los E2E, la integración con `main.tsx` y nada contra la base real (F11a completa, A3, A4 y F8 no están en `master`). T001 contrasta cada firma con la base.

## Summary

D1c es la tercera parte de D1: la mecánica del cliente. El enfoque, con sus razones en research-d1c.md:

- **La costura es el almacenamiento, no las vistas (R2 y R3).** `openVersionedStore` usa una vinculación que la etapa de D1c fija antes de `legacyViews`: el espacio `taller-v2:<id>:…` en el navegador, o una memoria en los modos compartido y bloqueado. Los cuatro almacenes de F2 siguen siendo los mismos singletons (FR-061), y con el almacenamiento bloqueado dicen lo mismo que hoy, así que la red de F1 no cambia.
- **La copia local son dos cosas (R4).** La forma v1 que leen las vistas, en las claves del espacio, y la copia del servidor con sus relojes y lápidas (`taller-v2:<id>:copia`). La cola va aparte (`taller-v2:<id>:cola`) y la comparten las pestañas de la cuenta (R5).
- **Las operaciones salen de comparar estados (data-model-d1c.md §5).** Cada aviso de `changes` de un almacén produce las operaciones de lo que cambió, juntadas por campo con un `id` nuevo. Nunca sale nada de lo que escriben las ejecuciones o la importación (FR-009).
- **Las filas vuelven a la forma v1 campo por campo (R6).** Una fila ausente no borra nada; un cambio pendiente gana salvo que la fila sea más nueva; lo que el contenido publicado no conoce queda en la copia (riesgo 7 de A3).
- **Cada respuesta tiene su camino (R10).** Sin red, se reintenta; con 401, se espera el ingreso; con `account_mismatch`, se detiene; con `epoch_mismatch`, la cola pasa a una copia descargable y se carga la época nueva; con `client_outdated`, se conserva y se detiene.
- **Importar y «Borrar todo» pasan por la API (R12, R13 y R16).** El v1 del navegador se ofrece con su resumen y se importa con un sí; «Importar» de Método va al servidor con `source: 'export'`; «Borrar todo» usa el paso del servidor de F8, no encola nada y nunca toca las claves v1 que la cuenta no importó (FR-074 enmendado). Una guarda impide el solape (F8-Q3).
- **«Salir» y el modo compartido son mecánica (R14 y R15).** `signOut` recibe un puerto que envía la cola antes del cierre, avisa cada fase a la pantalla y aplica conservar o descartar después del cierre; sin la pregunta de F13, conserva. D1c no dibuja nada de «Salir». «Computadora compartida» borra el espacio en ese momento y sigue en memoria.

## Technical Context

**Language/Version**: TypeScript 6.0.2 como ES modules en `frontend/src/` y `qa/`; JavaScript legacy en `frontend/*.js`. Node 24, Vite 8.3.2, Vitest 5.0.3 y `@playwright/test` 1.63.0.

**Primary Dependencies**: ninguna nueva. Usa Zustand 5.0.15, React 19.2.8 (dos contextos), fishery 2.4.0 en las specs y el cliente de la API de F11a (`shared/api/http`).

**Storage**: `localStorage`, con el espacio `taller-v2:<id>:…`, el archivo `taller-v1-importado:<id>` y la elección `taller-v2-compartida:<id>` (data-model-d1c.md §1). Las cuatro claves v1 no se escriben ni se borran fuera de una importación confirmada (FR-072).

**Testing**: Vitest en el proyecto `node` (las specs junto a cada módulo, con el almacenamiento y la red simulados en sus interfaces), `qa/boot-check.ts`, `qa/seams-guard-check.ts` y los E2E de Playwright contra el build servido, con el doble de la API de F11a. Los valores esperados salen de los contratos (http.md, http-d1b.md, data-model-d1c.md y sync-client-d1c.md), del fixture congelado `qa/fixtures/shared/import-cases.json` y de `build/curriculum.meta.json`, nunca del módulo que se prueba.

**Target Platform**: navegador moderno (ES2022, sin APIs de contexto seguro), Nginx en Docker; Linux y macOS.

**Project Type**: aplicación web, el front del taller. Cambio de comportamiento: dónde y cómo se persiste el progreso.

**Performance Goals**: ninguna medida nueva. Los tiempos del cliente (R7) dan, con 1.000 cuentas activas, como mucho los 100 pedidos por segundo que la spec contrasta en SC-010.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**: 28 tareas en 7 unidades; unos 30 archivos nuevos y unos 20 modificados.

## Restricciones globales

Valores exactos; ninguna tarea los cambia.

| Qué | Valor | Fuente |
| --- | --- | --- |
| Formato del sobre | `2` | http.md §3.1; http-d1b.md §3.1 y §4.1 |
| Operaciones por lote | 200 | http.md §3.7 |
| Bytes por lote | 1 572 864 | research-d1c.md, R7 (bajo los 2 MiB de Nginx) |
| Bytes por lote con `keepalive` | 61 440 | MDN, `RequestInit.keepalive` (64 KiB) |
| Pedidos de sincronización por minuto | 60 | FR-063; http.md §3.7 |
| Espera después de un cambio | 2 000 ms; con cambios seguidos, 10 000 ms como mucho | research-d1c.md, R7 |
| Reintentos | 5 000, 15 000, 30 000 y 60 000 ms, y después 60 000; `Retry-After` manda | research-d1c.md, R7 |
| Espera de la foto al arrancar | 3 000 ms con copia local; 10 000 ms sin ella | research-d1c.md, R8 |
| Vencimiento de un espacio ajeno | 30 días (2 592 000 000 ms) | FR-069 |
| Aviso del reloj | más de 120 000 ms, en cualquier sentido | FR-078; F13 FR-028 |
| Espacio de la cuenta | `taller-v2:<id>:…`; los registros, `copia`, `cola` y `copia-epoca` | FR-067; data-model-d1c.md §1 |
| Archivo del v1 importado | `taller-v1-importado:<id>` | FR-072 |
| Elección del modo compartido | `taller-v2-compartida:<id>` = `'1'` | research-d1c.md, R15 |
| UUID | v4 en minúsculas, con `crypto.getRandomValues` | FR-062; http.md §3.1 |
| Instantes | ISO 8601 en UTC con milisegundos y `Z` (`toISOString()`) | http.md §1 |
| Tope de `dist/index.html` | `BOOT_SIZE_LIMIT` de `qa/build-check.ts`: 1 500 000 caracteres (PR #76) | TR-8; decisión del 2026-10-28 (noche) |
| Red de E2E | La de T001, sin editar salvo la lista que aprueba el usuario (research-d1c.md, R19) | constitución, principio II |
| Errores esperados en E2E | `pageIssues.expectIssue(/status of NNN/, …)` con el código exacto; un pedido abortado, `/net::ERR_FAILED/`. Nunca `/Failed to load resource/` | TR-11; decisión del 2026-10-28 (noche) |
| El doble de la API | El de F11a, con la ruta antes del CSRF y `ApiCall.search`; D1c suma rutas por omisión con `this.on` y no trae `query` ni otro `replyTo` | decisión del 2026-10-28 (noche) |
| Stubs del rojo | `const` tipados (`const f: (a: A) => R = () => { throw new Error('not implemented'); };`) | TR-2 |
| Comentarios | Sólo una referencia puntual (un FR, una decisión) o una función compleja | `AGENTS.md` |
| Textos al alumno | Los de contracts/sync-client-d1c.md §8, sin cambiarlos | — |

## Constitution Check

| Principio | Cómo se cumple |
| --- | --- |
| I. `AGENTS.md` es la fuente | El plan sigue `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y el ADR 0008; los cambios de esas guías van como tareas (T027) |
| II. TDD y pruebas útiles | Cada tarea empieza con la spec que falla y su motivo; los esperados salen de los contratos y de fixtures congeladas (import-cases, el meta del currículo) |
| III. Código entendible | Funciones chicas, nombres del dominio y ningún aviso de complejidad en lo que corrió (ESLint del repositorio) |
| IV. IDs estables | Las operaciones nombran el contenido por su clave (FR-005); las etapas, por su id; nada se borra fuera de «Borrar todo» |
| V. Capas y contratos | Modelo puro en `features/progress-sync`, armado en `app/progress-sync`, puerto estructural en `features/sign-in`; ningún store nuevo más allá del estado de D1c, que es el primer caso real |
| VI. Español y accesibilidad | Textos al alumno en español en el contrato; D1c no dibuja, así que no cambia teclado ni movimiento |
| VII. Secretos y salidas | Nada nuevo en Git; el progreso sigue fuera |
| VIII. Flow-forward | D1 sigue en curso (D1c es su última parte): las enmiendas del FR-070, el FR-074 y el FR-077 van en una sesión fechada de `## Clarifications` y en su propio commit |

## Decisiones ya tomadas que el plan aplica

| Decisión | Dónde |
| --- | --- |
| D1, Q3: al salir se envía la cola; si no salió, se pregunta; el modo compartido; los espacios vencen a los 30 días | T011, T020 |
| D1, Q4: D1c entra en servicio después de A4 | T001 (compuerta) |
| F11-Q5: «computadora compartida» se elige en «Tu cuenta» y borra el espacio en ese momento (enmienda el FR-070) | T011 (`enterSharedMode`), la enmienda de la spec |
| FR-068 de D1: D1c se queda con el envío de la cola al salir, la limpieza del espacio y la interfaz que consume la pantalla; F13 dibuja todo lo que se ve (la espera, la pregunta, la nota, la línea, la franja y los diálogos), por su L7, aceptada con el merge de su spec (PR #79), que reemplaza la línea de la noche que se lo daba a F11d | T011, T020 |
| F8-L7: la cláusula de las claves v1 del FR-074 rige desde D1c | T013, T019, T025 |
| F8-Q3: la guarda contra el solape es de D1c | T011 (`exclusive`), T019 |
| El doble de la API canónico, la lista blanca angosta y los stubs tipados | «Restricciones globales» |
| El tope de 1 500 000 | T026, T028 |
| F13, Q1 a Q5 y su tabla «Lo que F13 supone de D1c» | contracts/sync-client-d1c.md §4 |

## Project Structure

### Documentation (this feature)

```text
specs/007-d1-progreso-sincronizacion/
├── spec.md                      # D1 entera; D1c suma su sesión de Clarifications (2026-10-28)
├── plan.md, research.md, …      # D1a (no se tocan)
├── plan-d1b.md, research-d1b.md, … # D1b (no se tocan)
├── plan-d1c.md                  # este archivo
├── research-d1c.md
├── data-model-d1c.md
├── quickstart-d1c.md
├── tasks-d1c.md
└── contracts/
    ├── http.md, http-d1b.md, merge-rules.md, import-fixture.md   # D1a y D1b
    └── sync-client-d1c.md       # la interfaz para F11d, F13 y F8
```

### Source Code (repository root)

**Se crean:**

| Archivo | Responsabilidad | Tarea |
| --- | --- | --- |
| `frontend/src/shared/lib/well-formed.ts` (+ spec) | Reemplazar sustitutos sueltos por U+FFFD, en un texto o en un valor JSON | T002 |
| `frontend/src/shared/lib/sha256-hex.ts` (+ spec) | SHA-256 puro sobre UTF-8, para `starterHash` | T002 |
| `frontend/src/features/progress-sync/model/operations.ts` (+ spec) | Las dieciséis operaciones del cable y su clave de campo | T003 |
| `frontend/src/features/progress-sync/model/types.ts` | El estado y las acciones del contrato | T003 |
| `frontend/src/features/progress-sync/model/sync-limits.ts` | Los topes y los tiempos (R7) | T003 |
| `frontend/src/features/progress-sync/model/sync-texts.ts` | Los textos que devuelve D1c | T003 |
| `frontend/src/features/progress-sync/model/uuid-v4.ts` (+ spec) | El UUID v4 | T003 |
| `frontend/src/features/progress-sync/model/progress-snapshot.ts` | Las cuatro formas v1 juntas, el contexto del contenido y el estado en blanco | T004 |
| `frontend/src/features/progress-sync/model/server-rows.ts` (+ factory) | Las filas de la foto y la lectura de las respuestas | T004 |
| `frontend/src/features/progress-sync/model/progress-context.fixture.ts` | Un contexto de prueba con ids escritos a mano | T004 |
| `frontend/src/features/progress-sync/model/diff-progress.ts` (+ spec) | De dos estados v1 a operaciones | T004 |
| `frontend/src/features/progress-sync/model/merge-areas.ts` (+ spec) | Juntar un delta con la copia | T005 |
| `frontend/src/features/progress-sync/model/apply-rows.ts` (+ spec) | De las filas a la forma v1 | T005 |
| `frontend/src/features/progress-sync/model/queue.ts` (+ spec) | Encolar, juntar, armar lotes y resolver respuestas | T006 |
| `frontend/src/features/progress-sync/model/account-space.ts` (+ spec) | El espacio, la memoria y la limpieza de FR-069 | T007 |
| `frontend/src/features/progress-sync/model/sync-records.ts` | Leer y escribir `copia`, `cola` y `copia-epoca` | T007 |
| `frontend/src/features/progress-sync/model/v1-import.ts` (+ spec) | El candidato v1, los cuerpos de la importación y el archivo | T008 |
| `frontend/src/features/progress-sync/model/reevaluate.ts` (+ spec) | Volver a corregir una respuesta `stale_content` | T008 |
| `frontend/src/features/progress-sync/api/sync-transport.ts` (+ spec) | Los cuatro pedidos y cómo se lee cada falla | T010 |
| `frontend/src/features/progress-sync/model/create-progress-sync.ts` (+ spec y fixture) | El motor | T011 |
| `frontend/src/features/progress-sync/ui/progress-sync-context.ts` | El contexto de React para F11d y F13 | T011 |
| `frontend/src/features/progress-sync/index.ts` | La API pública del slice | T011 |
| `frontend/src/shared/lib/progress-storage.ts` (+ spec) | La vinculación del almacenamiento del progreso | T013 |
| `frontend/src/app/progress-sync/content-version.ts` | La versión del contenido publicado | T015 |
| `frontend/src/app/progress-sync/progress-context.ts` (+ spec) | El contexto real, desde `getContent()` | T015 |
| `frontend/src/app/progress-sync/store-adapters.ts` (+ spec) | Los cuatro almacenes como `AreaStore` | T015 |
| `frontend/src/app/progress-sync/app-progress-sync.ts` (+ spec) | El motor único y el arranque | T016 |
| `frontend/src/app/progress-sync/progress-stage.ts` | La etapa `progressStage` | T016 |
| `frontend/src/app/progress-backup/with-progress-sync.ts` (+ spec) | Importar y «Borrar todo» con D1c | T019 |
| `frontend/src/features/sign-in/ui/sign-out-progress-context.ts` | El puerto de «Salir» como contexto | T020 |
| `qa/e2e/specs/progress-sync.spec.ts` | Los E2E de D1c | T025 |

**Se modifican:**

| Archivo | Qué cambia | Tarea |
| --- | --- | --- |
| `frontend/src/shared/lib/versioned-storage.ts` | Usa la vinculación cuando no recibe `storage`; en memoria no escribe | T013 |
| `frontend/src/entities/guide/model/route-store.ts`, `entities/exercise/model/lab-store.ts`, `entities/campaign/model/create-campaign-engine.ts`, `entities/systems-workshop/model/create-systems-engine.ts` y sus índices | Exportan la clave como constante; los motores suman `parseSaved`; el índice del laboratorio exporta `parseSavedLab` | T014 |
| `frontend/src/entities/campaign/model/types.ts`, `entities/systems-workshop/model/types.ts` | `parseSaved` en la interfaz del motor | T014 |
| `qa/lib/seams-guard.ts`, `qa/seams-guard-check.ts` | La excepción de R4 para el armado de D1c | T014 |
| `frontend/src/app/boot/content-stage.ts` (A3) | `afterPublish` recuerda la versión publicada | T017 |
| `frontend/src/app/main.tsx` y `qa/load-order-check.ts` | `progressStage` entre `contentGate` y `legacyViews` | T017 (K) |
| `qa/lib/content-server.ts`, `qa/lib/boot-harness.ts` y `qa/boot-check.ts` | La API del progreso por omisión, la siembra en el espacio y los escenarios de FR-072 | T017 |
| `frontend/src/app/progress-backup/app-progress-backup.ts` (F8) | Devuelve la instancia envuelta | T019 |
| `frontend/src/features/sign-in/model/sign-out.ts` (+ spec) e `index.ts` | El puerto `progress` y `choose` | T020 |
| `frontend/src/pages/account/ui/SignOutSection.tsx` y `features/sign-in/ui/PrivacyReacceptance.tsx` (F11a) | Pasan el puerto; `stayed` no cierra | T020 |
| `frontend/src/app/account/AccountRoot.tsx` (F11a) | Provee los dos contextos | T020 |
| `frontend/lab.js` (o la revisión de F7b, si ya entró) | La línea de intentos con el conteo del servidor (D1c-6) | T021 |
| `qa/e2e/fixtures/api-double.ts`, `qa/e2e/lib/api-contract.ts` | `POST /api/sync` por omisión y la foto completa en `GET /api/progress` | T023 |
| `qa/e2e/fixtures/storage-control.ts` y `qa/e2e/fixtures/index.ts` | La traducción al espacio de la cuenta de la sesión | T023 |
| Los E2E que T001 inventaría y el usuario aprueba | Lo que la traducción no cubre | T024 |
| `docs/architecture.md`, `qa/AGENTS.md`, `AGENTS.md` | El slice, la etapa, la costura y los checks | T027 |
| `specs/007-d1-progreso-sincronizacion/spec.md` | La sesión de `## Clarifications` con las tres enmiendas | ya hecho en este PR de plan |

## Review Focus

Cinco entradas o fallas que la spec implica y que ninguna prueba de una tarea ejercitaría sin esta lista. Cada una tiene su prueba, ya agregada a la tarea dueña.

1. **Dos pestañas de la misma cuenta comparten la cola** (Edge Cases de la spec). Si juntar cambios conservara el `id`, una pestaña podría mandar el valor viejo con el `id` que la otra manda con el nuevo, y el servidor respondería `uuid_reused`: el cambio nuevo no se aplicaría. **Prueba:** «two tabs of one account share the queue and a change never reuses an id on its way», en la spec del motor (T011).
2. **El almacenamiento se llena mientras el alumno estudia.** Sin un respaldo, la cola se perdería en silencio. **Prueba:** «moves the queue to memory and reports blocked when writing the space fails, without losing it» (T011).
3. **Arrancar con las claves v1 congeladas no escribe nada** (FR-072, y lo que `qa/boot-check.ts` ya afirma). Con D1c, una foto vacía tampoco debe dejar la copia ni la proyección en el espacio. **Pruebas:** «reads the photo and reports synced, writing nothing for a new account (FR-072)» (T011), el escenario de `boot-check` «D1c: arrancar con el progreso de master no lo lee, no lo escribe y no escribe el espacio» (T017) y el E2E «a boot with the frozen v1 keys writes nothing» (T025).
4. **Una copia vieja del contenido no pierde filas** (riesgo 7 de A3). Un arranque sin servidor con el contenido anterior no conoce los ejercicios nuevos. **Prueba:** «keeps in the copy the rows an older content does not know, and writes them once it does» (T011).
5. **«Borrar todo» no toca las claves v1 que la cuenta no importó** (FR-074 enmendado, F8-L7). **Prueba:** el E2E ««Borrar todo» clears the account space and leaves the v1 keys of the browser» (T025).

## Unidades, dueños y orden

| Unidad | Tareas | Dueño | Qué entrega | Compuerta |
| --- | --- | --- | --- | --- |
| U0 | T001 | K (coordinador) | La línea base, las detecciones y el inventario de E2E | — |
| U1 | T002 a T009 | M (modelo) | El modelo puro, sin cableado | T009 |
| U2 | T010 a T012 | E (motor) | El transporte y el motor, con dobles | T012 |
| U3 | T013 a T018 | S (costura) y K | La vinculación, las entidades, el armado, la etapa y `boot-check` | T018 |
| U4 | T019 a T022 | B (borde) | Importar, «Borrar todo», «Salir» y la línea de intentos | T022 |
| U5 | T023 a T026 | Q (red) | El doble, la traducción, las ediciones aprobadas y los E2E nuevos | T026 |
| U6 | T027 y T028 | K | La documentación y el cierre | — |

**El orden.** U1 y U2 son secuenciales (E consume los tipos de M). U3 empieza con U2 en verde. U4 espera a U3. U5 empieza con U3 (el doble y la traducción) y termina después de U4. Un PR por unidad, contra la rama base de D1c.

**Paralelismo.** T013 y T014 (S) pueden correr a la vez que T010 y T011 (E): tocan archivos disjuntos. `main.tsx`, `package.json`, las configuraciones y la documentación los integra K.

**La entrada en servicio (decisión del usuario 2).** U1, U2 y U4 no cambian lo que el alumno ve mientras U3 no vincule el espacio. U3 y U5 se integran en la misma entrega que F11d (research-d1c.md, R23).

## Reglas para todos los agentes

- **TDD.** Cada tarea empieza por la spec que falla. Escribí los stubs del rojo como `const` tipados (TR-2): `export const enqueue: (...) => Operation[] = () => { throw new Error('not implemented'); };`. Corré la spec, mirá que falle por el comportamiento y no por un import, implementá, corré en verde.
- **Los esperados** salen del contrato (http.md, http-d1b.md, data-model-d1c.md, sync-client-d1c.md), de `qa/fixtures/shared/import-cases.json` o de `build/curriculum.meta.json`. Nunca del módulo que se prueba.
- **Comentarios:** sólo los que trae el código de este plan, que son referencias puntuales. No sumes otros.
- **Specs** en `frontend/src/**/*.spec.ts`, proyecto `node`, importando `describe`, `it` y `expect` de `vitest`. Un fixture compartido va en `*.fixture.ts`; las factories, en `*.factory.ts`.
- **Checks por tarea:** `npx vitest run --project node <archivos>`, `npx tsc -p frontend/tsconfig.app.json --noEmit`, `npx eslint <archivos>` y `npx prettier --check <archivos>`. Antes de cada commit, `git diff --check`.
- **Commits:** en inglés, con el formato del repositorio (`feat(progress-sync): …`, `test(progress-sync): …`), y el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **E2E:** Page Objects con nombres accesibles; cada error de consola esperado con `expectIssue(/status of NNN/, 'motivo')` o `/net::ERR_FAILED/`. Si recargás después de un cambio con nuqs, esperá la URL (TR-1). Para detectar recargas, `qa/e2e/lib/document-marker.ts` (TR-7).
- **No toques** los E2E congelados fuera de la lista que aprobó el usuario (T024), ni los planes de D1a y D1b.

## 0. Línea base y compuerta de cada unidad (K)

### Tarea T001 · La línea base, las detecciones y el inventario

**Archivos:** ninguno se modifica. El resultado va a la descripción del PR de U0 y al ledger del coordinador.

**Pasos:**

1. **La base.** La rama de D1c sale de `master` con F11a, A3, A4 y F8, o de la cadena de PR apilados si alguno falta (TR-12). Si falta A3 o A4, D1c no empieza (FR-079).
2. **Las detecciones** (cada una con su `git grep`; si una falla, se detiene y se informa):

| # | Qué | Comando | Si no está |
| --- | --- | --- | --- |
| B1 | F11a completa: «Salir» y la reaceptación | `git grep -l "SignOutSection\|PrivacyReacceptance" -- frontend/src` | D1c espera |
| B2 | A3: `afterPublish` y `forgetContentCopy` | `git grep -n "function afterPublish\|export async function forgetContentCopy" -- frontend/src` | D1c espera |
| B3 | A3: `signOut` recibe `forgetContentCopy` | `git grep -n "forgetContentCopy" -- frontend/src/features/sign-in/model/sign-out.ts` | T020 parte de la firma de F11a: sin `forgetContentCopy` |
| B4 | A4: `sanitizeResult` conserva `attemptId` | `git grep -n "isAttemptId" -- frontend/src/entities/exercise/model/lab-state.ts` | D1c espera (Q4) |
| B5 | F8: el armado y el paso del servidor | `git grep -n "export function appProgressBackup\|export function createServerReset" -- frontend/src/app/progress-backup` | D1c espera |
| B6 | F8: `GET /api/progress` por omisión en el doble | `git grep -n "'GET /api/progress'" -- qa/e2e/fixtures/api-double.ts` | T023 lo agrega entero |
| B7 | A3: `contentVersion` en el doble | `git grep -n "contentVersion: string" -- qa/e2e/fixtures/api-double.ts` | T023 usa `CONTENT_VERSION` |
| B8 | La revisión del laboratorio: legacy o F7b | `git grep -n "Revisar es parte de aprender" -- frontend/lab.js frontend/src/pages` | T021 elige la variante |
| B9 | La excepción de R4 de F8 en la guarda | `git grep -n "progress-backup" -- qa/lib/seams-guard.ts` | T014 la crea con el mismo mecanismo |
| B10 | `PROGRESS_API` de F8 en el servidor de `boot-check` | `git grep -n "PROGRESS_API" -- qa/lib/content-server.ts` | T017 lo agrega entero |

3. **Las cuentas** (TR-15): `npm test` (checks y pruebas de Vitest), `npm run lint` (avisos), `npm run build`, el tamaño de `dist/index.html` contra `BOOT_SIZE_LIMIT` (1 500 000), `node qa/load-order-check.ts`, y `npm run test:e2e` (la cantidad de escenarios). Se anotan como esperados de las compuertas.
4. **El inventario de E2E (R19).** Listá, con archivo y línea, cada uso que la traducción de `StorageControl` (T023) no cubre:
   - `page.evaluate` que lee o escribe una clave v1 en `localStorage` (en `master`, `qa/e2e/specs/project.spec.ts:59`);
   - lecturas de `LAB_KEY`, `LAB_WRITE` o `SYNC_WRITES` de `qa/e2e/lib/lab-storage.ts` fuera de `storage.writes()`;
   - `expect(api.calls…)` o `api.callsTo(…).length` que cuentan todos los pedidos (D1c suma `GET /api/progress` en cada arranque y `POST /api/sync` con cambios);
   - los E2E de F8 que esperan las claves v1 borradas después de «Borrar todo» (ahora se borra el espacio, FR-074 enmendado);
   - `watchStorageAccess` con conteos de lecturas o escrituras después de la compuerta;
   - los escenarios de `qa/boot-check.ts` que siembran o leen claves v1.
   La lista va al usuario para aprobarla (decisión 1). T024 edita sólo lo aprobado.
5. **El commit:** ninguno. El PR de U0 es `docs(specs): D1c implementation baseline (D1c U0)` con las cuentas y el inventario en la descripción.

### La compuerta de cada unidad (T009, T012, T018, T022 y T026)

Cada compuerta corre, en este orden, y anota el resultado en la descripción del PR de la unidad:

```sh
npm run test:unit
npm test
npm run lint
npm run format:check
git diff --check
```

Desde U3 suma `npm run build`, el tamaño de `dist/index.html` (bajo 1 500 000) y `node qa/load-order-check.ts`; desde U5, `npm run test:e2e`. La compuerta falla si una cuenta de T001 baja sin una razón escrita en este plan, o si aparece un aviso de complejidad nuevo.

## 1. Unidad 1 · El modelo puro (dueño M)

Todo vive en `frontend/src/features/progress-sync/model/` salvo los dos módulos de `shared/lib`. Nada se cablea: ningún archivo de `app/` ni de las entidades cambia en esta unidad.

### Tarea T002 · Textos bien formados y SHA-256 (`shared/lib`)

**Archivos:** `frontend/src/shared/lib/well-formed.ts` y `well-formed.spec.ts`; `frontend/src/shared/lib/sha256-hex.ts` y `sha256-hex.spec.ts`.

**Produce:**

```ts
export function wellFormed(text: string): string;
export function wellFormedDeep(value: unknown): unknown;
export function sha256Hex(text: string): string;
```

**Pasos:**

1. Escribí las dos specs:

`frontend/src/shared/lib/well-formed.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { wellFormed, wellFormedDeep } from './well-formed';

describe('wellFormed', () => {
  it('replaces each lone surrogate with U+FFFD and keeps pairs (MDN, toWellFormed)', () => {
    expect(wellFormed('ab\uD800')).toBe('ab�');
    expect(wellFormed('\uDFFFab')).toBe('�ab');
    expect(wellFormed('ab😄c')).toBe('ab😄c');
    expect(wellFormed('\uD800𐀀')).toBe('�𐀀');
  });

  it('walks objects and lists', () => {
    expect(wellFormedDeep({ notes: ['a\uD800'], n: 1 })).toEqual({
      notes: ['a�'],
      n: 1,
    });
  });
});
```

`frontend/src/shared/lib/sha256-hex.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import curriculum from '../../../../build/curriculum.json';
import meta from '../../../../build/curriculum.meta.json';
import { sha256Hex } from './sha256-hex';

interface StarterRecord {
  readonly id: string;
  readonly starter: string;
}

function exercisesOf(catalogs: Record<string, Record<string, StarterRecord[]>>): StarterRecord[] {
  return Object.values(catalogs).flatMap((group) => Object.values(group).flat());
}

describe('sha256Hex', () => {
  it('gives the NIST vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes the UTF-8 bytes across block boundaries', () => {
    expect(sha256Hex('a'.repeat(55))).toBe(
      '9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318',
    );
    expect(sha256Hex('a'.repeat(56))).toBe(
      'b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a',
    );
    expect(sha256Hex('ñ')).toBe('024bb90888ca89a15a19e9bdd8c712bfb070465fce1ef25e43c170ea44fc5e5f');
  });

  it('gives the starterHash that tools/content computes with Node for every exercise', () => {
    const catalogs = curriculum as unknown as Record<string, Record<string, StarterRecord[]>>;
    const exercises = exercisesOf({
      lab: catalogs.lab,
      quests: catalogs.quests,
      cores: catalogs.cores,
    });
    const hashes = meta.exercises as Record<string, { starterHash: string }>;
    expect(exercises).toHaveLength(Object.keys(hashes).length);
    for (const exercise of exercises) {
      expect(sha256Hex(JSON.stringify(exercise.starter)), exercise.id).toBe(
        hashes[exercise.id].starterHash,
      );
    }
  });
});
```

2. Stubs del rojo: `export const wellFormed: (text: string) => string = () => { throw new Error('not implemented'); };`, lo mismo para `wellFormedDeep` y `sha256Hex`. `npx vitest run --project node frontend/src/shared/lib/well-formed.spec.ts frontend/src/shared/lib/sha256-hex.spec.ts`: fallan con «not implemented». La spec de SHA-256 lee `build/curriculum.json` y `build/curriculum.meta.json`; si no existen, corré antes `npm run curriculum`.
3. Implementá:

`frontend/src/shared/lib/well-formed.ts`:

```ts
import { isPlainObject } from './is-plain-object';

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

// String.prototype.toWellFormed is ES2024 and the front's lib is ES2022: same result, by hand.
export function wellFormed(text: string): string {
  return text.replace(LONE_SURROGATE, '�');
}

export function wellFormedDeep(value: unknown): unknown {
  if (typeof value === 'string') return wellFormed(value);
  if (Array.isArray(value)) return value.map(wellFormedDeep);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, wellFormedDeep(item)]),
    );
  }
  return value;
}
```

`frontend/src/shared/lib/sha256-hex.ts`:

```ts
const ROUND_CONSTANTS = Uint32Array.of(
  0x428a2f98,
  0x71374491,
  0xb5c0fbcf,
  0xe9b5dba5,
  0x3956c25b,
  0x59f111f1,
  0x923f82a4,
  0xab1c5ed5,
  0xd807aa98,
  0x12835b01,
  0x243185be,
  0x550c7dc3,
  0x72be5d74,
  0x80deb1fe,
  0x9bdc06a7,
  0xc19bf174,
  0xe49b69c1,
  0xefbe4786,
  0x0fc19dc6,
  0x240ca1cc,
  0x2de92c6f,
  0x4a7484aa,
  0x5cb0a9dc,
  0x76f988da,
  0x983e5152,
  0xa831c66d,
  0xb00327c8,
  0xbf597fc7,
  0xc6e00bf3,
  0xd5a79147,
  0x06ca6351,
  0x14292967,
  0x27b70a85,
  0x2e1b2138,
  0x4d2c6dfc,
  0x53380d13,
  0x650a7354,
  0x766a0abb,
  0x81c2c92e,
  0x92722c85,
  0xa2bfe8a1,
  0xa81a664b,
  0xc24b8b70,
  0xc76c51a3,
  0xd192e819,
  0xd6990624,
  0xf40e3585,
  0x106aa070,
  0x19a4c116,
  0x1e376c08,
  0x2748774c,
  0x34b0bcb5,
  0x391c0cb3,
  0x4ed8aa4a,
  0x5b9cca4f,
  0x682e6ff3,
  0x748f82ee,
  0x78a5636f,
  0x84c87814,
  0x8cc70208,
  0x90befffa,
  0xa4506ceb,
  0xbef9a3f7,
  0xc67178f2,
);

const INITIAL_HASH = Uint32Array.of(
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
);

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function paddedMessage(bytes: Uint8Array): DataView {
  const total = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(total);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(total - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(total - 4, bitLength >>> 0);
  return view;
}

function expandWords(view: DataView, offset: number, words: Uint32Array): void {
  for (let index = 0; index < 16; index++) words[index] = view.getUint32(offset + index * 4);
  for (let index = 16; index < 64; index++) {
    const early = words[index - 15];
    const late = words[index - 2];
    const sigma0 = rotateRight(early, 7) ^ rotateRight(early, 18) ^ (early >>> 3);
    const sigma1 = rotateRight(late, 17) ^ rotateRight(late, 19) ^ (late >>> 10);
    words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
  }
}

function compress(hash: Uint32Array, words: Uint32Array): void {
  const state = Uint32Array.from(hash);
  for (let index = 0; index < 64; index++) {
    const [a, b, c, d, e, f, g, h] = state;
    const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
    const choice = (e & f) ^ (~e & g);
    const first = (h + sum1 + choice + ROUND_CONSTANTS[index] + words[index]) >>> 0;
    const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const second = (sum0 + majority) >>> 0;
    state.set([(first + second) >>> 0, a, b, c, (d + first) >>> 0, e, f, g]);
  }
  for (let index = 0; index < 8; index++) hash[index] = (hash[index] + state[index]) >>> 0;
}

export function sha256Hex(text: string): string {
  const view = paddedMessage(new TextEncoder().encode(text));
  const hash = Uint32Array.from(INITIAL_HASH);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < view.byteLength; offset += 64) {
    expandWords(view, offset, words);
    compress(hash, words);
  }
  return Array.from(hash, (word) => word.toString(16).padStart(8, '0')).join('');
}
```

4. Las dos specs en verde: 2 y 3 pruebas; la última compara los 274 `starterHash`.
5. Checks de la tarea (Reglas). Commit: `feat(shared): well-formed texts and a SHA-256 that works without a secure context`.

### Tarea T003 · Las operaciones, el estado y los topes

**Archivos:** `operations.ts` y `operations.spec.ts`; `types.ts`; `sync-limits.ts`; `sync-texts.ts`; `uuid-v4.ts` y `uuid-v4.spec.ts`.

**Produce:** los tipos de data-model-d1c.md §3.1 y contracts/sync-client-d1c.md §2 y §3, y:

```ts
export function fieldKeyOf(body: OperationBody): string;
export function isLanguage(value: unknown): value is Language;
export function isFocusMinutes(value: unknown): value is FocusMinutes;
export function isConfidence(value: unknown): value is Confidence;
export type FillRandom = (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;
export function uuidV4(fill: FillRandom): string;
```

**Pasos:**

1. Escribí las specs:

`frontend/src/features/progress-sync/model/operations.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fieldKeyOf, type OperationBody } from './operations';

const CV = '0123456789abcdef0123456789abcdef';

describe('fieldKeyOf', () => {
  it.each<[OperationBody, string]>([
    [
      { type: 'exercise.reflection', exerciseId: 'rust-01', text: 'x' },
      'exercise.reflection|rust-01',
    ],
    [{ type: 'exercise.assist', exerciseId: 'rust-01', assisted: true }, 'exercise.assist|rust-01'],
    [
      {
        type: 'checkpoint.answer',
        worldId: 'w',
        answer: 0,
        passed: false,
        contentVersion: CV,
      },
      'checkpoint.answer|w',
    ],
    [{ type: 'workshop.note', workshopId: 'ws', language: 'go', text: '' }, 'workshop.note|go|ws'],
    [
      {
        type: 'workshop.objective',
        workshopId: 'ws',
        language: 'rust',
        objectiveKey: 'hit',
      },
      'workshop.objective|rust|ws|hit',
    ],
    [
      {
        type: 'workshop.step',
        workshopId: 'ws',
        language: 'rust',
        stepKey: 'e2',
        marked: true,
      },
      'workshop.step|rust|ws|e2',
    ],
    [
      { type: 'route.mark', kind: 'favorite', itemKey: 'book', marked: false },
      'route.mark|favorite|book',
    ],
    [
      { type: 'route.quiz', stepId: 'rust-1-1', answer: 1, contentVersion: CV },
      'route.quiz|rust-1-1',
    ],
    [{ type: 'route.note', language: 'rust', field: 'next', body: 'b' }, 'route.note|rust|next'],
    [
      { type: 'preference.set', name: 'labSelectedGo', value: 'go-01' },
      'preference.set|labSelectedGo',
    ],
  ])('keys %o as %s (data-model-d1c.md §3.2)', (body, key) => {
    expect(fieldKeyOf(body)).toBe(key);
  });
});
```

`frontend/src/features/progress-sync/model/uuid-v4.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { uuidV4 } from './uuid-v4';

describe('uuidV4', () => {
  it('sets the version and variant bits of RFC 9562 over the random bytes', () => {
    expect(uuidV4((bytes) => bytes.fill(0))).toBe('00000000-0000-4000-8000-000000000000');
    expect(uuidV4((bytes) => bytes.fill(255))).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });
});
```

2. Copiá `types.ts`, `sync-limits.ts` y `sync-texts.ts` tal cual (son tipos y constantes, sin comportamiento):

`frontend/src/features/progress-sync/model/types.ts`:

```ts
import type { StoreApi } from 'zustand/vanilla';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error' | 'signed-out' | 'outdated';
export type StorageMode = 'browser' | 'shared' | 'blocked';
export type LeftReason = 'offline' | 'error' | 'signed-out' | 'outdated' | 'account-changed';
export type ImportSource = 'storage' | 'export';
export type ProofState = 'current' | 'changed' | 'legacy';

export interface AccountMismatch {
  readonly lostOnReload: number;
}

export interface EpochCopyInfo {
  readonly count: number;
  readonly persisted: boolean;
}

export interface EpochChange {
  readonly resetAt: string | null;
  readonly ownReset: boolean;
  readonly copy: EpochCopyInfo | null;
}

export interface V1Summary {
  readonly solvedCount: number;
  readonly lastResultAt: string | null;
}

export interface ImportQuestion {
  readonly source: ImportSource;
  readonly summary: V1Summary;
  readonly stage: 'offer' | 'confirm';
}

export interface ReportEntry {
  readonly path: string;
  readonly reason: string;
}

export interface ImportReport {
  readonly written: Readonly<Record<string, number>>;
  readonly omitted: readonly ReportEntry[];
  readonly replaced: readonly ReportEntry[];
  readonly conflicts: readonly ReportEntry[];
}

export interface ExerciseSummary {
  readonly attemptCount: number;
  readonly legacyAttempts: number;
  readonly proofState: ProofState | null;
  readonly serverSolvedAt: string | null;
}

export interface ProgressSyncState {
  readonly status: SyncStatus | null;
  readonly mode: StorageMode;
  readonly unsentCount: number;
  readonly lostOnUnload: number;
  readonly clockSkewMs: number | null;
  readonly rejectedCount: number;
  readonly accountMismatch: AccountMismatch | null;
  readonly epochChange: EpochChange | null;
  readonly importQuestion: ImportQuestion | null;
  readonly lastImport: ImportReport | null;
  readonly importNotice: string | null;
  readonly busy: 'import' | 'reset' | null;
}

export type FlushOutcome =
  | { readonly kind: 'sent' }
  | {
      readonly kind: 'left';
      readonly count: number;
      readonly reason: LeftReason;
    };

export type SignOutChoice = 'keep' | 'discard';

export interface UnsentFile {
  readonly fileName: string;
  readonly text: string;
}

export interface ProgressSync {
  readonly state: StoreApi<ProgressSyncState>;
  flushNow(): Promise<FlushOutcome>;
  afterSignOut(choice: SignOutChoice): void;
  downloadUnsent(): UnsentFile | null;
  downloadEpochCopy(): UnsentFile | null;
  discardEpochCopy(): void;
  dismissEpochChange(): void;
  acknowledgeRejected(): void;
  answerImport(yes: boolean): Promise<void>;
  enterSharedMode(): Promise<void>;
  leaveSharedMode(): void;
  exerciseSummary(exerciseId: string): ExerciseSummary | null;
}
```

`frontend/src/features/progress-sync/model/sync-limits.ts`:

```ts
export const SYNC_FORMAT = 2;
export const MAX_BATCH_OPERATIONS = 200;
export const MAX_BATCH_BYTES = 1_572_864;
export const MAX_KEEPALIVE_BYTES = 61_440;
export const ENVELOPE_OVERHEAD_BYTES = 512;
export const REQUESTS_PER_MINUTE = 60;
export const MINUTE_MS = 60_000;
export const CHANGE_DELAY_MS = 2_000;
export const CHANGE_MAX_DELAY_MS = 10_000;
export const RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 30_000, 60_000];
export const PHOTO_WAIT_WITH_COPY_MS = 3_000;
export const PHOTO_WAIT_WITHOUT_COPY_MS = 10_000;
export const SPACE_LIFETIME_MS = 2_592_000_000;
export const CLOCK_SKEW_WARNING_MS = 120_000;
```

`frontend/src/features/progress-sync/model/sync-texts.ts`:

```ts
export const BUSY = 'Ya hay una importación o un borrado en curso: esperá a que termine.';
export const IMPORTED = 'Copia importada y combinada con el progreso de tu cuenta.';
export const NOT_IMPORTED = 'No se importó la copia.';
export const IMPORT_UNREACHABLE =
  'No se pudo importar: el taller no responde. Probá de nuevo más tarde.';
export const IMPORT_TOO_LARGE =
  'No se pudo importar: el archivo es demasiado grande para el taller.';
export const IMPORT_SIGNED_OUT = 'Tu sesión venció: ingresá y volvé a importar la copia.';
export const IMPORT_EPOCH_MOVED =
  'Tu progreso se borró desde otra pestaña o dispositivo: volvé a importar la copia.';
export const IMPORT_ACCOUNT_CHANGED = 'La sesión cambió de cuenta: recargá la página.';
export const IMPORT_OUTDATED =
  'Esta pestaña quedó vieja. Recargá la página para seguir sincronizando.';
export const IMPORT_REFUSED_PREFIX = 'No se pudo importar: ';
export const UNSENT_FILE_FORMAT = 'taller-cambios-sin-enviar';
export const IMPORT_UNREADABLE = 'No se pudo importar: la copia no tiene el formato del taller.';
```

3. Stubs: los tipos de `operations.ts` completos y `export const fieldKeyOf: (body: OperationBody) => string = () => { throw new Error('not implemented'); };`; lo mismo para `uuidV4`. Corré las dos specs: fallan con «not implemented».
4. Implementá:

`frontend/src/features/progress-sync/model/operations.ts`:

```ts
export type Language = 'rust' | 'go';
export type Confidence = 'again' | 'practice' | 'confident';
export type FocusMinutes = 15 | 25 | 45;
export type RouteMarkKind = 'step' | 'milestone' | 'favorite';
export type NoteField = 'learned' | 'next';

export type OperationBody =
  | {
      readonly type: 'exercise.prediction';
      readonly exerciseId: string;
      readonly answer: number;
      readonly correct: boolean;
      readonly contentVersion: string;
    }
  | {
      readonly type: 'exercise.assist';
      readonly exerciseId: string;
      readonly assisted?: true;
      readonly solutionSeen?: true;
    }
  | {
      readonly type: 'exercise.hints';
      readonly exerciseId: string;
      readonly revealed: number;
    }
  | {
      readonly type: 'exercise.reflection';
      readonly exerciseId: string;
      readonly text: string;
    }
  | {
      readonly type: 'exercise.customTest';
      readonly exerciseId: string;
      readonly text: string;
    }
  | {
      readonly type: 'exercise.review';
      readonly exerciseId: string;
      readonly confidence: Confidence;
      readonly reviewedAt: string;
      readonly reviewDueAt: string;
    }
  | {
      readonly type: 'exercise.draft';
      readonly exerciseId: string;
      readonly code: string | null;
      readonly starterHash: string | null;
    }
  | {
      readonly type: 'checkpoint.answer';
      readonly worldId: string;
      readonly answer: number;
      readonly passed: boolean;
      readonly contentVersion: string;
    }
  | {
      readonly type: 'workshop.prediction';
      readonly workshopId: string;
      readonly language: Language;
      readonly answer: number;
      readonly correct: boolean;
      readonly contentVersion: string;
    }
  | {
      readonly type: 'workshop.note';
      readonly workshopId: string;
      readonly language: Language;
      readonly text: string;
    }
  | {
      readonly type: 'workshop.objective';
      readonly workshopId: string;
      readonly language: Language;
      readonly objectiveKey: string;
    }
  | {
      readonly type: 'workshop.step';
      readonly workshopId: string;
      readonly language: Language;
      readonly stepKey: string;
      readonly marked: boolean;
    }
  | {
      readonly type: 'route.mark';
      readonly kind: RouteMarkKind;
      readonly itemKey: string;
      readonly marked: boolean;
    }
  | {
      readonly type: 'route.quiz';
      readonly stepId: string;
      readonly answer: number;
      readonly contentVersion: string;
    }
  | {
      readonly type: 'route.note';
      readonly language: Language;
      readonly field: NoteField;
      readonly body: string;
    }
  | {
      readonly type: 'preference.set';
      readonly name: 'routeLanguage';
      readonly value: Language;
    }
  | {
      readonly type: 'preference.set';
      readonly name: 'focusMinutes';
      readonly value: FocusMinutes;
    }
  | {
      readonly type: 'preference.set';
      readonly name: 'labSelectedRust' | 'labSelectedGo';
      readonly value: string;
    };

export type OperationType = OperationBody['type'];
export type Operation = OperationBody & {
  readonly id: string;
  readonly at: string;
};

type KeyParts = {
  [T in OperationType]: (body: Extract<OperationBody, { type: T }>) => string[];
};

const KEY_PARTS: KeyParts = {
  'exercise.prediction': (body) => [body.exerciseId],
  'exercise.assist': (body) => [body.exerciseId],
  'exercise.hints': (body) => [body.exerciseId],
  'exercise.reflection': (body) => [body.exerciseId],
  'exercise.customTest': (body) => [body.exerciseId],
  'exercise.review': (body) => [body.exerciseId],
  'exercise.draft': (body) => [body.exerciseId],
  'checkpoint.answer': (body) => [body.worldId],
  'workshop.prediction': (body) => [body.language, body.workshopId],
  'workshop.note': (body) => [body.language, body.workshopId],
  'workshop.objective': (body) => [body.language, body.workshopId, body.objectiveKey],
  'workshop.step': (body) => [body.language, body.workshopId, body.stepKey],
  'route.mark': (body) => [body.kind, body.itemKey],
  'route.quiz': (body) => [body.stepId],
  'route.note': (body) => [body.language, body.field],
  'preference.set': (body) => [body.name],
};

export function fieldKeyOf(body: OperationBody): string {
  const parts = KEY_PARTS[body.type] as (operation: OperationBody) => string[];
  return [body.type, ...parts(body)].join('|');
}

export const LANGUAGES: readonly Language[] = ['rust', 'go'];

export function isLanguage(value: unknown): value is Language {
  return value === 'rust' || value === 'go';
}

export function isFocusMinutes(value: unknown): value is FocusMinutes {
  return value === 15 || value === 25 || value === 45;
}

export function isConfidence(value: unknown): value is Confidence {
  return value === 'again' || value === 'practice' || value === 'confident';
}
```

`frontend/src/features/progress-sync/model/uuid-v4.ts`:

```ts
export type FillRandom = (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;
export function uuidV4(fill: FillRandom): string {
  const bytes = fill(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

5. Verde: 10 y 1 pruebas. Checks. Commit: `feat(progress-sync): the sixteen sync operations, their field keys and the client limits`.

### Tarea T004 · Las filas, el contexto y la traducción de la forma v1 a operaciones

**Archivos:** `progress-snapshot.ts`; `server-rows.ts` y `server-rows.factory.ts`; `progress-context.fixture.ts`; `diff-progress.ts` y `diff-progress.spec.ts`.

**Consume:** `RouteProgressV1` (`entities/guide`), `LabStateV1` y `LabRecord` (`entities/exercise`), `CampaignStateV1` (`entities/campaign`), `SystemsStateV1` y `WorkshopRecord` (`entities/systems-workshop`), sólo como tipos; `wellFormed` (T002).

**Produce:**

```ts
export interface ProgressSnapshot { route: RouteProgressV1; lab: LabStateV1; campaign: CampaignStateV1; systems: SystemsStateV1 }
export interface ProgressContext { /* progress-snapshot.ts */ }
export function blankSnapshot(): ProgressSnapshot;
export function readPhoto(body: unknown): ProgressPhoto | null;
export function readSyncResponse(body: unknown): SyncResponse | null;
export function emptyAreas(): ProgressAreas;
export function diffArea(area: ProgressAreaName, before: ProgressSnapshot, after: ProgressSnapshot, context: ProgressContext): OperationBody[];
```

**Pasos:**

1. Copiá los tipos y la lectura del cable (las filas son las de http.md §5; la lectura sólo mira la forma que recorre, porque el servidor valida cada fila):

`frontend/src/features/progress-sync/model/progress-snapshot.ts`:

```ts
import type { CampaignStateV1 } from '../../../entities/campaign';
import type { LabStateV1 } from '../../../entities/exercise';
import type { RouteProgressV1 } from '../../../entities/guide';
import type { SystemsStateV1 } from '../../../entities/systems-workshop';
import type { Language } from './operations';

export type ProgressAreaName = 'route' | 'lab' | 'campaign' | 'systems';

export interface ProgressSnapshot {
  route: RouteProgressV1;
  lab: LabStateV1;
  campaign: CampaignStateV1;
  systems: SystemsStateV1;
}

export const AREA_NAMES: readonly ProgressAreaName[] = ['route', 'lab', 'campaign', 'systems'];

export interface ProgressContext {
  readonly contentVersion: string;
  blankSnapshot(): ProgressSnapshot;
  knowsExercise(exerciseId: string): boolean;
  knowsCampaignMission(exerciseId: string): boolean;
  knowsWorld(worldId: string): boolean;
  knowsGuideStep(stepId: string): boolean;
  knowsGuideResource(resourceId: string): boolean;
  knowsMilestone(itemKey: string): boolean;
  knowsWorkshop(workshopId: string, language: Language): boolean;
  knowsObjective(workshopId: string, language: Language, objectiveKey: string): boolean;
  stepKeyAt(workshopId: string, language: Language, position: number): string | null;
  stepPositionOf(workshopId: string, language: Language, stepKey: string): number | null;
  starterHashOf(exerciseId: string): string | null;
  predictionAnswerOf(exerciseId: string): number | null;
  checkpointAnswerOf(worldId: string): number | null;
  workshopAnswerOf(workshopId: string, language: Language): number | null;
}

export function blankSnapshot(): ProgressSnapshot {
  return {
    route: {
      version: 1,
      language: 'rust',
      completed: [],
      milestones: [],
      favorites: [],
      quizAnswers: {},
      notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
      minutes: 25,
    },
    lab: { version: 1, records: {}, selected: { rust: null, go: null } },
    campaign: { version: 1, seals: {}, checkpoints: {} },
    systems: { version: 1, records: {} },
  };
}
```

`frontend/src/features/progress-sync/model/server-rows.ts`:

```ts
import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { Confidence, FocusMinutes, Language, NoteField, RouteMarkKind } from './operations';

export type ProofState = 'current' | 'changed' | 'legacy';

export interface Clocked<V> {
  readonly value: V;
  readonly at: string | null;
}

export interface ClockedText {
  readonly text: string;
  readonly at: string | null;
}

export interface TestVerdict {
  readonly testKey: string;
  readonly outcome: 'pass' | 'fail' | 'missing';
}

export interface ExerciseRow {
  readonly exerciseId: string;
  readonly revision: number;
  readonly prediction: {
    readonly answer: number;
    readonly at: string | null;
  } | null;
  readonly predictionCorrect: Clocked<boolean>;
  readonly assisted: boolean;
  readonly solutionSeen: boolean;
  readonly hintsRevealed: number | null;
  readonly reflection: ClockedText | null;
  readonly customTest: ClockedText | null;
  readonly review: {
    readonly confidence: Confidence | null;
    readonly reviewedAt: string | null;
    readonly reviewDueAt: string | null;
    readonly at: string | null;
  } | null;
  readonly solvedAt: string | null;
  readonly serverSolvedAt: string | null;
  readonly proof: {
    readonly attemptId: number;
    readonly at: string;
    readonly state: ProofState;
    readonly tests: readonly TestVerdict[];
  } | null;
  readonly lastAttempt: {
    readonly attemptId: number;
    readonly at: string;
    readonly outcome: string;
    readonly legacy: boolean;
    readonly tests: readonly TestVerdict[];
  } | null;
  readonly attemptCount: number;
  readonly legacyAttempts: number;
}

export interface DraftRow {
  readonly exerciseId: string;
  readonly code: string | null;
  readonly starterHash: string | null;
  readonly at: string | null;
  readonly revision: number;
}

export interface CampaignSealRow {
  readonly exerciseId: string;
  readonly code: boolean;
  readonly prediction: boolean;
  readonly assisted: boolean;
  readonly revision: number;
}

export interface CheckpointRow {
  readonly worldId: string;
  readonly passed: boolean;
  readonly passedAt: string | null;
  readonly lastAnswer: Clocked<number> | null;
  readonly revision: number;
}

export interface WorkshopProgressRow {
  readonly workshopId: string;
  readonly language: Language;
  readonly codeSealed: boolean;
  readonly predictionCorrect: Clocked<boolean>;
  readonly answer: Clocked<number> | null;
  readonly note: ClockedText | null;
  readonly revision: number;
}

export interface WorkshopObjectiveRow {
  readonly workshopId: string;
  readonly language: Language;
  readonly objectiveKey: string;
  readonly observedAt: string | null;
  readonly revision: number;
}

export interface WorkshopStepRow {
  readonly workshopId: string;
  readonly language: Language;
  readonly stepKey: string;
  readonly marked: boolean;
  readonly at: string | null;
  readonly revision: number;
}

export interface RouteMarkRow {
  readonly kind: RouteMarkKind;
  readonly itemKey: string;
  readonly marked: boolean;
  readonly at: string | null;
  readonly revision: number;
}

export interface RouteQuizRow {
  readonly stepId: string;
  readonly answer: number;
  readonly at: string | null;
  readonly revision: number;
}

export interface RouteNoteRow {
  readonly language: Language;
  readonly field: NoteField;
  readonly body: string;
  readonly at: string | null;
  readonly revision: number;
}

export interface PreferencesRow {
  readonly routeLanguage: Clocked<Language> | null;
  readonly focusMinutes: Clocked<FocusMinutes> | null;
  readonly labSelected: {
    readonly rust: Clocked<string> | null;
    readonly go: Clocked<string> | null;
  };
  readonly revision: number;
}

export interface ProgressAreas {
  readonly exercises: readonly ExerciseRow[];
  readonly drafts: readonly DraftRow[];
  readonly campaign: {
    readonly seals: readonly CampaignSealRow[];
    readonly checkpoints: readonly CheckpointRow[];
  };
  readonly workshops: {
    readonly progress: readonly WorkshopProgressRow[];
    readonly objectives: readonly WorkshopObjectiveRow[];
    readonly steps: readonly WorkshopStepRow[];
  };
  readonly route: {
    readonly marks: readonly RouteMarkRow[];
    readonly quiz: readonly RouteQuizRow[];
    readonly notes: readonly RouteNoteRow[];
  };
  readonly preferences: PreferencesRow | null;
}

export interface ProgressPhoto {
  readonly userId: number;
  readonly epoch: number;
  readonly revision: number;
  readonly resetAt: string | null;
  readonly contentVersion: string;
  readonly areas: ProgressAreas;
}

export type ResultStatus = 'applied' | 'rejected' | 'duplicate' | 'uuid_reused' | 'stale_content';

export interface SyncResult {
  readonly id: string;
  readonly status: ResultStatus;
  readonly reason?: string;
}

export interface SyncResponse {
  readonly epoch: number;
  readonly revision: number;
  readonly serverTime: string;
  readonly contentVersion: string;
  readonly results: readonly SyncResult[];
  readonly full: boolean;
  readonly changes: ProgressAreas;
}

const STATUSES: readonly ResultStatus[] = [
  'applied',
  'rejected',
  'duplicate',
  'uuid_reused',
  'stale_content',
];

export function emptyAreas(): ProgressAreas {
  return {
    exercises: [],
    drafts: [],
    campaign: { seals: [], checkpoints: [] },
    workshops: { progress: [], objectives: [], steps: [] },
    route: { marks: [], quiz: [], notes: [] },
    preferences: null,
  };
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function listOf<R>(value: unknown): R[] | null {
  return Array.isArray(value) ? (value as R[]) : null;
}

function groupOf(value: unknown, names: readonly string[]): Record<string, unknown[]> | null {
  if (!isPlainObject(value)) return null;
  const group: Record<string, unknown[]> = {};
  for (const name of names) {
    const rows = listOf<unknown>(value[name]);
    if (rows === null) return null;
    group[name] = rows;
  }
  return group;
}

// The server validates every row; the client only checks the shape it walks (http.md §5).
export function readAreas(body: Record<string, unknown>): ProgressAreas | null {
  const exercises = listOf<ExerciseRow>(body.exercises);
  const drafts = listOf<DraftRow>(body.drafts);
  const campaign = groupOf(body.campaign, ['seals', 'checkpoints']);
  const workshops = groupOf(body.workshops, ['progress', 'objectives', 'steps']);
  const route = groupOf(body.route, ['marks', 'quiz', 'notes']);
  const preferences = body.preferences === null ? null : body.preferences;
  if (!exercises || !drafts || !campaign || !workshops || !route) return null;
  if (preferences !== null && !isPlainObject(preferences)) return null;
  return {
    exercises,
    drafts,
    campaign: campaign as unknown as ProgressAreas['campaign'],
    workshops: workshops as unknown as ProgressAreas['workshops'],
    route: route as unknown as ProgressAreas['route'],
    preferences: preferences as PreferencesRow | null,
  };
}

export function readPhoto(body: unknown): ProgressPhoto | null {
  if (!isPlainObject(body) || body.full !== true) return null;
  const { userId, epoch, revision, resetAt, contentVersion } = body;
  if (!Number.isSafeInteger(userId) || !isCount(epoch) || !isCount(revision)) return null;
  if (typeof contentVersion !== 'string') return null;
  if (resetAt !== null && typeof resetAt !== 'string') return null;
  const areas = readAreas(body);
  if (areas === null) return null;
  return {
    userId: userId as number,
    epoch,
    revision,
    resetAt,
    contentVersion,
    areas,
  };
}

function readResults(value: unknown): SyncResult[] | null {
  const results = listOf<unknown>(value);
  if (results === null) return null;
  const valid = results.every(
    (result) =>
      isPlainObject(result) &&
      typeof result.id === 'string' &&
      STATUSES.includes(result.status as ResultStatus),
  );
  return valid ? (results as SyncResult[]) : null;
}

export function readSyncResponse(body: unknown): SyncResponse | null {
  if (!isPlainObject(body) || !isPlainObject(body.changes)) return null;
  const { epoch, revision, serverTime, contentVersion } = body;
  if (!isCount(epoch) || !isCount(revision)) return null;
  if (typeof serverTime !== 'string' || Number.isNaN(Date.parse(serverTime))) return null;
  if (typeof contentVersion !== 'string') return null;
  const results = readResults(body.results);
  const changes = readAreas(body.changes);
  if (results === null || changes === null) return null;
  const full = body.changes.full === true;
  return {
    epoch,
    revision,
    serverTime,
    contentVersion,
    results,
    full,
    changes,
  };
}
```

2. Copiá el fixture y la factory (los ids y las respuestas correctas están escritos a mano):

`frontend/src/features/progress-sync/model/progress-context.fixture.ts`:

```ts
import { blankSnapshot, type ProgressContext } from './progress-snapshot';

export { blankSnapshot };

export const CONTENT_VERSION = '0123456789abcdef0123456789abcdef';
export const STARTER_HASH = 'a'.repeat(64);

const STEPS: Readonly<Record<string, readonly string[]>> = {
  'rust:ws-cache': ['e1', 'e2', 'e3'],
};
const OBJECTIVES: Readonly<Record<string, readonly string[]>> = {
  'rust:ws-cache': ['hit', 'miss'],
};

export const progressContext: ProgressContext = {
  contentVersion: CONTENT_VERSION,
  blankSnapshot,
  knowsExercise: (id) => ['rust-01', 'rust-02', 'go-01'].includes(id),
  knowsCampaignMission: (id) => ['rust-01', 'rust-02'].includes(id),
  knowsWorld: (id) => id === 'rust-world-1',
  knowsGuideStep: (id) => ['rust-1-1', 'rust-1-2'].includes(id),
  knowsGuideResource: (id) => id === 'book',
  knowsMilestone: (id) => id === 'rust-memory',
  knowsWorkshop: (id, language) => `${language}:${id}` in STEPS,
  knowsObjective: (id, language, key) => OBJECTIVES[`${language}:${id}`]?.includes(key) ?? false,
  stepKeyAt: (id, language, position) => STEPS[`${language}:${id}`]?.[position] ?? null,
  stepPositionOf: (id, language, key) => {
    const position = STEPS[`${language}:${id}`]?.indexOf(key) ?? -1;
    return position === -1 ? null : position;
  },
  starterHashOf: (id) => (id.startsWith('rust-') ? STARTER_HASH : null),
  predictionAnswerOf: (id) => (id === 'rust-01' ? 2 : null),
  checkpointAnswerOf: (id) => (id === 'rust-world-1' ? 1 : null),
  workshopAnswerOf: (id, language) => (`${language}:${id}` === 'rust:ws-cache' ? 0 : null),
};
```

`frontend/src/features/progress-sync/model/server-rows.factory.ts`:

```ts
import { Factory } from 'fishery';
import {
  emptyAreas,
  type ExerciseRow,
  type ProgressAreas,
  type ProgressPhoto,
} from './server-rows';

export const exerciseRowFactory = Factory.define<ExerciseRow>(() => ({
  exerciseId: 'rust-01',
  revision: 1,
  prediction: null,
  predictionCorrect: { value: false, at: null },
  assisted: false,
  solutionSeen: false,
  hintsRevealed: null,
  reflection: null,
  customTest: null,
  review: null,
  solvedAt: null,
  serverSolvedAt: null,
  proof: null,
  lastAttempt: null,
  attemptCount: 0,
  legacyAttempts: 0,
}));

export function areasWith(partial: Partial<ProgressAreas>): ProgressAreas {
  return { ...emptyAreas(), ...partial };
}

export const photoFactory = Factory.define<ProgressPhoto>(() => ({
  userId: 41,
  epoch: 1,
  revision: 0,
  resetAt: null,
  contentVersion: '0123456789abcdef0123456789abcdef',
  areas: emptyAreas(),
}));
```

3. Escribí la spec de la traducción (data-model-d1c.md §5):

`frontend/src/features/progress-sync/model/diff-progress.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { diffCampaign, diffLab, diffRoute, diffSystems } from './diff-progress';
import {
  CONTENT_VERSION,
  STARTER_HASH,
  blankSnapshot,
  progressContext,
} from './progress-context.fixture';

const before = blankSnapshot();

describe('diffRoute', () => {
  it('marks, unmarks and favorites become route.mark operations', () => {
    const start = { ...before.route, completed: ['rust-1-1'] };
    const after = { ...start, completed: ['rust-1-2'], favorites: ['book'] };
    expect(diffRoute(start, after, progressContext)).toEqual([
      { type: 'route.mark', kind: 'step', itemKey: 'rust-1-2', marked: true },
      { type: 'route.mark', kind: 'step', itemKey: 'rust-1-1', marked: false },
      { type: 'route.mark', kind: 'favorite', itemKey: 'book', marked: true },
    ]);
  });

  it('sends the language, the allowed focus minutes, a quiz answer and a note', () => {
    const after = {
      ...before.route,
      language: 'go' as const,
      minutes: 45,
      quizAnswers: { 'rust-1-1': 2 },
      notes: {
        ...before.route.notes,
        go: { learned: 'Aprendí \uD800', next: '' },
      },
    };
    expect(diffRoute(before.route, after, progressContext)).toEqual([
      { type: 'preference.set', name: 'routeLanguage', value: 'go' },
      { type: 'preference.set', name: 'focusMinutes', value: 45 },
      {
        type: 'route.quiz',
        stepId: 'rust-1-1',
        answer: 2,
        contentVersion: CONTENT_VERSION,
      },
      {
        type: 'route.note',
        language: 'go',
        field: 'learned',
        body: 'Aprendí �',
      },
    ]);
  });

  it('does not send focus minutes the API rejects', () => {
    expect(diffRoute(before.route, { ...before.route, minutes: 30 }, progressContext)).toEqual([]);
  });
});

describe('diffLab', () => {
  it('turns the editable fields of a record into one operation each', () => {
    const after = {
      ...before.lab,
      selected: { rust: 'rust-01', go: null },
      records: {
        'rust-01': {
          prediction: 1,
          predictionCorrect: false,
          assisted: true,
          solutionSeen: false,
          hints: 2,
          reflection: 'Primera idea',
          customTest: 'assert_eq!(f(1), 2);',
          draft: 'fn a() {}',
          confidence: 'practice',
          reviewedAt: Date.UTC(2026, 9, 5, 11),
          reviewAt: Date.UTC(2026, 9, 6, 11),
        },
      },
    };
    expect(diffLab(before.lab, after, progressContext)).toEqual([
      { type: 'preference.set', name: 'labSelectedRust', value: 'rust-01' },
      {
        type: 'exercise.prediction',
        exerciseId: 'rust-01',
        answer: 1,
        correct: false,
        contentVersion: CONTENT_VERSION,
      },
      { type: 'exercise.assist', exerciseId: 'rust-01', assisted: true },
      { type: 'exercise.hints', exerciseId: 'rust-01', revealed: 2 },
      {
        type: 'exercise.reflection',
        exerciseId: 'rust-01',
        text: 'Primera idea',
      },
      {
        type: 'exercise.customTest',
        exerciseId: 'rust-01',
        text: 'assert_eq!(f(1), 2);',
      },
      {
        type: 'exercise.draft',
        exerciseId: 'rust-01',
        code: 'fn a() {}',
        starterHash: STARTER_HASH,
      },
      {
        type: 'exercise.review',
        exerciseId: 'rust-01',
        confidence: 'practice',
        reviewedAt: '2026-10-05T11:00:00.000Z',
        reviewDueAt: '2026-10-06T11:00:00.000Z',
      },
    ]);
  });

  it('sends the tombstone of «restaurar inicio» when the draft disappears', () => {
    const start = {
      ...before.lab,
      records: { 'rust-01': { draft: 'fn a() {}' } },
    };
    const after = { ...before.lab, records: { 'rust-01': {} } };
    expect(diffLab(start, after, progressContext)).toEqual([
      {
        type: 'exercise.draft',
        exerciseId: 'rust-01',
        code: null,
        starterHash: null,
      },
    ]);
  });

  it('never sends what only executions or the import write (FR-009)', () => {
    const after = {
      ...before.lab,
      records: {
        'rust-01': {
          solvedAt: 1_760_000_000_000,
          attempts: 3,
          result: { success: true },
        },
      },
    };
    expect(diffLab(before.lab, after, progressContext)).toEqual([]);
  });

  it('sends nothing for the empty record the lab keeps on display (D1c-9)', () => {
    const after = {
      ...before.lab,
      records: {
        'rust-02': {
          predictionCorrect: false,
          assisted: false,
          solutionSeen: false,
        },
      },
    };
    expect(diffLab(before.lab, after, progressContext)).toEqual([]);
  });

  it('waits for the three review fields before sending the group', () => {
    const after = {
      ...before.lab,
      records: { 'rust-01': { reviewAt: Date.UTC(2026, 9, 6) } },
    };
    expect(diffLab(before.lab, after, progressContext)).toEqual([]);
  });
});

describe('diffCampaign and diffSystems', () => {
  it('sends a checkpoint answer and never the seals', () => {
    const after = {
      ...before.campaign,
      seals: { 'rust-01': { code: true, prediction: true, assisted: false } },
      checkpoints: { 'rust-world-1': { passed: true, lastAnswer: 1 } },
    };
    expect(diffCampaign(before.campaign, after, progressContext)).toEqual([
      {
        type: 'checkpoint.answer',
        worldId: 'rust-world-1',
        answer: 1,
        passed: true,
        contentVersion: CONTENT_VERSION,
      },
    ]);
  });

  it('translates the step positions to step keys and skips a position with no step', () => {
    const start = {
      version: 1 as const,
      records: {
        'rust:ws-cache': {
          observed: [],
          code: false,
          predicted: false,
          answer: null,
          steps: [0],
          note: '',
        },
      },
    };
    const after = {
      version: 1 as const,
      records: {
        'rust:ws-cache': {
          observed: ['hit'],
          code: true,
          predicted: true,
          answer: 0,
          steps: [2, 9],
          note: 'Nota A',
        },
      },
    };
    expect(diffSystems(start, after, progressContext)).toEqual([
      {
        type: 'workshop.prediction',
        workshopId: 'ws-cache',
        language: 'rust',
        answer: 0,
        correct: true,
        contentVersion: CONTENT_VERSION,
      },
      {
        type: 'workshop.note',
        workshopId: 'ws-cache',
        language: 'rust',
        text: 'Nota A',
      },
      {
        type: 'workshop.objective',
        workshopId: 'ws-cache',
        language: 'rust',
        objectiveKey: 'hit',
      },
      {
        type: 'workshop.step',
        workshopId: 'ws-cache',
        language: 'rust',
        stepKey: 'e3',
        marked: true,
      },
      {
        type: 'workshop.step',
        workshopId: 'ws-cache',
        language: 'rust',
        stepKey: 'e1',
        marked: false,
      },
    ]);
  });
});
```

4. Stubs: `export const diffRoute: (before: RouteProgressV1, after: RouteProgressV1, context: ProgressContext) => OperationBody[] = () => { throw new Error('not implemented'); };`, y lo mismo para `diffLab`, `diffCampaign`, `diffSystems` y `diffArea`. La spec falla con «not implemented».
5. Implementá:

`frontend/src/features/progress-sync/model/diff-progress.ts`:

```ts
import type { CampaignStateV1 } from '../../../entities/campaign';
import type { LabRecord, LabStateV1 } from '../../../entities/exercise';
import type { RouteProgressV1 } from '../../../entities/guide';
import type { SystemsStateV1, WorkshopRecord } from '../../../entities/systems-workshop';
import { wellFormed } from '../../../shared/lib/well-formed';
import {
  LANGUAGES,
  isConfidence,
  isFocusMinutes,
  isLanguage,
  type Language,
  type OperationBody,
  type RouteMarkKind,
} from './operations';
import type { ProgressAreaName, ProgressContext, ProgressSnapshot } from './progress-snapshot';

const NOTE_FIELDS = ['learned', 'next'] as const;
const STUDY_FLOOR_MS = Date.UTC(2020, 0, 1);
const STUDY_CEILING_MS = Date.UTC(2100, 0, 1);

function answerOf(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

function studyInstantOf(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= STUDY_FLOOR_MS && value <= STUDY_CEILING_MS ? value : null;
}

function markChanges(
  kind: RouteMarkKind,
  before: readonly string[],
  after: readonly string[],
): OperationBody[] {
  const had = new Set(before);
  const has = new Set(after);
  const marked = [...has].filter((itemKey) => !had.has(itemKey));
  const unmarked = [...had].filter((itemKey) => !has.has(itemKey));
  return [
    ...marked.map((itemKey) => ({ type: 'route.mark', kind, itemKey, marked: true }) as const),
    ...unmarked.map((itemKey) => ({ type: 'route.mark', kind, itemKey, marked: false }) as const),
  ];
}

function routePreferences(before: RouteProgressV1, after: RouteProgressV1): OperationBody[] {
  const operations: OperationBody[] = [];
  if (after.language !== before.language && isLanguage(after.language)) {
    operations.push({
      type: 'preference.set',
      name: 'routeLanguage',
      value: after.language,
    });
  }
  if (after.minutes !== before.minutes && isFocusMinutes(after.minutes)) {
    operations.push({
      type: 'preference.set',
      name: 'focusMinutes',
      value: after.minutes,
    });
  }
  return operations;
}

function quizChanges(
  before: RouteProgressV1['quizAnswers'],
  after: RouteProgressV1['quizAnswers'],
  contentVersion: string,
): OperationBody[] {
  return Object.entries(after).flatMap(([stepId, value]) => {
    const answer = answerOf(value);
    if (answer === null || answer === before[stepId]) return [];
    return [{ type: 'route.quiz', stepId, answer, contentVersion } as const];
  });
}

function noteChanges(
  before: RouteProgressV1['notes'],
  after: RouteProgressV1['notes'],
): OperationBody[] {
  return LANGUAGES.flatMap((language) =>
    NOTE_FIELDS.flatMap((field) => {
      const body = after[language]?.[field];
      if (typeof body !== 'string' || body === before[language]?.[field]) return [];
      return [
        {
          type: 'route.note',
          language,
          field,
          body: wellFormed(body),
        } as const,
      ];
    }),
  );
}

export function diffRoute(
  before: RouteProgressV1,
  after: RouteProgressV1,
  context: ProgressContext,
): OperationBody[] {
  return [
    ...routePreferences(before, after),
    ...markChanges('step', before.completed, after.completed),
    ...markChanges('milestone', before.milestones, after.milestones),
    ...markChanges('favorite', before.favorites, after.favorites),
    ...quizChanges(before.quizAnswers, after.quizAnswers, context.contentVersion),
    ...noteChanges(before.notes, after.notes),
  ];
}

function predictionChange(
  exerciseId: string,
  before: LabRecord,
  after: LabRecord,
  contentVersion: string,
): OperationBody[] {
  const answer = answerOf(after.prediction);
  if (answer === null) return [];
  const correct = after.predictionCorrect === true;
  if (answer === answerOf(before.prediction) && correct === (before.predictionCorrect === true)) {
    return [];
  }
  return [
    {
      type: 'exercise.prediction',
      exerciseId,
      answer,
      correct,
      contentVersion,
    },
  ];
}

function assistChange(exerciseId: string, before: LabRecord, after: LabRecord): OperationBody[] {
  const assisted = after.assisted === true && before.assisted !== true;
  const solutionSeen = after.solutionSeen === true && before.solutionSeen !== true;
  if (!assisted && !solutionSeen) return [];
  return [
    {
      type: 'exercise.assist',
      exerciseId,
      ...(assisted ? { assisted: true as const } : {}),
      ...(solutionSeen ? { solutionSeen: true as const } : {}),
    },
  ];
}

function hintsChange(exerciseId: string, before: LabRecord, after: LabRecord): OperationBody[] {
  const revealed = answerOf(after.hints);
  if (revealed === null || revealed < 1 || revealed <= (answerOf(before.hints) ?? 0)) return [];
  return [{ type: 'exercise.hints', exerciseId, revealed }];
}

function textChanges(exerciseId: string, before: LabRecord, after: LabRecord): OperationBody[] {
  const operations: OperationBody[] = [];
  if (typeof after.reflection === 'string' && after.reflection !== before.reflection) {
    operations.push({
      type: 'exercise.reflection',
      exerciseId,
      text: wellFormed(after.reflection),
    });
  }
  if (typeof after.customTest === 'string' && after.customTest !== before.customTest) {
    operations.push({
      type: 'exercise.customTest',
      exerciseId,
      text: wellFormed(after.customTest),
    });
  }
  return operations;
}

function draftChange(
  exerciseId: string,
  before: LabRecord,
  after: LabRecord,
  context: ProgressContext,
): OperationBody[] {
  if (typeof after.draft === 'string' && after.draft !== before.draft) {
    const code = wellFormed(after.draft);
    return [
      {
        type: 'exercise.draft',
        exerciseId,
        code,
        starterHash: context.starterHashOf(exerciseId),
      },
    ];
  }
  if (typeof before.draft === 'string' && after.draft === undefined) {
    return [{ type: 'exercise.draft', exerciseId, code: null, starterHash: null }];
  }
  return [];
}

function reviewChange(exerciseId: string, before: LabRecord, after: LabRecord): OperationBody[] {
  const confidence = after.confidence;
  const reviewedAt = studyInstantOf(after.reviewedAt);
  const reviewDueAt = studyInstantOf(after.reviewAt);
  if (!isConfidence(confidence) || reviewedAt === null || reviewDueAt === null) return [];
  const unchanged =
    confidence === before.confidence &&
    reviewedAt === before.reviewedAt &&
    reviewDueAt === before.reviewAt;
  if (unchanged) return [];
  return [
    {
      type: 'exercise.review',
      exerciseId,
      confidence,
      reviewedAt: new Date(reviewedAt).toISOString(),
      reviewDueAt: new Date(reviewDueAt).toISOString(),
    },
  ];
}

function selectedChanges(
  before: LabStateV1['selected'],
  after: LabStateV1['selected'],
): OperationBody[] {
  return LANGUAGES.flatMap((language) => {
    const value = after[language];
    if (typeof value !== 'string' || value === before[language]) return [];
    const name = language === 'rust' ? 'labSelectedRust' : 'labSelectedGo';
    return [{ type: 'preference.set', name, value } as const];
  });
}

export function diffLab(
  before: LabStateV1,
  after: LabStateV1,
  context: ProgressContext,
): OperationBody[] {
  const records = Object.entries(after.records).flatMap(([exerciseId, record]) => {
    const previous = before.records[exerciseId] ?? {};
    return [
      ...predictionChange(exerciseId, previous, record, context.contentVersion),
      ...assistChange(exerciseId, previous, record),
      ...hintsChange(exerciseId, previous, record),
      ...textChanges(exerciseId, previous, record),
      ...draftChange(exerciseId, previous, record, context),
      ...reviewChange(exerciseId, previous, record),
    ];
  });
  return [...selectedChanges(before.selected, after.selected), ...records];
}

export function diffCampaign(
  before: CampaignStateV1,
  after: CampaignStateV1,
  context: ProgressContext,
): OperationBody[] {
  return Object.entries(after.checkpoints).flatMap(([worldId, checkpoint]) => {
    const answer = answerOf(checkpoint.lastAnswer);
    const previous = before.checkpoints[worldId];
    if (answer === null) return [];
    if (answer === previous?.lastAnswer && checkpoint.passed === previous.passed) return [];
    const passed = checkpoint.passed === true;
    return [
      {
        type: 'checkpoint.answer',
        worldId,
        answer,
        passed,
        contentVersion: context.contentVersion,
      } as const,
    ];
  });
}

const EMPTY_WORKSHOP: WorkshopRecord = {
  observed: [],
  code: false,
  predicted: false,
  answer: null,
  steps: [],
  note: '',
};

function workshopOf(key: string): { language: Language; workshopId: string } | null {
  const separator = key.indexOf(':');
  const language = key.slice(0, separator);
  if (separator < 1 || !isLanguage(language)) return null;
  return { language, workshopId: key.slice(separator + 1) };
}

function workshopAnswer(
  where: { language: Language; workshopId: string },
  before: WorkshopRecord,
  after: WorkshopRecord,
  contentVersion: string,
): OperationBody[] {
  const answer = answerOf(after.answer);
  if (answer === null) return [];
  if (answer === before.answer && after.predicted === before.predicted) return [];
  const correct = after.predicted === true;
  return [{ type: 'workshop.prediction', ...where, answer, correct, contentVersion }];
}

function workshopSteps(
  where: { language: Language; workshopId: string },
  before: WorkshopRecord,
  after: WorkshopRecord,
  context: ProgressContext,
): OperationBody[] {
  const had = new Set(before.steps);
  const has = new Set(after.steps);
  const changes = [
    ...[...has]
      .filter((position) => !had.has(position))
      .map((position) => [position, true] as const),
    ...[...had]
      .filter((position) => !has.has(position))
      .map((position) => [position, false] as const),
  ];
  return changes.flatMap(([position, marked]) => {
    const stepKey = context.stepKeyAt(where.workshopId, where.language, position);
    return stepKey === null ? [] : [{ type: 'workshop.step', ...where, stepKey, marked } as const];
  });
}

export function diffSystems(
  before: SystemsStateV1,
  after: SystemsStateV1,
  context: ProgressContext,
): OperationBody[] {
  return Object.entries(after.records).flatMap(([key, record]) => {
    const where = workshopOf(key);
    if (where === null) return [];
    const previous = before.records[key] ?? EMPTY_WORKSHOP;
    const notes: OperationBody[] =
      typeof record.note === 'string' && record.note !== previous.note
        ? [{ type: 'workshop.note', ...where, text: wellFormed(record.note) }]
        : [];
    const observed = record.observed
      .filter((objectiveKey) => !previous.observed.includes(objectiveKey))
      .map((objectiveKey) => ({ type: 'workshop.objective', ...where, objectiveKey }) as const);
    return [
      ...workshopAnswer(where, previous, record, context.contentVersion),
      ...notes,
      ...observed,
      ...workshopSteps(where, previous, record, context),
    ];
  });
}

export function diffArea(
  area: ProgressAreaName,
  before: ProgressSnapshot,
  after: ProgressSnapshot,
  context: ProgressContext,
): OperationBody[] {
  switch (area) {
    case 'route':
      return diffRoute(before.route, after.route, context);
    case 'lab':
      return diffLab(before.lab, after.lab, context);
    case 'campaign':
      return diffCampaign(before.campaign, after.campaign, context);
    case 'systems':
      return diffSystems(before.systems, after.systems, context);
  }
}
```

6. Verde: 10 pruebas. Checks. Commit: `feat(progress-sync): turn each change of the v1 stores into sync operations`.

### Tarea T005 · De las filas a la forma v1, y el delta en la copia

**Archivos:** `merge-areas.ts` y `merge-areas.spec.ts`; `apply-rows.ts` y `apply-rows.spec.ts`.

**Consume:** `incomingWins` y `Clock` de `merge-rules.ts` (D1a); `cloneJson`.

**Produce:**

```ts
export function mergeAreas(stored: ProgressAreas, changes: ProgressAreas, full: boolean): ProgressAreas;
export interface PendingClocks { clockOf(fieldKey: string): Clock | undefined }
export function pendingClocks(operations: readonly Operation[]): PendingClocks;
export function applyRows(snapshot: ProgressSnapshot, areas: ProgressAreas, pending: PendingClocks, context: ProgressContext): ProgressSnapshot;
```

**Pasos:**

1. Escribí las specs (data-model-d1c.md §6 y R6):

`frontend/src/features/progress-sync/model/merge-areas.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mergeAreas } from './merge-areas';
import { areasWith, exerciseRowFactory } from './server-rows.factory';

describe('mergeAreas', () => {
  const stored = areasWith({
    exercises: [
      exerciseRowFactory.build({ exerciseId: 'rust-01', revision: 4 }),
      exerciseRowFactory.build({ exerciseId: 'rust-02', revision: 2 }),
    ],
  });

  it('replaces the copy with a full photo', () => {
    const photo = areasWith({
      exercises: [exerciseRowFactory.build({ exerciseId: 'go-01', revision: 9 })],
    });
    expect(mergeAreas(stored, photo, true)).toBe(photo);
  });

  it('upserts delta rows by key and never brings back an older revision', () => {
    const delta = areasWith({
      exercises: [
        exerciseRowFactory.build({
          exerciseId: 'rust-01',
          revision: 3,
          attemptCount: 7,
        }),
        exerciseRowFactory.build({
          exerciseId: 'rust-02',
          revision: 5,
          attemptCount: 1,
        }),
      ],
    });
    const merged = mergeAreas(stored, delta, false);
    expect(merged.exercises.map((row) => [row.exerciseId, row.revision, row.attemptCount])).toEqual(
      [
        ['rust-01', 4, 0],
        ['rust-02', 5, 1],
      ],
    );
  });
});
```

`frontend/src/features/progress-sync/model/apply-rows.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyRows, pendingClocks } from './apply-rows';
import type { Operation } from './operations';
import { blankSnapshot, progressContext } from './progress-context.fixture';
import { areasWith, exerciseRowFactory } from './server-rows.factory';

const T1 = '2026-10-05T12:00:00.000Z';
const T2 = '2026-10-05T12:00:01.000Z';
const nothingPending = pendingClocks([]);

describe('applyRows', () => {
  it('writes an exercise row into the lab record, with dates in milliseconds', () => {
    const areas = areasWith({
      exercises: [
        exerciseRowFactory.build({
          prediction: { answer: 2, at: T1 },
          predictionCorrect: { value: true, at: T1 },
          hintsRevealed: 3,
          reflection: { text: 'Segunda idea', at: T1 },
          review: {
            confidence: 'confident',
            reviewedAt: T1,
            reviewDueAt: T2,
            at: T1,
          },
          solvedAt: T1,
        }),
      ],
      drafts: [
        {
          exerciseId: 'rust-01',
          code: 'fn b() {}',
          starterHash: null,
          at: T1,
          revision: 1,
        },
      ],
    });
    const next = applyRows(blankSnapshot(), areas, nothingPending, progressContext);
    expect(next.lab.records['rust-01']).toEqual({
      predictionCorrect: true,
      assisted: false,
      solutionSeen: false,
      prediction: 2,
      hints: 3,
      reflection: 'Segunda idea',
      confidence: 'confident',
      reviewedAt: Date.parse(T1),
      reviewAt: Date.parse(T2),
      solvedAt: Date.parse(T1),
      draft: 'fn b() {}',
    });
  });

  it('keeps a pending local change unless the row is newer (merge-rules.md §3)', () => {
    const snapshot = blankSnapshot();
    snapshot.lab.records['rust-01'] = { reflection: 'local' };
    const pending = (at: string): Operation[] => [
      {
        id: 'a',
        at,
        type: 'exercise.reflection',
        exerciseId: 'rust-01',
        text: 'local',
      },
    ];
    const areas = areasWith({
      exercises: [exerciseRowFactory.build({ reflection: { text: 'remota', at: T1 } })],
    });
    const kept = applyRows(snapshot, areas, pendingClocks(pending(T2)), progressContext);
    const replaced = applyRows(
      snapshot,
      areas,
      pendingClocks(pending('2026-10-05T11:59:59.000Z')),
      progressContext,
    );
    expect(kept.lab.records['rust-01'].reflection).toBe('local');
    expect(replaced.lab.records['rust-01'].reflection).toBe('remota');
  });

  it('deletes nothing for an absent row, so an empty photo keeps the local state (FR-011)', () => {
    const snapshot = blankSnapshot();
    snapshot.route.completed = ['rust-1-1'];
    snapshot.lab.records['rust-01'] = {
      reflection: 'mía',
      result: { success: true },
    };
    expect(applyRows(snapshot, areasWith({}), nothingPending, progressContext)).toEqual(snapshot);
  });

  it('removes a mark on a tombstone and adds it on a newer mark', () => {
    const snapshot = blankSnapshot();
    snapshot.route.completed = ['rust-1-1'];
    const areas = areasWith({
      route: {
        marks: [
          {
            kind: 'step',
            itemKey: 'rust-1-1',
            marked: false,
            at: T1,
            revision: 2,
          },
          {
            kind: 'favorite',
            itemKey: 'book',
            marked: true,
            at: T1,
            revision: 2,
          },
        ],
        quiz: [{ stepId: 'rust-1-2', answer: 1, at: T1, revision: 2 }],
        notes: [
          {
            language: 'go',
            field: 'next',
            body: 'Seguir',
            at: T1,
            revision: 2,
          },
        ],
      },
    });
    const next = applyRows(snapshot, areas, nothingPending, progressContext);
    expect(next.route.completed).toEqual([]);
    expect(next.route.favorites).toEqual(['book']);
    expect(next.route.quizAnswers).toEqual({ 'rust-1-2': 1 });
    expect(next.route.notes.go.next).toBe('Seguir');
  });

  it('skips rows the published content does not know (risk 7 of A3)', () => {
    const areas = areasWith({
      exercises: [
        exerciseRowFactory.build({
          exerciseId: 'rust-999',
          reflection: { text: 'x', at: T1 },
        }),
      ],
      route: {
        marks: [
          {
            kind: 'step',
            itemKey: 'retired',
            marked: true,
            at: T1,
            revision: 1,
          },
        ],
        quiz: [],
        notes: [],
      },
      workshops: {
        progress: [],
        objectives: [],
        steps: [
          {
            workshopId: 'ws-cache',
            language: 'rust',
            stepKey: 'e9',
            marked: true,
            at: T1,
            revision: 1,
          },
        ],
      },
    });
    expect(applyRows(blankSnapshot(), areas, nothingPending, progressContext)).toEqual(
      blankSnapshot(),
    );
  });

  it('turns step keys into positions and combines the only-growing workshop flags', () => {
    const areas = areasWith({
      workshops: {
        progress: [
          {
            workshopId: 'ws-cache',
            language: 'rust',
            codeSealed: true,
            predictionCorrect: { value: true, at: null },
            answer: { value: 0, at: T1 },
            note: { text: 'Nota B', at: T1 },
            revision: 3,
          },
        ],
        objectives: [
          {
            workshopId: 'ws-cache',
            language: 'rust',
            objectiveKey: 'miss',
            observedAt: T1,
            revision: 3,
          },
        ],
        steps: [
          {
            workshopId: 'ws-cache',
            language: 'rust',
            stepKey: 'e2',
            marked: true,
            at: T1,
            revision: 3,
          },
        ],
      },
    });
    const next = applyRows(blankSnapshot(), areas, nothingPending, progressContext);
    expect(next.systems.records['rust:ws-cache']).toEqual({
      observed: ['miss'],
      code: true,
      predicted: true,
      answer: 0,
      steps: [1],
      note: 'Nota B',
    });
  });

  it('applies the preferences and the checkpoints, with OR on passed', () => {
    const snapshot = blankSnapshot();
    snapshot.campaign.checkpoints['rust-world-1'] = {
      passed: true,
      lastAnswer: 2,
    };
    const areas = areasWith({
      campaign: {
        seals: [
          {
            exerciseId: 'rust-02',
            code: false,
            prediction: true,
            assisted: false,
            revision: 1,
          },
        ],
        checkpoints: [
          {
            worldId: 'rust-world-1',
            passed: false,
            passedAt: null,
            lastAnswer: { value: 0, at: T1 },
            revision: 1,
          },
        ],
      },
      preferences: {
        routeLanguage: { value: 'go', at: T1 },
        focusMinutes: { value: 15, at: T1 },
        labSelected: { rust: { value: 'rust-02', at: T1 }, go: null },
        revision: 1,
      },
    });
    const next = applyRows(snapshot, areas, nothingPending, progressContext);
    expect(next.campaign.checkpoints['rust-world-1']).toEqual({
      passed: true,
      lastAnswer: 0,
    });
    expect(next.campaign.seals['rust-02']).toEqual({
      code: false,
      prediction: true,
      assisted: false,
    });
    expect([next.route.language, next.route.minutes, next.lab.selected.rust]).toEqual([
      'go',
      15,
      'rust-02',
    ]);
  });
});
```

2. Stubs tipados de `mergeAreas`, `pendingClocks` y `applyRows`; las dos specs fallan.
3. Implementá:

`frontend/src/features/progress-sync/model/merge-areas.ts`:

```ts
import type { ProgressAreas } from './server-rows';

interface Revised {
  readonly revision: number;
}

// The server already merged each row: the copy keeps, per natural key, the row with the higher
// revision, so a late answer from another tab cannot bring back an older row (http.md §7).
function upsert<R extends Revised>(
  stored: readonly R[],
  incoming: readonly R[],
  keyOf: (row: R) => string,
): R[] {
  const byKey = new Map(stored.map((row) => [keyOf(row), row]));
  for (const row of incoming) {
    const current = byKey.get(keyOf(row));
    if (current === undefined || row.revision >= current.revision) byKey.set(keyOf(row), row);
  }
  return [...byKey.values()];
}

function newerPreferences(
  stored: ProgressAreas['preferences'],
  incoming: ProgressAreas['preferences'],
): ProgressAreas['preferences'] {
  if (incoming === null) return stored;
  if (stored === null || incoming.revision >= stored.revision) return incoming;
  return stored;
}

export function mergeAreas(
  stored: ProgressAreas,
  changes: ProgressAreas,
  full: boolean,
): ProgressAreas {
  if (full) return changes;
  return {
    exercises: upsert(stored.exercises, changes.exercises, (row) => row.exerciseId),
    drafts: upsert(stored.drafts, changes.drafts, (row) => row.exerciseId),
    campaign: {
      seals: upsert(stored.campaign.seals, changes.campaign.seals, (row) => row.exerciseId),
      checkpoints: upsert(
        stored.campaign.checkpoints,
        changes.campaign.checkpoints,
        (row) => row.worldId,
      ),
    },
    workshops: {
      progress: upsert(
        stored.workshops.progress,
        changes.workshops.progress,
        (row) => `${row.language}|${row.workshopId}`,
      ),
      objectives: upsert(
        stored.workshops.objectives,
        changes.workshops.objectives,
        (row) => `${row.language}|${row.workshopId}|${row.objectiveKey}`,
      ),
      steps: upsert(
        stored.workshops.steps,
        changes.workshops.steps,
        (row) => `${row.language}|${row.workshopId}|${row.stepKey}`,
      ),
    },
    route: {
      marks: upsert(stored.route.marks, changes.route.marks, (row) => `${row.kind}|${row.itemKey}`),
      quiz: upsert(stored.route.quiz, changes.route.quiz, (row) => row.stepId),
      notes: upsert(
        stored.route.notes,
        changes.route.notes,
        (row) => `${row.language}|${row.field}`,
      ),
    },
    preferences: newerPreferences(stored.preferences, changes.preferences),
  };
}
```

`frontend/src/features/progress-sync/model/apply-rows.ts`:

```ts
import type { CampaignStateV1 } from '../../../entities/campaign';
import type { LabRecord, LabStateV1 } from '../../../entities/exercise';
import type { RouteProgressV1 } from '../../../entities/guide';
import type { SystemsStateV1, WorkshopRecord } from '../../../entities/systems-workshop';
import { cloneJson } from '../../../shared/lib/clone-json';
import { incomingWins, type Clock } from './merge-rules';
import { fieldKeyOf, type Language, type Operation, type RouteMarkKind } from './operations';
import type { ProgressContext, ProgressSnapshot } from './progress-snapshot';
import type { ClockedText, ExerciseRow, ProgressAreas } from './server-rows';

export interface PendingClocks {
  clockOf(fieldKey: string): Clock | undefined;
}

export function pendingClocks(operations: readonly Operation[]): PendingClocks {
  const clocks = new Map<string, Clock>();
  for (const operation of operations) clocks.set(fieldKeyOf(operation), operation.at);
  return { clockOf: (fieldKey) => clocks.get(fieldKey) };
}

// A pending change keeps its local value unless the row is newer: then the change will lose on
// the server too (merge-rules.md §3), and the row is what the account will hold.
function rowWins(pending: PendingClocks, fieldKey: string, rowAt: Clock): boolean {
  const pendingAt = pending.clockOf(fieldKey);
  if (pendingAt === undefined) return true;
  return !incomingWins({ value: null, at: rowAt }, { value: null, at: pendingAt });
}

function millisOf(instant: string | null): number | undefined {
  if (instant === null) return undefined;
  const millis = Date.parse(instant);
  return Number.isNaN(millis) ? undefined : millis;
}

function recordOf(lab: LabStateV1, exerciseId: string): LabRecord {
  lab.records[exerciseId] ??= {
    predictionCorrect: false,
    assisted: false,
    solutionSeen: false,
  };
  return lab.records[exerciseId];
}

function setOrDelete(record: LabRecord, field: string, value: unknown): void {
  if (value === undefined || value === null) delete record[field];
  else record[field] = value;
}

function applyText(
  record: LabRecord,
  field: 'reflection' | 'customTest',
  value: ClockedText | null,
  wins: (at: Clock) => boolean,
): void {
  if (value !== null && wins(value.at)) record[field] = value.text;
}

function applyReview(record: LabRecord, row: ExerciseRow, wins: (at: Clock) => boolean): void {
  if (row.review === null || !wins(row.review.at)) return;
  setOrDelete(record, 'confidence', row.review.confidence);
  setOrDelete(record, 'reviewedAt', millisOf(row.review.reviewedAt));
  setOrDelete(record, 'reviewAt', millisOf(row.review.reviewDueAt));
}

function earliest(local: unknown, server: number | undefined): number | undefined {
  if (server === undefined) return typeof local === 'number' ? local : undefined;
  return typeof local === 'number' && local > 0 && local < server ? local : server;
}

function applyExercise(lab: LabStateV1, row: ExerciseRow, pending: PendingClocks): void {
  const record = recordOf(lab, row.exerciseId);
  const wins = (type: string) => (at: Clock) => rowWins(pending, `${type}|${row.exerciseId}`, at);
  if (row.prediction !== null && wins('exercise.prediction')(row.prediction.at)) {
    record.prediction = row.prediction.answer;
  }
  if (row.predictionCorrect.value) record.predictionCorrect = true;
  if (row.assisted) record.assisted = true;
  if (row.solutionSeen) record.solutionSeen = true;
  if (row.hintsRevealed !== null) {
    const local = typeof record.hints === 'number' ? record.hints : 0;
    record.hints = Math.max(local, row.hintsRevealed);
  }
  applyText(record, 'reflection', row.reflection, wins('exercise.reflection'));
  applyText(record, 'customTest', row.customTest, wins('exercise.customTest'));
  applyReview(record, row, wins('exercise.review'));
  setOrDelete(record, 'solvedAt', earliest(record.solvedAt, millisOf(row.solvedAt)));
}

function applyLab(
  lab: LabStateV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.exercises) {
    if (context.knowsExercise(row.exerciseId)) applyExercise(lab, row, pending);
  }
  for (const row of areas.drafts) {
    if (!context.knowsExercise(row.exerciseId)) continue;
    if (!rowWins(pending, `exercise.draft|${row.exerciseId}`, row.at)) continue;
    if (row.code === null) delete lab.records[row.exerciseId]?.draft;
    else recordOf(lab, row.exerciseId).draft = row.code;
  }
}

function applyCheckpoints(
  campaign: CampaignStateV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.campaign.checkpoints) {
    if (!context.knowsWorld(row.worldId)) continue;
    const local = campaign.checkpoints[row.worldId] ?? { passed: false, lastAnswer: null };
    const answer = row.lastAnswer;
    const answerWins =
      answer !== null && rowWins(pending, `checkpoint.answer|${row.worldId}`, answer.at);
    campaign.checkpoints[row.worldId] = {
      passed: local.passed || row.passed,
      lastAnswer: answerWins ? answer.value : local.lastAnswer,
    };
  }
}

function applySeals(
  campaign: CampaignStateV1,
  areas: ProgressAreas,
  context: ProgressContext,
): void {
  for (const row of areas.campaign.seals) {
    if (!context.knowsCampaignMission(row.exerciseId)) continue;
    const local = campaign.seals[row.exerciseId] ?? {
      code: false,
      prediction: false,
      assisted: false,
    };
    campaign.seals[row.exerciseId] = {
      code: local.code || row.code,
      prediction: local.prediction || row.prediction,
      assisted: local.assisted || row.assisted,
    };
  }
}

function workshopRecordOf(
  systems: SystemsStateV1,
  language: Language,
  workshopId: string,
): WorkshopRecord {
  const key = `${language}:${workshopId}`;
  systems.records[key] ??= {
    observed: [],
    code: false,
    predicted: false,
    answer: null,
    steps: [],
    note: '',
  };
  return systems.records[key];
}

function applyWorkshopProgress(
  systems: SystemsStateV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.workshops.progress) {
    if (!context.knowsWorkshop(row.workshopId, row.language)) continue;
    const record = workshopRecordOf(systems, row.language, row.workshopId);
    const where = `${row.language}|${row.workshopId}`;
    record.code ||= row.codeSealed;
    record.predicted ||= row.predictionCorrect.value;
    if (row.answer !== null && rowWins(pending, `workshop.prediction|${where}`, row.answer.at)) {
      record.answer = row.answer.value;
    }
    if (row.note !== null && rowWins(pending, `workshop.note|${where}`, row.note.at)) {
      record.note = row.note.text;
    }
  }
}

function applyWorkshopMarks(
  systems: SystemsStateV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.workshops.objectives) {
    if (!context.knowsObjective(row.workshopId, row.language, row.objectiveKey)) continue;
    const record = workshopRecordOf(systems, row.language, row.workshopId);
    if (!record.observed.includes(row.objectiveKey)) record.observed.push(row.objectiveKey);
  }
  for (const row of areas.workshops.steps) {
    const position = context.stepPositionOf(row.workshopId, row.language, row.stepKey);
    if (position === null) continue;
    const fieldKey = `workshop.step|${row.language}|${row.workshopId}|${row.stepKey}`;
    if (!rowWins(pending, fieldKey, row.at)) continue;
    const record = workshopRecordOf(systems, row.language, row.workshopId);
    const others = record.steps.filter((step) => step !== position);
    record.steps = row.marked ? [...others, position] : others;
  }
}

const MARK_LISTS: Record<RouteMarkKind, 'completed' | 'milestones' | 'favorites'> = {
  step: 'completed',
  milestone: 'milestones',
  favorite: 'favorites',
};

function knowsMark(context: ProgressContext, kind: RouteMarkKind, itemKey: string): boolean {
  if (kind === 'step') return context.knowsGuideStep(itemKey);
  if (kind === 'milestone') return context.knowsMilestone(itemKey);
  return context.knowsGuideResource(itemKey);
}

function applyRoute(
  route: RouteProgressV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.route.marks) {
    if (!knowsMark(context, row.kind, row.itemKey)) continue;
    if (!rowWins(pending, `route.mark|${row.kind}|${row.itemKey}`, row.at)) continue;
    const list = MARK_LISTS[row.kind];
    const others = route[list].filter((itemKey) => itemKey !== row.itemKey);
    route[list] = row.marked ? [...others, row.itemKey] : others;
  }
  for (const row of areas.route.quiz) {
    if (!context.knowsGuideStep(row.stepId)) continue;
    if (rowWins(pending, `route.quiz|${row.stepId}`, row.at))
      route.quizAnswers[row.stepId] = row.answer;
  }
  for (const row of areas.route.notes) {
    if (rowWins(pending, `route.note|${row.language}|${row.field}`, row.at)) {
      route.notes[row.language][row.field] = row.body;
    }
  }
}

function applyPreferences(
  snapshot: ProgressSnapshot,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  const preferences = areas.preferences;
  if (preferences === null) return;
  const { routeLanguage, focusMinutes, labSelected } = preferences;
  if (
    routeLanguage !== null &&
    rowWins(pending, 'preference.set|routeLanguage', routeLanguage.at)
  ) {
    snapshot.route.language = routeLanguage.value;
  }
  if (focusMinutes !== null && rowWins(pending, 'preference.set|focusMinutes', focusMinutes.at)) {
    snapshot.route.minutes = focusMinutes.value;
  }
  for (const [language, name] of [
    ['rust', 'labSelectedRust'],
    ['go', 'labSelectedGo'],
  ] as const) {
    const selected = labSelected[language];
    if (selected === null || !context.knowsExercise(selected.value)) continue;
    if (rowWins(pending, `preference.set|${name}`, selected.at))
      snapshot.lab.selected[language] = selected.value;
  }
}

// Writes the rows over the current v1 state, field by field. An absent row deletes nothing: only
// «Borrar todo» deletes, and it moves the epoch (FR-011). Rows the published content does not know
// are skipped and stay in the copy (risk 7 of A3).
export function applyRows(
  snapshot: ProgressSnapshot,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): ProgressSnapshot {
  const next = cloneJson(snapshot);
  applyLab(next.lab, areas, pending, context);
  applyCheckpoints(next.campaign, areas, pending, context);
  applySeals(next.campaign, areas, context);
  applyWorkshopProgress(next.systems, areas, pending, context);
  applyWorkshopMarks(next.systems, areas, pending, context);
  applyRoute(next.route, areas, pending, context);
  applyPreferences(next, areas, pending, context);
  return next;
}
```

4. Verde: 2 y 7 pruebas. Checks. Commit: `feat(progress-sync): write server rows back into the v1 stores, field by field`.

### Tarea T006 · La cola

**Archivos:** `queue.ts` y `queue.spec.ts`.

**Produce:**

```ts
export interface Stamp { readonly id: string; readonly at: string }
export function enqueue(queue: readonly Operation[], bodies: readonly OperationBody[], inFlight: ReadonlySet<string>, stamp: () => Stamp): Operation[];
export function nextBatch(queue: readonly Operation[], inFlight: ReadonlySet<string>, limits: { readonly maxOperations: number; readonly maxBytes: number }): Operation[];
export interface Settlement { readonly remaining: Operation[]; readonly rejected: number; readonly stale: Operation[] }
export function settle(queue: readonly Operation[], batch: readonly Operation[], results: readonly SyncResult[]): Settlement;
```

**Pasos:**

1. Escribí la spec (FR-062, FR-064, http.md §3.3 y §3.7, R5):

`frontend/src/features/progress-sync/model/queue.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Operation } from './operations';
import { enqueue, nextBatch, settle } from './queue';

function stamps(): () => { id: string; at: string } {
  let next = 0;
  return () => {
    next += 1;
    return { id: `op-${next}`, at: `2026-10-05T12:00:0${next}.000Z` };
  };
}

describe('enqueue', () => {
  it('folds successive writes of a field into one operation with the last value and a new id', () => {
    const stamp = stamps();
    const queue = enqueue(
      [],
      [
        { type: 'exercise.reflection', exerciseId: 'rust-01', text: 'P' },
        { type: 'exercise.reflection', exerciseId: 'rust-01', text: 'Pr' },
        { type: 'exercise.reflection', exerciseId: 'rust-01', text: 'Pri' },
      ],
      new Set(),
      stamp,
    );
    expect(queue).toEqual([
      {
        type: 'exercise.reflection',
        exerciseId: 'rust-01',
        text: 'Pri',
        id: 'op-3',
        at: '2026-10-05T12:00:03.000Z',
      },
    ]);
  });

  it('never replaces an operation that is on its way', () => {
    const stamp = stamps();
    const first = enqueue(
      [],
      [{ type: 'route.note', language: 'rust', field: 'next', body: 'a' }],
      new Set(),
      stamp,
    );
    const queue = enqueue(
      first,
      [{ type: 'route.note', language: 'rust', field: 'next', body: 'ab' }],
      new Set(['op-1']),
      stamp,
    );
    expect(queue.map((operation) => operation.id)).toEqual(['op-1', 'op-2']);
  });

  it('joins the flags of exercise.assist and keeps the highest revealed hint count', () => {
    const queue = enqueue(
      [],
      [
        { type: 'exercise.assist', exerciseId: 'rust-01', assisted: true },
        { type: 'exercise.assist', exerciseId: 'rust-01', solutionSeen: true },
        { type: 'exercise.hints', exerciseId: 'rust-01', revealed: 3 },
        { type: 'exercise.hints', exerciseId: 'rust-01', revealed: 2 },
      ],
      new Set(),
      stamps(),
    );
    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({
      type: 'exercise.assist',
      exerciseId: 'rust-01',
      assisted: true,
      solutionSeen: true,
    });
    expect(queue[1]).toMatchObject({ type: 'exercise.hints', exerciseId: 'rust-01', revealed: 3 });
  });
});

describe('nextBatch', () => {
  const queue: Operation[] = Array.from({ length: 205 }, (_, index) => ({
    id: `op-${index}`,
    at: '2026-10-05T12:00:00.000Z',
    type: 'route.mark',
    kind: 'step',
    itemKey: `rust-1-${index}`,
    marked: true,
  }));

  it('takes at most 200 operations (http.md §3.7)', () => {
    expect(nextBatch(queue, new Set(), { maxOperations: 200, maxBytes: 1_572_864 })).toHaveLength(
      200,
    );
  });

  it('stops before the byte budget and skips what is on its way', () => {
    const batch = nextBatch(queue, new Set(['op-0']), {
      maxOperations: 200,
      maxBytes: 512 + 3 * 120,
    });
    expect(batch.map((operation) => operation.id)).toEqual(['op-1', 'op-2', 'op-3']);
  });
});

describe('settle', () => {
  it('drops applied, duplicate and rejected operations, counts rejections and returns stale ones', () => {
    const operations = enqueue(
      [],
      [
        { type: 'route.mark', kind: 'step', itemKey: 'a', marked: true },
        { type: 'route.mark', kind: 'step', itemKey: 'b', marked: true },
        { type: 'route.mark', kind: 'step', itemKey: 'c', marked: true },
        { type: 'route.quiz', stepId: 'd', answer: 1, contentVersion: 'x' },
        { type: 'route.mark', kind: 'step', itemKey: 'e', marked: true },
      ],
      new Set(),
      stamps(),
    );
    const settlement = settle(operations, operations.slice(0, 4), [
      { id: 'op-1', status: 'applied' },
      { id: 'op-2', status: 'duplicate', reason: 'invalid' },
      { id: 'op-3', status: 'rejected', reason: 'unknown_reference' },
      { id: 'op-4', status: 'stale_content' },
    ]);
    expect(settlement.remaining.map((operation) => operation.id)).toEqual(['op-5']);
    expect(settlement.rejected).toBe(2);
    expect(settlement.stale.map((operation) => operation.id)).toEqual(['op-4']);
  });
});
```

2. Stubs tipados; la spec falla.
3. Implementá:

`frontend/src/features/progress-sync/model/queue.ts`:

```ts
import { fieldKeyOf, type Operation, type OperationBody } from './operations';
import type { SyncResult } from './server-rows';
import { ENVELOPE_OVERHEAD_BYTES } from './sync-limits';

export interface Stamp {
  readonly id: string;
  readonly at: string;
}

function coalesced(waiting: Operation, body: OperationBody): OperationBody {
  if (waiting.type === 'exercise.assist' && body.type === 'exercise.assist') {
    const assisted = waiting.assisted === true || body.assisted === true;
    const solutionSeen = waiting.solutionSeen === true || body.solutionSeen === true;
    return {
      type: 'exercise.assist',
      exerciseId: body.exerciseId,
      ...(assisted ? { assisted: true as const } : {}),
      ...(solutionSeen ? { solutionSeen: true as const } : {}),
    };
  }
  if (waiting.type === 'exercise.hints' && body.type === 'exercise.hints') {
    return { ...body, revealed: Math.max(waiting.revealed, body.revealed) };
  }
  return body;
}

// A new change replaces the waiting operation of its field with a fresh id: another tab may be
// sending the old one, and reusing its id would answer uuid_reused (research-d1c.md, R5).
export function enqueue(
  queue: readonly Operation[],
  bodies: readonly OperationBody[],
  inFlight: ReadonlySet<string>,
  stamp: () => Stamp,
): Operation[] {
  const waiting = new Map<string, Operation>();
  for (const operation of queue) {
    if (!inFlight.has(operation.id)) waiting.set(fieldKeyOf(operation), operation);
  }
  const replaced = new Set<Operation>();
  const added: Operation[] = [];
  for (const body of bodies) {
    const key = fieldKeyOf(body);
    const previous = waiting.get(key);
    if (previous !== undefined) replaced.add(previous);
    const operation = {
      ...(previous === undefined ? body : coalesced(previous, body)),
      ...stamp(),
    } as Operation;
    waiting.set(key, operation);
    added.push(operation);
  }
  return [...queue, ...added].filter((operation) => !replaced.has(operation));
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function nextBatch(
  queue: readonly Operation[],
  inFlight: ReadonlySet<string>,
  limits: { readonly maxOperations: number; readonly maxBytes: number },
): Operation[] {
  const batch: Operation[] = [];
  let bytes = ENVELOPE_OVERHEAD_BYTES;
  for (const operation of queue) {
    if (inFlight.has(operation.id)) continue;
    const size = byteLength(JSON.stringify(operation)) + 1;
    if (batch.length === limits.maxOperations || bytes + size > limits.maxBytes) break;
    batch.push(operation);
    bytes += size;
  }
  return batch;
}

export interface Settlement {
  readonly remaining: Operation[];
  readonly rejected: number;
  readonly stale: Operation[];
}

const REJECTION_REASONS = new Set(['invalid', 'out_of_range', 'unknown_reference']);

function isRejection(result: SyncResult): boolean {
  if (result.status === 'rejected' || result.status === 'uuid_reused') return true;
  return result.status === 'duplicate' && REJECTION_REASONS.has(result.reason ?? '');
}

function isStale(result: SyncResult): boolean {
  return result.status === 'stale_content' || result.reason === 'stale_content';
}

export function settle(
  queue: readonly Operation[],
  batch: readonly Operation[],
  results: readonly SyncResult[],
): Settlement {
  const answered = new Map(results.map((result) => [result.id, result]));
  const done = new Set<string>();
  const stale: Operation[] = [];
  let rejected = 0;
  for (const operation of batch) {
    const result = answered.get(operation.id);
    if (result === undefined) continue;
    done.add(operation.id);
    if (isRejection(result)) rejected += 1;
    if (isStale(result)) stale.push(operation);
  }
  return {
    remaining: queue.filter((operation) => !done.has(operation.id)),
    rejected,
    stale,
  };
}
```

4. Verde: 6 pruebas. Checks. Commit: `feat(progress-sync): a queue that joins changes per field and settles each batch`.

### Tarea T007 · El espacio de la cuenta y sus registros

**Archivos:** `account-space.ts` y `account-space.spec.ts`; `sync-records.ts`.

**Consume:** `StorageLike` de `shared/lib/versioned-storage`.

**Produce:**

```ts
export interface EnumerableStorage extends StorageLike { readonly length: number; key(index: number): string | null }
export interface SpaceStorage extends StorageLike { useBacking(backing: EnumerableStorage): void; clear(): void }
export function createSpaceStorage(userId: number, initial: EnumerableStorage): SpaceStorage;
export function createMemoryStorage(): EnumerableStorage;
export function sweepSpaces(storage: EnumerableStorage, currentUserId: number, now: number): number[];
export function sharedModeKey(userId: number): string;
export function readCopy(storage: StorageLike, userId: number): CopyRecord | null;
export function readQueue(storage: StorageLike): QueueRecord | null;
export function readEpochCopy(storage: StorageLike): EpochCopyRecord | null;
export function writeRecord(storage: StorageLike, key: string, record: unknown): boolean;
```

`StorageLike` no tiene `key()` ni `length`: la limpieza de FR-069 los necesita, así que `EnumerableStorage` los suma. `localStorage` la cumple.

**Pasos:**

1. Escribí la spec (FR-067, FR-069, data-model-d1c.md §4):

`frontend/src/features/progress-sync/model/account-space.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createMemoryStorage,
  createSpaceStorage,
  keysWithPrefix,
  sweepSpaces,
} from './account-space';

const NOW = Date.UTC(2026, 9, 28, 12);
const DAY = 86_400_000;

function queueText(pending: number, touchedAt: number): string {
  const operations = Array.from({ length: pending }, (_, index) => ({
    id: `op-${index}`,
  }));
  return JSON.stringify({
    format: 1,
    touchedAt: new Date(touchedAt).toISOString(),
    operations,
    deferred: [],
  });
}

describe('the account space', () => {
  it('keeps every key of the account under taller-v2:<id>: (FR-067)', () => {
    const backing = createMemoryStorage();
    const space = createSpaceStorage(41, backing);
    space.setItem('taller-learning-v1', '{}');
    space.setItem('cola', '[]');
    expect(keysWithPrefix(backing, '')).toEqual([
      'taller-v2:41:taller-learning-v1',
      'taller-v2:41:cola',
    ]);
    expect(space.getItem('taller-learning-v1')).toBe('{}');
  });

  it('clears only its own account and can move to another backing in place', () => {
    const backing = createMemoryStorage();
    backing.setItem('taller-v2:7:cola', 'x');
    backing.setItem('taller-learning-v1', 'v1');
    const space = createSpaceStorage(41, backing);
    space.setItem('copia', 'y');
    space.clear();
    expect(keysWithPrefix(backing, '')).toEqual(['taller-v2:7:cola', 'taller-learning-v1']);
    const memory = createMemoryStorage();
    space.useBacking(memory);
    space.setItem('cola', 'z');
    expect(memory.getItem('taller-v2:41:cola')).toBe('z');
    expect(backing.getItem('taller-v2:41:cola')).toBeNull();
  });
});

describe('sweepSpaces (FR-069)', () => {
  function storageWith(entries: Record<string, string>) {
    const storage = createMemoryStorage();
    for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
    return storage;
  }

  it('removes the synced spaces of other accounts and never the current one', () => {
    const storage = storageWith({
      'taller-v2:7:taller-learning-v1': '{}',
      'taller-v2:7:cola': queueText(0, NOW),
      'taller-v2:41:cola': queueText(0, NOW),
      'taller-v2-compartida:7': '1',
      'taller-v1-importado:7': '{}',
      'taller-learning-v1': '{}',
    });
    expect(sweepSpaces(storage, 41, NOW)).toEqual([7]);
    expect(keysWithPrefix(storage, '')).toEqual([
      'taller-v2:41:cola',
      'taller-v2-compartida:7',
      'taller-v1-importado:7',
      'taller-learning-v1',
    ]);
  });

  it('keeps a space with something unsent until it is 30 days old', () => {
    const storage = storageWith({
      'taller-v2:7:cola': queueText(2, NOW - 29 * DAY),
      'taller-v2:8:cola': queueText(2, NOW - 31 * DAY),
      'taller-v2:9:copia-epoca': '{}',
    });
    expect(sweepSpaces(storage, 41, NOW)).toEqual([8]);
  });

  it('keeps a space whose queue it cannot read', () => {
    const storage = storageWith({ 'taller-v2:7:cola': '{roto' });
    expect(sweepSpaces(storage, 41, NOW)).toEqual([]);
  });
});
```

2. Stubs tipados; la spec falla.
3. Implementá:

`frontend/src/features/progress-sync/model/account-space.ts`:

```ts
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { SPACE_LIFETIME_MS } from './sync-limits';

export const SPACE_PREFIX = 'taller-v2:';
export const SHARED_MODE_PREFIX = 'taller-v2-compartida:';
export const COPY_KEY = 'copia';
export const QUEUE_KEY = 'cola';
export const EPOCH_COPY_KEY = 'copia-epoca';

export interface EnumerableStorage extends StorageLike {
  readonly length: number;
  key(index: number): string | null;
}

export interface SpaceStorage extends StorageLike {
  useBacking(backing: EnumerableStorage): void;
  clear(): void;
}

export function spacePrefix(userId: number): string {
  return `${SPACE_PREFIX}${userId}:`;
}

export function keysWithPrefix(storage: EnumerableStorage, prefix: string): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key !== null && key.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

export function createMemoryStorage(): EnumerableStorage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, String(value));
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

export function createSpaceStorage(userId: number, initial: EnumerableStorage): SpaceStorage {
  const prefix = spacePrefix(userId);
  let backing = initial;
  return {
    getItem: (key) => backing.getItem(prefix + key),
    setItem: (key, value) => backing.setItem(prefix + key, value),
    removeItem: (key) => backing.removeItem(prefix + key),
    useBacking(next) {
      backing = next;
    },
    clear() {
      for (const key of keysWithPrefix(backing, prefix)) backing.removeItem(key);
    },
  };
}

function idOf(key: string): number | null {
  const rest = key.slice(SPACE_PREFIX.length);
  const id = Number(rest.slice(0, rest.indexOf(':')));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

type SpaceFate = 'remove' | 'keep';

interface StoredQueue {
  readonly pending: number;
  readonly touchedAt: number;
}

function storedQueueOf(text: string): StoredQueue | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const record = value as { operations?: unknown; deferred?: unknown; touchedAt?: unknown };
  if (!Array.isArray(record.operations) || !Array.isArray(record.deferred)) return null;
  const touchedAt = typeof record.touchedAt === 'string' ? Date.parse(record.touchedAt) : NaN;
  return { pending: record.operations.length + record.deferred.length, touchedAt };
}

function fateOf(storage: EnumerableStorage, prefix: string, now: number): SpaceFate {
  const queueText = storage.getItem(prefix + QUEUE_KEY);
  const hasEpochCopy = storage.getItem(prefix + EPOCH_COPY_KEY) !== null;
  if (queueText === null) return hasEpochCopy ? 'keep' : 'remove';
  const queue = storedQueueOf(queueText);
  if (queue === null) return 'keep';
  if (queue.pending === 0 && !hasEpochCopy) return 'remove';
  const expired = !Number.isNaN(queue.touchedAt) && now - queue.touchedAt > SPACE_LIFETIME_MS;
  return expired ? 'remove' : 'keep';
}

// FR-069: the spaces of other accounts go when they are synced or expired (30 days). An unreadable
// queue stays: nobody can tell whether it holds something that was not sent.
export function sweepSpaces(
  storage: EnumerableStorage,
  currentUserId: number,
  now: number,
): number[] {
  const others = new Set<number>();
  for (const key of keysWithPrefix(storage, SPACE_PREFIX)) {
    const id = idOf(key);
    if (id !== null && id !== currentUserId) others.add(id);
  }
  const swept: number[] = [];
  for (const id of others) {
    const prefix = spacePrefix(id);
    if (fateOf(storage, prefix, now) === 'keep') continue;
    for (const key of keysWithPrefix(storage, prefix)) storage.removeItem(key);
    swept.push(id);
  }
  return swept;
}

export function sharedModeKey(userId: number): string {
  return `${SHARED_MODE_PREFIX}${userId}`;
}
```

`frontend/src/features/progress-sync/model/sync-records.ts`:

```ts
import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { COPY_KEY, EPOCH_COPY_KEY, QUEUE_KEY } from './account-space';
import type { Operation } from './operations';
import { emptyAreas, readAreas, type ProgressAreas } from './server-rows';

export const RECORD_FORMAT = 1;

export interface CopyRecord {
  readonly format: 1;
  readonly userId: number;
  readonly epoch: number;
  readonly revision: number;
  readonly contentVersion: string | null;
  readonly etag: string | null;
  readonly resetAt: string | null;
  readonly clockOffsetMs: number;
  readonly areas: ProgressAreas;
}

export interface QueueRecord {
  readonly format: 1;
  readonly touchedAt: string;
  readonly operations: readonly Operation[];
  readonly deferred: readonly Operation[];
}

export interface EpochCopyRecord {
  readonly format: 1;
  readonly epoch: number;
  readonly createdAt: string;
  readonly operations: readonly Operation[];
}

function parsed(storage: StorageLike, key: string): Record<string, unknown> | null {
  let text: string | null;
  try {
    text = storage.getItem(key);
  } catch {
    return null;
  }
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    return isPlainObject(value) && value.format === RECORD_FORMAT ? value : null;
  } catch {
    return null;
  }
}

function isOptionalText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function blankCopy(userId: number): CopyRecord {
  return {
    format: 1,
    userId,
    epoch: 1,
    revision: 0,
    contentVersion: null,
    etag: null,
    resetAt: null,
    clockOffsetMs: 0,
    areas: emptyAreas(),
  };
}

function hasCopyHeader(value: Record<string, unknown>): boolean {
  const { epoch, revision, contentVersion, etag, resetAt, clockOffsetMs } = value;
  if (!Number.isSafeInteger(epoch) || !Number.isSafeInteger(revision)) return false;
  if (typeof clockOffsetMs !== 'number') return false;
  return isOptionalText(contentVersion) && isOptionalText(etag) && isOptionalText(resetAt);
}

export function readCopy(storage: StorageLike, userId: number): CopyRecord | null {
  const value = parsed(storage, COPY_KEY);
  if (value === null || value.userId !== userId || !isPlainObject(value.areas)) return null;
  if (!hasCopyHeader(value)) return null;
  const areas = readAreas(value.areas);
  return areas === null ? null : ({ ...value, areas } as unknown as CopyRecord);
}

export function blankQueue(now: Date): QueueRecord {
  return {
    format: 1,
    touchedAt: now.toISOString(),
    operations: [],
    deferred: [],
  };
}

export function readQueue(storage: StorageLike): QueueRecord | null {
  const value = parsed(storage, QUEUE_KEY);
  if (value === null || typeof value.touchedAt !== 'string') return null;
  if (!Array.isArray(value.operations) || !Array.isArray(value.deferred)) return null;
  return value as unknown as QueueRecord;
}

export function readEpochCopy(storage: StorageLike): EpochCopyRecord | null {
  const value = parsed(storage, EPOCH_COPY_KEY);
  if (value === null || !Number.isSafeInteger(value.epoch) || !Array.isArray(value.operations))
    return null;
  return value as unknown as EpochCopyRecord;
}

export function writeRecord(storage: StorageLike, key: string, record: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function removeRecord(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // The space keeps it; the next sign-out or sweep removes it.
  }
}
```

4. Verde: 5 pruebas. Checks. Commit: `feat(progress-sync): the account space, the memory backing and the sweep of FR-069`.

### Tarea T008 · La importación del v1 y la nueva corrección

**Archivos:** `v1-import.ts` y `v1-import.spec.ts`; `reevaluate.ts` y `reevaluate.spec.ts`.

**Consume:** `backupKeysFor` de `versioned-storage`; `wellFormed` y `wellFormedDeep` (T002); el fixture congelado `qa/fixtures/shared/import-cases.json` y `qa/fixtures/progress-master-2a278ad-storage.json` (sólo lectura).

**Produce:**

```ts
export type V1Keys = Readonly<Record<V1Section, string>>;
export type V1Parsers = Readonly<Record<V1Section, (raw: unknown) => unknown>>;
export function readV1Candidate(storage: StorageLike, keys: V1Keys): V1Candidate | null;
export function storageImportBody(candidate: V1Candidate, keys: V1Keys, parsers: V1Parsers, ticket: ImportTicket): ImportBody;
export function exportImportBody(text: string, parsers: V1Parsers, ticket: ImportTicket): ImportBody;
export function archiveV1(storage: StorageLike, keys: V1Keys, userId: number, entry: { readonly importId: string; readonly importedAt: string }): boolean;
export function summarizeLab(raw: unknown): V1Summary;
export function reevaluate(operation: Operation, context: ProgressContext): OperationBody | null;
```

**Pasos:**

1. Escribí las specs. La de la importación compara cada cuerpo con el crudo y el normalizado del fixture congelado de D1b, que produjeron los parsers congelados (import-cases-check): los parsers de la spec devuelven ese normalizado, así que la prueba fija cómo se arma el cuerpo y no repite el algoritmo.

`frontend/src/features/progress-sync/model/v1-import.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import masterStorage from '../../../../../qa/fixtures/progress-master-2a278ad-storage.json';
import importCases from '../../../../../qa/fixtures/shared/import-cases.json';
import { createMemoryStorage, keysWithPrefix } from './account-space';
import {
  archiveV1,
  exportImportBody,
  readV1Candidate,
  storageImportBody,
  summarizeLab,
  type V1Keys,
  type V1Parsers,
  type V1Section,
} from './v1-import';

const KEYS: V1Keys = {
  route: 'taller-learning-v1',
  lab: 'taller-laboratorio-v1',
  campaign: 'taller-campaign-v1',
  systems: 'taller-systems-v1',
};

interface ImportCase {
  id: string;
  source: 'storage' | 'export';
  raw: string;
  normalized: Record<V1Section, unknown>;
}

const cases = importCases.cases as ImportCase[];

// The frozen parsers already produced each case's `normalized` (import-cases-check): these
// stand-ins return it, so the spec checks how the body is put together, not the parsers.
function parsersOf(item: ImportCase): V1Parsers {
  return {
    route: () => item.normalized.route,
    lab: () => item.normalized.lab,
    campaign: () => item.normalized.campaign,
    systems: () => item.normalized.systems,
  };
}

const TICKET = {
  importId: '6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f',
  epoch: 1,
  confirm: false,
};

function storageWith(entries: Record<string, string>) {
  const storage = createMemoryStorage();
  for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
  return storage;
}

describe('readV1Candidate', () => {
  it('offers the frozen master progress with its summary and writes nothing', () => {
    const master = masterStorage as Record<string, string>;
    const storage = storageWith(master);
    const candidate = readV1Candidate(storage, KEYS);
    expect(candidate?.summary).toEqual(summarizeLab(JSON.parse(master['taller-laboratorio-v1'])));
    expect(candidate?.summary.solvedCount).toBeGreaterThan(0);
    expect(keysWithPrefix(storage, '').sort()).toEqual(Object.keys(master).sort());
  });

  it('does not offer the blank route that F8 leaves after «Borrar todo»', () => {
    const blank = {
      version: 1,
      language: 'rust',
      completed: [],
      milestones: [],
      favorites: [],
      quizAnswers: {},
      notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
      minutes: 25,
    };
    expect(
      readV1Candidate(storageWith({ 'taller-learning-v1': JSON.stringify(blank) }), KEYS),
    ).toBeNull();
  });

  it('does not offer an unreadable copy, and leaves it where it is', () => {
    const storage = storageWith({ 'taller-laboratorio-v1': '{roto' });
    expect(readV1Candidate(storage, KEYS)).toBeNull();
    expect(storage.getItem('taller-laboratorio-v1')).toBe('{roto');
  });

  it('counts the solved records and dates the newest result', () => {
    const lab = {
      version: 1,
      records: {
        a: { solvedAt: 5, result: { time: Date.UTC(2026, 0, 2) } },
        b: { result: { time: Date.UTC(2026, 0, 1) } },
      },
    };
    expect(summarizeLab(lab)).toEqual({
      solvedCount: 1,
      lastResultAt: '2026-01-02T00:00:00.000Z',
    });
  });
});

describe('the import bodies (http-d1b.md §3)', () => {
  it.each(cases.filter((item) => item.source === 'storage'))(
    '$id: the raw and the sections of the storage',
    (item) => {
      const storage = storageWith(JSON.parse(item.raw) as Record<string, string>);
      const candidate = readV1Candidate(storage, KEYS);
      expect(candidate).not.toBeNull();
      const body = storageImportBody(candidate!, KEYS, parsersOf(item), TICKET);
      expect(body).toEqual({
        format: 2,
        ...TICKET,
        source: 'storage',
        raw: item.raw,
        normalized: item.normalized,
      });
    },
  );

  it.each(cases.filter((item) => item.source === 'export'))(
    '$id: the raw and the sections of the file',
    (item) => {
      const body = exportImportBody(item.raw, parsersOf(item), TICKET);
      expect(body).toEqual({
        format: 2,
        ...TICKET,
        source: 'export',
        raw: item.raw,
        normalized: item.normalized,
      });
    },
  );

  it('sends every normalized text well formed, and the raw as it was stored (D1b R26)', () => {
    const route = {
      version: 1,
      completed: ['rust-1-1'],
      notes: { rust: { learned: 'a\uD800', next: '' } },
    };
    const storage = storageWith({
      'taller-learning-v1': JSON.stringify(route),
    });
    const parsers = {
      route: (raw: unknown) => raw,
      lab: () => null,
      campaign: () => null,
      systems: () => null,
    };
    const body = storageImportBody(readV1Candidate(storage, KEYS)!, KEYS, parsers, TICKET);
    expect(body.raw).toBe(JSON.stringify({ 'taller-learning-v1': JSON.stringify(route) }));
    expect(body.normalized.route).toEqual({
      ...route,
      notes: { rust: { learned: 'a\uFFFD', next: '' } },
    });
  });
});

describe('archiveV1 (FR-072)', () => {
  it('moves the v1 keys and their backups to the account archive', () => {
    const storage = storageWith({
      'taller-learning-v1': '{"version":1}',
      'taller-learning-v1:respaldo': 'old',
      'taller-systems-v1': '{"version":1}',
      'taller-v2:41:cola': 'q',
    });
    expect(
      archiveV1(storage, KEYS, 41, {
        importId: TICKET.importId,
        importedAt: '2026-10-28T12:00:00.000Z',
      }),
    ).toBe(true);
    expect(keysWithPrefix(storage, '')).toEqual(['taller-v2:41:cola', 'taller-v1-importado:41']);
    expect(JSON.parse(storage.getItem('taller-v1-importado:41')!)).toEqual({
      format: 1,
      imports: [
        {
          importId: TICKET.importId,
          importedAt: '2026-10-28T12:00:00.000Z',
          entries: {
            'taller-learning-v1': '{"version":1}',
            'taller-learning-v1:respaldo': 'old',
            'taller-systems-v1': '{"version":1}',
          },
        },
      ],
    });
  });
});
```

`frontend/src/features/progress-sync/model/reevaluate.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Operation } from './operations';
import { CONTENT_VERSION, progressContext } from './progress-context.fixture';
import { reevaluate } from './reevaluate';

const OLD = 'ffffffffffffffffffffffffffffffff';
const stamped = { id: 'op-1', at: '2026-10-05T12:00:00.000Z' };

describe('reevaluate', () => {
  it('sends again, with the published version, an answer that is right with that content', () => {
    const operation: Operation = {
      ...stamped,
      type: 'exercise.prediction',
      exerciseId: 'rust-01',
      answer: 2,
      correct: false,
      contentVersion: OLD,
    };
    expect(reevaluate(operation, progressContext)).toEqual({
      type: 'exercise.prediction',
      exerciseId: 'rust-01',
      answer: 2,
      correct: true,
      contentVersion: CONTENT_VERSION,
    });
  });

  it('drops a wrong answer and a quiz answer, which has no flag to earn', () => {
    const wrong: Operation = {
      ...stamped,
      type: 'checkpoint.answer',
      worldId: 'rust-world-1',
      answer: 0,
      passed: true,
      contentVersion: OLD,
    };
    const quiz: Operation = {
      ...stamped,
      type: 'route.quiz',
      stepId: 'rust-1-1',
      answer: 1,
      contentVersion: OLD,
    };
    expect([reevaluate(wrong, progressContext), reevaluate(quiz, progressContext)]).toEqual([
      null,
      null,
    ]);
  });
});
```

2. Stubs tipados; las dos specs fallan.
3. Implementá:

`frontend/src/features/progress-sync/model/v1-import.ts`:

```ts
import { isPlainObject } from '../../../shared/lib/is-plain-object';
import { backupKeysFor, type StorageLike } from '../../../shared/lib/versioned-storage';
import { wellFormed, wellFormedDeep } from '../../../shared/lib/well-formed';
import type { ImportSource, V1Summary } from './types';
import { SYNC_FORMAT } from './sync-limits';

export type V1Section = 'route' | 'lab' | 'campaign' | 'systems';
export type V1Keys = Readonly<Record<V1Section, string>>;
export type V1Parsers = Readonly<Record<V1Section, (raw: unknown) => unknown>>;

export const V1_SECTIONS: readonly V1Section[] = ['route', 'lab', 'campaign', 'systems'];
export const ARCHIVE_PREFIX = 'taller-v1-importado:';
const EXPORT_ONLY_KEYS = ['lab', 'campaign', 'systems', 'exportedAt'];

export interface V1Candidate {
  readonly texts: Readonly<Partial<Record<V1Section, string>>>;
  readonly summary: V1Summary;
}

export interface ImportBody {
  readonly format: 2;
  readonly importId: string;
  readonly epoch: number;
  readonly source: ImportSource;
  readonly raw: string;
  readonly normalized: Readonly<Partial<Record<V1Section, unknown>>>;
  readonly confirm: boolean;
}

export interface ImportTicket {
  readonly importId: string;
  readonly epoch: number;
  readonly confirm: boolean;
}

function isEmptyObject(value: unknown): boolean {
  return isPlainObject(value) && Object.keys(value).length === 0;
}

function isEmptyList(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.length === 0);
}

function isBlankNotes(notes: unknown): boolean {
  if (!isPlainObject(notes)) return true;
  return Object.values(notes).every(
    (language) =>
      !isPlainObject(language) ||
      Object.values(language).every((text) => text === '' || text === undefined),
  );
}

// A blank route is what F8's «Borrar todo» leaves behind: not a v1 to import (F8 spec :917, :931).
const BLANK: Readonly<Record<V1Section, (value: Record<string, unknown>) => boolean>> = {
  route: (value) =>
    isEmptyList(value.completed) &&
    isEmptyList(value.milestones) &&
    isEmptyList(value.favorites) &&
    (value.quizAnswers === undefined || isEmptyObject(value.quizAnswers)) &&
    isBlankNotes(value.notes),
  lab: (value) => value.records === undefined || isEmptyObject(value.records),
  campaign: (value) =>
    (value.seals === undefined || isEmptyObject(value.seals)) &&
    (value.checkpoints === undefined || isEmptyObject(value.checkpoints)),
  systems: (value) => value.records === undefined || isEmptyObject(value.records),
};

function isSolved(record: Record<string, unknown>): boolean {
  return typeof record.solvedAt === 'number' && record.solvedAt > 0;
}

function resultTimeOf(record: Record<string, unknown>): number | null {
  const time = isPlainObject(record.result) ? record.result.time : undefined;
  return typeof time === 'number' && Number.isFinite(time) ? time : null;
}

export function summarizeLab(raw: unknown): V1Summary {
  const values = isPlainObject(raw) && isPlainObject(raw.records) ? Object.values(raw.records) : [];
  const records = values.filter(isPlainObject);
  const times = records.map(resultTimeOf).filter((time): time is number => time !== null);
  const lastResultAt = times.length > 0 ? new Date(Math.max(...times)).toISOString() : null;
  return { solvedCount: records.filter(isSolved).length, lastResultAt };
}

function readText(storage: StorageLike, key: string): string | null | undefined {
  try {
    return storage.getItem(key);
  } catch {
    return undefined;
  }
}

export function readV1Candidate(storage: StorageLike, keys: V1Keys): V1Candidate | null {
  const texts: Partial<Record<V1Section, string>> = {};
  let somethingToImport = false;
  for (const section of V1_SECTIONS) {
    const text = readText(storage, keys[section]);
    if (text === undefined) return null;
    if (text === null) continue;
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      return null;
    }
    if (!isPlainObject(value)) return null;
    texts[section] = text;
    if (!BLANK[section](value)) somethingToImport = true;
  }
  if (!somethingToImport) return null;
  const lab = texts.lab === undefined ? undefined : (JSON.parse(texts.lab) as unknown);
  return { texts, summary: summarizeLab(lab) };
}

function normalize(
  sections: Partial<Record<V1Section, unknown>>,
  parsers: V1Parsers,
): ImportBody['normalized'] {
  const normalized: Partial<Record<V1Section, unknown>> = {};
  for (const section of V1_SECTIONS) {
    if (sections[section] !== undefined)
      normalized[section] = wellFormedDeep(parsers[section](sections[section]));
  }
  return normalized;
}

export function storageImportBody(
  candidate: V1Candidate,
  keys: V1Keys,
  parsers: V1Parsers,
  ticket: ImportTicket,
): ImportBody {
  const stored: Record<string, string> = {};
  const sections: Partial<Record<V1Section, unknown>> = {};
  for (const section of V1_SECTIONS) {
    const text = candidate.texts[section];
    if (text === undefined) continue;
    stored[keys[section]] = wellFormed(text);
    sections[section] = JSON.parse(text) as unknown;
  }
  const raw = JSON.stringify(stored);
  return {
    format: SYNC_FORMAT,
    ...ticket,
    source: 'storage',
    raw,
    normalized: normalize(sections, parsers),
  };
}

export function exportImportBody(
  text: string,
  parsers: V1Parsers,
  ticket: ImportTicket,
): ImportBody {
  const raw = wellFormed(text);
  const file: unknown = JSON.parse(raw);
  if (!isPlainObject(file)) throw new Error('El archivo no es una copia del progreso.');
  const route = Object.fromEntries(
    Object.entries(file).filter(([key]) => !EXPORT_ONLY_KEYS.includes(key)),
  );
  const sections = {
    route,
    lab: file.lab,
    campaign: file.campaign,
    systems: file.systems,
  };
  return {
    format: SYNC_FORMAT,
    ...ticket,
    source: 'export',
    raw,
    normalized: normalize(sections, parsers),
  };
}

export function archiveKey(userId: number): string {
  return `${ARCHIVE_PREFIX}${userId}`;
}

// FR-072: after a 201 or 200, the v1 keys and their backups move to the account's archive.
export function archiveV1(
  storage: StorageLike,
  keys: V1Keys,
  userId: number,
  entry: { readonly importId: string; readonly importedAt: string },
): boolean {
  const entries: Record<string, string> = {};
  for (const section of V1_SECTIONS) {
    for (const key of [keys[section], ...backupKeysFor(keys[section])]) {
      const text = readText(storage, key);
      if (typeof text === 'string') entries[key] = text;
    }
  }
  const previous = readText(storage, archiveKey(userId));
  let imports: unknown[] = [];
  try {
    const parsedArchive: unknown = previous ? JSON.parse(previous) : null;
    if (isPlainObject(parsedArchive) && Array.isArray(parsedArchive.imports))
      imports = parsedArchive.imports;
  } catch {
    imports = [];
  }
  try {
    storage.setItem(
      archiveKey(userId),
      JSON.stringify({
        format: 1,
        imports: [...imports, { ...entry, entries }],
      }),
    );
  } catch {
    return false;
  }
  for (const key of Object.keys(entries)) storage.removeItem(key);
  return true;
}
```

`frontend/src/features/progress-sync/model/reevaluate.ts`:

```ts
import type { Operation, OperationBody } from './operations';
import type { ProgressContext } from './progress-snapshot';

// FR-007 and FR-064: a stale_content answer was stored by its clock without its flag. Graded again
// with the published content, it goes back to the queue only if it now earns the flag.
export function reevaluate(operation: Operation, context: ProgressContext): OperationBody | null {
  const contentVersion = context.contentVersion;
  switch (operation.type) {
    case 'exercise.prediction': {
      const correct = context.predictionAnswerOf(operation.exerciseId) === operation.answer;
      const { exerciseId, answer } = operation;
      return correct ? { type: operation.type, exerciseId, answer, correct, contentVersion } : null;
    }
    case 'checkpoint.answer': {
      const passed = context.checkpointAnswerOf(operation.worldId) === operation.answer;
      const { worldId, answer } = operation;
      return passed ? { type: operation.type, worldId, answer, passed, contentVersion } : null;
    }
    case 'workshop.prediction': {
      const { workshopId, language, answer } = operation;
      const correct = context.workshopAnswerOf(workshopId, language) === answer;
      return correct
        ? {
            type: operation.type,
            workshopId,
            language,
            answer,
            correct,
            contentVersion,
          }
        : null;
    }
    default:
      return null;
  }
}
```

4. Verde: 9 y 2 pruebas. Checks. Commit: `feat(progress-sync): the v1 import bodies, the archive of FR-072 and the regrading of stale answers`.

### Tarea T009 · Compuerta de U1 (K)

La compuerta de la sección 0, con `npm run test:unit` sumando 57 pruebas nuevas en 11 archivos. PR: `feat(progress-sync): the pure model of the v2 client (D1c U1)`.

## 2. Unidad 2 · El transporte y el motor (dueño E)

### Tarea T010 · El transporte

**Archivos:** `frontend/src/features/progress-sync/api/sync-transport.ts` y `sync-transport.spec.ts`.

**Consume:** `ApiClient`, `ApiFailure`, `ApiResult` y `readXsrfToken` de `shared/api/http` (F11a, `impl-f11a` `a7b3c71d`); `createFakeFetch` de `shared/api/http/fake-fetch.ts` en la spec.

**Produce:** `SyncTransport`, `SyncEnvelope`, `SyncFailure`, `ReadOutcome`, `SendOutcome`, `ImportOutcome`, `ProgressFetch`, `failureOfApi(failure)` y `createSyncTransport({ client, fetch, readCookies })`.

**Por qué dos caminos** (R10): la escritura usa `ApiClient.send`, que ya resuelve el CSRF, `X-Taller-User` y el 419 con la comparación de la cuenta (FR-065); la lectura con `If-None-Match` y el envío con `keepalive` usan un `fetch` propio, porque `ApiClient` no expone encabezados, el 304 ni `keepalive`, como resolvió A3.

**Pasos:**

1. Escribí la spec (http.md §2 a §4 y §6; http-d1b.md §3.4; la tabla de R10):

`frontend/src/features/progress-sync/api/sync-transport.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../../shared/api/http';
import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
import { emptyAreas } from '../model/server-rows';
import { createSyncTransport, failureOfApi, type SyncEnvelope } from './sync-transport';

const COOKIES = 'XSRF-TOKEN=e2e-xsrf%3D';
const ENVELOPE: SyncEnvelope = {
  epoch: 1,
  sentAt: '2026-10-28T12:00:00.000Z',
  knownRevision: 0,
  knownContentVersion: null,
  format: 2,
  operations: [],
};
const PHOTO = {
  userId: 41,
  epoch: 1,
  revision: 3,
  resetAt: null,
  contentVersion: '0123456789abcdef0123456789abcdef',
  serverTime: '2026-10-28T12:00:00.000Z',
  full: true,
  ...emptyAreas(),
};

function transportWith(replies: readonly (FakeReply | 'network-error')[]) {
  const fake = createFakeFetch(replies);
  const client = createApiClient({
    fetch: fake.fetch,
    readCookies: () => COOKIES,
  });
  const transport = createSyncTransport({
    client,
    fetch: fake.fetch,
    readCookies: () => COOKIES,
  });
  return { transport, calls: fake.calls };
}

describe('readProgress', () => {
  it('asks with If-None-Match and reads a 304 as not modified', async () => {
    const { transport, calls } = transportWith([{ status: 304 }]);
    expect(await transport.readProgress('W/"u41.e1.r3.cx"', new AbortController().signal)).toEqual({
      kind: 'not-modified',
    });
    expect(calls[0]).toMatchObject({
      path: '/api/progress',
      method: 'GET',
      credentials: 'same-origin',
    });
    expect(calls[0].headers['if-none-match']).toBe('W/"u41.e1.r3.cx"');
    expect(calls[0].headers['x-taller-user']).toBeUndefined();
  });

  it('returns the photo with its validator', async () => {
    const { transport } = transportWith([
      { status: 200, json: PHOTO, headers: { ETag: 'W/"u41.e1.r3.cx"' } },
    ]);
    const outcome = await transport.readProgress(null, new AbortController().signal);
    expect(outcome).toMatchObject({
      kind: 'photo',
      etag: 'W/"u41.e1.r3.cx"',
      photo: { userId: 41, revision: 3 },
    });
  });

  it('reads a 401 as signed out and a failed fetch as offline', async () => {
    const signal = new AbortController().signal;
    expect(
      await transportWith([
        { status: 401, json: { message: 'm', code: 'unauthenticated' } },
      ]).transport.readProgress(null, signal),
    ).toEqual({ kind: 'failed', failure: { kind: 'signed-out' } });
    expect(await transportWith(['network-error']).transport.readProgress(null, signal)).toEqual({
      kind: 'failed',
      failure: { kind: 'offline' },
    });
  });
});

describe('sendBatch', () => {
  it('posts the envelope with the expected account and the CSRF token', async () => {
    const answer = {
      epoch: 1,
      revision: 1,
      serverTime: ENVELOPE.sentAt,
      contentVersion: PHOTO.contentVersion,
      results: [],
      changes: { full: true, ...emptyAreas() },
    };
    const { transport, calls } = transportWith([{ status: 200, json: answer }]);
    const outcome = await transport.sendBatch(ENVELOPE, 41);
    expect(outcome).toMatchObject({
      kind: 'answered',
      response: { revision: 1, full: true },
    });
    expect(calls[0]).toMatchObject({
      path: '/api/sync',
      method: 'POST',
      body: ENVELOPE,
    });
    expect(calls[0].headers['x-taller-user']).toBe('41');
    expect(calls[0].headers['x-xsrf-token']).toBe('e2e-xsrf=');
  });
});

describe('sendOnUnload', () => {
  it('sends with keepalive and does not wait for the answer', () => {
    const sent: RequestInit[] = [];
    const transport = createSyncTransport({
      client: createApiClient({
        fetch: async () => new Response(null, { status: 204 }),
        readCookies: () => COOKIES,
      }),
      fetch: async (_input, init) => {
        sent.push(init);
        return new Response(null, { status: 200 });
      },
      readCookies: () => COOKIES,
    });
    transport.sendOnUnload(ENVELOPE, 41);
    expect(sent[0]).toMatchObject({
      method: 'POST',
      keepalive: true,
      body: JSON.stringify(ENVELOPE),
    });
    expect(new Headers(sent[0].headers).get('X-Taller-User')).toBe('41');
  });
});

describe('failureOfApi', () => {
  const response = (status: number, code: string) =>
    ({
      kind: 'response',
      status,
      code,
      message: 'm',
      fieldErrors: {},
      retryAfterSeconds: 7,
    }) as const;

  it.each([
    [{ kind: 'network' } as const, { kind: 'offline' }],
    [{ kind: 'account-changed', message: 'm' } as const, { kind: 'account-mismatch' }],
    [response(409, 'account_mismatch'), { kind: 'account-mismatch' }],
    [response(409, 'epoch_mismatch'), { kind: 'epoch-mismatch' }],
    [response(409, 'client_outdated'), { kind: 'outdated' }],
    [response(403, 'account_disabled'), { kind: 'disabled' }],
    [response(409, 'import_needs_confirmation'), { kind: 'needs-confirmation' }],
    [response(401, 'unauthenticated'), { kind: 'signed-out' }],
    [response(429, 'too_many_requests'), { kind: 'refused', message: 'm', retryAfterSeconds: 7 }],
    [response(503, 'content_not_imported'), { kind: 'error', retryAfterSeconds: 7 }],
    [{ kind: 'unexpected', status: 413 } as const, { kind: 'too-large' }],
  ])('maps %o to %o (research-d1c.md, R10)', (failure, expected) => {
    expect(failureOfApi(failure)).toEqual(expected);
  });
});
```

2. Stubs tipados de `failureOfApi` y `createSyncTransport`; la spec falla.
3. Implementá:

`frontend/src/features/progress-sync/api/sync-transport.ts`:

```ts
import type { ApiClient, ApiFailure, ApiResult } from '../../../shared/api/http';
import { readXsrfToken } from '../../../shared/api/http';
import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { Operation } from '../model/operations';
import {
  readPhoto,
  readSyncResponse,
  type ProgressPhoto,
  type SyncResponse,
} from '../model/server-rows';
import type { ImportReport } from '../model/types';
import type { ImportBody } from '../model/v1-import';

export interface ProgressResponse {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type ProgressFetch = (input: string, init: RequestInit) => Promise<ProgressResponse>;

export interface SyncEnvelope {
  readonly epoch: number;
  readonly sentAt: string;
  readonly knownRevision: number;
  readonly knownContentVersion: string | null;
  readonly format: 2;
  readonly operations: readonly Operation[];
}

export type SyncFailure =
  | { readonly kind: 'offline' }
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'account-mismatch' }
  | { readonly kind: 'epoch-mismatch' }
  | { readonly kind: 'outdated' }
  | { readonly kind: 'disabled' }
  | { readonly kind: 'needs-confirmation' }
  | { readonly kind: 'too-large' }
  | {
      readonly kind: 'refused';
      readonly message: string;
      readonly retryAfterSeconds: number | null;
    }
  | { readonly kind: 'error'; readonly retryAfterSeconds: number | null };

export type ReadOutcome =
  | {
      readonly kind: 'photo';
      readonly photo: ProgressPhoto;
      readonly etag: string | null;
    }
  | { readonly kind: 'not-modified' }
  | { readonly kind: 'failed'; readonly failure: SyncFailure };

export type SendOutcome =
  | { readonly kind: 'answered'; readonly response: SyncResponse }
  | { readonly kind: 'failed'; readonly failure: SyncFailure };

export type ImportOutcome =
  | {
      readonly kind: 'imported';
      readonly report: ImportReport;
      readonly replayed: boolean;
    }
  | { readonly kind: 'failed'; readonly failure: SyncFailure };

export interface SyncTransport {
  readProgress(etag: string | null, signal: AbortSignal): Promise<ReadOutcome>;
  sendBatch(envelope: SyncEnvelope, userId: number): Promise<SendOutcome>;
  sendOnUnload(envelope: SyncEnvelope, userId: number): void;
  importProgress(body: ImportBody, userId: number): Promise<ImportOutcome>;
}

export interface SyncTransportOptions {
  readonly client: ApiClient;
  readonly fetch: ProgressFetch;
  readCookies(): string;
}

const NOT_MODIFIED = 304;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const TOO_LARGE = 413;
const UNPROCESSABLE = 422;
const TOO_MANY = 429;

const CODES: Readonly<Record<string, SyncFailure>> = {
  account_mismatch: { kind: 'account-mismatch' },
  epoch_mismatch: { kind: 'epoch-mismatch' },
  client_outdated: { kind: 'outdated' },
  account_disabled: { kind: 'disabled' },
  import_needs_confirmation: { kind: 'needs-confirmation' },
};

function failureOfResponse(failure: Extract<ApiFailure, { kind: 'response' }>): SyncFailure {
  if (failure.status === UNAUTHORIZED) return { kind: 'signed-out' };
  const known = CODES[failure.code];
  if (known !== undefined) return known;
  if (failure.status === UNPROCESSABLE || failure.status === TOO_MANY) {
    return {
      kind: 'refused',
      message: failure.message,
      retryAfterSeconds: failure.retryAfterSeconds,
    };
  }
  return { kind: 'error', retryAfterSeconds: failure.retryAfterSeconds };
}

export function failureOfApi(failure: ApiFailure): SyncFailure {
  switch (failure.kind) {
    case 'network':
      return { kind: 'offline' };
    case 'signed-out':
      return { kind: 'signed-out' };
    case 'account-changed':
      return { kind: 'account-mismatch' };
    case 'unexpected':
      return failure.status === TOO_LARGE
        ? { kind: 'too-large' }
        : { kind: 'error', retryAfterSeconds: null };
    case 'response':
      return failureOfResponse(failure);
  }
}

function retryAfterOf(response: ProgressResponse): number | null {
  const value = response.headers.get('Retry-After')?.trim() ?? '';
  return /^\d+$/.test(value) ? Number(value) : null;
}

async function photoOf(response: ProgressResponse): Promise<ReadOutcome> {
  let body: unknown;
  try {
    body = JSON.parse(await response.text());
  } catch {
    return {
      kind: 'failed',
      failure: { kind: 'error', retryAfterSeconds: null },
    };
  }
  const photo = readPhoto(body);
  if (photo === null)
    return {
      kind: 'failed',
      failure: { kind: 'error', retryAfterSeconds: null },
    };
  return { kind: 'photo', photo, etag: response.headers.get('ETag') };
}

function reportOf(body: unknown): ImportReport | null {
  if (!isPlainObject(body) || !isPlainObject(body.report)) return null;
  const { written, omitted, replaced, conflicts } = body.report;
  if (
    !isPlainObject(written) ||
    !Array.isArray(omitted) ||
    !Array.isArray(replaced) ||
    !Array.isArray(conflicts)
  ) {
    return null;
  }
  return body.report as unknown as ImportReport;
}

export function createSyncTransport({
  client,
  fetch,
  readCookies,
}: SyncTransportOptions): SyncTransport {
  async function readProgress(etag: string | null, signal: AbortSignal): Promise<ReadOutcome> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (etag !== null) headers['If-None-Match'] = etag;
    let response: ProgressResponse;
    try {
      response = await fetch('/api/progress', {
        method: 'GET',
        credentials: 'same-origin',
        headers,
        signal,
      });
    } catch {
      return { kind: 'failed', failure: { kind: 'offline' } };
    }
    if (response.status === NOT_MODIFIED) return { kind: 'not-modified' };
    if (response.status === UNAUTHORIZED)
      return { kind: 'failed', failure: { kind: 'signed-out' } };
    if (response.status === FORBIDDEN) return { kind: 'failed', failure: { kind: 'disabled' } };
    if (response.status !== 200) {
      return {
        kind: 'failed',
        failure: { kind: 'error', retryAfterSeconds: retryAfterOf(response) },
      };
    }
    return photoOf(response);
  }

  async function sendBatch(envelope: SyncEnvelope, userId: number): Promise<SendOutcome> {
    const result: ApiResult = await client.send('POST', '/api/sync', envelope, {
      asUser: userId,
    });
    if (!result.ok) return { kind: 'failed', failure: failureOfApi(result.failure) };
    const response = readSyncResponse(result.body);
    if (response === null)
      return {
        kind: 'failed',
        failure: { kind: 'error', retryAfterSeconds: null },
      };
    return { kind: 'answered', response };
  }

  function sendOnUnload(envelope: SyncEnvelope, userId: number): void {
    void fetch('/api/sync', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': readXsrfToken(readCookies()),
        'X-Taller-User': String(userId),
      },
      body: JSON.stringify(envelope),
    }).catch(() => undefined);
  }

  async function importProgress(body: ImportBody, userId: number): Promise<ImportOutcome> {
    const result = await client.send('POST', '/api/progress/import', body, {
      asUser: userId,
    });
    if (!result.ok) return { kind: 'failed', failure: failureOfApi(result.failure) };
    const report = reportOf(result.body);
    if (report === null)
      return {
        kind: 'failed',
        failure: { kind: 'error', retryAfterSeconds: null },
      };
    return { kind: 'imported', report, replayed: result.status === 200 };
  }

  return { readProgress, sendBatch, sendOnUnload, importProgress };
}
```

4. Verde: 16 pruebas. Checks. Commit: `feat(progress-sync): the sync transport and how each API failure reads`.

### Tarea T011 · El motor, su contexto de React y la API pública

**Archivos:** `model/create-progress-sync.ts`, `model/create-progress-sync.spec.ts` y `model/progress-sync.fixture.ts`; `ui/progress-sync-context.ts`; `index.ts`.

**Consume:** todo U1 y T010; `createStore` de `zustand/vanilla`.

**Produce:**

```ts
export interface AreaStore<S> { read(): S; apply(state: S): void; subscribe(listener: () => void): () => void }
export type ProgressStores = { readonly [A in ProgressAreaName]: AreaStore<ProgressSnapshot[A]> };
export interface Scheduler { now(): number; setTimeout(run: () => void, delayMs: number): unknown; clearTimeout(handle: unknown): void }
export interface BootOptions { /* create-progress-sync.ts */ }
export interface ProgressSyncEngine extends ProgressSync {
  boot(options: BootOptions): Promise<void>;
  start(): void;
  resume(): void;
  onOnline(): void;
  onVisible(): void;
  onHidden(): void;
  onPageHide(): void;
  exclusive<T>(kind: 'import' | 'reset', task: () => Promise<T>, whenBusy: () => T): Promise<T>;
  withoutEnqueuing<T>(task: () => Promise<T>): Promise<T>;
  importFile(text: string): Promise<string>;
  afterOwnReset(): Promise<void>;
}
export function createProgressSync(dependencies: ProgressSyncDependencies): ProgressSyncEngine;
export const ProgressSyncContext: Context<ProgressSync | null>;
export function useProgressSync(): ProgressSync | null;
```

`ProgressSync` y su estado son los de contracts/sync-client-d1c.md §2 y §3; `ProgressSyncEngine` suma lo que sólo usa `app/`.

**Cómo funciona** (cada punto tiene su prueba en la spec):

- **Arranque** (`boot`): lee la copia, la cola y la copia de la época del espacio; vuelve a corregir lo diferido; ofrece el v1 si hay candidato; pide la foto con la espera de R8 (3 s con copia, 10 s sin ella); si la época cambió, la cola pasa a la copia de la época; escribe las filas en los almacenes (todavía cerrados: el adaptador escribe sus claves en el espacio). Nunca lanza.
- **Cambios** (`start` suscribe los cuatro almacenes): cada aviso compara con la línea base, encola y programa el envío a 2 s (10 s como mucho).
- **Envío:** un lote a la vez, hasta 200 operaciones y 1 572 864 bytes, y no más de 60 por minuto. La respuesta mueve el desfase, junta el delta en la copia, resuelve la cola y escribe las filas sin encolarlas de vuelta (`suppressed`).
- **Fallas:** la tabla de R10.
- **«Borrar todo» propio:** `withoutEnqueuing` mientras corre el de F8, y `afterOwnReset` vacía la cola y la copia de la época y carga la época nueva sin aviso (F13 L6).
- **Importar:** `answerImport(true)` con el v1 ofrecido, o `importFile(text)` desde Método; un 409 `import_needs_confirmation` abre `importQuestion` con `stage: 'confirm'` y espera la respuesta.

**Pasos:**

1. Copiá el fixture de los dobles (el transporte, el reloj manual, los almacenes y un relleno de bytes que numera los UUID):

`frontend/src/features/progress-sync/model/progress-sync.fixture.ts`:

```ts
import { cloneJson } from '../../../shared/lib/clone-json';
import type {
  ImportOutcome,
  ReadOutcome,
  SendOutcome,
  SyncEnvelope,
  SyncTransport,
} from '../api/sync-transport';
import { createMemoryStorage, createSpaceStorage, type EnumerableStorage } from './account-space';
import type { BootOptions, ProgressStores, Scheduler } from './create-progress-sync';
import { blankSnapshot, progressContext } from './progress-context.fixture';
import { AREA_NAMES, type ProgressAreaName, type ProgressSnapshot } from './progress-snapshot';
import { emptyAreas } from './server-rows';
import type { ImportBody, V1Candidate } from './v1-import';
import type { FillRandom } from './uuid-v4';

export const USER_ID = 41;
export const START = Date.UTC(2026, 9, 28, 12);
export const V1_KEYS = {
  route: 'taller-learning-v1',
  lab: 'taller-laboratorio-v1',
  campaign: 'taller-campaign-v1',
  systems: 'taller-systems-v1',
} as const;

export function upToDate(envelope: SyncEnvelope): SendOutcome {
  return {
    kind: 'answered',
    response: {
      epoch: envelope.epoch,
      revision: envelope.knownRevision + (envelope.operations.length > 0 ? 1 : 0),
      serverTime: envelope.sentAt,
      contentVersion: progressContext.contentVersion,
      results: envelope.operations.map((operation) => ({
        id: operation.id,
        status: 'applied' as const,
      })),
      full: false,
      changes: emptyAreas(),
    },
  };
}

export function fakeTransport() {
  const reads: ReadOutcome[] = [];
  const sends: ((envelope: SyncEnvelope) => SendOutcome)[] = [];
  const imports: ImportOutcome[] = [];
  const calls = {
    reads: [] as (string | null)[],
    sends: [] as SyncEnvelope[],
    imports: [] as ImportBody[],
    unloads: [] as SyncEnvelope[],
  };
  const transport: SyncTransport = {
    readProgress: async (etag) => {
      calls.reads.push(etag);
      return reads.shift() ?? { kind: 'failed', failure: { kind: 'offline' } };
    },
    sendBatch: async (envelope) => {
      calls.sends.push(envelope);
      return (sends.shift() ?? upToDate)(envelope);
    },
    sendOnUnload: (envelope) => {
      calls.unloads.push(envelope);
    },
    importProgress: async (body) => {
      calls.imports.push(body);
      return imports.shift() ?? { kind: 'failed', failure: { kind: 'offline' } };
    },
  };
  return { transport, calls, reads, sends, imports };
}

const realTick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export function fakeScheduler() {
  let now = START;
  let sequence = 0;
  let timers: { id: number; at: number; run: () => void }[] = [];
  const scheduler: Scheduler = {
    now: () => now,
    setTimeout(run, delayMs) {
      sequence += 1;
      timers.push({ id: sequence, at: now + delayMs, run });
      return sequence;
    },
    clearTimeout(handle) {
      timers = timers.filter((timer) => timer.id !== handle);
    },
  };
  async function advance(milliseconds: number): Promise<void> {
    const end = now + milliseconds;
    let idleTicks = 0;
    while (idleTicks < 5) {
      await realTick();
      const due = timers.filter((timer) => timer.at <= end).sort((a, b) => a.at - b.at)[0];
      if (due === undefined) {
        idleTicks += 1;
        continue;
      }
      idleTicks = 0;
      timers = timers.filter((timer) => timer !== due);
      now = due.at;
      due.run();
    }
    now = end;
  }
  return { scheduler, advance, pending: () => timers.length };
}

export function fakeStores(initial: ProgressSnapshot = blankSnapshot()) {
  const snapshot = cloneJson(initial);
  const listeners = new Map<ProgressAreaName, Set<() => void>>(
    AREA_NAMES.map((area) => [area, new Set()]),
  );
  const notify = (area: ProgressAreaName): void =>
    listeners.get(area)?.forEach((listener) => listener());
  const storeOf = <A extends ProgressAreaName>(area: A) => ({
    read: () => cloneJson(snapshot[area]),
    apply: (state: ProgressSnapshot[A]) => {
      snapshot[area] = cloneJson(state);
      notify(area);
    },
    subscribe: (listener: () => void) => {
      listeners.get(area)?.add(listener);
      return () => listeners.get(area)?.delete(listener);
    },
  });
  const stores: ProgressStores = {
    route: storeOf('route'),
    lab: storeOf('lab'),
    campaign: storeOf('campaign'),
    systems: storeOf('systems'),
  };
  function edit<A extends ProgressAreaName>(
    area: A,
    change: (state: ProgressSnapshot[A]) => void,
  ): void {
    change(snapshot[area]);
    notify(area);
  }
  return { stores, snapshot, edit };
}

export function countingFill(): FillRandom {
  let next = 0;
  return (bytes) => {
    next += 1;
    bytes.fill(0);
    new DataView(bytes.buffer).setUint32(12, next);
    return bytes;
  };
}

export function bootOptions(
  overrides: Partial<BootOptions> = {},
  backing: EnumerableStorage = createMemoryStorage(),
) {
  const shared: boolean[] = [];
  const options: BootOptions = {
    userId: USER_ID,
    mode: 'browser',
    space: createSpaceStorage(USER_ID, backing),
    context: progressContext,
    v1: {
      candidate: null as V1Candidate | null,
      keys: V1_KEYS,
      parsers: {
        route: (raw) => raw,
        lab: (raw) => raw,
        campaign: (raw) => raw,
        systems: (raw) => raw,
      },
      storage: backing,
    },
    createMemory: createMemoryStorage,
    rememberSharedMode: (on) => shared.push(on),
    ...overrides,
  };
  return { options, backing, shared };
}
```

2. Escribí la spec. Incluye las pruebas de las entradas 1, 2, 3 y 4 de «Review Focus» (al final, en `describe('Review Focus')`):

`frontend/src/features/progress-sync/model/create-progress-sync.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { keysWithPrefix } from './account-space';
import { createProgressSync } from './create-progress-sync';
import { CONTENT_VERSION } from './progress-context.fixture';
import {
  START,
  USER_ID,
  bootOptions,
  countingFill,
  fakeScheduler,
  fakeStores,
  fakeTransport,
  upToDate,
} from './progress-sync.fixture';
import { emptyAreas } from './server-rows';
import { areasWith, exerciseRowFactory, photoFactory } from './server-rows.factory';
import { BUSY, IMPORTED, NOT_IMPORTED } from './sync-texts';
import type { V1Candidate } from './v1-import';

const T1 = '2026-10-28T11:00:00.000Z';

async function booted(setup: { photo?: boolean } = {}) {
  const network = fakeTransport();
  const clock = fakeScheduler();
  const local = fakeStores();
  if (setup.photo !== false)
    network.reads.push({
      kind: 'photo',
      photo: photoFactory.build(),
      etag: 'W/"u41.e1.r0.c0"',
    });
  const engine = createProgressSync({
    transport: network.transport,
    stores: local.stores,
    scheduler: clock.scheduler,
    randomFill: countingFill(),
  });
  const { options, backing, shared } = bootOptions();
  await engine.boot(options);
  engine.start();
  return { engine, network, clock, local, backing, options, shared };
}

function markStep(local: ReturnType<typeof fakeStores>, stepId: string): void {
  local.edit('route', (route) => {
    route.completed.push(stepId);
  });
}

describe('booting', () => {
  it('reads the photo and reports synced, writing nothing for a new account (FR-072)', async () => {
    const { engine, network, backing } = await booted();
    expect(network.calls.reads).toEqual([null]);
    expect(engine.state.getState()).toMatchObject({
      status: 'synced',
      mode: 'browser',
      unsentCount: 0,
    });
    expect(keysWithPrefix(backing, '')).toEqual([]);
  });

  it('writes the copy with its validator once the account has progress', async () => {
    const network = fakeTransport();
    network.reads.push({
      kind: 'photo',
      photo: photoFactory.build({ revision: 3 }),
      etag: 'W/"u41.e1.r3.c0"',
    });
    const engine = createProgressSync({
      transport: network.transport,
      stores: fakeStores().stores,
      scheduler: fakeScheduler().scheduler,
      randomFill: countingFill(),
    });
    const { options, backing } = bootOptions();
    await engine.boot(options);
    expect(JSON.parse(backing.getItem('taller-v2:41:copia')!)).toMatchObject({
      userId: USER_ID,
      revision: 3,
      etag: 'W/"u41.e1.r3.c0"',
    });
  });

  it('writes the photo rows into the stores before the views open them', async () => {
    const network = fakeTransport();
    const local = fakeStores();
    const photo = photoFactory.build({
      areas: areasWith({
        exercises: [
          exerciseRowFactory.build({
            reflection: { text: 'De la cuenta', at: T1 },
          }),
        ],
      }),
    });
    network.reads.push({ kind: 'photo', photo, etag: null });
    const engine = createProgressSync({
      transport: network.transport,
      stores: local.stores,
      scheduler: fakeScheduler().scheduler,
      randomFill: countingFill(),
    });
    await engine.boot(bootOptions().options);
    expect(local.snapshot.lab.records['rust-01'].reflection).toBe('De la cuenta');
  });

  it('keeps going offline with the local copy when the photo does not come', async () => {
    const { engine } = await booted({ photo: false });
    expect(engine.state.getState().status).toBe('offline');
  });

  it('refuses a photo of another account and stops (FR-066)', async () => {
    const network = fakeTransport();
    network.reads.push({
      kind: 'photo',
      photo: photoFactory.build({ userId: 7 }),
      etag: null,
    });
    const engine = createProgressSync({
      transport: network.transport,
      stores: fakeStores().stores,
      scheduler: fakeScheduler().scheduler,
      randomFill: countingFill(),
    });
    await engine.boot(bootOptions().options);
    expect(engine.state.getState().accountMismatch).toEqual({
      lostOnReload: 0,
    });
  });
});

describe('sending', () => {
  it('sends a change 2 s later, sealed with the server offset, and empties the queue', async () => {
    const { engine, network, clock, local } = await booted();
    markStep(local, 'rust-1-1');
    expect(engine.state.getState()).toMatchObject({
      status: 'pending',
      unsentCount: 1,
    });
    await clock.advance(1_999);
    expect(network.calls.sends).toEqual([]);
    await clock.advance(1);
    expect(network.calls.sends).toHaveLength(1);
    expect(network.calls.sends[0]).toMatchObject({
      epoch: 1,
      knownRevision: 0,
      knownContentVersion: CONTENT_VERSION,
      format: 2,
      sentAt: new Date(START + 2_000).toISOString(),
      operations: [
        {
          type: 'route.mark',
          kind: 'step',
          itemKey: 'rust-1-1',
          marked: true,
          at: new Date(START).toISOString(),
        },
      ],
    });
    expect(network.calls.sends[0].operations[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(engine.state.getState()).toMatchObject({
      status: 'synced',
      unsentCount: 0,
      clockSkewMs: 0,
    });
  });

  it('joins three keystrokes of a reflection into one operation (FR-062)', async () => {
    const { network, clock, local } = await booted();
    for (const text of ['P', 'Pr', 'Pri'])
      local.edit('lab', (lab) => (lab.records['rust-01'] = { reflection: text }));
    await clock.advance(2_000);
    expect(
      network.calls.sends[0].operations.map((operation) => 'text' in operation && operation.text),
    ).toEqual(['Pri']);
  });

  it('reports the clock skew of the last answer, with its sign (FR-078)', async () => {
    const { engine, network, clock, local } = await booted();
    network.sends.push((envelope) => {
      const answer = upToDate(envelope);
      if (answer.kind !== 'answered') return answer;
      return {
        ...answer,
        response: {
          ...answer.response,
          serverTime: new Date(Date.parse(envelope.sentAt) + 150_000).toISOString(),
        },
      };
    });
    markStep(local, 'rust-1-1');
    await clock.advance(2_000);
    expect(engine.state.getState().clockSkewMs).toBe(-150_000);
  });

  it('keeps the queue offline and retries after 5 s with the same ids (FR-064)', async () => {
    const { engine, network, clock, local } = await booted();
    network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'offline' },
    }));
    markStep(local, 'rust-1-1');
    await clock.advance(2_000);
    expect(engine.state.getState()).toMatchObject({
      status: 'offline',
      unsentCount: 1,
    });
    await clock.advance(5_000);
    expect(network.calls.sends.map((envelope) => envelope.operations[0].id)).toEqual([
      network.calls.sends[0].operations[0].id,
      network.calls.sends[0].operations[0].id,
    ]);
    expect(engine.state.getState().status).toBe('synced');
  });

  it('waits for Retry-After on a 429', async () => {
    const { network, clock, local } = await booted();
    network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'refused', message: 'm', retryAfterSeconds: 30 },
    }));
    markStep(local, 'rust-1-1');
    await clock.advance(2_000 + 29_999);
    expect(network.calls.sends).toHaveLength(1);
    await clock.advance(1);
    expect(network.calls.sends).toHaveLength(2);
  });

  it('never sends more than 60 batches in a minute (FR-063)', async () => {
    const { network, clock, local } = await booted();
    local.edit('route', (route) => {
      route.completed = Array.from({ length: 61 * 200 }, (_, index) => `rust-step-${index}`);
    });
    await clock.advance(2_000);
    expect(network.calls.sends).toHaveLength(60);
    await clock.advance(60_000);
    expect(network.calls.sends).toHaveLength(61);
  });
});

describe('what the server answers', () => {
  it('stops on a 401 until the same account signs in again (FR-076)', async () => {
    const { engine, network, clock, local } = await booted();
    network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'signed-out' },
    }));
    markStep(local, 'rust-1-1');
    await clock.advance(70_000);
    expect(network.calls.sends).toHaveLength(1);
    expect(engine.state.getState()).toMatchObject({
      status: 'signed-out',
      unsentCount: 1,
    });
    engine.resume();
    await clock.advance(0);
    expect(engine.state.getState().status).toBe('synced');
  });

  it('stops for good on account_mismatch, and says nothing is lost in browser mode', async () => {
    const { engine, network, clock, local } = await booted();
    network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'account-mismatch' },
    }));
    markStep(local, 'rust-1-1');
    await clock.advance(2_000);
    markStep(local, 'rust-1-2');
    await clock.advance(70_000);
    expect(network.calls.sends).toHaveLength(1);
    expect(engine.state.getState().accountMismatch).toEqual({
      lostOnReload: 0,
    });
  });

  it('keeps the queue and stops on client_outdated', async () => {
    const { engine, network, clock, local } = await booted();
    network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'outdated' },
    }));
    markStep(local, 'rust-1-1');
    await clock.advance(70_000);
    expect(engine.state.getState()).toMatchObject({
      status: 'outdated',
      unsentCount: 1,
    });
    expect(network.calls.sends).toHaveLength(1);
  });

  it('on epoch_mismatch keeps a copy, loads the empty epoch and never resends (FR-075)', async () => {
    const { engine, network, clock, local, backing } = await booted();
    network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'epoch-mismatch' },
    }));
    network.reads.push({
      kind: 'photo',
      photo: photoFactory.build({ epoch: 2, resetAt: T1 }),
      etag: null,
    });
    markStep(local, 'rust-1-1');
    local.edit('route', (route) => (route.favorites = ['book']));
    await clock.advance(2_000);
    expect(engine.state.getState()).toMatchObject({
      status: 'synced',
      unsentCount: 0,
      epochChange: {
        resetAt: T1,
        ownReset: false,
        copy: { count: 2, persisted: true },
      },
    });
    expect(local.snapshot.route.completed).toEqual([]);
    expect(JSON.parse(engine.downloadEpochCopy()!.text).operations).toHaveLength(2);
    expect(backing.getItem('taller-v2:41:copia-epoca')).not.toBeNull();
    await clock.advance(70_000);
    expect(network.calls.sends).toHaveLength(1);
  });

  it('counts rejections until they are acknowledged', async () => {
    const { engine, network, clock, local } = await booted();
    network.sends.push((envelope) => {
      const answer = upToDate(envelope);
      if (answer.kind !== 'answered') return answer;
      const results = envelope.operations.map((operation) => ({
        id: operation.id,
        status: 'rejected' as const,
        reason: 'unknown_reference',
      }));
      return { ...answer, response: { ...answer.response, results } };
    });
    markStep(local, 'rust-1-1');
    await clock.advance(2_000);
    expect(engine.state.getState()).toMatchObject({
      rejectedCount: 1,
      unsentCount: 0,
    });
    expect(local.snapshot.route.completed).toEqual(['rust-1-1']);
    engine.acknowledgeRejected();
    expect(engine.state.getState().rejectedCount).toBe(0);
  });

  it('grades a stale answer again with the published content and sends it once more', async () => {
    const { network, clock, local } = await booted();
    network.sends.push((envelope) => {
      const answer = upToDate(envelope);
      if (answer.kind !== 'answered') return answer;
      const results = envelope.operations.map((operation) => ({
        id: operation.id,
        status: 'stale_content' as const,
      }));
      return { ...answer, response: { ...answer.response, results } };
    });
    local.edit(
      'lab',
      (lab) => (lab.records['rust-01'] = { prediction: 2, predictionCorrect: false }),
    );
    await clock.advance(2_000);
    await clock.advance(0);
    expect(network.calls.sends[1].operations).toMatchObject([
      {
        type: 'exercise.prediction',
        exerciseId: 'rust-01',
        answer: 2,
        correct: true,
        contentVersion: CONTENT_VERSION,
      },
    ]);
  });

  it('applies the changes of an answer without enqueueing them back', async () => {
    const { network, clock, local } = await booted();
    network.sends.push((envelope) => {
      const answer = upToDate(envelope);
      if (answer.kind !== 'answered') return answer;
      const changes = areasWith({
        exercises: [
          exerciseRowFactory.build({
            reflection: { text: 'Otro dispositivo', at: T1 },
          }),
        ],
      });
      return { ...answer, response: { ...answer.response, changes } };
    });
    markStep(local, 'rust-1-1');
    await clock.advance(2_000);
    expect(local.snapshot.lab.records['rust-01'].reflection).toBe('Otro dispositivo');
    await clock.advance(10_000);
    expect(network.calls.sends).toHaveLength(1);
  });
});

describe('signing out (FR-068)', () => {
  it('flushNow sends everything, or tells what was left and why', async () => {
    const { engine, network, local } = await booted();
    markStep(local, 'rust-1-1');
    expect(await engine.flushNow()).toEqual({ kind: 'sent' });
    network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'offline' },
    }));
    markStep(local, 'rust-1-2');
    expect(await engine.flushNow()).toEqual({
      kind: 'left',
      count: 1,
      reason: 'offline',
    });
  });

  it('discard clears the space of the account; keep leaves the queue for 30 days', async () => {
    const first = await booted();
    first.backing.setItem('taller-learning-v1', 'v1 de otra persona');
    first.engine.afterSignOut('discard');
    expect(keysWithPrefix(first.backing, '')).toEqual(['taller-learning-v1']);
    const second = await booted();
    second.network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'offline' },
    }));
    markStep(second.local, 'rust-1-1');
    second.engine.afterSignOut('keep');
    expect(JSON.parse(second.backing.getItem('taller-v2:41:cola')!).operations).toHaveLength(1);
  });
});

describe('shared computer (FR-070, amended by F11-Q5)', () => {
  it('clears the space at once, remembers the choice and keeps the queue in memory', async () => {
    const { engine, network, local, backing, shared } = await booted();
    network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'offline' },
    }));
    markStep(local, 'rust-1-1');
    await engine.enterSharedMode();
    expect(keysWithPrefix(backing, 'taller-v2:')).toEqual([]);
    expect(shared).toEqual([true]);
    expect(engine.state.getState()).toMatchObject({
      mode: 'shared',
      unsentCount: 1,
      lostOnUnload: 1,
    });
    expect(JSON.parse(engine.downloadUnsent()!.text).operations).toHaveLength(1);
  });
});

describe('importing (FR-072, FR-073)', () => {
  const candidate: V1Candidate = {
    texts: { route: '{"version":1,"completed":["rust-1-1"]}' },
    summary: { solvedCount: 0, lastResultAt: null },
  };
  const report = {
    written: { routeMarks: 1 },
    omitted: [],
    replaced: [],
    conflicts: [],
  };

  it('offers the v1, imports it on a yes and archives the keys', async () => {
    const network = fakeTransport();
    network.reads.push({
      kind: 'photo',
      photo: photoFactory.build(),
      etag: null,
    });
    network.imports.push({ kind: 'imported', report, replayed: false });
    const engine = createProgressSync({
      transport: network.transport,
      stores: fakeStores().stores,
      scheduler: fakeScheduler().scheduler,
      randomFill: countingFill(),
    });
    const { options, backing } = bootOptions();
    backing.setItem('taller-learning-v1', candidate.texts.route!);
    await engine.boot({ ...options, v1: { ...options.v1, candidate } });
    expect(engine.state.getState().importQuestion).toEqual({
      source: 'storage',
      summary: candidate.summary,
      stage: 'offer',
    });
    expect(network.calls.imports).toEqual([]);
    await engine.answerImport(true);
    expect(network.calls.imports[0]).toMatchObject({
      source: 'storage',
      confirm: false,
      epoch: 1,
    });
    expect(engine.state.getState()).toMatchObject({
      importQuestion: null,
      lastImport: report,
      importNotice: IMPORTED,
    });
    expect(backing.getItem('taller-learning-v1')).toBeNull();
    expect(backing.getItem('taller-v1-importado:41')).not.toBeNull();
  });

  it('asks again on import_needs_confirmation and resends with confirm and the same importId', async () => {
    const { engine, network } = await booted();
    network.imports.push(
      { kind: 'failed', failure: { kind: 'needs-confirmation' } },
      { kind: 'imported', report, replayed: false },
    );
    const notice = engine.importFile('{"version":1,"completed":[]}');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(engine.state.getState().importQuestion).toMatchObject({
      source: 'export',
      stage: 'confirm',
    });
    await engine.answerImport(true);
    expect(await notice).toBe(IMPORTED);
    expect(network.calls.imports.map((body) => [body.importId, body.confirm])).toEqual([
      [network.calls.imports[0].importId, false],
      [network.calls.imports[0].importId, true],
    ]);
  });

  it('answers no without importing', async () => {
    const { engine, network } = await booted();
    network.imports.push({
      kind: 'failed',
      failure: { kind: 'needs-confirmation' },
    });
    const notice = engine.importFile('{"version":1}');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await engine.answerImport(false);
    expect(await notice).toBe(NOT_IMPORTED);
    expect(network.calls.imports).toHaveLength(1);
  });

  it('refuses a second import or reset while one is running (F8-Q3)', async () => {
    const { engine, network } = await booted();
    network.imports.push({
      kind: 'failed',
      failure: { kind: 'needs-confirmation' },
    });
    const first = engine.importFile('{"version":1}');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(engine.state.getState().busy).toBe('import');
    expect(await engine.importFile('{"version":1}')).toBe(BUSY);
    expect(
      await engine.exclusive(
        'reset',
        async () => 'reset',
        () => BUSY,
      ),
    ).toBe(BUSY);
    await engine.answerImport(false);
    await first;
    expect(engine.state.getState().busy).toBeNull();
  });
});

describe('«Borrar todo» of this tab', () => {
  it('enqueues nothing while the stores are cleared and leaves no epoch notice (F13 L6)', async () => {
    const { engine, network, clock, local } = await booted();
    markStep(local, 'rust-1-1');
    await clock.advance(2_000);
    network.reads.push({
      kind: 'photo',
      photo: photoFactory.build({ epoch: 2, resetAt: T1, areas: emptyAreas() }),
      etag: null,
    });
    await engine.withoutEnqueuing(async () => {
      local.edit('route', (route) => (route.completed = []));
    });
    await engine.afterOwnReset();
    await clock.advance(70_000);
    expect(network.calls.sends).toHaveLength(1);
    expect(engine.state.getState()).toMatchObject({
      epochChange: null,
      status: 'synced',
      unsentCount: 0,
    });
    expect(engine.exerciseSummary('rust-01')).toBeNull();
  });
});

describe('Review Focus', () => {
  it('two tabs of one account share the queue and a change never reuses an id on its way', async () => {
    const network = fakeTransport();
    network.reads.push(
      { kind: 'photo', photo: photoFactory.build(), etag: null },
      { kind: 'photo', photo: photoFactory.build(), etag: null },
    );
    const clock = fakeScheduler();
    const local = fakeStores();
    const { options, backing } = bootOptions();
    const tabA = createProgressSync({
      transport: network.transport,
      stores: local.stores,
      scheduler: clock.scheduler,
      randomFill: countingFill(),
    });
    await tabA.boot(options);
    tabA.start();
    const otherFill = countingFill();
    const tabB = createProgressSync({
      transport: network.transport,
      stores: fakeStores().stores,
      scheduler: clock.scheduler,
      randomFill: (bytes) => {
        otherFill(bytes);
        bytes[0] = 0xbb;
        return bytes;
      },
    });
    await tabB.boot(bootOptions({}, backing).options);
    local.edit('route', (route) => (route.notes.rust.next = 'a'));
    const flushB = tabB.flushNow();
    local.edit('route', (route) => (route.notes.rust.next = 'ab'));
    await flushB;
    await clock.advance(2_000);
    const ids = network.calls.sends.flatMap((envelope) =>
      envelope.operations.map((operation) => operation.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(network.calls.sends.at(-1)?.operations.at(-1)).toMatchObject({
      type: 'route.note',
      body: 'ab',
    });
  });

  it('moves the queue to memory and reports blocked when writing the space fails, without losing it', async () => {
    const network = fakeTransport();
    network.reads.push({
      kind: 'photo',
      photo: photoFactory.build(),
      etag: null,
    });
    network.sends.push(() => ({
      kind: 'failed',
      failure: { kind: 'offline' },
    }));
    const local = fakeStores();
    const clock = fakeScheduler();
    const { options, backing } = bootOptions();
    const engine = createProgressSync({
      transport: network.transport,
      stores: local.stores,
      scheduler: clock.scheduler,
      randomFill: countingFill(),
    });
    await engine.boot(options);
    engine.start();
    backing.setItem = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
    markStep(local, 'rust-1-1');
    expect(engine.state.getState()).toMatchObject({
      mode: 'blocked',
      unsentCount: 1,
      lostOnUnload: 1,
    });
    await clock.advance(2_000 + 5_000);
    expect(network.calls.sends.at(-1)?.operations).toMatchObject([{ itemKey: 'rust-1-1' }]);
  });

  it('keeps in the copy the rows an older content does not know, and writes them once it does', async () => {
    const unknownRow = exerciseRowFactory.build({
      exerciseId: 'rust-77',
      reflection: { text: 'Del contenido nuevo', at: T1 },
    });
    const network = fakeTransport();
    network.reads.push(
      {
        kind: 'photo',
        photo: photoFactory.build({
          areas: areasWith({ exercises: [unknownRow] }),
        }),
        etag: 'W/"a"',
      },
      { kind: 'not-modified' },
    );
    const { options, backing } = bootOptions();
    const first = fakeStores();
    await createProgressSync({
      transport: network.transport,
      stores: first.stores,
      scheduler: fakeScheduler().scheduler,
      randomFill: countingFill(),
    }).boot(options);
    expect(first.snapshot.lab.records['rust-77']).toBeUndefined();
    const newerContext = {
      ...options.context,
      knowsExercise: (id: string) => id === 'rust-77' || options.context.knowsExercise(id),
    };
    const second = fakeStores();
    await createProgressSync({
      transport: network.transport,
      stores: second.stores,
      scheduler: fakeScheduler().scheduler,
      randomFill: countingFill(),
    }).boot(bootOptions({ context: newerContext }, backing).options);
    expect(second.snapshot.lab.records['rust-77'].reflection).toBe('Del contenido nuevo');
  });
});
```

3. Stub: `export const createProgressSync: (dependencies: ProgressSyncDependencies) => ProgressSyncEngine = () => { throw new Error('not implemented'); };`, con las interfaces completas. La spec falla con «not implemented».
4. Implementá el motor, el contexto y el índice:

`frontend/src/features/progress-sync/model/create-progress-sync.ts`:

```ts
import { createStore } from 'zustand/vanilla';
import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import type { SendOutcome, SyncEnvelope, SyncFailure, SyncTransport } from '../api/sync-transport';
import {
  COPY_KEY,
  EPOCH_COPY_KEY,
  QUEUE_KEY,
  type EnumerableStorage,
  type SpaceStorage,
} from './account-space';
import { applyRows, pendingClocks } from './apply-rows';
import { diffArea } from './diff-progress';
import { mergeAreas } from './merge-areas';
import type { Operation, OperationBody } from './operations';
import {
  AREA_NAMES,
  type ProgressAreaName,
  type ProgressContext,
  type ProgressSnapshot,
} from './progress-snapshot';
import { enqueue, nextBatch, settle, type Stamp } from './queue';
import { reevaluate } from './reevaluate';
import {
  emptyAreas,
  type ProgressAreas,
  type ProgressPhoto,
  type SyncResponse,
} from './server-rows';
import {
  CHANGE_DELAY_MS,
  CHANGE_MAX_DELAY_MS,
  MAX_BATCH_BYTES,
  MAX_BATCH_OPERATIONS,
  MAX_KEEPALIVE_BYTES,
  MINUTE_MS,
  PHOTO_WAIT_WITHOUT_COPY_MS,
  PHOTO_WAIT_WITH_COPY_MS,
  REQUESTS_PER_MINUTE,
  RETRY_DELAYS_MS,
  SYNC_FORMAT,
} from './sync-limits';
import {
  blankCopy,
  blankQueue,
  readCopy,
  readEpochCopy,
  readQueue,
  removeRecord,
  writeRecord,
  type CopyRecord,
  type EpochCopyRecord,
  type QueueRecord,
} from './sync-records';
import {
  BUSY,
  IMPORTED,
  IMPORT_ACCOUNT_CHANGED,
  IMPORT_EPOCH_MOVED,
  IMPORT_OUTDATED,
  IMPORT_REFUSED_PREFIX,
  IMPORT_SIGNED_OUT,
  IMPORT_TOO_LARGE,
  IMPORT_UNREACHABLE,
  IMPORT_UNREADABLE,
  NOT_IMPORTED,
  UNSENT_FILE_FORMAT,
} from './sync-texts';
import type {
  FlushOutcome,
  ImportQuestion,
  ImportSource,
  ProgressSync,
  ProgressSyncState,
  SignOutChoice,
  StorageMode,
  UnsentFile,
  V1Summary,
} from './types';
import { uuidV4, type FillRandom } from './uuid-v4';
import {
  archiveV1,
  exportImportBody,
  storageImportBody,
  summarizeLab,
  type ImportBody,
  type ImportTicket,
  type V1Candidate,
  type V1Keys,
  type V1Parsers,
} from './v1-import';

export interface AreaStore<S> {
  read(): S;
  apply(state: S): void;
  subscribe(listener: () => void): () => void;
}

export type ProgressStores = {
  readonly [A in ProgressAreaName]: AreaStore<ProgressSnapshot[A]>;
};

export interface Scheduler {
  now(): number;
  setTimeout(run: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface V1Source {
  readonly candidate: V1Candidate | null;
  readonly keys: V1Keys;
  readonly parsers: V1Parsers;
  readonly storage: StorageLike;
}

export interface BootOptions {
  readonly userId: number;
  readonly mode: StorageMode;
  readonly space: SpaceStorage;
  readonly context: ProgressContext;
  readonly v1: V1Source;
  createMemory(): EnumerableStorage;
  rememberSharedMode(shared: boolean): void;
}

export interface ProgressSyncDependencies {
  readonly transport: SyncTransport;
  readonly stores: ProgressStores;
  readonly scheduler: Scheduler;
  readonly randomFill: FillRandom;
}

export interface ProgressSyncEngine extends ProgressSync {
  boot(options: BootOptions): Promise<void>;
  start(): void;
  resume(): void;
  onOnline(): void;
  onVisible(): void;
  onHidden(): void;
  onPageHide(): void;
  exclusive<T>(kind: 'import' | 'reset', task: () => Promise<T>, whenBusy: () => T): Promise<T>;
  withoutEnqueuing<T>(task: () => Promise<T>): Promise<T>;
  importFile(text: string): Promise<string>;
  afterOwnReset(): Promise<void>;
}

const INITIAL_STATE: ProgressSyncState = {
  status: null,
  mode: 'browser',
  unsentCount: 0,
  lostOnUnload: 0,
  clockSkewMs: null,
  rejectedCount: 0,
  accountMismatch: null,
  epochChange: null,
  importQuestion: null,
  lastImport: null,
  importNotice: null,
  busy: null,
};

const PROBLEM_REASONS = {
  offline: 'offline',
  error: 'error',
  'signed-out': 'signed-out',
  outdated: 'outdated',
} as const;

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isEmptyAreas(areas: ProgressAreas): boolean {
  return sameJson(areas, emptyAreas());
}

export function createProgressSync(dependencies: ProgressSyncDependencies): ProgressSyncEngine {
  const { transport, stores, scheduler } = dependencies;
  const state = createStore<ProgressSyncState>(() => INITIAL_STATE);
  const inFlight = new Set<string>();
  const sentAt: number[] = [];
  const unsubscribes: (() => void)[] = [];
  let session: BootOptions | null = null;
  let copy: CopyRecord = blankCopy(0);
  let epochCopy: EpochCopyRecord | null = null;
  let baseline: ProgressSnapshot | null = null;
  let suppressed = 0;
  let stopped = false;
  let waitingForSignIn = false;
  let outdated = false;
  let epochPending = false;
  let ownReset = false;
  let timer: unknown = null;
  let timerAt = Infinity;
  let firstChangeAt: number | null = null;
  let retryIndex = 0;
  let lastContactAt = 0;
  let sending: Promise<void> | null = null;
  let answerQuestion: ((yes: boolean) => void) | null = null;

  const patch = (partial: Partial<ProgressSyncState>): void => state.setState(partial);
  const opened = (): BootOptions => {
    if (session === null) throw new Error('La sincronización todavía no arrancó.');
    return session;
  };
  const nowIso = (): string => new Date(scheduler.now()).toISOString();
  const stamp = (): Stamp => ({
    id: uuidV4(dependencies.randomFill),
    at: new Date(scheduler.now() + copy.clockOffsetMs).toISOString(),
  });

  function queueRecord(): QueueRecord {
    return readQueue(opened().space) ?? blankQueue(new Date(scheduler.now()));
  }

  function refreshCounts(): void {
    const unsentCount = queueRecord().operations.length;
    const inMemory = state.getState().mode !== 'browser';
    const epochCount = epochCopy?.operations.length ?? 0;
    patch({
      unsentCount,
      lostOnUnload: inMemory ? unsentCount + epochCount : 0,
    });
  }

  function moveToMemory(mode: StorageMode): void {
    const { space } = opened();
    const queue = queueRecord();
    space.useBacking(opened().createMemory());
    writeRecord(space, QUEUE_KEY, queue);
    writeRecord(space, COPY_KEY, copy);
    if (epochCopy !== null) writeRecord(space, EPOCH_COPY_KEY, epochCopy);
    patch({ mode });
  }

  function updateQueue(change: (record: QueueRecord) => QueueRecord): void {
    const next = { ...change(queueRecord()), touchedAt: nowIso() };
    if (!writeRecord(opened().space, QUEUE_KEY, next)) {
      moveToMemory('blocked');
      writeRecord(opened().space, QUEUE_KEY, next);
    }
    refreshCounts();
  }

  // A new account with an empty photo has nothing to remember: a quiet boot writes nothing.
  function writeCopy(): void {
    const { space, userId } = opened();
    if (copy.revision === 0 && isEmptyAreas(copy.areas) && readCopy(space, userId) === null) return;
    if (!writeRecord(space, COPY_KEY, copy)) moveToMemory('blocked');
  }

  function readAll(): ProgressSnapshot {
    return {
      route: stores.route.read(),
      lab: stores.lab.read(),
      campaign: stores.campaign.read(),
      systems: stores.systems.read(),
    };
  }

  function enqueueBodies(bodies: readonly OperationBody[]): void {
    if (bodies.length === 0) return;
    updateQueue((record) => ({
      ...record,
      operations: enqueue(record.operations, bodies, inFlight, stamp),
    }));
    if (state.getState().status === 'synced') patch({ status: 'pending' });
    scheduleAfterChange();
  }

  function onStoreChange(area: ProgressAreaName): void {
    if (session === null || baseline === null) return;
    const current = {
      ...baseline,
      [area]: stores[area].read(),
    } as ProgressSnapshot;
    const before = baseline;
    baseline = current;
    if (suppressed > 0) return;
    enqueueBodies(diffArea(area, before, current, session.context));
  }

  function catchUp(): void {
    for (const area of AREA_NAMES) onStoreChange(area);
  }

  function project(areas: ProgressAreas, fromBlank: boolean): void {
    const { context } = opened();
    catchUp();
    const current = readAll();
    const next = applyRows(
      fromBlank ? context.blankSnapshot() : current,
      areas,
      pendingClocks(queueRecord().operations),
      context,
    );
    suppressed += 1;
    try {
      for (const area of AREA_NAMES) {
        if (!sameJson(next[area], current[area]))
          (stores[area] as AreaStore<unknown>).apply(next[area]);
      }
    } finally {
      suppressed -= 1;
    }
    baseline = next;
  }

  function clearTimer(): void {
    if (timer !== null) scheduler.clearTimeout(timer);
    timer = null;
    timerAt = Infinity;
  }

  function schedule(delayMs: number): void {
    const at = scheduler.now() + delayMs;
    if (timer !== null && timerAt <= at) return;
    clearTimer();
    timerAt = at;
    timer = scheduler.setTimeout(() => {
      timer = null;
      timerAt = Infinity;
      void flush(false);
    }, delayMs);
  }

  function scheduleAfterChange(): void {
    const now = scheduler.now();
    firstChangeAt ??= now;
    schedule(Math.max(0, Math.min(CHANGE_DELAY_MS, firstChangeAt + CHANGE_MAX_DELAY_MS - now)));
  }

  function scheduleRetry(retryAfterSeconds: number | null): void {
    const delay =
      retryAfterSeconds !== null
        ? retryAfterSeconds * 1000
        : RETRY_DELAYS_MS[Math.min(retryIndex, RETRY_DELAYS_MS.length - 1)];
    retryIndex += 1;
    schedule(delay);
  }

  function rateDelay(): number {
    const now = scheduler.now();
    while (sentAt.length > 0 && sentAt[0] <= now - MINUTE_MS) sentAt.shift();
    return sentAt.length < REQUESTS_PER_MINUTE ? 0 : sentAt[0] + MINUTE_MS - now;
  }

  function envelopeOf(operations: readonly Operation[], sentAtMs: number): SyncEnvelope {
    return {
      epoch: copy.epoch,
      sentAt: new Date(sentAtMs).toISOString(),
      knownRevision: copy.revision,
      knownContentVersion: copy.contentVersion,
      format: SYNC_FORMAT,
      operations,
    };
  }

  function stop(): void {
    stopped = true;
    clearTimer();
  }

  function adoptPhoto(photo: ProgressPhoto, etag: string | null): void {
    copy = {
      ...copy,
      epoch: photo.epoch,
      revision: photo.revision,
      contentVersion: photo.contentVersion,
      resetAt: photo.resetAt,
      etag,
      areas: photo.areas,
    };
    writeCopy();
  }

  function keepEpochCopy(operations: readonly Operation[]): void {
    if (operations.length === 0) return;
    epochCopy = {
      format: 1,
      epoch: copy.epoch,
      createdAt: nowIso(),
      operations,
    };
    writeRecord(opened().space, EPOCH_COPY_KEY, epochCopy);
  }

  function epochNotice(resetAt: string | null): void {
    const persisted = state.getState().mode === 'browser';
    const count = epochCopy?.operations.length ?? 0;
    const copyInfo = count > 0 && !ownReset ? { count, persisted } : null;
    patch({ epochChange: { resetAt, ownReset, copy: copyInfo } });
    ownReset = false;
    refreshCounts();
  }

  function mismatch(): void {
    stop();
    refreshCounts();
    const { mode, unsentCount } = state.getState();
    const epochCount = epochCopy?.operations.length ?? 0;
    patch({
      accountMismatch: {
        lostOnReload: mode === 'browser' ? 0 : unsentCount + epochCount,
      },
    });
  }

  async function epochMoved(): Promise<void> {
    epochPending = true;
    const operations = queueRecord().operations;
    updateQueue((record) => ({ ...record, operations: [], deferred: [] }));
    keepEpochCopy(operations);
    const read = await transport.readProgress(null, new AbortController().signal);
    if (read.kind !== 'photo') {
      await handleFailure(
        read.kind === 'failed' ? read.failure : { kind: 'error', retryAfterSeconds: null },
      );
      return;
    }
    if (read.photo.userId !== opened().userId) {
      mismatch();
      return;
    }
    epochPending = false;
    adoptPhoto(read.photo, read.etag);
    project(read.photo.areas, true);
    epochNotice(read.photo.resetAt);
    patch({ status: 'synced' });
  }

  async function handleFailure(failure: SyncFailure): Promise<void> {
    switch (failure.kind) {
      case 'offline':
        patch({ status: 'offline' });
        scheduleRetry(null);
        return;
      case 'signed-out':
        waitingForSignIn = true;
        patch({ status: 'signed-out' });
        return;
      case 'account-mismatch':
        mismatch();
        return;
      case 'epoch-mismatch':
        await epochMoved();
        return;
      case 'outdated':
        outdated = true;
        patch({ status: 'outdated' });
        return;
      case 'disabled':
        stop();
        return;
      default:
        patch({ status: 'error' });
        scheduleRetry('retryAfterSeconds' in failure ? failure.retryAfterSeconds : null);
    }
  }

  function regrade(operations: readonly Operation[]): OperationBody[] {
    const { context } = opened();
    return operations.flatMap((operation) => reevaluate(operation, context) ?? []);
  }

  function handleAnswer(
    batch: readonly Operation[],
    response: SyncResponse,
    sentAtMs: number,
  ): void {
    const { context } = opened();
    lastContactAt = scheduler.now();
    retryIndex = 0;
    const offset = Date.parse(response.serverTime) - sentAtMs;
    copy = {
      ...copy,
      epoch: response.epoch,
      revision: response.revision,
      contentVersion: response.contentVersion,
      clockOffsetMs: offset,
      areas: mergeAreas(copy.areas, response.changes, response.full),
    };
    writeCopy();
    const sameContent = response.contentVersion === context.contentVersion;
    let rejected = 0;
    updateQueue((record) => {
      const settlement = settle(record.operations, batch, response.results);
      rejected = settlement.rejected;
      const regraded = sameContent ? regrade(settlement.stale) : [];
      const deferred = sameContent ? record.deferred : [...record.deferred, ...settlement.stale];
      return {
        ...record,
        operations: enqueue(settlement.remaining, regraded, inFlight, stamp),
        deferred,
      };
    });
    project(response.changes, false);
    const rejectedCount = state.getState().rejectedCount + rejected;
    const status = queueRecord().operations.length === 0 ? 'synced' : 'pending';
    patch({
      clockSkewMs: sentAtMs - Date.parse(response.serverTime),
      rejectedCount,
      status,
    });
    if (status === 'pending') schedule(0);
    else firstChangeAt = null;
  }

  function canSend(): boolean {
    return session !== null && !stopped && !outdated && !waitingForSignIn && sending === null;
  }

  async function send(batch: readonly Operation[]): Promise<void> {
    const { userId } = opened();
    const sentAtMs = scheduler.now();
    sentAt.push(sentAtMs);
    for (const operation of batch) inFlight.add(operation.id);
    let outcome: SendOutcome;
    try {
      outcome = await transport.sendBatch(envelopeOf(batch, sentAtMs), userId);
    } finally {
      for (const operation of batch) inFlight.delete(operation.id);
    }
    if (outcome.kind === 'answered') handleAnswer(batch, outcome.response, sentAtMs);
    else await handleFailure(outcome.failure);
  }

  async function flush(poll: boolean): Promise<void> {
    if (!canSend()) return;
    if (epochPending) {
      sending = epochMoved();
      await sending.finally(() => (sending = null));
      return;
    }
    const wait = rateDelay();
    if (wait > 0) {
      schedule(wait);
      return;
    }
    const batch = nextBatch(queueRecord().operations, inFlight, {
      maxOperations: MAX_BATCH_OPERATIONS,
      maxBytes: MAX_BATCH_BYTES,
    });
    if (batch.length === 0 && !poll) return;
    sending = send(batch);
    await sending.finally(() => (sending = null));
  }

  function leftReason(): FlushOutcome {
    const { status, accountMismatch, unsentCount } = state.getState();
    if (accountMismatch !== null || stopped)
      return { kind: 'left', count: unsentCount, reason: 'account-changed' };
    const reason =
      status === null || status === 'synced' || status === 'pending'
        ? 'error'
        : PROBLEM_REASONS[status];
    return { kind: 'left', count: unsentCount, reason };
  }

  async function flushNow(): Promise<FlushOutcome> {
    if (session === null) return { kind: 'sent' };
    clearTimer();
    if (sending !== null) await sending;
    while (queueRecord().operations.length > 0) {
      if (!canSend()) return leftReason();
      const before = queueRecord().operations.length;
      await flush(false);
      const { status } = state.getState();
      if (status !== 'synced' && status !== 'pending') return leftReason();
      if (queueRecord().operations.length >= before) return leftReason();
    }
    return { kind: 'sent' };
  }

  function fileOf(operations: readonly Operation[]): UnsentFile | null {
    if (operations.length === 0) return null;
    const exportedAt = nowIso();
    const text = JSON.stringify(
      {
        format: UNSENT_FILE_FORMAT,
        version: 1,
        userId: opened().userId,
        epoch: copy.epoch,
        exportedAt,
        operations,
      },
      null,
      2,
    );
    return {
      fileName: `${UNSENT_FILE_FORMAT}-${exportedAt.slice(0, 10)}.json`,
      text,
    };
  }

  function askAgain(question: ImportQuestion): Promise<boolean> {
    patch({ importQuestion: question });
    return new Promise((resolve) => {
      answerQuestion = resolve;
    });
  }

  function failureNotice(failure: SyncFailure): string {
    switch (failure.kind) {
      case 'signed-out':
        return IMPORT_SIGNED_OUT;
      case 'epoch-mismatch':
        return IMPORT_EPOCH_MOVED;
      case 'account-mismatch':
        return IMPORT_ACCOUNT_CHANGED;
      case 'too-large':
        return IMPORT_TOO_LARGE;
      case 'outdated':
        return IMPORT_OUTDATED;
      case 'refused':
        return IMPORT_REFUSED_PREFIX + failure.message;
      default:
        return IMPORT_UNREACHABLE;
    }
  }

  async function runImport(
    build: (ticket: ImportTicket) => ImportBody,
    source: ImportSource,
    summary: V1Summary,
    afterImported: (ticket: ImportTicket) => void,
  ): Promise<string> {
    const { userId } = opened();
    const ticket = {
      importId: uuidV4(dependencies.randomFill),
      epoch: copy.epoch,
      confirm: false,
    };
    let body: ImportBody;
    try {
      body = build(ticket);
    } catch {
      return IMPORT_UNREADABLE;
    }
    let outcome = await transport.importProgress(body, userId);
    if (outcome.kind === 'failed' && outcome.failure.kind === 'needs-confirmation') {
      const yes = await askAgain({ source, summary, stage: 'confirm' });
      if (!yes) return NOT_IMPORTED;
      outcome = await transport.importProgress(build({ ...ticket, confirm: true }), userId);
    }
    if (outcome.kind === 'imported') {
      patch({ lastImport: outcome.report });
      afterImported(ticket);
      await flush(true);
      return IMPORTED;
    }
    const failure = outcome.failure;
    if (
      failure.kind === 'epoch-mismatch' ||
      failure.kind === 'signed-out' ||
      failure.kind === 'account-mismatch'
    ) {
      await handleFailure(failure);
    }
    return failureNotice(failure);
  }

  async function exclusive<T>(
    kind: 'import' | 'reset',
    task: () => Promise<T>,
    whenBusy: () => T,
  ): Promise<T> {
    if (state.getState().busy !== null) return whenBusy();
    patch({ busy: kind });
    try {
      return await task();
    } finally {
      patch({ busy: null });
    }
  }

  async function importV1(): Promise<void> {
    const { v1, userId } = opened();
    const candidate = v1.candidate;
    if (candidate === null) return;
    const notice = await exclusive(
      'import',
      () =>
        runImport(
          (ticket) => storageImportBody(candidate, v1.keys, v1.parsers, ticket),
          'storage',
          candidate.summary,
          (ticket) => {
            archiveV1(v1.storage, v1.keys, userId, {
              importId: ticket.importId,
              importedAt: nowIso(),
            });
          },
        ),
      () => BUSY,
    );
    patch({ importQuestion: null, importNotice: notice });
  }

  async function bootPhoto(hadCopy: boolean): Promise<boolean> {
    const controller = new AbortController();
    const wait = hadCopy ? PHOTO_WAIT_WITH_COPY_MS : PHOTO_WAIT_WITHOUT_COPY_MS;
    const handle = scheduler.setTimeout(() => controller.abort(), wait);
    const read = await transport.readProgress(hadCopy ? copy.etag : null, controller.signal);
    scheduler.clearTimeout(handle);
    if (read.kind === 'not-modified') return false;
    if (read.kind === 'failed') {
      await handleFailure(read.failure);
      return false;
    }
    if (read.photo.userId !== opened().userId) {
      mismatch();
      return false;
    }
    const moved = hadCopy && read.photo.epoch !== copy.epoch;
    if (moved) {
      keepEpochCopy(queueRecord().operations);
      updateQueue((record) => ({ ...record, operations: [], deferred: [] }));
    }
    adoptPhoto(read.photo, read.etag);
    lastContactAt = scheduler.now();
    if (moved) epochNotice(read.photo.resetAt);
    return moved;
  }

  async function boot(options: BootOptions): Promise<void> {
    session = options;
    patch({ mode: options.mode });
    const stored = readCopy(options.space, options.userId);
    copy = stored ?? blankCopy(options.userId);
    epochCopy = readEpochCopy(options.space);
    if (epochCopy !== null) epochNotice(copy.resetAt);
    const deferred = queueRecord().deferred;
    if (deferred.length > 0) {
      const regraded = regrade(deferred);
      updateQueue((record) => ({
        ...record,
        operations: enqueue(record.operations, regraded, inFlight, stamp),
        deferred: [],
      }));
    }
    const candidate = options.v1.candidate;
    if (candidate !== null)
      patch({
        importQuestion: {
          source: 'storage',
          summary: candidate.summary,
          stage: 'offer',
        },
      });
    baseline = readAll();
    const moved = await bootPhoto(stored !== null);
    project(copy.areas, moved);
    refreshCounts();
    if (state.getState().status === null)
      patch({
        status: queueRecord().operations.length === 0 ? 'synced' : 'pending',
      });
  }

  function start(): void {
    for (const area of AREA_NAMES)
      unsubscribes.push(stores[area].subscribe(() => onStoreChange(area)));
    if (queueRecord().operations.length > 0) schedule(0);
  }

  return {
    state,
    boot,
    start,
    flushNow,
    resume() {
      if (!waitingForSignIn) return;
      waitingForSignIn = false;
      schedule(0);
    },
    onOnline() {
      retryIndex = 0;
      if (state.getState().status === 'offline') schedule(0);
    },
    onVisible() {
      if (scheduler.now() - lastContactAt > MINUTE_MS) void flush(true);
    },
    onHidden() {
      if (queueRecord().operations.length > 0) schedule(0);
    },
    onPageHide() {
      if (session === null || stopped || outdated || waitingForSignIn) return;
      const batch = nextBatch(queueRecord().operations, new Set(), {
        maxOperations: MAX_BATCH_OPERATIONS,
        maxBytes: MAX_KEEPALIVE_BYTES,
      });
      if (batch.length > 0)
        transport.sendOnUnload(envelopeOf(batch, scheduler.now()), session.userId);
    },
    afterSignOut(choice: SignOutChoice) {
      if (session === null) return;
      stop();
      const { space } = opened();
      if (choice === 'keep') {
        updateQueue((record) => record);
        return;
      }
      space.clear();
      if (epochCopy !== null && state.getState().mode === 'browser')
        writeRecord(space, EPOCH_COPY_KEY, epochCopy);
    },
    downloadUnsent: () => fileOf([...queueRecord().operations, ...(epochCopy?.operations ?? [])]),
    downloadEpochCopy: () => fileOf(epochCopy?.operations ?? []),
    discardEpochCopy() {
      epochCopy = null;
      removeRecord(opened().space, EPOCH_COPY_KEY);
      patch({ epochChange: null });
      refreshCounts();
    },
    dismissEpochChange() {
      epochCopy = null;
      removeRecord(opened().space, EPOCH_COPY_KEY);
      patch({ epochChange: null });
      refreshCounts();
    },
    acknowledgeRejected() {
      patch({ rejectedCount: 0 });
    },
    async answerImport(yes: boolean) {
      const question = state.getState().importQuestion;
      if (question === null) return;
      if (question.stage === 'confirm') {
        const answer = answerQuestion;
        answerQuestion = null;
        patch({ importQuestion: null });
        answer?.(yes);
        return;
      }
      if (!yes) {
        patch({ importQuestion: null });
        return;
      }
      await importV1();
    },
    async enterSharedMode() {
      const options = opened();
      if (state.getState().mode !== 'browser') return;
      options.rememberSharedMode(true);
      const queue = queueRecord();
      options.space.clear();
      options.space.useBacking(options.createMemory());
      writeRecord(options.space, QUEUE_KEY, queue);
      writeRecord(options.space, COPY_KEY, copy);
      if (epochCopy !== null) writeRecord(options.space, EPOCH_COPY_KEY, epochCopy);
      patch({ mode: 'shared' });
      refreshCounts();
    },
    leaveSharedMode() {
      opened().rememberSharedMode(false);
    },
    exerciseSummary(exerciseId: string) {
      const row = copy.areas.exercises.find((candidate) => candidate.exerciseId === exerciseId);
      if (row === undefined) return null;
      const { attemptCount, legacyAttempts, serverSolvedAt } = row;
      return {
        attemptCount,
        legacyAttempts,
        serverSolvedAt,
        proofState: row.proof?.state ?? null,
      };
    },
    exclusive,
    async withoutEnqueuing<T>(task: () => Promise<T>): Promise<T> {
      catchUp();
      suppressed += 1;
      try {
        return await task();
      } finally {
        suppressed -= 1;
      }
    },
    importFile(text: string) {
      const { v1 } = opened();
      const file: unknown = JSON.parse(text);
      const lab = isPlainObject(file) ? file.lab : undefined;
      return exclusive(
        'import',
        async () => {
          const notice = await runImport(
            (ticket) => exportImportBody(text, v1.parsers, ticket),
            'export',
            summarizeLab(lab),
            () => undefined,
          );
          patch({ importNotice: notice });
          return notice;
        },
        () => BUSY,
      );
    },
    async afterOwnReset() {
      clearTimer();
      updateQueue((record) => ({ ...record, operations: [], deferred: [] }));
      epochCopy = null;
      removeRecord(opened().space, EPOCH_COPY_KEY);
      const read = await transport.readProgress(null, new AbortController().signal);
      if (read.kind === 'photo' && read.photo.userId === opened().userId) {
        adoptPhoto(read.photo, read.etag);
        project(read.photo.areas, true);
        patch({ status: 'synced' });
      } else {
        copy = {
          ...copy,
          revision: 0,
          etag: null,
          areas: blankCopy(copy.userId).areas,
        };
        writeCopy();
        ownReset = true;
        epochPending = true;
        schedule(0);
      }
      if (!epochPending) patch({ epochChange: null });
      refreshCounts();
    },
  };
}
```

`frontend/src/features/progress-sync/ui/progress-sync-context.ts`:

```ts
import { createContext, useContext } from 'react';
import type { ProgressSync } from '../model/types';

export const ProgressSyncContext = createContext<ProgressSync | null>(null);

export function useProgressSync(): ProgressSync | null {
  return useContext(ProgressSyncContext);
}
```

`frontend/src/features/progress-sync/index.ts`:

```ts
export { createProgressSync } from './model/create-progress-sync';
export type {
  AreaStore,
  BootOptions,
  ProgressStores,
  ProgressSyncEngine,
  Scheduler,
  V1Source,
} from './model/create-progress-sync';
export { createSyncTransport } from './api/sync-transport';
export type { ProgressFetch, SyncTransport } from './api/sync-transport';
export {
  createMemoryStorage,
  createSpaceStorage,
  sharedModeKey,
  sweepSpaces,
} from './model/account-space';
export type { EnumerableStorage, SpaceStorage } from './model/account-space';
export { blankSnapshot } from './model/progress-snapshot';
export type { ProgressContext, ProgressSnapshot } from './model/progress-snapshot';
export type { Language } from './model/operations';
export { readV1Candidate } from './model/v1-import';
export type { V1Keys, V1Parsers } from './model/v1-import';
export { BUSY } from './model/sync-texts';
export { ProgressSyncContext, useProgressSync } from './ui/progress-sync-context';
export type {
  AccountMismatch,
  EpochChange,
  ExerciseSummary,
  FlushOutcome,
  ImportQuestion,
  ImportReport,
  LeftReason,
  ProgressSync,
  ProgressSyncState,
  SignOutChoice,
  StorageMode,
  SyncStatus,
  UnsentFile,
  V1Summary,
} from './model/types';
```

5. Verde: 29 pruebas, la de los 60 lotes por minuto incluida (12 200 operaciones, menos de 2 s). Checks. Commit: `feat(progress-sync): the sync engine, its state for F11d and F13, and its public API`.

### Tarea T012 · Compuerta de U2 (K)

La compuerta de la sección 0, con 45 pruebas nuevas en 2 archivos. PR: `feat(progress-sync): the transport and the engine of the v2 client (D1c U2)`.

## 3. Unidad 3 · La costura, el armado y la etapa (dueños S y K)

### Tarea T013 · La vinculación del almacenamiento (S)

**Archivos:** se crean `frontend/src/shared/lib/progress-storage.ts` y `progress-storage.spec.ts`; se modifica `frontend/src/shared/lib/versioned-storage.ts`.

**Produce:** `ProgressPersistence`, `ProgressStorageBinding`, `bindProgressStorage(binding)` y `boundProgressStorage()` (contracts/sync-client-d1c.md §9).

**Pasos:**

1. Escribí la spec (R2 y R3; el último caso fija que sin vincular todo sigue como hoy):

`frontend/src/shared/lib/progress-storage.spec.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { bindProgressStorage, type ProgressPersistence } from './progress-storage';
import { openVersionedStore, type StorageLike } from './versioned-storage';

function mapStorage(
  entries: Record<string, string> = {},
): StorageLike & { items: Map<string, string> } {
  const items = new Map(Object.entries(entries));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

const parse = (raw: unknown) => ({ state: raw as { n: number }, dropped: 0 });
const blank = () => ({ n: 0 });

function bind(storage: StorageLike, persistence: ProgressPersistence): void {
  bindProgressStorage({ storage, persistence: () => persistence });
}

afterEach(() => bindProgressStorage(null));

describe('openVersionedStore with the progress binding', () => {
  it('reads and writes the bound storage when it persists in the browser', () => {
    const space = mapStorage({ k: '{"n":1}' });
    bind(space, 'browser');
    const store = openVersionedStore('k', { blank, parse });
    expect(store.load()).toMatchObject({
      status: 'loaded',
      state: { n: 1 },
      writable: true,
    });
    expect(store.write({ n: 2 })).toEqual({ saved: true, state: { n: 2 } });
    expect(space.items.get('k')).toBe('{"n":2}');
  });

  it('reads what is in memory and never writes it in the shared mode', () => {
    const memory = mapStorage({ k: '{"n":3}' });
    bind(memory, 'memory');
    const store = openVersionedStore('k', { blank, parse });
    expect(store.load()).toMatchObject({
      status: 'loaded',
      state: { n: 3 },
      writable: false,
    });
    expect(store.write({ n: 4 })).toEqual({ saved: false, state: { n: 4 } });
    expect(memory.items.get('k')).toBe('{"n":3}');
  });

  it('reports unavailable, as today, when the browser blocks storage, but keeps the state it read', () => {
    bind(mapStorage({ k: '{"n":5}' }), 'blocked');
    const store = openVersionedStore('k', { blank, parse });
    expect(store.load()).toMatchObject({
      status: 'unavailable',
      state: { n: 5 },
      writable: false,
    });
  });

  it('uses localStorage, as today, when nothing is bound', () => {
    const store = openVersionedStore('k', {
      blank,
      parse,
      storage: mapStorage(),
    });
    expect(store.load()).toMatchObject({ status: 'empty', writable: true });
  });
});
```

2. Creá `progress-storage.ts` con `bindProgressStorage` y `boundProgressStorage` como stubs tipados. La spec falla: el primer caso porque `versioned-storage` todavía no mira la vinculación.
3. Implementá `progress-storage.ts`:

`frontend/src/shared/lib/progress-storage.ts`:

```ts
import type { StorageLike } from './versioned-storage';

export type ProgressPersistence = 'browser' | 'memory' | 'blocked';

export interface ProgressStorageBinding {
  readonly storage: StorageLike;
  persistence(): ProgressPersistence;
}

let binding: ProgressStorageBinding | null = null;

// D1c binds the account space before the views open the four stores (research-d1c.md, R2).
export function bindProgressStorage(next: ProgressStorageBinding | null): void {
  binding = next;
}

export function boundProgressStorage(): ProgressStorageBinding | null {
  return binding;
}
```

4. En `versioned-storage.ts`, cuatro cambios y nada más:
   - el import, después del de `is-lossless-normalization`:

     ```ts
     import { boundProgressStorage } from './progress-storage';
     ```
   - al principio de `openVersionedStore`, en lugar de `const storage = resolveStorage(options.storage);`:

     ```ts
     const binding = options.storage ? null : boundProgressStorage();
     const storage = resolveStorage(options.storage ?? binding?.storage);
     ```
   - después de `let writable = storage !== null;`, la persistencia y el filtro de la memoria; la función `load` de hoy pasa a llamarse `readStored`, sin otro cambio:

     ```ts
     const persists = (): boolean => (binding?.persistence() ?? 'browser') === 'browser';

     // With the progress kept in memory, the store reads what D1c left there and never writes;
     // with blocked storage it also reports what it reports today (ADR 0003).
     function inMemory(loaded: LoadResult<T>): LoadResult<T> {
       if (persists()) return loaded;
       writable = false;
       const status = binding?.persistence() === 'blocked' ? 'unavailable' : loaded.status;
       return { ...loaded, status, writable: false };
     }

     function load(): LoadResult<T> {
       return inMemory(readStored());
     }
     ```
   - en `remove()`, `writable = true;` pasa a `writable = persists();`.
5. Verde: 4 pruebas. `node qa/versioned-storage-check.ts` sigue en verde sin cambios (nada vinculado). Checks. Commit: `feat(shared): versioned stores read and write the bound progress storage`.

### Tarea T014 · Las entidades exportan su clave y su parser, y la guarda lo admite (S)

**Archivos:** los cuatro dueños de las claves y sus índices; `entities/campaign/model/types.ts` y `entities/systems-workshop/model/types.ts`; `qa/lib/seams-guard.ts` y `qa/seams-guard-check.ts`; specs nuevas junto a los motores.

**Produce:**

```ts
// entities/guide
export const ROUTE_PROGRESS_KEY = 'taller-learning-v1';
// entities/exercise
export const LAB_PROGRESS_KEY = 'taller-laboratorio-v1';
export { parseSavedLab } from './model/lab-state';
// entities/campaign
export const CAMPAIGN_PROGRESS_KEY = 'taller-campaign-v1';
// CampaignEngine suma: parseSaved(raw: unknown): ParsedState<CampaignStateV1>;
// entities/systems-workshop
export const SYSTEMS_PROGRESS_KEY = 'taller-systems-v1';
// SystemsEngine suma: parseSaved(raw: unknown): ParsedState<SystemsStateV1>;
```

**Pasos:**

1. Las specs que fallan, una por motor. El contrato (http-d1b.md §3.3) dice que el normalizado es el `state` del parser de carga del almacén: el valor esperado es lo que el mismo motor carga de una clave con ese crudo, con el almacenamiento vinculado de T013. Las configuraciones chicas son copias de las de `create-campaign-engine.subscription.spec.ts` y `create-systems-engine.subscription.spec.ts`, que las specs no exportan.

   ```ts
   // frontend/src/entities/campaign/model/create-campaign-engine.parse-saved.spec.ts
   import { afterEach, describe, expect, it } from 'vitest';
   import { bindProgressStorage } from '../../../shared/lib/progress-storage';
   import { CAMPAIGN_PROGRESS_KEY, createCampaignEngine } from '..';
   import type { CampaignConfig, CampaignWorldDefinition } from './types';

   const LEVELS = ['beginner', 'medium', 'advanced', 'expert'] as const;

   function worldsFor(language: 'rust' | 'go'): CampaignWorldDefinition[] {
     return LEVELS.map((level, index) => ({
       id: `${language}-world-${index + 1}`,
       level,
       title: `${language} world ${index + 1}`,
       badge: `Badge ${index + 1}`,
       trainingIds: [1, 2, 3].map((n) => `${language}-${index * 6 + n}`),
       challengeIds: [4, 5, 6].map((n) => `${language}-${index * 6 + n}`),
       bossId: `${language}-${index * 6 + 6}`,
       checkpoint: { question: 'Why?', options: ['Because of a rule', 'By chance'], answer: 0, explanation: 'The rule keeps the contract.' },
     }));
   }

   function smallConfig(): CampaignConfig {
     const exercises = (['rust', 'go'] as const).flatMap((language) =>
       Array.from({ length: 25 }, (_, index) => ({
         id: `${language}-${index + 1}`,
         language,
         title: `${language} exercise ${index + 1}`,
         tests: ['t1', 't2', 't3'].map((id) => ({ id })),
       })),
     );
     return { exercises, worlds: { rust: worldsFor('rust'), go: worldsFor('go') } };
   }

   const RAW = {
     version: 1,
     seals: { 'rust-1': { code: true, prediction: false, assisted: false }, 'rust-999': { code: true, prediction: true, assisted: true } },
     checkpoints: { 'rust-world-1': { passed: true, lastAnswer: 0 }, 'gone-world': { passed: true, lastAnswer: 1 } },
   };

   afterEach(() => bindProgressStorage(null));

   describe('parseSaved', () => {
     it('gives what the engine loads from a key with the same text (http-d1b.md §3.3)', () => {
       const items = new Map([[CAMPAIGN_PROGRESS_KEY, JSON.stringify(RAW)]]);
       bindProgressStorage({
         storage: { getItem: (key) => items.get(key) ?? null, setItem: () => undefined, removeItem: () => undefined },
         persistence: () => 'browser',
       });
       const loaded = createCampaignEngine();
       loaded.init(smallConfig());
       const parser = createCampaignEngine();
       parser.init(smallConfig());
       expect(parser.parseSaved(RAW).state).toEqual(loaded.exportState());
     });
   });
   ```

   La de Sistemas (`create-systems-engine.parse-saved.spec.ts`) tiene la misma forma, con `SYSTEMS_PROGRESS_KEY`, `createSystemsEngine`, la `smallConfig` de su spec de suscripción (dos talleres, `alpha` y `beta`, cuatro etapas, objetivos `a`, `b` y `c`) y este crudo:

   ```ts
   const RAW = {
     version: 1,
     records: {
       'rust:alpha': { observed: ['a'], code: false, predicted: true, answer: 1, steps: [0, 2], note: 'Nota A' },
       'go:zzz': { observed: [], code: true, predicted: false, answer: null, steps: [], note: '' },
     },
   };
   ```

2. Stubs tipados de `parseSaved` en los dos motores; las specs fallan con «not implemented».
3. Implementá:
   - `route-store.ts`: `const KEY = 'taller-learning-v1';` pasa a `export const ROUTE_PROGRESS_KEY = 'taller-learning-v1';`, y cada `KEY` del archivo pasa a `ROUTE_PROGRESS_KEY`. El índice suma `ROUTE_PROGRESS_KEY` al `export { createRouteStore, routeStore }`.
   - `lab-store.ts`: lo mismo con `LAB_PROGRESS_KEY`. El índice suma `LAB_PROGRESS_KEY` y `export { parseSavedLab } from './model/lab-state';`.
   - `create-campaign-engine.ts`: `const STORAGE_KEY` pasa a `export const CAMPAIGN_PROGRESS_KEY`, y suma al objeto que devuelve, después de `planImport,`:

     ```ts
     parseSaved: (raw: unknown) => parseSavedCampaignState(assertReady(), raw),
     ```

     En `types.ts`, `CampaignEngine` suma `parseSaved(raw: unknown): ParsedState<CampaignStateV1>;` (con `import type { ParsedState } from '../../../shared/lib/versioned-storage';`). El índice exporta `CAMPAIGN_PROGRESS_KEY`.
   - `create-systems-engine.ts`: `const STORAGE_KEY` pasa a `export const SYSTEMS_PROGRESS_KEY`, y suma, después de `planImport,`:

     ```ts
     parseSaved(raw: unknown) {
       assertReady();
       return parseSavedSystemsState(catalog, raw);
     },
     ```

     `SystemsEngine` suma la misma firma con `SystemsStateV1`, y el índice exporta `SYSTEMS_PROGRESS_KEY`.
4. **La guarda.** `seams-guard-check` sigue en verde con las claves exportadas: el literal sigue en un solo archivo (R1). La regla R4 suma los dos archivos del armado de D1c, `frontend/src/app/progress-sync/store-adapters.ts` y `frontend/src/app/progress-sync/app-progress-sync.ts`, con el mismo mecanismo con el que F8 eximió `app/progress-backup/app-progress-backup.ts` (detección B9 de T001). Si B9 no encontró ninguno, en `qa/lib/seams-guard.ts`:

   ```ts
   const ASSEMBLY_FILES: readonly string[] = [
     'frontend/src/app/progress-sync/store-adapters.ts',
     'frontend/src/app/progress-sync/app-progress-sync.ts',
   ];
   ```

   y la condición de R4 deja pasar un archivo de `ASSEMBLY_FILES`. `qa/seams-guard-check.ts` suma el escenario «R4: the assembly of D1c may import the four indexes», con los dos archivos importando los cuatro índices y `findViolations` vacío, y uno con un tercer archivo de `app/progress-sync/` que da `R4`.
5. Verde: las dos specs nuevas, `node qa/seams-guard-check.ts`, `node qa/boot-check.ts` y `npm run test:unit` sin cambios en lo demás. Checks. Commit: `feat(entities): export the progress keys and the load parsers that D1c needs`.

### Tarea T015 · La versión publicada, el contexto real y los adaptadores (S)

**Archivos:** `frontend/src/app/progress-sync/content-version.ts`, `progress-context.ts` (+ `progress-context.spec.ts`) y `store-adapters.ts` (+ `store-adapters.spec.ts`).

**Consume:** `getContent()` y `Content` (`app/content/content.ts`); `MILESTONE_IDS`, `blankRouteProgress` y `routeStore` (`entities/guide`); `blankLabState` y `labStore` (`entities/exercise`); `campaignEngine`; `systemsEngine`; las constantes de T014; `sha256Hex` (T002); `blankSnapshot` y los tipos de `features/progress-sync`.

**Produce:**

```ts
export function rememberPublishedVersion(version: string): void;
export function publishedVersion(): string | null;
export function createProgressContext(content: Content, contentVersion: string, blankSnapshot: () => ProgressSnapshot): ProgressContext;
export interface OpenableArea<S> { readonly key: string; readOpen(): S; applyOpen(state: S): void; subscribe(listener: () => void): () => void }
export function areaStore<S>(area: OpenableArea<S>, space: StorageLike, blank: () => S): AreaStore<S>;
export function progressStores(space: StorageLike, blank: () => ProgressSnapshot): ProgressStores;
```

**Pasos:**

1. Escribí las specs:

   ```ts
   // frontend/src/app/progress-sync/progress-context.spec.ts
   import { describe, expect, it } from 'vitest';
   import { blankRouteProgress } from '../../entities/guide';
   import { blankLabState } from '../../entities/exercise';
   import { blankSnapshot } from '../../features/progress-sync';
   import type { Content } from '../content/content';
   import { createProgressContext } from './progress-context';

   const content = {
     lab: { rust: [{ id: 'rust-01', starter: 'fn main() {}', prediction: { answer: 2 } }], go: [] },
     quests: { rust: [], go: [] },
     cores: { lowlevel: [], infra: [], play: [], pc: [] },
     campaign: {
       rust: [{ id: 'rust-world-1', trainingIds: ['rust-01'], challengeIds: [], bossId: 'rust-02', checkpoint: { answer: 1 } }],
       go: [],
     },
     workshops: {
       lowlevel: [
         {
           id: 'ws-cache',
           code: { rust: 'fn x() {}', go: 'func x() {}' },
           objectives: [{ id: 'hit' }],
           steps: [{ id: 'e1' }, { id: 'e2' }],
           prediction: { answer: 0 },
         },
       ],
       infra: [],
       play: [],
       pc: [],
     },
     guide: { resources: [{ id: 'book' }], tracks: { rust: { modules: [{ steps: [{ id: 'rust-1-1' }] }] }, go: { modules: [] } }, sources: [] },
     atlas: { rust: [], go: [] },
   } as unknown as Content;

   describe('createProgressContext', () => {
     const context = createProgressContext(content, 'v', blankSnapshot);

     it('knows the published references and translates step keys both ways', () => {
       expect([context.knowsExercise('rust-01'), context.knowsExercise('rust-99')]).toEqual([true, false]);
       expect([context.knowsCampaignMission('rust-02'), context.knowsWorld('rust-world-1')]).toEqual([true, true]);
       expect([context.knowsGuideStep('rust-1-1'), context.knowsGuideResource('book')]).toEqual([true, true]);
       expect([context.stepKeyAt('ws-cache', 'go', 1), context.stepPositionOf('ws-cache', 'rust', 'e2')]).toEqual(['e2', 1]);
       expect(context.knowsObjective('ws-cache', 'rust', 'hit')).toBe(true);
     });

     it('hashes the starter as tools/content does, and grades with the published answers', () => {
       // sha256 of the UTF-8 of '"fn main() {}"', computed with Node's crypto when planning.
       expect(context.starterHashOf('rust-01')).toBe('e287c4962f0fd1c2228c1cdc51085f5a8b526e148fd22a5a5dd8683d11f0a13d');
       expect([context.predictionAnswerOf('rust-01'), context.checkpointAnswerOf('rust-world-1'), context.workshopAnswerOf('ws-cache', 'go')]).toEqual([2, 1, 0]);
     });

     it('starts from the same blank state as the stores', () => {
       expect(blankSnapshot().route).toEqual(blankRouteProgress());
       expect(blankSnapshot().lab).toEqual(blankLabState());
     });
   });
   ```

   ```ts
   // frontend/src/app/progress-sync/store-adapters.spec.ts
   import { describe, expect, it } from 'vitest';
   import type { StorageLike } from '../../shared/lib/versioned-storage';
   import { areaStore, type OpenableArea } from './store-adapters';

   function mapStorage(entries: Record<string, string> = {}): StorageLike & { items: Map<string, string> } {
     const items = new Map(Object.entries(entries));
     return {
       items,
       getItem: (key) => items.get(key) ?? null,
       setItem: (key, value) => {
         items.set(key, value);
       },
       removeItem: (key) => {
         items.delete(key);
       },
     };
   }

   function area(open: boolean, applied: unknown[] = []): OpenableArea<{ version: 1; n: number }> {
     return {
       key: 'k',
       readOpen: () => {
         if (!open) throw new Error('closed');
         return { version: 1, n: 7 };
       },
       applyOpen: (state) => applied.push(state),
       subscribe: () => () => undefined,
     };
   }

   const blank = () => ({ version: 1 as const, n: 0 });

   describe('areaStore', () => {
     it('reads the space before the store opens, and the store after', () => {
       const space = mapStorage({ k: '{"version":1,"n":3}' });
       expect(areaStore(area(false), space, blank).read()).toEqual({ version: 1, n: 3 });
       expect(areaStore(area(true), space, blank).read()).toEqual({ version: 1, n: 7 });
     });

     it('writes the space only when the projection changes it, and never a blank on an empty key', () => {
       const space = mapStorage();
       const store = areaStore(area(false), space, blank);
       store.apply(blank());
       expect(space.items.size).toBe(0);
       store.apply({ version: 1, n: 4 });
       expect(space.items.get('k')).toBe('{"version":1,"n":4}');
     });

     it('goes through the open store, never through its key (FR-061)', () => {
       const applied: unknown[] = [];
       const space = mapStorage();
       areaStore(area(true, applied), space, blank).apply({ version: 1, n: 5 });
       expect(applied).toEqual([{ version: 1, n: 5 }]);
       expect(space.items.size).toBe(0);
     });
   });
   ```

2. Stubs tipados; las specs fallan.
3. Implementá:

`frontend/src/app/progress-sync/content-version.ts`:

```ts
let published: string | null = null;

export function rememberPublishedVersion(version: string): void {
  published = version;
}

export function publishedVersion(): string | null {
  return published;
}
```

`frontend/src/app/progress-sync/progress-context.ts`:

```ts
import { MILESTONE_IDS } from '../../entities/guide';
import type { Language, ProgressContext, ProgressSnapshot } from '../../features/progress-sync';
import { sha256Hex } from '../../shared/lib/sha256-hex';
import type { Content } from '../content/content';

interface IdentifiedStep {
  readonly id?: unknown;
}

export function createProgressContext(
  content: Content,
  contentVersion: string,
  blankSnapshot: () => ProgressSnapshot,
): ProgressContext {
  const exercises = new Map(
    [
      ...Object.values(content.lab),
      ...Object.values(content.quests),
      ...Object.values(content.cores),
    ]
      .flat()
      .map((exercise) => [exercise.id, exercise]),
  );
  const worlds = new Map(
    Object.values(content.campaign)
      .flat()
      .map((world) => [world.id, world]),
  );
  const missions = new Set(
    [...worlds.values()].flatMap((world) => [
      ...world.trainingIds,
      ...world.challengeIds,
      world.bossId,
    ]),
  );
  const workshops = new Map(
    Object.values(content.workshops)
      .flat()
      .map((workshop) => [workshop.id, workshop]),
  );
  const guideSteps = new Set(
    Object.values(content.guide.tracks).flatMap((track) =>
      track.modules.flatMap((module) => module.steps.map((step) => step.id)),
    ),
  );
  const resources = new Set(content.guide.resources.map((resource) => resource.id));
  const starterHashes = new Map<string, string>();

  const knowsWorkshop = (workshopId: string, language: Language): boolean =>
    typeof workshops.get(workshopId)?.code[language] === 'string';
  const stepKeys = (workshopId: string, language: Language): string[] =>
    knowsWorkshop(workshopId, language)
      ? (workshops.get(workshopId)?.steps ?? []).map((step) => String((step as IdentifiedStep).id))
      : [];

  return {
    contentVersion,
    blankSnapshot,
    knowsExercise: (exerciseId) => exercises.has(exerciseId),
    knowsCampaignMission: (exerciseId) => missions.has(exerciseId),
    knowsWorld: (worldId) => worlds.has(worldId),
    knowsGuideStep: (stepId) => guideSteps.has(stepId),
    knowsGuideResource: (resourceId) => resources.has(resourceId),
    knowsMilestone: (itemKey) => MILESTONE_IDS.includes(itemKey),
    knowsWorkshop,
    knowsObjective: (workshopId, language, objectiveKey) =>
      knowsWorkshop(workshopId, language) &&
      (workshops.get(workshopId)?.objectives ?? []).some(
        (objective) => objective.id === objectiveKey,
      ),
    stepKeyAt: (workshopId, language, position) => stepKeys(workshopId, language)[position] ?? null,
    stepPositionOf: (workshopId, language, stepKey) => {
      const position = stepKeys(workshopId, language).indexOf(stepKey);
      return position === -1 ? null : position;
    },
    starterHashOf(exerciseId) {
      const exercise = exercises.get(exerciseId);
      if (exercise === undefined) return null;
      const known = starterHashes.get(exerciseId);
      if (known !== undefined) return known;
      const hash = sha256Hex(JSON.stringify(exercise.starter));
      starterHashes.set(exerciseId, hash);
      return hash;
    },
    predictionAnswerOf: (exerciseId) => exercises.get(exerciseId)?.prediction.answer ?? null,
    checkpointAnswerOf: (worldId) => worlds.get(worldId)?.checkpoint.answer ?? null,
    workshopAnswerOf: (workshopId, language) =>
      knowsWorkshop(workshopId, language)
        ? (workshops.get(workshopId)?.prediction.answer ?? null)
        : null,
  };
}
```

`frontend/src/app/progress-sync/store-adapters.ts`:

```ts
import {
  CAMPAIGN_PROGRESS_KEY,
  campaignEngine,
  type CampaignImportPlan,
} from '../../entities/campaign';
import { LAB_PROGRESS_KEY, labStore } from '../../entities/exercise';
import { ROUTE_PROGRESS_KEY, routeStore } from '../../entities/guide';
import {
  SYSTEMS_PROGRESS_KEY,
  systemsEngine,
  type SystemsImportPlan,
} from '../../entities/systems-workshop';
import type { AreaStore, ProgressSnapshot, ProgressStores } from '../../features/progress-sync';
import { cloneJson } from '../../shared/lib/clone-json';
import { isPlainObject } from '../../shared/lib/is-plain-object';
import type { StorageLike } from '../../shared/lib/versioned-storage';

export interface OpenableArea<S> {
  readonly key: string;
  readOpen(): S;
  applyOpen(state: S): void;
  subscribe(listener: () => void): () => void;
}

// Before the views open a store, D1c reads and writes its key in the account space; once it is
// open, it goes through the store, so no second instance ever touches the key (FR-061).
export function areaStore<S>(
  area: OpenableArea<S>,
  space: StorageLike,
  blank: () => S,
): AreaStore<S> {
  function isOpen(): boolean {
    try {
      area.readOpen();
      return true;
    } catch {
      return false;
    }
  }

  function storedText(): string | null {
    try {
      return space.getItem(area.key);
    } catch {
      return null;
    }
  }

  function stored(): S {
    const text = storedText();
    if (text === null) return blank();
    try {
      const value: unknown = JSON.parse(text);
      return isPlainObject(value) && value.version === 1 ? (value as S) : blank();
    } catch {
      return blank();
    }
  }

  return {
    read: () => (isOpen() ? cloneJson(area.readOpen()) : stored()),
    apply(state) {
      if (isOpen()) {
        area.applyOpen(cloneJson(state));
        return;
      }
      const text = JSON.stringify(state);
      const current = storedText();
      if (current === text || (current === null && text === JSON.stringify(blank()))) return;
      try {
        space.setItem(area.key, text);
      } catch {
        // Blocked writes: the store opens in memory and the projection comes back on the next photo.
      }
    },
    subscribe: (listener) => area.subscribe(listener),
  };
}

export function progressStores(space: StorageLike, blank: () => ProgressSnapshot): ProgressStores {
  return {
    route: areaStore(
      {
        key: ROUTE_PROGRESS_KEY,
        readOpen: () => routeStore.getProgress(),
        applyOpen: (state) => routeStore.applyImport({ state, lossy: false }),
        subscribe: (listener) => routeStore.changes.subscribe(() => listener()),
      },
      space,
      () => blank().route,
    ),
    lab: areaStore(
      {
        key: LAB_PROGRESS_KEY,
        readOpen: () => labStore.getProgress(),
        applyOpen: (state) => labStore.applyImport({ state, lossy: false }),
        subscribe: (listener) => labStore.changes.subscribe(() => listener()),
      },
      space,
      () => blank().lab,
    ),
    campaign: areaStore(
      {
        key: CAMPAIGN_PROGRESS_KEY,
        readOpen: () => campaignEngine.exportState() as ProgressSnapshot['campaign'],
        applyOpen: (state) =>
          campaignEngine.applyImport({ state, lossy: false } as CampaignImportPlan),
        subscribe: (listener) => campaignEngine.changes.subscribe(() => listener()),
      },
      space,
      () => blank().campaign,
    ),
    systems: areaStore(
      {
        key: SYSTEMS_PROGRESS_KEY,
        readOpen: () => systemsEngine.exportState() as ProgressSnapshot['systems'],
        applyOpen: (state) =>
          systemsEngine.applyImport({ state, lossy: false } as SystemsImportPlan),
        subscribe: (listener) => systemsEngine.changes.subscribe(() => listener()),
      },
      space,
      () => blank().systems,
    ),
  };
}
```

4. Verde: 3 y 3 pruebas. Checks, y `node qa/seams-guard-check.ts` con los dos archivos del armado. Commit: `feat(progress-sync): the published content and the four stores as the engine sees them`.

### Tarea T016 · El motor único y la etapa de arranque (S)

**Archivos:** `frontend/src/app/progress-sync/app-progress-sync.ts` (+ `app-progress-sync.spec.ts`) y `progress-stage.ts`.

**Consume:** T011, T013, T014 y T015; `apiClient` (`app/account/api-client.ts`, F11a); `sessionStore` (`entities/session`, F11a); `BootStage` (`app/boot/run-boot.ts`).

**Produce:**

```ts
export const V1_KEYS: V1Keys;
export interface ProgressEnvironment { localStorage(): EnumerableStorage | null; listen(engine: ProgressSyncEngine): void; now(): number }
export function chooseMode(local: EnumerableStorage | null, userId: number): StorageMode;
export function appProgressSync(): ProgressSyncEngine; // la crea en la primera llamada; después, la misma
export function bootProgressSync(userId: number, environment?: ProgressEnvironment): Promise<void>;
export const progressStage: BootStage; // name: 'progressStage'
```

**Pasos:**

1. Escribí la spec de la elección del modo (FR-070 enmendado y la memoria de ADR 0003):

   ```ts
   // frontend/src/app/progress-sync/app-progress-sync.spec.ts
   import { describe, expect, it } from 'vitest';
   import { createMemoryStorage } from '../../features/progress-sync';
   import { chooseMode } from './app-progress-sync';

   describe('chooseMode', () => {
     it('runs in memory when the browser blocks storage', () => {
       expect(chooseMode(null, 41)).toBe('blocked');
     });

     it('runs in memory when this account chose the shared computer here', () => {
       const local = createMemoryStorage();
       local.setItem('taller-v2-compartida:41', '1');
       expect([chooseMode(local, 41), chooseMode(local, 7)]).toEqual(['shared', 'browser']);
     });
   });
   ```

2. Stub tipado de `chooseMode`; la spec falla.
3. Implementá:

`frontend/src/app/progress-sync/app-progress-sync.ts`:

```ts
import { campaignEngine, CAMPAIGN_PROGRESS_KEY } from '../../entities/campaign';
import { exerciseCatalog, LAB_PROGRESS_KEY, parseSavedLab } from '../../entities/exercise';
import { parseRouteProgress, ROUTE_PROGRESS_KEY } from '../../entities/guide';
import { sessionStore } from '../../entities/session';
import { SYSTEMS_PROGRESS_KEY, systemsEngine } from '../../entities/systems-workshop';
import {
  blankSnapshot,
  createMemoryStorage,
  createProgressSync,
  createSpaceStorage,
  createSyncTransport,
  readV1Candidate,
  sharedModeKey,
  sweepSpaces,
  type EnumerableStorage,
  type ProgressSyncEngine,
  type StorageMode,
  type V1Keys,
  type V1Parsers,
} from '../../features/progress-sync';
import { bindProgressStorage } from '../../shared/lib/progress-storage';
import { apiClient } from '../account/api-client';
import { getContent } from '../content/content';
import { publishedVersion } from './content-version';
import { createProgressContext } from './progress-context';
import { progressStores } from './store-adapters';

export const V1_KEYS: V1Keys = {
  route: ROUTE_PROGRESS_KEY,
  lab: LAB_PROGRESS_KEY,
  campaign: CAMPAIGN_PROGRESS_KEY,
  systems: SYSTEMS_PROGRESS_KEY,
};

export interface ProgressEnvironment {
  localStorage(): EnumerableStorage | null;
  listen(engine: ProgressSyncEngine): void;
  now(): number;
}

export function chooseMode(local: EnumerableStorage | null, userId: number): StorageMode {
  if (local === null) return 'blocked';
  return local.getItem(sharedModeKey(userId)) === '1' ? 'shared' : 'browser';
}

const browserEnvironment: ProgressEnvironment = {
  localStorage() {
    try {
      const storage = window.localStorage;
      storage.getItem(sharedModeKey(0));
      return storage;
    } catch {
      return null;
    }
  },
  listen(engine) {
    window.addEventListener('online', () => engine.onOnline());
    window.addEventListener('pagehide', () => engine.onPageHide());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') engine.onHidden();
      else engine.onVisible();
    });
  },
  now: () => Date.now(),
};

const v1Parsers: V1Parsers = {
  route: (raw) => parseRouteProgress(raw, getContent().guide).state,
  lab: (raw) => parseSavedLab(raw, exerciseCatalog.byId).state,
  campaign: (raw) => campaignEngine.parseSaved(raw).state,
  systems: (raw) => systemsEngine.parseSaved(raw).state,
};

let engine: ProgressSyncEngine | null = null;
let space = createSpaceStorage(0, createMemoryStorage());

export function appProgressSync(): ProgressSyncEngine {
  engine ??= createProgressSync({
    transport: createSyncTransport({
      client: apiClient,
      fetch: (input, init) => window.fetch(input, init),
      readCookies: () => document.cookie,
    }),
    stores: progressStores(
      {
        getItem: (key) => space.getItem(key),
        setItem: (key, value) => space.setItem(key, value),
        removeItem: (key) => space.removeItem(key),
      },
      blankSnapshot,
    ),
    scheduler: {
      now: () => Date.now(),
      setTimeout: (run, delayMs) => window.setTimeout(run, delayMs),
      clearTimeout: (handle) => window.clearTimeout(handle as number),
    },
    randomFill: (bytes) => crypto.getRandomValues(bytes),
  });
  return engine;
}

export async function bootProgressSync(
  userId: number,
  environment: ProgressEnvironment = browserEnvironment,
): Promise<void> {
  const sync = appProgressSync();
  const local = environment.localStorage();
  const mode = chooseMode(local, userId);
  if (mode === 'browser' && local !== null) sweepSpaces(local, userId, environment.now());
  space = createSpaceStorage(
    userId,
    mode === 'browser' && local !== null ? local : createMemoryStorage(),
  );
  bindProgressStorage({
    storage: space,
    persistence: () => {
      const current = sync.state.getState().mode;
      return current === 'browser' ? 'browser' : current === 'blocked' ? 'blocked' : 'memory';
    },
  });
  const contentVersion = publishedVersion() ?? sessionStore.getState().contentVersion ?? '';
  await sync.boot({
    userId,
    mode,
    space,
    context: createProgressContext(getContent(), contentVersion, blankSnapshot),
    v1: {
      candidate: local === null ? null : readV1Candidate(local, V1_KEYS),
      keys: V1_KEYS,
      parsers: v1Parsers,
      storage: local ?? createMemoryStorage(),
    },
    createMemory: createMemoryStorage,
    rememberSharedMode(shared) {
      if (shared) local?.setItem(sharedModeKey(userId), '1');
      else local?.removeItem(sharedModeKey(userId));
    },
  });
  sync.start();
  environment.listen(sync);
  sessionStore.subscribe((state) => {
    if (state.user?.id === userId) sync.resume();
  });
}
```

`frontend/src/app/progress-sync/progress-stage.ts`:

```ts
import { sessionStore } from '../../entities/session';
import type { BootStage } from '../boot/run-boot';
import { bootProgressSync } from './app-progress-sync';

export const progressStage: BootStage = {
  name: 'progressStage',
  async run() {
    const user = sessionStore.getState().user;
    if (user === null) return;
    try {
      await bootProgressSync(user.id);
    } catch (error) {
      console.error('No se pudo preparar la sincronización del progreso.', error);
    }
  },
};
```

4. Verde: 2 pruebas. Lo demás de este archivo lo prueban `boot-check` (T017) y los E2E (T025): depende de `window`, de la sesión y del contenido publicado. Checks. Commit: `feat(progress-sync): the boot stage that binds the account space before the views`.

### Tarea T017 · La integración del arranque y `boot-check` (K)

**Archivos:** `frontend/src/app/main.tsx`, `qa/load-order-check.ts`, `frontend/src/app/boot/content-stage.ts` (A3), `qa/lib/content-server.ts`, `qa/lib/boot-harness.ts` y `qa/boot-check.ts`.

**Pasos:**

1. **El escenario nuevo de `boot-check`, en rojo** (Review Focus 3, FR-072). Después de los de compatibilidad:

   ```ts
   await test('D1c: arrancar con el progreso de master no lo lee, no lo escribe y no escribe el espacio', async () => {
     const harness = await bootApp(MASTER_STORAGE, { rawStorage: true });
     assert.deepEqual(harness.errors, []);
     assert.deepEqual(Object.fromEntries(harness.storage), MASTER_STORAGE);
     assert.deepEqual(
       [...harness.storage.keys()].filter((key) => key.startsWith('taller-v2:')),
       [],
     );
     assert.equal(harness.apiRequests.includes('GET /api/progress'), true);
   });
   ```

   `bootApp(storage, { rawStorage: true })` siembra las claves tal cual; sin la opción, `bootApp` siembra cada clave de progreso en el espacio de la cuenta de la sesión del harness (paso 4). Corré `node qa/boot-check.ts`: falla porque el arranque no pide `GET /api/progress` y porque `bootApp` no conoce la opción.
2. **`main.tsx` y `load-order-check`.** La llamada pasa a:

   ```ts
   runBoot([tokenStage, sessionStage, contentGate, progressStage, legacyViews]).catch((error: unknown) => {
     console.error('No se pudo iniciar el taller.', error);
   });
   ```

   con `import { progressStage } from './progress-sync/progress-stage';` después del de `contentGate`. La tabla de etapas de `qa/load-order-check.ts` suma `progressStage` entre `contentGate` y `legacyViews`, con la misma forma que las otras filas.
3. **La versión publicada.** En `app/boot/content-stage.ts` (A3), la primera línea de `afterPublish` es `rememberPublishedVersion(reading.version);`, con `import { rememberPublishedVersion } from '../progress-sync/content-version';`.
4. **El harness.** En `qa/lib/content-server.ts`, `PROGRESS_API` (de F8, detección B10) pasa a:

   ```ts
   const EMPTY_AREAS = {
     exercises: [],
     drafts: [],
     campaign: { seals: [], checkpoints: [] },
     workshops: { progress: [], objectives: [], steps: [] },
     route: { marks: [], quiz: [], notes: [] },
     preferences: null,
   };

   const PROGRESS_API: Readonly<Record<string, (body: unknown) => Response>> = {
     'POST /api/auth/confirm-password': () => jsonResponse(201, {}),
     'GET /api/progress': () =>
       jsonResponse(200, {
         userId: 41,
         epoch: 1,
         revision: 0,
         resetAt: null,
         contentVersion: CONTENT_VERSION,
         serverTime: '2026-03-04T05:06:07.000Z',
         full: true,
         ...EMPTY_AREAS,
       }),
     'POST /api/progress/reset': () => jsonResponse(200, { epoch: 2, revision: 1 }),
     'POST /api/sync': (body) => {
       const envelope = body as { epoch: number; sentAt: string; knownRevision?: number; operations: { id: string }[] };
       return jsonResponse(200, {
         epoch: envelope.epoch,
         revision: (envelope.knownRevision ?? 0) + (envelope.operations.length > 0 ? 1 : 0),
         serverTime: envelope.sentAt,
         contentVersion: CONTENT_VERSION,
         results: envelope.operations.map((operation) => ({ id: operation.id, status: 'applied' })),
         changes: { full: false, ...EMPTY_AREAS },
       });
     },
   };
   ```

   `CONTENT_VERSION` es la del meta, como en el doble de F11a; el `fetch` del servidor pasa el cuerpo parseado a cada respuesta (`PROGRESS_API[route](init?.body ? JSON.parse(String(init.body)) : undefined)`). Si F8 usaba `respond(…)` de A3, se mantiene esa forma y sólo cambia el cuerpo.
   En `qa/lib/boot-harness.ts`, `bootApp(storage?, options?)` suma `options.rawStorage`: sin él, cada clave de `storage` que empieza con `taller-` y no con `taller-v2` se siembra como `taller-v2:41:<clave>`, y `harness.storage` se lee igual (un `Map` con las claves reales). Suma `harness.progressKey(key)` → `taller-v2:41:${key}`, para los escenarios que leen una clave de un almacén.
5. **Los escenarios que leen o siembran claves v1** (la lista de T001). Cada uno pasa a leer `harness.progressKey(KEY)` donde leía `KEY`; la siembra no cambia, porque `bootApp` traduce. `assertQuietBoot` sigue igual: compara `harness.storage` con lo sembrado, ya traducido. Si un escenario espera las claves v1 borradas después de «Borrar todo» (el de F8), ahora espera las claves del espacio borradas y las v1 intactas: es el cambio del FR-074 enmendado, y va en la lista que aprueba el usuario.
6. Verde: `node qa/boot-check.ts`, `node qa/load-order-check.ts`, `npm run build` y el tamaño de `dist/index.html` bajo 1 500 000. Checks. Commits: `feat(app): the progress stage runs between the content gate and the views` (pasos 2 y 3) y `test(qa): boot-check boots with the account space and keeps the v1 keys untouched` (pasos 1, 4 y 5).

### Tarea T018 · Compuerta de U3 (K)

La compuerta de la sección 0, con `npm run build` y el tamaño. Además, `npm run test:e2e` **se corre y se informa sin exigirlo en verde**: hasta U5 la red no tiene el doble ni la traducción. PR: `feat(progress-sync): bind the account space before the views (D1c U3)`, apilado y mergeado con F11d (decisión del usuario 2).

## 4. Unidad 4 · Importar, «Borrar todo», «Salir» y los intentos (dueño B)

### Tarea T019 · El armado de `progress-backup` con D1c

**Archivos:** se crean `frontend/src/app/progress-backup/with-progress-sync.ts` y `with-progress-sync.spec.ts`; se modifica `frontend/src/app/progress-backup/app-progress-backup.ts` (F8, detección B5).

**Consume:** `ProgressBackup`, `ProgressImportPlan`, `ResetOutcome` y `ResetRefusal` de `features/progress-backup` (F8, `amend-cuenta` `191e5974`, contracts/method-interfaces.md §1); `BUSY` y `ProgressSyncEngine` de `features/progress-sync`.

**Produce:** `withProgressSync(backup: ProgressBackup, sync: Pick<ProgressSyncEngine, 'exclusive' | 'withoutEnqueuing' | 'importFile' | 'afterOwnReset'>): ProgressBackup` (contracts/sync-client-d1c.md §6).

**Pasos:**

1. Escribí la spec:

`frontend/src/app/progress-backup/with-progress-sync.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ProgressBackup, ResetOutcome } from '../../features/progress-backup';
import { BUSY } from '../../features/progress-sync';
import { withProgressSync } from './with-progress-sync';

function fakeBackup(events: string[]): ProgressBackup {
  return {
    exportProgress: () => ({ fileName: 'f.json', text: '{}' }),
    listBackups: () => [],
    readBackup: () => undefined,
    planImport: (text) => ({ route: text, sections: [] }),
    applyImport: async () => {
      events.push('local import');
      return { notice: 'local' };
    },
    resetAll: async (confirmation) => {
      events.push(`reset ${confirmation?.password ?? ''}`);
      return { notice: 'Progreso reiniciado. Un nuevo comienzo.' };
    },
  };
}

function fakeSync(events: string[], busy = false) {
  return {
    exclusive: async <T>(
      kind: 'import' | 'reset',
      task: () => Promise<T>,
      whenBusy: () => T,
    ): Promise<T> => {
      events.push(`exclusive ${kind}`);
      return busy ? whenBusy() : task();
    },
    withoutEnqueuing: async <T>(task: () => Promise<T>): Promise<T> => {
      events.push('quiet start');
      const result = await task();
      events.push('quiet end');
      return result;
    },
    importFile: async (text: string) => {
      events.push(`server import ${text}`);
      return 'Copia importada y combinada con el progreso de tu cuenta.';
    },
    afterOwnReset: async () => {
      events.push('new epoch');
    },
  };
}

describe('withProgressSync', () => {
  it('sends the planned file to the server instead of merging it locally', async () => {
    const events: string[] = [];
    const backup = withProgressSync(fakeBackup(events), fakeSync(events));
    const plan = backup.planImport('{"version":1}');
    expect(await backup.applyImport(plan)).toEqual({
      notice: 'Copia importada y combinada con el progreso de tu cuenta.',
    });
    expect(events).toEqual(['server import {"version":1}']);
  });

  it('resets under the guard, without enqueueing, and then loads the new epoch', async () => {
    const events: string[] = [];
    const backup = withProgressSync(fakeBackup(events), fakeSync(events));
    await backup.resetAll({ password: 'secreta' });
    expect(events).toEqual([
      'exclusive reset',
      'quiet start',
      'reset secreta',
      'quiet end',
      'new epoch',
    ]);
  });

  it('refuses a reset while an import or another reset runs (F8-Q3)', async () => {
    const events: string[] = [];
    const backup = withProgressSync(fakeBackup(events), fakeSync(events, true));
    const outcome: ResetOutcome = await backup.resetAll({ password: 'secreta' });
    expect(outcome).toEqual({ refusal: expect.objectContaining({ generalMessages: [BUSY] }) });
    expect(events).toEqual(['exclusive reset']);
  });
});
```

2. Stub tipado; la spec falla.
3. Implementá:

`frontend/src/app/progress-backup/with-progress-sync.ts`:

```ts
import type {
  ProgressBackup,
  ProgressImportPlan,
  ResetOutcome,
  ResetRefusal,
} from '../../features/progress-backup';
import { BUSY, type ProgressSyncEngine } from '../../features/progress-sync';

const BUSY_REFUSAL: ResetRefusal = {
  passwordMessages: [],
  generalMessages: [BUSY],
  retryAfterSeconds: null,
  offerReload: false,
  clearPassword: false,
};

type SyncForBackup = Pick<
  ProgressSyncEngine,
  'exclusive' | 'withoutEnqueuing' | 'importFile' | 'afterOwnReset'
>;

// D1c reimplements the import and «Borrar todo» of the feature without touching Método (F8):
// the import goes to the server, and the reset enqueues nothing and loads the new epoch.
export function withProgressSync(backup: ProgressBackup, sync: SyncForBackup): ProgressBackup {
  const texts = new WeakMap<ProgressImportPlan, string>();
  return {
    ...backup,
    planImport(text) {
      const plan = backup.planImport(text);
      texts.set(plan, text);
      return plan;
    },
    async applyImport(plan) {
      const text = texts.get(plan);
      if (text === undefined) return backup.applyImport(plan);
      return { notice: await sync.importFile(text) };
    },
    resetAll(confirmation) {
      return sync.exclusive<ResetOutcome>(
        'reset',
        async () => {
          const outcome = await sync.withoutEnqueuing(() => backup.resetAll(confirmation));
          if (!('refusal' in outcome)) await sync.afterOwnReset();
          return outcome;
        },
        () => ({ refusal: BUSY_REFUSAL }),
      );
    },
  };
}
```

4. En `app-progress-backup.ts`, la instancia que devuelve `appProgressBackup()` pasa por el envoltorio. En `createAppProgressBackup()`, `const backup = createProgressBackup({ … });` queda como está, y lo que devuelve pasa a:

   ```ts
   const synced = withProgressSync(backup, appProgressSync());
   return {
     ...synced,
     registerSessionReset(reset) {
       sessionResets.push(reset);
     },
   };
   ```

   con `import { appProgressSync } from '../progress-sync/app-progress-sync';` y `import { withProgressSync } from './with-progress-sync';`. Si F9 ya retiró `registerSessionReset` (F8, plan :367-399), el `return` es `withProgressSync(backup, appProgressSync())`.
5. Verde: 3 pruebas; `node qa/app-shell-check.ts` sigue en verde (construye su propia instancia con áreas falsas); `node qa/seams-guard-check.ts`. Checks. Commit: `feat(progress-backup): import through the API and reset without touching the v1 keys`.

### Tarea T020 · El puerto de «Salir»

**Archivos:** `frontend/src/features/sign-in/model/sign-out.ts` y `sign-out.spec.ts`; se crea `frontend/src/features/sign-in/ui/sign-out-progress-context.ts`; `frontend/src/features/sign-in/index.ts`; `frontend/src/pages/account/ui/SignOutSection.tsx`, `frontend/src/features/sign-in/ui/PrivacyReacceptance.tsx` y `frontend/src/app/account/AccountRoot.tsx` (F11a; las rutas exactas las confirma B1).

**Consume:** la firma de `signOut` de A3, con `forgetContentCopy` (B3; `amend-cuenta` `specs/016-a3-contenido-api/plan.md:3805-3835`).

**Produce:** contracts/sync-client-d1c.md §5: `SignOutProgress`, `SignOutChoice`, `SignOutLeftover`, `ChooseAfterLeftover`, `SignOutPhase`, `SignOutOutcome` con `stayed`, `SignOutProgressContext` y `useSignOutProgress()`. Es la interfaz que consume F13 (la espera con `onPhase`, la pregunta con `choose` y «Descargar una copia» con `downloadUnsent()` del motor); D1c no dibuja ninguna de esas piezas.

**Pasos:**

1. Sumá a la spec de `sign-out.ts` estos casos de D1c (los de F11a y A3 que ya tiene se quedan):

`frontend/src/features/sign-in/model/sign-out.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../../shared/api/http';
import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
import { signOut, type SignOutChoice, type SignOutProgress } from './sign-out';

function progressThat(left: number, reason = 'offline') {
  const events: string[] = [];
  const progress: SignOutProgress = {
    flushNow: async () => {
      events.push('flush');
      return left === 0 ? { kind: 'sent' } : { kind: 'left', count: left, reason };
    },
    afterSignOut: (choice: SignOutChoice) => events.push(`after ${choice}`),
  };
  return { progress, events };
}

function clientWith(replies: readonly (FakeReply | 'network-error')[]) {
  const fake = createFakeFetch(replies);
  return {
    client: createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=t' }),
    calls: fake.calls,
  };
}

const forget = async (): Promise<void> => undefined;

describe('signOut with the progress of D1c', () => {
  it('sends the queue first and, with nothing left, clears the space after the 204', async () => {
    const { client, calls } = clientWith([{ status: 204 }]);
    const { progress, events } = progressThat(0);
    expect(await signOut({ client, userId: 41, forgetContentCopy: forget, progress })).toEqual({
      kind: 'signed-out',
    });
    expect(events).toEqual(['flush', 'after discard']);
    expect(calls.map((call) => call.path)).toEqual(['/api/auth/logout']);
  });

  it('keeps what was left when no screen asks', async () => {
    const { client } = clientWith([{ status: 204 }]);
    const { progress, events } = progressThat(3);
    await signOut({ client, userId: 41, forgetContentCopy: forget, progress });
    expect(events).toEqual(['flush', 'after keep']);
  });

  it('applies the answer of the screen, and «stay» closes nothing', async () => {
    const { client, calls } = clientWith([{ status: 204 }]);
    const { progress, events } = progressThat(2);
    const asked: unknown[] = [];
    const choose = async (left: { count: number; reason: string }) => {
      asked.push(left);
      return 'stay' as const;
    };
    expect(
      await signOut({ client, userId: 41, forgetContentCopy: forget, progress, choose }),
    ).toEqual({ kind: 'stayed' });
    expect(asked).toEqual([{ count: 2, reason: 'offline' }]);
    expect(calls).toEqual([]);
    expect(events).toEqual(['flush']);
  });

  it('tells the screen when it sends the queue and when it signs out (F13 FR-030)', async () => {
    const { client } = clientWith([{ status: 204 }]);
    const { progress, events } = progressThat(0);
    const onPhase = (phase: string) => events.push(`phase ${phase}`);
    await signOut({ client, userId: 41, forgetContentCopy: forget, progress, onPhase });
    expect(events).toEqual(['phase sending', 'flush', 'phase leaving', 'after discard']);
  });

  it('discards nothing when the sign-out fails', async () => {
    const { client } = clientWith(['network-error']);
    const { progress, events } = progressThat(0);
    const outcome = await signOut({ client, userId: 41, forgetContentCopy: forget, progress });
    expect(outcome.kind).toBe('failed');
    expect(events).toEqual(['flush']);
  });
});
```

2. Corré la spec: los casos nuevos fallan (la firma no tiene `progress`, `choose` ni `onPhase`).
3. Implementá el puerto y el contexto:

`frontend/src/features/sign-in/model/sign-out.ts`:

```ts
import type { ApiClient, ApiFailure } from '../../../shared/api/http';

export type SignOutChoice = 'keep' | 'discard';

export interface SignOutLeftover {
  readonly count: number;
  readonly reason: string;
}

export interface SignOutProgress {
  flushNow(): Promise<{ readonly kind: 'sent' } | ({ readonly kind: 'left' } & SignOutLeftover)>;
  afterSignOut(choice: SignOutChoice): void;
}

export type ChooseAfterLeftover = (left: SignOutLeftover) => Promise<SignOutChoice | 'stay'>;

export type SignOutPhase = 'sending' | 'leaving';

export interface SignOutDependencies {
  readonly client: ApiClient;
  readonly userId: number;
  readonly forgetContentCopy: () => Promise<void>;
  readonly progress?: SignOutProgress;
  readonly choose?: ChooseAfterLeftover;
  readonly onPhase?: (phase: SignOutPhase) => void;
}

export type SignOutOutcome =
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'stayed' }
  | { readonly kind: 'failed'; readonly failure: ApiFailure };

const UNAUTHENTICATED = 401;
const ACCOUNT_DISABLED = 'account_disabled';

function alreadySignedOut(failure: ApiFailure): boolean {
  if (failure.kind === 'signed-out') return true;
  if (failure.kind !== 'response') return false;
  return failure.status === UNAUTHENTICATED || failure.code === ACCOUNT_DISABLED;
}

// FR-068 of D1: the queue goes before the sign-out; what stays is kept unless a screen asks.
async function choiceOf(dependencies: SignOutDependencies): Promise<SignOutChoice | 'stay' | null> {
  if (dependencies.progress === undefined) return null;
  dependencies.onPhase?.('sending');
  const flushed = await dependencies.progress.flushNow();
  if (flushed.kind === 'sent') return 'discard';
  if (dependencies.choose === undefined) return 'keep';
  return dependencies.choose({ count: flushed.count, reason: flushed.reason });
}

export async function signOut(dependencies: SignOutDependencies): Promise<SignOutOutcome> {
  const { client, userId, forgetContentCopy, progress } = dependencies;
  const choice = await choiceOf(dependencies);
  if (choice === 'stay') return { kind: 'stayed' };
  dependencies.onPhase?.('leaving');
  const result = await client.send('POST', '/api/auth/logout', undefined, { asUser: userId });
  if (!result.ok && !alreadySignedOut(result.failure)) {
    return { kind: 'failed', failure: result.failure };
  }
  if (choice !== null) progress?.afterSignOut(choice);
  await forgetContentCopy();
  return { kind: 'signed-out' };
}
```

`frontend/src/features/sign-in/ui/sign-out-progress-context.ts`:

```ts
import { createContext, useContext } from 'react';
import type { SignOutProgress } from '../model/sign-out';

export const SignOutProgressContext = createContext<SignOutProgress | null>(null);

export function useSignOutProgress(): SignOutProgress | null {
  return useContext(SignOutProgressContext);
}
```

   El índice de `features/sign-in` suma:

   ```ts
   export { SignOutProgressContext, useSignOutProgress } from './ui/sign-out-progress-context';
   export type {
     ChooseAfterLeftover,
     SignOutChoice,
     SignOutLeftover,
     SignOutPhase,
     SignOutProgress,
   } from './model/sign-out';
   ```
4. **Los dos que llaman a `signOut`.** En `SignOutSection.tsx` y en `PrivacyReacceptance.tsx`:
   - leen el puerto: `const progress = useSignOutProgress();`
   - lo pasan: `signOut({ client, userId, forgetContentCopy, progress: progress ?? undefined })` (en la reaceptación, `userId: account.id`);
   - y, antes de mirar `failed`, tratan el nuevo resultado: `if (outcome.kind === 'stayed') { setPending(false); return; }`. Sin la pregunta de F13, `stayed` no llega nunca. D1c no pasa `choose` ni `onPhase`: los pasa F13 cuando dibuje la espera y la pregunta.
   La nota de FR-052 («Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.») **no cambia en D1c**: la reemplaza F13 (su FR-034), que es quien la dibuja. Es un hallazgo: desde que U3 vincula el espacio, la nota dice algo que ya no es cierto hasta que entre F13.
5. **El proveedor.** En `AccountRoot.tsx`, lo que dibuja queda envuelto:

   ```tsx
   const progressSync = appProgressSync();
   return (
     <SignOutProgressContext value={progressSync}>
       <ProgressSyncContext value={progressSync}>{tree}</ProgressSyncContext>
     </SignOutProgressContext>
   );
   ```

   donde `tree` es lo que `AccountRoot` devolvía, con `import { appProgressSync } from '../progress-sync/app-progress-sync';`, `import { SignOutProgressContext } from '../../features/sign-in';` e `import { ProgressSyncContext } from '../../features/progress-sync';`. `appProgressSync()` crea el motor sin arrancarlo; antes de la etapa, `flushNow()` responde `sent` y `afterSignOut` no hace nada.
6. **La spec de la sección**, en el proyecto `dom`, junto a las de F11a (`frontend/src/pages/account/ui/sign-out-section.progress.spec.tsx`): dibuja `SignOutSection` con `ApiClientContext` sobre un `fetch` falso que responde 204, dentro de `SignOutProgressContext` con un puerto que registra eventos; al apretar «Salir», los eventos son `['flush', 'after discard']` y el `fetch` recibió un solo pedido, `/api/auth/logout`, después del `flush`. Usa `render`, `screen.getByRole('button', { name: 'Salir' })` y `userEvent`, como `sign-in-screen.spec.tsx` de F11a.
7. Verde: las specs de `sign-in` y de `account`, `npm run test:unit`. Checks. Commit: `feat(sign-in): send the progress queue before signing out, through a port`.

### Tarea T021 · El número de intentos vuelve a la revisión (D1c-6)

**Archivos:** `frontend/src/features/progress-sync/model/current-progress-sync.ts` (+ spec); `frontend/src/features/progress-sync/index.ts`; `frontend/src/app/progress-sync/app-progress-sync.ts`; la revisión del laboratorio: `frontend/lab.js` (`finishedReviewHTML`) o, si F7b ya la portó, su componente (detección B8).

**Produce:**

```ts
export function shareProgressSync(sync: ProgressSync | null): void;
export function currentProgressSync(): ProgressSync | null;
```

Las vistas que no viven bajo `AccountRoot` (el laboratorio legacy o su raíz de React) no ven el contexto; leen el motor por este acceso, como `progress-storage` en `shared/lib`.

**Pasos:**

1. La spec:

   ```ts
   // frontend/src/features/progress-sync/model/current-progress-sync.spec.ts
   import { afterEach, describe, expect, it } from 'vitest';
   import { currentProgressSync, shareProgressSync } from './current-progress-sync';
   import type { ProgressSync } from './types';

   afterEach(() => shareProgressSync(null));

   describe('currentProgressSync', () => {
     it('is null until the boot stage shares the engine', () => {
       expect(currentProgressSync()).toBeNull();
       const sync = { exerciseSummary: () => null } as unknown as ProgressSync;
       shareProgressSync(sync);
       expect(currentProgressSync()).toBe(sync);
     });
   });
   ```

2. Stub; falla. Implementá:

   ```ts
   // frontend/src/features/progress-sync/model/current-progress-sync.ts
   import type { ProgressSync } from './types';

   let shared: ProgressSync | null = null;

   export function shareProgressSync(sync: ProgressSync | null): void {
     shared = sync;
   }

   export function currentProgressSync(): ProgressSync | null {
     return shared;
   }
   ```

   El índice suma `export { currentProgressSync, shareProgressSync } from './model/current-progress-sync';`. En `bootProgressSync`, después de `sync.start();`, `shareProgressSync(sync);`.
3. **La línea.** A4 dejó «Revisar es parte de aprender.» sin el número (A4-Q4, `plan-a4` `d5ace3d0`, `plan.md:5357`). Vuelve el texto de antes de A4, «{N} intento(s). Revisar es parte de aprender.», con el conteo de los intentos que cuentan en la época (`attemptCount`), sólo cuando la copia tiene la fila del ejercicio; si no, queda como la dejó A4. En `lab.js`, con `import { currentProgressSync } from './src/features/progress-sync';`:

   ```js
   const attemptsOf = (id) => currentProgressSync()?.exerciseSummary(id)?.attemptCount;
   const attemptsLine = (id) => {
     const count = attemptsOf(id);
     if (count === undefined) return '';
     return `${count} intento${count === 1 ? '' : 's'}. `;
   };
   ```

   y en `finishedReviewHTML`, `Revisar es parte de aprender.` pasa a `${attemptsLine(exercise.id)}Revisar es parte de aprender.` (con el identificador del ejercicio que esa función ya recibe). Si la revisión ya es de F7b, el componente hace lo mismo con `currentProgressSync()` al dibujar.
4. **La E2E** va en `progress-sync.spec.ts` (T025): llega a la revisión terminada por el mismo camino que la E2E de A4 que afirma `ATTEMPTS_LINE` (T001 lo anota), con la foto por omisión cambiada para traer la fila del ejercicio con `attemptCount: 3`, y espera «3 intentos. Revisar es parte de aprender.». Las E2E de A4 que afirman que el número no aparece siguen en verde: la foto por omisión no trae filas.
5. Verde; checks. Commit: `feat(lab): the review shows again the attempts the server counted (D1c-6)`.

### Tarea T022 · Compuerta de U4 (K)

La compuerta de la sección 0. PR: `feat(progress-sync): import, reset, sign-out and attempts with the v2 client (D1c U4)`.

## 5. Unidad 5 · La red de E2E (dueño Q)

### Tarea T023 · El doble de la API y la traducción del almacenamiento

**Archivos:** `qa/e2e/fixtures/api-double.ts`, `qa/e2e/lib/api-contract.ts`, `qa/e2e/fixtures/storage-control.ts` y `qa/e2e/fixtures/index.ts`.

**Pasos:**

1. **`api-contract.ts`** suma la forma vacía de las áreas y, si faltan (T001), los mensajes de `account_mismatch`, `epoch_mismatch` y `client_outdated`, copiados de `backend/api/lang/es/api.php`:

   ```ts
   export const EMPTY_AREAS = {
     exercises: [],
     drafts: [],
     campaign: { seals: [], checkpoints: [] },
     workshops: { progress: [], objectives: [], steps: [] },
     route: { marks: [], quiz: [], notes: [] },
     preferences: null,
   } as const;
   ```

2. **`api-double.ts`**, al final de `installDefaults()` (después de lo de F8 y A3; nunca `query` ni otro `replyTo`):

   ```ts
   this.on('GET /api/progress', () => ({
     status: 200,
     headers: { 'Cache-Control': 'private, no-store' },
     json: {
       userId: this.account?.id ?? null,
       epoch: 1,
       revision: 0,
       resetAt: null,
       contentVersion: this.contentVersion,
       serverTime: '2026-03-04T05:06:07.000Z',
       full: true,
       ...EMPTY_AREAS,
     },
   }));
   this.on('POST /api/sync', (call) => this.upToDateSync(call));
   ```

   El `GET` reemplaza al de F8 (`this.on` pisa el manejador de la misma ruta): mismos campos, más `full` y las áreas. Y el método privado:

   ```ts
   // The account is always up to date: every operation applies, nothing comes back, and the
   // server clock follows the page clock through sentAt (F13, «Lo que F13 supone de D1c»).
   private upToDateSync(call: ApiCall): ApiReply {
     const envelope = call.body as { epoch: number; sentAt: string; knownRevision?: number; operations?: { id: string }[] };
     const operations = envelope.operations ?? [];
     return {
       status: 200,
       json: {
         epoch: envelope.epoch,
         revision: (envelope.knownRevision ?? 0) + (operations.length > 0 ? 1 : 0),
         serverTime: envelope.sentAt,
         contentVersion: this.contentVersion,
         results: operations.map((operation) => ({ id: operation.id, status: 'applied' })),
         changes: { full: false, ...EMPTY_AREAS },
       },
     };
   }
   ```

   Sin A3 en la base (B7), `this.contentVersion` es `CONTENT_VERSION`.
3. **`storage-control.ts`** recibe la cuenta de la sesión simulada y traduce. El constructor pasa a `constructor(private readonly context: BrowserContext, private readonly page: Page, private readonly accountId: number | null)`, y:

   ```ts
   const SYNC_RECORDS = ['copia', 'cola', 'copia-epoca'];

   private spaceKey(key: string): string {
     return this.accountId === null ? key : `taller-v2:${this.accountId}:${key}`;
   }

   // The stores of D1c live in the account space: older specs read their keys by the v1 name,
   // and the records of the sync are not theirs to see (research-d1c.md, R19).
   private v1Name(key: string): string | null {
     const prefix = `taller-v2:${this.accountId}:`;
     if (this.accountId === null || !key.startsWith(prefix)) return key;
     const name = key.slice(prefix.length);
     return SYNC_RECORDS.includes(name) ? null : name;
   }
   ```

   - `seed(entries)` siembra `this.spaceKey(key)` por cada clave; `seedRaw(entries: Record<string, string>)` siembra tal cual.
   - `writes()` devuelve cada `set <clave>` y `remove <clave>` con `v1Name`, y omite los que dan `null`; `rawWrites()` devuelve lo que registra `watchWrites()` sin traducir.
   - `snapshot()` hace lo mismo con las claves; `rawSnapshot()`, sin traducir.
   - `block()`, `blockWrites()` y `watchWrites()` no cambian.
4. **`fixtures/index.ts`**: `storage: async ({ context, page, sessionAccount }, use) => use(new StorageControl(context, page, sessionAccount?.id ?? null))`.
5. Corré la red entera: `npm run build && npm run test:e2e`. Lo que falle es lo del inventario de T001 (T024) o un defecto de esta tarea. Commit: `test(e2e): the API double syncs and the storage fixture speaks the account space`.

### Tarea T024 · Las ediciones aprobadas

**Archivos:** la lista de T001 que aprobó el usuario (decisión 1).

**La regla:** cada edición va en su propio commit `test(e2e): <archivo> reads the account space (D1c)`, con TDD: primero la spec editada contra la base sin D1c **falla** por la razón esperada (lee el espacio que todavía no existe) y con D1c pasa. El PR las enumera.

**Las que ya se conocen**, con su cambio exacto:

- `qa/e2e/specs/project.spec.ts:57-62`, `storedMilestones`: la clave que lee pasa a la del espacio de la cuenta de la sesión:

  ```ts
  async function storedMilestones(page: Page): Promise<string[]> {
    return page.evaluate((key) => {
      const text = localStorage.getItem(key);
      return text === null ? [] : (JSON.parse(text) as { milestones: string[] }).milestones;
    }, `taller-v2:${STUDENT.id}:${ROUTE_KEY}`);
  }
  ```

  con `import { STUDENT } from '../lib/api-contract';`.
- **El E2E de F8 que espera las claves v1 borradas después de «Borrar todo»** (`amend-cuenta` `specs/022-f8-metodo/plan.md:935-937` y `:3609-3611`): con la traducción, `storage.snapshot()` ya habla del espacio y la aserción sigue igual; lo que cambia de significado es que ahora se borra el espacio y no las claves v1. Se declara en el PR como el cambio del FR-074 enmendado. La aserción nueva sobre las claves v1 reales es la de T025.
- **`qa/e2e/lib/lab-storage.ts`** (`LAB_KEY`, `LAB_WRITE` y `SYNC_WRITES`): si alguna spec las compara con `storage.writes()`, la traducción ya las cubre; si alguna lee `localStorage` directo, se edita como `storedMilestones`.

### Tarea T025 · Los E2E de D1c

**Archivos:** `qa/e2e/specs/progress-sync.spec.ts`.

**Pasos:**

1. Escribí la spec. Usa los Page Objects que ya existen (`shell`, `project`), el doble de la API y `page.clock` para los 2 s de espera:

   ```ts
   import { expect, test } from '../fixtures';
   import { EMPTY_AREAS, STUDENT, errorBody } from '../lib/api-contract';
   import { frozenProgress } from '../lib/curriculum';
   import { urls } from '../lib/urls';

   const MILESTONE = 'Un lugar para guardar cosas';
   const SPACE = `taller-v2:${STUDENT.id}:`;
   const START = new Date('2026-10-28T12:00:00.000Z');

   function photo(overrides: Record<string, unknown> = {}) {
     return {
       userId: STUDENT.id,
       epoch: 1,
       revision: 0,
       resetAt: null,
       contentVersion: 'x',
       serverTime: START.toISOString(),
       full: true,
       ...EMPTY_AREAS,
       ...overrides,
     };
   }

   function progressKeys(snapshot: Record<string, string>): string[] {
     return Object.keys(snapshot).filter((key) => key.startsWith('taller-'));
   }

   test.describe('the v2 progress client', () => {
     test('a boot with the frozen v1 keys writes nothing to them nor to the space (FR-072)', async ({ shell, storage }) => {
       await storage.seedRaw(frozenProgress);
       await storage.watchWrites();
       await shell.goto(urls.view('proyecto'));
       expect(await storage.rawWrites()).toEqual([]);
       expect(await storage.rawSnapshot()).toEqual(frozenProgress);
     });

     test('a change goes to POST /api/sync two seconds later, with the expected account', async ({ shell, project, api, page }) => {
       await page.clock.install({ time: START });
       await shell.goto(urls.view('proyecto'));
       await project.milestone(MILESTONE).click();
       await page.clock.runFor(2_500);
       await expect.poll(() => api.callsTo('POST /api/sync').length).toBe(1);
       const call = api.callsTo('POST /api/sync')[0];
       expect(call.user).toBe(String(STUDENT.id));
       expect(call.body).toMatchObject({
         epoch: 1,
         format: 2,
         operations: [{ type: 'route.mark', kind: 'milestone', itemKey: 'rust-memory', marked: true }],
       });
     });

     test('the spaces of other accounts go when synced and stay while something is unsent (FR-069)', async ({ shell, storage }) => {
       const now = new Date().toISOString();
       await storage.seedRaw({
         'taller-v2:7:taller-learning-v1': '{"version":1}',
         'taller-v2:7:cola': JSON.stringify({ format: 1, touchedAt: now, operations: [], deferred: [] }),
         'taller-v2:8:cola': JSON.stringify({ format: 1, touchedAt: now, operations: [{ id: 'a' }], deferred: [] }),
       });
       await shell.goto(urls.view('proyecto'));
       expect(progressKeys(await storage.rawSnapshot())).toEqual(['taller-v2:8:cola']);
     });

     test('a tab left with another account stops syncing (US3, FR-065)', async ({ shell, project, api, page, pageIssues }) => {
       pageIssues.expectIssue(/status of 409/, 'the session belongs to another account now');
       api.reply('POST /api/sync', { status: 409, json: errorBody('account_mismatch') });
       await page.clock.install({ time: START });
       await shell.goto(urls.view('proyecto'));
       await project.milestone(MILESTONE).click();
       await page.clock.runFor(2_500);
       await expect.poll(() => api.callsTo('POST /api/sync').length).toBe(1);
       await project.milestone(MILESTONE).click();
       await page.clock.runFor(120_000);
       expect(api.callsTo('POST /api/sync')).toHaveLength(1);
     });

     test('the shared computer leaves no progress in the browser (SC-004)', async ({ shell, project, storage }) => {
       await storage.seedRaw({ [`taller-v2-compartida:${STUDENT.id}`]: '1' });
       await shell.goto(urls.view('proyecto'));
       await project.milestone(MILESTONE).click();
       await expect(project.milestone(MILESTONE)).toBeChecked();
       expect(progressKeys(await storage.rawSnapshot())).toEqual([`taller-v2-compartida:${STUDENT.id}`]);
     });

     test('blocked storage still says what it says today and shows the progress of the account', async ({ shell, project, storage, api }) => {
       await storage.block();
       api.on('GET /api/progress', () => ({
         status: 200,
         json: photo({ route: { marks: [{ kind: 'milestone', itemKey: 'rust-memory', marked: true, at: START.toISOString(), revision: 1 }], quiz: [], notes: [] } }),
       }));
       await shell.goto(urls.view('proyecto'));
       await expect(project.milestone(MILESTONE)).toBeChecked();
     });

     test('epoch_mismatch keeps a copy in the space and loads the new epoch (FR-075)', async ({ shell, project, api, page, storage, pageIssues }) => {
       pageIssues.expectIssue(/status of 409/, 'another device erased the progress');
       api.reply('POST /api/sync', { status: 409, json: { ...errorBody('epoch_mismatch'), epoch: 2, revision: 1 } });
       api.reply('GET /api/progress', { status: 200, json: photo() }, { status: 200, json: photo({ epoch: 2, revision: 1, resetAt: START.toISOString() }) });
       await page.clock.install({ time: START });
       await shell.goto(urls.view('proyecto'));
       await project.milestone(MILESTONE).click();
       await page.clock.runFor(2_500);
       await expect(project.milestone(MILESTONE)).not.toBeChecked();
       const copy = JSON.parse((await storage.rawSnapshot())[`${SPACE}copia-epoca`]) as { operations: unknown[] };
       expect(copy.operations).toHaveLength(1);
     });
   });
   ```

   Los textos y los ids salen de la spec de F4 (`project.spec.ts`: el primer hito y `rust-memory`) y de los contratos. El caso de «Borrar todo» (Review Focus 5) y el de la línea de intentos (T021) se suman en la misma spec con el camino de Método de F8 (`MethodPage.resetEverything()`) y el de la revisión de A4, que T001 anota; las dos aserciones son: después de «Borrar todo», `rawSnapshot()` conserva cada clave v1 sembrada con `seedRaw(frozenProgress)` y no tiene ninguna `taller-v2:41:taller-`; y en la revisión terminada se lee «3 intentos. Revisar es parte de aprender.».
2. Corré la spec contra la base de U3 sin T023: falla (el doble no responde `POST /api/sync`). Con T023, en verde.
3. Checks; commit: `test(e2e): the v2 client keeps accounts apart, syncs and leaves the v1 keys alone`.

### Tarea T026 · Compuerta de U5 (K)

La compuerta de la sección 0, con `npm run build`, el tamaño y `npm run test:e2e` entero en verde: la cuenta de T001 más los E2E nuevos, con 0 escenarios editados fuera de la lista aprobada. PR: `test(e2e): the network runs over the account space (D1c U5)`.

## 6. Unidad 6 · Documentación y cierre (K)

### Tarea T027 · La documentación

- `docs/architecture.md`: el slice `features/progress-sync` (su API pública, el contexto y el acceso compartido), `app/progress-sync` (la etapa y el armado), la vinculación de `shared/lib/progress-storage.ts`, y que los almacenes ya no leen las claves v1.
- `qa/AGENTS.md`: una fila «Sincronización del progreso (D1c)» con las specs de `features/progress-sync`, `boot-check` y `qa/e2e/specs/progress-sync.spec.ts`; y en «Red de seguridad», que desde D1c las fixtures congeladas de progreso se siembran en el espacio de la cuenta (`StorageControl.seed`) y las claves v1 reales se prueban con `seedRaw`.
- `AGENTS.md`: en «Organización», `app/progress-sync` junto a las etapas de arranque, si la sección nombra las etapas.
- Comprobá rutas, comandos y enlaces locales; `git diff --check`. Commit: `docs: the v2 progress client, its stage and its tests (D1c)`.

### Tarea T028 · El cierre

`npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e`, `git diff --check`, y el tamaño de `dist/index.html` antes y después (bajo 1 500 000). Con el stack levantado y permiso, `npm run api:sync:check` y `npm run api:import:check` (FR-087), y la verificación a mano de FR-086 que dice quickstart-d1c.md §4. El PR de cierre lleva el título `feat(progress-sync): the v2 progress client with per-account spaces (D1c)` y una descripción en inglés con el problema completo, la lista de E2E editados con su aprobación, lo que cambia de significado en la red (R19) y lo que queda para F11d y F13.

## Cobertura de requisitos

| Requisito | Tareas | Prueba principal |
| --- | --- | --- |
| FR-060 | T007, T011, T013, T016 | `create-progress-sync.spec.ts` («booting»); `progress-storage.spec.ts` |
| FR-061 | T013, T015 | `store-adapters.spec.ts` («goes through the open store») |
| FR-062 | T003, T006, T011 | `queue.spec.ts`; «joins three keystrokes» |
| FR-063 | T007, T011, T016 | «sends a change 2 s later»; «never sends more than 60 batches» |
| FR-064 | T006, T008, T011 | `queue.spec.ts` («settle»); «grades a stale answer again» |
| FR-065 | T010, T011 | «stops for good on account_mismatch»; E2E «a tab left with another account» |
| FR-066 | T011 | «refuses a photo of another account» |
| FR-067 | T007 | `account-space.spec.ts` |
| FR-068 | T011, T020 | «flushNow sends everything»; `sign-out.spec.ts` |
| FR-069 | T007, T016 | `account-space.spec.ts` (sweep); E2E «the spaces of other accounts» |
| FR-070 (enmendado) | T011, T013, T016 | «shared computer»; `progress-storage.spec.ts`; E2E «the shared computer» |
| FR-071 | T011 | «on epoch_mismatch keeps a copy»; `downloadUnsent` |
| FR-072 | T008, T011, T017, T025 | `v1-import.spec.ts` (`archiveV1`); `boot-check` D1c; E2E «a boot with the frozen v1 keys» |
| FR-073 | T008, T011 | «offers the v1, imports it on a yes»; «asks again on import_needs_confirmation» |
| FR-074 (enmendado) | T019, T024, T025 | `with-progress-sync.spec.ts`; E2E de «Borrar todo» |
| FR-075 | T011, T025 | «on epoch_mismatch keeps a copy»; E2E |
| FR-076 | T010, T011 | «stops on a 401»; «waits for Retry-After»; «client_outdated» |
| FR-077 (ampliado) | T003, T011 | contracts/sync-client-d1c.md §2 a §4; la spec del motor |
| FR-078 | T011 | «reports the clock skew» |
| FR-079 | T001 | La compuerta B4 (A4 en la base) |
| FR-085 | T002 a T011 | Las specs de Vitest (los checks de TypeScript del cliente) |
| FR-086 | T025, quickstart-d1c.md §4 | E2E y la verificación a mano de dos cuentas |
| FR-087, FR-088 | T028 | El cierre |
| SC-004 | T025 | E2E «the shared computer»; «a tab left with another account» |
| SC-008 (cliente) | T011 | «waits for Retry-After»; «never sends more than 60 batches» |
| SC-011 (cliente) | T026, T028 | Las compuertas |

## Descargas y permisos

Ninguna descarga: D1c no suma paquetes de npm ni de Composer. Los permisos que pide son los de siempre: levantar el stack para `api:sync:check` y `api:import:check` (T028), y la aprobación de la lista de E2E editados (decisión 1).

## Riesgos y lo que quedó sin verificar

1. **La base no existe todavía.** F11a completa, A3, A4 y F8 son planes o ramas sin mergear: T001 detiene la unidad si una firma no coincide. Las firmas de F11a salen de `impl-f11a` (`a7b3c71d`); las de A3, A4 y F8, de sus planes enmendados.
2. **La red de E2E cambia de significado (R19).** Con la traducción, los E2E congelados de F1 ejercitan el espacio de la cuenta. Mitigación: las claves v1 reales tienen sus E2E propios (T025), y la lista de lo editado la aprueba el usuario.
3. **Los textos duplicados** (la forma v1 y la copia) pueden llenar `localStorage` en un caso extremo (R4). Mitigación: el respaldo en memoria con `mode: 'blocked'` (Review Focus 2).
4. **Una vista legacy no se vuelve a dibujar** cuando llega un delta a mitad de la sesión: el estado cambia en el almacén y se ve en el próximo dibujo. Es lo que pasa hoy entre pestañas (ADR 0003). La foto del arranque llega antes de que las vistas existan (R8).
5. **Mientras corre el «Borrar todo» propio,** un cambio que el alumno haga en otra parte de la pestaña no se encola (`withoutEnqueuing`). La confirmación de F8 es modal y no se cierra mientras espera, así que el caso es raro y lo que se escribiera iba a borrarse.
6. **Sin corrida real:** `boot-check`, los E2E, las entidades, la integración con `main.tsx` y todo contra el stack. Lo que corrió está en el encabezado.

## Hallazgos para otros ítems

Van con su detalle en el informe del coordinador:

- **F13:** dibuja «Salir» con la interfaz de T020 (`onPhase`, `choose`, `downloadUnsent()`); la nota de FR-052 deja de ser cierta desde U3 hasta que F13 la reemplace.
- **F11d:** el «registro» de los datos locales de la cuenta no existe (F11d llama a `enterSharedMode()` y a `forgetContentCopy()`); `afterPublish` de A3 no debe escribir la copia en el modo compartido (F11d-1).
- **F8:** la importación de Método ya no es local y no muestra espera; `busy` está para quien la dibuje.
- **F13:** `clockSkewMs` sale sólo de la sincronización; `flushNow` suma dos motivos (`outdated` y `account-changed`); `ownReset` siempre llega con `copy: null`.
- **A4:** el hallazgo 7 no necesita código en D1c (R21).
- **La hoja de ruta del front:** D1c usa `progressStage` entre `contentGate` y `legacyViews`, y la entrada en servicio va con F11d.

## Complexity Tracking

| Qué | Por qué hace falta | Lo más simple que se descartó |
| --- | --- | --- |
| Un estado de módulo en `shared/lib/progress-storage.ts` | Es el único lugar donde se decide dónde persiste el progreso sin cambiar a los cuatro que abren los almacenes (R2) | Pasar el almacenamiento a cada `open` e `init`: seis archivos, y cada port lo tendría que repetir |
| La copia del servidor además de la forma v1 | FR-060 pide los relojes y las lápidas, y http.md §7 la fusión fila por fila (R4) | Sólo la forma v1: no tiene relojes ni lo que el contenido viejo no conoce |
| Dos `fetch` fuera de `ApiClient` | El 304, el ETag y `keepalive` (R10), como hizo A3 | Agrandar `ApiClient`, que usan cuatro ítems |
