'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'page.html'), 'utf8');
const scriptFiles = [...source.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
const styleFiles = [...source.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(match => match[1]);
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];

assert.equal(scripts.length, scriptFiles.length, 'all local scripts must be bundled');
assert.equal(styles.length, styleFiles.length, 'all local stylesheets must be bundled');
assert.equal((html.match(/<!DOCTYPE html>/gi) || []).length, 1, 'bundle must not duplicate the document');
assert(!/<script src=/.test(html), 'no external runtime script dependencies');
assert(!/<link\b[^>]*\brel="stylesheet"/.test(html), 'no external runtime stylesheet dependencies');

for (const [index, script] of scripts.entries()) {
  const filename = scriptFiles[index];
  const asset = fs.readFileSync(path.join(root, filename), 'utf8');
  // HTML-safe closing tags must decode back to the original JavaScript source.
  // Remove only the two line breaks wrapping the asset, preserving its whitespace.
  const decoded = script[1].slice(1, -1).replace(/<\\\/script/gi, '</script');
  assert.equal(decoded, asset, `${filename}: script content or load order changed`);
  new vm.Script(script[1], {filename});
}
for (const [index, style] of styles.entries()) {
  const filename = styleFiles[index];
  const asset = fs.readFileSync(path.join(root, filename), 'utf8');
  assert.equal(style[1].slice(1, -1), asset, `${filename}: stylesheet content or cascade order changed`);
}

assert(html.includes('Permission is hereby granted'), 'editor license retained');
assert(html.length < 2500000, 'unexpected bundle growth, possibly replacement-string expansion');
console.log(`${scripts.length} scripts and ${styles.length} styles preserve source content and order; one standalone document; licenses preserved. PASS`);
