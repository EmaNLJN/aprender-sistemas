import { afterEach, describe, expect, it, vi } from 'vitest';

const ENGINE_MODULES = [
  '../../entities/guide/model/route-store',
  '../../entities/campaign/model/create-campaign-engine',
  '../../entities/systems-workshop/model/create-systems-engine',
];

function failWhenAnEngineLoads(): void {
  vi.resetModules();
  for (const path of ENGINE_MODULES) {
    vi.doMock(path, () => {
      throw new Error(`${path} must not load`);
    });
  }
}

describe('the run-exercise feature', () => {
  afterEach(() => {
    for (const path of ENGINE_MODULES) vi.doUnmock(path);
    vi.resetModules();
  });

  it('loads without the campaign engine, the Systems engine or the route store', async () => {
    failWhenAnEngineLoads();

    await expect(import('.')).resolves.toHaveProperty('createExerciseRunner');
  });

  it('is isolated on purpose: the campaign index does load its engine', async () => {
    failWhenAnEngineLoads();

    await expect(import('../../entities/campaign')).rejects.toThrow('error when mocking');
  });
});
