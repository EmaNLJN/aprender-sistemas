import type { ApiClient } from '../../../shared/api/http';
import type { SessionOutcome } from './types';

export async function fetchSession(
  _client: ApiClient,
  _request: { readonly signal?: AbortSignal },
): Promise<SessionOutcome> {
  throw new Error('not implemented');
}
