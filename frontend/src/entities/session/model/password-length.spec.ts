import { describe, expect, it } from 'vitest';
import { checkNewPasswordLength } from './password-length';

describe('checkNewPasswordLength', () => {
  it.each([
    ['14 letters', 'a'.repeat(14), 'Tiene que tener al menos 15 caracteres.'],
    ['15 letters', 'a'.repeat(15), true],
    ['64 letters', 'a'.repeat(64), true],
    ['65 letters', 'a'.repeat(65), 'Puede tener hasta 64 caracteres.'],
    [
      '14 letters and a decomposed «á» (16 UTF-16 units, 15 after NFC)',
      `${'a'.repeat(14)}a\u0301`,
      true,
    ],
    [
      '63 letters and a decomposed «á» (65 code points, 64 after NFC)',
      `${'a'.repeat(63)}a\u0301`,
      true,
    ],
    [
      '13 letters and a decomposed «á» (15 code points, 14 after NFC)',
      `${'a'.repeat(13)}a\u0301`,
      'Tiene que tener al menos 15 caracteres.',
    ],
    ['15 emoji (30 UTF-16 units)', '😀'.repeat(15), true],
    ['14 emoji', '😀'.repeat(14), 'Tiene que tener al menos 15 caracteres.'],
  ])('%s', (_name, value, expected) => {
    expect(checkNewPasswordLength(value)).toBe(expected);
  });
});
