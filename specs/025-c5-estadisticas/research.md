# Research: C5 · Estadísticas del admin

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-10-28

Las decisiones técnicas del plan, con sus alternativas, la tabla de Context7 y lo que se leyó del código. Se planificó sobre `master` en `24ba9d3d` (la base del worktree), no sobre `431c9d90`: C5 es sólo backend, y F4 y el tope del HTML (#76 y #77) no lo tocan. Todo el PHP y el SQL del plan son **referencia sin ejecutar**: esta tarea no tuvo PHP, MySQL ni Docker.

## Decisiones

### R1. Un solo portón a la base: `StatsRows`, con la pista `MAX_EXECUTION_TIME`

- **Decisión:** todo el SQL de C5 es texto crudo que pasa por `App\Stats\StatsRows::select()`. El portón exige que la sentencia empiece por `select`, le agrega la pista `/*+ MAX_EXECUTION_TIME(n) */` después de esa palabra y convierte el error 3024 de MySQL en `App\Http\StatsTimeout` (503 `stats_timeout` con `Retry-After`). Una prueba de arquitectura prohíbe que el resto de `App\Stats` use `DB` o el constructor de consultas (FR-036 por construcción).
- **Por qué:** la pista vale sólo para un `SELECT` y debe ir después del primer `SELECT` (manual de MySQL, «Optimizer Hints»). Con un portón, cada consulta la lleva sin repetirla, y el estilo coincide con el de B2 (`QuotaPolicy`, `RunReader`), que escribe SQL crudo con `DB::select`.
- **Alternativas descartadas:**
  - `SET SESSION max_execution_time` en un middleware. Cubre también las consultas del constructor, pero deja estado en la conexión: en las pruebas, `RefreshDatabase` comparte la conexión entre pruebas y hay que restaurarla siempre. Además, el pipeline del router convierte la excepción en respuesta antes de que el middleware la vea.
  - El constructor de consultas con `selectRaw('/*+ … */ …')`. La paginación de Laravel arma su propio `count(*)` sin la pista.
- **Excepciones (FR-036):** dos lecturas por clave que C5 reutiliza y no escribe: la cuenta por su id (`UserDirectory::find`) y `QuotaPolicy::usage` de B2, acotada por `runs_user_id_created_at_index` a 24 horas.

### R2. Los períodos se cortan en PHP y se cruzan con `JSON_TABLE`

- **Decisión:** `Period` calcula en PHP los cortes de cada intervalo en la zona del taller (medianoche local de cada día, lunes de cada semana, día 1 de cada mes) y los pasa en UTC como un arreglo JSON. La consulta los convierte en filas con `JSON_TABLE(?, '$[*]' COLUMNS (… ERROR ON EMPTY ERROR ON ERROR))` y hace un `LEFT JOIN` por rango. Cada intervalo aparece aunque esté vacío, y `count(distinct …)` es exacto por intervalo.
- **Por qué:** es exacto en cualquier zona, también con cambio de horario, y no depende de las tablas de zonas horarias de MySQL (`CONVERT_TZ` con nombres necesita `mysql_tzinfo_to_sql`, que nadie garantiza en los volúmenes existentes). `ERROR ON ERROR` hace que un corte mal formado falle en lugar de volverse `NULL`, que por omisión daría cero filas en silencio (manual, `JSON_TABLE`).
- **Alternativas descartadas:**
  - `date(convert_tz(…, 'America/Argentina/Buenos_Aires'))`: depende de las tablas de zonas.
  - Un desfase fijo (`- interval 3 hour`): vale hoy para Buenos Aires y se rompe con una zona que cambie de hora.
  - Agrupar por hora en SQL y cortar en PHP: no permite contar alumnos distintos por día.
- **Condición del `LEFT JOIN`:** el filtro de la población va dentro de la condición del join (`left join (attempts a join users u on … and <población>) on …`), no en el `WHERE`. Si fuera al `WHERE`, el intervalo vacío desaparecería.

### R3. Las rutas por cuenta no usan caché; los agregados, 10 minutos

- **Decisión:** `StatsCache::remember()` guarda en el store por omisión (`database`) sólo el resumen y las estadísticas del contenido, con la clave `stats:v1:<vista>:<sha256 de los parámetros>`. Guarda arreglos y nunca objetos, porque `cache.serializable_classes` vale `false` (Laravel 13). La lista de alumnos, el detalle, la ficha, la cola y las ejecuciones se calculan en cada pedido (FR-034 y FR-035).
- **Por qué:** así la caché nunca guarda un dato de una cuenta. Una supresión se ve en el pedido siguiente en todo lo que identifica a alguien, y en los agregados, como mucho 10 minutos después.

### R4. La lista de ejecuciones se ordena por id

- **Decisión:** `GET /api/admin/runs` ordena por `runs.id desc` y pagina con un cursor que es el último id (`id < ?`). El id es un UUIDv7, que ordena por la hora de aceptación (B2 lo genera con `Str::uuid7(time: $now)`).
- **Por qué:** usa la clave primaria, porque `runs` no tiene índice por `created_at` (ADR 0006, crítica del DBA: la poda va por rango de PK). Además, un cursor por un valor único no repite ni saltea filas cuando dos ejecuciones comparten el milisegundo.
- **Alternativa descartada:** `cursorPaginate` de Laravel sobre `(created_at, id)`. No lleva la pista, ordena con un filesort y su cursor cifrado no suma nada.
- La spec se ajustó en FR-032 (commit `968ad612`).

### R5. Los datos de la ficha de C3b se conservan; `usage` es aditivo

- **Decisión:** `GET /api/admin/users/{user}` agrega la clave `usage` al final de `AdminUser` y responde como hoy para una cuenta en `deleting`, con `usage: null`. Cada respuesta con éxito deja la línea `admin.student_viewed` con `view: summary`.
- **Por qué:** C3b ya entregó ese comportamiento, y `UsersListTest` filtra por `deleting`. Cambiarlo a 404 rompería un contrato que nadie pidió cambiar. La spec se corrigió en FR-017, FR-031 y SC-004 (commit `968ad612`).
- **Lo que cambia en las pruebas de C3b:** `UserShowTest` («exactly the nine AdminUser keys») pasa a diez claves.

### R6. El límite de privacidad se prueba en tres capas

1. **La matriz de C3b, ampliada.** `NoStudentTextsTest` suma las claves prohibidas `stdout`, `stderr`, `program`, `nonce`, `report`, `code_sha256` y `raw_sha256`, y siembra testigos en `runs`, `drafts`, `route_notes`, `workshop_progress.note`, `progress_imports.raw_payload` y `report`. Recorre las rutas nuevas, con un escenario para `stats/students/{user}`.
2. **Las listas cerradas.** Cada prueba de ruta compara las claves exactas de la respuesta con `toBe([...])`, sensible al orden (FR-012).
3. **La prueba de arquitectura.** Recorre el texto de `app/Stats/` y de los controladores y pedidos de C5:
   - prohíbe las tablas `drafts`, `attempt_payloads`, `route_notes`, `sync_operations` y `sessions`;
   - prohíbe las columnas de texto y de huellas;
   - permite la palabra `code` sólo como `` `c`.`code` `` (la clave de `catalogs`, con el alias `c`). Por eso C5 no lee la bandera `campaign_seals.code` (cuenta filas de sellos) y toma los lenguajes de `RunLanguage::cases()`, no de `languages.code`;
   - prohíbe el reloj de MySQL (`now()`, `current_timestamp`, `utc_timestamp`, `sysdate`, `curdate`, `curtime`): todo instante es un parámetro tomado de `Instant::now()`, que `travelTo` congela;
   - prohíbe los candados (`for update`, `for share`, `lock in share mode`, `lockForUpdate`, `sharedLock`, `transaction(`, `AccountLock`).

### R7. La población a mano en `tests/Support/StatsWorld.php`

- **Decisión:** una sola población, con instantes fijos y el reloj congelado en `2026-10-20 15:00:00Z` (12:00 en Buenos Aires). Tiene siete cuentas:
  - un admin que estudia;
  - Ana, activa;
  - Beto, activo, con una importación;
  - Caro, deshabilitada;
  - Dani, que nunca practicó;
  - Eva, en supresión;
  - Fede, activo, con un «Borrar todo».

  Hay cinco ejercicios, en tres catálogos, con uno retirado; un mundo, un taller, un paso del recorrido y cuatro ejecuciones con ids fijos. Los valores esperados de cada prueba se contaron a mano sobre esa lista y están escritos en el plan (tarea T005), no se recalculan.
- **El borde de la zona horaria:** el `compile_error` de Ana de `2026-10-06 02:30Z` es el 5 de octubre a las 23:30 en Buenos Aires, y cae en el intervalo del 5.

### R8. La medición en su propio MySQL

- **Decisión:** un perfil `stats-bench` de Compose con `mysql-bench` (la misma imagen, un volumen con nombre, `--skip-log-bin` y 1 GiB de buffer pool) y un servicio `bench` (el target `dev`, que ya trae el currículo). La red es interna. Dos comandos de Artisan:
  - `stats:synthesize`: los alumnos, dos años de intentos con sus pruebas, el progreso derivado y 14 días de `runs`;
  - `stats:measure`: el tiempo en frío de cada lector y el `EXPLAIN` de cada consulta.

  Los dos se niegan a correr si la conexión efectiva no es `mysql-bench/taller_stats_bench`, con la misma comprobación que `TestCase::ensureTestDatabase`.
- **Por qué:** `mysql-test` es un tmpfs de 1 GB, y la escala del ADR (unos 22 millones de intentos y 46 millones de veredictos, con el reparto del sintetizador) pesa decenas de GB. Que la escala completa o una menor con extrapolación es decisión del usuario (informe, decisión 1).
- **El criterio de los índices (FR-039),** sobre el informe de la medición:
  - un lector que tarda más de 2 000 ms en frío;
  - y, en el `EXPLAIN` de una de sus consultas, la tabla `a` (`attempts`) con `type` `ALL` o `index` y más de 100 000 filas estimadas.

  Las dos cosas juntas suman `attempts_attempted_at_outcome_index`. Si sigue arriba de 2 s y el `EXPLAIN` no dice `Using index`, se reemplaza por el cubriente `attempts_attempted_at_user_outcome_index (attempted_at, user_id, outcome, legacy)`. Las dos migraciones están en T017.

### R10. Las habilidades `viewStats` y `viewRunMetadata` del §4.5

- **Decisión:** las cubre el grupo `admin` de C3b (`account.admin` y `throttle:admin`), sin Gates propios.
- **Por qué:** sólo el rol `admin` las tiene, así que un Gate por habilidad sería lo mismo que el grupo, sin un segundo rol que lo use (YAGNI). Ninguna lleva un `before()` que autorice todo, porque no hay Gates.
- **Si aparece** un rol con acceso parcial (por ejemplo, alguien que ve la cola y no las cuentas), el Gate entra con él.

### R9. Lo que no aplica de «hallazgos-para-planes.md»

- **C5-1** (las pantallas sin dueño): lo resolvió el clarify con F14 (Q4-A).
- **C5-2** (el ejecutor no admite campos de más): C5 no pide métricas nuevas al ejecutor; lee `runs` y `attempts`. No toca B2.
- **C5-3** (tablas nuevas y permisos): C5 no crea tablas ni ubicaciones de Nginx. Las que lee ya tienen `SELECT` para `taller_app` en la matriz de C4 (`specs/008-c4-exposicion/data-model.md`, «Por tabla»), y los índices los aplica `taller_migrate`, que tiene `INDEX` y `ALTER`.
- **C5-4** (la superficie de B3): C5 no toca `app/Runs/Execution/*`, `Program/` ni `Evidence/`. Reutiliza `QuotaPolicy` sin cambiarla. Suma una clave a `config/runs.php`, que no está en `AUDITED_SURFACE` (`impl-b3`, `qa/lib/audit-surface.ts`).
- **Transversal:** TR-1 a TR-17 son del front y no aplican a C5.

## Context7

Servidor `mcp__44441c24-…` (el primero agotó la cuota). Las versiones son las de `backend/api/composer.lock`: Laravel 13.34.0, Pest 5.3.0, PHPStan 2.2.17, Larastan 3.12.3 y Carbon 3.14.2.

| Librería | Versión | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| Laravel (`/laravel/docs`, 13.x) | 13.34.0 | `Cache::remember` y el store `database` | `remember($key, $seconds, Closure)` guarda lo que devuelve el closure si falta; si el closure lanza, no guarda nada | Sí: el 503 por tope no deja caché sin código extra (SC-007) |
| Laravel (13.x, `upgrade.md`) | 13.34.0 | `cache.serializable_classes` | Desde Laravel 13 vale `false` por omisión: sólo se guardan arreglos y escalares | Sí: `StatsCache` guarda arreglos, nunca objetos (R3) |
| Laravel (13.x) | 13.34.0 | `travel`, `travelTo` y `freezeTime` en las pruebas | `travelTo` congela el reloj de PHP; MySQL sigue con el suyo | Sí: la regla de arquitectura prohíbe el reloj de MySQL (R6) |
| Laravel (13.x) | 13.34.0 | `cursorPaginate` con varias columnas | Arma su propio `WHERE` y su cursor; no pasa por el portón | Sí: cursor propio por id (R4) |
| Laravel (13.x) | 13.34.0 | `after()` de un FormRequest, `date_format` y `after_or_equal` | `after()` devuelve closures que reciben el `Validator` y corren después de las reglas, aunque ya haya errores | Sí: el tope de 366 días se comprueba sólo si no hay errores previos |
| MySQL (`/websites/dev_mysql_doc`) | 9.7 (manual vigente) | La pista `MAX_EXECUTION_TIME` | Sólo en `SELECT` de lectura, después del primer `SELECT`, en milisegundos; si se supera, error 3024 (HY000) | Sí: el portón la inyecta y mapea el 3024 (R1) |
| MySQL | 9.7 | `SLEEP()` interrumpido por la pista | Solo, devuelve 1 sin error; dentro de una consulta mayor, da el error 3024 | Sí: la prueba del tope usa `select 1 … from users where sleep(1) = 0` sobre una tabla con filas |
| MySQL | 9.7 | `JSON_TABLE`, `ON EMPTY` y `ON ERROR` | Por omisión, un valor que falta o no convierte da `NULL`; `ERROR ON EMPTY` y `ERROR ON ERROR` lo vuelven un error | Sí: los cortes llevan los dos (R2) |
| Pest (`/pestphp/docs`, 5.x) | 5.3.0 | `arch()->expect()->not->toUse()->ignoring()` | Prohíbe usos directos de clases o espacios de nombres, con excepciones por clase | Sí: «sólo `StatsRows` usa `DB`» (R6) |
| Larastan (`/larastan/larastan`) | 3.12.3 | Tipos de `DB::select` y del closure de `remember` | Las páginas consultadas tratan los closures de relaciones, no `DB::select` ni `Cache::remember` | No: se copia el patrón que ya pasa el nivel 9 en B2 (`foreach (DB::select(…) as $row) new RowFields(get_object_vars($row), …)`) |
| PHPStan (`/phpstan/phpstan`) | 2.2.17 | El nivel 9 y `mixed` | En el nivel 9, lo único que se puede hacer con un `mixed` explícito es pasarlo a otro `mixed`: no se lo castea ni se le leen propiedades | Sí: el sintetizador lee las filas con `RowFields` en lugar de `(string) $row->id`, y `MeasureStats::explain()` estrecha cada entrada del log con `is_array` e `is_string` |
| Laravel, código fuente (`WebFetch`, `laravel/framework` v13.34.0, `src/Illuminate/Contracts/Cache/Repository.php`) | 13.34.0 | El tipo de `remember()` | `@template TCacheValue`, `@param \Closure(): TCacheValue $callback` y `@return TCacheValue`. Context7 no traía el docblock, así que se leyó el fuente | Sí: `StatsCache` devuelve lo que devuelve el closure sin comprobaciones extra (T004) |
| Carbon (`/briannesbitt/carbon`) | 3.14.2 (la documentación es de 3.11) | `startOfWeek()` y `Carbon\WeekDay` | `startOfWeek(WeekDay\|int\|null $weekStartsAt = null)`, y el enum `WeekDay` tiene `Monday = 1`. Sin argumento, la semana empieza según el locale | Sí: `Period` pasa `WeekDay::Monday` explícito y no depende del locale (T002) |

## Lo que se leyó del código (sobre `24ba9d3d`)

- **Las migraciones:**
  - `attempts` tiene la columna virtual `counted` y los índices `(user_id, exercise_id, attempted_at)` y `(exercise_id, attempted_at, outcome)`. No tiene uno por `attempted_at` solo: es el que el ADR anticipa para C5.
  - `runs` tiene `(status, created_at)` y `(user_id, created_at)`, y ninguno por `created_at` solo.
  - `exercise_progress` tiene `(exercise_id, solved_at)`.
  - `campaign_seals.code` y `catalogs.code` se llaman `code`.
- **Las pruebas de C3b que fijan conteos:**
  - `AdminAccessMatrixTest` («covers exactly the nine routes»);
  - `NoStudentTextsTest` (`toHaveCount(8)` y seis claves prohibidas);
  - `UserShowTest` (nueve claves);
  - `OversizedIdRoutesTest` (seis rutas).
- **Otras piezas:**
  - `PublishedAdminUser` y `PageMeta`;
  - el grupo `admin` en `bootstrap/app.php`, con `throttle:admin` de 120 por minuto (`app/Auth/Limiters.php`);
  - `QuotaPolicy::usage` y `config/runs.php`;
  - `RowFields`, `Instant` e `Iso8601`;
  - `RunWorld`, `ProgressWorld` y `PopulatedAccount`;
  - `Browser::useDatabaseDrivers()`, que pasa la caché al store `database`;
  - `phpunit.xml` (`CACHE_STORE=array`).
- **La configuración de Compose:** `docker/compose.yaml` fija `EXECUTOR_MAX_CONCURRENT` sólo en `executor` y en las réplicas de `worker-runs`; `mysql-test` es un tmpfs de 1 GB.
