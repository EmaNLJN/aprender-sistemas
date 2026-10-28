import type { Exercise } from './types';

export const liveHint: (code: string, exercise: Pick<Exercise, 'review'>) => string = () => {
  throw new Error('not implemented');
};
