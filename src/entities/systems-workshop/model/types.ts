import type { BackupEntry } from '../../../shared/lib/versioned-storage';

export type SystemsLanguage = 'rust' | 'go';

export interface SystemsTest {
  id: string;
}

// Núcleo programable de un taller: el ejercicio Rust/Go cuya aprobación sella el código.
export interface SystemsExercise {
  id: string;
  language: SystemsLanguage;
  tests: SystemsTest[];
}

export interface WorkshopObjective {
  id: string;
  [content: string]: unknown;
}

// `explanation` lo garantiza el catálogo (qa/systems-check), no `init`.
export interface WorkshopPrediction {
  options: string[];
  answer: number;
  explanation: string;
}

// Taller tal como lo entrega el catálogo. El motor sólo valida los campos tipados aquí;
// el resto del contenido (título, nivel, modelo interactivo…) se conserva sin interpretarlo.
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

// Catálogo validado por `init`; el progreso se interpreta contra él.
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

// `changed`: en `syncLab`, había cambios sin guardar y se intentó persistir; en
// `refreshFromLab`, cambió algo en memoria.
export interface SystemsSyncResult {
  changed: boolean;
  storageAvailable: boolean;
}

// Importación planificada sin efectos: `state` es el progreso resultante y `lossy` avisa
// que el saneado descartó o cambió datos de la copia.
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
  // Sella en memoria con la evidencia del laboratorio y nunca escribe. Lo usan los renders.
  refreshFromLab(lab?: unknown): SystemsSyncResult;
  // Sella y guarda lo pendiente. Lo usan las acciones del alumno.
  syncLab(lab?: unknown): SystemsSyncResult;
  validateImport(raw: unknown): SystemsStateV1 | undefined;
  planImport(raw: unknown): SystemsImportPlan;
  applyImport(plan: SystemsImportPlan): SystemsSyncResult;
  importState(raw: unknown): void;
  backups(): BackupEntry[];
  list(language: string): WorkshopView[];
  setStep(id: string, language: string, index: number, checked: boolean): void;
  setNote(id: string, language: string, note: string): NoteResult;
  exportState(): SystemsStateV1;
  reset(): SystemsResetResult;
}
