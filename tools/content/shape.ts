import { child, fail, type Place } from './content-error.ts';

// Valor JSON tal como lo devuelve el parser de YAML con el esquema core.
export type Json = string | number | boolean | null | Json[] | JsonRecord;
export interface JsonRecord {
  [key: string]: Json;
}

// Comprobación de un valor: falla con su ubicación o devuelve el valor ya tipado.
export type Check = (value: unknown, place: Place) => unknown;

export function expectRecord(value: unknown, place: Place): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(place, 'se esperaba un mapa de claves');
  }
  return value as JsonRecord;
}

export function expectText(value: unknown, place: Place): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(place, 'se esperaba un texto no vacío');
  }
  return value;
}

export function expectList(value: unknown, place: Place, minimum: number): unknown[] {
  if (!Array.isArray(value)) fail(place, 'se esperaba una lista');
  if (value.length < minimum) {
    fail(
      place,
      minimum === 1
        ? 'la lista no puede estar vacía'
        : `se esperaban al menos ${minimum} elementos`,
    );
  }
  return value;
}

export function expectTextList(value: unknown, place: Place, minimum: number): string[] {
  return expectList(value, place, minimum).map((item, index) =>
    expectText(item, child(place, index)),
  );
}

export function expectInteger(value: unknown, place: Place, minimum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) {
    fail(place, `se esperaba un entero mayor o igual que ${minimum}`);
  }
  return value;
}

export function expectBoolean(value: unknown, place: Place): boolean {
  if (typeof value !== 'boolean') fail(place, 'se esperaba true o false');
  return value;
}

export function oneOf(allowed: readonly string[]): Check {
  return (value, place) => {
    if (typeof value !== 'string' || !allowed.includes(value)) {
      fail(place, `se esperaba uno de: ${allowed.join(', ')}`);
    }
    return value;
  };
}

export function textList(minimum: number): Check {
  return (value, place) => expectTextList(value, place, minimum);
}

export function integer(minimum: number): Check {
  return (value, place) => expectInteger(value, place, minimum);
}

export function listOf(check: Check, minimum: number): Check {
  return (value, place) =>
    expectList(value, place, minimum).map((item, index) => check(item, child(place, index)));
}

// Un mapa con exactamente las claves de `spec`, salvo las opcionales; cada valor pasa su
// comprobación. No reordena: las claves quedan en el orden del YAML.
export function checkRecord(
  value: unknown,
  place: Place,
  spec: Record<string, Check>,
  optional: readonly string[] = [],
): JsonRecord {
  const record = expectRecord(value, place);
  for (const key of Object.keys(record)) {
    if (!Object.hasOwn(spec, key)) fail(child(place, key), 'clave desconocida');
  }
  for (const [key, check] of Object.entries(spec)) {
    if (Object.hasOwn(record, key)) check(record[key], child(place, key));
    else if (!optional.includes(key)) fail(place, `falta la clave «${key}»`);
  }
  return record;
}

export function checkSource(value: unknown, place: Place): JsonRecord {
  return checkRecord(value, place, { title: expectText, url: expectText });
}

// Predicción, quiz o checkpoint: `answer` es el índice de una de las opciones.
export function checkQuestion(value: unknown, place: Place): JsonRecord {
  const question = checkRecord(value, place, {
    question: expectText,
    options: textList(2),
    answer: integer(0),
    explanation: expectText,
  });
  const options = question.options as string[];
  const answer = question.answer as number;
  if (answer >= options.length) {
    fail(child(place, 'answer'), `${answer} no es el índice de una opción: hay ${options.length}`);
  }
  return question;
}
