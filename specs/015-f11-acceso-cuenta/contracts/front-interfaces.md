# Contrato: las interfaces públicas que deja F11a

**Input**: [spec.md](../spec.md), [plan.md](../plan.md) y [research.md](../research.md). Lo consumen las tareas de F11a y, después, A3 (spec 016), F8 (spec 022), F12 (spec 023), F11b a F11d y D1c. Las firmas son exactas: una tarea que las cambia cambia este contrato en el mismo commit.

Las rutas son relativas a `frontend/src/`. Cada slice se importa por su `index.ts`, nunca por un archivo interno (`docs/architecture.md`, «Feature-Sliced Design incremental»).

## `shared/api/http`: el cliente de la API

```ts
// shared/api/http/api-failure.ts
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export type ApiFailure =
  | {
      readonly kind: 'response';
      readonly status: number;
      readonly code: string;
      readonly message: string;
      readonly fieldErrors: FieldErrors;
      readonly retryAfterSeconds: number | null;
    }
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'account-changed'; readonly message: string }
  | { readonly kind: 'network' }
  | { readonly kind: 'unexpected'; readonly status: number };

export type ApiResult =
  | { readonly ok: true; readonly status: number; readonly body: unknown }
  | { readonly ok: false; readonly failure: ApiFailure };

// shared/api/http/api-client.ts
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
export type ApiMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  readonly asUser?: number;
  readonly signal?: AbortSignal;
}

export interface ApiClient {
  get(path: string, options?: ApiRequestOptions): Promise<ApiResult>;
  send(method: ApiMethod, path: string, body: unknown, options?: ApiRequestOptions): Promise<ApiResult>;
}

export interface ApiClientOptions {
  readonly fetch: FetchLike;
  readonly readCookies: () => string;
}

export function createApiClient(options: ApiClientOptions): ApiClient;

// shared/api/http/read-xsrf-token.ts
export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export function readXsrfToken(cookies: string): string;

// shared/api/http/api-client-context.ts
export const ApiClientContext: React.Context<ApiClient | null>;
export function useApiClient(): ApiClient; // lanza si no hay proveedor
```

**Reglas:**

- Todo pedido va al mismo origen, con `credentials: 'same-origin'` y `Accept: application/json`.
- Un pedido que modifica lleva:
  - `Content-Type: application/json`;
  - `X-XSRF-TOKEN`, con el valor decodificado de la cookie, leída en ese momento;
  - `X-Taller-User`, sólo si llega `asUser`.
- `get` nunca lleva `X-XSRF-TOKEN` ni `X-Taller-User`.
- Un 419 en `send` pide `GET /api/session` y reintenta una sola vez si el pedido es anónimo o si `user.id === asUser`. Si no, devuelve `signed-out` (`user: null`) o `account-changed` (otra cuenta). Si la renovación falla, devuelve el 419 original.
- El cuerpo de una respuesta 2xx que no es JSON da `unexpected`, y uno vacío da `body: null`.
- Un error sin la forma `{message: string, code: string}` da `unexpected`.
- `retryAfterSeconds` sale de `Retry-After` en segundos enteros, o es `null`.
- El 401 lo recibe quien llama: el cliente no pide el ingreso.

**Lo que suman otros ítems:**

- A3 pide las porciones con `get`, con su propio `If-None-Match`. Si necesita encabezados, suma a `ApiRequestOptions` un `headers?: Readonly<Record<string, string>>` en su PR.
- F11b descarga los datos con `send('POST', '/api/me/export', …)`. Si necesita el `Response` crudo para el streaming, suma un método `download` en su PR.

## `shared/ui/form`: los formularios

```ts
// shared/ui/form/describe-failure.ts
export const NETWORK_MESSAGE = 'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.';
export const UNEXPECTED_MESSAGE = 'El taller no respondió como esperábamos. Probá de nuevo en un rato.';

export interface FailureDescription {
  readonly fieldMessages: FieldErrors;
  readonly generalMessages: readonly string[];
  readonly retryAfterSeconds: number | null;
  readonly offerReload: boolean;
  readonly signedOut: boolean;
}

export function describeFailure(failure: ApiFailure, visibleFields: readonly string[]): FailureDescription;

// shared/ui/form/show-failure.ts
export function showFailure<T extends FieldValues>(
  setError: UseFormSetError<T>,
  description: FailureDescription,
  visibleFields: readonly Path<T>[],
): void;
export function messagesOf(error: FieldError | undefined): string[];

// shared/ui/form/use-guarded-submit.ts
export default useGuardedSubmit; // <A extends unknown[]>(handler: (...args: A) => Promise<void>) => (...args: A) => Promise<void>

// shared/ui/form/use-retry-countdown.ts
export default useRetryCountdown; // () => { waiting: boolean; start(seconds: number): void }

// Componentes (un archivo cada uno, export default)
TextField:     { label; registration: UseFormRegisterReturn; messages: readonly string[]; autoComplete: string; type?: 'text' | 'email' | 'password'; hint?: string; adornment?: ReactNode }
PasswordField: { label; registration; messages; autoComplete: 'current-password' | 'new-password'; hint?: string }
ServerError:   { messages: readonly string[]; takeFocus: boolean; children?: ReactNode }
```

## `shared/lib`

```ts
// shared/lib/format-wait.ts
export function formatWait(seconds: number): string; // 1 → «1 segundo», 120 → «2 minutos», 30000 → «8 horas y 20 minutos»

// shared/lib/format-local-date-time.ts
export function formatLocalDateTime(iso: string, timeZone?: string): string; // «12 de octubre de 2026 a las 12:30»
```

## `entities/session`: la sesión

```ts
export type AccountRole = 'student' | 'admin';

export interface PublishedUser {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: AccountRole;
  readonly privacyAccepted: boolean;
}

export interface SessionFeatures {
  readonly passwordReset: boolean;
  readonly registration: boolean;
}

export interface SessionSnapshot {
  readonly user: PublishedUser | null;
  readonly features: SessionFeatures;
  readonly contentVersion: string | null;
}

export type SessionStatus = 'unknown' | 'signed-out' | 'signed-in';

export interface SessionState extends SessionSnapshot {
  readonly status: SessionStatus;
  applySnapshot(snapshot: SessionSnapshot): void;
  applyUser(user: PublishedUser): void;
}

export function parsePublishedUser(value: unknown): PublishedUser | null;
export function parseSessionBody(body: unknown): SessionSnapshot | null;
export function createSessionStore(): StoreApi<SessionState>;
export const sessionStore: StoreApi<SessionState>;
export function selectReadyAccount(state: SessionState): PublishedUser | null; // cuenta con el aviso aceptado

export type SessionOutcome =
  | { readonly kind: 'session'; readonly snapshot: SessionSnapshot }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'rate-limited'; readonly message: string; readonly retryAfterSeconds: number | null };

export function fetchSession(client: ApiClient, request: { readonly signal?: AbortSignal }): Promise<SessionOutcome>;

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 64;
export function checkNewPasswordLength(value: string): true | string;
```

**Lo que suman otros ítems:**

- **F12a** suma `isAdmin(user: PublishedUser | null): boolean` en este slice, como «la condición de admin en un solo lugar» de su spec.
- **A3** lee `sessionStore.getState().contentVersion`, sin volver a pedir la sesión (FR-008). Con su FR-001 pide la sesión en cada ronda con `fetchSession`.
- **D1c** compara la cuenta con `sessionStore.getState().user`.

## `entities/privacy-notice`: el aviso

```ts
export interface PrivacyNoticeSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface PrivacyNotice {
  readonly version: string;
  readonly title: string;
  readonly sections: readonly PrivacyNoticeSection[];
}

export const PRIVACY_NOTICE: PrivacyNotice; // la versión es la que va en PRIVACY_VERSION (Q2)

// Componentes
PrivacyNoticeText:   { headingLevel: 2 | 3 }
PrivacyNoticeDialog: { open: boolean; onClose(): void }
```

## `features/sign-in`: «pedir el ingreso» y el acceso

```ts
export type AccessToken =
  | { readonly kind: 'invitation'; readonly token: string }
  | { readonly kind: 'reset'; readonly token: string; readonly email: string | null };

export type AccessPresentation = 'page' | 'dialog';
export type AccessReason = 'boot' | 'expired';

export interface SignInOptions {
  readonly presentation?: AccessPresentation; // por omisión, 'dialog'
  readonly reason?: AccessReason; // por omisión, 'expired'
  readonly token?: AccessToken | null;
}

export interface AccessRequest {
  readonly id: number;
  readonly presentation: AccessPresentation;
  readonly reason: AccessReason;
  readonly token: AccessToken | null;
}

export type RequestSignIn = (options?: SignInOptions) => Promise<PublishedUser>;

export interface AccessRequests {
  readonly request: RequestSignIn;
  current(): AccessRequest | null;
  subscribe(listener: () => void): () => void;
  finish(user: PublishedUser): void;
}

export function createAccessRequests(): AccessRequests;
export const accessRequests: AccessRequests;
export const requestSignIn: RequestSignIn; // = accessRequests.request

export type ReauthenticationOutcome = 'same-account' | 'reloading';
export function reauthenticate(
  expectedUserId: number,
  dependencies: { readonly requestSignIn: RequestSignIn; readonly reloadDocument: () => void },
): Promise<ReauthenticationOutcome>;

// Componente
AccessGate: { setShellInert(inert: boolean): void; reloadDocument(): void }
```

**«Pedir el ingreso»** (R1 del clarify; FR-006):

- Muestra el acceso y se resuelve con la cuenta.
- Con un pedido en curso, devuelve la misma promesa.
- No tiene topes: quien lo llama detiene los suyos mientras espera.
- La resolución deja la cuenta en `sessionStore` (`applyUser`) antes de resolver.

**Quién lo llama:**

| Quién | Cómo | Presentación |
| --- | --- | --- |
| La etapa de sesión, con `user: null`, un token o `privacyAccepted: false` | `requestSignIn({presentation: 'page', reason: 'boot', token})` | Página |
| A3, ante un 401 en una porción durante el arranque | Inyectado desde `app/boot`, con `{presentation: 'page', reason: 'expired'}` | Página |
| Una pantalla con sesión ante un 401: F11b, F8 o F12 | `reauthenticate(user.id, {requestSignIn, reloadDocument})` | Diálogo |

**`reauthenticate`** pide el ingreso como diálogo. Si entra la misma cuenta, devuelve `'same-account'` y quien llama sigue donde estaba, sin reintentar solo. Si entra otra cuenta, llama a `reloadDocument()` y devuelve `'reloading'` (FR-020).

## `pages/account`: «Tu cuenta»

```ts
export interface SignOutDependencies {
  readonly client: ApiClient;
  readonly userId: number;
}
export type SignOutOutcome = { readonly kind: 'signed-out' } | { readonly kind: 'failed'; readonly failure: ApiFailure };
export function signOut(dependencies: SignOutDependencies): Promise<SignOutOutcome>;

// Componente, exportado por el índice
AccountMenu: { entryHost: HTMLElement; reloadDocument(): void }
```

**El diálogo** (`ui/AccountDialog.tsx`) compone sus secciones en este orden:

1. `AccountSummary`: «{nombre} · {email}»;
2. el botón «Aviso de privacidad»;
3. `SignOutSection`: «Salir» y su nota (Q4);
4. «Volver al taller».

**Lo que suman otros ítems:**

- **F12a** suma «Administrar el taller» entre el aviso y «Salir», visible sólo con `isAdmin(user)`. Su diálogo a pantalla entera se monta en `AccountMenu`, que cierra «Tu cuenta» antes de abrirlo.
- **F11b** suma sus tres secciones (contraseña, datos y supresión) antes de «Salir».
- **F11d** suma «Estoy en una computadora compartida» después de «Salir».
- **A3** suma, en `model/sign-out.ts` y antes de devolver `signed-out`, el borrado de la última copia (FR-050).
- **D1c** suma el envío de la cola antes del `POST` de salida.

## `app/boot`: las etapas

```ts
// app/boot/access-tokens.ts
export interface LocationLike { readonly pathname: string; readonly search: string; readonly hash: string }
export interface HistoryLike { readonly state: unknown; replaceState(data: unknown, unused: string, url: string): void }
export function readAccessToken(hash: string): AccessToken | null;
export interface TokenStage extends BootStage {
  take(): AccessToken | null; // devuelve el token una vez y lo descarta
  readonly hadToken: boolean; // para A3 (su FR-024)
}
export function createTokenStage(environment: { readonly location: LocationLike; readonly history: HistoryLike }): TokenStage;

// app/boot/session-view.ts
export type SessionFailure =
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'rate-limited'; readonly message: string; readonly retryAfterSeconds: number | null };
export interface SessionView {
  showLoading(): void;
  showFailure(failure: SessionFailure, retry: () => void): void;
  clear(): void;
}
export function createSessionView(): SessionView; // escribe en #session-status

// app/boot/session-gate.ts
export interface SessionGateOptions {
  readonly fetchSession: (request: { readonly signal: AbortSignal }) => Promise<SessionOutcome>;
  readonly storeSession: (snapshot: SessionSnapshot) => void;
  readonly takeAccessToken: () => AccessToken | null;
  readonly requestSignIn: RequestSignIn;
  readonly onReady: () => void;
  readonly view: SessionView;
  readonly timeoutMs: number;
  readonly loadingDelayMs: number;
}
export function createSessionGate(options: SessionGateOptions): BootStage;

// app/boot/account-stages.ts
export const tokenStage: TokenStage;
export const sessionStage: BootStage;
```

`main.tsx` arranca con `runBoot([tokenStage, sessionStage, contentGate, legacyViews])`.

**A3 extiende la etapa de sesión** (ruling C1) en `session-gate.ts`, sin sumar etapas:

- toma `contentVersion` del store;
- con `unreachable` y una copia usable, publica la copia en lugar de mostrar la falla;
- con `tokenStage.hadToken`, no usa la copia;
- con el tope de 20 s, cubre el intento entero (sesión y porciones).

Si A3 decide unir la sesión al intento de la compuerta, mueve `fetchSession` dentro de su fuente y retira `sessionStage`. Lo decide su plan.

## `qa/e2e`: el doble de la API

```ts
// qa/e2e/lib/api-contract.ts
export interface PublishedAccount { id: number; name: string; email: string; role: 'student' | 'admin'; privacyAccepted: boolean }
export const STUDENT: PublishedAccount; // {id: 41, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true}
export const ADMIN: PublishedAccount; // {id: 1, name: 'Olga Ruiz', email: 'olga@x.com', role: 'admin', privacyAccepted: true}
export const INVITATION: { token: string; email: string; role: 'student'; expiresAt: string };
export const RESET_LINK: { token: string; email: string };
export const MESSAGES: Readonly<Record<string, string>>; // copias de lang/es/api.php y password-policy.php
export function errorBody(code: string, errors?: Record<string, string[]>): { message: string; code: string; errors?: Record<string, string[]> };

// qa/e2e/fixtures/api-double.ts
export type ApiRoute = `${'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} /api/${string}`;
export interface ApiCall { method: string; path: string; xsrf: string | undefined; user: string | undefined; body: unknown }
export interface ApiReply { status: number; json?: unknown; body?: string; contentType?: string; headers?: Record<string, string> }
export type ApiHandler = (call: ApiCall) => ApiReply | Promise<ApiReply>;

export class ApiDouble {
  account: PublishedAccount | null;
  signInAccount: PublishedAccount;
  readonly calls: ApiCall[];
  static install(page: Page, context: BrowserContext, baseURL: string, account: PublishedAccount | null): Promise<ApiDouble>;
  on(route: ApiRoute, handler: ApiHandler): void;
  reply(route: ApiRoute, ...replies: ApiReply[]): void;
  callsTo(route: ApiRoute): ApiCall[];
  xsrfValue(): string;
  assertAllHandled(): void;
}

// qa/e2e/fixtures/index.ts
interface Options { sessionAccount: PublishedAccount | null } // [STUDENT, {option: true}]
interface Fixtures { api: ApiDouble /* automático */; access: AccessPage; account: AccountPage; /* y los de F1 */ }
```

**Las rutas del doble por omisión:**

| Ruta | Respuesta |
| --- | --- |
| `GET /api/session` | 200 `{user: account, features: {passwordReset: false, registration: false}, contentVersion: <la versión de build/curriculum.meta.json>, catalogs: []}`, con `Cache-Control: no-store` |
| `POST /api/auth/login` | 200 `{data: signInAccount}`; la sesión pasa a `signInAccount` y la cookie rota |
| `POST /api/auth/logout` | 204; la sesión pasa a `null` y la cookie rota |
| `POST /api/auth/invitations/lookup` | 200 `{email, role, expiresAt}` de `INVITATION` |
| `POST /api/auth/invitations/accept` | 201 `{data: {id: 77, name: <el del cuerpo>, email: INVITATION.email, role: 'student', privacyAccepted: true}}`; la sesión pasa a esa cuenta |
| `POST /api/auth/reset-password` | 200 `{}` |
| `POST /api/me/privacy` | 204; `account.privacyAccepted` pasa a `true` |
| Cualquier pedido que modifica sin el `X-XSRF-TOKEN` vigente | 419 `csrf_token_mismatch` |
| Cualquier otra ruta de `/api/` | 404 `not_found`; queda anotada y el test falla al desmontar |

**Lo que suman otros ítems:**

- **A3** suma las 17 porciones con `api.on('GET /api/exercises', …)`, etcétera, y cambia `contentVersion` si lo necesita.
- **F8** suma `GET /api/progress`, `POST /api/auth/confirm-password` (si F11b no lo sumó) y `POST /api/progress/reset`.
- **F12** suma `/api/admin/*` y usa `test.use({sessionAccount: ADMIN})`.
