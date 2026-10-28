import { fetchSession, sessionStore } from '../../entities/session';
import { requestSignIn } from '../../features/sign-in';
import { apiClient } from '../account/api-client';
import { mountAccountRoot } from '../account/mount-account-root';
import { createTokenStage } from './access-tokens';
import { createSessionGate } from './session-gate';
import { createSessionView } from './session-view';

const SESSION_TIMEOUT_MS = 20_000;
const LOADING_DELAY_MS = 400;

export const tokenStage = createTokenStage({ location: window.location, history: window.history });

export const sessionStage = createSessionGate({
  fetchSession: (request) => fetchSession(apiClient, request),
  storeSession: (snapshot) => sessionStore.getState().applySnapshot(snapshot),
  takeAccessToken: () => tokenStage.take(),
  requestSignIn: (options) => {
    mountAccountRoot();
    return requestSignIn(options);
  },
  onReady: mountAccountRoot,
  view: createSessionView(),
  timeoutMs: SESSION_TIMEOUT_MS,
  loadingDelayMs: LOADING_DELAY_MS,
});
