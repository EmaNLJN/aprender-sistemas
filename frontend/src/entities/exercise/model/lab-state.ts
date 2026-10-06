import type { LabRecord } from './merge-record';
import { mergeRecord } from './merge-record';
import { testPassed } from './passing-evidence';
import type { Exercise, ExerciseLanguage } from './types';

export interface LabStateV1 {
  version: 1;
  records: Record<string, LabRecord>;
  selected: Record<ExerciseLanguage, string | null>;
}

export interface ParsedLabState {
  state: LabStateV1;
  dropped: number;
}

export type ExerciseLookup = ReadonlyMap<string, Exercise>;

type RawObject = Record<string, unknown>;

const LANGUAGES: ExerciseLanguage[] = ['rust', 'go'];

export function blankLabState(): LabStateV1 {
  return { version: 1, records: {}, selected: { rust: null, go: null } };
}

function isFiniteNumber(value: unknown): value is number {
  return Number.isFinite(value);
}

export function sanitizeResult(result: RawObject, exercise: Exercise) {
  const tests = exercise.tests.map((test) => ({
    id: test.id,
    passed: testPassed(result, test.id),
  }));
  return {
    code: typeof result.code === 'string' ? result.code.slice(0, 30000) : '',
    success: result.success === true,
    stdout: String(result.stdout || '').slice(0, 12000),
    stderr: String(result.stderr || '').slice(0, 18000),
    transportError: result.transportError === true,
    tests,
    time: isFiniteNumber(result.time) ? result.time : 0,
    customTest: typeof result.customTest === 'string' ? result.customTest.slice(0, 3000) : '',
    customPassed: result.customPassed === true,
  };
}

export function sanitizeRecord(record: RawObject, exercise: Exercise): LabRecord {
  const clean: LabRecord = {};
  const textLimits = { draft: 30000, reflection: 10000, customTest: 3000 };
  for (const [field, limit] of Object.entries(textLimits)) {
    const value = record[field];
    if (typeof value === 'string') clean[field] = value.slice(0, limit);
  }
  const numberLimits = {
    attempts: Number.MAX_SAFE_INTEGER,
    hints: 3,
    solvedAt: Number.MAX_SAFE_INTEGER,
    reviewAt: Number.MAX_SAFE_INTEGER,
    reviewedAt: Number.MAX_SAFE_INTEGER,
  };
  for (const [field, limit] of Object.entries(numberLimits)) {
    const minimum = field === 'solvedAt' ? 1 : 0;
    const value = record[field];
    if (isFiniteNumber(value) && value >= minimum) clean[field] = Math.min(value, limit);
  }
  const prediction = record.prediction;
  if (
    Number.isInteger(prediction) &&
    (prediction as number) >= 0 &&
    (prediction as number) < exercise.prediction.options.length
  ) {
    clean.prediction = prediction;
  }
  for (const field of ['predictionCorrect', 'assisted', 'solutionSeen'])
    clean[field] = record[field] === true;
  if (['again', 'practice', 'confident'].includes(record.confidence as string))
    clean.confidence = record.confidence;
  if (record.result && typeof record.result === 'object')
    clean.result = sanitizeResult(record.result as RawObject, exercise);
  return clean;
}

export function assertBackupShape(raw: unknown): void {
  const backup = raw as RawObject | null;
  if (
    !backup ||
    backup.version !== 1 ||
    typeof backup.records !== 'object' ||
    !backup.records ||
    Array.isArray(backup.records)
  ) {
    throw new Error('El laboratorio de esa copia no es compatible.');
  }
}

function sanitizeSelected(raw: RawObject, clean: LabStateV1, byId: ExerciseLookup): void {
  const selected = raw.selected as Partial<Record<ExerciseLanguage, string>> | undefined;
  for (const language of LANGUAGES) {
    const id = selected?.[language];
    if (id !== undefined && byId.get(id)?.language === language) clean.selected[language] = id;
  }
}

const isRecordObject = (id: string, record: unknown, byId: ExerciseLookup): boolean =>
  byId.has(id) && Boolean(record) && typeof record === 'object';

export function sanitizeImport(raw: unknown, byId: ExerciseLookup): LabStateV1 {
  assertBackupShape(raw);
  const backup = raw as RawObject;
  const clean = blankLabState();
  for (const [id, record] of Object.entries(backup.records as RawObject)) {
    if (isRecordObject(id, record, byId))
      clean.records[id] = sanitizeRecord(record as RawObject, byId.get(id)!);
  }
  sanitizeSelected(backup, clean, byId);
  return clean;
}

export function parseSavedLab(raw: unknown, byId: ExerciseLookup): ParsedLabState {
  assertBackupShape(raw);
  const backup = raw as RawObject;
  const clean = blankLabState();
  let dropped = 0;
  for (const [id, record] of Object.entries(backup.records as RawObject)) {
    try {
      if (!isRecordObject(id, record, byId)) throw new Error('Registro desconocido: ' + id);
      clean.records[id] = sanitizeRecord(record as RawObject, byId.get(id)!);
    } catch {
      dropped++;
    }
  }
  sanitizeSelected(backup, clean, byId);
  return { state: clean, dropped };
}

// Mutates `local` in place and keeps its identity and that of its records: handlers hold a
// reference to `record` across save() and keep writing to it, so a new state would orphan it
// and lose that edit.
export function absorbStored(
  stored: LabStateV1,
  local: LabStateV1,
  byId: ExerciseLookup,
): LabStateV1 {
  for (const [id, storedRecord] of Object.entries(stored.records)) {
    if (!local.records[id]) local.records[id] = storedRecord;
    else
      Object.assign(
        local.records[id],
        mergeRecord(storedRecord, local.records[id], byId.get(id)!.tests),
      );
  }
  return local;
}
