# Data Model: C5 · Estadísticas del admin

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

C5 no crea tablas ni columnas (spec, FR-005). Este documento fija qué lee, la configuración nueva y los dos índices candidatos que entran sólo si la medición los pide (FR-039). El DDL es **referencia sin ejecutar**.

## Lo que lee

| Tabla | De quién | Columnas que lee C5 | Columnas que nunca nombra |
| --- | --- | --- | --- |
| `users` | C3a | `id`, `name`, `email`, `role`, `status`, `created_at` (y las de `AdminUser` por el modelo) | `password`, `remember_token` |
| `invitations` | C3a | `role`, `expires_at` | `token_hash` |
| `progress_heads` | B2 | `user_id`, `epoch`, `reset_at`, `last_activity_at` | — |
| `attempts` | B2 | `id`, `user_id`, `exercise_id`, `legacy`, `outcome`, `counted`, `attempted_at` | `code_sha256` |
| `attempt_tests` | B2 | `attempt_id`, `exercise_id`, `test_key`, `position`, `outcome` | — |
| `runs` | B2 | `id`, `user_id`, `exercise_id`, `language`, `status`, `reason`, `executor_phase`, `exit_code`, `truncated`, `compile_ms`, `run_ms`, `created_at`, `started_at`, `finished_at`, `cancel_requested_at` | `code`, `custom_test`, `program`, `stdout`, `stderr`, `nonce`, `client_run_id`, `expected_tests` |
| `exercise_progress` | B2 | `user_id`, `exercise_id`, `solved_at`, `server_solved_at`, `attempt_count`, `last_attempt_id`, `last_attempt_at`, `assisted`, `solution_seen`, `hints_revealed`, `prediction_answer` (sólo agregada o como `is not null`), `prediction_correct`, `confidence`, `review_due_at` | `reflection`, `custom_test` |
| `campaign_checkpoints` | D1a | `user_id`, `world_id`, `passed`, `passed_at`, `last_answer` (sólo agregada o como `is not null`) | — |
| `campaign_seals` | D1b | `user_id`, `exercise_id` | `code` (la bandera: C5 cuenta filas) |
| `workshop_progress` | D1a | `user_id`, `workshop_id`, `language`, `code_sealed`, `prediction_correct`, `answer` (sólo agregada o como `is not null`) | `note` |
| `workshop_step_marks` | D1a | `user_id`, `workshop_id`, `language`, `marked` | — |
| `workshop_observations` | D1a | `user_id`, `workshop_id`, `language`, `observed_at` | — |
| `route_marks` | D1a | `user_id`, `kind`, `item_key`, `marked` | — |
| `route_quiz_answers` | D1a | `user_id`, `step_id`, `answer` (sólo agregada) | — |
| `progress_imports` | D1b | `id`, `user_id`, `source`, `epoch`, `imported_at` | `raw_payload`, `raw_sha256`, `report` |
| `catalogs` | C2 | `code` (alias `c`), `chain_position` | — |
| `exercises` | C2 | `id`, `catalog`, `language`, `level`, `stage`, `status` | `starter`, `solution` (contenido, pero no hace falta) |
| `worlds`, `world_exercises` | C2 | `id`, `language`, `level`, `position`, `status`; `world_id`, `exercise_id`, `status` | — |
| `workshops` | C2 | `id`, `domain`, `level`, `position`, `status` | — |

**Nunca lee:** `drafts`, `attempt_payloads`, `route_notes`, `sync_operations` y `sessions`. La prueba de arquitectura de T013 lo comprueba sobre el texto del código.

## Configuración nueva

`backend/api/config/stats.php`:

| Clave | Variable | Por omisión | Uso |
| --- | --- | --- | --- |
| `timezone` | `STATS_TIMEZONE` | `America/Argentina/Buenos_Aires` | Corta los períodos (FR-023) |
| `cache_seconds` | `STATS_CACHE_SECONDS` | 600 | La caché de los agregados (FR-034) |
| `max_execution_ms` | `STATS_MAX_EXECUTION_MS` | 5000 | La pista `MAX_EXECUTION_TIME` (FR-036) |
| `retry_after_seconds` | `STATS_RETRY_AFTER_SECONDS` | 30 | `Retry-After` del 503 `stats_timeout` |
| `default_days` | — | 30 | El período por omisión |
| `max_days` | — | 366 | El período más largo |

`backend/api/config/runs.php` suma `executor.slots` (`EXECUTOR_MAX_CONCURRENT`, 4 por omisión), y `docker/compose.yaml` pasa esa variable al ancla `x-laravel-env`. Así `php` conoce los mismos lugares que `executor` y `worker-runs` (spec, hallazgo 5).

## Índices candidatos (FR-039)

Entran sólo si la medición de T017 cumple el criterio de [research.md](./research.md), R8. Cada uno va en su propia migración, con `ALGORITHM=INPLACE, LOCK=NONE` y su `down()` (ADR 0006 §10). Se aplican con `taller_migrate`, que tiene `INDEX` y `ALTER`, en horario de poca escritura.

```sql
-- 2026_10_29_500001_add_attempts_attempted_at_outcome_index.php: el primer candidato.
ALTER TABLE `attempts` ADD INDEX `attempts_attempted_at_outcome_index` (`attempted_at`, `outcome`), ALGORITHM=INPLACE, LOCK=NONE;
-- down()
ALTER TABLE `attempts` DROP INDEX `attempts_attempted_at_outcome_index`, ALGORITHM=INPLACE, LOCK=NONE;

-- 2026_10_29_500002_add_attempts_attempted_at_user_outcome_index.php: el cubriente, si el primero no alcanza.
-- Reemplaza al anterior, que esta migración borra en su up().
ALTER TABLE `attempts` DROP INDEX `attempts_attempted_at_outcome_index`,
  ADD INDEX `attempts_attempted_at_user_outcome_index` (`attempted_at`, `user_id`, `outcome`, `legacy`), ALGORITHM=INPLACE, LOCK=NONE;
-- down()
ALTER TABLE `attempts` DROP INDEX `attempts_attempted_at_user_outcome_index`,
  ADD INDEX `attempts_attempted_at_outcome_index` (`attempted_at`, `outcome`), ALGORITHM=INPLACE, LOCK=NONE;
```

`counted` es una columna virtual: el índice cubriente la reemplaza con `legacy` y `outcome`, que la definen.
