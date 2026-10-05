export const cellKey = (row: number, column: number): string => row + ',' + column;

export const sameJson = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

export const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
