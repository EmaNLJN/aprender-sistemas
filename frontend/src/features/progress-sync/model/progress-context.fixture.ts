import { blankSnapshot, type ProgressContext } from './progress-snapshot';

export { blankSnapshot };

export const CONTENT_VERSION = '0123456789abcdef0123456789abcdef';
export const STARTER_HASH = 'a'.repeat(64);

const STEPS: Readonly<Record<string, readonly string[]>> = {
  'rust:ws-cache': ['e1', 'e2', 'e3'],
};
const OBJECTIVES: Readonly<Record<string, readonly string[]>> = {
  'rust:ws-cache': ['hit', 'miss'],
};

export const progressContext: ProgressContext = {
  contentVersion: CONTENT_VERSION,
  blankSnapshot,
  knowsExercise: (id) => ['rust-01', 'rust-02', 'go-01'].includes(id),
  knowsCampaignMission: (id) => ['rust-01', 'rust-02'].includes(id),
  knowsWorld: (id) => id === 'rust-world-1',
  knowsGuideStep: (id) => ['rust-1-1', 'rust-1-2'].includes(id),
  knowsGuideResource: (id) => id === 'book',
  knowsMilestone: (id) => id === 'rust-memory',
  knowsWorkshop: (id, language) => `${language}:${id}` in STEPS,
  knowsObjective: (id, language, key) => OBJECTIVES[`${language}:${id}`]?.includes(key) ?? false,
  stepKeyAt: (id, language, position) => STEPS[`${language}:${id}`]?.[position] ?? null,
  stepPositionOf: (id, language, key) => {
    const position = STEPS[`${language}:${id}`]?.indexOf(key) ?? -1;
    return position === -1 ? null : position;
  },
  starterHashOf: (id) => (id.startsWith('rust-') ? STARTER_HASH : null),
  predictionAnswerOf: (id) => (id === 'rust-01' ? 2 : null),
  checkpointAnswerOf: (id) => (id === 'rust-world-1' ? 1 : null),
  workshopAnswerOf: (id, language) => (`${language}:${id}` === 'rust:ws-cache' ? 0 : null),
};
