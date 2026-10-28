import type { ApiClient, ApiFailure } from '../../../shared/api/http';

export interface SignOutDependencies {
  readonly client: ApiClient;
  readonly userId: number;
}

export type SignOutOutcome =
  { readonly kind: 'signed-out' } | { readonly kind: 'failed'; readonly failure: ApiFailure };

export const signOut: (dependencies: SignOutDependencies) => Promise<SignOutOutcome> = () =>
  Promise.reject(new Error('not implemented'));
