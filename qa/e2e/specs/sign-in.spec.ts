import { expect, test } from '../fixtures';
import { MESSAGES, STUDENT, errorBody } from '../lib/api-contract';
import { trackContentRequests } from '../lib/content-requests';
import { curriculumIds } from '../lib/curriculum';
import { documentWasReloaded, markDocument } from '../lib/document-marker';
import { urls } from '../lib/urls';

const PASSWORD = 'una frase larga para el taller';

test.use({ sessionAccount: null });

test.describe('signing in', () => {
  test('goes on to the requested view without reloading, with the CSRF token and without X-Taller-User', async ({
    access,
    lab,
    api,
    page,
  }) => {
    const contentRequests = trackContentRequests(page);
    const url = urls.exercise('rust-02', 'code');
    await page.goto(url);
    await expect(access.field('Email')).toBeFocused();
    await markDocument(page);
    const xsrf = api.xsrfValue();
    await access.signIn(STUDENT.email, PASSWORD);
    await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
    expect(await documentWasReloaded(page)).toBe(false);
    await expect(page).toHaveURL(url);
    expect(contentRequests).toHaveLength(1);
    expect(api.callsTo('GET /api/session')).toHaveLength(2);
    const [call] = api.callsTo('POST /api/auth/login');
    expect(call?.xsrf).toBe(xsrf);
    expect(call?.user).toBeUndefined();
    expect(call?.body).toEqual({ email: STUDENT.email, password: PASSWORD, remember: false });
    await expect(page.locator('.app-shell')).not.toHaveAttribute('inert', '');
  });

  test('shows the same text for an unknown email and for a wrong password, and marks no field', async ({
    access,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 422/, 'the two 422 of the sign-in');
    api.reply(
      'POST /api/auth/login',
      { status: 422, json: errorBody('auth_failed') },
      { status: 422, json: errorBody('auth_failed') },
    );
    await page.goto(urls.view('recorrido'));
    await access.signIn('nadie@x.com', PASSWORD);
    await expect(access.alert()).toHaveText(MESSAGES.auth_failed);
    const unknownEmail = await access.alert().innerText();
    await access.field('Email').fill(STUDENT.email);
    await access.field('Contraseña').fill('otra frase equivocada del todo');
    await access.button('Ingresar').click();
    await expect.poll(() => api.callsTo('POST /api/auth/login').length).toBe(2);
    await expect(access.alert()).toHaveText(MESSAGES.auth_failed);
    expect(await access.alert().innerText()).toBe(unknownEmail);
    await expect(access.field('Email')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(access.field('Contraseña')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('waits for Retry-After before letting the button send again', async ({
    access,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 429/, 'the 429 of the sign-in');
    await page.clock.install();
    api.reply('POST /api/auth/login', {
      status: 429,
      headers: { 'Retry-After': '120' },
      json: errorBody('too_many_requests'),
    });
    await page.goto(urls.view('recorrido'));
    await access.signIn(STUDENT.email, PASSWORD);
    await expect(access.alert()).toContainText(MESSAGES.too_many_requests);
    await expect(access.alert()).toContainText('Podés volver a intentar en 2 minutos.');
    await expect(access.button('Ingresar')).toBeDisabled();
    await page.clock.fastForward(119_000);
    await expect(access.button('Ingresar')).toBeDisabled();
    await page.clock.fastForward(1_000);
    await expect(access.button('Ingresar')).toBeEnabled();
  });

  test('keeps the button busy while the server answers and sends once', async ({
    access,
    api,
    shell,
    page,
  }) => {
    let answer: () => void = () => {};
    const answered = new Promise<void>((resolve) => {
      answer = resolve;
    });
    api.on('POST /api/auth/login', async () => {
      await answered;
      api.account = STUDENT;
      return { status: 200, json: { data: STUDENT } };
    });
    await page.goto(urls.view('recorrido'));
    await access.field('Email').fill(STUDENT.email);
    await access.field('Contraseña').fill(PASSWORD);
    await access.button('Ingresar').dblclick();
    await expect(access.button('Ingresando…')).toBeDisabled();
    answer();
    await expect(shell.heading('recorrido')).toBeVisible();
    expect(api.callsTo('POST /api/auth/login')).toHaveLength(1);
  });

  test('a disabled account sees the message of the server and stays out', async ({
    access,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 403/, 'the 403 of the sign-in');
    api.reply('POST /api/auth/login', { status: 403, json: errorBody('account_disabled') });
    await page.goto(urls.view('recorrido'));
    await access.signIn(STUDENT.email, PASSWORD);
    await expect(access.alert()).toHaveText(MESSAGES.account_disabled);
    await expect(access.heading('Ingresá al taller')).toBeVisible();
  });

  test('an answer that is not JSON shows its own message and keeps what was typed', async ({
    access,
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 502/, 'the 502 of the sign-in');
    api.reply('POST /api/auth/login', {
      status: 502,
      body: '<html>Bad Gateway</html>',
      contentType: 'text/html',
    });
    await page.goto(urls.view('recorrido'));
    await access.signIn(STUDENT.email, PASSWORD);
    await expect(access.alert()).toHaveText(
      'El taller no respondió como esperábamos. Probá de nuevo en un rato.',
    );
    await expect(access.field('Email')).toHaveValue(STUDENT.email);
  });

  test('reads the privacy notice from the sign-in and comes back to the same place', async ({
    access,
    page,
  }) => {
    await page.goto(urls.view('recorrido'));
    await access.button('Aviso de privacidad').click();
    const notice = page.getByRole('dialog', { name: 'Aviso de privacidad' });
    await expect(notice).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(notice).toBeHidden();
    await expect(access.button('Aviso de privacidad')).toBeFocused();
  });
});
