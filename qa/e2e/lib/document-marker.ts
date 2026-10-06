import type { Page } from '@playwright/test';

interface MarkedWindow {
  __e2eMarker?: true;
}

export async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as MarkedWindow).__e2eMarker = true;
  });
}

export async function documentWasReloaded(page: Page): Promise<boolean> {
  return page.evaluate(() => !(window as MarkedWindow).__e2eMarker);
}

export async function observeReload(page: Page, action: () => Promise<void>): Promise<boolean> {
  await markDocument(page);
  await action();
  await page.waitForLoadState('load');
  return documentWasReloaded(page);
}
