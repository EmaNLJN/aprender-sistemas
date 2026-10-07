export type LabExplorerKind = 'channel' | 'generic' | 'pointer';
export type QuestExplorerMode = 'robot' | 'packet';
export type ExplorerKind = LabExplorerKind | QuestExplorerMode;
export type QuestLanguage = 'rust' | 'go';

export interface QuestExplorerInfo {
  language: QuestLanguage;
  mode: QuestExplorerMode;
}

const LAB_EXPLORER_KINDS: ReadonlyMap<string, LabExplorerKind> = new Map([
  ['rust-36', 'generic'],
  ['rust-37', 'generic'],
  ['rust-38', 'generic'],
  ['rust-39', 'generic'],
  ['rust-40', 'generic'],
  ['rust-41', 'generic'],
  ['rust-42', 'generic'],
  ['rust-43', 'generic'],
  ['rust-44', 'generic'],
  ['rust-45', 'generic'],
  ['rust-46', 'channel'],
  ['rust-47', 'channel'],
  ['rust-48', 'channel'],
  ['rust-49', 'channel'],
  ['rust-50', 'channel'],
  ['rust-51', 'pointer'],
  ['rust-52', 'pointer'],
  ['rust-53', 'pointer'],
  ['rust-54', 'pointer'],
  ['rust-55', 'pointer'],
  ['rust-56', 'generic'],
  ['rust-57', 'generic'],
  ['rust-58', 'generic'],
  ['rust-59', 'generic'],
  ['rust-60', 'generic'],
  ['rust-66', 'channel'],
  ['rust-67', 'channel'],
  ['rust-68', 'channel'],
  ['rust-69', 'channel'],
  ['rust-70', 'channel'],
  ['rust-71', 'pointer'],
  ['rust-72', 'pointer'],
  ['rust-73', 'pointer'],
  ['rust-74', 'pointer'],
  ['rust-75', 'pointer'],
  ['go-21', 'pointer'],
  ['go-22', 'pointer'],
  ['go-23', 'pointer'],
  ['go-24', 'pointer'],
  ['go-25', 'pointer'],
  ['go-41', 'channel'],
  ['go-42', 'channel'],
  ['go-43', 'channel'],
  ['go-44', 'channel'],
  ['go-45', 'channel'],
  ['go-51', 'generic'],
  ['go-52', 'generic'],
  ['go-53', 'generic'],
  ['go-54', 'generic'],
  ['go-55', 'generic'],
  ['go-56', 'pointer'],
  ['go-57', 'pointer'],
  ['go-58', 'pointer'],
  ['go-59', 'pointer'],
  ['go-60', 'pointer'],
  ['go-61', 'channel'],
  ['go-62', 'channel'],
  ['go-63', 'channel'],
  ['go-64', 'channel'],
  ['go-65', 'channel'],
  ['go-112', 'channel'],
]);

const QUEST_EXPLORERS: ReadonlyMap<string, QuestExplorerInfo> = new Map([
  ['rust-101', { language: 'rust', mode: 'robot' }],
  ['rust-102', { language: 'rust', mode: 'robot' }],
  ['rust-103', { language: 'rust', mode: 'robot' }],
  ['rust-104', { language: 'rust', mode: 'packet' }],
  ['rust-105', { language: 'rust', mode: 'packet' }],
  ['rust-106', { language: 'rust', mode: 'packet' }],
  ['go-101', { language: 'go', mode: 'robot' }],
  ['go-102', { language: 'go', mode: 'robot' }],
  ['go-103', { language: 'go', mode: 'robot' }],
  ['go-104', { language: 'go', mode: 'packet' }],
  ['go-105', { language: 'go', mode: 'packet' }],
  ['go-106', { language: 'go', mode: 'packet' }],
]);

export function labExplorerKindOf(exerciseId: string): LabExplorerKind | null {
  return LAB_EXPLORER_KINDS.get(exerciseId) ?? null;
}

export function questExplorerOf(exerciseId: string): QuestExplorerInfo | null {
  return QUEST_EXPLORERS.get(exerciseId) ?? null;
}

export function explorerKindOf(exerciseId: string): ExplorerKind | null {
  return questExplorerOf(exerciseId)?.mode ?? labExplorerKindOf(exerciseId);
}
