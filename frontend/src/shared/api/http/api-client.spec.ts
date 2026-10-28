import { describe, expect, it } from 'vitest';
import { createApiClient } from './api-client';
import { apiErrorBodyFactory } from './api-error.factory';
import { createFakeFetch, type FakeReply } from './fake-fetch';

const CSRF_EXPIRED: FakeReply = {
  status: 419,
  json: { message: 'La página venció: recargala e intentá de nuevo.', code: 'csrf_token_mismatch' },
};
const TOO_MANY = {
  message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
  code: 'too_many_requests',
};

function sessionOf(id: number | null): FakeReply {
  const user =
    id === null
      ? null
      : { id, name: 'Ana Pérez', email: 'ana@x.com', role: 'student', privacyAccepted: true };
  return { status: 200, json: { user } };
}

function clientWith(replies: readonly (FakeReply | 'network-error')[], cookies = 'XSRF-TOKEN=abc') {
  const fake = createFakeFetch(replies);
  let cookieHeader = cookies;
  const client = createApiClient({ fetch: fake.fetch, readCookies: () => cookieHeader });
  return {
    client,
    calls: fake.calls,
    setCookies(value: string) {
      cookieHeader = value;
    },
  };
}

describe('the API client', () => {
  it('sends a GET to the same origin with the cookies and without CSRF or account headers', async () => {
    const { client, calls } = clientWith([{ status: 200, json: { user: null } }]);
    await client.get('/api/session');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.path).toBe('/api/session');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.credentials).toBe('same-origin');
    expect(calls[0]?.headers).toEqual({ accept: 'application/json' });
  });

  it('copies the XSRF-TOKEN cookie into X-XSRF-TOKEN, decoded and read on each request', async () => {
    const { client, calls, setCookies } = clientWith(
      [{ status: 204 }],
      'theme=dark; XSRF-TOKEN=eyJpdiI6%3D%3D',
    );
    await client.send('POST', '/api/auth/login', {});
    setCookies('XSRF-TOKEN=second%3D');
    await client.send('POST', '/api/auth/login', {});
    expect(calls.map((call) => call.headers['x-xsrf-token'])).toEqual(['eyJpdiI6==', 'second=']);
  });

  it('names the account in X-Taller-User only when the request asks for it', async () => {
    const { client, calls } = clientWith([{ status: 204 }]);
    await client.send('POST', '/api/auth/logout', undefined, { asUser: 41 });
    await client.send('POST', '/api/auth/login', { email: 'ana@x.com' });
    expect(calls[0]?.headers['x-taller-user']).toBe('41');
    expect(calls[1]?.headers['x-taller-user']).toBeUndefined();
    expect(calls[1]?.headers['content-type']).toBe('application/json');
    expect(calls[1]?.body).toEqual({ email: 'ana@x.com' });
  });

  it('returns the parsed body of a 2xx and null for a 204', async () => {
    const { client } = clientWith([{ status: 200, json: { data: { id: 41 } } }, { status: 204 }]);
    expect(await client.send('POST', '/api/auth/login', {})).toEqual({
      ok: true,
      status: 200,
      body: { data: { id: 41 } },
    });
    expect(await client.send('POST', '/api/auth/logout', undefined)).toEqual({
      ok: true,
      status: 204,
      body: null,
    });
  });

  it('turns a {message, code} body into a response failure with every message of each field', async () => {
    const body = apiErrorBodyFactory.build({
      errors: {
        password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'],
      },
    });
    const { client } = clientWith([{ status: 422, json: body }]);
    expect(await client.send('POST', '/api/auth/invitations/accept', {})).toEqual({
      ok: false,
      failure: {
        kind: 'response',
        status: 422,
        code: 'validation_failed',
        message: 'Hay datos que corregir.',
        fieldErrors: {
          password: ['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.'],
        },
        retryAfterSeconds: null,
      },
    });
  });

  it('reads Retry-After in seconds and ignores a date', async () => {
    const { client } = clientWith([
      { status: 429, json: TOO_MANY, headers: { 'Retry-After': '120' } },
      { status: 429, json: TOO_MANY, headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' } },
    ]);
    expect(await client.send('POST', '/api/auth/login', {})).toMatchObject({
      ok: false,
      failure: { kind: 'response', status: 429, retryAfterSeconds: 120 },
    });
    expect(await client.send('POST', '/api/auth/login', {})).toMatchObject({
      ok: false,
      failure: { kind: 'response', status: 429, retryAfterSeconds: null },
    });
  });

  it('reports a body that is not JSON, or an error without {message, code}, as unexpected', async () => {
    const { client } = clientWith([
      { status: 502, text: '<html>Bad Gateway</html>' },
      { status: 200, text: 'not json' },
      { status: 500, json: { error: 'boom' } },
    ]);
    expect(await client.send('POST', '/api/auth/login', {})).toEqual({
      ok: false,
      failure: { kind: 'unexpected', status: 502 },
    });
    expect(await client.get('/api/session')).toEqual({
      ok: false,
      failure: { kind: 'unexpected', status: 200 },
    });
    expect(await client.get('/api/session')).toEqual({
      ok: false,
      failure: { kind: 'unexpected', status: 500 },
    });
  });

  it('reports a rejected fetch as a network failure', async () => {
    const { client } = clientWith(['network-error']);
    expect(await client.get('/api/session')).toEqual({ ok: false, failure: { kind: 'network' } });
  });

  describe('a 419', () => {
    it('renews the session and repeats an anonymous request once', async () => {
      const { client, calls } = clientWith([
        CSRF_EXPIRED,
        sessionOf(null),
        { status: 200, json: { data: {} } },
      ]);
      const result = await client.send('POST', '/api/auth/login', {});
      expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
        'POST /api/auth/login',
        'GET /api/session',
        'POST /api/auth/login',
      ]);
      expect(result.ok).toBe(true);
    });

    it('repeats a request of the same account once', async () => {
      const { client, calls } = clientWith([CSRF_EXPIRED, sessionOf(41), { status: 204 }]);
      expect((await client.send('POST', '/api/me/privacy', {}, { asUser: 41 })).ok).toBe(true);
      expect(calls).toHaveLength(3);
    });

    it('does not repeat when the session has no account any more', async () => {
      const { client, calls } = clientWith([CSRF_EXPIRED, sessionOf(null)]);
      expect(await client.send('POST', '/api/me/privacy', {}, { asUser: 41 })).toEqual({
        ok: false,
        failure: { kind: 'signed-out' },
      });
      expect(calls).toHaveLength(2);
    });

    it('does not repeat when the session is another account, and keeps the message of the server', async () => {
      const { client, calls } = clientWith([CSRF_EXPIRED, sessionOf(7)]);
      expect(await client.send('POST', '/api/me/privacy', {}, { asUser: 41 })).toEqual({
        ok: false,
        failure: {
          kind: 'account-changed',
          message: 'La página venció: recargala e intentá de nuevo.',
        },
      });
      expect(calls).toHaveLength(2);
    });

    it('repeats at most once', async () => {
      const { client, calls } = clientWith([CSRF_EXPIRED, sessionOf(null), CSRF_EXPIRED]);
      expect(await client.send('POST', '/api/auth/login', {})).toMatchObject({
        ok: false,
        failure: { kind: 'response', status: 419 },
      });
      expect(calls).toHaveLength(3);
    });

    it('returns the 419 when the renewal itself fails', async () => {
      const { client, calls } = clientWith([CSRF_EXPIRED, 'network-error']);
      expect(await client.send('POST', '/api/me/privacy', {}, { asUser: 41 })).toMatchObject({
        ok: false,
        failure: { kind: 'response', status: 419 },
      });
      expect(calls).toHaveLength(2);
    });
  });
});
