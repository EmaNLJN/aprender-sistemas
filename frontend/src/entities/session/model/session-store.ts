import type { StoreApi } from 'zustand/vanilla';
import type { PublishedUser, SessionState } from './types';

export function createSessionStore(): StoreApi<SessionState> {
  throw new Error('not implemented');
}

export const sessionStore = createSessionStore();

export function selectReadyAccount(_state: SessionState): PublishedUser | null {
  throw new Error('not implemented');
}
