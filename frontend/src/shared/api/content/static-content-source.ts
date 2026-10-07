import { isPlainObject } from '../../lib/is-plain-object';
import { ContentLoadError, type ContentSource } from './content-source';
import type { PortionName } from './portions';

export interface StaticContentSourceOptions {
  readonly url: string;
  readonly version: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fetchDocument(url: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ContentLoadError('network', messageOf(error));
  }
  if (response.status === 404) throw new ContentLoadError('version', '404');
  if (!response.ok) throw new ContentLoadError('status', String(response.status));
  let document: unknown;
  try {
    document = await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ContentLoadError('body', messageOf(error));
  }
  if (!isPlainObject(document)) throw new ContentLoadError('body', 'el documento no es un objeto');
  return document;
}

function portionOf(document: Record<string, unknown>, name: PortionName): unknown {
  const [group = '', slice] = name.split('.');
  const value = document[group];
  if (slice === undefined) return value;
  return isPlainObject(value) ? value[slice] : undefined;
}

export function createStaticContentSource({
  url,
  version,
}: StaticContentSourceOptions): ContentSource {
  return {
    async read(names, { signal }) {
      const document = await fetchDocument(url, signal);
      return names.map((name) => ({ name, version, data: portionOf(document, name) }));
    },
  };
}
