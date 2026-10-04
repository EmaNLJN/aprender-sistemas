/* Contrato de src/shared/lib/versioned-storage.ts con un almacenamiento falso.
 * node qa/versioned-storage-check.ts
 * Los esperados están escritos a mano desde el ADR 0003: estados empty/loaded/unreadable/
 * unavailable, cinco ranuras de respaldo antes de perder datos, detección de pérdida por
 * normalización, fusión sólo ante cambios de otra pestaña y la clave principal intacta al cargar.
 */
import assert from 'node:assert/strict';
import { importModule } from './lib/sources.ts';

type StorageStatus = 'empty' | 'loaded' | 'unreadable' | 'unavailable';
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
interface Parsed<T> {
  state: T;
  dropped: number;
}
interface LoadResult<T> {
  status: StorageStatus;
  state: T;
  dropped: number;
  lossy: boolean;
  backupKey: string | null;
  writable: boolean;
}
interface WriteResult<T> {
  saved: boolean;
  state: T;
}
interface BackupEntry {
  key: string;
  text: string;
}
interface StoreOptions<T> {
  blank: () => T;
  parse: (raw: unknown) => Parsed<T>;
  merge?: (stored: T, local: T) => T;
  storage?: StorageLike;
}
interface VersionedStore<T> {
  load(): LoadResult<T>;
  write(state: T): WriteResult<T>;
  hasUnsavedChanges(state: T): boolean;
  remove(): boolean;
  backups(): BackupEntry[];
}
interface VersionedStorage {
  BACKUP_SLOTS: number;
  backupKeysFor(key: string): string[];
  openVersionedStore<T>(key: string, options: StoreOptions<T>): VersionedStore<T>;
  describeLoadResult(
    result: Pick<LoadResult<unknown>, 'status' | 'dropped' | 'lossy' | 'backupKey'>,
    area: string,
  ): string;
}

const { BACKUP_SLOTS, backupKeysFor, openVersionedStore, describeLoadResult } =
  await importModule<VersionedStorage>('src/shared/lib/versioned-storage.ts');

const KEY = 'taller-demo-v1';
const BACKUP = 'taller-demo-v1:respaldo';
const SLOTS = [BACKUP, ...[2, 3, 4, 5].map((n) => `${BACKUP}-${n}`)];

interface FakeStorage extends StorageLike {
  data: Map<string, string>;
  writes: string[];
}
function fakeStorage(initial: Record<string, string> = {}, failing: string[] = []): FakeStorage {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  const guard = (operation: string): void => {
    if (failing.includes(operation)) throw new Error('almacenamiento bloqueado: ' + operation);
  };
  return {
    data,
    writes,
    getItem: (key) => (guard('getItem'), data.get(key) ?? null),
    setItem: (key, value) => {
      guard('setItem');
      writes.push(key);
      data.set(key, value);
    },
    removeItem: (key) => {
      guard('removeItem');
      data.delete(key);
    },
  };
}

interface Demo {
  version: number;
  items: string[];
}
const blank = (): Demo => ({ version: 1, items: [] });
// Parser de prueba: exige version 1 y descarta los elementos que no son texto.
function parse(raw: unknown): Parsed<Demo> {
  const value = raw as { version?: unknown; items?: unknown };
  if (value?.version !== 1 || !Array.isArray(value.items)) throw new Error('formato desconocido');
  const items = value.items.filter((item): item is string => typeof item === 'string');
  return { state: { version: 1, items }, dropped: value.items.length - items.length };
}
// Pérdida sin registros descartados: recorta cada texto y quita los vacíos sin contarlos.
function parseTrimming(raw: unknown): Parsed<Demo> {
  const { state } = parse(raw);
  const items = state.items.map((item) => item.trim()).filter((item) => item !== '');
  return { state: { version: 1, items }, dropped: 0 };
}
// Normalización aditiva: agrega una clave nueva sin tocar lo existente.
function parseAdding(raw: unknown): Parsed<Demo> {
  const { state } = parse(raw);
  return { state: { ...state, nuevo: true } as Demo, dropped: 0 };
}
// Unión de conjuntos, conservando el orden: lo guardado primero y luego lo local nuevo.
const union = (stored: Demo, local: Demo): Demo => ({
  version: 1,
  items: [...new Set([...stored.items, ...local.items])],
});
const options = (storage: StorageLike, extra: Partial<StoreOptions<Demo>> = {}) => ({
  blank,
  parse,
  merge: union,
  storage,
  ...extra,
});
const load = (storage: StorageLike): LoadResult<Demo> =>
  openVersionedStore(KEY, { blank, parse, storage }).load();
const text = (items: unknown[]): string => JSON.stringify({ version: 1, items });

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

test('hay cinco ranuras: la histórica :respaldo y de :respaldo-2 a :respaldo-5', () => {
  assert.equal(BACKUP_SLOTS, 5);
  assert.deepEqual(backupKeysFor('taller-demo-v1'), SLOTS);
});

test('clave ausente: empty, estado en blanco, escribible y ninguna escritura', () => {
  const storage = fakeStorage();
  assert.deepEqual(load(storage), {
    status: 'empty',
    state: blank(),
    dropped: 0,
    lossy: false,
    backupKey: null,
    writable: true,
  });
  assert.deepEqual(storage.writes, []);
});

test('copia válida: loaded con el estado parseado, sin pérdida y sin escrituras', () => {
  const original = text(['a', 'b']);
  const storage = fakeStorage({ [KEY]: original });
  assert.deepEqual(load(storage), {
    status: 'loaded',
    state: { version: 1, items: ['a', 'b'] },
    dropped: 0,
    lossy: false,
    backupKey: null,
    writable: true,
  });
  assert.deepEqual(storage.writes, []);
  assert.equal(storage.data.has(BACKUP), false);
});

test('JSON inválido: unreadable, estado en blanco y el texto original queda en el respaldo', () => {
  const storage = fakeStorage({ [KEY]: '{roto' });
  const result = load(storage);
  assert.equal(result.status, 'unreadable');
  assert.deepEqual(result.state, blank());
  assert.equal(result.backupKey, BACKUP);
  assert.equal(result.writable, true);
  assert.equal(storage.data.get(BACKUP), '{roto');
  assert.equal(storage.data.get(KEY), '{roto');
  assert.deepEqual(storage.writes, [BACKUP]);
});

test('versión desconocida: unreadable con el texto original respaldado', () => {
  const original = JSON.stringify({ version: 2, items: ['futuro'] });
  const storage = fakeStorage({ [KEY]: original });
  const result = load(storage);
  assert.equal(result.status, 'unreadable');
  assert.deepEqual(result.state, blank());
  assert.equal(storage.data.get(BACKUP), original);
  assert.equal(storage.data.get(KEY), original);
});

test('descartes: loaded con dropped, lossy y el texto original respaldado', () => {
  const original = text(['a', 7, 'b', null]);
  const storage = fakeStorage({ [KEY]: original });
  assert.deepEqual(load(storage), {
    status: 'loaded',
    state: { version: 1, items: ['a', 'b'] },
    dropped: 2,
    lossy: true,
    backupKey: BACKUP,
    writable: true,
  });
  assert.equal(storage.data.get(BACKUP), original);
  assert.deepEqual(storage.writes, [BACKUP]);
});

test('un segundo texto degradado distinto va a la ranura siguiente y no pisa la primera', () => {
  const first = text([1]);
  const second = text([2]);
  const storage = fakeStorage({ [KEY]: second, [BACKUP]: first });
  const result = load(storage);
  assert.equal(result.backupKey, SLOTS[1]);
  assert.equal(storage.data.get(BACKUP), first);
  assert.equal(storage.data.get(SLOTS[1]), second);
  assert.equal(
    describeLoadResult(result, 'de prueba'),
    `Se descartó 1 registro de prueba que esta versión no reconoce; se conservó una copia en ${SLOTS[1]}.`,
  );
  const unreadable = fakeStorage({ [KEY]: '{roto', [BACKUP]: first });
  assert.equal(load(unreadable).backupKey, SLOTS[1]);
  assert.equal(unreadable.data.get(BACKUP), first);
});

test('el mismo texto degradado cargado dos veces reutiliza la misma ranura', () => {
  const storage = fakeStorage({ [KEY]: text([1]) });
  assert.equal(load(storage).backupKey, BACKUP);
  assert.equal(load(storage).backupKey, BACKUP);
  assert.deepEqual(storage.writes, [BACKUP]);
  assert.equal(storage.data.has(SLOTS[1]), false);
});

test('con las cinco ranuras ocupadas por otros textos no hay copia y no se puede escribir', () => {
  const full = Object.fromEntries(SLOTS.map((slot, index) => [slot, `otro ${index}`]));
  const storage = fakeStorage({ [KEY]: text([1]), ...full });
  const result = load(storage);
  assert.equal(result.status, 'loaded');
  assert.equal(result.backupKey, null);
  assert.equal(result.writable, false);
  assert.deepEqual(storage.writes, []);
});

test('si el respaldo no se puede escribir, la carga no lanza, no hay copia ni escritura', () => {
  const storage = fakeStorage({ [KEY]: '{roto' }, ['setItem']);
  const result = load(storage);
  assert.equal(result.status, 'unreadable');
  assert.deepEqual(result.state, blank());
  assert.equal(result.backupKey, null);
  assert.equal(result.writable, false);
  assert.equal(storage.data.has(BACKUP), false);
  assert.doesNotMatch(describeLoadResult(result, 'de prueba'), /se conservó una copia/);
});

test('una normalización con pérdida y sin descartes da lossy, copia y aviso de datos', () => {
  const original = text([' a ', '  ', 'b']);
  const storage = fakeStorage({ [KEY]: original });
  const result = openVersionedStore(KEY, { blank, parse: parseTrimming, storage }).load();
  assert.equal(result.dropped, 0);
  assert.equal(result.lossy, true);
  assert.equal(result.backupKey, BACKUP);
  assert.equal(storage.data.get(BACKUP), original);
  assert.equal(
    describeLoadResult(result, 'de prueba'),
    'Se descartaron datos de prueba que esta versión no reconoce; se conservó una copia en taller-demo-v1:respaldo.',
  );
});

test('una normalización aditiva no da pérdida, copia ni aviso', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const result = openVersionedStore(KEY, { blank, parse: parseAdding, storage }).load();
  assert.equal(result.lossy, false);
  assert.equal(result.backupKey, null);
  assert.equal(describeLoadResult(result, 'de prueba'), '');
  assert.deepEqual(storage.writes, []);
});

test('un parse que muta su entrada no oculta la pérdida', () => {
  const mutating = (raw: unknown): Parsed<Demo> => {
    const value = raw as Demo;
    value.items.pop();
    return { state: value, dropped: 0 };
  };
  const storage = fakeStorage({ [KEY]: text(['a', 'b']) });
  const result = openVersionedStore(KEY, { blank, parse: mutating, storage }).load();
  assert.equal(result.lossy, true);
  assert.equal(result.backupKey, BACKUP);
});

test('getItem lanza: unavailable, estado en blanco, no escribible y ninguna escritura', () => {
  const storage = fakeStorage({ [KEY]: '{}' }, ['getItem']);
  assert.deepEqual(load(storage), {
    status: 'unavailable',
    state: blank(),
    dropped: 0,
    lossy: false,
    backupKey: null,
    writable: false,
  });
  assert.deepEqual(storage.writes, []);
});

test('sin storage explícito lee globalThis.localStorage; si el acceso lanza, unavailable', () => {
  const holder = globalThis as { localStorage?: unknown };
  const stored = fakeStorage({ [KEY]: text(['g']) });
  Object.defineProperty(globalThis, 'localStorage', { value: stored, configurable: true });
  try {
    const result = openVersionedStore(KEY, { blank, parse }).load();
    assert.equal(result.status, 'loaded');
    assert.deepEqual(result.state, { version: 1, items: ['g'] });
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('acceso bloqueado');
      },
      configurable: true,
    });
    const blockedStore = openVersionedStore(KEY, { blank, parse });
    const blocked = blockedStore.load();
    assert.equal(blocked.status, 'unavailable');
    assert.equal(blocked.writable, false);
    assert.deepEqual(blockedStore.write(blank()), { saved: false, state: blank() });
    assert.equal(blockedStore.remove(), false);
  } finally {
    delete holder.localStorage;
  }
});

test('write en un almacén no escribible devuelve saved false y la clave no cambia', () => {
  const full = Object.fromEntries(SLOTS.map((slot, index) => [slot, `otro ${index}`]));
  const original = text([1]);
  const storage = fakeStorage({ [KEY]: original, ...full });
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  const local = { version: 1, items: ['x'] };
  assert.deepEqual(store.write(local), { saved: false, state: local });
  assert.equal(storage.data.get(KEY), original);
  assert.deepEqual(storage.writes, []);
});

test('en una sola pestaña, quitar un ítem, escribir y recargar lo deja quitado', () => {
  const storage = fakeStorage({ [KEY]: text(['a', 'b']) });
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  assert.deepEqual(store.write({ version: 1, items: ['a'] }), {
    saved: true,
    state: { version: 1, items: ['a'] },
  });
  assert.deepEqual(store.write({ version: 1, items: [] }).state.items, []);
  assert.deepEqual(openVersionedStore(KEY, options(storage)).load().state.items, []);
  assert.equal(storage.data.get(KEY), '{"version":1,"items":[]}');
});

test('si otra pestaña cambió la clave tras cargar, write fusiona con merge(stored, local)', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  storage.data.set(KEY, text(['a', 'otra-pestaña']));
  const result = store.write({ version: 1, items: ['a', 'local'] });
  assert.deepEqual(result, {
    saved: true,
    state: { version: 1, items: ['a', 'otra-pestaña', 'local'] },
  });
  assert.equal(storage.data.get(KEY), text(['a', 'otra-pestaña', 'local']));
  // Tras escribir, lastText ya es el texto propio: la siguiente escritura no fusiona.
  assert.deepEqual(store.write({ version: 1, items: ['local'] }).state.items, ['local']);
});

test('sin merge, ante un cambio externo gana el estado local', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, { blank, parse, storage });
  store.load();
  storage.data.set(KEY, text(['otra-pestaña']));
  assert.deepEqual(store.write({ version: 1, items: ['local'] }).state.items, ['local']);
});

test('si otra pestaña borró la clave, write escribe el estado local sin fusionar', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  storage.data.delete(KEY);
  assert.deepEqual(store.write({ version: 1, items: ['local'] }), {
    saved: true,
    state: { version: 1, items: ['local'] },
  });
  assert.equal(storage.data.get(KEY), text(['local']));
});

test('texto ilegible de otra pestaña: write asegura una copia y escribe el estado local', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  storage.data.set(KEY, '{roto');
  const result = store.write({ version: 1, items: ['local'] });
  assert.equal(result.saved, true);
  assert.deepEqual(result.state.items, ['local']);
  assert.equal(storage.data.get(BACKUP), '{roto');
  assert.equal(storage.data.get(KEY), text(['local']));
});

test('texto ilegible de otra pestaña sin lugar para la copia: no escribe y bloquea las siguientes', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  storage.data.set(KEY, '{roto');
  for (const slot of SLOTS) storage.data.set(slot, 'ocupada ' + slot);
  assert.equal(store.write({ version: 1, items: ['x'] }).saved, false);
  assert.equal(store.write({ version: 1, items: ['y'] }).saved, false);
  assert.equal(storage.data.get(KEY), '{roto');
});

test('hasUnsavedChanges compara el estado con el último texto leído o escrito', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, options(storage));
  const loaded = store.load().state;
  assert.equal(store.hasUnsavedChanges(loaded), false);
  assert.equal(store.hasUnsavedChanges({ version: 1, items: ['a', 'b'] }), true);
  store.write({ version: 1, items: ['a', 'b'] });
  assert.equal(store.hasUnsavedChanges({ version: 1, items: ['a', 'b'] }), false);
  const empty = openVersionedStore(KEY + '-otra', options(fakeStorage()));
  empty.load();
  assert.equal(empty.hasUnsavedChanges(blank()), true);
});

test('remove borra la clave y las cinco ranuras', () => {
  const all = Object.fromEntries([KEY, ...SLOTS].map((name) => [name, 'x']));
  const storage = fakeStorage({ ...all, otra: 'c' });
  const store = openVersionedStore(KEY, options(storage));
  assert.equal(store.remove(), true);
  assert.deepEqual([...storage.data.keys()], ['otra']);
});

test('remove devuelve false si una borrada lanza, pero intenta todas las demás', () => {
  const removed: string[] = [];
  const data = new Map([
    [KEY, 'a'],
    [SLOTS[2], 'b'],
  ]);
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => {
      if (key === SLOTS[1]) throw new Error('falla una ranura');
      removed.push(key);
      data.delete(key);
    },
  };
  assert.equal(openVersionedStore(KEY, options(storage)).remove(), false);
  assert.deepEqual(removed, [KEY, SLOTS[0], SLOTS[2], SLOTS[3], SLOTS[4]]);
  const blocked = fakeStorage({ [KEY]: 'a' }, ['removeItem']);
  assert.equal(openVersionedStore(KEY, options(blocked)).remove(), false);
});

test('remove vuelve a habilitar la escritura de un almacén que quedó no escribible', () => {
  const full = Object.fromEntries(SLOTS.map((slot, index) => [slot, `otro ${index}`]));
  const storage = fakeStorage({ [KEY]: text([1]), ...full });
  const store = openVersionedStore(KEY, options(storage));
  assert.equal(store.load().writable, false);
  assert.equal(store.remove(), true);
  assert.equal(store.write({ version: 1, items: ['nuevo'] }).saved, true);
  assert.equal(storage.data.get(KEY), text(['nuevo']));
});

test('backups devuelve las ranuras existentes en orden de ranura', () => {
  const storage = fakeStorage({ [SLOTS[3]]: 'cuarta', [SLOTS[0]]: 'primera' });
  const store = openVersionedStore(KEY, options(storage));
  assert.deepEqual(store.backups(), [
    { key: SLOTS[0], text: 'primera' },
    { key: SLOTS[3], text: 'cuarta' },
  ]);
});

test('write serializa el estado y devuelve saved false si setItem lanza', () => {
  const storage = fakeStorage();
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  assert.deepEqual(store.write({ version: 1, items: ['x'] }), {
    saved: true,
    state: { version: 1, items: ['x'] },
  });
  assert.equal(storage.data.get(KEY), '{"version":1,"items":["x"]}');
  const blocked = openVersionedStore(KEY, options(fakeStorage({}, ['setItem'])));
  blocked.load();
  assert.deepEqual(blocked.write(blank()), { saved: false, state: blank() });
});

test('describeLoadResult: todas las variantes, con y sin copia', () => {
  const area = 'de campaña';
  const kept = 'se conservó una copia en taller-demo-v1:respaldo-2.';
  const notKept =
    'no se pudo guardar una copia, así que esta sesión no guardará cambios de esa sección.';
  const describe = (
    status: StorageStatus,
    dropped: number,
    lossy: boolean,
    backupKey: string | null,
  ) => describeLoadResult({ status, dropped, lossy, backupKey }, area);
  const withKey = 'taller-demo-v1:respaldo-2';
  assert.equal(
    describe('unreadable', 0, false, withKey),
    `No se pudo leer el progreso de campaña guardado; ${kept}`,
  );
  assert.equal(
    describe('unreadable', 0, false, null),
    `No se pudo leer el progreso de campaña guardado; ${notKept}`,
  );
  assert.equal(
    describe('loaded', 1, true, withKey),
    `Se descartó 1 registro de campaña que esta versión no reconoce; ${kept}`,
  );
  assert.equal(
    describe('loaded', 1, true, null),
    `Se descartó 1 registro de campaña que esta versión no reconoce; ${notKept}`,
  );
  assert.equal(
    describe('loaded', 2, true, withKey),
    `Se descartaron 2 registros de campaña que esta versión no reconoce; ${kept}`,
  );
  assert.equal(
    describe('loaded', 3, true, null),
    `Se descartaron 3 registros de campaña que esta versión no reconoce; ${notKept}`,
  );
  assert.equal(
    describe('loaded', 0, true, withKey),
    `Se descartaron datos de campaña que esta versión no reconoce; ${kept}`,
  );
  assert.equal(
    describe('loaded', 0, true, null),
    `Se descartaron datos de campaña que esta versión no reconoce; ${notKept}`,
  );
  for (const status of ['empty', 'loaded', 'unavailable'] as const)
    assert.equal(describe(status, 0, false, null), '');
  assert.equal(describe('unavailable', 0, false, null), '');
});

console.log(passed + ' versioned-storage scenarios PASS.');
