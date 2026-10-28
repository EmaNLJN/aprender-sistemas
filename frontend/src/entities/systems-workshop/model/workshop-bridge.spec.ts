import { describe, expect, it } from 'vitest';
import {
  workshopExerciseRole,
  workshopMissionIds,
  workshopReturnTarget,
  type BridgeWorkshop,
} from './workshop-bridge';

const cache: BridgeWorkshop = {
  code: { rust: 'rust-113', go: 'go-137' },
  related: { rust: ['rust-31', 'rust-35'] },
};

describe('workshopMissionIds', () => {
  it('lists the previous tools first and the core last', () => {
    expect(workshopMissionIds(cache, 'rust')).toEqual(['rust-31', 'rust-35', 'rust-113']);
  });

  it('does not repeat a core that the related list already has', () => {
    const workshop = { code: { rust: 'x' }, related: { rust: ['a', 'x'] } };

    expect(workshopMissionIds(workshop, 'rust')).toEqual(['a', 'x']);
  });

  it('is empty without a workshop', () => {
    expect(workshopMissionIds(undefined, 'rust')).toEqual([]);
  });

  it('is only the core for a language without related tools', () => {
    expect(workshopMissionIds(cache, 'go')).toEqual(['go-137']);
  });
});

describe('workshopExerciseRole', () => {
  it('is core for the core exercise', () => {
    expect(workshopExerciseRole(cache, 'rust-113', 'rust')).toBe('core');
  });

  it('is tool for a previous tool', () => {
    expect(workshopExerciseRole(cache, 'rust-31', 'rust')).toBe('tool');
  });

  it('is null for an exercise that does not belong to the workshop', () => {
    expect(workshopExerciseRole(cache, 'rust-01', 'rust')).toBeNull();
  });

  it('is null for the Go core asked in Rust', () => {
    expect(workshopExerciseRole(cache, 'go-137', 'rust')).toBeNull();
  });

  it('is null without a workshop', () => {
    expect(workshopExerciseRole(undefined, 'rust-113', 'rust')).toBeNull();
  });
});

describe('workshopReturnTarget', () => {
  it('goes back to the build part in Go', () => {
    expect(workshopReturnTarget('cache', 'go')).toEqual({
      workshopId: 'cache',
      part: 'build',
      language: 'go',
    });
  });

  it('falls back to Rust for any other language', () => {
    expect(workshopReturnTarget('cache', 'otro').language).toBe('rust');
    expect(workshopReturnTarget('cache', 'rust').language).toBe('rust');
  });
});
