import { storeContent } from '../../frontend/src/shared/api/content/content-holder.ts';

const text = (globalThis as { __TALLER_QA_CONTENT__?: string }).__TALLER_QA_CONTENT__;
storeContent(JSON.parse(text ?? 'null'));
