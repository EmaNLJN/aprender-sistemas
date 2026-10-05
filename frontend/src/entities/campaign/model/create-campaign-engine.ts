import { cloneJson } from '../../../shared/lib/clone-json';
import { isLosslessNormalization } from '../../../shared/lib/is-lossless-normalization';
import {
  describeLoadResult,
  openVersionedStore,
  type VersionedStore,
} from '../../../shared/lib/versioned-storage';
import {
  applyLabEvidence,
  mergeImportedState,
  parseSavedCampaignState,
  sanitizeCampaignState,
} from './progress';
import {
  blankCampaignState,
  deriveWorlds,
  isCampaignLanguage,
  isOptionIndex,
  permissionToAttempt,
  summarizeWorlds,
  totalXP,
} from './rules';
import type {
  CampaignCatalog,
  CampaignConfig,
  CampaignEngine,
  CampaignImportPlan,
  CampaignLanguage,
  CampaignLabState,
  CampaignStateV1,
  CheckpointAnswerResult,
  DerivedWorld,
  ImportResult,
  InitResult,
  RefreshResult,
  ResetResult,
  SyncLabResult,
} from './types';
import { validateCampaignConfig } from './validate-config';

const STORAGE_KEY = 'taller-campaign-v1';

function rejectedAnswer(passed: boolean, reasons: string[]): CheckpointAnswerResult {
  return { accepted: false, correct: false, passed, explanation: '', reasons };
}

function requireLanguage(language: string): CampaignLanguage {
  if (!isCampaignLanguage(language)) throw new Error('Lenguaje de campaña inválido.');
  return language;
}

// Each call creates an independent engine: catalog, progress and storage state
// live in this closure, not in the module.
export function createCampaignEngine(): CampaignEngine {
  let state: CampaignStateV1 = blankCampaignState();
  let catalog: CampaignCatalog | null = null;
  let storageAvailable = true;
  let store: VersionedStore<CampaignStateV1> | null = null;
  // Total XP already reported to the `syncLab` caller; renders (`refreshFromLab`) do not move it.
  let lastReportedXP = 0;

  function assertReady(): CampaignCatalog {
    if (!catalog) throw new Error('Inicializá la campaña antes de usarla.');
    return catalog;
  }

  function requireStore(): VersionedStore<CampaignStateV1> {
    if (!store) throw new Error('Inicializá la campaña antes de usarla.');
    return store;
  }

  // The store may merge with what another tab saved and returns the final state:
  // no reference to the previous state is kept after persisting.
  function persist(): void {
    const result = requireStore().write(state);
    state = result.state;
    storageAvailable = result.saved;
  }

  function worldsFor(language: string): DerivedWorld[] {
    const ready = assertReady();
    return deriveWorlds(ready, state, requireLanguage(language));
  }

  function init(config: CampaignConfig, labState?: CampaignLabState | null): InitResult {
    const validated = validateCampaignConfig(config);
    catalog = validated;
    store = openVersionedStore(STORAGE_KEY, {
      blank: blankCampaignState,
      parse: (raw) => parseSavedCampaignState(validated, raw),
      // Local state wins on the editable fields; achievements from the other tab survive.
      merge(stored, local) {
        const merged = cloneJson(stored);
        mergeImportedState(merged, local);
        return merged;
      },
    });
    const loaded = store.load();
    state = loaded.state;
    storageAvailable = loaded.writable;
    // Seals the saved key lacks but the lab has are derived in memory (without writing)
    // before fixing the baseline, so the first `syncLab` reports only the new XP.
    if (labState) applyLabEvidence(state, validated, labState);
    lastReportedXP = totalXP(validated, state);
    return {
      ready: true,
      storageAvailable,
      loadWarning: describeLoadResult(loaded, 'de campaña'),
    };
  }

  function refreshFromLab(labState?: CampaignLabState | null): RefreshResult {
    const changed = applyLabEvidence(state, assertReady(), labState);
    return { changed, storageAvailable };
  }

  function syncLab(labState?: CampaignLabState | null): SyncLabResult {
    const ready = assertReady();
    applyLabEvidence(state, ready, labState);
    // Also writes what an earlier `refreshFromLab` derived and left unsaved.
    const changed = requireStore().hasUnsavedChanges(state);
    if (changed) persist();
    const total = totalXP(ready, state);
    const xpGained = total - lastReportedXP;
    lastReportedXP = total;
    return { changed, xpGained, totalXP: total, storageAvailable };
  }

  function answerCheckpoint(worldId: string, index: number): CheckpointAnswerResult {
    const ready = assertReady();
    const world = ready.worldById.get(worldId);
    if (!world) return rejectedAnswer(false, ['Ese mundo no existe.']);
    // The language list always contains the world: it comes from that same catalog.
    const status = worldsFor(world.language).find((item) => item.id === worldId)!;
    if (!status.checkpointReady)
      return rejectedAnswer(status.checkpointPassed, status.checkpointReasons);
    if (!isOptionIndex(index, world.checkpoint.options.length))
      return rejectedAnswer(status.checkpointPassed, ['Elegí una de las respuestas disponibles.']);
    const correct = index === world.checkpoint.answer;
    const passed = status.checkpointPassed || correct;
    state.checkpoints[worldId] = { passed, lastAnswer: index };
    persist();
    return {
      accepted: true,
      correct,
      passed,
      explanation: world.checkpoint.explanation,
      reasons: [],
    };
  }

  // Computes the resulting state without touching `state`, `raw` or storage.
  function planImport(raw: unknown): CampaignImportPlan {
    const ready = assertReady();
    const planned = cloneJson(state);
    if (raw === undefined || raw === null) return { state: planned, lossy: false };
    const incoming = sanitizeCampaignState(ready, raw);
    mergeImportedState(planned, incoming);
    return { state: planned, lossy: !isLosslessNormalization(raw, incoming) };
  }

  function applyImport(plan: CampaignImportPlan): ImportResult {
    assertReady();
    state = cloneJson(plan.state);
    const changed = requireStore().hasUnsavedChanges(state);
    if (changed) persist();
    return { changed, storageAvailable };
  }

  function reset(): ResetResult {
    assertReady();
    state = blankCampaignState();
    lastReportedXP = 0;
    const removed = requireStore().remove();
    return { storageAvailable, removed };
  }

  return {
    init,
    refreshFromLab,
    syncLab,
    getWorlds: worldsFor,
    canAttempt(id, language) {
      return permissionToAttempt(assertReady(), state, id, language);
    },
    answerCheckpoint,
    getSummary(language) {
      const worlds = worldsFor(language);
      return summarizeWorlds(
        worlds,
        totalXP(assertReady(), state, requireLanguage(language)),
        storageAvailable,
      );
    },
    exportState() {
      assertReady();
      return cloneJson(state);
    },
    planImport,
    applyImport,
    backups: () => requireStore().backups(),
    reset,
  };
}
