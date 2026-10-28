import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

const CACHE = 'Una caché que aprende tus visitas';
test.describe('what React keeps that innerHTML rebuilt (C2)', () => {
  test('the trace the student closed stays closed after another action', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await systems.modelButton('Leer A').click();
    await expect(systems.trace()).toHaveAttribute('open', '');

    await systems.traceSummary().click();
    await expect(systems.trace()).not.toHaveAttribute('open');
    await systems.modelButton('Leer B').click();

    await expect(systems.traceEntries()).toHaveCount(2);
    await expect(systems.trace()).not.toHaveAttribute('open');
  });

  test('the state table keeps its scroll after an action', async ({ shell, systems }) => {
    await shell.goto(urls.workshop('rust', 'pc', 'explore'));
    await systems.stateTable().evaluate((element) => {
      element.querySelector('table')!.style.minWidth = '800px';
      element.scrollLeft = 40;
    });
    expect(await systems.stateTable().evaluate((element) => element.scrollLeft)).toBe(40);

    await systems.modelControls().first().click();

    expect(await systems.stateTable().evaluate((element) => element.scrollLeft)).toBe(40);
  });

  test('the storage warning appears as soon as the engine reports it', async ({
    shell,
    systems,
    storage,
  }) => {
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await expect(systems.storageWarning()).toHaveCount(0);
    await storage.failWrites();

    await systems.modelButton('Leer A').click();

    await expect(systems.storageWarning()).toBeVisible();
  });

  test('going back to the catalog focuses the workshop just left', async ({ shell, systems }) => {
    await shell.goto(urls.workshop('rust'));
    await systems.openWorkshop(CACHE);

    await systems.backToCatalog().click();

    await expect(systems.openButton(CACHE)).toBeFocused();
  });
});
