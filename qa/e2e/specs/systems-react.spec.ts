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

  test('the overflowing state table keeps its scroll when an action changes its rows', async ({
    shell,
    systems,
  }) => {
    await shell.goto(urls.workshop('rust', 'scheduler', 'explore'));
    await systems.forceStateTableOverflow();
    await systems.stateTable().evaluate((element) => {
      element.scrollLeft = 40;
    });
    expect(await systems.stateTable().evaluate((element) => element.scrollLeft)).toBe(40);
    const before = await systems.stateTable().textContent();

    await systems.modelButton('Consumir un quantum').click();

    await expect(systems.stateTable()).not.toHaveText(before!);
    expect(await systems.stateTable().evaluate((element) => element.scrollLeft)).toBe(40);
  });

  test('the storage warning appears as soon as the engine reports it', async ({
    shell,
    systems,
    storage,
  }) => {
    await storage.blockWrites();
    await shell.goto(urls.workshop('rust', 'cache', 'explore'));
    await expect(systems.storageWarning()).toHaveCount(0);

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
