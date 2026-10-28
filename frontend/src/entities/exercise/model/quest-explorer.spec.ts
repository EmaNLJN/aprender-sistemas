import { describe, expect, it } from 'vitest';
import type { QuestExplorerInfo } from './explorer-kinds';
import {
  applyQuestOperation,
  crc32,
  hex,
  initialQuestState,
  packetData,
  rotateChecksum,
  type PacketState,
  type QuestState,
  type RobotState,
} from './quest-explorer';

const RUST_ROBOT: QuestExplorerInfo = { language: 'rust', mode: 'robot' };
const RUST_PACKET: QuestExplorerInfo = { language: 'rust', mode: 'packet' };
const GO_PACKET: QuestExplorerInfo = { language: 'go', mode: 'packet' };

function play(info: QuestExplorerInfo, operations: string[], from?: QuestState): QuestState {
  return operations.reduce(
    (state, operation) => {
      const next = applyQuestOperation(state, info, operation);
      if (next === null) throw new Error(`${operation} did not change the state`);
      return next;
    },
    from ?? initialQuestState(info),
  );
}

const robot = (operations: string[]) => play(RUST_ROBOT, operations) as RobotState;
const rustPacket = (operations: string[]) => play(RUST_PACKET, operations) as PacketState;
const goPacket = (operations: string[]) => play(GO_PACKET, operations) as PacketState;

describe('hex', () => {
  it('writes uppercase hexadecimal padded to the digits', () => {
    expect(hex(255)).toBe('FF');
    expect(hex(5)).toBe('05');
    expect(hex(5, 8)).toBe('00000005');
    expect(hex(0x14381a7f, 8)).toBe('14381A7F');
  });
});

describe('the checksums', () => {
  it('computes the CRC-32 IEEE of the Go SOS payload, verified with Python zlib.crc32', () => {
    expect(crc32([0x53, 0x4f, 0x53])).toBe(0x14381a7f);
  });

  it('computes the CRC-32 IEEE of the empty payload and of the standard check string', () => {
    expect(crc32([])).toBe(0);
    expect(crc32([...'123456789'].map((character) => character.charCodeAt(0)))).toBe(0xcbf43926);
  });

  it('computes the Rust fingerprint worked by hand: 13 → 25 → 19 → 7D → A9', () => {
    expect(rotateChecksum([0x13, 0x03, 0x53, 0x4f, 0x53])).toBe(0xa9);
  });
});

describe('the initial states', () => {
  it('starts the robot at the origin with the battery full', () => {
    expect(initialQuestState(RUST_ROBOT)).toEqual({
      x: 0,
      y: 0,
      energy: 4,
      initialEnergy: 4,
      attempts: 0,
      moves: 0,
      logs: [],
      prediction: null,
      notice: 'Partís de (0,0). Probá O para observar un choque; después buscá la baliza (2,2).',
    });
  });

  it('starts the robot with the energy asked for', () => {
    const state = initialQuestState(RUST_ROBOT, 2) as RobotState;
    expect([state.energy, state.initialEnergy]).toEqual([2, 2]);
  });

  it('starts the packet with the control byte of each language', () => {
    expect(initialQuestState(RUST_PACKET)).toEqual({
      control: 0x13,
      size: 3,
      corrupt: false,
      badLength: false,
      reversed: false,
      prediction: null,
      notice:
        'Alterná un bit o alterá el paquete. Compará la representación con la regla que usa el receptor.',
    });
    expect((initialQuestState(GO_PACKET) as PacketState).control).toBe(0xa3);
  });

  it('gives each call its own log', () => {
    const first = initialQuestState(RUST_ROBOT) as RobotState;
    const second = initialQuestState(RUST_ROBOT) as RobotState;
    expect(first.logs).not.toBe(second.logs);
  });
});

describe('the robot', () => {
  it('keeps position and battery on a wall collision and earns no step', () => {
    const state = robot(['move-O']);
    expect([state.x, state.y, state.energy, state.moves]).toEqual([0, 0, 4, 0]);
    expect(state.attempts).toBe(1);
    expect(state.logs).toEqual([
      {
        step: 1,
        summary: 'O → choque; seguís en (0,0), batería 4.',
        why: 'La propuesta (-1,0) cruza el borde. Se rechaza antes de gastar: el estado se conserva.',
      },
    ]);
  });

  it('reaches the beacon in four steps with an empty battery', () => {
    const state = robot(['move-N', 'move-N', 'move-E', 'move-E']);
    expect([state.x, state.y, state.energy, state.moves]).toEqual([2, 2, 0, 4]);
    expect(state.notice).toBe(
      'Intento 4. E → (1,2) a (2,2), batería 0. Mover al este es válido. Posición y batería cambian juntas; se consumió exactamente una unidad. Baliza alcanzada.',
    );
  });

  it('does not move without battery and explains it', () => {
    const state = robot(['move-N', 'move-N', 'move-E', 'move-E', 'move-S']);
    expect([state.x, state.y, state.energy]).toEqual([2, 2, 0]);
    expect(state.notice).toContain('sin batería');
    expect(state.logs.at(-1)?.why).toBe(
      'La propuesta (2,1) entra en la grilla, pero necesita una unidad de energía. No se confirma.',
    );
  });

  it('keeps the last six of fourteen attempts, numbered nine to fourteen', () => {
    const state = robot([
      'move-N',
      'move-N',
      'move-E',
      'move-E',
      'move-S',
      ...Array<string>(8).fill('move-N'),
      'move-N',
    ]);
    expect(state.attempts).toBe(14);
    expect(state.logs.map((entry) => entry.step)).toEqual([9, 10, 11, 12, 13, 14]);
    expect(state.notice.startsWith('Intento 14.')).toBe(true);
  });

  it('moves after a restart with the same position and the battery spent', () => {
    const state = robot(['battery-4', 'move-N']);
    expect([state.x, state.y, state.energy]).toEqual([0, 1, 3]);
    expect(state.notice).toContain('batería 3');
  });

  it('starts over when the battery preset is chosen', () => {
    const state = robot(['move-N', 'battery-2']);
    expect([
      state.x,
      state.y,
      state.energy,
      state.initialEnergy,
      state.attempts,
      state.logs,
    ]).toEqual([0, 0, 2, 2, 0, []]);
    expect(state.notice).toBe(
      'Tablero reiniciado en (0,0), con batería 2. La baliza está en (2,2).',
    );
  });

  it('answers the prediction: option 0 is right, the others need an adjustment', () => {
    const right = robot(['predict-0']);
    expect(right.prediction).toBe(0);
    expect(right.notice).toBe(
      'Predicción correcta. Leé la explicación para conectar el resultado con su regla.',
    );
    const wrong = robot(['predict-2']);
    expect(wrong.prediction).toBe(2);
    expect(wrong.notice).toBe(
      'La predicción necesita un ajuste. La explicación muestra qué regla determina el resultado; podés probar otra respuesta.',
    );
  });

  it('draws nothing for operations it does not know', () => {
    const state = initialQuestState(RUST_ROBOT);
    for (const operation of ['nope', 'move-X', 'battery-3', 'bit-1', 'predict-3', 'corrupt']) {
      expect(applyQuestOperation(state, RUST_ROBOT, operation)).toBeNull();
    }
  });
});

describe('the Go packet (go-106)', () => {
  it('passes the initial check and carries the independently verified CRC', () => {
    const data = packetData(initialQuestState(GO_PACKET) as PacketState, GO_PACKET);
    expect(data.failure).toBeNull();
    expect([data.sent, data.computed]).toEqual([0x14381a7f, 0x14381a7f]);
    expect(data.original).toEqual([0x53, 0x4f, 0x53]);
  });

  it('has CRC zero for the empty payload', () => {
    const data = packetData(goPacket(['size-0']), GO_PACKET);
    expect([data.sent, data.computed, data.failure]).toEqual([0, 0, null]);
  });

  it('keeps the sent CRC when a bit is altered, changes the calculated one and rejects', () => {
    const data = packetData(goPacket(['corrupt']), GO_PACKET);
    expect([data.sent, data.computed, data.failure]).toEqual([0x14381a7f, 0x15fa7048, 'checksum']);
  });

  it('encodes 260 as 01 04 and clears the alterations', () => {
    const state = goPacket(['corrupt', 'bad-length', 'size-260']);
    expect([state.size, state.corrupt, state.badLength, state.reversed]).toEqual([
      260,
      false,
      false,
      false,
    ]);
    const data = packetData(state, GO_PACKET);
    expect([data.lengthBytes, data.declared, data.failure]).toEqual([[0x01, 0x04], 260, null]);
    expect(state.notice).toBe(
      'Se creó un paquete sin alteraciones con 260 bytes de payload. Su longitud y comprobación fueron recalculadas; el byte de control seleccionado se conserva.',
    );
  });

  it('reads 1025 once the length bytes are reversed, and 1024 with the length bit altered after', () => {
    const reversed = packetData(goPacket(['size-260', 'reverse-endian']), GO_PACKET);
    expect([reversed.declared, reversed.failure]).toEqual([1025, 'largo']);
    const altered = packetData(goPacket(['size-260', 'reverse-endian', 'bad-length']), GO_PACKET);
    expect([altered.declared, altered.failure]).toEqual([1024, 'largo']);
  });

  it('restores a valid packet, control byte included', () => {
    const state = goPacket(['bit-7', 'corrupt', 'size-260', 'packet-reset']);
    expect(state).toEqual({
      ...(initialQuestState(GO_PACKET) as PacketState),
      notice:
        'Paquete restaurado: 3 bytes de payload, sin alteraciones. El byte de control también recuperó su valor inicial.',
    });
    expect(packetData(state, GO_PACKET).failure).toBeNull();
  });

  it('toggles a control bit and announces the Go note', () => {
    const state = goPacket(['bit-0']);
    expect(state.control).toBe(0xa2);
    expect(state.notice).toBe(
      'Alternaste b0, de peso 1. El control ahora es 0xA2 (162). La trama Go-106 mantiene su marca fija 0x47.',
    );
  });

  it('answers the prediction: option 1 is right', () => {
    expect(goPacket(['predict-1']).notice).toBe(
      'Predicción correcta. Leé la explicación para conectar el resultado con su regla.',
    );
    expect(goPacket(['predict-0']).notice).toContain('La predicción necesita un ajuste.');
  });
});

describe('the Rust packet (rust-106)', () => {
  it('covers header, length and payload in the fingerprint and passes', () => {
    const data = packetData(initialQuestState(RUST_PACKET) as PacketState, RUST_PACKET);
    expect([data.sent, data.computed, data.failure]).toEqual([0xa9, 0xa9, null]);
  });

  it('changes the expected fingerprint to 0xAD with the bit altered and rejects', () => {
    const data = packetData(rustPacket(['corrupt']), RUST_PACKET);
    expect([data.sent, data.computed, data.failure]).toEqual([0xa9, 0xad, 'checksum']);
  });

  it('validates the length before the fingerprint', () => {
    const data = packetData(rustPacket(['corrupt', 'bad-length']), RUST_PACKET);
    expect([data.lengthBytes, data.declared, data.failure]).toEqual([[2], 2, 'largo']);
  });

  it('validates the version before the length', () => {
    const state = rustPacket(['corrupt', 'bad-length', 'bit-5', 'bit-4']);
    expect([state.control, packetData(state, RUST_PACKET).failure]).toEqual([0x23, 'version']);
    expect(state.notice).toBe(
      'Alternaste b4, de peso 16. El control ahora es 0x23 (35). En el paquete Rust-106, los bits altos deben representar versión 1.',
    );
  });

  it('answers the prediction: option 1 is right', () => {
    expect(rustPacket(['predict-1']).prediction).toBe(1);
  });
});

describe('the packet operations that draw nothing', () => {
  it('ignores size-260 and reverse-endian in Rust', () => {
    const state = initialQuestState(RUST_PACKET);
    expect(applyQuestOperation(state, RUST_PACKET, 'size-260')).toBeNull();
    expect(applyQuestOperation(state, RUST_PACKET, 'reverse-endian')).toBeNull();
  });

  it('ignores corrupt on an empty payload', () => {
    const empty = goPacket(['size-0']);
    expect(applyQuestOperation(empty, GO_PACKET, 'corrupt')).toBeNull();
  });

  it('ignores an unknown operation and a size outside the offered ones', () => {
    const state = initialQuestState(GO_PACKET);
    expect(applyQuestOperation(state, GO_PACKET, 'nope')).toBeNull();
    expect(applyQuestOperation(state, GO_PACKET, 'size-7')).toBeNull();
    expect(applyQuestOperation(state, GO_PACKET, 'move-N')).toBeNull();
  });
});

describe('purity', () => {
  it('does not mutate the robot it receives, logs included', () => {
    const start = robot(['move-N']);
    const snapshot = structuredClone(start);
    applyQuestOperation(start, RUST_ROBOT, 'move-E');
    applyQuestOperation(start, RUST_ROBOT, 'predict-0');
    applyQuestOperation(start, RUST_ROBOT, 'battery-6');
    expect(start).toEqual(snapshot);
  });

  it('does not mutate the packet it receives', () => {
    const start = goPacket(['corrupt']);
    const snapshot = structuredClone(start);
    for (const operation of ['bit-3', 'size-6', 'bad-length', 'reverse-endian', 'packet-reset']) {
      applyQuestOperation(start, GO_PACKET, operation);
    }
    expect(start).toEqual(snapshot);
  });
});
