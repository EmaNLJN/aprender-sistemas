import { expect, test } from '../fixtures';
import { STUDENT, errorBody, FIELD_MESSAGES } from '../lib/api-contract';
import { urls } from '../lib/urls';

const CHANGED =
  'El aviso de privacidad cambió desde la última vez que lo aceptaste. Leelo y aceptalo para seguir.';

test.describe('an account with an older notice', () => {
  test.use({ sessionAccount: { ...STUDENT, privacyAccepted: false } });

  test('accepts the current one before the workshop starts', async ({
    access,
    account,
    api,
    shell,
    page,
  }) => {
    await page.goto(urls.view('recorrido'));
    await expect(access.heading('Aviso de privacidad')).toBeVisible();
    await expect(page.getByText(CHANGED)).toBeVisible();
    await expect(account.entry).toHaveCount(0);
    await access.button('Acepto').click();
    await expect(shell.heading('recorrido')).toBeVisible();
    const [call] = api.callsTo('POST /api/me/privacy');
    expect(call?.body).toEqual({ privacyVersion: '2026-10-dev' });
    expect(call?.user).toBe(String(STUDENT.id));
    await expect(account.entry).toBeVisible();
  });

  test('asks to reload when the server has another version, and does not retry', async ({
    access,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 422/, 'the 422 of the privacy notice');
    api.reply('POST /api/me/privacy', {
      status: 422,
      json: errorBody('validation_failed', { privacyVersion: [FIELD_MESSAGES.privacyChanged] }),
    });
    await page.goto(urls.view('recorrido'));
    await access.button('Acepto').click();
    await expect(access.alert()).toContainText(
      'El aviso de privacidad cambió: recargá la página para leer el vigente.',
    );
    await expect(access.button('Recargar')).toBeVisible();
    expect(api.callsTo('POST /api/me/privacy')).toHaveLength(1);
  });

  test('signs out from the notice and reloads', async ({ access, page }) => {
    await page.goto(urls.view('recorrido'));
    await Promise.all([
      page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()),
      access.button('Salir').click(),
    ]);
    await expect(access.heading('Ingresá al taller')).toBeVisible();
  });
});
