export type Language = 'rust' | 'go';
export type Confidence = 'again' | 'practice' | 'confident';
export type FocusMinutes = 15 | 25 | 45;
export type RouteMarkKind = 'step' | 'milestone' | 'favorite';
export type NoteField = 'learned' | 'next';

export type OperationBody =
  | {
      readonly type: 'exercise.prediction';
      readonly exerciseId: string;
      readonly answer: number;
      readonly correct: boolean;
      readonly contentVersion: string;
    }
  | {
      readonly type: 'exercise.assist';
      readonly exerciseId: string;
      readonly assisted?: true;
      readonly solutionSeen?: true;
    }
  | {
      readonly type: 'exercise.hints';
      readonly exerciseId: string;
      readonly revealed: number;
    }
  | {
      readonly type: 'exercise.reflection';
      readonly exerciseId: string;
      readonly text: string;
    }
  | {
      readonly type: 'exercise.customTest';
      readonly exerciseId: string;
      readonly text: string;
    }
  | {
      readonly type: 'exercise.review';
      readonly exerciseId: string;
      readonly confidence: Confidence;
      readonly reviewedAt: string;
      readonly reviewDueAt: string;
    }
  | {
      readonly type: 'exercise.draft';
      readonly exerciseId: string;
      readonly code: string | null;
      readonly starterHash: string | null;
    }
  | {
      readonly type: 'checkpoint.answer';
      readonly worldId: string;
      readonly answer: number;
      readonly passed: boolean;
      readonly contentVersion: string;
    }
  | {
      readonly type: 'workshop.prediction';
      readonly workshopId: string;
      readonly language: Language;
      readonly answer: number;
      readonly correct: boolean;
      readonly contentVersion: string;
    }
  | {
      readonly type: 'workshop.note';
      readonly workshopId: string;
      readonly language: Language;
      readonly text: string;
    }
  | {
      readonly type: 'workshop.objective';
      readonly workshopId: string;
      readonly language: Language;
      readonly objectiveKey: string;
    }
  | {
      readonly type: 'workshop.step';
      readonly workshopId: string;
      readonly language: Language;
      readonly stepKey: string;
      readonly marked: boolean;
    }
  | {
      readonly type: 'route.mark';
      readonly kind: RouteMarkKind;
      readonly itemKey: string;
      readonly marked: boolean;
    }
  | {
      readonly type: 'route.quiz';
      readonly stepId: string;
      readonly answer: number;
      readonly contentVersion: string;
    }
  | {
      readonly type: 'route.note';
      readonly language: Language;
      readonly field: NoteField;
      readonly body: string;
    }
  | {
      readonly type: 'preference.set';
      readonly name: 'routeLanguage';
      readonly value: Language;
    }
  | {
      readonly type: 'preference.set';
      readonly name: 'focusMinutes';
      readonly value: FocusMinutes;
    }
  | {
      readonly type: 'preference.set';
      readonly name: 'labSelectedRust' | 'labSelectedGo';
      readonly value: string;
    };

export type OperationType = OperationBody['type'];
export type Operation = OperationBody & {
  readonly id: string;
  readonly at: string;
};

type KeyParts = {
  [T in OperationType]: (body: Extract<OperationBody, { type: T }>) => string[];
};

const KEY_PARTS: KeyParts = {
  'exercise.prediction': (body) => [body.exerciseId],
  'exercise.assist': (body) => [body.exerciseId],
  'exercise.hints': (body) => [body.exerciseId],
  'exercise.reflection': (body) => [body.exerciseId],
  'exercise.customTest': (body) => [body.exerciseId],
  'exercise.review': (body) => [body.exerciseId],
  'exercise.draft': (body) => [body.exerciseId],
  'checkpoint.answer': (body) => [body.worldId],
  'workshop.prediction': (body) => [body.language, body.workshopId],
  'workshop.note': (body) => [body.language, body.workshopId],
  'workshop.objective': (body) => [body.language, body.workshopId, body.objectiveKey],
  'workshop.step': (body) => [body.language, body.workshopId, body.stepKey],
  'route.mark': (body) => [body.kind, body.itemKey],
  'route.quiz': (body) => [body.stepId],
  'route.note': (body) => [body.language, body.field],
  'preference.set': (body) => [body.name],
};

export function fieldKeyOf(body: OperationBody): string {
  const parts = KEY_PARTS[body.type] as (operation: OperationBody) => string[];
  return [body.type, ...parts(body)].join('|');
}

export const LANGUAGES: readonly Language[] = ['rust', 'go'];

export function isLanguage(value: unknown): value is Language {
  return value === 'rust' || value === 'go';
}

export function isFocusMinutes(value: unknown): value is FocusMinutes {
  return value === 15 || value === 25 || value === 45;
}

export function isConfidence(value: unknown): value is Confidence {
  return value === 'again' || value === 'practice' || value === 'confident';
}
