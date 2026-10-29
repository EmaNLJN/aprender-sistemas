import { beforeEach, describe, expect, it } from 'vitest';
import {
  readCatalogFilter,
  readSimulation,
  resetSimulations,
  saveCatalogFilter,
  saveSimulation,
  simulationKey,
} from './systems-session';

describe('the Systems session', () => {
  beforeEach(() => {
    resetSimulations();
    saveCatalogFilter({ family: 'all', query: '' });
  });

  it('keys a simulation by language and workshop, as the legacy view did', () => {
    expect(simulationKey('rust', 'cache')).toBe('rust:cache');
  });

  it('keeps each simulation apart by language', () => {
    saveSimulation('rust:cache', { hits: 1 });

    expect(readSimulation('rust:cache')).toEqual({ hits: 1 });
    expect(readSimulation('go:cache')).toBeUndefined();
  });

  it('starts with every family and no search, and returns the saved filter', () => {
    expect(readCatalogFilter()).toEqual({ family: 'all', query: '' });

    saveCatalogFilter({ family: 'infra', query: 'wal' });

    expect(readCatalogFilter()).toEqual({ family: 'infra', query: 'wal' });
  });

  it('resets the simulations and keeps the family and the search', () => {
    saveSimulation('rust:cache', { hits: 1 });
    saveCatalogFilter({ family: 'play', query: 'rayos' });

    resetSimulations();

    expect(readSimulation('rust:cache')).toBeUndefined();
    expect(readCatalogFilter()).toEqual({ family: 'play', query: 'rayos' });
  });
});
