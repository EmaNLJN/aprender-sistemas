# Research: F11a · El acceso

**Spec**: [spec.md](./spec.md) (F11a: FR-001 a FR-052, los transversales FR-066 a FR-077, SC-001 a SC-008, SC-011 y SC-012, historias 1 a 5) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-28

Este documento junta las decisiones técnicas de F11a con sus alternativas, la tabla de Context7 y lo que se midió sin tocar código. Se planificó leyendo el código de `f2b-acum` (`2b37caf4`: `master` con F2a, A2 y las cuatro unidades de F2b), que es la base sobre la que se implementa F11a, y el backend de `master` (`dd870a9c`). No se corrió nada en esa copia, ni se descargó nada: los metadatos de npm salen de `npm view`.

## Decisiones

### R1. La forma de integración: unidades apiladas y un solo merge a `master`

**Decisión.** F11a se parte en cinco unidades con su compuerta (U0 a U4, `plan.md`). Cada unidad es un PR contra la rama de integración `f11a/base`, que sale de `master` con F2a, A2 y F2b. Cada PR tiene su propio punto de reversión, que es revertir su merge en `f11a/base`. F11a llega a `master` en un solo PR, cuando pasa la compuerta final y el usuario hizo lo suyo: escribir el texto del aviso e invitar a cada alumno.

**Por qué.** Desde F11a, la sesión es obligatoria (Q1). Esa obligación no se puede integrar a medias: un `master` que pide sesión sin el alta por invitación deja sin cuenta a quien recibe un enlace. Si además falta la reaceptación del aviso, deja pasar una cuenta con `privacyAccepted: false`, en contra de FR-046. El invariante de integración es este: **`master` nunca exige la sesión si falta el ingreso, el alta con su aviso o la reaceptación.** F2b mandaba cada unidad a `master` por separado; acá esa forma rompe el taller entre una unidad y la siguiente.

**Alternativa: cada unidad a `master` y un «interruptor» al final.** U1 a U4 entran a `master` sin cablear las etapas, y una unidad U5 chica suma `tokenStage` y `sessionStage` a `runBoot`. Cada unidad tiene su reversión en `master`, y el interruptor se revierte solo. El costo: hasta el interruptor no corre ningún E2E del acceso, porque todos necesitan la etapa cableada. El TDD de punta a punta de U1 a U4 queda para la última unidad, y `master` acumula código que no usa nadie. Es la decisión 1 del informe para el usuario.

### R2. Capas y slices

| Slice | Qué tiene | Quién lo usa |
| --- | --- | --- |
| `shared/api/http` | El cliente de la API (`createApiClient`): CSRF, `X-Taller-User`, 419, errores y respuestas que no son JSON. El contexto `ApiClientContext` | Todas las partes de F11, A3, D1c, A4, F8 y F12 |
| `shared/ui/form` | Los campos con sus errores accesibles, el error general, la traducción de una falla de la API a errores de React Hook Form, la guarda contra el doble envío y la espera de `Retry-After` | F11a a F11c, F8 y F12 |
| `shared/lib` | `formatWait` (cuánto falta en segundos, minutos u horas) y `formatLocalDateTime` (una fecha en español, sin depender del formato de ICU) | F11, F8 y F12 |
| `entities/session` | Los tipos de la cuenta publicada y de la sesión, `parseSessionBody`, el store de Zustand, `fetchSession` y la regla del largo de la contraseña | F11, A3, D1c, A4 y F12 |
| `entities/privacy-notice` | El texto del aviso y su versión (Q2), y su componente y su diálogo | Ingreso, alta, reaceptación, «Tu cuenta» y F11b |
| `features/sign-in` | «Pedir el ingreso» (`requestSignIn`), `reauthenticate` (FR-020) y las pantallas del acceso: ingreso, invitación y alta, restablecimiento y reaceptación | La etapa de sesión, A3, F8, F11b y F12 |
| `pages/account` | «Tu cuenta»: la entrada, el diálogo y «Salir» | F11b, F11d y F12a (suman secciones) |
| `app/account` | La raíz de React de la cuenta, la instancia del cliente, el shell inerte y la recarga | `app/boot` |
| `app/boot` | La etapa de los tokens y la de sesión, con su vista | `main.tsx` |

**Por qué `requestSignIn` vive en `features` y no en `pages`.** F12a (`pages/admin`) lo llama ante un 401, y dos páginas no se importan entre sí. A3 (`shared/api/content`) y F8 (`features/progress-backup`) lo reciben inyectado desde `app/`, porque `shared` y otra `feature` no pueden importar `features/sign-in`. El tipo `RequestSignIn` se exporta para que esas firmas no dependan de la implementación.

**Alternativa descartada:** una sola página `pages/account` con el acceso y «Tu cuenta». No tiene costo para F11a, pero F12a no podría llamar a «pedir el ingreso» sin que el diálogo le pase la función por props, y su spec dice que la página de administración no importa nada de «Tu cuenta».

### R3. El cliente de la API

- **Resultado discriminado, sin excepciones.** Cada pedido devuelve un `ApiResult`: `{ok: true, status, body}`, o `{ok: false, failure}`. Una falla es una de estas:
  - `response`: un `{message, code}`, con sus `fieldErrors` y `retryAfterSeconds`;
  - `signed-out`: un 419 cuya sesión renovada ya no tiene cuenta;
  - `account-changed`: un 419 cuya sesión renovada es de otra cuenta;
  - `network`: el pedido no llegó o se cortó;
  - `unexpected`: una respuesta que no es JSON, o un cuerpo que no tiene la forma de un error.

  Así, React Hook Form recibe la falla en el manejador, sin que un `throw` cruce `handleSubmit`. El `body` es `unknown`: quien llama lo valida con su parser (`parsePublishedUser`, por ejemplo) y no hay ningún `as T`.
- **La cookie se lee en cada pedido y se decodifica.** El valor de `XSRF-TOKEN` cambia al salir, al vencer la sesión y al descartarla (FR-016). La documentación de Laravel (Sanctum, «CSRF Protection») dice que el token «should be URL decoded and passed in an X-XSRF-TOKEN header». El nombre de la cookie vive en una sola constante (`XSRF_COOKIE_NAME`), por si C4 la prefija.
- **`X-Taller-User` va por pedido** (`asUser: number`). El cliente no conoce el store de la sesión, y quien llama pasa el id que tiene en memoria. Un pedido sin `asUser` es anónimo (FR-017).
- **El 419** pide `GET /api/session` y reintenta una sola vez si el pedido es anónimo o si la cuenta es la misma. Con `user: null`, devuelve `signed-out`. Con otra cuenta, devuelve `account-changed` con el mensaje del 419, para que la pantalla ofrezca «Recargar». Si la renovación misma falla, devuelve el 419 original (FR-018).
- **El 401 no lo resuelve el cliente.** Lo recibe quien llama, que decide cuándo pedir el ingreso. F12 necesita cerrar su confirmación antes de que aparezca el ingreso, y F8 no reintenta sola una operación destructiva (su L3). Para no repetir la regla de FR-020, `features/sign-in` exporta `reauthenticate`.
- **Alternativa descartada:** que el cliente espere el ingreso ante un 401 y devuelva el control después. Centraliza la regla, pero le quita a F12 y a F8 el orden de sus diálogos.

### R4. «Pedir el ingreso»

- **Un solo pedido a la vez.** `requestSignIn(options)` devuelve una promesa que se resuelve con la cuenta. Si ya hay un pedido en curso, devuelve la misma promesa: dos 401 simultáneos muestran un solo ingreso (Review Focus 2).
- **Dos presentaciones.**
  - **Página**, en el arranque: el acceso ocupa la pantalla, `.app-shell` y `.skip-link` quedan `inert` y el título es un `h1`.
  - **Diálogo**, con el shell andando: un `<dialog>` modal sobre «Tu cuenta», sin cerrarlo (FR-020). El título es un `h2`, para que el `getByRole('heading', {level: 1})` de la red siga encontrando uno solo.

  La etapa de sesión pide la página, y A3 la pide también ante un 401 en medio del arranque. Por omisión es un diálogo.
- **El token vive en memoria.** La etapa de los tokens lo guarda en un cierre; la etapa de sesión lo toma una vez (`take()`) y lo pasa a `requestSignIn`. El pedido en curso lo tiene hasta que la pantalla termina, y después se descarta. Nunca pasa por el store de la sesión, por `window`, por el almacenamiento ni por la URL. FR-070 prohíbe el «estado global»: el plan lo lee como el store de la sesión y `window`, que es lo que podría filtrarse o persistir. El pedido en curso es memoria privada del módulo (FR-002).
- **El tiempo del ingreso no cuenta para ningún tope** (FR-006). La etapa arma un tope por cada pedido de la sesión y lo borra cuando el pedido termina, así que el reloj no corre mientras se espera al alumno. SC-003 lo fija con el reloj simulado.

### R5. La etapa de los tokens

- Reconoce `#invitacion` seguido de `=` o del final, y `#restablecer` seguido de `=`, de `&` o del final. Para el restablecimiento lee `restablecer=` y `email=` partiendo el fragmento por `&`, y decodifica el email con `decodeURIComponent`. `PasswordResetLinks.php` arma el enlace con `rawurlencode($user->email)`, que nunca emite un `+` literal; `URLSearchParams` convertiría un `+` en espacio. Un email que no se puede decodificar queda `null`, y la pantalla dice que el enlace no sirve.
- Un `#invitacion` sin `=` da un token vacío. La consulta sale igual, y el servidor responde 422 `validation_failed` con `errors.token` (no 404, como suponía el caso borde de la spec). La pantalla lo muestra como cualquier falla de la consulta: el mensaje, sin formulario, con el camino al ingreso.
- Borra el fragmento entero con `history.replaceState(history.state, '', pathname + search)`. No pide nada a la red y corre antes que todo. Guarda `hadToken`, que A3 lee (su FR-024).

### R6. La etapa de sesión

- Pide `GET /api/session` con un tope de **20 s** y muestra «Conectando con el taller…» a los **400 ms**. Son los valores de la compuerta de A2 (`CONTENT_TIMEOUT_MS` y `LOADING_DELAY_MS`), y A3 unifica después el tope del intento entero (su FR-010).
- Copia la guarda `settled` de `content-gate.ts`. El `flush()` del arnés de `boot-check` corre todos los timers encolados y su `clearTimeout` no hace nada: sin la guarda, la espera y el tope se dispararían después de resolver.
- Con `user: null`, con un token o con `privacyAccepted: false`, llama a `requestSignIn({presentation: 'page', reason: 'boot', token})`, y al terminar vuelve a pedir la sesión una vez (FR-007). Si ese segundo pedido falla, muestra el error con «Reintentar».
- Sin respuesta, con un 5xx o con algo que no es JSON: «No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.», con «Reintentar». Con un 429: el mensaje de Nginx y «Podés volver a intentar en {tiempo}.», con el botón deshabilitado hasta que pase el `Retry-After`. Un pedido por vez, sin recargar (FR-009).
- **La vista va en un elemento propio, `#session-status`,** entre la barra superior y `#main`, escrita con `innerHTML` como la vista de A2. No puede ir en `#main`: `ShellPage.goto` espera `#main > :not([data-content-gate="loading"])`, y la espera de la sesión lo liberaría antes de tiempo. Tampoco en la raíz de React, porque `boot-check` no la monta (R11). La región `status` o `alert` existe sólo mientras se muestra, y `clear()` la vacía (FR-076).

### R7. Dónde se dibuja

- **Tres elementos estáticos nuevos en `frontend/src/index.html`.**
  - `#session-status`, vacío, entre `header.topbar` y `#main`. Su regla `:empty` lo oculta.
  - `#account-entry`, dentro de un `div.topbar-actions` que envuelve al `.language-switch`. Así la barra sigue con dos hijos, y `justify-content: space-between` no corre el selector al medio.
  - `#account-root`, después de `.app-shell` y antes de los `<dialog>` del legacy.
- **Una sola raíz de React** sobre `#account-root`, con un portal (`createPortal`) para la entrada en `#account-entry`. La documentación de React confirma que el portal hereda el contexto del árbol, así que el cliente llega por `ApiClientContext` sin prop drilling.
- **La raíz se monta sola, una vez.** La montan la primera llamada a «pedir el ingreso» y la sesión lista. Si falta el host, no hace nada: es el caso del DOM falso de `boot-check`.
- **La entrada se ve** cuando hay cuenta y `privacyAccepted: true`. Por eso no aparece mientras se pide la reaceptación (FR-046).
- **Lo que los E2E de la red exigen del DOM.** Ningún `.sr-only` nuevo: R5 de `css-contract` usa `page.locator('.sr-only')` en modo estricto. La entrada no lleva `.button`: el contrato de movimiento reducido mide `.button` `.first()`, y la barra está antes de `#main`. Ningún `h1` visible con el shell andando, ni un «Reintentar» o un `role="alert"` mientras no se muestra nada.

### R8. Los formularios

- **React Hook Form 7.89.0,** con campos no controlados (`register`), `criteriaMode: 'all'`, `noValidate` en el `<form>` y el envío sólo por `handleSubmit` (FR-024; la CSP tiene `form-action 'none'`).
- **Varios motivos por campo.** `setError(name, {types: {server0: m0, server1: m1}})` guarda todos los mensajes, y el campo los muestra en una lista (FR-026). La documentación de React Hook Form recomienda `types` con `criteriaMode: 'all'` justamente para eso.
- **El error general** va en `root.serverError` (disponible desde 7.43.0, según la documentación de `setError`), y React Hook Form lo borra en el envío siguiente. Lo muestra `ServerError`: un `<div role="alert" tabIndex={-1}>` que toma el foco cuando no hay errores de campo. Con un error de campo, el foco va al primero (`shouldFocus` del primer `setError`, FR-027).
- **`describeFailure(failure, visibleFields)`** es una función pura que reparte la falla: los `errors.<campo>` visibles van al campo, y el resto, al general. Además marca `retryAfterSeconds`, `offerReload` (409 `account_mismatch` y `account-changed`) y `signedOut` (401 y `signed-out`).
- **El doble envío.** `isSubmitting` deshabilita el botón después del render, pero dos clics en el mismo cuadro entrarían los dos. `useGuardedSubmit` ignora un envío mientras el anterior no terminó (FR-030).
- **La espera de un 429** la lleva `useRetryCountdown`: deshabilita el envío hasta que pasa el `Retry-After` y limpia su timer al desmontar (FR-021).

### R9. El largo de la contraseña

`checkNewPasswordLength(value)` cuenta `[...value.normalize('NFC')].length`, como `PasswordPolicy` (puntos de código después de NFC). Devuelve los mensajes del servidor: «Tiene que tener al menos 15 caracteres.» y «Puede tener hasta 64 caracteres.» (`lang/es/password-policy.php`, FR-029). Vive en `entities/session` porque es una regla de la cuenta que usan F11a, F11b y F12, no un detalle de un formulario.

### R10. El doble de la API de los E2E

- **Su lugar.** Vive en `qa/e2e/fixtures/api-double.ts`, y `fixtures/index.ts` sólo lo registra como fixture automático (`{auto: true}`).
- **La cuenta por omisión.** La da una opción (`sessionAccount: [STUDENT, {option: true}]`): un estudiante con el aviso aceptado. Cada escenario la cambia con `test.use({sessionAccount: null})` o con `ADMIN`, que es lo que pide F12.
- **Es stateful.** El ingreso, el alta y la salida cambian lo que responde `GET /api/session`, y aceptar el aviso cambia `privacyAccepted`.
- **Un solo `page.route('**/api/**')`** con una tabla `«MÉTODO /api/ruta» → manejador`. `api.on(ruta, manejador)` reemplaza o suma, y gana el último, que es la regla de Playwright entre rutas («handlers execute in reverse order of registration»). F8 suma `GET /api/progress`, `confirm-password` y el reset; F12, las rutas de `/api/admin`; A3, las 17 porciones.
- **Falla cerrado.** Una ruta `/api/*` sin manejador responde 404 `not_found`, se anota y hace fallar el test al desmontar, igual que `StrictNetwork`.
- **El CSRF.** La cookie `XSRF-TOKEN` se pone con `context.addCookies`, y su valor lleva un `%3D`. No se probó si Chromium aplica un `Set-Cookie` de una respuesta cumplida con `route.fulfill`, y `addCookies` no depende de eso. El doble responde 419 a un pedido que modifica sin el token decodificado, y rota la cookie al ingresar y al salir.
- **Lo que anota de cada pedido.** El método, la ruta, `x-xsrf-token`, `x-taller-user` y el cuerpo. Los encabezados salen de `request.headers()`, que es síncrono: según la documentación de Playwright sólo omite los de seguridad, como las cookies, y `allHeaders()` sumaría una espera en cada pedido interceptado. Si un E2E encuentra que falta uno de los dos encabezados propios, el doble responde 419 a todo pedido que modifica y la falla salta en T014 y en T024.

### R11. Los checks del arnés (FR-076) y el riesgo 6 de la spec

- **`qa/lib/content-server.ts`** responde `GET /api/session` con un `Response` real de Node (`text()` y `headers` incluidos) y lo anota en `sessionRequests`, aparte. `requests` sigue con sólo el contenido, porque `boot-check` y `dist-content-check` exigen `server.requests` igual a `[CONTENT_URL]`, o de largo 2, y esos escenarios no se editan.
- **`qa/lib/boot-harness.ts` no cambia.** El DOM falso devuelve `null` para un id que no registró, así que la raíz de la cuenta no se monta en `boot-check`. Si se registraran `account-root` y `account-entry`, `createRoot` le colgaría oyentes al contenedor, y el escenario «main.tsx without its call evaluates quietly» (0 oyentes) fallaría.
- **El riesgo 6 de la spec** pedía «comprobar que la entrada se dibuje en el DOM falso de `boot-check`». La comprobación da que no se dibuja, y que no conviene que lo haga: la entrada y el diálogo se prueban con Testing Library y con E2E. Es una desviación de la spec, anotada en el analyze.
- **`boot-check` suma un escenario y no edita ninguno.** El nuevo comprueba que la sesión se pide una vez, antes que el contenido.
- **`load-order-check` suma dos restricciones de etapas:** `tokenStage` antes que `sessionStage`, y `sessionStage` antes que `contentGate`. Las etapas entran en `runBoot([...])` como identificadores importados, porque el check parte la lista por comas.

### R12. El proxy de `npm run dev` y de la vista previa (FR-036)

- **`npm run dev`.** Suma `server.proxy['/api']` hacia `http://127.0.0.1:${TALLER_PORT ?? 8080}`, el Nginx del stack, que pasa `/api/` a PHP. La cookie de Laravel no lleva `Domain`, así que queda en el host de Vite. Las cookies no distinguen puertos: una sesión abierta en 8080 también vale en 5173 y en 8765.
- **`vite preview` no pasa `/api/`.** La documentación oficial de Vite (`preview.proxy`, «Default: `server.proxy`», consultada con WebFetch) dice que la vista previa heredaría el proxy, y `vite preview` es el servidor de los E2E. Por eso el plan fija `preview.proxy: {}` y lo vigila con `qa/vite-proxy-check.ts` (Review Focus 5).
- **La vista previa de Docker** (`docker/compose.preview.yaml`) deja `network_mode: bridge`. Se une a la red interna del stack como externa (`taller-rust-go_web`) y conserva una red propia, no interna, para el puerto publicado. El Nginx de la imagen resuelve `php` con el DNS de Docker (`127.0.0.11`), que no existe en el bridge por omisión. La documentación de Compose confirma que los servicios de una red externa se alcanzan por nombre, y que la red tiene que existir antes del `up`: sin el stack, la vista previa no arranca, como prevé la spec.

### R13. `PRIVACY_VERSION` no llega a la API (hallazgo)

`config/taller.php` lee `env('PRIVACY_VERSION', '2026-10-dev')`, pero `docker/compose.yaml` no la pasa en `x-laravel-env`, y no hay ningún `env_file`. Hoy el stack usa siempre `2026-10-dev`, aunque el `.env` diga otra cosa. F11a suma `PRIVACY_VERSION: '${PRIVACY_VERSION:-2026-10-dev}'` a `x-laravel-env`, y no a `x-laravel-base-env`, para que Pest no la herede del `.env` del host. `compose-runs-check` e `init-env-check` no fijan esa lista. Es configuración del despliegue y no cambia ningún contrato de C3a, pero toca `docker/`: va como hallazgo en el informe.

### R14. La pila de DOM de Vitest: la pide F11a

**Decisión.** F11a pide permiso para `jsdom` 30.1.2, Testing Library y `fishery` 2.4.0 en su unidad 0, salvo que F3, F4 o F9 la hayan integrado antes. En ese caso, la tarea sólo verifica las versiones.

**Por qué F11a y no el primer port:**

- F11a está en el camino crítico: la esperan A3, F8, F12a y D1c.
- Sus formularios son el primer comportamiento de componente con reglas finas: `aria-invalid`, el foco en el primer error, varios motivos por campo y el doble envío. Un E2E los cubre caro y grueso.
- F3, F4 y F9 corren en el mismo tramo, y cualquiera puede llegar después.

**El costo:** los 58 paquetes de la pila (ADR 0008, «Medidas»), que entran a `npm ci` de las dos imágenes.

**Los proyectos de Vitest.** La documentación de Vitest 5 dice que un proyecto en línea hereda la raíz (`extends` vale `true` desde 5.0) y que los arreglos se concatenan. Por eso la raíz no puede declarar `include` ni `environment`: cada proyecto declara los suyos. `node` toma `**/*.spec.ts`; `dom` toma `**/*.spec.tsx`, en `jsdom`, con el setup `frontend/src/vitest.setup.ts`, que llama a `cleanup()` y suma `@testing-library/jest-dom/vitest`.

### R15. El peso

- **La línea base.** F2b midió 1 136 702 caracteres antes de su primera unidad (T020); el coordinador midió 1 141 337 con F2b entera. El tope de `build-check` es 1 250 000.
- **El presupuesto de F11a es de +60 000 caracteres** sobre la línea base de T001, con el texto del aviso adentro. Así quedan unos 48 000 para A3 y los ports.
- **Cómo se separa la librería del código propio.** El PR informa `html.length` antes y después, y además un análisis de esbuild (`metafile` con `analyzeMetafile`, ya instalado) sobre `main.tsx`, que separa los bytes de `node_modules/react-hook-form` de los de `frontend/src/`.
- **La condición de corte.** Si F11a supera el presupuesto, U4 no cierra: se informa la medida y decide el usuario entre achicar y subir el tope.
- **La estimación** es de 25 000 a 35 000 para React Hook Form después del tree-shaking. Bundlephobia da 43 085 para el paquete entero. Falta medirla.

### R16. Después de restablecer con una sesión viva

El restablecimiento no abre sesión ni toca la actual (FR-043). Al terminar, se ve el ingreso con el email del enlace ya cargado, aunque haya una sesión viva de otra cuenta, porque la etapa de sesión espera que «pedir el ingreso» termine con una cuenta. Si el alumno quiere seguir con la sesión vieja, recarga: el token ya no está en la URL. La alternativa de ofrecer «Seguir como {nombre}» suma un camino y textos que nadie pidió.

### R17. «Tu cuenta»

- **El diálogo** es un `<dialog>` nativo con `showModal()`, que deja inerte el resto y cierra con Esc. Al cerrarlo, el foco vuelve a la entrada con un `focus()` explícito en el evento `close`, sin depender de que el navegador lo restaure (FR-013).
- **En el celular** ocupa la pantalla entera, con una regla de `@media (max-width: 590px)` en `account.css` (FR-067).
- **«Salir»** recarga ante un 204 o un 401, ofrece «Recargar» ante un 409 y dice «No pudimos cerrar la sesión.» con «Reintentar» ante la red o un 5xx (FR-050 a FR-052).
- **La recarga se inyecta.** `reloadDocument` llega por props desde `app/account`, porque jsdom no navega (su documentación: «does not handle navigation»).

### R18. La fecha de vencimiento de la invitación

`formatLocalDateTime(iso)` arma «12 de octubre de 2026 a las 12:30» con `Intl.DateTimeFormat('es-AR', …).formatToParts`, eligiendo cada parte. El formato de `dateStyle` cambia entre versiones de ICU de Node y de Chrome, y los valores esperados se escriben a mano. Los E2E corren con `timezoneId: 'America/Argentina/Buenos_Aires'` (`playwright.config.ts`), y las specs pasan la zona horaria.

## Consultas de documentación (Context7 y oficiales)

El servidor de Context7 que nombran las reglas (`mcp__context7__*`) respondió «Monthly quota reached» a la primera consulta. Todas las consultas se hicieron con el otro servidor de Context7 de la sesión, que devuelve las mismas bibliotecas. Una sola consulta fue a la documentación oficial con WebFetch, porque Context7 no daba el valor por omisión.

| Librería | Versión del proyecto | ID consultado | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| React Hook Form | 7.89.0 (hoja de ruta; sin instalar) | `/react-hook-form/documentation` (sin versión fija) | `setError` con `root.serverError`, `types` y `shouldFocus` | `root.*` desde 7.43.0, y se borra en el envío siguiente; `types` con `criteriaMode: 'all'` para varios mensajes por campo; `shouldFocus` necesita el `ref` registrado | Sí: R8 usa `types` y `criteriaMode: 'all'` |
| React Hook Form | 7.89.0 | `/react-hook-form/documentation` | `validate`, `shouldFocusError`, `isSubmitting` con `onSubmit` asíncrono | `validate` devuelve `true` o el mensaje; `shouldFocusError` vale `true` por omisión; `isSubmitting` sigue en `true` hasta que la promesa termina | Sí: `checkNewPasswordLength` es un `validate`, y el botón usa `isSubmitting` más la guarda de R8 |
| Vitest | 5.0.3 (`package-lock.json`) | `/vitest-dev/vitest/v5.0.3` | `test.projects` en línea, herencia y `setupFiles` | `extends` vale `true` desde 5.0, los arreglos se concatenan y `name` no se hereda | Sí: la raíz no declara `include` ni `environment` (R14) |
| Testing Library | `@testing-library/react` 16.3.3 (sin instalar) | `/testing-library/testing-library-docs` | Vitest sin `globals`: `cleanup` e `import '@testing-library/jest-dom/vitest'` | Sin `globals` hay que llamar a `cleanup()` en un `afterEach`, desde un `setupFiles` | Sí: `frontend/src/vitest.setup.ts` |
| Testing Library | `@testing-library/user-event` 14.6.7 | `/testing-library/user-event` | `userEvent.setup()`, `tab`, `paste` | `user.paste(texto)` pega en el elemento activo; `user.tab()` recorre los enfocables | Sí: la spec de FR-031 pega en los campos |
| jsdom | 30.1.2 (sin instalar) | `/jsdom/jsdom` (la documentación llega hasta 29.0.1) | Lo que no implementa: navegación, layout y cookies | No navega (`location.reload()` emite un `jsdomError`); `document.cookie` usa su cookie jar. `showModal` ya figuraba sin implementar en el ADR 0008 | Sí: la recarga se inyecta (R17) y las specs de diálogos definen un stub mínimo |
| fishery | 2.4.0 (sin instalar) | `/thoughtbot/fishery` | `Factory.define`, `sequence`, `build` con parámetros | `build(params)` mezcla en profundidad; `sequence` numera | No |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | Opciones (`{option: true}`), fixtures automáticos y `test.use` | Una opción con valor por omisión se cambia con `test.use` por archivo o por `describe` | Sí: `sessionAccount` (R10) |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | Orden entre rutas, `route.fallback` y `request.headers()` | Gana la última ruta registrada; `headers()` excluye los encabezados de seguridad, como las cookies, y `allHeaders()` los trae | Sí: el doble usa `headers()`, porque los encabezados propios no son de seguridad, y una tabla donde gana la última |
| Zustand | 5.0.15 | `/pmndrs/zustand/v5.0.12` (la más cercana) | `createStore` de `zustand/vanilla` con `useStore(store, selector)` | Es el mismo patrón de F2a | No |
| React | 19.2.8 | `/websites/react_dev_reference` | `createPortal` hacia un nodo fuera de la raíz | El portal hereda el contexto, y sus eventos burbujean por el árbol de React | Sí: una sola raíz, con la entrada por portal (R7) |
| Vite | 8.3.2 | `/vitejs/vite/v8.0.10` (la más cercana) | `server.proxy` | Forma `'/api': {target, changeOrigin}` | Sí: R12 |
| Vite | 8.3.2 | WebFetch a `vite.dev/config/preview-options` (Context7 no daba el valor por omisión) | `preview.proxy` | Su valor por omisión es `server.proxy` | Sí: `preview.proxy: {}` y `qa/vite-proxy-check.ts` |
| Vite | 8.3.2 | `/vitejs/vite/v8.0.10` | `loadConfigFromFile(configEnv, configFile)` | Devuelve `{path, config, dependencies}` o `null`, y empaqueta el archivo de configuración por su cuenta | Sí: `qa/vite-proxy-check.ts` lee la configuración así, sin importar `vite.config.ts` desde `qa/` |
| Docker Compose | la del host (sin fijar) | `/websites/docker_compose` | Redes externas entre proyectos | Los servicios de una red externa se alcanzan por nombre, y la red tiene que existir antes del `up` | Sí: R12 |
| Laravel | 13 (`backend/api/composer.lock`) | `/laravel/docs/__branch__13.x` | `X-XSRF-TOKEN` desde la cookie `XSRF-TOKEN` | La cookie está cifrada; su valor se decodifica y va en el encabezado | Sí: R3 decodifica la cookie |
| nuqs | — | sin consulta | — | No aplica: F11 no guarda estado en la query (spec, «Sin hacer a propósito») | — |
| Pest y PHPStan | — | sin consulta | — | No aplica: F11a no cambia el backend | — |

**Las versiones que la documentación no cubre exactas:**

- la de React Hook Form no está fijada a 7.89.0;
- la de jsdom llega hasta 29.0.1;
- la de Zustand y la de Vite son las más cercanas a las del lockfile.

Ninguna API que el plan usa cambió entre esas versiones, según sus notas de cambios en la documentación consultada. Las tareas de U0 lo confirman con `npm run typecheck`.

## Mediciones de sólo lectura

**El registro de npm** (`npm view <paquete>@<versión>`, 2026-10-28):

| Paquete | Licencia | Desempaquetado | Dependencias directas | Nota |
| --- | --- | --- | --- | --- |
| `react-hook-form` 7.89.0 | MIT | 1 527 796 B | ninguna (sólo `react` como peer) | Publicado el 2026-09-26. La última es 7.91.0 (2026-10-23), con menos de dos semanas: se queda la que fija la hoja de ruta |
| `jsdom` 30.1.2 | MIT | 5 533 799 B | 20 | Pide Node `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`; el proyecto usa 24.21.0 |
| `@testing-library/react` 16.3.3 | MIT | 339 581 B | 1 | Su peer es `@testing-library/dom ^10` |
| `@testing-library/dom` 10.4.2 | MIT | 2 467 302 B | 8 | |
| `@testing-library/user-event` 14.6.7 | MIT | 437 525 B | 0 | |
| `@testing-library/jest-dom` 7.0.1 | MIT | 331 873 B | 6 | Peer `vitest >= 0.32`; pide Node `>=22` |
| `fishery` 2.4.0 | MIT | 135 590 B | 1 (`lodash.mergewith`) | |

Con sus dependencias, la pila de DOM suma 56 paquetes y unos 26,3 MB, y `fishery`, 2 paquetes y unos 0,19 MB (estimación del ADR 0008, no repetida).

**El código de la base** (`f2b-acum`, `2b37caf4`):

- **Los checks.** `boot-check` tiene 18 llamadas a `test`, dos dentro de bucles: las importaciones congeladas y los siete modos de falla de la compuerta. `dist-content-check` tiene 5. Los dos usan `createContentServer().requests` como lista exacta.
- **La red.** Son 123 E2E: 106 de F1 en 8 specs y 17 de A2 en `content-gate.spec.ts`. Ninguna spec usa `/api`.
- **El DOM falso** no tiene `document.cookie`, y su `FakeResponse` sólo tiene `ok`, `status` y `json()`.
- **Los comandos de la consola** que entregan los enlaces son `taller:invite {email} {--role=student}` y `taller:password-reset-link {email}`. Arman `/#invitacion=<token>` y `/#restablecer=<token>&email=<rawurlencode>`.

## Textos que agrega el plan

La spec no los fija, y el usuario los corrige en la revisión del PR:

- **Un campo obligatorio vacío:** «Completá este campo.».
- **Las contraseñas que no coinciden:** «La confirmación de la contraseña no coincide.», el mismo texto que manda el servidor.
- **La casilla del aviso sin marcar:** «Para crear tu cuenta, aceptá el aviso de privacidad.».
- **Un restablecimiento sin email que se pueda leer:** «El enlace para restablecer la contraseña no está completo.», seguido de «Pedile uno nuevo a quien administra el taller.».
- **Los botones** «Ir al ingreso», «Cerrar» (el diálogo del aviso), «Recargar», «Mostrar» y «Ocultar».
- **Mientras sale:** «Saliendo…», y mientras guarda el aviso, «Guardando…».

## Lo que no se verificó

- **Nada corrió:** ni un prototipo, ni la red, ni el build con React Hook Form. El peso es una estimación (R15).
- **No se sabe si Playwright aplica un `Set-Cookie` de `route.fulfill`.** El doble no depende de eso (R10).
- **El tamaño de la barra superior a 320 px** se calculó a mano: unos 338 px con el rótulo en una línea, contra 280 útiles. Como ítem de flex, el rótulo ya se parte en sus espacios (su `min-width` es el de su palabra más larga), y así la barra suma unos 262 px con la entrada compacta (`white-space: nowrap`, `padding: 4px 10px`) de `account.css`. Ninguna regla de `styles.css` cambia por eso. Lo prueba el E2E de U4, que mide la barra a 320 y a 390 px.
- **Faltan la cookie real, `SameSite` y el CSRF contra el stack.** Quedan para la verificación a mano declarada en el PR, como en C3a (spec, «Alternativas consideradas»).
- **macOS, Docker y la CI** no se verificaron.

## Línea base de la implementación

Medida en `f11a/base` (`737a5e95`, 2026-10-28), antes de cualquier cambio de F11a, con `E2E_PORT=4182`.

- **`html.length` de `dist/index.html`:** 1 141 337 caracteres (el valor del coordinador; los 1 136 702 de F2b quedan 4 635 por debajo). El presupuesto de F11a (+60 000) se cuenta desde este valor.
- **`npm test`:** en verde; 39 checks en el último bloque y 719 pruebas de Vitest en 29 archivos.
- **`npm run lint`:** 0 errores y 35 avisos.
- **`npm run format:check`:** en verde.
- **E2E:** 123 en verde.
