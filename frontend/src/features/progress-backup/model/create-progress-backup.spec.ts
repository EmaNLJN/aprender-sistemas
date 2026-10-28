import { afterEach, describe, expect, it, vi } from 'vitest';
import curriculum from '../../../../../build/curriculum.json';
import d0e1b49Export from '../../../../../qa/fixtures/progress-d0e1b49-export.json';
import master2a278adExport from '../../../../../qa/fixtures/progress-master-2a278ad-export.json';
import type { GuideData, RouteImportPlan, RouteProgressV1 } from '../../../entities/guide';
import type { BackupEntry } from '../../../shared/lib/versioned-storage';
import {
  assertImportSize,
  createProgressBackup,
  importFailureNotice,
} from './create-progress-backup';
import type {
  ProgressAreas,
  ProgressBackup,
  RouteArea,
  SealedArea,
  SectionArea,
  SectionPlan,
} from './types';

const guide = curriculum.guide as unknown as GuideData;

const IMPORT_SUCCESS = 'Copia importada y combinada con tu avance actual.';
const NOT_SAVED_HEAD = 'Copia importada en esta sesión, pero no se pudo guardar: ';
const NOT_SAVED_TAIL = '. Exportá tu avance para conservarlo.';
const OMITTED_HEAD = ' Se omitieron datos que esta versión no reconoce: ';
const RESET_SUCCESS = 'Progreso reiniciado. Un nuevo comienzo.';
const RESET_FAILED =
  'No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.';

const localProgress: RouteProgressV1 = {
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

const incomingRoute = {
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
};

const fullImport = {
  ...incomingRoute,
  lab: { marker: 'lab-importado' },
  campaign: { marker: 'campaign-importado' },
  systems: { marker: 'systems-importado' },
};

type AreaKey = 'route' | 'lab' | 'campaign' | 'systems';

interface AreaScript {
  asynchronous?: boolean;
  exported?: unknown;
  lossy?: boolean;
  failPlan?: string;
  failApply?: string;
  failSync?: boolean;
  applyResult?: unknown;
  resetResult?: boolean | undefined;
  backups?: BackupEntry[];
}

interface Rig {
  areas: ProgressAreas;
  backup: ProgressBackup;
  events: string[];
  sessionEvents: string[];
  appliedRoute(): RouteProgressV1 | undefined;
  plannedWith: Record<string, unknown>;
  scripts: Record<AreaKey, AreaScript>;
}

async function settle<T>(script: AreaScript, events: string[], name: string, run: () => T) {
  if (!script.asynchronous) {
    events.push(`${name}:start`);
    const result = run();
    events.push(`${name}:end`);
    return result;
  }
  return (async () => {
    events.push(`${name}:start`);
    await Promise.resolve();
    await Promise.resolve();
    const result = run();
    events.push(`${name}:end`);
    return result;
  })();
}

function buildRig(scripts: Partial<Record<AreaKey, AreaScript>> = {}): Rig {
  const all: Record<AreaKey, AreaScript> = {
    route: { applyResult: true, resetResult: true, ...scripts.route },
    lab: { applyResult: true, resetResult: true, ...scripts.lab },
    campaign: { applyResult: true, resetResult: true, ...scripts.campaign },
    systems: { applyResult: true, resetResult: true, ...scripts.systems },
  };
  const events: string[] = [];
  const sessionEvents: string[] = [];
  const plannedWith: Record<string, unknown> = {};
  let current: RouteProgressV1 = structuredClone(localProgress);
  let applied: RouteProgressV1 | undefined;

  const route: RouteArea = {
    getProgress: () => current,
    applyImport: (plan: RouteImportPlan) =>
      settle(all.route, events, 'route:applyImport', () => {
        current = plan.state;
        applied = plan.state;
        return all.route.applyResult as boolean;
      }),
    reset: () => settle(all.route, events, 'route:reset', () => all.route.resetResult as boolean),
    backups: () => all.route.backups ?? [],
  };

  const section = (key: Exclude<AreaKey, 'route'>): SectionArea => ({
    exportState: () => all[key].exported,
    planImport: (raw) => {
      events.push(`${key}:planImport`);
      plannedWith[key] = raw;
      if (all[key].failPlan) throw new Error(all[key].failPlan);
      const plan = { state: raw, lossy: all[key].lossy ?? false };
      return plan satisfies SectionPlan;
    },
    applyImport: () =>
      settle(all[key], events, `${key}:applyImport`, () => {
        if (all[key].failApply) throw new Error(all[key].failApply);
        return all[key].applyResult;
      }),
    reset: () => settle(all[key], events, `${key}:reset`, () => all[key].resetResult),
    backups: () => all[key].backups ?? [],
  });

  const sealed = (key: 'campaign' | 'systems', syncFails = false): SealedArea => ({
    ...section(key),
    syncDerivedSeals: () => {
      events.push(`${key}:sync`);
      if (syncFails) throw new Error(`${key} sync failed`);
    },
  });

  const areas: ProgressAreas = {
    route,
    lab: section('lab'),
    campaign: sealed('campaign', scripts.campaign?.failSync),
    systems: sealed('systems', scripts.systems?.failSync),
  };
  return {
    areas,
    backup: createProgressBackup({
      guide,
      areas,
      sessionResets: [
        () => {
          events.push('session:first');
          sessionEvents.push('first');
        },
        () => {
          events.push('session:second');
          sessionEvents.push('second');
        },
      ],
    }),
    events,
    sessionEvents,
    appliedRoute: () => applied,
    plannedWith,
    scripts: all,
  };
}

function importText(value: unknown): string {
  return JSON.stringify(value);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('exporting the progress', () => {
  function exportWithSections(exported: Partial<Record<'lab' | 'campaign' | 'systems', unknown>>) {
    vi.useFakeTimers();
    vi.setSystemTime('2026-03-04T05:06:07.000Z');
    const rig = buildRig({
      lab: { exported: exported.lab },
      campaign: { exported: exported.campaign },
      systems: { exported: exported.systems },
    });
    return rig.backup.exportProgress();
  }

  it('writes the route at the root, then the sections, then the export instant', () => {
    const file = exportWithSections({ lab: { a: 1 }, campaign: { b: 2 }, systems: { c: 3 } });
    const parsed = JSON.parse(file.text);
    expect(Object.keys(parsed)).toEqual([
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
    expect(parsed.language).toBe('go');
    expect(parsed.lab).toEqual({ a: 1 });
    expect(parsed.exportedAt).toBe('2026-03-04T05:06:07.000Z');
  });

  it('indents the text with two spaces', () => {
    const file = exportWithSections({ lab: { a: 1 } });
    expect(file.text.startsWith('{\n  "version": 1,\n  "language": "go",')).toBe(true);
  });

  it('names the file after the export date', () => {
    expect(exportWithSections({}).fileName).toBe('taller-progreso-2026-03-04.json');
  });

  it('leaves out a section whose state is undefined', () => {
    const file = exportWithSections({ lab: { a: 1 }, systems: { c: 3 } });
    const parsed = JSON.parse(file.text);
    expect(Object.keys(parsed)).not.toContain('campaign');
    expect(Object.keys(parsed).slice(-3)).toEqual(['lab', 'systems', 'exportedAt']);
  });
});

describe('listing and reading the backups', () => {
  const slot = (key: string, text: string): BackupEntry => ({ key, text });

  it('lists route, laboratory, campaign and Sistemas in that order with their area', () => {
    const rig = buildRig({
      systems: { backups: [slot('taller-sistemas-v1:respaldo', 's')] },
      campaign: { backups: [slot('taller-campana-v1:respaldo', 'c')] },
      lab: { backups: [slot('taller-laboratorio-v1:respaldo', 'l')] },
      route: { backups: [slot('taller-learning-v1:respaldo', 'r')] },
    });
    expect(rig.backup.listBackups()).toEqual([
      { area: 'recorrido', key: 'taller-learning-v1:respaldo', text: 'r' },
      { area: 'laboratorio', key: 'taller-laboratorio-v1:respaldo', text: 'l' },
      { area: 'campaña', key: 'taller-campana-v1:respaldo', text: 'c' },
      { area: 'Sistemas', key: 'taller-sistemas-v1:respaldo', text: 's' },
    ]);
  });

  it('lists nothing when no area has a slot', () => {
    expect(buildRig().backup.listBackups()).toEqual([]);
  });

  it('reads the slot again on every call', () => {
    const rig = buildRig({ lab: { backups: [slot('taller-laboratorio-v1:respaldo', 'viejo')] } });
    rig.backup.listBackups();
    rig.scripts.lab.backups = [slot('taller-laboratorio-v1:respaldo', 'nuevo')];
    expect(rig.backup.readBackup('taller-laboratorio-v1:respaldo')?.text).toBe('nuevo');
  });

  it('replaces every character outside a-z, 0-9 and the dash in the file name', () => {
    const rig = buildRig({ lab: { backups: [slot('taller-laboratorio-v1:respaldo', 'x')] } });
    expect(rig.backup.readBackup('taller-laboratorio-v1:respaldo')?.fileName).toBe(
      'taller-laboratorio-v1-respaldo.json',
    );
  });

  it('answers undefined for an unknown key', () => {
    const rig = buildRig({ lab: { backups: [slot('taller-laboratorio-v1:respaldo', 'x')] } });
    expect(rig.backup.readBackup('otra-clave')).toBeUndefined();
  });
});

describe('planning an import', () => {
  it('lets a broken JSON throw a SyntaxError', () => {
    const rig = buildRig();
    expect(() => rig.backup.planImport('{ roto')).toThrow(SyntaxError);
  });

  it.each([
    ['null', 'null'],
    ['an array', '[]'],
    ['a number', '5'],
    ['version 2', importText({ ...fullImport, version: 2 })],
  ])('rejects %s as an unsupported format', (_name, text) => {
    const rig = buildRig();
    expect(() => rig.backup.planImport(text)).toThrow('Formato de progreso no compatible.');
  });

  it('applies nothing when a section throws while planning', () => {
    const rig = buildRig({ systems: { failPlan: 'Sistemas rechazó la copia.' } });
    expect(() => rig.backup.planImport(importText(fullImport))).toThrow(
      'Sistemas rechazó la copia.',
    );
    expect(rig.events.filter((event) => event.endsWith(':applyImport'))).toEqual([]);
    expect(rig.appliedRoute()).toBeUndefined();
  });

  it('plans only the present sections, in campaign, laboratory, Sistemas order', () => {
    const rig = buildRig();
    rig.backup.planImport(importText({ ...incomingRoute, systems: { s: 1 }, campaign: { c: 1 } }));
    expect(rig.events).toEqual(['campaign:planImport', 'systems:planImport']);
    expect(rig.plannedWith).toEqual({ campaign: { c: 1 }, systems: { s: 1 } });
  });

  it('plans the three sections in order when all are present', () => {
    const rig = buildRig();
    rig.backup.planImport(importText(fullImport));
    expect(rig.events).toEqual(['campaign:planImport', 'lab:planImport', 'systems:planImport']);
  });

  it('merges the route with the current one', () => {
    const rig = buildRig();
    const plan = rig.backup.planImport(importText(incomingRoute));
    expect(plan.route.state.completed).toEqual(['rust-ownership', 'go-save', 'rust-first-session']);
    expect(plan.route.state.milestones).toEqual(['go-memory', 'go-files', 'rust-memory']);
    expect(plan.route.state.favorites).toEqual(['rustlings', 'go-tour']);
    expect(plan.route.state.quizAnswers).toEqual({
      'rust-ownership': 2,
      'go-save': 0,
      'rust-errors': 0,
    });
  });

  it('keeps the local language and minutes', () => {
    const plan = buildRig().backup.planImport(importText(incomingRoute));
    expect(plan.route.state.language).toBe('go');
    expect(plan.route.state.minutes).toBe(45);
  });

  it('lets a non-empty note override the local one and an empty note not', () => {
    const plan = buildRig().backup.planImport(importText(incomingRoute));
    expect(plan.route.state.notes.rust.learned).toBe('rust importado');
    expect(plan.route.state.notes.rust.next).toBe('rust local siguiente');
    expect(plan.route.state.notes.go.learned).toBe('go local aprendido');
    expect(plan.route.state.notes.go.next).toBe('go importado siguiente');
  });

  it('does not count lab, campaign, systems and exportedAt as route loss', () => {
    const text = importText({ ...fullImport, exportedAt: '2026-03-04T05:06:07.000Z' });
    expect(buildRig().backup.planImport(text).route.lossy).toBe(false);
  });

  it('counts an unknown step as route loss', () => {
    const text = importText({ ...incomingRoute, completed: ['paso-que-no-existe'] });
    expect(buildRig().backup.planImport(text).route.lossy).toBe(true);
  });
});

describe.each([
  ['synchronous', false],
  ['asynchronous', true],
])('applying an import with %s areas', (_name, asynchronous) => {
  const script = (extra: AreaScript = {}): AreaScript => ({ asynchronous, ...extra });
  const rigWith = (scripts: Partial<Record<AreaKey, AreaScript>> = {}) =>
    buildRig({
      route: script(scripts.route),
      lab: script(scripts.lab),
      campaign: script(scripts.campaign),
      systems: script(scripts.systems),
    });
  const importAll = (rig: Rig, text = importText(fullImport)) =>
    rig.backup.applyImport(rig.backup.planImport(text));

  it('applies the sections in plan order and then the route, each after the previous ended', async () => {
    const rig = rigWith();
    await importAll(rig);
    expect(rig.events.filter((event) => !event.endsWith(':planImport'))).toEqual([
      'campaign:applyImport:start',
      'campaign:applyImport:end',
      'lab:applyImport:start',
      'lab:applyImport:end',
      'systems:applyImport:start',
      'systems:applyImport:end',
      'route:applyImport:start',
      'route:applyImport:end',
      'systems:sync',
      'campaign:sync',
    ]);
  });

  it('resolves the success notice and applies the merged route', async () => {
    const rig = rigWith();
    const result = await importAll(rig);
    expect(result).toEqual({ notice: IMPORT_SUCCESS });
    expect(rig.appliedRoute()?.completed).toEqual([
      'rust-ownership',
      'go-save',
      'rust-first-session',
    ]);
  });

  it('names a laboratory that resolves false as not saved', async () => {
    const rig = rigWith({ lab: { applyResult: false } });
    const result = await importAll(rig);
    expect(result.notice).toBe(NOT_SAVED_HEAD + 'laboratorio' + NOT_SAVED_TAIL);
  });

  it('does not name a section whose apply resolves anything but false', async () => {
    const rig = rigWith({
      lab: { applyResult: undefined },
      campaign: { applyResult: { changed: true, storageAvailable: false } },
    });
    expect((await importAll(rig)).notice).toBe(IMPORT_SUCCESS);
  });

  it('names a route that does not save first and keeps the omission tail', async () => {
    const rig = rigWith({
      route: { applyResult: false },
      systems: { applyResult: false },
      campaign: { applyResult: false },
      lab: { lossy: true },
    });
    const result = await importAll(rig);
    expect(result.notice).toBe(
      NOT_SAVED_HEAD +
        'recorrido, campaña, Sistemas' +
        NOT_SAVED_TAIL +
        OMITTED_HEAD +
        'laboratorio.',
    );
  });

  it('treats any falsy route result as not saved', async () => {
    const rig = rigWith({ route: { applyResult: undefined } });
    expect((await importAll(rig)).notice).toBe(NOT_SAVED_HEAD + 'recorrido' + NOT_SAVED_TAIL);
  });

  it('lists the omitted areas as route, laboratory, campaign and Sistemas', async () => {
    const rig = rigWith({
      systems: { lossy: true },
      campaign: { lossy: true },
      lab: { lossy: true },
    });
    const text = importText({ ...fullImport, completed: ['paso-que-no-existe'] });
    expect((await importAll(rig, text)).notice).toBe(
      IMPORT_SUCCESS + OMITTED_HEAD + 'recorrido, laboratorio, campaña, Sistemas.',
    );
  });

  it('rejects when a section throws while applying and leaves the route unapplied', async () => {
    const rig = rigWith({ systems: { failApply: 'Sistemas falló al aplicar.' } });
    await expect(importAll(rig)).rejects.toThrow('Sistemas falló al aplicar.');
    expect(rig.appliedRoute()).toBeUndefined();
    expect(rig.events).not.toContain('route:applyImport:start');
  });
});

describe('syncing the derived seals', () => {
  it('logs a failing sync, still calls the other one and resolves the success notice', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rig = buildRig({ systems: { failSync: true } });
    const result = await rig.backup.applyImport(rig.backup.planImport(importText(fullImport)));
    expect(rig.events.slice(-2)).toEqual(['systems:sync', 'campaign:sync']);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0]?.[0]).toEqual(new Error('systems sync failed'));
    expect(result).toEqual({ notice: IMPORT_SUCCESS });
  });

  it('logs a failing campaign sync after the Sistemas one succeeded', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rig = buildRig({ campaign: { failSync: true } });
    const result = await rig.backup.applyImport(rig.backup.planImport(importText(fullImport)));
    expect(rig.events.slice(-2)).toEqual(['systems:sync', 'campaign:sync']);
    expect(consoleError.mock.calls[0]?.[0]).toEqual(new Error('campaign sync failed'));
    expect(result.notice).toBe(IMPORT_SUCCESS);
  });
});

describe.each([
  ['synchronous', false],
  ['asynchronous', true],
])('resetting everything with %s areas', (_name, asynchronous) => {
  const rigWith = (results: Partial<Record<AreaKey, boolean | undefined>> = {}) =>
    buildRig({
      route: { asynchronous, resetResult: results.route ?? true },
      lab: { asynchronous, resetResult: 'lab' in results ? results.lab : true },
      campaign: { asynchronous, resetResult: 'campaign' in results ? results.campaign : true },
      systems: { asynchronous, resetResult: 'systems' in results ? results.systems : true },
    });

  it('resets route, laboratory, campaign and Sistemas one after the other, then the session', async () => {
    const rig = rigWith();
    await rig.backup.resetAll();
    expect(rig.events).toEqual([
      'route:reset:start',
      'route:reset:end',
      'lab:reset:start',
      'lab:reset:end',
      'campaign:reset:start',
      'campaign:reset:end',
      'systems:reset:start',
      'systems:reset:end',
      'session:first',
      'session:second',
    ]);
  });

  it('resolves the success notice', async () => {
    expect(await rigWith().backup.resetAll()).toEqual({ notice: RESET_SUCCESS });
  });

  it.each([['route'], ['lab'], ['campaign'], ['systems']] as const)(
    'gives the failure notice when %s resolves false and still resets the session',
    async (failing) => {
      const rig = rigWith({ [failing]: false });
      expect(await rig.backup.resetAll()).toEqual({ notice: RESET_FAILED });
      expect(rig.sessionEvents).toEqual(['first', 'second']);
    },
  );

  it('does not count an undefined result as a failure', async () => {
    const rig = rigWith({ lab: undefined, campaign: undefined });
    expect(await rig.backup.resetAll()).toEqual({ notice: RESET_SUCCESS });
  });

  it('ignores the confirmation', async () => {
    const withPassword = await rigWith().backup.resetAll({ password: 'x' });
    const failing = await rigWith({ lab: false }).backup.resetAll({ password: 'x' });
    expect(withPassword).toEqual({ notice: RESET_SUCCESS });
    expect(failing).toEqual({ notice: RESET_FAILED });
  });
});

describe.each([
  ['master 2a278ad', master2a278adExport],
  ['d0e1b49', d0e1b49Export],
])('importing the frozen export of %s', (_name, frozenExport) => {
  it('combines it without omissions and keeps its completed steps', async () => {
    const rig = buildRig();
    const result = await rig.backup.applyImport(
      rig.backup.planImport(JSON.stringify(frozenExport)),
    );
    expect(result).toEqual({ notice: IMPORT_SUCCESS });
    expect(rig.appliedRoute()?.completed).toEqual(
      expect.arrayContaining(['rust-first-session', 'rust-ownership']),
    );
  });
});

describe('assertImportSize', () => {
  it('accepts exactly 10 MB', () => {
    expect(() => assertImportSize(10 * 1024 * 1024)).not.toThrow();
  });

  it('rejects one byte more', () => {
    expect(() => assertImportSize(10 * 1024 * 1024 + 1)).toThrow(
      'El archivo supera el tamaño permitido (10 MB).',
    );
  });
});

describe('importFailureNotice', () => {
  it('explains a SyntaxError as invalid JSON', () => {
    expect(importFailureNotice(new SyntaxError('Unexpected token'))).toBe(
      'No se pudo importar: el archivo no contiene JSON válido.',
    );
  });

  it('repeats the message of any other error', () => {
    expect(importFailureNotice(new Error('x'))).toBe('No se pudo importar: x');
  });
});
