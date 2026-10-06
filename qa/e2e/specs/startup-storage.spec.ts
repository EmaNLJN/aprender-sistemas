import { expect, test } from '../fixtures';
import { frozenProgress, type StorageKey } from '../lib/curriculum';
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
const STORAGE_KEYS = Object.keys(frozenProgress) as StorageKey[];

test.describe('the start with the real progress of master', () => {
  test('writes nothing, makes no backup and shows no notice in the eight views', async ({
    shell,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    for (const view of VIEWS) {
      await shell.goto(urls.view(view));
      await expect(shell.heading(view)).toBeVisible();
    }

    expect(await storage.writes()).toEqual([]);
    const stored = await storage.snapshot();
    for (const key of STORAGE_KEYS) expect(stored[key]).toBe(frozenProgress[key]);
    expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
    await expect(shell.toast).toHaveText('');
    await expect(shell.saveStatus('Guardado en este navegador')).toBeVisible();
  });
});

test.describe('the start with the storage blocked', () => {
  test('starts and shows the notice and the footer of today', async ({ shell, storage }) => {
    await storage.block();

    await shell.goto(urls.view('recorrido'));

    await expect(shell.heading('recorrido')).toBeVisible();
    await expect(shell.toast).toHaveText(
      'No se pudo leer o guardar el avance. Podés exportarlo al terminar.',
    );
    await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
    for (const view of VIEWS) {
      await shell.goto(urls.view(view));
      await expect(shell.heading(view)).toBeVisible();
    }
  });
});

test.describe('an action in each store survives a reload', () => {
  test('route, lab and Systems, from an empty browser', async ({ shell, lab, systems, page }) => {
    await shell.goto(urls.view('recorrido'));
    const step = page.getByRole('checkbox', { name: /^Marcar como completado/ }).first();
    await step.check();

    await shell.goto(urls.exercise('rust-04', 'code'));
    await lab.writeDraft('rust', '// borrador de la prueba');

    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await systems.part('ship').click();
    await systems.note().fill('mi nota de la prueba');

    await page.reload();
    await expect(systems.note()).toHaveValue('mi nota de la prueba');
    await shell.goto(urls.exercise('rust-04', 'code'));
    await expect(lab.editor('rust')).toContainText('// borrador de la prueba');
    await shell.goto(urls.view('recorrido'));
    await expect(
      page.getByRole('checkbox', { name: /^Marcar como completado/ }).first(),
    ).toBeChecked();
  });

  test('campaign: the answer to a checkpoint, with the missions of world 1 resolved', async ({
    shell,
    campaign,
    page,
    storage,
  }) => {
    await storage.seed({ 'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'] });
    await shell.goto(urls.world('rust-world-1'));
    await campaign.checkpointOption('B').click();
    await expect(campaign.checkpointOption('B')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();

    await expect(campaign.checkpointOption('B')).toHaveAttribute('aria-pressed', 'true');
  });
});
