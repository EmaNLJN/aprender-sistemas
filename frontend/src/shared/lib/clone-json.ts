// Deliberate deep copy with JSON semantics: progress is serialized as JSON
// and QA's vm contexts have no structuredClone. Drops undefined and functions.
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
