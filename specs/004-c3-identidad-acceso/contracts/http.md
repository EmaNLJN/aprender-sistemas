# Contrato HTTP de C3a

**Input**: [spec.md](../spec.md), ADR 0006 §4, §7 y §8 ([ADR 0006](../../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)) y [research.md](../research.md). Es lo que consumen el front (A3 y las pantallas de F11) y los ítems B2 y D1; las pruebas de cada endpoint salen de acá.

## Convenciones

- Todo va bajo `/api`, del mismo origen, sin CORS y sin versionado público (R6 del ADR).
- El cuerpo es JSON en `camelCase`; los instantes, ISO 8601 en UTC con milisegundos y `Z` (`2026-10-12T15:30:00.000Z`). Los errores salen siempre como JSON, haya o no `Accept: application/json`: un pedido de `curl` sin esa cabecera recibe 401, no una redirección.
- Los pedidos que modifican (`POST`, `PUT`, `PATCH` y `DELETE`) llevan `X-XSRF-TOKEN` (el valor de la cookie `XSRF-TOKEN`) y, si hay sesión, `X-Taller-User: <id de la cuenta>`.
- El cliente empieza con `GET /api/session`: devuelve la cookie `XSRF-TOKEN`, y sin ella un `POST` recibe 419.
- El usuario que devuelve la API lleva sólo cinco campos: `{id, name, email, role, privacyAccepted}`. Nunca el hash, el token de «recordarme» ni el estado.

## Cómo se evalúa un pedido

1. **Nginx** limita por IP (`/api/` y, aparte, `GET /api/session`) y responde 429 con `Retry-After`.
2. **Identificador del pedido** (`X-Request-Id`, el de Nginx si llegó).
3. **Cookies, sesión y CSRF** (`taller-session`, `XSRF-TOKEN`): sin token válido, 419 `csrf_token_mismatch`.
4. **Descarte de la sesión inválida** (`DropInvalidSession`): si la sesión es de una cuenta que no está `active`, o cambió su contraseña, o pasó el máximo de 8 horas, se la descarta y el pedido sigue como invitado. Corre en todas las rutas del grupo `api`, públicas incluidas.
5. **Grupo `account`** (sólo las rutas que piden sesión), en este orden: `account.active` (403 `account_disabled` si la sesión se descartó por una cuenta deshabilitada), `auth:web` (401 `unauthenticated`) y `account.expected` (409 `account_mismatch`, sólo si el pedido modifica).
6. **`verified`** (sólo el contenido, el progreso y las ejecuciones): 403 `email_unverified`.
7. **Validación** (422) y el controlador.

## Para los ítems que se apoyan en C3a (B2 y D1)

| Qué | Cómo |
| --- | --- |
| Una ruta que exige sesión | `Route::middleware('account')`: es un grupo de middleware que arma `bootstrap/app.php` con `account.active`, `auth:web` y `account.expected` |
| Una ruta de estudio (contenido, progreso, ejecuciones) | `Route::middleware(['account', 'verified'])` |
| Una acción sensible | Suma `password.confirm`: 423 `password_confirmation_required` si no se confirmó la contraseña en los últimos 900 segundos |
| Un límite de ritmo por usuario o por red | `RateLimiter::for(...)` con `throttle:<nombre>`; el 429 sale con `{message, code}` y `Retry-After` solos |
| Quién es la cuenta | `Auth::id()` y `$request->user()`; nunca un `user_id` del cliente (FR-002) |
| Si la cuenta puede actuar | `users.status` es `active` en toda ruta del grupo `account`; ninguna ruta de B2 ni de D1 lo vuelve a comprobar |
| Un error con código | `ApiError::of(ApiCode::X, $extra, $headers)`; el código y su mensaje en español se agregan a `ApiCode` y a `lang/es/api.php` |
| Archivo de rutas propio | Un archivo en `routes/api/` que `bootstrap/app.php` lista en `withRouting(api: [...])` |
| Una tarea programada | Una línea en `routes/console.php`; el servicio `scheduler` ya corre `schedule:work` |
| El valor de `X-Taller-User` | El id decimal de `Auth::id()`; si falta o no coincide, 409 `account_mismatch` antes de tocar datos |

C3a **no** entrega `UserData` ni un evento al deshabilitar, degradar o suprimir una cuenta: ningún código de C3a hace esas tres cosas (el operador usa `tinker` hasta C3b). Los dos llegan con C3b.

## Errores

Todo error de `/api` tiene la forma `{"message": "...", "code": "..."}` más los campos de la tabla. El mensaje está en español (`lang/es/api.php`) y nunca hay una traza. El código `bad_request` es el de los demás errores 4xx del framework que §8 no lista (un cuerpo ilegible, por ejemplo); `method_not_allowed` y `server_error` también los propone esta spec (Assumptions).

| HTTP | `code` | Mensaje | Cuándo | Extra |
| --- | --- | --- | --- | --- |
| 400 | `bad_request` | No se pudo entender el pedido. | Un 4xx del framework sin código propio | El estado original se conserva |
| 401 | `unauthenticated` | Iniciá sesión para continuar. | Sin sesión, sesión vencida o descartada, o cuenta en `deleting` | |
| 403 | `forbidden` | No tenés permiso para hacer esto. | Un `403` sin código propio | |
| 403 | `account_disabled` | Tu cuenta está deshabilitada. Consultá con quien administra el taller. | Cuenta `disabled`: con la sesión viva, y en el ingreso con la contraseña correcta | |
| 403 | `email_unverified` | Verificá tu email para continuar. | Contenido con el email sin verificar | |
| 404 | `not_found` | No existe lo que pedís. | Ruta o recurso inexistente | |
| 404 | `invitation_not_found` | La invitación no existe o ya se usó. | Token usado, revocado, inventado o mal formado | |
| 405 | `method_not_allowed` | Ese método no está permitido en esta ruta. | Método no permitido | `Allow` |
| 409 | `email_taken` | Ya hay una cuenta con ese email. | La aceptación choca con una cuenta nueva | |
| 409 | `account_mismatch` | La sesión cambió de cuenta: recargá la página. | `X-Taller-User` falta o no es la cuenta de la sesión | |
| 410 | `invitation_expired` | La invitación venció. Pedí una nueva a quien te invitó. | Invitación vencida | |
| 419 | `csrf_token_mismatch` | La página venció: recargala e intentá de nuevo. | Falta el token CSRF o no es el de la sesión | |
| 422 | `validation_failed` | Hay datos que corregir. | Datos inválidos | `errors`: `{campo: [mensaje]}` |
| 422 | `auth_failed` | El email o la contraseña no son correctos. | Credencial inválida (ingreso, confirmación, cambio, cerrar otras sesiones) | |
| 423 | `password_confirmation_required` | Confirmá tu contraseña para continuar. | Ruta con `password.confirm` sin confirmación vigente | |
| 429 | `too_many_requests` | Demasiados intentos. Esperá un momento antes de volver a probar. | Límite de ritmo o bloqueo por cuenta | `Retry-After` en segundos |
| 500 | `server_error` | Algo salió mal de nuestro lado. Probá de nuevo en un rato. | Cualquier otro fallo | |

Los errores de C2 (`content_retired`, `content_not_imported` y `maintenance`) siguen como están en `ContentDelivery`.

## Cookies y cabeceras

| Nombre | Dirección | Detalle |
| --- | --- | --- |
| `taller-session` | Respuesta | HttpOnly, `SameSite=Lax`, ruta `/`, cifrada; la sesión vence a los 30 minutos de inactividad y a las 8 horas de iniciada |
| `XSRF-TOKEN` | Respuesta | La deja toda respuesta que pasa por el grupo `api`; no es HttpOnly. El front la copia a `X-XSRF-TOKEN` |
| `taller-device` (el nombre sale de `taller.device_cookie.name`) | Respuesta | La emite el ingreso correcto; HttpOnly, `SameSite=Lax`, ruta `/`, sin `Domain`, 180 días. Con TLS (C4) alcanza con `DEVICE_COOKIE_NAME=__Host-taller-device` y `DEVICE_COOKIE_SECURE=true`: el nombre y los atributos salen de la configuración y no dependen de `APP_ENV` |
| `remember_web_*` | Respuesta | La emite el ingreso de un estudiante que pidió `remember`; HttpOnly, 30 días. Nunca a un admin |
| `X-Taller-User` | Pedido | Id decimal de la cuenta; obligatoria en los pedidos autenticados que modifican |
| `X-Request-Id` | Respuesta | 32 hexadecimales; el mismo que figura en los registros |
| `Retry-After` | Respuesta | En 429 y 503, en segundos |
| `Cache-Control` | Respuesta | `no-store` en `GET /api/session`; `private, no-cache` en el contenido, sin tocar (FR-032) |

## `GET /api/session`

Pública; límite de Nginx por IP. Crea la sesión de invitado de un cliente nuevo.

- **200**
  ```json
  {
    "user": null,
    "features": {"passwordReset": false, "registration": false},
    "contentVersion": null,
    "catalogs": []
  }
  ```
  `user` es `null` o `{id, name, email, role, privacyAccepted}`. `features.passwordReset` y `features.registration` salen de `config('taller.features')` y valen `false` en C3a: C3b los enciende cambiando la configuración. `contentVersion` son los primeros 32 hexadecimales del `document_hash` del último import, o `null` sin import. `catalogs` son los catálogos activos como `{code, sliceBy, chainPosition}`, con los de posición primero (de menor a mayor) y después los sin posición, cada grupo por `code`. Con una sesión inválida (cuenta deshabilitada, contraseña cambiada, máximo de 8 horas) responde igual, con `user: null`: nunca 401 ni 403 (Assumptions).
- **Cabeceras:** `Cache-Control: no-store`, `Set-Cookie` de la sesión y de `XSRF-TOKEN`.

## `POST /api/auth/login`

Pública; CSRF; los límites de FR-012 y FR-013.

- **Cuerpo:** `{email: string, password: string, remember?: boolean}`. El email se canonicaliza (sin espacios, en NFC y en minúsculas) antes de usarse. La contraseña se normaliza a NFC.
- **200** `{"data": {id, name, email, role, privacyAccepted}}`, con la sesión nueva (ID nuevo), la cookie de dispositivo y, sólo si es un estudiante que pidió `remember`, la de recuerdo.
- **422 `auth_failed`**: un email que no existe, una contraseña equivocada y una cuenta en `deleting` dan el mismo estado, el mismo cuerpo y el mismo piso de tiempo (200 ms).
- **403 `account_disabled`**: cuenta `disabled` con la contraseña correcta, sin abrir sesión. Con la incorrecta, 422 `auth_failed`.
- **422 `validation_failed`**: falta el email o la contraseña, o el email no tiene forma de email.
- **429 `too_many_requests`** con `Retry-After`: más de 5 intentos por minuto por email canónico y red, o de 60 por red; o la cuenta está bloqueada para dispositivos desconocidos.

## `POST /api/auth/logout`

Grupo `account`. **204**, sin cuerpo. Invalida la sesión y rota el token de «recordarme».

## `POST /api/auth/invitations/lookup`

Pública; CSRF; 10 por minuto por red (`throttle:invitations`).

- **Cuerpo:** `{token: string}`.
- **200** `{"email": "ana@x.com", "role": "student", "expiresAt": "2026-10-12T15:30:00.000Z"}`.
- **410 `invitation_expired`** si venció. **404 `invitation_not_found`** si fue usada, revocada, inventada o no tiene la forma de un token (43 caracteres en base64url): sin consultar la base.
- **422 `validation_failed`** si falta el token.

## `POST /api/auth/invitations/accept`

Pública; CSRF; 10 por minuto por red.

- **Cuerpo:** `{token, name, password, password_confirmation, privacyVersion}`. Ningún campo acepta `role`, `status` ni `user_id`: el rol sale de la invitación.
- **201** `{"data": {id, name, email, role, privacyAccepted}}`, con la sesión abierta (ID nuevo). La cuenta nace `active`, con el email verificado y el aviso aceptado. La invitación se borra.
- **404** y **410** como en la consulta. **409 `email_taken`** si la cuenta se creó entre la consulta y la aceptación.
- **422 `validation_failed`**, con `errors`, si el nombre no tiene de 1 a 80 caracteres, la contraseña no cumple la política (FR-023) o no coincide con su confirmación, o `privacyVersion` no es la vigente. La invitación sigue vigente.
- Dos aceptaciones simultáneas del mismo token crean una sola cuenta; la otra recibe 404.

## `POST /api/auth/reset-password`

Pública; CSRF; 10 por minuto por red y 5 por minuto por email.

- **Cuerpo:** `{token, email, password, password_confirmation}`.
- **200** con el objeto `{}`: fija la contraseña, rota el token de «recordarme», borra todas las sesiones de la cuenta y limpia el bloqueo. **No inicia sesión.**
- **422 `validation_failed`** con `errors.token`, igual para un token inválido, uno vencido, una cuenta inexistente y una cuenta que no está `active`. Si la contraseña no cumple la política, el 422 trae `errors.password`, con o sin token válido.

## `POST /api/auth/confirm-password`

Grupo `account`; 5 por minuto por usuario.

- **Cuerpo:** `{password}`. **201** con el objeto `{}`: guarda el instante de la confirmación y regenera el ID de la sesión.
- **422 `auth_failed`** si la contraseña es incorrecta: el fallo suma al bloqueo por cuenta.

## `GET /api/auth/confirmed-password-status`

Grupo `account`. **200** `{"confirmed": true}`, verdadero durante 900 segundos desde la última confirmación.

## `PATCH /api/me`

Grupo `account`. **Cuerpo:** `{name}` (de 1 a 80 caracteres, sin caracteres de control). **200** `{"data": user}`. El email, el rol y el estado no se cambian por HTTP: se ignoran si llegan.

## `PUT /api/me/password`

Grupo `account`; 5 por minuto por usuario.

- **Cuerpo:** `{current_password, password, password_confirmation}`.
- **200** `{"data": user}`: la sesión actual sigue, con un ID nuevo; las demás dejan de servir en su siguiente pedido y el token de «recordarme» se rota. Si la sesión actual era de «recordarme», conserva el suyo, ya con el token nuevo.
- **422 `auth_failed`** si `current_password` es incorrecta (suma al bloqueo). **422 `validation_failed`** si la nueva no cumple la política.

## `POST /api/me/privacy`

Grupo `account`. **Cuerpo:** `{privacyVersion}`. **204** si es la versión vigente. **422 `validation_failed`** si no lo es.

## `POST /api/me/sessions/logout-others`

Grupo `account`; 5 por minuto por usuario. **Cuerpo:** `{password}`. **204**: corta todas las demás sesiones de la cuenta y rota el token de «recordarme»; la actual sigue. **422 `auth_failed`** si la contraseña es incorrecta (suma al bloqueo).

## Contenido (C2) detrás de la sesión

Las seis rutas de C2 (`GET /api/exercises`, `/api/exercises/{id}`, `/api/worlds`, `/api/workshops`, `/api/atlas` y `/api/guide`) pasan a `['account', 'verified']`.

- Sin sesión: **401 `unauthenticated`** en JSON y en español. Con el email sin verificar: **403 `email_unverified`**.
- Con sesión: los mismos bytes, el mismo `ETag` y `Content-Version`, y el 304 ante un `If-None-Match` fuerte o débil. `Cache-Control: private, no-cache`, sin `Vary: Cookie` y sin límite de ritmo de Laravel. El middleware de sesión no agrega ni cambia ninguna de esas cabeceras.
- Una cuenta de rol `admin` los recibe igual que un alumno (Clarifications, Q3).

## Rutas que quedan fuera del grupo `account`

La lista blanca de la prueba de recorrido (FR-048), con el motivo:

| Ruta | Por qué es pública |
| --- | --- |
| `GET /api/up` | Health check; fuera de todo middleware de sesión |
| `GET /api/session` | Arranque del front; modo suave con la sesión inválida |
| `POST /api/auth/login` | Es el ingreso |
| `POST /api/auth/invitations/lookup` y `accept` | El invitado todavía no tiene cuenta |
| `POST /api/auth/reset-password` | Quien olvidó su contraseña no tiene sesión |

## Límites de ritmo

Los límites «por red», `LoginThrottle` y las zonas `limit_req` de Nginx suponen que `trustProxies` queda **vacío**: la IP del cliente es `REMOTE_ADDR`, que Nginx fija con `$remote_addr`, y una cabecera `X-Forwarded-For` del cliente no cambia a qué red se cuenta un pedido. C3a no lo configura (una prueba lo exige) y C4 fija la IP real del cliente (FR-026 y FR-027 de la spec de C4): es quien lo puede cambiar.

| Qué | Límite | Respuesta |
| --- | --- | --- |
| Nginx, `/api/` | Por IP, ráfaga holgada (research.md, R14) | 429 JSON con `Retry-After` |
| Nginx, `GET /api/session` | Zona propia por IP | 429 JSON con `Retry-After` |
| Ingreso | 5 por minuto por email canónico y red; 60 por minuto por red | 429 |
| Ingreso con cookie de dispositivo | 5 fallos por minuto por dispositivo | 429 |
| Bloqueo por cuenta | Desde el 10.º fallo seguido, 1 minuto, el doble por fallo hasta 15; 100 fallos: hasta restablecer | 429 |
| Invitaciones (consultar y aceptar) | 10 por minuto por red | 429 |
| Restablecimiento | 10 por minuto por red; 5 por minuto por email | 429 |
| Confirmar, cambiar contraseña y cerrar las otras sesiones | 5 por minuto por usuario | 429 |

## Lo que el front tiene que hacer

- Mandar `X-XSRF-TOKEN` y, en los que modifican, `X-Taller-User`.
- **401** → pantalla de ingreso. **403 `account_disabled`** → avisar que la cuenta está deshabilitada.
- **409 `account_mismatch`** → cargar el espacio de la cuenta actual, sin reintentar.
- **419** → `GET /api/session`, comparar la cuenta con la que tiene en memoria y reintentar sólo si es la misma.
- **423** → pedir la contraseña y llamar a `POST /api/auth/confirm-password`.
- **429** → respetar `Retry-After`.
- Borrar del fragmento de la URL el token de una invitación o de un restablecimiento con `history.replaceState` apenas lo lee: viaja sólo en el fragmento y en el cuerpo de un `POST`.
