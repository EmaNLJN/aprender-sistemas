import { describe, expect, it } from 'vitest';
import { uuidV4 } from './uuid-v4';

describe('uuidV4', () => {
  it('sets the version and variant bits of RFC 9562 over the random bytes', () => {
    expect(uuidV4((bytes) => bytes.fill(0))).toBe('00000000-0000-4000-8000-000000000000');
    expect(uuidV4((bytes) => bytes.fill(255))).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });
});
