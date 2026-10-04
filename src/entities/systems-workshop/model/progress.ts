import { isBlankText } from '../../../shared/lib/is-blank-text';
import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { ParsedState } from '../../../shared/lib/versioned-storage';
import type { SystemsCatalog, SystemsStateV1, SystemsWorkshop, WorkshopRecord } from './types';
import { isOptionIndex, isSystemsLanguage } from './validate-catalog';

interface BackupShape {
  version: 1;
  records: Record<string, unknown>;
}

const MAX_NOTE_LENGTH = 10000;

export function blankSystemsState(): SystemsStateV1 {
  return { version: 1, records: {} };
}

export function emptyRecord(): WorkshopRecord {
  return {
    observed: [],
    code: false,
    predicted: false,
    answer: null,
    steps: [],
    note: '',
  };
}

export function truncateNote(note: string): string {
  return note.slice(0, MAX_NOTE_LENGTH);
}

function assertBackupShape(raw: unknown): asserts raw is BackupShape {
  if (!isPlainObject(raw) || raw.version !== 1 || !isPlainObject(raw.records))
    throw new Error('La copia de Sistemas no es compatible.');
}

// Un registro pertenece al catálogo si su nombre es `lenguaje:taller` conocido.
function workshopFor(catalog: SystemsCatalog, name: string): SystemsWorkshop | null {
  const [language, id, ...rest] = name.split(':');
  if (rest.length || !isSystemsLanguage(language) || !catalog.workshops.has(id)) return null;
  return catalog.workshops.get(id) ?? null;
}

function assertRecordFields(id: string, value: unknown): asserts value is Record<string, unknown> {
  if (!isPlainObject(value) || !Array.isArray(value.observed) || !Array.isArray(value.steps))
    throw new Error('Progreso de taller inválido: ' + id);
  for (const field of ['code', 'predicted'])
    if (typeof value[field] !== 'boolean') throw new Error('Sello de taller inválido: ' + id);
}

function sanitizeRecord(workshop: SystemsWorkshop, value: unknown): WorkshopRecord {
  const id = workshop.id;
  assertRecordFields(id, value);
  const allowed = new Set(workshop.objectives.map((goal) => goal.id));
  if (value.answer !== null && !isOptionIndex(value.answer, workshop.prediction.options.length))
    throw new Error('Respuesta de taller inválida: ' + id);
  if (typeof value.note !== 'string') throw new Error('Nota de taller inválida: ' + id);
  const observed = value.observed as string[];
  const steps = value.steps as unknown[];
  return {
    observed: [...new Set(observed.filter((goal) => allowed.has(goal)))],
    code: value.code as boolean,
    predicted: value.predicted as boolean,
    answer: value.answer as number | null,
    steps: [
      ...new Set(steps.filter((index) => isOptionIndex(index, workshop.steps.length))),
    ] as number[],
    note: truncateNote(value.note),
  };
}

// Importación: estricta y todo-o-nada; un registro inválido rechaza la copia.
export function validateSystemsImport(
  catalog: SystemsCatalog,
  raw: unknown,
): SystemsStateV1 | undefined {
  if (raw === undefined || raw === null) return undefined;
  assertBackupShape(raw);
  const clean = blankSystemsState();
  for (const [name, value] of Object.entries(raw.records)) {
    const workshop = workshopFor(catalog, name);
    if (workshop) clean.records[name] = sanitizeRecord(workshop, value);
  }
  return clean;
}

// Carga: tolerante por registro. Descarta y cuenta los inválidos o de talleres desconocidos.
export function parseSavedSystemsState(
  catalog: SystemsCatalog,
  raw: unknown,
): ParsedState<SystemsStateV1> {
  assertBackupShape(raw);
  const clean = blankSystemsState();
  let dropped = 0;
  for (const [name, value] of Object.entries(raw.records)) {
    const workshop = workshopFor(catalog, name);
    if (!workshop) {
      dropped++;
      continue;
    }
    try {
      clean.records[name] = sanitizeRecord(workshop, value);
    } catch {
      dropped++;
    }
  }
  return { state: clean, dropped };
}

function unionOf<T>(first: T[], second: T[]): T[] {
  return [...new Set([...first, ...second])];
}

// Fusión monótona: nunca quita observaciones, sellos ni etapas del estado actual.
export function mergeImportedRecords(state: SystemsStateV1, incoming: SystemsStateV1): void {
  for (const [name, next] of Object.entries(incoming.records)) {
    const prev = state.records[name] || emptyRecord();
    state.records[name] = {
      observed: unionOf(prev.observed, next.observed),
      code: prev.code || next.code,
      predicted: prev.predicted || next.predicted,
      answer: next.answer ?? prev.answer,
      steps: unionOf(prev.steps, next.steps),
      note: isBlankText(next.note) ? prev.note : next.note,
    };
  }
}
