// Copia profunda con semántica JSON, deliberada: el progreso se serializa como JSON
// y los contextos vm de QA no tienen structuredClone. Descarta undefined y funciones.
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
