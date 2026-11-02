import { loadCurriculumSource } from '../../tools/content/load-curriculum.ts';
import { curriculumMeta } from '../../tools/content/meta.ts';

export interface ContentStamps {
  documentHash: string;
  harnessHash: string;
}

export function currentContentStamps(root: string): ContentStamps {
  const { curriculum, workshopSteps, harness } = loadCurriculumSource(root);
  const document = JSON.stringify(curriculum, null, 2) + '\n';
  const meta = curriculumMeta(curriculum, document, null, workshopSteps, harness);
  return { documentHash: meta.documentHash, harnessHash: meta.portions.harness };
}
