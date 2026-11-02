import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { COPY_KEY, EPOCH_COPY_KEY, QUEUE_KEY } from './account-space';
import type { Operation } from './operations';
import { emptyAreas, readAreas, type ProgressAreas } from './server-rows';

export const RECORD_FORMAT = 1;

export interface CopyRecord {
  readonly format: 1;
  readonly userId: number;
  readonly epoch: number;
  readonly revision: number;
  readonly contentVersion: string | null;
  readonly etag: string | null;
  readonly resetAt: string | null;
  readonly clockOffsetMs: number;
  readonly areas: ProgressAreas;
}

export interface QueueRecord {
  readonly format: 1;
  readonly touchedAt: string;
  readonly operations: readonly Operation[];
  readonly deferred: readonly Operation[];
}

export interface EpochCopyRecord {
  readonly format: 1;
  readonly epoch: number;
  readonly createdAt: string;
  readonly operations: readonly Operation[];
}

function parsed(storage: StorageLike, key: string): Record<string, unknown> | null {
  let text: string | null;
  try {
    text = storage.getItem(key);
  } catch {
    return null;
  }
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    return isPlainObject(value) && value.format === RECORD_FORMAT ? value : null;
  } catch {
    return null;
  }
}

function isOptionalText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function blankCopy(userId: number): CopyRecord {
  return {
    format: 1,
    userId,
    epoch: 1,
    revision: 0,
    contentVersion: null,
    etag: null,
    resetAt: null,
    clockOffsetMs: 0,
    areas: emptyAreas(),
  };
}

function hasCopyHeader(value: Record<string, unknown>): boolean {
  const { epoch, revision, contentVersion, etag, resetAt, clockOffsetMs } = value;
  if (!Number.isSafeInteger(epoch) || !Number.isSafeInteger(revision)) return false;
  if (typeof clockOffsetMs !== 'number') return false;
  return isOptionalText(contentVersion) && isOptionalText(etag) && isOptionalText(resetAt);
}

export function readCopy(storage: StorageLike, userId: number): CopyRecord | null {
  const value = parsed(storage, COPY_KEY);
  if (value === null || value.userId !== userId || !isPlainObject(value.areas)) return null;
  if (!hasCopyHeader(value)) return null;
  const areas = readAreas(value.areas);
  return areas === null ? null : ({ ...value, areas } as unknown as CopyRecord);
}

export function blankQueue(now: Date): QueueRecord {
  return {
    format: 1,
    touchedAt: now.toISOString(),
    operations: [],
    deferred: [],
  };
}

export function readQueue(storage: StorageLike): QueueRecord | null {
  const value = parsed(storage, QUEUE_KEY);
  if (value === null || typeof value.touchedAt !== 'string') return null;
  if (!Array.isArray(value.operations) || !Array.isArray(value.deferred)) return null;
  return value as unknown as QueueRecord;
}

export function readEpochCopy(storage: StorageLike): EpochCopyRecord | null {
  const value = parsed(storage, EPOCH_COPY_KEY);
  if (value === null || !Number.isSafeInteger(value.epoch) || !Array.isArray(value.operations))
    return null;
  return value as unknown as EpochCopyRecord;
}

export function writeRecord(storage: StorageLike, key: string, record: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function removeRecord(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // The space keeps it; the next sign-out or sweep removes it.
  }
}
