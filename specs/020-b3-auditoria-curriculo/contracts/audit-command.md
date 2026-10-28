# Contrato: el comando de la auditoría, su entrada y su instancia

**Fecha**: 2026-10-28 | **Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md) | **Investigación**: [research.md](../research.md), R1 y R4 a R9, R19

Cubre FR-008 a FR-017, FR-020, FR-021 y FR-026. El informe que escribe está en [data-model.md](../data-model.md); el resumen, en [audit-summary.md](./audit-summary.md).

## La entrada: `npm run api:audit`

`package.json`: `"api:audit": "node qa/curriculum-audit.ts"`. Corre en el host, desde la raíz, con el stack levantado (`docker compose up --build -d --wait`), y en un worktree con su `COMPOSE_PROJECT_NAME` en la misma línea (`backend/api/AGENTS.md`).

```text
npm run api:audit [-- [--language=rust|go] [--exercise=<id> …] [--concurrency=1..8] [--runtime=runsc|runc]]
```

| Opción | Por omisión | Qué hace |
| --- | --- | --- |
| `--language=` | los dos | Pasa al comando |
| `--exercise=` | ninguno | Se puede repetir; pasa al comando |
| `--concurrency=` | `AUDIT_CONCURRENCY` del entorno, o 4 | Lugares de la instancia y programas simultáneos del comando (FR-016) |
| `--runtime=` | `AUDIT_RUNTIME` del entorno, o `runsc` | Runtime de la instancia y de la clasificación. `runc` es sólo para desarrollo: la corrida no es de registro (FR-014) |

Pasos, en orden:

1. **Valida las opciones.** Una opción desconocida, `--concurrency` fuera de 1 a 8 o un `--runtime` que no es `runsc` ni `runc` sale con 2 y uno de estos mensajes:
   - `api:audit: opción desconocida «<opción>». Se admiten --language=, --exercise=, --concurrency= y --runtime=.`
   - `api:audit: --concurrency va de 1 a 8 y llegó «<valor>».`
   - `api:audit: --runtime admite runsc o runc y llegó «<valor>».`
2. **Toma los sellos del host** (R8): `git rev-parse HEAD`, `git status --porcelain` (vacío es «limpio») y `docker image inspect --format '{{.Id}}'` de `taller-sandbox-rust:local` y `taller-sandbox-go:local`. Si falta una imagen, sale con 2: `api:audit: falta la imagen <imagen>: construila con «docker compose --profile sandbox-images build» (ADR 0005).`
3. **Se niega si ya hay una corrida** (R7): si `docker compose --profile audit ps --status running --quiet executor-audit` no está vacío, sale con 2 sin tocar nada: `api:audit: ya hay otra corrida de auditoría en curso (executor-audit está arriba). Si quedó de una corrida cortada, apagala con «docker compose --profile audit rm --stop --force executor-audit».`
4. **Prepara la salida:** crea `qa/curriculum-audit/` si no existe y borra un `report.json` anterior.
5. **Corre el comando:** `docker compose --profile audit run --rm --build -T audit php artisan curriculum:audit <sellos> <opciones>`, con `AUDIT_UID` y `AUDIT_GID` (los del proceso), `AUDIT_CONCURRENCY` y `AUDIT_RUNTIME` en el entorno, y la salida heredada. Compose levanta `executor-audit` y espera su healthcheck.
6. **Apaga la instancia siempre**, haya salido como haya salido: `docker compose --profile audit rm --stop --force executor-audit`.
7. **Escribe el resumen** si hay un `report.json` nuevo: `qa/curriculum-audit/summary.md`, con el bloque de [audit-summary.md](./audit-summary.md), y lo imprime después de `Resumen para la descripción del PR (qa/curriculum-audit/summary.md):`.
8. **Sale con el código del comando.**

## El comando: `php artisan curriculum:audit`

```text
curriculum:audit
  {--language= : rust o go; sin él, los dos}
  {--exercise=* : un ejercicio activo; se puede repetir}
  {--commit= : el commit del host}
  {--clean-tree= : yes o no}
  {--rust-image= : el identificador de taller-sandbox-rust:local}
  {--go-image= : el identificador de taller-sandbox-go:local}
```

Corre dentro de la imagen de la API, en el servicio `audit` (abajo). Sin la entrada también corre (por ejemplo, desde Pest): los sellos del host quedan en `null`.

### Configuración (`config/audit.php`)

| Clave | Entorno | Valor |
| --- | --- | --- |
| `audit.instance` | `AUDIT_INSTANCE` | `auditoria` |
| `audit.concurrency` | `AUDIT_CONCURRENCY` | 4; de 1 a 8 |
| `audit.report_directory` | `AUDIT_REPORT_DIRECTORY` | `/audit` |
| `audit.limits.compile_ms.rust`, `.go` | — | 20000 y 15000 |
| `audit.limits.run_ms` | — | 10000 |
| `audit.limits.compile_memory_mib`, `.run_memory_mib` | — | 1024 y 256 |
| `audit.limits.warning_ratio` | — | 0.5 |
| `audit.retry.max_rounds`, `.max_wait_seconds` | — | 10 y 30 |
| `audit.preflight.connect_timeout`, `.timeout` | — | 5 y 10 (segundos) |
| `audit.batch_per_slot` | — | 8: una tanda tiene `concurrency × 8` programas |
| `audit.custom_test_sample.rust` | — | `rust-01`, `energia(5) == 35` (pasa) y `energia(5) == 36` (falla) |
| `audit.custom_test_sample.go` | — | `go-01`, `Bytes(2) == 2048` (pasa) y `Bytes(2) == 2049` (falla) |

Del ejecutor usa lo de B2: `runs.executor.url` (`EXECUTOR_URL`), `runs.executor.token` (`EXECUTOR_TOKEN`), `runs.executor.runtime` (`EXECUTOR_RUNTIME`, que también lee la clasificación), `runs.executor.connect_timeout` (5) y `runs.executor.request_timeout` (100).

### Orden

1. Valida las opciones, los sellos y `audit.concurrency`.
2. Comprueba que puede escribir en `audit.report_directory`.
3. Toma el candado de MySQL `concat(database(), ':curriculum-audit')`.
4. Lee el catálogo en una instantánea y lo compara con la imagen (R2 y R3).
5. Comprueba que los ejercicios pedidos existen y arma los programas.
6. Hace la verificación previa del ejecutor (abajo).
7. Manda las tandas e imprime el avance: `Auditados <n> de <total> programas…`.
8. Escribe `report.json` y `report.txt`, imprime el texto y sale.
9. Libera el candado, también si algo falló.

### Negativas (FR-013): salen con 2 y no corren nada

| Situación | Mensaje |
| --- | --- |
| `--language` inválido | `--language admite rust o go y llegó «<valor>».` |
| `--clean-tree` inválido | `--clean-tree admite yes o no y llegó «<valor>».` |
| `--commit` inválido | `--commit tiene que ser el hash completo de un commit y llegó «<valor>».` |
| `--rust-image` o `--go-image` inválido | `--<opción> tiene que ser «sha256:» y 64 hexadecimales y llegó «<valor>».` |
| `audit.concurrency` fuera de rango | `AUDIT_CONCURRENCY tiene que estar entre 1 y 8 y es <valor>.` |
| Otra corrida tiene el candado | `Ya hay otra corrida de auditoría en curso: esperá a que termine. Dos corridas a la vez se borrarían los contenedores.` |
| No puede escribir el informe | `No puedo escribir el informe en <directorio>: corré la auditoría con npm run api:audit, que monta qa/curriculum-audit/.` |
| Sin importación | `No hay contenido importado: levantá el stack con «docker compose up --build -d --wait» y volvé a auditar.` |
| La importación no es la de la imagen | `El contenido importado (<12 hex>) no es el de esta imagen (<12 hex>): levantá el stack con «docker compose up --build -d --wait» y volvé a auditar.` |
| Un `--exercise` que no está activo en los lenguajes elegidos | `<id> no es un ejercicio activo de <lenguajes>.` |
| El ejercicio de la muestra no está activo | `La muestra de la prueba propia necesita <id>, que no es un ejercicio activo: actualizá audit.custom_test_sample.` |
| No alcanza al ejecutor | `No alcanzo al ejecutor de auditoría en <url> (<causa>). npm run api:audit lo levanta; si lo usaste, mirá «docker compose --profile audit logs executor-audit».` |
| El ejecutor rechaza el token | `El ejecutor de auditoría rechazó el token (401): el EXECUTOR_TOKEN de audit no es el de executor-audit.` |
| La sonda responde otra cosa | `El ejecutor de auditoría respondió <estado> a la sonda del token; se esperaba 400.` |

### La verificación previa del ejecutor

Usa `ExecutorClient::prepare()` (la URL y el token de B2) con plazos cortos (5 s para conectar, 10 s en total):

1. `GET /healthz`: tiene que responder 2xx. Una conexión que falla o un estado distinto es «No alcanzo al ejecutor».
2. `POST /v1/run` con `{"language": "", "program": ""}`: el ejecutor mira el token antes que el cuerpo (`requireToken` en `internal/api/server.go`), así que responde 401 si el token no es el suyo y 400 («lenguaje no soportado») si lo es. No corre nada.

### Envío y lectura

- Cada tanda va con `Http::pool(..., concurrency: <audit.concurrency>)`; cada pedido es `ExecutorClient::prepare($pool->as(<clave>))->post('/v1/run', ExecutorClient::body(<lenguaje>, <programa>))`, y cada resultado se lee con `ExecutorClient::read()`: los mismos plazos, cabeceras y criterios que B2.
- Rondas (R5): `Busy` y `NotReached` vuelven en la ronda siguiente, después de `Sleep::for(<espera>)->seconds()`; la espera es el mayor `Retry-After` de la ronda, acotado a 1–30 s (1 s para `NotReached`). Hasta 10 rondas; lo que sigue pendiente queda sin veredicto con la causa `unavailable`.
- `Failed` queda sin veredicto en la primera ronda (FR-008), con `noVerdictCause` `<cause>` o `<cause>:<httpStatus>`.
- Un `Result` se clasifica con `ResultClassifier` (el de B2, con `runs.executor.runtime`) y `ExpectedEvidence(<nonce>, <claves>, <hay prueba propia>)`, y lo decide `ProgramJudge`.

### Salida

| Código | Cuándo |
| --- | --- |
| 0 | Sin hallazgos ni programas sin veredicto |
| 1 | Al menos un hallazgo o un programa sin veredicto |
| 2 | Se negó a arrancar |

Archivos: `<audit.report_directory>/report.json` y `report.txt` ([data-model.md](../data-model.md)). Ninguna escritura en la base, ninguna cola (FR-012).

## La instancia y el contenedor del comando (`docker/compose.yaml`)

| Servicio | Perfil | Redes | Lo que importa |
| --- | --- | --- | --- |
| `executor-audit` | `audit` | `audit` | El ancla `x-executor-base` (el mismo build, el socket, `group_add`, `read_only`, `cap_drop`, el healthcheck, `stop_grace_period: 45s`); `EXECUTOR_INSTANCE: auditoria`, `EXECUTOR_RUNTIME: '${AUDIT_RUNTIME:-runsc}'`, `EXECUTOR_MAX_CONCURRENT: '${AUDIT_CONCURRENCY:-4}'`, las mismas imágenes del sandbox y `restart: 'no'` |
| `audit` | `audit` | `app` y `audit` | El ancla `x-laravel-runtime` (la imagen de la API, `read_only`, `cap_drop`); `EXECUTOR_URL: http://executor-audit:8080`, el mismo `EXECUTOR_TOKEN`, `EXECUTOR_RUNTIME: '${AUDIT_RUNTIME:-runsc}'`, `AUDIT_CONCURRENCY: '${AUDIT_CONCURRENCY:-4}'`, `AUDIT_INSTANCE: auditoria`, `AUDIT_REPORT_DIRECTORY: /audit`, `DB_USERNAME: '${AUDIT_DB_USERNAME:-taller}'`; `user: '${AUDIT_UID:-82}:${AUDIT_GID:-82}'`; el volumen `./qa/curriculum-audit:/audit`; `depends_on` de `mysql` y de `executor-audit` sanos; sin socket de Docker |

La red `audit` es interna. `executor` sigue sólo en `sandbox` y `worker-runs` sigue en `app` y `sandbox`: el servicio no alcanza a la instancia de auditoría ni la auditoría al servicio. `qa/compose-runs-check.ts` fija todo esto (T014).
