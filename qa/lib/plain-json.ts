// Copia con semántica JSON: normaliza objetos creados en otro contexto vm para
// compararlos con deepEqual y descarta funciones, undefined y prototipos.
export function plainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
