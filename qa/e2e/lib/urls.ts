import type { Language } from './curriculum';

export type View =
  | 'recorrido'
  | 'campana'
  | 'sistemas'
  | 'atlas'
  | 'laboratorio'
  | 'biblioteca'
  | 'proyecto'
  | 'metodo';
export type Phase = 'learn' | 'code' | 'reflect';
export type SystemsPart = 'explore' | 'build' | 'ship';

export const urls = {
  view: (view: View) => `/#${view}`,
  exercise: (id: string, phase: Phase) => `/?ejercicio=${id}&paso=${phase}#laboratorio`,
  campaignMission: (world: string, id: string, phase: Phase = 'learn') =>
    `/?campana=${world}&ejercicio=${id}&paso=${phase}#laboratorio`,
  systemsCode: (workshop: string, id: string) =>
    `/?sistema=${workshop}&ejercicio=${id}&paso=code#laboratorio`,
  world: (world: string) => `/?mundo=${world}#campana`,
  workshop: (language: Language, workshop?: string, part?: SystemsPart) =>
    workshop
      ? `/?lenguaje=${language}&taller=${workshop}&parte=${part ?? 'explore'}#sistemas`
      : `/?lenguaje=${language}#sistemas`,
  freeLab: '/?#laboratorio',
};
