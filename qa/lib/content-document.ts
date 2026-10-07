import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const buildDirectory = path.resolve(import.meta.dirname, '..', '..', 'build');
const frontendDirectory = path.resolve(import.meta.dirname, '..', '..', 'frontend');

export function curriculumDocumentText(): string {
  return readFileSync(path.join(buildDirectory, 'curriculum.json'), 'utf8');
}

export function curriculumDocument<T>(): T {
  return JSON.parse(curriculumDocumentText()) as T;
}

export interface CurriculumMeta {
  documentHash: string;
  portions: Record<string, string>;
}

export function curriculumMeta(): CurriculumMeta {
  return JSON.parse(
    readFileSync(path.join(buildDirectory, 'curriculum.meta.json'), 'utf8'),
  ) as CurriculumMeta;
}

export function contentVersion(): string {
  return curriculumMeta().documentHash.slice(0, 32);
}

export const FAMILIES = [
  'lab',
  'quests',
  'cores',
  'campaign',
  'workshops',
  'atlas',
  'guide',
] as const;
export type Family = (typeof FAMILIES)[number];

export interface FamilyMarkers {
  readonly family: Family;
  readonly markers: readonly string[];
}

interface Entry {
  id?: unknown;
  [field: string]: unknown;
}

const MIN_LENGTH = 24;
const PLAIN_ASCII = /^[\x20-\x7e]+$/;
const ESCAPED_IN_A_BUNDLE = /["'`\\]/;

function isMarkerSafe(text: string): boolean {
  return PLAIN_ASCII.test(text) && !ESCAPED_IN_A_BUNDLE.test(text);
}

function entriesOf(document: Record<string, unknown>, family: Family): Entry[] {
  if (family === 'guide') {
    const guide = document.guide as {
      resources: Entry[];
      tracks: Record<string, { modules: (Entry & { steps: Entry[] })[] }>;
    };
    const modules = Object.values(guide.tracks).flatMap((track) => track.modules);
    return [...guide.resources, ...modules.flatMap((module) => [module, ...module.steps])];
  }
  return Object.values(document[family] as Record<string, Entry[]>).flat();
}

function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsOf);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(stringsOf);
  return [];
}

function readSources(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .map((item) => {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) return readSources(file);
      return /\.(ts|tsx|js|css|html)$/.test(item.name) ? readFileSync(file, 'utf8') : '';
    })
    .join('\n');
}

export function curriculumMarkers(): FamilyMarkers[] {
  const document = curriculumDocument<Record<string, unknown>>();
  const sources = readSources(frontendDirectory);
  const isUsable = (text: string): boolean => isMarkerSafe(text) && !sources.includes(text);
  return FAMILIES.map((family) => {
    for (const entry of entriesOf(document, family)) {
      const texts = stringsOf(entry)
        .filter((text) => text.length >= MIN_LENGTH && !/^https?:\/\//.test(text) && isUsable(text))
        .sort((a, b) => b.length - a.length)
        .slice(0, 2);
      if (texts.length < 2) continue;
      const id = typeof entry.id === 'string' && isUsable(entry.id) ? [entry.id] : [];
      return { family, markers: [...id, ...texts] };
    }
    throw new Error(`La familia «${family}» no tiene una entrada con marcadores seguros`);
  });
}
