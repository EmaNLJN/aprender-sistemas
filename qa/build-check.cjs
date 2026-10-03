'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
const documentMarkup = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '<script></script>')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '<style></style>');

assert(source.includes('type="module" src="./main.tsx"'), 'Vite source must use the TypeScript ESM entry');
assert.equal(scripts.length, 1, 'Vite must inline one application bundle');
assert.equal(styles.length, 1, 'Vite must inline one stylesheet bundle');
assert.equal((html.match(/<!DOCTYPE html>/gi) || []).length, 1, 'bundle must not duplicate the document');
assert(!/<script\b[^>]*\bsrc=/.test(documentMarkup), 'no external runtime script dependencies');
assert(!/<link\b[^>]*\brel="stylesheet"/.test(documentMarkup), 'no external runtime stylesheet dependencies');
assert(!/<link\b[^>]*\brel="modulepreload"/.test(documentMarkup), 'no external module preload dependencies');

new vm.Script(scripts[0][1], {filename: 'dist/index.html:inline-app.js'});
assert(html.includes('Permission is hereby granted'), 'editor license retained');
assert(html.includes('Copyright (c) Meta Platforms'), 'React license retained in standalone HTML');
assert(html.length < 2500000, 'unexpected standalone build growth');
console.log('Vite produced one standalone document with inline JS/CSS and retained licenses. PASS');
