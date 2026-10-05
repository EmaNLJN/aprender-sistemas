// Metadatos del contenido (ADR 0006 D10 a D14): build/curriculum.meta.json acompaña a
// curriculum.json y es lo único que content:import y la API toman como verdad de las huellas.
// Se calculan acá y en ningún otro lado; PHP las guarda y las compara, nunca las recalcula.
//
// Dos clases de huella, a propósito:
// - de bytes publicados (portions, contentHash): sha256 de JSON.stringify(valor), compacto y con
//   el orden de claves del documento. Es lo que sirve la API y de ahí salen los ETag.
// - de contenido canónico (gradingHash, starterHash): sobre JSON con las claves ordenadas, para
//   que reordenar claves no cuente como un cambio de corrección (ADR 0004 §2, «Hashes»).
import { createHash } from 'node:crypto';
import { CATALOGS, LANGUAGES, SYSTEMS_DOMAINS } from './catalogs.ts';
import { ContentError } from './content-error.ts';
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

// contentHash: los bytes publicados del ejercicio (así un cambio de orden de claves mueve el
// ETag del ejercicio). gradingHash: el id y la expresión de cada prueba, más las opciones y la
// respuesta de la predicción; un cambio de texto no obliga a volver a verificar. starterHash:
// el código inicial, para que D1 detecte un borrador hecho sobre un inicio viejo.
export function exerciseHashes(exercise: JsonRecord): ExerciseHashes {
  const tests = exercise.tests as JsonRecord[];
  const prediction = exercise.prediction as JsonRecord;
  return {
    contentHash: sha256Hex(JSON.stringify(exercise)),
    gradingHash: sha256Hex(
      canonicalJson({
        tests: tests.map((test) => ({ id: test.id, expression: test.expression })),
        prediction: { options: prediction.options, answer: prediction.answer },
      }),
    ),
    starterHash: sha256Hex(canonicalJson(exercise.starter)),
  };
}

// Las 17 porciones que sirve la API, en el orden de `Portion` (PHP): su nombre es la ruta
// dentro de curriculum.json, y su valor, la parte que se publica.
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

// El commit de Git del contenido, si quien construye lo pasa: la imagen de PHP lo recibe como
// build arg, porque el contexto de Docker no trae .git. Vacío o ausente: null.
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
): CurriculumMeta {
  const exercises: Record<string, ExerciseHashes> = {};
  const catalogs = [
    ...Object.values(curriculum.lab),
    ...Object.values(curriculum.quests),
    ...Object.values(curriculum.cores),
  ];
  for (const exercise of catalogs.flat())
    exercises[exercise.id as string] = exerciseHashes(exercise);
  const portions = Object.fromEntries(
    Object.entries(portionsOf(curriculum)).map(([name, part]) => [
      name,
      sha256Hex(JSON.stringify(part)),
    ]),
  );
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
