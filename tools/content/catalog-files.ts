import { existsSync, readdirSync, statSync, type Dirent } from 'node:fs';
import { join } from 'node:path';
import { fail, filePlace, type Place } from './content-error.ts';

// Entradas de una carpeta de content/, ordenadas: la única política de carpetas. Una carpeta
// que no existe está vacía: así el manifiesto informa qué falta en lugar de un ENOENT. Los
// nombres que empiezan con punto se ignoran (un .DS_Store de macOS o el .swp de un editor no
// son contenido); un enlace simbólico y cualquier entrada que `accepts` rechace son un error,
// con `rejected` como mensaje: nada queda en content/ sin que el generador lo lea.
function entries(
  root: string,
  folder: string,
  accepts: (entry: Dirent) => boolean,
  rejected: string,
): string[] {
  const absolute = join(root, folder);
  if (!existsSync(absolute)) return [];
  if (!statSync(absolute).isDirectory()) fail(filePlace(folder), 'se esperaba una carpeta');
  const names: string[] = [];
  const found = readdirSync(absolute, { withFileTypes: true });
  for (const entry of found.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.name.startsWith('.')) continue;
    const place = filePlace(`${folder}/${entry.name}`);
    if (entry.isSymbolicLink())
      fail(place, 'es un enlace simbólico; copiá el archivo o la carpeta');
    if (!accepts(entry)) fail(place, rejected);
    names.push(entry.name);
  }
  return names;
}

// La carpeta admite sólo las entradas de `allowed` (archivos o carpetas): un YAML suelto no lo
// lee nadie y quedaría sin publicar. `rejected` es el mensaje para cualquier otra.
export function expectOnlyEntries(
  root: string,
  folder: string,
  allowed: readonly string[],
  rejected: string,
): void {
  entries(root, folder, (entry) => allowed.includes(entry.name), rejected);
}

export function listDirectories(root: string, folder: string): string[] {
  return entries(root, folder, (entry) => entry.isDirectory(), 'sólo se admiten carpetas <id>');
}

// Archivos de una carpeta, con la misma política de ocultos y rechazos; `expected` es el
// mensaje para lo que no sea un archivo.
export function listFiles(root: string, folder: string, expected: string): string[] {
  return entries(root, folder, (entry) => entry.isFile(), expected);
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

// Ningún ID de `listed` se repite. `placeOf` da el lugar de cada elemento, para que el error
// nombre el campo; `repeated` es el comienzo del mensaje.
export function expectUniqueIds(
  listed: readonly string[],
  placeOf: (index: number) => Place,
  repeated = 'ID repetido',
): void {
  const seen = new Set<string>();
  listed.forEach((id, index) => {
    if (seen.has(id)) fail(placeOf(index), `${repeated}: ${id}`);
    seen.add(id);
  });
}

// Un manifiesto y su carpeta listan los mismos IDs: sin repetidos, faltantes ni huérfanos.
// `suffix` es '.yaml' para registros y '' para las carpetas de ejercicios. Por omisión los
// errores de lo listado se ubican en el manifiesto; `placeOf` los ubica en el campo de cada ID.
export function expectSameIds(
  listed: readonly string[],
  found: readonly string[],
  manifest: Place,
  folder: string,
  suffix: string,
  placeOf: (index: number) => Place = () => manifest,
): void {
  expectUniqueIds(listed, placeOf);
  listed.forEach((id, index) => {
    if (!found.includes(id)) fail(placeOf(index), `${id} no tiene ${folder}/${id}${suffix}`);
  });
  for (const id of found) {
    if (!listed.includes(id)) {
      fail(filePlace(`${folder}/${id}${suffix}`), `no figura en ${manifest.file}`);
    }
  }
}
