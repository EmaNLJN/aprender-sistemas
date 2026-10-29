# Feature Specification: C5 · Estadísticas del admin

**Feature Branch**: `025-c5-estadisticas` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Borrador, con cinco preguntas abiertas para el clarify (Q1 a Q5); sin plan

**Input**: Ítem **C5** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Estadísticas del admin»: dar al admin métricas de uso sin exponer nunca el código ni los textos del alumno. Depende de D1 y de B2, y trae abierta la pregunta 6 del ADR 0006, «Qué ve el admin». Lee lo que dejaron B2 ([spec 005](../005-b2-api-ejecuciones/spec.md), PR #31), D1a y D1b ([spec 007](../007-d1-progreso-sincronizacion/spec.md), PR #36 y #39), C3a ([spec 004](../004-c3-identidad-acceso/spec.md), PR #24) y C3b ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md), PR #37), todos entregados. Fuente técnica: el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (**propuesta**: el usuario todavía no lo aprobó), en D06, D20, D31, D33, D35, D38, S5, S6, §4.5, §7, §9, §10, §12 y la pregunta 6 de §13; y el [ADR 0005](../../docs/adr/0005-ejecucion-en-sandbox-propio.md) §5, por la evidencia autodeclarada. Pedido del coordinador del 2026-10-28 (ver «Lo que pidió el usuario»).

## Intención y alcance

**Lo que entendemos.** Desde B2 y D1, el taller guarda en MySQL qué ejecuta cada alumno, qué resuelve, cuánta ayuda pide y cómo avanza en la campaña, los talleres de Sistemas y el recorrido. Quien administra no tiene cómo mirarlo: para saber si un ejercicio está mal calibrado, si una clase se trabó o si la cola alcanza, hoy necesita SQL a mano sobre la base de producción, que además le muestra el código y las reflexiones de todos. C5 le da al admin esas respuestas por la API, ya calculadas y con un límite de privacidad que se prueba: ningún camino devuelve el código, las salidas, las pruebas propias, los borradores, las reflexiones, las notas ni el crudo de una importación, y tampoco algo que permita reconstruirlos o compararlos. Las métricas salen agregadas (del taller entero, por catálogo, por ejercicio y por período) y por cuenta, y se calculan en vivo sobre las tablas que ya existen, sin tablas nuevas. C5 entrega sólo la API y sus contratos, como C3b: las pantallas son de un ítem del front que esta spec propone (Q4). Es para quien administra el taller (y muchas veces enseña con él), para quien opera el sandbox y para quien mantiene el currículo. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Un admin abre un resumen del taller y ve, para el período que elige, cuántos alumnos ejecutaron, cuántos intentos hubo y con qué resultado, cuánto se resolvió y cuántas cuentas e invitaciones hay.
2. Para cada catálogo y cada ejercicio ve cuántos lo empezaron y lo resolvieron, con qué resultados fallan, qué prueba falla más, cuánta ayuda se pidió y qué opción se elige en la predicción. Lo ejecutado en el servidor y lo importado del v1 aparecen siempre por separado.
3. Para una cuenta ve su avance, su actividad y su uso de las cuotas, ejercicio por ejercicio, sin un solo texto suyo (Q1).
4. Quien opera ve la cola y las ejecuciones de los últimos 14 días, con sus estados y sus tiempos, sin el código ni la salida.
5. Una prueba recorre todas las rutas de `/api/admin` con los textos del alumno sembrados y no encuentra ninguno en ninguna respuesta, a ninguna profundidad.
6. Las estadísticas no frenan el taller: no escriben en las tablas de los alumnos, no toman candados, se cortan si tardan y se miden con 5.000 alumnos sintéticos antes de sumar un índice.

**Entra:**

- Las rutas de estadísticas: el resumen con sus series por período, el detalle por catálogo, ejercicio, prueba, mundo, taller y recorrido, la lista de cuentas con su uso (Q2) y el detalle de una cuenta.
- El resumen de uso en la ficha de una cuenta (`GET /api/admin/users/{user}`), aditivo sobre el contrato de C3b: esta spec extiende a la 010.
- `GET /api/admin/runs` y `GET /api/admin/queue`, la operación del sandbox.
- El límite de privacidad: la lista cerrada de lo que nunca sale, la ampliación de la matriz «sin textos del alumno» de C3b (su FR-041) a las rutas de C5 y una prueba de arquitectura.
- El registro de cada consulta de una cuenta en los logs (Q3).
- La caché de 10 minutos de los agregados, el tope de tiempo de cada consulta y la medición con 5.000 alumnos sintéticos y dos años de intentos, con los índices que esa medición pida.

**Queda fuera:**

- **Las pantallas:** las del resumen, el detalle, la cuenta, la cola y las ejecuciones son de un ítem del front que esta spec propone como hallazgo (Q4). C5 entrega la API, sus contratos y sus pruebas.
- **Los rollups diarios** (`exercise_daily_stats`) y la réplica de lectura: son el camino de escala del ADR 0006 §9, con su disparador, y la hoja de ruta los deja fuera de C5. Esta spec mide si el disparador salta (FR-040) y no los construye.
- **Cualquier exportación de admin** (ADR 0006 D33; hoja de ruta, «Fuera»): ni CSV, ni descarga, ni informe. El admin ve en pantalla.
- **Los textos del alumno para tutoría:** leer el código, los borradores o las reflexiones de otra cuenta sería un ítem nuevo, con consentimiento y aviso de privacidad propios (Q1, opción C).
- **Contar los rechazos:** los 429 y 503 de `/api/runs` no dejan filas (spec 005, FR-008 y FR-010), así que C5 no puede contarlos; queda como hallazgo para B2.
- **Cambiar lo que otros escriben:** B2, D1 y C3b no cambian, salvo el contrato aditivo de la ficha y la matriz del FR-041 de C3b, que C5 amplía.
- **Las estadísticas del alumno:** su avance, su XP por día y sus repasos los sigue calculando el cliente (ADR 0006 D31).

**Sin hacer a propósito (YAGNI):** tablas nuevas o columnas nuevas; un índice antes de medir; una caché por cuenta; un interruptor para sumar a los admins a los agregados (ADR 0006 S5 dice «por defecto»; ver Assumptions); comparar períodos o calcular tendencias en el servidor; alertas o avisos por correo; filtros por aula o por grupo, que el taller no modela; un historial de actividad que no sean los intentos; una protección contra estampidas de la caché, con uno o dos admins.

**Actores:** quien administra (rol `admin`, que muchas veces también enseña); quien opera el taller y el sandbox; quien mantiene el currículo; el alumno, cuyos datos se leen y que tiene que poder confiar en el límite; el ítem del front que dibuje las pantallas (Q4); y los ítems que C5 toca o espera: C3b, B2, D1, A4, D1c, C4, F11 y E1.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta (Q1 a Q5).

| Pedido | Fuente |
| --- | --- |
| Dar al admin métricas de uso sin exponer nunca el código ni los textos del alumno | Hoja de ruta, fila de C5 |
| Entra: `/api/admin/stats/*`, `GET /api/admin/runs`, `GET /api/admin/queue`, el resumen en la ficha de usuario y la caché de 10 minutos. Los índices llegan después de medir con 5.000 alumnos sintéticos | Hoja de ruta, «Alcance por ítem», C5 |
| Fuera: los rollups diarios (camino de escala, §9) y cualquier exportación de admin | Hoja de ruta, «Alcance por ítem», C5 |
| C5 depende de D1 y de B2, y cierra en su clarify la pregunta 6 del ADR 0006, «Qué ve el admin» | Hoja de ruta, «Subplanes» y «Decisiones abiertas» |
| Las ejecuciones se retienen 14 días y los payloads de los intentos 90, salvo el de la última aprobación y el del último intento de cada ejercicio | Usuario, clarify de B2 del 2026-10-05 (Q5 de la spec 005) |
| «Borrar todo» borra sólo el estado: los intentos, sus payloads y las importaciones quedan, entre otras cosas para no quitarle historia a las estadísticas del admin | Usuario, clarify de D1 del 2026-10-06 (Q2 de la spec 007) |
| Sin auditoría de logins | Usuario, ADR 0006 R5 |
| La matriz «sin textos del alumno» recorre todas las rutas de `/api/admin/`, también las que sume C5 | C3b, FR-041 (spec 010, entregada) |
| Las pantallas de administración de F12 no traen las estadísticas, y las de C5 no tienen dueño en ninguna hoja de ruta | F12, «Queda fuera» (spec 023); hoja de ruta, «Enmiendas pendientes», C5 |
| La administración se monta como un diálogo desde «Tu cuenta», y F10 la vuelve la ruta `#administracion` | Usuario, clarify del 2026-10-28 (F12-Q1 y F10-Q4) |
| Esta spec deja claras las métricas útiles y su forma (agregadas, por catálogo, por ejercicio, por período y por cuenta), el límite de privacidad con los identificadores que sí salen y si hace falta un umbral de agregación, de dónde salen los datos dado lo que B2 ya borra, y si C5 trae pantalla o sólo API; el clarify trae como mucho cinco preguntas, con la 6 del ADR como primera candidata | Pedido de esta tarea |

**Base del ADR 0006 (propuesta).** El usuario todavía no lo aprobó: la spec lo usa como base y cambia si lo enmienda. La aprobación condiciona la implementación, no la planificación.

| Decisión | Dónde | Qué toma C5 |
| --- | --- | --- |
| Las estadísticas son sólo del admin, se calculan en vivo con una caché de 10 minutos en el store `database` y sus consultas llevan `MAX_EXECUTION_TIME` | D31, D35 | FR-034 y FR-036 |
| El admin ve métricas (resueltos, intentos, ayuda, checkpoints y actividad) y nunca borradores, reflexiones, notas ni código; no hay exportación de admin | D31, D33 | FR-006 a FR-014 |
| Los agregados excluyen a los admins y separan lo ejecutado en el servidor de lo importado; «ejecutado en el servidor» no es «verificado» | D31, S5, §12 | FR-016 a FR-019 |
| Al suprimir una cuenta, las estadísticas dejan de contarla: sus datos no se anonimizan | D06 | FR-035 y «De dónde salen los datos» |
| La «última actividad» sale de `progress_heads.last_activity_at` | S6 | FR-021 |
| Las habilidades `viewStats` y `viewRunMetadata`, sin un `before()` que autorice todo | §4.5 | FR-001 (ver Assumptions) |
| Las rutas y las tablas que leen | §7 | FR-002 |
| C5 no tiene migraciones al principio; los índices entran después de un EXPLAIN sobre 5.000 alumnos sintéticos y dos años de intentos, con `ALGORITHM=INPLACE, LOCK=NONE` y su `down()` | §10, D38 | FR-005, FR-038 y FR-039 |
| Si las consultas del admin pasan de 2 s aun con caché, el paso siguiente son los rollups diarios o una réplica de lectura | §9 | FR-040 |

## Clarifications

*(Vacía hasta el clarify: las preguntas están en «Preguntas abiertas».)*

## Preguntas abiertas

Los requisitos están escritos con la opción recomendada de cada pregunta y llevan «(Q*n*)». El checklist dice qué requisitos cambian con cada alternativa.

**Q1. ¿Qué ve el admin?** *(pregunta 6 del ADR 0006; FR-006 a FR-011, FR-027, FR-029 a FR-031)* El ADR propone «sólo métricas» y deja abierta la tutoría con textos. Pide además que el aviso de privacidad lo diga. Lo que se decida acá va al texto del aviso, que escribe el usuario (F11-Q2).

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Métricas, también por cuenta: resultados, fechas, conteos, ayudas usadas, si acertó una predicción o un checkpoint, la autoevaluación y la actividad por día. Nunca código, salidas, pruebas propias, borradores, reflexiones, notas, ni el crudo ni el informe de una importación; tampoco sus huellas, si existen o cuánto miden, ni la opción que eligió en una pregunta (ésa sale sólo en la distribución de todo el taller). Sin umbral de agregación | El admin ve el ritmo de estudio de cada alumno, día por día, y el aviso de privacidad tiene que decirlo. Un umbral no protege nada, porque el admin ve cada cuenta: en su lugar, cada tasa lleva su `n` |
| B | A, más la opción elegida por cuenta en cada predicción, checkpoint y pregunta del recorrido | Un docente puede ver qué confundió a un alumno. Es más dato personal por cuenta, y la distribución del taller ya dice qué distractor engaña |
| C | A, más leer el código, los borradores y las reflexiones de una cuenta para tutoría | No cabe en C5: cambia D31 y D33, rompe la matriz de C3b (FR-041), pide un consentimiento versionado del alumno, un registro de cada lectura y otro aviso de privacidad, y el payload de un intento se poda a los 90 días. Sería un ítem nuevo, con su ADR |
| D | Sólo agregados, sin vista por cuenta, con un umbral (por ejemplo, un agregado sobre menos de 5 alumnos sale vacío) | Lo más privado. Contradice la hoja de ruta («el resumen en la ficha de usuario») y un docente no puede ver quién se trabó. Con 274 ejercicios y una clase de 20, muchos agregados por ejercicio saldrían vacíos |

**Recomendada: A.** Es la propuesta del ADR y lo que pide la hoja de ruta, y las banderas de acierto ya las decide el cliente (D39): la opción elegida por cuenta no agrega una señal que la distribución no tenga. **Costo:** el aviso de privacidad tiene que nombrar las métricas por cuenta y la actividad por día.

**Q2. ¿Cómo encuentra el admin a los alumnos trabados o inactivos?** *(FR-029)* La hoja de ruta trae el detalle de una cuenta y el resumen en su ficha, pero para saber a quién mirar hace falta una lista. La de C3b (`GET /api/admin/users`) no trae ninguna métrica.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Una ruta nueva, `GET /api/admin/stats/students`: la lista paginada de alumnos con su última actividad, lo resuelto y los intentos de los últimos 7 y 30 días, ordenable por nombre, alta o última actividad y filtrable por inactividad | Una ruta más, que el §7 del ADR no tiene. Las métricas se calculan sólo para la página pedida, así que no ordena por «resueltos»: ordenar por una métrica obligaría a calcularla para todas las cuentas |
| B | Sin lista: el admin llega al detalle desde la lista de C3b, cuenta por cuenta | Lo mínimo. Para encontrar a los inactivos de una clase de 40 hay que abrir 40 fichas |
| C | La lista de C3b suma la última actividad y su orden, y nada más | Cambia, de forma aditiva, un contrato que F12a ya consume. Responde «quién no viene», no «quién no avanza» |

**Recomendada: A.** Es la forma «por cuenta» del pedido y la pregunta más común de quien enseña. Calcular sólo la página la mantiene barata y sin caché. **Costo:** una ruta con su prueba, y sumarla al §7 del ADR.

**Q3. ¿Queda registrada cada consulta de una cuenta?** *(FR-015)* C3b registra en los logs cada acción de admin con su actor, su destino y la acción (su FR-040; ADR 0006 D20), pero mirar no cambia nada. Con Q1-A, el detalle de una cuenta es el acceso más amplio a datos personales que tiene el admin.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Cada respuesta con éxito del detalle de una cuenta, de su ficha y de las ejecuciones filtradas por esa cuenta deja una línea en los logs con el admin, la cuenta y la acción, sin ninguna métrica | Una línea por consulta, con la retención de logs que sigue abierta (§13.13 del ADR). Permite responder «quién miró mis datos» |
| B | No se registra: leer no es una acción de admin | Nada que hacer. Si un alumno pregunta quién vio sus datos, no hay respuesta |

**Recomendada: A.** Cuesta una línea y extiende una regla que ya existe; no es una auditoría de logins (R5). **Costo:** el aviso de privacidad puede decirlo. La lista y los agregados no dejan líneas, porque serían demasiadas por consulta.

**Q4. ¿Quién dibuja las pantallas?** *(FR-002; «Hallazgos para las hojas de ruta»)* C3b no trajo pantallas y F12 deja fuera las estadísticas. F12a monta la administración en `pages/admin`, con un `AdminPage` que recibe la sección («Cuentas» o «Invitaciones»), y F10 la vuelve `#administracion`.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Un ítem nuevo del front, **F14 · Estadísticas del admin**: una sección más de `pages/admin` («Uso del taller») con el resumen, los ejercicios y la cola; el detalle de una cuenta desde la lista de «Cuentas»; sus specs y sus E2E. Depende de F12a y de C5 | Un ID nuevo y otro ciclo de Spec Kit. Respeta «un ítem nuevo recibe un ID nuevo» y no reabre la spec de F12, ya clarificada |
| B | Una tercera parte de F12, **F12c** | Junta todo lo de administración bajo un ID, pero amplía el alcance de F12, que hoy deja fuera las estadísticas: hay que enmendar su spec |
| C | C5 trae sus pantallas | Un ítem del backend que toca `pages/admin` y espera a F11a y F12a; mezcla los dos épicos que la constitución separa |
| D | Sin pantallas por ahora: la API se usa con `curl` | Lo más barato. Las estadísticas quedan para quien sepa armar un pedido con sesión, CSRF y la cuenta esperada |

**Recomendada: A.** Sigue el precedente de C3b y F12 (el backend entrega el contrato y el front lo dibuja) y las convenciones de IDs de las dos hojas de ruta. **Costo:** un ítem más en la hoja de ruta del front, que integra el coordinador.

**Q5. ¿Qué cuentas entran en los agregados?** *(FR-016, FR-017)* El ADR excluye a los admins «por defecto» (S5). Falta decidir qué pasa con las cuentas deshabilitadas y con las que cambian de rol.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Los alumnos con el rol vigente `student` y estado `active` o `disabled`. Sin admins y sin cuentas en supresión. El resumen cuenta todas las cuentas por rol y estado aparte | Deshabilitar a un alumno no cambia la historia del taller. Promover a un alumno a admin lo saca de los agregados, también de los períodos pasados |
| B | Sólo los alumnos `active` | Las cifras de un período pasado bajan cada vez que se deshabilita a alguien, por ejemplo al cerrar un curso |
| C | A, más un filtro para sumar a los admins | Lo que sugiere «por defecto». Un parámetro más, para un caso que la cuenta de admin separada que recomienda el ADR ya evita (S5) |

**Recomendada: A.** Deshabilitar es reversible y no debería reescribir la historia; el rol se toma vigente porque el taller no guarda su historia. **Costo:** un alumno promovido desaparece de los agregados, y la spec lo dice (Edge Cases).

## El límite de privacidad

Esta sección fija lo que nunca sale, lo que sí sale y por qué no hace falta un umbral. Los requisitos FR-006 a FR-015 la vuelven verificable.

**Nunca sale, ni entero, ni en parte, ni transformado:**

| Qué | Dónde vive | Por qué |
| --- | --- | --- |
| El código | `runs.code`, `attempt_payloads.code`, `drafts.code` | Es el texto del alumno y puede tener datos personales (Ley 25.326; spec 005, riesgo 6) |
| El programa armado y su nonce | `runs.program`, `runs.nonce` | El programa contiene el código; el nonce es el secreto de la evidencia |
| Las salidas | `runs.stdout`, `runs.stderr`, `attempt_payloads.stdout` y `stderr` | Repiten el código y lo que imprime |
| Las pruebas propias | `runs.custom_test`, `attempt_payloads.custom_test`, `exercise_progress.custom_test` | Son código del alumno |
| Las reflexiones y las notas | `exercise_progress.reflection`, `workshop_progress.note`, `route_notes.body` | Texto libre |
| El crudo y el informe de una importación | `progress_imports.raw_payload` y `report` | El crudo es el v1 entero; el informe nombra textos reemplazados y omitidos (spec 007, `contracts/http-d1b.md`, §3.5) |
| Las huellas de lo anterior | `attempts.code_sha256`, `progress_imports.raw_sha256`, `sync_operations.payload_sha256`, `drafts.starter_hash` | Una huella deja comparar el código de dos alumnos, confirmar una sospecha o ligar dos cuentas que importaron la misma copia |
| Si un texto existe o cuánto mide | Las columnas de arriba | Dice algo del texto sin mostrarlo, y no es una métrica de aprendizaje (Q1) |
| La opción que eligió una cuenta | `exercise_progress.prediction_answer`, `campaign_checkpoints.last_answer`, `workshop_progress.answer`, `route_quiz_answers.answer` | Por cuenta sale sólo si acertó o si respondió; la opción, sólo en la distribución de todo el taller (Q1) |
| Lo operativo de una sesión o de un pedido | `sessions`, `sync_operations`, `runs.client_run_id`, `runs.expected_tests` | No es uso del taller |

**Sí sale:**

- **En los agregados:** conteos, tasas con su `n`, medianas y distribuciones, por taller, catálogo, lenguaje, nivel, ejercicio, prueba, mundo, taller de Sistemas, paso del recorrido y período. Ningún identificador de cuenta.
- **Por cuenta (Q1-A):** los identificadores que el admin ya ve en la ficha de C3b (`id`, `name`, `email`, `role` y `status`); las fechas, los conteos y los resultados de sus intentos; el estado de cada ejercicio y sus banderas (`assisted`, `solutionSeen`, `hintsRevealed`, `predictionCorrect` y `confidence`); sus checkpoints, sellos, talleres y marcas del recorrido como conteos o banderas; su época, su `resetAt`, sus importaciones (fecha, origen y época) y su uso de las cuotas.
- **En las ejecuciones:** la lista cerrada de FR-032.

**Por qué no hay umbral de agregación (Q1-A).** Un umbral de anonimato protege a quien aparece en un agregado de quien sólo ve agregados. Acá el único lector es el admin, que con Q1-A ve también cada cuenta: suprimir un agregado sobre tres alumnos no oculta nada que no pueda abrir uno por uno. Lo que sí hace falta es no presentar como tendencia lo que son dos casos, y eso lo resuelve el `n` de cada tasa: la pantalla decide cómo marcar una muestra chica. Con Q1-D el umbral vuelve a tener sentido, y los requisitos cambian (ver el checklist).

## De dónde salen los datos

C5 calcula todo en vivo sobre las tablas que ya existen. Cada métrica dice de dónde sale, y eso fija qué historia tiene: lo que B2 y D1 podan o reemplazan, C5 no lo puede recuperar.

| Familia | Rutas | Sale de | Horizonte | Lo que no se puede saber |
| --- | --- | --- | --- | --- |
| Cuentas | resumen | `users` | Vigente | Cuántas había en una fecha pasada: la serie cuenta altas por `created_at`, y una supresión las borra |
| Invitaciones | resumen | `invitations` | Sólo las pendientes, vigentes o vencidas: aceptar o revocar borra la fila (ADR 0006 D18) | Cuántas se aceptaron; se ve en las altas |
| Actividad reciente | resumen, lista, detalle, ficha | `progress_heads.last_activity_at` | Sólo la última fecha de cada cuenta | Quién estuvo activo en un período pasado |
| Actividad por período | serie del resumen, detalle | `attempts.attempted_at` | Mientras exista la cuenta, de todas las épocas | La actividad que no ejecuta código (leer, la campaña, el recorrido). `sync_operations` se poda a los 14 días y no se usa |
| Intentos y resultados | resumen, ejercicios, lista, detalle | `attempts` (`counted`, `outcome`, `legacy` y `epoch`) | Mientras exista la cuenta, de todas las épocas | Nada de su código: el payload no se lee |
| Fallos por prueba | ejercicios | `attempt_tests` | Ídem | — |
| Resueltos y ayudas | resumen, ejercicios, lista, detalle, ficha | `exercise_progress` | Estado de la época vigente | Lo resuelto antes de un «Borrar todo», que sigue en los intentos como aprobado |
| Campaña, talleres y recorrido | ejercicios, detalle | `campaign_checkpoints`, `campaign_seals`, `workshop_progress`, `workshop_step_marks`, `workshop_observations`, `route_marks` y `route_quiz_answers` | Estado de la época vigente | Cuándo se marcó algo antes de la última vez |
| Importaciones | resumen, detalle, ficha | `progress_imports` (`imported_at`, `source` y `epoch`) | La fila, mientras exista la cuenta | El crudo (se poda a los 90 días) y el informe no se leen |
| «Borrar todo» | resumen, detalle | `progress_heads` (`epoch` y `reset_at`) | La época cuenta los resets (época − 1); la fecha es sólo la del último | Cuándo fueron los anteriores |
| Ejecuciones | `admin/runs`, cuotas del detalle | `runs` | 14 días (spec 005, Q5) | Lo anterior: queda como intento, sin la cola |
| Cola y esperas | `admin/queue` | `runs` (ahora y 24 horas) | Ahora y las últimas 24 horas. Más atrás, los intentos guardan la espera y la duración (`attempted_at`, `started_at` y `finished_at`) mientras exista la cuenta | Los rechazos 429 y 503, que no dejan filas |

Tres consecuencias que la pantalla tiene que poder explicar:

1. **«Resuelto» y «aprobado» no son lo mismo.** «Resuelto» es el estado vigente (`exercise_progress.solved_at`) y «aprobado» es un intento `passed`. Después de un «Borrar todo», un alumno puede tener intentos aprobados y ningún ejercicio resuelto. Cada métrica del contrato dice de cuál de las dos sale (FR-020).
2. **El pasado cambia.** Sin rollups (fuera de C5), una supresión saca a la cuenta de todos los períodos, también de los cerrados (D06), y un «Borrar todo» saca sus resueltos. Con la caché, el cambio tarda hasta 10 minutos en verse (FR-034).
3. **Hasta A4 y D1c, casi no hay datos.** Hoy ningún cliente usa `/api/runs` (A4) ni `/api/sync` (D1c): las tablas de producción sólo tienen lo que dejan los checks y las importaciones. C5 se construye y se prueba con poblaciones armadas a mano y con la sintética de FR-038; sus números describen el taller recién cuando entren A4 y D1c.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el uso del taller de un vistazo (Priority: P1)

Un admin abre el resumen y ve cuántas cuentas hay, cuántos alumnos ejecutaron en el período, cuántos intentos hubo y con qué resultado, cuánto se resolvió en el servidor y cuánto se importó, y la serie día por día, semana por semana o mes por mes.

**Why this priority**: es la pregunta más común («¿se está usando?, ¿cuánto?») y la base de las demás.

**Independent Test**: con una población armada a mano (alumnos, admins, una cuenta deshabilitada, una en supresión, intentos de dos épocas, intentos legados e importaciones), pedir el resumen para un período y comparar cada número con el conteo hecho a mano.

**Acceptance Scenarios**:

1. **Dado** un período de 30 días, **cuando** el admin pide el resumen, **entonces** recibe las cuentas por rol y estado, los alumnos con actividad en las últimas 24 horas, 7 y 30 días, las cuentas nuevas, las invitaciones pendientes (vigentes, vencidas y de admin), los intentos que cuentan por resultado y los de operación (`infra_error` y `canceled`) aparte, las primeras resoluciones separadas en «ejecutado en el servidor» e «importado», las importaciones y los resets.
2. **Dada** una granularidad diaria, **cuando** pide la serie, **entonces** cada día del período tiene sus intentos por resultado, sus alumnos distintos que ejecutaron, sus primeras resoluciones, sus cuentas nuevas y sus importaciones, con los días cortados en la zona horaria del taller.
3. **Dados** admins que estudian y una cuenta en supresión, **cuando** se calcula el resumen, **entonces** no cuentan en ningún agregado (Q5).
4. **Dado** un resumen recién pedido, **cuando** se lo pide otra vez dentro de los 10 minutos, **entonces** sale de la caché, con la misma hora de cálculo.

*Cubre: FR-016 a FR-023 y FR-034; SC-001.*

---

### User Story 2 - Ver cómo le va a cada ejercicio (Priority: P1)

Quien mantiene el currículo (o enseña con él) quiere saber qué ejercicios traban, por qué y dónde: cuántos lo empezaron y lo resolvieron, con qué resultado fallan, qué prueba falla más, cuánta ayuda se pide y qué distractor de la predicción engaña. Lo mismo para cada catálogo, mundo de la campaña, taller de Sistemas y paso del recorrido.

**Why this priority**: es el uso que el taller no tiene hoy y el que mejora el contenido para todos.

**Independent Test**: con la población de la historia 1, pedir las estadísticas de un catálogo y un lenguaje, y comparar las cifras de un ejercicio, de sus tres pruebas y de su predicción con el conteo a mano.

**Acceptance Scenarios**:

1. **Dados** un catálogo y un lenguaje, **cuando** el admin los pide, **entonces** cada ejercicio trae cuántos alumnos lo empezaron y cuántos lo resolvieron (en el servidor e importado), los intentos que cuentan en el período por resultado, la mediana de intentos por alumno, el uso de ayuda, la tasa de acierto de la predicción con su `n` y la distribución de la autoevaluación.
2. **Dado** un ejercicio con tres pruebas, **cuando** se lo pide, **entonces** cada `test_key` dice en qué parte de los intentos que cuentan quedó `fail` o `missing`.
3. **Dada** la predicción de un ejercicio, **cuando** se la pide, **entonces** sale cuántos alumnos eligieron cada opción, sin decir quiénes.
4. **Dado** un ejercicio retirado con intentos, **cuando** se pide su catálogo, **entonces** aparece marcado como retirado, con sus cifras.
5. **Dado** el catálogo `essentials` de E1, u otro nuevo, **cuando** se importa, **entonces** aparece en las estadísticas sin cambiar código.

*Cubre: FR-019, FR-020 y FR-024 a FR-028; SC-001.*

---

### User Story 3 - Nunca ver el código ni los textos (Priority: P1)

El alumno confía en que nadie, tampoco el admin, lee su código, sus borradores, sus reflexiones ni sus notas a través de la administración. El límite se prueba en cada cambio, no se promete.

**Why this priority**: es la condición de la hoja de ruta («sin exponer nunca el código ni los textos del alumno») y de la Ley 25.326. Sin esto, C5 no puede entregarse.

**Independent Test**: sembrar en todas las columnas de texto de una cuenta valores testigo (código, salidas, pruebas propias, reflexiones, notas, borradores, crudo e informe de importación) y recorrer todas las rutas de `/api/admin`.

**Acceptance Scenarios**:

1. **Dados** los valores testigo, **cuando** se recorre cada ruta de `/api/admin` con éxito, **entonces** ninguna respuesta contiene un testigo ni una clave prohibida, a ninguna profundidad.
2. **Dada** una ruta nueva de `/api/admin` sin escenario en la matriz, **cuando** corre la prueba, **entonces** falla y la nombra, en lugar de saltearla.
3. **Dado** el código de C5, **cuando** corre la prueba de arquitectura, **entonces** no nombra ninguna columna ni tabla de la lista de «Nunca sale».
4. **Dado** un ejercicio que dos alumnos resolvieron con el mismo código, **cuando** el admin pide cualquier ruta, **entonces** nada le permite saber que el código fue el mismo.
5. **Dada** una cuenta que respondió una predicción, **cuando** el admin pide su detalle, **entonces** ve si acertó y no qué opción eligió (Q1).

*Cubre: FR-006 a FR-014; SC-002 y SC-003.*

---

### User Story 4 - Seguir a una cuenta (Priority: P2)

Quien enseña quiere saber quién no viene, quién se trabó y en qué. Ve la lista de alumnos con su última actividad y su avance (Q2), abre uno y ve, ejercicio por ejercicio, qué resolvió, cuántas veces ejecutó, qué ayuda usó, su actividad por día y cuánto le queda de cuota. La ficha de la cuenta trae un resumen corto.

**Why this priority**: es la parte «por cuenta» del pedido. Depende de Q1 y de Q2, y no bloquea los agregados.

**Independent Test**: con la población de la historia 1, pedir la lista ordenada por última actividad y el detalle de un alumno, y comparar cada fila de su grilla con su estado armado a mano; suprimir la cuenta y repetir.

**Acceptance Scenarios**:

1. **Dada** la lista de alumnos, **cuando** el admin la pide ordenada por última actividad y con el filtro «sin actividad desde hace 14 días», **entonces** recibe una página con los inactivos, cada uno con su última actividad, lo resuelto (servidor e importado), sus intentos de 7 y 30 días y la fecha de su último intento.
2. **Dado** un alumno, **cuando** el admin pide su detalle, **entonces** recibe su ficha, su época y su último reset, sus importaciones (fecha, origen y época), lo resuelto por catálogo y lenguaje, sus intentos por resultado, su actividad por día en el período, su uso de las cuotas y la grilla por ejercicio, más su campaña, sus talleres y su recorrido como conteos y banderas.
3. **Dada** la ficha de C3b, **cuando** se la pide, **entonces** suma un resumen de uso (última actividad, resueltos, intentos de 30 días e importaciones), y la lista de C3b no cambia.
4. **Dada** una cuenta en supresión o inexistente, **cuando** se pide su detalle, **entonces** responde 404, también inmediatamente después de haberla pedido con éxito.
5. **Dado** un admin que abre el detalle o la ficha de un alumno, **cuando** responde con éxito, **entonces** queda una línea en los logs con el admin, la cuenta y la acción, sin métricas (Q3).

*Cubre: FR-015, FR-017, FR-029 a FR-031 y FR-035; SC-004 y SC-005.*

---

### User Story 5 - Mirar la cola y las ejecuciones (Priority: P2)

Quien opera ve si el sandbox alcanza: cuántas ejecuciones esperan y cuántas corren contra los lugares configurados, cuánto esperó la más vieja, la espera y la duración típicas, y la lista de ejecuciones recientes con su estado y su motivo, para seguir un `infra_error` o una cuenta que agota su cuota.

**Why this priority**: B2 dejó la cola sin un lugar donde mirarla y el ADR la asigna a C5. No es la pregunta de quien enseña.

**Independent Test**: con ejecuciones en cada estado y con fechas armadas, pedir la cola y la lista, filtrar por estado y por cuenta, y comprobar que ninguna respuesta trae un campo fuera de la lista cerrada.

**Acceptance Scenarios**:

1. **Dadas** ejecuciones en cola y corriendo, **cuando** se pide la cola, **entonces** sale cuántas esperan y cuántas corren, la antigüedad de la más vieja, el tope de la cola y los lugares configurados, y la espera y la duración (mediana y p95) de las últimas 24 horas.
2. **Dadas** ejecuciones de más de 14 días, **cuando** se pide la lista, **entonces** no aparecen, porque B2 las podó, y la respuesta lo dice.
3. **Dada** la lista filtrada por `infra_error`, **cuando** se pagina con el cursor, **entonces** cada ejecución trae sólo los campos permitidos y ninguna página repite ni saltea una.

*Cubre: FR-015, FR-032 y FR-033; SC-002 y SC-005.*

---

### User Story 6 - Que las estadísticas no frenen el taller (Priority: P3)

El taller corre en un servidor con una sola MySQL. Mirar las estadísticas no puede demorar una sincronización, una ejecución ni un despliegue, y una consulta que se vuelve lenta tiene que cortarse sola. Antes de sumar un índice, se mide con la carga que estima el ADR.

**Why this priority**: con pocas cuentas no se nota; con miles, una consulta del admin sin tope compite con los alumnos. No cambia lo que el admin ve.

**Independent Test**: calcular un agregado en frío mientras otro proceso sincroniza y cierra ejecuciones; forzar el tope de tiempo; correr la medición con la población sintética.

**Acceptance Scenarios**:

1. **Dado** un agregado que se calcula en frío, **cuando** a la vez una cuenta sincroniza y cierra una ejecución, **entonces** ninguna de las dos espera un candado de C5.
2. **Dada** una consulta que supera su tope de tiempo, **cuando** se corta, **entonces** la respuesta es un 503 con su código y `Retry-After`, nada queda en la caché y una línea de log nombra la ruta y la duración.
3. **Dados** 5.000 alumnos sintéticos y dos años de intentos en una base aparte, **cuando** corre la medición, **entonces** informa el tiempo en frío de cada ruta, su plan de ejecución, los índices que se sumaron y si salta el disparador del §9.

*Cubre: FR-004, FR-005 y FR-034 a FR-040; SC-006 a SC-008.*

---

### Edge Cases

- **Un alumno promovido a admin** sale de los agregados, también de los períodos pasados (Q5-A). Degradarlo lo devuelve.
- **Un alumno deshabilitado** sigue contando en la historia y figura en las cuentas por estado (Q5-A). Su detalle se puede pedir.
- **Un alumno que nunca practicó** (aceptó la invitación y no ejecutó ni sincronizó) no tiene cabecera de progreso: es justamente a quien busca la lista. Aparece con la última actividad nula y en ceros, entra siempre en el filtro «sin actividad desde» y cuenta en el resumen como «nunca tuvo actividad» (FR-021 y FR-029).
- **Una cuenta en supresión** responde 404 en el detalle, en la ficha y como filtro de las ejecuciones desde que pasa a `deleting`; sus ejecuciones no aparecen en la lista y no cuenta en ningún agregado. La cola sí cuenta lo suyo que siga ocupando un lugar, sin identificarla.
- **Una supresión con el resumen en caché:** la cuenta sigue en los números hasta 10 minutos. No queda ningún dato suyo en una caché por cuenta, porque no la hay (FR-035).
- **«Borrar todo» en el medio:** la cuenta pierde sus resueltos y conserva sus intentos (spec 007, Q2). «Resueltos» baja y «aprobados» no (ver «De dónde salen los datos»).
- **Los intentos legados** (importados del v1): nunca cuentan como intentos; aparecen aparte, como importados.
- **Una ejecución todavía en curso** no tiene intento: cuenta en la cola, no en los intentos.
- **Un ejercicio retirado** conserva sus cifras y aparece marcado; un intento puede apuntar a uno retirado (spec 005, Edge Cases).
- **Un catálogo sin alumnos** sale con ceros y `n` igual a 0, nunca con una tasa dividida por cero.
- **Un período fuera de rango** (más de 366 días, `from` posterior a `to` o una granularidad desconocida) responde 422 con el parámetro.
- **El cambio de día en la zona del taller:** un intento a las 23:30 de Buenos Aires cae en ese día, aunque en UTC sea el siguiente.
- **Una zona configurada con cambio de horario:** los días se cortan en la hora local, y el plan lo prueba si la zona tiene cambios.
- **Un admin que pide su propio detalle** lo ve como cualquier otro: la regla es la misma para todas las cuentas.
- **Dos admins que piden el mismo agregado en frío a la vez** lo calculan los dos; con uno o dos admins no vale una protección contra la estampida (YAGNI).
- **Un estudiante que pide una ruta de C5** recibe 403, también con una cuenta o un ejercicio que no existen (C3b, FR-031).
- **El texto de un ejercicio** (título, consigna) es contenido, no del alumno: puede salir, aunque la pantalla puede tomarlo del contenido que ya tiene.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y forma**

- **FR-001**: Toda ruta de C5 DEBE ir bajo `/api/admin/` con el grupo `admin` de C3b: sesión activa, email verificado, rol `admin`, cuenta esperada y 120 pedidos por minuto por cuenta. Un estudiante recibe 403 `forbidden`, también ante un destino inexistente, y sin sesión, 401. Todas son GET, ninguna recibe `user_id` fuera de la ruta, y el destino se busca después de comprobar el rol, sin binding implícito de modelos. *(C3b FR-031; ADR 0006 §4.5)*
- **FR-002**: Las rutas DEBEN ser: `GET /api/admin/stats/overview` (el resumen y sus series), `GET /api/admin/stats/exercises` (catálogos, ejercicios, pruebas, mundos, talleres y recorrido), `GET /api/admin/stats/students` (la lista, Q2), `GET /api/admin/stats/students/{user}` (el detalle), `GET /api/admin/runs`, `GET /api/admin/queue` y el resumen de uso dentro de `GET /api/admin/users/{user}`. El plan puede partir `stats/exercises` en más de una ruta si la respuesta lo pide, y lo registra en el contrato. *(ADR 0006 §7; Q2)*
- **FR-003**: Las respuestas DEBEN usar el estilo de C3b: JSON en camelCase, `{data, meta}`, con `meta.generatedAt` (la hora del cálculo, también si sale de la caché) y, en las que tienen período, `meta.period` con `from`, `to`, la granularidad y la zona horaria. Un parámetro inválido responde 422 `validation_failed` con `errors.<parámetro>`, y todo error lleva `{message, code}` en español. *(C3b; ADR 0006 §8)*
- **FR-004**: C5 DEBE ser sólo lectura: no escribe ninguna tabla salvo la caché, no toma `AccountLock` ni candados de fila (`FOR UPDATE` o `FOR SHARE`) y no abre transacciones largas. Cada consulta es corta, así no frena una sincronización, el cierre de una ejecución ni un DDL. *(ADR 0006 D08, D35)*
- **FR-005**: C5 NO DEBE crear tablas ni columnas. Los únicos cambios de esquema permitidos son los índices de FR-039. *(ADR 0006 §10)*

**El límite de privacidad**

- **FR-006**: Ninguna respuesta de C5 DEBE contener el código, el programa armado, el nonce, las salidas, las pruebas propias, los borradores, las reflexiones, las notas, ni el crudo ni el informe de una importación, enteros, en parte o transformados. C5 no lee esas columnas ni las tablas `drafts`, `attempt_payloads`, `route_notes` y `sync_operations` (la tabla de «Nunca sale»). *(ADR 0006 D31)*
- **FR-007**: Ninguna respuesta DEBE contener una huella del contenido del alumno (`code_sha256`, `raw_sha256`, `payload_sha256` o el `starter_hash` de un borrador), ni una métrica que dependa de comparar el contenido de dos intentos o de dos cuentas.
- **FR-008**: Ninguna respuesta DEBE decir si un texto del alumno existe ni cuánto mide. *(Q1)*
- **FR-009**: Por cuenta, de una predicción, un checkpoint o una pregunta DEBE salir sólo si acertó (las banderas que guarda el cliente, D39) o si respondió, nunca la opción elegida. La distribución de opciones sale sólo en los agregados (FR-027). *(Q1)*
- **FR-010**: Los agregados NO DEBEN llevar identificadores de cuentas. Las rutas por cuenta y la de ejecuciones llevan sólo los de la ficha de C3b (`id`, `name`, `email`, `role` y `status`), nunca un identificador de sesión, una IP ni un `clientRunId`.
- **FR-011**: Los agregados NO DEBEN tener un umbral de anonimato, porque el admin ve cada cuenta (Q1-A). Toda tasa DEBE salir con su numerador y su `n`, y un `n` igual a 0 da la tasa nula, no un error. *(Q1)*
- **FR-012**: Cada respuesta DEBE armarse con una lista cerrada de campos, escrita en el contrato, y no copiando una fila menos lo prohibido. Una prueba por ruta compara las claves de una respuesta con esa lista.
- **FR-013**: C5 DEBE ampliar la matriz «sin textos del alumno» de C3b (su FR-041): las claves prohibidas suman `stdout`, `stderr`, `program`, `nonce`, `report`, `code_sha256` y `raw_sha256`; los testigos se siembran también en `runs`, `drafts`, `route_notes`, `workshop_progress.note` y `progress_imports`; cada ruta nueva tiene su escenario (también las que llevan `{user}`), y la cuenta de rutas recorridas se actualiza. Como `code` está prohibida a cualquier profundidad, el código de un catálogo se publica como `catalog`. *(C3b FR-041 y SC-006)*
- **FR-014**: Una prueba de arquitectura DEBE fallar si el código de C5 nombra una columna o una tabla de la lista de «Nunca sale». *(Como `LogArchTest` y `PurityTest` de B2)*
- **FR-015**: Cada respuesta con éxito del detalle de una cuenta, de la ficha con su resumen y de la lista de ejecuciones filtrada por una cuenta DEBE dejar una línea en los logs con el admin, la cuenta y la acción, sin ninguna métrica y con las reglas de los logs de C3a (sin el email en claro). La lista de alumnos, la de ejecuciones sin ese filtro y los agregados no dejan líneas. *(Q3; extiende C3b FR-040 y ADR 0006 D20)*

**Quiénes cuentan y qué significa cada cifra**

- **FR-016**: Los agregados DEBEN contar sólo las cuentas con el rol vigente `student` y estado `active` o `disabled`; nunca las de rol `admin` ni las que están en `deleting`. El resumen cuenta todas las cuentas por rol y estado aparte. *(Q5; ADR 0006 S5)*
- **FR-017**: El detalle y la ficha DEBEN responder para cualquier cuenta que exista y no esté en `deleting`, de cualquier rol; una cuenta inexistente o en supresión responde 404 `not_found`. *(Q5)*
- **FR-018**: Lo resuelto DEBE separarse siempre en «ejecutado en el servidor» (`server_solved_at` presente) e «importado» (resuelto sin `server_solved_at`), y los intentos legados nunca cuentan como intentos: salen aparte, como importados. *(ADR 0006 D31)*
- **FR-019**: Un intento cuenta con la definición única de B2 (la columna `counted`, FR-029 de la spec 005). `infra_error` y `canceled` salen aparte, como operación. Ningún nombre de campo ni texto del contrato DEBE decir «verificado»: lo que se aprobó en el servidor es «ejecutado en el servidor». *(Spec 005, FR-029 y riesgo 1; ADR 0006 §12)*
- **FR-020**: Cada métrica del contrato DEBE decir de qué fuente sale: el estado vigente (resueltos, ayudas, campaña, talleres y recorrido, de la época vigente) o la historia (los intentos de todas las épocas), según «De dónde salen los datos».

**El resumen y los períodos**

- **FR-021**: El resumen DEBE traer: las cuentas por rol y estado; los alumnos con actividad en las últimas 24 horas, 7 y 30 días (por `last_activity_at`) y los que nunca tuvieron actividad (sin cabecera de progreso: B2 la crea con la primera ejecución y D1, con la primera sincronización); en el período, las cuentas nuevas, los intentos que cuentan por resultado, los de operación, los alumnos distintos que ejecutaron, las primeras resoluciones (servidor e importado) y las importaciones; las invitaciones pendientes, vigentes y vencidas, con las de admin aparte; y las cuentas que hicieron «Borrar todo» alguna vez. *(ADR 0006 S6, D31)*
- **FR-022**: El resumen DEBE traer las mismas cifras del período como serie, por día, semana o mes. La actividad por período sale sólo de los intentos: la serie no puede contar a quien no ejecutó, y el contrato lo dice.
- **FR-023**: El período DEBE pedirse con `from` y `to` (fechas), con los últimos 30 días por omisión y 366 como máximo, y cortarse en la zona horaria del taller, que es configuración (por omisión, `America/Argentina/Buenos_Aires`). Los datos siguen guardados en UTC.

**Catálogos, ejercicios y el resto del contenido**

- **FR-024**: Para cada catálogo y lenguaje (y cada nivel, donde el catálogo lo tiene) DEBEN salir los ejercicios activos, los alumnos que empezaron alguno, los que resolvieron al menos uno, la mediana de resueltos por alumno y la parte del catálogo resuelta. Los catálogos se leen de `catalogs`, así que uno nuevo (E1) aparece sin cambiar código.
- **FR-025**: Para cada ejercicio (filtrable por catálogo, lenguaje y nivel, con los retirados marcados) DEBEN salir: los alumnos que lo empezaron y los que lo resolvieron (servidor e importado); los intentos que cuentan en el período, por resultado; la mediana de intentos de la época por alumno, entre quienes lo resolvieron y entre quienes no; el uso de ayuda (`assisted`, `solutionSeen` y la distribución de pistas reveladas); el acierto de la predicción, con su `n`; y la distribución de la autoevaluación.
- **FR-026**: Para cada prueba de un ejercicio, por su `test_key`, DEBE salir en qué parte de los intentos que cuentan del período quedó `fail` y en cuál `missing`.
- **FR-027**: DEBE salir la distribución de la opción elegida en la predicción de cada ejercicio, en el checkpoint de cada mundo, en la predicción de cada taller de Sistemas y en cada pregunta del recorrido, sin identificadores (FR-009 y FR-010).
- **FR-028**: Para cada mundo de la campaña DEBEN salir los alumnos con el checkpoint aprobado, los sellos y los ejercicios del mundo resueltos; para cada taller de Sistemas y lenguaje, los alumnos que lo empezaron, los que sellaron el código y los que acertaron la predicción, con la mediana de etapas marcadas y de objetivos observados; y para el recorrido, cuántos alumnos marcaron cada paso y cada hito.

**Por cuenta**

- **FR-029**: `GET /api/admin/stats/students` DEBE listar a los alumnos de FR-016 con la paginación por offset de C3b (hasta 100 por página), con búsqueda por nombre o email, el filtro «sin actividad desde» y el orden por nombre, alta o última actividad. Cada fila trae los identificadores, la última actividad, lo resuelto (servidor e importado), los intentos que cuentan de los últimos 7 y 30 días y la fecha del último intento, calculados sólo para las cuentas de la página. Un alumno que nunca practicó (sin cabecera de progreso) aparece con la última actividad nula y en ceros: el filtro «sin actividad desde» lo incluye siempre, y al ordenar por última actividad cuenta como la más vieja (primero en orden ascendente, último en descendente), con el id como desempate. *(Q2)*
- **FR-030**: `GET /api/admin/stats/students/{user}` DEBE traer: la ficha; la época, `resetAt` y la última actividad; las importaciones (fecha, origen y época, nunca el informe); lo resuelto por catálogo y lenguaje; los intentos por resultado, en el período y en total; la actividad por día en el período; el uso de las cuotas (ejecuciones activas, aceptadas en el último minuto y en 24 horas, y minutos de sandbox de 24 horas, contra sus límites); la grilla por ejercicio (estado, `solvedAt`, `serverSolvedAt`, `attemptCount`, `lastAttemptAt`, el resultado del último intento, `assisted`, `solutionSeen`, `hintsRevealed`, `predictionCorrect`, `confidence` y `reviewDueAt`); la campaña (el checkpoint aprobado por mundo y los sellos); los talleres (código sellado, predicción acertada, etapas marcadas y objetivos observados, como conteos); y el recorrido (pasos, hitos y favoritos marcados, y preguntas respondidas, como conteos). Una cuenta sin cabecera de progreso sale con la época 1, `resetAt` y la última actividad nulos, y todo en ceros. *(Q1)*
- **FR-031**: `GET /api/admin/users/{user}` DEBE sumar `usage` (la última actividad, lo resuelto en el servidor e importado, los intentos que cuentan de los últimos 30 días y las importaciones), de forma aditiva: `GET /api/admin/users` y el resto de la ficha no cambian. *(Extiende el contrato de la spec 010)*

**Operación: ejecuciones y cola**

- **FR-032**: `GET /api/admin/runs` DEBE listar las ejecuciones que B2 conserva (14 días), de la más nueva a la más vieja, con un cursor por fecha de aceptación e id y los filtros por estado, cuenta, ejercicio y fecha desde. Cada ejecución trae sólo: `id`, la cuenta (`id` y `name`), `exerciseId`, `language`, `status`, `reason`, `executorPhase`, `exitCode`, `truncated`, `compileMs`, `runMs`, `createdAt`, `startedAt`, `finishedAt` y si se pidió cancelarla. El contrato dice que lo anterior a 14 días ya no existe. Como el detalle (FR-017), la lista no muestra las ejecuciones de una cuenta en `deleting`, y un filtro por una cuenta inexistente o en supresión responde 404 `not_found`. *(ADR 0006 §4.5, `viewRunMetadata`, y §7)*
- **FR-033**: `GET /api/admin/queue` DEBE traer, en vivo: cuántas ejecuciones esperan y cuántas corren, la antigüedad de la más vieja en espera, el tope de la cola y los lugares configurados (el mismo valor que usan el ejecutor y `worker-runs`); y, de las últimas 24 horas, la espera hasta empezar y la duración (mediana y p95) y los `infra_error` por motivo. No cuenta los rechazos 429 y 503, que no dejan filas, y el contrato lo dice. *(ADR 0006 §7; spec 005, FR-008 y FR-009)*

**Caché, tope de tiempo y medición**

- **FR-034**: Los agregados (el resumen y los ejercicios) DEBEN guardarse 10 minutos en la caché del store `database`, por combinación de parámetros. Ni las claves ni los valores de la caché llevan datos de una cuenta. Por eso una supresión o un «Borrar todo» tarda hasta 10 minutos en verse en ellos, y el contrato lo dice. *(ADR 0006 D31)*
- **FR-035**: Las rutas por cuenta (la lista, el detalle y la ficha) y la cola NO DEBEN usar caché: se calculan en cada pedido, así que una cuenta suprimida responde 404 en el pedido siguiente y la caché nunca guarda un dato suyo. *(ADR 0006 D06)*
- **FR-036**: Cada consulta de C5 DEBE llevar un tope de tiempo (`MAX_EXECUTION_TIME`, configurable). Si se supera, la ruta responde 503 con un código propio (propuesta: `stats_timeout`) y `Retry-After`, no guarda nada en la caché y deja una línea de log con la ruta y la duración, sin parámetros que identifiquen a una cuenta. *(ADR 0006 D35)*
- **FR-037**: Ninguna consulta por cuenta DEBE recorrer las filas de otras cuentas: se acota por las claves que empiezan por `user_id`, y las de la lista, a las cuentas de la página.
- **FR-038**: Una medición DEBE correr con 5.000 alumnos sintéticos y dos años de intentos (unos 22 millones con la estimación de D38, 30.000 por día), en una base aparte y nunca en la del stack del usuario, e informar el tiempo en frío de cada ruta y su plan de ejecución (EXPLAIN). No forma parte de `npm test`. *(ADR 0006 D38 y §10)*
- **FR-039**: Si la medición muestra una consulta que recorre de más, C5 DEBE sumar el índice que la resuelve (por ejemplo, `attempts (attempted_at, outcome)` o uno cubriente por alumno), en una migración por índice, con `ALGORITHM=INPLACE, LOCK=NONE` y su `down()`, y repetir la medición. Ningún índice entra sin la medición que lo justifica. *(ADR 0006 §10)*
- **FR-040**: Si después de los índices una ruta sigue por encima de 2 s en frío, C5 DEBE informarlo como el disparador del §9 y NO DEBE construir rollups ni una réplica: decide el usuario, en otro ítem. *(ADR 0006 §9; hoja de ruta, «Fuera»)*

**Verificación y calidad**

- **FR-041**: Las pruebas (Pest contra MySQL real) DEBEN cubrir, con valores esperados contados a mano sobre una población armada para eso y no recalculados con las consultas que se prueban: cada cifra de cada ruta, quiénes cuentan (FR-016), la separación de lo importado y de lo legado, la diferencia entre resuelto y aprobado después de un reset, la zona horaria de los períodos, la caché y su vencimiento, el tope de tiempo, el 404 de una cuenta en supresión, la matriz de acceso de C3b y la ampliada de FR-013. *(Constitución, principio II)*
- **FR-042**: El código de C5 DEBE pasar PHPStan en el nivel 9 sin baseline, Pint y las pruebas de la API, con `npm test`, `npm run lint`, `npm run format:check` y `git diff --check` en verde. NO DEBE agregar paquetes de Composer sin permiso del usuario, y DEBE documentar sus reglas en `backend/api/AGENTS.md` y sus contratos en la carpeta de esta spec. *(Constitución, principio VII; hoja de ruta, «Criterios de aceptación globales»)*

### Key Entities *(include if feature involves data)*

C5 no crea tablas. Estos son los conceptos que expone, todos derivados de las tablas de C3a, C3b, B2 y D1.

- **Población:** las cuentas que cuentan en un agregado (FR-016). Se decide con el rol y el estado vigentes, en el momento del cálculo.
- **Agregado:** una cifra sin identificadores (un conteo, una tasa con su `n`, una mediana o una distribución) sobre la población, para el taller, un catálogo, un ejercicio, una prueba, un mundo, un taller de Sistemas o un paso del recorrido.
- **Período:** un intervalo `from`–`to` con una granularidad (día, semana o mes), cortado en la zona horaria del taller.
- **Serie:** las cifras de un período, una por intervalo de la granularidad.
- **Fuente de una métrica:** el estado vigente (la época actual de cada cuenta) o la historia (los intentos de todas las épocas). Fija qué pasa después de un «Borrar todo» o de una supresión.
- **Resumen de una cuenta:** lo que suma la ficha de C3b (FR-031).
- **Detalle de una cuenta:** sus métricas y su grilla por ejercicio, sin textos (FR-030).
- **Metadatos de una ejecución:** la lista cerrada de FR-032.
- **Estado de la cola:** lo que espera y lo que corre ahora, contra los lugares configurados, y las esperas recientes (FR-033).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con la población armada a mano (alumnos, uno que nunca practicó y no tiene cabecera de progreso, admins que estudian, una cuenta deshabilitada, una en supresión, intentos de dos épocas, intentos legados, importaciones y un reset), cada cifra de cada ruta coincide con el conteo a mano: 0 diferencias, en los períodos por día, semana y mes.
- **SC-002**: Con valores testigo en todas las columnas de «Nunca sale», el recorrido de todas las rutas de `/api/admin` (las 8 de C3b que responden con éxito y las de C5) encuentra 0 testigos, 0 claves prohibidas a cualquier profundidad y 0 rutas sin escenario. Cada ruta de C5 devuelve exactamente las claves de su lista cerrada.
- **SC-003**: La prueba de arquitectura encuentra 0 referencias del código de C5 a las columnas y las tablas de «Nunca sale».
- **SC-004**: El 100 % de las rutas de C5 responde 403 a un estudiante, también ante un destino inexistente, y 401 sin sesión. El detalle de una cuenta en supresión responde 404 en el 100 % de los casos, también si se lo pidió con éxito un instante antes.
- **SC-005**: Cada consulta con éxito del detalle, de la ficha o de las ejecuciones filtradas por una cuenta deja exactamente una línea de log con el admin, la cuenta y la acción, y 0 líneas llevan una métrica o el email en claro (Q3).
- **SC-006**: Después de calcular cada ruta, las tablas de los alumnos tienen las mismas filas y revisiones que antes (0 escrituras fuera de la caché), y una sincronización y el cierre de una ejecución que corren durante un cálculo en frío no esperan ningún candado de C5.
- **SC-007**: Una consulta que supera su tope responde 503 con su código y `Retry-After` en el 100 % de los casos, y deja 0 entradas en la caché.
- **SC-008** (una medición, no un criterio de aprobación): con 5.000 alumnos sintéticos y dos años de intentos, se informan el tiempo en frío de cada ruta, su EXPLAIN antes y después de cada índice, los índices sumados y si alguna ruta sigue por encima de 2 s, el disparador del §9. Como la SC-012 de B2, todavía no hay un objetivo que cumplir: si el disparador salta, decide el usuario (FR-040).
- **SC-009**: Pasan `npm run api:test`, `npm run api:format:check`, `npm run api:analyse` (nivel 9, sin baseline), `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`.

## Riesgos

1. **Las métricas por cuenta son vigilancia si se usan mal.** Con Q1-A, el admin ve el ritmo de estudio de cada alumno, día por día. *Mitigación:* nada de textos ni de huellas, el registro de cada consulta (Q3) y el aviso de privacidad, que tiene que decirlo (pregunta 6 del ADR). El admin sigue sin segundo factor (ADR 0006 §4.10): una sesión de admin robada ve todo esto.
2. **La evidencia autodeclarada contamina los agregados.** El código del alumno puede imprimir marcadores válidos si lee el nonce de su binario (ADR 0005 §5). *Mitigación:* lo aprobado se llama «ejecutado en el servidor», nunca «verificado» (FR-019), y lo importado va aparte (FR-018).
3. **Calcular en vivo compite con los alumnos.** Una consulta del admin sobre millones de intentos usa la misma MySQL. *Mitigación:* la caché de los agregados, el tope de tiempo, consultas cortas y sin candados, la medición antes de los índices y el disparador del §9 hacia los rollups.
4. **El pasado cambia, y la pantalla puede confundir.** Una supresión o un reset bajan cifras de períodos cerrados, y «resuelto» y «aprobado» difieren. *Mitigación:* cada métrica dice su fuente (FR-020) y el contrato explica las consecuencias; los rollups, que las evitarían, quedan fuera.
5. **Hasta A4 y D1c no hay datos reales.** *Mitigación:* las poblaciones a mano y la sintética; el ítem del front puede esperar a A4 y D1c para que su primera pantalla tenga algo que mostrar (ver «Hallazgos»).
6. **La lista de «Nunca sale» envejece.** Una tabla o una columna nueva con texto del alumno (de E1, o de un historial de intentos) quedaría afuera. *Mitigación:* la matriz de FR-013 recorre todas las rutas de admin con testigos, y la prueba de arquitectura nombra la lista; quien sume una columna de texto la suma a las dos, como pasa con `UserTables` en la supresión.
7. **El ADR 0006 sigue en propuesta.** *Mitigación:* la aprobación condiciona la implementación, no la planificación; si el usuario lo enmienda en D31, D33 o S5, esta spec cambia en lo que dependa de eso.

## Relación con otras specs

| Ítem | Qué toma C5 | Qué le cambia |
| --- | --- | --- |
| C3b ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md), entregada) | El grupo `admin` y sus 120 pedidos por minuto, la paginación por offset, la forma de la ficha, la regla de buscar el destino después del rol y los logs de las acciones de admin | Extiende su contrato: la ficha suma `usage` (FR-031). Amplía la matriz de su FR-041 (FR-013) y la regla de su FR-040 (FR-015, Q3). La prueba de esa matriz hoy fija 8 rutas recorridas: C5 suma las suyas |
| B2 ([spec 005](../005-b2-api-ejecuciones/spec.md), entregada) | La definición única de intento (FR-029), los estados y motivos, `runs` con su retención de 14 días y los índices de `attempts`, `attempt_tests` y `runs` | Nada. Los rechazos 429 y 503 no dejan filas: si alguien quiere contarlos, es un cambio de B2 (ver «Hallazgos») |
| D1a y D1b ([spec 007](../007-d1-progreso-sincronizacion/spec.md), entregadas) | Las tablas de progreso, `last_activity_at` (su FR-019), `progress_imports` y el reset que deja los intentos (su Q2) | Nada |
| A4 y D1c (sin entregar) | Son los que llenan las tablas: A4 ejecuta desde el laboratorio y D1c sincroniza el progreso | Nada; C5 no los espera para construirse |
| F12 ([spec 023](../023-f12-administracion/spec.md)) | `pages/admin` y su `AdminPage` por secciones, donde entra la pantalla de C5 | Nada con Q4-A; con Q4-B, su alcance |
| F10 | La ruta `#administracion` (F10-Q4) | Nada |
| F11 ([spec 015](../015-f11-acceso-cuenta/spec.md)) | El aviso de privacidad, cuyo texto escribe el usuario (F11-Q2) | El texto tiene que decir qué ve el admin (Q1) y, con Q3-A, que cada consulta queda registrada |
| C4 ([spec 008](../008-c4-exposicion/spec.md)) | Los usuarios de MySQL por rol | Puede darles a las estadísticas un usuario de sólo lectura sin `SELECT` sobre las columnas de «Nunca sale», una defensa más allá de las pruebas (ver «Hallazgos») |
| E1 | Un catálogo nuevo en `catalogs` | Nada: C5 lo lee de la tabla (FR-024) |

## Hallazgos para las hojas de ruta

1. **Un ítem del front para las pantallas (Q4).** Recomendado: **F14 · Estadísticas del admin**, en la hoja de ruta del front; F14 es el primer ID libre en `master` 24ba9d3d (F13 ya existe), y si otra spec en curso lo toma, el coordinador le asigna el siguiente. Entran una sección «Uso del taller» en `pages/admin` (el resumen con su serie, los catálogos y los ejercicios, la cola y las ejecuciones), el detalle de una cuenta desde «Cuentas» y su resumen, con sus specs y sus E2E. Depende de F12a y de C5; con F10 queda bajo `#administracion`. Cierra la entrada «C5» de «Enmiendas pendientes» de la hoja de ruta del backend. Es nuevo, no un port: no tiene comportamiento legacy que conservar.
2. **Las dependencias de C5 ya están entregadas; sus datos, no.** La hoja de ruta dice «D1, B2». Lo que C5 lee lo dejaron D1a, D1b y B2, entregados: C5 puede planificarse e implementarse ya, sin esperar a la ola 5. Sus números describen el taller recién con A4 y D1c, y el ítem del front puede esperarlos.
3. **El §7 del ADR 0006** suma `GET /api/admin/stats/students` (Q2-A) y el resumen de la ficha (`usage`). La pregunta 6 de §13 se cierra con el clarify de C5.
4. **B2 no cuenta los rechazos.** Los 429 `quota_exceeded` y los 503 `queue_full` no dejan filas, así que nadie puede saber cuántas veces un aula se quedó sin lugar. Si hace falta, es un contador en B2 (o en los logs), no en C5.
5. **`php` no conoce los lugares del ejecutor.** `EXECUTOR_MAX_CONCURRENT` llega al servicio `executor` y a las réplicas de `worker-runs`, pero no al ancla `x-laravel-env` que lee `php`. `GET /api/admin/queue` lo necesita: el plan de C5 lo suma a la configuración.
6. **C4 y un usuario de MySQL para las estadísticas.** Entre los usuarios por rol de C4, uno de sólo lectura sin `SELECT` sobre las columnas de «Nunca sale» haría que el límite no dependa sólo de las pruebas. B3 pide uno de sólo lectura para el contenido: C4 puede resolver los dos juntos. El recorrido de la CSP de C4 (su SC-004) tampoco incluye las pantallas de F14.
7. **El aviso de privacidad (F11a).** Lo escribe el usuario. Tiene que decir qué ve el admin según Q1 y, con Q3-A, que cada consulta de una cuenta queda en los registros. Si F11a se entrega antes del clarify de C5 y el texto cambia después, cambia `PRIVACY_VERSION` y todos vuelven a aceptarlo.

## Assumptions

- **Las habilidades del §4.5.** `viewStats` y `viewRunMetadata` son las habilidades del rol `admin` sobre C5. Con un solo rol que las tiene, el plan decide si son Gates propios o el grupo `admin` de C3b; ninguna lleva un `before()` que autorice todo.
- **La zona horaria del taller** es `America/Argentina/Buenos_Aires` por omisión, configurable, y sólo corta los períodos: los datos siguen en UTC. Si el plan convierte con zonas con nombre dentro de MySQL, tiene que confirmar que las tablas de zonas horarias están cargadas también en los volúmenes que ya existen; con un desfase fijo también alcanza para Buenos Aires, que hoy no cambia de hora. Lo decide el plan.
- **El período por omisión** son los últimos 30 días, y el máximo, 366. El plan puede ajustarlos con la medición (FR-038).
- **Sin interruptor para los admins.** S5 los excluye «por defecto»; con la cuenta de admin separada que recomienda el ADR, el caso de sumarlos no aparece. Si aparece, es Q5-C.
- **La caché** es la del store `database` que ya usa el taller, sin Redis (ADR 0006 §9). Sus claves no llevan datos de una cuenta, porque las rutas por cuenta no usan caché.
- **El tope de tiempo** arranca en unos pocos segundos (el plan lo fija con la medición) y es configuración.
- **La población sintética** se genera con un comando o un script que diseña el plan, en una base aparte (por ejemplo, la de pruebas con otro nombre de proyecto de Compose). Dos años de intentos con la estimación de D38 son unos 22 millones de filas en `attempts` y unos 66 millones en `attempt_tests`: si generarlas no es práctico, el plan propone una escala menor, la extrapola y lo dice.
- **El texto de los ejercicios** (títulos, consignas) es contenido y puede salir; la pantalla igual puede tomarlo del contenido que ya cargó.
- **Nginx no guarda la query string** en `/api/` (ADR 0006 D20), así que una búsqueda por nombre o email en la lista no queda en sus logs.
- **Los IDs de los requisitos** empiezan en FR-001: C5 no hereda requisitos de otra spec.
