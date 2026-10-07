import { contentVersion, curriculumDocumentText } from './content-document.ts';

export type ContentBehavior =
  | { kind: 'serve' }
  | { kind: 'reject' }
  | { kind: 'status'; status: number }
  | { kind: 'text'; body: string }
  | { kind: 'document'; document: unknown }
  | { kind: 'hang' };

export interface FakeResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface ContentServer {
  fetch: (url: string, init?: { signal?: AbortSignal }) => Promise<FakeResponse>;
  requests: string[];
}

function respond(status: number, body: string): FakeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(body) as unknown,
  };
}

export function createContentServer(
  behaviors: ContentBehavior[] = [{ kind: 'serve' }],
): ContentServer {
  const url = `/content/curriculum.${contentVersion()}.json`;
  const requests: string[] = [];
  let attempt = 0;
  return {
    requests,
    async fetch(requested, init) {
      requests.push(requested);
      if (requested !== url) return respond(404, 'not found');
      const behavior = behaviors[Math.min(attempt++, behaviors.length - 1)] ?? { kind: 'serve' };
      switch (behavior.kind) {
        case 'serve':
          return respond(200, curriculumDocumentText());
        case 'reject':
          throw new TypeError('fetch failed');
        case 'status':
          return respond(behavior.status, 'error');
        case 'text':
          return respond(200, behavior.body);
        case 'document':
          return respond(200, JSON.stringify(behavior.document));
        case 'hang':
          return new Promise<FakeResponse>((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
          );
      }
    },
  };
}
