import {
  ContentLoadError,
  PORTION_NAMES,
  findPortionProblem,
  storeContent,
  type ContentSource,
  type SourcePortion,
} from '../../shared/api/content';
import { assembleContent } from '../content/assemble-content';
import { CONTENT_PUBLISHED_EVENT, type Content } from '../content/content';
import type { BootStage } from './run-boot';

export interface GateView {
  showLoading(): void;
  showFailure(failure: ContentLoadError, retry: () => void): void;
  clear(): void;
}

export interface ContentGateOptions {
  readonly source: ContentSource;
  readonly expectedVersion: string;
  readonly view: GateView;
  readonly timeoutMs: number;
  readonly loadingDelayMs: number;
}

type Outcome = { content: Content } | { failure: ContentLoadError };

function checkPortions(portions: readonly SourcePortion[], expectedVersion: string): void {
  const byName = new Map(portions.map((portion) => [portion.name, portion]));
  for (const name of PORTION_NAMES) {
    const portion = byName.get(name);
    if (!portion) throw new ContentLoadError('missing', name);
    if (portion.version !== expectedVersion) throw new ContentLoadError('version', name);
  }
  for (const name of PORTION_NAMES) {
    const problem = findPortionProblem(name, byName.get(name)?.data);
    if (problem) throw new ContentLoadError(problem, name);
  }
}

function toFailure(error: unknown, timedOut: boolean): ContentLoadError {
  if (timedOut) return new ContentLoadError('timeout');
  if (error instanceof ContentLoadError) return error;
  return new ContentLoadError('network', error instanceof Error ? error.message : String(error));
}

// One attempt. Its timers do nothing once it has settled: the harness of boot-check runs every
// queued timer on flush() and never cancels one.
async function attemptOnce(
  options: ContentGateOptions,
  showLoadingAfterDelay: boolean,
): Promise<Outcome> {
  const controller = new AbortController();
  let settled = false;
  let timedOut = false;
  const loadingTimer = showLoadingAfterDelay
    ? setTimeout(() => {
        if (!settled) options.view.showLoading();
      }, options.loadingDelayMs)
    : undefined;
  const capTimer = setTimeout(() => {
    if (settled) return;
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);
  try {
    const portions = await options.source.read(PORTION_NAMES, { signal: controller.signal });
    checkPortions(portions, options.expectedVersion);
    return { content: assembleContent(portions) };
  } catch (error) {
    return { failure: toFailure(error, timedOut) };
  } finally {
    settled = true;
    clearTimeout(loadingTimer);
    clearTimeout(capTimer);
  }
}

export function createContentGate(options: ContentGateOptions): BootStage {
  return {
    name: 'contentGate',
    run: () =>
      new Promise<void>((resolve) => {
        let inFlight = false;

        async function attempt(isRetry: boolean): Promise<void> {
          if (inFlight) return;
          inFlight = true;
          if (isRetry) options.view.showLoading();
          const outcome = await attemptOnce(options, !isRetry);
          inFlight = false;
          if ('failure' in outcome) {
            options.view.showFailure(outcome.failure, () => void attempt(true));
            return;
          }
          options.view.clear();
          storeContent(outcome.content);
          window.dispatchEvent(
            new CustomEvent(CONTENT_PUBLISHED_EVENT, { detail: outcome.content }),
          );
          resolve();
        }

        void attempt(false);
      }),
  };
}
