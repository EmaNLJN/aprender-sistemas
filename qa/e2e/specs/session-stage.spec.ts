import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { INVITATION, MESSAGES, RESET_LINK, errorBody } from '../lib/api-contract';
import { trackContentRequests } from '../lib/content-requests';
import { documentWasReloaded, markDocument } from '../lib/document-marker';
import { urls } from '../lib/urls';

const UNREACHABLE = 'No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.';
const CONNECTING = 'Conectando con el taller…';
const EXERCISE_QUERY = '?ejercicio=rust-02&paso=code';
const EXERCISE_ADDRESS = /\/\?ejercicio=rust-02&paso=code$/;

interface PushRecorder {
  __e2ePushes: string[];
}

function legacyEvaluated(page: Page): Promise<boolean> {
  return page.evaluate(() => 'TallerLab' in window);
}

async function recordHistoryPushes(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const pushes: string[] = [];
    (window as unknown as PushRecorder).__e2ePushes = pushes;
    const pushState = history.pushState.bind(history);
    history.pushState = (data, unused, url) => {
      pushes.push(String(url));
      pushState(data, unused, url);
    };
  });
}

function historyPushes(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as PushRecorder).__e2ePushes);
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
    api,
    page,
  }) => {
    const contentRequests = trackContentRequests(page);
    await page.goto(urls.exercise('rust-02', 'code'));
    await expect(access.heading('Ingresá al taller')).toBeVisible();
    await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link:focus, .app-shell :focus')).toHaveCount(0);
    expect(api.callsTo('GET /api/session')).toHaveLength(1);
    expect(contentRequests).toHaveLength(0);
    expect(await legacyEvaluated(page)).toBe(false);
  });
});

test.describe('a link with a token', () => {
  test('leaves the address bar and the history before app.js runs', async ({ context, page }) => {
    await recordHistoryPushes(context);
    await page.goto(`/${EXERCISE_QUERY}#invitacion=${INVITATION.token}`);
    await expect(page).toHaveURL(EXERCISE_ADDRESS);
    await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
    expect(await historyPushes(page)).toEqual([]);
    expect(await legacyEvaluated(page)).toBe(false);
  });

  test('of a reset leaves the address bar too', async ({ context, page }) => {
    await recordHistoryPushes(context);
    const email = encodeURIComponent(RESET_LINK.email);
    await page.goto(`/${EXERCISE_QUERY}#restablecer=${RESET_LINK.token}&email=${email}`);
    await expect(page).toHaveURL(EXERCISE_ADDRESS);
    await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
    expect(await historyPushes(page)).toEqual([]);
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
    pageIssues.expectIssue(/status of 502/, 'the 502 of the first session request');
    api.reply('GET /api/session', {
      status: 502,
      body: '<html>Bad Gateway</html>',
      contentType: 'text/html',
    });
    const contentRequests = trackContentRequests(page);
    await page.goto(urls.exercise('rust-02', 'code'));
    await expect(page.getByRole('alert')).toHaveText(UNREACHABLE);
    expect(contentRequests).toHaveLength(0);
    expect(await legacyEvaluated(page)).toBe(false);
    const retry = page.getByRole('button', { name: 'Reintentar' });
    await expect(retry).toBeFocused();
    await markDocument(page);
    await retry.click();
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    expect(await documentWasReloaded(page)).toBe(false);
    expect(api.callsTo('GET /api/session')).toHaveLength(2);
    expect(contentRequests).toHaveLength(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(retry).toHaveCount(0);
    await expect(page.getByText(CONNECTING)).toHaveCount(0);
  });

  test('with a 429 waits for Retry-After before letting retry', async ({
    api,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(/status of 429/, 'the 429 of the first session request');
    await page.clock.install();
    api.reply('GET /api/session', {
      status: 429,
      headers: { 'Retry-After': '120' },
      json: errorBody('too_many_requests'),
    });
    await page.goto(urls.view('recorrido'));
    await expect(page.getByRole('alert')).toHaveText(
      `${MESSAGES.too_many_requests} Podés volver a intentar en 2 minutos.`,
    );
    const retry = page.getByRole('button', { name: 'Reintentar' });
    await expect(retry).toBeDisabled();
    await page.clock.fastForward(110_000);
    await expect(retry).toBeDisabled();
    await page.clock.fastForward(10_000);
    await expect(retry).toBeEnabled();
  });
});
