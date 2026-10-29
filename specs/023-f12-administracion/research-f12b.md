# Research: F12b · La administración, con correo

**Spec**: [spec.md](./spec.md) (F12b: FR-044 a FR-049, los transversales FR-050 a FR-061 sobre lo suyo, SC-003, SC-006 a SC-009 y la historia 7) | **Plan**: [plan-f12b.md](./plan-f12b.md) | **Validación**: [quickstart-f12b.md](./quickstart-f12b.md) | **Tareas**: [tasks-f12b.md](./tasks-f12b.md) | **Fecha**: 2026-10-28

Este documento junta las decisiones técnicas de F12b con sus alternativas, la tabla de consultas de documentación y lo que se midió sin tocar el repositorio. F12b se apoya en tres bases:

- **F12a,** planificada en [plan.md](./plan.md) y sin implementar. Su código se tomó tal cual de ese plan.
- **F11a,** implementándose en `impl-f11a` (`f11a/base`, `a7b3c71d`): el cliente de la API, los formularios, el doble de la API y el diálogo de acceso. Lo que todavía no está implementado (`formatLocalDateTime` y el Page Object `AccountPage`) se tomó de su plan (`specs/015-f11-acceso-cuenta/plan.md`).
- **C3c,** planificada en [`specs/011-c3c-correo/`](../011-c3c-correo/plan.md) y sin implementar. Su contrato HTTP ([contracts/http.md](../011-c3c-correo/contracts/http.md)) es la fuente de las formas y de los códigos.

Rigen también los hallazgos de `.coordinador/hallazgos-para-planes.md` (secciones «F12b», «F12a», «C3c» y «Transversal») y las decisiones del 2026-10-28 (noche) de `.coordinador/clarify-decisiones.md`.

## Decisiones

### R1. La base y la integración

**Decisión.**

- **La base.** `f12b/base` sale de `master` con F12a integrada (y, por lo tanto, con F11a: TR-12) y con la implementación de C3c (su PR de T031).
- **Las unidades.** U0 a U3 son PR contra `f12b/base`, y F12b llega a `master` en un solo PR, en T041. Es la forma de F12a (su R1).

**Por qué no espera el dominio.** La hoja de ruta y la versión de la spec anterior al 2026-10-28 decían que F12b esperaba a «C3c con el dominio». Pero F12b no necesita correo real:

- las pruebas usan el doble de la API, que prende `features.passwordReset`;
- la verificación a mano contra el stack puede usar el modo con correo sin proveedor: según el contrato de C3c («Cuándo hay correo»), con `MAIL_REQUIRED=false` y el mailer `log`, el taller tiene correo, `features.passwordReset` vale `true` y `worker-mail` completa `sentAt`.

El dominio sólo hace falta para mandar correo de verdad (T037 de C3c). **Lo decidió el usuario el 2026-10-28 (F12b-D1):** F12b arranca con la implementación de C3c en `master`, sin esperar el dominio.

**Alternativa: unidades directas a `master`.** Nadie ve lo nuevo sin correo, porque toda la superficie depende de `features.passwordReset`. Pero un solo PR deja una sola reversión, como en F12a.

### R2. Dónde se lee «hay correo»

**Decisión.** Un selector, `selectMailAvailable(state)`, en `pages/admin/model/mail.ts`, que devuelve `state.features.passwordReset`. Lo leen con `useStore(sessionStore, selectMailAvailable)` los tres componentes que cambian con el correo: `InviteForm`, `InvitationsSection` y `AccountsSection`.

**Por qué.**

- **Un solo lugar.** El contrato de C3c dice que `passwordReset` es la bandera de «hay correo» para la administración, y no hay otra. Si cambia el nombre de la bandera, cambia una línea.
- **La guarda de `useStore` (TR-5).** El selector devuelve un booleano: `useStore` con selector, nunca sin él. Zustand compara con `Object.is`, así que un primitivo no re-renderiza de más (Context7).
- **FR-062.** `AdminPage` recibe sólo la sección inicial y el cierre. Pasar la bandera por props obligaría a cambiar su contrato, o a reenviarla por dos niveles (prop drilling).

**Alternativas descartadas:**

- **Un selector en `entities/session`:** F11c lee la misma bandera con otro sentido («¿Te olvidaste la contraseña?»). La lectura de la administración queda en su slice.
- **Una prop de `AdminPage`:** contradice FR-062.

### R3. «Reenviar por correo» y «Pasar a enlace»: dos botones en la fila

**Decisión.** Con correo, cada fila de «Invitaciones» ofrece tres botones: «Reenviar por correo la invitación de {email}», «Pasar a enlace la invitación de {email}» y «Revocar la invitación de {email}». Cada uno abre su propia confirmación, con el botón «Reenviar por correo», «Pasar a enlace» o «Revocar». Sin correo, la fila queda como en F12a: «Reenviar la invitación de {email}» y «Revocar…».

**Por qué.**

- **`ActionDialog` no cambia de forma.** El contrato de F12a dice que F12b lo reutiliza «sin cambios de forma». Una confirmación con dos botones obligaría a que `send()` reciba la elección y a que el paso de la contraseña repita la misma elección después de un 423. Es el diálogo con más casos de borde de F12a (Review Focus 1 a 3).
- **Cada camino tiene su propio 429.** El tope de 300 correos frena «Reenviar por correo», y su espera (`Retry-After`) puede ser de horas. Con dos diálogos, la espera deshabilita sólo ese botón, y «Pasar a enlace» sigue disponible en la fila.
- **La historia 7, escenario 3:** «Dada una invitación con `sendFailedAt`, cuando se ve en la lista, entonces dice «No salió…» y ofrece «Reenviar por correo» y «Pasar a enlace»». Con dos botones, la fila los ofrece tal cual.
- **FR-047:** «Reenviar» ofrece las dos entregas, «con la confirmación de FR-032». Cada una tiene su confirmación, con el texto que dice qué cambia.
- **FR-051:** los nombres de los botones de la fila incluyen el email. Los textos de la spec, «Reenviar por correo» y «Pasar a enlace», quedan exactos en los botones de las confirmaciones.

**Alternativa descartada: una confirmación con dos botones.** Es lo que pronosticaba el contrato de F12a («en la confirmación del reenvío»). Ahorra un botón por fila, pero cambia `ActionDialog`, `ConfirmStep` y la repetición después del 423. **El usuario eligió los dos botones en la fila el 2026-10-28 (F12b-D2),** y T040 corrige el pronóstico del contrato.

**«Pasar a enlace» sobre una invitación que ya es por enlace.** Genera un enlace nuevo, como «Reenviar» en F12a. La spec lo dice así: «Esta última es la que ya funciona desde C3b».

### R4. Los resultados de invitar por correo

**Decisión.**

- `InviteResult` suma `rate_limited`.
- `InviteEntry` suma una propiedad **opcional**, `mailed?: MailedInvitation` (`{email, expiresAt}`). La completa el parser cuando una entrada trae `expiresAt` y no trae `url`, que es la forma de `created` y `renewed` por correo (contrato de C3c).
- `entryText` dice «Le llega por correo.» antes del vencimiento: «Invitación creada. Le llega por correo. Vence el {fecha}.».
- `rate_limited` usa el texto que eligió el usuario (F12b-D3, abajo). Sin enlaces, el resultado no muestra el aviso de copiarlos, y «Listo» cierra sin preguntar (F12a, FR-031).

**Por qué opcional.** Las specs de F12a construyen `InviteEntry` sin esa propiedad y comparan con `toEqual`, que ignora las propiedades `undefined` (Context7, Vitest 5.0.3). Una propiedad obligatoria las rompería, y F12b no edita las specs de F12a (R11).

**Alternativas descartadas:**

- **`mailed: MailedInvitation | null`, obligatoria:** obliga a editar `parse-admin.spec.ts`, `link-texts.spec.ts` y `action-dialog.spec.tsx` de F12a.
- **Un `IssuedLink` con `url: string | null`:** mezcla dos entregas en un mismo tipo, y `linksOf` tendría que filtrar.

**`rate_limited` y la ventana de 24 horas (F12b-2).** El tope cuenta 300 correos por cada 24 horas desde el primero, no por día del calendario. Desde que se agota, gana sobre `user_exists` e `invitation_pending` y no crea nada. Para el front eso quiere decir dos cosas:

- un lote puede traer `created` y después `rate_limited` para un email que ya tenía cuenta. La pantalla muestra cada resultado tal como llega, y el E2E lo fija con `ana@x.com`, que tiene cuenta;
- el texto original de la spec, «llegaste al tope de 300 correos por día. Probá mañana», no era exacto. Si el primer correo salió a las 10 y el tope se agotó a las 9 del día siguiente, se libera a las 10 del mismo día. La respuesta de invitar es un 200, sin `Retry-After`, así que el front no sabe cuándo. **El usuario eligió el 2026-10-28 (F12b-D3)** el texto «No salió: llegaste al tope de 300 correos en 24 horas. Probá más tarde o usá un enlace.», que la spec ya registra en FR-045 y en sus textos.

### R5. El reenvío por correo tiene su propio pedido y su propio parser

**Decisión.** `resendByEmail(client, adminId, invitationId)` manda `{delivery: "email"}` y lee la respuesta con `parseMailedInvitation`. `resendInvitation` de F12a no cambia: sigue mandando `{delivery: "link"}` y leyendo el enlace.

**Por qué.** El 200 por correo no trae `url` (`{id, email, role, delivery: "email", expiresAt}`). `resendInvitation` lo lee con `parseIssuedLink`, que exige `url`, así que un éxito se convertiría en `{kind: "unexpected"}` y la pantalla diría que el taller no respondió como esperábamos. Es la Review Focus 1.

**Alternativa: un parámetro `delivery` en `resendInvitation`.** El tipo de retorno pasaría a ser una unión, y cada llamada tendría que distinguirla.

### R6. «Mandarle un enlace para elegir contraseña»

**Decisión.**

- **La acción** es `'reset-password'`, la cuarta de `UserAction`, y va **al final**: `ACTION_SLOTS` pasa a `['status', 'role', 'delete', 'reset-password']`.
- **Cuándo se ofrece:** `actionsFor(user, ownId, mailAvailable = false)` la suma sólo con correo y sólo a un alumno activo (FR-048). A un admin no, porque su recuperación es sólo por consola (Q5 de C3c), y tampoco a una cuenta deshabilitada o que se está borrando.
- **El pedido:** `sendPasswordReset` hace `POST /api/admin/users/{id}/password-reset`, sin cuerpo, con `X-Taller-User`. Con un 202 sin cuerpo, el aviso dice «Le mandamos un enlace a {email}. Vence en 60 minutos.».

**Por qué al final.** `AccountsTable` usa `ACTION_SLOTS[index]` como `key` de cada botón (R4 de F12a): así el botón «Deshabilitar» pasa a «Rehabilitar» sin desmontarse y conserva el foco. Si la acción nueva fuera antes de «Borrar», una fila sin ella (un admin, o una cuenta deshabilitada) correría «Borrar» a otro lugar: al deshabilitar a una alumna, el botón «Borrar» cambiaría de `key` y React lo volvería a montar.

**Por qué `mailAvailable = false`.** Las specs de F12a llaman `actionsFor(user, ownId)` y esperan tres acciones. El valor por omisión las deja en verde sin editarlas.

### R7. El 503 `mail_unavailable` (FR-049)

**Decisión.** `reactionTo` suma una rama: ante `code: "mail_unavailable"` muestra el mensaje del servidor seguido del camino sin correo. Lo recibe en un cuarto parámetro, `withoutMail`, que vale «Usá un enlace para copiar.» por omisión (el texto de la spec).

- **Las invitaciones** usan el valor por omisión: el camino es «Enlace para copiar» o «Pasar a enlace».
- **El enlace de recuperación** no tiene enlace que copiar: su camino es la consola. `AccountsSection` pasa el texto de la consola de F12a («Para recuperar el acceso de alguien, generá el enlace con la consola del taller (`taller:password-reset-link`).»). Para eso, `ActionDialog` y `DialogRequest` suman una prop opcional, `withoutMail?: string`.

**Por qué no hay espera.** El 503 trae `Retry-After: 3600`. `describeFailure` de F11a sólo arma la espera para un 429 (`impl-f11a`, `frontend/src/shared/ui/form/describe-failure.ts`), así que el 503 no deshabilita nada: el admin puede pasar a enlace en el acto. La spec «shows the message of a 503 with the way of the link and lets the action be sent again» lo fija.

**Ninguna invitación se da por creada:** el 503 de invitar no abre el resultado, y los emails quedan escritos (SC-008).

**Alternativa: cambiar el mensaje de la falla en la sección.** Por ejemplo, que `AccountsSection` arme un `ApiFailure` con otro `message`. Esconde el mensaje del servidor detrás de un texto propio y duplica la lógica de `reactionTo`.

### R8. Los dos 429 nuevos (F12b-1)

- **El reenvío por correo con el tope agotado** responde 429 `too_many_requests` con `Retry-After` hasta que se libere la ventana, y no rota nada.
- **La recuperación de un tercero** responde 429 con `Retry-After` (hasta 60 s) si ya se emitió un enlace para esa cuenta en el último minuto, por cualquier camino.

**Decisión.** Los dos usan el manejo común de F12a (FR-041):

- el mensaje del servidor y «Podés volver a intentar en {tiempo}.»;
- el botón de la confirmación, deshabilitado hasta `Retry-After`.

En ningún caso se anuncia el envío: la sección escribe el aviso («Reenviamos…» o «Le mandamos…») sólo con un 2xx. Las specs «keeps the confirmation waiting when the cap stops a resend by mail, and says nothing went out» y «never says that the link went out when the server waits 60 seconds» lo fijan, y la segunda se comprobó rompiendo el orden a propósito.

**Lo que no se distingue.** El mensaje del 429 del tope es el genérico de `lang/es/api.php` («Demasiados intentos…»), el mismo del límite de 120 pedidos por minuto. El front no inventa otro: la espera, en horas, ya dice cuánto falta.

### R9. El estado del envío en la lista y las 24 horas (F12b-3)

**Decisión.** `mailStatusText(invitation)` arma una marca debajo del email, con la clase `.admin-mark` de F12a:

| `delivery` | `sentAt` | `sendFailedAt` | La marca |
| --- | --- | --- | --- |
| `link` | — | — | Ninguna |
| `email` | — | instante | «No salió: reenviala o pasala a enlace.» (spec) |
| `email` | instante | `null` | «Entregada al proveedor el {fecha}.» (spec) |
| `email` | `null` | `null` | «Por correo, en camino. Si no sale en 24 horas, lo vas a ver acá.» (del plan, aceptado por el usuario el 2026-10-28) |

**Las 24 horas.** El plazo de los reintentos de una invitación por correo es el vencimiento del enlace o 24 horas desde que se encoló, lo que llegue primero. Lo decidió el plan de C3c (su decisión 1), y quedó aceptado con el merge de #68 (`.coordinador/clarify-decisiones.md`, «Decisiones del 2026-10-28 (noche)»: «F12b toma las 24 horas»). Como una invitación vence a las 48 horas o a los 7 días, y reenviar renueva el vencimiento, el plazo es siempre de 24 horas. Por eso el texto del estado intermedio puede prometerlo.

**Por qué una marca y no una columna.** Una columna «Entrega» cambia el encabezado de la tabla de F12a (FR-021). La marca va en la celda del email, como «Sin verificar» en «Cuentas», y no cambia el ancho mínimo de la tabla (720 px), que se desplaza en su región a 320 px (FR-052). El E2E de 320 px lo comprueba con correo.

**El estado intermedio no lo pedía la spec.** Sin él, una invitación por correo en camino se ve igual que una por enlace. El usuario aceptó su texto el 2026-10-28 (F12b-D3).

### R10. La entrega al invitar

**Decisión.** Con correo, el formulario «Invitar» suma el campo «Entrega», un `<select>` con «Por correo» y «Enlace para copiar», después de «Rol». Por omisión elige «Por correo». Sin correo, el campo no existe y el pedido sigue con `delivery: "link"`.

- **El componente:** `DeliveryField`, con `useId` y `register('delivery')`. Es un `<select>` no controlado, como pide React Hook Form, y su `label` se asocia por `htmlFor` (Context7, React y React Hook Form).
- **Los valores por omisión** se calculan al montar: `delivery: mailAvailable ? 'email' : 'link'`. React Hook Form cachea `defaultValues` y los incluye en el envío aunque el campo no esté montado (Context7), así que sin correo el cuerpo lleva `delivery: "link"` sin un campo oculto.
- **Los textos de «sin correo»** («El taller todavía no manda correos…» y el de la consola) se muestran sólo sin correo (historia 7, escenario 1).

**Por qué «Por correo» por omisión.** Es la razón de tener correo: el alumno recibe la invitación sin que nadie copie un enlace. Si el admin prefiere el enlace, lo elige. El usuario lo aceptó el 2026-10-28 (F12b-D3).

**Alternativa: dos `radio`.** Son dos controles más en el orden del teclado, y el campo «Rol» de F12a ya es un `<select>`.

### R11. Las pruebas

- **Vitest, en archivos nuevos.** Las specs de F12b van en cinco archivos propios: `model/mail-model.spec.ts`, `api/admin-endpoints-mail.spec.ts`, `ui/action-dialog-mail.spec.tsx`, `ui/invitations-mail.spec.tsx` y `ui/accounts-mail.spec.tsx`. **Ninguna spec de F12a se edita**, y la compuerta lo comprueba con `git diff --diff-filter=M`. Así, que las 79 specs de F12a sigan en verde demuestra que nada cambió sin correo.
- **`render-admin.tsx`** suma `signInWithMail(user)`, que abre la sesión con `passwordReset: true`. `signInAs` de F12a no cambia.
- **El doble de la API (TR-11).** Se usa la forma canónica de F11a: la ruta antes del CSRF y `ApiCall.search`, sin `query` propio ni otro `replyTo`. Lo único que suma es un campo público, `features`, que la sesión simulada lee en cada pedido:
  - es el mismo patrón que `account` y `signInAccount`;
  - por omisión, `{passwordReset: false, registration: false}`, el mismo valor del `FEATURES` fijo de hoy, así que ningún escenario cambia;
  - los E2E con correo lo prenden en un `beforeEach`, antes de navegar.

  F11c necesita lo mismo (F11c-2). Si entra antes, T032 sólo usa lo que dejó.
- **Las alternativas del doble, descartadas:**
  - **pisar `GET /api/session` con `api.on`:** el escenario tendría que rearmar la sesión entera (la cuenta, la versión del contenido y los catálogos), y el pedido después del ingreso dejaría de leer `api.account`;
  - **una opción `sessionFeatures` del fixture, como `sessionAccount`:** cambia la firma de `ApiDouble.install` y `fixtures/index.ts` para un dato que un `beforeEach` alcanza.
- **La lista blanca angosta (TR-11):** cada escenario con una respuesta que no es 2xx declara `pageIssues.expectIssue(/status of NNN/, …)` con su código, nunca `/Failed to load resource/`. Es la forma de `session-stage.spec.ts` de F11a.
- **Un E2E nuevo,** `qa/e2e/specs/admin-mail.spec.ts`. Los cuatro de F12a no se editan (FR-060).
- **Las rutas con id,** una por una: `POST /api/admin/invitations/8/resend` y `POST /api/admin/users/12/password-reset`, y `POST /api/auth/confirm-password` registrada explícitamente (F12a-9).

### R12. El peso (FR-057)

- **El tope:** `BOOT_SIZE_LIMIT` de `qa/build-check.ts`, 1 500 000 caracteres (#76, en la base).
- **La medida:** F12b suma **4 001 caracteres** de JS a la administración (esbuild, «Mediciones»), y ninguno de CSS.
- **El presupuesto:** +6 000 sobre T027. Si se pasa, o si el total llega al tope, T041 se detiene y decide el usuario.

## Consultas de documentación

Context7, segundo servidor (`mcp__44441c24-…`), el 2026-10-28. Las versiones son las de `package-lock.json` de `impl-f11a` (React Hook Form) y de `master` (el resto).

| Librería | Versión del repo | ID consultado | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| React Hook Form | 7.89.0 | `/react-hook-form/documentation` | `defaultValues` y `register` de un `<select>` | `defaultValues` se cachean y se incluyen en el resultado del envío; un `<select>` se registra con `{...register('campo')}` | Sí: sin correo no hay campo «Entrega», y el cuerpo lleva `delivery: "link"` desde `defaultValues` (R10) |
| React | 19.2.8 | `/websites/react_dev_reference` | `<select>` no controlado y `label htmlFor` con `useId` | Un `<select>` es controlado o no, nunca las dos cosas; se asocia a su `label` con `useId` | Sí: `DeliveryField` no recibe `value` y usa `useId` (R10) |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | `toEqual` contra `toStrictEqual` con propiedades `undefined` | `toEqual` ignora las propiedades `undefined`; `toStrictEqual` no | Sí: `mailed` es opcional, y las specs de F12a siguen en verde sin editarse (R4) |
| Testing Library (user-event) | 14.6.7 | `/testing-library/user-event` | `selectOptions` sobre un `<select>` | Elige por `value` y dispara `input` y `change` | No: `user.selectOptions(campo, 'link')` |
| Zustand | 5.0.15 | `/pmndrs/zustand/v5.0.12` (la más cercana) | `useStore` con un selector que devuelve un primitivo | Los primitivos se comparan por valor (`Object.is`) | No: `useStore(sessionStore, selectMailAvailable)` (R2) |
| fishery | 2.4.0 | `/thoughtbot/fishery` | `build(params)` y la mezcla con los valores de la fábrica | `build` mezcla en profundidad los parámetros sobre lo que devuelve la fábrica | No: `adminInvitationBodyFactory.build({ delivery: 'email', sendFailedAt })` |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `selectOption({ label })`, `toBeDisabled`, `toHaveCount` y `name` con `exact` | `name` es por omisión una subcadena sin distinguir mayúsculas; `exact` exige el texto entero | Sí: los botones se buscan con `exact`, y «sin correo» busca `/por correo\|Pasar a enlace/` con 0 resultados |

**No se consultaron, con su motivo:**

- **Vite:** F12b no cambia `vite.config.ts`.
- **jsdom:** F12b no usa nada que F12a no use (el stub de `<dialog>` de `render-admin.tsx`).
- **nuqs:** F12b no lo usa (FR-056).
- **Laravel, Pest y PHPStan:** F12b no toca el backend. El contrato de C3c se leyó en su plan y en `backend/api/lang/es/` (`api.php` y `admin.php`).

**Fuera de Context7:**

- el texto de la consola ante un recurso que falla, «Failed to load resource: the server responded with a status of 503», es de Chromium. La forma `/status of NNN/` sale de `qa/e2e/specs/session-stage.spec.ts` de F11a (`impl-f11a`);
- que `describeFailure` sólo arma la espera ante un 429 sale de leer `describe-failure.ts` de F11a.

## Mediciones (de sólo lectura, fuera del repositorio)

Todo corrió en el scratchpad de la sesión, en un arnés armado así:

- **F11a:** el árbol de `impl-f11a` en `a7b3c71d`, sacado con `git archive`, con una copia de sus `node_modules`. No se corrió nada dentro del worktree.
- **De los planes de F11a:** `formatLocalDateTime` y el Page Object `AccountPage`.
- **F12a:** las 50 piezas de código de [plan.md](./plan.md), extraídas por script: el modelo, los pedidos, la interfaz, sus specs, los datos del contrato, el Page Object y los cuatro E2E.
- **F12b:** el código de este plan, sobre esa base.

**Lo que dio:**

| Comprobación | Resultado |
| --- | --- |
| Vitest de F12a, antes de F12b | 11 archivos, 79 specs en verde |
| Vitest con F12b | 16 archivos, 110 specs en verde: las 79 de F12a, sin editar, y 31 nuevas |
| `tsc -p frontend/tsconfig.app.json` y `tsc -p qa/e2e/tsconfig.json` | 0 errores |
| ESLint (`eslint.config.ts` del repo, complejidad 10) | 0 errores y 0 avisos en `pages/admin` y `qa/e2e` |
| Prettier | Sin diferencias |
| Archivos de F12a y de F11a que F12b modifica | 15 en `frontend/src/pages/admin/` y 3 en `qa/e2e/` (el doble, los datos del contrato y el Page Object); ninguna spec |
| Peso, con esbuild 0.28 (`minify`, `charset: 'utf8'`; React, Zustand, React Hook Form y los slices de F11a afuera) | `pages/admin` pasa de 29 737 a 33 738 caracteres de JS: **+4 001**. CSS: 0 |

**Las pruebas que muerden.** Cuatro se comprobaron rompiendo el código a propósito:

| El defecto introducido | Las specs que fallan |
| --- | --- |
| `resendByEmail` lee la respuesta con `parseIssuedLink` (R5) | «resends by mail and reads the answer without a link» y «resends by mail, announces it and asks for the list again» |
| El 503 arma la espera con su `Retry-After` (R7) | «adds the way without mail to the message of a 503», «shows the message of a 503 with the way of the link and lets the action be sent again» y «shows the 503 with the way of the link, keeps the emails and creates nothing» |
| La sección anuncia el enlace antes de mirar la respuesta (R8) | «never says that the link went out when the server waits 60 seconds» |
| La acción nueva va antes de «Borrar» (R6) | «offers the reset link last…» y «is offered last, only to an active student and only with mail» |

**Los E2E:** `admin-mail.spec.ts` tipa y pasa ESLint, pero **no corrió**. Necesita F11a y F12a cableadas (la etapa de sesión, `AccountRoot` y el contenedor), que el arnés no tiene.

## Textos que agrega el plan

La spec no los fijaba. El usuario los aceptó el 2026-10-28 (F12b-D3), y la spec registra la decisión en `## Clarifications`.

| Dónde | Texto |
| --- | --- |
| La invitación por correo, todavía sin `sentAt` ni `sendFailedAt` | «Por correo, en camino. Si no sale en 24 horas, lo vas a ver acá.» |
| El campo de la entrega | «Entrega», con «Por correo» elegido por omisión |
| Los botones de cada fila con correo | «Reenviar por correo la invitación de {email}» y «Pasar a enlace la invitación de {email}» |
| La confirmación de «Reenviar por correo» | Título «¿Reenviar por correo la invitación de {email}?». Texto: «El enlace anterior deja de valer, y le mandamos uno nuevo por correo. El nuevo vence en 7 días, o en 48 horas si la invitación es de admin.» |
| La confirmación de «Pasar a enlace» | Título «¿Pasar a enlace la invitación de {email}?». Texto: «El enlace anterior deja de valer, y el nuevo no sale por correo: se ve una sola vez acá, para que lo copies. El nuevo vence en 7 días, o en 48 horas si la invitación es de admin.» |
| Después de reenviar por correo | «Reenviamos la invitación de {email}. Le llega por correo.» |
| El resultado de invitar por correo | «{texto del resultado} Le llega por correo. Vence el {fecha}.», por ejemplo «Invitación creada. Le llega por correo. Vence el 12 de octubre de 2026 a las 12:30.» |
| El botón de la recuperación en la fila | «Mandarle un enlace para elegir contraseña a {nombre}» |
| La confirmación de la recuperación | Título «¿Mandarle a {nombre} un enlace para elegir contraseña?». Texto: «Le llega por correo a {email} y vence en 60 minutos. Hasta que elija otra, su contraseña de ahora sigue valiendo.». Botón «Mandar el enlace» |
| La recuperación con el correo caído | El mensaje del servidor, seguido del texto de la consola de F12a |

## Lo que no se verificó

- **Los E2E no corrieron:** necesitan F11a y F12a cableadas. Tipan contra el doble y el Page Object de los planes.
- **El peso real** sale de Vite 8. La medida usa esbuild, y T027 y T041 miden `html.length`.
- **El stack con correo:** el modo `MAIL_REQUIRED=false` con el mailer `log`, `sentAt` completado por `worker-mail` y el 429 real del broker. Lo comprueba la verificación a mano de T041 (quickstart-f12b §4), con C3c implementada.
- **El lector de pantalla** sobre las marcas de la lista y los avisos.
- **F12a puede llegar distinta de su plan.** El código de F12b se escribió sobre el plan de F12a. T027 compara las firmas reales, y cada tarea aplica su diff sobre el archivo real.
