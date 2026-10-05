# Feature Specification: B2 · API de ejecuciones

**Feature Branch**: `005-b2-api-ejecuciones` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Clarificada (sesión del 2026-10-05); lista para el plan

**Input**: Ítem **B2** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «API de ejecuciones». Fuente técnica: el [ADR 0005](../../docs/adr/0005-ejecucion-en-sandbox-propio.md) (aceptada, enmendada el 2026-10-04) y el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (**propuesta**: el usuario todavía no lo aprobó), en sus §3 (D14, D26 a D30, D38 y D39), §5.3 y §5.4, §6.5, §7, §9, §10 y §12. Donde los dos difieren manda el 0006, pero sólo como propuesta: lo que depende de él cambia si el usuario lo enmienda (ver «Lo que pidió el usuario»).

## Intención y alcance

**Lo que entendemos.** Hoy el navegador arma el programa (el código del alumno más el harness que escribe `buildProgram` en [`frontend/lab.js`](../../frontend/lab.js)), lo manda a los Playgrounds públicos de Rust y de Go y decide por su cuenta qué pruebas pasaron. B2 mueve todo eso al servidor. El alumno envía su código y recibe enseguida el id de su ejecución; un worker la corre en el sandbox propio de B1 mientras el navegador consulta; el servidor arma el programa con las pruebas guardadas, decide el resultado a partir de la evidencia y deja un intento liviano por ejecución. Con muchos usuarios, además, fija reglas para que una cuenta no deje sin sandbox a las demás: cuotas por usuario, un tope global de cola y un 503 con `Retry-After`. Es para el alumno (a través del laboratorio, que migra en A4), para quien opera el taller y para quien mantiene el currículo (las claves de prueba y la plantilla del harness). Hasta A4 no hay un cliente real: B2 se prueba con un cliente de prueba y con el ejecutor verdadero. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con el ejecutor real, en Rust y en Go, una solución de referencia llega a `passed` y un código inicial a `failed`, y el error de compilación, el pánico, el bucle infinito y la salida desbordada tienen cada uno su estado.
2. Una cuenta no puede ocupar más que su cuota ni hacer crecer la cola sin límite: lo que se pasa recibe 429 o 503 con `Retry-After`, y lo rechazado no deja rastro ni gasta cuota.
3. Ni un reintento, ni una caída, ni un despliegue ejecutan dos veces el código de un alumno. Lo que el servidor no puede asegurar termina en `infra_error`, y es el alumno quien vuelve a pedir.
4. Cada ejecución terminada deja un intento liviano, con su payload aparte, y el progreso del servidor refleja sólo ejecuciones de la época vigente.
5. El programa de la vista previa y el que corre en el sandbox son el mismo texto, y las pruebas de un ejercicio tienen claves que no cambian.

**Entra:**

- Las rutas `POST /api/runs`, `GET /api/runs/{id}` y `POST /api/runs/{id}/cancel`.
- La cola propia `runs`, los workers y el servicio `executor` en Compose, con su red, su token y el socket de Docker sólo para él.
- Las cuotas por usuario, el tope global y sus respuestas 429 y 503.
- La composición del programa en el servidor, la lectura de la evidencia y la clasificación del resultado.
- Las tablas `runs`, `attempts`, `attempt_tests` y `attempt_payloads`, más `progress_heads` y `exercise_progress`, creadas completas.
- El cierre de cada ejecución (intento, progreso del servidor y época), el barrido de las vencidas y las podas.
- La plantilla del harness como contenido y como recurso, con el fixture compartido que la prueba.
- La precondición de `test_key` único e inmutable.
- Los cambios de configuración que eso pide: Nginx para `/api/runs`, Compose, la imagen de la API y `init-env.sh`.

**Queda fuera:**

- **D1:** la sincronización del progreso (`/api/sync`, `/api/progress`, la importación v1 y «Borrar todo»), las otras 12 tablas de progreso y la escritura de las columnas de `exercise_progress` que no salen de ejecuciones.
- **A4:** la vista del laboratorio: el cliente de `/api/runs`, la vista previa con la plantilla, el retiro del cliente de Playgrounds y el id del intento en el `result` v1.
- **C5:** `GET /api/admin/runs`, `GET /api/admin/queue` y las estadísticas. **B3:** la auditoría de todo el currículo. **C3:** cuentas, sesión, roles, límites de acceso y `scheduler`. **C4:** TLS y la IP real. **E1:** Esenciales.
- El ejecutor de B1 queda como está: no se extiende para informar una fase en vivo (Q2).
- Un veredicto inviolable, que el ADR 0005 §5 deja fuera, y los desbloqueos de la campaña, que decide el cliente (ADR 0006 D39).
- Los endpoints de historial de intentos (`GET /api/attempts` y `GET /api/attempts/{id}`, Q4) y las cuotas reducidas para cuentas sin verificar, que llegan con el registro abierto, hoy apagado. Ningún ítem de la hoja de ruta trae hoy los endpoints de historial: los traería A4, si suma un historial, o una spec nueva.

**Sin hacer a propósito (YAGNI):** Redis, SSE o Reverb para la espera (el camino de escala del ADR 0006 §9 los trae con sus disparadores); más de un ejecutor o slots dinámicos; prioridades o colas por aula; una cancelación que interrumpa el sandbox; reintentos automáticos del código del alumno; guardar los payloads fuera de MySQL o comprimirlos; una fase en vivo del run (Q2); los endpoints de historial de intentos (Q4); un panel de la cola (C5).

**Actores:** el alumno (hoy a través de un cliente de prueba y, desde A4, del laboratorio), quien opera el taller (levanta el stack, despliega y mira la cola), quien mantiene el currículo (claves de prueba y plantilla), el cliente del front (A4) y los equipos de C3, D1, C5 y B3, que apoyan o consumen lo que B2 deja.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una decisión del clarify (Clarifications).

| Pedido | Fuente |
| --- | --- |
| Ejecutar el código del alumno en el backend, de forma asincrónica y en un sandbox propio (un ejecutor en Go, con gVisor), en lugar de los Playgrounds públicos | ADR 0005, Contexto y decisiones 1 y 2 (aceptada el 2026-10-04); B1 entregado |
| Envío idempotente por `clientRunId` (el mismo código devuelve el mismo run y otro código responde 422), cola con un solo intento por trabajo, consulta con espera creciente de 0,3 a 2 s, cancelación, estados finales y `reason` | ADR 0005 §3 |
| Cada run terminado queda como intento con el `grading_hash` vigente; `infra_error` y `canceled` no cuentan como intento fallido | ADR 0005 §3 |
| El navegador manda el ID del ejercicio, su código y su prueba propia, nunca las pruebas; Laravel arma el programa con la plantilla del harness, que vive en el repo como contenido | ADR 0005 §4 |
| La evidencia son marcadores con nonce y un centinela con el conteo; es autodeclarada y no hay veredicto inviolable | ADR 0005 §5 |
| El código de una ejecución pesa a lo sumo 64 KiB | ADR 0005 §6 |
| Sólo ejecutan los usuarios autenticados; Nginx acota ritmo y tamaño, Laravel aplica `throttle` y un tope global de cola responde 503 con `Retry-After` | ADR 0005 §7 |
| Un usuario hoy y miles mañana, con infraestructura mínima y el camino de crecimiento escrito; roles admin y estudiante, con cada estudiante viendo y modificando sólo lo suyo; la API la consume sólo este front, del mismo origen y sin versionado público | ADR 0006 §2.1, R1, R4 y R6 |
| El `grading_hash` queda como en C2 y la plantilla del harness y los `imports` los decide B2, antes de que D1 importe progreso | [spec 001](../001-c2-contenido-mysql/spec.md), Clarifications, Q4 |
| C6 se entrega antes y B2 depende de C6, porque B2 cambia las pruebas de ejercicio y el generador | [spec 002](../002-c6-registros-tipados/spec.md), Clarifications, Q5 |
| B2 no incluye la sincronización del progreso (D1) ni la vista del laboratorio (A4) | Hoja de ruta, alcance de B2 |
| Esta spec deja claro: la cola propia y los workers, las cuotas por usuario y el tope global, el intento liviano con su payload aparte, el 503 con `Retry-After`, la plantilla del harness como recurso y la precondición de `test_key` único e inmutable | Pedido de esta tarea |
| Cuotas con los valores del ADR 0006 D27, configurables por entorno; la carga esperada queda con los supuestos del ADR (S2) | Usuario, clarify del 2026-10-05 (Q1) |
| `running` sin subfase: el resultado final informa la fase alcanzada y el ejecutor de B1 no cambia | Usuario, clarify del 2026-10-05 (Q2) |
| El `grading_hash` suma los `imports` de los ejercicios de Go y no la plantilla del harness, que cuida B3 | Usuario, clarify del 2026-10-05 (Q3) |
| `GET /api/attempts` y `GET /api/attempts/{id}` quedan fuera de B2 | Usuario, clarify del 2026-10-05 (Q4) |
| Las ejecuciones se retienen 14 días y los payloads 90, salvo el de la última aprobación y el del último intento de cada ejercicio | Usuario, clarify del 2026-10-05 (Q5) |

**Base del ADR 0006 (propuesta).** El usuario todavía no lo aprobó: la spec lo usa como base y cambia si lo enmienda. Las filas que chocan con el ADR 0005 aceptado (cuotas, `running` sin fase y retención del payload) las confirmó el usuario el 2026-10-05 en Q1, Q2 y Q5 (ver «Clarifications»): son requisitos de esta spec, y sólo falta registrar la enmienda en el ADR 0005 cuando se apruebe el 0006. Las demás siguen como propuesta del ADR. La aprobación del ADR condiciona la implementación, no la planificación.

| Decisión | Dónde | Qué cambia respecto del ADR 0005 aceptado |
| --- | --- | --- |
| Cuotas por usuario (1 activa, 10 por minuto, 300 y 30 minutos de sandbox cada 24 h) y tope global de 32 en cola | D27 | Reemplaza «de 3 a 4 simultáneas en total y 1 o 2 activas por usuario» (§6). Confirmada en Q1 |
| `running` sin fase en vivo | §10, enmiendas | Cambia «`running`, con fase `compiling` o `executing`» (§3). Confirmada en Q2 |
| Intento liviano y payload aparte, con retención propia | D26, D38 | Cambia «cada run terminado queda como intento», que guardaba el código en él (§3). Confirmada en Q5 |
| Cola `runs` propia con encolado dentro de la admisión y un worker por slot | D27, §9 | Detalla el §3 |
| Época por ejecución y por intento; `progress_heads` y `exercise_progress` completas en B2 | D26, D28 | Nuevo |
| Serialización por usuario con la cabecera de progreso | D08 | Nuevo |
| `test_key` único e inmutable por ejercicio | D14 | Nuevo |
| Evidencia autodeclarada como riesgo con muchos usuarios | §12 | Reclasifica el §5 |

## Clarifications

### Session 2026-10-05

- Q: **Q1**, ¿con qué cuotas arranca la ejecución? → A: Con las del ADR 0006 D27, configurables por entorno: por cuenta, 1 activa, 10 por minuto, 300 y 30 minutos de sandbox cada 24 horas; global, 32 en cola y 4 slots. La pregunta 15 del ADR (carga esperada y tamaño de las aulas) queda con los supuestos del ADR (S2). FR-010, que dice que un `infra_error` no gasta cuota, se planteó junto con Q1 y queda aceptada con esa respuesta. Decidió el usuario. (FR-007 a FR-011; ADR 0006 §13.16)
- Q: **Q2**, ¿mostramos la fase del run (compilando o ejecutando) mientras corre? → A: No. `running` es un solo estado y el resultado final informa la fase alcanzada. Se enmienda el ADR 0005 §3 y el ejecutor de B1 no cambia. Decidió el usuario. (FR-020; ADR 0006 §13.18)
- Q: **Q3**, ¿qué entra en el `grading_hash`: los `imports` de los ejercicios de Go y la plantilla del harness? → A: Los `imports` de Go, no la plantilla. La plantilla la cuida B3: no se integra un cambio de plantilla sin la auditoría de B3 en verde. Decidió el usuario. (FR-037; ADR 0006 §13.12; spec 001, Q4)
- Q: **Q4**, ¿entran en B2 los endpoints de historial de intentos? → A: No. `GET /api/attempts` y `GET /api/attempts/{id}` quedan fuera: B2 guarda los intentos y sus payloads, y el resultado de una ejecución se lee con `GET /api/runs/{id}` mientras exista. Ningún ítem de la hoja de ruta los trae hoy. Decidió el usuario. (FR-034)
- Q: **Q5**, ¿cuánto tiempo se conservan las ejecuciones y el código de los intentos? → A: Las ejecuciones, 14 días, y los payloads, 90, salvo el de la última aprobación y el del último intento de cada ejercicio, que se conservan mientras exista la cuenta. Decidió el usuario. (FR-044; ADR 0006 §13.13)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ejecutar mi código y ver el resultado (Priority: P1)

Un alumno con la sesión iniciada envía su código para un ejercicio y recibe enseguida el id de su ejecución. Mientras el servidor la corre en el sandbox, el cliente consulta. Al terminar, el alumno ve el estado, la salida completa y qué pruebas pasaron.

**Why this priority**: es el motivo de la feature. Reemplaza a los Playgrounds públicos y mueve del navegador al servidor la decisión de qué pasó.

**Independent Test**: con el stack levantado y un cliente de prueba (un script o Pest, porque el laboratorio todavía usa los Playgrounds), iniciar sesión, enviar la solución de referencia de un ejercicio de Rust y de uno de Go, consultar hasta un estado final y comparar estado, pruebas y salida con lo esperado.

**Acceptance Scenarios**:

1. **Dado** un alumno con sesión y un ejercicio activo, **cuando** envía su código, **entonces** el servidor responde 202 con el id y el estado `queued` sin esperar al sandbox, y la ejecución queda en la cola propia.
2. **Dada** la solución de referencia de un ejercicio, **cuando** la ejecución termina, **entonces** el estado es `passed`, cada prueba esperada figura aprobada una sola vez, y la respuesta trae la salida, los tiempos y la fase alcanzada.
3. **Dado** el código inicial de un ejercicio, **cuando** termina, **entonces** el estado es `failed` y las pruebas que fallan salen nombradas con su clave.
4. **Dados** un código con un error de compilación, uno que entra en pánico, uno que no termina y uno que imprime más de lo que admite la salida y termina, **cuando** terminan, **entonces** los estados son `compile_error`, `runtime_error`, `timeout` y `failed` (con motivo `output_limit`), cada uno con la salida que corresponde.
5. **Dado** un programa que imprime marcadores falsos, que sale con código 0 antes de las pruebas o que repite un marcador, **cuando** termina, **entonces** nunca queda en `passed`.
6. **Dada** una ejecución ajena, **cuando** otra cuenta la consulta, **entonces** responde 404, y ninguna respuesta incluye el programa armado.

*Cubre: FR-001 a FR-004, FR-020 a FR-025 y FR-041; SC-001, SC-002 y SC-008.*

---

### User Story 2 - Un intento liviano por ejecución (Priority: P1)

Cada ejecución que termina deja un intento permanente y liviano: qué pasó, contra qué corrección y cuándo, sin el código. El código, la prueba propia y las salidas recortadas viven aparte, con su propia retención. El progreso del servidor se actualiza sólo con lo que salió de ejecuciones de la época vigente.

**Why this priority**: es la memoria del taller (progreso, estadísticas, «cambió, volvé a verificarlo») y crece con cada ejecución, así que tiene que nacer liviano. Agregar después columnas con restricciones a una tabla con datos obliga a copiarla (ADR 0006 D07 y D28).

**Independent Test**: cerrar ejecuciones en cada estado final y contar filas; subir a mano la época de la cuenta y cerrar otra; correr la poda con el reloj adelantado más allá de la retención.

**Acceptance Scenarios**:

1. **Dada** una ejecución que llega a un estado final, **cuando** se cierra, **entonces** queda exactamente un intento, en la misma transacción, con el veredicto de cada prueba; una ejecución en curso no deja ninguno.
2. **Dadas** ejecuciones que terminan en `infra_error` o `canceled`, **cuando** se cierran, **entonces** dejan su intento pero no cuentan como intento del alumno.
3. **Dada** una aprobación en la época vigente, **cuando** se cierra, **entonces** el progreso del ejercicio registra la resolución, el último intento aprobado, el último no cancelado y el conteo de intentos de la época, y suben la revisión y la última actividad de la cuenta.
4. **Dada** una ejecución admitida en la época 1 cuyo cierre llega con la época en 2 (un «Borrar todo» en el medio, que la prueba simula subiendo la época a mano), **cuando** se cierra, **entonces** deja su intento como historia y no toca el progreso.
5. **Dado** un intento cuyo payload venció (y que no es la última aprobación ni el último intento de su ejercicio), **cuando** corre la poda, **entonces** el payload desaparece, el intento conserva sus metadatos y el código figura como «no conservado».

*Cubre: FR-027 a FR-034 y FR-044; SC-006, SC-007 y SC-011.*

---

### User Story 3 - Cuotas por usuario y tope global (Priority: P1)

Con muchos alumnos y 4 slots, una cuenta descontrolada, o un aula entera a la vez, no puede dejar sin sandbox al resto. El servidor limita lo que cada cuenta tiene en curso y en el día, y el tamaño total de la cola. Lo que se pasa recibe una respuesta clara con cuánto esperar.

**Why this priority**: sin esto el sandbox se satura con el primer bucle de reintentos, y el taller deja de servir a todos.

**Independent Test**: con los valores de Q1 (los del ADR), enviar ráfagas desde una cuenta y desde varias y contar las respuestas; después, el aula simulada de SC-012.

**Acceptance Scenarios**:

1. **Dada** una cuenta con una ejecución en curso, **cuando** envía otra, **entonces** recibe 429 `quota_exceeded` con `Retry-After` y no se crea nada.
2. **Dada** una cuenta que ya tuvo 10 ejecuciones aceptadas en el último minuto, **cuando** envía otra, **entonces** recibe 429 `quota_exceeded` con `Retry-After`. Lo mismo pasa al superar las 300 ejecuciones o los 30 minutos de sandbox de las últimas 24 horas.
3. **Dada** una cola con 32 ejecuciones esperando, **cuando** otra cuenta envía una, **entonces** recibe 503 `queue_full` con `Retry-After`; el pedido no deja ejecución ni gasta cuota, y al repetirlo con el mismo `clientRunId` cuando haya lugar se acepta.
4. **Dada** una cuenta que repite un pedido que ya se aceptó, **cuando** está en su límite de cuota o la cola está llena, **entonces** el reintento responde con la misma ejecución y no se rechaza.
5. **Dados** otros valores de cuota en la configuración, **cuando** se reinicia el servicio, **entonces** rigen los nuevos sin cambiar código.

*Cubre: FR-007 a FR-011; SC-003 y SC-012.*

---

### User Story 4 - Reintentar sin duplicar y sin ejecutar dos veces (Priority: P1)

Un doble clic, una pestaña que reintenta tras un corte, un worker que muere o un despliegue en medio de una ejecución no pueden hacer que el código de un alumno corra dos veces, ni dejar una ejecución sin dueño. Lo que el servidor no puede asegurar termina en `infra_error`, y quien vuelve a pedirlo es el alumno.

**Why this priority**: reejecutar código sin una acción del alumno cambia resultados y gasta slots (ADR 0005 §3), y las ejecuciones fantasma contaminan los intentos.

**Independent Test**: enviar el mismo pedido veinte veces en paralelo; matar el worker con una ejecución en curso; detener el ejecutor y volver a levantarlo con ejecuciones esperando.

**Acceptance Scenarios**:

1. **Dado** un envío ya aceptado, **cuando** la misma cuenta lo repite con el mismo `clientRunId`, ejercicio, código y prueba propia, **entonces** recibe 200 con la misma ejecución en su estado actual; con cualquier diferencia recibe 422 `client_run_id_reused`.
2. **Dados** veinte pedidos idénticos simultáneos, **cuando** se procesan, **entonces** queda una ejecución, un trabajo y un solo pedido al ejecutor.
3. **Dado** un ejecutor ocupado (503) o reiniciándose (conexión rechazada), **cuando** el worker lo intenta, **entonces** la ejecución no gasta la única vez que se intenta su trabajo: vuelve a `queued` con la espera que indicó y, pasados 10 minutos desde su aceptación, termina `infra_error` con motivo `executor_busy` (o `expired`, si el barrido la cierra antes que el worker).
4. **Dado** un ejecutor que responde 500 o corta la conexión, **cuando** el worker lo recibe, **entonces** la ejecución termina `infra_error` con motivo `executor_error` y no se reintenta sola.
5. **Dado** un worker que muere con una ejecución en curso, **cuando** pasa el plazo de reserva del trabajo, **entonces** el código no se vuelve a ejecutar y la ejecución termina `infra_error`, con lo que se libera la cuota de «1 activa» del alumno.
6. **Dados** dos pedidos simultáneos de la misma cuenta con claves distintas, **cuando** se procesan, **entonces** uno se acepta y el otro recibe 429 `quota_exceeded`.

*Cubre: FR-005, FR-006 y FR-012 a FR-018; SC-004 y SC-005.*

---

### User Story 5 - Cancelar, y cuentas que cambian (Priority: P2)

El alumno puede cancelar una ejecución que no quiere esperar. Si su cuenta se deshabilita, lo que esperaba turno no se ejecuta.

**Why this priority**: libera la cuota de «1 activa» y evita ejecutar para cuentas que ya no deberían. No bloquea el resto de la feature.

**Independent Test**: cancelar en cada estado; deshabilitar la cuenta con ejecuciones en cola.

**Acceptance Scenarios**:

1. **Dada** una ejecución en cola, **cuando** el dueño la cancela, **entonces** responde 200, queda `canceled` al instante, deja su intento (que no cuenta) y libera la cuota.
2. **Dada** una ejecución que corre, **cuando** el dueño la cancela, **entonces** responde 202, el sandbox sigue hasta terminar y la ejecución termina `canceled` sin tocar el progreso.
3. **Dada** una ejecución ya terminada, **cuando** se la cancela, **entonces** responde 200 y no cambia nada; si es de otra cuenta, 404.
4. **Dada** una cuenta deshabilitada con ejecuciones en cola, **cuando** les llega el turno, **entonces** no se ejecutan y terminan `canceled` con motivo `account_disabled`; un envío nuevo recibe 403 `account_disabled`.

*Cubre: FR-019, FR-026 y FR-041; SC-007 y SC-008.*

---

### User Story 6 - La plantilla del harness y las claves de prueba estables (Priority: P2)

La plantilla del harness (el programa que envuelve el código del alumno y corre las pruebas) es contenido del taller. La edita quien mantiene el currículo, el servidor la usa para ejecutar y el navegador la usará para mostrar el programa completo antes de enviar. Las pruebas de un ejercicio tienen claves que no cambian ni se reutilizan, para que la historia no mezcle pruebas distintas.

**Why this priority**: la vista previa sólo sirve si es el mismo texto, porque los números de línea del compilador se miran contra ella. Y B2 es el primero que graba el veredicto de cada prueba (ADR 0006 D14).

**Independent Test**: pedir la plantilla con y sin `If-None-Match`; armar con el servidor los casos del fixture compartido y compararlos con los textos esperados escritos a mano; agregar a un ejercicio una prueba con una clave nueva y retirar otra.

**Acceptance Scenarios**:

1. **Dada** la plantilla importada, **cuando** se la pide con el validador que ya se tiene, **entonces** responde 304; sin él, 200 con los bytes que fijó el generador.
2. **Dados** los casos del fixture compartido (Rust y Go, con y sin prueba propia, con y sin `imports`), **cuando** el servidor arma el programa con un nonce fijo, **entonces** el texto es el esperado, línea por línea.
3. **Dado** un cambio en la plantilla, **cuando** se importa, **entonces** las 17 porciones conservan sus bytes y sus validadores.
4. **Dado** un ejercicio al que se le agrega una prueba con clave nueva y se le retira otra, **cuando** se genera y se importa, **entonces** el generador acepta las claves no consecutivas, la clave retirada queda retirada y las claves actuales (`t1` a `t3`) no cambian.
5. **Dado** un ejercicio con dos pruebas con la misma clave, con una forma que el protocolo no lee o con la clave `custom`, **cuando** se genera, **entonces** el generador lo rechaza con un mensaje en español que dice archivo, ruta y problema.
6. **Dada** una prueba nueva que toma la clave de una retirada, **cuando** se importa, **entonces** el import la rechaza y no escribe nada.

*Cubre: FR-035 a FR-040; SC-009 y SC-010.*

---

### User Story 7 - Operar el sandbox (Priority: P3)

Quien opera el taller levanta el stack con el ejecutor y los workers, y sabe qué pasa cuando algo se detiene, se llena o se acumula. El ejecutor sólo se alcanza desde el worker, los despliegues no pierden ejecuciones en silencio y lo viejo se poda.

**Why this priority**: es lo que mantiene a B2 operable con infraestructura mínima (R1) y sin crecer sin control (ADR 0006 D38).

**Independent Test**: levantar el stack con `docker compose`; comprobar que el ejecutor no responde desde `php` ni desde el host; reiniciar el worker con una ejecución en curso; correr el barrido y la poda.

**Acceptance Scenarios**:

1. **Dado** el stack levantado, **cuando** se prueba el acceso al ejecutor, **entonces** sólo el worker lo alcanza, con su token, y no hay puertos publicados.
2. **Dado** un equipo sin gVisor, **cuando** se configura runc, **entonces** el stack corre para desarrollo y el riesgo queda dicho en el ADR 0005.
3. **Dado** un worker que se reinicia con una ejecución en curso, **cuando** se detiene, **entonces** termina su trabajo; si se lo mata, la ejecución se cierra `infra_error` y no se repite.
4. **Dadas** ejecuciones y payloads vencidos, **cuando** corre la poda, **entonces** borra por lotes sólo lo vencido y no toca lo que se conserva.
5. **Dada** una corrida completa de ejecuciones, **cuando** se revisa el log, **entonces** cada línea lleva id, cuenta, estado y motivo, y ninguna lleva código, salida ni programa.

*Cubre: FR-042 a FR-049; SC-008, SC-011 a SC-013.*

---

### Edge Cases

- **El 503 de la API (`queue_full`)** significa que no se aceptó nada: no hay ejecución, ni trabajo, ni cuota gastada, y el cliente puede repetir el pedido con la misma clave. Es el único 503 que ve el alumno.
- **El 503 del ejecutor** es otra cosa: significa que no corrió nada de una ejecución que ya se aceptó. El worker no gasta la única vez que se intenta su trabajo: devuelve la ejecución a `queued` con la espera que indica el ejecutor y, pasado el plazo, la cierra `infra_error` con motivo `executor_busy` (o `expired`, si el barrido llega antes).
- **El 500 del ejecutor, una conexión que se corta sin respuesta o un 2xx con un cuerpo que no es un resultado válido** significan que pudo haber corrido: `infra_error` sin reintento.
- **Una ejecución que vence mientras su worker sigue vivo** (un ejecutor lento): el barrido la cierra como `infra_error`. Si el worker termina después, ve la ejecución cerrada y descarta su resultado: nunca hay un segundo intento para la misma ejecución.
- **Un cierre que falla** (la base no responde después de correr): se reintenta el cierre unas veces. Si no se logra, la ejecución queda `running` hasta que el barrido la cierre como `infra_error`: el código corrió y su intento se pierde, y el alumno puede volver a pedir.
- **Un despliegue con ejecuciones en curso.** Al apagarse, el ejecutor responde 503 a las que esperaban lugar (no corrieron: se reencolan) y 500 a las que ejecutaban (`infra_error`). El worker termina su trabajo o, si se lo mata, la ejecución se cierra `infra_error`.
- **Tamaños.** El código se mide en bytes (64 KiB) y no en caracteres; la prueba propia admite 3.000 caracteres; un cuerpo de más de 192 KiB lo corta Nginx con 413 antes de llegar a PHP.
- **Un ejercicio retirado.** Pedir ejecutar uno retirado se rechaza sin crear nada. Si se retira mientras su ejecución espera o corre, la ejecución termina y deja su intento: un intento puede apuntar a un ejercicio retirado.
- **Un import de contenido en el medio.** El programa y el `grading_hash` salen de una misma lectura, y el intento guarda el hash con que se verificó, no el vigente al cerrar. Si el hash vigente cambia después, el «cambió, volvé a verificarlo» lo calcula la lectura de progreso (D1), no B2.
- **La prueba propia.** Si no compila, falla la compilación de todo el programa, como hoy en el laboratorio. Si entra en pánico, sólo falla `custom`.
- **Programas que se hacen pasar por aprobados.** Los marcadores llevan el nonce de esa ejecución y se exige exactamente uno por cada prueba esperada más el centinela, así que un código que imprime marcadores sin el nonce, repite uno o sale antes no aprueba. Un código que lee el nonce de su propio binario sí puede imprimir marcadores válidos: es la evidencia autodeclarada que acepta el ADR 0005 §5, y B2 la llama «ejecutado en el servidor», nunca «verificado».
- **La clave de idempotencia es de la cuenta.** Otra cuenta puede usar el mismo `clientRunId`. Vale mientras exista la ejecución (14 días, Q5): pasado ese plazo, el mismo `clientRunId` crea una ejecución nueva. Con la cuenta deshabilitada, un reintento recibe 403 antes que la ejecución.
- **La primera ejecución de una cuenta** no tiene cabecera de progreso: se crea al admitirla.
- **Dos pestañas o dos dispositivos de una cuenta.** La segunda ejecución simultánea recibe 429 `quota_exceeded` por la cuota de «1 activa».
- **Consultas ajenas o podadas.** `GET` o `cancel` sobre una ejecución de otra cuenta, inexistente o podada responden 404.
- **Un pedido con una cuenta esperada distinta de la de la sesión** recibe 409 `account_mismatch` antes de tocar datos (C3, ADR 0006 D36).
- **«Borrar todo» en el medio.** No existe hasta D1. B2 prueba la época subiéndola a mano en la base, y D1 repite el escenario con el reset real.
- **Una cuenta en supresión.** Sus ejecuciones activas se cancelan (C3 debe dejar el punto de extensión) y la purga borra sus ejecuciones, intentos y payloads por lotes.

## Requirements *(mandatory)*

### Functional Requirements

**Envío de una ejecución**

- **FR-001**: `POST /api/runs` DEBE recibir `clientRunId`, `exerciseId`, `code` y, opcional, `customTest`, y responder 202 con el `id` de la ejecución y el estado `queued`, sin esperar al sandbox. La cuenta sale de la sesión y nunca del cuerpo. El pedido lleva la cuenta esperada y la protección contra pedidos de otro origen que fija C3. *(ADR 0005 §3; ADR 0006 D36)*
- **FR-002**: El pedido DEBE rechazarse sin crear nada, con el cuerpo `{message, code}` y el mensaje en español, si el código está vacío o tiene sólo espacios, si supera los 64 KiB contados en bytes, si la prueba propia supera los 3.000 caracteres, si el `clientRunId` no es un UUID (se guarda en minúsculas) o si el ejercicio no existe o está retirado. *(ADR 0005 §6; ADR 0006 §8)*
- **FR-003**: El pedido NO DEBE traer pruebas, lenguaje ni programa: el lenguaje y las pruebas salen del ejercicio guardado. *(ADR 0005 §4)*
- **FR-004**: El servidor DEBE armar el programa con el código, las pruebas activas del ejercicio, la prueba propia como la prueba `custom` y la plantilla del lenguaje. Las pruebas y el `grading_hash` vigente DEBEN salir de una misma lectura consistente de la base, para que sean de la misma versión del contenido. El nonce es único por ejecución y de 128 bits. *(ADR 0005 §4 y §5; ADR 0006 D27)*
- **FR-005**: La admisión DEBE ser atómica: la ejecución y su trabajo en cola se confirman juntos o no queda nada, y ninguna ejecución queda en cola sin su trabajo. Las validaciones y el armado del programa ocurren antes de tomar el candado del usuario, para que el candado dure poco. *(ADR 0006 D08 y D27)*
- **FR-006**: El envío DEBE ser idempotente por cuenta y `clientRunId`: el mismo ejercicio, código y prueba propia devuelven la misma ejecución con 200 y su estado actual, y cualquier diferencia responde 422 `client_run_id_reused`. Dos pedidos simultáneos con la misma clave dejan una sola ejecución y un solo pedido al ejecutor. Un reintento no se rechaza por cuota ni por tope global y no los gasta.

**Cuotas y tope global**

- **FR-007**: Cada cuenta DEBE tener cuotas de ejecución: una activa a la vez (en cola o corriendo), 10 aceptadas por minuto, 300 cada 24 horas y 30 minutos de sandbox (compilación más ejecución) cada 24 horas. Son los valores del ADR 0006 D27 (Q1). Al superarlas, 429 `quota_exceeded` con `Retry-After`.
- **FR-008**: La cola DEBE tener un tope global: con 32 ejecuciones esperando, un envío nuevo recibe 503 `queue_full` con `Retry-After`. El rechazo no crea ejecución, no encola nada y no gasta cuota. El tope es blando: pedidos simultáneos pueden pasarlo por unas pocas ejecuciones, y las pruebas no exigen exactitud bajo concurrencia.
- **FR-009**: Cada valor de FR-007 y FR-008, la cantidad de slots y de workers y el plazo de vencimiento DEBEN ser configuración de despliegue y no constantes del código: cambiarlos pide reiniciar, no desplegar código.
- **FR-010**: *(planteada junto con Q1 y aceptada con su respuesta)* Gasta cuota toda ejecución aceptada, con cualquier resultado menos `infra_error`, porque ese fallo no es del alumno. Lo que se rechaza (422, 429, 503) no gasta.
- **FR-011**: El límite de ritmo de `POST /api/runs` por cuenta (30 por minuto, contando también los pedidos rechazados) es independiente de la cuota y responde 429 `too_many_requests`. Todo 429 y todo 503 de la API DEBEN llevar `Retry-After` en segundos enteros.

**Cola y workers**

- **FR-012**: Las ejecuciones DEBEN usar una cola propia, `runs`, distinta de `default` y de `mail`. Ninguna ejecución se encola en otra cola y ningún worker de otra cola atiende `runs`.
- **FR-013**: Cada trabajo DEBE intentarse una sola vez: ante una caída, el código del alumno no se vuelve a ejecutar sin que el alumno lo pida de nuevo. Los plazos del trabajo, del cliente que espera al ejecutor y del ejecutor se ordenan de modo que ninguno dé por perdido un trabajo que sigue corriendo (ADR 0005, enmienda de B1).
- **FR-014**: DEBE haber tantos workers de `runs` como slots del ejecutor (4 al empezar). Cada uno atiende un trabajo por vez, y ninguna transacción de base de datos queda abierta mientras espera al ejecutor.
- **FR-015**: Reclamar una ejecución (de `queued` a `running`, con su hora de inicio) y cerrarla DEBEN ser transacciones cortas, serializadas por usuario con la cabecera de progreso y en el orden de bloqueo único de D08.
- **FR-016**: Si el ejecutor responde ocupado (503 con `Retry-After`) o no se lo alcanza (conexión rechazada, por ejemplo mientras reinicia), no corrió nada: la ejecución DEBE volver a `queued` con la espera indicada, sin gastar la única vez que se intenta su trabajo, hasta 10 minutos después de su aceptación (ADR 0006 §12). Pasado ese plazo, el worker que la recibe la cierra `infra_error` con motivo `executor_busy`; si el barrido la cierra antes (FR-018), el motivo es `expired`. Es el mismo estado y en los dos casos no corrió nada.
- **FR-017**: Si el ejecutor responde 500, corta la conexión sin respuesta o devuelve un cuerpo que no es un resultado válido, pudo haber corrido: la ejecución DEBE terminar `infra_error` con motivo `executor_error` y NO DEBE reintentarse sola.
- **FR-018**: Un trabajo que falla DEBE terminar `infra_error` con motivo `job_failed`. Una ejecución vence si lleva 10 minutos en `queued` desde su aceptación (esperando al ejecutor o porque ningún worker la tomó) o si lleva en `running` más que la reserva de su trabajo, 140 s (`retry_after`, ADR 0006 D27), sin cerrarse. Un barrido cada minuto cierra las vencidas como `infra_error` con motivo `expired`, aun si su worker murió. Por eso un worker caído no deja a un alumno sin poder ejecutar más de unos 4 minutos: la reserva más el minuto del barrido, un derivado de esta spec que el plan confirma. Una ejecución ya cerrada no se cierra otra vez: el resultado tardío de su worker se descarta.
- **FR-019**: Una ejecución en cola cuya cuenta ya no está activa cuando le llega el turno NO DEBE ejecutarse: termina `canceled` con motivo `account_disabled`. Enviar con la cuenta deshabilitada responde 403 `account_disabled`.

**Resultado de una ejecución**

- **FR-020**: Una ejecución DEBE pasar por `queued` y `running` y terminar en `passed`, `failed`, `compile_error`, `runtime_error`, `timeout`, `infra_error` o `canceled`. `reason` detalla el motivo, y es un conjunto que valida el código y que puede crecer. `running` no tiene subfase y el resultado final informa la fase alcanzada (Q2).
- **FR-021**: El estado final DEBE salir de este orden fijo (ADR 0005, enmienda de B1): tiempo agotado, memoria agotada, error de compilación, error de ejecución y, por último, la evidencia. La tabla de «Key Entities» fija el estado y el motivo de cada caso.
- **FR-022**: Una ejecución sólo DEBE quedar en `passed` si el programa terminó con código 0, tiene exactamente un marcador `PASS` con el nonce de esa ejecución por cada prueba esperada y trae el centinela con el conteo correcto. Los marcadores con otro nonce no cuentan. Con código 0, una prueba en `FAIL` da `failed`; un marcador o un centinela que falta o se repite da `failed` con motivo `evidence_invalid`; y una salida recortada antes de las pruebas da `failed` con motivo `output_limit`.
- **FR-023**: La prueba propia DEBE informarse aparte (`pass`, `fail` o `missing`) y NO DEBE contar para aprobar.
- **FR-024**: `GET /api/runs/{id}` DEBE responder sólo al dueño (una ejecución ajena, inexistente o podada responde 404) con el estado, la posición en la cola mientras espera y, si terminó, la salida completa (con el indicador de truncado), los tiempos de compilación y de ejecución, la fase alcanzada y el veredicto de cada prueba y de la prueba propia. NO DEBE devolver nunca el programa armado.
- **FR-025**: Esa consulta DEBE ser barata: una lectura por clave y sin el límite de ritmo de Laravel (sí el de Nginx por IP), porque el cliente la repite cada 0,3 a 2 segundos mientras espera (ADR 0006 §3.1).
- **FR-026**: `POST /api/runs/{id}/cancel`, sólo para el dueño y con la cuenta esperada, DEBE cerrar al instante una ejecución en cola como `canceled` (200). Si corre, DEBE aceptar la cancelación (202) sin interrumpir el sandbox, de modo que termine `canceled` cuando el sandbox termine o el barrido la venza. Si ya terminó, no cambia nada (200).

**Intento liviano**

- **FR-027**: Toda ejecución que llega a un estado final DEBE dejar exactamente un intento, en la misma transacción que la cierra, también si termina `infra_error` o `canceled`. Una ejecución en curso no deja ninguno.
- **FR-028**: El intento DEBE ser permanente, inmutable y liviano. Guarda el resultado y el motivo, el `grading_hash` con que se verificó, la huella `code_sha256` del código, la fase alcanzada, el código de salida, los tiempos de compilación y de ejecución, si la salida se truncó, las fechas, la época, el veredicto de cada prueba esperada (`pass`, `fail` o `missing`) y el de la prueba propia, si la hubo. Se fecha en la aceptación del envío. NO guarda el código ni las salidas.
- **FR-029**: «Cuenta como intento» DEBE tener una sola definición: un intento que no es legado y terminó en `passed`, `failed`, `compile_error`, `runtime_error` o `timeout`. `infra_error` y `canceled` no cuentan.
- **FR-030**: El código, la prueba propia y las salidas recortadas DEBEN guardarse en un payload aparte, uno por intento, con retención propia (FR-044). Un intento sin payload se muestra como «código no conservado». El programa armado se borra al cerrar la ejecución.
- **FR-031**: Al admitir, la ejecución DEBE copiar la época vigente de la cabecera de progreso del usuario. Al cerrar, sólo si esa época sigue siendo la vigente actualiza el progreso del ejercicio. Si hubo un «Borrar todo» en el medio, queda como historia y no toca el progreso.
- **FR-032**: Al cerrar con la época vigente, DEBE actualizarse la fila de progreso del ejercicio. La fecha de resolución sólo baja (gana la más temprana); se registra la primera aprobación ejecutada en el servidor de la época; el último intento aprobado y el último no cancelado se comparan por fecha y id; y el conteo de intentos es el de los que cuentan en la época. Suben la revisión y la última actividad de la cuenta, y ninguna fila queda con revisión 0. *(ADR 0006 D26, D28 y D39)*
- **FR-033**: B2 DEBE crear `progress_heads` y `exercise_progress` con todas las columnas, índices y reglas del ADR 0006 §5.3, incluidas las que sólo escribirá D1, mientras están vacías: D1 no las altera. Las reglas de fila que tocan fechas quedan en el escritor y en su prueba, por el resultado de C2 sobre D07.
- **FR-034**: B2 NO DEBE agregar `GET /api/attempts` ni `GET /api/attempts/{id}`. Los intentos y sus payloads se guardan y se podan, y el resultado de una ejecución se lee con `GET /api/runs/{id}` mientras exista.

**Plantilla del harness y corrección**

- **FR-035**: La plantilla del harness de cada lenguaje DEBE ser contenido: vivir en `content/`, validarla el generador, importarla `content:import` y publicarse como recurso de sólo lectura con el contrato de las porciones de C2 (bytes y huella que fija el generador, validador por huella, `Content-Version` y 304). Agregarla NO DEBE cambiar los bytes ni los validadores de las 17 porciones. Es una plantilla nueva, con nonce y centinela, y no la de `buildProgram`, que no los tiene: el laboratorio vigente sigue con la suya hasta A4.
- **FR-036**: Con las mismas entradas y un nonce fijo, el programa que arma el servidor y el que arma el navegador para la vista previa (A4) DEBEN ser el mismo texto, y el nonce ocupa siempre el mismo largo, así que los números de línea que informa el compilador coinciden. Lo prueba un fixture compartido, con textos esperados escritos a mano e independientes de los dos renderizadores: B2 lo produce y A4 lo consume. *(ADR 0005 §4)*
- **FR-037**: El `grading_hash` DEBE seguir la composición de C2 (id y expresión de cada prueba, más las opciones y la respuesta de la predicción) y sumar los `imports` de los ejercicios de Go que los tengan (49 hoy): los otros 225 conservan su `grading_hash`. La plantilla del harness no entra: no se integra un cambio de plantilla sin la auditoría B3 en verde (Q3).
- **FR-038**: La composición del programa y la lectura de la evidencia NO DEBEN depender de la cola ni de las tablas de ejecución. Se pueden usar con un ejercicio y un código cualquiera sin escribir `runs` ni `attempts`, porque la auditoría B3 las reutiliza.

**Claves de prueba**

- **FR-039**: Cada prueba de un ejercicio DEBE tener una clave (`test_key`) única dentro del ejercicio, que no cambia ni se reutiliza. El generador DEBE dejar de exigir `t{índice+1}` y pedir en su lugar que las claves sean únicas dentro del ejercicio, de hasta 64 caracteres entre letras ASCII, dígitos y guion bajo (la forma que lee el marcador y que cabe en la columna), y distintas de `custom`, reservada para la prueba propia. Sigue exigiendo tres pruebas por ejercicio: B2 no cambia esa regla. Las claves actuales (`t1` a `t3` en los 274 ejercicios) siguen valiendo y el contenido publicado no cambia un byte.
- **FR-040**: El importador ya rechaza reutilizar la clave de una prueba retirada (C2; ADR 0006 D14) y DEBE conservar esa regla. Su mensaje, que hoy dice que hay que esperar a B2, DEBE decir lo que se hace ahora: darle otra clave a la prueba nueva. Las pruebas que fijan ese texto cambian con él.

**Seguridad, privacidad y operación**

- **FR-041**: Sólo el dueño DEBE ver y cancelar sus ejecuciones: lo ajeno responde 404, ningún pedido recibe `user_id` y B2 no le da a ningún rol acceso al código ni a la salida de otra cuenta.
- **FR-042**: Los registros de log de las ejecuciones DEBEN llevar el id de la ejecución, la cuenta, el estado y el motivo, y NO DEBEN llevar el código, la prueba propia, la salida ni el programa armado.
- **FR-043**: Las tablas de B2 DEBEN entrar en la supresión de cuentas (las que tienen `user_id`, con FK con CASCADE hacia `users`, y las hijas, por su intento; borrado por lotes en el orden de D06 y con las ejecuciones activas canceladas antes) y los intentos con su payload conservado, en la exportación del titular, según el contrato de `UserData` que fije C3. Una prueba de esquema comprueba que un `DELETE FROM users` con todas las tablas pobladas no falla y no deja filas. *(ADR 0006 D06, D33 y §8)*
- **FR-044**: La poda DEBE borrar las ejecuciones de más de 14 días y los payloads de más de 90 días, salvo el de la última aprobación y el del último intento de cada ejercicio, que se conservan mientras exista la cuenta (Q5). Va por lotes, recorriendo la clave primaria, y la agenda el `scheduler` de C3.
- **FR-045**: El ejecutor DEBE ser alcanzable sólo desde el worker (una red interna compartida sólo entre los dos, sin puertos publicados y con su token) y ser el único componente con el socket de Docker. En un equipo sin gVisor DEBE poder correr con runc, por configuración y sólo para desarrollo, con el riesgo que registra el ADR 0005.
- **FR-046**: B2 DEBE agregar en Nginx la ubicación de `/api/runs` con el tope de cuerpo de 192 KiB. El límite de ritmo por IP es de C3, que fija las zonas de `limit_req` y DEBE hacerlas responder 429 y no el 503 que Nginx usa por omisión, que se confundiría con `queue_full` (ver la tabla de C3).

**Verificación** (pruebas que el cambio DEBE traer antes de la implementación, según el principio II de la [constitución](../../.specify/memory/constitution.md))

- **FR-047**: Las pruebas (Pest contra MySQL real, con un doble del ejecutor que devuelve las respuestas de su contrato) DEBEN cubrir, con valores esperados que salen del contrato y no del código que se prueba: la tabla de clasificación (un caso por fila de la tabla de «Key Entities»), la evidencia (la batería de SC-002), la idempotencia y las cuotas bajo concurrencia real (conexiones paralelas), el reencolado y el `infra_error`, la época, el cierre que no duplica el intento, la matriz de acceso ajeno y de cuenta esperada, y la poda.
- **FR-048**: Un check de punta a punta contra el stack levantado y el ejecutor real (con runsc si está disponible; el plan fija su nombre y su comando) DEBE correr los 12 casos de SC-001 y la medición de SC-012. No forma parte de `npm test`, igual que `api:content:check`.
- **FR-049**: El código de B2 DEBE pasar el análisis estático en el nivel que deja C6 (el 9, sin baseline ni errores ignorados) y Pint, y las pruebas del ejecutor si se lo toca (`npm run test:executor`). NO DEBE agregar paquetes de Composer sin permiso del usuario (constitución VII).

### Key Entities *(include if feature involves data)*

Los tipos de columna, los índices y las restricciones están en el ADR 0006 (§5.3, §5.4, D26 a D29 y D38). Acá van sólo los conceptos.

- **Ejecución (run):** el registro operativo de un envío: lo que se pidió, el programa armado (hasta que cierra), el estado, la salida completa y los tiempos. Se modifica hasta su estado final y se poda. Su id es público y opaco.
- **Intento:** el registro permanente y liviano que deja una ejecución terminada (FR-027 y FR-028). No se modifica: sólo se borra con la cuenta.
- **Veredicto de prueba:** el resultado de cada prueba esperada en un intento (`pass`, `fail` o `missing`), con su clave. No hay filas cuando no se leyó evidencia.
- **Payload del intento:** el código, la prueba propia y las salidas recortadas de un intento, con retención propia.
- **Cabecera de progreso:** una fila por usuario con la época, la revisión y la última actividad. Es también el candado por usuario: serializa la admisión y el cierre de las ejecuciones (y, desde D1, la sincronización).
- **Progreso del ejercicio:** una fila por usuario y ejercicio. B2 escribe la parte que sale de ejecuciones (resolución, prueba, último intento y conteo), y D1 escribe el resto.
- **Época:** el contador de la cuenta que sube con «Borrar todo» (D1) y separa la historia vigente de la anterior.
- **Plantilla del harness:** por lenguaje, el texto que envuelve el código del alumno y corre las pruebas, con lugares para el código, las pruebas, la prueba propia, los `imports` de Go y el nonce.
- **Marcador, nonce y centinela:** el protocolo de evidencia. Cada prueba imprime su veredicto con el nonce de esa ejecución, y el programa cierra con un centinela que lleva el conteo.
- **Clave de prueba (`test_key`):** el identificador de una prueba dentro de su ejercicio. Aparece en los marcadores y en los veredictos.
- **Cola `runs` y worker:** la cola propia y los procesos que atienden un trabajo por vez, tantos como slots.
- **Ejecutor y slot:** el servicio de B1 (`POST /v1/run`, sincrónico y con token). Un slot es una ejecución simultánea; son 4 al empezar y la configuración admite de 1 a 8.
- **Programa armado:** el texto completo que se compila y corre. No sale nunca por la API.

Cómo se clasifica un resultado, en este orden (FR-021 y FR-022). Los estados y los motivos son los del ADR 0005; el estado que acompaña a cada motivo es de esta spec y lo confirma el plan.

| Situación | Estado final | Motivo |
| --- | --- | --- |
| El ejecutor informa tiempo agotado | `timeout` | |
| El ejecutor informa memoria agotada | `runtime_error` si pasó al ejecutar, `compile_error` si pasó al compilar | `oom` |
| Compilación con código de salida distinto de 0 | `compile_error` | |
| Ejecución con código de salida distinto de 0 | `runtime_error` | `signal` (el código menos 128) o `pids_limit` (un 137 sin memoria ni tiempo agotados, con runsc) |
| Código 0, evidencia completa y todas las pruebas esperadas en `PASS` | `passed` | |
| Código 0, evidencia completa y alguna prueba en `FAIL` | `failed` | |
| Código 0 y un marcador o el centinela falta o se repite | `failed` | `evidence_invalid` |
| Código 0, evidencia incompleta y salida recortada | `failed` | `output_limit` |
| Fallo del sandbox, ejecutor inalcanzable más allá del plazo, trabajo fallido o ejecución vencida | `infra_error` | `executor_error`, `executor_busy`, `job_failed` o `expired` |
| Cancelada por el alumno o por la cuenta, y eso prevalece sobre lo que informe el sandbox | `canceled` | `account_disabled` cuando es por la cuenta |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el ejecutor real, en Rust y en Go, estos seis casos dan el estado y el motivo esperados: la solución de referencia de un ejercicio (`passed`), su código inicial (`failed`), un error de compilación (`compile_error`), un pánico (`runtime_error`), un bucle infinito (`timeout`) y un programa que imprime más de lo que admite la salida y termina (`failed` con `output_limit`). Son 12 de 12 casos. La auditoría de todos los ejercicios es de B3 y queda fuera.
- **SC-002**: Una batería de 8 programas tramposos o accidentales no llega nunca a `passed`: 0 de 8. Son marcadores con un nonce inventado; un marcador repetido; un marcador de una prueba que no existe sumado a los completos; el centinela ausente; el centinela con un conteo que no coincide; una salida con código 0 antes de las pruebas; una salida enorme recortada antes de los marcadores; y todos los marcadores `PASS` con un código de salida distinto de 0. Con el nonce correcto no hay defensa (evidencia autodeclarada, ADR 0005 §5), y ese caso no está en la batería.
- **SC-003**: Con los valores de Q1, contra el stack: la 2.ª ejecución simultánea de una cuenta y la 11.ª de un minuto reciben 429 `quota_exceeded` con `Retry-After`, y la que supera las 32 en espera recibe 503 `queue_full` con `Retry-After`. Hay 0 ejecuciones creadas y 0 cuotas gastadas por pedidos rechazados.
- **SC-004**: Veinte pedidos simultáneos con el mismo `clientRunId` dejan 1 ejecución, 1 trabajo y 1 pedido al ejecutor. Dos pedidos simultáneos de una cuenta con claves distintas dejan 1 aceptado y 1 rechazado. Tras 100 admisiones simultáneas de cuentas distintas hay 0 ejecuciones sin trabajo y 0 trabajos sin ejecución.
- **SC-005**: Matar el worker con una ejecución en curso deja 0 ejecuciones repetidas en el ejecutor, y la ejecución termina `infra_error` en 4 minutos o menos. Con el ejecutor ocupado, la ejecución corre una sola vez cuando hay lugar, o termina `infra_error` a los 10 minutos con `executor_busy` o con `expired`, según quién la cierre primero.
- **SC-006**: Después de cerrar ejecuciones en cada estado final hay exactamente un intento por ejecución (0 faltantes y 0 duplicados, también si el cierre se repite) y 0 intentos de ejecuciones en curso. El conteo de intentos de cada fila de progreso es el de los intentos que cuentan de su época.
- **SC-007**: Una ejecución que se cierra con la época cambiada deja su intento y 0 cambios en el progreso y en la revisión del usuario.
- **SC-008**: Hay 0 respuestas con el programa armado. La matriz de acceso ajeno (consultar y cancelar) da 404 en el 100 % de los casos, y la de cuenta esperada da 409 en cada ruta que muta. Hay 0 líneas de log con código, salida o programa, comprobado sobre el log de una corrida completa de SC-001.
- **SC-009**: Los casos del fixture compartido (al menos 8: Rust y Go, con y sin prueba propia, con y sin `imports` en Go) dan el texto esperado línea por línea: 0 diferencias salvo el nonce, que tiene el mismo largo. Las 17 porciones conservan su sha256 y su validador, y la plantilla responde 304 a su validador.
- **SC-010**: El generador acepta claves no consecutivas y rechaza las repetidas, las de forma inválida y `custom`. El importador rechaza dar a una prueba nueva la clave de una retirada y no escribe nada. Las 822 pruebas actuales conservan sus claves y los 274 ejercicios su `content_hash`: 0 cambios. De los 274 `grading_hash`, cambian exactamente los 49 de los ejercicios de Go con `imports` y los otros 225 quedan iguales.
- **SC-011**: `progress_heads` y `exercise_progress` tienen todas las columnas del ADR 0006 §5.3, y D1 no necesita alterarlas (lista cotejada contra el ADR). La prueba de esquema encuentra todas las columnas `user_id` de B2 con FK en cascada hacia `users`, y un `DELETE FROM users` con todas las tablas pobladas no falla ni deja filas.
- **SC-012** (una medición, no un criterio de aprobación): con el stack real, en reposo y con un aula simulada de 30 cuentas que ejecutan a la vez, se informan la mediana y el p95 del tiempo hasta el estado final, la espera del último y la cantidad de 503. El ADR 0005 espera una mediana de 1,5 a 3 s en reposo y, con la estimación de 2,5 s por ejecución (ADR 0006 S2), el último de un aula de 30 espera unos 20 s: eso es lo que se contrasta. Todavía no hay un objetivo que cumplir.
- **SC-013**: Pasan `npm run api:test`, `npm run api:format:check`, `npm run api:analyse` (nivel 9, sin baseline), `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run test:executor` (si se toca el ejecutor), `npm run api:content:check` ampliado a la plantilla y el check de punta a punta de FR-048.

## Riesgos

1. **Evidencia autodeclarada, el principal.** El código del alumno corre en el mismo proceso que el harness y puede imprimir marcadores válidos si lee el nonce de su binario. Con un usuario era aceptable, y con muchos contamina lo que ve el admin. *Mitigación:* el nonce y el centinela frenan los errores y las copias, `server_solved_at` separa lo ejecutado en el servidor de lo importado, y B2 lo llama «ejecutado en el servidor», nunca «verificado» (ADR 0006 §12).
2. **Capacidad.** Con 4 slots y la estimación de 2,5 s por ejecución, un aula de 30 espera unos 20 s y dos aulas simultáneas superan la cola. *Mitigación:* cuotas, 503 con `Retry-After`, valores configurables (FR-009) y el camino de 6 slots y un segundo ejecutor (ADR 0006 §9). Las cifras son estimaciones y SC-012 las mide.
3. **Costo de esperar.** Cada consulta del cliente es un pedido PHP que además escribe la fila de `sessions`, y el ADR 0006 §12 ya lo cuenta como contención de MySQL. *Mitigación:* lectura por clave, sin el `throttle` de Laravel y con el `limit_req` de Nginx por IP (FR-025). El disparador hacia SSE o Reverb es que el polling supere el 30 % de los pedidos.
4. **La cancelación no interrumpe el sandbox.** Un alumno con un bucle infinito que cancela espera hasta que el sandbox termine (hasta unos 30 s con los plazos de B1: una compilación de Rust de 20 s y una ejecución de 10 s) antes de poder volver a ejecutar, por la cuota de «1 activa». *Mitigación:* se acepta, y se reabre si molesta: interrumpir el pedido al ejecutor es posible, pero complica al worker.
5. **El ejecutor es el componente más sensible.** Tiene el socket de Docker, que equivale a root en el host. *Mitigación:* sólo en la red interna con el worker, sin puertos publicados, con un token de al menos 32 bytes y el único con el socket (FR-045). gVisor es la defensa del sandbox, y con runc el riesgo queda registrado (ADR 0005).
6. **Datos personales en el código.** El código y las salidas de un alumno pueden contenerlos (Ley 25.326). *Mitigación:* retención acotada (FR-044), supresión física con la cuenta, exportación del titular y logs sin código (FR-042 y FR-043). La pregunta 14 (aviso de privacidad, responsable e inscripción) sigue abierta y no es de B2.
7. **Tablas que D1 no puede alterar.** B2 crea `progress_heads` y `exercise_progress` completas, y agregarles después una columna con restricciones obliga a copiar una tabla con datos (ADR 0006 D07 y D28). Como B2 va antes que D1 y D1 no tiene spec, una columna que D1 necesite y no esté acá sale cara. *Mitigación:* contrastar las columnas con el borrador de D1 antes de cerrar el plan de B2 (ver «Relación con otras specs»).
8. **C3 sin spec.** B2 apoya en C3 la identidad, el estado de la cuenta, la cuenta esperada, el `scheduler` y `UserData`. *Mitigación:* la tabla de supuestos de «Relación con otras specs» dice qué se rompe con cada uno si C3 lo resuelve distinto, para que la spec de C3 lo cubra.
9. **El ADR 0006 sigue en propuesta.** El intento liviano, la época y la serialización por usuario dependen de él, y las cuotas, la falta de fase en vivo y la retención ya las confirmó el usuario (Q1, Q2 y Q5). *Mitigación:* la aprobación del ADR condiciona la implementación y no la planificación, y si el usuario lo enmienda, esta spec y su plan cambian en lo que dependa de la enmienda.
10. **Un worker caído deja a un alumno sin ejecutar.** La ejecución queda `running` hasta que el trabajo o el barrido la cierran. *Mitigación:* FR-018 la acota a unos 4 minutos y la libera sola.
11. **Los límites de gVisor.** El `--pids-limit` cuenta los hilos del sandbox y no los procesos del programa: con runsc, un 137 sin memoria ni tiempo agotados es ese límite, y no un fallo del alumno ni del sandbox. *Mitigación:* la tabla de clasificación lo distingue (`pids_limit`), y B3 confirma que ninguna solución del currículo lo excede (ADR 0005, enmienda de B1).
12. **Un cliente que todavía no existe.** Hasta A4 nadie usa la API, y puede pudrirse. *Mitigación:* el check de punta a punta de FR-048 y las pruebas de FR-047 la ejercitan en cada cambio.

## Relación con otras specs

### C3 (todavía sin spec): lo que B2 supone

C3 va antes que B2 pero todavía no se especificó. Estos supuestos son dependencias explícitas: si C3 los resuelve distinto, esta spec o la de C3 se ajustan.

| B2 supone de C3 | Si C3 no lo entrega así |
| --- | --- |
| Una sesión de Laravel en el grupo `api` que deja el id del usuario en `Auth::id()`, y 401 `unauthenticated` sin sesión | B2 no sabe de quién es una ejecución: no puede empezar |
| `users.status` con `active`, `disabled` y `deleting`, y un middleware que responde 403 `account_disabled` en toda ruta con sesión | B2 no puede negar a las cuentas deshabilitadas (FR-019) sin esa columna |
| El `verified` propio, que responde 403 `email_unverified` | Con el registro abierto apagado no hay cuentas sin verificar. Al abrirlo, ejecutarían con las cuotas completas, porque B2 no implementa las reducidas del ADR 0006 §4.4 |
| Los roles `admin` y `student`, sin distinción para ejecutar: mismas cuotas para todas las cuentas y ningún rol ve el código de otra cuenta por B2 | Si C3 quisiera cuotas por rol, B2 las suma como configuración nueva |
| La cuenta esperada (`X-Taller-User` y 409 `account_mismatch`) y la protección CSRF (419) en todo pedido que muta | Sin ellas, un reintento después de iniciar otra sesión ejecutaría el código de una cuenta con la sesión de otra (ADR 0006 D36) |
| El cuerpo de error `{message, code}` con mensajes en español (`lang/es`) y `Retry-After` en 429 y 503 | B2 tendría que traducir y dar forma a sus errores por su cuenta |
| El límite de ritmo de Laravel sobre el store `database` y las zonas de `limit_req` de Nginx por IP, que son de C3: responden 429 (`limit_req_status`) y son holgadas para el NAT de un aula. B2 sólo suma la ubicación de `/api/runs` con su tope de cuerpo (FR-046) | Un `limit_req` con el 503 por omisión se confunde con `queue_full`, y uno ajustado a una sola IP corta a un aula entera |
| El servicio `scheduler`, donde B2 registra el barrido y las podas, y que procesa sólo la cola `default` | Sin él nadie cierra ejecuciones vencidas ni poda. Si procesara `runs`, volvería a ejecutar código con una reserva de 90 s |
| `UserData` (supresión y exportación) y su prueba de esquema, extensibles. Si C3 entrega `DELETE /api/me` antes que B2, B2 suma sus tablas | Sin ese módulo, B2 tendría que crear uno propio y C3 lo rehacería |
| Un punto de extensión (un evento o un registro) al deshabilitar, degradar o suprimir una cuenta, para cancelar sus ejecuciones activas | Sin él, B2 tiene que reabrir código de C3. FR-019 descarta igual lo que esperaba turno |

### C6 y C2

- **C2 (entregada, inmutable).** B2 no cambia su spec: cambia código. Toca el generador (`tools/content`: la regla de `test_key`, que hoy exigen `tools/content/exercises.ts` y `qa/content-check.ts`, la composición del `grading_hash`, que suma los `imports` de Go, y la plantilla nueva), el importador (el mensaje de `test_key`, la plantilla y el informe de cambios de corrección del primer import, que lista los 49 ejercicios de Go) y la entrega (un recurso más). Los requisitos de C2 siguen rigiendo, en especial los bytes exactos del generador y las huellas que sólo él calcula. El importador de C2 ya rechaza reutilizar la clave de una prueba retirada, y su mensaje nombra a B2.
- **La plantilla pasa de 17 a 18 recursos.** Eso toca `api:content:check`, las menciones de «17 porciones» en la hoja de ruta y el ADR, y el arranque de A3: hay que decidir si el cliente la pide al arrancar o sólo cuando abre el laboratorio (A4).
- **C6 (planificada, antes de B2).** B2 recibe el nivel 9 del análisis estático: todo su código lo pasa sin baseline, y las respuestas del ejecutor y de la base entran tipadas. Puede adoptar el patrón de registros tipados para sus tablas y para la plantilla si le sirve, como C6 lo deja abierto. C6 deja fuera el generador, así que la regla de `test_key` y la composición del `grading_hash` son de B2. El oráculo de filas de C6 se retira al desplegarla, y por eso no frena a B2.
- **B1 (entregado).** El contrato del ejecutor ([`backend/executor/AGENTS.md`](../../backend/executor/AGENTS.md) y [`internal/api/server.go`](../../backend/executor/internal/api/server.go)) es `POST /v1/run {language, program}` con token Bearer. Acepta programas de hasta 128 KiB, tiene 4 slots por omisión (de 1 a 8) y espera un lugar hasta 30 s. Responde 503 con `Retry-After` si está ocupado, 500 ante un fallo del sandbox y 400 o 413 ante un pedido inválido. B2 lo consume sin cambiarlo.

### Lo que B2 deja a quienes vienen después

- **A4:** `/api/runs`, el recurso de la plantilla y el fixture compartido. El servidor es quien lee los marcadores, así que el cliente deja de interpretarlos para las ejecuciones del servidor, y `hasPassingEvidence` e `interpretRun` quedan para el progreso v1.
- **D1:** las dos tablas completas, la definición única de «cuenta como intento» y el cierre que sube la revisión. D1 repite con el reset real el escenario de la época que B2 prueba a mano, y contrasta las columnas de `exercise_progress` y `progress_heads` antes de que B2 cierre su plan.
- **C5:** los datos de `runs` y `attempts` y la separación entre lo ejecutado en el servidor y lo importado. Sus endpoints son de C5.
- **B3:** la composición y la lectura de la evidencia reutilizables (FR-038).
- **C4:** los usuarios de MySQL con mínimo privilegio para `worker-runs`; hasta entonces usa el de la aplicación.

## Acciones del usuario

Los agentes no las hacen. Ninguna se ejecuta ahora; las de implementación llegan con el plan, que pide cada descarga con nombre, origen y tamaño.

| Cuándo | Acción |
| --- | --- |
| Antes de implementar | Aprobar o enmendar el ADR 0006. B2 usa D26 a D29, D38 y §7 como base. Al aprobarlo, registrar en el ADR 0005 las enmiendas que ya decidieron Q1 y Q2 (§3 y §6) |
| B2, implementación | Permiso para construir o bajar, si el daemon no las tiene, las imágenes del sandbox: `rust:1.99-slim` (unos 330 MB comprimidos) y `golang:1.27-alpine` (unos 75 MB, según el ADR 0005). Y para la etapa `runtime` del ejecutor, que ningún script de B1 construye: `docker-cli` por `apk` sobre `alpine:3.24` |
| B2, implementación | Permiso para reconstruir la imagen de la API con PCNTL (ADR 0006 §10), que compila la extensión y probablemente baja de Alpine los paquetes de compilación. El plan mide el tamaño antes de pedirlo |
| B2, despliegue | Correr `sh backend/api/scripts/init-env.sh` para sumar `EXECUTOR_TOKEN` al `.env`, y declarar el GID del socket de Docker que lee el `group_add` del ejecutor (un comando portable entre Linux y macOS) |
| B2, despliegue | Tener gVisor (`runsc`) registrado en Docker, como ya se hizo para B1, o aceptar runc sólo para desarrollo |

## Assumptions

- **ADR 0006 en propuesta.** Las decisiones de la tabla «Base del ADR 0006» son la base de esta spec hasta que el usuario lo apruebe.
- **B1, C2 y C6 entregados antes de B2** (olas 2 y 3 de la hoja de ruta): el código parte de `master` con ellos. **C3 también, y sin spec todavía:** ver la tabla de supuestos.
- **Hasta A4 no hay cliente.** Las pruebas usan un cliente de prueba y el ejecutor real. A4 y D1 corren en la misma ola, así que B2 se entrega sin que ninguno de los dos exista.
- **Carga.** Hasta unas 5.000 cuentas, con unas 1.000 activas en el pico, y 2,5 s por ejecución: es la estimación del ADR 0006 S2, sin medir con runsc en carga.
- **Límites del texto.** El código admite 64 KiB en bytes (ADR 0005). La prueba propia admite 3.000 caracteres, el límite que hoy tiene el laboratorio en `frontend/lab.js`, que el ADR no fija. Con el código, las pruebas y la plantilla, el programa armado cabe holgado en los 128 KiB del ejecutor. El plan lo confirma.
- **Idempotencia.** El ADR 0005 dice «mismo código»; se extiende al ejercicio y a la prueba propia porque la ejecución guarda los tres.
- **Estado y motivo.** El ADR fija los estados y los motivos, pero no cómo se combinan. La tabla de «Key Entities» es de esta spec y el plan la confirma, por ejemplo con memoria agotada al compilar.
- **Qué gasta cuota.** El ADR 0006 D27 da los números pero no qué cuenta contra ellos. Se supone que gasta cuota toda ejecución aceptada salvo las que terminan `infra_error`, y que lo rechazado no gasta (FR-010). La aceptó el usuario con Q1.
- **Vencimientos.** Los 10 minutos en cola vienen del ADR 0006 §12 («reencolado por 10 min») y los 140 s corriendo, de la reserva `retry_after` de D27. Que el barrido venza con esos plazos, y la cota de unos 4 minutos que resulta para un worker caído, los deriva esta spec; el plan los confirma.
- **Cuotas por rol.** Las mismas para todas las cuentas, el admin incluido: todo admin tiene progreso propio (ADR 0006 S5).
- **Cuentas sin verificar.** El registro abierto está apagado. Las cuotas reducidas hasta verificar (ADR 0006 §4.4) entran cuando se lo active, no en B2.
- **Caché.** Las respuestas de las ejecuciones salen `private, no-store`, como las de progreso (ADR 0006 D25). El plan lo confirma.
- **Envoltura de la respuesta.** El ADR 0006 §7 muestra `{id, status}` y el §8 pide la envoltura `data` para lo que no es contenido. El plan lo fija y A4 lo sigue.
- **Restricciones de esquema.** Los CHECK que tocan fechas no van en las tablas que crecen (resultado de C2 sobre D07), así que `runs`, `attempts` y `exercise_progress` los llevan en el escritor y en su prueba. Cada tabla es un `CREATE TABLE` y se migra sólo hacia adelante: un `down()` destruiría evidencia (ADR 0006 §10).
- **Imágenes nuevas (pregunta 19).** B2 no necesita Redis: `runs` queda en MySQL porque se encola dentro de la transacción de admisión (ADR 0006 §9). La pregunta 19 no lo bloquea.
- **Un host, un ejecutor.** El camino de escala del ADR 0006 §9 no es de B2.
- **Pruebas de concurrencia.** Necesitan conexiones paralelas, y una prueba de Pest corre en un solo proceso: el plan elige cómo.
- **Idioma.** Los mensajes para quien usa u opera el taller, en español, con `lang/es` de C3; el código y las pruebas, en inglés (constitución, principios III y VI).
- **Sin dependencias nuevas.** B2 usa el cliente HTTP y la cola de Laravel, y no agrega paquetes de Composer (FR-049).

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q5 van al final de la tabla.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dónde se encolan las ejecuciones | La cola `default` con más workers; una cola `runs` propia en MySQL; Redis | Cola propia en MySQL (ADR 0006 D27). La `default` vuelve a entregar a los 90 s un trabajo que sigue corriendo y volvería a ejecutar código. Redis es una imagen nueva y no permite encolar dentro de la transacción de admisión (§9) |
| Cuándo se encola | Después del COMMIT; dentro de la admisión | Dentro. Una caída entre el COMMIT y el encolado dejaría una ejecución sin trabajo, que el barrido cerraría como un fallo que no ocurrió |
| Qué guarda el intento | Todo, código y salidas incluidos; liviano más un payload aparte | Liviano más payload (ADR 0006 D38). El intento es permanente y crece con cada ejecución, y el código se poda sin escribir en él |
| Quién decide si pasó | El navegador, como hoy; el servidor con marcadores | El servidor (ADR 0005 §4 y §5), con evidencia autodeclarada y no inviolable |
| Cancelar una ejecución que corre | Interrumpir el sandbox; dejarlo terminar | Dejarlo terminar. El ejecutor no tiene cancelación y el worker espera una respuesta; cuesta hasta unos 30 s antes de poder volver a ejecutar (Riesgos, 4) |
| La plantilla del harness | Duplicada en PHP y en TypeScript; contenido compartido con un fixture | Contenido compartido (ADR 0005 §4; ADR 0006 S3): un solo texto y un fixture que prueba que los dos renderizadores coinciden |
| Qué protege la idempotencia | Sólo el código; el ejercicio, el código y la prueba propia, por cuenta y `clientRunId` | Lo segundo: la clave es de la cuenta y protege las tres partes del envío |
| Las claves de prueba | Seguir con `t{índice+1}`; claves libres, únicas e inmutables | Claves libres (ADR 0006 D14). Con `t{índice+1}`, quitar una prueba renumeraría las siguientes y la historia mezclaría pruebas distintas bajo una misma clave |
| Cuotas iniciales (Q1) | Las del ADR; las del ADR con 2 activas por cuenta; las del ADR por cuenta y 6 slots con 64 en cola | Las del ADR (usuario). Son lo más conservador y dejan medir con SC-012 antes de gastar CPU o equidad por una carga que todavía no se conoce; el aula real (pregunta 15 del ADR) decide si hace falta más |
| Fase del run (Q2) | `running` sin subfase; extender el ejecutor para que informe la fase | Sin subfase (usuario). Una etiqueta vale poco en una espera de segundos, el ejecutor entregado no cambia y sumarla después es aditivo |
| Qué entra en el `grading_hash` (Q3) | Nada nuevo; los `imports` de Go; los `imports` y la huella de la plantilla | Los `imports` de Go (usuario). Son contenido de un ejercicio y cambian lo que compila; la plantilla cambia poco y la valida B3, y es el último momento barato para decidirlo |
| Endpoints de historial de intentos (Q4) | Dentro de B2; fuera | Fuera (usuario). No tienen consumidor y la hoja de ruta no los pide; el modelo de datos queda completo igual |
| Retención (Q5) | 14 días y 90 días con excepciones; 7 y 30 días; sin poda de payloads | 14 y 90 con excepciones (usuario). Es lo que el ADR dimensionó y cubre lo que un alumno o un docente querrían revisar, sin retener código ajeno para siempre |
