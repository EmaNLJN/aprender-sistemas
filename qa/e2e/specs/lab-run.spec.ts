import { expect, test } from '../fixtures';
import { RUST_01, type CompilerKind } from '../lib/compiler-results';
import { attemptsLine } from '../lib/lab-copy';
import { urls } from '../lib/urls';

const LAB_KEY = 'taller-laboratorio-v1';
const WRITE = `set ${LAB_KEY}`;
const SYNC_WRITES = ['set taller-systems-v1', 'set taller-campaign-v1'];
const SOLUTION = 'fn energia(celdas: i32) -> i32 {\n    celdas * 7\n}';

interface Review {
  heading: string;
  detail: string;
}

// The texts of lab.js (reviewHTML and diagnose) and of content/rust/exercises/rust-01/exercise.yaml.
const REVIEW: Record<Exclude<CompilerKind, 'transportError'>, Review> = {
  passed: {
    heading: 'La idea funciona en estos casos.',
    detail: 'La firma funciona como un contrato.',
  },
  failedTest: {
    heading: '2 de 3: encontramos algo para explorar.',
    detail: 'No agregues una energía fija al resultado.',
  },
  compileError: {
    heading: 'El programa nos dejó una pista.',
    detail:
      'Probá esto: Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
  },
};

async function storedRecord(storage: { snapshot(): Promise<Record<string, string>> }) {
  return JSON.parse((await storage.snapshot())[LAB_KEY]).records[RUST_01.id];
}

test.describe('a free exercise with the Rust Playground simulated', () => {
  for (const kind of ['passed', 'failedTest', 'compileError'] as const) {
    test(`${kind}: the review explains it and counts one attempt`, async ({
      shell,
      lab,
      compiler,
    }) => {
      await compiler.answer(RUST_01, kind);
      await shell.goto(urls.exercise(RUST_01.id, 'code'));

      await lab.runCode();

      await expect(lab.reviewHeading()).toHaveText(REVIEW[kind].heading);
      await expect(lab.review()).toContainText(REVIEW[kind].detail);
      await expect(lab.review()).toContainText(attemptsLine(1));
      expect(compiler.requests).toHaveLength(1);
    });
  }

  test('transportError: nothing is approved nor failed', async ({
    shell,
    lab,
    compiler,
    pageIssues,
  }) => {
    pageIssues.expectIssue(
      /Failed to load resource: net::ERR_FAILED/,
      'el doble aborta el pedido a propósito',
    );
    await compiler.answer(RUST_01, 'transportError');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText('No pude ejecutar esta vez.');
    await expect(lab.review()).toContainText(
      'Tu código sigue guardado. No se aprobaron ni desaprobaron pruebas sin ejecutarlas.',
    );
  });

  test('the first approval saves before and after, marks the review and is announced', async ({
    shell,
    lab,
    compiler,
    storage,
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-10-06T12:00:00Z'));
    await storage.watchWrites();
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.writeDraft('rust', SOLUTION);

    await lab.runCode();

    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);
    await expect(shell.toast).toHaveText(
      '¡Experimento resuelto! +20 puntos de práctica. Ahora explicá el porqué.',
    );
    await expect(lab.explainButton()).toBeVisible();
    expect(await storage.writes()).toEqual([WRITE, WRITE, WRITE, ...SYNC_WRITES]);
    expect(await storedRecord(storage)).toMatchObject({
      draft: SOLUTION,
      attempts: 1,
      solvedAt: Date.parse('2026-10-06T12:00:00Z'),
      reviewAt: Date.parse('2026-10-07T12:00:00Z'),
      result: {
        code: SOLUTION,
        success: true,
        transportError: false,
        tests: [
          { id: 't1', passed: true },
          { id: 't2', passed: true },
          { id: 't3', passed: true },
        ],
        customTest: '',
        customPassed: false,
      },
    });

    await lab.runCode();
    await expect(shell.toast).toHaveText('Estos casos siguen funcionando. Probá una variante.');
    await expect(lab.review()).toContainText(attemptsLine(2));
  });

  test('Ctrl/⌘ + Enter in the editor runs, and twice sends one request', async ({
    shell,
    lab,
    compiler,
    page,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.editor('rust').click();

    await page.keyboard.press('ControlOrMeta+Enter');
    await page.keyboard.press('ControlOrMeta+Enter');

    await expect(lab.runningButton()).toBeDisabled();
    await expect(lab.review()).toContainText('Ejecutando código real…');
    expect(compiler.requests).toHaveLength(1);
  });

  test('cancelling keeps the attempt, saves no result and says so', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await storage.watchWrites();
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await lab.cancelRunButton().click();

    await expect(shell.toast).toHaveText('Ejecución cancelada. Tu código sigue guardado.');
    await expect(lab.runButton()).toBeEnabled();
    await expect(lab.runButton()).toHaveText('▷ Ejecutar y revisar');
    expect(await storage.writes()).toEqual([WRITE]);
    const record = await storedRecord(storage);
    expect(record.attempts).toBe(1);
    expect(record.result).toBeUndefined();
  });

  test('changing the phase does not cancel: the result arrives in «Explicá» and in the review', async ({
    shell,
    lab,
    compiler,
  }) => {
    const release = await compiler.answerLater(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await lab.tab('reflect').click();
    release();

    await expect(lab.reflectStatus()).toContainText('Lo hiciste funcionar. Ahora hacelo tuyo.');
    await lab.tab('code').click();
    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);
  });

  test('opening another exercise cancels the run and saves no result', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await lab.nextButton().click();
    await lab.previousButton().click();
    await lab.tab('code').click();

    await expect(lab.runButton()).toBeEnabled();
    await expect(lab.reviewHeading()).toHaveText('¿Qué queremos comprobar?');
    expect((await storedRecord(storage)).result).toBeUndefined();
  });

  test('leaving the lab cancels the run and saves no result', async ({
    shell,
    lab,
    compiler,
    storage,
    page,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await shell.openFromMenu('atlas');
    await page.goBack();

    await expect(lab.runButton()).toBeEnabled();
    expect((await storedRecord(storage)).result).toBeUndefined();
  });

  test('a result goes stale when the code changes', async ({ shell, lab, compiler }) => {
    await compiler.answer(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);

    await lab.writeDraft('rust', SOLUTION + '\n');

    await expect(lab.reviewHeading()).toHaveText('El código cambió. Revisémoslo.');
  });

  test('your own case is sent trimmed and reviewed apart', async ({ shell, lab, compiler }) => {
    await compiler.answerWithCustom(RUST_01, 'passed', 'FAIL');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.customTestToggle().click();
    await lab.customTestBox('rust').fill('  energia(1) == 8  ');

    await lab.runCode();

    await expect(lab.review()).toContainText('Tu caso extra: encontró una diferencia ×');
    expect(JSON.parse(compiler.bodies[0]).code).toContain(
      'std::panic::catch_unwind(|| { energia(1) == 8 })',
    );
  });

  test('KNOWN DEFECT (spec 021, quirk 8): the attempts count cancelled runs and transport failures', async ({
    shell,
    lab,
    compiler,
    pageIssues,
  }) => {
    pageIssues.expectIssue(
      /Failed to load resource: net::ERR_FAILED/,
      'el doble aborta el pedido a propósito',
    );
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    await lab.cancelRunButton().click();
    await compiler.answer(RUST_01, 'transportError');
    await lab.runCode();
    await expect(lab.reviewHeading()).toHaveText('No pude ejecutar esta vez.');
    await compiler.answer(RUST_01, 'failedTest');

    await lab.runCode();

    await expect(lab.review()).toContainText(attemptsLine(3));
  });
});
