import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublishedUser, SessionOutcome, SessionSnapshot } from '../../entities/session';
import type { AccessToken, RequestSignIn } from '../../features/sign-in';
import { createSessionGate, type SessionGateOptions } from './session-gate';
import type { SessionView } from './session-view';

const ANA: PublishedUser = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
};
const INVITATION: AccessToken = { kind: 'invitation', token: 'k3J8' };

function snapshotOf(user: PublishedUser | null): SessionSnapshot {
  return { user, features: { passwordReset: false, registration: false }, contentVersion: 'v1' };
}

function sessionOf(user: PublishedUser | null): SessionOutcome {
  return { kind: 'session', snapshot: snapshotOf(user) };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

function answerThenHang(first: SessionOutcome) {
  let calls = 0;
  return vi.fn(({ signal }: { readonly signal: AbortSignal }) => {
    calls += 1;
    if (calls === 1) return Promise.resolve(first);
    return new Promise<SessionOutcome>((resolve) => {
      signal.addEventListener('abort', () => resolve({ kind: 'unreachable' }));
    });
  });
}

function setup(
  outcomes: readonly (SessionOutcome | Promise<SessionOutcome>)[],
  overrides: Partial<SessionGateOptions> = {},
) {
  let index = 0;
  const fetchSession = vi.fn(async () => {
    const next = outcomes[Math.min(index, outcomes.length - 1)];
    index += 1;
    if (next === undefined) throw new Error('no outcome');
    return next;
  });
  const signIn = deferred<PublishedUser>();
  const view = {
    showLoading: vi.fn<SessionView['showLoading']>(),
    showFailure: vi.fn<SessionView['showFailure']>(),
    clear: vi.fn<SessionView['clear']>(),
  };
  const options: SessionGateOptions = {
    fetchSession,
    storeSession: vi.fn(),
    takeAccessToken: vi.fn(() => null),
    requestSignIn: vi.fn<RequestSignIn>(() => signIn.promise),
    onReady: vi.fn(),
    view,
    timeoutMs: 20_000,
    loadingDelayMs: 400,
    ...overrides,
  };
  let resolved = false;
  const finished = createSessionGate(options)
    .run()
    .then(() => {
      resolved = true;
    });
  return { options, view, fetchSession, signIn, finished, isResolved: () => resolved };
}

const flush = () => vi.advanceTimersByTimeAsync(0);

describe('the session stage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('asks for the session once and resolves when the account is ready', async () => {
    const { options, fetchSession, finished } = setup([sessionOf(ANA)]);
    await finished;
    expect(fetchSession).toHaveBeenCalledOnce();
    expect(options.storeSession).toHaveBeenCalledWith(snapshotOf(ANA));
    expect(options.onReady).toHaveBeenCalledOnce();
    expect(options.requestSignIn).not.toHaveBeenCalled();
  });

  it('leaves no timer acting after a fast answer, even where clearTimeout cancels nothing', async () => {
    vi.spyOn(globalThis, 'clearTimeout').mockImplementation(() => undefined);
    const { view, finished } = setup([sessionOf(ANA)]);
    await finished;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(view.showLoading).not.toHaveBeenCalled();
    expect(view.showFailure).not.toHaveBeenCalled();
  });

  it('says it is connecting after 400 ms, and clears it when the session arrives', async () => {
    const pending = deferred<SessionOutcome>();
    const { view, finished } = setup([pending.promise]);
    await vi.advanceTimersByTimeAsync(399);
    expect(view.showLoading).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(view.showLoading).toHaveBeenCalledOnce();
    pending.resolve(sessionOf(ANA));
    await finished;
    expect(view.clear).toHaveBeenCalledOnce();
  });

  it('without an account asks for the sign-in as a page and then asks for the session once more', async () => {
    const { options, fetchSession, signIn, finished, isResolved } = setup([
      sessionOf(null),
      sessionOf(ANA),
    ]);
    await flush();
    expect(options.requestSignIn).toHaveBeenCalledWith({
      presentation: 'page',
      reason: 'boot',
      token: null,
    });
    expect(isResolved()).toBe(false);
    signIn.resolve(ANA);
    await finished;
    expect(fetchSession).toHaveBeenCalledTimes(2);
    expect(options.onReady).toHaveBeenCalledOnce();
  });

  it('fires no cap while a sign-in lasts longer than the cap', async () => {
    const { options, view, fetchSession, signIn, finished, isResolved } = setup([
      sessionOf(null),
      sessionOf(ANA),
    ]);
    await flush();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(isResolved()).toBe(false);
    expect(options.onReady).not.toHaveBeenCalled();
    expect(view.showFailure).not.toHaveBeenCalled();
    expect(view.showLoading).not.toHaveBeenCalled();
    expect(fetchSession).toHaveBeenCalledOnce();
    signIn.resolve(ANA);
    await finished;
    expect(options.onReady).toHaveBeenCalledOnce();
  });

  it('gives the request after a long sign-in its own wait and its whole cap', async () => {
    const fetchSession = answerThenHang(sessionOf(null));
    const { view, signIn } = setup([], { fetchSession });
    await flush();
    await vi.advanceTimersByTimeAsync(120_000);
    signIn.resolve(ANA);
    await flush();
    expect(fetchSession).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(400);
    expect(view.showLoading).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(19_599);
    expect(view.showFailure).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(view.showFailure).toHaveBeenCalledWith({ kind: 'unreachable' }, expect.any(Function));
  });

  it('with a token asks for the access even with a live session, and only once', async () => {
    const takeAccessToken = vi
      .fn<() => AccessToken | null>()
      .mockReturnValueOnce(INVITATION)
      .mockReturnValue(null);
    const { options, signIn, finished } = setup([sessionOf(ANA), sessionOf(ANA)], {
      takeAccessToken,
    });
    await flush();
    expect(options.requestSignIn).toHaveBeenCalledWith({
      presentation: 'page',
      reason: 'boot',
      token: INVITATION,
    });
    signIn.resolve(ANA);
    await finished;
    expect(options.requestSignIn).toHaveBeenCalledOnce();
  });

  it('keeps the token of the link through a failure and a retry', async () => {
    const takeAccessToken = vi
      .fn<() => AccessToken | null>()
      .mockReturnValueOnce(INVITATION)
      .mockReturnValue(null);
    const { options, view } = setup([{ kind: 'unreachable' }, sessionOf(ANA)], {
      takeAccessToken,
    });
    await flush();
    const retry = view.showFailure.mock.calls[0]?.[1];
    retry?.();
    await flush();
    expect(options.requestSignIn).toHaveBeenCalledWith({
      presentation: 'page',
      reason: 'boot',
      token: INVITATION,
    });
  });

  it('asks for the access when the account has not accepted the current notice', async () => {
    const pendingNotice = snapshotOf({ ...ANA, privacyAccepted: false });
    const { options, signIn, finished } = setup([
      { kind: 'session', snapshot: pendingNotice },
      sessionOf(ANA),
    ]);
    await flush();
    expect(options.storeSession).toHaveBeenCalledWith(pendingNotice);
    expect(options.requestSignIn).toHaveBeenCalledOnce();
    signIn.resolve(ANA);
    await finished;
    expect(options.onReady).toHaveBeenCalledOnce();
  });

  it('shows the failure when the session does not answer, and retries on demand', async () => {
    const { view, fetchSession, finished } = setup([{ kind: 'unreachable' }, sessionOf(ANA)]);
    await flush();
    expect(view.showFailure).toHaveBeenCalledWith({ kind: 'unreachable' }, expect.any(Function));
    const retry = view.showFailure.mock.calls[0]?.[1];
    retry?.();
    expect(view.showLoading).toHaveBeenCalledOnce();
    await finished;
    expect(fetchSession).toHaveBeenCalledTimes(2);
  });

  it('aborts the request and fails after the 20 s cap', async () => {
    const fetchSession = vi.fn(
      ({ signal }: { readonly signal: AbortSignal }) =>
        new Promise<SessionOutcome>((resolve) => {
          signal.addEventListener('abort', () => resolve({ kind: 'unreachable' }));
        }),
    );
    const { view } = setup([], { fetchSession });
    await vi.advanceTimersByTimeAsync(19_999);
    expect(view.showFailure).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(view.showFailure).toHaveBeenCalledWith({ kind: 'unreachable' }, expect.any(Function));
  });

  it('passes a rate limit to the view', async () => {
    const limited: SessionOutcome = {
      kind: 'rate-limited',
      message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
      retryAfterSeconds: 30,
    };
    const { view } = setup([limited]);
    await flush();
    expect(view.showFailure).toHaveBeenCalledWith(limited, expect.any(Function));
  });

  it('makes a single request for two retries at once', async () => {
    const { view, fetchSession } = setup([{ kind: 'unreachable' }, sessionOf(ANA)]);
    await flush();
    const retry = view.showFailure.mock.calls[0]?.[1];
    retry?.();
    retry?.();
    await flush();
    expect(fetchSession).toHaveBeenCalledTimes(2);
  });
});
