import { afterEach, describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import masterStorage from '../../../../../qa/fixtures/progress-master-2a278ad-storage.json';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { campaignEngine, createCampaignEngine } from '..';
import type { CampaignConfig, CampaignEngine, CampaignWorldDefinition } from './types';

const STORAGE_KEY = 'taller-campaign-v1';
const LEVELS = ['beginner', 'medium', 'advanced', 'expert'] as const;

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

function worldsFor(language: 'rust' | 'go'): CampaignWorldDefinition[] {
  return LEVELS.map((level, index) => ({
    id: `${language}-world-${index + 1}`,
    level,
    title: `${language} world ${index + 1}`,
    badge: `Badge ${index + 1}`,
    trainingIds: [1, 2, 3].map((n) => `${language}-${index * 6 + n}`),
    challengeIds: [4, 5, 6].map((n) => `${language}-${index * 6 + n}`),
    bossId: `${language}-${index * 6 + 6}`,
    checkpoint: {
      question: 'Why?',
      options: ['Because of a rule', 'By chance'],
      answer: 0,
      explanation: 'The rule keeps the contract.',
    },
  }));
}

function smallConfig(): CampaignConfig {
  const exercises = (['rust', 'go'] as const).flatMap((language) =>
    Array.from({ length: 25 }, (_, index) => ({
      id: `${language}-${index + 1}`,
      language,
      title: `${language} exercise ${index + 1}`,
      tests: ['t1', 't2', 't3'].map((id) => ({ id })),
    })),
  );
  return { exercises, worlds: { rust: worldsFor('rust'), go: worldsFor('go') } };
}

function labWithPassing(ids: string[], predictionCorrect = false) {
  const records = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        predictionCorrect,
        result: {
          code: 'a real recorded program',
          success: true,
          tests: ['t1', 't2', 't3'].map((testId) => ({ id: testId, passed: true })),
        },
      },
    ]),
  );
  return { version: 1, records };
}

function openEngine(initial: Record<string, string> = {}): {
  engine: CampaignEngine;
  storage: RecordingStorage;
} {
  const storage = memoryStorage(initial);
  vi.stubGlobal('localStorage', storage);
  const engine = createCampaignEngine();
  engine.init(smallConfig());
  return { engine, storage };
}

function revisionOf(engine: CampaignEngine): number {
  return engine.changes.getState().revision;
}

function makeCheckpointReady(engine: CampaignEngine): void {
  const world = worldsFor('rust')[0];
  const ids = [...world.trainingIds, ...world.challengeIds];
  engine.syncLab(labWithPassing(ids));
  for (const id of [ids[0], ids[1], ids[5]])
    engine.syncLab({ records: { [id]: { predictionCorrect: true } } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('campaign engine revision', () => {
  it('starts at revision 0 and each factory has its own store', () => {
    const first = createCampaignEngine();
    const second = createCampaignEngine();

    expect(revisionOf(first)).toBe(0);
    expect(first.changes).not.toBe(second.changes);
    expect(campaignEngine.changes).not.toBe(first.changes);
  });

  it('does not notify on init and keeps working when init runs again', () => {
    const { engine } = openEngine();
    const listener = vi.fn();
    engine.changes.subscribe(listener);

    engine.init(smallConfig());
    const world = engine.getWorlds('rust')[0];

    expect(world.id).toBe('rust-world-1');
    expect(listener).not.toHaveBeenCalled();
    expect(revisionOf(engine)).toBe(0);
  });

  it('raises the revision by one when syncLab persists new evidence', () => {
    const { engine } = openEngine();

    engine.syncLab(labWithPassing(['rust-1']));

    expect(revisionOf(engine)).toBe(1);
  });

  it('does not raise the revision when syncLab has nothing new to persist', () => {
    const { engine } = openEngine();
    engine.syncLab(labWithPassing(['rust-1']));

    engine.syncLab(labWithPassing(['rust-1']));

    expect(revisionOf(engine)).toBe(1);
  });

  it('does not raise the revision on refreshFromLab or on reads', () => {
    const { engine } = openEngine();

    engine.refreshFromLab(labWithPassing(['rust-1']));
    engine.getWorlds('rust');
    engine.getSummary('rust');
    engine.canAttempt('rust-1', 'rust');
    engine.exportState();
    engine.planImport(null);
    engine.backups();

    expect(revisionOf(engine)).toBe(0);
  });

  it('raises the revision by one when a checkpoint answer is accepted', () => {
    const { engine } = openEngine();
    makeCheckpointReady(engine);
    const before = revisionOf(engine);

    const result = engine.answerCheckpoint('rust-world-1', 0);

    expect(result.accepted).toBe(true);
    expect(revisionOf(engine)).toBe(before + 1);
  });

  it('does not raise the revision when a checkpoint answer is rejected', () => {
    const { engine } = openEngine();

    const result = engine.answerCheckpoint('missing-world', 0);

    expect(result.accepted).toBe(false);
    expect(revisionOf(engine)).toBe(0);
  });

  it('raises the revision once when applyImport persists a change', () => {
    const { engine } = openEngine();
    const plan = engine.planImport({
      version: 1,
      seals: { 'rust-1': { code: true, prediction: false, assisted: false } },
      checkpoints: {},
    });

    const result = engine.applyImport(plan);

    expect(result.changed).toBe(true);
    expect(revisionOf(engine)).toBe(1);
  });

  it('raises the revision once when applyImport has a plan without changes', () => {
    const { engine, storage } = openEngine();
    engine.syncLab(labWithPassing(['rust-1']));
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

  interface WritingCase {
    name: string;
    prepare?: (engine: CampaignEngine) => void;
    run: (engine: CampaignEngine) => void;
    observe: (stored: string | null) => unknown;
    expected: unknown;
  }

  const writingCases: WritingCase[] = [
    {
      name: 'syncLab',
      run: (engine) => void engine.syncLab(labWithPassing(['rust-1'])),
      observe: (stored) => JSON.parse(stored!).seals['rust-1'].code,
      expected: true,
    },
    {
      name: 'answerCheckpoint',
      prepare: makeCheckpointReady,
      run: (engine) => void engine.answerCheckpoint('rust-world-1', 1),
      observe: (stored) => JSON.parse(stored!).checkpoints['rust-world-1'].lastAnswer,
      expected: 1,
    },
    {
      name: 'applyImport',
      run: (engine) =>
        void engine.applyImport(
          engine.planImport({
            version: 1,
            seals: { 'rust-2': { code: true, prediction: false, assisted: false } },
            checkpoints: {},
          }),
        ),
      observe: (stored) => JSON.parse(stored!).seals['rust-2'].code,
      expected: true,
    },
    {
      name: 'reset',
      prepare: (engine) => void engine.syncLab(labWithPassing(['rust-1'])),
      run: (engine) => void engine.reset(),
      observe: (stored) => stored,
      expected: null,
    },
  ];

  it.each(writingCases)('lets a listener see what $name already wrote', (writingCase) => {
    const { engine, storage } = openEngine();
    writingCase.prepare?.(engine);
    let seenInStorage: string | null = 'listener never called';
    engine.changes.subscribe(() => {
      seenInStorage = storage.read(STORAGE_KEY);
    });

    writingCase.run(engine);

    expect(writingCase.observe(seenInStorage)).toEqual(writingCase.expected);
  });

  it('propagates a throwing listener after the write already happened', () => {
    const { engine, storage } = openEngine();
    engine.changes.subscribe(() => {
      throw new Error('listener failed');
    });

    expect(() => engine.syncLab(labWithPassing(['rust-1']))).toThrow('listener failed');

    expect(JSON.parse(storage.read(STORAGE_KEY)!).seals['rust-1'].code).toBe(true);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const { engine } = openEngine();
    const listener = vi.fn();
    const unsubscribe = engine.changes.subscribe(listener);
    engine.syncLab(labWithPassing(['rust-1']));

    unsubscribe();
    engine.reset();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('opens quietly with the real catalog and the master storage fixture', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: masterStorage[STORAGE_KEY] });
    vi.stubGlobal('localStorage', storage);
    const engine = createCampaignEngine();
    const listener = vi.fn();
    engine.changes.subscribe(listener);
    const realExercises = [
      ...curriculum.lab.rust,
      ...curriculum.quests.rust,
      ...curriculum.lab.go,
      ...curriculum.quests.go,
      ...curriculum.cores.lowlevel,
      ...curriculum.cores.infra,
      ...curriculum.cores.play,
      ...curriculum.cores.pc,
    ];

    const result = engine.init({
      exercises: realExercises,
      worlds: curriculum.campaign,
    } as unknown as CampaignConfig);

    expect(result.loadWarning).toBe('');
    expect(engine.exportState().seals['rust-22']).toEqual({
      code: true,
      prediction: true,
      assisted: true,
    });
    expect(storage.writes).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });
});
