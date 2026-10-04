// Lectura y escritura versionadas de las claves de progreso. No conoce reglas de
// negocio: cada almacén aporta `blank` y `parse`. Ver docs/adr/0003-integridad-del-progreso.md.
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

// `${key}:respaldo` (la ranura histórica, sin cambio de nombre), `${key}:respaldo-2` … `${key}:respaldo-5`.
export function backupKeysFor(key: string): string[] {
  const historic = `${key}:respaldo`;
  const others = Array.from({ length: BACKUP_SLOTS - 1 }, (_, index) => `${historic}-${index + 2}`);
  return [historic, ...others];
}

export interface VersionedStoreOptions<T> {
  blank: () => T;
  // Devuelve el estado normalizado y cuántos registros descartó; lanza si la forma o la
  // versión no se reconocen.
  parse: (raw: unknown) => ParsedState<T>;
  // Combina lo que guardó otra pestaña con el estado local. Sólo se usa si la clave cambió
  // desde la última lectura o escritura de este almacén. Puede devolver `local` modificado
  // en el lugar. Si falta, gana el estado local.
  merge?: (stored: T, local: T) => T;
  storage?: StorageLike;
}

export interface LoadResult<T> {
  status: StorageStatus;
  state: T;
  dropped: number; // registros enteros descartados por parse
  lossy: boolean; // dropped > 0 o la normalización quitó o cambió datos
  backupKey: string | null; // ranura con el texto original cuando la carga se degradó y la copia quedó asegurada
  writable: boolean; // false si no hay almacenamiento, o si la carga se degradó sin copia asegurada
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

// En navegadores con almacenamiento bloqueado el solo acceso a `localStorage` lanza.
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

// Asegura una copia de `text` en una ranura y devuelve su clave, o null si no hay lugar.
// Reutiliza la ranura que ya contiene exactamente ese texto; si no, usa la primera vacía.
// Nunca pisa otra ranura y un fallo del almacenamiento equivale a no tener copia.
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
  parsed: ParsedState<T> | null; // null si el texto no es JSON o parse lo rechazó
  lossy: boolean;
}

// Normaliza el texto guardado y decide si perdió datos. Compara contra un segundo
// `JSON.parse` para que un parse que muta su entrada no oculte la pérdida.
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
  // Último texto leído o escrito por este almacén; null si la clave no existía.
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

  // Estado a escribir cuando otra pestaña cambió la clave, o null si no se puede escribir.
  function reconcile(state: T, current: string | null, target: StorageLike): T | null {
    if (current === null) return state;
    const { parsed, lossy } = inspectText(current, options.parse);
    if (parsed && !lossy) return options.merge ? options.merge(parsed.state, state) : state;
    if (secureBackup(target, key, current) === null) {
      writable = false;
      return null;
    }
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
    if (!storage) return false;
    let allRemoved = true;
    for (const name of [key, ...backupKeysFor(key)]) {
      try {
        storage.removeItem(name);
      } catch {
        allRemoved = false;
      }
    }
    lastText = null;
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

// Aviso para el alumno según la carga. `area` nombra el progreso («del recorrido»,
// «de campaña»…). El almacenamiento bloqueado lo informa el shell, así que da ''.
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
