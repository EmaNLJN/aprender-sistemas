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

  familyFilter(name: string): Locator {
    return this.page
      .getByRole('group', { name: 'Familia de talleres' })
      .getByRole('button', { name, exact: true });
  }

  resultCount(): Locator {
    return this.page.getByText(/^\d+ talleres para explorar$/);
  }

  // The overview counter has no role or name: the class is its locator.
  overviewCount(): Locator {
    return this.page.locator('.sys-overview-progress strong');
  }

  overviewProgress(): Locator {
    return this.page.getByRole('progressbar', {
      name: 'Talleres con modelo, código y checkpoint completados',
    });
  }

  workshopCards(): Locator {
    return this.page
      .getByRole('article')
      .filter({ has: this.page.getByRole('button', { name: 'Explorar →' }) });
  }

  cardSeals(title: string): Locator {
    return this.workshopCard(title).getByText(/sellos|Tres sellos conseguidos/);
  }

  openButton(title: string): Locator {
    return this.workshopCard(title).getByRole('button', { name: 'Explorar →' });
  }

  clearFilters(): Locator {
    return this.page.getByRole('button', { name: 'Ver todos los talleres' });
  }

  backToCatalog(): Locator {
    return this.page.getByRole('button', { name: '← Todos los talleres' });
  }

  anyWorkshopHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  partTabs(): Locator {
    return this.page.getByRole('group', { name: 'Etapas del taller' });
  }

  nextPart(name: 'Programar el núcleo →' | 'Armar mi proyecto →'): Locator {
    return this.page.getByRole('button', { name });
  }

  seal(label: 'Modelo explorado' | 'Código verificado' | 'Checkpoint razonado'): Locator {
    return this.seals().locator('span', { hasText: label });
  }

  // Objective rows have no role or name: the class is their locator.
  objective(label: string): Locator {
    return this.page.locator('.sys-goal', { hasText: label });
  }

  resetModel(): Locator {
    return this.page.getByRole('button', { name: 'Reiniciar modelo ↺' });
  }

  modelControls(): Locator {
    return this.page.getByRole('group', { name: 'Acciones del modelo' }).getByRole('button');
  }

  // The live model text shares role="status" with other regions and has no name.
  modelLive(): Locator {
    return this.page.locator('#sys-model-live');
  }

  // The trace is a details element without an accessible name.
  trace(): Locator {
    return this.page.locator('details.sys-trace');
  }

  traceSummary(): Locator {
    return this.page.getByText('Qué cambió y por qué · últimos pasos');
  }

  stateTable(): Locator {
    return this.page.getByRole('region', { name: 'Estado del modelo' });
  }

  scene(): Locator {
    return this.page.locator('#sys-model-view').getByRole('img');
  }

  // The answers container has no role or name.
  checkpointOption(text: string): Locator {
    return this.page.locator('.sys-answers').getByRole('button').filter({ hasText: text });
  }

  // The checkpoint feedback shares role="status" with other regions and has no name.
  checkpointFeedback(): Locator {
    return this.page.locator('.sys-feedback');
  }

  storageWarning(): Locator {
    return this.page.getByText(
      'No se pudo guardar el progreso. Exportá una copia antes de cerrar.',
    );
  }

  coreTitle(title: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: title });
  }

  realTests(): Locator {
    return this.page.getByText(/^\d+ pruebas reales$/);
  }

  relatedLink(exerciseId: string): Locator {
    return this.page.getByRole('link', { name: new RegExp(`^${exerciseId}\\D`) });
  }

  codePassed(): Locator {
    return this.page.getByText(/^✓ Este núcleo tiene una ejecución registrada/);
  }

  downloadKit(language: 'Rust' | 'Go'): Locator {
    return this.page.getByRole('button', { name: `Descargar kit ${language} ↓` });
  }

  stepCheckbox(index: number): Locator {
    return this.page
      .getByRole('checkbox', { name: 'Lo comprobé en mi proyecto · registro manual' })
      .nth(index);
  }

  // The note status has no role or name.
  noteStatus(): Locator {
    return this.page.locator('#sys-note-status');
  }

  // The confetti canvas is aria-hidden and has no name.
  celebration(): Locator {
    return this.page.locator('canvas.quest-celebration');
  }

  async mainTop(): Promise<number> {
    return this.page
      .locator('#main')
      .evaluate((element) => Math.round(element.getBoundingClientRect().top));
  }

  async partTabsTop(): Promise<number> {
    return this.partTabs().evaluate((element) => Math.round(element.getBoundingClientRect().top));
  }
}
