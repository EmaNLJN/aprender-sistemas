import type { Locator, Page } from '@playwright/test';
import type { SystemsPart } from '../lib/urls';

const PART_NAME: Record<SystemsPart, RegExp> = {
  explore: /Manipulá el sistema/,
  build: /Programá su núcleo/,
  ship: /Llevátelo a un proyecto/,
};

export class SystemsPage {
  constructor(readonly page: Page) {}

  search(): Locator {
    return this.page.getByRole('searchbox', { name: 'Buscar talleres de sistemas' });
  }

  emptyCatalog(): Locator {
    return this.page.getByRole('heading', { name: 'No aparece ese taller.' });
  }

  workshopCard(title: string): Locator {
    return this.page
      .getByRole('article')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: title }) });
  }

  async openWorkshop(title: string): Promise<void> {
    await this.workshopCard(title)
      .getByRole('button', { name: /^Explorar/ })
      .click();
  }

  workshopHeading(title: string): Locator {
    return this.page.getByRole('heading', { level: 1, name: title });
  }

  part(part: SystemsPart): Locator {
    return this.page.getByRole('button', { name: PART_NAME[part] });
  }

  seals(): Locator {
    return this.page.getByLabel('Progreso del taller');
  }

  enterIde(): Locator {
    return this.page.getByRole('link', { name: /Entrar al IDE/ });
  }

  modelButton(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  // Model trace list without role or name: the class is its locator.
  traceEntries(): Locator {
    return this.page.locator('.sys-trace li');
  }

  note(): Locator {
    return this.page.getByRole('textbox', { name: 'Dejá tu próximo experimento por escrito' });
  }
}
