# Modelo de datos y configuración: C4 · Exposición

**Input**: [spec.md](./spec.md), [research.md](./research.md) (R1, R4, R5, R11 a R17 y R19 a R21) y los contratos: [contracts/http.md](./contracts/http.md) y [contracts/console.md](./contracts/console.md). C4 no crea tablas ni migraciones: este archivo describe lo que sí tiene forma de dato, que es la configuración, los privilegios de MySQL y el conjunto de respaldo. Los nombres de variables son el contrato entre los dueños del plan.

## Entidades

| Entidad | Qué es | Dónde vive |
| --- | --- | --- |
| Dominio público | El nombre con el que el taller responde, de `TALLER_DOMAIN` | `.env`; de él salen `APP_URL`, el certificado y la redirección |
| Modo público y local | El local es el de hoy; el público lo agrega `docker/compose.public.yaml` | Compose; el nombre del proyecto público es `taller-publico` |
| Certificado y cuenta ACME | Lo que obtiene y renueva el módulo | Volumen `acme-state`, en `/var/lib/taller/acme` |
| Escalón de HSTS | El `max-age` vigente | `HSTS_MAX_AGE` |
| Usuario de MySQL | Una cuenta por rol, con su lista de permisos | MySQL; la lista, en `docker/mysql/db-grants.sql` y en la matriz de abajo |
| Conjunto de respaldo | Un objeto cifrado por noche con todo lo necesario para restaurar | El destino de objetos |
| Spool y estado del respaldo | Lo que aún no salió y el registro de lo que pasó | Volúmenes `backup-spool` y `backup-state` |
| Registro de restauraciones | Fecha, tamaño, tiempo y resultado de cada prueba | `backup-state`, por `public.sh restore-record` |

## 1. Configuración

### Las que pone el usuario en `.env` (modo público)

| Variable | Obligatoria | Por omisión | La usan | Notas |
| --- | --- | --- | --- | --- |
| `TALLER_DOMAIN` | sí | | `taller`, `public.sh` | Un nombre en minúsculas, sin esquema ni puerto (`[a-z0-9.-]`) |
| `ACME_CONTACT` | sí | | `taller` | Un email, para la cuenta ACME |
| `ACME_ACCEPT_TOS` | sí | | `taller`, `public.sh` | Tiene que valer `yes`: el consentimiento a los términos de la autoridad es explícito |
| `ACME_DIRECTORY_URL` | no | producción de Let's Encrypt (`https://acme-v02.api.letsencrypt.org/directory`) | `taller` | En G2, primero `https://acme-staging-v02.api.letsencrypt.org/directory` |
| `ACME_CHALLENGE` | no | `http-01` | `taller` | O `tls-alpn-01` (con `PUBLIC_HTTP_BIND=127.0.0.1`) |
| `ACME_PROFILE` | no | vacía (el de la autoridad) | `taller` | Por ejemplo `tlsserver` |
| `HSTS_MAX_AGE` | no | `300` | `taller` | Sólo los escalones de la sección 5 |
| `PUBLIC_HTTP_BIND` | no | `0.0.0.0` | Compose | Con TLS-ALPN-01, `127.0.0.1`: el 80 queda cerrado a la red |
| `TLS_SOURCE` | no | `acme` | `taller` | `static` sólo en las pruebas: el certificado se monta en `/run/taller-tls/{tls.crt,tls.key}` |
| `ACME_TRUSTED_CA` | no | vacía | `taller` | Ruta de una CA para hablar con el servidor ACME: sólo las pruebas con Pebble |
| `BACKUP_AGE_RECIPIENTS` | sí | | `backup` | Una o más claves públicas `age1…`, separadas por comas; se recomienda una de reserva |
| `BACKUP_S3_ENDPOINT` | sí | | `backup` | URL del almacenamiento compatible con S3 |
| `BACKUP_S3_REGION` | sí | | `backup` | |
| `BACKUP_S3_BUCKET` | sí | | `backup` | |
| `BACKUP_S3_PREFIX` | no | `taller` | `backup` | |
| `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` | sí | | `backup` | La credencial que sólo agrega objetos (la del host) |
| `BACKUP_TIME` | no | `03:00` | `backup` | UTC, `HH:MM` |
| `BACKUP_SPOOL_MAX_MIB` | no | `2048` | `backup` | Tope de lo que espera para salir |
| `BACKUP_HEARTBEAT_URL`, `BACKUP_HEARTBEAT_FAIL_URL` | no | | `backup` | Del monitor externo; la segunda es opcional |
| `LOG_MAX_SIZE`, `LOG_MAX_FILE` | no | `20m`, `10` | Compose | Rotación de los registros de Docker (R21) |

### Las que genera `init-env.sh` (secretos, sin reemplazar las que ya existen)

`APP_DB_PASSWORD`, `RUNS_DB_PASSWORD`, `MAIL_DB_PASSWORD`, `MIGRATE_DB_PASSWORD` y `BACKUP_DB_PASSWORD`: `openssl rand -hex 24` cada una, con una línea `add_missing` al final del script. Dejan de usarse `MYSQL_PASSWORD` (el usuario `taller` ya no se crea) y, por tanto, de generarse.

### Las que `public.sh` calcula y exporta

| Variable | Local (por omisión de la base) | Público | Llega a |
| --- | --- | --- | --- |
| `TALLER_APP_URL` | `http://localhost:${TALLER_PORT:-8080}` | `https://<dominio>` | `APP_URL` de cada servicio de Laravel |
| `TALLER_SESSION_COOKIE` | `taller-session` | `__Host-taller-session` | `SESSION_COOKIE` |
| `TALLER_SESSION_SECURE` | `false` | `true` | `SESSION_SECURE_COOKIE` |
| `TALLER_DEVICE_COOKIE` | `taller-device` | `__Host-taller-device` | `DEVICE_COOKIE_NAME` |
| `TALLER_DEVICE_SECURE` | `false` | `true` | `DEVICE_COOKIE_SECURE` |

## 2. Servicios, redes, volúmenes y puertos

### Lo que cambia en la base (`docker/compose.yaml`), para los dos modos

| Servicio | Cambio |
| --- | --- |
| `mysql` | Sin `MYSQL_USER` ni `MYSQL_PASSWORD`; con las cinco contraseñas de rol en el entorno; monta `docker/mysql/10-db-grants.sh` en `/docker-entrypoint-initdb.d/` en lugar de `10-db-grants.sql`; el comando suma `--binlog-expire-logs-seconds=604800` y `--binlog-row-image=MINIMAL` |
| `php`, `scheduler` | `DB_USERNAME=taller_app`, `DB_PASSWORD=${APP_DB_PASSWORD}`; dependen de `grants` en lugar de `migrate` |
| `migrate` | `DB_USERNAME=taller_migrate`, `DB_PASSWORD=${MIGRATE_DB_PASSWORD}` |
| `worker-runs` (B2) | `DB_USERNAME=taller_runs`, `DB_PASSWORD=${RUNS_DB_PASSWORD}`; depende de `grants` |
| `worker-mail` (C3c) | `DB_USERNAME=taller_mail`, `DB_PASSWORD=${MAIL_DB_PASSWORD}`; depende de `grants` |
| `grants` (nuevo) | La fase `tables` de `apply-grants.sh` con root, después de `migrate`; sin perfil; `restart: 'no'` |
| `db-grants` | Sigue en el perfil `ops`; corre las dos fases; comparte con `grants` un ancla |
| Todos los de Laravel | Las cookies y `APP_URL` salen de las variables `TALLER_*` de la sección 1, con su valor local por omisión |

### El archivo público (`docker/compose.public.yaml`)

| Recurso | Qué lleva |
| --- | --- |
| `name` | `taller-publico` (el script además pasa `-p`) |
| `taller` | `entrypoint` propio; `ports: !override` con `${PUBLIC_HTTP_BIND:-0.0.0.0}:80:8080` y `0.0.0.0:443:8443`; `dns: !reset []`; el volumen `acme-state`; el tmpfs `/etc/nginx/taller.d`; las variables de la sección 1; el `healthcheck` en `127.0.0.1:8081`; `logging` |
| `backup` (nuevo) | Imagen construida de `docker/backup/`; usuario no root; sin puertos; `read_only`; `cap_drop: ALL`; redes `app` y `backup-out`; los volúmenes `backup-spool` y `backup-state`; `restart: unless-stopped` |
| Los demás servicios | Sólo `logging` |
| Redes | `backup-out`, con salida a Internet, usada sólo por `backup` |
| Volúmenes | `acme-state`, `backup-spool`, `backup-state` (en el proyecto `taller-publico`: `taller-publico_acme-state`, …) |

Puertos del modo público: en el host, 80 y 443 de `taller`; ningún otro servicio publica. Dentro del contenedor `taller`: 8080 (el desafío y la redirección), 8443 (HTTPS) y `127.0.0.1:8081` (salud, sin publicar).

### Los archivos de prueba

`docker/compose.public-test.yaml` (certificado estático, un S3 local con `rclone serve s3`, puertos en `127.0.0.1:18080` y `18443`, y un nombre de proyecto único por corrida) y `docker/compose.acme-test.yaml` (Pebble). Los usan los checks; no son una forma de desplegar.

## 3. Usuarios de MySQL y matriz de privilegios

Cuentas con host `%`. Abreviaturas: **S**ELECT, **I**NSERT, **U**PDATE, **D**ELETE. «—» es sin acceso. La lista es el piso de FR-031: V4 y las pruebas de punta a punta de A3, B2 y D1 la confirman, y quien suma una tabla la suma acá.

### Globales y de base

| Cuenta | Globales | Sobre `taller.*` | Otros |
| --- | --- | --- | --- |
| `root` | todo | todo | sólo `db-grants`, `grants` y la inicialización de la imagen |
| `taller_migrate` | — | SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES | `SELECT` sobre `performance_schema.events_transactions_current`. Sin `GRANT OPTION`, `LOCK TABLES`, `TRIGGER`, `EVENT`, vistas ni rutinas |
| `taller_backup` | `RELOAD`, `REPLICATION CLIENT` | SELECT, SHOW VIEW | Sin `TRIGGER`, `EVENT`, `PROCESS` ni `SHOW_ROUTINE` (R14) |
| `taller_app`, `taller_runs`, `taller_mail` | — | nada a nivel base: sólo lo de la tabla siguiente | |

### Por tabla (los tres roles de aplicación)

| Clase | Tabla | `taller_app` | `taller_runs` | `taller_mail` | `taller_backup` |
| --- | --- | --- | --- | --- | --- |
| Contenido (22 de C2 y B2) | `languages`, `catalogs`, `content_imports`, `topics`, `workshops`, `exercises`, `exercise_grading_versions`, `exercise_tests`, `exercise_hints`, `workshop_objectives`, `workshop_steps`, `workshop_related_exercises`, `worlds`, `world_exercises`, `atlas_concepts`, `guide_resources`, `guide_sources`, `guide_tracks`, `guide_modules`, `guide_steps`, `guide_step_resources`, `harness_templates` | S | S sobre `exercises`, `exercise_tests`, `exercise_grading_versions`, `harness_templates`; el resto, — | — | S |
| Identidad (C3a) | `users` | S, I, U, D | S (`FOR SHARE`) | — | S |
| | `invitations` | S, I, U, D | — | `SELECT (id)` y `UPDATE (sent_at, send_failed_at)` | S |
| | `password_reset_tokens` | S, I, U, D | — | — | S |
| | `account_deletions` (C3b) | S, I, D | — | — | S |
| Progreso y ejecuciones (B2) | `progress_heads` | S, I, U | S, U | — | S |
| | `exercise_progress` | S, I, U, D | S, I, U | — | S |
| | `runs` | S, I, U, D | S, U | — | S |
| | `attempts` | S, D | S, I | — | S |
| | `attempt_tests` | S, D | S, I | — | S |
| | `attempt_payloads` | S, U, D | S, I | — | S |
| Progreso de D1 | `sync_operations`, `progress_imports`, `drafts`, `campaign_seals`, `campaign_checkpoints`, `workshop_progress`, `workshop_observations`, `workshop_step_marks`, `route_marks`, `route_quiz_answers`, `route_notes`, `preferences` | S, I, U, D | — salvo lo que D1 pida | — | S |
| Operación | `sessions`, `cache_locks` | S, I, U, D | — | — | S (el volcado toma sólo la estructura) |
| | `cache` | S, I, U, D | S (la señal de reinicio de `queue:work`) | — | S (sólo la estructura) |
| | `jobs` | S, I, U, D | S, I, U, D (la cola `runs`) | — | S (sólo la estructura) |
| | `failed_jobs` | S, I, D | I | S, I, U, D | S (sólo la estructura) |
| | `mail_jobs` (C3c) | I | — | S, I, U, D | S (sólo la estructura) |
| Sólo `migrate` | `migrations`, `job_batches` | — | — | — | S |

Reglas para lo que sumen D1, C3b, C3c y C5:
- Una tabla de contenido: S para `app` y `backup`, y escribe sólo `migrate`.
- Una tabla con `user_id`: DML completo para `app`; `runs`, `mail` y `backup` sólo si el ítem lo justifica, y la fila va a la matriz en el mismo cambio.
- Una tabla de la cola o del framework: DML para quien la usa; `backup` sólo la estructura.
- Un privilegio que se agrega sin tocar la matriz hace fallar la prueba; una tabla de `information_schema` que la matriz no nombra, también.

### La prueba de la matriz

`qa/api-grants-check.ts`, contra un stack con `mysql` real (el local sirve, porque los roles rigen en los dos modos): con las contraseñas de `.env`, para cada rol, tabla y operación genera sondas sin efectos (`SELECT … LIMIT 0`; `UPDATE … SET c = c WHERE 1 = 0`; `DELETE … WHERE 1 = 0`; `INSERT … SELECT … WHERE 1 = 0`) y exige éxito sólo donde la matriz lo concede, y el error 1142, 1143 o 1044 donde no. Además: un DDL, un `GRANT`, `FILE` y `mysql.*` fallan para cada rol; `SHOW GRANTS` de cada cuenta coincide con la matriz; el esquema `taller` no tiene triggers, rutinas ni eventos; y todas las tablas de `information_schema` están en la matriz. La matriz es un dato, `qa/fixtures/mysql-roles.json`, escrito a mano desde esta tabla y no desde las sentencias de `db-grants.sql`:

```json
{
  "database": "taller",
  "roles": {
    "taller_app": { "tables": { "users": ["SELECT", "INSERT", "UPDATE", "DELETE"], "exercises": ["SELECT"] } },
    "taller_mail": { "tables": { "mail_jobs": ["SELECT", "INSERT", "UPDATE", "DELETE"] }, "columns": { "invitations": { "SELECT": ["id"], "UPDATE": ["sent_at", "send_failed_at"] } } }
  },
  "global": { "taller_backup": ["RELOAD", "REPLICATION CLIENT"] },
  "tablesWithoutAccess": ["migrations", "job_batches"]
}
```

### El usuario `taller` de hoy

Existe sólo en los volúmenes anteriores a C4. La última pasada de `db-grants` de un despliegue lo borra, con todos sus privilegios, cuando ninguna sesión suya sigue conectada (R13), y la prueba comprueba que ya no existe.

## 4. El conjunto de respaldo

### El objeto en el destino

`<BACKUP_S3_PREFIX>/AAAA-MM/taller-AAAAMMDDTHHMMSSZ-<8 hex>.tar.age`, cifrado con `age` para cada clave de `BACKUP_AGE_RECIPIENTS`. Adentro, un tar con:

| Miembro | Qué es |
| --- | --- |
| `dump.sql.zst` | El volcado lógico y consistente de `taller` sin las tablas efímeras, comprimido con `zstd`, con `--single-transaction --source-data=2 --no-tablespaces --skip-triggers --hex-blob`. Su encabezado trae el comentario `CHANGE REPLICATION SOURCE TO SOURCE_LOG_FILE=…, SOURCE_LOG_POS=…` |
| `structure.sql` | Sólo la estructura de `sessions`, `cache`, `cache_locks`, `jobs`, `mail_jobs` y `failed_jobs` |
| `ledger.tsv` | El libro de supresiones, con el encabezado `user_id`, `user_created_at`, `deleted_at` y las fechas en UTC. Falta si `account_deletions` no existe |
| `manifest.json` | El de abajo |

### `manifest.json`

```json
{
  "format": 1,
  "createdAt": "2026-10-06T03:00:12Z",
  "server": "9.7.2",
  "database": "taller",
  "reason": "nightly",
  "binlog": { "file": "binlog.000123", "position": 4567 },
  "measuredAt": { "before": "2026-10-06T03:00:10Z", "after": "2026-10-06T03:00:12Z" },
  "tables": {
    "users": { "rows": { "before": 12, "after": 12 }, "checksum": { "before": 2193834017, "after": 2193834017 } },
    "exercises": { "rows": { "before": 274, "after": 274 } }
  },
  "ledger": { "present": true, "rows": 3 }
}
```

`rows` está en todas las tablas del volcado; `checksum` (`CHECKSUM TABLE`), sólo en las de `docker/backup/verified-tables.txt`, que son las de cuentas, progreso e intentos (`users`, `invitations`, `progress_heads`, `exercise_progress`, `attempts`, `attempt_tests`, `account_deletions`, y las de D1 cuando existan). Una prueba exige que toda tabla de la clase «identidad» o «progreso» de la matriz esté en esa lista o en una lista explícita de excluidas.

**La regla de comparación en la restauración**, para cada tabla: si `before` y `after` coinciden (conteo y huella), la tabla restaurada tiene que ser idéntica; si difieren y la tabla es sólo de agregados (`attempts`, `attempt_tests`, `account_deletions`), el conteo restaurado está entre los dos; si difieren y es mutable, el resultado es «no concluyente» y se informa sin fallar.

### El estado local

| Archivo | Lo escribe | Contenido |
| --- | --- | --- |
| `/state/last-success.json` | `backup once`, después de subir | `{"at","reason","object","bytes","seconds","manifestSha256"}` |
| `/state/last-failure.json` | `backup once`, ante un fallo | `{"at","reason","stage","message"}`; se borra con el siguiente éxito |
| `/state/restore-checks.log` | `public.sh restore-record` | Una línea por prueba: `AAAA-MM-DD <parte> <bytes> <segundos> <resultado>` |
| `/spool/.lock` | `backup once`, con `flock` | |
| `/spool/.deploying` | `backup deploy-begin` | Vale 30 minutos desde su fecha de modificación |
| `/spool/work/` | `backup once` | Lo que está armándose; se vacía al terminar o al fallar |
| `/spool/pending/<nombre>.tar.age` | `backup once` | Lo cifrado que todavía no salió |

## 5. Estados

### El certificado

`sin certificado` (volumen vacío: el 8443 rechaza el apretón de manos y no entrega uno autofirmado) → `emitido` → `renovando` (a los dos tercios de su vida o cuando la autoridad lo indica por ARI, o a la mitad en los de vida corta) → `emitido`. Una renovación que falla queda en el registro de errores de Nginx (`acme:` y la causa) y el certificado vigente sigue sirviendo hasta vencer; si vence con HSTS largo, el taller es inaccesible sin salida para el alumno (R22, FR-014).

### La rampa de HSTS (FR-014)

| Escalón | `HSTS_MAX_AGE` | Se sube cuando |
| --- | --- | --- |
| 1 | `300` (cinco minutos) | Al abrir (G2) |
| 2 | `86400` (un día) | El recorrido con la CSP en un navegador real da 0 violaciones |
| 3 | `604800` (una semana) | Una renovación forzada pasó sin cortes |
| 4 | `31536000` (un año) | Pasó la primera renovación natural en producción |

Se baja de escalón ante cualquier problema de certificado. Sin `preload` ni `includeSubDomains`.

### Una corrida del respaldo

`espera` → `volcando` → `cifrando` → `subiendo` → `hecho` (borra la copia local, escribe `last-success.json` y manda el latido). Un fallo en cualquier etapa escribe `last-failure.json`, deja el cifrado en `/spool/pending/` si ya existía y vuelve a `espera`; el bucle reintenta a los 15 minutos, hasta cuatro veces. `postergado` si `/spool/.deploying` existe y es reciente.

## 6. Retención

| Qué | Cuánto | Quién lo aplica |
| --- | --- | --- |
| Respaldos en el destino | 35 días (actuales y anteriores) | El destino, por antigüedad |
| Copia local de lo que no salió | Hasta que sube; tope de `BACKUP_SPOOL_MAX_MIB` | `backup` |
| Binlog | 7 días (`604800` segundos), en el host | MySQL |
| Libro de supresiones | 35 días en la tabla (C3b); una copia por respaldo | C3b y `backup` |
| Registros de Docker | 20 MiB por 10 archivos por servicio, medido hasta unos 14 días | Docker |
| Certificado, cuenta ACME y claves | Mientras dure el volumen `acme-state`; no entran en Git ni en la imagen | El módulo ACME |
| Registro de restauraciones | Sin vencimiento: es un historial | `backup-state` |
