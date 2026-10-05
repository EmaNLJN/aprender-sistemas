import { expectSameIds, listYamlIds } from './catalog-files.ts';
import { child, fail, filePlace, type Place } from './content-error.ts';
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

export function loadListedRecords(
  root: string,
  ids: readonly string[],
  manifestPlace: Place,
  folder: string,
  spec: Record<string, Check>,
  optional: readonly string[] = [],
): JsonRecord[] {
  expectSameIds(ids, listYamlIds(root, folder), manifestPlace, folder, '.yaml');
  return ids.map((id) => loadRecord(root, `${folder}/${id}.yaml`, id, spec, optional));
}

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
  const records = loadListedRecords(root, ids, manifestPlace, folder, spec, optional);
  const result = {} as Record<Group, JsonRecord[]>;
  let next = 0;
  for (const group of groups) {
    const count = (manifest[group] as string[]).length;
    result[group] = records.slice(next, next + count);
    next += count;
  }
  return result;
}
