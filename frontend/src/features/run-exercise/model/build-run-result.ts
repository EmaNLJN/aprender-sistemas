import type { LabResultV1 } from '../../../entities/exercise';
import type { RunVerdict } from './transport';

export interface RunContext {
  code: string;
  customTest: string;
  now: number;
}

export const buildRunResult: (
  exercise: { readonly tests: readonly { readonly id: string }[] },
  verdict: RunVerdict,
  context: RunContext,
) => LabResultV1 = () => {
  throw new Error('not implemented');
};
