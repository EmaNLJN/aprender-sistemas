# Research: F12a · La administración, sin correo

**Spec**: [spec.md](./spec.md) (F12a: FR-001 a FR-043, FR-062 y FR-063, los transversales FR-050 a FR-061, SC-001 a SC-007 y SC-009 a SC-010, historias 1 a 6) | **Plan**: [plan.md](./plan.md) | **Contrato**: [contracts/admin-page.md](./contracts/admin-page.md) | **Fecha**: 2026-10-28

Este documento junta las decisiones técnicas de F12a con sus alternativas, la tabla de consultas de documentación y lo que se midió sin tocar el repositorio. La base es `master` en `a24154d4` (F2a, A2 y F2b integradas) más F11a, que se lee de su plan (`plan-f11a/specs/015-f11-acceso-cuenta/`, `b1f2e4c5`) y, en lo ya implementado, de `impl-f11a` (`f11a/base`, `f262eec1`: la línea base, React Hook Form, la pila de DOM y el cliente). El backend de C3b se leyó en `backend/api/` de esta rama: las rutas, los controladores, los `FormRequest`, los presentadores, `lang/es/` y las pruebas de Pest de `tests/Feature/Admin/` y `tests/Feature/Accounts/`.

## Decisiones

### R1. La integración: una rama `f12a/base` y un solo PR a `master`

**Decisión.** F12a se parte en cinco unidades con su compuerta (U0 a U4, `plan.md`). Cada unidad es un PR contra `f12a/base`, que sale de `master` con F11a integrada, y F12a llega a `master` en un solo PR, en T026.

**Por qué.** La administración no rompe ningún invariante si llega a medias, porque nadie la ve hasta que T023 la cablea. Pero C4 espera «las pantallas de administración integradas» (F12-Q2), y un solo PR deja una sola cosa que revisar y que revertir. Es la misma forma que F11a (su R1).

**Alternativa: cada unidad a `master`.** También se puede: el código de U1 y U2 queda sin uso hasta U3. El costo es que `master` acumula código que nadie usa y que los E2E de F12a recién corren en U3. Es la decisión 2 del informe.

### R2. Dónde vive cada pieza

| Pieza | Dónde | Por qué |
| --- | --- | --- |
| La página: secciones, listas, formularios y diálogos de las acciones | `pages/admin` (nuevo) | Es una vista entera con su ruta futura en F10 (FR-062). Su API pública es `AdminPage` y el tipo `AdminSection` |
| La condición de admin | `isAdmin` en `entities/session` | La pide el contrato de F11a. La usan la entrada de hoy y la ruta de F10 |
| El diálogo a pantalla entera | `app/account/AdminDialog.tsx` (nuevo) | Dos páginas no se importan entre sí (`docs/architecture.md`, «Feature-Sliced Design incremental»). `app` compone `pages/account` y `pages/admin` |
| La entrada «Administrar el taller» | `AccountDialog`, y el lugar del diálogo, en `AccountMenu` (`pages/account`) | Lo deja previsto el contrato de F11a. `AccountMenu` recibe el contenedor por una prop `administration`, que le pasa `AccountRoot` |
| `reloadDocument` | `shared/lib/reload-document.ts` (se muda desde `app/account/`) | La página lo necesita ante un 403 y en `reauthenticate`, y `pages` no puede importar `app`. FR-062 no le permite recibirlo como prop |
| `confirmPassword` y el paso de la contraseña | `pages/admin` | Hoy sólo lo usa F12a. El que llegue segundo entre F11b y F12a lo muda a un lugar compartido, como decide la spec (Dependencias reales) |

**Alternativas descartadas:**

- **`AccountMenu` monta `AdminPage` directamente,** como decía el contrato de F11a: `pages/account` importaría `pages/admin`, y Feature-Sliced Design lo prohíbe. Es un hallazgo para F11a.
- **La administración como `features/administer-workshop`,** que `pages/account` sí podría importar: es una página entera, y F10 la monta en una ruta. Un `pages/admin` que sólo envuelve una feature sería un wrapper vacío.
- **`reloadDocument` como prop de la página:** contradice FR-062, que permite sólo la sección inicial y el cierre.

### R3. La página separada del diálogo (FR-062 y FR-063)

- `AdminPage` recibe `initialSection` y `onClose`, nada más. Lee el cliente por `useApiClient()`, la cuenta por `useStore(sessionStore, …)` y pide el ingreso con `reauthenticate` de `features/sign-in`. No importa nada de `pages/account`, de `app/account` ni de `<dialog>`: lo exige la spec de `admin-page.spec.tsx`, que la monta sola y comprueba que no hay ningún `<dialog>` en el documento.
- La raíz de la página es un `<section>` con el nombre «Administración». El Page Object ubica todo dentro de esa región, y sólo `open()` sabe que hoy se abre desde «Tu cuenta» (FR-063). El contenedor tiene su propio `aria-label`.
- **El foco al abrir.** La página enfoca su título en un `useEffect`. Los efectos de un hijo corren antes que los del padre, así que si el contenedor llamara a `showModal()` en su propio `useEffect`, el navegador movería el foco al primer control después. Por eso el contenedor llama a `showModal()` en `useLayoutEffect`, que corre antes que todos los `useEffect`. Se verificó en Chromium (sección «Mediciones»): el foco queda en «Administración».

### R4. Los diálogos sobre la administración (FR-005 y FR-006)

- **Un solo diálogo de acción,** `ActionDialog`, con pasos: confirmar, la contraseña, el error final, los enlaces y la pregunta antes de cerrar con enlaces a la vista. El 423 se resuelve en el mismo diálogo (FR-005), y como mucho hay uno abierto a la vez, porque la sección guarda un solo diálogo en su estado.
- **Los eventos del `<dialog>` burbujean en React.** La documentación de React dice que `onCancel` y `onClose`, «unlike browser events, they bubble in React». Sin cuidado, cerrar una confirmación cerraría también la administración. Cada diálogo compara `event.target` con `event.currentTarget` (Review Focus 1, con su spec en T023).
- **Un segundo Esc puede cerrar igual.** El estándar HTML («close watchers») hace que el `cancel` sea cancelable sólo con activación del usuario, y Esc no la da. En Chromium, dos o tres Esc seguidos cierran el diálogo aunque `cancel` llame a `preventDefault()`. El diálogo de acción lo trata así:
  - con un pedido en curso, vuelve a abrirse (`showModal()`);
  - con los enlaces a la vista o la pregunta, el cierre forzado cuenta como «Cerrar igual»: el primer Esc después de un clic siempre es cancelable, así que la pregunta aparece al menos una vez (FR-031);
  - en cualquier otro paso, cuenta como cancelar.
- **El foco vuelve explícito.** La sección guarda el control que abrió el diálogo (`event.currentTarget` en las filas y el botón «Crear las invitaciones» en el formulario), cierra con `flushSync` y le devuelve el foco. Si ese control ya no existe, el foco va al título de la tabla (FR-006). No depende del navegador: Safari no enfoca un botón al hacer clic.
- **Las acciones de una fila tienen lugares fijos** (`ACTION_SLOTS`: estado, rol y borrar). Al deshabilitar, «Deshabilitar a Ana» pasa a «Rehabilitar a Ana» en el mismo botón del DOM, y el foco vuelve a él (historia 3, escenario 3).

### R5. La contraseña a pedido (F12-Q3, FR-036 a FR-038)

- Un 423 lleva al paso de la contraseña la primera vez. Con el 201 de `confirm-password`, el diálogo repite `send()` una sola vez, y un segundo 423 se muestra como error, sin volver a pedirla. Lo fija la spec «shows the message of a second 423 instead of asking again».
- Cancelar la contraseña cierra con «No se hizo ningún cambio.».
- Si el diálogo se cancela mientras la confirmación está en curso, la respuesta llega a un diálogo terminado y no dispara la acción: el diálogo tiene una guarda `finished`. Es la Review Focus 2.
- El front no lleva una lista de qué pide la contraseña: decide el servidor (FR-036). Las pruebas de Pest lo confirman: `PasswordConfirmMatrixTest.php` pide la contraseña para PATCH, DELETE, invitar como admin y reenviar una invitación de admin, y no para revocar ni para invitar alumnos.
- El orden de C3b importa en las pruebas:
  - invitar valida antes del 423 (`InvitationsEndpointTest.php`);
  - PATCH y DELETE responden 423 antes que 404 (`UserUpdateTest.php`, `DeleteUserTest.php`);
  - reenviar busca la invitación antes del 423.

### R6. Los errores (FR-002, FR-039 a FR-042)

`reactionTo(failure, notFoundMessage)` traduce cada falla en una de tres reacciones. Usa `describeFailure` de F11a para lo común:

| Falla | Reacción |
| --- | --- |
| 401, o un 419 cuya sesión ya no tiene cuenta | `sign-in`: el diálogo se cierra con «No se hizo ningún cambio.» y se llama a `reauthenticate` |
| 403 `account_disabled` | `reload`: recarga, y el arranque vuelve al acceso. Así lo hace `signOut` de F11a, y lo pide F11 FR-023 («si había una, DEBE volver al acceso») |
| 403 `forbidden` | El mensaje del servidor, la explicación y «Recargar», sin reintentar |
| 404 | «Esa cuenta ya no existe.» o «Esa invitación ya no existe…» |
| 409 `account_mismatch` | El mensaje con «Recargar» (F11a) |
| 429 | El mensaje y «Podés volver a intentar en {tiempo}.», con el botón deshabilitado hasta `Retry-After` |
| 5xx, una respuesta que no es JSON o la red | El mensaje común de F11a |

`staleList(failure)` decide cuándo se vuelve a pedir la página: un 404, un 422 o el 409 `last_admin` (FR-020, FR-034 y FR-040).

### R7. Las listas (FR-009 a FR-014 y FR-021 a FR-023)

- **`usePagedList`** guarda la consulta, pide con un `AbortController` y cancela el pedido viejo si cambia la consulta. Cada pedido nuevo usa un objeto nuevo, así que «Limpiar los filtros» pide aunque la consulta ya estuviera limpia.
- **Una recarga no desmonta las filas.** Mientras llega la página nueva, la tabla sigue con la anterior (`aria-busy`). Así, después de un 409, el botón que abrió el diálogo sigue existiendo y recibe el foco.
- **Una página pasada del final** (`data: []`, con `lastPage` menor que la pedida) pide `lastPage` una vez (FR-012).
- **`replace` y `remove`** actualizan la fila con lo que devolvió el servidor (FR-018) y sacan la invitación revocada antes de volver a pedir la lista, para que el foco vaya al título de la tabla (historia 2, escenario 3).
- **La búsqueda sale sólo al enviarla** (FR-010), y los filtros, al cambiar. Los dos vuelven a la página 1 (FR-011).
- **Sin nuqs:** los filtros no van a la URL (spec, YAGNI; FR-056).

### R8. Invitar (FR-024 a FR-031)

- `splitEmails` separa por saltos de línea, comas y espacios, y respeta el orden. El cliente sólo valida que haya de 1 a 100 (FR-025). Usa los mismos textos que el servidor (`lang/es/invitations.php`): «Indicá al menos un email para invitar.» y «Se pueden invitar hasta 100 emails por pedido.».
- **Un 422:** los `emails` y `emails.<n>` van al campo, cada uno precedido por el email de la posición `n` de la lista enviada. Los demás errores van al error general (FR-027). Lo fija la prueba de Pest `'an email repeated once canonicalized' => [['a@x.com', 'A@X.com'], 'emails.1']`.
- **El resultado se muestra en un diálogo,** «Resultado», sobre la administración. Mientras haya enlaces a la vista, ni el resultado ni la administración se cierran sin preguntar (FR-031): la administración queda inerte detrás del diálogo modal. «Listo» también pregunta si hay enlaces, porque FR-031 dice «Cerrar el resultado» sin excepción. Si ninguna fila trae enlace (por ejemplo, todas son `user_exists`), «Listo» cierra.
- **Un lote de admin con 423:** el formulario abre el diálogo directo en el paso de la contraseña, y el diálogo reenvía el mismo lote una sola vez.
- **El formulario no se vacía después de invitar.** React Hook Form pide no llamar a `reset` dentro de `onSubmit`, y la spec no lo exige. Volver a enviar el mismo lote es inofensivo, porque el servidor responde `invitation_pending`.

### R9. Los enlaces y el portapapeles (FR-029 y FR-030)

- Cada enlace va en un campo de sólo lectura, con nombre accesible («Enlace de {email}»), y con «Copiar», cuyo nombre accesible es «Copiar el enlace de {email}»: el texto visible está al principio del nombre (WCAG 2.5.3).
- «Copiar todos los enlaces» escribe un renglón por invitación, `email` + tabulación + enlace, para que se pueda pegar en una planilla.
- Si `navigator.clipboard` falta o rechaza, el campo recibe el foco y queda seleccionado, y la pantalla dice cómo copiarlo a mano. `select()` no enfoca, así que antes se llama a `focus()`: lo encontró la spec.
- El primer escenario de la historia 1, con 40 emails, corre en E2E con el portapapeles real de Chromium (`permissions: ['clipboard-read', 'clipboard-write']`). Desde Playwright 1.62, en modo headless el portapapeles queda aislado del sistema.

### R10. Las pruebas (FR-058 y FR-059)

- **Vitest.** Usa los proyectos `node` y `dom` que deja F11a (ya están en `impl-f11a`).
  - Las factories de fishery arman los cuerpos con la forma del contrato de C3b (`AdminUser` y `AdminInvitation`, con `privacyVersion`, `updatedAt`, `sentAt`…). Los valores esperados se escriben a mano.
  - `render-admin.tsx` es la ayuda de las specs de la página: el stub de `<dialog>`, la sesión de Olga y el cliente real con un `fetch` falso.
  - `reloadDocument` se reemplaza con `vi.mock`: jsdom no implementa la navegación.
- **E2E.** Corren sobre el doble de F11a:
  - el doble suma `search` a `ApiCall`, porque `callOf` guardaba sólo el `pathname` y las pruebas de la búsqueda y de la paginación necesitan la query (hallazgo para F11a);
  - cada ruta con id se registra con su propio `api.on`, porque el doble compara la ruta exacta;
  - `api.signInAccount = ADMIN` en el escenario del 401, porque el doble ingresa por omisión con `STUDENT`, y otra cuenta recarga;
  - cada escenario con una respuesta que no es 2xx declara `pageIssues.expectIssue(/Failed to load resource/, …)`;
  - la falla de red se simula con un `page.route(…).abort()` registrado después del doble.
- **El teclado y el foco** se prueban en E2E (jsdom no tiene `showModal` ni foco real). El orden de foco de la confirmación se verificó en Chromium.

### R11. Los estilos (FR-052 a FR-054)

- Todo en `pages/admin/ui/admin.css`, con las clases del taller (`.button`, `.dialog-content`, `.dialog-actions`, `.form-input` y `.field-label`) y los tokens de `styles.css`. No hay ningún `style=`.
- **La región de la tabla** copia el patrón de `.sys-table-scroll` (`role="region"`, `tabIndex={0}` y nombre) con una clase propia, `.admin-table-scroll`, porque F5 borra las reglas de `systems.css` cuando porta Sistemas. La tabla tiene `min-width: 720px`: sin eso, `overflow-wrap: anywhere` la aprieta hasta 288 px a 320 de ancho y queda ilegible (medido en Chromium).
- **Ningún `.sr-only` nuevo,** porque R5 de `css-contract` lo busca en modo estricto. Los anuncios van en párrafos visibles con `role="status"`, que existen sólo mientras la administración está abierta (FR-007).
- **El movimiento reducido** lo cubre la regla global de `styles.css`, y ningún componente anima nada.

### R12. El peso (FR-057)

Ver «Mediciones». F12a no suma dependencias: usa React, Zustand, React Hook Form y la pila de pruebas que ya instalaron F2a, F11a y la rama de la pila de DOM.

## Consultas de documentación

Context7, segundo servidor (`mcp__44441c24-…`), el 2026-10-28. Cuando no tenía el dato, la documentación oficial con WebFetch.

| Librería | Versión del repo | ID consultado | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| React | 19.2.8 | `/websites/react_dev_reference` | Eventos de `<dialog>`: `onCancel` y `onClose` | «Unlike browser events, they bubble in React» | Sí: cada diálogo compara `target` con `currentTarget` (Review Focus 1) |
| React | 19.2.8 | `/websites/react_dev_reference` | `flushSync` | El DOM queda actualizado al volver de `flushSync`. Usarlo con medida | Sí: el foco vuelve después de un `flushSync` que desmonta el diálogo (R4) |
| React | 19.2.8 | `/websites/react_dev_reference` | `useLayoutEffect` contra `useEffect` | `useLayoutEffect` corre después de mutar el DOM y antes de pintar; `useEffect`, después | Sí: el contenedor abre con `showModal()` en `useLayoutEffect` (R3) |
| React | 19.2.8 | `/react/react/v19.2.8` | `autoFocus` y `commitMount` | `autoFocus` enfoca en el commit, no pone el atributo | Sí: el foco del título va en un efecto, no con `autoFocus` |
| React Hook Form | 7.89.0 | `/react-hook-form/documentation` | `setError` con `root.serverError`, `types` y `shouldFocus` | `root.*` desde 7.43.0; `shouldFocus` necesita el `ref` registrado | No: se usa `showFailure` de F11a |
| React Hook Form | 7.89.0 | `/react-hook-form/documentation` | `reset`, `isSubmitting`, `handleSubmit` | No llamar a `reset` dentro de `onSubmit`; `isSubmitting` dura lo que la promesa | Sí: «Invitar» no se vacía (R8); «Limpiar los filtros» llama a `reset` fuera del envío |
| React Hook Form | 7.89.0 | Los tipos de `node_modules/react-hook-form` (en `impl-f11a`), no Context7 | El tipo de `errors.root.serverError` | Es `GlobalError` (`Partial<{type; message}>`), no `FieldError` | Sí: hallazgo para F11a, porque `messagesOf(errors.root?.serverError)` no tipa con la firma del contrato |
| Testing Library (user-event) | 14.6.7 | `/testing-library/testing-library-docs` | El portapapeles | `userEvent.setup()` reemplaza `navigator.clipboard` por un stub | Sí: las specs leen `navigator.clipboard.readText()` |
| Testing Library (react) | 16.3.3 | `/testing-library/testing-library-docs` | `getByRole` con `name`, `within`, `toHaveFocus` y el recorrido con `user.tab()` | Sin cambios respecto de F11a | No |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | `vi.mock` con fábrica, el hoisting y `vi.mocked` | `vi.mock` sube al principio; la fábrica no puede usar variables de afuera | Sí: `vi.mock('../../../shared/lib/reload-document', () => ({ reloadDocument: vi.fn() }))` |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | Timers falsos | `toFake` y `advanceTimersByTime` | Sí: ninguna spec de F12a usa timers falsos. El conteo de `Retry-After` es de F11a, y el tiempo se adelanta en E2E con `page.clock` |
| fishery | 2.4.0 | `/thoughtbot/fishery` | `Factory.define` con `sequence`, `build` con parámetros y `buildList` | `buildList` incrementa la secuencia | No |
| Zustand | 5.0.15 | `/pmndrs/zustand/v5.0.12` (la más cercana) | `useStore(vanillaStore, selector)` | El selector devuelve un primitivo y no re-renderiza de más | No |
| jsdom | 30.1.2 | `/jsdom/jsdom/v29.0.1` (la más cercana; Context7 no tiene la 30) | Lo que no implementa | La navegación (`location.reload`) y el layout. `<dialog>` sin `showModal` (ADR 0008) | Sí: `reloadDocument` con `vi.mock` y el stub de `<dialog>` |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | Los permisos del portapapeles y `navigator.clipboard.readText()` | `grantPermissions(['clipboard-read'])`; desde 1.62, el portapapeles headless queda aislado | Sí: `test.use({ permissions: ['clipboard-read', 'clipboard-write'] })` |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `page.clock.install` y `fastForward` | `install` antes de cualquier timer; `fastForward` dispara lo que vence | Sí: el escenario del 429 |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `addInitScript`, `test.use` con el viewport y `filter({ hasText })` | Como en F11a | Sí: el conteo de `pushState` y `notice(text)` |
| Estándar HTML | — | WebFetch, `html.spec.whatwg.org` («close watchers») | Cuándo `cancel` es cancelable | `canPreventClose` exige activación de historial; Esc no la da | Sí: el cierre forzado del diálogo de acción (R4) |
| MDN | — | WebFetch, `HTMLDialogElement: cancel event` | Lo mismo | No trae el dato: se fue al estándar | No |

**No se consultaron, con su motivo:** Vite (F12a no cambia `vite.config.ts`), nuqs (F12a no lo usa, FR-056), y Laravel, Pest y PHPStan (F12a no toca el backend: el contrato se contrastó leyendo el código y las pruebas de C3b).

## Mediciones (de sólo lectura, fuera del repositorio)

Todo se hizo en el scratchpad de la sesión, con el código del plan, el de F11a copiado de su plan (y de `impl-f11a` en lo ya implementado, que coincide byte a byte salvo un `if` con llaves), y los `node_modules` de `impl-f11a`: React Hook Form 7.89.0, la pila de DOM, fishery 2.4.0 y Playwright 1.63.0. No se tocó ningún repositorio ni se descargó nada.

**El HTML de partida.** `dist/index.html` de `master` mide **1 141 337** caracteres:

- se midió sobre el `dist/` de `f2b-k6` (`36a00d53`), cuyo `frontend/`, `content/`, `tools/` y `package*.json` son idénticos a `a24154d4`;
- coincide con la línea base de F11a en `impl-f11a`;
- el tope de `build-check` es 1 250 000.

**El peso estimado de F12a: 31 978 caracteres.** Se midió con esbuild 0.28.2 (`minify`, `charset: 'utf8'`), dejando afuera React, React Hook Form, Zustand y los slices de F11a, sobre `app/account/AdminDialog.tsx`, más `admin.css` minificado. Es una estimación: Vite 8 minifica con otra herramienta, y `vite-plugin-singlefile` lo mete todo en el HTML, así que cargar la administración aparte no ahorra nada.

| Parte | Caracteres |
| --- | --- |
| `pages/admin/ui` (17 componentes) | 20 298 |
| `pages/admin/model` | 6 825 |
| `pages/admin/api` | 1 491 |
| `pages/admin/lib` | 1 514 |
| `app/account/AdminDialog.tsx` | 406 |
| `admin.css` | 1 515 |
| **Total** | **31 978**: 30 463 de JS (las partes suman 30 534; esbuild comparte ayudas en la salida) y 1 515 de CSS |

Los cambios de `pages/account` y `entities/session` suman unos 200 más.

**El margen.** Después de F11a, que reserva +60 000, quedan unos 48 600 hasta 1 250 000. Los planes ya escritos reservan:

- F3, de 15 000 a 30 000;
- F5, de 25 000 a 40 000 (uno de los dos instala nuqs);
- F4, 10 000;
- F6, 15 000;
- F9, 8 000;
- F7a, unos 3 400 medidos.

Eso suma entre 76 400 y 106 400, sin contar A3, F7b, F8, F10 ni F12a. Las reservas ya pasan el margen, y F12a lo ocupa en dos tercios. Es la decisión 1 del informe.

**Las pruebas del plan, corridas sobre el código del plan:**

- **86 specs de Vitest en verde:** 40 de `node` (isAdmin, los parsers, los emails, las acciones, las reacciones, los textos de los enlaces y los endpoints) y 46 de `dom` (la página, la lista paginada, las cuentas, las invitaciones, el diálogo de acción, la entrada en «Tu cuenta» y el contenedor).
- **Las pruebas que muerden.** Dos se comprobaron rompiendo el código a propósito:
  - sin la comparación de `target` en el contenedor, falla «stays open when a confirmation inside it closes»;
  - sin la guarda `finished`, falla «does not send the action when the dialog closed while the password was being confirmed».
- **Los checks:** `tsc` (con `noUncheckedIndexedAccess`), ESLint con `eslint.config.ts` del repo (`react-hooks` recomendado y complejidad 10) y Prettier con `prettier.config.ts`, todos en verde. La función más compleja es `usePagedList`, con 10.
- **La condición del tipado.** `tsc` pasó con `messagesOf(error: FieldError | GlobalError | undefined)` en la copia de F11a. Con la firma del contrato de F11a (`FieldError | undefined`), `errors.root?.serverError` no tipa, porque React Hook Form 7.89.0 lo declara como `GlobalError`. Así fallan `PasswordStep.tsx` e `InviteForm.tsx`, y también el `LoginForm` del plan de F11a. Es el hallazgo 1 para F11a; si F11a resuelve otra cosa, T001 lo anota y T012 y T018 la usan.
- **Los E2E:** tipan con el doble de F11a copiado de su plan, pero **no corrieron**, porque necesitan F11a cableada.

**Chromium headless (Playwright 1.63, `chromium_headless_shell-1243`)** sobre un arnés que monta `AdminDialog` con un `fetch` falso, `styles.css`, `form.css` de F11a y `admin.css`:

| Comprobación | Resultado |
| --- | --- |
| El foco al abrir | En «Administración», con `useLayoutEffect` en el contenedor |
| 320 px | La región mide 320 de `scrollWidth` contra 320 de `clientWidth`: no se desplaza en horizontal. La tabla, 720 contra 288: se desplaza en su propia región |
| 390 px | 390 contra 390, y la tabla, 720 contra 358 |
| Esc en una confirmación | Cierra la confirmación, la administración sigue abierta y el foco vuelve a «Deshabilitar a Ana Pérez» |
| Esc con enlaces a la vista | Aparece la pregunta y el foco va a «Volver». El segundo Esc vuelve a los enlaces. El tercero cierra el resultado (cierre forzado) y el foco vuelve a «Crear las invitaciones». El cuarto cierra la administración y el foco vuelve a la entrada |

## Textos que agrega el plan

La spec no los fija. Van como propuesta, para que el usuario los corrija.

| Dónde | Texto |
| --- | --- |
| Botón de las confirmaciones y de la contraseña | «Cancelar» |
| Paso final con error del diálogo de acción | «Cerrar» |
| Contraseña vacía | «Completá este campo.» (el de F11a) |
| Grupo de las secciones (nombre accesible) | «Secciones de la administración» |
| Paginación (nombre accesible) | «Páginas de cuentas», «Páginas de invitaciones» |
| Paginación de invitaciones | «Página {n} de {m} · {total} invitaciones» |
| Invitaciones | «Cargando las invitaciones…», «No pudimos cargar las invitaciones.» y «No hay invitaciones con esos filtros.» |
| Título del diálogo de un lote que pide la contraseña | «Crear las invitaciones» |
| Resultado de un reenvío | «Enlace nuevo. Vence el {fecha}.» |
| Campo y botón de cada enlace (nombre accesible) | «Enlace de {email}» y «Copiar el enlace de {email}» |
| Botones de cada fila de invitaciones | «Reenviar la invitación de {email}» y «Revocar la invitación de {email}» |
| Filtro «Rol» | «Todos», «Admin» y «Alumno» (en las dos secciones) |
| Búsqueda de más de 80 caracteres | «La búsqueda puede tener hasta 80 caracteres.» (el de `lang/es/admin.php`) |
| Lote vacío o de más de 100 | Los textos de `lang/es/invitations.php` |

## Lo que no se verificó

- **Los E2E no corrieron:** necesitan F11a entera (la etapa de sesión, el doble y la raíz cableados). Tipan contra el doble copiado del plan de F11a.
- **El peso real** sale de Vite 8. La estimación usa esbuild, y T001 y T026 miden `html.length`.
- **La cookie real, el CSRF y `confirm-password` contra el stack:**
  - `ConfirmPasswordController` regenera la sesión. El cliente de F11a lee la cookie en cada pedido, así que el reintento lleva el token vigente;
  - lo comprueba la verificación a mano de T026 (quickstart §4).
- **El lector de pantalla** sobre los anuncios (`role="status"`) y los diálogos anidados.
- **SC-006 queda cubierto en parte.** Un solo flujo se recorre entero con el teclado en E2E: de «Tu cuenta» a deshabilitar una cuenta. Las demás historias usan los mismos controles nativos, pero no se recorren enteras.
