import type { ProgressAreas } from './server-rows';

interface Revised {
  readonly revision: number;
}

function upsert<R extends Revised>(
  stored: readonly R[],
  incoming: readonly R[],
  keyOf: (row: R) => string,
): R[] {
  const byKey = new Map(stored.map((row) => [keyOf(row), row]));
  for (const row of incoming) {
    const current = byKey.get(keyOf(row));
    if (current === undefined || row.revision >= current.revision) byKey.set(keyOf(row), row);
  }
  return [...byKey.values()];
}

function newerPreferences(
  stored: ProgressAreas['preferences'],
  incoming: ProgressAreas['preferences'],
): ProgressAreas['preferences'] {
  if (incoming === null) return stored;
  if (stored === null || incoming.revision >= stored.revision) return incoming;
  return stored;
}

export function mergeAreas(
  stored: ProgressAreas,
  changes: ProgressAreas,
  full: boolean,
): ProgressAreas {
  if (full) return changes;
  return {
    exercises: upsert(stored.exercises, changes.exercises, (row) => row.exerciseId),
    drafts: upsert(stored.drafts, changes.drafts, (row) => row.exerciseId),
    campaign: {
      seals: upsert(stored.campaign.seals, changes.campaign.seals, (row) => row.exerciseId),
      checkpoints: upsert(
        stored.campaign.checkpoints,
        changes.campaign.checkpoints,
        (row) => row.worldId,
      ),
    },
    workshops: {
      progress: upsert(
        stored.workshops.progress,
        changes.workshops.progress,
        (row) => `${row.language}|${row.workshopId}`,
      ),
      objectives: upsert(
        stored.workshops.objectives,
        changes.workshops.objectives,
        (row) => `${row.language}|${row.workshopId}|${row.objectiveKey}`,
      ),
      steps: upsert(
        stored.workshops.steps,
        changes.workshops.steps,
        (row) => `${row.language}|${row.workshopId}|${row.stepKey}`,
      ),
    },
    route: {
      marks: upsert(stored.route.marks, changes.route.marks, (row) => `${row.kind}|${row.itemKey}`),
      quiz: upsert(stored.route.quiz, changes.route.quiz, (row) => row.stepId),
      notes: upsert(
        stored.route.notes,
        changes.route.notes,
        (row) => `${row.language}|${row.field}`,
      ),
    },
    preferences: newerPreferences(stored.preferences, changes.preferences),
  };
}
