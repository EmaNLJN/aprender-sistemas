import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { SPACE_LIFETIME_MS } from './sync-limits';

export const SPACE_PREFIX = 'taller-v2:';
export const SHARED_MODE_PREFIX = 'taller-v2-compartida:';
export const COPY_KEY = 'copia';
export const QUEUE_KEY = 'cola';
export const EPOCH_COPY_KEY = 'copia-epoca';

export interface EnumerableStorage extends StorageLike {
  readonly length: number;
  key(index: number): string | null;
}

export interface SpaceStorage extends StorageLike {
  switchBacking(backing: EnumerableStorage): void;
  clear(): void;
}

export function spacePrefix(userId: number): string {
  return `${SPACE_PREFIX}${userId}:`;
}

export function keysWithPrefix(storage: EnumerableStorage, prefix: string): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key !== null && key.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

export function createMemoryStorage(): EnumerableStorage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, String(value));
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

export function createSpaceStorage(userId: number, initial: EnumerableStorage): SpaceStorage {
  const prefix = spacePrefix(userId);
  let backing = initial;
  return {
    getItem: (key) => backing.getItem(prefix + key),
    setItem: (key, value) => backing.setItem(prefix + key, value),
    removeItem: (key) => backing.removeItem(prefix + key),
    switchBacking(next) {
      backing = next;
    },
    clear() {
      for (const key of keysWithPrefix(backing, prefix)) backing.removeItem(key);
    },
  };
}

function idOf(key: string): number | null {
  const rest = key.slice(SPACE_PREFIX.length);
  const id = Number(rest.slice(0, rest.indexOf(':')));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

type SpaceFate = 'remove' | 'keep';

interface StoredQueue {
  readonly pending: number;
  readonly touchedAt: number;
}

function storedQueueOf(text: string): StoredQueue | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const record = value as { operations?: unknown; deferred?: unknown; touchedAt?: unknown };
  if (!Array.isArray(record.operations) || !Array.isArray(record.deferred)) return null;
  const touchedAt = typeof record.touchedAt === 'string' ? Date.parse(record.touchedAt) : NaN;
  return { pending: record.operations.length + record.deferred.length, touchedAt };
}

function fateOf(storage: EnumerableStorage, prefix: string, now: number): SpaceFate {
  const queueText = storage.getItem(prefix + QUEUE_KEY);
  const hasEpochCopy = storage.getItem(prefix + EPOCH_COPY_KEY) !== null;
  if (queueText === null) return hasEpochCopy ? 'keep' : 'remove';
  const queue = storedQueueOf(queueText);
  if (queue === null) return 'keep';
  if (queue.pending === 0 && !hasEpochCopy) return 'remove';
  const expired = !Number.isNaN(queue.touchedAt) && now - queue.touchedAt > SPACE_LIFETIME_MS;
  return expired ? 'remove' : 'keep';
}

// FR-069: the spaces of other accounts go when they are synced or expired (30 days). An unreadable
// queue stays: nobody can tell whether it holds something that was not sent.
export function sweepSpaces(
  storage: EnumerableStorage,
  currentUserId: number,
  now: number,
): number[] {
  const others = new Set<number>();
  for (const key of keysWithPrefix(storage, SPACE_PREFIX)) {
    const id = idOf(key);
    if (id !== null && id !== currentUserId) others.add(id);
  }
  const swept: number[] = [];
  for (const id of others) {
    const prefix = spacePrefix(id);
    if (fateOf(storage, prefix, now) === 'keep') continue;
    for (const key of keysWithPrefix(storage, prefix)) storage.removeItem(key);
    swept.push(id);
  }
  return swept;
}

export function sharedModeKey(userId: number): string {
  return `${SHARED_MODE_PREFIX}${userId}`;
}
