import { describe, expect, it } from 'vitest';
import { readXsrfToken } from './read-xsrf-token';

describe('readXsrfToken', () => {
  it('is empty without the cookie', () => {
    expect(readXsrfToken('')).toBe('');
    expect(readXsrfToken('theme=dark')).toBe('');
  });

  it('decodes the value of XSRF-TOKEN among other cookies', () => {
    expect(readXsrfToken('theme=dark; XSRF-TOKEN=eyJpdiI6%3D%3D; lang=es')).toBe('eyJpdiI6==');
  });

  it('does not take a cookie whose name only starts the same', () => {
    expect(readXsrfToken('XSRF-TOKEN-OLD=viejo')).toBe('');
  });

  it('keeps a value that cannot be decoded as it came', () => {
    expect(readXsrfToken('XSRF-TOKEN=abc%E0')).toBe('abc%E0');
  });
});
