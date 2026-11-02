import type { StoreApi } from 'zustand/vanilla';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error' | 'signed-out' | 'outdated';
export type StorageMode = 'browser' | 'shared' | 'blocked';
export type LeftReason = 'offline' | 'error' | 'signed-out' | 'outdated' | 'account-changed';
export type ImportSource = 'storage' | 'export';
export type ProofState = 'current' | 'changed' | 'legacy';

export interface AccountMismatch {
  readonly lostOnReload: number;
}

export interface EpochCopyInfo {
  readonly count: number;
  readonly persisted: boolean;
}

export interface EpochChange {
  readonly resetAt: string | null;
  readonly ownReset: boolean;
  readonly copy: EpochCopyInfo | null;
}

export interface V1Summary {
  readonly solvedCount: number;
  readonly lastResultAt: string | null;
}

export interface ImportQuestion {
  readonly source: ImportSource;
  readonly summary: V1Summary;
  readonly stage: 'offer' | 'confirm';
}

export interface ReportEntry {
  readonly path: string;
  readonly reason: string;
}

export interface ImportReport {
  readonly written: Readonly<Record<string, number>>;
  readonly omitted: readonly ReportEntry[];
  readonly replaced: readonly ReportEntry[];
  readonly conflicts: readonly ReportEntry[];
}

export interface ExerciseSummary {
  readonly attemptCount: number;
  readonly legacyAttempts: number;
  readonly proofState: ProofState | null;
  readonly serverSolvedAt: string | null;
}

export interface ProgressSyncState {
  readonly status: SyncStatus | null;
  readonly mode: StorageMode;
  readonly unsentCount: number;
  readonly lostOnUnload: number;
  readonly clockSkewMs: number | null;
  readonly rejectedCount: number;
  readonly accountMismatch: AccountMismatch | null;
  readonly epochChange: EpochChange | null;
  readonly importQuestion: ImportQuestion | null;
  readonly lastImport: ImportReport | null;
  readonly importNotice: string | null;
  readonly busy: 'import' | 'reset' | null;
}

export type FlushOutcome =
  | { readonly kind: 'sent' }
  | {
      readonly kind: 'left';
      readonly count: number;
      readonly reason: LeftReason;
    };

export type SignOutChoice = 'keep' | 'discard';

export interface UnsentFile {
  readonly fileName: string;
  readonly text: string;
}

export interface ProgressSync {
  readonly state: StoreApi<ProgressSyncState>;
  flushNow(): Promise<FlushOutcome>;
  afterSignOut(choice: SignOutChoice): void;
  downloadUnsent(): UnsentFile | null;
  downloadEpochCopy(): UnsentFile | null;
  discardEpochCopy(): void;
  dismissEpochChange(): void;
  acknowledgeRejected(): void;
  answerImport(yes: boolean): Promise<void>;
  enterSharedMode(): Promise<void>;
  leaveSharedMode(): void;
  exerciseSummary(exerciseId: string): ExerciseSummary | null;
}
