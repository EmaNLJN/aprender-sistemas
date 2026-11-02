export interface GoExerciseImports {
  id: string;
  imports: readonly string[];
}

export interface MissingWarmPackage {
  exercise: string;
  package: string;
}

const IMPORT_BLOCK = /^import \(\n([\s\S]*?)^\)/m;
const IMPORT_LINE = /^(?:_\s+)?"([^"]+)"$/;

export function warmPackages(source: string): string[] {
  const block = IMPORT_BLOCK.exec(source);
  if (!block) throw new Error('warm/main.go: falta el bloque «import ( … )»');
  return block[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const match = IMPORT_LINE.exec(line);
      if (!match) throw new Error(`warm/main.go: la línea «${line}» no es un import`);
      return match[1];
    });
}

export function missingWarmPackages(
  exercises: readonly GoExerciseImports[],
  warm: readonly string[],
): MissingWarmPackage[] {
  const available = new Set(['fmt', ...warm]);
  return exercises.flatMap((exercise) =>
    exercise.imports
      .filter((name) => !available.has(name))
      .map((name) => ({ exercise: exercise.id, package: name })),
  );
}

export function describeMissing(missing: MissingWarmPackage): string {
  return `${missing.exercise} importa ${missing.package}, que no está en backend/executor/images/go/warm/main.go: sumalo a la lista y reconstruí la imagen de Go con «docker compose --profile sandbox-images build».`;
}
