# Research: D1a · Sincronización del servidor

**Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Cada decisión dice qué se eligió, por qué, qué se descartó y cómo se verificó. Las que cambian algo del ADR 0006 o completan algo que la spec deja abierto llevan la marca **(propuesta del plan)** y se resumen en «Supuestos provisionales» de [plan.md](./plan.md). Lo que corrió al planificar está en R22.

## R1. La fusión en TypeScript entra en D1a **(propuesta del plan)**

- **Decisión.** D1a entrega, además de PHP, un módulo puro de TypeScript con las reglas de fusión (`frontend/src/features/progress-sync/model/merge-rules.ts` y `field-kinds.ts`) y un check de `npm test` que corre el fixture compartido contra él. El cliente de D1c (cola, almacenes, transporte) se monta sobre ese módulo. Lo lleva un dueño de TypeScript (F).
- **Por qué.** FR-080, FR-082 y SC-002 piden dos implementaciones de cada regla y un solo fixture. Sin un lector en TypeScript, D1a congelaría un formato que ningún código de TypeScript leyó, y D1c encontraría los problemas de forma **después** del congelado. Con el módulo, el formato lo validan dos implementaciones antes. El pedido de esta tarea lo dice igual: el fixture «que corren TypeScript y Pest».
- **Alternativa descartada (B).** Dejar la mitad TypeScript de SC-002 para D1c. Es más barato para D1a, pero el fixture quedaría validado sólo por PHP y su forma se probaría tarde.
- **Costo.** D1a cruza dos pilas, y la tabla de partición de la spec le asignaba «PHP y SQL (Pest) y el check del generador». El módulo no tiene interfaz ni React, y su primer consumidor es el check. La carpeta `features/progress-sync` es provisoria: D1c puede renombrarla (mover dos archivos es mecánico) y es quien le pone su API pública.
- **Si el usuario prefiere B**, se quita la tarea T006 y, de T005, la parte que corre los casos en TypeScript; el check conserva la forma, la cobertura y la huella.

## R2. El fixture: dónde vive y cómo se congela

- **Decisión.** `qa/fixtures/shared/merge-cases.json`, con su huella `merge-cases.sha256` y los diez hitos en `route-milestones.json`. Todo se describe en [merge-rules.md](./contracts/merge-rules.md), sección 8.
- **Por qué ahí.** La imagen de pruebas de la API sólo ve lo que su Dockerfile copia. B2 ya resolvió el problema para el fixture de su plantilla: la etapa `dev` de `backend/api/Dockerfile` hace `COPY --from=repo qa/fixtures/shared tests/Fixtures/shared` (su tarea T007), y D1a depende de esa línea en lugar de sumar otra. Se comprobó que el `.dockerignore` de la raíz no excluye `qa/` y que Compose ya declara el contexto adicional `repo` para la imagen de pruebas (`docker/compose.yaml`, servicio `test`).
- **Cómo se congela.** Esperados escritos a mano desde el contrato; una huella en el formato de `sha256sum` que los dos lectores recalculan; nunca se regenera para que un check pase; y una tabla de mutaciones que el fixture tiene que detectar (merge-rules.md, sección 9).
- **Descartado.** Copiar el fixture a `backend/api/` (dos copias: lo que FR-080 prohíbe); montarlo con un volumen (cambia el servicio `test` y su entorno); generarlo en la construcción de la imagen (los esperados saldrían de código).

## R3. El modelo neutro, la matriz y a qué nivel corre cada lado

- **Decisión.** El fixture describe escrituras `{value, at}` y estados por regla, sin SQL ni almacenes. PHP lo corre a nivel del **escritor** (`OperationProcessor::apply`) y TypeScript, con las funciones puras; los casos del servidor (reloj, `stale_content`, rechazos) corren sólo en PHP, a través de `SyncService`.
- **Por qué el escritor.** Las situaciones `empty-incoming` traen una escritura sin reloj, y `/api/sync` nunca la envía (una operación siempre trae `at`): es la importación de D1b. El escritor es el mismo para las dos rutas, así que probarlo ahí prueba lo que D1b va a usar.
- **La matriz.** Las cinco situaciones de FR-081 en los dos órdenes de llegada son diez casos por tipo; con ellos, la fila que no existe (la rama `INSERT`) y la escritura idéntica (la que no debe subir la revisión) son doce. «Más nuevo» y «más viejo» son dos lecturas de las mismas dos escrituras según cuál llega primero: la propiedad de convergencia (mismas escrituras, mismo resultado, salvo con relojes iguales) se comprueba **sin una regla de fusión**, agrupando los casos por sus escrituras.
- **Cada tipo con su matriz completa.** 25 tipos, 277 casos. Un orden de asignaciones equivocado en `reflection` no puede pasar porque `route_notes` esté bien: cada tipo es una sentencia distinta. El registro de tipos de PHP y el de TypeScript tienen que ser iguales al del fixture (ése es el mecanismo concreto de «una regla sin caso rompe la prueba»).
- **`only`.** Dos casos (`true-then-false` de las banderas) sólo los corre TypeScript: una operación no puede traer `false`, pero una fila del servidor que el cliente aplica sí.
- **Cada caso lleva su `changed`.** FR-010 y SC-006 viven dentro del `ON DUPLICATE KEY UPDATE`: si una escritura que no cambia nada estampara la revisión, el delta se volvería ruido; si una que cambia no la estampara, se perdería. Pest comprueba la revisión de la fila y la de la cabecera en cada caso.

## R4. El SQL de las escrituras: guardas primero, `CAST(… AS BINARY)` y filas afectadas

- **Decisión.** Cada operación es un `INSERT … AS n ON DUPLICATE KEY UPDATE` (D09, nunca `VALUES()`). Las dos primeras asignaciones, `revision` y `updated_at`, llevan la guarda «esto cambia la fila»; después los valores; al final, los relojes. La guarda compara los textos con `CAST(… AS BINARY)`. El efecto (`changed`) sale de las filas afectadas: 1 insertó, 2 cambió, 0 quedó igual. Detalle y ejemplo en [data-model.md](./data-model.md), sección 4.
- **Por qué las guardas primero.** MySQL evalúa las asignaciones de izquierda a derecha y cada una ve las anteriores ya aplicadas (D09). Si `revision` se asignara después de los valores, la guarda compararía contra lo nuevo y nunca estamparía.
- **Por qué `CAST(… AS BINARY)`.** La colación de la conexión, `utf8mb4_es_0900_ai_ci`, iguala `Casa` y `casa` y `cafe` y `café`. Con esa comparación, una reflexión que sólo cambia de mayúsculas no estamparía la revisión pero igual cambiaría la fila: el delta no se la daría a otro dispositivo. D03 lo dice de otro modo («los cambios se detectan en PHP, nunca comparando textos en SQL»): acá la comparación es en SQL y es binaria. Se usa `CAST(… AS BINARY)` y no el operador `BINARY`: el manual de MySQL 9.7 lo da por deprecado («you should expect its removal in a future version of MySQL») y lo reemplaza por el `CAST`. Los casos `text/*` del fixture lo cubren.
- **Descartado.** Leer, fusionar en PHP y escribir: D22 lo descarta, y el fixture probaría una función de PHP y no el SQL; `REPLACE`, que borra y reinserta; un procedimiento almacenado, que esconde la regla de las pruebas.
- **Filas afectadas.** `config/database.php` no activa `PDO::MYSQL_ATTR_FOUND_ROWS`, y el código de `Connector` y `MySqlConnector` de Laravel 13.x tampoco (se leyó su fuente al planificar): el 0 es posible. `AffectedRowsTest` lo prueba contra MySQL 9.7 con PDO nativo antes de que algo dependa de eso. **Si falla**, el respaldo es una consulta por tabla tocada, `SELECT 1 … WHERE user_id = ? AND revision = ? LIMIT 1`, después del lote: el costo es una lectura por tabla y no cambia ninguna firma.

## R5. El vocabulario de operaciones y el sobre **(propuesta del plan)**

- **Decisión.** Dieciséis tipos, cada uno con los campos de su grupo de campos (http.md, sección 3.2); `format` vale `2` (la versión del formato local v2 del ADR 0004 §4; el servidor acepta el vigente y el anterior, y hoy sólo hay uno); como máximo **200 operaciones** por lote; los instantes, ISO 8601 con milisegundos y `Z`.
- **Una operación por grupo de campos**, no por columna: la respuesta de una predicción y su bandera viajan juntas, porque el `stale_content` decide los dos a la vez; el grupo de repaso se escribe entero con un solo reloj.
- **El tope de 200.** El cuerpo de 2 MiB acota los bytes, no el trabajo: cada operación son de uno a tres `INSERT … ON DUPLICATE KEY UPDATE` más la fila del registro, con el candado de la cuenta tomado. Doscientas son unas 600 sentencias, del orden de medio segundo (estimación, sin medir). SC-010 mide el lote mayor y la mediana con 30 cuentas; el valor está en `config/progress.php` para ajustarlo sin tocar el código.
- **Descartado.** Operaciones genéricas `{path, value}` al estilo de JSON Patch: validarían peor (un tipo por campo es lo que permite rechazar con `invalid` lo que no es de ese tipo) y dejarían la regla en un diccionario de rutas.
- **Instantes ISO y no milisegundos enteros.** El contrato de C3a usa ISO en todo; `Date.prototype.toISOString()` da exactamente el formato, y el servidor lo exige con una expresión regular estricta (así no hay dos escrituras para el mismo instante y el hash de una operación es estable).

## R6. `NULL` en las fechas que sólo crecen **(propuesta del plan)**

- **Decisión.** En `dated-flag` y `observed`, una fecha ausente es **desconocida**: la primera fecha conocida la completa, y la más temprana de las conocidas gana. En la familia con reloj, en cambio, un reloj ausente es «anterior a todo».
- **Por qué.** ADR 0004 §3: los `LEAST` y `GREATEST` se protegen con `COALESCE` porque devuelven `NULL` si algún argumento lo es; proteger es tratar el `NULL` como «no sé» y quedarse con el otro. La spec dice sólo «fecha más temprana». La otra lectura («`NULL` es anterior a todo») dejaría una fecha legada sin completar nunca, y el XP por día, que el cliente deriva de esas fechas, no la vería.
- **Cómo se cambia.** Es un cambio de los casos `legacy-date-filled` y `incoming-without-date-ignored` del fixture (y de `LEAST(COALESCE(…))` en el SQL): se registra como hallazgo para la spec.

## R7. La corrección de reloj y su piso

- **Decisión.** `efectivo = min(at + (ahora − sentAt), ahora)` (FR-002, D22). Equivale a `ahora − (sentAt − at)`: la **edad** que la operación tenía al enviarse, vuelta a anclar en el reloj del servidor; el error absoluto del dispositivo se cancela, y por eso no hace falta acotar `sentAt`. Un `at` posterior a `sentAt` queda en `ahora`. Un efectivo anterior a 2020-01-01 se rechaza con `out_of_range` **(propuesta del plan)**: sin un piso, una edad absurda (un reloj en 1970) escribiría un reloj inservible.
- **El desfase** que se guarda es `ahora − sentAt` en milisegundos, acotado al rango de `INT`.
- **Un caso que la spec pide y que sale solo**: un dispositivo con el reloj adelantado no gana «para siempre»; `clock/ahead-device-does-not-win-forever` lo prueba con dos lotes.
- **Descartado.** Rechazar un `sentAt` lejano de `ahora`: rechazaría un dispositivo con el reloj mal puesto aunque sus escrituras fueran correctas por la corrección. El aviso a los 2 minutos es del cliente (FR-078).

## R8. Idempotencia: el hash, el `duplicate` y lo rechazado

- **El hash** es el sha256 de la forma canónica del objeto recibido sin su `id` (claves ordenadas, sin espacios, texto sin escapar): lo que llegó, no lo que se interpretó. Una operación inválida también tiene hash, y se registra con su rechazo (FR-014).
- **`duplicate` lleva el `reason` original** **(propuesta del plan)**. La respuesta de un lote puede perderse; si la operación era `stale_content` o fue rechazada, el reenvío saldría `duplicate` a secas y el cliente nunca lo sabría. El `reason` ya está en la fila (`sync_operations.reason`), así que echarlo no cuesta nada; el conjunto de estados no cambia.
- **Dentro de un lote**, un UUID repetido es `duplicate` o `uuid_reused` contra la primera ocurrencia; los UUID conocidos se leen con una sola consulta antes de empezar y se completan en memoria.
- **Después de la poda**, un UUID viejo se vuelve a aplicar y no pisa nada más nuevo, porque lo decide el reloj (y el reloj efectivo de un reenvío es el mismo: depende de la edad, no de cuándo se envía).

## R9. `stale_content` en el quiz del recorrido **(propuesta del plan)**

- **Decisión.** Las cuatro operaciones que responden una pregunta (`exercise.prediction`, `checkpoint.answer`, `workshop.prediction` y `route.quiz`) salen `stale_content` si su `contentVersion` no es la vigente, y la respuesta se guarda por la regla de reloj. El quiz no tiene bandera que retener, pero el cliente tiene que volver a evaluarla igual: las opciones o la respuesta correcta pueden haber cambiado.
- **Por qué.** La spec (FR-007) lista el quiz entre las respuestas con versión, y el ADR habla de la «bandera monótona» que sólo algunos tienen. Decidir por el tipo de operación y no por si hay bandera hace que el cliente trate las cuatro igual.

## R10. La foto: áreas planas, dos punteros y los estados del cable

- **Decisión.** La foto y el delta comparten forma: un arreglo por tabla, agrupados en las seis áreas de la spec (http.md, sección 5). Los hijos de taller (`objectives`, `steps`) van en arreglos propios y no anidados: cada fila tiene su revisión y un delta puede traer una etapa sin traer el taller.
- **Resúmenes de intentos.** Sólo la última aprobada (`proof`) y el último intento (`lastAttempt`) de cada ejercicio, con el veredicto de sus pruebas: es lo que el ADR §7 pide («resúmenes de `attempts` y `attempt_tests` unidos por `user_id` y `exercise_id`»), acotado por el número de ejercicios. El historial no entra: es un recurso de B2 sin dueño.
- **`proof.state`.** `current`, `changed` y `legacy`, en inglés y en minúscula como los demás enums del ADR §8. Se calcula al leer, unido por `user_id` y `exercise_id` (D29).
- **`userId`** en la foto (FR-020), y `full` en el delta: el cliente necesita saber si reemplaza o fusiona.
- **`campaign.seals`** va como `[]` hasta D1b, que crea `campaign_seals` y fija la forma de sus filas: así el contrato del arreglo existe desde el primer día y D1b sólo llena la consulta.

## R11. Un lector y dos usos

- **Decisión.** `ProgressSnapshotReader` tiene dos puertas: `areas(userId, sinceRevision)` no abre una transacción y corre dentro de la de quien llama (la sincronización, con el candado tomado: lee lo que ella misma acaba de escribir); `read(...)` abre una transacción de sólo lectura en REPEATABLE READ, lee la cabecera, calcula el validador y, si no cambió nada, **no lee el resto** (el 304). La exportación del titular (C3b) usa `areas(userId, null)` (FR-023).
- **Por qué.** Un lector que abriera su propia transacción dentro del candado la anidaría y perdería el aislamiento de escritor; uno que nunca la abriera daría una foto con dos instantes en `GET`.

## R12. Los middleware de recorte y `''`

- **El problema.** `TrimStrings` y `ConvertEmptyStringsToNull` corren sobre todo el cuerpo JSON: recortarían los espacios de una reflexión o de un borrador y convertirían `''` en `NULL`, y «`''` es un valor» (una nota vacía gana por su reloj; una reflexión borrada a mano es `''`, no «nunca se escribió»). B2 los excluye de `/api/runs` por la misma razón.
- **Decisión.** El coordinador agrega `api/sync` a las excepciones de los dos middleware en `bootstrap/app.php` (línea de integración). Lo prueban los casos `text/to-empty-string` y `text/whitespace-kept` de los cuatro tipos de texto, **a través de HTTP**: sin esa prueba, la mutación M11 pasaría el fixture del escritor.
- **No verificado:** que la firma `trimStrings(except: […])` con un cierre acumule con la de B2 en Laravel 13; es la misma que usa el plan de B2.

## R13. El bloque de migraciones

- **Decisión.** `2026_10_06_100001` a `100099`: D1a usa la 100001 a la 100010, y la 100011 y la 100012 quedan para `progress_imports` y `campaign_seals` de D1b.
- **Por qué otra fecha.** C3a reservó `2026_10_05_200001` a `200099`, B2 el `300001` a `300099`, y las dos dicen que D1 y C3b toman «un bloque posterior»; C3b todavía no tiene plan. Una fecha posterior ordena las tablas de D1a después de todas las que referencian (C2, C3a, B2) y no choca con ningún bloque `2026_10_05_*`, sea cual sea el que elija C3b. Hallazgo para C3b y para el coordinador.

## R14. `language` en las tablas de taller (D32)

- **Decisión.** El DDL de referencia usa `ENUM('rust','go')`; la prueba de D32 (`ProgressEnumFkTest`) decide antes de crear las tres tablas, y [data-model.md](./data-model.md), sección 2.11, trae las dos variantes escritas. La prueba de esquema exige que las migraciones usen la que decidió el experimento.
- **Qué mide.** Si ampliar el `ENUM` al final con `ALGORITHM=INSTANT` funciona en el padre y en el hijo con la clave compuesta, y si la clave sigue intacta. MySQL pide el mismo tipo en las dos columnas de una clave foránea, y modificar una columna de una clave suele exigir copiar: es lo que se mide.

## R15. Los hitos del recorrido

- **Decisión.** `RouteMilestones::KEYS` en PHP (diez valores) y `route-milestones.json` en el fixture compartido, con un check de TypeScript (`qa/route-milestones-check.ts`) que lee los `id` de `milestones` en `frontend/app.js` y exige `rust-` y `go-` más cada uno.
- **Por qué.** `route_marks.item_key` no tiene clave foránea, y sin una lista el servidor aceptaría cualquier clave bien formada: filas sin tope por cuenta. Una lista en PHP es una regla escrita en dos lenguajes (FR-082); atarla a un archivo y a un check la deja a un diff de distancia de la fuente. La F2 del épico del front pasa los hitos a `entities/guide`: cambia la ruta de lectura del check, no la lista. Verificado al planificar: la extracción da los cinco `id` y los diez valores.

## R16. El id de etapa

- **Decisión.** El generador publica `id` en cada etapa: `publishedStep` en `tools/content/workshops.ts` deja de quitar `id` (y sigue quitando `v1Index`). El orden de claves de la etapa publicada es el del YAML, `id`, `title`, `task`, `why`, `done`. `curriculum.meta.json` no cambia (`workshopSteps` sigue con `{id, v1Index}`), ni `qa/fixtures/workshop-steps-v1.json`.
- **En PHP**, `WorkshopStep` acepta `id` entre sus claves, exige que sea el del meta en la misma posición (si no, `InvalidContent` con «regenerá los dos archivos juntos», como el desajuste de cantidad) y lo publica primero. `key_order` de las 100 filas de `workshop_steps` pasa de `["title","task","why","done"]` a `["id","title","task","why","done"]`.
- **Lo que cambia, medido sobre `master` (2426bae) con ese único cambio** (R22): cuatro porciones (`workshops.lowlevel`, `infra`, `play` y `pc`; +320, +320, +320 y +40 bytes en JSON compacto), `documentHash` y por eso `Content-Version` (`ef8f5715…` pasa a `4555e850…`), y el volcado del oráculo (+1.000 bytes, 100 veces `"id":"eN",`, sólo en los cuatro grupos `SYSTEMS_*`). No cambian las demás porciones (13 sobre `master`; con la 18.ª porción de B2, la plantilla del harness, son 14), los 274 ejercicios con sus tres huellas (las de B2 ya movieron 49 `gradingHash` de Go, y D1a no los toca), `workshopSteps` del meta ni el fixture congelado. B2 no toca `curriculum.json` ni el volcado: suma `build/harness.json` y cambia el meta, así que el documento, las cuatro porciones, `Content-Version` y el volcado dan lo mismo con B2.
- **El primer import después de D1a escribe 100 filas** de `workshop_steps` (su `key_order`) y un registro de `content_imports`. **Rompe a propósito** el criterio de C6 «desplegar no escribe filas ni cambia validadores»: C6 lo medía sobre un despliegue sin cambios de contenido, y éste es uno. El informe esperado está en [quickstart.md](./quickstart.md), escenario 1.
- **Ventana de despliegue.** Un `php` anterior que sigue atendiendo después del import lee filas con un `key_order` que su código no conoce, y `KeyOrder::fromRow` lanza si una clave no está en la lista. Sólo ocurre si ese `php` tiene que armar una porción de taller (la caché de cuerpos las deja precalentadas el import), y dura lo que tarda `deploy.sh` en reemplazarlo.
- **Pruebas permanentes y cambio de una vez.** Lo permanente: cada etapa publicada tiene las claves exactas `id,title,task,why,done` y su `id` es el del meta en la misma posición. Lo de una vez (la comparación byte a byte con lo anterior) es un script que se corre al implementar y cuyo resultado va en el commit: depende del contenido de ese día, y no puede ser un check que se rompa con la próxima edición de `content/`.
- **`qa/build-check.ts` falla sin cambios** en una copia limpia de `master` (necesita `dist/`): es del entorno, y no una regresión de este cambio. De los otros 29 checks, 28 pasan antes y después, y el que cambia es `content-records-check.ts`, que afirma la forma vieja de la etapa.

## R17. Nginx: una ubicación exacta que repite el bloque

- **Decisión.** `location = /api/sync { client_max_body_size 2m; … }` repite las directivas de `location ^~ /api/` en el mismo orden (el `set $php_upstream`, `include fastcgi_params`, los `fastcgi_param`, el `access_log`, el `limit_req` y el `error_page 429`): `set` no se hereda a una ubicación anidada. El check estático `qa/nginx-api-blocks-check.ts` de B2 pasa a recorrer las ubicaciones hermanas y exige que sean iguales salvo el tope de cuerpo.
- **El 413** lo responde Nginx antes de PHP, sin `{message, code}`, igual que el de `/api/runs`: un cliente bien hecho parte sus lotes por debajo de 2 MiB y nunca lo ve. D1b agrega la ubicación de `/api/progress/import` (24 MiB) y `post_max_size` de PHP.

## R18. La poda de `sync_operations`

- **Decisión.** `progress:prune-sync-operations` (un comando de Artisan, como `taller:prune-sessions` de C3a) borra por lotes de 5.000 con `DELETE … WHERE received_at < ? ORDER BY received_at LIMIT 5000`, usando el índice `(received_at)`, hasta un tope de lotes por corrida. El `scheduler` lo corre cada hora sin solaparse (línea de integración de `routes/console.php`). No es un modelo de Eloquent porque la clave es compuesta.

## R19. Logs y excepciones de la base

- **Decisión.** Ningún log de D1a lleva borradores, reflexiones, notas ni valores de una operación (FR-057): sólo ids, tipos, conteos y estados. Una `QueryException` trae la sentencia con sus valores, que son justo ese texto: `SyncService` la convierte afuera de `within` en `SyncWriteFailed`, sin SQL, sin valores y sin `previous`, y deja un solo registro con el SQLSTATE y el código del driver. La conversión va afuera porque adentro rompería el reintento por interbloqueo de `WriteTransaction`.
- **La prueba** (`LogsWithoutTextTest`) manda una cadena centinela en cada campo de texto, fuerza una `QueryException` con la cadena en sus bindings y exige que ni el log ni la excepción la contengan.

## R20. Lo que D1a le deja a D1b

El escritor (`OperationProcessor::apply`) acepta un reloj nulo, que es lo que D1b usa para importar; `campaign.seals` ya existe como `[]`; `ProgressTables::STATE` es la lista que D1b recorre para vaciar en «Borrar todo» y a la que suma `campaign_seals`; los códigos `epoch_mismatch` y `client_outdated` ya están, y D1b suma `import_needs_confirmation`; las migraciones 100011 y 100012 están reservadas; y D1b agrega su ubicación de Nginx, `post_max_size` y los limitadores `import` y `reset`.

## R21. Nivel 9

Sin baseline, sin `@phpstan-ignore` y sin casts de `mixed`. Las filas entran por registros (`fromRow`, con `App\Content\Record\RowFields`, que ya estrecha los tipos del driver) y las respuestas, por `toArray()` tipados; las listas tipadas se arman con `foreach`; los arreglos se transforman con Collections y `Arr::` (`backend/api/AGENTS.md`). Los datos de un pedido pasan de `FormRequest` a un registro `readonly` antes de salir del controlador.

## R22. Cómo se verificó al planificar

**Corrió** (sobre una copia de `master` en el scratchpad, sin tocar el repositorio ni usar Docker, PHP ni descargas):

- El generador con el único cambio de R16: cuatro porciones cambian, las otras 13 no (sobre `master` sin B2); los 274 ejercicios conservan sus tres huellas (síntesis `8ba0ff16…`, también medida sin B2); `workshopSteps` queda igual; quitar los `id` de las etapas del documento nuevo da **los mismos bytes** que el documento anterior (`ef8f5715…`), también por porción; y el volcado del oráculo, sin los `id` de los cuatro grupos `SYSTEMS_*`, da `cd1f9e62…`, el de antes. De los 29 checks de `qa/` que pasan en `master`, 28 siguen pasando y falla `content-records-check.ts`, que afirma la forma vieja de la etapa (`qa/build-check.ts` falla desde antes: necesita `dist/`). Los valores están en [quickstart.md](./quickstart.md), escenario 1.
- El módulo de fusión, el fixture de 277 casos, su lector y su check ([reference-merge.md](./reference-merge.md)): pasan; ESLint (0 problemas), `tsc` de `qa` y del front, y Prettier. Se verificó que el check rechaza un caso mal escrito a mano (las propiedades de convergencia y de desempate), un caso que falta, un tipo de campo de más y un fixture editado sin su huella. Las ocho mutaciones de TypeScript de merge-rules.md, sección 9, rompen 36, 31, 31, 8, 2, 18, 2 y 2 casos.
- La extracción de los hitos desde `frontend/app.js`: los cinco `id` y los diez valores.
- La lectura de `config/database.php` y del código fuente de Laravel 13.x (`Connector` y `MySqlConnector`) para las filas afectadas.

**No corrió** (no hay PHP, Composer ni MySQL en el host, y esta tarea no usa Docker): todo el PHP, el SQL de las tablas y de las escrituras, la configuración de Nginx, el resto de los scripts y el comportamiento de MySQL 9.7 (filas afectadas, la guarda con `CAST(… AS BINARY)`, el experimento de D32, las claves compuestas). Son referencia: obligan las firmas, los contratos y las pruebas. La lista de lo pendiente está en [plan.md](./plan.md), «Lo que quedó sin verificar».
