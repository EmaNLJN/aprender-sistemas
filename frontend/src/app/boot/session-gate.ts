import type { SessionOutcome, SessionSnapshot } from '../../entities/session';
import type { AccessToken, RequestSignIn } from '../../features/sign-in';
import type { BootStage } from './run-boot';
import type { SessionView } from './session-view';

export interface SessionGateOptions {
  readonly fetchSession: (request: { readonly signal: AbortSignal }) => Promise<SessionOutcome>;
  readonly storeSession: (snapshot: SessionSnapshot) => void;
  readonly takeAccessToken: () => AccessToken | null;
  readonly requestSignIn: RequestSignIn;
  readonly onReady: () => void;
  readonly view: SessionView;
  readonly timeoutMs: number;
  readonly loadingDelayMs: number;
}

export function createSessionGate(_options: SessionGateOptions): BootStage {
  throw new Error('not implemented');
}
