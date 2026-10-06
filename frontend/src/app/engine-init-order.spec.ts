import { describe, expect, it } from 'vitest';
import { createCampaignEngine } from '../entities/campaign';
import { createSystemsEngine } from '../entities/systems-workshop';

describe('engines used before init (legacy-map §2.3 and §12)', () => {
  it('KNOWN DEFECT: the campaign engine throws', () => {
    const engine = createCampaignEngine();
    const message = 'Inicializá la campaña antes de usarla.';

    expect(() => engine.getWorlds('rust')).toThrow(message);
    expect(() => engine.refreshFromLab(null)).toThrow(message);
    expect(() => engine.canAttempt('rust-02', 'rust')).toThrow(message);
  });

  it('KNOWN DEFECT: the Systems engine answers with an empty list and no error', () => {
    const engine = createSystemsEngine();

    expect(engine.list('rust')).toEqual([]);
  });
});
