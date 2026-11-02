import { expect, test } from '../fixtures';
import { urls } from '../lib/urls';

test.describe('the mission explorers', () => {
  test('robot (rust-103): a move into the wall keeps the state, explains why and keeps the focus', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-103', 'learn'));
    await expect(
      lab
        .questExplorer()
        .getByText('Modelo conceptual · No ejecuta el código del editor ni acredita la misión.', {
          exact: true,
        }),
    ).toBeVisible();
    await lab.robotHistoryToggle().click();

    await lab.explorerButton('Ir al oeste: restar uno a x').click();

    await expect(lab.questStatus()).toHaveText(
      'Intento 1. O → choque; seguís en (0,0), batería 4. La propuesta (-1,0) cruza el borde. Se rechaza antes de gastar: el estado se conserva.',
    );
    await expect(lab.questExplorer().getByRole('meter')).toHaveAccessibleName(
      'Batería restante: 4 de 4',
    );
    await expect(lab.explorerButton('Ir al oeste: restar uno a x')).toBeFocused();
    await expect(lab.robotHistory()).not.toHaveAttribute('open');
  });

  test('packet (rust-106): a wrong length is rejected', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('rust-106', 'learn'));

    await lab.explorerButton('Alternar b0 de la longitud').click();

    await expect(lab.packetVerdict()).toHaveText(
      'Rechazado: declara 2 bytes, pero llegaron 3.Orden de validación: mínimo → versión → largo exacto → checksum.',
    );
    await expect(lab.questStatus()).toHaveText(
      'Se alternó el bit de menor peso de la longitud declarada. La cantidad real de payload no cambió; el receptor compara ambas.',
    );
    await expect(lab.explorerButton('Alternar b0 de la longitud')).toBeFocused();
  });

  test('packet (go-106): an altered byte is rejected by the CRC', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('go-106', 'learn'));

    await lab.explorerButton('Alternar b0 del primer byte').click();

    await expect(lab.packetVerdict()).toHaveText(
      'Rechazado: la comprobación recibida no coincide con la calculada.Orden de validación: mínimo → marca → largo exacto → CRC.',
    );
    await expect(lab.questStatus()).toHaveText(
      'Se alternó el bit 0 del primer byte recibido. La comprobación enviada se conserva: ahora el receptor puede detectar esa alteración.',
    );
    await expect(lab.explorerButton('Alternar b0 del primer byte')).toBeFocused();
  });

  test('opening another exercise empties the state of every mission explorer', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-103', 'learn'));
    await lab.explorerButton('Ir al oeste: restar uno a x').click();

    await lab.previousButton().click();
    await lab.nextButton().click();

    await expect(lab.questStatus()).toHaveText(
      'Partís de (0,0). Probá O para observar un choque; después buscá la baliza (2,2).',
    );
  });
});

test.describe('the lab explorers', () => {
  test('channel (rust-46): the producer waits without a buffer and the focus moves to the consumer', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-46', 'learn'));

    await lab.explorerButton('Paso del productor →').click();

    await expect(lab.labExplorerStatus()).toHaveText(
      'El productor espera: sin buffer no puede completar el envío hasta que aparezca una recepción.0 mensajes entregados.',
    );
    await expect(lab.explorerButton('Paso del productor →')).toBeDisabled();
    await expect(lab.explorerButton('Paso del consumidor →')).toBeFocused();
  });

  test('generic (rust-36): a struct without derives does not meet the contract', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-36', 'learn'));

    await lab.explorerSelect('Le pasás').selectOption('record');

    await expect(
      lab.labExplorer().getByText('Falta cumplir el contrato ×', { exact: true }),
    ).toBeVisible();
    await expect(lab.labExplorerStatus()).toHaveText(
      'Un struct no implementa automáticamente Ord, Eq o Display. Necesitás implementar el trait o derivarlo si ese trait lo admite y sus campos cumplen las restricciones.',
    );
    await expect(lab.explorerSelect('Le pasás')).toBeFocused();
  });

  test('pointer (rust-51): changing the copy leaves the original', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('rust-51', 'learn'));
    await expect(lab.labExplorer()).toContainText(
      'Es un modelo conceptual, no una inspección de memoria real.',
    );

    await lab.explorerButton('Modificar copia +1').click();

    await expect(lab.labExplorerStatus()).toHaveText(
      'Cambió la celda B. El original conserva su valor porque copiar un entero crea otro valor independiente.',
    );
    await expect(lab.explorerButton('Modificar copia +1')).toBeFocused();
  });

  test('ownership (rust-05): moving leaves the origin unusable', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('rust-05', 'learn'));
    await expect(
      lab
        .labExplorer()
        .getByText(
          'Modelo conceptual: un String llamado origen. Probá cada operación y mirá quién puede usar sus datos.',
          { exact: true },
        ),
    ).toBeVisible();

    await lab.explorerButton('Mover').click();

    await expect(lab.explorerButton('Mover')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.labExplorerStatus()).toHaveText(
      'destino pasa a poseer el String. origen ya no puede usarse. Se transfiere la propiedad; no se duplica el contenido del String.',
    );
    await expect(lab.explorerButton('Mover')).toBeFocused();
  });

  test('slices (go-11): an independent copy stops sharing the array', async ({ shell, lab }) => {
    await shell.goto(urls.exercise('go-11', 'learn'));
    await expect(
      lab
        .labExplorer()
        .getByText(
          'Modelo conceptual: vista := original[1:]. Cambiá un valor o hacé una copia independiente antes de modificarlo.',
          { exact: true },
        ),
    ).toBeVisible();

    await lab.explorerButton('Copia independiente').click();

    await expect(lab.explorerButton('Volver a compartir')).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.labExplorerStatus()).toHaveText(
      'La copia tiene su propio arreglo de respaldo. Cambiar un elemento de vista ya no cambia original. El slice y los datos que referencia son cosas distintas.',
    );
    await expect(lab.explorerButton('Volver a compartir')).toBeFocused();
  });

  test('flow (rust-01): each step shows its reason and the button starts over at the end', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-01', 'learn'));

    await lab.explorerButton('Siguiente paso →').click();
    await expect(lab.labExplorer().locator('.flow-step.active')).toHaveText(
      '02DecisiónRust distingue las expresiones, que producen un valor, de las sentencias. El compilador comprueba que el valor final coincida con el tipo de retorno: esa verificación detecta muchos olvidos antes de ejecutar.',
    );
    await expect(lab.explorerButton('Siguiente paso →')).toBeFocused();

    await lab.explorerButton('Siguiente paso →').click();

    await expect(lab.labExplorer().locator('.flow-step.active')).toHaveText(
      '03ResultadoLa salida depende del argumento.',
    );
    await expect(lab.explorerButton('Volver al inicio ↺')).toBeFocused();
  });

  test('opening another exercise restarts the explorer; changing the phase keeps it', async ({
    shell,
    lab,
  }) => {
    await shell.goto(urls.exercise('rust-46', 'learn'));
    await lab.explorerButton('Paso del productor →').click();

    await lab.tab('code').click();
    await lab.tab('learn').click();
    await expect(lab.labExplorerStatus()).toHaveText(
      'El productor espera: sin buffer no puede completar el envío hasta que aparezca una recepción.0 mensajes entregados.',
    );

    await lab.nextButton().click();

    await expect(lab.exerciseTitle()).not.toHaveText('Un trabajo que viaja a otro thread');
    await expect(lab.labExplorerStatus()).toHaveText(
      'Elegí qué participante da el primer paso.0 mensajes entregados.',
    );
  });

  test('KNOWN DEFECT (spec 021, rareza 2): coming back to an exercise through the URL does not restart its explorer', async ({
    shell,
    lab,
    page,
  }) => {
    await shell.goto(urls.view('laboratorio'));
    await lab.searchBox().fill('Un trabajo que viaja a otro thread');
    await lab.exerciseNode('Un trabajo que viaja a otro thread').click();
    await lab.explorerButton('Paso del productor →').click();

    await shell.openFromMenu('atlas');
    await page.goBack();

    await expect(lab.labExplorerStatus()).toHaveText(
      'El productor espera: sin buffer no puede completar el envío hasta que aparezca una recepción.0 mensajes entregados.',
    );
  });
});
