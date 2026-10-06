import { expect, test } from '../fixtures';
import { curriculumIds } from '../lib/curriculum';
import { observeReload } from '../lib/document-marker';
import { urls } from '../lib/urls';
import type { AtlasPage } from '../pages/atlas';
import type { CampaignPage } from '../pages/campaign';
import type { LabPage } from '../pages/lab';
import type { ShellPage } from '../pages/shell';
import type { SystemsPage } from '../pages/systems';

interface Pages {
  shell: ShellPage;
  lab: LabPage;
  campaign: CampaignPage;
  systems: SystemsPage;
  atlas: AtlasPage;
}

const atlasLabId = curriculumIds.atlas['rust-identity'].labId;

test.describe('the links that change the query replace the document', () => {
  const MISSION = urls.campaignMission('rust-world-1', 'rust-02');
  const BOSS = urls.campaignMission('rust-world-1', 'rust-103');
  const SYSTEMS_CORE = urls.systemsCode('cache', 'rust-113');
  const WORLD = urls.world('rust-world-1');
  const WORKSHOP_BUILD = '/?taller=cache&parte=build&lenguaje=rust#sistemas';

  const links: {
    id: string;
    start: string;
    follow: (pages: Pages) => Promise<void>;
    lands: string;
  }[] = [
    {
      id: 'L1 menu «Laboratorio»',
      start: urls.view('recorrido'),
      follow: ({ shell }) => shell.openFromMenu('laboratorio'),
      lands: urls.view('laboratorio'),
    },
    {
      id: 'L2 menu «Laboratorio» inside a campaign mission',
      start: MISSION,
      follow: ({ shell }) => shell.openFromMenu('laboratorio'),
      lands: urls.view('laboratorio'),
    },
    {
      id: 'L3 «laboratorio libre» of the campaign',
      start: urls.view('campana'),
      follow: ({ campaign }) => campaign.freeLabLink().click(),
      lands: urls.view('laboratorio'),
    },
    {
      id: 'L4 «Abrir misión» of the campaign',
      start: urls.view('campana'),
      follow: ({ campaign }) =>
        campaign.missionLink(curriculumIds.exercises['rust-02'].title).click(),
      lands: MISSION,
    },
    {
      id: 'L5 way back to the world, from the context block',
      start: MISSION,
      follow: ({ lab }) => lab.contextBackLink().click(),
      lands: WORLD,
    },
    {
      id: 'L6 «Ver mi mapa» of the lock',
      start: BOSS,
      follow: ({ lab }) => lab.campaignLockMapLink().click(),
      lands: WORLD,
    },
    {
      id: 'L7 «Entrar al IDE» of Systems',
      start: urls.workshop('rust', 'cache', 'build'),
      follow: ({ systems }) => systems.enterIde().click(),
      lands: SYSTEMS_CORE,
    },
    {
      id: 'L8 way back to the workshop, from the context block',
      start: SYSTEMS_CORE,
      follow: ({ lab }) => lab.contextBackLink().click(),
      lands: WORKSHOP_BUILD,
    },
    {
      id: 'L9 «Ir al laboratorio» of the Atlas',
      start: urls.view('atlas'),
      follow: ({ atlas }) => atlas.labLink().click(),
      lands: urls.exercise(atlasLabId, 'learn'),
    },
    {
      id: 'L10 «Volver al mapa» inside a campaign mission',
      start: MISSION,
      follow: ({ lab }) => lab.backButton().click(),
      lands: WORLD,
    },
    {
      id: 'L11 «Volver al taller» inside a Systems core',
      start: SYSTEMS_CORE,
      follow: ({ lab }) => lab.backButton().click(),
      lands: WORKSHOP_BUILD,
    },
  ];

  for (const link of links) {
    test(`${link.id} replaces the document`, async ({
      shell,
      lab,
      campaign,
      systems,
      atlas,
      page,
    }) => {
      await shell.goto(link.start);

      const pages: Pages = { shell, lab, campaign, systems, atlas };
      const reloaded = await observeReload(page, () => link.follow(pages));

      expect(reloaded).toBe(true);
      await expect(page).toHaveURL(link.lands);
    });
  }
});

test.describe('the links that only change the hash keep the document', () => {
  test('C1 menu «Biblioteca»', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));

    const reloaded = await observeReload(page, () => shell.openFromMenu('biblioteca'));

    expect(reloaded).toBe(false);
    await expect(shell.heading('biblioteca')).toBeVisible();
  });

  test('C2 the language switch rewrites the query in place', async ({ shell, page }) => {
    await shell.goto('/?basura=1#biblioteca');

    const reloaded = await observeReload(page, () => shell.switchLanguage('go'));

    expect(reloaded).toBe(false);
    await expect(page).toHaveURL(urls.view('biblioteca'));
  });

  test('C3 opening an exercise from the map rewrites the query in place', async ({
    shell,
    lab,
    page,
  }) => {
    await shell.goto(urls.view('laboratorio'));

    const reloaded = await observeReload(page, () => lab.startButton().click());

    expect(reloaded).toBe(false);
    await expect(page).toHaveURL(/\?ejercicio=rust-01&paso=learn#laboratorio$/);
  });
});

test.describe('what stays in memory', () => {
  test('the focus timer survives a hash navigation and is lost on a reload', async ({
    shell,
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-05T12:00:00-03:00') });
    await page.clock.pauseAt(new Date('2026-10-05T12:00:01-03:00'));
    await shell.goto(urls.view('recorrido'));
    await page.getByRole('button', { name: 'Iniciar foco' }).click();
    await page.clock.runFor(60_000);
    await expect(page.getByRole('timer')).toHaveText('24:00');

    await shell.openFromMenu('biblioteca');
    await shell.openFromMenu('recorrido');
    await expect(page.getByRole('timer')).toHaveText('24:00');
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();

    await shell.openFromMenu('laboratorio');
    await shell.openFromMenu('recorrido');
    await expect(page.getByRole('timer')).toHaveText('25:00');
    await expect(page.getByRole('button', { name: 'Iniciar foco' })).toBeVisible();
  });

  test('the Atlas session survives a hash navigation and is lost on a reload', async ({
    shell,
    atlas,
  }) => {
    await shell.goto(urls.view('atlas'));
    await atlas.concept('03').click();
    await expect(atlas.concept('03')).toHaveAttribute('aria-current', 'true');

    await shell.openFromMenu('proyecto');
    await shell.openFromMenu('atlas');
    await expect(atlas.concept('03')).toHaveAttribute('aria-current', 'true');

    await shell.openFromMenu('laboratorio');
    await shell.openFromMenu('atlas');
    await expect(atlas.concept('01')).toHaveAttribute('aria-current', 'true');
    await expect(atlas.concept('03')).not.toHaveAttribute('aria-current', 'true');
  });

  test('the Systems simulation survives a hash navigation and is lost on a reload', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await expect(systems.traceEntries()).not.toHaveCount(0);

    await shell.openFromMenu('proyecto');
    await shell.openFromMenu('sistemas');
    await expect(systems.traceEntries()).not.toHaveCount(0);

    await shell.openFromMenu('laboratorio');
    await shell.openFromMenu('sistemas');
    await systems.openWorkshop('Una caché que aprende tus visitas');
    await expect(systems.workshopHeading('Una caché que aprende tus visitas')).toBeVisible();
    await expect(systems.traceEntries()).toHaveCount(0);
  });
});
