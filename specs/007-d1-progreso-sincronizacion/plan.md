# Implementation Plan: D1a · Sincronización del servidor

**Branch**: `007-d1-progreso-sincronizacion` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-d1-progreso-sincronizacion/spec.md`, en su primera parte, **D1a** (ver «Decisiones del usuario»). Decisiones: [research.md](./research.md). Tablas y tipos: [data-model.md](./data-model.md). Contratos: [HTTP](./contracts/http.md) y [fusión y fixture](./contracts/merge-rules.md). Código verificado: [reference-merge.md](./reference-merge.md). Validación: [quickstart.md](./quickstart.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completa la sección de tu dueño, «Reglas para todos los agentes» y los documentos de arriba que toquen tu tarea. `tasks.md` tiene una línea por tarea (T001…) y remite acá.
>
> **Estado.** Planificado, **sin implementar**. El usuario respondió el clarify de D1 el 2026-10-06 (ver «Decisiones del usuario»). La implementación espera la aprobación del ADR 0006, que sigue en propuesta.
>
> **Línea base del código.** `master` más C6 (PR #17: los registros tipados y PHPStan en el nivel 9), **C3a entregada** (rama `feat/c3a-identidad`: la sesión, los grupos `account` y `verified`, `WriteTransaction`, `Browser`, los errores con código, los límites, `scheduler` y `lang/es`) y **B2 integrada como mínimo hasta su punto S1** (spec 005, rama `spec/b2-ejecuciones`: `progress_heads` y `exercise_progress` completas, `AccountLock`, `ProgressHead`, `Instant`, el cierre de ejecuciones, `RunWorld`, `Parallel` y la línea del Dockerfile que copia `qa/fixtures/shared/`). La línea de B2 se leyó de su plan y no del código, que todavía no existe: T001 la confirma. Las rutas de abajo son las de esa base.
>
> **Código verificado y sin ejecutar.** Se planificó sin PHP, sin Composer y sin Docker. **Corrió** el TypeScript (el módulo de fusión, el fixture, su check, la comparación del id de etapa y las mediciones del contenido: [reference-merge.md](./reference-merge.md) y R22). **No corrió** nada del PHP, del SQL ni de Nginx: son referencia, y obligan las firmas, los contratos y las pruebas. «Lo que quedó sin verificar» lista lo que hay que medir al implementar.

## Summary

D1a es la mitad servidor de D1: el servidor guarda la copia durable del progreso de cada alumno y **fusiona campo por campo** lo que llega de cada dispositivo. Entrega `POST /api/sync` (un lote de operaciones con UUID, idempotente, que responde un resultado por operación y lo que cambió), `GET /api/progress` (la foto de la cuenta, con validador), diez tablas, la regla de fusión escrita una sola vez en un fixture que corren Pest y TypeScript, y el id de cada etapa de taller en el contenido. El enfoque:

- **Una sola regla, dos lenguajes, un fixture.** 25 tipos de campo y 277 casos escritos a mano (más 43 del servidor) en `qa/fixtures/shared/`, congelados con una huella. PHP los corre contra el SQL real; TypeScript, contra un módulo puro que D1c monta después. Once mutaciones del código (ocho en TypeScript, nueve en PHP y una por HTTP) tienen que romper el fixture (merge-rules.md, sección 9).
- **El SQL decide y estampa.** Cada operación es un `INSERT … ON DUPLICATE KEY UPDATE` cuya primera asignación sube la revisión **sólo si la fila cambia**. Así el delta (`revision` mayor que la conocida) trae exactamente lo que cambió, y un lote sin efecto no mueve nada. La guarda compara los textos en binario, porque la colación de la conexión iguala `Casa` y `casa`.
- **Todo bajo el candado de la cuenta.** `AccountLock` de B2 serializa la sincronización, el cierre de ejecuciones y, después, la importación y el reset. Las referencias al contenido y los rangos se comprueban **antes** de abrir la transacción: una clave foránea no puede fallar por contenido que falta.
- **Un lector para todo.** `ProgressSnapshotReader` arma la foto de `GET /api/progress`, el `changes` de la sincronización y la exportación del titular (C3b); no abre una transacción propia dentro del candado.
- **El contenido publica el id de cada etapa** con un cambio que se comprueba byte a byte: cuatro porciones y `Content-Version` cambian, y nada más.
- **Cada dueño trabaja en sus archivos.** Lo que se comparte con C3a y B2 son líneas de integración del coordinador. Las rutas de D1a viven en dos archivos propios de `routes/api/`.

## Decisiones del usuario

El usuario respondió el clarify de D1 el 2026-10-06: aceptó la partición en tres y la opción recomendada en cada una de las cuatro preguntas. Las respuestas están en [spec.md](./spec.md), «Clarifications», sesión del 2026-10-06; acá se anota cómo llegan a D1a.

**1. La partición está confirmada.** D1 se parte en tres, con el corte de la spec: D1a (sincronización del servidor), D1b (importación y reset) y D1c (cliente v2). Este plan es el de **D1a**: FR-001 a FR-023, FR-046 a FR-059 y FR-080 a FR-084; las rutas `POST /api/sync` y `GET /api/progress`; sus diez tablas (`sync_operations`, `drafts`, `campaign_checkpoints`, `workshop_progress`, `workshop_observations`, `workshop_step_marks`, `route_marks`, `route_quiz_answers`, `route_notes` y `preferences`); y FR-087 y FR-088, que repite cada parte. D1b y D1c tendrán su propio plan.

**2. D1a no depende de ninguna de las cuatro preguntas.** Las cuatro quedaron decididas con la opción A:

| Pregunta | Respuesta del usuario | Qué cambia para D1a |
| --- | --- | --- |
| Q1, importación por navegador | A: por navegador, varias por cuenta, combinables y con confirmación | Nada: es de la ruta de importación (D1b). D1a deja el escritor listo para un reloj nulo |
| Q2, alcance de «Borrar todo» | A: sólo el estado; los intentos, sus payloads y las importaciones quedan hasta su retención | Nada: es del reset (D1b). D1a sólo declara qué tablas son de estado |
| Q3, qué se hace al salir | A: se envía la cola y se limpia el espacio; el ingreso ofrece «computadora compartida»; los espacios vencen a los 30 días | Nada: es del cliente (D1c) |
| Q4, lo resuelto antes de A4 | A: el cliente (D1c) entra en servicio después de A4; D1a y D1b, no | Nada: el servidor rechaza con `invalid` toda operación que quiera escribir «resuelto» (FR-009), que es lo que la A confirma. D1a no espera a A4 |

## Propuestas del plan

Lo que sigue es del plan y no se le preguntó al usuario: decisiones sobre lo que la spec o el ADR dejan abierto, y lo que D1a supone de otros ítems. Cada una se cambia en un lugar y ninguna mueve la partición.

**3. Requisitos de D1a que cruzan la frontera.** La tabla de partición de la spec asigna rangos, y algunos requisitos del rango de D1a tocan lo de D1b o de C3b. Se parten así, y ninguno se entrega a medias en silencio:

| Requisito | D1a entrega | Lo cierra |
| --- | --- | --- |
| FR-051, SC-009 (las 12 tablas) | Las 10 de D1a, sin alterar las de B2 | D1b: `progress_imports` y `campaign_seals` (migraciones 100011 y 100012, reservadas) |
| FR-053 (supresión y exportación) | `ON DELETE CASCADE` en las diez, la prueba de `DELETE FROM users` y su declaración para `UserData` (data-model.md, sección 7) | C3b: `UserData`. D1b: la búsqueda de punteros cruzados del import |
| FR-055 (podas) | `sync_operations` a los 14 días | D1b: `raw_payload` a los 90 días |
| FR-056 (operación) | La ubicación de Nginx de `/api/sync` (2 MiB) y el limitador `sync` (60 por minuto) | D1b: la ubicación de `/api/progress/import` (24 MiB), `post_max_size` de PHP y los limitadores de importación y reset |
| FR-057 (cuenta y logs) | Las dos rutas de D1a | D1b: las dos suyas |
| FR-058 (formato N-1) | El del sobre de `/api/sync` | D1b: el del suyo |
| FR-084 (pruebas de la API) | Las reglas con el fixture, la idempotencia, la matriz de acceso, los límites de sincronización, el esquema de las diez tablas y la concurrencia de dos lotes y de un lote contra un cierre de B2 | D1b: la importación, el reset y sus concurrencias |
| SC-002 | El fixture, Pest y TypeScript (puro) | D1c: el cliente que corre los mismos casos con su cola |
| SC-008, SC-010 | La 61.ª sincronización, el 413, las 201 operaciones y la medición de la sincronización | D1b: importación y reset |

**4. La fusión en TypeScript entra en D1a** (opción A de R1). La tabla de partición de la spec le asigna a D1a «PHP y SQL (Pest) y el check del generador», pero el pedido es un fixture «que corren TypeScript y Pest», y sin un lector en TypeScript el formato se congelaría sin que nada lo haya leído. D1a suma un módulo puro (`frontend/src/features/progress-sync/model/`), su check de `npm test` y una lista de hitos del recorrido. Si el usuario prefiere que la mitad TypeScript de SC-002 sea de D1c, se quita T006 y, de T005, la parte que corre los casos: el resto no cambia. **Es un hallazgo para D1c** (la carpeta, el nombre y la API pública son provisionales).

**5. Decisiones de este plan sobre lo que la spec o el ADR dejan abierto.** Cada una está en [research.md](./research.md) y se cambia en un lugar: `format` vale `2`; hasta 200 operaciones por lote; instantes ISO 8601 con milisegundos; el piso de reloj 2020-01-01 (R5 y R7); en las fechas que sólo crecen, `NULL` es «desconocida» (R6); `duplicate` echa el `reason` original (R8); `stale_content` vale también para el quiz (R9); los estados de una prueba aprobada van como `current`, `changed` y `legacy`, y la foto lleva `userId` y `full` (R10); `campaign.seals` es `[]` hasta D1b; los hitos del recorrido son una lista de PHP atada a un archivo (R15); y el bloque de migraciones es `2026_10_06_100001` a `100099` (R13).

**6. Dependencias.** D1a parte de C3a (entregada) y de B2 (planificada, con PR #22). El ADR 0006 sigue en propuesta: las decisiones D22 a D25, D36 y D39 son su base, y si el usuario las enmienda, cambia el plan.

## Technical Context

**Language/Version**: PHP 8.5 (FPM) y Laravel 13.x en `backend/api/`, sin sintaxis posterior a PHP 8.3 y sin `declare(strict_types=1)`; TypeScript 6.0 con Node 24 en `frontend/src/` y `qa/`.

**Primary Dependencies**: ninguna nueva, ni de Composer ni de npm (FR-059). Usa el cliente de MySQL, el limitador y el planificador de Laravel, Larastan y Pest, ya instalados.

**Storage**: MySQL 9.7. Diez tablas nuevas ([data-model.md](./data-model.md)) en el bloque de migraciones `2026_10_06_100001` a `100099`; `progress_heads` y `exercise_progress` son de B2 y no se alteran.

**Testing**: Pest contra MySQL real (`npm run api:test`), con las suites `Unit`, `Feature`, `Content` (el DDL y el import confirman sus propias transacciones) y `Concurrency` (de B2: procesos PHP en paralelo); PHPStan en el nivel 9 sin baseline (`npm run api:analyse`) y Pint. En TypeScript, los checks de `qa/` (`npm test`). Contra el stack levantado: `npm run api:smoke`, `npm run api:content:check` y el nuevo `npm run api:sync:check`.

**Target Platform**: Docker Compose en un servidor, Linux o macOS. Cada dueño usa su propio `COMPOSE_PROJECT_NAME`.

**Project Type**: servicio web (API Laravel) con Nginx delante, más un módulo puro de TypeScript.

**Performance Goals**: sin un objetivo que cumplir: SC-010 es una medición (el tamaño de la foto de 274 ejercicios con intento, el del lote mayor, y la mediana y el p95 de `POST /api/sync` con 30 cuentas a la vez). Lo que el diseño cuida: una operación son de una a tres sentencias, un 304 de la foto lee dos filas y las cuentas no se esperan entre sí.

**Constraints**:

- sin paquetes de Composer ni de npm, y sin descargas;
- los textos llegan intactos (ningún recorte ni conversión de `''`);
- los resultados esperados del fixture, escritos a mano y congelados;
- una revisión por transacción que cambia algo, y sólo «Borrar todo» (D1b) borra filas;
- las demás porciones de contenido (13 sobre `master`, 14 con la plantilla del harness de B2), los 274 ejercicios y `qa/fixtures/workshop-steps-v1.json` no cambian un byte por D1a;
- nivel 9 sin baseline ni `@phpstan-ignore`; sin comentarios salvo lo que la complejidad exija.

**Scale/Scope**: 2 rutas, 16 operaciones, 25 tipos de campo, 10 tablas (91 columnas, 18 claves foráneas), 277 casos de fusión y 43 del servidor; unos 60 archivos en `backend/api/app/`, 10 migraciones y unos 45 archivos de prueba; en TypeScript, 2 módulos y 3 checks. 20 tareas en cuatro ondas (de la 0 a la 3).

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.3.1). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `backend/api/AGENTS.md` (Collections y `Arr::`, Pest contra MySQL real, un `CREATE TABLE` por migración, `env()` sólo en `config/`) y `qa/AGENTS.md` (los checks de `qa/` son TypeScript y se suman a `qa/run-checks.ts`). T019 actualiza esas guías, `README.md` y `docs/architecture.md` en el mismo cambio. |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con sus pruebas, que fallan por la razón que dice el paso. Los esperados salen de afuera del código probado: las tablas de verdad de merge-rules.md, las listas de columnas del ADR, los valores medidos del contenido y los códigos de http.md. El fixture se escribe a mano, se congela y no se regenera; once mutaciones lo prueban. No hay mocks de la implementación: el contenido y la base son reales, y la concurrencia es real, con procesos. |
| III. Código entendible | Sí, con revisión | Clases chicas con nombre y contrato. Para revisar por cohesión y complejidad: `OperationDecoder` (dieciséis tipos) y `UpsertSql` (siete formas) pueden pasar de 10 caminos y se revisan por su tabla de pruebas, no se fragmentan por una cuota; `SyncService` es una secuencia con nombre de pasos. |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | Publicar el id de etapa es el único cambio de contenido, medido byte a byte; los IDs son inmutables y no se reutilizan. Ninguna operación borra una fila de estado, y lo retirado se lee y se acepta. |
| V. Capas y contratos explícitos | Sí | Dominio (`app/Progress/`), transporte (`app/Http/`), operación (`app/Console/`) y contratos (`contracts/`), con las firmas entre dueños fijadas en data-model.md. El módulo de TypeScript no tiene interfaz. Ninguna capa, store ni framework nuevo; los dos puertos (`OperationProcessor` y `ChangesReader`) existen porque dos dueños los usan a la vez. |
| VI. Español, accesibilidad y portabilidad | Sí | Documentos y mensajes de la API en español rioplatense; código, pruebas y comentarios en inglés. No hay interfaz. Los scripts son POSIX y portables; el módulo no usa nada del navegador. |
| VII. Secretos y salidas generadas fuera de Git | Sí | No hay secretos ni rutas locales. `build/` sigue ignorado. El fixture es un valor esperado de prueba y se versiona a propósito, con su huella. Sin dependencias nuevas. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit; lo que falte lo agrega `/speckit-converge`. Al entregar, el directorio queda inmutable, y un cambio posterior (la importación, el cliente) es la spec de su parte. |

## Project Structure

### Documentation (this feature)

```text
specs/007-d1-progreso-sincronizacion/
├── spec.md                  # qué y por qué (D1 entero; esta planificación es D1a)
├── research.md              # decisiones R1 a R22 y cómo se verificaron
├── data-model.md            # las diez tablas, la forma de los upserts y los tipos entre dueños
├── contracts/
│   ├── http.md              # POST /api/sync, GET /api/progress, las operaciones y la foto
│   └── merge-rules.md       # las reglas de fusión, los 25 tipos de campo y el fixture compartido
├── reference-merge.md       # el TypeScript que se ejecutó al planificar
├── quickstart.md            # escenarios de validación con sus comandos
├── plan.md                  # este archivo: cómo, repartido en dueños
├── tasks.md                 # una línea por tarea
└── checklists/requirements.md
```

### Source Code (repository root)

```text
backend/api/
├── app/
│   ├── Progress/            (B2: ProgressHead, AccountLock, AccountGone)
│   │   ├── ProgressTables.php, ContentNotImported.php, ProgressAreas.php, ChangesReader.php   (S)
│   │   ├── Operations/      (M) OperationType, Rule, FieldKinds, Operation, Decoded, Checked, Applied, OperationDecoder,
│   │   │                    OperationHash, RouteMilestones, ContentLookup, OperationProcessor, DatabaseOperationProcessor
│   │   ├── Merge/           (M) UpsertSql, OperationWriter
│   │   ├── Snapshot/        (L) ProgressSnapshotReader, ProgressEtag, ProofState, Snapshot, NotModified
│   │   ├── Sync/            (Y) SyncRequest, SyncService, SyncOutcome, OperationResult, ResultStatus, ClockCorrection,
│   │   │                    OperationRegistry, EpochMismatch, ClientOutdated, SyncWriteFailed
│   │   └── SyncOperationsPruner.php                              (O)
│   ├── Console/Commands/PruneSyncOperations.php                  (O)
│   ├── Http/Controllers/    SyncController (Y), ProgressController (L)
│   ├── Http/Requests/SyncBodyRequest.php, Http/ProgressLimiters.php   (Y)
│   └── Content/Record/WorkshopStep.php                           (C, cambia)
├── config/progress.php                                           (S)
├── database/migrations/     2026_10_06_100001 … 100010 (S)
├── routes/api/              sync.php (Y) y progress.php (L)
└── tests/                   Unit/Progress/, Feature/Progress/, Content/ (esquema y D32), Concurrency/, Support/ (ProgressWorld,
                             ProgressInvariants, MergeKinds, MergeFixture, Sync/Fake*)
frontend/src/features/progress-sync/model/  merge-rules.ts, field-kinds.ts                          (F)
qa/                      merge-fixture-check.ts, route-milestones-check.ts, api-sync-check.ts (nuevos); lib/merge-fixture.ts;
                         fixtures/shared/{merge-cases.json,merge-cases.sha256,route-milestones.json};
                         content-records-check.ts, curriculum-meta-check.ts, nginx-api-blocks-check.ts, run-checks.ts (cambian)
tools/content/workshops.ts                                    (C, cambia)
docker/nginx/nginx.conf  backend/api/scripts/smoke.sh  package.json
README.md  backend/api/AGENTS.md  docs/architecture.md  qa/AGENTS.md  AGENTS.md                    (T019)
```

**Structure Decision:** el dominio vive en `app/Progress/`, que B2 abrió para la cabecera, dividido por responsabilidad (operaciones, fusión, lectura y sincronización) y con un solo dueño por carpeta; el transporte, en `app/Http/`, con un controlador por ruta y un archivo de rutas por dueño (como C3a y B2: dos dueños no editan el mismo archivo). El módulo de TypeScript va en una carpeta de feature con el nombre que D1c le dará a su cliente; no tiene `index.ts` hasta que haya un consumidor fuera del check.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo:

- **La guarda de la revisión y las filas afectadas.** Las dos primeras asignaciones de cada upsert son `revision` y `updated_at`, antes de los valores y de los relojes (si fueran después, la guarda ya vería lo nuevo y nunca estamparía); el efecto sale de las filas afectadas (0, 1 o 2), que `AffectedRowsTest` prueba contra MySQL 9.7. Es el riesgo central del plan y lo ejercen las mutaciones M6 y M9.
- **Textos en binario.** La guarda compara con `CAST(… AS BINARY)` (el operador `BINARY` está deprecado en MySQL 9.7); la colación de la conexión iguala `Casa` y `casa`. Sin eso, una reflexión que sólo cambia de mayúsculas cambia la fila y no la revisión (M10).
- **Los textos llegan intactos.** `/api/sync` está excluida de `TrimStrings` y de `ConvertEmptyStringsToNull` (línea de integración de `bootstrap/app.php`), y una prueba de HTTP lo exige con `''` y con espacios (M11): el fixture del escritor no la ve.
- **`within` puede repetirse hasta tres veces.** Lo que arma `applyBatch` (resultados, filas leídas, el registro) se rehace en cada intento; nada sale afuera de la transacción, y el log y la conversión de `QueryException` van después.
- **Referencias y rangos antes de escribir.** El contenido se comprueba fuera del candado, y lo que existe al comprobar existe al escribir (el contenido nunca se borra). Una clave foránea no puede fallar durante el lote.
- **La foto y el delta.** Un solo lector: `GET` lo envuelve en una transacción de sólo lectura en REPEATABLE READ y la sincronización lo llama adentro del candado; leerlo no escribe nada, ni siquiera la cabecera. La foto de una revisión más el delta hasta la siguiente es igual a la foto completa (SC-006).
- **Lo que no es de D1a no cambia.** Ninguna sentencia nombra las columnas de B2 ni las de la importación de `exercise_progress`; una prueba compara la fila antes y después de cada tipo de operación.
- **El fixture.** Esperados a mano desde merge-rules.md, huella en `merge-cases.sha256`, nunca regenerado; el registro de tipos de campo de PHP y el de TypeScript son iguales al del fixture; y las mutaciones se aplican de verdad antes de cerrar T006 y T010.
- **Los registros.** Ninguno lleva borradores, reflexiones, notas ni valores de una operación; una `QueryException` trae esos valores en sus bindings, y `SyncService` la convierte en `SyncWriteFailed` sin SQL ni `previous`.
- **El id de etapa.** El cambio es sólo el del documento (y el volcado) que dice quickstart.md, escenario 1; el primer import escribe exactamente 100 filas más un registro de `content_imports`; `WorkshopStep` rechaza un `id` distinto del del meta.
- **Nivel 9.** Sin baseline, `ignoreErrors`, `@phpstan-ignore` ni casts de `mixed`: las filas entran por registros y las operaciones, por `Operation`.
- **Complejidad.** `OperationDecoder` y `UpsertSql` pueden pasar de 10 caminos: se revisan por su tabla de pruebas y por pasos con nombre, no se fragmentan por una cuota.

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos. Un mismo agente puede llevar varias colas si no corren a la vez. Lo que D1a comparte con C3a y con B2 no lo toca ningún dueño: son las **líneas de integración** de abajo, que el coordinador pone al integrar.

**Ondas.** D1a parte de C3a entregada y de B2 hasta su punto S1.

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | Coordinador | T001: la línea de base, las reservas y los worktrees |
| 1 | S, F, C y M, a la vez (desde S0) | **S**: T002 a T004, el esquema, la configuración y el mundo de pruebas. **F**: T005 y T006, el fixture, su check y el módulo de fusión en TypeScript. **C**: T007 y T008, el id de etapa. **M**: T009, el catálogo de operaciones, la decodificación y las reglas SQL, puros |
| 2 | M, L, Y y O, a la vez (desde S1) | **M**: T010, el procesador contra la base y el fixture. **L**: T011, la foto y el delta. **Y**: T012 y T013, el servicio de sincronización y su HTTP. **O**: T014, la poda |
| 3 | Coordinador y O (desde S2) | **Coordinador**: T015 a T017, las líneas de integración, las pruebas de punta a punta y Nginx. **O**: T018, el check con el stack. **Coordinador**: T019 y T020, la documentación y la compuerta |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| Coordinador | `backend/api/bootstrap/app.php`, `backend/api/app/Providers/AppServiceProvider.php`, `backend/api/app/Http/ApiCode.php`, `backend/api/lang/es/api.php`, `backend/api/tests/Unit/ApiCodeTest.php`, `backend/api/routes/console.php`, `backend/api/tests/Feature/ScheduleTest.php`, `backend/api/tests/Feature/Progress/{WiringTest,SyncEndpointTest,ServerCasesTest,SnapshotDeltaTest,LogsWithoutTextTest,SyncAccessMatrixTest,SyncThrottleTest,TextFidelityTest}.php`, `backend/api/tests/Concurrency/SyncConcurrencyTest.php`, `docker/nginx/nginx.conf`, `qa/nginx-api-blocks-check.ts`, `backend/api/scripts/smoke.sh`, `package.json`, `README.md`, `backend/api/AGENTS.md`, `AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md`, `specs/backend-multiusuario/roadmap.md`, el registro `UserData` de C3b si existe | todo | la línea de base, el cableado, las pruebas de punta a punta, Nginx, la documentación y la evidencia de cierre |
| S · Esquema y base de pruebas | `backend/api/database/migrations/2026_10_06_1000NN_*.php` (diez), `backend/api/config/progress.php`, `backend/api/app/Progress/{ProgressTables,ContentNotImported,ProgressAreas,ChangesReader}.php`, `backend/api/tests/Support/{ProgressWorld,ProgressInvariants}.php`, `backend/api/tests/Feature/Progress/{SchemaTest,ProgressWorldTest}.php`, `backend/api/tests/Content/{ProgressMigrationsTest,ProgressEnumFkTest}.php`, `backend/api/tests/Unit/Progress/{ProgressConfigTest,ProgressAreasTest}.php` | de C3a: la fábrica de usuarios, `UserIdForeignKeyTest`; de B2: las dos tablas, `RunWorld`, `RunInvariants` | las diez tablas, la configuración, `ProgressTables`, `ContentNotImported`, `ProgressAreas` y `ChangesReader` (los tipos que comparten L e Y), `ProgressWorld` y `ProgressInvariants` |
| F · Fixture y fusión en TypeScript | `qa/fixtures/shared/{merge-cases.json,merge-cases.sha256,route-milestones.json}`, `qa/lib/merge-fixture.ts`, `qa/merge-fixture-check.ts`, `qa/route-milestones-check.ts`, `qa/run-checks.ts`, `frontend/src/features/progress-sync/model/{merge-rules,field-kinds}.ts` | — | el fixture congelado, su lector, su check, el módulo puro y los hitos |
| C · Contenido: el id de etapa | `tools/content/workshops.ts`, `qa/content-records-check.ts`, `qa/curriculum-meta-check.ts`, `backend/api/app/Content/Record/WorkshopStep.php`, `backend/api/tests/Unit/Record/WorkshopRecordsTest.php`, `backend/api/tests/Unit/ContentRoundTripTest.php`, `backend/api/tests/Support/ContentFixture.php`, `backend/api/tests/Content/ImportContentTest.php` | de C6: `WorkshopStep`, `StepKey`, `ContentFixture` | las etapas con su `id`, publicadas y servidas |
| M · Operaciones y fusión | `backend/api/app/Progress/Operations/`, `backend/api/app/Progress/Merge/`, `backend/api/tests/Unit/Progress/{Operations,Merge}/`, `backend/api/tests/Feature/Progress/Merge/`, `backend/api/tests/Support/{MergeKinds,MergeFixture}.php` | de S: las tablas y `ProgressWorld`; de F: el fixture | `OperationProcessor` y su implementación, `FieldKinds`, `RouteMilestones`, `UpsertSql` y el escritor |
| L · Lectura | `backend/api/app/Progress/Snapshot/`, `backend/api/app/Http/Controllers/ProgressController.php`, `backend/api/routes/api/progress.php`, `backend/api/tests/Feature/Progress/Snapshot/` | de S (las tablas, `ProgressAreas`, `ChangesReader`) y de B2 (los intentos); de C3a: `account`, `verified`, `Browser` | `ChangesReader`, `ProgressSnapshotReader` y `GET /api/progress` |
| Y · Sincronización y su HTTP | `backend/api/app/Progress/Sync/`, `backend/api/app/Http/Controllers/SyncController.php`, `backend/api/app/Http/Requests/SyncBodyRequest.php`, `backend/api/app/Http/ProgressLimiters.php`, `backend/api/routes/api/sync.php`, `backend/api/tests/Unit/Progress/Sync/`, `backend/api/tests/Feature/Progress/Sync/`, `backend/api/tests/Support/Sync/{FakeOperationProcessor,FakeChangesReader}.php` | de S (las tablas, `ChangesReader`, `ProgressAreas`, `ContentNotImported`), de M (`OperationProcessor`), de B2 (`AccountLock`, `Instant`) y de C3a (`ApiError`, `Browser`); prueba con falsos de los dos puertos | `SyncService`, `ClockCorrection`, el registro de UUID y `POST /api/sync` |
| O · Operación | `backend/api/app/Progress/SyncOperationsPruner.php`, `backend/api/app/Console/Commands/PruneSyncOperations.php`, `backend/api/tests/Feature/Progress/PruneSyncOperationsTest.php`, `qa/api-sync-check.ts` | de S: `sync_operations`; de C3a: `qa/lib/api-account.ts` | la poda y el check de punta a punta |

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 integrado. S, F, C y M parten de ahí.
- **S1:** T002 a T006 y T009 integrados (el esquema, la configuración, el mundo de pruebas, el fixture, el módulo de TypeScript y las operaciones puras). M (T010), L, Y y O parten de ahí. **C (T007 y T008) va junta y se integra cuando termina**, en S1 o en S2: ningún otro dueño depende de ella, y su rama no se lleva a `master` a medias (con T007 sola, la suite de contenido de la API queda en rojo).
- **S2:** T010 a T014 integrados. El coordinador cablea y cierra la integración.
- **S3:** T015 a T017 integrados y el stack levantado. O (T018) parte de ahí, y de T024 de C3a (`qa/lib/api-account.ts`): si todavía no está, T018 espera.
- **Cierre:** T018 a T020.

**Líneas de integración** (las pone el coordinador al integrar; ningún dueño toca esos archivos). **D1a no toca `routes/api.php`**: sus dos rutas viven en `routes/api/sync.php` y `routes/api/progress.php`, y la línea es la de `bootstrap/app.php`.

| Cuándo | Archivo | Línea o cambio |
| --- | --- | --- |
| T001 | `backend/api/app/Http/ApiCode.php`, `lang/es/api.php`, `tests/Unit/ApiCodeTest.php` | dos casos: `EpochMismatch` (`epoch_mismatch`, 409) y `ClientOutdated` (`client_outdated`, 409), con los mensajes de [http.md](./contracts/http.md), sección 6, y su fila en la prueba |
| T015 | `backend/api/bootstrap/app.php` | `withRouting(api: [...])` suma `routes/api/sync.php` y `routes/api/progress.php` (un archivo que no existe se omite). Y `/api/sync` entra en las excepciones de `$middleware->trimStrings(except: [fn (Request $request) => $request->is('api/sync')]);` y de `convertEmptyStringsToNull`, como `/api/runs` en B2 (R12) |
| T015 | `backend/api/app/Providers/AppServiceProvider.php`, en `register()` | `$this->app->bind(OperationProcessor::class, DatabaseOperationProcessor::class);` y `$this->app->bind(ChangesReader::class, ProgressSnapshotReader::class);` |
| T015 | ídem, en `boot()` | `ProgressLimiters::register();` (junto a `Limiters::register();` de C3a y `RunLimiters::register();` de B2) |
| T015 | `backend/api/routes/console.php` y `tests/Feature/ScheduleTest.php` | `Schedule::command('progress:prune-sync-operations')->hourly()->withoutOverlapping();` y la tarea en la lista exacta que esa prueba exige (junto a las cuatro de C3a y las dos de B2) |
| T015 | el registro `UserData` de C3b, si ya está integrado | las diez filas de data-model.md, sección 7, con la regla de cobertura de C3b como prueba |
| T017 | `docker/nginx/nginx.conf` | `location = /api/sync` con `client_max_body_size 2m` y el resto del bloque de `/api/` repetido |
| T017 | `qa/nginx-api-blocks-check.ts` y `backend/api/scripts/smoke.sh` | el check de B2 recorre también la ubicación nueva; el smoke suma el 413 y el 401 de `GET /api/progress` |
| T018 | `package.json` | `"api:sync:check": "node qa/api-sync-check.ts"` |
| T019 | `README.md`, `backend/api/AGENTS.md`, `AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md` | la documentación de lo nuevo |

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **C3a.** Las rutas de D1a van en `['account', 'verified']` y las pruebas de recorrido (`RouteAccessTest`, `ExpectedAccountMatrixTest`) las cubren solas: son la red de seguridad si alguien olvida el grupo. `ApiCode` es un enum cerrado: los dos códigos nuevos son una línea de integración. Nginx: el bloque de `/api/` y su `error_page 429` se repiten en la ubicación hermana, como pide su plan. El 413 de Nginx no tiene la forma `{message, code}` que su contrato dice para todo error de `/api` (como el de `/api/runs`): hallazgo.
- **B2.** D1a usa `AccountLock`, `ProgressHead`, `Instant`, `RunWorld`, `RunInvariants` y `Parallel`, y la línea del Dockerfile que copia `qa/fixtures/shared/`. Escribe en `exercise_progress` sólo sus columnas y estampa la revisión en la fila que cambia; el cierre de B2 hace lo mismo con las suyas (D28). B2 queda **antes** de D1a en la hoja de ruta.
- **C3b.** Su `UserData` toma las diez tablas de data-model.md, sección 7, y el lector de la foto. Las migraciones de C3b no pueden usar `2026_10_06_1000NN`.
- **D1b.** Hereda el escritor (que acepta un reloj nulo), la lista `ProgressTables::STATE`, `campaign.seals` como `[]`, los códigos de error y las migraciones 100011 y 100012. Le quedan la ubicación de Nginx de la importación, `post_max_size` y los limitadores.
- **D1c.** Hereda el módulo de TypeScript, el lector del fixture y el contrato HTTP.
- **C5 y E1.** Sólo necesitan D1a (la lectura de esta spec): las tablas, las reglas y el id de etapa.
- **F2 y A3.** F2 mueve los hitos del recorrido: cambia la ruta de lectura de `qa/route-milestones-check.ts`. A3 lee el contenido con `Content-Version`, que cambia una vez con el id de etapa.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `backend/api/AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec, los dos contratos, [data-model.md](./data-model.md), [research.md](./research.md), [reference-merge.md](./reference-merge.md) si tocás TypeScript, y tu sección;
  - las skills `tdd`, `clean-code` y `codebase-design`; en PHP, también `laravel-tdd`, `laravel-specialist`, `laravel-security` y `php-pro`. Mandan el ADR y las decisiones del usuario: no se toman Sanctum, `strict_types` ni una meta de cobertura.
- **TDD, siempre.**
  - Escribí las pruebas de tu paso y comprobá que fallan por la razón que dice el plan. Recién entonces implementá.
  - Si una prueba de C2, C3a o B2 falla, el error está en el código nuevo: su valor esperado no se toca.
  - Un esperado sale de un contrato, de la consigna o de un ejemplo resuelto aparte; nunca del código que probás. **El fixture de fusión no se regenera ni se edita para que algo pase.**
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Comandos.** En cada terminal: `export COMPOSE_PROJECT_NAME=taller-d1a-<dueño>`, y un `.env` con `sh backend/api/scripts/init-env.sh`. Después:
  - `npm run api:test -- --filter=<Prueba>` y `npm run api:test -- --testsuite=<Unit|Feature|Content|Concurrency>`;
  - `npm run api:analyse` (nivel 9, sin baseline: tu código tiene que dar 0 errores) y `npm run api:format:check`;
  - `npm run api:test:down`;
  - en TypeScript, `node qa/<check>.ts`, `npm run typecheck`, `npm run lint` y `npm run format:check`.

  Sólo O y el coordinador levantan el stack (`docker compose up`). Las imágenes y la caché están en la máquina: si un comando intenta descargar algo, pará y pedí permiso.
- **Cableado de producción.** Lo que registra las piezas de D1a en el contenedor, en las rutas y en el limitador (`bootstrap/app.php`, `AppServiceProvider`) lo pone el coordinador en T015. Hasta entonces tus pruebas hacen su propio cableado en un `beforeEach`: `Route::prefix('api')->middleware('api')->group(base_path('routes/api/sync.php'))` (o `progress.php`), `ProgressLimiters::register()` y `app()->bind(…)` para los puertos (en T012 y T013, con los falsos). Sólo `WiringTest` (T015) comprueba las líneas de producción. Sin esto, una ruta con `throttle:sync` falla antes de llegar al controlador.
- **Estilo.**
  - Código y pruebas en inglés. Los mensajes de la API salen de `lang/es`; los de la consola, literales en español.
  - **Sin comentarios** salvo una función, clase o método que la complejidad exija, o una referencia puntual a un ADR o a un bug: el repositorio los borra.
  - Sin `declare(strict_types=1)`, sin sintaxis posterior a PHP 8.3, sin `@phpstan-ignore` ni baseline. Los arreglos se transforman con Collections y `Arr::`; una `list<…>` tipada se arma con `foreach`. Una fila entra a la lógica como registro (`fromRow`), nunca como arreglo suelto.
  - Toda hora sale del reloj de PHP y viaja como binding `Y-m-d H:i:s.v`; ninguna sentencia usa `NOW()` ni `VALUES()`.
  - Los datos de un pedido pasan de `FormRequest` a un registro `readonly` antes de salir del controlador.
  - Formato con Pint (PHP) y Prettier (TypeScript y JSON).
- **Commits.** Chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada commit lleva la prueba con lo que verifica. La evidencia de una tarea es su commit, y lo que midas (las mutaciones, los tiempos, la comparación del contenido) va en el mensaje.
- **Al terminar**, informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Base (coordinador, onda 0)

**Cubre:** la línea de base, los dos códigos de error y el reparto de los dueños (FR-018, FR-059, FR-083).

**Entrega:** el árbol de D1a parte de `master` con C6, C3a y B2, con la suite en verde.

### Tarea 0.1 · La línea de base (T001)

**Pasos:**

1. Traé `master` y las ramas de C3a (`feat/c3a-identidad`, con su entrega) y de B2 (como mínimo hasta su S1) a la rama de trabajo. Si B2 todavía no existe como código, D1a no arranca: avisá.
2. Comprobá que existen, con las firmas de [data-model.md](./data-model.md), sección 5: `app/Database/WriteTransaction.php`, `app/Progress/{AccountLock,AccountGone,ProgressHead}.php`, `app/Runs/Record/Instant.php`, `tests/Support/{RunWorld,RunInvariants,Parallel}.php`, `tests/Feature/UserIdForeignKeyTest.php`, las migraciones `2026_10_05_3000NN` de `progress_heads` y `exercise_progress`, y la suite `Concurrency` en `phpunit.xml` y `tests/Pest.php`.
3. Comprobá la línea de B2 del Dockerfile: la etapa `dev` de `backend/api/Dockerfile` trae `COPY --from=repo qa/fixtures/shared tests/Fixtures/shared`. Si falta, ponela con esa forma (D1a la necesita igual) y avisá. Con la imagen ya construida: `docker compose --profile test run --rm --no-deps --entrypoint ls test tests/Fixtures/shared` lista el contenido del directorio (con B2 solo, `harness-cases.json`).
4. `npm run api:format:check`, `npm run api:analyse` (0 errores en el nivel 9) y `npm run api:test`: verdes. Anotá el número de pruebas y de aserciones, y el tiempo de `migrate:fresh`.
5. `npm test`: verde. Anotá que `qa/build-check.ts` necesita `dist/` (R16) si falla por eso.
6. Reservá el bloque de migraciones `2026_10_06_100001` a `100099` (D1a la 100001 a la 100010, D1b la 100011 y la 100012) y avisá a quien planifica C3b que no lo use.
7. **Los dos códigos de error** (línea de integración de la tabla de arriba), antes de que Y los use: `ApiCodeTest` suma `epoch_mismatch` y `client_outdated` (409, con un mensaje en español que no es su clave) y falla porque no existen; después, `EpochMismatch` y `ClientOutdated` en `ApiCode` y sus mensajes de [http.md](./contracts/http.md), sección 6, en `lang/es/api.php`.
8. Armá una rama y un worktree por dueño (`d1a/<dueño>`), con su `COMPOSE_PROJECT_NAME`.

**Compuerta:** la suite en verde sobre la base, con los dos códigos de error, la línea de B2 del Dockerfile confirmada y `git status` limpio.

## 1. Esquema y base de pruebas (dueño S, onda 1)

**Cubre:** FR-051 (las diez tablas), FR-052, FR-053 y FR-059 (migraciones sólo hacia adelante); SC-009. Es la base de la que parten M, L, Y y O.

**Entrega:** al llegar S1, las diez tablas, `config/progress.php`, `ProgressTables`, `ContentNotImported`, `ProgressAreas`, `ChangesReader`, `ProgressWorld` y `ProgressInvariants`.

### Tarea 1.1 · Las pruebas de esquema y la de D32, antes de las migraciones (T002)

- **Crea:** `backend/api/tests/Feature/Progress/SchemaTest.php`, `backend/api/tests/Content/ProgressMigrationsTest.php` y `backend/api/tests/Content/ProgressEnumFkTest.php`.
- **Entrega:** las pruebas A a K de abajo.

**Pasos:**

1. **`SchemaTest`** (suite `Feature`) lee `information_schema` **sin mirar las migraciones**: sus expectativas están escritas en la prueba desde el ADR 0006 §5.3 y las listas de [data-model.md](./data-model.md), sección 2.
   - **A.** Las diez tablas existen, en InnoDB y con la colación `utf8mb4_es_0900_ai_ci`.
   - **B.** Cuántas columnas tiene cada una y cuáles, en este orden: `sync_operations` 7, `drafts` 8, `campaign_checkpoints` 9, `workshop_progress` 13, `workshop_observations` 8, `workshop_step_marks` 10, `route_marks` 9, `route_quiz_answers` 7, `route_notes` 8 y `preferences` 12 (91 en total).
   - **C.** Tipos y colaciones que importan: `operation_id` `binary(16)` y `payload_sha256` `binary(32)`; `status` con `applied` y `rejected` en ese orden; `drafts.code` `mediumtext` en `utf8mb4_0900_bin`; `route_notes.body` `mediumtext` con la colación de la conexión; los ids de contenido, `starter_hash` y los conjuntos, en `ascii_bin`; toda columna de reloj, `datetime(3)`; y `language` de las tres tablas de taller del tipo que decidió D32 (prueba J).
   - **D.** Claves e índices por nombre y columnas: las diez primarias, `sync_operations_received_at_index`, `drafts_user_id_revision_index`, `drafts_exercise_id_index`, `campaign_checkpoints_world_id_passed_index`, `workshop_progress_workshop_id_index`, `workshop_observations_workshop_id_objective_key_index`, `workshop_step_marks_workshop_id_step_key_index`, `route_quiz_answers_step_id_index`, `preferences_lab_selected_rust_index` y `preferences_lab_selected_go_index`. Ningún `UNIQUE` aparte de la clave primaria.
   - **E.** Las claves foráneas, por `REFERENTIAL_CONSTRAINTS` y `KEY_COLUMN_USAGE`: 18 (21 si D32 eligió `VARCHAR`): ocho de `user_id` hacia `users(id)` en cascada, dos de las tablas hijas de taller hacia `workshop_progress` en cascada, y ocho hacia el contenido con `RESTRICT` (`drafts` a `exercises`; `campaign_checkpoints` a `worlds`; `workshop_progress` a `workshops`; `workshop_observations` a `workshop_objectives`; `workshop_step_marks` a `workshop_steps`; `route_quiz_answers` a `guide_steps`; `preferences` a `exercises`, dos veces). `ON UPDATE` siempre `RESTRICT`.
   - **F.** Los `CHECK`, por `CHECK_CONSTRAINTS`: exactamente seis, `sync_operations_status_check`, `campaign_checkpoints_passed_check`, `workshop_progress_flags_check`, `workshop_step_marks_marked_check`, `route_marks_marked_check` y `preferences_focus_minutes_check`, y **ninguno nombra una columna `DATETIME`** (FR-052).
   - **G.** Con una cuenta y las diez tablas pobladas (más las dos de B2), `DELETE FROM users WHERE id = ?` no falla y deja 0 filas en las doce (FR-053, SC-009).
   - **H.** `RunInvariants::crossedPointers()` (B2) da 0 filas con los datos poblados.
   - **K.** `UserIdForeignKeyTest` (C3a) sigue en verde: toda columna `user_id` de las diez tiene su clave a `users` en cascada.
2. **`ProgressMigrationsTest`** (suite `Content`: el DDL confirma sus propias transacciones): `migrate`, `rollback --step=10` y `migrate` dejan un `SHOW CREATE TABLE` igual para las diez, y `users`, `exercises` y las dos de B2 intactas.
3. **`ProgressEnumFkTest`** (suite `Content`, prueba J, D32): el experimento de [data-model.md](./data-model.md), sección 2.11, con tablas de prueba que borra al terminar; y exige que `language` de las tres tablas de taller sea del tipo que el experimento decidió.
4. Corrélas: fallan porque las tablas no existen («Table … doesn't exist»), que es la razón esperada, y no por un error de sintaxis. `ProgressEnumFkTest` pasa sola (usa sus tablas) y deja dicho en su salida qué decidió.

**Compuerta:** las pruebas A a H y K fallan por esa razón, J dice qué decidió, e `ProgressMigrationsTest` falla porque no hay migraciones; el resto de la suite sigue verde.

### Tarea 1.2 · Las diez migraciones (T003)

- **Crea:** las diez migraciones `backend/api/database/migrations/2026_10_06_1000NN_*.php` de [data-model.md](./data-model.md), sección 2.

**Pasos:**

1. Cada `up()` es un único `DB::statement` con el DDL de la sección 2, con el encabezado de las de C2 (`// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/007-d1-progreso-sincronizacion/data-model.md`). Cada `down()` es `Schema::dropIfExists` y sólo sirve en desarrollo (ADR 0006 §10). Las tres tablas de taller usan el tipo de `language` que decidió T002, con su clave a `languages` si es `VARCHAR`.
2. Corré las pruebas de T002: pasan. Corré `npm run api:test` completo y anotá el tiempo de `migrate:fresh`.
3. `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas de T002 en verde y la suite entera en verde. El mensaje del commit dice qué decidió D32.

### Tarea 1.3 · La configuración y el mundo de pruebas (T004)

- **Crea:** `backend/api/config/progress.php`, `backend/api/app/Progress/{ProgressTables,ContentNotImported,ProgressAreas,ChangesReader}.php`, `backend/api/tests/Support/{ProgressWorld,ProgressInvariants}.php`, `backend/api/tests/Unit/Progress/{ProgressConfigTest,ProgressAreasTest}.php` y `backend/api/tests/Feature/Progress/ProgressWorldTest.php`.
- **Entrega:** las firmas de [data-model.md](./data-model.md), sección 5 (`ProgressTables`, `ContentNotImported`, `ProgressAreas` y `ChangesReader`: lo que comparten L, Y y C3b, que no pueden esperarse entre sí en la onda 2), más lo que sigue.

```php
return [
    'sync' => [
        'formats' => [2],
        'max_operations' => 200,
        'throttle_per_minute' => 60,
        'clock_floor' => '2020-01-01T00:00:00.000Z',
    ],
    'limits' => ['draft_chars' => 30000, 'reflection_chars' => 10000, 'custom_test_chars' => 3000, 'workshop_note_chars' => 10000, 'route_note_chars' => 20000],
    'retention' => ['sync_operations_days' => 14],
    'batches' => ['prune' => 5000, 'prune_max' => 100],
];
```

```php
final class ProgressWorld   // tests/Support
{
    /** @param array<string, mixed> $world la sección `world` de merge-cases.json */
    public static function seed(array $world): void;            // contenido mínimo con SQL directo, más un content_imports con su versión
    public static function user(array $state = []): User;        // por la fábrica de C3a
    public static function head(User $user, int $epoch = 1, int $revision = 0): ProgressHead;
    public static function contentVersion(): string;             // los 32 primeros hexadecimales del document_hash sembrado
}

final class ProgressInvariants   // tests/Support
{
    /** Falla con la descripción de la regla que alguna fila viole. Una consulta por regla de data-model.md, sección 3. */
    public static function assertClean(?int $userId = null): void;
}
```

**Pasos:**

1. Las pruebas, que fallan porque las clases no existen:
   - **`ProgressConfigTest`**: los valores por omisión son los de arriba, escritos a mano en la prueba (formato 2, 200 operaciones, 60 por minuto, el piso, los topes de texto de v1, 14 días y lotes de 5.000).
   - **`ProgressAreasTest`**: `ProgressAreas` vacío da, con `toArray(true)`, exactamente `{full: true, exercises: [], drafts: [], campaign: {seals: [], checkpoints: []}, workshops: {progress: [], objectives: [], steps: []}, route: {marks: [], quiz: [], notes: []}, preferences: null}` (escrito a mano desde http.md, sección 4) y `full: false` con `toArray(false)`; una fila de cada área aparece en su lugar sin transformarse.
   - **`ProgressWorldTest`**: `seed` con un `world` escrito en la prueba (el de [merge-rules.md](./contracts/merge-rules.md), sección 8; el archivo del fixture todavía no está en S0) deja los ejercicios (con tres pistas y tres opciones de predicción, reutilizando `RunWorld::exercise` de B2), un mundo con su checkpoint, un taller con dos objetivos, cuatro etapas y su predicción, un paso de la guía con su quiz, un recurso y un `content_imports` **último** (si `RunWorld::exercise` inserta el suyo, `seed` inserta el suyo después: `ContentImports::latestVersion()` lee el de mayor `id`); las inserciones cumplen las restricciones de C2 (no fallan) y `contentVersion()` son los 32 primeros hexadecimales de su `document_hash`. `ProgressInvariants::assertClean` no encuentra nada con datos válidos y **encuentra cada regla** de la sección 3 de data-model.md cuando la prueba planta una violación (una lápida sin reloj, un borrador sin código y sin reloj, una fecha sin su bandera, un reloj sin valor, una revisión mayor que la de la cabecera).
2. Implementá. `ContentNotImported` extiende `HttpResponseException` con el 503 de C2 (`ApiError::response(503, 'content_not_imported', 'Todavía no hay contenido importado.', headers: ['Retry-After' => '60'])`).
3. `npm run api:analyse` y `npm run api:format:check`: 0 errores.

**Compuerta:** las pruebas en verde y que los nombres y las firmas sean los de data-model.md: de eso depende todo el reparto.

## 2. Fixture y fusión en TypeScript (dueño F, onda 1)

**Cubre:** FR-080 a FR-082 (el fixture y su congelado), FR-083 (la ubicación) y, con M, SC-002; la lista de hitos del recorrido (R15).

**Entrega:** al llegar S1, `qa/fixtures/shared/{merge-cases.json,merge-cases.sha256,route-milestones.json}`, su lector y su check, y el módulo puro.

### Tarea 2.1 · El fixture y sus checks, antes del módulo (T005)

- **Crea:** `qa/fixtures/shared/merge-cases.json`, `qa/fixtures/shared/merge-cases.sha256`, `qa/fixtures/shared/route-milestones.json`, `qa/lib/merge-fixture.ts`, `qa/merge-fixture-check.ts` y `qa/route-milestones-check.ts`.
- **Modifica:** `qa/run-checks.ts` (suma los dos checks a su lista).
- **Entrega:** [merge-rules.md](./contracts/merge-rules.md) hecho: el fixture de 277 casos de fusión y 43 del servidor, congelado.

**Pasos:**

1. **Primero los checks**, que fallan: sumá los dos a `qa/run-checks.ts` y escribí `qa/lib/merge-fixture.ts`, `qa/merge-fixture-check.ts` y `qa/route-milestones-check.ts` como están en [reference-merge.md](./reference-merge.md), secciones 3 a 5. Corré `node qa/merge-fixture-check.ts`: falla porque el módulo de fusión no existe (`ERR_MODULE_NOT_FOUND` de `field-kinds.ts`), que es la razón esperada, porque ese módulo es de T006. `node qa/route-milestones-check.ts` falla porque `route-milestones.json` no existe (`ENOENT`).
2. **Escribí `route-milestones.json`** (los diez hitos). `node qa/route-milestones-check.ts` pasa: lo que lee de `frontend/app.js` es lo que ya está.
3. **Armá el fixture una sola vez** con el generador de la sección 6 de reference-merge.md, que no se versiona. Antes de dejarlo, **revisalo caso por caso contra las tablas de [merge-rules.md](./contracts/merge-rules.md)**, secciones 5 a 7: las doce (diez) filas de la familia con reloj para cada tipo, los seis casos de texto de los cuatro tipos libres, las dos secuencias de lápida, los casos que sólo crecen y los 43 del servidor. Contá: 277 y 43. Formatealo con `npx prettier --write qa/fixtures/shared/merge-cases.json`.
4. **Congelalo**: `cd qa/fixtures/shared && sha256sum merge-cases.json > merge-cases.sha256` (queda `<hex>  merge-cases.json`), y comprobá con `sha256sum -c merge-cases.sha256`.
5. `npx prettier --check qa/fixtures qa/lib qa/merge-fixture-check.ts qa/route-milestones-check.ts`. `npm run lint` y `npm run typecheck` quedan para T006: el check importa un módulo que todavía no existe.

**Compuerta:** `merge-fixture-check` falla sólo porque falta el módulo, `route-milestones-check` pasa, el fixture tiene 277 y 43 casos y su huella verifica con `sha256sum -c`, y `git diff` no toca nada fuera de lo que lista la tarea.

### Tarea 2.2 · El módulo de fusión en TypeScript (T006)

- **Crea:** `frontend/src/features/progress-sync/model/merge-rules.ts` y `frontend/src/features/progress-sync/model/field-kinds.ts`.
- **Entrega:** las reglas puras de [reference-merge.md](./reference-merge.md), secciones 1 y 2: `mergeRegister`, `mergeFlag`, `mergeMax`, `mergeDatedFlag`, `mergeObserved` y `FIELD_KINDS` con los 25 tipos.

**Pasos:**

1. Con T005, aplicá el código de las secciones 1 y 2 de reference-merge.md. `node qa/merge-fixture-check.ts` pasa: `merge-fixture-check: 277 casos de fusión (277 corridos en TypeScript), 43 del servidor y 25 tipos de campo PASS.` Comprobá que **editar un caso sin tocar la huella** lo hace fallar con «es un fixture congelado», y que un caso mal escrito a mano, uno que falta o un tipo de campo de más lo hacen fallar sin tocar ninguna regla; restaurá el fixture.
2. **Las mutaciones.** Aplicá cada una de M1 a M8 de [merge-rules.md](./contracts/merge-rules.md), sección 9, sobre `merge-rules.ts`, corré el check y restauralo: tiene que fallar con **36, 31, 31, 8, 2, 18, 2 y 2** casos. Anotá cada resultado en el mensaje del commit.
3. `npm test`, `npm run lint`, `npm run format:check` y `npm run typecheck`: verdes.

**Compuerta:** el check en verde, las ocho mutaciones detectadas con esas cifras, ESLint con 0 problemas (la complejidad de cada función, por debajo de 10) y `npm test` en verde.

## 3. Contenido: el id de etapa (dueño C, onda 1)

**Cubre:** FR-046 a FR-050; US6 (escenarios 1 y 2 del contenido); SC-007.

**Entrega:** las cuatro porciones de talleres con el id de cada etapa, publicadas por el generador y servidas por la API, con el cambio medido byte a byte. **Las dos tareas van juntas**: desde T007, la suite de contenido de la API queda en rojo a propósito hasta T008 (`DocumentFields` rechaza el `id` como «clave desconocida»), así que la rama de C no se lleva a `master` a medias.

### Tarea 3.1 · El generador y sus checks (T007)

- **Modifica:** `tools/content/workshops.ts`, `qa/content-records-check.ts` y `qa/curriculum-meta-check.ts`.
- **Entrega:** `publishedStep` conserva `id` (y sigue quitando `v1Index`); la etapa publicada tiene las claves `id`, `title`, `task`, `why`, `done`, en ese orden.

**Pasos:**

1. **Primero las pruebas**, que fallan:
   - En `qa/content-records-check.ts`, el caso «workshops: step keys travel separately and the published step keeps its four texts» pasa a decir que la etapa publicada **empieza por su `id`**: `published[2]` es `{id: 'e3', title: 'Tres', task: 'Hacé Tres.', why: 'Por Tres.', done: 'Tres listo.'}` y `Object.keys(published[0])` es `['id', 'title', 'task', 'why', 'done']`.
   - En `qa/curriculum-meta-check.ts`, para cada taller de `build/curriculum.json`: cada etapa tiene exactamente esas cinco claves y su `id` es el de `workshopSteps[taller][i].id` del meta, en la misma posición (100 etapas).
   Corrélas con el generador de hoy: fallan porque el `id` no se publica (`+ id: 'e3'` en el primero; la etapa sin `id` en el segundo), que es la razón esperada.
2. Cambiá `publishedStep` (la línea `if (key !== 'id' && key !== 'v1Index')` pasa a `if (key !== 'v1Index')`) y el comentario que dice «not published until D1». Corré los dos checks: pasan.
3. Corré los 29 checks que pasan en `master` (`npm test` o el lazo de `qa/run-checks.ts`): pasan, salvo `qa/build-check.ts` si falla por falta de `dist/` (R16). Los checks de Sistemas (`systems-*-check`, `app-shell-check`, `boot-check`) ejercen las vistas legacy con una etapa que ahora trae `id` (FR-049).
4. **La comparación de una vez**: [quickstart.md](./quickstart.md), escenario 1, con la copia de antes y la de después. El script termina con `OK: 100 etapas; … 4 porciones cambian`; los valores medidos van en el mensaje del commit.
5. `npm run lint`, `npm run format:check` y `npm run typecheck`.

**Compuerta:** los dos checks en verde, la comparación del escenario 1 con su `OK`, `qa/fixtures/workshop-steps-v1.json` sin cambios (`git diff --stat` vacío) y los demás checks como antes. **Un solo commit** con las pruebas, el cambio del generador y el resultado de la comparación en el mensaje: el oráculo cambia a propósito en el mismo commit TDD que la publicación (FR-049). **La suite de contenido de la API está en rojo a propósito** hasta T008.

### Tarea 3.2 · Los registros de PHP y el import (T008)

- **Modifica:** `backend/api/app/Content/Record/WorkshopStep.php`, `backend/api/tests/Unit/Record/WorkshopRecordsTest.php`, `backend/api/tests/Unit/ContentRoundTripTest.php`, `backend/api/tests/Support/ContentFixture.php` y `backend/api/tests/Content/ImportContentTest.php`.
- **Entrega:** `WorkshopStep` acepta, valida y publica el `id`; el primer import después del cambio escribe exactamente las 100 filas de `workshop_steps`.

**Pasos:**

1. **Primero las pruebas**, que fallan:
   - **`WorkshopRecordsTest`**, «keeps the step key and the v1 index in the row and out of the published step»: pasa a «keeps the v1 index out of the published step and publishes the step key first». La etapa publicada tiene las claves `['id', 'title', 'task', 'why', 'done']`, la primera es el `step_key` de la fila y de la clave del meta, y no trae `v1Position`; la fila lleva `key_order` `["id","title","task","why","done"]`. Un caso nuevo: una etapa del documento cuyo `id` no es el de `StepKey` del meta en esa posición lanza `InvalidContent` con `…workshopSteps.<taller>: la etapa «e9» del documento es «e3» en el meta: regenerá los dos archivos juntos`.
   - **`ContentRoundTripTest`** (línea 67): el `key_order` de la etapa pasa a `['id', 'title', 'task', 'why', 'done']`.
   - **`ContentFixture::withoutStepIds()`**: una copia editable que quita el `id` de cada etapa del documento; al escribirla, recalcula el meta como ya hace con las demás ediciones. Es el «contenido de antes» de la prueba siguiente.
   - **`ImportContentTest`**: con una base que importó `withoutStepIds()`, importar el contenido de la imagen escribe exactamente **100 filas de `workshop_steps` y ninguna de otra tabla**, deja un registro más en `content_imports` cuyo `portion_hashes` difiere del anterior en **exactamente cuatro porciones** (`workshops.lowlevel`, `infra`, `play` y `pc`), no toca los `content_hash` ni los `grading_hash` de los 274 ejercicios ni suma versiones de corrección, y un segundo import no escribe nada. `--dry-run` informa `Filas escritas: workshop_steps 100`.
   Corrélas con la imagen nueva (el documento ya trae los `id`): fallan con «clave desconocida» de `DocumentFields` (`curriculum.json: workshops.…steps[0].id: clave desconocida`), la razón esperada.
2. Implementá: `WorkshopStep::KEYS` suma `'id'`; `fromDocument` lee `$fields->text('id')` y lo compara con `$key->id`; `toPublished` agrega `'id' => $this->stepKey` y respeta el orden de `key_order`. `fromRow` y `toRow` no cambian.
3. `npm run api:test` completo (las suites `Unit`, `Feature` y `Content`), `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde y la suite entera en verde. Con el stack (lo corre el coordinador en T020, con el contenido de antes en la base): `docker compose exec php php artisan content:import --dry-run` da el informe de quickstart.md, escenario 1, y `npm run api:content:check` pasa.

## 4. Operaciones y fusión (dueño M, ondas 1 y 2)

**Cubre:** FR-001, FR-003, FR-005 a FR-009, FR-052 y FR-080 a FR-082 (el lado PHP); SC-002.

**Entrega:** al llegar S1, el catálogo de las dieciséis operaciones, su decodificación y las formas del SQL, puros (T009); al llegar S2, el procesador contra la base, que corre el fixture (T010).

### Tarea 4.1 · El catálogo, la decodificación y las formas del SQL (T009)

- **Crea:** `backend/api/app/Progress/Operations/{Rule,OperationType,RejectionReason,FieldKinds,RouteMilestones,OperationHash,Operation,Decoded,Checked,Applied,OperationDecoder,OperationProcessor}.php`, `backend/api/app/Progress/Merge/UpsertSql.php` y sus pruebas en `backend/api/tests/Unit/Progress/{Operations,Merge}/`.
- **Entrega:** las firmas de [data-model.md](./data-model.md), sección 5. Es PHP puro: no toca la base.

**Pasos:**

1. **Primero las pruebas**, con los esperados escritos desde [http.md](./contracts/http.md) y [merge-rules.md](./contracts/merge-rules.md) y no desde el código:
   - **`OperationDecoderTest`**: una operación válida de cada uno de los dieciséis tipos se decodifica con sus campos; y, en una tabla por tipo, cada violación de la sección 3.2 de http.md da su motivo: un campo de más o de menos, un tipo de dato equivocado (`answer: "1"`, un `1.0` que no es entero, un booleano que llega como `0`), un valor fuera de un conjunto de textos (`invalid`); un número fuera de rango, `focusMinutes: 20`, `revealed: 0`, un texto por encima del tope (10.000, 3.000, 30.000, 10.000 y 20.000 caracteres: `out_of_range`). Los topes cuentan **caracteres** (un texto de 10.000 caracteres con emojis de 4 bytes pasa) y además se miden en bytes contra la columna. `''` es un texto válido. `assisted` y `solutionSeen` sólo aceptan `true`; `exercise.draft` con `code: null` exige `starterHash: null`; `preference.set` valida `value` según `name`; las claves mal formadas son `invalid`. Los 15 casos de rechazo de [merge-rules.md](./contracts/merge-rules.md), sección 7, que no dependen del contenido (los ocho `invalid` de forma y los siete `out_of_range` de longitud o de número), dan exactamente su motivo. Los topes de texto salen de `config('progress.limits.*')` (el archivo es de S y todavía no está en S0): la prueba fija esos valores ella misma, escritos a mano.
   - **`OperationHashTest`**: el sha256 de la forma canónica sin `id`; independiente del orden de las claves; con el texto sin escapar; distinto si cambia un byte. Dos vectores calculados **con `sha256sum`** a partir de `printf` del texto canónico, no con este código.
   - **`FieldKindsTest`**: `FieldKinds::all()` tiene 25 tipos con su regla (la tabla de merge-rules.md, sección 4, escrita a mano en la prueba), y los dieciséis `OperationType` escriben los tipos que dice http.md, sección 3.2.
   - **`RouteMilestonesTest`**: son los diez hitos (`rust-memory`, `rust-commands`, `rust-files`, `rust-measure`, `rust-network` y los cinco de `go`), escritos a mano en la prueba y en ese orden. T010 los compara con `tests/Fixtures/shared/route-milestones.json`.
   - **`UpsertSqlTest`**: para cada una de las siete reglas, la sentencia generada lleva `AS \`n\` ON DUPLICATE KEY UPDATE`, nunca `VALUES(`; sus asignaciones van en el orden `revision`, `updated_at`, valores, relojes; la guarda compara los textos con `CAST(… AS BINARY)`; los bindings salen en el orden de las columnas; y para tres grupos (`exercise.reflection`; `exercise.prediction` con y sin la bandera; `workshop.step` con su fila padre) el SQL exacto está escrito a mano en la prueba desde data-model.md, sección 4.
   Corrélas: fallan porque las clases no existen.
2. **Implementá.** El catálogo es declarativo: una entrada por tipo de operación con sus campos, referencias, límites y los tipos de campo que escribe, que la decodificación y `UpsertSql` leen; la prueba de cada tipo es la tabla de la sección 3.2. `UpsertSql` genera, por regla, la sentencia de data-model.md, sección 4. Referencia de la forma `lww`:

```php
// Una asignación `lww` de un grupo con valores v1…vk y reloj c; $t es la fila existente y $n el alias de la entrante.
$wins = "{$t}.{$c} IS NULL OR ({$n}.{$c} IS NOT NULL AND {$n}.{$c} >= {$t}.{$c})";
$same = collect($values)->map(fn (string $v) => "CAST({$t}.{$v} AS BINARY) <=> CAST({$n}.{$v} AS BINARY)")->push("{$t}.{$c} <=> {$n}.{$c}")->implode(' AND ');
$changes = "({$wins}) AND NOT ({$same})";
// Orden de las asignaciones: revision y updated_at (con $changes), después los valores (con $wins), y el reloj al final.
```

   Los números y las fechas no necesitan el `CAST`; las comparaciones son nulas-seguras (`<=>`).
3. `npm run api:test -- --testsuite=Unit`, `npm run api:analyse` y `npm run api:format:check`: verdes.

**Compuerta:** las pruebas en verde, 0 errores de PHPStan en el nivel 9 y que las firmas sean las de data-model.md. `OperationDecoder` y `UpsertSql` se revisan por su tabla de pruebas.

### Tarea 4.2 · El procesador contra la base y el fixture (T010)

- **Crea:** `backend/api/app/Progress/Operations/{ContentLookup,DatabaseOperationProcessor}.php`, `backend/api/app/Progress/Merge/OperationWriter.php`, `backend/api/tests/Support/{MergeKinds,MergeFixture}.php` y `backend/api/tests/Feature/Progress/Merge/{AffectedRowsTest,MergeFixtureTest,ContentLookupTest,OperationWriterTest}.php`.
- **Entrega:** `DatabaseOperationProcessor` (`check` y `apply`) y `OperationWriter`.

**Pasos:**

1. **Primero las pruebas.**
   - **`AffectedRowsTest`**: `INSERT … AS n ON DUPLICATE KEY UPDATE` devuelve 1 si inserta, 2 si cambia una fila y 0 si queda igual (`DB::affectingStatement`), con PDO nativo en MySQL 9.7. **Si da otra cosa, se detiene el paso**: se aplica el respaldo de R4 (una consulta por revisión) y se avisa al coordinador.
   - **`MergeFixtureTest`**: (1) la huella de `tests/Fixtures/shared/merge-cases.json` es la de `merge-cases.sha256` («es un fixture congelado» si no); (2) `FieldKinds::all()` es igual al `kinds` del fixture, por nombre y por regla, cada `OperationType` figura como `op` de algún tipo, `RouteMilestones::KEYS` es igual a `tests/Fixtures/shared/route-milestones.json` y el `world` del fixture se siembra con `ProgressWorld::seed` sin errores; (3) **cada uno de los 275 casos de fusión que no son `only: ts`** pasa por el escritor: `MergeKinds::seed` siembra el guardado con SQL directo (un reloj nulo es posible), `OperationProcessor::apply` aplica cada escritura de `incoming` en orden con la revisión `R + 1`, y `MergeKinds::read` lee el estado en la forma neutra; el estado final y el `changed` de cada escritura son los escritos a mano; la revisión de la fila es `R + 1` **si y sólo si** cambió alguna de las escrituras del caso, y la de la cabecera no se toca (el escritor no la sube). **`MergeKinds`** (en `tests/Support/`) escribe las columnas de cada tipo **desde la tabla de merge-rules.md, sección 4**, y no desde `FieldKinds`: un error de columna no se repite en los dos lados. Para un tipo que comparte operación con otro (la predicción: respuesta y bandera), siembra el grupo compañero con los valores de la propia operación, así sólo puede cambiar el grupo que se prueba; en `absent` no siembra nada (ni la fila ni el compañero), para que el escritor inserte.
   - **`ContentLookupTest`**: una referencia existente, una retirada (cuenta como existente) y una desconocida, para cada clase (ejercicio, mundo, taller, objetivo, etapa por clave, paso de la guía, recurso); la cantidad de opciones de la predicción, del checkpoint, del taller y del quiz sale del JSON de la fila; las pistas cuentan sólo las activas; `labSelected` exige el lenguaje del ejercicio; los otros 12 casos de rechazo de merge-rules.md, sección 7, que sí dependen del contenido (los nueve `unknown_reference`, `answer-outside-options`, `hints-beyond-the-exercise` y `lab-selected-of-other-language`), dan su motivo; y un lote de 200 operaciones hace a lo sumo ocho consultas (`DB::getQueryLog()`).
   - **`OperationWriterTest`**: cada tipo de operación escribe las columnas de sus tipos de campo y **no cambia ninguna de las de B2 ni de la importación** (se compara la fila antes y después); una operación sobre un hijo de taller crea antes su fila padre con la revisión nueva; un grupo con bandera se salta cuando la operación no la otorga (`stale`); `created_at` sólo se escribe al insertar; `updated_at` y `revision` sólo cambian cuando la fila cambia; y `ProgressInvariants::assertClean()` al final de cada una.
   Corrélas: fallan porque las clases no existen.
2. **Implementá.** `ContentLookup` lee las tablas de contenido por clave (una consulta por clase de referencia, con `whereIn`) y decide `unknown_reference` y `out_of_range`; `DatabaseOperationProcessor::check` arma los `Checked` (con `stale` si la versión no es la vigente) y `apply` delega en `OperationWriter`, que corre la sentencia de `UpsertSql` (y la de la fila padre, si hace falta) y devuelve `Applied(changed: affected > 0)`.
3. **Las mutaciones.** Aplicá cada una de M1 a M6 y de M8 a M10 de [merge-rules.md](./contracts/merge-rules.md), sección 9, sobre `UpsertSql` (M7 sólo existe en TypeScript, y M11, a través de HTTP, la corre T016), corré `MergeFixtureTest` y restaurá: tienen que fallar los casos que dice la tabla (36, 31, 31, 8, 2, 103, 2, 145 y 6). Anotá cada resultado en el mensaje del commit.
4. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`: verdes.

**Compuerta:** las pruebas en verde (275 casos de fusión incluidos), las nueve mutaciones de PHP detectadas y 0 errores de PHPStan en el nivel 9.

## 5. Lectura: la foto y el delta (dueño L, onda 2)

**Cubre:** FR-017 (lo que cambió), FR-019 (leer no escribe), FR-020 a FR-023 y FR-054 (el snapshot consistente); SC-006.

**Entrega:** al llegar S2, `ProgressSnapshotReader` y `GET /api/progress`.

### Tarea 5.1 · `ProgressSnapshotReader` y `GET /api/progress` (T011)

- **Crea:** `backend/api/app/Progress/Snapshot/{ProgressSnapshotReader,ProgressEtag,ProofState,Snapshot,NotModified}.php` (y los lectores de fila de las áreas), `backend/api/app/Http/Controllers/ProgressController.php`, `backend/api/routes/api/progress.php` y `backend/api/tests/Feature/Progress/Snapshot/`.
- **Entrega:** las firmas de [data-model.md](./data-model.md), sección 5 (`ProgressSnapshotReader` implementa el `ChangesReader` de S y arma el `ProgressAreas` de S con las filas ya en la forma de [http.md](./contracts/http.md), sección 5).

**Pasos:**

1. **Primero las pruebas**, con los esperados escritos desde http.md:
   - **`ProgressSnapshotReaderTest`**: una cuenta sin cabecera da la foto vacía (`epoch` 1, `revision` 0, `resetAt` `null`, todas las áreas vacías, `preferences` `null`); con una fila de cada una de las diez tablas de estado (las nueve de D1a que no son `sync_operations`, y `exercise_progress`), cada arreglo tiene exactamente la forma de la sección 5 (los relojes `null` como `null`, las lápidas con `marked: false`, `code: null` en un borrador de «restaurar inicio»); `campaign.seals` es `[]`; los arreglos van ordenados por la clave natural; incluye el progreso de un ejercicio, un mundo y un taller **retirados**; y `areas(userId, null)` da la foto completa.
   - **El delta**: `areas(userId, R)` trae sólo las filas con `revision` mayor que `R`, también la que cambió el cierre de B2 (`RunCloser::close` con `RunWorld`), y una lápida; el delta de una revisión sin cambios es un conjunto vacío.
   - **Los estados de la prueba aprobada**: con un intento aprobado cuyo `grading_hash` es el del ejercicio, `proof.state` es `current`; si el ejercicio cambia de `grading_hash`, `changed`; con un intento legado, `legacy`. `proof` y `lastAttempt` traen sólo `attemptId`, `at`, el resultado y el veredicto de cada prueba (`tests: [{testKey, outcome}]`, en el orden de las pruebas), **nunca el código ni las salidas**; una fila de otra cuenta con el mismo ejercicio no se mezcla (se une por `user_id` y `exercise_id`, D29).
   - **`ProgressEtagTest`**: `W/"u7.e1.r42.c<32 hex>"` para esos valores, escrito a mano.
   - **`ReadIsolationTest`** (suite `Concurrency`, `Parallel`): `read` abre una transacción de sólo lectura en REPEATABLE READ: un lote que confirma entre la lectura de la cabecera y la de las tablas **no aparece** en esa foto.
   - **`NoWriteOnReadTest`**: leer una cuenta sin cabecera no ejecuta ningún `insert`, `update` ni `delete`.
   - **`ProgressEndpointTest`** (con `Browser`): sin sesión, 401; con el email sin verificar, 403 `email_unverified`; sin contenido importado, 503 `content_not_imported`; 200 con `Cache-Control: private, no-store` y el `ETag`; el mismo `ETag` en `If-None-Match` (también débil, con `W/`) da **304** sin cuerpo y con las mismas cabeceras; después de una escritura, 200; y **ninguna ruta recibe un `user_id`**: `GET /api/progress?user_id=<otra cuenta>` devuelve lo propio.
   Corrélas: fallan porque las clases no existen.
2. **Implementá.** `read` abre `DB::transaction(…, attempts: 1)` (REPEATABLE READ por omisión), lee la cabecera (o la foto vacía), calcula el validador con la versión del contenido que le pasa el controlador, devuelve `NotModified` si `$matches` lo acepta (sin leer más) y, si no, lee las áreas del mismo snapshot. `areas` no abre una transacción. Cada tabla se lee con una consulta por `user_id` (y por `revision` mayor, en un delta), y `exercise_progress` se une con `attempts` y `exercises` para el estado de la prueba aprobada y se complementa con una consulta de `attempt_tests` para los dos punteros. `ProgressController::show` pasa `fn (string $etag) => ConditionalRequest::matches($request, $etag)` (de C2) y arma la respuesta; la ruta va en `Route::middleware(['account', 'verified'])`.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde y 0 errores de PHPStan en el nivel 9. Que la foto de una revisión más el delta hasta la siguiente reproduzca la foto completa lo prueba T016, con los escritores reales.

## 6. Sincronización y su HTTP (dueño Y, onda 2)

**Cubre:** FR-002, FR-004, FR-007 (el resultado), FR-010 a FR-016, FR-018, FR-019, FR-056 (el limitador y el límite de operaciones), FR-057 y FR-058; SC-003 (la parte del servicio).

**Entrega:** al llegar S2, `SyncService` y `POST /api/sync`. Y prueba contra **puertos falsos** de M y de L (`FakeOperationProcessor` y `FakeChangesReader`, suyos); la integración con los reales es T015 y T016.

### Tarea 6.1 · `SyncService`: época, formato, idempotencia, reloj y resultados (T012)

- **Crea:** `backend/api/app/Progress/Sync/{SyncRequest,SyncService,SyncOutcome,OperationResult,ResultStatus,ClockCorrection,OperationRegistry,EpochMismatch,ClientOutdated,SyncWriteFailed}.php`, `backend/api/tests/Support/Sync/{FakeOperationProcessor,FakeChangesReader}.php`, `backend/api/tests/Unit/Progress/Sync/` y `backend/api/tests/Feature/Progress/Sync/`.
- **Entrega:** las firmas de [data-model.md](./data-model.md), sección 5.

**Pasos:**

1. **Primero las pruebas**, con los esperados escritos desde [http.md](./contracts/http.md), secciones 3.3 a 3.6 y [merge-rules.md](./contracts/merge-rules.md), sección 7:
   - **`ClockCorrectionTest`**: los siete casos de reloj de merge-rules.md, sección 7 (el efectivo y el desfase, con `Carbon::setTestNow`); un desfase fuera del rango de `INT` se acota; un `at` posterior a `sentAt` queda en `ahora`.
   - **`SyncServiceTest`** (con los puertos falsos y la base real, suite `Feature`):
     - un `format` que el servidor no acepta lanza `ClientOutdated`; sin contenido importado, `ContentNotImported`; con otra época, `EpochMismatch` con `{epoch, revision}` **antes de aplicar nada y sin recordar los UUID del lote**;
     - la primera sincronización de una cuenta crea la cabecera (época 1, revisión 0) y **un lote sin efecto no sube la revisión**; uno con efecto la sube **una vez** y fija `last_activity_at`;
     - **la idempotencia**: el mismo lote tres veces da `applied`, `duplicate` y `duplicate`; el mismo UUID con otro contenido, `uuid_reused` sin pisar el registro; un UUID rechazado (con su `reason`) vuelve como `duplicate` con ese `reason`; una aplicada sin su bandera vuelve como `duplicate` con `stale_content`; dos operaciones con el mismo UUID en un mismo lote se resuelven contra la primera; un UUID de hace más de 14 días ya podado se vuelve a aplicar;
     - **el piso**: un efectivo anterior a 2020-01-01 sale `rejected` con `out_of_range` y no llega al procesador;
     - **los resultados** salen en el orden del pedido, con `stale_content` cuando el procesador lo marca;
     - **`sync_operations`**: una fila por operación procesada (también las rechazadas), con el sha256 del contenido, el estado, el `reason`, el desfase del lote y `received_at`; ninguna para `duplicate`, `uuid_reused` ni para un lote con otra época;
     - **`changes`**: pide `areas(userId, null)` con `knownRevision` 0, con otra `knownContentVersion` o con una revisión mayor que la del servidor, y `areas(userId, knownRevision)` si no; con `full` en consecuencia; lo pide **después** de subir la revisión;
     - **un lote con cero operaciones** no escribe y devuelve lo que cambió;
     - **el interbloqueo**: si el procesador falso lanza una excepción con el mensaje de un interbloqueo en el primer intento, el segundo intento da los mismos resultados y **un solo** registro por operación (nada se acumula entre intentos);
     - **`SyncWriteFailed`**: una `QueryException` con una cadena centinela en sus bindings sale como `SyncWriteFailed`, cuyo mensaje no la contiene, sin `previous`, y el log guarda sólo el SQLSTATE y el código.
   - **`SyncRouteTest`** (con `Browser`, los puertos falsos y `ProgressLimiters::register()` armado en la prueba): sin sesión 401, sin `X-Taller-User` 409 `account_mismatch`, cuenta deshabilitada 403 y sin verificar 403; un sobre inválido (sin `epoch`, `sentAt` mal formado, `operations` que no es lista, un `id` que no es UUID v4, 201 operaciones, un cuerpo con un surrogate suelto) da 422 `validation_failed` con `errors` y no escribe; `knownRevision` ausente vale 0; la 61.ª del minuto da 429 con `Retry-After`; `epoch_mismatch` y `client_outdated` salen con su código y su mensaje en español, y `epoch_mismatch` con `{epoch, revision}`; un `user_id` en el cuerpo se ignora.
   Corrélas: fallan porque las clases no existen.
2. **Implementá.** Referencia del orden de `SyncService::sync` (las referencias y los rangos, **antes** del candado; todo lo demás, adentro):

```php
public function sync(int $userId, SyncRequest $request): SyncOutcome
{
    if (! in_array($request->format, config()->array('progress.sync.formats'), true)) {
        throw new ClientOutdated;
    }
    $contentVersion = $this->content->latestVersion() ?? throw new ContentNotImported;
    $checked = $this->processor->check($this->processor->decode($request->operations), $contentVersion);   // sin candado
    $received = Instant::now();

    try {
        return $this->lock->within($userId, fn (ProgressHead $head) => $this->apply($head, $request, $checked, $contentVersion, $received));
    } catch (QueryException $error) {
        throw SyncWriteFailed::from($error);          // afuera de within: adentro rompería el reintento por interbloqueo
    }
}

private function apply(ProgressHead $head, SyncRequest $request, array $checked, string $contentVersion, CarbonImmutable $received): SyncOutcome
{
    if ($head->epoch !== $request->epoch) {
        throw new EpochMismatch($head->epoch, $head->revision);     // antes de todo: no se recuerda ni un UUID
    }
    $known = $this->registry->lookup($head->userId, $this->idsOf($checked));
    $revision = $head->revision + 1;
    [$results, $records, $changed] = $this->process($checked, $known, $request, $received, $revision);   // un resultado por operación, en orden
    $this->registry->record($head->userId, $records, ClockCorrection::offsetMs($request->sentAt, $received), $received);
    if ($changed) {
        $head = $this->lock->advance($head, $received);
    }
    $full = $request->knownRevision === 0 || $request->knownContentVersion !== $contentVersion || $request->knownRevision > $head->revision;

    return new SyncOutcome($head->epoch, $head->revision, $received, $contentVersion, $results, $this->changes->areas($head->userId, $full ? null : $request->knownRevision), $full);
}
```

   `OperationRegistry` convierte el UUID a 16 bytes (`hex2bin(str_replace('-', '', $id))`) y el hash a 32, lee con una sola consulta por lote y escribe los registros con un `INSERT` de varias filas. `process` recorre las operaciones comprobadas en orden y mantiene `$known` al día con lo que registra, para los repetidos dentro del lote.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde y 0 errores de PHPStan en el nivel 9.

### Tarea 6.2 · `POST /api/sync` (T013)

- **Crea:** `backend/api/app/Http/Controllers/SyncController.php`, `backend/api/app/Http/Requests/SyncBodyRequest.php`, `backend/api/app/Http/ProgressLimiters.php` y `backend/api/routes/api/sync.php`.
- **Entrega:** la ruta, que usa `SyncService` y arma la respuesta de [http.md](./contracts/http.md), sección 3.4.

**Pasos:**

1. Las pruebas son las de `SyncRouteTest` de T012 (la ruta, la validación del sobre, los estados y el límite), que fallan hasta que esta tarea las cumple. Sumá: la respuesta lleva `Cache-Control: no-store`; `ContentNotImported` y las dos excepciones nuevas salen con el JSON `{message, code}` (y `{epoch, revision}`), que las pruebas escriben a mano desde http.md, sección 6.
2. **Implementá.** `SyncBodyRequest` valida el sobre (los tipos, los rangos, la forma UUID v4 y ISO) y entrega un `SyncRequest` `readonly` (`knownRevision` ausente vale 0; `sentAt` y `at` se parsean con el formato estricto); las operaciones pasan **crudas** al servicio. `SyncController` llama a `SyncService`, convierte `EpochMismatch` y `ClientOutdated` con `ApiError::of(ApiCode::…)` (los dos códigos los dejó el coordinador en T001) y responde `$outcome->toArray()`. `ProgressLimiters::register()` define `sync`: `Limit::perMinute(config()->integer('progress.sync.throttle_per_minute'))->by('user:'.$request->user()->id)`. La ruta: `Route::middleware(['account', 'verified', 'throttle:sync'])->group(fn () => Route::post('/sync', SyncController::class));`.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde. El enlace de las clases de producción (`OperationProcessor`, `ChangesReader`, el limitador) y la línea de `bootstrap/app.php` los pone el coordinador en T015: hasta entonces las pruebas hacen su propio cableado en un `beforeEach`.

## 7. Operación: la poda (dueño O, onda 2)

**Cubre:** FR-055 (la parte de `sync_operations`).

**Entrega:** al llegar S2, el comando de poda. La línea del `scheduler` es de T015.

### Tarea 7.1 · `progress:prune-sync-operations` (T014)

- **Crea:** `backend/api/app/Progress/SyncOperationsPruner.php`, `backend/api/app/Console/Commands/PruneSyncOperations.php` y `backend/api/tests/Feature/Progress/PruneSyncOperationsTest.php`.

**Pasos:**

1. **Primero las pruebas**, con `Carbon::setTestNow` y sin leer el reloj de pared:
   - una fila con `received_at` de hace 14 días y un milisegundo se borra, una de hace 14 días menos un milisegundo se conserva, y una cuenta no afecta a otra;
   - con más filas vencidas que un lote (la prueba fija `progress.batches.prune` en 5 y siembra 12), se borran de a lotes y las sentencias son `delete from \`sync_operations\` where \`received_at\` < ? order by \`received_at\` limit 5`, **todas con `limit`**, y el tope de lotes por corrida (`progress.batches.prune_max`, fijado en 1 en otra prueba) frena el bucle;
   - el comando informa cuántas filas borró y sale con 0; un segundo corrida no borra nada;
   - la poda **no toca** `progress_heads` ni las tablas de estado.
   Corrélas: fallan porque no existen.
2. **Implementá.** `SyncOperationsPruner::prune(CarbonImmutable $now): int` borra con `DB::table('sync_operations')->where('received_at', '<', $cutoff)->orderBy('received_at')->limit(N)->delete()` en un bucle hasta que devuelve menos de N filas o llega al tope; el comando es `progress:prune-sync-operations` y lo corre cada hora el `scheduler` (T015).
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde. Que un UUID podado vuelva a aplicarse sin pisar nada más nuevo lo prueba T016, con el servicio real.

## 8. Integración, punta a punta, Nginx, el check con el stack, documentación y compuerta (coordinador y O, onda 3)

**Cubre:** FR-004, FR-010, FR-012, FR-014, FR-016 a FR-018, FR-054 a FR-057, FR-084, FR-087 y FR-088; SC-002, SC-003, SC-006, SC-008, SC-010 y SC-011.

**Entrega:** una rama que parte de S2, con lo de todos los dueños integrado, el cableado de producción, las pruebas con los servicios reales, la ubicación de Nginx, el check contra el stack, la documentación y la evidencia de cierre. Es lo único que levanta el stack (`docker compose up`).

### Tarea 8.1 · Las líneas de integración y el cableado (T015)

- **Modifica:** `backend/api/bootstrap/app.php`, `backend/api/app/Providers/AppServiceProvider.php`, `backend/api/routes/console.php`, `backend/api/tests/Feature/ScheduleTest.php` y, si ya está integrado, el registro `UserData` de C3b.
- **Crea:** `backend/api/tests/Feature/Progress/WiringTest.php`.

**Pasos:**

1. **Primero las pruebas**, que fallan porque las líneas no están:
   - **`WiringTest`**: `app(OperationProcessor::class)` es un `DatabaseOperationProcessor` y `app(ChangesReader::class)` es un `ProgressSnapshotReader`; `RateLimiter::limiter('sync')` no es `null`; las dos rutas están registradas con `['account', 'verified']` (y `throttle:sync` la de sincronización); y **`/api/sync` no recorta ni convierte `''`**: una ruta de prueba con `TrimStrings` y `ConvertEmptyStringsToNull` bajo `api/sync` recibe `'  espacios  '` y `''` tal cual, mientras una ruta hermana sí los transforma.
   - **`ScheduleTest`** suma `progress:prune-sync-operations` (cada hora, sin solaparse) a su lista exacta.
2. **Las líneas**, las de la tabla «Líneas de integración» de arriba para T015. Si C3a ya integró su `RouteAccessTest` y su `ExpectedAccountMatrixTest`, tienen que dar verde con las dos rutas de D1a (y fallarían si una quedara fuera del grupo `account`).
3. `npm run api:test` completo, `npm run api:analyse`, `npm run api:format:check` y `npm test`: verdes.

**Compuerta:** lo anterior. Con las líneas puestas, `POST /api/sync` y `GET /api/progress` funcionan de punta a punta con los servicios reales.

### Tarea 8.2 · Las pruebas con los servicios reales (T016)

- **Crea:** `backend/api/tests/Feature/Progress/{SyncEndpointTest,ServerCasesTest,SnapshotDeltaTest,LogsWithoutTextTest,SyncAccessMatrixTest,SyncThrottleTest,TextFidelityTest}.php` y `backend/api/tests/Concurrency/SyncConcurrencyTest.php`.

**Pasos:**

1. **Primero las pruebas** (corren contra HTTP con `Browser` y los servicios reales; algunas fallan por un defecto de lo integrado, y ése es el hallazgo):
   - **`SyncEndpointTest`**: los ocho escenarios de US2 sobre el cable: dos dispositivos que editan campos distintos terminan con las dos ediciones, y el del mismo campo, con el reloj más nuevo, en los dos órdenes de llegada; un dispositivo adelantado no gana «para siempre»; una lápida contra una marca más vieja; una predicción correcta o una ayuda no se pierden; una respuesta con otra versión de contenido sale `stale_content`; un lote reenviado sale `duplicate`; lo que perdió una fusión vuelve en `changes` con el valor ganador.
   - **`ServerCasesTest`**: los 43 `serverCases` de `tests/Fixtures/shared/merge-cases.json`, por `POST /api/sync`: cada uno, con `Carbon::setTestNow(serverNow)` por lote, da los resultados, los estados guardados (leídos con `MergeKinds`) y, en los rechazos, **ninguna fila escrita**; los `repeat` se expanden; la suma `reject/mixed-batch-applies-the-valid-one`.
   - **`SnapshotDeltaTest`**: para secuencias de lotes con operaciones de los dieciséis tipos (una semilla fija y una variante aleatoria que imprime su semilla si falla), la foto de la revisión `R` más el delta hasta `R'` es **igual** a la foto completa en `R'`: 0 diferencias, también para una fila que cambió `RunCloser::close`; fuera de «Borrar todo», 0 filas de estado se borran (SC-006).
   - **`TextFidelityTest`**: los casos `text/to-empty-string` y `text/whitespace-kept` de los cuatro tipos de texto, **a través de HTTP**: la cadena vacía queda `''` y los espacios y saltos de línea, intactos (M11).
   - **`LogsWithoutTextTest`**: una cadena centinela en una reflexión, un borrador, una nota del taller y una del recorrido, y un error de base forzado, no dejan la cadena en ningún registro (se capturan con un `Monolog\Handler\TestHandler`) ni en la excepción.
   - **`SyncAccessMatrixTest`**: lo ajeno no se alcanza: una cuenta B no lee ni modifica lo de A por ninguna de las dos rutas, aunque mande un `user_id`; sin `X-Taller-User`, 409; con el de otra cuenta, 409 y sin una sola escritura; y una cuenta de rol `admin` sincroniza y lee igual que un alumno (ADR 0006, S5).
   - **`SyncThrottleTest`**: la 61.ª sincronización del minuto recibe 429 con `Retry-After`; la 60.ª no; con los drivers `database` (`Browser::useDatabaseDrivers()`).
   - **`SyncConcurrencyTest`** (suite `Concurrency`, `Parallel`): **el mismo lote** enviado a la vez desde veinte procesos aplica una vez (los otros diecinueve, `duplicate`) y sube la revisión una vez; **dos lotes distintos** de una cuenta se serializan (revisiones `R + 1` y `R + 2`, las dos ediciones al final); **un lote contra el cierre de una ejecución** de B2 se serializa sin interbloqueo y el delta trae las dos cosas; **dos cuentas distintas no se esperan** (un proceso que mantiene el candado de A hasta que otro, que sincroniza B, termina, no se bloquea: la señal es una fila en `cache`, no un reloj).
   - **Un UUID podado** (con `progress:prune-sync-operations`, tras 15 días): reenviar la operación vieja la aplica de nuevo y no pisa un valor más nuevo.
2. Corrélas con lo integrado. Si alguna falla, es un defecto del código nuevo: su esperado no se toca, se informa al dueño.
3. `npm run api:test` (también `-- --order-by=random`), `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** todas en verde, o con el defecto informado y corregido por su dueño.

### Tarea 8.3 · Nginx: la ubicación de `/api/sync` (T017)

- **Modifica:** `docker/nginx/nginx.conf`, `qa/nginx-api-blocks-check.ts` y `backend/api/scripts/smoke.sh`.

**Pasos:**

1. **Primero los checks**, que fallan:
   - **`qa/nginx-api-blocks-check.ts`** (estático, en `npm test`; lo creó B2) pasa a recorrer también `location = /api/sync`: quita su línea `client_max_body_size 2m;` y exige que las directivas que quedan sean **las mismas, en el mismo orden**, que las de `location ^~ /api/` (el `set $php_upstream`, `include fastcgi_params`, los `fastcgi_param`, el `access_log`, el `limit_req` y el `error_page 429`); y exige esa línea en la de `/api/sync` y que la de `/api/` no la tenga.
   - **`smoke.sh`** suma, con el stack levantado: un cuerpo de 2 MiB más un byte a `POST /api/sync` da 413 (Nginx lo corta antes de PHP); `GET /api/progress` sin sesión da 401 en JSON.
2. **Implementá**, con esta referencia (sin ejecutar): una ubicación hermana que **repite** el bloque de `/api/` (el `set` no se hereda a una ubicación anidada) y suma el tope:

```nginx
location = /api/sync {
    client_max_body_size 2m;
    # …y a partir de acá, las mismas directivas que `location ^~ /api/`, en el mismo orden
}
```

3. Con el stack (`docker compose up --build -d --wait`): `npm test` (el check estático), `docker compose exec -T taller nginx -t` y `npm run api:smoke`.

**Compuerta:** el check estático en verde dentro de `npm test`, `nginx -t` con `successful` y el smoke con las comprobaciones nuevas en verde. La ubicación de importación (24 MiB) y `post_max_size` son de D1b.

### Tarea 8.4 · El check de punta a punta con el stack (T018)

- **Crea:** `qa/api-sync-check.ts`. El coordinador suma `"api:sync:check": "node qa/api-sync-check.ts"` a `package.json`.
- **Entrega:** `npm run api:sync:check`, FR-087: la convergencia de SC-002 y la medición de SC-010. No forma parte de `npm test`, igual que `api:content:check`.

**Pasos:**

1. Parte de S3 y de `qa/lib/api-account.ts` (T024 de C3a), que crea cuentas de prueba, inicia sesión con cookie y CSRF, y las retira. Escribí el check por escenarios, que fallan mientras el stack no corra o la ruta no funcione:
   - **SC-002**: los escenarios 4 a 9 de [quickstart.md](./quickstart.md) con dos clientes de prueba (dos sesiones de la misma cuenta, cada una con su cola y su `knownRevision`), en los dos órdenes; al terminar, `GET /api/progress` de los dos clientes es la misma foto.
   - **SC-010** (una **medición**, sin objetivo): el tamaño de la foto completa de una cuenta con los 274 ejercicios con intento (sembrados con SQL de `root` por `docker compose exec -T mysql`, como el `sql()` de `deploy-check.sh`), el del lote mayor admitido, y la mediana y el p95 de `POST /api/sync` con 30 cuentas sincronizando a la vez (si el ayudante las crea en un tiempo razonable; si no, el check lo avisa y lo omite). Imprime las cifras junto con la estimación del ADR.
   - Al terminar, retira las cuentas y comprueba que no queda ninguna fila de D1a ni de B2 con su `user_id`, también si un escenario falla.
2. Corrélo contra el stack de T017: los escenarios dan lo esperado. Lo que no se pueda correr se informa como límite.
3. `npm run lint`, `npm run format:check` y `npm run typecheck`.

**Compuerta:** SC-002 y los escenarios en verde y las cifras de SC-010 anotadas en el mensaje del commit y en el PR.

### Tarea 8.5 · La documentación (T019)

- **Modifica:** `README.md`, `backend/api/AGENTS.md`, `AGENTS.md`, `docs/architecture.md` y `qa/AGENTS.md`.
- **Entrega:** lo que cambió, en el mismo cambio (constitución, principio I).

**Pasos:**

1. `README.md`: la línea del currículo que dice que las claves de etapa «todavía no se publican» pasa a decir que se publican como `id` (y que `v1Index` no); suma el comando `api:sync:check`, la ruta de la poda y una mención de que el progreso se sincroniza con el servidor (sin prometer el cliente, que es de D1c).
2. `backend/api/AGENTS.md`: una sección «Progreso (D1a)» con el mapa de `app/Progress/` (`Operations`, `Merge`, `Snapshot`, `Sync`), `AccountLock` como única puerta de la cabecera, que toda escritura de progreso es un `INSERT … ON DUPLICATE KEY UPDATE` con la guarda de la revisión primero y el texto comparado con `CAST(… AS BINARY)`, que `/api/sync` no recorta ni convierte `''`, el fixture compartido en `qa/fixtures/shared/` (no se regenera) y que ningún registro lleva texto del alumno.
3. `docs/architecture.md`: el mapa suma `app/Progress/`, las rutas, el módulo `frontend/src/features/progress-sync/` y el fixture; y la fila del contenido en MySQL ya no dice que las claves de etapa no se publican.
4. `qa/AGENTS.md`: la fila de la API suma `api:sync:check`, y los dos checks nuevos de `npm test` (`merge-fixture-check` y `route-milestones-check`).
5. `AGENTS.md`: el comando nuevo. **No se edita ningún ADR ni la hoja de ruta desde acá**: aprobar el ADR 0006 y registrar sus enmiendas es del usuario (spec, «Acciones del usuario»), y la hoja de ruta la integra el coordinador.
6. Comprobá rutas, comandos y enlaces locales de lo que tocaste, y `git diff --check`.

**Compuerta:** cada ruta, comando y enlace que cita lo nuevo existe; ninguna frase de la documentación dice ya que las claves de etapa no se publican.

### Tarea 8.6 · La compuerta y la evidencia (T020)

- **Modifica:** `specs/backend-multiusuario/roadmap.md` (sólo al entregar; ver más abajo) y, con `/speckit-converge`, los documentos de esta feature.
- **Entrega:** la evidencia de que D1a está terminado.

**Pasos:**

1. En la rama de integración, con el stack limpio (`COMPOSE_PROJECT_NAME` propio), corré y anotá el resultado real de cada uno (SC-011): `npm ci && npm run build && npm test && npm run lint && npm run format:check`, `npm run api:test` (también `-- --order-by=random`), `npm run api:format:check`, `npm run api:analyse` (0 errores, sin baseline), `git diff --check`, y con el stack: `npm run api:smoke`, `npm run api:content:check` (las 18 porciones con la plantilla de B2, y con los `id` de etapa) y `npm run api:sync:check`.
2. Los escenarios de [quickstart.md](./quickstart.md) que no automatiza ningún check: **1** (el informe del primer import sobre una base con el contenido de antes y el segundo import sin escribir) y **3** (el recuento de tablas, columnas y claves).
3. `sh backend/api/scripts/deploy-check.sh` sigue pasando (el primer import escribe las 100 filas y el despliegue no se cuelga).
4. `/speckit-converge` para agregar a `tasks.md` lo que falte, y el PR con el título y la descripción en inglés, con el problema completo, lo verificado, lo pendiente y las cifras de SC-010.
5. Sólo con esa evidencia, el coordinador pasa D1a a «Entregado» en `specs/backend-multiusuario/roadmap.md`, con la nota de qué se verificó y qué no (la planificación lo deja en «Planificado»).

**Compuerta:** cada comando de SC-011 corrido y anotado; los límites (sin la aceptación en navegador, que es de D1c, y lo que no se pudo correr) escritos en el PR.

## Cobertura de requisitos

Cada requisito con las tareas que lo implementan o lo prueban. `tasks.md` cita los mismos requisitos en cada línea. Los de D1b y D1c no están acá, salvo donde la tabla de «Propuestas del plan» parte uno.

| Requisito | Tareas |
| --- | --- |
| FR-001 | T005, T006, T009, T010 |
| FR-002 | T012, T016 |
| FR-003 | T005, T006, T010 |
| FR-004 | T012, T016 |
| FR-005 | T009, T010, T016 |
| FR-006 | T009, T010 |
| FR-007 | T010, T012, T016 |
| FR-008 | T009, T010, T016 |
| FR-009 | T009, T010, T016 |
| FR-010 | T010, T012, T016 |
| FR-011 | T002, T016 |
| FR-012 | T013, T016 |
| FR-013 | T012, T016 |
| FR-014 | T012, T014, T016 |
| FR-015 | T012, T013 |
| FR-016 | T012, T016 |
| FR-017 | T011, T012, T016 |
| FR-018 | T001, T012, T013, T016, T017 |
| FR-019 | T011, T012 |
| FR-020, FR-021, FR-022 | T011 |
| FR-023 | T011, T012 |
| FR-046, FR-047, FR-048, FR-049 | T007, T008 |
| FR-050 | T008, T020 |
| FR-051, FR-052 | T002, T003, T004, T010 |
| FR-053 | T002, T003 |
| FR-054 | T011, T016 |
| FR-055 | T014, T015, T016 |
| FR-056 | T013, T015, T017 |
| FR-057 | T013, T016 |
| FR-058 | T012, T013 |
| FR-059 | T001, T003, T020 |
| FR-080, FR-081 | T005, T006, T010 |
| FR-082 | T005, T006, T010, T016 |
| FR-083 | T001, T005 |
| FR-084 | T002, T010, T011, T012, T014, T016 |
| FR-087 | T018 |
| FR-088 | T020 |
| SC-002 | T005, T006, T010, T016, T018 |
| SC-003 | T012, T016, T018 |
| SC-006 | T011, T016, T018 |
| SC-007 | T007, T008, T020 |
| SC-008 (sincronización) | T013, T016, T017 |
| SC-009 (las diez tablas) | T002, T003 |
| SC-010 | T018 |
| SC-011 | T020 |
| US2 (el servidor) | T009 a T013, T016, T018 |
| US6 (id de etapa, foto completa por contenido, lo retirado) | T007, T008, T011, T016 |
| US7 | T002, T014, T016, T017, T018 |

## Descargas y permisos

**Ninguna.** D1a no agrega paquetes de Composer ni de npm (FR-059) ni imágenes: usa `mysql:9.7`, la imagen de `php` y la de `taller`, ya fijadas, y Node 24. Las pruebas que usan Docker (T002, T010 a T020) usan las imágenes que ya están en la máquina; si un comando intenta descargar algo, se pide permiso con nombre, origen y tamaño antes de bajarlo (constitución, principio VII).

## Lo que quedó sin verificar

Esta planificación ejecutó el TypeScript y no ejecutó nada del PHP, del SQL ni de Nginx (R22). Lo que hay que medir o comprobar al implementar, y quién lo hace:

| Qué | Cómo se resuelve |
| --- | --- |
| Todo el PHP, el SQL y la configuración de Nginx de este plan: las firmas, las sentencias y los scripts | Las pruebas de cada tarea; si algo no compila o no corre, se corrige la referencia, no la prueba |
| Que `INSERT … ON DUPLICATE KEY UPDATE` devuelva 1, 2 y 0 filas con PDO nativo en MySQL 9.7 (la configuración no activa `MYSQL_ATTR_FOUND_ROWS`, y el código de Laravel 13.x tampoco) | `AffectedRowsTest` de T010, antes que todo lo demás; si falla, el respaldo de R4 |
| Que la guarda con `CAST(… AS BINARY)` funcione sobre `TEXT` y `MEDIUMTEXT` con la colación de la conexión, sin advertencias de deprecación (el operador `BINARY` sí las da en 9.7), y que `<=>` se evalúe como se espera con alias de fila | `MergeFixtureTest` (los casos `text/*`) y la mutación M10 |
| Que MySQL 9.7 acepte `INSERT … AS n ON DUPLICATE KEY UPDATE` con las columnas de la fila existente calificadas con el nombre de la tabla, y que las asignaciones vean los valores anteriores en el orden dicho | `MergeFixtureTest` y `AffectedRowsTest` |
| El DDL de [data-model.md](./data-model.md) contra MySQL 9.7: las claves compuestas hacia `workshop_progress`, hacia `workshop_objectives` y hacia `workshop_steps`, y los índices | `SchemaTest` y `migrate:fresh` de T002 y T003 |
| Qué decide D32 (`ENUM` o `VARCHAR(8)` con clave a `languages`) | `ProgressEnumFkTest` de T002; el plan trae las dos variantes |
| Que `trimStrings(except: […])` y `convertEmptyStringsToNull(except: […])` acumulen con los de B2 en Laravel 13 | `WiringTest` de T015 y `TextFidelityTest` de T016 |
| Que `PreventRequestForgery` (CSRF) no bloquee la ruta en las pruebas con `Browser` y que con `enforceCsrf()` dé 419 | Las pruebas de HTTP de T012 y T016, como en C3a |
| Que `json_decode` rechace un surrogate suelto y que el servidor responda 422 y no 500 | `SyncRouteTest` de T012 |
| Que el orden del grupo `account` y `throttle:sync` dé el orden de evaluación de [http.md](./contracts/http.md), sección 2 | `SyncRouteTest` de T012 |
| El tope de 200 operaciones: cuánto dura un lote lleno con el candado tomado | SC-010 (T018) |
| Que el `.dockerignore` de la raíz no excluya el fixture y que la línea de B2 del Dockerfile copie `qa/fixtures/shared/` también con archivos nuevos | T001, `ls` dentro de la imagen de pruebas |
| La línea de base de B2: se leyó de su plan y no del código, que todavía no existe. Los números del quickstart, escenario 1, se midieron sobre `master` sin B2; que B2 no mueve el documento, las porciones, `Content-Version` ni el volcado se infiere de su R1 (`curriculum.json` byte por byte igual), no se midió | T001 y T007: el script de [reference-merge.md](./reference-merge.md), sección 8, contra la base con B2 |
| La ubicación hermana de Nginx se comporte como la de `/api/` | `nginx -t`, el check estático y el smoke de T017 |
| La ventana de despliegue de R16: un `php` anterior ante filas con otro `key_order` | `deploy-check.sh` de T020; el riesgo es de segundos |
| La aceptación en navegador real: es del cliente (D1c) | No es de D1a |

## Complexity Tracking

Sin violaciones de la constitución que justificar. Hay desvíos de la spec y del ADR 0006 que el usuario todavía no conoce y que este plan pide confirmar, y están en «Propuestas del plan»:

- **La fusión en TypeScript en D1a** (R1): la tabla de partición de la spec dice «PHP y SQL (Pest)».
- **Las decisiones de forma** del contrato (R5 a R10): `format` 2, 200 operaciones, `duplicate` con `reason`, `stale_content` en el quiz, la forma de la foto y sus estados.
- **`NULL` en las fechas que sólo crecen** (R6): una elección sobre algo que la spec deja en «fecha más temprana».
- **Un bloque de migraciones con otra fecha** (R13).
- **Seis `CHECK` en la tabla y los demás en el escritor** (FR-052, estricto: ninguno que toque una fecha), una elección de C2 que el ADR ya registró.
