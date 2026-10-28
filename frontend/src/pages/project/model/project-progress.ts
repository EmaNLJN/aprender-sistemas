import {
  PROJECT_MILESTONES,
  milestoneHint,
  milestoneId,
  type GuideLanguage,
} from '../../../entities/guide';

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
  const milestones = PROJECT_MILESTONES.map((milestone, index) => {
    const id = milestoneId(language, milestone);
    return {
      id,
      heading: `${String(index + 1).padStart(2, '0')}. ${milestone.title}`,
      title: milestone.title,
      task: milestone.task,
      doneWhen: milestone.doneWhen,
      hint: milestoneHint(milestone, language),
      completed: marked.includes(id),
    };
  });
  return {
    milestones,
    completedCount: milestones.filter((milestone) => milestone.completed).length,
  };
}
