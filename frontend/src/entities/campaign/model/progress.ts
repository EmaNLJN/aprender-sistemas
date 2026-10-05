import { isPlainObject } from '../../../shared/lib/is-plain-object';
import type { ParsedState } from '../../../shared/lib/versioned-storage';
import { hasPassingEvidence } from '../../exercise/@x/campaign';
import { blankCampaignState, isOptionIndex, sealOf } from './rules';
import type {
  CampaignCatalog,
  CampaignCheckpointRecord,
  CampaignSeal,
  CampaignStateV1,
  CampaignWorld,
} from './types';

interface BackupShape {
  version: 1;
  seals: Record<string, unknown>;
  checkpoints: Record<string, unknown>;
}

const SEAL_FLAGS = ['code', 'prediction', 'assisted'] as const;

function assertBackupShape(raw: unknown): asserts raw is BackupShape {
  if (
    !isPlainObject(raw) ||
    raw.version !== 1 ||
    !isPlainObject(raw.seals) ||
    !isPlainObject(raw.checkpoints)
  ) {
    throw new Error('La copia de campaña no tiene un formato compatible.');
  }
}

function sanitizeSeal(id: string, value: unknown): CampaignSeal {
  if (!isPlainObject(value)) throw new Error('Sello de ejercicio inválido: ' + id);
  for (const flag of SEAL_FLAGS) {
    if (value[flag] !== undefined && typeof value[flag] !== 'boolean')
      throw new Error('Sello de ejercicio inválido: ' + id);
  }
  return {
    code: value.code === true,
    prediction: value.prediction === true,
    assisted: value.assisted === true,
  };
}

function sanitizeCheckpoint(
  world: CampaignWorld,
  id: string,
  value: unknown,
): CampaignCheckpointRecord {
  if (!isPlainObject(value) || typeof value.passed !== 'boolean')
    throw new Error('Checkpoint inválido: ' + id);
  const answer = value.lastAnswer ?? null;
  if (answer !== null && !isOptionIndex(answer, world.checkpoint.options.length)) {
    throw new Error('Respuesta de checkpoint inválida: ' + id);
  }
  return { passed: value.passed, lastAnswer: answer };
}

export function sanitizeCampaignState(catalog: CampaignCatalog, raw: unknown): CampaignStateV1 {
  assertBackupShape(raw);
  const clean = blankCampaignState();
  for (const [id, value] of Object.entries(raw.seals)) {
    if (catalog.exercises.has(id)) clean.seals[id] = sanitizeSeal(id, value);
  }
  for (const [id, value] of Object.entries(raw.checkpoints)) {
    const world = catalog.worldById.get(id);
    if (world) clean.checkpoints[id] = sanitizeCheckpoint(world, id, value);
  }
  return clean;
}

export function parseSavedCampaignState(
  catalog: CampaignCatalog,
  raw: unknown,
): ParsedState<CampaignStateV1> {
  assertBackupShape(raw);
  const clean = blankCampaignState();
  let dropped = 0;
  for (const [id, value] of Object.entries(raw.seals)) {
    try {
      if (!catalog.exercises.has(id)) throw new Error('ID desconocido: ' + id);
      clean.seals[id] = sanitizeSeal(id, value);
    } catch {
      dropped++;
    }
  }
  for (const [id, value] of Object.entries(raw.checkpoints)) {
    try {
      const world = catalog.worldById.get(id);
      if (!world) throw new Error('ID desconocido: ' + id);
      clean.checkpoints[id] = sanitizeCheckpoint(world, id, value);
    } catch {
      dropped++;
    }
  }
  return { state: clean, dropped };
}

function mergeSeals(state: CampaignStateV1, incoming: CampaignStateV1): void {
  for (const [id, value] of Object.entries(incoming.seals)) {
    const prior = sealOf(state, id);
    state.seals[id] = {
      code: prior.code || value.code,
      prediction: prior.prediction || value.prediction,
      assisted: prior.assisted || value.assisted,
    };
  }
}

function mergeCheckpoints(state: CampaignStateV1, incoming: CampaignStateV1): void {
  for (const [id, value] of Object.entries(incoming.checkpoints)) {
    const prior = state.checkpoints[id];
    state.checkpoints[id] = {
      passed: Boolean(prior?.passed || value.passed),
      lastAnswer: value.lastAnswer ?? prior?.lastAnswer ?? null,
    };
  }
}

export function mergeImportedState(state: CampaignStateV1, incoming: CampaignStateV1): void {
  mergeSeals(state, incoming);
  mergeCheckpoints(state, incoming);
}

function labRecordsOf(labState: unknown): Record<string, unknown> | null {
  const records = (labState as { records?: unknown } | null | undefined)?.records;
  return isPlainObject(records) ? records : null;
}

function sealFromLabRecord(
  prior: CampaignSeal,
  record: Record<string, unknown>,
  code: boolean,
): CampaignSeal {
  return {
    code: prior.code || code,
    prediction: prior.prediction || record.predictionCorrect === true,
    assisted: prior.assisted || record.assisted === true || record.solutionSeen === true,
  };
}

function sealsDiffer(a: CampaignSeal, b: CampaignSeal): boolean {
  return a.code !== b.code || a.prediction !== b.prediction || a.assisted !== b.assisted;
}

export function applyLabEvidence(
  state: CampaignStateV1,
  catalog: CampaignCatalog,
  labState: unknown,
): boolean {
  const records = labRecordsOf(labState);
  if (!records) return false;
  let changed = false;
  for (const [id, record] of Object.entries(records)) {
    const exercise = catalog.exercises.get(id);
    if (!exercise || !isPlainObject(record)) continue;
    const prior = sealOf(state, id);
    const code = hasPassingEvidence(record.result, exercise.tests);
    const next = sealFromLabRecord(prior, record, code);
    if (sealsDiffer(next, prior)) {
      state.seals[id] = next;
      changed = true;
    }
  }
  return changed;
}
