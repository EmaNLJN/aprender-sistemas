import type { QuestExplorerInfo } from './explorer-kinds';

export interface RobotLogEntry {
  step: number;
  summary: string;
  why: string;
}

export interface RobotState {
  x: number;
  y: number;
  energy: number;
  initialEnergy: number;
  attempts: number;
  moves: number;
  logs: RobotLogEntry[];
  prediction: number | null;
  notice: string;
}

export interface PacketState {
  control: number;
  size: number;
  corrupt: boolean;
  badLength: boolean;
  reversed: boolean;
  prediction: number | null;
  notice: string;
}

export type QuestState = RobotState | PacketState;
export type PacketFailure = 'version' | 'largo' | 'checksum' | null;

export interface PacketData {
  original: number[];
  received: number[];
  lengthBytes: number[];
  declared: number;
  sent: number;
  computed: number;
  failure: PacketFailure;
}

const DIRECTIONS: Record<string, [number, number, string]> = {
  N: [0, 1, 'norte'],
  S: [0, -1, 'sur'],
  E: [1, 0, 'este'],
  O: [-1, 0, 'oeste'],
};
const SAMPLE_PAYLOAD = [0x53, 0x4f, 0x53, 0, 0xff, 0x2a];

export function hex(value: number, digits = 2): string {
  return (value >>> 0).toString(16).toUpperCase().padStart(digits, '0');
}

export function initialQuestState(info: QuestExplorerInfo, energy = 4): QuestState {
  return info.mode === 'robot'
    ? {
        x: 0,
        y: 0,
        energy,
        initialEnergy: energy,
        attempts: 0,
        moves: 0,
        logs: [],
        prediction: null,
        notice: 'Partís de (0,0). Probá O para observar un choque; después buscá la baliza (2,2).',
      }
    : {
        control: info.language === 'rust' ? 0x13 : 0xa3,
        size: 3,
        corrupt: false,
        badLength: false,
        reversed: false,
        prediction: null,
        notice:
          'Alterná un bit o alterá el paquete. Compará la representación con la regla que usa el receptor.',
      };
}

// CRC-32 IEEE reflejado, solo para dibujar el modelo en JavaScript.
export function crc32(bytes: readonly number[]): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function rotateChecksum(bytes: readonly number[]): number {
  let value = 0;
  for (const byte of bytes) value = (((value << 1) | (value >>> 7)) & 255) ^ byte;
  return value;
}

export function packetData(state: PacketState, info: QuestExplorerInfo): PacketData {
  const rust = info.language === 'rust';
  const original = Array.from(
    { length: state.size },
    (_, index) => SAMPLE_PAYLOAD[index % SAMPLE_PAYLOAD.length],
  );
  const received = original.slice();
  if (state.corrupt && received.length) received[0] ^= 1;
  const lengthBytes = rust ? [state.size] : [state.size >>> 8, state.size & 255];
  if (state.reversed && !rust) lengthBytes.reverse();
  if (state.badLength) lengthBytes[lengthBytes.length - 1] ^= 1;
  const declared = rust ? lengthBytes[0] : lengthBytes[0] * 256 + lengthBytes[1];
  const sent = rust ? rotateChecksum([state.control, state.size, ...original]) : crc32(original);
  const computed = rust
    ? rotateChecksum([state.control, ...lengthBytes, ...received])
    : crc32(received);
  const failure: PacketFailure =
    rust && state.control >>> 4 !== 1
      ? 'version'
      : declared !== state.size
        ? 'largo'
        : sent !== computed
          ? 'checksum'
          : null;
  return { original, received, lengthBytes, declared, sent, computed, failure };
}

function moveRobot(previous: RobotState, direction: string): RobotState {
  const state: RobotState = { ...previous, logs: [...previous.logs] };
  const [dx, dy, name] = DIRECTIONS[direction];
  const x = state.x + dx,
    y = state.y + dy;
  state.attempts++;
  let summary, why;
  if (x < 0 || x > 2 || y < 0 || y > 2) {
    summary = `${direction} → choque; seguís en (${state.x},${state.y}), batería ${state.energy}.`;
    why = `La propuesta (${x},${y}) cruza el borde. Se rechaza antes de gastar: el estado se conserva.`;
  } else if (state.energy === 0) {
    summary = `${direction} → sin batería; seguís en (${state.x},${state.y}).`;
    why = `La propuesta (${x},${y}) entra en la grilla, pero necesita una unidad de energía. No se confirma.`;
  } else {
    const before = `(${state.x},${state.y})`;
    state.x = x;
    state.y = y;
    state.energy--;
    state.moves++;
    summary = `${direction} → ${before} a (${x},${y}), batería ${state.energy}.`;
    why = `Mover al ${name} es válido. Posición y batería cambian juntas; se consumió exactamente una unidad.`;
  }
  state.logs.push({ step: state.attempts, summary, why });
  if (state.logs.length > 6) state.logs.shift();
  state.notice = `Intento ${state.attempts}. ${summary} ${why}${state.x === 2 && state.y === 2 ? ' Baliza alcanzada.' : ''}`;
  return state;
}

function applyRobotOperation(
  state: RobotState,
  info: QuestExplorerInfo,
  operation: string,
): RobotState | null {
  const moveMatch = /^move-([NSEO])$/.exec(operation),
    energyMatch = /^battery-(2|4|6)$/.exec(operation);
  if (moveMatch) return moveRobot(state, moveMatch[1]);
  if (energyMatch) {
    const restarted = initialQuestState(info, Number(energyMatch[1]));
    restarted.notice = `Tablero reiniciado en (0,0), con batería ${(restarted as RobotState).energy}. La baliza está en (2,2).`;
    return restarted as RobotState;
  }
  return null;
}

function applyPacketOperation(
  previous: PacketState,
  info: QuestExplorerInfo,
  operation: string,
): PacketState | null {
  const state: PacketState = { ...previous };
  const bitMatch = /^bit-([0-7])$/.exec(operation),
    sizeMatch = /^size-(0|3|6|260)$/.exec(operation);
  if (bitMatch) {
    const bit = Number(bitMatch[1]);
    state.control ^= 1 << bit;
    state.notice = `Alternaste b${bit}, de peso ${1 << bit}. El control ahora es 0x${hex(state.control)} (${state.control}). ${info.language === 'go' ? 'La trama Go-106 mantiene su marca fija 0x47.' : 'En el paquete Rust-106, los bits altos deben representar versión 1.'}`;
  } else if (sizeMatch && (info.language === 'go' || Number(sizeMatch[1]) <= 255)) {
    state.size = Number(sizeMatch[1]);
    state.corrupt = false;
    state.badLength = false;
    state.reversed = false;
    state.notice = `Se creó un paquete sin alteraciones con ${state.size} bytes de payload. Su longitud y comprobación fueron recalculadas; el byte de control seleccionado se conserva.`;
  } else if (operation === 'corrupt' && state.size > 0) {
    state.corrupt = !state.corrupt;
    state.notice = state.corrupt
      ? 'Se alternó el bit 0 del primer byte recibido. La comprobación enviada se conserva: ahora el receptor puede detectar esa alteración.'
      : 'El primer byte volvió a su valor original. Compará nuevamente las comprobaciones.';
  } else if (operation === 'bad-length') {
    state.badLength = !state.badLength;
    state.notice = state.badLength
      ? 'Se alternó el bit de menor peso de la longitud declarada. La cantidad real de payload no cambió; el receptor compara ambas.'
      : 'Se restauró el bit de longitud. Si invertiste los bytes, ese otro cambio sigue activo.';
  } else if (operation === 'reverse-endian' && info.language === 'go') {
    state.reversed = !state.reversed;
    state.notice = state.reversed
      ? 'Se invirtieron los dos bytes de longitud en tránsito. El receptor sigue leyendo big-endian: interpretará el orden recibido, sin adivinar tu intención.'
      : 'Los bytes de longitud recuperaron su orden big-endian. Las demás alteraciones se conservan.';
  } else if (operation === 'packet-reset') {
    const restored = initialQuestState(info) as PacketState;
    restored.notice =
      'Paquete restaurado: 3 bytes de payload, sin alteraciones. El byte de control también recuperó su valor inicial.';
    return restored;
  } else return null;
  return state;
}

export function applyQuestOperation(
  state: QuestState,
  info: QuestExplorerInfo,
  operation: string,
): QuestState | null {
  const predictionMatch = /^predict-([0-2])$/.exec(operation);
  if (predictionMatch) {
    const prediction = Number(predictionMatch[1]);
    const correct = info.mode === 'robot' ? 0 : 1;
    const notice =
      prediction === correct
        ? 'Predicción correcta. Leé la explicación para conectar el resultado con su regla.'
        : 'La predicción necesita un ajuste. La explicación muestra qué regla determina el resultado; podés probar otra respuesta.';
    return { ...state, prediction, notice };
  }
  return info.mode === 'robot'
    ? applyRobotOperation(state as RobotState, info, operation)
    : applyPacketOperation(state as PacketState, info, operation);
}
