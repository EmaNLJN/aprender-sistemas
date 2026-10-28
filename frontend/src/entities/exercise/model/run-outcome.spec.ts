import { describe, expect, it } from 'vitest';
import { readTestMarkers } from './run-outcome';

describe('readTestMarkers', () => {
  it('reads one verdict per marker line, the custom test included', () => {
    expect(
      readTestMarkers(
        'hola\n__TALLER_TEST__t1:PASS\n__TALLER_TEST__t2:FAIL\n__TALLER_TEST__custom:PASS\n',
      ),
    ).toEqual(
      new Map([
        ['t1', true],
        ['t2', false],
        ['custom', true],
      ]),
    );
  });

  it('a repeated id never passes, even if both lines say PASS', () => {
    expect(readTestMarkers('__TALLER_TEST__t1:PASS\n__TALLER_TEST__t1:PASS\n').get('t1')).toBe(
      false,
    );
  });

  it('a marker inside a line or with a nonce is not a marker', () => {
    expect(readTestMarkers('x __TALLER_TEST__t1:PASS\n__TALLER_TEST__abc:t1:PASS\n').size).toBe(0);
  });
});
