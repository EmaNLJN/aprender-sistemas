import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { RUST_MODULES, RUST_STEPS, routeProgress } from '../lib/route-progress';
import { urls } from '../lib/urls';

const [FIRST, SECOND, THIRD] = RUST_STEPS;

test.describe('the steps of the route', () => {
  test('an empty browser shows the first step, the counters and only the first module open', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await expect(shell.heading('recorrido')).toBeVisible();
    await expect(route.nextStepLabel()).toHaveText('TU PRÓXIMO PASO · 01 / 12');
    await expect(route.nextStepTitle()).toHaveText(FIRST.title);
    await expect(route.completedCounter()).toHaveText('0 DE 12 COMPLETADOS');
    await expect(route.module(RUST_MODULES[0])).toHaveAttribute('open', '');
    await expect(route.moduleCount(RUST_MODULES[0])).toHaveText('0/3');
    for (const title of RUST_MODULES.slice(1)) {
      await expect(route.module(title)).not.toHaveAttribute('open');
    }
    await expect(route.sidebarCompleted()).toHaveText('0 de 12');
  });

  test('checking the first step updates the counters, the card and the sidebar with one write', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await route.stepCheckbox(FIRST.title).check();

    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(route.moduleCount(RUST_MODULES[0])).toHaveText('1/3');
    await expect(route.nextStepLabel()).toHaveText('TU PRÓXIMO PASO · 02 / 12');
    await expect(route.nextStepTitle()).toHaveText(SECOND.title);
    await expect(route.sidebarCompleted()).toHaveText('1 de 12');
    await expect(route.sidebarPercent()).toHaveText('8%');
    await expect(route.stepCheckbox(FIRST.title)).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(stored.completed).toEqual(['rust-first-session']);

    await page.reload();
    await expect(route.stepCheckbox(FIRST.title)).toBeChecked();
  });

  test('the frozen progress of master shows the Go route quietly and the Rust one after switching', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await expect(route.nextStepLabel()).toHaveText('TU PRÓXIMO PASO · 01 / 12');
    await expect(route.nextStepTitle()).toHaveText('Modificá tu primer ejemplo');
    expect(await storage.writes()).toEqual([]);
    await expect(shell.toast).toHaveText('');

    await shell.switchLanguage('rust');

    await expect(route.completedCounter()).toHaveText('2 DE 12 COMPLETADOS');
    await expect(route.nextStepLabel()).toHaveText('TU PRÓXIMO PASO · 03 / 12');
    await expect(route.nextStepTitle()).toHaveText(THIRD.title);
    await expect(shell.toast).toHaveText('Recorrido de Rust. Tu otro avance sigue guardado.');
  });

  test('with every step done the banner appears, the last module opens and the card leads to the project', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.seed({
      'taller-learning-v1': routeProgress({ completed: RUST_STEPS.map((step) => step.id) }),
    });
    await shell.goto(urls.view('recorrido'));

    await expect(route.completionBanner()).toBeVisible();
    await expect(route.nextStepLabel()).toHaveText('TU SIGUIENTE EXPERIMENTO');
    await expect(route.module(RUST_MODULES[3])).toHaveAttribute('open', '');
    await route.continueProject().click();

    await expect(page).toHaveURL(urls.view('proyecto'));
    await expect(shell.heading('proyecto')).toBeVisible();
  });

  test('a hash navigation away and back shows the saved progress and marks the menu', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed({ 'taller-learning-v1': routeProgress({ completed: [FIRST.id] }) });
    await shell.goto(urls.view('recorrido'));

    await shell.openFromMenu('biblioteca');
    await shell.openFromMenu('recorrido');

    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(route.stepCheckbox(FIRST.title)).toBeChecked();
    await expect(shell.menuLink('recorrido')).toHaveAttribute('aria-current', 'page');
  });

  test('the keyboard opens the modules, checks a step, opens a lesson and chooses a duration', async ({
    shell,
    route,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await route.moduleSummary(RUST_MODULES[1]).focus();
    await page.keyboard.press('Enter');
    await expect(route.module(RUST_MODULES[1])).toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(route.module(RUST_MODULES[1])).not.toHaveAttribute('open');

    await route.stepCheckbox(FIRST.title).focus();
    await page.keyboard.press('Space');
    await expect(route.stepCheckbox(FIRST.title)).toBeChecked();

    await route.stepTitle(SECOND.title).focus();
    await page.keyboard.press('Enter');
    await expect(route.lesson).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(route.lesson).toBeHidden();

    await route.duration(45).focus();
    await page.keyboard.press('Space');
    await expect(route.duration(45)).toHaveAttribute('aria-pressed', 'true');
  });

  test('the tab order of the page is the one of today', async ({ shell, route, page }) => {
    await shell.goto(urls.view('recorrido'));
    const order = [
      route.startSession(),
      route.duration(15),
      route.duration(25),
      route.duration(45),
      route.timerButton('Iniciar foco'),
      route.resetTimer(),
      route.moduleSummary(RUST_MODULES[0]),
      ...[FIRST, SECOND, THIRD].flatMap((step) => [
        route.stepCheckbox(step.title),
        route.stepTitle(step.title),
        route.stepOpen(step.title),
      ]),
      route.moduleSummary(RUST_MODULES[1]),
      route.moduleSummary(RUST_MODULES[2]),
      route.moduleSummary(RUST_MODULES[3]),
      route.libraryLink(),
    ];

    await route.focusMain();
    for (const element of order) {
      await page.keyboard.press('Tab');
      await expect(element).toBeFocused();
    }
  });

  test('printing hides the focus timer and keeps the next step', async ({ shell, route, page }) => {
    await shell.goto(urls.view('recorrido'));

    await page.emulateMedia({ media: 'print' });

    await expect(route.timer()).toBeHidden();
    await expect(route.nextStepTitle()).toBeVisible();
  });

  test('KNOWN DEFECT the code illustration has an aria-label without a role (spec F9, FR-040)', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await expect(route.codeArt()).toBeVisible();
    await expect(route.codeArt()).not.toHaveAttribute('role');
  });
});
