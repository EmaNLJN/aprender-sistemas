/* Contrato de src/shared/lib/versioned-storage.ts con un almacenamiento falso.
 * node qa/versioned-storage-check.ts
 * Los esperados están escritos a mano desde el ADR 0003 (puntos 1 a 3): estados
 * empty/loaded/unreadable/unavailable, respaldo antes de perder datos y nunca se
 * escribe la clave principal al cargar.
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
  backupKey: string;
}
interface VersionedStorage {
  backupKeyFor(key: string): string;
  loadVersionedState<T>(
    key: string,
    options: { blank: () => T; parse: (raw: unknown) => Parsed<T>; storage?: StorageLike },
  ): LoadResult<T>;
  writeVersionedState(key: string, value: unknown, storage?: StorageLike): boolean;
  removeVersionedState(key: string, storage?: StorageLike): void;
  describeLoadResult(
    result: Pick<LoadResult<unknown>, 'status' | 'dropped' | 'backupKey'>,
    area: string,
  ): string;
}

const {
  backupKeyFor,
  loadVersionedState,
  writeVersionedState,
  removeVersionedState,
  describeLoadResult,
} = await importModule<VersionedStorage>('src/shared/lib/versioned-storage.ts');

const KEY = 'taller-demo-v1';
const BACKUP = 'taller-demo-v1:respaldo';

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
const load = (storage: StorageLike): LoadResult<Demo> =>
  loadVersionedState(KEY, { blank, parse, storage });

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log('PASS ' + name);
}

test('la clave de respaldo es la clave principal más :respaldo', () => {
  assert.equal(backupKeyFor('taller-demo-v1'), 'taller-demo-v1:respaldo');
});

test('clave ausente: empty, estado en blanco y ninguna escritura', () => {
  const storage = fakeStorage();
  const result = load(storage);
  assert.deepEqual(result, { status: 'empty', state: blank(), dropped: 0, backupKey: BACKUP });
  assert.deepEqual(storage.writes, []);
});

test('copia válida: loaded con el estado parseado y sin escrituras', () => {
  const text = JSON.stringify({ version: 1, items: ['a', 'b'] });
  const storage = fakeStorage({ [KEY]: text });
  const result = load(storage);
  assert.deepEqual(result, {
    status: 'loaded',
    state: { version: 1, items: ['a', 'b'] },
    dropped: 0,
    backupKey: BACKUP,
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
  assert.equal(storage.data.get(BACKUP), '{roto');
  assert.equal(storage.data.get(KEY), '{roto');
  assert.deepEqual(storage.writes, [BACKUP]);
});

test('versión desconocida: unreadable con el texto original respaldado', () => {
  const text = JSON.stringify({ version: 2, items: ['futuro'] });
  const storage = fakeStorage({ [KEY]: text });
  const result = load(storage);
  assert.equal(result.status, 'unreadable');
  assert.deepEqual(result.state, blank());
  assert.equal(storage.data.get(BACKUP), text);
  assert.equal(storage.data.get(KEY), text);
});

test('descartes: loaded con dropped y el texto original respaldado', () => {
  const text = JSON.stringify({ version: 1, items: ['a', 7, 'b', null] });
  const storage = fakeStorage({ [KEY]: text });
  const result = load(storage);
  assert.deepEqual(result, {
    status: 'loaded',
    state: { version: 1, items: ['a', 'b'] },
    dropped: 2,
    backupKey: BACKUP,
  });
  assert.equal(storage.data.get(BACKUP), text);
  assert.deepEqual(storage.writes, [BACKUP]);
});

test('el respaldo nunca pisa uno existente, ni al descartar ni con copia ilegible', () => {
  const dropping = fakeStorage({
    [KEY]: JSON.stringify({ version: 1, items: [1] }),
    [BACKUP]: 'respaldo previo',
  });
  assert.equal(load(dropping).status, 'loaded');
  assert.equal(dropping.data.get(BACKUP), 'respaldo previo');
  assert.deepEqual(dropping.writes, []);
  const unreadable = fakeStorage({ [KEY]: '{roto', [BACKUP]: 'respaldo previo' });
  assert.equal(load(unreadable).status, 'unreadable');
  assert.equal(unreadable.data.get(BACKUP), 'respaldo previo');
  assert.deepEqual(unreadable.writes, []);
});

test('getItem lanza: unavailable, estado en blanco y ninguna escritura', () => {
  const storage = fakeStorage({ [KEY]: '{}' }, ['getItem']);
  const result = load(storage);
  assert.deepEqual(result, {
    status: 'unavailable',
    state: blank(),
    dropped: 0,
    backupKey: BACKUP,
  });
  assert.deepEqual(storage.writes, []);
});

test('si el respaldo no se puede escribir, la carga no lanza y sigue unreadable', () => {
  const storage = fakeStorage({ [KEY]: '{roto' }, ['setItem']);
  const result = load(storage);
  assert.equal(result.status, 'unreadable');
  assert.deepEqual(result.state, blank());
  assert.equal(storage.data.has(BACKUP), false);
});

test('sin storage explícito lee globalThis.localStorage; si el acceso lanza, unavailable', () => {
  const holder = globalThis as { localStorage?: unknown };
  const stored = fakeStorage({ [KEY]: JSON.stringify({ version: 1, items: ['g'] }) });
  Object.defineProperty(globalThis, 'localStorage', { value: stored, configurable: true });
  try {
    const result = loadVersionedState(KEY, { blank, parse });
    assert.equal(result.status, 'loaded');
    assert.deepEqual(result.state, { version: 1, items: ['g'] });
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('acceso bloqueado');
      },
      configurable: true,
    });
    assert.equal(loadVersionedState(KEY, { blank, parse }).status, 'unavailable');
    assert.equal(writeVersionedState(KEY, blank()), false);
    assert.doesNotThrow(() => removeVersionedState(KEY));
  } finally {
    delete holder.localStorage;
  }
});

test('writeVersionedState serializa el valor y devuelve false si no pudo escribir', () => {
  const storage = fakeStorage();
  assert.equal(writeVersionedState(KEY, { version: 1, items: ['x'] }, storage), true);
  assert.equal(storage.data.get(KEY), '{"version":1,"items":["x"]}');
  const blocked = fakeStorage({}, ['setItem']);
  assert.equal(writeVersionedState(KEY, blank(), blocked), false);
});

test('removeVersionedState borra la clave y su respaldo, y tolera un almacenamiento bloqueado', () => {
  const storage = fakeStorage({ [KEY]: 'a', [BACKUP]: 'b', otra: 'c' });
  removeVersionedState(KEY, storage);
  assert.deepEqual([...storage.data.keys()], ['otra']);
  const blocked = fakeStorage({ [KEY]: 'a' }, ['removeItem']);
  assert.doesNotThrow(() => removeVersionedState(KEY, blocked));
});

test('describeLoadResult: avisos de ilegible, singular y plural; sin aviso en los demás casos', () => {
  const backupKey = BACKUP;
  assert.equal(
    describeLoadResult({ status: 'unreadable', dropped: 0, backupKey }, 'de campaña'),
    'No se pudo leer el progreso de campaña guardado; se conservó una copia en taller-demo-v1:respaldo.',
  );
  assert.equal(
    describeLoadResult({ status: 'loaded', dropped: 1, backupKey }, 'del laboratorio'),
    'Se descartó 1 registro del laboratorio que esta versión no reconoce; se conservó una copia en taller-demo-v1:respaldo.',
  );
  assert.equal(
    describeLoadResult({ status: 'loaded', dropped: 2, backupKey }, 'de Sistemas'),
    'Se descartaron 2 registros de Sistemas que esta versión no reconoce; se conservó una copia en taller-demo-v1:respaldo.',
  );
  for (const status of ['empty', 'loaded', 'unavailable'] as const)
    assert.equal(describeLoadResult({ status, dropped: 0, backupKey }, 'del recorrido'), '');
});

console.log(passed + ' versioned-storage scenarios PASS.');
