import vm from 'node:vm';
import { FakeElement, FakeText } from './fake-dom.ts';

export const VIEWS = [
  'recorrido',
  'campana',
  'sistemas',
  'atlas',
  'laboratorio',
  'biblioteca',
  'proyecto',
  'metodo',
] as const;
const ELEMENT_IDS = [
  'main',
  'save-label',
  'toast',
  'sidebar-language',
  'sidebar-completed',
  'sidebar-percent',
  'sidebar-progress',
  'resource-count',
  'lesson-dialog',
  'lesson-content',
  'confirm-dialog',
  'cancel-reset',
  'confirm-reset',
  'import-file',
  'export-progress',
];

type Listener = (event?: unknown) => void;

export interface PublishedEvent {
  content: unknown;
  globals: string[];
}

export interface BootHarness {
  context: vm.Context;
  elements: Record<string, FakeElement>;
  storage: Map<string, string>;
  errors: string[];
  bootError?: string;
  storageCalls: string[];
  storageAccesses: number;
  intervals: number;
  published: PublishedEvent[];
  mainWrites: string[];
  listenerCount(): number;
  navigate(view: string): void;
  flush(): Promise<void>;
}

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<unknown>;

export interface HarnessOptions {
  blockStorage?: boolean;
  fetch?: FetchLike;
}

const CONTENT_PUBLISHED_EVENT = 'taller:content-published';
const PUBLISHED_GLOBAL = /^(Taller|GUIDE_DATA$|RUST_|GO_|SYSTEMS_)/;

export function describeError(value: unknown): string {
  const stack = (value as { stack?: unknown } | null)?.stack;
  return typeof stack === 'string' ? stack : String(value);
}

export function createBootHarness(options: HarnessOptions = {}): BootHarness {
  const elements: Record<string, FakeElement> = {};
  for (const id of ELEMENT_IDS) elements[id] = new FakeElement('div', id);
  elements['import-file'] = new FakeElement('input', 'import-file');
  elements['skip-link'] = new FakeElement('a');
  const languageButtons = ['rust', 'go'].map((language) => {
    const button = new FakeElement('button');
    button.dataset.language = language;
    return button;
  });
  const viewLinks = VIEWS.map((view) => {
    const link = new FakeElement('a');
    link.dataset.view = view;
    return link;
  });
  const errors: string[] = [];
  const published: PublishedEvent[] = [];
  const mainWrites: string[] = [];
  const storage = new Map<string, string>();
  const storageCalls: string[] = [];
  const trackedElements: FakeElement[] = [];
  const counters = { storageAccesses: 0, intervals: 0 };
  const listeners = new Map<string, Listener[]>();
  const timers: (() => void)[] = [];
  const location = {
    search: '',
    hash: '',
    get href() {
      return `http://taller.test/${this.search}${this.hash}`;
    },
  };
  const create = (tag: string): FakeElement => {
    const element = new FakeElement(tag);
    element.ownerDocument = document;
    trackedElements.push(element);
    return element;
  };
  const byId = (id: string): FakeElement | null => {
    const known = elements[id];
    if (known) return known;
    if (!elements['main']?.innerHTML.includes(`id="${id}"`)) return null;
    const created = create('div');
    elements[id] = created;
    return created;
  };
  const document: Record<string, unknown> = {
    nodeType: 9,
    nodeName: '#document',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    activeElement: null,
    querySelector: (selector: string) =>
      selector.startsWith('#')
        ? byId(selector.slice(1))
        : selector === '.skip-link'
          ? elements['skip-link']
          : null,
    querySelectorAll: (selector: string) =>
      selector === '[data-language]'
        ? languageButtons
        : selector === '[data-view]'
          ? viewLinks
          : [],
    getElementById: byId,
    createElement: create,
    createElementNS: (_namespace: string, tag: string) => create(tag),
    createTextNode: (text: string) => new FakeText(text),
  };
  document.body = create('body');
  document.documentElement = create('html');
  for (const element of Object.values(elements)) element.ownerDocument = document;
  trackedElements.push(...Object.values(elements), ...languageButtons, ...viewLinks);
  const main = elements['main'];
  let mainHtml = '';
  Object.defineProperty(main, 'innerHTML', {
    get: () => mainHtml,
    set: (value: string) => {
      mainHtml = String(value);
      mainWrites.push(mainHtml);
    },
  });
  const context = {
    console: {
      error: (...args: unknown[]) => errors.push(args.map(describeError).join(' ')),
      warn: () => undefined,
      log: () => undefined,
    },
    reportError: (error: unknown) => errors.push(describeError(error)),
    URL,
    URLSearchParams,
    Blob,
    TextEncoder,
    TextDecoder,
    queueMicrotask,
    performance,
    structuredClone,
    AbortController,
    AbortSignal,
    Event,
    CustomEvent,
    MutationObserver: class {
      observe(): void {}
      disconnect(): void {}
    },
    fetch: options.fetch ?? (() => Promise.reject(new TypeError('fetch is not configured'))),
    document,
    location,
    navigator: { userAgent: 'node', platform: 'Linux', vendor: '', language: 'es' },
    history: { replaceState: () => undefined },
    get localStorage() {
      counters.storageAccesses++;
      if (options.blockStorage) throw new Error('storage is blocked');
      return {
        getItem: (key: string) => {
          storageCalls.push(`getItem ${key}`);
          return storage.get(key) ?? null;
        },
        setItem: (key: string, value: string) => {
          storageCalls.push(`setItem ${key}`);
          storage.set(key, String(value));
        },
        removeItem: (key: string) => {
          storageCalls.push(`removeItem ${key}`);
          storage.delete(key);
        },
      };
    },
    setTimeout: (callback: () => void) => timers.push(callback),
    clearTimeout: () => undefined,
    requestAnimationFrame: (callback: () => void) => timers.push(callback),
    cancelAnimationFrame: () => undefined,
    setInterval: () => ++counters.intervals,
    clearInterval: () => undefined,
    addEventListener: (type: string, listener: Listener) =>
      listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    removeEventListener: (type: string, listener: Listener) =>
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((item) => item !== listener),
      ),
    dispatchEvent: (event: { type: string; detail?: unknown; defaultPrevented?: boolean }) => {
      if (event.type === CONTENT_PUBLISHED_EVENT) {
        const globals = Object.keys(context).filter((name) => PUBLISHED_GLOBAL.test(name));
        published.push({ content: event.detail, globals: globals.sort() });
      }
      for (const listener of listeners.get(event.type) ?? []) listener(event);
      return !event.defaultPrevented;
    },
    scrollTo: () => undefined,
    HTMLIFrameElement: class {},
    HTMLElement: FakeElement,
    Element: FakeElement,
    Node: class {},
  } as Record<string, unknown>;
  context.window = context;
  context.self = context;
  document.defaultView = context;
  vm.createContext(context);
  return {
    context,
    elements,
    storage,
    errors,
    storageCalls,
    published,
    mainWrites,
    get storageAccesses() {
      return counters.storageAccesses;
    },
    get intervals() {
      return counters.intervals;
    },
    listenerCount() {
      const windowListeners = [...listeners.values()].reduce((sum, item) => sum + item.length, 0);
      return trackedElements.reduce(
        (sum, element) =>
          sum + [...element.listeners.values()].reduce((count, item) => count + item.length, 0),
        windowListeners,
      );
    },
    navigate(view) {
      location.hash = `#${view}`;
      for (const listener of listeners.get('hashchange') ?? []) listener();
    },
    async flush() {
      for (let round = 0; round < 1000; round++) {
        await new Promise((resolve) => setImmediate(resolve));
        const callback = timers.shift();
        if (!callback) return;
        try {
          callback();
        } catch (error) {
          errors.push(describeError(error));
        }
      }
    },
  };
}
