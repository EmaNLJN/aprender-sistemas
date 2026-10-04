import type { LevelId } from '../../../shared/config/levels';
import type { BackupEntry } from '../../../shared/lib/versioned-storage';

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

export interface CampaignWorldSource {
  title: string;
  url: string;
}

export interface CampaignCheckpoint {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

// Mundo tal como lo entrega el catálogo. El motor sólo valida los campos tipados
// aquí; el resto del contenido (subtítulo, historia, conceptos…) lo declaran los
// catálogos y el motor lo conserva sin interpretarlo. `badge` lo garantiza campaign-content-check, no `init`.
export interface CampaignWorldDefinition {
  id: string;
  level: LevelId;
  title: string;
  badge: string;
  trainingIds: string[];
  challengeIds: string[];
  bossId: string;
  checkpoint: CampaignCheckpoint;
  subtitle?: string;
  story?: string;
  concepts?: string[];
  why?: string;
  guide?: string[];
  sources?: CampaignWorldSource[];
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

// Resultado de aplicar evidencia o una importación: `changed` dice si hubo cambios que
// guardar (o, en `refreshFromLab`, si cambió algo en memoria).
export interface RefreshResult {
  changed: boolean;
  storageAvailable: boolean;
}

export interface ImportResult {
  changed: boolean;
  storageAvailable: boolean;
}

// Importación planificada sin efectos: `state` es el progreso resultante y `lossy` avisa
// que el saneado descartó o cambió datos de la copia.
export interface CampaignImportPlan {
  state: CampaignStateV1;
  lossy: boolean;
}

export interface ResetResult {
  storageAvailable: boolean;
  removed: boolean;
}

// Foto del laboratorio que leen `refreshFromLab` y `syncLab`: sólo `records` y, por registro, los campos que
// el motor interpreta. El motor tolera cualquier otra forma (ignora lo que no reconoce).
export interface CampaignLabState {
  records?: Record<string, unknown>;
}

export interface CampaignEngine {
  // Con `labState`, la evidencia del laboratorio se aplica en memoria (sin escribir) antes de
  // fijar el XP ya informado.
  init(config: CampaignConfig, labState?: CampaignLabState | null): InitResult;
  // Aplica la evidencia del laboratorio sólo en memoria: nunca escribe. Lo usan los renders.
  refreshFromLab(labState?: CampaignLabState | null): RefreshResult;
  // Aplica la evidencia y guarda lo pendiente. Lo usan las acciones del alumno.
  syncLab(labState?: CampaignLabState | null): SyncLabResult;
  getWorlds(language: string): DerivedWorld[];
  canAttempt(id: string, language: string): AttemptPermission;
  answerCheckpoint(worldId: string, index: number): CheckpointAnswerResult;
  getSummary(language: string): CampaignSummary;
  exportState(): CampaignStateV1;
  planImport(raw: unknown): CampaignImportPlan;
  applyImport(plan: CampaignImportPlan): ImportResult;
  backups(): BackupEntry[];
  reset(): ResetResult;
}
