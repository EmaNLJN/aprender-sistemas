import { expect, test } from '../fixtures';
import { frozenProgress, type StorageKey } from '../lib/curriculum';
import { ROUTE_KEYS, RUST_STEPS } from '../lib/route-progress';
import { urls } from '../lib/urls';

const [FIRST] = RUST_STEPS;
const RIGHT = 'Ese caso comprobó la propiedad expresada por el test.';

test.describe('what the route saves', () => {
  test('the frozen progress writes nothing while the timer runs and a lesson opens and closes', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.seed(frozenProgress);
    await storage.watchWrites();
    await page.clock.install({ time: new Date('2026-10-05T12:00:00-03:00') });
    await page.clock.pauseAt(new Date('2026-10-05T12:00:01-03:00'));
    await shell.goto(urls.view('recorrido'));

    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(5_000);
    await route.timerButton('Pausar').click();
    await route.stepTitle('Modificá tu primer ejemplo').click();
    await route.continueLater().click();

    expect(await storage.writes()).toEqual([]);
    const stored = await storage.snapshot();
    for (const key of Object.keys(frozenProgress) as StorageKey[]) {
      expect(stored[key]).toBe(frozenProgress[key]);
    }
    expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
    await expect(shell.toast).toHaveText('');
  });

  test('each action of the student writes the route once, with the keys of today', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));
    const actions = [
      () => route.stepCheckbox(FIRST.title).check(),
      () => route.stepCheckbox(FIRST.title).uncheck(),
      () => route.duration(45).click(),
      () => route.duration(45).click(),
      async () => {
        await route.stepTitle(FIRST.title).click();
        await route.quizOption(RIGHT).click();
      },
      () => route.markDone().click(),
      async () => {
        await route.stepTitle(FIRST.title).click();
        await route.practiceAgain().click();
      },
    ];

    for (const [index, act] of actions.entries()) {
      await act();
      await expect.poll(async () => (await storage.writes()).length).toBe(index + 1);
    }

    expect(new Set(await storage.writes())).toEqual(new Set(['set taller-learning-v1']));
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(Object.keys(stored)).toEqual(ROUTE_KEYS);
    expect(stored.completed).toEqual([]);
    expect(stored.quizAnswers).toEqual({ 'rust-first-session': 1 });
    expect(stored.minutes).toBe(45);

    await page.reload();
    await expect(route.stepCheckbox(FIRST.title)).not.toBeChecked();
    await expect(route.duration(45)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.timer()).toHaveText('45:00');
  });

  test('with the storage blocked the route works and the footer asks to export', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.block();
    await shell.goto(urls.view('recorrido'));
    await expect(shell.toast).toHaveText(
      'No se pudo leer o guardar el avance. Podés exportarlo al terminar.',
    );

    await route.stepCheckbox(FIRST.title).check();

    await expect(route.stepCheckbox(FIRST.title)).toBeChecked();
    await expect(route.completedCounter()).toHaveText('1 DE 12 COMPLETADOS');
    await expect(shell.saveStatus('Exportá para conservar tu avance')).toBeVisible();
  });

  test('a step checked on the page travels in the export with the shape of today', async ({
    shell,
    route,
  }) => {
    await shell.goto(urls.view('recorrido'));
    await route.stepCheckbox(FIRST.title).check();

    const exported = await route.exportProgress();

    expect(Object.keys(exported)).toEqual([
      ...ROUTE_KEYS,
      'lab',
      'campaign',
      'systems',
      'exportedAt',
    ]);
    expect(exported.completed).toEqual(['rust-first-session']);
  });
});
