import { afterEach, describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import meta from '../../../../../build/curriculum.meta.json';
import { ContentLoadError } from './content-source';
import { PORTION_NAMES } from './portions';
import { createStaticContentSource } from './static-content-source';

const URL = '/content/curriculum.abc.json';
const VERSION = 'abc';

function inBuiltDocument(name: string): boolean {
  const [group = ''] = name.split('.');
  return group in curriculum;
}

function sourceUnderTest() {
  return createStaticContentSource({ url: URL, version: VERSION });
}

function readAll(signal = new AbortController().signal) {
  return sourceUnderTest().read(PORTION_NAMES, { signal });
}

async function failureOf(promise: Promise<unknown>): Promise<ContentLoadError> {
  const error = await promise.then(
    () => undefined,
    (rejection: unknown) => rejection,
  );
  expect(error).toBeInstanceOf(ContentLoadError);
  return error as ContentLoadError;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createStaticContentSource', () => {
  it('splits the document into the 17 portions, by reference and with the version', async () => {
    const document = curriculum as unknown as Record<string, Record<string, unknown>>;
    vi.stubGlobal('fetch', async () => Response.json(document));
    const portions = await readAll();
    expect(portions.map((portion) => portion.name)).toEqual(
      Object.keys(meta.portions).filter(inBuiltDocument),
    );
    expect(portions.every((portion) => portion.version === VERSION)).toBe(true);
    const labRust = portions.find((portion) => portion.name === 'lab.rust');
    expect(Array.isArray(labRust?.data)).toBe(true);
    expect((labRust?.data as unknown[]).length).toBe((document.lab?.rust as unknown[]).length);
    const guide = portions.find((portion) => portion.name === 'guide');
    expect(Object.keys(guide?.data as object)).toEqual(['resources', 'tracks', 'sources']);
  });

  it('requests the url of its own version with the abort signal', async () => {
    const fetchSpy = vi.fn(async () => Response.json({}));
    vi.stubGlobal('fetch', fetchSpy);
    const { signal } = new AbortController();
    await readAll(signal);
    expect(fetchSpy).toHaveBeenCalledWith(URL, { signal });
  });

  it('leaves the data undefined for a portion the document lacks', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ lab: { rust: [] } }));
    const portions = await readAll();
    expect(portions.find((portion) => portion.name === 'lab.go')?.data).toBeUndefined();
    expect(portions.find((portion) => portion.name === 'guide')?.data).toBeUndefined();
  });

  it('reports a 404 as a version failure', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }));
    expect((await failureOf(readAll())).kind).toBe('version');
  });

  it('reports a 500 as a status failure', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 500 }));
    const failure = await failureOf(readAll());
    expect(failure.kind).toBe('status');
    expect(failure.detail).toBe('500');
  });

  it('reports a rejected fetch as a network failure', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    const failure = await failureOf(readAll());
    expect(failure.kind).toBe('network');
    expect(failure.detail).toBe('Failed to fetch');
  });

  it('reports a body that is not JSON as a body failure', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>'));
    expect((await failureOf(readAll())).kind).toBe('body');
  });

  it('reports JSON that is not an object as a body failure', async () => {
    vi.stubGlobal('fetch', async () => Response.json([1, 2]));
    expect((await failureOf(readAll())).kind).toBe('body');
  });

  it('lets an abort pass unchanged', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', async (_url: string, init: { signal: AbortSignal }) => {
      controller.abort();
      throw init.signal.reason;
    });
    const error = await readAll(controller.signal).then(
      () => undefined,
      (rejection: unknown) => rejection,
    );
    expect(error).not.toBeInstanceOf(ContentLoadError);
    expect((error as Error).name).toBe('AbortError');
  });
});
