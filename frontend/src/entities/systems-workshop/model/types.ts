import type { BackupEntry } from '../../../shared/lib/versioned-storage';

export type SystemsLanguage = 'rust' | 'go';

export interface SystemsTest {
  id: string;
}

// Programmable core of a workshop: the Rust/Go exercise whose approval seals the code.
export interface SystemsExercise {
  id: string;
  language: SystemsLanguage;
  tests: SystemsTest[];
}

export interface WorkshopObjective {
  id: string;
  [content: string]: unknown;
}

// `explanation` is guaranteed by the catalog (qa/systems-check), not by `init`.
export interface WorkshopPrediction {
  options: string[];
  answer: number;
  explanation: string;
}

// Workshop as delivered by the catalog. The engine validates only the typed fields here;
// the rest of the content (title, level, interactive model…) is kept uninterpreted.
export interface SystemsWorkshop {
  id: string;
  model: string;
  objectives: WorkshopObjective[];
  steps: unknown[];
  prediction: WorkshopPrediction;
  code: Record<SystemsLanguage, string>;
  [content: string]: unknown;
}

export interface SystemsConfig {
  workshops: SystemsWorkshop[];
  models: Record<string, unknown>;
  exercises: SystemsExercise[];
}

// Catalog validated by `init`; progress is interpreted against it.
export interface SystemsCatalog {
  workshops: Map<string, SystemsWorkshop>;
  exercises: Map<string, SystemsExercise>;
}

export interface WorkshopRecord {
  observed: string[];
  code: boolean;
  predicted: boolean;
  answer: number | null;
  steps: number[];
  note: string;
}

export interface SystemsStateV1 {
  version: 1;
  records: Record<string, WorkshopRecord>;
}

export interface WorkshopView extends SystemsWorkshop {
  progress: WorkshopRecord;
  modelDone: boolean;
  completed: boolean;
  seals: number;
  storageAvailable: boolean;
}

export interface ObserveResult extends WorkshopView {
  added: string[];
}

export interface AnswerResult extends WorkshopView {
  correct: boolean;
  explanation: string;
}

export interface SystemsInitResult {
  storageAvailable: boolean;
  loadWarning: string;
}

// `changed`: in `syncLab`, there were unsaved changes and persisting was attempted; in
// `refreshFromLab`, something changed in memory.
export interface SystemsSyncResult {
  changed: boolean;
  storageAvailable: boolean;
}

// Import planned without side effects: `state` is the resulting progress and `lossy` warns
// that sanitizing dropped or changed data from the copy.
export interface SystemsImportPlan {
  state: SystemsStateV1;
  lossy: boolean;
}

export interface SystemsResetResult {
  removed: boolean;
}

export interface NoteResult {
  storageAvailable: boolean;
}

export interface SystemsEngine {
  init(config: SystemsConfig): SystemsInitResult;
  get(id: string, language: string): WorkshopView;
  observe(id: string, language: string, goals: unknown): ObserveResult;
  answer(id: string, language: string, index: number): AnswerResult;
  // Seals in memory with lab evidence and never writes. Used by renders.
  refreshFromLab(lab?: unknown): SystemsSyncResult;
  // Seals and saves what is pending. Used by student actions.
  syncLab(lab?: unknown): SystemsSyncResult;
  planImport(raw: unknown): SystemsImportPlan;
  applyImport(plan: SystemsImportPlan): SystemsSyncResult;
  backups(): BackupEntry[];
  list(language: string): WorkshopView[];
  setStep(id: string, language: string, index: number, checked: boolean): void;
  setNote(id: string, language: string, note: string): NoteResult;
  exportState(): SystemsStateV1;
  reset(): SystemsResetResult;
}
