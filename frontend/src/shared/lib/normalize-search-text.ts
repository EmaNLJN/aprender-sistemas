export function normalizeSearchText(value: unknown): string {
  return String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
