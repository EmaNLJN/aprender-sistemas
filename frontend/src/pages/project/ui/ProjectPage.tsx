import type { GuideLanguage } from '../../../entities/guide';

interface ProjectPageProps {
  language: GuideLanguage;
}

const ProjectPage = ({ language }: ProjectPageProps) => {
  void language;
  throw new Error('not implemented');
};

export default ProjectPage;
