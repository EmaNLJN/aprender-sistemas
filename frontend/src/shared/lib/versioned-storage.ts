// Versioned reads and writes of the progress keys. Knows no business rules: each store
// provides `blank` and `parse`. See docs/adr/0003-integridad-del-progreso.md.
import { isLosslessNormalization } from './is-lossless-normalization';

export type StorageStatus = 'empty' | 'loaded' | 'unreadable' | 'unavailable';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ParsedState<T> {
  state: T;
  dropped: number;
}

export const BACKUP_SLOTS = 5;

// `${key}:respaldo` (the historical slot, name unchanged), `${key}:respaldo-2` … `${key}:respaldo-5`.
export function backupKeysFor(key: string): string[] {
  const historic = `${key}:respaldo`;
  const others = Array.from({ length: BACKUP_SLOTS - 1 }, (_, index) => `${historic}-${index + 2}`);
  return [historic, ...others];
}

export interface VersionedStoreOptions<T> {
  blank: () => T;
  // Returns the normalized state and how many records it dropped; throws if the shape or
  // version is not recognized.
  parse: (raw: unknown) => ParsedState<T>;
  // Merges what another tab saved with the local state. Used only if the key changed since
  // this store's last read or write. May return `local` modified in place. If missing, the
  // local state wins.
  merge?: (stored: T, local: T) => T;
  storage?: StorageLike;
}

export interface LoadResult<T> {
  status: StorageStatus;
  state: T;
  dropped: number; // whole records dropped by parse
  lossy: boolean; // dropped > 0 or normalization removed or changed data
  backupKey: string | null; // slot holding the original text when the load degraded and the copy was secured
  writable: boolean; // false if there is no storage, or if the load degraded without a secured copy
}

export interface WriteResult<T> {
  saved: boolean;
  state: T;
}

export interface BackupEntry {
  key: string;
  text: string;
}

export interface VersionedStore<T> {
  load(): LoadResult<T>;
  write(state: T): WriteResult<T>;
  hasUnsavedChanges(state: T): boolean;
  remove(): boolean;
  backups(): BackupEntry[];
}

// In browsers with blocked storage, merely accessing `localStorage` throws.
function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
  } catch {
    return null;
  }
}

function readItem(storage: StorageLike, key: string): { available: boolean; text: string | null } {
  try {
    return { available: true, text: storage.getItem(key) };
  } catch {
    return { available: false, text: null };
  }
}

// Secures a copy of `text` in a slot and returns its key, or null if there is no room.
// Reuses the slot that already holds exactly that text; otherwise uses the first empty one.
// Never overwrites another slot, and a storage failure counts as having no copy.
function secureBackup(storage: StorageLike, key: string, text: string): string | null {
  try {
    let firstEmpty: string | null = null;
    for (const slot of backupKeysFor(key)) {
      const stored = storage.getItem(slot);
      if (stored === text) return slot;
      if (stored === null && firstEmpty === null) firstEmpty = slot;
    }
    if (firstEmpty === null) return null;
    storage.setItem(firstEmpty, text);
    return firstEmpty;
  } catch {
    return null;
  }
}

interface InspectedText<T> {
  parsed: ParsedState<T> | null; // null if the text is not JSON or parse rejected it
  lossy: boolean;
}

// Normalizes the saved text and decides whether it lost data. Compares against a second
// `JSON.parse` so a parse that mutates its input cannot hide the loss.
function inspectText<T>(text: string, parse: (raw: unknown) => ParsedState<T>): InspectedText<T> {
  try {
    const parsed = parse(JSON.parse(text));
    const lossy = parsed.dropped > 0 || !isLosslessNormalization(JSON.parse(text), parsed.state);
    return { parsed, lossy };
  } catch {
    return { parsed: null, lossy: true };
  }
}

export function openVersionedStore<T>(
  key: string,
  options: VersionedStoreOptions<T>,
): VersionedStore<T> {
  const storage = resolveStorage(options.storage);
  // Last text read or written by this store; null if the key did not exist.
  let lastText: string | null = null;
  let writable = storage !== null;

  function load(): LoadResult<T> {
    const result = (
      status: StorageStatus,
      state: T,
      extra: Partial<LoadResult<T>> = {},
    ): LoadResult<T> => ({
      status,
      state,
      dropped: 0,
      lossy: false,
      backupKey: null,
      writable,
      ...extra,
    });
    if (!storage) return result('unavailable', options.blank());
    const { available, text } = readItem(storage, key);
    if (!available) {
      writable = false;
      return result('unavailable', options.blank());
    }
    lastText = text;
    writable = true;
    if (text === null) return result('empty', options.blank());
    const { parsed, lossy } = inspectText(text, options.parse);
    if (!lossy && parsed) return result('loaded', parsed.state);
    const backupKey = secureBackup(storage, key, text);
    writable = backupKey !== null;
    if (!parsed) return result('unreadable', options.blank(), { lossy: true, backupKey, writable });
    return result('loaded', parsed.state, { dropped: parsed.dropped, lossy, backupKey, writable });
  }

  // State to write when another tab changed the key, or null if it cannot be written.
  function reconcile(state: T, current: string | null, target: StorageLike): T | null {
    if (current === null) return state;
    const { parsed, lossy } = inspectText(current, options.parse);
    if (parsed && !lossy) return options.merge ? options.merge(parsed.state, state) : state;
    // Unreadable or lossy text: the original copy is secured before overwriting it.
    if (secureBackup(target, key, current) === null) {
      writable = false;
      return null;
    }
    // If readable, even with loss, what this version recognizes is rescued.
    if (parsed && options.merge) return options.merge(parsed.state, state);
    return state;
  }

  function write(state: T): WriteResult<T> {
    if (!storage || !writable) return { saved: false, state };
    const { available, text: current } = readItem(storage, key);
    if (!available) return { saved: false, state };
    let toSave = state;
    if (current !== lastText) {
      const reconciled = reconcile(state, current, storage);
      if (reconciled === null) return { saved: false, state };
      toSave = reconciled;
    }
    try {
      const text = JSON.stringify(toSave);
      storage.setItem(key, text);
      lastText = text;
      return { saved: true, state: toSave };
    } catch {
      return { saved: false, state: toSave };
    }
  }

  function remove(): boolean {
    // Without storage there is nothing to delete.
    if (!storage) return true;
    let allRemoved = true;
    let mainKeyRemoved = true;
    for (const name of [key, ...backupKeysFor(key)]) {
      try {
        storage.removeItem(name);
      } catch {
        allRemoved = false;
        if (name === key) mainKeyRemoved = false;
      }
    }
    // If the main key is still stored, `lastText` keeps that text: the next write
    // overwrites it instead of treating it as a change from another tab.
    if (mainKeyRemoved) lastText = null;
    writable = true;
    return allRemoved;
  }

  function backups(): BackupEntry[] {
    if (!storage) return [];
    const entries: BackupEntry[] = [];
    for (const slot of backupKeysFor(key)) {
      const { text } = readItem(storage, slot);
      if (text !== null) entries.push({ key: slot, text });
    }
    return entries;
  }

  return {
    load,
    write,
    hasUnsavedChanges: (state) => JSON.stringify(state) !== lastText,
    remove,
    backups,
  };
}

// Warning for the student depending on the load. `area` names the progress («del recorrido»,
// «de campaña»…). Blocked storage is reported by the shell, so it yields ''.
export function describeLoadResult(
  result: Pick<LoadResult<unknown>, 'status' | 'dropped' | 'lossy' | 'backupKey'>,
  area: string,
): string {
  const copy = result.backupKey
    ? `se conservó una copia en ${result.backupKey}.`
    : 'no se pudo guardar una copia, así que esta sesión no guardará cambios de esa sección.';
  if (result.status === 'unreadable')
    return `No se pudo leer el progreso ${area} guardado; ${copy}`;
  if (result.dropped === 1)
    return `Se descartó 1 registro ${area} que esta versión no reconoce; ${copy}`;
  if (result.dropped > 1)
    return `Se descartaron ${result.dropped} registros ${area} que esta versión no reconoce; ${copy}`;
  if (result.lossy) return `Se descartaron datos ${area} que esta versión no reconoce; ${copy}`;
  return '';
}
