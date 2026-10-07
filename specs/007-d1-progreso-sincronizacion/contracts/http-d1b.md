# Contrato HTTP de D1b: importación del v1 y «Borrar todo»

**Input**: [spec.md](../spec.md) (FR-024 a FR-045, y la parte de D1b de FR-053, FR-055 a FR-058 y FR-084); el [ADR 0006](../../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md), §4.6, §7, §8, D19, D24, D26, D29 y D30; [research-d1b.md](../research-d1b.md); y el contrato de D1a, [http.md](./http.md), que este documento cita y no repite. Lo consumen el cliente v2 (D1c), la página «Método» del front (F8) y las pruebas de [plan-d1b.md](../plan-d1b.md).

Las decisiones que el ADR deja abiertas y este contrato toma llevan la marca **(propuesta del plan)**, y su razón está en [research-d1b.md](../research-d1b.md).

## 1. Convenciones

Valen las de D1a ([http.md](./http.md), sección 1):

- todo va bajo `/api`, con JSON en `camelCase`;
- los instantes, en ISO 8601 UTC con milisegundos y `Z`;
- un pedido que modifica lleva `X-XSRF-TOKEN` y `X-Taller-User`;
- ninguna ruta recibe un `user_id`: un `user_id` en el cuerpo se ignora;
- los errores salen como `{message, code}` en español;
- el 413 de Nginx sale como su propia página, sin `{message, code}`.

Además:

- `/api/progress/import` está excluida de `TrimStrings` y de `ConvertEmptyStringsToNull`: el crudo y los textos llegan byte por byte (R36).
- Cada respuesta de las dos rutas, también las de error, lleva `Cache-Control: private, no-store`: las dos van detrás de `PrivateNoStore`, como `/api/runs` de B2.
- **Las rutas** del informe y de los errores 422 siguen las claves del v1: `lab.records.rust-02.reviewAt`, `systems.records.rust:pc.steps[3]` o `route.completed[0]`. Los índices de un arreglo van entre corchetes, y `raw` nombra el crudo. Un error 422 de `normalized` lleva el prefijo `normalized.`; una entrada del informe no lo lleva.

## 2. Cómo se evalúa un pedido

**`POST /api/progress/import`.** Responde el primer paso que falla **(propuesta del plan; refina FR-030 sin cambiar su orden, R32)**:

1. **Nginx**: un cuerpo de más de 24 MiB recibe 413, y rige el ritmo por IP (429).
2. **El acceso** (C3a): cookies, sesión y CSRF (419 o 401), cuenta activa (403 `account_disabled`), cuenta esperada (409 `account_mismatch`) y email verificado (403 `email_unverified`).
3. **El límite** por cuenta: 3 por hora (429 con `Retry-After`).
4. **El sobre** (sección 3.1): 422 `validation_failed` con `errors`.
5. **El formato**: 409 `client_outdated`.
6. **El contenido importado**: 503 `content_not_imported`.
7. **La época**, leída sin candado y sin escribir: 409 `epoch_mismatch` con `{epoch, revision}`.
8. **La forma de `normalized`** contra el contenido (sección 3.3): 422 con `errors` en `normalized.<ruta>`.
9. **Bajo el candado de la cuenta**, en este orden:
   - la época otra vez (409 `epoch_mismatch`);
   - la misma `importId` (200 con el informe guardado, o 422 con `errors.importId`);
   - el mismo crudo en la época (200 con el informe guardado);
   - la confirmación (409 `import_needs_confirmation`);
   - si no, se aplica y responde 201.

**`POST /api/progress/reset`.** Responde el primer paso que falla:

1. **Nginx**: el ritmo por IP. El cuerpo es chico y rige el tope de `location ^~ /api/`.
2. **El acceso**: cookies, sesión, CSRF, cuenta activa y cuenta esperada. **No** pide email verificado (FR-040).
3. **La contraseña confirmada**: 423 `password_confirmation_required`. Va antes del límite, así que un 423 no gasta un reset del día.
4. **El límite** por cuenta: 3 por día (429 con `Retry-After`).
5. **El sobre** (sección 4.1): 422.
6. **El formato**: 409 `client_outdated`.
7. **Bajo el candado**: la época (409 `epoch_mismatch` con `{epoch, revision}`) y el reset (200). Después del COMMIT se cancelan las ejecuciones activas, y eso no cambia la respuesta.

## 3. `POST /api/progress/import`

### 3.1 El sobre

| Campo | Tipo | Regla |
| --- | --- | --- |
| `format` | entero | Obligatorio. El vigente es `2`, como en la sincronización. El servidor acepta el vigente y el anterior (FR-058); hoy sólo hay uno **(propuesta del plan)** |
| `importId` | texto | Obligatorio. UUID v4 en minúsculas. El cliente genera uno por cada importación que el alumno confirma y lo conserva sólo para reintentarla (R31) |
| `epoch` | entero | Obligatorio, 1 o más: la época que el cliente conoce |
| `source` | texto | Obligatorio: `storage` (las claves del navegador) o `export` (un archivo de «Exportar mi progreso») |
| `raw` | texto | Obligatorio. El v1 tal cual (sección 3.2), de hasta 10 MiB (10.485.760 bytes en UTF-8). El servidor lo guarda sin interpretarlo y calcula su sha256 sobre esos bytes |
| `normalized` | objeto | Obligatorio. La salida de los parsers v1 (sección 3.3) |
| `confirm` | booleano | Opcional; si falta, vale `false`. Es la respuesta del alumno a «¿Este progreso es tuyo?» después de un 409 `import_needs_confirmation` |

Los campos de más del sobre se ignoran. Un cuerpo que no es JSON, o que trae un sustituto suelto (`json_decode` lo rechaza), da 422.

### 3.2 El crudo

- **`source: storage`**: el texto de `JSON.stringify` de un objeto con las claves v1 que existan, en este orden, con su valor guardado tal cual: `taller-learning-v1`, `taller-laboratorio-v1`, `taller-campaign-v1` y `taller-systems-v1`. No incluye los respaldos (`:respaldo`). El mismo navegador da los mismos bytes **(propuesta del plan, R24)**.
- **`source: export`**: el texto del archivo, como lo da `File.text()`.
- **En los dos casos**, el cliente reemplaza antes los sustitutos sueltos por U+FFFD (`toWellFormed()`, R26).

### 3.3 `normalized`

`normalized` es `{route?, lab?, campaign?, systems?}`, con al menos una sección. Cada sección es el `state` del parser de carga de su almacén v1, aplicado al JSON de esa sección (R24):

| Sección | Parser |
| --- | --- |
| `route` | `parseProgress` (`frontend/app.js`), que F2 extrae como `parseRouteProgress` |
| `lab` | `parseSaved` (`frontend/lab.js`), que F2 extrae como `parseSavedLab` |
| `campaign` | `parseSavedCampaignState` |
| `systems` | `parseSavedSystemsState` |

Con `export`, la sección `route` es el primer nivel del archivo sin `lab`, `campaign`, `systems` ni `exportedAt`, y las otras tres son sus subobjetos.

En las tablas de abajo:

- **Dominio** es lo que el parser puede emitir. Si un valor queda fuera, el pedido entero da 422, porque esa copia no salió del parser.
- **Se omite con informe** es lo que el parser emite y el servidor no puede guardar tal cual. Se aplica el resto, y el informe nombra la ruta (R25).
- Un campo desconocido en cualquier nivel da 422, y un `''` es un valor.

**`route`**: todas las claves son obligatorias.

| Clave | Dominio | Se omite con informe |
| --- | --- | --- |
| `version` | `1` | — |
| `language` | `rust` o `go` | — |
| `completed` | lista de ids de paso de la guía, sin repetidos | — |
| `milestones` | lista de los diez hitos (`rust-memory`…), sin repetidos | — |
| `favorites` | lista de ids de recurso de la guía, sin repetidos | — |
| `quizAnswers` | objeto: paso de la guía → entero de 0 o más | una respuesta igual o mayor que las opciones vigentes del quiz (`outside_options`) |
| `notes` | `{rust: {learned, next}, go: {learned, next}}`, textos de hasta 20.000 caracteres | — (un `''` no se escribe y vuelve como `''`, R29) |
| `minutes` | `15`, `25` o `45` | — |

**`lab`**: `version` (`1`), `records` (un objeto: id de ejercicio → registro) y `selected` (`{rust, go}`: cada uno, null o un ejercicio de ese lenguaje).

| Clave del registro | Dominio | Se omite con informe |
| --- | --- | --- |
| `predictionCorrect`, `assisted` y `solutionSeen` | booleanos, obligatorios | — |
| `prediction` | entero de 0 o más, opcional | igual o mayor que las opciones vigentes de la predicción (`outside_options`) |
| `hints` | número de 0 a 3, opcional | no entero (`not_an_integer`); mayor que las pistas activas del ejercicio (`beyond_active_hints`) |
| `draft`, `reflection` y `customTest` | textos de hasta 30.000, 10.000 y 3.000 caracteres, opcionales | — |
| `attempts` | número de 0 a 2^53 − 1, opcional | no entero (`not_an_integer`) |
| `solvedAt` | número de 1 a 2^53 − 1 (milisegundos), opcional | no entero, o fuera de `DATETIME(3)` (`date_out_of_range`) |
| `reviewAt` y `reviewedAt` | números de 0 a 2^53 − 1, opcionales | ídem |
| `confidence` | `again`, `practice` o `confident`, opcional | — |
| `result` | objeto, opcional | toda la ruta `…result`, si `time` no es un entero que cabe en `DATETIME(3)` (`date_out_of_range`) |

| Clave de `result` | Dominio | Se omite con informe |
| --- | --- | --- |
| `code` | texto de hasta 30.000 | — |
| `success` y `transportError` | booleanos | `success` si los dos son verdaderos (`contradicts_transport_error`): queda `legacy_error` |
| `stdout` y `stderr` | textos de hasta 12.000 y 18.000 | — |
| `tests` | lista de `{id, passed}`: `id`, una prueba del ejercicio (retirada o no), sin repetidos; `passed`, booleano | — |
| `time` | número finito (milisegundos) | ver `result` arriba |
| `customTest` | texto de hasta 3.000 | — |
| `customPassed` | booleano | — |
| `attemptId` | entero positivo, opcional (lo agrega A4) | un intento que no es de la cuenta y del ejercicio se ignora, sin informe (R42) |

**`campaign`**: `version` (`1`), `seals` (id de ejercicio → `{code, prediction, assisted}`, tres booleanos obligatorios) y `checkpoints` (mundo → `{passed, lastAnswer}`, con `passed` booleano y `lastAnswer` null o un entero de 0 o más). Se omite con informe un `lastAnswer` igual o mayor que las opciones vigentes del checkpoint (`outside_options`).

**`systems`**: `version` (`1`) y `records` (`"<rust|go>:<id de taller>"` → registro):

| Clave del registro | Dominio | Se omite con informe |
| --- | --- | --- |
| `observed` | lista de claves de objetivo del taller, sin repetidos | — |
| `code` y `predicted` | booleanos | — |
| `answer` | null o un entero de 0 o más | igual o mayor que las opciones vigentes (`outside_options`) |
| `steps` | lista de enteros de 0 o más, sin repetidos: posiciones v1 | una posición sin etapa con ese `v1_position` (`unknown_step_position`, FR-032) |
| `note` | texto de hasta 10.000 | — (un `''` no se escribe, R29) |

**Los textos** cuentan caracteres Unicode, así que nunca rechazan lo que el v1 aceptaba (D1a, [http.md](./http.md), sección 3.2). Con esos topes, cada texto cabe en su columna. Todo texto de `normalized` que trae U+FFFD se informa en `replaced` (`replacement_character`, R26); también `raw`, si lo trae.

### 3.4 La respuesta

`201` si se aplicó, o `200` si ya estaba aplicada (sección 3.6). El cuerpo es el mismo en los dos casos:

```json
{
  "importId": "6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f",
  "epoch": 1,
  "revision": 7,
  "importedAt": "2026-10-06T12:00:00.123Z",
  "report": {
    "written": {"exercises": 11, "drafts": 11, "attempts": 11, "campaignSeals": 9, "campaignCheckpoints": 1, "workshops": 1,
                "workshopObjectives": 3, "workshopSteps": 1, "routeMarks": 4, "routeQuiz": 1, "routeNotes": 1, "preferences": 1},
    "omitted": [{"path": "lab.records.rust-02.reviewAt", "reason": "date_out_of_range"}],
    "replaced": [],
    "conflicts": [{"path": "lab.records.rust-06.reflection", "reason": "newer_value_kept"}]
  }
}
```

- **Los campos.** `importId`, `epoch`, `revision` e `importedAt` son los de la importación que aplicó esos datos: en un 200, los de la original. `revision` es la de la cuenta al terminar, y no sube si nada de estado cambió (FR-010).
- **Sin delta.** La respuesta no trae `changes`: el cliente se pone al día con `POST /api/sync` o `GET /api/progress`, con lo que conoce.

### 3.5 El informe

- **`written`** tiene siempre las doce áreas de `WrittenRows::AREAS` ([data-model-d1b.md](../data-model-d1b.md), sección 6). Cuenta las filas que la importación insertó o cambió, y en `attempts`, los intentos legados que insertó. Una importación que no cambia nada responde 201 con todo en 0.
- **`omitted`**: lo que el v1 trae y no se guardó, con los motivos de la sección 8.
- **`replaced`**: los textos con U+FFFD.
- **`conflicts`**: lo que no se aplicó porque la cuenta ya tenía un valor con reloj real (`newer_value_kept`) o una ejecución del servidor como último intento (`server_attempt_kept`). Los logros se combinan igual, y el resultado queda como intento legado.

### 3.6 Idempotencia y confirmación

- **Lo repetido.** Devuelven 200 con el informe guardado, sin cambiar nada (FR-028):
  - la misma `importId`, con el mismo crudo y en la época vigente;
  - el mismo crudo (por su sha256) de la cuenta en la época vigente, con otra `importId`.
- **Una `importId` mal reusada** da 422 con `errors.importId` **(propuesta del plan, R31)**: si ya se usó con otro crudo, o en una época anterior.
- **El mismo crudo después de un «Borrar todo»** no cuenta como repetido. Se aplica de nuevo, con confirmación.
- **La confirmación.** Responde 409 `import_needs_confirmation` sin `confirm`, y sin decir cuál de los motivos (FR-029):
  - la cuenta ya importó otro crudo, de cualquier época;
  - la cuenta hizo alguna vez «Borrar todo» (`resetAt` no es null);
  - otra cuenta importó el mismo crudo.

  El cliente vuelve a preguntar y reenvía con `confirm: true` y la misma `importId`.
- **La atomicidad.** La importación se confirma entera o no deja nada (FR-034). Ante un 500 el cliente la reenvía igual, con la misma `importId`.

### 3.7 Límites

| Qué | Límite | Respuesta |
| --- | --- | --- |
| Cuerpo | 24 MiB: Nginx y `post_max_size` | 413 |
| Crudo | 10 MiB en bytes UTF-8 | 422, `errors.raw` |
| Ritmo | 3 por hora y cuenta. Cuenta todo pedido que pasa la sesión, también un 409 o un 200 | 429 `too_many_requests` con `Retry-After` |

## 4. `POST /api/progress/reset`

### 4.1 El sobre

| Campo | Tipo | Regla |
| --- | --- | --- |
| `format` | entero | Obligatorio: el vigente es `2` (FR-058) |
| `epoch` | entero | Obligatorio, 1 o más: la época que el cliente conoce |

### 4.2 Qué hace

En una transacción y bajo el candado de la cuenta (FR-041):

1. compara la época;
2. sube la época y la revisión en uno;
3. fija `resetAt` y la última actividad;
4. borra todas las filas de estado de la cuenta: las seis áreas, con las preferencias y los sellos de campaña.

Responde `200 {"epoch": 2, "revision": 43}`. Después del COMMIT cancela las ejecuciones activas de la cuenta, cada una en su propio cierre, y si una cancelación falla se registra y la respuesta no cambia.

**No borra** los intentos, sus pruebas y sus payloads, ni las importaciones (FR-042): son historia, hasta su retención. Tampoco toca la cuenta ni la sesión (FR-045).

**Desde ese momento:**

- toda sincronización o importación con la época anterior recibe 409 `epoch_mismatch` con `{epoch, revision}` y no escribe (FR-043);
- la foto de la época nueva está vacía;
- toda importación pide confirmación (FR-045).

**Sin conexión no está disponible**, porque la contraseña se confirma en el servidor.

### 4.3 Límites

3 por día y cuenta (429 con `Retry-After`). Un 423 no gasta uno.

## 5. Lo que cambia en la foto de D1a

D1b completa dos filas del contrato de D1a ([http.md](./http.md), sección 5). Valen para `GET /api/progress`, para el `changes` de la sincronización y para la exportación del titular.

| Área | Antes (D1a) | Con D1b |
| --- | --- | --- |
| `campaign.seals` | `[]` | `{exerciseId, code, prediction, assisted, revision}` por cada sello importado, ordenados por `exerciseId`. El delta trae los que cambió una importación (R40) |
| `exercises[].review` | `{confidence, reviewedAt, reviewDueAt, at} \| null`, null si `confidence` es null | Es null sólo si las tres fechas y la confianza son null. Un grupo legado (`at: null`) puede traer `confidence: null` con `reviewDueAt`, como lo dejó el v1 (R41) |

Lo importado tiene reloj nulo (`at: null`), como ya prevé D1a. `exercises[].lastAttempt.legacy` y `proof.state: "legacy"` muestran un intento legado.

## 6. Errores

Los códigos de C3a y de D1a quedan como están ([http.md](./http.md), sección 6). D1b suma uno:

| HTTP | `code` | Mensaje (`lang/es/api.php`) | Cuándo |
| --- | --- | --- | --- |
| 409 | `import_needs_confirmation` | Confirmá que esta copia es tuya antes de combinarla con el progreso de tu cuenta. | La confirmación de la sección 3.6, sin `confirm` |

Además usa:

- 409 `epoch_mismatch` (con `epoch` y `revision`) y 409 `client_outdated`, de D1a;
- 503 `content_not_imported`, de C2;
- 423 `password_confirmation_required`, 422 `validation_failed` y 429 `too_many_requests`, de C3a.

Los mensajes de los errores 422 de `normalized` salen de `lang/es/import.php` y no repiten el valor que se recibió.

## 7. Lo que el cliente tiene que hacer

Es para D1c, y para F8 en lo que muestra. D1b lo fija y no lo implementa:

1. **El crudo y el normalizado.** Arma el crudo como dice la sección 3.2, y el normalizado con los parsers de la sección 3.3 sobre el mismo texto. Reemplaza los sustitutos sueltos con `toWellFormed()` en el crudo y en cada texto.
2. **Preguntar antes de enviar.** Muestra el resumen y pregunta «¿Este progreso es tuyo?» antes del primer envío (FR-073). Ante un 409 `import_needs_confirmation`, vuelve a preguntar y reenvía con `confirm: true` y la misma `importId`.
3. **Reintentar.** Un pedido sin respuesta o con 500 se reintenta con la misma `importId`, y un 200 es tan válido como un 201.
4. **Archivar.** Después de un 201 o un 200, archiva las claves v1 y sus respaldos en `taller-v1-importado:<id de la cuenta>` (FR-072).
5. **La época cambió.** Ante un 409 `epoch_mismatch`, carga la época nueva, vuelve a preguntar y usa otra `importId`, porque la anterior ya no sirve (R31).
6. **Los demás errores.** Ante un 422 con `errors.importId`, es un error del cliente. Ante un 429, espera `Retry-After`. Ante 401, 403, 409 `account_mismatch` o 419, sigue lo que dice C3a.
7. **El informe.** Lo muestra: lo escrito, lo omitido, lo reemplazado y los conflictos.
8. **«Borrar todo».** Pide la contraseña (ante un 423, la vuelve a confirmar), manda `epoch` y `format`, y con el 200 limpia el espacio de la cuenta y carga la foto vacía. No toca las claves v1 que la cuenta no importó (FR-074).
9. **El grupo de repaso.** Acepta un grupo legado incompleto (sección 5).

## 8. Valores del cable

| Campo | Valores |
| --- | --- |
| `source` | `storage`, `export` |
| claves de `report.written` | `exercises`, `drafts`, `attempts`, `campaignSeals`, `campaignCheckpoints`, `workshops`, `workshopObjectives`, `workshopSteps`, `routeMarks`, `routeQuiz`, `routeNotes`, `preferences` |
| `reason` en `omitted` | `not_an_integer`, `date_out_of_range`, `outside_options`, `beyond_active_hints`, `unknown_step_position`, `contradicts_transport_error` |
| `reason` en `replaced` | `replacement_character` |
| `reason` en `conflicts` | `newer_value_kept`, `server_attempt_kept` |
