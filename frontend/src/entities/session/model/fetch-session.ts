import type { ApiClient } from '../../../shared/api/http';
import { parseSessionBody } from './parse-session';
import type { SessionOutcome } from './types';

const TOO_MANY_REQUESTS = 429;

export async function fetchSession(
  client: ApiClient,
  request: { readonly signal?: AbortSignal },
): Promise<SessionOutcome> {
  const result = await client.get('/api/session', { signal: request.signal });
  if (result.ok) {
    const snapshot = parseSessionBody(result.body);
    return snapshot === null ? { kind: 'unreachable' } : { kind: 'session', snapshot };
  }
  const { failure } = result;
  if (failure.kind === 'response' && failure.status === TOO_MANY_REQUESTS) {
    return {
      kind: 'rate-limited',
      message: failure.message,
      retryAfterSeconds: failure.retryAfterSeconds,
    };
  }
  return { kind: 'unreachable' };
}
