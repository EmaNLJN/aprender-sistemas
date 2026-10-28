import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../../shared/api/http';
import { createFakeFetch, type FakeReply } from '../../../shared/api/http/fake-fetch';
import { login } from './access-endpoints';

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
