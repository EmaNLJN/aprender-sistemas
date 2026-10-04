import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isScalar, parseDocument, visit, type ParsedNode } from 'yaml';
import { ContentError } from './content-error.ts';

const utf8 = new TextDecoder('utf-8', { fatal: true });

// Dos claves chocan si quedan iguales como clave de objeto JS: 1 y "1", o null y "".
function sameKey(a: ParsedNode, b: ParsedNode): boolean {
  return isScalar(a) && isScalar(b) && String(a.value ?? '') === String(b.value ?? '');
}

// JSON no representa NaN ni infinitos, y un entero fuera del rango seguro ya perdió dígitos.
function isJsonNumber(value: number): boolean {
  return Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value));
}

// Lee un YAML de content/. `file` es relativo a `root` y es lo que muestran los errores.
// Después de esta función no hay otra barrera entre el YAML editado a mano y el JSON publicado:
// lo que JSON no represente igual (texto que no es UTF-8, tags, alias, claves que chocan,
// números no finitos) es un error. schema 'core' fija YAML 1.2 aunque el archivo declare
// %YAML 1.1.
export function readYamlFile(root: string, file: string): unknown {
  const absolute = join(root, file);
  if (!existsSync(absolute)) throw new ContentError(`${file}: no existe`);
  let text: string;
  try {
    text = utf8.decode(readFileSync(absolute));
  } catch (error) {
    throw new ContentError(`${file}: no es UTF-8 válido`, { cause: error });
  }
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
      throw new ContentError(`${file}: no se admiten alias (*): cada valor se escribe completo`);
    },
    Pair(_key, pair) {
      if (!isScalar(pair.key) || String(pair.key.value ?? '') === '') {
        throw new ContentError(`${file}: cada clave tiene que ser un texto no vacío`);
      }
    },
    Scalar(_key, node) {
      if (typeof node.value === 'number' && !isJsonNumber(node.value)) {
        const written = node.source ?? String(node.value);
        throw new ContentError(`${file}: ${written} no es un número que JSON represente`);
      }
    },
  });
  return document.toJS();
}
