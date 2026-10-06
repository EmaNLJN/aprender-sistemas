import { describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import fixture from '../../../../../qa/fixtures/progress-master-2a278ad-storage.json';
import { backupKeysFor, type StorageLike } from '../../../shared/lib/versioned-storage';
import { createExerciseCatalog } from './exercise-catalog';
import { createLabStore, labStore, type LabCatalogLookup } from './lab-store';
import type { Exercise } from './types';

const KEY = 'taller-laboratorio-v1';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  items: Map<string, string>;
} {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

function exercise(id: string, language: 'rust' | 'go'): Exercise {
  return { id, language, tests: [{ id: 't1' }], prediction: { options: ['a', 'b'] } } as never;
}

const miniCatalog: LabCatalogLookup = {
  byId: new Map([
    ['r1', exercise('r1', 'rust')],
    ['r2', exercise('r2', 'rust')],
    ['g1', exercise('g1', 'go')],
  ]),
};

function savedText(records: Record<string, unknown>): string {
  return JSON.stringify({ version: 1, records, selected: { rust: null, go: null } });
}

function openWith(initial: Record<string, string> = {}) {
  const storage = memoryStorage(initial);
  const store = createLabStore();
  store.open(miniCatalog, { storage });
  return { store, storage };
}

describe('a lab store that is not open', () => {
  const operations: [string, (store: ReturnType<typeof createLabStore>) => unknown][] = [
    ['getProgress', (store) => store.getProgress()],
    ['save', (store) => store.save()],
    ['exportState', (store) => store.exportState()],
    ['planImport', (store) => store.planImport({ version: 1, records: {} })],
    ['applyImport', (store) => store.applyImport({ state: {} as never, lossy: false })],
    ['backups', (store) => store.backups()],
    ['reset', (store) => store.reset()],
    ['loadWarning', (store) => store.loadWarning()],
    ['storageAvailable', (store) => store.storageAvailable()],
  ];

  it.each(operations)('refuses %s', (_name, operation) => {
    expect(() => operation(createLabStore())).toThrow(
      'Abrí el almacén del laboratorio antes de usarlo.',
    );
  });

  it('already exposes its changes at revision 0', () => {
    expect(createLabStore().changes.getState()).toEqual({ revision: 0 });
  });

  it('refuses to be opened twice', () => {
    const { store } = openWith();

    expect(() => store.open(miniCatalog, { storage: memoryStorage() })).toThrow(
      'El almacén del laboratorio ya está abierto.',
    );
  });

  it('the exported singleton is not open when it is imported', () => {
    expect(() => labStore.getProgress()).toThrow(
      'Abrí el almacén del laboratorio antes de usarlo.',
    );
  });
});

describe('opening with the master fixture', () => {
  const fixtureText = fixture[KEY as keyof typeof fixture] as string;
  const catalog = createExerciseCatalog({
    rustLab: curriculum.lab.rust as Exercise[],
    rustQuests: curriculum.quests.rust as Exercise[],
    goLab: curriculum.lab.go as Exercise[],
    goQuests: curriculum.quests.go as Exercise[],
    systemsLowlevel: curriculum.cores.lowlevel as Exercise[],
    systemsInfra: curriculum.cores.infra as Exercise[],
    systemsPlay: curriculum.cores.play as Exercise[],
    systemsPc: curriculum.cores.pc as Exercise[],
  });

  function openFixture() {
    const storage = memoryStorage({ [KEY]: fixtureText });
    const setItem = vi.spyOn(storage, 'setItem');
    const store = createLabStore();
    store.open(catalog, { storage });
    return { store, storage, setItem };
  }

  it('reads every record of the fixture', () => {
    const { store } = openFixture();

    const expectedIds = Object.keys(JSON.parse(fixtureText).records).sort();
    expect(Object.keys(store.getProgress().records).sort()).toEqual(expectedIds);
  });

  it('does not write, back up or warn', () => {
    const { store, storage, setItem } = openFixture();

    expect(setItem).not.toHaveBeenCalled();
    expect(store.loadWarning()).toBe('');
    expect(store.backups()).toEqual([]);
    expect(backupKeysFor(KEY).some((slot) => storage.getItem(slot) !== null)).toBe(false);
    expect(store.storageAvailable()).toBe(true);
  });

  it('starts at revision 0', () => {
    expect(openFixture().store.changes.getState()).toEqual({ revision: 0 });
  });
});

describe('the identity of the live state (FR-025)', () => {
  function otherTabWrites(storage: StorageLike): void {
    storage.setItem(KEY, savedText({ r1: { draft: 'old', solvedAt: 5 }, r2: { draft: 'new' } }));
  }

  it('keeps the same state and records when a write merges what another tab saved', () => {
    const { store, storage } = openWith({ [KEY]: savedText({ r1: { draft: 'old' } }) });
    const state = store.getProgress();
    const record = state.records.r1;
    record.draft = 'mine';
    otherTabWrites(storage);

    store.save();

    expect(store.getProgress()).toBe(state);
    expect(store.getProgress().records.r1).toBe(record);
    expect(record).toMatchObject({ draft: 'mine', solvedAt: 5 });
    expect(store.getProgress().records.r2).toMatchObject({ draft: 'new' });
  });

  it('replaces the state on applyImport', () => {
    const { store } = openWith();
    const before = store.getProgress();
    const plan = store.planImport({ version: 1, records: { r1: { draft: 'x' } } });

    store.applyImport(plan);

    expect(store.getProgress()).not.toBe(before);
    expect(store.getProgress()).not.toBe(plan.state);
    expect(store.getProgress().records.r1.draft).toBe('x');
  });

  it('replaces the state on reset', () => {
    const { store } = openWith({ [KEY]: savedText({ r1: { draft: 'x' } }) });
    const before = store.getProgress();

    store.reset();

    expect(store.getProgress()).not.toBe(before);
    expect(store.getProgress()).toEqual({
      version: 1,
      records: {},
      selected: { rust: null, go: null },
    });
  });
});

describe('the revision of the changes', () => {
  it('rises by one on save although the progress is the same object', () => {
    const { store } = openWith();
    const state = store.getProgress();
    const listener = vi.fn();
    store.changes.subscribe(listener);
    state.records.r1 = { draft: 'edited in place' };

    store.save();

    expect(store.getProgress()).toBe(state);
    expect(store.changes.getState()).toEqual({ revision: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toEqual({ revision: 1 });
    expect(listener.mock.calls[0][1]).toEqual({ revision: 0 });
  });

  it('rises even when storage cannot be written, and storageAvailable turns false', () => {
    const { store, storage } = openWith();
    storage.setItem = () => {
      throw new Error('quota');
    };

    const saved = store.save();

    expect(saved).toBe(false);
    expect(store.storageAvailable()).toBe(false);
    expect(store.changes.getState().revision).toBe(1);
  });

  it('rises once on applyImport', () => {
    const { store } = openWith();

    store.applyImport(store.planImport({ version: 1, records: { g1: { draft: 'x' } } }));

    expect(store.changes.getState().revision).toBe(1);
  });

  it('rises once on reset', () => {
    const { store } = openWith({ [KEY]: savedText({ r1: { draft: 'x' } }) });

    store.reset();

    expect(store.changes.getState().revision).toBe(1);
  });

  it('does not rise on reads or on planImport', () => {
    const { store } = openWith();

    store.getProgress();
    store.exportState();
    store.planImport({ version: 1, records: {} });
    store.backups();
    store.loadWarning();
    store.storageAvailable();

    expect(store.changes.getState().revision).toBe(0);
  });

  it('shows the listener what was already written', () => {
    const { store, storage } = openWith();
    let seen: string | null = null;
    store.changes.subscribe(() => {
      seen = storage.getItem(KEY);
    });
    store.getProgress().records.r1 = { draft: 'written' };

    store.save();

    expect(JSON.parse(seen!).records.r1.draft).toBe('written');
  });

  it('leaves the write done when a listener throws', () => {
    const { store, storage } = openWith();
    store.changes.subscribe(() => {
      throw new Error('listener failed');
    });
    store.getProgress().records.r1 = { draft: 'kept' };

    expect(() => store.save()).toThrow('listener failed');

    expect(JSON.parse(storage.getItem(KEY)!).records.r1.draft).toBe('kept');
  });

  it('is not shared between two stores', () => {
    const first = openWith().store;
    const second = openWith().store;

    first.save();

    expect(first.changes.getState().revision).toBe(1);
    expect(second.changes.getState().revision).toBe(0);
  });
});

describe('importing and resetting', () => {
  it('plans an import without touching the state or the storage', () => {
    const { store, storage } = openWith({ [KEY]: savedText({ r1: { draft: 'a', solvedAt: 5 } }) });
    const stored = storage.getItem(KEY);

    const plan = store.planImport({ version: 1, records: { r1: { draft: 'b' } } });

    expect(plan.state.records.r1).toMatchObject({ draft: 'b', solvedAt: 5 });
    expect(plan.lossy).toBe(false);
    expect(store.getProgress().records.r1.draft).toBe('a');
    expect(storage.getItem(KEY)).toBe(stored);
  });

  it('flags an import that lost data as lossy', () => {
    const { store } = openWith();

    const plan = store.planImport({ version: 1, records: { ghost: { draft: 'x' } } });

    expect(plan.lossy).toBe(true);
    expect(plan.state.records).toEqual({});
  });

  it('applies an import by persisting it', () => {
    const { store, storage } = openWith();

    const saved = store.applyImport(
      store.planImport({ version: 1, records: { r2: { draft: 'z' } } }),
    );

    expect(saved).toBe(true);
    expect(JSON.parse(storage.getItem(KEY)!).records.r2.draft).toBe('z');
  });

  it('exports a copy that does not alias the live state', () => {
    const { store } = openWith({ [KEY]: savedText({ r1: { draft: 'a' } }) });

    const exported = store.exportState();
    exported.records.r1.draft = 'changed';

    expect(store.getProgress().records.r1.draft).toBe('a');
  });

  it('resets by removing the saved keys and the notice', () => {
    const { store, storage } = openWith({
      [KEY]: '{not json',
      [backupKeysFor(KEY)[0]]: 'old copy',
    });
    expect(store.loadWarning()).not.toBe('');

    const removed = store.reset();

    expect(removed).toBe(true);
    expect(store.loadWarning()).toBe('');
    expect(store.backups()).toEqual([]);
    expect(JSON.parse(storage.getItem(KEY)!)).toEqual({
      version: 1,
      records: {},
      selected: { rust: null, go: null },
    });
  });

  it('warns about unknown records when it opens and keeps a backup', () => {
    const { store, storage } = openWith({ [KEY]: savedText({ ghost: { draft: 'x' } }) });

    expect(store.loadWarning()).toBe(
      `Se descartó 1 registro del laboratorio que esta versión no reconoce; se conservó una copia en ${backupKeysFor(KEY)[0]}.`,
    );
    expect(storage.getItem(backupKeysFor(KEY)[0])).toBe(savedText({ ghost: { draft: 'x' } }));
  });
});
