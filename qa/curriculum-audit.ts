import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { formatAuditSummary, type AuditReportJson } from './lib/audit-summary.ts';
import { repoRoot } from './lib/sources.ts';

interface EntryOptions {
  forwarded: string[];
  concurrency: string;
  runtime: string;
}

const REPORTS = path.join(repoRoot, 'qa', 'curriculum-audit');
const REPORT = path.join(REPORTS, 'report.json');
const SUMMARY = path.join(REPORTS, 'summary.md');
const IMAGES = { rust: 'taller-sandbox-rust:local', go: 'taller-sandbox-go:local' } as const;

function refuse(message: string): never {
  console.error(message);
  process.exit(2);
}

function validate(concurrency: string, runtime: string): void {
  if (!/^[1-8]$/.test(concurrency))
    refuse(`api:audit: --concurrency va de 1 a 8 y llegó «${concurrency}».`);
  if (runtime !== 'runsc' && runtime !== 'runc')
    refuse(`api:audit: --runtime admite runsc o runc y llegó «${runtime}».`);
}

function parseOptions(argv: readonly string[]): EntryOptions {
  const forwarded: string[] = [];
  let concurrency = process.env.AUDIT_CONCURRENCY ?? '4';
  let runtime = process.env.AUDIT_RUNTIME ?? 'runsc';
  for (const argument of argv) {
    if (argument.startsWith('--concurrency='))
      concurrency = argument.slice('--concurrency='.length);
    else if (argument.startsWith('--runtime=')) runtime = argument.slice('--runtime='.length);
    else if (argument.startsWith('--language=') || argument.startsWith('--exercise='))
      forwarded.push(argument);
    else
      refuse(
        `api:audit: opción desconocida «${argument}». Se admiten --language=, --exercise=, --concurrency= y --runtime=.`,
      );
  }
  validate(concurrency, runtime);
  return { forwarded, concurrency, runtime };
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync(command, args, { cwd: repoRoot, encoding: 'utf8', env });
}

function imageId(image: string): string {
  try {
    return run('docker', ['image', 'inspect', '--format', '{{.Id}}', image]).trim();
  } catch {
    return refuse(
      `api:audit: falta la imagen ${image}: construila con «docker compose --profile sandbox-images build» (ADR 0005).`,
    );
  }
}

function hostStamps(): string[] {
  const clean = run('git', ['status', '--porcelain']).trim() === '' ? 'yes' : 'no';
  return [
    `--commit=${run('git', ['rev-parse', 'HEAD']).trim()}`,
    `--clean-tree=${clean}`,
    `--rust-image=${imageId(IMAGES.rust)}`,
    `--go-image=${imageId(IMAGES.go)}`,
  ];
}

const options = parseOptions(process.argv.slice(2));
const stamps = hostStamps();
const env: NodeJS.ProcessEnv = {
  ...process.env,
  AUDIT_UID: String(process.getuid?.() ?? 82),
  AUDIT_GID: String(process.getgid?.() ?? 82),
  AUDIT_CONCURRENCY: options.concurrency,
  AUDIT_RUNTIME: options.runtime,
};
if (
  run(
    'docker',
    ['compose', '--profile', 'audit', 'ps', '--status', 'running', '--quiet', 'executor-audit'],
    env,
  ).trim() !== ''
) {
  refuse(
    'api:audit: ya hay otra corrida de auditoría en curso (executor-audit está arriba). Si quedó de una corrida cortada, apagala con «docker compose --profile audit rm --stop --force executor-audit».',
  );
}
mkdirSync(REPORTS, { recursive: true });
rmSync(REPORT, { force: true });

let status: number;
try {
  const audit = spawnSync(
    'docker',
    [
      'compose',
      '--profile',
      'audit',
      'run',
      '--rm',
      '--pull',
      'never',
      '--build',
      '-T',
      'audit',
      'php',
      'artisan',
      'curriculum:audit',
      ...stamps,
      ...options.forwarded,
    ],
    { cwd: repoRoot, env, stdio: 'inherit' },
  );
  status = audit.status ?? 1;
} finally {
  spawnSync(
    'docker',
    ['compose', '--profile', 'audit', 'rm', '--stop', '--force', 'executor-audit'],
    {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
    },
  );
}
if (existsSync(REPORT)) {
  const summary = formatAuditSummary(JSON.parse(readFileSync(REPORT, 'utf8')) as AuditReportJson);
  writeFileSync(SUMMARY, summary);
  console.log('\nResumen para la descripción del PR (qa/curriculum-audit/summary.md):\n');
  console.log(summary);
}
process.exit(status);
