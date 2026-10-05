import type { LevelId } from '../../../shared/config/levels';

export type AtlasLanguage = 'rust' | 'go';
export type AtlasLevel = LevelId;

export interface AtlasSource {
  title: string;
  url: string;
}

export interface AtlasQuiz {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface AtlasConcept {
  id: string;
  level: AtlasLevel;
  category: string;
  title: string;
  summary: string;
  why: string;
  code: string;
  explanation: string;
  comparison: string;
  pitfall: string;
  quiz: AtlasQuiz;
  labId: string;
  source: AtlasSource;
  furtherSources?: AtlasSource[];
}

export type AtlasByLanguage = Record<AtlasLanguage, AtlasConcept[]>;
