import { describe, expect, it, vi } from 'vitest';
import type { PublishedUser } from '../../../entities/session';
import type { RequestSignIn } from './access-request';
import { reauthenticate } from './reauthenticate';

const ANA: PublishedUser = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
};

describe('reauthenticate', () => {
  it('asks for the sign-in as a dialog and goes on with the same account', async () => {
    const requestSignIn = vi.fn<RequestSignIn>(async () => ANA);
    const reloadDocument = vi.fn();
    expect(await reauthenticate(41, { requestSignIn, reloadDocument })).toBe('same-account');
    expect(requestSignIn).toHaveBeenCalledWith({ presentation: 'dialog', reason: 'expired' });
    expect(reloadDocument).not.toHaveBeenCalled();
  });

  it('reloads the document when another account signs in', async () => {
    const requestSignIn = vi.fn<RequestSignIn>(async () => ({ ...ANA, id: 77 }));
    const reloadDocument = vi.fn();
    expect(await reauthenticate(41, { requestSignIn, reloadDocument })).toBe('reloading');
    expect(reloadDocument).toHaveBeenCalledOnce();
  });
});
