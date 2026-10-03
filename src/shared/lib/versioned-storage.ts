// Lectura y escritura versionadas de las claves de progreso. No conoce reglas de
// negocio: cada almacén aporta `blank` y `parse`. Ver docs/adr/0003-integridad-del-progreso.md.
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

export interface LoadOptions<T> {
  blank: () => T;
  // Devuelve el estado normalizado y cuántos registros descartó; lanza si la forma o la
  // versión no se reconocen.
  parse: (raw: unknown) => ParsedState<T>;
  storage?: StorageLike;
}

export interface LoadResult<T> {
  status: StorageStatus;
  state: T;
  dropped: number;
  backupKey: string;
}

export function backupKeyFor(key: string): string {
  return `${key}:respaldo`;
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

// Guarda el texto original sin pisar un respaldo previo; un fallo no interrumpe la carga.
function keepBackup(storage: StorageLike, key: string, originalText: string): void {
  const backupKey = backupKeyFor(key);
  try {
    if (storage.getItem(backupKey) === null) storage.setItem(backupKey, originalText);
  } catch {
    // Sin respaldo posible, el aviso al alumno sigue siendo el de la carga.
  }
}

// Nunca escribe la clave principal: la primera escritura es una acción del alumno.
export function loadVersionedState<T>(key: string, options: LoadOptions<T>): LoadResult<T> {
  const backupKey = backupKeyFor(key);
  const result = (status: StorageStatus, state: T, dropped = 0): LoadResult<T> => ({
    status,
    state,
    dropped,
    backupKey,
  });
  const storage = resolveStorage(options.storage);
  if (!storage) return result('unavailable', options.blank());
  const { available, text } = readItem(storage, key);
  if (!available) return result('unavailable', options.blank());
  if (text === null) return result('empty', options.blank());
  let parsed: ParsedState<T>;
  try {
    parsed = options.parse(JSON.parse(text));
  } catch {
    keepBackup(storage, key, text);
    return result('unreadable', options.blank());
  }
  if (parsed.dropped > 0) keepBackup(storage, key, text);
  return result('loaded', parsed.state, parsed.dropped);
}

export function writeVersionedState(key: string, value: unknown, storage?: StorageLike): boolean {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    target.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Borra la clave y su respaldo; con el almacenamiento bloqueado no hay nada que borrar.
export function removeVersionedState(key: string, storage?: StorageLike): void {
  const target = resolveStorage(storage);
  if (!target) return;
  for (const name of [key, backupKeyFor(key)]) {
    try {
      target.removeItem(name);
    } catch {
      // Se intenta con la otra clave.
    }
  }
}

// Aviso para el alumno según la carga. `area` nombra el progreso («del recorrido»,
// «de campaña»…). El almacenamiento bloqueado lo informa el shell, así que da ''.
export function describeLoadResult(
  result: Pick<LoadResult<unknown>, 'status' | 'dropped' | 'backupKey'>,
  area: string,
): string {
  const keptCopy = `se conservó una copia en ${result.backupKey}.`;
  if (result.status === 'unreadable')
    return `No se pudo leer el progreso ${area} guardado; ${keptCopy}`;
  if (result.dropped === 1)
    return `Se descartó 1 registro ${area} que esta versión no reconoce; ${keptCopy}`;
  if (result.dropped > 1)
    return `Se descartaron ${result.dropped} registros ${area} que esta versión no reconoce; ${keptCopy}`;
  return '';
}
