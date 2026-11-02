import type { CampaignStateV1 } from '../../../entities/campaign';
import type { LabRecord, LabStateV1 } from '../../../entities/exercise';
import type { RouteProgressV1 } from '../../../entities/guide';
import type { SystemsStateV1, WorkshopRecord } from '../../../entities/systems-workshop';
import { cloneJson } from '../../../shared/lib/clone-json';
import { incomingWins, type Clock } from './merge-rules';
import { fieldKeyOf, type Language, type Operation, type RouteMarkKind } from './operations';
import type { ProgressContext, ProgressSnapshot } from './progress-snapshot';
import type { ClockedText, ExerciseRow, ProgressAreas } from './server-rows';

export interface PendingClocks {
  clockOf(fieldKey: string): Clock | undefined;
}

export function pendingClocks(operations: readonly Operation[]): PendingClocks {
  const clocks = new Map<string, Clock>();
  for (const operation of operations) clocks.set(fieldKeyOf(operation), operation.at);
  return { clockOf: (fieldKey) => clocks.get(fieldKey) };
}

function rowWins(pending: PendingClocks, fieldKey: string, rowAt: Clock): boolean {
  const pendingAt = pending.clockOf(fieldKey);
  if (pendingAt === undefined) return true;
  return !incomingWins({ value: null, at: rowAt }, { value: null, at: pendingAt });
}

function millisOf(instant: string | null): number | undefined {
  if (instant === null) return undefined;
  const millis = Date.parse(instant);
  return Number.isNaN(millis) ? undefined : millis;
}

function recordOf(lab: LabStateV1, exerciseId: string): LabRecord {
  lab.records[exerciseId] ??= {
    predictionCorrect: false,
    assisted: false,
    solutionSeen: false,
  };
  return lab.records[exerciseId];
}

function setOrDelete(record: LabRecord, field: string, value: unknown): void {
  if (value === undefined || value === null) delete record[field];
  else record[field] = value;
}

function applyText(
  record: LabRecord,
  field: 'reflection' | 'customTest',
  value: ClockedText | null,
  wins: (at: Clock) => boolean,
): void {
  if (value !== null && wins(value.at)) record[field] = value.text;
}

function applyReview(record: LabRecord, row: ExerciseRow, wins: (at: Clock) => boolean): void {
  if (row.review === null || !wins(row.review.at)) return;
  setOrDelete(record, 'confidence', row.review.confidence);
  setOrDelete(record, 'reviewedAt', millisOf(row.review.reviewedAt));
  setOrDelete(record, 'reviewAt', millisOf(row.review.reviewDueAt));
}

function earliest(local: unknown, server: number | undefined): number | undefined {
  if (server === undefined) return typeof local === 'number' ? local : undefined;
  return typeof local === 'number' && local > 0 && local < server ? local : server;
}

function applyExercise(lab: LabStateV1, row: ExerciseRow, pending: PendingClocks): void {
  const record = recordOf(lab, row.exerciseId);
  const wins = (type: string) => (at: Clock) => rowWins(pending, `${type}|${row.exerciseId}`, at);
  if (row.prediction !== null && wins('exercise.prediction')(row.prediction.at)) {
    record.prediction = row.prediction.answer;
  }
  if (row.predictionCorrect.value) record.predictionCorrect = true;
  if (row.assisted) record.assisted = true;
  if (row.solutionSeen) record.solutionSeen = true;
  if (row.hintsRevealed !== null) {
    const local = typeof record.hints === 'number' ? record.hints : 0;
    record.hints = Math.max(local, row.hintsRevealed);
  }
  applyText(record, 'reflection', row.reflection, wins('exercise.reflection'));
  applyText(record, 'customTest', row.customTest, wins('exercise.customTest'));
  applyReview(record, row, wins('exercise.review'));
  setOrDelete(record, 'solvedAt', earliest(record.solvedAt, millisOf(row.solvedAt)));
}

function applyLab(
  lab: LabStateV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.exercises) {
    if (context.knowsExercise(row.exerciseId)) applyExercise(lab, row, pending);
  }
  for (const row of areas.drafts) {
    if (!context.knowsExercise(row.exerciseId)) continue;
    if (!rowWins(pending, `exercise.draft|${row.exerciseId}`, row.at)) continue;
    if (row.code === null) delete lab.records[row.exerciseId]?.draft;
    else recordOf(lab, row.exerciseId).draft = row.code;
  }
}

function applyCheckpoints(
  campaign: CampaignStateV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.campaign.checkpoints) {
    if (!context.knowsWorld(row.worldId)) continue;
    const local = campaign.checkpoints[row.worldId] ?? { passed: false, lastAnswer: null };
    const answer = row.lastAnswer;
    const answerWins =
      answer !== null && rowWins(pending, `checkpoint.answer|${row.worldId}`, answer.at);
    campaign.checkpoints[row.worldId] = {
      passed: local.passed || row.passed,
      lastAnswer: answerWins ? answer.value : local.lastAnswer,
    };
  }
}

function applySeals(
  campaign: CampaignStateV1,
  areas: ProgressAreas,
  context: ProgressContext,
): void {
  for (const row of areas.campaign.seals) {
    if (!context.knowsCampaignMission(row.exerciseId)) continue;
    const local = campaign.seals[row.exerciseId] ?? {
      code: false,
      prediction: false,
      assisted: false,
    };
    campaign.seals[row.exerciseId] = {
      code: local.code || row.code,
      prediction: local.prediction || row.prediction,
      assisted: local.assisted || row.assisted,
    };
  }
}

function workshopRecordOf(
  systems: SystemsStateV1,
  language: Language,
  workshopId: string,
): WorkshopRecord {
  const key = `${language}:${workshopId}`;
  systems.records[key] ??= {
    observed: [],
    code: false,
    predicted: false,
    answer: null,
    steps: [],
    note: '',
  };
  return systems.records[key];
}

function applyWorkshopProgress(
  systems: SystemsStateV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.workshops.progress) {
    if (!context.knowsWorkshop(row.workshopId, row.language)) continue;
    const record = workshopRecordOf(systems, row.language, row.workshopId);
    const where = `${row.language}|${row.workshopId}`;
    record.code ||= row.codeSealed;
    record.predicted ||= row.predictionCorrect.value;
    if (row.answer !== null && rowWins(pending, `workshop.prediction|${where}`, row.answer.at)) {
      record.answer = row.answer.value;
    }
    if (row.note !== null && rowWins(pending, `workshop.note|${where}`, row.note.at)) {
      record.note = row.note.text;
    }
  }
}

function applyWorkshopMarks(
  systems: SystemsStateV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.workshops.objectives) {
    if (!context.knowsObjective(row.workshopId, row.language, row.objectiveKey)) continue;
    const record = workshopRecordOf(systems, row.language, row.workshopId);
    if (!record.observed.includes(row.objectiveKey)) record.observed.push(row.objectiveKey);
  }
  for (const row of areas.workshops.steps) {
    const position = context.stepPositionOf(row.workshopId, row.language, row.stepKey);
    if (position === null) continue;
    const fieldKey = `workshop.step|${row.language}|${row.workshopId}|${row.stepKey}`;
    if (!rowWins(pending, fieldKey, row.at)) continue;
    const record = workshopRecordOf(systems, row.language, row.workshopId);
    const others = record.steps.filter((step) => step !== position);
    record.steps = row.marked ? [...others, position] : others;
  }
}

const MARK_LISTS: Record<RouteMarkKind, 'completed' | 'milestones' | 'favorites'> = {
  step: 'completed',
  milestone: 'milestones',
  favorite: 'favorites',
};

function knowsMark(context: ProgressContext, kind: RouteMarkKind, itemKey: string): boolean {
  if (kind === 'step') return context.knowsGuideStep(itemKey);
  if (kind === 'milestone') return context.knowsMilestone(itemKey);
  return context.knowsGuideResource(itemKey);
}

function applyRoute(
  route: RouteProgressV1,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  for (const row of areas.route.marks) {
    if (!knowsMark(context, row.kind, row.itemKey)) continue;
    if (!rowWins(pending, `route.mark|${row.kind}|${row.itemKey}`, row.at)) continue;
    const list = MARK_LISTS[row.kind];
    const others = route[list].filter((itemKey) => itemKey !== row.itemKey);
    route[list] = row.marked ? [...others, row.itemKey] : others;
  }
  for (const row of areas.route.quiz) {
    if (!context.knowsGuideStep(row.stepId)) continue;
    if (rowWins(pending, `route.quiz|${row.stepId}`, row.at))
      route.quizAnswers[row.stepId] = row.answer;
  }
  for (const row of areas.route.notes) {
    if (rowWins(pending, `route.note|${row.language}|${row.field}`, row.at)) {
      route.notes[row.language][row.field] = row.body;
    }
  }
}

function applyPreferences(
  snapshot: ProgressSnapshot,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): void {
  const preferences = areas.preferences;
  if (preferences === null) return;
  const { routeLanguage, focusMinutes, labSelected } = preferences;
  if (
    routeLanguage !== null &&
    rowWins(pending, 'preference.set|routeLanguage', routeLanguage.at)
  ) {
    snapshot.route.language = routeLanguage.value;
  }
  if (focusMinutes !== null && rowWins(pending, 'preference.set|focusMinutes', focusMinutes.at)) {
    snapshot.route.minutes = focusMinutes.value;
  }
  for (const [language, name] of [
    ['rust', 'labSelectedRust'],
    ['go', 'labSelectedGo'],
  ] as const) {
    const selected = labSelected[language];
    if (selected === null || !context.knowsExercise(selected.value)) continue;
    if (rowWins(pending, `preference.set|${name}`, selected.at))
      snapshot.lab.selected[language] = selected.value;
  }
}

// Risk 7 of A3: rows the published content does not know stay in the copy.
export function applyRows(
  snapshot: ProgressSnapshot,
  areas: ProgressAreas,
  pending: PendingClocks,
  context: ProgressContext,
): ProgressSnapshot {
  const next = cloneJson(snapshot);
  applyLab(next.lab, areas, pending, context);
  applyCheckpoints(next.campaign, areas, pending, context);
  applySeals(next.campaign, areas, context);
  applyWorkshopProgress(next.systems, areas, pending, context);
  applyWorkshopMarks(next.systems, areas, pending, context);
  applyRoute(next.route, areas, pending, context);
  applyPreferences(next, areas, pending, context);
  return next;
}
