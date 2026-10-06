import { afterEach, describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import masterStorage from '../../../../../qa/fixtures/progress-master-2a278ad-storage.json';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { createSystemsEngine, systemsEngine } from '..';
import type { SystemsConfig, SystemsEngine } from './types';

const STORAGE_KEY = 'taller-systems-v1';

interface RecordingStorage extends StorageLike {
  writes: number;
  read(key: string): string | null;
}

function memoryStorage(initial: Record<string, string> = {}): RecordingStorage {
  const items = new Map(Object.entries(initial));
  const storage: RecordingStorage = {
    writes: 0,
    getItem: (key) => items.get(key) ?? null,
    setItem(key, value) {
      storage.writes += 1;
      items.set(key, value);
    },
    removeItem(key) {
      storage.writes += 1;
      items.delete(key);
    },
    read: (key) => items.get(key) ?? null,
  };
  return storage;
}

function smallConfig(): SystemsConfig {
  const workshops = ['alpha', 'beta'].map((id, index) => ({
    id,
    title: id,
    model: id,
    objectives: ['a', 'b', 'c'].map((goal) => ({ id: goal, label: goal, why: 'Observable' })),
    steps: Array.from({ length: 4 }, (_, step) => ({
      title: `Stage ${step}`,
      task: 'Implement',
      why: 'Reason',
      done: 'Criterion',
    })),
    prediction: {
      question: 'Which invariant?',
      options: ['A', 'B', 'C'],
      answer: 1,
      explanation: 'Because B.',
    },
    code: { rust: `rust-${113 + index}`, go: `go-${113 + index}` },
  }));
  const exercises = workshops.flatMap((workshop) =>
    (['rust', 'go'] as const).map((language) => ({
      id: workshop.code[language],
      language,
      tests: ['t1', 't2', 't3'].map((id) => ({ id })),
    })),
  );
  return { workshops, exercises, models: { alpha: {}, beta: {} } };
}

function passingLab(exerciseId: string) {
  return {
    records: {
      [exerciseId]: {
        result: {
          code: 'a real recorded program',
          success: true,
          tests: ['t1', 't2', 't3'].map((id) => ({ id, passed: true })),
        },
      },
    },
  };
}

function openEngine(initial: Record<string, string> = {}): {
  engine: SystemsEngine;
  storage: RecordingStorage;
} {
  const storage = memoryStorage(initial);
  vi.stubGlobal('localStorage', storage);
  const engine = createSystemsEngine();
  engine.init(smallConfig());
  return { engine, storage };
}

function revisionOf(engine: SystemsEngine): number {
  return engine.changes.getState().revision;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Systems engine revision', () => {
  it('starts at revision 0 and each factory has its own store', () => {
    const first = createSystemsEngine();
    const second = createSystemsEngine();

    expect(revisionOf(first)).toBe(0);
    expect(first.changes).not.toBe(second.changes);
    expect(systemsEngine.changes).not.toBe(first.changes);
  });

  it('does not notify on init and keeps working when init runs again', () => {
    const { engine } = openEngine();
    const listener = vi.fn();
    engine.changes.subscribe(listener);

    engine.init(smallConfig());

    expect(engine.list('rust').map((workshop) => workshop.id)).toEqual(['alpha', 'beta']);
    expect(listener).not.toHaveBeenCalled();
  });

  it('raises the revision by one when observe adds goals, even several at once', () => {
    const { engine } = openEngine();

    const result = engine.observe('alpha', 'rust', ['a', 'b']);

    expect(result.added).toEqual(['a', 'b']);
    expect(revisionOf(engine)).toBe(1);
  });

  it('does not raise the revision when observe adds nothing', () => {
    const { engine } = openEngine();
    engine.observe('alpha', 'rust', ['a']);

    engine.observe('alpha', 'rust', ['a', 'unknown']);

    expect(revisionOf(engine)).toBe(1);
  });

  it('raises the revision by one on answer, setStep and setNote', () => {
    const { engine } = openEngine();

    engine.answer('alpha', 'rust', 1);
    expect(revisionOf(engine)).toBe(1);
    engine.setStep('alpha', 'rust', 0, true);
    expect(revisionOf(engine)).toBe(2);
    engine.setNote('alpha', 'rust', 'a note');
    expect(revisionOf(engine)).toBe(3);
  });

  it('raises the revision by one when syncLab persists new evidence and not when it has none', () => {
    const { engine } = openEngine();

    engine.syncLab(passingLab('rust-113'));
    expect(revisionOf(engine)).toBe(1);
    engine.syncLab(passingLab('rust-113'));
    expect(revisionOf(engine)).toBe(1);
  });

  it('does not raise the revision on refreshFromLab or on reads', () => {
    const { engine } = openEngine();

    engine.refreshFromLab(passingLab('rust-113'));
    engine.get('alpha', 'rust');
    engine.list('go');
    engine.exportState();
    engine.planImport(null);
    engine.backups();

    expect(revisionOf(engine)).toBe(0);
  });

  it('raises the revision once when applyImport persists a change', () => {
    const { engine } = openEngine();
    const plan = engine.planImport({
      version: 1,
      records: {
        'rust:alpha': {
          observed: ['a'],
          code: false,
          predicted: false,
          answer: null,
          steps: [],
          note: '',
        },
      },
    });

    const result = engine.applyImport(plan);

    expect(result.changed).toBe(true);
    expect(revisionOf(engine)).toBe(1);
  });

  it('raises the revision once when applyImport has a plan without changes', () => {
    const { engine, storage } = openEngine();
    engine.setNote('alpha', 'rust', 'saved');
    const writesBefore = storage.writes;
    const revisionBefore = revisionOf(engine);

    const result = engine.applyImport(engine.planImport(null));

    expect(result.changed).toBe(false);
    expect(storage.writes).toBe(writesBefore);
    expect(revisionOf(engine)).toBe(revisionBefore + 1);
  });

  it('raises the revision once on reset', () => {
    const { engine } = openEngine();

    engine.reset();

    expect(revisionOf(engine)).toBe(1);
  });

  it('lets a listener see what was already written', () => {
    const { engine, storage } = openEngine();
    let seenInStorage: string | null = null;
    engine.changes.subscribe(() => {
      seenInStorage = storage.read(STORAGE_KEY);
    });

    engine.setNote('alpha', 'rust', 'written first');

    expect(JSON.parse(seenInStorage!).records['rust:alpha'].note).toBe('written first');
  });

  it('propagates a throwing listener after the write already happened', () => {
    const { engine, storage } = openEngine();
    engine.changes.subscribe(() => {
      throw new Error('listener failed');
    });

    expect(() => engine.setNote('alpha', 'rust', 'kept')).toThrow('listener failed');

    expect(JSON.parse(storage.read(STORAGE_KEY)!).records['rust:alpha'].note).toBe('kept');
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const { engine } = openEngine();
    const listener = vi.fn();
    const unsubscribe = engine.changes.subscribe(listener);
    engine.setNote('alpha', 'rust', 'first');

    unsubscribe();
    engine.setNote('alpha', 'rust', 'second');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('opens quietly with the real catalog and the master storage fixture', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: masterStorage[STORAGE_KEY] });
    vi.stubGlobal('localStorage', storage);
    const engine = createSystemsEngine();
    const listener = vi.fn();
    engine.changes.subscribe(listener);
    const workshops = Object.values(curriculum.workshops).flat();
    const models = Object.fromEntries(workshops.map((workshop) => [workshop.model, {}]));
    const exercises = [
      ...curriculum.lab.rust,
      ...curriculum.quests.rust,
      ...curriculum.lab.go,
      ...curriculum.quests.go,
      ...curriculum.cores.lowlevel,
      ...curriculum.cores.infra,
      ...curriculum.cores.play,
      ...curriculum.cores.pc,
    ];

    const result = engine.init({ workshops, models, exercises } as unknown as SystemsConfig);

    expect(result.loadWarning).toBe('');
    expect(storage.writes).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });
});
