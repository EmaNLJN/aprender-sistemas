import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Language = 'rust' | 'go';
export type StorageKey =
  'taller-learning-v1' | 'taller-laboratorio-v1' | 'taller-campaign-v1' | 'taller-systems-v1';

interface CurriculumIds {
  exercises: Record<string, { language: Language; title: string }>;
  worlds: Record<
    string,
    { language: Language; trainingIds: string[]; challengeIds: string[]; bossId: string }
  >;
  workshops: Record<
    string,
    { model: string; cores: Record<Language, string>; objectives: string[] }
  >;
  atlas: Record<string, { language: Language; labId: string }>;
}

const repositoryRoot = resolve(import.meta.dirname, '../../..');

function readFixture<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), 'utf8')) as T;
}

// Frozen contracts (qa/AGENTS.md): read only.
export const curriculumIds = readFixture<CurriculumIds>('qa/fixtures/curriculum-ids.json');
export const frozenProgress = readFixture<Record<StorageKey, string>>(
  'qa/fixtures/progress-master-2a278ad-storage.json',
);
