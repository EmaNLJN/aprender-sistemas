# Implementation Plan: D1b · Importación y «Borrar todo»

**Branch**: `007-d1-progreso-sincronizacion` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-d1-progreso-sincronizacion/spec.md`, en su segunda parte, **D1b** (ver «Decisiones del usuario»). Decisiones: [research-d1b.md](./research-d1b.md), que sigue la numeración de [research.md](./research.md). Tablas, escrituras y tipos: [data-model-d1b.md](./data-model-d1b.md). Contratos: [HTTP de D1b](./contracts/http-d1b.md) y [el fixture de importación y la proyección](./contracts/import-fixture.md). Validación: [quickstart-d1b.md](./quickstart-d1b.md). Lo que D1b hereda de D1a está en su [plan](./plan.md), sus [contratos](./contracts/http.md) y su [modelo de datos](./data-model.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completas la sección de tu dueño y «Reglas para todos los agentes», y los documentos de arriba que toquen tu tarea. [tasks-d1b.md](./tasks-d1b.md) tiene una línea por tarea (T001…) y remite acá.
>
> **Estado.** Planificado, **sin implementar**. Como D1a, se apoya en el ADR 0006, que sigue en propuesta: si el usuario lo enmienda, cambia el plan.
>
> **Por qué los archivos llevan `-d1b`.** D1 es una spec con un plan por parte. Los scripts de Spec Kit buscan `plan.md` y `tasks.md` con nombres fijos, y esos son de D1a: las skills se siguieron sin los scripts, y el análisis se hizo a mano (R23).
>
> **Línea base del código.** Se verificó leyendo las ramas el 2026-10-06:
>
> - **`feat/d1a-sincronizacion` (a14f6f2).** D1a tiene integradas las tareas T002 a T014 y T017: esquema, fixture, id de etapa, operaciones, escritor, foto, sincronización, poda y la ubicación de Nginx de `/api/sync`. Le faltan T015, T016 y T018 a T020: el cableado, las pruebas de punta a punta, el check, la documentación y la compuerta. Esa rama trae C3a y B2 (4ffe29a), que ya están entregados.
> - **C3b (`feat/c3b-administracion`, e57d3ba).** Está en implementación y todavía no entra en esa base. T003 tiene una parte que depende de que esté (R39).
> - **F2, unidad 1 (`f2a/u1-almacenes`, fbaaa40).** Tampoco está en `master`. Sólo la necesita el check de T007 (R38).
>
> **Código verificado y sin ejecutar.** Se planificó sin PHP, sin Composer y sin Docker. **Corrió**, con Node, la medición de las tres fixtures (R44). **No corrió** nada del PHP, del SQL ni de Nginx de este plan: es referencia, y obliga las firmas, los contratos y las pruebas. «Lo que quedó sin verificar» lista lo que hay que medir al implementar.

## Summary

D1b trae el progreso v1 de cada navegador a la cuenta sin perder nada, y da a «Borrar todo» una forma que se propaga a todos los dispositivos. Entrega `POST /api/progress/import`, `POST /api/progress/reset`, las dos tablas que faltaban de las 12 de D1 (`progress_imports` y `campaign_seals`), la poda del crudo a los 90 días, y el criterio de aceptación de la hoja de ruta: las tres fixtures de `master` entran a las tablas y vuelven a salir sin pérdida. El enfoque:

- **El cliente normaliza y el servidor valida.** El normalizado es la salida de los parsers de carga del v1, uno por almacén y nombrado en el contrato (R24). El servidor rechaza con 422 lo que esos parsers no pueden producir, y omite con informe lo que producen y él no puede guardar tal cual (R25). Nunca reescribe la normalización (FR-025).
- **Una sola regla de fusión.** Lo importado se escribe con el SQL de D1a (`UpsertSql`) y el reloj nulo, que es «anterior a todo»: nunca pisa un dato de v2 (R27). Lo que sólo trae el v1 (sellos, contador, punteros, orden) tiene cuatro sentencias propias, conmutativas e idempotentes (R28).
- **Todo bajo el candado de la cuenta.** La importación y el reset toman `progress_heads` con `AccountLock` de B2. La importación decodifica fuera del candado, y adentro comprueba la época, lo repetido y la confirmación, escribe y sube la revisión una vez. El reset sube la época y borra el estado en una transacción, y cancela las ejecuciones después.
- **Un oráculo de TypeScript y una proyección en las pruebas.** El fixture `import-cases.json` lleva el crudo y el normalizado de los parsers reales, congelados. Pest importa cada caso, proyecta las tablas al v1 y exige que la proyección no pierda nada del crudo y que sea igual al normalizado (SC-001).
- **Cada dueño, sus archivos.** Lo que D1b comparte con B2, C3a, C3b y D1a son líneas de integración del coordinador, o cambios de una sola tarea nombrados abajo.

## Decisiones del usuario

El usuario respondió el clarify de D1 el 2026-10-06: aceptó la partición en tres y la opción recomendada en las cuatro preguntas ([spec.md](./spec.md), «Clarifications»). Así llegan a D1b:

| Pregunta | Respuesta | Qué hace D1b |
| --- | --- | --- |
| Partición | D1a, D1b y D1c | Este plan es **D1b**: FR-024 a FR-045, `progress_imports` y `campaign_seals`, y FR-087 y FR-088, que repite cada parte. También cierra la parte de D1b de los requisitos que cruzan la frontera («Propuestas del plan», punto 1) |
| Q1, importación por navegador | A: varias por cuenta, combinables y con confirmación | `progress_imports` lleva una fila por importación, con el índice `(raw_sha256, user_id)`, y la confirmación tiene tres motivos que no se nombran (FR-027 a FR-029) |
| Q2, alcance de «Borrar todo» | A: sólo el estado | El reset borra las tablas de `ProgressTables::STATE`, y conserva los intentos, los payloads y las importaciones hasta su retención (FR-042). Lo que esto deja abierto con B2 lo cierra R35 |
| Q3, al salir | A | Nada: es del cliente (D1c) |
| Q4, lo resuelto antes de A4 | A: el cliente espera a A4; el servidor, no | D1b no espera a A4. Acepta ya el `attemptId` que A4 va a guardar en el resultado v1 (R42) |

## Propuestas del plan

Esto es del plan y no se le preguntó al usuario: decisiones sobre lo que la spec o el ADR dejan abierto, y lo que D1b supone de otros ítems. Cada una se cambia en un lugar.

**1. Requisitos que cruzan la frontera.** La tabla de partición de la spec asigna rangos, y el plan de D1a ya repartió los que cruzan ([plan.md](./plan.md), «Propuestas del plan», punto 3). D1b cierra lo suyo:

| Requisito | D1b entrega | Queda para |
| --- | --- | --- |
| FR-051 y SC-009 | `progress_imports` y `campaign_seals` (migraciones 100011 y 100012), y el `DELETE FROM users` con las 12 tablas de D1 y las 2 de B2 pobladas | — |
| FR-053 | La cascada de las dos tablas, la búsqueda de punteros cruzados después de importar y la declaración para `UserData` (R39) | C3b, si se integra después: toma las filas de [data-model-d1b.md](./data-model-d1b.md), sección 8 |
| FR-055 | La poda de `raw_payload` a los 90 días | — |
| FR-056 | `location = /api/progress/import` con 24 MiB, `post_max_size = 24M` y los limitadores `import` y `reset` | — |
| FR-057 y FR-058 | Las dos rutas y sus sobres, con `format` | — |
| FR-084 | Las pruebas de la importación, del reset y de su concurrencia | D1c: el cliente |
| SC-008 | La 4.ª importación de la hora, el 4.º reset del día y el 413 de 24 MiB | — |
| SC-010 | Una medición de la importación más grande, que extiende el criterio a D1b | — |
| SC-001 y SC-005 | Enteros | — |

**2. Decisiones sobre lo que la spec o el ADR dejan abierto.** Cada una está en research-d1b.md:

- el normalizado son los parsers de carga, y el crudo de `storage`, una serialización canónica (R24);
- la frontera entre 422 y lo omitido con informe (R25);
- los sustitutos sueltos, que reemplaza el cliente y el servidor informa (R26);
- la escritura con `UpsertSql` y no con `apply` (R27);
- las reglas de las columnas que sólo escribe la importación (R28);
- las notas vacías por omisión, que no se escriben (R29);
- la fecha del payload legado, la de la importación (R30);
- una importación que no cambia ninguna fila de estado no sube la revisión: FR-010 manda sobre el «sube la revisión una vez» de FR-034, que se lee como «a lo sumo una vez» (R33);
- una `importId` reusada responde 422 sin un código nuevo (R31);
- el orden de evaluación, que refina FR-030 (R32);
- la forma del informe y sus motivos (R33);
- el motivo nulo de la cancelación en el reset (R34);
- aceptar la poda de B2 después de un reset (R35);
- la poda del crudo sin un índice nuevo (R37);
- `batchesBy: 'id'` para `progress_imports` en la supresión (R39);
- la forma de los sellos en la foto (R40);
- el grupo de repaso legado incompleto (R41).

**3. Hallazgos para otros ítems.** Los resuelve el coordinador:

- **D1a.**
  - R20 decía que D1b usaría `OperationProcessor::apply`. D1b usa `UpsertSql::row`, el SQL que hay debajo (R27), sin cambios en el código de D1a.
  - Dos líneas de su contrato cambian con D1b (R41 y R40): `review` puede venir con `confidence: null` en un grupo legado, y `campaign.seals` deja de ser `[]`. Conviene que D1a lo sepa antes de cerrar su documentación (T019 de D1a).
  - `ProgressInvariants::REVIEW_GROUP` pasa a mirar sólo el grupo con reloj.
- **B2.** La poda de payloads, después de un reset, se lleva el código de la época anterior a los 90 días (R35). No hay nada que cambiar en B2; el aviso de privacidad (pregunta 14) tiene que nombrarlo. `ActiveRuns::cancelAllOf` suma el motivo como parámetro (T001).
- **A4.** El resultado v1 suma `attemptId`, con ese nombre, y `sanitizeResult` tiene que conservarlo (R42).
- **D1c.** Lo de R42: el crudo, los parsers, `toWellFormed`, el ciclo de la `importId`, el grupo de repaso incompleto y el check del fixture con sus parsers.
- **C3b.** Las dos tablas, `PopulatedAccount` y la sección `imports` (R39). Si C3b se integra antes que D1b, entran con T003.
- **F2.** El check de T007 importa `parseRouteProgress` y `parseSavedLab` de la unidad 1 (R38).
- **F8.** La página «Método» consume [http-d1b.md](./contracts/http-d1b.md): F8 depende de D1b.

**4. Dependencias.**

- **D1b parte de D1a con su S2 integrado**, que ya está en la rama: el escritor, la foto, `EpochMismatch`, `ClientOutdated` y `ProgressLimiters` existen y se verificaron.
- **Las líneas de integración que D1a todavía no puso** (`bootstrap/app.php`, `AppServiceProvider`, `routes/console.php`, `ScheduleTest`, `smoke.sh` y `package.json`) son de los mismos archivos que las de D1b. Las pone el mismo coordinador, primero las de D1a.
- **C3a, B2 y C2** están entregados.

## Technical Context

**Language/Version**: PHP 8.5 (FPM) y Laravel 13.x en `backend/api/`, sin sintaxis posterior a PHP 8.3 y sin `declare(strict_types=1)`; TypeScript 6.0 con Node 24 en `qa/`.

**Primary Dependencies**: ninguna nueva, ni de Composer ni de npm (FR-059). Usa el cliente de MySQL, el limitador y el planificador de Laravel, Larastan y Pest, ya instalados.

**Storage**: MySQL 9.7. Dos tablas nuevas ([data-model-d1b.md](./data-model-d1b.md)), con las migraciones `2026_10_06_100011` y `100012` que D1a reservó. D1b no altera ninguna tabla. Escribe filas en diez de D1a y en cuatro de B2.

**Testing**:

- **Pest contra MySQL real** (`npm run api:test`), con las suites:
  - `Unit`;
  - `Feature`;
  - `Content`, que corre el esquema, las migraciones y las fixtures con el contenido real importado (`content:import`);
  - `Concurrency`, la de B2 (procesos PHP en paralelo).
- **PHPStan** en el nivel 9 sin baseline (`npm run api:analyse`), y **Pint**.
- **TypeScript**: el check de `qa/` (`npm test`).
- **Con el stack levantado**: `npm run api:smoke` y el nuevo `npm run api:import:check`.

**Target Platform**: Docker Compose en un servidor, Linux o macOS. Cada dueño usa su propio `COMPOSE_PROJECT_NAME`.

**Project Type**: servicio web (la API Laravel) con Nginx delante, más un check de TypeScript.

**Performance Goals**: no hay un objetivo que cumplir. El check con el stack mide la importación más grande que admite el contrato: duración, memoria pico de PHP y cuánto tiempo queda tomado el candado. Lo que el diseño cuida:

- decodificar fuera del candado;
- a lo sumo una consulta por clase de contenido;
- de una a tres sentencias por fila;
- una consulta de intentos por resultado.

**Constraints**:

- sin paquetes nuevos y sin descargas;
- el crudo, opaco y byte por byte;
- una revisión por transacción que cambia estado;
- sólo «Borrar todo» borra filas de estado;
- los intentos, los payloads y las importaciones nunca se borran por un reset;
- el fixture, congelado;
- nivel 9 sin baseline ni `@phpstan-ignore`, y sin comentarios salvo los que exija la complejidad.

**Scale/Scope**:

- 2 rutas, 2 tablas (17 columnas, 3 claves foráneas) y 2 migraciones;
- unos 35 archivos en `backend/api/app/` y unos 30 de prueba;
- en TypeScript, un fixture, un lector y un check;
- 22 tareas en cuatro ondas, de la 0 a la 3.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `backend/api/AGENTS.md` (Collections y `Arr::`, Pest contra MySQL real, un `CREATE TABLE` por migración, `env()` sólo en `config/`) y `qa/AGENTS.md` (los checks son TypeScript y se suman a `qa/run-checks.ts`). T021 actualiza las guías, `README.md` y `docs/architecture.md` en el mismo cambio |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con sus pruebas, que fallan por la razón que dice el paso. Los esperados salen de fuera del código probado: las tablas de dominio de http-d1b.md, las filas por área escritas a mano (import-fixture.md, sección 8), los parsers v1 reales (el oráculo) y las columnas del ADR. El fixture se congela y no se regenera, y seis mutaciones lo prueban (J1 a J6). No hay mocks de la implementación: los falsos son de los dos puertos (`LegacyWriter` y `ChangesReader`), y la base, el contenido y la concurrencia son reales |
| III. Código entendible | Sí, con revisión | Clases chicas con nombre y contrato. Se revisan por su tabla de pruebas, y no se fragmentan por una cuota: `LegacyDecoder`, que valida cuatro secciones y puede pasar de 10 caminos por función, y `DatabaseLegacyWriter`, que es una secuencia de pasos con nombre, uno por área |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | D1b no cambia contenido. Lo retirado cuenta como existente. Fuera de «Borrar todo», ninguna escritura borra una fila de estado; los intentos y las importaciones quedan como historia |
| V. Capas y contratos explícitos | Sí | Dominio en `app/Progress/Import/` y `app/Progress/Reset/`, transporte en `app/Http/` y operación en `app/Console/`, con las firmas entre dueños fijadas en data-model-d1b.md. El único puerto nuevo (`LegacyWriter`) existe porque dos dueños lo usan a la vez. Ninguna capa, store ni framework nuevo |
| VI. Español, accesibilidad y portabilidad | Sí | Los documentos y los mensajes de la API, en español rioplatense; el código, las pruebas y los comentarios, en inglés. No hay interfaz. Los scripts son POSIX |
| VII. Secretos y salidas generadas fuera de Git | Sí | No hay secretos ni rutas locales. El fixture es un valor esperado de prueba, versionado a propósito con su huella. Sin dependencias nuevas |
| VIII. Flow-forward | Sí | `tasks-d1b.md` tiene una línea por tarea y, como mucho, su commit. Lo que falte se agrega al final. Al entregar D1, la carpeta queda inmutable |

## Project Structure

### Documentation (this feature)

```text
specs/007-d1-progreso-sincronizacion/
├── spec.md                  # qué y por qué (D1 entero)
├── plan.md, research.md, data-model.md, quickstart.md, tasks.md, reference-merge.md   # D1a
├── contracts/
│   ├── http.md, merge-rules.md                                                        # D1a
│   ├── http-d1b.md          # POST /api/progress/import y /reset, el normalizado, el informe y los errores
│   └── import-fixture.md    # el fixture de importación, la proyección v1 y el criterio sin pérdida
├── plan-d1b.md              # este archivo
├── research-d1b.md          # decisiones R23 a R44
├── data-model-d1b.md        # las dos tablas, cómo escribe la importación, el reset y los tipos entre dueños
├── quickstart-d1b.md        # escenarios de validación con sus comandos
├── tasks-d1b.md             # una línea por tarea
└── checklists/requirements.md
```

### Source Code (repository root)

```text
backend/api/
├── app/
│   ├── Progress/
│   │   ├── AccountLock.php                  (B2; S suma peek y reset)
│   │   ├── ProgressTables.php               (D1a; S suma campaign_seals)
│   │   ├── Snapshot/                        (D1a; S cambia ProgressSnapshotReader, CampaignWire y ExerciseWire)
│   │   ├── Import/Legacy/                   (D) ReportEntry, LegacyRoute, LegacyResult, LegacyExercise, LegacySeal,
│   │   │                                    LegacyCheckpoint, LegacyWorkshop, LegacyProgress, ContentFacts
│   │   ├── Import/                          (D) LegacyDecoder, ImportContent, LegacyWriter, WrittenRows
│   │   │                                    (W) ImportSql, AttemptPointer, LegacyAttempts, RecordedAttempt, DatabaseLegacyWriter
│   │   │                                    (I) ImportRequest, ImportSource, ImportReport, StoredImport, ImportLedger,
│   │   │                                    ImportConflicts, ImportOutcome, ImportNeedsConfirmation, ImportWriteFailed,
│   │   │                                    ImportLog, ImportService
│   │   │                                    (O) ImportPayloadPruner
│   │   └── Reset/                           (R) ResetRequest, ResetOutcome, ProgressReset, ResetLog
│   ├── Accounts/                            (C3b; S suma filas y ImportsSection si C3b está en la base)
│   ├── Console/Commands/PruneImportPayloads.php        (O)
│   ├── Http/Controllers/ProgressImportController.php   (I), ProgressResetController.php (R)
│   ├── Http/Requests/ImportBodyRequest.php             (I), ResetBodyRequest.php (R)
│   ├── Http/ProgressLimiters.php, ApiCode.php          (coordinador, T001)
│   └── Runs/Execution/ActiveRuns.php                   (coordinador, T001)
├── config/progress.php                                 (S)
├── database/migrations/2026_10_06_100011 y 100012      (S)
├── docker/php.ini                                      (coordinador, T019)
├── lang/es/import.php (D), lang/es/api.php (coordinador)
├── routes/api/progress-import.php (I), progress-reset.php (R)
└── tests/                   Unit/Progress/Import/, Feature/Progress/{Import,Reset,Snapshot}/, Content/, Concurrency/,
                             Support/{V1Projection,LosslessNormalization,ImportCases}.php (P), Support/Import/FakeLegacyWriter.php (I)
qa/                          import-cases-check.ts, lib/import-cases.ts, fixtures/shared/{import-cases.json,import-cases.sha256} (F);
                             api-import-check.ts (O); run-checks.ts (F); nginx-api-blocks-check.ts, lib/api-account.ts (coordinador)
docker/nginx/nginx.conf  backend/api/scripts/smoke.sh  package.json                     (coordinador)
README.md  backend/api/AGENTS.md  docs/architecture.md  qa/AGENTS.md  AGENTS.md          (coordinador, T021)
```

**Structure Decision:** el dominio va en `app/Progress/`, que ya tiene `Operations/`, `Merge/`, `Snapshot/` y `Sync/` de D1a. D1b suma dos carpetas, una por ruta: `Import/`, con los tipos del v1 en `Import/Legacy/`, y `Reset/`. Dentro de `Import/` los dueños tienen archivos disjuntos. El transporte va en `app/Http/`, con un controlador y un archivo de rutas por ruta, como D1a y B2. D1b no toca `routes/api.php`.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo:

- **422 o informe.** La decodificación nunca rechaza con 422 algo que los parsers v1 emiten (R25): cada fila de las tablas de [http-d1b.md](./contracts/http-d1b.md), sección 3.3, tiene su caso. Un dato omitido deja su ruta en `omitted`, y nada se omite en silencio (FR-033).
- **Nunca se pisa v2.** Todo lo importado viaja con el reloj nulo por `UpsertSql`. Las cuatro sentencias propias sólo combinan: OR, el máximo, la fecha más temprana, o un `COALESCE` en los punteros y las posiciones. Los conflictos se calculan con la foto leída bajo el candado antes de escribir.
- **La revisión.** Cada escritura estampa `cabecera + 1`, y la guarda de «cambia» va primero en cada sentencia (D09). `advance` corre una vez y sólo si cambió una fila de estado: un intento legado solo no sube la revisión. Después de importar, la foto de la revisión anterior más el delta da la foto completa (T018).
- **Punteros e intentos.** Los punteros sólo se escriben si están vacíos, con el `attempted_at` del intento. El candidato es el intento recién insertado con la cuenta de la sesión, o uno buscado por cuenta y ejercicio, y la búsqueda de punteros cruzados da 0. El payload legado lleva la fecha de la importación. Un intento legado no cuenta (`counted` es 0).
- **El crudo.** Llega byte por byte: `/api/progress/import` sale de `TrimStrings` y de `ConvertEmptyStringsToNull` (T017), y su sha256 es el del texto recibido. Nunca va a un registro. Una `QueryException`, que lo trae en sus bindings, se convierte en `ImportWriteFailed` afuera de `within`.
- **Bajo el candado, todo se rehace.** `within` puede repetirse hasta tres veces: la época, lo repetido, la confirmación, la foto previa y las escrituras van adentro, y nada sale afuera hasta el COMMIT.
- **El reset.** La época y la revisión suben en una sola sentencia; el estado se borra en el orden inverso de `STATE`; las ejecuciones se cancelan después del COMMIT. En la ruta, el 423 va antes del límite, y no hay `verified`.
- **La foto.** `campaign.seals` sale con su forma y entra en el delta. Un grupo de repaso legado incompleto se ve, y `REVIEW_GROUP` lo acepta sin reloj (R41).
- **El fixture.** Está congelado, nombra sus parsers y no se regenera. La proyección es igual al normalizado y no pierde nada en 12 de 12 secciones. Las mutaciones J1 a J6 se aplican de verdad.
- **C3b.** Si está en la base, T003 deja la suite en verde con el registro, `PopulatedAccount` y `ImportsSection` en el mismo commit (R39).
- **Nivel 9 y complejidad.** Sin baseline ni casts de `mixed`: el normalizado entra por los registros de `Import/Legacy/`. `LegacyDecoder` y `DatabaseLegacyWriter` se revisan por su tabla de pruebas y por pasos con nombre.

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos. Un mismo agente puede llevar varias colas si no corren a la vez. Lo que D1b comparte con D1a, B2, C3a y C3b lo pone el coordinador: son las **líneas de integración**.

**Ondas.**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | Coordinador | T001: la línea de base, el código de error, los limitadores, el motivo de `ActiveRuns` y los worktrees |
| 1 | S, D y F, a la vez (desde S0) | **S**: T002 a T004, el esquema, la configuración, las invariantes y la cabecera. **D**: T005 y T006, la decodificación del v1 y sus tipos. **F**: T007, el fixture de importación y su check (puede correr más tarde, hasta S2: depende de F2) |
| 2 | W, I, R, P, O y S, a la vez (desde S1) | **W**: T008 y T009, la escritura legada. **I**: T010 y T011, el servicio y la ruta de la importación. **R**: T012 y T013, «Borrar todo». **P**: T014, la proyección y el criterio sin pérdida. **O**: T015, la poda del crudo. **S**: T016, los sellos y el grupo de repaso en la foto |
| 3 | Coordinador y O (desde S2) | **Coordinador**: T017 a T019, las líneas de integración, las pruebas de punta a punta, Nginx y PHP. **O**: T020, el check con el stack. **Coordinador**: T021 y T022, la documentación y la compuerta |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| Coordinador | `backend/api/app/Http/{ApiCode,ProgressLimiters}.php`, `backend/api/lang/es/api.php`, `backend/api/tests/Unit/ApiCodeTest.php`, `backend/api/tests/Feature/Progress/ImportResetLimitersTest.php`, `backend/api/app/Runs/Execution/ActiveRuns.php`, `backend/api/tests/Feature/Runs/Execution/ActiveRunsTest.php`, `backend/api/bootstrap/app.php`, `backend/api/app/Providers/AppServiceProvider.php`, `backend/api/routes/console.php`, `backend/api/tests/Feature/ScheduleTest.php`, `backend/api/tests/Feature/Progress/ImportResetWiringTest.php`, `backend/api/docker/php.ini`, `backend/api/tests/Feature/PhpLimitsTest.php`, las pruebas de T018 (`backend/api/tests/Content/ImportLosslessTest.php`, `backend/api/tests/Feature/Progress/Import/{ImportEndpointTest,ImportAccessMatrixTest,ImportThrottleTest,ImportLogsWithoutTextTest}.php`, `backend/api/tests/Feature/Progress/Reset/{ResetEndpointTest,RunAfterResetTest}.php` y `backend/api/tests/Concurrency/ImportResetConcurrencyTest.php`), `docker/nginx/nginx.conf`, `qa/nginx-api-blocks-check.ts`, `qa/lib/api-account.ts`, `backend/api/scripts/smoke.sh`, `package.json`, `README.md`, `backend/api/AGENTS.md`, `AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md` y, al entregar, `specs/backend-multiusuario/roadmap.md` | todo | la línea de base, el cableado, las pruebas de punta a punta, Nginx y PHP, la documentación y la evidencia de cierre |
| S · Esquema y base | `backend/api/database/migrations/2026_10_06_100011_create_progress_imports_table.php` y `…100012_create_campaign_seals_table.php`, `backend/api/tests/Feature/Progress/ImportSchemaTest.php`, `backend/api/tests/Content/ImportMigrationsTest.php`, `backend/api/config/progress.php`, `backend/api/tests/Unit/Progress/{ProgressConfigTest,ProgressTablesTest}.php`, `backend/api/app/Progress/{ProgressTables,AccountLock}.php`, `backend/api/tests/Feature/Runs/AccountLockTest.php`, `backend/api/tests/Support/ProgressInvariants.php`, `backend/api/tests/Feature/Progress/ProgressWorldTest.php`, `backend/api/app/Progress/Snapshot/{ProgressSnapshotReader,CampaignWire,ExerciseWire}.php` y `backend/api/tests/Feature/Progress/Snapshot/{CampaignSealsSnapshotTest,LegacyReviewSnapshotTest}.php` (T016). Si C3b está en la base (T003): `backend/api/app/Accounts/UserTables.php`, `backend/api/app/Accounts/Export/{ImportsSection,UserExport}.php`, `backend/api/tests/Support/PopulatedAccount.php`, `backend/api/tests/Unit/Accounts/UserTablesTest.php` y `backend/api/tests/Feature/Accounts/{UserPurgeTest,PopulatedAccountTest,ImportsSectionTest}.php` | de B2: `AccountLock`, `RunWorld`, `RunInvariants`; de D1a: `ProgressWorld`, la foto; de C3a: `UserIdForeignKeyTest` | las dos tablas, la configuración, `STATE` con `campaign_seals`, `AccountLock::peek` y `::reset`, las invariantes y, en la onda 2, la foto con sellos y con el grupo de repaso legado |
| D · Decodificación | `backend/api/app/Progress/Import/Legacy/*.php` (nueve tipos), `backend/api/app/Progress/Import/{LegacyDecoder,ImportContent,LegacyWriter,WrittenRows}.php`, `backend/api/lang/es/import.php`, `backend/api/tests/Unit/Progress/Import/{LegacyDecoderTest,WrittenRowsTest}.php` y `backend/api/tests/Feature/Progress/Import/ImportContentTest.php` | de D1a: `RouteMilestones`; de B2: `Instant` | `LegacyDecoder`, `ImportContent`, los tipos de `Import/Legacy/` y el puerto `LegacyWriter` con `WrittenRows` |
| F · Fixture de importación | `qa/fixtures/shared/{import-cases.json,import-cases.sha256}`, `qa/lib/import-cases.ts`, `qa/import-cases-check.ts` y `qa/run-checks.ts`. Sólo si usa el respaldo de R38: `qa/app-shell-check.ts` y `qa/lib/app-shell-harness.ts` | los parsers v1 (R24); de F2: `parseRouteProgress` y `parseSavedLab` | el fixture congelado, su lector y su check |
| W · Escritura legada | `backend/api/app/Progress/Import/{ImportSql,AttemptPointer,LegacyAttempts,RecordedAttempt,DatabaseLegacyWriter}.php`, `backend/api/tests/Unit/Progress/Import/ImportSqlTest.php` y `backend/api/tests/Feature/Progress/Import/{LegacyAttemptsTest,LegacyWriterTest}.php` | de D: los tipos y el puerto; de D1a: `UpsertSql`, `FieldWrite`, `FieldKinds` y `SqlStatement`; de S: las tablas | `DatabaseLegacyWriter` |
| I · Servicio e HTTP de la importación | `backend/api/app/Progress/Import/{ImportRequest,ImportSource,ImportReport,StoredImport,ImportLedger,ImportConflicts,ImportOutcome,ImportNeedsConfirmation,ImportWriteFailed,ImportLog,ImportService}.php`, `backend/api/app/Http/Controllers/ProgressImportController.php`, `backend/api/app/Http/Requests/ImportBodyRequest.php`, `backend/api/routes/api/progress-import.php`, `backend/api/tests/Unit/Progress/Import/{ImportConflictsTest,ImportReportTest}.php`, `backend/api/tests/Feature/Progress/Import/{ImportLedgerTest,ImportServiceTest,ImportRouteTest}.php` y `backend/api/tests/Support/Import/FakeLegacyWriter.php` | de D: la decodificación y el puerto; de S: `AccountLock::peek`, las tablas y la configuración; de D1a: `ChangesReader` (y `FakeChangesReader`), `EpochMismatch`, `ClientOutdated` y `ContentNotImported`; de C3a: `ApiError` y `Browser`. Prueba con falsos de los dos puertos | `ImportService` y `POST /api/progress/import` |
| R · «Borrar todo» | `backend/api/app/Progress/Reset/{ResetRequest,ResetOutcome,ProgressReset,ResetLog}.php`, `backend/api/app/Http/Controllers/ProgressResetController.php`, `backend/api/app/Http/Requests/ResetBodyRequest.php`, `backend/api/routes/api/progress-reset.php` y `backend/api/tests/Feature/Progress/Reset/{ProgressResetTest,ResetRouteTest}.php` | de S: `AccountLock::reset` y `STATE`; de B2: `ActiveRuns` (con el motivo de T001), `RunWorld` y `RunInvariants`; de D1a: `EpochMismatch` y `ClientOutdated` | `ProgressReset` y `POST /api/progress/reset` |
| P · Proyección | `backend/api/tests/Support/{V1Projection,LosslessNormalization,ImportCases}.php`, `backend/api/tests/Unit/Progress/Import/{LosslessNormalizationTest,ImportCasesTest}.php` y `backend/api/tests/Feature/Progress/Import/V1ProjectionTest.php` | de S: las tablas | la proyección v1, el criterio sin pérdida en PHP y el lector del fixture |
| O · Operación | `backend/api/app/Progress/Import/ImportPayloadPruner.php`, `backend/api/app/Console/Commands/PruneImportPayloads.php`, `backend/api/tests/Feature/Progress/Import/PruneImportPayloadsTest.php` y `qa/api-import-check.ts` | de S: `progress_imports` y la configuración; de C3a: `openAccount` | la poda del crudo y el check de punta a punta |

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 integrado. Arrancan S, D y F.
- **S1:** T002 a T006 integrados. Arrancan W, I, R, P, O y S (T016). **F (T007)** se integra cuando termina y antes de S2. Si F2 todavía no está, usa el respaldo de R38, y nadie de la onda 2 la espera.
- **S2:** T007 a T016 integrados. El coordinador cablea y corre las pruebas de punta a punta.
- **S3:** T017 y T019 integrados y el stack levantado. O arranca T020.
- **Cierre:** T021 y T022.

**Líneas de integración.** Las pone el coordinador, y ningún dueño toca esos archivos, salvo la fila de T003: la hace S en el commit de las migraciones, porque sin ella la suite queda en rojo. Las líneas de D1a en los mismos archivos van primero:

| Cuándo | Archivo | Línea o cambio |
| --- | --- | --- |
| T001 | `backend/api/app/Http/ApiCode.php`, `lang/es/api.php` y `tests/Unit/ApiCodeTest.php` | `ImportNeedsConfirmation = 'import_needs_confirmation'`, con 409 y el mensaje de [http-d1b.md](./contracts/http-d1b.md), sección 6, y su fila en la prueba |
| T001 | `backend/api/app/Http/ProgressLimiters.php` y `tests/Feature/Progress/ImportResetLimitersTest.php` | `import`: `Limit::perHour(config()->integer('progress.import.throttle_per_hour'))`; `reset`: `Limit::perDay(config()->integer('progress.reset.throttle_per_day'))`. Los dos por cuenta (`import:<id>` y `reset:<id>`), como `sync`. Hasta T004, con `3` como valor por omisión del `integer` |
| T001 | `backend/api/app/Runs/Execution/ActiveRuns.php` y `tests/Feature/Runs/Execution/ActiveRunsTest.php` | `cancelAllOf(int $userId, ?RunReason $reason = RunReason::AccountDisabled)`: el listener de B2 sigue igual, y el reset pasa null |
| T017 | `backend/api/bootstrap/app.php` | `withRouting(api: [...])` suma `routes/api/progress-import.php` y `routes/api/progress-reset.php`. `'api/progress/import'` entra en las excepciones de `trimStrings` y de `convertEmptyStringsToNull` |
| T017 | `backend/api/app/Providers/AppServiceProvider.php`, en `register()` | `$this->app->bind(LegacyWriter::class, DatabaseLegacyWriter::class);` |
| T017 | `backend/api/routes/console.php` y `tests/Feature/ScheduleTest.php` | `Schedule::command('progress:prune-import-payloads')->hourly()->withoutOverlapping();`, y la tarea en la lista exacta de la prueba |
| T017 | `qa/lib/api-account.ts` | `CheckAccount` devuelve también `password`, para confirmar la contraseña antes del reset |
| T003 (S) | `UserTables`, `PopulatedAccount`, `UserExport` y las pruebas de C3b | Sólo si C3b está en la base, y en el mismo commit que las migraciones (R39) |
| T019 | `docker/nginx/nginx.conf`, `qa/nginx-api-blocks-check.ts` y `backend/api/scripts/smoke.sh` | `location = /api/progress/import` con `client_max_body_size 24m;` y las directivas de `location ^~ /api/` repetidas; el check la recorre, y el smoke suma el 413 y el 401 del reset |
| T019 | `backend/api/docker/php.ini` | `post_max_size = 24M` |
| T020 | `package.json` | `"api:import:check": "node qa/api-import-check.ts"` |
| T021 | `README.md`, `backend/api/AGENTS.md`, `AGENTS.md`, `docs/architecture.md` y `qa/AGENTS.md` | la documentación de lo nuevo |

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **D1a.** Lo que D1b usa está verificado en el código: `UpsertSql`, `FieldWrite`, `FieldKinds`, `SqlStatement`, `ProgressAreas`, `ChangesReader` y su falso, `ProgressSnapshotReader` y sus `*Wire`, `ProgressTables`, `ProgressInvariants`, `ProgressWorld`, `ProgressLimiters`, `EpochMismatch`, `ClientOutdated`, `SyncWriteFailed` (el modelo de `ImportWriteFailed`) y `config/progress.php`. D1b cambia estos archivos de D1a, en tareas con un solo dueño:
  - S (T004): `ProgressTables`, `ProgressInvariants`, `config/progress.php` y `ProgressConfigTest`;
  - S (T016): la foto;
  - el coordinador (T001): `ProgressLimiters`.

  Las líneas de D1a en `bootstrap/app.php`, `AppServiceProvider`, `routes/console.php`, `ScheduleTest`, `nginx.conf`, `smoke.sh` y `package.json` van antes que las de D1b.
- **B2.**
  - D1b usa `AccountLock` (S le suma `peek` y `reset`), `ActiveRuns` (con el motivo de T001), `RunCloser` (la regla de la época), `RunInvariants`, `RunWorld`, `Parallel` y la línea del Dockerfile que copia `qa/fixtures/shared/`.
  - Escribe en `exercise_progress` sólo `solved_at`, `legacy_attempts` y los punteros vacíos, y en `attempts`, `attempt_tests` y `attempt_payloads`, intentos legados.
  - La poda de B2 sigue como está (R35).
- **C3a.** Las rutas van en el grupo `account`, más `verified` en la importación y `password.confirm` en el reset. `RouteAccessTest` y `ExpectedAccountMatrixTest` las cubren solas: son la red de seguridad si alguien olvida un grupo.
- **C3b.** R39.
- **F2, A4, D1c y F8.** «Propuestas del plan», punto 3.
- **C5.** Lee `progress_imports` para las estadísticas del admin, con las columnas del ADR.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `backend/api/AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec, los dos contratos de D1b, [data-model-d1b.md](./data-model-d1b.md), [research-d1b.md](./research-d1b.md) y tu sección;
  - de D1a, [http.md](./contracts/http.md) y [merge-rules.md](./contracts/merge-rules.md), si tu tarea escribe o lee estado;
  - las skills `tdd`, `clean-code` y `codebase-design`; en PHP, también `laravel-tdd`, `laravel-specialist`, `laravel-security` y `php-pro`. Mandan el ADR y las decisiones del usuario: no se toman Sanctum, `strict_types` ni una meta de cobertura.
- **TDD, siempre.**
  - Escribí las pruebas de tu paso y comprobá que fallan por la razón que dice el plan. Recién entonces implementá.
  - Si falla una prueba de C2, C3a, B2, C3b o D1a, el error está en el código nuevo y su esperado no se toca. Las únicas excepciones son las listas que D1b amplía a propósito, nombradas en su tarea: `ProgressConfigTest`, las de C3b (R39) y `ScheduleTest`.
  - Un esperado sale de un contrato, de la consigna o de un ejemplo resuelto aparte, nunca del código que se prueba. **El fixture de importación no se regenera ni se edita para que algo pase.**
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Comandos.** En cada terminal: `export COMPOSE_PROJECT_NAME=taller-d1b-<dueño>`, y un `.env` con `sh backend/api/scripts/init-env.sh`. Después:
  - `npm run api:test -- --filter=<Prueba>` y `npm run api:test -- --testsuite=<Unit|Feature|Content|Concurrency>`;
  - `npm run api:analyse` (nivel 9 sin baseline: tu código tiene que dar 0 errores) y `npm run api:format:check`;
  - `npm run api:test:down`;
  - en TypeScript, `node qa/<check>.ts`, `npm run typecheck`, `npm run lint` y `npm run format:check`.

  Sólo O y el coordinador levantan el stack (`docker compose up`). Las imágenes y la caché ya están en la máquina: si un comando intenta descargar algo, pará y pedí permiso.
- **Cableado de producción.** Lo que registra las piezas de D1b en el contenedor y en las rutas (`bootstrap/app.php` y `AppServiceProvider`) lo pone el coordinador en T017. Hasta entonces, tus pruebas hacen su propio cableado en un `beforeEach`:
  - `Route::prefix('api')->middleware('api')->group(base_path('routes/api/progress-import.php'))`, o `progress-reset.php`;
  - `ProgressLimiters::register()`;
  - `app()->bind(…)` para los puertos (en T010 y T011, con los falsos).

  Sólo `ImportResetWiringTest` (T017) comprueba las líneas de producción.
- **Estilo.**
  - Código y pruebas en inglés. Los mensajes de la API salen de `lang/es`; los de la consola, literales en español.
  - **Sin comentarios**, salvo una función, clase o método que la complejidad exija, o una referencia puntual a un ADR o a un bug: el repositorio los borra.
  - Sin `declare(strict_types=1)`, sin sintaxis posterior a PHP 8.3, sin `@phpstan-ignore` ni baseline. Los arreglos se transforman con Collections y `Arr::`, y una `list<…>` tipada se arma con `foreach`. Una fila entra a la lógica como registro, nunca como arreglo suelto.
  - Toda hora sale del reloj de PHP (`Instant`) y viaja como binding `Y-m-d H:i:s.v`; ninguna sentencia usa `NOW()` ni `VALUES()`.
  - Los datos de un pedido pasan de `FormRequest` a un registro `readonly` antes de salir del controlador.
  - Formato con Pint (PHP) y Prettier (TypeScript y JSON).
- **Commits.** Chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada commit lleva la prueba con lo que verifica, y lo que midas (las mutaciones, los tiempos) va en el mensaje.
- **Al terminar**, informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Base (coordinador, onda 0)

**Cubre:** la línea de base, el código de error, los limitadores y el motivo de cancelación (FR-029, FR-036, FR-040, FR-041 y FR-059).

**Entrega:** el árbol de D1b parte de D1a con su S2, con la suite en verde y las tres líneas de T001.

### Tarea 0.1 · La línea de base (T001)

**Pasos:**

1. **La rama.** Armá `feat/d1b-importacion` desde `feat/d1a-sincronizacion`, con D1a por lo menos en su S2. Si C3b ya se integró en `master`, traela también: T003 tiene que saberlo (R39).
2. **Que exista lo que D1b usa**, con las firmas de [data-model-d1b.md](./data-model-d1b.md), sección 6:
   - de D1a: `UpsertSql`, `FieldWrite`, `FieldKinds`, `SqlStatement`, `OperationWriter`, `ProgressSnapshotReader` y sus `*Wire`, `ProgressLimiters`, `EpochMismatch`, `ClientOutdated`, `SyncWriteFailed`, `ProgressInvariants`, `ProgressWorld` y `tests/Support/Sync/FakeChangesReader.php`;
   - de B2: `AccountLock`, `ActiveRuns`, `RunCanceller`, `RunCloser`, `RunPruner`, `RunInvariants`, `RunWorld` y `Parallel`.

   Comprobá también que la etapa `dev` de `backend/api/Dockerfile` tenga `COPY --from=repo qa/fixtures/shared tests/Fixtures/shared`.
3. **La suite en verde.** `npm run api:format:check`, `npm run api:analyse` (0 errores en el nivel 9), `npm run api:test` y `npm test`. Anotá cuántas pruebas y aserciones corrieron.
4. **El código nuevo.** Primero `ApiCodeTest` suma la fila `import_needs_confirmation`, con 409 y el mensaje de http-d1b.md, sección 6, y falla porque el caso no existe. Después, el caso en `ApiCode`, su estado en `status()` y el mensaje en `lang/es/api.php`.
5. **Los limitadores.** Primero `ImportResetLimitersTest`: después de `ProgressLimiters::register()`, `RateLimiter::limiter('import')` aplicado a un pedido de una cuenta da un `Limit` de 3 intentos, con `decaySeconds` 3600 y una clave con el id de la cuenta; `reset` da 3 intentos con 86400. Falla porque no existen. Después, las dos definiciones.
6. **El motivo de `ActiveRuns`.** Primero `ActiveRunsTest` suma un caso: `cancelAllOf($id, null)` cancela una ejecución en cola y deja su intento con `reason` NULL, y sin el segundo argumento sigue dejando `account_disabled`. Falla porque el parámetro no existe. Después, el parámetro.
7. **Los worktrees.** Una rama y un worktree por dueño (`d1b/<dueño>`), cada uno con su `COMPOSE_PROJECT_NAME`.

**Compuerta:** la suite en verde sobre la base, con las tres líneas, y `git status` limpio.

## 1. Esquema y base (dueño S, onda 1)

**Cubre:** FR-051 y FR-052 (las dos tablas), la parte de D1b de FR-053, FR-059 (migraciones sólo hacia adelante) y SC-009. Además, lo que la importación y el reset necesitan de la cabecera, de `STATE`, de la configuración y de las invariantes.

**Entrega:** al llegar S1, las dos tablas, `config/progress.php` con las claves de D1b, `STATE` con `campaign_seals`, `AccountLock::peek` y `::reset`, y `ProgressInvariants` ampliada.

### Tarea 1.1 · Las pruebas de esquema, antes de las migraciones (T002)

- **Crea:** `backend/api/tests/Feature/Progress/ImportSchemaTest.php` y `backend/api/tests/Content/ImportMigrationsTest.php`.

**Pasos:**

1. **`ImportSchemaTest`** (suite `Feature`) lee `information_schema` sin mirar las migraciones. Sus esperados están escritos a mano desde el ADR 0006 §5.3 y [data-model-d1b.md](./data-model-d1b.md), sección 2:
   - **A.** Las dos tablas existen, en InnoDB y con `utf8mb4_es_0900_ai_ci`.
   - **B.** Sus columnas, en este orden: `progress_imports` tiene 10 y `campaign_seals` 7, 17 en total.
   - **C.** Los tipos y las colaciones que importan:
     - `import_id` es `char(36)` en `ascii_bin`, y `source`, `enum('storage','export')`;
     - `raw_payload` es `mediumtext` en `utf8mb4_0900_bin` y admite NULL, y `report`, `mediumtext` en binario y NOT NULL;
     - `raw_sha256` es `char(64)`, `epoch` es `int unsigned` y `revision`, `bigint unsigned`;
     - `imported_at` es `datetime(3)` en las dos tablas;
     - las banderas son `tinyint(1)` NOT NULL.
   - **D.** Las claves por nombre:
     - las dos primarias;
     - `progress_imports_user_id_import_id_unique` sobre `(user_id, import_id)`, el único `UNIQUE` aparte de las primarias;
     - `progress_imports_raw_sha256_user_id_index` sobre `(raw_sha256, user_id)`;
     - `campaign_seals_exercise_id_index`.
   - **E.** Tres claves foráneas: `user_id` de las dos tablas hacia `users`, en cascada, y `campaign_seals.exercise_id` hacia `exercises`, con `RESTRICT`. `ON UPDATE` es siempre `RESTRICT`.
   - **F.** Exactamente tres `CHECK` (`progress_imports_import_id_check`, `progress_imports_report_check` y `campaign_seals_flags_check`), y ninguno nombra una columna `DATETIME`. Una `import_id` en mayúsculas y un `report` que no es JSON fallan al insertar.
   - **G.** Una cuenta con las 12 tablas de D1, las 2 de B2 y `attempts`, `attempt_tests` y `attempt_payloads` pobladas (una fila por tabla): `DELETE FROM users WHERE id = ?` no falla y deja 0 filas en cada una, y otra cuenta poblada queda intacta (SC-009).
   - **H.** Con una cuenta que tiene un intento legado y sus punteros, `RunInvariants::crossedPointers()` da 0 (FR-053).
   - **K.** `UserIdForeignKeyTest` (C3a) sigue en verde.
2. **`ImportMigrationsTest`** (suite `Content`, porque el DDL confirma su propia transacción): `migrate`, `rollback --step=2` y `migrate` dejan el mismo `SHOW CREATE TABLE` para las dos tablas, y `users`, `exercises` y las diez de D1a quedan intactas.
3. **Correlas**: fallan porque las tablas no existen («Table … doesn't exist»), que es la razón esperada, y no por un error de sintaxis.

**Compuerta:** A a H fallan por esa razón y el resto de la suite sigue en verde.

### Tarea 1.2 · Las dos migraciones (T003)

- **Crea:** `backend/api/database/migrations/2026_10_06_100011_create_progress_imports_table.php` y `…100012_create_campaign_seals_table.php`.
- **Precondición, si C3b está en la base.** También tiene que estar la sección `progress` de D1a en `UserExport`: D1a la registra al integrarse con C3b, retira `ExerciseProgressSection` y pasa el `format` a `taller-export-2` (contrato de C3b). Sin ella, `UserExportCoverageTest` ya está en rojo por las diez tablas de D1a, no por D1b, y T003 espera a que el coordinador lo resuelva.
- **Si C3b está en la base, modifica además**:
  - `backend/api/app/Accounts/UserTables.php`;
  - `backend/api/app/Accounts/Export/UserExport.php`;
  - `backend/api/tests/Support/PopulatedAccount.php`;
  - las pruebas de C3b que fijan sus listas (`UserTablesTest`, `UserPurgeTest` y `PopulatedAccountTest`).

  Y crea `backend/api/app/Accounts/Export/ImportsSection.php` y `backend/api/tests/Feature/Accounts/ImportsSectionTest.php`.

**Pasos:**

1. **Cada `up()`** es un único `DB::statement` con el DDL de data-model-d1b.md, sección 2, y el encabezado de las de D1a: `// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/007-d1-progreso-sincronizacion/data-model-d1b.md`. Cada `down()` es `Schema::dropIfExists`.
2. **Si C3b está en la base**, primero las pruebas, que fallan:
   - `UserDataCoverageTest` falla ya, por las dos tablas sin declarar;
   - `UserTablesTest` pasa a 22 filas, con `progress_imports` al final de `batchTables()` (por `id`);
   - `ImportsSectionTest`: la sección `imports` trae las importaciones de la cuenta en orden de `id`, con `{importId, source, rawPayload, rawSha256, report, epoch, revision, importedAt}`. `rawPayload` sale null si ya se podó, `report` decodificado como objeto, `importedAt` en ISO, y nunca `user_id` ni las de otra cuenta. Lee de a una fila por transacción corta (`DB::listen` cuenta una transacción por fila);
   - `UserExportCoverageTest` pasa con la sección registrada;
   - `UserPurgeTest` y `PopulatedAccountTest` suben sus conteos en lo que suma `PopulatedAccount`: una importación y un sello.

   Después, las filas de [data-model-d1b.md](./data-model-d1b.md), sección 8, en `UserTables`, la importación y el sello en `PopulatedAccount`, y `ImportsSection` registrada en `UserExport` después de las secciones que haya.
3. **Corré** las pruebas de T002 (pasan) y `npm run api:test` completo. Anotá el tiempo de `migrate:fresh`.
4. `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas de T002 en verde y la suite entera en verde, también con C3b.

### Tarea 1.3 · La configuración, `STATE`, las invariantes y la cabecera (T004)

- **Modifica:**
  - `backend/api/config/progress.php` y `backend/api/tests/Unit/Progress/ProgressConfigTest.php`;
  - `backend/api/app/Progress/ProgressTables.php`;
  - `backend/api/tests/Support/ProgressInvariants.php` y `backend/api/tests/Feature/Progress/ProgressWorldTest.php`;
  - `backend/api/app/Progress/AccountLock.php` y `backend/api/tests/Feature/Runs/AccountLockTest.php`.
- **Crea:** `backend/api/tests/Unit/Progress/ProgressTablesTest.php`.

**Pasos:**

1. **Primero las pruebas**, que fallan:
   - **`ProgressConfigTest`.** Sus esperados suman las claves de D1b, escritas a mano. Cambian a propósito, en este commit:
     - `progress.import`: `['formats' => [2], 'throttle_per_hour' => 3, 'raw_max_bytes' => 10485760, 'dedupe_window_minutes' => 10]`;
     - `progress.reset`: `['formats' => [2], 'throttle_per_day' => 3]`;
     - `progress.retention`: `['sync_operations_days' => 14, 'raw_payload_days' => 90]`.
   - **`ProgressTablesTest`.** `STATE` es exactamente la lista de once, escrita a mano: las diez de D1a en su orden y `campaign_seals` al final.
   - **`ProgressWorldTest`**, con casos nuevos:
     - un grupo de repaso legado incompleto (`review_due_at` con valor, sin `confidence` y sin reloj) **no** es una violación;
     - un grupo con reloj y sin sus fechas **sigue** siéndolo, como ya prueba el caso de D1a;
     - una fila de `campaign_seals` con una revisión mayor que la de la cabecera viola `REVISION_AHEAD_OF_HEAD`.
   - **`AccountLockTest`** (B2), con casos nuevos:
     - `peek` de una cuenta sin cabecera da época 1 y revisión 0, y no ejecuta ningún `insert`, `update`, `delete` ni `for update` (`DB::getQueryLog`);
     - `peek` de una cuenta con cabecera la devuelve;
     - dentro de `within`, `reset($head, $at)` sube la época y la revisión en uno, fija `reset_at`, `last_activity_at` y `updated_at` en `$at`, devuelve la cabecera nueva y no toca otra cuenta.
2. **Implementá:**
   - las claves de `config/progress.php`;
   - `campaign_seals` al final de `STATE`;
   - en `ProgressInvariants`, `campaign_seals` en `KEYS` y la condición de `REVIEW_GROUP` con `review_set_at is not null and (…)`;
   - `AccountLock::peek` y `::reset` con las sentencias de data-model-d1b.md, secciones 5 y 6.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde, y las firmas, las de data-model-d1b.md: de eso depende el reparto.

## 2. Decodificación del v1 (dueño D, onda 1)

**Cubre:** FR-024, FR-025, FR-032 y FR-033 (la forma, los dominios, lo omitido y lo reemplazado) y US6.2 (de la posición a la clave de etapa).

**Entrega:** al llegar S1, `LegacyDecoder`, `ImportContent`, los tipos de `Import/Legacy/` y el puerto `LegacyWriter` con `WrittenRows`.

### Tarea 2.1 · `LegacyDecoder` y los tipos, sin base (T005)

- **Crea:**
  - los nueve tipos de `backend/api/app/Progress/Import/Legacy/`;
  - `backend/api/app/Progress/Import/{LegacyDecoder,LegacyWriter,WrittenRows}.php`;
  - `backend/api/lang/es/import.php`;
  - `backend/api/tests/Unit/Progress/Import/{LegacyDecoderTest,WrittenRowsTest}.php`.

**Pasos:**

1. **Primero las pruebas**, con un `ContentFacts` armado en la prueba y los esperados escritos desde [http-d1b.md](./contracts/http-d1b.md), sección 3.3:
   - **Lo válido.** Una sección válida de cada tipo se decodifica en sus registros, escritos a mano: la ruta, los registros del laboratorio con su resultado, los sellos, los checkpoints y los talleres con sus etapas traducidas desde la posición v1. Las secciones ausentes quedan en null o vacías.
   - **El dominio.** Hay una tabla con un caso por cada regla de «Dominio». Cada violación da `ValidationException` con su clave `normalized.<ruta>` y un mensaje de `lang/es/import.php`:
     - un campo desconocido en cada nivel, y un tipo equivocado;
     - un texto un carácter más largo que su tope;
     - `hints: 4`, `minutes: 20`, `attempts: -1` y `attempts: 2^53`;
     - un id desconocido de cada clase: ejercicio, mundo, taller, objetivo, paso de la guía, recurso, hito y prueba;
     - un `selected` de otro lenguaje, y un repetido en `completed`, en `observed`, en `steps` y en `tests`;
     - una sección sin `version: 1`, y un `normalized` sin ninguna sección.
     - Los textos de un emoji de 4 bytes en el tope pasan, porque se cuentan caracteres.
   - **Lo omitido.** Hay una tabla con un caso por cada regla de «Se omite con informe». Cada uno aplica el resto y deja un `ReportEntry` con su ruta y su motivo exactos:
     - `hints: 2.5`; `hints: 3` con dos pistas activas;
     - `attempts: 1.5`; `solvedAt: 1.5`; `solvedAt: 253402300800000`;
     - `result.time` fuera de rango, que deja el resultado entero afuera;
     - `prediction: 3` con tres opciones; un quiz, un checkpoint y un taller fuera de sus opciones;
     - una posición de etapa sin `v1_position`;
     - `success` y `transportError` verdaderos.
   - **Lo reemplazado.** Un texto con U+FFFD queda como está y deja `replacement_character` con su ruta.
   - **Los textos** llegan intactos, con `''` y con espacios. Un valor centinela de la entrada **nunca** aparece en un mensaje de error.
   - **`WrittenRowsTest`.** `AREAS` es la lista de doce escrita a mano, y `changed()` es falso si sólo `attempts` es mayor que 0.

   Corrélas: fallan porque las clases no existen.
2. **Implementá.** El decodificador recorre una sección por vez, con un método por sección y por registro, y acumula lo omitido y lo reemplazado. Los dominios, los topes y los motivos son constantes con nombre. Los hitos salen de `RouteMilestones::KEYS`.
3. `npm run api:test -- --testsuite=Unit`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde y 0 errores de PHPStan. `LegacyDecoder` se revisa por su tabla de pruebas.

### Tarea 2.2 · `ImportContent` contra la base (T006)

- **Crea:** `backend/api/app/Progress/Import/ImportContent.php` y `backend/api/tests/Feature/Progress/Import/ImportContentTest.php`.

**Pasos:**

1. **Primero las pruebas** (con `ProgressWorld`):
   - `factsFor` trae, de los ids que nombra el normalizado:
     - el lenguaje, las opciones de predicción, las pistas **activas** y las claves de prueba de cada ejercicio;
     - las opciones de cada checkpoint;
     - las opciones de predicción, los objetivos y las etapas por `v1_position` de cada taller;
     - las opciones de cada quiz y los recursos.
   - Lo retirado está; un id desconocido no está.
   - Recordá que `ProgressWorld` siembra `v1_position` desde 1 ([data-model-d1b.md](./data-model-d1b.md), sección 1).
   - Un normalizado que nombra 274 ejercicios hace a lo sumo una consulta por clase (`DB::getQueryLog`).
   - `decode($normalized, factsFor($normalized))` decodifica de punta a punta un normalizado del mundo de prueba.
2. **Implementá** como `ContentLookup` de D1a: una consulta con `whereIn` por clase; las opciones, contando `options` de `prediction_json`, `checkpoint_json` o `quiz_json` decodificados; las pistas activas, con un `COUNT(*)` agrupado; y las etapas, con su `v1_position`.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde.

## 3. El fixture de importación en TypeScript (dueño F, onda 1)

**Cubre:** FR-038 y FR-039 (el lado de TypeScript) y SC-001 (el oráculo).

**Entrega:** antes de S2, `qa/fixtures/shared/{import-cases.json,import-cases.sha256}`, su lector y su check.

### Tarea 3.1 · El fixture, su lector y su check (T007)

- **Crea:** `qa/fixtures/shared/import-cases.json`, `qa/fixtures/shared/import-cases.sha256`, `qa/lib/import-cases.ts` y `qa/import-cases-check.ts`.
- **Modifica:** `qa/run-checks.ts`, que suma el check a su lista.
- **Depende de F2 (unidad 1).** Usa `parseRouteProgress` y `parseSavedLab`, más `parseSavedCampaignState` y `parseSavedSystemsState`, que ya están en `master`. Si F2 no está integrada cuando la tarea tiene que cerrar, se usa el respaldo de R38:
  - `parseSaved` de `lab.js`, con `loadLabCatalogs`, `loadLab` y `TallerLab.exportState()`, como `qa/lab-state-check.ts`;
  - `parseProgress` de `app.js`, cargando la clave con el arnés de `qa/app-shell-check.ts` y exportando. La parte del recorrido de una exportación es el estado que cargó el parser. El arnés pasa a `qa/lib/app-shell-harness.ts` sin cambiar su comportamiento: `qa/app-shell-check.ts` lo importa y tiene que dar verde antes y después.

  `parsers` dice cuáles se usaron, y D1c pasa después el check a los de F2.

**Pasos:**

1. **Primero el check y el lector**, como dice [import-fixture.md](./contracts/import-fixture.md), secciones 3 a 5:
   - `readImportCases`, con la huella;
   - `normalizeWithParsers(source, raw)`, que arma las secciones del crudo y corre los parsers con el catálogo real de `build/curriculum.json`, como `qa/campaign-check.ts` y `qa/systems-check.ts`;
   - las cinco comprobaciones de la sección 5.

   `node qa/import-cases-check.ts` falla porque el fixture no existe (`ENOENT`).
2. **Armá el fixture una sola vez** con `normalizeWithParsers` sobre los tres casos de la sección 2, y `expect.written` a mano desde la tabla de la sección 8. Antes de dejarlo:
   - revisá caso por caso el normalizado contra el crudo, nombrando lo que agregó cada parser;
   - comprobá que el crudo de `storage` mide 13.633 bytes y que su sha256 empieza por `421632476b2ab2a4`.

   Formatealo con `npx prettier --write qa/fixtures/shared/import-cases.json`.
3. **Congelalo**: `cd qa/fixtures/shared && sha256sum import-cases.json > import-cases.sha256`, y verificalo con `sha256sum -c import-cases.sha256`.
4. **`node qa/import-cases-check.ts` pasa.** Comprobá que lo hacen fallar:
   - editar un caso sin tocar la huella, con «es un fixture congelado»;
   - un `expect.written` mal escrito a mano;
   - un normalizado con una clave de menos.

   Después, restaurá el fixture.
5. `npm test`, `npm run lint`, `npm run typecheck` y `npm run format:check`.

**Compuerta:** el check en verde dentro de `npm test`, la huella verificada con `sha256sum -c`, y las tres alteraciones detectadas y anotadas en el mensaje del commit.

## 4. Escritura legada (dueño W, onda 2)

**Cubre:** FR-026, FR-027 (cómo se combinan), FR-031, FR-034 (el escritor), FR-035, FR-039 (una fila por registro) y la parte de D1b de FR-053 (los punteros).

**Entrega:** al llegar S2, `DatabaseLegacyWriter`, con `ImportSql` y `LegacyAttempts`.

### Tarea 4.1 · `ImportSql`, sin base (T008)

- **Crea:** `backend/api/app/Progress/Import/{ImportSql,AttemptPointer}.php` y `backend/api/tests/Unit/Progress/Import/ImportSqlTest.php`.

**Pasos:**

1. **Primero las pruebas**: para cada una de las cuatro sentencias de [data-model-d1b.md](./data-model-d1b.md), sección 4.3, el SQL exacto, escrito a mano en la prueba, y sus bindings en el orden de las columnas:
   - `exerciseLegacy`: con y sin puntero, y con y sin `solvedAt`;
   - `workshopSeal`;
   - `campaignSeal`;
   - `legacyPosition`, para las tres tablas, y `workshop_observations` sin `updated_at` ni `marked`.

   Además, cada sentencia:
   - empieza sus asignaciones por `revision` y `updated_at`;
   - pone `proof_at` antes de `proof_attempt_id` y `last_attempt_at` antes de `last_attempt_id`;
   - nunca usa `VALUES(`;
   - lleva las horas como `Y-m-d H:i:s.v`.

   Corrélas: fallan porque las clases no existen.
2. **Implementá.**
3. `npm run api:test -- --testsuite=Unit`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde.

### Tarea 4.2 · `LegacyAttempts` y `DatabaseLegacyWriter` contra la base (T009)

- **Crea:** `backend/api/app/Progress/Import/{LegacyAttempts,RecordedAttempt,DatabaseLegacyWriter}.php` y `backend/api/tests/Feature/Progress/Import/{LegacyAttemptsTest,LegacyWriterTest}.php`.

**Pasos:**

1. **Primero las pruebas** (con `ProgressWorld`, `RunWorld` y una cabecera):
   - **`LegacyAttemptsTest`.**
     - **Insertar.** Un resultado inserta un intento con las columnas de data-model-d1b.md, sección 4.4: `outcome` `passed`, `failed` o `legacy_error` según el caso; `custom_outcome`; `grading_hash` NULL; `counted` en 0. Sus pruebas van con `position` desde 1, y el payload con el `created_at` de la importación, no el de `result.time`.
     - **Reusar.** Se reusa:
       - el intento de un `attemptId` de la cuenta y del ejercicio. El de otra cuenta o de otro ejercicio se ignora, y se inserta uno nuevo;
       - un intento no legado con el mismo código a 10 minutos justos de `result.time`, pero no a 10 minutos y 1 ms;
       - un legado con la misma fecha y el mismo código.

       En los tres casos no se inserta nada.
     - **Lo que no cambia.** `attempt_count` no cambia, y `RunInvariants::assertClean()`.
   - **`LegacyWriterTest`.** Un `LegacyProgress` con uno de cada cosa, escrito en la prueba:
     - **Una cuenta nueva.** Deja las filas de data-model-d1b.md, sección 4.2, con los valores del v1 y los relojes nulos. Cada fila lleva la revisión `R + 1`, y `WrittenRows` trae los conteos escritos a mano.
     - **Lo que crea y lo que no escribe.** Un registro vacío de cada área crea su fila. Las notas vacías del recorrido y del taller no se escriben. Un grupo de repaso incompleto se guarda tal cual. `legacy_position` queda en el índice del v1.
     - **La segunda escritura** del mismo `LegacyProgress` da todo en 0 y no cambia ninguna revisión.
     - **Sobre datos de v2** (filas con reloj real y un intento del servidor como puntero): lo de v2 no cambia; OR, el máximo y la fecha más temprana combinan; los punteros no se tocan; el intento legado queda como historia.
     - **Dos importaciones** con valores distintos y el reloj nulo: gana la segunda en los campos con reloj, y en `legacy_position` se queda la primera.
     - **Lo que no toca.** Ninguna sentencia nombra `server_solved_at` ni `attempt_count`: se compara la fila antes y después.
     - **Las invariantes.** `ProgressInvariants::assertClean()` y `RunInvariants::assertClean()`, y `crossedPointers()` da 0.

   Corrélas: fallan porque las clases no existen.
2. **Implementá.** El escritor recorre las áreas en el orden de la sección 4.2, con las padres antes que las hijas, y para cada registro:
   - arma sus `FieldWrite` con `FieldKinds::definition(…)` y el reloj nulo;
   - corre `UpsertSql::row` y las sentencias de `ImportSql` con `DB::affectingStatement`;
   - cuenta las filas que cambiaron, una vez por fila.

   `LegacyAttempts::record` corre antes de `exerciseLegacy` del mismo ejercicio.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde y 0 errores de PHPStan.

## 5. El servicio y la ruta de la importación (dueño I, onda 2)

**Cubre:** FR-024, FR-028 a FR-030, FR-033 (lo reemplazado del crudo), FR-034, FR-036, FR-057 y FR-058 (la importación); US1.

**Entrega:** al llegar S2, `ImportService` y `POST /api/progress/import`. I prueba contra falsos de los dos puertos: `FakeLegacyWriter`, suyo, y `FakeChangesReader`, de D1a. La integración con los reales es T018.

### Tarea 5.1 · `ImportService`, el libro y los conflictos (T010)

- **Crea:** las clases de I en `backend/api/app/Progress/Import/` (data-model-d1b.md, sección 6), `backend/api/tests/Support/Import/FakeLegacyWriter.php`, `backend/api/tests/Unit/Progress/Import/{ImportConflictsTest,ImportReportTest}.php` y `backend/api/tests/Feature/Progress/Import/{ImportLedgerTest,ImportServiceTest}.php`.

**Pasos:**

1. **Primero las pruebas**, con los esperados escritos desde [http-d1b.md](./contracts/http-d1b.md), secciones 2 y 3:
   - **`ImportConflictsTest`** (sin base). Por cada tipo de campo con reloj:
     - un valor de la foto con reloj real y distinto del v1 da `newer_value_kept`, con su ruta exacta;
     - uno con reloj nulo, o uno igual, no da conflicto;
     - una lápida con reloj contra una marca del v1 da conflicto;
     - un `lastAttempt` no legado da `server_attempt_kept`, y uno legado, nada;
     - los logros nunca dan conflicto.
   - **`ImportReportTest`.** `toArray` y `fromJson` van y vuelven sin perder nada, con las doce áreas siempre presentes.
   - **`ImportLedgerTest`.**
     - `byImportId` y `byRawInEpoch`;
     - `needsConfirmation` es verdadero en cada uno de los tres motivos, por separado, y falso sin ninguno;
     - `record` deja la fila con el sha256, el informe en JSON, la época, la revisión y la hora.
   - **`ImportServiceTest`** (con el falso del escritor y la base real para la cabecera y el libro):
     - **Los errores, en el orden de la sección 2**: un `format` no aceptado lanza `ClientOutdated`; sin contenido, `ContentNotImported`; con otra época, `EpochMismatch` **sin llamar a la decodificación** (un normalizado inválido igual da 409); un normalizado inválido, `ValidationException`.
     - **Lo repetido.** La misma `importId`, con el mismo crudo y la misma época, devuelve `repeated` con el informe guardado y **no llama al escritor**. Con otro crudo, o desde una época anterior, lanza 422 con `errors.importId`. El mismo crudo con otra `importId`, en la época, devuelve `repeated`.
     - **La confirmación.** Cada uno de los tres motivos lanza `ImportNeedsConfirmation`, y con `confirm` se aplica.
     - **Aplicar.**
       - El escritor recibe la revisión `cabecera + 1`, dentro del candado.
       - La cabecera sube **una vez** si `WrittenRows::changed()`, y no sube si no.
       - Queda una fila en `progress_imports`, y el informe junta lo omitido y lo reemplazado de la decodificación, lo escrito por el escritor y los conflictos.
       - Un crudo con U+FFFD suma `raw` a `replaced`.
     - **Un interbloqueo.** Si el falso lanza un interbloqueo la primera vez, el segundo intento deja **una** fila en `progress_imports`.
     - **Los errores de la base.** Una `QueryException` con una cadena centinela en sus bindings sale como `ImportWriteFailed`, sin la cadena y sin `previous`. El registro guarda el SQLSTATE, y ninguna línea de log tiene el crudo.

   Corrélas: fallan porque las clases no existen.
2. **Implementá** con el orden de R32. Afuera de `within` van:
   - el formato, el contenido y la época (con `AccountLock::peek`);
   - `ImportContent::factsFor` y `LegacyDecoder::decode`;
   - el sha256 del crudo y la búsqueda de U+FFFD en `raw`.

   Adentro va el resto. La `QueryException` se convierte afuera de `within`.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde y 0 errores de PHPStan.

### Tarea 5.2 · `POST /api/progress/import` (T011)

- **Crea:** `backend/api/app/Http/Controllers/ProgressImportController.php`, `backend/api/app/Http/Requests/ImportBodyRequest.php`, `backend/api/routes/api/progress-import.php` y `backend/api/tests/Feature/Progress/Import/ImportRouteTest.php`.

**Pasos:**

1. **Primero las pruebas** (con `Browser`, el falso del escritor, y `ProgressLimiters::register()` y la ruta cableados en un `beforeEach`):
   - **El acceso.** Sin sesión, 401. Sin `X-Taller-User`, 409 `account_mismatch`. Con el email sin verificar, 403 `email_unverified`.
   - **El sobre**, con 422 y su campo en `errors`:
     - falta `importId`, o es un UUID v3;
     - `epoch: 0`;
     - `source: "file"`;
     - un `raw` de 10.485.761 bytes (uno de 10.485.760 pasa);
     - `normalized` que no es un objeto;
     - `confirm: "sí"`.
   - **Los demás errores:** `client_outdated`; 503 `content_not_imported`; 409 `epoch_mismatch` con `{epoch, revision}`; 422 de `normalized`, con su ruta; 409 `import_needs_confirmation`, con el cuerpo exacto `{message, code}`.
   - **Las respuestas.** El 201 con el cuerpo de la sección 3.4, el 200 de un reintento con el mismo cuerpo, y `Cache-Control: private, no-store` en las dos y en los errores.
   - **El límite.** La 4.ª importación de la hora da 429 con `Retry-After` (`Browser::useDatabaseDrivers()`), y la 3.ª no, aunque las anteriores hayan sido un 409 y un 200.
   - **Un `user_id` en el cuerpo** se ignora.
2. **Implementá.**
   - **`ImportBodyRequest`** valida el sobre de la sección 3.1, con el tope del crudo en bytes, y entrega un `ImportRequest` `readonly`.
   - **El controlador** llama al servicio y convierte las excepciones:
     - `EpochMismatch`, `ClientOutdated` e `ImportNeedsConfirmation` salen con `ApiError::of`;
     - `ImportWriteFailed` sale con 500 `server_error`;
     - una importación aplicada o repetida responde `$outcome->status()` con `toArray()`.
   - **La ruta**: `Route::middleware([PrivateNoStore::class, 'account', 'verified', 'throttle:import'])->group(fn () => Route::post('/progress/import', ProgressImportController::class));`.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde. Que el crudo llegue sin recortes lo prueba T018, con las líneas de T017.

## 6. «Borrar todo» (dueño R, onda 2)

**Cubre:** FR-040 a FR-045; US5 y SC-005 (el servicio y la ruta).

**Entrega:** al llegar S2, `ProgressReset` y `POST /api/progress/reset`.

### Tarea 6.1 · `ProgressReset` (T012)

- **Crea:** `backend/api/app/Progress/Reset/{ResetRequest,ResetOutcome,ProgressReset,ResetLog}.php` y `backend/api/tests/Feature/Progress/Reset/ProgressResetTest.php`.

**Pasos:**

1. **Primero las pruebas** (con `ProgressWorld` y `RunWorld`, y dos cuentas con las once tablas de `STATE` pobladas):
   - **Lo que no cambia nada.** Con otra época, `EpochMismatch` con la vigente, y nada cambia. Con un `format` no aceptado, `ClientOutdated`.
   - **El reset.**
     - La cabecera queda con la época y la revisión más uno, y `reset_at` y `last_activity_at` en ahora.
     - Las once tablas de `STATE` quedan con 0 filas de la cuenta.
     - Quedan intactos la otra cuenta, `attempts`, `attempt_tests`, `attempt_payloads`, `progress_imports`, `sync_operations`, `users` y `sessions` (FR-042 y FR-045).
     - `ResetOutcome` trae `{epoch, revision}` y las filas borradas por tabla.
   - **Sin cabecera**, el reset la crea y la deja en época 2 y revisión 1.
   - **Las ejecuciones.**
     - Una en cola queda cancelada, y su intento, `canceled`, con la época vieja y `reason` NULL. Una corriendo queda con `cancel_requested_at`.
     - Las cancelaciones corren **después** del COMMIT: en el registro de consultas, los `delete` del estado van antes que la primera sentencia sobre `runs`.
     - Si `ActiveRuns` lanza, se registra `progress.reset.cancel_failed` y el reset igual devuelve su resultado.
   - **Los registros.** Una línea `progress.reset` con la cuenta, la época, la revisión y los conteos, sin ningún texto.
   - **Las invariantes.** `ProgressInvariants::assertClean()` y `RunInvariants::assertClean()`.

   Corrélas: fallan porque las clases no existen.
2. **Implementá** con [data-model-d1b.md](./data-model-d1b.md), sección 5: `within` con la época, `AccountLock::reset` y los `delete` en el orden inverso de `STATE`. Después, `ActiveRuns::cancelAllOf($userId, null)` dentro de un `try` que registra el fallo.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde.

### Tarea 6.2 · `POST /api/progress/reset` (T013)

- **Crea:** `backend/api/app/Http/Controllers/ProgressResetController.php`, `backend/api/app/Http/Requests/ResetBodyRequest.php`, `backend/api/routes/api/progress-reset.php` y `backend/api/tests/Feature/Progress/Reset/ResetRouteTest.php`.

**Pasos:**

1. **Primero las pruebas** (con `Browser`):
   - **El acceso.** Sin sesión, 401. Sin `X-Taller-User`, 409. Sin la contraseña confirmada, 423 `password_confirmation_required`, y cuatro 423 seguidos no gastan el límite: después de confirmar, el reset da 200.
   - **Los errores.** 422 sin `epoch` o con `epoch: 0`; 409 `client_outdated`; 409 `epoch_mismatch` con `{epoch, revision}`.
   - **La respuesta.** 200 con exactamente `{epoch, revision}` y `Cache-Control: private, no-store`.
   - **Quién puede.** Una cuenta con el email sin verificar puede borrar, porque no hay `verified`. Un admin borra lo suyo.
   - **El límite.** El 4.º reset del día da 429 con `Retry-After` (`Browser::useDatabaseDrivers()`).
2. **Implementá**:
   - `ResetBodyRequest`, con `format` y `epoch`;
   - el controlador, con `EpochMismatch` y `ClientOutdated` convertidos con `ApiError::of`;
   - la ruta: `Route::middleware([PrivateNoStore::class, 'account', 'password.confirm', 'throttle:reset'])->group(fn () => Route::post('/progress/reset', ProgressResetController::class));`.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde.

## 7. La proyección y el criterio sin pérdida (dueño P, onda 2)

**Cubre:** FR-038 y FR-039 (el lado de PHP) y SC-001 (las herramientas de la prueba).

**Entrega:** al llegar S2, `V1Projection`, `LosslessNormalization` e `ImportCases` en `tests/Support/`.

### Tarea 7.1 · La proyección, el criterio y el lector (T014)

- **Crea:** `backend/api/tests/Support/{V1Projection,LosslessNormalization,ImportCases}.php`, `backend/api/tests/Unit/Progress/Import/{LosslessNormalizationTest,ImportCasesTest}.php` y `backend/api/tests/Feature/Progress/Import/V1ProjectionTest.php`.

**Pasos:**

1. **Primero las pruebas:**
   - **`LosslessNormalizationTest`** (sin base). Repite, escritos a mano, los casos de `isLosslessNormalization` de `qa/shared-lib-check.ts`:
     - escalares iguales y distintos;
     - una clave de más en la proyección, que pasa, y una que falta, que falla;
     - el orden de un arreglo;
     - un arreglo más largo, que pasa, y uno más corto, que falla;
     - `{}` contra `[]`;
     - `1` contra `1.0`, que son iguales, y `"1"` contra `1`, que no;
     - `null`.
   - **`V1ProjectionTest`** (filas sembradas con SQL, una de cada tabla, y un intento legado con sus pruebas y su payload). Da las cuatro secciones escritas a mano desde [import-fixture.md](./contracts/import-fixture.md), sección 6:
     - el orden por `legacy_position` y después por `created_at`, con los NULL al final;
     - una lápida no se proyecta;
     - los valores por omisión: `''`, `rust`, `25` y `selected` null;
     - una etapa sin `v1_position` no se proyecta;
     - `result` sale de `last_attempt_id`.
   - **`ImportCasesTest`.** Un fixture chico en un directorio temporal, con su huella, se lee. Editado sin la huella, falla con «es un fixture congelado». La ruta real es `tests/Fixtures/shared/import-cases.json`.

   Corrélas: fallan porque las clases no existen.
2. **Implementá.**
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde.

## 8. La poda del crudo (dueño O, onda 2)

**Cubre:** FR-037 y FR-055 (el crudo) y US7.3.

### Tarea 8.1 · `progress:prune-import-payloads` (T015)

- **Crea:** `backend/api/app/Progress/Import/ImportPayloadPruner.php`, `backend/api/app/Console/Commands/PruneImportPayloads.php` y `backend/api/tests/Feature/Progress/Import/PruneImportPayloadsTest.php`.

**Pasos:**

1. **Primero las pruebas**, con `Carbon::setTestNow`:
   - **Qué se poda.** Un crudo de hace 90 días y 1 ms pasa a NULL; uno de hace 90 días menos 1 ms se queda. `raw_sha256`, `report` y el resto de la fila se quedan siempre.
   - **Los lotes.** Con `progress.batches.prune` en 5 y 12 crudos vencidos, la poda va en tres lotes: cada uno lee los ids por clave primaria con `limit 5` y escribe con `where id in (…)`. Con `prune_max` en 1, para después del primero.
   - **Lo que ya está podado** no se vuelve a escribir.
   - **El comando** informa cuántos crudos podó y sale con 0, y una segunda corrida poda 0.
   - **No toca nada más.** Ninguna otra tabla cambia.
   - **El sha256 sigue sirviendo.** Después de la poda, `ImportLedger::byRawInEpoch` sigue encontrando la importación (US7.3).
2. **Implementá** con R37.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde. La línea del `scheduler` es de T017.

## 9. La foto: los sellos y el grupo de repaso (dueño S, onda 2)

**Cubre:** FR-035 (los sellos, leídos), R40 y R41.

### Tarea 9.1 · La foto lee `campaign_seals` y muestra el grupo legado (T016)

- **Modifica:** `backend/api/app/Progress/Snapshot/{ProgressSnapshotReader,CampaignWire,ExerciseWire}.php`.
- **Crea:** `backend/api/tests/Feature/Progress/Snapshot/{CampaignSealsSnapshotTest,LegacyReviewSnapshotTest}.php`.

**Pasos:**

1. **Primero las pruebas**, que fallan:
   - **`CampaignSealsSnapshotTest`.**
     - `areas($userId, null)` trae `campaign.seals` con `{exerciseId, code, prediction, assisted, revision}`, ordenados por `exerciseId`, también los que tienen las tres banderas en falso.
     - `areas($userId, $r)` trae sólo los de revisión mayor que `$r`.
     - Una cuenta no ve los sellos de otra.
   - **`LegacyReviewSnapshotTest`.**
     - Una fila con sólo `review_due_at` da `review` con `confidence: null`, `reviewDueAt` y `at: null`.
     - Sin ninguna de las tres, `review` es null.
     - Con el grupo completo y su reloj, sale como antes.

   Las pruebas de la foto de D1a siguen en verde.
2. **Implementá**:
   - una línea en `areas()` con el ayudante `wire` de D1a;
   - `CampaignWire::seal`;
   - en `ExerciseWire`, la condición de `review`: null sólo si `confidence`, `reviewed_at` y `review_due_at` son NULL.
3. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas en verde, con las de D1a.

## 10. Integración, punta a punta, Nginx, check, documentación y compuerta (coordinador y O, onda 3)

**Cubre:** FR-028, FR-030, FR-036, FR-038 a FR-045, FR-055 a FR-058, FR-084, FR-087 y FR-088; SC-001, SC-005, SC-008 a SC-011 en lo que es de D1b.

**Entrega:** una rama que parte de S2, con lo de todos los dueños integrado, el cableado, las pruebas con los servicios reales, Nginx y PHP, el check con el stack, la documentación y la evidencia de cierre.

### Tarea 10.1 · Las líneas de integración (T017)

- **Modifica:**
  - `backend/api/bootstrap/app.php`;
  - `backend/api/app/Providers/AppServiceProvider.php`;
  - `backend/api/routes/console.php` y `backend/api/tests/Feature/ScheduleTest.php`;
  - `qa/lib/api-account.ts`.
- **Crea:** `backend/api/tests/Feature/Progress/ImportResetWiringTest.php`.

**Pasos:**

1. **Primero las pruebas**, que fallan:
   - **`ImportResetWiringTest`.**
     - `app(LegacyWriter::class)` es un `DatabaseLegacyWriter`.
     - Las dos rutas están registradas detrás de `PrivateNoStore`, con sus middleware en este orden: `account`, `verified` y `throttle:import` la importación; `account`, `password.confirm` y `throttle:reset` el reset.
     - **`/api/progress/import` no recorta ni convierte `''`**: una ruta de prueba bajo `api/progress/import` recibe `'  espacios  '` y `''` tal cual, y una ruta hermana sí los transforma (como la `WiringTest` de D1a).
   - **`ScheduleTest`** suma `progress:prune-import-payloads` (cada hora, sin solaparse) a su lista exacta.
2. **Poné las líneas** de la tabla de integración de T017. `RouteAccessTest` y `ExpectedAccountMatrixTest` (C3a) tienen que dar verde con las dos rutas.
3. `npm run api:test` completo, `npm run api:analyse`, `npm run api:format:check` y `npm test`.

**Compuerta:** lo anterior. Con las líneas puestas, las dos rutas funcionan de punta a punta con los servicios reales.

### Tarea 10.2 · Las pruebas con los servicios reales (T018)

- **Crea:** las pruebas de T018 de la tabla de dueños.

**Pasos:**

1. **Primero las pruebas.** Corren por HTTP con `Browser` y los servicios reales; si alguna falla por un defecto de lo integrado, ése es el hallazgo.
   - **`ImportLosslessTest`** (suite `Content`, con `content:import` del contenido real): SC-001, como dice [import-fixture.md](./contracts/import-fixture.md), sección 7, para los tres casos.
     - Después, las mutaciones **J1 a J6** de la sección 9: cada una se aplica, se corre la prueba y se restaura. Lo que falla va al mensaje del commit.
   - **`ImportEndpointTest`.**
     - **US1.4.** Una cuenta con una reflexión que sincronizó por `POST /api/sync` con su reloj, y un intento del servidor cerrado con `RunCloser` como último intento. Al importar un v1 que dice otra cosa:
       - la reflexión de v2 se conserva;
       - los logros se suman;
       - lo que no tenía reloj cede;
       - el informe lista los conflictos;
       - el resultado v1 queda como intento legado, sin tocar los punteros.
     - **US1.5.** Cada motivo de confirmación da el mismo 409, y con `confirm` da 201.
     - **US1.6.** Un v1 con una fecha fuera de rango, un texto con U+FFFD y una posición de etapa sin clave da 201, y el informe nombra cada ruta.
     - **El delta.** Después de una importación, `POST /api/sync` con la revisión anterior trae en `changes` cada fila importada, y la foto de antes más ese delta es igual a la foto completa.
     - **La misma copia otra vez.** Importar `master-2a278ad-export` después de `master-2a278ad-storage` (la misma copia de otro modo) da 201 con todo en 0 y no mueve la revisión.
     - **Los textos.** Un crudo con espacios al principio y al final, y textos `''`, llegan intactos: el sha256 guardado es el del texto enviado, y la reflexión `''` queda `''`.
   - **`ResetEndpointTest`** (US5.1 a US5.5).
     - El reset da 200.
     - Un `POST /api/sync` con la época anterior da 409 `epoch_mismatch` y no escribe.
     - `GET /api/progress` da la foto vacía con `resetAt`.
     - **US5.4.** Importar el export de antes del reset da 409 `import_needs_confirmation`; con `confirm`, 201. La proyección es igual a la de antes del reset, y no es un 200 vacío.
     - El 4.º reset del día da 429.
   - **`RunAfterResetTest`** (FR-044, con el reset real).
     - Una ejecución corriendo cuando llega el reset queda con su pedido de cancelación. Cuando el cierre de B2 la cierra con un veredicto aprobado, el intento queda `canceled` en la época vieja.
     - Si la cancelación falló (`ActiveRuns` reemplazado por uno que lanza), el intento queda `passed` en la época vieja.
     - En los dos casos el estado de la época nueva sigue vacío, la revisión no cambia y `RunInvariants::assertClean()`.
   - **`ImportAccessMatrixTest`.**
     - Una cuenta B no importa ni borra lo de A, aunque mande un `user_id`.
     - Con el `X-Taller-User` de otra cuenta, 409 y ninguna escritura.
     - Un admin importa y borra lo suyo.
     - Una cuenta sin verificar recibe 403 al importar, y puede borrar.
   - **`ImportThrottleTest`.** La 4.ª importación de la hora y el 4.º reset del día dan 429 con `Retry-After`, con los drivers `database`.
   - **`ImportLogsWithoutTextTest`.** Una cadena centinela en el crudo, en un borrador, en una reflexión y en una nota, más un error de base forzado, no dejan la cadena en ningún registro (`Monolog\Handler\TestHandler`) ni en la excepción.
   - **`ImportResetConcurrencyTest`** (suite `Concurrency`, con `Parallel`):
     - **Una importación contra una sincronización** de la misma cuenta: se serializan, con revisiones `R + 1` y `R + 2`, y quedan las dos cosas.
     - **La misma importación desde dos procesos**: un 201 y un 200 con el mismo informe, y una sola fila en `progress_imports`.
     - **Un reset contra una sincronización**: o la sincronización aplica y el reset la borra, o recibe 409. Nunca queda una fila de estado después del reset.
     - **Dos resets con la misma época**: uno da 200 y el otro, 409 `epoch_mismatch`.
     - **Una importación contra un reset**: o se importa y se borra, o recibe 409.
2. **Corrélas** con lo integrado. Si alguna falla, es un defecto del código nuevo: su esperado no se toca, y se le informa al dueño.
3. `npm run api:test` (también con `-- --order-by=random`), `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** todas en verde, o con el defecto informado y corregido por su dueño. Las mutaciones J1 a J6, detectadas y anotadas.

### Tarea 10.3 · Nginx y PHP (T019)

- **Modifica:** `docker/nginx/nginx.conf`, `qa/nginx-api-blocks-check.ts`, `backend/api/scripts/smoke.sh` y `backend/api/docker/php.ini`.
- **Crea:** `backend/api/tests/Feature/PhpLimitsTest.php`.

**Pasos:**

1. **Primero los checks**, que fallan:
   - **`qa/nginx-api-blocks-check.ts`** recorre también `location = /api/progress/import`. Sin su línea `client_max_body_size 24m;`, las directivas tienen que ser las mismas que las de `location ^~ /api/`, y en el mismo orden.
   - **`PhpLimitsTest`.** `ini_get('post_max_size')` es `24M` en la imagen de la API.
   - **`smoke.sh`**, con el stack:
     - un cuerpo de 24 MiB más un byte a `POST /api/progress/import` da 413;
     - `POST /api/progress/reset` sin sesión da 401 en JSON.
2. **Implementá**: la ubicación hermana, que repite el bloque de `/api/` y suma el tope, y `post_max_size = 24M`.
3. **Con el stack** (`docker compose up --build -d --wait`): `npm test`, `docker compose exec -T taller nginx -t` y `npm run api:smoke`.

**Compuerta:** el check estático en `npm test`, `nginx -t` con `successful`, `PhpLimitsTest` y el smoke, en verde.

### Tarea 10.4 · El check de punta a punta con el stack (T020)

- **Crea:** `qa/api-import-check.ts`. El coordinador suma `"api:import:check": "node qa/api-import-check.ts"` a `package.json`.
- **Entrega:** `npm run api:import:check`, el FR-087 de D1b. No forma parte de `npm test`.

**Pasos:**

1. **El check**, por escenarios. Parte de S3, y abre la cuenta con `openAccount`, que ahora devuelve la contraseña:
   - **Importar las tres fixtures** de `import-cases.json` por Nginx: 201, y otra vez, 200. `GET /api/progress` trae los 11 ejercicios con su `proof` legado y los 9 sellos.
   - **«Borrar todo».** Confirmá la contraseña y borrá (200). Un `POST /api/sync` con la época anterior da 409, y reimportar el export da 409 y después 201.
   - **El tope de Nginx.** Un cuerpo de 24 MiB más un byte da 413.
   - **La medición**, sin un objetivo: una importación sintética con los 274 ejercicios, cada uno con un borrador de 30.000 caracteres, que deja el crudo por debajo de 10 MiB. Se mide su duración y el tiempo con el candado tomado, y se leen la memoria pico y los conteos de la línea `progress.import.applied` en `docker compose logs php`. Se imprimen junto al `memory_limit` vigente.
   - **Al terminar**, retira la cuenta y comprueba que no queda ninguna fila suya en las tablas de D1, en `attempts` ni en `progress_imports`, también si un escenario falla.
2. **Corrélo** contra el stack de T019. Lo que no se pueda correr se informa como límite.
3. `npm run lint`, `npm run format:check` y `npm run typecheck`.

**Compuerta:** los escenarios en verde, y las cifras anotadas en el mensaje del commit y en el PR. Si la memoria pico pasa del 70 % de `memory_limit`, se le avisa al usuario con la medición y dos salidas: bajar el tope del crudo, o subir `memory_limit` en el pool de PHP-FPM.

### Tarea 10.5 · La documentación (T021)

- **Modifica:** `README.md`, `backend/api/AGENTS.md`, `AGENTS.md`, `docs/architecture.md` y `qa/AGENTS.md`.

**Pasos:**

1. **`README.md`**: el progreso v1 se importa a la cuenta y «Borrar todo» pasa por el servidor, sin prometer el cliente (es de D1c); el comando `api:import:check` y la poda del crudo.
2. **`backend/api/AGENTS.md`**, una sección «Progreso: importación y reset (D1b)»:
   - el mapa de `app/Progress/Import/` y `Reset/`;
   - que la importación escribe con el SQL de D1a y el reloj nulo, y nunca pisa v2;
   - que `/api/progress/import` no recorta;
   - que ningún registro lleva el crudo;
   - el fixture `import-cases.json`, que no se regenera;
   - que toda tabla nueva con `user_id` se declara en `UserTables`.
3. **`docs/architecture.md`**: el mapa suma `app/Progress/Import/`, `Reset/` y las dos rutas.
4. **`qa/AGENTS.md`**: `import-cases-check` en `npm test` y `api:import:check` con el stack.
5. **`AGENTS.md`**: el comando nuevo. No se edita ningún ADR ni la hoja de ruta.
6. **Comprobá** rutas, comandos y enlaces locales de lo que tocaste, y `git diff --check`.

**Compuerta:** cada ruta, comando y enlace citado existe.

### Tarea 10.6 · La compuerta y la evidencia (T022)

- **Modifica:** `specs/backend-multiusuario/roadmap.md`, sólo al entregar.

**Pasos:**

1. **SC-011.** En la rama de integración, con el stack limpio, corré y anotá el resultado real de cada uno:
   - `npm ci && npm run build && npm test && npm run lint && npm run format:check`;
   - `npm run api:test`, también con `-- --order-by=random`;
   - `npm run api:format:check`;
   - `npm run api:analyse` (0 errores y sin baseline);
   - `git diff --check`;
   - con el stack: `npm run api:smoke`, `npm run api:content:check` y `npm run api:import:check`.
2. **Los escenarios** de [quickstart-d1b.md](./quickstart-d1b.md) que no automatiza ningún check.
3. **`/speckit-converge`, a mano**, sobre `tasks-d1b.md`, porque el script apunta a `tasks.md` de D1a (R23). Después, el PR, con título y descripción en inglés, el problema completo, lo verificado, lo pendiente y las cifras de T020.
4. **Sólo con esa evidencia**, el coordinador pasa D1b a «Entregado» en la hoja de ruta.

**Compuerta:** cada comando corrido y anotado. Los límites van escritos en el PR: la aceptación en navegador real y el cliente son de D1c.

## Cobertura de requisitos

| Requisito | Tareas |
| --- | --- |
| FR-024 | T005, T010, T011, T018 |
| FR-025 | T005, T011, T018 |
| FR-026 | T009, T018 |
| FR-027 | T009, T010, T018 |
| FR-028 | T010, T015, T018 |
| FR-029 | T001, T010, T011, T018 |
| FR-030 | T010, T011, T018 |
| FR-031 | T009, T018 |
| FR-032 | T005, T006, T009, T018 |
| FR-033 | T005, T010, T018 |
| FR-034 | T009, T010, T018 |
| FR-035 | T003, T009, T016, T018 |
| FR-036 | T001, T011, T018, T019 |
| FR-037 | T004, T015 |
| FR-038, FR-039 | T007, T014, T018 |
| FR-040 | T001, T012, T013, T018 |
| FR-041 | T001, T004, T012, T018 |
| FR-042, FR-043, FR-045 | T012, T018 |
| FR-044 | T001, T012, T018 |
| FR-051, FR-052 (las dos tablas) | T002, T003, T004 |
| FR-053 (D1b) | T002, T003, T009, T018 |
| FR-055 (el crudo) | T015, T017 |
| FR-056 (D1b) | T001, T017, T019 |
| FR-057 (D1b) | T010, T011, T013, T018 |
| FR-058 (D1b) | T004, T011, T013 |
| FR-059 | T001, T003, T022 |
| FR-084 (D1b) | T002, T009, T010, T012, T014, T018 |
| FR-087 | T020 |
| FR-088 | T022 |
| SC-001 | T007, T014, T018, T020 |
| SC-005 | T012, T013, T018, T020 |
| SC-008 (importación y reset) | T011, T013, T018, T019 |
| SC-009 (las dos tablas y la supresión con las doce) | T002, T003 |
| SC-010 (la medición de la importación) | T020 |
| SC-011 | T022 |
| US1 | T005 a T011, T014, T018, T020 |
| US5 | T004, T012, T013, T018, T020 |
| US6.2 | T005, T006, T009, T018 |
| US7.2 a US7.5 | T002, T003, T015, T018, T019, T020 |

Los requisitos del cliente (FR-060 a FR-079, FR-085 y FR-086) son de D1c. Los de D1a (FR-001 a FR-023, FR-046 a FR-050 y FR-080 a FR-083) están en su plan.

## Riesgos

1. **La memoria de la importación más grande.** Con `memory_limit` en 128M y un cuerpo de hasta 24 MiB, no se sabe si entra (R36). *Mitigación:* T020 lo mide y lo registra en cada importación (R43). Si no entra, el usuario elige entre bajar el tope del crudo y subir el límite del pool.
2. **Cuánto crudo puede guardar una cuenta.** Con 3 importaciones por hora, crudos de 10 MiB y 90 días, una cuenta puede guardar unos 6.480 crudos (R36). *Mitigación:* las cuentas son por invitación y la supresión borra por lotes (R39). Si hace falta, un tope de bytes por cuenta es un cambio local en `ImportService`.
3. **El oráculo depende de F2.** El check de TypeScript usa los parsers que extrae F2 (R38). *Mitigación:* el respaldo con los de `app.js` y `lab.js`; el check no está en el camino crítico.
4. **C3b puede entrar antes o después.** Sus pruebas de cobertura fallan con una tabla sin declarar (R39). *Mitigación:* T003 trae el registro cuando C3b está en la base, y si no, C3b lo toma de data-model-d1b.md.
5. **Dos líneas del contrato de D1a cambian** (R40 y R41). *Mitigación:* avisarle a D1a antes de que cierre su documentación; las pruebas de la foto de D1a siguen en verde con el cambio.
6. **El código sobrevive al reset hasta 90 días, y no más** (R35). Restaurar con un export viejo puede devolver punteros sin el código. *Mitigación:* el aviso de privacidad (pregunta 14) y F8 lo dicen.
7. **El candado durante una importación grande.** Mientras escribe, la cuenta no sincroniza ni cierra ejecuciones. *Mitigación:* la decodificación va afuera, y T020 mide cuánto dura.
8. **Dos cuentas que importan el mismo crudo a la vez** pueden no pedirse confirmación (R31). Se acepta: el caso protegido no es simultáneo.

## Descargas y permisos

**Ninguna.** D1b no agrega paquetes de Composer ni de npm (FR-059) ni imágenes: usa `mysql:9.7`, la imagen de `php`, la de `taller` y Node 24, que ya están. Si un comando intenta descargar algo, se pide permiso con nombre, origen y tamaño antes de bajarlo (constitución, principio VII).

## Lo que quedó sin verificar

Esta planificación midió las fixtures y leyó el código. No ejecutó nada del PHP, del SQL ni de Nginx (R44). Lo que hay que medir o comprobar al implementar, y quién lo hace:

| Qué | Cómo se resuelve |
| --- | --- |
| Todo el PHP, el SQL y la configuración de este plan | Las pruebas de cada tarea. Si algo no compila o no corre, se corrige la referencia y no la prueba |
| Que `UpsertSql::row` con el reloj nulo y un grupo `lww-group` con valores nulos (el repaso incompleto) se comporte como los casos `empty-*` del fixture de D1a | `LegacyWriterTest` (T009) y `ImportLosslessTest` (T018), con la mutación J6 |
| Que las cuatro sentencias de `ImportSql` den 1, 2 o 0 filas afectadas como las de D1a, y que el `UPDATE` de `legacy_position` dé 0 cuando no cambia | `LegacyWriterTest` (T009) |
| Que `json_decode` rechace un cuerpo con un sustituto suelto y Laravel responda 422 y no 500 | `ImportRouteTest` (T011) |
| Que `ValidatePostSize` deje pasar 24 MiB con `post_max_size = 24M`, y cómo sale su 413 | `PhpLimitsTest` y el smoke (T019) |
| La memoria pico y la duración de la importación más grande, y cuánto queda tomado el candado | T020 |
| Que insertar un crudo de 10 MiB entre en `max_allowed_packet` (64M por omisión en MySQL 9.7) | T020 |
| Que los parsers de F2 den lo mismo que los de `app.js` y `lab.js` | Las pruebas de F2; el check de T007 con los que haya |
| Que `password.confirm` antes de `throttle:reset` no gaste el límite | `ResetRouteTest` (T013) |
| Que la cancelación de B2 después del reset deje el intento como historia, con el reset real | `RunAfterResetTest` (T018) |
| Que la carrera entre una importación y un reset se serialice sin interbloqueo | `ImportResetConcurrencyTest` (T018) |
| La aceptación en navegador real | Es de D1c |

## Análisis

`/speckit-analyze`, hecho a mano el 2026-10-06 sobre `spec.md`, este plan y `tasks-d1b.md` (R23). Sus hallazgos y cómo se corrigieron están en el mensaje del commit del análisis. Lo que quedó:

- Los 22 requisitos de D1b (FR-024 a FR-045), FR-087 y FR-088, y la parte de D1b de FR-051, FR-052, FR-053 y de FR-055 a FR-059 y FR-084, tienen tarea y compuerta.
- También tienen tarea y compuerta SC-001 y SC-005, y la parte de D1b de SC-008 a SC-011.
- Cada archivo tiene un solo dueño, y los enlaces locales resuelven.

## Complexity Tracking

No hay violaciones de la constitución que justificar. Hay desvíos de la spec y del ADR 0006, que el usuario todavía no conoce, que este plan pide confirmar y que están en «Propuestas del plan»:

- **La escritura con `UpsertSql`** y no con el escritor de D1a (R27).
- **El orden de evaluación** que refina FR-030 (R32), y la `importId` reusada como 422 (R31).
- **Las reglas** de las columnas que sólo trae el v1 (R28) y de las notas vacías (R29).
- **Los sustitutos sueltos**, que reemplaza el cliente (R26).
- **Aceptar la poda de payloads de B2** después de un reset (R35).
- **El grupo de repaso legado incompleto**, que cambia una regla y una línea del contrato de D1a (R41).
