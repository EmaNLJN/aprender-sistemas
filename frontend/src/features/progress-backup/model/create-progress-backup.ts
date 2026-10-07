import {
  ROUTE_FORMAT_ERROR,
  mergeRouteProgress,
  parseRouteProgress,
  type GuideData,
  type RouteImportPlan,
} from '../../../entities/guide';
import { isLosslessNormalization } from '../../../shared/lib/is-lossless-normalization';
import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type {
  AreaName,
  BackupListing,
  PlannedSection,
  ProgressAreas,
  ProgressBackup,
  ProgressBackupOptions,
  ProgressFile,
  ProgressImportPlan,
  ProgressNotice,
  SealedArea,
} from './types';

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

// Claves de la copia que pertenecen a otros almacenes y no al recorrido.
const NON_ROUTE_KEYS = ['lab', 'campaign', 'systems', 'exportedAt'];

type SectionKey = 'campaign' | 'lab' | 'systems';

// Secciones importables en el orden en que se planifican y aplican.
const IMPORT_SECTIONS: { area: AreaName; key: SectionKey }[] = [
  { area: 'campaña', key: 'campaign' },
  { area: 'laboratorio', key: 'lab' },
  { area: 'Sistemas', key: 'systems' },
];

// Orden en que el aviso nombra las áreas con datos omitidos.
const NOTICE_AREAS: AreaName[] = ['recorrido', 'laboratorio', 'campaña', 'Sistemas'];

export function assertImportSize(size: number): void {
  if (size > MAX_IMPORT_BYTES) throw new Error('El archivo supera el tamaño permitido (10 MB).');
}

export function importFailureNotice(error: unknown): string {
  const reason =
    error instanceof SyntaxError ? 'el archivo no contiene JSON válido.' : (error as Error).message;
  return 'No se pudo importar: ' + reason;
}

// Ranuras de respaldo de todos los almacenes, cada una con el área a la que pertenece.
function collectBackups(areas: ProgressAreas): BackupListing[] {
  const sources: [AreaName, ProgressAreas[keyof ProgressAreas]][] = [
    ['recorrido', areas.route],
    ['laboratorio', areas.lab],
    ['campaña', areas.campaign],
    ['Sistemas', areas.systems],
  ];
  return sources.flatMap(([area, source]) => source.backups().map((slot) => ({ area, ...slot })));
}

function exportProgress(areas: ProgressAreas): ProgressFile {
  const text = JSON.stringify(
    {
      ...areas.route.getProgress(),
      lab: areas.lab.exportState(),
      campaign: areas.campaign.exportState(),
      systems: areas.systems.exportState(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
  return { fileName: `taller-progreso-${new Date().toISOString().slice(0, 10)}.json`, text };
}

// Calcula el recorrido resultante sin tocar el estado del recorrido. Lanza si el JSON no es
// un objeto reconocible. `lossy` avisa que se descartaron o cambiaron datos de la copia.
function planRouteImport(
  rawImport: unknown,
  guide: GuideData,
  areas: ProgressAreas,
): RouteImportPlan {
  if (!isPlainObject(rawImport)) throw new Error(ROUTE_FORMAT_ERROR);
  const parsed = parseRouteProgress(rawImport, guide);
  const rawRoute = Object.fromEntries(
    Object.entries(rawImport).filter(([key]) => !NON_ROUTE_KEYS.includes(key)),
  );
  return {
    state: mergeRouteProgress(areas.route.getProgress(), parsed.state),
    lossy: parsed.dropped > 0 || !isLosslessNormalization(rawRoute, parsed.state),
  };
}

// Planifica cada sección presente: si alguna lanza, todavía no se aplicó nada.
function planSectionImports(
  rawImport: Record<string, unknown>,
  areas: ProgressAreas,
): PlannedSection[] {
  return IMPORT_SECTIONS.filter((section) => rawImport[section.key]).map((section) => {
    const source = areas[section.key];
    return { area: section.area, source, plan: source.planImport(rawImport[section.key]) };
  });
}

// `unsaved`: áreas cuya copia quedó aplicada sólo en memoria (el almacén no pudo escribir).
function importNotice(plan: ProgressImportPlan, unsaved: Set<AreaName>): string {
  const lossy = new Set(plan.sections.filter((item) => item.plan.lossy).map((item) => item.area));
  if (plan.route.lossy) lossy.add('recorrido');
  const areas = NOTICE_AREAS.filter((area) => lossy.has(area));
  const unsavedAreas = NOTICE_AREAS.filter((area) => unsaved.has(area));
  const notice = unsavedAreas.length
    ? `Copia importada en esta sesión, pero no se pudo guardar: ${unsavedAreas.join(', ')}. Exportá tu avance para conservarlo.`
    : 'Copia importada y combinada con tu avance actual.';
  if (!areas.length) return notice;
  return `${notice} Se omitieron datos que esta versión no reconoce: ${areas.join(', ')}.`;
}

// Persiste los sellos que Sistemas y Campaña derivan del laboratorio recién importado.
// La copia ya quedó aplicada: un fallo acá sólo se registra, y cada sincronización
// es independiente para que un fallo de Sistemas no impida la de campaña.
function syncDerivedSeals(areas: ProgressAreas): void {
  const sealed: SealedArea[] = [areas.systems, areas.campaign];
  for (const area of sealed) {
    try {
      area.syncDerivedSeals();
    } catch (error) {
      console.error(error);
    }
  }
}

async function applyImport(
  plan: ProgressImportPlan,
  areas: ProgressAreas,
): Promise<ProgressNotice> {
  // Sólo `false` cuenta como «no se guardó» en las secciones.
  const unsaved = new Set<AreaName>();
  for (const { area, source, plan: sectionPlan } of plan.sections) {
    if ((await source.applyImport(sectionPlan)) === false) unsaved.add(area);
  }
  if (!(await areas.route.applyImport(plan.route))) unsaved.add('recorrido');
  syncDerivedSeals(areas);
  return { notice: importNotice(plan, unsaved) };
}

async function resetAll(
  areas: ProgressAreas,
  sessionResets: readonly (() => void)[],
): Promise<ProgressNotice> {
  // Un adaptador ausente devuelve undefined y no cuenta como fallo; sólo `false` lo es.
  const removals = [
    await areas.route.reset(),
    await areas.lab.reset(),
    await areas.campaign.reset(),
    await areas.systems.reset(),
  ];
  for (const resetSession of sessionResets) resetSession();
  return {
    notice: removals.includes(false)
      ? 'No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.'
      : 'Progreso reiniciado. Un nuevo comienzo.',
  };
}

export function createProgressBackup({
  guide,
  areas,
  sessionResets,
}: ProgressBackupOptions): ProgressBackup {
  return {
    exportProgress: () => exportProgress(areas),
    listBackups: () => collectBackups(areas),
    // Vuelve a leer la ranura al pedirla: el texto es el vigente, no el de la última vista.
    readBackup(key) {
      const backup = collectBackups(areas).find((item) => item.key === key);
      if (!backup) return undefined;
      return { fileName: `${key.replace(/[^a-z0-9-]/g, '-')}.json`, text: backup.text };
    },
    planImport(text) {
      const rawImport: unknown = JSON.parse(text);
      const route = planRouteImport(rawImport, guide, areas);
      const sections = planSectionImports(rawImport as Record<string, unknown>, areas);
      return { route, sections };
    },
    applyImport: (plan) => applyImport(plan, areas),
    resetAll: () => resetAll(areas, sessionResets),
  };
}
