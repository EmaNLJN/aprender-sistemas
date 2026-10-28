import { expect, test } from '../fixtures';
import { savedCampaign } from '../lib/campaign-progress';
import { curriculumIds, frozenProgress } from '../lib/curriculum';
import { urls } from '../lib/urls';

const MASTER_RUST = {
  'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'],
  'taller-campaign-v1': frozenProgress['taller-campaign-v1'],
  'taller-systems-v1': frozenProgress['taller-systems-v1'],
};
const MASTER_GO = frozenProgress;
const LAB_ONLY = { 'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'] };

const TITLE = (id: string) => curriculumIds.exercises[id].title;

const CAMPAIGN_KEY = 'taller-campaign-v1';
const campaignWrites = (writes: string[]) =>
  writes.filter((write) => write.startsWith(`set ${CAMPAIGN_KEY}`));

test.describe('the hero and the map of the campaign', () => {
  test('an empty browser opens Rust at world 1 with nothing earned', async ({
    shell,
    campaign,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('campana'));

    await expect(campaign.hero()).toContainText('CAMPAÑA · RUST');
    await expect(campaign.pills()).toHaveText(['4 mundos', '24 misiones', '12 desafíos nuevos']);
    await expect(campaign.rank()).toContainText('TU RANGO');
    await expect(campaign.rank()).toContainText('Explorador');
    await expect(campaign.rank().getByText('0 / 720 XP de campaña', { exact: true })).toBeVisible();
    await expect(campaign.rank()).toContainText('0 de 4 insignias');
    await expect(campaign.campaignProgress()).toHaveAttribute('max', '720');
    await expect(campaign.campaignProgress()).toHaveAttribute('value', '0');
    await expect(campaign.worldNode(1)).toHaveAccessibleName(
      'Mundo 1: Estación del robot, disponible',
    );
    await expect(campaign.worldNode(1)).toHaveAttribute('aria-pressed', 'true');
    const lockedNodes = [
      'Mundo 2: Puerto de señales, bloqueado; ver requisitos',
      'Mundo 3: Archivo de rutas, bloqueado; ver requisitos',
      'Mundo 4: Núcleo de la máquina, bloqueado; ver requisitos',
    ];
    for (const [index, name] of lockedNodes.entries()) {
      const node = campaign.worldNode(index + 2);
      await expect(node).toHaveAccessibleName(name);
      await expect(node).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(campaign.world('Estación del robot')).toContainText('Inicial / TU EXPEDICIÓN');
    await expect(
      campaign.world('Estación del robot').getByText('0/ 180 XP', { exact: true }),
    ).toBeVisible();
    await expect(campaign.storageNotice()).toHaveCount(0);
    await expect(campaign.freeLabLink()).toHaveAttribute('href', '?#laboratorio');
    expect(await storage.writes()).toEqual([]);
  });

  test('the progress of master in Rust shows one badge and selects the first open world', async ({
    shell,
    campaign,
    storage,
  }) => {
    await storage.seed(MASTER_RUST);
    await shell.goto(urls.view('campana'));

    await expect(campaign.rank()).toContainText('Aprendiz de sistemas');
    await expect(campaign.rank()).toContainText('180 / 720 XP de campaña');
    await expect(campaign.rank()).toContainText('1 de 4 insignias');
    await expect(campaign.rankSymbol()).toHaveText('◈');
    await expect(campaign.worldNode(1)).toHaveAccessibleName(
      'Mundo 1: Estación del robot, completado',
    );
    await expect(campaign.worldNode(1)).toContainText('Insignia conseguida');
    await expect(campaign.worldNode(1)).toHaveAttribute('aria-pressed', 'false');
    await expect(campaign.worldNode(2)).toHaveAccessibleName(
      'Mundo 2: Puerto de señales, disponible',
    );
    await expect(
      campaign.worldNode(2).getByText('0/180 XP · explorar →', { exact: true }),
    ).toBeVisible();
    await expect(campaign.worldNode(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(campaign.world('Puerto de señales')).toContainText('Intermedio / TU EXPEDICIÓN');
    await expect(campaign.badge('Piloto de estados', 'conseguida')).toContainText('CONSEGUIDA');
    await expect(campaign.badge('Custodia del protocolo', 'pendiente')).toContainText(
      'POR DESCUBRIR',
    );
  });

  test('the progress of master with its saved language opens Go', async ({
    shell,
    campaign,
    storage,
  }) => {
    await storage.seed(MASTER_GO);
    await shell.goto(urls.view('campana'));

    await expect(campaign.hero()).toContainText('CAMPAÑA · GO');
    await expect(campaign.rank()).toContainText('Explorador');
    await expect(campaign.rank().getByText('0 / 720 XP de campaña', { exact: true })).toBeVisible();
    await expect(campaign.world('La estación del rover')).toBeVisible();
  });
});

test.describe('choosing a world', () => {
  test('choosing a world rewrites ?mundo= in place, presses it and focuses its title', async ({
    shell,
    campaign,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto('/?mundo=rust-world-1&extra=1#campana');
    const historyLength = await page.evaluate(() => history.length);

    await campaign.worldNode(2).click();

    await expect(campaign.world('Puerto de señales')).toBeVisible();
    await expect(campaign.worldNode(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(campaign.worldNode(1)).toHaveAttribute('aria-pressed', 'false');
    await expect(page).toHaveURL(/\/\?mundo=rust-world-2#campana$/);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    await expect(campaign.worldHeading('Puerto de señales')).toBeFocused();
    expect(campaignWrites(await storage.writes())).toEqual([]);
  });

  test('a locked world shows its requirement and the way back to the open world', async ({
    shell,
    campaign,
    page,
  }) => {
    await shell.goto(urls.view('campana'));

    await campaign.worldNode(3).click();

    const locked = campaign.world('Archivo de rutas');
    await expect(locked).toContainText('Avanzado / PRÓXIMA FRONTERA');
    await expect(locked).toContainText('Esta región tiene un requisito.');
    await expect(locked).toContainText(
      'Podés conocer su tema ahora. Sus misiones se habilitan cuando completes los mundos anteriores.',
    );
    const requirements = locked.getByRole('listitem');
    await expect(requirements).toHaveCount(2);
    await expect(requirements.nth(0)).toHaveText(/^Completá «Estación del robot»:/);
    await expect(requirements.nth(1)).toHaveText(/^Completá «Puerto de señales»:/);

    await campaign.backToWorld('Estación del robot').click();

    await expect(campaign.world('Estación del robot')).toBeVisible();
    await expect(page).toHaveURL(/\/\?mundo=rust-world-1#campana$/);
    await expect(campaign.worldHeading('Estación del robot')).toBeFocused();
  });
});

test.describe('the mission filter', () => {
  test('each filter shows the missions of its type, keeps the focus and resets on a new world', async ({
    shell,
    campaign,
    storage,
  }) => {
    await storage.seed(MASTER_RUST);
    await shell.goto(urls.view('campana'));
    await expect(campaign.world('Puerto de señales')).toBeVisible();

    const cases = [
      { filter: 'Entrenamiento', ids: ['rust-18', 'rust-27', 'rust-78'], kind: 'Entrenamiento' },
      { filter: 'Reparación', ids: ['rust-104'], kind: 'Reparación · lings' },
      { filter: 'Kata', ids: ['rust-105'], kind: 'Kata' },
      { filter: 'Desafío final', ids: ['rust-106'], kind: 'Desafío final' },
    ] as const;
    const everyFilter = ['Todas', ...cases.map((entry) => entry.filter)] as const;

    for (const { filter, ids, kind } of cases) {
      await campaign.filter(filter).click();

      await expect(campaign.missionCards()).toHaveCount(ids.length);
      for (const id of ids) {
        await expect(
          campaign.missionCard(TITLE(id)).getByText(kind, { exact: true }),
        ).toBeVisible();
      }
      await expect(campaign.filter(filter)).toHaveAttribute('aria-pressed', 'true');
      await expect(campaign.filter(filter)).toBeFocused();
      for (const other of everyFilter.filter((name) => name !== filter)) {
        await expect(campaign.filter(other)).toHaveAttribute('aria-pressed', 'false');
      }
    }

    await campaign.filter('Todas').click();
    await expect(campaign.missionCards()).toHaveCount(6);
    await expect(campaign.filter('Todas')).toHaveAttribute('aria-pressed', 'true');
    await expect(campaign.filter('Todas')).toBeFocused();
    for (const other of everyFilter.filter((name) => name !== 'Todas')) {
      await expect(campaign.filter(other)).toHaveAttribute('aria-pressed', 'false');
    }

    await campaign.filter('Kata').click();
    await expect(campaign.filter('Kata')).toHaveAttribute('aria-pressed', 'true');
    await campaign.worldNode(1).click();
    await expect(campaign.filter('Todas')).toHaveAttribute('aria-pressed', 'true');
    await expect(campaign.filter('Kata')).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('the mission cards', () => {
  test('mission cards of a completed world show their seals, the assisted practice and the way back', async ({
    shell,
    campaign,
    storage,
  }) => {
    await storage.seed(MASTER_RUST);
    await shell.goto(urls.view('campana'));
    await campaign.worldNode(1).click();

    const assisted = campaign.missionCard(TITLE('rust-22'));
    await expect(assisted.getByText('Entrenamiento', { exact: true })).toBeVisible();
    await expect(assisted).toContainText('30/30 XP');
    await expect(assisted).toContainText('✓ Pruebas · 20');
    await expect(assisted).toContainText('✓ Predicción · 10');
    await expect(assisted).toContainText('Práctica con solución de apoyo');
    await expect(campaign.missionLink(TITLE('rust-22'))).toHaveAccessibleName(
      'Volver a experimentar ↗',
    );
    await expect(campaign.missionLink(TITLE('rust-22'))).toHaveAttribute(
      'href',
      '?campana=rust-world-1&ejercicio=rust-22&paso=learn#laboratorio',
    );
    await expect(campaign.missionLink(TITLE('rust-103'))).toHaveAccessibleName(
      'Volver a experimentar ↗',
    );
  });

  test('an open mission links to the lab and a locked boss lists what is missing', async ({
    shell,
    campaign,
    page,
  }) => {
    await shell.goto(urls.view('campana'));

    const open = campaign.missionCard(TITLE('rust-02'));
    await expect(open.getByText('0/30 XP', { exact: true })).toBeVisible();
    await expect(open).toContainText('○ Pruebas · 20');
    await expect(open).toContainText('○ Predicción · 10');
    await expect(campaign.missionLink(TITLE('rust-02'))).toHaveAccessibleName('Abrir misión ↗');
    await expect(campaign.missionLink(TITLE('rust-02'))).toHaveAttribute(
      'href',
      '?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio',
    );

    const boss = TITLE('rust-103');
    await expect(campaign.missionLink(boss)).toHaveCount(0);
    await expect(campaign.missionRequirements(boss)).toHaveJSProperty('open', false);
    await campaign.missionCard(boss).getByText('Ver qué falta para entrar').click();
    await expect(campaign.missionRequirements(boss)).toHaveJSProperty('open', true);
    const missing = campaign.missionRequirements(boss).getByRole('listitem');
    await expect(missing).toHaveCount(5);
    const expectedIds = ['rust-02', 'rust-06', 'rust-22', 'rust-101', 'rust-102'];
    for (const [index, id] of expectedIds.entries()) {
      await expect(missing.nth(index)).toContainText(`(${id})`);
    }

    await page.evaluate(
      ([key, saved]) => localStorage.setItem(key, saved),
      [CAMPAIGN_KEY, savedCampaign({ codeOnly: expectedIds })],
    );
    await page.reload();

    await expect(campaign.missionLink(boss)).toHaveAccessibleName('Enfrentar el desafío final ↗');
    await expect(campaign.missionLink(boss)).toHaveAttribute(
      'href',
      '?campana=rust-world-1&ejercicio=rust-103&paso=learn#laboratorio',
    );
  });
});

test.describe('the next move', () => {
  test('the next move asks for the IDE and then for the prediction', async ({
    shell,
    campaign,
    page,
  }) => {
    const href = '?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio';
    await shell.goto(urls.view('campana'));

    await expect(campaign.nextMove()).toContainText('TU SIGUIENTE MOVIMIENTO');
    await expect(campaign.nextMove()).toContainText(TITLE('rust-02'));
    await expect(campaign.nextMove()).toContainText('Una misión, una hipótesis y tres pruebas.');
    const enter = campaign.nextMove().getByRole('link', { name: 'Entrar al IDE ↗', exact: true });
    await expect(enter).toHaveAttribute('href', href);

    await page.evaluate(
      ([key, saved]) => localStorage.setItem(key, saved),
      [CAMPAIGN_KEY, savedCampaign({ codeOnly: ['rust-02'] })],
    );
    await page.reload();

    await expect(campaign.nextMove()).toContainText(
      'Código aprobado. Volvé a Descubrí y razoná la predicción.',
    );
    const predict = campaign
      .nextMove()
      .getByRole('link', { name: 'Resolver predicción ↗', exact: true });
    await expect(predict).toHaveAttribute('href', href);
  });
});

test.describe('the checkpoint', () => {
  test('a closed checkpoint explains how it opens', async ({ shell, campaign }) => {
    await shell.goto(urls.view('campana'));

    await expect(campaign.checkpoint()).toHaveAccessibleName('El código funciona. ¿Sabés por qué?');
    await expect(campaign.checkpoint()).toContainText('CHECKPOINT · LA ÚLTIMA LLAVE');
    await expect(campaign.checkpoint()).toContainText(
      'Se abre al verificar las seis misiones, reunir 150 XP y resolver la predicción del desafío final.',
    );
    await expect(campaign.checkpoint().getByRole('button')).toHaveCount(0);
  });

  test('answering the checkpoint wrong and then right completes the world and survives a reload', async ({
    shell,
    campaign,
    storage,
    page,
  }) => {
    await storage.seed(LAB_ONLY);
    await storage.watchWrites();
    await shell.goto(urls.view('campana'));

    await expect(campaign.checkpoint()).toContainText(
      'El robot propone moverse, pero el destino es una pared.',
    );
    await expect(campaign.checkpoint().getByRole('button')).toHaveCount(3);
    for (const letter of ['A', 'B', 'C'] as const) {
      await expect(campaign.checkpointOption(letter)).toBeVisible();
    }
    await expect(campaign.checkpointFeedback()).toHaveText(
      'Elegí la explicación que mejor sostenga tu decisión.',
    );

    await campaign.checkpointOption('A').click();

    await expect(campaign.checkpointOption('A')).toHaveAttribute('aria-pressed', 'true');
    await expect(campaign.checkpointOption('A')).toHaveClass(/incorrect/);
    await expect(campaign.checkpointOption('A')).toBeFocused();
    await expect(campaign.checkpointFeedback()).toContainText('Revisemos esa idea.');
    await expect(campaign.checkpointFeedback()).toContainText(
      'La batería pertenece a la transición aceptada.',
    );
    await expect(shell.toast).toHaveText('Leé el porqué y probá otra explicación.');
    expect(campaignWrites(await storage.writes())).toHaveLength(1);

    await campaign.checkpointOption('B').click();

    await expect(shell.toast).toHaveText(
      '¡Piloto de estados! Un mundo completado. Tu próximo nivel está disponible.',
    );
    await expect(campaign.checkpointFeedback()).toContainText('Bien razonado.');
    await expect(campaign.checkpoint()).toHaveAccessibleName('Una idea que ya podés explicar.');
    await expect(
      page.getByRole('status').filter({ hasText: 'Insignia conseguida: Piloto de estados' }),
    ).toBeVisible();
    await expect(campaign.checkpointOption('B')).toHaveAttribute('aria-pressed', 'true');
    await expect(campaign.checkpointOption('B')).toBeFocused();
    await expect(campaign.nextWorldButton()).toBeVisible();
    expect(campaignWrites(await storage.writes())).toHaveLength(2);

    await page.reload();

    await expect(campaign.world('Puerto de señales')).toBeVisible();
    await campaign.worldNode(1).click();
    await expect(campaign.checkpointOption('B')).toHaveAttribute('aria-pressed', 'true');

    await campaign.nextWorldButton().click();

    await expect(campaign.world('Puerto de señales')).toBeVisible();
    await expect(page).toHaveURL(/\/\?mundo=rust-world-2#campana$/);
  });
});
