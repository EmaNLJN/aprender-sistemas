import type { PublishedUser } from '../../../entities/session';
import type { ApiClient, ApiFailure } from '../../../shared/api/http';

export type EndpointResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly failure: ApiFailure };

export interface LoginInput {
  readonly email: string;
  readonly password: string;
  readonly remember: boolean;
}

export const login: (
  client: ApiClient,
  input: LoginInput,
) => Promise<EndpointResult<PublishedUser>> = () => Promise.reject(new Error('not implemented'));
