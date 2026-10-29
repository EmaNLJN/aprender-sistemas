# Contrato: las interfaces del front que deja A4

**Fecha**: 2026-10-28 · **Spec**: [spec.md](../spec.md) · **Plan**: [plan.md](../plan.md) · **Modelo**: [data-model.md](../data-model.md) · **Extiende**: el contrato de F7a, `specs/021-f7-laboratorio/contracts/run-exercise.md` (`impl-f7a`, `fc88d450`), que sigue vigente

- **Las firmas son exactas.** Una tarea que cambia una firma cambia este contrato en el mismo commit.
- **Las rutas** son relativas a `frontend/src/`, salvo las de `qa/`.
- **Las importaciones:** cada slice se importa por su `index.ts`, salvo la entrada sin vista `features/sign-in/requests.ts`.

## `features/run-exercise`: lo que suma A4 al índice

```ts
// api/run-progress.ts
export type ApiRunPhase =
  | { readonly kind: 'queued'; readonly position: number }
  | { readonly kind: 'running' }
  | { readonly kind: 'waiting-turn'; readonly retryInSeconds: number };
export interface ApiRunProgress {
  readonly phase: ApiRunPhase;
  readonly delayed: boolean;
}

// ui/describe-run-progress.ts
export const DELAY_NOTICE: string;
export interface RunProgressCopy {
  readonly line: string;
  readonly announcement: string;
  readonly delayNotice: string | null;
}
export function describeRunProgress(progress: ApiRunProgress | null): RunProgressCopy;

// api/api-runs-transport.ts
export interface RunClock {
  now(): number;
  wait(ms: number, signal: AbortSignal): Promise<void>;
  random(): number;
}
export interface ApiRunsTransportOptions {
  readonly client: Pick<ApiClient, 'get' | 'send'>;
  readonly currentAccount: () => number | null;
  readonly askToSignIn: (accountId: number | null) => void;
  readonly newRunId: () => string;
  readonly clock: RunClock;
}
export function createApiRunsTransport(
  options: ApiRunsTransportOptions,
): ExerciseTransport<ApiRunProgress>;

// api/server-program.ts
export const PREVIEW_NONCE: string; // 32 ceros
export function createServerProgramBuilder(
  templates: () => HarnessTemplates | null,
): ProgramBuilder;

// model/code-limit.ts
export const SERVER_CODE_LIMIT_BYTES = 65_536;
export const CODE_TOO_LONG_NOTICE: string;
export function exceedsCodeLimit(code: string): boolean;
```

**Lo que cambia del contrato de F7a:**

- `ProgramBuilder` devuelve `string | null`. `null` quiere decir que la plantilla no está disponible (FR-029), y la vista lo dice.
- Desde T024 salen del índice `createPlaygroundTransport`, `buildPlaygroundProgram` y `RunCode`.

**El adaptador (`createApiRunsTransport`):**

- `countsLocalAttempts` es `false`.
- `run(request, report)`:
  - envía `{clientRunId, exerciseId, code, customTest?}` a `POST /api/runs`, sin la señal y con `asUser` igual a la cuenta (sin `asUser` si es `null`). `customTest` no viaja cuando es `''`;
  - espera turno, reintenta o se detiene según `decideSubmit`;
  - consulta `GET /api/runs/{id}` con la señal y con el calendario de `pollDelayMs`, hasta un estado final;
  - devuelve `verdictOfRun(run, exercise)` o un `transport-failure` con el texto de la decisión;
  - avisa el progreso con `report({ phase, delayed })` sólo cuando cambia.
- **Si la señal se aborta**, pide `POST /api/runs/{id}/cancel` (sin la señal, sin esperar) si ya tiene id y lanza un `DOMException` de nombre `AbortError`. Con la señal abortada antes de empezar, no envía nada.
- **Ante un 401 o una sesión que no está,** llama a `askToSignIn(currentAccount())` una vez y devuelve el texto de la sesión vencida.
- **No guarda, no avisa al alumno y no lee el almacén:** lo hace la feature de F7a.

## `entities/exercise`: lo que suma A4 al índice

```ts
// model/render-harness.ts
export type HarnessTemplates = Readonly<Record<ExerciseLanguage, string>>;
export interface HarnessInput {
  readonly language: ExerciseLanguage;
  readonly code: string;
  readonly nonce: string;
  readonly tests: readonly { readonly id: string; readonly expression: string }[];
  readonly customTest?: string;
  readonly imports?: readonly string[];
}
export function renderHarness(template: string, input: HarnessInput): string;

// model/server-explanations.ts
export interface ServerExplanation {
  readonly explanation: string;
  readonly action: string;
}
export const SERVER_EXPLANATIONS: {
  readonly timeout: ServerExplanation;
  readonly runMemory: ServerExplanation;
  readonly compileMemory: ServerExplanation;
  readonly threads: ServerExplanation;
  readonly outputLimit: ServerExplanation;
  readonly evidenceInvalid: ServerExplanation;
};
export const WORKSHOP_FAILURE: string;
```

- `diagnose(stderr, language)` devuelve primero la explicación del servidor cuya `explanation` es el comienzo de `stderr`, con su `action`.
- `sanitizeResult(result, exercise): LabResultV1` conserva `attemptId` (entero seguro mayor que 0).
- Desde T024 salen del índice `buildProgram`, `interpretRun` y `readTestMarkers`. `hasPassingEvidence` y `testPassed` se quedan.

## `shared/api/http`: el campo `quota`

```ts
// api-failure.ts: la variante 'response' suma un campo opcional
| {
    readonly kind: 'response';
    readonly status: number;
    readonly code: string;
    readonly message: string;
    readonly fieldErrors: FieldErrors;
    readonly retryAfterSeconds: number | null;
    readonly quota?: string;
  }
```

`failureOf` lo llena sólo si el cuerpo trae `quota` como texto.

## `shared/api/content`: la plantilla en la copia

```ts
// harness-copy.ts
export interface HarnessData {
  readonly rust: string;
  readonly go: string;
}
export interface CopiedHarness {
  readonly etag: string;
  readonly data: HarnessData;
}
export function harnessOf(record: unknown): CopiedHarness | null;
export function withHarness(copy: ContentCopy, harness: CopiedHarness | null): ContentCopy;

// indexeddb-copy-store.ts
export interface ContentCopyUpdates {
  update(change: (record: unknown) => ContentCopy | null): Promise<boolean>; // true si escribió
}
export function createIndexedDbCopyStore(
  options: IndexedDbCopyStoreOptions,
): ContentCopyStore & ContentCopyUpdates;

// content-copies.ts
export const contentCopies: ContentCopyStore & ContentCopyUpdates;

// harness-holder.ts
export const HARNESS_PATH = '/api/harness';
export interface HarnessHolderOptions {
  readonly fetch: ContentFetch;
  readonly copies: Pick<ContentCopyStore, 'read'> & ContentCopyUpdates;
}
export interface HarnessHolder {
  current(): HarnessData | null;
  refresh(): Promise<void>; // nunca rechaza
  subscribe(listener: () => void): () => void;
}
export function createHarnessHolder(options: HarnessHolderOptions): HarnessHolder;
```

- `update` lee el registro y escribe lo que devuelve `change` en **una** transacción `readwrite`. Si `change` devuelve `null`, no escribe.
- `afterPublish` (`app/boot/content-stage.ts`) escribe con `update((previous) => withHarness(copyOf(reading), harnessOf(previous)))`.
- `refresh`:
  - la primera vez lee la plantilla de la copia;
  - pide `GET /api/harness` con `If-None-Match` si conoce un `ETag`;
  - con un 200 legible, la guarda en memoria, avisa a los oyentes y la suma a la copia con `update` (sólo si hay una copia usable).

  Con 304, error o red caída, se queda con lo que tenía.

## `features/sign-in/requests.ts`: la entrada sin vista

```ts
export { requestSignIn } from './model/access-request';
export { reauthenticate } from './model/reauthenticate';
```

No importa React. La usa sólo `app/lab/server-execution.ts`.

## `app/lab/server-execution.ts`: la composición

```ts
export const labTransport: ExerciseTransport<ApiRunProgress>;
export const labHarness: HarnessHolder;
export const labProgramBuilder: ProgramBuilder;
```

`lab.js` (o `app/legacy/lab-api.ts`, si F7b entró antes) los usa en las dos líneas de la raíz de composición de F7a.

## `qa/e2e`: el doble

```ts
// fixtures/api-double.ts (el de F11a con lo que suma A3: ApiCall.ifNoneMatch y ApiReply.abort)
export interface ApiReply {
  status: number;
  json?: unknown;
  body?: string;
  contentType?: string;
  headers?: Record<string, string>;
  abort?: boolean; // de A3: aborta el pedido en la red con route.abort()
}
// A4 suma a installDefaults 'GET /api/harness': build/harness.json, su ETag y 304 con If-None-Match

// fixtures/compiler-double.ts
export class CompilerDouble {
  readonly requests: string[]; // un elemento por envío (clientRunId)
  readonly bodies: string[]; // el cuerpo JSON del primer POST de cada envío
  constructor(api: ApiDouble);
  answer(exercise: ExerciseUnderTest, kind: CompilerKind): Promise<void>;
  hold(exercise: ExerciseUnderTest): Promise<void>;
  answerWithCustom(exercise: ExerciseUnderTest, kind: CompilerKind, custom: CustomOutcome): Promise<void>;
  answerLater(exercise: ExerciseUnderTest, kind: CompilerKind): Promise<() => void>;
  answerThrough(exercise: ExerciseUnderTest, states: readonly WaitingState[], kind: CompilerKind): Promise<() => void>;
  finishWith(exercise: ExerciseUnderTest, run: Partial<ServerRunBody>): Promise<void>;
  rejectFirst(...replies: ApiReply[]): void;
  cancelCalls(): ApiCall[];
}

// lib/compiler-results.ts
export type WaitingState = { status: 'queued'; position: number } | { status: 'running' };
export interface ServerRunBody { /* las 19 claves del contrato ampliado */ }
export function finishedRun(exercise: ExerciseUnderTest, kind: Exclude<CompilerKind, 'transportError'>, ids: RunIds, custom?: CustomOutcome): ServerRunBody;
export function waitingRun(exercise: ExerciseUnderTest, state: WaitingState, ids: RunIds): ServerRunBody;
export const PREVIEW_MARKER: string; // '__TALLER_TEST__' + 32 ceros + ':'
```
