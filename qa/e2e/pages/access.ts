import type { Locator, Page } from '@playwright/test';

export class AccessPage {
  constructor(readonly page: Page) {}

  heading(name: string): Locator {
    return this.page.getByRole('heading', { name, exact: true });
  }

  field(label: string): Locator {
    return this.page.getByLabel(label, { exact: true });
  }

  button(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  alert(): Locator {
    return this.page.getByRole('alert');
  }

  layer(): Locator {
    return this.page.locator('.access-page');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.field('Email').fill(email);
    await this.field('Contraseña').fill(password);
    await this.button('Ingresar').click();
  }

  async createAccount(name: string, password: string): Promise<void> {
    await this.field('Tu nombre').fill(name);
    await this.field('Contraseña').fill(password);
    await this.field('Repetí la contraseña').fill(password);
    await this.page.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }).check();
    await this.button('Crear mi cuenta').click();
  }

  async chooseNewPassword(password: string): Promise<void> {
    await this.field('Contraseña nueva').fill(password);
    await this.field('Repetí la contraseña nueva').fill(password);
    await this.button('Cambiar la contraseña').click();
  }
}
