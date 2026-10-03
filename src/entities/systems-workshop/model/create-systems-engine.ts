import { cloneJson } from '../../../shared/lib/clone-json';
import {
  describeLoadResult,
  loadVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../../shared/lib/versioned-storage';
import { hasPassingEvidence } from '../../exercise/@x/systems-workshop';
import {
  blankSystemsState,
  emptyRecord,
  mergeImportedRecords,
  parseSavedSystemsState,
  truncateNote,
  validateSystemsImport,
} from './progress';
import type {
  AnswerResult,
  NoteResult,
  ObserveResult,
  SystemsCatalog,
  SystemsConfig,
  SystemsEngine,
  SystemsInitResult,
  SystemsLanguage,
  SystemsStateV1,
  SystemsSyncResult,
  SystemsWorkshop,
  WorkshopRecord,
  WorkshopView,
} from './types';
import {
  SYSTEMS_LANGUAGES,
  isOptionIndex,
  isSystemsLanguage,
  validateSystemsConfig,
} from './validate-catalog';

const STORAGE_KEY = 'taller-systems-v1';

function recordKey(id: string, language: string): string {
  return `${language}:${id}`;
}

// Resultado del compilador que el laboratorio guardó para un ejercicio, si existe.
function labResultFor(lab: unknown, exerciseId: string): unknown {
  const records = (lab as { records?: Record<string, { result?: unknown } | undefined> } | null)
    ?.records;
  return records?.[exerciseId]?.result;
}

function describeWorkshop(
  workshop: SystemsWorkshop,
  progress: WorkshopRecord,
  storageAvailable: boolean,
): WorkshopView {
  const modelDone = workshop.objectives.every((goal) => progress.observed.includes(goal.id));
  return {
    ...cloneJson(workshop),
    progress: cloneJson(progress),
    modelDone,
    completed: modelDone && progress.code && progress.predicted,
    seals: Number(modelDone) + Number(progress.code) + Number(progress.predicted),
    storageAvailable,
  };
}

// Cada llamada crea un motor independiente: catálogo, progreso y estado del almacenamiento
// viven en esta clausura, no en el módulo.
export function createSystemsEngine(): SystemsEngine {
  let state: SystemsStateV1 = blankSystemsState();
  let catalog: SystemsCatalog = { workshops: new Map(), exercises: new Map() };
  let storageAvailable = true;

  function persist(): void {
    storageAvailable = writeVersionedState(STORAGE_KEY, state);
  }

  function requireWorkshop(id: string, language: string): SystemsWorkshop {
    const workshop = catalog.workshops.get(id);
    if (!workshop || !isSystemsLanguage(language))
      throw new Error('Taller o lenguaje desconocido.');
    return workshop;
  }

  // Leer crea el registro vacío en `state` sin persistirlo; exportState lo muestra.
  function record(id: string, language: string): WorkshopRecord {
    requireWorkshop(id, language);
    const key = recordKey(id, language);
    return state.records[key] || (state.records[key] = emptyRecord());
  }

  function init(config: SystemsConfig): SystemsInitResult {
    const validated = validateSystemsConfig(config);
    catalog = validated;
    const loaded = loadVersionedState(STORAGE_KEY, {
      blank: blankSystemsState,
      parse: (raw) => parseSavedSystemsState(validated, raw),
    });
    state = loaded.state;
    storageAvailable = loaded.status !== 'unavailable';
    return { storageAvailable, loadWarning: describeLoadResult(loaded, 'de Sistemas') };
  }

  function get(id: string, language: string): WorkshopView {
    const workshop = requireWorkshop(id, language);
    return describeWorkshop(workshop, record(id, language), storageAvailable);
  }

  function observe(id: string, language: string, goals: unknown): ObserveResult {
    const workshop = requireWorkshop(id, language);
    const progress = record(id, language);
    const allowed = new Set(workshop.objectives.map((goal) => goal.id));
    const candidates: string[] = Array.isArray(goals) ? goals : [];
    const added = candidates.filter(
      (goal) => allowed.has(goal) && !progress.observed.includes(goal),
    );
    if (added.length) {
      progress.observed = [...new Set([...progress.observed, ...added])];
      persist();
    }
    return { added: [...new Set(added)], ...get(id, language) };
  }

  function answer(id: string, language: string, index: number): AnswerResult {
    const workshop = requireWorkshop(id, language);
    if (!isOptionIndex(index, workshop.prediction.options.length))
      throw new Error('Respuesta fuera de rango.');
    const progress = record(id, language);
    progress.answer = index;
    progress.predicted = progress.predicted || index === workshop.prediction.answer;
    persist();
    return {
      correct: index === workshop.prediction.answer,
      explanation: workshop.prediction.explanation,
      ...get(id, language),
    };
  }

  function syncLab(lab?: unknown): SystemsSyncResult {
    let changed = false;
    for (const workshop of catalog.workshops.values())
      for (const language of SYSTEMS_LANGUAGES) {
        if (markCodeSealed(workshop, language, lab)) changed = true;
      }
    if (changed) persist();
    return { changed, storageAvailable };
  }

  // Sella el código del taller si el laboratorio tiene evidencia aprobada de su núcleo.
  function markCodeSealed(
    workshop: SystemsWorkshop,
    language: SystemsLanguage,
    lab: unknown,
  ): boolean {
    const exercise = catalog.exercises.get(workshop.code[language])!;
    if (!hasPassingEvidence(labResultFor(lab, exercise.id), exercise.tests)) return false;
    const progress = record(workshop.id, language);
    if (progress.code) return false;
    progress.code = true;
    return true;
  }

  function validateImport(raw: unknown): SystemsStateV1 | undefined {
    return validateSystemsImport(catalog, raw);
  }

  function importState(raw: unknown): void {
    const incoming = validateImport(raw);
    if (!incoming) return;
    mergeImportedRecords(state, incoming);
    persist();
  }

  function setStep(id: string, language: string, index: number, checked: boolean): void {
    const workshop = requireWorkshop(id, language);
    if (!isOptionIndex(index, workshop.steps.length)) throw new Error('Etapa desconocida.');
    const progress = record(id, language);
    progress.steps = checked
      ? [...new Set([...progress.steps, index])]
      : progress.steps.filter((step) => step !== index);
    persist();
  }

  function setNote(id: string, language: string, note: string): NoteResult {
    record(id, language).note = truncateNote(String(note));
    persist();
    return { storageAvailable };
  }

  function reset(): void {
    state = blankSystemsState();
    removeVersionedState(STORAGE_KEY);
  }

  return {
    init,
    get,
    observe,
    answer,
    syncLab,
    validateImport,
    importState,
    list: (language) => [...catalog.workshops.keys()].map((id) => get(id, language)),
    setStep,
    setNote,
    exportState: () => cloneJson(state),
    reset,
  };
}
