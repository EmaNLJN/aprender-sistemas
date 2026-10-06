# Contrato de consola y operación de C4

**Input**: [spec.md](../spec.md) (FR-001 a FR-003, FR-011, FR-030 a FR-045), [research.md](../research.md) (R1, R3, R12, R13, R15 a R18 y R20) y [data-model.md](../data-model.md). Lo usan quien opera y despliega el taller y los dueños del plan: los nombres de archivos, de servicios y de variables de acá son las interfaces entre ellos. Los mensajes al operador van en español; el código y las pruebas, en inglés. Todo sh es POSIX y portable entre Linux y macOS, salvo lo que dice «Linux».

## `public.sh`

`sh docker/public.sh <comando>`, desde la raíz. Es la única forma documentada de operar el modo público. Exporta `COMPOSE_PROJECT_NAME=taller-publico`, `COMPOSE_FILE=compose.yaml:docker/compose.public.yaml` y las variables `TALLER_*` de [data-model.md](../data-model.md), y lee el archivo de `TALLER_ENV_FILE` (por omisión, `.env`; el último valor de cada clave, sin las comillas que rodeen el valor). `deploy` corre el script de `TALLER_DEPLOY_SCRIPT` (por omisión, `backend/api/scripts/deploy.sh`). Las dos variables existen para que `qa/public-script-check.ts` pruebe el script en `npm test`, donde ni `.env` ni `backend/api/` están en el contexto de la imagen web, sin tocar el `.env` real. Antes de cualquier comando que levante algo, falla con el código 64 y un mensaje que dice qué falta si no están `TALLER_DOMAIN`, `ACME_CONTACT`, `ACME_ACCEPT_TOS=yes`, `BACKUP_AGE_RECIPIENTS` (cada uno con la forma `age1…`) o las cinco obligatorias del destino.

| Comando | Qué hace |
| --- | --- |
| `config` | Valida y muestra `docker compose config` del modo público. Es lo que lee la prueba de puertos |
| `up` | Valida y corre `docker compose up -d --wait` (la primera vez; para actualizar, `deploy`) |
| `deploy` | Marca el despliegue en el respaldo (`deploy-begin`), toma el volcado previo (`once --reason pre-deploy`), corre `backend/api/scripts/deploy.sh` y, al salir (también por un `trap`), quita la marca. Si el volcado previo falla, no migra |
| `down` | `docker compose down`, nunca con `-v` |
| `status` | El resumen de abajo |
| `backup` | `backup once --reason manual` |
| `grants` | `docker compose --profile ops run --rm db-grants` (las dos fases) |
| `logs [servicio]` | `docker compose logs --tail 200 [servicio]` |
| `restore-record <parte> <bytes> <segundos> <resultado>` | Agrega una línea con la fecha de hoy a `/state/restore-checks.log` de `backup-state` (`<parte>` es `completa` o `pitr`) |

**Códigos de salida:** 0 todo bien; 1 hay algo que atender; 2 no pudo consultar (el stack está caído); 64 configuración incompleta o comando desconocido.

### `public.sh status`

```text
Certificado: vence el 2026-12-01 (51 días). Emisor: Let's Encrypt. Desafío: http-01.
HSTS: max-age=300 (escalón 1 de 4).
Último respaldo: hace 5 h (2026-10-06T03:00:12Z, 21 MiB, 14 s, nocturno).
Última restauración probada: 2026-09-30 (completa, 41 s, ok).
Latido: configurado.
Fallos: ninguno.
```

El certificado se pide al puerto 443 del host con el nombre configurado (`openssl s_client`, sin salir a Internet). El respaldo sale de `/state/last-success.json` y `/state/last-failure.json` (`docker compose exec -T backup backup.sh status`). Sale con 1 si al certificado le quedan menos de 15 días, si el último respaldo tiene más de 36 horas, si hay un fallo sin resolver o si la última restauración tiene más de 40 días.

## `deploy.sh` con los roles (K)

El script de C3a conserva su forma; suma los pasos de los usuarios de MySQL. Es el mismo en los dos modos, y el modo público lo invoca por `public.sh deploy`.

```sh
docker compose build
docker compose up -d --wait mysql
# si falta `taller_migrate` (un volumen anterior a C4): docker compose --profile ops run --rm db-grants
docker compose run --rm migrate
docker compose run --rm --no-deps grants                 # los permisos de lo que migró
docker compose up -d --wait --no-deps mysql php taller scheduler   # más lo que sumen B2 y C3c
# si `taller` todavía existe: docker compose --profile ops run --rm db-grants   (lo borra si ya no tiene sesiones)
```

Los dos pasos de `db-grants` son condicionales: un despliegue normal no toca ninguna tabla de `taller` antes de migrar, y el escenario 3 de `deploy-check.sh` sigue viendo que es `migrate` el que se rinde ante el bloqueo. En un volumen nuevo, `taller_migrate` ya existe (lo creó el inicio de MySQL) y `taller` no.

## `grants` y `db-grants`

| | `grants` | `db-grants` |
| --- | --- | --- |
| Perfil | ninguno: está en la cadena de arranque | `ops` |
| Imagen | `mysql:9.7`, la que ya fija Compose | la misma |
| Qué corre | `apply-grants.sh --phase tables --host mysql` | `apply-grants.sh --phase all --host mysql` |
| `depends_on` | `mysql` sano y `migrate` terminado | `mysql` sano |
| Quién depende de él | `php`, `scheduler`, `worker-runs`, `worker-mail` | nadie |
| Entorno | `MYSQL_ROOT_PASSWORD` y las cinco contraseñas de rol | el mismo |
| Archivos | `docker/mysql/db-grants.sql` y `docker/mysql/apply-grants.sh`, de sólo lectura | los mismos |
| Redes | `app`, con `dns: ['127.0.0.1']` | las mismas |

### `docker/mysql/apply-grants.sh [--phase users|tables|all] [--host <nombre>]`

- Lee `docker/mysql/db-grants.sql`, que tiene dos secciones marcadas con las líneas `-- @phase users` y `-- @phase tables`, y marcadores de la forma `@@APP_DB_PASSWORD@@`, `@@RUNS_DB_PASSWORD@@`, `@@MAIL_DB_PASSWORD@@`, `@@MIGRATE_DB_PASSWORD@@` y `@@BACKUP_DB_PASSWORD@@`.
- Valida que cada contraseña cumpla `[A-Za-z0-9._~-]{24,128}` (las que genera `init-env.sh` cumplen), sustituye los marcadores de la fase pedida, antepone `SET SESSION sql_log_bin = 0;` y `SET SESSION lock_wait_timeout = 5;`, y entrega el SQL a `mysql -uroot` por la entrada estándar. Sin `--host`, usa el socket de la imagen (el inicio de un volumen nuevo).
- Sale con el estado de `mysql`; ante el primer error de SQL se detiene.
- `docker/mysql/10-db-grants.sh` (el que monta `mysql` en `/docker-entrypoint-initdb.d/`) corre `apply-grants.sh --phase users`.
- **La fase `users`:** `CREATE USER IF NOT EXISTS` y `ALTER USER … IDENTIFIED BY` de las cinco cuentas; los privilegios de base de `taller_migrate`; los globales y de base de `taller_backup`; el `SELECT` sobre `performance_schema.events_transactions_current` de `taller_migrate`.
- **La fase `tables`:** los permisos por tabla y por columna de la matriz para `taller_app`, `taller_runs` y `taller_mail`, y el retiro de `taller`: una sentencia preparada hace `DROP USER` sólo si existe y ninguna sesión suya sigue conectada.
- **Idempotente.** Se puede correr cuantas veces haga falta; sólo suma privilegios. Lo que se quite de la matriz se revoca con una línea explícita en el mismo cambio.
- **C3b y C3c** suman su usuario `taller_mail` y sus permisos a este mismo archivo con este mismo mecanismo.

## El entrypoint de `taller` en modo público

`docker/nginx/public/entrypoint.sh`, copiado a `/usr/local/bin/taller-public-entrypoint`. Hace, en orden:

1. Valida las variables de entorno (la tabla siguiente) y sale con un mensaje en español si alguna es inválida.
2. Renderiza las plantillas de `/usr/local/share/taller/nginx-public/` con `envsubst '${TALLER_DOMAIN} ${ACME_CONTACT} ${ACME_DIRECTORY_URL} ${ACME_CHALLENGE} ${ACME_PROFILE_LINE} ${ACME_TRUSTED_CA_LINE} ${HSTS_MAX_AGE}'` a `/etc/nginx/taller.d/` (un tmpfs montado ahí por el archivo público): `main.conf`, `http.conf` y `server.conf`, con la fuente del certificado que diga `TLS_SOURCE`. Con `--check` se detiene después de `nginx -t`.
3. Corre `nginx -t`.
4. `exec nginx -g 'daemon off;'`.

| Variable | Validación |
| --- | --- |
| `TALLER_DOMAIN` | `^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$` |
| `ACME_CONTACT` | un email (`^[^@[:space:]]+@[^@[:space:]]+$`) |
| `ACME_DIRECTORY_URL` | `^https://[^[:space:];{}]+$` |
| `ACME_CHALLENGE` | `http-01` o `tls-alpn-01` |
| `ACME_PROFILE` | vacía o `^[a-z0-9-]+$` |
| `ACME_TRUSTED_CA` | vacía o una ruta absoluta sin espacios ni `;` |
| `HSTS_MAX_AGE` | sólo dígitos |
| `TLS_SOURCE` | `acme` o `static`; con `static`, existen `/run/taller-tls/tls.crt` y `tls.key` |

Rutas dentro de la imagen: la configuración base, `/etc/nginx/nginx.conf`; las cabeceras, `/etc/nginx/taller/headers.conf`; las variantes locales de los tres archivos, `/etc/nginx/taller.d/`; el módulo, `/usr/lib/nginx/modules/ngx_http_acme_module.so`; el estado ACME, `/var/lib/taller/acme` (uid 101, modo 0700).

## `backup`: la imagen y el script

`docker/backup/Dockerfile` (contexto `docker/backup/`): `FROM mysql:9.7@sha256:…` con `age`, `rclone` y, si falta, `curl`. Se ejecuta como el usuario `mysql` (uid 999). `/spool` y `/state` se crean con ese dueño en la imagen, para que los volúmenes con nombre lo hereden.

### `backup.sh <subcomando>`

| Subcomando | Qué hace |
| --- | --- |
| `loop` | El comando del servicio: espera a `BACKUP_TIME` (UTC), corre `once --reason nightly`, reintenta a los 15 minutos hasta cuatro veces, y al arrancar corre uno de inmediato si no hay un éxito en las últimas 26 horas. Posterga mientras `/spool/.deploying` existe y tiene menos de 30 minutos |
| `once [--reason nightly\|pre-deploy\|manual]` | Una corrida completa (R15): candado, lugar en el spool, medida, volcado, estructura, libro, medida, manifiesto, tar, cifrado, subida, estado y latido. Antes intenta subir lo que haya en `/spool/pending/` |
| `once --drill` | El volcado sin cifrar del simulacro de recuperación (R18, parte b): con `--source-data=2` y todas las tablas, en `/spool/drill/`, sin subir nada y sin latido; lo borra `restore-check.sh --pitr` al terminar |
| `status` | Imprime lo de `/state` en una línea por dato, para `public.sh status` |
| `deploy-begin`, `deploy-end` | Crean y borran `/spool/.deploying`; `deploy-begin` espera hasta 15 minutos un volcado en curso |
| `probe-destination` | La prueba de V5 con las credenciales del host (abajo) |

**Códigos de salida:** 0 bien; 1 falló el volcado, el cifrado o la medida; 2 no se pudo subir (el cifrado queda en el spool); 3 el candado sigue ocupado después de la espera; 4 el spool no tiene lugar; 64 configuración inválida.

**Entorno:** `DB_HOST` (`mysql`), `DB_USER` (`taller_backup`), `DB_PASSWORD`, las `BACKUP_*` de [data-model.md](../data-model.md) y, para el destino, `RCLONE_CONFIG_DEST_*` armadas por el script a partir de `BACKUP_S3_*`. La contraseña de MySQL va a un archivo de opciones en el tmpfs (modo 600), no a la línea de comandos.

### `probe-destination`

Con la credencial del host, y sin tocar nada existente, escribe `probe/<al azar>` y dice, una línea por capacidad, `ok` o `FALLO`: **escribir** (tiene que funcionar), **leer**, **listar** y **borrar** (tienen que rechazarse) y **sobrescribir** el mismo nombre (tiene que aceptarse, y se pide al usuario que compruebe con la credencial de lectura que quedan dos versiones). Sale con 70 si algo no es como debe.

## `restore-check.sh`

`sh backend/api/scripts/restore-check.sh [--identity <archivo age>] [--remote-env <archivo>] [--object <nombre>] [--pitr] [--keep]`, desde la raíz, en una máquina con Docker. Usa su propio proyecto (`taller-restore-<fecha>`) y una base descartable (MySQL 9.7 con tmpfs, en una red propia), y nunca toca el proyecto `taller-publico`.

- **Parte (a), sin `--pitr`:** pide `--identity` (la clave privada) y `--remote-env` (variables `RESTORE_S3_*` con la credencial de lectura). Toma el objeto más nuevo (o `--object`), lo descifra, restaura `dump.sql.zst` y `structure.sql`, compara con `manifest.json` por la regla de [data-model.md](../data-model.md), corre `taller:reapply-deletions` con `ledger.tsv` si existe y mide el tiempo.
- **Parte (b), con `--pitr`:** en el host, sin clave. Pide un volcado sin cifrar a `backup once --drill`, genera 20 sesiones con `GET /api/session`, copia los archivos del binlog con `docker compose cp`, restaura el volcado, aplica el binlog con `mysqlbinlog` desde la posición del encabezado hasta la actual y exige que la tabla `sessions` restaurada tenga al menos 20 filas más que la del volcado y no más que la del origen.
- **Salida:** una línea `AAAA-MM-DD <completa|pitr> <bytes> <segundos> <ok|fallo>`; lo que se compara y no coincide va aparte. Sale con 0 si pasó; 1 si hay diferencias; 2 si no pudo bajar o descifrar; 3 si falló la restauración; 64 por uso inválido.

## Los checks

| Comando | Qué prueba | Docker | En `npm test` |
| --- | --- | --- | --- |
| `node qa/nginx-headers-check.ts` | Toda ubicación de `docker/nginx/` con una `add_header` incluye `headers.conf`, y el archivo lleva las seis cabeceras con los valores de FR-013 | no | sí |
| `node qa/csp-guard-check.ts` | `dist/index.html` y el código propio de las vistas sin lo que la política bloquea (FR-017, FR-019) | no | sí |
| `node qa/nginx-public-check.ts` | Las plantillas públicas de Nginx renderizadas con valores de ejemplo y `validate.sh` (R3, R6) | no | sí |
| `node qa/apply-grants-check.ts` | `apply-grants.sh` con un `mysql` falso: fases, sustitución, validación y el SQL que recibe | no | sí |
| `node qa/public-script-check.ts` | `public.sh` con un `docker` falso: validación, proyecto, `deploy`, `down` y `status` | no | sí |
| `sh backend/api/scripts/compose-check.sh` | La configuración efectiva de Compose en los dos modos (puertos, roles, `grants`, logging, proyecto); la corre `public:check` | sí | no |
| `node qa/build-check.ts` | El contrato del build en varios archivos (FR-020) | no | sí |
| `npm run api:grants:check` | La matriz de MySQL con los usuarios reales (FR-033) | sí | no |
| `npm run public:check` | Puertos, cabeceras por clase, redirección, nombre único, cookies, cierre por CSRF, IP real, límites y TLS contra el stack público con un certificado de prueba (FR-043) | sí | no |
| `npm run public:acme-check` | La emisión y la renovación con Pebble, con los dos desafíos (FR-008, FR-010) | sí | no |
| `npm run public:backup-check` | El respaldo de punta a punta contra un S3 local, la restauración (a), el simulacro (b) y la exclusión con el despliegue en los dos órdenes (FR-034 a FR-042) | sí | no |

Los cuatro con Docker corren en el job `public` de la CI. Ninguno corre en el `docker build` de la web, que ejecuta `npm test` sin Docker.
