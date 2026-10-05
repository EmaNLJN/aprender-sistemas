import curriculum from '../../../../../build/curriculum.json';
import type { AtlasByLanguage } from './types';

// Concepts live in content/atlas/; tools/content/build-curriculum.ts validates them and writes
// build/curriculum.json, which `npm run typecheck` and `npm run dev` regenerate first.
export const atlasByLanguage = curriculum.atlas as AtlasByLanguage;
