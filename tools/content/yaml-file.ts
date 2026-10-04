import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, YAMLError } from 'yaml';
import { ContentError } from './content-error.ts';

// Lee un YAML de content/. `file` es relativo a `root` y es lo que muestran los errores.
// El esquema core de YAML 1.2 sólo produce valores JSON y rechaza claves repetidas.
export function readYamlFile(root: string, file: string): unknown {
  const absolute = join(root, file);
  if (!existsSync(absolute)) throw new ContentError(`${file}: no existe`);
  try {
    return parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    if (error instanceof YAMLError) {
      throw new ContentError(`${file}: YAML inválido: ${error.message}`, { cause: error });
    }
    throw error;
  }
}
