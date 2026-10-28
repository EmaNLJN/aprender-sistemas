# Contrato: las interfaces de F8

**Input:** [spec.md](../spec.md), [plan.md](../plan.md) y [research.md](../research.md).

Las rutas son relativas a `frontend/src/`, salvo que digan otra cosa. Un slice se importa por su `index.ts`, y una tarea que cambia una firma cambia este contrato en el mismo commit. Lo de F11a sale de su contrato (`specs/015-f11-acceso-cuenta/contracts/front-interfaces.md`, en la rama `plan/f11a-acceso`) y se usa tal cual.

## 1. `features/progress-backup`: lo que suma Q1

```ts
// features/progress-backup/model/types.ts (agregados; el resto no cambia)
export interface ResetRefusal {
  readonly passwordMessages: readonly string[]; // en el campo «Tu contraseña», con aria-invalid
  readonly generalMessages: readonly string[]; // en el error general (role="alert")
  readonly retryAfterSeconds: number | null; // 429: «Borrar todo» no se reenvía antes
  readonly offerReload: boolean; // «Recargar»
  readonly clearPassword: boolean; // 401 con la misma cuenta: el campo vuelve vacío
}

export type ServerResetResult =
  | { readonly confirmed: true }
  | { readonly confirmed: false; readonly refusal: ResetRefusal };

export type ServerReset = (confirmation: ResetConfirmation) => Promise<ServerResetResult>;

export interface ResetRefused {
  readonly refusal: ResetRefusal;
}

export type ResetOutcome = ProgressNotice | ResetRefused;

export interface ProgressBackupOptions {
  guide: GuideData;
  areas: ProgressAreas;
  sessionResets: readonly (() => void)[];
  serverReset?: ServerReset; // nuevo
}

export interface ProgressBackup {
  exportProgress(): ProgressFile;
  listBackups(): BackupListing[];
  readBackup(key: string): ProgressFile | undefined;
  planImport(text: string): ProgressImportPlan;
  applyImport(plan: ProgressImportPlan): Promise<ProgressNotice>;
  resetAll(confirmation?: ResetConfirmation): Promise<ResetOutcome>; // antes, Promise<ProgressNotice>
}
```

**Qué hace `resetAll`:**

- **Sin `serverReset`:** el borrado local de hoy, sin cambios.
- **Con `serverReset`:**
  1. llama a `serverReset(confirmation ?? { password: '' })`;
  2. si devuelve `confirmed: false`, resuelve `{refusal}` sin llamar a ningún área ni a los pasos de sesión;
  3. si devuelve `confirmed: true`, corre el borrado local de hoy y resuelve `{notice}`.

`index.ts` suma los tipos `ResetOutcome`, `ResetRefusal`, `ResetRefused`, `ServerReset` y `ServerResetResult`. Los tipos entran en U3 (T009), sin comportamiento; `resetWithServer` llega en U4 (T016).

## 2. `app/progress-backup`: el armado

```ts
// app/progress-backup/progress-areas.ts (puro: sólo tipos de entities y de la feature)
export interface LegacyLabProgress {
  exportState(): unknown;
  planImport(raw: unknown): SectionPlan;
  applyImport(plan: SectionPlan): unknown;
  reset(): boolean | undefined | Promise<boolean | undefined>;
  backups?(): BackupEntry[];
}

export interface LegacyProgressWindow {
  readonly TallerLab?: LegacyLabProgress;
  readonly TallerCampaign?: { sync(): void };
  readonly TallerSystems?: { sync(): void; resetSimulations(): void };
}

export interface EngineProgress<Plan extends SectionPlan> {
  exportState(): unknown;
  planImport(raw: unknown): Plan;
  applyImport(plan: Plan): unknown;
  reset(): { removed: boolean } | Promise<{ removed: boolean }>;
  backups(): BackupEntry[];
}

export interface ProgressSources {
  readonly route: RouteArea;
  readonly campaign: EngineProgress<CampaignImportPlan>;
  readonly systems: EngineProgress<SystemsImportPlan>;
  legacy(): LegacyProgressWindow; // se lee en cada llamada, nunca al armar
}

export function createProgressAreas(sources: ProgressSources): ProgressAreas;

// app/progress-backup/server-reset.ts
export const SERVER_UNREACHABLE: string; // L6
export const EPOCH_MOVED: string; // L5
export const ACCOUNT_LOST: string; // 'La sesión cambió de cuenta: recargá la página.'

export interface ServerResetDependencies {
  readonly client: ApiClient;
  accountId(): number | null;
  reauthenticate(expectedUserId: number): Promise<ReauthenticationOutcome>;
}

export function refusalFor(failure: ApiFailure): ResetRefusal;
export function createServerReset(dependencies: ServerResetDependencies): ServerReset;

// app/progress-backup/app-progress-backup.ts
export interface AppProgressBackup extends ProgressBackup {
  registerSessionReset(reset: () => void): void; // mientras el temporizador viva en app.js (F9 lo retira)
}

export function appProgressBackup(): AppProgressBackup; // la crea en la primera llamada; después, la misma
```

**`createProgressAreas`** traduce cada área con las lecturas de hoy:

- **El laboratorio** lee `legacy().TallerLab` en cada llamada:
  - `exportState` y `reset` con `?.`;
  - `planImport` y `applyImport` sin `?.`: con el adaptador ausente lanzan el `TypeError` de hoy;
  - `backups?.() ?? []`.
- **Los motores:**
  - `reset` resuelve `(await engine.reset()).removed`;
  - `applyImport` le pasa al motor el plan que él mismo calculó;
  - `syncDerivedSeals` llama a `legacy().TallerCampaign?.sync()` o a `legacy().TallerSystems?.sync()`.
- **El recorrido** pasa tal cual.

**`appProgressBackup()`:**

- arma la instancia con:
  - `getContent().guide`;
  - `createProgressAreas({ route: routeStore, campaign: campaignEngine, systems: systemsEngine, legacy: () => window })`;
  - los pasos de sesión `[() => window.TallerSystems?.resetSimulations()]`;
  - `serverReset` (desde U4);
- la llama sólo `legacy-views.ts`;
- es el único archivo de `app/` que, además de los dueños, puede importar valores de los índices de `entities/guide`, `entities/campaign` y `entities/systems-workshop` (R4 de `seams-guard-check`, ampliada).

## 3. `app.js` y el adaptador

```ts
// frontend/app.js
export function startApp(progressBackup: AppProgressBackup): void;

// app/legacy/register-method.tsx
declare global {
  interface Window {
    TallerMethod: Readonly<{
      mount(host: HTMLElement | null, notify: (message: string) => void, progressBackup: ProgressBackup): void;
      unmount(): void;
    }>;
  }
}
```

**Lo que hace `startApp(progressBackup)`:**

- **Lo arma `legacy-views.ts`:**

  ```ts
  const progressBackup = appProgressBackup();
  startApp(progressBackup);
  ```

  `startApp(progressBackup)` va en su propia línea, que es la que leen `load-order-check` y el plugin `withoutStartCall`.
- **Lo que hace con la instancia:**
  - la usa para «Exportar mi progreso»;
  - registra el paso del temporizador con `registerSessionReset`;
  - se la pasa a `window.TallerMethod.mount($('#main'), toast, progressBackup)` en `render()`.

**El adaptador:**

- se evalúa antes que `app.js`;
- no toca el almacenamiento, no registra oyentes ni intervalos y no importa `routeStore` ni el armado;
- al montar, dibuja `MethodPage` dentro de `flushSync`, con `getContent().guide.sources`. Un error de React va a `console.error('No se pudo mostrar Método.', error)`.

## 4. `pages/method`

```ts
// pages/method/index.ts
export { default as MethodPage } from './ui/MethodPage';
export type { MethodPageProps } from './ui/MethodPage';

// pages/method/ui/MethodPage.tsx
export interface MethodPageProps {
  readonly sources: readonly GuideSource[];
  readonly progressBackup: ProgressBackup;
  readonly store?: RouteStore; // por omisión, routeStore; sólo las specs pasan otro
  notify(message: string): void;
  reloadDocument(): void; // desde U4: «Recargar» de la confirmación
}

// pages/method/model/method-texts.ts
export const NOTE_STATE: Readonly<{ automatic: string; unavailable: string; saved: string; notSaved: string }>;
export function noteStateOnMount(storageAvailable: boolean): string;
export function noteStateAfterWrite(storageAvailable: boolean): string;
export function tutorPrompt(progress: RouteProgressV1): string;
export function languageName(language: 'rust' | 'go'): string; // «Rust» o «Go»
export function backupSizeLabel(text: string): string; // caracteres / 1024, con un decimal: «0.0 KB»

// pages/method/model/write-note.ts
export type NoteField = 'learned' | 'next';
export function writeNote(store: RouteStore, field: NoteField, value: string): boolean; // asigna, guarda una vez y responde storageAvailable()

// pages/method/lib/copy-with-fallback.ts
export type CopyResult = 'clipboard' | 'command' | 'selection';
export function copyWithFallback(text: string, fallbackTarget: HTMLElement): Promise<CopyResult>;
```

## 5. `shared/lib/download-file.ts`

```ts
export interface DownloadableFile {
  readonly fileName: string;
  readonly text: string;
}
export function downloadJsonFile(file: DownloadableFile): void; // downloadBlob(new Blob([text], { type: 'application/json' }), fileName)
```

## 6. `qa/`

```ts
// qa/lib/sources.ts
export interface AppBundleOptions {
  withoutStartCall?: boolean;
  expose?: readonly string[]; // módulos cuyas exportaciones quedan en globalThis.__QA_EXPOSED__, del mismo bundle
}
export function runEntry<T>(context: vm.Context, name: string, contents: string): T; // una entrada virtual

// qa/lib/legacy-sources.ts
export interface ShellProgressBackup {
  exportProgress(): { fileName: string; text: string };
  registerSessionReset(reset: () => void): void;
}
export interface AppShellModule {
  startApp(progressBackup: ShellProgressBackup): void;
  routeStore: ShellRouteStore; // el del mismo bundle que app.js
  createProgressBackup(options: unknown): Omit<ShellProgressBackup, 'registerSessionReset'>;
  createProgressAreas(sources: unknown): unknown;
}
export function loadAppShell(context: vm.Context): AppShellModule;

// qa/lib/app-shell-harness.ts
export function startShell(harness: Harness): void; // startApp con la instancia de áreas falsas
// Harness suma: shell: AppShellModule | null; writeNote(field: 'learned' | 'next', value: string): void; resetRoute(): void
```

## 7. Los E2E

```ts
// qa/e2e/pages/method.ts
export class MethodPage {
  readonly learnedNote: Locator;
  readonly nextNote: Locator;
  readonly noteState: Locator;
  readonly tutorPrompt: Locator;
  readonly confirmation: Locator;
  readonly password: Locator; // desde U4
  journalHeading(language: 'Rust' | 'Go'): Locator;
  button(name: string): Locator;
  resetProgress(): Locator; // de F5 y F9, sin cambios
  confirmReset(): Locator; // de F5 y F9, sin cambios
  keepProgress(): Locator;
  backupItem(key: string): Locator;
  downloadBackup(area: string, key: string): Locator;
  exportFromPage(): Promise<Download>;
  exportFromSidebar(): Promise<Download>;
  importFile(file: string | FilePayload): Promise<void>;
  resetEverything(password?: string): Promise<void>; // desde U4: abre, escribe la contraseña y confirma
}

// qa/e2e/lib/method-files.ts
export const E2E_PASSWORD: string;
export const FROZEN_EXPORTS: Readonly<Record<'master2a278ad' | 'd0e1b49', string>>; // rutas
export function downloadedText(download: Download): Promise<string>;
export function brokenJsonFile(): FilePayload;
export function oversizedFile(): FilePayload;
export function version2File(): FilePayload;
```

**El doble de la API, desde U4:**

- **Las rutas por omisión que suma F8:**
  - `POST /api/auth/confirm-password` responde 201 `{}`;
  - `GET /api/progress` responde 200 con `{userId, epoch: 1, revision: 0, resetAt: null, contentVersion, serverTime}`;
  - `POST /api/progress/reset` responde 200 `{epoch: 2, revision: 1}`.
- **Los mensajes:** `MESSAGES` suma `password_confirmation_required`, `epoch_mismatch`, `client_outdated`, `email_unverified` y `content_not_imported`.
