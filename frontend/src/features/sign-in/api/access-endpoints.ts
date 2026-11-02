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

function parseInvitation(body: unknown): InvitationDetails | null {
  if (!isPlainObject(body)) return null;
  const { email, role, expiresAt } = body;
  if (typeof email !== 'string' || typeof expiresAt !== 'string') return null;
  if (role !== 'student' && role !== 'admin') return null;
  return { email, role, expiresAt };
}

export async function lookupInvitation(
  client: ApiClient,
  token: string,
): Promise<EndpointResult<InvitationDetails>> {
  const result = await client.send('POST', '/api/auth/invitations/lookup', { token });
  if (!result.ok) return result;
  const details = parseInvitation(result.body);
  return details === null ? unexpected(result.status) : { ok: true, value: details };
}

export function acceptInvitation(
  client: ApiClient,
  input: SignupInput,
): Promise<EndpointResult<PublishedUser>> {
  return accountFrom(client.send('POST', '/api/auth/invitations/accept', input));
}

export async function acceptPrivacy(
  client: ApiClient,
  userId: number,
  privacyVersion: string,
): Promise<EndpointResult<null>> {
  const result = await client.send(
    'POST',
    '/api/me/privacy',
    { privacyVersion },
    { asUser: userId },
  );
  return result.ok ? { ok: true, value: null } : result;
}
