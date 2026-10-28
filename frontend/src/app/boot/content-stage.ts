import { createStaticContentSource } from '../../shared/api/content';
import { createContentGate } from './content-gate';
import { createGateView } from './gate-view';

declare const __CONTENT_VERSION__: string;

const CONTENT_TIMEOUT_MS = 20_000;
const LOADING_DELAY_MS = 400;

export const contentGate = createContentGate({
  source: createStaticContentSource({
    url: `/content/curriculum.${__CONTENT_VERSION__}.json`,
    version: __CONTENT_VERSION__,
  }),
  expectedVersion: __CONTENT_VERSION__,
  view: createGateView(),
  timeoutMs: CONTENT_TIMEOUT_MS,
  loadingDelayMs: LOADING_DELAY_MS,
});
