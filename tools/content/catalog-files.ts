import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fail, filePlace, type Place } from './content-error.ts';

// Entradas de una carpeta de content/, ordenadas. Una carpeta que no existe está vacía: así el
// manifiesto informa qué falta en lugar de un ENOENT. Los nombres que empiezan con punto se
// ignoran (un .DS_Store de macOS o el .swp de un editor no son contenido); un enlace simbólico
// y cualquier otra entrada que no sea del tipo esperado son un error, con `wrongKind` como
// mensaje: nada queda en content/ sin que el generador lo lea.
function entries(
  root: string,
  folder: string,
  kind: 'directory' | 'file',
  wrongKind: string,
): string[] {
  const absolute = join(root, folder);
  if (!existsSync(absolute)) return [];
  if (!statSync(absolute).isDirectory()) fail(filePlace(folder), 'se esperaba una carpeta');
  const names: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const place = filePlace(`${folder}/${entry.name}`);
    if (entry.isSymbolicLink())
      fail(place, 'es un enlace simbólico; copiá el archivo o la carpeta');
    const matches = kind === 'directory' ? entry.isDirectory() : entry.isFile();
    if (!matches) fail(place, wrongKind);
    names.push(entry.name);
  }
  return names.sort();
}

export function listDirectories(root: string, folder: string): string[] {
  return entries(root, folder, 'directory', 'sólo se admiten carpetas <id>');
}

// Archivos de una carpeta, con la misma política de ocultos y rechazos; `expected` es el
// mensaje para lo que no sea un archivo.
export function listFiles(root: string, folder: string, expected: string): string[] {
  return entries(root, folder, 'file', expected);
}

// IDs de los <id>.yaml de una carpeta, sin contar su manifest.yaml.
export function listYamlIds(root: string, folder: string): string[] {
  const expected = 'sólo se admiten archivos <id>.yaml';
  const ids: string[] = [];
  for (const name of listFiles(root, folder, expected)) {
    if (name === 'manifest.yaml') continue;
    if (!name.endsWith('.yaml')) fail(filePlace(`${folder}/${name}`), expected);
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
