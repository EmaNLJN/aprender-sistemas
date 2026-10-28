import { describe, expect, it } from 'vitest';
import {
  createCampaignSession,
  resolveSelectedWorld,
  selectWorld,
  setMissionFilter,
  type CampaignSession,
} from './campaign-session';

const worlds = [
  { id: 'A', unlocked: true, completed: true },
  { id: 'B', unlocked: true, completed: false },
  { id: 'C', unlocked: false, completed: false },
];

describe('campaign session', () => {
  it('starts with no world selected and every mission shown', () => {
    expect(createCampaignSession()).toEqual({ selected: null, filter: 'all' });
  });

  it('selecting a world resets the mission filter', () => {
    const session: CampaignSession = { selected: 'a', filter: 'Kata' };

    expect(selectWorld(session, 'b')).toEqual({ selected: 'b', filter: 'all' });
  });

  it('selecting a world does not modify the session it receives', () => {
    const session: CampaignSession = { selected: 'a', filter: 'Kata' };

    selectWorld(session, 'b');

    expect(session).toEqual({ selected: 'a', filter: 'Kata' });
  });

  it('setting the filter keeps the selected world', () => {
    const session: CampaignSession = { selected: 'a', filter: 'all' };

    expect(setMissionFilter(session, 'Kata')).toEqual({ selected: 'a', filter: 'Kata' });
  });
});

describe('resolveSelectedWorld', () => {
  it('prefers a linked world over the remembered one, even if it is locked', () => {
    expect(resolveSelectedWorld(worlds, 'A', 'C')).toBe('C');
  });

  it('keeps the remembered world when the link is unknown', () => {
    expect(resolveSelectedWorld(worlds, 'A', 'nada')).toBe('A');
  });

  it('opens the first unlocked unfinished world when the remembered one belongs to another language', () => {
    expect(resolveSelectedWorld(worlds, 'go-world-1', null)).toBe('B');
  });

  it('opens the first unlocked unfinished world with no link and nothing remembered', () => {
    expect(resolveSelectedWorld(worlds, null, null)).toBe('B');
  });

  it('opens the first world when all are completed or locked', () => {
    const closed = [
      { id: 'A', unlocked: true, completed: true },
      { id: 'C', unlocked: false, completed: false },
    ];

    expect(resolveSelectedWorld(closed, null, null)).toBe('A');
  });

  it('returns null when there are no worlds', () => {
    expect(resolveSelectedWorld([], 'A', 'B')).toBeNull();
  });
});
