# Implementation Plan: C5 · Estadísticas del admin

**Branch**: `spec/c5-estadisticas` (feature `025-c5-estadisticas`) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec clarificada el 2026-10-28 (Q1 a Q5 con la opción recomendada), con los ajustes del commit `968ad612`; el [contrato HTTP](./contracts/http.md), el [modelo de datos](./data-model.md), la [investigación](./research.md) y el [quickstart](./quickstart.md).

## Summary

**Objetivo:** que el admin vea, por la API, el uso del taller agregado, por catálogo, por ejercicio, por período y por cuenta, más la cola y las ejecuciones, sin que ningún camino devuelva el código ni los textos del alumno.

**Arquitectura:**
- Un módulo nuevo, `backend/api/app/Stats/`, de sólo lectura. Llega a MySQL por un único portón, `StatsRows`, que exige `SELECT`, le agrega la pista `MAX_EXECUTION_TIME` y convierte el error 3024 en un 503 `stats_timeout`.
- Los períodos se cortan en PHP, en la zona del taller, y se cruzan con las tablas por `JSON_TABLE`.
- Los agregados se guardan 10 minutos en la caché; lo que identifica a una cuenta no se guarda nunca.
- Seis rutas `GET` nuevas bajo el grupo `admin` de C3b, y la clave `usage` en la ficha.
- El límite de privacidad se prueba en tres capas: la matriz de C3b ampliada, las listas cerradas de claves y una prueba de arquitectura sobre el texto del código.

**Stack:** Laravel 13.34.0 sobre PHP 8.5 y MySQL 9.7, Pest 5.3.0, PHPStan 2.2.17 con Larastan 3.12.3 en el nivel 9, y Carbon 3.14.2. No suma dependencias.

## Technical Context

**Language/Version**: PHP 8.5 (imagen `php:8.5-fpm-alpine`), SQL de MySQL 9.7

**Primary Dependencies**: Laravel 13.34.0 (lo que ya está en `composer.lock`); ninguna nueva

**Storage**: MySQL 9.7. Sólo lee las tablas de C2, C3a, C3b, B2 y D1 ([data-model.md](./data-model.md)). Escribe sólo la caché (`cache`, store `database`) y, si la medición lo pide, un índice de `attempts`

**Testing**: Pest contra MySQL real (`mysql-test`), con la población a mano de `tests/Support/StatsWorld.php` y el reloj congelado; una prueba de arquitectura; la medición con `stats:synthesize` y `stats:measure` en `mysql-bench`

**Target Platform**: el stack de Docker Compose del taller (`php`, `mysql`); la medición, en el perfil nuevo `stats-bench`

**Project Type**: API web (Laravel, API-only)

**Performance Goals**: ninguna ruta por encima de 2 s en frío con 5.000 alumnos y dos años de intentos. Es una medición, no un criterio de aprobación: si se pasa, informa el disparador del §9 (SC-008, FR-040)

**Constraints**: sólo lectura, sin candados ni transacciones largas; tope de 5 000 ms por consulta; nada de textos ni huellas del alumno; sin tablas nuevas

**Scale/Scope**: 6 rutas nuevas y una clave en la ficha; 42 requisitos y 9 criterios; 18 tareas en 6 unidades

## Restricciones globales

Los valores exactos que cada tarea respeta, copiados de la spec, del contrato y de la constitución.

- **La base:** `master` en `24ba9d3d`, la del worktree. C5 depende de B2, D1a, D1b, C3a y C3b, todos en esa base. No espera a A4 ni a D1c.
- **Las versiones:** Laravel 13.34.0, Pest 5.3.0, PHPStan 2.2.17 (nivel 9, sin baseline ni `ignoreErrors`), Larastan 3.12.3 y Carbon 3.14.2. **Ningún paquete de Composer nuevo** (constitución, VII).
- **El esquema:** ninguna tabla ni columna nueva (FR-005). El único cambio de esquema posible son los índices de T017, uno por migración, con `ALGORITHM=INPLACE, LOCK=NONE` y su `down()`.
- **La configuración** (`config/stats.php`):
  - la zona: `America/Argentina/Buenos_Aires`;
  - la caché: 600 s;
  - el tope: 5 000 ms;
  - el `Retry-After`: 30 s;
  - el período por omisión: 30 días, con un máximo de 366;
  - los tamaños de página: 25 por omisión en los alumnos, 50 en las ejecuciones, y como mucho 100 en las dos.
- **La población** (Q5): `` `u`.`role` = 'student' and `u`.`status` in ('active', 'disabled') ``, definida una sola vez en `StatsSql::POPULATION`.
- **Un intento cuenta** con la columna `counted` de B2. `infra_error` y `canceled` no legados son operación, y `legacy = 1`, importado. La única definición en C5 es `StatsSql::ATTEMPT_COUNTS`.
- **El portón:** todo el SQL de `App\Stats` pasa por `StatsRows::select()` o `StatsRows::one()`. `App\Stats` no usa `DB` ni el constructor de consultas. Las únicas lecturas sin la pista son las dos de FR-036: la cuenta por id y `QuotaPolicy::usage`.
- **El reloj:** ningún SQL de C5 usa `now()`, `current_timestamp`, `utc_timestamp`, `sysdate`, `curdate`, `curtime` ni `current_date`. Todo instante es un parámetro tomado de `Instant::now()`, que congela `travelTo`.
- **Sin candados:** ni `for update`, ni `for share`, ni `lock in share mode`, ni `lockForUpdate`, ni `sharedLock`, ni `transaction(`, ni `AccountLock` en `App\Stats` (FR-004).
- **Lo que nunca sale ni se nombra:**
  - las tablas `drafts`, `attempt_payloads`, `route_notes`, `sync_operations` y `sessions`;
  - las columnas `custom_test`, `program`, `stdout`, `stderr`, `nonce`, `reflection`, `note`, `body`, `raw_payload`, `report`, `code_sha256`, `raw_sha256`, `payload_sha256`, `starter_hash`, `client_run_id` y `expected_tests`;
  - la palabra `code`, salvo como `` `c`.`code` `` de `catalogs`;
  - `prediction_answer`, `last_answer` y `answer`, que sólo se leen agregados o como `is not null`.
- **Las claves prohibidas de la matriz de C3b** (`NoStudentTextsTest`): `code`, `reflection`, `note`, `body`, `custom_test` y `raw_payload`, más las que suma T005: `stdout`, `stderr`, `program`, `nonce`, `report`, `code_sha256` y `raw_sha256`.
- **Los testigos de `StatsWorld`:**
  - `reflexión privada de Ana`;
  - `prueba privada de Ana`;
  - `borrador privado de Ana`;
  - `nota privada de Ana`;
  - `código privado de Ana`;
  - `salida privada de Ana`;
  - `crudo privado de Beto`.
- **Los textos** van en `lang/es/api.php` (`stats_timeout`) y `lang/es/admin.php` (`stats.*`), en español. El código y las pruebas van en inglés y sin comentarios, salvo una referencia puntual (`AGENTS.md`).
- **Los conteos que cambian en las pruebas de C3b:**
  - `AdminAccessMatrixTest`: de 9 rutas a 15;
  - `NoStudentTextsTest`: de 8 recorridas a 14;
  - `UserShowTest`: de 9 claves a 10;
  - `OversizedIdRoutesTest`: de 6 rutas a 7.

  Cada tarea que suma una ruta los actualiza en su commit.
- **Los comandos de Docker** van con `COMPOSE_PROJECT_NAME=<nombre-del-worktree>` en la misma línea (`backend/api/AGENTS.md`).
- **Todo el PHP y el SQL de este plan es referencia sin ejecutar:** se planificó sin PHP, MySQL ni Docker. La primera corrida de cada prueba es la que lo confirma.

## Constitution Check

| Principio | ¿Cumple? | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | Sigue `backend/api/AGENTS.md`: un archivo de rutas por característica, errores con `ApiError::of(ApiCode::…)`, sin `response()->json()` para errores, las pruebas contra `mysql-test`, `COMPOSE_PROJECT_NAME` y las reglas de C3b para `/api/admin` (sin binding implícito y destino después del rol) |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con su prueba en rojo. Los esperados se contaron a mano sobre `StatsWorld` (research, R7) y no se recalculan con las consultas que se prueban. La matriz de C3b se amplía, no se reescribe |
| III. Código entendible | Sí | SQL crudo con nombre, un lector por familia de métricas, ningún generador de consultas propio, bucles explícitos para armar las respuestas |
| IV. IDs estables | Sí | No toca contenido ni IDs. Lee los catálogos de `catalogs`, así E1 aparece sin código nuevo |
| V. Capas y contratos | Sí | `App\Stats` lee y arma; los controladores validan, buscan la cuenta y responden; el contrato vive en [contracts/http.md](./contracts/http.md). Sin capas nuevas: no hay repositorios, DTOs ni paquetes |
| VI. Español y portabilidad | Sí | Los mensajes, en español rioplatense; el script de la medición es POSIX `sh` |
| VII. Secretos fuera de Git | Sí | El informe de la medición sale por la salida estándar; el volumen `mysql-bench-data` es de Docker. Sin dependencias nuevas |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea. La spec 010 no se edita: esta spec la extiende (la ficha) |

**Puertas del ADR 0006 (propuesta):** D31, D33, D35, D38, S5, S6, §4.5, §7, §9 y §10, como dice la tabla «Base del ADR» de la spec. La aprobación del ADR condiciona la implementación, no el plan.

## Review Focus

Cinco entradas o fallas que la spec implica y que ninguna otra prueba ejercita, cada una con la prueba que la fija y su tarea dueña.

1. **Un alumno con cabecera de progreso pero `last_activity_at` nulo, y otro sin cabecera.** Una consulta con `inner join` o con el filtro en el `WHERE` los pierde.
   - **Prueba:** T008, `it('sorts and filters a head with a null last activity like an account without a head')`. Dani recibe una cabecera con la fecha nula, y el orden y el filtro dan el mismo resultado que sin ella.
2. **Una cuenta que se suprime entre dos pedidos.** El detalle tiene que dar 404 en el pedido siguiente, sin nada en la caché, y la ficha, `usage` nulo.
   - **Prueba:** T009, `it('answers 404 to the next request once the account starts its deletion and caches nothing about it')`, y T010, `it('keeps answering the ficha of an account being deleted, with a null usage')`.
3. **La medianoche local y el cambio de horario.** Un intento a las 23:30 de Buenos Aires (02:30Z del día siguiente) cae en su día local, el día siguiente queda vacío pero presente, y un día con cambio de horario dura 23 horas.
   - **Prueba:** T005, `it('cuts the days at the local midnight and keeps the empty ones')`, y T002, el caso de `America/New_York` del 8 de marzo de 2026.
4. **Dos ejecuciones con la misma hora de aceptación.** El cursor no puede repetir ni saltear una fila.
   - **Prueba:** T011, `it('walks runs that share their creation instant one page at a time without repeating or skipping one')`, con `perPage=1` sobre cinco ejecuciones del mismo milisegundo.
5. **El tope de tiempo de punta a punta.** Un `SLEEP` dentro de una consulta mayor sobre una tabla con filas tiene que dar el 503 `stats_timeout` con `Retry-After: 30`, nada en la caché y una sola línea de log con la plantilla de la ruta.
   - **Prueba:** T004, `it('answers 503 stats_timeout through HTTP, caches nothing and logs the route template once')`, con una ruta de prueba bajo el grupo `admin`.

## Project Structure

### Documentation (this feature)

```text
specs/025-c5-estadisticas/
├── spec.md              # clarificada el 2026-10-28
├── research.md          # R1 a R9 y la tabla de Context7
├── data-model.md        # lo que lee, la configuración y los índices candidatos
├── quickstart.md        # los comandos que verifican la entrega y la medición
├── contracts/http.md    # las seis rutas y la clave `usage` de la ficha
├── plan.md              # este archivo
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

### Mapa de archivos

Todos bajo `backend/api/` salvo que diga otra cosa. **C**: se crea; **M**: se modifica.

| Archivo | | Tarea | De qué se encarga |
| --- | --- | --- | --- |
| `config/stats.php` | C | T002 | Zona, caché, tope, `Retry-After` y períodos |
| `app/Stats/Granularity.php` | C | T002 | `day`, `week` y `month` |
| `app/Stats/Period.php` | C | T002 | El período local, sus intervalos en UTC y el JSON de los cortes |
| `app/Stats/Median.php` | C | T003 | La mediana de una tabla de frecuencias |
| `app/Stats/Percentile.php` | C | T003 | El percentil de rango más cercano |
| `app/Stats/StatsRows.php` | C | T004 | El portón: sólo `SELECT`, la pista y el error 3024 |
| `app/Http/StatsTimeout.php` | C | T004 | El 503 `stats_timeout` con `Retry-After` y su línea de log |
| `app/Stats/StatsCache.php` | C | T004 | La caché de 10 minutos de los agregados |
| `app/Http/ApiCode.php`, `lang/es/api.php` | M | T004 | El código `stats_timeout` |
| `app/Stats/StatsSql.php` | C | T005 | La población, la tabla de intervalos, los conteos de intentos y `fill()` |
| `app/Stats/AttemptCounts.php` | C | T005 | Arma `attempts`, `operations` e `importedAttempts` de una fila |
| `app/Stats/Moment.php` | C | T005 | Un `DATETIME(3)` nullable a ISO 8601 |
| `app/Stats/OverviewReader.php` | C | T005 | El resumen y sus series |
| `app/Http/Requests/Admin/StatsPeriodRequest.php` | C | T005 | `from`, `to` y `granularity` |
| `app/Http/Controllers/Admin/StatsController.php` | C | T005, T006, T008, T009 | Las cuatro rutas de `stats/*` |
| `routes/api/admin-stats.php` | C | T005, T006, T008, T009, T011, T012 | Las seis rutas |
| `bootstrap/app.php` | M | T005 | Registra `routes/api/admin-stats.php` |
| `lang/es/admin.php` | M | T005, T006, T008, T011 | Los mensajes `stats.*` |
| `app/Stats/Content/ContentFilters.php` | C | T006 | `catalog`, `language` y `level` |
| `app/Stats/Content/CatalogStats.php` | C | T006 | Por catálogo, lenguaje y nivel |
| `app/Stats/Content/ExerciseStats.php` | C | T006 | Por ejercicio y por prueba |
| `app/Stats/Content/ContentStatsReader.php` | C | T006, T007 | Junta las familias del contenido |
| `app/Http/Requests/Admin/ContentStatsRequest.php` | C | T006 | El período más los filtros |
| `app/Stats/Content/CampaignStats.php` | C | T007 | Por mundo |
| `app/Stats/Content/WorkshopStats.php` | C | T007 | Por taller de Sistemas y lenguaje |
| `app/Stats/Content/RouteStats.php` | C | T007 | Por paso, hito y pregunta del recorrido |
| `app/Stats/Accounts/StudentFilters.php` | C | T008 | Los parámetros de la lista |
| `app/Stats/Accounts/StudentDirectory.php` | C | T008 | La lista de alumnos con su uso |
| `app/Http/Requests/Admin/ListStudentsRequest.php` | C | T008 | La validación de la lista |
| `app/Stats/Accounts/StudentDetailReader.php` | C | T009 | El detalle de una cuenta |
| `app/Stats/Accounts/StudentAccessLog.php` | C | T009 | La línea `admin.student_viewed` (Q3) |
| `app/Stats/Accounts/UsageSummary.php` | C | T010 | El resumen `usage` de la ficha |
| `app/Http/Controllers/Admin/UserController.php` | M | T010 | `show` suma `usage` y el log |
| `app/Stats/Operations/RunFilters.php` | C | T011 | Los parámetros de la lista de ejecuciones |
| `app/Stats/Operations/RunMetadataReader.php` | C | T011 | Las ejecuciones con su lista cerrada de campos |
| `app/Http/Requests/Admin/ListRunsRequest.php` | C | T011 | La validación de la lista de ejecuciones |
| `app/Http/Controllers/Admin/OperationsController.php` | C | T011, T012 | `runs` y `queue` |
| `app/Stats/Operations/QueueReader.php` | C | T012 | La cola de ahora y las últimas 24 horas |
| `config/runs.php` | M | T012 | `executor.slots` |
| `docker/compose.yaml` (raíz) | M | T012, T016 | `EXECUTOR_MAX_CONCURRENT` para `php`; el perfil `stats-bench`. **Lo integra el coordinador** |
| `app/Console/Bench/BenchDatabase.php` | C | T015 | Se niega fuera de `mysql-bench/taller_stats_bench` |
| `app/Console/Bench/SyntheticPopulation.php` | C | T015 | El reparto determinista de los intentos sintéticos |
| `app/Console/Commands/SynthesizeStats.php` | C | T015 | `stats:synthesize` |
| `app/Console/Commands/MeasureStats.php` | C | T016 | `stats:measure` |
| `scripts/stats-bench.sh` | C | T016 | Levanta el perfil, migra, importa, sintetiza, reinicia y mide |
| `package.json` (raíz) | M | T016 | `api:stats:bench`. **Lo integra el coordinador** |
| `database/migrations/2026_10_29_50000{1,2}_*.php` | C | T017 | Los índices, sólo si la medición los pide |
| `AGENTS.md` (`backend/api/`) | M | T014 | La sección «Estadísticas (C5)». **La integra el coordinador** |
| `tests/Unit/Stats/{PeriodTest,MedianTest,PercentileTest}.php` | C | T002, T003 | Lo puro |
| `tests/Unit/Stats/StatsArchTest.php` | C | T013 | El portón, el texto prohibido, el reloj y los candados |
| `tests/Feature/Stats/StatsRowsTest.php`, `StatsCacheTest.php`, `StatsTimeoutTest.php` | C | T004 | El portón, la caché y el 503 |
| `tests/Support/StatsWorld.php` | C | T005 | La población a mano |
| `tests/Feature/Stats/OverviewTest.php` | C | T005 | El resumen |
| `tests/Feature/Stats/ContentStatsTest.php` | C | T006, T007 | El contenido |
| `tests/Feature/Stats/StudentsListTest.php` | C | T008 | La lista |
| `tests/Feature/Stats/StudentDetailTest.php` | C | T009 | El detalle |
| `tests/Feature/Stats/UsageSummaryTest.php` | C | T010 | La ficha |
| `tests/Feature/Stats/RunsListTest.php`, `QueueTest.php` | C | T011, T012 | La operación |
| `tests/Feature/Stats/StatsReadOnlyTest.php` | C | T013 | Ninguna escritura fuera de la caché ni de la sesión |
| `tests/Feature/Stats/BenchGuardTest.php`, `tests/Unit/Stats/SyntheticPopulationTest.php` | C | T015 | La guarda y el reparto |
| `tests/Feature/Admin/AdminAccessMatrixTest.php` | M | T005, T006, T008, T009, T011, T012 | La lista de rutas, de 9 a 15 |
| `tests/Feature/Admin/NoStudentTextsTest.php` | M | T005, T006, T008, T009, T011, T012 | Las claves y los testigos (T005), el escenario de `{user}` (T009) y la cuenta, de 8 a 14 |
| `tests/Feature/Admin/OversizedIdRoutesTest.php` | M | T009 | La ruta `stats/students/{id}` |
| `tests/Feature/Admin/UserShowTest.php` | M | T010 | De nueve claves a diez |
| `tests/Unit/ApiCodeTest.php` | M | T004 | `stats_timeout` y la cuenta de 25 a 26 |
| `tests/Feature/Runs/SchemaTest.php` | M | T017 | El índice nuevo, si entra |

### Unidades, orden y modo de ejecución

Las tareas son **secuenciales**:
- las rutas comparten `routes/api/admin-stats.php`, los controladores, `lang/es/admin.php`, `ApiCode` y cuatro pruebas de C3b que fijan conteos;
- la matriz «sin textos del alumno» exige que cada ruta de `/api/admin` responda 2xx con un escenario, así que una ruta no se registra antes de que su controlador responda.

| Unidad | Tareas | Compuerta al cerrarla |
| --- | --- | --- |
| U1 · La base | T001 a T004 | `--filter=Stats` en verde; `ApiCodeTest`; `api:analyse` |
| U2 · Los agregados | T005 a T007 | `--filter='Stats\|NoStudentTexts\|AdminAccessMatrix'` en verde; `api:analyse` |
| U3 · Por cuenta | T008 a T010 | Ídem, más `UserShow` y `OversizedId`; la suite completa |
| U4 · La operación | T011 y T012 | Ídem; la suite completa |
| U5 · El límite y la documentación | T013 y T014 | La suite completa en orden aleatorio (semilla 777); `api:format:check`; `npm test` |
| U6 · La medición | T015 a T017 | El informe de la medición en el PR y, si entra un índice, la suite completa |
| — | T018 | La compuerta final (SC-009) |

**Modo recomendado: subagent-driven, en serie.** Cada tarea la hace un `implementador` (Sonnet), y el agente principal revisa el diff y corre la compuerta de la tarea antes de pasar a la siguiente. Las hace el coordinador:
- **T001**, la línea de base;
- **T014**, `AGENTS.md`;
- las líneas de **`docker/compose.yaml`** y **`package.json`** de T012 y T016;
- **T017**, la medición, que pide permiso por el disco;
- **T018**, la compuerta final.

Ninguna tarea toca `app/Runs/Execution/*`, `Program/`, `Evidence/`, `content/` ni las imágenes del ejecutor, así que el PR no lleva el resumen de la auditoría de B3 (hallazgo C5-4).

### Reglas para cada tarea

- **Antes del commit,** cada tarea corre su prueba con `COMPOSE_PROJECT_NAME=<wt> npm run api:test -- --filter=<Prueba>`, después la compuerta de su unidad, `COMPOSE_PROJECT_NAME=<wt> npm run api:analyse` y `COMPOSE_PROJECT_NAME=<wt> npm run api:format:check`, y `git diff --check`.
- **Los commits** van en español, con prefijo Angular (`feat(api):`, `test(api):`) y el trailer `Co-Authored-By` del modelo que implementa. No se hace push.
- **Si una consulta no corre como está escrita** (un error de sintaxis de MySQL o de `ONLY_FULL_GROUP_BY`), se corrige la consulta y no la prueba. El cambio va en el informe de la tarea.

## Tareas

### U1 · La base

#### T001 · La línea de base (coordinador)

**Archivos:** ninguno. **Produce:** los números de partida para el informe del PR.

1. En `spec-c5`, correr `COMPOSE_PROJECT_NAME=spec-c5 npm run api:test` y anotar la cantidad de pruebas y de aserciones. Hacer lo mismo con `COMPOSE_PROJECT_NAME=spec-c5 npm run api:analyse` y `npm test`.
2. Confirmar los conteos que el plan cambia:
   - `AdminAccessMatrixTest` («covers exactly the nine routes»);
   - `NoStudentTextsTest` (`toHaveCount(8)`);
   - `UserShowTest` (nueve claves);
   - `ApiCodeTest` (25 códigos).

   Si alguno difiere, el coordinador corrige el plan antes de T002.

#### T002 · El período y sus intervalos

**Archivos:** `config/stats.php` (C), `app/Stats/Granularity.php` (C), `app/Stats/Period.php` (C) y `tests/Unit/Stats/PeriodTest.php` (C).

**Interfaces que produce:**

```php
enum Granularity: string { case Day = 'day'; case Week = 'week'; case Month = 'month'; }

final readonly class Period
{
    public CarbonImmutable $from;        // 00:00 local of the first day
    public CarbonImmutable $to;          // 00:00 local of the last day (inclusive)
    public Granularity $granularity;
    public string $timezone;
    public static function of(?string $from, ?string $to, ?Granularity $granularity, CarbonImmutable $now, string $timezone, int $defaultDays): self;
    public function days(): int;
    public function startsUtc(): string;   // 'Y-m-d H:i:s.v'
    public function endsUtc(): string;     // exclusive
    /** @return list<array{start: string, startsUtc: string, endsUtc: string}> */
    public function buckets(): array;
    public function bucketsJson(): string; // [[0,"…","…"],…]
    public function wholeJson(): string;   // one bucket that covers the period
    /** @return array{from: string, to: string, granularity: string, timezone: string} */
    public function toMeta(): array;
    public function cacheKey(): string;
}
```

1. **La prueba primero,** `tests/Unit/Stats/PeriodTest.php`:

```php
<?php

use App\Stats\Granularity;
use App\Stats\Period;
use Carbon\CarbonImmutable;

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

function periodNow(): CarbonImmutable
{
    return CarbonImmutable::parse('2026-10-20 15:00:00', 'UTC');
}

it('takes the last thirty local days, today included, when no dates come', function () {
    $period = Period::of(null, null, null, periodNow(), BUENOS_AIRES, 30);

    expect($period->toMeta())->toBe(['from' => '2026-09-21', 'to' => '2026-10-20', 'granularity' => 'day', 'timezone' => BUENOS_AIRES])
        ->and($period->startsUtc())->toBe('2026-09-21 03:00:00.000')
        ->and($period->endsUtc())->toBe('2026-10-21 03:00:00.000')
        ->and($period->days())->toBe(30);
});

it('cuts each day at the local midnight', function () {
    $period = Period::of('2026-10-05', '2026-10-06', Granularity::Day, periodNow(), BUENOS_AIRES, 30);

    expect($period->buckets())->toBe([
        ['start' => '2026-10-05', 'startsUtc' => '2026-10-05 03:00:00.000', 'endsUtc' => '2026-10-06 03:00:00.000'],
        ['start' => '2026-10-06', 'startsUtc' => '2026-10-06 03:00:00.000', 'endsUtc' => '2026-10-07 03:00:00.000'],
    ])->and($period->bucketsJson())->toBe('[[0,"2026-10-05 03:00:00.000","2026-10-06 03:00:00.000"],[1,"2026-10-06 03:00:00.000","2026-10-07 03:00:00.000"]]')
        ->and($period->wholeJson())->toBe('[[0,"2026-10-05 03:00:00.000","2026-10-07 03:00:00.000"]]');
});

it('starts each week on Monday and clips the first and the last one to the period', function () {
    $period = Period::of('2026-10-01', '2026-10-20', Granularity::Week, periodNow(), BUENOS_AIRES, 30);

    expect(array_column($period->buckets(), 'start'))->toBe(['2026-10-01', '2026-10-05', '2026-10-12', '2026-10-19'])
        ->and($period->buckets()[3]['endsUtc'])->toBe('2026-10-21 03:00:00.000');
});

it('cuts each calendar month', function () {
    $period = Period::of('2026-09-15', '2026-11-02', Granularity::Month, periodNow(), BUENOS_AIRES, 30);

    expect($period->buckets())->toBe([
        ['start' => '2026-09-15', 'startsUtc' => '2026-09-15 03:00:00.000', 'endsUtc' => '2026-10-01 03:00:00.000'],
        ['start' => '2026-10-01', 'startsUtc' => '2026-10-01 03:00:00.000', 'endsUtc' => '2026-11-01 03:00:00.000'],
        ['start' => '2026-11-01', 'startsUtc' => '2026-11-01 03:00:00.000', 'endsUtc' => '2026-11-03 03:00:00.000'],
    ]);
});

it('gives a day of 23 hours when the zone moves its clock forward', function () {
    $period = Period::of('2026-03-08', '2026-03-08', Granularity::Day, periodNow(), 'America/New_York', 30);

    expect($period->buckets())->toBe([
        ['start' => '2026-03-08', 'startsUtc' => '2026-03-08 05:00:00.000', 'endsUtc' => '2026-03-09 04:00:00.000'],
    ]);
});

it('counts the days of the period inclusively', function () {
    expect(Period::of('2025-10-20', '2026-10-20', null, periodNow(), BUENOS_AIRES, 30)->days())->toBe(366)
        ->and(Period::of('2026-10-20', '2026-10-20', null, periodNow(), BUENOS_AIRES, 30)->days())->toBe(1);
});

it('keys the cache with the four values of the period', function () {
    expect(Period::of('2026-10-01', '2026-10-20', Granularity::Week, periodNow(), BUENOS_AIRES, 30)->cacheKey())
        ->toBe('2026-10-01|2026-10-20|week|'.BUENOS_AIRES);
});
```

2. **Correrla:** `COMPOSE_PROJECT_NAME=<wt> npm run api:test -- --filter=PeriodTest`. Tiene que fallar porque la clase `App\Stats\Period` no existe.
3. **La implementación mínima.** `config/stats.php`:

```php
<?php

return [
    'timezone' => env('STATS_TIMEZONE', 'America/Argentina/Buenos_Aires'),
    'cache_seconds' => (int) env('STATS_CACHE_SECONDS', 600),
    'max_execution_ms' => (int) env('STATS_MAX_EXECUTION_MS', 5000),
    'retry_after_seconds' => (int) env('STATS_RETRY_AFTER_SECONDS', 30),
    'default_days' => 30,
    'max_days' => 366,
];
```

`app/Stats/Granularity.php`:

```php
<?php

namespace App\Stats;

enum Granularity: string
{
    case Day = 'day';
    case Week = 'week';
    case Month = 'month';
}
```

`app/Stats/Period.php`:

```php
<?php

namespace App\Stats;

use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Carbon\WeekDay;
use LogicException;

final readonly class Period
{
    private function __construct(
        public CarbonImmutable $from,
        public CarbonImmutable $to,
        public Granularity $granularity,
        public string $timezone,
    ) {}

    public static function of(?string $from, ?string $to, ?Granularity $granularity, CarbonImmutable $now, string $timezone, int $defaultDays): self
    {
        $last = $to === null ? $now->setTimezone($timezone)->startOfDay() : self::localDate($to, $timezone);
        $first = $from === null ? $last->subDays($defaultDays - 1) : self::localDate($from, $timezone);

        return new self($first, $last, $granularity ?? Granularity::Day, $timezone);
    }

    public function days(): int
    {
        $first = self::localDate($this->from->format('Y-m-d'), 'UTC');
        $last = self::localDate($this->to->format('Y-m-d'), 'UTC');

        return (int) round($first->diffInDays($last)) + 1;
    }

    public function startsUtc(): string
    {
        return Instant::format($this->from);
    }

    public function endsUtc(): string
    {
        return Instant::format($this->to->addDay());
    }

    /** @return list<array{start: string, startsUtc: string, endsUtc: string}> */
    public function buckets(): array
    {
        $end = $this->to->addDay();
        $buckets = [];
        $cursor = $this->from;
        while ($cursor < $end) {
            $next = $this->nextBoundary($cursor);
            if ($next > $end) {
                $next = $end;
            }
            $buckets[] = ['start' => $cursor->format('Y-m-d'), 'startsUtc' => Instant::format($cursor), 'endsUtc' => Instant::format($next)];
            $cursor = $next;
        }

        return $buckets;
    }

    public function bucketsJson(): string
    {
        $rows = [];
        foreach ($this->buckets() as $index => $bucket) {
            $rows[] = [$index, $bucket['startsUtc'], $bucket['endsUtc']];
        }

        return json_encode($rows, JSON_THROW_ON_ERROR);
    }

    public function wholeJson(): string
    {
        return json_encode([[0, $this->startsUtc(), $this->endsUtc()]], JSON_THROW_ON_ERROR);
    }

    /** @return array{from: string, to: string, granularity: string, timezone: string} */
    public function toMeta(): array
    {
        return ['from' => $this->from->format('Y-m-d'), 'to' => $this->to->format('Y-m-d'), 'granularity' => $this->granularity->value, 'timezone' => $this->timezone];
    }

    public function cacheKey(): string
    {
        return implode('|', $this->toMeta());
    }

    private function nextBoundary(CarbonImmutable $cursor): CarbonImmutable
    {
        return match ($this->granularity) {
            Granularity::Day => $cursor->addDay(),
            Granularity::Week => $cursor->startOfWeek(WeekDay::Monday)->addWeek(),
            Granularity::Month => $cursor->startOfMonth()->addMonth(),
        };
    }

    private static function localDate(string $date, string $timezone): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!Y-m-d', $date, $timezone)
            ?: throw new LogicException("Not a date: {$date}");
    }
}
```

4. **Correrla en verde.** Si `WeekDay` no existe en Carbon 3.14.2, usar `CarbonInterface::MONDAY` y decirlo en el informe.
5. **Los checks:** `api:analyse` y `api:format:check`.
6. **El commit:** `feat(api): C5 suma el período de las estadísticas y sus intervalos locales (T002)`.

#### T003 · La mediana y el percentil

**Archivos:** `app/Stats/Median.php` (C), `app/Stats/Percentile.php` (C), `tests/Unit/Stats/MedianTest.php` (C) y `tests/Unit/Stats/PercentileTest.php` (C).

**Interfaces:**
- `Median::of(array<int, int> $frequencies): int|float|null`: cantidad de observaciones por valor; `null` sin observaciones.
- `Percentile::of(list<int> $values, int $percent): ?int`: rango más cercano; `null` sin valores.

1. **Las pruebas primero.** `tests/Unit/Stats/MedianTest.php`:

```php
<?php

use App\Stats\Median;

it('takes the middle value of an odd number of observations', function () {
    expect(Median::of([0 => 1, 1 => 1, 2 => 1]))->toBe(1)
        ->and(Median::of([2 => 1, 0 => 1, 1 => 1]))->toBe(1)
        ->and(Median::of([1 => 3]))->toBe(1);
});

it('averages the two middle values of an even number of observations', function () {
    expect(Median::of([0 => 1, 1 => 1]))->toBe(0.5)
        ->and(Median::of([1 => 1, 3 => 1]))->toBe(2)
        ->and(Median::of([0 => 2, 5 => 2]))->toBe(2.5);
});

it('has no median without observations', function () {
    expect(Median::of([]))->toBeNull()
        ->and(Median::of([4 => 0]))->toBeNull();
});
```

`tests/Unit/Stats/PercentileTest.php`:

```php
<?php

use App\Stats\Percentile;

it('takes the nearest rank', function () {
    expect(Percentile::of([40, 10, 30, 20], 50))->toBe(20)
        ->and(Percentile::of([40, 10, 30, 20], 95))->toBe(40)
        ->and(Percentile::of([1500], 95))->toBe(1500);
});

it('has no percentile without values', function () {
    expect(Percentile::of([], 50))->toBeNull();
});
```

2. **Correrlas:** `--filter='MedianTest|PercentileTest'`. Tienen que fallar porque las clases no existen.
3. **La implementación.** `app/Stats/Median.php`:

```php
<?php

namespace App\Stats;

use LogicException;

final class Median
{
    /** @param array<int, int> $frequencies how many observations each value has */
    public static function of(array $frequencies): int|float|null
    {
        ksort($frequencies);
        $total = array_sum($frequencies);
        if ($total === 0) {
            return null;
        }
        $sum = self::valueAt($frequencies, intdiv($total - 1, 2)) + self::valueAt($frequencies, intdiv($total, 2));

        return $sum % 2 === 0 ? intdiv($sum, 2) : $sum / 2;
    }

    /** @param array<int, int> $frequencies */
    private static function valueAt(array $frequencies, int $position): int
    {
        $seen = 0;
        foreach ($frequencies as $value => $count) {
            $seen += $count;
            if ($position < $seen) {
                return $value;
            }
        }
        throw new LogicException('The position is outside the observations.');
    }
}
```

`app/Stats/Percentile.php`:

```php
<?php

namespace App\Stats;

final class Percentile
{
    /** @param list<int> $values */
    public static function of(array $values, int $percent): ?int
    {
        if ($values === []) {
            return null;
        }
        sort($values);
        $rank = (int) ceil($percent / 100 * count($values));

        return $values[max(1, $rank) - 1];
    }
}
```

4. **En verde,** con `api:analyse` y `api:format:check`.
5. **El commit:** `feat(api): C5 suma la mediana y el percentil de las estadísticas (T003)`.

#### T004 · El portón, el 503 y la caché

**Archivos:**
- se crean `app/Stats/StatsRows.php`, `app/Http/StatsTimeout.php` y `app/Stats/StatsCache.php`;
- se modifican `app/Http/ApiCode.php`, `lang/es/api.php` y `tests/Unit/ApiCodeTest.php`;
- se crean las pruebas `tests/Feature/Stats/StatsRowsTest.php`, `StatsCacheTest.php` y `StatsTimeoutTest.php`.

**Interfaces que produce:**

```php
final class StatsRows
{
    /** @param list<int|string|null> $bindings @return list<RowFields> */
    public function select(string $sql, array $bindings, string $source): array;
    /** @param list<int|string|null> $bindings */
    public function one(string $sql, array $bindings, string $source): RowFields;
}

final class StatsTimeout extends HttpResponseException
{
    public static function after(int $elapsedMs): self;   // logs admin.stats_timeout {route, duration_ms}
}

final class StatsCache
{
    /** @param Closure(): array<string, mixed> $compute @return array{data: array<string, mixed>, generatedAt: string} */
    public function remember(string $view, string $parameters, Closure $compute): array;
}
```

`ApiCode::StatsTimeout` (`stats_timeout`, 503). `RowFields` es `App\Content\Record\RowFields`, y `$source` es el nombre de la tabla de sus mensajes de error.

1. **Las pruebas primero.** `tests/Feature/Stats/StatsRowsTest.php`:

```php
<?php

use App\Http\StatsTimeout;
use App\Models\User;
use App\Stats\StatsRows;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

it('adds the time limit hint right after the first select', function () {
    DB::flushQueryLog();
    DB::enableQueryLog();

    app(StatsRows::class)->select("select\n  1 as `one`", [], 'probe');

    expect(DB::getQueryLog()[0]['query'])->toBe("select /*+ MAX_EXECUTION_TIME(5000) */\n  1 as `one`");
});

it('refuses a statement that is not a select', function () {
    app(StatsRows::class)->select('update `users` set `name` = `name`', [], 'users');
})->throws(LogicException::class);

it('returns each row as fields', function () {
    $first = User::factory()->create();
    $second = User::factory()->create();

    $rows = app(StatsRows::class)->select('select `id` from `users` order by `id`', [], 'users');

    expect(array_map(fn ($row) => $row->int('id'), $rows))->toBe([$first->id, $second->id])
        ->and(app(StatsRows::class)->one('select count(*) as `n` from `users`', [], 'users')->int('n'))->toBe(2);
});

it('turns an interrupted select into StatsTimeout and logs its duration without a route', function () {
    config(['stats.max_execution_ms' => 100]);
    User::factory()->create();
    Log::spy();

    $caught = null;
    try {
        app(StatsRows::class)->select('select 1 as `one` from `users` where sleep(1) = 0', [], 'users');
    } catch (StatsTimeout $timeout) {
        $caught = $timeout;
    }

    expect($caught)->not->toBeNull()
        ->and($caught->getResponse()->getStatusCode())->toBe(503)
        ->and($caught->getResponse()->headers->get('Retry-After'))->toBe('30');
    Log::shouldHaveReceived('warning')->once()->withArgs(fn (string $message, array $context = []) => $message === 'admin.stats_timeout'
        && $context['route'] === 'none' && is_int($context['duration_ms']) && $context['duration_ms'] >= 50);
});
```

`tests/Feature/Stats/StatsCacheTest.php`:

```php
<?php

use App\Stats\StatsCache;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    config(['cache.default' => 'database']);
    Cache::purge();
    $this->travelTo(CarbonImmutable::parse('2026-10-20 15:00:00', 'UTC'));
});

it('keeps the computed data for ten minutes and computes it again after', function () {
    $calls = 0;
    $compute = function () use (&$calls): array {
        $calls++;

        return ['calls' => $calls];
    };

    $first = app(StatsCache::class)->remember('overview', 'p', $compute);
    $this->travel(599)->seconds();
    $second = app(StatsCache::class)->remember('overview', 'p', $compute);
    $this->travel(2)->seconds();
    $third = app(StatsCache::class)->remember('overview', 'p', $compute);

    expect($first)->toBe(['data' => ['calls' => 1], 'generatedAt' => '2026-10-20T15:00:00.000Z'])
        ->and($second)->toBe($first)
        ->and($third)->toBe(['data' => ['calls' => 2], 'generatedAt' => '2026-10-20T15:10:01.000Z']);
});

it('keeps apart the views and the parameters', function () {
    $cache = app(StatsCache::class);

    $cache->remember('overview', 'a', fn (): array => ['n' => 1]);

    expect($cache->remember('overview', 'b', fn (): array => ['n' => 2])['data'])->toBe(['n' => 2])
        ->and($cache->remember('exercises', 'a', fn (): array => ['n' => 3])['data'])->toBe(['n' => 3]);
});

it('stores nothing when the computation fails', function () {
    $cache = app(StatsCache::class);

    expect(fn () => $cache->remember('overview', 'p', fn (): array => throw new RuntimeException('boom')))->toThrow(RuntimeException::class)
        ->and(DB::table('cache')->where('key', 'like', '%stats:v1:%')->count())->toBe(0)
        ->and($cache->remember('overview', 'p', fn (): array => ['n' => 1])['data'])->toBe(['n' => 1]);
});
```

`tests/Feature/Stats/StatsTimeoutTest.php`, de punta a punta por HTTP (Review Focus 5):

```php
<?php

use App\Models\User;
use App\Stats\StatsCache;
use App\Stats\StatsRows;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Tests\Support\Browser;

it('answers 503 stats_timeout through HTTP, caches nothing and logs the route template once', function () {
    config(['stats.max_execution_ms' => 100]);
    Route::middleware(['api', 'admin'])->get('api/admin/probe-timeout/{user}', fn (StatsCache $cache, StatsRows $rows) => response()->json(
        $cache->remember('probe', 'p', fn (): array => ['n' => $rows->one('select 1 as `n` from `users` where sleep(1) = 0', [], 'users')->int('n')]),
    ));
    app('router')->getRoutes()->refreshNameLookups();
    $admin = User::factory()->admin()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($admin);
    Log::spy();

    $response = $browser->get("/api/admin/probe-timeout/{$admin->id}");

    $response->assertStatus(503)->assertJsonPath('code', 'stats_timeout')->assertHeader('Retry-After', '30');
    expect($response->json('message'))->toBe('Las estadísticas tardaron demasiado. Probá de nuevo en un rato.')
        ->and(DB::table('cache')->where('key', 'like', '%stats:v1:%')->count())->toBe(0);
    Log::shouldHaveReceived('warning')->once()->withArgs(fn (string $message, array $context = []) => $message === 'admin.stats_timeout'
        && $context['route'] === 'api/admin/probe-timeout/{user}');
});
```

En `tests/Unit/ApiCodeTest.php`:
- suma a `contract codes` la fila `'stats_timeout' => [ApiCode::StatsTimeout, 'stats_timeout', 503, 'Las estadísticas tardaron demasiado. Probá de nuevo en un rato.'],`;
- cambia `it('has exactly the 25 codes of the contract'` por `26 codes` y `toHaveCount(26)`.

2. **Correrlas:** `--filter='StatsRows|StatsCache|StatsTimeout|ApiCode'`. Tienen que fallar porque `StatsRows`, `StatsCache`, `StatsTimeout` y `ApiCode::StatsTimeout` no existen.
3. **La implementación.** En `app/Http/ApiCode.php`:
   - el caso `case StatsTimeout = 'stats_timeout';` va después de `ImportNeedsConfirmation`;
   - en `status()`, la línea de 503 pasa a ser `self::QueueFull, self::MailUnavailable, self::StatsTimeout => 503,`.

   En `lang/es/api.php`, después de `import_needs_confirmation`, va `'stats_timeout' => 'Las estadísticas tardaron demasiado. Probá de nuevo en un rato.',`.

`app/Http/StatsTimeout.php`:

```php
<?php

namespace App\Http;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Log;

final class StatsTimeout extends HttpResponseException
{
    public static function after(int $elapsedMs): self
    {
        $route = request()->route();
        Log::warning('admin.stats_timeout', ['route' => $route instanceof Route ? $route->uri() : 'none', 'duration_ms' => $elapsedMs]);

        return new self(ApiError::of(ApiCode::StatsTimeout, headers: ['Retry-After' => (string) config()->integer('stats.retry_after_seconds')]));
    }
}
```

`app/Stats/StatsRows.php`:

```php
<?php

namespace App\Stats;

use App\Content\Record\RowFields;
use App\Http\StatsTimeout;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use LogicException;

final class StatsRows
{
    private const QUERY_TIMEOUT = 3024;

    /**
     * @param  list<int|string|null>  $bindings
     * @return list<RowFields>
     */
    public function select(string $sql, array $bindings, string $source): array
    {
        $limited = preg_replace('/^\s*select\b/i', 'select /*+ MAX_EXECUTION_TIME('.config()->integer('stats.max_execution_ms').') */', $sql, 1, $replaced);
        if (! is_string($limited) || $replaced !== 1) {
            throw new LogicException('StatsRows only runs SELECT statements.');
        }
        $started = hrtime(true);
        try {
            $rows = DB::select($limited, $bindings);
        } catch (QueryException $error) {
            if (($error->errorInfo[1] ?? null) === self::QUERY_TIMEOUT) {
                throw StatsTimeout::after(intdiv(hrtime(true) - $started, 1_000_000));
            }
            throw $error;
        }
        $fields = [];
        foreach ($rows as $row) {
            $fields[] = new RowFields(get_object_vars($row), $source);
        }

        return $fields;
    }

    /** @param  list<int|string|null>  $bindings */
    public function one(string $sql, array $bindings, string $source): RowFields
    {
        $rows = $this->select($sql, $bindings, $source);
        if (count($rows) !== 1) {
            throw new LogicException("Expected exactly one row from {$source}.");
        }

        return $rows[0];
    }
}
```

`app/Stats/StatsCache.php`:

```php
<?php

namespace App\Stats;

use App\Runs\Record\Instant;
use Closure;
use Illuminate\Support\Facades\Cache;

final class StatsCache
{
    /**
     * @param  Closure(): array<string, mixed>  $compute
     * @return array{data: array<string, mixed>, generatedAt: string}
     */
    public function remember(string $view, string $parameters, Closure $compute): array
    {
        $key = 'stats:v1:'.$view.':'.hash('sha256', $parameters);

        return Cache::store()->remember(
            $key,
            config()->integer('stats.cache_seconds'),
            fn (): array => ['data' => $compute(), 'generatedAt' => Instant::iso(Instant::now())],
        );
    }
}
```

4. **En verde.** Si PHPStan no infiere el tipo de `Cache::store()->remember()`:
   - se guarda el resultado en una variable;
   - se comprueba la forma con `is_array($entry) && is_array($entry['data'] ?? null) && is_string($entry['generatedAt'] ?? null)`;
   - si no la tiene, se lanza `LogicException`.

   Nunca se agrega un `ignoreErrors`.
5. **Los checks:** `api:analyse` y `api:format:check`.
6. **El commit:** `feat(api): C5 suma el portón de lectura con tope de tiempo y la caché de las estadísticas (T004)`.

### U2 · Los agregados

#### T005 · La población a mano y el resumen

**Archivos:**
- **se crean:**
  - `tests/Support/StatsWorld.php`;
  - `app/Stats/StatsSql.php`, `AttemptCounts.php`, `Moment.php` y `OverviewReader.php`;
  - `app/Http/Requests/Admin/StatsPeriodRequest.php` y `app/Http/Controllers/Admin/StatsController.php`;
  - `routes/api/admin-stats.php`;
  - `tests/Feature/Stats/OverviewTest.php`;
- **se modifican:** `bootstrap/app.php`, `lang/es/admin.php`, `tests/Feature/Admin/AdminAccessMatrixTest.php` y `tests/Feature/Admin/NoStudentTextsTest.php`.

**Consume:**
- `Period`, `Granularity`, `StatsRows`, `StatsCache` y `Median` (T002 a T004);
- `RowFields`, `Instant`, `RunWorld`, `ProgressWorld` y `Browser`.

**Interfaces que produce:**

```php
final class StatsSql
{
    public const POPULATION;        // "`u`.`role` = 'student' and `u`.`status` in ('active', 'disabled')"
    public const BUCKETS;           // the json_table of the cuts, aliased `b`
    public const ATTEMPT_COUNTS;    // passed, failed, compile_error, runtime_error, timeout, infra_error, canceled, imported over alias `a`
    /** @param array<string, string> $parts */
    public static function fill(string $sql, array $parts = []): string;   // replaces {population}, {buckets}, {attempt_counts} and $parts
}

final class AttemptCounts
{
    /** @return array{attempts: array{passed: int, failed: int, compileError: int, runtimeError: int, timeout: int}, operations: array{infraError: int, canceled: int}, importedAttempts: int} */
    public static function from(RowFields $row): array;
    /** @return the same shape, all zeros */
    public static function zero(): array;
}

final class Moment { public static function iso(?string $datetime): ?string; }

final class OverviewReader { /** @return array<string, mixed> */ public function read(Period $period, CarbonImmutable $now): array; }

class StatsPeriodRequest extends FormRequest { public function period(): Period; }

final class StatsController { public function overview(StatsPeriodRequest $request, OverviewReader $reader): JsonResponse; }

final class StatsWorld
{
    public const NOW = '2026-10-20 15:00:00';
    public const CANARIES = [/* the seven texts */];
    /** @return array{admin: int, ana: int, beto: int, caro: int, dani: int, eva: int, fede: int} */
    public static function create(): array;
}
```

**La población a mano** (los valores esperados de T005 a T012 salen de esta lista, contados a mano). El reloj está congelado en `2026-10-20 15:00:00Z`, que son las 12:00 en Buenos Aires.

**Las cuentas** (todas con el email verificado):

| Cuenta | Rol | Estado | Alta (UTC) | Cabecera de progreso |
| --- | --- | --- | --- | --- |
| Ada Admin | admin | active | 2026-08-01 12:00 | Época 1, actividad 10-07 12:00 |
| Ana Pérez | student | active | 2026-09-01 12:00 | Época 1, actividad 10-20 10:00 |
| Beto Ruiz | student | active | 2026-09-01 12:00 | Época 1, actividad 10-15 12:00 |
| Caro Díaz | student | disabled | 2026-09-01 12:00 | Época 1, actividad 09-01 12:00 |
| Dani Sosa | student | active | 2026-10-08 12:00 | Ninguna |
| Eva Luna | student | deleting | 2026-09-01 12:00 | Época 1, actividad 10-19 12:00 |
| Fede Gómez | student | active | 2026-10-03 12:00 | Época 2, `reset_at` y actividad 10-09 12:00 |

**El contenido:**

| Ejercicio | Catálogo | Lenguaje | Nivel | Estado |
| --- | --- | --- | --- | --- |
| `rust-01` | `lab` | rust | nulo | activo |
| `rust-02` | `lab` | rust | nulo | retirado |
| `go-01` | `lab` | go | nulo | activo |
| `q-rust-01` | `quests` | rust | `beginner` | activo |
| `ess-rust-01` | `essentials` (posición 1) | rust | nulo | activo |

Cada ejercicio tiene las pruebas `t1` a `t3`. El mundo `fx-world-1` es de rust y `beginner`, y tiene a `rust-01` de entrenamiento. El taller `fx-workshop-1` tiene el objetivo `fx-obj-1` y las etapas `e1` y `e2`. El paso del recorrido es `fx-step-1`.

**Los intentos** (fecha UTC y época 1, salvo Fede):

| Cuenta | Ejercicio | Resultado | Fecha | Veredictos |
| --- | --- | --- | --- | --- |
| Ana | `rust-01` | failed | 10-05 12:00 | t1 pass, t2 fail, t3 missing |
| Ana | `rust-01` | passed | 10-05 13:00 | t1 a t3 pass |
| Ana | `go-01` | compile_error | 10-06 02:30 (10-05 23:30 local) | — |
| Beto | `rust-01` | passed, **legado** | 10-02 10:00 | — |
| Beto | `go-01` | infra_error | 10-10 12:00 | — |
| Beto | `go-01` | canceled | 10-11 12:00 | — |
| Beto | `q-rust-01` | passed | 10-12 14:00 | t1 a t3 pass |
| Caro | `rust-01` | passed | 10-03 15:00 | t1 a t3 pass |
| Fede | `rust-01` | passed, época 1 | 10-04 12:00 | t1 a t3 pass |
| Eva | `rust-01` | failed | 10-07 12:00 | t1 a t3 fail |
| Ada | `rust-01` | passed | 10-07 12:00 | t1 a t3 pass |

**El progreso de los ejercicios:**

| Cuenta | Ejercicio | Resolución | Intentos de la época | Ayudas y predicción | Autoevaluación |
| --- | --- | --- | --- | --- | --- |
| Ana | `rust-01` | servidor, 10-05 13:00 | 2 (el último, el aprobado) | `assisted` 1, `solution_seen` 0, `hints_revealed` 1, `prediction_answer` 2, `prediction_correct` 1 | `confident`, repaso 10-25 13:00 |
| Ana | `go-01` | — | 1 (el último, el `compile_error`) | — | — |
| Beto | `rust-01` | **importada**, 10-02 10:00 | 0 | `hints_revealed` 0, `prediction_answer` 0, `prediction_correct` 0 | `again` |
| Beto | `q-rust-01` | servidor, 10-12 14:00 | 1 | — | — |
| Caro | `rust-01` | servidor, 10-03 15:00 | 1 | — | — |
| Eva | `rust-01` | — | 1 | — | — |
| Ada | `rust-01` | servidor, 10-07 12:00 | 1 | — | — |

Fede no tiene filas de progreso: las borró su reset.

**La campaña, los talleres y el recorrido:**
- **Los checkpoints de `fx-world-1`:**
  - Ana, aprobado (10-06 12:00), con la respuesta 2;
  - Beto, no aprobado, con la respuesta 1;
  - Eva, aprobado, con la respuesta 2.
- **El sello:** Beto, en `rust-01`.
- **`fx-workshop-1` en rust:**
  - Ana: código sellado, predicción acertada, respuesta 1, la etapa `e1` marcada y la `e2` desmarcada, y el objetivo `fx-obj-1` observado;
  - Caro: una fila sin nada.
- **El recorrido:**
  - Ana marcó el paso `fx-step-1` y el hito `m-01`, y respondió la pregunta de `fx-step-1` con 1;
  - Beto marcó el paso `fx-step-1`, desmarcó el favorito `rust-01` y respondió la pregunta con 0.

**Las demás tablas:**
- **Las importaciones:** Beto, el 10-02 10:00, de origen `storage` y época 1.
- **Las invitaciones** de Ada:
  - una de alumno, vigente hasta el 10-25;
  - una vencida el 10-10;
  - una de admin, vigente hasta el 10-21 12:00.
- **Las ejecuciones** (ids `019a0000-0000-7000-8000-00000000000N`):
  - **1, Ana:** `rust-01`, `passed`. Aceptada el 10-20 14:00, empezó a las 14:00:01.500 y terminó a las 14:00:02.000, con 300 ms de compilación y 200 de ejecución;
  - **2, Beto:** `go-01`, `infra_error` (`executor_busy`). Aceptada el 10-19 16:00, sin inicio, y terminada el 10-19 16:10;
  - **3, Caro:** `rust-01`, en cola desde el 10-20 14:59;
  - **4, Eva:** `rust-01`, en cola desde el 10-20 14:58.
- **Los testigos:**
  - Ana: la reflexión y la prueba propia de `rust-01`, el borrador de `rust-01`, la nota del taller, la nota del recorrido, y el código y la salida de su ejecución;
  - Beto: el crudo y el informe de su importación.

1. **El soporte de las pruebas,** `tests/Support/StatsWorld.php`:

```php
<?php

namespace Tests\Support;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class StatsWorld
{
    public const NOW = '2026-10-20 15:00:00';

    public const CANARIES = [
        'reflexión privada de Ana', 'prueba privada de Ana', 'borrador privado de Ana', 'nota privada de Ana',
        'código privado de Ana', 'salida privada de Ana', 'crudo privado de Beto',
    ];

    private const STAMP = '2026-10-01 00:00:00.000';

    private const PASS = ['t1' => 'pass', 't2' => 'pass', 't3' => 'pass'];

    /** @return array{admin: int, ana: int, beto: int, caro: int, dani: int, eva: int, fede: int} */
    public static function create(): array
    {
        self::content();
        $ids = self::accounts();
        self::heads($ids);
        $attempts = self::attempts($ids);
        self::progress($ids, $attempts);
        self::campaignAndWorkshops($ids);
        self::route($ids);
        self::imports($ids);
        self::invitations($ids);
        self::runs($ids);
        DB::table('drafts')->insert([
            'user_id' => $ids['ana'], 'exercise_id' => 'rust-01', 'code' => 'borrador privado de Ana', 'starter_hash' => str_repeat('c', 64),
            'set_at' => self::STAMP, 'revision' => 1, 'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);

        return $ids;
    }

    private static function content(): void
    {
        $at = '2026-08-01 00:00:00.000';
        RunWorld::exercise('rust-01', 'rust');
        RunWorld::exercise('rust-02', 'rust');
        RunWorld::exercise('go-01', 'go');
        DB::table('catalogs')->insert([
            ['code' => 'quests', 'slice_by' => 'language', 'chain_position' => null, 'status' => 'active', 'created_at' => $at, 'updated_at' => $at],
            ['code' => 'essentials', 'slice_by' => 'language', 'chain_position' => 1, 'status' => 'active', 'created_at' => $at, 'updated_at' => $at],
        ]);
        RunWorld::exercise('q-rust-01', 'rust');
        RunWorld::exercise('ess-rust-01', 'rust');
        DB::table('exercises')->where('id', 'q-rust-01')->update(['catalog' => 'quests', 'level' => 'beginner']);
        DB::table('exercises')->where('id', 'ess-rust-01')->update(['catalog' => 'essentials']);
        DB::table('exercises')->where('id', 'rust-02')->update(['status' => 'deprecated', 'retired_at' => $at, 'position' => null]);
        ProgressWorld::seed([
            'contentVersion' => '0123456789abcdef0123456789abcdef',
            'exercises' => [],
            'worlds' => [['id' => 'fx-world-1', 'checkpointOptions' => 3]],
            'workshops' => [['id' => 'fx-workshop-1', 'predictionOptions' => 3, 'objectives' => ['fx-obj-1'], 'steps' => ['e1', 'e2']]],
            'guide' => ['steps' => [['id' => 'fx-step-1', 'quizOptions' => 3]], 'resources' => []],
        ]);
        DB::table('world_exercises')->insert([
            'world_id' => 'fx-world-1', 'exercise_id' => 'rust-01', 'role' => 'training', 'position' => 1, 'status' => 'active', 'created_at' => $at, 'updated_at' => $at,
        ]);
    }

    /** @return array{admin: int, ana: int, beto: int, caro: int, dani: int, eva: int, fede: int} */
    private static function accounts(): array
    {
        $at = fn (string $instant) => CarbonImmutable::parse($instant, 'UTC');

        return [
            'admin' => User::factory()->admin()->create(['name' => 'Ada Admin', 'email' => 'ada@stats.test', 'created_at' => $at('2026-08-01 12:00:00'), 'updated_at' => $at('2026-08-01 12:00:00')])->id,
            'ana' => User::factory()->create(['name' => 'Ana Pérez', 'email' => 'ana@stats.test', 'created_at' => $at('2026-09-01 12:00:00'), 'updated_at' => $at('2026-09-01 12:00:00')])->id,
            'beto' => User::factory()->create(['name' => 'Beto Ruiz', 'email' => 'beto@stats.test', 'created_at' => $at('2026-09-01 12:00:00'), 'updated_at' => $at('2026-09-01 12:00:00')])->id,
            'caro' => User::factory()->disabled()->create(['name' => 'Caro Díaz', 'email' => 'caro@stats.test', 'created_at' => $at('2026-09-01 12:00:00'), 'updated_at' => $at('2026-09-01 12:00:00')])->id,
            'dani' => User::factory()->create(['name' => 'Dani Sosa', 'email' => 'dani@stats.test', 'created_at' => $at('2026-10-08 12:00:00'), 'updated_at' => $at('2026-10-08 12:00:00')])->id,
            'eva' => User::factory()->deleting()->create(['name' => 'Eva Luna', 'email' => 'eva@stats.test', 'created_at' => $at('2026-09-01 12:00:00'), 'updated_at' => $at('2026-09-01 12:00:00')])->id,
            'fede' => User::factory()->create(['name' => 'Fede Gómez', 'email' => 'fede@stats.test', 'created_at' => $at('2026-10-03 12:00:00'), 'updated_at' => $at('2026-10-03 12:00:00')])->id,
        ];
    }

    /** @param array<string, int> $ids */
    private static function heads(array $ids): void
    {
        $head = fn (int $userId, string $lastActivity, int $epoch = 1, ?string $resetAt = null) => [
            'user_id' => $userId, 'epoch' => $epoch, 'revision' => 5, 'reset_at' => $resetAt, 'last_activity_at' => $lastActivity,
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ];
        DB::table('progress_heads')->insert([
            $head($ids['admin'], '2026-10-07 12:00:00.000'),
            $head($ids['ana'], '2026-10-20 10:00:00.000'),
            $head($ids['beto'], '2026-10-15 12:00:00.000'),
            $head($ids['caro'], '2026-09-01 12:00:00.000'),
            $head($ids['eva'], '2026-10-19 12:00:00.000'),
            $head($ids['fede'], '2026-10-09 12:00:00.000', 2, '2026-10-09 12:00:00.000'),
        ]);
    }

    /**
     * @param  array<string, int>  $ids
     * @return array<string, int> the attempt ids the progress points to
     */
    private static function attempts(array $ids): array
    {
        self::attempt($ids['ana'], 'rust-01', 'failed', '2026-10-05 12:00:00.000', ['t1' => 'pass', 't2' => 'fail', 't3' => 'missing']);
        $anaPassed = self::attempt($ids['ana'], 'rust-01', 'passed', '2026-10-05 13:00:00.000', self::PASS);
        $anaCompile = self::attempt($ids['ana'], 'go-01', 'compile_error', '2026-10-06 02:30:00.000');
        self::attempt($ids['beto'], 'rust-01', 'passed', '2026-10-02 10:00:00.000', [], legacy: true);
        self::attempt($ids['beto'], 'go-01', 'infra_error', '2026-10-10 12:00:00.000');
        self::attempt($ids['beto'], 'go-01', 'canceled', '2026-10-11 12:00:00.000');
        $betoQuest = self::attempt($ids['beto'], 'q-rust-01', 'passed', '2026-10-12 14:00:00.000', self::PASS);
        $caroPassed = self::attempt($ids['caro'], 'rust-01', 'passed', '2026-10-03 15:00:00.000', self::PASS);
        self::attempt($ids['fede'], 'rust-01', 'passed', '2026-10-04 12:00:00.000', self::PASS);
        $evaFailed = self::attempt($ids['eva'], 'rust-01', 'failed', '2026-10-07 12:00:00.000', ['t1' => 'fail', 't2' => 'fail', 't3' => 'fail']);
        $adaPassed = self::attempt($ids['admin'], 'rust-01', 'passed', '2026-10-07 12:00:00.000', self::PASS);

        return ['anaPassed' => $anaPassed, 'anaCompile' => $anaCompile, 'betoQuest' => $betoQuest, 'caroPassed' => $caroPassed, 'evaFailed' => $evaFailed, 'adaPassed' => $adaPassed];
    }

    /** @param array<string, string> $tests */
    private static function attempt(int $userId, string $exerciseId, string $outcome, string $at, array $tests = [], bool $legacy = false): int
    {
        $id = DB::table('attempts')->insertGetId([
            'user_id' => $userId, 'exercise_id' => $exerciseId, 'epoch' => 1, 'legacy' => $legacy ? 1 : 0, 'outcome' => $outcome,
            'grading_hash' => str_repeat('a', 64), 'code_sha256' => hash('sha256', "{$userId}|{$exerciseId}|{$at}"),
            'attempted_at' => $at, 'started_at' => $legacy ? null : $at, 'finished_at' => $at, 'created_at' => $at,
        ]);
        $position = 0;
        foreach ($tests as $key => $verdict) {
            DB::table('attempt_tests')->insert(['attempt_id' => $id, 'test_key' => $key, 'exercise_id' => $exerciseId, 'position' => ++$position, 'outcome' => $verdict]);
        }

        return $id;
    }

    /**
     * @param  array<string, int>  $ids
     * @param  array<string, int>  $attempts
     */
    private static function progress(array $ids, array $attempts): void
    {
        $row = fn (int $userId, string $exerciseId, array $columns) => [
            'user_id' => $userId, 'exercise_id' => $exerciseId, 'revision' => 1, 'created_at' => self::STAMP, 'updated_at' => self::STAMP, ...$columns,
        ];
        $solved = fn (string $at, int $attemptId) => ['solved_at' => $at, 'server_solved_at' => $at, 'proof_attempt_id' => $attemptId, 'proof_at' => $at, 'last_attempt_id' => $attemptId, 'last_attempt_at' => $at];
        foreach ([
            $row($ids['ana'], 'rust-01', [...$solved('2026-10-05 13:00:00.000', $attempts['anaPassed']), 'attempt_count' => 2, 'assisted' => 1, 'solution_seen' => 0,
                'hints_revealed' => 1, 'prediction_answer' => 2, 'prediction_answer_set_at' => self::STAMP, 'prediction_correct' => 1, 'prediction_correct_at' => self::STAMP,
                'confidence' => 'confident', 'reviewed_at' => '2026-10-05 13:00:00.000', 'review_due_at' => '2026-10-25 13:00:00.000', 'review_set_at' => self::STAMP,
                'reflection' => 'reflexión privada de Ana', 'reflection_set_at' => self::STAMP, 'custom_test' => 'prueba privada de Ana', 'custom_test_set_at' => self::STAMP]),
            $row($ids['ana'], 'go-01', ['attempt_count' => 1, 'last_attempt_id' => $attempts['anaCompile'], 'last_attempt_at' => '2026-10-06 02:30:00.000']),
            $row($ids['beto'], 'rust-01', ['solved_at' => '2026-10-02 10:00:00.000', 'attempt_count' => 0, 'legacy_attempts' => 1, 'hints_revealed' => 0,
                'prediction_answer' => 0, 'prediction_answer_set_at' => self::STAMP, 'prediction_correct' => 0, 'confidence' => 'again', 'review_set_at' => self::STAMP]),
            $row($ids['beto'], 'q-rust-01', [...$solved('2026-10-12 14:00:00.000', $attempts['betoQuest']), 'attempt_count' => 1]),
            $row($ids['caro'], 'rust-01', [...$solved('2026-10-03 15:00:00.000', $attempts['caroPassed']), 'attempt_count' => 1]),
            $row($ids['eva'], 'rust-01', ['attempt_count' => 1, 'last_attempt_id' => $attempts['evaFailed'], 'last_attempt_at' => '2026-10-07 12:00:00.000']),
            $row($ids['admin'], 'rust-01', [...$solved('2026-10-07 12:00:00.000', $attempts['adaPassed']), 'attempt_count' => 1]),
        ] as $progress) {
            DB::table('exercise_progress')->insert($progress);
        }
    }

    /** @param array<string, int> $ids */
    private static function campaignAndWorkshops(array $ids): void
    {
        $stamps = ['revision' => 1, 'created_at' => self::STAMP, 'updated_at' => self::STAMP];
        DB::table('campaign_checkpoints')->insert([
            ['user_id' => $ids['ana'], 'world_id' => 'fx-world-1', 'passed' => 1, 'passed_at' => '2026-10-06 12:00:00.000', 'last_answer' => 2, 'last_answer_set_at' => self::STAMP, ...$stamps],
            ['user_id' => $ids['beto'], 'world_id' => 'fx-world-1', 'passed' => 0, 'passed_at' => null, 'last_answer' => 1, 'last_answer_set_at' => self::STAMP, ...$stamps],
            ['user_id' => $ids['eva'], 'world_id' => 'fx-world-1', 'passed' => 1, 'passed_at' => '2026-10-07 12:00:00.000', 'last_answer' => 2, 'last_answer_set_at' => self::STAMP, ...$stamps],
        ]);
        DB::table('campaign_seals')->insert([
            'user_id' => $ids['beto'], 'exercise_id' => 'rust-01', 'code' => 1, 'prediction' => 0, 'assisted' => 0, 'imported_at' => '2026-10-02 10:00:00.000', 'revision' => 1,
        ]);
        DB::table('workshop_progress')->insert([
            ['user_id' => $ids['ana'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'code_sealed' => 1, 'prediction_correct' => 1, 'prediction_correct_at' => self::STAMP,
                'answer' => 1, 'answer_set_at' => self::STAMP, 'note' => 'nota privada de Ana', 'note_set_at' => self::STAMP, ...$stamps],
            ['user_id' => $ids['caro'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'code_sealed' => 0, 'prediction_correct' => 0, 'prediction_correct_at' => null,
                'answer' => null, 'answer_set_at' => null, 'note' => null, 'note_set_at' => null, ...$stamps],
        ]);
        DB::table('workshop_step_marks')->insert([
            ['user_id' => $ids['ana'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e1', 'marked' => 1, 'set_at' => self::STAMP, ...$stamps],
            ['user_id' => $ids['ana'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e2', 'marked' => 0, 'set_at' => self::STAMP, ...$stamps],
        ]);
        DB::table('workshop_observations')->insert([
            'user_id' => $ids['ana'], 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'objective_key' => 'fx-obj-1',
            'observed_at' => '2026-10-06 12:00:00.000', 'revision' => 1, 'created_at' => self::STAMP,
        ]);
    }

    /** @param array<string, int> $ids */
    private static function route(array $ids): void
    {
        $stamps = ['set_at' => self::STAMP, 'revision' => 1, 'created_at' => self::STAMP, 'updated_at' => self::STAMP];
        DB::table('route_marks')->insert([
            ['user_id' => $ids['ana'], 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1, ...$stamps],
            ['user_id' => $ids['ana'], 'kind' => 'milestone', 'item_key' => 'm-01', 'marked' => 1, ...$stamps],
            ['user_id' => $ids['beto'], 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1, ...$stamps],
            ['user_id' => $ids['beto'], 'kind' => 'favorite', 'item_key' => 'rust-01', 'marked' => 0, ...$stamps],
        ]);
        DB::table('route_quiz_answers')->insert([
            ['user_id' => $ids['ana'], 'step_id' => 'fx-step-1', 'answer' => 1, ...$stamps],
            ['user_id' => $ids['beto'], 'step_id' => 'fx-step-1', 'answer' => 0, ...$stamps],
        ]);
        DB::table('route_notes')->insert(['user_id' => $ids['ana'], 'language' => 'rust', 'field' => 'learned', 'body' => 'nota privada de Ana', ...$stamps]);
    }

    /** @param array<string, int> $ids */
    private static function imports(array $ids): void
    {
        DB::table('progress_imports')->insert([
            'user_id' => $ids['beto'], 'import_id' => '0b0d3c1e-5f6a-4b7c-8d9e-0a1b2c3d4e5f', 'source' => 'storage',
            'raw_payload' => '{"note":"crudo privado de Beto"}', 'raw_sha256' => hash('sha256', 'crudo de Beto'),
            'report' => '{"replaced":["crudo privado de Beto"]}', 'epoch' => 1, 'revision' => 1, 'imported_at' => '2026-10-02 10:00:00.000',
        ]);
    }

    /** @param array<string, int> $ids */
    private static function invitations(array $ids): void
    {
        $invitation = fn (string $email, string $role, string $createdAt, string $expiresAt) => [
            'email' => $email, 'role' => $role, 'delivery' => 'link', 'token_hash' => hash('sha256', $email), 'invited_by' => $ids['admin'],
            'expires_at' => $expiresAt, 'created_at' => $createdAt, 'updated_at' => $createdAt,
        ];
        DB::table('invitations')->insert([
            $invitation('pendiente@stats.test', 'student', '2026-10-18 12:00:00.000', '2026-10-25 12:00:00.000'),
            $invitation('vencida@stats.test', 'student', '2026-10-03 12:00:00.000', '2026-10-10 12:00:00.000'),
            $invitation('admin@stats.test', 'admin', '2026-10-19 12:00:00.000', '2026-10-21 12:00:00.000'),
        ]);
    }

    /** @param array<string, int> $ids */
    private static function runs(array $ids): void
    {
        $id = fn (int $n) => sprintf('019a0000-0000-7000-8000-%012d', $n);
        RunWorld::run(User::findOrFail($ids['ana']), [
            'id' => $id(1), 'exercise_id' => 'rust-01', 'status' => 'passed', 'code' => 'código privado de Ana', 'stdout' => 'salida privada de Ana', 'stderr' => '',
            'program' => null, 'executor_phase' => 'run', 'exit_code' => 0, 'truncated' => 0, 'compile_ms' => 300, 'run_ms' => 200,
            'created_at' => '2026-10-20 14:00:00.000', 'started_at' => '2026-10-20 14:00:01.500', 'finished_at' => '2026-10-20 14:00:02.000', 'expires_at' => null,
        ]);
        RunWorld::run(User::findOrFail($ids['beto']), [
            'id' => $id(2), 'exercise_id' => 'go-01', 'status' => 'infra_error', 'reason' => 'executor_busy', 'program' => null,
            'created_at' => '2026-10-19 16:00:00.000', 'finished_at' => '2026-10-19 16:10:00.000', 'expires_at' => null,
        ]);
        RunWorld::run(User::findOrFail($ids['caro']), ['id' => $id(3), 'exercise_id' => 'rust-01', 'status' => 'queued', 'created_at' => '2026-10-20 14:59:00.000']);
        RunWorld::run(User::findOrFail($ids['eva']), ['id' => $id(4), 'exercise_id' => 'rust-01', 'status' => 'queued', 'created_at' => '2026-10-20 14:58:00.000']);
    }
}
```

La clave `note` del crudo de Beto es a propósito: el crudo nunca sale, así que la clave tampoco.

2. **La prueba del resumen,** `tests/Feature/Stats/OverviewTest.php`:

```php
<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

/**
 * @param  array<string, int>  $attempts
 * @param  array<string, int>  $operations
 * @param  array<string, int>  $firstSolves
 * @return array<string, mixed>
 */
function overviewFigures(array $attempts = [], array $operations = [], int $imported = 0, array $firstSolves = [], int $newStudents = 0, int $imports = 0, int $students = 0): array
{
    return [
        'attempts' => [...['passed' => 0, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0], ...$attempts],
        'operations' => [...['infraError' => 0, 'canceled' => 0], ...$operations],
        'importedAttempts' => $imported,
        'firstSolves' => [...['server' => 0, 'imported' => 0], ...$firstSolves],
        'newStudents' => $newStudents,
        'imports' => $imports,
        'studentsWhoRan' => $students,
    ];
}

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

it('counts the accounts, the activity and each week of the period against the population counted by hand', function () {
    $response = $this->browser->get('/api/admin/stats/overview?from=2026-10-01&to=2026-10-20&granularity=week')->assertOk();

    expect($response->json('data'))->toBe([
        'accounts' => [
            ['role' => 'admin', 'status' => 'active', 'count' => 1],
            ['role' => 'admin', 'status' => 'disabled', 'count' => 0],
            ['role' => 'admin', 'status' => 'deleting', 'count' => 0],
            ['role' => 'student', 'status' => 'active', 'count' => 4],
            ['role' => 'student', 'status' => 'disabled', 'count' => 1],
            ['role' => 'student', 'status' => 'deleting', 'count' => 1],
        ],
        'activeStudents' => ['lastDay' => 1, 'lastWeek' => 2, 'lastMonth' => 3, 'never' => 1],
        'invitations' => ['pending' => 2, 'expired' => 1, 'pendingAdmin' => 1],
        'resetStudents' => 1,
        'totals' => overviewFigures(['passed' => 4, 'failed' => 1, 'compileError' => 1], ['infraError' => 1, 'canceled' => 1], 1, ['server' => 3, 'imported' => 1], 2, 1, 4),
        'series' => [
            ['start' => '2026-10-01', ...overviewFigures(['passed' => 2], [], 1, ['server' => 1, 'imported' => 1], 1, 1, 2)],
            ['start' => '2026-10-05', ...overviewFigures(['passed' => 1, 'failed' => 1, 'compileError' => 1], ['infraError' => 1, 'canceled' => 1], 0, ['server' => 1], 1, 0, 1)],
            ['start' => '2026-10-12', ...overviewFigures(['passed' => 1], [], 0, ['server' => 1], 0, 0, 1)],
            ['start' => '2026-10-19', ...overviewFigures()],
        ],
    ])->and($response->json('meta.period'))->toBe(['from' => '2026-10-01', 'to' => '2026-10-20', 'granularity' => 'week', 'timezone' => 'America/Argentina/Buenos_Aires'])
        ->and($response->json('meta.generatedAt'))->toBe('2026-10-20T15:00:00.000Z');
});

it('cuts the days at the local midnight and keeps the empty ones', function () {
    $series = $this->browser->get('/api/admin/stats/overview?from=2026-10-01&to=2026-10-20&granularity=day')->assertOk()->json('data.series');

    expect($series)->toHaveCount(20)
        ->and($series[4])->toBe(['start' => '2026-10-05', ...overviewFigures(['passed' => 1, 'failed' => 1, 'compileError' => 1], [], 0, ['server' => 1], 0, 0, 1)])
        ->and($series[5])->toBe(['start' => '2026-10-06', ...overviewFigures()]);
});

it('takes the last thirty local days when no period comes', function () {
    $response = $this->browser->get('/api/admin/stats/overview')->assertOk();

    expect($response->json('meta.period'))->toBe(['from' => '2026-09-21', 'to' => '2026-10-20', 'granularity' => 'day', 'timezone' => 'America/Argentina/Buenos_Aires'])
        ->and($response->json('data.series'))->toHaveCount(30);
});

it('serves the same figures for ten minutes and computes them again after', function () {
    $url = '/api/admin/stats/overview?from=2026-10-01&to=2026-10-20&granularity=week';
    $first = $this->browser->get($url)->assertOk()->json();
    DB::table('attempts')->insert([
        'user_id' => $this->ids['ana'], 'exercise_id' => 'rust-01', 'epoch' => 1, 'legacy' => 0, 'outcome' => 'passed', 'grading_hash' => str_repeat('a', 64),
        'code_sha256' => str_repeat('e', 64), 'attempted_at' => '2026-10-15 12:00:00.000', 'started_at' => '2026-10-15 12:00:00.000',
        'finished_at' => '2026-10-15 12:00:00.000', 'created_at' => '2026-10-15 12:00:00.000',
    ]);

    $this->travel(599)->seconds();
    $cached = $this->browser->get($url)->assertOk()->json();
    $this->travel(2)->seconds();
    $fresh = $this->browser->get($url)->assertOk()->json();

    expect($cached)->toBe($first)
        ->and($fresh['data']['totals']['attempts']['passed'])->toBe(5)
        ->and($fresh['meta']['generatedAt'])->toBe('2026-10-20T15:10:01.000Z');
});

it('rejects a period that is reversed, too long, incomplete or with an unknown granularity', function (string $query, string $field) {
    $this->browser->get("/api/admin/stats/overview?{$query}")->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrorFor($field, 'errors');
})->with([
    'reversed' => ['from=2026-10-20&to=2026-10-01', 'to'],
    'longer than 366 days' => ['from=2025-10-19&to=2026-10-20', 'to'],
    'without to' => ['from=2026-10-01', 'to'],
    'without from' => ['to=2026-10-01', 'from'],
    'an impossible date' => ['from=2026-02-30&to=2026-03-01', 'from'],
    'a year granularity' => ['granularity=year', 'granularity'],
]);

it('shows no text of a student', function () {
    $body = (string) $this->browser->get('/api/admin/stats/overview?from=2026-10-01&to=2026-10-20')->assertOk()->getContent();

    foreach (StatsWorld::CANARIES as $canary) {
        expect($body)->not->toContain($canary);
    }
});
```

**Los cambios en las pruebas de C3b:**
- **`tests/Feature/Admin/AdminAccessMatrixTest.php`:** `covers exactly the nine routes` pasa a `covers exactly the ten routes`, con `'GET /api/admin/stats/overview',` en su lugar del orden alfabético, entre `'GET /api/admin/invitations'` y `'GET /api/admin/users'`.
- **`tests/Feature/Admin/NoStudentTextsTest.php`:**
  - `STUDENT_TEXT_KEYS` pasa a `['code', 'reflection', 'note', 'body', 'custom_test', 'raw_payload', 'stdout', 'stderr', 'program', 'nonce', 'report', 'code_sha256', 'raw_sha256']`;
  - en `beforeEach`, después de las dos líneas que actualizan `exercise_progress` y `attempt_payloads`, van estas siembras:

```php
    DB::table('runs')->update(['code' => 'código privado', 'stdout' => 'salida privada', 'stderr' => 'salida privada', 'custom_test' => 'assert!(false)']);
    DB::table('drafts')->update(['code' => 'borrador privado']);
    DB::table('route_notes')->update(['body' => 'nota privada']);
    DB::table('workshop_progress')->update(['note' => 'nota privada']);
    DB::table('progress_imports')->update(['raw_payload' => '{"crudo":"crudo privado"}', 'report' => '{"replaced":["crudo privado"]}']);
```

  - el primer `it` suma a su cadena `->not->toContain('código privado')->not->toContain('borrador privado')->not->toContain('nota privada')->not->toContain('crudo privado')->not->toContain(str_repeat('b', 64))->not->toContain(str_repeat('d', 64))`. Esas dos huellas son el `code_sha256` y el `raw_sha256` que siembra `PopulatedAccount`;
  - el segundo `it` pasa de `toHaveCount(8)` a `toHaveCount(9)`. La ruta del resumen no lleva parámetros, así que la recorre el camino de `GET` sin escenario.

3. **Correrlas:** `--filter='OverviewTest|AdminAccessMatrix|NoStudentTexts'`. `OverviewTest` tiene que fallar con 404 en la ruta, y la matriz, por la ruta que falta.
4. **La implementación.** `app/Stats/StatsSql.php`:

```php
<?php

namespace App\Stats;

final class StatsSql
{
    public const POPULATION = "`u`.`role` = 'student' and `u`.`status` in ('active', 'disabled')";

    public const BUCKETS = <<<'SQL'
        json_table(?, '$[*]' columns (
          `bucket` int path '$[0]' error on empty error on error,
          `starts` datetime(3) path '$[1]' error on empty error on error,
          `ends` datetime(3) path '$[2]' error on empty error on error
        )) as `b`
        SQL;

    public const ATTEMPT_COUNTS = <<<'SQL'
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'passed'), 0) as `passed`,
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'failed'), 0) as `failed`,
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'compile_error'), 0) as `compile_error`,
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'runtime_error'), 0) as `runtime_error`,
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'timeout'), 0) as `timeout`,
        coalesce(sum(`a`.`legacy` = 0 and `a`.`outcome` = 'infra_error'), 0) as `infra_error`,
        coalesce(sum(`a`.`legacy` = 0 and `a`.`outcome` = 'canceled'), 0) as `canceled`,
        coalesce(sum(`a`.`legacy` = 1), 0) as `imported`
        SQL;

    /** @param array<string, string> $parts */
    public static function fill(string $sql, array $parts = []): string
    {
        return strtr($sql, ['{population}' => self::POPULATION, '{buckets}' => self::BUCKETS, '{attempt_counts}' => self::ATTEMPT_COUNTS, ...$parts]);
    }
}
```

`app/Stats/AttemptCounts.php`:

```php
<?php

namespace App\Stats;

use App\Content\Record\RowFields;

final class AttemptCounts
{
    /** @return array{attempts: array{passed: int, failed: int, compileError: int, runtimeError: int, timeout: int}, operations: array{infraError: int, canceled: int}, importedAttempts: int} */
    public static function from(RowFields $row): array
    {
        return [
            'attempts' => [
                'passed' => $row->int('passed'),
                'failed' => $row->int('failed'),
                'compileError' => $row->int('compile_error'),
                'runtimeError' => $row->int('runtime_error'),
                'timeout' => $row->int('timeout'),
            ],
            'operations' => ['infraError' => $row->int('infra_error'), 'canceled' => $row->int('canceled')],
            'importedAttempts' => $row->int('imported'),
        ];
    }

    /** @return array{attempts: array{passed: int, failed: int, compileError: int, runtimeError: int, timeout: int}, operations: array{infraError: int, canceled: int}, importedAttempts: int} */
    public static function zero(): array
    {
        $zeros = ['passed' => 0, 'failed' => 0, 'compile_error' => 0, 'runtime_error' => 0, 'timeout' => 0, 'infra_error' => 0, 'canceled' => 0, 'imported' => 0];

        return self::from(new RowFields($zeros, 'attempts'));
    }
}
```

`app/Stats/Moment.php`:

```php
<?php

namespace App\Stats;

use App\Runs\Record\Instant;

final class Moment
{
    public static function iso(?string $datetime): ?string
    {
        return $datetime === null ? null : Instant::iso(Instant::parse($datetime));
    }
}
```

`app/Stats/OverviewReader.php`:

```php
<?php

namespace App\Stats;

use App\Auth\AccountStatus;
use App\Auth\Role;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;

final class OverviewReader
{
    private const ATTEMPTS_SQL = <<<'SQL'
        select `b`.`bucket`, {attempt_counts},
          count(distinct case when `a`.`counted` = 1 then `a`.`user_id` end) as `students`
        from {buckets}
        left join (`attempts` as `a` join `users` as `u` on `u`.`id` = `a`.`user_id` and {population})
          on `a`.`attempted_at` >= `b`.`starts` and `a`.`attempted_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const SOLVES_SQL = <<<'SQL'
        select `b`.`bucket`,
          coalesce(sum(`p`.`server_solved_at` is not null), 0) as `server`,
          coalesce(sum(`p`.`user_id` is not null and `p`.`server_solved_at` is null), 0) as `imported`
        from {buckets}
        left join (`exercise_progress` as `p` join `users` as `u` on `u`.`id` = `p`.`user_id` and {population})
          on `p`.`solved_at` >= `b`.`starts` and `p`.`solved_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const NEW_STUDENTS_SQL = <<<'SQL'
        select `b`.`bucket`, count(`u`.`id`) as `students`
        from {buckets}
        left join `users` as `u` on {population} and `u`.`created_at` >= `b`.`starts` and `u`.`created_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const IMPORTS_SQL = <<<'SQL'
        select `b`.`bucket`, count(`i`.`id`) as `imports`
        from {buckets}
        left join (`progress_imports` as `i` join `users` as `u` on `u`.`id` = `i`.`user_id` and {population})
          on `i`.`imported_at` >= `b`.`starts` and `i`.`imported_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const ACCOUNTS_SQL = 'select `role`, `status`, count(*) as `accounts` from `users` group by `role`, `status`';

    private const ACTIVITY_SQL = <<<'SQL'
        select
          coalesce(sum(`h`.`last_activity_at` >= ?), 0) as `last_day`,
          coalesce(sum(`h`.`last_activity_at` >= ?), 0) as `last_week`,
          coalesce(sum(`h`.`last_activity_at` >= ?), 0) as `last_month`,
          coalesce(sum(`h`.`last_activity_at` is null), 0) as `never`
        from `users` as `u`
        left join `progress_heads` as `h` on `h`.`user_id` = `u`.`id`
        where {population}
        SQL;

    private const INVITATIONS_SQL = <<<'SQL'
        select
          coalesce(sum(`expires_at` > ?), 0) as `pending`,
          coalesce(sum(`expires_at` <= ?), 0) as `expired`,
          coalesce(sum(`role` = 'admin' and `expires_at` > ?), 0) as `pending_admin`
        from `invitations`
        SQL;

    private const RESETS_SQL = <<<'SQL'
        select count(*) as `students`
        from `progress_heads` as `h`
        join `users` as `u` on `u`.`id` = `h`.`user_id` and {population}
        where `h`.`epoch` > 1
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return array<string, mixed> */
    public function read(Period $period, CarbonImmutable $now): array
    {
        $figures = $this->figures($period->bucketsJson());
        $series = [];
        foreach ($period->buckets() as $index => $bucket) {
            $series[] = ['start' => $bucket['start'], ...$figures[$index]];
        }

        return [
            'accounts' => $this->accounts(),
            'activeStudents' => $this->activeStudents($now),
            'invitations' => $this->invitations($now),
            'resetStudents' => $this->rows->one(StatsSql::fill(self::RESETS_SQL), [], 'progress_heads')->int('students'),
            'totals' => $this->figures($period->wholeJson())[0],
            'series' => $series,
        ];
    }

    /** @return list<array<string, mixed>> */
    private function figures(string $bucketsJson): array
    {
        $attempts = $this->rows->select(StatsSql::fill(self::ATTEMPTS_SQL), [$bucketsJson], 'attempts');
        $solves = $this->rows->select(StatsSql::fill(self::SOLVES_SQL), [$bucketsJson], 'exercise_progress');
        $students = $this->rows->select(StatsSql::fill(self::NEW_STUDENTS_SQL), [$bucketsJson], 'users');
        $imports = $this->rows->select(StatsSql::fill(self::IMPORTS_SQL), [$bucketsJson], 'progress_imports');
        $figures = [];
        foreach ($attempts as $index => $row) {
            $figures[] = [
                ...AttemptCounts::from($row),
                'firstSolves' => ['server' => $solves[$index]->int('server'), 'imported' => $solves[$index]->int('imported')],
                'newStudents' => $students[$index]->int('students'),
                'imports' => $imports[$index]->int('imports'),
                'studentsWhoRan' => $row->int('students'),
            ];
        }

        return $figures;
    }

    /** @return list<array{role: string, status: string, count: int}> */
    private function accounts(): array
    {
        $counts = [];
        foreach ($this->rows->select(self::ACCOUNTS_SQL, [], 'users') as $row) {
            $counts[$row->string('role').'|'.$row->string('status')] = $row->int('accounts');
        }
        $accounts = [];
        foreach (Role::cases() as $role) {
            foreach (AccountStatus::cases() as $status) {
                $accounts[] = ['role' => $role->value, 'status' => $status->value, 'count' => $counts[$role->value.'|'.$status->value] ?? 0];
            }
        }

        return $accounts;
    }

    /** @return array{lastDay: int, lastWeek: int, lastMonth: int, never: int} */
    private function activeStudents(CarbonImmutable $now): array
    {
        $row = $this->rows->one(
            StatsSql::fill(self::ACTIVITY_SQL),
            [Instant::format($now->subDay()), Instant::format($now->subDays(7)), Instant::format($now->subDays(30))],
            'progress_heads',
        );

        return ['lastDay' => $row->int('last_day'), 'lastWeek' => $row->int('last_week'), 'lastMonth' => $row->int('last_month'), 'never' => $row->int('never')];
    }

    /** @return array{pending: int, expired: int, pendingAdmin: int} */
    private function invitations(CarbonImmutable $now): array
    {
        $at = Instant::format($now);
        $row = $this->rows->one(self::INVITATIONS_SQL, [$at, $at, $at], 'invitations');

        return ['pending' => $row->int('pending'), 'expired' => $row->int('expired'), 'pendingAdmin' => $row->int('pending_admin')];
    }
}
```

`app/Http/Requests/Admin/StatsPeriodRequest.php`. No es `final`, porque `ContentStatsRequest` (T006) le suma filtros:

```php
<?php

namespace App\Http\Requests\Admin;

use App\Runs\Record\Instant;
use App\Stats\Granularity;
use App\Stats\Period;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StatsPeriodRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d', 'required_with:to'],
            'to' => ['nullable', 'date_format:Y-m-d', 'required_with:from', 'after_or_equal:from'],
            'granularity' => ['nullable', Rule::enum(Granularity::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'from.*' => __('admin.stats.from'),
            'to.*' => __('admin.stats.to'),
            'granularity.*' => __('admin.stats.granularity'),
        ];
    }

    /** @return list<Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || ! $this->filled('from')) {
                return;
            }
            if ($this->period()->days() > config()->integer('stats.max_days')) {
                $validator->errors()->add('to', __('admin.stats.too_long'));
            }
        }];
    }

    public function period(): Period
    {
        return Period::of(
            $this->filled('from') ? $this->string('from')->toString() : null,
            $this->filled('to') ? $this->string('to')->toString() : null,
            $this->enum('granularity', Granularity::class),
            Instant::now(),
            config()->string('stats.timezone'),
            config()->integer('stats.default_days'),
        );
    }
}
```

`app/Http/Controllers/Admin/StatsController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\StatsPeriodRequest;
use App\Runs\Record\Instant;
use App\Stats\OverviewReader;
use App\Stats\StatsCache;
use Illuminate\Http\JsonResponse;

final class StatsController
{
    public function __construct(private StatsCache $cache) {}

    public function overview(StatsPeriodRequest $request, OverviewReader $reader): JsonResponse
    {
        $period = $request->period();
        $now = Instant::now();
        $entry = $this->cache->remember('overview', $period->cacheKey(), fn (): array => $reader->read($period, $now));

        return response()->json(['data' => $entry['data'], 'meta' => ['generatedAt' => $entry['generatedAt'], 'period' => $period->toMeta()]]);
    }
}
```

`routes/api/admin-stats.php`:

```php
<?php

use App\Http\Controllers\Admin\StatsController;
use Illuminate\Support\Facades\Route;

Route::middleware('admin')->prefix('admin')->group(function () {
    Route::get('/stats/overview', [StatsController::class, 'overview']);
});
```

En `bootstrap/app.php`, después de `__DIR__.'/../routes/api/admin-invitations.php',` va `__DIR__.'/../routes/api/admin-stats.php',`.

En `lang/es/admin.php`, después de `'users' => [...]`, va:

```php
    'stats' => [
        'from' => 'La fecha de inicio tiene que ser una fecha AAAA-MM-DD, y va junto con la de fin.',
        'to' => 'La fecha de fin tiene que ser una fecha AAAA-MM-DD, no anterior a la de inicio, y va junto con la de inicio.',
        'too_long' => 'El período puede tener hasta 366 días.',
        'granularity' => 'El intervalo tiene que ser day, week o month.',
    ],
```

5. **En verde**, con la compuerta de U1 y `--filter='OverviewTest|AdminAccessMatrix|NoStudentTexts'`. Si MySQL rechaza la sintaxis del `left join` con paréntesis o de `JSON_TABLE`, se corrige la consulta y se dice en el informe; los esperados no se tocan.
6. **El commit:** `feat(api): C5 suma el resumen de uso del taller con sus series por período (T005)`.

#### T006 · Los catálogos, los ejercicios y sus pruebas

**Archivos:**
- **se crean:**
  - `app/Stats/Content/ContentFilters.php`, `CatalogStats.php`, `ExerciseStats.php` y `ContentStatsReader.php`;
  - `app/Http/Requests/Admin/ContentStatsRequest.php`;
  - `tests/Feature/Stats/ContentStatsTest.php`;
- **se modifican:**
  - `StatsController.php`, `routes/api/admin-stats.php` y `lang/es/admin.php`;
  - `AdminAccessMatrixTest.php` y `NoStudentTextsTest.php`.

**Interfaces que produce:**

```php
final readonly class ContentFilters
{
    public function __construct(public ?string $catalog, public ?string $language, public ?string $level);
    /** @return array{string, list<string>} condition on alias `e` and its bindings */
    public function exercises(): array;
    /** @return array{string, list<string>} condition on alias `w` (worlds) */
    public function worlds(): array;
    /** @return array{string, list<string>} condition on alias `ws` (workshops) */
    public function workshops(): array;
    /** @return array{catalog: ?string, language: ?string, level: ?string} */
    public function toMeta(): array;
    public function cacheKey(): string;
}
final class CatalogStats { /** @return list<array<string, mixed>> */ public function read(ContentFilters $filters): array; }
final class ExerciseStats { /** @return list<array<string, mixed>> */ public function read(ContentFilters $filters, Period $period): array; }
final class ContentStatsReader { /** @return array<string, mixed> */ public function read(ContentFilters $filters, Period $period): array; }
final class ContentStatsRequest extends StatsPeriodRequest { public function filters(): ContentFilters; }
// StatsController::exercises(ContentStatsRequest $request, ContentStatsReader $reader): JsonResponse
```

1. **La prueba primero,** `tests/Feature/Stats/ContentStatsTest.php`. En T006 lleva sólo `catalogs` y `exercises`; T007 le suma `worlds`, `workshops` y `route`.

```php
<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

/** @return array<string, mixed> */
function exerciseStats(string $id, string $catalog, string $language, ?string $level, array $overrides = []): array
{
    return [
        'exerciseId' => $id, 'catalog' => $catalog, 'language' => $language, 'level' => $level, 'retired' => false,
        'studentsStarted' => 0,
        'solved' => ['server' => 0, 'imported' => 0],
        'attempts' => ['passed' => 0, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
        'operations' => ['infraError' => 0, 'canceled' => 0],
        'importedAttempts' => 0,
        'attemptsMedian' => ['solved' => null, 'unsolved' => null],
        'help' => ['assisted' => 0, 'solutionSeen' => 0, 'hintsRevealed' => []],
        'prediction' => ['answered' => 0, 'correct' => 0, 'options' => []],
        'confidence' => ['again' => 0, 'practice' => 0, 'confident' => 0],
        'tests' => [],
        ...$overrides,
    ];
}

function rustOneStats(): array
{
    return exerciseStats('rust-01', 'lab', 'rust', null, [
        'studentsStarted' => 3,
        'solved' => ['server' => 2, 'imported' => 1],
        'attempts' => ['passed' => 3, 'failed' => 1, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
        'importedAttempts' => 1,
        'attemptsMedian' => ['solved' => 1, 'unsolved' => null],
        'help' => ['assisted' => 1, 'solutionSeen' => 0, 'hintsRevealed' => [['hints' => 0, 'students' => 1], ['hints' => 1, 'students' => 1]]],
        'prediction' => ['answered' => 2, 'correct' => 1, 'options' => [['option' => 0, 'students' => 1], ['option' => 2, 'students' => 1]]],
        'confidence' => ['again' => 1, 'practice' => 0, 'confident' => 1],
        'tests' => [
            ['testKey' => 't1', 'verdicts' => 4, 'fail' => 0, 'missing' => 0],
            ['testKey' => 't2', 'verdicts' => 4, 'fail' => 1, 'missing' => 0],
            ['testKey' => 't3', 'verdicts' => 4, 'fail' => 0, 'missing' => 1],
        ],
    ]);
}

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

it('counts a catalog and its exercises, retired ones included, against the population counted by hand', function () {
    $response = $this->browser->get('/api/admin/stats/exercises?catalog=lab&language=rust&from=2026-10-01&to=2026-10-20')->assertOk();

    expect($response->json('data.catalogs'))->toBe([
        ['catalog' => 'lab', 'language' => 'rust', 'level' => null, 'activeExercises' => 1, 'studentsStarted' => 3, 'studentsSolved' => 3, 'solvedMedian' => 1],
    ])->and($response->json('data.exercises'))->toBe([
        rustOneStats(),
        exerciseStats('rust-02', 'lab', 'rust', null, ['retired' => true]),
    ])->and($response->json('meta.filters'))->toBe(['catalog' => 'lab', 'language' => 'rust', 'level' => null]);
});

it('orders every catalog by its chain and shows a new catalog without code', function () {
    $response = $this->browser->get('/api/admin/stats/exercises?from=2026-10-01&to=2026-10-20')->assertOk();

    expect($response->json('data.catalogs'))->toBe([
        ['catalog' => 'essentials', 'language' => 'rust', 'level' => null, 'activeExercises' => 1, 'studentsStarted' => 0, 'studentsSolved' => 0, 'solvedMedian' => null],
        ['catalog' => 'lab', 'language' => 'go', 'level' => null, 'activeExercises' => 1, 'studentsStarted' => 1, 'studentsSolved' => 0, 'solvedMedian' => 0],
        ['catalog' => 'lab', 'language' => 'rust', 'level' => null, 'activeExercises' => 1, 'studentsStarted' => 3, 'studentsSolved' => 3, 'solvedMedian' => 1],
        ['catalog' => 'quests', 'language' => 'rust', 'level' => 'beginner', 'activeExercises' => 1, 'studentsStarted' => 1, 'studentsSolved' => 1, 'solvedMedian' => 1],
    ])->and(array_column($response->json('data.exercises'), 'exerciseId'))->toBe(['ess-rust-01', 'go-01', 'rust-01', 'rust-02', 'q-rust-01'])
        ->and($response->json('data.exercises.1'))->toBe(exerciseStats('go-01', 'lab', 'go', null, [
            'studentsStarted' => 1,
            'attempts' => ['passed' => 0, 'failed' => 0, 'compileError' => 1, 'runtimeError' => 0, 'timeout' => 0],
            'operations' => ['infraError' => 1, 'canceled' => 1],
            'attemptsMedian' => ['solved' => null, 'unsolved' => 1],
        ]))
        ->and($response->json('data.exercises.4'))->toBe(exerciseStats('q-rust-01', 'quests', 'rust', 'beginner', [
            'studentsStarted' => 1,
            'solved' => ['server' => 1, 'imported' => 0],
            'attempts' => ['passed' => 1, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
            'attemptsMedian' => ['solved' => 1, 'unsolved' => null],
            'tests' => [
                ['testKey' => 't1', 'verdicts' => 1, 'fail' => 0, 'missing' => 0],
                ['testKey' => 't2', 'verdicts' => 1, 'fail' => 0, 'missing' => 0],
                ['testKey' => 't3', 'verdicts' => 1, 'fail' => 0, 'missing' => 0],
            ],
        ]));
});

it('applies the period to the attempts and not to the current state', function () {
    $response = $this->browser->get('/api/admin/stats/exercises?catalog=lab&language=rust&from=2026-10-12&to=2026-10-20')->assertOk();

    expect($response->json('data.exercises.0'))->toBe([
        ...rustOneStats(),
        'attempts' => ['passed' => 0, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
        'importedAttempts' => 0,
        'tests' => [],
    ]);
});

it('rejects an unknown catalog, language or level', function (string $query, string $field) {
    $this->browser->get("/api/admin/stats/exercises?{$query}")->assertStatus(422)->assertJsonValidationErrorFor($field, 'errors');
})->with([
    'catalog' => ['catalog=nope', 'catalog'],
    'language' => ['language=python', 'language'],
    'level' => ['level=master', 'level'],
]);

it('shows no text of a student', function () {
    $body = (string) $this->browser->get('/api/admin/stats/exercises')->assertOk()->getContent();

    foreach (StatsWorld::CANARIES as $canary) {
        expect($body)->not->toContain($canary);
    }
});
```

`AdminAccessMatrixTest` pasa a «eleven routes» y suma `'GET /api/admin/stats/exercises',` antes de `'GET /api/admin/stats/overview'`. `NoStudentTextsTest` pasa a `toHaveCount(10)`.

2. **Correrla:** `--filter='ContentStatsTest|AdminAccessMatrix|NoStudentTexts'`. Tiene que fallar con 404.
3. **La implementación.** `app/Stats/Content/ContentFilters.php`:

```php
<?php

namespace App\Stats\Content;

final readonly class ContentFilters
{
    public function __construct(public ?string $catalog, public ?string $language, public ?string $level) {}

    /** @return array{string, list<string>} */
    public function exercises(): array
    {
        return $this->where(['catalog' => '`e`.`catalog`', 'language' => '`e`.`language`', 'level' => '`e`.`level`']);
    }

    /** @return array{string, list<string>} */
    public function worlds(): array
    {
        return $this->where(['language' => '`w`.`language`', 'level' => '`w`.`level`']);
    }

    /** @return array{string, list<string>} */
    public function workshops(): array
    {
        return $this->where(['level' => '`ws`.`level`']);
    }

    /** @return array{catalog: ?string, language: ?string, level: ?string} */
    public function toMeta(): array
    {
        return ['catalog' => $this->catalog, 'language' => $this->language, 'level' => $this->level];
    }

    public function cacheKey(): string
    {
        return json_encode($this->toMeta(), JSON_THROW_ON_ERROR);
    }

    /**
     * @param  array<'catalog'|'language'|'level', string>  $columns
     * @return array{string, list<string>}
     */
    private function where(array $columns): array
    {
        $clauses = ['1 = 1'];
        $bindings = [];
        foreach ($columns as $filter => $column) {
            $value = match ($filter) {
                'catalog' => $this->catalog,
                'language' => $this->language,
                'level' => $this->level,
            };
            if ($value !== null) {
                $clauses[] = "{$column} = ?";
                $bindings[] = $value;
            }
        }

        return [implode(' and ', $clauses), $bindings];
    }
}
```

`app/Stats/Content/CatalogStats.php`:

```php
<?php

namespace App\Stats\Content;

use App\Content\Record\RowFields;
use App\Stats\Median;
use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class CatalogStats
{
    private const CATALOGS_SQL = <<<'SQL'
        select `c`.`code` as `catalog`, `c`.`chain_position`, `e`.`language`, `e`.`level`,
          coalesce(sum(`e`.`status` = 'active'), 0) as `active_exercises`
        from `catalogs` as `c`
        join `exercises` as `e` on `e`.`catalog` = `c`.`code`
        where {filters}
        group by `c`.`code`, `c`.`chain_position`, `e`.`language`, `e`.`level`
        order by `c`.`chain_position` is null, `c`.`chain_position`, `c`.`code`, `e`.`language`, `e`.`level`
        SQL;

    private const STUDENTS_SQL = <<<'SQL'
        select `s`.`catalog`, `s`.`language`, `s`.`level`, `s`.`solved`, count(*) as `students`
        from (
          select `e`.`catalog`, `e`.`language`, `e`.`level`, `p`.`user_id`, sum(`p`.`solved_at` is not null) as `solved`
          from `exercise_progress` as `p`
          join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
          join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
          where {filters}
          group by `e`.`catalog`, `e`.`language`, `e`.`level`, `p`.`user_id`
        ) as `s`
        group by `s`.`catalog`, `s`.`language`, `s`.`level`, `s`.`solved`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return list<array<string, mixed>> */
    public function read(ContentFilters $filters): array
    {
        [$where, $bindings] = $filters->exercises();
        $students = [];
        foreach ($this->rows->select(StatsSql::fill(self::STUDENTS_SQL, ['{filters}' => $where]), $bindings, 'exercise_progress') as $row) {
            $students[self::key($row)][$row->int('solved')] = $row->int('students');
        }
        $catalogs = [];
        foreach ($this->rows->select(StatsSql::fill(self::CATALOGS_SQL, ['{filters}' => $where]), $bindings, 'exercises') as $row) {
            $frequencies = $students[self::key($row)] ?? [];
            $started = 0;
            $solvedSome = 0;
            foreach ($frequencies as $solved => $count) {
                $started += $count;
                if ($solved > 0) {
                    $solvedSome += $count;
                }
            }
            $catalogs[] = [
                'catalog' => $row->string('catalog'),
                'language' => $row->string('language'),
                'level' => $row->nullableString('level'),
                'activeExercises' => $row->int('active_exercises'),
                'studentsStarted' => $started,
                'studentsSolved' => $solvedSome,
                'solvedMedian' => Median::of($frequencies),
            ];
        }

        return $catalogs;
    }

    private static function key(RowFields $row): string
    {
        return $row->string('catalog').'|'.$row->string('language').'|'.($row->nullableString('level') ?? '');
    }
}
```

`app/Stats/Content/ExerciseStats.php`:

```php
<?php

namespace App\Stats\Content;

use App\Content\Record\RowFields;
use App\Stats\AttemptCounts;
use App\Stats\Median;
use App\Stats\Period;
use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class ExerciseStats
{
    private const EXERCISES_SQL = <<<'SQL'
        select `e`.`id`, `e`.`catalog`, `e`.`language`, `e`.`level`, `e`.`status`
        from `exercises` as `e`
        where {filters}
        order by `e`.`catalog`, `e`.`language`, `e`.`stage`, `e`.`id`
        SQL;

    private const PROGRESS_SQL = <<<'SQL'
        select `p`.`exercise_id`,
          count(*) as `started`,
          coalesce(sum(`p`.`server_solved_at` is not null), 0) as `solved_server`,
          coalesce(sum(`p`.`solved_at` is not null and `p`.`server_solved_at` is null), 0) as `solved_imported`,
          coalesce(sum(`p`.`assisted` = 1), 0) as `assisted`,
          coalesce(sum(`p`.`solution_seen` = 1), 0) as `solution_seen`,
          coalesce(sum(`p`.`prediction_answer` is not null or `p`.`prediction_correct` = 1), 0) as `prediction_answered`,
          coalesce(sum(`p`.`prediction_correct` = 1), 0) as `prediction_correct`,
          coalesce(sum(`p`.`confidence` = 'again'), 0) as `again`,
          coalesce(sum(`p`.`confidence` = 'practice'), 0) as `practice`,
          coalesce(sum(`p`.`confidence` = 'confident'), 0) as `confident`
        from `exercise_progress` as `p`
        join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
        where {filters}
        group by `p`.`exercise_id`
        SQL;

    private const DISTRIBUTION_SQL = <<<'SQL'
        select `p`.`exercise_id`, `p`.{column} as `value`, count(*) as `students`
        from `exercise_progress` as `p`
        join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
        where {filters} and `p`.{column} is not null
        group by `p`.`exercise_id`, `p`.{column}
        order by `p`.`exercise_id`, `p`.{column}
        SQL;

    private const MEDIANS_SQL = <<<'SQL'
        select `p`.`exercise_id`, `p`.`solved_at` is not null as `solved`, `p`.`attempt_count` as `value`, count(*) as `students`
        from `exercise_progress` as `p`
        join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
        where {filters}
        group by `p`.`exercise_id`, `solved`, `p`.`attempt_count`
        SQL;

    private const ATTEMPTS_SQL = <<<'SQL'
        select `a`.`exercise_id`, {attempt_counts}
        from `attempts` as `a`
        join `users` as `u` on `u`.`id` = `a`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `a`.`exercise_id`
        where `a`.`attempted_at` >= ? and `a`.`attempted_at` < ? and {filters}
        group by `a`.`exercise_id`
        SQL;

    private const TESTS_SQL = <<<'SQL'
        select `t`.`exercise_id`, `t`.`test_key`, min(`t`.`position`) as `position`,
          count(*) as `verdicts`,
          coalesce(sum(`t`.`outcome` = 'fail'), 0) as `fail`,
          coalesce(sum(`t`.`outcome` = 'missing'), 0) as `missing`
        from `attempt_tests` as `t`
        join `attempts` as `a` on `a`.`id` = `t`.`attempt_id`
        join `users` as `u` on `u`.`id` = `a`.`user_id` and {population}
        join `exercises` as `e` on `e`.`id` = `t`.`exercise_id`
        where `a`.`counted` = 1 and `a`.`attempted_at` >= ? and `a`.`attempted_at` < ? and {filters}
        group by `t`.`exercise_id`, `t`.`test_key`
        order by `t`.`exercise_id`, `position`, `t`.`test_key`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return list<array<string, mixed>> */
    public function read(ContentFilters $filters, Period $period): array
    {
        [$where, $bindings] = $filters->exercises();
        $inPeriod = [$period->startsUtc(), $period->endsUtc(), ...$bindings];
        $progress = $this->keyed($this->rows->select(StatsSql::fill(self::PROGRESS_SQL, ['{filters}' => $where]), $bindings, 'exercise_progress'));
        $attempts = $this->keyed($this->rows->select(StatsSql::fill(self::ATTEMPTS_SQL, ['{filters}' => $where]), $inPeriod, 'attempts'));
        $hints = $this->distribution('`hints_revealed`', $where, $bindings);
        $options = $this->distribution('`prediction_answer`', $where, $bindings);
        $medians = $this->medians($where, $bindings);
        $tests = $this->tests($where, $inPeriod);

        $exercises = [];
        foreach ($this->rows->select(StatsSql::fill(self::EXERCISES_SQL, ['{filters}' => $where]), $bindings, 'exercises') as $exercise) {
            $id = $exercise->string('id');
            $row = $progress[$id] ?? null;
            $exercises[] = [
                'exerciseId' => $id,
                'catalog' => $exercise->string('catalog'),
                'language' => $exercise->string('language'),
                'level' => $exercise->nullableString('level'),
                'retired' => $exercise->string('status') !== 'active',
                'studentsStarted' => $row?->int('started') ?? 0,
                'solved' => ['server' => $row?->int('solved_server') ?? 0, 'imported' => $row?->int('solved_imported') ?? 0],
                ...(isset($attempts[$id]) ? AttemptCounts::from($attempts[$id]) : AttemptCounts::zero()),
                'attemptsMedian' => ['solved' => Median::of($medians[$id][1] ?? []), 'unsolved' => Median::of($medians[$id][0] ?? [])],
                'help' => [
                    'assisted' => $row?->int('assisted') ?? 0,
                    'solutionSeen' => $row?->int('solution_seen') ?? 0,
                    'hintsRevealed' => self::listOf($hints[$id] ?? [], 'hints'),
                ],
                'prediction' => [
                    'answered' => $row?->int('prediction_answered') ?? 0,
                    'correct' => $row?->int('prediction_correct') ?? 0,
                    'options' => self::listOf($options[$id] ?? [], 'option'),
                ],
                'confidence' => ['again' => $row?->int('again') ?? 0, 'practice' => $row?->int('practice') ?? 0, 'confident' => $row?->int('confident') ?? 0],
                'tests' => $tests[$id] ?? [],
            ];
        }

        return $exercises;
    }

    /**
     * @param  list<RowFields>  $rows
     * @return array<string, RowFields>
     */
    private function keyed(array $rows): array
    {
        $keyed = [];
        foreach ($rows as $row) {
            $keyed[$row->string('exercise_id')] = $row;
        }

        return $keyed;
    }

    /**
     * @param  list<string>  $bindings
     * @return array<string, array<int, int>>
     */
    private function distribution(string $column, string $where, array $bindings): array
    {
        $byExercise = [];
        $sql = StatsSql::fill(self::DISTRIBUTION_SQL, ['{filters}' => $where, '{column}' => $column]);
        foreach ($this->rows->select($sql, $bindings, 'exercise_progress') as $row) {
            $byExercise[$row->string('exercise_id')][$row->int('value')] = $row->int('students');
        }

        return $byExercise;
    }

    /**
     * @param  list<string>  $bindings
     * @return array<string, array<int, array<int, int>>> by exercise, then solved (1) or not (0), then students by attempt count
     */
    private function medians(string $where, array $bindings): array
    {
        $byExercise = [];
        foreach ($this->rows->select(StatsSql::fill(self::MEDIANS_SQL, ['{filters}' => $where]), $bindings, 'exercise_progress') as $row) {
            $byExercise[$row->string('exercise_id')][$row->int('solved')][$row->int('value')] = $row->int('students');
        }

        return $byExercise;
    }

    /**
     * @param  list<string>  $bindings
     * @return array<string, list<array{testKey: string, verdicts: int, fail: int, missing: int}>>
     */
    private function tests(string $where, array $bindings): array
    {
        $byExercise = [];
        foreach ($this->rows->select(StatsSql::fill(self::TESTS_SQL, ['{filters}' => $where]), $bindings, 'attempt_tests') as $row) {
            $byExercise[$row->string('exercise_id')][] = [
                'testKey' => $row->string('test_key'),
                'verdicts' => $row->int('verdicts'),
                'fail' => $row->int('fail'),
                'missing' => $row->int('missing'),
            ];
        }

        return $byExercise;
    }

    /**
     * @param  array<int, int>  $counts
     * @return list<array<string, int>>
     */
    private static function listOf(array $counts, string $label): array
    {
        $list = [];
        foreach ($counts as $value => $students) {
            $list[] = [$label => $value, 'students' => $students];
        }

        return $list;
    }
}
```

`app/Stats/Content/ContentStatsReader.php`:

```php
<?php

namespace App\Stats\Content;

use App\Stats\Period;

final class ContentStatsReader
{
    public function __construct(private CatalogStats $catalogs, private ExerciseStats $exercises) {}

    /** @return array<string, mixed> */
    public function read(ContentFilters $filters, Period $period): array
    {
        return ['catalogs' => $this->catalogs->read($filters), 'exercises' => $this->exercises->read($filters, $period)];
    }
}
```

`app/Http/Requests/Admin/ContentStatsRequest.php`:

```php
<?php

namespace App\Http\Requests\Admin;

use App\Runs\RunLanguage;
use App\Stats\Content\ContentFilters;
use Illuminate\Validation\Rule;

final class ContentStatsRequest extends StatsPeriodRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'catalog' => ['nullable', 'string', 'max:32', Rule::exists('catalogs', 'code')],
            'language' => ['nullable', Rule::enum(RunLanguage::class)],
            'level' => ['nullable', Rule::in(['beginner', 'medium', 'advanced', 'expert'])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            'catalog.*' => __('admin.stats.catalog'),
            'language.*' => __('admin.stats.language'),
            'level.*' => __('admin.stats.level'),
        ];
    }

    public function filters(): ContentFilters
    {
        return new ContentFilters(
            $this->filled('catalog') ? $this->string('catalog')->toString() : null,
            $this->filled('language') ? $this->string('language')->toString() : null,
            $this->filled('level') ? $this->string('level')->toString() : null,
        );
    }
}
```

En `StatsController` va el método nuevo (con `use App\Http\Requests\Admin\ContentStatsRequest;` y `use App\Stats\Content\ContentStatsReader;`):

```php
    public function exercises(ContentStatsRequest $request, ContentStatsReader $reader): JsonResponse
    {
        $period = $request->period();
        $filters = $request->filters();
        $entry = $this->cache->remember('exercises', $period->cacheKey().'|'.$filters->cacheKey(), fn (): array => $reader->read($filters, $period));

        return response()->json([
            'data' => $entry['data'],
            'meta' => ['generatedAt' => $entry['generatedAt'], 'period' => $period->toMeta(), 'filters' => $filters->toMeta()],
        ]);
    }
```

En `routes/api/admin-stats.php` va `Route::get('/stats/exercises', [StatsController::class, 'exercises']);`, y en `lang/es/admin.php`, dentro de `stats`:

```php
        'catalog' => 'El catálogo no existe.',
        'language' => 'El lenguaje tiene que ser rust o go.',
        'level' => 'El nivel tiene que ser beginner, medium, advanced o expert.',
```

4. **En verde**, con `--filter='ContentStatsTest|OverviewTest|AdminAccessMatrix|NoStudentTexts'`.
5. **Los checks:** `api:analyse` y `api:format:check`.
6. **El commit:** `feat(api): C5 suma las estadísticas de los catálogos, los ejercicios y sus pruebas (T006)`.

#### T007 · Los mundos, los talleres y el recorrido

**Archivos:**
- se crean `app/Stats/Content/CampaignStats.php`, `WorkshopStats.php` y `RouteStats.php`;
- se modifican `ContentStatsReader.php` y `ContentStatsTest.php`.

**Interfaces:**
- `CampaignStats::read(ContentFilters $filters): list<array<string, mixed>>`;
- `WorkshopStats::read(ContentFilters $filters): list<array<string, mixed>>`;
- `RouteStats::read(): array{marks: list<…>, quiz: list<…>}`;
- `ContentStatsReader::read()` devuelve `catalogs`, `exercises`, `worlds`, `workshops` y `route`, en ese orden.

1. **La prueba primero:** en `ContentStatsTest`, un `it` nuevo:

```php
it('counts the world, the workshop in each language and the route against the population counted by hand', function () {
    $data = $this->browser->get('/api/admin/stats/exercises?from=2026-10-01&to=2026-10-20')->assertOk()->json('data');

    expect(array_keys($data))->toBe(['catalogs', 'exercises', 'worlds', 'workshops', 'route'])
        ->and($data['worlds'])->toBe([
            ['worldId' => 'fx-world-1', 'language' => 'rust', 'level' => 'beginner', 'retired' => false, 'exercises' => 1, 'solvedRows' => 3, 'studentsWithSeals' => 1,
                'checkpoint' => ['answered' => 2, 'passed' => 1, 'options' => [['option' => 1, 'students' => 1], ['option' => 2, 'students' => 1]]]],
        ])
        ->and($data['workshops'])->toBe([
            ['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'level' => 'beginner', 'retired' => false, 'studentsStarted' => 2, 'codeSealed' => 1,
                'prediction' => ['answered' => 1, 'correct' => 1, 'options' => [['option' => 1, 'students' => 1]]],
                'stepsMarkedMedian' => 0.5, 'objectivesObservedMedian' => 0.5],
            ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'level' => 'beginner', 'retired' => false, 'studentsStarted' => 0, 'codeSealed' => 0,
                'prediction' => ['answered' => 0, 'correct' => 0, 'options' => []],
                'stepsMarkedMedian' => null, 'objectivesObservedMedian' => null],
        ])
        ->and($data['route'])->toBe([
            'marks' => [['kind' => 'step', 'itemKey' => 'fx-step-1', 'students' => 2], ['kind' => 'milestone', 'itemKey' => 'm-01', 'students' => 1]],
            'quiz' => [['stepId' => 'fx-step-1', 'answered' => 2, 'options' => [['option' => 0, 'students' => 1], ['option' => 1, 'students' => 1]]]],
        ]);
});

it('filters the worlds and the workshops by language', function () {
    $data = $this->browser->get('/api/admin/stats/exercises?language=go')->assertOk()->json('data');

    expect($data['worlds'])->toBe([])
        ->and(array_column($data['workshops'], 'language'))->toBe(['go']);
});
```

Los dos primeros `it` de T006 siguen comparando sólo `data.catalogs` y `data.exercises`. Los dos casos de 0,5 son las medianas de [1, 0]: Ana marcó una etapa y observó un objetivo, y Caro, ninguno.

2. **Correrla:** `--filter=ContentStatsTest`. Tiene que fallar, porque faltan las claves.
3. **La implementación.** `app/Stats/Content/CampaignStats.php`:

```php
<?php

namespace App\Stats\Content;

use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class CampaignStats
{
    private const WORLDS_SQL = <<<'SQL'
        select `w`.`id`, `w`.`language`, `w`.`level`, `w`.`status`,
          (select count(*) from `world_exercises` as `x` where `x`.`world_id` = `w`.`id` and `x`.`status` = 'active') as `exercises`
        from `worlds` as `w`
        where {filters}
        order by `w`.`language`, `w`.`position` is null, `w`.`position`, `w`.`id`
        SQL;

    private const CHECKPOINTS_SQL = <<<'SQL'
        select `k`.`world_id`,
          coalesce(sum(`k`.`last_answer` is not null or `k`.`passed` = 1), 0) as `answered`,
          coalesce(sum(`k`.`passed` = 1), 0) as `passed`
        from `campaign_checkpoints` as `k`
        join `users` as `u` on `u`.`id` = `k`.`user_id` and {population}
        group by `k`.`world_id`
        SQL;

    private const OPTIONS_SQL = <<<'SQL'
        select `k`.`world_id`, `k`.`last_answer` as `value`, count(*) as `students`
        from `campaign_checkpoints` as `k`
        join `users` as `u` on `u`.`id` = `k`.`user_id` and {population}
        where `k`.`last_answer` is not null
        group by `k`.`world_id`, `k`.`last_answer`
        order by `k`.`world_id`, `k`.`last_answer`
        SQL;

    private const SEALS_SQL = <<<'SQL'
        select `x`.`world_id`, count(distinct `s`.`user_id`) as `students`
        from `campaign_seals` as `s`
        join `users` as `u` on `u`.`id` = `s`.`user_id` and {population}
        join `world_exercises` as `x` on `x`.`exercise_id` = `s`.`exercise_id`
        group by `x`.`world_id`
        SQL;

    private const SOLVED_SQL = <<<'SQL'
        select `x`.`world_id`, count(*) as `solved`
        from `exercise_progress` as `p`
        join `users` as `u` on `u`.`id` = `p`.`user_id` and {population}
        join `world_exercises` as `x` on `x`.`exercise_id` = `p`.`exercise_id`
        where `p`.`solved_at` is not null
        group by `x`.`world_id`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return list<array<string, mixed>> */
    public function read(ContentFilters $filters): array
    {
        [$where, $bindings] = $filters->worlds();
        $checkpoints = [];
        foreach ($this->rows->select(StatsSql::fill(self::CHECKPOINTS_SQL), [], 'campaign_checkpoints') as $row) {
            $checkpoints[$row->string('world_id')] = ['answered' => $row->int('answered'), 'passed' => $row->int('passed')];
        }
        $options = [];
        foreach ($this->rows->select(StatsSql::fill(self::OPTIONS_SQL), [], 'campaign_checkpoints') as $row) {
            $options[$row->string('world_id')][] = ['option' => $row->int('value'), 'students' => $row->int('students')];
        }
        $seals = $this->countsBy(self::SEALS_SQL, 'students');
        $solved = $this->countsBy(self::SOLVED_SQL, 'solved');

        $worlds = [];
        foreach ($this->rows->select(StatsSql::fill(self::WORLDS_SQL, ['{filters}' => $where]), $bindings, 'worlds') as $world) {
            $id = $world->string('id');
            $worlds[] = [
                'worldId' => $id,
                'language' => $world->string('language'),
                'level' => $world->string('level'),
                'retired' => $world->string('status') !== 'active',
                'exercises' => $world->int('exercises'),
                'solvedRows' => $solved[$id] ?? 0,
                'studentsWithSeals' => $seals[$id] ?? 0,
                'checkpoint' => [
                    'answered' => $checkpoints[$id]['answered'] ?? 0,
                    'passed' => $checkpoints[$id]['passed'] ?? 0,
                    'options' => $options[$id] ?? [],
                ],
            ];
        }

        return $worlds;
    }

    /** @return array<string, int> */
    private function countsBy(string $sql, string $column): array
    {
        $counts = [];
        foreach ($this->rows->select(StatsSql::fill($sql), [], 'worlds') as $row) {
            $counts[$row->string('world_id')] = $row->int($column);
        }

        return $counts;
    }
}
```

`app/Stats/Content/WorkshopStats.php`:

```php
<?php

namespace App\Stats\Content;

use App\Runs\RunLanguage;
use App\Stats\Median;
use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class WorkshopStats
{
    private const WORKSHOPS_SQL = <<<'SQL'
        select `ws`.`id`, `ws`.`level`, `ws`.`status`
        from `workshops` as `ws`
        where {filters}
        order by `ws`.`domain`, `ws`.`position` is null, `ws`.`position`, `ws`.`id`
        SQL;

    private const PROGRESS_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, count(*) as `started`,
          coalesce(sum(`w`.`code_sealed` = 1), 0) as `sealed`,
          coalesce(sum(`w`.`answer` is not null or `w`.`prediction_correct` = 1), 0) as `answered`,
          coalesce(sum(`w`.`prediction_correct` = 1), 0) as `correct`
        from `workshop_progress` as `w`
        join `users` as `u` on `u`.`id` = `w`.`user_id` and {population}
        group by `w`.`workshop_id`, `w`.`language`
        SQL;

    private const OPTIONS_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, `w`.`answer` as `value`, count(*) as `students`
        from `workshop_progress` as `w`
        join `users` as `u` on `u`.`id` = `w`.`user_id` and {population}
        where `w`.`answer` is not null
        group by `w`.`workshop_id`, `w`.`language`, `w`.`answer`
        order by `w`.`workshop_id`, `w`.`language`, `w`.`answer`
        SQL;

    private const STEPS_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, coalesce(`m`.`marks`, 0) as `value`, count(*) as `students`
        from `workshop_progress` as `w`
        join `users` as `u` on `u`.`id` = `w`.`user_id` and {population}
        left join (
          select `user_id`, `workshop_id`, `language`, count(*) as `marks`
          from `workshop_step_marks`
          where `marked` = 1
          group by `user_id`, `workshop_id`, `language`
        ) as `m` on `m`.`user_id` = `w`.`user_id` and `m`.`workshop_id` = `w`.`workshop_id` and `m`.`language` = `w`.`language`
        group by `w`.`workshop_id`, `w`.`language`, `value`
        SQL;

    private const OBJECTIVES_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, coalesce(`o`.`observed`, 0) as `value`, count(*) as `students`
        from `workshop_progress` as `w`
        join `users` as `u` on `u`.`id` = `w`.`user_id` and {population}
        left join (
          select `user_id`, `workshop_id`, `language`, count(*) as `observed`
          from `workshop_observations`
          where `observed_at` is not null
          group by `user_id`, `workshop_id`, `language`
        ) as `o` on `o`.`user_id` = `w`.`user_id` and `o`.`workshop_id` = `w`.`workshop_id` and `o`.`language` = `w`.`language`
        group by `w`.`workshop_id`, `w`.`language`, `value`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return list<array<string, mixed>> */
    public function read(ContentFilters $filters): array
    {
        [$where, $bindings] = $filters->workshops();
        $progress = [];
        foreach ($this->rows->select(StatsSql::fill(self::PROGRESS_SQL), [], 'workshop_progress') as $row) {
            $progress[$row->string('workshop_id').'|'.$row->string('language')] = $row;
        }
        $options = [];
        foreach ($this->rows->select(StatsSql::fill(self::OPTIONS_SQL), [], 'workshop_progress') as $row) {
            $options[$row->string('workshop_id').'|'.$row->string('language')][] = ['option' => $row->int('value'), 'students' => $row->int('students')];
        }
        $steps = $this->frequencies(self::STEPS_SQL);
        $objectives = $this->frequencies(self::OBJECTIVES_SQL);

        $workshops = [];
        foreach ($this->rows->select(StatsSql::fill(self::WORKSHOPS_SQL, ['{filters}' => $where]), $bindings, 'workshops') as $workshop) {
            foreach (RunLanguage::cases() as $language) {
                if ($filters->language !== null && $filters->language !== $language->value) {
                    continue;
                }
                $key = $workshop->string('id').'|'.$language->value;
                $row = $progress[$key] ?? null;
                $workshops[] = [
                    'workshopId' => $workshop->string('id'),
                    'language' => $language->value,
                    'level' => $workshop->string('level'),
                    'retired' => $workshop->string('status') !== 'active',
                    'studentsStarted' => $row?->int('started') ?? 0,
                    'codeSealed' => $row?->int('sealed') ?? 0,
                    'prediction' => ['answered' => $row?->int('answered') ?? 0, 'correct' => $row?->int('correct') ?? 0, 'options' => $options[$key] ?? []],
                    'stepsMarkedMedian' => Median::of($steps[$key] ?? []),
                    'objectivesObservedMedian' => Median::of($objectives[$key] ?? []),
                ];
            }
        }

        return $workshops;
    }

    /** @return array<string, array<int, int>> */
    private function frequencies(string $sql): array
    {
        $byWorkshop = [];
        foreach ($this->rows->select(StatsSql::fill($sql), [], 'workshop_progress') as $row) {
            $byWorkshop[$row->string('workshop_id').'|'.$row->string('language')][$row->int('value')] = $row->int('students');
        }

        return $byWorkshop;
    }
}
```

`RunLanguage::cases()` da `Rust` y después `Go` (`app/Runs/RunLanguage.php`), así que cada taller sale primero en rust y después en go.

`app/Stats/Content/RouteStats.php`:

```php
<?php

namespace App\Stats\Content;

use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class RouteStats
{
    private const MARKS_SQL = <<<'SQL'
        select `r`.`kind`, `r`.`item_key`, count(*) as `students`
        from `route_marks` as `r`
        join `users` as `u` on `u`.`id` = `r`.`user_id` and {population}
        where `r`.`marked` = 1
        group by `r`.`kind`, `r`.`item_key`
        order by `r`.`kind`, `r`.`item_key`
        SQL;

    private const QUIZ_SQL = <<<'SQL'
        select `q`.`step_id`, count(*) as `answered`
        from `route_quiz_answers` as `q`
        join `users` as `u` on `u`.`id` = `q`.`user_id` and {population}
        group by `q`.`step_id`
        order by `q`.`step_id`
        SQL;

    private const QUIZ_OPTIONS_SQL = <<<'SQL'
        select `q`.`step_id`, `q`.`answer` as `value`, count(*) as `students`
        from `route_quiz_answers` as `q`
        join `users` as `u` on `u`.`id` = `q`.`user_id` and {population}
        group by `q`.`step_id`, `q`.`answer`
        order by `q`.`step_id`, `q`.`answer`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return array{marks: list<array{kind: string, itemKey: string, students: int}>, quiz: list<array<string, mixed>>} */
    public function read(): array
    {
        $marks = [];
        foreach ($this->rows->select(StatsSql::fill(self::MARKS_SQL), [], 'route_marks') as $row) {
            $marks[] = ['kind' => $row->string('kind'), 'itemKey' => $row->string('item_key'), 'students' => $row->int('students')];
        }
        $options = [];
        foreach ($this->rows->select(StatsSql::fill(self::QUIZ_OPTIONS_SQL), [], 'route_quiz_answers') as $row) {
            $options[$row->string('step_id')][] = ['option' => $row->int('value'), 'students' => $row->int('students')];
        }
        $quiz = [];
        foreach ($this->rows->select(StatsSql::fill(self::QUIZ_SQL), [], 'route_quiz_answers') as $row) {
            $quiz[] = ['stepId' => $row->string('step_id'), 'answered' => $row->int('answered'), 'options' => $options[$row->string('step_id')] ?? []];
        }

        return ['marks' => $marks, 'quiz' => $quiz];
    }
}
```

`ORDER BY` sobre la columna ENUM `kind` ordena por su posición (`step`, `milestone`, `favorite`).

En `ContentStatsReader`, el constructor suma `private CampaignStats $campaign, private WorkshopStats $workshops, private RouteStats $route`, y `read()` devuelve:

```php
        return [
            'catalogs' => $this->catalogs->read($filters),
            'exercises' => $this->exercises->read($filters, $period),
            'worlds' => $this->campaign->read($filters),
            'workshops' => $this->workshops->read($filters),
            'route' => $this->route->read(),
        ];
```

4. **En verde**, con `--filter='ContentStatsTest|NoStudentTexts'`, `api:analyse` y `api:format:check`.
5. **El commit:** `feat(api): C5 suma las estadísticas de los mundos, los talleres y el recorrido (T007)`.

### U3 · Por cuenta

#### T008 · La lista de alumnos con su uso

**Archivos:**
- se crean `app/Stats/Accounts/StudentFilters.php`, `StudentDirectory.php`, `app/Http/Requests/Admin/ListStudentsRequest.php` y `tests/Feature/Stats/StudentsListTest.php`;
- se modifican `StatsController.php`, `routes/api/admin-stats.php`, `lang/es/admin.php`, `AdminAccessMatrixTest.php` y `NoStudentTextsTest.php`.

**Interfaces:**

```php
final readonly class StudentFilters
{
    public function __construct(public int $page, public int $perPage, public ?string $q, public ?CarbonImmutable $inactiveSince, public string $sort);
}
final class StudentDirectory
{
    /** @return LengthAwarePaginator<int, array<string, mixed>> */
    public function page(StudentFilters $filters, CarbonImmutable $now): LengthAwarePaginator;
}
// StatsController::students(ListStudentsRequest $request, StudentDirectory $directory): JsonResponse
```

1. **La prueba primero,** `tests/Feature/Stats/StudentsListTest.php`:

```php
<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

function studentNamesIn(array $rows): array
{
    return array_column($rows, 'name');
}

it('lists the students of the population with their usage, counted by hand', function () {
    $response = $this->browser->get('/api/admin/stats/students')->assertOk();

    expect($response->json('data'))->toBe([
        ['id' => $this->ids['ana'], 'name' => 'Ana Pérez', 'email' => 'ana@stats.test', 'role' => 'student', 'status' => 'active',
            'lastActivityAt' => '2026-10-20T10:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 0], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 3], 'lastAttemptAt' => '2026-10-06T02:30:00.000Z'],
        ['id' => $this->ids['beto'], 'name' => 'Beto Ruiz', 'email' => 'beto@stats.test', 'role' => 'student', 'status' => 'active',
            'lastActivityAt' => '2026-10-15T12:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 1], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 1], 'lastAttemptAt' => '2026-10-12T14:00:00.000Z'],
        ['id' => $this->ids['caro'], 'name' => 'Caro Díaz', 'email' => 'caro@stats.test', 'role' => 'student', 'status' => 'disabled',
            'lastActivityAt' => '2026-09-01T12:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 0], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 1], 'lastAttemptAt' => '2026-10-03T15:00:00.000Z'],
        ['id' => $this->ids['dani'], 'name' => 'Dani Sosa', 'email' => 'dani@stats.test', 'role' => 'student', 'status' => 'active',
            'lastActivityAt' => null, 'solved' => ['server' => 0, 'imported' => 0], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 0], 'lastAttemptAt' => null],
        ['id' => $this->ids['fede'], 'name' => 'Fede Gómez', 'email' => 'fede@stats.test', 'role' => 'student', 'status' => 'active',
            'lastActivityAt' => '2026-10-09T12:00:00.000Z', 'solved' => ['server' => 0, 'imported' => 0], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 1], 'lastAttemptAt' => '2026-10-04T12:00:00.000Z'],
    ])->and($response->json('meta'))->toBe(['page' => 1, 'perPage' => 25, 'total' => 5, 'lastPage' => 1]);
});

it('puts the students without activity last when the newest come first, and first the other way', function () {
    expect(studentNamesIn($this->browser->get('/api/admin/stats/students?sort=-lastActivity')->assertOk()->json('data')))
        ->toBe(['Ana Pérez', 'Beto Ruiz', 'Fede Gómez', 'Caro Díaz', 'Dani Sosa'])
        ->and(studentNamesIn($this->browser->get('/api/admin/stats/students?sort=lastActivity')->assertOk()->json('data')))
        ->toBe(['Dani Sosa', 'Caro Díaz', 'Fede Gómez', 'Beto Ruiz', 'Ana Pérez']);
});

it('keeps the students without activity since a local date, those that never had any included', function () {
    expect(studentNamesIn($this->browser->get('/api/admin/stats/students?inactiveSince=2026-10-10')->assertOk()->json('data')))
        ->toBe(['Caro Díaz', 'Dani Sosa', 'Fede Gómez']);
});

it('sorts and filters a head with a null last activity like an account without a head', function () {
    DB::table('progress_heads')->insert([
        'user_id' => $this->ids['dani'], 'epoch' => 1, 'revision' => 0, 'reset_at' => null, 'last_activity_at' => null,
        'created_at' => '2026-10-08 12:00:00.000', 'updated_at' => '2026-10-08 12:00:00.000',
    ]);

    expect(studentNamesIn($this->browser->get('/api/admin/stats/students?sort=lastActivity')->assertOk()->json('data')))
        ->toBe(['Dani Sosa', 'Caro Díaz', 'Fede Gómez', 'Beto Ruiz', 'Ana Pérez'])
        ->and(studentNamesIn($this->browser->get('/api/admin/stats/students?inactiveSince=2026-10-10')->assertOk()->json('data')))
        ->toBe(['Caro Díaz', 'Dani Sosa', 'Fede Gómez']);
});

it('searches by name or email, with the wildcards taken literally', function () {
    expect(studentNamesIn($this->browser->get('/api/admin/stats/students?q=bet')->assertOk()->json('data')))->toBe(['Beto Ruiz'])
        ->and(studentNamesIn($this->browser->get('/api/admin/stats/students?q=fede@')->assertOk()->json('data')))->toBe(['Fede Gómez'])
        ->and($this->browser->get('/api/admin/stats/students?q=%25')->assertOk()->json('data'))->toBe([]);
});

it('pages by offset like the accounts of C3b', function () {
    $response = $this->browser->get('/api/admin/stats/students?perPage=2&page=2')->assertOk();

    expect(studentNamesIn($response->json('data')))->toBe(['Caro Díaz', 'Dani Sosa'])
        ->and($response->json('meta'))->toBe(['page' => 2, 'perPage' => 2, 'total' => 5, 'lastPage' => 3]);
});

it('rejects an unknown sort, a bad date and an oversized page', function (string $query, string $field) {
    $this->browser->get("/api/admin/stats/students?{$query}")->assertStatus(422)->assertJsonValidationErrorFor($field, 'errors');
})->with([
    'sort' => ['sort=solved', 'sort'],
    'inactiveSince' => ['inactiveSince=10-10-2026', 'inactiveSince'],
    'perPage' => ['perPage=101', 'perPage'],
]);

it('logs nothing and shows no text of a student', function () {
    Log::spy();

    $body = (string) $this->browser->get('/api/admin/stats/students')->assertOk()->getContent();

    Log::shouldNotHaveReceived('info', fn (string $message, array $context = []) => $message === 'admin.student_viewed');
    foreach (StatsWorld::CANARIES as $canary) {
        expect($body)->not->toContain($canary);
    }
});
```

`AdminAccessMatrixTest` pasa a «twelve routes» y suma `'GET /api/admin/stats/students',` después de `'GET /api/admin/stats/overview'`. `NoStudentTextsTest` pasa a `toHaveCount(11)`.

2. **Correrla:** `--filter='StudentsListTest|AdminAccessMatrix|NoStudentTexts'`. Tiene que fallar con 404.
3. **La implementación.** `app/Stats/Accounts/StudentFilters.php`:

```php
<?php

namespace App\Stats\Accounts;

use Carbon\CarbonImmutable;

final readonly class StudentFilters
{
    public function __construct(
        public int $page,
        public int $perPage,
        public ?string $q,
        public ?CarbonImmutable $inactiveSince,
        public string $sort,
    ) {}
}
```

`app/Stats/Accounts/StudentDirectory.php`:

```php
<?php

namespace App\Stats\Accounts;

use App\Content\Record\RowFields;
use App\Runs\Record\Instant;
use App\Stats\Moment;
use App\Stats\StatsRows;
use App\Stats\StatsSql;
use Carbon\CarbonImmutable;
use Illuminate\Pagination\LengthAwarePaginator;

final class StudentDirectory
{
    public const SORTS = [
        'name' => '`u`.`name` asc, `u`.`id` asc',
        '-name' => '`u`.`name` desc, `u`.`id` asc',
        'createdAt' => '`u`.`created_at` asc, `u`.`id` asc',
        '-createdAt' => '`u`.`created_at` desc, `u`.`id` asc',
        'lastActivity' => '`h`.`last_activity_at` is not null, `h`.`last_activity_at` asc, `u`.`id` asc',
        '-lastActivity' => '`h`.`last_activity_at` is null, `h`.`last_activity_at` desc, `u`.`id` asc',
    ];

    private const COUNT_SQL = <<<'SQL'
        select count(*) as `students`
        from `users` as `u`
        left join `progress_heads` as `h` on `h`.`user_id` = `u`.`id`
        where {population} and {filters}
        SQL;

    private const PAGE_SQL = <<<'SQL'
        select `u`.`id`, `u`.`name`, `u`.`email`, `u`.`role`, `u`.`status`, `h`.`last_activity_at`
        from `users` as `u`
        left join `progress_heads` as `h` on `h`.`user_id` = `u`.`id`
        where {population} and {filters}
        order by {sort}
        limit ? offset ?
        SQL;

    private const SOLVED_SQL = <<<'SQL'
        select `p`.`user_id`,
          coalesce(sum(`p`.`server_solved_at` is not null), 0) as `server`,
          coalesce(sum(`p`.`solved_at` is not null and `p`.`server_solved_at` is null), 0) as `imported`
        from `exercise_progress` as `p`
        where `p`.`user_id` in ({ids})
        group by `p`.`user_id`
        SQL;

    private const ATTEMPTS_SQL = <<<'SQL'
        select `a`.`user_id`,
          coalesce(sum(`a`.`counted` = 1 and `a`.`attempted_at` >= ?), 0) as `last_week`,
          coalesce(sum(`a`.`counted` = 1 and `a`.`attempted_at` >= ?), 0) as `last_month`,
          max(case when `a`.`legacy` = 0 then `a`.`attempted_at` end) as `last_attempt_at`
        from `attempts` as `a`
        where `a`.`user_id` in ({ids})
        group by `a`.`user_id`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return LengthAwarePaginator<int, array<string, mixed>> */
    public function page(StudentFilters $filters, CarbonImmutable $now): LengthAwarePaginator
    {
        [$where, $bindings] = $this->conditions($filters);
        $total = $this->rows->one(StatsSql::fill(self::COUNT_SQL, ['{filters}' => $where]), $bindings, 'users')->int('students');
        $rows = $this->rows->select(
            StatsSql::fill(self::PAGE_SQL, ['{filters}' => $where, '{sort}' => self::SORTS[$filters->sort]]),
            [...$bindings, $filters->perPage, ($filters->page - 1) * $filters->perPage],
            'users',
        );
        $ids = [];
        foreach ($rows as $row) {
            $ids[] = $row->int('id');
        }
        $solved = $ids === [] ? [] : $this->byUser(self::SOLVED_SQL, $ids, []);
        $attempts = $ids === [] ? [] : $this->byUser(self::ATTEMPTS_SQL, $ids, [Instant::format($now->subDays(7)), Instant::format($now->subDays(30))]);

        $items = [];
        foreach ($rows as $row) {
            $id = $row->int('id');
            $solvedRow = $solved[$id] ?? null;
            $attemptsRow = $attempts[$id] ?? null;
            $items[] = [
                'id' => $id,
                'name' => $row->string('name'),
                'email' => $row->string('email'),
                'role' => $row->string('role'),
                'status' => $row->string('status'),
                'lastActivityAt' => Moment::iso($row->nullableString('last_activity_at')),
                'solved' => ['server' => $solvedRow?->int('server') ?? 0, 'imported' => $solvedRow?->int('imported') ?? 0],
                'attempts' => ['lastWeek' => $attemptsRow?->int('last_week') ?? 0, 'lastMonth' => $attemptsRow?->int('last_month') ?? 0],
                'lastAttemptAt' => Moment::iso($attemptsRow?->nullableString('last_attempt_at')),
            ];
        }

        return new LengthAwarePaginator($items, $total, $filters->perPage, $filters->page);
    }

    /** @return array{string, list<string>} */
    private function conditions(StudentFilters $filters): array
    {
        $clauses = ['1 = 1'];
        $bindings = [];
        if ($filters->q !== null) {
            $pattern = '%'.addcslashes($filters->q, '\\%_').'%';
            $clauses[] = '(`u`.`name` like ? or `u`.`email` like ?)';
            $bindings[] = $pattern;
            $bindings[] = $pattern;
        }
        if ($filters->inactiveSince !== null) {
            $clauses[] = '(`h`.`last_activity_at` is null or `h`.`last_activity_at` < ?)';
            $bindings[] = Instant::format($filters->inactiveSince);
        }

        return [implode(' and ', $clauses), $bindings];
    }

    /**
     * @param  list<int>  $ids
     * @param  list<string>  $leading  the bindings that go before the ids
     * @return array<int, RowFields>
     */
    private function byUser(string $sql, array $ids, array $leading): array
    {
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $byUser = [];
        foreach ($this->rows->select(StatsSql::fill($sql, ['{ids}' => $placeholders]), [...$leading, ...$ids], 'users') as $row) {
            $byUser[$row->int('user_id')] = $row;
        }

        return $byUser;
    }
}
```

`app/Http/Requests/Admin/ListStudentsRequest.php`:

```php
<?php

namespace App\Http\Requests\Admin;

use App\Stats\Accounts\StudentDirectory;
use App\Stats\Accounts\StudentFilters;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ListStudentsRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'page' => ['integer', 'min:1'],
            'perPage' => ['integer', 'min:1', 'max:100'],
            'q' => ['nullable', 'string', 'max:80'],
            'inactiveSince' => ['nullable', 'date_format:Y-m-d'],
            'sort' => ['string', Rule::in(array_keys(StudentDirectory::SORTS))],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'page.*' => __('admin.users.page'),
            'perPage.*' => __('admin.users.per_page'),
            'q.*' => __('admin.users.q'),
            'inactiveSince.*' => __('admin.stats.inactive_since'),
            'sort.*' => __('admin.stats.sort'),
        ];
    }

    public function filters(): StudentFilters
    {
        $inactiveSince = $this->filled('inactiveSince')
            ? CarbonImmutable::createFromFormat('!Y-m-d', $this->string('inactiveSince')->toString(), config()->string('stats.timezone'))
            : null;

        return new StudentFilters(
            page: $this->integer('page', 1),
            perPage: $this->integer('perPage', 25),
            q: $this->filled('q') ? $this->string('q')->toString() : null,
            inactiveSince: $inactiveSince === false ? null : $inactiveSince,
            sort: $this->string('sort', 'name')->toString(),
        );
    }
}
```

En `StatsController` va el método nuevo (con `use App\Admin\PageMeta;`, `use App\Http\Requests\Admin\ListStudentsRequest;` y `use App\Stats\Accounts\StudentDirectory;`):

```php
    public function students(ListStudentsRequest $request, StudentDirectory $directory): JsonResponse
    {
        $page = $directory->page($request->filters(), Instant::now());

        return response()->json(['data' => $page->items(), 'meta' => PageMeta::of($page)]);
    }
```

En `routes/api/admin-stats.php` va `Route::get('/stats/students', [StatsController::class, 'students']);`, y en `lang/es/admin.php`, dentro de `stats`:

```php
        'inactive_since' => 'La fecha tiene que ser AAAA-MM-DD.',
        'sort' => 'El orden tiene que ser name, createdAt o lastActivity, con un guion adelante para invertirlo.',
```

4. **En verde**, con la compuerta de U2 sumándole `StudentsListTest`, `api:analyse` y `api:format:check`.
5. **El commit:** `feat(api): C5 suma la lista de alumnos con su uso (T008)`.

#### T009 · El detalle de una cuenta y su registro

**Archivos:**
- se crean `app/Stats/Accounts/StudentDetailReader.php`, `StudentAccessLog.php` y `tests/Feature/Stats/StudentDetailTest.php`;
- se modifican `StatsController.php`, `routes/api/admin-stats.php`, `AdminAccessMatrixTest.php`, `NoStudentTextsTest.php` y `OversizedIdRoutesTest.php`.

**Interfaces:**

```php
final class StudentDetailReader
{
    /** @param array<string, mixed> $account the AdminUser of C3b @return array<string, mixed> */
    public function read(array $account, int $userId, Period $period, CarbonImmutable $now): array;
}
final class StudentAccessLog { public function viewed(int $targetId, string $view): void; }   // 'detail', 'summary' or 'runs'
// StatsController::student(StatsPeriodRequest $request, int $user, StudentDetailReader $reader, StudentAccessLog $log): JsonResponse
```

Consume `QuotaPolicy::usage(int $userId, CarbonImmutable $now): QuotaUsage` de B2, sin cambiarla.

1. **La prueba primero,** `tests/Feature/Stats/StudentDetailTest.php`:

```php
<?php

use App\Admin\PublishedAdminUser;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

function noAttempts(): array
{
    return [
        'attempts' => ['passed' => 0, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
        'operations' => ['infraError' => 0, 'canceled' => 0],
        'importedAttempts' => 0,
    ];
}

it('shows the usage of a student exercise by exercise, counted by hand and without any text', function () {
    $anaAttempts = [
        'attempts' => ['passed' => 1, 'failed' => 1, 'compileError' => 1, 'runtimeError' => 0, 'timeout' => 0],
        'operations' => ['infraError' => 0, 'canceled' => 0],
        'importedAttempts' => 0,
    ];

    $response = $this->browser->get("/api/admin/stats/students/{$this->ids['ana']}?from=2026-10-01&to=2026-10-20&granularity=week")->assertOk();

    expect($response->json('data'))->toBe([
        'account' => PublishedAdminUser::from(User::findOrFail($this->ids['ana']))->toPublished(),
        'progress' => ['epoch' => 1, 'resetAt' => null, 'lastActivityAt' => '2026-10-20T10:00:00.000Z'],
        'imports' => [],
        'solvedByCatalog' => [
            ['catalog' => 'lab', 'language' => 'go', 'server' => 0, 'imported' => 0],
            ['catalog' => 'lab', 'language' => 'rust', 'server' => 1, 'imported' => 0],
        ],
        'attempts' => ['inPeriod' => $anaAttempts, 'total' => $anaAttempts],
        'activity' => [
            ['start' => '2026-10-01', 'attempts' => 0],
            ['start' => '2026-10-05', 'attempts' => 3],
            ['start' => '2026-10-12', 'attempts' => 0],
            ['start' => '2026-10-19', 'attempts' => 0],
        ],
        'quota' => ['active' => 0, 'lastMinute' => 0, 'lastDay' => 1, 'sandboxMs' => 500, 'limits' => ['active' => 1, 'perMinute' => 10, 'perDay' => 300, 'sandboxMinutes' => 30]],
        'exercises' => [
            ['exerciseId' => 'go-01', 'state' => 'attempted', 'solvedAt' => null, 'serverSolvedAt' => null, 'attemptCount' => 1, 'lastAttemptAt' => '2026-10-06T02:30:00.000Z',
                'lastOutcome' => 'compile_error', 'assisted' => false, 'solutionSeen' => false, 'hintsRevealed' => null, 'predictionAnswered' => false, 'predictionCorrect' => false,
                'confidence' => null, 'reviewDueAt' => null],
            ['exerciseId' => 'rust-01', 'state' => 'solved', 'solvedAt' => '2026-10-05T13:00:00.000Z', 'serverSolvedAt' => '2026-10-05T13:00:00.000Z', 'attemptCount' => 2,
                'lastAttemptAt' => '2026-10-05T13:00:00.000Z', 'lastOutcome' => 'passed', 'assisted' => true, 'solutionSeen' => false, 'hintsRevealed' => 1,
                'predictionAnswered' => true, 'predictionCorrect' => true, 'confidence' => 'confident', 'reviewDueAt' => '2026-10-25T13:00:00.000Z'],
        ],
        'campaign' => ['checkpoints' => [['worldId' => 'fx-world-1', 'answered' => true, 'passed' => true, 'passedAt' => '2026-10-06T12:00:00.000Z']], 'sealedExercises' => 0],
        'workshops' => [['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'codeSealed' => true, 'predictionAnswered' => true, 'predictionCorrect' => true, 'stepsMarked' => 1, 'objectivesObserved' => 1]],
        'route' => ['steps' => 1, 'milestones' => 1, 'favorites' => 0, 'quizAnswered' => 1],
    ]);
    foreach (StatsWorld::CANARIES as $canary) {
        expect((string) $response->getContent())->not->toContain($canary);
    }
});

it('shows passed attempts and nothing solved after a reset', function () {
    $data = $this->browser->get("/api/admin/stats/students/{$this->ids['fede']}?from=2026-10-01&to=2026-10-20")->assertOk()->json('data');

    expect($data['progress'])->toBe(['epoch' => 2, 'resetAt' => '2026-10-09T12:00:00.000Z', 'lastActivityAt' => '2026-10-09T12:00:00.000Z'])
        ->and($data['exercises'])->toBe([])
        ->and($data['solvedByCatalog'])->toBe([])
        ->and($data['attempts']['total']['attempts']['passed'])->toBe(1);
});

it('shows an imported solve and the import of a student without its report', function () {
    $data = $this->browser->get("/api/admin/stats/students/{$this->ids['beto']}?from=2026-10-01&to=2026-10-20")->assertOk()->json('data');

    expect($data['imports'])->toBe([['importedAt' => '2026-10-02T10:00:00.000Z', 'source' => 'storage', 'epoch' => 1]])
        ->and($data['solvedByCatalog'])->toBe([
            ['catalog' => 'lab', 'language' => 'rust', 'server' => 0, 'imported' => 1],
            ['catalog' => 'quests', 'language' => 'rust', 'server' => 1, 'imported' => 0],
        ])
        ->and($data['attempts']['total'])->toBe([
            'attempts' => ['passed' => 1, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
            'operations' => ['infraError' => 1, 'canceled' => 1],
            'importedAttempts' => 1,
        ])
        ->and($data['campaign']['sealedExercises'])->toBe(1);
});

it('shows a student that never practised with an empty usage', function () {
    $data = $this->browser->get("/api/admin/stats/students/{$this->ids['dani']}?from=2026-10-19&to=2026-10-20")->assertOk()->json('data');

    expect($data['progress'])->toBe(['epoch' => 1, 'resetAt' => null, 'lastActivityAt' => null])
        ->and($data['attempts'])->toBe(['inPeriod' => noAttempts(), 'total' => noAttempts()])
        ->and($data['activity'])->toBe([['start' => '2026-10-19', 'attempts' => 0], ['start' => '2026-10-20', 'attempts' => 0]])
        ->and($data['exercises'])->toBe([])
        ->and($data['route'])->toBe(['steps' => 0, 'milestones' => 0, 'favorites' => 0, 'quizAnswered' => 0]);
});

it('shows the detail of an admin as of any other account', function () {
    $this->browser->get("/api/admin/stats/students/{$this->ids['admin']}")->assertOk()->assertJsonPath('data.account.role', 'admin');
});

it('answers 404 to an account being deleted and to one that does not exist', function () {
    $this->browser->get("/api/admin/stats/students/{$this->ids['eva']}")->assertStatus(404)->assertJsonPath('code', 'not_found');
    $this->browser->get('/api/admin/stats/students/999999')->assertStatus(404)->assertJsonPath('code', 'not_found');
});

it('answers 404 to the next request once the account starts its deletion and caches nothing about it', function () {
    $this->browser->get("/api/admin/stats/students/{$this->ids['ana']}")->assertOk();
    DB::table('users')->where('id', $this->ids['ana'])->update(['status' => 'deleting']);

    $this->browser->get("/api/admin/stats/students/{$this->ids['ana']}")->assertStatus(404);
    expect(DB::table('cache')->where('key', 'like', '%stats:v1:%')->count())->toBe(0);
});

it('logs each successful detail with the admin, the account and the view, and nothing else', function () {
    Log::spy();

    $this->browser->get("/api/admin/stats/students/{$this->ids['ana']}")->assertOk();
    $this->browser->get('/api/admin/stats/students/999999')->assertStatus(404);

    Log::shouldHaveReceived('info')->once()->withArgs(fn (string $message, array $context = []) => $message === 'admin.student_viewed'
        && $context === ['target_id' => $this->ids['ana'], 'view' => 'detail']);
});
```

**Los cambios en las pruebas de C3b:**
- `AdminAccessMatrixTest` pasa a «thirteen routes» y suma `'GET /api/admin/stats/students/{user}',` después de `'GET /api/admin/stats/students'`.
- `OversizedIdRoutesTest` suma `'GET stats student' => ['GET', '/api/admin/stats/students/{id}'],`.
- `NoStudentTextsTest`:
  - `studentTextScenarios()` suma `'GET /api/admin/stats/students/{user}' => ["/api/admin/stats/students/{$targets['student']}", []],`;
  - la cuenta pasa a `toHaveCount(12)`.

2. **Correrla:** `--filter='StudentDetailTest|AdminAccessMatrix|NoStudentTexts|OversizedId'`. Tiene que fallar con 404 en la ruta.
3. **La implementación.** `app/Stats/Accounts/StudentAccessLog.php`:

```php
<?php

namespace App\Stats\Accounts;

use Illuminate\Support\Facades\Log;

final class StudentAccessLog
{
    public function viewed(int $targetId, string $view): void
    {
        Log::info('admin.student_viewed', ['target_id' => $targetId, 'view' => $view]);
    }
}
```

`RequestContext` le suma el `user_id` del admin, igual que a las acciones de C3b.

`app/Stats/Accounts/StudentDetailReader.php`:

```php
<?php

namespace App\Stats\Accounts;

use App\Content\Record\RowFields;
use App\Runs\Admission\QuotaPolicy;
use App\Stats\AttemptCounts;
use App\Stats\Moment;
use App\Stats\Period;
use App\Stats\StatsRows;
use App\Stats\StatsSql;
use Carbon\CarbonImmutable;

final class StudentDetailReader
{
    private const HEAD_SQL = 'select `h`.`epoch`, `h`.`reset_at`, `h`.`last_activity_at` from `progress_heads` as `h` where `h`.`user_id` = ?';

    private const IMPORTS_SQL = 'select `i`.`imported_at`, `i`.`source`, `i`.`epoch` from `progress_imports` as `i` where `i`.`user_id` = ? order by `i`.`imported_at`, `i`.`id`';

    private const SOLVED_SQL = <<<'SQL'
        select `e`.`catalog`, `e`.`language`,
          coalesce(sum(`p`.`server_solved_at` is not null), 0) as `server`,
          coalesce(sum(`p`.`solved_at` is not null and `p`.`server_solved_at` is null), 0) as `imported`
        from `exercise_progress` as `p`
        join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
        where `p`.`user_id` = ?
        group by `e`.`catalog`, `e`.`language`
        order by `e`.`catalog`, `e`.`language`
        SQL;

    private const ATTEMPTS_TOTAL_SQL = 'select {attempt_counts} from `attempts` as `a` where `a`.`user_id` = ?';

    private const ATTEMPTS_PERIOD_SQL = 'select {attempt_counts} from `attempts` as `a` where `a`.`user_id` = ? and `a`.`attempted_at` >= ? and `a`.`attempted_at` < ?';

    private const ACTIVITY_SQL = <<<'SQL'
        select `b`.`bucket`, count(`a`.`id`) as `attempts`
        from {buckets}
        left join `attempts` as `a` on `a`.`user_id` = ? and `a`.`counted` = 1
          and `a`.`attempted_at` >= `b`.`starts` and `a`.`attempted_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const GRID_SQL = <<<'SQL'
        select `p`.`exercise_id`, `p`.`solved_at`, `p`.`server_solved_at`, `p`.`attempt_count`, `p`.`last_attempt_at`,
          `p`.`assisted`, `p`.`solution_seen`, `p`.`hints_revealed`, (`p`.`prediction_answer` is not null) as `prediction_answered`,
          `p`.`prediction_correct`, `p`.`confidence`, `p`.`review_due_at`, `la`.`outcome` as `last_outcome`
        from `exercise_progress` as `p`
        left join `attempts` as `la` on `la`.`id` = `p`.`last_attempt_id` and `la`.`user_id` = `p`.`user_id`
        where `p`.`user_id` = ?
        order by `p`.`exercise_id`
        SQL;

    private const CHECKPOINTS_SQL = <<<'SQL'
        select `k`.`world_id`, (`k`.`last_answer` is not null or `k`.`passed` = 1) as `answered`, `k`.`passed`, `k`.`passed_at`
        from `campaign_checkpoints` as `k`
        where `k`.`user_id` = ?
        order by `k`.`world_id`
        SQL;

    private const SEALS_SQL = 'select count(*) as `sealed` from `campaign_seals` as `s` where `s`.`user_id` = ?';

    private const WORKSHOPS_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, `w`.`code_sealed`, (`w`.`answer` is not null) as `prediction_answered`, `w`.`prediction_correct`,
          (select count(*) from `workshop_step_marks` as `m`
            where `m`.`user_id` = `w`.`user_id` and `m`.`workshop_id` = `w`.`workshop_id` and `m`.`language` = `w`.`language` and `m`.`marked` = 1) as `steps_marked`,
          (select count(*) from `workshop_observations` as `o`
            where `o`.`user_id` = `w`.`user_id` and `o`.`workshop_id` = `w`.`workshop_id` and `o`.`language` = `w`.`language` and `o`.`observed_at` is not null) as `objectives_observed`
        from `workshop_progress` as `w`
        where `w`.`user_id` = ?
        order by `w`.`workshop_id`, `w`.`language`
        SQL;

    private const ROUTE_SQL = <<<'SQL'
        select
          coalesce(sum(`r`.`kind` = 'step' and `r`.`marked` = 1), 0) as `steps`,
          coalesce(sum(`r`.`kind` = 'milestone' and `r`.`marked` = 1), 0) as `milestones`,
          coalesce(sum(`r`.`kind` = 'favorite' and `r`.`marked` = 1), 0) as `favorites`,
          (select count(*) from `route_quiz_answers` as `q` where `q`.`user_id` = ?) as `quiz_answered`
        from `route_marks` as `r`
        where `r`.`user_id` = ?
        SQL;

    public function __construct(private StatsRows $rows, private QuotaPolicy $quotas) {}

    /**
     * @param  array<string, mixed>  $account
     * @return array<string, mixed>
     */
    public function read(array $account, int $userId, Period $period, CarbonImmutable $now): array
    {
        $activity = [];
        $buckets = $period->buckets();
        foreach ($this->rows->select(StatsSql::fill(self::ACTIVITY_SQL), [$period->bucketsJson(), $userId], 'attempts') as $index => $row) {
            $activity[] = ['start' => $buckets[$index]['start'], 'attempts' => $row->int('attempts')];
        }

        return [
            'account' => $account,
            'progress' => $this->progress($userId),
            'imports' => $this->imports($userId),
            'solvedByCatalog' => $this->solved($userId),
            'attempts' => [
                'inPeriod' => AttemptCounts::from($this->rows->one(StatsSql::fill(self::ATTEMPTS_PERIOD_SQL), [$userId, $period->startsUtc(), $period->endsUtc()], 'attempts')),
                'total' => AttemptCounts::from($this->rows->one(StatsSql::fill(self::ATTEMPTS_TOTAL_SQL), [$userId], 'attempts')),
            ],
            'activity' => $activity,
            'quota' => $this->quota($userId, $now),
            'exercises' => $this->grid($userId),
            'campaign' => $this->campaign($userId),
            'workshops' => $this->workshops($userId),
            'route' => $this->route($userId),
        ];
    }

    /** @return array{epoch: int, resetAt: ?string, lastActivityAt: ?string} */
    private function progress(int $userId): array
    {
        $head = $this->rows->select(self::HEAD_SQL, [$userId], 'progress_heads')[0] ?? null;

        return [
            'epoch' => $head?->int('epoch') ?? 1,
            'resetAt' => Moment::iso($head?->nullableString('reset_at')),
            'lastActivityAt' => Moment::iso($head?->nullableString('last_activity_at')),
        ];
    }

    /** @return list<array{importedAt: ?string, source: string, epoch: int}> */
    private function imports(int $userId): array
    {
        $imports = [];
        foreach ($this->rows->select(self::IMPORTS_SQL, [$userId], 'progress_imports') as $row) {
            $imports[] = ['importedAt' => Moment::iso($row->string('imported_at')), 'source' => $row->string('source'), 'epoch' => $row->int('epoch')];
        }

        return $imports;
    }

    /** @return list<array{catalog: string, language: string, server: int, imported: int}> */
    private function solved(int $userId): array
    {
        $solved = [];
        foreach ($this->rows->select(self::SOLVED_SQL, [$userId], 'exercise_progress') as $row) {
            $solved[] = ['catalog' => $row->string('catalog'), 'language' => $row->string('language'), 'server' => $row->int('server'), 'imported' => $row->int('imported')];
        }

        return $solved;
    }

    /** @return array<string, mixed> */
    private function quota(int $userId, CarbonImmutable $now): array
    {
        $usage = $this->quotas->usage($userId, $now);

        return [
            'active' => $usage->active,
            'lastMinute' => $usage->lastMinute,
            'lastDay' => $usage->lastDay,
            'sandboxMs' => $usage->sandboxMs,
            'limits' => [
                'active' => config()->integer('runs.quota.active'),
                'perMinute' => config()->integer('runs.quota.per_minute'),
                'perDay' => config()->integer('runs.quota.per_day'),
                'sandboxMinutes' => config()->integer('runs.quota.sandbox_minutes_per_day'),
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    private function grid(int $userId): array
    {
        $grid = [];
        foreach ($this->rows->select(self::GRID_SQL, [$userId], 'exercise_progress') as $row) {
            $grid[] = [
                'exerciseId' => $row->string('exercise_id'),
                'state' => self::state($row),
                'solvedAt' => Moment::iso($row->nullableString('solved_at')),
                'serverSolvedAt' => Moment::iso($row->nullableString('server_solved_at')),
                'attemptCount' => $row->int('attempt_count'),
                'lastAttemptAt' => Moment::iso($row->nullableString('last_attempt_at')),
                'lastOutcome' => $row->nullableString('last_outcome'),
                'assisted' => $row->flag('assisted'),
                'solutionSeen' => $row->flag('solution_seen'),
                'hintsRevealed' => $row->nullableInt('hints_revealed'),
                'predictionAnswered' => $row->flag('prediction_answered'),
                'predictionCorrect' => $row->flag('prediction_correct'),
                'confidence' => $row->nullableString('confidence'),
                'reviewDueAt' => Moment::iso($row->nullableString('review_due_at')),
            ];
        }

        return $grid;
    }

    private static function state(RowFields $row): string
    {
        return match (true) {
            $row->nullableString('solved_at') !== null => 'solved',
            $row->int('attempt_count') > 0 || $row->nullableString('last_attempt_at') !== null => 'attempted',
            default => 'started',
        };
    }

    /** @return array{checkpoints: list<array{worldId: string, answered: bool, passed: bool, passedAt: ?string}>, sealedExercises: int} */
    private function campaign(int $userId): array
    {
        $checkpoints = [];
        foreach ($this->rows->select(self::CHECKPOINTS_SQL, [$userId], 'campaign_checkpoints') as $row) {
            $checkpoints[] = [
                'worldId' => $row->string('world_id'),
                'answered' => $row->flag('answered'),
                'passed' => $row->flag('passed'),
                'passedAt' => Moment::iso($row->nullableString('passed_at')),
            ];
        }

        return ['checkpoints' => $checkpoints, 'sealedExercises' => $this->rows->one(self::SEALS_SQL, [$userId], 'campaign_seals')->int('sealed')];
    }

    /** @return list<array<string, mixed>> */
    private function workshops(int $userId): array
    {
        $workshops = [];
        foreach ($this->rows->select(self::WORKSHOPS_SQL, [$userId], 'workshop_progress') as $row) {
            $workshops[] = [
                'workshopId' => $row->string('workshop_id'),
                'language' => $row->string('language'),
                'codeSealed' => $row->flag('code_sealed'),
                'predictionAnswered' => $row->flag('prediction_answered'),
                'predictionCorrect' => $row->flag('prediction_correct'),
                'stepsMarked' => $row->int('steps_marked'),
                'objectivesObserved' => $row->int('objectives_observed'),
            ];
        }

        return $workshops;
    }

    /** @return array{steps: int, milestones: int, favorites: int, quizAnswered: int} */
    private function route(int $userId): array
    {
        $row = $this->rows->one(self::ROUTE_SQL, [$userId, $userId], 'route_marks');

        return ['steps' => $row->int('steps'), 'milestones' => $row->int('milestones'), 'favorites' => $row->int('favorites'), 'quizAnswered' => $row->int('quiz_answered')];
    }
}
```

En `StatsController` va el método nuevo (con `use App\Admin\PublishedAdminUser;`, `use App\Auth\AccountStatus;`, `use App\Http\ApiCode;`, `use App\Http\ApiError;`, `use App\Models\User;`, `use App\Stats\Accounts\StudentAccessLog;` y `use App\Stats\Accounts\StudentDetailReader;`):

```php
    public function student(StatsPeriodRequest $request, int $user, StudentDetailReader $reader, StudentAccessLog $log): JsonResponse
    {
        $found = User::query()->whereKey($user)->where('status', '<>', AccountStatus::Deleting->value)->first();
        if ($found === null) {
            return ApiError::of(ApiCode::NotFound);
        }
        $period = $request->period();
        $now = Instant::now();
        $data = $reader->read(PublishedAdminUser::from($found)->toPublished(), $user, $period, $now);
        $log->viewed($user, 'detail');

        return response()->json(['data' => $data, 'meta' => ['generatedAt' => Instant::iso($now), 'period' => $period->toMeta()]]);
    }
```

En `routes/api/admin-stats.php` va `Route::get('/stats/students/{user}', [StatsController::class, 'student'])->where('user', '[0-9]{1,18}');`.

4. **En verde**, con la compuerta de U2 más `StudentDetailTest` y `OversizedId`, `api:analyse` y `api:format:check`.
5. **El commit:** `feat(api): C5 suma el detalle de una cuenta, sin textos, y su registro (T009)`.

#### T010 · El resumen de uso en la ficha

**Archivos:**
- se crean `app/Stats/Accounts/UsageSummary.php` y `tests/Feature/Stats/UsageSummaryTest.php`;
- se modifican `app/Http/Controllers/Admin/UserController.php` y `tests/Feature/Admin/UserShowTest.php`.

**Interfaz:**

```php
final class UsageSummary
{
    /** @return array{lastActivityAt: ?string, solved: array{server: int, imported: int}, attemptsLastMonth: int, imports: int} */
    public function of(int $userId, CarbonImmutable $now): array;
}
```

1. **La prueba primero,** `tests/Feature/Stats/UsageSummaryTest.php`:

```php
<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

it('adds the usage summary at the end of the ficha, counted by hand', function () {
    $ana = $this->browser->get("/api/admin/users/{$this->ids['ana']}")->assertOk()->json('data');
    $beto = $this->browser->get("/api/admin/users/{$this->ids['beto']}")->assertOk()->json('data');

    expect(array_key_last($ana))->toBe('usage')
        ->and($ana['usage'])->toBe(['lastActivityAt' => '2026-10-20T10:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 0], 'attemptsLastMonth' => 3, 'imports' => 0])
        ->and($beto['usage'])->toBe(['lastActivityAt' => '2026-10-15T12:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 1], 'attemptsLastMonth' => 1, 'imports' => 1]);
});

it('keeps answering the ficha of an account being deleted, with a null usage', function () {
    $this->browser->get("/api/admin/users/{$this->ids['eva']}")->assertOk()
        ->assertJsonPath('data.status', 'deleting')
        ->assertJsonPath('data.usage', null);
});

it('logs each successful ficha with the view summary', function () {
    Log::spy();

    $this->browser->get("/api/admin/users/{$this->ids['eva']}")->assertOk();

    Log::shouldHaveReceived('info')->once()->withArgs(fn (string $message, array $context = []) => $message === 'admin.student_viewed'
        && $context === ['target_id' => $this->ids['eva'], 'view' => 'summary']);
});

it('leaves the list of accounts without usage', function () {
    $first = $this->browser->get('/api/admin/users')->assertOk()->json('data.0');

    expect($first)->not->toHaveKey('usage');
});
```

En `tests/Feature/Admin/UserShowTest.php`, el primer `it` pasa a `'shows exactly the nine AdminUser keys in order, then the usage'` y espera `['id', 'name', 'email', 'role', 'status', 'emailVerified', 'privacyVersion', 'createdAt', 'updatedAt', 'usage']`.

2. **Correrla:** `--filter='UsageSummaryTest|UserShowTest'`. Tiene que fallar, porque falta `usage`.
3. **La implementación.** `app/Stats/Accounts/UsageSummary.php`:

```php
<?php

namespace App\Stats\Accounts;

use App\Runs\Record\Instant;
use App\Stats\Moment;
use App\Stats\StatsRows;
use Carbon\CarbonImmutable;

final class UsageSummary
{
    private const SQL = <<<'SQL'
        select
          (select `h`.`last_activity_at` from `progress_heads` as `h` where `h`.`user_id` = ?) as `last_activity_at`,
          (select coalesce(sum(`p`.`server_solved_at` is not null), 0) from `exercise_progress` as `p` where `p`.`user_id` = ?) as `solved_server`,
          (select coalesce(sum(`p`.`solved_at` is not null and `p`.`server_solved_at` is null), 0) from `exercise_progress` as `p` where `p`.`user_id` = ?) as `solved_imported`,
          (select count(*) from `attempts` as `a` where `a`.`user_id` = ? and `a`.`counted` = 1 and `a`.`attempted_at` >= ?) as `attempts_last_month`,
          (select count(*) from `progress_imports` as `i` where `i`.`user_id` = ?) as `imports`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return array{lastActivityAt: ?string, solved: array{server: int, imported: int}, attemptsLastMonth: int, imports: int} */
    public function of(int $userId, CarbonImmutable $now): array
    {
        $row = $this->rows->one(self::SQL, [$userId, $userId, $userId, $userId, Instant::format($now->subDays(30)), $userId], 'users');

        return [
            'lastActivityAt' => Moment::iso($row->nullableString('last_activity_at')),
            'solved' => ['server' => $row->int('solved_server'), 'imported' => $row->int('solved_imported')],
            'attemptsLastMonth' => $row->int('attempts_last_month'),
            'imports' => $row->int('imports'),
        ];
    }
}
```

En `UserController::show` (con `use App\Runs\Record\Instant;`, `use App\Stats\Accounts\StudentAccessLog;` y `use App\Stats\Accounts\UsageSummary;`):

```php
    public function show(int $user, UsageSummary $usage, StudentAccessLog $log): JsonResponse
    {
        $found = $this->directory->find($user);
        $summary = $found->status === AccountStatus::Deleting ? null : $usage->of($user, Instant::now());
        $log->viewed($user, 'summary');

        return response()->json(['data' => [...PublishedAdminUser::from($found)->toPublished(), 'usage' => $summary]]);
    }
```

4. **En verde,** con la suite completa (`npm run api:test`), porque `show` es de C3b, más `api:analyse` y `api:format:check`.
5. **El commit:** `feat(api): C5 suma el resumen de uso a la ficha de la cuenta (T010)`.

### U4 · La operación

#### T011 · Las ejecuciones con su lista cerrada de campos

**Archivos:**
- se crean `app/Stats/Operations/RunFilters.php`, `RunMetadataReader.php`, `app/Http/Requests/Admin/ListRunsRequest.php`, `app/Http/Controllers/Admin/OperationsController.php` y `tests/Feature/Stats/RunsListTest.php`;
- se modifican `routes/api/admin-stats.php`, `lang/es/admin.php`, `AdminAccessMatrixTest.php` y `NoStudentTextsTest.php`.

**Interfaces:**

```php
final readonly class RunFilters
{
    public function __construct(public ?string $status, public ?int $userId, public ?string $exerciseId, public ?CarbonImmutable $since, public ?string $cursor, public int $perPage);
}
final class RunMetadataReader
{
    /** @return array{data: list<array<string, mixed>>, nextCursor: ?string} */
    public function page(RunFilters $filters): array;
}
// OperationsController::runs(ListRunsRequest $request, RunMetadataReader $reader, StudentAccessLog $log): JsonResponse
```

1. **La prueba primero,** `tests/Feature/Stats/RunsListTest.php`:

```php
<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Tests\Support\Browser;
use Tests\Support\RunWorld;
use Tests\Support\StatsWorld;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

function runId(int $n): string
{
    return sprintf('019a0000-0000-7000-8000-%012d', $n);
}

it('lists the runs from the newest with only the allowed fields, without the accounts being deleted', function () {
    $response = $this->browser->get('/api/admin/runs')->assertOk();

    expect($response->json('data'))->toBe([
        ['id' => runId(3), 'account' => ['id' => $this->ids['caro'], 'name' => 'Caro Díaz'], 'exerciseId' => 'rust-01', 'language' => 'rust', 'status' => 'queued',
            'reason' => null, 'executorPhase' => null, 'exitCode' => null, 'truncated' => null, 'compileMs' => null, 'runMs' => null,
            'createdAt' => '2026-10-20T14:59:00.000Z', 'startedAt' => null, 'finishedAt' => null, 'cancelRequested' => false],
        ['id' => runId(2), 'account' => ['id' => $this->ids['beto'], 'name' => 'Beto Ruiz'], 'exerciseId' => 'go-01', 'language' => 'go', 'status' => 'infra_error',
            'reason' => 'executor_busy', 'executorPhase' => null, 'exitCode' => null, 'truncated' => null, 'compileMs' => null, 'runMs' => null,
            'createdAt' => '2026-10-19T16:00:00.000Z', 'startedAt' => null, 'finishedAt' => '2026-10-19T16:10:00.000Z', 'cancelRequested' => false],
        ['id' => runId(1), 'account' => ['id' => $this->ids['ana'], 'name' => 'Ana Pérez'], 'exerciseId' => 'rust-01', 'language' => 'rust', 'status' => 'passed',
            'reason' => null, 'executorPhase' => 'run', 'exitCode' => 0, 'truncated' => false, 'compileMs' => 300, 'runMs' => 200,
            'createdAt' => '2026-10-20T14:00:00.000Z', 'startedAt' => '2026-10-20T14:00:01.500Z', 'finishedAt' => '2026-10-20T14:00:02.000Z', 'cancelRequested' => false],
    ])->and($response->json('meta'))->toBe(['nextCursor' => null, 'retentionDays' => 14]);
    foreach (StatsWorld::CANARIES as $canary) {
        expect((string) $response->getContent())->not->toContain($canary);
    }
});

it('pages with the id of the last run as the cursor', function () {
    $first = $this->browser->get('/api/admin/runs?perPage=2')->assertOk();
    $second = $this->browser->get('/api/admin/runs?perPage=2&cursor='.$first->json('meta.nextCursor'))->assertOk();

    expect(array_column($first->json('data'), 'id'))->toBe([runId(3), runId(2)])
        ->and($first->json('meta.nextCursor'))->toBe(runId(2))
        ->and(array_column($second->json('data'), 'id'))->toBe([runId(1)])
        ->and($second->json('meta.nextCursor'))->toBeNull();
});

it('walks runs that share their creation instant one page at a time without repeating or skipping one', function () {
    $fede = User::findOrFail($this->ids['fede']);
    foreach ([15, 11, 14, 12, 13] as $n) {
        RunWorld::run($fede, ['id' => runId($n), 'exercise_id' => 'rust-01', 'status' => 'canceled', 'program' => null, 'expires_at' => null,
            'created_at' => '2026-10-20 14:30:00.000', 'finished_at' => '2026-10-20 14:30:00.000']);
    }
    $seen = [];
    $cursor = null;
    do {
        $page = $this->browser->get('/api/admin/runs?perPage=1&user='.$this->ids['fede'].($cursor === null ? '' : "&cursor={$cursor}"))->assertOk();
        $seen = [...$seen, ...array_column($page->json('data'), 'id')];
        $cursor = $page->json('meta.nextCursor');
    } while ($cursor !== null);

    expect($seen)->toBe([runId(15), runId(14), runId(13), runId(12), runId(11)]);
});

it('filters by status, account, exercise and local date', function (string $query, array $ids) {
    $query = str_replace('{ana}', (string) $this->ids['ana'], $query);

    expect(array_column($this->browser->get("/api/admin/runs?{$query}")->assertOk()->json('data'), 'id'))->toBe(array_map('runId', $ids));
})->with([
    'status' => ['status=infra_error', [2]],
    'account' => ['user={ana}', [1]],
    'exercise' => ['exercise=go-01', [2]],
    'since a local date' => ['since=2026-10-20', [3, 1]],
]);

it('answers 404 when the account of the filter is being deleted or does not exist', function () {
    $this->browser->get("/api/admin/runs?user={$this->ids['eva']}")->assertStatus(404)->assertJsonPath('code', 'not_found');
    $this->browser->get('/api/admin/runs?user=999999')->assertStatus(404)->assertJsonPath('code', 'not_found');
});

it('logs a list filtered by an account and not a list without that filter', function () {
    Log::spy();

    $this->browser->get('/api/admin/runs')->assertOk();
    $this->browser->get("/api/admin/runs?user={$this->ids['ana']}")->assertOk();

    Log::shouldHaveReceived('info')->once()->withArgs(fn (string $message, array $context = []) => $message === 'admin.student_viewed'
        && $context === ['target_id' => $this->ids['ana'], 'view' => 'runs']);
});

it('rejects a bad cursor, status, account, exercise or date', function (string $query, string $field) {
    $this->browser->get("/api/admin/runs?{$query}")->assertStatus(422)->assertJsonValidationErrorFor($field, 'errors');
})->with([
    'cursor' => ['cursor=nope', 'cursor'],
    'status' => ['status=done', 'status'],
    'account' => ['user=abc', 'user'],
    'exercise' => ['exercise=RUST 01', 'exercise'],
    'date' => ['since=20-10-2026', 'since'],
    'perPage' => ['perPage=0', 'perPage'],
]);
```

`AdminAccessMatrixTest` pasa a «fourteen routes» y suma `'GET /api/admin/runs',` después de `'GET /api/admin/invitations'`. `NoStudentTextsTest` pasa a `toHaveCount(13)`.

2. **Correrla:** `--filter='RunsListTest|AdminAccessMatrix|NoStudentTexts'`. Tiene que fallar con 404.
3. **La implementación.** `app/Stats/Operations/RunFilters.php`:

```php
<?php

namespace App\Stats\Operations;

use Carbon\CarbonImmutable;

final readonly class RunFilters
{
    public function __construct(
        public ?string $status,
        public ?int $userId,
        public ?string $exerciseId,
        public ?CarbonImmutable $since,
        public ?string $cursor,
        public int $perPage,
    ) {}
}
```

`app/Stats/Operations/RunMetadataReader.php`:

```php
<?php

namespace App\Stats\Operations;

use App\Content\Record\RowFields;
use App\Runs\Record\Instant;
use App\Stats\Moment;
use App\Stats\StatsRows;
use App\Stats\StatsSql;

final class RunMetadataReader
{
    private const SQL = <<<'SQL'
        select `r`.`id`, `r`.`user_id`, `u`.`name`, `r`.`exercise_id`, `r`.`language`, `r`.`status`, `r`.`reason`,
          `r`.`executor_phase`, `r`.`exit_code`, `r`.`truncated`, `r`.`compile_ms`, `r`.`run_ms`,
          `r`.`created_at`, `r`.`started_at`, `r`.`finished_at`, (`r`.`cancel_requested_at` is not null) as `cancel_requested`
        from `runs` as `r`
        join `users` as `u` on `u`.`id` = `r`.`user_id`
        where `u`.`status` <> 'deleting' and {filters}
        order by `r`.`id` desc
        limit ?
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return array{data: list<array<string, mixed>>, nextCursor: ?string} */
    public function page(RunFilters $filters): array
    {
        [$where, $bindings] = $this->conditions($filters);
        $rows = $this->rows->select(StatsSql::fill(self::SQL, ['{filters}' => $where]), [...$bindings, $filters->perPage + 1], 'runs');
        $page = array_slice($rows, 0, $filters->perPage);
        $data = [];
        foreach ($page as $row) {
            $data[] = $this->publish($row);
        }
        $last = $page === [] ? null : $page[count($page) - 1];

        return ['data' => $data, 'nextCursor' => count($rows) > $filters->perPage && $last !== null ? $last->string('id') : null];
    }

    /** @return array{string, list<int|string>} */
    private function conditions(RunFilters $filters): array
    {
        $clauses = ['1 = 1'];
        $bindings = [];
        if ($filters->status !== null) {
            $clauses[] = '`r`.`status` = ?';
            $bindings[] = $filters->status;
        }
        if ($filters->userId !== null) {
            $clauses[] = '`r`.`user_id` = ?';
            $bindings[] = $filters->userId;
        }
        if ($filters->exerciseId !== null) {
            $clauses[] = '`r`.`exercise_id` = ?';
            $bindings[] = $filters->exerciseId;
        }
        if ($filters->since !== null) {
            $clauses[] = '`r`.`created_at` >= ?';
            $bindings[] = Instant::format($filters->since);
        }
        if ($filters->cursor !== null) {
            $clauses[] = '`r`.`id` < ?';
            $bindings[] = $filters->cursor;
        }

        return [implode(' and ', $clauses), $bindings];
    }

    /** @return array<string, mixed> */
    private function publish(RowFields $row): array
    {
        $truncated = $row->nullableInt('truncated');

        return [
            'id' => $row->string('id'),
            'account' => ['id' => $row->int('user_id'), 'name' => $row->string('name')],
            'exerciseId' => $row->string('exercise_id'),
            'language' => $row->string('language'),
            'status' => $row->string('status'),
            'reason' => $row->nullableString('reason'),
            'executorPhase' => $row->nullableString('executor_phase'),
            'exitCode' => $row->nullableInt('exit_code'),
            'truncated' => $truncated === null ? null : $truncated === 1,
            'compileMs' => $row->nullableInt('compile_ms'),
            'runMs' => $row->nullableInt('run_ms'),
            'createdAt' => Moment::iso($row->string('created_at')),
            'startedAt' => Moment::iso($row->nullableString('started_at')),
            'finishedAt' => Moment::iso($row->nullableString('finished_at')),
            'cancelRequested' => $row->flag('cancel_requested'),
        ];
    }
}
```

`app/Http/Requests/Admin/ListRunsRequest.php`:

```php
<?php

namespace App\Http\Requests\Admin;

use App\Runs\RunStatus;
use App\Stats\Operations\RunFilters;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ListRunsRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(RunStatus::class)],
            'user' => ['nullable', 'regex:/^[0-9]{1,18}$/'],
            'exercise' => ['nullable', 'regex:/^[a-z0-9-]{1,64}$/'],
            'since' => ['nullable', 'date_format:Y-m-d'],
            'cursor' => ['nullable', 'regex:/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/'],
            'perPage' => ['integer', 'min:1', 'max:100'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'status.*' => __('admin.stats.status'),
            'user.*' => __('admin.stats.user'),
            'exercise.*' => __('admin.stats.exercise'),
            'since.*' => __('admin.stats.since'),
            'cursor.*' => __('admin.stats.cursor'),
            'perPage.*' => __('admin.users.per_page'),
        ];
    }

    public function filters(): RunFilters
    {
        $since = $this->filled('since')
            ? CarbonImmutable::createFromFormat('!Y-m-d', $this->string('since')->toString(), config()->string('stats.timezone'))
            : null;

        return new RunFilters(
            status: $this->filled('status') ? $this->string('status')->toString() : null,
            userId: $this->filled('user') ? $this->integer('user') : null,
            exerciseId: $this->filled('exercise') ? $this->string('exercise')->toString() : null,
            since: $since === false ? null : $since,
            cursor: $this->filled('cursor') ? $this->string('cursor')->toString() : null,
            perPage: $this->integer('perPage', 50),
        );
    }
}
```

`app/Http/Controllers/Admin/OperationsController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Auth\AccountStatus;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\Requests\Admin\ListRunsRequest;
use App\Models\User;
use App\Stats\Accounts\StudentAccessLog;
use App\Stats\Operations\RunMetadataReader;
use Illuminate\Http\JsonResponse;

final class OperationsController
{
    public function runs(ListRunsRequest $request, RunMetadataReader $reader, StudentAccessLog $log): JsonResponse
    {
        $filters = $request->filters();
        if ($filters->userId !== null && ! User::query()->whereKey($filters->userId)->where('status', '<>', AccountStatus::Deleting->value)->exists()) {
            return ApiError::of(ApiCode::NotFound);
        }
        $page = $reader->page($filters);
        if ($filters->userId !== null) {
            $log->viewed($filters->userId, 'runs');
        }

        return response()->json(['data' => $page['data'], 'meta' => ['nextCursor' => $page['nextCursor'], 'retentionDays' => config()->integer('runs.retention.runs_days')]]);
    }
}
```

En `routes/api/admin-stats.php` van `use App\Http\Controllers\Admin\OperationsController;` y `Route::get('/runs', [OperationsController::class, 'runs']);`. En `lang/es/admin.php`, dentro de `stats`:

```php
        'status' => 'El estado tiene que ser uno de los de una ejecución.',
        'user' => 'La cuenta tiene que ser un número.',
        'exercise' => 'El ejercicio tiene que ser un identificador válido.',
        'since' => 'La fecha tiene que ser AAAA-MM-DD.',
        'cursor' => 'El cursor no es válido.',
```

4. **En verde**, con la compuerta de U3 más `RunsListTest`, `api:analyse` y `api:format:check`.
5. **El commit:** `feat(api): C5 suma la lista de ejecuciones con su lista cerrada de campos (T011)`.

#### T012 · La cola y los lugares del ejecutor

**Archivos:**
- se crean `app/Stats/Operations/QueueReader.php` y `tests/Feature/Stats/QueueTest.php`;
- se modifican `config/runs.php`, `OperationsController.php`, `routes/api/admin-stats.php`, `AdminAccessMatrixTest.php`, `NoStudentTextsTest.php` y `docker/compose.yaml` (**coordinador**).

**Interfaces:**
- `QueueReader::read(CarbonImmutable $now): array<string, mixed>`;
- `OperationsController::queue(QueueReader $reader): JsonResponse`;
- `config('runs.executor.slots')`: int.

1. **La prueba primero,** `tests/Feature/Stats/QueueTest.php`:

```php
<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

it('shows the queue now and the last day of runs, counted by hand', function () {
    $response = $this->browser->get('/api/admin/queue')->assertOk();

    expect($response->json('data'))->toBe([
        'now' => ['queued' => 2, 'running' => 0, 'oldestQueuedSeconds' => 120, 'maxWaiting' => 32, 'slots' => 4],
        'lastDay' => [
            'finished' => 2,
            'waitMs' => ['p50' => 1500, 'p95' => 1500],
            'durationMs' => ['p50' => 500, 'p95' => 500],
            'infraErrors' => [['reason' => 'executor_busy', 'runs' => 1]],
        ],
    ])->and($response->json('meta.generatedAt'))->toBe('2026-10-20T15:00:00.000Z');
});

it('reports the slots that the deployment configures', function () {
    config(['runs.executor.slots' => 6]);

    $this->browser->get('/api/admin/queue')->assertOk()->assertJsonPath('data.now.slots', 6);
});

it('reports an empty queue without inventing an age or a percentile', function () {
    DB::table('runs')->delete();

    expect($this->browser->get('/api/admin/queue')->assertOk()->json('data'))->toBe([
        'now' => ['queued' => 0, 'running' => 0, 'oldestQueuedSeconds' => null, 'maxWaiting' => 32, 'slots' => 4],
        'lastDay' => ['finished' => 0, 'waitMs' => ['p50' => null, 'p95' => null], 'durationMs' => ['p50' => null, 'p95' => null], 'infraErrors' => []],
    ]);
});
```

La cola cuenta también la ejecución en espera de Eva: es de una cuenta en supresión, pero ocupa un lugar, y no se la identifica.

`AdminAccessMatrixTest` pasa a «fifteen routes» y suma `'GET /api/admin/queue',` después de `'GET /api/admin/invitations'`. `NoStudentTextsTest` pasa a `toHaveCount(14)`.

2. **Correrla:** `--filter='QueueTest|AdminAccessMatrix|NoStudentTexts'`. Tiene que fallar con 404.
3. **La implementación.** En `config/runs.php`, dentro de `executor`, después de `'runtime'`, va `'slots' => (int) env('EXECUTOR_MAX_CONCURRENT', 4),`.

`app/Stats/Operations/QueueReader.php`:

```php
<?php

namespace App\Stats\Operations;

use App\Runs\Record\Instant;
use App\Stats\Percentile;
use App\Stats\StatsRows;
use Carbon\CarbonImmutable;

final class QueueReader
{
    private const NOW_SQL = <<<'SQL'
        select
          coalesce(sum(`r`.`status` = 'queued'), 0) as `queued`,
          coalesce(sum(`r`.`status` = 'running'), 0) as `running`,
          min(case when `r`.`status` = 'queued' then `r`.`created_at` end) as `oldest_queued`
        from `runs` as `r`
        where `r`.`status` in ('queued', 'running')
        SQL;

    private const FINISHED_SQL = <<<'SQL'
        select count(*) as `finished`
        from `runs` as `r`
        where `r`.`created_at` >= ? and `r`.`status` not in ('queued', 'running')
        SQL;

    private const TIMES_SQL = <<<'SQL'
        select timestampdiff(microsecond, `r`.`created_at`, `r`.`started_at`) div 1000 as `wait_ms`,
          case when `r`.`finished_at` is null then null else timestampdiff(microsecond, `r`.`started_at`, `r`.`finished_at`) div 1000 end as `duration_ms`
        from `runs` as `r`
        where `r`.`created_at` >= ? and `r`.`started_at` is not null and `r`.`status` not in ('queued', 'running')
        SQL;

    private const INFRA_SQL = <<<'SQL'
        select `r`.`reason`, count(*) as `runs`
        from `runs` as `r`
        where `r`.`created_at` >= ? and `r`.`status` = 'infra_error'
        group by `r`.`reason`
        order by `r`.`reason`
        SQL;

    public function __construct(private StatsRows $rows) {}

    /** @return array<string, mixed> */
    public function read(CarbonImmutable $now): array
    {
        $current = $this->rows->one(self::NOW_SQL, [], 'runs');
        $oldest = $current->nullableString('oldest_queued');
        $since = Instant::format($now->subDay());
        $waits = [];
        $durations = [];
        foreach ($this->rows->select(self::TIMES_SQL, [$since], 'runs') as $row) {
            $waits[] = $row->int('wait_ms');
            $duration = $row->nullableInt('duration_ms');
            if ($duration !== null) {
                $durations[] = $duration;
            }
        }
        $infraErrors = [];
        foreach ($this->rows->select(self::INFRA_SQL, [$since], 'runs') as $row) {
            $infraErrors[] = ['reason' => $row->nullableString('reason'), 'runs' => $row->int('runs')];
        }

        return [
            'now' => [
                'queued' => $current->int('queued'),
                'running' => $current->int('running'),
                'oldestQueuedSeconds' => $oldest === null ? null : intdiv((int) $now->format('Uv') - (int) Instant::parse($oldest)->format('Uv'), 1000),
                'maxWaiting' => config()->integer('runs.queue.max_waiting'),
                'slots' => config()->integer('runs.executor.slots'),
            ],
            'lastDay' => [
                'finished' => $this->rows->one(self::FINISHED_SQL, [$since], 'runs')->int('finished'),
                'waitMs' => ['p50' => Percentile::of($waits, 50), 'p95' => Percentile::of($waits, 95)],
                'durationMs' => ['p50' => Percentile::of($durations, 50), 'p95' => Percentile::of($durations, 95)],
                'infraErrors' => $infraErrors,
            ],
        ];
    }
}
```

En `OperationsController` va (con `use App\Runs\Record\Instant;` y `use App\Stats\Operations\QueueReader;`):

```php
    public function queue(QueueReader $reader): JsonResponse
    {
        $now = Instant::now();

        return response()->json(['data' => $reader->read($now), 'meta' => ['generatedAt' => Instant::iso($now)]]);
    }
```

En `routes/api/admin-stats.php` va `Route::get('/queue', [OperationsController::class, 'queue']);`.

**El coordinador** suma en `docker/compose.yaml`, en `x-laravel-env`, después de `RUNS_QUEUE_RETRY_AFTER`, la línea `EXECUTOR_MAX_CONCURRENT: '${EXECUTOR_MAX_CONCURRENT:-4}'`. Así `php` lee el mismo valor que `executor` y las réplicas de `worker-runs`.

4. **En verde,** con la suite completa, `api:analyse` y `api:format:check`. El coordinador comprueba con `COMPOSE_PROJECT_NAME=<wt> docker compose config` que `php` recibe `EXECUTOR_MAX_CONCURRENT`.
5. **El commit:** `feat(api): C5 suma el estado de la cola y los lugares del ejecutor (T012)`.

### U5 · El límite y la documentación

#### T013 · La prueba de arquitectura y la de sólo lectura

**Archivos:** se crean `tests/Unit/Stats/StatsArchTest.php` y `tests/Feature/Stats/StatsReadOnlyTest.php`.

**Lo que fija:**
- FR-004, FR-006, FR-007, FR-014 y FR-036, por construcción;
- SC-003 y SC-006;
- las restricciones globales del portón, el reloj y los candados.

1. **Las pruebas,** que tienen que pasar sin cambiar código. Si alguna falla, el defecto está en T004 a T012 y se corrige ahí, en un commit aparte que lo nombre.

`tests/Unit/Stats/StatsArchTest.php`:

```php
<?php

use App\Stats\StatsRows;
use Illuminate\Support\Facades\DB;

const STATS_SOURCES = ['app/Stats', 'app/Http/Controllers/Admin/StatsController.php', 'app/Http/Controllers/Admin/OperationsController.php'];

const STATS_FORBIDDEN_WORDS = [
    'drafts', 'attempt_payloads', 'route_notes', 'sync_operations', 'sessions',
    'custom_test', 'program', 'stdout', 'stderr', 'nonce', 'reflection', 'note', 'body', 'raw_payload', 'report',
    'code_sha256', 'raw_sha256', 'payload_sha256', 'starter_hash', 'client_run_id', 'expected_tests',
];

/** @return list<string> */
function statsSourceProblems(string $source): array
{
    $problems = [];
    foreach (STATS_FORBIDDEN_WORDS as $word) {
        if (preg_match('/(?<![\w$])'.preg_quote($word, '/').'(?!\w)/', $source) === 1) {
            $problems[] = "names {$word}";
        }
    }
    if (preg_match_all('/(?<![\w$])code(?!\w)/', $source, $matches, PREG_OFFSET_CAPTURE) > 0) {
        foreach ($matches[0] as [$word, $offset]) {
            if (substr($source, $offset - 5, 5) !== '`c`.`') {
                $problems[] = 'names code outside `c`.`code`';
            }
        }
    }
    if (preg_match('/(?<!::)\b(now|utc_timestamp|sysdate|curdate|curtime)\s*\(|\bcurrent_(timestamp|date)\b/i', $source) === 1) {
        $problems[] = 'reads the clock of MySQL';
    }
    if (preg_match('/for\s+update|for\s+share|lock\s+in\s+share\s+mode|lockForUpdate|sharedLock|transaction\(|AccountLock/i', $source) === 1) {
        $problems[] = 'takes a lock or opens a transaction';
    }

    return $problems;
}

/** @return list<string> */
function statsSourceFiles(): array
{
    $root = dirname(__DIR__, 3);
    $files = [];
    foreach (STATS_SOURCES as $source) {
        if (is_file("{$root}/{$source}")) {
            $files[] = "{$root}/{$source}";

            continue;
        }
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator("{$root}/{$source}", FilesystemIterator::SKIP_DOTS)) as $file) {
            if ($file->getExtension() === 'php') {
                $files[] = $file->getPathname();
            }
        }
    }

    return $files;
}

arch('App\Stats reaches the database only through StatsRows')
    ->expect('App\Stats')
    ->not->toUse([DB::class, 'Illuminate\Database\Query\Builder', 'Illuminate\Database\Eloquent\Builder'])
    ->ignoring(StatsRows::class);

it('recognizes each kind of forbidden source', function (string $source, array $problems) {
    expect(statsSourceProblems($source))->toBe($problems);
})->with([
    'a text column' => ['select `p`.`reflection` from `exercise_progress` as `p`', ['names reflection']],
    'a forbidden table' => ['select count(*) from `drafts`', ['names drafts']],
    'the code of a run' => ['select `r`.`code` from `runs` as `r`', ['names code outside `c`.`code`']],
    'the seal flag' => ['select sum(`s`.`code`) from `campaign_seals` as `s`', ['names code outside `c`.`code`']],
    'a hash of the code' => ['select `a`.`code_sha256` from `attempts` as `a`', ['names code_sha256']],
    'the clock of MySQL' => ['where `a`.`attempted_at` >= now() - interval 1 day', ['reads the clock of MySQL']],
    'current_timestamp' => ['where `x` < current_timestamp', ['reads the clock of MySQL']],
    'a lock' => ['select * from `progress_heads` for update', ['takes a lock or opens a transaction']],
]);

it('lets through the catalog code, the flags that contain code and the clock of PHP', function () {
    expect(statsSourceProblems('select `c`.`code` as `catalog`, `r`.`exit_code`, `w`.`code_sealed`, $note, Instant::now()'))->toBe([]);
});

it('finds no forbidden name, clock or lock in the code of C5 (FR-006, FR-014, FR-004)', function () {
    $problems = [];
    foreach (statsSourceFiles() as $file) {
        foreach (statsSourceProblems((string) file_get_contents($file)) as $problem) {
            $problems[] = basename($file).": {$problem}";
        }
    }

    expect(statsSourceFiles())->not->toBe([])
        ->and($problems)->toBe([]);
});
```

`tests/Feature/Stats/StatsReadOnlyTest.php`:

```php
<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

it('writes nothing but the session and the cache and takes no lock on any route of C5 (SC-006)', function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $ids = StatsWorld::create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($ids['admin']));
    $urls = [
        '/api/admin/stats/overview?from=2026-10-01&to=2026-10-20',
        '/api/admin/stats/exercises?from=2026-10-01&to=2026-10-20',
        '/api/admin/stats/students',
        "/api/admin/stats/students/{$ids['ana']}",
        "/api/admin/users/{$ids['ana']}",
        "/api/admin/runs?user={$ids['ana']}",
        '/api/admin/queue',
    ];

    $statements = [];
    foreach ($urls as $url) {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $browser->get($url)->assertOk();
        foreach (DB::getQueryLog() as $entry) {
            $statements[] = "{$url}: {$entry['query']}";
        }
        DB::disableQueryLog();
    }

    $writes = array_values(array_filter($statements, fn (string $statement) => preg_match('/:\s*(insert|update|delete|replace|truncate)\b/i', $statement) === 1
        && preg_match('/`(sessions|cache|cache_locks)`/i', $statement) !== 1));
    $locks = array_values(array_filter($statements, fn (string $statement) => preg_match('/for\s+update|for\s+share|lock\s+in\s+share\s+mode/i', $statement) === 1));

    expect($writes)->toBe([])->and($locks)->toBe([]);
});
```

2. **Correrlas:** `--filter='StatsArchTest|StatsReadOnlyTest'`. Tienen que pasar.
3. **La compuerta de U5:**
   - `COMPOSE_PROJECT_NAME=<wt> npm run api:test`;
   - `COMPOSE_PROJECT_NAME=<wt> npm run api:test -- --order-by=random --random-order-seed=777`;
   - `api:analyse` y `api:format:check`;
   - `npm test`.
4. **El commit:** `test(api): C5 prueba que las estadísticas no nombran textos del alumno, ni el reloj ni candados (T013)`.

#### T014 · La documentación (coordinador)

**Archivo:** `backend/api/AGENTS.md`. Lo integra el coordinador.

1. **La sección nueva** va después de «Progreso: importación y reset (D1b)»:

```markdown
- **Estadísticas del admin (C5):** contrato en `specs/025-c5-estadisticas/contracts/http.md`.
  - `app/Stats/` es de sólo lectura y llega a MySQL sólo por `StatsRows`, que exige `SELECT`, le agrega la pista
    `MAX_EXECUTION_TIME` (`STATS_MAX_EXECUTION_MS`) y convierte el error 3024 en un 503 `stats_timeout`.
    `StatsArchTest` prohíbe usar `DB` fuera de `StatsRows`, leer el reloj de MySQL, tomar candados y nombrar las tablas y
    columnas de texto del alumno: un instante es siempre un parámetro tomado de `Instant::now()`.
  - La población de los agregados es `StatsSql::POPULATION` (rol vigente `student`, estado `active` o `disabled`), y un
    intento cuenta con la columna `counted` de B2 (`StatsSql::ATTEMPT_COUNTS`).
  - Los períodos se cortan en PHP, en la zona `STATS_TIMEZONE` (`Period`), y se cruzan con `JSON_TABLE` (`StatsSql::BUCKETS`).
  - Sólo el resumen y el contenido usan la caché (`StatsCache`: 10 minutos, sólo arreglos). Nada que identifique a una
    cuenta se guarda, así que una supresión se ve en el pedido siguiente.
  - Mirar una cuenta (el detalle, la ficha o las ejecuciones filtradas por ella) deja `admin.student_viewed` en el log.
  - Una ruta nueva de `/api/admin` suma su escenario a `NoStudentTextsTest` y su línea a `AdminAccessMatrixTest`. Una
    columna nueva con texto del alumno se suma a las claves prohibidas de esa matriz y a `STATS_FORBIDDEN_WORDS`.
  - `stats:synthesize` y `stats:measure` corren sólo contra `mysql-bench/taller_stats_bench`:
    `sh backend/api/scripts/stats-bench.sh` (perfil `stats-bench`), que pide permiso por el disco.
```

2. **En «Comandos»,** después de `api:import:check`:
   - `` `npm run api:stats:bench`: la medición de las estadísticas con alumnos sintéticos (C5), en su propio MySQL. ``
   - Va con las opciones de `stats:synthesize`, y no forma parte de `npm test`.
3. **Comprobar** las rutas y los comandos que nombra, y `git diff --check`.
4. **El commit:** `docs(api): C5 documenta las estadísticas del admin en AGENTS.md (T014)`.

### U6 · La medición

#### T015 · La guarda y la población sintética

**Archivos:**
- se crean `app/Console/Bench/BenchDatabase.php`, `SyntheticPopulation.php` y `app/Console/Commands/SynthesizeStats.php`;
- se crean las pruebas `tests/Feature/Stats/BenchGuardTest.php` y `tests/Unit/Stats/SyntheticPopulationTest.php`.

**Interfaces:**

```php
final class BenchDatabase
{
    public const HOST = 'mysql-bench';
    public const DATABASE = 'taller_stats_bench';
    /** @throws RuntimeException when the effective connection is another one */
    public static function ensure(): void;
}
final class SyntheticPopulation
{
    public function __construct(int $seed);
    public static function outcome(int $roll): string;   // roll from 1 to 100
    /** @param list<int> $userIds @param list<string> $exerciseIds @return list<array{user_id: int, exercise_id: string, outcome: string, second: int}> */
    public function day(array $userIds, array $exerciseIds, int $attempts): array;
}
// php artisan stats:synthesize {--students=5000} {--days=730} {--per-day=30000} {--seed=2026}
```

1. **Las pruebas primero.** `tests/Unit/Stats/SyntheticPopulationTest.php`:

```php
<?php

use App\Console\Bench\SyntheticPopulation;

it('splits the hundred rolls among the outcomes of a run', function (int $roll, string $outcome) {
    expect(SyntheticPopulation::outcome($roll))->toBe($outcome);
})->with([
    [1, 'passed'], [25, 'passed'], [26, 'failed'], [70, 'failed'], [71, 'compile_error'], [90, 'compile_error'],
    [91, 'runtime_error'], [95, 'runtime_error'], [96, 'timeout'], [97, 'timeout'], [98, 'infra_error'], [99, 'infra_error'], [100, 'canceled'],
]);

it('draws the same day from the same seed, inside the given accounts and exercises', function () {
    $first = (new SyntheticPopulation(7))->day([10, 11, 12], ['rust-01', 'go-01'], 50);
    $again = (new SyntheticPopulation(7))->day([10, 11, 12], ['rust-01', 'go-01'], 50);

    expect($first)->toBe($again)->toHaveCount(50)
        ->and(array_unique(array_column($first, 'user_id')))->each->toBeIn([10, 11, 12])
        ->and(array_unique(array_column($first, 'exercise_id')))->each->toBeIn(['rust-01', 'go-01'])
        ->and(max(array_column($first, 'second')))->toBeLessThan(86_400);
});
```

`tests/Feature/Stats/BenchGuardTest.php`:

```php
<?php

use App\Console\Bench\BenchDatabase;
use App\Models\User;

it('refuses the test database, which is not the one of the measurement', function () {
    BenchDatabase::ensure();
})->throws(RuntimeException::class, 'mysql-bench/taller_stats_bench');

it('accepts only mysql-bench with taller_stats_bench, also when a url points elsewhere', function () {
    config(['database.connections.mysql.host' => 'mysql-bench', 'database.connections.mysql.database' => 'taller_stats_bench']);
    BenchDatabase::ensure();

    config(['database.connections.mysql.url' => 'mysql://root@mysql/taller']);
    expect(fn () => BenchDatabase::ensure())->toThrow(RuntimeException::class);
});

it('stops both commands before writing anything', function (string $command) {
    $users = User::count();

    $this->artisan($command)->expectsOutputToContain('mysql-bench/taller_stats_bench')->assertExitCode(1);

    expect(User::count())->toBe($users);
})->with(['stats:synthesize', 'stats:measure']);
```

El caso de `stats:measure` queda en rojo hasta T016.

2. **Correrlas:** `--filter='SyntheticPopulationTest|BenchGuardTest'`. Tienen que fallar porque las clases y los comandos no existen.
3. **La implementación.** `app/Console/Bench/BenchDatabase.php`:

```php
<?php

namespace App\Console\Bench;

use Illuminate\Support\ConfigurationUrlParser;
use RuntimeException;

final class BenchDatabase
{
    public const HOST = 'mysql-bench';

    public const DATABASE = 'taller_stats_bench';

    public static function ensure(): void
    {
        $name = config()->string('database.default');
        $effective = (new ConfigurationUrlParser)->parseConfiguration(config()->array("database.connections.{$name}"));
        $host = $effective['host'] ?? null;
        $database = $effective['database'] ?? null;
        $socket = $effective['unix_socket'] ?? '';
        if (isset($effective['read']) || isset($effective['write']) || $host !== self::HOST || $database !== self::DATABASE || ($socket !== '' && $socket !== null)) {
            throw new RuntimeException('La medición sólo corre contra mysql-bench/taller_stats_bench (perfil stats-bench de Compose).');
        }
    }
}
```

`app/Console/Bench/SyntheticPopulation.php`:

```php
<?php

namespace App\Console\Bench;

use LogicException;

final class SyntheticPopulation
{
    private const OUTCOMES = [25 => 'passed', 70 => 'failed', 90 => 'compile_error', 95 => 'runtime_error', 97 => 'timeout', 99 => 'infra_error', 100 => 'canceled'];

    public function __construct(int $seed)
    {
        mt_srand($seed);
    }

    public static function outcome(int $roll): string
    {
        foreach (self::OUTCOMES as $limit => $outcome) {
            if ($roll <= $limit) {
                return $outcome;
            }
        }
        throw new LogicException("A roll goes from 1 to 100: {$roll}");
    }

    /**
     * @param  list<int>  $userIds
     * @param  list<string>  $exerciseIds
     * @return list<array{user_id: int, exercise_id: string, outcome: string, second: int}>
     */
    public function day(array $userIds, array $exerciseIds, int $attempts): array
    {
        $draws = [];
        for ($i = 0; $i < $attempts; $i++) {
            $draws[] = [
                'user_id' => $userIds[mt_rand(0, count($userIds) - 1)],
                'exercise_id' => $exerciseIds[mt_rand(0, count($exerciseIds) - 1)],
                'outcome' => self::outcome(mt_rand(1, 100)),
                'second' => mt_rand(0, 86_399),
            ];
        }

        return $draws;
    }
}
```

`app/Console/Commands/SynthesizeStats.php`:

```php
<?php

namespace App\Console\Commands;

use App\Console\Bench\BenchDatabase;
use App\Console\Bench\SyntheticPopulation;
use App\Content\Record\RowFields;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class SynthesizeStats extends Command
{
    protected $signature = 'stats:synthesize {--students=5000} {--days=730} {--per-day=30000} {--seed=2026}';

    protected $description = 'Genera la población sintética de la medición de las estadísticas (sólo en mysql-bench/taller_stats_bench)';

    private const BATCH = 2000;

    private const PROGRESS_SQL = <<<'SQL'
        insert into `exercise_progress` (`user_id`, `exercise_id`, `solved_at`, `server_solved_at`, `attempt_count`, `last_attempt_at`, `revision`, `created_at`, `updated_at`)
        select `a`.`user_id`, `a`.`exercise_id`,
          min(case when `a`.`outcome` = 'passed' then `a`.`attempted_at` end),
          min(case when `a`.`outcome` = 'passed' then `a`.`attempted_at` end),
          sum(`a`.`counted`), max(`a`.`attempted_at`), 1, min(`a`.`attempted_at`), max(`a`.`attempted_at`)
        from `attempts` as `a`
        group by `a`.`user_id`, `a`.`exercise_id`
        SQL;

    private const CHECKPOINTS_SQL = <<<'SQL'
        insert into `campaign_checkpoints` (`user_id`, `world_id`, `passed`, `passed_at`, `last_answer`, `last_answer_set_at`, `revision`, `created_at`, `updated_at`)
        select `u`.`id`, `w`.`id`, (`u`.`id` + `w`.`position`) % 2, case when (`u`.`id` + `w`.`position`) % 2 = 1 then ? end, (`u`.`id` + `w`.`position`) % 3, ?, 1, ?, ?
        from `users` as `u` join `worlds` as `w` on `w`.`status` = 'active'
        where `u`.`email` like '%@bench.test' and (`u`.`id` + `w`.`position`) % 3 <> 0
        SQL;

    private const WORKSHOPS_SQL = <<<'SQL'
        insert into `workshop_progress` (`user_id`, `workshop_id`, `language`, `code_sealed`, `prediction_correct`, `answer`, `answer_set_at`, `revision`, `created_at`, `updated_at`)
        select `u`.`id`, `ws`.`id`, 'rust', (`u`.`id` + `ws`.`position`) % 2, (`u`.`id` + `ws`.`position`) % 2, (`u`.`id` + `ws`.`position`) % 3, ?, 1, ?, ?
        from `users` as `u` join `workshops` as `ws` on `ws`.`status` = 'active'
        where `u`.`email` like '%@bench.test' and (`u`.`id` + `ws`.`position`) % 4 = 0
        SQL;

    private const ROUTE_SQL = <<<'SQL'
        insert into `route_marks` (`user_id`, `kind`, `item_key`, `marked`, `set_at`, `revision`, `created_at`, `updated_at`)
        select `u`.`id`, 'step', `s`.`id`, 1, ?, 1, ?, ?
        from `users` as `u` join `guide_steps` as `s` on `s`.`status` = 'active'
        where `u`.`email` like '%@bench.test' and (`u`.`id` + `s`.`position`) % 2 = 0
        SQL;

    private const RUNS_SQL = <<<'SQL'
        insert into `runs` (`id`, `user_id`, `client_run_id`, `exercise_id`, `language`, `epoch`, `grading_hash`, `expected_tests`, `nonce`, `code`,
          `status`, `compile_ms`, `run_ms`, `created_at`, `started_at`, `finished_at`, `attempt_id`)
        select uuid(), `a`.`user_id`, uuid(), `a`.`exercise_id`, `e`.`language`, 1, `a`.`grading_hash`, '[]', md5(`a`.`id`), 'bench',
          `a`.`outcome`, 400, 100, `a`.`attempted_at`, `a`.`started_at`, `a`.`finished_at`, `a`.`id`
        from `attempts` as `a` join `exercises` as `e` on `e`.`id` = `a`.`exercise_id`
        where `a`.`attempted_at` >= ?
        SQL;

    public function handle(): int
    {
        try {
            BenchDatabase::ensure();
        } catch (RuntimeException $refusal) {
            $this->error($refusal->getMessage());

            return self::FAILURE;
        }
        $exercises = $this->activeExercises();
        if ($exercises === []) {
            $this->error('Falta el contenido: corré content:import antes de sintetizar.');

            return self::FAILURE;
        }
        $days = $this->number('days');
        $end = Instant::now()->startOfDay();
        $start = $end->subDays($days);
        $userIds = $this->students($this->number('students'), $start, $end);
        $tests = $this->testKeys();
        $population = new SyntheticPopulation($this->number('seed'));
        $max = DB::table('attempts')->max('id');
        $nextId = (is_numeric($max) ? (int) $max : 0) + 1;
        for ($day = 0; $day < $days; $day++) {
            foreach (array_chunk($population->day($userIds, array_keys($exercises), $this->number('per-day')), self::BATCH) as $chunk) {
                $nextId = $this->insertAttempts($chunk, $start->addDays($day), $exercises, $tests, $nextId);
            }
            if ($day % 30 === 29) {
                $this->info('Días generados: '.($day + 1)." de {$days}.");
            }
        }
        $at = Instant::format($end);
        DB::statement(self::PROGRESS_SQL);
        DB::statement(self::CHECKPOINTS_SQL, [$at, $at, $at, $at]);
        DB::statement(self::WORKSHOPS_SQL, [$at, $at, $at]);
        DB::statement(self::ROUTE_SQL, [$at, $at, $at]);
        DB::statement(self::RUNS_SQL, [Instant::format($end->subDays(14))]);
        $this->info('Población sintética lista: '.count($userIds).' alumnos, '.($nextId - 1).' intentos.');

        return self::SUCCESS;
    }

    private function number(string $option): int
    {
        $value = $this->option($option);

        return is_numeric($value) ? (int) $value : throw new RuntimeException("--{$option} tiene que ser un número.");
    }

    /** @return array<string, string> grading hash by exercise id */
    private function activeExercises(): array
    {
        $exercises = [];
        foreach (DB::select("select `id`, `grading_hash` from `exercises` where `status` = 'active' order by `id`") as $row) {
            $fields = new RowFields(get_object_vars($row), 'exercises');
            $exercises[$fields->string('id')] = $fields->string('grading_hash');
        }

        return $exercises;
    }

    /** @return array<string, list<string>> active test keys by exercise, in order */
    private function testKeys(): array
    {
        $tests = [];
        foreach (DB::select("select `exercise_id`, `test_key` from `exercise_tests` where `status` = 'active' order by `exercise_id`, `position`") as $row) {
            $fields = new RowFields(get_object_vars($row), 'exercise_tests');
            $tests[$fields->string('exercise_id')][] = $fields->string('test_key');
        }

        return $tests;
    }

    /** @return list<int> */
    private function students(int $count, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $at = Instant::format($start);
        foreach (array_chunk(range(1, $count), 1000) as $chunk) {
            $rows = [];
            foreach ($chunk as $n) {
                $rows[] = [
                    'name' => sprintf('Alumno %05d', $n), 'email' => sprintf('alumno%05d@bench.test', $n), 'password' => 'bench',
                    'role' => 'student', 'status' => 'active', 'email_verified_at' => $at, 'created_at' => $at, 'updated_at' => $at,
                ];
            }
            DB::table('users')->insert($rows);
        }
        $ids = [];
        foreach (DB::select("select `id` from `users` where `email` like '%@bench.test' order by `id`") as $row) {
            $ids[] = (new RowFields(get_object_vars($row), 'users'))->int('id');
        }
        $heads = [];
        foreach ($ids as $index => $id) {
            $heads[] = [
                'user_id' => $id, 'epoch' => 1, 'revision' => 1, 'last_activity_at' => Instant::format($end->subMinutes(($index * 37) % 43_200)),
                'created_at' => $at, 'updated_at' => $at,
            ];
        }
        foreach (array_chunk($heads, 1000) as $chunk) {
            DB::table('progress_heads')->insert($chunk);
        }

        return $ids;
    }

    /**
     * @param  list<array{user_id: int, exercise_id: string, outcome: string, second: int}>  $chunk
     * @param  array<string, string>  $exercises
     * @param  array<string, list<string>>  $tests
     */
    private function insertAttempts(array $chunk, CarbonImmutable $dayStart, array $exercises, array $tests, int $nextId): int
    {
        $attempts = [];
        $verdicts = [];
        foreach ($chunk as $draw) {
            $at = Instant::format($dayStart->addSeconds($draw['second']));
            $attempts[] = [
                'id' => $nextId, 'user_id' => $draw['user_id'], 'exercise_id' => $draw['exercise_id'], 'epoch' => 1, 'legacy' => 0,
                'outcome' => $draw['outcome'], 'grading_hash' => $exercises[$draw['exercise_id']], 'code_sha256' => hash('sha256', (string) $nextId),
                'attempted_at' => $at, 'started_at' => $at, 'finished_at' => $at, 'created_at' => $at,
            ];
            if ($draw['outcome'] === 'passed' || $draw['outcome'] === 'failed') {
                foreach ($tests[$draw['exercise_id']] ?? [] as $position => $key) {
                    $verdicts[] = [
                        'attempt_id' => $nextId, 'test_key' => $key, 'exercise_id' => $draw['exercise_id'], 'position' => $position + 1,
                        'outcome' => $draw['outcome'] === 'failed' && $position === 0 ? 'fail' : 'pass',
                    ];
                }
            }
            $nextId++;
        }
        DB::table('attempts')->insert($attempts);
        if ($verdicts !== []) {
            DB::table('attempt_tests')->insert($verdicts);
        }

        return $nextId;
    }
}
```

El reparto sale de 100 tiradas:

| Resultado | Tiradas |
| --- | --- |
| `passed` | 25 |
| `failed` | 45 |
| `compile_error` | 20 |
| `runtime_error` | 5 |
| `timeout` | 2 |
| `infra_error` | 2 |
| `canceled` | 1 |

Así, 7 de cada 10 intentos llevan sus tres veredictos: con la escala completa, unos 22 millones de intentos y unos 46 millones de veredictos. Es una estimación propia, no del ADR; la medición lo informa.

4. **En verde** salvo el caso de `stats:measure`, más `api:analyse` y `api:format:check`.
5. **El commit:** `feat(api): C5 suma la población sintética de la medición, con su guarda (T015)`.

#### T016 · La medición y su perfil de Compose

**Archivos:**
- se crean `app/Console/Commands/MeasureStats.php` y `backend/api/scripts/stats-bench.sh`;
- se modifican `docker/compose.yaml` y `package.json` (**coordinador**).

**Interfaz:** `php artisan stats:measure` escribe el informe en Markdown por la salida estándar.

1. **La prueba:** el caso `stats:measure` de `BenchGuardTest` (T015), que hoy está en rojo.
2. **La implementación.** `app/Console/Commands/MeasureStats.php`:

```php
<?php

namespace App\Console\Commands;

use App\Console\Bench\BenchDatabase;
use App\Runs\Record\Instant;
use App\Stats\Accounts\StudentDetailReader;
use App\Stats\Accounts\StudentDirectory;
use App\Stats\Accounts\StudentFilters;
use App\Stats\Content\ContentFilters;
use App\Stats\Content\ContentStatsReader;
use App\Stats\Granularity;
use App\Stats\Operations\QueueReader;
use App\Stats\Operations\RunFilters;
use App\Stats\Operations\RunMetadataReader;
use App\Stats\OverviewReader;
use App\Stats\Period;
use Closure;
use Illuminate\Console\Command;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class MeasureStats extends Command
{
    protected $signature = 'stats:measure';

    protected $description = 'Mide en frío cada lector de las estadísticas, con el EXPLAIN de sus consultas (sólo en mysql-bench/taller_stats_bench)';

    private const SLOW_MS = 2000;

    public function handle(OverviewReader $overview, ContentStatsReader $content, StudentDirectory $students, StudentDetailReader $detail, RunMetadataReader $runs, QueueReader $queue): int
    {
        try {
            BenchDatabase::ensure();
        } catch (RuntimeException $refusal) {
            $this->error($refusal->getMessage());

            return self::FAILURE;
        }
        $latest = DB::scalar('select max(`attempted_at`) from `attempts`');
        if (! is_string($latest)) {
            $this->error('No hay intentos: corré stats:synthesize antes de medir.');

            return self::FAILURE;
        }
        $now = Instant::parse($latest)->addMinute();
        $timezone = config()->string('stats.timezone');
        $month = Period::of(null, null, Granularity::Day, $now, $timezone, 30);
        $year = Period::of(null, null, Granularity::Month, $now, $timezone, 366);
        $busiest = DB::scalar('select `user_id` from `attempts` group by `user_id` order by count(*) desc limit 1');
        $busiestId = is_numeric($busiest) ? (int) $busiest : 0;

        $this->line('# Medición de las estadísticas de C5');
        foreach ([
            'overview, 30 días por día' => fn () => $overview->read($month, $now),
            'overview, 366 días por mes' => fn () => $overview->read($year, $now),
            'exercises, 30 días, sin filtros' => fn () => $content->read(new ContentFilters(null, null, null), $month),
            'students, 100 por página, por última actividad' => fn () => $students->page(new StudentFilters(1, 100, null, null, '-lastActivity'), $now),
            'detalle del alumno con más intentos, 366 días' => fn () => $detail->read([], $busiestId, $year, $now),
            'runs, la primera página de 50' => fn () => $runs->page(new RunFilters(null, null, null, null, null, 50)),
            'queue' => fn () => $queue->read($now),
        ] as $name => $case) {
            $this->measure($name, $case);
        }

        return self::SUCCESS;
    }

    private function measure(string $name, Closure $case): void
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $started = hrtime(true);
        $outcome = 'ok';
        try {
            $case();
        } catch (HttpResponseException) {
            $outcome = 'stats_timeout';
        }
        $elapsed = intdiv(hrtime(true) - $started, 1_000_000);
        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->line('');
        $this->line("## {$name}: {$elapsed} ms ({$outcome})".($elapsed > self::SLOW_MS ? ' — supera 2 000 ms' : ''));
        foreach ($queries as $query) {
            $this->explain($query);
        }
    }

    private function explain(mixed $query): void
    {
        if (! is_array($query) || ! is_string($query['query'] ?? null) || ! is_array($query['bindings'] ?? null)) {
            return;
        }
        $sql = $query['query'];
        $time = is_numeric($query['time'] ?? null) ? (float) $query['time'] : 0.0;
        $this->line(sprintf('- %.1f ms: `%s`', $time, mb_substr((string) preg_replace('/\s+/', ' ', $sql), 0, 160)));
        foreach (DB::select('explain '.$sql, array_values($query['bindings'])) as $row) {
            $plan = get_object_vars($row);
            $value = fn (string $column): string => is_scalar($plan[$column] ?? null) ? (string) $plan[$column] : '—';
            $this->line(sprintf('  - table %s, type %s, key %s, rows %s, extra %s', $value('table'), $value('type'), $value('key'), $value('rows'), $value('Extra')));
        }
    }
}
```

`backend/api/scripts/stats-bench.sh`:

```sh
#!/bin/sh
set -eu
cd "$(dirname "$0")/../../.."

bench() {
  docker compose --profile stats-bench "$@"
}

bench up -d --wait mysql-bench
bench run --rm --build bench migrate --force
bench run --rm bench content:import
bench run --rm bench stats:synthesize "$@"
bench restart mysql-bench
bench up -d --wait mysql-bench
bench run --rm bench stats:measure
```

**El coordinador** suma en `docker/compose.yaml`, después de `test`, los dos servicios del perfil:

```yaml
  mysql-bench:
    profiles: [stats-bench]
    image: *mysql-image
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_es_0900_ai_ci
      - --skip-log-bin
      - --innodb-buffer-pool-size=1G
      - --innodb-buffer-pool-load-at-startup=OFF
    environment:
      MYSQL_ALLOW_EMPTY_PASSWORD: 'yes'
      MYSQL_DATABASE: taller_stats_bench
    volumes:
      - mysql-bench-data:/var/lib/mysql
    networks: [bench]
    dns: ['127.0.0.1']
    healthcheck: *mysql-healthcheck
    security_opt:
      - no-new-privileges:true

  bench:
    profiles: [stats-bench]
    build:
      context: ./backend/api
      target: dev
      additional_contexts:
        repo: .
    entrypoint: ['php', 'artisan']
    environment:
      <<: *laravel-test-env
      DB_HOST: mysql-bench
      DB_DATABASE: taller_stats_bench
      DB_USERNAME: root
      DB_PASSWORD: ''
    networks: [bench]
    dns: ['127.0.0.1']
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    depends_on:
      mysql-bench:
        condition: service_healthy
```

También suma, bajo `networks:`, `bench:` con `internal: true`, y bajo `volumes:`, `mysql-bench-data: {}`. En `package.json` suma `"api:stats:bench": "sh backend/api/scripts/stats-bench.sh"` después de `api:runs:check`.

Ninguna salida nueva entra en Git: el informe sale por la salida estándar, y el volumen es de Docker.

3. **En verde**, con `--filter=BenchGuardTest`, `api:analyse` y `api:format:check`. El coordinador comprueba:
   - `COMPOSE_PROJECT_NAME=<wt> docker compose --profile stats-bench config`;
   - `sh -n backend/api/scripts/stats-bench.sh`.
4. **El commit:** `feat(api): C5 suma la medición de las estadísticas y su perfil de Compose (T016)`.

#### T017 · Correr la medición y la compuerta de los índices (coordinador)

**Archivos:**
- se crean, sólo si el criterio los pide, `database/migrations/2026_10_29_500001_add_attempts_attempted_at_outcome_index.php` y `…_500002_add_attempts_attempted_at_user_outcome_index.php`;
- si entra un índice, se modifica `tests/Feature/Runs/SchemaTest.php`.

1. **El permiso del usuario.** La escala completa (5 000 alumnos, 730 días, 30 000 intentos por día) pesa varias decenas de GB y tarda horas. El coordinador:
   - informa el espacio libre de `df -h /var/lib/docker`;
   - le pide al usuario la escala: la completa, o `--per-day=7500` y extrapolar (decisión 1 del informe).
2. **Correr:**
   - la medición: `COMPOSE_PROJECT_NAME=<wt> sh backend/api/scripts/stats-bench.sh --students=5000 --days=730 --per-day=<la elegida>`;
   - guardar el informe en la descripción del PR;
   - al terminar, `COMPOSE_PROJECT_NAME=<wt> docker compose --profile stats-bench down -v`.
3. **El criterio** (research, R8). Se aplica a cada lector que supera los 2 000 ms:
   - si alguna de sus consultas tiene en el `EXPLAIN` la tabla `a` con `type` `ALL` o `index` y más de 100 000 filas, entra la migración 500001;
   - si después de 500001 el lector sigue arriba de 2 000 ms y el `EXPLAIN` de esa consulta no dice `Using index` para `a`, entra la 500002, que la reemplaza;
   - si después de los índices sigue arriba de 2 000 ms, es el disparador del §9: se escribe en el PR y C5 no construye rollups ni réplica (FR-040).

`database/migrations/2026_10_29_500001_add_attempts_attempted_at_outcome_index.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// C5, FR-039 (specs/025-c5-estadisticas/research.md, R8): added because the measurement asked for it.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE `attempts` ADD INDEX `attempts_attempted_at_outcome_index` (`attempted_at`, `outcome`), ALGORITHM=INPLACE, LOCK=NONE');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE `attempts` DROP INDEX `attempts_attempted_at_outcome_index`, ALGORITHM=INPLACE, LOCK=NONE');
    }
};
```

`database/migrations/2026_10_29_500002_add_attempts_attempted_at_user_outcome_index.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// C5, FR-039 (specs/025-c5-estadisticas/research.md, R8): the covering index that replaces 500001.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE `attempts` DROP INDEX `attempts_attempted_at_outcome_index`, ADD INDEX `attempts_attempted_at_user_outcome_index` (`attempted_at`, `user_id`, `outcome`, `legacy`), ALGORITHM=INPLACE, LOCK=NONE');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE `attempts` DROP INDEX `attempts_attempted_at_user_outcome_index`, ADD INDEX `attempts_attempted_at_outcome_index` (`attempted_at`, `outcome`), ALGORITHM=INPLACE, LOCK=NONE');
    }
};
```

**En `SchemaTest`** («the index contract»), el `$expected` suma la fila del índice que quede:
- `'attempts.attempts_attempted_at_outcome_index' => [1, 'attempted_at,outcome'],`;
- o, si quedó el cubriente, `'attempts.attempts_attempted_at_user_outcome_index' => [1, 'attempted_at,user_id,outcome,legacy'],`.

4. **Por cada índice que entra:**
   - correr la suite completa;
   - volver a correr la medición desde cero, con `down -v` y `stats-bench.sh`;
   - guardar los dos informes (antes y después) en el PR.
5. **El commit**, sólo si entra un índice: `perf(api): C5 suma el índice de attempts que pidió la medición (T017)`. Si no entra ninguno, no hay commit: el informe de la medición va en el PR como evidencia de SC-008.

#### T018 · La compuerta final (coordinador)

1. **La compuerta de la entrega** (quickstart §1, SC-009):
   - `COMPOSE_PROJECT_NAME=<wt> npm run api:test`, y lo mismo con `-- --order-by=random --random-order-seed=777`;
   - `api:format:check` y `api:analyse`;
   - `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`.
2. **Comparar con la línea de base** (T001): las pruebas nuevas y las cuatro de C3b con sus conteos nuevos (15, 14, 10 y 7).
3. **La descripción del PR,** en inglés, con:
   - el título `feat(api): give admins usage statistics without student texts (C5)`;
   - los conteos;
   - el informe de la medición;
   - lo que quedó sin verificar.
4. **Las tareas:** se marcan en `tasks.md` con su commit.

## Cobertura de la spec

| Requisito | Tareas | Criterio |
| --- | --- | --- |
| FR-001, FR-002, FR-003 | T005, T006, T008, T009, T011, T012 (rutas y forma); la matriz de C3b | SC-004 |
| FR-004 | T013 (texto y consultas), T005 a T012 (sin candados ni transacciones) | SC-006 |
| FR-005 | T017 (sólo índices) | — |
| FR-006 a FR-008 | T013 (`StatsArchTest`), T005 (testigos y claves de la matriz) | SC-002, SC-003 |
| FR-009 | T009 (sólo banderas por cuenta), T006 y T007 (la distribución sin identificadores) | SC-002 |
| FR-010, FR-011, FR-012 | T005 a T012 (`toBe` sobre las claves exactas; cada tasa con su `n`) | SC-002 |
| FR-013 | T005 (claves y testigos), T006, T008, T009, T011 y T012 (conteo y escenarios) | SC-002 |
| FR-014 | T013 | SC-003 |
| FR-015 | T009, T010 y T011 (la línea `admin.student_viewed`) | SC-005 |
| FR-016, FR-017 | T005 (población), T009 (404 del detalle), T010 (ficha con `usage` nulo) | SC-001, SC-004 |
| FR-018, FR-019, FR-020 | T005 a T007 (`server`, `imported` y legados aparte; `counted`); `contracts/http.md`, §1 | SC-001 |
| FR-021 a FR-023 | T002 (período), T005 (resumen y series) | SC-001 |
| FR-024 a FR-028 | T006 y T007 | SC-001 |
| FR-029 | T008 | SC-001 |
| FR-030 | T009 | SC-001 |
| FR-031 | T010 | SC-001 |
| FR-032 | T011 | SC-002 |
| FR-033 | T012 | SC-001 |
| FR-034, FR-035 | T004 (caché), T005 (10 minutos por HTTP), T009 (nada por cuenta) | SC-004 |
| FR-036 | T004 (portón y 503), T013 (sólo `StatsRows` usa `DB`) | SC-007 |
| FR-037 | T008, T009 y T010 (consultas acotadas por `user_id` o por la página) | SC-008 |
| FR-038 a FR-040 | T015, T016 y T017 | SC-008 |
| FR-041 | T002 a T013 | SC-001 a SC-007 |
| FR-042 | T014 y T018 | SC-009 |

## Lo que quedó sin verificar

Esta tarea no tuvo PHP, MySQL ni Docker: todo el código del plan es referencia sin ejecutar, y la primera corrida de cada prueba lo confirma o lo corrige. Lo que más probablemente pida un ajuste:

- **La sintaxis de MySQL 9.7:**
  - `JSON_TABLE` con `ERROR ON EMPTY ERROR ON ERROR` y columnas `datetime(3)` a partir de una cadena `Y-m-d H:i:s.v`;
  - el `left join (t1 join t2 on …) on …` con paréntesis;
  - el `group by` por el alias `solved` y por `value` (`ONLY_FULL_GROUP_BY`);
  - `order by` sobre la columna ENUM `kind` en su orden de declaración.
- **Los tipos de PHPStan nivel 9:**
  - `Cache::store()->remember()` (T004 dice qué hacer si no infiere el tipo);
  - `config()->array()` en `BenchDatabase`;
  - los `list<…>` de los arreglos armados en bucles;
  - el `WeekDay::Monday` de Carbon 3.14.2 (T002 dice la alternativa).
- **La fábrica de `User`:** que `created_at` y `updated_at` como `CarbonImmutable` se conserven en la fábrica (Eloquent no pisa un `created_at` sucio).
- **El borde de la medianoche:** que el `compile_error` de las 02:30Z caiga en el intervalo del 5 de octubre se comprueba sólo con MySQL real.
- **La medición:** el tiempo que tarda el sintetizador con la escala completa y el espacio que ocupa son estimaciones. La medición los informa, y la escala la decide el usuario.
- **`RunWorld::run`:** que acepte un `created_at` como cadena y los `id` fijos. El código de `RunWorld` lo admite, porque los reemplazos se esparcen sobre la fila (`...$overrides`).

## Complexity Tracking

Sin violaciones de la constitución. Lo que podría parecer de más, y por qué no:

| Pieza | Por qué hace falta | Alternativa más simple descartada |
| --- | --- | --- |
| `StatsRows`, un portón propio | Pone el tope de FR-036 en cada consulta sin repetirlo y deja que la prueba de arquitectura lo exija | `SET SESSION max_execution_time` deja estado en la conexión y no cubre la conversión del error (research, R1) |
| `JSON_TABLE` para los intervalos | Hace exactos los días locales sin las tablas de zonas de MySQL | `CONVERT_TZ` depende de tablas que nadie garantiza; un desfase fijo se rompe con cambio de horario (R2) |
| `StatsWorld`, una población grande | Siete cuentas y once intentos cubren cada regla (población, legados, reset, supresión y zona) con valores contados a mano | Una población por prueba repetiría el armado y separaría reglas que interactúan |
| El perfil `stats-bench` | `mysql-test` es un tmpfs de 1 GB y FR-038 pide la escala del ADR | Medir con una muestra chica sin decirlo no dispararía nunca el §9 |
