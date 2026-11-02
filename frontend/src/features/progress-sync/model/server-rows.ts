import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { Confidence, FocusMinutes, Language, NoteField, RouteMarkKind } from './operations';

export type ProofState = 'current' | 'changed' | 'legacy';

export interface Clocked<V> {
  readonly value: V;
  readonly at: string | null;
}

export interface ClockedText {
  readonly text: string;
  readonly at: string | null;
}

export interface TestVerdict {
  readonly testKey: string;
  readonly outcome: 'pass' | 'fail' | 'missing';
}

export interface ExerciseRow {
  readonly exerciseId: string;
  readonly revision: number;
  readonly prediction: {
    readonly answer: number;
    readonly at: string | null;
  } | null;
  readonly predictionCorrect: Clocked<boolean>;
  readonly assisted: boolean;
  readonly solutionSeen: boolean;
  readonly hintsRevealed: number | null;
  readonly reflection: ClockedText | null;
  readonly customTest: ClockedText | null;
  readonly review: {
    readonly confidence: Confidence | null;
    readonly reviewedAt: string | null;
    readonly reviewDueAt: string | null;
    readonly at: string | null;
  } | null;
  readonly solvedAt: string | null;
  readonly serverSolvedAt: string | null;
  readonly proof: {
    readonly attemptId: number;
    readonly at: string;
    readonly state: ProofState;
    readonly tests: readonly TestVerdict[];
  } | null;
  readonly lastAttempt: {
    readonly attemptId: number;
    readonly at: string;
    readonly outcome: string;
    readonly legacy: boolean;
    readonly tests: readonly TestVerdict[];
  } | null;
  readonly attemptCount: number;
  readonly legacyAttempts: number;
}

export interface DraftRow {
  readonly exerciseId: string;
  readonly code: string | null;
  readonly starterHash: string | null;
  readonly at: string | null;
  readonly revision: number;
}

export interface CampaignSealRow {
  readonly exerciseId: string;
  readonly code: boolean;
  readonly prediction: boolean;
  readonly assisted: boolean;
  readonly revision: number;
}

export interface CheckpointRow {
  readonly worldId: string;
  readonly passed: boolean;
  readonly passedAt: string | null;
  readonly lastAnswer: Clocked<number> | null;
  readonly revision: number;
}

export interface WorkshopProgressRow {
  readonly workshopId: string;
  readonly language: Language;
  readonly codeSealed: boolean;
  readonly predictionCorrect: Clocked<boolean>;
  readonly answer: Clocked<number> | null;
  readonly note: ClockedText | null;
  readonly revision: number;
}

export interface WorkshopObjectiveRow {
  readonly workshopId: string;
  readonly language: Language;
  readonly objectiveKey: string;
  readonly observedAt: string | null;
  readonly revision: number;
}

export interface WorkshopStepRow {
  readonly workshopId: string;
  readonly language: Language;
  readonly stepKey: string;
  readonly marked: boolean;
  readonly at: string | null;
  readonly revision: number;
}

export interface RouteMarkRow {
  readonly kind: RouteMarkKind;
  readonly itemKey: string;
  readonly marked: boolean;
  readonly at: string | null;
  readonly revision: number;
}

export interface RouteQuizRow {
  readonly stepId: string;
  readonly answer: number;
  readonly at: string | null;
  readonly revision: number;
}

export interface RouteNoteRow {
  readonly language: Language;
  readonly field: NoteField;
  readonly body: string;
  readonly at: string | null;
  readonly revision: number;
}

export interface PreferencesRow {
  readonly routeLanguage: Clocked<Language> | null;
  readonly focusMinutes: Clocked<FocusMinutes> | null;
  readonly labSelected: {
    readonly rust: Clocked<string> | null;
    readonly go: Clocked<string> | null;
  };
  readonly revision: number;
}

export interface ProgressAreas {
  readonly exercises: readonly ExerciseRow[];
  readonly drafts: readonly DraftRow[];
  readonly campaign: {
    readonly seals: readonly CampaignSealRow[];
    readonly checkpoints: readonly CheckpointRow[];
  };
  readonly workshops: {
    readonly progress: readonly WorkshopProgressRow[];
    readonly objectives: readonly WorkshopObjectiveRow[];
    readonly steps: readonly WorkshopStepRow[];
  };
  readonly route: {
    readonly marks: readonly RouteMarkRow[];
    readonly quiz: readonly RouteQuizRow[];
    readonly notes: readonly RouteNoteRow[];
  };
  readonly preferences: PreferencesRow | null;
}

export interface ProgressPhoto {
  readonly userId: number;
  readonly epoch: number;
  readonly revision: number;
  readonly resetAt: string | null;
  readonly contentVersion: string;
  readonly areas: ProgressAreas;
}

export type ResultStatus = 'applied' | 'rejected' | 'duplicate' | 'uuid_reused' | 'stale_content';

export interface SyncResult {
  readonly id: string;
  readonly status: ResultStatus;
  readonly reason?: string;
}

export interface SyncResponse {
  readonly epoch: number;
  readonly revision: number;
  readonly serverTime: string;
  readonly contentVersion: string;
  readonly results: readonly SyncResult[];
  readonly full: boolean;
  readonly changes: ProgressAreas;
}

const STATUSES: readonly ResultStatus[] = [
  'applied',
  'rejected',
  'duplicate',
  'uuid_reused',
  'stale_content',
];

export function emptyAreas(): ProgressAreas {
  return {
    exercises: [],
    drafts: [],
    campaign: { seals: [], checkpoints: [] },
    workshops: { progress: [], objectives: [], steps: [] },
    route: { marks: [], quiz: [], notes: [] },
    preferences: null,
  };
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function listOf<R>(value: unknown): R[] | null {
  return Array.isArray(value) ? (value as R[]) : null;
}

function groupOf(value: unknown, names: readonly string[]): Record<string, unknown[]> | null {
  if (!isPlainObject(value)) return null;
  const group: Record<string, unknown[]> = {};
  for (const name of names) {
    const rows = listOf<unknown>(value[name]);
    if (rows === null) return null;
    group[name] = rows;
  }
  return group;
}

// The server validates every row; the client only checks the shape it walks (http.md §5).
export function readAreas(body: Record<string, unknown>): ProgressAreas | null {
  const exercises = listOf<ExerciseRow>(body.exercises);
  const drafts = listOf<DraftRow>(body.drafts);
  const campaign = groupOf(body.campaign, ['seals', 'checkpoints']);
  const workshops = groupOf(body.workshops, ['progress', 'objectives', 'steps']);
  const route = groupOf(body.route, ['marks', 'quiz', 'notes']);
  const preferences = body.preferences === null ? null : body.preferences;
  if (!exercises || !drafts || !campaign || !workshops || !route) return null;
  if (preferences !== null && !isPlainObject(preferences)) return null;
  return {
    exercises,
    drafts,
    campaign: campaign as unknown as ProgressAreas['campaign'],
    workshops: workshops as unknown as ProgressAreas['workshops'],
    route: route as unknown as ProgressAreas['route'],
    preferences: preferences as PreferencesRow | null,
  };
}

export function readPhoto(body: unknown): ProgressPhoto | null {
  if (!isPlainObject(body) || body.full !== true) return null;
  const { userId, epoch, revision, resetAt, contentVersion } = body;
  if (!Number.isSafeInteger(userId) || !isCount(epoch) || !isCount(revision)) return null;
  if (typeof contentVersion !== 'string') return null;
  if (resetAt !== null && typeof resetAt !== 'string') return null;
  const areas = readAreas(body);
  if (areas === null) return null;
  return {
    userId: userId as number,
    epoch,
    revision,
    resetAt,
    contentVersion,
    areas,
  };
}

function readResults(value: unknown): SyncResult[] | null {
  const results = listOf<unknown>(value);
  if (results === null) return null;
  const valid = results.every(
    (result) =>
      isPlainObject(result) &&
      typeof result.id === 'string' &&
      STATUSES.includes(result.status as ResultStatus),
  );
  return valid ? (results as SyncResult[]) : null;
}

export function readSyncResponse(body: unknown): SyncResponse | null {
  if (!isPlainObject(body) || !isPlainObject(body.changes)) return null;
  const { epoch, revision, serverTime, contentVersion } = body;
  if (!isCount(epoch) || !isCount(revision)) return null;
  if (typeof serverTime !== 'string' || Number.isNaN(Date.parse(serverTime))) return null;
  if (typeof contentVersion !== 'string') return null;
  const results = readResults(body.results);
  const changes = readAreas(body.changes);
  if (results === null || changes === null) return null;
  const full = body.changes.full === true;
  return {
    epoch,
    revision,
    serverTime,
    contentVersion,
    results,
    full,
    changes,
  };
}
