import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { RUST_STEPS, routeProgress } from '../lib/route-progress';
import { urls } from '../lib/urls';
import type { RoutePage } from '../pages/route';

const [FIRST, SECOND] = RUST_STEPS;
const RIGHT = 'Ese caso comprobó la propiedad expresada por el test.';
const WRONG = 'El programa es correcto para cualquier entrada.';
const EXPLANATION =
  'Un test verifica un caso y sus condiciones. Todavía pueden faltar entradas, propiedades y comportamientos por cubrir.';

const OPENERS = [
  { name: 'the card', locate: (route: RoutePage) => route.startSession() },
  { name: 'the step title', locate: (route: RoutePage) => route.stepTitle(FIRST.title) },
  { name: 'the arrow', locate: (route: RoutePage) => route.stepOpen(FIRST.title) },
];

const CLOSERS = [
  { name: '×', close: (route: RoutePage) => route.lessonClose().click() },
  { name: 'Seguir después', close: (route: RoutePage) => route.continueLater().click() },
  { name: 'Escape', close: (route: RoutePage, page: Page) => page.keyboard.press('Escape') },
];

test.describe('the lesson', () => {
  test('opened from the card it shows its content and focuses the close button', async ({
    shell,
    route,
    page,
  }) => {
    await shell.goto(urls.view('recorrido'));

    await route.startSession().click();

    await expect(page.getByRole('dialog', { name: FIRST.title })).toBeVisible();
    await expect(route.lessonLabel()).toHaveText('RUST · UNA SESIÓN ORIENTATIVA');
    await expect(
      route.lesson.getByText(
        'Arrancar con una victoria pequeña y aprender a leer el resultado de un test.',
      ),
    ).toBeVisible();
    await expect(route.lesson.getByRole('heading', { name: 'Tu desafío' })).toBeVisible();
    await expect(route.lesson.getByText('LO LOGRASTE CUANDO')).toBeVisible();
    await expect(route.lessonResources()).toHaveText([
      '100 Exercises to Learn Rust ↗',
      '100 Exercises en RustRover ↗',
    ]);
    for (const link of await route.lessonResources().all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await expect(
      route.lesson.getByRole('heading', {
        name: 'Antes de seguir: Un test acaba de pasar. ¿Qué conclusión está justificada?',
      }),
    ).toBeVisible();
    await expect(route.quizOption(WRONG)).toHaveAttribute('aria-pressed', 'false');
    await expect(route.quizOption(RIGHT)).toHaveAttribute('aria-pressed', 'false');
    await expect(
      route.quizOption('La implementación ya es la más rápida posible.'),
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(route.quizFeedback()).toBeHidden();
    await expect(route.markDone()).toBeVisible();
    await expect(route.lessonClose()).toBeFocused();
  });

  test('answering B marks it, explains it and writes once; answering A asks to review', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));
    await route.startSession().click();

    await route.quizOption(RIGHT).click();

    await expect(route.quizOption(RIGHT)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.quizFeedback()).toHaveText(`Bien pensado. ${EXPLANATION}`);
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(stored.quizAnswers).toEqual({ 'rust-first-session': 1 });

    await route.quizOption(WRONG).click();

    await expect(route.quizOption(WRONG)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.quizOption(RIGHT)).toHaveAttribute('aria-pressed', 'false');
    await expect(route.quizFeedback()).toHaveText(`Revisemos la idea. ${EXPLANATION}`);
  });

  test('with the frozen progress in Rust the answered and completed lesson opens as it was left', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed(frozenProgress);
    await shell.goto(urls.view('recorrido'));
    await shell.switchLanguage('rust');

    await route.stepTitle(FIRST.title).click();

    await expect(route.quizOption(RIGHT)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.quizFeedback()).toHaveText(`Bien pensado. ${EXPLANATION}`);
    await expect(route.practiceAgain()).toBeVisible();
  });

  for (const opener of OPENERS) {
    for (const closer of CLOSERS) {
      test(`closed with ${closer.name} after opening it from ${opener.name}, the focus goes back without scrolling or writing`, async ({
        shell,
        route,
        storage,
        page,
      }) => {
        await storage.watchWrites();
        await shell.goto(urls.view('recorrido'));
        const button = opener.locate(route);
        await button.scrollIntoViewIfNeeded();
        const scroll = await route.scrollY();

        await button.click();
        await expect(route.lesson).toBeVisible();
        await closer.close(route, page);

        await expect(route.lesson).toBeHidden();
        await expect(button).toBeFocused();
        expect(await route.scrollY()).toBe(scroll);
        expect(await storage.writes()).toEqual([]);
      });
    }
  }

  test('a click on the backdrop does not close it', async ({ shell, route, page }) => {
    await shell.goto(urls.view('recorrido'));
    await route.startSession().click();

    await page.mouse.click(5, 5);

    await expect(route.lesson).toBeVisible();
  });

  test('completing a step opened from its title writes once, announces it and keeps the focus on the title', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await route.stepTitle(SECOND.title).click();
    await route.markDone().click();

    await expect(route.lesson).toBeHidden();
    await expect(route.stepCheckbox(SECOND.title)).toBeChecked();
    await expect(shell.toast).toHaveText('Un paso más. Dejá una nota para tu próxima sesión.');
    await expect(route.nextStepTitle()).toHaveText(FIRST.title);
    await expect(route.stepTitle(SECOND.title)).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
  });

  test('KNOWN DEFECT «Volver a practicar» reviews nothing: it marks the step pending (spec F9, FR-035)', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.seed({ 'taller-learning-v1': routeProgress({ completed: [SECOND.id] }) });
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await route.stepTitle(SECOND.title).click();
    await route.practiceAgain().click();

    await expect(route.lesson).toBeHidden();
    await expect(route.stepCheckbox(SECOND.title)).not.toBeChecked();
    await expect(shell.toast).toHaveText('Paso disponible para volver a practicar.');
    await expect(route.stepTitle(SECOND.title)).toBeFocused();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(stored.completed).toEqual([]);
  });

  test('Tab and Shift+Tab keep the focus inside the lesson', async ({ shell, route, page }) => {
    await shell.goto(urls.view('recorrido'));
    await route.startSession().click();

    for (let press = 0; press < 10; press++) {
      await page.keyboard.press('Tab');
      expect(await route.focusIsInsideLessonOrNowhere()).toBe(true);
    }
    for (let press = 0; press < 10; press++) {
      await page.keyboard.press('Shift+Tab');
      expect(await route.focusIsInsideLessonOrNowhere()).toBe(true);
    }
  });
});
