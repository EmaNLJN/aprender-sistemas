# Contrato · La página del laboratorio y su adaptador (F7b)

**Spec**: [spec 021](../spec.md), FR-007 a FR-042 · **Plan**: [plan-f7b.md](../plan-f7b.md), secciones 2 y 3 · **Decisiones**: [research-f7b.md](../research-f7b.md), R1 a R11

Son las interfaces que F7b deja a los demás ítems:

1. el adaptador `window.TallerLab`, que `app.js` usa hasta F10;
2. la API pública de `pages/lab`, que usan el adaptador y, después, F10;
3. el hook del editor, en `shared/ui/code-editor`;
4. los adaptadores de campaña y de Sistemas, sin el HTML del laboratorio.

El puerto de la ejecución es el de F7a (`contracts/run-exercise.md`) y no cambia. Las firmas son las del código del plan, verificadas en el prototipo.

## 1. `window.TallerLab`

Lo arman dos módulos (R1):

```ts
// frontend/src/app/legacy/lab-api.ts: sin React, dueño del índice de entities/exercise
export const labRunner: ExerciseRunner;
export const programBuilder: ProgramBuilder;
export const labCatalog: ExerciseCatalog;
export function currentLabSession(): LabSession;
export function keepLabSession(next: LabSession): void;
export function announceWith(notify: (message: string) => void): void;
export const labApi: {
  init(): void;
  loadWarning(): string;
  getExercises(): readonly Exercise[];
  exportState(): LabStateV1;
  planImport(raw: unknown): LabImportPlan;
  applyImport(plan: LabImportPlan): boolean;
  backups(): BackupEntry[];
  reset(): boolean;
};

// frontend/src/app/legacy/register-lab.tsx: monta la página y publica el global
window.TallerLab = { ...labApi, mount, unmount };
function mount(host: HTMLElement | null, requestedLanguage: string, toast: (message: string) => void): void;
function unmount(): void;
```

| Método | Qué hace | Quién lo llama | Lo retira |
| --- | --- | --- | --- |
| `init()` | Arma el catálogo con `window.RUST_LAB`, `GO_LAB`, `*_QUESTS` y `SYSTEMS_*_LABS` y abre el almacén sin escribir | `app.js:startApp` | F10 |
| `mount(host, lang, toast)` | Desmonta lo anterior, guarda el aviso para el runner y abre la sesión con `enterLab`: el cambio de idioma, el enlace de la URL, el refresco de los motores y el registro vacío. Después crea la raíz y dibuja con `flushSync`, así que la página ya está dibujada cuando vuelve. Con `host` nulo no monta nada. Si la página lanza al dibujarse, lo registra con `console.error('No se pudo mostrar el laboratorio.', error)` | `app.js:render` | F10 |
| `unmount()` | Desmonta la raíz y aborta la ejecución sin avisar | `app.js:render` | F10 |
| `loadWarning()` y `getExercises()` | Del almacén y del catálogo | `app.js`; `getExercises` también los adaptadores de F5 y F6 y `register-project-kit.ts` | F10 |
| `exportState()`, `planImport()`, `applyImport()` y `backups()` | Del almacén | `features/progress-backup` (armado en `app.js`); `exportState` también los adaptadores de F5 y F6 | F10, o F8 si saca el armado |
| `reset()` | Borra el almacén, deja la sesión en el mapa, en «Descubrí» y sin ejercicio, y aborta la ejecución sin guardar. No lanza si la página nunca se montó | `features/progress-backup` («Borrar todo») | F10, o F8 |

**Las reglas:**

- **El objeto no se congela:** `boot-check` reemplaza sus métodos para espiarlos.
- **`lab-api.ts` no importa** React, `pages/lab` (salvo `composition.ts`) ni el índice de un motor. Los motores los lee de `window.TallerCampaignEngine` y `window.TallerSystemsEngine` al llamar, nunca al evaluarse.
- **Es el único lugar** donde se eligen el transporte y el constructor del programa: son las dos líneas que cambia A4.

## 2. La API pública de `pages/lab`

```ts
// frontend/src/pages/lab/index.ts
export { default as LabPage } from './ui/LabPage';
export type { LabPageProps } from './ui/LabPage';
export { enterLab } from './model/enter-lab';
export type { LabWorkshop } from './model/types';

// frontend/src/pages/lab/composition.ts: sin vista y sin motores
export { clearSelection, createLabSession } from './model/lab-session';
export type { LabSession } from './model/lab-session';
export { campaignLock } from './model/mission-bridges';
```

```ts
interface LabPageProps {
  language: ExerciseLanguage;
  catalog: ExerciseCatalog;
  workshops: readonly LabWorkshop[];
  runner: ExerciseRunner;
  programBuilder: ProgramBuilder;
  initialSession: LabSession;
  notify: (message: string) => void;
  scrollToTop: () => void;
  onSessionChange: (session: LabSession) => void;
}

interface LabWorkshop {
  id: string;
  title: string;
  code: Readonly<Record<ExerciseLanguage, string>>;
  related?: Readonly<Record<string, readonly string[]>>;
}

function enterLab(
  session: LabSession,
  language: ExerciseLanguage,
  link: LinkQuery,
  catalog: ExerciseCatalog,
): LabSession;
```

**Las reglas:**

- **Qué lee la página:**
  - el almacén con `useStore(labStore.changes, (state) => state.revision)`, y `labStore.getProgress()` en cada dibujo y en cada manejador;
  - los dos motores con `useStore(engine.changes, (state) => state.revision)`;
  - el runner con `useStore(runner.state, (state) => (state.status === 'running' ? state.exerciseId : null))`.
- **Qué no lee:** `window`, `getContent()` ni el almacenamiento.
- **Qué escribe:**
  - en `taller-laboratorio-v1`, sólo en los manejadores, con `saveLab()`, que además refresca los motores en memoria;
  - la URL, con `withLabQuery` y `history.replaceState`, en un efecto atado al modo, al ejercicio y a la fase.
- **`enterLab`** es la única función con efectos que corre antes del primer dibujo: refresca los motores y crea el registro vacío del ejercicio que se muestra, si no hay bloqueo (D1).
- **Los talleres llegan por props:** `systemsEngine.list()` crea registros en memoria (R5). El adaptador los arma desde `getContent().workshops`.
- **El diálogo de confirmación** cuelga de `<body>` con un portal, vive dentro de `CodePhase` y se desmonta al cerrarse o al salir.

**La sesión** (`LabSession`): el ejercicio elegido, el modo, la fase, los filtros del mapa, el enlace de la misión, los modelos visuales, el explorador de laboratorio y los de misión. Las reglas de reinicio son las de hoy:

- **al cambiar de idioma,** el ejercicio, el modo, la fase, la búsqueda y «Repasar pendientes», no el nivel ni «Clásicos y sistemas» (rareza 1);
- **al abrir un ejercicio,** los modelos visuales y los exploradores;
- **al entrar por URL o al cambiar de fase,** nada (rareza 2).

## 3. El hook del editor

```ts
// frontend/src/shared/ui/code-editor/index.ts
export { default as useCodeEditor } from './use-code-editor';
export type { CodeEditorBinding, CodeEditorHandle, UseCodeEditorOptions } from './use-code-editor';
export type { EditorLanguage } from './create-code-editor';

interface UseCodeEditorOptions {
  language: EditorLanguage;
  initialText: string;
  maxLength: number;
  label: string;
  onChange: (text: string) => void;
  onRun: () => void;
  onEscape: () => void;
}

interface CodeEditorHandle {
  focus(): void;
  replaceText(text: string): void;
}

interface CodeEditorBinding {
  hostRef: RefObject<HTMLDivElement | null>;
  editor: CodeEditorHandle;
}
```

**Las reglas:**

- **El contenedor:** `hostRef` va en un `div` que React dibuja sin hijos (`<div className="editor-wrapper cm-enhanced" ref={hostRef} />`), y React no reconcilia lo que CodeMirror pone adentro.
- **Cuándo se crea y se destruye:** se crea en un `useLayoutEffect` y se destruye al desmontar. El texto inicial se toma una vez. Los callbacks pasan por `useEffectEvent`, así que cambiarlos no recrea el editor.
- **`onChange`** recibe el texto en cada cambio del alumno, sin debounce. `replaceText` no lo llama: su transacción lleva una anotación.
- **El teclado:** Ctrl/⌘ + Enter llama a `onRun`, Esc cierra el autocompletado y llama a `onEscape`, y Tab y Mayús+Tab avanzan en un snippet o sangran.

## 4. Los adaptadores de campaña y de Sistemas, después de F7b

```ts
window.TallerCampaign: Readonly<{ mount; unmount; refresh; sync }>;          // frontend/src/app/legacy/register-campaign.tsx
window.TallerSystems: { init; sync; mount; unmount; resetSimulations };       // frontend/src/app/legacy/register-systems.tsx
```

- **Ya no arman HTML para el laboratorio:** salen `exerciseContextHTML`, `lockedExerciseHTML` y `returnURL` de campaña, y `exerciseContextHTML`, `missionIDs`, `returnURL` y `refresh` de Sistemas.
- **`campaign-bridges.ts` se retira,** y `register-campaign.tsx` sigue capturando `window.TallerCampaignEngine` al evaluarse.
- **Lo que queda lo lee `app.js`**, y se retira con F10, o con F8 si saca el armado de `progress-backup`.

## 5. Lo que cambia A4 (criterio C4)

**Si A4 entra después de F7b,** cambia dos líneas de `lab-api.ts`: `createPlaygroundTransport()` y `buildPlaygroundProgram`. También el tipo del runner (`createExerciseRunner<ApiRunProgress>`), `LabPageProps.runner` y `CodePhase`, y la línea de estado de `RunningReview`. «Cancelar ejecución» conserva su nodo en cada aviso de progreso.

**Si A4 entró antes,** F7b ya porta lo suyo (T025).
