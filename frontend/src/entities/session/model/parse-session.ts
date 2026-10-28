import type { PublishedUser, SessionSnapshot } from './types';

export function parsePublishedUser(_value: unknown): PublishedUser | null {
  throw new Error('not implemented');
}

export function parseSessionBody(_body: unknown): SessionSnapshot | null {
  throw new Error('not implemented');
}
