import type { DataInstruction } from './types';

export const storeSuffix = (instruction: DataInstruction): string =>
  instruction.op === 'STORE' ? ` ← ${instruction.value}` : '';

export const virtualPageOf = (va: number): number => Math.floor(va / 4);
