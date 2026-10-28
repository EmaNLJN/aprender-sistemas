import { afterEach, describe, expect, it, vi } from 'vitest';

const SINGLETON_MODULES = [
  './model/lab-store',
  './model/exercise-catalog',
  '../guide/model/route-store',
  '../campaign/model/create-campaign-engine',
  '../systems-workshop/model/create-systems-engine',
];

function mockSingletonsToThrow(): void {
  for (const path of SINGLETON_MODULES) {
    vi.doMock(path, () => {
      throw new Error(`evaluated ${path}`);
    });
  }
}

describe('the explorers entry point', () => {
  afterEach(() => {
    vi.resetModules();
    for (const path of SINGLETON_MODULES) vi.doUnmock(path);
  });

  it('resolves without evaluating any module that owns a singleton', async () => {
    vi.resetModules();
    mockSingletonsToThrow();
    const entry = await import('./explorers');
    expect(entry.explorerKindOf).toBeTypeOf('function');
    expect(entry.initialLabExplorerState).toBeTypeOf('function');
    expect(entry.initialQuestState).toBeTypeOf('function');
  });

  it('is not reachable through the slice index, which does evaluate the singletons', async () => {
    vi.resetModules();
    mockSingletonsToThrow();
    await expect(import('./index')).rejects.toThrow(/error when mocking/);
  });
});
