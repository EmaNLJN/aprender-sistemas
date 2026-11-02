import type { Locator, Page } from '@playwright/test';

export class AccountPage {
  readonly entry: Locator;
  readonly dialog: Locator;

  constructor(readonly page: Page) {
    this.entry = page.getByRole('button', { name: 'Tu cuenta', exact: true });
    this.dialog = page.getByRole('dialog', { name: 'Tu cuenta' });
  }

  async open(): Promise<void> {
    await this.entry.click();
  }

  button(name: string): Locator {
    return this.dialog.getByRole('button', { name, exact: true });
  }

  async signOut(): Promise<void> {
    await this.button('Salir').click();
  }
}
