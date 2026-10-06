import { describe, expect, it } from 'vitest';
import masterStorage from '../../../../../qa/fixtures/progress-master-2a278ad-storage.json';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { buildGuide } from './guide-fixture';
import type { RouteProgressV1 } from './route-progress';
import { createRouteStore } from './route-store';

const KEY = 'taller-learning-v1';
const guide = buildGuide();

interface RecordingStorage extends StorageLike {
  items: Map<string, string>;
  writes: string[];
}

function memoryStorage(initial: Record<string, string> = {}): RecordingStorage {
  const items = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    items,
    writes,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(key);
      items.set(key, value);
    },
    removeItem: (key) => void items.delete(key),
  };
}

function savedRoute(overrides: Partial<RouteProgressV1> = {}): string {
  return JSON.stringify({
    version: 1,
    language: 'rust',
    completed: [],
    milestones: [],
    favorites: [],
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
    ...overrides,
  });
}

function openStore(storage: StorageLike) {
  const store = createRouteStore();
  store.open(guide, { storage });
  return store;
}

function storedRoute(storage: RecordingStorage): RouteProgressV1 {
  return JSON.parse(storage.items.get(KEY)!) as RouteProgressV1;
}

describe('opening the route store', () => {
  it('throws when used before it is opened', () => {
    const store = createRouteStore();
    const message = 'Abrí el almacén del recorrido antes de usarlo.';
    expect(() => store.getProgress()).toThrow(message);
    expect(() => store.save()).toThrow(message);
    expect(() => store.reset()).toThrow(message);
    expect(() => store.backups()).toThrow(message);
  });

  it('throws when it is opened twice', () => {
    const store = openStore(memoryStorage());
    expect(() => store.open(guide)).toThrow('El almacén del recorrido ya está abierto.');
  });

  it('opens the master fixture without writing and with the saved progress', () => {
    const storage = memoryStorage({ [KEY]: masterStorage[KEY] });
    const store = openStore(storage);
    expect(store.loadWarning()).toBe('');
    expect(store.storageAvailable()).toBe(true);
    expect(storage.writes).toEqual([]);
    expect(store.backups()).toEqual([]);
    const progress = store.getProgress();
    expect(progress.completed).toEqual(['rust-first-session', 'rust-ownership']);
    expect(progress.favorites).toEqual(['rust-100']);
    expect(progress.language).toBe('go');
  });

  it('warns about the data it dropped and keeps a backup', () => {
    const storage = memoryStorage({ [KEY]: savedRoute({ favorites: ['ghost-resource'] }) });
    const store = openStore(storage);
    expect(store.loadWarning()).toBe(
      'Se descartó 1 registro del recorrido que esta versión no reconoce; se conservó una copia en taller-learning-v1:respaldo.',
    );
    expect(store.backups().map((entry) => entry.key)).toEqual([`${KEY}:respaldo`]);
  });

  it('reports unavailable storage with its own notice', () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const store = openStore(blocked);
    expect(store.storageAvailable()).toBe(false);
    expect(store.loadWarning()).toBe(
      'No se pudo leer o guardar el avance. Podés exportarlo al terminar.',
    );
  });
});

describe('the revision of the route store', () => {
  it('starts at 0 and opening does not notify', () => {
    const fresh = createRouteStore();
    expect(fresh.changes.getState()).toEqual({ revision: 0 });
    const seen: number[] = [];
    fresh.changes.subscribe((state) => seen.push(state.revision));
    fresh.open(guide, { storage: memoryStorage() });
    expect(fresh.changes.getState()).toEqual({ revision: 0 });
    expect(seen).toEqual([]);
  });

  it('rises by one per save, even when the storage cannot write', () => {
    const storage = memoryStorage();
    const store = openStore(storage);
    store.save();
    expect(store.changes.getState().revision).toBe(1);

    storage.setItem = () => {
      throw new Error('quota');
    };
    expect(store.save()).toBe(false);
    expect(store.storageAvailable()).toBe(false);
    expect(store.changes.getState().revision).toBe(2);
  });

  it('rises by one on applyImport and the state is the imported one', () => {
    const storage = memoryStorage();
    const store = openStore(storage);
    const imported = JSON.parse(savedRoute({ favorites: ['go-tour'], minutes: 45 }));
    expect(store.applyImport({ state: imported, lossy: false })).toBe(true);
    expect(store.changes.getState().revision).toBe(1);
    expect(store.getProgress().minutes).toBe(45);
    expect(storedRoute(storage).favorites).toEqual(['go-tour']);
  });

  it('rises by one on reset, which blanks the state and removes every key', () => {
    const storage = memoryStorage({ [KEY]: savedRoute({ favorites: ['ghost-resource'] }) });
    const store = openStore(storage);
    store.getProgress().completed.push('rust-ownership');
    expect(store.reset()).toBe(true);
    expect(store.changes.getState().revision).toBe(1);
    expect(store.getProgress().completed).toEqual([]);
    expect(store.loadWarning()).toBe('');
    expect([...storage.items.keys()]).toEqual([]);
  });

  it('does not rise on reads', () => {
    const store = openStore(memoryStorage());
    store.getProgress();
    store.backups();
    store.loadWarning();
    store.storageAvailable();
    expect(store.changes.getState().revision).toBe(0);
  });

  it('hands the listener the new and the previous state, after the write', () => {
    const storage = memoryStorage();
    const store = openStore(storage);
    const calls: { revision: number; previous: number; stored: string[] }[] = [];
    store.changes.subscribe((state, previous) =>
      calls.push({
        revision: state.revision,
        previous: previous.revision,
        stored: storedRoute(storage).favorites,
      }),
    );
    store.getProgress().favorites.push('go-tour');
    store.save();
    expect(calls).toEqual([{ revision: 1, previous: 0, stored: ['go-tour'] }]);
  });

  it('keeps the write when a listener throws', () => {
    const storage = memoryStorage();
    const store = openStore(storage);
    store.changes.subscribe(() => {
      throw new Error('listener failed');
    });
    store.getProgress().favorites.push('rust-100');
    expect(() => store.save()).toThrow('listener failed');
    expect(storedRoute(storage).favorites).toEqual(['rust-100']);
  });

  it('stops calling a listener after it unsubscribes', () => {
    const store = openStore(memoryStorage());
    let calls = 0;
    const stop = store.changes.subscribe(() => calls++);
    store.save();
    stop();
    store.save();
    expect(calls).toBe(1);
  });

  it('is not shared between two stores', () => {
    const first = openStore(memoryStorage());
    const second = openStore(memoryStorage());
    first.save();
    expect(second.changes.getState().revision).toBe(0);
  });
});

describe('two consumers of one route store', () => {
  it('share the state, so a removed favorite does not come back', () => {
    const storage = memoryStorage({
      [KEY]: savedRoute({ favorites: ['rust-100', 'go-tour'] }),
    });
    const store = openStore(storage);
    const page = store;
    const shell = store;

    page.getProgress().favorites = ['go-tour'];
    page.getProgress().completed.push('rust-ownership');
    page.save();
    shell.getProgress().notes.rust.learned = 'una nota';
    shell.save();

    const stored = storedRoute(storage);
    expect(stored.favorites).toEqual(['go-tour']);
    expect(stored.completed).toEqual(['rust-ownership']);
    expect(stored.notes.rust.learned).toBe('una nota');
  });
});

describe('merging with another tab', () => {
  it('keeps the local language and minutes, adds what the other tab saved and notifies once', () => {
    const storage = memoryStorage({ [KEY]: savedRoute() });
    const store = openStore(storage);
    const before = store.getProgress();
    before.language = 'go';
    before.minutes = 45;
    storage.items.set(KEY, savedRoute({ completed: ['rust-ownership'], minutes: 15 }));

    expect(store.save()).toBe(true);

    const merged = store.getProgress();
    expect(merged).not.toBe(before);
    expect(merged.language).toBe('go');
    expect(merged.minutes).toBe(45);
    expect(merged.completed).toEqual(['rust-ownership']);
    expect(storedRoute(storage).completed).toEqual(['rust-ownership']);
    expect(store.changes.getState().revision).toBe(1);
  });
});
