import { MILESTONE_LANGUAGES, PROJECT_MILESTONES, milestoneId } from './project-milestones';

export const MILESTONE_IDS: readonly string[] = MILESTONE_LANGUAGES.flatMap((language) =>
  PROJECT_MILESTONES.map((milestone) => milestoneId(language, milestone)),
);
