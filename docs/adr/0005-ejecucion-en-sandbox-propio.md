# ADR 0005 — Ejecución de código en un sandbox propio

- Estado: aceptada (aprobada por el usuario el 2026-10-04)
- Fecha: 2026-10-03
- Relacionado: ADR 0004 (backend Laravel y MySQL). Reemplaza el uso de los Playgrounds
  públicos.

## Contexto

Hoy el navegador arma el programa completo: el código del alumno más el harness de
`buildProgram` en `lab.js`. Lo envía en una petición sincrónica de hasta 60 s:

- a `play.rust-lang.org/execute` (stable, debug, edition 2024);
- a `play.golang.org/compile` (versión 2, con `go vet`).

Eso implica:

- depender de servicios de terceros con límites de uso, por lo que no se puede auditar el
  currículo en masa;
- ejecutar Go con un tiempo simulado;
- que el navegador decida qué pruebas manda.

El usuario decidió:

- ejecutar en el backend con un flujo asincrónico;
- elegir libremente el lenguaje del sandbox;
- exponer el taller en Internet con certificado propio (ADR 0004).

**Host:**

- systemd 259;
- Docker 29.8 con runc;
- cgroup v2 únicamente (sin `CONFIG_MEMCG_V1`);
- `/dev/kvm` disponible;
- 16 núcleos y 27 GB de RAM.

El 2026-10-03 se investigaron motores existentes, primitivas de aislamiento y patrones
asincrónicos (ver «Alternativas»).

## Decisión

### 1. Ejecutor propio en Go

`executor/` es un servicio HTTP interno, sincrónico y sin estado. La asincronía vive en
Laravel.

- **Acceso:**
  - es el único componente con acceso al socket de Docker;
  - vive sólo en la red interna de Compose y exige un token compartido con Laravel.
- **API fija:**
  - `POST /v1/run {language, program, profile}`;
  - devuelve `{phase, exitCode, stdout, stderr, truncated, timedOut, oomKilled,
    compileMs, runMs}`;
  - nunca acepta imágenes, flags ni límites desde la petición: los perfiles viven en su
    configuración.
- **Control:**
  - impone los plazos con su propio reloj y mata el contenedor;
  - trunca las salidas;
  - etiqueta los contenedores y barre los huérfanos.
- **Por qué Go:** Docker tiene SDK oficial para Go, el Playground oficial de Go usa el mismo
  patrón y el servicio cabe en unos cientos de líneas con pruebas propias.

### 2. Aislamiento

Cada envío corre en un contenedor efímero que compila y ejecuta. La compilación también
ocurre dentro del sandbox.

- **Flags del contenedor:**
  - `--runtime=runsc` (gVisor) y `--network=none`;
  - `--cap-drop=ALL` y `--security-opt no-new-privileges`;
  - usuario 65534;
  - `--read-only` con un tmpfs `/work` (exec, nosuid, tamaño acotado);
  - `--pids-limit`, memoria sin swap, `--cpus` y `--ulimit`.
- **`daemon.json`:** `runtimeArgs: ["--network=none"]` como defensa en profundidad.
- **Imágenes propias, fijadas por digest:**
  - Rust estable con edition 2024;
  - Go con `GOCACHE` precalentado y `CGO_ENABLED=0 GOTOOLCHAIN=local GOPROXY=off`.
- **Prerrequisito del host, que hace el usuario:**
  1. instalar `runsc`;
  2. correr `sudo runsc install` y recargar Docker;
  3. pasar una prueba de humo que confirme, con el driver de cgroups systemd, que se
     aplican los límites de memoria y de procesos. Si `/dev/kvm` está disponible, usar la
     plataforma KVM.
- **Si la prueba falla:** contenedores endurecidos con runc, detrás del login. Se registra
  como riesgo aceptado: un escape del kernel compartido llegaría al host.

### 3. Flujo asincrónico en Laravel

- **Envío.** `POST /api/runs {clientRunId, exerciseId, code, customTest}` responde
  `202 {id, status: "queued"}`.
  - Es idempotente por `clientRunId` (UUID): el mismo código devuelve el mismo run y un
    código distinto responde 422.
- **Cola.** `runs`, con driver `database`. El job usa:
  - `tries = 1`: nunca reejecuta código sin una acción del alumno;
  - un timeout mayor que el del ejecutor, y `retry_after` mayor que ambos;
  - `failed()`, que marca `infra_error`.
- **Consulta.** El navegador consulta `GET /api/runs/{id}` con espera creciente, de
  0,3 s a 2 s, hasta un estado terminal. `POST /api/runs/{id}/cancel` cancela.
- **Estados.**
  - En curso: `queued`; `running`, con fase `compiling` o `executing`.
  - Finales: `passed`, `failed`, `compile_error`, `runtime_error`, `timeout`,
    `infra_error` y `canceled`.
  - `reason` detalla el resultado: `oom`, la señal, `output_limit` o `evidence_invalid`.
  - Un barrido pasa a `infra_error` los runs vencidos.
- **Registro.** Cada run terminado queda como intento (`attempts`, ADR 0004) con el
  `grading_hash` vigente. Un `infra_error` o un `canceled` no cuentan como intento fallido.

### 4. Composición del programa en el servidor

- El navegador manda el ID del ejercicio, su código y su prueba propia, nunca las pruebas.
- Laravel arma el programa con las pruebas guardadas en MySQL y un nonce por ejecución.
- La plantilla de harness de cada lenguaje vive en el repo como contenido y viaja en
  `curriculum.json`. El navegador la usa para la vista previa y Laravel para ejecutar.
- Un fixture compartido verifica que los dos renderizadores producen el mismo texto, para
  que los números de línea del compilador coincidan con la vista previa.

### 5. Evidencia

- Los marcadores son `__TALLER_TEST__<nonce>:<id>:<PASS|FAIL>`, con un sentinela final que
  lleva el conteo.
- Laravel exige exactamente los IDs esperados, una vez cada uno, el sentinela y exit 0.
- Esto evita errores y marcadores copiados, pero NO a alguien que quiera hacer trampa: el
  código del alumno corre en el mismo proceso que el harness y puede imprimir lo que
  quiera. Para un solo usuario es aceptable.
- Un veredicto inviolable exigiría comparar salidas fuera del sandbox con valores que
  nunca entran en él. Queda fuera de alcance.

### 6. Límites iniciales

Son configurables y nunca vienen en la petición.

| Límite | Compilar | Ejecutar |
|---|---|---|
| Tiempo de reloj | Rust 20 s, Go 15 s | 5–10 s |
| Memoria sin swap | 1 GiB | 256 MiB |
| Procesos | 256 | 64 |
| CPU | 2 | 1 |
| Salida | 64 KiB de diagnósticos | 64 KiB por stream, con marca de truncado |

- **Concurrencia:** de 3 a 4 runs simultáneos en total, y 1 o 2 activos por usuario.
- **Tamaño del código:** como máximo 64 KiB.

### 7. Anti-abuso

- Sólo pueden ejecutar los usuarios autenticados (ADR 0004).
- Nginx aplica `limit_req` y `client_max_body_size` acotado en la ruta, y Laravel aplica
  `throttle`.
- Hay un tope de cola global: más allá responde 503 con `Retry-After`.

### 8. Compatibilidad y aceptación

- Las toolchains equivalen a las de los Playgrounds: Rust estable, edition 2024 y modo
  debug; Go actual con `go vet`.
- El tiempo pasa a ser real; el Playground de Go lo simula. Hay que revisar los usos de
  `time.Sleep` en el contenido; hoy hay uno.
- **Criterio de aceptación:** en el ejecutor local, todas las soluciones de referencia
  aprueban y todos los códigos iniciales fallan.
- La auditoría completa pasa a ser local, así que deja de aplicar la restricción de no
  enviar el currículo en masa a los Playgrounds públicos.

## Alternativas consideradas

- **Judge0 CE:**
  - exige cgroup v1, imposible con systemd 259;
  - corre en contenedores privileged;
  - la instalación propia trae Rust 1.40 y Go 1.13;
  - tuvo escapes del sandbox en 2024 (CVE-2024-28185 y otros).
- **Piston y go-judge:** sus contenedores son privileged; Piston casi no se mantiene y trae
  toolchains viejas.
- **Codapi:**
  - es viable con gVisor;
  - no devuelve el código de salida ni tiene autenticación;
  - registra `/debug/pprof` y monta un directorio del host.
- **Self-hostear los Playgrounds oficiales:** cada uno cubre un solo lenguaje, y el de Go
  está atado a Google Cloud.
- **glot docker-run:** aplica gVisor a todo el daemon y no tiene `pids-limit`.
- **nsjail o isolate directos:** dentro de un contenedor exigen privilegios, y en el host
  piden unidades systemd propias.
- **Firecracker:** da el máximo aislamiento con un costo operativo desproporcionado para un
  solo usuario.

## Consecuencias

- **Fin de los Playgrounds públicos.** Se retira la dependencia de `play.rust-lang.org` y
  `play.golang.org`, y la CSP los quita de `connect-src`.
- **Cliente nuevo.** `src/shared/api/playground` se reemplaza por un cliente de
  `/api/runs`.
- **Mantenimiento propio:**
  - el ejecutor es código propio, con pruebas;
  - gVisor saca releases semanales, por ejemplo con la corrección de CVE-2026-96812;
  - las imágenes base también hay que actualizarlas.
- **Latencia a medir con runsc:** se espera una mediana de 1,5–3 s.
- **Imágenes comprimidas:** `rust:1.99-slim` pesa unos 330 MB y `golang:1.27-alpine`,
  unos 75 MB.

## Fases

Se insertan en el plan del ADR 0004, después de importar el contenido a MySQL:

1. **Ejecutor:** el ejecutor y sus imágenes, con pruebas propias, más la prueba de humo de
   gVisor en el host. Puede empezar antes, porque no depende del contenido.
2. **API asincrónica:** `/api/runs`, cola, worker, composición y verificación de evidencia.
3. **Laboratorio:** el laboratorio pasa a `/api/runs`, con vista previa desde la plantilla
   compartida.
4. **Auditoría local:** de todas las soluciones y los códigos iniciales.

## Fuentes

- [gVisor: seguridad](https://gvisor.dev/docs/architecture_guide/security/), [instalación](https://gvisor.dev/docs/user_guide/install/), [systemd y cgroup v2](https://gvisor.dev/docs/user_guide/systemd/)
- [Go Playground: sandbox](https://github.com/golang/playground/blob/master/sandbox/sandbox.go)
- [Rust Playground: coordinator](https://github.com/rust-lang/rust-playground/blob/main/compiler/base/orchestrator/src/coordinator.rs)
- [Judge0: releases y advisories](https://github.com/judge0/judge0/releases)
- [Codapi](https://github.com/nalgeon/codapi)
- [Exercism: interfaz de test runners](https://exercism.org/docs/building/tooling/test-runners/interface)
- [Docker: seguridad del daemon](https://docs.docker.com/engine/security/), [OWASP: Docker](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Laravel 13: colas](https://laravel.com/docs/13.x/queues)
- [Stripe: peticiones idempotentes](https://docs.stripe.com/api/idempotent_requests)
