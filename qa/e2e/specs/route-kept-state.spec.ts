import { expect, test } from '../fixtures';
import { RUST_MODULES, RUST_STEPS, routeProgress } from '../lib/route-progress';
import { urls } from '../lib/urls';

const [FIRST, SECOND] = RUST_STEPS;

test.describe('what the page keeps because it is no longer rebuilt (X1 and Q4)', () => {
  test('a module opened by hand stays open when a step of another module is checked', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await route.moduleSummary(RUST_MODULES[1]).click();
    await expect(route.module(RUST_MODULES[1])).toHaveAttribute('open', '');

    await route.stepCheckbox(FIRST.title).check();

    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(route.module(RUST_MODULES[0])).toHaveAttribute('open', '');
    await expect(route.module(RUST_MODULES[1])).toHaveAttribute('open', '');
    await expect(route.module(RUST_MODULES[2])).not.toHaveAttribute('open');
    await expect(route.module(RUST_MODULES[3])).not.toHaveAttribute('open');
  });

  test('a module closed by hand stays closed when a step of another module is checked', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await route.moduleSummary(RUST_MODULES[1]).click();
    await route.moduleSummary(RUST_MODULES[0]).click();
    await expect(route.module(RUST_MODULES[0])).not.toHaveAttribute('open');

    await route.stepCheckbox(RUST_STEPS[3].title).check();

    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(route.module(RUST_MODULES[0])).not.toHaveAttribute('open');
    await expect(route.module(RUST_MODULES[1])).toHaveAttribute('open', '');
  });

  test('completing the lesson opened from the card returns the focus to the card button', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await route.startSession().click();
    await route.markDone().click();

    await expect(route.lesson).toBeHidden();
    await expect(route.nextStepTitle()).toHaveText(SECOND.title);
    await expect(route.startSession()).toBeFocused();
  });

  test('reopening a step that becomes the next one returns the focus to its title', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed({ 'taller-learning-v1': routeProgress({ completed: [FIRST.id] }) });
    await shell.goto(urls.view('recorrido'));

    await route.stepTitle(FIRST.title).click();
    await route.practiceAgain().click();

    await expect(route.lesson).toBeHidden();
    await expect(route.nextStepTitle()).toHaveText(FIRST.title);
    await expect(route.stepTitle(FIRST.title)).toBeFocused();
  });

  test('completing the last pending step from the card moves the focus to «Continuar mi proyecto»', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed({
      'taller-learning-v1': routeProgress({
        completed: RUST_STEPS.slice(0, 11).map((step) => step.id),
      }),
    });
    await shell.goto(urls.view('recorrido'));

    await route.startSession().click();
    await route.markDone().click();

    await expect(route.completionBanner()).toBeVisible();
    await expect(route.continueProject()).toBeFocused();
  });

  test('navigating back with the lesson open closes it', async ({ shell, route, page }) => {
    await shell.goto(urls.view('biblioteca'));
    await shell.openFromMenu('recorrido');
    await route.startSession().click();
    await expect(route.lesson).toBeVisible();

    await page.goBack();

    await expect(shell.heading('biblioteca')).toBeVisible();
    await expect(route.lesson).toBeHidden();
  });
});
