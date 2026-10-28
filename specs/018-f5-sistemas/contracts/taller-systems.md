# Contrato: `window.TallerSystems`, la página de Sistemas y el saneo de la escena

**Plan**: [plan.md](../plan.md) · **Spec**: [spec.md](../spec.md)

Las tres interfaces que F5 deja a los demás ítems:

1. el adaptador legacy, que conservan `app.js` y `lab.js` hasta que se porten;
2. la API pública de `pages/systems`, que usan el adaptador y, después, F8 y F10;
3. la función pura de `entities/systems-simulation`.

## 1. `window.TallerSystems` (`frontend/src/app/legacy/register-systems.tsx`)

Los mismos nueve métodos, con los mismos nombres, firmas y orden de claves que `frontend/systems.js` (FR-028). El objeto **no** se congela: `boot-check` reemplaza `init` y `resetSimulations` para espiarlos.

```ts
interface TallerSystemsAdapter {
  init(): { storageAvailable: boolean; loadWarning: string };
  refresh(): { changed: boolean; storageAvailable: boolean };
  sync(): { changed: boolean; storageAvailable: boolean };
  mount(host: HTMLElement | null, lang: string, toast: (message: string) => void): void;
  unmount(): void;
  returnURL(id: string, lang?: string): string;
  missionIDs(id: string, lang: string): string[];
  exerciseContextHTML(id: string, lang: string): string;
  resetSimulations(): void;
}
```

| Método | Qué hace | Quién lo llama | Lo retira |
| --- | --- | --- | --- |
| `init()` | Une los modelos de `window.SYSTEMS_*` e inicializa `window.TallerSystemsEngine` con los talleres (en el orden `pc`, `lowlevel`, `infra`, `play`), los modelos y `window.TallerLab.getExercises()`. Devuelve el resultado del motor, con su aviso de carga | `app.js:startApp`, después de inicializar campaña; `boot-check` fija el orden | F10, con `startApp` |
| `mount(host, lang, toast)` | Desmonta lo anterior, activa la sincronización de nuqs (`startUrlStateSync`), absorbe en memoria la evidencia del laboratorio (`refresh`) y crea una raíz nueva sobre `host`, con `UrlStateProvider` y `SystemsPage`. Registra los errores de dibujo con `console.error('No se pudo mostrar Sistemas.', error)`. Con `host` nulo no monta nada | `app.js:render` | F10 |
| `unmount()` | Libera la raíz y detiene la celebración (`stop`). Es idempotente | `app.js:render` | F10 |
| `sync()` | `engine.syncLab(window.TallerLab.exportState())`: guarda el sello de código derivado | `lab.js` (`syncAfterRun`); `app.js`, como `syncDerivedSeals` del área de Sistemas de `progress-backup` | El de `lab.js`, F7. El de `app.js`, F10, o F8 si saca el armado de `progress-backup` |
| `refresh()` | `engine.refreshFromLab(window.TallerLab.exportState())`: sólo en memoria | `lab.js:render` | F7 |
| `missionIDs(id, lang)` | `workshopMissionIds` del taller `id`: las herramientas previas y el núcleo | `lab.js:navigationList` | F7 |
| `returnURL(id, lang = el último idioma montado)` | `?taller=<id>&parte=build&lenguaje=<lang>#sistemas` | `lab.js:finishNavigation` | F7 |
| `exerciseContextHTML(id, lang)` | El bloque de contexto del laboratorio dentro de un taller (`?sistema=`), con el mismo HTML y el mismo escape que hoy; `''` si el ejercicio no es núcleo ni herramienta del taller del enlace | `lab.js:exerciseHTML`, `updateRunUI` y el manejador de la predicción | F7, que lo reemplaza por datos |
| `resetSimulations()` | `resetSimulations` de la página: vacía las simulaciones y conserva la familia y la búsqueda | `app.js:startApp`, como paso de sesión de `progress-backup` | El último de F5 y F8 que entre (F8-Q2, spec 022) |

**Lo que lee.**

- **Al evaluarse,** sólo captura `window.TallerSystemsEngine` (`load-order-check`: `register-systems-engine.ts` va antes).
- **En `init`, `mount` y los métodos del laboratorio,** lee `window.SYSTEMS_PC`, `SYSTEMS_LOWLEVEL`, `SYSTEMS_INFRA`, `SYSTEMS_PLAY`, `window.TallerLab` y `window.TallerProjectKit`.
- **No lee** `getContent()` ni importa el índice de `entities/systems-workshop` (R4).

**Lo que inyecta en la página:**

- el idioma del montaje;
- los modelos de `init`;
- los ejercicios del laboratorio;
- el `toast` del shell;
- la descarga del kit (`window.TallerProjectKit.download(workshop, language)`);
- el desplazamiento de `#main` (`host.scrollIntoView({ block: 'start' })`).

## 2. La API pública de `pages/systems`

```ts
// frontend/src/pages/systems/index.ts
export { default as SystemsPage } from './ui/SystemsPage';
export { resetSimulations } from './model/systems-session';
export type { SystemsModelRegistry, SystemsPageExercise, SystemsPageProps, SystemsWorkshopView } from './model/types';
```

```ts
interface SystemsPageExercise {
  id: string;
  title: string;
  objective: string;
  tests: readonly { label: string; why: string }[];
}

interface SystemsPageProps {
  language: 'rust' | 'go';
  models: Readonly<Record<string, SystemsModel<unknown>>>;
  exercises: readonly SystemsPageExercise[];
  notify: (message: string) => void;
  downloadKit: (workshop: SystemsWorkshopView) => void;
  scrollToTop: () => void;
}
```

**Las reglas.**

- **Qué lee.** `SystemsPage` lee el motor con `useStore(systemsEngine.changes, (state) => state.revision)` y deriva el resto al dibujar. La selección la lee de la URL con nuqs (`lenguaje`, `taller` y `parte`, con `history: 'replace'`), así que necesita un `NuqsAdapter` (`UrlStateProvider`) en la raíz.
- **Qué no lee.** No lee `window`, `getContent()` ni el almacenamiento.
- **`resetSimulations()`** vacía las simulaciones de la sesión, que viven en memoria del módulo, y conserva la familia y la búsqueda.
- **Para F8 y F10.** Si un armado de `app/` necesita el reinicio sin traer la página con su motor, F5 (en la rama F8 de T024) o el ítem que lo necesite agrega la entrada sin motor `frontend/src/pages/systems/session.ts`, que sólo reexporta `resetSimulations`.

## 3. `sanitizeScene` (`entities/systems-simulation`)

```ts
interface UntrustedScene {
  width?: unknown;
  height?: unknown;
  background?: unknown;
  alt?: unknown;
  shapes?: unknown;
}

type SafeSceneShape =
  | { type: 'rect'; x: number; y: number; width: number; height: number; fill: string; stroke: string; strokeWidth: number }
  | { type: 'circle'; cx: number; cy: number; r: number; fill: string; stroke: string; strokeWidth: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; fill: string; stroke: string; strokeWidth: number }
  | { type: 'polygon'; points: string; fill: string; stroke: string; strokeWidth: number }
  | { type: 'text'; x: number; y: number; fill: string; fontSize: number; text: string };

interface SafeScene {
  viewBox: string;
  background: string;
  alt: string;
  shapes: SafeSceneShape[];
}

function sanitizeScene(scene: UntrustedScene): SafeScene;
```

**Las reglas de la plantilla de hoy (FR-023):**

- **Los números:** `Number(valor)`; si no es finito, el valor de respaldo (`null` da 0). Los anchos, los altos, los radios y el trazo no bajan de 0. El tamaño del texto no se limita.
- **La `viewBox`:** `0 0 <ancho> <alto>`, cada uno de al menos 1; 400 × 260 por omisión.
- **Los valores por omisión:** el trazo vale 1; el texto, 12 de tamaño y `#252c27` de relleno; el fondo, `#eeeae1`; el relleno y el trazo de las formas, `none`.
- **Los colores:** pasan sólo los que cumplen `/^(#[0-9a-f]{3,8}|none|currentColor|transparent)$/i`.
- **Las formas:** como mucho las primeras 2 500, contadas antes de descartar las de un tipo desconocido. El `alt` y el texto pasan a `String(valor ?? '')`.
