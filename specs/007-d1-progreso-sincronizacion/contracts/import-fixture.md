# El fixture de importación, la proyección v1 y el criterio sin pérdida

**Input**: [spec.md](../spec.md) (FR-038, FR-039 y SC-001), ADR 0006 D24 ([ADR 0006](../../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)), [research-d1b.md](../research-d1b.md) (R24, R38 y R44) y [http-d1b.md](./http-d1b.md), sección 3.3. Lo leen el check de TypeScript y las pruebas Pest de D1b, y después el cliente de D1c.

Este documento es el contrato del criterio de aceptación de D1b: «el progreso real de master entra a las tablas y vuelve a salir sin perder datos». Lo que esperan las pruebas sale de acá, escrito a mano, o de los parsers v1 reales, nunca del código que se prueba.

## 1. Qué fija

- Los tres casos de FR-038: el crudo que mandaría el cliente, el normalizado que dan los parsers v1 de carga y las filas que una cuenta nueva tiene que escribir.
- El formato de `qa/fixtures/shared/import-cases.json`, cómo se arma una vez y cómo se congela.
- La proyección de las tablas hacia el v1, que vive en las pruebas (FR-039).
- El criterio sin pérdida y el oráculo de TypeScript (SC-001).
- Las mutaciones que la prueba de aceptación tiene que detectar.

## 2. Los tres casos

| `id` | `source` | Fuente | Crudo |
| --- | --- | --- | --- |
| `master-2a278ad-storage` | `storage` | `qa/fixtures/progress-master-2a278ad-storage.json`: las cuatro claves que escribió `master` 2a278ad | `JSON.stringify` del objeto con las cuatro claves en el orden de [http-d1b.md](./http-d1b.md), sección 3.2. Son 13.633 bytes, sha256 `421632476b2ab2a4…` |
| `master-2a278ad-export` | `export` | `qa/fixtures/progress-master-2a278ad-export.json` | El texto del archivo: 17.241 bytes, sha256 `33083f827194c05f…` |
| `d0e1b49-export` | `export` | `qa/fixtures/progress-d0e1b49-export.json` | El texto del archivo: 26.505 bytes, sha256 `f32b364177ac549b…` |

Las cifras se midieron al planificar (R44). Si una fixture de `qa/fixtures` cambiara, vale la regla y no la cifra, pero esas fixtures están congeladas desde F1.

## 3. El archivo

```jsonc
{
  "format": 1,
  "contract": "specs/007-d1-progreso-sincronizacion/contracts/import-fixture.md",
  "parsers": {
    "route": "parseRouteProgress (frontend/src/entities/guide)",
    "lab": "parseSavedLab (frontend/src/entities/exercise)",
    "campaign": "parseSavedCampaignState (frontend/src/entities/campaign/model/progress.ts)",
    "systems": "parseSavedSystemsState (frontend/src/entities/systems-workshop/model/progress.ts)"
  },
  "cases": [
    {
      "id": "master-2a278ad-storage",
      "source": "storage",
      "fixture": "qa/fixtures/progress-master-2a278ad-storage.json",
      "raw": "{\"taller-learning-v1\":\"{\\\"version\\\":1,…",
      "normalized": { "route": { "version": 1, "language": "go" }, "lab": {}, "campaign": {}, "systems": {} },
      "expect": { "written": { "exercises": 11, "drafts": 11, "attempts": 11 } }
    }
  ]
}
```

- **`parsers`** nombra la función que produjo cada sección (R24). Si F2 todavía no está integrada cuando se arma el fixture, dice `parseProgress (frontend/app.js)` y `parseSaved (frontend/lab.js)`.
- **`normalized`** es exactamente lo que dio cada parser, sin reordenar ni completar.
- **`expect.written`** se escribe a mano desde la tabla de la sección 8, con las doce claves.
- **Lo lee Pest** desde `tests/Fixtures/shared/import-cases.json`, por la línea del Dockerfile de B2 (`COPY --from=repo qa/fixtures/shared tests/Fixtures/shared`). D1b no cambia el Dockerfile. El front y los checks lo leen del repositorio.

## 4. Cómo se arma y cómo se congela

Igual que `merge-cases.json` de D1a:

1. **Se arma una sola vez**, con la misma función del check (`normalizeWithParsers` de `qa/lib/import-cases.ts`), que corre los parsers reales sobre el JSON de cada sección. El crudo sale de las fixtures de `qa/fixtures`, y `expect.written` se escribe a mano.
2. **Se revisa a mano**: el normalizado contra el crudo, sección por sección (lo que agregó cada parser), y las cifras de `expect.written` contra la sección 8. Se formatea con Prettier.
3. **Se congela** con `qa/fixtures/shared/import-cases.sha256` (`<hex>  import-cases.json`). El check y `ImportCases` de Pest recalculan la huella y fallan con «es un fixture congelado» si no coincide, y `sha256sum -c` la verifica aparte.
4. **Nunca se regenera para que algo pase.** Si un parser v1 cambia de salida, falla el check (sección 5) y la decisión es del cambio del parser, no del fixture.

## 5. El check de TypeScript

`qa/import-cases-check.ts`, en `npm test`, comprueba:

1. **La huella.**
2. **El crudo**: el de cada caso es el que manda la sección 2, desde la fixture de `qa/fixtures`.
3. **Los parsers**: corridos sobre las secciones del crudo, dan exactamente el `normalized` del caso. Es el oráculo de que el normalizado es la salida de los parsers, no un texto escrito a mano.
4. **Sin pérdida en TypeScript**: `isLosslessNormalization(sección del crudo, sección del normalizado)` da verdadero en las 12 secciones. Es la condición de FR-038 vista desde el cliente.
5. **Los conteos**: `expect.written` coincide con lo que se cuenta del normalizado:
   - registros del laboratorio;
   - borradores;
   - resultados con un `time` válido;
   - sellos;
   - checkpoints;
   - registros de Sistemas;
   - objetivos observados;
   - etapas cuya posición tiene una clave en `qa/fixtures/workshop-steps-v1.json`;
   - marcas del recorrido;
   - respuestas del quiz;
   - notas no vacías;
   - y una fila de preferencias.

   Es una cuenta independiente del servidor.

## 6. La proyección v1

`Tests\Support\V1Projection::of(int $userId): array` lee las tablas de la cuenta y arma las cuatro secciones del v1. Vive en las pruebas (FR-039) y sigue las tres reglas de D24:

1. Hay un registro v1 por fila, aunque esté vacía.
2. Los arreglos salen en el orden de `legacy_position` y después de `created_at`: `ORDER BY legacy_position IS NULL, legacy_position, created_at`.
3. Los sellos salen crudos de `campaign_seals`, sin derivar.

Los instantes vuelven a milisegundos enteros.

| Sección | Cómo se arma |
| --- | --- |
| `route` | `version: 1`; `language`, de `preferences.route_language`, o `rust` si es NULL; `minutes`, de `focus_minutes`, o `25`; `completed`, `milestones` y `favorites`, las `item_key` de `route_marks` con `marked = 1` de cada `kind`, en el orden de la regla 2; `quizAnswers`, de `route_quiz_answers`; `notes`, las cuatro de `route_notes`, con `''` si falta la fila |
| `lab` | `version: 1`; `records`, uno por fila de `exercise_progress`; `selected`, `{rust: lab_selected_rust, go: lab_selected_go}`, con null si faltan |
| un registro | `predictionCorrect`, `assisted` y `solutionSeen` como booleanos. Con su clave sólo si la columna no es NULL: `prediction`, `hints`, `draft` (de `drafts.code`), `reflection`, `customTest`, `attempts` (de `legacy_attempts`), `solvedAt`, `reviewAt` (de `review_due_at`), `reviewedAt` y `confidence`. `result`, sólo si hay `last_attempt_id` |
| `result` | Del intento `last_attempt_id`, sus `attempt_tests` por `position` y su payload: `code`; `success` (`outcome = passed`); `stdout`; `stderr`; `transportError` (`outcome = legacy_error`); `tests`, como `[{id: test_key, passed: outcome = pass}]`; `time` (`attempted_at`); `customTest` (`custom_test`, o `''`); `customPassed` (`custom_outcome = pass`) |
| `campaign` | `version: 1`; `seals`, `{exercise_id: {code, prediction, assisted}}` de `campaign_seals`; `checkpoints`, `{world_id: {passed, lastAnswer}}`, con null si `last_answer` es NULL |
| `systems` | `version: 1`; `records`, con clave `"language:workshop_id"`, uno por fila de `workshop_progress`: `observed` (las `objective_key` en el orden de la regla 2), `code` (`code_sealed`), `predicted` (`prediction_correct`), `answer` (o null), `steps` (el `v1_position` de cada `step_key` con `marked = 1` y `v1_position` no nulo, en el orden de la regla 2) y `note` (o `''`) |

## 7. El criterio sin pérdida y el oráculo

`Tests\Support\LosslessNormalization::holds(mixed $original, mixed $projection): bool` es `isLosslessNormalization` (`frontend/src/shared/lib/is-lossless-normalization.ts`) portado a PHP:

- un arreglo (lista) se compara por índice, y el de la proyección puede ser más largo;
- un objeto se compara por las claves del original, y la proyección puede traer claves de más;
- lo demás es igualdad estricta, salvo los números, que se comparan por valor: JSON no distingue `1` de `1.0`.

Los dos lados se decodifican con `json_decode(…, false)`, con objetos como `stdClass`, para no confundir `{}` con `[]` (ADR 0006 §8). Sus casos de prueba repiten los de `qa/shared-lib-check.ts`.

**SC-001**, en `ImportLosslessTest` (suite `Content`, con el contenido real importado), para cada caso en una cuenta nueva:

1. `POST /api/progress/import` con `raw`, `normalized`, `source`, `format: 2`, `epoch: 1` y una `importId` fija responde **201**, y `report.written` es `expect.written`.
2. **Sin pérdida (FR-038)**: `LosslessNormalization::holds(sección del crudo, sección de la proyección)` da verdadero en las 4 secciones de cada caso, 12 de 12. Las secciones del crudo se leen como dice [http-d1b.md](./http-d1b.md), sección 3.3: con `storage`, cada clave es un texto JSON aparte; con `export`, el primer nivel y sus tres subobjetos. Quedan fuera, por nombre, `exportedAt`, que no es parte de ninguna sección, y los marcadores `version`, que pone la proyección.
3. **El oráculo (FR-039)**: la proyección es **igual** al `normalized` del caso, comparada como JSON decodificado, sin orden de claves en los objetos y con los números por valor.
4. **Repetir**: el mismo pedido otra vez responde **200** con el mismo cuerpo, y las tablas no cambian (la misma revisión, 0 filas nuevas). Una `importId` nueva con el mismo crudo también responde 200 y no cambia nada.
5. **Los invariantes**: `ProgressInvariants::assertClean()` y `RunInvariants::assertClean()` no encuentran nada.

## 8. Las filas por área de una cuenta nueva

Escritas a mano desde las fixtures (R44). Son el `expect.written` de cada caso:

| Área | `master-2a278ad-storage` | `master-2a278ad-export` | `d0e1b49-export` | De dónde sale |
| --- | --- | --- | --- | --- |
| `exercises` | 11 | 11 | 11 | un registro del laboratorio, una fila |
| `drafts` | 11 | 11 | 11 | los 11 traen `draft` |
| `attempts` | 11 | 11 | 11 | los 11 traen `result` con un `time` válido |
| `campaignSeals` | 9 | 9 | 9 | `campaign.seals` |
| `campaignCheckpoints` | 1 | 1 | 1 | `rust-world-1` |
| `workshops` | 1 | 1 | 50 | `rust:pc`; d0e1b49 trae además 49 registros vacíos |
| `workshopObjectives` | 3 | 3 | 3 | `translate`, `protect-retry` e `interrupt` de `rust:pc` |
| `workshopSteps` | 1 | 1 | 1 | la posición 0 de `rust:pc`, que es `e1` |
| `routeMarks` | 4 | 4 | 4 | 2 pasos, 1 hito y 1 favorito |
| `routeQuiz` | 1 | 1 | 1 | `rust-first-session` |
| `routeNotes` | 1 | 1 | 1 | sólo `rust.learned` no está vacía (R29) |
| `preferences` | 1 | 1 | 1 | el idioma, los minutos y el ejercicio abierto de cada lenguaje |

Hay además 33 filas de `attempt_tests` por caso: 11 intentos de 3 pruebas, y el parser completa con las tres pruebas del ejercicio el `tests: []` de `rust-08` en 2a278ad. No están en `written`, que cuenta intentos y no pruebas.

## 9. Mutaciones que la prueba de aceptación tiene que detectar

Cada una se aplica a mano en el escritor (`DatabaseLegacyWriter`, `ImportSql` o `LegacyAttempts`), se corre `ImportLosslessTest` y se restaura. Lo que falla va en el mensaje del commit de T018:

| # | Mutación | Qué falla |
| --- | --- | --- |
| J1 | No crear la fila de un registro vacío de Sistemas | `d0e1b49-export`: faltan 49 registros, y fallan el criterio sin pérdida y el oráculo |
| J2 | Ignorar `legacy_position` y ordenar por clave | `observed` de `rust:pc` sale `interrupt, protect-retry, translate`, y fallan los tres casos |
| J3 | Traducir la posición de etapa con un corrimiento de uno (`v1_position = posición + 1`) | `steps` de `rust:pc`, en los tres casos |
| J4 | Guardar los instantes sin milisegundos | `solvedAt`, `reviewAt` y `result.time`, en los tres casos |
| J5 | No escribir `attempt_tests` | `result.tests`: falla el oráculo en los tres casos, y el criterio sin pérdida en los registros cuyo crudo trae pruebas |
| J6 | Descartar un grupo de repaso sin `confidence` | `reviewAt` de los ocho registros con el grupo incompleto (R41), en los tres casos |
