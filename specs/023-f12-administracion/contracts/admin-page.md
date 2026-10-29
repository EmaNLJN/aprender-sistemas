# Contrato: la página de la administración y su contenedor

**Input**: [spec.md](../spec.md) («Dónde vive la administración» y «El compromiso con F10»), [plan.md](../plan.md) y [research.md](../research.md). Lo consumen las tareas de F12a y, después, F10 (la ruta enlazable), F12b (el correo) y F11b (el pedido compartido de la contraseña). Las firmas son exactas: una tarea que las cambia cambia este contrato en el mismo commit.

Las rutas son relativas a `frontend/src/`. Cada slice se importa por su `index.ts` (`docs/architecture.md`, «Feature-Sliced Design incremental»). Las firmas de F11a que se citan son las de su contrato (`specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`), contrastadas el 2026-10-28 con el código de `impl-f11a` (`f11a/base`, a7b3c71d) en lo que ya está implementado; T001 vuelve a compararlas sobre `f12a/base`.

## `pages/admin`: la página (FR-062)

```ts
// pages/admin/index.ts
export { default as AdminPage } from './ui/AdminPage';
export type { AdminSection } from './model/types';

// pages/admin/model/types.ts
export type AdminSection = 'accounts' | 'invitations';

// pages/admin/ui/AdminPage.tsx
interface AdminPageProps {
  readonly initialSection: AdminSection;
  onClose(): void;
}
```

**Reglas:**

- **Lo que recibe del contenedor:** la sección inicial y qué hacer al cerrar, nada más.
- **Lo que lee por su cuenta:**
  - el cliente, con `useApiClient()` de `shared/api/http`, que provee `AccountRoot`;
  - la cuenta, con `useStore(sessionStore, (state) => state.user?.id ?? null)`;
  - el ingreso, con `reauthenticate(id, { requestSignIn, reloadDocument })` de `features/sign-in`;
  - la recarga, con `reloadDocument()` de `shared/lib/reload-document`.
- **Lo que no importa:** nada de `pages/account`, de `app/` ni de un `<dialog>` contenedor.
- **Al montar:**
  - dibuja una `<section>` con el nombre accesible «Administración»;
  - enfoca su título (`h2`, `tabIndex={-1}`);
  - abre en `initialSection`.

  Sin cuenta en la sesión, no dibuja nada.
- **Lo que guarda:** nombres, emails y enlaces viven en el estado de los componentes y se descartan al desmontar. Nada va al almacenamiento, a la URL ni a un store compartido (FR-008).
- **Sus diálogos:** abre como mucho uno a la vez, dentro de su propio árbol (FR-005). Son modales sobre lo que la contenga.

## `entities/session`: la condición de admin

```ts
// entities/session/model/is-admin.ts, exportado por el índice
export function isAdmin(user: PublishedUser | null): boolean; // true sólo con role === 'admin'
```

La usan la entrada de hoy (`AccountMenu`) y la ruta de F10. Es la única lectura de `user.role` del front.

## `shared/lib/reload-document`

```ts
// shared/lib/reload-document.ts (de F11a desde su T012; F12a no lo cambia)
export function reloadDocument(): void; // window.location.reload()
```

Ya vive acá en `impl-f11a` (`frontend/src/shared/lib/reload-document.ts:1-3`), y `AccountRoot` la importa de acá (`frontend/src/app/account/AccountRoot.tsx:3`). `pages/admin` también. Las specs de componentes la reemplazan con `vi.mock`.

## `pages/account`: la entrada y el lugar del contenedor

```ts
// pages/account/index.ts
export { default as AccountMenu } from './ui/AccountMenu';
export type { AdministrationProps } from './ui/AccountMenu';

// pages/account/ui/AccountMenu.tsx
export interface AdministrationProps {
  onClose(): void;
}

interface AccountMenuProps {
  readonly entryHost: HTMLElement;
  readonly administration?: ComponentType<AdministrationProps>;
  reloadDocument(): void;
}

// pages/account/ui/AccountDialog.tsx
interface AccountDialogProps {
  readonly account: PublishedUser;
  onClose(): void;
  onAdminister?(): void;
  reloadDocument(): void;
}
```

**Reglas:**

- **Cuándo aparece la entrada.** `AccountDialog` muestra «Administrar el taller» entre «Aviso de privacidad» y «Salir», sólo si recibe `onAdminister`. `AccountMenu` se lo pasa sólo con `administration` definido e `isAdmin(account)` (FR-001).
- **Al usarla,** `AccountMenu` cierra «Tu cuenta» y monta `administration` con `onClose`. Ese `onClose` vuelve al estado cerrado y enfoca la entrada «Tu cuenta» (FR-004).
- **Cuándo no existe.** Sin `administration`, o con una cuenta que no es admin, la entrada no está en el documento.
- **Por qué es una prop y no un import:** `pages/account` no puede importar `pages/admin` (dos slices de la misma capa). Es un cambio al contrato de F11a, que decía «Su diálogo a pantalla entera se monta en `AccountMenu`»: lo sigue montando, pero lo recibe de `app/`.
- **Quién lo agrega:** F11a tomó `administration` y `onAdminister` para sus T022, T023 y T025, que en a7b3c71d todavía no están. Si la base ya los trae, T008 suma sólo `isAdmin`, el panel y la entrada; si no, los agrega F12a (plan, rama B2). En los dos casos, las firmas son las de arriba.

## `app/account`: el contenedor de hoy (F12-Q1)

```tsx
// app/account/AdminDialog.tsx
const AdminDialog = ({ onClose }: AdministrationProps) => /* <dialog className="admin-dialog" aria-label="Administración"> con <AdminPage initialSection="accounts" onClose={…} /> */;

// app/account/AccountRoot.tsx
<AccountMenu entryHost={entryHost} administration={AdminDialog} reloadDocument={reloadDocument} />
```

**Reglas:**

- **Al abrir,** el contenedor llama a `showModal()` en `useLayoutEffect`, para que la página enfoque su título después (research.md, R3).
- **Al cerrar,** el `onClose` de la página llama a `dialog.close()`. El evento `close` del propio diálogo llama a `onClose` de `AccountMenu`.
- **Los eventos de los diálogos internos.** El contenedor ignora todo `close` cuyo `target` no sea él mismo, porque en React los eventos de `<dialog>` burbujean (Review Focus 1).
- **Esc:** el contenedor no frena su `cancel`, así que Esc cierra la administración. Con un diálogo interno abierto, Esc cierra el de arriba.

## `qa/e2e`: el doble, el Page Object y los datos

```ts
// qa/e2e/fixtures/api-double.ts (de F11a, sin cambios: impl-f11a, :8-15 y :41)
export interface ApiCall {
  method: string;
  path: string;
  search: string; // la query del pedido, con el '?' ('' si no hay)
  xsrf: string | undefined;
  user: string | undefined;
  body: unknown;
}

// qa/e2e/pages/admin.ts
export class AdminPage {
  readonly region: Locator; // getByRole('region', { name: 'Administración' })
  readonly title: Locator;
  constructor(page: Page, account: AccountPage);
  open(): Promise<void>; // el único método que sabe cómo se abre (FR-063)
  button(name: string): Locator;
  field(label: string): Locator;
  inviteForm(): Locator;
  table(name: string): Locator;
  row(name: RegExp): Locator;
  actions(name: RegExp): Locator;
  notice(text: string): Locator;
  dialog(name: string): Locator;
  openSection(name: 'Cuentas' | 'Invitaciones'): Promise<void>;
  invite(emails: readonly string[], role?: 'Alumno' | 'Admin'): Promise<void>;
  confirmPassword(password: string): Promise<void>;
}

// qa/e2e/fixtures/index.ts (suma el fixture)
interface Fixtures { /* los de F1 y F11a */ admin: AdminPage }

// qa/e2e/lib/admin-contract.ts
export interface AdminUserJson { /* la forma AdminUser de C3b */ }
export interface AdminInvitationJson { /* la forma AdminInvitation de C3b */ }
export const ADMIN_MESSAGES: { forbidden; last_admin; password_confirmation_required; too_many_requests; unauthenticated; not_found };
export const DELETION_MESSAGE: string; // account.deletion.other
export function adminError(code: keyof typeof ADMIN_MESSAGES): { message: string; code: string };
export function adminUser(fields: Pick<AdminUserJson, 'id' | 'name' | 'email'> & Partial<AdminUserJson>): AdminUserJson;
export function invitation(fields: Pick<AdminInvitationJson, 'id' | 'email'> & Partial<AdminInvitationJson>): AdminInvitationJson;
export function pageOf<T>(data: T[], page?: number, lastPage?: number, total?: number): { data: T[]; meta: { page; perPage; total; lastPage } };
export function linkFor(email: string): string;
export const OWN_ROW, ANA_ROW, BETO_ROW, LEAVING_ROW: AdminUserJson;
```

**Las acciones de una fila de «Cuentas»** van en un grupo con el nombre «Acciones sobre {nombre}» (`role="group"`), y la fila que no tiene acciones (la propia, la que se está borrando) no lo dibuja. `actions(name)` devuelve ese grupo: las pruebas cuentan los botones de una fila con `admin.actions(/Ana Pérez/).getByRole('button')`, y con una fila sin acciones el conteo da 0. Así la columna «Uso» de F14, que va antes de «Acciones», no cambia ninguno de esos conteos. La tabla de «Invitaciones» no lleva grupo.

Las rutas de `/api/admin` se suman en cada escenario con `api.on('GET /api/admin/users', …)` y, con un id, una por id (`'PATCH /api/admin/users/12'`). El doble busca la ruta antes de mirar el CSRF: una que falte da 404 y queda en `unhandled`. `on` reemplaza la respuesta que hubiera (`Map.set`), también la de `confirm-password` si F8 la sumó a `installDefaults`. Los escenarios usan `test.use({ sessionAccount: ADMIN })`, y declaran cada falla con `/status of NNN/` o, para un pedido abortado, `/net::ERR_FAILED/`.

## Lo que hace cada ítem que sigue

**F10 (la ruta enlazable, «El compromiso con F10»):**

- **Lo que reemplaza:**
  - `app/account/AdminDialog.tsx` y la prop `administration` de `AccountRoot`, por la ruta que monta `<AdminPage initialSection={…} onClose={…navegar…} />`;
  - la entrada de `AccountDialog`, por un enlace a la ruta, que sigue apareciendo sólo con `isAdmin`;
  - `AdminPage.open()` del Page Object;
  - los escenarios «opens the administration…» y «closes with Esc…» de `admin-entry.spec.ts`, con TDD y en su propio commit.
- **Lo que queda igual:** `pages/admin` entera, y el resto de los E2E de F12a, que ubican la página por su región y sus roles.
- **Lo que decide F10:** la forma de la URL (la vista y, si quiere, la sección, nunca datos) y qué ve en ella una cuenta que no es admin.
- **La regla `.admin-dialog`** de `admin.css` se borra con el contenedor.

**F12b (el correo):**

- **Lo que suma:**
  - la entrega por correo en `InviteForm`, con `features.passwordReset`;
  - `rate_limited` y un resultado sin enlace en `EntryResult` y `RESULT_TEXTS`;
  - `sentAt` y `sendFailedAt` en `AdminInvitation`;
  - «Reenviar por correo» y «Pasar a enlace» en la confirmación del reenvío;
  - «Mandarle un enlace para elegir contraseña» como una cuarta acción de `actionsFor`, con su lugar en `ACTION_SLOTS`;
  - el 503 `mail_unavailable` en `reactionTo`.
- **Lo que reutiliza:** `ActionDialog`, `reactionTo` y las listas, sin cambios de forma.

**F11b (el pedido de la contraseña, compartido):**

- **Lo que hay hoy:** `confirmPassword` (`pages/admin/api/admin-endpoints.ts`) y `PasswordStep` (`pages/admin/ui/PasswordStep.tsx`).
- **Lo que hace F11b,** si llega segunda: los muda a un slice compartido, por ejemplo `features/confirm-password`, con su API pública. `pages/admin` pasa a importarlo de ahí, sin cambiar su comportamiento: las specs de `action-dialog.spec.tsx` siguen en verde sin editarse.
