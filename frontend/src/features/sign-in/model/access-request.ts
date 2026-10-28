import type { PublishedUser } from '../../../entities/session';

export type AccessToken =
  | { readonly kind: 'invitation'; readonly token: string }
  | { readonly kind: 'reset'; readonly token: string; readonly email: string | null };

export type AccessPresentation = 'page' | 'dialog';
export type AccessReason = 'boot' | 'expired';

export interface SignInOptions {
  readonly presentation?: AccessPresentation;
  readonly reason?: AccessReason;
  readonly token?: AccessToken | null;
}

export interface AccessRequest {
  readonly id: number;
  readonly presentation: AccessPresentation;
  readonly reason: AccessReason;
  readonly token: AccessToken | null;
}

export type RequestSignIn = (options?: SignInOptions) => Promise<PublishedUser>;

export interface AccessRequests {
  readonly request: RequestSignIn;
  current(): AccessRequest | null;
  subscribe(listener: () => void): () => void;
  finish(user: PublishedUser): void;
}

interface PendingRequest {
  readonly request: AccessRequest;
  readonly promise: Promise<PublishedUser>;
  readonly resolve: (user: PublishedUser) => void;
}

export function createAccessRequests(): AccessRequests {
  let pending: PendingRequest | null = null;
  let nextId = 1;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  return {
    request(options = {}) {
      if (pending !== null) return pending.promise;
      let resolve: (user: PublishedUser) => void = () => {};
      const promise = new Promise<PublishedUser>((onResolve) => {
        resolve = onResolve;
      });
      const request: AccessRequest = {
        id: nextId,
        presentation: options.presentation ?? 'dialog',
        reason: options.reason ?? 'expired',
        token: options.token ?? null,
      };
      nextId += 1;
      pending = { request, promise, resolve };
      notify();
      return promise;
    },
    current: () => pending?.request ?? null,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    finish(user) {
      const done = pending;
      if (done === null) return;
      pending = null;
      notify();
      done.resolve(user);
    },
  };
}

export const accessRequests = createAccessRequests();

export const requestSignIn: RequestSignIn = (options) => accessRequests.request(options);
