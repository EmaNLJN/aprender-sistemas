import type { BrowserContext, Page } from '@playwright/test';
import type { StorageKey } from '../lib/curriculum';

interface WatchedWindow {
  __e2eStorageWrites?: string[];
}

export class StorageControl {
  constructor(
    private readonly context: BrowserContext,
    private readonly page: Page,
  ) {}

  async seed(entries: Partial<Record<StorageKey, string>>): Promise<void> {
    await this.context.addInitScript((seeded) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      for (const [key, text] of Object.entries(seeded)) localStorage.setItem(key, text as string);
      sessionStorage.setItem('e2e-seeded', 'true');
    }, entries);
  }

  async block(): Promise<void> {
    await this.context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Storage is blocked', 'SecurityError');
        },
      });
    });
  }

  async watchWrites(): Promise<void> {
    await this.context.addInitScript(() => {
      const writes: string[] = [];
      (window as WatchedWindow).__e2eStorageWrites = writes;
      const setItem = Storage.prototype.setItem;
      const removeItem = Storage.prototype.removeItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (this === window.localStorage) writes.push(`set ${key}`);
        return setItem.call(this, key, value);
      };
      Storage.prototype.removeItem = function (key: string) {
        if (this === window.localStorage) writes.push(`remove ${key}`);
        return removeItem.call(this, key);
      };
    });
  }

  async writes(): Promise<string[]> {
    return this.page.evaluate(() => (window as WatchedWindow).__e2eStorageWrites ?? []);
  }

  async snapshot(): Promise<Record<string, string>> {
    return this.page.evaluate(() =>
      Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)!])),
    );
  }
}
