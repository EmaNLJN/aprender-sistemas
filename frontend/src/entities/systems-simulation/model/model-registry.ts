export function mergeModelGroups(groups: readonly object[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const group of groups) {
    for (const [name, model] of Object.entries(group)) {
      if (merged[name]) throw new Error('Modelo de Sistemas repetido: ' + name);
      merged[name] = model;
    }
  }
  return merged;
}
