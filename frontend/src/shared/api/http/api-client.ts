import type { ApiResult } from './api-failure';

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
export type ApiMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  readonly asUser?: number;
  readonly signal?: AbortSignal;
}

export interface ApiClient {
  get(path: string, options?: ApiRequestOptions): Promise<ApiResult>;
  send(
    method: ApiMethod,
    path: string,
    body: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResult>;
}

export interface ApiClientOptions {
  readonly fetch: FetchLike;
  readonly readCookies: () => string;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  void options;
  throw new Error('not implemented');
}
