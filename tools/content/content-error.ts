// Errores de content/: cada mensaje nombra el archivo y el campo que fallan, para que quien
// edita un YAML sepa dónde mirar.
export class ContentError extends Error {}

// Ubicación de un valor: archivo relativo a la raíz y ruta dentro del documento.
export interface Place {
  file: string;
  path: string;
}

export function filePlace(file: string): Place {
  return { file, path: '' };
}

export function child(place: Place, key: string | number): Place {
  let step = `.${key}`;
  if (typeof key === 'number') step = `[${key}]`;
  else if (place.path === '') step = key;
  return { file: place.file, path: place.path + step };
}

export function fail(place: Place, message: string): never {
  const where = place.path === '' ? place.file : `${place.file}: ${place.path}`;
  throw new ContentError(`${where}: ${message}`);
}
