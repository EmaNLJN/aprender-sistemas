import type { Exercise } from './types';

export function liveHint(code: string, exercise: Pick<Exercise, 'review'>): string {
  if (/todo!\s*\(|TODO|IMPLEMENTAR|panic\("pendiente/i.test(code))
    return 'Todavía hay una parte por completar. Pensá primero qué entra y qué debería salir.';
  if (!code.trim())
    return 'Volvé al código inicial para conservar las firmas que usan las pruebas.';
  if (/\b(?:fn|func)\s+main\s*\(/.test(code))
    return 'El taller ya agrega main. Mantené acá las funciones de la consigna.';
  return (
    'No hace falta adivinar: proponé un cambio pequeño y comprobalo. ' + exercise.review.pitfall
  );
}
