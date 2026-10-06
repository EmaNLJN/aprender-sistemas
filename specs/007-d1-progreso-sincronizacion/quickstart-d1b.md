# Quickstart: validar D1b

**Spec**: [spec.md](./spec.md) | **Plan**: [plan-d1b.md](./plan-d1b.md) | **Contratos**: [http-d1b.md](./contracts/http-d1b.md) y [import-fixture.md](./contracts/import-fixture.md)

Escenarios que prueban D1b de punta a punta, con sus comandos y lo que tiene que pasar. Los marcados «automático» los corre una prueba o un check, y el resto los corre el coordinador al cerrar (T022). Ninguno se ejecutó al planificar, salvo las cifras de las fixtures del escenario 2, que se midieron con Node (R44).

**Prerrequisitos.**

- La línea de base de [plan-d1b.md](./plan-d1b.md): D1a con su S2, C3a y B2.
- Un `.env`, con `sh backend/api/scripts/init-env.sh`.
- `export COMPOSE_PROJECT_NAME=taller-d1b-<dueño>`.
- Para los escenarios marcados «con el stack», el stack levantado: `docker compose up --build -d --wait`.

## 1. Las dos tablas (FR-051 a FR-053, SC-009)

**Automático**: `npm run api:test -- --filter=ImportSchemaTest` y `--filter=ImportMigrationsTest`.

**Con el stack**, para ver las tablas:

```sh
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -e "
  SELECT TABLE_NAME, COUNT(*) AS columnas FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = \"taller\" AND TABLE_NAME IN (\"progress_imports\", \"campaign_seals\") GROUP BY TABLE_NAME;"'
```

Lo que tiene que dar:

- 10 y 7 columnas, 17 en total;
- 3 claves foráneas;
- los tres `CHECK` con nombre (`progress_imports_import_id_check`, `progress_imports_report_check` y `campaign_seals_flags_check`), y ninguno sobre una columna `DATETIME`;
- un `DELETE FROM users WHERE id = ?` de una cuenta con las 12 tablas de D1, las 2 de B2 y los intentos poblados no falla ni deja filas;
- la búsqueda de punteros cruzados da 0.

## 2. El fixture de importación (FR-038, FR-039, SC-001)

**Automático**: `node qa/import-cases-check.ts` (en `npm test`). Comprueba:

1. la huella de `qa/fixtures/shared/import-cases.json`;
2. que cada crudo es el de su fixture de `qa/fixtures`. El de `storage` mide 13.633 bytes y su sha256 empieza por `421632476b2ab2a4`; los de los exports, 17.241 y 26.505 bytes, con `33083f827194c05f` y `f32b364177ac549b`;
3. que los parsers v1 de carga dan el `normalized` de cada caso;
4. `isLosslessNormalization` del crudo al normalizado, en 12 de 12 secciones;
5. que `expect.written` sale de contar el normalizado.

**A mano**, desde `qa/fixtures/shared/`: `sha256sum -c import-cases.sha256` dice `OK`. Editar un caso sin tocar la huella hace fallar el check con «es un fixture congelado».

## 3. Importar sin perder nada (US1.1 y US1.2, SC-001)

**Automático**: `npm run api:test -- --filter=ImportLosslessTest`, en la suite `Content`, con el contenido real importado. Para cada uno de los tres casos, en una cuenta nueva:

1. **El 201.** `POST /api/progress/import` responde 201, y `report.written` es la tabla de [import-fixture.md](./contracts/import-fixture.md), sección 8. Por ejemplo, `d0e1b49-export` deja 11 ejercicios, 11 intentos legados con 33 pruebas, 9 sellos, 50 talleres (49 vacíos), 3 objetivos, 1 etapa (`e1`), 4 marcas, 1 respuesta del quiz, 1 nota y las preferencias.
2. **Sin pérdida.** `LosslessNormalization::holds(sección del crudo, sección de la proyección)` da verdadero en las 4 secciones.
3. **El oráculo.** La proyección es igual al normalizado que dio TypeScript.
4. **Las invariantes.** `ProgressInvariants` y `RunInvariants` no encuentran nada.

**Las mutaciones.** J1 a J6 de import-fixture.md, sección 9, se aplican una por una sobre el escritor, se corre la prueba, que tiene que fallar, y se restaura. El resultado va en el mensaje del commit de T018.

## 4. Repetir es seguro (US1.3, FR-028, SC-001)

**Automático** (`ImportLosslessTest`, `ImportServiceTest` y la concurrencia de T018):

- **La misma importación otra vez** (la misma `importId`) responde **200** con el mismo cuerpo, y la revisión y las filas no cambian.
- **El mismo crudo con otra `importId`** también responde 200 y no cambia nada.
- **Desde dos procesos a la vez**: un 201 y un 200, y una sola fila en `progress_imports`.
- **Otro crudo con la misma `importId`** responde 422 con `errors.importId`.
- **La misma copia en otro formato.** Importar `master-2a278ad-export` después de `master-2a278ad-storage` pide confirmación. Con `confirm`, responde 201 con todo en 0 y la revisión quieta.

## 5. Combinar sobre datos de v2 (US1.4, FR-026)

**Automático** (`ImportEndpointTest`). La cuenta tiene una reflexión sincronizada con su reloj y un intento del servidor como último intento. La importación de un v1 con otra reflexión y otro resultado:

- conserva la reflexión de v2 y el puntero del servidor;
- suma los logros del v1, como las banderas de ayuda o la predicción correcta;
- deja el resultado v1 como un intento legado, con `legacy` en 1;
- lista en `conflicts` `newer_value_kept` (`…reflection`) y `server_attempt_kept` (`…result`).

## 6. La confirmación (US1.5, FR-029)

**Automático** (`ImportEndpointTest` e `ImportRouteTest`). Cada motivo responde **el mismo** 409 `import_needs_confirmation`, con el mismo cuerpo y sin decir cuál:

- la cuenta ya importó otro crudo;
- la cuenta hizo «Borrar todo»;
- otra cuenta importó este crudo.

El mismo pedido con `confirm: true` responde 201.

## 7. Lo que se omite o se reemplaza (US1.6, FR-032, FR-033)

**Automático** (`LegacyDecoderTest` e `ImportEndpointTest`). Un v1 que trae `solvedAt: 253402300800000`, una reflexión con U+FFFD y la posición de etapa 9 de un taller que no la tiene:

- responde 201 y aplica el resto;
- el informe trae `omitted: [{path: "lab.records.<id>.solvedAt", reason: "date_out_of_range"}, {path: "systems.records.<taller>.steps[<i>]", reason: "unknown_step_position"}]` y `replaced: [{path: "lab.records.<id>.reflection", reason: "replacement_character"}]`.

Un campo desconocido, en cambio, responde **422** con su ruta en `errors`, y no escribe nada.

## 8. «Borrar todo» (US5.1 a US5.3, US5.5, FR-040 a FR-043)

**Automático** (`ProgressResetTest`, `ResetRouteTest` y `ResetEndpointTest`):

1. **Sin confirmar la contraseña**: 423 `password_confirmation_required`, y nada cambia. Cuatro 423 seguidos no gastan el límite.
2. **Con la contraseña confirmada**: `POST /api/progress/reset` con `{epoch: 1, format: 2}` responde `200 {"epoch": 2, "revision": R + 1}`. Las once tablas de estado quedan sin filas de la cuenta. Los intentos, sus pruebas, los payloads y las importaciones siguen donde estaban.
3. **Un dispositivo que quedó atrás**: `POST /api/sync` con `epoch: 1` responde 409 `epoch_mismatch` con `{epoch: 2, revision}` y no escribe nada. `GET /api/progress` da la foto vacía con `resetAt`.
4. **Dos resets con la misma época**: el segundo responde 409 `epoch_mismatch`.
5. **El cuarto reset del día**: 429 con `Retry-After`.

**Con el stack**, se puede ver con `npm run api:import:check` (escenario 14).

## 9. Restaurar con el export de antes (US5.4, FR-028, SC-005)

**Automático** (`ResetEndpointTest`):

1. Se importa `master-2a278ad-export` y se guarda su proyección.
2. Se hace «Borrar todo».
3. Se vuelve a importar el mismo archivo. Responde 409 `import_needs_confirmation`, porque `resetAt` no es null; con `confirm`, **201**, nunca un 200 vacío.
4. La proyección es igual a la del paso 1. Los intentos legados se reusan: no se insertan otros y los punteros vuelven a ellos.

## 10. La ejecución que cierra después del reset (US5.6, FR-044)

**Automático** (`RunAfterResetTest`). Una ejecución corriendo cuando llega el reset:

- queda con su pedido de cancelación, y al cerrarse deja un intento `canceled` en la época 1;
- si la cancelación falló, el cierre deja un intento `passed` en la época 1.

En los dos casos, la foto de la época 2 sigue vacía, la revisión no cambia y `RunInvariants` no encuentra nada.

## 11. Los límites (SC-008, FR-036)

**Automático** (`ImportThrottleTest`, `ImportRouteTest`, `qa/nginx-api-blocks-check.ts`, `PhpLimitsTest` y `smoke.sh`):

- **El ritmo.** La 4.ª importación de la hora y el 4.º reset del día reciben 429 con `Retry-After`.
- **El crudo.** Uno de 10.485.761 bytes recibe 422, y uno de 10.485.760 pasa.
- **El cuerpo.** Uno de 24 MiB más un byte recibe 413 de Nginx.
- **PHP.** `post_max_size` es `24M`.

## 12. La poda del crudo (US7.3, FR-037, FR-055)

**Automático** (`PruneImportPayloadsTest`): con el reloj fijado, un crudo de hace 90 días y 1 ms pasa a NULL; uno de 90 días menos 1 ms se queda. El sha256 y el informe quedan, y un reintento del mismo crudo en la época se sigue detectando (200).

**Con el stack**: `docker compose exec php php artisan progress:prune-import-payloads` informa cuántos crudos podó y sale con 0.

## 13. Los registros no llevan texto (US7.5, FR-057)

**Automático** (`ImportLogsWithoutTextTest`): una cadena centinela en el crudo, en un borrador, en una reflexión y en una nota, más un error de base forzado, no deja la cadena en ningún registro ni en la excepción.

**Con el stack**, la misma corrida no deja la cadena en `docker compose logs php taller scheduler`.

## 14. De punta a punta con el stack, y la medición (FR-087, SC-010)

**`npm run api:import:check`**:

- abre una cuenta de prueba;
- importa las tres fixtures por Nginx (201 y después 200);
- comprueba la foto: 11 ejercicios con `proof` legado y 9 sellos;
- confirma la contraseña, borra todo y comprueba el 409 de la época vieja;
- reimporta con confirmación;
- comprueba el 413;
- y mide una importación sintética de 274 ejercicios con borradores de 30.000 caracteres: la duración, el tiempo con el candado tomado y la memoria pico de la línea `progress.import.applied`.

Imprime las cifras junto al `memory_limit` vigente; todavía no hay un objetivo. Al terminar, retira la cuenta y comprueba que no queda ninguna fila suya.

## 15. La compuerta (FR-088, SC-011)

En este orden, anotando el resultado real:

1. `npm ci && npm run build && npm test && npm run lint && npm run format:check`;
2. `git diff --check`;
3. `npm run api:test`, también con `-- --order-by=random`;
4. `npm run api:format:check` y `npm run api:analyse` (0 errores en el nivel 9, sin baseline);
5. con el stack: `npm run api:smoke`, `npm run api:content:check` y `npm run api:import:check`.

Lo que no se pueda correr se informa como límite, nunca como «pasó».
