import { parsePublishedUser, type PublishedUser } from '../../../entities/session';
import type { ApiClient, ApiFailure, ApiResult } from '../../../shared/api/http';
import { isPlainObject } from '../../../shared/lib/is-plain-object';

export type EndpointResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly failure: ApiFailure };

export interface LoginInput {
  readonly email: string;
  readonly password: string;
  readonly remember: boolean;
}

function unexpected(status: number): EndpointResult<never> {
  return { ok: false, failure: { kind: 'unexpected', status } };
}

async function accountFrom(pending: Promise<ApiResult>): Promise<EndpointResult<PublishedUser>> {
  const result = await pending;
  if (!result.ok) return result;
  const user = isPlainObject(result.body) ? parsePublishedUser(result.body.data) : null;
  return user === null ? unexpected(result.status) : { ok: true, value: user };
}

export function login(
  client: ApiClient,
  input: LoginInput,
): Promise<EndpointResult<PublishedUser>> {
  return accountFrom(client.send('POST', '/api/auth/login', input));
}
