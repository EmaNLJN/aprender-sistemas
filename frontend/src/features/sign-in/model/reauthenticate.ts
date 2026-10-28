import type { RequestSignIn } from './access-request';

export type ReauthenticationOutcome = 'same-account' | 'reloading';

export async function reauthenticate(
  expectedUserId: number,
  dependencies: { readonly requestSignIn: RequestSignIn; readonly reloadDocument: () => void },
): Promise<ReauthenticationOutcome> {
  const user = await dependencies.requestSignIn({ presentation: 'dialog', reason: 'expired' });
  if (user.id === expectedUserId) return 'same-account';
  dependencies.reloadDocument();
  return 'reloading';
}
