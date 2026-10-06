import type { Locator, Page } from '@playwright/test';

export class AtlasPage {
  constructor(readonly page: Page) {}

  concept(number: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${number}`) });
  }

  labLink(): Locator {
    return this.page.getByRole('link', { name: 'Ir al laboratorio' });
  }
}
