# Research: A3 · El front lee el contenido de la API

Las decisiones técnicas del [plan de A3](./plan.md), con su motivo, sus alternativas y lo que se midió. Las decisiones del usuario (clarify del 2026-10-28) están en la [spec](./spec.md), en `## Clarifications`; acá están sus consecuencias técnicas. Las interfaces públicas están en [contracts/front-interfaces.md](./contracts/front-interfaces.md) y la copia del navegador, en [data-model.md](./data-model.md).

## Cómo se verificó

Se planificó sin tocar el repositorio ni descargar nada. La base es `master` en `a24154d4` (F2a, A2 y F2b), y F11a todavía no está en `master`: su plan se leyó en el worktree `plan-f11a` (`b1f2e4c5`) y su contrato es la fuente de las firmas que A3 consume.

1. **El código del plan se escribió y se probó en una copia descartable,** en el directorio temporal de la sesión, con el `node_modules` del worktree `f2b` enlazado (Vitest 5.0.3, TypeScript 6.0.2, ESLint, Prettier, esbuild 0.28.2 y Playwright 1.63.0), y con el `build/` de ese worktree, que tiene el mismo `documentHash` que `master`. Lo de F11a que A3 importa se reemplazó por declaraciones con las firmas exactas del contrato de F11a.
   - **Vitest:** 12 archivos de specs y 115 pruebas en verde: las de `shared/lib`, `shared/api/content` y `app/boot` que este plan escribe, con el contenido real del generador.
   - **`tsc`, ESLint y Prettier:** sin errores ni avisos sobre el código de producción, las specs, `qa/lib/content-server.ts` y los E2E nuevos y adaptados. La primera versión de `answerOf` dio complejidad 12 y se partió en tres funciones.
   - **`qa/lib/content-server.ts`:** su sesión y sus 17 recursos responden; el cuerpo de `guide` tiene el sha256 de `meta.portions.guide`, el `ETag` es `"48119a89a058b8d1020d41fedf17a8c9"` y un `If-None-Match` igual da 304.
2. **Un spike en el Chrome Headless Shell 1243 de la caché de Playwright** (R13):
   - un `route.fulfill({status: 304})` llega a `fetch` con el estado 304 y sus encabezados;
   - IndexedDB sobrevive a `page.reload()` dentro de un contexto;
   - `addInitScript` devuelve un `Disposable`.
3. **El peso:** se midió con esbuild contra el código de hoy y el de F11a (R15).
4. **Lo que no corrió:** `boot-check`, `dist-content-check` y `build-check`, que necesitan el código de F11a; el build de Vite; la red E2E; Docker; y el stack.

## Decisiones

### R1. Quién hace el intento: la etapa de sesión lee, la compuerta decide

**Decisión.** Las etapas de F11a siguen en `runBoot([tokenStage, sessionStage, contentGate, legacyViews])` y en la tabla de `load-order-check`. A3 no suma ni saca etapas, y cambia sólo cómo termina la de sesión:

- **La etapa de sesión** sigue con la primera lectura de la sesión, el ingreso, el token y la reaceptación del aviso.
- **Cuando el servidor no responde, no muestra su propio error.** Termina y deja lo que leyó (`takeRead()`): una sesión lista o un servidor que no respondió, con el tipo de falla.
- **La compuerta de A2, con la fuente de la API,** hace el resto del intento:
  - las rondas de porciones y la sesión que se vuelve a pedir en cada ronda;
  - el 401 que pide el ingreso;
  - la copia o la vista de error de A2 con «Reintentar»;
  - el reintento, que repite el intento entero, sesión incluida (FR-027).

**La cuenta después de recuperar.** Cuando el servidor no respondió al arrancar, la etapa no llama a `onReady`. Por eso el lector de la sesión de la compuerta monta la raíz de la cuenta (`mountAccountRoot`) cuando lee una sesión lista: después de un «Reintentar» que recupera, están «Tu cuenta» y «Salir», como pasaba con el reintento de F11a.

**Por qué.**

- **La spec lo pide así.** Una sesión que falla sin copia muestra la vista de error de A2 (FR-023 y FR-027). La tabla de los E2E de A2 hace fallar la sesión en el tope de 20 s y en el reintento («Lo que no responde es la sesión»; «Falla la sesión»).
- **Un solo tope, una sola vista y un solo «Reintentar» por intento.**

**Las alternativas:**

- **Mantener la vista de error de F11a para una sesión que falla sin copia.** Es lo que dice el contrato de F11a («con `unreachable` y una copia usable, publica la copia en lugar de mostrar la falla») y FR-009 de la spec 015. Tiene tres costos:
  - hay dos vistas de error según el pedido que falló;
  - el tope de 20 s tiene que atravesar dos «Reintentar»;
  - tres filas de la tabla de A2 dejan de cumplirse.
- **Retirar `sessionStage` y mover todo a la fuente**, como permite el contrato de F11a. Saca una restricción de `load-order-check`, contra lo que pide la spec, y mete la cuenta, el token y el aviso en la fuente del contenido.

**El costo, que decide el usuario (D1 del informe):**

- la vista de error de F11a para la sesión (`sessionFailureMarkup`, su «Reintentar» y la espera de un 429) queda sin uso y A3 la retira;
- dos E2E de `session-stage.spec.ts` y siete casos de `session-gate.spec.ts` y `session-view.spec.ts` de F11a se adaptan en un commit propio, con su tabla («Compatibilidad» del plan). En ese commit va también la cuenta de un caso de `sign-in.spec.ts`, de 1 pedido de contenido a 17, que no depende de D1: el contenido pasa de un archivo a 17 recursos.

### R2. Un solo tope para el intento: `AttemptBudget`

**Decisión.** Un objeto de `app/boot`, el presupuesto del intento, cuenta los 20 s del intento (FR-010).

- **Quién lo empieza:** la etapa de sesión, al arrancar, y la compuerta, en cada «Reintentar».
- **Quién lo usa:** las dos etapas, y la fuente para saber si un `Retry-After` cabe.
- **La pausa:** mientras dura «pedir el ingreso» (`pausedWhile`), el tiempo no corre.
- **El vencimiento:** avisa con `onExpired`, y quien escucha aborta su pedido.

**Por qué.** Con dos topes de 20 s, uno por etapa, el intento podía durar 40 s, y el ingreso tenía que pararlos a los dos. El presupuesto usa `Date.now()`, que Vitest falsea por omisión (consulta 11), y un solo temporizador a la vez. Un temporizador reemplazado no hace nada cuando dispara, porque el arnés de `boot-check` corre todos y no cancela ninguno.

**Alternativa descartada:** un tope por pedido, con el tiempo restante. Suma un temporizador por pedido y no resuelve la pausa del ingreso.

### R3. El transporte de las porciones: un `fetch` propio, no el cliente de F11a

**Decisión.** La fuente de la API pide las porciones con un `fetch` inyectado (`ContentFetch`) y lee del `Response` el estado, `ETag`, `Content-Version` y `Retry-After`.

- **El cliente de F11a** (`ApiClient`) se usa sólo para la sesión (`fetchSession`) y, por dentro de F11a, para el ingreso.
- **Es la opción (b)** del hallazgo del coordinador del 2026-10-28.

**Por qué:**

- **Lo que hoy devuelve el cliente de F11a:**
  - `ApiResult` no trae los encabezados de la respuesta;
  - un 304 vuelve como `{ok: false, failure: {kind: 'unexpected', status: 304}}`;
  - el contrato sólo prevé encabezados del pedido.
- **Lo que piden las porciones:** son `GET` condicionales sin CSRF ni `X-Taller-User` (FR-014), un protocolo distinto del de los formularios.
- **Hay un precedente:** la fuente estática de A2 ya usaba `fetch`.
- **El cliente queda como está,** y sus consumidores (los formularios y `describeFailure`) no ven un resultado nuevo.

**Alternativa descartada,** la (a) del coordinador: un resultado `notModified` y los encabezados de la respuesta en el éxito, como extensión aditiva de `ApiClient`. Sirve, pero agranda un contrato que usan cuatro ítems, por un consumidor que además necesita otro arnés en `boot-check`.

**Hallazgo para F11a:** el contrato dice «A3 pide las porciones con `get`». Con esta decisión, esa línea pasa a decir que A3 usa su propio `fetch` y el cliente sólo para la sesión. Lo actualiza T010.

### R4. La copia vive en IndexedDB, en un adaptador que nunca cuelga ni rechaza

**Decisión.** La copia está en la base `taller-contenido` (versión 1), en el almacén `copia` y bajo la clave `ultima`: un solo registro por origen (FR-022). Cada operación cumple esto:

- abre la base;
- hace una sola operación (`get`, `put` o `delete`) en una transacción;
- cierra la base;
- se resuelve con un valor:
  - `read()` da el registro o `null`;
  - `write()` y `clear()` dan `true` cuando la transacción hizo `complete`, y `false` si no.

Si IndexedDB no existe, si tocarlo lanza (`SecurityError`), si la apertura falla o queda bloqueada, o si no contesta en 3 000 ms, la operación se resuelve con su valor de respaldo (FR-019). Nunca rechaza.

**Por qué:**

- **`complete` es la confirmación de la escritura:** lo dispara la transacción cuando confirmó, y la cuota llena la aborta (consultas 6 y 7).
- **Abrir y cerrar en cada operación** evita conexiones largas: dos pestañas no se bloquean con `versionchange`.
- **El límite de 3 s** es el caso del riesgo nombrado en la «Review Focus»: un IndexedDB que no responde no traba el arranque.

**Alternativas descartadas:**

- **Una conexión abierta por pestaña:** hace falta `onversionchange`, y no gana nada con tres operaciones por arranque.
- **Varias claves, una por porción:** dos pestañas podrían dejar una copia mezclada.

### R5. El invariante de la copia (FR-016)

**Decisión.** La fuente borra la copia antes de entregar contenido del servidor, siempre, aunque la copia leída fuera `null`, y la compuerta lo publica después. La copia nueva la escribe `onPublished`, después de publicar.

- **Si borrar falla,** la fuente entrega igual el contenido del servidor (FR-019). Es el riesgo residual 1 de la spec: un almacén que falla al borrar y después vuelve a funcionar.
- **Por qué borrar aunque la copia leída fuera `null`:** la lectura puede haber llegado al límite de 3 s con una copia vieja guardada.

**Alternativa descartada:** borrar sólo cuando la copia leída es de otra versión. Deja la copia vieja si la lectura no llegó.

### R6. La forma de la copia y su versión de formato

El registro es `{format: 1, version, confirmedAt, portions: {<nombre>: {etag, data}}}`, en [data-model.md](./data-model.md).

- **Cuándo se usa:** con el formato vigente, las 17 porciones y la forma de cada una (`findPortionProblem`, las reglas de A2). Si no, se borra sin aviso (FR-017).
- **Una porción extra se ignora** (FR-015). Así, A4 puede guardar la plantilla sin invalidar las copias.
- **Un cambio de forma del contenido que el front necesite** sube `COPY_FORMAT` (FR-018). E1 lo hace si su porción es obligatoria.

### R7. La lectura de la copia empieza con el intento y no la corta el presupuesto

**Decisión.** La lectura de la copia empieza al principio de cada intento de la fuente (`read()`), a la vez que se pide la sesión, y se espera cuando hace falta. La acota el adaptador, con 3 s, y no el presupuesto del intento.

**Por qué.** La copia es la mitigación del caso en que el presupuesto ya se gastó: con una sesión que no respondió en 20 s, la compuerta empieza con 0 ms. Si la lectura de la copia dependiera del presupuesto, ese caso nunca tendría copia. A cambio, un arranque sin servidor puede superar los 20 s en lo que tarde IndexedDB, que normalmente son milisegundos y como mucho 3 s.

### R8. Los tipos de falla

FR-028 suma `access` a los de A2. La correspondencia:

| Lo que pasó | Tipo | ¿Usa la copia? |
| --- | --- | --- |
| La sesión no responde, da un 5xx o algo que no es JSON (F11a lo devuelve como `unreachable`) | `network` | Sí |
| La sesión se cortó por el tope | `timeout` | Sí |
| Un 429 de la sesión que no cabe, o sin `Retry-After` | `status` | Sí |
| `contentVersion: null` | `status` | Sí |
| Una porción falla por red | `network` | Sí |
| Una porción cortada por el tope | `timeout` | Sí |
| Una porción con un 4xx o un 5xx; un 429 o un 503 que no cabe; un 304 sin copia | `status` | Sí |
| Un cuerpo que no es JSON; una respuesta sin `ETag` o sin `Content-Version` | `body` | Sí |
| Una porción de otra forma | `shape` | Sí |
| El tope de 3 rondas, agotado | `version` | Sí |
| Un 401 repetido en el mismo intento | `status` | No |
| Un 403 | `access` | No |
| `user: null` | — (pide el ingreso) | No |

En la tabla, «Sí» quiere decir «con una copia usable y sin token en la URL» (FR-024).

- **Con un token, la copia confirmada sí vale.** La regla del token aplica sólo cuando el contenido no llegó: un arranque con token y servidor que confirma la versión de la copia publica esa copia, que es el mismo contenido que daría el servidor.
- **Un 404 de una porción** pasa de `version` a `status` (FR-011).

### R9. Las rondas

- **El tope:** 3 rondas por intento, y una ronda sólo cuenta si una `Content-Version` difiere de la sesión.
- **El 401 no cuenta:** pide el ingreso una vez y repite la ronda (FR-012).
- **La prioridad,** cuando las porciones de una ronda fallan distinto: primero el 401, después el 403, después la primera falla y, al final, la versión distinta.

**Por qué 3.** Un import cambia la versión en una sola transacción (`content_imports`), así que un arranque ve como mucho un cambio por import. Con 3 rondas caben dos imports dentro de 20 s, que es improbable. La spec pedía fijarlo «con una medición». Sin el stack no se pudo medir cuánto dura un import, y T015 anota cuánto tardan las rondas contra el stack.

### R10. La señal de la copia guardada

Es un `CustomEvent` en `window`, `taller:content-copy-saved`, con `detail: {saved: boolean}`, y no un global `window.*` (FR-015).

- **Cuándo se emite:** después de cada intento de escritura, que puede venir del contenido del servidor o de la copia confirmada, que actualiza su fecha. Con la copia usada sin servidor no se escribe, y no se emite.
- **Cómo lo esperan los E2E:** con un script de inicio que registran antes del `goto` (`watchCopySaved`). Su orden respecto de otros scripts de inicio no importa, porque sólo escucha (consulta 4).

### R11. El aviso sin servidor

- **Dónde va:** en `<div class="content-copy-notice" id="content-copy-notice"></div>`, en `index.html`, después del `#session-status` de F11a y antes de `<main>`. Ocupa lugar en el flujo, no tapa nada y es inerte con el acceso.
- **Cuándo se anuncia:** el elemento no tiene rol hasta que se usa, porque F11a prohíbe regiones `status` ociosas. Al mostrarse, recibe `role="status"` y el texto llega en el cuadro siguiente (`requestAnimationFrame`), para que el lector de pantalla tome la región antes que el texto.
- **Vacío no mide nada:** no tiene relleno, y no `display: none`, que dejaría la región fuera del árbol de accesibilidad.
- **El estilo:** usa las variables del shell, sin animación ni `style=` (FR-026).
- **La fecha:** la escribe `formatLongDate`, con `Intl.DateTimeFormat('es-AR')` en la zona horaria del navegador (por ejemplo, «7 de octubre de 2026»).

### R12. Cómo se prueba IndexedDB sin dependencias

**Decisión.** Ninguna dependencia nueva (FR-034).

- **En Vitest:**
  - el adaptador se prueba con un doble chico de `IDBFactory` (`fake-indexed-db.ts`, una ayuda de specs). Reproduce el orden de eventos de MDN: `upgradeneeded`, `success`, `complete` y `abort`;
  - la lógica de la copia usa un almacén en memoria (`fake-copy-store.ts`).
- **En Chromium:** los E2E prueban la base real (recargar, bloquear, invariante y salir).

**Por qué.** jsdom no implementa IndexedDB: la documentación de jsdom en Context7 no lo menciona, y `fake-indexeddb` existe justamente para Node y jsdom (consultas 8 y 9). Sumar `fake-indexeddb` contradice FR-034.

**La decisión D2 del informe quedó en (a), aceptada con el merge del plan (#71; clarify, «Decisiones del 2026-10-28 (noche)»):** el doble propio, sin `fake-indexeddb`. Los datos que se evaluaron de `fake-indexeddb` 6.2.6:

- licencia Apache-2.0;
- 490 834 bytes desempaquetados y ninguna dependencia, según el registro de npm;
- uso: `import 'fake-indexeddb/auto'` en el setup;
- en jsdom pide un polyfill de `structuredClone` (consulta 9).

### R13. La red E2E: el doble de F11a, extendido

**El spike.** Corrió en Chromium sobre `route.fulfill`:

- un 304 llega a `fetch` con `status === 304`, `ok === false`, el `ETag` y la `Content-Version` legibles, y el `If-None-Match` débil del pedido, intacto;
- IndexedDB conserva lo escrito después de `page.reload()`;
- un `addInitScript` que lanza al leer `window.indexedDB` da `SecurityError`, y su `dispose()` lo saca en la recarga siguiente.

Por eso no hay tarea de spike.

**El doble de F11a (`ApiDouble`) suma, sin cambiar lo que ya hace:**

- **en `ApiCall`:** `ifNoneMatch`. La query ya está en `search`, que F11a sumó a pedido de F12a (`impl-f11a`, `qa/e2e/fixtures/api-double.ts:11` y `:41`); A3 no suma `query`;
- **en `ApiReply`:** `abort`;
- **la búsqueda de rutas:** primero con la query (`GET /api/guide`, `GET /api/exercises?catalog=lab&language=rust`) y después sin ella, dentro del orden de F11a: la ruta se busca antes de mirar el CSRF, y una desconocida da 404 y queda en `unhandled` (`:127-139`);
- **`contentVersion`:** un campo público que usan la sesión y las porciones;
- **las 17 porciones por omisión:** con los bytes del generador, su `ETag` y el 304 cuando coincide el `If-None-Match`.

**Las fallas de cada prueba** se arman con `page.route(predicado, …)`, que gana por estar registrada después del doble, y `route.fallback()` para seguir al doble.

**Hallazgo para F11a, ya resuelto:** su `ApiCall` no traía la query; F11a sumó `search` (T014). `If-None-Match` lo suma A3.

### R14. El arnés de `boot-check`: temporizadores por vencimiento

**El problema.** El arnés corre los temporizadores en el orden en que se crearon, sin mirar el retardo. Con la espera de un `Retry-After` de 1 s, el tope del intento, creado antes, corría primero y el caso del 429 terminaba en `timeout`.

**La decisión.** `flush()` corre cada temporizador por su vencimiento virtual (`delay` desde el reloj del arnés), sin cancelar ninguno. Es el orden de un navegador, y cada temporizador sigue corriendo una vez. Los casos de hoy no dependen del orden entre temporizadores de retardos distintos, y lo comprueba la compuerta de U2.

**La respuesta simulada.** El servidor simulado responde con un objeto que tiene `status`, `ok`, `headers` (un `Headers` de Node) y `text()` y `json()` que se resuelven en una microtarea. El `Response` de Node que usa F11a podría necesitar una macrotarea para leer el cuerpo y correr contra los temporizadores del arnés.

### R15. El peso

**Cómo se midió:** esbuild minificó y empaquetó el código de este plan, contra la base (el de A2, más el de F11a según su plan), con lo demás de F11a afuera.

| | Caracteres |
| --- | --- |
| Antes (`app/boot`, `app/content` y `shared/api/content`, con las etapas de F11a) | 7 550 |
| Después | 13 292 |
| Diferencia medida | +5 742 |
| `format-wait`, que la medición restó pero queda por los formularios de F11a | +290 |
| El aviso: CSS, el elemento en el HTML y la línea de `sign-out` | unos +700 |
| **Lo que suma A3, estimado** | **unos +6 700** |

- **Retirar el archivo estático resta unos 660 caracteres del HTML:** la fuente estática (624) y la versión de 32 caracteres entre comillas. Ya están restados en la diferencia. Que `dist/content/` no exista no cambia el largo de `dist/index.html`.
- **Contra el presupuesto:** con el tope de entonces (1 250 000) quedaban unos 48 000 caracteres para A3 y los ports, y A3 usaba un 14 %. Desde #76 el tope es `BOOT_SIZE_LIMIT` = 1 500 000; el margen real lo anota T001 sobre la base.
- **La medición real** la hace T014 con `html.length`, y su condición de corte está en el plan.

### R16. La integración: `a3/base` y un solo merge

- **Las unidades:** U1, U2 y U3 son PR contra `a3/base`, que sale de `f11a/base` con F11a completa, o de `master` si F11a ya llegó (F11a llega a `master` en un solo PR, después del aviso de privacidad y de las invitaciones).
- **El corte:** U2 es atómico (FR-031). Ningún commit de `master` tiene las dos fuentes: la estática sigue activa hasta U2, y U1 es código sin cablear.
- **El merge:** `a3/base` llega a `master` en un solo PR (T016), con la documentación (FR-043 pide «el mismo cambio») y los E2E de A3.

### R17. «Salir» borra la copia por inyección

`SignOutDependencies` suma `forgetContentCopy: () => Promise<void>`. Los dos que llaman pasan la función de `shared/api/content`:

- `SignOutSection` (`pages/account`);
- `PrivacyReacceptance` (`features/sign-in`).

**Por qué inyectarla:** la spec de `sign-out` prueba que la copia se borra después del 204 y que no se borra cuando falla. Si `sign-out.ts` importara el almacén, la spec no podría verlo.

### R18. El servidor de desarrollo y la vista previa

A3 no los toca: los dos pasan `/api/` al stack desde F11a (FR-032 y FR-033). Lo único que A3 retira de `npm run dev` es el middleware del archivo estático, junto con el resto del plugin de contenido (FR-029).

## Consultas de documentación (Context7 y oficiales)

Hechas el 2026-10-28 con el segundo servidor de Context7. Las versiones salen de `package-lock.json` de `master` (`a24154d4`). Si Context7 no tenía la versión exacta, se consultó la más cercana y se dice.

| # | Librería y versión | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| 1 | Playwright 1.63.0 (`/microsoft/playwright/v1.63.0`) | `route.fulfill` con estado 304 y encabezados, ante un `fetch` con `If-None-Match` | La documentación muestra `fulfill` con `status` y `headers`, pero no dice qué ve `fetch` con un 304. El spike lo comprobó (R13) | Sí: no hace falta una tarea de spike |
| 2 | Playwright 1.63.0 | IndexedDB en un contexto, `storageState({indexedDB: true})` | `storageState` puede incluir IndexedDB, y el spike mostró que la base sobrevive a la recarga en el mismo contexto. Los E2E leen la copia con `page.evaluate` y no con `storageState` | Sí: `readStoredCopy` en `qa/e2e/lib/content-copy.ts` |
| 3 | Playwright 1.63.0 | `clock.install` y `fastForward` | El tiempo sigue corriendo después de `install`, y `fastForward` dispara una vez los temporizadores vencidos. El E2E de A2 del tope de 20 s sigue sirviendo con el presupuesto compartido | No |
| 4 | Playwright 1.63.0 | `addInitScript`: orden y valor devuelto | El orden entre scripts de inicio no está definido, y desde 1.63 devuelve un `Disposable` con `dispose()` (también lo dicen los tipos de `playwright-core`) | Sí: `watchCopySaved` sólo escucha, y `blockCopyWrites` se descarta con `dispose()` |
| 5 | Playwright 1.63.0 | `route` con un predicado de URL y `request.headers()` | `route` acepta `(url: URL) => boolean` y `headers()` devuelve los nombres en minúscula | Sí: `isPortion(name)` evita los globs con `?`, y el doble lee `if-none-match` |
| 6 | MDN (`/mdn/content`) | `IDBTransaction`: `complete` y `abort` | `complete` se dispara cuando la transacción confirmó, y `abort` cuando un pedido falla o la cuota se llena | Sí: `write` y `clear` dan `true` sólo en `complete` |
| 7 | MDN | `open`, `upgradeneeded`, `blocked` y `versionchange` | El almacén se crea en `upgradeneeded`. `blocked` llega cuando otra conexión no cierra, y `versionchange` pide cerrar | Sí: abrir y cerrar en cada operación, y `blocked` da el respaldo |
| 8 | jsdom (`/jsdom/jsdom`, v29; F11a instala la 30.1.2) | Si implementa IndexedDB | La documentación enumera lo que falta en general y no menciona IndexedDB. No hay `indexedDB` en jsdom, y por eso existe `fake-indexeddb` | Sí: el doble de `IDBFactory` en las specs, sin entorno DOM |
| 9 | fake-indexeddb 6.2.6 (`/dumbmatter/fakeindexeddb`; `npm view`) | Uso con Vitest y jsdom | `fake-indexeddb/auto` en el setup y un `IDBFactory` nuevo por prueba. En jsdom pide un polyfill de `structuredClone`. Licencia Apache-2.0, 490 834 bytes y sin dependencias | No se adopta (FR-034): D2 del informe |
| 10 | MDN | `If-None-Match`, 304 y modos de caché de `fetch` | El 304 tiene que traer el `ETag` y el `Cache-Control` de la respuesta 200. El cambio del modo `default` a `no-store` con `If-None-Match` es del estándar Fetch, que la spec ya cita; Context7 no lo trajo. El spike confirmó que el 304 llega al código | No |
| 11 | Vitest 5.0.3 (`/vitest-dev/vitest/v5.0.3`) | `useFakeTimers`: qué falsea | Falsea todo salvo `nextTick` y `queueMicrotask`, también `Date`. `advanceTimersByTimeAsync` vacía las promesas entre temporizadores | Sí: el presupuesto usa `Date.now()` |
| 12 | Vite 8.0.10 (`/vitejs/vite/v8.0.10`; el lockfile tiene la 8.3.2) | Los ganchos del plugin: `config`, `configureServer` y `generateBundle` | Cada gancho es independiente: sacar `config` (el `define`) y `configureServer` deja `generateBundle` con los avisos de licencia | No |
| 13 | Zustand 5.0.12 (`/pmndrs/zustand/v5.0.12`; el lockfile tiene la 5.0.15) | `createStore` de `zustand/vanilla` y `getState()` | Las acciones se llaman con `store.getState().accion(…)` fuera de React | No: es lo que ya hace F11a |
| 14 | Playwright 1.63.0 (`/microsoft/playwright/v1.63.0`), consultado en la enmienda | `route.abort()` sin código | El código por omisión es `'failed'`. El texto que Chromium deja en la consola (`Failed to load resource: net::ERR_FAILED`) no lo dice la documentación: sale de `qa/e2e/specs/cycle.spec.ts:71` de `master`, que ya lo espera | Sí: los pedidos abortados llevan `/net::ERR_FAILED/`, y los que responden un código, `/status of NNN/` |
| 15 | Vitest 5.0.3 (`/vitest-dev/vitest/v5.0.3`), consultado en la enmienda | `vi.spyOn` sobre `globalThis.clearTimeout` con temporizadores falsos, y `vi.restoreAllMocks` | `restoreAllMocks` devuelve la implementación original de cada `vi.spyOn`, sin borrar el historial; la guía recomienda llamarlo en `afterEach` | Sí: la spec de la etapa suma `vi.restoreAllMocks()` en `afterEach`, antes de `vi.useRealTimers()`, como la de F11a |

## Mediciones de sólo lectura

| Qué | Valor |
| --- | --- |
| Base | `master` en `a24154d4`. `frontend/` y `qa/` son iguales a los de `405c8705`, el cierre de F2b, donde se midió el dist |
| `dist/index.html` en esa base | 1 136 702 caracteres (el valor de T020 de F2b). F11a cuenta su +60 000 desde su T001 |
| `build/curriculum.json` | 1 359 465 bytes; `documentHash` `4555e8500e6ef5bd38cdaf46010d3f14…`, que es la `Content-Version` de los dobles |
| `ETag` de `guide` | `"48119a89a058b8d1020d41fedf17a8c9"` (los primeros 32 de `meta.portions.guide`) |
| Nginx, zona `api` | 50 r/s, ráfaga de 400 y `nodelay`. El 429 sale de `@too_many_requests` con `Retry-After: 1`, así que FR-009 sirve para un aula |
| Nginx, zona `session` | 5 r/s y ráfaga de 60 sobre `/api/session`. Cuarenta arranques a la vez entran en la ráfaga, y un segundo arranque de los 40 a pocos segundos puede recibir algún 429 de 1 s, que cabe en el intento |
| `content_not_imported` | 503 con `Retry-After: 60`: no cabe en 20 s y falla enseguida. `maintenance`: 503 con `Retry-After: 5`, que cabe |
| Peso | R15 |

## Textos que agrega el plan

Ninguno. Los textos que lee el alumno son los de la spec, tal cual:

- el aviso de FR-025;
- los de `version` y `access` de FR-028;
- los de A2.

## Lo que no se verificó

- **El código de F11a corriendo:** las firmas salían de su contrato. La enmienda del 2026-10-28 leyó su código hasta `a7b3c71d` (T001 a T021) y alineó el plan; lo de T022 a T035 lo contrasta T001, y si algo difiere, el plan se corrige antes de U1.
- **Los fragmentos de la enmienda:** la etapa con `readAgain`, las specs de la compuerta con los casos de F11a, el doble con `search` y `routeFor`, y las listas blancas angostas no corrieron.
- **Los checks contra el código de F11a:** `boot-check`, `dist-content-check` y `build-check` no corrieron. Tampoco `boot-check` con el arnés por vencimiento; lo prueba T011, con los casos de hoy en verde.
- **El build de Vite y el peso real:** T014.
- **La red E2E entera:** sólo se compilaron los E2E nuevos y los adaptados. Un riesgo nuevo es el tiempo, porque cada arranque sin copia pasa 17 porciones por el doble.
- **Docker, la imagen web, la vista previa y la medición del aula:** T015 y T016, con permiso.

## Enmienda: lo que F11a fijó al implementarse (2026-10-28)

El plan se escribió contra el texto del plan de F11a. Esta sección registra lo que cambió al leer su código (`impl-f11a`, rama `f11a/base`, `a7b3c71d`, T001 a T021) y su ledger (`.superpowers/sdd/plan/progress.md`), con las decisiones del coordinador del 2026-10-28 (noche).

### E1. El token del enlace vive en la etapa (FR-005 de F11)

**El problema.** La etapa tomaba el token con `readSession({ signal, token: options.takeAccessToken() })`, y `take()` lo devuelve una sola vez. Si la primera lectura daba `unreachable`, el lector volvía sin entregarlo; el reintento de la compuerta leía la sesión por un segundo lector, sin token (`readSessionForContent`). Con la URL ya limpia, «Reintentar» perdía el alta o el restablecimiento. F11a no lo pierde: su etapa toma el token al empezar y lo olvida recién al entregarlo (`session-gate.ts:52` y `:67-68`), y lo fija «keeps the token of the link through a failure and a retry» (`session-gate.spec.ts:192-209`).

**La decisión** (regla del coordinador). La etapa toma el token una sola vez al empezar, lo guarda y lo pasa a cada lectura siguiente hasta que una sesión responde. `take()` de F11a no cambia. La etapa expone `readAgain`, la lectura de cada ronda y de cada «Reintentar», con el mismo lector y sin la espera de la etapa, y `readSessionForContent` la usa en lugar de un segundo lector. El `requestSignIn` que la etapa le da al lector olvida el token en el momento en que lo entrega, así que una lectura `unreachable`, o un 429 que no entra en el presupuesto, lo conservan, y una lectura que falla después de un ingreso no lo vuelve a pedir.

**Alternativas.**

- **Guardar el token en `account-stages.ts`.** Ese archivo no tiene spec: el arreglo quedaría sin prueba.
- **Olvidarlo cuando la lectura da `ready`.** Una lectura que falla después del ingreso lo conservaría, y el reintento volvería a mostrar el alta con un token ya usado.
- **Cambiar `take()` para que lo devuelva más de una vez.** Lo prohíbe la regla, y cambia el contrato de F11a.

**Las pruebas:** dos casos nuevos en `session-gate.spec.ts` (T009) y uno en `content-api.spec.ts` (T012), que pasa por el cableado real: una primera sesión 502 con `#invitacion=…`, «Reintentar» y el alta con la invitación.

### E2. Los tres casos de la spec de la compuerta de F11a

La revisión de F11a reforzó su spec (`ff510eed`), y la reescritura de A3 había perdido tres casos. Vuelven a T009, con las mismas intenciones: ningún temporizador actúa después de resolver aunque `clearTimeout` no cancele nada (`:101-108`, con `vi.restoreAllMocks()` en `afterEach`); la espera se limpia cuando llega la sesión (`:110-120`); y `storeSession` corre antes de «pedir el ingreso» (`:211-223`, el mutante M4).

### E3. `SESSION_LOADING_MARKUP`

F11a lo exporta de `app/boot/session-view.ts:21-22`, junto con `sessionFailureMarkup` (`:31`). A3 lo importa tal como lo exporta F11a, y saca `sessionFailureMarkup` con la falla (D1-(a)). El contrato de F11a los nombra desde su T034.

### E4. El doble de la API, en la forma de F11a

`ApiCall.search` ya existe, y `replyTo` busca la ruta antes de mirar el CSRF (el arreglo `f5b62ae6`). A3 suma sólo `ifNoneMatch`, `abort`, `contentVersion` y las 17 porciones, y busca la ruta con la query dentro de ese orden (`routeFor`). Si F8 entró antes, su `GET /api/progress` por omisión responde `this.contentVersion`.

### E5. Las listas blancas de los E2E de error

`/status of NNN/` con el código exacto, nunca `/Failed to load resource/` (`session-stage.spec.ts:104` y `:133` de F11a). Un pedido abortado con `route.abort()` no tiene código de estado: lleva `/net::ERR_FAILED/`, como `cycle.spec.ts:71` (consulta 14). Es la aplicación de la regla a un caso que no nombra; el informe de la enmienda lo lleva como pregunta.

### E6. Lo demás

- **Las adaptaciones de los E2E de F11a** parten de su versión final: `session-stage.spec.ts` de `a7b3c71d`; `sign-in.spec.ts`, de lo que T001 encuentre en la base.
- **La base:** `f11a/base` o `master` con F11a (TR-12).
- **Las decisiones D1-(a) y D2-(a):** aceptadas con el merge del plan (#71).
- **El tope del HTML:** `BOOT_SIZE_LIMIT` = 1 500 000 (#76).
- **Las cuentas de la base:** salen de T001.
- **Los stubs del rojo:** `const` tipados, porque el prefijo `_` no silencia `no-unused-vars`.
- **Lo que F8 toca en `qa/lib` y en el doble:** T001, paso 5, lo detecta y T011 y T012 lo conservan.
