import type { RequestSignIn } from './access-request';

export type ReauthenticationOutcome = 'same-account' | 'reloading';

export async function reauthenticate(
  _expectedUserId: number,
  _dependencies: { readonly requestSignIn: RequestSignIn; readonly reloadDocument: () => void },
): Promise<ReauthenticationOutcome> {
  throw new Error('not implemented');
}
