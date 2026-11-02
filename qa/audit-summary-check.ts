import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { auditedPaths } from './lib/audit-surface.ts';
import {
  evaluateAuditGate,
  formatAuditSummary,
  parseAuditSummary,
  type AuditReportJson,
} from './lib/audit-summary.ts';
import { currentContentStamps } from './lib/content-stamps.ts';
import { scenarios } from './lib/content-fixtures.ts';
import { repoRoot } from './lib/sources.ts';

const { test, done } = scenarios('audit-summary');

const example = JSON.parse(
  readFileSync(path.join(repoRoot, 'qa/fixtures/shared/audit-report-example.json'), 'utf8'),
) as AuditReportJson;
const DOCUMENT = example.stamps.documentHash;
const HARNESS = example.stamps.harnessHash;
const HEAD = 'dd870a9ccb7cb50b8b06b584bcf988acaccbf22e';
const CONTENT_CHANGE = ['content/rust/exercises/rust-01/exercise.yaml'];

interface ReportChanges {
  record?: boolean;
  scope?: string;
  verdict?: string;
  runtime?: string;
  findings?: number;
  documentHash?: string;
  harnessHash?: string;
}

function recordReport(changes: ReportChanges = {}): AuditReportJson {
  return {
    ...example,
    run: {
      ...example.run,
      record: changes.record ?? true,
      scope: changes.scope ?? 'full',
      verdict: changes.verdict ?? 'green',
      runtime: changes.runtime ?? 'runsc',
    },
    stamps: {
      ...example.stamps,
      documentHash: changes.documentHash ?? DOCUMENT,
      harnessHash: changes.harnessHash ?? HARNESS,
    },
    totals: { ...example.totals, findings: changes.findings ?? 0, noVerdict: 0 },
  };
}

function gate(body: string, changedPaths: readonly string[] = CONTENT_CHANGE) {
  return evaluateAuditGate({
    body,
    changedPaths,
    expected: { documentHash: DOCUMENT, harnessHash: HARNESS },
    headSha: HEAD,
  });
}

test('1. fails without a summary when the PR touches the audited surface', () => {
  const result = gate('Arregla rust-01.');
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    'Falta el resumen de la auditoría: el PR toca la superficie auditada (content/rust/exercises/rust-01/exercise.yaml). Corré npm run api:audit sobre el último commit, con el árbol limpio, y pegá en la descripción el bloque que imprime.',
  ]);
});

test('2. fails when the document hash is not the one of the head', () => {
  const result = gate(formatAuditSummary(recordReport({ documentHash: 'f'.repeat(64) })));
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    `La huella del documento no coincide: esperada ${DOCUMENT} (cabeza del PR), recibida ${'f'.repeat(64)}. Volvé a auditar después del último cambio de contenido.`,
  ]);
});

test('3. fails when the verdict is red', () => {
  const result = gate(formatAuditSummary(recordReport({ verdict: 'red', findings: 1 })));
  assert.deepEqual(result.errors, [
    'El veredicto está en rojo (verdict: red, findings: 1, noVerdict: 0): corregí los hallazgos y volvé a auditar.',
  ]);
});

test('4. fails when the run is not a record run', () => {
  const result = gate(formatAuditSummary(recordReport({ record: false, scope: 'partial' })));
  assert.deepEqual(result.errors, [
    'La corrida no es de registro (record: false): tiene que ser completa, con runsc y sin programas sin veredicto.',
    'La corrida es parcial (scope: partial): la de registro audita los dos lenguajes enteros.',
  ]);
});

test('5. passes without a summary when the PR does not touch the audited surface', () => {
  const result = gate('Sólo textos.', ['content/atlas/rust/x.yaml', 'README.md']);
  assert.equal(result.ok, true);
  assert.equal(result.applies, false);
  assert.deepEqual(result.notes, [
    'El PR no toca la superficie auditada (qa/lib/audit-surface.ts): no hace falta el resumen.',
  ]);
});

test('6. passes with a valid summary and leaves a note for the reviewer', () => {
  const result = gate(`Descripción del PR.\n\n${formatAuditSummary(recordReport())}`);
  assert.equal(result.ok, true);
  assert.deepEqual(result.notes, [
    `Para quien revisa: commit ${HEAD} (cabeza del PR: ${HEAD}); árbol limpio: sí; imágenes: rust ${example.stamps.images.rust}, go ${example.stamps.images.go}.`,
  ]);
});

test('7. reads a summary edited on the web: CRLF and two spaces of indentation', () => {
  const pasted = formatAuditSummary(recordReport())
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\r\n');
  assert.equal(gate(pasted).ok, true);
});

test('8. fails with two summaries', () => {
  const block = formatAuditSummary(recordReport());
  assert.deepEqual(gate(`${block}\n${block}`).errors, [
    'El resumen no tiene el formato taller-audit-summary-1: hay 2 bloques taller-audit-summary; dejá uno solo.',
  ]);
});

test('9. fails when the harness hash is not the one of the head', () => {
  const result = gate(formatAuditSummary(recordReport({ harnessHash: '0'.repeat(64) })));
  assert.deepEqual(result.errors, [
    `La huella de la plantilla (portions.harness) no coincide: esperada ${HARNESS} (cabeza del PR), recibida ${'0'.repeat(64)}. Volvé a auditar después del último cambio de la plantilla.`,
  ]);
});

test('10. fails when the run used runc', () => {
  const result = gate(formatAuditSummary(recordReport({ runtime: 'runc' })));
  assert.deepEqual(result.errors, ['La corrida usó runc: la de registro corre con runsc.']);
});

test('11. names a missing key and an unknown key', () => {
  const body = formatAuditSummary(recordReport()).replace(/^warnings: .*$/m, 'avisos: 0');
  assert.deepEqual(gate(body).errors, [
    'El resumen no tiene el formato taller-audit-summary-1: avisos no es una clave del formato.',
    'El resumen no tiene el formato taller-audit-summary-1: falta warnings.',
  ]);
});

test('12. ignores the Go tests of the executor and counts a deleted content file', () => {
  assert.deepEqual(
    auditedPaths([
      'backend/executor/internal/sandbox/args_test.go',
      'content/go/exercises/go-01/solution.go',
      'docs/adr/0005-ejecucion-en-sandbox-propio.md',
    ]),
    ['content/go/exercises/go-01/solution.go'],
  );
});

test('13. reads back every value it wrote', () => {
  const parsed = parseAuditSummary(formatAuditSummary(example));
  assert.equal(parsed.kind, 'ok');
  assert.deepEqual(parsed.kind === 'ok' ? parsed.summary : null, {
    format: 'taller-audit-summary-1',
    verdict: 'red',
    record: 'false',
    scope: 'partial',
    runtime: 'runsc',
    instance: 'auditoria',
    concurrency: '4',
    programs: '6',
    solutions: '2',
    solutionsPass: '2',
    starters: '2',
    startersFailAsExpected: '1',
    customTestSample: '2',
    customTestSamplePass: '2',
    findings: '1',
    noVerdict: '0',
    warnings: '1',
    documentHash: '4555e8500e6ef5bd38cdaf46010d3f14e3345d7ec0c69aea983acfe67f62fbb6',
    harnessHash: '6a86d9fef4cbeebd95703a6e239f08d885071dc7a122a7ca25883d953457a6fa',
    contentSourceCommit: 'null',
    commit: 'dd870a9ccb7cb50b8b06b584bcf988acaccbf22e',
    cleanTree: 'true',
    rustImage: 'sha256:f525ccf76aec49d19b686a8d4cff8baad441ef2f30a0688c74d1a3905c17c356',
    goImage: 'sha256:e66df8bf3b16022cc6426093be100ba59c09e2eaff9b88d492166e35f0a756b7',
    startedAt: '2026-11-02T03:00:00.000Z',
    finishedAt: '2026-11-02T03:00:09.500Z',
  });
  assert.throws(
    () => formatAuditSummary({ ...example, format: 'taller-curriculum-audit-0' }),
    /report.json es del formato taller-curriculum-audit-0/,
  );
});

test('14. computes the stamps of the working tree as the generator writes them', () => {
  const meta = JSON.parse(
    readFileSync(path.join(repoRoot, 'build/curriculum.meta.json'), 'utf8'),
  ) as {
    documentHash: string;
    portions: { harness: string };
  };
  assert.deepEqual(currentContentStamps(repoRoot), {
    documentHash: meta.documentHash,
    harnessHash: meta.portions.harness,
  });
});

done();
