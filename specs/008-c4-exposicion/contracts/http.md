# Contrato HTTP de C4: cabeceras, cookies, redirecciones y TLS

**Input**: [spec.md](../spec.md) (FR-004, FR-005, FR-012 a FR-015, FR-021, FR-024, FR-025 y FR-043), [research.md](../research.md) (R6 a R11) y [data-model.md](../data-model.md). Es lo que se ve desde afuera. Lo comprueba `public-check.sh` (R7) y, en lo estático, `qa/nginx-headers-check.ts` y `qa/csp-guard-check.ts`. Lo que A3, A4, B2 y D1 pueden suponer está al final.

## Las seis cabeceras

Cada respuesta las lleva, una sola vez, con estos valores exactos. `Strict-Transport-Security` sale sólo por HTTPS.

| Cabecera | Valor |
| --- | --- |
| `Strict-Transport-Security` | `max-age=<HSTS_MAX_AGE>`; sin `preload` ni `includeSubDomains`; sólo en las respuestas del 8443 |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'nonce-<$request_id>'; style-src-attr 'unsafe-inline'; connect-src 'self' https://play.rust-lang.org https://play.golang.org; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

**El nonce.** `<$request_id>` son 32 caracteres hexadecimales distintos en cada respuesta. El mismo valor reemplaza `__CSP_NONCE__` en el cuerpo de `/index.html`, y la CSP de esa respuesta lo lleva. Las respuestas de `/api/` y las de los archivos con huella llevan un nonce que nadie usa.

**A4 y los Playgrounds.** Los dos `https://play.*` de `connect-src` los quita A4 al retirar el cliente de Playgrounds, con una sola línea de `docker/nginx/headers.conf`.

## Las clases de respuesta

`public-check.sh` pide una URL de cada una y compara las seis cabeceras, una por una.

| # | Clase | Pedido de ejemplo | Estado | Notas |
| --- | --- | --- | --- | --- |
| 1 | El HTML | `GET /` | 200 | `Cache-Control: no-cache`; sin `ETag` ni `Last-Modified`; el nonce está en el cuerpo y en la CSP |
| 2 | Un archivo con huella | `GET /assets/<nombre>-<huella>.js` | 200 | `Cache-Control: public, max-age=31536000, immutable` |
| 3 | Un 404 de Nginx | `GET /no-existe` | 404 | |
| 4 | `/api/` con éxito | `GET /api/up` | 200 | |
| 5 | `/api/` con un 404 de Laravel | `GET /api/no-existe` | 404 | JSON `{message, code}` |
| 6 | `/api/` con un 419 de Laravel | `POST /api/auth/login` desde el mismo origen, sin token | 419 | Con la cookie de sesión que Laravel abre |
| 7 | La salud | `GET /healthz` | 200 | `ok` |
| 8 | La redirección del puerto 80 | `GET http://<dominio>/ruta?x=1` | 301 | `Location: https://<dominio>/ruta?x=1`; sin HSTS (sólo por HTTPS) |
| 9 | El cuerpo demasiado grande | `POST /api/runs` con más de 192 KiB | 413 | De Nginx |
| 10 | El límite | Una ráfaga a `/api/session` | 429 | JSON `{message, code: too_many_requests}` con `Retry-After` |
| 11 | El 502 | `GET /api/up` sin `php` | 502 | De Nginx |
| 12 | El cierre de sesión por CSRF | `POST /api/auth/logout` con `Sec-Fetch-Site: cross-site` | 419 | JSON `csrf_token_mismatch`; **sin `Set-Cookie`** |

Las clases 1 a 8 son las de SC-003. La 8 no lleva HSTS; las demás, si salen por HTTPS, sí.

## La política de caché del front

- `index.html`: `Cache-Control: no-cache`, sin validadores y con el nonce de la respuesta (FR-021).
- Los archivos de `dist/assets/`: `Cache-Control: public, max-age=31536000, immutable`.
- El resto de `dist/` (los avisos de licencia, el ícono): los valores por omisión de Nginx, con las seis cabeceras.
- Los contenidos del currículo sólo salen por `/api/` con sesión (FR-022): `/content/` y `/content/curriculum.<versión>.json` responden 404.

## El cierre de sesión por CSRF (FR-025)

Una modificación (todo lo que no sea `GET`, `HEAD` ni `OPTIONS`) que declara `Sec-Fetch-Site: cross-site` o `same-site` recibe, antes de PHP:

```http
HTTP/1.1 419
Content-Type: application/json

{"message":"La página venció: recargala e intentá de nuevo.","code":"csrf_token_mismatch"}
```

con las seis cabeceras y sin `Set-Cookie`. Sin `Sec-Fetch-Site` (un cliente que no es un navegador, o uno viejo) o con `same-origin` o `none`, el pedido sigue el camino normal: el token de CSRF de Laravel.

## El puerto 80 y el nombre único

- Con HTTP-01, el 80 responde sólo (a) `/.well-known/acme-challenge/<token>`, que contesta el módulo, y (b) un 301 a `https://<dominio configurado>$request_uri`, armado con el nombre de la configuración y nunca con `Host`. Con TLS-ALPN-01 el 80 no responde desde afuera.
- Un pedido HTTP con otro `Host`: la conexión se cierra sin respuesta (444).
- Una conexión TLS con otro nombre (SNI) o sin nombre, como por la IP: el apretón de manos se rechaza antes de entregar el certificado. Un pedido con otro `Host` por una conexión ya abierta: 421.
- Sólo se atiende el nombre configurado.

## TLS (FR-012)

- TLS 1.2 y 1.3; las seis suites de la guía «intermediate» 6.0 de Mozilla (R6); sin tickets de sesión; HTTP/2.
- Sin grapado OCSP.
- Certificado ECDSA P-256 de Let's Encrypt, a nombre del dominio.

## Las cookies (FR-024)

| Cookie | Local | Público |
| --- | --- | --- |
| Sesión | `taller-session`; `HttpOnly`, `SameSite=Lax`, sin `Secure` | `__Host-taller-session`; `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, sin `Domain` |
| Dispositivo | `taller-device`; `HttpOnly`, `SameSite=Lax` | `__Host-taller-device`; mismos atributos que la de sesión |
| `XSRF-TOKEN` | Sin `HttpOnly` (la lee el front), `SameSite=Lax` | Con `Secure` |
| Recuerdo (`remember_web_<hash>`) | `HttpOnly`, `SameSite=Lax` | Con `Secure` |

## La IP del cliente (FR-026 y FR-027)

Lo que cuentan los límites de Nginx y de Laravel, el bloqueo por cuenta y los registros es `REMOTE_ADDR`: la IP de origen de la conexión TCP que recibe Nginx. `X-Forwarded-For`, `Forwarded` y `X-Real-IP` de un cliente no la cambian. El registro de acceso de `/api/` y del puerto 80 es `<IP> [<fecha>] "<método> <ruta sin consulta> <protocolo>" <estado> <bytes> <request_id>`.

## Los límites de conexión y de tiempo (FR-028)

Por IP, más de 300 conexiones simultáneas reciben 429; la cabecera tarda a lo sumo 10 segundos y el cuerpo, 20 entre dos lecturas (R10). Los límites de pedidos por IP son los de C3a.

## Lo que los vecinos pueden suponer

- **A3 y el front:** la API, sus códigos y sus cuerpos no cambian. El nombre de `XSRF-TOKEN` y su lectura por el cliente tampoco. `index.html` cambia en cada respuesta (el nonce) y no se cachea; los archivos con huella cambian de nombre con cada build.
- **A4:** quita los dos Playgrounds de `connect-src` editando `docker/nginx/headers.conf`.
- **B2:** `/api/runs` conserva su ubicación y su tope de 192 KiB, y repite el bloque de `/api/` con la línea `include …/headers.conf;` en el mismo lugar. Los 429 y los 413 llevan las seis cabeceras.
- **D1 y C5:** una ubicación nueva con cabeceras propias incluye `headers.conf`, o `qa/nginx-headers-check.ts` falla.
