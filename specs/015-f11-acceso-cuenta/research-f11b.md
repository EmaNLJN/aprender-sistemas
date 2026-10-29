# Research: F11b · La cuenta

Las decisiones técnicas del [plan de F11b](./plan-f11b.md), con sus motivos, sus alternativas y lo que se midió. Las de F11a están en [research.md](./research.md), de R1 a R18, y no se repiten: F11b sigue con R19. El contrato nuevo está en [contracts/account-f11b.md](./contracts/account-f11b.md).

## Cómo se planificó

Se planificó sin tocar código de producción, sin correr nada en los worktrees de implementación y sin descargar nada. Las fuentes:

- **La spec,** con su clarify del 2026-10-28: FR-053 a FR-059, los transversales FR-066 a FR-077, SC-009, las historias 6 y 7 y la tabla «Pantallas, endpoints y estados».
- **La base real de F11a:** el worktree `impl-f11a`, en `a7b3c71d` (rama `f11a/base`). Se leyó con `git show a7b3c71d:<ruta>`:
  - el cliente (`frontend/src/shared/api/http/`);
  - la sesión (`frontend/src/entities/session/`);
  - los formularios (`frontend/src/shared/ui/form/`, con `messagesOf(FieldError | GlobalError)` y `showFailure`);
  - el aviso (`frontend/src/entities/privacy-notice/`);
  - el ingreso y «Salir» (`frontend/src/features/sign-in/`, con `render-access.tsx`, `reauthenticate` y `signOut`);
  - el doble de la API (`qa/e2e/fixtures/api-double.ts` y `qa/e2e/lib/api-contract.ts`);
  - `frontend/src/shared/lib/reload-document.ts` y `download-file.ts`;
  - su ledger (`.superpowers/sdd/plan/progress.md`).
- **Lo que F11a todavía no implementó:** T022 a T035 («Tu cuenta», «Salir» con su interfaz, el alta, el restablecimiento y la documentación). Se leyó en [plan.md](./plan.md) de F11a, tareas 2.6 a 4.5, y en el contrato [front-interfaces.md](./contracts/front-interfaces.md).
- **El backend que consume** (`master`, `431c9d90`): `routes/api/export.php`, `routes/api/deletion.php`, `ExportController.php`, `DeletionController.php`, `ConfirmPasswordController.php`, `ChangePasswordRequest.php` y `lang/es/` (`api.php`, `validation.php`, `account.php` y `password-policy.php`), además del [contrato de C3a](../004-c3-identidad-acceso/contracts/http.md) y el [de C3b](../010-c3b-admin-ciclo-de-vida/contracts/http.md).
- **Los planes que comparten piezas con F11b:** [F12a](../023-f12-administracion/plan.md) (`confirmPassword`, `PasswordStep` y `reactionTo`) y [F8](../022-f8-metodo/plan.md) (su confirmación de «Borrar todo»).
- **Las restricciones del coordinador:** las secciones «F11b», «F11a» y «Transversal» de `.coordinador/hallazgos-para-planes.md`, y las decisiones del 2026-10-28 (noche) de `.coordinador/clarify-decisiones.md`.

## Decisiones

### R19. La integración: tres unidades apiladas y un solo PR a `master`

**Decisión.** F11b se parte en tres unidades: U5, las piezas compartidas; U6, cambiar la contraseña; y U7, descargar los datos y borrar la cuenta. Las unidades son PR contra una rama de integración `f11b/base`, y F11b llega a `master` en un solo PR (T053).

**`f11b/base` sale:**

- de `master`, si F11a ya está ahí;
- si no, de `f11a/base` después de T035 (TR-12). Entonces el PR de F11b a `master` espera al de F11a.

**Por qué:**

- U5 deja piezas sin consumidor hasta U6, como U1 de F11a. Así `master` no las recibe sueltas.
- C4 espera a F11b entera (decisión del usuario, 2026-10-28): sin descargar los datos ni borrar la propia cuenta, el taller no se expone.

**Alternativas:**

- **Cada unidad a `master`:** deja en `master` código sin uso entre U5 y U6. Además, C4 no gana nada, porque espera a F11b entera.
- **Una sola unidad:** un PR de unos 40 archivos, difícil de revisar y sin punto de reversión intermedio.

**La numeración** sigue la de F11a: las tareas van de T036 a T053, y las unidades, de U5 a U7. Así un commit que nombra una tarea no es ambiguo dentro de la carpeta, como hizo F2b con F2a.

### R20. La descarga: un método `download` en el cliente

**Decisión.** `ApiClient` suma `download(method, path, options)`. Devuelve un `ApiDownload`: el `Blob` del cuerpo y el nombre del adjunto, o la misma `ApiFailure` que `send`. Comparte con `send` los encabezados, `asUser` y la renovación del 419.

**Por qué:**

- **SC-009 pide los mismos bytes.** `perform` lee el cuerpo con `text()` y lo pasa por `JSON.parse`. Volver a serializar cambia los espacios, el orden de las claves que el navegador no conserva y los escapes.
- **`send` no expone los encabezados,** y el nombre del archivo viene en `Content-Disposition`.
- **El contrato de F11a ya lo preveía** («si necesita el `Response` crudo para el streaming, suma un método `download`»).
- **El 419 y `X-Taller-User` valen igual** para la exportación, que modifica (`POST`) y pide `password.confirm`.

**Cómo:**

- `perform` sigue como está.
- Una función nueva, `fetchFile`, lee el cuerpo con `blob()` en una respuesta 2xx y, si no, el texto del error como `perform`.
- La renovación del 419 pasa a una función genérica, `renewingCsrf(attempt, options)`, que usan `send` y `download`. Las specs del cliente de F11a siguen en verde sin editarse.

**Un corte a mitad del cuerpo** hace fallar `blob()`, y el cliente devuelve `network`: no queda un archivo parcial (spec, «Edge Cases»).

**Alternativas:**

- **`send` y volver a serializar:** rompe SC-009 y no da el nombre.
- **Un `fetch` propio en `pages/account`:** duplica el CSRF, el 419 y `X-Taller-User`, que son del cliente (FR-016 a FR-018).
- **Exponer el `Response` crudo:** sube `fetch` a las capas de arriba y obliga a cada consumidor a leer los errores.

**El costo:** un miembro nuevo en una interfaz pública. La única implementación a mano de `ApiClient` en la base es la de `frontend/src/entities/session/model/fetch-session.spec.ts:8` (`const client: ApiClient = { get, send: vi.fn<ApiClient['send']>() }`), que suma `download: vi.fn<ApiClient['download']>()` en el mismo commit. En los planes de A3, F8 y F12a, `ApiClient` aparece sólo como tipo de parámetro, nunca como un objeto armado a mano (búsqueda de `ApiClient = {`, `as ApiClient` y `send: vi.fn` en `specs/0*/plan*.md`). T037 repite la búsqueda en el código de la base.

### R21. El nombre del archivo

**Decisión.** `readAttachmentName(header)` vive en `shared/api/http` y lee `filename="…"` o `filename=…` de `Content-Disposition`. Con un `null` o sin nombre, devuelve `null`, y `exportAccountData` usa entonces `taller-datos.json`.

**Por qué:**

- El backend manda `attachment; filename="taller-<id>-<AAAAMMDD>.json"` (`ExportController.php:23`), con comillas. La forma sin comillas es la que admite RFC 6266, y cuesta una alternativa en la expresión.
- La forma extendida (`filename*=UTF-8''…`) no la manda nadie, así que no se lee. Su prueba fija que devuelve `null`.

**El navegador** usa ese nombre a través del atributo `download` del enlace (`downloadBlob`). Playwright lo devuelve en `Download.suggestedFilename()`, que según su documentación sale de `Content-Disposition` o del atributo `download`. Así el E2E comprueba el nombre que eligió el front.

### R22. Guardar el archivo: `downloadBlob`, inyectado

**Decisión.** El archivo se guarda con `downloadBlob(blob, filename)` (`frontend/src/shared/lib/download-file.ts`), el mismo de «Exportar mi progreso». No se escribe nada en el almacenamiento del navegador (FR-056). `AccountActions` le pasa `downloadBlob` a `DownloadDataDialog` como `save`, y el diálogo se lo pasa al formulario.

**Por qué se inyecta:** jsdom no implementa `URL.createObjectURL` ni la navegación (Context7 de jsdom: «navigation … outside jsdom's scope»), y un clic en un enlace `blob:` emite un error «not implemented». Así las specs reciben un `save` falso y comparan el `Blob` y el nombre. El guardado real lo prueba el E2E con `page.waitForEvent('download')`.

**La alternativa,** `vi.mock('../../../shared/lib/download-file')` con `vi.hoisted`, también funciona en Vitest 5.0.3 (Context7). Se descartó porque ata la spec a la ruta del módulo, cuando la frontera es una sola función.

### R23. La confirmación de la contraseña compartida (F11b-1), decidida por el usuario

**Decisión.** Un slice nuevo, `features/confirm-password`, con lo que comparten F11b, F12a y F8:

- `confirmPassword(client, userId, password)`, que llama a `POST /api/auth/confirm-password` con `X-Taller-User`;
- `WRONG_PASSWORD`, el texto «La contraseña no es correcta.»;
- `isWrongPassword(failure)`, que reconoce el 422 `auth_failed`.

`PasswordStep` **se queda en `pages/admin`**, por tres motivos:

1. **Importa `reactionTo` de `pages/admin/model`** (plan F12a:2638), y una feature no puede importar una página.
2. **Su ayuda dice «Durante 15 minutos no te la vamos a volver a pedir.»** Es cierto en F12a, que pide la contraseña sólo ante un 423. Es falso en F11b, que la pide siempre (spec, «Alternativas consideradas»: «Pedirla siempre»).
3. **F11b no tiene un paso aparte.** La contraseña es un campo del mismo formulario que descarga o borra, junto a la casilla de la supresión, con el botón de la acción («Descargar mis datos» o «Borrar mi cuenta») y no «Confirmar».

Mudar `PasswordStep` sin un segundo consumidor contradice «no agregues capas … por anticipado» (`AGENTS.md`).

**La mudanza depende del orden:**

- **Si F12a está en la base de T036,** T041 muda `confirmPassword` y el texto: `pages/admin` importa de `features/confirm-password` y borra sus copias, y `action-dialog.spec.tsx` sigue en verde sin editarse, como pide el contrato de F12a (`specs/023-f12-administracion/contracts/admin-page.md`, «F11b»).
- **Si F12a no está,** el slice nace en F11b, y F12a lo importa en lugar de crear su `confirmPassword` (hallazgo para F12a en el informe).

**Alternativas:**

- **Mudar también `PasswordStep`:** obliga a inyectarle la reacción ante las fallas, a sacarle la ayuda o volverla un parámetro, y a cambiarle los textos de los botones. Y F11b no lo usaría tal cual.
- **No compartir nada y que F11b tenga su `confirmPassword`:** tres copias del mismo pedido y tres textos para el mismo error, que es lo que F11b-1 quiere evitar.

**La tercera copia, la de F8:** F8 confirma la contraseña dentro de su `createServerReset` (plan F8:4165) y muestra en el campo el texto del servidor (plan F8:3824), que nombra un email. Es un hallazgo para F8: importar `confirmPassword` y `WRONG_PASSWORD` de este slice.

**Decidida por el usuario el 2026-10-28,** con esta opción (spec, `## Clarifications`).

### R24. Dónde va el 422 `auth_failed` y con qué texto (F11b-3 y F11b-4), decidido por el usuario

**Decisión:**

- **En la confirmación** de «Descargar mis datos» y de «Borrar la cuenta», el 422 `auth_failed` marca el campo «Tu contraseña» con `aria-invalid` y el foco, con el texto propio «La contraseña no es correcta.» (`WRONG_PASSWORD`).
- **En el cambio de contraseña,** marca «Contraseña actual» con «La contraseña actual no es correcta.» (FR-054).

**Por qué:**

- El mensaje del servidor, «El email o la contraseña no son correctos.», habla de un email que estas pantallas no tienen (hallazgo 3 de C3a).
- FR-025 manda el `auth_failed` al error general porque en el ingreso no se sabe cuál de los dos campos falló (FR-033). En una confirmación hay un solo campo, así que marcarlo no revela nada (FR-071).
- F8 (su decisión 1) y F12a (`PasswordStep`) ya lo ponen en el campo. Así las tres pantallas se comportan igual.

**La diferencia que queda:** F8 muestra el texto del servidor, y F12a y F11b, el propio. Con `WRONG_PASSWORD` en el slice compartido, F8 puede tomarlo.

**Decidido por el usuario el 2026-10-28,** con esta opción. Enmienda la letra de FR-025 para la confirmación, que la spec ya recoge, y F8 toma `WRONG_PASSWORD` del slice compartido (spec, `## Clarifications`).

### R25. El 423: el mismo formulario vuelve a pedir la contraseña

**Decisión.** Si la acción responde 423 después de una confirmación correcta (venció entre los dos pedidos, o la sesión se regeneró en otra pestaña), el formulario marca «Tu contraseña» con el mensaje del servidor («Confirmá tu contraseña para continuar.») y le da el foco. El valor escrito queda, y el envío siguiente vuelve a confirmar y a pedir la acción (FR-055).

**Por qué:**

- «Pedirla siempre» ya confirma antes de cada acción, así que no hace falta un paso aparte ni un reintento automático.
- `handleSubmit` borra en el envío siguiente los errores puestos con `setError`, también el del campo (Context7 de React Hook Form, «An error set with `setError` disappears on submit»).

**La alternativa,** el paso de F12a, que confirma y repite la acción una vez: suma un estado al diálogo para un caso que en «Pedirla siempre» sólo pasa si la confirmación vence en el medio.

### R26. Dónde van las tres acciones en «Tu cuenta»

**Decisión.** «Tu cuenta» suma un grupo, `AccountActions`, con tres botones: «Cambiar la contraseña», «Descargar mis datos» y «Borrar mi cuenta». Va justo antes de `<SignOutSection`. Cada botón abre su propio diálogo modal (`AccountSubdialog`), con su título y un formulario.

**Por qué un diálogo por acción:**

- Con los tres formularios en línea, «Tu cuenta» tendría cinco campos de contraseña: dos «Tu contraseña» iguales y tres del cambio. Eso confunde al alumno, a los gestores de contraseñas y a los localizadores.
- Un diálogo por vez deja un solo «Tu contraseña» en pantalla, con el foco en su primer campo y un título propio.
- Es el patrón que ya usa F11a para el aviso de privacidad desde «Tu cuenta».

**El orden de las secciones,** fijo cualquiera llegue primero entre F11b, F12a y F11d:

1. «{nombre} · {email}» (F11a);
2. «Aviso de privacidad» (F11a);
3. «Administrar el taller», justo después del aviso, sólo para un admin (F12a);
4. las tres acciones de F11b, justo antes de «Salir»;
5. «Salir» y su nota (F11a);
6. «Estoy en una computadora compartida», después de «Salir» (F11d);
7. «Volver al taller» (F11a).

F11b inserta su grupo «justo antes de `<SignOutSection`», y F12a, «justo después del botón del aviso». Las dos inserciones no se pisan.

**Por qué con un portal a `document.body` y cortando la propagación:**

- **Los eventos de React** de un portal se propagan por el árbol de React y no por el del DOM (Context7, `createPortal`, «Caveats»). React escucha `close` y `cancel` en cada `<dialog>` y los propaga por ese árbol.
- **Sin el corte,** cerrar «Cambiar la contraseña» dispararía el `onClose` de «Tu cuenta», que se cerraría también. Pasa lo mismo que en F11a, donde `AccessDialog` frenaba el `cancel` del aviso: plan F11a, analyze, «AccessDialog frenaba todo `cancel`». Por eso `AccountSubdialog` llama a `event.stopPropagation()` en los dos.
- **El portal saca el diálogo del DOM de «Tu cuenta».** Así `within(diálogo de «Tu cuenta»)` en Testing Library y `account.dialog.getByRole(…)` en Playwright no encuentran el botón de envío del subdiálogo, que tiene el mismo nombre que su botón de apertura («Cambiar la contraseña», «Descargar mis datos» y «Borrar mi cuenta»).

**El contexto se conserva a través del portal** (Context7, `createPortal`): el subdiálogo lee `ApiClientContext` y `AccountContext`.

**Alternativas:**

- **Los tres formularios en línea:** cinco campos de contraseña a la vez.
- **Montar los diálogos como hermanos del de «Tu cuenta»,** como el aviso: obliga a subir el estado a `AccountDialog` y a tocar más que una línea de un archivo de F11a.
- **Un `<details>` por acción:** no da título ni foco, y deja igual los cinco campos en el DOM.

### R27. `AccountContext`: la cuenta y la recarga sin reenviarlas

**Decisión.** `pages/account/model/account-context.ts` define `AccountContext`, con `{account, reloadDocument}`, y `useAccountContext()`. `AccountDialog` lo provee alrededor de `<AccountActions />`, y lo leen los formularios y el diálogo de la supresión.

**Por qué:** sin el contexto, `account` y `reloadDocument` pasarían por `AccountActions` y por cada diálogo, que no los usan. Eso es lo que `AGENTS.md` llama prop drilling y pide evitar con «un contexto o provider acotado cuando varios descendientes compartan una responsabilidad».

**`reloadDocument` sigue viniendo de la prop de `AccountMenu`,** como en F11a. Así las specs ven la recarga con un `vi.fn()`, y se mata el mutante «no recarga», la lección de F11a-2.

### R28. Cerrar mientras se confirma: la acción no sale

**Decisión.** Si el alumno cierra el diálogo mientras la confirmación está en curso, la acción (`POST /api/me/export` o `DELETE /api/me`) no sale. La guarda `useStillMounted` se consulta entre la confirmación y la acción.

**Por qué:** cerrar el diálogo de la supresión es arrepentirse. Un `DELETE` que sale después de cerrar es lo peor que puede pasar en esta pantalla. F12a fija lo mismo (su Review Focus 2, «Cancelar mientras se confirma la contraseña»).

**La alternativa,** impedir el cierre mientras se espera (`cancel` con `preventDefault` y el botón «Cerrar» deshabilitado): deja al alumno sin salida si la red se cuelga.

### R29. Después del éxito, el formulario se desmonta

**Decisión.** Con un 200 o un 202, el diálogo reemplaza el formulario por `AccountResult`: el mensaje, con `role="status"` y el foco, y un botón («Listo», «Volver» o «Entendido»).

**Por qué:**

- Los campos son no controlados, y al desmontarse se van del DOM. No hace falta `reset`, que según Context7 de React Hook Form no se llama dentro de `onSubmit` sino en un `useEffect` sobre `isSubmitSuccessful`.
- `isSubmitSuccessful` también es verdadero cuando el manejador resolvió una falla sin `setError`, como un 401 que lleva al ingreso. Un `reset` ahí borraría lo escrito antes de volver.
- El mensaje con el foco se anuncia y deja el botón a un Tab.

### R30. Borrar la cuenta

**Decisión:**

- **Con un 202,** se ve el mensaje del servidor. Si el cuerpo no lo trae, se ve el mismo texto de `lang/es/account.php` (`account.deletion.own`). La sesión ya terminó (C3b), así que «Entendido» recarga el documento, y cerrar el diálogo de cualquier otra forma, también (FR-059).
- **Con un 409 `last_admin`,** se ve el mensaje del servidor, y la sesión sigue.
- **La casilla «Entiendo que no se puede deshacer.»** es obligatoria. Sin marcar, el campo dice «Marcá la casilla para confirmar.», y no sale ningún pedido (FR-058).

**Las fallas de sesión de las tres pantallas** van por `useAccountFailure`:

- **401:** `reauthenticate` (FR-020). Con la misma cuenta, el formulario sigue donde estaba, con lo escrito; con otra, recarga.
- **409 `account_mismatch` y la cuenta cambiada después de un 419:** el mensaje y «Recargar» (FR-019).
- **403 `account_disabled`:** el mensaje del servidor y «Recargar», que lleva al acceso (FR-023). F8 lo trata igual. F12a recarga sin mostrarlo (su `reactionTo`, R6), y queda como diferencia en el informe.
- **429:** el mensaje, cuánto falta y el botón deshabilitado hasta entonces (FR-021).

### R31. Los textos compartidos de los formularios

**Decisión.** `REQUIRED`, `MISMATCH` y `PASSWORD_HINT` pasan de `features/sign-in/ui/access-texts.ts` a `shared/ui/form/form-texts.ts`, y se exportan por el índice de `shared/ui/form`. `access-texts.ts` los reexporta, así que ningún archivo del acceso cambia sus imports.

**Por qué:** el cambio de contraseña usa los tres, y `pages/account` no puede importar un archivo interno de `features/sign-in`. Copiarlos dejaría dos fuentes de un texto que el alumno ve igual en el alta, el restablecimiento y el cambio.

### R32. Los E2E

**Decisión:**

- **Cada escenario registra sus rutas con `api.on`:** `POST /api/auth/confirm-password`, `PUT /api/me/password`, `POST /api/me/export` y `DELETE /api/me`. No depende de que F8 haya sumado `confirm-password` a `installDefaults` (F12a-9): `on` reemplaza con un `Map.set`.
- **Los datos de F11b van en un archivo propio,** `qa/e2e/lib/account-contract.ts`, y no en `MESSAGES` de `api-contract.ts`, que F8 también extiende.
- **La lista blanca** es `pageIssues.expectIssue(/status of NNN/, …)` con el código exacto, nunca `/Failed to load resource/` (TR-11).
- **El archivo de la exportación** lleva una «é» y espacios que `JSON.stringify` no conserva. Así la comparación de bytes falla si alguien lo vuelve a serializar.

### R33. El peso

**Decisión:** F11b suma como mucho **+15 000 caracteres** a `dist/index.html` sobre la medida de T036, y el total queda bajo `BOOT_SIZE_LIMIT`, que es **1 500 000** (`qa/build-check.ts:11`, PR #76).

**Por qué ese número:** F11b no trae librerías, y su código son tres formularios, cuatro componentes chicos, un método del cliente y un slice de dos funciones. Es una estimación, no una medida: el plan no corrió el build. Si F11b se pasa, el PR informa la medida y lo decide el usuario.

## Consultas de documentación (Context7 y oficiales)

El servidor `mcp__context7__*` agotó su cuota el 2026-10-28. Todas las consultas fueron al segundo servidor de Context7 de la sesión. Ninguna necesitó la documentación oficial.

| Librería | Versión del proyecto | ID consultado | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| Playwright | 1.63.0 (`package-lock.json`) | `/microsoft/playwright/v1.63.0` | `page.waitForEvent('download')`, `Download.suggestedFilename()` y `Download.path()` | La espera se arma antes del clic; el nombre sale de `Content-Disposition` o del atributo `download`; `path()` espera a que termine | Sí: el E2E compara el nombre y los bytes del archivo guardado (R21 y R32) |
| Playwright | 1.63.0 | `/microsoft/playwright/v1.63.0` | `route.fulfill` con `headers`, `contentType` y `body` | Los encabezados propios llegan tal cual | Sí: `Content-Disposition` va en `ApiReply.headers` |
| React Hook Form | 7.89.0 (`package-lock.json` de la base) | `/react-hook-form/documentation` (sin versión fija) | `setError` con `shouldFocus`, `root.serverError` y `resetField` | `shouldFocus` necesita el `ref` registrado; `root.*` y los errores sin regla se borran en el envío siguiente | Sí: el 423 marca el campo sin vaciarlo (R25) |
| React Hook Form | 7.89.0 | `/react-hook-form/documentation` | `reset` después de enviar | No dentro de `onSubmit`: en un `useEffect` sobre `isSubmitSuccessful` | Sí: el formulario se desmonta y no se llama a `reset` (R29) |
| Vitest | 5.0.3 | `/vitest-dev/vitest/v5.0.3` | `vi.mock` con `vi.hoisted` | Funciona y se iza al principio del archivo | Sí: se prefirió inyectar `save` (R22) |
| Testing Library | `@testing-library/react` 16.3.3 | `/testing-library/testing-library-docs` | `getByRole` con `name`, `within` y `findByRole` | `within(contenedor)` acota; un `input type="password"` no tiene rol y se busca por su etiqueta | Sí: los campos se buscan con `getByLabelText` y los diálogos por nombre |
| jsdom | 30.1.2 (la documentación llega hasta 29.0.1) | `/jsdom/jsdom/v29.0.1` | Lo que no implementa | La navegación queda fuera; `URL.createObjectURL` no figura | Sí: `save` y `reloadDocument` se inyectan (R22 y R27) |
| React | 19.2.8 | `/react/react/v19.2.8` y `/websites/react_dev_reference` | `createPortal` y la propagación de los eventos | Los eventos de un portal burbujean por el árbol de React; el contexto se hereda | Sí: el portal y `stopPropagation` en `AccountSubdialog` (R26) |
| Zustand | 5.0.15 | `/pmndrs/zustand` | `useStore(store, selector)` con un store de `zustand/vanilla` | Es el patrón de F2a y F11a | No: F11b no lee el store, salvo a través de `AccessGate` en las specs |
| fishery | 2.4.0 | `/thoughtbot/fishery` | `Factory.define` y `build(params)` | `build` mezcla los parámetros en profundidad | No: las specs arman los errores con `apiErrorBodyFactory` de F11a |
| Vite | 8.3.2 | sin consulta | — | F11b no cambia la configuración de Vite | — |
| nuqs | — | sin consulta | — | F11 no guarda estado en la query (spec, «Sin hacer a propósito») | — |
| Laravel, Pest y PHPStan | — | sin consulta | — | F11b no cambia el backend: se leyó su código | — |
| Docker | la del host | sin consulta | — | La verificación a mano usa los comandos de F11a, sin configuración nueva | — |

**Las versiones que la documentación no cubre exactas:** la de React Hook Form no está fijada a 7.89.0, y la de jsdom llega hasta 29.0.1. Las dos ya las usa F11a en la base, con `npm run typecheck` en verde (`ledger impl-f11a`, T017 a T021).

## Mediciones de sólo lectura

| Qué | Valor | Fuente |
| --- | --- | --- |
| El tope del HTML | `BOOT_SIZE_LIMIT = 1500000` | `qa/build-check.ts:11` en `master` (`431c9d90`) |
| `html.length` con U1 de F11a | 1 153 845 | `ledger impl-f11a`, T012 |
| El nombre del adjunto | `attachment; filename="taller-<id>-<AAAAMMDD>.json"`, con la fecha en UTC | `backend/api/app/Http/Controllers/Account/ExportController.php:23` |
| El orden de los middleware de la exportación | `account`, `password.confirm` y `throttle:export`: un 423 no cuenta para las 3 por día | `routes/api/export.php` y `bootstrap/app.php:68` |
| La confirmación | 201 con `{}` y regenera el ID de la sesión | `ConfirmPasswordController.php` |
| El cambio de contraseña | `password` con la regla `confirmed`: la confirmación que no coincide llega en `errors.password` | `ChangePasswordRequest.php` |
| El texto de esa regla | «La confirmación de contraseña no coincide.» (`confirmed` con el atributo «contraseña») | `lang/es/validation.php:8` y `:29` |
| El texto de la supresión | «Se está borrando tu cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.» | `lang/es/account.php:5` |
| Los textos de los códigos | `password_confirmation_required`, `last_admin`, `too_many_requests`, `account_mismatch`, `account_disabled` y `auth_failed` | `lang/es/api.php` |
| `formatWait(30000)` | «8 horas y 20 minutos» | `frontend/src/shared/lib/format-wait.ts` en `a7b3c71d` |
| Implementaciones a mano de `ApiClient` | Una: `frontend/src/entities/session/model/fetch-session.spec.ts:8` | `git grep` en `a7b3c71d` |
| Lo que F11a dejó en la base | U1, T017 a T021 (formularios, aviso, ingreso y `signOut`) | `a7b3c71d`; T022 a T035, pendientes |

## Textos que agrega el plan

La spec no los trae. Son propuestas, como los de la spec:

| Dónde | Texto |
| --- | --- |
| La casilla de la supresión sin marcar | «Marcá la casilla para confirmar.» |
| El botón del resultado de la descarga | «Volver» |
| El botón del resultado del cambio | «Listo» |
| El título del diálogo del cambio | «Cambiar la contraseña» (la spec no le da título) |
| El nombre del archivo si falta `Content-Disposition` | `taller-datos.json` |

## Lo que no se verificó

- **Nada corrió.** Las firmas de F11a se leyeron en `a7b3c71d`, y las de T022 a T025, en su plan. T036 compara las reales antes de empezar.
- **`stopPropagation` sobre `close` en un `<dialog>` con portal.** La propagación sale de la documentación de React y del caso de F11a, no de una prueba. Lo fijan la spec de `AccountActions` (T045) y el E2E de Esc (T047).
- **El evento `download` de Playwright con un enlace `blob:`.** Context7 documenta el nombre por el atributo `download`, no el caso `blob:` en particular. Lo fija el E2E de T051. Si Chromium no lo emitiera, la tarea lo informa sin cambiar el diseño.
- **La cookie real, `SameSite` y el CSRF real** de los tres pedidos: la verificación a mano contra el stack (quickstart-f11b.md §4).
