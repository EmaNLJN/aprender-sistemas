import { describe, expect, it } from 'vitest';
import { campaignEngine, createCampaignEngine, type CampaignEngine } from '../entities/campaign';
import {
  createSystemsEngine,
  systemsEngine,
  type SystemsEngine,
} from '../entities/systems-workshop';

const CAMPAIGN_MESSAGE = 'Inicializá la campaña antes de usarla.';
const SYSTEMS_MESSAGE = 'Inicializá Sistemas antes de usarlo.';

const campaignEngines: [string, () => CampaignEngine][] = [
  ['factory', createCampaignEngine],
  ['singleton', () => campaignEngine],
];

const systemsEngines: [string, () => SystemsEngine][] = [
  ['factory', createSystemsEngine],
  ['singleton', () => systemsEngine],
];

const campaignOperations: [string, (engine: CampaignEngine) => unknown][] = [
  ['getWorlds', (engine) => engine.getWorlds('rust')],
  ['canAttempt', (engine) => engine.canAttempt('rust-02', 'rust')],
  ['answerCheckpoint', (engine) => engine.answerCheckpoint('rust-world-1', 0)],
  ['getSummary', (engine) => engine.getSummary('rust')],
  ['refreshFromLab', (engine) => engine.refreshFromLab(null)],
  ['syncLab', (engine) => engine.syncLab(null)],
  ['exportState', (engine) => engine.exportState()],
  ['planImport', (engine) => engine.planImport(null)],
  ['applyImport', (engine) => engine.applyImport({ state: {} as never, lossy: false })],
  ['backups', (engine) => engine.backups()],
  ['reset', (engine) => engine.reset()],
];

const systemsOperations: [string, (engine: SystemsEngine) => unknown][] = [
  ['get', (engine) => engine.get('alpha', 'rust')],
  ['observe', (engine) => engine.observe('alpha', 'rust', ['a'])],
  ['answer', (engine) => engine.answer('alpha', 'rust', 0)],
  ['list', (engine) => engine.list('rust')],
  ['refreshFromLab', (engine) => engine.refreshFromLab(null)],
  ['syncLab', (engine) => engine.syncLab(null)],
  ['setStep', (engine) => engine.setStep('alpha', 'rust', 0, true)],
  ['setNote', (engine) => engine.setNote('alpha', 'rust', 'note')],
  ['exportState', (engine) => engine.exportState()],
  ['planImport', (engine) => engine.planImport(null)],
  ['applyImport', (engine) => engine.applyImport({ state: {} as never, lossy: false })],
  ['backups', (engine) => engine.backups()],
  ['reset', (engine) => engine.reset()],
];

describe.each(campaignEngines)('campaign engine used before init (%s)', (_, engineFor) => {
  it.each(campaignOperations)('refuses %s', (_name, operation) => {
    expect(() => operation(engineFor())).toThrow(CAMPAIGN_MESSAGE);
  });
});

describe.each(systemsEngines)('Systems engine used before init (%s)', (_, engineFor) => {
  it.each(systemsOperations)('refuses %s', (_name, operation) => {
    expect(() => operation(engineFor())).toThrow(SYSTEMS_MESSAGE);
  });
});
