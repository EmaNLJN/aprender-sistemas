import { expect, test } from '../fixtures';
import { curriculumIds, frozenProgress } from '../lib/curriculum';
import { urls } from '../lib/urls';

const title = (exerciseId: string) => curriculumIds.exercises[exerciseId].title;

test.describe('the lab inside a campaign mission', () => {
  test('shows the context block with the way back to the world', async ({ shell, lab }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-02'));

    await expect(lab.contextBlock()).toContainText('0/30 XP · Entrenamiento');
    await expect(lab.contextBlock()).toContainText('○ Pruebas ○ Predicción');
    await expect(lab.contextBackLink()).toHaveText('← Estación del robot');
    await expect(lab.contextBackLink()).toHaveAttribute(
      'href',
      urls.world('rust-world-1').slice(1),
    );
    await expect(lab.backButton()).toHaveText('← Volver al mapa');
  });

  test('walks the six missions of the world, not the 137 exercises', async ({ shell, lab }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-02'));
    await expect(lab.position()).toHaveText('1 / 6');
    await expect(lab.previousButton()).toBeDisabled();

    await lab.nextButton().click();

    await expect(lab.position()).toHaveText('2 / 6');
    await expect(lab.exerciseTitle()).toHaveText(title('rust-06'));
    await expect(lab.contextBlock()).toBeVisible();
  });

  test('a mission that is not open yet is replaced by the lock', async ({ shell, lab }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-103'));

    await expect(lab.campaignLockHeading()).toBeVisible();
    await expect(lab.campaignLockMapLink()).toHaveAttribute(
      'href',
      urls.world('rust-world-1').slice(1),
    );
    await expect(lab.runButton()).toHaveCount(0);
    await expect(lab.contextBlock()).toHaveCount(0);
  });

  test('a mission of a locked world is replaced by the lock', async ({ shell, lab, page }) => {
    await shell.goto(urls.campaignMission('rust-world-2', 'rust-18'));

    await expect(lab.campaignLockHeading()).toBeVisible();
    await expect(page.getByText('Completá «Estación del robot»', { exact: false })).toBeVisible();
  });

  test('with the real progress of master, a mission of world 2 is open', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.seed(frozenProgress);

    await shell.goto(urls.campaignMission('rust-world-2', 'rust-18'));

    await expect(lab.exerciseTitle()).toHaveText(title('rust-18'));
    await expect(lab.contextBackLink()).toHaveText('← Puerto de señales');
    await expect(lab.campaignLockHeading()).toHaveCount(0);
  });
});

test.describe('the lab inside a Systems workshop', () => {
  test('shows the context block of the core with the way back to the workshop', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.systemsCode('cache', 'rust-113'));

    await expect(lab.contextBlock()).toContainText('Núcleo del taller');
    await expect(lab.contextBlock()).toContainText('Tres pruebas para verificar el núcleo');
    await expect(lab.contextBackLink()).toHaveText('← Una caché que aprende tus visitas');
    await expect(lab.contextBackLink()).toHaveAttribute(
      'href',
      '?taller=cache&parte=build&lenguaje=rust#sistemas',
    );
    await expect(lab.backButton()).toHaveText('← Volver al taller');
  });

  test('walks the tools of the workshop and its core', async ({ shell, lab }) => {
    await shell.goto(urls.systemsCode('cache', 'rust-31'));

    await expect(lab.contextBlock()).toContainText('Herramienta previa');
    await expect(lab.position()).toHaveText('1 / 3');
    await lab.nextButton().click();
    await lab.nextButton().click();
    await expect(lab.position()).toHaveText('3 / 3');
    await expect(lab.exerciseTitle()).toHaveText(title('rust-113'));
    await expect(lab.nextButton()).toBeDisabled();
  });
});

test.describe('campaign and Systems together', () => {
  test('Systems wins when the exercise belongs to both', async ({ shell, lab }) => {
    // rust-22 is a mission of rust-world-1 and a tool of the "transforms" workshop.
    await shell.goto(
      '/?campana=rust-world-1&sistema=transforms&ejercicio=rust-22&paso=code#laboratorio',
    );

    await expect(lab.contextBlock()).toContainText('Herramienta previa');
    await expect(lab.contextBackLink()).toHaveText('← Coreografía de matrices');
    await expect(lab.position()).toHaveText('2 / 4');
    await expect(lab.backButton()).toHaveText('← Volver al taller');
  });

  test('KNOWN DEFECT (legacy-map §3.2): the campaign lock comes first when the exercise is not a mission of that world', async ({
    shell,
    lab,
  }) => {
    await shell.goto(
      '/?campana=rust-world-1&sistema=cache&ejercicio=rust-113&paso=code#laboratorio',
    );

    await expect(lab.campaignLockHeading()).toBeVisible();
    await expect(lab.contextBlock()).toHaveCount(0);
  });
});
