import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { observeReload } from '../lib/document-marker';
import { LAB_KEY, LAB_WRITE, SYNC_WRITES } from '../lib/lab-storage';
import { urls } from '../lib/urls';

// rust-01 is not a campaign mission nor a Systems core: no context block and no XP notice.
const RUST_01 = 'rust-01';
const EXPLANATION =
  'El punto y coma convierte esa expresión en sentencia. El bloque queda con valor (), incompatible con -> i32.';

interface CopiedWindow {
  __e2eCopied?: string[];
}

test.describe('the three phases', () => {
  test('the tabs move with the arrows, Home and End, without writing', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'learn'));
    await lab.tab('learn').focus();

    await page.keyboard.press('ArrowRight');
    await expect(lab.tab('code')).toBeFocused();
    await expect(lab.tab('code')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/\?ejercicio=rust-01&paso=code#laboratorio$/);

    await page.keyboard.press('End');
    await expect(lab.tab('reflect')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(lab.tab('learn')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(lab.tab('reflect')).toBeFocused();
    await expect(lab.tab('reflect')).toHaveAttribute('tabindex', '0');
    await expect(lab.tab('learn')).toHaveAttribute('tabindex', '-1');
    expect(await storage.writes()).toEqual([]);
  });

  test('the right prediction is pressed, explained and saved once', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'learn'));

    await lab.predictionOption('La función deja de devolver i32 y no compila').click();

    await expect(
      lab.predictionOption('La función deja de devolver i32 y no compila'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.predictionFeedback()).toContainText('Esa es la idea.');
    await expect(lab.predictionFeedback()).toContainText(EXPLANATION);
    expect(await storage.writes()).toEqual([LAB_WRITE, ...SYNC_WRITES]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01]).toMatchObject({ prediction: 1, predictionCorrect: true });
  });

  test('a wrong prediction is explained too', async ({ shell, lab, storage }) => {
    await shell.goto(urls.exercise(RUST_01, 'learn'));

    await lab.predictionOption('Devuelve 21 siempre').click();

    await expect(lab.predictionFeedback()).toContainText('Veamos qué cambia.');
    await expect(lab.predictionFeedback()).toContainText(EXPLANATION);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01]).toMatchObject({ prediction: 0 });
    expect(stored.records[RUST_01].predictionCorrect).toBeUndefined();
  });
});

test.describe('the editor', () => {
  test('each key saves, and the status, the preview and the live hint follow the draft', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await expect(lab.liveHint()).toHaveText(
      'Todavía hay una parte por completar. Pensá primero qué entra y qué debería salir.',
    );

    await lab.writeDraft('rust', 'fn energia(celdas: i32) -> i32 {\n    celdas * 7\n}');
    await page.keyboard.type('//');

    expect(await storage.writes()).toEqual([LAB_WRITE, LAB_WRITE, LAB_WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01].draft).toBe(
      'fn energia(celdas: i32) -> i32 {\n    celdas * 7\n}//',
    );
    await expect(lab.editorStatus()).toHaveText('Borrador guardado');
    await expect(lab.liveHint()).toHaveText(
      'No hace falta adivinar: proponé un cambio pequeño y comprobalo. println! muestra texto y devuelve (). Mostrar 21 no equivale a devolver 21.',
    );
    await lab.programPreviewToggle().click();
    await expect(lab.programPreview()).toContainText('celdas * 7\n}//');
    await expect(lab.programPreview()).toContainText('__TALLER_TEST__t1');

    await lab.editor('rust').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await expect(lab.liveHint()).toHaveText(
      'Volvé al código inicial para conservar las firmas que usan las pruebas.',
    );
    await lab.writeDraft('rust', 'fn main() {}');
    await expect(lab.liveHint()).toHaveText(
      'El taller ya agrega main. Mantené acá las funciones de la consigna.',
    );
  });

  test('Esc leaves the editor on «Ejecutar y revisar»', async ({ shell, lab, page }) => {
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.editor('rust').click();

    await page.keyboard.press('Escape');

    await expect(lab.runButton()).toBeFocused();
  });
});

test.describe('hints and the solution', () => {
  test('each hint saves once, shows in order and keeps the focus on the button, up to three', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));

    await lab.hintButton().click();
    await expect(lab.hints()).toHaveText(['PISTA 1El operador de multiplicación es *.']);
    await expect(lab.hintCounter()).toHaveText('1/3 pistas');
    await expect(lab.hintButton()).toHaveText('Otra pista');
    await expect(lab.hintButton()).toBeFocused();

    await lab.hintButton().click();
    await lab.hintButton().click();

    await expect(lab.hints()).toHaveText([
      'PISTA 1El operador de multiplicación es *.',
      'PISTA 2La expresión final debe tener tipo i32.',
      'PISTA 3Escribí celdas * 7 sin punto y coma al final.',
    ]);
    await expect(lab.hintCounter()).toHaveText('3/3 pistas');
    await expect(lab.hintButton()).toBeDisabled();
    expect(await storage.writes()).toEqual([LAB_WRITE, LAB_WRITE, LAB_WRITE]);
  });

  test('KNOWN DEFECT (spec 021, quirk 6): opening the solution writes every time', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));

    await lab.solutionToggle().click();
    await lab.solutionToggle().click();
    await lab.solutionToggle().click();

    expect(await storage.writes()).toEqual([LAB_WRITE, LAB_WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01]).toMatchObject({ solutionSeen: true, assisted: true });
  });

  test('loading the solution asks first, saves once and gives the focus to the editor', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.solutionToggle().click();
    await lab.loadSolutionButton().click();

    await expect(lab.confirmDialog()).toHaveAccessibleName('¿Cargar la solución de apoyo?');
    await expect(lab.confirmDialog()).toContainText(
      'Reemplazará tu borrador. Probá ejecutarla y cambiar una condición para comprobar que entendiste la idea.',
    );
    await lab.continueButton().click();

    await expect(lab.confirmDialog()).toBeHidden();
    await expect(lab.editor('rust')).toBeFocused();
    await expect(lab.editor('rust')).toContainText('celdas * 7');
    expect(await storage.writes()).toEqual([LAB_WRITE, LAB_WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01]).toMatchObject({
      draft: 'fn energia(celdas: i32) -> i32 {\n    celdas * 7\n}',
      assisted: true,
    });
  });

  test('«Conservar mi código» writes nothing and returns the focus to «Restaurar inicio»', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));

    await lab.restoreStarterButton().click();
    await expect(lab.confirmDialog()).toHaveAccessibleName('¿Volver al código inicial?');
    await lab.keepCodeButton().click();

    await expect(lab.confirmDialog()).toBeHidden();
    await expect(lab.restoreStarterButton()).toBeFocused();
    expect(await storage.writes()).toEqual([]);
  });

  test('restoring the starter saves it once and gives the focus to the editor', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.writeDraft('rust', 'borrador');

    await lab.restoreStarterButton().click();
    await expect(lab.confirmDialog()).toContainText(
      'Se reemplazará el borrador de este ejercicio. Tus resultados anteriores y notas se conservan.',
    );
    await lab.continueButton().click();

    await expect(lab.editor('rust')).toBeFocused();
    await expect(lab.editor('rust')).toContainText('todo!("calcular energía")');
    expect(await storage.writes()).toEqual([LAB_WRITE, LAB_WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01].draft).toBe(
      'fn energia(celdas: i32) -> i32 {\n    todo!("calcular energía")\n}',
    );
  });
});

test.describe('your own case', () => {
  test('«Inventar una variante» copies the test only once, focuses the field and says why', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.testCaseToggle('Reactor vacío').click();

    await lab.inventVariantButton('Reactor vacío').click();

    await expect(lab.customTestBox('rust')).toHaveValue('energia(0) == 0');
    await expect(lab.customTestBox('rust')).toBeFocused();
    expect(
      await lab
        .customTestBox('rust')
        .evaluate((box: HTMLTextAreaElement) => [box.selectionStart, box.selectionEnd]),
    ).toEqual([0, 'energia(0) == 0'.length]);
    await expect(shell.toast).toHaveText(
      'Cambiá una entrada o expectativa y ejecutá. Tu caso extra se revisa por separado.',
    );
    expect(await storage.writes()).toEqual([LAB_WRITE]);

    await lab.testCaseToggle('Tres celdas').click();
    await lab.inventVariantButton('Tres celdas').click();

    await expect(lab.customTestBox('rust')).toHaveValue('energia(0) == 0');
    await expect(shell.toast).toHaveText(
      'Conservé tu caso extra. Podés editarlo o borrarlo para partir de otra prueba.',
    );
    expect(await storage.writes()).toEqual([LAB_WRITE]);
  });
});

test.describe('copying the program', () => {
  test('copies the program of the preview, with its tests', async ({ shell, lab, page }) => {
    await page.addInitScript(() => {
      const copied: string[] = [];
      (window as CopiedWindow).__e2eCopied = copied;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text: string) => void copied.push(text) },
      });
    });
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.programPreviewToggle().click();
    const preview = await lab.programPreview().textContent();

    await lab.copyProgramButton().click();

    await expect(shell.toast).toHaveText('Código copiado. Incluye las pruebas.');
    const copied = await page.evaluate(() => (window as CopiedWindow).__e2eCopied);
    expect(copied).toEqual([preview]);
  });

  test('without the clipboard, copies with the selection and says so', async ({
    shell,
    lab,
    page,
  }) => {
    await page.addInitScript(() => {
      const copied: string[] = [];
      (window as CopiedWindow).__e2eCopied = copied;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => Promise.reject(new Error('denied')) },
      });
      document.execCommand = (command: string) => {
        if (command === 'copy') copied.push(String(document.getSelection()));
        return command === 'copy';
      };
    });
    await shell.goto(urls.exercise(RUST_01, 'code'));
    await lab.programPreviewToggle().click();
    const preview = await lab.programPreview().textContent();

    await lab.copyProgramButton().click();

    await expect(shell.toast).toHaveText('Código copiado.');
    const copied = await page.evaluate(() => (window as CopiedWindow).__e2eCopied);
    expect(copied).toEqual([preview]);
  });
});

test.describe('explaining', () => {
  test('KNOWN DEFECT (spec 021, quirk 3): the reflection has three status texts', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.seed({ [LAB_KEY]: frozenProgress[LAB_KEY] });
    await shell.goto(urls.exercise('rust-02', 'reflect'));
    await expect(lab.reflectionStatus()).toHaveText(
      'Explicación guardada. No la calificamos por longitud: contrastala con el razonamiento de abajo.',
    );

    await shell.goto(urls.exercise(RUST_01, 'reflect'));
    await expect(lab.reflectionStatus()).toHaveText(
      'Escribir tu razonamiento suma una oportunidad de recordar. Se guarda automáticamente.',
    );

    await lab.reflectionBox().fill('Mi primera idea');
    await expect(lab.reflectionStatus()).toHaveText(
      'Tu explicación está guardada. Contrastala con el razonamiento del revisor.',
    );
  });

  test('each key of the reflection saves', async ({ shell, lab, storage }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'reflect'));

    await lab.reflectionBox().pressSequentially('abc');

    expect(await storage.writes()).toEqual([LAB_WRITE, LAB_WRITE, LAB_WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01].reflection).toBe('abc');
  });

  test('a self-assessment schedules the review, saves once and announces it', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-10-06T12:00:00Z'));
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'reflect'));

    await lab.confidenceButton('Lo entiendo, quiero otra vuelta').click();

    await expect(lab.confidenceButton('Lo entiendo, quiero otra vuelta')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(lab.nextReview()).toHaveText(
      'Próximo repaso: 9 de octubre. No enviamos notificaciones.',
    );
    await expect(shell.toast).toHaveText('Repaso agendado en tu mapa de aprendizaje.');
    expect(await storage.writes()).toEqual([LAB_WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.records[RUST_01]).toMatchObject({
      confidence: 'practice',
      reviewedAt: Date.parse('2026-10-06T12:00:00Z'),
      reviewAt: Date.parse('2026-10-09T12:00:00Z'),
    });
  });

  test('without a passing result, «Explicá» invites to run the tests', async ({ shell, lab }) => {
    await shell.goto(urls.exercise(RUST_01, 'reflect'));

    await expect(lab.reflectStatus()).toHaveText(
      'Podés reflexionar en cualquier momento. Para verificar este código, volvé a Experimentá y ejecutá las pruebas.',
    );
  });
});

test.describe('the footer and the way back', () => {
  test('«Siguiente experimento →» opens the next exercise and saves it as selected', async ({
    shell,
    lab,
    storage,
    page,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.exercise(RUST_01, 'reflect'));
    await expect(lab.footerButton()).toHaveText('Siguiente experimento →');

    await lab.footerButton().click();

    await expect(lab.exerciseTitle()).toHaveText('Repará el contador inmutable');
    await expect(page).toHaveURL(/\?ejercicio=rust-02&paso=learn#laboratorio$/);
    expect(await storage.writes()).toEqual([LAB_WRITE]);
    const stored = JSON.parse((await storage.snapshot())[LAB_KEY]);
    expect(stored.selected.rust).toBe('rust-02');
  });

  test('the last exercise of the language goes back to the map', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('rust-137', 'reflect'));
    await expect(lab.footerButton()).toHaveText('Volver al mapa →');

    await lab.footerButton().click();

    await expect(shell.heading('laboratorio')).toBeVisible();
  });

  test('the core of a workshop goes back to the workshop with a full navigation', async ({
    shell,
    lab,
    page,
  }) => {
    await shell.goto('/?sistema=cache&ejercicio=rust-113&paso=reflect#laboratorio');
    await expect(lab.footerButton()).toHaveText('Volver al taller →');

    const reloaded = await observeReload(page, () => lab.footerButton().click());

    expect(reloaded).toBe(true);
    await expect(page).toHaveURL(/\?taller=cache&parte=build&lenguaje=rust#sistemas$/);
  });
});
