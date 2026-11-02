import {
  parsePublishedUser,
  type AccountRole,
  type PublishedUser,
} from '../../../entities/session';
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

export interface InvitationDetails {
  readonly email: string;
  readonly role: AccountRole;
  readonly expiresAt: string;
}
export interface SignupInput {
  readonly token: string;
  readonly name: string;
  readonly password: string;
  readonly password_confirmation: string;
  readonly privacyVersion: string;
}
export function lookupInvitation(
  _client: ApiClient,
  _token: string,
): Promise<EndpointResult<InvitationDetails>> {
  throw new Error('not implemented');
}
export function acceptInvitation(
  _client: ApiClient,
  _input: SignupInput,
): Promise<EndpointResult<PublishedUser>> {
  throw new Error('not implemented');
}
export function acceptPrivacy(
  _client: ApiClient,
  _userId: number,
  _privacyVersion: string,
): Promise<EndpointResult<null>> {
  throw new Error('not implemented');
}
