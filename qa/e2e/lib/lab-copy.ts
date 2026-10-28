// The texts of the lab review that A4 changes (A4 FR-038 hides the number of attempts): one place to edit.
export function attemptsLine(count: number): string {
  return `${count} intento${count === 1 ? '' : 's'}. Revisar es parte de aprender.`;
}
