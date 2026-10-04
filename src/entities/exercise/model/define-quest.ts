import type { LevelId } from '../../../shared/config/levels';
import { formatExerciseId, numberTests } from './builders';
import type { ChallengeType, Exercise, ExerciseLanguage, QuestDraft } from './types';

export interface QuestWorld {
  topicId: string;
  topic: string;
  level: LevelId;
}

// Lo único que difiere entre los desafíos de Rust y de Go.
export interface QuestCatalog {
  language: ExerciseLanguage;
  worlds: QuestWorld[];
  bossMinutes: number;
}

const FIRST_QUEST_NUMBER = 101;
const QUESTS_PER_WORLD = 3;
const FIRST_QUEST_STAGE = 21;
const CHALLENGE_ORDER: ChallengeType[] = ['repair', 'kata', 'boss'];

// Cada mundo tiene tres desafíos: reparación, kata y jefe, numerados desde el 101.
export function defineQuest(catalog: QuestCatalog, number: number, draft: QuestDraft): Exercise {
  const offset = number - FIRST_QUEST_NUMBER;
  const worldIndex = Math.floor(offset / QUESTS_PER_WORLD);
  const position = offset % QUESTS_PER_WORLD;
  const world = catalog.worlds[worldIndex];
  const challengeType = CHALLENGE_ORDER[position];
  return {
    id: formatExerciseId(catalog.language, number),
    language: catalog.language,
    topicId: world.topicId,
    topic: world.topic,
    stage: FIRST_QUEST_STAGE + worldIndex,
    level: world.level,
    challengeType,
    kind: position === 0 ? 'reparar' : 'completar',
    minutes: challengeType === 'boss' ? catalog.bossMinutes : 12,
    imports: [],
    visual: 'flow',
    ...draft,
    tests: numberTests(draft.tests),
  };
}
