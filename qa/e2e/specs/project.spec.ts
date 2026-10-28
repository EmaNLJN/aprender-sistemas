import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { frozenProgress, routeMilestoneIds, type StorageKey } from '../lib/curriculum';
import { observeReload } from '../lib/document-marker';
import { urls } from '../lib/urls';

const ROUTE_KEY = 'taller-learning-v1' satisfies StorageKey;
const OTHER_KEYS: StorageKey[] = [
  'taller-laboratorio-v1',
  'taller-campaign-v1',
  'taller-systems-v1',
];
const TITLES = [
  'Un lugar para guardar cosas',
  'Tu programa entiende comandos',
  'Los datos sobreviven al reinicio',
  'Medir antes de optimizar',
  'Una conversación por TCP',
];
const HEADINGS = [
  '01. Un lugar para guardar cosas',
  '02. Tu programa entiende comandos',
  '03. Los datos sobreviven al reinicio',
  '04. Medir antes de optimizar',
  '05. Una conversación por TCP',
];
const TERMINAL = '> SET curiosidad encendida\nOK\n> GET curiosidad\nencendida\n> _';
const FIRST_HINT_RUST =
  'Definí primero el comportamiento esperado. Usá un mapa con claves y valores de texto. En Rust podés empezar con datos propios (String); explicá cada copia que hagas.';
const DROPPED_NOTICE =
  'Se descartó 1 registro del recorrido que esta versión no reconoce; se conservó una copia en taller-learning-v1:respaldo.';

function counterText(done: number): string {
  return `PROYECTO PERSONAL · ${done} / 5 HITOS`;
}

function routeProgress(language: 'rust' | 'go', milestones: string[]): string {
  return JSON.stringify({
    version: 1,
    language,
    completed: [],
    milestones,
    favorites: [],
    quizAnswers: {},
    notes: { rust: { learned: '', next: '' }, go: { learned: '', next: '' } },
    minutes: 25,
  });
}

async function storedMilestones(page: Page): Promise<string[]> {
  return page.evaluate((key) => {
    const text = localStorage.getItem(key);
    return text === null ? [] : (JSON.parse(text) as { milestones: string[] }).milestones;
  }, ROUTE_KEY);
}

test.describe('the milestones of the project', () => {
  test('lists the five milestones of Rust in order, with the counter at zero', async ({
    shell,
    project,
  }) => {
    await shell.goto(urls.view('proyecto'));

    await expect(project.intro).toHaveText(/^Un pequeño almacén clave-valor en Rust\. /);
    await expect(project.milestoneHeadings).toHaveText(HEADINGS);
    await expect(project.counter).toHaveText(counterText(0));
    await expect(project.terminal).toHaveJSProperty('textContent', TERMINAL);
    for (const title of TITLES) await expect(project.milestone(title)).not.toBeChecked();
  });

  test('lists the same five milestones in Go, with its introduction', async ({
    shell,
    project,
  }) => {
    await shell.goto(urls.view('proyecto'));
    await shell.switchLanguage('go');

    await expect(project.intro).toHaveText(/^Un pequeño almacén clave-valor en Go\. /);
    await expect(project.milestoneHeadings).toHaveText(HEADINGS);
    await expect(project.counter).toHaveText(counterText(0));
  });

  test('checking a milestone saves its id with one write and raises the counter', async ({
    shell,
    project,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('proyecto'));
    expect(await storage.writes()).toEqual([]);

    await project.milestone(TITLES[0]).click();

    await expect(project.milestone(TITLES[0])).toBeChecked();
    await expect(project.counter).toHaveText(counterText(1));
    expect(await storage.writes()).toEqual([`set ${ROUTE_KEY}`]);
    expect(await storedMilestones(page)).toEqual(['rust-memory']);
  });

  test('unchecking a milestone removes its id and lowers the counter', async ({
    shell,
    project,
    storage,
    page,
  }) => {
    await storage.seed({ [ROUTE_KEY]: routeProgress('rust', ['rust-memory', 'rust-files']) });
    await shell.goto(urls.view('proyecto'));
    await expect(project.counter).toHaveText(counterText(2));

    await project.milestone(TITLES[0]).click();

    await expect(project.milestone(TITLES[0])).not.toBeChecked();
    await expect(project.counter).toHaveText(counterText(1));
    expect(await storedMilestones(page)).toEqual(['rust-files']);
  });

  test('a checked milestone stays checked after a reload', async ({ shell, project, page }) => {
    await shell.goto(urls.view('proyecto'));
    await project.milestone(TITLES[2]).click();
    await expect(project.milestone(TITLES[2])).toBeChecked();

    await page.reload();

    await expect(project.milestone(TITLES[2])).toBeChecked();
    await expect(project.counter).toHaveText(counterText(1));
    expect(await storedMilestones(page)).toEqual(['rust-files']);
  });
});

test.describe('the keyboard', () => {
  test.use({ reducedMotion: 'reduce' });

  test('Space toggles the checkbox, keeps the focus and the scroll, and Tab goes to its hint', async ({
    shell,
    project,
    page,
  }) => {
    await shell.goto(urls.view('proyecto'));
    const last = project.milestone(TITLES[4]);
    await last.focus();
    const scroll = await page.evaluate(() => window.scrollY);

    await page.keyboard.press('Space');

    await expect(last).toBeChecked();
    await expect(last).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    await page.keyboard.press('Tab');
    await expect(project.hintToggle(TITLES[4])).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(project.libraryLink).toBeFocused();
  });

  test('Enter opens and closes «Necesito una pista»', async ({ shell, project, page }) => {
    await shell.goto(urls.view('proyecto'));
    await project.hintToggle(TITLES[1]).focus();

    await page.keyboard.press('Enter');
    await expect(project.hint(TITLES[1])).toHaveJSProperty('open', true);
    await expect(project.hintText(TITLES[1])).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(project.hint(TITLES[1])).toHaveJSProperty('open', false);
    await expect(project.hintText(TITLES[1])).toBeHidden();
  });
});

test.describe('the languages and the saved progress', () => {
  test('Rust and Go keep separate progress', async ({ shell, project, page }) => {
    await shell.goto(urls.view('proyecto'));
    await project.milestone(TITLES[0]).click();
    await expect(project.counter).toHaveText(counterText(1));

    await shell.switchLanguage('go');
    await expect(project.counter).toHaveText(counterText(0));
    await expect(project.milestone(TITLES[0])).not.toBeChecked();
    await project.milestone(TITLES[0]).click();
    await expect(project.milestone(TITLES[0])).toBeChecked();
    expect(await storedMilestones(page)).toEqual(['rust-memory', 'go-memory']);

    await shell.switchLanguage('rust');
    await expect(project.counter).toHaveText(counterText(1));
  });

  test('the frozen progress of master opens without writing: 0 / 5 in Go and 1 / 5 in Rust', async ({
    shell,
    project,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await storage.watchWrites();
    await shell.goto(urls.view('proyecto'));

    await expect(project.counter).toHaveText(counterText(0));
    for (const title of TITLES) await expect(project.milestone(title)).not.toBeChecked();
    expect(await storage.writes()).toEqual([]);
    const stored = await storage.snapshot();
    expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
    await expect(shell.toast).toHaveText('');

    await shell.switchLanguage('rust');
    await expect(project.counter).toHaveText(counterText(1));
    await expect(project.milestone(TITLES[0])).toBeChecked();
  });

  test('each of the ten milestones saves exactly the id of the shared fixture', async ({
    shell,
    project,
    storage,
    page,
  }) => {
    await storage.seed({
      'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'],
      'taller-campaign-v1': frozenProgress['taller-campaign-v1'],
      'taller-systems-v1': frozenProgress['taller-systems-v1'],
    });
    await shell.goto(urls.view('proyecto'));

    for (const [index, title] of TITLES.entries()) {
      await project.milestone(title).click();
      await expect(project.milestone(title)).toBeChecked();
      expect(await storedMilestones(page)).toEqual(routeMilestoneIds.slice(0, index + 1));
    }
    await shell.switchLanguage('go');
    for (const [index, title] of TITLES.entries()) {
      await project.milestone(title).click();
      await expect(project.milestone(title)).toBeChecked();
      expect(await storedMilestones(page)).toEqual(routeMilestoneIds.slice(0, 6 + index));
    }

    const stored = await storage.snapshot();
    for (const key of OTHER_KEYS) expect(stored[key]).toBe(frozenProgress[key]);
  });

  test('a milestone unchecked in Rust stays unchecked after switching to Go and back', async ({
    shell,
    project,
    storage,
    page,
  }) => {
    await storage.seed(frozenProgress);
    await shell.goto(urls.view('proyecto'));
    await shell.switchLanguage('rust');
    await expect(project.milestone(TITLES[0])).toBeChecked();

    await project.milestone(TITLES[0]).click();
    await expect(project.milestone(TITLES[0])).not.toBeChecked();
    await shell.switchLanguage('go');
    await expect(project.counter).toHaveText(counterText(0));
    await shell.switchLanguage('rust');

    await expect(project.milestone(TITLES[0])).not.toBeChecked();
    await expect(project.counter).toHaveText(counterText(0));
    expect(await storedMilestones(page)).toEqual([]);
  });

  test('a saved id that the catalog does not know is dropped at load and not counted', async ({
    shell,
    project,
    storage,
  }) => {
    await storage.seed({ [ROUTE_KEY]: routeProgress('go', ['go-memory', 'go-inexistente']) });
    await shell.goto(urls.view('proyecto'));

    await expect(project.counter).toHaveText(counterText(1));
    await expect(project.milestone(TITLES[0])).toBeChecked();
    await expect(shell.toast).toHaveText(DROPPED_NOTICE);
    expect(Object.keys(await storage.snapshot())).toContain(`${ROUTE_KEY}:respaldo`);
  });
});

test.describe('the storage that fails', () => {
  test('with the storage blocked, a milestone toggles in memory and the footer asks to export', async ({
    shell,
    project,
    storage,
  }) => {
    await storage.block();
    await shell.goto(urls.view('proyecto'));
    await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();

    await project.milestone(TITLES[1]).click();

    await expect(project.milestone(TITLES[1])).toBeChecked();
    await expect(project.counter).toHaveText(counterText(1));
    await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
  });

  test('when setItem fails mid-session, the footer changes on the first save', async ({
    shell,
    project,
    storage,
    page,
  }) => {
    await storage.blockWrites();
    await shell.goto(urls.view('proyecto'));
    await expect(shell.saveStatus('Guardado en este navegador')).toBeVisible();

    await project.milestone(TITLES[3]).click();

    await expect(project.milestone(TITLES[3])).toBeChecked();
    await expect(project.counter).toHaveText(counterText(1));
    await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
    expect(await storedMilestones(page)).toEqual([]);
  });
});

test.describe('the links and the history', () => {
  test('the link to the library opens it without reloading the document', async ({
    shell,
    project,
    page,
  }) => {
    await shell.goto(urls.view('proyecto'));

    const reloaded = await observeReload(page, () => project.libraryLink.click());

    expect(reloaded).toBe(false);
    await expect(shell.heading('biblioteca')).toBeVisible();
    await expect(page).toHaveURL(/#biblioteca$/);
  });

  test('going back to the project mounts it again from the saved progress, with its hints closed', async ({
    shell,
    project,
    page,
  }) => {
    await shell.goto(urls.view('proyecto'));
    await project.milestone(TITLES[0]).click();
    await expect(project.milestone(TITLES[0])).toBeChecked();
    await project.hintToggle(TITLES[2]).click();
    await expect(project.hint(TITLES[2])).toHaveJSProperty('open', true);

    await project.libraryLink.click();
    await expect(shell.heading('biblioteca')).toBeVisible();
    await page.goBack();

    await expect(shell.heading('proyecto')).toBeVisible();
    await expect(project.milestone(TITLES[0])).toBeChecked();
    await expect(project.hint(TITLES[2])).toHaveJSProperty('open', false);
  });
});

test.describe('the hints', () => {
  test('an open hint stays open and the focus stays on the checkbox when a milestone is checked (clarify Q3, X1)', async ({
    shell,
    project,
  }) => {
    await shell.goto(urls.view('proyecto'));
    await project.hintToggle(TITLES[1]).click();
    await expect(project.hint(TITLES[1])).toHaveJSProperty('open', true);

    await project.milestone(TITLES[0]).click();

    await expect(project.milestone(TITLES[0])).toBeChecked();
    await expect(project.milestone(TITLES[0])).toBeFocused();
    await expect(project.hint(TITLES[1])).toHaveJSProperty('open', true);
  });

  test('KNOWN DEFECT (spec 013, FR-015): the hint of the first milestone in Go names Rust', async ({
    shell,
    project,
  }) => {
    await shell.goto(urls.view('proyecto'));
    await project.hintToggle(TITLES[0]).click();
    await expect(project.hintText(TITLES[0])).toHaveText(FIRST_HINT_RUST);

    await shell.switchLanguage('go');
    await project.hintToggle(TITLES[0]).click();

    await expect(project.hintText(TITLES[0])).toHaveText(FIRST_HINT_RUST);
  });
});
