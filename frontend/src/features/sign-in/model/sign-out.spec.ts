import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../../shared/api/http';
import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
import { signOut } from './sign-out';

function clientWith(replies: readonly (FakeReply | 'network-error')[]) {
  const fake = createFakeFetch(replies);
  return {
    client: createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' }),
    calls: fake.calls,
  };
}

describe('signOut', () => {
  it('sends the logout with X-Taller-User and is done with a 204', async () => {
    const { client, calls } = clientWith([{ status: 204 }]);
    expect(await signOut({ client, userId: 41 })).toEqual({ kind: 'signed-out' });
    expect(calls[0]?.path).toBe('/api/auth/logout');
    expect(calls[0]?.headers['x-taller-user']).toBe('41');
  });

  it('is done too when there was no session any more', async () => {
    const { client } = clientWith([
      { status: 401, json: { message: 'Iniciá sesión para continuar.', code: 'unauthenticated' } },
    ]);
    expect(await signOut({ client, userId: 41 })).toEqual({ kind: 'signed-out' });
  });

  it('is done when the account was disabled meanwhile, so the reload goes back to the access', async () => {
    const { client } = clientWith([
      {
        status: 403,
        json: {
          message: 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.',
          code: 'account_disabled',
        },
      },
    ]);
    expect(await signOut({ client, userId: 41 })).toEqual({ kind: 'signed-out' });
  });

  it('fails with the network and with another account', async () => {
    const mismatch = {
      message: 'La sesión cambió de cuenta: recargá la página.',
      code: 'account_mismatch',
    };
    const { client } = clientWith(['network-error', { status: 409, json: mismatch }]);
    expect(await signOut({ client, userId: 41 })).toEqual({
      kind: 'failed',
      failure: { kind: 'network' },
    });
    expect(await signOut({ client, userId: 41 })).toMatchObject({
      kind: 'failed',
      failure: { kind: 'response', status: 409, code: 'account_mismatch' },
    });
  });
});
