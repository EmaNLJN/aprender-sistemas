import { expect, test } from '../fixtures';
import { curriculumIds, frozenProgress } from '../lib/curriculum';
import { urls } from '../lib/urls';

interface MarkedNode {
  __f6Marker?: true;
}

const LAB_ONLY = { 'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'] };
const BOSS = curriculumIds.exercises['rust-103'].title;

test.describe('what the page keeps that the legacy rebuilt (X1, X2 and C2)', () => {
  test('the rules stay open after choosing a world, filtering and answering', async ({
    shell,
    campaign,
    storage,
  }) => {
    await storage.seed(LAB_ONLY);
    await shell.goto(urls.view('campana'));
    await campaign.rulesSummary().click();

    await campaign.worldNode(1).click();
    await expect(campaign.rules()).toHaveJSProperty('open', true);
    await campaign.filter('Kata').click();
    await expect(campaign.rules()).toHaveJSProperty('open', true);
    await campaign.filter('Todas').click();
    await campaign.checkpointOption('B').click();
    await expect(campaign.rules()).toHaveJSProperty('open', true);
  });

  test('the requirements of a locked mission stay open after filtering', async ({
    shell,
    campaign,
  }) => {
    await shell.goto(urls.view('campana'));
    await campaign.missionCard(BOSS).getByText('Ver qué falta para entrar').click();

    await campaign.filter('Desafío final').click();

    await expect(campaign.missionRequirements(BOSS)).toHaveJSProperty('open', true);
  });

  test('the focused filter is the same node after filtering with the keyboard', async ({
    shell,
    campaign,
  }) => {
    await shell.goto(urls.view('campana'));
    const kata = campaign.filter('Kata');
    await kata.focus();
    await kata.evaluate((node) => {
      (node as MarkedNode).__f6Marker = true;
    });

    await kata.press('Enter');

    await expect(kata).toBeFocused();
    await expect(kata).toHaveJSProperty('__f6Marker', true);
  });

  test('the checkpoint feedback is the same node after answering', async ({
    shell,
    campaign,
    storage,
  }) => {
    await storage.seed(LAB_ONLY);
    await shell.goto(urls.view('campana'));
    await campaign.checkpointFeedback().evaluate((node) => {
      (node as MarkedNode).__f6Marker = true;
    });

    await campaign.checkpointOption('A').click();

    await expect(campaign.checkpointFeedback()).toContainText('Revisemos esa idea.');
    await expect(campaign.checkpointFeedback()).toHaveJSProperty('__f6Marker', true);
  });

  test.describe('without reduced motion', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the world node that loses the selection animates its box-shadow', async ({
      shell,
      campaign,
    }) => {
      await shell.goto(urls.view('campana'));

      const running = await campaign.worldMap().evaluate((map) => {
        const nodes = [...map.querySelectorAll('button')];
        nodes[1].click();
        return nodes[0].getAnimations().length;
      });

      expect(running).toBeGreaterThan(0);
    });
  });
});
