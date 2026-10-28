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

function needsAccess(snapshot: SessionSnapshot, token: AccessToken | null): boolean {
  if (token !== null) return true;
  return snapshot.user === null || !snapshot.user.privacyAccepted;
}

// One request. Its timers do nothing once it has settled: the harness of boot-check runs every
// queued timer on flush() and never cancels one.
async function requestOnce(
  options: SessionGateOptions,
  showLoadingAfterDelay: boolean,
): Promise<SessionOutcome> {
  const controller = new AbortController();
  let settled = false;
  const loadingTimer = showLoadingAfterDelay
    ? setTimeout(() => {
        if (!settled) options.view.showLoading();
      }, options.loadingDelayMs)
    : undefined;
  const capTimer = setTimeout(() => {
    if (!settled) controller.abort();
  }, options.timeoutMs);
  try {
    return await options.fetchSession({ signal: controller.signal });
  } finally {
    settled = true;
    clearTimeout(loadingTimer);
    clearTimeout(capTimer);
  }
}

export function createSessionGate(options: SessionGateOptions): BootStage {
  return {
    name: 'sessionStage',
    run: () =>
      new Promise<void>((resolve) => {
        let token = options.takeAccessToken();
        let inFlight = false;

        async function attempt(showLoadingAfterDelay: boolean): Promise<void> {
          if (inFlight) return;
          inFlight = true;
          const outcome = await requestOnce(options, showLoadingAfterDelay);
          inFlight = false;
          if (outcome.kind !== 'session') {
            options.view.showFailure(outcome, retry);
            return;
          }
          options.view.clear();
          options.storeSession(outcome.snapshot);
          if (needsAccess(outcome.snapshot, token)) {
            const pendingToken = token;
            token = null;
            await options.requestSignIn({
              presentation: 'page',
              reason: 'boot',
              token: pendingToken,
            });
            void attempt(true);
            return;
          }
          options.onReady();
          resolve();
        }

        function retry(): void {
          if (inFlight) return;
          options.view.showLoading();
          void attempt(false);
        }

        void attempt(true);
      }),
  };
}
