# Contrato: «Uso del taller» en la página de la administración

**Input**: [spec.md](../spec.md), [plan.md](../plan.md) (F14a) y [plan-f14b.md](../plan-f14b.md) (F14b), con sus research. Lo consumen las tareas de F14a y de F14b, y F10 cuando mude la página. Las firmas son exactas: una tarea que las cambia cambia este contrato en el mismo commit.

**Extiende** `specs/023-f12-administracion/contracts/admin-page.md`, el contrato de F12a (plan enmendado en `plan/amend-a3-f8-f12a`, `02b5a957`, PR #84). Esa carpeta no se edita: cuando F14 se implemente, F12a ya estará entregada, y el principio VIII de la constitución la deja inmutable ([research.md](../research.md), R10). Lo que este contrato no menciona sigue como lo fija el de F12a.

Las rutas son relativas a `frontend/src/`. La API que se consume es la de C5 (`spec/c5-estadisticas`, `933d9e06`, `specs/025-c5-estadisticas/contracts/http.md`): las formas de abajo la copian, y si C5 cambia al implementarse, cambian las dos cosas juntas.

## Lo que cambia del contrato de F12a

| Qué | F12a | Con F14 |
| --- | --- | --- |
| `AdminSection` (`pages/admin/model/types.ts`) | `'accounts' \| 'invitations'` | `'accounts' \| 'invitations' \| 'usage'` (F14a) |
| Las secciones de `AdminPage` | «Cuentas» e «Invitaciones» | Más «Uso del taller», tercera (F14a) |
| Lo que envuelve las secciones | Nada | `PeriodProvider`, dentro de `AdminPage` (F14a) |
| Lo que lee del contenedor | La sección inicial y el cierre | Lo mismo, más los títulos por `ContentTitlesProvider` si el contenedor lo monta. Sin él, los ids (F14a) |
| La API pública (`pages/admin/index.ts`) | `AdminPage` y `AdminSection` | Más `ContentTitlesProvider` y los tipos `ContentTitles` y `TitleSource` (F14a) |
| La tabla de «Cuentas» | Las columnas de F12a, y el grupo «Acciones sobre {nombre}» | Una columna «Uso» antes de «Acciones», fuera del grupo; `ACTION_SLOTS` no cambia (F14b) |
| La sección «Cuentas» | La lista | La lista queda montada y oculta mientras se ve el uso de una cuenta (F14b) |
| `qa/e2e` | `AdminPage` (Page Object) y `admin-contract.ts` | Más `UsagePage`, el fixture `usage` y `usage-contract.ts`. `AdminPage` no cambia |

## `pages/admin`: la API pública

```ts
// pages/admin/index.ts
export { default as AdminPage } from './ui/AdminPage';
export type { AdminSection } from './model/types';
export { ContentTitlesProvider } from './ui/content-titles-context';
export type { ContentTitles, TitleSource } from './model/content-titles';
```

**Quién monta `ContentTitlesProvider`.** El único lugar de `app/` que dibuja `<AdminPage`: hoy `app/account/AdminDialog.tsx` (F12a) y, con F10b, `app/routes/page-entries.tsx`. Lo envuelve con `source={getContent}`, y los títulos se arman la primera vez que una vista pide uno (`lazyTitles`): un contenedor que nunca abre la sección no lee el contenido. `pages/admin` nunca importa `app/content` (`seams-guard`, R5).

## `pages/admin/model`: las formas de C5 (F14a)

```ts
// model/usage-types.ts
import type { AccountRole } from '../../../entities/session';
import type { LevelId } from '../../../shared/config/levels';
import type { AccountStatus } from './types';

export type Granularity = 'day' | 'week' | 'month';
export type UsageView = 'overview' | 'exercises' | 'runs'; // F14b suma 'students'
export type ExerciseLanguage = 'rust' | 'go';
export type RunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'compile_error' | 'runtime_error' | 'timeout' | 'infra_error' | 'canceled';
export type RouteMarkKind = 'step' | 'milestone' | 'favorite';

export interface PeriodRequest { readonly from: string; readonly to: string; readonly granularity: Granularity }
export interface PeriodMeta extends PeriodRequest { readonly timezone: string }
export interface Stats<T> { readonly data: T; readonly generatedAt: string; readonly period: PeriodMeta }

export interface OutcomeCounts { readonly passed: number; readonly failed: number; readonly compileError: number; readonly runtimeError: number; readonly timeout: number }
export interface OperationCounts { readonly infraError: number; readonly canceled: number }
export interface SolvedSplit { readonly server: number; readonly imported: number }
export interface IntervalTotals {
  readonly attempts: OutcomeCounts;
  readonly operations: OperationCounts;
  readonly importedAttempts: number;
  readonly firstSolves: SolvedSplit;
  readonly newStudents: number;
  readonly imports: number;
  readonly studentsWhoRan: number;
}
export interface SeriesPoint extends IntervalTotals { readonly start: string }
export interface AccountCount { readonly role: AccountRole; readonly status: AccountStatus; readonly count: number }
export interface ActiveStudents { readonly lastDay: number; readonly lastWeek: number; readonly lastMonth: number; readonly never: number }
export interface InvitationCounts { readonly pending: number; readonly expired: number; readonly pendingAdmin: number }
export interface Overview {
  readonly accounts: readonly AccountCount[];
  readonly activeStudents: ActiveStudents;
  readonly invitations: InvitationCounts;
  readonly resetStudents: number;
  readonly totals: IntervalTotals;
  readonly series: readonly SeriesPoint[];
}

export interface OptionCount { readonly option: number; readonly students: number }
export interface OptionSpread { readonly answered: number; readonly options: readonly OptionCount[] }
export interface PredictionStats extends OptionSpread { readonly correct: number }
export interface CheckpointStats extends OptionSpread { readonly passed: number }
export interface HintCount { readonly hints: number; readonly students: number }
export interface HelpStats { readonly assisted: number; readonly solutionSeen: number; readonly hintsRevealed: readonly HintCount[] }
export interface ConfidenceCounts { readonly again: number; readonly practice: number; readonly confident: number }
export interface TestStats { readonly testKey: string; readonly verdicts: number; readonly fail: number; readonly missing: number }
export interface AttemptsMedian { readonly solved: number | null; readonly unsolved: number | null }
export interface CatalogStats { readonly catalog: string; readonly language: string; readonly level: string | null; readonly activeExercises: number; readonly studentsStarted: number; readonly studentsSolved: number; readonly solvedMedian: number | null }
export interface ExerciseStats {
  readonly exerciseId: string; readonly catalog: string; readonly language: string; readonly level: string | null; readonly retired: boolean;
  readonly studentsStarted: number; readonly solved: SolvedSplit; readonly attempts: OutcomeCounts; readonly operations: OperationCounts;
  readonly importedAttempts: number; readonly attemptsMedian: AttemptsMedian; readonly help: HelpStats; readonly prediction: PredictionStats;
  readonly confidence: ConfidenceCounts; readonly tests: readonly TestStats[];
}
export interface WorldStats { readonly worldId: string; readonly language: string; readonly level: string | null; readonly retired: boolean; readonly exercises: number; readonly solvedRows: number; readonly studentsWithSeals: number; readonly checkpoint: CheckpointStats }
export interface WorkshopStats { readonly workshopId: string; readonly language: string; readonly level: string | null; readonly retired: boolean; readonly studentsStarted: number; readonly codeSealed: number; readonly prediction: PredictionStats; readonly stepsMarkedMedian: number | null; readonly objectivesObservedMedian: number | null }
export interface RouteMark { readonly kind: RouteMarkKind; readonly itemKey: string; readonly students: number }
export interface RouteQuiz extends OptionSpread { readonly stepId: string }
export interface RouteStats { readonly marks: readonly RouteMark[]; readonly quiz: readonly RouteQuiz[] }
export interface CurriculumStats { readonly catalogs: readonly CatalogStats[]; readonly exercises: readonly ExerciseStats[]; readonly worlds: readonly WorldStats[]; readonly workshops: readonly WorkshopStats[]; readonly route: RouteStats }
export interface CurriculumFilters { readonly catalog: string; readonly language: '' | ExerciseLanguage; readonly level: '' | LevelId }

export interface Percentiles { readonly p50: number | null; readonly p95: number | null }
export interface InfraErrorCount { readonly reason: string; readonly runs: number }
export interface QueueNow { readonly queued: number; readonly running: number; readonly oldestQueuedSeconds: number | null; readonly maxWaiting: number; readonly slots: number }
export interface QueueLastDay { readonly finished: number; readonly waitMs: Percentiles; readonly durationMs: Percentiles; readonly infraErrors: readonly InfraErrorCount[] }
export interface QueueStats { readonly now: QueueNow; readonly lastDay: QueueLastDay; readonly generatedAt: string }

export interface RunAccount { readonly id: number; readonly name: string }
export interface RunRow {
  readonly id: string; readonly account: RunAccount; readonly exerciseId: string; readonly language: string; readonly status: RunStatus;
  readonly reason: string | null; readonly executorPhase: string | null; readonly exitCode: number | null; readonly truncated: boolean | null;
  readonly compileMs: number | null; readonly runMs: number | null; readonly createdAt: string; readonly startedAt: string | null;
  readonly finishedAt: string | null; readonly cancelRequested: boolean;
}
export interface RunsPage { readonly runs: readonly RunRow[]; readonly nextCursor: string | null; readonly retentionDays: number }
export interface RunFilters { readonly status: '' | RunStatus; readonly exercise: string; readonly since: string }
```

```ts
// model/parse-usage.ts: devuelven null ante una forma fuera del contrato
export const RUN_STATUSES: readonly RunStatus[];
export function parseOverview(body: unknown): Stats<Overview> | null;
export function parseCurriculumStats(body: unknown): Stats<CurriculumStats> | null;
export function parseQueue(body: unknown): QueueStats | null;
export function parseRunsPage(body: unknown): RunsPage | null;

// model/json-reader.ts: los parsers leen con esto; UnexpectedShape no sale del módulo que parsea
export class UnexpectedShape extends Error {}
export type JsonRecord = Readonly<Record<string, unknown>>;
export function recordAt(value: unknown, path: string): JsonRecord;
export function childAt(record: JsonRecord, key: string): JsonRecord;
export function numberAt(record: JsonRecord, key: string): number;
export function nullableNumberAt(record: JsonRecord, key: string): number | null;
export function stringAt(record: JsonRecord, key: string): string;
export function nullableStringAt(record: JsonRecord, key: string): string | null;
export function booleanAt(record: JsonRecord, key: string): boolean;
export function nullableBooleanAt(record: JsonRecord, key: string): boolean | null;
export function oneOfAt<T extends string>(record: JsonRecord, key: string, options: readonly T[]): T;
export function listAt<T>(record: JsonRecord, key: string, item: (value: unknown) => T): T[];
export function readOrNull<T>(read: () => T): T | null;
```

```ts
// model/period.ts
export const BOTH_DATES: string;      // «Elegí las dos fechas.»
export const FROM_AFTER_TO: string;   // «La fecha de inicio tiene que ser anterior o igual a la de fin.»
export const TOO_LONG: string;        // «El período puede tener hasta 366 días.»
export interface PeriodProblem { readonly field: 'from' | 'to'; readonly message: string }
export function checkPeriod(from: string, to: string): PeriodProblem | null;
export function periodSentence(period: PeriodMeta, withGranularity: boolean): string;

// model/usage-format.ts
export const SMALL_SAMPLE = 5;
export const NO_DATA = '—';
export type RateView = { readonly kind: 'none' } | { readonly kind: 'small'; readonly text: string } | { readonly kind: 'full'; readonly text: string; readonly value: number; readonly max: number };
export function formatCount(value: number): string;           // es-AR: 1.500 y 1,5
export function formatMaybe(value: number | null): string;    // «—» con null
export function countNoun(count: number, singular: string, plural: string): string;
export function rateView(numerator: number, n: number, sample?: number): RateView;
export function showsDistribution(answered: number): boolean; // answered >= 5
export function formatPeriodDate(date: string): string;       // '2026-10-01' → '1/10/2026', sin Date
export function intervalLabel(start: string, granularity: Granularity): string;   // '12/10' o 'octubre de 2026'
export function intervalHeading(start: string, granularity: Granularity): string; // '12/10/2026', 'Semana del 12/10/2026' u 'octubre de 2026'
export function formatSeconds(ms: number | null): string;     // '1,5 s' o «—»
export function formatClock(iso: string): string;             // '12:30', en la zona del navegador
export function zoneName(timezone: string): string;           // 'America/Argentina/Buenos_Aires' → 'Buenos Aires'

// model/stats-failure.ts
export const PERIOD_FIELDS: readonly ['from', 'to', 'granularity'];
export function isPeriodRejection(failure: ApiFailure): boolean;
export function describeStatsFailure(failure: ApiFailure, notFoundMessage: string): FailureDescription | null; // null: 401 o account_disabled

// model/content-titles.ts
export type OptionOwner = 'exercise' | 'world' | 'workshop' | 'step';
export interface ContentTitles {
  exercise(id: string): string;
  test(exerciseId: string, testKey: string): string;
  world(id: string): string;
  workshop(id: string): string;
  routeItem(kind: RouteMarkKind, key: string): string;
  option(owner: OptionOwner, ownerId: string, option: number): string; // «Opción {option + 1}» si no está
}
export interface TitleSource { /* la forma mínima que Content de app/content cumple: ver plan, T006 */ }
export const ID_TITLES: ContentTitles;
export function buildContentTitles(source: TitleSource): ContentTitles;
export function lazyTitles(source: () => TitleSource): () => ContentTitles; // arma los mapas una vez, al primer pedido

// model/bar-chart.ts
export type ColorToken = 'green' | 'accent' | 'accent-dark' | 'muted' | 'ink' | 'line';
export interface BarSeries { readonly label: string; readonly token: ColorToken; readonly values: readonly number[] }
export interface BarChart { readonly title: string; readonly labels: readonly string[]; readonly series: readonly BarSeries[]; readonly stacked: boolean }
export const CHART_HEIGHT = 220;
export const MIN_SLOT_PX = 6;
export const Y_AXIS_PX = 60;
export function stackSeries(values: readonly (readonly number[])[]): number[][];
export function chartWidth(containerWidth: number, bars: number): number;

// model/overview-series.ts (F14a, V1)
export const OUTCOME_TOKENS: Readonly<Record<OutcomeKey, ColorToken>>;
export function attemptsChart(series: readonly SeriesPoint[], granularity: Granularity): BarChart;
export function studentsChart(series: readonly SeriesPoint[], granularity: Granularity): BarChart;
export function peakSentence(starts: readonly string[], values: readonly number[], granularity: Granularity): string | null;
export function attemptsSummary(series: readonly SeriesPoint[], granularity: Granularity): string;
export function studentsSummary(series: readonly SeriesPoint[], total: number, granularity: Granularity): string;
```

## `pages/admin/api` (F14a)

```ts
// api/admin-endpoints.ts (de F12a): sólo suma `export` a decode
export function decode<T>(result: ApiResult, parse: (body: unknown) => T | null): AdminOutcome<T>;

// api/usage-endpoints.ts
export function getOverview(client: ApiClient, period: PeriodRequest | null, signal: AbortSignal): Promise<AdminOutcome<Stats<Overview>>>;
export function getCurriculumStats(client: ApiClient, period: PeriodRequest | null, filters: CurriculumFilters, signal: AbortSignal): Promise<AdminOutcome<Stats<CurriculumStats>>>;
export function getQueue(client: ApiClient, signal: AbortSignal): Promise<AdminOutcome<QueueStats>>;
export function listRuns(client: ApiClient, filters: RunFilters, cursor: string | null, signal: AbortSignal): Promise<AdminOutcome<RunsPage>>;
```

Las cuatro son `GET`, sin `asUser`, con la query armada con `URLSearchParams` y sin los valores vacíos. Con `period` en `null`, el pedido no lleva `from`, `to` ni `granularity` (L3).

## `pages/admin/lib` (F14a)

```ts
// lib/use-stats-request.ts (export default)
export type StatsLoader<T> = (signal: AbortSignal) => Promise<AdminOutcome<T>>;
export interface StatsRequest<T> {
  readonly data: T | null;          // la última respuesta buena, también mientras llega otra
  readonly failure: ApiFailure | null; // sólo la del pedido vigente
  readonly loading: boolean;
  readonly waiting: boolean;        // la cuenta de Retry-After
  reload(): void;
}
const useStatsRequest: <T>(load: StatsLoader<T>, ownId: number) => StatsRequest<T>;

// lib/use-runs-pages.ts (export default)
export type RunsLoader = (cursor: string | null, signal: AbortSignal) => Promise<AdminOutcome<RunsPage>>;
export interface RunsPages extends StatsRequest<RunsPage> { readonly first: boolean; older(): void; newest(): void }
const useRunsPages: (load: RunsLoader, ownId: number) => RunsPages;

// lib/bar-plot-options.ts: sólo tipos de uplot
export interface PlotSize { readonly width: number; readonly height: number }
export type PlotColors = Readonly<Record<ColorToken, string>>;
export function plotData(chart: BarChart): uPlot.AlignedData;
export function barPlotOptions(chart: BarChart, size: PlotSize, colors: PlotColors, bars: uPlot.Series.PathBuilder | undefined): uPlot.Options;

// lib/plot.ts: el único módulo que importa uplot en tiempo de ejecución
export function drawBarChart(host: HTMLElement, frame: HTMLElement, chart: BarChart): () => void;
```

**Reglas de `lib/plot.ts`:**

- empieza con la licencia de uPlot como comentario `/*! … */`;
- importa `uplot/dist/uPlot.min.css`;
- dibuja con el ancho de `frame` (`chartWidth`) y lo observa con `ResizeObserver`;
- la función que devuelve desconecta el observador y llama a `destroy()`;
- las specs del proyecto `dom` lo reemplazan con `vi.mock('…/lib/plot', …)` y `vi.hoisted`.

## `pages/admin/ui` (F14a, lo que F14b reutiliza)

```tsx
// ui/period-context.tsx (exports nombrados)
export interface SharedPeriod { readonly period: PeriodRequest | null; choose(period: PeriodRequest): void }
export const PeriodProvider: ({ children }: { readonly children: ReactNode }) => ReactElement;
export function usePeriod(): SharedPeriod;

// ui/content-titles-context.tsx (exports nombrados)
export const ContentTitlesProvider: ({ source, children }: { readonly source: () => TitleSource; readonly children: ReactNode }) => ReactElement;
export function useContentTitles(): ContentTitles; // ID_TITLES sin provider

// componentes (export default cada uno)
StatsTable<R>({ title, note?, rows, rowKey, rowHeader, columns, busy? })   // StatsColumn<R> = { header; cell(row) }
Figures({ title, items })                                                  // FigureItem = { label; value; source? }
RateCell({ numerator, n, sample?, label })
Distribution({ owner, ownerId, spread, label })
StatsFailure({ failure, lead, notFoundMessage?, waiting, onRetry })
RequestState({ request, lead, loadingText, notFoundMessage? })
AggregateNotes({ period, generatedAt, withGranularity })
DateField({ label, registration, messages })
PeriodForm({ shown, withGranularity, failure })
SeriesChart({ chart, summary })
RunsList({ runs, title, lead })
```

## `pages/admin`, lo que suma F14b

```ts
// model/usage-types.ts
export type UsageView = 'overview' | 'exercises' | 'students' | 'runs';
export type StudentSort = 'name' | 'lastActivity' | '-lastActivity' | '-createdAt';
export type ExerciseState = 'solved' | 'attempted' | 'started';
export type Confidence = 'again' | 'practice' | 'confident';
export interface StudentQuery { readonly page: number; readonly q: string; readonly inactiveSince: string; readonly sort: StudentSort }
export interface StudentAttempts { readonly lastWeek: number; readonly lastMonth: number }
export interface StudentRow { readonly id: number; readonly name: string; readonly email: string; readonly role: AccountRole; readonly status: AccountStatus; readonly lastActivityAt: string | null; readonly solved: SolvedSplit; readonly attempts: StudentAttempts; readonly lastAttemptAt: string | null }
export interface StudentProgress { readonly epoch: number; readonly resetAt: string | null; readonly lastActivityAt: string | null }
export interface ImportRecord { readonly importedAt: string; readonly source: string; readonly epoch: number }
export interface SolvedByCatalog { readonly catalog: string; readonly language: string; readonly server: number; readonly imported: number }
export interface AttemptBreakdown { readonly attempts: OutcomeCounts; readonly operations: OperationCounts; readonly importedAttempts: number }
export interface ActivityPoint { readonly start: string; readonly attempts: number }
export interface QuotaLimits { readonly active: number; readonly perMinute: number; readonly perDay: number; readonly sandboxMinutes: number }
export interface QuotaUse { readonly active: number; readonly lastMinute: number; readonly lastDay: number; readonly sandboxMs: number; readonly limits: QuotaLimits }
export interface ExerciseProgressRow { readonly exerciseId: string; readonly state: ExerciseState; readonly solvedAt: string | null; readonly serverSolvedAt: string | null; readonly attemptCount: number; readonly lastAttemptAt: string | null; readonly lastOutcome: string | null; readonly assisted: boolean; readonly solutionSeen: boolean; readonly hintsRevealed: number | null; readonly predictionAnswered: boolean; readonly predictionCorrect: boolean; readonly confidence: Confidence | null; readonly reviewDueAt: string | null }
export interface CheckpointProgress { readonly worldId: string; readonly answered: boolean; readonly passed: boolean; readonly passedAt: string | null }
export interface WorkshopProgress { readonly workshopId: string; readonly language: string; readonly codeSealed: boolean; readonly predictionAnswered: boolean; readonly predictionCorrect: boolean; readonly stepsMarked: number; readonly objectivesObserved: number }
export interface RouteProgress { readonly steps: number; readonly milestones: number; readonly favorites: number; readonly quizAnswered: number }
export interface StudentDetail {
  readonly account: AdminUser; readonly progress: StudentProgress; readonly imports: readonly ImportRecord[];
  readonly solvedByCatalog: readonly SolvedByCatalog[]; readonly attempts: { readonly inPeriod: AttemptBreakdown; readonly total: AttemptBreakdown };
  readonly activity: readonly ActivityPoint[]; readonly quota: QuotaUse; readonly exercises: readonly ExerciseProgressRow[];
  readonly campaign: { readonly checkpoints: readonly CheckpointProgress[]; readonly sealedExercises: number };
  readonly workshops: readonly WorkshopProgress[]; readonly route: RouteProgress;
}

// model/parse-usage.ts
export function parseStudentRow(value: unknown): StudentRow | null;
export function parseStudentDetail(body: unknown): Stats<StudentDetail> | null;

// api/usage-endpoints.ts
export function listStudents(client: ApiClient, query: StudentQuery, signal: AbortSignal): Promise<AdminOutcome<ListPage<StudentRow>>>;
export function getStudentDetail(client: ApiClient, userId: number, period: PeriodRequest | null, signal: AbortSignal): Promise<AdminOutcome<Stats<StudentDetail>>>;
export function listAccountRuns(client: ApiClient, userId: number, cursor: string | null, signal: AbortSignal): Promise<AdminOutcome<RunsPage>>;

// ui
AccountUsage({ ownId, userId, name, backLabel, onBack })  // onBack(stale: boolean): stale con un 404
StudentsView({ ownId })
```

```ts
// ui/AccountsTable.tsx (de F12a): una prop más, obligatoria
interface AccountsTableProps { titleId; users; ownId; busy; /* mailAvailable con F12b */ onAction(…); onUsage(user: AdminUser, opener: HTMLButtonElement): void }
```

**Reglas de la columna «Uso»** (FR-028):

- va justo antes de «Acciones»;
- cada fila que no se está borrando tiene «Ver el uso de {nombre}», también la propia;
- el botón está fuera del grupo «Acciones sobre {nombre}», y `ACTION_SLOTS` no cambia.

## `qa/e2e`

```ts
// qa/e2e/pages/usage.ts (F14a)
export class UsagePage {
  constructor(page: Page, admin: AdminPage);
  open(): Promise<void>;                           // admin.open() y «Uso del taller»: nada más sabe abrir
  openView(name: 'Resumen' | 'Ejercicios' | 'Alumnos' | 'Ejecuciones'): Promise<void>;
  views(): Locator;
  heading(name: string): Locator;
  table(name: string): Locator;
  row(table: string, name: RegExp): Locator;
  field(label: string): Locator;
  button(name: string): Locator;
  periodForm(): Locator;
  applyPeriod(from: string, to: string, granularity?: 'Día' | 'Semana' | 'Mes'): Promise<void>;
  chart(name: string): Locator;                    // la región que se desplaza
  canvas(name: string): Locator;
  inkedPixels(name: string): Promise<number>;
  framesAreStable(name: string): Promise<boolean>;
}

// qa/e2e/fixtures/index.ts suma el fixture
interface Fixtures { /* los de F1, F11a y F12a */ usage: UsagePage }

// qa/e2e/lib/usage-contract.ts (F14a; F14b suma lo suyo al final)
export const STATS_MESSAGES: { stats_timeout: string; validation_failed: string; too_long: string };
export function statsError(code: 'stats_timeout'): { message: string; code: string };
export function periodRejection(field: 'from' | 'to' | 'granularity', message: string): { message: string; code: string; errors: Record<string, string[]> };
export const OCTOBER_WEEK: PeriodJson;            // 2026-10-01 a 2026-10-07, por día
export const OVERVIEW_DAY: StatsJson<OverviewJson>;
export const OVERVIEW_WEEK: StatsJson<OverviewJson>;
export const OVERVIEW_EMPTY: StatsJson<OverviewJson>;
export function overviewOfDays(days: number): StatsJson<OverviewJson>;
export const CURRICULUM: StatsJson<CurriculumJson>;
export function curriculumOfAll(): StatsJson<CurriculumJson>;
export const QUEUE: { data: QueueJson; meta: { generatedAt: string } };
export const RUNS_FIRST: RunsJson;
export const RUNS_OLDER: RunsJson;
```

Las rutas de C5 se registran en cada escenario con `api.on('GET /api/admin/stats/overview', …)` y las demás. Como `GET /api/admin/runs` es una sola ruta, con filtros o sin ellos, el escenario decide por `call.search`. Cada escenario de la sección también registra `GET /api/admin/users`, porque la administración abre en «Cuentas».
