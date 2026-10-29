# Modelo de datos: A4 · Laboratorio con el sandbox propio

**Fecha**: 2026-10-28 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Investigación**: [research.md](./research.md)

A4 no crea tablas ni claves de almacenamiento. Suma un campo a la ejecución de la API, un campo opcional al `result` v1 y una porción opcional a la copia del contenido de A3. El resto son formas en memoria. Los textos que ve el alumno están al final, en un solo lugar.

## 1. La ejecución de la API, con `attemptId`

Es la de [`contracts/runs-api.md` de B2](../005-b2-api-ejecuciones/contracts/runs-api.md), con un campo más al final. El contrato ampliado está en [contracts/runs-api-attempt-id.md](./contracts/runs-api-attempt-id.md).

| Campo | Tipo | Regla |
| --- | --- | --- |
| `attemptId` | entero o `null` | `null` mientras `status` es `queued` o `running`; en todo estado final, el `attempts.id` que dejó el cierre (`runs.attempt_id`) |

El navegador lee sólo estos campos (`ServerRun`, en `features/run-exercise/api/server-run.ts`):

```ts
export type RunStatus =
  | 'queued' | 'running' | 'passed' | 'failed' | 'compile_error'
  | 'runtime_error' | 'timeout' | 'infra_error' | 'canceled';
export type TestOutcome = 'pass' | 'fail' | 'missing';

export interface ServerRun {
  readonly id: string;
  readonly status: RunStatus;
  readonly reason: string | null;
  readonly queuePosition: number | null;
  readonly stdout: string | null;
  readonly stderr: string | null;
  readonly tests: readonly { readonly key: string; readonly outcome: TestOutcome }[];
  readonly customTest: TestOutcome | null;
  readonly attemptId: number | null;
}
```

- `parseServerRun(body)` recibe el cuerpo `{data: …}`.
- Devuelve `null` si algún campo tiene otro tipo o el estado no es uno de los nueve. Eso es una respuesta ilegible.
- `reason` queda como texto, porque el conjunto puede crecer: un motivo desconocido no tiene explicación propia.

## 2. El `result` v1 con `attemptId`

`LabResultV1` (`entities/exercise/model/lab-result.ts`) es la única forma desde T004, y ya trae `attemptId?: number`.

| Campo | Regla de `sanitizeResult` (FR-040) |
| --- | --- |
| `attemptId` | Se conserva si es un entero seguro mayor que 0 (`Number.isSafeInteger(v) && v > 0`). Si no, se descarta. Va al final, después de `customPassed`, como lo arma `buildRunResult` |

- **Un resultado sin `attemptId`** sigue siendo válido: las fixtures congeladas no cambian y no escriben.
- **Cargar, importar, exportar y fusionar entre pestañas** lo conservan:
  - cargar e importar pasan por `sanitizeRecord`;
  - exportar escribe el estado guardado;
  - `mergeRecord` copia el objeto.
- **`attempts` del registro v1** deja de sumarse (FR-021): `countsLocalAttempts: false`. El valor guardado no se toca.

## 3. Del resultado del servidor al veredicto

`verdictOfRun(run, exercise)` (`features/run-exercise/api/run-verdict.ts`) arma el veredicto que la feature de F7a convierte en `result` v1 con `buildRunResult`. Es la tabla de la spec, en código:

| `status` y `reason` | `kind` | `success` | `tests` | `stderr` del veredicto | `attemptId` |
| --- | --- | --- | --- | --- | --- |
| `passed` | `executed` | `true` | los `pass` de `run.tests` | la salida de error sin marcas | sí |
| `failed`, `reason: null` | `executed` | `true` si alguna prueba esperada no está en `pass`; `false` si todas lo están (contradicción del servidor) | los `pass` | sin marcas | sí |
| `failed`, `output_limit` | `executed` | `false` | los `pass` | `SERVER_EXPLANATIONS.outputLimit` + salida | sí |
| `failed`, `evidence_invalid` | `executed` | `false` | los `pass` | `SERVER_EXPLANATIONS.evidenceInvalid` + salida | sí |
| `compile_error`, sin motivo | `executed` | `false` | ninguna | la salida de error | sí |
| `compile_error`, `oom` | `executed` | `false` | ninguna | `SERVER_EXPLANATIONS.compileMemory` + salida | sí |
| `runtime_error`, sin motivo o `signal` | `executed` | `false` | ninguna | la salida de error | sí |
| `runtime_error`, `oom` | `executed` | `false` | ninguna | `SERVER_EXPLANATIONS.runMemory` + salida | sí |
| `runtime_error`, `pids_limit` | `executed` | `false` | ninguna | `SERVER_EXPLANATIONS.threads` + salida | sí |
| `timeout` | `executed` | `false` | ninguna | `SERVER_EXPLANATIONS.timeout` + salida | sí |
| `infra_error`, cualquier motivo | `transport-failure` | — | — | `message`: `WORKSHOP_FAILURE` | sí |
| `canceled`, `account_disabled` | `transport-failure` | — | — | `message`: `ACCOUNT_DISABLED` | sí |
| `canceled`, otro motivo | `transport-failure` | — | — | `message`: `RUN_CANCELED` | sí |

- **«+ salida»** es `explicación + "\n\n" + salida` si hay salida, o sólo la explicación si no la hay.
- **Las dos salidas** pasan por `withoutEvidence`.
- **`customPassed`** es `run.customTest === 'pass'`.
- **El invariante (FR-015):** `hasPassingEvidence` aprueba si y sólo si el estado es `passed`. Cualquier otro estado deja `success` en falso o alguna prueba sin aprobar.

## 4. Las decisiones del adaptador

`decideSubmit(result, now)` y `decidePoll(result)` (`features/run-exercise/api/run-decisions.ts`) leen el `ApiResult` del cliente de F11a. `ApiFailure` suma `quota?: string` (R4 de research).

### El envío (`POST /api/runs`)

| Respuesta | Decisión | Texto |
| --- | --- | --- |
| 2xx con una ejecución legible | `accepted` | — |
| 2xx ilegible (`unexpected` 2xx o sin `data`) | `stop` | `UNREADABLE` |
| `network` | `retry` | `NETWORK` si se agotan los reintentos |
| `unexpected` 5xx (sin el cuerpo de la API) | `retry` | `UNAVAILABLE` si se agotan |
| `response` 503 `queue_full` | `wait-turn`, `Retry-After` o 10 | el mensaje del servidor si se agota el tope |
| `response` 429 `quota_exceeded`, `quota: active` | `wait-turn`, `Retry-After` o 3 | el mensaje del servidor si se agota el tope |
| `response` 429 `quota_exceeded`, otra cuota | `stop` | mensaje + `retryHint(Retry-After)` |
| `response` 429 `too_many_requests` | `stop` | mensaje + `retryHint(Retry-After)` |
| `response` 5xx (`server_error` u otro) | `retry` | su mensaje si se agotan |
| `response` 401 o `signed-out` | `stop`, pide el ingreso | `SESSION_EXPIRED` |
| `account-changed` | `stop` | su mensaje |
| `response` 422 con `errors.exerciseId` | `stop` | el mensaje del campo + `RELOAD_CONTENT` |
| `response` 422, otro | `stop` | mensaje + el primer mensaje de campo, si hay |
| `response` 403, 409 o cualquier otro con cuerpo de la API | `stop` | su mensaje |
| `unexpected` 4xx (413 de Nginx, por ejemplo) | `stop` | `rejected(estado)` |

### La consulta (`GET /api/runs/{id}`)

| Respuesta | Decisión |
| --- | --- |
| 2xx con una ejecución legible | `run` |
| 2xx ilegible | `stop` con `UNREADABLE` |
| `network`, `unexpected` 5xx o 429, `response` 5xx o 429 | `retry`, con el `Retry-After` si llegó; se corta a los 30 s de fallas seguidas con `NETWORK` |
| `response` 401 o `signed-out` | `stop`, pide el ingreso, `SESSION_EXPIRED` |
| `response` 403, 404 u otro con cuerpo de la API | `stop` con su mensaje |
| `unexpected` 4xx | `stop` con `rejected(estado)` |

## 5. El progreso de la espera

```ts
export type ApiRunPhase =
  | { readonly kind: 'queued'; readonly position: number }
  | { readonly kind: 'running' }
  | { readonly kind: 'waiting-turn'; readonly retryInSeconds: number };

export interface ApiRunProgress {
  readonly phase: ApiRunPhase;
  readonly delayed: boolean;
}

export interface RunProgressCopy {
  readonly line: string;
  readonly announcement: string;
  readonly delayNotice: string | null;
}
```

| Progreso | `line` | `announcement` |
| --- | --- | --- |
| `null` o `running` | «Ejecutando código real…» | «Ejecutando código real…» |
| `queued`, lugar N | «En la fila del taller: sos el número {N}.» | «En la fila del taller.» |
| `waiting-turn`, N s | «Esperando turno para ejecutar: vuelvo a intentar en {N} s.» | «Esperando turno para ejecutar.» |

`delayNotice` vale `DELAY_NOTICE` cuando `delayed` es verdadero, y `null` si no. El progreso vive en memoria (`runner.state`) y no se guarda.

## 6. La plantilla en la copia de A3

```ts
// shared/api/content/harness-copy.ts
export interface HarnessData {
  readonly rust: string;
  readonly go: string;
}
export interface CopiedHarness {
  readonly etag: string;
  readonly data: HarnessData;
}
```

- Va en `portions.harness` del registro de la copia (`taller-contenido`, almacén `copia`, clave `ultima`).
- `usableCopy` la ignora: devuelve 17 porciones, y `COPY_FORMAT` no sube (A4-13).
- `harnessOf(record)` la lee sólo si el registro es una copia usable y la porción tiene la forma `{etag: string, data: {rust: string, go: string}}`.
- **Quién la escribe:** el laboratorio con `update`, después de un 200; el arranque de A3, que la arrastra del registro anterior en el mismo `update` con `harnessToCarry` (sólo el formato y la forma de la plantilla).
- **Quién la borra:** `forgetContentCopy`, y el borrado de A3 ante otra versión.

## 7. Los textos

Los de la spec («Textos que cambian») y los que propone este plan, marcados con **(plan)**. El usuario los revisa en el PR del plan.

| Constante | Dónde vive | Texto |
| --- | --- | --- |
| `NETWORK` | `run-decisions.ts` | «No se pudo conectar con el taller. Revisá tu conexión. Podés seguir leyendo y resolviendo las preguntas sin conexión.» |
| `UNAVAILABLE` | `run-decisions.ts` | «El taller no está disponible ahora. Tu código sigue guardado; volvé a intentar más tarde.» |
| `rejected(estado)` | `run-decisions.ts` | «El taller rechazó la solicitud (HTTP {estado}). Volvé a intentar; si se repite, recargá la página.» |
| `UNREADABLE` | `run-decisions.ts` | «El taller devolvió una respuesta que no se pudo leer. Volvé a intentar.» |
| `SESSION_EXPIRED` | `run-decisions.ts` | «Tu sesión venció: volvé a ingresar para ejecutar. Tu código sigue guardado.» |
| `RELOAD_CONTENT` **(plan)** | `run-decisions.ts` | «Recargá la página para traer el contenido al día.» |
| `retryHint` | `retry-hint.ts` | «Podés volver a ejecutar en {N} s.», «… en {N} min.» o «… a las {HH:MM}.» |
| `WORKSHOP_FAILURE` | `entities/exercise/model/server-explanations.ts` | «El taller no pudo ejecutar tu código por una falla propia, no de tu programa. Tu código sigue guardado; volvé a intentar en un momento.» |
| `ACCOUNT_DISABLED` | `run-verdict.ts` | «Tu cuenta está deshabilitada. Consultá con quien administra el taller.» (`lang/es/api.php` de C3a) |
| `RUN_CANCELED` **(plan)** | `run-verdict.ts` | «La ejecución se canceló antes de terminar. Tu código sigue guardado.» |
| `SERVER_EXPLANATIONS.timeout` | `server-explanations.ts` | «La ejecución superó el tiempo límite del taller y se cortó.» / «Revisá bucles que no terminan y esperas entre hilos o goroutines que nunca se destraban.» |
| `SERVER_EXPLANATIONS.runMemory` | ídem | «El programa usó más memoria de la que el taller permite.» / «Buscá estructuras que crecen sin límite o copias grandes que no hacen falta.» |
| `SERVER_EXPLANATIONS.compileMemory` | ídem | «La compilación usó más memoria de la que el taller permite.» / «Simplificá tipos o macros muy anidados y volvé a ejecutar.» |
| `SERVER_EXPLANATIONS.threads` | ídem | «El programa lanzó más hilos de los que el taller permite.» / «Reducí la cantidad de hilos o goroutines que corren a la vez.» |
| `SERVER_EXPLANATIONS.outputLimit` | ídem | «El programa imprimió más de lo que el taller puede leer, y la salida se cortó antes de las pruebas.» / «Quitá impresiones de más (por ejemplo, dentro de un bucle) y volvé a ejecutar.» |
| `SERVER_EXPLANATIONS.evidenceInvalid` | ídem | «El programa terminó sin dejar correr todas las pruebas, o imprimió marcas que imitan las del taller.» / «Revisá que tu código no termine el programa antes de tiempo (por ejemplo, con `exit`) ni imprima líneas que empiecen como las marcas de las pruebas.» |
| `DELAY_NOTICE` | `describe-run-progress.ts` | «Está tardando más de lo habitual. Podés seguir esperando o cancelar; tu código sigue guardado.» |
| `CODE_TOO_LONG_NOTICE` | `features/run-exercise/model/code-limit.ts` | «El taller admite programas de hasta 64 KB. Reducí el código antes de volver a ejecutar.» |
| La guía, paso 02 | `lab.js` | «El taller compila tu programa en su propio entorno aislado y ejecuta los tres casos. Cada expresión debe dar `true`. Podés abrir las pruebas antes de resolverlas y agregar un caso propio.» |
| El aviso bajo «Ejecutar y revisar» | `lab.js` | «Al ejecutar, tu código viaja al servidor del taller, que lo compila y lo ejecuta en un entorno aislado. Necesita conexión. El taller agrega la entrada del programa y las pruebas; editá las funciones del ejercicio.» (sin enlace) |
| La vista previa | `lab.js` | «Este es el programa que el taller arma con tu borrador al ejecutar. Incluye la entrada del programa y las comprobaciones. Los números de línea del compilador corresponden a este programa completo. Al ejecutar, cada marca de prueba lleva un código propio de esa ejecución, que acá se muestra con ceros. Podés copiarlo y explorar cómo cada condición produce un resultado.» |
| `PROGRAM_UNAVAILABLE` **(plan)** | `lab.js` | «La vista previa no está disponible ahora: el taller todavía no mandó la plantilla del programa. Ejecutar y revisar sigue funcionando.» |
| `COPY_UNAVAILABLE` **(plan)** | `lab.js` | «Todavía no se puede copiar el programa completo: falta la plantilla del taller.» |
| El aviso del fallo de transporte | `lab.js` | «Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas. Podés seguir con las pistas y volver a ejecutar en un rato.» |
| La línea de intentos | `lab.js` | «Revisar es parte de aprender.», sin el número (Q4) |
