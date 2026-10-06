# Research: C4 · Exposición

**Input**: [spec.md](./spec.md) con su clarify del 2026-10-06, el ADR 0004 §1, el ADR 0006, el código de C3a (rama `feat/c3a-identidad`, PR #24) y los planes de A2 y B2 y la spec de C3b/C3c (ramas hermanas). Cada decisión dice qué se eligió, por qué y qué se descartó. Las que la spec no fija y el plan completó están en la primera tabla, para que el coordinador las vea juntas.

Las referencias «R1» a «R24» son secciones de este archivo. Los requisitos del ADR 0006 se citan como «§9» o «D37». «G1» y «G2» son los dos tramos de la compuerta de salida (R22).

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

## R1. Cómo se activa el modo público

**Decisión.** Un archivo de Compose que se suma al de hoy, `docker/compose.public.yaml`, y un script, `backend/api/scripts/public.sh`, que es la única forma documentada de usarlo. El script fija `-p taller-publico`, `-f compose.yaml -f docker/compose.public.yaml` y `--env-file .env`, y se niega a seguir, con un mensaje en español que dice qué falta, si falta `TALLER_DOMAIN`, `ACME_CONTACT`, `ACME_ACCEPT_TOS=yes`, `BACKUP_AGE_RECIPIENTS` o las credenciales del destino. El archivo repite la comprobación con `${VAR:?…}`, de modo que `docker compose config` también falla cerrado.

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

**Decisión.** `docker/nginx/nginx.conf` sigue siendo el archivo de los dos modos y conserva ahí todas las ubicaciones, incluidos los bloques `location ^~ /api/` y `location ^~ /api/runs`. Lo que cambia por modo son tres archivos de `/etc/nginx/taller.d/`, que `nginx.conf` incluye en un punto fijo:

| Archivo | Dónde lo incluye `nginx.conf` | Local (en la imagen) | Público (renderizado) |
| --- | --- | --- | --- |
| `main.conf` | Al principio, en el contexto principal | Vacío | `load_module modules/ngx_http_acme_module.so;` |
| `http.conf` | En `http {}`, después de los mapas | `map $scheme $hsts_value { default ""; }` | El `map` de HSTS por esquema, `acme_shared_zone` y `acme_issuer`, los servidores por omisión, el del puerto 80 y el de salud |
| `server.conf` | Dentro del servidor de la aplicación | `listen 8080;` | `listen 8443 ssl; http2 on; server_name <dominio>;`, las directivas TLS y la fuente del certificado |

Las cabeceras de seguridad están en `docker/nginx/headers.conf` (R7), que `nginx.conf` incluye en el servidor y en cada ubicación que define cabeceras propias.

**Por qué.**
- El check de B2, `qa/nginx-api-blocks-check.ts`, extrae de `docker/nginx/nginx.conf` los dos bloques de `/api/` y exige que sus directivas sean las mismas y en el mismo orden. Moverlos a otro archivo lo rompería. Con la línea `include …/headers.conf;` en los dos bloques, el check sigue valiendo.
- Los dos modos ejecutan las mismas ubicaciones: lo que se prueba en local, con el recorrido de la User Story 3, es lo que se sirve en público.
- El modo local sigue siendo un archivo estático, sin renderizado, como hoy.

**Alternativas descartadas.** Dos archivos completos (el bloque de `/api/` quedaría en tres copias con el de B2); mover las ubicaciones a un archivo incluido (rompe el check de B2); renderizar también el modo local (agrega un paso donde no hace falta).

## R3. Cómo entra el dominio a la configuración

**Decisión.** Un entrypoint propio, `docker/nginx/public/entrypoint.sh`, que en el modo público reemplaza al `ENTRYPOINT ["nginx"]` del Dockerfile. Valida las variables, renderiza las plantillas con `envsubst` a `/etc/nginx/taller.d/` (un tmpfs con el dueño de Nginx, montado por el archivo público), corre `nginx -t` y hace `exec nginx -g 'daemon off;'`.

- `envsubst` recibe una lista explícita de variables (`${TALLER_DOMAIN} ${ACME_CONTACT} ${ACME_DIRECTORY_URL} ${ACME_CHALLENGE} ${ACME_PROFILE_LINE} ${HSTS_MAX_AGE}`), así `$request_id` y las demás variables de Nginx quedan intactas.
- Cada variable se valida con una expresión regular antes de renderizar (el dominio, `[a-z0-9.-]`; el contacto, un email; el directorio, una URL `https://`; el desafío, `http-01` o `tls-alpn-01`; HSTS, sólo dígitos): lo que se escribe en la configuración no puede inyectar directivas.
- `ACME_PROFILE_LINE` la arma el script: `profile <nombre>;` si `ACME_PROFILE` no está vacía, y nada si lo está.
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
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'nonce-$request_id'; style-src-attr 'unsafe-inline'; connect-src 'self' https://play.rust-lang.org https://play.golang.org; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy no-referrer always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()" always;
add_header Cross-Origin-Opener-Policy same-origin always;
```

- `nginx.conf` lo incluye en el servidor y en **cada** ubicación que defina una `add_header` propia (la de `/api/`, la de `index.html`, la de los archivos con huella, `@too_many_requests` y `@csrf_rejected`). Una ubicación con cabeceras propias no hereda las del servidor, y por eso hoy `@too_many_requests`, que sólo repite `X-Content-Type-Options`, responde sin CSP ni `Referrer-Policy` (hallazgo para C3a y B2).
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
| `limit_conn_zone $binary_remote_addr zone=perip:10m` y `limit_conn perip 300` | 300 por IP | Algo más que las 240 del peor aula: una IP sola no agota un proceso y hace falta más de tres para saturarlo. Se responde con `limit_conn_status 429`, que cae en el mismo JSON de `@too_many_requests` |
| `client_header_timeout` | 10 s | Un navegador manda la cabecera completa en milisegundos; una conexión que la gotea se cierra |
| `client_body_timeout` | 20 s | Es el tiempo entre dos lecturas, no del cuerpo entero; alcanza para los 24 MiB de la importación de D1 |
| `send_timeout`, `keepalive_timeout` | 30 s | |
| `reset_timedout_connection on` | | Libera el socket de lo que venció |

Se prueban con conexiones lentas desde un contenedor y con un aula simulada desde otro (los dos con IP distintas), sin descargar nada: la imagen `taller` trae `wget` y `nc` de BusyBox. Los valores se revisan con una medición real en G2 (R22).

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
- `XSRF-TOKEN` y la cookie de «recordarme» **no** se prefijan: el nombre de la primera lo fija `PreventRequestForgery` y lo lee el cliente de A3 por nombre, y el de la segunda sale del guard de sesión (`remember_web_<hash>`). Prefijarlas exige reescribir el middleware y el cliente por un beneficio chico: el token tiene que coincidir con el de la sesión, y un subdominio que pise `XSRF-TOKEN` no lo conoce. Las dos llevan `Secure` porque Laravel toma `session.secure` para todas las cookies que arma.
- Laravel sabe que la conexión es segura sin `trustProxies`: `fastcgi_params` pasa `HTTPS $https if_not_empty`.
- Los links de invitación y de recuperación se arman desde `APP_URL`, nunca desde `Host` (C3a).

**Por qué la base y no el archivo público.** Un servicio nuevo de Laravel (el worker de B2, el de C3c) nace con el mismo entorno y no puede olvidarse de las cookies.

## R12. Usuarios de MySQL

**Decisión.**
- **Nombres.** `taller_app`, `taller_runs`, `taller_mail`, `taller_migrate` y `taller_backup`, con host `%` (D21 ya usa `taller_mail`; los roles de Q5 son `app`, `runs`, `mail`, `migrate` y `backup`).
- **Los dos modos.** FR-030 no se limita al modo público, y lo que se prueba en la CI es lo que se despliega. `x-laravel-env` deja de fijar `DB_USERNAME` y `DB_PASSWORD` y cada servicio los fija con la contraseña de su rol (`APP_DB_PASSWORD`, `RUNS_DB_PASSWORD`, `MAIL_DB_PASSWORD`, `MIGRATE_DB_PASSWORD`, `BACKUP_DB_PASSWORD`). `x-laravel-test-env` y `phpunit.xml` no cambian: las pruebas usan `mysql-test` con root. El servicio `mysql` deja de crear el usuario `taller` (se quitan `MYSQL_USER` y `MYSQL_PASSWORD`), y `init-env.sh` deja de generar `MYSQL_PASSWORD`; un `.env` viejo conserva su línea, sin efecto.
- **Dos fases, por una regla del manual de 9.7.** «MySQL permite conceder privilegios sobre bases de datos o tablas que no existen. Para las tablas, los privilegios que se conceden tienen que incluir `CREATE`» (`GRANT`). Entonces los permisos por tabla de `app`, `runs` y `mail` no pueden concederse en el inicio de un volumen nuevo, antes de que `migrate` cree las tablas, sin darles `CREATE`. La fase `users` (cuentas, los privilegios de nivel base de `migrate` y los globales y de base de `backup`) corre antes de migrar; la fase `tables`, después.
- **Quién corre qué.**
  - En un volumen nuevo, el inicio de MySQL corre la fase `users`. `migrate` crea las tablas. Un servicio nuevo, `grants`, con root y sin perfil, corre la fase `tables` y los servicios que dependían de `migrate` pasan a depender de `grants`.
  - `db-grants` conserva el perfil `ops` y su nombre, porque `smoke.sh` de C3a comprueba que no se levanta sin ese perfil y FR-002 pide que los checks de hoy pasen sin editarlos. Corre las dos fases: es el comando manual y el primer paso de `deploy.sh` en un volumen que ya existía. `grants` y `db-grants` comparten un ancla.
  - Orden de `deploy.sh`: construir → `db-grants` (usuarios, y tablas que ya existían) → `migrate` → `grants` (las tablas nuevas) → `up` → `db-grants` otra vez (retira a `taller`, R13).
- **Plan alternativo si el coordinador prefiere un solo servicio.** `db-grants` sin perfil, en la cadena, y se edita la comprobación de C3a. Se descartó por FR-002.
- **Las tablas.** `data-model.md` clasifica cada tabla de C3a y de B2 y fija la regla para las de D1, C3b y C3c (R24). Una prueba falla si `information_schema` tiene una tabla que la matriz no nombra.
- **Una cuenta, un conjunto de privilegios.** `taller_migrate` no tiene `GRANT OPTION`, ni `CREATE ROUTINE`, `EVENT`, `TRIGGER` ni vistas: el esquema no los usa y una migración que los necesite edita la matriz a propósito. `FOR SHARE` pide sólo `SELECT` y `FOR UPDATE`, `SELECT` más `UPDATE`, `DELETE` o `LOCK TABLES` (manual de 9.7, lecturas con bloqueo): B2 toma `users FOR SHARE`, y los roles que bloquean con `FOR UPDATE` tienen `UPDATE` sobre esa tabla.

**Alternativas descartadas.** Permisos de base con `partial_revokes` (sólo excluyen bases, no tablas); un esquema aparte para el contenido (cambia la base de C2 y todo lo que la usa); darle `GRANT OPTION` a `migrate` (FR-031: no puede conceder); conceder con `CREATE` sobre tablas inexistentes (le daría a `app` el poder de crearlas).

## R13. Las contraseñas y la convergencia de `db-grants.sql`

**Decisión.** `docker/mysql/db-grants.sql` sigue siendo el único archivo de usuarios y privilegios, con dos secciones marcadas (`-- @phase users` y `-- @phase tables`) y marcadores `@@APP_DB_PASSWORD@@` (uno por rol). `docker/mysql/apply-grants.sh [--phase users|tables|all] [--host <h>]` valida cada contraseña (`[A-Za-z0-9._~-]{24,128}`), sustituye los marcadores con `sed`, antepone `SET SESSION sql_log_bin = 0;` (ni siquiera el hash de una contraseña entra al binlog) y entrega el SQL por la entrada estándar de `mysql`, nunca por la línea de comandos. El inicio de un volumen nuevo lo corre con `--phase users` y el socket (el servidor temporal sólo escucha ahí); `grants` y `db-grants`, con `--host mysql`. Es la interfaz que C3b/C3c necesitan para su usuario `taller_mail` (su FR-028).

- **Cada corrida vuelve a fijar las contraseñas:** `CREATE USER IF NOT EXISTS …` y `ALTER USER … IDENTIFIED BY …`. Rotar una contraseña es cambiar `.env` y correr `db-grants`.
- **Los privilegios sólo se suman.** Un archivo que también quitara tendría una ventana, entre el `REVOKE` y el `GRANT`, en que un servicio vivo recibe el error 1142. Lo que sobra al achicar la matriz se revoca con una línea explícita en el mismo cambio, y la prueba de la matriz (`SHOW GRANTS` contra la matriz, en el stack desplegado) detecta un volumen al que esa línea no llegó.
- **El retiro de `taller`.** Al final de la fase `tables`, una sentencia preparada revoca todos los privilegios del usuario `taller` sólo si existe y ninguna sesión suya está conectada (`performance_schema.threads`). La primera corrida de un despliegue sobre un volumen viejo la encuentra con las sesiones de los servicios todavía anteriores y no revoca; la última, después del `up`, sí. Con un volumen nuevo no hay usuario `taller`.
- **Los privilegios de C3a** (`SELECT` sobre `performance_schema.events_transactions_current`) pasan de `taller` a `taller_migrate`.

## R14. Los privilegios del respaldo

Del manual de 9.7 (`mysqldump` y `SHOW BINARY LOG STATUS`): `--source-data` envía `SHOW BINARY LOG STATUS`, que exige `REPLICATION CLIENT`, y exige `RELOAD`; `PROCESS` hace falta salvo con `--no-tablespaces`; `--routines` exige `SHOW_ROUTINE` (en la tabla del manual, «SHOW CREATE ROUTINE») y `--events`, `EVENT`; los triggers exigen `TRIGGER`. FR-031 de la spec nombraba `RELOAD` pero no `REPLICATION CLIENT`.

**Decisión.** `taller_backup`: globales `RELOAD` y `REPLICATION CLIENT`; sobre `taller.*`, `SELECT` y `SHOW VIEW`. El volcado usa `--single-transaction --source-data=2 --no-tablespaces --skip-triggers --hex-blob`, sin `--routines` ni `--events`. `TRIGGER` y `EVENT` son privilegios de escritura (crear triggers y eventos), así que no se le dan a un usuario que no puede escribir. El esquema no tiene triggers, rutinas ni eventos, y la prueba de la matriz lo exige (lee `information_schema` como root): quien los cree edita el respaldo a propósito. V4 parte de este conjunto, saca privilegios de a uno y anota el mínimo que funciona.

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

**G1, antes de abrir el reenvío.** FR-033 en verde; FR-043 en local con un certificado de prueba y con Pebble; el recorrido de la User Story 3, sin violaciones de CSP; la restauración (a) presenciada por el usuario y el simulacro (b) hechos; HSTS en su escalón inicial; el destino verificado (V5); y C3a, C3b y C3c entregados, con una cuenta admin y el aviso de privacidad vigente.

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
- De C3b/C3c: `account_deletions`, `taller:reapply-deletions` y `worker-mail` con su usuario.

**Deja, y son hallazgos para quien integra** (el resumen está en el informe del plan):
- C3a: la ubicación `@too_many_requests` pierde la CSP y `Referrer-Policy`; el DNS cerrado de `taller` no sirve para la exposición; el cierre de sesión por CSRF.
- B2: su check de bloques de Nginx debe seguir leyendo `docker/nginx/nginx.conf` (C4 lo respeta).
- C3b y C3c: el mecanismo de contraseñas de `db-grants.sql` (R13), el formato TSV del libro (R15) y que los permisos de `mail` son de la fase `tables` (R12).
- A2 y A3: C4 cambia `built-page.ts`; A3 tiene que retirar el puente antes de C4.
- La hoja de ruta: C4 depende de A3, C3a, C3b y C3c; ya no espera a F5, F7 ni F8; suma el simulacro de recuperación, el comando de estado, el job de CI y `docs/operacion-publica.md`.

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
3. Servir con el Nginx local y la CSP (el prototipo de las tareas de N y F: si pasa, se conserva).
4. Chromium con Playwright (el de F1): las 8 vistas, los 5 enlaces profundos, el editor (el tema con colores computados, la numeración de líneas, el espaciador `visibility: hidden`) y la celebración, con un oyente de `securitypolicyviolation` y la consola abierta.
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
