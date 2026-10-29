# Contrato de F13: las superficies de la sincronización

**Input**: [spec.md](../spec.md), [plan.md](../plan.md), [data-model.md](../data-model.md) y el [contrato del cliente v2 de D1c](../../007-d1-progreso-sincronizacion/contracts/sync-client-d1c.md) (PR #93, `plan/d1c-cliente-v2` en `2e743c00`). Las rutas son relativas a `frontend/src/`, salvo las de `qa/`. Una tarea que cambia una firma de este contrato lo cambia en el mismo commit.

## 1. `features/progress-sync`: lo que F13 suma al índice

```ts
// ui/account-line.ts
export type AccountFamily = 'synced' | 'pending' | 'problem';
export interface AccountLine {
  readonly text: string;
  readonly family: AccountFamily;
}
export function accountLine(status: SyncStatus | null): AccountLine | null;

// ui/sync-copy.ts
export function inMemory(mode: StorageMode): boolean;
export function signOutNote(mode: StorageMode | null): string;
export function questionText(count: number, reason: string): string;
export const SIGN_OUT_TEXTS: {
  readonly progressLabel: 'Tu progreso';
  readonly sending: 'Enviando tus cambios…';
  readonly title: 'Hay cambios que no llegaron a tu cuenta';
  readonly keep: 'Conservarlos y salir';
  readonly keepHint: string;
  readonly discard: 'Descartarlos y salir';
  readonly discardHint: string;
  readonly downloadCopy: 'Descargar una copia';
  readonly leaveUnsent: 'Salir sin enviarlos';
  readonly leaveUnsentHint: string;
  readonly back: 'Volver al taller';
};

// ui/sync-toasts.ts
export function watchSyncToasts(
  store: StoreApi<ProgressSyncState>,
  notify: (message: string) => void,
): () => void;

// ui/unload-guard.ts
export function watchUnloadGuard(
  store: StoreApi<ProgressSyncState>,
  target: EventTarget,
  reloadWasChosen: () => boolean,
): () => void;

// ui/unsent-download.ts
export function downloadUnsentFile(file: UnsentFile | null): void;

// ui/useSyncSnapshot.ts (default, reexportado con nombre)
export function useSyncSnapshot<T>(
  sync: ProgressSync | null,
  select: (state: ProgressSyncState) => T,
  fallback: T,
): T;

// ui/SyncNoticeStrip.tsx (default, reexportado con nombre)
interface SyncNoticeStripProps {
  readonly sync: ProgressSync;
  onSignIn(): void;
  reloadDocument(): void;
}

// ui/AccountMismatchDialog.tsx (default, reexportado con nombre)
interface AccountMismatchDialogProps {
  readonly sync: ProgressSync;
  reloadDocument(): void;
}

// ui/AccountChangedDialog.tsx (default, reexportado con nombre)
interface AccountChangedDialogProps {
  readonly lost: number;
  onDownload(): void;
  onContinue(): void;
}
```

| Pieza | Qué hace | Qué no hace |
| --- | --- | --- |
| `accountLine` | El texto y la familia de cada estado (data-model.md §2) | No dibuja |
| `watchSyncToasts` | Llama a `notify` una vez por transición (data-model.md §3); devuelve con qué dejar de escuchar | No decide reintentos ni lee la red |
| `watchUnloadGuard` | Pone y saca el oyente de `beforeunload` con `lostOnUnload` (data-model.md §7) | No queda puesto siempre (FR-037) |
| `downloadUnsentFile` | Baja el `UnsentFile` de D1c con su nombre; con `null`, nada | No vacía la cola ni borra la copia |
| `useSyncSnapshot` | Lee un dato del estado y sigue sus cambios; sin motor, devuelve `fallback` | El selector tiene que devolver un primitivo o una referencia estable |
| `SyncNoticeStrip` | La franja: `#sync-notices`, `aria-live="polite"`, sin `role`, montada siempre | No mueve el foco cuando aparece un aviso |
| `AccountMismatchDialog` | Con `accountMismatch`, el diálogo modal sin Esc (FR-019 a FR-022); sin él, nada | No muestra nombres, emails ni ids |
| `AccountChangedDialog` | «Cambiaste de cuenta», modal sin Esc (FR-016) | No recarga solo |

## 2. `shared/lib/reload-document.ts`

```ts
export function reloadDocument(): void; // de F11a; F13 le suma la marca
export function reloadWasChosen(): boolean;
```

`reloadDocument()` anota que la recarga fue elegida antes de llamar a `window.location.reload()`. Lo usan todas las recargas que el alumno eligió (research, R4).

## 3. `app/`

```ts
// app/shell/Sidebar.tsx: una prop más, opcional
interface SidebarProps {
  // …las de F10b, sin cambios…
  readonly accountLine?: AccountLine | null;
}

// app/shell/SyncNotices.tsx (default)
interface SyncNoticesProps {
  readonly sync: ProgressSync;
  readonly requestSignIn: RequestSignIn;
  reloadDocument(): void;
}

// app/shell/sync-watchers.ts
export function startSyncWatchers(sync: ProgressSync, notify: (message: string) => void): () => void;
```

- **`Shell`** dibuja `<SyncNotices>` entre `#session-status` y `<main>`, y pasa a `Sidebar` la línea de `appProgressSync()`.
- **`AppRoot`** dibuja `<AccountMismatchDialog>` después de `#account-root`, y envuelve el árbol con `SignOutProgressContext` y `ProgressSyncContext` si la base no lo hace (plan, T001, D8).
- **`startTaller`** llama a `startSyncWatchers(appProgressSync(), notify)` antes de `runBoot`.

## 4. `pages/account`

`SignOutSection` conserva sus props (`userId` y `reloadDocument`). Lee el puerto de D1c (`useSignOutProgress()`) y el motor (`useProgressSync()`), y pasa a `signOut` `choose` y `onPhase`. Suma, junto a «Salir», «Tu progreso» y la nota de su modo (data-model.md §6). `SignOutQuestion` y `useSignOutQuestion` son internos de la página.

## 5. El DOM que fijan los E2E

| Qué | Cómo se ubica | Por qué así |
| --- | --- | --- |
| La línea de la cuenta en el pie | `.sidebar .account-status` | No es una región viva ni tiene rol (FR-008) |
| La franja | `#sync-notices` | No tiene rol (FR-013), como `#toast` |
| Un aviso | `#sync-notices .sync-notice` | Su texto va en un solo `<p>` |
| El diálogo de cuenta distinta | `getByRole('alertdialog', { name: 'Esta pestaña quedó con otra cuenta' })` | Rol y nombre |
| «Cambiaste de cuenta» | `getByRole('alertdialog', { name: 'Cambiaste de cuenta' })` | Rol y nombre |
| La pregunta al salir | `getByRole('dialog', { name: 'Hay cambios que no llegaron a tu cuenta' })` | Rol y nombre |
| «Tu progreso» | `getByRole('term')` y `getByRole('definition')` dentro de «Tu cuenta» | Lista de definición |

En una corrida sin problemas, `getByRole('status')` encuentra sólo `#toast` y `getByRole('alert')`, nada (SC-008).

## 6. `qa/e2e`

```ts
// qa/e2e/lib/sync-replies.ts
export const OFFLINE: ApiReply; // { status: 0, abort: true }
export const ANOTHER_STUDENT: PublishedAccount; // id 52
export interface SyncReplyOptions {
  readonly serverTimeShiftMs?: number;
  readonly rejected?: number;
}
export function syncReply(call: ApiCall, contentVersion: string, options?: SyncReplyOptions): ApiReply;
export function progressPhoto(contentVersion: string, overrides?: Record<string, unknown>): Record<string, unknown>;

// qa/e2e/lib/unload-dialogs.ts
export function countUnloadDialogs(page: Page): () => number;

// qa/e2e/pages/shell.ts (suma)
readonly accountStatus: Locator;
readonly syncNotices: Locator;
readonly mismatchDialog: Locator;
readonly accountChangedDialog: Locator;
syncButton(name: string): Locator;
mismatchButton(name: string): Locator;
accountChangedButton(name: string): Locator;

// qa/e2e/pages/account.ts (suma)
readonly question: Locator;
readonly progressLabel: Locator;
readonly progress: Locator;
questionButton(name: string): Locator;

// qa/e2e/pages/access.ts (suma)
accessDialog(): Locator;
signInFromDialog(email: string, password: string): Promise<void>;

// qa/e2e/fixtures/index.ts (suma)
// opción: syncNotices: 'none' | 'allowed' (por omisión 'none')
// fixture automática: quietSync, que con 'none' afirma al terminar la franja vacía y ningún diálogo de cuenta abierto
```

El método privado `upToDateSync(call)` del doble de D1c pasa a devolver `syncReply(call, this.contentVersion)`.
