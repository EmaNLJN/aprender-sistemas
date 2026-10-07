import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  describeLoadResult,
  openVersionedStore,
  type BackupEntry,
  type LoadResult,
  type StorageLike,
  type VersionedStore,
} from '../../../shared/lib/versioned-storage';
import { blankRouteProgress, parseRouteProgress } from './parse-route-progress';
import { mergeRouteProgress, type RouteProgressV1 } from './route-progress';
import type { GuideData } from './types';

const KEY = 'taller-learning-v1';

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

function mergeStoredRoute(stored: RouteProgressV1, local: RouteProgressV1): RouteProgressV1 {
  return {
    ...mergeRouteProgress(stored, local),
    language: local.language,
    minutes: local.minutes,
  };
}

function loadNoticeFor(loaded: LoadResult<RouteProgressV1>): string {
  if (loaded.status === 'unavailable')
    return 'No se pudo leer o guardar el avance. Podés exportarlo al terminar.';
  return describeLoadResult(loaded, 'del recorrido');
}

export function createRouteStore(): RouteStore {
  const changes = createStore<{ revision: number }>(() => ({ revision: 0 }));
  const notify = (): void => changes.setState((state) => ({ revision: state.revision + 1 }));

  interface OpenRoute {
    store: VersionedStore<RouteProgressV1>;
    state: RouteProgressV1;
    available: boolean;
    warning: string;
  }
  let route: OpenRoute | null = null;

  function opened(): OpenRoute {
    if (!route) throw new Error('Abrí el almacén del recorrido antes de usarlo.');
    return route;
  }

  function write(current: OpenRoute): boolean {
    const result = current.store.write(current.state);
    current.state = result.state;
    current.available = result.saved;
    return result.saved;
  }

  return {
    open(guide, options = {}) {
      if (route) throw new Error('El almacén del recorrido ya está abierto.');
      const store = openVersionedStore<RouteProgressV1>(KEY, {
        blank: blankRouteProgress,
        parse: (raw) => parseRouteProgress(raw, guide),
        merge: mergeStoredRoute,
        storage: options.storage,
      });
      const loaded = store.load();
      route = {
        store,
        state: loaded.state,
        available: loaded.writable,
        warning: loadNoticeFor(loaded),
      };
    },
    getProgress: () => opened().state,
    save() {
      const saved = write(opened());
      notify();
      return saved;
    },
    applyImport(plan) {
      const current = opened();
      current.state = plan.state;
      const saved = write(current);
      notify();
      return saved;
    },
    reset() {
      const current = opened();
      current.state = blankRouteProgress();
      current.warning = '';
      const removed = current.store.remove();
      notify();
      return removed;
    },
    backups: () => opened().store.backups(),
    loadWarning: () => opened().warning,
    storageAvailable: () => opened().available,
    changes,
  };
}

export const routeStore: RouteStore = createRouteStore();
