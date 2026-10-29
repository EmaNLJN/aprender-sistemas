# Contrato HTTP: C5 · Estadísticas del admin

**Spec**: [../spec.md](../spec.md) · **Plan**: [../plan.md](../plan.md)

Extiende el contrato de C3b ([`specs/010-c3b-admin-ciclo-de-vida/contracts/http.md`](../../010-c3b-admin-ciclo-de-vida/contracts/http.md)) con seis rutas y una clave de la ficha. Lo consume F14, el ítem del front que dibuja las pantallas (Q4).

## 1. Reglas comunes

- **Acceso.** Todas las rutas son `GET`, van bajo `/api/admin/` y usan el grupo `admin` de C3b: sesión activa, email verificado, rol `admin`, cuenta esperada y 120 pedidos por minuto por cuenta. Responde:
  - 401 `unauthenticated` sin sesión;
  - 403 `forbidden` a un estudiante, también con un destino que no existe;
  - 403 `email_unverified` o `account_disabled` como en C3b.
- **El cuerpo.** JSON en camelCase, `{data, meta}`. Las fechas con hora son ISO 8601 en UTC con milisegundos (`2026-10-20T10:00:00.000Z`), y las fechas de los períodos son locales (`2026-10-01`).
- **Los errores.** Siguen la forma `{message, code}` de la API:
  - 422 `validation_failed`, con `errors.<parámetro>`;
  - 404 `not_found`;
  - 503 `stats_timeout`, con `Retry-After` (30 s por omisión), cuando una consulta supera su tope (`STATS_MAX_EXECUTION_MS`, 5 000 ms por omisión). Ese 503 no deja nada en la caché.
- **Las listas cerradas.** Cada objeto lleva exactamente las claves de este contrato, en este orden. Una clave nueva cambia el contrato y su prueba.
- **Nunca sale:**
  - el código, el programa, el nonce, las salidas y las pruebas propias;
  - los borradores, las reflexiones, las notas, y el crudo y el informe de una importación;
  - las huellas `code_sha256` y `raw_sha256`;
  - si un texto existe o cuánto mide;
  - la opción elegida por cuenta.

  La matriz de C3b lo prueba en todas las rutas (spec, FR-006 a FR-013).
- **La población.** Las cifras agregadas cuentan sólo a las cuentas con rol vigente `student` y estado `active` o `disabled` (Q5). El resumen cuenta, aparte, todas las cuentas por rol y estado.
- **«Ejecutado en el servidor».** Ninguna clave dice «verificado». `server` es lo resuelto con una ejecución del servidor; `imported` es lo que llegó del v1.
- **La fuente de cada cifra** (FR-020):

  | Fuente | Qué es | Qué le pasa con un «Borrar todo» |
  | --- | --- | --- |
  | **vigente** | El estado de la época actual de cada cuenta | Lo pierde |
  | **historia** | Los intentos de todas las épocas | Lo conserva |
  | **actividad** | `lastActivityAt`, una sola fecha por cuenta | — |
  | **ejecuciones** | `runs`, que se poda a los 14 días | — |

  Lo resuelto (`solved*`, `firstSolves`) es vigente; los intentos (`attempts`, `operations`, `importedAttempts`, `tests`) son historia.
- **La caché.** Sólo el resumen (§3) y el contenido (§4) usan la caché, por 10 minutos por combinación de parámetros. Por eso una supresión o un «Borrar todo» tarda hasta 10 minutos en verse ahí. `meta.generatedAt` dice cuándo se calcularon.

## 2. Parámetros de período

Valen para `stats/overview`, `stats/exercises` y `stats/students/{user}`.

| Parámetro | Forma | Por omisión | 422 si |
| --- | --- | --- | --- |
| `from` | `AAAA-MM-DD` | `to` menos 29 días | no es una fecha válida, o falta habiendo `to` |
| `to` | `AAAA-MM-DD` | hoy en la zona del taller | no es una fecha válida, es anterior a `from` o falta habiendo `from` |
| `granularity` | `day`, `week` o `month` | `day` | otro valor |
| — | — | — | el período tiene más de 366 días (`errors.to`) |

**Los intervalos** se cortan a la medianoche de la zona del taller (`STATS_TIMEZONE`, por omisión `America/Argentina/Buenos_Aires`):
- **día:** cada fecha;
- **semana:** de lunes a domingo;
- **mes:** el mes calendario.

El primer intervalo empieza en `from` y el último termina en `to` inclusive. `start` es la fecha local de inicio de cada intervalo.

`meta.period` es `{"from": "2026-10-01", "to": "2026-10-20", "granularity": "day", "timezone": "America/Argentina/Buenos_Aires"}`.

## 3. `GET /api/admin/stats/overview`

```json
{
  "data": {
    "accounts": [
      {"role": "admin", "status": "active", "count": 1},
      {"role": "admin", "status": "disabled", "count": 0},
      {"role": "admin", "status": "deleting", "count": 0},
      {"role": "student", "status": "active", "count": 4},
      {"role": "student", "status": "disabled", "count": 1},
      {"role": "student", "status": "deleting", "count": 1}
    ],
    "activeStudents": {"lastDay": 1, "lastWeek": 2, "lastMonth": 3, "never": 1},
    "invitations": {"pending": 2, "expired": 1, "pendingAdmin": 1},
    "resetStudents": 1,
    "totals": {
      "attempts": {"passed": 4, "failed": 1, "compileError": 1, "runtimeError": 0, "timeout": 0},
      "operations": {"infraError": 1, "canceled": 1},
      "importedAttempts": 1,
      "firstSolves": {"server": 3, "imported": 1},
      "newStudents": 2,
      "imports": 1,
      "studentsWhoRan": 4
    },
    "series": [
      {"start": "2026-10-01", "attempts": {"…": 0}, "operations": {"…": 0}, "importedAttempts": 0, "firstSolves": {"…": 0}, "newStudents": 0, "imports": 0, "studentsWhoRan": 0}
    ]
  },
  "meta": {"generatedAt": "2026-10-20T15:00:00.000Z", "period": {"…": "…"}}
}
```

- **`accounts`:** las seis combinaciones de rol y estado, siempre, con cero si no hay. No aplica la población.
- **`activeStudents`:** cuentan los alumnos de la población según `lastActivityAt`:
  - `lastDay`, `lastWeek` y `lastMonth`, en las últimas 24 horas, 7 días y 30 días contados desde el cálculo;
  - `never`, los que no tienen actividad (sin cabecera de progreso, o con la fecha nula).
- **`invitations`:** cuenta todas las pendientes. `pending` son las vigentes y `expired`, las vencidas; `pendingAdmin` son las vigentes de rol `admin`.
- **`resetStudents`:** los alumnos cuya época es mayor que 1 (hicieron «Borrar todo» al menos una vez).
- **`totals` y cada elemento de `series`:**
  - `attempts`: los intentos que cuentan (la definición de B2), por resultado;
  - `operations`: `infra_error` y `canceled` no legados;
  - `importedAttempts`: los intentos legados;
  - `firstSolves`: las filas de progreso cuya resolución (`solvedAt`) cae en el intervalo. Son `server` si tienen `serverSolvedAt`, o `imported`;
  - `newStudents`: las altas de alumnos de la población;
  - `imports`: las importaciones del v1;
  - `studentsWhoRan`: los alumnos distintos con al menos un intento que cuenta.

  En `totals`, `studentsWhoRan` se cuenta sobre todo el período, no se suma. La actividad por período sale sólo de los intentos: quien no ejecutó código no aparece en `studentsWhoRan`.

## 4. `GET /api/admin/stats/exercises`

**Parámetros:** los de período (el período vale sólo para los intentos) y estos filtros:

| Filtro | Valores | A qué se aplica |
| --- | --- | --- |
| `catalog` | un código de `catalogs` | `catalogs` y `exercises` |
| `language` | `rust` o `go` | todo, salvo `route` |
| `level` | `beginner`, `medium`, `advanced` o `expert` | `catalogs`, `exercises`, `worlds` y `workshops` |

`meta` suma `filters: {catalog, language, level}`, con `null` en los que no vinieron.

```json
{
  "data": {
    "catalogs": [
      {"catalog": "lab", "language": "rust", "level": null, "activeExercises": 1, "studentsStarted": 3, "studentsSolved": 3, "solvedMedian": 1}
    ],
    "exercises": [
      {
        "exerciseId": "rust-01", "catalog": "lab", "language": "rust", "level": null, "retired": false,
        "studentsStarted": 3,
        "solved": {"server": 2, "imported": 1},
        "attempts": {"passed": 3, "failed": 1, "compileError": 0, "runtimeError": 0, "timeout": 0},
        "operations": {"infraError": 0, "canceled": 0},
        "importedAttempts": 1,
        "attemptsMedian": {"solved": 1, "unsolved": null},
        "help": {"assisted": 1, "solutionSeen": 0, "hintsRevealed": [{"hints": 0, "students": 1}, {"hints": 1, "students": 1}]},
        "prediction": {"answered": 2, "correct": 1, "options": [{"option": 0, "students": 1}, {"option": 2, "students": 1}]},
        "confidence": {"again": 1, "practice": 0, "confident": 1},
        "tests": [{"testKey": "t1", "verdicts": 4, "fail": 0, "missing": 0}]
      }
    ],
    "worlds": [
      {"worldId": "fx-world-1", "language": "rust", "level": "beginner", "retired": false, "exercises": 1, "solvedRows": 3, "studentsWithSeals": 1,
       "checkpoint": {"answered": 2, "passed": 1, "options": [{"option": 1, "students": 1}, {"option": 2, "students": 1}]}}
    ],
    "workshops": [
      {"workshopId": "fx-workshop-1", "language": "rust", "level": "beginner", "retired": false, "studentsStarted": 2, "codeSealed": 1,
       "prediction": {"answered": 1, "correct": 1, "options": [{"option": 1, "students": 1}]},
       "stepsMarkedMedian": 0.5, "objectivesObservedMedian": 0.5}
    ],
    "route": {
      "marks": [{"kind": "step", "itemKey": "fx-step-1", "students": 2}, {"kind": "milestone", "itemKey": "m-01", "students": 1}],
      "quiz": [{"stepId": "fx-step-1", "answered": 2, "options": [{"option": 0, "students": 1}, {"option": 1, "students": 1}]}]
    }
  },
  "meta": {"generatedAt": "…", "period": {"…": "…"}, "filters": {"catalog": "lab", "language": "rust", "level": null}}
}
```

- **`catalogs`:** por catálogo, lenguaje y nivel, en el orden de la cadena (`chain_position`, con los nulos al final) y después por código, lenguaje y nivel.
  - `activeExercises`: los ejercicios activos.
  - `studentsStarted`: los alumnos con alguna fila de progreso en el catálogo.
  - `studentsSolved`: los que resolvieron al menos uno.
  - `solvedMedian`: la mediana de resueltos por alumno, entre los que empezaron; es `null` si nadie empezó.
  - La parte del catálogo resuelta es `solvedMedian / activeExercises`.
- **`exercises`:** cada ejercicio, también los retirados (`retired: true`), ordenado por catálogo, lenguaje, etapa e id.
  - `studentsStarted`: los alumnos con fila de progreso. Es vigente.
  - `attemptsMedian`: la mediana del conteo de intentos de la época, entre quienes lo resolvieron (`solved`) y entre quienes no (`unsolved`), o `null` sin alumnos.
  - `help.hintsRevealed`: la distribución de pistas reveladas, sin las filas nulas.
  - `prediction`: `answered` cuenta a quienes respondieron o acertaron alguna vez, y `options`, la distribución de la última opción elegida, sin identificadores.
  - `tests`: las pruebas con al menos un veredicto en el período, en el orden del ejercicio. `verdicts` es la cantidad de veredictos de los intentos que cuentan.
- **`worlds`:**
  - `exercises`: los ejercicios activos del mundo;
  - `solvedRows`: las filas resueltas de esos ejercicios, sumadas sobre los alumnos;
  - `studentsWithSeals`: los alumnos con al menos un sello en el mundo;
  - `checkpoint`: el checkpoint, como en `prediction`.
- **`workshops`:** cada taller de Sistemas por lenguaje (`rust` y `go`), también sin alumnos.
  - `stepsMarkedMedian` y `objectivesObservedMedian`: las medianas por alumno de los que lo empezaron, o `null`.
- **`route`:**
  - `marks`: los pasos, hitos y favoritos marcados, por clave y en el orden `step`, `milestone`, `favorite`;
  - `quiz`: las preguntas respondidas, con su distribución.
- **Las medianas** son un entero, o un número con `.5` cuando la cantidad de alumnos es par y los dos valores del medio difieren.

## 5. `GET /api/admin/stats/students`

**Parámetros:**

| Parámetro | Valores | Por omisión |
| --- | --- | --- |
| `page` | desde 1 | 1 |
| `perPage` | de 1 a 100 | 25 |
| `q` | nombre o email, hasta 80 caracteres | — |
| `inactiveSince` | `AAAA-MM-DD`, en la zona del taller | — |
| `sort` | `name`, `createdAt` o `lastActivity`, con `-` para invertir | `name` |

Lista sólo a los alumnos de la población. No usa caché.

```json
{
  "data": [
    {"id": 3, "name": "Ana Pérez", "email": "ana@stats.test", "role": "student", "status": "active",
     "lastActivityAt": "2026-10-20T10:00:00.000Z", "solved": {"server": 1, "imported": 0},
     "attempts": {"lastWeek": 0, "lastMonth": 3}, "lastAttemptAt": "2026-10-06T02:30:00.000Z"}
  ],
  "meta": {"page": 1, "perPage": 25, "total": 5, "lastPage": 1}
}
```

- **`inactiveSince`:** deja a los alumnos sin actividad desde esa medianoche local, incluidos los que nunca tuvieron actividad.
- **El orden por `lastActivity`:** una actividad nula cuenta como la más vieja. Va primero en orden ascendente y último en descendente. El desempate es el id ascendente.
- **Las cifras de cada fila:**
  - `solved`: es vigente;
  - `attempts.lastWeek` y `attempts.lastMonth`: los intentos que cuentan en los últimos 7 y 30 días;
  - `lastAttemptAt`: el último intento no legado de cualquier época.

  Se calculan sólo para las cuentas de la página, así que la lista no se ordena por ellas.

## 6. `GET /api/admin/stats/students/{user}`

**Parámetros:** los de período. `{user}` tiene de 1 a 18 dígitos; otra forma responde 404.

Responde para cualquier cuenta que exista y no esté en `deleting`, de cualquier rol. Si no, 404 `not_found`. Cada respuesta con éxito deja la línea de log `admin.student_viewed` con `target_id` y `view: detail` (Q3). No usa caché.

```json
{
  "data": {
    "account": {"id": 3, "name": "Ana Pérez", "email": "ana@stats.test", "role": "student", "status": "active", "emailVerified": true, "privacyVersion": null, "createdAt": "…", "updatedAt": "…"},
    "progress": {"epoch": 1, "resetAt": null, "lastActivityAt": "2026-10-20T10:00:00.000Z"},
    "imports": [{"importedAt": "…", "source": "storage", "epoch": 1}],
    "solvedByCatalog": [{"catalog": "lab", "language": "rust", "server": 1, "imported": 0}],
    "attempts": {
      "inPeriod": {"attempts": {"passed": 1, "failed": 1, "compileError": 1, "runtimeError": 0, "timeout": 0}, "operations": {"infraError": 0, "canceled": 0}, "importedAttempts": 0},
      "total": {"…": "la misma forma"}
    },
    "activity": [{"start": "2026-10-05", "attempts": 3}],
    "quota": {"active": 0, "lastMinute": 0, "lastDay": 1, "sandboxMs": 500, "limits": {"active": 1, "perMinute": 10, "perDay": 300, "sandboxMinutes": 30}},
    "exercises": [
      {"exerciseId": "rust-01", "state": "solved", "solvedAt": "…", "serverSolvedAt": "…", "attemptCount": 2, "lastAttemptAt": "…", "lastOutcome": "passed",
       "assisted": true, "solutionSeen": false, "hintsRevealed": 1, "predictionAnswered": true, "predictionCorrect": true, "confidence": "confident", "reviewDueAt": "…"}
    ],
    "campaign": {"checkpoints": [{"worldId": "fx-world-1", "answered": true, "passed": true, "passedAt": "…"}], "sealedExercises": 0},
    "workshops": [{"workshopId": "fx-workshop-1", "language": "rust", "codeSealed": true, "predictionAnswered": true, "predictionCorrect": true, "stepsMarked": 1, "objectivesObserved": 1}],
    "route": {"steps": 1, "milestones": 1, "favorites": 0, "quizAnswered": 1}
  },
  "meta": {"generatedAt": "…", "period": {"…": "…"}}
}
```

- **`account`:** el `AdminUser` de C3b.
- **`progress`:** sin cabecera de progreso, `epoch` vale 1 y `resetAt` y `lastActivityAt`, `null`.
- **`imports`:** las importaciones en orden de fecha. Nunca el informe ni el crudo.
- **`attempts`:** `inPeriod` y `total` tienen la misma forma.
- **`activity`:** los intentos que cuentan, por intervalo del período.
- **`quota`:** el uso de B2 (`QuotaPolicy::usage`) contra los límites configurados. `sandboxMs` son los milisegundos de compilación y ejecución de las últimas 24 horas.
- **`exercises`:** la grilla, en el orden del id.
  - `state` vale `solved` si hay `solvedAt`; `attempted` si hay intentos de la época o un último intento; y `started` si no.
  - `lastOutcome` es el resultado del último intento no cancelado que apunta el progreso, o `null`.
  - De una pregunta sale sólo si respondió o si acertó, nunca la opción (Q1).
- **`campaign`, `workshops` y `route`:** sólo banderas y conteos.

## 7. La ficha: `GET /api/admin/users/{user}` (extiende la spec 010)

El `AdminUser` de C3b suma la clave `usage` al final:

```json
{"data": {"id": 3, "…": "las nueve claves de AdminUser", "usage": {"lastActivityAt": "…", "solved": {"server": 1, "imported": 0}, "attemptsLastMonth": 3, "imports": 0}}}
```

- **Una cuenta en `deleting`:** la ficha responde como en C3b, con `usage: null`.
- **El log:** cada respuesta con éxito deja la línea `admin.student_viewed` con `view: summary`.
- **La lista:** `GET /api/admin/users` no cambia.

## 8. `GET /api/admin/runs`

**Parámetros:**

| Parámetro | Valores |
| --- | --- |
| `status` | un estado de B2 |
| `user` | id de una cuenta |
| `exercise` | id de un ejercicio |
| `since` | `AAAA-MM-DD`, local |
| `cursor` | un id de ejecución |
| `perPage` | de 1 a 100; por omisión, 50 |

Un `user` que no existe o está en `deleting` responde 404. Un `cursor` que no es un UUID responde 422.

```json
{
  "data": [
    {"id": "019a0000-0000-7000-8000-000000000003", "account": {"id": 5, "name": "Caro Díaz"}, "exerciseId": "rust-01", "language": "rust",
     "status": "queued", "reason": null, "executorPhase": null, "exitCode": null, "truncated": null, "compileMs": null, "runMs": null,
     "createdAt": "…", "startedAt": null, "finishedAt": null, "cancelRequested": false}
  ],
  "meta": {"nextCursor": "019a0000-0000-7000-8000-000000000002", "retentionDays": 14}
}
```

- **El orden:** de la más nueva a la más vieja por id, que es un UUIDv7. `nextCursor` es el id de la última de la página, o `null` si no hay más.
- **Lo que no muestra:**
  - las ejecuciones de cuentas en `deleting`;
  - nada anterior a 14 días: B2 lo podó.
- **El log:** filtrada por `user`, cada respuesta con éxito deja `admin.student_viewed` con `view: runs`.

## 9. `GET /api/admin/queue`

Se calcula en vivo y sin caché.

```json
{
  "data": {
    "now": {"queued": 2, "running": 0, "oldestQueuedSeconds": 120, "maxWaiting": 32, "slots": 4},
    "lastDay": {"finished": 2, "waitMs": {"p50": 1500, "p95": 1500}, "durationMs": {"p50": 500, "p95": 500}, "infraErrors": [{"reason": "executor_busy", "runs": 1}]}
  },
  "meta": {"generatedAt": "…"}
}
```

- **`now`:**
  - `queued` y `running`: las ejecuciones de ahora, de cualquier cuenta;
  - `maxWaiting`: el tope de la cola (`RUNS_QUEUE_MAX_WAITING`);
  - `slots`: los lugares configurados (`EXECUTOR_MAX_CONCURRENT`).
- **`lastDay`:** las ejecuciones aceptadas en las últimas 24 horas que terminaron.
  - `waitMs` va de la aceptación al inicio.
  - `durationMs` va del inicio al fin.
  - Los percentiles son de rango más cercano, o `null` sin datos.
- **Lo que no cuenta:** los rechazos 429 y 503 de `/api/runs`, que no dejan filas (spec 005, FR-008 y FR-010).
