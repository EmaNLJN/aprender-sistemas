import { describe, expect, it } from 'vitest';
import masterStorage from '../../../../../qa/fixtures/progress-master-2a278ad-storage.json';
import importCases from '../../../../../qa/fixtures/shared/import-cases.json';
import { createMemoryStorage, keysWithPrefix } from './account-space';
import {
  archiveV1,
  exportImportBody,
  readV1Candidate,
  storageImportBody,
  summarizeLab,
  type V1Keys,
  type V1Parsers,
  type V1Section,
} from './v1-import';

const KEYS: V1Keys = {
  route: 'taller-learning-v1',
  lab: 'taller-laboratorio-v1',
  campaign: 'taller-campaign-v1',
  systems: 'taller-systems-v1',
};

interface ImportCase {
  id: string;
  source: 'storage' | 'export';
  raw: string;
  normalized: Record<V1Section, unknown>;
}

const cases = importCases.cases as ImportCase[];

function parsersOf(item: ImportCase): V1Parsers {
  return {
    route: () => item.normalized.route,
    lab: () => item.normalized.lab,
    campaign: () => item.normalized.campaign,
    systems: () => item.normalized.systems,
  };
}

const TICKET = {
  importId: '6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f',
  epoch: 1,
  confirm: false,
};

function storageWith(entries: Record<string, string>) {
  const storage = createMemoryStorage();
  for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
  return storage;
}

describe('readV1Candidate', () => {
  it('offers the frozen master progress with its summary and writes nothing', () => {
    const master = masterStorage as Record<string, string>;
    const storage = storageWith(master);
    const candidate = readV1Candidate(storage, KEYS);
    expect(candidate?.summary).toEqual(summarizeLab(JSON.parse(master['taller-laboratorio-v1'])));
    expect(candidate?.summary.solvedCount).toBeGreaterThan(0);
    expect(keysWithPrefix(storage, '').sort()).toEqual(Object.keys(master).sort());
  });

  it('does not offer the blank route that F8 leaves after «Borrar todo»', () => {
    const blank = {
      version: 1,
      language: 'rust',
      completed: [],
      milestones: [],
      favorites: [],
      quizAnswers: {},
      notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
      minutes: 25,
    };
    expect(
      readV1Candidate(storageWith({ 'taller-learning-v1': JSON.stringify(blank) }), KEYS),
    ).toBeNull();
  });

  it('does not offer an unreadable copy, and leaves it where it is', () => {
    const storage = storageWith({ 'taller-laboratorio-v1': '{roto' });
    expect(readV1Candidate(storage, KEYS)).toBeNull();
    expect(storage.getItem('taller-laboratorio-v1')).toBe('{roto');
  });

  it('counts the solved records and dates the newest result', () => {
    const lab = {
      version: 1,
      records: {
        a: { solvedAt: 5, result: { time: Date.UTC(2026, 0, 2) } },
        b: { result: { time: Date.UTC(2026, 0, 1) } },
      },
    };
    expect(summarizeLab(lab)).toEqual({
      solvedCount: 1,
      lastResultAt: '2026-01-02T00:00:00.000Z',
    });
  });
});

describe('the import bodies (http-d1b.md §3)', () => {
  it.each(cases.filter((item) => item.source === 'storage'))(
    '$id: the raw and the sections of the storage',
    (item) => {
      const storage = storageWith(JSON.parse(item.raw) as Record<string, string>);
      const candidate = readV1Candidate(storage, KEYS);
      expect(candidate).not.toBeNull();
      const body = storageImportBody(candidate!, KEYS, parsersOf(item), TICKET);
      expect(body).toEqual({
        format: 2,
        ...TICKET,
        source: 'storage',
        raw: item.raw,
        normalized: item.normalized,
      });
    },
  );

  it.each(cases.filter((item) => item.source === 'export'))(
    '$id: the raw and the sections of the file',
    (item) => {
      const body = exportImportBody(item.raw, parsersOf(item), TICKET);
      expect(body).toEqual({
        format: 2,
        ...TICKET,
        source: 'export',
        raw: item.raw,
        normalized: item.normalized,
      });
    },
  );

  it('sends every normalized text well formed, and the raw as it was stored (D1b R26)', () => {
    const route = {
      version: 1,
      completed: ['rust-1-1'],
      notes: { rust: { learned: 'a\uD800', next: '' } },
    };
    const storage = storageWith({
      'taller-learning-v1': JSON.stringify(route),
    });
    const parsers = {
      route: (raw: unknown) => raw,
      lab: () => null,
      campaign: () => null,
      systems: () => null,
    };
    const body = storageImportBody(readV1Candidate(storage, KEYS)!, KEYS, parsers, TICKET);
    expect(body.raw).toBe(JSON.stringify({ 'taller-learning-v1': JSON.stringify(route) }));
    expect(body.normalized.route).toEqual({
      ...route,
      notes: { rust: { learned: 'a\uFFFD', next: '' } },
    });
  });
});

describe('archiveV1 (FR-072)', () => {
  it('moves the v1 keys and their backups to the account archive', () => {
    const storage = storageWith({
      'taller-learning-v1': '{"version":1}',
      'taller-learning-v1:respaldo': 'old',
      'taller-systems-v1': '{"version":1}',
      'taller-v2:41:cola': 'q',
    });
    expect(
      archiveV1(storage, KEYS, 41, {
        importId: TICKET.importId,
        importedAt: '2026-10-28T12:00:00.000Z',
      }),
    ).toBe(true);
    expect(keysWithPrefix(storage, '')).toEqual(['taller-v2:41:cola', 'taller-v1-importado:41']);
    expect(JSON.parse(storage.getItem('taller-v1-importado:41')!)).toEqual({
      format: 1,
      imports: [
        {
          importId: TICKET.importId,
          importedAt: '2026-10-28T12:00:00.000Z',
          entries: {
            'taller-learning-v1': '{"version":1}',
            'taller-learning-v1:respaldo': 'old',
            'taller-systems-v1': '{"version":1}',
          },
        },
      ],
    });
  });
});
