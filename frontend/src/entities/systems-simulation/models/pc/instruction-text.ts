import type { DataInstruction } from './types';

// « ← valor» accompanies only a STORE; a LOAD carries no suffix.
export const storeSuffix = (instruction: DataInstruction): string =>
  instruction.op === 'STORE' ? ` ← ${instruction.value}` : '';

export const virtualPageOf = (va: number): number => Math.floor(va / 4);
