// Difficulty levels shared by campaign and Systems, in progress order.
export const LEVEL_IDS = ['beginner', 'medium', 'advanced', 'expert'] as const;

export type LevelId = (typeof LEVEL_IDS)[number];

export const LEVEL_LABELS: Record<LevelId, string> = {
  beginner: 'Inicial',
  medium: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
};
