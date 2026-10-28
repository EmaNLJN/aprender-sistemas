import type { GuideData, RouteImportPlan, RouteProgressV1 } from '../../../entities/guide';
import type { BackupEntry } from '../../../shared/lib/versioned-storage';

export type AreaName = 'recorrido' | 'laboratorio' | 'campaña' | 'Sistemas';
export type MaybePromise<T> = T | Promise<T>;

export interface SectionPlan {
  lossy: boolean;
}

export interface RouteArea {
  getProgress(): RouteProgressV1;
  applyImport(plan: RouteImportPlan): MaybePromise<boolean>;
  reset(): MaybePromise<boolean>;
  backups(): BackupEntry[];
}

export interface SectionArea {
  exportState(): unknown;
  planImport(raw: unknown): SectionPlan;
  applyImport(plan: SectionPlan): MaybePromise<unknown>;
  reset(): MaybePromise<boolean | undefined>;
  backups(): BackupEntry[];
}

export interface SealedArea extends SectionArea {
  syncDerivedSeals(): void;
}

export interface ProgressAreas {
  route: RouteArea;
  lab: SectionArea;
  campaign: SealedArea;
  systems: SealedArea;
}

export interface ProgressBackupOptions {
  guide: GuideData;
  areas: ProgressAreas;
  sessionResets: readonly (() => void)[];
}

export interface ProgressFile {
  fileName: string;
  text: string;
}

export interface BackupListing extends BackupEntry {
  area: AreaName;
}

export interface PlannedSection {
  area: AreaName;
  source: SectionArea;
  plan: SectionPlan;
}

export interface ProgressImportPlan {
  route: RouteImportPlan;
  sections: readonly PlannedSection[];
}

export interface ProgressNotice {
  notice: string;
}

export interface ResetConfirmation {
  password: string;
}

export interface ProgressBackup {
  exportProgress(): ProgressFile;
  listBackups(): BackupListing[];
  readBackup(key: string): ProgressFile | undefined;
  planImport(text: string): ProgressImportPlan;
  applyImport(plan: ProgressImportPlan): Promise<ProgressNotice>;
  resetAll(confirmation?: ResetConfirmation): Promise<ProgressNotice>;
}
