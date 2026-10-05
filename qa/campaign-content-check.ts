import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  loadCampaignWorlds,
  loadLabExercises,
  SYSTEMS_DOMAINS,
  loadCampaignEngine,
  loadSystemsDomain,
} from './lib/legacy-sources.ts';

interface Exercise {
  id: string;
  level?: string;
  stage?: number;
}
interface Chapter {
  id: string;
  level: string;
  trainingIds: string[];
  challengeIds: string[];
  bossId: string;
  checkpoint: { options: string[] };
  [field: string]: unknown;
}
interface WorldView {
  unlocked: boolean;
  missions: unknown[];
  bossReady: boolean;
  checkpointReady: boolean;
}
interface CampaignEngine {
  init(config: { exercises: Exercise[]; worlds: Record<string, Chapter[]> }): unknown;
  getSummary(language: string): { maxScore: number; score: number };
  getWorlds(language: string): WorldView[];
}
type Registry = Record<string, unknown>;

const context = vm.createContext({
  window: {} as Registry,
  localStorage: { getItem: () => null, setItem: () => {} },
});
const languages = ['rust', 'go'] as const,
  levels = ['beginner', 'medium', 'advanced', 'expert'];
const allExercises: Exercise[] = [],
  worlds: Record<string, Chapter[]> = {};
loadLabExercises(context);
loadCampaignWorlds(context);
for (const language of languages) {
  const name = language.toUpperCase(),
    core = context.window[name + '_LAB'] as Exercise[],
    quests = context.window[name + '_QUESTS'] as Exercise[];
  const chapters = context.window[name + '_CAMPAIGN'] as Chapter[];
  assert.equal(core.length, 100, language + ': core curriculum');
  assert.equal(quests.length, 12, language + ': campaign curriculum');
  assert.ok(Array.isArray(chapters) && chapters.length === 4, language + ': four worlds');
  const coreIds = new Set(core.map((ex) => ex.id)),
    questIds = new Set(quests.map((ex) => ex.id));
  const usedTraining = new Set(),
    usedChallenges = new Set();
  for (const [i, chapter] of chapters.entries()) {
    assert.equal(chapter.level, levels[i], chapter.id + ': progressive level');
    for (const field of ['id', 'title', 'subtitle', 'story', 'why', 'badge']) {
      assert.ok(
        typeof chapter[field] === 'string' && chapter[field].trim(),
        chapter.id + ': ' + field,
      );
    }
    assert.ok(
      Array.isArray(chapter.concepts) &&
        chapter.concepts.length > 0 &&
        chapter.concepts.every((value) => typeof value === 'string' && value.trim()),
      chapter.id + ': concepts',
    );
    assert.ok(
      Array.isArray(chapter.guide) &&
        chapter.guide.length === 3 &&
        chapter.guide.every((value) => typeof value === 'string' && value.trim()),
      chapter.id + ': three teaching steps',
    );
    assert.equal(chapter.trainingIds.length, 3);
    assert.equal(chapter.challengeIds.length, 3);
    assert.equal(chapter.bossId, chapter.challengeIds[2]);
    for (const id of chapter.trainingIds) {
      assert.ok(
        coreIds.has(id) && !usedTraining.has(id),
        chapter.id + ': unique existing training ' + id,
      );
      usedTraining.add(id);
    }
    for (const [j, id] of chapter.challengeIds.entries()) {
      assert.equal(
        id,
        language + '-' + (101 + i * 3 + j),
        chapter.id + ': sequential campaign mission',
      );
      assert.ok(
        questIds.has(id) && !usedChallenges.has(id),
        chapter.id + ': unique new challenge ' + id,
      );
      usedChallenges.add(id);
      const ex = quests.find((item) => item.id === id);
      assert.ok(ex);
      assert.equal(ex.level, chapter.level);
      assert.equal(ex.stage, 21 + i);
    }
    assert.equal(
      new Set(chapter.checkpoint.options).size,
      chapter.checkpoint.options.length,
      chapter.id + ': distinct checkpoint alternatives',
    );
  }
  assert.equal(usedTraining.size, 12);
  assert.equal(usedChallenges.size, 12);
  worlds[language] = chapters;
  allExercises.push(...core, ...quests);
}
for (const domain of SYSTEMS_DOMAINS) {
  loadSystemsDomain(context, domain);
  allExercises.push(...(context.window['SYSTEMS_' + domain.toUpperCase() + '_LABS'] as Exercise[]));
}
assert.equal(allExercises.length, 274);
loadCampaignEngine(context);
const engine = context.window.TallerCampaignEngine as CampaignEngine;
engine.init({ exercises: allExercises, worlds });
for (const language of languages) {
  assert.equal(engine.getSummary(language).maxScore, 720);
  assert.equal(engine.getSummary(language).score, 0);
  const chapters = engine.getWorlds(language);
  assert.equal(chapters[0].unlocked, true);
  assert.ok(chapters.slice(1).every((chapter) => !chapter.unlocked));
  assert.ok(
    chapters.every(
      (chapter) => chapter.missions.length === 6 && !chapter.bossReady && !chapter.checkpointReady,
    ),
  );
  console.log(
    language + ': four worlds / 24 missions / 12 new challenges / 720 available XP PASS.',
  );
}
console.log('Eight real worlds integrated with 274 exercises PASS; no compiler requests made.');
