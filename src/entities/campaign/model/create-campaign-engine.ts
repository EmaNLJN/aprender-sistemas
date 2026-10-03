import { cloneJson } from '../../../shared/lib/clone-json';
import {
  describeLoadResult,
  loadVersionedState,
  removeVersionedState,
  writeVersionedState,
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
  CampaignLanguage,
  CampaignLabState,
  CampaignStateV1,
  CheckpointAnswerResult,
  DerivedWorld,
  ImportResult,
  InitResult,
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

// Cada llamada crea un motor independiente: catálogo, progreso y estado del almacenamiento
// viven en esta clausura, no en el módulo.
export function createCampaignEngine(): CampaignEngine {
  let state: CampaignStateV1 = blankCampaignState();
  let catalog: CampaignCatalog | null = null;
  let storageAvailable = true;

  function assertReady(): CampaignCatalog {
    if (!catalog) throw new Error('Inicializá la campaña antes de usarla.');
    return catalog;
  }

  function persist(): void {
    storageAvailable = writeVersionedState(STORAGE_KEY, state);
  }

  function worldsFor(language: string): DerivedWorld[] {
    const ready = assertReady();
    return deriveWorlds(ready, state, requireLanguage(language));
  }

  function init(config: CampaignConfig): InitResult {
    const validated = validateCampaignConfig(config);
    catalog = validated;
    const loaded = loadVersionedState(STORAGE_KEY, {
      blank: blankCampaignState,
      parse: (raw) => parseSavedCampaignState(validated, raw),
    });
    state = loaded.state;
    storageAvailable = loaded.status !== 'unavailable';
    return {
      ready: true,
      storageAvailable,
      loadWarning: describeLoadResult(loaded, 'de campaña'),
    };
  }

  function syncLab(labState?: CampaignLabState | null): SyncLabResult {
    const ready = assertReady();
    const before = totalXP(ready, state);
    const changed = applyLabEvidence(state, ready, labState);
    if (changed) persist();
    return {
      changed,
      xpGained: totalXP(ready, state) - before,
      totalXP: totalXP(ready, state),
      storageAvailable,
    };
  }

  function answerCheckpoint(worldId: string, index: number): CheckpointAnswerResult {
    const ready = assertReady();
    const world = ready.worldById.get(worldId);
    if (!world) return rejectedAnswer(false, ['Ese mundo no existe.']);
    // La lista del lenguaje siempre contiene el mundo: nace de ese mismo catálogo.
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

  function validateImport(raw: unknown): CampaignStateV1 | undefined {
    const ready = assertReady();
    return raw === undefined || raw === null ? undefined : sanitizeCampaignState(ready, raw);
  }

  function importState(raw: unknown): ImportResult {
    const ready = assertReady();
    if (raw === undefined || raw === null) return { changed: false, storageAvailable };
    const incoming = sanitizeCampaignState(ready, raw);
    const before = JSON.stringify(state);
    mergeImportedState(state, incoming);
    const changed = before !== JSON.stringify(state);
    if (changed) persist();
    return { changed, storageAvailable };
  }

  function reset(): ResetResult {
    assertReady();
    state = blankCampaignState();
    removeVersionedState(STORAGE_KEY);
    return { storageAvailable };
  }

  return {
    init,
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
    validateImport,
    importState,
    reset,
  };
}
