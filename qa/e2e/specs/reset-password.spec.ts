import { expect, test } from '../fixtures';
import { FIELD_MESSAGES, RESET_LINK, errorBody } from '../lib/api-contract';

const NEW_PASSWORD = 'otra frase larga para el cambio';
const LINK = `/#restablecer=${RESET_LINK.token}&email=ana%40x.com`;
const ASK_NEW_LINK = 'Pedile uno nuevo a quien administra el taller.';

test.use({ sessionAccount: null });

test.describe('the reset link', () => {
  test('chooses a new password and then signs in with it, without a session in between', async ({
    access,
    api,
    shell,
    page,
  }) => {
    await page.goto(LINK);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Para ana@x.com.')).toBeVisible();
    await access.chooseNewPassword(NEW_PASSWORD);
    await expect(
      page.getByText(
        'Listo: tu contraseña cambió y cerramos tus sesiones abiertas. Ingresá con la nueva.',
      ),
    ).toBeVisible();
    await expect(access.field('Email')).toHaveValue('ana@x.com');
    expect(api.account).toBeNull();
    const [call] = api.callsTo('POST /api/auth/reset-password');
    expect(call?.body).toEqual({
      token: RESET_LINK.token,
      email: 'ana@x.com',
      password: NEW_PASSWORD,
      password_confirmation: NEW_PASSWORD,
    });
    expect(call?.user).toBeUndefined();
    await access.field('Contraseña').fill(NEW_PASSWORD);
    await access.button('Ingresar').click();
    await expect(shell.heading('recorrido')).toBeVisible();
  });

  test('an invalid, an expired and an unknown link show the same text', async ({
    access,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 422/, 'the three 422 of the reset');
    const rejected = {
      status: 422,
      json: errorBody('validation_failed', { token: [FIELD_MESSAGES.resetToken] }),
    };
    api.reply('POST /api/auth/reset-password', rejected, rejected, rejected);
    await page.goto(LINK);
    const texts: string[] = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await access.chooseNewPassword(NEW_PASSWORD);
      await expect.poll(() => api.callsTo('POST /api/auth/reset-password').length).toBe(attempt);
      await expect(access.alert()).toContainText(ASK_NEW_LINK);
      texts.push(await access.alert().innerText());
    }
    expect(new Set(texts).size).toBe(1);
    await expect(access.alert()).toContainText(FIELD_MESSAGES.resetToken);
  });

  test('a link without a readable email says it is incomplete and shows no form', async ({
    access,
    page,
  }) => {
    await page.goto('/#restablecer=9f2c');
    await expect(access.alert()).toContainText(
      'El enlace para restablecer la contraseña no está completo.',
    );
    await expect(access.field('Contraseña nueva')).toHaveCount(0);
  });
});
