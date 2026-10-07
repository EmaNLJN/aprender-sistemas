import { describe, expect, it } from 'vitest';
import { campaignLinkAccess, campaignMissionContext, type BridgeWorld } from './mission-bridge';

const worlds: BridgeWorld[] = [
  {
    id: 'rust-world-1',
    title: 'Estación del robot',
    missions: [
      { id: 'rust-02', points: 0, code: false, prediction: false },
      { id: 'rust-103', points: 30, code: true, prediction: true },
    ],
  },
  {
    id: 'go-world-1',
    title: 'Canales y paquetes',
    missions: [{ id: 'go-01', points: 20, code: true, prediction: false }],
  },
];

describe('campaignMissionContext', () => {
  it('describes a mission of the linked world', () => {
    expect(campaignMissionContext(worlds, 'rust-world-1', 'rust-02')).toEqual({
      worldId: 'rust-world-1',
      worldTitle: 'Estación del robot',
      points: 0,
      code: false,
      prediction: false,
    });
  });

  it('reflects the seals and the points', () => {
    expect(campaignMissionContext(worlds, 'rust-world-1', 'rust-103')).toMatchObject({
      points: 30,
      code: true,
      prediction: true,
    });
  });

  it('is null when the exercise is not a mission of that world', () => {
    expect(campaignMissionContext(worlds, 'rust-world-1', 'rust-01')).toBeNull();
  });

  it('is null when the world does not exist', () => {
    expect(campaignMissionContext(worlds, 'no-existe', 'rust-02')).toBeNull();
  });

  it('uses the title of a Go world', () => {
    expect(campaignMissionContext(worlds, 'go-world-1', 'go-01')?.worldTitle).toBe(
      'Canales y paquetes',
    );
  });
});

describe('campaignLinkAccess', () => {
  const reasons = ['Verificá las misiones previas.'];

  it('blocks a mission the engine does not allow, with its reasons', () => {
    expect(
      campaignLinkAccess(worlds, 'rust-world-1', 'rust-103', {
        allowed: false,
        reasons,
        worldId: 'rust-world-1',
      }),
    ).toEqual({ allowed: false, reasons, worldId: 'rust-world-1' });
  });

  it('allows a mission the engine allows in the linked world', () => {
    expect(
      campaignLinkAccess(worlds, 'rust-world-1', 'rust-103', {
        allowed: true,
        reasons: [],
        worldId: 'rust-world-1',
      }).allowed,
    ).toBe(true);
  });

  it('blocks a mission the engine places in another world', () => {
    expect(
      campaignLinkAccess(worlds, 'rust-world-1', 'rust-103', {
        allowed: true,
        reasons,
        worldId: 'rust-world-2',
      }),
    ).toEqual({ allowed: false, reasons, worldId: 'rust-world-1' });
  });

  it('explains that the link does not match a mission of the world', () => {
    expect(
      campaignLinkAccess(worlds, 'rust-world-1', 'rust-01', {
        allowed: true,
        reasons: [],
        worldId: 'rust-world-1',
      }),
    ).toEqual({
      allowed: false,
      reasons: ['El enlace no corresponde a una misión de este mundo.'],
      worldId: 'rust-world-1',
    });
  });

  it('has no world to go back to when the linked world does not exist', () => {
    expect(
      campaignLinkAccess(worlds, 'no-existe', 'rust-02', {
        allowed: true,
        reasons: [],
        worldId: 'rust-world-1',
      }),
    ).toEqual({
      allowed: false,
      reasons: ['El enlace no corresponde a una misión de este mundo.'],
      worldId: null,
    });
  });
});
