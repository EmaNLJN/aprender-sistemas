import type { StoreApi } from 'zustand/vanilla';
import type { BackupEntry, StorageLike } from '../../../shared/lib/versioned-storage';
import type { RouteProgressV1 } from './route-progress';
import type { GuideData } from './types';

export interface RouteImportPlan {
  state: RouteProgressV1;
  lossy: boolean;
}

export interface RouteStore {
  open(guide: GuideData, options?: { storage?: StorageLike }): void;
  getProgress(): RouteProgressV1;
  save(): boolean;
  applyImport(plan: RouteImportPlan): boolean;
  reset(): boolean;
  backups(): BackupEntry[];
  loadWarning(): string;
  storageAvailable(): boolean;
  readonly changes: StoreApi<{ revision: number }>;
}

export function createRouteStore(): RouteStore {
  throw new Error('not implemented');
}

export const routeStore: RouteStore = {} as RouteStore;
