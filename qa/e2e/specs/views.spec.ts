import { expect, test } from '../fixtures';
import { documentWasReloaded, markDocument } from '../lib/document-marker';
import { urls, type View } from '../lib/urls';

const VIEWS: View[] = [
  'recorrido',
  'biblioteca',
  'proyecto',
  'metodo',
  'atlas',
  'campana',
  'sistemas',
  'laboratorio',
];
// The menu entries whose link is a hash. "Laboratorio" links to `?#laboratorio`, which changes the
// query: it is covered with the other links that do (reload.spec.ts, L1).
const HASH_LINKS: View[] = [
  'recorrido',
  'campana',
  'sistemas',
  'atlas',
  'biblioteca',
  'proyecto',
  'metodo',
];

test.describe('the eight views by hash', () => {
  for (const view of VIEWS) {
    test(`#${view} opens from an empty browser`, async ({ shell }) => {
      await shell.goto(urls.view(view));

      await expect(shell.heading(view)).toBeVisible();
      await expect(shell.menuLink(view)).toHaveAttribute('aria-current', 'page');
      for (const other of VIEWS.filter((candidate) => candidate !== view))
        await expect(shell.menuLink(other)).not.toHaveAttribute('aria-current', 'page');
    });
  }

  test('the menu moves through the seven hash links without replacing the document', async ({
    shell,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await markDocument(page);

    for (const view of HASH_LINKS.slice(1)) {
      await shell.openFromMenu(view);
      await expect(shell.heading(view)).toBeVisible();
      await expect(shell.menuLink(view)).toHaveAttribute('aria-current', 'page');
      await expect(page).toHaveURL(urls.view(view));
    }

    expect(await documentWasReloaded(page)).toBe(false);
  });
});

test.describe('history', () => {
  test('each hash navigation adds one entry and Back returns to the previous view', async ({
    shell,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));
    const entries = await page.evaluate(() => history.length);

    await shell.openFromMenu('biblioteca');
    await shell.openFromMenu('proyecto');
    expect(await page.evaluate(() => history.length)).toBe(entries + 2);

    await page.goBack();
    await expect(shell.heading('biblioteca')).toBeVisible();
    await expect(shell.menuLink('biblioteca')).toHaveAttribute('aria-current', 'page');
    await page.goBack();
    await expect(shell.heading('recorrido')).toBeVisible();
  });

  test('opening an exercise rewrites the query and adds no entry', async ({ shell, lab, page }) => {
    await shell.goto(urls.view('laboratorio'));
    const entries = await page.evaluate(() => history.length);

    await lab.startButton().click();

    await expect(page).toHaveURL(/\?ejercicio=rust-01&paso=learn#laboratorio$/);
    expect(await page.evaluate(() => history.length)).toBe(entries);
  });
});

test.describe('the language switch', () => {
  test('KNOWN DEFECT (new, found by F1): <body> carries aria-pressed because [data-language] matches it', async ({
    shell,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await expect(shell.body).toHaveAttribute('aria-pressed', 'true');
  });
});
