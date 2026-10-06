import { describe, expect, it } from 'vitest';
import { openVersionedStore, type StorageLike } from '../../../shared/lib/versioned-storage';
import { mergeRouteProgress, type RouteProgressV1 } from './route-progress';

const KEY = 'taller-learning-v1';

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

function route(overrides: Partial<RouteProgressV1> = {}): RouteProgressV1 {
  return {
    version: 1,
    language: 'rust',
    completed: [],
    milestones: [],
    favorites: [],
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
    ...overrides,
  };
}

// The options app.js passes to openVersionedStore. `parseProgress` and `mergeStoredRoute` live inside
// app.js and cannot be imported without changing production: the parse is the spec's own and the
// merge is a copy of `mergeStoredRoute`, over the real `mergeRouteProgress`.
function openRouteStore(storage: StorageLike) {
  return openVersionedStore<RouteProgressV1>(KEY, {
    storage,
    blank: () => route(),
    parse: (raw) => ({ state: raw as RouteProgressV1, dropped: 0 }),
    merge: (stored, local) => ({
      ...mergeRouteProgress(stored, local),
      language: local.language,
      minutes: local.minutes,
    }),
  });
}

describe('two open instances of the route store (legacy-map §5 and §12)', () => {
  it('KNOWN DEFECT: a favorite removed through one instance comes back when the other saves', () => {
    const saved = route({ favorites: ['rust-100', 'go-tour'] });
    const storage = memoryStorage({ [KEY]: JSON.stringify(saved) });
    const page = openRouteStore(storage);
    const shell = openRouteStore(storage);
    const pageState = page.load().state;
    const shellState = shell.load().state;

    page.write({ ...pageState, favorites: ['go-tour'], completed: ['rust-ownership'] });
    const note = { ...shellState.notes, rust: { learned: 'una nota', next: '' } };
    const result = shell.write({ ...shellState, notes: note });

    expect(result.saved).toBe(true);
    const stored = JSON.parse(storage.getItem(KEY)!) as RouteProgressV1;
    expect(stored.completed).toEqual(['rust-ownership']);
    expect(stored.notes.rust.learned).toBe('una nota');
    expect([...stored.favorites].sort()).toEqual(['go-tour', 'rust-100']);
  });
});
