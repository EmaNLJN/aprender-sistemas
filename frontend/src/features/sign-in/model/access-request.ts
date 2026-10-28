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

export function createAccessRequests(): AccessRequests {
  throw new Error('not implemented');
}
