import { expect, test } from '../fixtures';
import { FIELD_MESSAGES, INVITATION, MESSAGES, errorBody } from '../lib/api-contract';
import { documentWasReloaded, markDocument } from '../lib/document-marker';

const PASSWORD = 'una frase larga para el alta';
const LINK = `/#invitacion=${INVITATION.token}`;

test.describe('a person without an account and an invitation link', () => {
  test.use({ sessionAccount: null });

  test('creates the account and starts the workshop in «Mi recorrido» without reloading', async ({
    access,
    api,
    shell,
    page,
  }) => {
    await page.goto(LINK);
    await expect(page).toHaveURL(/\/$/);
    await expect(access.heading('Creá tu cuenta')).toBeVisible();
    await expect(page.getByText(`Te invitaron con ${INVITATION.email}.`)).toBeVisible();
    await expect(
      page.getByText('La invitación vence el 12 de octubre de 2026 a las 12:30.'),
    ).toBeVisible();
    await markDocument(page);
    const xsrf = api.xsrfValue();
    await access.createAccount('Bruno Díaz', PASSWORD);
    await expect(shell.heading('recorrido')).toBeVisible();
    expect(await documentWasReloaded(page)).toBe(false);
    const [call] = api.callsTo('POST /api/auth/invitations/accept');
    expect(call?.body).toEqual({
      token: INVITATION.token,
      name: 'Bruno Díaz',
      password: PASSWORD,
      password_confirmation: PASSWORD,
      privacyVersion: '2026-10-dev',
    });
    expect(call?.xsrf).toBe(xsrf);
    expect(call?.user).toBeUndefined();
  });

  test('stops a 14-character password and lets a 15-character one with a decomposed «á» go', async ({
    access,
    api,
    page,
  }) => {
    await page.goto(LINK);
    await access.field('Tu nombre').fill('Bruno Díaz');
    await access.field('Contraseña').fill('a'.repeat(14));
    await access.field('Repetí la contraseña').fill('a'.repeat(14));
    await page.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }).check();
    await access.button('Crear mi cuenta').click();
    await expect(page.getByText(FIELD_MESSAGES.tooShort)).toBeVisible();
    expect(api.callsTo('POST /api/auth/invitations/accept')).toHaveLength(0);
    const decomposed = `${'a'.repeat(14)}a\u0301`;
    await access.field('Contraseña').fill(decomposed);
    await access.field('Repetí la contraseña').fill(decomposed);
    await access.button('Crear mi cuenta').click();
    await expect.poll(() => api.callsTo('POST /api/auth/invitations/accept').length).toBe(1);
  });

  test('allows 63 characters plus a decomposed accented character after NFC', async ({
    access,
    api,
    page,
  }) => {
    await page.goto(LINK);
    const password = `${'a'.repeat(63)}a\u0301`;
    await access.createAccount('Bruno Díaz', password);
    await expect.poll(() => api.callsTo('POST /api/auth/invitations/accept').length).toBe(1);
    expect(api.callsTo('POST /api/auth/invitations/accept')[0]?.body).toMatchObject({
      password,
      password_confirmation: password,
    });
  });

  test('shows both reasons of the server on the password and focuses it', async ({
    access,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 422/, 'the 422 of the sign-up');
    api.reply('POST /api/auth/invitations/accept', {
      status: 422,
      json: errorBody('validation_failed', {
        password: [FIELD_MESSAGES.containsName, FIELD_MESSAGES.blocked],
      }),
    });
    await page.goto(LINK);
    await access.createAccount('Bruno Díaz', PASSWORD);
    await expect(page.getByText(FIELD_MESSAGES.containsName)).toBeVisible();
    await expect(page.getByText(FIELD_MESSAGES.blocked)).toBeVisible();
    await expect(access.field('Contraseña')).toHaveAttribute('aria-invalid', 'true');
    await expect(access.field('Contraseña')).toBeFocused();
  });

  for (const [status, code] of [
    [404, 'invitation_not_found'],
    [410, 'invitation_expired'],
  ] as const) {
    test(`a link answered with ${status} shows the message of the server and no form`, async ({
      access,
      api,
      pageIssues,
      page,
    }) => {
      pageIssues.expectIssue(new RegExp(`status of ${status}`), `the ${status} of the lookup`);
      api.reply('POST /api/auth/invitations/lookup', { status, json: errorBody(code) });
      await page.goto(LINK);
      await expect(access.alert()).toContainText(MESSAGES[code]);
      await expect(access.field('Tu nombre')).toHaveCount(0);
      await access.button('Ir al ingreso').click();
      await expect(access.heading('Ingresá al taller')).toBeVisible();
    });
  }

  test('an account created in the meantime offers the sign-in', async ({
    access,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 409/, 'the 409 of the sign-up');
    api.reply('POST /api/auth/invitations/accept', { status: 409, json: errorBody('email_taken') });
    await page.goto(LINK);
    await access.createAccount('Bruno Díaz', PASSWORD);
    await expect(access.alert()).toContainText(MESSAGES.email_taken);
    await expect(access.alert()).toContainText('Ingresá con ese email.');
    await access.button('Ir al ingreso').click();
    await expect(access.heading('Ingresá al taller')).toBeVisible();
  });

  test('reads the notice without losing what was typed', async ({ access, page }) => {
    await page.goto(LINK);
    await access.field('Tu nombre').fill('Bruno Díaz');
    await access.button('Leer el aviso').click();
    const notice = page.getByRole('dialog', { name: 'Aviso de privacidad' });
    await expect(notice).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(notice).toBeHidden();
    await expect(access.field('Tu nombre')).toHaveValue('Bruno Díaz');
    await expect(
      page.getByRole('checkbox', { name: 'Leí y acepto el aviso de privacidad' }),
    ).not.toBeChecked();
  });
});

test.describe('a person with a live session and an invitation link', () => {
  test('still sees the sign-up of the invitation', async ({ access, page }) => {
    await page.goto(LINK);
    await expect(access.heading('Creá tu cuenta')).toBeVisible();
    await expect(page.getByText(`Te invitaron con ${INVITATION.email}.`)).toBeVisible();
  });
});
