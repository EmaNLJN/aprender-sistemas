import type { Operation, OperationBody } from './operations';
import type { ProgressContext } from './progress-snapshot';

// FR-007 and FR-064: a stale_content answer was stored by its clock without its flag. Graded again
// with the published content, it goes back to the queue only if it now earns the flag.
export function reevaluate(operation: Operation, context: ProgressContext): OperationBody | null {
  const contentVersion = context.contentVersion;
  switch (operation.type) {
    case 'exercise.prediction': {
      const correct = context.predictionAnswerOf(operation.exerciseId) === operation.answer;
      const { exerciseId, answer } = operation;
      return correct ? { type: operation.type, exerciseId, answer, correct, contentVersion } : null;
    }
    case 'checkpoint.answer': {
      const passed = context.checkpointAnswerOf(operation.worldId) === operation.answer;
      const { worldId, answer } = operation;
      return passed ? { type: operation.type, worldId, answer, passed, contentVersion } : null;
    }
    case 'workshop.prediction': {
      const { workshopId, language, answer } = operation;
      const correct = context.workshopAnswerOf(workshopId, language) === answer;
      return correct
        ? {
            type: operation.type,
            workshopId,
            language,
            answer,
            correct,
            contentVersion,
          }
        : null;
    }
    default:
      return null;
  }
}
