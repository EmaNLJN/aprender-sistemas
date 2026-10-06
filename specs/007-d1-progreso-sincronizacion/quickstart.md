# Quickstart: validar D1a

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contratos**: [http.md](./contracts/http.md) y [merge-rules.md](./contracts/merge-rules.md)

Escenarios que prueban D1a de punta a punta, con sus comandos y lo que tiene que pasar. Los marcados «automático» los corre una prueba o un check; el resto los corre el coordinador al cerrar (tarea T020). Ninguno se ejecutó al planificar, salvo los valores del escenario 1, que salen de una copia de `master` (2426bae) en el scratchpad.

Prerrequisitos: la línea de base de [plan.md](./plan.md) (C3a y B2 integrados), `.env` con `sh backend/api/scripts/init-env.sh`, `export COMPOSE_PROJECT_NAME=taller-d1a-<dueño>` y, para los escenarios 4 a 11, el stack levantado (`docker compose up --build -d --wait`).

## 1. El id de etapa, byte a byte (US6.1, FR-046 a FR-050, SC-007)

**Automático** (permanente): `node qa/content-records-check.ts` y `node qa/curriculum-meta-check.ts` exigen que cada etapa publicada tenga exactamente las claves `id`, `title`, `task`, `why`, `done` y que su `id` sea el de `workshopSteps` del meta en la misma posición. `npm run api:test -- --filter=WorkshopRecordsTest` y `--filter=ContentRoundTripTest` lo exigen en PHP, y `ImportContentTest` exige que el primer import después del cambio escriba exactamente las 100 filas de `workshop_steps`.

**De una vez**, al implementar la tarea T007, con la copia de antes del cambio y la de después:

```sh
BEFORE=$(mktemp -d)
git archive <commit anterior al cambio> content tools/content frontend/src package.json package-lock.json tsconfig.json | tar -x -C "$BEFORE"
ln -s "$PWD/node_modules" "$BEFORE/node_modules"
node tools/content/build-curriculum.ts "$BEFORE"          # el documento y el meta de antes
npm run curriculum                                        # el de después
node <script de reference-merge.md, sección 8> "$BEFORE" "$PWD"
```

El script termina con `OK: 100 etapas; document 4555e850 (antes ef8f5715); 4 porciones cambian`. Comprueba, en este orden: que sólo cambian las cuatro porciones de talleres y el `documentHash`; que los 274 ejercicios conservan sus tres huellas, `workshopSteps` queda igual y cada etapa tiene las claves `id,title,task,why,done` con el `id` del meta; que quitar los `id` de las etapas del documento nuevo da **los mismos bytes** que el documento de antes, y los mismos que cada porción de antes; y que el volcado de `tools/content/dump-globals.ts`, sin los `id` de las etapas de los cuatro grupos `SYSTEMS_*`, da los mismos bytes que el de antes.

Valores medidos al planificar, sobre `master` (2426bae), para el contenido de ese día (si `content/` cambió, valen la relación y el script, no los números):

| Qué | Antes | Después |
| --- | --- | --- |
| `build/curriculum.json` (sha256) | `ef8f57154734653554d40a43934c97f34ed550aad54867e31b197365355803d4` | `4555e8500e6ef5bd38cdaf46010d3f14e3345d7ec0c69aea983acfe67f62fbb6` |
| `Content-Version` (los primeros 32 hexadecimales) | `ef8f57154734653554d40a43934c97f3` | `4555e8500e6ef5bd38cdaf46010d3f14` |
| Tamaño del documento | 1.357.065 bytes | 1.359.465 (+2.400: cien líneas de `"id": "eN",`) |
| `workshops.lowlevel` | `1aca2d37dba1ed6c39bf240fa23f0c74c42a3fec77ff1151eb14bcf179d0ca89` | `ebe9d1a3e14d99b05b4576301478a4624626cd0d14df1af6239c33a3b9c0ae12` |
| `workshops.infra` | `8c8efbdb6b01dec6924a1014ccf9f4e4d509d070ce650d291991a59fe93d048c` | `39c92d2f0c223bec724b519c1aada12747f07e4963020c2d3a1aa43de83a7dd9` |
| `workshops.play` | `66cca9a3147b38ffdb7bf2e6858863655f3b9a64f31988c96d445cf7bfa4cff3` | `7a4a6a50e266f90dda8aa60b417b38439aaf570b4fd2371055d5de8b547f7877` |
| `workshops.pc` | `18c478daff52ce7b2ce50e06bf3d682cb5c98ccf4b82b43e68380e57d62dc69b` | `f417182be5aa4ccadc7f87995f2ebb5a4e2748d8223c0d3c4cb4d820487cc686` |
| Las otras 13 porciones | las del meta de antes | **idénticas** (`lab.*`, `quests.*`, `cores.*`, `campaign.*`, `atlas.*` y `guide`) |
| Los 274 ejercicios (síntesis de `contentHash`, `gradingHash` y `starterHash`, ordenados por id) | `8ba0ff1647d45cdb973dbeaf3353f89987e1c80425cdecd53ad739370c1e7eea` | **idéntica** |
| Cada porción de talleres, en bytes compactos | 25.728, 26.030, 23.013 y 5.614 | +320, +320, +320 y +40 (32, 32, 32 y 4 etapas por 10 bytes) |
| Volcado de `dump-globals` (sha256) | `cd1f9e6240e291ecdcfbd9bb6c5d652d196663790c1a78bef06600d777b85745`, 1.153.582 bytes | `859771e276be9dc757c25388fd617df7d8667ffab176992e82d79cf6e1dd6fa1`, 1.154.582 (+1.000: cien `"id":"eN",`) |
| `qa/fixtures/workshop-steps-v1.json` | sin cambios | `git diff --stat` vacío |

**El primer import** (US6.1 y R16 de [research.md](./research.md)) sobre una base con el contenido de antes. Con el stack: `docker compose exec php php artisan content:import --dry-run` informa

```text
Simulación con el contenido sha256 4555e850…: no se escribió nada.
Filas escritas: workshop_steps 100
Filas retiradas: ninguna
Ejercicios nuevos: ninguno
Cambios de corrección: ninguno
Cambios de texto: ninguno
Retirados: ninguno
Reactivados: ninguno
Filas activas: <las mismas de antes>
```

y, sin `--dry-run`, deja **un registro más** en `content_imports` (con el `document_hash` y las cuatro huellas de porción nuevas). Es lo que rompe a propósito el criterio de C6 «desplegar no escribe filas»: por única vez. Un segundo `content:import` no escribe nada (`El contenido ya está importado`). Después, `npm run api:content:check` pasa con las 17 porciones idénticas al generador a través de Nginx, y `GET /api/workshops?domain=lowlevel` trae el `id` de cada etapa.

## 2. El fixture compartido (US7.1, FR-080 a FR-084, SC-002)

**Automático**: `node qa/merge-fixture-check.ts` (en `npm test`) y `npm run api:test -- --filter=MergeFixtureTest`.

1. `node qa/merge-fixture-check.ts` termina con `merge-fixture-check: 277 casos de fusión (277 corridos en TypeScript), 43 del servidor y 25 tipos de campo PASS.`
2. `npm run api:test -- --filter=MergeFixtureTest` corre los 275 casos de fusión contra el escritor con MySQL real (los dos `only: ts` quedan afuera) y los 43 del servidor a través de `SyncService`: cada uno da el estado y el `changed` escritos a mano, y la revisión de la fila y la de la cabecera suben sólo cuando `changed` es verdadero.
3. `sha256sum -c qa/fixtures/shared/merge-cases.sha256`, desde `qa/fixtures/shared/`, dice `OK`. Editar un caso sin tocar la huella hace fallar los dos lectores con «es un fixture congelado».
4. **Mutaciones.** Se aplica cada fila de [merge-rules.md](./contracts/merge-rules.md), sección 9, sobre el lado que dice, se corre el check o Pest y se restaura: tiene que fallar con la cantidad de casos que dice la tabla (M1 a M8 en TypeScript con 36, 31, 31, 8, 2, 18, 2 y 2; M1 a M10 en PHP). El resultado va en el mensaje del commit de T006 y de T010. Un caso mal escrito a mano, uno que falta o un tipo de campo de más hacen fallar el check de TypeScript sin tocar ninguna regla.

## 3. El esquema (FR-051, FR-053, FR-059, SC-009)

**Automático**: `npm run api:test -- --filter=SchemaTest`, `--filter=ProgressMigrationsTest` y `--filter=ProgressEnumFkTest`.

Con el stack, para ver las tablas:

```sh
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -e "
  SELECT TABLE_NAME, COUNT(*) AS columnas FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = \"taller\"
  AND TABLE_NAME IN (\"sync_operations\",\"drafts\",\"campaign_checkpoints\",\"workshop_progress\",\"workshop_observations\",\"workshop_step_marks\",\"route_marks\",\"route_quiz_answers\",\"route_notes\",\"preferences\")
  GROUP BY TABLE_NAME;"'
```

Tiene que dar 7, 8, 9, 13, 8, 10, 9, 7, 8 y 12 columnas (91), 18 claves foráneas (o 21, si D32 eligió `VARCHAR`), los seis `CHECK` con nombre (`sync_operations_status_check`, `campaign_checkpoints_passed_check`, `workshop_progress_flags_check`, `workshop_step_marks_marked_check`, `route_marks_marked_check` y `preferences_focus_minutes_check`) y ninguno que nombre una columna `DATETIME`. Un `DELETE FROM users WHERE id = ?` de una cuenta con las diez tablas y las dos de B2 pobladas no falla y no deja filas, y la búsqueda de punteros cruzados entre cuentas da 0.

## 4. Dos dispositivos convergen (US2.1 y US2.2, SC-002)

**Automático**: `npm run api:sync:check` (tarea T018), que abre una cuenta de prueba con `qa/lib/api-account.ts` (C3a) y la retira al terminar. Dos clientes A y B son dos sesiones de la misma cuenta, cada una con su cola y su `knownRevision`:

1. A edita `exercise.reflection` («A», `t1`) y `workshop.note`; B edita `exercise.reflection` («B», `t2` mayor que `t1`) y `route.note`; los dos sin conexión.
2. A sincroniza, después B, después A otra vez. Después B, A, B en una cuenta nueva.
3. En los dos órdenes, `GET /api/progress` de A y de B es **la misma foto** (salvo `serverTime`): la reflexión es «B» (el reloj más nuevo), la nota del taller es la de A y la del recorrido, la de B. La respuesta del primero que sincroniza no trae lo del otro; la del segundo sí, en `changes`, y trae el valor ganador de lo que perdió.

## 5. Reintentar es seguro (US2.7, SC-003)

**Automático** (`SyncEndpointTest`) y en el check de punta a punta: el mismo lote tres veces da `applied` una vez y `duplicate` las otras dos, y la revisión sube una vez; el mismo `id` con otro contenido da `uuid_reused` y no pisa; el mismo lote enviado a la vez desde dos pestañas (`Promise.all`) aplica una vez y sube la revisión una vez; después de la poda (14 días), reenviar la operación vieja la aplica de nuevo y no pisa un valor más nuevo.

## 6. Un dispositivo con el reloj adelantado (US2.3, FR-002)

**Automático** (`serverCases` del fixture) y a mano con el stack: un lote con `sentAt` una hora adelantado y un `at` cinco segundos antes queda fechado cinco segundos antes de la hora del servidor (`GET /api/progress` lo muestra en `reflection.at`), y `sync_operations.clock_offset_ms` guarda `-3600000` aproximadamente. Un segundo dispositivo con el reloj bien que escribe 30 segundos después gana.

## 7. La foto y el delta se reproducen (FR-017, FR-023, SC-006)

**Automático** (`SnapshotDeltaTest` y el check de punta a punta): después de una secuencia de lotes con operaciones de los dieciséis tipos, incluidas lápidas, la foto de una revisión más el delta hasta la siguiente son **iguales a la foto completa**: 0 diferencias, también para una fila que cambió el cierre de B2 (`RunCloser::close` en la prueba). Fuera de «Borrar todo» (D1b), 0 filas se borran. Un `knownContentVersion` distinto, un `knownRevision` en 0 o uno mayor que el del servidor dan `full: true`.

## 8. La época (US5.3, FR-016, FR-043)

**Automático**: con una cuenta que ya sincronizó, `UPDATE progress_heads SET epoch = 2 WHERE user_id = ?` (es lo que hará «Borrar todo», de D1b) y un `POST /api/sync` con `epoch: 1` responde **409 `epoch_mismatch`** con `{epoch: 2, revision}`, sin escribir nada y sin recordar los UUID del lote; con `epoch: 2` se aplica.

## 9. Los límites (FR-018, FR-056, SC-008)

**Automático** (`SyncThrottleTest`, `qa/nginx-api-blocks-check.ts` y `smoke.sh`): la 61.ª sincronización del minuto recibe 429 con `Retry-After`; un lote de 201 operaciones recibe 422 y no aplica nada; un cuerpo de 2 MiB más un byte a `POST /api/sync` recibe 413 de Nginx antes de PHP.

## 10. El contenido cambia (US6.3 y US6.4)

**Automático**: con otra versión de contenido importada, la siguiente sincronización responde `full: true` con la `contentVersion` nueva, y una prueba aprobada cuyo `grading_hash` cambió sale con `proof.state: "changed"` sin que se borre nada; un ejercicio retirado con progreso se lee en la foto y una operación sobre él se aplica.

## 11. Los registros no llevan texto (FR-057, US7.5)

**Automático** (`LogsWithoutTextTest`) y con el stack: una corrida con una cadena centinela en una reflexión, un borrador, una nota del taller y una del recorrido, y con un error de base forzado, no deja la cadena en `docker compose logs php taller scheduler`, y ninguna ruta de D1a recibe un `user_id`.

## 12. La medición (SC-010, una medición y no un criterio)

`npm run api:sync:check` imprime, con el stack real: el tamaño de la foto completa de una cuenta con los 274 ejercicios con intento (sembrados por SQL), el del lote mayor admitido (200 operaciones, sin pasar de 2 MiB), y la mediana y el p95 de `POST /api/sync` con 30 cuentas sincronizando a la vez, junto con la estimación del ADR (1.000 cuentas, un lote cada 10 segundos: 100 pedidos por segundo contra PHP-FPM con 12 a 16 hijos). Todavía no hay un objetivo: las cifras van al mensaje del commit y al PR.

## 13. La compuerta (FR-088, SC-011)

En este orden, anotando el resultado real: `npm ci && npm run build && npm test && npm run lint && npm run format:check`, `git diff --check`, `npm run api:test` (también con `-- --order-by=random`), `npm run api:format:check`, `npm run api:analyse` (0 errores en el nivel 9, sin baseline) y, con el stack, `npm run api:smoke`, `npm run api:content:check` y `npm run api:sync:check`. Lo que no se pueda correr se informa como límite, nunca como «pasó».
