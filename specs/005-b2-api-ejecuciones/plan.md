# Implementation Plan: B2 · API de ejecuciones

**Branch**: `005-b2-api-ejecuciones` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-b2-api-ejecuciones/spec.md`. Decisiones: [research.md](./research.md). Modelo de datos y tipos: [data-model.md](./data-model.md). Contratos: [HTTP](./contracts/runs-api.md), [ejecutor](./contracts/executor.md) y [plantilla y evidencia](./contracts/harness-template.md). Código verificado del generador: [reference-generator.md](./reference-generator.md). Validación: [quickstart.md](./quickstart.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completa la sección de tu dueño, «Reglas para todos los agentes» y los documentos de arriba que toquen tu tarea. `tasks.md` tiene una línea por tarea (T001…) y remite acá.
>
> **Línea base del código.** El plan parte de `master` más el PR #17 (C6: los registros tipados en `backend/api/app/Content/Record/` y PHPStan en el nivel 9) y más C3a hasta su punto S2 (spec 004: el esquema de identidad, `WriteTransaction`, los errores con código, los grupos de rutas `account` y `verified`, el `Browser` de pruebas, los límites, las podas y el `scheduler`). B2 no espera la entrega de C3a: arranca en ese punto y toma de ahí lo que documenta «Lo que B2 toma de C3a». Las rutas de archivos de abajo son las de esa base: la rama de la spec todavía tiene `Codec/` y el nivel 6. Los números de línea de las pruebas que cambian son los de la rama de C6.
>
> **Código verificado.** Se planificó sin tocar el repositorio de código y sin Docker. Corrió de verdad el TypeScript del generador, de los checks y del fixture, y la plantilla de Rust contra `rustc` 1.97.1 (137 de 137 soluciones aprueban y ningún código inicial; [research.md](./research.md), «Cómo se verificó al planificar»). **Sin ejecutar**: todo el PHP, el SQL, el YAML de Compose y la configuración de Nginx de este plan son referencia (el host no tiene PHP, Go ni MySQL, y la sesión no usó Docker). Las firmas, los contratos y las pruebas son lo que obliga; el cuerpo de referencia lo ajusta quien implemente hasta que pasen las pruebas y PHPStan en el nivel 9.

## Summary

B2 mueve del navegador al servidor la ejecución del código del alumno y la decisión de qué pasó. El alumno envía su código y recibe el id de su ejecución; un worker la corre en el sandbox de B1 mientras el cliente consulta; el servidor arma el programa con las pruebas guardadas, lee la evidencia, clasifica el resultado y deja un intento liviano. Para que una cuenta no deje sin sandbox a las demás hay cuotas por cuenta, un tope global de cola y un 503 con `Retry-After`. El enfoque:

- **Una cola propia en MySQL, con la admisión atómica.** La ejecución y su trabajo se confirman juntos bajo el candado de la cuenta (`progress_heads`, tomado por un único código, `AccountLock`, que D1 reutiliza y que se apoya en el `WriteTransaction` de C3a). Las cuotas se cuentan después de tomar el candado, y lo rechazado no deja rastro. Un trabajo se intenta una sola vez: lo que el servidor no puede asegurar termina en `infra_error`, y quien vuelve a pedir es el alumno.
- **El programa y la evidencia son del servidor y son puros.** `ProgramRenderer`, `EvidenceReader` y `ResultClassifier` no tocan la base ni la cola, así que la auditoría B3 los reutiliza. La plantilla del harness es contenido: la 18.ª porción, con su archivo, su tabla y su recurso, que no cambia ni un byte de las 17 anteriores.
- **El cierre es una transacción corta bajo la cabecera.** Deja el intento, sus veredictos y su payload, y, sólo si la época sigue vigente, actualiza el progreso de la cuenta y estampa la revisión nueva en la fila que cambió. Un barrido por minuto cierra lo vencido y una poda por hora borra lo viejo.
- **Los plazos están ordenados con números** (ejecutor 90 s < cliente 100 s < trabajo 120 s < `retry_after` 140 s, y 150 s de gracia para detener un worker), y una prueba de configuración lo comprueba.
- **La operación es mínima:** `executor` (único con el socket de Docker, en una red compartida sólo con el worker) y `worker-runs` (un proceso por slot), más una ubicación de Nginx con su tope de cuerpo y las imágenes del sandbox que se construyen con Compose.
- **Oráculos independientes** en vez del código que se prueba: las tablas de [contracts/](./contracts/) (clasificación, errores, plazos), el fixture compartido de la plantilla (once casos escritos a mano), las listas de columnas del ADR y los valores del ADR para las cuotas.
- **Dos cambios en lo ya entregado**, además de los esperados: el generador deja de exigir `t{índice+1}` y suma los `imports` de Go al `grading_hash` (49 hashes cambian, medidos), y el importador de C2 cambia el mensaje que nombraba a B2.
- **Cada dueño trabaja en sus archivos.** Lo que comparte con C3a y con C3b (`bootstrap/app.php`, `routes/console.php`, `config/queue.php`, Compose, Nginx, `lang/es`, `ApiCode`, el proveedor de servicios) son líneas de integración que pone el coordinador; las rutas de B2 viven en `routes/api/runs.php` y `routes/api/harness.php`. La cancelación por un cambio de cuenta es un listener sobre el evento que dispara C3b, y todo registro de log pasa por una sola clase (`RunLog`), que no acepta código ni salida.

## Technical Context

**Language/Version**: PHP 8.5 (FPM y CLI) y Laravel 13.x en `backend/api/`, sin sintaxis posterior a PHP 8.3 ni `declare(strict_types=1)`; TypeScript con Node 24 en `tools/content/` y `qa/`. El ejecutor Go (`backend/executor/`) no cambia.

**Primary Dependencies**: ninguna nueva (FR-049). Usa lo que ya hay: el cliente HTTP, la cola `database`, `Concurrency` (driver `process`), el limitador y el planificador de Laravel, y PHPStan (Larastan) y Pest. La única pieza nueva de la imagen es la extensión PCNTL de PHP, que compila `docker-php-ext-install`.

**Storage**: MySQL 9.7. Seis tablas de usuario nuevas (`progress_heads`, `attempts`, `attempt_tests`, `attempt_payloads`, `runs` y `exercise_progress`) y una de contenido (`harness_templates`, la 22.ª), con migraciones en el bloque `2026_10_05_300001` a `300099`. La cola es la tabla `jobs` de C1 con una conexión nueva, `runs`.

**Testing**: Pest contra MySQL real (`npm run api:test`), con cuatro suites: `Unit`, `Feature`, `Content` y la nueva `Concurrency` (procesos PHP paralelos con `DatabaseTruncation`). Los checks de TypeScript de `qa/` corren en `npm test`. Con el stack levantado, `npm run api:content:check` (ampliado), `npm run api:smoke` (ampliado) y el nuevo `npm run api:runs:check`, contra el ejecutor real. Ninguno de los tres forma parte de `npm test`.

**Target Platform**: Docker Compose en un servidor, Linux o macOS, con gVisor (`runsc`) para el sandbox y runc sólo en desarrollo. Cada dueño usa su propio `COMPOSE_PROJECT_NAME`.

**Project Type**: servicio web (API Laravel) con un worker de cola y un servicio de sandbox.

**Performance Goals**: sin objetivo que cumplir: SC-012 es una medición (mediana y p95 de una ejecución en reposo y con un aula simulada de 30 cuentas). La estimación del ADR, que ahí se contrasta, es de 1,5 a 3 s en reposo y unos 20 s para el último de un aula de 30.

**Constraints**:

- código del alumno de hasta 64 KiB (en bytes), prueba propia de hasta 3.000 caracteres, cuerpo de hasta 192 KiB;
- un solo intento por trabajo, y nada externo dentro de una transacción;
- nivel 9 de PHPStan sin baseline ni ignores, y Pint;
- sin paquetes de Composer ni de npm;
- el código se guarda byte por byte (los middleware de recorte de Laravel no corren sobre `/api/runs`);
- los 274 ejercicios conservan su `content_hash`, las 17 porciones sus bytes y sus validadores, y el oráculo `dump-globals` no cambia.

**Scale/Scope**: hasta unas 5.000 cuentas y 1.000 activas en el pico (S2 del ADR), 4 slots, tope de cola de 32. Del contenido: 274 ejercicios (822 pruebas) y dos plantillas. En `backend/api/app/` se crean unos 70 archivos y cambian 15; en el generador, 1 se crea y 5 cambian; en `qa/`, 3 checks nuevos y 6 que cambian. 22 tareas en cuatro ondas.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.3.1). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `backend/api/AGENTS.md` (Collections y `Arr::` salvo las listas tipadas, Pest contra MySQL real, sin SQLite, `env()` sólo en `config/`) y `backend/executor/AGENTS.md` (el ejecutor no cambia). T021 actualiza la documentación que cita lo que cambia (las 17 porciones, la regla de `test_key`, los comandos nuevos, los servicios) en el mismo cambio. |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con sus pruebas, que fallan por la razón que dice el paso. Los valores esperados salen de afuera del código probado: las tablas de [contracts/](./contracts/), las listas de columnas del ADR, el fixture escrito a mano, los valores de cuotas del ADR y, en el generador, hashes tomados con `sha256sum`. No hay mocks de la implementación: el ejecutor se reemplaza en su frontera HTTP (`Http::fake`) y la concurrencia es real, con procesos. |
| III. Código entendible | Sí, con revisión | Clases chicas con un contrato claro y nombres de dominio; la lógica pura (renderizador, lector de evidencia, clasificador, fusión del progreso) está separada de la que toca la base. Para revisar por cohesión: `RunCloser` (el cierre es lo más largo), `RunAdmission` y `ProgramRenderer`. El validador de la plantilla se partió en funciones de complejidad menor que 10 al verificarlo con ESLint. |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | La plantilla es contenido (`content/harness/`) y viaja por el generador y el import como el resto; las claves de prueba se vuelven libres pero siguen siendo estables y no se reutilizan (el importador conserva su regla); el contenido retirado no se borra. B2 borra sólo lo operativo (ejecuciones y payloads viejos). |
| V. Capas y contratos explícitos | Sí | Contenido (`app/Content/`), progreso (`app/Progress/`), ejecuciones (`app/Runs/`) y transporte (`app/Http/`) separados, con tipos y firmas fijados en `data-model.md` y contratos en `contracts/`. Sin servidores, frameworks ni capas nuevas: el ejecutor ya existe (ADR 0005) y la cola es la de Laravel. No hace falta un ADR nuevo: las decisiones del plan caen bajo el ADR 0005 y el 0006 (que sigue en propuesta: su aprobación condiciona la implementación). |
| VI. Español, accesibilidad y portabilidad | Sí | Documentos y mensajes al alumno y al operador en español rioplatense (voseo); código, pruebas y comentarios en inglés. No hay interfaz. Los comandos y scripts son portables entre Linux y macOS (el GID del socket sale de `ls -lnL`, no de `stat`). |
| VII. Secretos y salidas generadas fuera de Git | Sí | `EXECUTOR_TOKEN` lo genera `init-env.sh` en el `.env` (fuera de Git) y llega sólo a `executor` y `worker-runs`. `build/harness.json` es una salida generada, ignorada como el resto de `build/`. El fixture compartido es un valor esperado de prueba y se versiona a propósito. No se agregan dependencias. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit; lo que falte lo agrega `/speckit-converge` al final. Al entregar, el directorio queda inmutable, y un cambio posterior (los endpoints de historial, la fase en vivo, otro valor de cuota) es una spec nueva. |

## Project Structure

### Documentation (this feature)

```text
specs/005-b2-api-ejecuciones/
├── spec.md                  # qué y por qué, con el clarify del 2026-10-05
├── research.md              # decisiones de diseño (R1 a R22) y cómo se verificaron
├── data-model.md            # las seis tablas, el DDL, el ciclo de una ejecución y los tipos
├── contracts/
│   ├── runs-api.md          # el contrato HTTP de /api/runs y /api/harness
│   ├── executor.md          # el contrato con el ejecutor de B1 y los plazos
│   └── harness-template.md  # la plantilla, la gramática, la evidencia y la clasificación
├── reference-generator.md   # el código verificado del generador, los checks y el fixture
├── quickstart.md            # escenarios de validación con sus comandos
├── plan.md                  # este archivo: cómo, repartido en dueños
├── tasks.md                 # una línea por tarea
└── checklists/requirements.md
```

### Source Code (repository root)

```text
backend/api/
├── app/
│   ├── Progress/            (nuevo) ProgressHead, AccountLock                      ← compartido con D1
│   ├── Runs/                (nuevo) RunStatus, RunReason, RunLanguage, ExecutorPhase, TestOutcome, CancelOutcome, RunLog,
│   │   │                    RunReader, RunView, RunPresenter, RunLimiters
│   │   ├── Record/          Instant, RunRow, RunProgress, AttemptFacts
│   │   ├── Program/         ExpectedTest, ExerciseSnapshot, Whitespace, ProgramInput, ProgramRenderer,
│   │   │                    ComposedProgram, ProgramComposer
│   │   ├── Evidence/        ExecutorResult, ExpectedEvidence, TestVerdict, Verdict, Evidence, EvidenceReader,
│   │   │                    ResultClassifier
│   │   ├── Admission/       ExerciseReader, SubmittedRun, QuotaKind, QuotaUsage, QuotaPolicy, RejectionKind,
│   │   │                    Rejection, RunRejected, AdmissionFailed, AdmissionResult, RunAdmission
│   │   └── Execution/       ProgressMerge, ProgressWriter, RunCloser, RunCloseFailed, ClaimOutcome, Claim, RunClaimer,
│   │                        RequeueOutcome, RunRequeuer, RunProcessor, RunCanceller, ActiveRuns, RunExpiry,
│   │                        CancelRunsOfRestrictedAccount, ReplyKind, ExecutorReply, ExecutorClient, RunExecution,
│   │                        Uuid7Cutoff, RunPruner, PruneReport
│   ├── Jobs/ExecuteRun.php  (nuevo)
│   ├── Auth/Events/         (nuevo, sólo si C3b no lo entregó) AccountRestricted, AccountRestriction
│   ├── Console/Commands/    (nuevo) SweepRuns, PruneRuns        (cambia) ImportContent: el texto de «17»
│   ├── Http/Controllers/    (nuevo) RunController               (cambia) ContentController: harness()
│   ├── Http/Requests/       (nuevo) SubmitRunRequest
│   └── Content/             (cambian) Portion, ContentTables, ContentMeta, ContentSource, ContentRows, ContentReader,
│       │                    PortionAssembler, PortionRenderer, ContentInvariants, ContentImporter, ContentDiff
│       └── Record/HarnessTemplate.php   (nuevo)
├── config/runs.php          (nuevo)    queue.php: la conexión `runs`           (línea de integración)
├── routes/api/              (nuevos) runs.php, harness.php
├── database/migrations/     (nuevas) 2026_10_05_300001 … 300007: harness_templates, progress_heads, attempts,
│                            attempt_tests, attempt_payloads, runs, exercise_progress
├── tests/                   Unit/Runs/, Feature/Runs/, Concurrency/ (suite nueva), Support/ (RunWorld, RunInvariants,
│                            Parallel), y los de Content y Unit que cambian por la 18.ª porción
├── Dockerfile  phpunit.xml  tests/Pest.php  .env.example  scripts/{init-env,deploy,smoke}.sh
backend/executor/            sin cambios
content/harness/             (nuevo) rust.tpl, go.tpl
tools/content/               (nuevo) harness.ts                   (cambian) exercises.ts, meta.ts, load-curriculum.ts, build-curriculum.ts
qa/                          (nuevos) content-harness-check.ts, api-runs-check.ts, nginx-api-blocks-check.ts,
                             fixtures/shared/harness-cases.json
                             (cambian) content-check.ts, content-exercises-check.ts, content-tools-check.ts,
                             curriculum-meta-check.ts, run-checks.ts, api-content-check.ts
docker/                      (cambian) compose.yaml, nginx/nginx.conf
package.json  README.md  backend/api/AGENTS.md  docs/architecture.md  qa/AGENTS.md
```

**Structure Decision:** lo nuevo vive en `app/Runs/` (dividido por responsabilidad: programa, evidencia, admisión y ejecución) y en `app/Progress/` (lo que D1 comparte), junto al módulo `app/Content/` que ya existe. Sin barrels ni capas nuevas, y sin un proveedor de servicios propio: lo que B2 necesita registrar son líneas de integración en archivos de C3a.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que una prueba no cubre del todo:

- **Bloqueos y aislamiento.**
  - Cada escritor toma `progress_heads` primero y sigue el orden de D08 (`users FOR SHARE` antes de `runs`), en READ COMMITTED y por `WriteTransaction`, que fija el aislamiento en **cada** intento y no falla dentro de una transacción ya abierta (T003 lo prueba con `information_schema.innodb_trx`, que dice el aislamiento real de la transacción).
  - Nada externo dentro de una transacción: ni el ejecutor ni una espera.
- **Un solo intento por trabajo.** No hay `release()` ni `tries` mayor que 1. El reencolado por ocupado despacha un trabajo nuevo con demora en la misma transacción. La conexión `runs` tiene `after_commit` en `false`, y ningún despacho llama a `afterCommit()`.
- **Los plazos.** Ejecutor 90 < cliente 100 < trabajo 120 < `retry_after` 140; `stop_grace_period` de 150 s en `worker-runs`, de 45 s en el ejecutor. PCNTL está en la imagen. `RunsConfigTest` fija el orden.
- **«Pudo haber corrido».** Sólo un 503 o un errno de conexión 6 o 7 prueban que no corrió; todo lo demás es `executor_error`. Un `ConnectionException` por sí solo no alcanza.
- **La evidencia.** El nonce está en cada expresión regular; cada prueba necesita exactamente un marcador; el centinela, uno solo con la cuenta; la prueba propia nunca cuenta; y las claves de prueba son texto aunque sean dígitos (`'123'` no puede ser una clave de arreglo de PHP).
- **Las cuotas.** Se cuentan después de tomar el candado; `infra_error` no gasta; lo rechazado no deja ejecución, ni trabajo, ni cuota gastada; un reintento no se rechaza.
- **El cierre.** Una transacción por cierre; el intento y su payload siempre; el progreso sólo con la época vigente y sin tocar las columnas de D1; la revisión nueva en la cabecera y en la fila; `program` en `NULL` al cerrar; el cierre repetido no duplica el intento.
- **El tiempo.** Toda hora sale del reloj de PHP, con bindings `Y-m-d H:i:s.v`; ninguna sentencia usa `NOW()`.
- **Los bytes.** El código llega sin recortar (excepción en `bootstrap/app.php`), se arma con una sola pasada de sustitución y se guarda con `utf8mb4_0900_bin`.
- **El log y las excepciones.** Ningún registro lleva el código, la prueba propia, la salida ni el programa; y una `QueryException` trae las sentencias con sus valores, que son justo eso: el cierre y la admisión la convierten en una excepción sin el SQL antes de que llegue al log o a `failed_jobs`.
- **El secreto.** `EXECUTOR_TOKEN` está en `executor` y en `worker-runs`, y en ningún otro servicio ni en el ancla `x-laravel-env`.
- **Lo ya entregado.** Las 17 porciones conservan sus bytes y sus validadores, y cada lugar que decía «17» o «21» cambió; el único cambio de `grading_hash` son los 49 ejercicios de Go con `imports`; ningún YAML de ejercicio se editó.
- **Nivel 9.** Sin baseline, `ignoreErrors`, `@phpstan-ignore` ni casts de `mixed`: las filas entran por `RunRow::fromRow` y compañía, y las respuestas del ejecutor por `ExecutorResult::fromPayload`.
- **Lo compartido con C3a y con C3b.** Ningún dueño de B2 edita `bootstrap/app.php`, `routes/console.php`, `config/queue.php`, `ApiCode`, `lang/es`, el proveedor de servicios, Compose ni Nginx: son las líneas de integración de la tabla de «Reparto en paralelo».
- **El log.** Todo registro de las ejecuciones sale de `RunLog`, cuyas firmas sólo reciben ids, enums y números; una prueba de arquitectura prohíbe la fachada `Log` en el resto de `App\Runs` y en el trabajo.
- **Los eventos de cuenta.** El listener lee `users.status` ya confirmado y cancela sólo si la cuenta no está `active`; no lanza, porque el cambio de cuenta ya confirmó.

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos. Un mismo agente puede llevar varias colas si no corren a la vez. Lo que B2 comparte con C3a y con C3b no lo toca ningún dueño: son las **líneas de integración** de abajo, que el coordinador pone al integrar. Cada dueño agrega sus archivos (su archivo en `routes/api/`, sus migraciones, sus servicios y sus pruebas) y no edita los de C3a.

**Ondas.** B2 **parte de S2 de C3a**, no de su entrega: ahí ya están integrados el esquema de identidad (`users.status` y `role`), `WriteTransaction`, los errores con código, los grupos `account` y `verified`, el `Browser` de pruebas, los límites, las podas y el `scheduler`. Lo que B2 toma de ahí está en «Lo que B2 toma de C3a».

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | B y G, a la vez, y después el coordinador | **B**: T001 a T003, el esquema; los tipos, la configuración y el registro de log; y `AccountLock`. **G**: T004 a T006, el generador (la regla de las claves de prueba, el `grading_hash` con los `imports` de Go y la plantilla con su fixture). **Coordinador**: T007, cuando B y G entregaron: la imagen, la conexión de la cola, los códigos de error y las rutas |
| 1 | E, C y X, a la vez (desde S0) | **E**: T008, el programa y la evidencia. **C**: T009, la plantilla en el contenido y en la API. **X**: T010 a T012, el cierre y el progreso; el reclamo, el reencolado y el trabajo; la cancelación, el vencimiento y el listener |
| 2 | J y A, a la vez (desde S1) | **J**: T013 a T015, el cliente del ejecutor, la ejecución de un trabajo, el barrido y la poda. **A**: T016 y T017, la admisión con sus cuotas y el HTTP |
| 3 | Coordinador y O (desde S2) | **Coordinador**: T018 y T019, las líneas de integración y la operación. **O**: T020, el check de punta a punta, cuando T019 dejó el stack armado. **Coordinador**: T021 y T022, la documentación y la compuerta |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| B · Base | `backend/api/database/migrations/2026_10_05_3000NN_*.php` (siete), `backend/api/app/Runs/{RunStatus,RunReason,RunLanguage,ExecutorPhase,TestOutcome,CancelOutcome,RunLog}.php`, `backend/api/app/Runs/Record/{Instant,RunRow,RunProgress,AttemptFacts}.php`, `backend/api/app/Runs/Evidence/{ExecutorResult,ExpectedEvidence,TestVerdict,Verdict}.php`, `backend/api/app/Progress/{ProgressHead,AccountLock}.php`, `backend/api/config/runs.php`, `backend/api/phpunit.xml`, `backend/api/tests/Pest.php`, `backend/api/tests/Support/{RunWorld,RunInvariants,Parallel}.php`, `backend/api/tests/Feature/Runs/{SchemaTest,AccountLockTest,RunWorldTest}.php`, `backend/api/tests/Unit/Runs/{RunStatusTest,InstantTest,RunRowTest,RunProgressTest,ExecutorResultTest,VerdictTest,RunLogTest,LogArchTest}.php`, `backend/api/tests/Content/RunsMigrationsTest.php`, `backend/api/tests/Concurrency/AccountLockConcurrencyTest.php` | de C3a (S2): `WriteTransaction`, `users.status`, la fábrica de usuarios, `ApiCode` | las tablas, los tipos, la configuración, el registro de log, `AccountLock`, el ayudante de procesos paralelos y el mundo mínimo de pruebas |
| G · Generador | `tools/content/{exercises,meta,load-curriculum,build-curriculum,harness}.ts`, `content/harness/{rust,go}.tpl`, `qa/{content-check,content-exercises-check,content-tools-check,curriculum-meta-check,content-harness-check,run-checks}.ts`, `qa/fixtures/shared/harness-cases.json` | — | las claves de prueba libres, el `grading_hash` con los `imports`, `build/harness.json`, la 18.ª porción en el meta y el fixture compartido |
| E · Programa y evidencia | `backend/api/app/Runs/Program/{ExpectedTest,ExerciseSnapshot,Whitespace,ProgramInput,ProgramRenderer,ComposedProgram,ProgramComposer}.php`, `backend/api/app/Runs/Evidence/{Evidence,EvidenceReader,ResultClassifier}.php`, `backend/api/tests/Unit/Runs/Program/`, `backend/api/tests/Unit/Runs/Evidence/`, `backend/api/tests/Unit/Runs/PurityTest.php` | de B: los enums y los tipos de evidencia; de G: el fixture y las plantillas | el armado del programa y la lectura de la evidencia, puros |
| C · Contenido | `backend/api/app/Content/{Portion,ContentTables,ContentMeta,ContentSource,ContentRows,ContentReader,PortionAssembler,PortionRenderer,ContentInvariants,ContentImporter,ContentDiff}.php`, `backend/api/app/Content/Record/HarnessTemplate.php`, `backend/api/app/Console/Commands/ImportContent.php`, `backend/api/app/Http/Controllers/ContentController.php`, `backend/api/routes/api/harness.php`, `backend/api/tests/Support/{ContentDatabase,ContentFixture}.php`, `backend/api/tests/Unit/Record/HarnessTemplateTest.php`, `backend/api/tests/Content/HarnessEndpointTest.php`, y las pruebas existentes que dicen «17» o «21» o fijan el mensaje de `test_key` (lista en T009) | de G: el meta con la 18.ª porción y `harness.json`; de B: `harness_templates` | la plantilla importada y publicada, el mensaje nuevo del importador |
| X · Cierre y camino del trabajo | `backend/api/app/Runs/Execution/{ProgressMerge,ProgressWriter,RunCloser,RunCloseFailed,ClaimOutcome,Claim,RunClaimer,RequeueOutcome,RunRequeuer,RunProcessor,RunCanceller,ActiveRuns,RunExpiry,CancelRunsOfRestrictedAccount}.php`, `backend/api/app/Jobs/ExecuteRun.php`, `backend/api/app/Auth/Events/{AccountRestricted,AccountRestriction}.php` (sólo si C3b no los entregó), `backend/api/tests/Unit/Runs/Execution/ProgressMergeTest.php`, `backend/api/tests/Feature/Runs/Execution/{RunCloserTest,CloseFailureTest,RunClaimerTest,RunRequeuerTest,ExecuteRunTest,RunCancellerTest,ActiveRunsTest,RunExpiryTest,CancelRunsOfRestrictedAccountTest}.php`, `backend/api/tests/Concurrency/{CloseConcurrencyTest,ClaimConcurrencyTest,CancelConcurrencyTest}.php` | de B: el esquema, los tipos, `AccountLock` y `RunLog` | el cierre, el reclamo, el reencolado, la cancelación, el vencimiento, el trabajo con su puerto (`RunProcessor`) y el listener |
| J · Ejecución | `backend/api/app/Runs/Execution/{ReplyKind,ExecutorReply,ExecutorClient,RunExecution,Uuid7Cutoff,RunPruner,PruneReport}.php`, `backend/api/app/Console/Commands/{SweepRuns,PruneRuns}.php`, `backend/api/tests/Unit/Runs/Execution/{Uuid7CutoffTest,ExecutorReplyTest}.php`, `backend/api/tests/Feature/Runs/Execution/{ExecutorClientTest,RunExecutionTest,RunExecutionLogTest,RunPrunerTest,SweepRunsCommandTest,PruneRunsCommandTest}.php` | de B, E y X, ya integrados | el cliente del ejecutor, el orquestador del trabajo (`RunExecution`, que implementa `RunProcessor`), el barrido y la poda |
| A · Admisión y HTTP | `backend/api/app/Runs/Admission/{ExerciseReader,SubmittedRun,QuotaKind,QuotaUsage,QuotaPolicy,RejectionKind,Rejection,RunRejected,AdmissionFailed,AdmissionResult,RunAdmission}.php`, `backend/api/app/Runs/{RunReader,RunView,RunPresenter,RunLimiters}.php`, `backend/api/app/Http/Controllers/RunController.php`, `backend/api/app/Http/Requests/SubmitRunRequest.php`, `backend/api/routes/api/runs.php`, `backend/api/tests/Unit/Runs/Admission/`, `backend/api/tests/Unit/Runs/RunPresenterTest.php`, `backend/api/tests/Feature/Runs/{ExerciseReaderTest,RunAdmissionTest,AdmissionLogTest,RunEndpointTest,RunShowTest,RunCancelEndpointTest,RunAccessMatrixTest,RunThrottleTest,TrimmingTest}.php`, `backend/api/tests/Concurrency/AdmissionConcurrencyTest.php` | de B, E y X, ya integrados; de C3a: los grupos y `Browser` | la admisión, las cuotas y las tres rutas |
| O · Operación | `qa/api-runs-check.ts` | de C3a: `qa/lib/api-account.ts` (T024 de C3a); del coordinador: T019 | el check de punta a punta con el ejecutor real |
| Coordinador | `backend/api/Dockerfile`, `backend/api/config/queue.php`, `backend/api/bootstrap/app.php`, `backend/api/app/Http/ApiCode.php`, `backend/api/lang/es/api.php`, `backend/api/tests/Unit/{ApiCodeTest.php,Runs/RunsQueueConfigTest.php,Runs/RunsConfigTest.php}`, `backend/api/app/Providers/AppServiceProvider.php`, `backend/api/routes/console.php`, `backend/api/tests/Feature/{ScheduleTest.php,Runs/WiringTest.php}`, `backend/api/tests/Content/ContentEndpointTest.php`, la línea del grupo de `backend/api/routes/api/harness.php`, `qa/api-content-check.ts`, `docker/compose.yaml`, `docker/nginx/nginx.conf`, `backend/api/scripts/{init-env,deploy,smoke}.sh`, `backend/api/.env.example`, `qa/nginx-api-blocks-check.ts`, `package.json`, `README.md`, `backend/api/AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md`, `AGENTS.md`, `specs/backend-multiusuario/roadmap.md` | todo | la base de la imagen, las líneas de integración, la operación, la documentación y la evidencia de cierre |

`qa/run-checks.ts` lo toca G en la onda 0 (el check nuevo del generador) y nadie más después.

**Puntos de sincronización** (el coordinador integra y avisa), atados a los de C3a:

- **A0 = S2 de C3a.** C3a trae integrados T001 a T015 con las líneas de integración de S2. B y G parten de ahí. A0 no es la entrega de C3a: B2 no espera a que termine.
- **S0:** T001 a T007 integrados. E, C y X parten de ahí.
- **S1:** T008 a T012 integrados. J y A parten de ahí.
- **S2:** T013 a T017 integrados. El coordinador cierra la integración.
- **S3:** T018 y T019 integrados y el stack levantado con el ejecutor. O parte de ahí, y de T024 de C3a (el ayudante de cuentas de prueba, `qa/lib/api-account.ts`, que llega en la onda 4 de C3a): si todavía no está, T020 espera.
- **Cierre:** T020 a T022. T021 y T022 corren con C3a entregada o con lo que C3a haya integrado hasta entonces (la compuerta lo dice).

**Líneas de integración** (las pone el coordinador al integrar; ningún dueño toca esos archivos):

| Cuándo | Archivo | Línea o cambio |
| --- | --- | --- |
| T007 | `backend/api/bootstrap/app.php` | `withRouting(api: [...])` suma `routes/api/harness.php` y `routes/api/runs.php` (un archivo que no existe se omite). Y las dos excepciones de recorte: `$middleware->trimStrings(except: [fn (Request $request) => $request->is('api/runs', 'api/runs/*')]);` y la misma con `convertEmptyStringsToNull` |
| T007 | `backend/api/config/queue.php` | la conexión `runs`: `driver` `database`, `connection` `env('DB_QUEUE_CONNECTION')`, `table` `jobs`, `queue` `runs`, `retry_after` `(int) env('RUNS_QUEUE_RETRY_AFTER', 140)` y `after_commit` `false` |
| T007 | `backend/api/app/Http/ApiCode.php`, `backend/api/lang/es/api.php`, `backend/api/tests/Unit/ApiCodeTest.php` | tres casos: `ClientRunIdReused` (`client_run_id_reused`, 422), `QuotaExceeded` (`quota_exceeded`, 429) y `QueueFull` (`queue_full`, 503), con los mensajes de [contracts/runs-api.md](./contracts/runs-api.md), y su fila en la prueba |
| T007 | `backend/api/Dockerfile` | PCNTL; la etapa `curriculum` copia también `build/harness.json` a `resources/content/`; el stage `dev` copia `qa/fixtures/shared` a `tests/Fixtures/shared` |
| T018 | `backend/api/app/Providers/AppServiceProvider.php`, en `register()` | `$this->app->bind(RunProcessor::class, RunExecution::class);` y `$this->app->when(ResultClassifier::class)->needs('$sandboxRuntime')->giveConfig('runs.executor.runtime');` |
| T018 | `backend/api/app/Providers/AppServiceProvider.php`, en `boot()` | `RunLimiters::register();` (al lado de `Limiters::register();` de C3a) y `Event::listen(AccountRestricted::class, CancelRunsOfRestrictedAccount::class);` |
| T018 | `backend/api/routes/console.php` y `backend/api/tests/Feature/ScheduleTest.php` | `Schedule::command('runs:sweep')->everyMinute()->withoutOverlapping();` y `Schedule::command('runs:prune')->hourly()->withoutOverlapping();`, y las dos tareas en la lista exacta que esa prueba exige |
| T018 | `backend/api/routes/api/harness.php` y `backend/api/tests/Content/HarnessEndpointTest.php` | la ruta entra en `Route::middleware(['account', 'verified'])->group(...)` cuando las otras 17 porciones ya están detrás de la sesión (T022 de C3a) o a la vez que ellas, lo que llegue último, y la prueba se autentica como `ContentEndpointTest` |
| T018 | `backend/api/tests/Content/ContentEndpointTest.php` y `qa/api-content-check.ts` | el título «all 17 portions» pasa a «all 18 portions»; la función `urlOf` del check suma `harness` (`/api/harness`) |
| T018 | `UserData` de C3b, si ya está integrado | las seis tablas de la declaración de [data-model.md](./data-model.md), sección 8 |
| T019 | `docker/compose.yaml`, `docker/nginx/nginx.conf`, `backend/api/scripts/{init-env,deploy,smoke}.sh`, `backend/api/.env.example`, `package.json` | los servicios, la ubicación, las variables y las comprobaciones de la sección 8.2 |

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **C3a.**
  - *Migraciones:* C3a reserva `2026_10_05_200001` a `200099`; B2 usa `2026_10_05_300001` a `300099`, porque sus claves apuntan a `users`. D1 y C3b toman un bloque posterior.
  - *Escritor común:* `WriteTransaction` es de C3a (T006) y B2 lo usa a través de `AccountLock`. La primera referencia de C3a fijaba el aislamiento una sola vez y reintentaba con `DB::transaction(..., attempts: 3)`, así que el reintento tras un interbloqueo corría en REPEATABLE READ; la implementación de su T006 lo encontró y su plan ya fija la sesión en READ COMMITTED y la restaura en un `finally` (ver R12). Las pruebas de T003 son la guardia de lo que B2 usa.
  - *Errores:* `ApiCode` es un enum cerrado de C3a; los tres códigos de B2 son líneas de integración.
  - *Programación:* `routes/console.php` y su `ScheduleTest` (lista exacta de tareas) son de C3a; B2 suma dos tareas.
  - *Rutas y pruebas de recorrido:* el `RouteAccessTest` y el `ExpectedAccountMatrixTest` de C3a recorren todas las rutas de `/api`: las de `/api/runs` los cumplen por estar en el grupo `account`; `GET /api/harness` los cumple desde T018, y hasta entonces es pública como las otras 17 porciones. Son la red de seguridad si alguien olvida esa línea.
  - *Nginx y Compose:* las zonas, el `limit_req_status 429`, el DNS cerrado y `init-env.sh` son de C3a (T012); B2 repite el bloque de `/api/` en su ubicación y suma `dns` a sus servicios.
  - *Ayudante de cuentas:* el check de punta a punta usa `qa/lib/api-account.ts` (T024 de C3a).
- **C3b.** Su borrador (spec 010) resuelve el orden de entrega con dos piezas, y B2 no depende de ninguna: **un evento** que C3b dispara después de confirmar que una cuenta se deshabilita, se degrada o pasa a supresión, y **un registro `UserData`** que cada dueño completa. B2 entrega `ActiveRuns::cancelAllOf` (que la purga de C3b puede llamar), un listener que lo engancha al evento (T012; propone `App\Auth\Events\AccountRestricted` si C3b todavía no fijó el suyo) y la declaración de sus tablas ([data-model.md](./data-model.md), sección 8). B2 no crea `UserData` ni dispara el evento.
- **D1.** Importa `AccountLock` y `ProgressHead`; no altera las dos tablas; usa `qa/fixtures/shared/` para su fixture de fusión; la poda de payloads se apoya en los punteros que el reset borra (acuerdo de la sección 6 de [data-model.md](./data-model.md)); su bloque de migraciones va después de `300099`.
- **C4.** El worker de ejecuciones lee `RUNS_DB_USERNAME` y `RUNS_DB_PASSWORD` (los de la aplicación si faltan): C4 puede darle su usuario de MySQL sin tocar código. B2 no configura el binlog ni la IP del cliente.
- **A3 y A4.** Consumen el contrato HTTP y el fixture; A3 decide si pide la plantilla al arrancar o sólo al abrir el laboratorio.
- **La limpieza al inglés y el épico del front** no tocan `backend/api/app/Runs/` ni `app/Progress/`.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `backend/api/AGENTS.md` y la constitución;
  - la spec, [data-model.md](./data-model.md), [research.md](./research.md), los contratos de [contracts/](./contracts/) que toquen tu tarea y tu sección;
  - las skills `tdd`, `laravel-tdd`, `laravel-specialist`, `laravel-security`, `php-pro` y `codebase-design`. De ellas mandan el ADR y las decisiones del usuario: no se toman Sanctum, `strict_types` ni una meta de cobertura.
- **TDD, siempre.**
  - Escribí las pruebas de tu paso y comprobá que fallan por la razón que dice el plan. Recién entonces implementá.
  - Si una prueba de C2 o de C3a falla, el error está en el código nuevo: su valor esperado no se toca.
  - Un esperado sale de un contrato, de la consigna o de un ejemplo resuelto aparte; nunca del código que probás.
- **Archivos que no son tuyos no se tocan,** y las líneas de integración las pone el coordinador. Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Comandos.** En cada terminal: `export COMPOSE_PROJECT_NAME=taller-b2-<dueño>`, y un `.env` con `sh backend/api/scripts/init-env.sh`. Después:
  - `npm run api:test -- --filter=<Prueba>` y `npm run api:test -- --testsuite=<Unit|Feature|Content|Concurrency>`;
  - `npm run api:analyse` (nivel 9, sin baseline: tu código tiene que dar 0 errores);
  - `npm run api:format:check`;
  - `npm run api:test:down`.

  Sólo O y el coordinador levantan el stack (`docker compose up`), cada uno con su propio `COMPOSE_PROJECT_NAME` y `TALLER_PORT`. Las imágenes y la caché están en la máquina: si un comando intenta descargar algo, pará y pedí permiso.
- **Estilo.**
  - Código y pruebas en inglés. Los mensajes al alumno y al operador salen de `lang/es` o van literales en español, como los de C2.
  - **Sin comentarios** salvo una función, clase o método que la complejidad exija, o una referencia puntual a un ADR o a un bug: el repositorio los borra.
  - Sin `declare(strict_types=1)`, sin sintaxis posterior a PHP 8.3, sin `@phpstan-ignore` ni baseline. Una `list<…>` tipada se arma con `foreach`; los arreglos se transforman con Collections y `Arr::`.
  - Los datos de un pedido pasan de `FormRequest` a un registro `readonly` antes de salir del controlador; una fila entra a la lógica como registro (`fromRow`), nunca como arreglo suelto.
  - Toda hora sale del reloj de PHP y viaja como binding `Y-m-d H:i:s.v`; ninguna sentencia usa `NOW()`.
  - Formato con Pint.
- **Commits.** Chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada commit lleva la prueba con lo que verifica. La evidencia de una tarea es su commit, y lo que midas va en el mensaje.
- **Al terminar**, informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Base: esquema, tipos y candado de la cuenta (dueño B, onda 0)

**Cubre:** FR-020 (los estados), FR-029, FR-033 y FR-043 (el esquema), el candado de FR-015, FR-049 y las configuraciones de FR-009 (`config/runs.php`); SC-011.

**Entrega:** al llegar S0, las siete tablas, los tipos que comparten todos los dueños, `config/runs.php`, `AccountLock` y el mundo mínimo de pruebas.

### Tarea 0.1 · El esquema, con sus pruebas primero (T001)

- **Crea:** las siete migraciones `backend/api/database/migrations/2026_10_05_3000NN_*.php`, `backend/api/tests/Feature/Runs/SchemaTest.php`, `backend/api/tests/Content/RunsMigrationsTest.php` y `backend/api/tests/Support/RunInvariants.php`.
- **Modifica:** `backend/api/phpunit.xml` y `backend/api/tests/Pest.php` (la suite `Concurrency`).
- **Entrega:** las tablas de [data-model.md](./data-model.md), sección 1, una por archivo, en este orden y con estos nombres:

| Archivo | Tabla |
| --- | --- |
| `2026_10_05_300001_create_harness_templates_table.php` | `harness_templates` |
| `2026_10_05_300002_create_progress_heads_table.php` | `progress_heads` |
| `2026_10_05_300003_create_attempts_table.php` | `attempts` |
| `2026_10_05_300004_create_attempt_tests_table.php` | `attempt_tests` |
| `2026_10_05_300005_create_attempt_payloads_table.php` | `attempt_payloads` |
| `2026_10_05_300006_create_runs_table.php` | `runs` |
| `2026_10_05_300007_create_exercise_progress_table.php` | `exercise_progress` |

**Pasos:**

1. **Primero las pruebas.** `SchemaTest` (suite `Feature`) lee `information_schema` como `ContentSchemaTest`, **sin mirar las migraciones**: sus expectativas salen de las listas de columnas de [data-model.md](./data-model.md), sección 6, y del ADR 0006 §5.3 y §5.4.
   - **A.** Las siete tablas existen, en InnoDB y con la colación `utf8mb4_es_0900_ai_ci`.
   - **B.** Cuántas columnas tiene cada una y cuáles, en este orden: `progress_heads` 7, `exercise_progress` 28, `attempts` 20, `attempt_tests` 5, `attempt_payloads` 6, `runs` 27 y `harness_templates` 2 (95 columnas en total). La lista de `exercise_progress` es la de D1: ninguna le falta (SC-011).
   - **C.** Tipos y colaciones que importan: `runs.id` es `char(36)` en `ascii_bin`; `runs.code`, `runs.stdout`, `runs.stderr`, `runs.program` y `attempt_payloads.code` son `mediumtext` en `utf8mb4_0900_bin`; `attempt_payloads.stdout` es `text`; `runs.status` es un ENUM con los nueve estados en el orden del ADR y por omisión `queued`; `attempts.outcome` tiene ocho valores con `legacy_error` al final; `attempts.counted` es una columna generada `VIRTUAL` cuya expresión nombra `legacy` y los cinco resultados que cuentan; todas las columnas de instante son `datetime(3)`.
   - **D.** Claves e índices por nombre y columnas: las seis claves primarias; `runs_user_id_client_run_id_unique` y `runs_attempt_id_unique`; `runs_user_id_created_at_index`, `runs_status_created_at_index` y `runs_exercise_id_index`; `attempts_user_id_exercise_id_attempted_at_index` y `attempts_exercise_id_attempted_at_outcome_index`; `attempt_tests_exercise_id_test_key_outcome_index`; `attempt_payloads_created_at_index`; `exercise_progress_exercise_id_solved_at_index` y `exercise_progress_user_id_revision_index`.
   - **E.** Las claves foráneas, por `REFERENTIAL_CONSTRAINTS` y `KEY_COLUMN_USAGE`: de `user_id` hacia `users(id)` en cascada (`progress_heads`, `exercise_progress`, `attempts` y `runs`); de `exercise_id` hacia `exercises(id)` con `RESTRICT` (`exercise_progress`, `attempts` y `runs`); `runs.attempt_id` hacia `attempts(id)` en cascada; `attempt_tests.attempt_id` y `attempt_payloads.attempt_id` hacia `attempts(id)` en cascada; `(exercise_id, test_key)` de `attempt_tests` hacia `exercise_tests` con `RESTRICT`; `harness_templates.language` hacia `languages(code)` con `RESTRICT`. **No hay** una clave foránea de `exercise_progress.proof_attempt_id` ni de `last_attempt_id` hacia `attempts`, ni de `attempts` hacia `exercise_grading_versions` (D29).
   - **F.** Los `CHECK` de cada tabla, por `information_schema.CHECK_CONSTRAINTS`: `runs` tiene sólo `runs_client_run_id_check`; `attempts`, `attempts_grading_hash_check` y `attempts_code_sha256_check`; `exercise_progress`, `exercise_progress_flags_check`; las demás, ninguno. Ninguno de esos `CHECK` nombra una columna `DATETIME` (D07, resultado de C2).
   - **G.** Con un usuario y las seis tablas pobladas, `DELETE FROM users WHERE id = ?` no falla y deja 0 filas en las seis (FR-043, SC-011).
   - **H.** `RunInvariants::crossedPointers()` devuelve las filas de `exercise_progress` cuyo `proof_attempt_id` o `last_attempt_id` apunta a un intento de otra cuenta o de otro ejercicio: la prueba planta un puntero cruzado y la consulta lo encuentra; con datos limpios devuelve 0 filas.
   - **I.** `RunsMigrationsTest` (suite `Content`, porque el DDL confirma sus propias transacciones): con las siete migraciones traídas con `require` de sus archivos, `down()` en orden inverso deja las siete tablas sin existir y `exercises` intacta, y `up()` en orden las recrea con un `SHOW CREATE TABLE` igual al de antes.
   Corrélas: fallan porque las tablas no existen («Table … doesn't exist»), que es la razón esperada, y no por un error de sintaxis.
2. **Las migraciones.** Cada `up()` es un único `DB::statement` con el DDL de [data-model.md](./data-model.md), con el mismo encabezado que las de C2 (`// One CREATE TABLE with keys and constraints inline (ADR 0006 D35). Source of truth: specs/005-b2-api-ejecuciones/data-model.md`). Cada `down()` hace `Schema::dropIfExists` y sólo sirve en desarrollo: en producción no se hace vuelta atrás (ADR 0006 §10).
3. **`RunInvariants`** (`tests/Support/RunInvariants.php`) trae una consulta por cada regla de la tabla de [data-model.md](./data-model.md), sección 2, y `assertClean()` falla con la descripción de la que devuelva una fila. Las demás tareas lo llaman al final de sus pruebas que tocan `runs`.
4. **La suite `Concurrency`.** En `phpunit.xml`, `<testsuite name="Concurrency"><directory>tests/Concurrency</directory></testsuite>`; en `tests/Pest.php`, `pest()->extend(TestCase::class)->use(DatabaseTruncation::class)->in('Concurrency');`, con el mismo comentario que la de `Content`: confirma sus propias transacciones, así que trunca en lugar de deshacer.
5. `npm run api:test` completo, `npm run api:analyse` y `npm run api:format:check`.

**Compuerta:** las pruebas de 1 en verde, la suite entera en verde y 0 errores de PHPStan en el nivel 9.

### Tarea 0.2 · Los tipos compartidos y la configuración (T002)

- **Crea:** `backend/api/app/Runs/{RunStatus,RunReason,RunLanguage,ExecutorPhase,TestOutcome,CancelOutcome,RunLog}.php`, `backend/api/app/Runs/Record/{Instant,RunRow,RunProgress,AttemptFacts}.php`, `backend/api/app/Runs/Evidence/{ExecutorResult,ExpectedEvidence,TestVerdict,Verdict}.php`, `backend/api/app/Progress/ProgressHead.php`, `backend/api/config/runs.php`, `backend/api/tests/Support/RunWorld.php`, `backend/api/tests/Feature/Runs/RunWorldTest.php` y `backend/api/tests/Unit/Runs/{RunStatusTest,InstantTest,RunRowTest,RunProgressTest,ExecutorResultTest,VerdictTest,RunLogTest,LogArchTest}.php`.
- **Entrega:** las firmas de [data-model.md](./data-model.md), sección 5, más lo que sigue.

```php
enum RunStatus: string      // Queued 'queued', Running 'running', Passed 'passed', Failed 'failed', CompileError 'compile_error',
{                           // RuntimeError 'runtime_error', Timeout 'timeout', InfraError 'infra_error', Canceled 'canceled'
    public function isActive(): bool;
    public function countsAsAttempt(): bool;
}
enum RunReason: string      // Oom 'oom', Signal 'signal', PidsLimit 'pids_limit', OutputLimit 'output_limit', EvidenceInvalid 'evidence_invalid',
{}                          // ExecutorBusy 'executor_busy', ExecutorError 'executor_error', JobFailed 'job_failed', Expired 'expired', AccountDisabled 'account_disabled'
enum RunLanguage: string {} // Rust 'rust', Go 'go'
enum ExecutorPhase: string {} // Compile 'compile', Run 'run'
enum TestOutcome: string {} // Pass 'pass', Fail 'fail', Missing 'missing'
enum CancelOutcome {}       // Canceled, Requested, Unchanged, NotFound

final readonly class Verdict
{
    public function asCanceled(): self;   // conserva lo que informó el sandbox (fase, código, tiempos, salidas) y deja `canceled`, sin motivo ni veredictos
}
```

`RunLog` es la única puerta del log de las ejecuciones (R17): un método por hecho, con ids, enums y números, nunca texto del alumno:

```php
final class RunLog
{
    public static function admitted(RunRow $run): void;                                         // run.admitted
    public static function rejected(int $userId, string $exerciseId, string $code): void;       // run.rejected: $code es el código de error de la API
    public static function claimed(RunRow $run): void;                                          // run.claimed
    public static function requeued(RunRow $run, int $delaySeconds): void;                      // run.requeued
    public static function closed(RunRow $run, Verdict $verdict): void;                         // run.closed
    public static function cancelRequested(RunRow $run): void;                                  // run.cancel_requested
    public static function executorFailed(RunRow $run, string $cause, ?int $httpStatus): void;  // run.executor_failed: error si es 400, 401 o 413
    public static function jobFailed(string $runId, ?Throwable $error): void;                   // run.job_failed: sólo la clase de la excepción
    public static function closeFailed(string $runId, string $sqlState, ?int $driverCode): void; // run.close_failed
    public static function swept(int $closed): void;                                            // run.swept
    public static function pruned(int $runs, int $payloads): void;                              // run.pruned
}
```

`config/runs.php` (los nombres que usan las demás tareas; los valores por omisión son los de Q1, FR-007 a FR-009 y los plazos de [contracts/executor.md](./contracts/executor.md)):

```php
return [
    'quota' => [
        'active' => (int) env('RUNS_QUOTA_ACTIVE', 1),
        'per_minute' => (int) env('RUNS_QUOTA_PER_MINUTE', 10),
        'per_day' => (int) env('RUNS_QUOTA_PER_DAY', 300),
        'sandbox_minutes_per_day' => (int) env('RUNS_QUOTA_SANDBOX_MINUTES', 30),
    ],
    'queue' => [
        'max_waiting' => (int) env('RUNS_QUEUE_MAX_WAITING', 32),
        'retry_after_active' => (int) env('RUNS_RETRY_AFTER_ACTIVE', 3),
        'retry_after_full' => (int) env('RUNS_RETRY_AFTER_FULL', 10),
    ],
    'throttle_per_minute' => (int) env('RUNS_THROTTLE_PER_MINUTE', 30),
    'expiry' => [
        'queued_seconds' => (int) env('RUNS_EXPIRY_QUEUED_SECONDS', 600),
        'running_seconds' => (int) env('RUNS_EXPIRY_RUNNING_SECONDS', 140),
    ],
    'executor' => [
        'url' => env('EXECUTOR_URL', 'http://executor:8080'),
        'token' => env('EXECUTOR_TOKEN'),
        'runtime' => env('EXECUTOR_RUNTIME', 'runsc'),
        'connect_timeout' => 5,
        'request_timeout' => 100,
    ],
    'limits' => ['code_bytes' => 65536, 'custom_test_chars' => 3000],
    'retention' => ['runs_days' => 14, 'payload_days' => 90],
    'batches' => ['sweep' => 100, 'prune' => 1000, 'prune_max' => (int) env('RUNS_PRUNE_MAX_BATCHES', 100)],
];
```

**Pasos:**

1. **Primero las pruebas**, que fallan porque las clases no existen:
   - **`RunStatusTest`**: `isActive()` es verdadero sólo para `queued` y `running`; `countsAsAttempt()` es verdadero para `passed`, `failed`, `compile_error`, `runtime_error` y `timeout`, y falso para `queued`, `running`, `infra_error` y `canceled` (FR-029, tabla escrita a mano en la prueba). Los nueve valores de texto son los del ADR.
   - **`InstantTest`**: `format` de `2026-10-05T12:00:00.123Z` da `2026-10-05 12:00:00.123`; `parse` de ese texto lo devuelve igual, en UTC; `iso` da `2026-10-05T12:00:00.123Z`; `secondsUntil` de 0,2 s da 1 (nunca menos que 1), de 2,1 s da 3 y de 60 s da 60.
   - **`RunRowTest`**: `fromRow` con una fila como la devuelve el driver (enteros como texto, fechas como `2026-10-05 12:00:00.123`, `expected_tests` como texto JSON) arma el registro con sus tipos; los nulables salen `null`; un estado desconocido o una columna que falta lanza `LogicException` o `ValueError`, no un arreglo de más.
   - **`RunProgressTest`** y la de `ProgressHead`: `fromRow` con sus nulos.
   - **`ExecutorResultTest`**: `fromPayload` con el JSON de ejemplo de [contracts/executor.md](./contracts/executor.md) arma el resultado; devuelve `null` si falta un campo, si sobra uno, si `phase` no es `compile` ni `run`, si `exitCode` o un tiempo no es entero, si un tiempo es negativo o pasa de 4.294.967.295 (el máximo de `INT UNSIGNED`), si `exitCode` sale del rango de `SMALLINT` (de -32.768 a 32.767), si `stdout` no es texto, si un booleano llega como `0` o `"false"`, o si `phase` es `compile` con `exitCode` 0 y sin `timedOut` ni `oomKilled` (una respuesta que el ejecutor no produce: [contracts/executor.md](./contracts/executor.md)).
   - **`VerdictTest`**: `infraError` y `canceled` no traen fase, código, salidas ni veredictos; `asCanceled` de un resultado `failed` con `exitCode` 0 y `stdout` conserva `exitCode` y `stdout`, y deja estado `canceled`, motivo `null`, sin veredictos y `custom` `null`.
   - **`RunLogTest`** y **`LogArchTest`** (FR-042): cada método de `RunLog` escribe el mensaje y las claves que dice su firma y nada más, y con un `RunRow` y un `Verdict` cuyos `code`, `customTest`, `program`, `stdout` y `stderr` llevan la cadena `TALLER_CENTINELA`, el registro serializado no la contiene (se captura con un `Monolog\Handler\TestHandler`); `jobFailed` con una excepción cuyo mensaje lleva la cadena registra sólo el nombre de su clase. La prueba de arquitectura exige que `App\Runs` y `App\Jobs` no usen la fachada `Log` ni el ayudante `logger()` salvo `RunLog`.
   - **`RunWorldTest`**: `RunWorld::exercise()` deja un ejercicio activo con sus tres pruebas, su versión de corrección y la plantilla de su lenguaje, que cumplen las restricciones de C2 (la inserción no falla); `RunWorld::run()` deja una ejecución cuyo `RunRow` coincide con lo pedido y que pasa `RunInvariants`.
2. **Implementá.** Las filas entran por `RunRow::fromRow` y compañía con `App\Content\Record\RowFields` (que ya estrecha `mixed`); las fechas, por `Instant::parse`. `Instant::now()` es `now()->toImmutable()->utc()`, así que `travelTo` y `Carbon::setTestNow` lo congelan. Referencia de `Instant`:

```php
final class Instant
{
    private const FORMAT = 'Y-m-d H:i:s.v';

    public static function now(): CarbonImmutable
    {
        return now()->toImmutable()->utc();
    }

    public static function parse(string $value): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!'.self::FORMAT, $value, 'UTC')
            ?: throw new LogicException("No es un DATETIME(3): {$value}");
    }

    public static function format(CarbonImmutable $at): string
    {
        return $at->utc()->format(self::FORMAT);
    }

    public static function iso(CarbonImmutable $at): string
    {
        return $at->utc()->format('Y-m-d\TH:i:s.v\Z');
    }

    public static function secondsUntil(CarbonImmutable $from, CarbonImmutable $to): int
    {
        return max(1, (int) ceil(((int) $to->format('Uv') - (int) $from->format('Uv')) / 1000));
    }
}
```

   Referencia de `ExecutorResult::fromPayload`:

```php
public static function fromPayload(mixed $payload): ?self
{
    $keys = ['phase', 'exitCode', 'stdout', 'stderr', 'truncated', 'timedOut', 'oomKilled', 'compileMs', 'runMs'];
    if (! is_array($payload) || count($payload) !== count($keys) || array_diff($keys, array_keys($payload)) !== []) {
        return null;
    }
    $phase = is_string($payload['phase']) ? ExecutorPhase::tryFrom($payload['phase']) : null;
    $valid = $phase !== null
        && is_int($payload['exitCode']) && is_string($payload['stdout']) && is_string($payload['stderr'])
        && is_bool($payload['truncated']) && is_bool($payload['timedOut']) && is_bool($payload['oomKilled'])
        && $payload['exitCode'] >= -32768 && $payload['exitCode'] <= 32767
        && is_int($payload['compileMs']) && $payload['compileMs'] >= 0 && $payload['compileMs'] <= 4294967295
        && is_int($payload['runMs']) && $payload['runMs'] >= 0 && $payload['runMs'] <= 4294967295
        && ! ($phase === ExecutorPhase::Compile && $payload['exitCode'] === 0 && ! $payload['timedOut'] && ! $payload['oomKilled']);

    return $valid
        ? new self($phase, $payload['exitCode'], $payload['stdout'], $payload['stderr'], $payload['truncated'], $payload['timedOut'], $payload['oomKilled'], $payload['compileMs'], $payload['runMs'])
        : null;
}
```

   `RunWorld` (`tests/Support/RunWorld.php`) inserta con SQL directo, dentro de la transacción de la prueba, los mínimos que cumplen las restricciones de C2: `languages` (`rust` posición 1, `go` posición 2), `catalogs` (`lab`, `slice_by` `language`), `topics` (uno por lenguaje), un `content_imports` (hashes de 64 hexadecimales y `{}` en las tres columnas JSON), `exercises` con las 33 columnas de C2 (los JSON en `[]` o `{}`, `key_order` con la lista de claves, hashes de 64 hexadecimales y `position` 1), `exercise_tests` (clave, expresión y `position` 1 a n, `key_order` `["id","label","expression","why","failure"]`), `exercise_grading_versions` con el `grading_hash` del ejercicio y `harness_templates` con una plantilla mínima de cada lenguaje que cumple la gramática de [contracts/harness-template.md](./contracts/harness-template.md). Firmas: `RunWorld::exercise(string $id = 'rust-01', string $language = 'rust', array $tests = [...], array $imports = []): void`, `RunWorld::user(array $state = []): User` (por la fábrica de C3a) y `RunWorld::run(User $user, array $overrides = []): RunRow`.
3. `npm run api:analyse` y `npm run api:format:check`: 0 errores.

**Compuerta:** las pruebas en verde, y que los nombres y las firmas sean los de [data-model.md](./data-model.md), sección 5: de eso depende todo el reparto.

### Tarea 0.3 · `AccountLock`, el candado de la cuenta (T003)

- **Crea:** `backend/api/app/Progress/AccountLock.php`, `backend/api/tests/Feature/Runs/AccountLockTest.php`, `backend/api/tests/Concurrency/AccountLockConcurrencyTest.php` y `backend/api/tests/Support/Parallel.php`.
- **Entrega:**

```php
final class AccountLock
{
    /**
     * @template T
     * @param  Closure(ProgressHead): T  $work
     * @return T
     */
    public function within(int $userId, Closure $work): mixed;

    public function advance(ProgressHead $head, CarbonImmutable $at): ProgressHead;
}

final class Parallel
{
    /**
     * @param  array<string|int, Closure(): mixed>  $tasks
     * @return array<string|int, mixed>
     */
    public static function run(array $tasks): array;
}
```

**Pasos:**

1. **Primero las pruebas.** `AccountLockTest` (suite `Feature`):
   - la primera vez crea la cabecera con `epoch` 1, `revision` 0 y `reset_at` y `last_activity_at` `NULL`, y la segunda no la cambia;
   - `within` devuelve lo que devuelve el trabajo, y una excepción del trabajo se propaga;
   - **dentro de una transacción ya abierta** (la que `RefreshDatabase` abre alrededor de cada prueba) `within` corre el trabajo sin el error 1568 de MySQL (el que da un `SET TRANSACTION` sin `SESSION`);
   - `advance` sube la revisión en uno, fija `last_activity_at` y `updated_at` con el instante dado y devuelve la cabecera como queda en la base.
   `AccountLockConcurrencyTest` (suite `Concurrency`, con `Parallel::run`; no tiene una transacción de afuera, así que el aislamiento que se lee es el real):
   - **el aislamiento real es READ COMMITTED en cada intento** (lo que B2 necesita de `WriteTransaction`): dentro de `within`, `select trx_isolation_level from information_schema.innodb_trx where trx_mysql_thread_id = connection_id()` da `READ COMMITTED` (no `@@transaction_isolation`, que dice lo que valdrá la próxima transacción de la sesión); y si el trabajo lanza en el primer intento una excepción con el mensaje de un interbloqueo (`Deadlock found when trying to get lock; try restarting transaction`), el segundo intento también da `READ COMMITTED`;
   - veinte procesos llaman a `within(<cuenta>)` y cada uno hace `advance` y devuelve la revisión que vio: las veinte revisiones son 1 a 20, sin repetidos, y la cabecera termina en 20 (sin actualizaciones perdidas: el candado serializa);
   - dos cuentas distintas no comparten candado: un proceso que mantiene el de la cuenta A hasta que otro, que toma el de la B, termina, no se bloquea (la señal es una fila en `cache`, no un reloj).
   Corrélas: fallan porque `AccountLock` no existe. Con la implementación de abajo y la `WriteTransaction` que integró C3a, pasan. Si una prueba de aislamiento falla con ella, el error es de `WriteTransaction` (R12): B2 lo informa al coordinador y no edita ese archivo.
2. **`Parallel`** (`tests/Support/Parallel.php`): cada tarea corre en un proceso PHP propio con `Concurrency::run(..., timeout: 60)`, y **cada proceso empieza** con `TestCase::ensureTestDatabase(config('database.connections.'.config('database.default')))`: las sustituciones `<server>` de `phpunit.xml` no viajan a los hijos, y uno que no apunte a `mysql-test` aborta antes de escribir.

```php
final class Parallel
{
    public static function run(array $tasks): array
    {
        $guarded = [];
        foreach ($tasks as $key => $task) {
            $guarded[$key] = static function () use ($task): mixed {
                TestCase::ensureTestDatabase(config('database.connections.'.config('database.default')));

                return $task();
            };
        }

        return Concurrency::run($guarded, timeout: 60);
    }
}
```

3. **`AccountLock`**, referencia:

```php
final class AccountLock
{
    public function within(int $userId, Closure $work): mixed
    {
        return WriteTransaction::run(fn () => $work($this->take($userId)));
    }

    public function advance(ProgressHead $head, CarbonImmutable $at): ProgressHead
    {
        $now = Instant::format($at);
        DB::update(
            'update `progress_heads` set `revision` = `revision` + 1, `last_activity_at` = ?, `updated_at` = ? where `user_id` = ?',
            [$now, $now, $head->userId],
        );

        return new ProgressHead($head->userId, $head->epoch, $head->revision + 1, $head->resetAt, $at);
    }

    private function take(int $userId): ProgressHead
    {
        $now = Instant::format(Instant::now());
        DB::insert(
            'insert into `progress_heads` (`user_id`, `epoch`, `revision`, `created_at`, `updated_at`) values (?, 1, 0, ?, ?) as `n` on duplicate key update `user_id` = `n`.`user_id`',
            [$userId, $now, $now],
        );
        $row = DB::selectOne('select * from `progress_heads` where `user_id` = ? for update', [$userId]);

        return ProgressHead::fromRow((array) $row);
    }
}
```

4. `npm run api:test`, `npm run api:analyse` y `npm run api:format:check`: verdes.

**Compuerta:** las pruebas de 1 en verde (la de concurrencia incluida) y la suite entera en verde.

## 1. El generador, la plantilla y el fixture (dueño G, onda 0)

**Cubre:** FR-035, FR-036, FR-037 y FR-039; SC-009 y SC-010. El código ya se ejecutó al planificar: está completo y formateado en [reference-generator.md](./reference-generator.md), y G lo aplica con TDD.

**Entrega:** al llegar S0, la regla de claves libres, el `grading_hash` con los `imports` de Go, `build/harness.json`, la 18.ª porción en el meta y el fixture compartido. **Aviso de integración:** T005 y T006 cambian lo que el generador escribe en `curriculum.meta.json` (49 hashes y una porción más) y el PHP de C2 todavía espera lo anterior, así que desde T005 la suite de contenido de la API queda en rojo **a propósito** hasta que T009 la lee. Por eso el coordinador no lleva T005 y T006 a `master` solos: la rama de S0 es la base de la onda 1 y a `master` va la de S1, con T009 integrado y la suite entera en verde.

### Tarea 1.1 · Las claves de prueba libres (T004)

- **Modifica:** `tools/content/exercises.ts`, `qa/content-check.ts` y `qa/content-exercises-check.ts`.
- **Entrega:** la regla de FR-039: cualquier clave `^[A-Za-z0-9_]{1,64}$`, única en el ejercicio y distinta de `custom`; las tres pruebas por ejercicio siguen exigiéndose en `qa/content-check.ts`.

**Pasos:**

1. Cambiá primero las pruebas, como en el diff de [reference-generator.md](./reference-generator.md), sección 1:
   - en `content-exercises-check.ts`, el caso que esperaba `tests[0].id: se esperaba «t1»` pasa a cinco casos de rechazo con sus mensajes (`custom`, `t-1`, 65 caracteres, `ñ1` y una clave repetida: `tests[1].id: la clave «t1» se repite en el ejercicio`), más el escenario nuevo que acepta claves no consecutivas (`t1` y `t7`; una sola prueba con `prueba_unica_2`) y las deja en su orden;
   - en `content-check.ts`, `assert.equal(test.id, 't' + (i + 1))` pasa a tres aserciones: claves únicas, forma válida y distinta de `custom`.
2. Corrélas: `node qa/content-exercises-check.ts` falla con `tests[1].id: se esperaba «t2»` (la regla vieja), que es la razón esperada. `node qa/content-check.ts` pasa porque las 822 claves actuales ya cumplen la regla nueva.
3. Aplicá el cambio de `exercises.ts` del diff (`TEST_KEY`, `RESERVED_TEST_KEY` y el `Set` de claves en `checkTests`).
4. `node qa/content-exercises-check.ts`, `node qa/content-check.ts` y `node qa/content-tools-check.ts`: verdes. Ningún YAML de `content/` se edita.

**Compuerta:** los tres en verde y `npm run curriculum` deja `build/curriculum.json` con el mismo sha256 que en `master`.

### Tarea 1.2 · El `grading_hash` con los `imports` de Go (T005)

- **Modifica:** `tools/content/meta.ts` (sólo `exerciseHashes` y `gradingImports`) y `qa/curriculum-meta-check.ts` (las aserciones de `grade`).
- **Entrega:** la composición de FR-037: la de C2 más los `imports` de un ejercicio de Go, ordenados y sin repetidos, sólo si los tiene.

**Pasos:**

1. En `curriculum-meta-check.ts`, agregá antes de nada las cuatro aserciones de `grade()` del diff, con las dos constantes **tomadas con `sha256sum`**, no con este código (están calculadas en el comentario del propio check): `da25b107…6171` para `{"imports":["errors","strings"],"prediction":{…},"tests":[…]}` y `84911bb7…5ecd` para la misma sin `imports`.
2. Corré `node qa/curriculum-meta-check.ts`: falla porque `grade('go', ['strings', 'errors', 'strings'])` da el hash viejo (el de sin `imports`), que es la razón esperada.
3. Aplicá el cambio de `meta.ts` del diff.
4. `node qa/curriculum-meta-check.ts`: verde.

**Compuerta:** con la copia de `master` y el script de [quickstart.md](./quickstart.md), escenario 3, cambian exactamente **49** `gradingHash` (todos de Go) y 0 `contentHash` y 0 `starterHash`; `curriculum.json` sale igual.

### Tarea 1.3 · La plantilla, su validador y el fixture compartido (T006)

- **Crea:** `tools/content/harness.ts`, `content/harness/rust.tpl`, `content/harness/go.tpl`, `qa/content-harness-check.ts` y `qa/fixtures/shared/harness-cases.json`.
- **Modifica:** `tools/content/{meta,load-curriculum,build-curriculum}.ts`, `qa/{curriculum-meta-check,content-tools-check,run-checks}.ts`.
- **Entrega:** [contracts/harness-template.md](./contracts/harness-template.md) hecho: `build/harness.json` con los bytes del recurso y `portions.harness` al final del meta.

**Pasos:**

1. Las pruebas, que fallan:
   - `qa/content-harness-check.ts`, tal como está en [reference-generator.md](./reference-generator.md), sección 3: carga las plantillas reales, nombra el archivo que falta y rechaza 18 plantillas mal escritas con su mensaje (CRLF, falta del salto final o uno de más, marcador desconocido o en la sección equivocada, etiqueta que no está sola, secciones anidadas, repetidas, vacías o sin cerrar, `{{code}}` ausente o repetido, falta `{{nonce}}` o `{{count}}`, falta `tests`, falta `imports` en Go o sobra en Rust). Falla porque `tools/content/harness.ts` no existe.
   - `curriculum-meta-check.ts` espera `build/harness.json`, que `meta.portions` tenga las 17 más `harness` al final y que `portions.harness` sea el sha256 de ese archivo. Falla porque el archivo no existe.
   - `content-tools-check.ts` espera el mensaje de `content/` con `harness/`. Falla por el texto viejo.
   - `qa/fixtures/shared/harness-cases.json`: los once casos escritos a mano de [contracts/harness-template.md](./contracts/harness-template.md). Los textos esperados se escriben a mano, **no** se generan con el renderizador.
2. Aplicá el código de [reference-generator.md](./reference-generator.md): `harness.ts`, las plantillas de [contracts/harness-template.md](./contracts/harness-template.md) tal cual, y los cambios de `meta.ts` (`portions.harness`), `load-curriculum.ts` y `build-curriculum.ts` (`harness.json` se escribe antes que el meta). Sumá `content-harness-check.ts` a la lista de `qa/run-checks.ts`.
3. Corré los checks del paso 1: verdes.
4. Comprobá contra un renderizador independiente (el fixture es el contrato de A4): para cada caso, el texto esperado coincide línea por línea con el de una implementación escrita aparte. Al planificar se hizo con una de JavaScript de treinta líneas y dio 0 diferencias en los once casos; quien implemente puede repetirlo, y B2 lo deja en el PHP de T008 con el mismo fixture.

**Compuerta:**

- `npm run curriculum`, `npm test`, `npm run lint`, `npm run format:check` y `npm run typecheck` en verde.
- `node tools/content/dump-globals.ts . | sha256sum` da `cd1f9e62…`, igual que en `master`.
- `build/curriculum.json` tiene el mismo sha256 que en `master` (`ef8f5715…`) y las 17 porciones anteriores conservan el suyo.
- `curriculum.meta.json` tiene 18 porciones, la última `harness`, y `portions.harness` es el sha256 de `build/harness.json`.

## 2. La integración de la onda 0 (coordinador)

**Cubre:** las líneas de integración de S0 y la base de la imagen y de la API; FR-012, FR-013 (la conexión), FR-035 (la imagen) y FR-049.

**Entrega:** una rama de integración con B y G, sobre la que parten E, C y X.

### Tarea 2.1 · La base de la imagen y las líneas de integración (T007)

- **Modifica:** `backend/api/Dockerfile`, `backend/api/config/queue.php`, `backend/api/bootstrap/app.php`, `backend/api/app/Http/ApiCode.php`, `backend/api/lang/es/api.php` y `backend/api/tests/Unit/ApiCodeTest.php`.
- **Crea:** `backend/api/tests/Unit/Runs/RunsQueueConfigTest.php`.

**Pasos:**

1. La prueba primero: `RunsQueueConfigTest` lee `config('queue.connections.runs')` y espera `driver` `database`, `table` `jobs`, `queue` `runs`, `retry_after` 140, `after_commit` `false`, y que sea distinta de `database` (la de `default`, con 90 s). `ApiCodeTest` suma las tres filas nuevas con sus estados (`client_run_id_reused` 422, `quota_exceeded` 429, `queue_full` 503) y un mensaje en español que no es su clave. Fallan porque no existen.
2. Los cambios de la tabla «Líneas de integración» de arriba:
   - `config/queue.php`, la conexión:

```php
'runs' => [
    'driver' => 'database',
    'connection' => env('DB_QUEUE_CONNECTION'),
    'table' => 'jobs',
    'queue' => 'runs',
    'retry_after' => (int) env('RUNS_QUEUE_RETRY_AFTER', 140),
    'after_commit' => false,
],
```

   - `ApiCode` y `lang/es/api.php`, con los mensajes de [contracts/runs-api.md](./contracts/runs-api.md), «Los errores y sus códigos».
   - `bootstrap/app.php`: los dos archivos de rutas en `withRouting(api: [...])` y las dos excepciones de recorte.
   - `backend/api/Dockerfile`:

```dockerfile
RUN docker-php-ext-install pcntl
```

   en el stage `base`, **en una instrucción propia después de la de `pdo_mysql`** (la capa de `pdo_mysql` queda cacheada); en `runtime` y en `dev`, `COPY --from=curriculum /app/build/curriculum.json /app/build/curriculum.meta.json /app/build/harness.json resources/content/`; y en `dev`, `COPY --from=repo qa/fixtures/shared tests/Fixtures/shared`.
3. Con B y G integrados: `npm run api:test -- --testsuite=Unit --filter=Runs` y `--testsuite=Feature --filter=Runs`, y los `Concurrency`, en verde; `npm test` en verde.

**Compuerta:** lo anterior, y una nota en el aviso a la onda 1: **la suite de contenido de la API está en rojo a propósito** (el meta trae 18 porciones y 49 hashes nuevos, y `app/Content/` todavía no los lee) hasta que T009 la deja en verde. Nada de esta rama va a `master` antes de S1. La primera construcción de la imagen con PCNTL baja los paquetes de compilación de Alpine: pide permiso (sección «Descargas y permisos»).

## 3. El programa y la evidencia (dueño E, onda 1)

**Cubre:** FR-004 (el armado del programa), FR-021 a FR-023, FR-036 y FR-038; SC-001 (la clasificación), SC-002 y SC-009.

**Entrega:** al llegar S1, el armado del programa, la lectura de la evidencia y la clasificación del resultado, **puros**: no tocan la base, la cola, el cliente HTTP ni el log (FR-038), así que la auditoría B3 los reutiliza con un ejercicio y un código cualquiera.

### Tarea 3.1 · El renderizador, la lectura de evidencia y el clasificador (T008)

- **Crea:** `backend/api/app/Runs/Program/{ExpectedTest,ExerciseSnapshot,Whitespace,ProgramInput,ProgramRenderer,ComposedProgram,ProgramComposer}.php`, `backend/api/app/Runs/Evidence/{Evidence,EvidenceReader,ResultClassifier}.php` y las pruebas de `backend/api/tests/Unit/Runs/{Program,Evidence}/` y `backend/api/tests/Unit/Runs/PurityTest.php`.
- **Entrega** (firmas exactas; los tipos `ExecutorResult`, `ExpectedEvidence`, `TestVerdict` y `Verdict` son de B):

```php
namespace App\Runs\Program;

final readonly class ExpectedTest { public function __construct(public string $key, public string $expression, public int $position) {} }

final readonly class ExerciseSnapshot
{
    /**
     * @param  list<ExpectedTest>  $tests  las pruebas activas, en el orden de `position`
     * @param  list<string>  $imports  los `imports` del ejercicio, tal como están guardados
     */
    public function __construct(
        public string $exerciseId, public RunLanguage $language, public string $gradingHash,
        public array $tests, public array $imports, public string $template,
    ) {}
}

final class Whitespace { public static function trim(string $text): string; }   // sólo espacio, tabulador, \n y \r

final readonly class ProgramInput
{
    /**
     * @param  list<ExpectedTest>  $tests
     * @param  list<string>  $imports
     */
    public function __construct(public string $code, public array $tests, public ?string $customTest, public array $imports, public string $nonce) {}
}

final class ProgramRenderer { public function render(RunLanguage $language, string $template, ProgramInput $input): string; }

final readonly class ComposedProgram
{
    /** @param list<string> $expectedTests */
    public function __construct(public string $text, public array $expectedTests, public bool $hasCustomTest, public string $nonce) {}
}

final class ProgramComposer
{
    public function __construct(private ProgramRenderer $renderer);
    public function compose(ExerciseSnapshot $exercise, string $code, ?string $customTest, string $nonce): ComposedProgram;
}

namespace App\Runs\Evidence;

final readonly class Evidence
{
    /** @param list<TestVerdict> $tests  uno por prueba esperada, en su orden */
    public function __construct(public bool $complete, public array $tests, public ?TestOutcome $custom) {}
}

final class EvidenceReader { public function read(string $stdout, ExpectedEvidence $expected): Evidence; }

final class ResultClassifier
{
    public function __construct(private EvidenceReader $reader, private string $sandboxRuntime);   // 'runsc' o 'runc'
    public function classify(ExecutorResult $result, ExpectedEvidence $expected): Verdict;
}
```

**Pasos:**

1. **Primero las pruebas** (suite `Unit`; ninguna toca la base), que fallan porque las clases no existen:
   - **`WhitespaceTest`**: `trim("\t  a b\r\n")` da `a b`; un espacio de no separación (U+00A0) no se recorta; una cadena de sólo espacios da `''`.
   - **`HarnessFixtureTest`**: con las plantillas reales de `resources/content/harness.json` y el fixture `tests/Fixtures/shared/harness-cases.json`, `ProgramRenderer::render` de cada caso da exactamente `implode("\n", $case['program'])."\n"` (los once casos, 0 diferencias: SC-009). Y comprueba el propio fixture: el nonce tiene 32 hexadecimales, hay al menos 8 casos, de los dos lenguajes, con y sin prueba propia y, en Go, con y sin `imports`.
   - **`ProgramRendererTest`**: la sección `imports` de una plantilla de Rust se ignora aunque lleguen `imports`; `{{count}}` es la cantidad de entradas, con la prueba propia; una etiqueta de sección no deja salida; un marcador que la gramática no define queda como texto.
   - **`ProgramComposerTest`**: `compose` con un `ExerciseSnapshot` armado a mano devuelve `expectedTests` con las claves en orden, `hasCustomTest` verdadero sólo si la prueba propia no está vacía después de `Whitespace::trim`, y el nonce que recibió; **el peor caso cabe en el ejecutor**: con un código de 65.536 bytes, una prueba propia de 3.000 caracteres de dos bytes (`ñ`), tres expresiones de 878 bytes (la mayor de hoy) y la plantilla de Go con diez `imports`, el programa pesa menos de 131.072 bytes.
   - **`EvidenceReaderTest`**, una fila por caso, con el nonce `0123456789abcdef0123456789abcdef`: la evidencia completa de tres pruebas (`complete` verdadero, tres `pass`); una prueba en `FAIL` (`complete` verdadero, un `fail`); una prueba sin marcador (`complete` falso, un `missing`); un marcador repetido (`complete` falso, esa prueba `missing`); un marcador con otro nonce (no cuenta); un marcador con una clave que no se esperaba (`complete` falso); un centinela ausente, repetido o con la cuenta equivocada (`complete` falso); la prueba propia enviada y presente (`custom` `pass` o `fail`), enviada y ausente (`complete` falso, `custom` `missing`) y no enviada (`custom` `null`); un marcador pegado a una salida sin salto de línea (`hola__TALLER_TEST__…:t1:PASS`) que **sí** cuenta; y una **clave que son dígitos** (`123`) que no se convierte en un entero y se lee bien.
   - **`ResultClassifierTest`**: una prueba por cada fila de la tabla de [contracts/harness-template.md](./contracts/harness-template.md), «La clasificación», con el estado y el motivo que la tabla dice: `timedOut` en `compile` y en `run` (`timeout`, sin motivo); `oomKilled` en `run` (`runtime_error`, `oom`) y en `compile` (`compile_error`, `oom`); un `exitCode` 1 en `compile` (`compile_error`); un 137 en `run` con runsc (`runtime_error`, `pids_limit`) y con runc (`runtime_error`, `signal`); un 139 (`signal`); un 101 (`runtime_error`, sin motivo); código 0 con evidencia completa y las tres en `pass` (`passed`); con una en `fail` (`failed`); con una ausente y sin recorte (`failed`, `evidence_invalid`); con una ausente y `truncated` (`failed`, `output_limit`); con la evidencia completa y `truncated` por otro flujo (`passed`, y `truncated` queda `true`). Para las filas 7 a 10 el `Verdict` trae los veredictos por prueba y `custom`; para las filas 1 a 6, ninguno. Los valores esperados salen de la tabla, no del clasificador.
   - **`EvidenceBatteryTest`** (SC-002), los ocho programas de la spec como salidas del ejecutor con código 0 salvo el último, y su control: (1) marcadores con un nonce inventado, (2) un marcador repetido, (3) las tres pruebas y además una que no existe, (4) el centinela ausente, (5) el centinela con una cuenta que no coincide, (6) una salida vacía con código 0 (el programa salió antes de las pruebas), (7) 65.536 bytes de relleno con `truncated` (`failed`, `output_limit`), (8) todos los marcadores `PASS` con código 1 (`runtime_error`). Ninguno es `passed`: 0 de 8. El **control**, con el nonce correcto, da `passed`, para que la batería no sea vacía.
   - **`PurityTest`**: `arch()->expect(['App\Runs\Program', 'App\Runs\Evidence'])->not->toUse([DB, Queue, Http, Log, Cache, 'Illuminate\Database'])` (FR-038).
2. **Implementá**, con esta referencia (sin ejecutar):

```php
final class ProgramRenderer
{
    private const PLACEHOLDER = '/\{\{(code|nonce|count|id|expression|name)\}\}/';

    public function render(RunLanguage $language, string $template, ProgramInput $input): string
    {
        $entries = $this->entries($input);
        $imports = $this->imports($language, $input->imports);
        $common = ['code' => $input->code, 'nonce' => $input->nonce, 'count' => (string) count($entries)];
        $out = [];
        $section = null;
        $body = [];
        foreach (explode("\n", $template) as $line) {
            if (preg_match('/\A\{\{#(tests|imports)\}\}\z/', $line, $open) === 1) {
                $section = $open[1];
                $body = [];
            } elseif (preg_match('/\A\{\{\/(tests|imports)\}\}\z/', $line) === 1) {
                foreach ($section === 'tests' ? $entries : $imports as $row) {
                    foreach ($body as $bodyLine) {
                        $out[] = $this->fill($bodyLine, $common + $row);
                    }
                }
                $section = null;
            } elseif ($section === null) {
                $out[] = $this->fill($line, $common);
            } else {
                $body[] = $line;
            }
        }

        return implode("\n", $out);
    }

    /** @return list<array{id: string, expression: string}> */
    private function entries(ProgramInput $input): array
    {
        $entries = [];
        foreach ($input->tests as $test) {
            $entries[] = ['id' => $test->key, 'expression' => $test->expression];
        }
        $custom = Whitespace::trim($input->customTest ?? '');
        if ($custom !== '') {
            $entries[] = ['id' => 'custom', 'expression' => $custom];
        }

        return $entries;
    }

    /**
     * @param  list<string>  $declared
     * @return list<array{name: string}>
     */
    private function imports(RunLanguage $language, array $declared): array
    {
        $rows = [];
        $seen = ['fmt'];
        foreach ($language === RunLanguage::Go ? $declared : [] as $name) {
            if (! in_array($name, $seen, true)) {
                $seen[] = $name;
                $rows[] = ['name' => $name];
            }
        }

        return $rows;
    }

    /** @param array<string, string> $values */
    private function fill(string $text, array $values): string
    {
        return preg_replace_callback(self::PLACEHOLDER, static fn (array $match): string => $values[$match[1]] ?? $match[0], $text)
            ?? throw new LogicException('La sustitución de la plantilla falló.');
    }
}
```

```php
final class EvidenceReader
{
    public function read(string $stdout, ExpectedEvidence $expected): Evidence
    {
        $wanted = $expected->hasCustomTest ? [...$expected->testKeys, 'custom'] : $expected->testKeys;
        $seen = $this->markers($stdout, $expected->nonce);
        $complete = $this->sentinels($stdout, $expected->nonce) === [count($wanted)];
        foreach (array_keys($seen) as $prefixed) {
            $complete = $complete && in_array(substr($prefixed, 2), $wanted, true);
        }
        $verdicts = [];
        foreach ($wanted as $key) {
            $outcomes = $seen['k:'.$key] ?? [];
            $complete = $complete && count($outcomes) === 1;
            $verdicts[$key] = count($outcomes) !== 1 ? TestOutcome::Missing : ($outcomes[0] === 'PASS' ? TestOutcome::Pass : TestOutcome::Fail);
        }
        $tests = [];
        foreach ($expected->testKeys as $key) {
            $tests[] = new TestVerdict($key, $verdicts[$key]);
        }

        return new Evidence($complete, $tests, $expected->hasCustomTest ? $verdicts['custom'] : null);
    }

    /** @return array<string, list<string>> */
    private function markers(string $stdout, string $nonce): array
    {
        preg_match_all('/__TALLER_TEST__'.preg_quote($nonce, '/').':([A-Za-z0-9_]{1,64}):(PASS|FAIL)(?![A-Za-z0-9_])/', $stdout, $matches, PREG_SET_ORDER);
        $seen = [];
        foreach ($matches as $match) {
            $seen['k:'.$match[1]][] = $match[2];
        }

        return $seen;
    }

    /** @return list<int> */
    private function sentinels(string $stdout, string $nonce): array
    {
        preg_match_all('/__TALLER_END__'.preg_quote($nonce, '/').':([0-9]+)(?![0-9])/', $stdout, $matches);
        $counts = [];
        foreach ($matches[1] as $count) {
            $counts[] = (int) $count;
        }

        return $counts;
    }
}
```

   Las claves de `$seen` y de `$verdicts` llevan un prefijo (`k:`) porque PHP convierte en entero una clave de arreglo como `'123'`. `ResultClassifier` sigue la tabla de [contracts/harness-template.md](./contracts/harness-template.md) en ese orden, con `failureBeforeEvidence()` para las filas 1 a 6 (`timedOut`, `oomKilled`, `compile` con código distinto de 0, `run` con código distinto de 0 con `runtimeReason()`: 137 con `runsc` es `PidsLimit`, mayor que 128 es `Signal`, si no `null`) y `EvidenceReader` para las 7 a 10; `Verdict` se arma con los campos del resultado y, en las filas 7 a 10, con los veredictos de la evidencia.
3. `npm run api:test -- --testsuite=Unit --filter=Runs`, `npm run api:analyse` y `npm run api:format:check`: verdes.

**Compuerta:** las pruebas en verde con el fixture y las plantillas reales, 0 errores de PHPStan en el nivel 9, y `PurityTest` en verde.
