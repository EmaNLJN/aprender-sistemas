import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { MESSAGES, STUDENT, errorBody } from '../lib/api-contract';
import { frozenProgress, type StorageKey } from '../lib/curriculum';
import { documentWasReloaded, markDocument } from '../lib/document-marker';
import { urls } from '../lib/urls';

const NOTE = 'Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.';

async function expectReload(page: Page, action: () => Promise<void>): Promise<void> {
  await markDocument(page);
  await Promise.all([
    page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()),
    action(),
  ]);
  await page.waitForLoadState('load');
  expect(await documentWasReloaded(page)).toBe(true);
}

test.describe('«Tu cuenta»', () => {
  test('opens from the top bar without changing the URL and closes with Esc, giving the focus back', async ({
    account,
    shell,
    page,
  }) => {
    await shell.goto(urls.view('biblioteca'));
    const entryAfterSidebar = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      const entry = document.getElementById('account-entry');
      if (sidebar === null || entry === null) return false;
      return (sidebar.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    expect(entryAfterSidebar).toBe(true);
    await account.open();
    await expect(account.dialog).toContainText(`${STUDENT.name} · ${STUDENT.email}`);
    await expect(account.dialog).toContainText(NOTE);
    await expect(page).toHaveURL(urls.view('biblioteca'));
    await page.keyboard.press('Escape');
    await expect(account.dialog).toBeHidden();
    await expect(account.entry).toBeFocused();
    await expect(shell.heading('biblioteca')).toBeVisible();
  });

  test('signs out with X-Taller-User and reloads, and the progress of the browser stays', async ({
    account,
    shell,
    storage,
    api,
    access,
    page,
  }) => {
    await storage.seed(frozenProgress);
    await shell.goto(urls.view('recorrido'));
    const xsrf = api.xsrfValue();
    await account.open();
    await expectReload(page, () => account.signOut());
    const [call] = api.callsTo('POST /api/auth/logout');
    expect(call?.user).toBe(String(STUDENT.id));
    expect(call?.xsrf).toBe(xsrf);
    await expect(access.heading('Ingresá al taller')).toBeVisible();
    const stored = await storage.snapshot();
    for (const key of Object.keys(frozenProgress) as StorageKey[])
      expect(stored[key]).toBe(frozenProgress[key]);
  });

  test('reloads too when the session had already ended', async ({
    account,
    shell,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 401/, 'the 401 of the sign-out');
    api.reply('POST /api/auth/logout', { status: 401, json: errorBody('unauthenticated') });
    await shell.goto(urls.view('recorrido'));
    await account.open();
    await expectReload(page, () => account.signOut());
  });

  test('keeps the session and offers to retry when the server fails', async ({
    account,
    shell,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 503/, 'the 503 of the sign-out');
    api.reply('POST /api/auth/logout', { status: 503, body: '<html>', contentType: 'text/html' });
    await shell.goto(urls.view('recorrido'));
    await account.open();
    await account.signOut();
    await expect(account.dialog.getByRole('alert')).toHaveText('No pudimos cerrar la sesión.');
    await expectReload(page, () => account.button('Reintentar').click());
  });

  test('offers to reload when the session belongs to another account', async ({
    account,
    shell,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 409/, 'the 409 of the sign-out');
    api.reply('POST /api/auth/logout', { status: 409, json: errorBody('account_mismatch') });
    await shell.goto(urls.view('recorrido'));
    await account.open();
    await account.signOut();
    await expect(account.dialog.getByRole('alert')).toContainText(MESSAGES.account_mismatch);
    await expectReload(page, () => account.button('Recargar').click());
  });

  test('opens the privacy notice from «Tu cuenta» and goes back to it', async ({
    account,
    shell,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await account.open();
    await account.button('Aviso de privacidad').click();
    const notice = page.getByRole('dialog', { name: 'Aviso de privacidad' });
    await expect(notice).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(notice).toBeHidden();
    await expect(account.dialog).toBeVisible();
  });
});
