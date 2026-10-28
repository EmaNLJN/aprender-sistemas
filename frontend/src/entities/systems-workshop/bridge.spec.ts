import { afterEach, describe, expect, it, vi } from 'vitest';

const STATEFUL_MODULES = [
  '../guide/model/route-store',
  '../exercise/model/lab-store',
  '../exercise/model/exercise-catalog',
  '../campaign/model/create-campaign-engine',
  './model/create-systems-engine',
];

function failWhenLoaded() {
  vi.resetModules();
  for (const path of STATEFUL_MODULES) {
    vi.doMock(path, () => {
      throw new Error(`${path} must not load`);
    });
  }
}

describe('systems workshop bridge entry', () => {
  afterEach(() => {
    vi.doUnmock('../guide/model/route-store');
    vi.doUnmock('../exercise/model/lab-store');
    vi.doUnmock('../exercise/model/exercise-catalog');
    vi.doUnmock('../campaign/model/create-campaign-engine');
    vi.doUnmock('./model/create-systems-engine');
    vi.resetModules();
  });

  it('loads without creating any singleton', async () => {
    failWhenLoaded();

    await expect(import('./bridge')).resolves.toHaveProperty('workshopMissionIds');
  });

  it('is isolated on purpose: the slice index does create the engine', async () => {
    failWhenLoaded();

    await expect(import('.')).rejects.toThrow('error when mocking');
  });
});
