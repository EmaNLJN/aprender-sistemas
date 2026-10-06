# Research: D1b · Importación y «Borrar todo»

**Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan-d1b.md](./plan-d1b.md)

Sigue la numeración de [research.md](./research.md), que es la de D1a (R1 a R22): las decisiones de D1b van de R23 a R44, y cuando una cita «R4» o «R20» se refiere a la de D1a. Cada decisión dice qué se eligió, por qué, qué se descartó y cómo se verificó. Las que completan algo que la spec o el ADR 0006 dejan abierto llevan la marca **(propuesta del plan)** y están resumidas en [plan-d1b.md](./plan-d1b.md), «Propuestas del plan». Lo que corrió al planificar está en R44.

## R23. Un plan por parte, en la misma carpeta

- **Decisión.** Los documentos de D1b llevan el sufijo `-d1b`: `plan-d1b.md`, `research-d1b.md`, `data-model-d1b.md`, `contracts/http-d1b.md`, `contracts/import-fixture.md`, `quickstart-d1b.md` y `tasks-d1b.md`. Los de D1a quedan como están.
- **Por qué.** D1 es una sola spec, con un plan y sus tareas por parte (clarify del 2026-10-06). Los scripts de Spec Kit (`setup-plan.sh`, `setup-tasks.sh` y `check-prerequisites.sh`) buscan nombres fijos (`plan.md`, `tasks.md`, `research.md`…) en la carpeta de la feature, y D1a ya los usa: correrlos apuntaría a los documentos de D1a. Además, sin `.specify/feature.json` fallan, y con `SPECIFY_FEATURE_DIRECTORY` escriben ese archivo y ensucian el árbol.
- **Cómo se siguieron las skills, sin los scripts.** De `speckit-plan`: el contexto técnico, el Constitution Check, la fase 0 (este archivo) y la fase 1 (`data-model-d1b.md`, los contratos y `quickstart-d1b.md`). De `speckit-tasks`: la plantilla del proyecto, con una línea por tarea. `speckit-analyze` se hizo a mano sobre `spec.md`, `plan-d1b.md` y `tasks-d1b.md`. `.specify/extensions.yml` no registra hooks (`hooks: {}`).
- **Descartado.** Una subcarpeta por parte (`007-…/d1b/`), que separa el plan de su spec; y renombrar los archivos de D1a, que rompería los enlaces del plan, de la hoja de ruta y del código (las migraciones de D1a citan `data-model.md` en su encabezado).

## R24. Qué es `normalized`: lo que dan los parsers de carga de cada almacén

- **Decisión.** `normalized` trae las secciones `route`, `lab`, `campaign` y `systems`, cada una opcional. Cada sección es el `state` que devuelve el parser de carga de su almacén v1 aplicado al JSON de esa sección:

  | Sección | Clave v1 | Parser de carga hoy | El mismo, extraído por F2 (unidad 1) |
  | --- | --- | --- | --- |
  | `route` | `taller-learning-v1` | `parseProgress` en `frontend/app.js` | `parseRouteProgress` en `frontend/src/entities/guide` |
  | `lab` | `taller-laboratorio-v1` | `parseSaved` en `frontend/lab.js` | `parseSavedLab` en `frontend/src/entities/exercise` |
  | `campaign` | `taller-campaign-v1` | `parseSavedCampaignState` en `frontend/src/entities/campaign/model/progress.ts` | el mismo |
  | `systems` | `taller-systems-v1` | `parseSavedSystemsState` en `frontend/src/entities/systems-workshop/model/progress.ts` | el mismo |

  Con `source: export`, cada sección del archivo pasa por el mismo parser, como si estuviera guardada. La sección del recorrido es el primer nivel del archivo sin `lab`, `campaign`, `systems` ni `exportedAt` (FR-038).
- **Por qué los de carga y no los de importación.** Dan el estado con que trabaja el navegador, y D1c se monta sobre los almacenes de F2, que cargan con ellos (FR-061). Los de importación del v1 dan lo mismo con datos válidos, pero el que expone cada adaptador (`planImport`) mezcla con el estado local. Con un estado vacío, `mergeRecord` reemplaza un texto en blanco por `undefined`, y un `''` explícito se pierde. `mergeRouteProgress` toma `language` y `minutes` del estado local, no del archivo. Y una exportación de la app recién arrancada puede traer sellos derivados (`applyLabEvidence`) si alguna vista sincronizó.
- **El crudo.** Con `source: storage`, el crudo es el texto JSON compacto de un objeto con las claves v1 que existan, en el orden de la tabla, cada una con su valor guardado tal cual. Así, el mismo navegador da siempre los mismos bytes y el mismo sha256. Con `source: export`, es el texto del archivo. El servidor no lo interpreta (FR-024).
- **Descartado.** Normalizar en el servidor, que FR-025 prohíbe. Mandar sólo las claves crudas y que el servidor las interprete, por lo mismo.

## R25. Qué es un 422 y qué se omite con informe

- **Decisión.** Un 422 `validation_failed` responde a todo lo que los parsers de R24 no pueden producir: la copia no salió de ellos.
  - un campo desconocido o un tipo equivocado;
  - un texto por encima de su tope v1 (el parser recorta, así que uno más largo no sale de él);
  - un número fuera del dominio del parser: pistas por encima de 3, minutos que no son 15, 25 ni 45, o contadores negativos o por encima de 2^53 − 1;
  - un id que el contenido no tiene, o una lista con repetidos;
  - una sección sin `version: 1`, o un `normalized` sin ninguna sección.

  Lo que esos parsers sí pueden producir y el servidor no puede guardar tal cual se omite y se informa con su ruta, sin 422 (FR-033 y US1.6):
  - un número finito no entero donde la columna es entera (`hints`, `attempts`);
  - un instante en milisegundos no entero o fuera de `DATETIME(3)` (`solvedAt`, `reviewAt`, `reviewedAt`). Si es `result.time`, queda afuera el resultado entero, porque un intento necesita su fecha;
  - lo que depende del contenido y puede cambiar entre que el cliente cargó y que importa: una respuesta fuera de las opciones vigentes (predicción, checkpoint, taller o quiz), pistas por encima de las activas del ejercicio, o una posición de etapa sin `v1_position` (FR-032);
  - `success` y `transportError` los dos en verdadero. Un intento tiene un solo resultado: queda `legacy_error` y se informa `result.success`.
- **Por qué.** Un 422 descarta la copia entera por un dato; omitirlo con su ruta conserva el resto (US1.6). La regla es mecánica: el dominio de cada parser está en su código, y el de cada columna, en `data-model-d1b.md`. Los ids no cambian según de qué lado se miren, porque el contenido nunca borra, sólo retira: el cliente no puede conocer un id que el servidor no tenga.
- **Descartado.** Recortar o redondear, que cambia el dato sin decirlo. Responder 422 a todo, que pierde la copia por una fecha.

## R26. Los sustitutos sueltos: los reemplaza el cliente y los informa el servidor **(propuesta del plan)**

- **El problema.** Los recortes de v1 (`slice`) pueden partir un emoji y dejar un sustituto suelto. `JSON.stringify` lo escapa como `\udXXX` y `json_decode` de PHP rechaza ese cuerpo (`JSON_ERROR_UTF16`), así que Laravel lee un cuerpo vacío y el pedido entero sale 422. D1a lo anotó para la sincronización ([http.md](./contracts/http.md), sección 7). El servidor no puede pasar a U+FFFD algo que nunca recibe.
- **Decisión.** Antes de enviar, el cliente reemplaza cada sustituto suelto por U+FFFD con `String.prototype.toWellFormed()`, en `raw` y en cada texto de `normalized`. El servidor informa en `replaced`, con su ruta y el motivo `replacement_character`, cada texto de `normalized` que trae U+FFFD, y también `raw` si lo trae.
- **Por qué.** Es lo único que llega intacto a PHP, y el informe sigue nombrando la ruta (US1.6). U+FFFD es, por definición, un carácter que no se pudo conservar; uno que ya estaba en el texto también lo es, así que el aviso es cierto en los dos casos.
- **Descartado.** Que el servidor reemplace los escapes en el texto del cuerpo antes de decodificarlo: hace falta una expresión regular que respete las barras escapadas y un centinela para recuperar las rutas, y eso es ingenioso y frágil. Un campo `replaced` en el sobre, declarado por el cliente: suma contrato y obliga al servidor a confiar en él.
- **Verificado al planificar.** Las tres fixtures no tienen sustitutos sueltos ni U+FFFD (R44).

## R27. La escritura reusa el SQL de D1a y no `OperationProcessor::apply`

- **Decisión.** Lo que la importación escribe en las columnas de los 25 tipos de campo sale de `UpsertSql::row` de D1a (verificado en `feat/d1a-sincronizacion`, a14f6f2), con un `FieldWrite` por tipo y el reloj nulo. Se ejecuta con `DB::affectingStatement`, y el cambio se lee de las filas afectadas (D1a R4, comprobado por `AffectedRowsTest`). No pasa por `OperationProcessor::apply` ni por `Operation`.
- **Por qué.** `apply` exige una operación completa: `OperationWriter` lee todos sus campos y escribe todos sus tipos. Tres formas del v1 no se pueden expresar así:
  1. **Una bandera sin su respuesta**: `predictionCorrect` sin `prediction`, `predicted` con `answer: null` o `passed` con `lastAnswer: null`. `exercise.prediction`, `workshop.prediction` y `checkpoint.answer` escriben siempre la respuesta (`lww`), y con `answer: null` y el reloj nulo pisarían la respuesta de una importación anterior.
  2. **Un grupo de repaso incompleto**: `rust-06` de las fixtures trae `reviewAt` sin `confidence` ni `reviewedAt` (R41).
  3. **Un registro vacío**, que igual tiene que dejar su fila (FR-039: «una fila por registro v1 aunque esté vacío»).

  Una `Operation` exige además un UUID, un hash y un `at` que la importación no tiene. `UpsertSql` es el mismo SQL que el fixture de fusión prueba con el reloj nulo (los casos `empty-*`, D1a R3), así que la regla de fusión sigue escrita una sola vez.
- **Consecuencia.** R20 de D1a decía que D1b usaría el escritor (`apply`); D1b usa el SQL que hay debajo. Es un hallazgo para D1a, sin cambios en su código.
- **Descartado.** Ampliar `Operation` para que acepte valores nulos, que cambia el contrato de `/api/sync`. Escribir un SQL propio para los 25 tipos, que deja la regla en dos copias.

## R28. Las columnas que sólo escribe la importación **(propuesta del plan)**

La spec dice «se guarda como lo dejó v1» (tabla de familias) y que las importaciones se combinan (FR-027), pero no dice cómo se combinan estas columnas. Va una regla por columna, y todas son conmutativas e idempotentes:

| Columna | Regla | Por qué |
| --- | --- | --- |
| `campaign_seals.code`, `prediction` y `assisted` | OR; la fila se crea aunque las tres sean falsas | Es lo que hace el v1 al importar (`mergeSeals`), y son logros |
| `workshop_progress.code_sealed` | OR | Ídem (`mergeImportedRecords`) |
| `exercise_progress.legacy_attempts` | El mayor | Es un contador por navegador: sumar duplicaría al reimportar otra copia del mismo navegador |
| `exercise_progress.solved_at` | La fecha más temprana (`LEAST` con `COALESCE`) | La regla de B2 (`ProgressMerge`) y la del v1 (`mergeRecord`) |
| `proof_*` y `last_*` | Sólo si están vacíos | D24 y FR-026 |
| `legacy_position` | La primera que llega | Conserva el orden de la primera copia. Una marca de v2 no lo tiene |

En los tipos con reloj, dos importaciones se combinan con la regla de D1a: un reloj nulo le gana a otro nulo, así que en un campo de «gana la última escritura» gana la última importación.

## R29. Los textos vacíos que el v1 guarda por omisión no se escriben

- **Decisión.** Las notas del recorrido y la nota del taller con `''` no se escriben, y la proyección las devuelve como `''`, su valor por omisión. Los textos del laboratorio (`draft`, `reflection` y `customTest`) se escriben siempre que estén, también vacíos.
- **Por qué.** El v1 guarda siempre las cuatro notas del recorrido y la nota de cada taller, con `''` si el alumno no escribió nada (los valores por omisión de `app.js` y de `emptyRecord`). Con la regla del reloj nulo, la segunda importación, la de un navegador que nunca escribió notas, borraría las de la primera. Un texto del laboratorio, en cambio, sólo está si el alumno lo escribió: ahí `''` es un borrado explícito y es un valor (D1a R12).
- **Sólo el `''` exacto.** Un texto de puros espacios sí se escribe: `isLosslessNormalization` compara exacto, y no escribirlo lo perdería.
- **Descartado.** Copiar la regla del v1 al importar (`isBlankText`), que trata los espacios como vacío y perdería en la proyección un texto de sólo espacios.

## R30. Los intentos legados

- **Decisión.** Por cada `result` válido:
  1. **Se busca un intento que ya lo represente**, en este orden y en cualquier época, porque los intentos son historia:
     - el `attemptId` del resultado (A4, R42), si es un intento de la cuenta y del ejercicio;
     - un intento no legado de la cuenta y del ejercicio con el mismo `code_sha256` y un `attempted_at` a ±10 minutos de `result.time`;
     - un intento legado con el mismo ejercicio, el mismo `attempted_at` y el mismo `code_sha256` (FR-031).
  2. **Si no hay ninguno, se inserta uno**:
     - `legacy` en 1, con la época vigente;
     - `outcome`: `passed` si `success`, `legacy_error` si `transportError`, y si no, `failed`;
     - `grading_hash` NULL y `code_sha256` con el sha256 del código;
     - `custom_outcome` en `pass` si `customPassed`; si no, NULL;
     - `attempted_at` y `finished_at` con `result.time`, y `created_at` con el instante de la importación;
     - sus pruebas en `attempt_tests`, en el orden del v1, con `position` desde 1 como en B2 y `pass` o `fail`;
     - su payload (código, prueba propia y salidas), con `created_at` igual al instante de la importación.
  3. **Los punteros de `exercise_progress`** se escriben sólo si están vacíos y con la fecha del intento: `proof_at` y `last_attempt_at` son su `attempted_at`, como exige `POINTER_DATES` de `RunInvariants`. `last` apunta al intento, y `proof` también si salió `passed`.
- **Por qué el payload lleva la fecha de la importación.** La poda de B2 borra los payloads de más de 90 días que no son puntero (`RunPruner`, verificado en el código). Con `result.time`, el código de un resultado viejo que no queda como puntero se iría en la primera corrida. La retención cuenta desde que el servidor tiene el dato.
- **Las pruebas se validan antes de abrir la transacción** (R25): la clave foránea de `attempt_tests` no puede fallar adentro.
- **Verificado al planificar.** Los 11 ejercicios con resultado de las fixtures tienen en el contenido 3 pruebas cada uno (`t1` a `t3`), 3 pistas y 3 opciones de predicción (R44).

## R31. Idempotencia, confirmación y carreras

- **El orden, bajo el candado de la cuenta.**
  1. La misma `importId` de la cuenta. Con el mismo crudo y en la época vigente, 200 con el informe guardado. Con otro crudo, o en una época anterior, 422 con `errors.importId`.
  2. El mismo crudo de la cuenta en la época vigente, con otra `importId`: 200 con el informe de esa importación.
  3. La confirmación: 409 `import_needs_confirmation` si falta `confirm`.
  4. Si no, se aplica y responde 201.
- **Una `importId` repetida con otro contenido es un error del cliente.** B2 tiene el mismo caso (`client_run_id_reused`, 422). Acá alcanza `validation_failed` con `errors.importId`, sin un código nuevo **(propuesta del plan)**. La UK `(user_id, import_id)` del ADR queda como está, y por eso una `importId` no puede volver a usarse después de un «Borrar todo»: D1c genera una por cada importación que confirma y la conserva sólo para reintentar.
- **La confirmación** (FR-029) se pide en tres casos:
  - `reset_at` no es nulo;
  - la cuenta tiene otra fila con otro `raw_sha256`, de cualquier época;
  - otra cuenta tiene el mismo `raw_sha256`.

  Son tres consultas por índice: la UK y `(raw_sha256, user_id)`.
- **Una carrera que se acepta.** Si dos cuentas importan el mismo crudo a la vez, pueden no verse, porque cada una toma su propio candado. El caso que la regla protege (A importó ayer en el aula y hoy entra B) no es simultáneo.

## R32. El orden de evaluación de un pedido **(propuesta del plan; refina FR-030)**

1. **Nginx**: 413 a partir de 24 MiB, y el ritmo por IP.
2. **El acceso**: sesión, CSRF, cuenta activa, cuenta esperada y email verificado (401, 419, 403, 409 y 403).
3. **El límite**: 3 por hora (429).
4. **El sobre**: `format`, `epoch`, `importId`, `source`, `raw` (hasta 10 MiB), `confirm`, y que `normalized` sea un objeto (422).
5. **El formato**: `format` vigente o anterior (409 `client_outdated`).
6. **El contenido**: tiene que haber uno importado (503 `content_not_imported`).
7. **La época**, leída sin candado ni escritura (409 `epoch_mismatch` con `{epoch, revision}`).
8. **La forma de `normalized`**, contra el contenido (422).
9. **Bajo el candado**: la época otra vez (409), lo repetido (200 o 422), la confirmación (409) y la aplicación (201).

- **Por qué así.** FR-030 pone la época antes que la forma. Para compararla hay que poder leer el sobre, y para comprobar las referencias hace falta contenido (503). La época se mira dos veces: antes de decodificar hasta 10 MiB, para que una pestaña vieja reciba 409 y no 422, y bajo el candado, por si hubo un «Borrar todo» entre medio.
- **El precedente.** D1a sigue el mismo orden en la sincronización ([http.md](./contracts/http.md), sección 2), salvo que su sobre trae las operaciones en lugar de un normalizado.

## R33. El informe

- **La forma.** `{written, omitted, replaced, conflicts}`:
  - `written` cuenta, por área, las filas que la importación insertó o cambió (las filas afectadas, como el `changed` de D1a) y los intentos legados que insertó;
  - `omitted`, `replaced` y `conflicts` son listas de `{path, reason}`, con las rutas del v1: `lab.records.rust-02.reviewAt`, `systems.records.rust:pc.steps[3]` o `route.completed[0]`.
- **`conflicts`.** Es lo que la importación no aplicó porque la cuenta ya tenía algo más nuevo:
  - un valor con reloj real (`newer_value_kept`);
  - una ejecución del servidor como último intento (`server_attempt_kept`).

  Se calcula con la foto de la cuenta, leída bajo el candado antes de escribir con `ChangesReader::areas(userId, null)`, el lector de D1a, comparando campo por campo. La importación igual escribe lo que se combina (los logros) y deja el intento legado como historia.
- **Se guarda y se devuelve igual.** El informe va como JSON en `progress_imports.report`, junto con la época y la revisión, y un reintento devuelve el guardado (FR-034).
- **La revisión sube a lo sumo una vez.** FR-034 dice que la importación «sube la revisión una vez», y FR-010, que una transacción que no cambia nada no la sube. Manda FR-010: una importación que no cambia ninguna fila de estado responde 201, con todo en 0, y deja la revisión donde estaba. Sin eso, una copia ya importada movería el validador de `GET /api/progress` sin ningún cambio.

## R34. «Borrar todo»

- **Qué hace.** Bajo el candado de la cuenta:
  1. compara la época del pedido;
  2. sube la época y la revisión en uno y fija `reset_at` y `last_activity_at` (`AccountLock::reset`, nuevo);
  3. borra las filas de la cuenta en cada tabla de `ProgressTables::STATE`, que suma `campaign_seals`, en orden inverso (las hijas antes);
  4. confirma.

  Después, fuera de la transacción, cancela las ejecuciones activas de la cuenta con `ActiveRuns::cancelAllOf` de B2, cada una en su propio cierre.
- **Qué no borra.**
  - los intentos, sus pruebas y sus payloads, ni `progress_imports` (FR-042);
  - `sync_operations`, porque no es estado: un UUID de la época anterior ya recibe `epoch_mismatch` antes de mirarse;
  - la cabecera, que se sube y no se borra;
  - la cuenta y la sesión (FR-045).
- **La cancelación es lo mejor posible.** Si falla, se registra y la respuesta igual es 200. Una ejecución que cierra después queda como historia, porque su época ya no es la vigente (FR-044; `RunCloser::advanceProgress` de B2, verificado en el código). `ActiveRuns` pasa hoy `account_disabled` fijo: D1b le agrega el motivo como parámetro, y el reset pasa null, lo mismo que una cancelación del alumno.
- **El orden del middleware** es `account`, `password.confirm` y `throttle:reset`, así que un 423 no gasta uno de los tres del día. No lleva `verified` (FR-040).

## R35. Los payloads después de «Borrar todo» **(propuesta del plan; cierra el punto que la spec dejó abierto entre B2 y D1)**

- **Qué entregó B2.** La poda reconoce la última prueba aprobada y el último intento por los punteros de `exercise_progress` (`RunPruner::payloadCandidates`, verificado en el código). El reset borra `exercise_progress`, así que los payloads de la época anterior pasan a podarse a los 90 días de su `created_at`, y los que ya son más viejos, en la siguiente corrida.
- **Decisión.** Se acepta. Es lo que dice Q2: «quedan hasta su retención». La regla de B2 conserva el código de lo que muestra el estado vigente, y después de un reset ese estado no muestra nada. Además, guarda menos código de un alumno que pidió empezar de cero.
- **Costo.** Restaurar con el export de antes del reset recupera los punteros (R30, por la deduplicación), pero el código de esos intentos puede ya no estar, y la proyección quedaría sin su `result.code`. Es un hallazgo para B2 (sin nada que cambiar) y para el aviso de privacidad (pregunta 14): el código sobrevive al reset hasta 90 días.
- **Descartado.** Que la poda de B2 reconozca los punteros de cualquier época: exige guardar la historia de los punteros, con una tabla o con columnas nuevas.

## R36. Límites y tamaños

- **Importación.** 3 por hora y cuenta (`Limit::perHour`). Cuenta cada pedido que pasa la sesión, también el 409 de confirmación y un 200 repetido: un segundo navegador con confirmación gasta dos de las tres.
- **Reset.** 3 por día y cuenta.
- **Cuerpo.**
  - Nginx: `location = /api/progress/import` con `client_max_body_size 24m`.
  - PHP: `post_max_size = 24M` en `backend/api/docker/php.ini`. Con el valor por omisión (8M), el `ValidatePostSize` de Laravel cortaría con 413 antes del controlador.
  - El crudo: hasta 10 MiB, contados en bytes UTF-8 (si pasa, 422).
- **Memoria.** `memory_limit` sigue en el valor de `php.ini-production`, 128M. Un cuerpo de 24 MiB ocupa la cadena (24 MB), el crudo y el normalizado decodificados (unos 20 MB) y lo que copien Laravel y PDO. Queda por medir (plan-d1b.md, «Lo que quedó sin verificar»).
- **El texto llega intacto.** `/api/progress/import` sale de `TrimStrings` y de `ConvertEmptyStringsToNull`, como `/api/sync`: el crudo es opaco, su sha256 depende de cada byte, y `''` es un valor.
- **Un riesgo anotado.** Con 3 por hora, crudos de hasta 10 MiB y 90 días de retención, una cuenta puede guardar hasta 6.480 crudos. Las cuentas se crean por invitación; si hace falta, un tope de bytes de crudo por cuenta es un cambio local (plan-d1b.md, Riesgos).

## R37. La poda del crudo

- **Decisión.** `progress:prune-import-payloads`, cada hora:
  - lee, sin candado y de a 5.000, los ids con `imported_at` de hace más de 90 días y `raw_payload` no nulo;
  - pone `raw_payload = NULL` por clave primaria;
  - para en el tope de lotes por corrida (`progress.batches`).

  Quedan `raw_sha256` y el informe, así que un crudo repetido se sigue detectando (US7.3).
- **Sin índice nuevo.** La tabla tiene unas pocas filas por cuenta. La lectura recorre la clave primaria y la escritura va por ella, que es lo que pide el ADR en §8 («toda escritura usa un índice selectivo»). Es el mismo esquema que la poda de payloads de B2.

## R38. El fixture de importación y el oráculo

- **Decisión.** `qa/fixtures/shared/import-cases.json`, con su huella `import-cases.sha256`, trae los tres casos de FR-038. Cada uno lleva el crudo que mandaría el cliente, el normalizado que dan los parsers de R24 y, escritas a mano, las filas que una cuenta nueva tiene que escribir por área.
  - **TypeScript lo verifica en `npm test`**: la huella; que el crudo sea el de `qa/fixtures`; que los parsers reales den ese normalizado; `isLosslessNormalization` del crudo al normalizado en las 12 secciones; y que los conteos salgan del normalizado.
  - **Pest lo lee** de `tests/Fixtures/shared/`, por la línea del Dockerfile de B2.

  Todo está en [import-fixture.md](./contracts/import-fixture.md).
- **La proyección v1 vive en `tests/Support`** (FR-039), junto con `isLosslessNormalization` portado a PHP (`LosslessNormalization`). Compara los números por valor, porque JSON no distingue `1` de `1.0`.
- **Depende de F2 (unidad 1).** El check importa `parseRouteProgress` y `parseSavedLab`, que hoy existen en la rama `f2a/u1-almacenes` (fbaaa40). Si F2 no está integrada cuando la tarea tiene que cerrar, el respaldo ejecuta los de `app.js` y `lab.js` en los contextos `vm` de `qa/lib/legacy-sources.ts`, y D1c pasa después el check a los de F2. Es lo único de D1b que toca el épico del front, y no está en su camino crítico: Pest lo necesita recién en la onda 3.
- **Descartado.**
  - Escribir el normalizado a mano: es largo y no lo produce ningún parser, que es justo lo que FR-039 quiere comparar.
  - Generarlo con la exportación de la app arrancada: puede traer sellos derivados (R24).
  - Que Pest corra Node: la imagen de pruebas no lo tiene.

## R39. C3b: el registro, la cuenta poblada y la sección `imports`

- **Las pruebas de C3b** (verificadas en `feat/c3b-administracion`, e57d3ba) fallan en cuanto existe una tabla con `user_id` sin declarar:
  - `UserDataCoverageTest` falla con cualquier tabla así;
  - `UserTablesTest` exige 20 filas y el orden de `batchTables()`;
  - `UserExportCoverageTest` exige que una tabla declarada con `imports` que existe tenga su sección registrada;
  - `PopulatedAccount` tiene que poblar cada tabla declarada.
- **Decisión.** Si C3b ya está en la base, la tarea que crea las dos tablas trae en el mismo commit:
  - sus filas en `UserTables`: `progress_imports` exporta `imports` y se borra por lotes por `id`; `campaign_seals` exporta `progress` y cae en la cascada final;
  - sus filas en `PopulatedAccount`;
  - `ImportsSection`, registrada en `UserExport`;
  - los esperados de esas pruebas, ajustados a propósito.

  Si no está, la declaración queda en [data-model-d1b.md](./data-model-d1b.md), sección 8, y C3b la toma al integrarse, como hizo con D1a. Sumar una sección no cambia el `format` de la exportación (contrato de C3b).
- **Por qué por lotes.** Cada fila puede traer un crudo de 10 MiB, y la cascada de la transacción final no debería borrar cientos de MB de una vez.

## R40. Los sellos en la foto

- **Decisión.** La foto pasa a leer `campaign_seals`. Cada fila sale como `{exerciseId, code, prediction, assisted, revision}`, ordenada por `exerciseId`, y el delta la trae por su `revision`, igual que las demás tablas. `importedAt` no se publica. D1a dejó el arreglo en `[]` hasta D1b (D1a R10 y R20).
- **Dónde.** `ProgressSnapshotReader::areas` (D1a, verificado en el código) suma una consulta con su ayudante `wire`, y `CampaignWire` suma `seal`.

## R41. El grupo de repaso incompleto: un hallazgo para D1a y para D1c

- **El dato.** En cada una de las tres fixtures, ocho de los once registros del laboratorio traen `reviewAt` sin `confidence` ni `reviewedAt`; sólo `rust-02` trae el grupo completo. El v1 pone la fecha de repaso al resolver, y `confidence` con `reviewedAt` recién cuando el alumno califica.
- **El choque con D1a.** Tal como está en el código:
  - `ProgressInvariants::REVIEW_GROUP` exige que `confidence`, `reviewed_at` y `review_due_at` sean todos nulos o todos no nulos;
  - `ExerciseWire` publica `review: null` cuando `confidence` es nulo.

  Una importación sin pérdida (SC-001) deja el grupo incompleto con el reloj nulo, y la foto lo escondería.
- **Decisión.**
  - `REVIEW_GROUP` exige el grupo completo sólo cuando `review_set_at` no es nulo: un grupo legado se guarda como lo dejó el v1;
  - `review` es null sólo si las tres columnas son nulas, y `confidence` puede venir null adentro del objeto;
  - una escritura de `/api/sync` reemplaza el grupo entero (`lww-group`) y lo completa.

  D1b lo pone en sus tareas (T004 y T016). Conviene avisarle a D1a antes de que cierre T019, porque cambia una línea de su contrato ([http.md](./contracts/http.md), sección 5).
- **Para D1c.** El cliente tiene que aceptar un grupo de repaso legado incompleto.

## R42. Lo que D1b le deja a D1c y a A4

- **D1c.**
  - el crudo canónico de `storage` (R24);
  - el normalizado con los parsers de carga (R24);
  - `toWellFormed()` en cada texto (R26);
  - una `importId` por importación confirmada, que se conserva sólo para reintentar (R31);
  - preguntar antes de enviar, y otra vez ante el 409;
  - archivar las claves v1 después de un 201 o un 200 (FR-072);
  - ante un 409 `epoch_mismatch`, cargar la época nueva, volver a preguntar y usar otra `importId`;
  - el grupo de repaso incompleto (R41);
  - el 423 del reset;
  - el check del fixture con sus propios parsers (R38).
- **A4.** El resultado v1 suma `attemptId`, el id del intento del servidor, como entero positivo. D1b ya lo acepta y lo usa para no duplicar el intento (R30). A4 tiene que conservarlo en `sanitizeResult` con ese nombre. Un `attemptId` que no es de la cuenta y del ejercicio se ignora, y el resultado sigue las otras dos reglas: no es un dato del progreso, así que no se pierde nada ni hay qué informar.

## R43. Los registros

- **Qué registran.** La importación deja `progress.import.applied` o `progress.import.repeated` con la cuenta, la `importId`, el `source`, la época, la revisión, los conteos por área, la cantidad de omisiones y de conflictos, la duración y la memoria pico (`memory_get_peak_usage(true)`, la medición de R36). El reset deja `progress.reset` con la cuenta, la época, la revisión, las filas borradas por tabla y las ejecuciones canceladas.
- **Nunca el crudo, un texto ni un valor** (FR-057). Una `QueryException` de la importación trae el crudo y los textos en sus bindings: el servicio la convierte en `ImportWriteFailed` afuera de `within`, sin SQL ni `previous`, como `SyncWriteFailed` de D1a. Un `ValidationException` sólo lleva rutas y mensajes fijos.

## R44. Cómo se verificó al planificar

**Corrió** sobre el repositorio, sin PHP, Composer, MySQL ni Docker, y sin descargas:

- **Las tres fixtures, con Node.**
  - los tamaños del crudo: 13.633, 17.241 y 26.505 bytes;
  - el comienzo de cada sha256: `421632476b2ab2a4`, `33083f827194c05f` y `f32b364177ac549b`;
  - las filas por área de una cuenta nueva: la tabla de [import-fixture.md](./contracts/import-fixture.md), sección 7;
  - que no hay sustitutos sueltos, U+FFFD ni números no enteros, y que cada `result.time` cabe en `DATETIME(3)`;
  - que ocho registros de cada fixture traen `reviewAt` sin `confidence` ni `reviewedAt` (R41);
  - que `rust-08` trae `tests: []` en el crudo de 2a278ad, y que el parser lo completa con las tres pruebas del ejercicio.
- **El contenido de `master` (2426bae, `build/curriculum.json`).** Los 11 ejercicios con resultado tienen 3 pruebas, 3 pistas y 3 opciones de predicción.

**Se leyó y no corrió** el código de las ramas:

- `feat/b2-ejecuciones` (4ffe29a): `AccountLock`, `ActiveRuns`, `RunCanceller`, `RunCloser`, `ProgressWriter`, `RunPruner`, las migraciones de B2, `RunInvariants`, `RunWorld`, la línea del Dockerfile y `php.ini`;
- `feat/d1a-sincronizacion` (a14f6f2, D1a con T002 a T014 y T017 integradas): `UpsertSql`, `FieldKinds`, `OperationWriter`, `ProgressSnapshotReader`, los `*Wire`, `ProgressInvariants`, `ProgressWorld`, `ProgressLimiters`, `EpochMismatch`, `ClientOutdated`, `SyncWriteFailed` y `config/progress.php`;
- `feat/c3b-administracion` (e57d3ba): `UserTables`, `UserData`, `UserExport`, sus secciones y `PopulatedAccount`;
- `f2a/u1-almacenes` (fbaaa40): `parseRouteProgress` y `parseSavedLab`;
- los parsers v1 de `master`.

**No corrió** nada del PHP, del SQL ni de Nginx de este plan: es referencia. Lo pendiente está en [plan-d1b.md](./plan-d1b.md), «Lo que quedó sin verificar».
