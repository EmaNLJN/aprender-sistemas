import { expect, test } from '../fixtures';
import { curriculumIds, frozenProgress, type Language } from '../lib/curriculum';
import { urls, type Phase, type View } from '../lib/urls';
import type { ShellPage } from '../pages/shell';

const title = (exerciseId: string) => curriculumIds.exercises[exerciseId].title;
const ALL_VIEWS: View[] = [
  'recorrido',
  'biblioteca',
  'proyecto',
  'metodo',
  'atlas',
  'campana',
  'sistemas',
  'laboratorio',
];

async function expectLanguage(shell: ShellPage, language: Language) {
  const other: Language = language === 'rust' ? 'go' : 'rust';
  await expect(shell.languageButton(language)).toHaveAttribute('aria-pressed', 'true');
  await expect(shell.languageButton(other)).toHaveAttribute('aria-pressed', 'false');
}

test.describe('?ejercicio=&paso=#laboratorio', () => {
  const phases: Phase[] = ['learn', 'code', 'reflect'];
  for (const phase of phases) {
    test(`opens a Rust exercise at the ${phase} phase`, async ({ shell, lab, page }) => {
      await shell.goto(urls.exercise('rust-02', phase));

      await expect(shell.menuLink('laboratorio')).toHaveAttribute('aria-current', 'page');
      await expect(lab.exerciseTitle()).toHaveText(title('rust-02'));
      await expect(lab.tab(phase)).toHaveAttribute('aria-selected', 'true');
      await expectLanguage(shell, 'rust');
      await expect(page).toHaveURL(urls.exercise('rust-02', phase));
    });
  }

  test('a Go exercise switches the language to Go', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('go-113', 'code'));

    await expect(lab.exerciseTitle()).toHaveText(title('go-113'));
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    await expectLanguage(shell, 'go');
  });

  test('the language of the link wins over the saved one', async ({ shell, lab, storage }) => {
    // The frozen progress of master was saved with the Go language.
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });

    await shell.goto(urls.exercise('rust-02', 'learn'));

    await expect(lab.exerciseTitle()).toHaveText(title('rust-02'));
    await expectLanguage(shell, 'rust');
  });

  test('an unknown exercise opens the map and drops the query', async ({ shell, page }) => {
    await shell.goto('/?ejercicio=no-existe&paso=learn#laboratorio');

    await expect(shell.heading('laboratorio')).toBeVisible();
    await expect(page).toHaveURL(urls.view('laboratorio'));
  });

  test('an unknown phase opens the exercise at learn', async ({ shell, lab, page }) => {
    await shell.goto('/?ejercicio=rust-02&paso=inventada#laboratorio');

    await expect(lab.tab('learn')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(urls.exercise('rust-02', 'learn'));
  });

  for (const parameter of ['campana=rust-world-1', 'sistema=cache']) {
    test(`?${parameter} without an exercise opens the map and drops it`, async ({
      shell,
      page,
    }) => {
      await shell.goto(`/?${parameter}#laboratorio`);

      await expect(shell.heading('laboratorio')).toBeVisible();
      await expect(page).toHaveURL(urls.view('laboratorio'));
    });
  }

  test('?#laboratorio opens the map', async ({ shell, page }) => {
    await shell.goto(urls.freeLab);

    await expect(shell.heading('laboratorio')).toBeVisible();
    await expect(page).toHaveURL(urls.view('laboratorio'));
  });
});

test.describe('?campana= and ?sistema= select the exercise like ?ejercicio=', () => {
  test('a campaign mission opens at its phase', async ({ shell, lab }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-02', 'learn'));

    await expect(lab.exerciseTitle()).toHaveText(title('rust-02'));
    await expect(lab.tab('learn')).toHaveAttribute('aria-selected', 'true');
  });

  test('a Systems core opens at the code phase, in its language', async ({ shell, lab }) => {
    await shell.goto(urls.systemsCode('cache', 'go-113'));

    await expect(lab.exerciseTitle()).toHaveText(title('go-113'));
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    await expectLanguage(shell, 'go');
  });
});

test.describe('?mundo=#campana', () => {
  const cases: [string, Language, string][] = [
    ['rust-world-1', 'rust', 'Estación del robot'],
    ['rust-world-2', 'rust', 'Puerto de señales'],
    ['go-world-1', 'go', 'La estación del rover'],
  ];
  for (const [world, language, worldTitle] of cases) {
    test(`opens ${world} in ${language}`, async ({ shell, campaign }) => {
      await shell.goto(urls.world(world));

      await expect(shell.menuLink('campana')).toHaveAttribute('aria-current', 'page');
      await expect(campaign.world(worldTitle)).toBeVisible();
      await expectLanguage(shell, language);
    });
  }

  test('an unknown world keeps the first open world', async ({ shell, campaign, page }) => {
    await shell.goto(urls.world('nada'));

    await expect(campaign.world('Estación del robot')).toBeVisible();
    await expect(page).toHaveURL(urls.world('nada'));
  });
});

test.describe('?lenguaje=&taller=&parte=#sistemas', () => {
  test('opens that workshop at that part in that language', async ({ shell, systems }) => {
    await shell.goto(urls.workshop('go', 'cache', 'ship'));

    await expectLanguage(shell, 'go');
    await expect(systems.workshopHeading('Una caché que aprende tus visitas')).toBeVisible();
    await expect(systems.part('ship')).toHaveAttribute('aria-pressed', 'true');
  });

  test('?lenguaje= alone opens the catalog in that language', async ({ shell }) => {
    await shell.goto(urls.workshop('go'));

    await expectLanguage(shell, 'go');
    await expect(shell.heading('sistemas')).toBeVisible();
  });

  test('an unknown workshop opens the catalog', async ({ shell }) => {
    await shell.goto('/?taller=inexistente#sistemas');

    await expect(shell.heading('sistemas')).toBeVisible();
  });
});

test.describe('the Atlas links to the lab', () => {
  const concepts: [Language, string, string][] = [
    ['rust', 'rust-identity', '01'],
    ['rust', 'rust-syntax', '02'],
    ['go', 'go-identity', '01'],
  ];
  for (const [language, concept, number] of concepts) {
    test(`${concept} goes to its exercise at learn`, async ({ shell, atlas, lab, page }) => {
      const { labId } = curriculumIds.atlas[concept];
      await shell.goto(urls.view('atlas'));
      if (language === 'go') await shell.switchLanguage('go');
      await atlas.concept(number).click();

      await expect(atlas.labLink()).toHaveAttribute('href', urls.exercise(labId, 'learn').slice(1));
      await atlas.labLink().click();

      await expect(page).toHaveURL(urls.exercise(labId, 'learn'));
      await expect(lab.exerciseTitle()).toHaveText(title(labId));
    });
  }
});

test.describe('the language switch writes the query', () => {
  for (const view of ALL_VIEWS) {
    test(`from #${view}`, async ({ shell, page }) => {
      await shell.goto(`/?basura=1#${view}`);

      await shell.switchLanguage('go');

      await expectLanguage(shell, 'go');
      // Systems adds `lenguaje` to the query; every other view empties it.
      const expected = view === 'sistemas' ? '/?basura=1&lenguaje=go#sistemas' : urls.view(view);
      await expect(page).toHaveURL(expected);
    });
  }
});
