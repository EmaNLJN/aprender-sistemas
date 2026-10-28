import { expect, test } from '../fixtures';
import { computedStyle } from '../lib/computed-style';
import { curriculumIds, frozenProgress } from '../lib/curriculum';
import { systemsProgress } from '../lib/systems-progress';
import { urls } from '../lib/urls';

const CACHE = 'Una caché que aprende tus visitas';
const PC = 'Construí una PC de bolsillo';
const WORKSHOP_IDS = Object.keys(curriculumIds.workshops);

test.describe('the catalog', () => {
  test('the frozen progress shows one workshop with its three seals in Rust and none in Go', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await shell.goto(urls.workshop('rust'));

    await expect(systems.overviewCount()).toHaveText('1 / 25');
    await expect(systems.overviewProgress()).toHaveAttribute('value', '1');
    await expect(systems.cardSeals(PC)).toHaveText('✓ Tres sellos conseguidos');
    await expect(systems.workshopCards().filter({ hasText: '0/3 sellos' })).toHaveCount(24);

    await shell.switchLanguage('go');
    await expect(systems.overviewCount()).toHaveText('0 / 25');
  });

  test('the four families filter the cards and keep the focus on the chosen button', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust'));
    const families: [string, number][] = [
      ['Dentro de la máquina', 9],
      ['Datos e infraestructura', 8],
      ['Gráficos, álgebra y juegos', 8],
      ['Todo el taller', 25],
    ];
    for (const [family, count] of families) {
      await systems.familyFilter(family).click();

      await expect(systems.familyFilter(family)).toHaveAttribute('aria-pressed', 'true');
      await expect(systems.familyFilter(family)).toBeFocused();
      await expect(systems.workshopCards()).toHaveCount(count);
      await expect(systems.resultCount()).toHaveText(`${count} talleres para explorar`);
    }
  });

  test('the search ignores accents and case and reads the title, the subtitle and the id', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust'));

    await systems.search().fill('LRU');
    await expect(systems.workshopCards()).toHaveCount(1);
    await expect(systems.workshopCard(CACHE)).toBeVisible();
    await expect(systems.resultCount()).toHaveText('1 talleres para explorar');
    await expect(systems.search()).toBeFocused();

    await systems.search().fill('CACHÉ');
    await expect(systems.workshopCards()).toHaveCount(2);

    await systems.search().fill('raycast');
    await expect(systems.workshopCards()).toHaveCount(1);
  });

  test('the empty state clears the family and the search and focuses the search box', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust'));
    await systems.familyFilter('Datos e infraestructura').click();
    await systems.search().fill('zzzz');
    await expect(systems.emptyCatalog()).toBeVisible();
    await expect(systems.resultCount()).toHaveText('0 talleres para explorar');

    await systems.clearFilters().click();

    await expect(systems.search()).toHaveValue('');
    await expect(systems.search()).toBeFocused();
    await expect(systems.familyFilter('Todo el taller')).toHaveAttribute('aria-pressed', 'true');
    await expect(systems.workshopCards()).toHaveCount(25);
  });

  test('the family and the search survive a hash navigation and are lost on a reload', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust'));
    await systems.familyFilter('Dentro de la máquina').click();
    await systems.search().fill('memoria');

    await shell.openFromMenu('proyecto');
    await shell.openFromMenu('sistemas');
    await expect(systems.familyFilter('Dentro de la máquina')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(systems.search()).toHaveValue('memoria');

    await shell.openFromMenu('laboratorio');
    await shell.openFromMenu('sistemas');
    await expect(systems.familyFilter('Todo el taller')).toHaveAttribute('aria-pressed', 'true');
    await expect(systems.search()).toHaveValue('');
  });
});

test.describe('open and go back', () => {
  test('«Explorar →» opens the workshop, focuses its title, scrolls #main to the top and replaces the query', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto(urls.workshop('rust'));
    const entries = await page.evaluate(() => history.length);

    await systems.openWorkshop(CACHE);

    await expect(systems.workshopHeading(CACHE)).toBeFocused();
    await expect(page).toHaveURL(urls.workshop('rust', 'cache', 'explore'));
    expect(await page.evaluate(() => history.length)).toBe(entries);
    await expect.poll(() => systems.mainTop()).toBe(0);
  });

  test('«← Todos los talleres» goes back to the catalog URL', async ({ shell, systems, page }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));

    await systems.backToCatalog().click();

    await expect(shell.heading('sistemas')).toBeVisible();
    await expect(page).toHaveURL(urls.workshop('rust'));
  });

  test('the language switch keeps the workshop and the part open, with the seals of the other language', async ({
    shell,
    systems,
    storage,
    page,
  }) => {
    await storage.seed({ 'taller-systems-v1': frozenProgress['taller-systems-v1'] });
    await shell.goto(urls.workshop('rust', 'pc', 'build'));
    await expect(systems.seal('Código verificado')).toHaveClass(/earned/);

    await shell.switchLanguage('go');

    await expect(page).toHaveURL(urls.workshop('go', 'pc', 'build'));
    await expect(systems.workshopHeading(PC)).toBeVisible();
    await expect(systems.part('build')).toHaveAttribute('aria-pressed', 'true');
    await expect(systems.seal('Código verificado')).not.toHaveClass(/earned/);
  });

  test('opening a workshop and changing the part keep #sistemas in the address', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto(urls.workshop('rust'));

    await systems.openWorkshop(CACHE);
    await expect(page).toHaveURL(/#sistemas$/);

    await systems.part('ship').click();
    await expect(page).toHaveURL(urls.workshop('rust', 'cache', 'ship'));
  });
});

test.describe('the three parts', () => {
  test('each part presses its button, keeps the focus on it, writes the query and scrolls the tabs 25px below the top', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    for (const part of ['build', 'ship', 'explore'] as const) {
      await systems.part(part).click();

      await expect(systems.part(part)).toHaveAttribute('aria-pressed', 'true');
      await expect(systems.part(part)).toBeFocused();
      await expect(page).toHaveURL(urls.workshop('rust', 'cache', part));
      await expect.poll(() => systems.partTabsTop()).toBe(25);
    }
  });

  test('the footer buttons move to the next part and focus its tab', async ({ shell, systems }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));

    await systems.nextPart('Programar el núcleo →').click();
    await expect(systems.part('build')).toBeFocused();

    await systems.nextPart('Armar mi proyecto →').click();
    await expect(systems.part('ship')).toBeFocused();
  });

  test('an unknown part opens Explorar and a part without a workshop opens the catalog', async ({
    shell,
    systems,
  }) => {
    await shell.goto('/?lenguaje=rust&taller=cache&parte=inventada#sistemas');
    await expect(systems.part('explore')).toHaveAttribute('aria-pressed', 'true');

    await shell.goto('/?lenguaje=rust&parte=build#sistemas');
    await expect(shell.heading('sistemas')).toBeVisible();
  });
});

test.describe('Explorar', () => {
  test('a model action traces, marks the objective, announces it, saves once and keeps the focus and the scroll; repeating a situation adds nothing', async ({
    shell,
    systems,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await expect(systems.modelLive()).toHaveText(/^Probá A → B → C → A → D\./);

    await systems.modelButton('Leer A').scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => scrollY);
    await systems.modelButton('Leer A').click();
    await expect(systems.traceEntries()).toHaveCount(1);
    expect(await page.evaluate(() => scrollY)).toBe(scrolled);
    await expect(systems.objective('Provocá una carga por miss')).toHaveClass(/earned/);
    await expect(shell.toast).toHaveText('Nueva situación comprendida: Provocá una carga por miss');
    await expect(systems.modelButton('Leer A')).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-systems-v1']);

    await systems.modelButton('Leer A').click();
    await expect(systems.objective('Reutilizá una clave con hit')).toHaveClass(/earned/);
    await systems.modelButton('Leer A').click();
    await expect(systems.traceEntries()).toHaveCount(3);
    expect(await storage.writes()).toEqual(['set taller-systems-v1', 'set taller-systems-v1']);
    await expect(systems.modelLive()).toHaveText(/^Probá A → B → C → A → D\./);
  });

  test('the third objective earns the first seal', async ({ shell, systems, storage }) => {
    await storage.seed({
      'taller-systems-v1': systemsProgress({ 'rust:cache': { observed: ['hit', 'evict'] } }),
    });
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await expect(systems.seal('Modelo explorado')).not.toHaveClass(/earned/);

    await systems.modelButton('Leer A').click();

    await expect(systems.seal('Modelo explorado')).toHaveClass(/earned/);
  });

  test('«Reiniciar modelo ↺» empties the trace and keeps the objectives and the seals', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await expect(systems.traceEntries()).toHaveCount(1);

    await systems.resetModel().click();

    await expect(systems.traceEntries()).toHaveCount(0);
    await expect(systems.objective('Provocá una carga por miss')).toHaveClass(/earned/);
  });
});

test.describe('the checkpoint', () => {
  test('a wrong answer explains, a right one earns the seal, the focus stays and the answer survives a reload', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'heap', 'explore'));

    await systems.checkpointOption('Sí: hay 12 libres').click();
    await expect(systems.checkpointFeedback()).toHaveText(
      'Revisemos esa decisión. La suma no vuelve contiguos los intervalos.',
    );
    await expect(shell.toast).toHaveText('Revisá el porqué y probá otra explicación.');
    await expect(systems.checkpointOption('Sí: hay 12 libres')).toBeFocused();

    await systems.checkpointOption('No: ningún hueco tiene 8').click();
    await expect(systems.checkpointFeedback()).toHaveText(
      'Esa es la idea. La suma no vuelve contiguos los intervalos.',
    );
    await expect(shell.toast).toHaveText(
      'Checkpoint razonado. Contrastá la explicación con tu experimento.',
    );
    await expect(systems.seal('Checkpoint razonado')).toHaveClass(/earned/);
    await expect(systems.checkpointOption('No: ningún hueco tiene 8')).toBeFocused();

    await shell.openFromMenu('laboratorio');
    await shell.goto(urls.workshop('rust', 'heap', 'explore'));
    await expect(systems.checkpointOption('No: ningún hueco tiene 8')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('the third seal', () => {
  const twoSeals = systemsProgress({
    'rust:cache': { observed: ['hit', 'evict'], code: true, predicted: true, answer: 1 },
  });

  test('announces it and draws the celebration, which leaving the view removes', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.seed({ 'taller-systems-v1': twoSeals });
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));

    await systems.modelButton('Leer A').click();

    await expect(shell.toast).toHaveText(
      'Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.',
    );
    await expect(systems.celebration()).toHaveCount(1);
    await shell.openFromMenu('proyecto');
    await expect(systems.celebration()).toHaveCount(0);
  });

  test('with reduced motion it does not draw the celebration', async ({
    shell,
    systems,
    storage,
    page,
  }) => {
    await storage.seed({ 'taller-systems-v1': twoSeals });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));

    await systems.modelButton('Leer A').click();

    await expect(shell.toast).toHaveText(
      'Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.',
    );
    await expect(systems.celebration()).toHaveCount(0);
  });

  test('switching the language removes the celebration', async ({ shell, systems, storage }) => {
    await storage.seed({ 'taller-systems-v1': twoSeals });
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await expect(systems.celebration()).toHaveCount(1);

    await shell.switchLanguage('go');

    await expect(systems.celebration()).toHaveCount(0);
  });
});

test.describe('Construir', () => {
  test('shows the core of the language, its IDE link and the previous tools', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'build'));

    await expect(systems.coreTitle(curriculumIds.exercises['rust-113'].title)).toBeVisible();
    await expect(systems.realTests()).toHaveText('3 pruebas reales');
    await expect(systems.enterIde()).toHaveAttribute(
      'href',
      '?sistema=cache&ejercicio=rust-113&paso=code#laboratorio',
    );
    await expect(systems.relatedLink('rust-31')).toHaveAttribute(
      'href',
      '?sistema=cache&ejercicio=rust-31&paso=code#laboratorio',
    );
    await expect(systems.relatedLink('rust-35')).toHaveAttribute(
      'href',
      '?sistema=cache&ejercicio=rust-35&paso=code#laboratorio',
    );
    await expect(systems.codePassed()).toHaveCount(0);
  });

  test('the verified-code notice appears only with the code seal', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.seed({ 'taller-systems-v1': frozenProgress['taller-systems-v1'] });
    await shell.goto(urls.workshop('rust', 'pc', 'build'));

    await expect(systems.codePassed()).toBeVisible();
  });
});

test.describe('Entregar', () => {
  test('the kit downloads as a zip named after the kit and is announced', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));
    const download = page.waitForEvent('download');

    await systems.downloadKit('Rust').click();

    expect((await download).suggestedFilename()).toBe('taller-cache-rust.zip');
    await expect(shell.toast).toHaveText('Kit descargado con tu borrador y sus pruebas.');
  });

  test('the stages save their index and come back after a reload', async ({
    shell,
    systems,
    storage,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));

    await systems.stepCheckbox(0).check();
    await systems.stepCheckbox(2).check();

    const saved = JSON.parse((await storage.snapshot())['taller-systems-v1'] ?? '{}');
    expect(saved.records['rust:cache'].steps).toEqual([0, 2]);
    await shell.openFromMenu('laboratorio');
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));
    await expect(systems.stepCheckbox(0)).toBeChecked();
    await expect(systems.stepCheckbox(1)).not.toBeChecked();
    await expect(systems.stepCheckbox(2)).toBeChecked();
  });

  test('the note saves on every key without moving the caret', async ({
    shell,
    systems,
    storage,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));
    await systems.note().fill('abcdef');
    await systems
      .note()
      .evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(3, 3));

    await systems.note().pressSequentially('XY');

    await expect(systems.note()).toHaveValue('abcXYdef');
    expect(
      await systems.note().evaluate((element: HTMLTextAreaElement) => element.selectionStart),
    ).toBe(5);
    await expect(systems.noteStatus()).toHaveText(
      'Nota guardada. Dejá un test concreto para volver.',
    );
    const saved = JSON.parse((await storage.snapshot())['taller-systems-v1'] ?? '{}');
    expect(saved.records['rust:cache'].note).toBe('abcXYdef');
  });

  test('with the storage blocked, the workshop and the note show their warnings', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.block();
    await shell.goto(urls.workshop('rust', 'cache', 'ship'));

    await expect(systems.storageWarning()).toBeVisible();
    await systems.note().fill('x');
    await expect(systems.noteStatus()).toHaveText(
      'No se pudo guardar: exportá tu avance antes de cerrar.',
    );
  });
});

test('a workshop with a scene draws a labelled svg image with the #14271f background', async ({
  shell,
  systems,
}) => {
  await shell.goto(urls.workshop('rust', 'raster', 'explore'));

  await expect(systems.scene()).toHaveAttribute('aria-label', /.+/);
  expect(await computedStyle(systems.scene(), ['background-color'])).toEqual({
    'background-color': 'rgb(20, 39, 31)',
  });
});

test.describe('the 25 workshops', () => {
  for (const id of WORKSHOP_IDS) {
    test(`${id} opens at Explorar with its heading and its model`, async ({ shell, systems }) => {
      await shell.goto(urls.workshop('rust', id, 'explore'));

      await expect(systems.anyWorkshopHeading()).toBeVisible();
      await expect(systems.part('explore')).toHaveAttribute('aria-pressed', 'true');
      await expect(systems.modelControls().first()).toBeVisible();
    });
  }

  for (const id of ['cache', 'pc', 'raster']) {
    test(`${id} walks Construir and Entregar`, async ({ shell, systems }) => {
      await shell.goto(urls.workshop('go', id, 'explore'));

      await systems.part('build').click();
      await expect(systems.enterIde()).toBeVisible();
      await systems.part('ship').click();
      await expect(systems.downloadKit('Go')).toBeVisible();
    });
  }
});

test('«Borrar todo» resets the simulations and the seals and keeps the family and the search', async ({
  shell,
  systems,
  method,
}) => {
  await shell.goto(urls.workshop('rust'));
  await systems.familyFilter('Dentro de la máquina').click();
  await systems.search().fill('caché');
  await systems.openWorkshop(CACHE);
  await systems.modelButton('Leer A').click();
  await expect(systems.traceEntries()).toHaveCount(1);

  await shell.openFromMenu('metodo');
  await method.resetProgress().click();
  await method.confirmReset().click();
  await expect(shell.toast).toHaveText('Progreso reiniciado. Un nuevo comienzo.');

  await shell.openFromMenu('sistemas');
  await expect(systems.traceEntries()).toHaveCount(0);
  await expect(systems.objective('Provocá una carga por miss')).not.toHaveClass(/earned/);
  await systems.backToCatalog().click();
  await expect(systems.familyFilter('Dentro de la máquina')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(systems.search()).toHaveValue('caché');
});
