import type { ApiClient, ApiFailure } from '../../../shared/api/http';

export interface SignOutDependencies {
  readonly client: ApiClient;
  readonly userId: number;
}

export type SignOutOutcome =
  { readonly kind: 'signed-out' } | { readonly kind: 'failed'; readonly failure: ApiFailure };

const UNAUTHENTICATED = 401;
const ACCOUNT_DISABLED = 'account_disabled';

function alreadySignedOut(failure: ApiFailure): boolean {
  if (failure.kind === 'signed-out') return true;
  if (failure.kind !== 'response') return false;
  return failure.status === UNAUTHENTICATED || failure.code === ACCOUNT_DISABLED;
}

export async function signOut({ client, userId }: SignOutDependencies): Promise<SignOutOutcome> {
  const result = await client.send('POST', '/api/auth/logout', undefined, { asUser: userId });
  if (result.ok || alreadySignedOut(result.failure)) return { kind: 'signed-out' };
  return { kind: 'failed', failure: result.failure };
}
