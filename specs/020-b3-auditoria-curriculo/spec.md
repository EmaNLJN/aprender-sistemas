# Feature Specification: B3 · Auditoría local del currículo

**Feature Branch**: `020-b3-auditoria-curriculo` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Borrador con preguntas abiertas (Q1 a Q5); falta el clarify

**Input**: Ítem **B3** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Auditoría local del currículo»: probar en el ejecutor local que todas las soluciones de referencia aprueban y todos los códigos iniciales fallan. Depende de B2, entregado ([spec 005](../005-b2-api-ejecuciones/spec.md), PR #31). Fuente técnica: el [ADR 0005](../../docs/adr/0005-ejecucion-en-sandbox-propio.md) (aceptada, enmendada el 2026-10-04), en su §6, su §8, sus «Fases» y la enmienda del plan B1. B3 no toma decisiones nuevas del [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (**propuesta**): usa lo que B2 ya implementó sobre él. Pedido del coordinador del 2026-10-28 (ver «Lo que pidió el usuario»).

## Intención y alcance

**Lo que entendemos.** Desde B2, el servidor arma el programa de cada ejecución con la plantilla de `content/harness/`, lo corre en el sandbox propio (gVisor) y decide el resultado leyendo la evidencia. Pero nadie comprobó todavía, en ese sandbox, que el currículo entero funciona ahí: B2 probó 12 casos con el ejecutor real y la plantilla de Rust con el `rustc` del host; la de Go no se compiló al planificar. Hoy la única auditoría masiva es `qa/runtime-check.ts`, que arma otro programa (el `buildProgram` del laboratorio viejo, sin nonce), agrupa ejercicios en un solo programa y los manda a los Playgrounds públicos, donde no se puede auditar en masa. B3 es la auditoría que pide el §8 del ADR 0005 como criterio de aceptación del sandbox: un comando que corre, en una instancia propia del ejecutor, la solución de referencia y el código inicial de cada ejercicio con el mismo programa y la misma clasificación que reciben los alumnos, y entrega un informe que dice qué falló, por qué y con cuánto margen sobre los límites. No escribe ejecuciones ni intentos, no gasta cuotas y no le quita lugar a nadie. Es para quien mantiene el currículo, para quien opera el taller y para los ítems que exponen el sandbox a los alumnos (A4 y C4). Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Un comando corre los 548 programas del currículo (la solución y el código inicial de los 274 ejercicios) en el sandbox propio con runsc y termina en verde: las 274 soluciones aprueban y los 274 códigos iniciales fallan como corresponde.
2. Cuando algo no cumple, el informe dice qué ejercicio, qué código, qué estado, qué motivo y qué pruebas, en castellano para leer y en JSON para la CI o el coordinador.
3. Cada programa auditado es el que corre un alumno: lo arma y lo clasifica el mismo código de B2.
4. La corrida no deja rastro en las tablas de ejecución ni de progreso y no ocupa los lugares del ejecutor del servicio.
5. El informe muestra el tiempo de cada programa contra los límites del ADR y avisa cuando el margen es poco.
6. El caché precalentado de Go cubre todos los paquetes que importan los ejercicios, y `npm test` lo comprueba.
7. Una regresión del contenido, de la plantilla o de las imágenes del sandbox se ve antes del merge (Q3).

**Entra:**

- El comando de la auditoría, su instancia propia del ejecutor y la red que lo une sólo con ella.
- Las reglas de qué es «aprobar» y qué es «fallar», sobre la clasificación de B2 reutilizada.
- El informe legible y el JSON, con los sellos que permiten saber contra qué contenido, plantilla, imágenes y runtime corrió.
- El check estático que compara el caché precalentado de Go con los `imports` del currículo.
- La compuerta de la auditoría para los cambios que tocan lo que compila (Q3) y su documentación.
- Corregir, como bugs de contenido, los hallazgos de la primera corrida completa.

**Queda fuera:**

- **A4:** el laboratorio sobre `/api/runs`, la vista previa y el retiro de `runtime-check` (FR-034 de la spec 017): B3 no lo borra.
- **B2:** `/api/runs`, sus cuotas, su cola y su check de punta a punta (`api:runs:check`) quedan como están. B3 reutiliza el armado, la lectura de la evidencia y la clasificación sin cambiarlos.
- **B1:** el ejecutor, sus perfiles y sus límites, salvo que Q4 elija otra cosa.
- La fuerza de las pruebas más allá de que el código inicial falle: B3 no hace pruebas de mutación ni prueba soluciones incorrectas inventadas.
- Los kits ZIP y su `cargo test` o `go test` (`qa/project-kit-check.ts --docker`), que prueban otra cosa.
- La auditoría completa en la CI (Q2).

**Sin hacer a propósito (YAGNI):** una auditoría incremental que saltee los programas ya verificados (una corrida completa tarda minutos, y la incremental es la que obliga a guardar registros); un historial de corridas; un informe HTML o un panel; avisos por correo; reintentar sola una respuesta del ejecutor que pudo haber corrido; perfiles de límites propios de la auditoría; más de una instancia de auditoría a la vez.

**Actores:** quien mantiene el currículo (corre la auditoría, lee el informe y corrige `content/`), quien opera el taller (levanta la instancia propia y elige el horario), el coordinador (revisa la compuerta en cada PR), B2 (dueño del armado y la clasificación) y A4 y C4, que exponen el sandbox a los alumnos y esperan el verde.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta (Q1 a Q5).

| Pedido | Fuente |
| --- | --- |
| Criterio de aceptación del sandbox: en el ejecutor local, todas las soluciones de referencia aprueban y todos los códigos iniciales fallan | ADR 0005 §8; hoja de ruta, «Criterios de aceptación globales» |
| La auditoría completa pasa a ser local, así que deja de aplicar la restricción de no mandar el currículo en masa a los Playgrounds públicos | ADR 0005 §8 |
| B3 confirma que ninguna solución del currículo excede el `--pids-limit`, que con runsc cuenta los hilos del sandbox y no los procesos del programa | ADR 0005, enmienda del plan B1 |
| B3 suma un check que compara la lista de `backend/executor/images/go/warm/main.go` con los `imports` de las soluciones Go del currículo | ADR 0005, enmienda del plan B1 |
| Revisar los usos de `time.Sleep` en el contenido, porque el tiempo pasa a ser real | ADR 0005 §8 |
| La auditoría corre fuera de hora o con su propia instancia del ejecutor, sin escribir `runs` ni `attempts` | Hoja de ruta, «Alcance por ítem», B3 |
| B3 depende sólo de B2 | Hoja de ruta, «Orden y paralelismo» |
| La plantilla del harness no entra en el `grading_hash`: no se integra un cambio de plantilla sin la auditoría de B3 en verde | [spec 005](../005-b2-api-ejecuciones/spec.md), Clarifications, Q3 (decidió el usuario) |
| La composición del programa y la lectura de la evidencia se pueden usar sin escribir `runs` ni `attempts`, porque B3 las reutiliza | spec 005, FR-038 |
| El contenido se corrige en `content/`, nunca en `build/`; los IDs no cambian | `README.md`, «Contenido del currículo»; constitución, principio IV |
| Un bug va a `.specify/bugs/<slug>/` con la extensión `bug`, sin tocar el `tasks.md` de la feature | Constitución, principio VIII |
| Cada descarga se pide con nombre, origen y tamaño | Hoja de ruta, «Acciones del usuario»; constitución, principio VII |
| Esta spec deja claro qué se audita, qué es aprobar y fallar, cómo corre, el informe, dónde se integra, qué pasa cuando falla un ejercicio y la relación con A4, `runtime-check` y C4, con como mucho cinco preguntas | Pedido de esta tarea |

**Lo que todavía no está decidido y toca a B3.** La spec 017 (A4, PR #50) recomienda en su Q5 que A4 no se entregue sin B3 en verde, pero el usuario no la respondió. B3 no depende de esa respuesta: se especifica igual. Ver «Relación con otras specs».

## Línea de base medida en el host

Medido el 2026-10-28 al especificar, sin Docker, sin `npm` y sin descargas: una copia de esta rama (`git archive`) en un directorio temporal, el generador de `tools/content` para producir `curriculum.json` y `harness.json`, un renderizador de la gramática de B2 escrito aparte en JavaScript, `rustc` 1.97.1 y `go` 1.27.2 del host (con `GOTOOLCHAIN=local` y `GOPROXY=off`), plazos de 20, 15 y 10 s, y la clasificación de la tabla de B2 sin la fila de `pids_limit`. **No es la auditoría de B3:** las imágenes del sandbox traen Rust 1.99 y Go 1.27, corren con gVisor y con límites de memoria y de procesos, y el programa lo arma PHP. Sirve para saber qué esperar y para concretar Q1 y Q4.

| Medición | Rust | Go |
| --- | --- | --- |
| Soluciones de referencia | 137 de 137 `passed` | 137 de 137 `passed` |
| Códigos iniciales | 125 `failed` por las pruebas, 11 `compile_error` y 1 `runtime_error` (`signal`) | 137 de 137 `failed` por las pruebas, con la evidencia completa |
| Ejercicios `reparar` | 17 (10 no compilan, con el error que enseña el ejercicio) | 58 (todos compilan y fallan por las pruebas) |
| Compilación (mediana y máxima) | 87 ms y 327 ms | 186 ms y 8,0 s (`go-69`, que importa `net/http` y `net/http/httptest`, con el caché del host frío) |
| Ejecución más larga de una solución | 15 ms | 21 ms |
| Memoria pico de una ejecución | 2,5 MiB | 3,8 MiB (límite: 256 MiB) |

- **Los 12 códigos iniciales de Rust que no fallan por las pruebas.** Diez son ejercicios `reparar` cuyo error de compilación es la consigna: `rust-02` (E0384), `rust-03`, `rust-04` y `rust-36` (E0308), `rust-11` (E0382), `rust-15` (E0502), `rust-17` (E0277), `rust-23` (E0004), `rust-44` (E0106) y `rust-62` (E0425). Los otros dos son ejercicios `completar`: `rust-63` no compila porque la macro del inicial expande a `todo!()`, de tipo `!`, que no se puede comparar con un `i32` (E0277); y `rust-71` aborta el programa entero (SIGABRT) porque un `todo!()` dentro de `Drop` entra en pánico mientras otro pánico se desenrolla, así que el alumno no ve ninguna prueba. Coincide con lo que midió B2 (125, 11 y 1).
- **El caché de Go.** Los 49 ejercicios de Go con `imports` usan 26 paquetes, y los 26 están en `warm/main.go`, que además trae `fmt`: 0 diferencias.
- **`time.Sleep`.** Ningún código del currículo lo usa hoy. El ADR contaba uno; la única mención que queda es un texto de transferencia de `go-94`.
- **Concurrencia,** por búsqueda de texto: lanzan hilos `rust-46`, `rust-47`, `rust-48` y `rust-70`, y goroutines `go-41`, `go-42`, `go-45`, `go-63`, `go-64` y `go-65`. Son los candidatos a rozar el `--pids-limit` con runsc, que el host no mide.

## Preguntas abiertas

Cada una tiene sus opciones, la recomendada con su motivo y su costo. Los requisitos que dependen de una pregunta llevan «(Q*n*)» y usan la opción recomendada como borrador.

**Q1. ¿Qué cuenta como «fallar» para un código inicial?** *(FR-006, FR-007 y FR-031)* El criterio pide que todos los iniciales fallen, y el pedido de esta tarea, que fallen por las pruebas y no por compilación, salvo que el contrato diga otra cosa. En el host, 12 iniciales de Rust no fallan por las pruebas (ver «Línea de base»): diez son `reparar` y enseñan justamente a leer ese error del compilador; `rust-63` y `rust-71` son `completar`, y el alumno ve un error que no tiene que ver con la consigna.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Falla por las pruebas, con una sola excepción que ya está en el contenido: un inicial de un ejercicio `reparar` también puede fallar al compilar | `rust-63` y `rust-71` son los dos primeros hallazgos y se corrigen en `content/`. Un inicial `reparar` que deje de compilar sin querer no se detecta, pero sigue siendo un programa roto para reparar |
| B | Falla sólo por las pruebas, sin excepciones | 12 hallazgos: los diez `reparar` pierden el error que enseñan o hay que reescribirlos |
| C | Cualquier estado distinto de `passed` cuenta como fallar, como dice el ADR al pie de la letra | 0 hallazgos. `rust-63` y `rust-71` quedan como están, y un inicial `completar` que deje de compilar sin querer pasa la auditoría |
| D | Una lista de excepciones ejercicio por ejercicio, con su motivo, en un contrato de `qa/fixtures/` | Lo más preciso. Es otro archivo que se mantiene a mano, como `curriculum-ids.json`, y cada caso nuevo pasa por revisión |

**Recomendada: A.** El campo `kind` ya existe, se publica y dice exactamente eso: un ejercicio `reparar` entrega un programa roto, y no compilar es una forma de estar roto. No agrega un contrato nuevo. **Costo:** corregir `rust-63` y `rust-71` antes de entregar B3 (cambian su `starter_hash`, no su `grading_hash`).

**Q2. ¿Dónde corre la auditoría?** *(FR-009, FR-014 y FR-027)* El job `api` de la CI no tiene gVisor ni las imágenes del sandbox, y el job `executor` sólo corre las pruebas unitarias. El `--pids-limit` que el ADR pide confirmar sólo existe con runsc.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | En local, en el host del taller, con runsc y la instancia propia. En la CI corre sólo el check estático del caché de Go, dentro de `npm test` (job `front`) | Sin descargas si las imágenes de B2 siguen en el daemon (el plan lo verifica). La compuerta depende de la disciplina (Q3) y del host |
| B | También en la CI, con runc | En cada corrida se construyen las dos imágenes del sandbox (bajan `rust:1.99-slim`, unos 330 MB, y `golang:1.27-alpine`, unos 75 MB, de Docker Hub, según el ADR 0005), el ejecutor (`alpine:3.24` y `docker-cli` por `apk`) y la imagen de la API. Con runc no se confirma el `--pids-limit`: no vale como auditoría de registro |
| C | En la CI, con runsc | Lo de B más instalar gVisor en el runner (repositorio apt de gvisor.dev; el plan mide el tamaño) y unos minutos más por PR. Que runsc funcione en un runner hospedado no está probado: haría falta un spike |
| D | En local, y además una corrida semanal en la CI con runsc | Lo de C una vez por semana, que coincide con la reconstrucción semanal de las imágenes (ADR 0005) |

**Recomendada: A.** La auditoría de registro necesita runsc, que el host ya tiene desde B1, y la CI no; la parte estática va a la CI sin costo. **Costo:** el verde de B3 no lo controla una máquina, sino la revisión de cada PR (Q3).

**Q3. ¿La auditoría bloquea el merge, y cuándo es obligatoria?** *(FR-032)* Ya está decidido que un cambio de plantilla no se integra sin B3 en verde (spec 005, Q3). La pregunta es si la regla se extiende al resto de lo que compila.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Es obligatoria en todo PR que toque la superficie auditada: el código, las pruebas o los `imports` de un ejercicio, un ejercicio nuevo o retirado, la plantilla, las imágenes del sandbox o sus digests, los perfiles del ejecutor y las clases que arman el programa, leen la evidencia o clasifican. El PR lleva el resumen del informe con sus sellos y el coordinador comprueba que coinciden con su commit. También antes de entregar A4 y antes de la compuerta G2 de C4 | Una corrida local de unos minutos por cada PR de esos. La comprobación la hace una persona |
| B | Bloqueo automático en la CI | Exige Q2-B o Q2-C, con su costo en cada PR |
| C | Sólo a pedido y antes de A4 | Sin compuerta: una regresión aparece tarde, y la plantilla igual la necesita por la Q3 de B2 |

**Recomendada: A.** Extiende a todo lo que compila la regla que el usuario ya puso para la plantilla, y los sellos hacen que la comprobación sea mecánica aunque la haga una persona. **Costo:** disciplina en cada PR de contenido o del sandbox; los cambios de textos (títulos, pistas, explicaciones) no la necesitan.

**Q4. ¿Qué se hace con los límites, y cómo se mide la memoria?** *(FR-022 a FR-025)* El ejecutor devuelve `compileMs` y `runMs`, que incluyen el arranque del contenedor, y para la memoria sólo `oomKilled`: el pico no se observa. Además, B2 acepta del ejecutor exactamente nueve campos (`ExecutorResult::fromPayload`): un décimo campo vuelve inválido todo resultado (`infra_error`) hasta que B2 también cambie.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | El tiempo de cada fase contra su límite, con el margen; un aviso, que no falla, cuando un programa usa más de la mitad de un límite; la memoria como «se agotó o no»; los procesos por la clasificación (`pids_limit`). Exceder un límite es un hallazgo que se corrige en el contenido, y los límites no se mueven por el contenido | Sin cambios en B1 ni en B2. El margen de memoria queda sin medir |
| B | Lo de A más el pico de memoria: el ejecutor lo informa en un campo nuevo y B2 lo acepta en el mismo cambio | Dos componentes y una enmienda del ADR 0005 y de las invariantes de `backend/executor/AGENTS.md`. Con runsc, el pico del cgroup incluye al propio gVisor y no sólo al programa |
| C | Lo de A más una corrida de margen con límites más chicos (por ejemplo, la mitad del tiempo y de la memoria) | Mide el margen sin pedirle nada nuevo al ejecutor, pero los perfiles son código (`profile.go`): hace falta un perfil de auditoría distinto del de los alumnos, una enmienda del ADR y la prueba de `args_test.go` |

**Recomendada: A.** En el host, la memoria pico más alta fue de 3,8 MiB contra 256 MiB, y la compilación más lenta fue la de `net/http` con el caché frío, que el sandbox tiene precalentado. El riesgo de memoria es bajo y el de tiempo se mide. **Costo:** si un ejercicio futuro necesita mucha memoria, se reabre B. El umbral del aviso (la mitad) es una propuesta que el plan confirma con la medición de SC-005.

**Q5. ¿La auditoría verifica la prueba propia del alumno?** *(FR-034)* El contenido no trae pruebas propias de referencia; el laboratorio sugiere como ejemplo la expresión de la primera prueba. `api:runs:check` de B2 ya usa la prueba propia con el ejecutor real, para forzar un pánico, un bucle y una salida enorme. Pero B3 es la compuerta de la plantilla (spec 005, Q3), y el lugar de la prueba propia es parte de la plantilla.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Una muestra: por lenguaje, la solución de un ejercicio con una prueba propia que pasa y con otra que falla | 4 programas más por corrida. Comprueba que la prueba propia se informa aparte y no cambia el veredicto |
| B | No: la cubre el check de B2 | Un cambio de plantilla que rompa la prueba propia pasa la compuerta de B3, y sólo lo ve `api:runs:check` si alguien lo corre |
| C | Todos los ejercicios con su ejemplo como prueba propia | 274 programas más, o cambiar el programa que se audita si se combinan. Aporta poco: el ejemplo es una prueba que ya existe |

**Recomendada: A.** Cuesta cuatro programas y cierra el hueco que deja usar B3 como compuerta de la plantilla. **Costo:** fijar en el plan qué ejercicio y qué dos expresiones forman la muestra.

## Cómo se decide cada programa

Es la regla de FR-005 a FR-008, sobre el estado y el motivo que da la clasificación de B2 ([contrato](../005-b2-api-ejecuciones/contracts/harness-template.md), «La clasificación»). El veredicto de la auditoría es de esta spec.

| Programa | Lo que dice la clasificación de B2 | Veredicto de la auditoría |
| --- | --- | --- |
| Solución | `passed` | Aprueba |
| Solución | Cualquier otro estado final (`failed` con motivo o sin él, `compile_error`, `runtime_error`, `timeout`) | Hallazgo |
| Inicial | `failed` con la evidencia completa, al menos una prueba en `fail` y sin motivo | Falla como corresponde |
| Inicial de un ejercicio `reparar` | `compile_error` | Falla como corresponde (Q1) |
| Inicial | `passed` | Hallazgo: las pruebas no detectan el código inicial |
| Inicial | `failed` con motivo `evidence_invalid` u `output_limit` | Hallazgo: falló sin que las pruebas lo dijeran |
| Inicial | `compile_error` fuera de la excepción, `runtime_error` o `timeout` | Hallazgo |
| Cualquiera | El ejecutor no devolvió un resultado válido (lo que en B2 sería `infra_error`) | Sin veredicto |

Un programa que aprueba o falla como corresponde pero usa más de la mitad de un límite suma además un aviso, que no cambia su veredicto (Q4).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auditar el currículo entero en el sandbox propio (Priority: P1)

Quien mantiene el currículo levanta la instancia de auditoría y corre un comando. Al rato sabe si las 274 soluciones aprueban y los 274 códigos iniciales fallan como corresponde, con el mismo programa y la misma clasificación que reciben los alumnos.

**Why this priority**: es el criterio de aceptación del sandbox (ADR 0005 §8) y lo que A4 y C4 esperan antes de exponer el sandbox a los alumnos.

**Independent Test**: con el stack levantado, el contenido importado y runsc, correr el comando sobre todo el currículo y comparar el resumen con la regla de «Cómo se decide cada programa».

**Acceptance Scenarios**:

1. **Dado** el contenido importado y la instancia de auditoría arriba, **cuando** se corre la auditoría completa, **entonces** se ejecutan la solución y el inicial de cada ejercicio activo de los dos lenguajes (274 hoy, con los 24 de campaña y los 50 núcleos de Sistemas), cada uno en su propio programa.
2. **Dado** un ejercicio, **cuando** la auditoría arma su programa, **entonces** es el mismo texto que armaría B2 con ese código y el mismo nonce.
3. **Dadas** todas las soluciones en `passed` y todos los iniciales fallando como corresponde, **cuando** termina, **entonces** el comando sale con código 0 y el informe dice que la corrida es de registro.
4. **Dado** un solo hallazgo o un programa sin veredicto, **cuando** termina, **entonces** el comando sale con un código distinto de 0.

*Cubre: FR-001 a FR-009, FR-014, FR-015, FR-017 y FR-034; SC-001 y SC-007.*

---

### User Story 2 - Saber qué falló, corregirlo en `content/` y volver a correr (Priority: P1)

Cuando un ejercicio no cumple, el informe dice cuál, con qué código, qué estado y qué pruebas, y muestra el principio del diagnóstico. Quien mantiene el currículo registra el bug, corrige `content/`, vuelve a correr sólo ese ejercicio mientras itera y, al final, la corrida completa.

**Why this priority**: un informe que no se puede accionar no sirve, y el primer uso real ya trae hallazgos (al menos `rust-63` y `rust-71`, con Q1-A).

**Independent Test**: con un doble del ejecutor, inyectar cada caso de la tabla de «Cómo se decide cada programa» y leer las dos salidas.

**Acceptance Scenarios**:

1. **Dada** una solución que falla una prueba, **cuando** se informa, **entonces** la línea legible nombra el ejercicio, «solución», el estado, la clave y la etiqueta de la prueba que falló y las primeras líneas de la salida, y el JSON trae lo mismo en campos.
2. **Dado** un inicial que aprueba, **cuando** se informa, **entonces** el hallazgo dice que las pruebas no detectan el código inicial.
3. **Dado** un hallazgo corregido en `content/`, **cuando** se vuelve a correr sólo ese ejercicio, **entonces** el informe lo marca como corrida parcial, que no vale como verde de registro.
4. **Dado** un fallo del ejecutor (un 500 o una respuesta inválida), **cuando** se informa, **entonces** el programa queda sin veredicto, aparte de los hallazgos de contenido, y la corrida no da verde.

*Cubre: FR-007, FR-008, FR-015, FR-018, FR-019, FR-029 a FR-031; SC-002.*

---

### User Story 3 - Auditar sin tocar a los alumnos (Priority: P1)

La auditoría usa su propia instancia del ejecutor, con su propia red y su propia etiqueta. No escribe ejecuciones, intentos ni progreso, no pasa por la cola ni por las cuotas y no ocupa los lugares del servicio.

**Why this priority**: lo exige la hoja de ruta, y con un error de etiqueta el barrido inicial de la instancia de auditoría borraría los contenedores de los alumnos.

**Independent Test**: contar las filas de las tablas de B2 y de la cola antes y después de una corrida completa, y mirar qué contenedores tocó cada instancia.

**Acceptance Scenarios**:

1. **Dada** una corrida completa, **cuando** termina, **entonces** `runs`, `attempts`, `attempt_tests`, `attempt_payloads`, `progress_heads`, `exercise_progress` y la tabla de la cola tienen las mismas filas que antes.
2. **Dado** el ejecutor del servicio con una ejecución en curso, **cuando** arranca la instancia de auditoría, **entonces** su barrido no toca los contenedores del servicio y el ejecutor del servicio no recibe ningún pedido de la auditoría.
3. **Dado** el `worker-runs`, **cuando** corre la auditoría, **entonces** no alcanza a la instancia de auditoría, y la auditoría no alcanza al ejecutor del servicio.

*Cubre: FR-010 a FR-013; SC-003.*

---

### User Story 4 - Ver el margen contra los límites (Priority: P2)

El informe muestra cuánto tardó cada fase de cada programa contra su límite, si se agotó la memoria y si un programa se acercó demasiado a un límite.

**Why this priority**: el tiempo pasa a ser real (el Playground de Go lo simulaba), la compilación de Go depende del caché precalentado y el ADR pide confirmar el `--pids-limit`.

**Independent Test**: con un doble del ejecutor que devuelve tiempos cerca y lejos de cada límite, un `oomKilled` y un 137 con runsc, leer el informe; después, la medición de SC-005 con el ejecutor real.

**Acceptance Scenarios**:

1. **Dado** un programa que compila en más de la mitad de su límite, **cuando** se informa, **entonces** aparece como aviso y no como hallazgo (Q4).
2. **Dado** un programa que agota el tiempo, la memoria o los procesos, **cuando** se informa, **entonces** es un hallazgo con el estado y el motivo de B2 (`timeout`, `oom` o `pids_limit`).
3. **Dada** una corrida completa con runsc en verde, **cuando** se lee el informe, **entonces** confirma que ninguna solución excede el `--pids-limit`.

*Cubre: FR-016 y FR-022 a FR-026; SC-005.*

---

### User Story 5 - Una compuerta que se puede comprobar (Priority: P2)

Un PR que cambia lo que compila lleva el resumen de la auditoría. El coordinador, o una máquina, compara los sellos del JSON con el commit del PR y sabe si el informe es de ese contenido, esa plantilla y esas imágenes.

**Why this priority**: sin sellos, un informe viejo parece actual, y `qa/AGENTS.md` prohíbe presentar un registro viejo como comprobación del código actual.

**Independent Test**: cambiar una expresión de prueba, la plantilla o una imagen, y comprobar que los sellos del informe anterior dejan de coincidir; cambiar sólo un título y comprobar que siguen coincidiendo.

**Acceptance Scenarios**:

1. **Dado** un informe, **cuando** se cambia la expresión de una prueba, **entonces** la huella del programa de ese ejercicio deja de coincidir.
2. **Dado** un informe, **cuando** se cambia sólo un título o una pista, **entonces** ninguna huella de programa cambia.
3. **Dado** un PR que toca la superficie auditada, **cuando** se revisa, **entonces** su descripción trae el resumen de una corrida completa y de registro con los sellos de su commit (Q3).

*Cubre: FR-019 a FR-021 y FR-032; SC-004.*

---

### User Story 6 - El caché de Go sigue a los `imports` (Priority: P3)

Quien agrega a un ejercicio de Go un `import` que no está en el caché precalentado se entera en `npm test`, sin Docker, con el ejercicio y el paquete nombrados.

**Why this priority**: sin caché, `go build` compila ese paquete desde cero en cada envío (en el host, `net/http` tardó 8 s con el caché frío, y el límite del sandbox es 15 s). Hoy no hay diferencias, así que es prevención.

**Independent Test**: sacar un paquete de la lista o agregar un `import` nuevo a un ejercicio y correr el check.

**Acceptance Scenarios**:

1. **Dado** el contenido de hoy, **cuando** corre el check, **entonces** pasa: los 26 paquetes que importan los ejercicios están en la lista.
2. **Dado** un ejercicio con un `import` que no está en la lista, **cuando** corre el check, **entonces** falla con un mensaje en español que nombra el ejercicio y el paquete.
3. **Dado** un paquete de la lista que ningún ejercicio importa, **cuando** corre el check, **entonces** pasa.

*Cubre: FR-027, FR-028 y FR-036; SC-006.*

---

### Edge Cases

- **Un ejercicio retirado** no se audita: la auditoría lee los activos, igual que B2 (que rechaza ejecutar uno retirado). Uno nuevo entra solo, sin tocar una lista fija; lo mismo el catálogo de E1, cuando exista.
- **Sin contenido importado,** con el ejecutor de auditoría caído o con el token equivocado, la auditoría no arranca y lo dice en español. No espera indefinidamente.
- **El ejecutor de auditoría ocupado o reiniciándose** (503 o conexión rechazada): no corrió nada, así que se espera y se vuelve a pedir. Un 500, una conexión cortada o un cuerpo inválido pudieron haber corrido: el programa queda sin veredicto, sin reintento automático.
- **Con runc,** en un equipo de desarrollo sin gVisor, la auditoría corre igual, pero el informe dice que no es de registro: con runc un 137 es la señal 9 y el `--pids-limit` no se confirma.
- **Una corrida parcial** (un lenguaje o algunos ejercicios) sirve para iterar sobre una corrección y nunca vale como verde de registro.
- **Un inicial que aprueba** casi siempre señala pruebas débiles, no un código inicial demasiado bueno: el hallazgo lo dice así, y la corrección puede ser una prueba nueva (con una clave nueva: las claves no se reutilizan).
- **Un inicial que aborta antes de las pruebas,** como `rust-71`: el alumno no ve ninguna prueba, así que es un hallazgo aunque el estado no sea `passed`.
- **Una salida tan grande que se recorta antes de los marcadores:** con la solución es un hallazgo (`failed` con `output_limit`); con el inicial también, porque falló sin que las pruebas lo dijeran.
- **La instancia de auditoría y el servicio comparten CPU y el daemon de Docker.** Con alumnos ejecutando a la vez, los tiempos de la auditoría suben y pueden aparecer avisos que no son del contenido. El informe registra la hora y los lugares para interpretarlo.
- **Las imágenes del sandbox se reconstruyen cada semana** sobre el mismo digest, y el caché de Go se refresca. Cambiar el digest cambia el compilador: es superficie auditada (Q3).
- **Un ejercicio cuyo programa no cabe en los 128 KiB del ejecutor** recibiría un 413: es un fallo del armado, sin veredicto, y no puede pasar con el contenido de hoy (el programa mayor ronda los 83 KiB en el peor caso de B2, con 64 KiB de código del alumno; los de referencia son mucho menores).
- **`time.Sleep` y el tiempo real.** Hoy ningún código lo usa. Uno nuevo tarda lo que dice, no lo que simulaba el Playground de Go, y el informe lo muestra contra el límite de ejecución.
- **Dos corridas de auditoría a la vez** no se admiten: comparten la etiqueta de la instancia, y el barrido inicial de la segunda borraría los contenedores de la primera.

## Requirements *(mandatory)*

### Functional Requirements

**Qué se audita**

- **FR-001**: La auditoría DEBE cubrir todos los ejercicios activos de los dos lenguajes que lee B2 del contenido importado: 274 hoy (137 por lenguaje: 100 del recorrido, 12 de campaña y 25 núcleos de Sistemas en sus cuatro dominios). Sale de lo importado, no de una lista fija, y deja afuera los retirados. El informe dice cuántos auditó por lenguaje y por sección.
- **FR-002**: Por cada ejercicio DEBE ejecutar dos programas, uno con la solución de referencia y otro con el código inicial, cada uno por separado y sin prueba propia, salvo la muestra de FR-034. No agrupa ejercicios en un mismo programa.
- **FR-003**: El programa de cada ejecución DEBE ser el que arma B2 para ese ejercicio y ese código: la misma plantilla, las pruebas activas y los `imports` de una misma lectura consistente del contenido, y un nonce nuevo de 128 bits por programa. Lo arma el mismo código de B2 (spec 005, FR-038), no un segundo renderizador. B3 NO DEBE cambiar el comportamiento de `/api/runs` ni de las clases puras que arman el programa, leen la evidencia y clasifican.
- **FR-004**: El estado y el motivo de cada programa DEBEN salir de la misma lectura de la evidencia y de la misma clasificación que usa B2, en su orden fijo, con el runtime de la instancia de auditoría (la fila de `pids_limit` vale sólo con runsc).
- **FR-005**: Una solución de referencia aprueba si y sólo si la clasificación de B2 da `passed`.
- **FR-006**: Un código inicial falla como corresponde si la clasificación da `failed`, con la evidencia completa, al menos una prueba esperada en `fail` y sin motivo. Un inicial de un ejercicio `reparar` también falla como corresponde si da `compile_error` (Q1).
- **FR-007**: Todo lo demás DEBE ser un hallazgo: una solución que no llega a `passed` y un inicial que aprueba, que falla con motivo `evidence_invalid` u `output_limit`, que termina en `runtime_error` o `timeout`, o que no compila fuera de la excepción de FR-006.
- **FR-008**: Si el ejecutor responde ocupado (503) o rechaza la conexión, no corrió nada: la auditoría DEBE esperar lo que indica y volver a pedir. Cualquier otra respuesta que no sea un resultado válido (500, conexión cortada, cuerpo inválido, 400, 401 o 413) DEBE dejar ese programa sin veredicto, sin reintento automático. Un programa sin veredicto impide el verde y se informa aparte de los hallazgos, como un problema del sandbox.

**Cómo corre**

- **FR-009**: La auditoría DEBE ser un único comando del proyecto que corre dentro de la imagen de la API, para usar el armado y la clasificación de B2, con un alias de `npm` como entrada, igual que `api:runs:check`. El plan fija los nombres. Corre en local, en el host del taller (Q2).
- **FR-010**: DEBE correr contra su propia instancia del ejecutor: las mismas imágenes y los mismos perfiles (y por eso los mismos límites) que el servicio, con una etiqueta de instancia propia, distinta de la del servicio, y una red interna que comparte sólo con quien corre la auditoría. No usa la red `sandbox`, no alcanza al ejecutor del servicio ni la alcanza el `worker-runs`, y no ocupa los lugares del servicio. Se levanta a pedido y se apaga al terminar.
- **FR-011**: En el host de producción (desde C4), la documentación DEBE recomendar correrla fuera de hora: la instancia propia no comparte lugares, pero sí CPU y el daemon de Docker con el servicio.
- **FR-012**: La auditoría NO DEBE escribir en la base: ni `runs`, `attempts`, `attempt_tests`, `attempt_payloads`, `progress_heads` o `exercise_progress`, ni trabajos en ninguna cola, ni cuentas, sesiones o tablas de contenido. Lee el contenido sin escribir, no pasa por la cola `runs` ni por las cuotas y no necesita una cuenta.
- **FR-013**: DEBE negarse a arrancar, con un mensaje en español que dice qué falta, si no hay contenido importado, si no alcanza a su ejecutor, si su ejecutor rechaza el token o si ya hay otra corrida de auditoría en curso.
- **FR-014**: La auditoría de registro DEBE correr con runsc. Con runc corre igual, para desarrollo, y el informe dice que no es de registro.
- **FR-015**: DEBE admitir que se elija un lenguaje o una lista de ejercicios, para iterar sobre una corrección. Una corrida así se marca como parcial y nunca es de registro.
- **FR-016**: La cantidad de programas simultáneos de la instancia de auditoría DEBE ser configuración, dentro del rango del ejecutor (de 1 a 8), y el informe la registra.
- **FR-017**: El comando DEBE salir con código 0 si y sólo si los programas que corrió no dejaron hallazgos ni programas sin veredicto. Es de registro si además fue completa, con runsc y sin programas sin veredicto, y el informe lo dice en un campo propio.

**El informe**

- **FR-018**: La salida legible DEBE estar en español y traer una línea por hallazgo y por programa sin veredicto: el ejercicio, su lenguaje y su sección, si es la solución o el inicial, el estado y el motivo de B2, las pruebas que fallaron o faltaron con su clave y su etiqueta, y las primeras líneas del diagnóstico (del compilador o del programa), recortadas. Cierra con un resumen: cuántos programas, cuántos aprueban o fallan como corresponde, cuántos hallazgos, cuántos avisos, cuántos sin veredicto, el runtime y si es de registro.
- **FR-019**: DEBE escribir además un JSON con un formato versionado que trae, por cada programa: el ejercicio, el lenguaje, la sección, el `kind`, si es la solución o el inicial, el estado, el motivo, la fase alcanzada, el veredicto de cada prueba por clave, el de la prueba propia si la hubo, `compileMs`, `runMs`, los límites de su fase, el margen, si se recortó la salida, si se agotó la memoria, el veredicto de la auditoría (aprueba, falla como corresponde, hallazgo o sin veredicto) y si suma un aviso.
- **FR-020**: El JSON DEBE llevar los sellos que permiten saber contra qué corrió: el commit de origen del contenido, la huella del documento, la de la plantilla (`portions.harness`), por ejercicio su `grading_hash` y su `starter_hash`, por programa la huella del programa armado con un nonce fijo de ceros (como la vista previa), los identificadores de las dos imágenes del sandbox, el runtime, la etiqueta de la instancia, los programas simultáneos, la fecha y la duración.
- **FR-021**: El informe es salida generada: DEBE quedar fuera de Git y del contexto de Docker (`.gitignore` y `.dockerignore`), y no lleva el token ni secretos. Un informe cuyos sellos no coinciden con el contenido, la plantilla o las imágenes actuales no vale como comprobación (`qa/AGENTS.md`).

**Límites**

- **FR-022**: El tiempo de cada fase DEBE informarse contra su límite del ADR 0005 (compilar: Rust 20 s y Go 15 s; ejecutar: 10 s), con el margen, aclarando que incluye el arranque del contenedor. Un programa que usa más de la mitad de un límite es un aviso, que no falla (Q4).
- **FR-023**: La memoria DEBE informarse como «se agotó o no» contra su límite (1 GiB al compilar y 256 MiB al ejecutar): el contrato del ejecutor no da el pico (Q4).
- **FR-024**: Con runsc, un programa que excede el `--pids-limit` (un 137 sin memoria ni tiempo agotados, `pids_limit` en B2) DEBE ser un hallazgo. Una corrida completa de registro en verde es la confirmación que pide el ADR 0005 de que ninguna solución lo excede.
- **FR-025**: Un programa que agota un límite es un hallazgo que se corrige en el contenido. Los límites NO DEBEN cambiar para acomodar un ejercicio desde B3: cambiar uno es una enmienda del ADR 0005 con su prueba (`args_test.go`), fuera de este ítem (Q4).
- **FR-026**: El informe DEBE registrar la hora de inicio y de fin, para distinguir los avisos que vienen de una carga simultánea del servicio.

**El caché de Go**

- **FR-027**: Un check estático, sin Docker y dentro de `npm test`, DEBE comprobar que cada paquete que declara un ejercicio de Go en `imports` (con los valores por omisión y los de su etapa ya aplicados, como se publica) está en `backend/executor/images/go/warm/main.go`. Si falta uno, falla con un mensaje en español que nombra el ejercicio y el paquete. Un paquete de la lista que nadie importa no es un error, y `fmt` lo importa la plantilla.
- **FR-028**: Un cambio de la lista del caché DEBE reconstruir la imagen de Go antes de auditar, y es superficie auditada (Q3).

**Cuando falla un ejercicio**

- **FR-029**: Un hallazgo es un bug de contenido: DEBE registrarse con la extensión `bug` en `.specify/bugs/<slug>/`, con la línea del informe como evidencia, y corregirse en `content/` (el código, las pruebas, los `imports` o la plantilla de `content/harness/`), nunca en `build/`, sin cambiar IDs ni reutilizar claves de prueba. El PR del arreglo lleva el resumen de una corrida de registro en verde. Si el origen está en el sandbox (las imágenes, el ejecutor o la clasificación), es un bug de `backend/executor/` o del código de B2, con la misma extensión.
- **FR-030**: La auditoría NO DEBE corregir, ignorar ni silenciar nada por su cuenta: no hay una lista de excepciones que crezca sola, y la única excepción a FR-006 es la que fije Q1.
- **FR-031**: B3 DEBE entregarse con una corrida completa de registro en verde. Los hallazgos de la primera corrida se corrigen como bugs antes de marcarlo `Entregado`; la línea de base del host anticipa `rust-63` y `rust-71` con Q1-A, y los que sólo ve el sandbox (gVisor, las versiones de las imágenes) aparecen ahí.

**Integración**

- **FR-032**: La auditoría completa y de registro DEBE ser obligatoria en todo PR que toque la superficie auditada (Q3): el código, las pruebas o los `imports` de un ejercicio; un ejercicio nuevo o retirado; la plantilla; las imágenes del sandbox, sus digests o la lista del caché de Go; los perfiles y los flags del ejecutor; y las clases que arman el programa, leen la evidencia o clasifican. El PR lleva el resumen con los sellos. También corre antes de entregar A4 y antes de la compuerta G2 de C4.
- **FR-033**: B3 DEBE documentar el comando, la instancia propia, la compuerta y el horario en `backend/api/AGENTS.md`, en «Verificación» del `README.md` y en «Compiladores y evidencia» de `qa/AGENTS.md`, donde reemplaza a `runtime-check` como auditoría masiva; y sumar en `backend/executor/AGENTS.md` que después de actualizar las imágenes del sandbox se corre también la auditoría. B3 no borra `runtime-check`: lo retira A4.
- **FR-034**: Por lenguaje, la auditoría DEBE ejecutar además la solución de un ejercicio con una prueba propia que pasa y con otra que falla, y comprobar que la prueba propia se informa aparte y que el veredicto sigue en `passed` (Q5).

**Verificación** (pruebas que el cambio DEBE traer antes de la implementación, según el principio II de la [constitución](../../.specify/memory/constitution.md))

- **FR-035**: Las pruebas (Pest contra MySQL real, con un doble del ejecutor que devuelve respuestas de su contrato) DEBEN cubrir, con valores esperados que salen de esta spec y no del código que se prueba: un caso por fila de «Cómo se decide cada programa»; el código de salida y el campo «de registro» (completa, parcial, runc y sin veredicto); el formato del JSON contra un ejemplo escrito a mano; que la corrida no escribe ninguna fila (FR-012); las negativas a arrancar de FR-013; y que una prueba propia no cambia el veredicto.
- **FR-036**: El check estático de FR-027 DEBE traer sus escenarios: un paquete que falta, uno que sobra y `fmt`.
- **FR-037**: El código de B3 DEBE pasar Pint y PHPStan en el nivel 9, sin baseline ni errores ignorados, junto con `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y, si se toca el ejecutor, `npm run test:executor`. NO DEBE agregar paquetes de Composer ni de `npm`, y cada descarga se pide con nombre, origen y tamaño.

### Key Entities *(include if feature involves data)*

- **Corrida de auditoría:** una ejecución del comando, completa o parcial, con un runtime, una instancia y una cantidad de programas simultáneos. Es de registro si es completa, con runsc y sin programas sin veredicto.
- **Programa auditado:** la solución o el código inicial de un ejercicio, armado por B2 con un nonce nuevo. Su huella es la del mismo programa con un nonce fijo de ceros.
- **Veredicto de la auditoría:** aprueba (una solución), falla como corresponde (un inicial), hallazgo o sin veredicto. Sale de la tabla de «Cómo se decide cada programa» sobre el estado y el motivo de B2.
- **Hallazgo:** un programa que no cumple su regla. Es un bug de contenido, o del sandbox si su origen está ahí.
- **Aviso:** una marca, aparte del veredicto, para un programa que cumple su regla pero usa más de la mitad de un límite (Q4).
- **Sin veredicto:** un programa del que el ejecutor no devolvió un resultado válido.
- **Instancia de auditoría:** un ejecutor propio, con su etiqueta y su red, las mismas imágenes y los mismos perfiles que el servicio.
- **Informe:** la salida legible y el JSON versionado de una corrida, con sus sellos.
- **Sellos:** lo que ata un informe al contenido, la plantilla, las imágenes y el runtime contra los que corrió.
- **Superficie auditada:** lo que cambia lo que compila o cómo se clasifica (FR-032).
- **Lista del caché de Go:** los paquetes que importa `warm/main.go` y que la imagen de Go compila al construirse.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una corrida completa con runsc, después de corregir los hallazgos de la primera, da 274 de 274 soluciones que aprueban y 274 de 274 códigos iniciales que fallan como corresponde, 0 programas sin veredicto, código de salida 0 y el informe de registro en sus dos formas.
- **SC-002**: Con el doble del ejecutor, cada caso de «Cómo se decide cada programa» da el veredicto esperado y el código de salida esperado: una solución que falla una prueba, una que no compila, un inicial que aprueba, un inicial `completar` que no compila, un inicial `reparar` que no compila (que no es hallazgo con Q1-A), un aborto, un tiempo agotado, una evidencia inválida, una salida recortada, un `pids_limit` con runsc y un 500 del ejecutor: 11 de 11, además de una solución que aprueba y un inicial que falla como corresponde. La línea legible de cada hallazgo nombra el ejercicio, el código, el estado, el motivo y las pruebas.
- **SC-003**: Después de una corrida completa hay 0 filas nuevas o cambiadas en `runs`, `attempts`, `attempt_tests`, `attempt_payloads`, `progress_heads`, `exercise_progress` y la tabla de la cola; el ejecutor del servicio recibe 0 pedidos de la auditoría y 0 de sus contenedores desaparecen por el barrido de la instancia de auditoría.
- **SC-004**: Cambiar la expresión de una prueba, la plantilla o el identificador de una imagen deja sin coincidir el sello correspondiente de un informe anterior: 3 de 3. Cambiar sólo un título o una pista no cambia ninguna huella de programa: 0 cambios.
- **SC-005** (una medición, no un criterio de aprobación): con runsc y la cantidad de programas simultáneos que fije el plan, se informan la duración de la corrida completa; la mediana y el máximo de compilación y de ejecución por lenguaje; el menor margen contra cada límite y la cantidad de avisos. Se contrasta con la línea de base del host, con la mediana de 1,1 s por ejecución que midió B2 en reposo y con el umbral del aviso de Q4. Todavía no hay un objetivo que cumplir.
- **SC-006**: El check del caché de Go da 0 diferencias con el contenido de hoy (26 paquetes en 49 ejercicios). Sacar un paquete de la lista o agregar un `import` nuevo a un ejercicio hace fallar `npm test` con el ejercicio y el paquete nombrados: 2 de 2.
- **SC-007**: La muestra de la prueba propia (Q5) da 4 de 4 programas en `passed`, con la prueba propia informada como `pass` en dos y como `fail` en los otros dos.
- **SC-008**: Pasan `npm run api:test`, `npm run api:format:check`, `npm run api:analyse` (nivel 9, sin baseline), `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y, si se tocó el ejecutor, `npm run test:executor`.

## Riesgos

1. **El host no es el sandbox.** La línea de base usa `rustc` 1.97.1 y `go` 1.27.2, sin gVisor ni límites; las imágenes traen Rust 1.99 y Go 1.27. Un lint o un error nuevo del compilador, o los hilos bajo gVisor, pueden cambiar resultados. *Mitigación:* el criterio es la corrida con runsc (FR-014), y FR-031 incluye corregir lo que sólo ella muestre.
2. **Una etiqueta equivocada borra contenedores de alumnos.** El barrido inicial de un ejecutor borra todo lo de su etiqueta. *Mitigación:* etiqueta propia y distinta de la del servicio (FR-010), una sola corrida a la vez y la comprobación de SC-003.
3. **CPU compartida.** La instancia propia no ocupa lugares del servicio, pero compite por CPU con él, y los tiempos suben con carga. *Mitigación:* horario recomendado (FR-011), la hora en el informe (FR-026) y avisos que no fallan (FR-022).
4. **Una compuerta humana.** Con Q2-A y Q3-A, nada automático impide integrar un PR sin la auditoría. *Mitigación:* los sellos la hacen comprobable (FR-020) y la regla ya existe para la plantilla. Si se olvida seguido, Q2-D o Q3-B.
5. **Pruebas débiles.** Que el inicial falle no prueba que las pruebas rechacen toda solución incorrecta. *Mitigación:* se acepta: es lo que pide el criterio del ADR. Un inicial que aprueba es un hallazgo que suele terminar en una prueba nueva.
6. **El margen de memoria no se mide.** *Mitigación:* la línea de base muestra un uso ínfimo; si hace falta, Q4-B.
7. **Corregir `rust-63` y `rust-71` cambia su código inicial.** Cambia su `starter_hash` y su `content_hash`, no su `grading_hash`: el progreso guardado no pide volver a verificar. *Mitigación:* se corrigen como bugs (FR-029), con su revisión.
8. **La duración.** 548 programas con unos pocos lugares, con una mediana de 1 a 3 s por ejecución bajo runsc, rondarían los 5 a 10 minutos (estimación sin medir). *Mitigación:* SC-005 la mide, y la cantidad de programas simultáneos es configuración (FR-016).

## Relación con otras specs

- **B2 (spec 005, entregada e inmutable).** B3 reutiliza el armado, la lectura de la evidencia y la clasificación, que son puros (su FR-038 y la `PurityTest`), sin cambiarlos. El código de referencia y el código inicial están en la tabla `exercises` (columnas `starter` y `solution`), que el lector de B2 no selecciona hoy: B3 los lee con su propia lectura de sólo lectura, y el plan decide cómo. `api:runs:check` sigue: prueba la API, las cuotas y la cola, que B3 no toca. Por la Q3 de B2, B3 es la compuerta de la plantilla.
- **A4 (spec 017, PR #50, sin clarify).** Su Q5 recomienda que A4 no se entregue sin B3 en verde, y su FR-034 retira `runtime-check` cuando B3 esté entregado. Las «Fases» del ADR 0005 ponen el laboratorio (3) antes de la auditoría (4); la hoja de ruta deja a los dos en la misma ola. Esta spec no ordena a A4: si el usuario elige la opción A de la Q5 de A4, B3 pasa al camino crítico de A4 y la hoja de ruta lo cablea.
- **`runtime-check`.** Hasta A4 sigue como está, con el `buildProgram` viejo y los Playgrounds públicos, para lo que todavía los usa. Desde B3 deja de ser la auditoría masiva (FR-033): la masiva es local y no tiene la restricción de no repetir corridas contra servicios públicos. B3 no lo borra.
- **C4 (spec 008, planificada).** C4 expone el taller en Internet. Esta spec pide B3 en verde antes de su compuerta G2 (FR-032) y, desde C4, la auditoría fuera de hora en el host de producción (FR-011). Si la auditoría lee el contenido de MySQL, necesita un usuario con sólo lectura del contenido entre los usuarios por rol de C4.
- **B1 (entregado).** El ejecutor queda como está con Q4-A. Con Q4-B o Q4-C cambia, con una enmienda del ADR 0005.
- **D1, C5 y C3b.** B3 no escribe intentos ni progreso, así que no les cambia nada: no hay tablas nuevas para `UserData` ni datos nuevos para las estadísticas.
- **E1.** Un catálogo nuevo entra en la auditoría sin cambiarla (FR-001).

## Acciones del usuario

Los agentes no las hacen.

| Cuándo | Acción |
| --- | --- |
| Ahora | Responder Q1 a Q5 |
| B3, plan | Confirmar que las imágenes `taller-sandbox-rust:local` y `taller-sandbox-go:local` y runsc siguen en el host, como en B1 y B2. Si falta alguna, el plan pide la descarga con nombre, origen y tamaño (`rust:1.99-slim`, unos 330 MB, y `golang:1.27-alpine`, unos 75 MB, de Docker Hub, según el ADR 0005) |
| B3, implementación | Aprobar como bugs de contenido los arreglos de los hallazgos de la primera corrida (con Q1-A, al menos `rust-63` y `rust-71`) |
| Si Q2 es B, C o D | Permiso para las descargas de la CI que lista Q2, con los tamaños que mida el plan |

## Assumptions

- **Las imágenes y runsc ya están en el host.** B1 registró runsc y B2 construyó las imágenes del sandbox y corrió su check con runsc. El plan lo verifica antes de pedir nada.
- **El contenido llega importado.** La auditoría corre sobre el stack levantado con `docker compose up --build`, cuyo `migrate` importa el contenido de la rama. Lo que lee es lo que leería B2, y el auto-chequeo del import de C2 garantiza que coincide con el generador.
- **Un host.** El ejecutor de la auditoría y el del servicio comparten el host y el daemon de Docker, como prevé el ADR 0006 hasta su camino de escala.
- **274 ejercicios hoy,** con `kind` publicado y guardado en `exercises.kind` (`completar` o `reparar`). E1 sumará un catálogo más adelante.
- **La línea de base del host es orientativa,** no el criterio (ver «Riesgos», 1).
- **El ADR 0006 sigue en propuesta.** B3 no agrega decisiones sobre él: usa lo que B2 implementó.
- **La Q5 de A4 está sin responder.** B3 no depende de ella.
- **Idioma.** Los mensajes y el informe legible, en español; el código, las pruebas y las claves del JSON, en inglés (constitución, principios III y VI).

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q5 están en «Preguntas abiertas».

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cómo se arma el programa | Adaptar `runtime-check` para que apunte al ejecutor; un script de Node con un segundo renderizador (el de A4); el código de B2 dentro de la imagen de la API | El código de B2. `runtime-check` usa el `buildProgram` viejo, sin nonce ni centinela, y un segundo renderizador sólo coincide con el de B2 por un fixture: ninguno es lo que ejecutan los alumnos |
| Por dónde se ejecuta | A través de `/api/runs` con una cuenta de servicio; directo contra un ejecutor | Directo. `/api/runs` escribe `runs` y `attempts` y aplica cuotas (1 activa y 300 por día no alcanzan para 548 programas), lo contrario de lo que pide la hoja de ruta |
| Qué ejecutor | El del servicio, fuera de hora; una instancia propia | Instancia propia: no ocupa lugares, no la alcanza el `worker-runs` y su etiqueta la separa del barrido del servicio. Fuera de hora queda como recomendación en producción (FR-011) |
| Un programa por ejercicio o por lote | Agrupar varios ejercicios por programa, como `runtime-check`; uno por ejercicio | Uno por ejercicio. El lote no es el programa del alumno, y un inicial que no compila tumba al lote entero (por eso `runtime-check` sólo prueba un inicial por omisión) |
| De dónde lee el contenido | De `build/` dentro de la imagen; de MySQL después del import | De lo importado, que es lo que lee B2 para los alumnos. Leer `build/` evitaría la base, pero agrega un camino que B2 no usa |
| Sellos del informe | Sólo el commit; el `content_hash` de cada ejercicio; la huella del programa armado | La huella del programa, con el `grading_hash`, el `starter_hash`, la plantilla, las imágenes y el runtime. El `content_hash` cambia con un título, y el commit no dice qué imágenes había |
