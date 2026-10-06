# Reglas de fusión y fixture compartido de D1a

**Input**: [spec.md](../spec.md) (FR-001 a FR-011 y FR-080 a FR-084), ADR 0004 §3 y §4, ADR 0006 D09, D22, D23 y D39 ([ADR 0006](../../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)) y [research.md](../research.md). Lo leen el check de TypeScript y las pruebas Pest; las operaciones y los códigos de error están en [http.md](./http.md) y las tablas, en [data-model.md](../data-model.md).

Este documento es el contrato de la fusión. Los resultados esperados del fixture salen de **acá**, escritos a mano; nunca de la salida de un lenguaje (FR-080).

## 1. Qué fija

- Las reglas de fusión de cada campo del progreso, en un modelo neutro que no es SQL ni un almacén del navegador.
- Los 25 tipos de campo (`kind`) que el servidor fusiona y que el cliente fusiona igual al aplicar `changes`.
- La matriz de casos: una por tipo y situación, con su resultado y si cambia algo.
- Los casos del servidor (corrección de reloj, `stale_content` y rechazos), que sólo corre Pest.
- El formato de `qa/fixtures/shared/merge-cases.json`, cómo se congela y qué mutación de cada regla tiene que romperlo.

No fija cómo se escribe cada regla: en PHP son los `INSERT … ON DUPLICATE KEY UPDATE` de [data-model.md](../data-model.md), sección 4; en TypeScript, las funciones puras de [reference-merge.md](../reference-merge.md).

## 2. El modelo neutro

- Una **escritura** es `{value, at}`. `at` es un reloj (ISO 8601 en UTC con milisegundos y `Z`) o `null`: **sin reloj** (legado o importado).
- Un **estado** es lo que hay guardado de un campo, o nada (una fila que no existe).
- El **orden de llegada** es el orden en que las escrituras llegan a quien fusiona: el servidor al recibir un lote, o el cliente al aplicar `changes`.
- Los relojes del fixture ya son los **efectivos**, los que quedan después de la corrección del servidor (FR-002). La corrección de reloj es una familia aparte (sección 7).
- «Cambia» es un efecto sobre lo guardado: el valor o el reloj difieren de antes. Es lo que decide si la fila lleva la revisión nueva (FR-010). **Los textos se comparan byte a byte**: `Casa` y `casa`, `cafe` y `café`, `a` y `a ` son distintos. `''` es un valor, no `NULL`.

Forma del estado por regla (lo que llevan `stored`, `incoming` y `expect.state`):

| Regla | `stored` | cada escritura de `incoming` | `expect.state` |
| --- | --- | --- | --- |
| `lww`, `lww-group`, `tombstone` | `{value, at}` o `null` | `{value, at}` | `{value, at}` |
| `flag-or` | `{value: bool}` o `null` | `{value: bool}` | `{value: bool}` |
| `max` | `{value: int}` o `null` | `{value: int}` | `{value: int}` |
| `dated-flag` | `{value: bool, at}` o `null` | `{value: bool, at}` | `{value: bool, at}` |
| `observed` | `{observed: [{key, at}]}` o `null` | `{key, at}` | `{observed: [{key, at}]}` ordenado por `key` |

`incoming` es siempre una lista: se aplica en orden, y `expect.changed` lleva un booleano por escritura.

## 3. Las reglas

| Regla | Qué fusiona | La escritura entrante gana si… | Resultado |
| --- | --- | --- | --- |
| `lww` | un campo con un reloj propio | no hay estado, o el guardado no tiene reloj, o su reloj no es más viejo que el guardado (`incoming.at >= stored.at`, con `incoming.at` no nulo) | el valor y el reloj de la entrante; si no gana, el guardado |
| `lww-group` | varios campos que comparten un reloj | igual que `lww` | todos los campos del grupo de la entrante, o todos los del guardado: nunca una mezcla |
| `tombstone` | una marca que se puede desmarcar | igual que `lww` | `value` es `true` (marcada) o `false` (lápida); la fila no se borra |
| `flag-or` | una bandera que sólo crece | siempre suma: `stored OR incoming` | `true` si alguna lo era |
| `max` | un contador que sólo crece | `incoming > stored` | el mayor |
| `dated-flag` | una bandera con su fecha | la entrante es `true`: la bandera pasa a `true` y la fecha es la **más temprana conocida** | `{true, fecha}`; una entrante `false` no aporta nada |
| `observed` | un conjunto de claves con su fecha | siempre suma la clave; si ya estaba, queda la fecha más temprana conocida | el conjunto |

Reglas que el fixture fija y que el ADR no dice con estas palabras:

1. **Empate.** Con relojes iguales gana la escritura que llega después, y su valor puede ser el mismo o no (D09). Si valor y reloj son iguales a lo guardado, no cambia nada.
2. **Sin reloj, en la familia con reloj.** Un guardado sin reloj pierde contra cualquier escritura; una entrante sin reloj sólo gana contra un guardado sin reloj o sin estado (D09: «frente a un reloj NULL legado gana el valor con reloj»; D22: «en lo importado, NULL significa anterior a todo»). Las escrituras de `/api/sync` siempre traen reloj; las entrantes sin reloj son las de la importación (D1b), y el escritor es el mismo.
3. **Sin fecha, en las familias que sólo crecen.** Una fecha ausente es **desconocida**, no «anterior a todo»: la primera fecha conocida la completa, y la más temprana de las conocidas gana (ADR 0004 §3: los `LEAST` y `GREATEST` se protegen con `COALESCE`). Es una elección de este plan sobre algo que la spec deja en «fecha más temprana»: ver [research.md](../research.md), R6.
4. **Una lápida es una escritura más.** Desmarcar escribe `{false, at}`; una marca más vieja que esa lápida no la resucita, y una más nueva sí.
5. **Una bandera nunca baja.** Una entrante `false` en `flag-or` y en `dated-flag` no cambia nada.

## 4. Los 25 tipos de campo

El `kind` es el identificador que comparten el fixture, el registro del servidor (`FieldKinds`) y el del cliente (`field-kinds.ts`). Cada columna sale del [ADR 0006 §5.3](../../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md); el adaptador de las pruebas Pest las escribe aparte, desde esta tabla y no desde el código del servidor, para que un error de columna no se repita en los dos lados.

| `kind` | Regla | Operación (`type`) | Tabla | Valor (columnas) | Reloj o fecha | Clave del registro |
| --- | --- | --- | --- | --- | --- | --- |
| `exercise.prediction.answer` | `lww` | `exercise.prediction` | `exercise_progress` | `prediction_answer` | `prediction_answer_set_at` | `(user_id, exercise_id)` |
| `exercise.reflection` | `lww` | `exercise.reflection` | `exercise_progress` | `reflection` | `reflection_set_at` | ídem |
| `exercise.customTest` | `lww` | `exercise.customTest` | `exercise_progress` | `custom_test` | `custom_test_set_at` | ídem |
| `checkpoint.lastAnswer` | `lww` | `checkpoint.answer` | `campaign_checkpoints` | `last_answer` | `last_answer_set_at` | `(user_id, world_id)` |
| `workshop.answer` | `lww` | `workshop.prediction` | `workshop_progress` | `answer` | `answer_set_at` | `(user_id, workshop_id, language)` |
| `workshop.note` | `lww` | `workshop.note` | `workshop_progress` | `note` | `note_set_at` | ídem |
| `route.quiz` | `lww` | `route.quiz` | `route_quiz_answers` | `answer` | `set_at` | `(user_id, step_id)` |
| `route.note` | `lww` | `route.note` | `route_notes` | `body` | `set_at` | `(user_id, language, field)` |
| `preference.routeLanguage` | `lww` | `preference.set` | `preferences` | `route_language` | `route_language_set_at` | `(user_id)` |
| `preference.focusMinutes` | `lww` | `preference.set` | `preferences` | `focus_minutes` | `focus_minutes_set_at` | ídem |
| `preference.labSelectedRust` | `lww` | `preference.set` | `preferences` | `lab_selected_rust` | `lab_selected_rust_set_at` | ídem |
| `preference.labSelectedGo` | `lww` | `preference.set` | `preferences` | `lab_selected_go` | `lab_selected_go_set_at` | ídem |
| `exercise.review` | `lww-group` | `exercise.review` | `exercise_progress` | `confidence`, `reviewed_at`, `review_due_at` | `review_set_at` | `(user_id, exercise_id)` |
| `exercise.draft` | `lww-group` | `exercise.draft` | `drafts` | `code`, `starter_hash` | `set_at` | `(user_id, exercise_id)` |
| `workshop.step` | `tombstone` | `workshop.step` | `workshop_step_marks` | `marked` | `set_at` | `(user_id, workshop_id, language, step_key)` |
| `route.mark.step` | `tombstone` | `route.mark` | `route_marks` | `marked` | `set_at` | `(user_id, kind, item_key)` con `kind` `step` |
| `route.mark.milestone` | `tombstone` | `route.mark` | `route_marks` | `marked` | `set_at` | ídem, `milestone` |
| `route.mark.favorite` | `tombstone` | `route.mark` | `route_marks` | `marked` | `set_at` | ídem, `favorite` |
| `exercise.assisted` | `flag-or` | `exercise.assist` | `exercise_progress` | `assisted` | — | `(user_id, exercise_id)` |
| `exercise.solutionSeen` | `flag-or` | `exercise.assist` | `exercise_progress` | `solution_seen` | — | ídem |
| `exercise.hintsRevealed` | `max` | `exercise.hints` | `exercise_progress` | `hints_revealed` | — | ídem |
| `exercise.predictionCorrect` | `dated-flag` | `exercise.prediction` | `exercise_progress` | `prediction_correct` | `prediction_correct_at` | ídem |
| `checkpoint.passed` | `dated-flag` | `checkpoint.answer` | `campaign_checkpoints` | `passed` | `passed_at` | `(user_id, world_id)` |
| `workshop.predictionCorrect` | `dated-flag` | `workshop.prediction` | `workshop_progress` | `prediction_correct` | `prediction_correct_at` | `(user_id, workshop_id, language)` |
| `workshop.objective` | `observed` | `workshop.objective` | `workshop_observations` | (la fila) | `observed_at` | `(user_id, workshop_id, language, objective_key)` |

Cada columna de estas tablas que el servidor escribe por `/api/sync` está en alguna fila. No están: `solved_at`, `server_solved_at`, `proof_*`, `last_*`, `attempt_count` y `legacy_attempts` (B2 y la importación), ni `campaign_seals`, `workshop_progress.code_sealed` y `legacy_position` (la importación): una operación que los nombre se rechaza (sección 7).

**Una operación, dos tipos de campo.** `exercise.prediction`, `checkpoint.answer` y `workshop.prediction` escriben una respuesta (`lww`) y una bandera (`dated-flag`) en la misma fila. Las pruebas Pest prueban cada tipo sembrando el otro grupo con los valores de la propia operación, así sólo puede cambiar el grupo que se prueba.

**Valores de muestra.** Cada tipo con `samples` lleva dos valores distintos, `A` y `B`:

| `kind` | `A` | `B` |
| --- | --- | --- |
| `exercise.prediction.answer`, `checkpoint.lastAnswer`, `workshop.answer`, `route.quiz` | `0` | `2` |
| `exercise.reflection` | `Primera idea` | `Segunda idea` |
| `exercise.customTest` | `assert_eq!(f(1), 2);` | `assert_eq!(f(2), 4);` |
| `workshop.note` | `Nota A` | `Nota B` |
| `route.note` | `Aprendí A` | `Aprendí B` |
| `preference.routeLanguage` | `rust` | `go` |
| `preference.focusMinutes` | `15` | `45` |
| `preference.labSelectedRust`, `preference.labSelectedGo` | `fx-rust-01`, `fx-go-01` | `fx-rust-02`, `fx-go-02` |
| `exercise.review` | `{confidence: again, reviewedAt: 2026-10-05T11:00:00.000Z, reviewDueAt: 2026-10-06T11:00:00.000Z}` | `{confidence: confident, reviewedAt: 2026-10-05T11:30:00.000Z, reviewDueAt: 2026-10-12T11:30:00.000Z}` |
| `exercise.draft` | `{code: "fn a() {}", starterHash: <64 veces a>}` | `{code: null, starterHash: null}` (la lápida de «restaurar inicio») |
| `workshop.step`, `route.mark.*` | `true` (marcada) | `false` (lápida) |

## 5. La familia con reloj: `lww`, `lww-group` y `tombstone`

Los dos dispositivos se llaman A y B. **El orden `ab`** es el que llega primero la escritura de A, y el `ba`, la de B. La **situación** es la relación del reloj de la que llega con el de lo guardado. Con `t1 < t2` (un segundo de diferencia), la tabla de verdad, escrita a mano, es:

| Caso | Situación | Orden | Guardado | Llega | Resultado | ¿Cambia? |
| --- | --- | --- | --- | --- | --- | --- |
| `absent` | `absent` | — | nada | `A@t1` | `A@t1` | sí |
| `newer.ab` | `newer` | `ab` | `A@t1` | `B@t2` | `B@t2` | sí |
| `newer.ba` | `newer` | `ba` | `B@t1` | `A@t2` | `A@t2` | sí |
| `older.ab` | `older` | `ab` | `A@t2` | `B@t1` | `A@t2` | no |
| `older.ba` | `older` | `ba` | `B@t2` | `A@t1` | `B@t2` | no |
| `equal.ab` | `equal` | `ab` | `A@t1` | `B@t1` | `B@t1` | sí |
| `equal.ba` | `equal` | `ba` | `B@t1` | `A@t1` | `A@t1` | sí |
| `empty-stored.ab` | `empty-stored` | `ab` | `A@∅` | `B@t1` | `B@t1` | sí |
| `empty-stored.ba` | `empty-stored` | `ba` | `B@∅` | `A@t1` | `A@t1` | sí |
| `empty-incoming.ab` | `empty-incoming` | `ab` | `A@t1` | `B@∅` | `A@t1` | no |
| `empty-incoming.ba` | `empty-incoming` | `ba` | `B@t1` | `A@∅` | `B@t1` | no |
| `identical` | `identical` | — | `A@t1` | `A@t1` | `A@t1` | no |

`∅` es «sin reloj». Los doce casos valen para cada tipo con regla `lww`. Son las cinco situaciones de la spec (más nuevo, más viejo, igual, vacío del lado local y vacío del lado remoto), cada una en los dos órdenes de llegada, más dos que la spec no nombra: el de la fila que no existe (la rama `INSERT` del upsert) y el de la escritura idéntica (la que no debe subir la revisión).

Tres propiedades que la tabla cumple y que el check de TypeScript comprueba sin tener una regla de fusión:

- **Convergencia.** Las mismas dos escrituras en los dos órdenes dan el mismo estado final: `newer.ab` con `older.ba` (`{A@t1, B@t2}`), `newer.ba` con `older.ab` (`{A@t2, B@t1}`), `empty-stored.ab` con `empty-incoming.ba` (`{A@∅, B@t1}`) y `empty-stored.ba` con `empty-incoming.ab` (`{A@t1, B@∅}`).
- **Desempate.** Con relojes iguales los dos órdenes terminan distinto: gana la que llega después (`equal.ab` da `B`, `equal.ba` da `A`).
- **Sin cambio, sin revisión.** `older.*`, `empty-incoming.*` e `identical` dan `¿Cambia? no`.

**Tipos que no tienen todas las filas.** En `tombstone` y en `exercise.draft` el valor `B` es una lápida, y una lápida sin reloj no existe (la regla de fila `marked = 1 OR set_at IS NOT NULL` y la de `drafts`, que el escritor garantiza: FR-052). Faltan `empty-stored.ba` y `empty-incoming.ab`: 10 casos por tipo en vez de 12.

**Casos de texto.** Los cuatro tipos de texto libre (`exercise.reflection`, `exercise.customTest`, `workshop.note` y `route.note`) suman seis casos cada uno, con el reloj de lo guardado `t1` y el de la que llega `t2`: la entrante gana y cambia en todos. Tres de los tipos usan la colación de la conexión (`exercise.reflection`, `workshop.note` y `route.note`) y uno es binario (`exercise.customTest`, `utf8mb4_0900_bin`).

| Caso | Guardado | Llega |
| --- | --- | --- |
| `text/case-only` | `Casa` | `casa` |
| `text/accent-only` | `cafe` | `café` |
| `text/trailing-space` | `a` | `a ` |
| `text/to-empty-string` | `x` | `` (la cadena vacía: un valor, no `NULL`) |
| `text/emoji` | `hola` | `hola 🙂` |
| `text/whitespace-kept` | `x` | `  sangría` más un salto de línea y dos espacios |

Existen porque el servidor decide «cambia» en SQL y la colación `utf8mb4_es_0900_ai_ci` iguala las dos primeras parejas (mayúsculas y acentos): una guarda que comparara con esa colación dejaría el valor nuevo sin revisión, y el delta no se lo daría a los demás dispositivos. La tercera pareja (un espacio al final) es significativa en las colaciones `0900` y sólo se igualaría con una colación `PAD SPACE`; queda para que nadie cambie de colación sin darse cuenta. Los dos últimos casos son también la prueba de que ningún middleware recorta ni convierte `''` en `NULL` (research R12).

**Lápida contra una marca más vieja** (FR-082), en `workshop.step` y `route.mark.step`, con tres relojes `t1 < t2 < t3`:

| Caso | Guardado | Llegan, en orden | Resultado | `changed` |
| --- | --- | --- | --- | --- |
| `sequence/late-older-mark-does-not-resurrect` | `true@t1` | `false@t3`, `true@t2` | `false@t3` | `[true, false]` |
| `sequence/newer-mark-resurrects` | `true@t1` | `false@t2`, `true@t3` | `true@t3` | `[true, true]` |

Total de la familia: 12 tipos `lww` por 12 casos (144), `exercise.review` por 12 y `exercise.draft` por 10 (22), 4 tipos `tombstone` por 10 (40), 24 de texto y 4 de secuencia: **234**.

## 6. Las familias que sólo crecen

Cada fila es un caso, con el identificador `<kind>/<id>`. Las fechas `t1 < t2`.

**`flag-or`** (`exercise.assisted` y `exercise.solutionSeen`):

| `id` | Guardado | Llega | Resultado | ¿Cambia? | Corre en |
| --- | --- | --- | --- | --- | --- |
| `absent` | nada | `true` | `true` | sí | los dos |
| `false-then-true` | `false` | `true` | `true` | sí | los dos |
| `true-then-true` | `true` | `true` | `true` | no | los dos |
| `true-then-false` | `true` | `false` | `true` | no | sólo TypeScript (`only: ts`): una operación nunca trae `false`, pero una fila del servidor sí |

**`max`** (`exercise.hintsRevealed`):

| `id` | Guardado | Llega | Resultado | ¿Cambia? |
| --- | --- | --- | --- | --- |
| `absent` | nada | `2` | `2` | sí |
| `raise` | `2` | `3` | `3` | sí |
| `lower-ignored` | `3` | `2` | `3` | no |
| `equal` | `2` | `2` | `2` | no |

**`dated-flag`** (`exercise.predictionCorrect`, `checkpoint.passed` y `workshop.predictionCorrect`):

| `id` | Guardado | Llega | Resultado | ¿Cambia? |
| --- | --- | --- | --- | --- |
| `absent` | nada | `true@t2` | `true@t2` | sí |
| `earlier-date-wins` | `true@t2` | `true@t1` | `true@t1` | sí |
| `later-date-ignored` | `true@t1` | `true@t2` | `true@t1` | no |
| `legacy-date-filled` | `true@∅` | `true@t1` | `true@t1` | sí |
| `incoming-without-date-ignored` | `true@t1` | `true@∅` | `true@t1` | no |
| `row-with-false-flag` | `false@∅` | `true@t1` | `true@t1` | sí |
| `not-correct-ignored` | `true@t1` | `false@∅` | `true@t1` | no |
| `same-date` | `true@t1` | `true@t1` | `true@t1` | no |

**`observed`** (`workshop.objective`, con las claves `fx-obj-1` y `fx-obj-2`):

| `id` | Guardado | Llega | Resultado | ¿Cambia? |
| --- | --- | --- | --- | --- |
| `absent` | nada | `fx-obj-1@t2` | `[fx-obj-1@t2]` | sí |
| `earlier-date-wins` | `[fx-obj-1@t2]` | `fx-obj-1@t1` | `[fx-obj-1@t1]` | sí |
| `later-date-ignored` | `[fx-obj-1@t1]` | `fx-obj-1@t2` | `[fx-obj-1@t1]` | no |
| `legacy-date-filled` | `[fx-obj-1@∅]` | `fx-obj-1@t1` | `[fx-obj-1@t1]` | sí |
| `other-objective-added.ab` | `[fx-obj-1@t1]` | `fx-obj-2@t2` | `[fx-obj-1@t1, fx-obj-2@t2]` | sí |
| `other-objective-added.ba` | `[fx-obj-2@t2]` | `fx-obj-1@t1` | `[fx-obj-1@t1, fx-obj-2@t2]` | sí |
| `same-objective-same-date` | `[fx-obj-1@t1]` | `fx-obj-1@t1` | `[fx-obj-1@t1]` | no |

Total: 8 + 4 + 24 + 7 = **43**. Con la familia con reloj, **277 casos de fusión**, de los cuales 275 corren en PHP y 277 en TypeScript.

## 7. Los casos del servidor

Sólo los corre Pest, a través de `SyncService` (decodificación, comprobación contra el contenido, corrección de reloj, registro y escritura). El check de TypeScript valida que existan, con su forma, y no los ejecuta. Van en `serverCases`, con esta forma:

```json
{
  "id": "clock/device-ahead-one-hour",
  "family": "clock-correction",
  "batches": [
    {
      "serverNow": "2026-10-05T12:10:00.000Z",
      "sentAt": "2026-10-05T13:10:00.000Z",
      "operations": [{"id": "00000000-0000-4000-8000-000000000002", "type": "exercise.reflection", "at": "2026-10-05T13:09:55.000Z", "exerciseId": "fx-rust-01", "text": "Hola"}]
    }
  ],
  "expect": {
    "results": [{"status": "applied"}],
    "stored": [{"kind": "exercise.reflection", "state": {"value": "Hola", "at": "2026-10-05T12:09:55.000Z"}}]
  }
}
```

Cada caso es una lista de lotes (casi siempre uno), con su `serverNow`, que congela el reloj del servidor, y su `sentAt`. Los `id` de las operaciones son UUID v4 fijos y distintos en todo el archivo. `expect.results` trae un resultado por operación, en el orden de los lotes, y `expect.stored` el estado final de cada tipo de campo que el caso toca, con las mismas formas de la sección 2.

**Corrección de reloj** (FR-002): `efectivo = min(at + (ahora − sentAt), ahora)`, con `ahora = 2026-10-05T12:10:00.000Z`.

| Caso | `sentAt` | `at` | Reloj guardado | Resultado |
| --- | --- | --- | --- | --- |
| `clock/in-sync` | `12:10:00.000Z` | `12:09:58.000Z` | `12:09:58.000Z` | `applied` |
| `clock/device-ahead-one-hour` | `13:10:00.000Z` | `13:09:55.000Z` | `12:09:55.000Z` | `applied` |
| `clock/device-behind-one-hour` | `11:10:00.000Z` | `11:09:55.000Z` | `12:09:55.000Z` | `applied` |
| `clock/operation-after-send-is-capped` | `12:10:00.000Z` | `12:10:10.000Z` | `12:10:00.000Z` | `applied` |
| `clock/old-offline-operation-keeps-its-age` | `12:10:00.000Z` | `2026-10-02T12:10:00.000Z` | `2026-10-02T12:10:00.000Z` | `applied` |
| `clock/before-floor-is-out-of-range` | `12:10:00.000Z` | `2019-12-31T23:59:59.000Z` | nada | `rejected`, `out_of_range` |
| `clock/ahead-device-does-not-win-forever` | dos lotes | A: `sentAt` y `at` `13:10:00.000Z` (una hora adelantado) con `Hola A`, y después B: `sentAt` y `at` `12:10:30.000Z` con `Hola B` | `Hola B@12:10:30.000Z` | los dos `applied` |

Los instantes sin fecha son del 2026-10-05. El último caso es el del criterio «un dispositivo con el reloj adelantado no gana para siempre»: sin la corrección, el reloj de A (`13:10`) ganaría.

El desfase que se guarda en `sync_operations.clock_offset_ms` es `ahora − sentAt` en milisegundos (`-3.600.000` en el segundo caso, `3.600.000` en el tercero), y `received_at` es `ahora`.

**`stale_content`** (FR-007), con `contentVersion` igual a la vigente (`current`) y distinta (`stale`), para las cuatro operaciones que responden una pregunta:

| Operación | Con la versión vigente | Con otra versión |
| --- | --- | --- |
| `exercise.prediction` (`answer: 1`, `correct: true`) | `applied`; `prediction_answer` 1 y `prediction_correct` 1 con su fecha | `stale_content`; `prediction_answer` 1 y `prediction_correct` 0 |
| `checkpoint.answer` (`answer: 1`, `passed: true`) | `applied`; `last_answer` 1 y `passed` 1 | `stale_content`; `last_answer` 1 y `passed` 0 |
| `workshop.prediction` (`answer: 1`, `correct: true`) | `applied`; `answer` 1 y `prediction_correct` 1 | `stale_content`; `answer` 1 y `prediction_correct` 0 |
| `route.quiz` (`answer: 1`) | `applied`; `answer` 1 | `stale_content`; `answer` 1 (no hay bandera que retener, y el cliente igual la vuelve a evaluar) |

Ocho casos: `stale/<operación>/current` y `stale/<operación>/stale`.

**Rechazos** (FR-005, FR-006 y FR-009): cada caso envía una operación y espera un resultado `rejected` con su motivo y **ninguna fila escrita** (lo rechazado queda en `sync_operations`, no en las tablas de progreso). El motivo `invalid` es la forma (tipo desconocido, campo desconocido o de más, tipo de dato, valor fuera de un conjunto de textos); `out_of_range`, un valor del tipo correcto fuera del rango, de un conjunto de números, del tope de longitud, de las opciones o de las pistas del contenido; `unknown_reference`, una clave que el contenido no tiene.

| Caso | La operación | Motivo |
| --- | --- | --- |
| `reject/unknown-type` | `exercise.solved` | `invalid` |
| `reject/server-owned-field` | `exercise.prediction` con un campo `solvedAt` de más | `invalid` |
| `reject/importer-only-field` | `workshop.prediction` con `codeSealed` de más | `invalid` |
| `reject/wrong-type` | `exercise.prediction` con `answer: "1"` | `invalid` |
| `reject/assist-with-false` | `exercise.assist` con `assisted: false` | `invalid` |
| `reject/assist-without-flags` | `exercise.assist` sin ninguna bandera | `invalid` |
| `reject/draft-null-code-with-hash` | `exercise.draft` con `code: null` y `starterHash` | `invalid` |
| `reject/review-unknown-confidence` | `exercise.review` con `confidence: "sure"` | `invalid` |
| `reject/lab-selected-of-other-language` | `preference.set` `labSelectedRust` con un ejercicio de Go | `invalid` |
| `reject/answer-outside-options` | `exercise.prediction` con `answer: 3` (el ejercicio tiene 3 opciones) | `out_of_range` |
| `reject/hints-beyond-the-exercise` | `exercise.hints` con `revealed: 4` (tiene 3) | `out_of_range` |
| `reject/hints-zero` | `exercise.hints` con `revealed: 0` | `out_of_range` |
| `reject/focus-minutes-not-allowed` | `preference.set` `focusMinutes: 20` | `out_of_range` |
| `reject/reflection-too-long` | `exercise.reflection` de 10.001 caracteres | `out_of_range` |
| `reject/custom-test-too-long` | `exercise.customTest` de 3.001 | `out_of_range` |
| `reject/draft-too-long` | `exercise.draft` de 30.001 | `out_of_range` |
| `reject/workshop-note-too-long` | `workshop.note` de 10.001 | `out_of_range` |
| `reject/route-note-too-long` | `route.note` de 20.001 | `out_of_range` |
| `reject/unknown-exercise` | `exercise.reflection` sobre `fx-no-existe` | `unknown_reference` |
| `reject/unknown-world` | `checkpoint.answer` sobre un mundo que no está | `unknown_reference` |
| `reject/unknown-workshop` | `workshop.note` sobre un taller que no está | `unknown_reference` |
| `reject/unknown-objective` | `workshop.objective` con una clave que el taller no tiene | `unknown_reference` |
| `reject/unknown-step-key` | `workshop.step` con una clave de etapa que no tiene | `unknown_reference` |
| `reject/unknown-guide-step` | `route.mark` `step` con un paso que no está | `unknown_reference` |
| `reject/unknown-resource` | `route.mark` `favorite` con un recurso que no está | `unknown_reference` |
| `reject/unknown-milestone` | `route.mark` `milestone` con una clave fuera de los diez hitos | `unknown_reference` |
| `reject/unknown-lab-selected` | `preference.set` `labSelectedGo` con un ejercicio que no está | `unknown_reference` |

Más una **mezcla**: un lote con una operación válida entre dos rechazadas aplica la válida y devuelve los tres resultados en el orden del pedido (`reject/mixed-batch-applies-the-valid-one`).

Total: 7 de corrección de reloj, 8 de `stale_content`, 27 de rechazo y la mezcla: **43 casos del servidor**. `requiredServerCaseIds` del check de TypeScript lista exactamente estos identificadores.

## 8. El archivo y cómo se congela

```jsonc
{
  "format": 1,
  "contract": "specs/007-d1-progreso-sincronizacion/contracts/merge-rules.md",
  "world": { "contentVersion": "…32 hex…", "staleContentVersion": "…32 hex…", "exercises": [...], "worlds": [...], "workshops": [...], "guide": {...}, "milestones": [...] },
  "kinds": { "exercise.reflection": { "rule": "lww", "target": "exercise", "op": "exercise.reflection", "samples": { "A": "…", "B": "…" } } },
  "cases": [ { "id": "exercise.reflection/newer.ab", "kind": "…", "situation": "newer", "order": "ab", "stored": {…}, "incoming": [{…}], "expect": { "state": {…}, "changed": [true] } } ],
  "serverCases": [ … ]
}
```

- **`world`** describe el contenido mínimo que las pruebas Pest siembran para que las operaciones tengan a qué referirse (`fx-rust-01` con tres pistas y tres opciones, un mundo, un taller con dos objetivos y cuatro etapas, un paso de la guía con tres opciones, un recurso y los hitos que usan los casos). TypeScript lo ignora.
- **`only`** (`ts` o `php`) marca los casos que un lado no puede expresar; no hay ninguno `php`.
- **Los identificadores** son `<kind>/<caso>`; los de las operaciones del servidor, `<familia>/<caso>`.
- **Todo literal.** Cada caso lleva sus valores y sus relojes escritos, sin símbolos que haya que resolver: lo que se lee es lo que corre. La única excepción son los textos que pasan un tope (los de los casos `reject/*-too-long`), que se escriben `{"repeat": "x", "times": 10001}` y que sólo expande el lector de Pest.

**Dónde vive.** `qa/fixtures/shared/`, el directorio que B2 creó para el fixture de la plantilla del harness. La imagen de pruebas de la API sólo ve lo que su Dockerfile copia, y la etapa `dev` ya copia ese directorio a `tests/Fixtures/shared/` (la línea de la tarea T007 de B2): D1a no cambia el Dockerfile. El front y los checks lo leen del repositorio.

| Archivo | Qué es |
| --- | --- |
| `merge-cases.json` | El fixture, formateado con Prettier |
| `merge-cases.sha256` | Su huella en el formato de `sha256sum` (`<hex>  merge-cases.json`) |
| `route-milestones.json` | Los diez hitos del recorrido (sección 10) |

**Cómo se congela**, igual que `qa/fixtures/curriculum-ids.json` y `qa/fixtures/workshop-steps-v1.json`:

1. Los esperados se escriben a mano a partir de este documento. Se arma **una sola vez** con el script de [reference-merge.md](../reference-merge.md), que no se versiona (precedente: el generador de migraciones de C2) y que codifica las tablas de arriba, no una regla de fusión. Se revisa caso por caso y se formatea con Prettier.
2. `merge-cases.sha256` fija su huella. El check de TypeScript y la primera prueba de Pest la recalculan y fallan con «es un fixture congelado» si no coincide: tocar un caso exige tocar la huella en el mismo commit, y eso se ve en el diff. Se verifica además con `sha256sum -c`, una implementación independiente.
3. **Nunca se regenera para que un check pase.** Si un caso falla, el error está en el código o en este documento, y se corrige donde esté. Cambiar un caso exige cambiar antes la regla acá y dejar la razón en el mensaje del commit.
4. Cada lado verifica que su registro de tipos de campo sea **igual** al del fixture: PHP, `FieldKinds` contra `kinds`; TypeScript, `FIELD_KINDS` contra `kinds`. Un tipo nuevo sin casos, o un caso de un tipo que ya no existe, rompe la prueba (FR-082: «una regla escrita en los dos lenguajes sin un caso en el fixture rompe la prueba»).

## 9. Mutaciones que el fixture tiene que detectar

Es la prueba de US7.1: cambiar una regla en un solo lenguaje rompe el fixture. Cada fila se aplica a mano sobre la implementación, se corre el check o Pest y se restaura; el resultado va en el mensaje del commit de la tarea. Las cifras de TypeScript se **midieron al planificar** sobre el código de [reference-merge.md](../reference-merge.md); las de PHP salen de contar los casos del fixture.

| # | Mutación | TypeScript (`merge-rules.ts`) | PHP (SQL de `UpsertSql`) | Casos que rompen |
| --- | --- | --- | --- | --- |
| M1 | Relojes iguales: `>=` pasa a `>` | `incoming.at >= stored.at` | el `>=` del `wins` | 36 (`equal.*`) |
| M2 | Un guardado sin reloj gana | quitar `stored.at === null` | quitar `stored.at IS NULL OR` | 31 (`empty-stored.*`) |
| M3 | Una entrante sin reloj gana | `incoming.at === null \|\|` | quitar `n.at IS NOT NULL AND` | 31 (`empty-incoming.*`) |
| M4 | La fecha más tardía en lugar de la más temprana | `a >= b` | `GREATEST` en lugar de `LEAST` | 8 |
| M5 | `max` avisa cambio siempre | `changed = true` | quitar la guarda de `hints_revealed` | 2 |
| M6 | Una escritura idéntica que gana cuenta como cambio | `changed: true` | estampar la revisión siempre (sin la guarda `IF(<cambia>, …)`) | TypeScript: 18 (`identical`); PHP: 103 (todos los casos sin cambio) |
| M7 | `flag-or` toma la entrante | `state: incoming` | `assisted = n.assisted` | 2 (`true-then-false`, sólo TypeScript) |
| M8 | `observed` conserva la primera fecha | `existing.at` | quitar el `LEAST` | 2 |
| M9 | Estampar la revisión después de los valores y del reloj (D09: las guardas primero y el reloj al final) | — | mover `revision` y `updated_at` al final de las asignaciones | PHP: 172 (todos los casos con cambio: la guarda ya ve lo nuevo y no estampa) |
| M10 | Comparar el texto con la colación de la conexión | — | quitar `BINARY` de la guarda de texto | PHP: 6 (`text/case-only` y `text/accent-only` de los tres tipos con esa colación) |
| M11 | Recortar o convertir `''` en `NULL` en la entrada | — | volver a activar `TrimStrings` o `ConvertEmptyStringsToNull` sobre `/api/sync` | 8 (`text/to-empty-string` y `text/whitespace-kept` de los cuatro tipos de texto), en la prueba de HTTP |

M3 en PHP sólo se ejerce a través del escritor, que acepta un reloj nulo. M11 no la ejerce la prueba del fixture del escritor sino la de HTTP; está acá porque es la mutación que más fácil se cuela. Las cifras de PHP suponen los 275 casos que corren allá: 172 con cambio y 103 sin cambio.

## 10. Los hitos del recorrido

`route_marks.item_key` no tiene clave foránea y los hitos viven sólo en `frontend/app.js` (`milestones`, líneas 29 a 68; la F2 del épico del front los pasa a la configuración de `entities/guide`). El servidor necesita una lista para rechazar con `unknown_reference` lo que no es un hito, y una lista escrita en dos lenguajes es una regla escrita en dos lenguajes (FR-082). Por eso va en el mismo directorio y con el mismo mecanismo:

- `qa/fixtures/shared/route-milestones.json`: `["rust-memory", "rust-commands", "rust-files", "rust-measure", "rust-network", "go-memory", "go-commands", "go-files", "go-measure", "go-network"]`, el lenguaje y el `id` de cada hito de `app.js` unidos con un guion.
- `qa/route-milestones-check.ts` (en `npm test`): extrae los `id` del arreglo `milestones` de `frontend/app.js` y exige que `lenguaje-id` para `rust` y `go` sea exactamente esa lista, en ese orden. Cuando F2 mueva los hitos, la ruta de lectura cambia en ese check y la lista no.
- `RouteMilestones::KEYS` (PHP) la prueba contra `tests/Fixtures/shared/route-milestones.json`.
