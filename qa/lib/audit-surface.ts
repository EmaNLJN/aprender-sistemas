export const AUDITED_SURFACE: readonly string[] = [
  'content/rust/',
  'content/go/',
  'content/harness/',
  'tools/content/exercises.ts',
  'tools/content/harness.ts',
  'backend/executor/images/',
  'backend/executor/internal/sandbox/',
  'backend/executor/cmd/executor/main.go',
  'backend/api/app/Runs/Program/',
  'backend/api/app/Runs/Evidence/',
  'backend/api/app/Runs/Admission/ExerciseReader.php',
  'backend/api/app/Content/ExerciseImports.php',
  'backend/api/app/Runs/Execution/ExecutorClient.php',
  'backend/api/app/Runs/Execution/ExecutorReply.php',
  'backend/api/app/Runs/Execution/ReplyKind.php',
  'backend/api/app/Audit/',
  'backend/api/app/Console/Commands/AuditCurriculum.php',
  'backend/api/config/audit.php',
];

function touches(changed: string, entry: string): boolean {
  return entry.endsWith('/') ? changed.startsWith(entry) : changed === entry;
}

export function auditedPaths(paths: readonly string[]): string[] {
  return paths.filter(
    (changed) =>
      !changed.endsWith('_test.go') && AUDITED_SURFACE.some((entry) => touches(changed, entry)),
  );
}
