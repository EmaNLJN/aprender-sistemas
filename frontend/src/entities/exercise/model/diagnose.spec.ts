import { describe, expect, it } from 'vitest';
import { diagnose } from './diagnose';

const FALLBACK = {
  explanation:
    'La ejecución no terminó correctamente. La salida original, abajo, muestra el diagnóstico que necesitamos interpretar.',
  action:
    'Empezá por el primer error y comparalo con la firma y el comportamiento pedidos. Pedí una pista si todavía no encontrás la causa.',
};

// One compiler message per rule; the expected explanation starts as lab.js wrote it.
const RUST: [stderr: string, explanationStart: string][] = [
  ['error[E0382]: borrow of moved value: `s`', 'Ese valor ya se movió.'],
  ['error[E0502]: cannot borrow `v` as mutable', 'Los préstamos que se superponen'],
  [
    'error[E0384]: cannot assign twice to immutable variable `nivel`',
    'Estás intentando modificar un binding',
  ],
  ['error[E0308]: mismatched types', 'La expresión devuelve un tipo distinto'],
  ['error[E0597]: `x` does not live long enough', 'Una referencia necesita apuntar'],
  [
    'error[E0277]: the trait bound `T: Ord` is not satisfied',
    'La operación necesita un comportamiento',
  ],
  [
    'error[E0428]: the name `main` is defined multiple times',
    'Hay dos definiciones con el mismo nombre.',
  ],
  ['error: unexpected closing delimiter: `}`', 'La estructura del código no coincide'],
];
const GO: [stderr: string, explanationStart: string][] = [
  ['./prog.go:12:2: declared and not used: x', 'Go detectó una variable local'],
  [
    './prog.go:8:9: cannot use s (variable of type string) as int value',
    'Los tipos de esta operación',
  ],
  ['./prog.go:5:2: undefined: total', 'El compilador no encuentra ese nombre'],
  ['./prog.go:6:4: no new variables on left side of :=', 'El operador := declara variables nuevas'],
  ['fatal error: all goroutines are asleep - deadlock!', 'Las goroutines quedaron esperando'],
  [
    'panic: runtime error: index out of range [3] with length 3',
    'Se intentó acceder fuera de los límites',
  ],
  [
    './prog.go:20:6: main redeclared in this block',
    'Hay más de una declaración con el mismo nombre.',
  ],
  ['./prog.go:3:1: syntax error: unexpected }', 'El compilador no pudo interpretar'],
];

describe('diagnose', () => {
  it.each(RUST)('Rust: %s', (stderr, explanationStart) => {
    expect(diagnose(stderr, 'rust').explanation.startsWith(explanationStart)).toBe(true);
  });

  it.each(GO)('Go: %s', (stderr, explanationStart) => {
    expect(diagnose(stderr, 'go').explanation.startsWith(explanationStart)).toBe(true);
  });

  it('gives the explanation and the action of the mutability rule word for word', () => {
    expect(diagnose('error[E0384]: cannot assign twice', 'rust')).toEqual({
      explanation:
        'Estás intentando modificar un binding o acceder con mutabilidad donde no está permitida. La mutabilidad es una decisión explícita.',
      action:
        'Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
    });
  });

  it('the first matching rule wins: a moved value that is also unexpected is about ownership', () => {
    expect(diagnose('error[E0382]: use of moved value; expected `;`', 'rust').explanation).toMatch(
      /^Ese valor ya se movió\./,
    );
  });

  it('the rules belong to their language: a Rust code means nothing to Go', () => {
    expect(diagnose('error[E0382]', 'go')).toEqual(FALLBACK);
  });

  it('an unknown message and an empty one get the fallback', () => {
    expect(diagnose('Killed', 'rust')).toEqual(FALLBACK);
    expect(diagnose('', 'go')).toEqual(FALLBACK);
  });
});
