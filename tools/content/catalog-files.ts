import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fail, filePlace, type Place } from './content-error.ts';

// Entradas de una carpeta de content/, ordenadas. Una carpeta que no existe está vacía: así
// el manifiesto informa qué falta en lugar de un ENOENT.
function entries(root: string, folder: string): string[] {
  const absolute = join(root, folder);
  return existsSync(absolute) ? readdirSync(absolute).sort() : [];
}

export function listDirectories(root: string, folder: string): string[] {
  return entries(root, folder).filter((name) => statSync(join(root, folder, name)).isDirectory());
}

// IDs de los <id>.yaml de una carpeta, sin contar su manifest.yaml. Otro archivo o una
// subcarpeta son un error: nada queda en content/ sin que el generador lo lea.
export function listYamlIds(root: string, folder: string): string[] {
  const ids: string[] = [];
  for (const name of entries(root, folder)) {
    if (name === 'manifest.yaml') continue;
    const isYaml = name.endsWith('.yaml') && statSync(join(root, folder, name)).isFile();
    if (!isYaml) fail(filePlace(`${folder}/${name}`), 'sólo se admiten archivos <id>.yaml');
    ids.push(name.slice(0, -'.yaml'.length));
  }
  return ids;
}

// Un manifiesto y su carpeta listan los mismos IDs: sin repetidos, faltantes ni huérfanos.
// `suffix` es '.yaml' para registros y '' para las carpetas de ejercicios.
export function expectSameIds(
  listed: readonly string[],
  found: readonly string[],
  manifest: Place,
  folder: string,
  suffix: string,
): void {
  const seen = new Set<string>();
  for (const id of listed) {
    if (seen.has(id)) fail(manifest, `ID repetido: ${id}`);
    seen.add(id);
    if (!found.includes(id)) fail(manifest, `${id} no tiene ${folder}/${id}${suffix}`);
  }
  for (const id of found) {
    if (!seen.has(id)) fail(filePlace(`${folder}/${id}${suffix}`), `no figura en ${manifest.file}`);
  }
}
