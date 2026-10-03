import type { LevelId } from '../../../shared/config/levels';

export type CampaignLanguage = 'rust' | 'go';

export interface CampaignTest {
  id: string;
}

export interface CampaignExercise {
  id: string;
  language: CampaignLanguage;
  title: string;
  tests: CampaignTest[];
}

export interface CampaignCheckpoint {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

// Mundo tal como lo entrega el catálogo. El motor sólo valida los campos tipados
// aquí; el resto del contenido (subtítulo, historia, conceptos…) se conserva sin
// interpretarlo. `badge` lo garantiza campaign-content-check, no `init`.
export interface CampaignWorldDefinition {
  id: string;
  level: LevelId;
  title: string;
  badge: string;
  trainingIds: string[];
  challengeIds: string[];
  bossId: string;
  checkpoint: CampaignCheckpoint;
  [content: string]: unknown;
}

// Mundo validado: `init` le agrega su lenguaje y las seis misiones en orden.
export interface CampaignWorld extends CampaignWorldDefinition {
  language: CampaignLanguage;
  missionIds: string[];
}

export interface CampaignConfig {
  exercises: CampaignExercise[];
  worlds: CampaignWorldDefinition[] | Record<CampaignLanguage, CampaignWorldDefinition[]>;
}

// Catálogo validado por `init`; el estado de progreso se interpreta contra él.
export interface CampaignCatalog {
  exercises: Map<string, CampaignExercise>;
  worlds: Record<CampaignLanguage, CampaignWorld[]>;
  worldById: Map<string, CampaignWorld>;
}

export interface CampaignSeal {
  code: boolean;
  prediction: boolean;
  assisted: boolean;
}

export interface CampaignCheckpointRecord {
  passed: boolean;
  lastAnswer: number | null;
}

export interface CampaignStateV1 {
  version: 1;
  seals: Record<string, CampaignSeal>;
  checkpoints: Record<string, CampaignCheckpointRecord>;
}

export interface CampaignMission extends CampaignSeal {
  id: string;
  points: number;
  score: number;
  allowed: boolean;
  reasons: string[];
}

export interface DerivedWorld extends CampaignWorld {
  score: number;
  maxScore: number;
  unlocked: boolean;
  completed: boolean;
  checkpointPassed: boolean;
  checkpointReady: boolean;
  checkpointAnswer: number | null;
  checkpointFeedback: string;
  checkpointReasons: string[];
  completionReasons: string[];
  requirements: string[];
  bossReady: boolean;
  reasons: string[];
  missions: CampaignMission[];
}

export interface CampaignSummary {
  score: number;
  maxScore: number;
  completedWorlds: number;
  badges: string[];
  totalXP: number;
  storageAvailable: boolean;
}

export interface AttemptPermission {
  allowed: boolean;
  reasons: string[];
  worldId: string | null;
  isBoss: boolean;
}

export interface InitResult {
  ready: true;
  storageAvailable: boolean;
  loadWarning: string;
}

export interface SyncLabResult {
  changed: boolean;
  xpGained: number;
  totalXP: number;
  storageAvailable: boolean;
}

export interface CheckpointAnswerResult {
  accepted: boolean;
  correct: boolean;
  passed: boolean;
  explanation: string;
  reasons: string[];
}

export interface ImportResult {
  changed: boolean;
  storageAvailable: boolean;
}

export interface ResetResult {
  storageAvailable: boolean;
}

// Foto del laboratorio que lee `syncLab`: sólo `records` y, por registro, los campos que
// el motor interpreta. El motor tolera cualquier otra forma (ignora lo que no reconoce).
export interface CampaignLabState {
  records?: Record<string, unknown>;
}

export interface CampaignEngine {
  init(config: CampaignConfig): InitResult;
  syncLab(labState?: CampaignLabState | null): SyncLabResult;
  getWorlds(language: string): DerivedWorld[];
  canAttempt(id: string, language: string): AttemptPermission;
  answerCheckpoint(worldId: string, index: number): CheckpointAnswerResult;
  getSummary(language: string): CampaignSummary;
  exportState(): CampaignStateV1;
  validateImport(raw: unknown): CampaignStateV1 | undefined;
  importState(raw: unknown): ImportResult;
  reset(): ResetResult;
}
