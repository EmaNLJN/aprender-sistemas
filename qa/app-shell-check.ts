/* Caracterización de app.js: shell, recorrido y respaldo global de progreso.
 * node qa/app-shell-check.ts
 * Ejecuta content.js y app.js sobre un DOM falso mínimo (sin dependencias) y adaptadores
 * falsos de Lab, Campaña, Sistemas y Atlas que registran sus llamadas. Fija el
 * comportamiento vigente (ADR 0003: carga sin escritura, respaldo antes de perder datos,
 * avisos acumulados e importación atómica).
 * Los valores esperados están escritos a mano desde el contrato del respaldo y de content.js.
 */
import assert from 'node:assert/strict';
import { plainJson } from './lib/plain-json.ts';
import {
  BACKUP_KEY,
  STORAGE_KEY,
  buildHarness,
  campaignExport,
  changeField,
  clickAction,
  exportedProgress,
  type Harness,
  importFile,
  labExport,
  systemsExport,
} from './lib/app-shell-harness.ts';

const localProgress = {
  version: 1,
  language: 'go',
  completed: ['rust-ownership', 'go-save'],
  milestones: ['go-memory'],
  favorites: ['rustlings'],
  quizAnswers: { 'rust-ownership': 1, 'go-save': 0 },
  notes: {
    rust: { learned: 'rust local aprendido', next: 'rust local siguiente' },
    go: { learned: 'go local aprendido', next: 'go local siguiente' },
  },
  minutes: 45,
};

const validImport = {
  version: 1,
  language: 'rust',
  completed: ['go-save', 'rust-first-session'],
  milestones: ['go-files', 'rust-memory'],
  favorites: ['rustlings', 'go-tour'],
  quizAnswers: { 'rust-ownership': 2, 'rust-errors': 0 },
  notes: {
    rust: { learned: 'rust importado', next: '' },
    go: { learned: '', next: 'go importado siguiente' },
  },
  minutes: 15,
  lab: { marker: 'lab-importado' },
  campaign: { marker: 'campaign-importado' },
  systems: { marker: 'systems-importado' },
};

let passed = 0;
let failed = 0;
async function test(name: string, run: () => Promise<void> | void): Promise<void> {
  try {
    await run();
    passed++;
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failed++;
    process.stderr.write(`FAIL ${name}\n${(error as Error).stack}\n`);
  }
}

await test('a) exportar: Blob JSON con el recorrido en la raíz y los adaptadores', async () => {
  const harness = buildHarness({ stored: localProgress });
  const exported = await exportedProgress(harness);
  assert.deepEqual(exported, {
    version: 1,
    language: 'go',
    completed: ['rust-ownership', 'go-save'],
    milestones: ['go-memory'],
    favorites: ['rustlings'],
    quizAnswers: { 'rust-ownership': 1, 'go-save': 0 },
    notes: localProgress.notes,
    minutes: 45,
    lab: labExport,
    campaign: campaignExport,
    systems: systemsExport,
    exportedAt: '2026-03-04T05:06:07.000Z',
  });
  assert.equal(harness.blobs[0]?.options.type, 'application/json');
  assert.deepEqual(Object.keys(exported), [
    'version',
    'language',
    'completed',
    'milestones',
    'favorites',
    'quizAnswers',
    'notes',
    'minutes',
    'lab',
    'campaign',
    'systems',
    'exportedAt',
  ]);
});

await test('a) exportar: descarga taller-progreso-AAAA-MM-DD.json y avisa', async () => {
  const harness = buildHarness({ stored: localProgress });
  await exportedProgress(harness);
  const link = harness.downloads[0];
  assert.ok(link);
  assert.equal(link.download, 'taller-progreso-2026-03-04.json');
  assert.equal(link.href, 'blob:fake-1');
  assert.equal(link.clicks, 1);
  assert.equal(link.isConnected, false);
  assert.equal(harness.toast(), 'Copia de progreso exportada.');
  assert.deepEqual(harness.revoked, []);
  const revoke = harness.timers.find((timer) => timer.delay === 1000);
  assert.ok(revoke, 'falta el temporizador que libera la URL');
  revoke.callback();
  assert.deepEqual(harness.revoked, ['blob:fake-1']);
});

await test('b) importar una copia válida combina el recorrido y llama a cada adaptador', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), 'Copia importada y combinada con tu avance actual.');
  const state = harness.storedState();
  assert.deepEqual(state.completed, ['rust-ownership', 'go-save', 'rust-first-session']);
  assert.deepEqual(state.milestones, ['go-memory', 'go-files', 'rust-memory']);
  assert.deepEqual(state.favorites, ['rustlings', 'go-tour']);
  assert.deepEqual(state.quizAnswers, { 'rust-ownership': 2, 'go-save': 0, 'rust-errors': 0 });
  assert.equal(harness.elements['import-file']?.value, '');
});

await test('b) importar: una nota no vacía pisa la local y una vacía no', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, JSON.stringify(validImport));
  assert.deepEqual(harness.storedState().notes, {
    rust: { learned: 'rust importado', next: 'rust local siguiente' },
    go: { learned: 'go local aprendido', next: 'go importado siguiente' },
  });
});

await test('b) importar: se conservan los minutes y el language locales', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, JSON.stringify(validImport));
  const state = harness.storedState();
  assert.equal(state.minutes, 45);
  assert.equal(state.language, 'go');
});

await test('b) importar: planifica las tres secciones y después aplica los tres planes', async () => {
  const harness = buildHarness({ stored: localProgress });
  const before = harness.calls.length;
  await importFile(harness, JSON.stringify(validImport));
  const importCalls = harness.calls
    .slice(before)
    .filter((name) => /planImport|applyImport/.test(name));
  assert.deepEqual(importCalls, [
    'CampaignEngine.planImport',
    'Lab.planImport',
    'SystemsEngine.planImport',
    'CampaignEngine.applyImport',
    'Lab.applyImport',
    'SystemsEngine.applyImport',
  ]);
  assert.deepEqual(plainJson(harness.callArgs['CampaignEngine.planImport']), {
    marker: 'campaign-importado',
  });
  assert.deepEqual(plainJson(harness.callArgs['Lab.planImport']), { marker: 'lab-importado' });
  assert.deepEqual(plainJson(harness.callArgs['SystemsEngine.planImport']), {
    marker: 'systems-importado',
  });
  // Cada sección aplica el plan que ella misma calculó.
  const planned = plainJson(harness.callArgs['SystemsEngine.applyImport']) as { state: unknown };
  assert.deepEqual(planned.state, { marker: 'systems-importado' });
});

await test('b) importar: después de aplicar sincroniza Sistemas y Campaña, y luego renderiza', async () => {
  const harness = buildHarness({ stored: localProgress });
  const before = harness.calls.length;
  await importFile(harness, JSON.stringify(validImport));
  const order = harness.calls
    .slice(before)
    .filter((name) =>
      /^(Campaign|Systems)Engine\.applyImport$|^(Campaign|Systems)\.sync$/.test(name),
    );
  assert.deepEqual(order, [
    'CampaignEngine.applyImport',
    'SystemsEngine.applyImport',
    'Systems.sync',
    'Campaign.sync',
  ]);
  assert.deepEqual(harness.errors, []);
});

await test('b) importar: si la sincronización de Sistemas lanza, la de campaña igual se llama', async () => {
  const harness = buildHarness({ stored: localProgress, failSystemsSync: true });
  const before = harness.calls.length;
  await importFile(harness, JSON.stringify(validImport));
  const syncs = harness.calls.slice(before).filter((name) => name.endsWith('.sync'));
  assert.deepEqual(syncs, ['Systems.sync', 'Campaign.sync']);
  assert.equal(harness.errors.length, 1);
  assert.equal(harness.toast(), 'Copia importada y combinada con tu avance actual.');
});

const NOT_SAVED_TAIL = '. Exportá tu avance para conservarlo.';
const NOT_SAVED_HEAD = 'Copia importada en esta sesión, pero no se pudo guardar: ';

await test('b) importar: si el laboratorio no se pudo guardar, no anuncia éxito y lo nombra', async () => {
  const harness = buildHarness({ stored: localProgress, applyResults: { lab: false } });
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), NOT_SAVED_HEAD + 'laboratorio' + NOT_SAVED_TAIL);
});

await test('b) importar: con el recorrido no escribible lo nombra primero y conserva la cola de omisiones', async () => {
  const harness = buildHarness({
    stored: localProgress,
    writesBlocked: true,
    applyResults: { systems: false, campaign: false },
    lossy: { lab: true },
  });
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(
    harness.toast(),
    NOT_SAVED_HEAD +
      'recorrido, campaña, Sistemas' +
      NOT_SAVED_TAIL +
      ' Se omitieron datos que esta versión no reconoce: laboratorio.',
  );
});

await test('b) importar: si sync lanza, el error se registra y la copia ya quedó importada', async () => {
  const harness = buildHarness({ stored: localProgress, failSync: true });
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), 'Copia importada y combinada con tu avance actual.');
  // Cada sincronización falla y se registra por separado.
  assert.equal(harness.errors.length, 2);
  assert.deepEqual(harness.storedState().completed, [
    'rust-ownership',
    'go-save',
    'rust-first-session',
  ]);
});

await test('b) importar: sin lab, campaign ni systems no llama a ningún adaptador', async () => {
  const harness = buildHarness({ stored: localProgress });
  const adapterKeys = ['lab', 'campaign', 'systems'];
  const onlyRoute = Object.fromEntries(
    Object.entries(validImport).filter(([key]) => !adapterKeys.includes(key)),
  );
  await importFile(harness, JSON.stringify(onlyRoute));
  assert.equal(harness.toast(), 'Copia importada y combinada con tu avance actual.');
  assert.deepEqual(
    harness.calls.filter((name) => /planImport|applyImport/.test(name)),
    [],
  );
});

await test('c) copia con version 2: no aplica nada y avisa el formato', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, JSON.stringify({ ...validImport, version: 2 }));
  assert.equal(harness.toast(), 'No se pudo importar: Formato de progreso no compatible.');
  assert.deepEqual(harness.storedState(), localProgress);
  assert.deepEqual(
    harness.calls.filter((name) => /planImport|applyImport/.test(name)),
    [],
  );
});

await test('c) una entrada que no es objeto da el error de formato y no aplica nada', async () => {
  for (const text of ['null', '[]', '5']) {
    const harness = buildHarness({ stored: localProgress });
    await importFile(harness, text);
    assert.equal(harness.toast(), 'No se pudo importar: Formato de progreso no compatible.', text);
    assert.deepEqual(harness.storedState(), localProgress);
    assert.deepEqual(
      harness.calls.filter((name) => /planImport|applyImport/.test(name)),
      [],
    );
  }
});

await test('d) JSON roto: el aviso dice que no contiene JSON válido', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(harness, '{"version": 1, ');
  assert.equal(harness.toast(), 'No se pudo importar: el archivo no contiene JSON válido.');
  assert.deepEqual(harness.storedState(), localProgress);
});

await test('d) archivo mayor de 10 MB: se rechaza antes de leerlo', async () => {
  const harness = buildHarness({ stored: localProgress });
  const input = harness.elements['import-file'];
  assert.ok(input);
  input.files = [{ size: 10 * 1024 * 1024 + 1, text: () => Promise.reject(new Error('leído')) }];
  await input.dispatch('change');
  assert.equal(
    harness.toast(),
    'No se pudo importar: El archivo supera el tamaño permitido (10 MB).',
  );
});

await test('e) atomicidad: si el plan de Sistemas lanza, no se aplica nada', async () => {
  const harness = buildHarness({
    stored: localProgress,
    failPlan: { systems: 'Sistemas rechazó la copia.' },
  });
  const before = await exportedProgress(harness);
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), 'No se pudo importar: Sistemas rechazó la copia.');
  assert.deepEqual(
    harness.calls.filter((name) => name.endsWith('.applyImport')),
    [],
  );
  assert.deepEqual(harness.storedState(), localProgress);
  assert.deepEqual(await exportedProgress(harness), before);
});

await test('e) atomicidad: si applyImport de Sistemas lanza a mitad, notas y pasos locales no cambian', async () => {
  const harness = buildHarness({
    stored: localProgress,
    failApply: { systems: 'Sistemas falló al aplicar.' },
  });
  const before = await exportedProgress(harness);
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), 'No se pudo importar: Sistemas falló al aplicar.');
  assert.deepEqual(
    harness.calls.filter((name) => name.endsWith('.applyImport')),
    ['CampaignEngine.applyImport', 'Lab.applyImport', 'SystemsEngine.applyImport'],
  );
  const after = await exportedProgress(harness);
  assert.deepEqual(after.notes, localProgress.notes);
  assert.deepEqual(after.completed, localProgress.completed);
  assert.deepEqual(after.milestones, localProgress.milestones);
  assert.deepEqual(after.favorites, localProgress.favorites);
  assert.deepEqual(after.quizAnswers, localProgress.quizAnswers);
  assert.deepEqual(after, before);
  assert.deepEqual(harness.storedState(), localProgress);
});

const OMITTED =
  'Copia importada y combinada con tu avance actual. Se omitieron datos que esta versión no reconoce: ';

await test('e) omisiones: un plan del laboratorio con lossy avisa el área', async () => {
  const harness = buildHarness({ stored: localProgress, lossy: { lab: true } });
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), `${OMITTED}laboratorio.`);
});

await test('e) omisiones: un paso desconocido en completed agrega el recorrido, primero en la lista', async () => {
  const harness = buildHarness({ stored: localProgress, lossy: { lab: true } });
  const withUnknownStep = { ...validImport, completed: ['paso-desconocido', 'go-save'] };
  await importFile(harness, JSON.stringify(withUnknownStep));
  assert.equal(harness.toast(), `${OMITTED}recorrido, laboratorio.`);
});

await test('e) omisiones: el orden del aviso es recorrido, laboratorio, campaña y Sistemas', async () => {
  const harness = buildHarness({
    stored: localProgress,
    lossy: { lab: true, campaign: true, systems: true },
  });
  const withUnknownStep = { ...validImport, completed: ['paso-desconocido'] };
  await importFile(harness, JSON.stringify(withUnknownStep));
  assert.equal(harness.toast(), `${OMITTED}recorrido, laboratorio, campaña, Sistemas.`);
});

await test('e) omisiones: lo que traen lab, campaign, systems y exportedAt no cuenta como pérdida del recorrido', async () => {
  const harness = buildHarness({ stored: localProgress });
  await importFile(
    harness,
    JSON.stringify({ ...validImport, exportedAt: '2026-01-01T00:00:00.000Z' }),
  );
  assert.equal(harness.toast(), 'Copia importada y combinada con tu avance actual.');
});

const unknownProgress = {
  version: 1,
  language: 'go',
  completed: ['paso-desconocido', 'go-save'],
  milestones: ['go-memory', 'go-inexistente'],
  favorites: ['favorito-inexistente', 'go-tour'],
  quizAnswers: { 'go-save': 1, 'paso-desconocido': 0 },
  notes: { go: { learned: 42, next: 'sigo con tests' } },
  minutes: 99,
};
const droppedNotice =
  'Se descartaron 6 registros del recorrido que esta versión no reconoce; se conservó una copia en taller-learning-v1:respaldo.';

await test('f) cargar no escribe taller-learning-v1, ni siquiera con datos que se descartan', () => {
  const raw = JSON.stringify(unknownProgress);
  const harness = buildHarness({ storedRaw: raw });
  assert.equal(harness.storage.get(STORAGE_KEY), raw);
  const empty = buildHarness();
  assert.equal(empty.storage.has(STORAGE_KEY), false);
  assert.equal(empty.storage.has(BACKUP_KEY), false);
  assert.equal(empty.toast(), '');
});

await test('f) con descartes: respaldo con el texto original, aviso y estado podado en memoria', async () => {
  const raw = JSON.stringify(unknownProgress);
  const harness = buildHarness({ storedRaw: raw });
  assert.equal(harness.storage.get(BACKUP_KEY), raw);
  assert.equal(harness.toast(), droppedNotice);
  const exported = await exportedProgress(harness);
  assert.equal(exported.language, 'go');
  assert.deepEqual(exported.completed, ['go-save']);
  assert.deepEqual(exported.milestones, ['go-memory']);
  assert.deepEqual(exported.favorites, ['go-tour']);
  assert.deepEqual(exported.quizAnswers, { 'go-save': 1 });
  assert.deepEqual(exported.notes, {
    rust: { learned: '', next: '' },
    go: { learned: '', next: 'sigo con tests' },
  });
  assert.equal(exported.minutes, 25);
});

await test('f) la primera acción del alumno guarda el estado podado y conserva el respaldo', () => {
  const raw = JSON.stringify(unknownProgress);
  const harness = buildHarness({ storedRaw: raw });
  void harness.languageButtons[0]?.dispatch('click');
  assert.equal(harness.storedState().language, 'rust');
  assert.deepEqual(harness.storedState().completed, ['go-save']);
  assert.equal(harness.storage.get(BACKUP_KEY), raw);
});

await test('f) un respaldo previo no se pisa al cargar datos con descartes', () => {
  const harness = buildHarness({
    storedRaw: JSON.stringify(unknownProgress),
    backup: 'respaldo anterior',
  });
  assert.equal(harness.storage.get(BACKUP_KEY), 'respaldo anterior');
});

await test('f) JSON ilegible: respaldo, aviso y la clave queda intacta', async () => {
  const harness = buildHarness({ storedRaw: '{roto' });
  assert.equal(harness.storage.get(BACKUP_KEY), '{roto');
  assert.equal(harness.storage.get(STORAGE_KEY), '{roto');
  assert.equal(
    harness.toast(),
    'No se pudo leer el progreso del recorrido guardado; se conservó una copia en taller-learning-v1:respaldo.',
  );
  const exported = await exportedProgress(harness);
  assert.equal(exported.language, 'rust');
  assert.deepEqual(exported.completed, []);
});

await test('f) una copia de otra forma o versión avisa y arranca con valores por defecto', async () => {
  for (const stored of ['no es un objeto de progreso', { ...localProgress, version: 2 }]) {
    const harness = buildHarness({ stored });
    assert.equal(
      harness.toast(),
      'No se pudo leer el progreso del recorrido guardado; se conservó una copia en taller-learning-v1:respaldo.',
    );
    assert.equal(harness.storage.get(BACKUP_KEY), JSON.stringify(stored));
    assert.deepEqual((await exportedProgress(harness)).completed, []);
  }
});

await test('f) con el almacenamiento bloqueado: aviso de no disponible y la app funciona', async () => {
  const harness = buildHarness({ blocked: true });
  assert.equal(
    harness.toast(),
    'No se pudo leer o guardar el avance. Podés exportarlo al terminar.',
  );
  assert.equal(harness.elements['save-label']?.textContent, 'Exportá para conservar tu avance');
  assert.deepEqual((await exportedProgress(harness)).completed, []);
});

await test('avisos: los de campaña y laboratorio se muestran juntos en un único toast', () => {
  const harness = buildHarness({
    warnings: { campaign: 'Aviso de campaña.', lab: 'Aviso del laboratorio.' },
  });
  assert.equal(harness.toast(), 'Aviso de campaña. · Aviso del laboratorio.');
});

await test('avisos: recorrido, campaña, Sistemas y laboratorio se acumulan sin perder ninguno', () => {
  const harness = buildHarness({
    storedRaw: '{roto',
    warnings: { campaign: 'C.', systems: 'S.', lab: 'L.' },
  });
  assert.equal(
    harness.toast(),
    'No se pudo leer el progreso del recorrido guardado; se conservó una copia en taller-learning-v1:respaldo. · C. · S. · L.',
  );
});

await test('h) borrar todo: elimina el respaldo del recorrido y reinicia a los motores', () => {
  const harness = buildHarness({ stored: localProgress, backup: 'copia anterior' });
  const before = harness.calls.length;
  void harness.elements['confirm-reset']?.dispatch('click');
  assert.equal(harness.storage.has(BACKUP_KEY), false);
  assert.deepEqual(harness.storedState().completed, []);
  assert.deepEqual(
    harness.calls.slice(before).filter((name) => name.endsWith('.reset')),
    ['Lab.reset', 'CampaignEngine.reset', 'SystemsEngine.reset'],
  );
  assert.equal(harness.toast(), 'Progreso reiniciado. Un nuevo comienzo.');
});

const RESET_FAILED =
  'No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.';

await test('h) borrar todo: un motor que no pudo borrar ({ removed: false }) da el aviso de fallo', async () => {
  const harness = buildHarness({ stored: localProgress, resets: { systems: false } });
  await harness.elements['confirm-reset']?.dispatch('click');
  assert.equal(harness.toast(), RESET_FAILED);
  assert.deepEqual(harness.storedState().completed, []);
});

await test('h) borrar todo: el laboratorio que devuelve false también da el aviso de fallo', async () => {
  const harness = buildHarness({ stored: localProgress, resets: { lab: false } });
  await harness.elements['confirm-reset']?.dispatch('click');
  assert.equal(harness.toast(), RESET_FAILED);
});

await test('h) borrar todo: si el recorrido no pudo borrar sus claves, avisa el fallo', async () => {
  const harness = buildHarness({ stored: localProgress, writesBlocked: true });
  await harness.elements['confirm-reset']?.dispatch('click');
  assert.equal(harness.toast(), RESET_FAILED);
});

await test('h) borrar todo: un adaptador ausente no cuenta como fallo', async () => {
  const harness = buildHarness({ stored: localProgress });
  harness.context['TallerCampaignEngine'] = undefined;
  harness.context['TallerSystemsEngine'] = undefined;
  await harness.elements['confirm-reset']?.dispatch('click');
  assert.equal(harness.toast(), 'Progreso reiniciado. Un nuevo comienzo.');
});

await test('h) borrar todo: sin acceso al almacenamiento no hay nada que borrar y avisa éxito', async () => {
  const harness = buildHarness({ storageInaccessible: true });
  await harness.elements['confirm-reset']?.dispatch('click');
  assert.equal(harness.toast(), 'Progreso reiniciado. Un nuevo comienzo.');
});

const scriptNote = '</textarea><img src=x onerror=alert(1)>';

await test('seguridad: una nota importada con HTML se escapa en #metodo', async () => {
  const harness = buildHarness({ hash: '#metodo' });
  const withNote = { version: 1, notes: { rust: { learned: scriptNote, next: '' } } };
  await importFile(harness, JSON.stringify(withNote));
  const html = harness.elements['main']?.innerHTML ?? '';
  assert.ok(
    html.includes('&lt;/textarea&gt;&lt;img src=x onerror=alert(1)&gt;'),
    'la nota no aparece escapada',
  );
  assert.ok(!html.includes('<img src=x'), 'la nota inyectó una etiqueta img');
});

await test('almacenamiento sin escritura: importar funciona en memoria y avisa que exporte', async () => {
  const harness = buildHarness({ stored: localProgress, writesBlocked: true });
  await importFile(harness, JSON.stringify(validImport));
  assert.equal(harness.toast(), NOT_SAVED_HEAD + 'recorrido' + NOT_SAVED_TAIL);
  assert.equal(harness.elements['save-label']?.textContent, 'Exportá para conservar tu avance');
  assert.deepEqual(harness.storedState(), localProgress);
  const exported = await exportedProgress(harness);
  assert.deepEqual(exported.completed, ['rust-ownership', 'go-save', 'rust-first-session']);
  assert.deepEqual(exported.favorites, ['rustlings', 'go-tour']);
});

await test('almacén: desmarcar un paso, quitar un favorito y vaciar una nota se conservan al recargar', async () => {
  const harness = buildHarness({ stored: localProgress });
  await changeField(harness, 'change', { stepCheck: 'go-save' });
  await clickAction(harness, { action: 'favorite', id: 'rustlings' });
  await changeField(harness, 'input', { note: 'learned' }, '');
  const reloaded = buildHarness({ storedRaw: harness.storage.get(STORAGE_KEY) ?? '' });
  const exported = await exportedProgress(reloaded);
  assert.deepEqual(exported.completed, ['rust-ownership']);
  assert.deepEqual(exported.favorites, []);
  assert.deepEqual(exported.notes, {
    rust: localProgress.notes.rust,
    go: { learned: '', next: 'go local siguiente' },
  });
});

await test('almacén: un cambio de otra pestaña se fusiona y gana el idioma y los minutos de esta', async () => {
  const harness = buildHarness({ stored: localProgress });
  // Otra pestaña guardó un estado válido distinto, con un paso más, otro idioma y otros minutos.
  const otherTab = {
    ...localProgress,
    language: 'rust',
    minutes: 15,
    completed: [...localProgress.completed, 'rust-first-session'],
  };
  harness.storage.set(STORAGE_KEY, JSON.stringify(otherTab));
  await clickAction(harness, { action: 'favorite', id: 'go-tour' });
  const saved = harness.storedState();
  assert.deepEqual(saved.completed, ['rust-ownership', 'go-save', 'rust-first-session']);
  assert.deepEqual(saved.favorites, ['rustlings', 'go-tour']);
  assert.equal(saved.language, 'go');
  assert.equal(saved.minutes, 45);
});

await test('almacén: sin ranuras libres y con la clave ilegible, guardar no escribe y la etiqueta avisa', async () => {
  const occupied = Object.fromEntries(
    ['-2', '-3', '-4', '-5'].map((suffix) => [`${BACKUP_KEY}${suffix}`, `copia ajena${suffix}`]),
  );
  const harness = buildHarness({
    storedRaw: '{roto',
    backup: 'copia ajena',
    extraStorage: occupied,
  });
  assert.equal(harness.elements['save-label']?.textContent, 'Exportá para conservar tu avance');
  await harness.languageButtons[1]?.dispatch('click');
  assert.equal(harness.storage.get(STORAGE_KEY), '{roto');
  assert.equal(harness.elements['save-label']?.textContent, 'Exportá para conservar tu avance');
});

const backupSlots = {
  lab: [{ key: 'taller-laboratorio-v1:respaldo', text: 'x'.repeat(2048) }],
  campaign: [{ key: 'taller-campaign-v1:respaldo', text: '{"campaign":1}' }],
};

await test('respaldos: Método lista el área y la clave de cada ranura antes de «Tu progreso te pertenece»', () => {
  const harness = buildHarness({ hash: '#metodo', backup: '{"viejo":true}', backups: backupSlots });
  const html = harness.elements['main']?.innerHTML ?? '';
  assert.match(html, /<h2>Respaldos de seguridad\.<\/h2>/);
  assert.ok(html.includes('«Borrar mi progreso» también los elimina.'));
  assert.ok(html.indexOf('Respaldos de seguridad.') < html.indexOf('Tu progreso te pertenece.'));
  assert.ok(
    html.includes('aria-label="Descargar respaldo de recorrido: taller-learning-v1:respaldo"'),
  );
  assert.ok(
    html.includes('aria-label="Descargar respaldo de laboratorio: taller-laboratorio-v1:respaldo"'),
  );
  assert.ok(
    html.includes('aria-label="Descargar respaldo de campaña: taller-campaign-v1:respaldo"'),
  );
  assert.ok(
    html.includes('data-action="download-backup" data-key="taller-laboratorio-v1:respaldo"'),
  );
  assert.ok(html.includes('2.0 KB'), 'falta el tamaño del respaldo del laboratorio');
});

await test('respaldos: sin ranuras no aparece el panel', () => {
  const harness = buildHarness({ hash: '#metodo' });
  assert.ok(!(harness.elements['main']?.innerHTML ?? '').includes('Respaldos de seguridad.'));
});

await test('respaldos: el clic descarga el texto exacto de la ranura, con su nombre, y avisa', async () => {
  const harness = buildHarness({ hash: '#metodo', backups: structuredClone(backupSlots) });
  await clickAction(harness, { action: 'download-backup', key: 'taller-laboratorio-v1:respaldo' });
  const blob = harness.blobs[0];
  assert.ok(blob, 'no se creó el Blob');
  assert.equal(blob.text, 'x'.repeat(2048));
  assert.equal(blob.options.type, 'application/json');
  assert.equal(harness.downloads[0]?.download, 'taller-laboratorio-v1-respaldo.json');
  assert.equal(harness.toast(), 'Respaldo descargado.');
});

await test('respaldos: el clic vuelve a leer la ranura y descarga su texto actual', async () => {
  const slots = structuredClone(backupSlots);
  const harness = buildHarness({ hash: '#metodo', backups: slots });
  const slot = slots.campaign[0];
  assert.ok(slot);
  slot.text = '{"campaign":"cambió"}';
  await clickAction(harness, { action: 'download-backup', key: 'taller-campaign-v1:respaldo' });
  assert.equal(harness.blobs[0]?.text, '{"campaign":"cambió"}');
});

await test('respaldos: la ranura del recorrido sale del almacenamiento y su nombre reemplaza los dos puntos', async () => {
  const harness = buildHarness({
    hash: '#metodo',
    stored: localProgress,
    backup: '{"viejo":true}',
  });
  await clickAction(harness, { action: 'download-backup', key: BACKUP_KEY });
  assert.equal(harness.blobs[0]?.text, '{"viejo":true}');
  assert.equal(harness.downloads[0]?.download, 'taller-learning-v1-respaldo.json');
});

await test('accesibilidad: aria-pressed marca el idioma activo y aria-current la vista activa', async () => {
  const rust = buildHarness({ hash: '#proyecto' });
  assert.deepEqual(
    rust.languageButtons.map((button) => button.getAttribute('aria-pressed')),
    ['true', 'false'],
  );
  assert.deepEqual(
    rust.viewLinks.map((link) => link.getAttribute('aria-current')),
    [null, 'page'],
  );
  const go = buildHarness({ stored: localProgress });
  assert.deepEqual(
    go.languageButtons.map((button) => button.getAttribute('aria-pressed')),
    ['false', 'true'],
  );
  assert.deepEqual(
    go.viewLinks.map((link) => link.getAttribute('aria-current')),
    ['page', null],
  );
});

const milestoneSuffixes = ['memory', 'commands', 'files', 'measure', 'network'];

function renderedMilestones(harness: Harness): string[] {
  const html = harness.elements['main']?.innerHTML ?? '';
  return [...html.matchAll(/data-milestone="([^"]+)"/g)].map((match) => match[1] ?? '');
}

await test('g) hitos: #proyecto muestra los 5 hitos del lenguaje activo (rust)', () => {
  const harness = buildHarness({ hash: '#proyecto' });
  assert.deepEqual(
    renderedMilestones(harness),
    milestoneSuffixes.map((suffix) => `rust-${suffix}`),
  );
  const html = harness.elements['main']?.innerHTML ?? '';
  assert.match(html, /PROYECTO PERSONAL · 0 \/ 5 HITOS/);
  assert.match(html, /Un pequeño almacén clave-valor en Rust\./);
});

await test('g) hitos: con Go activo aparecen go-* y el avance marca los completados', () => {
  const harness = buildHarness({
    hash: '#proyecto',
    stored: { ...localProgress, milestones: ['go-memory', 'rust-files'] },
  });
  assert.deepEqual(
    renderedMilestones(harness),
    milestoneSuffixes.map((suffix) => `go-${suffix}`),
  );
  const html = harness.elements['main']?.innerHTML ?? '';
  assert.match(html, /PROYECTO PERSONAL · 1 \/ 5 HITOS/);
  assert.match(html, /data-milestone="go-memory"[^>]* checked>/);
  assert.doesNotMatch(html, /data-milestone="go-files"[^>]* checked>/);
});

await test('shell: al cargar se inicializan campaña y Sistemas y se sincroniza la barra lateral', () => {
  const harness = buildHarness({ hash: '#proyecto' });
  assert.ok(harness.calls.includes('Campaign.init'));
  assert.ok(harness.calls.includes('Systems.init'));
  assert.equal(harness.elements['sidebar-language']?.textContent, 'RUST');
  assert.equal(harness.elements['sidebar-completed']?.textContent, '0 de 12');
  assert.equal(harness.context.document.body.dataset.language, 'rust');
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
