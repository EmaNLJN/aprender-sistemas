# Contrato: lo que suma F11b, la cuenta

**Input**: [spec.md](../spec.md) (FR-053 a FR-059), [plan-f11b.md](../plan-f11b.md) y [research-f11b.md](../research-f11b.md). Extiende el contrato de F11a, [front-interfaces.md](./front-interfaces.md), sin cambiar ninguna de sus firmas salvo la de `ApiClient`, que suma un método. La tarea que lo suma (T037) actualiza `front-interfaces.md` en el mismo commit, como pide ese contrato.

Las rutas son relativas a `frontend/src/`. Cada slice se importa por su `index.ts`; las ayudas de las specs, por su ruta.

## `shared/api/http`: la descarga

```ts
// shared/api/http/api-failure.ts (suma)
export type ApiDownload =
  | { readonly ok: true; readonly status: number; readonly blob: Blob; readonly filename: string | null }
  | { readonly ok: false; readonly failure: ApiFailure };

// shared/api/http/api-client.ts (ApiClient suma un método)
export interface ApiClient {
  get(path: string, options?: ApiRequestOptions): Promise<ApiResult>;
  send(method: ApiMethod, path: string, body: unknown, options?: ApiRequestOptions): Promise<ApiResult>;
  download(method: ApiMethod, path: string, options?: ApiRequestOptions): Promise<ApiDownload>;
}

// shared/api/http/attachment-name.ts (nuevo)
export function readAttachmentName(header: string | null): string | null;

// shared/api/http/fake-fetch.ts (ayuda de las specs; suma)
export interface FakeReply {
  readonly status: number;
  readonly json?: unknown;
  readonly text?: string;
  readonly body?: ReadableStream<Uint8Array>; // nuevo: un cuerpo que se lee por partes
  readonly headers?: Readonly<Record<string, string>>;
}
export function cutBody(prefix: string): ReadableStream<Uint8Array>; // entrega `prefix` y después falla
```

**Reglas de `download`:**

- **Los encabezados** son los de `send`: `Accept`, `Content-Type`, `X-XSRF-TOKEN` leído en ese momento y `X-Taller-User` sólo con `asUser`. No manda cuerpo.
- **Con 2xx,** lee el cuerpo con `blob()`, sin interpretarlo, y el nombre con `readAttachmentName(Content-Disposition)`.
- **Si no es 2xx,** lee el error como `send`: `{message, code}` da `response`, y cualquier otra cosa, `unexpected`.
- **El 419** se resuelve como en `send`: pide la sesión y reintenta una vez con la misma cuenta. Con otra cuenta da `account-changed`, y sin sesión, `signed-out`.
- **Una falla de red,** también a mitad del cuerpo, da `network`. Nunca devuelve un `Blob` parcial.

**`readAttachmentName`:**

| Encabezado | Resultado |
| --- | --- |
| `attachment; filename="taller-41-20261028.json"` | `taller-41-20261028.json` |
| `attachment; filename=taller-41-20261028.json` | `taller-41-20261028.json` |
| `attachment; filename*=UTF-8''taller.json` (sólo la forma extendida) | `null` |
| `inline` o `null` | `null` |

## `shared/ui/form`: los textos compartidos

```ts
// shared/ui/form/form-texts.ts (nuevo; se exporta por el índice)
export const REQUIRED = 'Completá este campo.';
export const MISMATCH = 'La confirmación de la contraseña no coincide.';
export const PASSWORD_HINT = 'Entre 15 y 64 caracteres. Puede ser una frase; no hace falta mezclar símbolos.';
```

`features/sign-in/ui/access-texts.ts` los reexporta con `export { MISMATCH, PASSWORD_HINT, REQUIRED } from '../../../shared/ui/form';` y borra sus copias. Así el acceso no cambia sus imports (R31).

## `features/confirm-password`: la confirmación compartida

```ts
// features/confirm-password/api/confirm-password.ts
export type ConfirmPasswordOutcome =
  | { readonly ok: true; readonly value: true }
  | { readonly ok: false; readonly failure: ApiFailure };
export function confirmPassword(client: ApiClient, userId: number, password: string): Promise<ConfirmPasswordOutcome>;

// features/confirm-password/model/wrong-password.ts
export const WRONG_PASSWORD = 'La contraseña no es correcta.';
export function isWrongPassword(failure: ApiFailure): boolean; // el 422 auth_failed

// features/confirm-password/index.ts
export { confirmPassword } from './api/confirm-password';
export type { ConfirmPasswordOutcome } from './api/confirm-password';
export { WRONG_PASSWORD, isWrongPassword } from './model/wrong-password';
```

**Reglas:**

- `confirmPassword` llama a `POST /api/auth/confirm-password {password}` con `X-Taller-User`, y acepta el 201 con `{}`.
- La forma de `ConfirmPasswordOutcome` es la de `AdminOutcome<true>` de F12a. Así la mudanza de F12a no cambia el resultado de su `confirmPassword` (R23).
- `WRONG_PASSWORD` es el texto que muestra el campo ante un 422 `auth_failed` en una confirmación. Lo usan F11b y F12a, y F8 puede tomarlo (R24).

**`PasswordStep` no se muda:** queda en `pages/admin` (R23).

## `pages/account`: lo que suma F11b

La API pública del slice no cambia: `index.ts` sigue exportando sólo `AccountMenu`. Lo que sigue son las interfaces internas que usan las tareas.

```ts
// pages/account/model/account-context.ts
export interface AccountContextValue {
  readonly account: PublishedUser;
  reloadDocument(): void;
}
export const AccountContext: React.Context<AccountContextValue | null>;
export function useAccountContext(): AccountContextValue; // lanza sin proveedor

// pages/account/model/account-failure.ts
export function describeAccountFailure(failure: ApiFailure, visibleFields: readonly string[]): FailureDescription;
// = describeFailure, y además offerReload: true ante un 403 account_disabled
export function passwordProblem(failure: ApiFailure, wrongPasswordMessage: string): string | null;
// 422 auth_failed: wrongPasswordMessage; 423: el mensaje del servidor; lo demás: null

// pages/account/api/account-endpoints.ts
export type AccountOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: ApiFailure };
export interface PasswordChange {
  readonly current_password: string;
  readonly password: string;
  readonly password_confirmation: string;
}
export interface AccountFile {
  readonly blob: Blob;
  readonly filename: string; // el de Content-Disposition, o 'taller-datos.json'
}
export function changePassword(client: ApiClient, userId: number, change: PasswordChange): Promise<AccountOutcome<true>>;
export function exportAccountData(client: ApiClient, userId: number): Promise<AccountOutcome<AccountFile>>;
export function deleteAccount(client: ApiClient, userId: number): Promise<AccountOutcome<string | null>>; // el mensaje del 202, o null

// Hooks (un archivo cada uno, export default)
useAccountFailure: <T extends FieldValues>(
  setError: UseFormSetError<T>,
  visibleFields: readonly Path<T>[],
  password: { readonly field: Path<T>; readonly wrongMessage: string },
) => { handle(failure: ApiFailure): void; offerReload: boolean; waiting: boolean; reloadDocument(): void };
useStillMounted: () => () => boolean;

// Componentes (un archivo cada uno, export default)
AccountActions:       {}
AccountSubdialog:     { title: string; children: ReactNode; onClose(): void } // modal, corta close y cancel
AccountResult:        { message: string; actionLabel: string; onAction(): void } // role="status", con el foco
ChangePasswordDialog: { onClose(): void }
ChangePasswordForm:   { onChanged(): void }
DownloadDataDialog:   { save(blob: Blob, filename: string): void; onClose(): void }
DownloadDataForm:     { save(blob: Blob, filename: string): void; onSaved(filename: string): void }
DeleteAccountDialog:  { onClose(): void }
DeleteAccountForm:    { onDeleted(message: string | null): void }
IrreversibleField:    { registration: UseFormRegisterReturn; messages: readonly string[] }
```

**`useAccountFailure`,** en este orden:

1. `passwordProblem(failure, password.wrongMessage)` no es `null`: marca `password.field` con ese texto, con el foco.
2. `signedOut`: llama a `reauthenticate(account.id, {requestSignIn, reloadDocument})` sin esperarla. Con la misma cuenta, el formulario sigue con lo escrito; con otra, recarga.
3. Lo demás: `showFailure` con `describeAccountFailure`, `offerReload` y la espera del 429.

**El diálogo «Tu cuenta»** compone sus secciones en este orden, cualquiera llegue primero entre F11b, F12a y F11d (R26):

1. «{nombre} · {email}»;
2. «Aviso de privacidad»;
3. «Administrar el taller» (F12a, sólo un admin), **justo después del aviso**;
4. `AccountActions` (F11b), **justo antes de `<SignOutSection`**, dentro de `<AccountContext value={{ account, reloadDocument }}>`;
5. `SignOutSection`;
6. «Estoy en una computadora compartida» (F11d), después de «Salir»;
7. «Volver al taller».

**`AccountActions`** dibuja tres botones `text-button`: «Cambiar la contraseña», «Descargar mis datos» y «Borrar mi cuenta». El diálogo abierto va con `createPortal(…, document.body)`.

**Los títulos de los diálogos:**

| Botón | Diálogo | Botón de envío | Mientras espera | Al terminar |
| --- | --- | --- | --- | --- |
| «Cambiar la contraseña» | «Cambiar la contraseña» | «Cambiar la contraseña» | «Cambiando la contraseña…» | «Tu contraseña cambió. Cerramos tus otras sesiones; esta sigue abierta.» y «Listo» |
| «Descargar mis datos» | «Descargá los datos de tu cuenta» | «Descargar mis datos» | «Preparando el archivo…» | «Listo: se descargó {archivo}.» y «Volver» |
| «Borrar mi cuenta» | «Borrar tu cuenta» | «Borrar mi cuenta» | «Borrando…» | El mensaje del 202 y «Entendido», que recarga; cerrar también recarga |

## `qa/e2e`: lo que suma F11b

```ts
// qa/e2e/lib/account-contract.ts (nuevo)
export const ACCOUNT_MESSAGES: {
  readonly password_confirmation_required: 'Confirmá tu contraseña para continuar.';
  readonly last_admin: 'Tiene que quedar al menos un admin activo.';
};
export const DELETION_MESSAGE: string; // lang/es/account.php, account.deletion.own
export const CONFIRMED_MISMATCH: string; // «La confirmación de contraseña no coincide.»
export const EXPORT_FILE: { readonly name: string; readonly text: string };
export function accountError(code: keyof typeof ACCOUNT_MESSAGES): { message: string; code: string };

// qa/e2e/pages/account.ts (AccountPage suma)
export type AccountAction = 'Cambiar la contraseña' | 'Descargar mis datos' | 'Borrar mi cuenta';
class AccountPage {
  actionDialog(action: AccountAction): Locator; // el diálogo por su título
  openAction(action: AccountAction): Promise<Locator>;
  changePassword(current: string, next: string, confirmation?: string): Promise<void>;
  confirmWithPassword(action: 'Descargar mis datos' | 'Borrar mi cuenta', password: string): Promise<void>;
}
```

Cada escenario registra sus rutas con `api.on`: `POST /api/auth/confirm-password`, `PUT /api/me/password`, `POST /api/me/export` y `DELETE /api/me`. El doble no suma rutas por omisión.

## Lo que toman otros ítems

- **F12a:**
  - importa `confirmPassword`, `WRONG_PASSWORD` e `isWrongPassword` de `features/confirm-password`, y no los crea en `pages/admin`. Si F12a entró antes, la mudanza la hace T041;
  - pone «Administrar el taller» justo después del aviso.
- **F8:** puede llamar a `confirmPassword` y mostrar `WRONG_PASSWORD` en lugar del texto del servidor (hallazgo 3 de C3a).
- **F11d:** pone «Estoy en una computadora compartida» después de `<SignOutSection` y puede leer `useAccountContext()` si la envuelve el mismo proveedor.
- **C4:** la compuerta G1 suma F11b integrada (decisión del 2026-10-28), y su recorrido de la CSP suma los tres diálogos.
- **F10:** cuando «Tu cuenta» pase al shell, el portal de `AccountActions` puede apuntar a la raíz única.
