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

export function hex(value: number, digits = 2): string {
  throw new Error(`not implemented: ${value} ${digits}`);
}

export function initialQuestState(info: QuestExplorerInfo, energy = 4): QuestState {
  throw new Error(`not implemented: ${info.mode} ${energy}`);
}

export function crc32(bytes: readonly number[]): number {
  throw new Error(`not implemented: ${bytes.length}`);
}

export function rotateChecksum(bytes: readonly number[]): number {
  throw new Error(`not implemented: ${bytes.length}`);
}

export function packetData(state: PacketState, info: QuestExplorerInfo): PacketData {
  throw new Error(`not implemented: ${state.size} ${info.mode}`);
}

export function applyQuestOperation(
  state: QuestState,
  info: QuestExplorerInfo,
  operation: string,
): QuestState | null {
  throw new Error(`not implemented: ${state.notice} ${info.mode} ${operation}`);
}
