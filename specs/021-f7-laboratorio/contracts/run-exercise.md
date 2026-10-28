# Contrato · `features/run-exercise` (F7a)

**Spec**: [spec 021](../spec.md), FR-043 a FR-052 · **Plan**: [plan.md](../plan.md), sección 3 · **Decisiones**: [research.md](../research.md), R1 a R10

Es la interfaz pública que A4 consume (spec 017): A4 cambia el adaptador de transporte y el constructor del programa, en la raíz de composición, sin tocar la orquestación. Las firmas son las del código del plan (T011 y T012), verificadas en el prototipo. La API pública es `frontend/src/features/run-exercise/index.ts`, y nadie importa otro archivo de la feature.

## 1. El puerto (`model/transport.ts`)

```ts
import type { ExerciseLanguage } from '../../../entities/exercise';

export interface RunnableExercise {
  readonly id: string;
  readonly language: ExerciseLanguage;
  readonly tests: readonly { readonly id: string; readonly expression: string }[];
  readonly imports?: readonly string[];
}

export interface RunRequest {
  readonly exercise: RunnableExercise;
  readonly draft: string;
  readonly customTest: string;
  readonly signal: AbortSignal;
}

export interface ExecutedVerdict {
  readonly kind: 'executed';
  readonly success: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly tests: ReadonlyMap<string, boolean>;
  readonly customPassed: boolean;
  readonly attemptId?: number;
}

export interface TransportFailureVerdict {
  readonly kind: 'transport-failure';
  readonly message: string;
  readonly attemptId?: number;
}

export type RunVerdict = ExecutedVerdict | TransportFailureVerdict;

export type ReportProgress<Progress> = (progress: Progress) => void;

export interface ExerciseTransport<Progress = never> {
  readonly countsLocalAttempts: boolean;
  run(request: RunRequest, report: ReportProgress<Progress>): Promise<RunVerdict>;
}

export type ProgramBuilder = (
  exercise: RunnableExercise,
  draft: string,
  customTest: string,
) => string;
```

**La entrada** (FR-045, F7-S2):

- `exercise` es el ejercicio del catálogo: el objeto entero, que cumple `RunnableExercise`;
- `draft` es el borrador tal cual, sin recortar;
- `customTest` es la prueba propia normalizada con `normalizeCustomTest`, que es `trim()` de JavaScript, y `''` si no hay. Nunca llega una prueba propia en blanco;
- `signal` se aborta al cancelar o al abortar;
- el programa armado no viaja nunca.

**La salida es un veredicto, no la salida cruda** (FR-046, F7-S3):

- **`executed`** dice si compiló y terminó bien (`success`) y trae las salidas sin recortar, el veredicto de cada prueba esperada por id en `tests` (una clave ausente es una prueba que no pasó) y el de la prueba propia en `customPassed`;
- **`transport-failure`** trae el mensaje que va a ver el alumno;
- **`attemptId`** es opcional, y hoy ningún adaptador lo da.

La feature no lee marcas.

**La política de intentos** (FR-047, F7-S4): `countsLocalAttempts` se lee antes de ejecutar. Si es `true`, la feature suma `attempts` y guarda antes de llamar a `run`, así que una ejecución cancelada o fallida cuenta, como hoy.

**El canal de progreso** (FR-048, F7-Q2): `report(progress)` avisa un cambio de estado de la espera. Mientras la ejecución es la activa, la feature lo expone en `state` tal como llega, sin leerlo. Un aviso que llega después de cancelar se ignora.

**El adaptador:**

- no guarda nada, no avisa al alumno y no lee el almacén;
- si lanza un error que no es `AbortError`, la feature lo trata como una falla de transporte con su mensaje (research.md, R6);
- al abortarse la señal puede resolver lo que quiera: la feature lo descarta por identidad (R3).

## 2. El estado de la ejecución (`model/run-state.ts`)

```ts
export interface IdleRun {
  readonly status: 'idle';
}

export interface ActiveRun<Progress> {
  readonly status: 'running';
  readonly exerciseId: string;
  readonly progress: Progress | null;
}

export type RunState<Progress = never> = IdleRun | ActiveRun<Progress>;

export const IDLE_RUN: IdleRun = Object.freeze({ status: 'idle' });
```

- **Los estados de hoy** son `idle` y `running`. Al empezar, `progress` es `null`.
- **Se lee sin React:** es un store de `zustand/vanilla`. `lab.js` se suscribe con `runner.state.subscribe(() => updateRunUI())`, y F7b usa `useStore(runner.state, (state) => state.status)`, con un selector chico.
- **La unión se amplía sin editar la feature** (research.md, R1). A4 declara su progreso en su adaptador y crea el runner con su tipo:

  ```ts
  type ApiRunProgress =
    | { phase: 'queued'; position: number }
    | { phase: 'waiting-turn' }
    | { phase: 'delayed' };
  const runner = createExerciseRunner<ApiRunProgress>({ transport: createApiRunsTransport(…), … });
  ```

- **El foco con los avisos de progreso (FR-039 de A4).** En F7a, `lab.js` repinta con `updateRunUI` en cada cambio de `state`, y eso reemplaza el `innerHTML` de `#lab-review`, con el botón «Cancelar ejecución» incluido. Con los Playgrounds sólo pasa al empezar y al terminar. Con A4 cada `report()` lo repintaría, y quien tiene el foco en «Cancelar ejecución» lo perdería. A4 repinta sólo la línea de estado mientras siga en `running` y conserva el nodo del botón.

## 3. La orquestación (`model/create-exercise-runner.ts`)

```ts
export const LOCKED_NOTICE = 'Completá los requisitos de esta misión en tu campaña.';
export const EMPTY_DRAFT_NOTICE = 'Escribí una solución o restaurá el inicio.';
export const CANCELLED_NOTICE = 'Ejecución cancelada. Tu código sigue guardado.';
export const FIRST_SOLVE_NOTICE =
  '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.';
export const SOLVED_AGAIN_NOTICE = 'Estos casos siguen funcionando. Probá una variante.';
export const TRANSPORT_FALLBACK = 'No se pudo conectar al compilador.';

export interface RunnerStore {
  getProgress(): LabStateV1;
  save(): boolean;
}

export interface ExerciseRunnerDependencies<Progress = never> {
  store: RunnerStore;
  transport: ExerciseTransport<Progress>;
  now: () => number;
  notify: (message: string) => void;
  isLocked: (exercise: Exercise) => boolean;
  isCampaignMission: (exercise: Exercise) => boolean;
  syncSystems: () => void;
  syncCampaign: () => { xpGained?: number } | undefined;
  logError: (error: unknown) => void;
}

export interface ExerciseRunner<Progress = never> {
  readonly state: StoreApi<RunState<Progress>>;
  run(exercise: Exercise): Promise<void>;
  cancel(): void;
  abort(): void;
}

export function createExerciseRunner<Progress = never>(
  dependencies: ExerciseRunnerDependencies<Progress>,
): ExerciseRunner<Progress>;
```

**Las dependencias se inyectan todas** (FR-043): el almacén, el reloj, el aviso, el bloqueo, las dos sincronizaciones, la consulta de misión y el registro de errores. La feature importa sólo `zustand/vanilla` y el índice de `entities/exercise`, nunca un motor (lo vigila `index.spec.ts`).

**`run(exercise)`**, en orden (FR-043, «La ejecución hoy» de la spec):

1. Si ya hay una ejecución activa, no hace nada.
2. Si `isLocked(exercise)`, avisa `LOCKED_NOTICE` y termina.
3. Toma el registro con `ensureRecord`, el borrador con `draftOf` y la prueba propia con `normalizeCustomTest`. Si el borrador es blanco, avisa `EMPTY_DRAFT_NOTICE` y termina, sin sumar intento.
4. Si `countsLocalAttempts`, aplica `attemptPatch` y guarda.
5. Crea la ejecución activa y su `AbortController`, y pasa a `running`, con `progress: null`.
6. Llama a `transport.run`. Si lanza:
   - un `AbortError`, o un error de una ejecución que ya no es la activa, se descarta;
   - cualquier otro guarda un resultado de transporte (`TRANSPORT_FALLBACK` si no tiene mensaje), sin sincronizar.
7. Si la ejecución ya no es la activa, descarta el veredicto.
8. Lee `now()` una vez, arma el resultado con `buildRunResult` y lo guarda en el registro, que vuelve a pedir con `ensureRecord`.
9. Si `hasPassingEvidence` lo aprueba, aplica `passedRunPatch` (`solvedAt` la primera vez y `reviewAt` a un día si no había) y avisa `FIRST_SOLVE_NOTICE` o `SOLVED_AGAIN_NOTICE`.
10. Guarda.
11. `syncAfterRun`: primero Sistemas, después campaña, con el aviso de XP o el de falla de hoy.
12. Pasa a `idle`, si sigue siendo la activa.

**`cancel()`** aborta la señal, deja de tener ejecución activa, pasa a `idle` en el acto y avisa `CANCELLED_NOTICE`.

**`abort()`** hace lo mismo sin avisar. Lo llaman (FR-050):

- abrir otro ejercicio, también con anterior y siguiente;
- volver al mapa;
- desmontar;
- «Borrar todo».

Cambiar de fase no lo llama.

**El orden observable,** fijado por una spec:

`save` (intento) → `running` → `transport` → aviso → `save` (resultado) → Sistemas → campaña → `idle`.

## 4. El resultado (`model/build-run-result.ts`)

```ts
export interface RunContext {
  code: string;
  customTest: string;
  now: number;
}

export function buildRunResult(
  exercise: { readonly tests: readonly { readonly id: string }[] },
  verdict: RunVerdict,
  context: RunContext,
): LabResultV1;
```

Es el único lugar donde se arma el `result` v1 de una ejecución (FR-052), también el de una falla de transporte.

- **Las claves,** en el orden que hoy guarda `interpretRun`: `code`, `success`, `stdout`, `stderr`, `transportError`, `tests`, `time`, `customTest` y `customPassed`, y `attemptId` sólo si el veredicto lo trae.
- **Los recortes se hacen una vez:** `stdout` a 12 000 caracteres y `stderr` a 18 000.
- **`tests`** lleva una entrada por prueba del ejercicio, en su orden. Una falla de transporte las deja en falso y su `stderr` es el mensaje.

`sanitizeResult` (`entities/exercise/model/lab-state.ts`) sigue siendo el único normalizador al cargar y al importar, y F7a no lo cambia (F7-S7).

## 5. El adaptador de los Playgrounds (`api/playground-transport.ts`)

```ts
export type RunCode = (input: RunInput) => Promise<RunResult>;

export const buildPlaygroundProgram: ProgramBuilder;

export function createPlaygroundTransport(runCode?: RunCode): ExerciseTransport;
```

- **`countsLocalAttempts` es `true`.**
- **`run`** arma el programa con `buildPlaygroundProgram` (que es `buildProgram`) y llama a `runCode`, de `shared/api/playground`, con `{ language, code, signal }`: 60 s, 200 KB y sus mensajes (FR-049).
- **Una falla** (`'error' in result`) es `{ kind: 'transport-failure', message: result.error }`.
- **Si no,** lee las marcas con `readTestMarkers` (la regla de `interpretRun`) y devuelve `executed` con la salida cruda.
- **No avisa progreso.**
- **`runCode` es un parámetro con valor por omisión,** para que su spec lo reemplace sin `vi.mock`.

## 6. La raíz de composición

En F7a la raíz es `frontend/lab.js`, que hace de raíz del laboratorio legacy (FR-044, F7-S1). Elige el transporte y el constructor en un solo lugar, sin leer `window.TallerRunner`:

```js
const runner = createExerciseRunner({
  store: labStore,
  transport: createPlaygroundTransport(),
  now: () => Date.now(),
  notify: (message) => notify(message),
  isLocked: (exercise) =>
    Boolean(window.TallerCampaign?.lockedExerciseHTML(exercise.id, exercise.language)),
  isCampaignMission: (exercise) =>
    Boolean(window.TallerCampaignEngine.canAttempt(exercise.id, exercise.language).worldId),
  syncSystems: () => window.TallerSystems?.sync(),
  syncCampaign: () => window.TallerCampaign?.sync(),
  logError: (error) => console.error(error),
});
const programBuilder = buildPlaygroundProgram;
```

En F7b la raíz pasa al adaptador de `app/legacy/` y llega a la página por props (FR-009). A4 cambia esas dos líneas (`createPlaygroundTransport()` y `buildPlaygroundProgram`) en la raíz vigente cuando entra.

## 7. Lo que F7a deja para los supuestos de A4

| # | Supuesto de A4 | Dónde queda en F7a |
| --- | --- | --- |
| F7-S1 | Un puerto inyectable; nadie lee `window.TallerRunner` | `ExerciseTransport` llega por `ExerciseRunnerDependencies.transport`. `register-runner.ts` y `window.TallerRunner` se retiran en T015, y `grep` da 0 |
| F7-S2 | La entrada es el ejercicio, el borrador, la prueba propia normalizada y la señal | `RunRequest`, con cuatro claves y sin programa: lo fija una spec |
| F7-S3 | Un veredicto, no la salida cruda | `RunVerdict`; `buildRunResult` arma y recorta una vez |
| F7-S4 | El adaptador decide si cuenta el intento | `countsLocalAttempts`, leído antes de ejecutar |
| F7-S5 | Los estados de la espera y la cancelación | `RunState<Progress>`, `report` y `cancel()`; A4 amplía `Progress` sin tocar la feature (R1) |
| F7-S6 | El arnés de la vista previa por parámetro, también para la copia | `ProgramBuilder` y `buildPlaygroundProgram`; `lab.js` pasa la vista previa y la copia por `programBuilder` |
| F7-S7 | `sanitizeResult` sigue siendo el único normalizador | No cambia. `buildRunResult` arma, y A4 le suma `attemptId` a `sanitizeResult` |
| F7-S8 | E2E con el doble del compilador y un Page Object | `CompilerDouble` y `LabPage` ampliados; 13 E2E nuevos usan el doble de los Playgrounds (`lab-run.spec.ts`) |
| F7-S9 | Se retira `register-runner.ts` | Sí; `runner-check` carga `shared/api/playground` directamente con sus 12 escenarios, y lo retira A4 |

## 8. Contra el resto de la spec de A4

Repasados los requisitos de A4 que tocan la feature:

| Requisito de A4 | Cómo lo deja F7a |
| --- | --- |
| FR-001, el envío | El adaptador de A4 recibe `exercise.id`, `draft` sin tocar y `customTest` normalizado. Cada llamada a `run` es un envío nuevo, con su `clientRunId` |
| FR-002, el borrador blanco | La feature lo rechaza antes de llamar al puerto, sin intento |
| FR-002, más de 64 KiB | Hallazgo: el puerto no tiene un rechazo previo. La salida que cumple FR-002 sin tocar el puerto ni la feature es una guarda en la raíz de composición: el manejador de ejecución (`runExercise` de `lab.js`, o el de la página en F7b) mide los bytes, avisa y no llama a `runner.run`. Así no hay pedido, ni intento, ni resultado guardado. Como corre antes de los rechazos de la feature, la raíz mira primero si hay una ejecución activa, y su aviso gana al del bloqueo. Que el adaptador devuelva una falla de transporte guardaría un `result`, y eso exige enmendar FR-002 (ver el informe) |
| FR-003 a FR-011, la espera, los reintentos y las cuotas | Son del adaptador. La espera se ve por `report`, la cancelación llega por `signal`, y los rechazos y las cuotas son `transport-failure` con el mensaje |
| FR-012 y FR-013, la sesión | Son del adaptador: puede esperar «pedir el ingreso» dentro de `run` |
| FR-014 a FR-017, el resultado | `ExecutedVerdict` y `TransportFailureVerdict` cubren la tabla. La salida va sin las líneas de evidencia, y la feature recorta |
| FR-018, la explicación de un motivo | Viaja en `stderr` (o en `message`). Que gane al diagnóstico es un cambio de `reviewStateOf` o de `diagnose`, en `entities/exercise`, no de la feature |
| FR-019 y FR-040, `attemptId` | `buildRunResult` lo copia del veredicto. Que sobreviva a la recarga es de `sanitizeResult` (A4) |
| FR-020 a FR-023 | `code` es el borrador enviado, `customTest` el normalizado y `time`, `now()`; `countsLocalAttempts: false`; `passedRunPatch`, los avisos y `syncAfterRun`; `solvedAt` no se borra (F7-Q1) |
| FR-026 a FR-030, la vista previa y la copia | `ProgramBuilder` por parámetro, con la misma prueba propia normalizada. Hallazgo: si la plantilla nunca se obtuvo (FR-029), A4 amplía el retorno de `ProgramBuilder` y la vista vigente |
| FR-036 y FR-039, los estados de la espera | `RunState<ApiRunProgress>`. La vista vigente anuncia cada cambio una vez |
| FR-038, el número de intentos | Es de la vista. Los E2E de F7a toman el texto de `qa/e2e/lib/lab-copy.ts`, que A4 edita una vez |
| FR-042, los E2E | Hay que pasar al doble de `/api/runs` los 11 de F1 y los 13 de `lab-run.spec.ts`; los otros 48 E2E de F7a no ejecutan código |
