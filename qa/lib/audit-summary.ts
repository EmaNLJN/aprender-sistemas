import { auditedPaths } from './audit-surface.ts';
import type { ContentStamps } from './content-stamps.ts';

export const REPORT_FORMAT = 'taller-curriculum-audit-1';
export const SUMMARY_FORMAT = 'taller-audit-summary-1';
const FENCE = '```taller-audit-summary';
const CLOSE = '```';

export const SUMMARY_KEYS = [
  'format',
  'verdict',
  'record',
  'scope',
  'runtime',
  'instance',
  'concurrency',
  'programs',
  'solutions',
  'solutionsPass',
  'starters',
  'startersFailAsExpected',
  'customTestSample',
  'customTestSamplePass',
  'findings',
  'noVerdict',
  'warnings',
  'documentHash',
  'harnessHash',
  'contentSourceCommit',
  'commit',
  'cleanTree',
  'rustImage',
  'goImage',
  'startedAt',
  'finishedAt',
] as const;

export type SummaryKey = (typeof SUMMARY_KEYS)[number];
export type AuditSummary = Record<SummaryKey, string>;

export interface AuditReportJson {
  format: string;
  run: {
    startedAt: string;
    finishedAt: string;
    runtime: string;
    instance: string;
    concurrency: number;
    scope: string;
    record: boolean;
    verdict: string;
  };
  stamps: {
    commit: string | null;
    cleanTree: boolean | null;
    contentSourceCommit: string | null;
    documentHash: string;
    harnessHash: string;
    images: { rust: string | null; go: string | null };
  };
  totals: {
    programs: number;
    solutions: number;
    solutionsPass: number;
    starters: number;
    startersFailAsExpected: number;
    customTestSample: number;
    customTestSamplePass: number;
    findings: number;
    noVerdict: number;
    warnings: number;
  };
}

export type SummaryParse =
  | { kind: 'missing' }
  | { kind: 'invalid'; problems: string[] }
  | { kind: 'ok'; summary: AuditSummary };

export interface GateInput {
  body: string;
  changedPaths: readonly string[];
  expected: ContentStamps;
  headSha: string;
}

export interface GateResult {
  ok: boolean;
  applies: boolean;
  errors: string[];
  notes: string[];
}

const HEX64 = /^[0-9a-f]{64}$/;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const IMAGE = /^sha256:[0-9a-f]{64}$/;
const COUNT = /^(?:0|[1-9][0-9]*)$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const isBoolean = (value: string): boolean => value === 'true' || value === 'false';
const isCount = (value: string): boolean => COUNT.test(value);
const orNull =
  (valid: (value: string) => boolean) =>
  (value: string): boolean =>
    value === 'null' || valid(value);

const VALID: Record<SummaryKey, (value: string) => boolean> = {
  format: (value) => value === SUMMARY_FORMAT,
  verdict: (value) => value === 'green' || value === 'red',
  record: isBoolean,
  scope: (value) => value === 'full' || value === 'partial',
  runtime: (value) => value === 'runsc' || value === 'runc',
  instance: (value) => /^[a-z0-9-]{1,32}$/.test(value),
  concurrency: (value) => /^[1-8]$/.test(value),
  programs: isCount,
  solutions: isCount,
  solutionsPass: isCount,
  starters: isCount,
  startersFailAsExpected: isCount,
  customTestSample: isCount,
  customTestSamplePass: isCount,
  findings: isCount,
  noVerdict: isCount,
  warnings: isCount,
  documentHash: (value) => HEX64.test(value),
  harnessHash: (value) => HEX64.test(value),
  contentSourceCommit: orNull((value) => COMMIT.test(value)),
  commit: orNull((value) => COMMIT.test(value)),
  cleanTree: orNull(isBoolean),
  rustImage: orNull((value) => IMAGE.test(value)),
  goImage: orNull((value) => IMAGE.test(value)),
  startedAt: (value) => INSTANT.test(value),
  finishedAt: (value) => INSTANT.test(value),
};

function text(value: string | number | boolean | null): string {
  return value === null ? 'null' : String(value);
}

function summaryValues(report: AuditReportJson): AuditSummary {
  if (report.format !== REPORT_FORMAT) {
    throw new Error(
      `report.json es del formato ${report.format} y este resumen lee ${REPORT_FORMAT}`,
    );
  }
  const { run, stamps, totals } = report;
  return {
    format: SUMMARY_FORMAT,
    verdict: run.verdict,
    record: text(run.record),
    scope: run.scope,
    runtime: run.runtime,
    instance: run.instance,
    concurrency: text(run.concurrency),
    programs: text(totals.programs),
    solutions: text(totals.solutions),
    solutionsPass: text(totals.solutionsPass),
    starters: text(totals.starters),
    startersFailAsExpected: text(totals.startersFailAsExpected),
    customTestSample: text(totals.customTestSample),
    customTestSamplePass: text(totals.customTestSamplePass),
    findings: text(totals.findings),
    noVerdict: text(totals.noVerdict),
    warnings: text(totals.warnings),
    documentHash: stamps.documentHash,
    harnessHash: stamps.harnessHash,
    contentSourceCommit: text(stamps.contentSourceCommit),
    commit: text(stamps.commit),
    cleanTree: text(stamps.cleanTree),
    rustImage: text(stamps.images.rust),
    goImage: text(stamps.images.go),
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  };
}

export function formatAuditSummary(report: AuditReportJson): string {
  const values = summaryValues(report);
  return [
    '**Auditoría del currículo (B3)**: pegá este bloque entero en la descripción del PR.',
    '',
    FENCE,
    ...SUMMARY_KEYS.map((key) => `${key}: ${values[key]}`),
    CLOSE,
    '',
  ].join('\n');
}

function isSummaryKey(key: string): key is SummaryKey {
  return (SUMMARY_KEYS as readonly string[]).includes(key);
}

function readFields(lines: readonly string[]): {
  values: Map<SummaryKey, string>;
  problems: string[];
} {
  const values = new Map<SummaryKey, string>();
  const problems: string[] = [];
  for (const line of lines.filter((candidate) => candidate !== '')) {
    const match = /^([A-Za-z]+): (.*)$/.exec(line);
    if (!match) {
      problems.push(`la línea «${line}» no es clave: valor`);
    } else if (!isSummaryKey(match[1])) {
      problems.push(`${match[1]} no es una clave del formato`);
    } else if (values.has(match[1])) {
      problems.push(`${match[1]} está repetida`);
    } else {
      values.set(match[1], match[2]);
    }
  }
  return { values, problems };
}

function valueProblems(values: Map<SummaryKey, string>): string[] {
  const problems: string[] = [];
  for (const key of SUMMARY_KEYS) {
    const value = values.get(key);
    if (value === undefined) problems.push(`falta ${key}`);
    else if (key !== 'format' && !VALID[key](value))
      problems.push(`${key}: «${value}» no es válido`);
  }
  return problems;
}

export function parseAuditSummary(body: string): SummaryParse {
  const lines = body
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim());
  const starts = lines.flatMap((line, index) => (line === FENCE ? [index] : []));
  if (starts.length === 0) return { kind: 'missing' };
  if (starts.length > 1) {
    return {
      kind: 'invalid',
      problems: [`hay ${starts.length} bloques taller-audit-summary; dejá uno solo`],
    };
  }
  const end = lines.indexOf(CLOSE, starts[0] + 1);
  if (end === -1) return { kind: 'invalid', problems: ['el bloque no se cierra con ```'] };
  const { values, problems } = readFields(lines.slice(starts[0] + 1, end));
  const format = values.get('format');
  if (format !== undefined && format !== SUMMARY_FORMAT) {
    return {
      kind: 'invalid',
      problems: [
        `el bloque es del formato ${format} y este check lee ${SUMMARY_FORMAT}: volvé a correr npm run api:audit`,
      ],
    };
  }
  const all = [...problems, ...valueProblems(values)];
  if (all.length > 0) return { kind: 'invalid', problems: all };
  return { kind: 'ok', summary: Object.fromEntries(values) as AuditSummary };
}

function summaryErrors(summary: AuditSummary, expected: ContentStamps): string[] {
  const errors: string[] = [];
  if (summary.record !== 'true') {
    errors.push(
      `La corrida no es de registro (record: ${summary.record}): tiene que ser completa, con runsc y sin programas sin veredicto.`,
    );
  }
  if (summary.scope !== 'full') {
    errors.push(
      `La corrida es parcial (scope: ${summary.scope}): la de registro audita los dos lenguajes enteros.`,
    );
  }
  if (summary.runtime !== 'runsc') {
    errors.push(`La corrida usó ${summary.runtime}: la de registro corre con runsc.`);
  }
  if (summary.verdict !== 'green' || summary.findings !== '0' || summary.noVerdict !== '0') {
    errors.push(
      `El veredicto está en rojo (verdict: ${summary.verdict}, findings: ${summary.findings}, noVerdict: ${summary.noVerdict}): corregí los hallazgos y volvé a auditar.`,
    );
  }
  if (summary.documentHash !== expected.documentHash) {
    errors.push(
      `La huella del documento no coincide: esperada ${expected.documentHash} (cabeza del PR), recibida ${summary.documentHash}. Volvé a auditar después del último cambio de contenido.`,
    );
  }
  if (summary.harnessHash !== expected.harnessHash) {
    errors.push(
      `La huella de la plantilla (portions.harness) no coincide: esperada ${expected.harnessHash} (cabeza del PR), recibida ${summary.harnessHash}. Volvé a auditar después del último cambio de la plantilla.`,
    );
  }
  return errors;
}

function reviewerNote(summary: AuditSummary, headSha: string): string {
  const differs =
    summary.commit === headSha ? '' : ', distinto: comprobá que lo posterior no toca la superficie';
  const clean =
    summary.cleanTree === 'true' ? 'sí' : summary.cleanTree === 'false' ? 'no' : 'sin dato';
  return `Para quien revisa: commit ${summary.commit} (cabeza del PR: ${headSha})${differs}; árbol limpio: ${clean}; imágenes: rust ${summary.rustImage}, go ${summary.goImage}.`;
}

export function evaluateAuditGate(input: GateInput): GateResult {
  const touched = auditedPaths(input.changedPaths);
  if (touched.length === 0) {
    return {
      ok: true,
      applies: false,
      errors: [],
      notes: [
        'El PR no toca la superficie auditada (qa/lib/audit-surface.ts): no hace falta el resumen.',
      ],
    };
  }
  const parsed = parseAuditSummary(input.body);
  if (parsed.kind === 'missing') {
    return {
      ok: false,
      applies: true,
      errors: [
        `Falta el resumen de la auditoría: el PR toca la superficie auditada (${touched[0]}). Corré npm run api:audit sobre el último commit, con el árbol limpio, y pegá en la descripción el bloque que imprime.`,
      ],
      notes: [],
    };
  }
  if (parsed.kind === 'invalid') {
    return {
      ok: false,
      applies: true,
      errors: parsed.problems.map(
        (problem) => `El resumen no tiene el formato ${SUMMARY_FORMAT}: ${problem}.`,
      ),
      notes: [],
    };
  }
  const errors = summaryErrors(parsed.summary, input.expected);
  return {
    ok: errors.length === 0,
    applies: true,
    errors,
    notes: [reviewerNote(parsed.summary, input.headSha)],
  };
}
