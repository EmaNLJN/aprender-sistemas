# Investigación: B3 · Auditoría local del currículo

**Fecha**: 2026-10-28 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Las decisiones técnicas del plan, con sus alternativas, la tabla de consultas de documentación y lo que se midió sin Docker de escritura ni descargas. Cada decisión lleva un número (R1…) que el plan cita.

## Cómo se verificó al planificar

Se planificó en el worktree `plan-b3` (rama `plan/b3-auditoria`, desde `master` en `dd870a9c`), sin tocar código de producción, sin levantar el stack y sin descargar nada. Corrió de verdad:

- **El generador en memoria**, desde el checkout principal en el mismo commit (`dd870a9c`, con su `node_modules`): `loadCurriculumSource` y `curriculumMeta` dieron `documentHash` `4555e8500e6ef5bd38cdaf46010d3f14e3345d7ec0c69aea983acfe67f62fbb6` y `portions.harness` `6a86d9fef4cbeebd95703a6e239f08d885071dc7a122a7ca25883d953457a6fa`. Es la cuenta que hace el check del resumen en la CI (R11).
- **Una salvedad sobre dónde corrió:** el script de medición del generador se copió como `.measure-b3.ts` en la raíz del checkout principal (`/home/emanuel/workflow/aprender-sistemas`, en `dd870a9c`), para usar su `node_modules`; se corrió con Node, sólo leyó, y se borró enseguida. No quedó nada en ese árbol.
- **El contenido de hoy:** 274 ejercicios activos (100 del recorrido, 12 de campaña y 25 núcleos por lenguaje), 137 por lenguaje; `kind`: Rust 120 `completar` y 17 `reparar`, Go 79 y 58. El código más largo, el de referencia o el inicial, tiene 1 545 caracteres. Ningún código usa `time.Sleep` ni `thread::sleep`.
- **El caché de Go:** 49 ejercicios de Go declaran `imports`, con 26 paquetes en total; `warm/main.go` importa 27 (los 26 más `fmt`): 0 faltan. Coincide con la línea de base de la spec.
- **`rust-63` y `rust-71` con `rustc` 1.97.1 del host** y la plantilla real de `content/harness/rust.tpl` (renderizada con un script descartable, nonce de ceros): los iniciales de hoy dan E0277 y SIGABRT (código 134), como dice la spec; las soluciones dan 3 de 3 `PASS`; y las dos remediaciones de R17 compilan y dan 3 de 3 `FAIL` con la evidencia completa.
- **La muestra de la prueba propia (R15)** con `rustc` 1.97.1 y `go` 1.27.2 del host: las cuatro expresiones dan lo esperado (`custom:PASS` dos veces y `custom:FAIL` dos veces, con las tres pruebas del ejercicio en `PASS`).
- **El host, sólo lectura:** `docker image inspect` y `docker info`. Están `taller-sandbox-rust:local` (`sha256:f525ccf76aec49d19b686a8d4cff8baad441ef2f30a0688c74d1a3905c17c356`, construida el 2026-10-04) y `taller-sandbox-go:local` (`sha256:e66df8bf3b16022cc6426093be100ba59c09e2eaff9b88d492166e35f0a756b7`, del 2026-10-06), y también las bases por digest (`rust:1.99-slim`, `golang:1.27-alpine`, `alpine:3.24`, `php:8.5-fpm-alpine`, `composer:2.10` y `mysql:9.7`). Docker tiene registrado `runsc` (`/usr/bin/runsc`, `release-20261019.0`, con `--network=none`). **No hace falta ninguna descarga**: la acción del usuario de la spec («confirmar que las imágenes y runsc siguen en el host») queda hecha.

- **El TypeScript del plan, en una copia descartable:** `qa/lib/audit-surface.ts`, `qa/lib/audit-summary.ts` y `qa/lib/go-warm-cache.ts`, sacados tal cual del plan, con `qa/audit-summary-check.ts` sin el escenario 14 (que necesita el generador): 13 de 13 escenarios pasan. `warmPackages` lee los 27 paquetes del `warm/main.go` real. El ejemplo del informe de data-model.md es JSON válido y sus totales, márgenes, cocientes y medianas cierran.

**Sin ejecutar:** todo el PHP, el YAML de Compose, el workflow, la entrada `qa/curriculum-audit.ts`, la línea de comandos del check y los checks de Compose y del caché de Go son referencia. Las firmas, los contratos y las pruebas son lo que obliga; el cuerpo lo ajusta quien implemente hasta que pasen las pruebas, Pint y PHPStan en el nivel 9. Lo que sólo se mide con Docker y gVisor (la duración de la corrida completa, el reparto real de tiempos y los avisos) queda para la entrega (T016, SC-005).

## Consultas de documentación

El primer servidor de Context7 agotó su cuota después de seis consultas; las siguientes fueron por el segundo servidor de Context7 (indicado como «Context7, segundo servidor»). Dos lecturas de código fuente de Laravel no están en Context7 y se hicieron con `WebFetch` en GitHub; se dice en la columna «Fuente».

| Librería y versión del proyecto | Fuente | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| Laravel v13.34.0 (`composer.lock`) | Context7 `/laravel/docs` (13.x) | Probar comandos: `artisan()`, `expectsOutputToContain`, `assertExitCode`; opciones de arreglo `{--id=*}` | Existen tal cual. Laravel 13 también admite `#[Signature]`, pero el proyecto usa la propiedad `$signature` (`ImportContent`, `SweepRuns`): el comando sigue esa forma | No |
| Laravel v13.34.0 | Context7 `/laravel/docs` (13.x) | `Http::fake` con un closure por pedido, `preventStrayRequests`, `failedConnection`, `assertSentCount` | Un closure recibe el `Request` y devuelve la respuesta: el doble del ejecutor de la auditoría (T007, T010) lo usa para leer el nonce del programa | No |
| Laravel v13.34.0 | Context7 `/laravel/docs` (13.x) | `Sleep::fake`, `Sleep::assertSequence`, `assertNeverSlept` | Las esperas entre rondas (R5) se prueban sin dormir | No |
| Laravel v13.34.0 | Context7, segundo servidor, `/laravel/docs` (13.x); y la página oficial (`laravel.com/docs/13.x/http-client`) por `WebFetch` | `Http::pool` | Acepta `concurrency:` (el máximo de pedidos en vuelo) y, ante un fallo de conexión, deja en el resultado una `ConnectionException` en lugar de lanzarla. No se puede encadenar con opciones: se configuran en cada pedido del pool | Sí: R4 |
| Laravel v13.34.0 | Código de `Illuminate/Http/Client/Factory.php` (rama 13.x), por `WebFetch` | `Http::failedConnection()` y el manejador de los fakes | `failedConnection()` devuelve un closure que rechaza el pedido con una `ConnectException` cuyo mensaje por omisión es el errno 6: B2 lo leería como «no llegó». El manejador de los fakes resuelve closures anidados y no atrapa excepciones | Sí: el doble usa `connectionFails()` con su propio mensaje (T007) |
| Laravel v13.34.0 | Documentación oficial (`laravel.com/docs/13.x/concurrency`) y el código de `ProcessDriver` (rama 13.x), por `WebFetch` | `Concurrency::run` | El driver `process` serializa cada closure en la variable de entorno `LARAVEL_INVOKABLE_CLOSURE` y sólo pone plazo si se lo pasan. Un closure con 138 programas pasa del tope de una variable de entorno en Linux (128 KiB), y los `Http::fake` no cruzan procesos | Sí: se descarta (R4) |
| Pest v5.3.0 (`composer.lock`) | Context7 `/pestphp/pest` (v5.3.3) | Datasets con nombre (`->with([...])`), `toMatchArray` | Sin cambios respecto de lo que usa B2: un dataset por fila de la tabla de decisión | No |
| pest-plugin-arch v5.0.0 | Context7 `/pestphp/pest-plugin-arch` | `arch()->expect(...)->not->toUse([...])`, `ignoring` | Igual que la `PurityTest` de B2 | No |
| PHPStan 2.2.17 y Larastan 3.12.3 | Context7, segundo servidor, `/phpstan/phpstan` | Nivel 9 y cómo se angosta un tipo | Sólo se puede pasar un `mixed` explícito a otro `mixed`; se angosta con `is_string` o `is_array` antes de usarlo. El nivel 10 existe (también el `mixed` implícito), pero el proyecto fija el 9. El plan narra todo `mixed` (las opciones de Artisan, `DB::scalar`, `json_decode`) con `is_string`, `is_array` o `in_array(..., true)`, como `ImportLock` | No |
| GitHub Actions | Context7 `/websites/github_en_actions` | `pull_request`: tipos de actividad, `GITHUB_SHA`, `head.sha` | Por omisión corre con `opened`, `synchronize` y `reopened`; `edited` hay que pedirlo. `GITHUB_SHA` es el commit de fusión: la cabeza del PR es `github.event.pull_request.head.sha`. No corre si el PR tiene conflictos | Sí: R11 |
| GitHub Actions | Context7 `/websites/github_en_actions` | Inyección por el cuerpo del PR | `github.event.pull_request.body` es entrada no confiable: va por una variable de entorno intermedia, nunca dentro del script | Sí: R11 |
| Docker Compose (el del host) | Context7, segundo servidor, `/websites/docker_compose`; y la referencia de `docker compose run` (`docs.docker.com`) por `WebFetch` | `run` (`--rm`, `-T`, `--no-deps`), perfiles y rutas relativas con `include` | Nombrar un servicio de un perfil en `run` lo activa y arranca sus `depends_on` (que tienen que estar en el mismo perfil o sin perfil); el resto del perfil queda abajo. Con `include` y `project_directory: .`, una ruta relativa como `./qa/curriculum-audit` se resuelve desde la raíz | No: confirma R6 y R9 |
| gVisor | No se consultó | — | B3 no configura gVisor: usa el runtime ya registrado (medido arriba) | — |

**Hallazgos de las consultas:** ninguna API que la spec supone falta en estas versiones. Tres detalles cambian el diseño: `Concurrency::run` no sirve para mandar cientos de programas (R4); el disparador `edited` tiene que ir en un workflow aparte (R11); y `Http::failedConnection()` simula un errno 6, así que no sirve para probar una conexión cortada (T007). Una cosa no se pudo confirmar en la documentación y la fija una prueba: que la `ConnectionException` de un pedido del pool conserve el errno de cURL, que B2 usa para saber que un pedido no llegó (T002, «Review Focus» 2).

## Decisiones

### R1. El comando y su entrada

**Decisión.** Un comando de Artisan, `curriculum:audit`, en `backend/api/app/Console/Commands/AuditCurriculum.php`, con sus clases en un módulo nuevo, `backend/api/app/Audit/`. La entrada es `npm run api:audit` (`node qa/curriculum-audit.ts`), que toma los sellos del host, levanta la instancia propia, corre el comando en un contenedor de un solo uso con la imagen de la API, la apaga y escribe el resumen.

**Alternativas.** Un script de Node con un segundo renderizador (la spec lo descarta: no es lo que corre el alumno); un trabajo en la cola (escribe `jobs`, contra FR-012); una ruta HTTP (necesitaría una cuenta y abre una superficie que nadie pidió).

### R2. Cómo lee el contenido

**Decisión.** `AuditCatalogReader` lee, en una sola `ContentSnapshot` (la transacción de sólo lectura de C2), la última importación, las dos plantillas, los ejercicios activos de los dos lenguajes (con `starter`, `solution`, `kind`, `catalog` y `domain`) y sus pruebas activas con la etiqueta. Arma con eso los mismos `ExerciseSnapshot` de B2. Una prueba compara cada `ExerciseSnapshot` con el de `ExerciseReader::forRun` (T004) y otra compara el programa armado con el que armaría B2 con el mismo nonce (T005).

**Alternativas.** Llamar 274 veces a `ExerciseReader::forRun`: son 274 instantáneas distintas, y tampoco lee `starter` ni `solution`, así que haría falta otra consulta igual. Cambiar `ExerciseReader`: toca la admisión de B2 sin necesidad.

### R3. El contenido importado tiene que ser el de la imagen

**Decisión.** Antes de auditar, el comando compara el `documentHash` de la última importación con el del meta de la imagen (`ContentSource::fromDirectory(config('content.path'))`, que además verifica el trío de archivos). Si difieren, se niega a arrancar: los programas saldrían de un contenido y los sellos dirían otro. Sin importación, también se niega (FR-013).

**Por qué.** La entrada construye la imagen del comando desde el árbol actual (`run --build`), pero el contenido lo importó el `migrate` del último `up`. Sin la guardia, una corrida de diez minutos terminaría con un resumen que la CI rechaza por la huella del documento.

### R4. La concurrencia: `Http::pool` con el cliente de B2

**Decisión.** Los programas se mandan por tandas con `Http::pool(..., concurrency: N)`, donde N es la cantidad de lugares de la instancia (`AUDIT_CONCURRENCY`, de 1 a 8, 4 por omisión). Para que la URL, el token, los plazos y la lectura de cada respuesta sean los de B2, `ExecutorClient` se refactoriza sin cambiar su comportamiento: `send()` queda igual por fuera y pasa a usar tres piezas públicas, `prepare(PendingRequest)`, `body(RunLanguage, string)` y `read(Response|ConnectionException)`. La auditoría usa las mismas tres sobre los pedidos del pool. `ExecutorClientTest` no se toca y es la red del refactor.

**Alternativas.**

- `Concurrency::run` con el driver `process`: cada closure viaja en una variable de entorno (tope de 128 KiB en Linux, y una tanda pesa cientos), el proceso hijo no tiene plazo por omisión y los fakes de HTTP no cruzan procesos, así que las pruebas correrían otro camino.
- Mandar de a uno con `send()`: 548 programas de a uno tardan el cuádruple y no cumplen FR-016.
- Copiar en la auditoría la lectura de las respuestas: son 25 líneas con una sutileza (el errno de cURL) que dos copias terminarían por diferir.

**Costo.** Un archivo de B2 cambia (`ExecutorClient.php`), y queda en la superficie auditada (R12).

### R5. Ocupado y no alcanzado: rondas acotadas

**Decisión.** Una tanda se manda en rondas. Lo que vuelve `Busy` (503) o `NotReached` (errno 6 o 7) no corrió: espera y vuelve en la ronda siguiente. La espera es el mayor `Retry-After` de la ronda, acotado entre 1 y 30 s (1 s para `NotReached`). Hay como mucho 10 rondas; lo que siga pendiente queda **sin veredicto**, con la causa `busy`. Todo lo demás que no es un resultado (500, conexión cortada, cuerpo inválido, 400, 401, 413) queda sin veredicto en la primera ronda, sin reintento (FR-008).

**Por qué acotar.** Con tantos programas simultáneos como lugares tiene la instancia, un 503 casi no ocurre (el ejecutor espera hasta 30 s por un lugar). El tope evita que un ejecutor que reinicia en bucle deje la corrida colgada («No espera indefinidamente»).

### R6. La instancia propia

**Decisión.** Un servicio de Compose nuevo, `executor-audit`, en el perfil `audit`: el mismo build y las mismas imágenes y perfiles que `executor`, con `EXECUTOR_INSTANCE=auditoria` (la etiqueta `taller.executor.run=auditoria`, distinta de `servicio`), `EXECUTOR_MAX_CONCURRENT=${AUDIT_CONCURRENCY:-4}`, `EXECUTOR_RUNTIME=${AUDIT_RUNTIME:-runsc}` y una red interna nueva, `audit`, que comparte sólo con el servicio `audit` (el contenedor del comando). Lo común de los dos ejecutores pasa a un ancla YAML (`x-executor-base`), así una diferencia accidental no es posible. El token es el mismo `EXECUTOR_TOKEN`: las redes ya separan las instancias, y un segundo token sólo agregaría un secreto a `init-env.sh`.

**Consecuencias.** `worker-runs` no alcanza a `executor-audit` (no está en `audit`) y `audit` no alcanza a `executor` (no está en `sandbox`). Ninguno de los dos contenedores de PHP recibe el socket de Docker. `qa/compose-runs-check.ts` cambia: el token pasa a estar en cuatro servicios.

### R7. Una corrida a la vez

**Decisión.** Dos guardas. El comando toma el candado de MySQL `concat(database(), ':curriculum-audit')` con `GET_LOCK(..., 0)`, como `ImportLock`, y se niega si está tomado (FR-013). La entrada, antes de levantar nada, mira si `executor-audit` ya corre y en ese caso se niega sin apagarlo: si no, la segunda corrida apagaría la instancia de la primera al terminar.

### R8. Los sellos del host

**Decisión.** La entrada calcula el commit (`git rev-parse HEAD`), si el árbol estaba limpio (`git status --porcelain` vacío, contando los archivos sin seguimiento: un ejercicio nuevo sin commitear también entra a la imagen) y los identificadores de las dos imágenes del sandbox (`docker image inspect --format '{{.Id}}'`). Se los pasa al comando como opciones (`--commit`, `--clean-tree`, `--rust-image`, `--go-image`), que los valida y los escribe en el JSON. Quien audita nunca recibe el socket de Docker (FR-020).

El commit de origen del contenido (`content_imports.source_commit`) también va al informe, pero hoy es `null`: Compose pasa `CONTENT_SOURCE_COMMIT` vacío al construir la imagen. Por eso el commit que vale es el del host.

### R9. Dónde queda el informe

**Decisión.** El comando escribe `report.json` y `report.txt` en `/audit`, que es `qa/curriculum-audit/` del host montado en el contenedor. El contenedor corre con el uid y el gid de quien lanza la entrada (`user: '${AUDIT_UID:-82}:${AUDIT_GID:-82}'`), así puede escribir en ese directorio sin abrir sus permisos; la entrada lo crea antes, para que Docker no lo cree como root. La entrada escribe además `summary.md`. `qa/curriculum-audit/` va a `.gitignore` y a `.dockerignore` (FR-021).

**Alternativas.** El JSON por la salida estándar: se mezcla con el progreso y los mensajes de Artisan. `docker cp`: con `--rm` el contenedor ya no existe. Un directorio con permisos 0777 en el repositorio: innecesario con el uid del host.

### R10. El resumen

**Decisión.** Un bloque cercado con la etiqueta `taller-audit-summary`, de líneas `clave: valor` con las claves en inglés, versionado por su primera línea (`format: taller-audit-summary-1`). Lo arma y lo lee un único módulo, `qa/lib/audit-summary.ts`: la entrada lo arma desde `report.json` y el check de la CI lo lee de la descripción del PR. El formato está en [contracts/audit-summary.md](./contracts/audit-summary.md).

**Alternativas.** JSON en la descripción (frágil al pegar y al editar en la web); un comentario HTML (no se ve al revisar); que lo imprima PHP (dos implementaciones de un formato que lee TypeScript).

### R11. El check del resumen en la CI

**Decisión.** Un workflow nuevo, `.github/workflows/audit-summary.yml`, con un job `audit-summary`:

- **disparador:** `pull_request` con `types: [opened, synchronize, reopened, edited]`, para que vuelva a correr al editar la descripción (FR-038);
- **checkout:** la cabeza del PR (`github.event.pull_request.head.sha`), no el commit de fusión, con `fetch-depth: 0` para tener la base;
- **cuerpo:** por la variable de entorno `PR_BODY`, nunca interpolado en el script;
- **qué corre:** `npm ci` y `node qa/audit-summary-gate.ts`, que saca las rutas con `git diff --name-only --no-renames <base>...<cabeza>` (`--no-renames` para que un archivo que sale de la superficie también cuente), decide si aplica con `qa/lib/audit-surface.ts`, recalcula `documentHash` y `portions.harness` con el generador en memoria y compara.

**Alternativas.** Un job más en `ci.yml`: con `edited`, cada cambio de la descripción volvería a correr la CI entera, y su grupo de concurrencia (`ci-${{ github.ref }}`, con `cancel-in-progress`) cancelaría la CI que estaba en curso. `pull_request_target`: corre con permisos de la base, que este check no necesita. Leer el cuerpo con la API de GitHub: pide un token sin ganar nada.

**Consecuencia.** El usuario tiene que sumar `audit-summary` a los checks obligatorios de la rama `master` (acción del usuario). Mientras tanto, el job se ve en cada PR pero no bloquea.

### R12. La superficie auditada

**Decisión.** `qa/lib/audit-surface.ts` es el único lugar de la lista (FR-032). Una entrada terminada en `/` es un prefijo; las demás, archivos exactos; los `*_test.go` no cuentan:

- **el contenido que compila:** `content/rust/`, `content/go/` y `content/harness/` (con los manifiestos, que deciden los `imports` y la etapa);
- **el generador que les da forma:** `tools/content/exercises.ts` y `tools/content/harness.ts`;
- **el sandbox:** `backend/executor/images/`, `backend/executor/internal/sandbox/` y `backend/executor/cmd/executor/main.go`;
- **lo que arma, lee y clasifica:** `backend/api/app/Runs/Program/`, `backend/api/app/Runs/Evidence/`, `backend/api/app/Runs/Admission/ExerciseReader.php`, `backend/api/app/Runs/Execution/ExecutorClient.php`, `ExecutorReply.php` y `ReplyKind.php`;
- **la auditoría:** `backend/api/app/Audit/`, `backend/api/app/Console/Commands/AuditCurriculum.php` y `backend/api/config/audit.php`.

**Fuera, a propósito:** `docker/compose.yaml` (lo tocan casi todos los ítems del backend; si un cambio suyo toca el ejecutor, la revisión lo pide), `content/campaign/`, `content/workshops/`, `content/atlas/` y `content/guide/` (textos que no compilan), y las pruebas.

### R13. El veredicto y los hallazgos

**Decisión.** `ProgramJudge` aplica la tabla de «Cómo se decide cada programa» de la spec, con siete clases de hallazgo (ver [data-model.md](./data-model.md), «La regla»). El orden: primero un límite agotado (`timeout`, motivo `oom` o motivo `pids_limit`) es `limit_exceeded`, aunque sea el inicial de un `reparar` que no compila por memoria (FR-025: agotar un límite es un hallazgo); después la regla de la solución o la del inicial.

### R14. Los límites y el aviso

**Decisión.** `config/audit.php` copia los límites del ADR 0005 (compilar: Rust 20 000 ms y Go 15 000 ms; ejecutar: 10 000 ms; memoria: 1 024 y 256 MiB) y el umbral del aviso, 0,5 (Q4). `qa/compose-runs-check.ts` compara esos números con `backend/executor/internal/sandbox/profile.go`, así no se desalinean («Review Focus» 5). El tiempo incluye el arranque del contenedor, y el informe lo dice.

**El umbral.** Lo que se sabe sin Docker: con runsc, una compilación de Go tarda alrededor de 1 s y una ejecución 0,15 a 0,2 s (enmienda B1 del ADR 0005), y B2 midió una mediana de 1,1 s por ejecución completa en reposo. La mitad de cada límite (7,5, 10 y 5 s) queda lejos. Lo confirma la medición de SC-005 en la entrega (T016): si en reposo aparecen avisos, se informa y se discute el umbral; no se mueve en silencio.

**Antes de la corrida de registro:** las imágenes del sandbox tienen tres semanas. La enmienda B1 del ADR 0005 explica que, pasados cinco días, `go build` recorta el caché precalentado y cada envío recompila la biblioteca estándar (2 a 3 s más). Por eso T016 reconstruye las imágenes antes de medir: no baja nada, porque las bases están por digest en el host.

### R15. La muestra de la prueba propia (Q5)

**Decisión.** La solución de `rust-01` con `energia(5) == 35` (pasa) y con `energia(5) == 36` (falla), y la de `go-01` con `Bytes(2) == 2048` (pasa) y con `Bytes(2) == 2049` (falla). Los valores no repiten las pruebas del ejercicio, así que la prueba propia es de verdad otra. Viven en `config/audit.php` (`custom_test_sample`). Se corren en una corrida completa y en una parcial por lenguaje; no en una parcial por ejercicios. Si el ejercicio de la muestra no está activo, el comando se niega a arrancar. Verificadas en el host (ver arriba).

### R16. El check del caché de Go

**Decisión.** `qa/go-warm-cache-check.ts`, con la lógica en `qa/lib/go-warm-cache.ts`. Lee los ejercicios de Go con `loadCurriculum` (los `imports` ya con los valores por omisión y los de su etapa, como se publican) y la lista de `warm/main.go` (el bloque `import ( … )`, con o sin `_`). Va al grupo de operación de `qa/run-checks.ts`, porque lee `backend/`, que la imagen web no tiene. Un paquete que falta falla con el ejercicio y el paquete; uno que sobra no; `fmt` no hace falta en la lista.

### R17. `rust-63` y `rust-71`

**Decisión.** Se corrigen como bugs (`/speckit-bug-assess`, `/speckit-bug-fix` y `/speckit-bug-test`), después de que la primera corrida los confirme (T017). Remediaciones medidas en el host para que el diagnóstico tenga de dónde partir:

- **`rust-63`:** la macro del inicial expande a `todo!()`, de tipo `!`. Dos formas que compilan y dan 3 de 3 `FAIL`: `let total: i32 = todo!("expandir cada expresión"); total` (diez avisos de `rustc`) o `todo!("expandir cada expresión") as i32` (siete). Las dos conservan el `todo!` de los demás iniciales.
- **`rust-71`:** el `todo!()` de `Drop` entra en pánico mientras otro pánico desenrolla. Con `fn drop(&mut self) {}` en el inicial (el `todo!("liberar primero")` queda), da 3 de 3 `FAIL` y dos avisos.

Cambian su `starter_hash` y su `content_hash`, no su `grading_hash` (spec, «Riesgos», 7).

### R18. Las enmiendas pendientes de la hoja de ruta

- **ADR 0005, §8 y «Fases»:** pasan a ser tarea de B3, del coordinador (T015). B3 es la auditoría del §8: su entrega es el momento de registrar que no queda ningún `time.Sleep` («hoy hay uno» ya no es cierto), que la auditoría es `npm run api:audit` y que la fase 4 (auditoría) va antes que la 3 (laboratorio), como decidió A4-Q5. Va como una «Enmienda (plan B3)», como la de B1, y la aprueba el usuario con el PR.
- **El usuario de sólo lectura del contenido:** queda en C4, que define los usuarios por rol. B3 deja el gancho, como `worker-runs`: `DB_USERNAME: '${AUDIT_DB_USERNAME:-taller}'`. Mientras tanto, FR-012 lo garantizan las pruebas (ninguna sentencia de escritura durante la corrida y las mismas filas antes y después) y una prueba de arquitectura.

### R19. Códigos de salida

**Decisión.** 0 si no hubo hallazgos ni programas sin veredicto (FR-017); 1 si hubo alguno; 2 (`Command::INVALID`) si se negó a arrancar (FR-013) o si una opción es inválida. Así la entrada y quien la use distinguen «el currículo tiene un problema» de «la auditoría no corrió».

## Lo que no se pudo medir sin Docker

- La duración de la corrida completa con gVisor y los tiempos por lenguaje (SC-005). Estimación de la spec: de 5 a 10 minutos con 4 lugares.
- Que el pool, con la concurrencia de la instancia, no reciba 503 en reposo.
- Que el contenedor `audit`, con el uid del host, escriba en `qa/curriculum-audit/`.
- Lo que sólo muestra el sandbox: Rust 1.99 en lugar de 1.97.1, los hilos bajo runsc contra el `--pids-limit` (candidatos: `rust-46`, `rust-47`, `rust-48`, `rust-70`, `go-41`, `go-42`, `go-45`, `go-63`, `go-64` y `go-65`) y `go-69` con el caché precalentado.

Todo eso es la verificación de la entrega (T016 y T018; [quickstart.md](./quickstart.md)).
