# Research: F11c · Recuperar por correo

Las decisiones técnicas del [plan de F11c](./plan-f11c.md), con sus motivos, sus alternativas y lo que se midió. Las de F11a (R1 a R18) y las de F11b (R19 a R33) están en [research.md](./research.md) y [research-f11b.md](./research-f11b.md), y no se repiten: F11c sigue con R34. El contrato nuevo está en [contracts/forgot-password-f11c.md](./contracts/forgot-password-f11c.md).

## Cómo se planificó

Se planificó sin tocar código de producción, sin correr nada en los worktrees de implementación y sin descargar nada. Las fuentes:

- **La spec,** con su clarify del 2026-10-28: FR-060, FR-061, FR-034 (el lado sin correo, de F11a), los transversales FR-066 a FR-077, SC-010 (la parte de F11c) y la historia 8.
- **La base real de F11a,** en el worktree `impl-f11a`, `a7b3c71d` (rama `f11a/base`), leída con `git show`:
  - `features/sign-in` (`LoginForm.tsx`, `AccessScreen.tsx`, `AccessGate.tsx`, `access-endpoints.ts` y `render-access.tsx`);
  - `shared/ui/form` (`describeFailure`, `showFailure` y `messagesOf`);
  - el doble de la API, con `const FEATURES = { passwordReset: false, registration: false }` fijo (`qa/e2e/fixtures/api-double.ts:28`).
- **Lo que F11a todavía no implementó:** el `AccessScreen` final de T032, con el alta, el restablecimiento y la reaceptación. Se leyó en el [plan de F11a](./plan.md), tarea 4.2.
- **El backend que consume:** C3c, planificado y sin implementar. Se leyeron su [contrato HTTP](../011-c3c-correo/contracts/http.md) («`POST /api/auth/forgot-password`» y «Lo que toman F11c y F12b»), su [plan](../011-c3c-correo/plan.md) (tarea 2.2) y su [quickstart](../011-c3c-correo/quickstart.md) (§3 y §6).
- **Las restricciones del coordinador:** las secciones «F11c», «F11a» y «Transversal» de `.coordinador/hallazgos-para-planes.md`, y las decisiones del 2026-10-28 (noche) de `.coordinador/clarify-decisiones.md`.

## Decisiones

### R34. La base y la integración

**Decisión.** F11c es una sola unidad, U8, con las tareas T054 a T059, numeradas después de las de F11b. Sale de `master` con F11a y C3c integradas, y llega a `master` en un solo PR.

**La base:**

- **Si C3c no está en `master`,** F11c no empieza: `POST /api/auth/forgot-password` no existe y `features.passwordReset` sigue fijo en `false`. T054 lo comprueba.
- **Si F11a no está en `master`,** F11c sale de `f11a/base` después de T035, y su PR espera al de F11a (TR-12).
- **F11b no hace falta:** F11c toca el acceso, y F11b toca «Tu cuenta».

**Por qué una sola unidad:** son una pantalla, un endpoint, un cambio en el ingreso y un campo del doble. Partirlo dejaría un PR sin pantalla.

### R35. Dónde vive: en el acceso de `features/sign-in`

**Decisión:**

- **La pantalla «Recuperá tu contraseña»** es otro estado de `AccessScreen`, `{kind: 'forgot', email}`, como el alta y el restablecimiento.
- **`LoginForm`** suma la prop `onForgotPassword(email)`: con `features.passwordReset` en `true`, dibuja el botón «¿Te olvidaste la contraseña?» en lugar de la nota sin correo.
- **El pedido** es `requestResetLink(client, email)`, en `api/access-endpoints.ts`.

**Por qué:**

- El enlace sale del ingreso (FR-060) y vuelve a él. `AccessScreen` ya decide qué pantalla del acceso se ve, y la pantalla funciona igual como página en el arranque que como diálogo después de un 401.
- El enlace del correo es el de la consola, `#restablecer=<token>&email=<email>`, que F11a ya abre (contrato de C3c, «Lo que toman F11c»). F11c no suma ninguna ruta ni ningún fragmento.

**Alternativas:**

- **Un slice propio,** `features/forgot-password`: tendría que importar `LoginForm` o que `sign-in` lo importe a él, y las dos son la misma interfaz, el acceso.
- **Un fragmento `#recuperar`:** cambia la gramática de URL de F2b y deja una vista que `app.js` no conoce, para una pantalla que no necesita enlace.

### R36. El texto del 202

**Las dos opciones:**

- **(a) el texto de la spec,** «Si el email corresponde a una cuenta, te llega un enlace para elegir una contraseña nueva. Vence en 60 minutos.»;
- **(b) el `message` del 202,** «Si hay una cuenta con ese email, te mandamos un enlace para elegir otra contraseña. Revisá tu correo en unos minutos.» El contrato de C3c dice que el front puede mostrarlo tal cual.

**Decisión: (a).** El plan la implementa, y va como decisión 2 del informe.

**Por qué:**

- **La spec la aprobó el usuario,** y sus «Restricciones» piden los textos tal cual.
- **En F11 los textos de éxito son del front,** y los de error, del servidor. «Listo: tu contraseña cambió…» (restablecimiento) y «Tu contraseña cambió…» (cambio) son del front, aunque el servidor responda `{}` o `{data}`.
- **Dice cuánto dura el enlace,** y eso evita un segundo pedido inútil.

**Lo que cuesta cambiar a (b):** una línea de `ForgotPasswordForm` y su valor esperado, con un respaldo si el cuerpo no trae `message`.

**Las dos cumplen** FR-061 y SC-010: el mismo texto exista o no la cuenta.

### R37. El 503 y el camino sin correo

**Decisión.** Ante un 503 `mail_unavailable`, se ve el mensaje del servidor («El taller no puede mandar correos por ahora.»), seguido de «Pedile el enlace a quien administra el taller.» (FR-061). El botón no se bloquea.

**Por qué no se bloquea:**

- El 503 trae `Retry-After: 3600`, pero `describeFailure` de F11a sólo lo convierte en espera ante un 429.
- Esperar una hora para repetir un pedido que va a dar lo mismo no ayuda, y el camino que sirve es el sin correo.

**Ante un 429,** `describeFailure` muestra el mensaje y cuánto falta, y el botón espera (FR-021).

### R38. `features.passwordReset` en el doble de la API (F11c-2)

**Decisión.** `ApiDouble` suma una propiedad pública, `features`, con el valor `{passwordReset: false, registration: false}`, que reemplaza a la constante `FEATURES`. `GET /api/session` la lee en cada pedido. Un E2E la prende con `api.features = { passwordReset: true, registration: false }` antes de `page.goto`.

**Por qué:**

- Es la misma forma que `account` y `signInAccount`, que ya son públicas y mutables.
- La alternativa, `api.on('GET /api/session', …)`, obliga a copiar el cuerpo entero de la sesión. Su `contentVersion` sale de `build/curriculum.meta.json` en una constante privada del doble, y desde A3 una versión equivocada rompe las porciones.

**Lo que no cambia:** con el valor por omisión, el doble responde la sesión igual que antes, así que ningún E2E se edita. Es una extensión de la forma canónica del doble («Decisiones del 2026-10-28 (noche)»), sin otra propiedad con el mismo dato.

### R39. SC-010 se comprueba por rol, no por texto

**Decisión.** Las pruebas de «no aparece «¿Te olvidaste la contraseña?»» buscan un botón o un enlace con ese nombre, y esperan cero.

**Por qué:** la nota sin correo de F11a dice «¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.». Buscar el texto encontraría la nota, y la prueba no podría distinguir los dos estados.

### R40. El campo y la validación

**Decisión:**

- **El campo «Email»** es `type="email"` con `autoComplete="email"` (FR-031). Viene cargado con lo que el alumno escribió en el ingreso, y «Volver al ingreso» lo devuelve.
- **El cliente valida sólo que esté** (FR-028). La forma la decide el servidor: con `noValidate`, el navegador no frena un email mal formado, y el 422 marca el campo con `errors.email`.
- **El pedido es anónimo:** no lleva `X-Taller-User` aunque haya una cuenta en el store, como cuando el ingreso se abre como diálogo después de un 401 (FR-017).

### R41. Después del 202

**Decisión.** El formulario se desmonta y queda el mensaje, con `role="status"` y el foco, y el botón «Volver al ingreso». Otro pedido vuelve a empezar desde el ingreso.

**Por qué:**

- Es el patrón del restablecimiento de F11a y de las acciones de F11b.
- Así el texto es el mismo para cualquier email, también en el segundo pedido del mismo documento: no queda ningún estado del primero.

### R42. El peso

**Decisión:** F11c suma como mucho **+5 000 caracteres** sobre la medida de T054, y el total queda bajo `BOOT_SIZE_LIMIT`, que es **1 500 000**.

**Por qué ese número:** un formulario de un campo, un endpoint y dos textos. Es una estimación, no una medida.

## Consultas de documentación (Context7)

El servidor `mcp__context7__*` agotó su cuota el 2026-10-28. Las consultas fueron al segundo servidor de Context7 de la sesión. Las de Playwright, Testing Library, jsdom, React, Zustand y fishery son las de research-f11b.md, que valen igual para F11c.

| Librería | Versión del proyecto | ID consultado | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| React Hook Form | 7.89.0 | `/react-hook-form/documentation` | `getValues(name)` en un manejador | Lee el valor sin suscribirse ni volver a dibujar | Sí: el ingreso pasa el email a la pantalla nueva con `getValues('email')` (R40) |
| React Hook Form | 7.89.0 | `/react-hook-form/documentation` | `setError` en `root.serverError` y el envío siguiente | Los errores sin regla se borran en el envío siguiente | No: es el patrón de F11a |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `route.fulfill` y la sesión del doble | Ver research-f11b.md | Sí: `api.features` en lugar de reemplazar la ruta de la sesión (R38) |
| Vite, nuqs, Laravel, Pest, PHPStan y Docker | — | sin consulta | — | F11c no los configura. La verificación a mano usa los comandos del quickstart de C3c | — |

## Mediciones de sólo lectura

| Qué | Valor | Fuente |
| --- | --- | --- |
| Las features del doble | `const FEATURES = { passwordReset: false, registration: false }`, fija | `qa/e2e/fixtures/api-double.ts:28`, en `a7b3c71d` |
| La nota sin correo | «¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.», un `<p class="form-hint">` | `features/sign-in/ui/LoginForm.tsx`, en `a7b3c71d` |
| El orden de `forgot-password` | 429 (red), 503 (`mail.available`), 422 (`errors.email`) y 202 | Contrato de C3c y su plan, tarea 2.2 (`throttle:forgot-password` y después `mail.available`) |
| El 202 | `{"message": "Si hay una cuenta con ese email, te mandamos un enlace para elegir otra contraseña. Revisá tu correo en unos minutos."}` | Contrato de C3c |
| El 503 | `{message: 'El taller no puede mandar correos por ahora.', code: 'mail_unavailable'}`, con `Retry-After: 3600` | Contrato de C3b, «Códigos nuevos», y `lang/es/api.php` |
| El enlace del correo | `<APP_URL>/#restablecer=<token>&email=<email con rawurlencode>`, que vence a los 60 minutos | Contrato de C3c |

## Textos que agrega el plan

| Dónde | Texto |
| --- | --- |
| El botón que vuelve de «Recuperá tu contraseña» | «Volver al ingreso» |

Los demás son de la spec: «¿Te olvidaste la contraseña?», «Recuperá tu contraseña», «Email», «Mandarme el enlace», «Mandando…», el texto del 202 (R36), y «Pedile el enlace a quien administra el taller.».

## Lo que no se verificó

- **Nada corrió.** El `AccessScreen` final y el `LoginForm` de la base se comparan en T054.
- **C3c no está implementada.** Sus respuestas salen de su contrato, que confirma los supuestos de la spec. T054 comprueba la ruta y los textos en el código real.
- **El correo real:** el enlace que llega por correo lo prueba a mano el quickstart de F11c, con Mailpit si el usuario da el permiso de su descarga (16,1 MiB, C3c-3).
