import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { urls } from '../lib/urls';

const TITLE = {
  'rust-100': '100 Exercises to Learn Rust',
  'rust-rover': '100 Exercises en RustRover',
  rustlings: 'Rustlings',
  'rust-brown': 'Rust Book interactivo de Brown',
  'rust-google': 'Comprehensive Rust en español',
  codecrafters: 'CodeCrafters',
  protohackers: 'Protohackers',
  'go-tour': 'A Tour of Go',
  'go-tests': 'Learn Go with Tests',
  'go-exercism': 'Exercism · Go',
  gophercises: 'Gophercises',
  'boot-dev': 'Boot.dev · Go',
  context7: 'Context7',
  'rust-examples': 'Rust by Example',
  'go-examples': 'Go by Example',
} as const;
type ResourceId = keyof typeof TITLE;

const ALL: ResourceId[] = [
  'rust-100',
  'rust-rover',
  'rustlings',
  'rust-brown',
  'rust-google',
  'codecrafters',
  'protohackers',
  'go-tour',
  'go-tests',
  'go-exercism',
  'gophercises',
  'boot-dev',
  'context7',
  'rust-examples',
  'go-examples',
];
const RUST: ResourceId[] = [
  'rust-100',
  'rust-rover',
  'rustlings',
  'rust-brown',
  'rust-google',
  'codecrafters',
  'protohackers',
  'context7',
  'rust-examples',
];
const GO: ResourceId[] = [
  'codecrafters',
  'protohackers',
  'go-tour',
  'go-tests',
  'go-exercism',
  'gophercises',
  'boot-dev',
  'context7',
  'go-examples',
];
const FREE: ResourceId[] = [
  'rust-100',
  'rustlings',
  'rust-brown',
  'rust-google',
  'protohackers',
  'go-tour',
  'go-tests',
  'go-exercism',
  'gophercises',
  'rust-examples',
  'go-examples',
];
const MIXED: ResourceId[] = ['rust-rover', 'codecrafters', 'boot-dev', 'context7'];
const BY_CATEGORY = {
  Ejercicios: ['rust-100', 'rust-rover', 'rustlings', 'go-tour', 'go-exercism', 'boot-dev'],
  Proyectos: ['codecrafters', 'protohackers', 'gophercises'],
  Lectura: ['rust-brown', 'rust-google', 'go-tests', 'rust-examples', 'go-examples'],
  Herramientas: ['context7'],
} as const satisfies Record<string, readonly ResourceId[]>;
const EXERCISES_QUERY: ResourceId[] = [
  'rust-100',
  'rust-rover',
  'rustlings',
  'rust-google',
  'go-tour',
  'go-exercism',
  'gophercises',
];
const BOTH: ResourceId[] = ['codecrafters', 'protohackers', 'context7'];

const titlesOf = (ids: readonly ResourceId[]) => ids.map((id) => TITLE[id]);
const countLabel = (shown: number) => `${shown} de 15 recursos · abrí cada uno a tu ritmo`;

test.describe('(a) opening the library', () => {
  test('shows the fifteen resources in content order and the controls at rest', async ({
    shell,
    library,
    page,
  }) => {
    await shell.goto(urls.view('biblioteca'));

    await expect(shell.heading('biblioteca')).toBeVisible();
    await expect(page.getByText('RECURSOS CON INTENCIÓN')).toBeVisible();
    await expect(
      page.getByText(
        'Todo lo que revisamos, en un lugar. Elegí según lo que necesitás hoy; guardá tus favoritos para volver sin buscar de nuevo.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Accesos y modalidades revisados el 2 de octubre de 2026. Los recursos externos necesitan conexión y pueden cambiar. Los precios no se fijan aquí: revisá las condiciones de cada sitio.',
      ),
    ).toBeVisible();
    await expect(library.cardTitles).toHaveText(titlesOf(ALL));
    await expect(library.results).toHaveText(countLabel(15));
    await expect(library.search).toHaveValue('');
    await expect(library.search).toHaveAttribute(
      'placeholder',
      'Buscar un recurso, tema o formato…',
    );
    await expect(library.languageFilter).toHaveValue('all');
    await expect(library.costFilter).toHaveValue('all');
    await expect(library.category('Todos')).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['Ejercicios', 'Proyectos', 'Lectura', 'Herramientas'] as const) {
      await expect(library.category(name)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(library.favoritesOnly).not.toBeChecked();
  });
});

test.describe('(b) the search', () => {
  test('matches the whole query as a substring, not word by word', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.searchFor('tour of');
    await expect(library.cardTitles).toHaveText([TITLE['go-tour']]);
    await expect(library.results).toHaveText(countLabel(1));

    await library.searchFor('of tour');
    await expect(library.cardTitles).toHaveCount(0);
    await expect(library.emptyHeading).toBeVisible();
    await expect(library.results).toHaveText(countLabel(0));
  });

  test('ignores accents and case', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.searchFor('EJÉRCICIOS');
    await expect(library.cardTitles).toHaveText(titlesOf(EXERCISES_QUERY));
    await library.searchFor('ejercicios');
    await expect(library.cardTitles).toHaveText(titlesOf(EXERCISES_QUERY));
  });

  test('also matches the language ids and never the access', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.searchFor('both');
    await expect(library.cardTitles).toHaveText(titlesOf(BOTH));
    await library.searchFor('gratis');
    await expect(library.cardTitles).toHaveCount(0);
    await library.searchFor('mixto');
    await expect(library.cardTitles).toHaveCount(0);
  });

  test('a query of only spaces does not filter and the field keeps it', async ({
    shell,
    library,
  }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.searchFor('   ');
    await expect(library.search).toHaveValue('   ');
    await expect(library.cardTitles).toHaveText(titlesOf(ALL));
  });
});

test.describe('(c) language, access and type', () => {
  test('each filter alone', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.chooseLanguage('Rust');
    await expect(library.cardTitles).toHaveText(titlesOf(RUST));
    await library.chooseLanguage('Go');
    await expect(library.cardTitles).toHaveText(titlesOf(GO));
    await library.chooseLanguage('Todos los lenguajes');

    await library.chooseCost('Acceso gratuito');
    await expect(library.cardTitles).toHaveText(titlesOf(FREE));
    await library.chooseCost('Gratis + pago');
    await expect(library.cardTitles).toHaveText(titlesOf(MIXED));
    await library.chooseCost('Cualquier acceso');

    for (const [name, ids] of Object.entries(BY_CATEGORY) as [
      keyof typeof BY_CATEGORY,
      readonly ResourceId[],
    ][]) {
      await library.chooseCategory(name);
      await expect(library.category(name)).toHaveAttribute('aria-pressed', 'true');
      await expect(library.category('Todos')).toHaveAttribute('aria-pressed', 'false');
      await expect(library.cardTitles).toHaveText(titlesOf(ids));
    }
  });

  test('the filters combine with and', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.chooseLanguage('Go');
    await library.chooseCost('Gratis + pago');
    await expect(library.cardTitles).toHaveText(titlesOf(['codecrafters', 'boot-dev', 'context7']));

    await library.chooseCost('Acceso gratuito');
    await library.searchFor('tour of');
    await expect(library.cardTitles).toHaveText([TITLE['go-tour']]);
  });

  test('the language of the menu does not filter the library', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await shell.switchLanguage('go');

    await expect(library.languageFilter).toHaveValue('all');
    await expect(library.cardTitles).toHaveText(titlesOf(ALL));
  });
});

test('(d) Limpiar filtros resets the five criteria and leaves the focus on the search', async ({
  shell,
  library,
  page,
}) => {
  await shell.goto(urls.view('biblioteca'));
  await library.chooseLanguage('Go');
  await library.chooseCost('Gratis + pago');
  await library.chooseCategory('Lectura');
  await library.favoritesOnly.check();
  await library.searchFor('zzz');
  await expect(library.emptyHeading).toBeVisible();
  await expect(
    page.getByText('Probá otro término o volvé a ver la biblioteca completa.'),
  ).toBeVisible();

  await library.clearFilters.click();

  await expect(library.cardTitles).toHaveText(titlesOf(ALL));
  await expect(library.search).toHaveValue('');
  await expect(library.languageFilter).toHaveValue('all');
  await expect(library.costFilter).toHaveValue('all');
  await expect(library.category('Todos')).toHaveAttribute('aria-pressed', 'true');
  await expect(library.favoritesOnly).not.toBeChecked();
  await expect(library.search).toBeFocused();
});

test.describe('(e) a favorite', () => {
  test('one click saves once, changes the star and keeps the focus, and a reload keeps it', async ({
    shell,
    library,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('biblioteca'));
    const star = library.favoriteButton(TITLE['go-tour']);
    await expect(star).toHaveAccessibleName('Guardar en favoritos: A Tour of Go');
    await expect(star).toHaveAttribute('aria-pressed', 'false');
    await expect(star).toHaveText('☆');

    await star.click();

    await expect(star).toHaveAccessibleName('Quitar de favoritos: A Tour of Go');
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    await expect(star).toHaveText('★');
    await expect(star).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    await page.reload();
    await expect(library.favoriteButton(TITLE['go-tour'])).toHaveAttribute('aria-pressed', 'true');
  });

  test('the id goes to the end of the saved favorites and a second click removes it', async ({
    shell,
    library,
    storage,
  }) => {
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
    await shell.goto(urls.view('biblioteca'));

    await library.toggleFavorite(TITLE['go-tour']);
    let saved = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}') as {
      favorites: string[];
    };
    expect(saved.favorites).toEqual(['rust-100', 'go-tour']);

    await library.toggleFavorite(TITLE['go-tour']);
    saved = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}') as {
      favorites: string[];
    };
    expect(saved.favorites).toEqual(['rust-100']);
  });
});

test.describe('(f) Solo mis favoritos', () => {
  test('shows the favorite of the frozen progress', async ({ shell, library, storage }) => {
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
    await shell.goto(urls.view('biblioteca'));

    await library.favoritesOnly.check();

    await expect(library.cardTitles).toHaveText([TITLE['rust-100']]);
    await expect(library.results).toHaveText(countLabel(1));
  });

  test('without favorites shows the empty state', async ({ shell, library }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.favoritesOnly.check();

    await expect(library.cardTitles).toHaveCount(0);
    await expect(library.emptyHeading).toBeVisible();
  });

  test('a favorite that a filter hides stays saved and comes back', async ({
    shell,
    library,
    storage,
  }) => {
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
    await shell.goto(urls.view('biblioteca'));

    await library.chooseLanguage('Go');
    await expect(library.card(TITLE['rust-100'])).toHaveCount(0);
    await library.chooseLanguage('Todos los lenguajes');

    await expect(library.favoriteButton(TITLE['rust-100'])).toHaveAttribute('aria-pressed', 'true');
  });
});

test('(g) a favorite removed in the library stays removed after another part saves and a reload', async ({
  shell,
  library,
  storage,
  page,
}) => {
  await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
  await shell.goto(urls.view('biblioteca'));
  await library.toggleFavorite(TITLE['rust-100']);
  await expect(library.favoriteButton(TITLE['rust-100'])).toHaveAttribute('aria-pressed', 'false');

  await shell.openFromMenu('recorrido');
  await page
    .getByRole('checkbox', { name: /^Marcar como completado/ })
    .first()
    .click();
  await page.reload();
  await shell.openFromMenu('biblioteca');

  await expect(library.favoriteButton(TITLE['rust-100'])).toHaveAttribute('aria-pressed', 'false');
});

test('(h) with a storage that reads and does not write, the star changes in memory and the footer warns', async ({
  shell,
  library,
  storage,
}) => {
  await storage.blockWrites();
  await shell.goto(urls.view('biblioteca'));
  await expect(shell.saveStatus('Guardado en este navegador')).toBeVisible();

  await library.toggleFavorite(TITLE['go-tour']);

  await expect(library.favoriteButton(TITLE['go-tour'])).toHaveAttribute('aria-pressed', 'true');
  await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
});

test.describe('(i) where the filters live', () => {
  test('the menu keeps the filters and a reload drops them', async ({ shell, library, page }) => {
    await shell.goto(urls.view('biblioteca'));
    await library.chooseLanguage('Go');
    await library.chooseCategory('Lectura');
    await expect(library.cardTitles).toHaveText(titlesOf(['go-tests', 'go-examples']));

    await shell.openFromMenu('recorrido');
    await shell.openFromMenu('biblioteca');
    await expect(library.languageFilter).toHaveValue('go');
    await expect(library.category('Lectura')).toHaveAttribute('aria-pressed', 'true');
    await expect(library.cardTitles).toHaveText(titlesOf(['go-tests', 'go-examples']));

    await page.reload();
    await expect(library.languageFilter).toHaveValue('all');
    await expect(library.cardTitles).toHaveText(titlesOf(ALL));
  });

  test('«Borrar todo» keeps the filters and the library shows the blank progress', async ({
    shell,
    library,
    storage,
    page,
  }) => {
    await storage.seed({ 'taller-learning-v1': frozenProgress['taller-learning-v1'] });
    await shell.goto(urls.view('biblioteca'));
    await library.chooseLanguage('Rust');

    await shell.openFromMenu('metodo');
    await page.getByRole('button', { name: 'Borrar mi progreso' }).click();
    await page.getByRole('button', { name: 'Borrar todo' }).click();
    await shell.openFromMenu('biblioteca');

    await expect(library.languageFilter).toHaveValue('rust');
    await expect(library.favoriteButton(TITLE['rust-100'])).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

test.describe('(j) the keyboard', () => {
  test('Tab goes through the controls in order and reaches the first star', async ({
    shell,
    library,
    page,
  }) => {
    await shell.goto(urls.view('biblioteca'));
    await library.search.focus();

    const order = [
      library.languageFilter,
      library.costFilter,
      library.category('Todos'),
      library.category('Ejercicios'),
      library.category('Proyectos'),
      library.category('Lectura'),
      library.category('Herramientas'),
      library.favoritesOnly,
      library.favoriteButton(TITLE['rust-100']),
    ];
    for (const control of order) {
      await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
    }
  });

  test('Enter and Space activate the chips, the checkbox and the stars, and the focus stays', async ({
    shell,
    library,
    page,
  }) => {
    await shell.goto(urls.view('biblioteca'));

    await library.category('Lectura').focus();
    await page.keyboard.press('Enter');
    await expect(library.category('Lectura')).toHaveAttribute('aria-pressed', 'true');
    await expect(library.category('Lectura')).toBeFocused();

    await library.category('Todos').focus();
    await page.keyboard.press('Space');
    await expect(library.category('Todos')).toHaveAttribute('aria-pressed', 'true');

    const star = library.favoriteButton(TITLE['go-tour']);
    await star.focus();
    await page.keyboard.press('Enter');
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    await expect(star).toBeFocused();

    await library.favoritesOnly.focus();
    await page.keyboard.press('Space');
    await expect(library.favoritesOnly).toBeChecked();
    await expect(library.cardTitles).toHaveText([TITLE['go-tour']]);
  });
});

test('(k) a card shows its content and its link opens the resource in a new tab', async ({
  shell,
  library,
}) => {
  await shell.goto(urls.view('biblioteca'));
  const card = library.card(TITLE['go-tour']);

  await expect(card.getByText('Go', { exact: true })).toBeVisible();
  await expect(card.getByText('Gratis', { exact: true })).toBeVisible();
  await expect(card.getByText('Elegido para vos', { exact: true })).toBeVisible();
  await expect(card.getByText('Lecciones ejecutables en el navegador · Inglés')).toBeVisible();
  await expect(card.getByText('Para vos:')).toBeVisible();
  await expect(library.detailSummary(TITLE['go-tour'])).toBeVisible();
  await expect(
    library.card(TITLE['context7']).getByText('Go + Rust', { exact: true }),
  ).toBeVisible();
  await expect(
    library.card(TITLE['context7']).getByText('Gratis + pago', { exact: true }),
  ).toBeVisible();
  await expect(library.link(TITLE['go-tour'])).toHaveAttribute('href', 'https://go.dev/tour/');
  await expect(library.link(TITLE['go-tour'])).toHaveAttribute('target', '_blank');
  await expect(library.link(TITLE['go-tour'])).toHaveAttribute('rel', 'noopener noreferrer');
});

test('(l) switching the language on the library keeps the filters', async ({ shell, library }) => {
  await shell.goto(urls.view('biblioteca'));
  await library.searchFor('tour of');
  await library.chooseLanguage('Go');

  await shell.switchLanguage('go');

  await expect(library.search).toHaveValue('tour of');
  await expect(library.languageFilter).toHaveValue('go');
  await expect(library.cardTitles).toHaveText([TITLE['go-tour']]);
});
