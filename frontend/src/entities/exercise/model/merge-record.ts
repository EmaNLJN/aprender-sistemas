import { isBlankText } from '../../../shared/lib/is-blank-text';
import { hasPassingEvidence } from './passing-evidence';

type HelpFlag = 'predictionCorrect' | 'assisted' | 'solutionSeen';
type TextField = 'draft' | 'reflection';

export interface LabRecord {
  draft?: string;
  reflection?: string;
  solvedAt?: number;
  predictionCorrect?: boolean;
  assisted?: boolean;
  solutionSeen?: boolean;
  result?: unknown;
  [field: string]: unknown;
}

const HELP_FLAGS: HelpFlag[] = ['predictionCorrect', 'assisted', 'solutionSeen'];
const TEXT_FIELDS: TextField[] = ['draft', 'reflection'];

interface ExpectedTest {
  id: string;
}

// La evidencia se mide contra las pruebas esperadas del ejercicio, no contra las que trae
// el propio resultado: un resultado con `tests: []` no prueba nada.
function resultProves(record: LabRecord, expectedTests: readonly ExpectedTest[]): boolean {
  return hasPassingEvidence(record.result, expectedTests);
}

// Fecha de resolución válida: sólo cuentan los valores positivos.
function isSolvedAt(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

// Fusiona un registro importado con el local sin perder logros (ADR 0003, punto 5):
// las marcas de ayuda se combinan con OR, `solvedAt` conserva el valor positivo más antiguo,
// un resultado con evidencia no se reemplaza por uno sin ella y los textos en blanco no pisan.
// El resto de los campos importados reemplaza a los locales.
export function mergeRecord(
  local: LabRecord | undefined,
  incoming: LabRecord,
  expectedTests: readonly ExpectedTest[],
): LabRecord {
  const current = local ?? {};
  const merged: LabRecord = { ...current, ...incoming };
  for (const flag of HELP_FLAGS) merged[flag] = current[flag] === true || incoming[flag] === true;
  for (const field of TEXT_FIELDS) {
    if (isBlankText(incoming[field])) merged[field] = current[field];
  }
  const solvedTimes = [current.solvedAt, incoming.solvedAt].filter(isSolvedAt);
  if (solvedTimes.length > 0) merged.solvedAt = Math.min(...solvedTimes);
  else delete merged.solvedAt;
  if (resultProves(current, expectedTests) && !resultProves(incoming, expectedTests))
    merged.result = current.result;
  return merged;
}
