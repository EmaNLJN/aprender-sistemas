import { describe, expect, it } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import {
  MISSION_FILTERS,
  campaignCounts,
  matchesMissionFilter,
  missionTypeLabel,
  rankName,
  rankSymbol,
  worldMapStatus,
  worldState,
  worldStateName,
  worldSymbol,
} from '..';

function handmadeWorld(): { missionIds: string[]; challengeIds: string[] } {
  return {
    missionIds: ['a', 'b', 'c', 'd', 'e', 'f'],
    challengeIds: ['d', 'e', 'f'],
  };
}

describe('rankName', () => {
  it('names the five ranks by completed worlds', () => {
    expect([0, 1, 2, 3, 4].map(rankName)).toEqual([
      'Explorador',
      'Aprendiz de sistemas',
      'Constructor',
      'Arquitecto',
      'Maestro del taller',
    ]);
  });
});

describe('rankSymbol', () => {
  it('uses the symbol of each world and keeps the last one for the top rank', () => {
    expect([0, 1, 2, 3, 4].map(rankSymbol)).toEqual(['⌘', '◈', '⌁', '✳', '✳']);
  });
});

describe('worldSymbol', () => {
  it('gives each of the four worlds its symbol', () => {
    expect([0, 1, 2, 3].map(worldSymbol)).toEqual(['⌘', '◈', '⌁', '✳']);
  });
});

describe('worldState', () => {
  it('is complete, available or locked', () => {
    expect(worldState({ completed: true, unlocked: true })).toBe('complete');
    expect(worldState({ completed: false, unlocked: true })).toBe('available');
    expect(worldState({ completed: false, unlocked: false })).toBe('locked');
  });

  it('names each state for the screen reader', () => {
    expect(worldStateName('complete')).toBe('completado');
    expect(worldStateName('available')).toBe('disponible');
    expect(worldStateName('locked')).toBe('bloqueado; ver requisitos');
  });
});

describe('worldMapStatus', () => {
  it('announces the badge of a completed world', () => {
    expect(worldMapStatus({ completed: true, unlocked: true, score: 180, maxScore: 180 })).toBe(
      'Insignia conseguida',
    );
  });

  it('shows the score of an open world against its own maximum', () => {
    expect(worldMapStatus({ completed: false, unlocked: true, score: 45, maxScore: 180 })).toBe(
      '45/180 XP · explorar →',
    );
    expect(worldMapStatus({ completed: false, unlocked: true, score: 45, maxScore: 99 })).toBe(
      '45/99 XP · explorar →',
    );
  });

  it('points a locked world to its requirements', () => {
    expect(worldMapStatus({ completed: false, unlocked: false, score: 0, maxScore: 180 })).toBe(
      'Bloqueado · ver requisitos',
    );
  });
});

describe('missionTypeLabel', () => {
  it('labels each challenge type and defaults to training', () => {
    expect(missionTypeLabel('boss')).toBe('Desafío final');
    expect(missionTypeLabel('repair')).toBe('Reparación · lings');
    expect(missionTypeLabel('kata')).toBe('Kata');
    expect(missionTypeLabel(undefined)).toBe('Entrenamiento');
  });
});

describe('matchesMissionFilter', () => {
  it('lists the filters in screen order', () => {
    expect(MISSION_FILTERS).toEqual([
      'all',
      'Entrenamiento',
      'Reparación',
      'Kata',
      'Desafío final',
    ]);
  });

  it('matches by label prefix and always for all', () => {
    expect(matchesMissionFilter('Reparación · lings', 'Reparación')).toBe(true);
    expect(matchesMissionFilter('Entrenamiento', 'all')).toBe(true);
    expect(matchesMissionFilter('Desafío final', 'Desafío final')).toBe(true);
  });

  it('rejects other labels', () => {
    expect(matchesMissionFilter('Kata', 'Reparación')).toBe(false);
    expect(matchesMissionFilter('Kata', 'Entrenamiento')).toBe(false);
  });
});

describe('campaignCounts', () => {
  it('adds worlds, missions and new challenges', () => {
    expect(campaignCounts([handmadeWorld(), handmadeWorld()])).toEqual({
      worlds: 2,
      missions: 12,
      newChallenges: 6,
    });
  });

  it('is all zeros without worlds', () => {
    expect(campaignCounts([])).toEqual({ worlds: 0, missions: 0, newChallenges: 0 });
  });

  it.each([
    ['rust', curriculum.campaign.rust],
    ['go', curriculum.campaign.go],
  ])(
    'counts four worlds, 24 missions and 12 new challenges in the %s catalog',
    (_language, worlds) => {
      const catalog = worlds.map((world) => ({
        challengeIds: world.challengeIds,
        missionIds: [...world.trainingIds, ...world.challengeIds],
      }));

      expect(campaignCounts(catalog)).toEqual({ worlds: 4, missions: 24, newChallenges: 12 });
    },
  );
});
