import { describe, expect, it } from 'vitest';
import {
  absorbStored,
  blankLabState,
  parseSavedLab,
  sanitizeImport,
  sanitizeRecord,
  type LabStateV1,
} from './lab-state';
import type { Exercise } from './types';

function exercise(id: string, language: 'rust' | 'go', testIds: string[]): Exercise {
  return {
    id,
    language,
    tests: testIds.map((testId) => ({ id: testId })),
    prediction: { options: ['a', 'b', 'c'] },
  } as unknown as Exercise;
}

const byId = new Map<string, Exercise>([
  ['r1', exercise('r1', 'rust', ['t1', 't2'])],
  ['r2', exercise('r2', 'rust', ['t1'])],
  ['g1', exercise('g1', 'go', ['t1'])],
]);

function backup(records: Record<string, unknown>, selected: unknown = {}): unknown {
  return { version: 1, records, selected };
}

describe('blankLabState', () => {
  it('is an empty version 1 state with nothing selected', () => {
    expect(blankLabState()).toEqual({
      version: 1,
      records: {},
      selected: { rust: null, go: null },
    });
  });

  it('returns a new object each time', () => {
    expect(blankLabState()).not.toBe(blankLabState());
  });
});

describe('sanitizeRecord', () => {
  const rust = byId.get('r1')!;

  it('cuts texts to their limits', () => {
    const clean = sanitizeRecord(
      { draft: 'd'.repeat(30001), reflection: 'r'.repeat(10001), customTest: 'c'.repeat(3001) },
      rust,
    );

    expect(clean.draft).toHaveLength(30000);
    expect(clean.reflection).toHaveLength(10000);
    expect(clean.customTest).toHaveLength(3000);
  });

  it('caps hints at 3 and keeps zero attempts', () => {
    const clean = sanitizeRecord({ hints: 9, attempts: 0 }, rust);

    expect(clean.hints).toBe(3);
    expect(clean.attempts).toBe(0);
  });

  it('drops solvedAt below 1, negative numbers and non finite numbers', () => {
    const clean = sanitizeRecord(
      { solvedAt: 0, attempts: -1, reviewAt: Infinity, reviewedAt: 'x' },
      rust,
    );

    expect(clean).not.toHaveProperty('solvedAt');
    expect(clean).not.toHaveProperty('attempts');
    expect(clean).not.toHaveProperty('reviewAt');
    expect(clean).not.toHaveProperty('reviewedAt');
  });

  it('keeps a prediction only when it is an option index of the exercise', () => {
    expect(sanitizeRecord({ prediction: 2 }, rust).prediction).toBe(2);
    expect(sanitizeRecord({ prediction: 3 }, rust)).not.toHaveProperty('prediction');
    expect(sanitizeRecord({ prediction: 1.5 }, rust)).not.toHaveProperty('prediction');
  });

  it('turns the help flags into strict booleans', () => {
    const clean = sanitizeRecord({ assisted: 'yes', solutionSeen: true }, rust);

    expect(clean).toMatchObject({
      predictionCorrect: false,
      assisted: false,
      solutionSeen: true,
    });
  });

  it('keeps only the known confidence values', () => {
    expect(sanitizeRecord({ confidence: 'practice' }, rust).confidence).toBe('practice');
    expect(sanitizeRecord({ confidence: 'sure' }, rust)).not.toHaveProperty('confidence');
  });

  it('rebuilds the result from the tests the exercise expects', () => {
    const clean = sanitizeRecord(
      {
        result: {
          code: 'fn main() {}',
          success: true,
          stdout: 'o'.repeat(12001),
          stderr: 'e'.repeat(18001),
          tests: [
            { id: 't1', passed: true },
            { id: 'ghost', passed: true },
          ],
          time: 'slow',
        },
      },
      rust,
    );

    expect(clean.result).toMatchObject({
      code: 'fn main() {}',
      success: true,
      transportError: false,
      tests: [
        { id: 't1', passed: true },
        { id: 't2', passed: false },
      ],
      time: 0,
      customTest: '',
      customPassed: false,
    });
    const result = clean.result as { stdout: string; stderr: string };
    expect(result.stdout).toHaveLength(12000);
    expect(result.stderr).toHaveLength(18000);
  });
});

describe('sanitizeImport', () => {
  it('keeps the records of known exercises and silently drops the rest', () => {
    const clean = sanitizeImport(
      backup({ r1: { draft: 'x' }, unknown: { draft: 'y' }, r2: 'text', g1: null }),
      byId,
    );

    expect(Object.keys(clean.records)).toEqual(['r1']);
    expect(clean.records.r1.draft).toBe('x');
  });

  it('keeps a selection only when the exercise has that language', () => {
    const clean = sanitizeImport(backup({}, { rust: 'r2', go: 'r1' }), byId);

    expect(clean.selected).toEqual({ rust: 'r2', go: null });
  });

  it.each([
    ['null', null],
    ['another version', { version: 2, records: {} }],
    ['no records', { version: 1 }],
    ['records as an array', { version: 1, records: [] }],
  ])('rejects a backup with %s', (_name, raw) => {
    expect(() => sanitizeImport(raw, byId)).toThrow(
      'El laboratorio de esa copia no es compatible.',
    );
  });
});

describe('parseSavedLab', () => {
  it('counts the dropped records and ignores an invalid selection without counting it', () => {
    const parsed = parseSavedLab(
      backup({ r1: { draft: 'x' }, unknown: { draft: 'y' }, r2: 7 }, { rust: 'g1' }),
      byId,
    );

    expect(parsed.dropped).toBe(2);
    expect(Object.keys(parsed.state.records)).toEqual(['r1']);
    expect(parsed.state.selected).toEqual({ rust: null, go: null });
  });

  it('drops nothing when every record is known', () => {
    const parsed = parseSavedLab(backup({ r1: {}, g1: {} }, { go: 'g1' }), byId);

    expect(parsed.dropped).toBe(0);
    expect(parsed.state.selected.go).toBe('g1');
  });

  it('rejects an incompatible shape', () => {
    expect(() => parseSavedLab({ version: 3, records: {} }, byId)).toThrow(
      'El laboratorio de esa copia no es compatible.',
    );
  });
});

describe('absorbStored', () => {
  function labState(records: LabStateV1['records']): LabStateV1 {
    return { version: 1, records, selected: { rust: null, go: null } };
  }

  it('merges into the local state and records without replacing them', () => {
    const localRecord = { draft: 'mine' };
    const local = labState({ r1: localRecord });

    const merged = absorbStored(labState({ r1: { draft: 'theirs', solvedAt: 5 } }), local, byId);

    expect(merged).toBe(local);
    expect(merged.records.r1).toBe(localRecord);
    expect(localRecord).toMatchObject({ draft: 'mine', solvedAt: 5 });
  });

  it('adds the records only the other tab has', () => {
    const stored = labState({ r2: { draft: 'other tab' } });

    const merged = absorbStored(stored, labState({}), byId);

    expect(merged.records.r2).toEqual({ draft: 'other tab' });
  });

  it('keeps the help flags of both sides', () => {
    const local = labState({ r1: { assisted: true } });

    absorbStored(labState({ r1: { solutionSeen: true } }), local, byId);

    expect(local.records.r1).toMatchObject({ assisted: true, solutionSeen: true });
  });
});
