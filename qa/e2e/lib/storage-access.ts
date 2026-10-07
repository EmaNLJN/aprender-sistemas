import type { BrowserContext, Page } from '@playwright/test';

interface WatchedWindow {
  __e2eStorageAccess?: { reads: number; writes: number };
}

export interface StorageAccess {
  reads: number;
  writes: number;
}

export async function watchStorageAccess(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const access = { reads: 0, writes: 0 };
    (window as WatchedWindow).__e2eStorageAccess = access;
    const methods = {
      reads: ['getItem', 'key'],
      writes: ['setItem', 'removeItem', 'clear'],
    } as const;
    for (const counter of ['reads', 'writes'] as const) {
      for (const method of methods[counter]) {
        const original = Storage.prototype[method] as (
          this: Storage,
          ...args: unknown[]
        ) => unknown;
        Storage.prototype[method] = function (this: Storage, ...args: unknown[]) {
          access[counter] += 1;
          return original.apply(this, args);
        } as never;
      }
    }
  });
}

export async function readStorageAccess(page: Page): Promise<StorageAccess> {
  return page.evaluate(
    () => (window as WatchedWindow).__e2eStorageAccess ?? { reads: -1, writes: -1 },
  );
}
