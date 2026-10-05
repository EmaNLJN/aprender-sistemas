import { isPlainObject } from './is-plain-object';

// true if `normalized` keeps all the data of `original` (a freshly parsed JSON value):
// it may append keys or elements, but not remove, change or reorder any.
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
