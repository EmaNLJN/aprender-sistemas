import { describe, expect, it } from 'vitest';
import {
  createMemoryStorage,
  createSpaceStorage,
  keysWithPrefix,
  sweepSpaces,
} from './account-space';

const NOW = Date.UTC(2026, 9, 28, 12);
const DAY = 86_400_000;

function queueText(pending: number, touchedAt: number): string {
  const operations = Array.from({ length: pending }, (_, index) => ({
    id: `op-${index}`,
  }));
  return JSON.stringify({
    format: 1,
    touchedAt: new Date(touchedAt).toISOString(),
    operations,
    deferred: [],
  });
}

describe('the account space', () => {
  it('keeps every key of the account under taller-v2:<id>: (FR-067)', () => {
    const backing = createMemoryStorage();
    const space = createSpaceStorage(41, backing);
    space.setItem('taller-learning-v1', '{}');
    space.setItem('cola', '[]');
    expect(keysWithPrefix(backing, '')).toEqual([
      'taller-v2:41:taller-learning-v1',
      'taller-v2:41:cola',
    ]);
    expect(space.getItem('taller-learning-v1')).toBe('{}');
  });

  it('clears only its own account and can move to another backing in place', () => {
    const backing = createMemoryStorage();
    backing.setItem('taller-v2:7:cola', 'x');
    backing.setItem('taller-learning-v1', 'v1');
    const space = createSpaceStorage(41, backing);
    space.setItem('copia', 'y');
    space.clear();
    expect(keysWithPrefix(backing, '')).toEqual(['taller-v2:7:cola', 'taller-learning-v1']);
    const memory = createMemoryStorage();
    space.switchBacking(memory);
    space.setItem('cola', 'z');
    expect(memory.getItem('taller-v2:41:cola')).toBe('z');
    expect(backing.getItem('taller-v2:41:cola')).toBeNull();
  });
});

describe('sweepSpaces (FR-069)', () => {
  function storageWith(entries: Record<string, string>) {
    const storage = createMemoryStorage();
    for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
    return storage;
  }

  it('removes the synced spaces of other accounts and never the current one', () => {
    const storage = storageWith({
      'taller-v2:7:taller-learning-v1': '{}',
      'taller-v2:7:cola': queueText(0, NOW),
      'taller-v2:41:cola': queueText(0, NOW),
      'taller-v2-compartida:7': '1',
      'taller-v1-importado:7': '{}',
      'taller-learning-v1': '{}',
    });
    expect(sweepSpaces(storage, 41, NOW)).toEqual([7]);
    expect(keysWithPrefix(storage, '')).toEqual([
      'taller-v2:41:cola',
      'taller-v2-compartida:7',
      'taller-v1-importado:7',
      'taller-learning-v1',
    ]);
  });

  it('keeps a space with something unsent until it is 30 days old', () => {
    const storage = storageWith({
      'taller-v2:7:cola': queueText(2, NOW - 29 * DAY),
      'taller-v2:8:cola': queueText(2, NOW - 31 * DAY),
      'taller-v2:9:copia-epoca': '{}',
    });
    expect(sweepSpaces(storage, 41, NOW)).toEqual([8]);
  });

  it('keeps a space whose queue it cannot read', () => {
    const storage = storageWith({ 'taller-v2:7:cola': '{roto' });
    expect(sweepSpaces(storage, 41, NOW)).toEqual([]);
  });
});
