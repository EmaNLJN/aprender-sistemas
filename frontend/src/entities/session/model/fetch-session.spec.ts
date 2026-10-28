import { describe, expect, it, vi } from 'vitest';
import type { ApiClient, ApiResult } from '../../../shared/api/http';
import { fetchSession } from './fetch-session';
import { sessionBodyFactory } from './session.factory';

function clientAnswering(result: ApiResult) {
  const get = vi.fn<ApiClient['get']>(async () => result);
  const client: ApiClient = { get, send: vi.fn<ApiClient['send']>() };
  return { client, get };
}

const response = (status: number, code: string, message: string) => ({
  ok: false as const,
  failure: {
    kind: 'response' as const,
    status,
    code,
    message,
    fieldErrors: {},
    retryAfterSeconds: status === 429 ? 30 : null,
  },
});

describe('fetchSession', () => {
  it('asks GET /api/session with the signal and returns the snapshot', async () => {
    const { client, get } = clientAnswering({
      ok: true,
      status: 200,
      body: sessionBodyFactory.build({ user: null }),
    });
    const signal = new AbortController().signal;
    expect(await fetchSession(client, { signal })).toEqual({
      kind: 'session',
      snapshot: {
        user: null,
        features: { passwordReset: false, registration: false },
        contentVersion: '0123456789abcdef0123456789abcdef',
      },
    });
    expect(get).toHaveBeenCalledWith('/api/session', { signal });
  });

  it.each([
    ['a body that is not a session', { ok: true as const, status: 200, body: { user: 'ana' } }],
    ['the network', { ok: false as const, failure: { kind: 'network' as const } }],
    [
      'an answer that is not JSON',
      { ok: false as const, failure: { kind: 'unexpected' as const, status: 502 } },
    ],
    [
      'a server error',
      response(500, 'server_error', 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.'),
    ],
  ])('treats %s as a server that did not answer', async (_name, result) => {
    const { client } = clientAnswering(result);
    expect(await fetchSession(client, {})).toEqual({ kind: 'unreachable' });
  });

  it('passes a rate limit on with its message and its wait', async () => {
    const { client } = clientAnswering(
      response(
        429,
        'too_many_requests',
        'Demasiados intentos. Esperá un momento antes de volver a probar.',
      ),
    );
    expect(await fetchSession(client, {})).toEqual({
      kind: 'rate-limited',
      message: 'Demasiados intentos. Esperá un momento antes de volver a probar.',
      retryAfterSeconds: 30,
    });
  });
});
