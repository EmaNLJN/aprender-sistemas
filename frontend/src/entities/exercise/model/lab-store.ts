import { createStore, type StoreApi } from 'zustand/vanilla';
import type { BackupEntry, StorageLike } from '../../../shared/lib/versioned-storage';
import type { LabStateV1 } from './lab-state';
import type { Exercise } from './types';

export interface LabCatalogLookup {
  byId: ReadonlyMap<string, Exercise>;
}

export interface LabImportPlan {
  state: LabStateV1;
  lossy: boolean;
}

export interface LabStore {
  open(catalog: LabCatalogLookup, options?: { storage?: StorageLike }): void;
  getProgress(): LabStateV1;
  save(): boolean;
  exportState(): LabStateV1;
  planImport(raw: unknown): LabImportPlan;
  applyImport(plan: LabImportPlan): boolean;
  backups(): BackupEntry[];
  reset(): boolean;
  loadWarning(): string;
  storageAvailable(): boolean;
  readonly changes: StoreApi<{ revision: number }>;
}

function notImplemented(): never {
  throw new Error('not implemented');
}

export function createLabStore(): LabStore {
  return {
    open: notImplemented,
    getProgress: notImplemented,
    save: notImplemented,
    exportState: notImplemented,
    planImport: notImplemented,
    applyImport: notImplemented,
    backups: notImplemented,
    reset: notImplemented,
    loadWarning: notImplemented,
    storageAvailable: notImplemented,
    changes: createStore<{ revision: number }>(() => ({ revision: 0 })),
  };
}

export const labStore: LabStore = createLabStore();
