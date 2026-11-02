import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

const FINISHED = 'Terminó tu rato de foco. Anotá qué entendiste y por dónde seguir.';
const FROZEN_EXPORT = readFileSync(
  resolve(import.meta.dirname, '../../fixtures/progress-master-2a278ad-export.json'),
  'utf8',
);

async function pauseTheClock(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-10-05T12:00:00-03:00') });
  await page.clock.pauseAt(new Date('2026-10-05T12:00:01-03:00'));
}

test.describe('the focus timer', () => {
  test('an empty browser rests at 25:00 and choosing 45 min writes once and leaves it stopped', async ({
    shell,
    route,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('recorrido'));

    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    await expect(route.duration(25)).toHaveAttribute('aria-pressed', 'true');

    await route.duration(45).click();

    await expect(route.timer()).toHaveText('45:00');
    await expect(route.duration(45)).toHaveAttribute('aria-pressed', 'true');
    await expect(route.duration(25)).toHaveAttribute('aria-pressed', 'false');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
    const stored = JSON.parse((await storage.snapshot())['taller-learning-v1'] ?? '{}');
    expect(stored.minutes).toBe(45);
  });

  test('it counts once per second from the start, pauses, continues and resets without writing', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));

    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(999);
    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Pausar')).toBeVisible();
    await page.clock.runFor(1);
    await expect(route.timer()).toHaveText('24:59');
    await page.clock.runFor(59_000);
    await expect(route.timer()).toHaveText('24:00');

    await route.timerButton('Pausar').click();
    await expect(route.timerButton('Continuar')).toBeVisible();
    await page.clock.runFor(120_000);
    await expect(route.timer()).toHaveText('24:00');

    await route.timerButton('Continuar').click();
    await page.clock.runFor(60_000);
    await expect(route.timer()).toHaveText('23:00');

    await route.resetTimer().click();
    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    expect(await storage.writes()).toEqual([]);
  });

  test('a double click on «Iniciar foco» starts and pauses', async ({ shell, route, page }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));

    await route.timerButton('Iniciar foco').dblclick();
    await page.clock.runFor(60_000);

    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
  });

  test('it keeps running across a hash navigation', async ({ shell, route, page }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await shell.openFromMenu('biblioteca');
    await page.clock.runFor(60_000);
    await shell.openFromMenu('recorrido');

    await expect(route.timer()).toHaveText('23:00');
    await expect(route.timerButton('Pausar')).toBeVisible();
  });

  test('the end is announced once in #toast from another view and the route then reads 00:00', async ({
    shell,
    route,
    page,
  }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await shell.openFromMenu('biblioteca');

    await page.clock.runFor('25:00');
    await expect(shell.toast).toHaveText(FINISHED);
    await expect(shell.toast).toHaveClass(/visible/);
    await page.clock.runFor(5_000);
    await expect(shell.toast).not.toHaveClass(/visible/);
    await page.clock.runFor(60_000);
    await expect(shell.toast).not.toHaveClass(/visible/);

    await shell.openFromMenu('recorrido');
    await expect(route.timer()).toHaveText('00:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
  });

  test('switching the language keeps it running', async ({ shell, route, page }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await shell.switchLanguage('go');
    await expect(shell.toast).toHaveText('Recorrido de Go. Tu otro avance sigue guardado.');
    await page.clock.runFor(60_000);

    await expect(route.timer()).toHaveText('23:00');
    await expect(route.timerButton('Pausar')).toBeVisible();
  });

  test('importing a copy keeps it running', async ({ shell, route, method, page }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await shell.openFromMenu('metodo');
    await method.importCopy(FROZEN_EXPORT);
    await expect(shell.toast).toHaveText('Copia importada y combinada con tu avance actual.');
    await page.clock.runFor(60_000);
    await shell.openFromMenu('recorrido');

    await expect(route.timer()).toHaveText('23:00');
    await expect(route.timerButton('Pausar')).toBeVisible();
  });

  test('«Borrar todo» stops it and goes back to the 25 minutes of a blank route', async ({
    shell,
    route,
    method,
    page,
  }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.duration(45).click();
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await shell.openFromMenu('metodo');
    await method.resetAllProgress();
    await expect(shell.toast).toHaveText('Progreso reiniciado. Un nuevo comienzo.');
    await shell.openFromMenu('recorrido');

    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    await expect(route.duration(25)).toHaveAttribute('aria-pressed', 'true');
  });

  test('«Borrar todo» straight from #metodo works with a timer that was never shown', async ({
    shell,
    route,
    method,
  }) => {
    await shell.goto(urls.view('metodo'));

    await method.resetAllProgress();
    await expect(shell.toast).toHaveText('Progreso reiniciado. Un nuevo comienzo.');
    await shell.openFromMenu('recorrido');

    await expect(route.timer()).toHaveText('25:00');
  });

  test('KNOWN DEFECT choosing the duration already chosen writes again and restarts the running timer (spec F9, FR-020 and FR-028)', async ({
    shell,
    route,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(60_000);

    await route.duration(25).click();

    await expect(route.timer()).toHaveText('25:00');
    await expect(route.timerButton('Iniciar foco')).toBeVisible();
    expect(await storage.writes()).toEqual(['set taller-learning-v1']);
  });

  test('KNOWN DEFECT the end of the focus time is announced over an open lesson (spec F9, FR-029)', async ({
    shell,
    route,
    page,
  }) => {
    await pauseTheClock(page);
    await shell.goto(urls.view('recorrido'));
    await route.timerButton('Iniciar foco').click();
    await page.clock.runFor(1_499_000);
    await route.startSession().click();

    await page.clock.runFor(1_000);

    await expect(shell.toast).toHaveText(FINISHED);
    await expect(route.lesson).toBeVisible();
  });
});
