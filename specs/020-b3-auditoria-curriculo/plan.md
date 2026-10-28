# Implementation Plan: B3 · Auditoría local del currículo

**Branch**: `020-b3-auditoria-curriculo` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/020-b3-auditoria-curriculo/spec.md`. Decisiones y mediciones: [research.md](./research.md). Tipos, regla e informe: [data-model.md](./data-model.md). Contratos: [el comando, su entrada y su instancia](./contracts/audit-command.md) y [el resumen y su check](./contracts/audit-summary.md). Validación: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md).

**Objetivo.** Un comando que corre la solución y el código inicial de cada ejercicio activo en una instancia propia del ejecutor con runsc, con el armado y la clasificación de B2, decide cada programa con la regla de la spec y deja un informe con sellos, más los dos checks que vigilan la compuerta sin Docker.

**Arquitectura.** Un módulo nuevo de la API, `backend/api/app/Audit/`, y el comando `curriculum:audit`, que lee el contenido en una instantánea de sólo lectura, arma los programas con `ProgramComposer`, los manda en tandas con `Http::pool` usando el cliente de B2 y los clasifica con `ResultClassifier`, sin escribir en la base. La entrada `npm run api:audit` toma los sellos del host, levanta `executor-audit` (otra etiqueta y otra red) y escribe el resumen. Dos checks de TypeScript completan la compuerta: el del caché de Go en `npm test` y el del resumen en un workflow nuevo de la CI.

**Stack.** PHP 8.5 y Laravel 13.34 (Pest 5.3, PHPStan 2.2 con Larastan 3.12), TypeScript con Node 24 (checks de `qa/`), Docker Compose y GitHub Actions. Sin dependencias nuevas.

> **Para quien lo implementa.**
>
> - **Qué leer.** Las «Reglas para todos los agentes», tu sección y los documentos de arriba que toque tu tarea. `tasks.md` tiene una línea por tarea (T001 a T018) y remite acá.
> - **Línea base.** `master` en `dd870a9c`, que ya tiene B2 entregado. F2a y F2b no tocan nada de lo que usa B3 (son del front).
> - **Código sin ejecutar.** Todo el PHP, el YAML, el workflow, la entrada y los checks de Compose y del caché de Go son referencia: se escribieron sin Docker ni PHP. Lo que sí corrió, en una copia descartable, son los módulos `audit-surface`, `audit-summary` y `go-warm-cache` con 13 de los 14 escenarios del check del resumen (research.md, «Cómo se verificó»). Las firmas, los contratos, los mensajes y las pruebas son lo que obliga; el cuerpo lo ajusta quien implemente hasta que pasen las pruebas, Pint y PHPStan en el nivel 9.
> - **Sin comentarios.** El código de este plan no lleva comentarios salvo tres referencias puntuales: la de `AuditExecutorDouble` al contrato del ejecutor, la del servicio `executor-audit` en Compose y la que ya tiene `ExecutorClient::neverReached`. No agregues otros.
> - **Datasets de Pest.** Pest llama a cada closure de un dataset antes de correr la prueba y le pasa lo que devuelve. Por eso los datasets de este plan pasan valores (textos, números, objetos) o closures que devuelven el comportamiento del doble, nunca un closure que prepare la base o que lance.

## Summary

B3 es la auditoría que pide el §8 del ADR 0005: en el sandbox propio, todas las soluciones aprueban y todos los códigos iniciales fallan por sus pruebas, salvo los `reparar`, que también pueden no compilar (Q1). El enfoque:

- **El mismo programa y la misma clasificación que el alumno.** `AuditCatalogReader` arma, en una sola instantánea, los `ExerciseSnapshot` de B2; `ProgramComposer` arma cada programa con un nonce nuevo; `ResultClassifier` decide el estado. Dos pruebas lo atan a B2: el `ExerciseSnapshot` es igual al de `ExerciseReader::forRun` y el programa es igual al que B2 armaría con el mismo nonce (R2).
- **Una instancia propia.** `executor-audit`, con la etiqueta `auditoria`, en una red interna `audit` que sólo comparte con el contenedor del comando, levantada y apagada por la entrada (R6). Nada escribe en la base: un candado de MySQL evita dos corridas, y las pruebas fijan que no hay escrituras (R7, FR-012).
- **Concurrencia con el cliente de B2.** `Http::pool` con tantos pedidos en vuelo como lugares tiene la instancia, en rondas acotadas para los 503. `ExecutorClient` expone sus piezas sin cambiar su comportamiento (R4, R5).
- **El informe.** `report.json` (formato `taller-curriculum-audit-1`) y `report.txt`, en `qa/curriculum-audit/`, fuera de Git y de Docker, con los sellos del host, del contenido y de la plantilla, y el tiempo de cada fase contra su límite con un aviso pasada la mitad (Q4).
- **La compuerta.** Un resumen en un bloque `taller-audit-summary` que se pega en el PR, y un workflow nuevo (`audit-summary`, con `edited`) que lo comprueba en los PR que tocan la superficie auditada, recalculando las huellas sin Docker (FR-038). El caché de Go se comprueba en `npm test` (FR-027).
- **Entrega con verde de registro.** La primera corrida confirma `rust-63` y `rust-71`, que se corrigen como bugs de contenido con la extensión `bug` (R17), y la corrida final en verde va en el PR de B3.

## Technical Context

**Language/Version**: PHP 8.5 (CLI) y Laravel 13.34 en `backend/api/`, sin sintaxis posterior a PHP 8.3 ni `declare(strict_types=1)`; TypeScript con Node 24 en `qa/`; YAML de Compose y de GitHub Actions. El ejecutor Go no cambia.

**Primary Dependencies**: ninguna nueva (FR-037). Usa el cliente HTTP de Laravel (`Http::pool`), `Sleep`, las clases de B2 (`ProgramComposer`, `ResultClassifier`, `ExecutorClient`, `ExecutorResult`), `ContentSnapshot`, `ContentImports` y `ContentSource` de C2, y del lado de TypeScript el generador (`tools/content`) y `yaml`, que ya están.

**Storage**: ninguna tabla nueva y ninguna escritura. Lee las tablas de contenido de C2 y B2 y toma un candado con nombre de MySQL (`GET_LOCK`). Escribe dos archivos en `qa/curriculum-audit/` (montado en `/audit`).

**Testing**: Pest contra MySQL real (`npm run api:test`): unitarias en `tests/Unit/Audit/` (la regla, el informe, los tipos y la arquitectura) y de integración en `tests/Feature/Audit/` (el lector, el plan, el envío, las guardas y el comando), con un doble del ejecutor en su frontera HTTP. En `npm test`, dos checks nuevos (`go-warm-cache-check`, `audit-summary-check`) y uno que cambia (`compose-runs-check`). La corrida real es la verificación de la entrega (T016 y T018).

**Target Platform**: Docker Compose en el host del taller (Linux; macOS para desarrollo con `--runtime=runc`), con runsc registrado. GitHub Actions `ubuntu-24.04` para el check del resumen.

**Project Type**: servicio web (API Laravel) con un comando de consola y una instancia de servicio a pedido.

**Performance Goals**: sin objetivo (SC-005 es una medición). Estimación de la spec: de 5 a 10 minutos para 552 programas con 4 lugares.

**Constraints**: ver «Restricciones globales».

**Scale/Scope**: 274 ejercicios, 548 programas más 4 de la muestra. Se crean 30 archivos de PHP (25 en `app/Audit/`, el comando, la configuración y tres de apoyo de pruebas) y 11 archivos de prueba; cambia 1 archivo de B2 (`ExecutorClient.php`). En `qa/`, 9 archivos nuevos (con el ejemplo del informe) y 2 que cambian; un workflow nuevo; Compose, `package.json`, `.gitignore`, `.dockerignore` y siete documentos. 18 tareas en cinco unidades.

## Restricciones globales

Valores exactos, copiados de la spec, del ADR 0005 y de la constitución. Valen para todas las tareas.

- **Qué se audita:** los ejercicios con `status = 'active'` y `language` en `rust` o `go`, de lo importado, sin lista fija (FR-001); hoy 274 (137 por lenguaje: 100 de `lab`, 12 de `quests`, 25 de `cores`). Dos programas por ejercicio, la solución y el inicial, cada uno solo y sin prueba propia (FR-002); más la muestra: 4 programas (FR-034).
- **La muestra (Q5):** `rust-01` con `energia(5) == 35` (pasa) y `energia(5) == 36` (falla); `go-01` con `Bytes(2) == 2048` (pasa) y `Bytes(2) == 2049` (falla).
- **El programa:** el de `ProgramComposer` con un nonce nuevo de 32 hexadecimales en minúscula (`bin2hex(random_bytes(16))`) por programa; la huella es el sha256 del mismo programa con el nonce `00000000000000000000000000000000` (FR-003, FR-020).
- **La regla:** la tabla de [data-model.md](./data-model.md), «La regla», con las siete clases de `FindingKind`. La única excepción es el `compile_error` sin motivo del inicial de un `reparar` (Q1, FR-030).
- **Los límites (ADR 0005):** compilar, Rust 20 000 ms y Go 15 000 ms; ejecutar, 10 000 ms; memoria, 1 024 MiB al compilar y 256 MiB al ejecutar; aviso cuando un tiempo pasa de la mitad (`> 0,5 ×` el límite) (Q4, FR-022, FR-023). El tiempo incluye el arranque del contenedor. Los límites no cambian (FR-025).
- **La instancia:** `executor-audit`, `EXECUTOR_INSTANCE=auditoria` (distinta de `servicio`), red interna `audit` (sólo `audit` y `executor-audit`), `EXECUTOR_MAX_CONCURRENT` y la concurrencia del comando de 1 a 8 (4 por omisión), runtime `runsc` salvo `--runtime=runc` (FR-010, FR-014, FR-016).
- **Reintentos (FR-008):** 503 y conexión rechazada (errno 6 o 7) se reintentan después del `Retry-After` acotado a 1–30 s, hasta 10 rondas; todo lo demás que no es un resultado válido queda sin veredicto sin reintento.
- **Códigos de salida:** 0 en verde, 1 con hallazgos o sin veredicto, 2 si se negó a arrancar (R19).
- **Formatos:** `taller-curriculum-audit-1` (JSON) y `taller-audit-summary-1` (resumen), con las claves y el orden de los contratos.
- **Archivos:** `qa/curriculum-audit/report.json`, `report.txt` y `summary.md`, en `.gitignore` y `.dockerignore`, sin el token (FR-021).
- **Sin escrituras (FR-012):** ninguna sentencia `insert`, `update`, `delete`, `replace` ni `truncate`, ningún trabajo en una cola; las mismas filas en `runs`, `attempts`, `attempt_tests`, `attempt_payloads`, `progress_heads`, `exercise_progress` y `jobs` antes y después.
- **Quien audita no recibe el socket de Docker:** sólo `executor` y `executor-audit` lo montan (FR-020; ADR 0005 §1).
- **B2 no cambia de comportamiento:** `ProgramComposer`, `ProgramRenderer`, `EvidenceReader`, `ResultClassifier` y `ExerciseReader` no se tocan; `ExecutorClient` se refactoriza con `ExecutorClientTest` sin tocar (FR-003).
- **Calidad (FR-037, SC-008):** Pint, PHPStan nivel 9 sin baseline, `ignoreErrors` ni `@phpstan-ignore`; `npm test`, `npm run lint`, `npm run format:check`, `npm run api:test`, `git diff --check`. Sin paquetes de Composer ni de `npm`.
- **Idioma:** mensajes, informe legible y documentación en español rioplatense con voseo; código, pruebas y claves del JSON en inglés (constitución, III y VI). Sin comentarios en el código.
- **Contenido:** se corrige en `content/`, nunca en `build/`; los IDs y las claves de prueba no cambian ni se reutilizan (constitución, IV; FR-029).

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa. Complexity Tracking registra tres decisiones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | Sigue `backend/api/AGENTS.md` (Pest contra MySQL real, `env()` sólo en `config/`, `$signature` como los demás comandos, listas tipadas con `foreach`, el resto con Collections), `backend/executor/AGENTS.md` (el ejecutor no cambia; la etiqueta por instancia) y `qa/AGENTS.md` (checks en `qa/run-checks.ts`, grupo de operación si leen `backend/`). T015 actualiza los `AGENTS.md`, el `README.md` y el ADR 0005. |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con sus pruebas en rojo. Los valores esperados salen de la spec (la tabla de decisión, los mensajes de FR-013), del ADR (los límites), del ejemplo escrito a mano del informe y de mediciones del host (la muestra), nunca del código que se prueba. El ejecutor se reemplaza en su frontera HTTP (`Http::fake`) y, donde importa el errno, con una conexión real a un puerto cerrado. |
| III. Código entendible | Sí, con revisión | Clases chicas por responsabilidad; la regla y el informe son puros. Para revisar por tamaño: `AuditReport` y `AuditReportText` (el JSON y el texto, separados a propósito). Ninguna función nueva pasa de 10 de complejidad: `ProgramJudge` reparte la regla en tres métodos. |
| IV. Contenido en Git, IDs estables | Sí | Lee lo importado; no cambia IDs ni claves. Los arreglos de `rust-63` y `rust-71` van a `content/` como bugs (T017). |
| V. Capas y contratos explícitos | Sí | `App\Audit` separado de `App\Runs`, con contratos en `contracts/`. Sin servidores, frameworks ni capas nuevas: la instancia es el mismo ejecutor del ADR 0005, y el comando corre en la imagen de la API. No hace falta un ADR nuevo: B3 aplica el §8 del ADR 0005, y T015 le suma una enmienda. |
| VI. Español, accesibilidad y portabilidad | Sí | Mensajes e informe en español con voseo. La entrada es TypeScript con Node (portable); el uid del contenedor sale de `process.getuid()`, y en macOS Docker Desktop mapea el montaje. No hay interfaz. |
| VII. Secretos y salidas generadas fuera de Git | Sí | El informe va a `qa/curriculum-audit/`, en `.gitignore` y `.dockerignore`, sin el token. El token es el `EXECUTOR_TOKEN` del `.env`. Sin dependencias nuevas. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea; los bugs van a `.specify/bugs/<slug>/` con la extensión `bug`, sin tocar `tasks.md` (T017). |

## Decisiones del usuario (clarify del 2026-10-28)

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Q1, A:** un inicial falla por sus pruebas, salvo los `reparar`, que también pueden no compilar; `rust-63` y `rust-71` se corrigen como bugs | `ProgramJudge` (filas 7, 8 y 11 de la regla); T017 con la extensión `bug` | T006, T017 |
| **Q2, A, completada:** en local, con runsc y la instancia propia; en la CI, el check estático y el del resumen | `executor-audit` y `npm run api:audit`; `go-warm-cache-check` en `npm test`; workflow `audit-summary` | T011 a T014 |
| **Q3, A:** obligatoria en los PR que tocan lo auditado, sobre el último commit con el árbol limpio; condición de A4 | `qa/lib/audit-surface.ts` y el check; T015 documenta la compuerta; T018 deja B3 en verde para A4 | T012, T013, T015, T018 |
| **Q4, A:** el tiempo contra el límite con un aviso; la memoria sólo como OOM; B1 y B2 sin cambios | `PhaseTiming`, `AuditLimits::isNear` y `oomKilled`; la clasificación de B2 tal cual | T003, T006, T009 |
| **Q5, A:** una muestra de 4 programas con prueba propia | `custom_test_sample` en `config/audit.php`, verificada en el host | T003, T005, T010 |
| **Q5 de A4:** A4 espera a B3 | T018 cierra B3 con la corrida de registro en verde; la hoja de ruta lo integra el coordinador | T018 |

## Project Structure

### Documentation (this feature)

```text
specs/020-b3-auditoria-curriculo/
├── spec.md              # qué y por qué, con el clarify del 2026-10-28
├── research.md          # decisiones (R1 a R19), consultas y mediciones
├── data-model.md        # tipos, la regla, el JSON con su ejemplo y el texto
├── contracts/
│   ├── audit-command.md # el comando, la entrada, la instancia y la sonda
│   └── audit-summary.md # el resumen, la superficie y el check de la CI
├── quickstart.md        # cómo se verifica la entrega
├── plan.md              # este archivo
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

### Source Code (repository root)

```text
backend/api/
├── app/Audit/                  (nuevo) ExerciseKind, ProgramRole, AuditVerdict, FindingKind, CustomTestProbe,
│                               AuditedExercise, AuditCatalog, AuditProgram, PhaseTiming, AuditLimits, AuditRefused,
│                               AuditCatalogReader, AuditSelection, AuditPlan, Diagnostic, JudgedProgram, ProgramJudge,
│                               ExecutorDispatcher, ExecutorPreflight, AuditLock, HostStamps, AuditRun, AuditReport,
│                               AuditReportText, AuditRunner
├── app/Console/Commands/AuditCurriculum.php   (nuevo)
├── app/Runs/Execution/ExecutorClient.php       (cambia: refactor sin cambio de comportamiento)
├── config/audit.php            (nuevo)
└── tests/
    ├── Unit/Audit/             (nuevo) AuditTypesTest, AuditConfigTest, ProgramJudgeTest, AuditReportTest, AuditArchTest
    ├── Feature/Audit/          (nuevo) AuditCatalogReaderTest, AuditPlanTest, ExecutorDispatcherTest, AuditGuardsTest,
    │                           AuditCommandTest
    ├── Feature/Runs/Execution/ExecutorClientPoolTest.php   (nuevo)
    └── Support/                (nuevo) AuditWorld, AuditExecutorDouble, AuditCases
qa/
├── lib/                        (nuevo) go-warm-cache.ts, audit-surface.ts, audit-summary.ts, content-stamps.ts
├── go-warm-cache-check.ts      (nuevo)
├── audit-summary-check.ts      (nuevo)
├── audit-summary-gate.ts       (nuevo)
├── curriculum-audit.ts         (nuevo)
├── fixtures/shared/audit-report-example.json   (nuevo)
├── compose-runs-check.ts       (cambia)
└── run-checks.ts               (cambia)
.github/workflows/audit-summary.yml   (nuevo)
docker/compose.yaml   package.json   .gitignore   .dockerignore     (cambian)
backend/api/AGENTS.md   backend/executor/AGENTS.md   qa/AGENTS.md   README.md   AGENTS.md
docs/architecture.md   docs/adr/0005-ejecucion-en-sandbox-propio.md   (cambian, T015)
content/rust/exercises/rust-63/starter.rs   content/rust/exercises/rust-71/starter.rs   (cambian, T017, como bugs)
.specify/bugs/<slug>/           (nuevos, T017)
```

**Structure Decision:** lo nuevo de la API vive en `app/Audit/`, al lado de `app/Runs/`, del que consume tipos sin cambiarlos; el comando en `app/Console/Commands/`, donde Laravel lo registra solo. Los checks y la entrada viven en `qa/`, como `api-runs-check.ts`. Sin barrels ni capas nuevas.

### Mapa de archivos

| Archivo | Crea o cambia | Se encarga de | Tarea |
| --- | --- | --- | --- |
| `backend/api/app/Runs/Execution/ExecutorClient.php` | Cambia | `send()` queda igual; expone `prepare()`, `body()` y `read()` para el pool | T002 |
| `backend/api/config/audit.php` | Crea | Instancia, concurrencia, directorio, límites, reintentos, sonda, tandas y muestra | T003 |
| `backend/api/app/Audit/{ExerciseKind,ProgramRole,AuditVerdict,FindingKind}.php` | Crea | Los enums del dominio de la auditoría | T003 |
| `backend/api/app/Audit/{CustomTestProbe,AuditedExercise,AuditCatalog,AuditProgram,PhaseTiming,AuditLimits,AuditRefused}.php` | Crea | Los tipos compartidos y las negativas | T003 |
| `backend/api/app/Audit/AuditCatalogReader.php` | Crea | La lectura en una instantánea y la guardia de la imagen | T004 |
| `backend/api/app/Audit/{AuditSelection,AuditPlan}.php` | Crea | Qué se audita y el armado de los programas | T005 |
| `backend/api/app/Audit/{Diagnostic,JudgedProgram,ProgramJudge}.php` | Crea | La regla y el programa decidido | T006 |
| `backend/api/app/Audit/ExecutorDispatcher.php` | Crea | El pool y las rondas | T007 |
| `backend/api/app/Audit/{ExecutorPreflight,AuditLock}.php` | Crea | La sonda del ejecutor y el candado | T008 |
| `backend/api/app/Audit/{HostStamps,AuditRun,AuditReport,AuditReportText}.php` | Crea | Los sellos, la corrida, el JSON y el texto | T009 |
| `backend/api/app/Audit/AuditRunner.php`, `backend/api/app/Console/Commands/AuditCurriculum.php` | Crea | Las tandas con su clasificación, y el comando | T010 |
| `backend/api/tests/Support/AuditWorld.php` | Crea | Un currículo chico importado, con la huella de la imagen | T004 |
| `backend/api/tests/Support/AuditExecutorDouble.php` | Crea | El ejecutor de auditoría en su frontera HTTP | T007 |
| `backend/api/tests/Support/AuditCases.php` | Crea | Programas, resultados, veredictos y el informe del ejemplo, sin base | T006 |
| `qa/fixtures/shared/audit-report-example.json` | Crea | El ejemplo escrito a mano de data-model.md | T001 |
| `qa/lib/go-warm-cache.ts`, `qa/go-warm-cache-check.ts` | Crea | El check del caché de Go | T011 |
| `qa/lib/{audit-surface,audit-summary,content-stamps}.ts`, `qa/audit-summary-check.ts` | Crea | La superficie, el resumen, el check y sus escenarios | T012 |
| `qa/audit-summary-gate.ts`, `.github/workflows/audit-summary.yml` | Crea | La línea de comandos del check y su workflow | T013 |
| `qa/run-checks.ts` | Cambia | Registra los dos checks nuevos | T011, T012 |
| `docker/compose.yaml`, `qa/compose-runs-check.ts` | Cambian | `x-executor-base`, `executor-audit`, `audit` y la red `audit`, con sus pruebas | T014 |
| `qa/curriculum-audit.ts`, `package.json`, `.gitignore`, `.dockerignore` | Crea o cambian | La entrada, los alias y la salida ignorada | T014 |
| Documentación (siete archivos) | Cambian | FR-033, FR-011, la CI y la enmienda del ADR 0005 | T015 |
| `content/rust/exercises/rust-63/starter.rs`, `rust-71/starter.rs`, `.specify/bugs/` | Cambian o crea | Los bugs de contenido | T017 |

## Review Focus

Lo que el revisor mira primero:

- **B2 sin cambios de comportamiento.** El diff de `ExecutorClient.php` es un refactor: `send()` arma el mismo pedido y lee igual; `ExecutorClientTest.php` no cambia. Ningún otro archivo de `app/Runs/` cambia.
- **Nada se escribe.** Ni en la base (ni siquiera la caché), ni en una cola. El candado es `GET_LOCK`, no una fila. La prueba de arquitectura lo vigila y la del comando lo mide.
- **El mismo programa que el alumno.** El lector arma los mismos `ExerciseSnapshot` que `ExerciseReader`; el plan usa `ProgramComposer`; el nonce es nuevo por programa y la huella usa el de ceros.
- **La regla, fila por fila,** con el orden de `ProgramJudge`: primero sin veredicto, después el límite, después la solución o el inicial. El `reparar` sólo excusa un `compile_error` sin motivo.
- **«Pudo haber corrido».** Sólo 503 y errno 6 o 7 se reintentan; las rondas están acotadas; un 500 nunca se reintenta.
- **El aislamiento.** `audit` no está en `sandbox`, `executor-audit` no está en `app` ni en `sandbox`, la etiqueta es `auditoria`, y `audit` no monta el socket. La entrada nunca apaga una instancia que no levantó.
- **El check del resumen.** El cuerpo del PR entra por `PR_BODY`; el checkout es la cabeza; `--no-renames`; el check junta todos los errores con lo esperado y lo recibido.
- **Nivel 9.** Las opciones de Artisan, `DB::scalar` y `json_decode` se narran con `is_string`, `is_array` o `in_array(..., true)`; las listas tipadas se arman con `foreach`.

**Lo que la spec implica y ninguna prueba de hoy ejercita**, cada caso con la tarea que suma su prueba:

1. **El cuerpo del PR editado en la web de GitHub** llega con CRLF, y una persona puede sangrar el bloque o pegarlo dos veces. Lo fijan los escenarios 7 y 8 de `audit-summary-check` (T012).
2. **Un fallo de conexión dentro de `Http::pool`** tiene que conservar el errno de cURL: si no, un ejecutor que reinicia daría «sin veredicto» en lugar de esperar, y nadie lo vería con dobles. Lo fijan `ExecutorClientPoolTest` con un puerto cerrado de verdad (T002) y la prueba de las rondas acotadas de `ExecutorDispatcherTest` (T007).
3. **Una clave de prueba hecha de dígitos** (`'123'`): PHP la vuelve entero como clave de un arreglo. Lo fijan `AuditCatalogReaderTest` (T004) y `AuditReportTest`, que exige texto en el JSON y la etiqueta en la línea (T009).
4. **El contenido importado de otro build** que la imagen del comando: la corrida saldría con sellos que no son los del programa. Lo fijan `AuditCatalogReaderTest` (T004) y la fila de negativas de `AuditCommandTest` (T010).
5. **Los límites del informe desalineados de `profile.go`:** un cambio del ejecutor dejaría márgenes y avisos falsos. Lo fija la prueba nueva de `compose-runs-check` (T014).

## Reparto en paralelo

- **Dueños delegables:** P, J y Q son slices para el subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»): se le dan sus archivos, sus interfaces y sus checks, y se le dice que no deje comentarios.
- **K, el coordinador:** lo hace el agente principal: la base, la operación, la documentación, las corridas con Docker, los bugs y el cierre, y revisa cada diff.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001: la línea base y el ejemplo del informe |
| 1 | P, Q y K a la vez | **P:** T002 y T003. **Q:** T011, T012 y T013. **K:** T014 |
| 2 | P y J a la vez, desde S1 | **P:** T004, T005, T007 y T008. **J:** T006 y T009 |
| 3 | P, desde S2 | T010 |
| 4 | K, desde S3 | T015, T016, T017 y T018 |

**Dueños, archivos e interfaces:**

| Dueño | Archivos | Consume | Entrega |
| --- | --- | --- | --- |
| K · Coordinador | `qa/fixtures/shared/audit-report-example.json`, `docker/compose.yaml`, `qa/compose-runs-check.ts`, `qa/curriculum-audit.ts`, `package.json`, `.gitignore`, `.dockerignore`, la documentación, `content/` (sólo por T017), `.specify/bugs/`, `specs/**` | todo | la base, la operación, la documentación, las corridas, los bugs y el cierre |
| P · Comando | `backend/api/app/Runs/Execution/ExecutorClient.php`, `backend/api/config/audit.php`, en `backend/api/app/Audit/`: `ExerciseKind`, `ProgramRole`, `AuditVerdict`, `FindingKind`, `CustomTestProbe`, `AuditedExercise`, `AuditCatalog`, `AuditProgram`, `PhaseTiming`, `AuditLimits`, `AuditRefused`, `AuditCatalogReader`, `AuditSelection`, `AuditPlan`, `ExecutorDispatcher`, `ExecutorPreflight`, `AuditLock` y `AuditRunner`; `backend/api/app/Console/Commands/AuditCurriculum.php`; `backend/api/tests/Support/{AuditWorld,AuditExecutorDouble}.php`; `backend/api/tests/Unit/Audit/{AuditTypesTest,AuditConfigTest,AuditArchTest}.php`; `backend/api/tests/Feature/Audit/{AuditCatalogReaderTest,AuditPlanTest,ExecutorDispatcherTest,AuditGuardsTest,AuditCommandTest}.php`; `backend/api/tests/Feature/Runs/Execution/ExecutorClientPoolTest.php` | de K: el ejemplo (T001); de J: el juez y el informe (S2) | el comando completo |
| J · Regla e informe | en `backend/api/app/Audit/`: `Diagnostic`, `JudgedProgram`, `ProgramJudge`, `HostStamps`, `AuditRun`, `AuditReport` y `AuditReportText`; `backend/api/tests/Support/AuditCases.php`; `backend/api/tests/Unit/Audit/{ProgramJudgeTest,AuditReportTest}.php` | de P: los tipos de T003 (S1); de K: el ejemplo | la regla y el informe, puros |
| Q · Checks y CI | `qa/lib/{go-warm-cache,audit-surface,audit-summary,content-stamps}.ts`, `qa/{go-warm-cache-check,audit-summary-check,audit-summary-gate}.ts`, `qa/run-checks.ts`, `.github/workflows/audit-summary.yml` | de K: el ejemplo (T001) | el check del caché y el del resumen |

**Puntos de sincronización** (el coordinador integra en la rama de B3 y avisa):

- **S0:** T001 integrada. P, Q y K parten de ahí.
- **S1:** T003 integrada. J parte de ahí; P sigue con T004.
- **S2:** T004 a T009 integradas. P hace T010.
- **S3:** T010 a T014 integradas. K levanta el stack y corre T016.

**Líneas de integración.** `package.json` lo toca sólo K (T014: `api:audit` y `audit:gate`). `qa/run-checks.ts` lo toca Q (T011 y T012, en cola). Compose lo toca sólo K. Ningún dueño toca la documentación (T015).

## Reglas para todos los agentes

- **Leé primero:** `AGENTS.md`, `backend/api/AGENTS.md`, `qa/AGENTS.md`, la constitución, la spec, research.md, data-model.md, el contrato de tu tarea y tu sección; las skills `tdd`, `laravel-tdd` y `php-pro` (P y J) o `clean-code` (Q).
- **TDD, siempre.** La prueba en rojo por la razón que dice el paso, la implementación mínima, la prueba en verde. Una clase nueva empieza con su firma y un cuerpo que lanza `LogicException('not implemented')`, para que la prueba falle por comportamiento y no por un `use`. La prueba en rojo y la implementación van en commits separados.
- **Los valores esperados** salen de la spec, del ADR, de los contratos o del ejemplo escrito a mano, nunca del código que probás. Si una prueba de la base falla, el error está en el código nuevo: su valor esperado no se toca. `ExecutorClientTest.php` no se edita.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Funciones de prueba globales:** Pest carga todos los archivos en un proceso; no declares funciones sueltas en un archivo de prueba (ya existen `executorBody`, `resultOf`, `allPass` y otras). Los ayudantes van en `tests/Support/`, como métodos estáticos.
- **Comandos.** En un worktree, cada comando de Docker lleva `COMPOSE_PROJECT_NAME=<nombre-del-worktree>` en la misma línea. P y J: `npm run api:test -- --filter=<Nombre>`, `npm run api:format:check`, `npm run api:analyse`. Q: `node qa/<check>.ts` (antes, `npm run curriculum`), `npm run typecheck`, `npm run lint`, `npm run format:check`. Si un comando intenta descargar algo, pará y pedí permiso.
- **Estilo.** Código, nombres de prueba y claves del JSON en inglés; mensajes en español rioplatense, con el texto exacto de los contratos. **Sin comentarios.** En PHP: `final`, `readonly` para los datos, `env()` sólo en `config/`, Collections para transformar y `foreach` para listas tipadas. En TypeScript: `interface` para formas, exports nombrados, imports con `.ts`.
- **Commits:** chicos, en español, con prefijo Angular (`test(api): …`, `feat(api): …`, `refactor(api): …`, `test(qa): …`, `feat(qa): …`, `feat(ci): …`) y el trailer `Co-Authored-By` de tu modelo, sin `git push`.
- **Al terminar,** informá las tareas cerradas, los comandos con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Línea base (coordinador K, onda 0)

### Tarea 0.1 · La línea base y el ejemplo del informe (T001)

**Archivos:** crea `qa/fixtures/shared/audit-report-example.json`.

1. Desde la raíz del worktree de implementación, con la rama de B3 sacada de `master`: `npm ci --offline`, `npm test`, `npm run lint`, `npm run format:check` y, con permiso para Docker, `npm run api:test`, `npm run api:format:check`, `npm run api:analyse` y `npm run test:executor`. Anotá en el PR la cantidad de checks y de pruebas de Pest de la base.
2. Comprobá el host, como en research.md: `docker image inspect --format '{{.Id}}' taller-sandbox-rust:local taller-sandbox-go:local` y `docker info --format '{{json .Runtimes}}'` (tiene que estar `runsc`). Si falta algo, pará y pedí la descarga con nombre, origen y tamaño (`rust:1.99-slim`, unos 330 MB, y `golang:1.27-alpine`, unos 75 MB, de Docker Hub).
3. Copiá el JSON de [data-model.md](./data-model.md), «El ejemplo escrito a mano», tal cual, en `qa/fixtures/shared/audit-report-example.json`, y comprobá que se lee: `node -e "JSON.parse(require('node:fs').readFileSync('qa/fixtures/shared/audit-report-example.json','utf8'))"`. Prettier lo formatea (`npm run format`): está bien, el contrato son los valores.
4. Commit: `test(qa): agrega el ejemplo escrito a mano del informe de la auditoría`.

## 1. El comando (dueños P y J, ondas 1 a 3)

**Cubre:** FR-001 a FR-026, FR-029, FR-030, FR-034, FR-035 y FR-037; SC-002, SC-003 (en parte), SC-004 (los sellos de programa) y SC-007.

### Tarea 1.1 · El cliente de B2 se puede usar en un pool (T002, P)

**Archivos:** cambia `backend/api/app/Runs/Execution/ExecutorClient.php`; crea `backend/api/tests/Feature/Runs/Execution/ExecutorClientPoolTest.php`.

**Interfaz que produce:**

```php
public function send(RunLanguage $language, string $program): ExecutorReply;            // sin cambios por fuera
public function prepare(PendingRequest $request): PendingRequest;                        // URL, token, JSON y plazos de runs.executor.*
public static function body(RunLanguage $language, string $program): array;              // array{language: string, program: string}
public function read(Response|ConnectionException $outcome): ExecutorReply;              // la misma lectura que send()
```

**Paso 1, la prueba en rojo.** `ExecutorClientPoolTest.php`:

```php
<?php

use App\Runs\Execution\ExecutorClient;
use App\Runs\Execution\ExecutorReply;
use App\Runs\Execution\ReplyKind;
use App\Runs\RunLanguage;
use GuzzleHttp\Promise\PromiseInterface;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Request;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Tests\Support\AuditExecutorDouble;

beforeEach(function () {
    config(['runs.executor.url' => 'http://executor:8080', 'runs.executor.token' => 'a-token-of-at-least-thirty-two-bytes']);
    Http::preventStrayRequests();
});

it('reads a pooled response exactly as send() reads it', function (PromiseInterface $response, ReplyKind $kind, string $cause, ?int $status) {
    Http::fake(['*' => $response]);
    $client = app(ExecutorClient::class);

    $outcomes = Http::pool(fn (Pool $pool) => [
        $client->prepare($pool->as('only'))->post('/v1/run', ExecutorClient::body(RunLanguage::Rust, 'fn main() {}')),
    ]);
    $outcome = $outcomes['only'];
    $reply = $outcome instanceof Response || $outcome instanceof ConnectionException ? $client->read($outcome) : null;

    expect($reply)->toBeInstanceOf(ExecutorReply::class)
        ->and($reply?->kind)->toBe($kind)
        ->and($reply?->cause)->toBe($cause)
        ->and($reply?->httpStatus)->toBe($status);
})->with([
    'a valid result' => [fn () => Http::response(AuditExecutorDouble::result()), ReplyKind::Result, '', null],
    'busy' => [fn () => Http::response('ocupado', 503, ['Retry-After' => '7']), ReplyKind::Busy, '', null],
    'a sandbox failure' => [fn () => Http::response('falla', 500), ReplyKind::Failed, 'status', 500],
    'an invalid body' => [fn () => Http::response(AuditExecutorDouble::result(['extra' => 1])), ReplyKind::Failed, 'invalid_body', 200],
    'an unauthorized token' => [fn () => Http::response('token', 401), ReplyKind::Failed, 'status', 401],
]);

it('posts each pooled request with the token, as JSON, with exactly the language and the program', function () {
    Http::fake(['*' => Http::response(AuditExecutorDouble::result())]);
    $client = app(ExecutorClient::class);

    Http::pool(fn (Pool $pool) => [
        $client->prepare($pool->as('only'))->post('/v1/run', ExecutorClient::body(RunLanguage::Go, "package main\n")),
    ]);

    Http::assertSent(fn (Request $request) => $request->url() === 'http://executor:8080/v1/run'
        && $request->header('Authorization') === ['Bearer a-token-of-at-least-thirty-two-bytes']
        && str_starts_with($request->header('Content-Type')[0], 'application/json')
        && $request->data() === ['language' => 'go', 'program' => "package main\n"]);
});

it('reads a real refused connection inside a pool as NotReached, so the audit waits instead of giving up', function () {
    Http::allowStrayRequests();
    config(['runs.executor.url' => 'http://127.0.0.1:1', 'runs.executor.connect_timeout' => 2]);
    $client = app(ExecutorClient::class);

    $outcomes = Http::pool(fn (Pool $pool) => [
        $client->prepare($pool->as('only'))->post('/v1/run', ExecutorClient::body(RunLanguage::Rust, 'fn main() {}')),
    ]);

    expect($outcomes['only'])->toBeInstanceOf(ConnectionException::class)
        ->and($client->read($outcomes['only'])->kind)->toBe(ReplyKind::NotReached);
});
```

`AuditExecutorDouble::result()` lo crea P en T007; en T002 creá ya ese archivo con sólo el método `result()` de T007 (el resto llega en T007).

**Paso 2.** `npm run api:test -- --filter=ExecutorClientPoolTest`: falla porque `prepare`, `body` y `read` no existen.

**Paso 3, la implementación.** `ExecutorClient.php` queda así (los dos métodos privados no cambian):

```php
<?php

namespace App\Runs\Execution;

use App\Runs\Evidence\ExecutorResult;
use App\Runs\RunLanguage;
use GuzzleHttp\Exception\ConnectException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

final class ExecutorClient
{
    private const NEVER_REACHED_ERRNOS = [6, 7];

    public function send(RunLanguage $language, string $program): ExecutorReply
    {
        try {
            $response = $this->prepare(Http::withOptions([]))->post('/v1/run', self::body($language, $program));
        } catch (ConnectionException $error) {
            return $this->read($error);
        }

        return $this->read($response);
    }

    public function prepare(PendingRequest $request): PendingRequest
    {
        return $request->baseUrl(config()->string('runs.executor.url'))
            ->withToken(config()->string('runs.executor.token'))
            ->acceptJson()
            ->asJson()
            ->connectTimeout(config()->integer('runs.executor.connect_timeout'))
            ->timeout(config()->integer('runs.executor.request_timeout'));
    }

    /** @return array{language: string, program: string} */
    public static function body(RunLanguage $language, string $program): array
    {
        return ['language' => $language->value, 'program' => $program];
    }

    public function read(Response|ConnectionException $outcome): ExecutorReply
    {
        if ($outcome instanceof ConnectionException) {
            return $this->neverReached($outcome) ? ExecutorReply::notReached() : ExecutorReply::failed('connection', null);
        }

        return $this->fromResponse($outcome);
    }

    // A ConnectionException also covers a timeout and an empty reply, which may have run the code (R8).
    // Guzzle 8 dropped getHandlerContext(): the cURL errno survives only in the message.
    private function neverReached(ConnectionException $error): bool
    {
        $previous = $error->getPrevious();

        return $previous instanceof ConnectException
            && preg_match('/^cURL error (\d+):/', $previous->getMessage(), $matches) === 1
            && in_array((int) $matches[1], self::NEVER_REACHED_ERRNOS, true);
    }

    private function fromResponse(Response $response): ExecutorReply
    {
        if ($response->status() === 503) {
            $after = $response->header('Retry-After');

            return ExecutorReply::busy(ctype_digit($after) ? (int) $after : 1);
        }
        if (! $response->successful()) {
            return ExecutorReply::failed('status', $response->status());
        }
        $result = ExecutorResult::fromPayload($response->json());

        return $result === null ? ExecutorReply::failed('invalid_body', $response->status()) : ExecutorReply::result($result);
    }
}
```

El comentario de `neverReached` ya existe en `master` y se conserva tal cual.

**Paso 4.** `npm run api:test -- --filter='ExecutorClientPoolTest|ExecutorClientTest|RunExecutionTest|ExecuteRunTest'`: todo en verde, con `ExecutorClientTest.php` sin tocar. Si la prueba del puerto cerrado da `Failed`, el pool perdió el errno: pará e informalo al coordinador (es la «Review Focus» 2), no cambies la lectura.

**Paso 5.** `npm run api:format:check`, `npm run api:analyse`. Commits: `test(api): el cliente del ejecutor lee igual dentro de un pool` y `refactor(api): el cliente del ejecutor expone el pedido y la lectura`.

### Tarea 1.2 · Los tipos y la configuración (T003, P)

**Archivos:** crea `backend/api/config/audit.php` y, en `backend/api/app/Audit/`, `ExerciseKind.php`, `ProgramRole.php`, `AuditVerdict.php`, `FindingKind.php`, `CustomTestProbe.php`, `AuditedExercise.php`, `AuditCatalog.php`, `AuditProgram.php`, `PhaseTiming.php`, `AuditLimits.php` y `AuditRefused.php`; crea `backend/api/tests/Unit/Audit/AuditTypesTest.php` y `AuditConfigTest.php`.

**Paso 1, las pruebas en rojo.** `AuditConfigTest.php` (los valores salen del ADR 0005 y de la spec):

```php
<?php

use Tests\TestCase;

uses(TestCase::class);

it('defaults to the limits of ADR 0005, the instance and the concurrency of the spec', function () {
    expect(config('audit.instance'))->toBe('auditoria')
        ->and(config('audit.concurrency'))->toBe(4)
        ->and(config('audit.report_directory'))->toBe('/audit')
        ->and(config('audit.limits'))->toBe([
            'compile_ms' => ['rust' => 20000, 'go' => 15000],
            'run_ms' => 10000,
            'compile_memory_mib' => 1024,
            'run_memory_mib' => 256,
            'warning_ratio' => 0.5,
        ])
        ->and(config('audit.retry'))->toBe(['max_rounds' => 10, 'max_wait_seconds' => 30])
        ->and(config('audit.preflight'))->toBe(['connect_timeout' => 5, 'timeout' => 10])
        ->and(config('audit.batch_per_slot'))->toBe(8);
});

it('samples the custom test with one expression that passes and one that fails per language (Q5)', function () {
    expect(config('audit.custom_test_sample'))->toBe([
        'rust' => ['exercise' => 'rust-01', 'passing' => 'energia(5) == 35', 'failing' => 'energia(5) == 36'],
        'go' => ['exercise' => 'go-01', 'passing' => 'Bytes(2) == 2048', 'failing' => 'Bytes(2) == 2049'],
    ]);
});
```

`AuditTypesTest.php` (los mensajes son los de data-model.md):

```php
<?php

use App\Audit\AuditLimits;
use App\Audit\FindingKind;
use App\Audit\PhaseTiming;
use App\Audit\ProgramRole;
use App\Runs\ExecutorPhase;
use App\Runs\RunLanguage;

it('says each finding in Spanish', function (FindingKind $kind, string $message) {
    expect($kind->message())->toBe($message);
})->with([
    [FindingKind::SolutionNotPassed, 'la solución de referencia no aprueba'],
    [FindingKind::StarterPassed, 'las pruebas no detectan el código inicial'],
    [FindingKind::StarterFailedWithoutTests, 'el código inicial falló sin que las pruebas lo dijeran'],
    [FindingKind::StarterCompileError, 'el código inicial no compila y el ejercicio no es de reparar'],
    [FindingKind::StarterRuntimeError, 'el código inicial terminó con un error antes de mostrar las pruebas'],
    [FindingKind::LimitExceeded, 'agotó un límite del sandbox'],
    [FindingKind::CustomTestMismatch, 'la prueba propia no se informó como se esperaba'],
]);

it('names the program role in Spanish', function () {
    expect(ProgramRole::Solution->label())->toBe('solución')
        ->and(ProgramRole::Starter->label())->toBe('inicial');
});

it('measures a phase against its limit with the margin and the ratio', function () {
    $timing = new PhaseTiming(812, 20000);

    expect($timing->marginMs())->toBe(19188)
        ->and($timing->ratio())->toBe(0.041);
});

it('warns only above half of a limit (Q4)', function (int $ms, int $limitMs, bool $near) {
    $limits = new AuditLimits(20000, 15000, 10000, 1024, 256, 0.5);

    expect($limits->isNear(new PhaseTiming($ms, $limitMs)))->toBe($near);
})->with([
    'just above half of the Rust compile limit' => [10001, 20000, true],
    'exactly half' => [10000, 20000, false],
    'above half of the Go compile limit' => [7600, 15000, true],
    'above half of the run limit' => [5001, 10000, true],
    'far from the limit' => [900, 20000, false],
]);

it('picks the compile limit by language and the memory by phase', function () {
    $limits = new AuditLimits(20000, 15000, 10000, 1024, 256, 0.5);

    expect($limits->compileMs(RunLanguage::Rust))->toBe(20000)
        ->and($limits->compileMs(RunLanguage::Go))->toBe(15000)
        ->and($limits->memoryMiB(ExecutorPhase::Compile))->toBe(1024)
        ->and($limits->memoryMiB(ExecutorPhase::Run))->toBe(256);
});
```

**Paso 2.** `npm run api:test -- --filter='AuditConfigTest|AuditTypesTest'`: fallan porque no existen.

**Paso 3, la implementación.**

`backend/api/config/audit.php`:

```php
<?php

return [
    'instance' => env('AUDIT_INSTANCE', 'auditoria'),
    'concurrency' => (int) env('AUDIT_CONCURRENCY', 4),
    'report_directory' => env('AUDIT_REPORT_DIRECTORY', '/audit'),
    'limits' => [
        'compile_ms' => ['rust' => 20000, 'go' => 15000],
        'run_ms' => 10000,
        'compile_memory_mib' => 1024,
        'run_memory_mib' => 256,
        'warning_ratio' => 0.5,
    ],
    'retry' => ['max_rounds' => 10, 'max_wait_seconds' => 30],
    'preflight' => ['connect_timeout' => 5, 'timeout' => 10],
    'batch_per_slot' => 8,
    'custom_test_sample' => [
        'rust' => ['exercise' => 'rust-01', 'passing' => 'energia(5) == 35', 'failing' => 'energia(5) == 36'],
        'go' => ['exercise' => 'go-01', 'passing' => 'Bytes(2) == 2048', 'failing' => 'Bytes(2) == 2049'],
    ],
];
```

`ExerciseKind.php`, `ProgramRole.php`, `AuditVerdict.php` y `FindingKind.php`:

```php
<?php

namespace App\Audit;

enum ExerciseKind: string
{
    case Completar = 'completar';
    case Reparar = 'reparar';
}
```

```php
<?php

namespace App\Audit;

enum ProgramRole: string
{
    case Solution = 'solution';
    case Starter = 'starter';

    public function label(): string
    {
        return match ($this) {
            self::Solution => 'solución',
            self::Starter => 'inicial',
        };
    }
}
```

```php
<?php

namespace App\Audit;

enum AuditVerdict: string
{
    case Passes = 'passes';
    case FailsAsExpected = 'fails_as_expected';
    case Finding = 'finding';
    case NoVerdict = 'no_verdict';
}
```

```php
<?php

namespace App\Audit;

enum FindingKind: string
{
    case SolutionNotPassed = 'solution_not_passed';
    case StarterPassed = 'starter_passed';
    case StarterFailedWithoutTests = 'starter_failed_without_tests';
    case StarterCompileError = 'starter_compile_error';
    case StarterRuntimeError = 'starter_runtime_error';
    case LimitExceeded = 'limit_exceeded';
    case CustomTestMismatch = 'custom_test_mismatch';

    public function message(): string
    {
        return match ($this) {
            self::SolutionNotPassed => 'la solución de referencia no aprueba',
            self::StarterPassed => 'las pruebas no detectan el código inicial',
            self::StarterFailedWithoutTests => 'el código inicial falló sin que las pruebas lo dijeran',
            self::StarterCompileError => 'el código inicial no compila y el ejercicio no es de reparar',
            self::StarterRuntimeError => 'el código inicial terminó con un error antes de mostrar las pruebas',
            self::LimitExceeded => 'agotó un límite del sandbox',
            self::CustomTestMismatch => 'la prueba propia no se informó como se esperaba',
        };
    }
}
```

`CustomTestProbe.php`, `AuditedExercise.php`, `AuditCatalog.php` y `AuditProgram.php`:

```php
<?php

namespace App\Audit;

use App\Runs\TestOutcome;

final readonly class CustomTestProbe
{
    public function __construct(public string $expression, public TestOutcome $expected) {}
}
```

```php
<?php

namespace App\Audit;

use App\Runs\Program\ExerciseSnapshot;

final readonly class AuditedExercise
{
    /** @param  list<string>  $testLabels  one per test of $snapshot->tests, in the same order */
    public function __construct(
        public ExerciseSnapshot $snapshot,
        public string $section,
        public ?string $domain,
        public ExerciseKind $kind,
        public string $starterHash,
        public string $starter,
        public string $solution,
        public array $testLabels,
    ) {}

    public function id(): string
    {
        return $this->snapshot->exerciseId;
    }

    public function code(ProgramRole $role): string
    {
        return $role === ProgramRole::Solution ? $this->solution : $this->starter;
    }

    public function labelOf(string $testKey): string
    {
        foreach ($this->snapshot->tests as $index => $test) {
            if ($test->key === $testKey) {
                return $this->testLabels[$index] ?? '';
            }
        }

        return '';
    }
}
```

```php
<?php

namespace App\Audit;

final readonly class AuditCatalog
{
    /** @param  list<AuditedExercise>  $exercises */
    public function __construct(
        public string $documentHash,
        public string $harnessHash,
        public ?string $sourceCommit,
        public array $exercises,
    ) {}

    public function find(string $id): ?AuditedExercise
    {
        foreach ($this->exercises as $exercise) {
            if ($exercise->id() === $id) {
                return $exercise;
            }
        }

        return null;
    }
}
```

```php
<?php

namespace App\Audit;

use App\Runs\Program\ComposedProgram;

final readonly class AuditProgram
{
    public function __construct(
        public AuditedExercise $exercise,
        public ProgramRole $role,
        public ?CustomTestProbe $customTest,
        public ComposedProgram $composed,
        public string $fingerprint,
    ) {}
}
```

`PhaseTiming.php` y `AuditLimits.php`:

```php
<?php

namespace App\Audit;

final readonly class PhaseTiming
{
    public function __construct(public int $ms, public int $limitMs) {}

    public function marginMs(): int
    {
        return $this->limitMs - $this->ms;
    }

    public function ratio(): float
    {
        return round($this->ms / $this->limitMs, 3);
    }
}
```

```php
<?php

namespace App\Audit;

use App\Runs\ExecutorPhase;
use App\Runs\RunLanguage;

final readonly class AuditLimits
{
    public function __construct(
        public int $rustCompileMs,
        public int $goCompileMs,
        public int $runMs,
        public int $compileMemoryMiB,
        public int $runMemoryMiB,
        public float $warningRatio,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            config()->integer('audit.limits.compile_ms.rust'),
            config()->integer('audit.limits.compile_ms.go'),
            config()->integer('audit.limits.run_ms'),
            config()->integer('audit.limits.compile_memory_mib'),
            config()->integer('audit.limits.run_memory_mib'),
            config()->float('audit.limits.warning_ratio'),
        );
    }

    public function compileMs(RunLanguage $language): int
    {
        return $language === RunLanguage::Rust ? $this->rustCompileMs : $this->goCompileMs;
    }

    public function memoryMiB(ExecutorPhase $phase): int
    {
        return $phase === ExecutorPhase::Compile ? $this->compileMemoryMiB : $this->runMemoryMiB;
    }

    public function isNear(PhaseTiming $timing): bool
    {
        return $timing->ms > $timing->limitMs * $this->warningRatio;
    }
}
```

`AuditRefused.php`, con los mensajes de [contracts/audit-command.md](./contracts/audit-command.md), «Negativas»:

```php
<?php

namespace App\Audit;

use RuntimeException;

final class AuditRefused extends RuntimeException
{
    public static function invalidOption(string $message): self
    {
        return new self($message);
    }

    public static function concurrency(int $value): self
    {
        return new self("AUDIT_CONCURRENCY tiene que estar entre 1 y 8 y es {$value}.");
    }

    public static function alreadyRunning(): self
    {
        return new self('Ya hay otra corrida de auditoría en curso: esperá a que termine. Dos corridas a la vez se borrarían los contenedores.');
    }

    public static function reportNotWritable(string $directory): self
    {
        return new self("No puedo escribir el informe en {$directory}: corré la auditoría con npm run api:audit, que monta qa/curriculum-audit/.");
    }

    public static function noContent(): self
    {
        return new self('No hay contenido importado: levantá el stack con «docker compose up --build -d --wait» y volvé a auditar.');
    }

    public static function staleContent(string $imported, string $image): self
    {
        $importedShort = substr($imported, 0, 12);
        $imageShort = substr($image, 0, 12);

        return new self("El contenido importado ({$importedShort}) no es el de esta imagen ({$imageShort}): levantá el stack con «docker compose up --build -d --wait» y volvé a auditar.");
    }

    public static function unknownExercise(string $id, string $languages): self
    {
        return new self("{$id} no es un ejercicio activo de {$languages}.");
    }

    public static function sampleMissing(string $id): self
    {
        return new self("La muestra de la prueba propia necesita {$id}, que no es un ejercicio activo: actualizá audit.custom_test_sample.");
    }

    public static function unreachable(string $url, string $cause): self
    {
        return new self("No alcanzo al ejecutor de auditoría en {$url} ({$cause}). npm run api:audit lo levanta; si lo usaste, mirá «docker compose --profile audit logs executor-audit».");
    }

    public static function tokenRejected(): self
    {
        return new self('El ejecutor de auditoría rechazó el token (401): el EXECUTOR_TOKEN de audit no es el de executor-audit.');
    }

    public static function unexpectedProbe(int $status): self
    {
        return new self("El ejecutor de auditoría respondió {$status} a la sonda del token; se esperaba 400.");
    }
}
```

**Paso 4.** Las dos pruebas en verde; `npm run api:format:check` y `npm run api:analyse`. Commits: `test(api): fija los tipos y la configuración de la auditoría` y `feat(api): tipos y configuración de la auditoría del currículo`. **S1.**

### Tarea 1.3 · La lectura del catálogo (T004, P)

**Archivos:** crea `backend/api/app/Audit/AuditCatalogReader.php`, `backend/api/tests/Support/AuditWorld.php` y `backend/api/tests/Feature/Audit/AuditCatalogReaderTest.php`.

**Interfaz:** `AuditCatalogReader::__construct(ContentImports $imports)`, `read(): AuditCatalog`, lanza `AuditRefused::noContent()` o `AuditRefused::staleContent()`.

**Paso 1, el mundo de prueba.** `AuditWorld.php` importa cinco ejercicios con `RunWorld` y los ajusta: `rust-01` (`lab`, `completar`), `rust-02` (`lab`, `reparar`), `rust-03` (retirado), `go-01` (`lab`, `completar`, `imports: ['strings']`) y `go-02` (`quests`, `reparar`). La importación lleva la huella del meta de la imagen, así la guardia de R3 pasa.

```php
<?php

namespace Tests\Support;

use Illuminate\Support\Facades\DB;

final class AuditWorld
{
    public const HARNESS_HASH = 'c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00';

    public const ACTIVE = ['rust-01', 'rust-02', 'go-01', 'go-02'];

    /** @param  list<array{key: string, expression: string}>|null  $rustTests */
    public static function curriculum(?array $rustTests = null): void
    {
        RunWorld::exercise('rust-01', 'rust', $rustTests ?? [
            ['key' => 't1', 'expression' => 'true'],
            ['key' => 't2', 'expression' => '1 + 1 == 2'],
            ['key' => 't3', 'expression' => '2 * 2 == 4'],
        ]);
        RunWorld::exercise('rust-02', 'rust');
        RunWorld::exercise('rust-03', 'rust');
        RunWorld::exercise('go-01', 'go', imports: ['strings']);
        RunWorld::exercise('go-02', 'go');
        DB::table('catalogs')->insertOrIgnore(['code' => 'quests', 'slice_by' => 'language', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
        foreach ([...self::ACTIVE, 'rust-03'] as $id) {
            DB::table('exercises')->where('id', $id)->update(['starter' => self::code($id, 'starter'), 'solution' => self::code($id, 'solution')]);
        }
        DB::table('exercises')->whereIn('id', ['rust-02', 'go-02'])->update(['kind' => 'reparar']);
        DB::table('exercises')->where('id', 'go-02')->update(['catalog' => 'quests']);
        DB::table('exercises')->where('id', 'rust-03')->update(['status' => 'deprecated', 'retired_at' => now(), 'position' => null]);
        DB::table('content_imports')->update([
            'document_hash' => self::imageDocumentHash(),
            'portion_hashes' => json_encode(['harness' => self::HARNESS_HASH], JSON_THROW_ON_ERROR),
        ]);
    }

    public static function code(string $id, string $role): string
    {
        $name = str_replace('-', '_', "{$role}_{$id}");

        return str_starts_with($id, 'go-') ? "func {$name}() {}\n" : "fn {$name}() {}\n";
    }

    public static function imageDocumentHash(): string
    {
        $meta = json_decode((string) file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true, 512, JSON_THROW_ON_ERROR);

        return $meta['documentHash'];
    }
}
```

**Paso 2, la prueba en rojo.** `AuditCatalogReaderTest.php`:

```php
<?php

use App\Audit\AuditCatalogReader;
use App\Audit\AuditedExercise;
use App\Audit\AuditRefused;
use App\Audit\ExerciseKind;
use App\Runs\Admission\ExerciseReader;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuditWorld;
use Tests\Support\ContentDatabase;

it('reads the active exercises of both languages in order, with their codes, kind, section and labels', function () {
    AuditWorld::curriculum();

    $catalog = app(AuditCatalogReader::class)->read();

    expect(array_map(fn (AuditedExercise $exercise) => $exercise->id(), $catalog->exercises))->toBe(AuditWorld::ACTIVE)
        ->and($catalog->find('rust-02')?->kind)->toBe(ExerciseKind::Reparar)
        ->and($catalog->find('rust-01')?->kind)->toBe(ExerciseKind::Completar)
        ->and($catalog->find('go-02')?->section)->toBe('quests')
        ->and($catalog->find('go-01')?->section)->toBe('lab')
        ->and($catalog->find('rust-01')?->solution)->toBe("fn solution_rust_01() {}\n")
        ->and($catalog->find('rust-01')?->starter)->toBe("fn starter_rust_01() {}\n")
        ->and($catalog->find('rust-01')?->starterHash)->toBe(hash('sha256', 'rust-01'))
        ->and($catalog->find('rust-01')?->testLabels)->toBe(['Prueba t1', 'Prueba t2', 'Prueba t3'])
        ->and($catalog->find('rust-03'))->toBeNull();
});

it('builds for each exercise the same ExerciseSnapshot that B2 reads to run it (FR-003)', function (string $id) {
    AuditWorld::curriculum();

    $catalog = app(AuditCatalogReader::class)->read();

    expect($catalog->find($id)?->snapshot)->toEqual(app(ExerciseReader::class)->forRun($id));
})->with(AuditWorld::ACTIVE);

it('stamps the document hash, the harness hash and the source commit of the latest import (FR-020)', function () {
    AuditWorld::curriculum();

    $catalog = app(AuditCatalogReader::class)->read();

    expect($catalog->documentHash)->toBe(AuditWorld::imageDocumentHash())
        ->and($catalog->harnessHash)->toBe(AuditWorld::HARNESS_HASH)
        ->and($catalog->sourceCommit)->toBeNull();
});

it('keeps a test key made of digits as text', function () {
    AuditWorld::curriculum([['key' => '123', 'expression' => 'true']]);

    $catalog = app(AuditCatalogReader::class)->read();

    expect($catalog->find('rust-01')?->snapshot->tests[0]->key)->toBe('123')
        ->and($catalog->find('rust-01')?->labelOf('123'))->toBe('Prueba 123');
});

it('refuses when nothing was imported (FR-013)', function () {
    expect(fn () => app(AuditCatalogReader::class)->read())
        ->toThrow(AuditRefused::class, 'No hay contenido importado: levantá el stack con «docker compose up --build -d --wait» y volvé a auditar.');
});

it('refuses when the imported content is not the content of the image (R3)', function () {
    AuditWorld::curriculum();
    DB::table('content_imports')->update(['document_hash' => str_repeat('b', 64)]);

    expect(fn () => app(AuditCatalogReader::class)->read())->toThrow(AuditRefused::class, 'El contenido importado (bbbbbbbbbbbb) no es el de esta imagen');
});

it('writes nothing while it reads (FR-012)', function () {
    AuditWorld::curriculum();

    expect(ContentDatabase::contentWritesDuring(fn () => app(AuditCatalogReader::class)->read()))->toBe([]);
});
```

**Paso 3.** `npm run api:test -- --filter=AuditCatalogReaderTest`: falla porque la clase no existe.

**Paso 4, la implementación.** `AuditCatalogReader.php`:

```php
<?php

namespace App\Audit;

use App\Content\ContentImports;
use App\Content\ContentSnapshot;
use App\Content\ContentSource;
use App\Content\Record\RowFields;
use App\Runs\Program\ExerciseSnapshot;
use App\Runs\Program\ExpectedTest;
use App\Runs\RunLanguage;
use Illuminate\Support\Facades\DB;
use JsonException;
use LogicException;

final class AuditCatalogReader
{
    private const EXERCISES = 'select `id`, `language`, `catalog`, `domain`, `kind`, `grading_hash`, `starter_hash`, `imports_json`, `starter`, `solution`'
        ." from `exercises` where `status` = 'active' and `language` in ('rust', 'go')"
        ." order by field(`language`, 'rust', 'go'), field(`catalog`, 'lab', 'quests', 'cores'), `domain`, `position`, `id`";

    private const TESTS = 'select t.`exercise_id`, t.`test_key`, t.`expression`, t.`position`, t.`label`'
        .' from `exercise_tests` t join `exercises` e on e.`id` = t.`exercise_id`'
        ." where t.`status` = 'active' and e.`status` = 'active'"
        .' order by t.`exercise_id`, t.`position`';

    public function __construct(private ContentImports $imports) {}

    public function read(): AuditCatalog
    {
        $catalog = ContentSnapshot::read(fn (): AuditCatalog => $this->readSnapshot());
        $imageHash = ContentSource::fromDirectory(config()->string('content.path'))->documentHash();
        if ($catalog->documentHash !== $imageHash) {
            throw AuditRefused::staleContent($catalog->documentHash, $imageHash);
        }

        return $catalog;
    }

    private function readSnapshot(): AuditCatalog
    {
        $import = $this->imports->latest() ?? throw AuditRefused::noContent();
        $harnessHash = $import->portionHashes['harness'] ?? throw AuditRefused::noContent();
        $templates = $this->templates();
        $tests = $this->tests();
        $exercises = [];
        foreach (DB::select(self::EXERCISES) as $row) {
            $exercises[] = $this->exercise(new RowFields(get_object_vars($row), 'exercises'), $templates, $tests);
        }

        return new AuditCatalog($import->documentHash, $harnessHash, $import->sourceCommit, $exercises);
    }

    /**
     * @param  array<string, string>  $templates
     * @param  array<string, list<array{test: ExpectedTest, label: string}>>  $tests
     */
    private function exercise(RowFields $row, array $templates, array $tests): AuditedExercise
    {
        $id = $row->string('id');
        $language = RunLanguage::from($row->string('language'));
        $expected = [];
        $labels = [];
        foreach ($tests[$id] ?? [] as $entry) {
            $expected[] = $entry['test'];
            $labels[] = $entry['label'];
        }
        $template = $templates[$language->value] ?? throw new LogicException("harness_templates: falta la plantilla de {$language->value}");

        return new AuditedExercise(
            new ExerciseSnapshot($id, $language, $row->string('grading_hash'), $expected, $this->decodeImports($row->string('imports_json')), $template),
            $row->string('catalog'),
            $row->nullableString('domain'),
            ExerciseKind::from($row->string('kind')),
            $row->string('starter_hash'),
            $row->string('starter'),
            $row->string('solution'),
            $labels,
        );
    }

    /** @return array<string, string> */
    private function templates(): array
    {
        $templates = [];
        foreach (DB::select('select `language`, `template` from `harness_templates`') as $row) {
            $fields = new RowFields(get_object_vars($row), 'harness_templates');
            $templates[$fields->string('language')] = $fields->string('template');
        }

        return $templates;
    }

    /** @return array<string, list<array{test: ExpectedTest, label: string}>> */
    private function tests(): array
    {
        $tests = [];
        foreach (DB::select(self::TESTS) as $row) {
            $fields = new RowFields(get_object_vars($row), 'exercise_tests');
            $tests[$fields->string('exercise_id')][] = [
                'test' => new ExpectedTest($fields->string('test_key'), $fields->string('expression'), $fields->int('position')),
                'label' => $fields->string('label'),
            ];
        }

        return $tests;
    }

    /** @return list<string> */
    private function decodeImports(string $json): array
    {
        try {
            $decoded = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new LogicException('exercises.imports_json: se esperaba JSON');
        }
        $imports = [];
        foreach (is_array($decoded) ? $decoded : [] as $import) {
            if (! is_string($import)) {
                throw new LogicException('exercises.imports_json: se esperaba una lista de textos');
            }
            $imports[] = $import;
        }

        return $imports;
    }
}
```

**Paso 5.** Las siete pruebas en verde, junto con `ExerciseReaderTest`. `npm run api:format:check`, `npm run api:analyse`. Commits: `test(api): fija la lectura del currículo de la auditoría` y `feat(api): lee el currículo activo en una instantánea`.

### Tarea 1.4 · Qué se audita y el armado (T005, P)

**Archivos:** crea `backend/api/app/Audit/AuditSelection.php`, `AuditPlan.php` y `backend/api/tests/Feature/Audit/AuditPlanTest.php`.

**Interfaz:**

```php
AuditSelection::__construct(list<RunLanguage> $languages, list<string> $exercises);
AuditSelection::fromOptions(?string $language, list<string> $exercises): self;      // lanza AuditRefused
AuditSelection::isFull(): bool;
AuditSelection::includes(AuditedExercise $exercise): bool;
AuditSelection::requireKnown(AuditCatalog $catalog): void;                          // lanza AuditRefused
AuditSelection::languageNames(): string;                                            // "rust y go", "go"
AuditPlan::ZERO_NONCE = '00000000000000000000000000000000';
AuditPlan::__construct(ProgramComposer $composer);
AuditPlan::programs(AuditCatalog $catalog, AuditSelection $selection): list<AuditProgram>;   // lanza AuditRefused::sampleMissing
```

**Paso 1, la prueba en rojo.** `AuditPlanTest.php`:

```php
<?php

use App\Audit\AuditCatalogReader;
use App\Audit\AuditPlan;
use App\Audit\AuditProgram;
use App\Audit\AuditRefused;
use App\Audit\AuditSelection;
use App\Audit\ProgramRole;
use App\Runs\Admission\ExerciseReader;
use App\Runs\Program\ProgramComposer;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuditWorld;

it('runs each active exercise twice, solution then starter, alone and without a custom test (FR-002)', function () {
    AuditWorld::curriculum();

    $programs = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, []));
    $plain = array_slice($programs, 0, 8);

    expect(array_map(fn (AuditProgram $program) => $program->exercise->id().':'.$program->role->value, $plain))->toBe([
        'rust-01:solution', 'rust-01:starter', 'rust-02:solution', 'rust-02:starter',
        'go-01:solution', 'go-01:starter', 'go-02:solution', 'go-02:starter',
    ]);
    foreach ($plain as $program) {
        expect($program->customTest)->toBeNull()
            ->and($program->composed->hasCustomTest)->toBeFalse()
            ->and($program->composed->expectedTests)->toBe(['t1', 't2', 't3']);
    }
});

it('adds the custom test sample: per language, one expression that passes and one that fails (Q5, FR-034)', function () {
    AuditWorld::curriculum();

    $programs = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, []));
    $sample = array_slice($programs, 8);

    expect(array_map(fn (AuditProgram $program) => [$program->exercise->id(), $program->role, $program->customTest?->expression, $program->customTest?->expected], $sample))->toBe([
        ['rust-01', ProgramRole::Solution, 'energia(5) == 35', TestOutcome::Pass],
        ['rust-01', ProgramRole::Solution, 'energia(5) == 36', TestOutcome::Fail],
        ['go-01', ProgramRole::Solution, 'Bytes(2) == 2048', TestOutcome::Pass],
        ['go-01', ProgramRole::Solution, 'Bytes(2) == 2049', TestOutcome::Fail],
    ]);
    foreach ($sample as $program) {
        expect($program->composed->hasCustomTest)->toBeTrue();
    }
});

it('composes the same program that B2 would compose with that code and that nonce (FR-003)', function () {
    AuditWorld::curriculum();

    $programs = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, []));

    foreach ($programs as $program) {
        $b2 = app(ProgramComposer::class)->compose(
            app(ExerciseReader::class)->forRun($program->exercise->id()) ?? throw new LogicException('missing'),
            $program->exercise->code($program->role),
            $program->customTest?->expression,
            $program->composed->nonce,
        );
        expect($program->composed->text)->toBe($b2->text);
    }
});

it('gives each program a fresh 128-bit nonce', function () {
    AuditWorld::curriculum();

    $programs = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, []));
    $nonces = array_map(fn (AuditProgram $program) => $program->composed->nonce, $programs);

    expect(array_unique($nonces))->toHaveCount(count($programs));
    foreach ($nonces as $nonce) {
        expect($nonce)->toMatch('/\A[0-9a-f]{32}\z/');
    }
});

it('fingerprints each program with the zero nonce, so two runs agree', function () {
    AuditWorld::curriculum();
    $catalog = app(AuditCatalogReader::class)->read();

    $first = app(AuditPlan::class)->programs($catalog, AuditSelection::fromOptions(null, []));
    $second = app(AuditPlan::class)->programs($catalog, AuditSelection::fromOptions(null, []));
    $zero = app(ProgramComposer::class)->compose($first[0]->exercise->snapshot, $first[0]->exercise->solution, null, '00000000000000000000000000000000');

    expect(array_map(fn (AuditProgram $program) => $program->fingerprint, $first))->toBe(array_map(fn (AuditProgram $program) => $program->fingerprint, $second))
        ->and($first[0]->fingerprint)->toBe(hash('sha256', $zero->text));
});

it('changes the fingerprint of the solution program with a test, the solution or the template, and not with a title (SC-004)', function (string $change, bool $changes) {
    AuditWorld::curriculum();
    $before = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions('rust', ['rust-01']))[0]->fingerprint;

    match ($change) {
        'expression' => DB::table('exercise_tests')->where('exercise_id', 'rust-01')->where('test_key', 't1')->update(['expression' => 'false']),
        'solution' => DB::table('exercises')->where('id', 'rust-01')->update(['solution' => "fn other() {}\n"]),
        'template' => DB::table('harness_templates')->where('language', 'rust')->update(['template' => "// otra plantilla\n".DB::table('harness_templates')->where('language', 'rust')->value('template')]),
        'title' => DB::table('exercises')->where('id', 'rust-01')->update(['title' => 'Otro título']),
    };
    $after = app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions('rust', ['rust-01']))[0]->fingerprint;

    expect($after !== $before)->toBe($changes);
})->with([
    'a test expression' => ['expression', true],
    'the solution' => ['solution', true],
    'the template' => ['template', true],
    'only a title' => ['title', false],
]);

it('runs only the chosen language with its sample, or only the chosen exercises without a sample, as a partial run (FR-015)', function () {
    AuditWorld::curriculum();
    $catalog = app(AuditCatalogReader::class)->read();

    $go = app(AuditPlan::class)->programs($catalog, AuditSelection::fromOptions('go', []));
    $one = app(AuditPlan::class)->programs($catalog, AuditSelection::fromOptions(null, ['rust-02', 'rust-02']));

    expect(array_map(fn (AuditProgram $program) => $program->exercise->id(), $go))->toBe(['go-01', 'go-01', 'go-02', 'go-02', 'go-01', 'go-01'])
        ->and(array_map(fn (AuditProgram $program) => $program->exercise->id(), $one))->toBe(['rust-02', 'rust-02'])
        ->and(AuditSelection::fromOptions('go', [])->isFull())->toBeFalse()
        ->and(AuditSelection::fromOptions(null, ['rust-02'])->isFull())->toBeFalse()
        ->and(AuditSelection::fromOptions(null, [])->isFull())->toBeTrue();
});

it('refuses an unknown language, an inactive exercise and an exercise of another language (FR-013)', function (?string $language, array $exercises, string $message) {
    AuditWorld::curriculum();

    expect(fn () => AuditSelection::fromOptions($language, $exercises)->requireKnown(app(AuditCatalogReader::class)->read()))
        ->toThrow(AuditRefused::class, $message);
})->with([
    'an unknown language' => ['kotlin', [], '--language admite rust o go y llegó «kotlin».'],
    'a retired exercise' => [null, ['rust-03'], 'rust-03 no es un ejercicio activo de rust y go.'],
    'another language' => ['go', ['rust-01'], 'rust-01 no es un ejercicio activo de go.'],
]);

it('refuses when the sample exercise is not active', function () {
    AuditWorld::curriculum();
    config(['audit.custom_test_sample.rust.exercise' => 'rust-03']);

    expect(fn () => app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), AuditSelection::fromOptions(null, [])))
        ->toThrow(AuditRefused::class, 'La muestra de la prueba propia necesita rust-03, que no es un ejercicio activo: actualizá audit.custom_test_sample.');
});
```

**Paso 2.** `npm run api:test -- --filter=AuditPlanTest`: falla.

**Paso 3, la implementación.**

```php
<?php

namespace App\Audit;

use App\Runs\RunLanguage;

final readonly class AuditSelection
{
    /**
     * @param  list<RunLanguage>  $languages
     * @param  list<string>  $exercises
     */
    public function __construct(public array $languages, public array $exercises) {}

    /** @param  list<string>  $exercises */
    public static function fromOptions(?string $language, array $exercises): self
    {
        $unique = [];
        foreach ($exercises as $id) {
            if (! in_array($id, $unique, true)) {
                $unique[] = $id;
            }
        }
        if ($language === null) {
            return new self(RunLanguage::cases(), $unique);
        }
        $chosen = RunLanguage::tryFrom($language) ?? throw AuditRefused::invalidOption("--language admite rust o go y llegó «{$language}».");

        return new self([$chosen], $unique);
    }

    public function isFull(): bool
    {
        return count($this->languages) === count(RunLanguage::cases()) && $this->exercises === [];
    }

    public function includes(AuditedExercise $exercise): bool
    {
        return in_array($exercise->snapshot->language, $this->languages, true)
            && ($this->exercises === [] || in_array($exercise->id(), $this->exercises, true));
    }

    public function requireKnown(AuditCatalog $catalog): void
    {
        foreach ($this->exercises as $id) {
            $exercise = $catalog->find($id);
            if ($exercise === null || ! in_array($exercise->snapshot->language, $this->languages, true)) {
                throw AuditRefused::unknownExercise($id, $this->languageNames());
            }
        }
    }

    public function languageNames(): string
    {
        $names = [];
        foreach ($this->languages as $language) {
            $names[] = $language->value;
        }

        return implode(' y ', $names);
    }
}
```

```php
<?php

namespace App\Audit;

use App\Runs\Program\ProgramComposer;
use App\Runs\TestOutcome;

final class AuditPlan
{
    public const ZERO_NONCE = '00000000000000000000000000000000';

    public function __construct(private ProgramComposer $composer) {}

    /** @return list<AuditProgram> */
    public function programs(AuditCatalog $catalog, AuditSelection $selection): array
    {
        $programs = [];
        foreach ($catalog->exercises as $exercise) {
            if ($selection->includes($exercise)) {
                $programs[] = $this->program($exercise, ProgramRole::Solution, null);
                $programs[] = $this->program($exercise, ProgramRole::Starter, null);
            }
        }
        if ($selection->exercises !== []) {
            return $programs;
        }
        foreach ($selection->languages as $language) {
            $sample = "audit.custom_test_sample.{$language->value}";
            $id = config()->string("{$sample}.exercise");
            $exercise = $catalog->find($id);
            if ($exercise === null || $exercise->snapshot->language !== $language) {
                throw AuditRefused::sampleMissing($id);
            }
            $programs[] = $this->program($exercise, ProgramRole::Solution, new CustomTestProbe(config()->string("{$sample}.passing"), TestOutcome::Pass));
            $programs[] = $this->program($exercise, ProgramRole::Solution, new CustomTestProbe(config()->string("{$sample}.failing"), TestOutcome::Fail));
        }

        return $programs;
    }

    private function program(AuditedExercise $exercise, ProgramRole $role, ?CustomTestProbe $customTest): AuditProgram
    {
        $code = $exercise->code($role);
        $expression = $customTest?->expression;

        return new AuditProgram(
            $exercise,
            $role,
            $customTest,
            $this->composer->compose($exercise->snapshot, $code, $expression, bin2hex(random_bytes(16))),
            hash('sha256', $this->composer->compose($exercise->snapshot, $code, $expression, self::ZERO_NONCE)->text),
        );
    }
}
```

**Paso 4.** En verde; Pint y PHPStan. Commits: `test(api): fija qué audita y cómo arma cada programa` y `feat(api): arma los programas de la auditoría con el armado de B2`.

### Tarea 1.5 · La regla (T006, J)

**Archivos:** crea `backend/api/app/Audit/Diagnostic.php`, `JudgedProgram.php`, `ProgramJudge.php`, `backend/api/tests/Support/AuditCases.php` y `backend/api/tests/Unit/Audit/ProgramJudgeTest.php`.

**Interfaz:**

```php
ProgramJudge::__construct(AuditLimits $limits);
ProgramJudge::judge(AuditProgram $program, ExecutorResult $result, Verdict $verdict): JudgedProgram;
JudgedProgram::judged(AuditProgram, Verdict, AuditVerdict, ?FindingKind, PhaseTiming $compile, ?PhaseTiming $run, bool $oomKilled, bool $warning): JudgedProgram;
JudgedProgram::noVerdict(AuditProgram $program, ExecutorReply $reply): JudgedProgram;
Diagnostic::excerpt(?string $stderr, ?string $stdout): ?string;
```

Propiedades públicas de `JudgedProgram`: `program`, `audit`, `finding`, `status` (`?RunStatus`), `reason` (`?RunReason`), `phase` (`?ExecutorPhase`), `exitCode` (`?int`), `tests` (`list<TestVerdict>`), `custom` (`?TestOutcome`), `compile` (`?PhaseTiming`), `run` (`?PhaseTiming`), `truncated` (`?bool`), `oomKilled` (`?bool`), `warning` (`bool`), `noVerdictCause` (`?string`), `diagnostic` (`?string`).

**Paso 1, el apoyo de pruebas.** `AuditCases.php` (sin base; T009 le suma el informe del ejemplo):

```php
<?php

namespace Tests\Support;

use App\Audit\AuditedExercise;
use App\Audit\AuditLimits;
use App\Audit\AuditProgram;
use App\Audit\CustomTestProbe;
use App\Audit\ExerciseKind;
use App\Audit\ProgramRole;
use App\Runs\Evidence\ExecutorResult;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\Program\ComposedProgram;
use App\Runs\Program\ExerciseSnapshot;
use App\Runs\Program\ExpectedTest;
use App\Runs\RunLanguage;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;

final class AuditCases
{
    public static function limits(): AuditLimits
    {
        return new AuditLimits(20000, 15000, 10000, 1024, 256, 0.5);
    }

    public static function exercise(string $id = 'rust-01', ExerciseKind $kind = ExerciseKind::Completar, RunLanguage $language = RunLanguage::Rust): AuditedExercise
    {
        return new AuditedExercise(
            new ExerciseSnapshot($id, $language, str_repeat('1', 64), [new ExpectedTest('t1', 'true', 1), new ExpectedTest('t2', 'true', 2)], [], '{{code}}'),
            'lab', null, $kind, str_repeat('2', 64), 'fn starter() {}', 'fn solution() {}', ['Primera', 'Segunda'],
        );
    }

    public static function program(ProgramRole $role = ProgramRole::Solution, ExerciseKind $kind = ExerciseKind::Completar, ?CustomTestProbe $probe = null): AuditProgram
    {
        return new AuditProgram(self::exercise(kind: $kind), $role, $probe, new ComposedProgram('program', ['t1', 't2'], $probe !== null, str_repeat('a', 32)), str_repeat('3', 64));
    }

    public static function result(ExecutorPhase $phase = ExecutorPhase::Run, int $compileMs = 900, int $runMs = 200, bool $oomKilled = false): ExecutorResult
    {
        return new ExecutorResult($phase, 0, '', '', false, false, $oomKilled, $compileMs, $runMs);
    }

    /** @param  list<TestOutcome>  $outcomes  for t1, t2… */
    public static function verdict(
        RunStatus $status,
        ?RunReason $reason = null,
        array $outcomes = [],
        ?TestOutcome $custom = null,
        ExecutorPhase $phase = ExecutorPhase::Run,
        int $exitCode = 0,
        string $stderr = '',
        string $stdout = '',
    ): Verdict {
        $tests = [];
        foreach ($outcomes as $index => $outcome) {
            $tests[] = new TestVerdict('t'.($index + 1), $outcome);
        }

        return new Verdict($status, $reason, $phase, $exitCode, false, 900, 200, $stdout, $stderr, $tests, $custom);
    }
}
```

**Paso 2, la prueba en rojo.** `ProgramJudgeTest.php`. Las filas son las de la tabla de la spec y de data-model.md, «La regla»:

```php
<?php

use App\Audit\AuditVerdict;
use App\Audit\CustomTestProbe;
use App\Audit\Diagnostic;
use App\Audit\ExerciseKind;
use App\Audit\FindingKind;
use App\Audit\JudgedProgram;
use App\Audit\ProgramJudge;
use App\Audit\ProgramRole;
use App\Runs\Execution\ExecutorReply;
use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Tests\Support\AuditCases;

it('decides each row of the table of the spec', function (ProgramRole $role, ExerciseKind $kind, RunStatus $status, ?RunReason $reason, ?CustomTestProbe $probe, ?TestOutcome $custom, AuditVerdict $audit, ?FindingKind $finding) {
    $phase = $status === RunStatus::CompileError ? ExecutorPhase::Compile : ExecutorPhase::Run;

    $judged = (new ProgramJudge(AuditCases::limits()))->judge(
        AuditCases::program($role, $kind, $probe),
        AuditCases::result($phase),
        AuditCases::verdict($status, $reason, custom: $custom, phase: $phase),
    );

    expect($judged->audit)->toBe($audit)->and($judged->finding)->toBe($finding);
})->with([
    'a solution that passes' => [ProgramRole::Solution, ExerciseKind::Completar, RunStatus::Passed, null, null, null, AuditVerdict::Passes, null],
    'a solution that fails a test' => [ProgramRole::Solution, ExerciseKind::Completar, RunStatus::Failed, null, null, null, AuditVerdict::Finding, FindingKind::SolutionNotPassed],
    'a solution that does not compile' => [ProgramRole::Solution, ExerciseKind::Reparar, RunStatus::CompileError, null, null, null, AuditVerdict::Finding, FindingKind::SolutionNotPassed],
    'a solution with its output cut' => [ProgramRole::Solution, ExerciseKind::Completar, RunStatus::Failed, RunReason::OutputLimit, null, null, AuditVerdict::Finding, FindingKind::SolutionNotPassed],
    'a starter that fails as expected' => [ProgramRole::Starter, ExerciseKind::Completar, RunStatus::Failed, null, null, null, AuditVerdict::FailsAsExpected, null],
    'a reparar starter that does not compile' => [ProgramRole::Starter, ExerciseKind::Reparar, RunStatus::CompileError, null, null, null, AuditVerdict::FailsAsExpected, null],
    'a starter that passes' => [ProgramRole::Starter, ExerciseKind::Completar, RunStatus::Passed, null, null, null, AuditVerdict::Finding, FindingKind::StarterPassed],
    'a completar starter that does not compile' => [ProgramRole::Starter, ExerciseKind::Completar, RunStatus::CompileError, null, null, null, AuditVerdict::Finding, FindingKind::StarterCompileError],
    'an abort' => [ProgramRole::Starter, ExerciseKind::Completar, RunStatus::RuntimeError, RunReason::Signal, null, null, AuditVerdict::Finding, FindingKind::StarterRuntimeError],
    'a non-zero exit' => [ProgramRole::Starter, ExerciseKind::Reparar, RunStatus::RuntimeError, null, null, null, AuditVerdict::Finding, FindingKind::StarterRuntimeError],
    'a timeout' => [ProgramRole::Starter, ExerciseKind::Completar, RunStatus::Timeout, null, null, null, AuditVerdict::Finding, FindingKind::LimitExceeded],
    'invalid evidence' => [ProgramRole::Starter, ExerciseKind::Completar, RunStatus::Failed, RunReason::EvidenceInvalid, null, null, AuditVerdict::Finding, FindingKind::StarterFailedWithoutTests],
    'output cut before the markers' => [ProgramRole::Starter, ExerciseKind::Completar, RunStatus::Failed, RunReason::OutputLimit, null, null, AuditVerdict::Finding, FindingKind::StarterFailedWithoutTests],
    'the pids limit with runsc' => [ProgramRole::Starter, ExerciseKind::Completar, RunStatus::RuntimeError, RunReason::PidsLimit, null, null, AuditVerdict::Finding, FindingKind::LimitExceeded],
    'memory at run time' => [ProgramRole::Solution, ExerciseKind::Completar, RunStatus::RuntimeError, RunReason::Oom, null, null, AuditVerdict::Finding, FindingKind::LimitExceeded],
    'memory while compiling a reparar starter' => [ProgramRole::Starter, ExerciseKind::Reparar, RunStatus::CompileError, RunReason::Oom, null, null, AuditVerdict::Finding, FindingKind::LimitExceeded],
    'a custom test that passes as expected' => [ProgramRole::Solution, ExerciseKind::Completar, RunStatus::Passed, null, new CustomTestProbe('energia(5) == 35', TestOutcome::Pass), TestOutcome::Pass, AuditVerdict::Passes, null],
    'a custom test that fails as expected' => [ProgramRole::Solution, ExerciseKind::Completar, RunStatus::Passed, null, new CustomTestProbe('energia(5) == 36', TestOutcome::Fail), TestOutcome::Fail, AuditVerdict::Passes, null],
    'a custom test reported otherwise' => [ProgramRole::Solution, ExerciseKind::Completar, RunStatus::Passed, null, new CustomTestProbe('energia(5) == 35', TestOutcome::Pass), TestOutcome::Fail, AuditVerdict::Finding, FindingKind::CustomTestMismatch],
    'a custom test without its marker' => [ProgramRole::Solution, ExerciseKind::Completar, RunStatus::Passed, null, new CustomTestProbe('energia(5) == 35', TestOutcome::Pass), TestOutcome::Missing, AuditVerdict::Finding, FindingKind::CustomTestMismatch],
]);

it('measures both phases against their limits and only the compilation when the program did not run', function () {
    $judge = new ProgramJudge(AuditCases::limits());

    $ran = $judge->judge(AuditCases::program(), AuditCases::result(compileMs: 812, runMs: 34), AuditCases::verdict(RunStatus::Passed));
    $compiled = $judge->judge(AuditCases::program(ProgramRole::Starter), AuditCases::result(ExecutorPhase::Compile, 640, 0), AuditCases::verdict(RunStatus::CompileError, phase: ExecutorPhase::Compile, exitCode: 1));

    expect([$ran->compile?->ms, $ran->compile?->limitMs, $ran->run?->ms, $ran->run?->limitMs])->toBe([812, 20000, 34, 10000])
        ->and($compiled->run)->toBeNull()
        ->and($compiled->compile?->ms)->toBe(640);
});

it('warns a program that passes above half of a limit, never a finding (Q4, FR-022)', function () {
    $judge = new ProgramJudge(AuditCases::limits());

    $slow = $judge->judge(AuditCases::program(), AuditCases::result(compileMs: 11000), AuditCases::verdict(RunStatus::Passed));
    $slowRun = $judge->judge(AuditCases::program(ProgramRole::Starter), AuditCases::result(runMs: 5001), AuditCases::verdict(RunStatus::Failed));
    $slowFinding = $judge->judge(AuditCases::program(ProgramRole::Starter), AuditCases::result(compileMs: 11000), AuditCases::verdict(RunStatus::Passed));

    expect($slow->warning)->toBeTrue()->and($slow->audit)->toBe(AuditVerdict::Passes)
        ->and($slowRun->warning)->toBeTrue()
        ->and($slowFinding->warning)->toBeFalse();
});

it('keeps whether the memory ran out, and no diagnostic unless it is a finding (FR-023)', function () {
    $judge = new ProgramJudge(AuditCases::limits());

    $oom = $judge->judge(AuditCases::program(), AuditCases::result(oomKilled: true), AuditCases::verdict(RunStatus::RuntimeError, RunReason::Oom, stderr: "memory\n"));
    $fine = $judge->judge(AuditCases::program(), AuditCases::result(), AuditCases::verdict(RunStatus::Passed, stderr: "warning: unused\n"));

    expect($oom->oomKilled)->toBeTrue()->and($oom->diagnostic)->toBe('memory')
        ->and($fine->oomKilled)->toBeFalse()->and($fine->diagnostic)->toBeNull();
});

it('leaves a program without a verdict with the cause and the status of the reply (FR-008)', function () {
    $judged = JudgedProgram::noVerdict(AuditCases::program(), ExecutorReply::failed('status', 500));

    expect($judged->audit)->toBe(AuditVerdict::NoVerdict)
        ->and($judged->noVerdictCause)->toBe('status:500')
        ->and($judged->status)->toBeNull()
        ->and($judged->warning)->toBeFalse()
        ->and(JudgedProgram::noVerdict(AuditCases::program(), ExecutorReply::failed('connection', null))->noVerdictCause)->toBe('connection');
});

it('keeps the first eight lines of the diagnostic, without the markers, cut to 200 characters', function () {
    $stderr = implode("\n", ['', 'error[E0277]: one', '__TALLER_TEST__x:t1:FAIL', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']);

    expect(Diagnostic::excerpt($stderr, 'ignored'))->toBe("error[E0277]: one\ntwo\nthree\nfour\nfive\nsix\nseven\neight")
        ->and(Diagnostic::excerpt('', "panicked at main\n"))->toBe('panicked at main')
        ->and(Diagnostic::excerpt('', ''))->toBeNull()
        ->and(mb_strlen(Diagnostic::excerpt(str_repeat('x', 300), null) ?? ''))->toBe(200);
});
```

**Paso 3.** `npm run api:test -- --filter=ProgramJudgeTest`: falla.

**Paso 4, la implementación.**

```php
<?php

namespace App\Audit;

final class Diagnostic
{
    private const MAX_LINES = 8;

    private const MAX_WIDTH = 200;

    public static function excerpt(?string $stderr, ?string $stdout): ?string
    {
        foreach ([$stderr, $stdout] as $stream) {
            $lines = [];
            foreach (explode("\n", $stream ?? '') as $line) {
                $line = rtrim($line);
                if ($line === '' || str_contains($line, '__TALLER_')) {
                    continue;
                }
                $lines[] = mb_strimwidth($line, 0, self::MAX_WIDTH, '…');
                if (count($lines) === self::MAX_LINES) {
                    break;
                }
            }
            if ($lines !== []) {
                return implode("\n", $lines);
            }
        }

        return null;
    }
}
```

```php
<?php

namespace App\Audit;

use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\ExecutorReply;
use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;

final readonly class JudgedProgram
{
    /** @param  list<TestVerdict>  $tests */
    private function __construct(
        public AuditProgram $program,
        public AuditVerdict $audit,
        public ?FindingKind $finding,
        public ?RunStatus $status,
        public ?RunReason $reason,
        public ?ExecutorPhase $phase,
        public ?int $exitCode,
        public array $tests,
        public ?TestOutcome $custom,
        public ?PhaseTiming $compile,
        public ?PhaseTiming $run,
        public ?bool $truncated,
        public ?bool $oomKilled,
        public bool $warning,
        public ?string $noVerdictCause,
        public ?string $diagnostic,
    ) {}

    public static function judged(
        AuditProgram $program,
        Verdict $verdict,
        AuditVerdict $audit,
        ?FindingKind $finding,
        PhaseTiming $compile,
        ?PhaseTiming $run,
        bool $oomKilled,
        bool $warning,
    ): self {
        return new self(
            $program, $audit, $finding, $verdict->status, $verdict->reason, $verdict->phase, $verdict->exitCode,
            $verdict->tests, $verdict->custom, $compile, $run, $verdict->truncated, $oomKilled, $warning, null,
            $finding === null ? null : Diagnostic::excerpt($verdict->stderr, $verdict->stdout),
        );
    }

    public static function noVerdict(AuditProgram $program, ExecutorReply $reply): self
    {
        $cause = $reply->httpStatus === null ? $reply->cause : "{$reply->cause}:{$reply->httpStatus}";

        return new self($program, AuditVerdict::NoVerdict, null, null, null, null, null, [], null, null, null, null, null, false, $cause, null);
    }
}
```

```php
<?php

namespace App\Audit;

use App\Runs\Evidence\ExecutorResult;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;

final class ProgramJudge
{
    public function __construct(private AuditLimits $limits) {}

    public function judge(AuditProgram $program, ExecutorResult $result, Verdict $verdict): JudgedProgram
    {
        $finding = $this->finding($program, $verdict);
        $audit = match (true) {
            $finding !== null => AuditVerdict::Finding,
            $program->role === ProgramRole::Solution => AuditVerdict::Passes,
            default => AuditVerdict::FailsAsExpected,
        };
        $compile = new PhaseTiming($result->compileMs, $this->limits->compileMs($program->exercise->snapshot->language));
        $run = $result->phase === ExecutorPhase::Run ? new PhaseTiming($result->runMs, $this->limits->runMs) : null;
        $warning = $finding === null && ($this->limits->isNear($compile) || ($run !== null && $this->limits->isNear($run)));

        return JudgedProgram::judged($program, $verdict, $audit, $finding, $compile, $run, $result->oomKilled, $warning);
    }

    private function finding(AuditProgram $program, Verdict $verdict): ?FindingKind
    {
        if ($verdict->status === RunStatus::Timeout || in_array($verdict->reason, [RunReason::Oom, RunReason::PidsLimit], true)) {
            return FindingKind::LimitExceeded;
        }

        return $program->role === ProgramRole::Solution
            ? $this->solutionFinding($program, $verdict)
            : $this->starterFinding($program->exercise->kind, $verdict);
    }

    private function solutionFinding(AuditProgram $program, Verdict $verdict): ?FindingKind
    {
        if ($verdict->status !== RunStatus::Passed) {
            return FindingKind::SolutionNotPassed;
        }
        if ($program->customTest !== null && $verdict->custom !== $program->customTest->expected) {
            return FindingKind::CustomTestMismatch;
        }

        return null;
    }

    private function starterFinding(ExerciseKind $kind, Verdict $verdict): ?FindingKind
    {
        return match ($verdict->status) {
            RunStatus::Passed => FindingKind::StarterPassed,
            RunStatus::Failed => $verdict->reason === null ? null : FindingKind::StarterFailedWithoutTests,
            RunStatus::CompileError => $kind === ExerciseKind::Reparar ? null : FindingKind::StarterCompileError,
            default => FindingKind::StarterRuntimeError,
        };
    }
}
```

**Paso 5.** En verde; Pint y PHPStan. Commits: `test(api): fija la regla de la auditoría fila por fila` y `feat(api): decide cada programa auditado`.

### Tarea 1.6 · El envío en tandas (T007, P)

**Archivos:** crea `backend/api/app/Audit/ExecutorDispatcher.php`, completa `backend/api/tests/Support/AuditExecutorDouble.php` y crea `backend/api/tests/Feature/Audit/ExecutorDispatcherTest.php`.

**Interfaz:** `ExecutorDispatcher::__construct(ExecutorClient $client)`, `dispatch(array<string, AuditProgram> $programs, int $concurrency): array<string, ExecutorReply>`: una respuesta final (`Result` o `Failed`) por clave.

**Paso 1, el doble.** `AuditExecutorDouble.php`, completo (el comentario de la clase es la referencia al contrato y se conserva):

```php
<?php

namespace Tests\Support;

use Closure;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Promise\Create;
use GuzzleHttp\Promise\PromiseInterface;
use GuzzleHttp\Psr7\Request as PsrRequest;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use LogicException;

/** The audit executor at its HTTP edge, answering from the contract of spec 005 (contracts/executor.md). */
final class AuditExecutorDouble
{
    public const URL = 'http://executor-audit:8080';

    public const TOKEN = 'an-audit-token-of-at-least-thirty-two-bytes';

    /** @param  array<string, Closure(string, string): PromiseInterface>  $behaviors  keyed by a text of the program; the first match wins */
    public static function fake(array $behaviors): void
    {
        config(['runs.executor.url' => self::URL, 'runs.executor.token' => self::TOKEN]);
        Http::preventStrayRequests();
        Http::fake(['executor-audit:8080/*' => fn (Request $request): PromiseInterface => self::answer($request, $behaviors)]);
    }

    /** @return array<string, Closure(string, string): PromiseInterface> */
    public static function green(): array
    {
        return [
            'energia(5) == 35' => self::passes('PASS'),
            'energia(5) == 36' => self::passes('FAIL'),
            'Bytes(2) == 2048' => self::passes('PASS'),
            'Bytes(2) == 2049' => self::passes('FAIL'),
            'solution_rust_01' => self::passes(),
            'starter_rust_01' => self::fails(),
            'solution_rust_02' => self::passes(),
            'starter_rust_02' => self::compileError(),
            'solution_go_01' => self::passes(),
            'starter_go_01' => self::fails(),
            'solution_go_02' => self::passes(),
            'starter_go_02' => self::fails(),
        ];
    }

    /**
     * @param  array<string, Closure(string, string): PromiseInterface>  $changes
     * @return array<string, Closure(string, string): PromiseInterface>
     */
    public static function greenExcept(array $changes): array
    {
        $green = self::green();
        $behaviors = array_slice($green, 0, 4, true);
        foreach ($changes as $marker => $behavior) {
            $behaviors[$marker] = $behavior;
        }
        foreach ($green as $marker => $behavior) {
            $behaviors[$marker] ??= $behavior;
        }

        return $behaviors;
    }

    public static function connectionFails(string $message = 'cURL error 56: Recv failure: Connection reset by peer'): Closure
    {
        return fn (): PromiseInterface => Create::rejectionFor(new ConnectException($message, new PsrRequest('POST', self::URL.'/v1/run')));
    }

    public static function passes(?string $custom = null, int $compileMs = 900, int $runMs = 200): Closure
    {
        return fn (string $nonce): PromiseInterface => Http::response(self::result([
            'stdout' => self::markers($nonce, ['t1' => 'PASS', 't2' => 'PASS', 't3' => 'PASS'], $custom),
            'compileMs' => $compileMs,
            'runMs' => $runMs,
        ]));
    }

    public static function fails(string $failing = 't1', string $stderr = ''): Closure
    {
        return function (string $nonce) use ($failing, $stderr): PromiseInterface {
            $outcomes = ['t1' => 'PASS', 't2' => 'PASS', 't3' => 'PASS'];
            $outcomes[$failing] = 'FAIL';

            return Http::response(self::result(['stdout' => self::markers($nonce, $outcomes), 'stderr' => $stderr]));
        };
    }

    public static function compileError(string $stderr = "error[E0308]: mismatched types\n"): Closure
    {
        return fn (): PromiseInterface => Http::response(self::result(['phase' => 'compile', 'exitCode' => 1, 'stderr' => $stderr, 'compileMs' => 640, 'runMs' => 0]));
    }

    public static function exits(int $exitCode, string $stdout = ''): Closure
    {
        return fn (): PromiseInterface => Http::response(self::result(['exitCode' => $exitCode, 'stdout' => $stdout]));
    }

    public static function timesOut(): Closure
    {
        return fn (): PromiseInterface => Http::response(self::result(['exitCode' => 137, 'timedOut' => true, 'runMs' => 10000]));
    }

    public static function cutsOutput(): Closure
    {
        return fn (string $nonce): PromiseInterface => Http::response(self::result([
            'stdout' => "__TALLER_TEST__{$nonce}:t1:PASS\n".str_repeat('x', 100),
            'truncated' => true,
        ]));
    }

    public static function status(int $status): Closure
    {
        return fn (): PromiseInterface => Http::response(['error' => 'no se pudo ejecutar en el sandbox'], $status);
    }

    public static function busyThen(Closure $then, string $retryAfter = '2'): Closure
    {
        $calls = 0;

        return function (string $nonce, string $program) use (&$calls, $then, $retryAfter): PromiseInterface {
            $calls++;

            return $calls === 1 ? Http::response(['error' => 'ejecutor ocupado'], 503, ['Retry-After' => $retryAfter]) : $then($nonce, $program);
        };
    }

    /** @param  array<string, string>  $outcomes */
    public static function markers(string $nonce, array $outcomes, ?string $custom = null): string
    {
        $lines = [];
        foreach ($outcomes as $key => $outcome) {
            $lines[] = "__TALLER_TEST__{$nonce}:{$key}:{$outcome}";
        }
        if ($custom !== null) {
            $lines[] = "__TALLER_TEST__{$nonce}:custom:{$custom}";
        }
        $lines[] = "__TALLER_END__{$nonce}:".count($lines);

        return implode("\n", $lines)."\n";
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public static function result(array $changes = []): array
    {
        return [
            'phase' => 'run', 'exitCode' => 0, 'stdout' => '', 'stderr' => '', 'truncated' => false, 'timedOut' => false,
            'oomKilled' => false, 'compileMs' => 900, 'runMs' => 200, ...$changes,
        ];
    }

    /** @param  array<string, Closure(string, string): PromiseInterface>  $behaviors */
    private static function answer(Request $request, array $behaviors): PromiseInterface
    {
        if ($request->url() === self::URL.'/healthz') {
            return Http::response('ok');
        }
        if ($request->header('Authorization') !== ['Bearer '.self::TOKEN]) {
            return Http::response(['error' => 'token inválido'], 401);
        }
        $program = $request->data()['program'] ?? '';
        if (! is_string($program) || $program === '') {
            return Http::response(['error' => 'lenguaje no soportado'], 400);
        }
        foreach ($behaviors as $marker => $behavior) {
            if (str_contains($program, $marker)) {
                return $behavior(self::nonceOf($program), $program);
            }
        }

        throw new LogicException('The audit double has no behavior for this program.');
    }

    private static function nonceOf(string $program): string
    {
        return preg_match('/__TALLER_END__([0-9a-f]{32})/', $program, $match) === 1 ? $match[1] : throw new LogicException('A program without a nonce.');
    }
}
```

Gana la primera coincidencia, y un programa de la muestra también contiene el código de su solución. Por eso `greenExcept` deja primero los cuatro marcadores de la muestra, después los cambios y al final el resto: un cambio de `solution_rust_01` alcanza sólo a la solución sin prueba propia. `connectionFails` rechaza el pedido como lo hace Guzzle; con el mensaje por omisión (errno 56) es «pudo haber corrido», y con `cURL error 7: …` sería «no llegó».

Sumá a `AuditWorld` (también de P) el ayudante que arma los programas con su clave:

```php
    /** @return array<string, AuditProgram> */
    public static function keyedPrograms(?string $exercise = null): array
    {
        self::curriculum();
        $selection = AuditSelection::fromOptions(null, $exercise === null ? [] : [$exercise]);
        $keyed = [];
        foreach (app(AuditPlan::class)->programs(app(AuditCatalogReader::class)->read(), $selection) as $index => $program) {
            $keyed["p{$index}"] = $program;
        }

        return $keyed;
    }
```

(con los `use` de `App\Audit\AuditCatalogReader`, `AuditPlan`, `AuditProgram` y `AuditSelection`).

**Paso 2, la prueba en rojo.** `ExecutorDispatcherTest.php`:

```php
<?php

use App\Audit\ExecutorDispatcher;
use App\Runs\Execution\ReplyKind;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\Support\AuditExecutorDouble;
use Tests\Support\AuditWorld;

beforeEach(fn () => Sleep::fake());

it('sends every program once and returns one final reply per key', function () {
    AuditExecutorDouble::fake(AuditExecutorDouble::green());
    $programs = AuditWorld::keyedPrograms();

    $replies = app(ExecutorDispatcher::class)->dispatch($programs, 4);

    expect(array_keys($replies))->toBe(array_keys($programs));
    foreach ($replies as $reply) {
        expect($reply->kind)->toBe(ReplyKind::Result);
    }
    Http::assertSentCount(12);
    Sleep::assertNeverSlept();
});

it('posts the language and the composed program with the token, to the audit instance', function () {
    AuditExecutorDouble::fake(AuditExecutorDouble::green());
    $programs = AuditWorld::keyedPrograms('rust-01');

    app(ExecutorDispatcher::class)->dispatch($programs, 2);

    Http::assertSent(fn (Request $request) => $request->url() === 'http://executor-audit:8080/v1/run'
        && $request->header('Authorization') === ['Bearer '.AuditExecutorDouble::TOKEN]
        && $request->data() === ['language' => 'rust', 'program' => $programs['p0']->composed->text]);
});

it('waits what a 503 asks and sends again, without taking it as run (FR-008)', function (string $retryAfter, int $seconds) {
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept([
        'solution_rust_01' => AuditExecutorDouble::busyThen(AuditExecutorDouble::passes(), $retryAfter),
    ]));

    $replies = app(ExecutorDispatcher::class)->dispatch(AuditWorld::keyedPrograms('rust-01'), 2);

    expect($replies['p0']->kind)->toBe(ReplyKind::Result);
    Sleep::assertSequence([Sleep::for($seconds)->seconds()]);
    Http::assertSentCount(3);
})->with([
    'what it says' => ['7', 7],
    'at most thirty seconds' => ['120', 30],
]);

it('does not send again a 500, an invalid body or a cut connection: they may have run (FR-008)', function (Closure $behavior, string $cause, ?int $status) {
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['solution_rust_01' => $behavior]));

    $replies = app(ExecutorDispatcher::class)->dispatch(AuditWorld::keyedPrograms('rust-01'), 2);

    expect($replies['p0']->kind)->toBe(ReplyKind::Failed)
        ->and($replies['p0']->cause)->toBe($cause)
        ->and($replies['p0']->httpStatus)->toBe($status);
    Http::assertSentCount(2);
    Sleep::assertNeverSlept();
})->with([
    'a 500' => [fn () => AuditExecutorDouble::status(500), 'status', 500],
    'a 413' => [fn () => AuditExecutorDouble::status(413), 'status', 413],
    'an invalid body' => [fn () => fn () => Http::response(AuditExecutorDouble::result(['extra' => 1])), 'invalid_body', 200],
    'a connection cut while it ran' => [fn () => AuditExecutorDouble::connectionFails(), 'connection', null],
]);

it('waits a second for an executor it could not reach, and gives up after ten rounds without a verdict', function () {
    $programs = AuditWorld::keyedPrograms('rust-01');
    Http::allowStrayRequests();
    config(['runs.executor.url' => 'http://127.0.0.1:1', 'runs.executor.token' => AuditExecutorDouble::TOKEN, 'runs.executor.connect_timeout' => 2]);

    $replies = app(ExecutorDispatcher::class)->dispatch($programs, 2);

    expect($replies['p0']->kind)->toBe(ReplyKind::Failed)
        ->and($replies['p0']->cause)->toBe('unavailable')
        ->and($replies['p0']->httpStatus)->toBeNull();
    Sleep::assertSleptTimes(9);
});
```

En el dataset de 500, 413, cuerpo inválido y conexión cortada, cada valor es un closure que devuelve el comportamiento del doble: Pest lo llama antes de la prueba y le pasa ese comportamiento. `Http::failedConnection()` no sirve para la conexión cortada: su mensaje por omisión es el errno 6, que B2 lee como «no llegó».

**Paso 3.** `npm run api:test -- --filter=ExecutorDispatcherTest`: falla.

**Paso 4, la implementación.**

```php
<?php

namespace App\Audit;

use App\Runs\Execution\ExecutorClient;
use App\Runs\Execution\ExecutorReply;
use App\Runs\Execution\ReplyKind;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

final class ExecutorDispatcher
{
    public function __construct(private ExecutorClient $client) {}

    /**
     * @param  array<string, AuditProgram>  $programs
     * @return array<string, ExecutorReply>
     */
    public function dispatch(array $programs, int $concurrency): array
    {
        $final = [];
        $pending = $programs;
        $maxRounds = config()->integer('audit.retry.max_rounds');
        for ($round = 1; $pending !== [] && $round <= $maxRounds; $round++) {
            $retry = [];
            $wait = 0;
            foreach ($this->send($pending, $concurrency) as $key => $reply) {
                if ($reply->kind === ReplyKind::Busy || $reply->kind === ReplyKind::NotReached) {
                    $retry[$key] = $pending[$key];
                    $wait = max($wait, $this->waitFor($reply));
                } else {
                    $final[$key] = $reply;
                }
            }
            $pending = $retry;
            if ($pending !== [] && $round < $maxRounds) {
                Sleep::for($wait)->seconds();
            }
        }
        foreach (array_keys($pending) as $key) {
            $final[$key] = ExecutorReply::failed('unavailable', null);
        }

        return $this->inOrder($programs, $final);
    }

    private function waitFor(ExecutorReply $reply): int
    {
        if ($reply->kind === ReplyKind::NotReached) {
            return 1;
        }

        return min(max($reply->retryAfterSeconds, 1), config()->integer('audit.retry.max_wait_seconds'));
    }

    /**
     * @param  array<string, AuditProgram>  $programs
     * @return array<string, ExecutorReply>
     */
    private function send(array $programs, int $concurrency): array
    {
        $outcomes = Http::pool(function (Pool $pool) use ($programs): void {
            foreach ($programs as $key => $program) {
                $this->client->prepare($pool->as($key))
                    ->post('/v1/run', ExecutorClient::body($program->exercise->snapshot->language, $program->composed->text));
            }
        }, concurrency: $concurrency);
        $replies = [];
        foreach (array_keys($programs) as $key) {
            $outcome = $outcomes[$key] ?? null;
            $replies[$key] = $outcome instanceof Response || $outcome instanceof ConnectionException
                ? $this->client->read($outcome)
                : ExecutorReply::failed('exception', null);
        }

        return $replies;
    }

    /**
     * @param  array<string, AuditProgram>  $programs
     * @param  array<string, ExecutorReply>  $replies
     * @return array<string, ExecutorReply>
     */
    private function inOrder(array $programs, array $replies): array
    {
        $ordered = [];
        foreach (array_keys($programs) as $key) {
            $ordered[$key] = $replies[$key] ?? ExecutorReply::failed('unavailable', null);
        }

        return $ordered;
    }
}
```

Un programa que sigue ocupado o inalcanzable después de las diez rondas queda sin veredicto con la causa `unavailable`, sin estado HTTP (data-model.md, `noVerdictCause`).

**Paso 5.** En verde; Pint y PHPStan. Commits: `test(api): fija el envío en tandas y sus reintentos` y `feat(api): manda los programas de la auditoría con el cliente de B2`.

### Tarea 1.7 · La sonda del ejecutor y el candado (T008, P)

**Archivos:** crea `backend/api/app/Audit/ExecutorPreflight.php`, `AuditLock.php` y `backend/api/tests/Feature/Audit/AuditGuardsTest.php`.

**Paso 1, la prueba en rojo.** `AuditGuardsTest.php`:

```php
<?php

use App\Audit\AuditLock;
use App\Audit\AuditRefused;
use App\Audit\ExecutorPreflight;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\AuditExecutorDouble;

it('passes when the instance is alive and takes the token, and runs nothing to know it', function () {
    AuditExecutorDouble::fake([]);

    app(ExecutorPreflight::class)->check();

    Http::assertSentCount(2);
    Http::assertSent(fn (Request $request) => $request->method() === 'GET' && $request->url() === 'http://executor-audit:8080/healthz');
    Http::assertSent(fn (Request $request) => $request->method() === 'POST' && $request->data() === ['language' => '', 'program' => '']);
});

it('refuses when it cannot reach the instance (FR-013)', function () {
    Http::allowStrayRequests();
    config(['runs.executor.url' => 'http://127.0.0.1:1', 'runs.executor.token' => AuditExecutorDouble::TOKEN, 'audit.preflight.connect_timeout' => 2]);

    expect(fn () => app(ExecutorPreflight::class)->check())->toThrow(AuditRefused::class, 'No alcanzo al ejecutor de auditoría en http://127.0.0.1:1');
});

it('refuses when healthz does not answer', function () {
    config(['runs.executor.url' => AuditExecutorDouble::URL, 'runs.executor.token' => AuditExecutorDouble::TOKEN]);
    Http::preventStrayRequests();
    Http::fake([
        'executor-audit:8080/healthz' => Http::response('', 503),
        'executor-audit:8080/*' => Http::response(['error' => 'lenguaje no soportado'], 400),
    ]);

    expect(fn () => app(ExecutorPreflight::class)->check())->toThrow(AuditRefused::class, '(GET /healthz respondió 503)');
});

it('refuses when the instance rejects the token (FR-013)', function () {
    AuditExecutorDouble::fake([]);
    config(['runs.executor.token' => str_repeat('x', 40)]);

    expect(fn () => app(ExecutorPreflight::class)->check())
        ->toThrow(AuditRefused::class, 'El ejecutor de auditoría rechazó el token (401): el EXECUTOR_TOKEN de audit no es el de executor-audit.');
});

it('refuses another run while one holds the lock (FR-013)', function () {
    config(['database.connections.audit_holder' => config('database.connections.mysql')]);
    $holder = DB::connection('audit_holder');
    expect($holder->scalar("select get_lock(concat(database(), ':curriculum-audit'), 0)"))->toBeIn([1, '1']);

    try {
        expect(fn () => app(AuditLock::class)->acquire())
            ->toThrow(AuditRefused::class, 'Ya hay otra corrida de auditoría en curso: esperá a que termine. Dos corridas a la vez se borrarían los contenedores.');
    } finally {
        $holder->scalar("select release_lock(concat(database(), ':curriculum-audit'))");
        DB::purge('audit_holder');
    }
});

it('takes the lock and gives it back', function () {
    $lock = app(AuditLock::class);

    $lock->acquire();
    $lock->release();
    $lock->acquire();
    $lock->release();

    expect(DB::scalar("select is_free_lock(concat(database(), ':curriculum-audit'))"))->toBeIn([1, '1']);
});
```

Esa prueba no usa el doble: arma un solo `Http::fake` con la entrada de `/healthz` antes de la general, así el orden del arreglo decide qué responde. Ninguna prueba del plan llama dos veces a `Http::fake`.

**Paso 2.** `npm run api:test -- --filter=AuditGuardsTest`: falla.

**Paso 3, la implementación.**

```php
<?php

namespace App\Audit;

use App\Runs\Execution\ExecutorClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

final class ExecutorPreflight
{
    public function __construct(private ExecutorClient $client) {}

    public function check(): void
    {
        $url = config()->string('runs.executor.url');
        try {
            $health = $this->request()->get('/healthz');
            if (! $health->successful()) {
                throw AuditRefused::unreachable($url, "GET /healthz respondió {$health->status()}");
            }
            $probe = $this->request()->post('/v1/run', ['language' => '', 'program' => '']);
        } catch (ConnectionException $error) {
            throw AuditRefused::unreachable($url, $error->getMessage());
        }
        if ($probe->status() === 401) {
            throw AuditRefused::tokenRejected();
        }
        if ($probe->status() !== 400) {
            throw AuditRefused::unexpectedProbe($probe->status());
        }
    }

    private function request(): PendingRequest
    {
        return $this->client->prepare(Http::withOptions([]))
            ->connectTimeout(config()->integer('audit.preflight.connect_timeout'))
            ->timeout(config()->integer('audit.preflight.timeout'));
    }
}
```

```php
<?php

namespace App\Audit;

use Illuminate\Support\Facades\DB;

final class AuditLock
{
    private const NAME = "concat(database(), ':curriculum-audit')";

    public function acquire(): void
    {
        if (! in_array(DB::scalar('select get_lock('.self::NAME.', 0)'), [1, '1'], true)) {
            throw AuditRefused::alreadyRunning();
        }
    }

    public function release(): void
    {
        DB::scalar('select release_lock('.self::NAME.')');
    }
}
```

**Paso 4.** En verde; Pint y PHPStan. Commits: `test(api): fija las guardas de la auditoría` y `feat(api): sonda del ejecutor y candado de la auditoría`.

### Tarea 1.8 · El informe (T009, J)

**Archivos:** crea `backend/api/app/Audit/HostStamps.php`, `AuditRun.php`, `AuditReport.php`, `AuditReportText.php`; agrega a `backend/api/tests/Support/AuditCases.php` el método `exampleReport()`; crea `backend/api/tests/Unit/Audit/AuditReportTest.php`.

**Interfaz:**

```php
HostStamps::__construct(?string $commit, ?bool $cleanTree, ?string $rustImage, ?string $goImage);
HostStamps::fromOptions(mixed $commit, mixed $cleanTree, mixed $rustImage, mixed $goImage): self;   // lanza AuditRefused
AuditRun::__construct(CarbonImmutable $startedAt, CarbonImmutable $finishedAt, string $runtime, string $instance, int $concurrency, AuditSelection $selection, HostStamps $host);
AuditReport::FORMAT = 'taller-curriculum-audit-1';
AuditReport::__construct(AuditRun $run, AuditCatalog $catalog, AuditLimits $limits, list<JudgedProgram> $programs);
AuditReport::isGreen(): bool; isRecord(): bool; exitCode(): int; durationMs(): int;
AuditReport::counts(): array{programs: int, solutions: int, solutionsPass: int, starters: int, startersFailAsExpected: int, customTestSample: int, customTestSamplePass: int, findings: int, noVerdict: int, warnings: int};
AuditReport::timing(): array<string, array{compile: TimingStats|null, run: TimingStats|null}>;   // TimingStats = array{programs, medianMs, maxMs, minMarginMs, limitMs}
AuditReport::toArray(): array<string, mixed>; json(): string;
AuditReport::run(): AuditRun; programs(): list<JudgedProgram>; byLanguage(): array<string, array{exercises: int, programs: int}>; bySection(): array<string, array{exercises: int}>;
AuditReportText::__construct(AuditReport $report, AuditLimits $limits);
AuditReportText::lines(): list<string>;
```

**Paso 1, el informe del ejemplo.** `AuditCases::exampleReport()` arma, sin base, la corrida del ejemplo escrito a mano: los mismos ejercicios, etiquetas, huellas, tiempos y sellos, decididos por `ProgramJudge`. Si el JSON que sale es igual al ejemplo, el formato, los totales, las estadísticas, los márgenes y el aviso salen bien (los valores del ejemplo se calcularon a mano en data-model.md).

```php
    public static function exampleReport(): AuditReport
    {
        $rust01 = self::exampleExercise('rust-01', '1', '2', ['Tres celdas', 'Reactor vacío', 'Escala distinta']);
        $rust63 = self::exampleExercise('rust-63', '5', '6', ['Expresiones y coma opcional', 'Sin argumentos', 'Efecto una vez']);
        $judge = new ProgramJudge(self::limits());
        $pass = [TestOutcome::Pass, TestOutcome::Pass, TestOutcome::Pass];
        $fail = [TestOutcome::Fail, TestOutcome::Fail, TestOutcome::Fail];
        $programs = [
            $judge->judge(self::exampleProgram($rust01, ProgramRole::Solution, '3'), self::result(compileMs: 812, runMs: 34), self::verdict(RunStatus::Passed, outcomes: $pass)),
            $judge->judge(self::exampleProgram($rust01, ProgramRole::Starter, '4'), self::result(compileMs: 792, runMs: 31), self::verdict(RunStatus::Failed, outcomes: $fail)),
            $judge->judge(self::exampleProgram($rust63, ProgramRole::Solution, '7'), self::result(compileMs: 11000, runMs: 40), self::verdict(RunStatus::Passed, outcomes: $pass)),
            $judge->judge(
                self::exampleProgram($rust63, ProgramRole::Starter, '8'),
                self::result(ExecutorPhase::Compile, 640, 0),
                self::verdict(RunStatus::CompileError, phase: ExecutorPhase::Compile, exitCode: 1, stderr: "error[E0277]: can't compare `!` with `i32`\n --> /tmp/main.rs:12:57\n"),
            ),
            $judge->judge(self::exampleProgram($rust01, ProgramRole::Solution, '9', new CustomTestProbe('energia(5) == 35', TestOutcome::Pass)), self::result(compileMs: 805, runMs: 33), self::verdict(RunStatus::Passed, outcomes: $pass, custom: TestOutcome::Pass)),
            $judge->judge(self::exampleProgram($rust01, ProgramRole::Solution, 'a', new CustomTestProbe('energia(5) == 36', TestOutcome::Fail)), self::result(compileMs: 818, runMs: 36), self::verdict(RunStatus::Passed, outcomes: $pass, custom: TestOutcome::Fail)),
        ];
        $run = new AuditRun(
            CarbonImmutable::parse('2026-11-02T03:00:00.000Z'),
            CarbonImmutable::parse('2026-11-02T03:00:09.500Z'),
            'runsc',
            'auditoria',
            4,
            new AuditSelection([RunLanguage::Rust], []),
            new HostStamps(
                'dd870a9ccb7cb50b8b06b584bcf988acaccbf22e',
                true,
                'sha256:f525ccf76aec49d19b686a8d4cff8baad441ef2f30a0688c74d1a3905c17c356',
                'sha256:e66df8bf3b16022cc6426093be100ba59c09e2eaff9b88d492166e35f0a756b7',
            ),
        );
        $catalog = new AuditCatalog(
            '4555e8500e6ef5bd38cdaf46010d3f14e3345d7ec0c69aea983acfe67f62fbb6',
            '6a86d9fef4cbeebd95703a6e239f08d885071dc7a122a7ca25883d953457a6fa',
            null,
            [$rust01, $rust63],
        );

        return new AuditReport($run, $catalog, self::limits(), $programs);
    }

    /** @param  list<string>  $labels */
    private static function exampleExercise(string $id, string $gradingDigit, string $starterDigit, array $labels): AuditedExercise
    {
        $tests = [new ExpectedTest('t1', 'true', 1), new ExpectedTest('t2', 'true', 2), new ExpectedTest('t3', 'true', 3)];

        return new AuditedExercise(
            new ExerciseSnapshot($id, RunLanguage::Rust, str_repeat($gradingDigit, 64), $tests, [], '{{code}}'),
            'lab', null, ExerciseKind::Completar, str_repeat($starterDigit, 64), 'fn starter() {}', 'fn solution() {}', $labels,
        );
    }

    private static function exampleProgram(AuditedExercise $exercise, ProgramRole $role, string $fingerprintDigit, ?CustomTestProbe $probe = null): AuditProgram
    {
        return new AuditProgram($exercise, $role, $probe, new ComposedProgram('program', ['t1', 't2', 't3'], $probe !== null, str_repeat('a', 32)), str_repeat($fingerprintDigit, 64));
    }
```

(Suma los `use` de `AuditCatalog`, `AuditReport`, `AuditRun`, `AuditSelection`, `HostStamps`, `ProgramJudge` y `Carbon\CarbonImmutable`.)

**Paso 2, la prueba en rojo.** `AuditReportTest.php`:

```php
<?php

use App\Audit\AuditRefused;
use App\Audit\AuditReportText;
use App\Audit\HostStamps;
use App\Audit\ProgramJudge;
use App\Audit\ProgramRole;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\RunLanguage;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Tests\Support\AuditCases;

it('writes exactly the hand-written example for the same run (FR-019, FR-020, FR-035)', function () {
    $example = json_decode((string) file_get_contents(dirname(__DIR__, 2).'/Fixtures/shared/audit-report-example.json'), true, 512, JSON_THROW_ON_ERROR);

    expect(json_decode(AuditCases::exampleReport()->json(), true, 512, JSON_THROW_ON_ERROR))->toBe($example);
});

it('writes the example as legible lines in Spanish (FR-018, FR-022, FR-026)', function () {
    $report = AuditCases::exampleReport();

    expect((new AuditReportText($report, AuditCases::limits()))->lines())->toBe([
        'HALLAZGO · rust-63 (rust, lab, completar) · inicial · compile_error · el código inicial no compila y el ejercicio no es de reparar',
        '    diagnóstico:',
        "      error[E0277]: can't compare `!` with `i32`",
        '       --> /tmp/main.rs:12:57',
        'AVISO · rust-63 (rust, lab, completar) · solución · compilar 11,00 s de 20,00 s (55 %)',
        '',
        'Auditoría del currículo · parcial · runtime runsc · instancia auditoria · 4 programas simultáneos',
        'Inicio 2026-11-02 03:00:00 UTC · fin 03:00:09 UTC · 9 s',
        'Programas: 6 · soluciones que aprueban: 2 de 2 · iniciales que fallan como corresponde: 1 de 2 · muestra de la prueba propia: 2 de 2',
        'Hallazgos: 1 · avisos: 1 · sin veredicto: 0',
        'Tiempos (incluyen el arranque del contenedor):',
        '  rust compilar: mediana 0,81 s · máximo 11,00 s · margen mínimo 9,00 s de 20,00 s',
        '  rust ejecutar: mediana 0,03 s · máximo 0,04 s · margen mínimo 9,96 s de 10,00 s',
        'Por lenguaje: rust 2 ejercicios · por sección: lab 2',
        'De registro: no (corrida parcial) · veredicto: rojo',
    ]);
});

it('is a record run only when it is complete, with runsc and with a verdict for every program (FR-014, FR-017)', function (array $languages, string $runtime, bool $noVerdict, bool $record) {
    $report = AuditCases::reportOf($languages, $runtime, $noVerdict);

    expect($report->isRecord())->toBe($record);
})->with([
    'complete with runsc' => [[RunLanguage::Rust, RunLanguage::Go], 'runsc', false, true],
    'complete with runc' => [[RunLanguage::Rust, RunLanguage::Go], 'runc', false, false],
    'one language' => [[RunLanguage::Go], 'runsc', false, false],
    'a program without a verdict' => [[RunLanguage::Rust, RunLanguage::Go], 'runsc', true, false],
]);

it('exits 0 only without findings and without programs without a verdict (FR-017)', function () {
    expect(AuditCases::reportOf([RunLanguage::Rust, RunLanguage::Go], 'runsc', false)->exitCode())->toBe(0)
        ->and(AuditCases::reportOf([RunLanguage::Rust, RunLanguage::Go], 'runsc', true)->exitCode())->toBe(1)
        ->and(AuditCases::exampleReport()->exitCode())->toBe(1);
});

it('says why a run is not a record run, and lists a program without a verdict apart', function () {
    $lines = (new AuditReportText(AuditCases::reportOf([RunLanguage::Rust, RunLanguage::Go], 'runc', true), AuditCases::limits()))->lines();

    expect($lines)->toContain('SIN VEREDICTO · rust-01 (rust, lab, completar) · solución · el ejecutor no devolvió un resultado válido (status:500): es un problema del sandbox, no del contenido')
        ->and($lines[array_key_last($lines)])->toBe('De registro: no (runtime runc: con runc un 137 es la señal 9 y el --pids-limit no se confirma; hay programas sin veredicto) · veredicto: rojo');
});

it('names the failing tests with key and label, keeps a key of digits as text, and gives the signal of an abort', function () {
    $judge = new ProgramJudge(AuditCases::limits());
    $failed = $judge->judge(AuditCases::program(), AuditCases::result(), AuditCases::verdict(RunStatus::Failed, outcomes: [TestOutcome::Pass, TestOutcome::Fail]));
    $aborted = $judge->judge(AuditCases::program(ProgramRole::Starter), AuditCases::result(), AuditCases::verdict(RunStatus::RuntimeError, RunReason::Signal, exitCode: 134));
    $digits = $judge->judge(AuditCases::program(), AuditCases::result(), new Verdict(RunStatus::Failed, null, ExecutorPhase::Run, 0, false, 900, 200, '', '', [new TestVerdict('123', TestOutcome::Fail)], null));
    $report = AuditCases::reportWith([$failed, $aborted, $digits]);
    $lines = (new AuditReportText($report, AuditCases::limits()))->lines();
    $json = json_decode($report->json(), true, 512, JSON_THROW_ON_ERROR);

    expect($lines)->toContain('HALLAZGO · rust-01 (rust, lab, completar) · solución · failed · la solución de referencia no aprueba')
        ->and($lines)->toContain('    pruebas: t2 «Segunda» fail')
        ->and($lines)->toContain('HALLAZGO · rust-01 (rust, lab, completar) · inicial · runtime_error · signal 6 · el código inicial terminó con un error antes de mostrar las pruebas')
        ->and($lines)->toContain('    pruebas: 123 «» fail')
        ->and($json['programs'][2]['tests'][0]['key'])->toBe('123');
});

it('rejects host stamps that are not a commit, yes or no, or an image id (FR-020)', function (array $options, string $message) {
    expect(fn () => HostStamps::fromOptions(...$options))->toThrow(AuditRefused::class, $message);
})->with([
    'a short commit' => [['dd870a9c', null, null, null], '--commit tiene que ser el hash completo de un commit y llegó «dd870a9c».'],
    'a clean tree that is not yes or no' => [[null, 'si', null, null], '--clean-tree admite yes o no y llegó «si».'],
    'an image tag' => [[null, null, 'taller-sandbox-rust:local', null], '--rust-image tiene que ser «sha256:» y 64 hexadecimales y llegó «taller-sandbox-rust:local».'],
]);
```

Sumá a `AuditCases` los dos ayudantes que usa la prueba (con los `use` de `ExecutorReply` y `JudgedProgram`):

```php
    /** @param  list<RunLanguage>  $languages */
    public static function reportOf(array $languages, string $runtime, bool $noVerdict): AuditReport
    {
        $judge = new ProgramJudge(self::limits());
        $programs = [
            $noVerdict
                ? JudgedProgram::noVerdict(self::program(), ExecutorReply::failed('status', 500))
                : $judge->judge(self::program(), self::result(), self::verdict(RunStatus::Passed, outcomes: [TestOutcome::Pass, TestOutcome::Pass])),
            $judge->judge(self::program(ProgramRole::Starter), self::result(), self::verdict(RunStatus::Failed, outcomes: [TestOutcome::Fail, TestOutcome::Fail])),
        ];

        return self::reportWith($programs, $languages, $runtime);
    }

    /**
     * @param  list<JudgedProgram>  $programs
     * @param  list<RunLanguage>  $languages
     */
    public static function reportWith(array $programs, array $languages = [RunLanguage::Rust, RunLanguage::Go], string $runtime = 'runsc'): AuditReport
    {
        $start = CarbonImmutable::parse('2026-11-02T03:00:00.000Z');
        $run = new AuditRun($start, $start->addSeconds(61), $runtime, 'auditoria', 4, new AuditSelection($languages, []), new HostStamps(null, null, null, null));

        return new AuditReport($run, new AuditCatalog(str_repeat('d', 64), str_repeat('e', 64), null, [self::exercise()]), self::limits(), $programs);
    }
```

**Paso 3.** `npm run api:test -- --filter=AuditReportTest`: falla.

**Paso 4, la implementación.**

```php
<?php

namespace App\Audit;

final readonly class HostStamps
{
    private const COMMIT = '/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/';

    private const IMAGE = '/\Asha256:[0-9a-f]{64}\z/';

    public function __construct(public ?string $commit, public ?bool $cleanTree, public ?string $rustImage, public ?string $goImage) {}

    public static function fromOptions(mixed $commit, mixed $cleanTree, mixed $rustImage, mixed $goImage): self
    {
        return new self(
            self::matching($commit, self::COMMIT, '--commit tiene que ser el hash completo de un commit'),
            self::flag($cleanTree),
            self::matching($rustImage, self::IMAGE, '--rust-image tiene que ser «sha256:» y 64 hexadecimales'),
            self::matching($goImage, self::IMAGE, '--go-image tiene que ser «sha256:» y 64 hexadecimales'),
        );
    }

    private static function matching(mixed $value, string $pattern, string $problem): ?string
    {
        if ($value === null) {
            return null;
        }
        $text = is_string($value) ? $value : '';
        if (preg_match($pattern, $text) !== 1) {
            throw AuditRefused::invalidOption("{$problem} y llegó «{$text}».");
        }

        return $text;
    }

    private static function flag(mixed $value): ?bool
    {
        return match ($value) {
            null => null,
            'yes' => true,
            'no' => false,
            default => throw AuditRefused::invalidOption('--clean-tree admite yes o no y llegó «'.(is_string($value) ? $value : '').'».'),
        };
    }
}
```

```php
<?php

namespace App\Audit;

use Carbon\CarbonImmutable;

final readonly class AuditRun
{
    public function __construct(
        public CarbonImmutable $startedAt,
        public CarbonImmutable $finishedAt,
        public string $runtime,
        public string $instance,
        public int $concurrency,
        public AuditSelection $selection,
        public HostStamps $host,
    ) {}
}
```

`AuditReport.php` (el JSON y los números):

```php
<?php

namespace App\Audit;

use Carbon\CarbonImmutable;
use Closure;

final class AuditReport
{
    public const FORMAT = 'taller-curriculum-audit-1';

    /** @param  list<JudgedProgram>  $programs */
    public function __construct(
        private AuditRun $run,
        private AuditCatalog $catalog,
        private AuditLimits $limits,
        private array $programs,
    ) {}

    public function run(): AuditRun
    {
        return $this->run;
    }

    /** @return list<JudgedProgram> */
    public function programs(): array
    {
        return $this->programs;
    }

    public function isGreen(): bool
    {
        $counts = $this->counts();

        return $counts['findings'] === 0 && $counts['noVerdict'] === 0;
    }

    public function isRecord(): bool
    {
        return $this->run->selection->isFull() && $this->run->runtime === 'runsc' && $this->counts()['noVerdict'] === 0;
    }

    public function exitCode(): int
    {
        return $this->isGreen() ? 0 : 1;
    }

    public function durationMs(): int
    {
        return (int) $this->run->startedAt->diffInMilliseconds($this->run->finishedAt);
    }

    /** @return array{programs: int, solutions: int, solutionsPass: int, starters: int, startersFailAsExpected: int, customTestSample: int, customTestSamplePass: int, findings: int, noVerdict: int, warnings: int} */
    public function counts(): array
    {
        $plain = fn (ProgramRole $role): Closure => fn (JudgedProgram $judged): bool => $judged->program->role === $role && $judged->program->customTest === null;
        $sample = fn (JudgedProgram $judged): bool => $judged->program->customTest !== null;
        $is = fn (AuditVerdict $verdict): Closure => fn (JudgedProgram $judged): bool => $judged->audit === $verdict;

        return [
            'programs' => count($this->programs),
            'solutions' => $this->countWhere($plain(ProgramRole::Solution)),
            'solutionsPass' => $this->countWhere(fn (JudgedProgram $judged): bool => $plain(ProgramRole::Solution)($judged) && $is(AuditVerdict::Passes)($judged)),
            'starters' => $this->countWhere($plain(ProgramRole::Starter)),
            'startersFailAsExpected' => $this->countWhere(fn (JudgedProgram $judged): bool => $plain(ProgramRole::Starter)($judged) && $is(AuditVerdict::FailsAsExpected)($judged)),
            'customTestSample' => $this->countWhere($sample),
            'customTestSamplePass' => $this->countWhere(fn (JudgedProgram $judged): bool => $sample($judged) && $is(AuditVerdict::Passes)($judged)),
            'findings' => $this->countWhere($is(AuditVerdict::Finding)),
            'noVerdict' => $this->countWhere($is(AuditVerdict::NoVerdict)),
            'warnings' => $this->countWhere(fn (JudgedProgram $judged): bool => $judged->warning),
        ];
    }

    /** @return array<string, array{exercises: int, programs: int}> */
    public function byLanguage(): array
    {
        $languages = [];
        foreach ($this->run->selection->languages as $language) {
            $languages[$language->value] = [
                'exercises' => count(array_filter($this->audited(), fn (AuditedExercise $exercise): bool => $exercise->snapshot->language === $language)),
                'programs' => $this->countWhere(fn (JudgedProgram $judged): bool => $judged->program->exercise->snapshot->language === $language),
            ];
        }

        return $languages;
    }

    /** @return array<string, array{exercises: int}> */
    public function bySection(): array
    {
        $sections = [];
        foreach ($this->audited() as $exercise) {
            $sections[$exercise->section] = ['exercises' => ($sections[$exercise->section]['exercises'] ?? 0) + 1];
        }

        return $sections;
    }

    /** @return array<string, array{compile: array{programs: int, medianMs: int, maxMs: int, minMarginMs: int, limitMs: int}|null, run: array{programs: int, medianMs: int, maxMs: int, minMarginMs: int, limitMs: int}|null}> */
    public function timing(): array
    {
        $timing = [];
        foreach ($this->run->selection->languages as $language) {
            $compile = [];
            $run = [];
            foreach ($this->programs as $judged) {
                if ($judged->program->exercise->snapshot->language === $language) {
                    $compile[] = $judged->compile?->ms;
                    $run[] = $judged->run?->ms;
                }
            }
            $timing[$language->value] = [
                'compile' => self::stats($compile, $this->limits->compileMs($language)),
                'run' => self::stats($run, $this->limits->runMs),
            ];
        }

        return $timing;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'format' => self::FORMAT,
            'run' => $this->runPart(),
            'stamps' => [
                'commit' => $this->run->host->commit,
                'cleanTree' => $this->run->host->cleanTree,
                'contentSourceCommit' => $this->catalog->sourceCommit,
                'documentHash' => $this->catalog->documentHash,
                'harnessHash' => $this->catalog->harnessHash,
                'images' => ['rust' => $this->run->host->rustImage, 'go' => $this->run->host->goImage],
            ],
            'limits' => [
                'compileMs' => ['rust' => $this->limits->rustCompileMs, 'go' => $this->limits->goCompileMs],
                'runMs' => $this->limits->runMs,
                'compileMemoryMiB' => $this->limits->compileMemoryMiB,
                'runMemoryMiB' => $this->limits->runMemoryMiB,
                'warningRatio' => $this->limits->warningRatio,
            ],
            'totals' => [...$this->counts(), 'byLanguage' => $this->byLanguage(), 'bySection' => $this->bySection(), 'timing' => $this->timing()],
            'programs' => array_map($this->programPart(...), $this->programs),
        ];
    }

    public function json(): string
    {
        return json_encode($this->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
    }

    /** @return array<string, mixed> */
    private function runPart(): array
    {
        $languages = [];
        foreach ($this->run->selection->languages as $language) {
            $languages[] = $language->value;
        }

        return [
            'startedAt' => self::instant($this->run->startedAt),
            'finishedAt' => self::instant($this->run->finishedAt),
            'durationMs' => $this->durationMs(),
            'runtime' => $this->run->runtime,
            'instance' => $this->run->instance,
            'concurrency' => $this->run->concurrency,
            'scope' => $this->run->selection->isFull() ? 'full' : 'partial',
            'selection' => ['languages' => $languages, 'exercises' => $this->run->selection->exercises],
            'record' => $this->isRecord(),
            'verdict' => $this->isGreen() ? 'green' : 'red',
            'exitCode' => $this->exitCode(),
        ];
    }

    /** @return array<string, mixed> */
    private function programPart(JudgedProgram $judged): array
    {
        $program = $judged->program;
        $exercise = $program->exercise;
        $tests = [];
        foreach ($judged->tests as $test) {
            $tests[] = ['key' => $test->key, 'label' => $exercise->labelOf($test->key), 'outcome' => $test->outcome->value];
        }

        return [
            'exercise' => $exercise->id(),
            'language' => $exercise->snapshot->language->value,
            'section' => $exercise->section,
            'domain' => $exercise->domain,
            'kind' => $exercise->kind->value,
            'role' => $program->role->value,
            'gradingHash' => $exercise->snapshot->gradingHash,
            'starterHash' => $exercise->starterHash,
            'programHash' => $program->fingerprint,
            'customTest' => $program->customTest === null ? null : [
                'expression' => $program->customTest->expression,
                'expected' => $program->customTest->expected->value,
                'outcome' => $judged->custom?->value,
            ],
            'status' => $judged->status?->value,
            'reason' => $judged->reason?->value,
            'phase' => $judged->phase?->value,
            'exitCode' => $judged->exitCode,
            'tests' => $tests,
            'compile' => self::timingPart($judged->compile),
            'run' => self::timingPart($judged->run),
            'truncated' => $judged->truncated,
            'oomKilled' => $judged->oomKilled,
            'memoryLimitMiB' => $judged->phase === null ? null : $this->limits->memoryMiB($judged->phase),
            'audit' => $judged->audit->value,
            'finding' => $judged->finding?->value,
            'warning' => $judged->warning,
            'noVerdictCause' => $judged->noVerdictCause,
            'diagnostic' => $judged->diagnostic,
        ];
    }

    /** @return list<AuditedExercise> */
    private function audited(): array
    {
        $audited = [];
        foreach ($this->catalog->exercises as $exercise) {
            if ($this->run->selection->includes($exercise)) {
                $audited[] = $exercise;
            }
        }

        return $audited;
    }

    /** @param  Closure(JudgedProgram): bool  $matches */
    private function countWhere(Closure $matches): int
    {
        return collect($this->programs)->filter($matches)->count();
    }

    /**
     * @param  list<int|null>  $values
     * @return array{programs: int, medianMs: int, maxMs: int, minMarginMs: int, limitMs: int}|null
     */
    private static function stats(array $values, int $limitMs): ?array
    {
        $measured = [];
        foreach ($values as $value) {
            if ($value !== null) {
                $measured[] = $value;
            }
        }
        if ($measured === []) {
            return null;
        }
        sort($measured);
        $count = count($measured);
        $middle = intdiv($count, 2);
        $median = $count % 2 === 1 ? $measured[$middle] : intdiv($measured[$middle - 1] + $measured[$middle], 2);
        $max = $measured[$count - 1];

        return ['programs' => $count, 'medianMs' => $median, 'maxMs' => $max, 'minMarginMs' => $limitMs - $max, 'limitMs' => $limitMs];
    }

    /** @return array{ms: int, limitMs: int, marginMs: int, ratio: float}|null */
    private static function timingPart(?PhaseTiming $timing): ?array
    {
        return $timing === null ? null : ['ms' => $timing->ms, 'limitMs' => $timing->limitMs, 'marginMs' => $timing->marginMs(), 'ratio' => $timing->ratio()];
    }

    private static function instant(CarbonImmutable $at): string
    {
        return $at->utc()->format('Y-m-d\TH:i:s.v\Z');
    }
}
```

`AuditReportText.php` (el texto de data-model.md, «El texto legible», con los segundos en dos decimales):

```php
<?php

namespace App\Audit;

use App\Runs\RunReason;
use App\Runs\TestOutcome;
use LogicException;

final class AuditReportText
{
    public function __construct(private AuditReport $report, private AuditLimits $limits) {}

    /** @return list<string> */
    public function lines(): array
    {
        $lines = [];
        foreach ($this->report->programs() as $judged) {
            if ($judged->audit === AuditVerdict::Finding) {
                $lines = [...$lines, ...$this->findingLines($judged)];
            }
        }
        foreach ($this->report->programs() as $judged) {
            if ($judged->audit === AuditVerdict::NoVerdict) {
                $lines[] = 'SIN VEREDICTO · '.$this->subject($judged).' · el ejecutor no devolvió un resultado válido ('.$judged->noVerdictCause.'): es un problema del sandbox, no del contenido';
            }
        }
        foreach ($this->report->programs() as $judged) {
            if ($judged->warning) {
                $lines = [...$lines, ...$this->warningLines($judged)];
            }
        }
        if ($lines !== []) {
            $lines[] = '';
        }

        return [...$lines, ...$this->summaryLines()];
    }

    private function subject(JudgedProgram $judged): string
    {
        $exercise = $judged->program->exercise;

        return "{$exercise->id()} ({$exercise->snapshot->language->value}, {$exercise->section}, {$exercise->kind->value}) · {$judged->program->role->label()}";
    }

    /** @return list<string> */
    private function findingLines(JudgedProgram $judged): array
    {
        $finding = $judged->finding ?? throw new LogicException('A finding without its kind.');
        $lines = ['HALLAZGO · '.$this->subject($judged).' · '.$this->statusText($judged).' · '.$finding->message()];
        $failing = [];
        foreach ($judged->tests as $test) {
            if ($test->outcome !== TestOutcome::Pass) {
                $failing[] = "{$test->key} «{$judged->program->exercise->labelOf($test->key)}» {$test->outcome->value}";
            }
        }
        if ($failing !== []) {
            $lines[] = '    pruebas: '.implode('; ', $failing);
        }
        if ($finding === FindingKind::CustomTestMismatch && $judged->program->customTest !== null) {
            $lines[] = '    prueba propia: esperada '.$judged->program->customTest->expected->value.', informada '.($judged->custom?->value ?? 'missing');
        }
        if ($judged->diagnostic !== null) {
            $lines[] = '    diagnóstico:';
            foreach (explode("\n", $judged->diagnostic) as $line) {
                $lines[] = '      '.$line;
            }
        }

        return $lines;
    }

    private function statusText(JudgedProgram $judged): string
    {
        $text = $judged->status?->value ?? '';
        if ($judged->reason !== null) {
            $text .= ' · '.$judged->reason->value;
            if ($judged->reason === RunReason::Signal && $judged->exitCode !== null) {
                $text .= ' '.($judged->exitCode - 128);
            }
        }

        return $text;
    }

    /** @return list<string> */
    private function warningLines(JudgedProgram $judged): array
    {
        $lines = [];
        foreach (['compilar' => $judged->compile, 'ejecutar' => $judged->run] as $phase => $timing) {
            if ($timing !== null && $this->limits->isNear($timing)) {
                $percent = (int) round($timing->ratio() * 100);
                $lines[] = 'AVISO · '.$this->subject($judged)." · {$phase} ".self::seconds($timing->ms).' s de '.self::seconds($timing->limitMs)." s ({$percent} %)";
            }
        }

        return $lines;
    }

    /** @return list<string> */
    private function summaryLines(): array
    {
        $run = $this->report->run();
        $counts = $this->report->counts();
        $lines = [
            'Auditoría del currículo · '.($run->selection->isFull() ? 'completa' : 'parcial')." · runtime {$run->runtime} · instancia {$run->instance} · {$run->concurrency} programas simultáneos",
            'Inicio '.$run->startedAt->utc()->format('Y-m-d H:i:s').' UTC · fin '.$run->finishedAt->utc()->format('H:i:s').' UTC · '.self::duration($this->report->durationMs()),
            "Programas: {$counts['programs']} · soluciones que aprueban: {$counts['solutionsPass']} de {$counts['solutions']} · iniciales que fallan como corresponde: {$counts['startersFailAsExpected']} de {$counts['starters']} · muestra de la prueba propia: {$counts['customTestSamplePass']} de {$counts['customTestSample']}",
            "Hallazgos: {$counts['findings']} · avisos: {$counts['warnings']} · sin veredicto: {$counts['noVerdict']}",
            'Tiempos (incluyen el arranque del contenedor):',
        ];
        foreach ($this->report->timing() as $language => $phases) {
            foreach (['compile' => 'compilar', 'run' => 'ejecutar'] as $key => $label) {
                $stats = $phases[$key];
                if ($stats !== null) {
                    $lines[] = "  {$language} {$label}: mediana ".self::seconds($stats['medianMs']).' s · máximo '.self::seconds($stats['maxMs'])
                        .' s · margen mínimo '.self::seconds($stats['minMarginMs']).' s de '.self::seconds($stats['limitMs']).' s';
                }
            }
        }
        $languages = [];
        foreach ($this->report->byLanguage() as $language => $count) {
            $languages[] = "{$language} {$count['exercises']} ejercicios";
        }
        $sections = [];
        foreach ($this->report->bySection() as $section => $count) {
            $sections[] = "{$section} {$count['exercises']}";
        }
        $lines[] = 'Por lenguaje: '.implode(' · ', $languages).' · por sección: '.implode(' · ', $sections);
        $lines[] = 'De registro: '.$this->recordText().' · veredicto: '.($this->report->isGreen() ? 'verde' : 'rojo');

        return $lines;
    }

    private function recordText(): string
    {
        $run = $this->report->run();
        $reasons = [];
        if (! $run->selection->isFull()) {
            $reasons[] = 'corrida parcial';
        }
        if ($run->runtime !== 'runsc') {
            $reasons[] = "runtime {$run->runtime}: con runc un 137 es la señal 9 y el --pids-limit no se confirma";
        }
        if ($this->report->counts()['noVerdict'] > 0) {
            $reasons[] = 'hay programas sin veredicto';
        }

        return $reasons === [] ? 'sí' : 'no ('.implode('; ', $reasons).')';
    }

    private static function seconds(int $ms): string
    {
        return number_format($ms / 1000, 2, ',', '');
    }

    private static function duration(int $ms): string
    {
        $seconds = intdiv($ms, 1000);

        return $seconds < 60 ? "{$seconds} s" : intdiv($seconds, 60).' min '.($seconds % 60).' s';
    }
}
```

**Paso 5.** En verde (las siete pruebas, incluida la igualdad con el ejemplo). Si la igualdad falla, compará campo por campo con el ejemplo: el ejemplo manda (es el contrato), salvo un error de cuenta que el coordinador confirme. Pint y PHPStan. Commits: `test(api): fija el informe contra el ejemplo escrito a mano` y `feat(api): informe en JSON y en texto de la auditoría`. **S2** (con T004 a T008).

### Tarea 1.9 · El comando (T010, P, desde S2)

**Archivos:** crea `backend/api/app/Audit/AuditRunner.php`, `backend/api/app/Console/Commands/AuditCurriculum.php`, `backend/api/tests/Feature/Audit/AuditCommandTest.php` y `backend/api/tests/Unit/Audit/AuditArchTest.php`.

**Interfaz:** `AuditRunner::__construct(ExecutorDispatcher $dispatcher, ResultClassifier $classifier)`; `run(list<AuditProgram> $programs, int $concurrency, AuditLimits $limits, Closure(int, int): void $progress): list<JudgedProgram>`. El comando y sus opciones, en [contracts/audit-command.md](./contracts/audit-command.md).

**Paso 1, las pruebas en rojo.** `AuditCommandTest.php`:

```php
<?php

use App\Runs\Admission\ExerciseReader;
use App\Runs\Program\ProgramComposer;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Sleep;
use Tests\Support\AuditExecutorDouble;
use Tests\Support\AuditWorld;
use Tests\Support\ContentDatabase;

beforeEach(function () {
    $this->reports = sys_get_temp_dir().'/taller-audit-'.bin2hex(random_bytes(4));
    File::ensureDirectoryExists($this->reports);
    config(['audit.report_directory' => $this->reports, 'runs.executor.runtime' => 'runsc']);
    Sleep::fake();
});

afterEach(fn () => File::deleteDirectory($this->reports));

it('audits every active exercise twice and the sample, exits 0 and writes a record report (US1, FR-001, FR-017)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('Auditados 12 de 12 programas…')
        ->expectsOutputToContain('Programas: 12 · soluciones que aprueban: 4 de 4 · iniciales que fallan como corresponde: 4 de 4 · muestra de la prueba propia: 4 de 4')
        ->expectsOutputToContain('De registro: sí · veredicto: verde')
        ->assertExitCode(0);

    $report = json_decode((string) file_get_contents("{$this->reports}/report.json"), true, 512, JSON_THROW_ON_ERROR);
    expect($report['run']['record'])->toBeTrue()
        ->and($report['run']['verdict'])->toBe('green')
        ->and($report['totals']['byLanguage'])->toBe(['rust' => ['exercises' => 2, 'programs' => 6], 'go' => ['exercises' => 2, 'programs' => 6]])
        ->and($report['totals']['bySection'])->toBe(['lab' => ['exercises' => 3], 'quests' => ['exercises' => 1]])
        ->and(file_exists("{$this->reports}/report.txt"))->toBeTrue();
});

it('decides each case of the table of the spec and exits as the spec says (SC-002)', function (string $marker, Closure $behavior, string $exercise, string $role, string $audit, ?string $finding, int $exitCode, string $line) {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept([$marker => $behavior]));

    $this->artisan('curriculum:audit')->expectsOutputToContain($line)->assertExitCode($exitCode);

    $report = json_decode((string) file_get_contents("{$this->reports}/report.json"), true, 512, JSON_THROW_ON_ERROR);
    $program = collect($report['programs'])->first(fn (array $entry) => $entry['exercise'] === $exercise && $entry['role'] === $role && $entry['customTest'] === null);
    expect($program['audit'])->toBe($audit)->and($program['finding'])->toBe($finding);
})->with([
    'a solution that fails a test' => ['solution_rust_01', fn () => AuditExecutorDouble::fails('t2'), 'rust-01', 'solution', 'finding', 'solution_not_passed', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · solución · failed · la solución de referencia no aprueba'],
    'a solution that does not compile' => ['solution_go_01', fn () => AuditExecutorDouble::compileError(), 'go-01', 'solution', 'finding', 'solution_not_passed', 1, 'HALLAZGO · go-01 (go, lab, completar) · solución · compile_error · la solución de referencia no aprueba'],
    'a starter that passes' => ['starter_rust_01', fn () => AuditExecutorDouble::passes(), 'rust-01', 'starter', 'finding', 'starter_passed', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · passed · las pruebas no detectan el código inicial'],
    'a completar starter that does not compile' => ['starter_go_01', fn () => AuditExecutorDouble::compileError(), 'go-01', 'starter', 'finding', 'starter_compile_error', 1, 'HALLAZGO · go-01 (go, lab, completar) · inicial · compile_error · el código inicial no compila y el ejercicio no es de reparar'],
    'a reparar starter that does not compile' => ['starter_go_02', fn () => AuditExecutorDouble::compileError(), 'go-02', 'starter', 'fails_as_expected', null, 0, 'De registro: sí · veredicto: verde'],
    'an abort' => ['starter_rust_01', fn () => AuditExecutorDouble::exits(134), 'rust-01', 'starter', 'finding', 'starter_runtime_error', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · runtime_error · signal 6 · el código inicial terminó con un error antes de mostrar las pruebas'],
    'a timeout' => ['starter_rust_01', fn () => AuditExecutorDouble::timesOut(), 'rust-01', 'starter', 'finding', 'limit_exceeded', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · timeout · agotó un límite del sandbox'],
    'invalid evidence' => ['starter_rust_01', fn () => AuditExecutorDouble::exits(0), 'rust-01', 'starter', 'finding', 'starter_failed_without_tests', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · failed · evidence_invalid · el código inicial falló sin que las pruebas lo dijeran'],
    'output cut before the markers' => ['starter_rust_01', fn () => AuditExecutorDouble::cutsOutput(), 'rust-01', 'starter', 'finding', 'starter_failed_without_tests', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · failed · output_limit · el código inicial falló sin que las pruebas lo dijeran'],
    'the pids limit with runsc' => ['starter_rust_01', fn () => AuditExecutorDouble::exits(137), 'rust-01', 'starter', 'finding', 'limit_exceeded', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · runtime_error · pids_limit · agotó un límite del sandbox'],
    'a 500 of the executor' => ['solution_rust_01', fn () => AuditExecutorDouble::status(500), 'rust-01', 'solution', 'no_verdict', null, 1, 'SIN VEREDICTO · rust-01 (rust, lab, completar) · solución · el ejecutor no devolvió un resultado válido (status:500): es un problema del sandbox, no del contenido'],
]);

it('names the failing tests with key and label and the first lines of the diagnostic (US2, FR-018)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['solution_rust_01' => AuditExecutorDouble::fails('t2', "thread 'main' panicked at src/main.rs:3:5\n")]));

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('    pruebas: t2 «Prueba t2» fail')
        ->expectsOutputToContain('    diagnóstico:')
        ->expectsOutputToContain("      thread 'main' panicked at src/main.rs:3:5")
        ->assertExitCode(1);
});

it('runs only the chosen exercise as a partial run that is never a record run (FR-015)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());

    $this->artisan('curriculum:audit', ['--exercise' => ['rust-02']])
        ->expectsOutputToContain('De registro: no (corrida parcial) · veredicto: verde')
        ->assertExitCode(0);

    Http::assertSentCount(4);
});

it('is not a record run with runc, where a 137 is the signal 9 (FR-014)', function () {
    AuditWorld::curriculum();
    config(['runs.executor.runtime' => 'runc']);
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['starter_rust_01' => AuditExecutorDouble::exits(137)]));

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('HALLAZGO · rust-01 (rust, lab, completar) · inicial · runtime_error · signal 9 · el código inicial terminó con un error antes de mostrar las pruebas')
        ->expectsOutputToContain('De registro: no (runtime runc: con runc un 137 es la señal 9 y el --pids-limit no se confirma) · veredicto: rojo')
        ->assertExitCode(1);
});

it('reports the custom test apart and keeps the verdict passed (FR-034, SC-007)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());

    $this->artisan('curriculum:audit')->assertExitCode(0);

    $report = json_decode((string) file_get_contents("{$this->reports}/report.json"), true, 512, JSON_THROW_ON_ERROR);
    $sample = collect($report['programs'])->filter(fn (array $entry) => $entry['customTest'] !== null)->values()->all();
    expect(array_map(fn (array $entry) => [$entry['exercise'], $entry['status'], $entry['customTest']['outcome'], $entry['audit']], $sample))->toBe([
        ['rust-01', 'passed', 'pass', 'passes'],
        ['rust-01', 'passed', 'fail', 'passes'],
        ['go-01', 'passed', 'pass', 'passes'],
        ['go-01', 'passed', 'fail', 'passes'],
    ]);
});

it('flags a custom test reported otherwise than the sample expects', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['energia(5) == 35' => AuditExecutorDouble::passes('FAIL')]));

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('HALLAZGO · rust-01 (rust, lab, completar) · solución · passed · la prueba propia no se informó como se esperaba')
        ->expectsOutputToContain('    prueba propia: esperada pass, informada fail')
        ->assertExitCode(1);
});

it('warns above half of a limit without failing (Q4, FR-022)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['solution_go_01' => AuditExecutorDouble::passes(compileMs: 7600)]));

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('AVISO · go-01 (go, lab, completar) · solución · compilar 7,60 s de 15,00 s (51 %)')
        ->expectsOutputToContain('Hallazgos: 0 · avisos: 1 · sin veredicto: 0')
        ->assertExitCode(0);
});

it('audits a program again after the executor was busy (FR-008)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['solution_rust_01' => AuditExecutorDouble::busyThen(AuditExecutorDouble::passes())]));

    $this->artisan('curriculum:audit')->assertExitCode(0);

    Sleep::assertSequence([Sleep::for(2)->seconds()]);
});

it('sends the program B2 would build, with a fresh nonce for each one (US1)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());

    $this->artisan('curriculum:audit')->assertExitCode(0);

    $sent = [];
    foreach (Http::recorded() as [$request]) {
        if ($request->url() === AuditExecutorDouble::URL.'/v1/run' && ($request->data()['program'] ?? '') !== '') {
            $sent[] = $request->data()['program'];
        }
    }
    $nonces = array_map(fn (string $program) => preg_match('/__TALLER_END__([0-9a-f]{32})/', $program, $match) === 1 ? $match[1] : '', $sent);
    $solution = collect($sent)->first(fn (string $program) => str_contains($program, 'solution_go_01') && ! str_contains($program, 'Bytes(2)'));
    preg_match('/__TALLER_END__([0-9a-f]{32})/', (string) $solution, $match);
    $b2 = app(ProgramComposer::class)->compose(app(ExerciseReader::class)->forRun('go-01') ?? throw new LogicException('missing'), AuditWorld::code('go-01', 'solution'), null, $match[1]);

    expect($sent)->toHaveCount(12)
        ->and(array_unique($nonces))->toHaveCount(12)
        ->and($solution)->toBe($b2->text);
});

it('stamps the host values it receives and the content it audited (FR-020)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());
    $rust = 'sha256:'.str_repeat('1', 64);
    $go = 'sha256:'.str_repeat('2', 64);

    $this->artisan('curriculum:audit', [
        '--commit' => str_repeat('c', 40), '--clean-tree' => 'yes', '--rust-image' => $rust, '--go-image' => $go,
    ])->assertExitCode(0);

    $report = json_decode((string) file_get_contents("{$this->reports}/report.json"), true, 512, JSON_THROW_ON_ERROR);
    expect($report['stamps'])->toBe([
        'commit' => str_repeat('c', 40),
        'cleanTree' => true,
        'contentSourceCommit' => null,
        'documentHash' => AuditWorld::imageDocumentHash(),
        'harnessHash' => AuditWorld::HARNESS_HASH,
        'images' => ['rust' => $rust, 'go' => $go],
    ])->and($report['run']['instance'])->toBe('auditoria')
        ->and($report['run']['concurrency'])->toBe(4);
});

it('writes nothing to the database and pushes no job (FR-012, SC-003)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());
    Queue::fake();
    $tables = ['runs', 'attempts', 'attempt_tests', 'attempt_payloads', 'progress_heads', 'exercise_progress', 'jobs'];
    $count = fn () => [...collect($tables)->mapWithKeys(fn (string $table) => [$table => DB::table($table)->count()])->all(), ...ContentDatabase::counts()];
    $before = $count();

    $statements = ContentDatabase::queriesDuring(fn () => $this->artisan('curriculum:audit')->assertExitCode(0)->run());

    expect(collect($statements)->filter(fn (string $sql) => preg_match('/^\s*(insert|update|delete|replace|truncate)\b/i', $sql) === 1)->values()->all())->toBe([])
        ->and($count())->toBe($before);
    Queue::assertNothingPushed();
});

it('refuses to start, says why and runs nothing (FR-013)', function (string $situation, array $options, string $message) {
    AuditExecutorDouble::fake([]);
    if ($situation !== 'nothing imported') {
        AuditWorld::curriculum();
    }
    match ($situation) {
        'another build' => DB::table('content_imports')->update(['document_hash' => str_repeat('b', 64)]),
        'too much concurrency' => config(['audit.concurrency' => 9]),
        'no report directory' => config(['audit.report_directory' => $this->reports.'/missing']),
        'a rejected token' => config(['runs.executor.token' => str_repeat('x', 40)]),
        default => null,
    };

    $this->artisan('curriculum:audit', $options)->expectsOutputToContain($message)->assertExitCode(2);

    Http::assertNotSent(fn (Request $request) => ($request->data()['program'] ?? '') !== '');
})->with([
    'nothing imported' => ['nothing imported', [], 'No hay contenido importado'],
    'the import of another build' => ['another build', [], 'El contenido importado (bbbbbbbbbbbb) no es el de esta imagen'],
    'an unknown exercise' => ['ready', ['--exercise' => ['rust-99']], 'rust-99 no es un ejercicio activo de rust y go.'],
    'an unknown language' => ['ready', ['--language' => 'kotlin'], '--language admite rust o go y llegó «kotlin».'],
    'a short commit' => ['ready', ['--commit' => 'abc'], '--commit tiene que ser el hash completo de un commit y llegó «abc».'],
    'a concurrency out of range' => ['too much concurrency', [], 'AUDIT_CONCURRENCY tiene que estar entre 1 y 8 y es 9.'],
    'no report directory' => ['no report directory', [], 'No puedo escribir el informe en'],
    'a rejected token' => ['a rejected token', [], 'El ejecutor de auditoría rechazó el token (401)'],
]);
        AuditExecutorDouble::fake([]);
    }, [], 'El contenido importado (bbbbbbbbbbbb) no es el de esta imagen'],
    'an unknown exercise' => [function () {
        AuditWorld::curriculum();
        AuditExecutorDouble::fake([]);
    }, ['--exercise' => ['rust-99']], 'rust-99 no es un ejercicio activo de rust y go.'],
    'an unknown language' => [fn () => AuditExecutorDouble::fake([]), ['--language' => 'kotlin'], '--language admite rust o go y llegó «kotlin».'],
    'a short commit' => [fn () => AuditExecutorDouble::fake([]), ['--commit' => 'abc'], '--commit tiene que ser el hash completo de un commit y llegó «abc».'],
    'a concurrency out of range' => [function () {
        AuditExecutorDouble::fake([]);
        config(['audit.concurrency' => 9]);
    }, [], 'AUDIT_CONCURRENCY tiene que estar entre 1 y 8 y es 9.'],
    'no report directory' => [function ($test) {
        AuditExecutorDouble::fake([]);
        config(['audit.report_directory' => $test->reports.'/missing']);
    }, [], 'No puedo escribir el informe en'],
    'a rejected token' => [function () {
        AuditWorld::curriculum();
        AuditExecutorDouble::fake([]);
        config(['runs.executor.token' => str_repeat('x', 40)]);
    }, [], 'El ejecutor de auditoría rechazó el token (401)'],
]);
```

`AuditArchTest.php`:

```php
<?php

use App\Audit\AuditCatalog;
use App\Audit\AuditPlan;
use App\Audit\AuditProgram;
use App\Audit\AuditReport;
use App\Audit\AuditReportText;
use App\Audit\AuditRun;
use App\Audit\AuditSelection;
use App\Audit\AuditedExercise;
use App\Audit\Diagnostic;
use App\Audit\HostStamps;
use App\Audit\JudgedProgram;
use App\Audit\PhaseTiming;
use App\Audit\ProgramJudge;
use App\Console\Commands\AuditCurriculum;
use App\Runs\Admission\RunAdmission;
use App\Runs\Execution\ProgressWriter;
use App\Runs\Execution\RunClaimer;
use App\Runs\Execution\RunCloser;
use App\Runs\Execution\RunStore;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;

arch('the audit does not admit, queue, claim, close or write progress (FR-012)')
    ->expect(['App\Audit', AuditCurriculum::class])
    ->not->toUse([Queue::class, Bus::class, 'App\Jobs', 'App\Progress', RunAdmission::class, RunStore::class, RunClaimer::class, RunCloser::class, ProgressWriter::class]);

arch('the plan, the rule and the report touch no database, HTTP client, queue, log or cache')
    ->expect([AuditCatalog::class, AuditedExercise::class, AuditProgram::class, AuditSelection::class, AuditPlan::class, PhaseTiming::class, Diagnostic::class, JudgedProgram::class, ProgramJudge::class, HostStamps::class, AuditRun::class, AuditReport::class, AuditReportText::class])
    ->not->toUse([DB::class, Http::class, Queue::class, Log::class, Cache::class, 'Illuminate\Database']);
```

**Paso 2.** `npm run api:test -- --filter='AuditCommandTest|AuditArchTest'`: fallan (el comando no existe).

**Paso 3, la implementación.**

```php
<?php

namespace App\Audit;

use App\Runs\Evidence\ExpectedEvidence;
use App\Runs\Evidence\ResultClassifier;
use App\Runs\Execution\ExecutorReply;
use App\Runs\Execution\ReplyKind;
use Closure;

final class AuditRunner
{
    public function __construct(private ExecutorDispatcher $dispatcher, private ResultClassifier $classifier) {}

    /**
     * @param  list<AuditProgram>  $programs
     * @param  Closure(int, int): void  $progress
     * @return list<JudgedProgram>
     */
    public function run(array $programs, int $concurrency, AuditLimits $limits, Closure $progress): array
    {
        $judge = new ProgramJudge($limits);
        $judged = [];
        foreach (array_chunk($programs, $concurrency * config()->integer('audit.batch_per_slot')) as $batch) {
            $keyed = [];
            foreach ($batch as $program) {
                $keyed['p'.(count($judged) + count($keyed))] = $program;
            }
            $replies = $this->dispatcher->dispatch($keyed, $concurrency);
            foreach ($keyed as $key => $program) {
                $judged[] = $this->judge($judge, $program, $replies[$key] ?? ExecutorReply::failed('unavailable', null));
            }
            $progress(count($judged), count($programs));
        }

        return $judged;
    }

    private function judge(ProgramJudge $judge, AuditProgram $program, ExecutorReply $reply): JudgedProgram
    {
        if ($reply->kind !== ReplyKind::Result || $reply->result === null) {
            return JudgedProgram::noVerdict($program, $reply);
        }
        $composed = $program->composed;
        $verdict = $this->classifier->classify($reply->result, new ExpectedEvidence($composed->nonce, $composed->expectedTests, $composed->hasCustomTest));

        return $judge->judge($program, $reply->result, $verdict);
    }
}
```

```php
<?php

namespace App\Console\Commands;

use App\Audit\AuditCatalogReader;
use App\Audit\AuditLimits;
use App\Audit\AuditLock;
use App\Audit\AuditPlan;
use App\Audit\AuditRefused;
use App\Audit\AuditReport;
use App\Audit\AuditReportText;
use App\Audit\AuditRun;
use App\Audit\AuditRunner;
use App\Audit\AuditSelection;
use App\Audit\ExecutorPreflight;
use App\Audit\HostStamps;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

final class AuditCurriculum extends Command
{
    protected $signature = 'curriculum:audit
        {--language= : rust o go; sin él, los dos}
        {--exercise=* : un ejercicio activo; se puede repetir}
        {--commit= : el commit del host}
        {--clean-tree= : yes o no}
        {--rust-image= : el identificador de taller-sandbox-rust:local}
        {--go-image= : el identificador de taller-sandbox-go:local}';

    protected $description = 'Audita el currículo en el sandbox propio: las soluciones aprueban y los iniciales fallan (B3)';

    public function handle(AuditLock $lock, AuditCatalogReader $reader, AuditPlan $plan, ExecutorPreflight $preflight, AuditRunner $runner): int
    {
        try {
            $selection = AuditSelection::fromOptions($this->languageOption(), $this->exerciseOption());
            $host = HostStamps::fromOptions($this->option('commit'), $this->option('clean-tree'), $this->option('rust-image'), $this->option('go-image'));
            $concurrency = $this->concurrency();
            $directory = $this->reportDirectory();
            $lock->acquire();
        } catch (AuditRefused $refused) {
            return $this->refuse($refused);
        }
        try {
            $catalog = $reader->read();
            $selection->requireKnown($catalog);
            $programs = $plan->programs($catalog, $selection);
            $preflight->check();
            $limits = AuditLimits::fromConfig();
            $startedAt = CarbonImmutable::now();
            $judged = $runner->run($programs, $concurrency, $limits, fn (int $done, int $total) => $this->line("Auditados {$done} de {$total} programas…"));
            $run = new AuditRun($startedAt, CarbonImmutable::now(), config()->string('runs.executor.runtime'), config()->string('audit.instance'), $concurrency, $selection, $host);

            return $this->publish(new AuditReport($run, $catalog, $limits, $judged), $limits, $directory);
        } catch (AuditRefused $refused) {
            return $this->refuse($refused);
        } finally {
            $lock->release();
        }
    }

    private function languageOption(): ?string
    {
        $language = $this->option('language');

        return is_string($language) ? $language : null;
    }

    /** @return list<string> */
    private function exerciseOption(): array
    {
        $ids = [];
        $values = $this->option('exercise');
        foreach (is_array($values) ? $values : [] as $id) {
            if (is_string($id)) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    private function concurrency(): int
    {
        $concurrency = config()->integer('audit.concurrency');
        if ($concurrency < 1 || $concurrency > 8) {
            throw AuditRefused::concurrency($concurrency);
        }

        return $concurrency;
    }

    private function reportDirectory(): string
    {
        $directory = config()->string('audit.report_directory');
        if (! is_dir($directory) || ! is_writable($directory)) {
            throw AuditRefused::reportNotWritable($directory);
        }

        return $directory;
    }

    private function publish(AuditReport $report, AuditLimits $limits, string $directory): int
    {
        $lines = (new AuditReportText($report, $limits))->lines();
        file_put_contents("{$directory}/report.json", $report->json());
        file_put_contents("{$directory}/report.txt", implode("\n", $lines)."\n");
        foreach ($lines as $line) {
            $this->line($line);
        }

        return $report->exitCode();
    }

    private function refuse(AuditRefused $refused): int
    {
        $this->error($refused->getMessage());

        return self::INVALID;
    }
}
```

**Paso 4.** `npm run api:test` completo en verde (la suite entera, no sólo lo nuevo), `npm run api:format:check`, `npm run api:analyse`. Si `expectsOutputToContain` no ve una línea, revisá que salga por `line()` y no por `info()`. Commits: `test(api): fija el comando de la auditoría de punta a punta` y `feat(api): comando curriculum:audit`.

## 2. Los checks estáticos y la CI (dueño Q, onda 1)

**Cubre:** FR-027, FR-028 (como documentación de la superficie), FR-032, FR-036 y FR-038; SC-004 (las huellas del documento y de la plantilla), SC-006 y SC-009.

### Tarea 2.1 · El check del caché de Go (T011, Q)

**Archivos:** crea `qa/lib/go-warm-cache.ts` y `qa/go-warm-cache-check.ts`; cambia `qa/run-checks.ts` (suma `'go-warm-cache-check.ts'` al final de `operationChecks`, porque lee `backend/`).

**Interfaz:**

```ts
export interface GoExerciseImports { id: string; imports: readonly string[] }
export interface MissingWarmPackage { exercise: string; package: string }
export function warmPackages(source: string): string[];
export function missingWarmPackages(exercises: readonly GoExerciseImports[], warm: readonly string[]): MissingWarmPackage[];
export function describeMissing(missing: MissingWarmPackage): string;
```

**Paso 1, la prueba en rojo.** `qa/go-warm-cache-check.ts` (los valores esperados son los mensajes de este plan y lo medido en research.md):

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadCurriculum } from '../tools/content/load-curriculum.ts';
import { scenarios } from './lib/content-fixtures.ts';
import {
  describeMissing,
  missingWarmPackages,
  warmPackages,
  type GoExerciseImports,
} from './lib/go-warm-cache.ts';
import { repoRoot } from './lib/sources.ts';

const { test, done } = scenarios('go-warm-cache');

const warmSource = readFileSync(
  path.join(repoRoot, 'backend/executor/images/go/warm/main.go'),
  'utf8',
);
const curriculum = loadCurriculum(repoRoot);
const goExercises: GoExerciseImports[] = [
  ...curriculum.lab.go,
  ...curriculum.quests.go,
  ...Object.values(curriculum.cores).flat(),
]
  .filter((exercise) => exercise.language === 'go')
  .map((exercise) => ({ id: String(exercise.id), imports: exercise.imports as string[] }));

test('reads the blank and the plain imports of warm/main.go', () => {
  assert.deepEqual(warmPackages('package main\n\nimport (\n\t_ "bufio"\n\t"fmt"\n)\n'), [
    'bufio',
    'fmt',
  ]);
});

test('every package that a Go exercise imports is in the warm cache today (SC-006)', () => {
  assert.deepEqual(missingWarmPackages(goExercises, warmPackages(warmSource)).map(describeMissing), []);
  const withImports = goExercises.filter((exercise) => exercise.imports.length > 0);
  const packages = new Set(withImports.flatMap((exercise) => exercise.imports));
  console.log(`  ${packages.size} paquetes en ${withImports.length} ejercicios de Go, todos en el caché`);
});

test('a package missing from the list fails with the exercise and the package', () => {
  const missing = missingWarmPackages([{ id: 'go-69', imports: ['net/http', 'strings'] }], ['strings']);
  assert.deepEqual(missing.map(describeMissing), [
    'go-69 importa net/http, que no está en backend/executor/images/go/warm/main.go: sumalo a la lista y reconstruí la imagen de Go con «docker compose --profile sandbox-images build».',
  ]);
});

test('a new import of an exercise that the list lacks fails', () => {
  const exercises = [...goExercises, { id: 'go-999', imports: ['net/url'] }];
  assert.deepEqual(missingWarmPackages(exercises, warmPackages(warmSource)), [
    { exercise: 'go-999', package: 'net/url' },
  ]);
});

test('a package of the list that no exercise imports is not an error', () => {
  assert.deepEqual(missingWarmPackages([{ id: 'go-01', imports: [] }], ['net/http']), []);
});

test('fmt needs no entry: the harness imports it', () => {
  assert.deepEqual(missingWarmPackages([{ id: 'go-01', imports: ['fmt'] }], []), []);
});

test('a warm/main.go without an import block is reported', () => {
  assert.throws(() => warmPackages('package main\n'), /falta el bloque «import \( … \)»/);
});

done();
```

**Paso 2.** `npm run curriculum && node qa/go-warm-cache-check.ts`: falla porque `qa/lib/go-warm-cache.ts` no existe.

**Paso 3, la implementación.** `qa/lib/go-warm-cache.ts`:

```ts
export interface GoExerciseImports {
  id: string;
  imports: readonly string[];
}

export interface MissingWarmPackage {
  exercise: string;
  package: string;
}

const IMPORT_BLOCK = /^import \(\n([\s\S]*?)^\)/m;
const IMPORT_LINE = /^(?:_\s+)?"([^"]+)"$/;

export function warmPackages(source: string): string[] {
  const block = IMPORT_BLOCK.exec(source);
  if (!block) throw new Error('warm/main.go: falta el bloque «import ( … )»');
  return block[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const match = IMPORT_LINE.exec(line);
      if (!match) throw new Error(`warm/main.go: la línea «${line}» no es un import`);
      return match[1];
    });
}

export function missingWarmPackages(
  exercises: readonly GoExerciseImports[],
  warm: readonly string[],
): MissingWarmPackage[] {
  const available = new Set(['fmt', ...warm]);
  return exercises.flatMap((exercise) =>
    exercise.imports
      .filter((name) => !available.has(name))
      .map((name) => ({ exercise: exercise.id, package: name })),
  );
}

export function describeMissing(missing: MissingWarmPackage): string {
  return `${missing.exercise} importa ${missing.package}, que no está en backend/executor/images/go/warm/main.go: sumalo a la lista y reconstruí la imagen de Go con «docker compose --profile sandbox-images build».`;
}
```

**Paso 4.** `node qa/go-warm-cache-check.ts` en verde, con la línea «26 paquetes en 49 ejercicios de Go». Probá a mano los dos negativos de SC-006 y deshacelos: sacá `_ "net/http"` de `warm/main.go` (falla nombrando `go-69` y `net/http`) y agregá `net/url` a los `imports` de `content/go/exercises/go-01/exercise.yaml` con `npm run curriculum` (falla nombrando `go-01` y `net/url`). Sumá el check a `qa/run-checks.ts`; `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`. Commits: `test(qa): fija el check del caché precalentado de Go` y `feat(qa): el caché de Go cubre los imports del currículo`.

### Tarea 2.2 · La superficie, el resumen y su check (T012, Q)

**Archivos:** crea `qa/lib/audit-surface.ts`, `qa/lib/audit-summary.ts`, `qa/lib/content-stamps.ts` y `qa/audit-summary-check.ts`; cambia `qa/run-checks.ts` (suma `'audit-summary-check.ts'` al final de `webChecks`: no lee `backend/`).

**Interfaz:** la de [contracts/audit-summary.md](./contracts/audit-summary.md): `AUDITED_SURFACE`, `auditedPaths(paths)`, `REPORT_FORMAT`, `SUMMARY_FORMAT`, `SUMMARY_KEYS`, `AuditReportJson`, `AuditSummary`, `formatAuditSummary(report)`, `parseAuditSummary(body)`, `evaluateAuditGate(input)` y `currentContentStamps(root)`.

**Paso 1, la prueba en rojo.** `qa/audit-summary-check.ts`, con los catorce escenarios del contrato. Los mensajes esperados son los del contrato, escritos a mano:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { auditedPaths } from './lib/audit-surface.ts';
import {
  evaluateAuditGate,
  formatAuditSummary,
  parseAuditSummary,
  type AuditReportJson,
} from './lib/audit-summary.ts';
import { currentContentStamps } from './lib/content-stamps.ts';
import { scenarios } from './lib/content-fixtures.ts';
import { repoRoot } from './lib/sources.ts';

const { test, done } = scenarios('audit-summary');

const example = JSON.parse(
  readFileSync(path.join(repoRoot, 'qa/fixtures/shared/audit-report-example.json'), 'utf8'),
) as AuditReportJson;
const DOCUMENT = example.stamps.documentHash;
const HARNESS = example.stamps.harnessHash;
const HEAD = 'dd870a9ccb7cb50b8b06b584bcf988acaccbf22e';
const CONTENT_CHANGE = ['content/rust/exercises/rust-01/exercise.yaml'];

interface ReportChanges {
  record?: boolean;
  scope?: string;
  verdict?: string;
  runtime?: string;
  findings?: number;
  documentHash?: string;
  harnessHash?: string;
}

function recordReport(changes: ReportChanges = {}): AuditReportJson {
  return {
    ...example,
    run: {
      ...example.run,
      record: changes.record ?? true,
      scope: changes.scope ?? 'full',
      verdict: changes.verdict ?? 'green',
      runtime: changes.runtime ?? 'runsc',
    },
    stamps: {
      ...example.stamps,
      documentHash: changes.documentHash ?? DOCUMENT,
      harnessHash: changes.harnessHash ?? HARNESS,
    },
    totals: { ...example.totals, findings: changes.findings ?? 0, noVerdict: 0 },
  };
}

function gate(body: string, changedPaths: readonly string[] = CONTENT_CHANGE) {
  return evaluateAuditGate({
    body,
    changedPaths,
    expected: { documentHash: DOCUMENT, harnessHash: HARNESS },
    headSha: HEAD,
  });
}

test('1. fails without a summary when the PR touches the audited surface', () => {
  const result = gate('Arregla rust-01.');
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    'Falta el resumen de la auditoría: el PR toca la superficie auditada (content/rust/exercises/rust-01/exercise.yaml). Corré npm run api:audit sobre el último commit, con el árbol limpio, y pegá en la descripción el bloque que imprime.',
  ]);
});

test('2. fails when the document hash is not the one of the head', () => {
  const result = gate(formatAuditSummary(recordReport({ documentHash: 'f'.repeat(64) })));
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    `La huella del documento no coincide: esperada ${DOCUMENT} (cabeza del PR), recibida ${'f'.repeat(64)}. Volvé a auditar después del último cambio de contenido.`,
  ]);
});

test('3. fails when the verdict is red', () => {
  const result = gate(formatAuditSummary(recordReport({ verdict: 'red', findings: 1 })));
  assert.deepEqual(result.errors, [
    'El veredicto está en rojo (verdict: red, findings: 1, noVerdict: 0): corregí los hallazgos y volvé a auditar.',
  ]);
});

test('4. fails when the run is not a record run', () => {
  const result = gate(formatAuditSummary(recordReport({ record: false, scope: 'partial' })));
  assert.deepEqual(result.errors, [
    'La corrida no es de registro (record: false): tiene que ser completa, con runsc y sin programas sin veredicto.',
    'La corrida es parcial (scope: partial): la de registro audita los dos lenguajes enteros.',
  ]);
});

test('5. passes without a summary when the PR does not touch the audited surface', () => {
  const result = gate('Sólo textos.', ['content/atlas/rust/x.yaml', 'README.md']);
  assert.equal(result.ok, true);
  assert.equal(result.applies, false);
  assert.deepEqual(result.notes, [
    'El PR no toca la superficie auditada (qa/lib/audit-surface.ts): no hace falta el resumen.',
  ]);
});

test('6. passes with a valid summary and leaves a note for the reviewer', () => {
  const result = gate(`Descripción del PR.\n\n${formatAuditSummary(recordReport())}`);
  assert.equal(result.ok, true);
  assert.deepEqual(result.notes, [
    `Para quien revisa: commit ${HEAD} (cabeza del PR: ${HEAD}); árbol limpio: sí; imágenes: rust ${example.stamps.images.rust}, go ${example.stamps.images.go}.`,
  ]);
});

test('7. reads a summary edited on the web: CRLF and two spaces of indentation', () => {
  const pasted = formatAuditSummary(recordReport())
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\r\n');
  assert.equal(gate(pasted).ok, true);
});

test('8. fails with two summaries', () => {
  const block = formatAuditSummary(recordReport());
  assert.deepEqual(gate(`${block}\n${block}`).errors, [
    'El resumen no tiene el formato taller-audit-summary-1: hay 2 bloques taller-audit-summary; dejá uno solo.',
  ]);
});

test('9. fails when the harness hash is not the one of the head', () => {
  const result = gate(formatAuditSummary(recordReport({ harnessHash: '0'.repeat(64) })));
  assert.deepEqual(result.errors, [
    `La huella de la plantilla (portions.harness) no coincide: esperada ${HARNESS} (cabeza del PR), recibida ${'0'.repeat(64)}. Volvé a auditar después del último cambio de la plantilla.`,
  ]);
});

test('10. fails when the run used runc', () => {
  const result = gate(formatAuditSummary(recordReport({ runtime: 'runc' })));
  assert.deepEqual(result.errors, ['La corrida usó runc: la de registro corre con runsc.']);
});

test('11. names a missing key and an unknown key', () => {
  const body = formatAuditSummary(recordReport())
    .replace(/^warnings: .*$/m, 'avisos: 0');
  assert.deepEqual(gate(body).errors, [
    'El resumen no tiene el formato taller-audit-summary-1: avisos no es una clave del formato.',
    'El resumen no tiene el formato taller-audit-summary-1: falta warnings.',
  ]);
});

test('12. ignores the Go tests of the executor and counts a deleted content file', () => {
  assert.deepEqual(
    auditedPaths([
      'backend/executor/internal/sandbox/args_test.go',
      'content/go/exercises/go-01/solution.go',
      'docs/adr/0005-ejecucion-en-sandbox-propio.md',
    ]),
    ['content/go/exercises/go-01/solution.go'],
  );
});

test('13. reads back every value it wrote', () => {
  const parsed = parseAuditSummary(formatAuditSummary(example));
  assert.equal(parsed.kind, 'ok');
  assert.deepEqual(parsed.kind === 'ok' ? parsed.summary : null, {
    format: 'taller-audit-summary-1',
    verdict: 'red',
    record: 'false',
    scope: 'partial',
    runtime: 'runsc',
    instance: 'auditoria',
    concurrency: '4',
    programs: '6',
    solutions: '2',
    solutionsPass: '2',
    starters: '2',
    startersFailAsExpected: '1',
    customTestSample: '2',
    customTestSamplePass: '2',
    findings: '1',
    noVerdict: '0',
    warnings: '1',
    documentHash: '4555e8500e6ef5bd38cdaf46010d3f14e3345d7ec0c69aea983acfe67f62fbb6',
    harnessHash: '6a86d9fef4cbeebd95703a6e239f08d885071dc7a122a7ca25883d953457a6fa',
    contentSourceCommit: 'null',
    commit: 'dd870a9ccb7cb50b8b06b584bcf988acaccbf22e',
    cleanTree: 'true',
    rustImage: 'sha256:f525ccf76aec49d19b686a8d4cff8baad441ef2f30a0688c74d1a3905c17c356',
    goImage: 'sha256:e66df8bf3b16022cc6426093be100ba59c09e2eaff9b88d492166e35f0a756b7',
    startedAt: '2026-11-02T03:00:00.000Z',
    finishedAt: '2026-11-02T03:00:09.500Z',
  });
  assert.throws(
    () => formatAuditSummary({ ...example, format: 'taller-curriculum-audit-0' }),
    /report.json es del formato taller-curriculum-audit-0/,
  );
});

test('14. computes the stamps of the working tree as the generator writes them', () => {
  const meta = JSON.parse(readFileSync(path.join(repoRoot, 'build/curriculum.meta.json'), 'utf8')) as {
    documentHash: string;
    portions: { harness: string };
  };
  assert.deepEqual(currentContentStamps(repoRoot), {
    documentHash: meta.documentHash,
    harnessHash: meta.portions.harness,
  });
});

done();
```

**Paso 2.** `npm run curriculum && node qa/audit-summary-check.ts`: falla porque los módulos no existen.

**Paso 3, la implementación.**

`qa/lib/audit-surface.ts`:

```ts
export const AUDITED_SURFACE: readonly string[] = [
  'content/rust/',
  'content/go/',
  'content/harness/',
  'tools/content/exercises.ts',
  'tools/content/harness.ts',
  'backend/executor/images/',
  'backend/executor/internal/sandbox/',
  'backend/executor/cmd/executor/main.go',
  'backend/api/app/Runs/Program/',
  'backend/api/app/Runs/Evidence/',
  'backend/api/app/Runs/Admission/ExerciseReader.php',
  'backend/api/app/Runs/Execution/ExecutorClient.php',
  'backend/api/app/Runs/Execution/ExecutorReply.php',
  'backend/api/app/Runs/Execution/ReplyKind.php',
  'backend/api/app/Audit/',
  'backend/api/app/Console/Commands/AuditCurriculum.php',
  'backend/api/config/audit.php',
];

function touches(changed: string, entry: string): boolean {
  return entry.endsWith('/') ? changed.startsWith(entry) : changed === entry;
}

export function auditedPaths(paths: readonly string[]): string[] {
  return paths.filter(
    (changed) =>
      !changed.endsWith('_test.go') && AUDITED_SURFACE.some((entry) => touches(changed, entry)),
  );
}
```

`qa/lib/content-stamps.ts`:

```ts
import { loadCurriculumSource } from '../../tools/content/load-curriculum.ts';
import { curriculumMeta } from '../../tools/content/meta.ts';

export interface ContentStamps {
  documentHash: string;
  harnessHash: string;
}

export function currentContentStamps(root: string): ContentStamps {
  const { curriculum, workshopSteps, harness } = loadCurriculumSource(root);
  const document = JSON.stringify(curriculum, null, 2) + '\n';
  const meta = curriculumMeta(curriculum, document, null, workshopSteps, harness);
  return { documentHash: meta.documentHash, harnessHash: meta.portions.harness };
}
```

`qa/lib/audit-summary.ts`:

```ts
import { auditedPaths } from './audit-surface.ts';
import type { ContentStamps } from './content-stamps.ts';

export const REPORT_FORMAT = 'taller-curriculum-audit-1';
export const SUMMARY_FORMAT = 'taller-audit-summary-1';
const FENCE = '```taller-audit-summary';
const CLOSE = '```';

export const SUMMARY_KEYS = [
  'format',
  'verdict',
  'record',
  'scope',
  'runtime',
  'instance',
  'concurrency',
  'programs',
  'solutions',
  'solutionsPass',
  'starters',
  'startersFailAsExpected',
  'customTestSample',
  'customTestSamplePass',
  'findings',
  'noVerdict',
  'warnings',
  'documentHash',
  'harnessHash',
  'contentSourceCommit',
  'commit',
  'cleanTree',
  'rustImage',
  'goImage',
  'startedAt',
  'finishedAt',
] as const;

export type SummaryKey = (typeof SUMMARY_KEYS)[number];
export type AuditSummary = Record<SummaryKey, string>;

export interface AuditReportJson {
  format: string;
  run: {
    startedAt: string;
    finishedAt: string;
    runtime: string;
    instance: string;
    concurrency: number;
    scope: string;
    record: boolean;
    verdict: string;
  };
  stamps: {
    commit: string | null;
    cleanTree: boolean | null;
    contentSourceCommit: string | null;
    documentHash: string;
    harnessHash: string;
    images: { rust: string | null; go: string | null };
  };
  totals: {
    programs: number;
    solutions: number;
    solutionsPass: number;
    starters: number;
    startersFailAsExpected: number;
    customTestSample: number;
    customTestSamplePass: number;
    findings: number;
    noVerdict: number;
    warnings: number;
  };
}

export type SummaryParse =
  | { kind: 'missing' }
  | { kind: 'invalid'; problems: string[] }
  | { kind: 'ok'; summary: AuditSummary };

export interface GateInput {
  body: string;
  changedPaths: readonly string[];
  expected: ContentStamps;
  headSha: string;
}

export interface GateResult {
  ok: boolean;
  applies: boolean;
  errors: string[];
  notes: string[];
}

const HEX64 = /^[0-9a-f]{64}$/;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const IMAGE = /^sha256:[0-9a-f]{64}$/;
const COUNT = /^(?:0|[1-9][0-9]*)$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const isBoolean = (value: string): boolean => value === 'true' || value === 'false';
const isCount = (value: string): boolean => COUNT.test(value);
const orNull =
  (valid: (value: string) => boolean) =>
  (value: string): boolean =>
    value === 'null' || valid(value);

const VALID: Record<SummaryKey, (value: string) => boolean> = {
  format: (value) => value === SUMMARY_FORMAT,
  verdict: (value) => value === 'green' || value === 'red',
  record: isBoolean,
  scope: (value) => value === 'full' || value === 'partial',
  runtime: (value) => value === 'runsc' || value === 'runc',
  instance: (value) => /^[a-z0-9-]{1,32}$/.test(value),
  concurrency: (value) => /^[1-8]$/.test(value),
  programs: isCount,
  solutions: isCount,
  solutionsPass: isCount,
  starters: isCount,
  startersFailAsExpected: isCount,
  customTestSample: isCount,
  customTestSamplePass: isCount,
  findings: isCount,
  noVerdict: isCount,
  warnings: isCount,
  documentHash: (value) => HEX64.test(value),
  harnessHash: (value) => HEX64.test(value),
  contentSourceCommit: orNull((value) => COMMIT.test(value)),
  commit: orNull((value) => COMMIT.test(value)),
  cleanTree: orNull(isBoolean),
  rustImage: orNull((value) => IMAGE.test(value)),
  goImage: orNull((value) => IMAGE.test(value)),
  startedAt: (value) => INSTANT.test(value),
  finishedAt: (value) => INSTANT.test(value),
};

function text(value: string | number | boolean | null): string {
  return value === null ? 'null' : String(value);
}

function summaryValues(report: AuditReportJson): AuditSummary {
  if (report.format !== REPORT_FORMAT) {
    throw new Error(`report.json es del formato ${report.format} y este resumen lee ${REPORT_FORMAT}`);
  }
  const { run, stamps, totals } = report;
  return {
    format: SUMMARY_FORMAT,
    verdict: run.verdict,
    record: text(run.record),
    scope: run.scope,
    runtime: run.runtime,
    instance: run.instance,
    concurrency: text(run.concurrency),
    programs: text(totals.programs),
    solutions: text(totals.solutions),
    solutionsPass: text(totals.solutionsPass),
    starters: text(totals.starters),
    startersFailAsExpected: text(totals.startersFailAsExpected),
    customTestSample: text(totals.customTestSample),
    customTestSamplePass: text(totals.customTestSamplePass),
    findings: text(totals.findings),
    noVerdict: text(totals.noVerdict),
    warnings: text(totals.warnings),
    documentHash: stamps.documentHash,
    harnessHash: stamps.harnessHash,
    contentSourceCommit: text(stamps.contentSourceCommit),
    commit: text(stamps.commit),
    cleanTree: text(stamps.cleanTree),
    rustImage: text(stamps.images.rust),
    goImage: text(stamps.images.go),
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  };
}

export function formatAuditSummary(report: AuditReportJson): string {
  const values = summaryValues(report);
  return [
    '**Auditoría del currículo (B3)**: pegá este bloque entero en la descripción del PR.',
    '',
    FENCE,
    ...SUMMARY_KEYS.map((key) => `${key}: ${values[key]}`),
    CLOSE,
    '',
  ].join('\n');
}

function isSummaryKey(key: string): key is SummaryKey {
  return (SUMMARY_KEYS as readonly string[]).includes(key);
}

function readFields(lines: readonly string[]): { values: Map<SummaryKey, string>; problems: string[] } {
  const values = new Map<SummaryKey, string>();
  const problems: string[] = [];
  for (const line of lines.filter((candidate) => candidate !== '')) {
    const match = /^([A-Za-z]+): (.*)$/.exec(line);
    if (!match) {
      problems.push(`la línea «${line}» no es clave: valor`);
    } else if (!isSummaryKey(match[1])) {
      problems.push(`${match[1]} no es una clave del formato`);
    } else if (values.has(match[1])) {
      problems.push(`${match[1]} está repetida`);
    } else {
      values.set(match[1], match[2]);
    }
  }
  return { values, problems };
}

function valueProblems(values: Map<SummaryKey, string>): string[] {
  const problems: string[] = [];
  for (const key of SUMMARY_KEYS) {
    const value = values.get(key);
    if (value === undefined) problems.push(`falta ${key}`);
    else if (key !== 'format' && !VALID[key](value)) problems.push(`${key}: «${value}» no es válido`);
  }
  return problems;
}

export function parseAuditSummary(body: string): SummaryParse {
  const lines = body
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim());
  const starts = lines.flatMap((line, index) => (line === FENCE ? [index] : []));
  if (starts.length === 0) return { kind: 'missing' };
  if (starts.length > 1) {
    return {
      kind: 'invalid',
      problems: [`hay ${starts.length} bloques taller-audit-summary; dejá uno solo`],
    };
  }
  const end = lines.indexOf(CLOSE, starts[0] + 1);
  if (end === -1) return { kind: 'invalid', problems: ['el bloque no se cierra con ```'] };
  const { values, problems } = readFields(lines.slice(starts[0] + 1, end));
  const format = values.get('format');
  if (format !== undefined && format !== SUMMARY_FORMAT) {
    return {
      kind: 'invalid',
      problems: [
        `el bloque es del formato ${format} y este check lee ${SUMMARY_FORMAT}: volvé a correr npm run api:audit`,
      ],
    };
  }
  const all = [...problems, ...valueProblems(values)];
  if (all.length > 0) return { kind: 'invalid', problems: all };
  return { kind: 'ok', summary: Object.fromEntries(values) as AuditSummary };
}

function summaryErrors(summary: AuditSummary, expected: ContentStamps): string[] {
  const errors: string[] = [];
  if (summary.record !== 'true') {
    errors.push(
      `La corrida no es de registro (record: ${summary.record}): tiene que ser completa, con runsc y sin programas sin veredicto.`,
    );
  }
  if (summary.scope !== 'full') {
    errors.push(
      `La corrida es parcial (scope: ${summary.scope}): la de registro audita los dos lenguajes enteros.`,
    );
  }
  if (summary.runtime !== 'runsc') {
    errors.push(`La corrida usó ${summary.runtime}: la de registro corre con runsc.`);
  }
  if (summary.verdict !== 'green' || summary.findings !== '0' || summary.noVerdict !== '0') {
    errors.push(
      `El veredicto está en rojo (verdict: ${summary.verdict}, findings: ${summary.findings}, noVerdict: ${summary.noVerdict}): corregí los hallazgos y volvé a auditar.`,
    );
  }
  if (summary.documentHash !== expected.documentHash) {
    errors.push(
      `La huella del documento no coincide: esperada ${expected.documentHash} (cabeza del PR), recibida ${summary.documentHash}. Volvé a auditar después del último cambio de contenido.`,
    );
  }
  if (summary.harnessHash !== expected.harnessHash) {
    errors.push(
      `La huella de la plantilla (portions.harness) no coincide: esperada ${expected.harnessHash} (cabeza del PR), recibida ${summary.harnessHash}. Volvé a auditar después del último cambio de la plantilla.`,
    );
  }
  return errors;
}

function reviewerNote(summary: AuditSummary, headSha: string): string {
  const differs =
    summary.commit === headSha ? '' : ', distinto: comprobá que lo posterior no toca la superficie';
  const clean =
    summary.cleanTree === 'true' ? 'sí' : summary.cleanTree === 'false' ? 'no' : 'sin dato';
  return `Para quien revisa: commit ${summary.commit} (cabeza del PR: ${headSha})${differs}; árbol limpio: ${clean}; imágenes: rust ${summary.rustImage}, go ${summary.goImage}.`;
}

export function evaluateAuditGate(input: GateInput): GateResult {
  const touched = auditedPaths(input.changedPaths);
  if (touched.length === 0) {
    return {
      ok: true,
      applies: false,
      errors: [],
      notes: ['El PR no toca la superficie auditada (qa/lib/audit-surface.ts): no hace falta el resumen.'],
    };
  }
  const parsed = parseAuditSummary(input.body);
  if (parsed.kind === 'missing') {
    return {
      ok: false,
      applies: true,
      errors: [
        `Falta el resumen de la auditoría: el PR toca la superficie auditada (${touched[0]}). Corré npm run api:audit sobre el último commit, con el árbol limpio, y pegá en la descripción el bloque que imprime.`,
      ],
      notes: [],
    };
  }
  if (parsed.kind === 'invalid') {
    return {
      ok: false,
      applies: true,
      errors: parsed.problems.map(
        (problem) => `El resumen no tiene el formato ${SUMMARY_FORMAT}: ${problem}.`,
      ),
      notes: [],
    };
  }
  const errors = summaryErrors(parsed.summary, input.expected);
  return {
    ok: errors.length === 0,
    applies: true,
    errors,
    notes: [reviewerNote(parsed.summary, input.headSha)],
  };
}
```

**Paso 4.** `node qa/audit-summary-check.ts` en verde (14 escenarios). ESLint marca complejidad si `summaryErrors` o `parseAuditSummary` pasan de 10: no debería (6 y 6); si pasa, partí por un seam con nombre, no apagues la regla. Sumalo a `qa/run-checks.ts`; `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`. Commits: `test(qa): fija el resumen de la auditoría y su check` y `feat(qa): resumen de la auditoría, superficie auditada y su check`.

### Tarea 2.3 · El check en la CI (T013, Q)

**Archivos:** crea `qa/audit-summary-gate.ts` y `.github/workflows/audit-summary.yml`.

**Paso 1.** `qa/audit-summary-gate.ts`, la línea de comandos del contrato:

```ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { evaluateAuditGate } from './lib/audit-summary.ts';
import { currentContentStamps } from './lib/content-stamps.ts';
import { repoRoot } from './lib/sources.ts';

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

const bodyFile = option('body-file');
const body = bodyFile === undefined ? (process.env.PR_BODY ?? '') : readFileSync(bodyFile, 'utf8');
const base = option('base') ?? process.env.BASE_SHA ?? 'origin/master';
const head = option('head') ?? process.env.HEAD_SHA ?? 'HEAD';
const changedPaths = git(['diff', '--name-only', '--no-renames', `${base}...${head}`])
  .split('\n')
  .filter((line) => line !== '');
const result = evaluateAuditGate({
  body,
  changedPaths,
  expected: currentContentStamps(repoRoot),
  headSha: git(['rev-parse', head]).trim(),
});

for (const note of result.notes) console.log(note);
for (const error of result.errors) console.error(`FALLA ${error}`);
process.exit(result.ok ? 0 : 1);
```

**Paso 2.** Probalo en local, desde una rama con un commit que no toque la superficie: `node qa/audit-summary-gate.ts --base=HEAD~1 --head=HEAD` imprime la nota de que no aplica y sale con 0. Con un archivo vacío como cuerpo y `--base` en un commit anterior a un cambio de `content/rust/`, sale con 1 y la línea `FALLA Falta el resumen…`. Anotá las dos salidas en el informe de la tarea.

**Paso 3.** `.github/workflows/audit-summary.yml`, exactamente el del contrato ([contracts/audit-summary.md](./contracts/audit-summary.md), «El workflow»). Comprobá que las acciones usan los mismos SHA que `.github/workflows/ci.yml`.

**Paso 4.** `npm run typecheck`, `npm run lint`, `npm run format:check` (Prettier también formatea el YAML). Commit: `feat(ci): comprueba el resumen de la auditoría en los PR que tocan lo auditado`.

## 3. La operación y la documentación (coordinador K)

**Cubre:** FR-009 a FR-011, FR-013 (la entrada), FR-016, FR-020, FR-021, FR-028, FR-032 y FR-033.

### Tarea 3.1 · La instancia, la entrada y la salida ignorada (T014, K, onda 1)

**Archivos:** cambian `docker/compose.yaml`, `qa/compose-runs-check.ts`, `package.json`, `.gitignore` y `.dockerignore`; crea `qa/curriculum-audit.ts`.

**Paso 1, las pruebas en rojo.** En `qa/compose-runs-check.ts`:

- la interfaz `Service` suma `user?: string` y `healthcheck?: unknown`;
- el test «EXECUTOR_TOKEN reaches only the executor and the worker» pasa a llamarse `EXECUTOR_TOKEN reaches only the two executors, the worker and the audit command` y espera `['audit', 'executor', 'executor-audit', 'worker-runs']`;
- y se suman estos tests:

```ts
const { 'executor-audit': auditExecutor, audit } = compose.services;

test('the audit instance is the same executor under its own label, in its own network (FR-010)', () => {
  assert.deepEqual(auditExecutor.profiles, ['audit']);
  assert.deepEqual(auditExecutor.networks, ['audit']);
  assert.equal(auditExecutor.environment?.EXECUTOR_INSTANCE, 'auditoria');
  assert.equal(executor.environment?.EXECUTOR_INSTANCE, undefined);
  for (const key of ['build', 'volumes', 'group_add', 'read_only', 'cap_drop', 'dns', 'pids_limit', 'stop_grace_period', 'healthcheck'] as const) {
    assert.deepEqual(auditExecutor[key], executor[key], key);
  }
  for (const key of ['EXECUTOR_RUST_IMAGE', 'EXECUTOR_GO_IMAGE', 'GOMAXPROCS'] as const) {
    assert.equal(auditExecutor.environment?.[key], executor.environment?.[key], key);
  }
  assert.equal(auditExecutor.environment?.EXECUTOR_RUNTIME, '${AUDIT_RUNTIME:-runsc}');
  assert.equal(auditExecutor.environment?.EXECUTOR_MAX_CONCURRENT, '${AUDIT_CONCURRENCY:-4}');
});

test('the audit command reaches its instance and MySQL only, without the Docker socket (FR-010, FR-020)', () => {
  assert.deepEqual(audit.profiles, ['audit']);
  assert.deepEqual(audit.networks, ['app', 'audit']);
  assert.deepEqual(audit.volumes, ['./qa/curriculum-audit:/audit']);
  assert.equal(audit.environment?.EXECUTOR_URL, 'http://executor-audit:8080');
  assert.equal(audit.environment?.EXECUTOR_RUNTIME, auditExecutor.environment?.EXECUTOR_RUNTIME);
  assert.equal(audit.environment?.AUDIT_CONCURRENCY, auditExecutor.environment?.EXECUTOR_MAX_CONCURRENT);
  assert.equal(audit.environment?.AUDIT_INSTANCE, auditExecutor.environment?.EXECUTOR_INSTANCE);
  assert.equal(audit.environment?.AUDIT_REPORT_DIRECTORY, '/audit');
  assert.equal(audit.user, '${AUDIT_UID:-82}:${AUDIT_GID:-82}');
});

test('the audit network is internal and only the audit command and its instance use it', () => {
  assert.equal(compose.networks.audit.internal, true);
  const members = Object.entries(compose.services)
    .filter(([, service]) => service.networks?.includes('audit'))
    .map(([name]) => name)
    .sort();
  assert.deepEqual(members, ['audit', 'executor-audit']);
});

test('the limits of the audit are those of the executor profiles (R14)', () => {
  const profile = read('backend/executor/internal/sandbox/profile.go');
  const audit = read('backend/api/config/audit.php');
  const phase = (block: RegExp) => {
    const match = block.exec(profile);
    assert.ok(match, String(block));
    return { ms: Number(match[1]) * 1000, mib: Number(match[2]) };
  };
  const run = phase(/run := Phase\{\s*Timeout: (\d+) \* time\.Second, MemoryMiB: (\d+)/);
  const rust = phase(/"rust": \{[\s\S]*?Compile: Phase\{\s*Timeout: (\d+) \* time\.Second, MemoryMiB: (\d+)/);
  const go = phase(/"go": \{[\s\S]*?Compile: Phase\{\s*Timeout: (\d+) \* time\.Second, MemoryMiB: (\d+)/);
  assert.equal(numberAfter(audit, /'compile_ms' => \['rust' => (\d+)/), rust.ms);
  assert.equal(numberAfter(audit, /'compile_ms' => \[[^\]]*'go' => (\d+)/), go.ms);
  assert.equal(numberAfter(audit, /'run_ms' => (\d+)/), run.ms);
  assert.equal(numberAfter(audit, /'compile_memory_mib' => (\d+)/), rust.mib);
  assert.equal(numberAfter(audit, /'compile_memory_mib' => (\d+)/), go.mib);
  assert.equal(numberAfter(audit, /'run_memory_mib' => (\d+)/), run.mib);
});
```

`node qa/compose-runs-check.ts`: fallan (no existen los servicios ni la red).

**Paso 2, Compose.** En `docker/compose.yaml`, un ancla nueva arriba de `services:` con todo lo de `executor` salvo `environment`, `networks` y `restart`, y los dos servicios:

```yaml
x-executor-base: &executor-base
  build:
    context: ./backend/executor
    target: runtime
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  group_add:
    - '${EXECUTOR_DOCKER_GID:?falta EXECUTOR_DOCKER_GID en .env (sh backend/api/scripts/init-env.sh)}'
  read_only: true
  tmpfs:
    - /tmp:rw,noexec,nosuid,size=16m
  security_opt:
    - no-new-privileges:true
  cap_drop:
    - ALL
  dns: ['127.0.0.1']
  mem_limit: 256m
  pids_limit: 128
  stop_grace_period: 45s
  healthcheck:
    test: ['CMD', 'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1:8080/healthz']
    interval: 10s
    timeout: 3s
    retries: 3
    start_period: 5s
    start_interval: 1s
```

```yaml
  executor:
    <<: *executor-base
    environment:
      EXECUTOR_TOKEN: *executor-token
      EXECUTOR_RUNTIME: '${EXECUTOR_RUNTIME:-runsc}'
      EXECUTOR_MAX_CONCURRENT: '${EXECUTOR_MAX_CONCURRENT:-4}'
      EXECUTOR_RUST_IMAGE: taller-sandbox-rust:local
      EXECUTOR_GO_IMAGE: taller-sandbox-go:local
      GOMAXPROCS: '2'
      HOME: /tmp
    networks: [sandbox]
    restart: unless-stopped

  # B3: the audit runs against its own executor, labeled auditoria, so neither one sweeps the other's containers.
  executor-audit:
    <<: *executor-base
    profiles: [audit]
    environment:
      EXECUTOR_TOKEN: *executor-token
      EXECUTOR_RUNTIME: '${AUDIT_RUNTIME:-runsc}'
      EXECUTOR_MAX_CONCURRENT: '${AUDIT_CONCURRENCY:-4}'
      EXECUTOR_INSTANCE: auditoria
      EXECUTOR_RUST_IMAGE: taller-sandbox-rust:local
      EXECUTOR_GO_IMAGE: taller-sandbox-go:local
      GOMAXPROCS: '2'
      HOME: /tmp
    networks: [audit]
    restart: 'no'

  audit:
    <<: *laravel-runtime
    profiles: [audit]
    environment:
      <<: *laravel-base-env
      DB_USERNAME: '${AUDIT_DB_USERNAME:-taller}'
      DB_PASSWORD: '${AUDIT_DB_PASSWORD:-${MYSQL_PASSWORD}}'
      EXECUTOR_URL: http://executor-audit:8080
      EXECUTOR_TOKEN: *executor-token
      EXECUTOR_RUNTIME: '${AUDIT_RUNTIME:-runsc}'
      AUDIT_INSTANCE: auditoria
      AUDIT_CONCURRENCY: '${AUDIT_CONCURRENCY:-4}'
      AUDIT_REPORT_DIRECTORY: /audit
    user: '${AUDIT_UID:-82}:${AUDIT_GID:-82}'
    command: ['php', 'artisan', 'curriculum:audit']
    networks: [app, audit]
    volumes:
      - ./qa/curriculum-audit:/audit
    depends_on:
      mysql:
        condition: service_healthy
      executor-audit:
        condition: service_healthy
    restart: 'no'
```

Y en `networks:` suma `audit: { internal: true }` con el mismo estilo que las demás. El comentario del servicio es la referencia a B3, como los demás comentarios de Compose; es el único.

**Paso 3, la entrada.** `qa/curriculum-audit.ts`, con los pasos y los mensajes del contrato:

```ts
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { formatAuditSummary, type AuditReportJson } from './lib/audit-summary.ts';
import { repoRoot } from './lib/sources.ts';

interface EntryOptions {
  forwarded: string[];
  concurrency: string;
  runtime: string;
}

const REPORTS = path.join(repoRoot, 'qa', 'curriculum-audit');
const REPORT = path.join(REPORTS, 'report.json');
const SUMMARY = path.join(REPORTS, 'summary.md');
const IMAGES = { rust: 'taller-sandbox-rust:local', go: 'taller-sandbox-go:local' } as const;

function refuse(message: string): never {
  console.error(message);
  process.exit(2);
}

function parseOptions(argv: readonly string[]): EntryOptions {
  const forwarded: string[] = [];
  let concurrency = process.env.AUDIT_CONCURRENCY ?? '4';
  let runtime = process.env.AUDIT_RUNTIME ?? 'runsc';
  for (const argument of argv) {
    if (argument.startsWith('--concurrency=')) concurrency = argument.slice('--concurrency='.length);
    else if (argument.startsWith('--runtime=')) runtime = argument.slice('--runtime='.length);
    else if (argument.startsWith('--language=') || argument.startsWith('--exercise='))
      forwarded.push(argument);
    else
      refuse(
        `api:audit: opción desconocida «${argument}». Se admiten --language=, --exercise=, --concurrency= y --runtime=.`,
      );
  }
  if (!/^[1-8]$/.test(concurrency))
    refuse(`api:audit: --concurrency va de 1 a 8 y llegó «${concurrency}».`);
  if (runtime !== 'runsc' && runtime !== 'runc')
    refuse(`api:audit: --runtime admite runsc o runc y llegó «${runtime}».`);
  return { forwarded, concurrency, runtime };
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync(command, args, { cwd: repoRoot, encoding: 'utf8', env });
}

function imageId(image: string): string {
  try {
    return run('docker', ['image', 'inspect', '--format', '{{.Id}}', image]).trim();
  } catch {
    return refuse(
      `api:audit: falta la imagen ${image}: construila con «docker compose --profile sandbox-images build» (ADR 0005).`,
    );
  }
}

function hostStamps(): string[] {
  const clean = run('git', ['status', '--porcelain']).trim() === '' ? 'yes' : 'no';
  return [
    `--commit=${run('git', ['rev-parse', 'HEAD']).trim()}`,
    `--clean-tree=${clean}`,
    `--rust-image=${imageId(IMAGES.rust)}`,
    `--go-image=${imageId(IMAGES.go)}`,
  ];
}

const options = parseOptions(process.argv.slice(2));
const stamps = hostStamps();
const env: NodeJS.ProcessEnv = {
  ...process.env,
  AUDIT_UID: String(process.getuid?.() ?? 82),
  AUDIT_GID: String(process.getgid?.() ?? 82),
  AUDIT_CONCURRENCY: options.concurrency,
  AUDIT_RUNTIME: options.runtime,
};
if (run('docker', ['compose', '--profile', 'audit', 'ps', '--status', 'running', '--quiet', 'executor-audit'], env).trim() !== '') {
  refuse(
    'api:audit: ya hay otra corrida de auditoría en curso (executor-audit está arriba). Si quedó de una corrida cortada, apagala con «docker compose --profile audit rm --stop --force executor-audit».',
  );
}
mkdirSync(REPORTS, { recursive: true });
rmSync(REPORT, { force: true });

let status = 1;
try {
  const audit = spawnSync(
    'docker',
    ['compose', '--profile', 'audit', 'run', '--rm', '--build', '-T', 'audit', 'php', 'artisan', 'curriculum:audit', ...stamps, ...options.forwarded],
    { cwd: repoRoot, env, stdio: 'inherit' },
  );
  status = audit.status ?? 1;
} finally {
  spawnSync('docker', ['compose', '--profile', 'audit', 'rm', '--stop', '--force', 'executor-audit'], {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });
}
if (existsSync(REPORT)) {
  const summary = formatAuditSummary(JSON.parse(readFileSync(REPORT, 'utf8')) as AuditReportJson);
  writeFileSync(SUMMARY, summary);
  console.log('\nResumen para la descripción del PR (qa/curriculum-audit/summary.md):\n');
  console.log(summary);
}
process.exit(status);
```

**Paso 4, el resto.**

- `package.json`, en `scripts`, después de `api:runs:check`: `"api:audit": "node qa/curriculum-audit.ts"` y `"audit:gate": "node qa/audit-summary-gate.ts"`.
- `.gitignore`, en el bloque «Generated previews, validation records, and test output.»: `/qa/curriculum-audit/`.
- `.dockerignore`, después de `qa/*-validation.json`: `qa/curriculum-audit`.

**Paso 5.** `node qa/compose-runs-check.ts` en verde; `docker compose config --quiet` y `docker compose --profile audit config --quiet` sin errores (no levantan nada); `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`. Commits: `test(qa): fija la instancia y el contenedor de la auditoría` y `feat(ops): instancia propia del ejecutor para la auditoría y su entrada npm`.

### Tarea 3.2 · La documentación (T015, K, desde S3)

**Archivos:** `backend/api/AGENTS.md`, `README.md`, `qa/AGENTS.md`, `backend/executor/AGENTS.md`, `AGENTS.md`, `docs/architecture.md` y `docs/adr/0005-ejecucion-en-sandbox-propio.md`.

1. **`backend/api/AGENTS.md`** (FR-033, FR-011):
   - en «Comandos», después de `npm run api:runs:check`: «`npm run api:audit`: con el stack corriendo, la auditoría del currículo (B3): levanta `executor-audit`, corre `php artisan curriculum:audit` en un contenedor `audit`, apaga la instancia y deja `qa/curriculum-audit/report.json`, `report.txt` y `summary.md`. `-- --language=go`, `-- --exercise=rust-63` (repetible), `-- --concurrency=1..8` y `-- --runtime=runc` (desarrollo, no es de registro). Tarda unos minutos. Desde C4, en producción, se corre fuera de hora: la instancia propia no ocupa lugares del servicio, pero comparte CPU y el daemon de Docker»;
   - una sección nueva, «Auditoría del currículo (B3)», con: contratos en `specs/020-b3-auditoria-curriculo/contracts/`; `app/Audit/` reutiliza `ProgramComposer`, `ResultClassifier` y `ExecutorClient` sin cambiarlos; no escribe en la base ni en una cola (`AuditArchTest`); una corrida a la vez (`GET_LOCK` `:curriculum-audit`); la compuerta: todo PR que toca la superficie de `qa/lib/audit-surface.ts` lleva el resumen de una corrida completa con runsc en verde sobre su último commit con el árbol limpio, y el check `audit-summary` lo comprueba; un hallazgo es un bug de contenido (`.specify/bugs/`, extensión `bug`) que se corrige en `content/`.
2. **`README.md`, «Verificación»:** después del bloque de la API, un párrafo y un bloque: «La auditoría del currículo corre la solución y el código inicial de cada ejercicio en el sandbox propio, con runsc y una instancia del ejecutor sólo para ella, y no escribe nada en la base. Es la auditoría masiva desde B3: reemplaza a `runtime-check` para eso, que queda hasta A4 para lo que todavía usa los Playgrounds.» con `npm run api:audit   # con el stack levantado: soluciones que aprueban e iniciales que fallan, con su informe` y `npm run audit:gate -- --body-file=qa/curriculum-audit/summary.md   # el check del resumen, como en la CI`. En el párrafo «Para recompilar soluciones de referencia con los servicios reales», cambiá «Se agrupan las soluciones…» por «Desde B3 la auditoría masiva es `npm run api:audit`: estos comandos quedan para verificar pocos IDs contra los Playgrounds hasta que A4 los retire.»
3. **`qa/AGENTS.md`, «Compiladores y evidencia»:** una primera viñeta: «`npm run api:audit` es la auditoría masiva (B3): local, con runsc y su propia instancia del ejecutor, sin restricción de corridas. Sus informes (`qa/curriculum-audit/`) son estado generado; un informe cuyos sellos no coinciden con el contenido, la plantilla o las imágenes actuales no vale. En los PR que tocan `qa/lib/audit-surface.ts`, el resumen va en la descripción y lo comprueba `audit-summary`.»; en la viñeta de `runtime-check … --ids`, cambiá «evitá repetir verificaciones masivas contra servicios públicos» por «la verificación masiva ya no va por los Playgrounds: es `npm run api:audit`»; y en «Elegir comprobaciones», si lista los checks, sumá `go-warm-cache-check` y `audit-summary-check`.
4. **`backend/executor/AGENTS.md`:** en la viñeta de las imágenes, después de «corré otra vez la integración con runc y con runsc», agregá «y la auditoría del currículo (`npm run api:audit`); un cambio de `images/go/warm/main.go` reconstruye la imagen de Go antes de auditar».
5. **`AGENTS.md`**, «Verificación y mantenimiento de la guía»: «En cada PR, `.github/workflows/ci.yml` corre los checks del front, de la API (Pint, PHPStan y Pest) y del ejecutor, y `.github/workflows/audit-summary.yml` comprueba el resumen de la auditoría del currículo cuando el PR toca la superficie auditada: un PR se mergea con los cuatro en verde.»
6. **`docs/architecture.md`:** una fila nueva en la tabla, después de «API de ejecuciones»: «Auditoría del currículo (B3) | `backend/api/app/Audit/` y `php artisan curriculum:audit` (reutilizan el armado y la clasificación de B2 sin escribir), el servicio `executor-audit` en la red `audit`, la entrada `qa/curriculum-audit.ts` y los checks `qa/go-warm-cache-check.ts` y `qa/audit-summary-check.ts` (con la superficie en `qa/lib/audit-surface.ts`). Contratos en `specs/020-b3-auditoria-curriculo/contracts/`».
7. **ADR 0005**, una sección al final, antes de «Fuentes»: «## Enmienda (2026-MM-DD, plan B3)» con tres viñetas: el §8 ya no tiene usos de `time.Sleep` en el contenido (medido el 2026-10-28) y el tiempo real se informa contra el límite en la auditoría; la auditoría de aceptación es `npm run api:audit`, con su instancia `executor-audit` (etiqueta `auditoria`) y su compuerta en los PR; y las «Fases» quedan en el orden 1, 2, 4, 3: la auditoría local va antes que el laboratorio, como decidió el usuario en la Q5 de A4 (2026-10-28). La aprueba el usuario con el PR (R18).
8. Comprobá rutas, comandos y enlaces de lo que tocaste; `git diff --check`; `npm run format:check`. Commit: `docs: documenta la auditoría del currículo y su compuerta`.

## 4. La entrega (coordinador K, desde S3)

**Cubre:** FR-024, FR-029, FR-031 y FR-032 (la condición de A4); SC-001, SC-003, SC-004, SC-005, SC-006 y SC-008.

### Tarea 4.1 · La primera corrida de registro (T016, K)

Con permiso para Docker, los pasos de [quickstart.md](./quickstart.md), §2 y §3:

1. Reconstruí las imágenes del sandbox (`docker compose --profile sandbox-images build`): no baja nada, porque las bases están por digest en el host (research.md). Si BuildKit no tiene en caché la capa de `apk add docker-cli` del ejecutor, el build la baja: pará y pedí permiso con nombre y tamaño.
2. `docker compose up --build -d --wait`.
3. Tomá las cuentas de SC-003 y poné el señuelo de la etiqueta del servicio (quickstart §3).
4. `npm run api:audit`. Lo esperado: código 1, de registro, con `rust-63` (`starter_compile_error`) y `rust-71` (`starter_runtime_error`, `signal 6`) como hallazgos, y lo que sólo muestre el sandbox.
5. Comprobá SC-003 (las cuentas y el señuelo) y el aislamiento de redes (quickstart §3).
6. Anotá en el PR, no en `tasks.md`, las cifras de SC-005: la duración, la mediana y el máximo por lenguaje y fase, el menor margen y los avisos, contra la línea de base del host, la mediana de 1,1 s de B2 y el umbral 0,5. Si en reposo aparecen avisos, informalo al usuario antes de seguir (R14).

### Tarea 4.2 · Los bugs de contenido (T017, K)

Por cada hallazgo de T016, con la aprobación del usuario como bug de contenido (spec, «Acciones del usuario»):

1. `/speckit-bug-assess` con la línea del informe como evidencia y el slug `rust-63-inicial-no-compila` (o `rust-71-inicial-aborta`, o uno de dos a cuatro palabras para otro hallazgo). La evaluación cita la remediación medida de research.md (R17).
2. `/speckit-bug-fix`: el arreglo va en `content/rust/exercises/<id>/starter.rs` (nunca en `build/`; sin cambiar IDs ni claves). Puede delegarse en el `implementador` con el archivo y el texto exacto.
3. `npm run curriculum && npm test`: cambian el `starter_hash` y el `content_hash` del ejercicio, no su `grading_hash`.
4. `docker compose up --build -d --wait` y `npm run api:audit -- --exercise=rust-63 --exercise=rust-71`: verde, parcial.
5. `/speckit-bug-test` con esa salida.

Un hallazgo cuyo origen está en el sandbox (las imágenes, el ejecutor o la clasificación) sigue el mismo camino como bug de `backend/executor/` o de B2 (FR-029). La auditoría no se toca para que pase (FR-030).

### Tarea 4.3 · El cierre (T018, K)

1. Con todo commiteado y el árbol limpio: `docker compose up --build -d --wait` y `npm run api:audit`. Tiene que dar código 0, de registro, 274 de 274 y 274 de 274, 4 de 4 en la muestra y 0 sin veredicto (SC-001, SC-007).
2. `npm run audit:gate -- --body-file=qa/curriculum-audit/summary.md --base=origin/master`: código 0.
3. SC-006 a mano y deshecho (los dos negativos de T011); SC-004 con las pruebas de T005 y los escenarios 2 y 9 de T012, más un cambio de imagen: reconstruí `taller-sandbox-go:local` con `--no-cache` sólo si el usuario da permiso (baja nada, pero tarda) y comprobá que `goImage` del resumen cambia; si no hay permiso, se informa como no verificado.
4. SC-008: `npm test`, `npm run lint`, `npm run format:check`, `npm run api:test`, `npm run api:format:check`, `npm run api:analyse`, `git diff --check` (el ejecutor no cambia: `npm run test:executor` no hace falta, se corre igual como red).
5. El PR, en inglés, con título `feat(audit): audit the curriculum in the local sandbox` y la descripción con el problema completo, las cifras de SC-005 y el bloque `taller-audit-summary` de la corrida del paso 1. El workflow `audit-summary` corre en ese mismo PR.
6. Acciones del usuario: aprobar la enmienda del ADR 0005; sumar `audit-summary` a los checks obligatorios de `master`. El coordinador marca B3 `Entregado` en la hoja de ruta: A4 queda desbloqueado.

## Cobertura de requisitos

| Requisito | Tarea y prueba |
| --- | --- |
| FR-001 | T004 (lee lo activo, de los dos lenguajes), T010 (`byLanguage` y `bySection`) |
| FR-002 | T005 (dos programas por ejercicio, sin prueba propia) |
| FR-003 | T004 (`ExerciseSnapshot` igual al de B2), T005 y T010 (el programa igual al de B2, nonce nuevo), T002 (B2 sin cambio de comportamiento) |
| FR-004 | T010 (`ResultClassifier` con el runtime; `pids_limit` sólo con runsc) |
| FR-005 a FR-007 | T006 (la tabla, 20 filas), T010 (11 casos de punta a punta) |
| FR-008 | T002, T007 (503, no alcanzado, 500, 413, cuerpo inválido, conexión), T010 |
| FR-009 | T010 (el comando), T014 (`api:audit`) |
| FR-010 | T014 (instancia, etiqueta, red; `compose-runs-check`), T016 (el señuelo) |
| FR-011 | T015 (`backend/api/AGENTS.md`) |
| FR-012 | T004, T010 (ninguna escritura ni trabajo), T010 (arquitectura), T016 (SC-003) |
| FR-013 | T004, T005, T008, T009, T010 (las negativas), T014 (la entrada) |
| FR-014 | T009 y T010 (runc no es de registro), T016 |
| FR-015 | T005 y T010 (parcial) |
| FR-016 | T003, T010 (concurrencia 1–8), T014 (la misma en las dos piezas) |
| FR-017 | T009 y T010 (código de salida y `record`) |
| FR-018 | T009 y T010 (las líneas) |
| FR-019 | T009 (igual al ejemplo escrito a mano) |
| FR-020 | T009 y T010 (sellos), T014 (los toma la entrada; sin socket) |
| FR-021 | T014 (`.gitignore`, `.dockerignore`), T012 (el resumen va al PR) |
| FR-022 y FR-023 | T003, T006, T009, T010 |
| FR-024 | T006 y T010 (`pids_limit`), T018 (la corrida de registro en verde) |
| FR-025 | T006 (`limit_exceeded`), T014 (los límites iguales a `profile.go`) |
| FR-026 | T009 (inicio y fin) |
| FR-027 y FR-036 | T011 |
| FR-028 | T012 (la lista del caché está en la superficie), T015 (la documentación) |
| FR-029 | T017 |
| FR-030 | T006 (la única excepción es `reparar`) |
| FR-031 | T016 a T018 |
| FR-032 | T012 (la superficie), T013 (el check), T015 (la compuerta), T018 (A4) |
| FR-033 | T015 |
| FR-034 | T003, T005, T006, T010 |
| FR-035 | T004 a T010 |
| FR-037 | todas (Pint, PHPStan, `npm test`, `lint`, `format:check`), T018 |
| FR-038 | T012, T013 |
| SC-001 | T018 |
| SC-002 | T006 y T010 |
| SC-003 | T010 (Pest), T016 (corrida real) |
| SC-004 | T005 (huella del programa), T012 (huellas del documento y de la plantilla), T018 (imagen) |
| SC-005 | T016 |
| SC-006 | T011, T018 |
| SC-007 | T010, T018 |
| SC-008 | T018 |
| SC-009 | T012 (escenarios 1 a 6, más 8 de borde) |

## Descargas y permisos

- **Ninguna descarga prevista.** Las imágenes del sandbox, sus bases por digest, la de MySQL, la de PHP y la de Composer están en el host (research.md). Las pruebas y los checks no bajan nada.
- **Condicional:** si la caché de BuildKit perdió la capa de `apk add docker-cli` del ejecutor o el `npm ci` de la etapa `curriculum` de la API, el `--build` las baja (paquetes de Alpine, unos MB; dependencias de npm, de 40 a 50 MB). K pide permiso antes, con nombre, origen y tamaño.
- **Docker:** sólo K, con permiso, en T001, T014 (sólo `docker compose config`), T016, T017 y T018.

## Riesgos y lo que quedó sin verificar

1. **Todo el PHP es referencia.** Puntos con más probabilidad de ajuste: los tipos que PHPStan infiere de `Http::pool` y de `DB::select`; que `expectsOutputToContain` vea las líneas del comando; y la igualdad exacta con el ejemplo del informe (redondeos de `round()` y la mediana).
2. **El errno dentro del pool.** Si Laravel no conserva la `ConnectException` como causa en un pedido del pool, un ejecutor que reinicia daría «sin veredicto». Lo detecta T002; la salida sería leer el errno en `ExecutorDispatcher` antes de llamar a `read()`, que el coordinador decide.
3. **El uid del contenedor `audit`.** Con el uid del host, PHP lee el código de la imagen (root, 755) y escribe sólo en `/audit`. Sin medir: T016.
4. **La duración** (SC-005) y los avisos en reposo: T016.
5. **La compuerta sigue siendo autodeclarada** (spec, «Riesgos», 4): el check no detecta un resumen inventado.
6. **El check obligatorio en GitHub** depende de que el usuario lo sume a la protección de la rama.

## Complexity Tracking

| Decisión | Por qué hace falta | Alternativa más simple descartada |
| --- | --- | --- |
| Refactor de `ExecutorClient` (B2) | El pool necesita la URL, el token, los plazos y la lectura de B2, y FR-008 repite su criterio | Copiar la lectura en `App\Audit`: dos copias del errno de cURL que terminarían por diferir (R4) |
| Un workflow nuevo, `audit-summary.yml` | El check tiene que volver a correr al editar la descripción (`edited`) | Un job en `ci.yml`: cada edición correría la CI entera y cancelaría la que estaba en curso (R11) |
| El contenedor `audit` con el uid del host | El informe tiene que quedar en el host sin abrir permisos y sin `docker cp` | La salida estándar como canal del JSON: se mezcla con el progreso y los mensajes de Artisan (R9) |

## Analyze

Pasada de `/speckit-analyze` sobre spec, plan y tasks, el 2026-10-28. Lo que encontró ya está corregido en los documentos.

- **Cobertura:** cada FR (FR-001 a FR-038) y cada SC (SC-001 a SC-009) tiene tarea y prueba («Cobertura de requisitos»). SC-005 es una medición de T016, como pide la spec.
- **Contradicciones resueltas en este plan:** la firma de `AuditPlan::programs` lee la muestra de la configuración (data-model.md decía `array $samples`); el texto separa lenguaje y sección con ` · por sección:`; los segundos van con dos decimales; `AuditReportText` es una clase aparte de `AuditReport`; el orden del comando valida el directorio antes del candado. data-model.md y el contrato del comando quedaron alineados con esto.
- **Resuelto en la misma pasada:** la causa de un programa que siguió ocupado o inalcanzable después de las rondas es `unavailable`, sin estado HTTP; data-model.md y el contrato decían `busy:503`.
- **Ambigüedades de la spec cerradas con una decisión:** qué es «árbol limpio» (`git status --porcelain` vacío, R8); qué excusa el `reparar` (sólo `compile_error` sin motivo, R13); cuántas veces se espera un 503 (10 rondas, R5); dónde se corre la muestra en una corrida parcial (sí por lenguaje, no por ejercicios, R15).
- **Constitución:** sin conflictos. El único cambio a código entregado (B2) es un refactor con su red de pruebas sin tocar.
