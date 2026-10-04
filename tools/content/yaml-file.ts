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

// La clave de objeto JS en que termina un nodo escalar: 1 y "1" dan "1"; null y "" dan "".
function jsKey(node: Scalar): string {
  return String(node.value ?? '');
}

// Dos claves chocan si quedan iguales como clave de objeto JS.
function sameKey(a: ParsedNode, b: ParsedNode): boolean {
  return isScalar(a) && isScalar(b) && jsKey(a) === jsKey(b);
}

// JSON no representa NaN ni infinitos, y un entero fuera del rango seguro ya perdió dígitos.
function isJsonNumber(value: number): boolean {
  return Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value));
}

// El lugar de un nodo según sus ancestros, con el formato de child(): objectives[0].label.
// `key` es la posición del nodo en su padre, como la pasa visit().
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

// Lee un archivo de texto de content/ (YAML o código). `file` es relativo a `root` y es lo que
// muestran los errores. Los bytes se leen fuera del try: un EACCES u otro error de E/S no debe
// salir rotulado como «no es UTF-8 válido». TextDecoder descarta por omisión el BOM inicial
// (ignoreBOM: false): un editor de Windows no lo cuela en el texto publicado.
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

// Lee un YAML de content/.
// Después de esta función no hay otra barrera entre el YAML editado a mano y el JSON publicado:
// lo que JSON no represente igual (texto que no es UTF-8, tags, alias, claves que chocan,
// números no finitos, un comentario en la línea de un valor sin comillas, que lo cortaría) es
// un error. schema 'core' fija YAML 1.2 aunque el archivo declare %YAML 1.1.
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
      // Un alias como clave es un alias: el visitante lo rechaza con su propio mensaje.
      if (isAlias(pair.key)) throwAlias(file);
      if (!isScalar(pair.key) || jsKey(pair.key) === '') {
        throw new ContentError(`${file}: cada clave tiene que ser un texto no vacío`);
      }
    },
    Scalar(key, node, ancestors) {
      // Un # después de un espacio empieza un comentario: en un valor sin comillas corta el
      // texto sin ningún error (`Recibir #2` publica «Recibir»). Entre comillas, sin espacio
      // antes, dentro de un bloque | o en su propia línea, el # no corta nada.
      if (node.type === 'PLAIN' && node.comment !== undefined) {
        fail(
          placeOf(file, ancestors, key),
          `un # después de un espacio empieza un comentario y corta el texto en «${String(node.value)}»: si el # es parte del texto, escribí el valor entre comillas; si es un comentario, pasalo a su propia línea`,
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
