import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../build/curriculum.json';
import type {
  ContentRequest,
  ContentSource,
  PortionName,
  SourcePortion,
} from '../../shared/api/content';
import type { ContentGateOptions, GateView } from './content-gate';

const VERSION = 'v1';
const TIMEOUT_MS = 20_000;
const LOADING_DELAY_MS = 400;

function realPortion(name: PortionName): unknown {
  const [group = '', slice] = name.split('.');
  const value = (curriculum as Record<string, unknown>)[group];
  return slice === undefined ? value : (value as Record<string, unknown>)[slice];
}

async function load() {
  const api = await import('../../shared/api/content');
  const gate = await import('./content-gate');
  const content = await import('../content/content');
  const realPortions: SourcePortion[] = api.PORTION_NAMES.map((name) => ({
    name,
    version: VERSION,
    data: realPortion(name),
  }));
  return { ...api, ...gate, ...content, realPortions };
}

function fakeView() {
  return {
    showLoading: vi.fn<GateView['showLoading']>(),
    showFailure: vi.fn<GateView['showFailure']>(),
    clear: vi.fn<GateView['clear']>(),
  };
}

function sourceReturning(read: (request: ContentRequest) => Promise<readonly SourcePortion[]>) {
  const source = {
    read: vi.fn(async (_names: readonly PortionName[], request: ContentRequest) => read(request)),
  };
  return source satisfies ContentSource;
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function whenAborted(request: ContentRequest): Promise<never> {
  return new Promise((_resolve, reject) => {
    request.signal.addEventListener('abort', () => reject(request.signal.reason));
  });
}

async function flushMicrotasks() {
  await vi.advanceTimersByTimeAsync(0);
}

describe('content gate', () => {
  let published: CustomEvent[];

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    const fakeWindow = new EventTarget();
    published = [];
    fakeWindow.addEventListener('taller:content-published', (event) => {
      published.push(event as CustomEvent);
    });
    vi.stubGlobal('window', fakeWindow);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function setup(
    read: (request: ContentRequest, portions: SourcePortion[]) => Promise<readonly SourcePortion[]>,
    overrides: Partial<ContentGateOptions> = {},
  ) {
    const loaded = await load();
    const view = fakeView();
    const source = sourceReturning((request) => read(request, loaded.realPortions));
    const gate = loaded.createContentGate({
      source,
      expectedVersion: VERSION,
      view,
      timeoutMs: TIMEOUT_MS,
      loadingDelayMs: LOADING_DELAY_MS,
      ...overrides,
    });
    return { ...loaded, view, source, gate };
  }

  it('publishes everything at once, clears the view and announces it once', async () => {
    const { gate, view, getContent } = await setup(async (_request, portions) => portions);
    await gate.run();
    const content = getContent();
    expect(content.lab.rust).toBe(realPortion('lab.rust'));
    expect(view.clear).toHaveBeenCalledTimes(1);
    expect(published).toHaveLength(1);
    expect(published[0]?.detail).toBe(content);
  });

  it('never shows the loading state when the content arrives fast', async () => {
    const { gate, view } = await setup(async (_request, portions) => portions);
    await gate.run();
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS * 2);
    expect(view.showLoading).not.toHaveBeenCalled();
  });

  it('shows the loading state at 400 ms and not before', async () => {
    const pending = deferred<readonly SourcePortion[]>();
    const { gate, view } = await setup(() => pending.promise);
    void gate.run();
    await vi.advanceTimersByTimeAsync(LOADING_DELAY_MS - 1);
    expect(view.showLoading).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(view.showLoading).toHaveBeenCalledTimes(1);
  });

  it('aborts a hanging request at the cap, fails with timeout and publishes nothing', async () => {
    let signal: AbortSignal | undefined;
    const { gate, view, getContent } = await setup((request) => {
      signal = request.signal;
      return whenAborted(request);
    });
    void gate.run();
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    expect(signal?.aborted).toBe(false);
    expect(view.showFailure).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(signal?.aborted).toBe(true);
    expect(view.showFailure.mock.calls[0]?.[0].kind).toBe('timeout');
    expect(published).toHaveLength(0);
    expect(() => getContent()).toThrow();
  });

  it('retries with the loading state at once, ignores a second click and resumes the boot', async () => {
    const retryRead = deferred<readonly SourcePortion[]>();
    let calls = 0;
    const { gate, view, source, ContentLoadError, realPortions, getContent } = await setup(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error('offline'));
      return retryRead.promise;
    });
    let resumed = false;
    void gate.run().then(() => {
      resumed = true;
    });
    await flushMicrotasks();
    expect(view.showFailure).toHaveBeenCalledTimes(1);
    expect(view.showFailure.mock.calls[0]?.[0]).toBeInstanceOf(ContentLoadError);
    expect(view.showFailure.mock.calls[0]?.[0].kind).toBe('network');
    expect(view.showLoading).not.toHaveBeenCalled();

    const retry = view.showFailure.mock.calls[0]?.[1] ?? (() => {});
    retry();
    expect(view.showLoading).toHaveBeenCalledTimes(1);
    retry();
    await flushMicrotasks();
    expect(source.read).toHaveBeenCalledTimes(2);
    expect(resumed).toBe(false);

    retryRead.resolve(realPortions);
    await flushMicrotasks();
    expect(resumed).toBe(true);
    expect(source.read).toHaveBeenCalledTimes(2);
    expect(getContent().guide).toBe(realPortion('guide'));
    expect(published).toHaveLength(1);
  });

  it('fails with version and publishes nothing when the source answers another version', async () => {
    const { gate, view, getContent } = await setup(async (_request, portions) =>
      portions.map((portion) => ({ ...portion, version: 'other' })),
    );
    void gate.run();
    await flushMicrotasks();
    expect(view.showFailure.mock.calls[0]?.[0].kind).toBe('version');
    expect(published).toHaveLength(0);
    expect(() => getContent()).toThrow();
  });

  it('fails with missing when a portion is not in the answer', async () => {
    const { gate, view, getContent } = await setup(async (_request, portions) =>
      portions.filter((portion) => portion.name !== 'atlas.go'),
    );
    void gate.run();
    await flushMicrotasks();
    const failure = view.showFailure.mock.calls[0]?.[0];
    expect(failure?.kind).toBe('missing');
    expect(failure?.detail).toBe('atlas.go');
    expect(() => getContent()).toThrow();
  });

  it('fails with shape when a portion has another form', async () => {
    const { gate, view, getContent } = await setup(async (_request, portions) =>
      portions.map((portion) =>
        portion.name === 'quests.go' ? { ...portion, data: [] } : portion,
      ),
    );
    void gate.run();
    await flushMicrotasks();
    const failure = view.showFailure.mock.calls[0]?.[0];
    expect(failure?.kind).toBe('shape');
    expect(failure?.detail).toBe('quests.go');
    expect(published).toHaveLength(0);
    expect(() => getContent()).toThrow();
  });

  it('leaves its timers harmless after success even if clearTimeout does nothing', async () => {
    vi.stubGlobal('clearTimeout', () => {});
    let signal: AbortSignal | undefined;
    const { gate, view } = await setup(async (request, portions) => {
      signal = request.signal;
      return portions;
    });
    await gate.run();
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS * 2);
    expect(view.showLoading).not.toHaveBeenCalled();
    expect(signal?.aborted).toBe(false);
  });
});
