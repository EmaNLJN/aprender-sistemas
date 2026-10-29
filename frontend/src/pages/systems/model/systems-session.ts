import type { CatalogFilter, SystemsLanguage } from './types';

const simulations = new Map<string, unknown>();
let catalogFilter: CatalogFilter = { family: 'all', query: '' };

export function simulationKey(language: SystemsLanguage, workshopId: string): string {
  return `${language}:${workshopId}`;
}

export function readSimulation(key: string): unknown {
  return simulations.get(key);
}

export function saveSimulation(key: string, state: unknown): void {
  simulations.set(key, state);
}

export function resetSimulations(): void {
  simulations.clear();
}

export function readCatalogFilter(): CatalogFilter {
  return catalogFilter;
}

export function saveCatalogFilter(filter: CatalogFilter): void {
  catalogFilter = filter;
}
