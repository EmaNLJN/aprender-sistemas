// Tells data objects (progress records) apart from null, arrays and primitives.
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
