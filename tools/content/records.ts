// Registros literales de content/ (mundos, talleres, conceptos del Atlas y la guía): cada
// <id>.yaml es el objeto publicado tal cual, con su `id` igual al nombre del archivo y las
// claves en el orden del YAML. Un manifest.yaml agrupa y ordena los IDs.
import { expectSameIds, listYamlIds } from './catalog-files.ts';
import { child, fail, filePlace } from './content-error.ts';
import { checkRecord, textList, type Check, type JsonRecord } from './shape.ts';
import { readYamlFile } from './yaml-file.ts';

export function loadRecord(
  root: string,
  file: string,
  id: string,
  spec: Record<string, Check>,
  optional: readonly string[] = [],
): JsonRecord {
  const place = filePlace(file);
  const record = checkRecord(readYamlFile(root, file), place, spec, optional);
  if (record.id !== id) fail(child(place, 'id'), `debe ser «${id}», como el nombre del archivo`);
  return record;
}

// Lee <folder>/manifest.yaml (cada grupo con su lista de IDs, en orden) y un <id>.yaml por ID.
export function loadGroupedRecords<Group extends string>(
  root: string,
  folder: string,
  groups: readonly Group[],
  spec: Record<string, Check>,
  optional: readonly string[] = [],
): Record<Group, JsonRecord[]> {
  const manifestFile = `${folder}/manifest.yaml`;
  const manifestPlace = filePlace(manifestFile);
  const groupSpec = Object.fromEntries(groups.map((group) => [group, textList(1)]));
  const manifest = checkRecord(readYamlFile(root, manifestFile), manifestPlace, groupSpec);
  const ids = groups.flatMap((group) => manifest[group] as string[]);
  expectSameIds(ids, listYamlIds(root, folder), manifestPlace, folder, '.yaml');
  const result = {} as Record<Group, JsonRecord[]>;
  for (const group of groups) {
    result[group] = (manifest[group] as string[]).map((id) =>
      loadRecord(root, `${folder}/${id}.yaml`, id, spec, optional),
    );
  }
  return result;
}
