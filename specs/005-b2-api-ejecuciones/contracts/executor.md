# Contrato con el ejecutor de B1, como lo consume B2

**Fecha**: 2026-10-05 | **Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md) | **Investigación**: [research.md](../research.md), R8 y R9

B2 consume el ejecutor sin cambiarlo (Q2). Este archivo fija qué le pide, cómo lee cada respuesta y los plazos que ordenan al worker, al cliente HTTP y al ejecutor. Fuentes, leídas al planificar: `backend/executor/AGENTS.md`, `backend/executor/internal/api/server.go`, `backend/executor/cmd/executor/main.go`, `backend/executor/internal/sandbox/{types,profile,runner}.go` y `backend/executor/internal/output/limited.go`, más la enmienda «Para quien consume el ejecutor (B2)» del [ADR 0005](../../../docs/adr/0005-ejecucion-en-sandbox-propio.md). Cubre FR-013 a FR-018 y FR-045.

## El pedido

`POST ${EXECUTOR_URL}/v1/run` (por defecto `http://executor:8080`), con:

- `Authorization: Bearer ${EXECUTOR_TOKEN}` (el ejecutor exige al menos 32 bytes);
- `Content-Type: application/json` y el cuerpo `{"language": "rust" | "go", "program": "<texto armado>"}`.

El ejecutor rechaza campos desconocidos. Acepta un programa de hasta 128 KiB (131.072 bytes) y un cuerpo de hasta 1 MiB (el JSON escapado puede ocupar hasta seis veces el programa). Con el código de hasta 64 KiB, la prueba propia de hasta 3.000 caracteres, las pruebas del ejercicio (la mayor expresión de hoy pesa 878 bytes) y la plantilla, el programa armado pesa como mucho unos 83 KiB: cabe holgado. Nunca viaja una imagen, un flag ni un límite: salen del lenguaje.

`GET /healthz` responde `ok` y es sólo liveness: no consulta Docker.

## La respuesta válida (200)

```json
{
  "phase": "run",
  "exitCode": 0,
  "stdout": "…",
  "stderr": "…",
  "truncated": false,
  "timedOut": false,
  "oomKilled": false,
  "compileMs": 412,
  "runMs": 31
}
```

- `phase` es `compile` (el programa no llegó a ejecutarse: falló, se pasó de tiempo o de memoria al compilar) o `run` (compiló y se ejecutó).
- Si `phase` es `compile` y todo salió bien, el ejecutor sigue y responde con `phase` `run`: una respuesta con `phase` `compile` y `exitCode` 0 no existe.
- En `run`, `stderr` suma los avisos de compilación y el `stderr` de la ejecución; `stdout` es sólo el de la ejecución. `truncated` es el OR de los cuatro flujos. Cada flujo conserva su **principio** (hasta 65.536 bytes de UTF-8 válido; con bytes inválidos reemplazados por U+FFFD puede pasar) y descarta el resto.
- `compileMs` y `runMs` incluyen el arranque del contenedor; `runMs` es 0 si no se llegó a ejecutar.

Un 2xx cuyo cuerpo no es un JSON con exactamente esos nueve campos y tipos (`phase` en `compile` o `run`, `exitCode` entero, `stdout` y `stderr` texto, `truncated`, `timedOut` y `oomKilled` booleanos, `compileMs` y `runMs` enteros no negativos) **no es un resultado válido**.

## Qué hace el worker con cada respuesta

El criterio es una sola pregunta: ¿pudo haber corrido el código del alumno? Si pudo, nunca se reintenta solo (FR-013 y FR-017).

| Respuesta | Pudo haber corrido | Acción del worker |
| --- | --- | --- |
| 200 con un resultado válido | Sí, corrió | Clasifica ([harness-template.md](./harness-template.md), «La clasificación») y cierra |
| 503 (el ejecutor siempre manda `Retry-After: 1`) | No: estaba ocupado o apagándose | Reencola con la espera indicada (acotada a 1–30 s), sin gastar la única vez del trabajo (FR-016) |
| Conexión rechazada o nombre que no resuelve (errno de cURL 7 o 6), por ejemplo mientras el ejecutor reinicia | No | Igual que el 503 |
| 500 | Sí: falló el sandbox | `infra_error`, motivo `executor_error`, sin reintento |
| Conexión que se corta, vacía o con un reset; plazo vencido (el cliente espera 100 s) | Sí | `infra_error`, motivo `executor_error` |
| 2xx con un cuerpo que no es un resultado válido | Sí | `infra_error`, motivo `executor_error` |
| 400, 413 o 401 | No, pero es un error nuestro (pedido mal armado o token equivocado) | `infra_error`, motivo `executor_error`, y un error en el log: es un defecto de configuración, no del alumno |
| Cualquier otro | Se asume que sí | `infra_error`, motivo `executor_error` |

Sólo hay dos pruebas positivas de «no corrió»: un 503 o un errno de conexión 6 o 7. Un `ConnectionException` de Laravel no alcanza: también lo lanzan un plazo vencido y una respuesta vacía, que **sí** pueden haber corrido, así que el worker mira el errno del error de Guzzle que trae adentro (`ConnectException::getHandlerContext()['errno']`). Sin esa prueba, el caso se trata como «pudo haber corrido». Al apagarse, el ejecutor responde 503 a los pedidos que esperaban lugar y 500 a los que ejecutaban.

## Los plazos y su orden

Ninguno de los plazos de más arriba en la cadena puede vencer antes que uno de más abajo, o se daría por perdido un trabajo que sigue corriendo (FR-013). Una prueba de configuración (`RunsConfigTest`) comprueba el orden con los valores de `config/runs.php` y `config/queue.php`.

| Plazo | Valor | Dónde vive |
| --- | --- | --- |
| Espera de un slot dentro del ejecutor | 30 s | `queueWait`, `cmd/executor/main.go` |
| Compilar | Rust 20 s, Go 15 s | `internal/sandbox/profile.go` |
| Ejecutar | 10 s | `internal/sandbox/profile.go` |
| Limpieza de contenedores y volumen | hasta 10 s por paso | `cleanupTimeout`, `runner.go` |
| `WriteTimeout` del ejecutor (corta la respuesta) | 90 s | `cmd/executor/main.go` |
| Cliente HTTP del worker | 100 s, con 5 s para conectar | `runs.executor.request_timeout` y `connect_timeout` |
| Tiempo máximo del trabajo (PCNTL lo hace cumplir) | 120 s | `#[Timeout(120)]` y `--timeout=120` |
| `retry_after` de la conexión `runs` | 140 s | `config/queue.php` |
| Vencimiento de una ejecución `running` | 140 s (la reserva del trabajo) | `runs.expiry.running_seconds` |
| Vencimiento de una ejecución `queued` | 600 s desde la aceptación | `runs.expiry.queued_seconds` |
| `stop_grace_period` de `worker-runs` | 150 s: más que el tiempo del trabajo, para que un despliegue lo deje terminar | `docker/compose.yaml` |
| `stop_grace_period` del ejecutor | 45 s (el ejecutor pide 40 o más) | `docker/compose.yaml` |

El orden que se comprueba: 90 < 100 < 120 < 140, y 140 ≥ el vencimiento de `running`, y 150 > 120. La espera de un slot (30 s) más compilar (20 s), ejecutar (10 s) y limpiar suma unos 70 s en el peor caso: el `WriteTimeout` de 90 s lo cubre con margen.

## Configuración

| Variable | Quién la lee | Valor por omisión | Nota |
| --- | --- | --- | --- |
| `EXECUTOR_TOKEN` | `executor` y `worker-runs`, sólo ellos | — (obligatoria; la agrega `init-env.sh`) | Nunca en `php`, `scheduler` ni `migrate` |
| `EXECUTOR_URL` | `worker-runs` | `http://executor:8080` | |
| `EXECUTOR_RUNTIME` | `executor` y `worker-runs` | `runsc` | `runc` sólo en desarrollo; el worker lo usa para distinguir `pids_limit` |
| `EXECUTOR_MAX_CONCURRENT` | `executor` (slots) y Compose (réplicas de `worker-runs`) | 4 | De 1 a 8; tantos workers como slots (FR-014) |
| `EXECUTOR_RUST_IMAGE`, `EXECUTOR_GO_IMAGE` | `executor` | `taller-sandbox-rust:local` y `taller-sandbox-go:local` | El ejecutor no arranca si faltan |
| `EXECUTOR_DOCKER_GID` | Compose (`group_add` del ejecutor) | — (obligatoria; la agrega `init-env.sh`) | El GID numérico del socket de Docker del host |
| `EXECUTOR_INSTANCE` | `executor` | `servicio` | Una instancia por proceso: un segundo ejecutor con el mismo nombre barrería los contenedores del primero |

## El doble de las pruebas

Las pruebas de Pest no levantan el ejecutor: lo reemplazan con `Http::fake` a nivel del cliente HTTP, con las respuestas de este contrato (un 200 por cada fila de la clasificación, el 503, el 500, el cuerpo inválido, la conexión rechazada con errno 7, el reset y el plazo vencido). Un doble no prueba el sandbox: eso lo hacen el check de punta a punta con el ejecutor real (T018) y la integración de B1 con runc y runsc.
