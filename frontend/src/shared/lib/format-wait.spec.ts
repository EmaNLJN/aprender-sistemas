import { describe, expect, it } from 'vitest';
import { formatWait } from './format-wait';

describe('formatWait', () => {
  it.each([
    [0, '1 segundo'],
    [1, '1 segundo'],
    [59, '59 segundos'],
    [60, '1 minuto'],
    [61, '2 minutos'],
    [120, '2 minutos'],
    [3599, '1 hora'],
    [3660, '1 hora y 1 minuto'],
    [30000, '8 horas y 20 minutos'],
  ])('says %i seconds as «%s»', (seconds, text) => {
    expect(formatWait(seconds)).toBe(text);
  });
});
