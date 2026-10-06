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

describe.each(campaignEngines)('campaign engine used before init (%s)', (_, engineFor) => {
  it('throws instead of answering', () => {
    const engine = engineFor();

    expect(() => engine.getWorlds('rust')).toThrow(CAMPAIGN_MESSAGE);
    expect(() => engine.refreshFromLab(null)).toThrow(CAMPAIGN_MESSAGE);
    expect(() => engine.canAttempt('rust-02', 'rust')).toThrow(CAMPAIGN_MESSAGE);
  });
});

describe.each(systemsEngines)('Systems engine used before init (%s)', (_, engineFor) => {
  it('throws instead of answering', () => {
    const engine = engineFor();

    expect(() => engine.list('rust')).toThrow(SYSTEMS_MESSAGE);
    expect(() => engine.refreshFromLab(null)).toThrow(SYSTEMS_MESSAGE);
    expect(() => engine.exportState()).toThrow(SYSTEMS_MESSAGE);
  });
});
