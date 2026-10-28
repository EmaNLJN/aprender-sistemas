import { describe, expect, it } from 'vitest';
import { CODE_XP, PASS_SCORE, PREDICTION_XP, WORLD_MAX_SCORE, missionTypeLabel } from '.';

describe('campaign constants', () => {
  it('exposes the XP awards, the pass score and the world maximum', () => {
    expect(CODE_XP).toBe(20);
    expect(PREDICTION_XP).toBe(10);
    expect(PASS_SCORE).toBe(150);
    expect(WORLD_MAX_SCORE).toBe(180);
  });

  it('exposes the mission type label through the slice index', () => {
    expect(missionTypeLabel('kata')).toBe('Kata');
  });
});
