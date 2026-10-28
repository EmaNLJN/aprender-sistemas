import type { ExerciseLanguage } from './types';

export interface Diagnosis {
  explanation: string;
  action: string;
}

type DiagnosisRule = readonly [pattern: RegExp, explanation: string, action: string];

const RUST_RULES: readonly DiagnosisRule[] = [
  [
    /E0382|use of moved value|borrow of moved value/,
    'Ese valor ya se movió. Para tipos como String, asignar o pasar por valor puede transferir ownership; el nombre anterior deja de poder usarlo.',
    'Identificá dónde se consume el valor. Si solo necesitás leerlo, considerá un préstamo; si necesitás dos valores independientes, razoná sobre una copia explícita.',
  ],
  [
    /E0502|E0499|cannot borrow.*mutable.*immutable|more than once/,
    'Los préstamos que se superponen permiten accesos incompatibles. Rust evita que una modificación conviva con lecturas o escrituras que podrían invalidarse.',
    'Buscá el último uso de cada referencia y reducí el alcance del préstamo antes de pedir otro incompatible.',
  ],
  [
    /E0596|E0384|cannot assign twice|cannot assign to/,
    'Estás intentando modificar un binding o acceder con mutabilidad donde no está permitida. La mutabilidad es una decisión explícita.',
    'Revisá si necesitás let mut, una referencia &mut o simplemente calcular un valor nuevo.',
  ],
  [
    /E0308|mismatched types/,
    'La expresión devuelve un tipo distinto del que promete su contexto. Un punto y coma también puede convertir el resultado de un bloque en ().',
    'Compará los tipos “expected” y “found”. Revisá la última expresión, los brazos de match y los valores devueltos.',
  ],
  [
    /E0106|E0597|does not live long enough|missing lifetime/,
    'Una referencia necesita apuntar a un valor que siga vivo durante su uso. Una anotación de lifetime describe relaciones; no alarga la vida de los datos.',
    'Comprobá quién posee el valor referenciado y si devolvés una referencia a un dato local. Considerá devolver datos propios o relacionar la salida con una entrada.',
  ],
  [
    /E0277|trait bound/,
    'La operación necesita un comportamiento expresado por un trait que el tipo actual no cumple.',
    'Leé el trait que aparece en el diagnóstico y revisá el tipo o la restricción genérica requerida por la consigna.',
  ],
  [
    /E0428|defined multiple times/,
    'Hay dos definiciones con el mismo nombre. El taller agrega main y el código de pruebas.',
    'Editá las funciones iniciales, sin agregar otra función main ni pegar el programa completo de las pruebas.',
  ],
  [
    /expected|unexpected|unclosed delimiter/,
    'La estructura del código no coincide con la sintaxis que espera Rust.',
    'Empezá por el primer diagnóstico: revisá delimitadores, comas, operadores y el lugar señalado. Un error temprano puede producir varios mensajes.',
  ],
];

const GO_RULES: readonly DiagnosisRule[] = [
  [
    /declared and not used|imported and not used/,
    'Go detectó una variable local o un import que no se usa. Eso suele indicar trabajo incompleto o código que ya no hace falta.',
    'Usá el valor que necesitás para resolver la consigna o quitá la declaración sobrante. Revisá también los imports que utiliza el ejercicio.',
  ],
  [
    /cannot use|mismatched types|invalid operation/,
    'Los tipos de esta operación no son compatibles. Go no convierte automáticamente todos los tipos aunque sus representaciones se parezcan.',
    'Compará el tipo recibido con el que espera la función u operador. Convertí explícitamente solo si preserva el significado.',
  ],
  [
    /undefined:/,
    'El compilador no encuentra ese nombre en su alcance.',
    'Buscá una diferencia de escritura, una variable declarada dentro de otro bloque o una función que cambiaste de nombre y que todavía usa una prueba.',
  ],
  [
    /no new variables on left side/,
    'El operador := declara variables nuevas en ese bloque. Acá no está introduciendo ninguna.',
    'Si querés actualizar una variable existente, usá =. Si estás declarando otra, revisá el alcance y el nombre.',
  ],
  [
    /deadlock|all goroutines are asleep/,
    'Las goroutines quedaron esperando sin una operación que pueda destrabarlas. Un canal sin buffer requiere que envío y recepción se encuentren.',
    'Dibujá quién envía, quién recibe y quién cierra. Asegurate de que la operación complementaria pueda ejecutarse.',
  ],
  [
    /index out of range|slice bounds/,
    'Se intentó acceder fuera de los límites de un slice o arreglo.',
    'Revisá el caso vacío y recordá que el último índice válido es len-1. Separá capacidad de longitud.',
  ],
  [
    /redeclared|main redeclared/,
    'Hay más de una declaración con el mismo nombre. El taller prepara package, imports y main.',
    'Mantené en el editor las funciones indicadas, sin agregar package, imports ni main.',
  ],
  [
    /syntax error|expected|unexpected/,
    'El compilador no pudo interpretar esta parte del programa.',
    'Revisá el primer mensaje y su línea. Comprobá llaves, comas, paréntesis y la firma de la función.',
  ],
];

const FALLBACK: Diagnosis = {
  explanation:
    'La ejecución no terminó correctamente. La salida original, abajo, muestra el diagnóstico que necesitamos interpretar.',
  action:
    'Empezá por el primer error y comparalo con la firma y el comportamiento pedidos. Pedí una pista si todavía no encontrás la causa.',
};

export function diagnose(stderr: string, language: ExerciseLanguage): Diagnosis {
  const rules = language === 'rust' ? RUST_RULES : GO_RULES;
  for (const [pattern, explanation, action] of rules)
    if (pattern.test(stderr)) return { explanation, action };
  return { ...FALLBACK };
}
