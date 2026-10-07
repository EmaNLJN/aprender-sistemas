// Meta for content:import (ADR 0006 D10 to D14; FR-028, FR-031): the hashes are computed only
// here, so PHP stores and compares them but never recomputes them.
import { createHash } from 'node:crypto';
import { CATALOGS, LANGUAGES, SYSTEMS_DOMAINS } from './catalogs.ts';
import { ContentError } from './content-error.ts';
import { harnessBody, type HarnessTemplates } from './harness.ts';
import type { Curriculum } from './load-curriculum.ts';
import type { JsonRecord } from './shape.ts';
import type { WorkshopStepKeys } from './workshops.ts';

export interface ExerciseHashes {
  contentHash: string;
  gradingHash: string;
  starterHash: string;
}

export interface CurriculumMeta {
  documentHash: string;
  sourceCommit: string | null;
  languages: readonly string[];
  catalogs: typeof CATALOGS;
  portions: Record<string, string>;
  exercises: Record<string, ExerciseHashes>;
  workshopSteps: WorkshopStepKeys;
}

const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// The Go harness imports these packages, so they decide what compiles (B2 FR-037): sorted and
// without repeats, so reordering them is not a grading change. Rust has none.
function gradingImports(exercise: JsonRecord): string[] {
  if (exercise.language !== 'go') return [];
  return [...new Set(exercise.imports as string[])].sort();
}

// contentHash covers the published bytes (FR-031); gradingHash and starterHash use canonical JSON,
// so reordering keys is not a grading change (ADR 0004 §2, "Hashes"). The imports join the
// grading hash only when there are some: the other exercises keep the hash they had.
export function exerciseHashes(exercise: JsonRecord): ExerciseHashes {
  const tests = exercise.tests as JsonRecord[];
  const prediction = exercise.prediction as JsonRecord;
  const grading: Record<string, unknown> = {
    tests: tests.map((test) => ({ id: test.id, expression: test.expression })),
    prediction: { options: prediction.options, answer: prediction.answer },
  };
  const imports = gradingImports(exercise);
  if (imports.length > 0) grading.imports = imports;
  return {
    contentHash: sha256Hex(JSON.stringify(exercise)),
    gradingHash: sha256Hex(canonicalJson(grading)),
    starterHash: sha256Hex(canonicalJson(exercise.starter)),
  };
}

// The 17 portions of ADR 0006 D11 that come from curriculum.json, in the order of PHP's Portion
// enum; the 18th, the harness, comes from content/harness/.
export function portionsOf(curriculum: Curriculum): Record<string, unknown> {
  const portions: Record<string, unknown> = {};
  for (const language of LANGUAGES) portions[`lab.${language}`] = curriculum.lab[language];
  for (const language of LANGUAGES) portions[`quests.${language}`] = curriculum.quests[language];
  for (const domain of SYSTEMS_DOMAINS) portions[`cores.${domain}`] = curriculum.cores[domain];
  for (const language of LANGUAGES)
    portions[`campaign.${language}`] = curriculum.campaign[language];
  for (const domain of SYSTEMS_DOMAINS) {
    portions[`workshops.${domain}`] = curriculum.workshops[domain];
  }
  for (const language of LANGUAGES) portions[`atlas.${language}`] = curriculum.atlas[language];
  portions.guide = curriculum.guide;
  return portions;
}

// FR-037: the commit arrives as a build arg, because the Docker context has no .git.
export function sourceCommitFrom(env: Record<string, string | undefined>): string | null {
  const commit = env.CONTENT_SOURCE_COMMIT ?? '';
  if (commit === '') return null;
  if (!COMMIT.test(commit)) {
    throw new ContentError(
      `CONTENT_SOURCE_COMMIT: se esperaba el hash completo de un commit (40 o 64 caracteres hexadecimales) y llegó «${commit}»`,
    );
  }
  return commit;
}

export function curriculumMeta(
  curriculum: Curriculum,
  document: string,
  sourceCommit: string | null,
  workshopSteps: WorkshopStepKeys,
  harness: HarnessTemplates,
): CurriculumMeta {
  const exercises: Record<string, ExerciseHashes> = {};
  const catalogs = [
    ...Object.values(curriculum.lab),
    ...Object.values(curriculum.quests),
    ...Object.values(curriculum.cores),
  ];
  for (const exercise of catalogs.flat())
    exercises[exercise.id as string] = exerciseHashes(exercise);
  const portions: Record<string, string> = Object.fromEntries(
    Object.entries(portionsOf(curriculum)).map(([name, part]) => [
      name,
      sha256Hex(JSON.stringify(part)),
    ]),
  );
  portions.harness = sha256Hex(harnessBody(harness));
  return {
    documentHash: sha256Hex(document),
    sourceCommit,
    languages: LANGUAGES,
    catalogs: CATALOGS,
    portions,
    exercises,
    workshopSteps,
  };
}
