# Contrato HTTP de C3b

**Input**: [spec.md](../spec.md), ADR 0006 §4.1, §4.5, §7 y §8 ([ADR 0006](../../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)), el contrato HTTP de C3a (`specs/004-c3-identidad-acceso/contracts/http.md`, rama `feat/c3a-identidad`) y [research.md](../research.md). Es lo que consumen el front (las pantallas de exportar y borrar la cuenta de F11 y las de administración de F12), C3c y C4. Las pruebas de cada endpoint salen de acá.

C3b suma 11 endpoints: los nueve de `/api/admin`, `POST /api/me/export` y `DELETE /api/me`. Las convenciones, las cookies y los errores de C3a rigen sin cambios (JSON en camelCase, instantes ISO 8601 en UTC con milisegundos y `Z`, `X-XSRF-TOKEN` y `X-Taller-User` en lo que modifica, errores `{message, code}`); acá van sólo las diferencias.

## Cómo se evalúa un pedido a `/api/admin`

Las rutas de `/api/admin` pertenecen al grupo de middleware `admin`, que arma `bootstrap/app.php`. En orden:

1. **Nginx**, el identificador del pedido, las cookies y el CSRF (419), y el descarte de una sesión inválida: como en C3a.
2. `account.active` (403 `account_disabled`), `auth:web` (401 `unauthenticated`) y `account.expected` (409 `account_mismatch`, sólo si el pedido modifica).
3. `verified` (403 `email_unverified`).
4. `account.admin` (403 `forbidden` si el rol no es `admin`).
5. `throttle:admin` (429 con `Retry-After`): 120 por minuto por usuario.
6. `password.confirm` (423 `password_confirmation_required`), **sólo en las rutas que lo piden**. Una ruta cuya exigencia depende del cuerpo lo comprueba después de validar.
7. La validación del cuerpo (422 `validation_failed`, con `errors`).
8. La búsqueda del destino (404 `not_found`). **Ningún destino se resuelve antes del paso 4**: las rutas no usan el binding implícito de modelos, que corre antes que el rol. Por eso un estudiante recibe 403 también con un id que no existe.
9. Las reglas de la operación (422 y 409), y por último el 503 de correo.

El destino de la ruta es un entero: `{user}` y `{invitation}` aceptan de 1 a 18 dígitos (`[0-9]{1,18}`). Un valor que no lo es, o uno más largo que no entra en un entero de PHP, no coincide con la ruta y responde 404 `not_found`, como cualquier ruta inexistente.

## Códigos nuevos

| HTTP | `code` | Mensaje | Cuándo | Extra |
| --- | --- | --- | --- | --- |
| 409 | `last_admin` | Tiene que quedar al menos un admin activo. | Deshabilitar, degradar o suprimir al único admin activo | |
| 503 | `mail_unavailable` | El taller no puede mandar correos por ahora. | Una ruta pide un correo y el taller no tiene (hasta C3c, siempre) | `Retry-After: 3600` |

Los demás códigos son los de C3a. Los mensajes de validación de la administración están en `lang/es/admin.php` y `lang/es/invitations.php`.

## Formas

**`AdminUser`** (la cuenta que ve quien administra; nunca el hash, el token de «recordarme» ni textos del alumno):

```json
{
  "id": 12,
  "name": "Ana Pérez",
  "email": "ana@x.com",
  "role": "student",
  "status": "active",
  "emailVerified": true,
  "privacyVersion": "2026-10-dev",
  "createdAt": "2026-10-05T12:00:00.000Z",
  "updatedAt": "2026-10-05T12:00:00.000Z"
}
```

`role` es `admin` o `student`; `status`, `active`, `disabled` o `deleting`; `privacyVersion` es el texto de la versión aceptada o `null`.

**`AdminInvitation`** (nunca el token ni su hash):

```json
{
  "id": 5,
  "email": "beto@x.com",
  "role": "student",
  "delivery": "link",
  "expiresAt": "2026-10-12T12:00:00.000Z",
  "expired": false,
  "sentAt": null,
  "sendFailedAt": null,
  "invitedBy": {"id": 1, "name": "Ana"},
  "createdAt": "2026-10-05T12:00:00.000Z"
}
```

`invitedBy` es `null` si la invitación salió de la consola o si quien la creó ya no existe. `sentAt` y `sendFailedAt` son de C3c y valen `null` hasta entonces.

**Página:** `{"data": [...], "meta": {"page": 1, "perPage": 25, "total": 140, "lastPage": 6}}`. `page` desde 1; `perPage` de 1 a 100 (25 por omisión); una página pasada del final devuelve `data: []`.

## `GET /api/admin/users`

Grupo `admin`. Query:

| Parámetro | Valores |
| --- | --- |
| `page`, `perPage` | enteros, como arriba |
| `q` | hasta 80 caracteres; busca en el nombre y en el email como subcadena, sin distinguir mayúsculas (ni acentos en el nombre), con `%` y `_` literales |
| `role` | `admin` o `student` |
| `status` | `active`, `disabled` o `deleting` |
| `sort` | `name`, `email`, `role`, `status` o `createdAt`, con `-` adelante para descendente. Por omisión `name`; el desempate es `id` |

**200** una página de `AdminUser`. **422 `validation_failed`** si un parámetro no cumple.

## `GET /api/admin/users/{user}`

Grupo `admin`. **200** `{"data": AdminUser}`. **404** si no existe.

## `PATCH /api/admin/users/{user}`

Grupo `admin` más `password.confirm`.

- **Cuerpo:** `{role?: "admin" | "student", status?: "active" | "disabled"}`, con al menos uno. Cualquier otro campo (`email`, `name`, `user_id`) se ignora: no cambia nada.
- **200** `{"data": AdminUser}` con la cuenta ya cambiada. Pedir lo que la cuenta ya tiene responde 200 sin efectos.
- **404** si el destino no existe.
- **422 `validation_failed`** (`errors.role` o `errors.status`): un valor inválido; ningún campo permitido en el cuerpo; el destino es el propio admin y el pedido lo deshabilita o lo degrada; o el destino está en `deleting`. El 422 por el propio admin se evalúa antes de tocar la base.
- **409 `last_admin`** si el cambio deja al taller sin un admin activo.

Efectos, todos en la misma transacción que el cambio (FR-035):

| Cambio | Efecto |
| --- | --- |
| A `disabled` | Borra su token de recuperación. Si era admin activo, borra las invitaciones que creó |
| De admin a estudiante | Borra las invitaciones que creó |
| A admin | Rota su `remember_token` |

Después de confirmar se dispara `AccountRestricted` con `Disabled` (si pasó a `disabled`) y con `Demoted` (si dejó de ser admin). Las sesiones **no** se borran: una cuenta deshabilitada con la sesión viva recibe 403 `account_disabled` en su siguiente pedido (C3a, FR-007).

## `POST /api/admin/users/{user}/password-reset`

Grupo `admin` más `password.confirm`. Sin cuerpo.

Hasta C3c responde siempre un error. El orden de las comprobaciones:

1. **423** sin la contraseña reconfirmada.
2. **404** si el destino no existe.
3. **422 `validation_failed`** si el destino es admin (`errors.user`: su recuperación sale sólo por `taller:password-reset-link`) o si su cuenta no está `active`.
4. **503 `mail_unavailable`**, sin emitir ningún token ni encolar nada.

Con C3c, el éxito es **202** sin cuerpo y sin devolver nunca el link.

## `GET /api/admin/invitations`

Grupo `admin`. Query: `page`, `perPage`, `role` (`admin` o `student`) y `state` (`pending` o `expired`). El orden: primero las invitaciones de admin pendientes (la interfaz las muestra siempre, porque sin correo nadie recibe un aviso), después por `createdAt` descendente y por `id` descendente.

**200** una página de `AdminInvitation`. **422** si un parámetro no cumple.

## `POST /api/admin/invitations`

Grupo `admin`; la exigencia de `password.confirm` depende del `role` del cuerpo.

- **Cuerpo:** `{emails: string[], role: "admin" | "student", delivery: "link" | "email"}`. Entre 1 y 100 emails, cada uno con forma de email y de hasta 254 caracteres; se canonicalizan (sin espacios, en NFC y en minúsculas). Un email repetido en el mismo pedido, ya canonicalizado, es un error de validación.
- **Orden:** 422 de validación; **423** si `role` es `admin` y la contraseña no está reconfirmada; **503 `mail_unavailable`** si `delivery` es `email` (hasta C3c, sin crear nada); recién entonces se procesa cada email.
- **200** `{"data": [{"email": "ana@x.com", "result": "created", "expiresAt": "…Z", "url": "https://…/#invitacion=<token>"}]}`, una entrada por email, en el orden del pedido. Cada email se procesa en su propia transacción corta:

| `result` | Cuándo | Qué trae |
| --- | --- | --- |
| `created` | No había cuenta ni invitación | `expiresAt` y `url` |
| `renewed` | Había una invitación **vencida**: se renueva con el rol del pedido, con token y vencimiento nuevos | `expiresAt` y `url` |
| `user_exists` | Ya hay una cuenta con ese email | Nada más |
| `invitation_pending` | Ya hay una invitación vigente | Nada más; no se renueva ni se cambia |

- **`url`** sólo con `delivery=link` y sólo en `created` y `renewed`: `<APP_URL>/#invitacion=<token>`, armado desde `config('app.url')`. La respuesta es la única vez que se ve.
- El vencimiento es de 7 días para `student` y de 48 horas para `admin`.
- **422 `validation_failed`** si la lista está vacía, pasa de 100 o un email no es válido o está repetido.

## `POST /api/admin/invitations/{invitation}/resend`

Grupo `admin`; `password.confirm` si la invitación es de admin.

- **Cuerpo:** `{delivery?: "link" | "email"}`; sin él, el de la invitación.
- **Orden:** 422 de validación; **404** si no existe; **423** si la invitación es de admin y la contraseña no está reconfirmada; **503 `mail_unavailable`** si la entrega es `email` (hasta C3c).
- **200** `{"data": {"id": 5, "email": "beto@x.com", "role": "student", "delivery": "link", "expiresAt": "…Z", "url": "https://…/#invitacion=<token>"}}`. Rota el token y el vencimiento (vence 7 días o 48 horas desde ahora, según el rol): el link anterior responde 404 `invitation_not_found` en la consulta de C3a. Una invitación vencida también se reenvía. La invitación queda con `delivery = link` y sin `sentAt` ni `sendFailedAt`.

## `DELETE /api/admin/invitations/{invitation}`

Grupo `admin`. **204**, sin cuerpo: revoca la invitación y su link responde 404. **404** si no existe. No pide `password.confirm`.

## `POST /api/me/export`

Grupo `account` (sin `verified`: una cuenta sin verificar también puede llevarse sus datos), más `password.confirm` y `throttle:export` (3 por día por usuario: el cuarto pedido recibe 429 con `Retry-After`). Sin cuerpo. Vale sólo para el titular: no recibe ningún id.

- **200**, en streaming, con `Content-Type: application/json`, `Content-Disposition: attachment; filename="taller-<id>-<AAAAMMDD>.json"`, `Cache-Control: no-store` y `X-Accel-Buffering: no`. Cada fragmento se lee en una transacción corta; ninguna queda abierta mientras se escribe la respuesta, y el archivo no es una foto atómica entre tablas.
- **423** sin la contraseña reconfirmada. **429** pasado el límite.

El documento, con las claves en este orden:

```json
{
  "format": "taller-export-1",
  "exportedAt": "2026-10-12T15:30:00.000Z",
  "account": {
    "id": 12, "name": "Ana Pérez", "email": "ana@x.com", "role": "student",
    "emailVerifiedAt": "2026-10-05T12:00:00.000Z", "privacyVersion": "2026-10-dev",
    "privacyAcceptedAt": "2026-10-05T12:00:00.000Z",
    "createdAt": "2026-10-05T12:00:00.000Z", "updatedAt": "2026-10-05T12:00:00.000Z"
  },
  "exerciseProgress": [{"exerciseId": "rust-01", "solvedAt": null, "attemptCount": 2, "…": "…"}],
  "attempts": [{
    "id": 7, "exerciseId": "rust-01", "outcome": "passed", "attemptedAt": "2026-10-06T12:00:00.000Z", "…": "…",
    "tests": [{"testKey": "t1", "exerciseId": "rust-01", "position": 1, "outcome": "pass"}],
    "payload": {"code": "fn main() {}", "customTest": null, "stdout": "", "stderr": "", "createdAt": "…Z"}
  }]
}
```

- **`account`:** sin el hash ni el token de «recordarme». **No** incluye sesiones, invitaciones ni tokens, ni `runs` ni `progress_heads` (motivos en [data-model.md](../data-model.md), sección 2).
- **`exerciseProgress`:** las filas de `exercise_progress` de la cuenta, con todas sus columnas menos `user_id`. Cuando D1a entregue su lector de la foto de progreso, esta clave pasa a ser **`progress`** (la foto v2, que incluye esas filas), y D1b suma **`imports`** con los crudos importados.
- **`attempts`:** cada intento con todas sus columnas menos `user_id`, sus pruebas (`tests`, sin `attemptId`) y su payload si se conserva (`payload`, sin `attemptId`; `null` si no se conserva).
- **La versión.** `format` cambia cuando el documento quita o renombra una clave: D1a, al reemplazar `exerciseProgress` por `progress`, sube `format` a `taller-export-2` en `UserExport` y en este contrato. Sumar una clave (D1b agrega `imports`) no lo cambia.
- **Los nombres** de columna salen en camelCase. Las columnas `DATETIME` salen en ISO 8601 UTC con milisegundos y `Z`; los demás valores, como están en la base (un indicador es `0` o `1`).

## `DELETE /api/me`

Grupo `account` (sin `verified`), más `password.confirm`. Sin cuerpo.

- **202**, y la respuesta dice qué se borra, para que la pantalla lo diga y no lo confunda con «Borrar todo» de D1 (FR-049):

```json
{
  "data": {"status": "deleting"},
  "message": "Se está borrando tu cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer."
}
```

- La cuenta pasa a `deleting`, la sesión de este pedido termina y el siguiente pedido recibe 401. El ingreso falla como una credencial inválida.
- **409 `last_admin`** si la cuenta es el único admin activo. **423** sin la contraseña reconfirmada.

## `DELETE /api/admin/users/{user}`

Grupo `admin` más `password.confirm`. Sin cuerpo.

- **202** `{"data": {"id": 12, "status": "deleting"}, "message": "Se está borrando la cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer."}`.
- Hace lo mismo que `DELETE /api/me` para otra cuenta. Sobre una cuenta que ya está en `deleting` responde 202 igual: vuelve a pedir la purga, que es única por cuenta. Sobre la propia cuenta del admin conserva el cuerpo y el mensaje de esta ruta (con `data.id`) y tiene los efectos de `DELETE /api/me`: la sesión termina y rige la guardia del último admin.
- **404** si no existe. **409 `last_admin`** si el destino es el único admin activo. **423** sin la contraseña reconfirmada.

## Rutas y límites

| Ruta | Grupo | Límite |
| --- | --- | --- |
| Las nueve de `/api/admin` | `admin` | 120 por minuto por usuario |
| `POST /api/me/export` | `account`, `password.confirm` | 3 por día por usuario |
| `DELETE /api/me` | `account`, `password.confirm` | el de `confirm-password` de C3a (5 por minuto por usuario) |

Ninguna ruta de C3b entra en la lista blanca de la prueba de recorrido de C3a: todas piden sesión. La prueba que lista las rutas que modifican suma las de C3b.

## Para los ítems que se apoyan en C3b

| Ítem | Qué toma |
| --- | --- |
| **B2** | `AccountRestricted` (`Disabled`, `Demoted` o `Deleting`), que B2 ya entregó y C3b dispara después de confirmar. El listener de B2 lee `users.status` ya confirmado |
| **D1a y D1b** | Declarar sus tablas en `UserTables` y en `PopulatedAccount` al crearlas. Registrar su sección de exportación (`progress` e `imports`) en `UserExport`. `ProgressSnapshotReader::areas(userId, null)` es lo que lee la sección `progress` |
| **C3c** | Los tres sitios que responden 503 (`InvitationController::store` y `::resend` con `delivery=email`, y `UserController::passwordReset`) y los dos puntos de aviso (la promoción en `AccountChanges::change` y el final de `PurgeUserData`). `MailUnavailable` y `ApiCode::MailUnavailable` son de C3b. `AccountDeletion::request(int $id)` es el pedido de supresión que C3c usa para las cuentas de registro nunca verificadas (su FR-022) |
| **C4** | El libro de supresiones: `account_deletions` y su copia junto a cada respaldo, en el formato de [console.md](./console.md) |
| **El front** | 423 en cada acción sensible; `Retry-After`; el link de una invitación se ve una sola vez; el 503 `mail_unavailable`; la descarga de la exportación es un `POST` con respuesta en streaming que se baja con `fetch` y se guarda como archivo; el mensaje de `DELETE /api/me` |
