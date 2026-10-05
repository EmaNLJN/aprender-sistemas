# AGENTS.md — API Laravel

API del ADR 0004 (`docs/adr/0004-backend-laravel-mysql-contenido-y-progreso.md`): Laravel 13
API-only sobre PHP-FPM 8.5 y MySQL 9.7, en Docker. El host no tiene PHP ni Composer: todo corre
en contenedores y `vendor/` sólo existe dentro de las imágenes.

- **Comandos:**
  - `npm run api:test`: Pest contra `mysql-test`. Para filtrar,
    `npm run api:test -- --filter=Nombre`.
  - `npm run api:test:down`: apaga la base de pruebas.
  - `npm run api:format:check`: Pint.
  - `npm run api:analyse`: PHPStan con Larastan, nivel 6 (`phpstan.neon`), sobre `app`, `config`,
    `database`, `routes` y `bootstrap/app.php`.
  - `npm run api:smoke`: con `docker compose up --build -d --wait` corriendo.
  - Ninguno forma parte de `npm test`.
- **Dependencias:** se agregan con `composer:2.10` y `--no-install`, para que sólo cambien
  `composer.json` y `composer.lock`:
  `docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/backend/api":/app -w /app composer:2.10 require --no-install --no-scripts 'vendor/paquete:^1.0'`.
  Cada descarga necesita permiso del usuario.
- **Arreglos:** se transforman con Collections (`collect()`) o con los helpers `Arr::` de
  Laravel, no encadenando `array_map`, `array_filter`, `array_values` o `array_column`. En los
  bordes entran y salen arreglos: con `->all()`, y una lista filtrada lleva antes `->values()`.
  `PublishedJson` y el query builder reciben siempre arreglos, nunca una Collection.
- **Rutas:** van en `routes/api.php`, con prefijo `/api`. Sin rutas web y sin
  `php artisan install:api`, que instala Sanctum; la autenticación llega en C3 con
  `composer require`.
- **Configuración:**
  - Viene del entorno que define `docker/compose.yaml` (ancla `x-laravel-env`).
  - Los secretos vienen del `.env` de la raíz (`sh backend/api/scripts/init-env.sh`).
  - `env()` va sólo dentro de `config/`: con `config:cache`, devuelve `null` en el resto.
- **MySQL:**
  - Los textos usan la colación de la conexión, `utf8mb4_es_0900_ai_ci`.
  - Los IDs de contenido van en `ascii_bin`, por columna, en cada migración.
  - Sin SQLite, ni en pruebas.
- **Contenido (C2):**
  - `app/Content/` arma las 17 porciones desde las tablas con los bytes que fija el generador (`PublishedJson`): la respuesta es ese texto, nunca `response()->json()` ni un `JsonResource`. Las huellas las calcula sólo `tools/content`; PHP las guarda y las compara.
  - `content:import` corre en el servicio `migrate` (`docker/migrate.sh`, el único backoff), toma el candado `GET_LOCK` y se auto-chequea en cada corrida.
  - Para desplegar, desde la raíz, `sh backend/api/scripts/deploy.sh`: corre `migrate` con la imagen nueva antes de reemplazar `php`, así un fallo deja sirviendo al anterior (FR-034). `docker compose up --build` no lo garantiza, y `sh backend/api/scripts/deploy-check.sh` lo prueba contra el stack.
  - Las tablas se escriben a mano en un único `CREATE TABLE` por migración, con el DDL de `specs/001-c2-contenido-mysql/data-model.md`.
- **Pruebas:**
  - `RefreshDatabase` es el default (`tests/Pest.php`). `DatabaseTruncation` queda para el
    código que hace `TRUNCATE` o abre sus propias transacciones.
  - `phpunit.xml` impone la base de pruebas con `<env force="true">` y `<server>`, porque
    Laravel lee primero `$_SERVER`. Cada variable nueva que apunte a la base va con las dos.
  - `tests/TestCase.php` corta antes de tocar una base que no sea `mysql-test`/`taller_test*`,
    con la conexión efectiva (DB_URL, socket y hosts de lectura o escritura incluidos) y antes de las bases de cada proceso
    en paralelo.
  - Tres suites: `tests/Unit` (PHP puro, sin aplicación), `tests/Feature` (`RefreshDatabase`) y `tests/Content`
    (`DatabaseTruncation`: el import, HTTP y el DDL confirman sus propias transacciones).
- **Contenedores:** `php` y `migrate` corren como `www-data` y con disco de sólo lectura. Lo
  que necesite escribir va a un tmpfs declarado en `docker/compose.yaml`.
