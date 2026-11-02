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

  async resetAllProgress(): Promise<void> {
    await this.resetProgress().click();
    await this.confirmReset().click();
  }

  async importCopy(text: string): Promise<void> {
    await this.page.locator('#import-file').setInputFiles({
      name: 'taller-progreso.json',
      mimeType: 'application/json',
      buffer: Buffer.from(text, 'utf8'),
    });
  }
}
