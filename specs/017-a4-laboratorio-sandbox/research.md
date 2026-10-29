# Investigación: A4 · Laboratorio con el sandbox propio

**Fecha**: 2026-10-28 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Modelo de datos**: [data-model.md](./data-model.md) · **Contratos**: [contracts/](./contracts/)

Las decisiones técnicas de A4, con sus alternativas, la tabla de Context7 y las mediciones de sólo lectura. Lo que todavía no está en `master` se cita con su worktree y su commit; el plan de A3 (mergeado en #71, sin implementar) se cita con sus líneas en `master` `431c9d90`.

## R0 · La base de integración

A4 se implementa sobre una base que todavía no existe entera. La fija T001 y la verifica antes de empezar.

**La rama de partida (TR-12):** F11a llega a `master` en un solo PR, al final (`ledger impl-f11a:56`), y A3 se integra sobre `f11a/base`. Mientras F11a no esté en `master`, la rama de A4 sale de `f11a/base` (o de la rama que la suceda) con A3 integrada encima, más F7a y B3. Si F11a ya llegó, sale de `master`.

| Ítem | Dónde está hoy | Qué toma A4 |
| --- | --- | --- |
| B2 | `master` (`specs/005-b2-api-ejecuciones/`) | Las tres rutas, `RunPresenter`, `RunCloser`, la plantilla y su fixture `qa/fixtures/shared/harness-cases.json` |
| F7a | `impl-f7a` en `fc88d450`, con T001 a T012 hechas; T013 a T017 pendientes (`.superpowers/sdd/plan/progress.md`) | `features/run-exercise` (puerto, runner, `buildRunResult`, adaptador de los Playgrounds), las reglas de `entities/exercise`, los E2E `lab-*.spec.ts` y `qa/e2e/lib/lab-storage.ts`, y el `lab.js` que deja T014 (plan de F7a en `master`, `specs/021-f7-laboratorio/plan.md:5005-5361`) |
| F11a | `impl-f11a` en `a7b3c71d` (`f11a/base`) | `shared/api/http` (`createApiClient`, `ApiFailure`), `entities/session` (`sessionStore`), `features/sign-in` (`requestSignIn`, `reauthenticate`), `app/account/api-client.ts`, `shared/lib/reload-document.ts` y el doble `qa/e2e/fixtures/api-double.ts` |
| A3 | Sólo el plan (`specs/016-a3-contenido-api/plan.md`, #71) | `shared/lib/wait.ts`, `shared/api/content` (`ContentCopy`, `usableCopy`, `copyOf`, `contentCopies`, `createIndexedDbCopyStore`, el doble `fake-indexed-db.ts`) y `app/boot/content-stage.ts` (`afterPublish`) |
| B3 | `impl-b3` en `72574433`, hasta T008; faltan el comando, el informe y la compuerta | Sólo su condición: la corrida de registro en verde (Q5) |

**Las firmas de A3 que usa A4** (plan de A3 y `contracts/front-interfaces.md`):

- `wait(ms: number, signal: AbortSignal): Promise<void>` (`front-interfaces.md:13`);
- `ContentCopy`, `CopiedPortion`, `ContentCopyStore`, `usableCopy(record: unknown): ContentCopy | null` y `copyOf(reading)` (`front-interfaces.md:58-80`);
- `createIndexedDbCopyStore({ factory, limitMs })` con su función interna `run(mode, operate, resultOf, fallback)` (`plan.md:2322-2391`);
- `contentCopies` y `forgetContentCopy` (`plan.md:2393-2406`);
- `createFakeIndexedDb(open)` (`plan.md:1831-1935`);
- `afterPublish(reading)` en `content-stage.ts`, que hoy escribe `copyOf(reading)` (`plan.md:3590-3600`).

Si al empezar alguno de estos nombres difiere, T001 lo anota y la tarea que lo usa toma el de la base, sin cambiar el comportamiento.

## R1 · Las tres formas del resultado (A4-3)

- **Decisión:** la forma única es `LabResultV1` (`entities/exercise/model/lab-result.ts`). A4 la unifica en dos pasos:
  1. un refactor tipado, sin cambio de conducta: `RunOutcome.result: LabResultV1`, `StoredResult` sale de `selectors.ts` (el registro guarda un `LabResultV1`, porque todo `result` entra por `sanitizeResult` o por `buildRunResult`) y `sanitizeResult` declara que devuelve `LabResultV1`;
  2. el retiro: con el cliente de los Playgrounds se van `interpretRun`, `readTestMarkers` y `RunOutcome`. Queda una sola forma.
- **Por qué en dos pasos:** el primero deja la base tipada para sumar `attemptId` en un solo lugar (FR-040) con la red en verde; el segundo depende de que nadie use el arnés viejo (FR-034). Así la unificación no parece salteada: está en T004 y termina en T024.
- **Fuente:** decisión del 2026-10-28 (noche), «Las tres formas del resultado … las unifica A4 (`RunOutcome.result: LabResultV1`)»; `ledger impl-f7a:54-55`.
- **Alternativa descartada:** borrar `RunOutcome` en el primer paso. `interpretRun` todavía lo usan el adaptador de los Playgrounds y `build-run-result.spec.ts:86` hasta la unidad 6.

## R2 · El adaptador: la cancelación y el aborto

- **Lo que dice el código de F11a:** `perform` (`shared/api/http/api-client.ts`, `impl-f11a` `a7b3c71d`) atrapa cualquier error de `fetch`, también el `AbortError`, y devuelve `{ kind: 'network' }`. Un aborto se ve igual que una red caída.
- **Decisión:**
  - el envío (`POST /api/runs`) **no lleva la señal**: abortarlo en vuelo dejaría una ejecución aceptada en el servidor, que ocupa la cuota de una activa, sin que nadie la cancele. Cuando el envío vuelve, el adaptador mira `signal.aborted`. Si se abortó y la ejecución fue aceptada, pide la cancelación y lanza `AbortError`;
  - la consulta (`GET /api/runs/{id}`) lleva la señal, y después de cada `await` el adaptador mira `signal.aborted`. Si se abortó, pide la cancelación y lanza `AbortError`;
  - la cancelación (`POST /api/runs/{id}/cancel`) **nunca lleva la señal abortada**, es de mejor esfuerzo y no se espera;
  - las esperas usan `wait(ms, signal)` de A3, que se resuelve al abortar; después de cada espera el adaptador mira la señal.
- **Por qué `AbortError`:** la feature de F7a descarta un `AbortError` y el resultado de una ejecución que ya no es la activa (contrato `run-exercise.md` §1 y §3, en `fc88d450`). El adaptador no guarda ni avisa.
- **Review Focus 1** lo fija con la spec «an abort while the submission is in flight cancels the accepted run and saves nothing».

## R3 · El calendario, los topes y la cuota de 30 por minuto

| Valor | Cifra | De dónde sale |
| --- | --- | --- |
| La espera entre consultas | `min(2000, round(300 × 1,5ⁿ))` ms: 300, 450, 675, 1013, 1519, 2000, 2000… | ADR 0005 §3 y FR-004 (de 0,3 s a 2 s) |
| Los reintentos del envío ante red o 5xx | 2 reintentos, después de 500 ms y de 1000 ms (3 envíos como mucho, con el mismo `clientRunId`) | FR-003: el plan fija el tope |
| Las fallas seguidas de la consulta | 30 s, después deja de consultar | FR-005 |
| El aviso de demora | a los 15 s del clic | FR-006 y Q3 |
| La red de seguridad | a los 12 min del clic pide la cancelación y muestra la falla del taller | FR-006 |
| La espera de turno (`active` y `queue_full`) | `round(RetryAfter × 1000 × 1,5ᵏ + azar × 1000)` ms, hasta 2 min desde el primer rechazo | FR-010 y Q3 |

**Las mediciones de B2** (SC-012 de la spec 005; spec de A4, «Riesgos», 3): mediana de 1,1 s en reposo y 9,5 s para el último de 30 cuentas a la vez. El aviso de 15 s queda por encima del peor caso medido, así que en un aula normal no aparece. El primer valor del calendario (300 ms) es el que usa el check de B2 en reposo.

**La cuota de 30 pedidos por minuto** (`RunLimiters::register`, `throttle:runs-submit`, sólo en `POST /api/runs`; la cancelación y la consulta no la gastan: `routes/api/runs.php`). Con `active` (`Retry-After: 3`, el peor caso), las esperas son 3, 4,5, 6,75, 10,1, 15,2, 22,8 y 34,2 s (más hasta 1 s de azar). Sin el azar, los envíos caen en los segundos 0, 3, 7,5, 14,3, 24,4, 39,6, 62,3 y 96,5: son 8 en dos minutos y, en cualquier ventana de 60 s, 6 como mucho. Con `queue_full` (`Retry-After: 10`): 10, 15, 22,5 y 33,75 s, son 5 envíos. Una espera fija de 3 s llegaba a 40 envíos en dos minutos, por encima del límite: por eso la espera crece.

- **El azar se inyecta** (`RunClock.random`), así que las specs son deterministas.
- **Alternativa descartada:** temporizadores falsos de Vitest (`vi.useFakeTimers` con `advanceTimersByTimeAsync`, Context7). El adaptador recibe un reloj (`now`, `wait` y `random`), como el cliente de F11a recibe `fetch`: la spec registra cada espera pedida y comprueba el calendario sin correr el tiempo.

## R4 · El reparto de las respuestas

Dos funciones puras deciden qué hacer con cada `ApiResult` de F11a: `decideSubmit` (envío) y `decidePoll` (consulta). La tabla completa está en [data-model.md](./data-model.md), «Las decisiones del adaptador». Tres puntos que no salen de la spec:

1. **`quota` se perdía.** `failureOf` (`api-client.ts`, `a7b3c71d`) guarda `message`, `code`, `fieldErrors` y `retryAfterSeconds`, y descarta `quota`. Sin él, `active` (esperar turno) y `per_minute` (no reintentar) son iguales. A4 suma `quota?: string` a `ApiFailure` (opcional, así las fábricas y las specs de F11a no cambian) y lo llena en `failureOf`.
2. **Un 419 ya lo resuelve el cliente:** `send` pide `GET /api/session` y repite una vez si la cuenta es la misma. Devuelve `signed-out` si no hay sesión (A4 lo trata como 401) o `account-changed` con el mensaje (A4 lo muestra y no reintenta).
3. **Un 422 con `errors.exerciseId`** (el ejercicio que el servidor retiró): el mensaje del campo más «Recargá la página para traer el contenido al día.» (spec, «Edge Cases»).

## R5 · La unión del progreso y su texto

El ejemplo del contrato de F7a (`run-exercise.md` §2) no alcanza:

- «Esperando turno para ejecutar: vuelvo a intentar en {N} s.» necesita los segundos;
- el aviso de demora **se suma** al estado que se ve («la revisión suma el aviso de demora», US4-3), no lo reemplaza.

**Decisión:**

```ts
export type ApiRunPhase =
  | { readonly kind: 'queued'; readonly position: number }
  | { readonly kind: 'running' }
  | { readonly kind: 'waiting-turn'; readonly retryInSeconds: number };

export interface ApiRunProgress {
  readonly phase: ApiRunPhase;
  readonly delayed: boolean;
}
```

- `progress: null` (el estado con que la feature empieza) se lee como «Ejecutando código real…».
- `describeRunProgress(progress)` devuelve `{ line, announcement, delayNotice }`:
  - `line` es la línea visible, con el lugar en la fila;
  - `announcement` cambia sólo con el tipo de estado, sin el número;
  - `delayNotice` es el aviso de demora o `null`.
- Las dos se exportan del índice de la feature. F7b T025 usa ese nombre (`plan-f7b.md:6395`): «se usa la que A4 deje en la base».

## R6 · La región viva y el foco (FR-039, US4-7 y A4-10)

- **El problema:** `#lab-review` es `aria-live="polite"`. Si el lugar en la fila se repinta adentro, cada cambio se anuncia. Además, con F7a, cada `report()` llama a `updateRunUI`, que reemplaza el `innerHTML` de la revisión con el botón «Cancelar ejecución» adentro, y quien tiene el foco lo pierde.
- **Decisión:** la revisión en curso tiene tres nodos con id:
  - `#lab-run-line`, la línea visible, con `aria-live="off"`: Chrome toma la política del ancestro más cercano con `aria-live`, así que sus cambios no se anuncian;
  - `#lab-run-announcement`, un `<p class="sr-only">` (la clase ya existe en `frontend/styles.css:1687`), que cambia sólo cuando cambia el tipo de estado, y eso se anuncia una vez;
  - `#lab-run-delay`, el aviso de demora, un `<p class="coach-callout">` con `hidden` hasta que aparece.

  Mientras la ejecución sigue en curso, `updateRunUI` escribe sólo esos tres nodos, y sólo si su texto cambió. El botón conserva su nodo y su foco.
- **Cómo se prueba:**
  - una E2E pasa el lugar de 3 a 1 y comprueba que el anuncio sigue en «En la fila del taller.», que la línea dice «sos el número 1.» y que el botón conserva el foco;
  - la spec de `describeRunProgress` fija que el anuncio no lleva el número;
  - el lector de pantalla se comprueba a mano (X2), y el quickstart lo pide.

## R7 · Las líneas de evidencia (FR-017)

- **Lo que pasa:** el navegador no conoce el nonce, y el servidor no exige que el marcador esté al principio de la línea (`harness-template.md`, «El protocolo de evidencia»).
- **Decisión:** se borra cada aparición de `__TALLER_TEST__<32 hex>:<id>:PASS|FAIL` y de `__TALLER_END__<32 hex>:<n>`.
  - Una línea que queda vacía, o sólo con espacios, se va.
  - Una línea con texto del alumno pegado al marcador (`print!` sin salto de línea) conserva ese texto.
  - Una marca que imita las del taller con otro largo no se toca: el alumno la ve, y el servidor ya la contó como `evidence_invalid`.
- **Review Focus 3.**

## R8 · La explicación que gana al diagnóstico (FR-018)

- **Decisión:** el adaptador antepone la explicación a la salida de error: `explicación + "\n\n" + stderr` (o sólo la explicación, si no hay salida).
- `diagnose` mira primero las seis explicaciones del servidor (`SERVER_EXPLANATIONS`, en `entities/exercise/model/server-explanations.ts`) con `startsWith`, y devuelve su «Probá esto». Recién después mira las reglas del lenguaje.
- Como la explicación queda guardada en `stderr`, la revisión muestra lo mismo después de recargar.
- **Alternativa descartada:** un campo nuevo en el `result` v1. D1b rechaza los campos desconocidos (spec, «Alternativas consideradas»).

## R9 · El renderizador de la plantilla (FR-026 a FR-028)

`renderHarness` es un port línea por línea de `ProgramRenderer.php` (`backend/api/app/Runs/Program/ProgramRenderer.php`, en `master`):

- recorre `template.split('\n')` y une con `join('\n')`, como `explode` e `implode`. El salto final de la plantilla da el salto final del programa;
- los marcadores se reemplazan con una **función** (`replace(PATTERN, (match, name) => …)`), nunca con un texto de reemplazo, porque `$&` o `$1` en el código del alumno se interpretarían;
- la pasada es única: un `{{id}}` dentro del código sale tal cual;
- la prueba propia se recorta sólo de `' '`, `'\t'`, `'\n'` y `'\r'` (`Whitespace::trim`). `String.prototype.trim` también quitaría el espacio de no separación, y un caso del fixture lo prohíbe;
- los `imports` van sólo en Go, sin `fmt` y sin repetidos, en el orden de la primera aparición.

La spec lee `qa/fixtures/shared/harness-cases.json` del repositorio, sin regenerarlo, y compara los 11 casos línea por línea (SC-005). El nonce de la vista previa son 32 ceros (`PREVIEW_NONCE`), del mismo largo que el real.

## R10 · Dónde se guarda la plantilla (FR-029 y A4-13)

**El problema, en el plan de A3:**

- `afterPublish` escribe `copyOf(reading)` después de cada arranque con servidor, también cuando sólo confirma la versión (`plan.md:3590-3600`);
- `copyOf` arma las 17 porciones, así que una porción extra se pierde en cada arranque;
- FR-016 de A3 borra la copia antes de publicar otra versión.

Guardar la plantilla «como porción opcional» sin tocar eso la perdería en cada recarga, y la revalidación con `If-None-Match` no tendría `ETag` que mandar.

| Opción | Qué hace | Costo |
| --- | --- | --- |
| **(a) Porción opcional en el registro, con arrastre** | `portions.harness` en el registro de la copia; un `update(change)` del almacén lee y escribe en **una** transacción de IndexedDB; `afterPublish` arrastra la plantilla del registro anterior y el laboratorio la suma | Toca tres archivos de A3 (`indexeddb-copy-store.ts`, `content-stage.ts` y su doble de IndexedDB); cumple FR-029 literal |
| (b) Porción opcional, sin arrastre | Igual, pero A3 no cambia | Cada arranque con servidor la borra: el primer laboratorio de cada carga pide 200 (unos 1,5 KB); la revalidación con `If-None-Match` sólo vale dentro de la página y en la copia sin servidor |
| (c) Sólo en memoria | Ni copia ni IndexedDB | Enmienda FR-029: sin servidor no hay vista previa |

- **Decisión del plan: (a).** Es lo que piden FR-029 y A4-13. La escritura en una transacción también evita que el laboratorio y el arranque se pisen: dos transacciones `readwrite` sobre el mismo almacén se ordenan, y la segunda ve lo que dejó la primera.
- **Las reglas de A3 se conservan:**
  - la plantilla se guarda sólo si hay una copia usable (`usableCopy`);
  - `forgetContentCopy` la borra con el registro;
  - un cambio de versión la descarta, porque A3 borra la copia.
- **Lo que arrastra el arranque:** `afterPublish` usa `harnessToCarry`, que mira el formato y la forma de la plantilla sin volver a validar las 17 porciones (la fuente de A3 ya validó esa copia en el arranque, y la plantilla se revalida con su `ETag`). El laboratorio lee con `harnessOf`, que exige una copia usable.
- **Cuándo se pide:** al montar el laboratorio. El contador de pedidos de las E2E de A3 cuenta sólo las porciones y la sesión (plan de A3, :4291), así que la plantilla no cambia esos conteos. Si T001 encuentra una E2E congelada que cuenta todos los pedidos a `/api/` en una URL del laboratorio, T020 usa la variante B: pedirla la primera vez que se dibuja «Experimentá», donde se usa. Es la lectura «cuando el laboratorio la necesita» de FR-029.
- **Pedido al usuario:** D1 del informe, con la recomendación (a).

## R11 · La raíz de composición y las capas

- **El problema de las capas:**
  - `features/run-exercise` no puede importar `features/sign-in`;
  - el índice de `features/sign-in` exporta `AccessGate` (React);
  - `lab.js` se evalúa en el contexto VM de `qa/lab-state-check.ts`, con un `document` falso: si arrastrara React y `react-dom`, el check podría fallar al evaluar el bundle.
- **Decisión:**
  - **`features/sign-in/requests.ts`** es una segunda entrada del slice, sin vista, con `requestSignIn` y `reauthenticate`. El precedente es `pages/lab/composition.ts` de F7b (`plan-f7b.md:200`) y los `bridge.ts` de F2b;
  - **`app/lab/server-execution.ts`** arma `labTransport` (el adaptador con el cliente de F11a, la cuenta de `sessionStore`, «pedir el ingreso», `crypto.randomUUID`, `wait` y el reloj), `labHarness` (la plantilla) y `labProgramBuilder`. Ningún import de un índice de `entities` (R4 de `seams-guard`) ni un import profundo (R6);
  - **`lab.js`** importa esos tres nombres y cambia las dos líneas de F7a (`transport:` y `programBuilder`). Así F7b T018 detecta la rama B con su `grep` (`plan-f7b.md:308`), porque `createPlaygroundTransport` y `buildPlaygroundProgram` desaparecen de `lab.js`.
- **La cuenta:** `sessionStore.getState().user?.id`. Si es `null` (no debería pasar después del arranque), el envío sale sin `X-Taller-User`, el servidor responde 401 y el laboratorio pide el ingreso.

## R12 · El tope de 64 KiB (FR-002, A4-8)

- **Decisión:** la opción (d) del informe de F7a: una guarda en la raíz de composición.
- En `runExercise` de `lab.js`:
  1. si ya hay una ejecución, no hace nada;
  2. si `exceedsCodeLimit(borrador)` (más de 65 536 bytes en UTF-8), avisa «El taller admite programas de hasta 64 KB. Reducí el código antes de volver a ejecutar.» y no llama a `runner.run`;
  3. si no, delega.
- No hay pedido, ni intento, ni resultado guardado, y el aviso gana al del bloqueo de la campaña.

## R13 · El doble de las E2E (A4-6, TR-11)

- **`CompilerDouble`** pasa a montarse sobre el `ApiDouble` de F11a:
  - conserva su interfaz (`answer`, `hold`, `answerWithCustom`, `answerLater`, `requests` y `bodies`), así que las E2E que sólo lo llaman no se editan;
  - responde el envío con 202 y la ejecución en la fila, la consulta con el estado y la cancelación con 200.
- **`requests` cuenta envíos**, uno por `clientRunId`. Con la red caída hay tres `POST` del mismo envío, y `toHaveLength(1)` sigue siendo verdad: el «conteo de pedidos (un envío)» de FR-042 no hace editar las E2E.
- **El `ApiDouble` canónico, sin otro `replyTo` ni otra búsqueda** (decisión del 2026-10-28, noche):
  - usa `ApiReply.abort?: boolean` y `ApiCall.ifNoneMatch`, que suma A3 (plan de A3, :4399). Si A3 no los dejó, T018 los suma con esa misma forma. `route.abort()` usa `'failed'` por omisión (Context7);
  - suma un manejador por omisión de `GET /api/harness`, que sirve `build/harness.json` con su `ETag` y responde 304 a `If-None-Match`. Sin él, cada E2E que abre el laboratorio dejaría un pedido sin manejar.
- **Los ids de las ejecuciones** son UUID fijos (`0199f4a2-0000-7000-8000-00000000000N`), y el doble registra `GET` y `cancel` por id exacto, como pide la forma canónica.

## R14 · Las pruebas que cambian (medido, no tomado de la spec)

`git grep` en `impl-f7a` (`fc88d450`) y en `master`, de `runCode(`, `compiler.`, `attempts`, `attemptsLine`, `writes()`, `__TALLER_TEST__`, `programPreview` y `PLAYGROUND`:

| Archivo | Pruebas que se editan | Motivo |
| --- | --- | --- |
| `qa/e2e/specs/cycle.spec.ts` (F1) | 8: la constante del transporte y los dos títulos de `describe` | El detalle del fallo de transporte («No se pudo conectar con el taller.») y los títulos que nombran el Playground |
| `qa/e2e/specs/guards.spec.ts` (F1) | 1: «a request to a public host…» | El pedido a un host público ya no sale al ejecutar (FR-042) |
| `qa/e2e/specs/lab-run.spec.ts` (F7a) | 10 de 14 | Los 3 del `for`, «first approval», «Ctrl/⌘ + Enter» y «quirk 8», por el número de intentos y por `attempts`; «cancelling», porque ya no hay escritura ni intento; «back to the map», que esperaba el `requestfailed` del Playground; «leaving the lab», porque sin el intento el laboratorio no escribe y `storedRecord` leía una clave que no existe; y «your own case», con la aserción de `:280` (A4-1) |
| `qa/e2e/specs/lab-exercise.spec.ts` (F7a) | 1: `:103` | La vista previa lleva el nonce entre `__TALLER_TEST__` y `t1` |
| `qa/lab-state-check.ts` (check) | 2: «Two tabs: a run keeps…» y «Reset during a run…» (los deja así T014 de F7a) | Esperan `attempts` 1 y un `fetch` del Playground |
| `frontend/src/features/run-exercise/model/build-run-result.spec.ts:86` | 1 | Compara con `interpretRun`, que se retira: pasa a valores escritos |

- **Sin editar:**
  - las otras 4 de `lab-run.spec.ts` («transportError», «changing the phase», «the next and the previous» —que abre otro ejercicio y por eso guarda— y «goes stale»);
  - los 2 del indicador en `css-contract.spec.ts`, que sólo llaman a `compiler.hold`;
  - el resto de F1 y de A2.
- **«KNOWN DEFECT (spec 021, quirk 8)»:** A4 corrige ese defecto (las ejecuciones canceladas y las fallas de transporte ya no suman intentos). Por la regla de `qa/AGENTS.md`, la prueba cambia en su commit TDD y pierde el `KNOWN DEFECT`.
- **La aprobación:** las 20 E2E editadas van en un solo commit, con la aprobación del usuario (D2 del informe).

## R15 · FR-047: la verificación contra el stack

- **Decisión:** una verificación manual declarada, con una lista en `quickstart.md` §6, más una medición por script para SC-007.
- **Por qué no un proyecto de Playwright contra el stack:**
  - el ADR 0008 corre Playwright sin API;
  - una cuenta de prueba exige el alta por invitación (no hay comando de consola para cuentas: hoja de ruta del backend, :204);
  - la sesión dura 30 minutos.

  Mantenerlo costaría más que la verificación que da.
- **La medición de SC-007:** `qa/api-runs-check.ts` (B2) ya abre 30 cuentas y mide un aula con un intervalo fijo. A4 le suma una medición con el calendario del laboratorio (`pollDelayMs`), que cuenta los 429 de Nginx en las consultas y el tiempo del último. Es medición, sin objetivo previo.
- **La condición de Q5:** la corrida de registro de B3 en verde. T001 la exige y el PR cita su resumen.

## R16 · El backend (FR-024 y FR-025)

- `RunPresenter::present` suma `'attemptId' => $run->attemptId` **al final** del arreglo. Es aditivo: el orden de los otros 18 no cambia.
- `RunReader::view` ya lee la fila con `attempt_id`, y `RunCloser::closeWithin` lo escribe en todo cierre, también `canceled` e `infra_error` (`app/Runs/Execution/RunCloser.php:57-65`; `RunCanceller` cierra la ejecución en la fila con `closeWithin`). El controlador de la cancelación relee la fila después de confirmar (`RunController::cancel`).
- Las dos pruebas de forma exacta de `tests/Unit/Runs/RunPresenterTest.php` pasan de 18 a 19 claves. Otras aserciones de forma exacta sobre la ejecución: `grep -rn "CONTRACT_KEYS\|toBe(\[" tests/Feature/Runs` no da otras.
- **`RunPresenter.php` está fuera de `AUDITED_SURFACE`** (`impl-b3`, plan de B3 :3970-3989). El PR de A4 no lleva el resumen de la auditoría, y A4 no toca `content/harness/` ni `tools/content/harness.ts`.
- **El contrato ampliado** se publica en [contracts/runs-api-attempt-id.md](./contracts/runs-api-attempt-id.md). La spec 005 no se edita (principio VIII).
- **SC-004, la importación:** el «reutiliza ese intento» ya lo fija D1b (`tests/Feature/Progress/Import/LegacyAttemptsTest.php:108`, «reuses the attempt that the result names when it belongs to the account and the exercise»). A4 fija la otra mitad: el `attemptId` publicado es el `attempts.id` que cerró la ejecución, de la misma cuenta y del mismo ejercicio. Las dos juntas dan SC-004 sin un test que cruce los dos mundos de prueba; el quickstart §6 lo repite contra el stack.

## R17 · Lo que se retira y su reemplazo (FR-034, FR-044 y US8-3)

**`runner-check`, sus 12 escenarios** (`qa/runner-check.ts`):

| Escenario | Reemplazo |
| --- | --- |
| Rust payload and output | `api-runs-transport.spec.ts`: «the submission carries only clientRunId, exerciseId, code and customTest» |
| invalid or empty source makes no request | La spec del runner de F7a (borrador en blanco) y `code-limit.spec.ts` |
| Go payload, stdout and stderr | Se retira: no hay formato del Playground. `run-verdict.spec.ts` fija las salidas del servidor |
| Go compilation failure and nil events | `run-verdict.spec.ts`, `compile_error` |
| Go nonzero exit cannot pass | `run-verdict.spec.ts`, `runtime_error` y la batería de SC-002 |
| Rust compiler diagnostics remain exact | `run-verdict.spec.ts`: la salida de error sin marcas, igual byte a byte |
| rate limit is a transport error | `run-decisions.spec.ts`, los 429 |
| unrecognized service response cannot pass | `server-run.spec.ts` y `run-decisions.spec.ts`, la respuesta ilegible |
| invalid JSON cannot pass | El cliente de F11a (JSON inválido da `unexpected`) y `run-decisions.spec.ts` |
| network failure is explained | `api-runs-transport.spec.ts`, la red caída después de 3 envíos |
| pre-cancelled request never fetches | `api-runs-transport.spec.ts`: «an aborted signal sends nothing» |
| deadline aborts the request | Se retira: no hay tope de 60 s (FR-006). Lo reemplaza la red de seguridad de 12 min |

**`exercise-evidence-check`:**

- **Se retiran sus 13 escenarios de `interpretRun`** (`qa/exercise-evidence-check.ts:103-252`). Lo que fijaban pasa a `run-verdict.spec.ts`:
  - todas en `pass` aprueban; una en `fail` no;
  - una marca ausente o repetida es `missing`;
  - la prueba propia no cuenta para aprobar;
  - la falla de transporte no es una compilación;
  - los recortes siguen en `build-run-result.spec.ts`.
- **Se quedan** los de `hasPassingEvidence`, `testPassed` y `syncAfterRun`.

**`runtime-check`:** se retira con A4. La auditoría de B3 (`npm run api:audit`) lo reemplaza (Q5; plan de B3, :4697).

## R18 · El delta si F7b entra antes que A4

- **La regla:** la fila de A4 en la hoja de ruta del backend y el ruling C4 dicen que la vista vigente dibuja los estados. A4 se planifica contra `lab.js`, porque F7b no tiene implementación.
- **Si F7b entra antes,** cambian los archivos de la unidad 5, no el resto:

| En `lab.js` (este plan) | Con F7b |
| --- | --- |
| Las dos líneas del runner y `programBuilder` | Las mismas dos en `frontend/src/app/legacy/lab-api.ts` (`plan-f7b.md:6635-6684`), con `createExerciseRunner<ApiRunProgress>` |
| `labHarness.refresh()` en `mount` | En el `mount` de `register-lab.tsx`; la página se suscribe con `useSyncExternalStore(labHarness.subscribe, labHarness.current)` para repintar la vista previa |
| La revisión en curso (`runningReviewHTML` y el repintado de la línea) | `RunningReview` de `pages/lab/ui/exercise/Review.tsx` recibe `describeRunProgress(progress)` y dibuja la línea, el anuncio y el aviso en nodos estables, como T025 de F7b |
| Los textos (guía, aviso, vista previa, fallo e intentos) | `ExecutionGuide`, `CodePhase`, `Review` y `FinishedReview` |
| La guarda de 64 KiB en `runExercise` | En `run` de `CodePhase.tsx` |
| Los escenarios de `lab-state-check` | Los mismos, con `loadLab` sobre `lab-api.ts` |

- **No cambian:** el backend, las unidades 2 a 4 y 6, las E2E (pasan igual con la página) y la regla de F7b T018, que detecta la rama B.

## Context7

Servidor `mcp__44441c24-…` (el primero agotó la cuota del mes). Versiones contrastadas con `package-lock.json` y `backend/api/composer.lock` en `master`.

| Librería | Versión | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| Playwright (`/microsoft/playwright/v1.63.0`) | 1.63.0 | `page.clock`: `install`, `fastForward`, `runFor` y `setFixedTime` | `install` deja correr el tiempo; `fastForward` dispara una vez los temporizadores vencidos; `setFixedTime` fija `Date.now` y deja correr los temporizadores | Sí: la E2E de la demora usa `install` y `fastForward(15_000)`; las de F7a con `setFixedTime` siguen igual |
| Playwright | 1.63.0 | `route.abort(errorCode)` y el orden de los manejadores | `abort()` usa `'failed'` por omisión; con varias rutas gana la última registrada | Sí: la red caída es `ApiReply.abort` (de A3) dentro del `ApiDouble`, sin rutas propias |
| Vitest (`/vitest-dev/vitest/v5.0.3`) | 5.0.3 | `vi.fn`, `mock.calls` y las tablas | `test.for` es la forma recomendada para casos con objeto (`$propiedad` en el nombre); `test.each` queda por compatibilidad | Sí: las tablas usan `it.for` |
| Vitest | 5.0.3 | `useFakeTimers` y `advanceTimersByTimeAsync` | Sirven para código que encadena promesas y temporizadores | No: el adaptador recibe el reloj (R3), y las specs no corren tiempo |
| Zustand (`/pmndrs/zustand/v5.0.12`) | 5.0.15 | `createStore` de `zustand/vanilla`, `subscribe` y `setState(…, true)` | El oyente recibe el estado; con `replace` hay que dar el estado completo | No: A4 no crea stores; `lab.js` lee `runner.state` como en F7a |
| fishery (`/thoughtbot/fishery`) | 2.4.0 | `Factory.define`, `build` con parámetros y los arreglos | `build` fusiona en profundidad y **los arreglos reemplazan** a los del generador | Sí: `serverRunFactory.build({ tests: […] })` reemplaza la lista entera |
| Laravel (`/laravel/docs/__branch__13.x`) | 13.34.0 | Las pruebas HTTP: `assertJsonPath` y `assertExactJson` | `assertJsonPath` comprueba un valor por ruta con puntos | Sí: las pruebas de Pest usan `assertJsonPath('data.attemptId', …)` |
| Pest (`/pestphp/pest/v5.3.3`) | 5.3.0 | Las tablas con nombre y el encadenado | Context7 no tuvo resultado en ese ID: se usó `/pestphp/docs` (5.x) | — |
| Pest (`/pestphp/docs`) | 5.3.0 | `->with([...])` con claves y `expect()->and()` | Las claves del arreglo dan el nombre del caso y `and()` encadena | Sí: el caso de cada estado final va en una tabla con nombre |
| PHPStan (`/phpstan/phpstan`) | 2.2.17 (nivel 9) | El nivel 9 y `mixed` | En el nivel 9 un `mixed` sólo se pasa a otro `mixed` | No: `present()` sigue devolviendo `array<string, mixed>` y `attemptId` es `?int` |
| Docker Compose (`/docker/compose/v5.5.1`) | la del host | `up --wait` y `--profile` | `--wait` espera los servicios sanos e implica `-d`; `--profile` habilita servicios opcionales | No: el quickstart usa los comandos de `AGENTS.md` |
| gVisor (`/websites/gvisor_dev`) | la del host | Cómo confirmar el runtime | `docker run --runtime=runsc` y `dmesg`, que no sirve como prueba de seguridad | Sí: el quickstart §6 confirma `EXECUTOR_RUNTIME=runsc` por la configuración del ejecutor, no con `dmesg` |
| React 19, Testing Library y jsdom | 19.2.8; 16.3.3; 30.1.2 | — | A4 no escribe componentes en la rama de `lab.js`; el delta de F7b (R18) usa los de F7b | No aplica |
| Vite, nuqs y React Hook Form | — | — | A4 no los configura ni los usa | No aplica |

## Mediciones de sólo lectura

- **Las aserciones que cambian:** `git -C impl-f7a grep -n "attempts\|attemptsLine\|compiler\.\|PLAYGROUND" fc88d450 -- qa/e2e` dio:
  - `cycle.spec.ts:21`, `:60`, `:74`, `:82`, `:99`, `:113` y `:121`;
  - `css-contract.spec.ts:410`;
  - `lab-run.spec.ts` en 23 líneas.

  `grep -n "__TALLER_TEST__" lab-exercise.spec.ts` dio `:103`.
- **Los usos de lo que se retira:**
  - `buildProgram`: `lab.js` (hasta T014 de F7a), `playground-transport.ts` y `runtime-check.ts`;
  - `interpretRun`: `run-outcome.ts`, `exercise-evidence-check.ts` y `build-run-result.spec.ts:2`;
  - `shared/api/playground`: `register-runner.ts` (lo retira F7a T015), `playground-transport.ts` y `runner-check.ts`.
- **Los hosts públicos** en `master`: `git grep -ln "play.rust-lang\|play.golang\|go.dev/play"` da `README.md`, `docker/nginx/nginx.conf`, ADR 0005, ADR 0008, `frontend/lab.js`, `frontend/src/shared/api/playground/protocol.ts`, `qa/e2e/lib/compiler-results.ts`, `qa/runner-check.ts` y `qa/runtime-check.ts`. Los ADR quedan (son historia), salvo la nota que pide FR-045 en el 0008.
- **El tope del HTML:** `BOOT_SIZE_LIMIT = 1500000` en `qa/build-check.ts:11` (#76). A4 suma el renderizador, el adaptador y la plantilla, del orden de 10 KB sin comprimir, y quita el cliente de los Playgrounds. T001 mide `bootSize` y T029 lo vuelve a medir.
- **`import.meta` (TR-4):** A4 no suma entradas a `LEGACY_MODULES`. El conteo de la base (después del retiro de `register-runner` en F7a T015) no cambia.

## El prototipo de sólo lectura

En el scratchpad, con Node 24 y el código de los bloques del plan copiado tal cual (sin tocar los worktrees):

| Qué | Resultado |
| --- | --- |
| `renderHarness` contra `qa/fixtures/shared/harness-cases.json` y las plantillas reales | 11 de 11 casos iguales, línea por línea |
| `renderHarness` con `$&$1$$` en el código | Sale tal cual |
| `createServerProgramBuilder`, los dos casos de su spec (Rust con ceros; Go con `imports` y prueba propia) | Iguales a lo esperado |
| `withoutEvidence`, los cinco casos de las specs | Los cinco dan lo esperado |
| `pollDelayMs(0…6, 20)` | 300, 450, 675, 1013, 1519, 2000, 2000, 2000 |
| `turnDelayMs` | 3000, 4500, 6750, 3500 y 10 999 |
| La cola llena (`Retry-After: 10`, sin azar) | Envíos en 0, 10 000, 25 000, 47 500 y 81 250 ms |
| `active` con el azar al máximo | Envíos en 0, 3 999, 9 498, 17 247, 28 371, 44 558, 68 338 y 103 509 ms; 6 en el minuto más cargado |
| `retryHint` con los ocho valores de la spec | Los textos esperados |
| Los bytes de `'€'` × 21 845 y × 21 846 | 65 535 y 65 538 |
| La traza de la demora | El aviso a los 15 000 ms; las consultas en 300, 750, 1425, 2438, 3957, 5957, 7957, 9957, 11 957, 13 957, 15 957, 17 957 y 19 957 ms |

No corrieron, porque necesitan F7a, F11a y A3 integrados: el adaptador con sus 20 pruebas, `decideSubmit` y `decidePoll`, la copia en IndexedDB, `lab.js` y las E2E. Sus valores esperados salen de los contratos y de la traza de arriba.
