import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface AccessCounter {
  windowReads: number;
  storageAccesses: number;
}

function installHostileGlobals(): AccessCounter {
  const counter: AccessCounter = { windowReads: 0, storageAccesses: 0 };
  const fail = (): never => {
    counter.storageAccesses++;
    throw new Error('localStorage must not be touched while importing');
  };
  const hostileStorage = { getItem: fail, setItem: fail, removeItem: fail, key: fail, clear: fail };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => {
      counter.storageAccesses++;
      return hostileStorage;
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    get: () => {
      counter.windowReads++;
      return undefined;
    },
  });
  return counter;
}

describe('importing the singletons', () => {
  let counter: AccessCounter;

  beforeEach(() => {
    vi.resetModules();
    counter = installHostileGlobals();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('does not touch localStorage or read window', async () => {
    const guide = await import('../entities/guide');
    const exercise = await import('../entities/exercise');
    const campaign = await import('../entities/campaign');
    const systems = await import('../entities/systems-workshop');

    expect(guide.routeStore.changes.getState()).toEqual({ revision: 0 });
    expect(exercise.labStore.changes.getState()).toEqual({ revision: 0 });
    expect(exercise.exerciseCatalog).toBeDefined();
    expect(campaign.campaignEngine.changes.getState()).toEqual({ revision: 0 });
    expect(systems.systemsEngine.changes.getState()).toEqual({ revision: 0 });
    expect(counter).toEqual({ windowReads: 0, storageAccesses: 0 });
  });
});
