import { describe, expect, it } from 'vitest';
import { formatLocalDateTime } from './format-local-date-time';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

describe('formatLocalDateTime', () => {
  it.each([
    ['2026-10-12T15:30:00.000Z', '12 de octubre de 2026 a las 12:30'],
    ['2026-01-05T03:04:00.000Z', '5 de enero de 2026 a las 00:04'],
  ])('says %s in Buenos Aires as «%s»', (iso, text) => {
    expect(formatLocalDateTime(iso, BUENOS_AIRES)).toBe(text);
  });
});
