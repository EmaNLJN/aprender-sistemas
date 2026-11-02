import type { CampaignStateV1 } from '../../../entities/campaign';
import type { LabRecord, LabStateV1 } from '../../../entities/exercise';
import type { RouteProgressV1 } from '../../../entities/guide';
import type { SystemsStateV1, WorkshopRecord } from '../../../entities/systems-workshop';
import { wellFormed } from '../../../shared/lib/well-formed';
import {
  LANGUAGES,
  isConfidence,
  isFocusMinutes,
  isLanguage,
  type Language,
  type OperationBody,
  type RouteMarkKind,
} from './operations';
import type { ProgressAreaName, ProgressContext, ProgressSnapshot } from './progress-snapshot';

const NOTE_FIELDS = ['learned', 'next'] as const;
const STUDY_FLOOR_MS = Date.UTC(2020, 0, 1);
const STUDY_CEILING_MS = Date.UTC(2100, 0, 1);

function answerOf(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

function studyInstantOf(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= STUDY_FLOOR_MS && value <= STUDY_CEILING_MS ? value : null;
}

function markChanges(
  kind: RouteMarkKind,
  before: readonly string[],
  after: readonly string[],
): OperationBody[] {
  const had = new Set(before);
  const has = new Set(after);
  const marked = [...has].filter((itemKey) => !had.has(itemKey));
  const unmarked = [...had].filter((itemKey) => !has.has(itemKey));
  return [
    ...marked.map((itemKey) => ({ type: 'route.mark', kind, itemKey, marked: true }) as const),
    ...unmarked.map((itemKey) => ({ type: 'route.mark', kind, itemKey, marked: false }) as const),
  ];
}

function routePreferences(before: RouteProgressV1, after: RouteProgressV1): OperationBody[] {
  const operations: OperationBody[] = [];
  if (after.language !== before.language && isLanguage(after.language)) {
    operations.push({
      type: 'preference.set',
      name: 'routeLanguage',
      value: after.language,
    });
  }
  if (after.minutes !== before.minutes && isFocusMinutes(after.minutes)) {
    operations.push({
      type: 'preference.set',
      name: 'focusMinutes',
      value: after.minutes,
    });
  }
  return operations;
}

function quizChanges(
  before: RouteProgressV1['quizAnswers'],
  after: RouteProgressV1['quizAnswers'],
  contentVersion: string,
): OperationBody[] {
  return Object.entries(after).flatMap(([stepId, value]) => {
    const answer = answerOf(value);
    if (answer === null || answer === before[stepId]) return [];
    return [{ type: 'route.quiz', stepId, answer, contentVersion } as const];
  });
}

function noteChanges(
  before: RouteProgressV1['notes'],
  after: RouteProgressV1['notes'],
): OperationBody[] {
  return LANGUAGES.flatMap((language) =>
    NOTE_FIELDS.flatMap((field) => {
      const body = after[language]?.[field];
      if (typeof body !== 'string' || body === before[language]?.[field]) return [];
      return [
        {
          type: 'route.note',
          language,
          field,
          body: wellFormed(body),
        } as const,
      ];
    }),
  );
}

export function diffRoute(
  before: RouteProgressV1,
  after: RouteProgressV1,
  context: ProgressContext,
): OperationBody[] {
  return [
    ...routePreferences(before, after),
    ...markChanges('step', before.completed, after.completed),
    ...markChanges('milestone', before.milestones, after.milestones),
    ...markChanges('favorite', before.favorites, after.favorites),
    ...quizChanges(before.quizAnswers, after.quizAnswers, context.contentVersion),
    ...noteChanges(before.notes, after.notes),
  ];
}

function predictionChange(
  exerciseId: string,
  before: LabRecord,
  after: LabRecord,
  contentVersion: string,
): OperationBody[] {
  const answer = answerOf(after.prediction);
  if (answer === null) return [];
  const correct = after.predictionCorrect === true;
  if (answer === answerOf(before.prediction) && correct === (before.predictionCorrect === true)) {
    return [];
  }
  return [
    {
      type: 'exercise.prediction',
      exerciseId,
      answer,
      correct,
      contentVersion,
    },
  ];
}

function assistChange(exerciseId: string, before: LabRecord, after: LabRecord): OperationBody[] {
  const assisted = after.assisted === true && before.assisted !== true;
  const solutionSeen = after.solutionSeen === true && before.solutionSeen !== true;
  if (!assisted && !solutionSeen) return [];
  return [
    {
      type: 'exercise.assist',
      exerciseId,
      ...(assisted ? { assisted: true as const } : {}),
      ...(solutionSeen ? { solutionSeen: true as const } : {}),
    },
  ];
}

function hintsChange(exerciseId: string, before: LabRecord, after: LabRecord): OperationBody[] {
  const revealed = answerOf(after.hints);
  if (revealed === null || revealed < 1 || revealed <= (answerOf(before.hints) ?? 0)) return [];
  return [{ type: 'exercise.hints', exerciseId, revealed }];
}

function textChanges(exerciseId: string, before: LabRecord, after: LabRecord): OperationBody[] {
  const operations: OperationBody[] = [];
  if (typeof after.reflection === 'string' && after.reflection !== before.reflection) {
    operations.push({
      type: 'exercise.reflection',
      exerciseId,
      text: wellFormed(after.reflection),
    });
  }
  if (typeof after.customTest === 'string' && after.customTest !== before.customTest) {
    operations.push({
      type: 'exercise.customTest',
      exerciseId,
      text: wellFormed(after.customTest),
    });
  }
  return operations;
}

function draftChange(
  exerciseId: string,
  before: LabRecord,
  after: LabRecord,
  context: ProgressContext,
): OperationBody[] {
  if (typeof after.draft === 'string' && after.draft !== before.draft) {
    const code = wellFormed(after.draft);
    return [
      {
        type: 'exercise.draft',
        exerciseId,
        code,
        starterHash: context.starterHashOf(exerciseId),
      },
    ];
  }
  if (typeof before.draft === 'string' && after.draft === undefined) {
    return [{ type: 'exercise.draft', exerciseId, code: null, starterHash: null }];
  }
  return [];
}

function reviewChange(exerciseId: string, before: LabRecord, after: LabRecord): OperationBody[] {
  const confidence = after.confidence;
  const reviewedAt = studyInstantOf(after.reviewedAt);
  const reviewDueAt = studyInstantOf(after.reviewAt);
  if (!isConfidence(confidence) || reviewedAt === null || reviewDueAt === null) return [];
  const unchanged =
    confidence === before.confidence &&
    reviewedAt === before.reviewedAt &&
    reviewDueAt === before.reviewAt;
  if (unchanged) return [];
  return [
    {
      type: 'exercise.review',
      exerciseId,
      confidence,
      reviewedAt: new Date(reviewedAt).toISOString(),
      reviewDueAt: new Date(reviewDueAt).toISOString(),
    },
  ];
}

function selectedChanges(
  before: LabStateV1['selected'],
  after: LabStateV1['selected'],
): OperationBody[] {
  return LANGUAGES.flatMap((language) => {
    const value = after[language];
    if (typeof value !== 'string' || value === before[language]) return [];
    const name = language === 'rust' ? 'labSelectedRust' : 'labSelectedGo';
    return [{ type: 'preference.set', name, value } as const];
  });
}

export function diffLab(
  before: LabStateV1,
  after: LabStateV1,
  context: ProgressContext,
): OperationBody[] {
  const records = Object.entries(after.records).flatMap(([exerciseId, record]) => {
    const previous = before.records[exerciseId] ?? {};
    return [
      ...predictionChange(exerciseId, previous, record, context.contentVersion),
      ...assistChange(exerciseId, previous, record),
      ...hintsChange(exerciseId, previous, record),
      ...textChanges(exerciseId, previous, record),
      ...draftChange(exerciseId, previous, record, context),
      ...reviewChange(exerciseId, previous, record),
    ];
  });
  return [...selectedChanges(before.selected, after.selected), ...records];
}

export function diffCampaign(
  before: CampaignStateV1,
  after: CampaignStateV1,
  context: ProgressContext,
): OperationBody[] {
  return Object.entries(after.checkpoints).flatMap(([worldId, checkpoint]) => {
    const answer = answerOf(checkpoint.lastAnswer);
    const previous = before.checkpoints[worldId];
    if (answer === null) return [];
    if (answer === previous?.lastAnswer && checkpoint.passed === previous.passed) return [];
    const passed = checkpoint.passed === true;
    return [
      {
        type: 'checkpoint.answer',
        worldId,
        answer,
        passed,
        contentVersion: context.contentVersion,
      } as const,
    ];
  });
}

const EMPTY_WORKSHOP: WorkshopRecord = {
  observed: [],
  code: false,
  predicted: false,
  answer: null,
  steps: [],
  note: '',
};

function workshopOf(key: string): { language: Language; workshopId: string } | null {
  const separator = key.indexOf(':');
  const language = key.slice(0, separator);
  if (separator < 1 || !isLanguage(language)) return null;
  return { language, workshopId: key.slice(separator + 1) };
}

function workshopAnswer(
  where: { language: Language; workshopId: string },
  before: WorkshopRecord,
  after: WorkshopRecord,
  contentVersion: string,
): OperationBody[] {
  const answer = answerOf(after.answer);
  if (answer === null) return [];
  if (answer === before.answer && after.predicted === before.predicted) return [];
  const correct = after.predicted === true;
  return [{ type: 'workshop.prediction', ...where, answer, correct, contentVersion }];
}

function workshopSteps(
  where: { language: Language; workshopId: string },
  before: WorkshopRecord,
  after: WorkshopRecord,
  context: ProgressContext,
): OperationBody[] {
  const had = new Set(before.steps);
  const has = new Set(after.steps);
  const changes = [
    ...[...has]
      .filter((position) => !had.has(position))
      .map((position) => [position, true] as const),
    ...[...had]
      .filter((position) => !has.has(position))
      .map((position) => [position, false] as const),
  ];
  return changes.flatMap(([position, marked]) => {
    const stepKey = context.stepKeyAt(where.workshopId, where.language, position);
    return stepKey === null ? [] : [{ type: 'workshop.step', ...where, stepKey, marked } as const];
  });
}

export function diffSystems(
  before: SystemsStateV1,
  after: SystemsStateV1,
  context: ProgressContext,
): OperationBody[] {
  return Object.entries(after.records).flatMap(([key, record]) => {
    const where = workshopOf(key);
    if (where === null) return [];
    const previous = before.records[key] ?? EMPTY_WORKSHOP;
    const notes: OperationBody[] =
      typeof record.note === 'string' && record.note !== previous.note
        ? [{ type: 'workshop.note', ...where, text: wellFormed(record.note) }]
        : [];
    const observed = record.observed
      .filter((objectiveKey) => !previous.observed.includes(objectiveKey))
      .map((objectiveKey) => ({ type: 'workshop.objective', ...where, objectiveKey }) as const);
    return [
      ...workshopAnswer(where, previous, record, context.contentVersion),
      ...notes,
      ...observed,
      ...workshopSteps(where, previous, record, context),
    ];
  });
}

export function diffArea(
  area: ProgressAreaName,
  before: ProgressSnapshot,
  after: ProgressSnapshot,
  context: ProgressContext,
): OperationBody[] {
  switch (area) {
    case 'route':
      return diffRoute(before.route, after.route, context);
    case 'lab':
      return diffLab(before.lab, after.lab, context);
    case 'campaign':
      return diffCampaign(before.campaign, after.campaign, context);
    case 'systems':
      return diffSystems(before.systems, after.systems, context);
  }
}
