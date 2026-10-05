import curriculum from '../../../../../build/curriculum.json';
import type { AtlasByLanguage } from './types';

// Los conceptos viven en content/atlas/; tools/content/build-curriculum.ts los valida y los
// deja en build/curriculum.json, que `npm run typecheck` y `npm run dev` regeneran antes.
export const atlasByLanguage = curriculum.atlas as AtlasByLanguage;
