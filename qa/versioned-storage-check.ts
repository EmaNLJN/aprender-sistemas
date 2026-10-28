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
  await importModule<VersionedStorage>('frontend/src/shared/lib/versioned-storage.ts');

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
function parse(raw: unknown): Parsed<Demo> {
  const value = raw as { version?: unknown; items?: unknown };
  if (value?.version !== 1 || !Array.isArray(value.items)) throw new Error('formato desconocido');
  const items = value.items.filter((item): item is string => typeof item === 'string');
  return { state: { version: 1, items }, dropped: value.items.length - items.length };
}
function parseTrimming(raw: unknown): Parsed<Demo> {
  const { state } = parse(raw);
  const items = state.items.map((item) => item.trim()).filter((item) => item !== '');
  return { state: { version: 1, items }, dropped: 0 };
}
function parseAdding(raw: unknown): Parsed<Demo> {
  const { state } = parse(raw);
  return { state: { ...state, nuevo: true } as Demo, dropped: 0 };
}
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

test('there are five slots: the historical :respaldo and :respaldo-2 to :respaldo-5', () => {
  assert.equal(BACKUP_SLOTS, 5);
  assert.deepEqual(backupKeysFor('taller-demo-v1'), SLOTS);
});

test('missing key: empty, blank state, writable and no writes', () => {
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

test('valid copy: loaded with the parsed state, no loss and no writes', () => {
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

test('invalid JSON: unreadable, blank state and the original text goes to the backup', () => {
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

test('unknown version: unreadable with the original text backed up', () => {
  const original = JSON.stringify({ version: 2, items: ['futuro'] });
  const storage = fakeStorage({ [KEY]: original });
  const result = load(storage);
  assert.equal(result.status, 'unreadable');
  assert.deepEqual(result.state, blank());
  assert.equal(storage.data.get(BACKUP), original);
  assert.equal(storage.data.get(KEY), original);
});

test('discards: loaded with dropped, lossy and the original text backed up', () => {
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

test('a second, different degraded text goes to the next slot and does not overwrite the first', () => {
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

test('the same degraded text loaded twice reuses the same slot', () => {
  const storage = fakeStorage({ [KEY]: text([1]) });
  assert.equal(load(storage).backupKey, BACKUP);
  assert.equal(load(storage).backupKey, BACKUP);
  assert.deepEqual(storage.writes, [BACKUP]);
  assert.equal(storage.data.has(SLOTS[1]), false);
});

test('with the five slots taken by other texts there is no copy and writing is impossible', () => {
  const full = Object.fromEntries(SLOTS.map((slot, index) => [slot, `otro ${index}`]));
  const storage = fakeStorage({ [KEY]: text([1]), ...full });
  const result = load(storage);
  assert.equal(result.status, 'loaded');
  assert.equal(result.backupKey, null);
  assert.equal(result.writable, false);
  assert.deepEqual(storage.writes, []);
});

test('if the backup cannot be written, loading does not throw and there is no copy or write', () => {
  const storage = fakeStorage({ [KEY]: '{roto' }, ['setItem']);
  const result = load(storage);
  assert.equal(result.status, 'unreadable');
  assert.deepEqual(result.state, blank());
  assert.equal(result.backupKey, null);
  assert.equal(result.writable, false);
  assert.equal(storage.data.has(BACKUP), false);
  assert.doesNotMatch(describeLoadResult(result, 'de prueba'), /se conservó una copia/);
});

test('a lossy normalization without discards gives lossy, a copy and a data notice', () => {
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

test('an additive normalization gives no loss, copy or notice', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const result = openVersionedStore(KEY, { blank, parse: parseAdding, storage }).load();
  assert.equal(result.lossy, false);
  assert.equal(result.backupKey, null);
  assert.equal(describeLoadResult(result, 'de prueba'), '');
  assert.deepEqual(storage.writes, []);
});

test('a parse that mutates its input does not hide the loss', () => {
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

test('getItem throws: unavailable, blank state, not writable and no writes', () => {
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

test('without explicit storage it reads globalThis.localStorage; if access throws, unavailable', () => {
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
    assert.equal(blockedStore.remove(), true);
  } finally {
    delete holder.localStorage;
  }
});

test('write on a non-writable store returns saved false and the key does not change', () => {
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

test('in a single tab, removing an item, writing and reloading leaves it removed', () => {
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

test('if another tab changed the key after loading, write merges with merge(stored, local)', () => {
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
  assert.deepEqual(store.write({ version: 1, items: ['local'] }).state.items, ['local']);
});

test('two raw instances on the same storage behave like two tabs: an item one removed comes back when the other saves', () => {
  const storage = fakeStorage({ [KEY]: text(['a', 'b']) });
  const first = openVersionedStore(KEY, options(storage, { merge: union }));
  const second = openVersionedStore(KEY, options(storage, { merge: union }));
  first.load();
  second.load();
  first.write({ version: 1, items: ['a'] });
  assert.equal(storage.data.get(KEY), text(['a']));
  const result = second.write({ version: 1, items: ['a', 'b', 'c'] });
  assert.deepEqual(result.state.items, ['a', 'b', 'c']);
  assert.equal(storage.data.get(KEY), text(['a', 'b', 'c']));
});

test('without merge, the local state wins over an external change', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, { blank, parse, storage });
  store.load();
  storage.data.set(KEY, text(['otra-pestaña']));
  assert.deepEqual(store.write({ version: 1, items: ['local'] }).state.items, ['local']);
});

test('if another tab deleted the key, write saves the local state without merging', () => {
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

test('unreadable text from another tab: write secures a copy and saves the local state', () => {
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

test('readable lossy text from another tab: secures a copy and keeps what is recognized', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  const lossy = text(['reconocido', 42]);
  storage.data.set(KEY, lossy);
  const result = store.write({ version: 1, items: ['local'] });
  assert.equal(result.saved, true);
  assert.deepEqual(result.state.items, ['reconocido', 'local']);
  assert.equal(storage.data.get(BACKUP), lossy);
  assert.equal(storage.data.get(KEY), text(['reconocido', 'local']));
});

test('readable lossy text with no room for the copy: does not write', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  storage.data.set(KEY, text(['reconocido', 42]));
  for (const slot of SLOTS) storage.data.set(slot, 'ocupada ' + slot);
  assert.equal(store.write({ version: 1, items: ['x'] }).saved, false);
  assert.equal(storage.data.get(KEY), text(['reconocido', 42]));
});

test('remove without available storage returns true: nothing to delete', () => {
  const noStorage = (globalThis as { localStorage?: unknown }).localStorage;
  assert.equal(noStorage, undefined);
  assert.equal(openVersionedStore(KEY, { blank, parse, merge: union }).remove(), true);
});

test('if remove could not delete the key, the next write does not merge the old text', () => {
  const data = new Map([[KEY, text(['viejo'])]]);
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => {
      if (key === KEY) throw new Error('cannot delete the main key');
      data.delete(key);
    },
  };
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  assert.equal(store.remove(), false);
  assert.equal(store.write(blank()).saved, true);
  assert.equal(data.get(KEY), text([]));
});

test('unreadable text from another tab with no room for the copy: does not write and blocks the next ones', () => {
  const storage = fakeStorage({ [KEY]: text(['a']) });
  const store = openVersionedStore(KEY, options(storage));
  store.load();
  storage.data.set(KEY, '{roto');
  for (const slot of SLOTS) storage.data.set(slot, 'ocupada ' + slot);
  assert.equal(store.write({ version: 1, items: ['x'] }).saved, false);
  assert.equal(store.write({ version: 1, items: ['y'] }).saved, false);
  assert.equal(storage.data.get(KEY), '{roto');
});

test('hasUnsavedChanges compares the state with the last text read or written', () => {
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

test('remove deletes the key and the five slots', () => {
  const all = Object.fromEntries([KEY, ...SLOTS].map((name) => [name, 'x']));
  const storage = fakeStorage({ ...all, otra: 'c' });
  const store = openVersionedStore(KEY, options(storage));
  assert.equal(store.remove(), true);
  assert.deepEqual([...storage.data.keys()], ['otra']);
});

test('remove returns false if a deletion throws, but tries all the others', () => {
  const removed: string[] = [];
  const data = new Map([
    [KEY, 'a'],
    [SLOTS[2], 'b'],
  ]);
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => {
      if (key === SLOTS[1]) throw new Error('a slot fails');
      removed.push(key);
      data.delete(key);
    },
  };
  assert.equal(openVersionedStore(KEY, options(storage)).remove(), false);
  assert.deepEqual(removed, [KEY, SLOTS[0], SLOTS[2], SLOTS[3], SLOTS[4]]);
  const blocked = fakeStorage({ [KEY]: 'a' }, ['removeItem']);
  assert.equal(openVersionedStore(KEY, options(blocked)).remove(), false);
});

test('remove re-enables writing on a store that was left non-writable', () => {
  const full = Object.fromEntries(SLOTS.map((slot, index) => [slot, `otro ${index}`]));
  const storage = fakeStorage({ [KEY]: text([1]), ...full });
  const store = openVersionedStore(KEY, options(storage));
  assert.equal(store.load().writable, false);
  assert.equal(store.remove(), true);
  assert.equal(store.write({ version: 1, items: ['nuevo'] }).saved, true);
  assert.equal(storage.data.get(KEY), text(['nuevo']));
});

test('backups returns the existing slots in slot order', () => {
  const storage = fakeStorage({ [SLOTS[3]]: 'cuarta', [SLOTS[0]]: 'primera' });
  const store = openVersionedStore(KEY, options(storage));
  assert.deepEqual(store.backups(), [
    { key: SLOTS[0], text: 'primera' },
    { key: SLOTS[3], text: 'cuarta' },
  ]);
});

test('write serializes the state and returns saved false if setItem throws', () => {
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

test('describeLoadResult: all variants, with and without a copy', () => {
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
