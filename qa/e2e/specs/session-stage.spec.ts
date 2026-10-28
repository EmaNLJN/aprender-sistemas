import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { INVITATION, MESSAGES } from '../lib/api-contract';
import { trackContentRequests } from '../lib/content-requests';
import { urls } from '../lib/urls';

const FAILED_RESOURCE = /Failed to load resource/;
const UNREACHABLE = 'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.';

function legacyEvaluated(page: Page): Promise<boolean> {
  return page.evaluate(() => 'TallerLab' in window);
}

function trackApiAndContent(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname === '/api/session' || pathname.startsWith('/content/')) seen.push(pathname);
  });
  return seen;
}

test.describe('every start', () => {
  test('asks for the session once, before the content', async ({ shell, lab, page }) => {
    const seen = trackApiAndContent(page);
    await shell.goto(urls.exercise('rust-02', 'code'));
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    expect(seen.filter((path) => path === '/api/session')).toHaveLength(1);
    expect(seen[0]).toBe('/api/session');
  });
});

test.describe('without an account', () => {
  test.use({ sessionAccount: null });

  test('shows the access with the shell inert, evaluates no legacy source and asks for no content', async ({
    access,
    page,
  }) => {
    const contentRequests = trackContentRequests(page);
    await page.goto(urls.exercise('rust-02', 'code'));
    await expect(access.heading('Ingresá al taller')).toBeVisible();
    await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
    expect(contentRequests).toHaveLength(0);
    expect(await legacyEvaluated(page)).toBe(false);
  });
});

test.describe('a link with a token', () => {
  test('leaves the address bar and the history before app.js runs', async ({ context, page }) => {
    await context.addInitScript(() => {
      const pushes: string[] = [];
      (window as unknown as { __e2ePushes: string[] }).__e2ePushes = pushes;
      const pushState = history.pushState.bind(history);
      history.pushState = (data, unused, url) => {
        pushes.push(String(url));
        pushState(data, unused, url);
      };
    });
    await page.goto(`/?ejercicio=rust-02&paso=code#invitacion=${INVITATION.token}`);
    await expect(page).toHaveURL(/\/\?ejercicio=rust-02&paso=code$/);
    expect(
      await page.evaluate(() => (window as unknown as { __e2ePushes: string[] }).__e2ePushes),
    ).toEqual([]);
    expect(await legacyEvaluated(page)).toBe(false);
  });

  test('of a reset leaves the address bar too', async ({ page }) => {
    await page.goto('/#restablecer=9f2c&email=ana%40x.com');
    await expect(page).toHaveURL(/\/$/);
    expect(await legacyEvaluated(page)).toBe(false);
  });
});

test.describe('the session does not answer', () => {
  test('shows the error, evaluates no legacy source and retries without reloading', async ({
    api,
    lab,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(FAILED_RESOURCE, 'the 502 of the first session request');
    api.reply('GET /api/session', {
      status: 502,
      body: '<html>Bad Gateway</html>',
      contentType: 'text/html',
    });
    await page.goto(urls.exercise('rust-02', 'code'));
    await expect(page.getByRole('alert')).toHaveText(UNREACHABLE);
    expect(await legacyEvaluated(page)).toBe(false);
    const retry = page.getByRole('button', { name: 'Reintentar' });
    await expect(retry).toBeFocused();
    await retry.click();
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    expect(api.callsTo('GET /api/session')).toHaveLength(2);
  });

  test('with a 429 waits for Retry-After before letting retry', async ({
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(FAILED_RESOURCE, 'the 429 of the first session request');
    await page.clock.install();
    api.reply('GET /api/session', {
      status: 429,
      headers: { 'Retry-After': '2' },
      json: { message: MESSAGES.too_many_requests, code: 'too_many_requests' },
    });
    await page.goto(urls.view('recorrido'));
    await expect(page.getByRole('alert')).toHaveText(
      `${MESSAGES.too_many_requests} Podés volver a intentar en 2 segundos.`,
    );
    const retry = page.getByRole('button', { name: 'Reintentar' });
    await expect(retry).toBeDisabled();
    await page.clock.fastForward(2_000);
    await expect(retry).toBeEnabled();
  });
});
