export type GuideLanguage = 'rust' | 'go';

// `both` marks resources useful for both routes.
export type GuideResourceLanguage = GuideLanguage | 'both';

export type GuideResourceCategory = 'ejercicios' | 'lectura' | 'proyectos' | 'herramientas';

export type GuideResourceCost = 'gratis' | 'mixto';

export interface GuideResource {
  id: string;
  title: string;
  url: string;
  languages: GuideResourceLanguage[];
  category: GuideResourceCategory;
  cost: GuideResourceCost;
  format: string;
  description: string;
  why: string;
  caveat: string;
  featured: boolean;
}

export interface GuideQuiz {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface GuideStep {
  id: string;
  title: string;
  minutes: number;
  objective: string;
  task: string;
  doneWhen: string;
  resourceIds: string[];
  quiz: GuideQuiz;
}

export interface GuideModule {
  id: string;
  title: string;
  subtitle: string;
  steps: GuideStep[];
}

export interface GuideTrack {
  title: string;
  description: string;
  modules: GuideModule[];
}

export interface GuideSource {
  title: string;
  url: string;
  note: string;
}

export interface GuideData {
  resources: GuideResource[];
  tracks: Record<GuideLanguage, GuideTrack>;
  sources: GuideSource[];
}
