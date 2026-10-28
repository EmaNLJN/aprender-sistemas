import { describe, expect, it } from 'vitest';
import { MILESTONE_IDS } from './milestone-ids';

describe('milestone ids', () => {
  it('lists the ten ids persisted in the route progress', () => {
    expect(MILESTONE_IDS).toEqual([
      'rust-memory',
      'rust-commands',
      'rust-files',
      'rust-measure',
      'rust-network',
      'go-memory',
      'go-commands',
      'go-files',
      'go-measure',
      'go-network',
    ]);
  });
});
