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
  `docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/api":/app -w /app composer:2.10 require --no-install --no-scripts 'vendor/paquete:^1.0'`.
  Cada descarga necesita permiso del usuario.
- **Rutas:** van en `routes/api.php`, con prefijo `/api`. Sin rutas web y sin
  `php artisan install:api`, que instala Sanctum; la autenticación llega en C3 con
  `composer require`.
- **Configuración:**
  - Viene del entorno que define `compose.yaml` (ancla `x-laravel-env`).
  - Los secretos vienen del `.env` de la raíz (`sh api/scripts/init-env.sh`).
  - `env()` va sólo dentro de `config/`: con `config:cache`, devuelve `null` en el resto.
- **MySQL:**
  - Los textos usan la colación de la conexión, `utf8mb4_es_0900_ai_ci`.
  - Los IDs de contenido van en `ascii_bin`, por columna, en cada migración.
  - Sin SQLite, ni en pruebas.
- **Pruebas:**
  - `RefreshDatabase` es el default (`tests/Pest.php`). `DatabaseTruncation` queda para el
    código que hace `TRUNCATE` o abre sus propias transacciones.
  - `phpunit.xml` impone la base de pruebas con `<env force="true">` y `<server>`, porque
    Laravel lee primero `$_SERVER`. Cada variable nueva que apunte a la base va con las dos.
  - `tests/TestCase.php` corta antes de tocar una base que no sea `mysql-test`/`taller_test*`,
    con la conexión efectiva (DB_URL, socket y hosts de lectura o escritura incluidos) y antes de las bases de cada proceso
    en paralelo.
- **Contenedores:** `php` y `migrate` corren como `www-data` y con disco de sólo lectura. Lo
  que necesite escribir va a un tmpfs declarado en `compose.yaml`.
