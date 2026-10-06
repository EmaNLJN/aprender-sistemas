// The harness templates (ADR 0005 §4, B2 FR-035): one text per language that wraps the student's
// code and prints the evidence. The grammar is shared with the PHP renderer and with A4's
// preview, and qa/fixtures/shared/harness-cases.json is its contract.
import { LANGUAGES, type Language } from './catalogs.ts';
import { fail, type Place } from './content-error.ts';
import { readContentText } from './yaml-file.ts';

export type HarnessTemplates = Record<Language, string>;

type Section = 'tests' | 'imports';
type Marker = 'code' | 'count' | 'nonce' | 'tests' | 'imports';

interface Scan {
  open: Section | null;
  bodyLines: number;
  seen: Record<Marker, number>;
}

const FILES: Record<Language, string> = {
  rust: 'content/harness/rust.tpl',
  go: 'content/harness/go.tpl',
};
const OUTSIDE = ['code', 'nonce', 'count'];
const INSIDE: Record<Section, string[]> = {
  tests: ['nonce', 'id', 'expression'],
  imports: ['name'],
};
const SECTION_LINE = /^\{\{([#/])(tests|imports)\}\}$/;
const TOKEN = /\{\{([#/]?)([A-Za-z]+)\}\}/g;

function line(file: string, number: number): Place {
  return { file, path: `línea ${number}` };
}

function openSection(name: Section, place: Place, scan: Scan): void {
  if (scan.open !== null)
    fail(place, `la sección ${scan.open} sigue abierta: las secciones no se anidan`);
  if (scan.seen[name] > 0) fail(place, `la sección ${name} aparece más de una vez`);
  scan.seen[name]++;
  scan.open = name;
  scan.bodyLines = 0;
}

function closeSection(name: Section, place: Place, scan: Scan): void {
  if (scan.open !== name) fail(place, `{{/${name}}} cierra una sección que no está abierta`);
  if (scan.bodyLines === 0) fail(place, `la sección ${name} está vacía`);
  scan.open = null;
}

function readPlaceholders(text: string, place: Place, scan: Scan): void {
  for (const [token, mark, name] of text.matchAll(TOKEN)) {
    if (mark !== '') fail(place, `${token}: las etiquetas de sección van solas en su línea`);
    const allowed = scan.open === null ? OUTSIDE : INSIDE[scan.open];
    if (!allowed.includes(name)) {
      const where =
        scan.open === null ? 'fuera de las secciones' : `dentro de la sección ${scan.open}`;
      const valid = allowed.map((valid) => `{{${valid}}}`).join(', ');
      fail(place, `${token}: marcador desconocido ${where}; los válidos son ${valid}`);
    }
    if (scan.open === null) scan.seen[name as Marker]++;
  }
}

function checkTotals(file: string, language: Language, scan: Scan): void {
  const whole = { file, path: '' };
  const { seen } = scan;
  if (scan.open !== null) fail(whole, `la sección ${scan.open} no se cierra`);
  if (seen.code !== 1)
    fail(whole, `{{code}} tiene que aparecer una sola vez y aparece ${seen.code}`);
  if (seen.nonce < 1)
    fail(whole, 'falta {{nonce}} fuera de las secciones: el centinela lleva el nonce');
  if (seen.count !== 1)
    fail(whole, `{{count}} tiene que aparecer una sola vez y aparece ${seen.count}`);
  if (seen.tests !== 1) fail(whole, 'falta la sección {{#tests}} … {{/tests}}');
  if (language === 'go' && seen.imports !== 1)
    fail(whole, 'falta la sección {{#imports}} … {{/imports}}');
  if (language !== 'go' && seen.imports !== 0) fail(whole, 'sólo Go tiene la sección {{#imports}}');
}

// Validates the grammar: tags alone on their line, known placeholders in the right place, one
// `code`, one `tests` section and, only in Go, one `imports` section.
function checkTemplate(text: string, language: Language): void {
  const file = FILES[language];
  const whole = { file, path: '' };
  if (text.includes('\r')) fail(whole, 'tiene que usar saltos de línea LF');
  if (!text.endsWith('\n') || text.endsWith('\n\n')) {
    fail(whole, 'tiene que terminar con un solo salto de línea');
  }
  const scan: Scan = {
    open: null,
    bodyLines: 0,
    seen: { code: 0, count: 0, nonce: 0, tests: 0, imports: 0 },
  };
  text
    .slice(0, -1)
    .split('\n')
    .forEach((content, index) => {
      const place = line(file, index + 1);
      const tag = SECTION_LINE.exec(content);
      if (tag === null) {
        if (scan.open !== null) scan.bodyLines++;
        readPlaceholders(content, place, scan);
      } else if (tag[1] === '#') {
        openSection(tag[2] as Section, place, scan);
      } else {
        closeSection(tag[2] as Section, place, scan);
      }
    });
  checkTotals(file, language, scan);
}

export function loadHarness(root: string): HarnessTemplates {
  const templates = {} as HarnessTemplates;
  for (const language of LANGUAGES) {
    const text = readContentText(root, FILES[language]);
    checkTemplate(text, language);
    templates[language] = text;
  }
  return templates;
}

// The exact bytes of the 18th portion, and what its hash covers.
export function harnessBody(templates: HarnessTemplates): string {
  return JSON.stringify(
    Object.fromEntries(LANGUAGES.map((language) => [language, templates[language]])),
  );
}
