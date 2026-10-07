export type LabExplorerKind = 'channel' | 'generic' | 'pointer';
export type QuestExplorerMode = 'robot' | 'packet';
export type ExplorerKind = LabExplorerKind | QuestExplorerMode;
export type QuestLanguage = 'rust' | 'go';

export interface QuestExplorerInfo {
  language: QuestLanguage;
  mode: QuestExplorerMode;
}

export function labExplorerKindOf(exerciseId: string): LabExplorerKind | null {
  throw new Error(`not implemented: ${exerciseId}`);
}

export function questExplorerOf(exerciseId: string): QuestExplorerInfo | null {
  throw new Error(`not implemented: ${exerciseId}`);
}

export function explorerKindOf(exerciseId: string): ExplorerKind | null {
  throw new Error(`not implemented: ${exerciseId}`);
}
