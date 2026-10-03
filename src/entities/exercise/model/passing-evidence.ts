import { isPlainObject } from '../../../shared/lib/is-plain-object';

interface ExpectedTest {
  id: string;
}

// Una prueba cuenta sólo con exactamente una entrada de ese id y `passed === true`:
// un duplicado, aunque esté aprobado, no es evidencia única.
export function testPassed(result: unknown, testId: string): boolean {
  if (!isPlainObject(result) || !Array.isArray(result.tests)) return false;
  const entries = result.tests.filter(
    (candidate: { id?: unknown } | null) => candidate?.id === testId,
  );
  return entries.length === 1 && entries[0].passed === true;
}

// Cuándo un resultado del compilador prueba un ejercicio: éxito sin error de
// transporte, código no vacío y evidencia aprobada por cada prueba esperada.
export function hasPassingEvidence(
  result: unknown,
  expectedTests: readonly ExpectedTest[],
): boolean {
  return (
    isPlainObject(result) &&
    result.success === true &&
    result.transportError !== true &&
    typeof result.code === 'string' &&
    result.code.trim() !== '' &&
    Array.isArray(result.tests) &&
    expectedTests.every((test) => testPassed(result, test.id))
  );
}
