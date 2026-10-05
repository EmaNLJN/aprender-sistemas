// A blank text (non-string, empty or whitespace only) does not replace the local one when merging.
export function isBlankText(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}
