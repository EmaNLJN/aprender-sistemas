import { expect, test } from '../fixtures';
import { INVITATION, RESET_LINK, STUDENT } from '../lib/api-contract';
import { urls } from '../lib/urls';

const SIGN_UP_PASSWORD = 'una frase larga para el alta';
const NEW_PASSWORD = 'otra frase larga para el cambio';

test.describe('nothing secret is left behind', () => {
  test.use({ sessionAccount: null });

  test('after the sign-up, the sign-out, the reset and the sign-in', async ({
    access,
    account,
    shell,
    page,
  }) => {
    const consoleTexts: string[] = [];
    page.on('console', (message) => consoleTexts.push(message.text()));
    await page.goto(`/#invitacion=${INVITATION.token}`);
    await access.createAccount('Bruno Díaz', SIGN_UP_PASSWORD);
    await expect(shell.heading('recorrido')).toBeVisible();
    await account.open();
    await Promise.all([
      page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()),
      account.signOut(),
    ]);
    await page.goto(`/#restablecer=${RESET_LINK.token}&email=ana%40x.com`);
    await access.chooseNewPassword(NEW_PASSWORD);
    await access.field('Contraseña').fill(NEW_PASSWORD);
    await access.button('Ingresar').click();
    await expect(shell.heading('recorrido')).toBeVisible();
    const leftovers = await page.evaluate(() =>
      [
        ...Object.keys(localStorage).map((key) => `${key}=${localStorage.getItem(key) ?? ''}`),
        ...Object.keys(sessionStorage).map((key) => `${key}=${sessionStorage.getItem(key) ?? ''}`),
        document.cookie,
        location.href,
      ].join('\n'),
    );
    const history: string[] = [page.url()];
    for (let step = 0; step < 5; step += 1) {
      const response = await page.goBack({ waitUntil: 'commit' });
      if (response === null) break;
      history.push(page.url());
    }
    for (const secret of [SIGN_UP_PASSWORD, NEW_PASSWORD, INVITATION.token, RESET_LINK.token]) {
      expect(leftovers).not.toContain(secret);
      expect(consoleTexts.join('\n')).not.toContain(secret);
      expect(history.join('\n')).not.toContain(secret);
    }
  });
});

test.describe('the keyboard alone', () => {
  test.use({ sessionAccount: null });

  test('signs in, then opens and closes «Tu cuenta»', async ({ access, account, shell, page }) => {
    await page.goto(urls.view('recorrido'));
    await expect(access.field('Email')).toBeFocused();
    await page.keyboard.type(STUDENT.email);
    await page.keyboard.press('Tab');
    await expect(access.field('Contraseña')).toBeFocused();
    await page.keyboard.type('una frase larga para el taller');
    await page.keyboard.press('Enter');
    await expect(shell.heading('recorrido')).toBeVisible();
    await account.entry.focus();
    await page.keyboard.press('Enter');
    await expect(account.dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(account.entry).toBeFocused();
  });
});

for (const width of [320, 390]) {
  test.describe(`at ${width} px without an account`, () => {
    test.use({ viewport: { width, height: 760 }, sessionAccount: null });

    test('the access fits without sideways scrolling and its fields have 16 px', async ({
      access,
      page,
    }) => {
      await page.goto(urls.view('recorrido'));
      await expect(access.heading('Ingresá al taller')).toBeVisible();
      expect(
        await access.layer().evaluate((element) => element.scrollWidth - element.clientWidth),
      ).toBeLessThanOrEqual(0);
      const fontSize = await access
        .field('Email')
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      expect(fontSize).toBeGreaterThanOrEqual(16);
    });
  });

  test.describe(`at ${width} px with an account`, () => {
    test.use({ viewport: { width, height: 760 } });

    test('the top bar fits with «Tu cuenta», whose dialog takes the whole screen', async ({
      account,
      shell,
      page,
    }) => {
      await shell.goto(urls.view('recorrido'));
      expect(
        await account.topbar.evaluate((element) => element.scrollWidth - element.clientWidth),
      ).toBeLessThanOrEqual(0);
      await account.open();
      const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect((await account.dialog.boundingBox())?.width).toBe(viewportWidth);
    });
  });
}

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce', sessionAccount: null });

  test('the buttons of the access have no transition', async ({ access, page }) => {
    await page.goto(urls.view('recorrido'));
    const transition = await access
      .button('Ingresar')
      .evaluate((element) => getComputedStyle(element).transitionProperty);
    expect(transition).toBe('none');
  });
});
