import { describe, expect, it } from 'vitest';
import { liveHint } from './live-hint';

const EXERCISE = {
  review: { success: '', pitfall: 'println! muestra texto y devuelve ().' },
};

describe('liveHint', () => {
  it.each(['todo!("calcular")', '// TODO', 'IMPLEMENTAR acá', 'panic("pendiente")'])(
    'a part left to complete: %s',
    (code) => {
      expect(liveHint(code, EXERCISE)).toBe(
        'Todavía hay una parte por completar. Pensá primero qué entra y qué debería salir.',
      );
    },
  );

  it('an empty editor asks to restore the starter', () => {
    expect(liveHint(' \n ', EXERCISE)).toBe(
      'Volvé al código inicial para conservar las firmas que usan las pruebas.',
    );
  });

  it.each(['fn main() {}', 'func main() {}'])('a main of your own: %s', (code) => {
    expect(liveHint(code, EXERCISE)).toBe(
      'El taller ya agrega main. Mantené acá las funciones de la consigna.',
    );
  });

  it('otherwise, it invites a small change and adds the pitfall', () => {
    expect(liveHint('fn energia() -> i32 { 1 }', EXERCISE)).toBe(
      'No hace falta adivinar: proponé un cambio pequeño y comprobalo. println! muestra texto y devuelve ().',
    );
  });

  it('a pending part wins over an empty-looking main', () => {
    expect(liveHint('fn main() { todo!() }', EXERCISE)).toMatch(/^Todavía hay una parte/);
  });
});
