// Un texto en blanco (no string, vacío o sólo espacios) no reemplaza al local al fusionar.
export function isBlankText(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}
