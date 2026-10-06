import type { LabRecord } from './merge-record';
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

export function blankLabState(): LabStateV1 {
  throw new Error('not implemented');
}

export function sanitizeResult(result: Record<string, unknown>, exercise: Exercise) {
  void result;
  void exercise;
  throw new Error('not implemented');
}

export function sanitizeRecord(record: Record<string, unknown>, exercise: Exercise): LabRecord {
  void record;
  void exercise;
  throw new Error('not implemented');
}

export function assertBackupShape(raw: unknown): void {
  void raw;
  throw new Error('not implemented');
}

export function sanitizeImport(raw: unknown, byId: ExerciseLookup): LabStateV1 {
  void raw;
  void byId;
  throw new Error('not implemented');
}

export function parseSavedLab(raw: unknown, byId: ExerciseLookup): ParsedLabState {
  void raw;
  void byId;
  throw new Error('not implemented');
}

export function absorbStored(
  stored: LabStateV1,
  local: LabStateV1,
  byId: ExerciseLookup,
): LabStateV1 {
  void stored;
  void local;
  void byId;
  throw new Error('not implemented');
}
