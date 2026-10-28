import { isPlainObject } from '../../lib/is-plain-object';
import type { ApiFailure, ApiResult, FieldErrors } from './api-failure';
import { readXsrfToken } from './read-xsrf-token';

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

const SESSION_PATH = '/api/session';
const CSRF_EXPIRED = 419;
const NOT_JSON = Symbol('not-json');

function parseBody(text: string): unknown {
  if (text === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return NOT_JSON;
  }
}

function fieldErrorsOf(value: unknown): FieldErrors {
  if (!isPlainObject(value)) return {};
  const errors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value)) {
    if (!Array.isArray(messages)) continue;
    errors[field] = messages.filter((message): message is string => typeof message === 'string');
  }
  return errors;
}

function retryAfterOf(headers: Headers): number | null {
  const value = headers.get('Retry-After')?.trim() ?? '';
  return /^\d+$/.test(value) ? Number(value) : null;
}

function failureOf(response: Response, body: unknown): ApiFailure {
  if (!isPlainObject(body) || typeof body.message !== 'string' || typeof body.code !== 'string') {
    return { kind: 'unexpected', status: response.status };
  }
  return {
    kind: 'response',
    status: response.status,
    code: body.code,
    message: body.message,
    fieldErrors: fieldErrorsOf(body.errors),
    retryAfterSeconds: retryAfterOf(response.headers),
  };
}

function csrfExpiredMessage(result: ApiResult): string | null {
  if (result.ok || result.failure.kind !== 'response') return null;
  return result.failure.status === CSRF_EXPIRED ? result.failure.message : null;
}

function sessionAccountOf(result: ApiResult): number | null | undefined {
  if (!result.ok || !isPlainObject(result.body)) return undefined;
  const { user } = result.body;
  if (user === null) return null;
  return isPlainObject(user) && typeof user.id === 'number' ? user.id : undefined;
}

export function createApiClient({ fetch, readCookies }: ApiClientOptions): ApiClient {
  function headersFor(
    method: 'GET' | ApiMethod,
    asUser: number | undefined,
  ): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (method === 'GET') return headers;
    headers['Content-Type'] = 'application/json';
    headers['X-XSRF-TOKEN'] = readXsrfToken(readCookies());
    if (asUser !== undefined) headers['X-Taller-User'] = String(asUser);
    return headers;
  }

  async function perform(
    method: 'GET' | ApiMethod,
    path: string,
    body: unknown,
    options: ApiRequestOptions,
  ): Promise<ApiResult> {
    const init: RequestInit = {
      method,
      credentials: 'same-origin',
      headers: headersFor(method, options.asUser),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
    };
    let response: Response;
    let text: string;
    try {
      response = await fetch(path, init);
      text = await response.text();
    } catch {
      return { ok: false, failure: { kind: 'network' } };
    }
    const parsed = parseBody(text);
    if (!response.ok) return { ok: false, failure: failureOf(response, parsed) };
    if (parsed === NOT_JSON) {
      return { ok: false, failure: { kind: 'unexpected', status: response.status } };
    }
    return { ok: true, status: response.status, body: parsed };
  }

  async function send(
    method: ApiMethod,
    path: string,
    body: unknown,
    options: ApiRequestOptions = {},
  ): Promise<ApiResult> {
    const first = await perform(method, path, body, options);
    const expiredMessage = csrfExpiredMessage(first);
    if (expiredMessage === null) return first;
    const account = sessionAccountOf(
      await perform('GET', SESSION_PATH, undefined, { signal: options.signal }),
    );
    if (account === undefined) return first;
    if (options.asUser === undefined || account === options.asUser) {
      return perform(method, path, body, options);
    }
    if (account === null) return { ok: false, failure: { kind: 'signed-out' } };
    return { ok: false, failure: { kind: 'account-changed', message: expiredMessage } };
  }

  return {
    get: (path, options = {}) => perform('GET', path, undefined, options),
    send,
  };
}
