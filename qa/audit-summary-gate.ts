import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { evaluateAuditGate } from './lib/audit-summary.ts';
import { currentContentStamps } from './lib/content-stamps.ts';
import { repoRoot } from './lib/sources.ts';

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

const bodyFile = option('body-file');
const body = bodyFile === undefined ? (process.env.PR_BODY ?? '') : readFileSync(bodyFile, 'utf8');
const base = option('base') ?? process.env.BASE_SHA ?? 'origin/master';
const head = option('head') ?? process.env.HEAD_SHA ?? 'HEAD';
const changedPaths = git(['diff', '--name-only', '--no-renames', `${base}...${head}`])
  .split('\n')
  .filter((line) => line !== '');
const result = evaluateAuditGate({
  body,
  changedPaths,
  expected: currentContentStamps(repoRoot),
  headSha: git(['rev-parse', head]).trim(),
});

for (const note of result.notes) console.log(note);
for (const error of result.errors) console.error(`FALLA ${error}`);
process.exit(result.ok ? 0 : 1);
