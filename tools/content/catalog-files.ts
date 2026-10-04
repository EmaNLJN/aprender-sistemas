import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fail, filePlace, type Place } from './content-error.ts';

const EXPECTED = {
  directory: 'sólo se admiten carpetas <id>',
  file: 'sólo se admiten archivos <id>.yaml',
};

// Entradas de una carpeta de content/, ordenadas. Una carpeta que no existe está vacía: así el
// manifiesto informa qué falta en lugar de un ENOENT. Los nombres que empiezan con punto se
// ignoran (un .DS_Store de macOS o el .swp de un editor no son contenido); cualquier otra
// entrada que no sea del tipo esperado es un error: nada queda en content/ sin que el generador
// lo lea.
function entries(root: string, folder: string, kind: 'directory' | 'file'): string[] {
  const absolute = join(root, folder);
  if (!existsSync(absolute)) return [];
  if (!statSync(absolute).isDirectory()) fail(filePlace(folder), 'se esperaba una carpeta');
  const names: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const matches = kind === 'directory' ? entry.isDirectory() : entry.isFile();
    if (!matches) fail(filePlace(`${folder}/${entry.name}`), EXPECTED[kind]);
    names.push(entry.name);
  }
  return names.sort();
}

export function listDirectories(root: string, folder: string): string[] {
  return entries(root, folder, 'directory');
}

// IDs de los <id>.yaml de una carpeta, sin contar su manifest.yaml.
export function listYamlIds(root: string, folder: string): string[] {
  const ids: string[] = [];
  for (const name of entries(root, folder, 'file')) {
    if (name === 'manifest.yaml') continue;
    if (!name.endsWith('.yaml')) fail(filePlace(`${folder}/${name}`), EXPECTED.file);
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
