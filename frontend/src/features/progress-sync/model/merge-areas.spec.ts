import { describe, expect, it } from 'vitest';
import { mergeAreas } from './merge-areas';
import { areasWith, exerciseRowFactory } from './server-rows.factory';

describe('mergeAreas', () => {
  const stored = areasWith({
    exercises: [
      exerciseRowFactory.build({ exerciseId: 'rust-01', revision: 4 }),
      exerciseRowFactory.build({ exerciseId: 'rust-02', revision: 2 }),
    ],
  });

  it('replaces the copy with a full photo', () => {
    const photo = areasWith({
      exercises: [exerciseRowFactory.build({ exerciseId: 'go-01', revision: 9 })],
    });
    expect(mergeAreas(stored, photo, true)).toBe(photo);
  });

  it('upserts delta rows by key and never brings back an older revision', () => {
    const delta = areasWith({
      exercises: [
        exerciseRowFactory.build({
          exerciseId: 'rust-01',
          revision: 3,
          attemptCount: 7,
        }),
        exerciseRowFactory.build({
          exerciseId: 'rust-02',
          revision: 5,
          attemptCount: 1,
        }),
      ],
    });
    const merged = mergeAreas(stored, delta, false);
    expect(merged.exercises.map((row) => [row.exerciseId, row.revision, row.attemptCount])).toEqual(
      [
        ['rust-01', 4, 0],
        ['rust-02', 5, 1],
      ],
    );
  });
});
