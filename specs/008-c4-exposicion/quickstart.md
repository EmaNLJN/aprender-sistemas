# Quickstart: validar C4 de punta a punta

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [contracts/http.md](./contracts/http.md) y [contracts/console.md](./contracts/console.md). Es una guía de validación: qué correr y qué tiene que pasar. El detalle de cada contrato está en los contratos, no acá. **Nada de esto se corrió al planificar**: los comandos son la referencia que las tareas del plan convierten en checks.

En un worktree, cada comando de Docker lleva su propio `COMPOSE_PROJECT_NAME=<nombre-del-worktree>` en la misma línea (`backend/api/AGENTS.md`); el modo público fija el suyo.

## Prerrequisitos

```sh
sh backend/api/scripts/init-env.sh          # suma las cinco contraseñas de rol si faltan
```

Para los escenarios 4 a 9, un `.env` de prueba con `TALLER_DOMAIN=taller.test`, `ACME_CONTACT=ops@taller.test`, `ACME_ACCEPT_TOS=yes` y una clave `age` de prueba en `BACKUP_AGE_RECIPIENTS` (los checks los arman solos con valores de prueba; la clave la genera `age-keygen`, ya dentro de la imagen de respaldo).

## 1. El modo local sigue igual (FR-002, SC-012)

```sh
COMPOSE_PROJECT_NAME=c4-local docker compose up --build -d --wait
docker compose -p c4-local port taller 8080       # 127.0.0.1:8080
npm run api:smoke
npm run api:content:check
sh backend/api/scripts/deploy-check.sh
npm run api:test && npm run api:test:down
```

**Esperado:** los cuatro pasan sin editar sus archivos; el único puerto publicado es `127.0.0.1:8080`; `curl -sI http://127.0.0.1:8080/` trae las seis cabeceras (sin `Strict-Transport-Security`) y la CSP con un nonce. En un volumen que ya existía antes de C4, `docker compose --profile ops run --rm db-grants` (o `deploy.sh`) crea los usuarios nuevos antes del primer `up`.

## 2. La configuración pública, sin levantar nada (FR-001 a FR-003, SC-011)

```sh
sh backend/api/scripts/public.sh config > /dev/null; echo $?                       # 64 sin las variables
TALLER_DOMAIN=taller.test ACME_CONTACT=ops@taller.test ACME_ACCEPT_TOS=yes … sh backend/api/scripts/public.sh config
docker compose -p taller-publico -f compose.yaml -f docker/compose.public.yaml config --format json | jq '.services | map_values(.ports // [])'
```

**Esperado:** sin las variables sale con 64 y dice cuál falta; con ellas, sólo `taller` tiene `ports`, con `0.0.0.0:80→8080` y `0.0.0.0:443→8443` (con `PUBLIC_HTTP_BIND=127.0.0.1`, el 80 en `127.0.0.1`); el nombre del proyecto es `taller-publico` aunque la terminal exporte otro `COMPOSE_PROJECT_NAME`; todo servicio tiene `logging.options.max-size`.

## 3. Lo estático, en `npm test` (FR-013, FR-015, FR-017, FR-019, FR-020)

```sh
npm run build && npm test
node qa/nginx-headers-check.ts
node qa/csp-guard-check.ts
```

**Esperado:** pasan. Y fallan, citando archivo y línea, ante un `<script>` o un `<style>` en línea que se agregue a `frontend/src/index.html`, ante una `add_header` sin `include …/headers.conf;` en `docker/nginx/` y ante un valor de cabecera distinto del de FR-013.

## 4. El stack público con un certificado de prueba (FR-043, FR-010)

```sh
npm run public:check
```

**Esperado:** el check levanta `docker/compose.public-test.yaml` con un certificado de prueba y valida, una por una, las 12 clases de respuesta de [contracts/http.md](./contracts/http.md) (las seis cabeceras, una sola vez), el 301 con el nombre configurado aunque llegue otro `Host`, el rechazo de una conexión por la IP o con otro nombre, los nombres y atributos de las cookies, TLS (1.0 y 1.1 rechazados, 1.2 y 1.3 con las suites de la guía, sin tickets, HTTP/2), `X-Forwarded-For`, `Forwarded` y `X-Real-IP` falsos que no cambian la IP del registro ni del límite, dos IP que cuentan por separado, las conexiones lentas de una IP que no frenan a otras, y que `/content/` y `/content/curriculum.<versión>.json` dan 404 y ningún marcador de `curriculumMarkers()` está en la imagen.

## 5. El recorrido en un navegador (FR-018, SC-004)

```sh
npx playwright test --config qa/e2e/playwright.config.ts --project csp-walk
```

**Esperado:** con el stack local arriba y una cuenta de prueba (la de `qa/lib/api-account.ts`), las 8 vistas, los 5 enlaces profundos, el editor (con su tema y su numeración de líneas, el espaciador oculto) y la celebración dan 0 `securitypolicyviolation` y 0 errores de consola. Dos `GET /` seguidos traen nonces distintos y ningún `ETag`. Firefox, sólo si el usuario permitió la descarga; si no, una pasada manual declarada.

## 6. Los usuarios de MySQL (FR-030 a FR-033, SC-007)

```sh
npm run api:grants:check
```

**Esperado:** para cada rol, las sondas que la matriz concede pasan y las demás fallan con el error 1142, 1143 o 1044; un DDL, un `GRANT`, `FILE` y `mysql.*` fallan para todos; `SHOW GRANTS` coincide con `qa/fixtures/mysql-roles.json`; ningún servicio está conectado como root o como `taller`; el esquema no tiene triggers, rutinas ni eventos; todas las tablas están en la matriz. Después, con un volumen que tiene al usuario `taller`: `sh backend/api/scripts/deploy.sh` deja a los servicios con sus usuarios sin dejar de servir (`curl` a `/api/up` en bucle durante el despliegue: 0 fallos), y `SHOW GRANTS FOR 'taller'@'%'` queda en `USAGE`. Con un volumen nuevo, `docker compose up --build -d --wait` arranca sin pasos manuales.

## 7. La emisión y la renovación con Pebble (FR-006 a FR-010, SC-002)

```sh
npm run public:acme-check
```

**Esperado**, con HTTP-01 y con TLS-ALPN-01: el certificado se emite sin intervención, cambia dos veces sin reiniciar con 0 pedidos fallidos de una ráfaga continua, el reinicio de `taller` no pide una orden nueva, una renovación que falla (Pebble detenido) deja el motivo en el registro de errores y el certificado vigente sigue sirviendo, y con el volumen vacío el 443 rechaza el apretón de manos y no entrega uno autofirmado.

## 8. El respaldo y la restauración (FR-034 a FR-042, SC-008, SC-009)

```sh
npm run public:backup-check                          # contra un S3 local
sh backend/api/scripts/restore-check.sh --identity <clave.age> --remote-env <lectura.env>   # parte (a), en la máquina del usuario
sh backend/api/scripts/restore-check.sh --pitr       # parte (b), en el host
sh backend/api/scripts/public.sh status
```

**Esperado:** el volcado sale cifrado y sólo `age` con la clave privada lo abre; con el destino caído el cifrado queda en el spool y el fallo se ve en `status`; un despliegue mientras corre un volcado espera y migra después, y un volcado que le toca durante un despliegue se posterga, y los dos terminan sin fallos; la restauración (a) termina con 0 diferencias frente al manifiesto, reaplica el libro y mide el tiempo (una hora o menos con el volumen de hoy); el simulacro (b) deja `sessions` con al menos 20 filas más que el volcado. Con la credencial del host, `probe-destination` da `ok` sólo en escribir y sobrescribir (SC-009).

## 9. El cierre de sesión por CSRF, en un navegador real (FR-025)

Con el stack local (el escenario de C3a: la página del atacante en `http://localhost:8095`, el taller en `http://127.0.0.1:8094`): iniciar sesión en el taller, enviar desde la página del atacante un formulario `POST` a `/api/auth/logout` y recargar el taller.

**Esperado:** la respuesta es 419 `csrf_token_mismatch`, no trae `Set-Cookie`, y el taller sigue con la sesión abierta. Un `POST` del mismo origen con `X-XSRF-TOKEN` sigue funcionando.

## 10. La compuerta G1 (FR-044)

1. Los escenarios 1 a 9 en verde, con el resultado anotado.
2. La restauración (a) presenciada por el usuario, y el simulacro (b).
3. `probe-destination` con la credencial real (V5) y la expiración de 35 días comprobada.
4. C3a, C3b y C3c entregados, con una cuenta admin creada y el aviso de privacidad vigente.
5. HSTS en 300 y la lista de lo que el usuario hizo (CGNAT, dominio, cuenta del destino, claves).

## 11. G2: abrir (usuario y coordinador)

1. DNS con el registro A (y ninguno AAAA); el monitor externo creado.
2. Con `ACME_DIRECTORY_URL` de staging: `sh backend/api/scripts/public.sh up`, y el router reenvía el 80 y el 443 (sólo el 443 con TLS-ALPN-01).
3. El certificado de staging se emite; `public.sh status` lo muestra; `public-check.sh` corre contra el dominio real.
4. Desde datos móviles: abrir `https://<dominio>`, aceptar una invitación (creada con `taller:invite`), ingresar y recorrer las vistas (SC-001), y confirmar que el registro de Nginx muestra la IP pública del teléfono (V3b).
5. Un escaneo de puertos desde otra red: sólo el 443 y, con HTTP-01, el 80 (SC-011).
6. Pasar a producción (`ACME_DIRECTORY_URL` por omisión), esperar el certificado y subir los escalones de HSTS según su condición.

## 12. A los 35 días (SC-010)

`probe-destination` o la consola del proveedor: la expiración configurada a 35 días, al menos 7 copias diarias y 4 semanales y ninguna de más de 35 días. Hasta entonces se anota como **evidencia pendiente**, no como entregado.
