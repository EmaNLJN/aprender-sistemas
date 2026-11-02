import { expect, test } from '../fixtures';
import { PLAYGROUND_ENDPOINT, RUST_01, RUST_02, type CompilerKind } from '../lib/compiler-results';
import { attemptsLine } from '../lib/lab-copy';
import { LAB_KEY, LAB_WRITE, SYNC_WRITES } from '../lib/lab-storage';
import { urls } from '../lib/urls';

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

async function storedRecord(
  storage: { snapshot(): Promise<Record<string, string>> },
  id: string = RUST_01.id,
) {
  return JSON.parse((await storage.snapshot())[LAB_KEY]).records[id];
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
    storage,
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
    const record = await storedRecord(storage);
    expect(record.result).toMatchObject({ success: false, transportError: true });
    expect(record.solvedAt).toBeUndefined();
  });

  test('the first approval saves before and after, marks the review and is announced, and later runs keep it (F7-Q1)', async ({
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
    expect(await storage.writes()).toEqual([LAB_WRITE, LAB_WRITE, LAB_WRITE, ...SYNC_WRITES]);
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

    await page.clock.setFixedTime(new Date('2026-10-06T13:00:00Z'));
    await lab.runCode();
    await expect(shell.toast).toHaveText('Estos casos siguen funcionando. Probá una variante.');
    await expect(lab.review()).toContainText(attemptsLine(2));
    await compiler.answer(RUST_01, 'failedTest');
    await lab.runCode();
    await expect(lab.reviewHeading()).toHaveText(REVIEW.failedTest.heading);
    expect(await storedRecord(storage)).toMatchObject({
      solvedAt: Date.parse('2026-10-06T12:00:00Z'),
      reviewAt: Date.parse('2026-10-07T12:00:00Z'),
    });
  });

  test('Ctrl/⌘ + Enter in the editor runs, and twice sends one request and counts one attempt', async ({
    shell,
    lab,
    compiler,
    page,
  }) => {
    const release = await compiler.answerLater(RUST_01, 'passed');
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.editor('rust').click();

    await page.keyboard.press('ControlOrMeta+Enter');
    await page.keyboard.press('ControlOrMeta+Enter');

    await expect(lab.runningButton()).toBeDisabled();
    await expect(lab.review()).toContainText('Ejecutando código real…');
    release();
    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);
    await expect(lab.review()).toContainText(attemptsLine(1));
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
    expect(await storage.writes()).toEqual([LAB_WRITE]);
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

  test('the next and the previous exercise each cancel the run and save no result', async ({
    shell,
    lab,
    compiler,
    storage,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();

    await lab.nextButton().click();
    await lab.tab('code').click();
    await lab.runCode();
    await expect(lab.review()).toContainText('Ejecutando código real…');
    await lab.previousButton().click();
    await lab.tab('code').click();
    await expect(lab.reviewHeading()).toHaveText('¿Qué queremos comprobar?');
    await lab.runCode();

    await expect(lab.review()).toContainText('Ejecutando código real…');
    expect((await storedRecord(storage, RUST_01.id)).result).toBeUndefined();
    expect((await storedRecord(storage, RUST_02.id)).result).toBeUndefined();
  });

  test('going back to the map cancels the run and saves no result', async ({
    shell,
    lab,
    compiler,
    storage,
    page,
  }) => {
    await compiler.hold(RUST_01);
    await shell.goto(urls.exercise(RUST_01.id, 'code'));
    await lab.runCode();
    const aborted = page.waitForEvent(
      'requestfailed',
      (request) => request.url() === PLAYGROUND_ENDPOINT.rust,
    );

    await lab.backButton().click();

    expect((await aborted).failure()?.errorText).toBe('net::ERR_ABORTED');
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
    await lab.writeDraft('rust', SOLUTION);
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

    await expect(lab.reviewHeading()).toHaveText(REVIEW.passed.heading);
    await expect(lab.review()).toContainText('Tu caso extra: encontró una diferencia ×');
    expect(JSON.parse(compiler.bodies[0]).code).toContain(
      'std::panic::catch_unwind(|| { energia(1) == 8 })',
    );
  });

  test('KNOWN DEFECT (spec 021, rareza 8): the attempts count cancelled runs and transport failures', async ({
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
