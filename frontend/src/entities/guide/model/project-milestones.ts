import type { GuideLanguage } from './types';

export type MilestoneHint = string | Readonly<Record<GuideLanguage, string>>;

export interface ProjectMilestone {
  suffix: string;
  title: string;
  task: string;
  doneWhen: string;
  hint: MilestoneHint;
}

export const MILESTONE_LANGUAGES: readonly GuideLanguage[] = ['rust', 'go'];

export const PROJECT_MILESTONES: readonly ProjectMilestone[] = [];

export function milestoneId(language: GuideLanguage, milestone: ProjectMilestone): string {
  void language;
  void milestone;
  throw new Error('not implemented');
}

export function milestoneHint(milestone: ProjectMilestone, language: GuideLanguage): string {
  void milestone;
  void language;
  throw new Error('not implemented');
}
