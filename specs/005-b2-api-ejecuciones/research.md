# Research: B2 · API de ejecuciones

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

La spec no dejó marcadores abiertos: el clarify del 2026-10-05 los cerró (cuotas, sin fase en vivo, `imports` en el `grading_hash`, sin historial de intentos y retención de 14 y 90 días). Este archivo registra las decisiones de diseño del plan, por qué se tomaron y cómo se verificaron.

## Cómo se verificó al planificar

La sesión de planificación **no tocó el repositorio de código y no usó Docker ni descargó nada**. El host no tiene PHP, Go ni MySQL, así que sólo el TypeScript y el Rust se ejecutaron: sobre una copia de trabajo del repositorio fuera del árbol (`git archive` de esta rama, con el `node_modules` de la raíz enlazado), con Node 24.21.0 y `rustc` 1.97.1. Resultados:

- **Línea de base.** El generador da `curriculum.json` con sha256 `ef8f5715…` (la huella del documento que cita C6) y `dump-globals` da `cd1f9e62…` (la del oráculo de A1).
- **El generador con los cambios del plan** (T004 a T006, código en [plan.md](./plan.md)):
  - `curriculum.json` sale **byte por byte igual**, y su `documentHash` también;
  - las 17 porciones conservan su sha256; la 18.ª, `portions.harness`, es el sha256 de `build/harness.json`;
  - `dump-globals` sigue en `cd1f9e62…`;
  - de los 274 `gradingHash` cambian exactamente 49, todos de Go; `contentHash` y `starterHash`, ninguno;
  - pasan `content-tools-check` (16 escenarios), `content-exercises-check` (17), `content-records-check` (8), `curriculum-meta-check` (con la 18.ª porción), `content-check` (274 ejercicios y 822 pruebas), `curriculum-ids-check` y el check nuevo `content-harness-check` (3 escenarios, con 18 casos de error de gramática y sus mensajes);
  - Prettier y `tsc` (`tsconfig.node.json` y `tsconfig.qa.json`) pasan; ESLint pasa sin errores ni avisos (una primera versión del validador de la plantilla tenía complejidad 13 y 14, y se partió en funciones chicas).
- **La plantilla de Rust contra un compilador real.** Con `rustc` 1.97.1 (edición 2024, `--crate-type bin`), las 137 soluciones de referencia de Rust dan `passed` y los 137 códigos iniciales dan 125 `failed`, 11 `compile_error` y un aborto: ninguno aprueba. La lectura de evidencia y la clasificación que corrieron son las de [contracts/harness-template.md](./contracts/harness-template.md), escritas en JavaScript. El aborto es `rust-71`: «thread caused non-unwinding panic. aborting.», SIGABRT, que en el ejecutor es el código 134, `runtime_error` con motivo `signal`. **Go no se compiló** (el host no tiene Go): su plantilla la cubren T018 y la auditoría de B3.
- **El fixture compartido.** Los once casos, escritos a mano, coinciden línea por línea con un renderizador de la gramática escrito aparte en JavaScript: 0 diferencias.
- **Datos del contenido**, medidos sobre el `curriculum.json` generado: 274 ejercicios (137 por lenguaje), 822 pruebas con las claves `t1`, `t2` y `t3`; 49 ejercicios de Go con `imports` (los 137 de Rust no tienen); ninguna lista de `imports` incluye `fmt` ni repite un nombre, y 7 de las 49 no están en orden alfabético; 44 expresiones de prueba tienen `{{` y 6 tienen un salto de línea; 5 ejercicios tienen `{{` en su código; el mayor código pesa 1.545 bytes y la mayor expresión, 878.
- **La poda por UUIDv7.** La fórmula del corte, `sprintf('%08x-%04x-7000-8000-000000000000', intdiv($ms, 65536), $ms % 65536)`, clasificó bien 200.000 identificadores generados al azar a ambos lados del corte: 0 errores.
- **Metadatos de los registros** (sin descargar ninguna imagen), en la sección «Descargas y permisos» de [plan.md](./plan.md).
- **La documentación de Laravel 13**, leída en laravel.com: atributos de trabajos (`#[Tries]`, `#[Timeout]`, `#[FailOnTimeout]`), PCNTL obligatorio para los plazos de un trabajo, el plazo del trabajo siempre menor que `retry_after`, `$this->release()`, `Http::fake`, `Http::failedConnection()` y `Http::preventStrayRequests()`, `Concurrency::run` (el driver `process` ejecuta cada cierre en un proceso PHP propio por `artisan`), el recorte de textos y la conversión de vacíos a `null` de los middleware globales, `RateLimiter::for` con `Limit::perMinute()->by()->response()`, `Schedule::command()->everyMinute()->withoutOverlapping()` y `Str::uuid7()`.

**Sin ejecutar**: todo el PHP, el SQL, el YAML de Compose y la configuración de Nginx del plan son **referencia sin ejecutar**. Los dueños corren PHPStan en el nivel 9 y Pest sobre lo que escriban.

## R1. La plantilla es la 18.ª porción, con su archivo propio

**Decision**: el generador escribe un tercer archivo, `build/harness.json`, con exactamente los bytes del recurso (`{"rust":"…","go":"…"}`, compacto), y suma `harness` al final de `portions` en `curriculum.meta.json`. `curriculum.json` y su `documentHash` no cambian. `content:import` guarda cada texto en la tabla `harness_templates` y la API lo publica en `GET /api/harness` con el contrato de las porciones. En PHP, `Portion` suma el caso `Harness = 'harness'`.

**Rationale**: FR-035 pide que agregarla no cambie los bytes ni los validadores de las 17 porciones, y la verificación lo confirma (el documento, las 17 huellas y el oráculo, iguales). Con una porción más, el recurso hereda todo lo ya probado de C2: `ETag` por huella, `Content-Version`, 304, caché de cuerpos y el auto-chequeo del import, que arma las porciones desde las tablas y exige la huella del generador. Efecto buscado: `Content-Version` sale del documento y **no cambia si sólo cambia la plantilla**, así que el validador de la plantilla es su `ETag`, y el cliente que la usa (A4) la revalida con un 304 cada vez que abre el laboratorio.

Lo que cambia por decir «18»: hay que tocar cada lugar que fija «17» o enumera `Portion::cases()`: `ContentMeta` (el mensaje y la comprobación del orden de las porciones), `ContentSource` (lee `harness.json` y verifica su huella contra el meta), `ContentRows` (agrega las filas de la plantilla), `ContentTables` (la tabla nueva), `ContentReader`, `PortionAssembler`, `PortionRenderer`, `ContentInvariants` (cada lenguaje tiene su plantilla), `ContentImporter` y `ImportContent` (textos que dicen «17»), `ContentController` y la ruta, y en el generador `tools/content/meta.ts` y `load-curriculum.ts`. En las pruebas: `PortionTest`, `ContentSourceTest`, `ContentRoundTripTest`, `Record/ContentMetaTest`, `ContentContractTest`, `ContentEndpointTest`, `ImportContentTest`, `ContentSchemaTest`, `ContentDatabaseTest`, `ContentFixture` y `ContentDatabase` (la tabla suma una, de 21 a 22), y `qa/curriculum-meta-check.ts` y `qa/api-content-check.ts`. En los documentos: el README (las menciones de «17 porciones»), `backend/api/AGENTS.md` y `docs/architecture.md`. T009 lo enumera por archivo.

**Alternatives considered**:

- Una octava clave de `curriculum.json`. Cambia el `documentHash` (y con él `Content-Version`) una vez, y lo ven los adaptadores legacy y Vite, que importan ese documento; contradice «el oráculo no cambia». El ADR 0005 §4 decía que la plantilla «viaja en `curriculum.json`»: FR-035 lo reemplaza.
- Un módulo aparte, fuera de `Portion`. Duplica el 304, la caché de cuerpos y el auto-chequeo, que son lo que más cuesta equivocar.
- Columnas nuevas en `languages`. Altera una tabla de contenido sin ganar nada sobre una tabla propia.

## R2. La gramática de la plantilla

**Decision**: la de [contracts/harness-template.md](./contracts/harness-template.md): marcadores `{{nombre}}`, dos secciones de líneas repetidas (`tests`, `imports`) con etiquetas solas en su línea, una sola pasada de sustitución sobre la plantilla, `{{code}}` sin recortar, el nonce de 32 hexadecimales, `{{count}}` y `fmt` en la plantilla de Go con los `imports` del ejercicio sin `fmt` y sin repetidos. Archivos de texto `content/harness/rust.tpl` y `go.tpl`, con LF.

**Rationale**: dos renderizadores (PHP y TypeScript) la implementan, así que es la interfaz más cargada: tiene que caber en treinta líneas de cada lado, sin lógica escondida en una plantilla. La pasada única no es teórica: 44 de las 822 expresiones tienen `{{`. `fmt` va en la plantilla porque la usa el propio harness: si un ejercicio lo listara en `imports`, un `import` duplicado no compilaría (hoy ninguno lo lista, y el renderizador igual lo omite, como hacía `new Set(['fmt', …])` en `buildProgram`). El marcador conserva el formato del ADR 0005 §5 con el nonce; el centinela `__TALLER_END__<nonce>:<count>` lo fija B2, porque el ADR sólo dice «un sentinela final que lleva el conteo».

**Alternatives considered**:

- Plantillas en YAML con escalares de bloque (`|`). El escalar de bloque quita la sangría común, así que conservar la sangría del código de la plantilla exige el indicador `|4` y se rompe en silencio al reindentar.
- Un lenguaje de plantillas completo (condicionales, bucles anidados). Invita a poner lógica en dos renderizadores que tienen que coincidir.
- El fragmento de cada prueba como constante en cada renderizador. Es justo el texto duplicado que el fixture compartido existe para evitar.
- Sustituir con `str_replace` en secuencia. Volvería a recorrer el código del alumno y expandiría un `{{id}}` suyo.

## R3. La lectura de la evidencia y la clasificación

**Decision**: la tabla de diez filas de [contracts/harness-template.md](./contracts/harness-template.md). Los marcadores se buscan con una expresión que lleva el nonce, sin anclar a principio de línea. Cada prueba esperada debe tener **exactamente un** marcador; un marcador con una clave que no se esperaba invalida la evidencia; el centinela debe aparecer **una sola vez** con la cuenta correcta; la prueba propia se informa aparte y nunca cuenta. Los tres estados de infraestructura (`executor_error`, `executor_busy`, `job_failed`, `expired`) no salen de la tabla.

**Rationale**:

- *Sin anclar*: el lector de `run-outcome.ts` (el de hoy, sin nonce) ancla a principio de línea con `/m`; con el nonce no hace falta, y un `print!("x")` del alumno sin salto de línea no arruina el primer marcador.
- *El orden y el recorte*: `internal/output/limited.go` conserva el **principio** de cada flujo (los primeros 65.536 bytes) y descarta el resto, así que una salida grande pierde los últimos marcadores y el centinela: es el caso `output_limit`, que la tabla distingue de `evidence_invalid` mirando `truncated`.
- *`pids_limit` y runsc*: sólo con runsc un 137 sin `oomKilled` ni `timedOut` es el `--pids-limit` (ADR 0005, enmienda de B1); con runc es la señal 9. El worker lee `EXECUTOR_RUNTIME`.
- *Un código mayor que 128*: es una señal (el código menos 128), y un `exit(200)` del alumno se rotula `signal` igual: se acepta, porque el estado `runtime_error` es el mismo.
- *Respuestas fuera de la tabla de la spec*: 400, 401 y 413 son defectos de configuración nuestros (pedido mal armado o token equivocado): `infra_error` con `executor_error` y un error en el log, no un resultado del alumno.

**Alternatives considered**: marcadores anclados como los de hoy; leer también `stderr`; confiar en el código de salida y las líneas `PASS` sin nonce (lo que hace el cliente actual, que el ADR 0005 reemplaza).

## R4. El `grading_hash` con los `imports` de Go (Q3)

**Decision**: el generador suma `imports` al objeto canónico que se hashea **sólo si el ejercicio es de Go y la lista no está vacía**, y la suma ordenada y sin repetidos. Los otros 225 ejercicios conservan su `grading_hash` bit por bit.

**Rationale**: medido, la suma condicional cambia exactamente 49 hashes (los de Go con `imports`) y la incondicional, los 274, porque todos los ejercicios publican la clave `imports` aunque sea `[]`. El usuario respondió con «49» a la vista (Q3 y FR-037). Ordenar y quitar repetidos evita una falsa alarma: 7 de las 49 listas no están en orden alfabético, y reordenar una lista de `imports` no cambia lo que compila, así que no debe marcar «cambió, volvé a verificarlo». Rust no entra: la plantilla de Rust no tiene sección de `imports`.

**Qué ve el primer import.** El `grading_hash` de 49 ejercicios cambia: `content:import` actualiza sus filas, suma 49 filas a `exercise_grading_versions` (el conjunto de hashes válidos por ejercicio, append-only) y su informe los lista en `gradingChanged`, no en `textChanged`: el texto publicado y el `content_hash` no cambian. Como el cambio viaja en la misma imagen que B2 y el import corre antes de que arranque `php` (el despliegue deja a `php` esperando a `migrate`), no existe ningún intento guardado todavía: es gratis, que es lo que C2 dijo de este momento.

**Alternatives considered**: A (ningún cambio) y C (también la huella de la plantilla), de la spec; la suma incondicional (274 cambios); respetar el orden en que se escribió la lista (reordenar sería un cambio de corrección).

## R5. Las claves de prueba (D14)

**Decision**: el generador acepta cualquier clave que cumpla `^[A-Za-z0-9_]{1,64}$`, única en el ejercicio y distinta de `custom`, y deja de exigir `t{índice+1}`. Sigue exigiendo tres pruebas por ejercicio, en `qa/content-check.ts` (B2 no cambia esa regla). El importador conserva su regla de no reutilizar la clave de una prueba retirada y cambia su mensaje: «el test_key se retiró y no se reutiliza: dale otra clave a la prueba nueva». Cambia con él el docblock de `ContentDiff::assertMayReturn` y las dos pruebas que fijan el texto (`ContentDiffTest` e `ImportContentTest`), y la línea del README que dice «hasta B2».

**Rationale**: la forma es la que lee el marcador (`\w+` en el lector actual, que el servidor repite con el nonce) y la que cabe en `exercise_tests.test_key VARCHAR(64)`; `custom` está reservada para la prueba propia. Las 822 claves actuales (`t1` a `t3`) siguen valiendo y no se edita ningún YAML: `curriculum.json` sale igual.

**Alternatives considered**: seguir con `t{índice+1}` (quitar una prueba renumeraría las siguientes y la historia mezclaría pruebas distintas bajo una clave: D14); un prefijo obligatorio como `t` (más estricto sin ganar nada).

## R6. Las cuotas, sus ventanas y el `Retry-After` (Q1, FR-007 a FR-011)

**Decision**: `QuotaPolicy` lee una sola vez, dentro de la transacción de admisión y después de tomar la cabecera, un agregado sobre `runs` de las últimas 24 horas de la cuenta:

- `active`: las ejecuciones en `queued` o `running`;
- `per_minute` y `per_day`: las aceptadas, con cualquier estado menos `infra_error` (FR-010), en el último minuto y en las últimas 24 horas (cuenta `canceled`);
- `sandbox_time`: la suma de `compile_ms + run_ms` de las que no terminaron en `infra_error`, que cuenta cuando la ejecución termina (una en curso puede pasar el tope por la duración de una);
- el más viejo de cada ventana, para el `Retry-After`.

Rechaza con 429 `quota_exceeded` si `active ≥ 1`, `per_minute ≥ 10`, `per_day ≥ 300` o `sandbox_time ≥ 1.800.000 ms`. El tope global es un `COUNT(*)` de `status = 'queued'` sin candado global (FR-008): si es 32 o más, 503 `queue_full`. `Retry-After`: `active`, 3 s; las ventanas, lo que falta para que salga la ejecución contada más vieja (al menos 1 s); `queue_full`, 10 s. Los valores salen de `config/runs.php` y de variables de entorno (FR-009).

**Rationale**: contar después de tomar el candado, en READ COMMITTED, hace exactas las cuotas de una cuenta (nadie más admite por ella) y deja el tope global blando, como pide D08. Acotar por `created_at` alcanza con el índice `(user_id, created_at)` del ADR: como mucho 300 filas aceptadas más las de `infra_error` por cuenta y día, y toda ejecución activa nació hace menos de 13 minutos, así que cae dentro de la ventana. El `Retry-After` de una ventana dice cuándo sale la más vieja: con el tope exacto en la ventana, que salga una deja lugar.

**Alternatives considered**: `RateLimiter` o `Cache::lock` para las cuotas (no son transaccionales con el `INSERT`: dos fuentes de verdad); contadores en `progress_heads` (escrituras de más, y la tabla es también de D1); un índice `(user_id, status)` (no está en el ADR, y la ventana lo vuelve innecesario).

## R7. La admisión: una transacción corta, el orden de bloqueo y la idempotencia

**Decision**: `RunAdmission::admit` hace, en este orden:

1. **Fuera del candado** (FR-005): el ejercicio y sus pruebas en un snapshot de lectura (`ExerciseReader`), y el programa armado con el nonce (`ProgramComposer`, puro).
2. **Dentro de `AccountLock::within`** (READ COMMITTED, cabecera tomada): `users … FOR SHARE` (si no está `active`, 403 `account_disabled`); la idempotencia (la misma cuenta y `clientRunId`: igual ejercicio, código y prueba propia es un reintento, lo que sea distinto es 422 `client_run_id_reused`); las cuotas; el tope global; y el `INSERT` de la ejecución con la época de la cabecera y el trabajo en `jobs`, en la misma transacción.

El trabajo se inserta con `after_commit` en `false` en la conexión `runs` y sin llamar a `afterCommit()`: la ejecución y su trabajo se confirman juntos o no queda nada, y ningún worker ve el trabajo antes del COMMIT.

**Rationale**: veinte pedidos idénticos se serializan en la cabecera; el primero inserta, los demás ven la fila ya confirmada (READ COMMITTED) y devuelven la misma ejecución, así que queda una ejecución, un trabajo y un pedido al ejecutor (SC-004). El `UNIQUE (user_id, client_run_id)` es la última guarda. Con `after_commit` en `true`, una caída entre el COMMIT y el encolado dejaría una ejecución en cola sin trabajo (D27). Armar el programa antes del candado deja corto lo que se hace con él tomado (FR-005). La comparación de un reintento normaliza la prueba propia (`null`, `''` y sólo espacios son lo mismo) y compara el código byte por byte.

**Alternatives considered**: `Cache::lock` por cuenta (otra fuente de verdad); `users FOR UPDATE` (choca con los chequeos de FK de todas las hijas: D08); encolar después del COMMIT (D27); SERIALIZABLE.

## R8. La cadena de plazos (FR-013)

**Decision**: los de [contracts/executor.md](./contracts/executor.md): ejecutor (30 s de espera de un slot, 20 s de compilación en Rust y 10 s de ejecución, `WriteTimeout` de 90 s) < cliente HTTP (100 s, con 5 s para conectar) < trabajo (120 s, con `#[Timeout(120)]`, `#[FailOnTimeout]` y `--timeout=120`) < `retry_after` de la conexión `runs` (140 s) = vencimiento de `running`; `stop_grace_period` de `worker-runs` de 150 s y el del ejecutor de 45 s. PCNTL entra en la imagen de la API.

**Rationale**: la documentación de Laravel exige PCNTL para los plazos de un trabajo y dice que el plazo del trabajo debe ser siempre menor que `retry_after`, o el trabajo se reintentaría antes de terminar. El `retry_after` de 90 s que trae `config/queue.php` reentregaría a los 90 s un trabajo que sigue corriendo, y con el código del alumno eso es ejecutarlo dos veces. El `stop_grace_period` por omisión de Compose es de 10 s: sin 150 s, cada despliegue mataría con SIGKILL las ejecuciones en curso (US7, escenario 3); `queue:work` termina el trabajo actual al recibir SIGTERM. Un worker caído deja `running` una ejecución hasta que pasan sus 140 s y corre el barrido, que corre cada minuto: el techo es de unos 200 s, menos de los 4 minutos de la spec. Además, a los 140 s el trabajo reservado vuelve a estar disponible y otro worker lo toma con `attempts` en 2, que con `tries = 1` falla y cierra `infra_error`/`job_failed`: lo que ocurra primero.

**Alternatives considered**: dejar la cola `default` con 90 s (reejecuta código); un worker por `systemd` fuera de Compose (no es portable entre Linux y macOS).

## R9. Los fallos del trabajo: sin `release()`

**Decision**: el trabajo tiene `tries = 1` y no usa `release()`. Si el ejecutor estaba ocupado o no se lo alcanzó, `RunRequeuer` deja la ejecución en `queued` y **despacha un trabajo nuevo con demora, en la misma transacción**; el trabajo actual termina normal y se borra. `failed()` cierra `infra_error` con `job_failed` sólo si la ejecución sigue activa, y como el cierre es idempotente, un `failed()` repetido o tardío no hace nada.

**Rationale**: `release()` vuelve a dejar el trabajo disponible con un intento consumido: al volver a tomarlo tiene `attempts` 2, supera `tries = 1` y falla, o sea que el reencolado por ocupado terminaría en `job_failed`. El trabajo nuevo con demora conserva «un solo intento por trabajo». Si el proceso muere entre el COMMIT del reencolado y el borrado del trabajo viejo, ese trabajo vuelve a los 140 s, falla por intentos y cierra la ejecución como `infra_error` aunque el trabajo nuevo esté esperando: es la ventana más chica posible y termina del lado seguro (el alumno vuelve a pedir; el código no corre dos veces).

**Alternatives considered**: `tries` más alto con `backoff` (reejecuta código tras una caída); `release()` con un `tries` alto sólo para el 503 (mezcla las dos semánticas).

## R10. El cierre, el progreso y la revisión (FR-027 a FR-033)

**Decision**: `RunCloser` es una transacción corta bajo la cabecera (sección 3 de [data-model.md](./data-model.md)). El progreso se calcula **en PHP, bajo el candado**, con una función pura (`ProgressMerge::afterAttempt`) y se escribe con un `INSERT … AS n ON DUPLICATE KEY UPDATE` que toca sólo las columnas de B2. Las fechas son la `attempted_at` del intento. `infra_error` mueve `last_*` y sube la revisión, y `canceled` no toca nada. La revisión nueva se estampa en la cabecera y en la fila de `exercise_progress` que cambió.

**Rationale**: con la cabecera tomada, nadie más escribe esa cuenta, así que leer, calcular y escribir es seguro, y la función pura se prueba con una tabla de casos sin base de datos. D29 pide escribir los punteros con un `INSERT … SELECT` unido por `attempts.user_id` para que un puntero no pueda cruzar cuentas; acá el intento se inserta en la misma transacción y la misma cuenta, así que el cruce es imposible por construcción, y una prueba de esquema busca punteros cruzados igual. `infra_error` mueve `last_*` porque el ADR 0006 define ese puntero como «último intento no cancelado» y excluye sólo a los cancelados; es la lectura literal, y lo que decide D1 al leerlo es mostrarlo o no. Estampar la revisión en la fila lo pide D1 (su FR-010): sin eso, el delta de `/api/sync` no ve lo que cerró una ejecución.

**Alternatives considered**: un único `INSERT … SELECT` con todas las reglas de fusión (ilegible y difícil de probar; con alias de fila sólo anda a través de una tabla derivada); Eloquent (no admite claves compuestas, D09 y §8); excluir a `infra_error` de `last_*` (se aparta del ADR sin que nadie lo haya decidido).

## R11. El barrido y la poda (FR-018, FR-044)

**Decision**:

- `runs:sweep`, cada minuto y sin solaparse, cierra como `infra_error` con `expired` las ejecuciones activas con `expires_at` vencido (hasta 100 por corrida), una transacción por ejecución; si tiene `cancel_requested_at`, el cierre sale `canceled`.
- `runs:prune`, cada hora y sin solaparse, borra `runs` por lotes de 1.000 con `DELETE … WHERE id < <corte> AND status NOT IN ('queued','running') ORDER BY id LIMIT 1000`, donde el corte es el UUIDv7 mínimo del instante de hace 14 días; y los payloads de más de 90 días, salvo los de los punteros de `exercise_progress`, con un cursor por `(created_at, attempt_id)` y un `DELETE … IN (…)` por lote.
- Las dos tareas son dos líneas de `routes/console.php`, que pone el coordinador al integrar (líneas de integración: el archivo es de C3a), y las corre el `scheduler` de C3a (`schedule:work`).

**Rationale**: el corte por UUIDv7 recorre la clave primaria, sin un índice propio (D02); la fórmula está verificada. La poda de payloads es la consulta más cara del módulo: un `LEFT JOIN` contra `exercise_progress` por cada payload de más de 90 días. Se mantiene por lotes con cursor para no releer lo conservado dentro de una corrida, y entre corridas relee lo conservado (hasta unos 2,7 millones de filas con 5.000 cuentas, si cada una conserva dos por ejercicio): por eso corre cada hora con un tope de lotes y su costo real se mide con las 5.000 cuentas sintéticas de C5. El acuerdo con D1: el reset borra los punteros, y los payloads de la época anterior pasan a la regla de 90 días (el plan lo acepta; ver la sección 6 de [data-model.md](./data-model.md)).

**Alternatives considered**: `model:prune` de Laravel (pide modelos Eloquent, que B2 no usa para estas tablas); marcar los payloads retenidos con una columna (los intentos son inmutables, y el puntero se movería con cada intento nuevo: una escritura más por cierre); una vida de 90 días fija para todos (rompe FR-044).

## R12. Un solo código para la cabecera: `AccountLock`

**Decision**: `App\Progress\AccountLock` (con `ProgressHead`) toma o crea la cabecera de la cuenta y corre el trabajo con ella: `INSERT … AS n ON DUPLICATE KEY UPDATE user_id = n.user_id` y después `SELECT … FOR UPDATE`, todo dentro de `WriteTransaction::run`, el escritor READ COMMITTED con hasta 3 intentos que entrega C3a (`App\Database\WriteTransaction`, T006 de C3a). B2 entrega `AccountLock` y D1 lo importa. La compuerta de T003 son tres pruebas sobre `AccountLock` que fijan lo que B2 necesita de `WriteTransaction`: el aislamiento es READ COMMITTED **en cada intento**, también en el que sigue a un interbloqueo; corre sin error dentro de una transacción ya abierta (las pruebas con `RefreshDatabase`); y devuelve lo que devuelve el trabajo.

**Rationale**: dos implementaciones del candado de la cuenta se desordenarían (lo pide D1, su hallazgo 3), y un escritor común para todo el backend es lo que pide D08. La referencia de C3a tiene dos riesgos que su prueba, tal como está escrita, no cubre. Primero, `SET TRANSACTION ISOLATION LEVEL` vale sólo para la **próxima** transacción: con `SET` una vez y después `DB::transaction($trabajo, attempts: 3)`, el segundo intento tras un interbloqueo corre en el aislamiento por omisión (REPEATABLE READ) sin que nadie lo note. Segundo, MySQL rechaza cambiar el aislamiento con una transacción abierta (error 1568): el `WriteTransactionTest` de C3a vive en la suite `Feature`, que corre cada prueba dentro de una transacción de `RefreshDatabase`, y `ContentSnapshot::read` de C2 ya tiene ese atajo por la misma razón. Si cuando B2 llegue `WriteTransaction` no cumple las tres pruebas, T003 lo corrige en `app/Database/WriteTransaction.php` (un bucle que fija el aislamiento antes de cada intento y un atajo para la transacción abierta), con el visto bueno del coordinador: lo ideal es que C3a lo corrija antes, y por eso es un hallazgo del informe de B2.

**Alternatives considered**: un bucle propio dentro de `AccountLock` (duplica lo de C3a y deja a C3a y D1 con otro escritor); `DB::transaction(…, attempts: 3)` con `SET SESSION` (cambia el aislamiento de todo lo que corra después en esa conexión, en un worker de larga vida); dos clases, una por spec.

## R13. La estrategia de pruebas (FR-047)

**Decision**:

- **Pest contra MySQL real**, con tres lugares: `tests/Unit/Runs/` (lo puro: la plantilla, la evidencia, la clasificación, la fusión del progreso, el corte de la poda), `tests/Feature/Runs/` (con `RefreshDatabase`: lo secuencial) y `tests/Concurrency/` (una suite nueva con `DatabaseTruncation`, para lo que necesita conexiones paralelas).
- **El doble del ejecutor** es `Http::fake` con las respuestas del contrato, y `Http::preventStrayRequests()` para que ninguna prueba salga a la red. La conexión rechazada se simula con un `ConnectionException` que trae adentro un `ConnectException` de Guzzle con errno 7; la que pudo haber corrido, con `Http::failedConnection()` (sin errno).
- **El reloj** es el de PHP (`Carbon::setTestNow`): todas las horas de B2 salen de ahí, así que las ventanas, los vencimientos y la poda se prueban sin esperar.
- **La concurrencia real** usa `Concurrency::run` (el driver `process` ejecuta cada cierre en un proceso PHP propio, con su propia conexión), sin paquetes nuevos (`spatie/fork` sería una dependencia más). Cada proceso hijo empieza llamando a `TestCase::ensureTestDatabase` con su conexión efectiva: las sustituciones `<server>` de `phpunit.xml` no viajan a los hijos, y un hijo que no apunte a `mysql-test` aborta antes de escribir. Los datos de la prueba se confirman antes de lanzar los procesos (por eso `DatabaseTruncation` y no `RefreshDatabase`, que los esconde dentro de una transacción abierta). Los veinte pedidos idénticos son veinte procesos; las cien admisiones de SC-004 son veinte procesos con cinco cuentas cada uno, que corren a la vez.
- **El log** se captura con un `Monolog\Handler\TestHandler` en el canal por omisión, y se busca en cada registro el código, la prueba propia, la salida y el programa de una corrida completa.
- **Los invariantes de fila** (sección 2 de [data-model.md](./data-model.md)) los comprueba `RunInvariants` al final de cada prueba que toca `runs`.

**Rationale**: una prueba de Pest corre en un solo proceso, y sin procesos hijos no hay concurrencia que probar. `pcntl_fork` queda disponible cuando PCNTL entre en la imagen, pero un hijo bifurcado comparte el socket de MySQL del padre y puede cerrarlo al salir, que es el motivo para no usarlo. Los valores esperados de las pruebas salen de las tablas de [contracts/](./contracts/) y de ejemplos resueltos a mano, no del código probado.

**Alternatives considered**: simular la concurrencia con dos conexiones PDO en un solo proceso (la segunda bloquea al proceso entero hasta el `innodb_lock_wait_timeout`); un script de shell con `curl` en paralelo (no cubre las cuotas por conexión ni se integra a Pest).

## R14. El contrato HTTP

**Decision**: [contracts/runs-api.md](./contracts/runs-api.md). Los puntos que se decidieron al planificar:

- **Envoltura**: todo lo de `/api/runs` va en `{"data": …}`, y `/api/harness` sin envoltura (ADR 0006 §8). El 202 y el 200 de `POST /api/runs` traen la misma representación que `GET`, para que el cliente tenga un solo lector.
- **Caché**: `Cache-Control: private, no-store` en las respuestas de ejecuciones (D25).
- **Un campo extra**, `quota`, en el 429 `quota_exceeded`, para que el cliente diga cuál fue; se suma a la tabla de §8 al aprobar el ADR.
- **Lo ajeno es 404**: la búsqueda va por el dueño (`WHERE id = ? AND user_id = ?`); no hay policies de Eloquent porque las tablas no usan Eloquent.
- **Los errores** salen de `ApiError::of(ApiCode::X, $extra, $headers)` de C3a, con el mensaje en `lang/es/api.php`. B2 suma tres códigos a ese enum cerrado: `ClientRunIdReused` (422), `QuotaExceeded` (429) y `QueueFull` (503); son líneas de integración (`ApiCode`, `lang/es/api.php` y la fila de `ApiCodeTest`), que el coordinador pone al integrar la onda 0.
- **Las rutas** van en `routes/api/runs.php`, dentro de `Route::middleware(['account', 'verified'])`, el grupo que C3a monta para las rutas de estudio (sesión, cuenta activa y cuenta esperada); `bootstrap/app.php` las lista en `withRouting(api: [...])`. La ruta `GET /api/harness` va en su propio archivo, `routes/api/harness.php`, bajo el mismo grupo, para no editar `routes/api.php`, que es del coordinador de C3a.
- **El cuerpo no se toca**: los middleware globales de Laravel (`TrimStrings` y `ConvertEmptyStringsToNull`) recortan los textos y convierten `""` en `null`, y recortar `code` cambiaría los bytes que se ejecutan, los números de línea y el `code_sha256`. `bootstrap/app.php` los exceptúa para `api/runs` y `api/runs/*` con las dos llamadas que documenta Laravel 13 (`trimStrings(except:)` y `convertEmptyStringsToNull(except:)`); son líneas de integración de un archivo compartido con C3a, que pone el coordinador. La prueba prueba el comportamiento: un `code` con espacios al principio y al final llega a la base tal cual.
- **Los campos de más se rechazan** (FR-003): `SubmitRunRequest` compara las claves del cuerpo con las cuatro permitidas y devuelve 422 por cada una que sobra.
- **`throttle:runs-submit`** (30 por minuto por cuenta) sólo en `POST /api/runs`, que cuenta también lo rechazado (FR-011); sin límite de Laravel en el `GET` (FR-025).

## R15. Compose, Nginx, imágenes y despliegue (FR-045, FR-046)

**Decision**:

- **`executor`**: la etapa `runtime` de `backend/executor/Dockerfile`, en una red `sandbox` (`internal: true`) que sólo comparte con `worker-runs`, sin puertos publicados, con el socket de Docker montado y `group_add` con el GID del socket (`EXECUTOR_DOCKER_GID`), `read_only`, `cap_drop: ALL`, `no-new-privileges`, `dns: ['127.0.0.1']` (como los demás servicios de redes internas, FR-043 de C3a) y `stop_grace_period: 45s`.
- **`worker-runs`**: la imagen de la API (`<<: *laravel-runtime`, que trae el DNS cerrado de C3a), `queue:work runs --queue=runs --sleep=1 --tries=1 --timeout=120 --max-jobs=500 --max-time=3600`, en las redes `app` y `sandbox`, con `deploy.replicas: ${EXECUTOR_MAX_CONCURRENT:-4}` (un worker por slot) y `stop_grace_period: 150s`.
- **`EXECUTOR_TOKEN`**: sólo en `executor` y `worker-runs`, nunca en el ancla `x-laravel-env` (que comparten `php`, `migrate` y el `scheduler`): el mismo criterio que D21 aplica a las credenciales del correo. Las variables `RUNS_*`, que no son secretas, sí van en el ancla.
- **Imágenes del sandbox**: dos servicios de construcción con el perfil `sandbox-images` (`sandbox-rust` y `sandbox-go`, con `image: taller-sandbox-rust:local` y `taller-sandbox-go:local`), que nunca arrancan: `docker compose --profile sandbox-images build` las construye con los nombres que el ejecutor espera, y el ejecutor no inicia si faltan. Hay que reconstruirlas al menos cada semana (ADR 0005, enmienda de B1).
- **Despliegue**: `deploy.sh` agrega `executor` y `worker-runs` al `up` posterior a `migrate`, y las dos se recrean con la imagen nueva.
- **Nginx**: una ubicación hermana, `location ^~ /api/runs`, que **repite** el bloque de `/api/` tal como lo deja C3a (el `set $php_upstream`, `include fastcgi_params`, los `fastcgi_param`, el `fastcgi_pass`, el `access_log`, el `limit_req zone=api burst=400 nodelay`, el `error_page 429 = @too_many_requests`) y suma `client_max_body_size 192k;`. Es lo que C3a espera de B2 («sus ubicaciones nuevas repiten el límite y los `fastcgi_param`»). No se anida: las directivas del módulo de reescritura (`set`) no se heredan a una ubicación anidada, así que `fastcgi_pass $php_upstream` quedaría con una variable vacía. Como el bloque está duplicado, `qa/nginx-api-blocks-check.ts` (parte de `npm test`) compara los dos y falla si difieren en algo más que esa línea; `api:smoke` suma un POST de 200 KiB que tiene que dar 413.
- **`init-env.sh`** (cuya estructura es de C3a: una línea `add_missing` por variable, sin pisar nunca un valor existente) suma `EXECUTOR_TOKEN` (64 hexadecimales, más de los 32 bytes que exige el ejecutor) y `EXECUTOR_DOCKER_GID`, que lee con `ls -lnL /var/run/docker.sock | awk '{print $4}'`, portable entre Linux y macOS (a diferencia de `stat -c` y `stat -f`). Compose declara las dos con `${VAR:?mensaje}`.
- **PCNTL** en `backend/api/Dockerfile`, en una instrucción propia después de la de `pdo_mysql`, para no invalidar esa capa.

**Rationale**: el ejecutor tiene el socket de Docker, que equivale a root en el host: queda con la menor superficie posible. `deploy.replicas` es la forma estándar de Compose de tener un proceso por slot, y `queue:work` no tiene un modo multiproceso. El GID por omisión sería `0` o `65534`, y ninguno es seguro de adivinar: es mejor que Compose se niegue a arrancar sin el valor.

**No verificado** (no se ejecutó Docker): que el ejecutor corra con `read_only: true` (la CLI de Docker puede querer un `HOME` escribible: si lo pide, `HOME=/tmp` y `DOCKER_CONFIG=/tmp/.docker`), que la ubicación anidada de Nginx herede, y que en Docker Desktop para macOS el GID del socket del host sea el que ve el contenedor. Los tres los comprueba T017 (y el DNS cerrado de `executor` y `worker-runs` entra en la comprobación de `smoke.sh`).

## R16. El fixture compartido: dónde vive y cómo lo leen Pest y el front

**Decision**: `qa/fixtures/shared/harness-cases.json`. La regla: **un fixture que lee Pest y el front va en `qa/fixtures/shared/`**, y el stage `dev` de `backend/api/Dockerfile` lo copia a `tests/Fixtures/shared/` con `COPY --from=repo qa/fixtures/shared tests/Fixtures/shared`. Pest lo lee de `base_path('tests/Fixtures/shared/…')`; el front, de `qa/fixtures/shared/…` en el repositorio.

**Rationale**: la imagen de pruebas sólo ve lo que su Dockerfile copia, pero ya tiene un contexto con nombre, `repo`, que la etapa `curriculum` usa para traer `content/`: una línea más lo comparte sin mover el fixture dentro de `backend/api/` (donde A4, que no lo escribe, tendría que ir a buscarlo). Un solo archivo con dos lectores es lo que pide FR-036. El mismo mecanismo sirve al fixture de fusión de D1 (su FR-083): lo deja en el mismo directorio y no necesita otra línea. `docker compose --profile test run --build test` reconstruye la imagen cada vez, así que un cambio del fixture llega a Pest.

**Alternatives considered**: el fixture dentro de `backend/api/tests/` (el front dependería de un directorio de pruebas del backend); montar `qa/` como volumen en el servicio `test` (cambia cómo corre toda la suite y rompe la regla de que el código va dentro de la imagen); `qa/fixtures/` plano con una copia archivo por archivo (una línea de Dockerfile por fixture).

## R17. El log (FR-042)

**Decision**: un registro por hecho (`run.admitted`, `run.rejected`, `run.claimed`, `run.requeued`, `run.closed`, `run.swept`, `run.pruned`), estructurado, con las claves `run`, `user`, `exercise`, `status`, `reason` y `code`, y **nunca** el código, la prueba propia, la salida ni el programa. Una prueba corre una ejecución completa con cadenas centinela en el código, la prueba propia y la salida, y busca esas cadenas en todo lo que se registró.

**Rationale**: lo que se loguea llega a stderr y de ahí a los logs de Docker, que no tienen la retención ni el acceso de la base. El código del alumno puede tener datos personales (Ley 25.326).

## R18. Con C3a y con C3b

**Decision**: B2 se apoya en lo que C3a entrega por posición, no por nombre: las rutas de `/api/runs` se incluyen dentro del grupo de rutas con sesión activa, email verificado y cuenta esperada que arma C3a, y las pruebas ejercitan el comportamiento por HTTP (401, 403, 409, 419), no los nombres de los middleware. Para C3b, B2 entrega `ActiveRuns::cancelAllOf(int $userId): int` (FR-050) y deja el orden de borrado (sección 8 de [data-model.md](./data-model.md)); no crea `UserData`.

**Rationale**: el plan de C3a todavía no existe, así que sus alias no son un contrato; sí lo son sus requisitos (FR-005, FR-007, FR-031, FR-036, FR-037, FR-039). Lo que B2 le pide a C3a, y que sólo puede resolver C3a, está en «Lo que B2 toma de C3a» de [plan.md](./plan.md): `limit_req_status 429` y una ráfaga que absorba el polling de un aula, que el `verified` propio sea reutilizable en `/api/runs`, y que su Q3 (si el admin estudia con su cuenta) puede sumar un 403 al rol `admin`.

## R19. Nivel 9 de PHPStan

**Decision**: todo el código nuevo se escribe para el nivel 9 sin baseline ni `@phpstan-ignore`: las filas entran por registros (`RunRow::fromRow`, `RunProgress::fromRow`) con `RowFields` de C2, que ya estrecha `mixed`; las respuestas del ejecutor entran por `ExecutorResult::fromPayload`, que valida cada campo y devuelve `null` si no es un resultado; los estados, motivos y lenguajes son enums; las listas tipadas (`list<…>`) se arman con `foreach`, como en C6 (R14); las fechas son `CarbonImmutable`.

**Rationale**: la hoja de ruta lo pide para el código de B2 desde C6. `RowFields` vive en `App\Content\Record` y B2 la usa tal cual: moverla a un espacio compartido es un cambio posible después, y no vale una tarea.

## R20. PHP-FPM y el buffer pool de MySQL

**Decision**: B2 no los ajusta. Los difiere hasta que lo pida una medición: el check de SC-012 informa la latencia con un aula simulada, y los avisos `max_children` de FPM en los logs son el segundo disparador. Los valores del ADR 0006 §9, para cuando se haga: `pm=dynamic`, `max_children` entre 12 y 16 y `pm.max_requests` 500; `mem_limit` y `pids_limit` de `php` acordes; `innodb_buffer_pool_size` de 1 a 2 GiB.

**Rationale**: la spec de C3a le deja el ajuste a B2 «salvo que una medición lo exija», y la de B2 no lo pedía. El polling de un aula (unos 30 clientes cada 0,3 a 2 s, de 10 a 20 ms de PHP cada pedido) cabe en los 5 hijos que trae hoy, y B2 suma 4 workers que no son FPM. Ajustar sin medir es el tipo de cambio que el proyecto pide no hacer por anticipado. Es una decisión del usuario si se prefiere adelantarlo: son dos archivos y una prueba de humo.

## R21. Las descargas

Sin Composer ni npm: B2 no agrega paquetes (FR-049). Lo que sí se baja, y con qué tamaño, está en «Descargas y permisos» de [plan.md](./plan.md). El método: los tamaños de las imágenes salen de la API pública de Docker Hub (`hub.docker.com/v2/repositories/library/<imagen>/tags/<etiqueta>`, tamaño comprimido de la imagen `linux/amd64`) y los de los paquetes, de `pkgs.alpinelinux.org`: son metadatos, no descargas. Tres de las cuatro imágenes que el Dockerfile fija por digest (`golang`, `alpine` y `php`) tienen hoy en el registro ese mismo digest; `rust:1.99-slim` no: la etiqueta se reconstruyó el 2026-10-04 y apunta a `0952c7a4…`, mientras el Dockerfile fija `01dd4f9c…`, así que su tamaño es una estimación (el de la etiqueta de hoy). Como B1 ya corrió en esta máquina, probablemente las imágenes ya estén en el daemon: el primer paso de la tarea es inspeccionarlas (`docker image inspect`) **antes** de pedir permiso, y pedirlo sólo por las que falten.

## R22. Con C4: el usuario de MySQL del worker, el binlog y la IP

**Decision**:

- **Usuario de MySQL.** El código de B2 no nombra una conexión ni un usuario: usa la conexión por omisión que cada servicio lee de su entorno (`DB_USERNAME` y `DB_PASSWORD`). `worker-runs` recibe esos dos valores de `RUNS_DB_USERNAME` y `RUNS_DB_PASSWORD` y, si no están, los de la aplicación: C4 puede darle su propio usuario sin tocar código ni `config/database.php`. B2 no crea el usuario ni los grants (son de C4), y deja anotado qué toca cada servicio en «Lo que B2 le deja a C4» de [plan.md](./plan.md).
- **Binlog.** B2 no configura `binlog_expire_logs_seconds` ni `binlog_row_image` (FR-038 de C4).
- **IP.** B2 no limita por IP: sus límites son por cuenta (las cuotas y `throttle:runs-submit`, cuya clave es el id de la cuenta). El límite por IP de `/api/runs` es el de Nginx (C3a). Si B2 llegara a necesitar la IP, usaría `$request->ip()`, que con `trustProxies` vacío es `REMOTE_ADDR` (FR-026 y FR-027 de C4): la misma fuente que C3a.

**Rationale**: la spec 008 de C4 propone usuarios de MySQL por rol (`app`, `runs`, `mail`, `migrate` y `backup`) y la IP de `REMOTE_ADDR`. Todavía no tiene clarify, así que son supuestos de B2: ninguno cambia lo que B2 construye, y los tres quedan cubiertos con no asumir nada.
