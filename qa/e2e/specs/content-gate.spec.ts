import type { Page, Route } from '@playwright/test';
import { expect, test } from '../fixtures';
import { CONTENT_URL, trackContentRequests } from '../lib/content-requests';
import { curriculumIds, frozenProgress, type StorageKey } from '../lib/curriculum';
import { documentWasReloaded, markDocument } from '../lib/document-marker';
import { readStorageAccess, watchStorageAccess } from '../lib/storage-access';
import { urls } from '../lib/urls';
import type { StorageControl } from '../fixtures/storage-control';
import type { CampaignPage } from '../pages/campaign';
import type { LabPage } from '../pages/lab';
import type { ShellPage } from '../pages/shell';
import type { SystemsPage } from '../pages/systems';

interface Pages {
  lab: LabPage;
  campaign: CampaignPage;
  systems: SystemsPage;
  shell: ShellPage;
}

const STORAGE_KEYS = Object.keys(frozenProgress) as StorageKey[];
const PROGRESS_SAVED = 'Tu progreso sigue guardado';
const FAILED_RESOURCE = /Failed to load resource/;

type ContentDocument = Record<string, Record<string, unknown>>;

async function fetchRealDocument(route: Route): Promise<ContentDocument> {
  const response = await route.fetch();
  return (await response.json()) as ContentDocument;
}

async function fulfillWith(route: Route, change: (document: ContentDocument) => void) {
  const document = await fetchRealDocument(route);
  change(document);
  await route.fulfill({ json: document });
}

async function failFirstThenContinue(page: Page, fail: (route: Route) => Promise<void>) {
  let requests = 0;
  await page.route(CONTENT_URL, async (route) => {
    requests += 1;
    if (requests === 1) await fail(route);
    else await route.continue();
  });
}

test.describe('the five deep links and the full reload', () => {
  const links = [
    {
      name: '?ejercicio=&paso=#laboratorio',
      url: urls.exercise('rust-02', 'code'),
      expectView: async ({ lab }: Pick<Pages, 'lab'>) => {
        await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
        await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
      },
    },
    {
      name: '?campana=&ejercicio=#laboratorio',
      url: urls.campaignMission('rust-world-1', 'rust-02'),
      expectView: async ({ lab }: Pick<Pages, 'lab'>) => {
        await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
        await expect(lab.tab('learn')).toHaveAttribute('aria-selected', 'true');
      },
    },
    {
      name: '?sistema=&ejercicio=#laboratorio',
      url: urls.systemsCode('cache', 'go-113'),
      expectView: async ({ lab, shell }: Pick<Pages, 'lab' | 'shell'>) => {
        await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['go-113'].title);
        await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
        await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
      },
    },
    {
      name: '?mundo=#campana',
      url: urls.world('rust-world-2'),
      expectView: async ({ campaign, shell }: Pick<Pages, 'campaign' | 'shell'>) => {
        await expect(shell.menuLink('campana')).toHaveAttribute('aria-current', 'page');
        await expect(campaign.world('Puerto de señales')).toBeVisible();
      },
    },
    {
      name: '?lenguaje=&taller=&parte=#sistemas',
      url: urls.workshop('go', 'cache', 'ship'),
      expectView: async ({ systems, shell }: Pick<Pages, 'systems' | 'shell'>) => {
        await expect(shell.languageButton('go')).toHaveAttribute('aria-pressed', 'true');
        await expect(systems.workshopHeading('Una caché que aprende tus visitas')).toBeVisible();
        await expect(systems.part('ship')).toHaveAttribute('aria-pressed', 'true');
      },
    },
  ];

  for (const link of links) {
    test(`${link.name} opens and reloads with one content request per load`, async ({
      shell,
      lab,
      campaign,
      systems,
      page,
    }) => {
      const contentRequests = trackContentRequests(page);

      await shell.goto(link.url);
      await link.expectView({ lab, campaign, systems, shell });
      expect(contentRequests).toHaveLength(1);
      await expect(shell.contentFailure).toHaveCount(0);

      await markDocument(page);
      await page.reload();
      await shell.contentFailure.or(page.locator('#main h1')).first().waitFor();
      expect(await documentWasReloaded(page)).toBe(true);
      await link.expectView({ lab, campaign, systems, shell });
      expect(contentRequests).toHaveLength(2);
      await expect(page).toHaveURL(link.url);
    });
  }
});

test.describe('the content does not arrive', () => {
  const failures: {
    name: string;
    kind: string;
    respond: (route: Route) => Promise<void>;
    console?: RegExp;
  }[] = [
    {
      name: 'the request is aborted',
      kind: 'network',
      respond: (route) => route.abort(),
      console: FAILED_RESOURCE,
    },
    {
      name: 'the server answers 404',
      kind: 'version',
      respond: (route) => route.fulfill({ status: 404, body: 'no existe' }),
      console: FAILED_RESOURCE,
    },
    {
      name: 'the server answers 500',
      kind: 'status',
      respond: (route) => route.fulfill({ status: 500, body: 'falló' }),
      console: FAILED_RESOURCE,
    },
    {
      name: 'the body is not JSON',
      kind: 'body',
      respond: (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '<<<basura>>>' }),
    },
    {
      name: 'a portion is absent',
      kind: 'missing',
      respond: (route) =>
        fulfillWith(route, (document) => {
          delete document.lab.go;
        }),
    },
    {
      name: 'a portion has another shape',
      kind: 'shape',
      respond: (route) =>
        fulfillWith(route, (document) => {
          document.quests.rust = {};
        }),
    },
  ];

  for (const failure of failures) {
    test(`shows the error and leaves the progress untouched when ${failure.name}`, async ({
      shell,
      storage,
      context,
      pageIssues,
      page,
    }) => {
      if (failure.console) pageIssues.expectIssue(failure.console, `the ${failure.name} request`);
      await page.route(CONTENT_URL, failure.respond);
      await storage.seed(frozenProgress);
      await watchStorageAccess(context);

      await shell.goto(urls.exercise('rust-02', 'code'));

      await expect(shell.contentAlert).toContainText(PROGRESS_SAVED);
      await expect(shell.contentFailure).toHaveAttribute('data-failure', failure.kind);
      await expect(shell.retryButton).toBeVisible();
      await expect(page.getByRole('tab', { name: /Experimentá/ })).toHaveCount(0);
      await expect(shell.menu).toHaveCount(1);
      await expectProgressUntouched({ storage, page });
    });
  }

  test('shows the error when the request outlasts the 20 s cap', async ({
    shell,
    storage,
    context,
    page,
  }) => {
    await page.clock.install();
    await page.route(CONTENT_URL, () => {});
    await storage.seed(frozenProgress);
    await watchStorageAccess(context);

    await page.goto(urls.exercise('rust-02', 'code'));
    await expect(shell.contentFailure).toHaveCount(0);
    await page.clock.fastForward(20_000);

    await expect(shell.contentAlert).toContainText(PROGRESS_SAVED);
    await expect(shell.contentFailure).toHaveAttribute('data-failure', 'timeout');
    await expectProgressUntouched({ storage, page });
  });
});

async function expectProgressUntouched({ storage, page }: { storage: StorageControl; page: Page }) {
  expect(await readStorageAccess(page)).toEqual({ reads: 0, writes: 0 });
  const stored = await storage.snapshot();
  for (const key of STORAGE_KEYS) expect(stored[key]).toBe(frozenProgress[key]);
  expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
}

test.describe('retrying', () => {
  test('recovers the start on the second request without reloading the page', async ({
    shell,
    lab,
    storage,
    context,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(FAILED_RESOURCE, 'the first content request');
    await failFirstThenContinue(page, (route) => route.abort());
    await storage.seed(frozenProgress);
    const contentRequests = trackContentRequests(page);
    await shell.goto(urls.exercise('rust-02', 'code'));
    await expect(shell.contentAlert).toContainText(PROGRESS_SAVED);
    await markDocument(page);
    await watchStorageAccess(context);

    await shell.retryButton.click();

    await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    await expect(shell.contentFailure).toHaveCount(0);
    expect(await documentWasReloaded(page)).toBe(false);
    expect(contentRequests).toHaveLength(2);
    const stored = await storage.snapshot();
    for (const key of STORAGE_KEYS) expect(stored[key]).toBe(frozenProgress[key]);
  });

  test('shows the error again when the second request fails too', async ({
    shell,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(FAILED_RESOURCE, 'both content requests');
    await page.route(CONTENT_URL, (route) => route.abort());
    const contentRequests = trackContentRequests(page);
    await shell.goto(urls.view('recorrido'));

    await shell.retryButton.click();

    await expect(shell.contentAlert).toContainText(PROGRESS_SAVED);
    await expect(shell.retryButton).toBeFocused();
    expect(contentRequests).toHaveLength(2);
  });
});

test.describe('the keyboard', () => {
  test('leaves the focus on «Reintentar» and Enter operates it', async ({
    shell,
    lab,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(FAILED_RESOURCE, 'the first content request');
    await failFirstThenContinue(page, (route) => route.abort());

    await shell.goto(urls.exercise('rust-02', 'code'));
    await expect(shell.retryButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
    await expect(shell.contentFailure).toHaveCount(0);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }

  test('opens a deep link', async ({ shell, lab, page }) => {
    await shell.goto(urls.exercise('rust-02', 'code'));

    await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
    await expectNoHorizontalOverflow(page);
  });

  test('shows the error inside the screen and retries with a tap', async ({
    shell,
    lab,
    pageIssues,
    page,
  }) => {
    pageIssues.expectIssue(FAILED_RESOURCE, 'the first content request');
    await failFirstThenContinue(page, (route) => route.abort());

    await shell.goto(urls.exercise('rust-02', 'code'));

    await expect(shell.contentAlert).toBeInViewport();
    await expect(shell.retryButton).toBeInViewport();
    await expect(shell.retryButton).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await shell.retryButton.click();
    await expect(lab.exerciseTitle()).toHaveText(curriculumIds.exercises['rust-02'].title);
  });
});
