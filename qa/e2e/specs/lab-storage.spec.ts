import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '../fixtures';
import { frozenProgress } from '../lib/curriculum';
import { LAB_KEY, LAB_WRITE } from '../lib/lab-storage';
import { urls } from '../lib/urls';

function exportedLab(name: string): string {
  const path = resolve(import.meta.dirname, '../../fixtures', name);
  return JSON.stringify(JSON.parse(readFileSync(path, 'utf8')).lab);
}

// Frozen contracts (qa/AGENTS.md): read only.
const FROZEN_LABS: Record<string, string> = {
  'progress-master-2a278ad-storage.json': frozenProgress[LAB_KEY],
  'progress-master-2a278ad-export.json': exportedLab('progress-master-2a278ad-export.json'),
  'progress-d0e1b49-export.json': exportedLab('progress-d0e1b49-export.json'),
};

// rust-09 was solved and then failed with a variant (F7-Q1); rust-112 is the boss of a locked world.
const VISITS = [
  urls.view('laboratorio'),
  urls.exercise('rust-09', 'learn'),
  urls.exercise('rust-09', 'code'),
  urls.exercise('rust-09', 'reflect'),
  urls.campaignMission('rust-world-4', 'rust-112'),
];

test.describe('the frozen progress', () => {
  for (const [name, text] of Object.entries(FROZEN_LABS)) {
    test(`${name}: the map, the three phases and the lock write nothing and warn nothing`, async ({
      shell,
      lab,
      storage,
    }) => {
      await storage.seed({ [LAB_KEY]: text });
      await storage.watchWrites();

      for (const url of VISITS) {
        await shell.goto(url);
        expect(await storage.writes(), url).toEqual([]);
      }
      await expect(lab.campaignLockHeading()).toBeVisible();

      const stored = await storage.snapshot();
      expect(stored[LAB_KEY]).toBe(text);
      expect(Object.keys(stored).filter((key) => key.includes(':respaldo'))).toEqual([]);
      await expect(shell.toast).toHaveText('');
    });
  }

  test('rust-09, solved and then failed, still shows as solved (F7-Q1)', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.seed({ [LAB_KEY]: frozenProgress[LAB_KEY] });

    await shell.goto(urls.view('laboratorio'));

    await expect(lab.exerciseNode('Resuelto. Salir de loop con una respuesta')).toHaveText('✓');
  });
});

test.describe('what the lab saves', () => {
  test('browsing, filtering, searching, changing the phase, an explorer and the way back save only the opening', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.watchWrites();
    await shell.goto(urls.view('laboratorio'));
    await lab.levelButton('Inicial').click();
    await lab.extrasButton().click();
    await lab.extrasButton().click();
    await lab.searchBox().fill('reactor');

    await lab.exerciseNode('La energía del reactor').click();
    await lab.explorerButton('Siguiente paso →').click();
    await lab.tab('code').click();
    await lab.tab('reflect').click();
    await lab.backButton().click();

    expect(await storage.writes()).toEqual([LAB_WRITE]);
  });
});

test.describe('with the storage blocked', () => {
  test('the map warns and the editor and the reflection say that nothing is saved', async ({
    shell,
    lab,
    storage,
  }) => {
    await storage.block();
    await shell.goto(urls.view('laboratorio'));
    await expect(lab.storageWarning()).toContainText(
      'El guardado local no está disponible. Exportá tu progreso desde Método y notas antes de cerrar.',
    );

    await shell.goto(urls.exercise('rust-01', 'code'));
    await lab.writeDraft('rust', 'fn energia');
    await expect(lab.editorStatus()).toHaveText('Exportá para conservar');

    await shell.goto(urls.exercise('rust-01', 'reflect'));
    await lab.reflectionBox().fill('no se puede guardar');
    await expect(lab.reflectionStatus()).toHaveText(
      'El guardado no está disponible: exportá tu avance.',
    );
  });
});
