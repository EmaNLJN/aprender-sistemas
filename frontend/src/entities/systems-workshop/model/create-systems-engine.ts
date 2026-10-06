import { createStore } from 'zustand/vanilla';
import { cloneJson } from '../../../shared/lib/clone-json';
import { isLosslessNormalization } from '../../../shared/lib/is-lossless-normalization';
import {
  describeLoadResult,
  openVersionedStore,
  type VersionedStore,
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
  SystemsImportPlan,
  SystemsInitResult,
  SystemsLanguage,
  SystemsResetResult,
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

export function createSystemsEngine(): SystemsEngine {
  let state: SystemsStateV1 = blankSystemsState();
  let catalog: SystemsCatalog = { workshops: new Map(), exercises: new Map() };
  let storageAvailable = true;
  let store: VersionedStore<SystemsStateV1> | null = null;
  const changes = createStore<{ revision: number }>(() => ({ revision: 0 }));

  function requireStore(): VersionedStore<SystemsStateV1> {
    if (!store) throw new Error('Inicializá Sistemas antes de usarlo.');
    return store;
  }

  // The store may merge with what another tab saved and returns the final state:
  // records obtained before persisting go stale; each method requests them again
  // with `record()`.
  function persist(): void {
    const result = requireStore().write(state);
    state = result.state;
    storageAvailable = result.saved;
  }

  function requireWorkshop(id: string, language: string): SystemsWorkshop {
    const workshop = catalog.workshops.get(id);
    if (!workshop || !isSystemsLanguage(language))
      throw new Error('Taller o lenguaje desconocido.');
    return workshop;
  }

  function record(id: string, language: string): WorkshopRecord {
    requireWorkshop(id, language);
    const key = recordKey(id, language);
    return state.records[key] || (state.records[key] = emptyRecord());
  }

  function init(config: SystemsConfig): SystemsInitResult {
    const validated = validateSystemsConfig(config);
    catalog = validated;
    store = openVersionedStore(STORAGE_KEY, {
      blank: blankSystemsState,
      parse: (raw) => parseSavedSystemsState(validated, raw),
      merge(stored, local) {
        const merged = cloneJson(stored);
        mergeImportedRecords(merged, local);
        return merged;
      },
    });
    const loaded = store.load();
    state = loaded.state;
    storageAvailable = loaded.writable;
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

  function refreshFromLab(lab?: unknown): SystemsSyncResult {
    let changed = false;
    for (const workshop of catalog.workshops.values())
      for (const language of SYSTEMS_LANGUAGES) {
        if (markCodeSealed(workshop, language, lab)) changed = true;
      }
    return { changed, storageAvailable };
  }

  function syncLab(lab?: unknown): SystemsSyncResult {
    refreshFromLab(lab);
    const changed = requireStore().hasUnsavedChanges(state);
    if (changed) persist();
    return { changed, storageAvailable };
  }

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

  function planImport(raw: unknown): SystemsImportPlan {
    const planned = cloneJson(state);
    const incoming = validateSystemsImport(catalog, raw);
    if (!incoming) return { state: planned, lossy: false };
    mergeImportedRecords(planned, incoming);
    return { state: planned, lossy: !isLosslessNormalization(raw, incoming) };
  }

  function applyImport(plan: SystemsImportPlan): SystemsSyncResult {
    state = cloneJson(plan.state);
    const changed = requireStore().hasUnsavedChanges(state);
    if (changed) persist();
    return { changed, storageAvailable };
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

  function reset(): SystemsResetResult {
    state = blankSystemsState();
    return { removed: requireStore().remove() };
  }

  return {
    changes,
    init,
    get,
    observe,
    answer,
    refreshFromLab,
    syncLab,
    planImport,
    applyImport,
    backups: () => requireStore().backups(),
    list: (language) => [...catalog.workshops.keys()].map((id) => get(id, language)),
    setStep,
    setNote,
    exportState: () => cloneJson(state),
    reset,
  };
}

export const systemsEngine: SystemsEngine = createSystemsEngine();
