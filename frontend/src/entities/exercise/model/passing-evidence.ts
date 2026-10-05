import { isPlainObject } from '../../../shared/lib/is-plain-object';

interface ExpectedTest {
  id: string;
}

// A test counts only with exactly one entry of that id and `passed === true`:
// a duplicate, even if passed, is not unique evidence.
export function testPassed(result: unknown, testId: string): boolean {
  if (!isPlainObject(result) || !Array.isArray(result.tests)) return false;
  const entries = result.tests.filter(
    (candidate: { id?: unknown } | null) => candidate?.id === testId,
  );
  return entries.length === 1 && entries[0].passed === true;
}

// When a compiler result proves an exercise: success without transport error,
// non-empty code and passed evidence for every expected test. With no expected tests
// there is no evidence: an empty list cannot prove anything.
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
