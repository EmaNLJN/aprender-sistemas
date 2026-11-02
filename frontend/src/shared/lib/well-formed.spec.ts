import { describe, expect, it } from 'vitest';
import { wellFormed, wellFormedDeep } from './well-formed';

describe('wellFormed', () => {
  it('replaces each lone surrogate with U+FFFD and keeps pairs (MDN, toWellFormed)', () => {
    expect(wellFormed('ab\uD800')).toBe('ab�');
    expect(wellFormed('\uDFFFab')).toBe('�ab');
    expect(wellFormed('ab😄c')).toBe('ab😄c');
    expect(wellFormed('\uD800𐀀')).toBe('�𐀀');
  });

  it('walks objects and lists', () => {
    expect(wellFormedDeep({ notes: ['a\uD800'], n: 1 })).toEqual({
      notes: ['a�'],
      n: 1,
    });
  });
});
