import { systemsEngine } from '../../../entities/systems-workshop';
import type { SystemsLanguage, SystemsWorkshopView } from './types';

export function workshopViews(language: SystemsLanguage): SystemsWorkshopView[] {
  return systemsEngine.list(language) as SystemsWorkshopView[];
}

export function workshopView(id: string, language: SystemsLanguage): SystemsWorkshopView {
  return systemsEngine.get(id, language) as SystemsWorkshopView;
}
