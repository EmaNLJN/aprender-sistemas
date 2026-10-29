# Contrato F10b · La raíz única, el shell y el router

Las interfaces públicas que F10b crea o cambia, con sus firmas exactas, y lo que reemplaza a cada `window.*`. El detalle de cada tarea está en [plan-f10b.md](../plan-f10b.md), y las decisiones, en [research-f10b.md](../research-f10b.md).

**Contra qué se escribe.** Contra el router propio sobre `url-grammar`, la opción por omisión de FR-010. Si el spike de F10a eligió una librería, cambian sólo §3 y las piezas que nombra plan-f10b.md, «Si gana una librería».

## 1. Lo que F10b retira y qué lo reemplaza

T015 (el inventario, FR-048) compara esta tabla con la base real. Las firmas salen del código de `master` y de los worktrees de implementación, o de los planes cuando el código todavía no existía, siempre con su cita. Cada diferencia queda en research-f10b.md, «Inventario de la base», y la tarea que la usa la adopta: **cambia la unión de las props, nunca el comportamiento** (plan-f10b.md, «La regla de adaptación»).

| Global o adaptador | Quién lo publica en la base | Métodos que lee alguien | Qué lo reemplaza en F10b |
| --- | --- | --- | --- |
| `TallerAtlas` | `app/legacy/register-atlas.tsx` (`master`) | `mount`, `unmount` | La entrada `atlas` (§5); las sesiones por idioma pasan a `app/routes/atlas-sessions.ts` |
| `TallerProjectPage` | `app/legacy/register-project-page.tsx` (`master`, F4) | `mount`, `unmount` | La entrada `proyecto` |
| `TallerLibrary` | `app/legacy/register-library.tsx` (plan de F3: 2927-2964) | `mount`, `unmount` | La entrada `biblioteca` |
| `TallerRoute` | `app/legacy/register-route.tsx` (plan de F9: 3655-3705) | `mount`, `unmount` y, en la rama A de F9, `resetTimer` | La entrada `recorrido`; el armado de `progress-backup` importa `focusTimer` de `pages/route` |
| `TallerMethodPage` (el `TallerMethod` provisional del plan de F8) | `app/legacy/register-method.tsx` (plan de F8: 3090-3133) | `mount`, `unmount` | La entrada `metodo` |
| `TallerCampaign` | `app/legacy/register-campaign.tsx` (plan de F6: 2055-2119; plan de F7b: 6913-6964) | `mount`, `unmount`, `refresh`, `sync` | La entrada `campana`; `refreshCampaign` y `syncCampaign` en `app/routes/page-engines.ts` |
| `TallerSystems` | `app/legacy/register-systems.tsx` (`impl-f5` `efaf39b2`; plan de F7b: 6887-6911) | `init`, `mount`, `unmount`, `sync`, `resetSimulations` | La entrada `sistemas`; `initSystems`, `refreshSystems` y `syncSystems` en `page-engines.ts`; `resetSimulations` se importa de `pages/systems` |
| `TallerLab` | `app/legacy/register-lab.tsx` y `lab-api.ts` (plan de F7b: 6635-6805) | `init`, `mount`, `unmount`, `loadWarning`, `getExercises`, `exportState`, `planImport`, `applyImport`, `backups`, `reset` | `app/lab/lab-api.ts` (movido, sin `window`) y la entrada `laboratorio` |
| `TallerCampaignEngine` | `app/legacy/register-campaign-engine.ts` (`master`) | los métodos del motor | `campaignEngine`, importado por sus dueños de R4 (§8) |
| `TallerSystemsEngine` | `app/legacy/register-systems-engine.ts` (`master`) | los métodos del motor | `systemsEngine`, igual |
| `TallerProjectKit` | `app/legacy/register-project-kit.ts` (`master`) | `download` (Sistemas); `files` y `archive` (`qa/project-kit-check.ts`) | `app/routes/project-kit.ts` |
| `TallerEffects` | `app/legacy/register-effects.ts` (`master`; lo retira F5 o F6 si nadie lo lee) | — | Nada: si quedó, sale |
| `GUIDE_DATA`, `RUST_LAB`, `GO_LAB`, `RUST_QUESTS`, `GO_QUESTS`, `RUST_CAMPAIGN` y `GO_CAMPAIGN` | `app/legacy/register-catalogs.ts` (`master`) | `app.js`, `lab-api.ts` y `qa/` | `getContent()` en `app/`; en `qa/`, `qa/lib/app-modules.ts` (§9) |
| `SYSTEMS_<D>` y `SYSTEMS_<D>_LABS` (`PC`, `LOWLEVEL`, `INFRA`, `PLAY`) | `app/legacy/register-systems-<d>.ts` (`master`) | el adaptador de Sistemas, `lab-api.ts` y `qa/` | `getContent()` y los modelos de `entities/systems-simulation` |
| `startApp(progressBackup)` | `frontend/app.js` (plan de F8: 3159-3191) | `legacy-views.ts` | La etapa del shell (§4) y el router (§3) |
| La etapa `legacyViews` | `app/boot/legacy-views.ts` (`master`) | `main.tsx` | `shellStage` (§4) |
| `mountAccountRoot` y `AccountRoot` | `app/account/` (`impl-f11a` `a7b3c71d`) | `account-stages.ts` | `AppRoot` (§6) |
| `AdminDialog` y la prop `administration` de `AccountMenu` | `app/account/AdminDialog.tsx` y `pages/account` (plan de F12a: 5886-5949 y 1829-1890) | `AccountRoot` | La ruta `#administracion` (§2 y §5) |

**Los nombres de los globales de página** siguen la forma `Taller<Página>Page` (coordinador, 2026-10-28; spec, enmienda): `TallerProjectPage` y `TallerMethodPage`. Si F3 y F9 publican `TallerLibraryPage` y `TallerRoutePage` en lugar de los nombres de sus planes, el inventario toma los de la base.

Ningún otro `window.*` del taller queda después de F10b. Si el inventario encuentra uno más, se suma a esta tabla con su reemplazo antes de seguir.

## 2. `shared/config/url-grammar.ts`: la forma de la administración

```ts
export const ADMIN_VIEW = 'administracion';
export type Route = View | typeof ADMIN_VIEW;
export const ADMIN_HREF = '#administracion';
export function routeFromHash(hash: string): Route;
```

- **`routeFromHash`** devuelve `'administracion'` sólo para el hash exacto `#administracion`. Para cualquier otro hash devuelve `viewFromHash(hash)`.
- **No cambian:** `VIEWS` (las ocho), `viewFromHash` y el resto de la gramática.

## 3. `app/router/navigator.ts`: el router propio

```ts
import type { ReactElement } from 'react';
import type { StoreApi } from 'zustand/vanilla';
import type { Route } from '../../shared/config/url-grammar';

export interface NavigationState {
  readonly route: Route;
  readonly page: ReactElement | null;
  readonly mountKey: number;
  readonly ready: boolean;
}

export interface NavigatorEnvironment {
  readonly location: Pick<Location, 'href' | 'hash' | 'search'>;
  addEventListener(type: 'hashchange' | 'popstate', listener: () => void): void;
  scrollToTop(): void;
  focusMain(): void;
}

export interface NavigatorSteps {
  resolveRoute(route: Route): Route;
  syncLinkedLanguage(route: Route, search: string): void;
  leavePages(): void;
  beforeEachPage(): void;
  enter(route: Route): ReactElement;
}

export interface Navigator {
  readonly state: StoreApi<NavigationState>;
  start(): void;
  redraw(): void;
  previousRoute(): Route | null;
}

export function createNavigator(environment: NavigatorEnvironment, steps: NavigatorSteps): Navigator;
```

**Cómo dibuja, en `draw(route)`:**
1. `flushSync`: `page` pasa a `null`, y la página anterior se desmonta con sus efectos;
2. `steps.leavePages()`;
3. `steps.beforeEachPage()`, que actualiza la campaña;
4. `steps.enter(route)` devuelve el elemento;
5. `flushSync`: `route`, `page`, `mountKey + 1` y `ready: true`.

Es el orden de `render()` en `app.js`: desmontar todo, `TallerCampaign.refresh()`, `syncShell()` y montar.

**Los tres caminos:**
- **`start()`** resuelve la ruta del hash y llama a `syncLinkedLanguage` y a `draw`. Después anota `lastNavigation = location.href` y registra los dos oyentes. No mueve el foco ni el desplazamiento (FR-016).
- **`navigate()`**, el oyente:
  1. si `lastNavigation === location.href`, no hace nada;
  2. si no, lee la ruta del hash con `routeFromHash` y la resuelve con `resolveRoute`;
  3. llama a `syncLinkedLanguage` y a `draw`;
  4. anota `lastNavigation` y la ruta anterior;
  5. llama a `scrollToTop()` y a `focusMain()`.
- **`redraw()`** dibuja la ruta actual: el cambio de idioma la remonta (FR-030).

**`previousRoute()`** es la ruta que se mostraba antes de la navegación actual dentro del documento. Al arrancar es `null`. La usa «Cerrar» de la administración (FR-043).

**Lo que no hace al evaluarse:** no registra oyentes ni lee `location` (FR-040).

## 4. Las etapas del arranque

```ts
// app/boot/boot-stages.ts
export const shellStage: BootStage;
export const BOOT_STAGES: readonly BootStage[]; // [tokenStage, sessionStage, contentGate, shellStage]

// app/boot/shell-stage.ts
export interface ShellStageSteps {
  openLab(): string;
  openRoute(): string;
  openCampaign(): string;
  openSystems(): string;
  startNavigation(): void;
  notify(message: string): void;
}
export function createShellStage(steps: ShellStageSteps): BootStage;

// app/boot/start-taller.tsx
export function startTaller(container: HTMLElement): Promise<void>;
```

**`createShellStage(steps).run()`:**
1. abre en orden: `openLab`, `openRoute`, `openCampaign` y `openSystems`. Cada uno devuelve su aviso de carga, o `''`;
2. llama a `startNavigation()`;
3. si hay avisos, llama a `notify` con los no vacíos en el orden recorrido, campaña, Sistemas y laboratorio, unidos por `' · '`.

Una segunda llamada a `run()` lanza `Error('La etapa del shell ya corrió: el arranque corre una sola vez.')`.

**`startTaller(container)`:**
1. activa `enableHistorySync()` una vez;
2. crea la única raíz con `createRoot(container, { onUncaughtError })`;
3. dibuja `<AppRoot />` con `flushSync`;
4. devuelve `runBoot(BOOT_STAGES)`.

**Las vistas de las etapas.** `content-gate.ts` y `session-gate.ts` no cambian ni un byte (FR-038). Sus vistas, `GateView` y `SessionView`, conservan su interfaz. Lo que cambia es la implementación: escriben en el almacén `bootScreens` (`app/boot/boot-screens.ts`), y la raíz dibuja `ContentGateScreen` dentro de `#main` y `SessionStatus` en `#session-status`, con el mismo DOM que hoy escriben con `innerHTML`.

```ts
// app/boot/boot-screens.ts
export type GateScreen =
  | { readonly kind: 'none' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failure'; readonly failure: ContentFailureKind; readonly retry: () => void };
export type SessionScreen =
  | { readonly kind: 'none' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failure'; readonly failure: SessionFailure; readonly retry: () => void; readonly waiting: boolean };
export interface BootScreens {
  readonly gate: GateScreen;
  readonly session: SessionScreen;
}
export const bootScreens: StoreApi<BootScreens>;
export function createGateView(screens: StoreApi<BootScreens>): GateView;
export function createSessionView(screens: StoreApi<BootScreens>): SessionView;
```

## 5. Las entradas de las páginas (`app/routes/`)

```ts
// app/routes/page-entries.tsx
export interface PageActions {
  closeAdministration(): void;
}
export interface PageContext {
  readonly language: GuideLanguage;
  readonly actions: PageActions; // desde U6; antes, PageContext tiene sólo language
}
export function enterPage(route: Route, context: PageContext): ReactElement;
export function leavePages(): void;
export function resolveRoute(route: Route): Route; // 'administracion' sin rol admin, o sin F12a → 'recorrido'
```

| Ruta | Elemento (props, con la cita de su contrato) | Lo que corre al entrar | Lo que corre en `leavePages` |
| --- | --- | --- | --- |
| `recorrido` | `<RoutePage guide={content.guide} language notify />` (plan de F9: 3464-3469) | — | — |
| `campana` | `<CampaignPage language missions={missionContentFor(content, language)} initialSession notify onSessionChange />` (plan de F6: 1611-1617 y 2094-2116) | `refreshCampaign()` y `openCampaignSession(session, language, readLinkQuery(location.search).world)` | `stop()` de `shared/lib/celebration` |
| `sistemas` | `<SystemsPage language models exercises notify downloadKit scrollToTop />` (`impl-f5`, `register-systems.tsx`) | `refreshSystems()` | `stop()` |
| `atlas` | `<AtlasPage entries={content.atlas[language]} initialSession language onSessionChange />` (`master`, `register-atlas.tsx`) | — | — |
| `laboratorio` | `<LabPage …>` con las props de `register-lab.tsx` (plan de F7b: 3219-3229 y 6733-6805) | `announceWith(notify)` y `enterLab(…)` | `labRunner.abort()` |
| `biblioteca` | `<LibraryPage resources={content.guide.resources} />` (plan de F3: 2918) | — | — |
| `proyecto` | `<ProjectPage language />` (`master`) | — | — |
| `metodo` | `<MethodPage sources={content.guide.sources} progressBackup notify reloadDocument />` (plan de F8: 2689-2694 y 4636) | — | — |
| `administracion` | `<AdminPage initialSection="accounts" onClose={closeAdministration} />` (plan de F12a: 4757-4760) | — | — |

- **`notify`** es la función de `app/shell/toast.ts`. Las páginas la reciben como prop, como hoy.
- **`closeAdministration`** lleva el hash a la ruta anterior (`previousRoute()`) o a `#recorrido` (FR-043).
- **`leavePages`** corre todos los pasos de la columna derecha en cada dibujo, como `render()` llamaba a todos los `unmount`.

## 6. El shell (`app/shell/`) y la raíz (`app/root/AppRoot.tsx`)

`AppRoot` dibuja, en este orden y con el DOM de hoy (FR-024):
- el salto al contenido;
- `.app-shell`, con:
  - la barra lateral: la marca, el lema, el menú con sus conteos, el avance, el pie de guardado y «Exportar mi progreso»;
  - el `.workspace`: la barra superior con el selector y `#account-entry`, `#session-status`, `#main` y el pie;
- `#account-root`, con `AccessGate` y `AccountMenu`;
- `#toast`.

Todo va dentro de `ApiClientContext` y de un único `NuqsAdapter` (`app/root/url-state.tsx`, FR-020).

```ts
// app/shell/toast.ts
export interface ToastState {
  readonly message: string;
  readonly visible: boolean;
}
export const TOAST_MS = 4500;
export const toastState: StoreApi<ToastState>;
export function notify(message: string): void;

// app/shell/menu-counts.ts
export interface MenuCounts {
  readonly campana: number;
  readonly sistemas: number;
  readonly laboratorio: number;
  readonly biblioteca: number;
}
export function menuCounts(content: MenuCountSource, language: GuideLanguage): MenuCounts;

// app/shell/route-summary.ts
export interface RouteSummary {
  readonly languageLabel: string;
  readonly done: number;
  readonly total: number;
  readonly percent: number;
}
export function summarizeRoute(guide: GuideData, progress: RouteSummaryProgress): RouteSummary;

// app/router/linked-language.ts
export interface LinkedLanguageCatalog {
  readonly worlds: Readonly<Record<GuideLanguage, readonly { readonly id: string }[]>>;
  exerciseLanguage(id: string): GuideLanguage | undefined;
}
export function linkedLanguage(route: Route, search: string, catalog: LinkedLanguageCatalog): GuideLanguage | null;
```

## 7. Las specs nuevas de Vitest, con sus nombres

La tabla de F10a (`contracts/f10a-check-correspondence.md`) cita estos nombres. Son fijos. Las que evalúan módulos que leen `window` al evaluarse van como `.spec.tsx`, en el proyecto `dom` de Vitest, aunque no tengan JSX: el proyecto `node` no tiene `window`.

| Archivo | `it` |
| --- | --- |
| `frontend/src/app/boot/boot-stages.spec.tsx` | «the stages run as tokens, session, content and shell» |
| `frontend/src/app/boot/shell-stage.spec.ts` | «the shell stage opens the stores in the order of startApp»; «joins the load notices in the order route, campaign, Sistemas and lab»; «the shell stage runs once» |
| `frontend/src/app/boot/boot-modules.spec.tsx` | «evaluating the boot modules touches no storage, adds no listener and starts no timer» |
| `frontend/src/app/main-entry.spec.ts` | «main.tsx imports styles.css first and the sheets in the order of the base» |
| `frontend/src/app/shell/Sidebar.spec.tsx` | «the footer reads storageAvailable after every revision» |

## 8. `seams-guard` después de F10b (FR-053)

- **Cambian la regla R4 y sus fixtures.** `INDEX_OWNERS` pasa a nombrar módulos de `app/`:

  ```ts
  const LAB_MODULE = 'frontend/src/app/lab/lab-api.ts';
  const PAGE_ENGINES = 'frontend/src/app/routes/page-engines.ts';
  const SHELL_STATE = 'frontend/src/app/shell/shell-state.ts';
  const PROGRESS_BACKUP_ASSEMBLY = 'frontend/src/app/progress-backup/app-progress-backup.ts';

  const INDEX_OWNERS: Readonly<Record<string, readonly string[]>> = {
    guide: [SHELL_STATE, PROGRESS_BACKUP_ASSEMBLY],
    exercise: [LAB_MODULE],
    campaign: [LAB_MODULE, PAGE_ENGINES, PROGRESS_BACKUP_ASSEMBLY],
    'systems-workshop': [LAB_MODULE, PAGE_ENGINES, PROGRESS_BACKUP_ASSEMBLY],
  };
  ```

- **No cambian R1, R2, R3, R5 ni R6.**
- **`isLegacyOrAppFile`** conserva la rama de `frontend/*.js`, que ya no encuentra archivos. Así un archivo legacy que volviera seguiría vigilado.

## 9. `qa/lib/app-modules.ts`: lo que reemplaza a `legacy-sources.ts`

```ts
export interface AppModules {
  readonly content: Content;
  readonly campaignEngine: CampaignEngine;
  readonly systemsEngine: SystemsEngine;
  readonly labApi: LabApi;
  readonly projectKit: ProjectKit;
  readonly systemsModels: SystemsModelPackages;
}
export function loadAppModules(context: vm.Context): AppModules;
```

Evalúa un solo paquete con una entrada virtual que reexporta los módulos de `frontend/src`. Así todos los singletons son de una misma instancia, como hoy los compartía `window`.

**La sustitución mecánica, global por global:**

| Antes (`window.*` en el contexto vm) | Después (`loadAppModules(context)`) |
| --- | --- |
| `GUIDE_DATA` | `content.guide` |
| `RUST_LAB`, `GO_LAB` | `content.lab.rust`, `content.lab.go` |
| `RUST_QUESTS`, `GO_QUESTS` | `content.quests.rust`, `content.quests.go` |
| `RUST_CAMPAIGN`, `GO_CAMPAIGN` | `content.campaign.rust`, `content.campaign.go` |
| `SYSTEMS_<D>` | `{ workshops: content.workshops.<d>, models: systemsModels.<d> }` |
| `SYSTEMS_<D>_LABS` | `content.cores.<d>` |
| `TallerCampaignEngine` | `campaignEngine` |
| `TallerSystemsEngine` | `systemsEngine` |
| `TallerLab` | `labApi` |
| `TallerProjectKit` | `projectKit` |
