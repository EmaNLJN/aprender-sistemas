# Contrato: las interfaces que deja A3 y las que cambia de F11a y de A2

**Input**: [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md) y [data-model.md](../data-model.md). Lo consumen las tareas de A3 y, después, A4, D1c, F11d y E1.

- **Las firmas son exactas.** Una tarea que cambia una firma cambia este contrato en el mismo commit.
- **Las rutas** son relativas a `frontend/src/`.
- **Las importaciones:** cada slice se importa por su `index.ts`.
- **Lo que A3 cambia de F11a** se marca «(cambia F11a)». T010 actualiza en el mismo commit `specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`, como pide ese contrato. Ese archivo llega a `master` con el plan de F11a, y por eso se cita sin enlace.

## `shared/lib`

```ts
// shared/lib/wait.ts
export function wait(ms: number, signal: AbortSignal): Promise<void>; // se resuelve al pasar ms o al abortar

// shared/lib/format-long-date.ts
export function formatLongDate(iso: string, timeZone?: string): string; // «7 de octubre de 2026»
```

## `shared/api/content`: la fuente de la API y la copia

```ts
// shared/api/content/content-source.ts (A2; A3 suma ServedPortion, ReadingOrigin, ContentReading y 'access')
export interface SourcePortion {
  readonly name: PortionName;
  readonly version: string;
  readonly data: unknown;
}
export interface ServedPortion extends SourcePortion {
  readonly etag: string;
}
export type ReadingOrigin = 'server' | 'confirmed-copy' | 'offline-copy';
export interface ContentReading {
  readonly version: string;
  readonly origin: ReadingOrigin;
  readonly confirmedAt: string;
  readonly portions: readonly ServedPortion[];
}
export interface ContentRequest {
  readonly signal: AbortSignal;
}
export interface ContentSource {
  read(names: readonly PortionName[], request: ContentRequest): Promise<ContentReading>; // desde el corte (U2)
}
export type ContentFailureKind =
  | 'network'
  | 'status'
  | 'timeout'
  | 'body'
  | 'missing'
  | 'shape'
  | 'version'
  | 'access';
export class ContentLoadError extends Error {
  /* sin cambios */
}

// shared/api/content/portion-resources.ts
export const PORTION_RESOURCES: Readonly<Record<PortionName, string>>; // la tabla de C2 (spec, «Key Entities»)

// shared/api/content/content-copy.ts
export const COPY_FORMAT = 1;
export interface CopiedPortion {
  readonly etag: string;
  readonly data: unknown;
}
export interface ContentCopy {
  readonly format: number;
  readonly version: string;
  readonly confirmedAt: string;
  readonly portions: Readonly<Record<PortionName, CopiedPortion>>;
}
export interface ContentCopyStore {
  read(): Promise<unknown>; // el registro o null; nunca rechaza
  write(copy: ContentCopy): Promise<boolean>; // true cuando la transacción hizo complete
  clear(): Promise<boolean>;
}
export function usableCopy(record: unknown): ContentCopy | null;
export function copyOf(reading: ContentReading): ContentCopy;
export function readingOf(
  copy: ContentCopy,
  origin: Exclude<ReadingOrigin, 'server'>,
  confirmedAt: string,
): ContentReading;

// shared/api/content/indexeddb-copy-store.ts
export const COPY_DATABASE = 'taller-contenido';
export const COPY_DATABASE_VERSION = 1;
export const COPY_OBJECT_STORE = 'copia';
export const COPY_KEY = 'ultima';
export interface IndexedDbCopyStoreOptions {
  readonly factory: () => IDBFactory | undefined;
  readonly limitMs: number;
}
export function createIndexedDbCopyStore(options: IndexedDbCopyStoreOptions): ContentCopyStore;

// shared/api/content/content-copies.ts
export const contentCopies: ContentCopyStore; // IndexedDB del navegador, con un límite de 3 000 ms
export function forgetContentCopy(): Promise<void>; // borra la copia; nunca rechaza

// shared/api/content/api-content-source.ts
export type SessionRead =
  | { readonly kind: 'ready'; readonly contentVersion: string | null }
  | { readonly kind: 'unreachable'; readonly failure: 'network' | 'timeout' | 'status' };
export interface ContentResponse {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
}
export type ContentFetch = (input: string, init: RequestInit) => Promise<ContentResponse>;
export interface ApiContentSourceOptions {
  readonly fetch: ContentFetch;
  readonly readSession: (request: ContentRequest) => Promise<SessionRead>;
  readonly requestAccess: () => Promise<void>;
  readonly copies: ContentCopyStore;
  readonly mayUseCopy: () => boolean;
  readonly remainingMs: () => number;
  readonly now: () => Date;
}
export const MAX_ROUNDS = 3;
export function createApiContentSource(options: ApiContentSourceOptions): ContentSource;
```

**Reglas de la fuente:**

- **Los pedidos de porciones:**
  - van al mismo origen con `credentials: 'same-origin'` y `Accept: application/json`;
  - llevan `If-None-Match` con el `ETag` guardado sólo si hay copia;
  - nunca llevan `X-XSRF-TOKEN` ni `X-Taller-User` (FR-014);
  - en una ronda van los 17 a la vez.
- **La sesión:** se pide una vez por ronda (`readSession`).
- **Lo que entrega:**
  - con una copia usable en la `contentVersion` de la sesión, la entrega como `confirmed-copy` y no pide porciones;
  - con una ronda completa en una sola versión, borra la copia y entrega `server`.
- **Las esperas:** un 429 o un 503 con `Retry-After` espera y repite ese pedido si cabe en `remainingMs()`. Si no cabe, falla con `status`.
- **El 401:** la primera vez llama a `requestAccess()` y repite la sesión y la ronda. La segunda falla con `status`.
- **El 403:** falla con `access`, sin copia.
- **Cuándo usa la copia:** cuando el contenido no llega, entrega `offline-copy` con la fecha de la copia si `mayUseCopy()` es verdadero. Si no, lanza `ContentLoadError` con el tipo de [research.md](../research.md), R8.
- **El aborto:** un pedido abortado por el presupuesto falla con `timeout`.

## `app/boot`: el presupuesto, el lector de la sesión, las etapas y el aviso

```ts
// app/boot/attempt-budget.ts
export interface AttemptBudget {
  begin(): void;
  remainingMs(): number;
  pausedWhile<T>(work: () => Promise<T>): Promise<T>;
  onExpired(listener: () => void): () => void; // devuelve la baja del oyente
}
export interface AttemptBudgetOptions {
  readonly totalMs: number;
  readonly now: () => number;
}
export function createAttemptBudget(options: AttemptBudgetOptions): AttemptBudget;

// app/boot/session-reader.ts
export interface SessionReaderOptions {
  readonly fetchSession: (request: { readonly signal: AbortSignal }) => Promise<SessionOutcome>;
  readonly storeSession: (snapshot: SessionSnapshot) => void;
  readonly requestSignIn: RequestSignIn;
  readonly forgetContentCopy: () => Promise<void>;
  readonly budget: AttemptBudget;
}
export interface SessionReadRequest {
  readonly signal: AbortSignal;
  readonly token?: AccessToken | null;
}
export type ReadSession = (request: SessionReadRequest) => Promise<SessionRead>;
export function createSessionReader(options: SessionReaderOptions): ReadSession;

// app/boot/session-gate.ts (cambia F11a: sale timeoutMs; entran forgetContentCopy y budget; devuelve SessionStage)
export interface SessionGateOptions {
  readonly fetchSession: (request: { readonly signal: AbortSignal }) => Promise<SessionOutcome>;
  readonly storeSession: (snapshot: SessionSnapshot) => void;
  readonly takeAccessToken: () => AccessToken | null;
  readonly requestSignIn: RequestSignIn;
  readonly forgetContentCopy: () => Promise<void>;
  readonly onReady: () => void;
  readonly view: SessionView;
  readonly budget: AttemptBudget;
  readonly loadingDelayMs: number;
}
export interface SessionStage extends BootStage {
  takeRead(): SessionRead | null; // la lectura del arranque, una vez
  readAgain(request: { readonly signal: AbortSignal }): Promise<SessionRead>; // cada lectura siguiente, con el token guardado
}
export function createSessionGate(options: SessionGateOptions): SessionStage;

// app/boot/session-view.ts (cambia F11a: salen showFailure, SessionFailure y sessionFailureMarkup; SESSION_LOADING_MARKUP sigue como lo exporta F11a)
export interface SessionView {
  showLoading(): void;
  clear(): void;
}
export const SESSION_LOADING_MARKUP: string;
export function createSessionView(): SessionView;

// app/boot/content-gate.ts (A2: sale expectedVersion y timeoutMs; entran budget y onPublished)
export interface GateView {
  showLoading(): void;
  showFailure(failure: ContentLoadError, retry: () => void): void;
  clear(): void;
}
export interface ContentGateOptions {
  readonly source: ContentSource;
  readonly view: GateView;
  readonly budget: AttemptBudget;
  readonly loadingDelayMs: number;
  readonly onPublished: (reading: ContentReading) => void;
}
export function createContentGate(options: ContentGateOptions): BootStage;

// app/boot/gate-view.ts (A2: suma los textos de version y access de FR-028)
export const LOADING_MARKUP: string;
export function failureMarkup(kind: ContentFailureKind): string;
export function createGateView(): GateView;

// app/boot/copy-notice.ts
export const COPY_NOTICE_ID = 'content-copy-notice';
export function copyNoticeText(confirmedAt: string, timeZone?: string): string;
export function showCopyNotice(confirmedAt: string): void;

// app/boot/account-stages.ts (cambia F11a: suma attemptBudget, signInFromBoot y readSessionForContent)
export const attemptBudget: AttemptBudget; // 20 000 ms
export const tokenStage: TokenStage;
export const signInFromBoot: RequestSignIn; // monta la raíz de la cuenta y pide el ingreso
export const sessionStage: SessionStage;
export const readSessionForContent: SessionStage['readAgain']; // lee por sessionStage.readAgain y, con una lectura lista, monta la raíz de la cuenta (mountAccountRoot)

// app/boot/content-stage.ts
export const contentGate: BootStage;

// app/content/content.ts (A2; A3 suma la señal)
export const CONTENT_PUBLISHED_EVENT = 'taller:content-published';
export const CONTENT_COPY_SAVED_EVENT = 'taller:content-copy-saved'; // detail: { saved: boolean }
```

`main.tsx` sigue llamando a `runBoot([tokenStage, sessionStage, contentGate, legacyViews])`, sin cambios.

**La etapa de sesión, desde A3:**

- toma el token del enlace una sola vez al empezar (`takeAccessToken()`, que llama a `take()` de F11a sin cambiarlo) y lo guarda;
- empieza el presupuesto y pide la sesión, con «Conectando con el taller…» a los 400 ms;
- con `user: null`, borra la copia y espera «pedir el ingreso» en pausa;
- termina siempre, sin mostrar errores. Deja `takeRead()` y llama a `onReady()` sólo con la cuenta lista;
- `readAgain` es la lectura de cada ronda y de cada «Reintentar» de la compuerta: el mismo lector, sin la espera de la etapa ni su vista, y con el token guardado mientras ninguna sesión haya respondido. El token se olvida en el momento en que se entrega a «pedir el ingreso», como en F11a (FR-005 de F11): una lectura que no responde, o un 429 que no entra en el presupuesto, lo conservan para la siguiente.

**La compuerta:**

- su primer intento sigue el presupuesto de la etapa de sesión, y cada «Reintentar» empieza otro (`begin()`);
- llama a `onPublished(lectura)` una vez, después del evento de publicación.

## `features/sign-in`: «Salir» (cambia F11a)

```ts
export interface SignOutDependencies {
  readonly client: ApiClient;
  readonly userId: number;
  readonly forgetContentCopy: () => Promise<void>;
}
export function signOut(dependencies: SignOutDependencies): Promise<SignOutOutcome>; // borra la copia antes de devolver 'signed-out'
```

Los que llaman (`pages/account/ui/SignOutSection.tsx` y `features/sign-in/ui/PrivacyReacceptance.tsx`) pasan `forgetContentCopy` de `shared/api/content`.

## `qa/lib`: el servidor simulado de los checks

```ts
// qa/lib/content-server.ts (reemplaza al de A2 y F11a)
export const SESSION_PATH = '/api/session';
export const PORTION_PATHS: Readonly<Record<string, string>>;
export const PORTION_URLS: readonly string[];
export type ContentBehavior =
  | { kind: 'serve' }
  | { kind: 'reject' }
  | { kind: 'status'; status: number; retryAfter?: string }
  | { kind: 'text'; body: string }
  | { kind: 'document'; document: unknown } // sin la porción en el documento, el pedido se rechaza
  | { kind: 'version'; version: string }
  | { kind: 'hang' };
export type SessionBehavior =
  | { kind: 'account' }
  | { kind: 'signed-out' }
  | { kind: 'no-content' }
  | { kind: 'reject' }
  | { kind: 'hang' };
export interface ContentServerOptions {
  readonly session?: readonly SessionBehavior[];
  readonly portions?: readonly ContentBehavior[];
  readonly only?: { readonly name: string; readonly behaviors: readonly ContentBehavior[] };
}
export interface FakeResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  text(): Promise<string>;
  json(): Promise<unknown>;
}
export interface FetchInit {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}
export interface ContentServer {
  fetch: (url: string, init?: FetchInit) => Promise<FakeResponse>;
  requests: string[]; // las porciones, en orden
  sessionRequests: string[];
  order: string[]; // todo, en orden
}
export function createContentServer(options?: ContentServerOptions | ContentBehavior[]): ContentServer;
```

**Cómo elige qué responder:**

- **Por pedido:** el n-ésimo pedido de cada recurso usa el n-ésimo comportamiento, y el último se repite.
- **Un arreglo** es la forma corta de `{portions}`, que vale para las 17 porciones.
- **`only`** vale para una porción, y las demás se sirven.

## `qa/e2e`: el doble de la API (cambia F11a)

```ts
// qa/e2e/lib/content-portions.ts
export const PORTION_PATHS: { readonly 'lab.rust': '/api/exercises?catalog=lab&language=rust'; /* … las 17 */ };
export type PortionName = keyof typeof PORTION_PATHS;
export const PORTION_NAMES: PortionName[];
export const CONTENT_VERSION: string;
export function portionData(name: PortionName): unknown;
export function portionBody(name: PortionName): string;
export function portionEtag(name: PortionName): string;
export function portionHeaders(name: PortionName, version?: string): Record<string, string>;
export function isPortion(name: PortionName): (url: URL) => boolean;
export function isSession(url: URL): boolean;

// qa/e2e/lib/content-requests.ts (reemplaza al de A2)
export function trackContentRequests(page: Page): Request[]; // las porciones
export function trackSessionRequests(page: Page): Request[];

// qa/e2e/lib/content-copy.ts
export function watchCopySaved(context: BrowserContext): Promise<void>;
export function copySaved(page: Page): Promise<boolean>; // espera la primera señal y devuelve saved
export function blockContentCopy(context: BrowserContext): Promise<void>;
export function blockCopyWrites(context: BrowserContext): Promise<{ dispose(): Promise<void> }>;
export function readStoredCopy(page: Page): Promise<unknown>;

// qa/e2e/fixtures/api-double.ts (lo que suma A3 a la forma canónica de F11a)
export interface ApiCall {
  method: string;
  path: string;
  search: string; // de F11a: la query del pedido; A3 no suma otra propiedad con ese dato
  ifNoneMatch: string | undefined; // lo suma A3
  xsrf: string | undefined;
  user: string | undefined;
  body: unknown;
}
export interface ApiReply {
  status: number;
  json?: unknown;
  body?: string;
  contentType?: string;
  headers?: Record<string, string>;
  abort?: boolean; // lo suma A3
}
export class ApiDouble {
  contentVersion: string; // la de build/curriculum.meta.json; la usan la sesión y las 17 porciones
  /* lo demás, como lo deja F11a */
}
```

**Cómo responde el doble:**

- **La búsqueda de una ruta:** primero con la query (`GET /api/exercises?catalog=lab&language=rust`, armada con `search`) y después sin ella. `callsTo` compara la query sólo si la ruta la trae.
- **El orden de F11a:** la ruta se busca antes de mirar el CSRF. Una ruta desconocida da 404 y queda en `unhandled`, que reporta `assertAllHandled()`; sólo una ruta conocida que modifica sin el `X-XSRF-TOKEN` vigente da 419.
- **Con F8 en la base:** su `GET /api/progress` por omisión responde `contentVersion: this.contentVersion`.
- **Las 17 porciones por omisión:**
  - un 304 si `If-None-Match` es su `ETag`;
  - si no, un 200 con los bytes del generador;
  - siempre con su `ETag`, `Content-Version: api.contentVersion` y `Cache-Control: private, no-cache`.
