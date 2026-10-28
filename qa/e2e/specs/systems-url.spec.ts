import { expect, test } from '../fixtures';

const CACHE = 'Una caché que aprende tus visitas';

test.describe('nuqs owns only its three keys (D1)', () => {
  test('a foreign parameter survives opening a workshop', async ({ shell, systems, page }) => {
    await shell.goto('/?basura=1&lenguaje=rust#sistemas');

    await systems.openWorkshop(CACHE);

    await expect(page).toHaveURL('/?basura=1&lenguaje=rust&taller=cache&parte=explore#sistemas');
  });

  test('a part change keeps the key order of the lab return link', async ({
    shell,
    systems,
    page,
  }) => {
    await shell.goto('/?taller=cache&parte=build&lenguaje=rust#sistemas');

    await systems.part('ship').click();

    await expect(page).toHaveURL('/?taller=cache&parte=ship&lenguaje=rust#sistemas');
  });
});
