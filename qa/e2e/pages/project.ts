import type { Locator, Page } from '@playwright/test';

export class ProjectPage {
  readonly intro: Locator;
  readonly counter: Locator;
  readonly terminal: Locator;
  readonly milestoneHeadings: Locator;
  readonly libraryLink: Locator;

  constructor(readonly page: Page) {
    this.intro = page.getByText(/^Un pequeño almacén clave-valor en /);
    this.counter = page.getByText(/^PROYECTO PERSONAL · \d \/ 5 HITOS$/);
    this.terminal = page.locator('#main pre.terminal');
    this.milestoneHeadings = page.getByRole('article').getByRole('heading', { level: 2 });
    this.libraryLink = page.getByRole('link', { name: 'Encontralos en la biblioteca' });
  }

  milestone(title: string): Locator {
    return this.page.getByRole('checkbox', { name: `Completar hito: ${title}`, exact: true });
  }

  hintToggle(title: string): Locator {
    return this.card(title).getByText('Necesito una pista', { exact: true });
  }

  hint(title: string): Locator {
    return this.card(title).locator('details');
  }

  hintText(title: string): Locator {
    return this.card(title).locator('details > p');
  }

  private card(title: string): Locator {
    return this.page.getByRole('article').filter({ has: this.milestone(title) });
  }
}
