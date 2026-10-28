# Contrato HTTP de C3c

**Input**: [spec.md](../spec.md), ADR 0006 §4.1, §4.3, §4.4, §4.8, §7 y §8, el contrato HTTP de C3a ([004](../../004-c3-identidad-acceso/contracts/http.md)) y el de C3b ([010](../../010-c3b-admin-ciclo-de-vida/contracts/http.md)), y [research.md](../research.md). Lo consumen F11c (recuperar por correo), F12b (la administración con correo) y, si alguien prende el registro, una spec nueva del front. Las pruebas de cada endpoint salen de acá.

C3c suma cuatro endpoints (`forgot-password`, `register`, `email/verification-notification` y `email/verify`) y completa tres que en C3b respondían 503. Las convenciones, las cookies, los errores y el orden de evaluación de C3a y de C3b rigen sin cambios: JSON en camelCase, instantes ISO 8601 en UTC con milisegundos y `Z`, `X-XSRF-TOKEN` y `X-Taller-User` en lo que modifica, y errores `{message, code}`. No hay códigos de error nuevos.

## Cuándo hay correo

El taller **tiene correo** si `MAIL_REQUIRED` es falso o si el transporte del mailer configurado no es `log` ni `array`. Si no, está en **modo sólo link**, que es lo que queda con los valores por omisión (`MAIL_REQUIRED=true` y `MAIL_MAILER=log`).

| | Con correo | En modo sólo link |
| --- | --- | --- |
| `features.passwordReset` | `true` | `false` |
| `features.registration` | `REGISTRATION_OPEN` | `false` |
| `POST /api/auth/forgot-password` | 202 | 503 `mail_unavailable` |
| `POST /api/admin/invitations` con `delivery: "email"` | 200, sin `url` | 503 `mail_unavailable`, sin crear nada |
| `POST /api/admin/invitations/{id}/resend` por correo | 200, sin `url` | 503 `mail_unavailable`, sin rotar nada |
| `POST /api/admin/users/{id}/password-reset` | 202 | 503 `mail_unavailable`, sin emitir un token |
| `POST /api/auth/register` (con el registro abierto) | 201 | 503 `mail_unavailable`, sin crear nada |
| Los avisos | Se encolan | No se encolan y nada falla |

El 503 lleva `Retry-After: 3600` y el mensaje «El taller no puede mandar correos por ahora.» (C3b).

## `GET /api/session`

Sin cambios de forma. `features` deja de salir de la configuración fija de C3a y pasa a salir de `App\Auth\Features`:

```json
{"user": null, "features": {"passwordReset": true, "registration": false}, "contentVersion": "…", "catalogs": []}
```

- `passwordReset` dice si hay correo. Es también la bandera de «hay correo» para la administración, y no hay otra.
- `registration` vale `true` sólo con el registro abierto **y** con correo.

## `POST /api/auth/forgot-password`

Pública; CSRF; sin `X-Taller-User`.

- **Cuerpo:** `{email: string}`. El email se canonicaliza (sin espacios, en NFC y en minúsculas).
- **El orden:**
  1. **429** `too_many_requests` con `Retry-After`: más de 5 pedidos por minuto o de 20 por hora desde la misma red (IPv4, o /64 en IPv6).
  2. **503** `mail_unavailable` en modo sólo link, para cualquier email.
  3. **422** `validation_failed`, con `errors.email`, si falta el email, no tiene forma de email o pasa de 254 caracteres.
  4. **202**, siempre con el mismo cuerpo:

     ```json
     {"message": "Si hay una cuenta con ese email, te mandamos un enlace para elegir otra contraseña. Revisá tu correo en unos minutos."}
     ```

- **Lo que no se ve.** El pedido no consulta la cuenta: el 202 es el mismo para un email con cuenta, uno sin cuenta, una cuenta `disabled` o `deleting` y la de un admin, con las mismas consultas. Desde el cuarto pedido de una hora para el mismo email, el 202 es el mismo pero no se encola nada.
- **Lo que pasa después,** fuera del pedido, en la cola `default`, que el `scheduler` procesa cada minuto:
  - si la cuenta existe, está `active` y no es de un admin, recibe el correo de recuperación;
  - si ya se emitió un link hace menos de 60 segundos, no sale otro;
  - el correo sale hacia el proveedor en 3 minutos o menos (SC-002).
- **El link del correo** es el mismo de `taller:password-reset-link`, que F11a ya sabe abrir: `<APP_URL>/#restablecer=<token>&email=<email con rawurlencode>`. Vence a los 60 minutos y se usa con `POST /api/auth/reset-password` de C3a, sin cambios.

## `POST /api/auth/reset-password` y `PUT /api/me/password` (C3a)

Sin cambios de contrato. Con correo, al confirmar la contraseña nueva sale el aviso «Cambió la contraseña de tu cuenta» al titular. Sin correo, no sale nada y la respuesta es la misma.

## `POST /api/auth/register`

Pública; CSRF; sin `X-Taller-User`.

- **Cuerpo:** `{name, email, password, password_confirmation, privacyVersion}`, con las reglas de C3a para el alta por invitación: el nombre, de 1 a 80 caracteres y sin caracteres de control; la política de contraseñas; `privacyVersion`, la vigente. El email se canonicaliza.
- **El orden:**
  1. **404** `not_found` con el registro apagado (`REGISTRATION_OPEN=false`), sin mirar nada más.
  2. **429** `too_many_requests` con `Retry-After`: el sexto registro de una hora desde la misma red (IPv4, o /48 en IPv6), o el que pasa los 100 por hora del taller entero.
  3. **503** `mail_unavailable` en modo sólo link, sin crear nada.
  4. **422** `validation_failed`:
     - `errors.email` si el email no tiene forma de email o su dominio no está en `REGISTRATION_ALLOWED_DOMAINS` (una lista vacía no restringe). El mensaje es «Con este email no se puede crear una cuenta: el registro está abierto sólo para algunos dominios.»;
     - `errors.name`, `errors.password` y `errors.privacyVersion` como en el alta de C3a.
  5. **422** `validation_failed` con `errors.email`, «Ya hay una cuenta con ese email.», si el email ya tiene cuenta. Además, el titular recibe el aviso de intento de registro.
  6. **201** `{"data": {id, name, email, role, privacyAccepted}}`, con la sesión abierta (un ID nuevo). La cuenta nace `student`, `active`, sin verificar y con el aviso de privacidad aceptado.
- **Después del 201:**
  - sale el correo de verificación, que cuenta como el primero de los 3 por hora;
  - hasta verificar, el contenido, el progreso y las ejecuciones responden 403 `email_unverified`, como en C3a.
- **Las invitaciones pendientes no se tocan.** Un registro con un email que tiene una invitación vigente crea la cuenta y deja la invitación intacta.

## `POST /api/auth/email/verification-notification`

Grupo `account`, sin `verified`. Sin cuerpo.

- **404** `not_found` con el registro apagado, antes que la sesión.
- **503** `mail_unavailable` en modo sólo link.
- **429** `too_many_requests` con `Retry-After`: el cuarto correo de verificación de una hora para la cuenta, contando el del registro.
- **202** sin cuerpo: sale un correo nuevo. Si la cuenta ya está verificada, también 202, pero no sale nada.

## `POST /api/auth/email/verify`

Grupo `account`, sin `verified`.

- **Cuerpo:** `{token: string}`, el valor del fragmento `#verificar=`. Tiene la forma `<id>.<vence>.<firma>`. El front no la interpreta: la pasa tal cual y borra el fragmento con `history.replaceState`.
- **404** `not_found` con el registro apagado, antes que la sesión.
- **422** `validation_failed` con `errors.token`, «El enlace de verificación no es válido o venció.», en cualquiera de estos casos: un token mal formado, vencido (60 minutos) o alterado, de otra cuenta, o de un email que ya cambió.
- **204** sin cuerpo: la cuenta queda verificada, y el contenido pasa a responder 200. Repetirlo con la cuenta ya verificada también da 204.
- No existe ningún GET con un token en la API: abrir el link desde un cliente de correo o un escáner no consume nada.

## `POST /api/auth/invitations/accept` (C3a)

Cambia un solo caso: aceptar una invitación por correo sobre una cuenta sin verificar.

- **Invitación por correo** (`delivery = email`) **y cuenta sin verificar con ese email** (una del registro abierto): la aceptación la **reemplaza**.
  - Se borra la cuenta sin verificar, con sus sesiones y su token de recuperación, y queda anotada en el libro de supresiones (C3b).
  - Se crea la cuenta de la invitación, que responde 201 como siempre.
- **Invitación por link** con una cuenta existente, verificada o no: **409** `email_taken`, como en C3a.
- **Invitación por correo** con una cuenta verificada: **409** `email_taken`.

## Administración (C3b)

### `GET /api/admin/invitations`

Sin cambios de forma. `AdminInvitation` ya trae `delivery`, `sentAt` y `sendFailedAt`, y desde C3c esas dos columnas se completan:

| `delivery` | `sentAt` | `sendFailedAt` | Qué quiere decir |
| --- | --- | --- | --- |
| `link` | `null` | `null` | El admin entregó el link a mano |
| `email` | `null` | `null` | El correo está en la cola o reintentando |
| `email` | instante | `null` | El proveedor aceptó el mensaje («entregada al proveedor», no «llegó al buzón») |
| `email` | `null` | instante | No salió: se agotó el plazo de reintentos, que es de 24 horas por omisión (research.md, R4) |

Reenviar una invitación vuelve las dos a `null`.

### `POST /api/admin/invitations`

El orden de C3b no cambia: 422 de validación, 423 si `role` es `admin` sin la contraseña reconfirmada y 503 si `delivery` es `email` y no hay correo. Con correo y `delivery: "email"`:

- **El tope.** Cada email se procesa en su orden y en su propia transacción corta. Antes de clasificarlo se reserva un correo del tope diario del admin: 300 por cada 24 horas, contando los reenvíos por correo.
- **Los resultados:**

| `result` | Cuándo | Qué trae | ¿Gasta tope? |
| --- | --- | --- | --- |
| `created` | No había cuenta ni invitación | `email`, `result`, `expiresAt` (**sin** `url`) | Sí: sale un correo |
| `renewed` | Había una invitación vencida | `email`, `result`, `expiresAt` (sin `url`) | Sí |
| `user_exists` | Ya hay una cuenta | `email`, `result` | No (se devuelve la reserva) |
| `invitation_pending` | Hay una invitación vigente | `email`, `result` | No |
| `rate_limited` | El admin ya llegó a 300 correos en las últimas 24 horas | `email`, `result` | — |

- **El orden de `rate_limited`.** Se decide **antes** que los otros cuatro. Desde que el tope se agota, cada email que sigue en el pedido recibe `rate_limited`, aunque ya tuviera cuenta o una invitación vigente. No se crea ni se cambia ninguna invitación y no sale ningún correo.
- **Los links no cuentan.** Un pedido con `delivery: "link"` no gasta el tope.
- **Cuándo sale el correo.** Al confirmar la transacción de cada email, hacia la cola `mail`. La respuesta no espera al proveedor.

### `POST /api/admin/invitations/{invitation}/resend`

Cuerpo `{delivery?: "link" | "email"}`. Sin `delivery`, se usa el que tiene la invitación.

- **El orden** es el de C3b, con un paso nuevo al final:
  1. 422 de validación;
  2. 404 si la invitación no existe;
  3. 423 si es de admin y la contraseña no está reconfirmada;
  4. 503 si la entrega es `email` y no hay correo;
  5. **429** `too_many_requests` con `Retry-After` si la entrega es `email` y el admin llegó a su tope. Es **antes** de rotar nada: el link anterior sigue valiendo.
- **Con `delivery: "email"`:** **200** `{"data": {"id": 5, "email": "beto@x.com", "role": "student", "delivery": "email", "expiresAt": "…Z"}}`, sin `url`. El token y el vencimiento rotan, el link anterior responde 404 `invitation_not_found` y el correo nuevo sale al confirmar. Un correo del link anterior que todavía esté reintentando no se manda.
- **Con `delivery: "link"`:** como en C3b. Sobre una invitación que salió por correo, la **pasa a link**: `delivery = link`, `sentAt` y `sendFailedAt` en `null`, y el `url` en la respuesta, una sola vez.

### `POST /api/admin/users/{user}/password-reset`

Grupo `admin` más `password.confirm`. Sin cuerpo.

- **El orden** es el de C3b, con un paso nuevo al final:
  1. 423 sin la contraseña reconfirmada;
  2. 404 si no existe;
  3. 422 `validation_failed` con `errors.user` si es un admin (su recuperación es sólo por consola, Q5) o si la cuenta no está `active`;
  4. 503 en modo sólo link, sin emitir un token;
  5. **429** `too_many_requests` con `Retry-After` (los segundos que faltan) si ya se emitió un link para esa cuenta hace menos de 60 segundos, por cualquier camino.
- **202** sin cuerpo y sin el link. El token se emite en el pedido y el correo sale hacia el titular, con un link que vence a los 60 minutos.

### `PATCH /api/admin/users/{user}` y `DELETE /api/admin/users/{user}` (C3b)

Sin cambios de contrato.

- **Con correo**, una cuenta que pasa de `student` a `admin` recibe el aviso de rol de admin después de confirmar el cambio.
- **Una cuenta suprimida** (por la administración o por `DELETE /api/me`) recibe el aviso de cuenta borrada cuando la purga termina, si su email estaba verificado.
- **`PATCH`** sigue ignorando `email` y `name` (FR-024).

## Rutas públicas

La lista blanca de la prueba de recorrido de C3a (`tests/Feature/RouteAccessTest.php`) suma dos rutas:

| Ruta | Por qué es pública |
| --- | --- |
| `POST /api/auth/forgot-password` | Quien olvidó su contraseña no tiene sesión |
| `POST /api/auth/register` | Quien se registra todavía no tiene cuenta |

Las dos rutas de verificación de email están en el grupo `account`, sin `verified`, y modifican: llevan `X-Taller-User`.

## Límites nuevos

| Qué | Límite | Respuesta |
| --- | --- | --- |
| `forgot-password`, por red | 5 por minuto y 20 por hora | 429 con `Retry-After` |
| `forgot-password`, por email | 3 por hora | 202 igual, sin encolar |
| `register`, por red | 5 por hora (IPv4, o /48 en IPv6) | 429 con `Retry-After` |
| `register`, en total | 100 por hora | 429 con `Retry-After` |
| Correos de verificación | 3 por hora y cuenta | 429 con `Retry-After` |
| Correos de invitación de un admin | 300 por cada 24 horas | `rate_limited` en la invitación; 429 en el reenvío |
| Recuperación de un tercero | Un link cada 60 s por cuenta (el broker de C3a) | 429 con `Retry-After` |

## Lo que toman F11c y F12b

Las dos specs del front escribieron lo que toman de C3c como supuesto, hasta que C3c tuviera plan. Este contrato los confirma o los corrige.

**F11c** ([spec 015](../../015-f11-acceso-cuenta/spec.md), FR-060 y FR-061):

| Supuesto | Estado |
| --- | --- |
| `POST /api/auth/forgot-password {email}` con 202 uniforme, 503 `mail_unavailable` y 429 (5 por minuto y 20 por hora por red) | Confirmado. El 202 trae `{message}`, que el front puede mostrar tal cual. Un email mal formado da 422 con `errors.email` |
| `features.passwordReset` decide si se ofrece «¿Te olvidaste la contraseña?» | Confirmado |
| El link del correo | Es el mismo que el de la consola: `#restablecer=<token>&email=<email>`, que F11a ya abre. F11c no agrega una ruta nueva |
| Cuánto tarda | El correo sale en 3 minutos o menos (SC-002), y la página puede decir «en unos minutos» |

**F12b** ([spec 023](../../023-f12-administracion/spec.md), FR-044 a FR-049):

| Supuesto | Estado |
| --- | --- |
| `features.passwordReset` es la bandera de «hay correo» | Confirmado: no hay otra |
| `created` y `renewed` por correo, sin enlace | Confirmado: traen `expiresAt` y no `url` |
| `rate_limited` al pasar los 300 correos por día | Confirmado, con dos precisiones. Es por cada 24 horas desde el primer correo, no por día del calendario. Desde que se agota, gana sobre `user_exists` e `invitation_pending` y no se crea nada |
| `sentAt` y `sendFailedAt` en la lista | Confirmado. `sendFailedAt` aparece cuando se agota el plazo de reintentos: 24 horas por omisión, o el vencimiento del link si llega antes (decisión 1 del plan) |
| El reenvío por correo responde «503; 404» | **Corregido:** también 429 `too_many_requests` con `Retry-After` si el admin llegó a su tope, y entonces no rota nada |
| La recuperación de un tercero responde 202, sin el enlace | Confirmado. **Corregido:** también 429 `too_many_requests` con `Retry-After` si ya se emitió un link para esa cuenta hace menos de 60 segundos. Así el «Le mandamos un enlace…» de F12 nunca miente |
| A un admin no se le ofrece la recuperación por correo | Confirmado: 422 `errors.user` |
