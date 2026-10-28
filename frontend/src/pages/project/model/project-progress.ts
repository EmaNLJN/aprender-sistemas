import type { GuideLanguage } from '../../../entities/guide';

export interface MilestoneView {
  id: string;
  heading: string;
  title: string;
  task: string;
  doneWhen: string;
  hint: string;
  completed: boolean;
}

export interface ProjectProgress {
  milestones: MilestoneView[];
  completedCount: number;
}

export function projectProgress(
  marked: readonly string[],
  language: GuideLanguage,
): ProjectProgress {
  void marked;
  void language;
  throw new Error('not implemented');
}
