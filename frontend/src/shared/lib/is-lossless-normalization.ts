import { isPlainObject } from './is-plain-object';

// true si `normalized` conserva todos los datos de `original` (un valor JSON recién parseado):
// puede agregar claves u elementos al final, pero no quitar, cambiar ni reordenar ninguno.
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
