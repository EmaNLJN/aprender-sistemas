# AGENTS.md — API Laravel

API del ADR 0004 (`docs/adr/0004-backend-laravel-mysql-contenido-y-progreso.md`): Laravel 13
API-only sobre PHP-FPM 8.5 y MySQL 9.7, en Docker. El host no tiene PHP ni Composer: todo corre
en contenedores y `vendor/` sólo existe dentro de las imágenes.

- **Comandos:**
  - `npm run api:test`: Pest contra `mysql-test`. Para filtrar,
    `npm run api:test -- --filter=Nombre`.
  - `npm run api:test:down`: apaga la base de pruebas y borra la red `testing` del proyecto,
    sin tocar el stack principal.
  - `npm run api:format:check`: Pint.
  - `npm run api:analyse`: PHPStan con Larastan, nivel 9 desde C6 (`phpstan.neon`), sin baseline ni `ignoreErrors`, sobre `app`, `config`,
    `database`, `routes` y `bootstrap/app.php`.
  - `npm run api:smoke`: con `docker compose up --build -d --wait` corriendo.
  - `npm run api:runs:check`: con el stack corriendo, ejecuciones reales contra el ejecutor (los doce
    casos de B2, las cuotas, la cola llena y el log). Crea y borra sus cuentas, y tarda unos minutos
    porque C3a acepta como mucho diez invitaciones por minuto desde una misma red.
  - `npm run api:sync:check`: con el stack corriendo, la sincronización del progreso de punta a
    punta (dos clientes de una cuenta que convergen, los reenvíos, la poda, la época y los límites)
    y la medición de SC-010. Crea y borra sus cuentas, y tarda unos minutos por el mismo límite.
  - Ninguno forma parte de `npm test`.
  - En un worktree, cada comando de Docker (`docker compose …`, `npm run api:*`) lleva su propio
    `COMPOSE_PROJECT_NAME=<nombre-del-worktree>` en la misma línea: sin él, Compose usa el proyecto
    por omisión, que es el stack del usuario.
- **Dependencias:** se agregan con `composer:2.10` y `--no-install`, para que sólo cambien
  `composer.json` y `composer.lock`:
  `docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/backend/api":/app -w /app composer:2.10 require --no-install --no-scripts 'vendor/paquete:^1.0'`.
  Cada descarga necesita permiso del usuario.
- **Arreglos:** se transforman con Collections (`collect()`) o con los helpers `Arr::` de
  Laravel, no encadenando `array_map`, `array_filter`, `array_values` o `array_column`. En los
  bordes entran y salen arreglos: con `->all()`, y una lista filtrada lleva antes `->values()`.
  `PublishedJson` y el query builder reciben siempre arreglos, nunca una Collection.
- **Rutas:** van en `routes/api.php` y, por característica, en `routes/api/<característica>.php`
  (registrado en `bootstrap/app.php`), con prefijo `/api`. Sin rutas web. No se usa Sanctum ni
  Fortify: nunca corras `php artisan install:api`; la sesión se monta a mano en `bootstrap/app.php`.
- **Configuración:**
  - Viene del entorno que define `docker/compose.yaml` (ancla `x-laravel-env`).
  - Los secretos vienen del `.env` de la raíz (`sh backend/api/scripts/init-env.sh`).
  - `env()` va sólo dentro de `config/`: con `config:cache`, devuelve `null` en el resto.
- **MySQL:**
  - Los textos usan la colación de la conexión, `utf8mb4_es_0900_ai_ci`.
  - Los IDs de contenido van en `ascii_bin`, por columna, en cada migración.
  - Sin SQLite, ni en pruebas.
- **Contenido (C2):**
  - `app/Content/` arma las 18 porciones (las 17 del contenido y, desde B2, `harness`, la plantilla de `content/harness/`) desde las tablas con los bytes que fija el generador (`PublishedJson`): la respuesta es ese texto, nunca `response()->json()` ni un `JsonResource`. Las huellas las calcula sólo `tools/content`; PHP las guarda y las compara.
  - `content:import` corre en el servicio `migrate` (`docker/migrate.sh`, el único backoff), toma el candado `GET_LOCK` y se auto-chequea en cada corrida.
  - Para desplegar, desde la raíz, `sh backend/api/scripts/deploy.sh`: corre `migrate` con la imagen nueva antes de reemplazar `php`, así un fallo deja sirviendo al anterior (FR-034). `docker compose up --build` no lo garantiza, y `sh backend/api/scripts/deploy-check.sh` lo prueba contra el stack.
  - Las tablas se escriben a mano en un único `CREATE TABLE` por migración, con el DDL de `specs/001-c2-contenido-mysql/data-model.md`.
  - Cada registro del contenido es una clase `readonly` de `app/Content/Record/` (C6), con `fromDocument`, `fromRow`, `toRow()` y `toPublished()`. En los bordes siguen los arreglos: el query builder recibe filas y `PublishedJson` recibe lo que da `toPublished()`, nunca un registro.
- **Identidad y acceso (C3a):** contratos en `specs/004-c3-identidad-acceso/contracts/`.
  - Una ruta protegida usa el grupo `account` (cuenta activa, `auth:web` y cuenta esperada); suma el
    alias `verified` donde el email deba estar verificado. Una característica nueva trae su propio
    `routes/api/<característica>.php`.
  - Todo error de la API sale de `ApiError::of(ApiCode::…)`, con `{message, code}`; un caso nuevo
    se agrega como `case` de `ApiCode` (con su estado y su mensaje en `lang/es/api.php`), no con
    `response()->json()`.
  - Toda contraseña entra como `PlainPassword::of($raw)` (normaliza a NFC) y se hashea, verifica o
    cambia sólo con `AccountPasswords`: nunca `Hash::` ni `bcrypt()` sobre texto crudo.
  - Los comandos corren con `docker compose exec php php artisan …`: `taller:invite {email} {--role=student}`
    da de alta, `taller:password-reset-link {email}` recupera, y `taller:check-transactions` aborta el
    despliegue desde `docker/migrate.sh`.
  - Hasta C3b, el rol y el estado de una cuenta se cambian con `php artisan tinker`.
  - `docker/mysql/db-grants.sql` es el único lugar de privilegios de MySQL. En un volumen que ya existe
    se aplica con `docker compose --profile ops run --rm db-grants`.
- **Ejecuciones (B2):** contratos en `specs/005-b2-api-ejecuciones/contracts/`.
  - `app/Runs/` se reparte en `Admission` (las cuotas y el tope de la cola), `Program` (el programa
    con la plantilla), `Evidence` (lee la salida del sandbox y clasifica), `Execution` (el cliente del
    ejecutor, el reclamo, el cierre, el barrido y la poda) y `Record` (las filas). `app/Progress/`
    tiene la cabecera de progreso de la cuenta.
  - `Program` y `Evidence` son puros: no tocan la base, la cola, HTTP, el log ni la caché
    (`PurityTest`, FR-038).
  - `AccountLock` es la única forma de bloquear la cabecera de una cuenta (`progress_heads`): la
    admisión y el cierre la toman, y lo que sume D1 también.
  - `RunLog` es la única puerta al log de las ejecuciones (`LogArchTest`). El código del alumno nunca
    va a un log ni al mensaje de una excepción.
  - El trabajo es `ExecuteRun`: un solo intento (`#[Tries(1)]`, sin `release()`), 120 s, en la
    conexión `runs` (una cola de base de datos con `retry_after` de 140 s). `queue:work` necesita
    PCNTL para cortar a tiempo, y la imagen lo trae. Su cuerpo es el puerto `RunProcessor`, que
    `AppServiceProvider` liga a `RunExecution` y las pruebas reemplazan.
  - La cadena de plazos (el pedido al ejecutor, 100 s; el trabajo, 120 s; `retry_after`, 140 s) la
    fijan `TimeoutChainTest` y `qa/compose-runs-check.ts`. Un plazo nuevo se suma en orden.
  - El `scheduler` corre `runs:sweep` cada minuto y `runs:prune` cada hora.
  - Los casos de la plantilla (`qa/fixtures/shared/harness-cases.json`) los corren
    `qa/content-harness-check.ts` y `HarnessFixtureTest`: el `Dockerfile` copia esa carpeta a
    `tests/Fixtures/shared`.
- **Progreso (D1a):** contratos en `specs/007-d1-progreso-sincronizacion/contracts/` (`http.md` y
  `merge-rules.md`).
  - `app/Progress/` se reparte en `Operations` (los dieciséis tipos, la decodificación, el hash
    canónico y el puerto `OperationProcessor`, que `AppServiceProvider` liga a
    `DatabaseOperationProcessor`), `Merge` (las formas del SQL y `OperationWriter`), `Snapshot`
    (`ProgressSnapshotReader`: la foto y el delta de `GET /api/progress` y de `changes`) y `Sync`
    (`SyncService`, `ClockCorrection` y el registro de UUID en `sync_operations`).
  - `AccountLock` sigue siendo la única puerta de la cabecera: `SyncService` aplica cada lote dentro
    de su candado y sube la revisión a lo sumo una vez.
  - Toda escritura de progreso es un `INSERT … ON DUPLICATE KEY UPDATE` que mira primero la guarda de
    la revisión y compara los textos con `CAST(… AS BINARY)`, porque la colación de la conexión no
    distingue mayúsculas ni acentos.
  - `/api/sync` queda fuera de `TrimStrings` y de `ConvertEmptyStringsToNull` (`bootstrap/app.php`):
    un texto llega como lo escribió el alumno, con sus espacios y la cadena vacía.
  - El fixture de fusión (`qa/fixtures/shared/merge-cases.json`, con su sha256) es el contrato común
    del servidor y del módulo de TypeScript (`frontend/src/features/progress-sync/model/`): no se
    regenera ni se edita para que algo pase. `MergeFixtureTest` corre sus casos contra MySQL real.
  - Ningún registro lleva texto del alumno: ni las reflexiones, ni los borradores, ni las notas.
  - El `scheduler` poda `sync_operations` cada hora (`progress:prune-sync-operations`), con la
    retención de `config/progress.php`.
- **Pruebas:**
  - `RefreshDatabase` es el default (`tests/Pest.php`). `DatabaseTruncation` queda para el
    código que hace `TRUNCATE` o abre sus propias transacciones.
  - `phpunit.xml` impone la base de pruebas con `<env force="true">` y `<server>`, porque
    Laravel lee primero `$_SERVER`. Cada variable nueva que apunte a la base va con las dos.
  - `tests/TestCase.php` corta antes de tocar una base que no sea `mysql-test`/`taller_test*`,
    con la conexión efectiva (DB_URL, socket y hosts de lectura o escritura incluidos) y antes de las bases de cada proceso
    en paralelo.
  - Las pruebas que dependen de una sesión usan `Tests\Support\Browser` (cookies, CSRF y cuenta
    esperada); con `Browser::useDatabaseDrivers()` la sesión y la caché van a la base, como en
    producción.
  - La suite corre con `memory_limit` de 512 MB (`phpunit.xml`): con 979 pruebas el pico fue de 127 MB,
    por acumulación entre pruebas. Si se queda sin memoria, medí el pico (`memory_get_peak_usage`)
    por suite antes de subir el límite, para distinguir una fuga del crecimiento de la suite.
  - Cuatro suites: `tests/Unit` (PHP puro, sin aplicación), `tests/Feature` (`RefreshDatabase`),
    `tests/Content` (`DatabaseTruncation`: el import, HTTP y el DDL confirman sus propias
    transacciones) y `tests/Concurrency` (`DatabaseTruncation`: varios procesos confirman a la vez,
    con `Tests\Support\Parallel`, que necesita PCNTL).
- **Contenedores:** `php` y `migrate` corren como `www-data` y con disco de sólo lectura. Lo
  que necesite escribir va a un tmpfs declarado en `docker/compose.yaml`.
