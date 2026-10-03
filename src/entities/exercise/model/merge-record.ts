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
  result?: { tests: { id: string }[] };
  [field: string]: unknown;
}

const HELP_FLAGS: HelpFlag[] = ['predictionCorrect', 'assisted', 'solutionSeen'];
const TEXT_FIELDS: TextField[] = ['draft', 'reflection'];

// El resultado local ya fue saneado: sus pruebas son las del ejercicio.
function resultProves(record: LabRecord): boolean {
  return hasPassingEvidence(record.result, record.result?.tests ?? []);
}

// Fusiona un registro importado con el local sin perder logros (ADR 0003, punto 5):
// las marcas de ayuda se combinan con OR, `solvedAt` conserva el valor más antiguo, un
// resultado con evidencia no se reemplaza por uno sin ella y los textos vacíos no pisan.
// El resto de los campos importados reemplaza a los locales.
export function mergeRecord(local: LabRecord | undefined, incoming: LabRecord): LabRecord {
  const current = local ?? {};
  const merged: LabRecord = { ...current, ...incoming };
  for (const flag of HELP_FLAGS) merged[flag] = current[flag] === true || incoming[flag] === true;
  for (const field of TEXT_FIELDS) {
    const imported = incoming[field];
    if (typeof imported !== 'string' || imported.trim() === '') merged[field] = current[field];
  }
  if (current.solvedAt !== undefined && incoming.solvedAt !== undefined)
    merged.solvedAt = Math.min(current.solvedAt, incoming.solvedAt);
  if (resultProves(current) && !resultProves(incoming)) merged.result = current.result;
  return merged;
}
