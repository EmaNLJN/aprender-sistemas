import type { GuideData, GuideStep } from './types';

function step(id: string, optionCount: number): GuideStep {
  return {
    id,
    title: id,
    minutes: 25,
    objective: '',
    task: '',
    doneWhen: '',
    resourceIds: [],
    quiz: {
      question: '',
      options: Array.from({ length: optionCount }, (_, index) => `option ${index}`),
      answer: 0,
      explanation: '',
    },
  };
}

function resource(id: string): GuideData['resources'][number] {
  return {
    id,
    title: id,
    url: 'https://example.test',
    languages: ['both'],
    category: 'lectura',
    cost: 'gratis',
    format: '',
    description: '',
    why: '',
    caveat: '',
    featured: false,
  };
}

export function buildGuide(): GuideData {
  return {
    resources: [resource('rust-100'), resource('go-tour')],
    tracks: {
      rust: {
        title: 'Rust',
        description: '',
        modules: [
          {
            id: 'm1',
            title: 'm1',
            subtitle: '',
            steps: [step('rust-first-session', 3), step('rust-ownership', 2)],
          },
        ],
      },
      go: { title: 'Go', description: '', modules: [] },
    },
    sources: [],
  };
}
