import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type BuiltPage, readBuiltContent, readBuiltPage } from './lib/built-page.ts';
import { contentVersion, curriculumMeta, curriculumMarkers } from './lib/content-document.ts';
import { repoRoot as root } from './lib/sources.ts';

const BOOT_SIZE_LIMIT = 1250000;

function assertSinglefileDocument(page: BuiltPage): void {
  const styles = [...page.html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
  const documentMarkup = page.html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '<script></script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '<style></style>');
  assert.equal(page.scripts.length, 1, 'Vite must inline one application bundle');
  assert.equal(styles.length, 1, 'Vite must inline one stylesheet bundle');
  assert.equal(
    (page.html.match(/<!DOCTYPE html>/gi) || []).length,
    1,
    'bundle must not duplicate the document',
  );
  assert(!/<script\b[^>]*\bsrc=/.test(documentMarkup), 'no external runtime script dependencies');
  assert(
    !/<link\b[^>]*\brel="stylesheet"/.test(documentMarkup),
    'no external runtime stylesheet dependencies',
  );
  assert(
    !/<link\b[^>]*\brel="modulepreload"/.test(documentMarkup),
    'no external module preload dependencies',
  );
}

function assertParsesAsModule(script: { name: string; source: string }): void {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'build-check-'));
  const file = path.join(directory, 'script.mjs');
  try {
    fs.writeFileSync(file, script.source);
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${script.name} must parse as a module: ${result.stderr}`);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

const source = fs.readFileSync(path.join(root, 'frontend', 'src', 'index.html'), 'utf8');
const page = readBuiltPage();

assert(
  source.includes('type="module" src="./app/main.tsx"'),
  'Vite source must use the TypeScript ESM entry',
);
assertSinglefileDocument(page);
page.scripts.forEach(assertParsesAsModule);

assert(page.bootText.includes('Permission is hereby granted'), 'editor license retained');
assert(
  page.bootText.includes('Copyright (c) Meta Platforms'),
  'React license retained in standalone HTML',
);
assert(
  /Copyright \(c\) \d{4} Arjun Barrett/.test(page.bootText),
  'fflate license retained in standalone HTML',
);
assert(
  page.bootSize < BOOT_SIZE_LIMIT,
  `the page weighs ${page.bootSize} characters and the limit is ${BOOT_SIZE_LIMIT}: the curriculum must not travel inside the HTML`,
);

const servedContent = readBuiltContent();
const servedText = servedContent.bytes.toString('utf8');
for (const { family, markers } of curriculumMarkers()) {
  for (const marker of markers) {
    assert(
      servedText.includes(marker),
      `marker «${marker}» of ${family} must be in the served file`,
    );
    assert(
      !page.bootText.includes(marker),
      `marker «${marker}» of ${family} must not be in the HTML: the curriculum travels in its own file`,
    );
  }
}
assert(
  page.bootText.includes(contentVersion()),
  'the HTML must carry the content version it requests',
);

const { documentHash } = curriculumMeta();
assert.equal(
  servedContent.fileName,
  `curriculum.${documentHash.slice(0, 32)}.json`,
  'dist/content must hold the versioned curriculum',
);
assert.equal(
  createHash('sha256').update(servedContent.bytes).digest('hex'),
  documentHash,
  'dist curriculum must be the generator bytes',
);
for (const notice of ['EDITOR-LICENSES.txt', 'THIRD-PARTY-NOTICES.txt']) {
  assert(
    fs
      .readFileSync(path.join(root, 'dist', notice))
      .equals(fs.readFileSync(path.join(root, 'frontend', notice))),
    `dist must carry ${notice} with the frontend bytes`,
  );
}
console.log('Vite produced one standalone document with inline JS/CSS and retained licenses. PASS');
