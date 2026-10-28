import type { Locator, Page } from '@playwright/test';

export class MethodPage {
  constructor(readonly page: Page) {}

  resetProgress(): Locator {
    return this.page.getByRole('button', { name: 'Borrar mi progreso' });
  }

  confirmReset(): Locator {
    return this.page
      .getByRole('dialog', { name: '¿Borrar tu progreso?' })
      .getByRole('button', { name: 'Borrar todo' });
  }
}
