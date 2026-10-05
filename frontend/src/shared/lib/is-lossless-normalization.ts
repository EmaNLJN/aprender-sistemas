import { isPlainObject } from './is-plain-object';

export function isLosslessNormalization(original: unknown, normalized: unknown): boolean {
  if (Array.isArray(original)) {
    return (
      Array.isArray(normalized) &&
      original.every((item, index) => isLosslessNormalization(item, normalized[index]))
    );
  }
  if (isPlainObject(original)) {
    return (
      isPlainObject(normalized) &&
      Object.keys(original).every(
        (key) =>
          Object.hasOwn(normalized, key) && isLosslessNormalization(original[key], normalized[key]),
      )
    );
  }
  return original === normalized;
}
