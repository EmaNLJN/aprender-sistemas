import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../../shared/api/http';
import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
import { login, lookupInvitation, acceptInvitation, acceptPrivacy } from './access-endpoints';

const ANA = {
  id: 41,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
};

function clientWith(replies: readonly FakeReply[]) {
  const fake = createFakeFetch(replies);
  return {
    client: createApiClient({ fetch: fake.fetch, readCookies: () => 'XSRF-TOKEN=abc' }),
    calls: fake.calls,
  };
}

describe('login', () => {
  it('sends the email, the password and «Recordarme», and returns the published account', async () => {
    const { client, calls } = clientWith([{ status: 200, json: { data: ANA } }]);
    expect(
      await login(client, { email: 'ana@x.com', password: 'una frase larga', remember: true }),
    ).toEqual({
      ok: true,
      value: ANA,
    });
    expect(calls[0]?.path).toBe('/api/auth/login');
    expect(calls[0]?.body).toEqual({
      email: 'ana@x.com',
      password: 'una frase larga',
      remember: true,
    });
    expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
  });

  it('treats a 200 without an account as an unexpected answer', async () => {
    const { client } = clientWith([{ status: 200, json: { data: null } }]);
    expect(await login(client, { email: 'ana@x.com', password: 'x', remember: false })).toEqual({
      ok: false,
      failure: { kind: 'unexpected', status: 200 },
    });
  });
});

describe('the invitation', () => {
  it('looks up the token and returns the email, the role and the expiry', async () => {
    const { client, calls } = clientWith([
      {
        status: 200,
        json: { email: 'bruno@x.com', role: 'student', expiresAt: '2026-10-12T15:30:00.000Z' },
      },
    ]);
    expect(await lookupInvitation(client, 'k3J8')).toEqual({
      ok: true,
      value: { email: 'bruno@x.com', role: 'student', expiresAt: '2026-10-12T15:30:00.000Z' },
    });
    expect(calls[0]?.path).toBe('/api/auth/invitations/lookup');
    expect(calls[0]?.body).toEqual({ token: 'k3J8' });
  });

  it('accepts it and returns the new account', async () => {
    const bruno = {
      id: 77,
      name: 'Bruno Díaz',
      email: 'bruno@x.com',
      role: 'student',
      privacyAccepted: true,
    };
    const { client, calls } = clientWith([{ status: 201, json: { data: bruno } }]);
    const input = {
      token: 'k3J8',
      name: 'Bruno Díaz',
      password: 'una frase larga para el alta',
      password_confirmation: 'una frase larga para el alta',
      privacyVersion: '2026-10-dev',
    };
    expect(await acceptInvitation(client, input)).toEqual({ ok: true, value: bruno });
    expect(calls[0]?.path).toBe('/api/auth/invitations/accept');
    expect(calls[0]?.body).toEqual(input);
    expect(calls[0]?.headers['x-taller-user']).toBeUndefined();
  });
});

describe('acceptPrivacy', () => {
  it('sends the version of the notice for the account', async () => {
    const { client, calls } = clientWith([{ status: 204 }]);
    expect(await acceptPrivacy(client, 41, '2026-10-dev')).toEqual({ ok: true, value: null });
    expect(calls[0]?.path).toBe('/api/me/privacy');
    expect(calls[0]?.body).toEqual({ privacyVersion: '2026-10-dev' });
    expect(calls[0]?.headers['x-taller-user']).toBe('41');
  });
});
