import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { urls } from '../lib/urls';

// Between the review dates of the frozen progress: seven are due, rust-02 is not (reviewAt 2026-10-07).
const BETWEEN_REVIEWS = new Date('2026-10-06T12:00:00Z');
// The frozen route progress is in Go: the map tests seed only the lab, so the lab opens in Rust.
const FROZEN_LAB = { 'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'] };

test.describe('the lab map', () => {
  test('with the real progress of master shows the counts of the fixture', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await page.clock.setFixedTime(BETWEEN_REVIEWS);
    await storage.seed(FROZEN_LAB);

    await shell.goto(urls.view('laboratorio'));

    await expect(lab.mapEyebrow()).toHaveText('LABORATORIO · RUST');
    await expect(lab.mapStamp()).toContainText('137');
    await expect(lab.mapMetrics()).toContainText('8/137 resueltos');
    await expect(lab.mapMetrics()).toContainText('49 temas');
    await expect(lab.mapMetrics()).toContainText('205 puntos de práctica');
    await expect(lab.mapMetrics()).toContainText('7 para repasar');
    await expect(lab.exerciseNode('Resuelto. Repará el contador inmutable')).toHaveText('✓');
    await expect(lab.exerciseNode('Resuelto. Salir de loop con una respuesta')).toHaveText('✓');
    await expect(lab.exerciseNode('La energía del reactor')).toHaveText('01');
    await expect(lab.todayChallenge()).toContainText('La energía del reactor');
    await expect(lab.startButton()).toHaveText('Seguir aprendiendo ↗');
    await expect(lab.dueButton()).toHaveText('Repasar pendientes · 7');
  });

  test('a level filters the grid and keeps the focus on its button', async ({ shell, lab }) => {
    await shell.goto(urls.view('laboratorio'));

    await lab.levelButton('Inicial').click();

    await expect(lab.levelButton('Inicial')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.levelButton('Todos los niveles')).toHaveAttribute('aria-pressed', 'false');
    await expect(lab.filterStatus()).toHaveText('29 desafíos visibles.');
    await expect(lab.exerciseNodes()).toHaveCount(29);
    await expect(lab.levelButton('Inicial')).toBeFocused();
  });

  test('«Clásicos y sistemas» filters the grid and keeps the focus on its button', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.view('laboratorio'));

    await lab.extrasButton().click();

    await expect(lab.extrasButton()).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.filterStatus()).toHaveText(
      '25 desafíos visibles · ampliación Clásicos y sistemas.',
    );
    await expect(lab.extrasButton()).toBeFocused();
  });

  test('a search without results and «Ver todos los desafíos» clear the four filters', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.levelButton('Avanzado').click();
    await lab.extrasButton().click();

    await lab.searchBox().fill('zzz');

    await expect(lab.filterStatus()).toHaveText(
      '0 desafíos visibles para tu búsqueda · ampliación Clásicos y sistemas.',
    );
    await expect(lab.emptyMapHeading()).toHaveText('No encontré ese desafío.');

    await lab.showAllButton().click();

    await expect(lab.searchBox()).toHaveValue('');
    await expect(lab.filterStatus()).toHaveText('137 desafíos visibles.');
    await expect(lab.levelButton('Todos los niveles')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.extrasButton()).toHaveAttribute('aria-pressed', 'false');
    await expect(lab.dueButton()).toHaveAttribute('aria-pressed', 'false');
  });

  test('«Repasar pendientes» shows only what is due', async ({ shell, lab, storage, page }) => {
    await page.clock.setFixedTime(BETWEEN_REVIEWS);
    await storage.seed(FROZEN_LAB);
    await shell.goto(urls.view('laboratorio'));

    await lab.dueButton().click();

    await expect(lab.dueButton()).toHaveText('Ver todos · 7');
    await expect(lab.dueButton()).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.filterStatus()).toHaveText('7 desafíos visibles.');
    await expect(lab.exerciseNodes()).toHaveCount(7);
    await expect(lab.exerciseNode('Resuelto. Repará el contador inmutable')).toHaveCount(0);
  });

  test('opening an exercise from a node saves once, rewrites the URL and focuses the title', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('laboratorio'));

    await lab.exerciseNode('Repará el contador inmutable').click();

    await expect(lab.exerciseTitle()).toHaveText('Repará el contador inmutable');
    await expect(lab.exerciseTitle()).toBeFocused();
    await expect(page).toHaveURL(/\?ejercicio=rust-02&paso=learn#laboratorio$/);
    expect(await storage.writes()).toEqual(['set taller-laboratorio-v1']);
  });

  test('«Sorprendeme» opens a challenge from the filtered pool', async ({ shell, lab, page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0.999;
    });
    await shell.goto(urls.view('laboratorio'));

    await lab.surpriseButton().click();

    await expect(page).toHaveURL(/\?ejercicio=rust-137&paso=learn#laboratorio$/);
    await expect(lab.exerciseTitle()).toHaveText('Núcleo · Una instrucción llega hasta la RAM');
    await expect(shell.toast).toHaveText('Un desafío elegido para tu próxima idea.');
  });

  test('«Sorprendeme» without candidates opens nothing and says so', async ({
    shell,
    lab,
    page,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.searchBox().fill('zzz');

    await lab.surpriseButton().click();

    await expect(shell.toast).toHaveText(
      'No hay desafíos con estos filtros. Probá ampliar la búsqueda.',
    );
    await expect(shell.heading('laboratorio')).toBeVisible();
    await expect(page).not.toHaveURL(/ejercicio=/);
  });

  test('KNOWN DEFECT (spec 021, quirk 7): «Sorprendeme» can pick the exercise that was already open', async ({
    shell,
    lab,
    page,
  }) => {
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await shell.goto(urls.exercise('rust-01', 'learn'));
    await lab.backButton().click();

    await lab.surpriseButton().click();

    await expect(page).toHaveURL(/\?ejercicio=rust-01&paso=learn#laboratorio$/);
    await expect(shell.toast).toHaveText('Un desafío elegido para tu próxima idea.');
  });

  test('KNOWN DEFECT (spec 021, quirk 1): switching the language clears the search but keeps the level and «Clásicos y sistemas»', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.levelButton('Avanzado').click();
    await lab.extrasButton().click();
    await lab.searchBox().fill('memoria');

    await shell.switchLanguage('go');

    await expect(lab.mapEyebrow()).toHaveText('LABORATORIO · GO');
    await expect(lab.searchBox()).toHaveValue('');
    await expect(lab.levelButton('Avanzado')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.extrasButton()).toHaveAttribute('aria-pressed', 'true');
  });
});
