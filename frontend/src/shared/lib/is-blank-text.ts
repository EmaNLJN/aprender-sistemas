export function isBlankText(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}
