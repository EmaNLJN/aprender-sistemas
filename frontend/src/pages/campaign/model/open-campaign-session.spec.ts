import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { campaignEngine, type CampaignConfig } from '../../../entities/campaign';
import type { StorageLike } from '../../../shared/lib/versioned-storage';
import { openCampaignSession } from './open-campaign-session';

const LEVELS = ['beginner', 'medium', 'advanced', 'expert'] as const;

function worldsFor(language: 'rust' | 'go') {
  return LEVELS.map((level, index) => ({
    id: `${language}-world-${index + 1}`,
    level,
    title: `${language} world ${index + 1}`,
    badge: `Badge ${index + 1}`,
    trainingIds: [1, 2, 3].map((n) => `${language}-${index * 6 + n}`),
    challengeIds: [4, 5, 6].map((n) => `${language}-${index * 6 + n}`),
    bossId: `${language}-${index * 6 + 6}`,
    checkpoint: {
      question: 'Why?',
      options: ['Because of a rule', 'By chance'],
      answer: 0,
      explanation: 'The rule keeps the contract.',
    },
  }));
}

function handMadeConfig(): CampaignConfig {
  const exercises = (['rust', 'go'] as const).flatMap((language) =>
    Array.from({ length: 25 }, (_, index) => ({
      id: `${language}-${index + 1}`,
      language,
      title: `${language} exercise ${index + 1}`,
      tests: ['t1', 't2', 't3'].map((id) => ({ id })),
    })),
  );
  return { exercises, worlds: { rust: worldsFor('rust'), go: worldsFor('go') } };
}

describe('openCampaignSession', () => {
  let setItem: Mock<StorageLike['setItem']>;
  let removeItem: Mock<StorageLike['removeItem']>;

  beforeEach(() => {
    const items = new Map<string, string>();
    setItem = vi.fn<StorageLike['setItem']>((key, value) => void items.set(key, value));
    removeItem = vi.fn<StorageLike['removeItem']>((key) => void items.delete(key));
    const storage: StorageLike = {
      getItem: (key) => items.get(key) ?? null,
      setItem,
      removeItem,
    };
    vi.stubGlobal('localStorage', storage);
    campaignEngine.init(handMadeConfig());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the first unfinished world of the language when nothing is linked', () => {
    const opened = openCampaignSession({ selected: null, filter: 'all' }, 'rust', null);

    expect(opened.selected).toBe('rust-world-1');
  });

  it('ignores a link to a world of the other language', () => {
    const opened = openCampaignSession({ selected: null, filter: 'all' }, 'rust', 'go-world-1');

    expect(opened.selected).toBe('rust-world-1');
  });

  it('drops a remembered world of the other language', () => {
    const opened = openCampaignSession({ selected: 'rust-world-1', filter: 'all' }, 'go', null);

    expect(opened.selected).toBe('go-world-1');
  });

  it('keeps the filter it receives', () => {
    const opened = openCampaignSession({ selected: null, filter: 'Kata' }, 'rust', null);

    expect(opened.filter).toBe('Kata');
  });

  it('writes nothing to storage', () => {
    openCampaignSession({ selected: 'rust-world-1', filter: 'Kata' }, 'go', 'go-world-2');

    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });
});
