import type { Locator, Page } from '@playwright/test';

export type MissionFilterName = 'Todas' | 'Entrenamiento' | 'Reparación' | 'Kata' | 'Desafío final';

export class CampaignPage {
  constructor(readonly page: Page) {}

  freeLabLink(): Locator {
    return this.page.getByRole('link', { name: 'laboratorio libre' });
  }

  world(title: string): Locator {
    return this.page.getByRole('region', { name: title });
  }

  missionCard(title: string): Locator {
    return this.page
      .getByRole('article')
      .filter({ has: this.page.getByRole('heading', { level: 4, name: title }) });
  }

  missionLink(title: string): Locator {
    return this.missionCard(title).getByRole('link');
  }

  checkpoint(): Locator {
    return this.page.getByRole('region', {
      name: /El código funciona\. ¿Sabés por qué\?|Una idea que ya podés explicar\./,
    });
  }

  checkpointOption(letter: 'A' | 'B' | 'C'): Locator {
    return this.checkpoint().getByRole('button', { name: new RegExp(`^${letter}`) });
  }

  hero(): Locator {
    return this.page.locator('#main .quest-hero');
  }

  pills(): Locator {
    return this.page.locator('#main .quest-pills span');
  }

  rank(): Locator {
    return this.page.locator('#main .quest-rank');
  }

  rankSymbol(): Locator {
    return this.page.locator('#main .rank-symbol');
  }

  campaignProgress(): Locator {
    return this.page.getByRole('progressbar', { name: 'Experiencia de campaña' });
  }

  storageNotice(): Locator {
    return this.page
      .getByRole('status')
      .filter({ hasText: 'Este navegador no pudo guardar tu campaña.' });
  }

  worldMap(): Locator {
    return this.page.getByRole('navigation', { name: 'Mundos de la campaña' });
  }

  worldNode(position: number): Locator {
    return this.worldMap().getByRole('button', { name: new RegExp(`^Mundo ${position}: `) });
  }

  worldHeading(title: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: title, exact: true });
  }

  backToWorld(title: string): Locator {
    return this.page.getByRole('button', { name: `Volver a ${title} →`, exact: true });
  }

  nextWorldButton(): Locator {
    return this.page.getByRole('button', { name: 'Siguiente mundo →', exact: true });
  }

  projectLink(): Locator {
    return this.page.getByRole('link', { name: 'Llevarlo a mi proyecto ↗', exact: true });
  }

  nextMove(): Locator {
    return this.page.locator('#main .quest-next');
  }

  filter(name: MissionFilterName): Locator {
    return this.page
      .getByRole('group', { name: 'Tipo de misión' })
      .getByRole('button', { name, exact: true });
  }

  missionCards(): Locator {
    return this.page.locator('#main .quest-missions').getByRole('article');
  }

  missionRequirements(title: string): Locator {
    return this.missionCard(title).locator('details');
  }

  checkpointFeedback(): Locator {
    return this.checkpoint().getByRole('status');
  }

  badge(name: string, state: 'conseguida' | 'pendiente'): Locator {
    return this.page.getByLabel(`${name}: ${state}`, { exact: true });
  }

  rules(): Locator {
    return this.page.locator('#main details.quest-rules');
  }

  rulesSummary(): Locator {
    return this.page.getByText('Las reglas del juego y las herramientas que usamos', {
      exact: true,
    });
  }

  celebration(): Locator {
    return this.page.locator('canvas.quest-celebration');
  }
}
