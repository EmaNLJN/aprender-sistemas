import { isPlainObject } from '../../../shared/lib/is-plain-object';
import { backupKeysFor, type StorageLike } from '../../../shared/lib/versioned-storage';
import { wellFormed, wellFormedDeep } from '../../../shared/lib/well-formed';
import type { ImportSource, V1Summary } from './types';
import { SYNC_FORMAT } from './sync-limits';

export type V1Section = 'route' | 'lab' | 'campaign' | 'systems';
export type V1Keys = Readonly<Record<V1Section, string>>;
export type V1Parsers = Readonly<Record<V1Section, (raw: unknown) => unknown>>;

export const V1_SECTIONS: readonly V1Section[] = ['route', 'lab', 'campaign', 'systems'];
export const ARCHIVE_PREFIX = 'taller-v1-importado:';
const EXPORT_ONLY_KEYS = ['lab', 'campaign', 'systems', 'exportedAt'];

export interface V1Candidate {
  readonly texts: Readonly<Partial<Record<V1Section, string>>>;
  readonly summary: V1Summary;
}

export interface ImportBody {
  readonly format: 2;
  readonly importId: string;
  readonly epoch: number;
  readonly source: ImportSource;
  readonly raw: string;
  readonly normalized: Readonly<Partial<Record<V1Section, unknown>>>;
  readonly confirm: boolean;
}

export interface ImportTicket {
  readonly importId: string;
  readonly epoch: number;
  readonly confirm: boolean;
}

function isEmptyObject(value: unknown): boolean {
  return isPlainObject(value) && Object.keys(value).length === 0;
}

function isEmptyList(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.length === 0);
}

function isBlankNotes(notes: unknown): boolean {
  if (!isPlainObject(notes)) return true;
  return Object.values(notes).every(
    (language) =>
      !isPlainObject(language) ||
      Object.values(language).every((text) => text === '' || text === undefined),
  );
}

// A blank route is what F8's «Borrar todo» leaves behind: not a v1 to import (F8 spec :917, :931).
const BLANK: Readonly<Record<V1Section, (value: Record<string, unknown>) => boolean>> = {
  route: (value) =>
    isEmptyList(value.completed) &&
    isEmptyList(value.milestones) &&
    isEmptyList(value.favorites) &&
    (value.quizAnswers === undefined || isEmptyObject(value.quizAnswers)) &&
    isBlankNotes(value.notes),
  lab: (value) => value.records === undefined || isEmptyObject(value.records),
  campaign: (value) =>
    (value.seals === undefined || isEmptyObject(value.seals)) &&
    (value.checkpoints === undefined || isEmptyObject(value.checkpoints)),
  systems: (value) => value.records === undefined || isEmptyObject(value.records),
};

function isSolved(record: Record<string, unknown>): boolean {
  return typeof record.solvedAt === 'number' && record.solvedAt > 0;
}

function resultTimeOf(record: Record<string, unknown>): number | null {
  const time = isPlainObject(record.result) ? record.result.time : undefined;
  return typeof time === 'number' && Number.isFinite(time) ? time : null;
}

export function summarizeLab(raw: unknown): V1Summary {
  const values = isPlainObject(raw) && isPlainObject(raw.records) ? Object.values(raw.records) : [];
  const records = values.filter(isPlainObject);
  const times = records.map(resultTimeOf).filter((time): time is number => time !== null);
  const lastResultAt = times.length > 0 ? new Date(Math.max(...times)).toISOString() : null;
  return { solvedCount: records.filter(isSolved).length, lastResultAt };
}

function readText(storage: StorageLike, key: string): string | null | undefined {
  try {
    return storage.getItem(key);
  } catch {
    return undefined;
  }
}

export function readV1Candidate(storage: StorageLike, keys: V1Keys): V1Candidate | null {
  const texts: Partial<Record<V1Section, string>> = {};
  let somethingToImport = false;
  for (const section of V1_SECTIONS) {
    const text = readText(storage, keys[section]);
    if (text === undefined) return null;
    if (text === null) continue;
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      return null;
    }
    if (!isPlainObject(value)) return null;
    texts[section] = text;
    if (!BLANK[section](value)) somethingToImport = true;
  }
  if (!somethingToImport) return null;
  const lab = texts.lab === undefined ? undefined : (JSON.parse(texts.lab) as unknown);
  return { texts, summary: summarizeLab(lab) };
}

function normalize(
  sections: Partial<Record<V1Section, unknown>>,
  parsers: V1Parsers,
): ImportBody['normalized'] {
  const normalized: Partial<Record<V1Section, unknown>> = {};
  for (const section of V1_SECTIONS) {
    if (sections[section] !== undefined)
      normalized[section] = wellFormedDeep(parsers[section](sections[section]));
  }
  return normalized;
}

export function storageImportBody(
  candidate: V1Candidate,
  keys: V1Keys,
  parsers: V1Parsers,
  ticket: ImportTicket,
): ImportBody {
  const stored: Record<string, string> = {};
  const sections: Partial<Record<V1Section, unknown>> = {};
  for (const section of V1_SECTIONS) {
    const text = candidate.texts[section];
    if (text === undefined) continue;
    stored[keys[section]] = wellFormed(text);
    sections[section] = JSON.parse(text) as unknown;
  }
  const raw = JSON.stringify(stored);
  return {
    format: SYNC_FORMAT,
    ...ticket,
    source: 'storage',
    raw,
    normalized: normalize(sections, parsers),
  };
}

export function exportImportBody(
  text: string,
  parsers: V1Parsers,
  ticket: ImportTicket,
): ImportBody {
  const raw = wellFormed(text);
  const file: unknown = JSON.parse(raw);
  if (!isPlainObject(file)) throw new Error('El archivo no es una copia del progreso.');
  const route = Object.fromEntries(
    Object.entries(file).filter(([key]) => !EXPORT_ONLY_KEYS.includes(key)),
  );
  const sections = {
    route,
    lab: file.lab,
    campaign: file.campaign,
    systems: file.systems,
  };
  return {
    format: SYNC_FORMAT,
    ...ticket,
    source: 'export',
    raw,
    normalized: normalize(sections, parsers),
  };
}

export function archiveKey(userId: number): string {
  return `${ARCHIVE_PREFIX}${userId}`;
}

// FR-072: after a 201 or 200, the v1 keys and their backups move to the account's archive.
export function archiveV1(
  storage: StorageLike,
  keys: V1Keys,
  userId: number,
  entry: { readonly importId: string; readonly importedAt: string },
): boolean {
  const entries: Record<string, string> = {};
  for (const section of V1_SECTIONS) {
    for (const key of [keys[section], ...backupKeysFor(keys[section])]) {
      const text = readText(storage, key);
      if (typeof text === 'string') entries[key] = text;
    }
  }
  const previous = readText(storage, archiveKey(userId));
  let imports: unknown[] = [];
  try {
    const parsedArchive: unknown = previous ? JSON.parse(previous) : null;
    if (isPlainObject(parsedArchive) && Array.isArray(parsedArchive.imports))
      imports = parsedArchive.imports;
  } catch {
    imports = [];
  }
  try {
    storage.setItem(
      archiveKey(userId),
      JSON.stringify({
        format: 1,
        imports: [...imports, { ...entry, entries }],
      }),
    );
  } catch {
    return false;
  }
  for (const key of Object.keys(entries)) storage.removeItem(key);
  return true;
}
