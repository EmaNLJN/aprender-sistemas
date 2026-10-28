import { createStore, type StoreApi } from 'zustand/vanilla';
import type { PublishedUser, SessionFeatures, SessionState } from './types';

const NO_FEATURES: SessionFeatures = { passwordReset: false, registration: false };

export function createSessionStore(): StoreApi<SessionState> {
  return createStore<SessionState>()((set) => ({
    status: 'unknown',
    user: null,
    features: NO_FEATURES,
    contentVersion: null,
    applySnapshot: (snapshot) =>
      set({ ...snapshot, status: snapshot.user === null ? 'signed-out' : 'signed-in' }),
    applyUser: (user) => set({ user, status: 'signed-in' }),
  }));
}

export const sessionStore = createSessionStore();

export function selectReadyAccount(state: SessionState): PublishedUser | null {
  return state.user !== null && state.user.privacyAccepted ? state.user : null;
}
