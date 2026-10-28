# Contratos: F6 · Campaña

Las interfaces entre las tareas del [plan](../plan.md). Son firmas exactas; los cuerpos y los valores esperados están en el plan. Ninguna de estas interfaces es pública para el alumno: el contrato visible sigue siendo el de la [spec](../spec.md), «Qué se conserva».

## 1. `entities/campaign`, su API pública (T006 y T007)

`frontend/src/entities/campaign/index.ts` conserva todo lo que exporta hoy y suma:

```ts
export { CODE_XP, PASS_SCORE, PREDICTION_XP, WORLD_MAX_SCORE } from './model/rules';
export {
  MISSION_FILTERS,
  campaignCounts,
  matchesMissionFilter,
  missionTypeLabel,
  rankName,
  rankSymbol,
  worldMapStatus,
  worldState,
  worldStateName,
  worldSymbol,
} from './model/selectors';
export type { CampaignCounts, MissionFilter, MissionTypeLabel, WorldState } from './model/selectors';
```

`frontend/src/entities/campaign/model/selectors.ts` sólo importa tipos:

```ts
export type WorldState = 'complete' | 'available' | 'locked';
export type MissionTypeLabel = 'Desafío final' | 'Reparación · lings' | 'Kata' | 'Entrenamiento';
export const MISSION_FILTERS: readonly ['all', 'Entrenamiento', 'Reparación', 'Kata', 'Desafío final'];
export type MissionFilter = (typeof MISSION_FILTERS)[number];

export interface CampaignCounts {
  worlds: number;
  missions: number;
  newChallenges: number;
}

export function rankName(completedWorlds: number): string | undefined;
export function rankSymbol(completedWorlds: number): string;
export function worldSymbol(index: number): string | undefined;
export function worldState(world: Pick<DerivedWorld, 'completed' | 'unlocked'>): WorldState;
export function worldStateName(state: WorldState): string;
export function worldMapStatus(world: Pick<DerivedWorld, 'completed' | 'unlocked' | 'score' | 'maxScore'>): string;
export function missionTypeLabel(challengeType: ChallengeType | undefined): MissionTypeLabel;
export function matchesMissionFilter(label: MissionTypeLabel, filter: MissionFilter): boolean;
export function campaignCounts(worlds: readonly Pick<CampaignWorld, 'missionIds' | 'challengeIds'>[]): CampaignCounts;
```

`ChallengeType` llega por `frontend/src/entities/exercise/@x/campaign.ts`, que suma `export type { ChallengeType } from '../model/types';`.

**Invariantes:**

- **Los valores:**
  - `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE` valen 20, 10, 150 y 180, y siguen definidas en `model/rules.ts`;
  - `rankName` cubre 0 a 4 mundos completos y `rankSymbol` satura en el cuarto símbolo;
  - `campaignCounts` del catálogo real de cada lenguaje es `{ worlds: 4, missions: 24, newChallenges: 12 }`.
- **El motor no cambia:** `model/create-campaign-engine.ts`, `model/rules.ts`, `model/progress.ts`, `model/validate-config.ts` y `model/types.ts` no tienen diff.

## 2. `entities/campaign/bridge.ts`, la entrada sin estado (T007)

Conserva lo que exporta hoy y suma:

```ts
export { CODE_XP, PREDICTION_XP } from './model/rules';
export { missionTypeLabel } from './model/selectors';
export type { MissionTypeLabel } from './model/selectors';
```

**Invariante:** importar la entrada no evalúa ningún módulo con singleton. Lo prueba `bridge.spec.ts`, con los cinco módulos con estado reemplazados por fábricas que lanzan, y lo respalda `seams-guard-check` (T008).

## 3. `pages/campaign`, la página (T011 a T014)

```ts
// frontend/src/pages/campaign/index.ts
export { default as CampaignPage } from './ui/CampaignPage';
export { createCampaignSession, type CampaignSession } from './model/campaign-session';
export { openCampaignSession } from './model/open-campaign-session';
export type { MissionContent } from './model/types';

// model/types.ts
export interface MissionContent {
  title: string;
  objective: string;
  challengeType?: ChallengeType;
}

// model/campaign-session.ts
export interface CampaignSession {
  selected: string | null;
  filter: MissionFilter;
}
export const createCampaignSession: () => CampaignSession;
export const selectWorld: (session: CampaignSession, worldId: string) => CampaignSession;
export const setMissionFilter: (session: CampaignSession, filter: MissionFilter) => CampaignSession;
export function resolveSelectedWorld(
  worlds: readonly Pick<DerivedWorld, 'id' | 'unlocked' | 'completed'>[],
  remembered: string | null,
  linked: string | null,
): string | null;

// model/open-campaign-session.ts: reads campaignEngine.getWorlds(language)
export function openCampaignSession(
  session: CampaignSession,
  language: CampaignLanguage,
  linkedWorldId: string | null,
): CampaignSession;

// ui/CampaignPage.tsx
interface CampaignPageProps {
  language: CampaignLanguage;
  missions: ReadonlyMap<string, MissionContent>;
  initialSession: CampaignSession;
  notify: (message: string) => void;
  onSessionChange: (session: CampaignSession) => void;
}
```

**Invariantes:**

- **La lectura del motor:**
  - la página llama `useStore(campaignEngine.changes, selectRevision)`, con `selectRevision = (state) => state.revision`;
  - deriva `getWorlds(language)` y `getSummary(language)` al dibujar;
  - no copia el progreso a `useState`, a otro store ni a un contexto.
- **Las escrituras:** la única es `campaignEngine.answerCheckpoint(worldId, index)`, dentro de `flushSync`.
- **Lo que no importa:** ni `getContent()`, ni `app/content`, ni `window.*`.
- **Los efectos externos:** `history.replaceState` (con `withWorldQuery`), `scrollIntoView` y `celebrate`, en el orden de `campaign.js:onClick`.

**Las props de los componentes internos** (no son API pública del slice):

| Componente | Props |
| --- | --- |
| `CampaignHero` | `language: CampaignLanguage`, `counts: CampaignCounts`, `summary: CampaignSummary`, `completed: number` |
| `WorldMap` | `worlds: readonly DerivedWorld[]`, `selectedId: string`, `onChoose: (worldId: string) => void` |
| `SelectedWorld` | `world: DerivedWorld`, `sectionRef: RefObject<HTMLElement \| null>`, `titleRef: RefObject<HTMLHeadingElement \| null>`, `children: ReactNode` |
| `LockedWorld` | `world: DerivedWorld`, `previous: DerivedWorld \| undefined`, `onChoose: (worldId: string) => void` |
| `OpenWorld` | `world`, `nextWorld: DerivedWorld \| undefined`, `missions: ReadonlyMap<string, MissionContent>`, `filter: MissionFilter`, `onChooseWorld`, `onFilter: (filter: MissionFilter, button: HTMLButtonElement) => void`, `onAnswer: (worldId: string, index: number, option: HTMLButtonElement) => void` |
| `WorldProgress` | `world`, `nextWorld`, `missions`, `onChooseWorld` |
| `MissionCard` | `world: DerivedWorld`, `mission: CampaignMission`, `content: MissionContent` |
| `MissionSeal` | `earned: boolean`, `label: string`, `points: number` |
| `MissionAction` | `world: DerivedWorld`, `mission: CampaignMission`, `boss: boolean`, `mastered: boolean` |
| `WorldCheckpoint` | `world: DerivedWorld`, `onAnswer` |
| `TrophyCase` | `worlds: readonly DerivedWorld[]` |
| `CampaignRules` | — |

## 4. Los adaptadores y `window.TallerCampaign` (T015 a T017)

```ts
// frontend/src/app/legacy/campaign-bridges.ts: no React, no slice index values, no global published
export interface CampaignBridges {
  refresh(): RefreshResult;
  sync(): SyncLabResult;
  returnURL(worldId: string): string;
  exerciseContextHTML(id: string, language: string): string;
  lockedExerciseHTML(id: string, language: string): string;
}
export const campaignBridges: CampaignBridges;

// frontend/src/app/legacy/register-campaign.tsx: publishes the only global, once
declare global {
  interface Window {
    TallerCampaign: Readonly<
      CampaignBridges & {
        mount(host: HTMLElement | null, requestedLanguage: string, notify: (message: string) => void): void;
        unmount(): void;
      }
    >;
  }
}
```

**Invariantes:**

- **El objeto:** `Object.keys(window.TallerCampaign).sort()` es `['exerciseContextHTML', 'lockedExerciseHTML', 'mount', 'refresh', 'returnURL', 'sync', 'unmount']`, y el objeto está congelado.
- **Los puentes:**
  - capturan `window.TallerCampaignEngine` al evaluarse;
  - leen `window.TallerLab` al llamarse;
  - devuelven los mismos bytes que `campaign.js` de la base.
- **`mount`:**
  1. llama `unmount()`;
  2. `campaignBridges.refresh()`;
  3. `openCampaignSession(…)` con `readLinkQuery(location.search).world`;
  4. crea la raíz con `onUncaughtError` y dibuja.

  No reescribe la URL ni escribe en el almacenamiento.
- **`unmount`:** desmonta la raíz si la hay y llama `stop()` siempre.
- **`startApp()`** (`frontend/app.js`) inicializa el motor con `window.TallerCampaignEngine?.init({ exercises: window.TallerLab.getExercises(), worlds: { rust: window.RUST_CAMPAIGN || [], go: window.GO_CAMPAIGN || [] } }, window.TallerLab?.exportState())`, en el lugar de `window.TallerCampaign?.init()`.

**Las listas de `qa/` que reflejan este contrato:**

```ts
// qa/lib/app-adapters.ts
TallerCampaign: ['refresh', 'sync', 'mount', 'unmount'],
TallerCampaignEngine: ['init', 'exportState', 'planImport', 'applyImport', 'reset', 'backups'],

// qa/lib/legacy-sources.ts
export const CAMPAIGN_BRIDGES_SOURCE = 'frontend/src/app/legacy/campaign-bridges.ts';
export const CAMPAIGN_ADAPTER_SOURCE = 'frontend/src/app/legacy/register-campaign.tsx';
export function loadCampaignBridges<T>(context: vm.Context): T;
```

## 5. Los E2E (T003)

```ts
// qa/e2e/lib/campaign-progress.ts: typed by the saved v1 format, not by the code types
export function missionsOf(worldId: string): string[];
export function savedCampaign(seed: {
  mastered?: readonly string[];
  codeOnly?: readonly string[];
  passedCheckpoints?: Readonly<Record<string, number>>;
}): string;
```

`qa/e2e/pages/campaign.ts` conserva sus seis métodos y suma los de la tarea 1.1 del plan: `hero`, `pills`, `rank`, `rankSymbol`, `campaignProgress`, `storageNotice`, `worldMap`, `worldNode`, `worldHeading`, `backToWorld`, `nextWorldButton`, `projectLink`, `nextMove`, `filter`, `missionCards`, `missionRequirements`, `checkpointFeedback`, `badge`, `rules`, `rulesSummary` y `celebration`.
