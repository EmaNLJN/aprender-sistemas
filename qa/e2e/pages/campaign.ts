import type { Locator, Page } from '@playwright/test';

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
}
