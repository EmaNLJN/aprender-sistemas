// Distingue objetos de datos (registros del progreso) de null, arreglos y primitivos.
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
