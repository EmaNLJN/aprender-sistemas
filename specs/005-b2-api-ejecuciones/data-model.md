# Data Model: B2 · API de ejecuciones

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Investigación**: [research.md](./research.md)

Los tipos de columna salen del [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (§5.3, §5.4 y D26 a D29). El DDL de abajo es el **de referencia, sin ejecutar** (el host no tiene MySQL ni se usó Docker al planificar): las migraciones lo escriben con un único `CREATE TABLE` por archivo (D35) y la prueba de esquema lo contrasta con las listas de columnas de las tablas «Las columnas», que salen del ADR y no del DDL.

Lo que B2 crea: seis tablas de usuario (`progress_heads`, `attempts`, `attempt_tests`, `attempt_payloads`, `runs` y `exercise_progress`) y una de contenido, `harness_templates`, que es la 22.ª tabla de contenido. Cada una nace completa: se migra sólo hacia adelante y un `down()` destruiría evidencia (ADR 0006 §10).

## Convenciones que se heredan

- **Tiempo:** `DATETIME(3)` en UTC. PHP manda cada hora como binding `Y-m-d H:i:s.v`, tomada del reloj del servidor (`Instant::format`); nunca `NOW()` de MySQL.
- **Claves y colaciones:** IDs, hashes y estados en `ascii_bin`; código, salidas y texto de prueba en `utf8mb4_0900_bin` (NO PAD: igualdad byte a byte); la prosa, con la colación de la conexión.
- **Conjuntos:** `ENUM` para los cerrados (estado, lenguaje, resultado); `reason` es `VARCHAR(32)` que valida el enum de PHP `RunReason`, porque crece (D05).
- **Sin `CHECK` sobre columnas `DATETIME` en las tablas que crecen** (`runs`, `attempts`, `exercise_progress`): C2 midió en MySQL 9.7.2 que ampliar un ENUM con un CHECK sobre DATETIME en la tabla falla (error 1845). Esas reglas quedan en el escritor y en su prueba (sección 2). Los CHECK que no tocan fechas sí van en la tabla.
- **Sin FK de los punteros** `exercise_progress.proof_attempt_id` y `last_attempt_id` hacia `attempts`, ni de `attempts` hacia `exercise_grading_versions` (D29): cada FK costaría un índice que se actualiza en cada cierre. El cierre escribe los punteros dentro de la transacción que insertó el intento, y una prueba de esquema busca punteros cruzados entre cuentas.
- **Restricción referencial:** `ON DELETE CASCADE` desde `users`; `RESTRICT` hacia el contenido, que nunca se borra; `ON UPDATE RESTRICT` siempre.

## 1. Las tablas

### 1.1 `progress_heads`

Una fila por cuenta, que se crea en el primer uso. Es el candado por cuenta (D08): lo toman la admisión, el reclamo, el cierre, la cancelación y, desde D1, la sincronización, la importación y el reset. La crea y la toma un único código, `App\Progress\AccountLock`, que D1 reutiliza.

```sql
CREATE TABLE `progress_heads` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `epoch` INT UNSIGNED NOT NULL DEFAULT 1,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `reset_at` DATETIME(3) NULL,
  `last_activity_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `progress_heads_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

### 1.2 `exercise_progress`

Como mucho 274 filas por cuenta (más Esenciales, en E1). B2 la crea **con todas las columnas del ADR**, también las que sólo escribirá D1, para que D1 no tenga que alterarla (D28). B2 sólo escribe las diez columnas de la «parte de B2» que marca la tabla de la sección 6.

```sql
CREATE TABLE `exercise_progress` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `solved_at` DATETIME(3) NULL,
  `server_solved_at` DATETIME(3) NULL,
  `proof_attempt_id` BIGINT UNSIGNED NULL,
  `proof_at` DATETIME(3) NULL,
  `last_attempt_id` BIGINT UNSIGNED NULL,
  `last_attempt_at` DATETIME(3) NULL,
  `attempt_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `prediction_answer` TINYINT UNSIGNED NULL,
  `prediction_answer_set_at` DATETIME(3) NULL,
  `prediction_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `prediction_correct_at` DATETIME(3) NULL,
  `assisted` TINYINT(1) NOT NULL DEFAULT 0,
  `solution_seen` TINYINT(1) NOT NULL DEFAULT 0,
  `hints_revealed` TINYINT UNSIGNED NULL,
  `legacy_attempts` BIGINT UNSIGNED NULL,
  `reflection` TEXT NULL,
  `reflection_set_at` DATETIME(3) NULL,
  `custom_test` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
  `custom_test_set_at` DATETIME(3) NULL,
  `confidence` ENUM('again','practice','confident') CHARACTER SET ascii COLLATE ascii_bin NULL,
  `reviewed_at` DATETIME(3) NULL,
  `review_due_at` DATETIME(3) NULL,
  `review_set_at` DATETIME(3) NULL,
  `revision` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `exercise_id`),
  KEY `exercise_progress_exercise_id_solved_at_index` (`exercise_id`, `solved_at`),
  KEY `exercise_progress_user_id_revision_index` (`user_id`, `revision`),
  CONSTRAINT `exercise_progress_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `exercise_progress_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `exercise_progress_flags_check` CHECK (`prediction_correct` IN (0, 1) AND `assisted` IN (0, 1) AND `solution_seen` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

### 1.3 `attempts`

Permanente, inmutable y liviana: se borra sólo con la cuenta. Una fila por ejecución cerrada. La columna `counted` es la **única definición de «cuenta como intento»** (FR-029): un intento que no es legado y terminó en `passed`, `failed`, `compile_error`, `runtime_error` o `timeout`.

```sql
CREATE TABLE `attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `epoch` INT UNSIGNED NOT NULL,
  `legacy` TINYINT(1) NOT NULL DEFAULT 0,
  `outcome` ENUM('passed','failed','compile_error','runtime_error','timeout','infra_error','canceled','legacy_error') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `grading_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `code_sha256` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `custom_outcome` ENUM('pass','fail','missing') CHARACTER SET ascii COLLATE ascii_bin NULL,
  `output_truncated` TINYINT(1) NOT NULL DEFAULT 0,
  `executor_phase` ENUM('compile','run') CHARACTER SET ascii COLLATE ascii_bin NULL,
  `exit_code` SMALLINT NULL,
  `compile_ms` INT UNSIGNED NULL,
  `run_ms` INT UNSIGNED NULL,
  `attempted_at` DATETIME(3) NOT NULL,
  `started_at` DATETIME(3) NULL,
  `finished_at` DATETIME(3) NOT NULL,
  `counted` TINYINT(1) GENERATED ALWAYS AS (`legacy` = 0 AND `outcome` IN ('passed','failed','compile_error','runtime_error','timeout')) VIRTUAL,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `attempts_user_id_exercise_id_attempted_at_index` (`user_id`, `exercise_id`, `attempted_at`),
  KEY `attempts_exercise_id_attempted_at_outcome_index` (`exercise_id`, `attempted_at`, `outcome`),
  CONSTRAINT `attempts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `attempts_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `attempts_grading_hash_check` CHECK (`legacy` = 1 OR `grading_hash` IS NOT NULL),
  CONSTRAINT `attempts_code_sha256_check` CHECK (REGEXP_LIKE(`code_sha256`, '^[0-9a-f]{64}$', 'c'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`legacy` y `legacy_error` son de la importación de D1: B2 nunca los escribe. `attempted_at` es la aceptación del envío. El `grading_hash` es el que se leyó en el mismo snapshot que las pruebas, no el vigente al cerrar.

### 1.4 `attempt_tests`

El veredicto de cada prueba esperada. No hay filas cuando no se leyó evidencia.

```sql
CREATE TABLE `attempt_tests` (
  `attempt_id` BIGINT UNSIGNED NOT NULL,
  `test_key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NOT NULL,
  `outcome` ENUM('pass','fail','missing') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`attempt_id`, `test_key`),
  KEY `attempt_tests_exercise_id_test_key_outcome_index` (`exercise_id`, `test_key`, `outcome`),
  CONSTRAINT `attempt_tests_attempt_id_foreign` FOREIGN KEY (`attempt_id`) REFERENCES `attempts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `attempt_tests_exercise_id_test_key_foreign` FOREIGN KEY (`exercise_id`, `test_key`) REFERENCES `exercise_tests` (`exercise_id`, `test_key`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

`exercise_id` es una copia de `attempts.exercise_id`, que el cierre escribe en la misma sentencia: la FK compuesta hacia `exercise_tests` lo necesita. Una prueba retirada sigue en `exercise_tests` (el contenido se retira, no se borra), así que la FK se cumple siempre.

### 1.5 `attempt_payloads`

El código, la prueba propia y las salidas recortadas de un intento, con retención propia (FR-030, FR-044).

```sql
CREATE TABLE `attempt_payloads` (
  `attempt_id` BIGINT UNSIGNED NOT NULL,
  `code` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `custom_test` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
  `stdout` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `stderr` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`attempt_id`),
  KEY `attempt_payloads_created_at_index` (`created_at`),
  CONSTRAINT `attempt_payloads_attempt_id_foreign` FOREIGN KEY (`attempt_id`) REFERENCES `attempts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

El cierre recorta `stdout` a 12.000 caracteres y `stderr` a 18.000 (los recortes de `lab.js`), con `mb_substr`: 12.000 caracteres caben en un `TEXT` (a lo sumo 48.000 bytes).

### 1.6 `runs`

Operativa: se modifica hasta su estado final y se poda a los 14 días. Su `id` es un UUIDv7 en texto (el orden de texto es el temporal, así que la poda recorre la clave primaria).

```sql
CREATE TABLE `runs` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `client_run_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `exercise_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `language` ENUM('rust','go') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `epoch` INT UNSIGNED NOT NULL,
  `grading_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `expected_tests` VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `nonce` CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `code` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  `custom_test` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
  `program` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
  `status` ENUM('queued','running','passed','failed','compile_error','runtime_error','timeout','infra_error','canceled') CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'queued',
  `reason` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `executor_phase` ENUM('compile','run') CHARACTER SET ascii COLLATE ascii_bin NULL,
  `exit_code` SMALLINT NULL,
  `truncated` TINYINT(1) NULL,
  `compile_ms` INT UNSIGNED NULL,
  `run_ms` INT UNSIGNED NULL,
  `stdout` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
  `stderr` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NULL,
  `attempt_id` BIGINT UNSIGNED NULL,
  `cancel_requested_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `started_at` DATETIME(3) NULL,
  `finished_at` DATETIME(3) NULL,
  `expires_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `runs_user_id_client_run_id_unique` (`user_id`, `client_run_id`),
  UNIQUE KEY `runs_attempt_id_unique` (`attempt_id`),
  KEY `runs_user_id_created_at_index` (`user_id`, `created_at`),
  KEY `runs_status_created_at_index` (`status`, `created_at`),
  KEY `runs_exercise_id_index` (`exercise_id`),
  CONSTRAINT `runs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `runs_exercise_id_foreign` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `runs_attempt_id_foreign` FOREIGN KEY (`attempt_id`) REFERENCES `attempts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `runs_client_run_id_check` CHECK (REGEXP_LIKE(`client_run_id`, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'c'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

No lleva `updated_at`. `expires_at` es el vencimiento **de una ejecución activa** (en cola: la aceptación más 600 s; corriendo: el reclamo más 140 s) y es `NULL` al cerrar; la retención de 14 días no sale de ella sino del UUIDv7. `attempt_id` apunta al intento que dejó el cierre: relación 1:1, con `CASCADE` desde el intento (borrar una cuenta lo recorre).

### 1.7 `harness_templates` (contenido)

La plantilla de cada lenguaje, que `content:import` escribe como cualquier tabla de contenido: sin ciclo de vida (un lenguaje siempre tiene la suya, como `languages`), con la clave primaria como única clave, y a continuación de `languages` en `ContentTables::KEYS` (su FK apunta a ella).

```sql
CREATE TABLE `harness_templates` (
  `language` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `template` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
  PRIMARY KEY (`language`),
  CONSTRAINT `harness_templates_language_foreign` FOREIGN KEY (`language`) REFERENCES `languages` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

El invariante «cada lenguaje tiene su plantilla» (`select 1 from languages l left join harness_templates h on h.language = l.code where h.language is null`) entra en `ContentInvariants`.

## 2. Lo que no va en una restricción de la tabla (D07) y quién lo garantiza

Son las reglas de fila que antes eran `CHECK` sobre fechas. Las garantiza el escritor, y la prueba `RunInvariants` (una consulta por regla, en `tests/Support/`) corre al final de cada prueba que toca `runs`:

| Regla | La garantiza |
| --- | --- |
| `status` en `queued` o `running` ⇔ `finished_at` es `NULL` ⇔ `expires_at` no es `NULL` | `RunAdmission`, `RunClaimer`, `RunRequeuer` y `RunCloser` |
| `status = 'running'` ⇒ `started_at` no es `NULL` | `RunClaimer` |
| Una ejecución terminal tiene `program` en `NULL` y `attempt_id` | `RunCloser` |
| Una ejecución activa no tiene `attempt_id` | `RunCloser` es el único que lo escribe |
| `attempt_count` de cada fila = intentos que cuentan de su época (`SUM(attempts.counted)` con la misma `epoch`) | `RunCloser` |
| Ninguna fila con `revision` 0 si la escribió un cierre, y cada fila que un cierre cambió lleva la revisión que ese cierre dejó en la cabecera | `RunCloser` |
| Los punteros de `exercise_progress` apuntan a intentos de la misma cuenta y del mismo ejercicio | `RunCloser` (los escribe en la transacción que insertó el intento) |
| `solved_at` y `server_solved_at` sólo bajan; `proof_*` y `last_*` sólo avanzan por `(attempted_at, id)` | `ProgressMerge` |

## 3. Una ejecución, de la admisión al cierre

| Desde | Hasta | Quién | Qué escribe |
| --- | --- | --- | --- |
| — | `queued` | `RunAdmission` | la fila de `runs` (con el programa armado y `expires_at` = aceptación + 600 s), el trabajo en `jobs` y, en el primer uso, la cabecera |
| `queued` | `running` | `RunClaimer` | `status`, `started_at` y `expires_at` = reclamo + 140 s |
| `queued` | `canceled` | `RunCanceller`, o `RunClaimer` si la cuenta ya no está activa (`account_disabled`) | el cierre |
| `queued` | `infra_error` (`expired`) | `RunClaimer` o `RunExpiry`, si pasaron los 600 s | el cierre |
| `running` | `queued` | `RunRequeuer`, si el ejecutor estaba ocupado o no se lo alcanzó y la aceptación no pasó los 600 s | `status`, `started_at` en `NULL`, `expires_at` = aceptación + 600 s, y un trabajo nuevo con demora |
| `running` | un estado final | `RunCloser`, con el veredicto del clasificador | el cierre |
| `running` | `infra_error` | `RunCloser` por `executor_error`, `executor_busy` (pasados los 600 s) o `job_failed`; `RunExpiry` por `expired` | el cierre |
| `running` | `running` | `RunCanceller`, si el dueño cancela | `cancel_requested_at`; el cierre posterior sale `canceled` |
| un estado final | — | nadie | inmutable, salvo la poda |

**El cierre** (`RunCloser`) es una transacción corta que, con la cabecera tomada y en este orden (D08), relee la ejecución `FOR UPDATE`, descarta el cierre si ya no está activa, inserta el intento, sus veredictos y su payload, actualiza `runs` (estado, motivo, fase, salida completa, tiempos, `attempt_id`, `finished_at`; `program` y `expires_at` en `NULL`) y, sólo si corresponde, el progreso. Si `cancel_requested_at` no es `NULL`, el veredicto pasa a `canceled` sea cual sea lo que informó el sandbox.

### Los efectos del cierre según el resultado

| Resultado | Intento (`counted`) | Veredictos | Payload | Progreso de la época vigente | Revisión de la cabecera |
| --- | --- | --- | --- | --- | --- |
| `passed` | sí (1) | sí | sí | `solved_at` y `server_solved_at` (la más temprana), `proof_*`, `last_*`, `attempt_count` + 1 | sube |
| `failed` | sí (1) | sí si el programa terminó con código 0 | sí | `last_*`, `attempt_count` + 1 | sube |
| `compile_error`, `runtime_error`, `timeout` | sí (1) | no | sí | `last_*`, `attempt_count` + 1 | sube |
| `infra_error` | no (0) | no | sí | `last_*` (es un intento no cancelado), `attempt_count` sin cambio | sube |
| `canceled` | no (0) | no | sí | nada | no sube |
| Cualquiera, con la época de la ejecución distinta de la vigente | según el resultado | según el resultado | sí | nada: queda como historia | no sube |

Las fechas que se comparan y se guardan en el progreso (`solved_at`, `server_solved_at`, `proof_at`, `last_attempt_at`) son siempre la `attempted_at` del intento (la aceptación del envío), así que `(attempted_at, id)` ordena de la misma manera los punteros y las fechas. `infra_error` mueve `last_*` porque el ADR 0006 excluye de ese puntero sólo a los intentos cancelados (R10).

## 4. La parte de `exercise_progress` que escribe B2

El cierre lee la fila con `SELECT … FOR UPDATE` (bajo la cabecera, así que nadie más la toca), calcula en PHP con la función pura `ProgressMerge::afterAttempt` y escribe **sólo estas columnas**, con un `INSERT … AS n ON DUPLICATE KEY UPDATE` (alias de fila, D09): `solved_at`, `server_solved_at`, `proof_attempt_id`, `proof_at`, `last_attempt_id`, `last_attempt_at`, `attempt_count`, `revision` y `updated_at`. Las demás columnas (las de D1) toman su valor por omisión al insertar y no se tocan al actualizar. `revision` lleva la revisión nueva de la cuenta, la misma que queda en `progress_heads`: así el delta de `POST /api/sync` (`revision` mayor que la conocida, por el índice `(user_id, revision)`) ve lo que cerró una ejecución.

## 5. Los tipos de PHP: el contrato entre los dueños

Firmas exactas, con los tipos que pide el nivel 9 de PHPStan. Cada una la entrega el dueño que dice [plan.md](./plan.md) y la usan los demás sin cambiarla.

```php
namespace App\Runs;

enum RunStatus: string      // Queued, Running, Passed, Failed, CompileError, RuntimeError, Timeout, InfraError, Canceled
{
    public function isActive(): bool;          // Queued o Running
    public function countsAsAttempt(): bool;   // Passed, Failed, CompileError, RuntimeError o Timeout (FR-029)
}
enum RunReason: string      // Oom, Signal, PidsLimit, OutputLimit, EvidenceInvalid, ExecutorBusy, ExecutorError, JobFailed, Expired, AccountDisabled
enum RunLanguage: string    // Rust = 'rust', Go = 'go'
enum ExecutorPhase: string  // Compile = 'compile', Run = 'run'
enum TestOutcome: string    // Pass = 'pass', Fail = 'fail', Missing = 'missing'
enum CancelOutcome          // Canceled, Requested, Unchanged, NotFound

namespace App\Runs\Record;

final class Instant
{
    public static function now(): CarbonImmutable;                      // now()->utc()->toImmutable()
    public static function parse(string $value): CarbonImmutable;       // un DATETIME(3) de MySQL, en UTC
    public static function format(CarbonImmutable $at): string;         // 'Y-m-d H:i:s.v'
}

final readonly class RunRow     // una fila de `runs`; sale de `fromRow`, nunca de arreglos sueltos
{
    /** @param list<string> $expectedTests */
    public function __construct(
        public string $id, public int $userId, public string $clientRunId, public string $exerciseId,
        public RunLanguage $language, public int $epoch, public string $gradingHash,
        public array $expectedTests, public string $nonce, public string $code, public ?string $customTest,
        public ?string $program, public RunStatus $status, public ?RunReason $reason,
        public ?ExecutorPhase $phase, public ?int $exitCode, public ?bool $truncated,
        public ?int $compileMs, public ?int $runMs, public ?string $stdout, public ?string $stderr,
        public ?int $attemptId, public ?CarbonImmutable $cancelRequestedAt, public CarbonImmutable $createdAt,
        public ?CarbonImmutable $startedAt, public ?CarbonImmutable $finishedAt, public ?CarbonImmutable $expiresAt,
    ) {}

    /** @param array<string, mixed> $row */
    public static function fromRow(array $row): self;     // con App\Content\Record\RowFields, que ya lee filas del driver
}

final readonly class RunProgress   // las columnas de `exercise_progress` que escribe el cierre
{
    public function __construct(
        public int $userId, public string $exerciseId, public ?CarbonImmutable $solvedAt,
        public ?CarbonImmutable $serverSolvedAt, public ?int $proofAttemptId, public ?CarbonImmutable $proofAt,
        public ?int $lastAttemptId, public ?CarbonImmutable $lastAttemptAt, public int $attemptCount, public int $revision,
    ) {}
    /** @param array<string, mixed> $row */
    public static function fromRow(array $row): self;
}

final readonly class AttemptFacts   // lo que el progreso necesita de un intento recién insertado
{
    public function __construct(
        public int $id, public int $userId, public string $exerciseId, public RunStatus $outcome,
        public bool $counted, public CarbonImmutable $attemptedAt,
    ) {}
}

namespace App\Progress;

final readonly class ProgressHead
{
    public function __construct(
        public int $userId, public int $epoch, public int $revision,
        public ?CarbonImmutable $resetAt, public ?CarbonImmutable $lastActivityAt,
    ) {}

    /** @param array<string, mixed> $row */
    public static function fromRow(array $row): self;
}

final class AccountLock             // compartida con D1
{
    /**
     * Abre una transacción corta en READ COMMITTED, con hasta 3 intentos si hay un interbloqueo; toma
     * la cabecera de la cuenta (la crea en el primer uso) y corre $work con ella. $work se puede repetir.
     *
     * @template T
     * @param  Closure(ProgressHead): T  $work
     * @return T
     */
    public function within(int $userId, Closure $work): mixed;

    /** Sube la revisión en uno y fija la última actividad; devuelve la cabecera como queda. Una vez por transacción. */
    public function advance(ProgressHead $head, CarbonImmutable $at): ProgressHead;
}

namespace App\Runs\Evidence;

final readonly class ExecutorResult  // una respuesta válida del ejecutor
{
    public function __construct(
        public ExecutorPhase $phase, public int $exitCode, public string $stdout, public string $stderr,
        public bool $truncated, public bool $timedOut, public bool $oomKilled, public int $compileMs, public int $runMs,
    ) {}
    /** @return ?self null si el cuerpo no es un resultado válido (contracts/executor.md) */
    public static function fromPayload(mixed $payload): ?self;
}

final readonly class ExpectedEvidence
{
    /** @param list<string> $testKeys en el orden de las pruebas */
    public function __construct(public string $nonce, public array $testKeys, public bool $hasCustomTest) {}
}

final readonly class TestVerdict     // el veredicto de una prueba; una lista de estos y no un arreglo por clave:
{                                    // PHP convierte en entero una clave de arreglo como '123', y una clave de prueba puede ser así
    public function __construct(public string $key, public TestOutcome $outcome) {}
}

final readonly class Verdict         // lo que un cierre guarda: sale del clasificador o de un caso de infraestructura
{
    /** @param list<TestVerdict> $tests en el orden de las pruebas; vacía si no se leyó evidencia */
    public function __construct(
        public RunStatus $status, public ?RunReason $reason, public ?ExecutorPhase $phase, public ?int $exitCode,
        public ?bool $truncated, public ?int $compileMs, public ?int $runMs, public ?string $stdout, public ?string $stderr,
        public array $tests, public ?TestOutcome $custom,
    ) {}
    public static function infraError(RunReason $reason): self;   // sin fase, sin salida, sin veredictos
    public static function canceled(?RunReason $reason = null): self;
}
```

Los demás tipos (`ProgramInput`, `ComposedProgram`, `ExerciseSnapshot`, `Evidence`, `SubmittedRun`, `AdmissionResult`, `QuotaUsage`, `RunView`, `Claim`, `ExecutorReply`) y las firmas de los servicios están en las tareas que los entregan, en [plan.md](./plan.md).

## 6. Las columnas, y qué puede asumir D1

**`progress_heads`** (7 columnas):

| Columna | Tipo | La escribe |
| --- | --- | --- |
| `user_id` | BIGINT UNSIGNED, PK | `AccountLock` (primer uso) |
| `epoch` | INT UNSIGNED, por omisión 1 | D1 (el reset la sube); B2 la copia a `runs.epoch` al admitir |
| `revision` | BIGINT UNSIGNED, por omisión 0 | `AccountLock::advance`, desde el cierre de B2 y desde D1 |
| `reset_at` | DATETIME(3) NULL | D1 (el reset) |
| `last_activity_at` | DATETIME(3) NULL | `AccountLock::advance` |
| `created_at`, `updated_at` | DATETIME(3) | `AccountLock` |

**`exercise_progress`** (28 columnas):

| Columna | Tipo | La escribe |
| --- | --- | --- |
| `user_id`, `exercise_id` | clave primaria | B2 (primer cierre) o D1 |
| `solved_at` | DATETIME(3) NULL | **B2** (la más temprana); D1 en la importación |
| `server_solved_at` | DATETIME(3) NULL | **B2** |
| `proof_attempt_id`, `proof_at` | BIGINT UNSIGNED NULL, DATETIME(3) NULL | **B2**; D1 en la importación, sólo si están vacíos |
| `last_attempt_id`, `last_attempt_at` | BIGINT UNSIGNED NULL, DATETIME(3) NULL | **B2**; D1 en la importación, sólo si están vacíos |
| `attempt_count` | INT UNSIGNED, por omisión 0 | **B2** |
| `revision` | BIGINT UNSIGNED, por omisión 0 | **B2** en el cierre; D1 en cada cambio |
| `created_at`, `updated_at` | DATETIME(3) | B2 o D1, el que inserta la fila |
| `prediction_answer`, `prediction_answer_set_at` | TINYINT UNSIGNED NULL, DATETIME(3) NULL | D1 |
| `prediction_correct`, `prediction_correct_at` | TINYINT(1) por omisión 0, DATETIME(3) NULL | D1 |
| `assisted`, `solution_seen` | TINYINT(1) por omisión 0 | D1 |
| `hints_revealed` | TINYINT UNSIGNED NULL | D1 |
| `legacy_attempts` | BIGINT UNSIGNED NULL | D1 (importación) |
| `reflection`, `reflection_set_at` | TEXT NULL, DATETIME(3) NULL | D1 |
| `custom_test`, `custom_test_set_at` | TEXT NULL, DATETIME(3) NULL | D1 |
| `confidence` | ENUM('again','practice','confident') NULL | D1 |
| `reviewed_at`, `review_due_at`, `review_set_at` | DATETIME(3) NULL | D1 |

El borrador de D1 (spec 007) contrastó esta lista con sus campos y confirma que no le falta ninguna columna. Lo que D1 puede asumir de B2, y que el plan fija:

1. Las dos tablas nacen completas; D1 no las altera.
2. El cierre sube la revisión de la cuenta y la última actividad, y estampa esa misma revisión en cada fila de `exercise_progress` que cambia.
3. Tomar o crear la cabecera es un único código, `App\Progress\AccountLock`, que D1 importa y no reimplementa. Una operación que no cambia nada no llama a `advance`.
4. «Cuenta como intento» tiene una sola definición, la columna `counted`, y los intentos legados quedan fuera de ella.
5. La época: la admisión de B2 la copia en `runs.epoch`, y un cierre con la época cambiada deja su intento y no toca el progreso ni la revisión. B2 lo prueba subiendo la época a mano; D1 lo repite con el reset real.
6. La poda de payloads reconoce el de la última aprobación y el del último intento por los punteros de `exercise_progress`. «Borrar todo» borra esas filas: desde entonces, los payloads de la época anterior caen en la regla general de 90 días y sus intentos quedan como historia. Es un acuerdo con D1, y lo contrario exigiría otra marca en el payload.

## 7. Orden de bloqueo y aislamiento (D08)

Todo escritor corre en `READ COMMITTED`, por transacción, y toma los candados en este orden, único para todo el backend:

`progress_heads` → `users` (`FOR SHARE`, sólo para leer el estado) → `runs` → `attempts` → `attempt_tests` → `attempt_payloads` → `exercise_progress`

Nada externo dentro de una transacción: ni el ejecutor ni una espera. Las cancelaciones derivadas de un cambio de cuenta corren después de que ese cambio confirmó, una transacción de cierre por ejecución, así nadie espera la cabecera con `users` bloqueada. Las lecturas en snapshot (el contenido que arma el programa) siguen en `REPEATABLE READ` y terminan antes de abrir la transacción de escritura.

## 8. Retención y borrado

| Dato | Plazo | Quién lo borra |
| --- | --- | --- |
| `runs` | 14 días; `program` se borra al cerrar | `runs:prune`, por lotes de la clave primaria |
| `attempt_payloads` | 90 días, salvo el de la última aprobación y el del último intento de cada ejercicio, que se conservan mientras exista la cuenta | `runs:prune`, por lotes |
| `attempts`, `attempt_tests` | mientras exista la cuenta | la supresión de la cuenta (C3b) |
| `progress_heads`, `exercise_progress` | mientras exista la cuenta | la supresión de la cuenta (C3b) |

### Lo que B2 declara para `UserData` de C3b

C3b lleva un registro único de lo que el taller guarda de una cuenta (`UserData`, su FR-042): cada dueño declara sus tablas y una prueba de cobertura contra `information_schema` exige que toda tabla con `user_id`, o hija de una, figure en la exportación y en la supresión o en una lista de excepciones con su motivo. B2 no crea `UserData`; esta es su declaración, con las seis tablas de usuario:

| Tabla | Es de la cuenta por | Exportación | Supresión |
| --- | --- | --- | --- |
| `runs` | `user_id` | No, con motivo: es operativa (dura 14 días) y su código y su salida viven en el payload del intento mientras se conserve. Si C3b prefiere exportarla, son las filas con `code`, `custom_test`, `stdout` y `stderr` | Lote 1, después de cancelar las ejecuciones activas |
| `exercise_progress` | `user_id` | Sí, por la foto de progreso v2 de D1 | Lote 2 |
| `attempts` | `user_id` | Sí, con sus veredictos y el payload que se conserve | Lote 3 |
| `attempt_tests` | hija de `attempts` | Sí, con su intento | Cascada del lote 3 |
| `attempt_payloads` | hija de `attempts` | Sí, el que se conserve | Cascada del lote 3 |
| `progress_heads` | `user_id` | No, con motivo: es el candado de la cuenta; la época y la revisión salen en la foto de progreso de D1 | La transacción final la toma `FOR UPDATE` antes del `DELETE FROM users`, y la cascada la borra |

`harness_templates` es contenido, sin `user_id`: no entra. Si `UserData` ya existe cuando se implementa B2, el coordinador suma estas seis filas en el archivo de C3b; si no, C3b las toma de acá cuando llegue, y su prueba de cobertura es la que lo exige.

El orden de borrado por lotes de D06 con las tablas de B2: primero se cancelan las ejecuciones activas (`ActiveRuns::cancelAllOf`, que la purga de C3b llama y que B2 también engancha al evento de C3b), después `runs`, `exercise_progress` y `attempts` (cuyas hijas, `attempt_tests` y `attempt_payloads`, caen en cascada), y la transacción final toma la cabecera antes del `DELETE FROM users`, cuya cascada se lleva el resto. La prueba de B2 (un `DELETE FROM users` con las seis tablas pobladas no falla y no deja filas) asegura que ninguna FK lo impide.
