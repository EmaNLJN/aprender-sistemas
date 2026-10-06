# Contrato HTTP: `/api/runs` y `/api/harness`

**Fecha**: 2026-10-05 | **Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md) | **Investigación**: [research.md](../research.md), R6, R7 y R14

Es el contrato que A4 consume y que el check de punta a punta y las pruebas de Pest ejercitan. Todas las rutas van bajo `/api`, del mismo origen, con la sesión de C3a. Las tres de `/api/runs` rigen con la sesión activa, el email verificado y, las que modifican, la cuenta esperada y el CSRF (los pone el grupo de rutas de C3a; ver «Lo que B2 toma de C3a» en [plan.md](../plan.md)). Los errores siguen el cuerpo `{message, code}` de C3a, con el mensaje en español. Las respuestas de ejecuciones salen `Cache-Control: private, no-store` y llevan la envoltura `data` (ADR 0006 §8: las porciones de contenido van sin envoltura, el resto con `data`). Esa envoltura reemplaza al `{id, status}` que el ADR 0005 §3 muestra sin ella; A4 la sigue.

## `POST /api/runs`: enviar una ejecución

Cabeceras de C3a: `X-Taller-User: <id>` y `X-XSRF-TOKEN`. Cuerpo JSON con exactamente estos campos (cualquier otro, como `language`, `tests`, `program` o `userId`, se rechaza con 422: el servidor es quien arma el programa):

| Campo | Tipo | Regla |
| --- | --- | --- |
| `clientRunId` | texto | UUID. Se guarda en minúsculas. Es la clave de idempotencia de la cuenta |
| `exerciseId` | texto | El ID de un ejercicio activo del currículo |
| `code` | texto | No vacío ni sólo espacios; como mucho 65.536 **bytes** |
| `customTest` | texto, opcional | Como mucho 3.000 caracteres (se miden como llegan, antes de recortar). Vacío o sólo espacios equivale a no enviarla |

El código llega y se guarda **tal cual**, byte por byte: el middleware de recorte de Laravel no corre sobre `/api/runs`. La prueba propia se normaliza al admitir: se le quitan los espacios, tabuladores y saltos de línea de los extremos, y una en blanco equivale a no enviarla (se guarda `NULL`).

| Respuesta | Cuándo | Cuerpo |
| --- | --- | --- |
| **202** | Se aceptó una ejecución nueva | `{"data": <ejecución>}` con `status` `queued` |
| **200** | Es un reintento: la misma cuenta, el mismo `clientRunId`, el mismo ejercicio, el mismo código y la misma prueba propia | `{"data": <ejecución>}` con su estado actual |
| **422** `client_run_id_reused` | El `clientRunId` ya se usó con otro ejercicio, otro código u otra prueba propia | `{message, code}` |
| **422** `validation_failed` | Falta un campo, algo no tiene la forma, sobra un campo, el código está vacío o pasa los 64 KiB, la prueba propia pasa los 3.000 caracteres o el ejercicio no existe o está retirado | `{message, code, errors}` con un arreglo de mensajes por campo |
| **429** `quota_exceeded` | La cuenta superó una cuota (ver abajo) | `{message, code, quota}` y `Retry-After` |
| **429** `too_many_requests` | Más de 30 pedidos por minuto de la cuenta (cuentan también los rechazados) | `{message, code}` y `Retry-After` |
| **503** `queue_full` | Ya esperan 32 ejecuciones (el tope es blando) | `{message, code}` y `Retry-After` |
| **403** `account_disabled` | La cuenta no está activa (también en un reintento) | `{message, code}` |
| 401, 403 `email_unverified`, 409 `account_mismatch`, 419 | De C3a | De C3a |
| 413 | El cuerpo pasa los 192 KiB: lo corta Nginx antes de llegar a PHP | El de Nginx, no `{message, code}` |

Un pedido rechazado (422, 429 o 503) no crea ejecución, no encola nada y no gasta cuota. Un reintento (200) no se rechaza por cuota ni por el tope global y no los gasta. Un reintento es el mismo pedido si coinciden el ejercicio, el código (byte por byte) y la prueba propia ya normalizada.

**`quota`** dice cuál cuota fue: `active` (ya tenés una ejecución en cola o corriendo), `per_minute` (10 aceptadas por minuto), `per_day` (300 cada 24 horas) o `sandbox_time` (30 minutos de sandbox, compilación más ejecución, cada 24 horas). Gasta cuota toda ejecución aceptada con cualquier resultado menos `infra_error`.

**`Retry-After`** va en segundos enteros, de al menos 1: para `active`, 3; para las tres cuotas con ventana, lo que falta para que salga de la ventana la ejecución contada más vieja; para `queue_full`, 10; para `too_many_requests`, el que calcula Laravel. Los valores 3 y 10 son configuración.

## `GET /api/runs/{id}`: consultar

Sólo el dueño: una ejecución ajena, inexistente o podada responde **404** `not_found`. El `{id}` es un UUID opaco (un texto que no lo es responde 404 también). Es una lectura por clave y no tiene límite de ritmo de Laravel (sí el de Nginx por IP): el cliente la repite cada 0,3 a 2 s. Responde **200** con `{"data": <ejecución>}`. **Nunca** devuelve el programa armado.

## `POST /api/runs/{id}/cancel`: cancelar

Sólo el dueño, con las cabeceras de C3a y sin cuerpo.

| Respuesta | Cuándo |
| --- | --- |
| **200** | Estaba en cola: queda `canceled` al instante. O ya había terminado: no cambia nada |
| **202** | Estaba corriendo: se acepta la cancelación y el sandbox sigue hasta terminar; la ejecución termina `canceled` sin tocar el progreso (o `infra_error` si el barrido la vence antes de que el sandbox responda, salvo que haya pedido de cancelación: entonces también `canceled`) |
| **404** | Ajena, inexistente o podada |

Las dos respuestas con éxito traen `{"data": <ejecución>}` con el estado de ese momento.

## La ejecución

Los nombres van en camelCase, los enums en minúscula con guion bajo y las fechas en ISO 8601 UTC con milisegundos y `Z`.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | texto | UUIDv7 |
| `status` | texto | `queued`, `running`, `passed`, `failed`, `compile_error`, `runtime_error`, `timeout`, `infra_error` o `canceled` |
| `reason` | texto o `null` | `oom`, `signal`, `pids_limit`, `output_limit`, `evidence_invalid`, `executor_busy`, `executor_error`, `job_failed`, `expired` o `account_disabled`. El conjunto puede crecer |
| `queuePosition` | entero o `null` | Mientras está `queued`: su lugar en la cola, desde 1. Si no, `null` |
| `exerciseId` | texto | |
| `language` | texto | `rust` o `go` |
| `createdAt` | fecha | La aceptación del envío |
| `startedAt`, `finishedAt` | fecha o `null` | |
| `phase` | texto o `null` | `compile` o `run`: la fase que alcanzó (sólo al terminar y sólo si el sandbox respondió) |
| `exitCode` | entero o `null` | |
| `compileMs`, `runMs` | entero o `null` | |
| `truncated` | booleano o `null` | Si el ejecutor recortó alguna salida |
| `stdout`, `stderr` | texto o `null` | La salida completa (sólo al terminar y sólo si el sandbox respondió), con las líneas de evidencia incluidas: el cliente las oculta |
| `tests` | lista | `[{"key": "t1", "outcome": "pass"}]` en el orden de las pruebas; `outcome` es `pass`, `fail` o `missing`. Vacía si no se leyó evidencia |
| `customTest` | texto o `null` | `pass`, `fail` o `missing`; `null` si no se envió prueba propia o no se leyó evidencia |

Ejemplo de una ejecución que terminó bien:

```json
{
  "data": {
    "id": "0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21",
    "status": "passed",
    "reason": null,
    "queuePosition": null,
    "exerciseId": "rust-01",
    "language": "rust",
    "createdAt": "2026-10-05T16:21:07.412Z",
    "startedAt": "2026-10-05T16:21:07.903Z",
    "finishedAt": "2026-10-05T16:21:08.511Z",
    "phase": "run",
    "exitCode": 0,
    "compileMs": 412,
    "runMs": 31,
    "truncated": false,
    "stdout": "__TALLER_TEST__2f0c…:t1:PASS\n__TALLER_TEST__2f0c…:t2:PASS\n__TALLER_TEST__2f0c…:t3:PASS\n__TALLER_END__2f0c…:3\n",
    "stderr": "",
    "tests": [
      { "key": "t1", "outcome": "pass" },
      { "key": "t2", "outcome": "pass" },
      { "key": "t3", "outcome": "pass" }
    ],
    "customTest": null
  }
}
```

Una en cola, recién aceptada, trae `status` `queued`, `queuePosition` 3 y el resto en `null` (con `tests` vacía).

## Los errores y sus códigos

Los de B2, que se suman a la tabla de §8 del ADR 0006 cuando se lo apruebe:

| HTTP | `code` | Campos extra | `Retry-After` |
| --- | --- | --- | --- |
| 422 | `client_run_id_reused` | — | No |
| 429 | `quota_exceeded` | `quota` | Sí |
| 503 | `queue_full` | — | Sí |

Los mensajes (voseo, en español): «Ya tenés una ejecución en curso: esperá a que termine.» (`active`), «Hiciste demasiadas ejecuciones en el último minuto: esperá un momento.» (`per_minute`), «Llegaste al máximo de ejecuciones de las últimas 24 horas.» (`per_day`), «Llegaste al máximo de tiempo de ejecución de las últimas 24 horas.» (`sandbox_time`), «El taller está ocupado ahora mismo: reintentá en unos segundos.» (`queue_full`) y «Ese identificador de ejecución ya se usó con otro código, otro ejercicio u otra prueba propia.» (`client_run_id_reused`).

## `GET /api/harness`: la plantilla del harness

La 18.ª porción de contenido: sin parámetros y **sin** envoltura `data`. Responde `{"rust": "<plantilla>", "go": "<plantilla>"}` con `Content-Type: application/json`, `ETag: "<32 hexadecimales>"`, `Content-Version: <32 hexadecimales>` y `Cache-Control: private, no-cache`, igual que las otras 17. Con `If-None-Match` igual al validador, responde 304. Detrás de la sesión (la que C3a pone a todo el contenido). Los parámetros de la consulta se ignoran, como en `/api/guide`, que tampoco se corta. La gramática de la plantilla está en [harness-template.md](./harness-template.md).

`Content-Version` es la del documento (`curriculum.json`), que **no** cambia si sólo cambia la plantilla: el validador de la plantilla es su `ETag`, y un cliente que la usa (A4) la revalida con `If-None-Match` cada vez que abre el laboratorio, que cuesta un 304.
