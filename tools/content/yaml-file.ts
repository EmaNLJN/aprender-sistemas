import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  isAlias,
  isPair,
  isScalar,
  isSeq,
  parseDocument,
  visit,
  type ParsedNode,
  type Scalar,
} from 'yaml';
import { child, ContentError, fail, filePlace, type Place } from './content-error.ts';

const utf8 = new TextDecoder('utf-8', { fatal: true });

function jsKey(node: Scalar): string {
  return String(node.value ?? '');
}

function sameKey(a: ParsedNode, b: ParsedNode): boolean {
  return isScalar(a) && isScalar(b) && jsKey(a) === jsKey(b);
}

function isJsonNumber(value: number): boolean {
  return Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value));
}

function placeOf(file: string, ancestors: readonly unknown[], key: unknown): Place {
  let place = filePlace(file);
  ancestors.forEach((ancestor, index) => {
    if (isPair(ancestor) && isScalar(ancestor.key)) {
      place = child(place, jsKey(ancestor.key));
    } else if (isSeq(ancestor)) {
      const item = ancestors[index + 1];
      const position =
        item === undefined ? Number(key) : ancestor.items.findIndex((entry) => entry === item);
      place = child(place, position);
    }
  });
  return place;
}

function throwAlias(file: string): never {
  throw new ContentError(`${file}: no se admiten alias (*): cada valor se escribe completo`);
}

// Bytes are read outside the try: an I/O error must not be reported as invalid UTF-8.
export function readContentText(root: string, file: string): string {
  const absolute = join(root, file);
  if (!existsSync(absolute)) throw new ContentError(`${file}: no existe`);
  if (!statSync(absolute).isFile()) throw new ContentError(`${file}: no es un archivo`);
  const bytes = readFileSync(absolute);
  try {
    return utf8.decode(bytes);
  } catch (error) {
    throw new ContentError(`${file}: no es UTF-8 válido`, { cause: error });
  }
}

// schema 'core' pins YAML 1.2 even if the file declares %YAML 1.1.
export function readYamlFile(root: string, file: string): unknown {
  const text = readContentText(root, file);
  const document = parseDocument(text, {
    schema: 'core',
    resolveKnownTags: false,
    uniqueKeys: sameKey,
  });
  const problem = document.errors[0] ?? document.warnings[0];
  if (problem) {
    throw new ContentError(`${file}: YAML inválido: ${problem.message}`, { cause: problem });
  }
  visit(document, {
    Alias() {
      throwAlias(file);
    },
    Pair(_key, pair) {
      if (isAlias(pair.key)) throwAlias(file);
      if (!isScalar(pair.key) || jsKey(pair.key) === '') {
        throw new ContentError(`${file}: cada clave tiene que ser un texto no vacío`);
      }
    },
    Scalar(key, node, ancestors) {
      // A # after a space starts a comment and silently cuts an unquoted value (`Recibir #2` publishes «Recibir»).
      if (node.type === 'PLAIN' && node.comment !== undefined) {
        const effect =
          node.value === null ? 'deja el valor vacío' : `corta el texto en «${String(node.value)}»`;
        fail(
          placeOf(file, ancestors, key),
          `un # después de un espacio empieza un comentario y ${effect}: si el # es parte del texto, escribí el valor entre comillas; si es un comentario, pasalo a su propia línea, sin más sangría que la clave`,
        );
      }
      if (typeof node.value === 'number' && !isJsonNumber(node.value)) {
        const written = node.source ?? String(node.value);
        throw new ContentError(`${file}: ${written} no es un número que JSON represente`);
      }
    },
  });
  return document.toJS();
}
