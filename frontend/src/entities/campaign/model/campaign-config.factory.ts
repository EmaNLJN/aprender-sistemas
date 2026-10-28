import { Factory } from 'fishery';
import type {
  CampaignConfig,
  CampaignExercise,
  CampaignLanguage,
  CampaignWorldDefinition,
} from './types';

interface ExerciseParams {
  language: CampaignLanguage;
}

interface WorldParams {
  language: CampaignLanguage;
  missionIds: readonly string[];
}

export const campaignExerciseFactory = Factory.define<CampaignExercise, ExerciseParams>(
  ({ sequence, transientParams }) => {
    const language = transientParams.language ?? 'rust';
    return {
      id: `${language}-${200 + sequence}`,
      language,
      title: 'Misión armada a mano',
      tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
    };
  },
);

export const campaignWorldFactory = Factory.define<CampaignWorldDefinition, WorldParams>(
  ({ sequence, transientParams }) => {
    const language = transientParams.language ?? 'rust';
    const ids = transientParams.missionIds ?? [];
    return {
      id: `${language}-world-${sequence}`,
      level: 'beginner',
      title: 'Mundo armado a mano',
      badge: 'Insignia armada',
      subtitle: 'Un subtítulo.',
      story: 'Una historia.',
      concepts: ['Un concepto'],
      why: 'Un porqué.',
      guide: ['Un paso.', 'Otro paso.', 'El último paso.'],
      trainingIds: ids.slice(0, 3),
      challengeIds: ids.slice(3, 6),
      bossId: ids[5] ?? '',
      checkpoint: {
        question: '¿Por qué?',
        options: ['Por una regla', 'Por azar', 'Por costumbre'],
        answer: 0,
        explanation: 'La regla sostiene el contrato.',
      },
    };
  },
);

export function handMadeCampaign(
  worldsPerLanguage: Readonly<Record<CampaignLanguage, number>>,
): CampaignConfig {
  campaignExerciseFactory.rewindSequence();
  campaignWorldFactory.rewindSequence();
  const exercises: CampaignExercise[] = [];
  const worlds: Record<CampaignLanguage, CampaignWorldDefinition[]> = { rust: [], go: [] };
  for (const language of ['rust', 'go'] as const) {
    for (let world = 0; world < worldsPerLanguage[language]; world += 1) {
      const missions = campaignExerciseFactory.buildList(6, {}, { transient: { language } });
      exercises.push(...missions);
      worlds[language].push(
        campaignWorldFactory.build(
          {},
          { transient: { language, missionIds: missions.map((mission) => mission.id) } },
        ),
      );
    }
  }
  return { exercises, worlds };
}
