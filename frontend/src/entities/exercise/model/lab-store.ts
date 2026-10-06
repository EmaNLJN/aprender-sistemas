import { createStore, type StoreApi } from 'zustand/vanilla';
import { cloneJson } from '../../../shared/lib/clone-json';
import { isLosslessNormalization } from '../../../shared/lib/is-lossless-normalization';
import {
  describeLoadResult,
  openVersionedStore,
  type BackupEntry,
  type StorageLike,
  type VersionedStore,
} from '../../../shared/lib/versioned-storage';
import {
  absorbStored,
  blankLabState,
  LANGUAGES,
  parseSavedLab,
  sanitizeImport,
  type LabStateV1,
} from './lab-state';
import { mergeRecord } from './merge-record';
import type { Exercise } from './types';

const KEY = 'taller-laboratorio-v1';

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

interface OpenLab {
  catalog: LabCatalogLookup;
  store: VersionedStore<LabStateV1>;
  state: LabStateV1;
  saveAvailable: boolean;
  loadWarning: string;
}

export function createLabStore(): LabStore {
  const changes = createStore<{ revision: number }>(() => ({ revision: 0 }));
  const notify = (): void => changes.setState((state) => ({ revision: state.revision + 1 }));
  let lab: OpenLab | null = null;

  function opened(): OpenLab {
    if (!lab) throw new Error('Abrí el almacén del laboratorio antes de usarlo.');
    return lab;
  }

  function open(catalog: LabCatalogLookup, options: { storage?: StorageLike } = {}): void {
    if (lab) throw new Error('El almacén del laboratorio ya está abierto.');
    const store = openVersionedStore<LabStateV1>(KEY, {
      blank: blankLabState,
      parse: (raw) => parseSavedLab(raw, catalog.byId),
      merge: (stored, local) => absorbStored(stored, local, catalog.byId),
      storage: options.storage,
    });
    const loaded = store.load();
    lab = {
      catalog,
      store,
      state: loaded.state,
      saveAvailable: loaded.writable,
      loadWarning: describeLoadResult(loaded, 'del laboratorio'),
    };
  }

  function writeState(): boolean {
    const current = opened();
    const result = current.store.write(current.state);
    current.state = result.state;
    current.saveAvailable = result.saved;
    return current.saveAvailable;
  }

  function save(): boolean {
    const saved = writeState();
    notify();
    return saved;
  }

  function planImport(raw: unknown): LabImportPlan {
    const { catalog, state } = opened();
    const incoming = sanitizeImport(raw, catalog.byId);
    const lossy = !isLosslessNormalization(raw, incoming);
    const merged = cloneJson(state);
    for (const [id, record] of Object.entries(incoming.records))
      merged.records[id] = mergeRecord(merged.records[id], record, catalog.byId.get(id)!.tests);
    for (const language of LANGUAGES)
      if (incoming.selected[language]) merged.selected[language] = incoming.selected[language];
    return { state: merged, lossy };
  }

  function applyImport(plan: LabImportPlan): boolean {
    opened().state = cloneJson(plan.state);
    return save();
  }

  function reset(): boolean {
    const current = opened();
    current.state = blankLabState();
    current.loadWarning = '';
    const removed = current.store.remove();
    save();
    return removed;
  }

  return {
    open,
    getProgress: () => opened().state,
    save,
    exportState: () => cloneJson(opened().state),
    planImport,
    applyImport,
    backups: () => opened().store.backups(),
    reset,
    loadWarning: () => opened().loadWarning,
    storageAvailable: () => opened().saveAvailable,
    changes,
  };
}

export const labStore: LabStore = createLabStore();
