import { isPlainObject } from '../../../shared/lib/is-plain-object';

interface ExpectedTest {
  id: string;
}

export function testPassed(result: unknown, testId: string): boolean {
  if (!isPlainObject(result) || !Array.isArray(result.tests)) return false;
  const entries = result.tests.filter(
    (candidate: { id?: unknown } | null) => candidate?.id === testId,
  );
  return entries.length === 1 && entries[0].passed === true;
}

export function hasPassingEvidence(
  result: unknown,
  expectedTests: readonly ExpectedTest[],
): boolean {
  return (
    expectedTests.length > 0 &&
    isPlainObject(result) &&
    result.success === true &&
    result.transportError !== true &&
    typeof result.code === 'string' &&
    result.code.trim() !== '' &&
    Array.isArray(result.tests) &&
    expectedTests.every((test) => testPassed(result, test.id))
  );
}
