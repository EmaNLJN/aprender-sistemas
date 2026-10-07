# Contrato HTTP de D1a: sincronización y lectura del progreso

**Input**: [spec.md](../spec.md) (FR-001 a FR-023, FR-046 a FR-059), ADR 0006 §7, §8, D22, D23, D25 y D36 ([ADR 0006](../../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)), [merge-rules.md](./merge-rules.md) y [research.md](../research.md). Es lo que consumen el cliente v2 (D1c), la exportación del titular (C3b) y las pruebas de este plan; las dos rutas de D1b (`POST /api/progress/import` y `POST /api/progress/reset`) los citan y no los repiten.

Las decisiones que este contrato toma y que el ADR deja abiertas están marcadas con **(propuesta del plan)** y tienen su razón en [research.md](../research.md).

## 1. Convenciones

- Todo va bajo `/api`, del mismo origen y sin versionado público. El cuerpo es JSON en `camelCase`; los instantes, ISO 8601 en UTC con milisegundos y `Z` (`2026-10-06T12:00:00.123Z`, lo que da `Date.prototype.toISOString()`).
- Los pedidos que modifican llevan `X-XSRF-TOKEN` y `X-Taller-User` (el id de la cuenta de la sesión). `GET /api/progress` no lleva el segundo. Ninguna ruta recibe un `user_id`: la cuenta sale de la sesión (FR-057).
- Los errores salen siempre como `{message, code}` y los campos extra que dice la tabla de la sección 6, en español (`lang/es/api.php`). La única excepción es el 413, que corta Nginx antes de PHP y sale con la página de Nginx, igual que el de `/api/runs` de B2. El 429 por IP de Nginx sí es JSON (C3a).
- Un texto que el cliente manda llega **tal cual**: ningún middleware lo recorta ni convierte `''` en `null` en `/api/sync` (research R12).

## 2. Cómo se evalúa un pedido

`POST /api/sync`, en este orden (el primero que falla responde):

1. **Nginx**: tamaño del cuerpo (2 MiB, 413) y ritmo por IP (429).
2. **Cookies, sesión y CSRF** (C3a): 419, 401, 403 `account_disabled`, 409 `account_mismatch` y 403 `email_unverified`.
3. **Límite de ritmo por cuenta**: 60 por minuto, 429 con `Retry-After`.
4. **Forma del sobre**: 422 `validation_failed`.
5. **Formato**: 409 `client_outdated`.
6. **Contenido importado**: 503 `content_not_imported` si no hay un import.
7. **Época**: 409 `epoch_mismatch` con `{epoch, revision}`, antes de aplicar nada y sin recordar los UUID del lote.
8. **Las operaciones**, una por una, en una sola transacción: 200.

`GET /api/progress`: Nginx (ritmo por IP), sesión (401, 403), 503 `content_not_imported`, el validador (304) y la foto (200). No lleva el límite de Laravel (FR-021).

## 3. `POST /api/sync`

### 3.1 El sobre

| Campo | Tipo | Regla |
| --- | --- | --- |
| `epoch` | entero | Obligatorio, 1 o más: la época que el cliente conoce |
| `sentAt` | instante | Obligatorio: la hora del dispositivo al enviar. El servidor la usa sólo para corregir los relojes del lote (sección 3.5) |
| `knownRevision` | entero | Opcional, 0 o más; ausente vale 0 |
| `knownContentVersion` | texto o `null` | Opcional: 32 hexadecimales en minúsculas, la `contentVersion` que el cliente conoce |
| `format` | entero | Obligatorio. El vigente es `2` (la versión del formato local v2 del ADR 0004 §4) **(propuesta del plan)**. El servidor acepta el vigente y el anterior; hoy sólo existe el `2` |
| `operations` | lista | Obligatorio: de 0 a **200** operaciones **(propuesta del plan)**. Con 0 es una consulta: no escribe y devuelve lo que cambió |

Un cuerpo que no es un objeto JSON, que no es JSON válido (incluidos los surrogates sueltos que `JSON.stringify` escapa y PHP rechaza) o que no cumple la tabla da 422 `validation_failed` con `errors` por campo (`operations.3.id`, por ejemplo). Cada operación debe ser un objeto con un `id` UUID v4 en minúsculas, un `type` de texto y un `at` con la forma de la sección 1: sin eso, no hay a qué contestarle y falla el pedido entero. Todo lo demás de una operación se evalúa operación por operación (sección 3.3).

### 3.2 Las operaciones

Cada operación lleva `id`, `type`, `at` (el reloj con que el dispositivo selló el cambio: `Date.now()` más el desfase que informó `serverTime`) y los campos de su tipo. **Un campo de más o de menos la deja `rejected` con `invalid`.** Las dieciséis:

| `type` | Campos | Referencias y rangos | Escribe (tipos de campo de [merge-rules.md](./merge-rules.md)) |
| --- | --- | --- | --- |
| `exercise.prediction` | `exerciseId`, `answer`, `correct` (bool), `contentVersion` | el ejercicio; `answer` menor que las opciones de su predicción | `exercise.prediction.answer`; con `correct` y la versión vigente, `exercise.predictionCorrect` |
| `exercise.assist` | `exerciseId` y al menos uno de `assisted` y `solutionSeen`, que sólo pueden valer `true` | el ejercicio | `exercise.assisted`, `exercise.solutionSeen` |
| `exercise.hints` | `exerciseId`, `revealed` (entero) | el ejercicio; de 1 a las pistas activas del ejercicio | `exercise.hintsRevealed` |
| `exercise.reflection` | `exerciseId`, `text` | el ejercicio; hasta 10.000 caracteres (`''` es un valor) | `exercise.reflection` |
| `exercise.customTest` | `exerciseId`, `text` | el ejercicio; hasta 3.000 caracteres | `exercise.customTest` |
| `exercise.review` | `exerciseId`, `confidence` (`again`, `practice` o `confident`), `reviewedAt`, `reviewDueAt` (instantes) | el ejercicio; los dos instantes entre 2020-01-01 y 2100-01-01 | `exercise.review` |
| `exercise.draft` | `exerciseId`, `code` (texto o `null`), `starterHash` (64 hexadecimales o `null`) | el ejercicio; `code` hasta 30.000 caracteres; `code: null` exige `starterHash: null` (la lápida de «restaurar inicio») | `exercise.draft` |
| `checkpoint.answer` | `worldId`, `answer`, `passed` (bool), `contentVersion` | el mundo; `answer` menor que las opciones de su checkpoint | `checkpoint.lastAnswer`; con `passed` y la versión vigente, `checkpoint.passed` |
| `workshop.prediction` | `workshopId`, `language` (`rust` o `go`), `answer`, `correct`, `contentVersion` | el taller; `answer` menor que las opciones de su predicción | `workshop.answer`; con `correct` y la versión vigente, `workshop.predictionCorrect` |
| `workshop.note` | `workshopId`, `language`, `text` | el taller; hasta 10.000 caracteres | `workshop.note` |
| `workshop.objective` | `workshopId`, `language`, `objectiveKey` | el taller y su objetivo | `workshop.objective` |
| `workshop.step` | `workshopId`, `language`, `stepKey`, `marked` (bool) | el taller y la **clave** de su etapa (`e1`…), nunca la posición | `workshop.step` |
| `route.mark` | `kind` (`step`, `milestone` o `favorite`), `itemKey`, `marked` (bool) | según `kind`: un paso de la guía, uno de los diez hitos o un recurso de la guía | `route.mark.step`, `route.mark.milestone` o `route.mark.favorite` |
| `route.quiz` | `stepId`, `answer`, `contentVersion` | el paso de la guía; `answer` menor que las opciones de su quiz | `route.quiz` |
| `route.note` | `language`, `field` (`learned` o `next`), `body` | hasta 20.000 caracteres | `route.note` |
| `preference.set` | `name` y `value`: `routeLanguage` (`rust` o `go`), `focusMinutes` (15, 25 o 45), `labSelectedRust` o `labSelectedGo` (un ejercicio de ese lenguaje) | el ejercicio, en los dos últimos | `preference.routeLanguage`, `preference.focusMinutes`, `preference.labSelectedRust` o `preference.labSelectedGo` |

- **Claves.** `exerciseId` tiene la forma de C2 (`[a-z0-9][a-z0-9-]{0,63}`); las demás (`worldId`, `workshopId`, `stepId`, `objectiveKey`, `stepKey` e `itemKey`), `[A-Za-z0-9][A-Za-z0-9._-]{0,63}`. Una clave mal formada es `invalid`; una bien formada que el contenido no tiene, `unknown_reference`. **Lo retirado cuenta como existente**: el contenido nunca se borra, y una operación sobre un ejercicio, mundo o taller retirado se aplica igual (spec, Assumptions).
- **Enteros y textos.** `answer` y `revealed` son enteros de 0 a 255; cualquier otro tipo es `invalid`. Los topes de texto cuentan caracteres Unicode (nunca rechazan lo que v1 aceptaba, que contaba unidades UTF-16) y además se miden en bytes contra la columna.
- **`contentVersion`** son 32 hexadecimales en minúsculas. Si no es la vigente, la operación se guarda por la regla de reloj, **no otorga la bandera** y su resultado es `stale_content` (FR-007). Vale también para `route.quiz`, que no tiene bandera que retener: el cliente la vuelve a evaluar igual **(propuesta del plan)**.
- **Los hitos** son los diez de `qa/fixtures/shared/route-milestones.json` (`rust-memory` a `go-network`): no tienen tabla.
- `reviewedAt` y `reviewDueAt` son **fechas de estudio**, no relojes: el servidor no las corrige.

**Lo que ninguna operación puede escribir** (FR-009): `solved_at`, `server_solved_at`, la prueba aprobada y el último intento, el conteo (los escribe el cierre de B2), los sellos de campaña, el sello de código de un taller y el contador de intentos v1 (los escribe la importación). Una operación de un tipo que no está en la tabla, o con un campo que no es de su tipo, se rechaza con `invalid`.

### 3.3 Los resultados

Una entrada por operación, **en el orden del pedido**, siempre en un 200:

| `status` | `reason` | Significado |
| --- | --- | --- |
| `applied` | — | Procesada con las reglas de fusión. Puede haber perdido contra un valor más nuevo: lo que quedó guardado lo dice `changes` (US2, escenario 8) |
| `stale_content` | — | Aplicada, sin su bandera (sección 3.2) |
| `rejected` | `invalid`, `out_of_range` o `unknown_reference` | No escribió nada. `invalid`: forma, tipo, campo desconocido o de más, texto fuera de un conjunto. `out_of_range`: un valor del tipo correcto fuera del rango, de un conjunto de números, del tope de longitud, de las opciones o de las pistas, o un reloj anterior al piso de la sección 3.5. `unknown_reference`: una clave que el contenido no tiene |
| `duplicate` | el del original, si lo tuvo | El mismo UUID con el mismo contenido que ya se procesó: no cambia nada. Lleva el `reason` con que se guardó la primera vez (`stale_content` o el de un rechazo), así el cliente se entera aunque se le haya perdido la respuesta **(propuesta del plan)** |
| `uuid_reused` | — | El mismo UUID con otro contenido: no se aplica y no pisa el registro |

El cliente saca de su cola `applied`, `duplicate` y `rejected` (e informa la rechazada) y vuelve a evaluar `stale_content`.

### 3.4 La respuesta

```json
{
  "epoch": 1,
  "revision": 42,
  "serverTime": "2026-10-06T12:00:00.123Z",
  "contentVersion": "0123456789abcdef0123456789abcdef",
  "results": [{"id": "6f1c…", "status": "applied"}],
  "changes": {"full": false, "exercises": [], "drafts": [], "campaign": {"seals": [], "checkpoints": []}, "workshops": {"progress": [], "objectives": [], "steps": []}, "route": {"marks": [], "quiz": [], "notes": []}, "preferences": null}
}
```

- `serverTime` es la hora del servidor al recibir el lote, de la que el cliente saca su desfase (y avisa si pasa de 2 minutos). `revision` es la de la cuenta al terminar.
- `Cache-Control: no-store`.
- **`changes`** es lo que cambió desde `knownRevision`: las filas cuya revisión es mayor, **incluidas las que cambiaron las operaciones de este mismo lote**, para que el cliente se entere de lo que perdió una fusión (FR-017). Los arreglos tienen la forma de la sección 5. Con `full: true` es la foto completa, y el cliente reemplaza lo que tenía. Es completa si:
  - `knownRevision` es 0 o falta;
  - `knownContentVersion` falta o no es la vigente (un import de contenido puede cambiar un `grading_hash` o retirar contenido sin mover la revisión de la cuenta);
  - `knownRevision` es mayor que la del servidor (una restauración del respaldo) **(propuesta de la spec)**.
- Nunca informa un borrado: sólo «Borrar todo» (D1b) borra filas, y sube la época (FR-011).

### 3.5 La corrección de reloj

El servidor fecha cada operación con `efectivo = min(at + (ahora − sentAt), ahora)`, donde `ahora` es su hora al recibir el lote (FR-002). Es la edad que la operación tenía al enviarse, vuelta a anclar en el reloj del servidor: el error absoluto del dispositivo se cancela. Un `at` posterior a `sentAt` se acota a `ahora`. Un efectivo anterior a **2020-01-01T00:00:00.000Z** (el piso de `config/progress.php`) se rechaza con `out_of_range` **(propuesta del plan)**. Cada operación guarda en `sync_operations.clock_offset_ms` el desfase del lote (`ahora − sentAt`, acotado a `INT`) y `received_at` es `ahora`.

### 3.6 Idempotencia y atomicidad

- Cada operación se identifica por su `id`, por cuenta. El servidor guarda el `id`, un sha256 del contenido de la operación y su resultado (también si la rechazó), **14 días** (FR-014). El sha256 es el de la forma canónica del objeto recibido sin su `id`: claves ordenadas, sin espacios, texto sin escapar. Pasados los 14 días, reenviar una operación vieja no pisa nada más nuevo: lo decide el reloj.
- El lote entero se aplica en **una transacción**: se confirma con un resultado por operación, o no queda nada. Ante un error del servidor (500) el cliente lo reenvía igual.
- Dos operaciones con el mismo `id` en un mismo lote: la primera se procesa y la segunda sale `duplicate` (mismo contenido) o `uuid_reused`.
- La revisión de la cuenta sube **una vez** por transacción que cambia algo, y cada fila que cambió lleva la nueva; un lote sin efecto (todo duplicado, rechazado o que perdió) no la sube (FR-010).

### 3.7 Límites

| Qué | Límite | Respuesta |
| --- | --- | --- |
| Cuerpo | 2 MiB (Nginx) | 413, sin pasar por PHP |
| Operaciones por lote | 200 **(propuesta del plan, a ajustar con SC-010)** | 422 `validation_failed`, sin aplicar nada |
| Ritmo | 60 por minuto y cuenta | 429 `too_many_requests` con `Retry-After` |

## 4. `GET /api/progress`

Responde sólo lo propio, en un único snapshot (REPEATABLE READ): la época, la revisión y todas las áreas salen del mismo instante (FR-020).

```json
{
  "userId": 7, "epoch": 1, "revision": 42, "resetAt": null,
  "contentVersion": "0123456789abcdef0123456789abcdef", "serverTime": "2026-10-06T12:00:00.123Z",
  "full": true,
  "exercises": [], "drafts": [], "campaign": {"seals": [], "checkpoints": []},
  "workshops": {"progress": [], "objectives": [], "steps": []}, "route": {"marks": [], "quiz": [], "notes": []},
  "preferences": null
}
```

- **`userId`** lo suma esta spec (FR-020 y FR-066): el cliente descarta una foto que diga ser de otra cuenta que la de su espacio.
- **Validador**: `ETag: W/"u<cuenta>.e<época>.r<revisión>.c<contentVersion>"` y `Cache-Control: private, no-store`. El cliente manda `If-None-Match` a mano y recibe **304** sin cuerpo si nada cambió (se compara con el criterio débil, como en el contenido). El 304 sólo lee la cabecera de la cuenta y la versión del contenido.
- **Una cuenta sin cabecera** (sin ninguna sincronización) recibe la foto vacía, `epoch` 1 y `revision` 0, y leerla **no escribe nada** (FR-019).
- Incluye lo retirado. No lleva el límite de Laravel; rige el de Nginx por IP.

## 5. La foto: las áreas

Los mismos arreglos viajan en `GET /api/progress` y en `changes`. Cada fila lleva su `revision`. Un `at` `null` es un reloj legado (anterior a todo). Los arreglos van ordenados por la clave natural de la fila. En un delta, cada arreglo trae sólo las filas cambiadas.

| Área | Fila |
| --- | --- |
| `exercises` | `{exerciseId, revision, prediction: {answer, at} \| null, predictionCorrect: {value, at}, assisted, solutionSeen, hintsRevealed: int \| null, reflection: {text, at} \| null, customTest: {text, at} \| null, review: {confidence, reviewedAt, reviewDueAt, at} \| null, solvedAt, serverSolvedAt, proof: {attemptId, at, state, tests} \| null, lastAttempt: {attemptId, at, outcome, legacy, tests} \| null, attemptCount, legacyAttempts}` |
| `drafts` | `{exerciseId, code: texto \| null, starterHash, at, revision}`; `code: null` es la lápida de «restaurar inicio» |
| `campaign.seals` | `{exerciseId, code, prediction, assisted, revision}`, ordenados por `exerciseId`; los escribe la importación de D1b ([http-d1b.md](./http-d1b.md), sección 5) |
| `campaign.checkpoints` | `{worldId, passed, passedAt, lastAnswer: {value, at} \| null, revision}` |
| `workshops.progress` | `{workshopId, language, codeSealed, predictionCorrect: {value, at}, answer: {value, at} \| null, note: {text, at} \| null, revision}` |
| `workshops.objectives` | `{workshopId, language, objectiveKey, observedAt, revision}` |
| `workshops.steps` | `{workshopId, language, stepKey, marked, at, revision}`; `marked: false` es una lápida |
| `route.marks` | `{kind, itemKey, marked, at, revision}` |
| `route.quiz` | `{stepId, answer, at, revision}` |
| `route.notes` | `{language, field, body, at, revision}` |
| `preferences` | `{routeLanguage: {value, at} \| null, focusMinutes: {value, at} \| null, labSelected: {rust: {value, at} \| null, go: {value, at} \| null}, revision}`, o `null`: sin fila (en una foto) o sin cambios (en un delta) |

- **El estado de una prueba aprobada** (`proof.state`, FR-022) se calcula al leer, comparando el `grading_hash` con que se verificó el intento aprobado con el vigente del ejercicio: `current` si coinciden, `changed` si no («cambió, volvé a verificarlo» en la interfaz) y `legacy` si el intento es un intento legado de la importación, que no trae `grading_hash`. Los valores del cable van en inglés y en minúscula, como los demás enums (sección 8) **(propuesta del plan)**: «vigente», «cambió» y «legado» son los nombres del concepto en la spec. No se borra ni se reinicia nada.
- **Resúmenes de intentos** (sin código, sin prueba propia y sin salidas): sólo los de las dos puntas que guarda `exercise_progress`, la última aprobada (`proof`) y el último intento (`lastAttempt`), cada uno con el veredicto de sus pruebas, `tests: [{testKey, outcome}]` con `outcome` `pass`, `fail` o `missing`, en el orden de las pruebas. No hay un historial: el de intentos es un recurso de B2 que sigue sin dueño **(propuesta del plan)**.
- **Fechas.** `solvedAt` y `serverSolvedAt` son de B2; `confidence` es `again`, `practice` o `confident`.
- **El grupo de repaso.** `review` es `null` sólo si sus tres columnas (`confidence`, `reviewedAt` y `reviewDueAt`) son nulas. Un grupo legado que importó D1b (`at: null`) puede traer `confidence` y `reviewedAt` en `null` con `reviewDueAt`, como lo dejó el v1. Una escritura de `/api/sync` reemplaza el grupo entero ([http-d1b.md](./http-d1b.md), sección 5, y R41).

## 6. Errores

Los códigos y estados de C3a (401, 403, 409 `account_mismatch`, 419, 422 `validation_failed` y 429) quedan como están en el contrato HTTP de C3a (rama `spec/c3-identidad`, `specs/004-c3-identidad-acceso/contracts/http.md`) y en el [ADR 0006](../../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) §8. D1a suma dos y usa uno de C2:

| HTTP | `code` | Mensaje (`lang/es/api.php`) | Cuándo | Extra |
| --- | --- | --- | --- | --- |
| 409 | `epoch_mismatch` | Tu progreso se borró desde otro dispositivo. Se cargará el estado nuevo. | La época del pedido no es la vigente | `epoch`, `revision` (las vigentes) |
| 409 | `client_outdated` | Esta pestaña quedó vieja. Recargá la página para seguir sincronizando. | El `format` no está entre los que acepta el servidor | |
| 503 | `content_not_imported` | (el de C2) | No hay un import de contenido: sin él no hay a qué referirse | `Retry-After` |

Ante un 409 `client_outdated` el cliente **conserva** la cola. Ante un 409 `epoch_mismatch` **no la reenvía**: guarda una copia descargable, carga la foto de la época nueva y lo avisa (FR-075, D1c).

## 7. Lo que el cliente tiene que hacer

Para D1c; D1a lo fija y no lo implementa:

- Sellar cada operación con `Date.now()` más el desfase de `serverTime`, juntar los cambios sucesivos de un campo en una operación y partir la cola en lotes de a lo sumo 200 operaciones y de 2 MiB (el envío al cerrar la pestaña con `fetch` y `keepalive` tiene un tope de 64 KiB por pedido del navegador, así que ese envío es de a lotes más chicos).
- Mandar `knownRevision` y `knownContentVersion` en cada lote, y aplicar `changes` a su copia: con `full: true` la reemplaza; si no, fusiona fila por fila con las mismas reglas ([merge-rules.md](./merge-rules.md)), respetando lo que todavía tiene en la cola.
- Reintentar un lote sin respuesta con las mismas operaciones y los mismos `id`.
- Tratar los textos con surrogates sueltos antes de enviarlos: el servidor responde 422, no 500.
- Manejar los estados de la sección 3.7 y la sección 6, y los de C3a (401, 403, 409 `account_mismatch`, 419).

## 8. Valores del cable

| Campo | Valores |
| --- | --- |
| `status` de un resultado | `applied`, `rejected`, `duplicate`, `uuid_reused`, `stale_content` |
| `reason` | `unknown_reference`, `invalid`, `out_of_range` y, en un `duplicate`, `stale_content` |
| `proof.state` | `current`, `changed`, `legacy` |
| `outcome` de un intento | `passed`, `failed`, `compile_error`, `runtime_error`, `timeout`, `infra_error`, `canceled`, `legacy_error` |
| `outcome` de una prueba | `pass`, `fail`, `missing` |
| `confidence` | `again`, `practice`, `confident` |
| `kind` de `route.mark` | `step`, `milestone`, `favorite` |
| `language` | `rust`, `go` |
