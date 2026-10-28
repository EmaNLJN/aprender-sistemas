# Modelo de datos: B3 · Auditoría local del currículo

**Fecha**: 2026-10-28 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Investigación**: [research.md](./research.md)

B3 no crea tablas ni escribe en la base (FR-012). Su modelo son: los tipos de PHP del módulo `App\Audit`, la regla que decide cada programa, el informe en JSON con formato versionado y el texto legible. El resumen para la descripción del PR está en [contracts/audit-summary.md](./contracts/audit-summary.md), y el comando y su entrada en [contracts/audit-command.md](./contracts/audit-command.md).

## Lo que se lee

Una sola `ContentSnapshot` (la transacción `REPEATABLE READ, READ ONLY` de C2) lee:

| Qué | De dónde | Para qué |
| --- | --- | --- |
| La última importación | `content_imports` (`ContentImports::latest()`): `document_hash`, `source_commit` y `portion_hashes.harness` | Los sellos `documentHash`, `contentSourceCommit` y `harnessHash` |
| Las plantillas | `harness_templates` (`language`, `template`) | El `template` de cada `ExerciseSnapshot` |
| Los ejercicios | `exercises` con `status = 'active'` y `language` en `rust` o `go`: `id`, `language`, `catalog`, `domain`, `kind`, `grading_hash`, `starter_hash`, `imports_json`, `starter`, `solution` | Lo que se audita, en el orden lenguaje (`rust`, `go`), sección (`lab`, `quests`, `cores`), dominio, posición e id |
| Las pruebas | `exercise_tests` con `status = 'active'` de esos ejercicios: `exercise_id`, `test_key`, `expression`, `position`, `label` | Las `ExpectedTest` en el orden de `position`, y la etiqueta para el informe |

Fuera de la instantánea, el comando lee `curriculum.meta.json` de la imagen (`config('content.path')`, con `ContentSource::fromDirectory`) para la guardia de R3.

## Los tipos de `App\Audit`

Todos `final`; los de datos, `readonly`. Las firmas son las que obligan; los cuerpos están en el [plan](./plan.md).

| Tipo | Forma | Responsabilidad |
| --- | --- | --- |
| `ExerciseKind` | enum `string`: `Completar = 'completar'`, `Reparar = 'reparar'` | El `kind` de `exercises` |
| `ProgramRole` | enum `string`: `Solution = 'solution'`, `Starter = 'starter'`; `label(): string` (`solución`, `inicial`) | Qué código lleva el programa |
| `AuditVerdict` | enum `string`: `Passes = 'passes'`, `FailsAsExpected = 'fails_as_expected'`, `Finding = 'finding'`, `NoVerdict = 'no_verdict'` | El veredicto de la auditoría |
| `FindingKind` | enum `string` con siete casos (ver «La regla»); `message(): string` en español | Qué no cumple |
| `CustomTestProbe` | `__construct(string $expression, TestOutcome $expected)` | Una prueba propia de la muestra (Q5) |
| `AuditedExercise` | `__construct(ExerciseSnapshot $snapshot, string $section, ?string $domain, ExerciseKind $kind, string $starterHash, string $starter, string $solution, list<string> $testLabels)`; `id(): string`; `code(ProgramRole $role): string` | Un ejercicio activo, con su `ExerciseSnapshot` de B2. `testLabels` va alineada con `snapshot->tests` |
| `AuditCatalog` | `__construct(string $documentHash, string $harnessHash, ?string $sourceCommit, list<AuditedExercise> $exercises)`; `find(string $id): ?AuditedExercise` | Lo que leyó una instantánea |
| `AuditCatalogReader` | `read(): AuditCatalog`, lanza `AuditRefused` | La lectura de sólo lectura (R2, R3) |
| `AuditSelection` | `__construct(list<RunLanguage> $languages, list<string> $exercises)`; `static fromOptions(?string $language, list<string> $exercises): self`; `isFull(): bool`; `includes(AuditedExercise $exercise): bool`; `requireKnown(AuditCatalog $catalog): void` | Qué se audita (FR-015) |
| `AuditProgram` | `__construct(AuditedExercise $exercise, ProgramRole $role, ?CustomTestProbe $customTest, ComposedProgram $composed, string $fingerprint)` | Un programa armado por B2, con su nonce nuevo y su huella |
| `AuditPlan` | `__construct(ProgramComposer $composer)`; `programs(AuditCatalog $catalog, AuditSelection $selection): list<AuditProgram>` (lee la muestra de `audit.custom_test_sample`); `const ZERO_NONCE` | Arma los programas (FR-002, FR-003, FR-034) |
| `AuditLimits` | `__construct(int $rustCompileMs, int $goCompileMs, int $runMs, int $compileMemoryMiB, int $runMemoryMiB, float $warningRatio)`; `static fromConfig(): self`; `compileMs(RunLanguage): int`; `memoryMiB(ExecutorPhase): int`; `isNear(PhaseTiming): bool` | Los límites del ADR 0005 y el umbral del aviso |
| `PhaseTiming` | `__construct(int $ms, int $limitMs)`; `marginMs(): int`; `ratio(): float` (tres decimales) | El tiempo de una fase contra su límite |
| `Diagnostic` | `static excerpt(?string $stderr, ?string $stdout): ?string` | Las primeras líneas del diagnóstico, recortadas |
| `JudgedProgram` | `static judged(...)`, `static noVerdict(AuditProgram, ExecutorReply)`; propiedades públicas (ver el plan, T006) | Un programa decidido, sin la salida cruda |
| `ProgramJudge` | `__construct(AuditLimits $limits)`; `judge(AuditProgram, ExecutorResult, Verdict): JudgedProgram` | La regla (FR-005 a FR-007, FR-022 a FR-025) |
| `HostStamps` | `__construct(?string $commit, ?bool $cleanTree, ?string $rustImage, ?string $goImage)`; `static fromOptions(mixed $commit, mixed $cleanTree, mixed $rustImage, mixed $goImage): self` | Los sellos que trae la entrada (FR-020) |
| `AuditRun` | `__construct(CarbonImmutable $startedAt, CarbonImmutable $finishedAt, string $runtime, string $instance, int $concurrency, AuditSelection $selection, HostStamps $host)` | Los datos de la corrida |
| `AuditReport` | `__construct(AuditRun, AuditCatalog, AuditLimits, list<JudgedProgram>)`; `toArray(): array<string, mixed>`; `json(): string`; `counts()`, `timing()`, `byLanguage()`, `bySection()`; `isGreen(): bool`; `isRecord(): bool`; `exitCode(): int` | El informe en JSON y sus números (FR-017, FR-019, FR-020, FR-026) |
| `AuditReportText` | `__construct(AuditReport $report, AuditLimits $limits)`; `lines(): list<string>` | El texto legible (FR-018, FR-022) |
| `ExecutorPreflight` | `__construct(ExecutorClient $client)`; `check(): void`, lanza `AuditRefused` | Alcanza a la instancia y prueba el token (FR-013) |
| `ExecutorDispatcher` | `__construct(ExecutorClient $client)`; `dispatch(array<string, AuditProgram> $programs, int $concurrency): array<string, ExecutorReply>` | El pool y las rondas (R4, R5) |
| `AuditLock` | `acquire(): void` (lanza `AuditRefused`), `release(): void` | Una corrida a la vez (R7) |
| `AuditRunner` | `__construct(ExecutorDispatcher $dispatcher, ResultClassifier $classifier)`; `run(list<AuditProgram> $programs, int $concurrency, AuditLimits $limits, Closure(int, int): void $progress): list<JudgedProgram>` | Las tandas: envía, clasifica con B2 y decide |
| `AuditRefused` | `RuntimeException` con constructores estáticos, uno por negativa | Los mensajes de FR-013 |

Puros (sin base, HTTP, cola, log ni caché; lo fija una prueba de arquitectura, T009): `ExerciseKind`, `ProgramRole`, `AuditVerdict`, `FindingKind`, `CustomTestProbe`, `AuditedExercise`, `AuditCatalog`, `AuditSelection`, `AuditProgram`, `AuditPlan`, `PhaseTiming`, `Diagnostic`, `JudgedProgram`, `ProgramJudge`, `HostStamps`, `AuditRun`, `AuditReport` y `AuditReportText`. `AuditLimits::fromConfig` y `AuditPlan` leen la configuración, nada más.

## La regla

Sobre el estado y el motivo de la clasificación de B2 (`ResultClassifier`, con el runtime de la instancia). El primero que aplica gana.

| # | Programa | Lo que dice B2 | Veredicto | `finding` |
| --- | --- | --- | --- | --- |
| 1 | Cualquiera | No hubo resultado válido: 500, conexión cortada o plazo vencido, cuerpo inválido, 400, 401, 413, o sigue ocupado o inalcanzable después de 10 rondas | `no_verdict` | — (va `noVerdictCause`) |
| 2 | Cualquiera | `timeout`, o motivo `oom`, o motivo `pids_limit` | `finding` | `limit_exceeded` |
| 3 | Solución | `passed`, sin prueba propia | `passes` | — |
| 4 | Solución con prueba propia (muestra) | `passed` y la prueba propia en lo esperado | `passes` | — |
| 5 | Solución con prueba propia (muestra) | `passed` y la prueba propia distinta de lo esperado (o `missing`) | `finding` | `custom_test_mismatch` |
| 6 | Solución | Cualquier otro estado (`failed`, con motivo o sin él, `compile_error`, `runtime_error`) | `finding` | `solution_not_passed` |
| 7 | Inicial | `failed` sin motivo (la evidencia completa y al menos una prueba en `fail`) | `fails_as_expected` | — |
| 8 | Inicial de un `reparar` | `compile_error` sin motivo | `fails_as_expected` | — |
| 9 | Inicial | `passed` | `finding` | `starter_passed` |
| 10 | Inicial | `failed` con motivo `evidence_invalid` u `output_limit` | `finding` | `starter_failed_without_tests` |
| 11 | Inicial de un `completar` | `compile_error` | `finding` | `starter_compile_error` |
| 12 | Inicial | `runtime_error` (motivo `signal` o sin motivo) | `finding` | `starter_runtime_error` |

`FindingKind::message()`, el texto de la línea legible:

| Caso | Valor | Mensaje |
| --- | --- | --- |
| `SolutionNotPassed` | `solution_not_passed` | la solución de referencia no aprueba |
| `StarterPassed` | `starter_passed` | las pruebas no detectan el código inicial |
| `StarterFailedWithoutTests` | `starter_failed_without_tests` | el código inicial falló sin que las pruebas lo dijeran |
| `StarterCompileError` | `starter_compile_error` | el código inicial no compila y el ejercicio no es de reparar |
| `StarterRuntimeError` | `starter_runtime_error` | el código inicial terminó con un error antes de mostrar las pruebas |
| `LimitExceeded` | `limit_exceeded` | agotó un límite del sandbox |
| `CustomTestMismatch` | `custom_test_mismatch` | la prueba propia no se informó como se esperaba |

**El aviso** (Q4, FR-022): un programa con veredicto `passes` o `fails_as_expected` suma `warning: true` si `compile.ms > compile.limitMs × 0,5` o, si llegó a ejecutarse, `run.ms > run.limitMs × 0,5`. No cambia el veredicto ni el código de salida. Un hallazgo o un programa sin veredicto nunca suma aviso.

**La corrida:**

- **en verde** si y sólo si no hay hallazgos ni programas sin veredicto; código de salida 0, y si no, 1 (FR-017);
- **de registro** si y sólo si es completa (los dos lenguajes, sin lista de ejercicios), el runtime es `runsc` y no hay programas sin veredicto. Una corrida de registro puede estar en rojo: es la que muestra los hallazgos.

## El informe en JSON (`taller-curriculum-audit-1`)

`/audit/report.json` (en el host, `qa/curriculum-audit/report.json`): UTF-8, `JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE`, con un salto de línea final. Las claves salen en este orden. Las fechas son UTC en ISO 8601 con milisegundos (`Y-m-d\TH:i:s.v\Z`). Un campo que no aplica es `null`, nunca se omite.

| Ruta | Tipo | Qué es |
| --- | --- | --- |
| `format` | texto | `taller-curriculum-audit-1`. Quitar o renombrar una clave cambia el número |
| `run.startedAt`, `run.finishedAt` | texto (fecha) | Inicio y fin (FR-026) |
| `run.durationMs` | entero | `finishedAt − startedAt` |
| `run.runtime` | `runsc` o `runc` | `config('runs.executor.runtime')`, el mismo que usa la clasificación |
| `run.instance` | texto | `config('audit.instance')`, la etiqueta de la instancia |
| `run.concurrency` | entero 1–8 | Programas simultáneos (FR-016) |
| `run.scope` | `full` o `partial` | `AuditSelection::isFull()` |
| `run.selection.languages` | lista de `rust`, `go` | Los lenguajes elegidos |
| `run.selection.exercises` | lista de ids | Los ejercicios elegidos; vacía si no se eligió ninguno |
| `run.record` | booleano | De registro (FR-017) |
| `run.verdict` | `green` o `red` | En verde |
| `run.exitCode` | 0 o 1 | El código con el que sale |
| `stamps.commit` | texto de 40 o 64 hex, o `null` | Del host (`--commit`) |
| `stamps.cleanTree` | booleano o `null` | Del host (`--clean-tree`) |
| `stamps.contentSourceCommit` | texto o `null` | `content_imports.source_commit` |
| `stamps.documentHash` | 64 hex | `content_imports.document_hash` |
| `stamps.harnessHash` | 64 hex | `content_imports.portion_hashes.harness` |
| `stamps.images.rust`, `stamps.images.go` | `sha256:` y 64 hex, o `null` | Del host (`--rust-image`, `--go-image`) |
| `limits.compileMs.rust`, `limits.compileMs.go` | entero | 20000 y 15000 |
| `limits.runMs` | entero | 10000 |
| `limits.compileMemoryMiB`, `limits.runMemoryMiB` | entero | 1024 y 256 |
| `limits.warningRatio` | número | 0.5 |
| `totals.programs` | entero | Programas corridos, con la muestra |
| `totals.solutions`, `totals.solutionsPass` | entero | Soluciones sin prueba propia, y las que aprueban |
| `totals.starters`, `totals.startersFailAsExpected` | entero | Iniciales, y los que fallan como corresponde |
| `totals.customTestSample`, `totals.customTestSamplePass` | entero | Programas de la muestra, y los que aprueban |
| `totals.findings`, `totals.noVerdict`, `totals.warnings` | entero | Hallazgos, sin veredicto y avisos |
| `totals.byLanguage.<lenguaje>` | `{exercises, programs}` | Por cada lenguaje elegido (FR-001) |
| `totals.bySection.<sección>` | `{exercises}` | Por cada sección con ejercicios auditados: `lab`, `quests`, `cores` |
| `totals.timing.<lenguaje>.compile`, `.run` | `{programs, medianMs, maxMs, minMarginMs, limitMs}` o `null` | Sobre los programas con veredicto de ese lenguaje que tienen esa fase (SC-005). La mediana de una cantidad par es el promedio de los dos del medio, truncado a entero |
| `programs[]` | lista | Un objeto por programa, en el orden en que se armaron: ejercicios (solución y después inicial) y al final la muestra |

Cada elemento de `programs`:

| Clave | Tipo | Qué es |
| --- | --- | --- |
| `exercise`, `language`, `section`, `domain`, `kind` | texto (`domain` puede ser `null`) | Del ejercicio |
| `role` | `solution` o `starter` | |
| `gradingHash`, `starterHash` | 64 hex | Del ejercicio (FR-020) |
| `programHash` | 64 hex | sha256 del programa armado con el nonce de ceros (FR-020) |
| `customTest` | `{expression, expected, outcome}` o `null` | Sólo en la muestra; `outcome` es `pass`, `fail`, `missing` o `null` sin veredicto |
| `status`, `reason` | los valores de B2, o `null` | `null` sin veredicto |
| `phase`, `exitCode` | `compile`/`run` y entero, o `null` | Del ejecutor |
| `tests` | lista de `{key, label, outcome}` | Una por prueba esperada si se leyó la evidencia (estados `passed` y `failed`); vacía si no. La clave siempre es texto, aunque sean dígitos |
| `compile` | `{ms, limitMs, marginMs, ratio}` o `null` | La compilación contra su límite |
| `run` | igual, o `null` | Sólo si `phase` es `run` |
| `truncated`, `oomKilled` | booleano o `null` | Del ejecutor (FR-023: la memoria, sólo si se agotó) |
| `memoryLimitMiB` | entero o `null` | El límite de la fase alcanzada (1024 al compilar, 256 al ejecutar) |
| `audit` | `passes`, `fails_as_expected`, `finding` o `no_verdict` | El veredicto |
| `finding` | un valor de `FindingKind` o `null` | |
| `warning` | booleano | |
| `noVerdictCause` | texto o `null` | `<causa>` o `<causa>:<estado HTTP>`: `status:500`, `invalid_body:200`, `connection`, o `unavailable` si siguió ocupado o inalcanzable después de las 10 rondas |
| `diagnostic` | texto o `null` | Sólo en hallazgos y sin veredicto: hasta ocho líneas no vacías de `stderr` (o de `stdout` si `stderr` no tiene), sin las líneas de los marcadores (`__TALLER_`), cada una recortada a 200 caracteres con `…` |

El informe no lleva el token ni la salida completa de ningún programa (FR-021).

### El ejemplo escrito a mano

Es el contrato del formato: T001 lo guarda tal cual en `qa/fixtures/shared/audit-report-example.json`. Lo leen Pest (las claves y su orden, T009) y el formateador del resumen (T012). Es una corrida parcial de Rust con dos ejercicios y la muestra: `rust-63` todavía no compila, y su solución compila cerca de la mitad del límite. Las huellas son de relleno.

```json
{
  "format": "taller-curriculum-audit-1",
  "run": {
    "startedAt": "2026-11-02T03:00:00.000Z",
    "finishedAt": "2026-11-02T03:00:09.500Z",
    "durationMs": 9500,
    "runtime": "runsc",
    "instance": "auditoria",
    "concurrency": 4,
    "scope": "partial",
    "selection": {
      "languages": ["rust"],
      "exercises": []
    },
    "record": false,
    "verdict": "red",
    "exitCode": 1
  },
  "stamps": {
    "commit": "dd870a9ccb7cb50b8b06b584bcf988acaccbf22e",
    "cleanTree": true,
    "contentSourceCommit": null,
    "documentHash": "4555e8500e6ef5bd38cdaf46010d3f14e3345d7ec0c69aea983acfe67f62fbb6",
    "harnessHash": "6a86d9fef4cbeebd95703a6e239f08d885071dc7a122a7ca25883d953457a6fa",
    "images": {
      "rust": "sha256:f525ccf76aec49d19b686a8d4cff8baad441ef2f30a0688c74d1a3905c17c356",
      "go": "sha256:e66df8bf3b16022cc6426093be100ba59c09e2eaff9b88d492166e35f0a756b7"
    }
  },
  "limits": {
    "compileMs": {
      "rust": 20000,
      "go": 15000
    },
    "runMs": 10000,
    "compileMemoryMiB": 1024,
    "runMemoryMiB": 256,
    "warningRatio": 0.5
  },
  "totals": {
    "programs": 6,
    "solutions": 2,
    "solutionsPass": 2,
    "starters": 2,
    "startersFailAsExpected": 1,
    "customTestSample": 2,
    "customTestSamplePass": 2,
    "findings": 1,
    "noVerdict": 0,
    "warnings": 1,
    "byLanguage": {
      "rust": {
        "exercises": 2,
        "programs": 6
      }
    },
    "bySection": {
      "lab": {
        "exercises": 2
      }
    },
    "timing": {
      "rust": {
        "compile": {
          "programs": 6,
          "medianMs": 808,
          "maxMs": 11000,
          "minMarginMs": 9000,
          "limitMs": 20000
        },
        "run": {
          "programs": 5,
          "medianMs": 34,
          "maxMs": 40,
          "minMarginMs": 9960,
          "limitMs": 10000
        }
      }
    }
  },
  "programs": [
    {
      "exercise": "rust-01",
      "language": "rust",
      "section": "lab",
      "domain": null,
      "kind": "completar",
      "role": "solution",
      "gradingHash": "1111111111111111111111111111111111111111111111111111111111111111",
      "starterHash": "2222222222222222222222222222222222222222222222222222222222222222",
      "programHash": "3333333333333333333333333333333333333333333333333333333333333333",
      "customTest": null,
      "status": "passed",
      "reason": null,
      "phase": "run",
      "exitCode": 0,
      "tests": [
        { "key": "t1", "label": "Tres celdas", "outcome": "pass" },
        { "key": "t2", "label": "Reactor vacío", "outcome": "pass" },
        { "key": "t3", "label": "Escala distinta", "outcome": "pass" }
      ],
      "compile": { "ms": 812, "limitMs": 20000, "marginMs": 19188, "ratio": 0.041 },
      "run": { "ms": 34, "limitMs": 10000, "marginMs": 9966, "ratio": 0.003 },
      "truncated": false,
      "oomKilled": false,
      "memoryLimitMiB": 256,
      "audit": "passes",
      "finding": null,
      "warning": false,
      "noVerdictCause": null,
      "diagnostic": null
    },
    {
      "exercise": "rust-01",
      "language": "rust",
      "section": "lab",
      "domain": null,
      "kind": "completar",
      "role": "starter",
      "gradingHash": "1111111111111111111111111111111111111111111111111111111111111111",
      "starterHash": "2222222222222222222222222222222222222222222222222222222222222222",
      "programHash": "4444444444444444444444444444444444444444444444444444444444444444",
      "customTest": null,
      "status": "failed",
      "reason": null,
      "phase": "run",
      "exitCode": 0,
      "tests": [
        { "key": "t1", "label": "Tres celdas", "outcome": "fail" },
        { "key": "t2", "label": "Reactor vacío", "outcome": "fail" },
        { "key": "t3", "label": "Escala distinta", "outcome": "fail" }
      ],
      "compile": { "ms": 792, "limitMs": 20000, "marginMs": 19208, "ratio": 0.04 },
      "run": { "ms": 31, "limitMs": 10000, "marginMs": 9969, "ratio": 0.003 },
      "truncated": false,
      "oomKilled": false,
      "memoryLimitMiB": 256,
      "audit": "fails_as_expected",
      "finding": null,
      "warning": false,
      "noVerdictCause": null,
      "diagnostic": null
    },
    {
      "exercise": "rust-63",
      "language": "rust",
      "section": "lab",
      "domain": null,
      "kind": "completar",
      "role": "solution",
      "gradingHash": "5555555555555555555555555555555555555555555555555555555555555555",
      "starterHash": "6666666666666666666666666666666666666666666666666666666666666666",
      "programHash": "7777777777777777777777777777777777777777777777777777777777777777",
      "customTest": null,
      "status": "passed",
      "reason": null,
      "phase": "run",
      "exitCode": 0,
      "tests": [
        { "key": "t1", "label": "Expresiones y coma opcional", "outcome": "pass" },
        { "key": "t2", "label": "Sin argumentos", "outcome": "pass" },
        { "key": "t3", "label": "Efecto una vez", "outcome": "pass" }
      ],
      "compile": { "ms": 11000, "limitMs": 20000, "marginMs": 9000, "ratio": 0.55 },
      "run": { "ms": 40, "limitMs": 10000, "marginMs": 9960, "ratio": 0.004 },
      "truncated": false,
      "oomKilled": false,
      "memoryLimitMiB": 256,
      "audit": "passes",
      "finding": null,
      "warning": true,
      "noVerdictCause": null,
      "diagnostic": null
    },
    {
      "exercise": "rust-63",
      "language": "rust",
      "section": "lab",
      "domain": null,
      "kind": "completar",
      "role": "starter",
      "gradingHash": "5555555555555555555555555555555555555555555555555555555555555555",
      "starterHash": "6666666666666666666666666666666666666666666666666666666666666666",
      "programHash": "8888888888888888888888888888888888888888888888888888888888888888",
      "customTest": null,
      "status": "compile_error",
      "reason": null,
      "phase": "compile",
      "exitCode": 1,
      "tests": [],
      "compile": { "ms": 640, "limitMs": 20000, "marginMs": 19360, "ratio": 0.032 },
      "run": null,
      "truncated": false,
      "oomKilled": false,
      "memoryLimitMiB": 1024,
      "audit": "finding",
      "finding": "starter_compile_error",
      "warning": false,
      "noVerdictCause": null,
      "diagnostic": "error[E0277]: can't compare `!` with `i32`\n --> /tmp/main.rs:12:57"
    },
    {
      "exercise": "rust-01",
      "language": "rust",
      "section": "lab",
      "domain": null,
      "kind": "completar",
      "role": "solution",
      "gradingHash": "1111111111111111111111111111111111111111111111111111111111111111",
      "starterHash": "2222222222222222222222222222222222222222222222222222222222222222",
      "programHash": "9999999999999999999999999999999999999999999999999999999999999999",
      "customTest": { "expression": "energia(5) == 35", "expected": "pass", "outcome": "pass" },
      "status": "passed",
      "reason": null,
      "phase": "run",
      "exitCode": 0,
      "tests": [
        { "key": "t1", "label": "Tres celdas", "outcome": "pass" },
        { "key": "t2", "label": "Reactor vacío", "outcome": "pass" },
        { "key": "t3", "label": "Escala distinta", "outcome": "pass" }
      ],
      "compile": { "ms": 805, "limitMs": 20000, "marginMs": 19195, "ratio": 0.04 },
      "run": { "ms": 33, "limitMs": 10000, "marginMs": 9967, "ratio": 0.003 },
      "truncated": false,
      "oomKilled": false,
      "memoryLimitMiB": 256,
      "audit": "passes",
      "finding": null,
      "warning": false,
      "noVerdictCause": null,
      "diagnostic": null
    },
    {
      "exercise": "rust-01",
      "language": "rust",
      "section": "lab",
      "domain": null,
      "kind": "completar",
      "role": "solution",
      "gradingHash": "1111111111111111111111111111111111111111111111111111111111111111",
      "starterHash": "2222222222222222222222222222222222222222222222222222222222222222",
      "programHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "customTest": { "expression": "energia(5) == 36", "expected": "fail", "outcome": "fail" },
      "status": "passed",
      "reason": null,
      "phase": "run",
      "exitCode": 0,
      "tests": [
        { "key": "t1", "label": "Tres celdas", "outcome": "pass" },
        { "key": "t2", "label": "Reactor vacío", "outcome": "pass" },
        { "key": "t3", "label": "Escala distinta", "outcome": "pass" }
      ],
      "compile": { "ms": 818, "limitMs": 20000, "marginMs": 19182, "ratio": 0.041 },
      "run": { "ms": 36, "limitMs": 10000, "marginMs": 9964, "ratio": 0.004 },
      "truncated": false,
      "oomKilled": false,
      "memoryLimitMiB": 256,
      "audit": "passes",
      "finding": null,
      "warning": false,
      "noVerdictCause": null,
      "diagnostic": null
    }
  ]
}
```

## El texto legible

`AuditReportText::lines()` devuelve las líneas; el comando las imprime y las escribe en `/audit/report.txt`. Los números van con coma decimal; los segundos, con dos decimales. Primero una línea por hallazgo, después una por programa sin veredicto, después una por aviso, y al final el resumen. Cada línea de programa empieza con su marca y se separa con ` · `:

```text
HALLAZGO · <id> (<lenguaje>, <sección>, <kind>) · <solución|inicial> · <estado>[ · <motivo>[ <señal>]] · <mensaje de FindingKind>
    pruebas: <clave> «<etiqueta>» <fail|missing>; …            (sólo si alguna prueba no está en pass)
    prueba propia: esperada <pass|fail>, informada <pass|fail|missing>   (sólo custom_test_mismatch)
    diagnóstico:
      <línea>
SIN VEREDICTO · <id> (<lenguaje>, <sección>, <kind>) · <solución|inicial> · el ejecutor no devolvió un resultado válido (<noVerdictCause>): es un problema del sandbox, no del contenido
AVISO · <id> (<lenguaje>, <sección>, <kind>) · <solución|inicial> · <compilar|ejecutar> <s> s de <s> s (<n> %)
```

`<señal>` es `exitCode − 128` cuando el motivo es `signal` (por ejemplo `runtime_error · signal 6`). El resumen:

```text
Auditoría del currículo · <completa|parcial> · runtime <runsc|runc> · instancia <instancia> · <n> programas simultáneos
Inicio <AAAA-MM-DD HH:MM:SS> UTC · fin <HH:MM:SS> UTC · <duración>
Programas: <n> · soluciones que aprueban: <a> de <b> · iniciales que fallan como corresponde: <c> de <d> · muestra de la prueba propia: <e> de <f>
Hallazgos: <n> · avisos: <n> · sin veredicto: <n>
Tiempos (incluyen el arranque del contenedor):
  <lenguaje> compilar: mediana <s> s · máximo <s> s · margen mínimo <s> s de <s> s
  <lenguaje> ejecutar: mediana <s> s · máximo <s> s · margen mínimo <s> s de <s> s
Por lenguaje: <lenguaje> <n> ejercicios · … · por sección: <sección> <n> · …
De registro: <sí|no (<motivos>)> · veredicto: <verde|rojo>
```

`<duración>` es `<m> min <s> s`, o `<s> s` si dura menos de un minuto. Los motivos de «De registro: no» se unen con `; `: `corrida parcial`, `runtime runc: con runc un 137 es la señal 9 y el --pids-limit no se confirma`, `hay programas sin veredicto`. La línea de una fase sin programas no se imprime.
