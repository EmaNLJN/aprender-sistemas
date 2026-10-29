# Contrato: la ejecución de `/api/runs` con `attemptId`

**Fecha**: 2026-10-28 · **Spec**: [spec.md](../spec.md), FR-024 y FR-025 · **Plan**: [plan.md](../plan.md), T002 y T003 · **Extiende a**: [contrato HTTP de B2](../../005-b2-api-ejecuciones/contracts/runs-api.md)

La spec 005 no se edita (principio VIII de la constitución). Este archivo publica el único cambio que A4 le hace al contrato de B2. Todo lo que no figura acá sigue como en el contrato de B2: las rutas, los cuerpos, los errores, las cuotas, `Retry-After` y la envoltura `data`.

## El campo nuevo

Las tres rutas que devuelven una ejecución la devuelven con un campo más, el último:

| Ruta | Respuestas que traen la ejecución |
| --- | --- |
| `POST /api/runs` | 202 y 200 |
| `GET /api/runs/{id}` | 200 |
| `POST /api/runs/{id}/cancel` | 200 y 202 |

| Campo | Tipo | Notas |
| --- | --- | --- |
| `attemptId` | entero o `null` | `null` mientras `status` es `queued` o `running`. En todo estado final (`passed`, `failed`, `compile_error`, `runtime_error`, `timeout`, `infra_error` y `canceled`), el id del intento que dejó el cierre: `runs.attempt_id`, que es `attempts.id` de la misma cuenta y del mismo ejercicio |

- **Es aditivo:** las 18 claves de B2 siguen en su orden y con sus valores, y `attemptId` va después de `customTest`.
- **Sigue respondiendo sólo al dueño:** una ejecución ajena, inexistente o podada responde 404 `not_found`, como antes.
- **Nunca devuelve** el programa armado, el código, el nonce ni el texto de las pruebas.

Ejemplo de una ejecución terminada (el de B2, con el campo nuevo):

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
    "customTest": null,
    "attemptId": 1873
  }
}
```

## Para qué sirve

- **El navegador** lo guarda en `result.attemptId` del progreso v1 (FR-019).
- **D1b**, al importar una copia v1, reutiliza ese intento en lugar de insertar uno legado. Su contrato ya lo acepta como entero positivo ([`http-d1b.md`](../../007-d1-progreso-sincronizacion/contracts/http-d1b.md), §3.3).

## Cómo se prueba

En Pest, contra MySQL (T002), con valores que salen de este contrato:

| Caso | Valor esperado |
| --- | --- |
| La ejecución recién aceptada (202) | `data.attemptId` es `null` |
| En la fila y corriendo (`GET`) | `null` |
| Cada estado final, cerrado con `RunCloser` (`GET`) | `runs.attempt_id` de esa fila, que existe en `attempts` con el `user_id` y el `exercise_id` de la ejecución |
| `canceled` desde la fila (`POST …/cancel`, 200) | `runs.attempt_id` de esa fila |
| `infra_error` (`GET`) | `runs.attempt_id` de esa fila |
| Un reintento del envío después del cierre (200) | el mismo `attemptId` que publica `GET` |
| Una ejecución de otra cuenta | 404 `not_found` |
| Las claves de la ejecución | las 18 de B2, en su orden, y `attemptId` al final |
