# Research: C4 · Exposición

**Input**: [spec.md](./spec.md) con su clarify del 2026-10-06, el ADR 0004 §1, el ADR 0006, el código de C3a (rama `feat/c3a-identidad`, PR #24) y los planes de A2 y B2 y la spec de C3b/C3c (ramas hermanas). Cada decisión dice qué se eligió, por qué y qué se descartó. Las que la spec no fija y el plan completó están en la primera tabla, para que el coordinador las vea juntas.

**Actualización del 2026-10-28.** El plan se escribió el 2026-10-06, antes de que cambiaran sus dependencias. Esta actualización parte de `master` en `431c9d90` y de los planes mergeados de A3, B3, C3c, F11a y F12a. Las decisiones nuevas o corregidas son R25 a R31, y las de R2, R7, R10 a R13, R22 y R24 se corrigieron en su lugar. La tabla de Context7 y las mediciones de sólo lectura están al final.

Las referencias «R1» a «R31» son secciones de este archivo. Los requisitos del ADR 0006 se citan como «§9» o «D37». «G1» y «G2» son los dos tramos de la compuerta de salida (R22).

## Cómo se verificó

- **Qué se leyó.** De C3a, en su rama: `docker/compose.yaml`, `docker/nginx/nginx.conf`, `docker/mysql/db-grants.sql`, `backend/api/config/{taller,session}.php`, `backend/api/bootstrap/app.php`, `backend/api/routes/api/`, `backend/api/scripts/{init-env,deploy,smoke,deploy-check}.sh`, `backend/api/docker/migrate.sh`, `frontend/Dockerfile`, `.dockerignore` y `.gitignore`, más su plan, su `contracts/` y el ledger del coordinador (el hallazgo del cierre de sesión por CSRF). De A2 y B2, sus planes (`built-page.ts`, `curriculumMarkers()`, la ubicación `/api/runs`, `RUNS_DB_USERNAME`). De C3b/C3c, su spec. De `master`, `frontend/vite.config.ts`, `qa/build-check.ts`, `qa/run-checks.ts`, `docker/compose.preview.yaml` y los ADR 0004, 0006 y 0007.
- **Documentación oficial y fuentes**, leídas el 2026-10-06 con `WebFetch` y `curl` (Context7 no está disponible en este perfil):
  - nginx-acme (README y CHANGELOG), `ngx_http_sub_module` y la guía TLS 6.0 de Mozilla (su JSON);
  - Let's Encrypt (perfiles, límites, fin de OCSP);
  - Vite (`html.cspNonce`), y el código de `PreventRequestForgery` de Laravel 13 (`raw.githubusercontent.com`);
  - Docker Compose (nombre del proyecto, fusión de archivos, interpolación, `include`) y Docker (publicación de puertos);
  - MySQL 9.7: `mysqldump`, `GRANT`, privilegios, `SHOW BINARY LOG STATUS` y lecturas con bloqueo;
  - el Dockerfile `9.7/Dockerfile.oracle` de docker-library/mysql.
- **Metadatos de descargas**, sin bajar nada: la API de GitHub (`age`, Pebble), la de Docker Hub (`rclone`, lego, certbot, `mysql`), el registro de GHCR (Pebble), el listado del repositorio Alpine de nginx.org y `pkgs.alpinelinux.org`.
- **El código propio del front**, en el `node_modules` ya instalado del checkout principal: `@codemirror/view` 6.43.13 asigna `style.cssText` en el espaciador de la numeración de líneas (línea 11681) y define `EditorView.cspNonce` (línea 9012); los seis sitios de estilo en línea del código propio siguen donde dice la spec.
- **El 2026-10-28**, para la actualización, se leyeron en `master` (`431c9d90`) `docker/nginx/nginx.conf` (cuatro bloques de `/api/`), `docker/compose.yaml`, `compose.yaml` de la raíz (un `include` de `docker/compose.yaml`), `docker/compose.preview.yaml`, `docker/mysql/db-grants.sql`, `backend/api/scripts/{deploy,deploy-check,smoke,check-account,init-env}.sh`, `backend/api/phpunit.xml`, las migraciones, `qa/build-check.ts`, `qa/lib/built-page.ts`, `qa/lib/api-account.ts`, `qa/e2e/playwright.config.ts`, `frontend/vite.config.ts` y `frontend/src/app/boot/legacy-views.ts`; los planes de A3, B3, C3c, F11a y F12a y las specs de A4, F11 y F12; `vite-plugin-singlefile` 2.3.3 y los tipos de Rolldown 1.2.12 en el `node_modules` del checkout principal; y, sólo para leer, `impl-f5` (`efaf39b2`, `frontend/src/pages/systems/ui/SceneView.tsx`), `impl-f7a` (`fc88d450`, `frontend/lab.js`) e `impl-b3` (`72574433`). Esta vez Context7 estuvo disponible (tabla al final).
- **No se ejecutó nada.** Ni Docker, ni el build, ni un navegador, ni se descargó nada: la tarea era sólo de planificación. Todo lo que figura como configuración, script o SQL en el [plan](./plan.md) es referencia, y las verificaciones V1 a V5 de abajo lo prueban antes de construir.

## Decisiones del plan que la spec no fija

| # | Decisión | Dónde |
| --- | --- | --- |
| 1 | Lo público es `docker/compose.public.yaml` más un script, `public.sh`, con su proyecto `taller-publico`; la base de Compose se parametriza con valores locales por omisión | R1, R11 |
| 2 | El modo local y el público comparten un solo `nginx.conf`, con tres archivos incluidos por modo; las plantillas públicas las renderiza un entrypoint propio a un tmpfs | R2, R3 |
| 3 | Dentro del contenedor Nginx escucha en 8080 (HTTP), 8443 (HTTPS) y `127.0.0.1:8081` (salud); el host publica 80 y 443 en IPv4 explícito, y con TLS-ALPN-01 el 80 queda en `127.0.0.1` | R4 |
| 4 | El módulo ACME se extrae del paquete de nginx.org en una etapa de build, no se instala con `apk`; certificado ECDSA P-256; los términos de Let's Encrypt se aceptan por configuración explícita | R5 |
| 5 | TLS sigue la guía 6.0 de Mozilla, sin grapado OCSP | R6 |
| 6 | Las seis cabeceras viven en un archivo (`headers.conf`) que incluye cada contexto que define cabeceras; HSTS sale de un `map` por esquema | R7 |
| 7 | El nonce de la CSP es `$request_id`, se inyecta con `sub_filter` y la respuesta de `/` no lleva validadores | R8 |
| 8 | El cierre de sesión por CSRF lo cierra Nginx, con 419 `csrf_token_mismatch`, ante `Sec-Fetch-Site` de otro sitio | R9 |
| 9 | Límites de conexión de 300 por IP, tiempos de 10 y 20 segundos y 1 024 conexiones por proceso | R10 |
| 10 | `XSRF-TOKEN` y «recordarme» llevan `Secure` y no el prefijo `__Host-` | R11 |
| 11 | Los usuarios de MySQL se llaman `taller_<rol>` y rigen en los dos modos; sus permisos sobre tablas se conceden en una segunda fase, después de `migrate` | R12 |
| 12 | Un servicio `grants` (con root, en la cadena de arranque) hace la fase de tablas; `db-grants` (perfil `ops`) sigue siendo el comando manual de C3a | R12 |
| 13 | Las contraseñas entran al SQL por marcadores que un script sustituye, y cada corrida las vuelve a fijar | R13 |
| 14 | `taller_backup` no lleva `TRIGGER`, `EVENT` ni `PROCESS`: el volcado omite triggers y tablespaces, y una prueba exige que el esquema no tenga triggers, rutinas ni eventos | R14 |
| 15 | El respaldo es un solo objeto por noche: un tar con el volcado, la estructura de las tablas efímeras, el libro de supresiones y un manifiesto, cifrado con `age` | R15 |
| 16 | El manifiesto toma conteos y huellas antes y después del volcado, y la restauración compara con ese intervalo | R15 |
| 17 | El destino es cualquier almacenamiento compatible con S3, con una credencial de sólo `PutObject`, versiones y expiración a 35 días | R16 |
| 18 | El despliegue toma un volcado propio antes de migrar y marca el despliegue para que el volcado nocturno espere | R17 |
| 19 | La restauración se prueba en dos partes: la completa, fuera del host, y el simulacro de recuperación a un punto en el tiempo, en el host y sin la clave | R18 |
| 20 | El binlog (7 días, `MINIMAL`) se configura en la base de Compose, para los dos modos | R19 |
| 21 | El comando de estado sale con 0, 1 o 2, y el monitor externo vigila `/healthz` y el vencimiento | R20 |
| 22 | Rotación de registros de Docker de 20 MiB por 10 archivos por servicio, medida después de una semana | R21 |
| 23 | La compuerta se parte en G1 (antes de abrir) y G2 (al abrir), y la CI suma el job `public` | R22 |
| 24 | Se suma V5, la verificación del destino de los respaldos | V5 |
| 25 | Sin `vite-plugin-singlefile`, el build sigue con un solo módulo de JS y una sola hoja (`codeSplitting: false` y `cssCodeSplit: false`), y `BOOT_SIZE_LIMIT` sigue en 1 500 000 caracteres para el HTML más lo que enlaza | R25 |
| 26 | El arranque en frío de un aula de 40 desde una IP se mide en HTTP/1.1 y en HTTP/2, y la ráfaga de la zona `api` y `limit_conn` se fijan con esa medida, sin ningún 429; el techo de 1 200 y 1 600 lo aceptó el usuario el 2026-10-28 | R26 |
| 27 | La fase de los usuarios corre antes de `migrate` en la cadena de arranque (`grants-users`), y `grants` vuelve a la fase de las tablas | R27 |
| 28 | Un sexto rol, `taller_audit`, para la auditoría de B3 | R28 |
| 29 | El recorrido de la CSP corre contra el stack, con una configuración de Playwright aparte y las pantallas de F11 y de F12a | R29 |
| 30 | `connect-src` final es `'self'`; mientras A4 no entre, el check acepta los Playgrounds sólo si el cliente de Playgrounds todavía existe; G2 no espera a A4 (el usuario, 2026-10-28) | R30 |
| 31 | Qué espera cada tramo: la base a A3 y a C3; el recorrido y G1, a F11b y a F12a; G1, también a la auditoría de B3 | R31 |

## R1. Cómo se activa el modo público

**Decisión.** Un archivo de Compose que se suma al de hoy, `docker/compose.public.yaml`, y un script, `docker/public.sh`, que es la única forma documentada de usarlo. El script fija `-p taller-publico`, `-f compose.yaml -f docker/compose.public.yaml` y `--env-file .env`, y se niega a seguir, con un mensaje en español que dice qué falta, si falta `TALLER_DOMAIN`, `ACME_CONTACT`, `ACME_ACCEPT_TOS=yes`, `BACKUP_AGE_RECIPIENTS` o las credenciales del destino. El archivo repite la comprobación con `${VAR:?…}`, de modo que `docker compose config` también falla cerrado.

**Por qué.**
- Un perfil no puede excluir al servicio de hoy: `taller` sin perfil seguiría publicando `127.0.0.1:8080` junto a los puertos nuevos, y Compose no tiene perfiles exclusivos.
- `ports` se concatena al fusionar archivos (la documentación de fusión de Compose lo dice), así que el archivo público usa `ports: !override [...]` para reemplazar la lista de `taller`. Compose también permite `!reset` para quitar valores.
- El nombre del proyecto se resuelve así: la opción `-p`, después `COMPOSE_PROJECT_NAME` y después el `name:` del archivo. Con `-p` en el script, una variable suelta en la terminal no puede apuntar el despliegue público a otro proyecto, y un `docker compose down -v` desde otro worktree no toca los volúmenes `taller-publico_*` (FR-003).
- `APP_ENV` vale `production` también en la máquina local (D21), así que no puede decidir el modo.
- Las anclas YAML no cruzan archivos. Por eso la base se parametriza con valores locales por omisión (R11) y el archivo público no repite el entorno de cada servicio de Laravel: los servicios que sumen B2 (`worker-runs`) y C3c (`worker-mail`) toman los valores públicos sin una línea más.

**Alternativas descartadas.**
- Un perfil: no excluye lo local.
- Un segundo archivo de Compose completo: duplica unas 200 líneas que divergirían.
- Una variable que cambie Nginx por modo: dependería de `APP_ENV` o de una configuración que no falla cerrado.
- `include` con archivos de reemplazo: el resultado depende del orden de resolución y se lee peor que un `-f` explícito.

## R2. Un solo `nginx.conf` con tres puntos de inclusión

**Decisión.** `docker/nginx/nginx.conf` sigue siendo el archivo de los dos modos y conserva ahí todas las ubicaciones, incluidos los cuatro bloques de la API: `location ^~ /api/`, `location ^~ /api/runs` (B2), `location = /api/sync` (D1a) y `location = /api/progress/import` (D1b), que hoy repiten las mismas directivas salvo `client_max_body_size`. Lo que cambia por modo son tres archivos de `/etc/nginx/taller.d/`, que `nginx.conf` incluye en un punto fijo:

| Archivo | Dónde lo incluye `nginx.conf` | Local (en la imagen) | Público (renderizado) |
| --- | --- | --- | --- |
| `main.conf` | Al principio, en el contexto principal | Vacío | `load_module modules/ngx_http_acme_module.so;` |
| `http.conf` | En `http {}`, después de los mapas | `map $scheme $hsts_value { default ""; }` | El `map` de HSTS por esquema, `acme_shared_zone` y `acme_issuer`, los servidores por omisión, el del puerto 80 y el de salud |
| `server.conf` | Dentro del servidor de la aplicación | `listen 8080;` | `listen 8443 ssl; http2 on; server_name <dominio>;`, las directivas TLS y la fuente del certificado |

Las cabeceras de seguridad están en `docker/nginx/headers.conf` (R7), que `nginx.conf` incluye en el servidor y en cada ubicación que define cabeceras propias.

**Por qué.**
- El check de B2, `qa/nginx-api-blocks-check.ts`, extrae de `docker/nginx/nginx.conf` los bloques de `/api/` y exige que sus directivas sean las mismas y en el mismo orden. Moverlos a otro archivo lo rompería. Con la línea `include …/headers.conf;` en el mismo lugar de los cuatro bloques, el check sigue valiendo. T001 relee cuántos bloques compara hoy ese check.
- Los dos modos ejecutan las mismas ubicaciones: lo que se prueba en local, con el recorrido de la User Story 3, es lo que se sirve en público.
- El modo local sigue siendo un archivo estático, sin renderizado, como hoy.

**Alternativas descartadas.** Dos archivos completos (el bloque de `/api/` quedaría en tres copias con el de B2); mover las ubicaciones a un archivo incluido (rompe el check de B2); renderizar también el modo local (agrega un paso donde no hace falta).

## R3. Cómo entra el dominio a la configuración

**Decisión.** Un entrypoint propio, `docker/nginx/public/entrypoint.sh`, que en el modo público reemplaza al `ENTRYPOINT ["nginx"]` del Dockerfile. Valida las variables, renderiza las plantillas con `envsubst` a `/etc/nginx/taller.d/` (un tmpfs con el dueño de Nginx, montado por el archivo público), corre `nginx -t` y hace `exec nginx -g 'daemon off;'`.

- `envsubst` recibe una lista explícita de variables (`${TALLER_DOMAIN} ${ACME_CONTACT} ${ACME_DIRECTORY_URL} ${ACME_CHALLENGE} ${ACME_PROFILE_LINE} ${ACME_TRUSTED_CA_LINE} ${HSTS_MAX_AGE}`), así `$request_id` y las demás variables de Nginx quedan intactas.
- Cada variable se valida con una expresión regular antes de renderizar (el dominio, `[a-z0-9.-]`; el contacto, un email; el directorio, una URL `https://`; el desafío, `http-01` o `tls-alpn-01`; HSTS, sólo dígitos): lo que se escribe en la configuración no puede inyectar directivas.
- `ACME_PROFILE_LINE` y `ACME_TRUSTED_CA_LINE` las arma el script: `profile <nombre>;` si `ACME_PROFILE` no está vacía, y `ssl_trusted_certificate <ruta>;` si `ACME_TRUSTED_CA` no lo está (sólo las pruebas con Pebble); si no, nada.
- La redirección es `return 301 https://<dominio literal>$request_uri;`: FR-004 prohíbe armarla con `$host`.
- El archivo del modo local no cambia el `ENTRYPOINT`.

**Por qué.** La imagen se construye una vez y sirve a los dos modos, y el entrypoint de la imagen oficial no corre porque el Dockerfile lo reemplaza con `nginx`. El disco del contenedor es de sólo lectura, así que lo renderizado va a un tmpfs, igual que `/tmp`.

**Alternativas descartadas.** Las plantillas de la imagen oficial (hay que cambiar el entrypoint de todos modos y renderizan con todas las variables del entorno); renderizar en el host y montar el archivo (un artefacto generado que, si falta, hace que Docker monte un directorio y Nginx falle de una forma confusa); renderizar al construir (el dominio quedaría en la imagen).

## R4. Puertos, IPv4 y el desafío

**Decisión.**
- Dentro del contenedor: 8080 (HTTP: la aplicación en local; el desafío y la redirección en público), 8443 (HTTPS) y `127.0.0.1:8081` (salud, sólo público). Nginx corre sin privilegios y no puede abrir puertos menores que 1024.
- En el host, el archivo público publica `${PUBLIC_HTTP_BIND:-0.0.0.0}:80:8080` y `0.0.0.0:443:8443`. Con TLS-ALPN-01 el usuario fija `PUBLIC_HTTP_BIND=127.0.0.1`: el 80 deja de ser alcanzable desde afuera y la redirección sólo se ve desde el host.
- El `HEALTHCHECK` del Dockerfile consulta `127.0.0.1:8080/healthz`. En público el 8080 redirige, así que el archivo público lo reemplaza por `127.0.0.1:8081/healthz`, un servidor que no se publica.

**Por qué.** Según la documentación de Docker, sin una dirección de host un puerto se publica en todas las direcciones (`0.0.0.0` y `[::]`), y con una red IPv4 y el proxy de usuario por omisión, el puerto IPv6 del host se atiende hacia la dirección IPv4 del contenedor. El contenedor vería entonces la IP del puente y no la del cliente. El `0.0.0.0:` explícito evita ese camino (FR-001, FR-027). La documentación no dice qué IP ve el contenedor ni si Docker Desktop la cambia: lo comprueba V3, y para macOS queda declarado como límite.

**Descartado.** La red del host (rompe el aislamiento de redes de Compose) y publicar también en IPv6 (fuera de alcance).

## R5. El cliente ACME

**Decisión.** El módulo `nginx-acme`, en el Nginx del taller.

- **Qué hace el módulo 0.4.1** (README y CHANGELOG): `acme_issuer` con `uri`, `contact`, `challenge http-01 | tls-alpn-01` (por omisión `http-01`; TLS-ALPN-01 desde la 0.2.0), `profile <nombre> [require]` (0.3.0), `state_path`, `accept_terms_of_service`, `ssl_trusted_certificate` y `ssl_verify`; `acme_shared_zone`; `acme_certificate <emisor> [identificadores] [key=alg[:tamaño]]` dentro de un `server`; las variables `$acme_certificate` y `$acme_certificate_key`, con `ssl_certificate_cache max=2`. Renueva guiado por ARI desde la 0.4.0, que además adelanta la renovación de los certificados de vida corta a la mitad de su vida. Exige Nginx 1.22 o posterior y un `resolver` en `http`. El README pide «un listener en el puerto 80» para HTTP-01 y no dice nada de puertos internos distintos: V1 lo prueba con 8080 y 8443.
- **De dónde sale el `.so`.** El paquete `nginx-module-acme-1.30.5.0.4.1-r1.apk` (2 899 805 bytes) del repositorio Alpine v3.24 de nginx.org coincide con el Nginx 1.30.5 que fija `frontend/Dockerfile`. No se instala con `apk add` en la imagen final, porque depende del paquete `nginx` de nginx.org y traería un segundo Nginx que pisaría al de la imagen. Una etapa de build baja el paquete con `apk fetch` (con la clave de firma de nginx.org), extrae `usr/lib/nginx/modules/ngx_http_acme_module.so` y la imagen final copia sólo ese archivo. Un `RUN nginx -t` con una configuración mínima que lo carga hace que un desacople de versión falle al construir, no al arrancar.
- **Certificado.** ECDSA P-256 (`key=ecdsa:256`): más chico y rápido, y lo aceptan todos los clientes actuales. El perfil se deja al de la autoridad (`ACME_PROFILE` vacía), que sigue sola el calendario de Let's Encrypt de 64 días en 2027 y de 45 en 2028 (FR-007); quien quiera los 45 días ya puede pedir `tlsserver`.
- **Estado.** Un volumen, `acme-state`, montado en `/var/lib/taller/acme`. El directorio se crea en el Dockerfile con el dueño de Nginx (uid 101) y modo 0700: un volumen con nombre que se monta sobre un directorio de la imagen hereda su dueño al crearse, y uno que se monta sobre un directorio inexistente queda como root y Nginx no podría escribir. El disco del contenedor sigue siendo de sólo lectura.
- **Términos.** `accept_terms_of_service` sólo se rinde con `ACME_ACCEPT_TOS=yes` en `.env`: es un consentimiento de quien opera y no se asume.
- **DNS.** C3a le puso a `taller` `dns: ['127.0.0.1']`: no resuelve nada de Internet. El archivo público lo reabre con `dns: !reset []` sólo para `taller`, y el módulo usa el `resolver 127.0.0.11` que ya tiene `nginx.conf`.
- **Límites de la autoridad.** Cinco validaciones fallidas por hora y por identificador, y cinco certificados duplicados por semana (documentación de Let's Encrypt): Pebble primero, después el entorno de pruebas de la autoridad y recién después producción (FR-010, R22).
- **Si V1 falla.** La salida es la opción B de Q1: un servicio `acme` aparte con lego (o certbot), sólo en el archivo público, en una red con salida, con HTTP-01 por un volumen compartido que Nginx sirve desde `/.well-known/acme-challenge/` y un volumen `acme-certs` de sólo lectura para `taller`. `taller` toma el certificado nuevo con `nginx -s reload` desde un bucle chico dentro de su propio contenedor (no hace falta señalar a otro contenedor ni el socket de Docker). Cuesta una imagen, un contenedor y un programa que lo despierte.

**Alternativas descartadas por el usuario o por esta decisión.** DNS-01 (un token de la API del DNS con poder sobre la zona), Caddy como borde (reescribe lo que C3a diseñó sobre Nginx).

## R6. TLS

**Decisión.** La guía «intermediate» de Mozilla en su versión 6.0, tomada de su JSON el 2026-10-06:

- protocolos TLS 1.2 y 1.3;
- seis suites, `ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305`, sin DHE, así que no hace falta `ssl_dhparam`;
- `ssl_prefer_server_ciphers off`;
- curvas `X25519MLKEM768:X25519:prime256v1:secp384r1`. La primera pide OpenSSL 3.5 o posterior: si el Nginx de la imagen no la acepta, V1 lo ve y la lista queda sin ella;
- `ssl_session_timeout 1d`, `ssl_session_cache shared:SSL:10m` y `ssl_session_tickets off`;
- `http2 on;`.

**Desvío de la guía.** No se activa el grapado OCSP que la guía recomienda: Let's Encrypt dejó de poner la URL de OCSP en los certificados el 2025-05-07 y apagó sus respondedores el 2025-08-06, así que `ssl_stapling` no tendría de dónde tomar la respuesta.

**Cómo se comprueba** (sin descargas, con `openssl` y `curl` del host): `openssl s_client -tls1`, `-tls1_1` fallan; `-tls1_2` negocia una de las seis suites; `-tls1_3` negocia; `-no_ticket` no recibe ticket; `curl --http2 -I` informa `HTTP/2`.

**Alternativas descartadas.** Sólo TLS 1.3 (un aula puede tener navegadores viejos; se decide con datos), `testssl.sh` (22 MiB de descarga para algo que `openssl` cubre; queda como opcional).

## R7. Las cabeceras

**Decisión.** Un archivo, `docker/nginx/headers.conf`, con las seis cabeceras de FR-013:

```nginx
add_header Strict-Transport-Security $hsts_value always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'nonce-$request_id'; style-src-attr 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy no-referrer always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()" always;
add_header Cross-Origin-Opener-Policy same-origin always;
```

- La línea de arriba es la final (A4-Q2). Mientras A4 no esté en `master`, `connect-src` lleva además `https://play.rust-lang.org https://play.golang.org` (R30).
- `nginx.conf` lo incluye en el servidor y en **cada** ubicación que defina una `add_header` propia (los cuatro bloques de la API, la de `index.html`, la de los archivos con huella, `@too_many_requests` y `@csrf_rejected`). Una ubicación con cabeceras propias no hereda las del servidor, y por eso hoy `@too_many_requests`, que sólo repite `X-Content-Type-Options`, responde sin CSP ni `Referrer-Policy` (hallazgo para C3a y B2).
- `Strict-Transport-Security` sale de `$hsts_value`: el modo local lo define vacío y Nginx no envía una cabecera cuyo valor es la cadena vacía; el público lo define por esquema (`https` → `max-age=<HSTS_MAX_AGE>`). El escalón de HSTS es una variable (FR-014).
- Un check estático, `qa/nginx-headers-check.ts`, en `npm test`: toda ubicación, servidor o ubicación con nombre de `docker/nginx/` que contenga una `add_header` (fuera de `headers.conf`) incluye `headers.conf`, y el archivo tiene las seis cabeceras con los valores de FR-013, escritos a mano en el check.
- El check de punta a punta (`public-check.sh`) pide una URL de cada clase y compara cabecera por cabecera. Las clases son las 8 de SC-003 (el HTML, un archivo con huella, un 404 de Nginx, `/api/` con éxito, `/api/` con un 404 y con un 419 de Laravel, `/healthz` y el 301 del puerto 80) más las que FR-015 nombra y la spec no cuenta: el 413 (un cuerpo mayor que el tope de `/api/runs`), el 429, el 502 (sin `php`) y el 419 de Nginx del cierre de sesión por CSRF.
- Los archivos con huella llevan `Cache-Control: public, max-age=31536000, immutable`, y `index.html`, `no-cache` (FR-021). Las dos ubicaciones incluyen `headers.conf`.

**Alternativas descartadas.** Repetir las seis líneas en cada ubicación (como hace C3a con la CSP y dos cabeceras: se pierden al editar una) y un `map` por cabecera (una variable por línea, sin ganar nada).

## R8. El nonce de la CSP

**Decisión.**
- El nonce es `$request_id`: 16 bytes aleatorios en hexadecimal, distintos en cada pedido, y los caracteres de un nonce válido. La CSP lo lleva como `'nonce-$request_id'`, y el HTML, por reemplazo.
- Vite emite `nonce="__CSP_NONCE__"` en los `<script>`, `<link>` de estilos y de precarga y `<style>`, y agrega `<meta property="csp-nonce" nonce="__CSP_NONCE__">` (documentación de Vite, `html.cspNonce`). Nginx lo sustituye con `sub_filter '__CSP_NONCE__' '$request_id'; sub_filter_once off;` en la ubicación de `/index.html`, que es adonde el `index index.html;` redirige a `/`. Una variable en el texto de reemplazo está permitida.
- **Sin validadores.** `sub_filter` borra `Last-Modified` por omisión (lo dice su documentación) y, en el código, también `ETag`; el plan no lo da por sentado y fija `etag off;` en esa ubicación. Sin validadores, el navegador no puede revalidar con `If-None-Match` y recibir un 304 cuya CSP trae un nonce nuevo contra un cuerpo guardado con el viejo: cada carga baja el HTML (de uno o dos KiB) y su nonce es el de sus cabeceras. Es compatible con `Cache-Control: no-cache`.
- **El editor lee el nonce de `meta.nonce`** (la propiedad), porque el navegador oculta el valor del atributo en el DOM. `shared/lib/csp-nonce.ts` devuelve el nonce, o `undefined` si todavía es el marcador (en `npm run dev` y en la vista previa sin Nginx), y `mount-code-editor.ts` agrega `EditorView.cspNonce.of(nonce)` cuando existe.
- `ngx_http_sub_module` no se compila por omisión: V2 comprueba con `nginx -V` que la imagen lo tiene.
- Lo que el nonce cubre en el taller es el `<style>` que CodeMirror arma al montarse. Los scripts no lo necesitan: `script-src 'self'` no admite ninguno en línea.

**Alternativas descartadas.** Un hash del `<style>` de CodeMirror (el contenido cambia con cada versión del editor), `no-store` en `index.html` (FR-021 pide `no-cache`), un nonce generado en PHP (el HTML no pasa por PHP).

## R9. El cierre de sesión por CSRF

**El hallazgo** (prueba en navegador de C3a, Chrome 152): un POST de otro sitio no manda la cookie de sesión, por `SameSite=Lax`; Laravel abre una sesión nueva y responde 419 con su cookie; el navegador acepta esa cookie en una navegación de nivel superior y la cookie de la víctima queda desplazada. Un sitio ajeno cierra la sesión de alguien. Ni HTTPS ni `__Host-` lo cierran por sí solos.

**Decisión.** Nginx rechaza antes de PHP, en todo el servidor, un pedido que no sea `GET`, `HEAD` ni `OPTIONS` y declare `Sec-Fetch-Site: cross-site` o `same-site`, con `419` y el cuerpo `{"message":"La página venció: recargala e intentá de nuevo.","code":"csrf_token_mismatch"}`, que es el de Laravel (`lang/es/api.php`). El patrón es el del 429 de C3a:

```nginx
map "$request_method:$http_sec_fetch_site" $cross_site_write {
    default 0;
    ~^(POST|PUT|PATCH|DELETE):(cross-site|same-site)$ 1;
}
# server { ... }
if ($cross_site_write) { return 419; }
error_page 419 = @csrf_rejected;
location @csrf_rejected {
    default_type application/json;
    include /etc/nginx/taller/headers.conf;
    return 419 '{"message":"La página venció: recargala e intentá de nuevo.","code":"csrf_token_mismatch"}';
}
```

**Por qué en Nginx.** PHP no corre ni abre una sesión (una fila de `sessions`) por cada pedido hostil; no se toca el código de C3a; y es la misma política de «sólo el mismo origen» que ya aplica Laravel: `PreventRequestForgery` acepta `same-origin` y `same-site` sólo con `allowSameSite()`. Rechazar `same-site` es más estricto que Laravel, que aceptaría un `X-XSRF-TOKEN` válido desde otro origen del mismo sitio, y es lo que se quiere: la API la consume sólo este front, del mismo origen (R6 del ADR 0006).

**Límite declarado.** Un navegador que no manda `Sec-Fetch-Site` queda como hoy. Los navegadores actuales lo mandan por HTTPS y en `localhost`, y el hallazgo mismo se vio en `127.0.0.1`.

**Se comprueba** con un test del check de cabeceras (el mismo pedido con `Sec-Fetch-Site: cross-site` da 419 sin `Set-Cookie`, y con `same-origin` sigue por el camino normal) y con la repetición del escenario del hallazgo en un navegador real (`localhost:8095` → `127.0.0.1:8094` en el recorrido de C3a): la respuesta no trae `Set-Cookie` y la sesión de la víctima sigue abierta.

**Alternativas descartadas.** Un middleware de Laravel antes de `StartSession` (duplica la regla en PHP y toca C3a) y dejarlo como límite aceptado (cualquier sitio ajeno puede cerrarle la sesión a un alumno; bajo costo de cerrarlo).

## R10. IP real, límites de conexión y tiempos

**IP real.** No hay nada que configurar: Nginx pasa `REMOTE_ADDR` por FastCGI y `trustProxies` está vacío (C3a lo exige con una prueba). C4 lo comprueba de punta a punta: un pedido con `X-Forwarded-For`, `Forwarded` y `X-Real-IP` falsos cuenta contra la IP verdadera, y el registro de Nginx la muestra. Dos IP de origen (el host y un contenedor de otra red de Docker) cuentan por separado en la zona `limit_req`. Con IPv4 explícito no hay camino por el proxy de usuario (R4), y V3b lo confirma desde otra red.

**Valores de FR-028.** Salen de la carga de referencia (un aula de 40 detrás de un mismo NAT):

| Directiva | Valor | Cuenta |
| --- | --- | --- |
| `worker_connections` | 1 024 (hoy 256) | Con HTTP/2 un navegador usa una o dos conexiones y, con HTTP/1.1, hasta seis. Cuarenta alumnos son entre 40 y 240 conexiones; 1 024 por proceso deja lugar a varios clientes más |
| `limit_conn_zone $binary_remote_addr zone=perip:10m` y `limit_conn perip <N>` | `N` de la escalera de R26, a partir de 800 | En HTTP/1.1 un aula son entre 40 y 240 conexiones. En HTTP/2 **cada pedido concurrente cuenta como una conexión** (documentación de `ngx_http_limit_conn_module`), y A3 pide las 17 porciones a la vez (`Promise.all`): un aula que arranca junta llega a unos 720. La versión del 2026-10-06 proponía 300, que en HTTP/2 rechazaría el arranque. Se responde con `limit_conn_status 429`, que cae en el mismo JSON de `@too_many_requests` |
| `client_header_timeout` | 10 s | Un navegador manda la cabecera completa en milisegundos; una conexión que la gotea se cierra |
| `client_body_timeout` | 20 s | Es el tiempo entre dos lecturas, no del cuerpo entero; alcanza para los 24 MiB de la importación de D1 |
| `send_timeout`, `keepalive_timeout` | 30 s | |
| `reset_timedout_connection on` | | Libera el socket de lo que venció |

Se prueban con conexiones lentas desde un contenedor y con un aula simulada desde otro (los dos con IP distintas), sin descargar nada: la imagen `taller` trae `wget` y `nc` de BusyBox. El aula que arranca junta, con la ráfaga de la zona `api` y en los dos protocolos, se mide como dice R26. Los valores se revisan con una medición real en G2 (R22).

**Docker Desktop.** En macOS, la VM de Docker Desktop suele reemplazar la IP de origen por la de su puerta de enlace. El modo público se prueba y se opera en Linux (ADR 0005, «Host»), y la guía lo dice.

## R11. Cookies y configuración

**Decisión.** La base de Compose lee de variables con valores locales por omisión, y `public.sh` las exporta para el modo público:

| Variable de Compose | Por omisión (local) | Público | Llega a |
| --- | --- | --- | --- |
| `TALLER_APP_URL` | `http://localhost:${TALLER_PORT:-8080}` | `https://<dominio>` | `APP_URL` |
| `TALLER_SESSION_COOKIE` | `taller-session` | `__Host-taller-session` | `SESSION_COOKIE` |
| `TALLER_SESSION_SECURE` | `false` | `true` | `SESSION_SECURE_COOKIE` |
| `TALLER_DEVICE_COOKIE` | `taller-device` | `__Host-taller-device` | `DEVICE_COOKIE_NAME` |
| `TALLER_DEVICE_SECURE` | `false` | `true` | `DEVICE_COOKIE_SECURE` |

- `SESSION_DOMAIN` queda sin definir y `SESSION_PATH` en `/`: las condiciones de `__Host-`.
- `XSRF-TOKEN` y la cookie de «recordarme» **no** se prefijan: el nombre de la primera lo fija `PreventRequestForgery` y lo lee el cliente de F11a por nombre (`XSRF_COOKIE_NAME = 'XSRF-TOKEN'` en `frontend/src/shared/api/http/read-xsrf-token.ts`, que A3 reutiliza; hallazgo C4-11). Si algún día se prefija, el mismo cambio edita esa constante y su spec. `public-check.sh` exige el nombre exacto, y el de la segunda sale del guard de sesión (`remember_web_<hash>`). Prefijarlas exige reescribir el middleware y el cliente por un beneficio chico: el token tiene que coincidir con el de la sesión, y un subdominio que pise `XSRF-TOKEN` no lo conoce. Las dos llevan `Secure` porque Laravel toma `session.secure` para todas las cookies que arma.
- Laravel sabe que la conexión es segura sin `trustProxies`: `fastcgi_params` pasa `HTTPS $https if_not_empty`.
- Los links de invitación y de recuperación se arman desde `APP_URL`, nunca desde `Host` (C3a).

**Por qué la base y no el archivo público.** Un servicio nuevo de Laravel (el worker de B2, el de C3c) nace con el mismo entorno y no puede olvidarse de las cookies.

## R12. Usuarios de MySQL

**Decisión.**
- **Nombres.** `taller_app`, `taller_runs`, `taller_mail`, `taller_migrate`, `taller_backup` y `taller_audit`, con host `%` (D21 ya usa `taller_mail`; los roles de Q5 son `app`, `runs`, `mail`, `migrate` y `backup`, y `audit` es de la auditoría de B3, R28).
- **Los dos modos.** FR-030 no se limita al modo público, y lo que se prueba en la CI es lo que se despliega. `x-laravel-base-env` deja de fijar `DB_USERNAME` y `DB_PASSWORD` y cada servicio los fija con la contraseña de su rol (`APP_DB_PASSWORD`, `RUNS_DB_PASSWORD`, `MAIL_DB_PASSWORD`, `MIGRATE_DB_PASSWORD`, `BACKUP_DB_PASSWORD` y `AUDIT_DB_PASSWORD`). Los valores por omisión que hoy apuntan a `taller` (`${RUNS_DB_USERNAME:-taller}` y `${RUNS_DB_PASSWORD:-${MYSQL_PASSWORD}}` en `worker-runs`, y los `AUDIT_*` del servicio `audit` de B3) se reemplazan por la cuenta del rol. `x-laravel-test-env` y `phpunit.xml` no cambian: las pruebas usan `mysql-test` con root. El servicio `mysql` deja de crear el usuario `taller` (se quitan `MYSQL_USER` y `MYSQL_PASSWORD`), y `init-env.sh` deja de generar `MYSQL_PASSWORD`; un `.env` viejo conserva su línea, sin efecto.
- **Dos fases, por una regla del manual de 9.7.** «MySQL permite conceder privilegios sobre bases de datos o tablas que no existen. Para las tablas, los privilegios que se conceden tienen que incluir `CREATE`» (`GRANT`). Entonces los permisos por tabla de `app`, `runs` y `mail` no pueden concederse en el inicio de un volumen nuevo, antes de que `migrate` cree las tablas, sin darles `CREATE`. La fase `users` (cuentas, los privilegios de nivel base de `migrate` y los globales y de base de `backup`) corre antes de migrar; la fase `tables`, después.
- **Quién corre qué** (corregido el 2026-10-28, R27).
  - El mecanismo ya lo trae C3c para `taller_mail`: `docker/mysql/apply-grants.sh`, `10-db-grants.sh`, el servicio `grants` y `db-grants`, con los nombres, los marcadores y las fases de este plan (hallazgo C4-8). C4 lo extiende y no lo reescribe.
  - En un volumen nuevo, el inicio de MySQL corre la fase `users`. Un servicio nuevo, `grants-users`, con root y sin perfil, corre la fase `users` antes de `migrate` en cada arranque: crea las cuentas que falten y vuelve a fijar sus contraseñas, también en un volumen anterior a C4 levantado con `docker compose up` a secas. `migrate` crea las tablas. `grants` (el de C3c, que hoy corre las dos fases) vuelve a la fase `tables`, como C3c previó, y los servicios que dependían de `migrate` pasan a depender de `grants`.
  - `db-grants` conserva el perfil `ops` y su nombre, porque `smoke.sh` de C3a comprueba que no se levanta sin ese perfil y FR-002 pide que los checks de hoy pasen sin editarlos. Corre las dos fases: es el comando manual. `grants-users`, `grants` y `db-grants` comparten un ancla.
  - Orden de `deploy.sh`: construir → `mysql` sano → `grants-users` (sólo cuentas, contraseñas y privilegios de base: no toca ninguna tabla de `taller`, así que el escenario 3 de `deploy-check.sh` sigue viendo a `migrate` rendirse ante el bloqueo) → `migrate` → `db-grants` en cada despliegue, como dejó C3c (hallazgo C4-9: se conserva, porque es idempotente y sincroniza las contraseñas después de una rotación) → `up` → `db-grants` otra vez sólo si `taller` todavía existe (lo retira, R13).
- **Plan alternativo si el coordinador prefiere un solo servicio.** `db-grants` sin perfil, en la cadena, y se edita la comprobación de C3a. Se descartó por FR-002.
- **Las tablas.** `data-model.md` clasifica cada tabla de C3a y de B2 y fija la regla para las de D1, C3b y C3c (R24). Una prueba falla si `information_schema` tiene una tabla que la matriz no nombra.
- **Una cuenta, un conjunto de privilegios.** `taller_migrate` no tiene `GRANT OPTION`, ni `CREATE ROUTINE`, `EVENT`, `TRIGGER` ni vistas: el esquema no los usa y una migración que los necesite edita la matriz a propósito. `FOR SHARE` pide sólo `SELECT` y `FOR UPDATE`, `SELECT` más `UPDATE`, `DELETE` o `LOCK TABLES` (manual de 9.7, lecturas con bloqueo): B2 toma `users FOR SHARE`, y los roles que bloquean con `FOR UPDATE` tienen `UPDATE` sobre esa tabla.

**Alternativas descartadas.** La fase `users` condicional en `deploy.sh` y un aviso de `migrate.sh` como única salida en un volumen viejo (la versión del 2026-10-06: un `docker compose up` a secas fallaba en `migrate`, y C3c ya había resuelto ese caso para `taller_mail`); `grants` con las dos fases antes de `migrate` (los permisos por tabla fallan sin las tablas); permisos de base con `partial_revokes` (sólo excluyen bases, no tablas); un esquema aparte para el contenido (cambia la base de C2 y todo lo que la usa); darle `GRANT OPTION` a `migrate` (FR-031: no puede conceder); conceder con `CREATE` sobre tablas inexistentes (le daría a `app` el poder de crearlas).

## R13. Las contraseñas y la convergencia de `db-grants.sql`

**Decisión.** `docker/mysql/db-grants.sql` sigue siendo el único archivo de usuarios y privilegios, con dos secciones marcadas (`-- @phase users` y `-- @phase tables`) y marcadores `@@APP_DB_PASSWORD@@` (uno por rol). `docker/mysql/apply-grants.sh [--phase users|tables|all] [--host <h>]` es el de C3c: valida cada contraseña (`[A-Za-z0-9._~-]{24,128}`), sustituye los marcadores con `sed`, antepone `SET SESSION sql_log_bin = 0;` (ni siquiera el hash de una contraseña entra al binlog) y `SET SESSION lock_wait_timeout = 5;` (un permiso que espera un bloqueo de metadatos falla en lugar de colgar un despliegue), y entrega el SQL por la entrada estándar de `mysql`, nunca por la línea de comandos. La contraseña de root va en un archivo de opciones temporal (`--defaults-extra-file`, `umask 077`, borrado al salir) y no en `MYSQL_PWD`, que está desaconsejada; los scripts se llaman con `sh`, sin `exec` ni el bit de ejecución, porque el inicio de MySQL sourcea un `.sh` (las tres diferencias que C3c registró contra la versión del 2026-10-06). C4 suma `APP RUNS MIGRATE BACKUP AUDIT` a la lista del `for` y un `-e` por marcador. El inicio de un volumen nuevo lo corre con `--phase users` y el socket (el servidor temporal sólo escucha ahí); `grants-users`, `grants` y `db-grants`, con `--host mysql`.

- **Cada corrida vuelve a fijar las contraseñas:** `CREATE USER IF NOT EXISTS …` y `ALTER USER … IDENTIFIED BY …`. Rotar una contraseña es cambiar `.env` y correr `db-grants`.
- **Los privilegios sólo se suman.** Un archivo que también quitara tendría una ventana, entre el `REVOKE` y el `GRANT`, en que un servicio vivo recibe el error 1142. Lo que sobra al achicar la matriz se revoca con una línea explícita en el mismo cambio, y la prueba de la matriz (`SHOW GRANTS` contra la matriz, en el stack desplegado) detecta un volumen al que esa línea no llegó.
- **El retiro de `taller`.** Al final de la fase `tables`, una sentencia preparada hace `DROP USER 'taller'@'%'` (que le quita la cuenta y todos sus privilegios) sólo si existe y ninguna sesión suya está conectada (`performance_schema.threads`). La corrida de un despliegue sobre un volumen viejo, antes del `up`, la encuentra con las sesiones de los servicios todavía anteriores y no lo borra; la última, después del `up`, sí, y `deploy.sh` ya no vuelve a llamarla porque `taller` no existe. Con un volumen nuevo no hay usuario `taller`.
- **Los privilegios de C3a** (`SELECT` sobre `performance_schema.events_transactions_current`) pasan de `taller` a `taller_migrate`.

## R14. Los privilegios del respaldo

Del manual de 9.7 (`mysqldump` y `SHOW BINARY LOG STATUS`): `--source-data` envía `SHOW BINARY LOG STATUS`, que exige `REPLICATION CLIENT`, y exige `RELOAD`; `PROCESS` hace falta salvo con `--no-tablespaces`; `--routines` exige `SHOW_ROUTINE` (en la tabla del manual, «SHOW CREATE ROUTINE») y `--events`, `EVENT`; los triggers exigen `TRIGGER`. FR-031 de la spec nombraba `RELOAD` pero no `REPLICATION CLIENT`.

**Decisión.** `taller_backup`: globales `RELOAD` y `REPLICATION CLIENT`; sobre `taller.*`, `SELECT` y `SHOW VIEW`. El volcado usa `--single-transaction --source-data=2 --no-tablespaces --skip-triggers --hex-blob`, sin `--routines` ni `--events`. `TRIGGER` y `EVENT` son privilegios de escritura (crear triggers y eventos), así que no se le dan a un usuario que no puede escribir. El esquema no tiene triggers, rutinas ni eventos, y la prueba de la matriz lo exige (lee `information_schema` como root): quien los cree edita el respaldo a propósito. V4 parte de este conjunto, saca privilegios de a uno y anota el mínimo que funciona.

**Un riesgo que V4 mide.** Con `--source-data`, el `FLUSH TABLES WITH READ LOCK` con que empieza el volcado espera a que terminen las sentencias en curso y, mientras espera, frena las escrituras nuevas (documentación de `mysqldump`). Una consulta larga a la hora del volcado se las frena a todos. A las 3 de la mañana y con el `MAX_EXECUTION_TIME` de las estadísticas (D35) el riesgo es chico, y V4 lo mide: cuánto se frenan las escrituras con una sentencia de 30 segundos en curso.

## R15. El respaldo

**Imagen.** Basada en `mysql:9.7` (la misma que ya fija Compose; Oracle Linux 9, con `bash`, `gzip`, `openssl`, `xz`, `zstd` y `findutils`, y `mysqldump` del mismo cliente que el servidor: el `mysql-client` de Alpine es el de MariaDB y no entiende `--source-data` de 9.x). El Dockerfile de docker-library usa `curl` al construir la imagen y no lo quita, y trae `microdnf`: el primer paso de la tarea lo comprueba y, si `curl` falta, lo agrega con `microdnf` (descarga opcional, R23).
- `age` v1.3.2: `ADD --checksum=sha256:… https://github.com/…/age-v1.3.2-linux-amd64.tar.gz`, con el sha256 que da la API de GitHub (`cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10`).
- `rclone` 1.75.1: `COPY --from=rclone/rclone:1.75.1@sha256:… /usr/local/bin/rclone` (un binario estático de Go; el digest se lee al pedir el permiso).

**Qué hace `once`**, en orden: toma el candado; mira que el spool tenga lugar; mide los conteos y las huellas (antes); vuelca con el usuario `taller_backup` (`mysqldump … | zstd -3`) todas las tablas menos las efímeras; vuelca sólo la estructura de `sessions`, `cache`, `cache_locks`, `jobs`, `mail_jobs` y `failed_jobs` (ADR 0006 §9); copia el libro de supresiones (`account_deletions`, si existe) como TSV; mide otra vez (después); escribe el manifiesto; arma un tar y lo cifra con `age` a uno o más destinatarios; lo sube; y, sólo si subió, borra la copia local, anota el éxito y manda el latido. Nunca queda un volcado sin cifrar en disco: el único archivo previo al cifrado es el volcado ya comprimido, en un directorio de trabajo que se vacía al terminar.

**El manifiesto.** Un volcado con `--single-transaction` es consistente, pero el origen sigue cambiando mientras corre, así que no se puede comparar con un solo conteo «en el momento del volcado». El manifiesto toma conteos y huellas (`CHECKSUM TABLE`) de las tablas de cuentas, progreso e intentos **antes** y **después** del volcado. La restauración compara con esta regla: una tabla que no cambió entre las dos medidas (misma cuenta y misma huella) tiene que restaurarse idéntica; una que cambió, con conteo entre las dos medidas si es sólo de agregados y «no concluyente» si es mutable, que se informa y no falla. A las 3 de la mañana, el conjunto que cambia suele ser vacío. Se descartaron `FLUSH TABLES WITH READ LOCK` durante todo el volcado (bloquea las escrituras), una instantánea gemela con el candado global (frágil de orquestar en `sh`) y comparar con el origen vivo (ruido).

**El libro de supresiones** viaja como TSV de tres columnas, `user_id`, `user_created_at` y `deleted_at`, en UTC: es lo que `taller:reapply-deletions <archivo>` de C3b lee. Si C3b define otro formato, sólo cambia ese paso del respaldo (R24).

**Nombre del objeto.** `taller/AAAA-MM/taller-AAAAMMDDTHHMMSSZ-<8 hex al azar>.tar.age`. El sufijo al azar impide que la credencial que sólo agrega adivine el nombre de una copia vieja para escribir encima.

**El ritmo.** El servicio es un bucle propio (`restart: unless-stopped`) que espera a `BACKUP_TIME` (UTC, 03:00 por omisión); si no hay un éxito en las últimas 26 horas al arrancar, corre uno de inmediato. Una falla se reintenta a los 15 minutos, hasta cuatro veces; después espera la noche siguiente. No es un `cron` del host: un respaldo que depende de una configuración de la máquina fuera del repositorio es el que falla en silencio. ADR 0006 §9 y D34 lo ubican en el perfil `ops`, pensando en un `docker compose run`; con el bucle propio vive en el archivo público y, para el modo local, no existe.

**El spool** guarda sólo lo que todavía no salió, con un tope (`BACKUP_SPOOL_MAX_MIB`, 2 048 por omisión): si no entra una copia más, el respaldo falla con un mensaje claro y no borra lo que está esperando (FR-041).

## R16. El destino

**Decisión.** Cualquier almacenamiento compatible con la API de S3, por `rclone` configurado con variables de entorno (`RCLONE_CONFIG_DEST_TYPE=s3`, `…_PROVIDER=Other`, `…_ENDPOINT`, `…_REGION`, `…_ACCESS_KEY_ID`, `…_SECRET_ACCESS_KEY`), sin un archivo de configuración con secretos. Sube con `rclone copyto --no-check-dest --s3-no-check-bucket --s3-no-head`, para que funcione con una credencial que sólo puede `PutObject`: sin listar, sin `HEAD` y sin comprobar el bucket. El servidor valida la integridad del envío (`Content-MD5` en los envíos simples y por parte en los multiparte); la integridad de lo guardado la prueba la restauración mensual.

**Lo que el usuario configura en el destino** (acción 3 de la spec; V5 lo comprueba):
- una credencial de escritura con el único permiso de agregar objetos (por ejemplo, `s3:PutObject` sobre `taller/*` en AWS, o una clave de aplicación con sólo escritura en Backblaze B2), la que va a `.env`;
- una credencial de lectura y de listado que sólo tiene el usuario;
- las versiones activadas, para que escribir sobre el nombre de un objeto no lo destruya;
- la expiración a los 35 días, de las versiones actuales y de las anteriores.

**Un respaldo por noche, 35 días: 7 diarias y 4 semanales sin podar nada.** Con la expiración en el destino, el host no necesita ningún permiso de borrado: quedan 35 copias diarias, de las que las semanales son las de un día fijo. El destino se llena con 35 volcados completos: hoy son unos megabytes; al acercarse al techo de diseño (unos 20 GB sin comprimir), el costo mensual se revisa (ADR 0006 §9).

**Se descartó** el bloqueo de objetos (`Object Lock`): depende del proveedor y agrega costo, y la combinación de una credencial que sólo agrega con versiones y expiración ya cumple SC-009.

## R17. El despliegue y el volcado no se solapan

**Decisión.** Una exclusión explícita, con la red de seguridad que ya existe.
- El volcado toma `flock` sobre `/spool/.lock` (si `flock` no está en la imagen, `mkdir` como cerrojo atómico) durante todo el `once`.
- `deploy.sh` en el modo público corre `backup once --reason pre-deploy` (el respaldo previo que pide el ADR 0006 §10): si hay un volcado en curso, espera hasta 15 minutos a que termine; después toma el suyo, y recién entonces migra. Antes crea el marcador `/spool/.deploying` (`deploy-begin`) y lo borra al terminar (`deploy-end`, también desde un `trap`). El bucle nocturno posterga su corrida mientras el marcador existe y no tiene más de 30 minutos.
- La segunda línea es lo que C3a y MySQL ya hacen: un volcado de más de 30 segundos abierto hace fallar el chequeo de transacciones largas de C3a antes de migrar; un DDL durante un volcado espera el bloqueo de metadatos de las tablas que el volcado ya leyó (`lock_wait_timeout=5` en `migrate`) o hace fallar al volcado con el error 1412 (la definición de la tabla cambió). Los dos casos son visibles y se reintentan.
- Una prueba cubre los dos órdenes: un despliegue mientras corre un volcado largo (espera y migra después), y un volcado que le toca durante un despliegue (se posterga y corre después).

## R18. La restauración, en dos partes

La clave privada nunca entra en el host (FR-035) y el binlog nunca sale de él (Q2): ninguna prueba puede hacer las dos cosas a la vez. FR-042 se parte (la spec se corrigió en este mismo plan).

**(a) La restauración completa**, `restore-check.sh`, en una máquina con la clave y las credenciales de lectura que no es el host (la del usuario). Lista el destino, toma el objeto más nuevo, lo descifra, lo restaura en un MySQL 9.7 descartable (un contenedor con tmpfs y su propia red, sin tocar el proyecto de producción), compara con el manifiesto por la regla de R15, corre `taller:reapply-deletions` con el libro si existe (con la imagen `php` en una red temporal que apunta a esa base) y mide. Imprime una línea con la fecha, el tamaño, el tiempo y el resultado, que el usuario registra con `public.sh restore-record`. Si el tiempo pasa de una hora, es el disparador del ADR 0006 §9.

**(b) El simulacro de recuperación a un punto en el tiempo**, en el host: un volcado local sin cifrar, con `--source-data=2`, que se restaura en una base descartable y recibe el binlog (`mysqlbinlog`, con los archivos copiados con `docker compose cp`) desde la posición del volcado hasta una posición posterior. Entre el volcado y el final del simulacro genera tráfico propio (20 pedidos a `GET /api/session`, que crean 20 sesiones) y exige que la base restaurada y recuperada tenga al menos 20 sesiones más que la del volcado y no más que las del origen. El volcado sin cifrar se borra al terminar. Prueba las coordenadas del encabezado del volcado, que el binlog cubre esa posición, el formato `MINIMAL` y `mysqlbinlog`, que es lo que (a) no puede.

## R19. El binlog

`--binlog-expire-logs-seconds=604800` y `--binlog-row-image=MINIMAL` en `x-mysql-command` de la base de Compose, para los dos modos (FR-038): el simulacro de R18 lo necesita en el stack local, y el binlog con 30 días de retención por omisión de MySQL acumula disco en los stacks de desarrollo. El cambio recrea el contenedor `mysql` en el próximo `up` (la documentación lo dice). El binlog está activo por omisión en 9.x (`mysql-test` lo apaga con `--skip-log-bin`); V4 lo confirma con `SHOW VARIABLES LIKE 'log_bin'`.

## R20. El comando de estado y el monitor

`public.sh status` informa, en español: el certificado que se sirve (se pide por la IP del host con el nombre configurado: `openssl s_client -connect 127.0.0.1:443 -servername <dominio>`, sin salir a Internet), con su vencimiento y los días que le quedan; el escalón de HSTS (la cabecera que responde); el último respaldo (de `/state/last-success.json`, que el volcado escribe: la credencial del host no puede listar el destino); la última restauración probada (`/state/restore-checks.log`); si hay un fallo registrado; y si el latido está configurado. Sale con 0 si todo está bien, 1 si hay algo que atender (al certificado le quedan menos de 15 días, el último respaldo tiene más de 36 horas, hay un fallo sin resolver o la última restauración probada tiene más de 40 días, porque la prueba es mensual) y 2 si no pudo consultar (el stack está caído). Otra herramienta puede usarlo.

El monitor externo, que el usuario crea (acción 7), vigila `https://<dominio>/healthz` cada 5 minutos con alerta de vencimiento del certificado a los 14 días, y espera el latido del respaldo cada 24 horas con 6 de gracia. Un latido es una petición HTTP de salida que el respaldo manda sólo después de subir (`curl -fsS -m 10 --retry 3 "$BACKUP_HEARTBEAT_URL"`); un fallo manda `BACKUP_HEARTBEAT_FAIL_URL` si está.

## R21. Registros

El archivo público fija, para cada servicio, `logging: {driver: json-file, options: {max-size: "20m", max-file: "10"}}` (variables `LOG_MAX_SIZE` y `LOG_MAX_FILE`): unos 200 MiB por servicio como tope. Compose no permite fijarlo para todos a la vez, así que el check público comprueba que cada servicio de `docker compose config --services` lo tenga, y un servicio que sumen B2 o C3c sin esa línea lo hace fallar. Docker no rota por días: se mide cuántos bytes por día produce el servicio de Nginx durante la primera semana con tráfico y el tope se ajusta para que cubra unos 14 días (FR-029). La retención en días la fija el ADR 0006 §13.13, todavía abierta. El registro de `/api/` ya excluye la consulta (D20); el de los archivos estáticos conserva el formato por omisión (con IP, agente y referente), que es lo que más datos personales tiene y entra en la misma decisión.

## R22. La compuerta, en dos tramos, y la CI

**El problema.** FR-044, como estaba, pedía probar el dominio real con el servidor de pruebas de la autoridad antes de abrir el reenvío de puertos. HTTP-01 y TLS-ALPN-01 necesitan que la autoridad llegue al puerto: antes de abrir, ninguna validación contra el dominio real puede salir (sólo DNS-01, que Q1 descartó, lo permitiría). Lo mismo vale para V3 desde otra red.

**G1, antes de abrir el reenvío.** FR-033 en verde; FR-043 en local con un certificado de prueba y con Pebble; el recorrido de la User Story 3, con las pantallas de F11a, F11b y F12a, sin violaciones de CSP; el arranque del aula sin ningún 429 (R26); la restauración (a) presenciada por el usuario y el simulacro (b) hechos; HSTS en su escalón inicial; el destino verificado (V5); C3a, C3b y C3c entregados, con una cuenta admin y el aviso de privacidad vigente; F11b y F12a integradas; y la corrida de registro de la auditoría de B3 en verde sobre el contenido que se despliega (R31).

**G2, al abrir.** El usuario reenvía el 80 y el 443; con `ACME_DIRECTORY_URL` de staging (`https://acme-staging-v02.api.letsencrypt.org/directory`): emisión contra el dominio real y FR-043 contra él; V3b desde datos móviles; un escaneo de puertos desde otra red; después el emisor de producción y la rampa de HSTS (300 s, 86 400 s, 604 800 s y 31 536 000 s, cada escalón con su condición de FR-014).

**La CI.** Un job nuevo, `public`, en `.github/workflows/ci.yml`: `init-env.sh`, `npm run public:check`, `npm run api:grants:check`, `npm run public:acme-check` y `npm run public:backup-check`, todos con Docker de los runners. Tarda más que los otros tres (construye tres imágenes): los checks con Pebble y con el S3 de prueba van en el mismo job para no reconstruirlas. Ninguno forma parte de `npm test`, que corre dentro del `docker build` de la web y no tiene Docker.

## R23. Las descargas y el método de los tamaños

Los tamaños son metadatos, no mediciones de `pull`: la API de GitHub da el tamaño de cada asset y su sha256; la de Docker Hub, el tamaño comprimido de la imagen `linux/amd64`; el registro de GHCR, el de las capas; y el listado del repositorio de nginx.org, el de cada paquete. Se leyeron el 2026-10-06 (el de lego, certbot y `testssl.sh`, el 2026-10-05). Al pedir cada permiso se vuelven a leer y se fija el digest o el sha256 en el Dockerfile.

- Cambió respecto de la spec: Pebble tiene imagen oficial en GHCR (`ghcr.io/letsencrypt/pebble:2.10.1`, 3 332 845 bytes en capas para amd64); la spec decía que no había. `rclone/rclone:latest` es hoy la 1.75.1 (33 921 688 bytes, el mismo tamaño que el de la spec).
- Los paquetes `age` (5,4 MiB) y `rclone` (35,2 MiB) de Alpine 3.24 son irrelevantes: la imagen de respaldo es de Oracle Linux, no de Alpine.

## R24. Lo que C4 toma de los vecinos y lo que les deja

**Toma.**
- De C3a: el Nginx con sus zonas y el 429 en JSON, `db-grants.sql` y `db-grants`, la estructura de `init-env.sh`, la cookie de dispositivo configurable, `trustProxies` vacío y el contrato de errores `{message, code}`.
- De A2: `qa/lib/built-page.ts` y `assertSinglefileDocument` (los que C4 cambia) y `curriculumMarkers()` y `contentVersion()` (los que FR-022 usa).
- De B2: `RUNS_DB_USERNAME` y `RUNS_DB_PASSWORD`, la ubicación `/api/runs` y su check de bloques.
- De C3b/C3c: `account_deletions`, `taller:reapply-deletions` y `worker-mail` con su usuario. De C3c, además, el mecanismo de los permisos ya implementado (`apply-grants.sh`, `10-db-grants.sh`, `grants` y `db-grants`) y `deploy.sh` con `db-grants` en cada despliegue.
- De D1a y D1b: los bloques `= /api/sync` y `= /api/progress/import` de Nginx y las doce tablas de progreso.
- De F11a: la sesión obligatoria, el cliente que lee `XSRF-TOKEN` por nombre, el proxy de `/api/` de `npm run dev` y de la vista previa (que se une a la red `taller-rust-go_web` del stack como externa) y `PRIVACY_VERSION` en `x-laravel-env` (T028 de F11a; hallazgo C4-13).
- De A3: el contenido detrás de la sesión, el retiro del puente de A2 (FR-022 se cumple con T011 y T016 de A3) y `qa/classroom-boot-check.ts` (T015 de A3), la medida del aula (R26).
- De F11b y F12a: las pantallas que el recorrido suma (R29).
- De B3: el servicio `audit` con su gancho `AUDIT_DB_USERNAME` (R28) y la corrida de registro que G1 exige (R31).

**Deja, y son hallazgos para quien integra** (el resumen está en el informe del plan):
- C3a: la ubicación `@too_many_requests` pierde la CSP y `Referrer-Policy`; el DNS cerrado de `taller` no sirve para la exposición; el cierre de sesión por CSRF.
- B2: su check de bloques de Nginx debe seguir leyendo `docker/nginx/nginx.conf` (C4 lo respeta).
- C3b y C3c: el mecanismo de contraseñas de `db-grants.sql` (R13), el formato TSV del libro (R15) y que los permisos de `mail` son de la fase `tables` (R12).
- A2 y A3: C4 cambia `built-page.ts`; A3 tiene que retirar el puente antes de C4.
- La hoja de ruta: C4 depende de A3, C3a, C3b, C3c, F12a y F11b, y G1 de la auditoría de B3; ya no espera a F5, F7 ni F8; suma el simulacro de recuperación, el comando de estado, el job de CI y `docs/operacion-publica.md`.
- B3: si B3 entra después de C4, su servicio `audit` nace con `taller_audit` y `AUDIT_DB_PASSWORD`, no con el valor por omisión `taller`, que C4 retira.
- A4: el segundo en llegar de C4 y A4 quita los Playgrounds de `headers.conf` y de los valores escritos a mano de los checks (R30).

## R25. El build sin `vite-plugin-singlefile` sigue siendo un solo módulo

**El hallazgo.** El plugin no sólo mete el JS y el CSS en el HTML. Su gancho `config` también fija cinco opciones de build (`node_modules/vite-plugin-singlefile/dist/esm/index.js`, versión 2.3.3):
- `codeSplitting: false` en la salida de Rolldown (Vite 8; con versiones anteriores, `inlineDynamicImports: true`);
- `cssCodeSplit: false`;
- `assetsInlineLimit: () => true`;
- `base: './'`;
- `assetsDir: ''`.

Si se quita el plugin sin reponer las dos primeras, Rolldown arma un archivo por cada `import()` de `frontend/src/app/boot/legacy-views.ts` (los 19 de `LEGACY_MODULES` y el de `app.js`). Eso rompe tres cosas:
- `evaluateBuiltPage` (`qa/lib/built-page.ts`) se detiene en «la salida usa import() dinámico real»;
- `boot-check` y `load-order-check`, que evalúan la página construida, fallan;
- la compuerta de `import.meta` de TR-4 (`dynamicImports` en 0) se rompe.

**Decisión.** `frontend/vite.config.ts` sin `viteSingleFile` y con:
- `html: { cspNonce: '__CSP_NONCE__' }`;
- `build.cssCodeSplit: false`;
- `build.rolldownOptions.output.codeSplitting: false`, junto al `banner` y los `comments` que ya están.

El tipo es el de Rolldown 1.2.12 (`codeSplitting?: boolean | CodeSplittingOptions`): «`false`: Inline all dynamic imports into a single bundle (equivalent to deprecated `inlineDynamicImports: true`)». Context7 no lo nombra para la 8.0.10; se leyó en los tipos instalados.

Las otras tres opciones vuelven a su valor por omisión:
- `base` en `/`: Nginx sirve la raíz, y la vista previa también;
- `assetsDir` en `assets`: es la `dist/assets/` que FR-021 cachea;
- `assetsInlineLimit` en 4 096 bytes: lo que se incrusta como `data:` en el CSS lo lista V2. `img-src` admite `data:`, y una fuente no (cae en `default-src 'self'`): si aparece una, se fija `assetsInlineLimit: 0`.

Se conservan `server.proxy` y `preview.proxy: {}` de F11a (`qa/vite-proxy-check.ts` los exige).

**El tope.** `BOOT_SIZE_LIMIT` sigue en **1 500 000** caracteres (PR #76, decisión del usuario del 2026-10-28). Mide `bootSize`: el HTML más el módulo de JS y la hoja que enlaza, que es lo que el navegador baja para arrancar.
- La hoja de ruta del front (`specs/front-react/roadmap.md:238`) le promete a F3 a F11 y a A3 unos 358 000 caracteres de margen sobre esa suma. Por eso C4 no lo achica con un tope «medido × 1,10», como proponía la versión del 2026-10-06.
- El tope por archivo de FR-020 es otro: `dist/index.html` sin código en línea tiene a lo sumo **20 000** caracteres. La fuente, `frontend/src/index.html`, mide 4 381 bytes. Un HTML que pasa ese tope volvió a incrustar código o el currículo.
- El subpresupuesto de C4 sobre `bootSize` es de **+2 000** caracteres: los atributos `nonce`, la `<meta>` y `csp-nonce.ts`. T001 mide la base y T011, el resultado.

**Alternativas descartadas.**
- Varios archivos con importación dinámica real: cambia el orden de carga que fija F2 y obliga a reescribir `evaluateBuiltPage` y la compuerta de TR-4, sin una ganancia que C4 necesite.
- Conservar el plugin con `useRecommendedBuildConfig` y no incrustar: el plugin existe para incrustar, y FR-020 pide retirarlo.

## R26. El aula detrás de un NAT (hallazgo C4-4)

**El problema.** Un aula de 40 que arranca junta detrás de una IP hace unos 720 pedidos a `/api/`: por alumno, la sesión y las 17 porciones, que A3 pide a la vez con `Promise.all` (plan de A3, `fetchRound`).
- **La zona `api`** de C3a admite una ráfaga de 400 con `nodelay` y 50 por segundo. Lo que sobra recibe un 429 inmediato con `Retry-After: 1`. A3 respeta esa espera dentro de su intento (su FR-009), así que el aula probablemente arranca, pero cada arranque en frío paga la espera y llena el registro de 429.
- **`limit_conn` con HTTP/2** cuenta cada pedido concurrente como una conexión (documentación de `ngx_http_limit_conn_module`). En el modo público, con `http2 on`, los 300 por IP que proponía R10 rechazarían el arranque. En el modo local (HTTP/1.1) eso no se ve.

**Decisión.** Medir y fijar los valores con la medida, no con una cuenta en el plan. La medida tiene tres partes, en T020.
1. **HTTP/1.1, en el stack local:** `qa/classroom-boot-check.ts` de A3 (su T015), tal cual. T001 anota el resultado que A3 dejó en su research, «Mediciones contra el stack».
2. **HTTP/2, en el stack de prueba público:** el mismo script, con dos variables nuevas:
   - `CLASSROOM_BASE_URL=https://taller.test:18443`, con Chromium lanzado con `--host-resolver-rules=MAP taller.test 127.0.0.1` y los contextos con `ignoreHTTPSErrors`;
   - `CLASSROOM_COOKIE`, la cookie de una cuenta de prueba abierta por HTTPS con `check-account.sh` y un `.curlrc` temporal (las `__Host-` no se aceptan por HTTP).
3. **Los conteos, en `public-check.sh`:** 40 procesos de `curl --http2 --parallel --parallel-max 18` a la vez, desde una IP y con la cookie de la cuenta, con la sesión y las 17 porciones cada uno, y el conteo de estados.

**El criterio:**
- 0 vistas de error en las dos rondas del script de A3 (su SC-007), en los dos protocolos;
- 0 respuestas 429 y 0 503 en los 720 pedidos de la parte 3;
- y el límite sigue existiendo: 2 000 pedidos en un segundo desde una IP reciben algún 429.

**La escalera.** La ráfaga de la zona `api` pasa por 400, 800 y 1 200, y `limit_conn perip`, por 800, 1 200 y 1 600, de a un escalón en los dos. Queda el primer par que cumple el criterio, y se anota en este archivo, en el check y en la guía de operación.
- No cambian el ritmo de la zona `api` (50 por segundo) ni la zona `session` (5 por segundo, ráfaga de 60): 40 sesiones entran en 60.
- **El techo, decidido por el usuario el 2026-10-28:** el último escalón (ráfaga de 1 200 y `limit_conn perip 1600`) es el máximo aceptado. Si no alcanza, T020 se detiene y lo lleva al coordinador: sería el pool de PHP, no Nginx.

**Por qué no una cuenta.** Cuántos pedidos están en vuelo a la vez depende de lo rápido que responde PHP y de cuántos flujos abre el navegador por conexión. La medida es la fuente.

**El costo, aceptado por el usuario el 2026-10-28.** Una IP sola puede mandar de golpe hasta la ráfaga elegida (como mucho 1 200), y no 400, y sostener hasta 1 600 conexiones o flujos. Los límites por cuenta de Laravel siguen intactos, y el volumen sin CDN ya estaba fuera de alcance.

## R27. Las cuentas existen antes de migrar, también en un volumen viejo

**El hallazgo** (plan de C3c, hallazgos C4-8 y C4-9). C3c dejó a `grants` con las dos fases para que un volumen anterior a C3c arranque con un `docker compose up --build -d --wait` a secas, que es como `AGENTS.md` documenta el stack. Con C4, `migrate` entra con `taller_migrate`. Así, la versión del 2026-10-06 rompía ese `up`: `migrate` corría antes de que existiera su cuenta, y la salida era un aviso de `migrate.sh`.

**Decisión.** Un servicio `grants-users`, con el ancla de `grants`, corre `apply-grants.sh --phase users --host mysql` después de `mysql` sano y antes de `migrate`, que pasa a depender de él. La fase `users` sólo crea cuentas, fija contraseñas y concede privilegios de base y globales. No toca ninguna tabla de `taller`, así que el escenario 3 de `deploy-check.sh` sigue viendo a `migrate` rendirse ante el `LOCK TABLES exercises WRITE`. `grants` vuelve a la fase `tables`. El aviso de `migrate.sh` se conserva, para un `run --no-deps migrate` a mano.

**`deploy.sh` no depende de que `run` espere condiciones.** La documentación de `docker compose run` dice que arranca los servicios de los que depende y que `--no-deps` lo evita, pero no que espere un `service_completed_successfully`. Por eso corre `grants-users` explícitamente y después `migrate` con `--no-deps`.

**Se prueba** con un volumen creado con el `docker/compose.yaml` de la base de T001:
- un `docker compose up --build -d --wait` a secas termina con `grants-users`, `migrate` y `grants` en 0 y los servicios con sus cuentas;
- `deploy-check.sh` pasa sin editarse.

Es la prueba de T027 de C3c, extendida a las seis cuentas.

## R28. `taller_audit`, para la auditoría de B3 (hallazgo C4-5)

**Decisión.** Un sexto rol, `taller_audit`, con `SELECT` sobre las cuatro tablas que lee la auditoría (data-model de B3, «Lo que se lee»): `content_imports`, `harness_templates`, `exercises` y `exercise_tests`. Nada más: ni escritura, ni DDL, ni `GRANT`.
- Su contraseña, `AUDIT_DB_PASSWORD`, la genera `init-env.sh`.
- El servicio `audit` de B3 (perfil `audit`) pasa de `${AUDIT_DB_USERNAME:-taller}` a `taller_audit` y depende de `grants`.

Si la corrida de registro con `taller_audit` falla con 1142 en otra tabla (por ejemplo, un almacén de caché en la base), T015 suma esa tabla a la matriz, con su motivo, en el mismo cambio. Si B3 todavía no está integrada cuando corre T018, la cuenta y su fila de la matriz se crean igual, y el servicio con su usuario lo trae B3 (hallazgo para su plan).

**Alternativa descartada.** Que la auditoría use `taller_app`, que lee el contenido. Pero `taller_app` escribe cuentas y progreso, y FR-012 de B3 pide que la auditoría no pueda escribir.

## R29. El recorrido de la CSP, contra el stack (hallazgo C4-2)

**Qué cambió.** Desde F11a la sesión es obligatoria (F11-Q1): sin la API, el taller muestra el ingreso o la falla de la sesión, y ninguna vista. El recorrido de V2 «sin API» ya no es posible, y SC-004 suma las pantallas de cuenta y de administración (clarify del 2026-10-28).

**Decisión.**
- **Una configuración de Playwright aparte,** `qa/e2e/stack.config.ts`:
  - `testDir: qa/e2e/stack`, `baseURL` de `STACK_BASE_URL` y Chromium;
  - sin `webServer`, que en Playwright 1.63 es una opción de la configuración entera, no de un proyecto. Un proyecto dentro de `qa/e2e/playwright.config.ts` igual levantaría `vite preview`, y `npm run test:e2e` tomaría el spec.
- **El spec importa `test` y `expect` de `@playwright/test`,** no de `qa/e2e/fixtures`: el doble de la API de F11a es un fixture automático y simularía la sesión.
- **Las cuentas** se abren por el camino real, con `openAccount` de `qa/lib/api-account.ts`, que suma un parámetro `role` con `'student'` por omisión (`taller:invite` ya acepta `--role=admin`):
  - una de admin, para F12a;
  - una de estudiante, que el recorrido borra desde F11b.
- **Las pantallas:**
  - de F11a: el ingreso, el alta con una invitación, el restablecimiento con un enlace de `taller:invite` o de la consola, el aviso de privacidad, «Tu cuenta» y «Salir»;
  - de F11b: cambiar la contraseña, descargar los datos (con `Content-Disposition`) y borrar la cuenta;
  - de F12a: el diálogo «Administrar el taller», con la lista de cuentas, un filtro, la lista de invitaciones y una invitación por enlace.

  Se suman a las 8 vistas, los 5 enlaces, el editor y la celebración, con el mismo oyente de `securitypolicyviolation` y la consola.
- **Las dos aserciones, separadas.** Las violaciones de la CSP son 0 sin excepción. Los errores de consola son 0 salvo los que cada paso espera, con la forma de TR-11 (`/status of NNN/`, nunca `/Failed to load resource/`): el 419 del cierre por CSRF y, si aparece, el 423 de una reconfirmación.
- **Las fuentes de cada pantalla.** F11a y F12a tienen plan mergeado, con sus Page Objects (`qa/e2e/pages/access.ts`, `account.ts` y `admin.ts`) y sin estilos en línea (su FR-069 y su FR-054). F11b no tiene plan: sus pasos salen de su spec (FR-055 y FR-056), y S2 relee su plan cuando exista.
- **V2 (T004)** recorre lo que exista en ese momento contra el stack local, con su configuración descartable de Nginx montada. T021 es el recorrido de registro, con F11b y F12a ya en `master`.

## R30. `connect-src` sin Playgrounds (A4-Q2, hallazgo C4-10)

**Decisión.** El valor final es `connect-src 'self'` (A4-Q2; FR-032 y SC-003 de A4). C4 no espera a A4, y G2 tampoco (decidido por el usuario el 2026-10-28): si C4 abre antes, el código de los alumnos sigue yendo a los Playgrounds, como hoy, hasta que A4 los retire. T001 anota si A4 ya entró: no existe `frontend/src/shared/api/playground/` y `runtime-check` ya no está en `qa/run-checks.ts`.
- **Si A4 ya entró,** `headers.conf` sale con el valor final.
- **Si no,** sale con los dos hosts, y los checks lo atan al cliente:
  - `qa/nginx-headers-check.ts` acepta el valor con los Playgrounds sólo mientras exista `frontend/src/shared/api/playground/`, y exige el final cuando no existe;
  - `public-check.sh` hace la misma comprobación en el host.

Así, el commit de A4 que retira el cliente hace fallar `npm test` hasta que edite `headers.conf`. «El segundo en llegar los quita» deja de depender de la memoria de quien integra. Los dos valores están escritos a mano en los checks.

**Alternativas descartadas.**
- Que C4, o al menos G2, espere a A4: el usuario lo descartó el 2026-10-28.
- Dejar los Playgrounds sin regla: la CSP quedaría abierta si nadie se acuerda.

## R31. Qué espera cada tramo

| Tramo | Espera | Por qué |
| --- | --- | --- |
| T001 (la base) | A3 (y con ella F11a) y C3 (C3a, C3b y C3c) en `master` | Tocan los archivos que C4 edita: `docker/nginx/nginx.conf`, `docker/compose.yaml`, `docker/compose.preview.yaml`, `docker/mysql/`, `backend/api/scripts/{init-env,deploy,smoke}.sh`, `frontend/vite.config.ts`, `qa/build-check.ts` y `qa/lib/built-page.ts`. C3c espera el dominio, así que el dominio es una acción del usuario anterior a C4 |
| S2 (el recorrido de T021) | F11b y F12a en `master` | El recorrido suma sus pantallas. Son del front y no tocan los archivos de las ondas 1 y 2, así que T001 no las espera: anota su estado, y S2 se demora si no llegaron |
| T025 (G1) | Lo anterior, más la corrida de registro de B3 en verde sobre el contenido que se despliega | Es la condición de G2 que pidió el coordinador. Si B3 ya está integrada en T018, su servicio `audit` toma `taller_audit` ahí |
| Nunca | A4, D1c y F10 | A4 sólo cambia `connect-src` (R30), y G2 no la espera (el usuario, 2026-10-28) |

F11a llega a `master` en un solo PR, al final de sus unidades (TR-12). A3 y F12a se integran sobre `f11a/base`, así que en `master` llegan juntas o después de F11a.

## Verificaciones previas

Cinco supuestos de la spec no se pudieron probar al planificar. Se corren como spikes al empezar, antes de las tareas que dependen de ellos, y el resultado se anota en la línea «Resultado» de cada una (versiones, comandos y cifras). Cada una dice qué decide.

### V1. El módulo ACME en la imagen sin privilegios

**Pregunta.** ¿El módulo corre en la imagen de Nginx sin privilegios, con el disco de sólo lectura y un volumen de estado, con los desafíos llegando a los puertos internos 8080 y 8443, y renueva sin cortar con HTTP-01 y con TLS-ALPN-01?

**Cómo.**
1. `docker run --rm --entrypoint nginx <imagen base> -V`: la versión, `--with-compat`, `http_sub_module`, `http_v2_module`, `http_ssl_module` y la versión de OpenSSL.
2. Construir la etapa que extrae el `.so` y correr `nginx -t` con `load_module`.
3. Levantar el archivo de pruebas con Pebble (`httpPort` 8080, `tlsPort` 8443, `certificateValidityPeriod` de 180 segundos) y el `taller` público con `TALLER_DOMAIN=taller.test`, `ACME_DIRECTORY_URL` hacia Pebble y su CA de prueba como `ssl_trusted_certificate`.
4. HTTP-01: esperar la emisión; cargar una ráfaga continua de pedidos HTTPS nuevos (20 por segundo, cada uno un `curl` nuevo, durante 5 minutos, con `--resolve` y la raíz que da la API de administración de Pebble) y contar los que fallan y los números de serie distintos que ve.
5. TLS-ALPN-01: lo mismo con `ACME_CHALLENGE=tls-alpn-01`.
6. Reiniciar `taller`: no pide una orden nueva (lo muestra el registro de Pebble) y sirve con lo guardado.
7. Detener Pebble durante una renovación: el fallo y su causa quedan en el registro de errores, el certificado vigente sigue sirviendo y, al volver Pebble, se recupera.
8. Arranque con el volumen vacío: el 8443 rechaza el apretón de manos y no entrega un autofirmado; el 8080 responde el desafío.

**Pasa si.** Con al menos HTTP-01: emite sin intervención, el certificado cambia al menos dos veces sin reiniciar, 0 pedidos de la ráfaga fallan, el reinicio conserva el estado y el fallo se ve. Lo que haga TLS-ALPN-01 queda registrado.

**Decide.**
- Si HTTP-01 no llega al 8080, se prueba con puertos privilegiados dentro del contenedor y, si tampoco, pasa a Q1, opción B (R5).
- Si sólo TLS-ALPN-01 funciona, el desafío por omisión pasa a ser ese y el 80 queda en `127.0.0.1`.
- La versión del módulo y su digest quedan fijados.

**Dueño y momento.** N, en la onda 1, después del lote 1 de descargas. **Resultado.** Se anota al correrla.

### V2. La CSP con nonce y el editor

**Pregunta.** ¿La CSP de FR-013, con el nonce por respuesta, deja el editor y las vistas como hoy?

**Cómo.**
1. `nginx -V` con `http_sub_module`.
2. Sin `vite-plugin-singlefile` y con `html.cspNonce`, `npm run build`: lista de `dist/` con tamaños; `dist/index.html` sin `<script>` ni `<style>` en línea y con el marcador en cada etiqueta; si el CSS incluye fuentes en `data:` (`assetsInlineLimit`).
3. Servir con el Nginx del stack local y la CSP, con la configuración descartable y `dist/` montadas sobre la imagen (el prototipo de las tareas de N y F: si pasa, se conserva). Desde F11a hace falta el stack: sin `/api/` no hay sesión ni vistas (R29).
4. Chromium con Playwright (el de F1), con una cuenta de prueba: las 8 vistas, los 5 enlaces profundos, el editor (el tema con colores computados, la numeración de líneas, el espaciador `visibility: hidden`), la celebración y las pantallas de F11 y F12a que ya estén en `master`, con un oyente de `securitypolicyviolation` y la consola abierta.
5. Dos `GET /` seguidos: nonces distintos y sin `ETag` ni `Last-Modified`.
6. Firefox, si el usuario permite la descarga; si no, una pasada manual declarada.

**Pasa si.** 0 violaciones, el editor con su tema y su numeración, el espaciador oculto, nonces distintos y sin validadores.

**Decide.** Si pasa, Q3 queda como está. Si el editor pierde el tema, la decisión vuelve al usuario (Q3, opción C) y no se degrada en silencio. Si aparece una violación de fuentes o imágenes `data:`, se ajusta `assetsInlineLimit` o la política con el valor mínimo.

**Dueño y momento.** F, en la onda 1. **Resultado.** Se anota al correrla.

### V3. La IP que ve Nginx

**V3a, en local (K, onda 1).** Con un proyecto de prueba que publica `0.0.0.0:18443` y `0.0.0.0:18080`: `docker compose config` muestra los puertos con la dirección explícita; `ss -ltn` en el host (Linux) muestra `0.0.0.0:18443` y ningún `[::]:18443`; `docker info` informa el proxy de usuario y el IPv6 del daemon.

**V3b, en G2 (usuario, con el router abierto).** Desde un teléfono por datos móviles: el registro de Nginx muestra la IP pública del teléfono; seis ingresos fallidos agotan el límite desde el teléfono y no desde la red del hogar; y, si el host recibe IPv6, un pedido por IPv6 no recibe nada.

**Decide.** Si V3b muestra la IP del puente, se ajusta la publicación (por ejemplo, desactivar el proxy de usuario en el daemon) antes de seguir. **Resultado.** Se anota al correrla.

### V4. Los privilegios de `taller_backup` y el tiempo de restauración

**Cómo.**
1. Con el stack local arriba, con `taller_backup` real: `mysqldump` con las banderas de R14. Después, sacar privilegios de a uno (cada intento en una cuenta de prueba) y anotar el mínimo que funciona.
2. Comprobar `SHOW VARIABLES LIKE 'log_bin'` y, en la imagen de respaldo, `command -v flock curl zstd`.
3. Restaurar el volcado en un MySQL 9.7 descartable (tmpfs) y medir; repetir con un volumen sintético mayor (un MySQL aparte que se llena duplicando filas hasta unos 1 GiB y 5 GiB, sin tocar el stack).
4. Registrar tamaño crudo y comprimido, tiempo de volcado y de restauración, y la extrapolación al techo de 20 GB.

**Pasa si.** El volcado y la restauración terminan con el mínimo de privilegios; se registra el tiempo (el disparador es 1 hora).

**Decide.** La lista final de privilegios (`data-model.md`), el nivel de `zstd`, si `flock` está o hay que usar `mkdir`, y si el tiempo mantiene a `mysqldump` o adelanta el cambio de herramienta del ADR 0006 §9.

**Dueño y momento.** D, en la onda 1. **Resultado.** Se anota al correrla.

### V5. El destino de los respaldos

**Pregunta.** ¿El proveedor que elija el usuario ofrece lo que pide FR-036?

**Cómo, con las credenciales reales (el usuario las crea; el agente corre `probe-destination.sh` con la del host y sin la de lectura).**
1. Con la credencial del host: escribir un objeto de prueba (funciona), leerlo, listarlo y borrarlo (los tres se rechazan) y escribir otra vez sobre el mismo nombre (no destruye: con la credencial de lectura, el usuario ve las dos versiones).
2. Con `rclone copyto` y las banderas de R16: el envío funciona con una credencial de sólo `PutObject`.
3. Revisar la regla de expiración a 35 días de las versiones actuales y de las anteriores, y el país del almacenamiento (§13.14).

**Pasa si.** Escribir funciona; leer, listar y borrar se rechazan; sobrescribir conserva la versión anterior; la expiración está configurada.

**Decide.** Si no, el usuario elige otro proveedor o, sabiendo que no es afuera del sitio, Q2 en su opción B. **Dueño y momento.** B con el usuario, cuando exista la cuenta (acción 3), antes de G1. **Resultado.** Se anota al correrla.

## Consultas a Context7 (2026-10-28)

El servidor `mcp__context7__*` agotó la cuota del mes, así que se usó el segundo. Cada fila es una consulta, con la versión del lockfile o de la imagen contra la que se contrastó.

| Librería | Versión (lockfile o imagen) y la de Context7 | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| Vite | 8.3.2; `/vitejs/vite/v8.0.10` | `html.cspNonce` | Pone `nonce` en cada `<script>`, `<style>` y `<link>` de hoja y de precarga, e inyecta `<meta property="csp-nonce">`. El marcador lo tiene que reemplazar el servidor en cada pedido | No: confirma R8 |
| Vite | 8.3.2; `/vitejs/vite/v8.0.10` | `build.cssCodeSplit` y `build.rolldownOptions` | `cssCodeSplit: false` deja una sola hoja, y `rolldownOptions` pasa las opciones a Rolldown. Context7 no nombra `codeSplitting`: se leyó en los tipos de Rolldown 1.2.12 instalados (`false` incrusta las importaciones dinámicas en un solo módulo) | Sí: R25 y T011 |
| Playwright | 1.63.0; `/microsoft/playwright/v1.63.0` | `webServer` y `baseURL` | `webServer` es una propiedad de la configuración entera (`TestConfig.webServer`), y `baseURL` va en `use` | Sí: R29 y T021, con una configuración aparte |
| Docker Compose | v5.6.1 en el host; `/docker/compose/v5.5.1` | `docker compose run` y sus dependencias | `run` arranca los servicios de los que depende si están detenidos, y `--no-deps` lo evita. No dice que espere `service_completed_successfully` | Sí: `deploy.sh` corre `grants-users` aparte (R27) |
| Docker Compose | v5.6.1; `/websites/docker_compose` | `include` con un archivo que se suma por `-f` | Un archivo de `-f` puede modificar el modelo que arma un `include`. Las rutas relativas de los archivos que se suman se resuelven contra el primero de `-f`, no contra el propio | Sí: las rutas de `docker/compose.public*.yaml`, `compose.acme-test.yaml` y `compose.backup-test.yaml` se escriben desde la raíz (el primer archivo es `compose.yaml` de la raíz, que incluye `docker/compose.yaml`); la de `pebble.json` de T003 se corrige |
| Docker Compose | v5.6.1; `/docker/compose/v5.5.1` y después `/docker/docs` | `!override` y `!reset` al fusionar | La primera consulta devolvió la fusión de `-f` sin las etiquetas; la de `/docker/docs` (`reference/compose-file/merge.md`) confirma que `!override` reemplaza el atributo entero (el ejemplo es justo `ports`) y que `!reset []` o `!reset null` lo vacían. La documentación de `include` dice que un archivo que se suma modifica el modelo que arma el `include`, y las etiquetas son parte de esa fusión | No: confirma R1 y el `dns: !reset []` de T019 |
| Docker (el motor) | 29.9.2 en el host; `/docker/docs` | La publicación de puertos | Sin una dirección, un puerto se publica en todas las direcciones del host, IPv4 e IPv6; «to restrict a published port to IPv4 only, the address must be included», como `-p 0.0.0.0:8080:80`. El proxy de usuario (`docker-proxy`) no conserva la IP de origen | No: confirma R4, FR-001 y FR-027, y lo que V3 mide |
| Vitest | 5.0.3 (lockfile); `/vitest-dev/vitest/v5.0.3` | `test.projects` con `name`, `environment` e `include` | Cada proyecto toma los archivos de su `include`. En `frontend/vitest.config.ts`, `**/*.spec.ts` va al proyecto `node` y `**/*.spec.tsx` al `dom` (TR-6) | No: `csp-nonce.spec.ts` de T012 corre en `node`, con el doble mínimo de documento que ya pide |
| Pest | 5.3.0 (`backend/api/composer.lock`); `/pestphp/docs` (5.x) | `test`, `expect()->toBe()`, `toContain()` y `beforeEach` | La forma de los escenarios de `MigrateScriptTest` no cambia | No |
| CodeMirror (`@codemirror/view`) | 6.43.13; `/codemirror/view` | `EditorView.cspNonce` | Faceta de texto, gana el primer valor, por omisión `""`; existe desde la 6.17.0 | No: confirma T012 |
| Nginx | 1.30.5 (la imagen); `/websites/nginx` | `limit_req` con `burst` y `nodelay` | Lo que pasa la ráfaga se rechaza con `limit_req_status`. Las directivas se heredan sólo si el nivel no define las suyas | No |
| Nginx | 1.30.5; `/websites/nginx` | `limit_conn` | «In HTTP/2 and HTTP/3, each concurrent request is considered a separate connection». Una conexión cuenta sólo con la cabecera completa leída | Sí: R10 y R26 |
| Laravel | 13.34.0 (`composer.lock`); `/laravel/docs/__branch__13.x` | La verificación de CSRF con `Sec-Fetch-Site` | El middleware mira primero `Sec-Fetch-Site` y deja pasar `same-origin`; si no, cae en el token. Los navegadores mandan esa cabecera en contextos seguros | No: confirma R9. El recorrido de T021 lo comprueba en `127.0.0.1` |
| MySQL | 9.7 (la imagen); `/websites/dev_mysql_doc` (el manual 26.7) | Los privilegios por columna | `SELECT` hace falta para las columnas del lado derecho de una asignación de `UPDATE` y para las del `WHERE` de `UPDATE` y `DELETE` | Sí: la sonda de `UPDATE` de la matriz pasa a `SET c = NULL WHERE 1 = 0`. Con `SET c = c`, `taller_mail` daría 1143 aunque tenga `UPDATE (sent_at)` (data-model §3, T015) |

## Mediciones de sólo lectura (2026-10-28)

Sin ejecutar código del repositorio, sin Docker y sin el build.

| Qué | Valor |
| --- | --- |
| Base | `master` en `431c9d90` |
| Bloques de la API en `docker/nginx/nginx.conf` | Cuatro: `^~ /api/`, `^~ /api/runs` (192k), `= /api/sync` (2m) y `= /api/progress/import` (24m). Cada uno repite las tres `add_header` de seguridad y `X-Request-Id` |
| Límites de C3a | Zona `api`: 50 r/s, ráfaga de 400, `nodelay`. Zona `session`: 5 r/s, ráfaga de 60. `worker_connections 256`. Sin `limit_conn` |
| `style=` en las plantillas legacy | 4: `frontend/app.js:302` (`margin:22px 0 0`), `frontend/lab.js:622` (dos: `margin-top:20px` y `font-size:12px;cursor:pointer`) y `frontend/systems.js:210` (el fondo del SVG, del contenido) |
| `style.cssText` en el código propio | 2: `frontend/lab.js:717` y `frontend/src/shared/lib/celebration.ts:31` |
| Lo que cambia con los ports | F5 (`impl-f5`, `efaf39b2`) pasa el de `systems.js` a `style={{ background: safe.background }}` en `frontend/src/pages/systems/ui/SceneView.tsx:85`. F7b (plan) pasa los dos `style=` y el `cssText` de `lab.js` a reglas de `pages/lab/ui/lab-page.css`. F8 (plan) muda el de `app.js` con el CSS de Método. Después de los tres, en el código propio quedan el `style={}` de F5 y el `cssText` de `celebration.ts`, más el `<style>` y el `cssText` de CodeMirror |
| El comando del conteo, para T001 | `grep -rnoE 'style="[^"]*"\|style=\{\{' frontend/*.js frontend/src --include='*.js' --include='*.ts' --include='*.tsx' \| grep -v '\.spec\.'` y `grep -rn 'cssText' frontend/*.js frontend/src --include='*.js' --include='*.ts' --include='*.tsx' \| grep -v '\.spec\.'` |
| Tablas en las migraciones | 50 definitivas, más `migrations` de Laravel; `cache_next` y `cache_locks_next` son de paso (un `RENAME TABLE`). Todas están en la matriz de data-model §3, que suma `mail_jobs` de C3c (comparado con un script sobre `CREATE TABLE` y `Schema::create`) |
| `frontend/src/index.html` | 4 381 bytes: el tope de 20 000 caracteres para `dist/index.html` (R25) deja lugar para los `nonce` y la `<meta>` |
| `BOOT_SIZE_LIMIT` | 1 500 000 en `qa/build-check.ts:11`. La medida del `dist/` con A3 y F11a la toma T001: la última publicada es la de F2b, 1 141 337 caracteres, más los +60 000 que F11a calcula |
| Versiones | Vite 8.3.2, Rolldown 1.2.12, `vite-plugin-singlefile` 2.3.3, `@codemirror/view` 6.43.13, React 19.2.8, `@playwright/test` 1.63.0 y Vitest 5.0.3 (`package-lock.json`); Laravel 13.34.0 y Pest 5.3.0 (`backend/api/composer.lock`); Docker 29.9.2 y Compose v5.6.1 en el host de planificación |
| La raíz de Compose | `compose.yaml` de la raíz es `name: taller-rust-go` más un `include` de `docker/compose.yaml` con `project_directory: .` |
| `phpunit.xml` | Fuerza `DB_USERNAME=root` contra `mysql-test`, así que el servicio `test` no depende del usuario de `x-laravel-base-env` |
