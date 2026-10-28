import type { FetchLike } from './api-client';

export interface FakeReply {
  readonly status: number;
  readonly json?: unknown;
  readonly text?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface RecordedCall {
  readonly path: string;
  readonly method: string;
  readonly credentials: RequestCredentials | undefined;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export interface FakeFetch {
  readonly fetch: FetchLike;
  readonly calls: RecordedCall[];
}

const STATUSES_WITHOUT_BODY = new Set([204, 205, 304]);

function responseOf(reply: FakeReply): Response {
  const text = reply.text ?? (reply.json === undefined ? '' : JSON.stringify(reply.json));
  return new Response(STATUSES_WITHOUT_BODY.has(reply.status) ? null : text, {
    status: reply.status,
    headers: reply.headers,
  });
}

export function createFakeFetch(replies: readonly (FakeReply | 'network-error')[]): FakeFetch {
  const calls: RecordedCall[] = [];
  let index = 0;
  const fetch: FetchLike = async (path, init) => {
    calls.push({
      path,
      method: init.method ?? 'GET',
      credentials: init.credentials,
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
    });
    const reply = replies[Math.min(index, replies.length - 1)];
    index += 1;
    if (reply === undefined) throw new Error('the fake fetch has no reply');
    if (reply === 'network-error') throw new TypeError('Failed to fetch');
    return responseOf(reply);
  };
  return { fetch, calls };
}
