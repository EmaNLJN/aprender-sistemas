# Research: D1c · El cliente v2 del progreso

**Fecha**: 2026-10-28 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan-d1c.md](./plan-d1c.md) | **Contrato**: [contracts/sync-client-d1c.md](./contracts/sync-client-d1c.md) | **Datos**: [data-model-d1c.md](./data-model-d1c.md)

Cada decisión dice qué se eligió, por qué, qué se descartó y cómo se verifica. Las que completan algo que la spec deja abierto llevan **(propuesta del plan)**. Las fuentes que todavía no están en `master` se citan con su worktree y su commit, todos bajo `/home/emanuel/workflow/aprender-sistemas-worktrees/`:

| Fuente | Worktree | Commit |
| --- | --- | --- |
| F11a implementada hasta T021 (el cliente de la API, la sesión, `signOut`, el doble de la API) | `impl-f11a` | `a7b3c71d` |
| Los planes de A3 y F8, enmendados contra F11a | `amend-cuenta` | `191e5974` |
| El plan de A4 con las decisiones del usuario | `plan-a4` | `d5ace3d0` |
| Los planes de F11b y F11c | `plan-f11bc` | `2688711e` |
| La spec de F13 con su clarify | `spec-f13` | `c0ac6672` |
| D1a y D1b (servidor), F2, F4, el tope de 1 500 000 | `master` | `bb480677` |

## R1. Dónde vive el cliente

- **Decisión.** El modelo y el motor van en `features/progress-sync/`, el slice que D1a dejó con `merge-rules.ts` y `field-kinds.ts` (R1 de D1a: D1c le pone su API pública). El armado (el cliente de la API, la sesión, los cuatro almacenes, el contenido y los eventos de `window`) va en `app/progress-sync/`, como F8 armó `app/progress-backup/` (F8-Q2). El puerto de «Salir» va en `features/sign-in`, sin importar `features/progress-sync`: la forma es estructural.
- **Por qué.** Feature-Sliced Design: una feature no importa otra, y el motor necesita valores de cuatro entidades y de `entities/session`, que sólo `app/` puede juntar. El modelo queda puro y probable con Vitest en el proyecto `node`, con el almacenamiento y la red simulados en sus interfaces (`qa/AGENTS.md`).
- **Descartado.** Un slice nuevo (`features/progress-client`): duplicaría el dueño de las reglas de fusión. Poner el motor en `entities/`: no es una entidad de negocio, es una funcionalidad que usa cuatro.

## R2. La costura del almacenamiento: una vinculación en `versioned-storage` **(propuesta del plan)**

- **Decisión.** `shared/lib/progress-storage.ts` guarda una vinculación (`ProgressStorageBinding`: un `StorageLike` y su persistencia). `openVersionedStore`, cuando no recibe `storage`, la usa; sin vinculación, `localStorage`, como hoy. La etapa de arranque de D1c vincula el espacio de la cuenta antes de `legacyViews`.
- **Por qué.** Ninguno de los que abren los almacenes pasa un almacenamiento: `app.js` llama `routeStore.open(data)` (`frontend/app.js:28`), `lab.js` llama `labStore.open(exerciseCatalog)` (`frontend/lab.js:25`), y los `init` de los motores de campaña y Sistemas no reciben uno (`create-campaign-engine.ts:88-91`, `create-systems-engine.ts:116`). Cambiar cuatro firmas y sus llamadores legacy toca seis archivos de vistas que otros ports están portando. La vinculación toca un archivo y conserva FR-061: los mismos singletons, ninguna instancia más sobre una clave.
- **Descartado.** (a) Pasar el almacenamiento a cada `open` e `init`: seis archivos, y cada port de F3 a F9 tendría que repetirlo. (b) Que D1c abra los almacenes: `lab.js` lanza «El almacén del laboratorio ya está abierto.» si se abre dos veces (`lab-store.ts:67`). (c) Instancias nuevas sobre claves v2: lo que FR-061 prohíbe, porque dos instancias se comportan como dos pestañas (ADR 0003).
- **Costo.** Un estado de módulo en `shared/lib`. Se acepta porque es el único lugar donde se decide dónde persiste el progreso, tiene una prueba propia en `versioned-storage-check` y, sin vincular, el comportamiento es byte por byte el de hoy.

## R3. La memoria: `shared` y `blocked` no escriben, y `blocked` dice lo de hoy

- **Decisión.** Con `persistence()` `memory` o `blocked`, `load()` lee la proyección que dejó la etapa y devuelve `writable: false`; `write()` no escribe. Con `blocked`, `load()` además devuelve `status: 'unavailable'`.
- **Por qué.** Los E2E congelados de F1 (`qa/e2e/specs/startup-storage.spec.ts`) fijan que con el almacenamiento bloqueado el pie dice «Exportá para conservar tu avance» y el recorrido avisa «No se pudo leer o guardar el avance. Podés exportarlo al terminar.» (`route-store.ts`, `loadNoticeFor`): eso sale de `status: 'unavailable'` y de `storageAvailable()` en `false`. Con una memoria que escribiera, los dos textos desaparecerían. En el modo compartido, F13 pide «Exportá para conservar tu avance» (su FR-004), pero el aviso de que no se pudo leer sería falso: por eso `shared` da `writable: false` sin cambiar `status`.
- **Descartado.** Una memoria que escribe: rompe la red de F1. No vincular nada en los modos de memoria: los almacenes arrancarían en blanco y las vistas legacy no se vuelven a dibujar solas cuando llega la foto.

## R4. La copia local: la forma v1 en el espacio, las filas del servidor y la cola

- **Decisión.** El espacio guarda tres cosas: el estado v1 de cada almacén (lo que leen las vistas), la copia del servidor con sus relojes y lápidas (`CopyRecord.areas`, la forma de http.md §5) y la cola (`QueueRecord`). Las vistas no cambian: siguen leyendo la forma v1 (FR-061).
- **Por qué.** FR-060 pide «una copia local del progreso (con el reloj de cada campo y sus lápidas)», y http.md §7 pide aplicar `changes` «fila por fila con las mismas reglas». La forma v1 no tiene relojes, y lo que sólo vive en el navegador (`result`, `attempts`, los sellos derivados) no tiene filas. Guardar las dos es lo único que cumple ambas cosas sin cambiar las vistas.
- **Costo.** Los textos (borradores, reflexiones, notas) quedan dos veces en el navegador. Un alumno típico tiene decenas de borradores de pocos KB; el peor caso teórico (274 borradores de 30.000 caracteres) ya no entra hoy en las claves v1. Si escribir la copia o la cola lanza (cuota), el motor pasa su propio respaldo a memoria, informa `mode: 'blocked'` y sigue (Review Focus 3).
- **Descartado.** Sólo filas, con la forma v1 proyectada en memoria: cada almacén tendría que leer de otro lado. Sólo la forma v1 con un mapa de relojes: no cumple «fila por fila» y pierde lo que el servidor sabe de lo retirado (R6).

## R5. La cola: se junta con un `id` nuevo, y dos pestañas la comparten **(propuesta del plan)**

- **Decisión.** La cola vive en `taller-v2:<id>:cola` y cada cambio la lee, la modifica y la escribe en el mismo turno. Una operación nueva reemplaza a la que espera con la misma clave de campo (data-model-d1c.md §3.2) **con un `id` nuevo**. Lo que está en camino lo lleva cada pestaña en memoria y nunca se reemplaza.
- **Por qué.** La spec acepta que dos pestañas manden la misma operación y que la segunda reciba `duplicate` (Edge Cases). Si se juntara conservando el `id`, una pestaña podría mandar el valor viejo con ese `id` mientras la otra manda el nuevo con el mismo: `uuid_reused`, y el valor nuevo no se aplica (FR-014). Con un `id` nuevo, en el peor caso llegan los dos y gana el reloj más nuevo. Un lote sin respuesta se reenvía con los mismos `id` (FR-064) porque esas operaciones siguen en la cola.
- **Verificación.** Una spec de la cola junta tres escrituras de una reflexión en una operación con el último texto; otra no reemplaza una operación en camino; otra resuelve `applied`, `duplicate` y `rejected` y conserva `stale_content` en `deferred`.

## R6. Aplicar filas: una fila ausente no borra, y un cambio pendiente gana si es más nuevo

- **Decisión.** Una foto o un delta se escriben campo por campo sobre el estado v1 actual. Una fila ausente no toca nada; sólo una época nueva vacía los almacenes antes. Un campo con una operación pendiente queda con el valor local salvo que el reloj de la fila sea más nuevo que el de la operación (`incomingWins` de `merge-rules.ts`, con la operación como lo guardado). Las banderas y los máximos se combinan con OR y con el mayor. Una fila de un ejercicio, mundo, taller, etapa, paso o recurso que el contenido publicado no tiene se salta, y queda en la copia.
- **Por qué.** FR-011: nada se borra fuera de «Borrar todo», y el borrado lo informa la época. Una fila ausente sólo puede ser algo que el servidor todavía no recibió. El salto de lo desconocido es el riesgo 7 de A3 (`amend-cuenta`, `specs/016-a3-contenido-api/spec.md:400`): con un arranque sin servidor y la copia vieja del contenido, el parser del laboratorio descarta un registro desconocido con respaldo y aviso; si el motor no lo escribe y lo guarda en la copia, vuelve en cuanto el contenido nuevo lo conoce.
- **Consecuencia para los E2E.** Una foto vacía del doble no pisa lo que una prueba sembró en el espacio (R19).

## R7. Los tiempos y los topes **(propuesta del plan)**

- **Decisión.** Envía 2 s después de un cambio y, con cambios seguidos, como mucho cada 10 s; al arrancar, al volver la conexión (`online`), al volver a la pestaña si pasó más de un minuto sin hablar con el servidor, y al salir. No pasa de 60 pedidos en una ventana deslizante de 60 s. Reintenta a los 5, 15, 30 y 60 s, y después cada 60 s; un `Retry-After` manda. Un lote lleva hasta 200 operaciones y 1 572 864 bytes; con `keepalive`, hasta 61 440 bytes.
- **Por qué.** FR-063 pide «poco después de un cambio» y no más de una consulta por minuto sin cambios. Con 1.000 cuentas activas (ADR 0006 S2), un lote cada 10 s da los 100 pedidos por segundo que la spec contrasta en SC-010. Los topes de bytes dejan margen bajo los 2 MiB de Nginx y bajo los 64 KiB de `keepalive` (MDN: «The body size for keepalive requests is limited to 64 kibibytes»). Las constantes viven en un solo módulo (`model/sync-limits.ts`) para ajustarlas con la medición de D1a.
- **Descartado.** Un pedido por tecla: lo que FR-062 prohíbe. Un intervalo fijo sin cambios: consulta de más.

## R8. La etapa de arranque

- **Decisión.** `progressStage` va entre `contentGate` y `legacyViews`. Lee la cuenta de `sessionStore`, elige el modo, limpia los espacios de otras cuentas (FR-069), carga el espacio, detecta el v1 sin importar, pide `GET /api/progress` con `If-None-Match` y espera **3 s si hay copia local y 10 s si no**; con la foto (o sin ella), escribe la proyección en el espacio y vincula. Nunca lanza.
- **Por qué.** Necesita el contenido (las etapas, los ejercicios, la versión publicada) y la cuenta, y tiene que terminar antes de que las vistas abran los almacenes. Con una copia local, el alumno estudia aunque el servidor tarde (FR-060, local primero); sin copia, un dispositivo nuevo esperaría ver su progreso, y las vistas legacy no se vuelven a dibujar solas.
- **No reutiliza** `readSessionForContent` (monta la raíz de la cuenta, `amend-cuenta` `specs/016-a3-contenido-api/plan.md:3665`) ni `sessionStage.takeRead()` (la compuerta lo consume en su primera ronda). La cuenta ya está en `sessionStore` desde la etapa de sesión (`impl-f11a`, `app/boot/account-stages.ts:16`).

## R9. El desfase del reloj sale sólo de la sincronización

- **Decisión.** `clockOffsetMs = serverTime − sentAt` de cada respuesta de `POST /api/sync`; `clockSkewMs = −clockOffsetMs`. Las operaciones se sellan con `Date.now() + clockOffsetMs` (FR-062). `GET /api/progress` no lo mueve.
- **Por qué.** `serverTime` es «la hora del servidor al recibir el lote» (http.md §3.4) y `sentAt` la del dispositivo al enviarlo: la diferencia es el desfase, más una latencia de milisegundos. En una lectura no hay `sentAt`. Además, el `GET /api/progress` por omisión que suma F8 al doble responde un `serverTime` fijo (`'2026-03-04T05:06:07.000Z'`, `amend-cuenta` `specs/022-f8-metodo/plan.md:3483-3498`): si moviera el desfase, cada E2E vería un aviso de reloj.
- **El doble.** La respuesta por omisión de `POST /api/sync` devuelve `serverTime` igual al `sentAt` del lote: sigue el reloj de la página, también con `page.clock` (F13, «Lo que F13 supone de D1c», última fila).

## R10. El transporte: el cliente de la API para escribir, un `fetch` propio para leer y para `keepalive`

- **Decisión.** `POST /api/sync` y `POST /api/progress/import` van por `ApiClient.send` de F11a, con `asUser`. `GET /api/progress` y el envío al ocultar la página (`pagehide`) usan un `fetch` propio.
- **Por qué.** `ApiClient` ya resuelve el CSRF, `X-Taller-User` y el 419 con la comparación de la cuenta (FR-065; `impl-f11a` `shared/api/http/api-client.ts:122-139`). Pero no expone encabezados, ni el ETag, ni el 304 (un 304 sale como `{kind: 'unexpected', status: 304}`), ni `keepalive`. A3 resolvió lo mismo con su propio `fetch` para las porciones y rechazó agrandar el cliente (`amend-cuenta` `specs/016-a3-contenido-api/research.md:67-86`, R3). La lectura no lleva CSRF, así que no pierde nada.
- **Cómo se leen las fallas de `ApiClient`** (el cuerpo extra de un 409 `epoch_mismatch` se pierde en `failureOf`, y el motor lo recupera con `GET /api/progress`):

| `ApiFailure` | Resultado |
| --- | --- |
| `network` | `offline` |
| `signed-out`, o `response` con 401 | `signed-out` |
| `account-changed`, o `response` con `account_mismatch` | cuenta distinta: el motor se detiene |
| `response` con `epoch_mismatch` | época cambiada (FR-075) |
| `response` con `client_outdated` | `outdated` |
| `response` con 403 `account_disabled` | se detiene, sin cambiar `status` |
| `response` con 429 | `error`, esperando `retryAfterSeconds` |
| `response` con 5xx o 503, `response` con 422, `unexpected` | `error`, con el reintento de R7 (o `Retry-After`) |

## R11. `stale_content`: se vuelve a evaluar con el contenido que corresponde

- **Decisión.** Una respuesta `stale_content` (o `duplicate` con ese motivo) sale de la cola. Si la `contentVersion` de la respuesta es la publicada en este documento, el motor vuelve a corregir la respuesta con ese contenido y, si da correcta, encola una operación nueva con esa versión; si la versión es otra, la guarda en `deferred` y la evalúa el próximo arranque, con el contenido nuevo. `route.quiz` no tiene bandera: sale de la cola sin más.
- **Por qué.** FR-064 y FR-007: el servidor guardó la respuesta por su reloj y sólo falta la bandera, que decide el cliente con el contenido vigente (D39). Corregir con un contenido viejo repetiría el error.

## R12. La importación del v1 del navegador

- **Decisión.** El arranque lee las cuatro claves v1 de `localStorage` sin escribir. Hay candidato si alguna existe, todas las presentes son JSON válido y alguna no está en blanco: un `taller-learning-v1` en blanco después del «Borrar todo» de F8 no es un v1 para importar (`amend-cuenta` `specs/022-f8-metodo/spec.md:917` y `:931`). El resumen cuenta los registros con `solvedAt` y toma el `result.time` más nuevo. El crudo es `JSON.stringify` de las claves presentes, en el orden de http-d1b.md §3.2; el normalizado, los parsers de carga de cada almacén. Con el 201 o el 200, las claves y sus respaldos pasan a `taller-v1-importado:<id>` y se borran.
- **Los parsers.** `parseRouteProgress` ya se exporta de `entities/guide`. `parseSavedLab` se suma al índice de `entities/exercise`. Los motores de campaña y Sistemas suman `parseSaved(raw)`, que usa su catálogo validado (`parseSavedCampaignState` y `parseSavedSystemsState` no se exportan, porque necesitan ese catálogo). Se llaman al responder la pregunta, con las vistas ya montadas.
- **Un v1 ilegible** no se ofrece: queda intacto en sus claves (FR-072), y la spec dice que el cliente no envía lo que los parsers descartan sin avisar.
- **Los sustitutos sueltos** se reemplazan con una expresión regular propia: `String.prototype.toWellFormed` es de ES2024 (MDN: «Baseline: Widely available» desde octubre de 2023) y `frontend/tsconfig.app.json` usa `lib: ["ES2022", "DOM", "DOM.Iterable"]`, así que no tipa.
- **Verificación.** El fixture congelado de D1b (`qa/fixtures/shared/import-cases.json`, con su huella) trae el crudo y el normalizado de las tres copias reales: la spec del armado del cuerpo los usa como valores esperados escritos por otro (los parsers congelados).

## R13. «Importar» de Método va al servidor, y la repregunta del 409 la hace F11d **(propuesta del plan)**

- **Decisión.** El envoltorio de `appProgressBackup()` reemplaza `applyImport(plan)` por `POST /api/progress/import` con `source: 'export'` y el texto del archivo, que recuerda de `planImport`. Elegir el archivo es el «sí» de la primera pregunta. Ante un 409 `import_needs_confirmation`, el motor abre `importQuestion` con `stage: 'confirm'` y espera la respuesta de la pantalla de F11d; la promesa de Método resuelve el aviso al final.
- **Por qué.** D1, «Relación con otras specs»: con D1 importar es `POST /api/progress/import`, y F2 dejó la interfaz para que D1c la reemplace sin reescribir las vistas. La página de F8 no cambia: llama a `planImport` y a `applyImport` como hoy y muestra el `notice`. La repregunta es la superficie 2, de F11d (F11 FR-065).
- **Descartado.** Enviar siempre con `confirm: true`: saltearía la protección del crudo de otra cuenta (FR-029). Cambiar la página de Método para que pregunte: dos pantallas para la misma pregunta.

## R14. «Salir»: un puerto en `signOut`, y la pantalla no es de D1c

- **Decisión.** `signOut` recibe `progress` (`flushNow` y `afterSignOut`) y `choose` (la pregunta), los dos opcionales. Sin `choose`, si queda algo, conserva (`keep`): es el camino que no pierde nada (ADR 0003). `SignOutSection` y `PrivacyReacceptance` lo leen de un contexto de `features/sign-in` que provee `AccountRoot`.
- **Por qué.** La decisión del 2026-10-28 (noche) cierra el FR-068: «D1c se queda con la mecánica y el pedido a la API; F11d, con la pantalla». A3 ya sumó una dependencia a `signOut` (`forgetContentCopy`, `amend-cuenta` `specs/016-a3-contenido-api/plan.md:3805-3835`), y D1c sigue esa forma.
- **Una discrepancia que no decide D1c.** La spec de F13 (`spec-f13` `c0ac6672`, L7) dice que F13 toma la parte visible de «Salir» (la espera, la pregunta y la nota). La decisión de la noche dice F11d. D1c no depende de cuál: el puerto es el mismo. Va como hallazgo.

## R15. «Computadora compartida»: la elección vive fuera del espacio, y no hay registro

- **Decisión.** `enterSharedMode()` borra en ese momento el espacio de la cuenta, guarda `taller-v2-compartida:<id>` = `'1'` y cambia el respaldo del espacio a memoria sin reabrir los almacenes. La copia del contenido la borra F11d con `forgetContentCopy()` de A3, como dice el plan de A3 (`amend-cuenta` `specs/016-a3-contenido-api/plan.md:5636`).
- **Por qué.** F11-Q5 y el FR-070 enmendado: se elige en «Tu cuenta» y borra en ese momento. La elección tiene que sobrevivir a la recarga y a cerrar la sesión (es la misma computadora), y no puede vivir en el espacio, porque la limpieza de FR-069 lo borraría.
- **Una diferencia con la spec de F11.** Su FR-062 habla de «los datos locales de la cuenta que registran sus dueños». Ningún plan creó ese registro: A3 usa una llamada directa. D1c no lo crea (YAGNI: dos dueños, una pantalla) y lo declara como hallazgo para F11d.

## R16. «Borrar todo»: el paso del servidor de F8, sin encolar y sin tocar las claves v1

- **Decisión.** El envoltorio corre `resetAll` de F8 (el paso del servidor y el borrado local) bajo la guarda y sin encolar: los avisos de `changes` sólo mueven la línea base. Con el 200, el borrado local ya limpia el espacio, porque los almacenes escriben ahí; el motor borra además la copia, la cola y la copia de la época, carga la foto de la época nueva y deja `epochChange` en `null` (F13 L6).
- **Por qué.** F8-L7 y el FR-074 enmendado: desde D1c, «Borrar todo» limpia el espacio y no las claves v1 que la cuenta no importó. La rareza de F8 (después de borrar, `save()` vuelve a escribir el recorrido en blanco, `amend-cuenta` `specs/022-f8-metodo/spec.md:319`) sigue, ahora en el espacio, y no encola nada porque la línea base ya es el estado en blanco.
- **La cola** del «Borrar todo» propio se descarta: es parte de lo que el alumno borró. La copia de FR-075 es para el borrado de otro dispositivo.

## R17. La guarda contra el solape

- **Decisión.** `busy` vale `import` o `reset` mientras corre uno. Una segunda importación o un segundo «Borrar todo» resuelven enseguida con `BUSY` («Ya hay una importación o un borrado en curso: esperá a que termine.»), sin pedir nada.
- **La espera visible.** F8-Q3 le da a D1c la guarda «con la espera visible de la red». D1c no dibuja: expone `busy`. F8 ya muestra «Borrando…» en su propio diálogo, y la importación de Método no tiene espera visible (F8 FR-025). Es un hallazgo para F8 y F13: quien dibuje Método puede leer `busy`.

## R18. La guarda de las costuras

- **Decisión.** Las cuatro claves v1 se exportan como constantes desde sus dueños (`ROUTE_PROGRESS_KEY`, `LAB_PROGRESS_KEY`, `CAMPAIGN_PROGRESS_KEY` y `SYSTEMS_PROGRESS_KEY`), y el armado de D1c las importa: el literal sigue en un solo archivo (R1 de `seams-guard-check`). `app/progress-sync/app-progress-sync.ts` suma a la excepción de R4 que ya tiene el armado de F8.
- **Descartado.** Repetir los literales en D1c y ampliar R1: abriría la puerta a otra instancia sobre una clave.

## R19. La red de E2E: traducir en el fixture, inventariar y aprobar lo que cambia

- **El problema.** Desde D1c, los almacenes leen el espacio. Toda prueba que siembra claves v1 con `storage.seed` arrancaría con el progreso en blanco y con la pregunta de la importación; toda prueba que lee `storage.snapshot()` o `storage.writes()` vería claves `taller-v2:41:…` y las de la cola. En `master` (`bb480677`) son 12 llamadas a `storage.seed` en 6 de los 10 archivos, 7 lecturas de `storage.writes` o `watchWrites`, 6 de `snapshot` y una lectura directa de `localStorage` (`project.spec.ts:59`); la base de D1c suma las de F3 a F12a, A3, A4 y F8.
- **Decisión (decisión del usuario 1, con recomendación).** `StorageControl` traduce para la cuenta de la sesión simulada (`sessionAccount`, 41 por omisión): `seed` escribe `taller-v2:41:<clave>`, y `writes()` y `snapshot()` devuelven las claves del espacio con su nombre v1 y omiten `copia`, `cola` y `copia-epoca`. `rawWrites()` y `rawSnapshot()` dan lo real, para las pruebas de D1c. T001 inventaría lo que la traducción no cubre (lecturas directas de una clave v1, `LAB_KEY` de `lab-storage.ts`, conteos exactos de `api.calls`, los E2E de F8 que esperan las claves v1 borradas, los escenarios de `boot-check` y los conteos de `watchStorageAccess`), y cada uno se edita en un commit propio con TDD, con la lista aprobada por el usuario.
- **Lo que cambia de significado y el PR declara.** Con la traducción, los E2E congelados de F1 que siembran el progreso de master ejercitan el espacio de la cuenta y no las claves v1 reales. Las claves v1 reales las prueban los E2E nuevos de D1c (FR-072).
- **Descartado.** Editar cada spec: decenas de ediciones a archivos congelados, por un cambio de lugar que el fixture puede absorber. No traducir y sembrar por la API: el doble tendría que convertir la forma v1 en filas, una tercera implementación de la traducción.

## R20. `starterHash` con un SHA-256 propio

- **Decisión.** `shared/lib/sha256-hex.ts`, una implementación pura de SHA-256 sobre el UTF-8 de `JSON.stringify(starter)`.
- **Por qué.** La operación `exercise.draft` lleva el `starterHash` del ejercicio (http.md §3.2), que el contenido no publica: sólo lo calcula `tools/content/meta.ts` (`sha256Hex(canonicalJson(exercise.starter))`, y `canonicalJson` de un texto es `JSON.stringify`). `crypto.subtle.digest` exige contexto seguro, y la spec dice que ninguna operación depende de eso (Assumptions). `crypto.getRandomValues` sí funciona fuera de contexto seguro (MDN: «the only member of the Crypto interface which can be used from an insecure context»).
- **Verificación.** La spec compara los 274 `starterHash` con los de `build/curriculum.meta.json`, que calcula Node, y los vectores de NIST para `''` y `'abc'`.

## R21. El hallazgo 7 de A4

- **El hallazgo.** Una pestaña con la versión anterior a A4 descarta `attemptId` en silencio al guardar (`.coordinador/plan-a4-report.md:175`; `plan-a4` `d5ace3d0`).
- **La respuesta de D1c.** Desde D1c, los almacenes escriben en el espacio de la cuenta, y una pestaña anterior escribe en las claves v1: no se pisan. El daño queda en las claves v1 que esa pestaña reescribe, y sólo importa si después se importan: D1b deduplica entonces por ejercicio y código dentro de ±10 minutos (FR-031), así que la deduplicación se degrada pero no se pierde. Lo resuelto y los intentos ya vienen de la foto (`solvedAt`, `lastAttempt`). D1c no agrega código por esto.

## R22. El número de intentos (D1c-6)

- **Decisión.** `exerciseSummary(id)` expone `attemptCount`, `legacyAttempts`, `proofState` y `serverSolvedAt` de la copia. La línea de la revisión vuelve a mostrar el número con `attemptCount`, el de los intentos que cuentan en la época (FR-021 de B2), sólo cuando la copia tiene la fila; si no, sigue como la dejó A4.
- **Por qué.** A4-Q4 la ocultó «hasta que D1c lo traiga del servidor». `legacyAttempts` es el contador v1, que no cuenta como intento del alumno (D1, FR-031).
- **Dónde.** En la vista vigente del laboratorio: `finishedReviewHTML` de `lab.js`, o el componente de F7b si ya portó la revisión. T001 detecta cuál.

## R23. D1c entra en servicio con F11d

- **El problema.** Con la costura vinculada, el progreso de un alumno que hoy está en las claves v1 deja de verse hasta que lo importa, y la pregunta la dibuja F11d.
- **Decisión (decisión del usuario 2, con recomendación).** Las unidades 1, 2 y 4 se pueden integrar antes: no cambian lo que el alumno ve. La unidad 3 (la etapa y la vinculación) y la 5 se integran en la misma entrega que F11d, como PR apilados que se mergean seguidos.

## R24. Las enmiendas de la spec

D1c enmienda tres requisitos de la spec de D1 con una sesión de `## Clarifications` (2026-10-28) y el texto nuevo de cada uno: el FR-070 (F11-Q5: el modo se elige en «Tu cuenta» y borra el espacio en ese momento), la cláusula de las claves v1 del FR-074 (F8-L7: rige desde D1c) y el FR-077 (amplía el estado con «error», la cantidad, el modo, los avisos y las acciones que pide F13). Va en su propio commit, para que el coordinador pueda separarlo.

## R25. La base

D1c espera a A4 (Q4 de D1, FR-079), que espera a A3, y los tres a F11a completa (TR-12). También usa F8 (el armado de `app/progress-backup` y el paso del servidor). La rama sale de `master` con F11a, A3, A4 y F8, o de la cadena de PR apilados si alguno todavía no llegó. Si falta A4 o A3, D1c no empieza (T001).

## Consultas de Context7 y de documentación oficial

El servidor `mcp__context7__*` agotó la cuota; se usó la segunda instancia. Las versiones salen de `package.json` (`bb480677`).

| Librería | Versión | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| Zustand (`/pmndrs/zustand/v5.0.12`, la más cercana a 5.0.15) | 5.0.15 | `createStore` de `zustand/vanilla`, `subscribe`, `getState`, `setState` parcial y `useStore(store, selector)` | El estado de D1c es un almacén vanilla; F11d y F13 lo leen con `useStore` y un selector, como pide la guarda de TR-5 | No |
| Vitest (`/vitest-dev/vitest/v5.0.3`) | 5.0.3 | `vi.useFakeTimers`, `advanceTimersByTimeAsync`, `toFake` y `vi.setSystemTime` | Las specs del motor usan relojes falsos con `advanceTimersByTimeAsync` para la espera de 2 s, el reintento y el tope por minuto | Sí: el motor recibe `setTimeout` y `now` inyectados igual, para no depender de qué se finge |
| Playwright (`/microsoft/playwright/v1.63.0`) | 1.63.0 | `addInitScript`, `page.route` con `abort` y `fulfill`, y `page.clock` (`install`, `setFixedTime`) | `addInitScript` corre antes de los scripts de la página en cada navegación; con `page.clock` instalado, `Date.now` sigue el reloj de la página, y la sincronización por omisión del doble usa el `sentAt` del lote | Sí: el `serverTime` por omisión es el `sentAt` (R9) |
| fishery (`/thoughtbot/fishery`) | 2.4.0 | `Factory.define<T>` y `build(params)` con mezcla profunda | Las filas de la foto en las specs salen de factories de fishery; los arreglos se reemplazan, no se mezclan | No |
| `fetch` (MDN, `RequestInit.keepalive`; Context7 no lo cubre) | — | El tope de `keepalive` | «The body size for keepalive requests is limited to 64 kibibytes»; la página no dice si es por pedido o por todos los que están en camino | Sí: un solo lote de hasta 61 440 bytes por `pagehide` (R7) |
| `visibilitychange` (MDN) | — | El último evento confiable | «Transitioning to hidden is the last event that's reliably observable by the page» | Sí: al ocultarse envía con el cliente de la API, y en `pagehide`, con `keepalive` |
| `crypto.getRandomValues` (MDN) | — | Contexto seguro y tope | Funciona fuera de contexto seguro; lanza con más de 65 536 bytes | No: un UUID usa 16 |
| `String.prototype.toWellFormed` (MDN) | — | Disponibilidad | Reemplaza cada sustituto suelto por U+FFFD; es de ES2024 | Sí: una expresión regular propia (R12) |

React 19.2.8, Vite, Testing Library, jsdom, nuqs y React Hook Form no se consultaron: D1c no dibuja componentes, no usa nuqs ni formularios, y sus dos contextos de React son `createContext` y `useContext` de siempre (el de F11a, `api-client-context.ts`, es el modelo).

## Cómo se verificó al planificar

**Corrió** (sólo lectura, sobre `bb480677` y los worktrees de la tabla del principio): la lectura de los almacenes y de `versioned-storage.ts`; el conteo de `storage.seed`, `storage.writes`, `storage.snapshot` y `localStorage` en los 10 archivos de `qa/e2e/specs/` (R19); la lectura de `tools/content/meta.ts` para `starterHash`; y la historia de `spec.md` (`git log`: sólo la tocó #28, así que las enmiendas no chocan con D1b).

**No corrió:** ningún fragmento del plan, `npm`, Docker ni el navegador. Las firmas de F11a salen de `impl-f11a`; las de A3, A4 y F8, de sus planes, que tampoco corrieron. T001 contrasta cada una con la base real antes de empezar.
