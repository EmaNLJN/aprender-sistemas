import { expect, test } from '../fixtures';
import { RUST_02 } from '../lib/compiler-results';
import { urls } from '../lib/urls';

test.describe('the guards of the net', () => {
  test.fail('a console error fails the test', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));
    await page.evaluate(() => console.error('boom'));
  });

  test.fail('an uncaught exception of the page fails the test', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));
    const thrown = page.waitForEvent('pageerror');
    await page.evaluate(() =>
      setTimeout(() => {
        throw new Error('boom');
      }, 0),
    );
    await thrown;
  });

  test.fail(
    'a request to a public host without a double fails the test',
    async ({ shell, lab, pageIssues }) => {
      pageIssues.expectIssue(/ERR_BLOCKED_BY_CLIENT/, 'la red estricta aborta el pedido');
      await shell.goto(urls.exercise(RUST_02.id, 'code'));
      await lab.runCode();
      await expect(lab.reviewHeading()).toHaveText('No pude ejecutar esta vez.');
    },
  );

  test('an expected issue that never happens fails the test', async ({ shell, pageIssues }) => {
    test.fail();
    await shell.goto(urls.view('recorrido'));
    pageIssues.expectIssue(/never happens/, 'se espera un error que no ocurre');
  });
});
