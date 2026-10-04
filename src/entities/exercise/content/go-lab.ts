/* Ejercicios originales. Las fuentes documentan el lenguaje, no son soluciones copiadas. */
import type { LevelId } from '../../../shared/config/levels';
import {
  formatExerciseId,
  numberTests,
  prediction as predict,
  testCase as test,
} from '../model/builders';
import type { Exercise, ExerciseDraft, ExerciseVisual } from '../model/types';

type GoTopic = [
  topicId: string,
  topic: string,
  sourceUrl: string,
  sourceTitle: string,
  level?: LevelId,
];

const topics: GoTopic[] = [
  ['go-basics', 'Tipos y primeros pasos', 'https://go.dev/ref/spec#Types', 'Tipos en Go'],
  [
    'go-flow',
    'Funciones y decisiones',
    'https://go.dev/doc/effective_go#control-structures',
    'Control y funciones',
  ],
  [
    'go-slices',
    'Arrays, slices y memoria',
    'https://go.dev/blog/slices-intro',
    'Slices e internals',
  ],
  ['go-collections', 'Maps y texto', 'https://go.dev/blog/maps', 'Maps en Go'],
  ['go-structs', 'Structs y punteros', 'https://go.dev/ref/spec#Method_sets', 'Métodos y tipos'],
  ['go-errors', 'Errores que informan', 'https://pkg.go.dev/errors', 'Paquete errors'],
  [
    'go-interfaces',
    'Interfaces pequeñas',
    'https://go.dev/doc/effective_go#interfaces_and_types',
    'Interfaces y tipos',
  ],
  [
    'go-defer',
    'Defer y recursos',
    'https://go.dev/blog/defer-panic-and-recover',
    'Defer, panic y recover',
  ],
  [
    'go-concurrency',
    'Goroutines y canales',
    'https://go.dev/blog/pipelines',
    'Pipelines y cancelación',
  ],
  ['go-project', 'Tu motor clave-valor', 'https://pkg.go.dev/strings', 'Herramientas para texto'],
  [
    'go-generics',
    'Genéricos y restricciones',
    'https://go.dev/doc/tutorial/generics',
    'Tutorial oficial de genéricos',
  ],
  [
    'go-pointers',
    'Punteros, métodos y composición',
    'https://go.dev/ref/spec#Method_sets',
    'Tipos y conjuntos de métodos',
  ],
  [
    'go-coordination',
    'Cancelación y sincronización',
    'https://pkg.go.dev/context',
    'Contextos y cancelación',
  ],
  [
    'go-io',
    'I/O, JSON y HTTP sin salir del laboratorio',
    'https://pkg.go.dev/io',
    'Interfaces de entrada y salida',
  ],
  [
    'go-tooling',
    'Pruebas, paquetes y medición',
    'https://pkg.go.dev/testing',
    'Herramientas de pruebas',
  ],
  [
    'go-numeric-puzzles',
    'Reglas y rompecabezas numéricos',
    'https://go.dev/ref/spec#Arithmetic_operators',
    'Operadores numéricos',
    'beginner',
  ],
  [
    'go-text-puzzles',
    'Laboratorio de texto y Unicode',
    'https://go.dev/blog/strings',
    'Texto, bytes y runes',
    'medium',
  ],
  [
    'go-data-puzzles',
    'Pilas, ventanas y estructuras',
    'https://go.dev/blog/slices-intro',
    'Slices y almacenamiento',
    'medium',
  ],
  [
    'go-state-machines',
    'Parsers y estado que recuerda',
    'https://pkg.go.dev/container/list',
    'Listas y composición de estructuras',
    'advanced',
  ],
  [
    'go-streaming',
    'Lecturas parciales y streaming',
    'https://pkg.go.dev/io',
    'Contratos de entrada y salida',
    'expert',
  ],
];
const EXERCISES_PER_STAGE = 5;
const exercises: Exercise[] = [];

function visualForStage(stage: number): ExerciseVisual {
  if (stage === 11) return 'generics';
  if (stage === 12) return 'pointers';
  if (stage === 13) return 'concurrency';
  if (stage === 3 || stage === 5) return 'memory';
  if (stage === 4) return 'collections';
  return 'flow';
}

// El número es el ID publicado (go-01…go-100); la etapa se deriva de él.
function add(number: number, exercise: ExerciseDraft): void {
  const stage = Math.ceil(number / EXERCISES_PER_STAGE);
  const topic = topics[stage - 1];
  exercises.push({
    id: formatExerciseId('go', number),
    language: 'go',
    topicId: topic[0],
    topic: topic[1],
    stage,
    kind: 'completar',
    minutes: stage < 5 ? 10 : 15,
    imports: [],
    visual: visualForStage(stage),
    sources: [{ title: topic[3], url: topic[2] }],
    ...(topic[4] ? { level: topic[4] } : {}),
    ...exercise,
    tests: numberTests(exercise.tests),
  });
}

add(1, {
  title: 'La mochila de bytes',
  intro:
    'Un servidor recibe un límite de memoria en KiB. Cada KiB contiene 1024 bytes. Una función expresa la conversión como una regla que podés comprobar con muchas entradas.',
  why: 'El tipo int permite aritmética entera. La firma declara qué recibe la función y qué devuelve; el compilador comprueba ese acuerdo.',
  objective: 'Convertí una cantidad pequeña y no negativa de KiB a bytes.',
  instructions: [
    'Conservá la firma Bytes(kib int) int.',
    'Reemplazá el valor fijo por una expresión que use kib.',
  ],
  starter: 'func Bytes(kib int) int {\n    return kib // ¿es la misma unidad?\n}',
  solution: 'func Bytes(kib int) int {\n    return kib * 1024\n}',
  tests: [
    test(
      'Un bloque',
      'Bytes(1) == 1024',
      'Comprueba la unidad de conversión.',
      'Un KiB no es un byte ni 1000 bytes.',
    ),
    test(
      'Memoria vacía',
      'Bytes(0) == 0',
      'La conversión conserva el cero.',
      'Multiplicá la entrada; no sumes una constante.',
    ),
    test(
      'Varias páginas',
      'Bytes(12) == 12288',
      'La regla debe escalar con la entrada.',
      'No devuelvas solamente el resultado del primer ejemplo.',
    ),
  ],
  hints: [
    'Identificá qué unidad entra y cuál sale.',
    'La relación es multiplicativa.',
    'La expresión necesita kib y 1024.',
  ],
  review: {
    success:
      'Tu función traduce unidades y sirve para cualquier entrada dentro del rango indicado. Los tests verifican ejemplos concretos, no ausencia de overflow para todos los int.',
    pitfall: 'KiB y kB no significan lo mismo: acá elegimos explícitamente 1024.',
  },
  transfer: 'Agregá una función para MiB y explicá sus unidades.',
  prediction: predict(
    '¿Qué devuelve Bytes(2)?',
    ['2048', '1026', '2000'],
    0,
    'Dos bloques de 1024 bytes suman 2048 bytes.',
  ),
});
add(2, {
  title: 'El porcentaje que perdió sus decimales',
  kind: 'reparar',
  intro:
    'El monitor calcula qué fracción de tareas terminó. Con dos int, dividir primero descarta la parte fraccionaria. Convertir el resultado después llega demasiado tarde.',
  why: 'Las conversiones son explícitas: float64(done) cambia el tipo antes de hacer la operación. El orden determina qué información conservás.',
  objective: 'Devolvé done / total como float64; total siempre será positivo.',
  instructions: [
    'Convertí ambos operandos antes de dividir.',
    'No redondees ni multipliques por 100: buscamos una fracción.',
  ],
  starter: 'func Fraction(done, total int) float64 {\n    return float64(done / total)\n}',
  solution:
    'func Fraction(done, total int) float64 {\n    return float64(done) / float64(total)\n}',
  tests: [
    test(
      'La mitad',
      'Fraction(1, 2) == 0.5',
      'Detecta división entera prematura.',
      'Convertí antes de dividir.',
    ),
    test(
      'Sin progreso',
      'Fraction(0, 4) == 0',
      'Cero tareas debe producir cero.',
      'No agregues un ajuste artificial al resultado.',
    ),
    test(
      'Tres cuartos',
      'Fraction(3, 4) == 0.75',
      'Comprueba una fracción diferente.',
      'Cada operando necesita el tipo correcto.',
    ),
  ],
  hints: [
    'El cast exterior no recupera información perdida.',
    'float64(x) convierte un valor.',
    'Dividí float64(done) por float64(total).',
  ],
  review: {
    success:
      'Elegiste el tipo de la operación antes de ejecutarla. Los valores de prueba tienen representación binaria exacta; con otros decimales puede haber redondeo.',
    pitfall: 'Usar float64 no vuelve exacta cualquier cuenta decimal.',
  },
  transfer: 'Decidí qué contrato usarías si total fuese cero.',
  prediction: predict(
    '¿Cuánto vale float64(3 / 4)?',
    ['0.75', '0', 'No compila'],
    1,
    'Primero se divide entre enteros y queda 0; la conversión produce 0.0.',
  ),
});
add(3, {
  title: 'Encender desde cero',
  kind: 'reparar',
  intro:
    'Querés que un dispositivo recién creado tenga contador cero, modo apagado y nombre vacío. Go inicializa cada variable con el valor cero de su tipo.',
  why: 'Podés empezar con var sin inventar valores de relleno. El cero es parte del diseño del tipo y ayuda a construir estados iniciales predecibles.',
  objective: 'Devolvé los valores cero de int, bool y string, en ese orden.',
  instructions: ['Declaralos con var dentro de Defaults.', 'Devolvé las tres variables.'],
  starter: 'func Defaults() (int, bool, string) {\n    return 1, true, "nuevo"\n}',
  solution:
    'func Defaults() (int, bool, string) {\n    var count int\n    var enabled bool\n    var name string\n    return count, enabled, name\n}',
  tests: [
    test(
      'Contador inicial',
      'func() bool { n, _, _ := Defaults(); return n == 0 }()',
      'El cero numérico debe ser 0.',
      'Una variable int sin inicializador empieza en cero.',
    ),
    test(
      'Apagado',
      'func() bool { _, on, _ := Defaults(); return !on }()',
      'El cero booleano es false.',
      'true es una decisión explícita, no el estado por defecto.',
    ),
    test(
      'Nombre vacío',
      'func() bool { _, _, s := Defaults(); return s == "" }()',
      'Distingue vacío de un nombre de relleno.',
      'La cadena vacía se escribe "".',
    ),
  ],
  hints: [
    'var count int ya está inicializada.',
    'Podés declarar una variable por línea.',
    'return admite tres valores separados por comas.',
  ],
  review: {
    success:
      'El estado inicial ahora tiene un contrato claro. Los tests observan los valores; no pueden exigir que uses var en vez de literales equivalentes.',
    pitfall:
      'El valor cero puede ser útil, pero no garantiza que cualquier objeto esté listo para cualquier operación.',
  },
  transfer: 'Pensá si el puerto cero sería válido para tu aplicación.',
  prediction: predict(
    'Después de var ready bool, ready vale…',
    ['nil', 'true', 'false'],
    2,
    'bool tiene dos valores. Su valor cero es false.',
  ),
});
add(4, {
  title: 'Intercambio sin pisar datos',
  kind: 'reparar',
  intro:
    'Dos buffers intercambian sus identificadores. Si reemplazás a antes de recordar su valor original, el segundo paso ya no puede recuperarlo.',
  why: 'Una asignación múltiple evalúa los valores de la derecha antes de completar las asignaciones de la izquierda. Eso permite expresar un intercambio directamente.',
  objective: 'Devolvé b y a, conservando sus valores originales.',
  instructions: [
    'Corregí el intercambio de a y b.',
    'Probá también cuando ambos valores coinciden.',
  ],
  starter: 'func Swap(a, b int) (int, int) {\n    a = b\n    b = a\n    return a, b\n}',
  solution: 'func Swap(a, b int) (int, int) {\n    a, b = b, a\n    return a, b\n}',
  tests: [
    test(
      'Dos distintos',
      'func() bool { a,b := Swap(3,9); return a == 9 && b == 3 }()',
      'Detecta la pérdida del primer valor.',
      'La asignación secuencial sobrescribe a.',
    ),
    test(
      'Cero y negativo',
      'func() bool { a,b := Swap(0,-4); return a == -4 && b == 0 }()',
      'El intercambio no depende del signo.',
      'No uses aritmética para codificar el intercambio.',
    ),
    test(
      'Mismo valor',
      'func() bool { a,b := Swap(7,7); return a == 7 && b == 7 }()',
      'Los iguales siguen siendo iguales.',
      'El contrato cambia posiciones, no magnitudes.',
    ),
  ],
  hints: [
    'Hay una asignación con dos destinos.',
    'Escribí a, b a la izquierda.',
    'Los valores originales pueden ir como b, a a la derecha.',
  ],
  review: {
    success:
      'El intercambio conserva ambos valores. Esta forma hace visible la operación sin agregar una variable temporal.',
    pitfall: 'Reasignar un parámetro local no modifica por sí mismo la variable del llamador.',
  },
  transfer: 'Usá el mismo patrón para invertir los extremos de un array.',
  prediction: predict(
    'Con a=2, b=5, después de a=b; b=a quedan…',
    ['5 y 2', '5 y 5', '2 y 2'],
    1,
    'La primera asignación ya destruyó el 2 local de a.',
  ),
});
add(5, {
  title: 'El panel de permisos binarios',
  intro:
    'Un byte puede guardar ocho interruptores. Una máscara selecciona cuáles querés inspeccionar. Necesitamos saber si todos los permisos pedidos están activados.',
  why: 'El operador & conserva solamente los bits presentes en ambos operandos. Comparar esa intersección con la máscara distingue “todos” de “alguno”.',
  objective:
    'Implementá HasFlags(flags, mask uint8) bool; una máscara cero se considera satisfecha.',
  instructions: [
    'Calculá la intersección bit a bit.',
    'Comparala con mask, no solamente con cero.',
  ],
  starter: 'func HasFlags(flags, mask uint8) bool {\n    return flags == mask\n}',
  solution: 'func HasFlags(flags, mask uint8) bool {\n    return flags & mask == mask\n}',
  tests: [
    test(
      'Permisos extra',
      'HasFlags(7, 3)',
      'Tener bits extra no invalida los pedidos.',
      '7 incluye los bits que forman 3.',
    ),
    test(
      'Falta uno',
      '!HasFlags(1, 3)',
      'Todos los bits pedidos son necesarios.',
      'Una intersección no nula puede ser insuficiente.',
    ),
    test(
      'Ningún requisito',
      'HasFlags(8, 0)',
      'Define explícitamente la máscara vacía.',
      'Cualquier valor AND cero da cero.',
    ),
  ],
  hints: [
    'Pensá 7 como 111 y 3 como 011.',
    'Necesitás &, no &&.',
    'La intersección debe conservar la máscara completa.',
  ],
  review: {
    success:
      'Expresaste un conjunto de permisos con bits. La prueba de máscara vacía obliga a pensar el contrato, no solamente los casos típicos.',
    pitfall: '&& combina booleanos; & combina bits de enteros.',
  },
  transfer: 'Diseñá una función que active permisos sin borrar los existentes.',
  prediction: predict(
    '¿Cuánto vale 5 & 3? (101 y 011)',
    ['7', '1', '5'],
    1,
    'Solamente comparten el bit de menor valor: 001.',
  ),
});

add(6, {
  title: 'La temperatura dentro del rango',
  intro:
    'Un control necesita limitar una lectura al intervalo permitido. Los retornos tempranos resuelven los extremos antes del caso normal.',
  why: 'Cada if elimina una posibilidad. El camino final queda reservado para un valor ya válido y no necesita más condiciones.',
  objective: 'Devolvé x limitado a [low, high], suponiendo low <= high.',
  instructions: [
    'Si x está por debajo, devolvé low.',
    'Si supera high, devolvé high; dentro del rango conservá x.',
  ],
  starter: 'func Clamp(x, low, high int) int {\n    return x\n}',
  solution:
    'func Clamp(x, low, high int) int {\n    if x < low { return low }\n    if x > high { return high }\n    return x\n}',
  tests: [
    test(
      'Por debajo',
      'Clamp(-8,0,10) == 0',
      'Comprueba el límite inferior.',
      'Compará con low antes de devolver x.',
    ),
    test(
      'Dentro',
      'Clamp(6,0,10) == 6',
      'Los valores válidos no cambian.',
      'No fuerces todo valor a un extremo.',
    ),
    test(
      'Por encima',
      'Clamp(20,0,10) == 10 && Clamp(7,7,7) == 7',
      'Verifica el límite superior y un intervalo puntual.',
      'El intervalo incluye sus extremos.',
    ),
  ],
  hints: [
    'Necesitás dos decisiones independientes.',
    'Un return termina la función.',
    'El último return puede devolver x.',
  ],
  review: {
    success:
      'La función cubre tres regiones: debajo, dentro y encima. Esas regiones explican la selección de tests.',
    pitfall: 'Esta función asume un intervalo ordenado; no valida low > high.',
  },
  transfer: 'Agregá una señal que indique si hubo que corregir la entrada.',
  prediction: predict(
    'Si x == high, ¿hay que modificarlo?',
    ['Sí, restar uno', 'No, el límite está incluido', 'Siempre devolver low'],
    1,
    'Los corchetes [low, high] indican extremos incluidos.',
  ),
});
add(7, {
  title: 'Contar solamente las tareas sanas',
  intro:
    'Los números positivos representan trabajo completado; los demás no aportan. Un acumulador resume una secuencia sin guardar cada paso.',
  why: 'range entrega índice y valor. El identificador _ descarta el índice cuando tu regla solamente necesita el valor.',
  objective: 'Sumá exclusivamente los enteros mayores que cero de un slice.',
  instructions: [
    'Recorré values con range.',
    'Agregá cada positivo a un acumulador iniciado en cero.',
  ],
  starter:
    'func SumPositive(values []int) int {\n    total := 0\n    for _, value := range values { total += value }\n    return total\n}',
  solution:
    'func SumPositive(values []int) int {\n    total := 0\n    for _, value := range values {\n        if value > 0 { total += value }\n    }\n    return total\n}',
  tests: [
    test(
      'Entradas mezcladas',
      'SumPositive([]int{4,-9,2,0}) == 6',
      'Los negativos no restan al total.',
      'Filtrá antes de acumular.',
    ),
    test(
      'Sin tareas',
      'SumPositive(nil) == 0',
      'El acumulador representa el caso vacío.',
      'range sobre nil realiza cero vueltas.',
    ),
    test(
      'Todas descartadas',
      'SumPositive([]int{-2,0,-1}) == 0',
      'Comprueba la condición estricta.',
      'Solamente value > 0 aporta trabajo.',
    ),
  ],
  hints: [
    'La suma actual incluye valores inválidos.',
    'Introducí un if dentro del for.',
    'El cero inicial ya resuelve el slice vacío.',
  ],
  review: {
    success:
      'Separaste recorrido, selección y acumulación. Ese patrón se reutiliza para métricas, validaciones y reportes.',
    pitfall: 'El primer valor de range es el índice, no el contenido.',
  },
  transfer: 'Adaptalo para contar positivos en vez de sumarlos.',
  prediction: predict(
    '¿Qué produce range sobre un slice nil?',
    ['Un panic', 'Una vuelta con 0', 'Cero vueltas'],
    2,
    'Un slice nil tiene longitud cero y puede recorrerse sin casos especiales.',
  ),
});
add(8, {
  title: 'El semáforo de un servicio',
  intro:
    'Un monitor clasifica códigos: 200–299 significa ok, 400–499 cliente, 500–599 servidor y cualquier otro valor otro.',
  why: 'Un switch sin expresión evalúa condiciones en orden. El primer caso verdadero selecciona el resultado y no cae automáticamente al siguiente.',
  objective: 'Clasificá cada código según los intervalos indicados.',
  instructions: [
    'Usá comparaciones para los rangos completos.',
    'Agregá un resultado para códigos fuera de esos rangos.',
  ],
  starter:
    'func Category(code int) string {\n    switch code {\n    case 200: return "ok"\n    default: return "otro"\n    }\n}',
  solution:
    'func Category(code int) string {\n    switch {\n    case code >= 200 && code < 300: return "ok"\n    case code >= 400 && code < 500: return "cliente"\n    case code >= 500 && code < 600: return "servidor"\n    default: return "otro"\n    }\n}',
  tests: [
    test(
      'Éxito completo',
      'Category(200) == "ok" && Category(299) == "ok"',
      'Verifica ambos extremos del primer rango.',
      '200 es un ejemplo, no el único éxito.',
    ),
    test(
      'Los dos errores',
      'Category(404) == "cliente" && Category(503) == "servidor"',
      'Separa responsabilidad de cliente y servidor.',
      'Cada rango necesita sus límites.',
    ),
    test(
      'Fuera del contrato HTTP común',
      'Category(300) == "otro" && Category(600) == "otro"',
      'Evita rangos que se extienden indefinidamente.',
      'También necesitás una cota superior.',
    ),
  ],
  hints: [
    'switch { } permite condiciones booleanas.',
    'Un rango usa && para combinar límites.',
    'default cubre lo que no coincidió.',
  ],
  review: {
    success:
      'Clasificaste por intervalos y verificaste fronteras. Pensar en los bordes detecta errores que un único ejemplo no revela.',
    pitfall: 'No hace falta break al final de cada case de Go.',
  },
  transfer: 'Agregá una categoría para redirecciones sin modificar las otras.',
  prediction: predict(
    'Después de un case coincidente, Go normalmente…',
    ['Continúa todos los cases', 'Sale del switch', 'Exige break para compilar'],
    1,
    'La continuación a otro case requiere fallthrough explícito; acá no lo necesitamos.',
  ),
});
add(9, {
  title: 'Dividir y avisar si se pudo',
  intro:
    'Una operación puede producir un número o ser inválida. Separar resultado y estado evita usar un número especial que también podría ser legítimo.',
  why: 'Go permite varios resultados. El llamador recibe tanto el dato como un bool que explica si debe usarlo.',
  objective: 'Devolvé el cociente entero y true; si b es cero, devolvé 0 y false.',
  instructions: ['Comprobá b antes de dividir.', 'Conservá resultados negativos y ceros válidos.'],
  starter: 'func Divide(a, b int) (int, bool) {\n    return a / b, true\n}',
  solution:
    'func Divide(a, b int) (int, bool) {\n    if b == 0 { return 0, false }\n    return a / b, true\n}',
  tests: [
    test(
      'División válida',
      'func() bool { n,ok := Divide(9,2); return n == 4 && ok }()',
      'El cociente entero descarta la fracción.',
      'El contrato devuelve int, no float64.',
    ),
    test(
      'Divisor cero',
      'func() bool { n,ok := Divide(7,0); return n == 0 && !ok }()',
      'No debe intentar una operación inválida.',
      'La guardia tiene que ejecutarse antes de dividir.',
    ),
    test(
      'Cero y signo legítimos',
      'func() bool { n,ok := Divide(0,3); m,yes := Divide(-9,2); return n == 0 && ok && m == -4 && yes }()',
      'Un resultado cero no significa automáticamente error.',
      'El bool representa validez, no si el resultado es positivo.',
    ),
  ],
  hints: [
    'b == 0 es el caso excepcional.',
    'Un return admite valor y estado.',
    'Los casos válidos terminan con true.',
  ],
  review: {
    success:
      'El resultado cero ahora se distingue de una división imposible. Este patrón prepara el camino para (valor, error).',
    pitfall: 'Ignorar el segundo resultado elimina la información que diseñaste.',
  },
  transfer: 'Usá el mismo contrato para buscar un elemento en una lista.',
  prediction: predict(
    'Divide(0, 2) debería devolver…',
    ['0, false', '0, true', 'Un panic'],
    1,
    'El numerador cero es válido; lo que invalidaría la división es el divisor cero.',
  ),
});
add(10, {
  title: 'Una función con memoria propia',
  intro:
    'Cada contador necesita recordar su valor entre llamadas. Una función interna puede conservar acceso a una variable de la función que la creó.',
  why: 'La clausura captura la variable. Cada llamada a NewCounter crea un estado independiente que sigue vivo mientras la función retornada lo necesita.',
  objective:
    'NewCounter(start) devuelve una función: cada llamada incrementa y retorna su propio contador.',
  instructions: [
    'Retorná una función anónima con firma func() int.',
    'Actualizá start dentro de esa función.',
  ],
  starter: 'func NewCounter(start int) func() int {\n    return func() int { return start + 1 }\n}',
  solution:
    'func NewCounter(start int) func() int {\n    return func() int {\n        start++\n        return start\n    }\n}',
  tests: [
    test(
      'Primera llamada',
      'NewCounter(4)() == 5',
      'La primera llamada ya incrementa.',
      'Incrementá antes de retornar.',
    ),
    test(
      'Estado persistente',
      'func() bool { c:=NewCounter(0); return c()==1 && c()==2 && c()==3 }()',
      'Tres llamadas deben recordar el avance.',
      'Sumar sin asignar no actualiza la variable capturada.',
    ),
    test(
      'Contadores independientes',
      'func() bool { a:=NewCounter(1); b:=NewCounter(10); return a()==2 && b()==11 && a()==3 }()',
      'Crear otro contador no comparte el primero.',
      'Evitá una variable global común.',
    ),
  ],
  hints: [
    'start pertenece a cada invocación de NewCounter.',
    'start++ modifica el valor guardado.',
    'La función interna retorna start después del incremento.',
  ],
  review: {
    success:
      'Una función se convirtió en un pequeño objeto con estado privado. Estas pruebas son secuenciales: no hacen al contador seguro para llamadas concurrentes.',
    pitfall:
      'Una clausura que modifica estado compartido requiere coordinación si varias goroutines la llaman.',
  },
  transfer: 'Creá un contador que avance de dos en dos.',
  prediction: predict(
    'Si creo a := NewCounter(0) y b := NewCounter(0), comparten estado…',
    ['Sí, por tener la misma firma', 'Solamente si llaman a a primero', 'No'],
    2,
    'Cada invocación crea su propia variable capturada.',
  ),
});

add(11, {
  title: 'Tres sensores, un array',
  intro:
    'Un dispositivo tiene exactamente tres sensores. [3]int expresa esa cantidad en el tipo; [4]int sería un tipo diferente.',
  why: 'Un array guarda una cantidad fija de elementos. Recorrerlo evita repetir código por cada posición y deja explícita la operación sobre todos.',
  objective: 'Sumá las tres lecturas de un [3]int.',
  instructions: ['Recorré readings sin ignorar ningún índice.', 'Permití lecturas negativas.'],
  starter: 'func Total(readings [3]int) int {\n    return readings[0]\n}',
  solution:
    'func Total(readings [3]int) int {\n    sum := 0\n    for _, n := range readings { sum += n }\n    return sum\n}',
  tests: [
    test(
      'Todos aportan',
      'Total([3]int{2,5,8}) == 15',
      'Comprueba las tres posiciones.',
      'No te quedes con la primera lectura.',
    ),
    test(
      'Array cero',
      'Total([3]int{}) == 0',
      'Los elementos omitidos se inicializan a cero.',
      'El acumulador debe empezar en cero.',
    ),
    test(
      'Lecturas con signo',
      'Total([3]int{-8,3,1}) == -4',
      'La suma respeta signos.',
      'No filtres negativos en este ejercicio.',
    ),
  ],
  hints: [
    'range también recorre arrays.',
    'Sumá el segundo valor entregado por range.',
    'La longitud fija ya está declarada en la firma.',
  ],
  review: {
    success:
      'Usaste el tipo para representar tres posiciones obligatorias. Pasar un array a una función copia su valor.',
    pitfall: 'Un array y un slice no son tipos intercambiables.',
  },
  transfer: 'Diseñá una versión que acepte cualquier cantidad de sensores.',
  prediction: predict(
    '¿[3]int y [4]int son el mismo tipo?',
    ['No, la longitud forma parte del tipo', 'Sí, ambos contienen int', 'Sólo si están vacíos'],
    0,
    'La longitud es una propiedad estática del array.',
  ),
});
add(12, {
  title: 'El evento que append no guardó',
  kind: 'reparar',
  intro:
    'Un slice describe una región de un array. Al agregar un evento, append devuelve la descripción actualizada; puede incluso necesitar otro array.',
  why: 'Aunque append reutilice memoria, la longitud del slice original no cambia mágicamente. Hay que conservar el resultado.',
  objective: 'Devolvé un slice con n agregado al final de values.',
  instructions: [
    'Guardá o retorná el resultado de append.',
    'La función también debe aceptar un slice nil.',
  ],
  starter:
    'func Push(values []int, n int) []int {\n    _ = append(values, n)\n    return values\n}',
  solution: 'func Push(values []int, n int) []int {\n    return append(values, n)\n}',
  tests: [
    test(
      'Primer evento',
      'func() bool { s:=Push(nil,8); return len(s)==1 && s[0]==8 }()',
      'append puede iniciar un slice nil.',
      'Retorná el nuevo slice.',
    ),
    test(
      'Con historial',
      'fmt.Sprint(Push([]int{2,4},6)) == "[2 4 6]"',
      'Conserva los elementos previos y el orden.',
      'No reemplaces el historial por un único valor.',
    ),
    test(
      'Capacidad disponible',
      'func() bool { s:=make([]int,1,4); s[0]=3; r:=Push(s,9); return len(r)==2 && r[0]==3 && r[1]==9 }()',
      'Incluso sin realocar cambia la longitud retornada.',
      'Reutilizar array no equivale a actualizar el header del llamador.',
    ),
  ],
  hints: [
    'append no modifica tu variable slice.',
    'Su resultado tiene tipo []int.',
    'Podés devolver append(values, n) directamente.',
  ],
  review: {
    success:
      'Conservaste el nuevo descriptor del slice. Esta operación no promete independencia del array original; eso requiere una copia.',
    pitfall: 'No deduzcas si hubo realocación solamente porque la operación funcionó.',
  },
  transfer: 'Compará len y cap antes y después de varios append.',
  prediction: predict(
    'Aunque quede capacidad, después de _ = append(s, x), len(s)…',
    ['Siempre aumenta', 'No cambia', 'Se vuelve cero'],
    1,
    'Se descartó el descriptor actualizado que devolvió append.',
  ),
});
add(13, {
  title: 'Una copia que sea de verdad',
  kind: 'reparar',
  intro:
    'El historial original debe sobrevivir a los cambios del editor. Asignar un slice a otro copia su descriptor, pero ambos siguen viendo el mismo almacenamiento.',
  why: 'Para independizar sus elementos necesitás otro array subyacente. make reserva el destino y copy traslada los elementos.',
  objective: 'Cloná un []int de manera que modificar el resultado no cambie el original.',
  instructions: [
    'Creá un destino del mismo largo.',
    'Copiá los valores; para nil alcanza devolver un slice de largo cero.',
  ],
  starter: 'func Clone(values []int) []int {\n    return values\n}',
  solution:
    'func Clone(values []int) []int {\n    out := make([]int, len(values))\n    copy(out, values)\n    return out\n}',
  tests: [
    test(
      'Contenido',
      'fmt.Sprint(Clone([]int{4,8,15})) == "[4 8 15]"',
      'Una copia preserva valores y orden.',
      'Crear espacio sin copy produce ceros.',
    ),
    test(
      'Memoria independiente',
      'func() bool { src:=[]int{5,7}; dst:=Clone(src); if len(dst)!=2{return false}; dst[0]=99; return src[0]==5 }()',
      'Modificar el clon no debe tocar la fuente.',
      'Una asignación de slice sigue compartiendo el array.',
    ),
    test(
      'Vacío',
      'len(Clone(nil)) == 0',
      'Copiar cero elementos es válido.',
      'No accedas al primer elemento sin comprobar longitud.',
    ),
  ],
  hints: [
    'make([]int, len(values)) reserva los elementos.',
    'copy recibe destino primero.',
    'Retorná el destino nuevo.',
  ],
  review: {
    success:
      'La prueba de mutación distingue una copia real de dos referencias a los mismos datos. Para []int alcanza copiar sus elementos.',
    pitfall: 'Si los elementos contienen otros slices o punteros, esta copia sería superficial.',
  },
  transfer: 'Explicá qué cambiaría con un slice de slices.',
  prediction: predict(
    'Después de b := a, si a es []int, b[0] = 9…',
    ['Siempre clona a', 'Puede modificar a[0]', 'No compila'],
    1,
    'Ambos descriptors apuntan al mismo array cuando existe ese elemento.',
  ),
});
add(14, {
  title: 'Filtrar sin dejar huellas',
  intro:
    'El panel muestra únicamente valores pares, pero otro componente sigue usando los datos originales. Tu transformación debe conservar ese contrato.',
  why: 'Construir un slice nuevo separa lectura y escritura. Reutilizar values[:0] sería una optimización con efectos observables sobre la entrada.',
  objective: 'Devolvé los pares en su orden original, con almacenamiento independiente.',
  instructions: ['Agregá al resultado sólo n % 2 == 0.', 'No modifiques el slice recibido.'],
  starter: 'func Evens(values []int) []int {\n    return values\n}',
  solution:
    'func Evens(values []int) []int {\n    out := make([]int, 0)\n    for _, n := range values {\n        if n % 2 == 0 { out = append(out, n) }\n    }\n    return out\n}',
  tests: [
    test(
      'Selección con orden',
      'fmt.Sprint(Evens([]int{3,8,2,5,-4})) == "[8 2 -4]"',
      'Filtra sin ordenar ni descartar pares negativos.',
      'Ser par significa tener resto cero.',
    ),
    test(
      'Nada coincide',
      'len(Evens([]int{1,3})) == 0 && len(Evens(nil)) == 0',
      'Un filtro puede producir cero elementos.',
      'No fabriques ceros como relleno.',
    ),
    test(
      'Aislamiento',
      'func() bool { src:=[]int{1,2,4}; out:=Evens(src); if len(out)!=2{return false}; out[0]=88; return fmt.Sprint(src)=="[1 2 4]" }()',
      'El resultado no puede compartir las posiciones editadas.',
      'Evitá usar values[:0] como destino.',
    ),
  ],
  hints: [
    'Necesitás otro slice inicialmente vacío.',
    'Usá append y conservá su resultado.',
    'Recorré la entrada sin asignar a sus índices.',
  ],
  review: {
    success:
      'Separaste selección y propiedad de los datos. Los tests revisan tanto lo devuelto como un efecto secundario que podría pasar desapercibido.',
    pitfall: 'Un resultado correcto no basta si se dañó la entrada.',
  },
  transfer: 'Hacé un filtro que reciba la condición como función.',
  prediction: predict(
    '¿-4 % 2 cumple la condición de par?',
    ['Sí, el resto es cero', 'No, es negativo', 'Provoca un panic'],
    0,
    'La divisibilidad también se cumple con números negativos.',
  ),
});
add(15, {
  title: 'Una ventana con bordes seguros',
  kind: 'reparar',
  intro:
    'Una ventana observa posiciones consecutivas sin copiar. Para un slice de largo N, aceptamos 0 <= start <= end <= N y excluimos end.',
  why: 'El slicing requiere índices válidos. Devolver (slice, bool) permite rechazar un pedido inválido antes de producir un panic.',
  objective: 'Devolvé una vista values[start:end] o nil, false si los límites son inválidos.',
  instructions: [
    'Validá ambos límites y su orden.',
    'La ventana válida comparte almacenamiento con values.',
  ],
  starter:
    'func Window(values []int, start, end int) ([]int, bool) {\n    return values[start:end], true\n}',
  solution:
    'func Window(values []int, start, end int) ([]int, bool) {\n    if start < 0 || end < start || end > len(values) { return nil, false }\n    return values[start:end], true\n}',
  tests: [
    test(
      'Vista compartida',
      'func() bool { s:=[]int{2,4,6,8}; w,ok:=Window(s,1,3); if !ok || len(w)!=2{return false}; w[0]=9; return s[1]==9 && w[1]==6 }()',
      'La ventana es una vista y end queda excluido.',
      'No copies si el contrato pide compartir la región.',
    ),
    test(
      'Límites inválidos',
      'func() bool { _,a:=Window([]int{1},-1,1); _,b:=Window([]int{1},0,2); _,c:=Window([]int{1},1,0); return !a && !b && !c }()',
      'Rechaza negativos, exceso e inversión.',
      'Comprobá antes de hacer slicing.',
    ),
    test(
      'Ventana vacía',
      'func() bool { w,ok:=Window([]int{1,2},2,2); return ok && len(w)==0 }()',
      'Un intervalo vacío al final es válido.',
      'start == end está permitido.',
    ),
  ],
  hints: [
    'Primero comprobá start < 0.',
    'end no puede ser menor que start ni mayor que len.',
    'La región válida se expresa con dos puntos.',
  ],
  review: {
    success:
      'Modelaste dos decisiones: si una región es válida y si comparte memoria. Una vista barata también permite que los cambios se propaguen.',
    pitfall: 'El extremo final queda fuera: [1:3] contiene posiciones 1 y 2.',
  },
  transfer: 'Ofrecé una variante que devuelva una copia de la ventana.',
  prediction: predict(
    'En []int{10,20,30}, el slice [1:1] tiene…',
    ['20 como único elemento', 'Largo cero', 'Índices inválidos'],
    1,
    'Un intervalo con inicio y fin iguales es vacío y válido.',
  ),
});

add(16, {
  title: 'El contador de visitas',
  intro:
    'Cada nombre necesita su propio contador. Un map asocia una clave con un valor; leer una clave ausente devuelve el cero del tipo del valor.',
  why: 'Ese cero permite incrementar frecuencias sin una rama para la primera aparición. Antes de escribir, el map sí debe estar inicializado.',
  objective: 'Contá cuántas veces aparece cada string; respetá mayúsculas y la cadena vacía.',
  instructions: ['Creá un map[string]int con make.', 'Incrementá la entrada de cada nombre.'],
  starter:
    'func Frequencies(names []string) map[string]int {\n    counts := make(map[string]int)\n    for _, name := range names { counts[name] = 1 }\n    return counts\n}',
  solution:
    'func Frequencies(names []string) map[string]int {\n    counts := make(map[string]int)\n    for _, name := range names { counts[name]++ }\n    return counts\n}',
  tests: [
    test(
      'Repetidos',
      'func() bool { m:=Frequencies([]string{"ana","luz","ana"}); return len(m)==2 && m["ana"]==2 && m["luz"]==1 }()',
      'Cada repetición suma una visita.',
      'Asignar 1 siempre borra el conteo anterior.',
    ),
    test(
      'Sin nombres',
      'len(Frequencies(nil)) == 0',
      'No crea una clave artificial.',
      'Una colección vacía produce cero entradas.',
    ),
    test(
      'Claves exactas',
      'func() bool { m:=Frequencies([]string{"A","a","",""}); return len(m)==3 && m[""]==2 && m["A"]==1 }()',
      'Las claves son sensibles a mayúsculas y permiten vacío.',
      'No normalices datos sin que el contrato lo pida.',
    ),
  ],
  hints: [
    'Una clave ausente se lee como 0.',
    'El operador ++ actualiza el contador.',
    'El map debe crearse antes de escribir.',
  ],
  review: {
    success:
      'Usaste un map como índice de frecuencias. Los tests consultan claves; no dependen del orden impredecible de iteración.',
    pitfall: 'Leer un map nil es posible; escribir en él provoca un panic.',
  },
  transfer: 'Contá palabras de una frase usando strings.Fields.',
  prediction: predict(
    'En make(map[string]int), leer m["nueva"] devuelve…',
    ['0', 'nil', 'Un panic'],
    0,
    'La lectura de una clave ausente devuelve el valor cero del tipo int.',
  ),
});
add(17, {
  title: 'Cero no es ausencia',
  kind: 'reparar',
  intro:
    'Un inventario puede tener un producto registrado con stock cero. Si interpretás ese cero como ausencia, confundís dos estados diferentes.',
  why: 'La lectura value, ok := m[key] informa tanto el valor como la existencia de la clave. Esa segunda respuesta evita inventar valores centinela.',
  objective: 'Devolvé el valor y la presencia real de key en un map.',
  instructions: ['Usá la lectura con dos resultados.', 'Debe funcionar también con un map nil.'],
  starter:
    'func Lookup(stock map[string]int, key string) (int, bool) {\n    n := stock[key]\n    return n, n != 0\n}',
  solution:
    'func Lookup(stock map[string]int, key string) (int, bool) {\n    n, ok := stock[key]\n    return n, ok\n}',
  tests: [
    test(
      'Stock positivo',
      'func() bool { n,ok:=Lookup(map[string]int{"chip":3},"chip"); return n==3 && ok }()',
      'Devuelve un dato existente.',
      'La firma requiere valor y presencia.',
    ),
    test(
      'Agotado pero registrado',
      'func() bool { n,ok:=Lookup(map[string]int{"chip":0},"chip"); return n==0 && ok }()',
      'Cero es un stock legítimo.',
      'La existencia no puede deducirse del número.',
    ),
    test(
      'Ausente y nil',
      'func() bool { n,ok:=Lookup(nil,"chip"); return n==0 && !ok }()',
      'Un map nil no contiene claves.',
      'Leer un map nil no requiere make.',
    ),
  ],
  hints: [
    'm[key] puede producir dos resultados.',
    'El segundo resultado tiene tipo bool.',
    'Retorná ambos sin inferir presencia a partir de n.',
  ],
  review: {
    success:
      'Ahora el inventario diferencia “agotado” de “desconocido”. Es una decisión de modelo de datos con consecuencias visibles en la interfaz.',
    pitfall: 'El valor cero por sí solo no describe si una clave existe.',
  },
  transfer: 'Decidí qué mensaje mostraría tu interfaz para cada estado.',
  prediction: predict(
    'Si m["x"] = 0, la lectura n, ok := m["x"] produce…',
    ['0, false', '0, true', 'nil, true'],
    1,
    'ok indica presencia, independiente del valor almacenado.',
  ),
});
add(18, {
  title: 'Un reporte reproducible',
  kind: 'reparar',
  imports: ['sort'],
  intro:
    'El reporte de claves cambia de orden entre ejecuciones. Los maps no prometen un orden de recorrido; un reporte estable debe establecerlo explícitamente.',
  why: 'Separar recolección y ordenamiento evita depender de un comportamiento accidental. Así los usuarios y los tests observan el mismo orden.',
  objective: 'Devolvé todas las claves del map ordenadas lexicográficamente.',
  instructions: [
    'Recorré las claves y agregalas a un slice.',
    'Usá sort.Strings antes de devolverlo.',
  ],
  starter:
    'func SortedKeys(values map[string]int) []string {\n    keys := make([]string, 0, len(values))\n    for k := range values { keys = append(keys, k) }\n    sort.Sort(sort.Reverse(sort.StringSlice(keys)))\n    return keys\n}',
  solution:
    'func SortedKeys(values map[string]int) []string {\n    keys := make([]string, 0, len(values))\n    for k := range values { keys = append(keys, k) }\n    sort.Strings(keys)\n    return keys\n}',
  tests: [
    test(
      'Orden ascendente',
      'fmt.Sprint(SortedKeys(map[string]int{"z":1,"b":2,"a":3})) == "[a b z]"',
      'El orden debe declararse, no depender del map.',
      'Ordená ascendente.',
    ),
    test(
      'Sin claves',
      'len(SortedKeys(nil)) == 0',
      'El caso vacío no debe fallar.',
      'make con longitud cero es suficiente.',
    ),
    test(
      'Mismo resultado y fuente intacta',
      'func() bool { m:=map[string]int{"a":9,"B":2}; r:=SortedKeys(m); return len(r)==2 && r[0]=="B" && r[1]=="a" && len(m)==2 && m["a"]==9 }()',
      'Define orden de strings, no orden alfabético de un idioma.',
      'En este orden B precede a a; no cambies las claves.',
    ),
  ],
  hints: [
    'El starter ordena al revés a propósito.',
    'sort.Strings modifica el slice recibido.',
    'No hace falta cambiar el map.',
  ],
  review: {
    success:
      'Agregaste determinismo en el límite de presentación. El orden de strings no implementa reglas de diccionario de cada idioma.',
    pitfall: 'Un test que a veces pasa por casualidad no prueba que range ordene claves.',
  },
  transfer: 'Ordená por cantidad y usá la clave para desempatar.',
  prediction: predict(
    '¿Qué orden garantiza range sobre un map?',
    ['Inserción', 'Alfabético', 'Ninguno específico'],
    2,
    'Si el orden importa, construí y ordená una secuencia.',
  ),
  sources: [
    { title: 'Maps en Go', url: 'https://go.dev/blog/maps' },
    { title: 'sort.Strings', url: 'https://pkg.go.dev/sort#Strings' },
  ],
});
add(19, {
  title: 'Los bytes no son letras',
  kind: 'reparar',
  intro:
    'El contador de texto parece funcionar hasta que alguien escribe “ñ” o un emoji. len de un string mide bytes. Acá queremos contar puntos de código Unicode.',
  why: 'range decodifica el texto UTF-8 en runes. Una rune no equivale siempre a un carácter visual: algunas grafías combinan varios puntos de código.',
  objective: 'Contá runes de un string UTF-8 válido, sin confundirlas con bytes ni grafemas.',
  instructions: ['Recorré el string con range.', 'Sumá una unidad por cada iteración.'],
  starter: 'func RuneCount(text string) int {\n    return len(text)\n}',
  solution:
    'func RuneCount(text string) int {\n    count := 0\n    for range text { count++ }\n    return count\n}',
  tests: [
    test(
      'ASCII y vacío',
      'RuneCount("Go") == 2 && RuneCount("") == 0',
      'Preserva los casos sencillos.',
      'No agregues un conteo fijo por cadena.',
    ),
    test(
      'Unicode multibyte',
      'RuneCount("niño🚀") == 5',
      'Una rune puede ocupar varios bytes.',
      'len(text) cuenta el almacenamiento, no los puntos de código.',
    ),
    test(
      'Acento combinado',
      'RuneCount("e\u0301") == 2',
      'Distingue runes de caracteres visuales.',
      'e y el acento combinado son dos puntos de código.',
    ),
  ],
  hints: [
    'No indexes bytes para este conteo.',
    'for range text recorre sus runes.',
    'Un acumulador iniciado en cero basta.',
  ],
  review: {
    success:
      'Elegiste la unidad de texto adecuada para este contrato. Contar caracteres que una persona percibe requeriría segmentar grafemas.',
    pitfall: 'len([]rune(s)) tampoco cuenta grafemas; cuenta runes.',
  },
  transfer: 'Compará bytes, runes y grafemas de un emoji compuesto.',
  prediction: predict(
    'Para "ñ", len(text) y RuneCount(text) son…',
    ['1 y 1', '2 y 1', '2 y 2'],
    1,
    'ñ ocupa dos bytes en UTF-8 y es un único punto de código.',
  ),
  sources: [{ title: 'Strings, bytes y runes', url: 'https://go.dev/blog/strings' }],
});
add(20, {
  title: 'Limpiar comandos con espacios reales',
  kind: 'reparar',
  imports: ['strings'],
  intro:
    'Un comando puede traer espacios repetidos, tabulaciones y saltos de línea. Queremos convertir sus campos en una etiqueta con guiones, conservando el texto de cada campo.',
  why: 'strings.Fields reconoce espacios en blanco y descarta grupos vacíos. Split con un espacio literal tiene otro contrato.',
  objective: 'Uní los campos separados por espacios en blanco mediante un único guion.',
  instructions: [
    'Obtené campos con strings.Fields.',
    'Unilos con strings.Join y el separador "-".',
  ],
  starter:
    'func Label(text string) string {\n    return strings.Join(strings.Split(text, " "), "-")\n}',
  solution:
    'func Label(text string) string {\n    return strings.Join(strings.Fields(text), "-")\n}',
  tests: [
    test(
      'Espacios repetidos',
      'Label("  motor   Go  ") == "motor-Go"',
      'Elimina campos vacíos.',
      'Split conserva vacíos alrededor de separadores.',
    ),
    test(
      'Tabulaciones y salto',
      'Label("uno\\tdos\\ntres") == "uno-dos-tres"',
      'No todo separador es un espacio ASCII.',
      'Fields reconoce diferentes espacios en blanco.',
    ),
    test(
      'Sólo blanco y Unicode',
      'Label(" \\t\\n") == "" && Label("niño azul") == "niño-azul"',
      'Vacío y Unicode deben conservar un resultado coherente.',
      'No modifiques bytes dentro de los campos.',
    ),
  ],
  hints: [
    'Buscá una función que agrupe por whitespace.',
    'Fields devuelve []string.',
    'Join recompone los campos con el nuevo separador.',
  ],
  review: {
    success:
      'Elegiste una API por su significado y evitaste escribir un parser manual. Esta etiqueta conserva mayúsculas y signos porque el contrato no pide quitarlos.',
    pitfall:
      'Esta transformación no es un parser de comillas ni una normalización completa de URLs.',
  },
  transfer: 'Definí qué debería ocurrir con un campo entre comillas.',
  prediction: predict(
    'strings.Fields(" a  b ") produce…',
    ['["", "a", "", "b", ""]', '["a", "b"]', '[" a  b "]'],
    1,
    'Descarta espacios en los extremos y agrupa secuencias de espacios.',
  ),
  sources: [{ title: 'strings.Fields y Join', url: 'https://pkg.go.dev/strings#Fields' }],
});

add(21, {
  title: 'Datos que viajan juntos',
  intro:
    'Un pedido necesita precio unitario y cantidad. Un struct les da nombres y permite transportarlos como una sola unidad con significado.',
  why: 'Los campos se leen con el selector punto. Nombrarlos reduce la posibilidad de confundir parámetros enteros que representan cosas distintas.',
  objective: 'Calculá el total de un Item usando Price y Quantity.',
  instructions: [
    'Conservá el struct Item.',
    'Multiplicá sus dos campos; son cantidades pequeñas y no negativas.',
  ],
  starter:
    'type Item struct {\n    Price int\n    Quantity int\n}\nfunc Cost(item Item) int {\n    return item.Price\n}',
  solution:
    'type Item struct {\n    Price int\n    Quantity int\n}\nfunc Cost(item Item) int {\n    return item.Price * item.Quantity\n}',
  tests: [
    test(
      'Pedido múltiple',
      'Cost(Item{Price:7,Quantity:4}) == 28',
      'Ambos campos intervienen.',
      'El precio unitario no es el total.',
    ),
    test(
      'Sin unidades',
      'Cost(Item{Price:9}) == 0',
      'Un campo omitido usa su valor cero.',
      'Quantity es cero si no se especifica.',
    ),
    test(
      'Entrada por valor',
      'func() bool { i:=Item{Price:3,Quantity:2}; n:=Cost(i); return n==6 && i.Price==3 && i.Quantity==2 }()',
      'El cálculo no necesita modificar el pedido.',
      'Devolvé una cuenta, no alteres los campos.',
    ),
  ],
  hints: [
    'Se accede con item.Price.',
    'La cantidad está en item.Quantity.',
    'La fórmula es precio por cantidad.',
  ],
  review: {
    success:
      'Agrupaste valores relacionados y escribiste una operación sobre ellos. Los literales con nombres de campos facilitan revisar qué representa cada número.',
    pitfall:
      'Un struct puede copiarse; eso no garantiza una copia profunda de campos que contengan slices o maps.',
  },
  transfer: 'Agregá un descuento definido explícitamente en centavos.',
  prediction: predict(
    'Item{Price:5} deja Quantity en…',
    ['1', 'nil', '0'],
    2,
    'El campo int omitido recibe su valor cero.',
  ),
});
add(22, {
  title: 'Modificar el contador original',
  kind: 'reparar',
  intro:
    'Una función recibe la dirección de un contador porque debe actualizar el original. Reemplazar el puntero local no escribe en la posición a la que apuntaba.',
  why: '*p accede al valor señalado; p es el puntero. Distinguir esos dos niveles evita modificar una copia o cambiar solamente una referencia local.',
  objective: 'Agregá delta al valor apuntado por p; si p es nil, no hagas nada.',
  instructions: ['Comprobá nil antes de desreferenciar.', 'Actualizá *p en vez de reemplazar p.'],
  starter:
    'func Add(p *int, delta int) {\n    if p == nil { return }\n    n := *p + delta\n    p = &n\n}',
  solution: 'func Add(p *int, delta int) {\n    if p == nil { return }\n    *p += delta\n}',
  tests: [
    test(
      'Cambia el original',
      'func() bool { n:=8; Add(&n,3); return n==11 }()',
      'La actualización debe verse fuera de la función.',
      'Asignar p = &n sólo modifica el puntero local.',
    ),
    test(
      'Delta negativo',
      'func() bool { n:=3; Add(&n,-5); return n == -2 }()',
      'La misma operación admite decrementos.',
      'No descartes deltas negativos.',
    ),
    test(
      'Puntero ausente',
      'func() bool { Add(nil,4); return true }()',
      'El contrato define nil como una operación vacía.',
      'No leas *p antes de comprobar nil.',
    ),
  ],
  hints: [
    'p == nil detecta falta de dirección.',
    '*p representa el dato original.',
    'La operación buscada es *p += delta.',
  ],
  review: {
    success:
      'La modificación viajó hasta el dato del llamador. El contrato también define qué hacer cuando no hay dirección disponible.',
    pitfall:
      'Go pasa argumentos por valor, incluidos los punteros; la copia del puntero sigue señalando el mismo dato.',
  },
  transfer: 'Cambiá la firma para informar si la actualización pudo realizarse.',
  prediction: predict(
    'Si p apunta a n, escribir *p = 9 modifica…',
    ['n', 'Sólo el puntero p', 'Ningún valor fuera de Add'],
    0,
    'La desreferencia selecciona el almacenamiento señalado por p.',
  ),
});
add(23, {
  title: 'Mover una copia del explorador',
  kind: 'reparar',
  intro:
    'Queremos calcular la próxima posición sin alterar la actual. Un método con receptor por valor trabaja sobre su propia copia del struct.',
  why: 'Devolver esa copia modificada hace explícita la transformación. El llamador elige si reemplaza la posición vieja o conserva ambas.',
  objective: 'Moved(dx, dy) devuelve una nueva Position desplazada y conserva el original.',
  instructions: ['Usá un receptor Position por valor.', 'Modificá la copia y retornala.'],
  starter:
    'type Position struct { X, Y int }\nfunc (p *Position) Moved(dx, dy int) Position {\n    p.X += dx\n    p.Y += dy\n    return *p\n}',
  solution:
    'type Position struct { X, Y int }\nfunc (p Position) Moved(dx, dy int) Position {\n    p.X += dx\n    p.Y += dy\n    return p\n}',
  tests: [
    test(
      'Movimiento',
      'func() bool { p:=Position{2,3}; q:=p.Moved(5,-1); return q.X==7 && q.Y==2 }()',
      'La copia debe incorporar ambos ejes.',
      'No olvides aplicar dy.',
    ),
    test(
      'Original intacto',
      'func() bool { p:=Position{2,3}; _=p.Moved(5,1); return p.X==2 && p.Y==3 }()',
      'El receptor debe tener semántica de copia.',
      'Un receptor *Position permite cambiar el original.',
    ),
    test(
      'Movimiento nulo',
      'func() bool { p:=Position{-4,0}; q:=p.Moved(0,0); return q==p }()',
      'Sin desplazamiento ambas posiciones coinciden.',
      'Conservá las coordenadas iniciales.',
    ),
  ],
  hints: ['Quitá el * del receptor.', 'p será una copia local.', 'El return devuelve p, ya no *p.'],
  review: {
    success:
      'Modelaste una transformación que conserva el estado previo. Los campos int hacen que esta copia sea suficiente para aislar la posición.',
    pitfall:
      'Cambiar a receptor por valor no copia profundamente mapas o slices dentro de un struct.',
  },
  transfer: 'Agregá una operación DistanceSquared que no modifique posiciones.',
  prediction: predict(
    'Un receptor p Position con campos int recibe…',
    ['Una copia del struct', 'Siempre un alias', 'Un puntero nil'],
    0,
    'El receptor por valor tiene sus propios campos escalares.',
  ),
});
add(24, {
  title: 'El método que olvidaba cada incremento',
  kind: 'reparar',
  intro:
    'Un contador expone un método Increment, pero su valor nunca cambia. El método actual incrementa un receptor copiado que desaparece al terminar.',
  why: 'Un receptor puntero expresa que la operación modifica la instancia. Para una variable direccionable, Go permite llamar c.Increment() cómodamente.',
  objective: 'Hacé que Increment actualice Count de la instancia original.',
  instructions: [
    'Conservá el nombre y el campo Count.',
    'Cambiá el receptor al tipo adecuado para mutación; se invoca sobre instancias válidas.',
  ],
  starter: 'type Counter struct { Count int }\nfunc (c Counter) Increment() {\n    c.Count++\n}',
  solution: 'type Counter struct { Count int }\nfunc (c *Counter) Increment() {\n    c.Count++\n}',
  tests: [
    test(
      'Primer incremento',
      'func() bool { c:=Counter{}; c.Increment(); return c.Count==1 }()',
      'El cero útil debe pasar a uno.',
      'El receptor por valor descarta el cambio.',
    ),
    test(
      'Incrementos acumulados',
      'func() bool { c:=Counter{Count:5}; c.Increment(); c.Increment(); return c.Count==7 }()',
      'Cada llamada parte del estado actualizado.',
      'No asignes siempre 1.',
    ),
    test(
      'Instancias separadas',
      'func() bool { a:=Counter{}; b:=Counter{}; a.Increment(); return a.Count==1 && b.Count==0 }()',
      'El estado pertenece a cada objeto.',
      'No uses una variable global para el conteo.',
    ),
  ],
  hints: [
    'El cambio necesario está en la firma.',
    'El receptor puede ser *Counter.',
    'c.Count++ funciona también con receptor puntero.',
  ],
  review: {
    success:
      'La firma ahora refleja el efecto de la operación. Mutar una instancia y devolver una copia son contratos diferentes, ambos útiles.',
    pitfall: 'Los métodos con receptor puntero influyen en qué tipos satisfacen una interfaz.',
  },
  transfer: 'Contrastá Increment con una operación Next que devuelva otra instancia.',
  prediction: predict(
    '¿Por qué no funcionaba c Counter?',
    ['Count no puede cambiar', 'Incrementaba una copia', 'Faltaba exportar Increment'],
    1,
    'El método mutaba su receptor local, no el contador original.',
  ),
});
add(25, {
  title: 'Snapshot de una ficha con etiquetas',
  kind: 'reparar',
  intro:
    'Una ficha contiene un nombre y un slice de etiquetas. Copiar el struct preserva el nombre, pero el slice copiado todavía puede compartir su array.',
  why: 'Una copia profunda depende de la estructura de los datos. Acá alcanza copiar el slice de strings, porque los strings son inmutables.',
  objective: 'Cloná Note aislando su slice Tags; aceptá Tags nil.',
  instructions: [
    'Copiá los campos escalares mediante el valor del struct.',
    'Reservá y copiá un slice propio para Tags.',
  ],
  starter:
    'type Note struct {\n    Title string\n    Tags []string\n}\nfunc Snapshot(n Note) Note {\n    return n\n}',
  solution:
    'type Note struct {\n    Title string\n    Tags []string\n}\nfunc Snapshot(n Note) Note {\n    tags := make([]string, len(n.Tags))\n    copy(tags, n.Tags)\n    n.Tags = tags\n    return n\n}',
  tests: [
    test(
      'Mismos datos',
      'func() bool { n:=Snapshot(Note{"Guía",[]string{"go","redes"}}); return n.Title=="Guía" && fmt.Sprint(n.Tags)=="[go redes]" }()',
      'Una instantánea conserva el contenido.',
      'No olvides copiar elementos al nuevo slice.',
    ),
    test(
      'Edición independiente',
      'func() bool { a:=Note{"A",[]string{"original"}}; b:=Snapshot(a); if len(b.Tags)!=1{return false}; b.Tags[0]="editada"; b.Title="B"; return a.Title=="A" && a.Tags[0]=="original" }()',
      'El campo compuesto requiere su propia copia.',
      'Copiar sólo n deja Tags compartido.',
    ),
    test(
      'Sin etiquetas',
      'func() bool { n:=Snapshot(Note{Title:"Vacía"}); return n.Title=="Vacía" && len(n.Tags)==0 }()',
      'La ausencia de elementos no es un error.',
      'No indexes Tags durante la copia.',
    ),
  ],
  hints: [
    'make([]string, len(n.Tags)) crea un array nuevo.',
    'copy(destino, origen) preserva el orden.',
    'Asigná el destino a n.Tags y devolvé n.',
  ],
  review: {
    success:
      'Identificaste qué nivel requería independencia. Copia profunda no es una instrucción universal: depende de qué contiene cada campo.',
    pitfall:
      'Si Tags contuviera punteros a objetos mutables, copiar el slice aún compartiría esos objetos.',
  },
  transfer: 'Dibujá qué parte se compartiría en un struct con map[string][]int.',
  prediction: predict(
    'Si copiás un struct que tiene []string, inicialmente se copian…',
    [
      'Todos sus arrays recursivamente',
      'Los valores de campos, incluido el descriptor del slice',
      'Sólo los nombres de campos',
    ],
    1,
    'La copia del descriptor sigue señalando el mismo array hasta que crees uno distinto.',
  ),
});

add(26, {
  title: 'Un error que el llamador puede atender',
  imports: ['errors'],
  intro:
    'Un bool permite avisar que una cuenta falló, pero no explica la causa. La convención (valor, error) entrega un resultado o información sobre el problema.',
  why: 'El error se devuelve como un valor. El llamador decide si lo muestra, lo registra o intenta una alternativa; un caso esperable no necesita panic.',
  objective: 'Dividí dos enteros y devolvé un error si el divisor es cero.',
  instructions: [
    'En el caso inválido devolvé 0 y errors.New con un mensaje.',
    'En el caso válido devolvé el cociente y nil.',
  ],
  starter: 'func Quotient(a, b int) (int, error) {\n    return 0, errors.New("pendiente")\n}',
  solution:
    'func Quotient(a, b int) (int, error) {\n    if b == 0 { return 0, errors.New("divisor cero") }\n    return a / b, nil\n}',
  tests: [
    test(
      'Camino feliz',
      'func() bool { n,err:=Quotient(12,3); return n==4 && err==nil }()',
      'Un resultado correcto se acompaña de nil.',
      'No devuelvas un error cuando la operación funciona.',
    ),
    test(
      'Error esperado',
      'func() bool { n,err:=Quotient(9,0); return n==0 && err!=nil && err.Error()!="" }()',
      'El error debe existir y aportar un mensaje.',
      'Comprobá el divisor antes de calcular.',
    ),
    test(
      'Resultado negativo',
      'func() bool { n,err:=Quotient(-7,2); return n == -3 && err==nil }()',
      'Negativo no significa inválido.',
      'La división entera trunca hacia cero.',
    ),
  ],
  hints: [
    'El único divisor inválido en este contrato es cero.',
    'errors.New recibe una explicación en string.',
    'nil representa ausencia de error.',
  ],
  review: {
    success:
      'Separaste la salida de negocio de la explicación del fallo. El llamador puede tratar el error sin interrumpir todo el programa.',
    pitfall: 'No ignores err solamente porque el valor devuelto parece utilizable.',
  },
  transfer: 'Agregá contexto al error desde una función que llame a Quotient.',
  prediction: predict(
    'Si err != nil, lo primero que conviene hacer es…',
    ['Usar el cociente sin mirar', 'Elegir cómo manejar el fallo', 'Terminar siempre con panic'],
    1,
    'Devolver un error deja la decisión de recuperación al llamador.',
  ),
  sources: [
    { title: 'Devolver y manejar errores', url: 'https://go.dev/doc/tutorial/handle-errors' },
  ],
});
add(27, {
  title: 'El puerto tiene dos validaciones',
  kind: 'reparar',
  imports: ['strconv'],
  intro:
    'Una configuración puede fallar porque no es un número o porque es un número fuera del rango permitido. Son etapas distintas: interpretar y validar.',
  why: 'strconv.Atoi informa errores de conversión. Después, tu aplicación agrega su propia regla: acá sólo aceptamos puertos entre 1 y 65535.',
  objective: 'Parseá un puerto decimal y rechazá texto inválido o valores fuera de 1..65535.',
  instructions: [
    'Propagá el error de strconv.Atoi.',
    'Si el número está fuera de rango, devolvé 0 y un error descriptivo.',
  ],
  starter: 'func ParsePort(text string) (int, error) {\n    return strconv.Atoi(text)\n}',
  solution:
    'func ParsePort(text string) (int, error) {\n    port, err := strconv.Atoi(text)\n    if err != nil { return 0, err }\n    if port < 1 || port > 65535 { return 0, fmt.Errorf("puerto fuera de rango: %d", port) }\n    return port, nil\n}',
  tests: [
    test(
      'Puertos permitidos',
      'func() bool { a,e:=ParsePort("8080"); b,f:=ParsePort("65535"); return a==8080 && e==nil && b==65535 && f==nil }()',
      'Incluye una entrada común y el máximo.',
      'El extremo 65535 está permitido.',
    ),
    test(
      'Texto inválido',
      'func() bool { n,e:=ParsePort("http"); return n==0 && e!=nil }()',
      'La conversión debe fallar de manera explícita.',
      'No descartes el error de Atoi.',
    ),
    test(
      'Número fuera de rango',
      'func() bool { a,e:=ParsePort("0"); b,f:=ParsePort("65536"); return a==0 && b==0 && e!=nil && f!=nil }()',
      'Ser entero no basta para cumplir el contrato.',
      'Aplicá ambas cotas después de convertir.',
    ),
  ],
  hints: [
    'Recibí port y err de Atoi.',
    'Atendé primero err != nil.',
    'La condición inválida usa port < 1 || port > 65535.',
  ],
  review: {
    success:
      'Separaste validez sintáctica y semántica. Esta función elige un contrato de configuración; otros usos de redes pueden dar un significado especial al puerto cero.',
    pitfall:
      'No confundas una regla de tu aplicación con una prohibición universal del sistema operativo.',
  },
  transfer: 'Agregá un mensaje diferente para texto vacío sin aceptar silenciosamente un puerto.',
  prediction: predict(
    'Atoi("70000") funciona. ¿ParsePort debe aceptarlo?',
    ['Sí, porque es entero', 'No, excede el rango elegido', 'Sólo si tiene cinco dígitos'],
    1,
    'Convertir correctamente no garantiza que el número sea válido para este dominio.',
  ),
  sources: [{ title: 'strconv.Atoi', url: 'https://pkg.go.dev/strconv#Atoi' }],
});
add(28, {
  title: 'Contexto sin perder la causa',
  kind: 'reparar',
  imports: ['errors', 'strings'],
  intro:
    'Querés explicar qué clave faltó, pero también permitir que el llamador reconozca ErrMissing. Convertir el error solamente a texto pierde esa relación.',
  why: 'fmt.Errorf con %w conserva un error envuelto. errors.Is puede buscar la causa aunque el mensaje incorpore contexto adicional.',
  objective: 'Cuando una clave no existe, devolvé un error con contexto que envuelva ErrMissing.',
  instructions: [
    'Conservá el error centinela ErrMissing.',
    'Usá %w al construir el error de ausencia; un valor vacío existente es válido.',
  ],
  starter:
    'var ErrMissing = errors.New("clave ausente")\nfunc ReadValue(data map[string]string, key string) (string, error) {\n    value, ok := data[key]\n    if !ok { return "", fmt.Errorf("leer %q: %v", key, ErrMissing) }\n    return value, nil\n}',
  solution:
    'var ErrMissing = errors.New("clave ausente")\nfunc ReadValue(data map[string]string, key string) (string, error) {\n    value, ok := data[key]\n    if !ok { return "", fmt.Errorf("leer %q: %w", key, ErrMissing) }\n    return value, nil\n}',
  tests: [
    test(
      'Causa reconocible',
      'func() bool { _,e:=ReadValue(nil,"secreto"); return errors.Is(e,ErrMissing) }()',
      'El llamador debe identificar la causa sin analizar texto.',
      'Usá %w, no %v.',
    ),
    test(
      'Contexto adicional',
      'func() bool { _,e:=ReadValue(nil,"tema"); return e!=nil && strings.Contains(e.Error(),"tema") && errors.Is(e,ErrMissing) }()',
      'La explicación debe conservar la causa y nombrar la clave.',
      'Devolver sólo ErrMissing pierde qué clave se estaba leyendo.',
    ),
    test(
      'Valor vacío legítimo',
      'func() bool { v,e:=ReadValue(map[string]string{"x":""},"x"); return v=="" && e==nil }()',
      'Vacío y ausente siguen siendo estados distintos.',
      'Consultá ok, no v == "".',
    ),
  ],
  hints: [
    'El cambio principal es un verbo de formato.',
    '%v muestra; %w envuelve.',
    'errors.Is atraviesa los errores envueltos.',
  ],
  review: {
    success:
      'El error sirve tanto a una persona como al código que decide cómo recuperarse. Agregar contexto ya no destruye su identidad.',
    pitfall:
      'Comparar mensajes completos hace frágil el manejo de errores frente a cambios de redacción.',
  },
  transfer: 'Envolvé otra vez el error desde una capa superior y comprobá errors.Is.',
  prediction: predict(
    '¿Cuál permite buscar ErrMissing a través de contexto?',
    ['err.Error() == "clave ausente"', 'errors.Is(err, ErrMissing)', 'err == nil'],
    1,
    'errors.Is inspecciona la cadena o árbol de errores envueltos.',
  ),
});
add(29, {
  title: 'Errores con datos útiles',
  imports: ['errors'],
  intro:
    'Una subida excedió el límite. El llamador necesita el tamaño recibido y el máximo para explicar cuánto sobra, sin extraer números de una frase.',
  why: 'error es una interfaz. Un tipo propio puede implementar Error() y conservar campos estructurados que errors.As permite recuperar.',
  objective: 'Devolvé *LimitError con Got y Max cuando size > max; en otro caso nil.',
  instructions: [
    'Conservá el tipo y su método Error.',
    'Retorná un puntero al error solamente cuando se exceda el límite.',
  ],
  starter:
    'type LimitError struct { Got, Max int }\nfunc (e *LimitError) Error() string {\n    return fmt.Sprintf("tamaño %d supera %d", e.Got, e.Max)\n}\nfunc CheckSize(size, max int) error {\n    return nil\n}',
  solution:
    'type LimitError struct { Got, Max int }\nfunc (e *LimitError) Error() string {\n    return fmt.Sprintf("tamaño %d supera %d", e.Got, e.Max)\n}\nfunc CheckSize(size, max int) error {\n    if size > max { return &LimitError{Got:size, Max:max} }\n    return nil\n}',
  tests: [
    test(
      'Datos recuperables',
      'func() bool { var e *LimitError; ok:=errors.As(CheckSize(14,10), &e); return ok && e.Got==14 && e.Max==10 }()',
      'El error debe conservar sus campos, no sólo texto.',
      'Devolvé &LimitError con ambos valores.',
    ),
    test(
      'Exactamente al límite',
      'CheckSize(10,10) == nil && CheckSize(0,10) == nil',
      'El límite es inclusivo.',
      'La condición es >, no >=.',
    ),
    test(
      'A través de contexto',
      'func() bool { root:=CheckSize(7,3); if root==nil{return false}; wrapped:=fmt.Errorf("subir: %w",root); var e *LimitError; return errors.As(wrapped,&e) && e.Got-e.Max==4 }()',
      'El tipo puede recuperarse incluso envuelto.',
      'No conviertas el error estructurado a una cadena suelta.',
    ),
  ],
  hints: [
    'Creá &LimitError{Got: size, Max: max}.',
    'El error sólo se necesita cuando size > max.',
    'El camino válido termina en nil.',
  ],
  review: {
    success:
      'El error ahora transporta una explicación y datos reutilizables. errors.Is pregunta por una causa; errors.As busca un tipo compatible.',
    pitfall:
      'La variable destino de errors.As debe permitir que la función escriba el error encontrado.',
  },
  transfer: 'Usá Got-Max para mostrar cuánto debería reducirse una subida.',
  prediction: predict(
    'Para acceder a campos de un error tipado envuelto conviene…',
    ['Partir Error() con Split', 'errors.As', 'Ignorar el wrapper'],
    1,
    'errors.As encuentra el error del tipo solicitado y lo guarda en el destino.',
  ),
});
add(30, {
  title: 'Una fila mala no es un total parcial',
  kind: 'reparar',
  imports: ['strconv', 'strings'],
  intro:
    'Un lote de números alimenta una métrica. El contrato exige todo o nada: si una fila no se interpreta, no queremos presentar una suma incompleta como si fuera definitiva.',
  why: 'Atender el error dentro del recorrido conserva la ubicación del fallo. Retornar cero y error hace explícito que el agregado completo no está disponible.',
  objective:
    'Sumá enteros decimales; ante el primer error devolvé 0 y un error que indique su índice empezando en cero.',
  instructions: [
    'Usá strconv.Atoi por cada elemento.',
    'Envolvé el fallo con el texto "posición N" y %w.',
  ],
  starter:
    'func SumText(values []string) (int, error) {\n    total := 0\n    for _, text := range values {\n        n, _ := strconv.Atoi(text)\n        total += n\n    }\n    return total, nil\n}',
  solution:
    'func SumText(values []string) (int, error) {\n    total := 0\n    for i, text := range values {\n        n, err := strconv.Atoi(text)\n        if err != nil { return 0, fmt.Errorf("posición %d: %w", i, err) }\n        total += n\n    }\n    return total, nil\n}',
  tests: [
    test(
      'Lote completo',
      'func() bool { n,e:=SumText([]string{"7","-2","4"}); return n==9 && e==nil }()',
      'Los valores válidos se suman con signo.',
      'No rechaces enteros negativos.',
    ),
    test(
      'Fallo en el medio',
      'func() bool { n,e:=SumText([]string{"8","oops","2"}); return n==0 && e!=nil && strings.Contains(e.Error(),"posición 1") }()',
      'Evita un total parcial y conserva la ubicación.',
      'El índice empieza en cero; la fila mala es la 1.',
    ),
    test(
      'Lote vacío',
      'func() bool { n,e:=SumText(nil); return n==0 && e==nil }()',
      'Un lote sin elementos es una suma válida de cero.',
      'Vacío no equivale a texto inválido.',
    ),
  ],
  hints: [
    'No reemplaces err con _.',
    'El índice sale del primer valor de range.',
    'El return del error debe devolver 0, no total.',
  ],
  review: {
    success:
      'La función evita éxito silencioso ante datos corruptos. Elegiste un contrato transaccional para la salida; otros dominios podrían necesitar un resultado parcial explícito.',
    pitfall:
      'Descartar errores de conversión puede transformar datos rotos en ceros aparentemente válidos.',
  },
  transfer: 'Diseñá otra firma para recolectar todos los errores del lote.',
  prediction: predict(
    'Si falla el segundo elemento, según este contrato devolvemos…',
    ['El primer subtotal y nil', '0 y un error con posición 1', 'La suma de los demás'],
    1,
    'El contrato todo-o-nada considera inválido el agregado completo.',
  ),
  sources: [
    { title: 'strconv.Atoi', url: 'https://pkg.go.dev/strconv#Atoi' },
    { title: 'Formato de errores', url: 'https://pkg.go.dev/fmt#Errorf' },
  ],
});

add(31, {
  title: 'Una capacidad, dos implementaciones',
  intro:
    'El planificador calcula espacio para figuras distintas. Sólo le interesa que cada figura sepa entregar su área, no cómo guarda sus dimensiones.',
  why: 'Una interfaz pequeña describe el comportamiento requerido. Los tipos la satisfacen implementando los métodos, sin declarar una relación de herencia.',
  objective: 'Sumá Area() de todas las figuras recibidas.',
  instructions: [
    'Conservá la interfaz Shape y los tipos dados.',
    'Invocá el método de cada elemento sin preguntar su tipo concreto.',
  ],
  starter:
    'type Shape interface { Area() int }\ntype Square struct { Side int }\nfunc (s Square) Area() int { return s.Side * s.Side }\ntype Rectangle struct { Width, Height int }\nfunc (r Rectangle) Area() int { return r.Width * r.Height }\nfunc TotalArea(shapes []Shape) int {\n    return 0\n}',
  solution:
    'type Shape interface { Area() int }\ntype Square struct { Side int }\nfunc (s Square) Area() int { return s.Side * s.Side }\ntype Rectangle struct { Width, Height int }\nfunc (r Rectangle) Area() int { return r.Width * r.Height }\nfunc TotalArea(shapes []Shape) int {\n    total := 0\n    for _, shape := range shapes { total += shape.Area() }\n    return total\n}',
  tests: [
    test(
      'Tipos mezclados',
      'TotalArea([]Shape{Square{3},Rectangle{2,5}}) == 19',
      'El consumidor trabaja con la capacidad común.',
      'Llamá Area sobre cada Shape.',
    ),
    test(
      'Sin figuras',
      'TotalArea(nil) == 0',
      'El caso vacío usa un acumulador cero.',
      'No accedas al primer elemento directamente.',
    ),
    test(
      'Área cero y repetidas',
      'TotalArea([]Shape{Rectangle{0,8},Square{2},Square{2}}) == 8',
      'Cada figura aporta exactamente su área.',
      'No dedupliques ni supongas una única implementación.',
    ),
  ],
  hints: [
    'La interfaz promete Area() int.',
    'No necesitás un switch por tipos.',
    'El acumulador suma shape.Area().',
  ],
  review: {
    success:
      'El algoritmo depende de una capacidad pequeña. Un nuevo tipo con Area() puede participar sin editar TotalArea.',
    pitfall:
      'Una interfaz no transforma automáticamente un []Square en []Shape; los slices tienen tipos diferentes.',
  },
  transfer: 'Agregá un tercer tipo y usalo sin cambiar TotalArea.',
  prediction: predict(
    'Para que un tipo satisfaga Shape necesita…',
    ['Heredar explícitamente de Shape', 'Un método Area() int', 'Llamarse Shape'],
    1,
    'La satisfacción de interfaces es implícita y se basa en métodos.',
  ),
});
add(32, {
  title: 'Leer sin conocer el origen',
  imports: ['io', 'strings'],
  intro:
    'Tu función recibe io.Reader. Puede leer desde una cadena o desde otro origen compatible sin cambiar el algoritmo; acá usamos memoria para mantener el ejercicio aislado.',
  why: 'io.ReadAll consume un Reader y entrega bytes más error. La interfaz evita que tu función dependa de una fuente concreta.',
  objective: 'Leé todo un io.Reader y devolvé su texto; si falla, devolvé cadena vacía y el error.',
  instructions: [
    'Llamá io.ReadAll y atendé su error.',
    'Convertí los bytes a string sólo en el camino exitoso.',
  ],
  starter:
    'type BrokenReader struct{}\nfunc (BrokenReader) Read(p []byte) (int,error) { return 0, fmt.Errorf("fuente rota") }\nfunc ReadText(r io.Reader) (string,error) {\n    return "", nil\n}',
  solution:
    'type BrokenReader struct{}\nfunc (BrokenReader) Read(p []byte) (int,error) { return 0, fmt.Errorf("fuente rota") }\nfunc ReadText(r io.Reader) (string,error) {\n    data, err := io.ReadAll(r)\n    if err != nil { return "", err }\n    return string(data), nil\n}',
  tests: [
    test(
      'Texto Unicode',
      'func() bool { s,e:=ReadText(strings.NewReader("red 🚀")); return s=="red 🚀" && e==nil }()',
      'El contenido debe conservarse íntegro.',
      'Convertí los bytes recibidos, no el objeto Reader.',
    ),
    test(
      'Origen vacío',
      'func() bool { s,e:=ReadText(strings.NewReader("")); return s=="" && e==nil }()',
      'EOF normal no se trata como un fallo de ReadAll.',
      'El fin de una fuente vacía puede ser un éxito.',
    ),
    test(
      'Origen fallido',
      'func() bool { s,e:=ReadText(BrokenReader{}); return s=="" && e!=nil }()',
      'El consumidor no debe ocultar errores de la fuente.',
      'Propagá el error de ReadAll.',
    ),
  ],
  hints: [
    'io.ReadAll(r) devuelve []byte y error.',
    'El camino de error termina antes de convertir.',
    'string(data) construye el texto.',
  ],
  review: {
    success:
      'La misma función sirve para fuentes diferentes porque depende de una interfaz. En producción, leer todo requiere controlar el tamaño de entrada.',
    pitfall:
      'ReadAll puede devolver datos junto con un error; este contrato decide descartarlos explícitamente.',
  },
  transfer: 'Diseñá una variante que lea como máximo una cantidad elegida de bytes.',
  prediction: predict(
    'ReadAll al llegar normalmente a EOF devuelve…',
    ['Siempre io.EOF como error', 'Los datos y nil', 'Solamente nil'],
    1,
    'El fin normal de la entrada es éxito para ReadAll.',
  ),
  sources: [{ title: 'io.Reader y ReadAll', url: 'https://pkg.go.dev/io#ReadAll' }],
});
add(33, {
  title: 'Tu tipo aprende a presentarse',
  kind: 'reparar',
  intro:
    'Una duración interna se mide en milisegundos. Queremos que su representación incluya la unidad y que cualquier consumidor de fmt.Stringer pueda mostrarla.',
  why: 'Un tipo definido sobre int puede tener métodos propios. String() string declara cómo se representa sin cambiar la aritmética subyacente.',
  objective: 'Hacé que Millis implemente String() devolviendo el número seguido de "ms".',
  instructions: [
    'Usá fmt.Sprintf para conservar el valor y el signo.',
    'No cambies Render, que trabaja con fmt.Stringer.',
  ],
  starter:
    'type Millis int\nfunc (m Millis) String() string {\n    return "0ms"\n}\nfunc Render(value fmt.Stringer) string { return value.String() }',
  solution:
    'type Millis int\nfunc (m Millis) String() string {\n    return fmt.Sprintf("%dms", int(m))\n}\nfunc Render(value fmt.Stringer) string { return value.String() }',
  tests: [
    test(
      'Duración normal',
      'Render(Millis(125)) == "125ms"',
      'La representación conserva el valor.',
      'No retornes una etiqueta fija.',
    ),
    test(
      'Duración cero',
      'Render(Millis(0)) == "0ms"',
      'El cero también tiene unidad.',
      'No uses vacío como sinónimo de cero.',
    ),
    test(
      'Diferencia negativa',
      'Render(Millis(-7)) == "-7ms"',
      'El signo no se pierde.',
      'Convertí a int si querés formatear explícitamente su número.',
    ),
  ],
  hints: [
    'El formato necesita %d y ms.',
    'int(m) conserva el valor numérico.',
    'El método ya tiene la firma que exige Stringer.',
  ],
  review: {
    success:
      'El comportamiento pertenece al tipo y Render sólo necesita la interfaz. Una unidad explícita evita interpretar mal números aislados.',
    pitfall: 'Llamar a fmt.Sprint(m) dentro de String puede invocar el mismo método otra vez.',
  },
  transfer: 'Agregá otro tipo de medida que funcione con el mismo Render.',
  prediction: predict(
    '¿Qué método exige fmt.Stringer?',
    ['Render() string', 'String() string', 'Format() int'],
    1,
    'La interfaz define exactamente String() string.',
  ),
  sources: [{ title: 'fmt.Stringer', url: 'https://pkg.go.dev/fmt#Stringer' }],
});
add(34, {
  title: 'Preguntar por un tipo sin explotar',
  kind: 'reparar',
  intro:
    'Un evento trae un valor de tipo desconocido. Querés aceptar únicamente int y rechazar otros tipos sin provocar un panic.',
  why: 'La aserción de tipo con dos resultados responde con un valor y un bool. Pregunta por el tipo dinámico; no convierte automáticamente strings o float64.',
  objective: 'Devolvé el int contenido en value, o 0 y false cuando no sea int.',
  instructions: [
    'Usá value.(int) con dos variables a la izquierda.',
    'No parses strings ni conviertas otros números.',
  ],
  starter: 'func AsInt(value interface{}) (int, bool) {\n    return value.(int), true\n}',
  solution:
    'func AsInt(value interface{}) (int, bool) {\n    n, ok := value.(int)\n    return n, ok\n}',
  tests: [
    test(
      'Tipo esperado',
      'func() bool { n,ok:=AsInt(-8); return n == -8 && ok }()',
      'El int conserva su valor.',
      'El signo no cambia el tipo.',
    ),
    test(
      'String parecido',
      'func() bool { n,ok:=AsInt("8"); return n==0 && !ok }()',
      'Parecer un número no equivale a contener un int.',
      'La aserción no hace parsing.',
    ),
    test(
      'nil y float64',
      'func() bool { a,x:=AsInt(nil); b,y:=AsInt(float64(8)); return a==0 && !x && b==0 && !y }()',
      'Otros tipos se rechazan de forma segura.',
      'Usá la variante con ok para evitar panic.',
    ),
  ],
  hints: [
    'La aserción de un resultado puede fallar con panic.',
    'La variante n, ok := value.(int) es comprobable.',
    'Retorná ambos resultados.',
  ],
  review: {
    success:
      'Preguntaste por el tipo dinámico con un resultado explícito. Elegiste inspección de tipos, no conversión permisiva.',
    pitfall:
      'interface{} y any describen el mismo tipo; ninguno implica que cualquier operación sea válida sobre el valor.',
  },
  transfer: 'Agregá una función separada para convertir explícitamente texto a int.',
  prediction: predict(
    'AsInt(float64(8)) debería aceptar el dato…',
    ['Sí, porque no tiene decimales', 'No, el tipo dinámico es float64', 'Sólo en 64 bits'],
    1,
    'La aserción comprueba el tipo, no la equivalencia matemática.',
  ),
});
add(35, {
  title: 'El error nil que no era nil',
  kind: 'reparar',
  intro:
    'La función parece devolver un puntero nil cuando todo sale bien, pero el llamador ve err != nil. Una interfaz puede conservar un tipo dinámico aunque su puntero sea nil.',
  why: 'Una interfaz nil no contiene tipo ni valor. Envolver (*Problem)(nil) en error conserva el tipo *Problem, por lo que la interfaz no es nil.',
  objective: 'Validate(true) debe devolver nil real; Validate(false), un error con mensaje.',
  instructions: [
    'Retorná nil explícitamente cuando valid sea true.',
    'Creá *Problem solamente para el camino inválido.',
  ],
  starter:
    'type Problem struct { Message string }\nfunc (p *Problem) Error() string { return p.Message }\nfunc Validate(valid bool) error {\n    var problem *Problem\n    if !valid { problem = &Problem{Message:"inválido"} }\n    return problem\n}',
  solution:
    'type Problem struct { Message string }\nfunc (p *Problem) Error() string { return p.Message }\nfunc Validate(valid bool) error {\n    if !valid { return &Problem{Message:"inválido"} }\n    return nil\n}',
  tests: [
    test(
      'Éxito sin tipo escondido',
      'Validate(true) == nil',
      'El éxito requiere una interfaz nil auténtica.',
      'Retorná el literal nil, no un puntero tipado nil.',
    ),
    test(
      'Fallo informativo',
      'func() bool { e:=Validate(false); return e!=nil && e.Error()=="inválido" }()',
      'El error existente sí tiene un objeto válido.',
      'Creá un Problem cuando corresponda.',
    ),
    test(
      'Llamadas independientes',
      'func() bool { _=Validate(false); return Validate(true)==nil }()',
      'Un fallo previo no contamina un éxito siguiente.',
      'La decisión debe depender únicamente del parámetro actual.',
    ),
  ],
  hints: [
    'Distinguí *Problem de la interfaz error.',
    'El camino válido no necesita una variable tipada.',
    'Un return nil elimina tipo y valor dinámicos.',
  ],
  review: {
    success:
      'Diferenciaste nil como puntero de nil como interfaz. Esta distinción explica una clase frecuente de errores que parecen contradictorios.',
    pitfall: 'Invocar Error sobre un *Problem nil podría desreferenciar un puntero inexistente.',
  },
  transfer: 'Compará var e error con var p *Problem; var e error = p.',
  prediction: predict(
    'var p *Problem; var e error = p. ¿e == nil?',
    ['Sí, siempre', 'No, contiene el tipo *Problem', 'No compila'],
    1,
    'La interfaz guarda el tipo dinámico *Problem además del valor puntero nil.',
  ),
  sources: [
    {
      title: 'FAQ: por qué un error nil puede no ser nil',
      url: 'https://go.dev/doc/faq#nil_error',
    },
  ],
});

add(36, {
  title: 'Cerrar incluso si salís temprano',
  kind: 'reparar',
  intro:
    'Una operación recibió un recurso ya adquirido. Tanto el camino exitoso como el rechazo deben ejecutar una función de limpieza exactamente una vez.',
  why: 'defer registra una llamada que se ejecuta al salir de la función. Ponerla cerca del comienzo permite agregar retornos sin olvidar la limpieza.',
  objective: 'Invoke(valid, cleanup) devuelve valid y ejecuta cleanup una vez en ambos caminos.',
  instructions: [
    'Registrá cleanup con defer antes de decidir si valid es false.',
    'No la llames también de forma manual; cleanup siempre es una función válida.',
  ],
  starter:
    'func Invoke(valid bool, cleanup func()) bool {\n    if !valid { return false }\n    cleanup()\n    return true\n}',
  solution:
    'func Invoke(valid bool, cleanup func()) bool {\n    defer cleanup()\n    if !valid { return false }\n    return true\n}',
  tests: [
    test(
      'Camino normal',
      'func() bool { calls:=0; ok:=Invoke(true,func(){calls++}); return ok && calls==1 }()',
      'El camino exitoso también libera.',
      'La limpieza tiene que suceder exactamente una vez.',
    ),
    test(
      'Retorno temprano',
      'func() bool { calls:=0; ok:=Invoke(false,func(){calls++}); return !ok && calls==1 }()',
      'La guardia no debe saltarse la limpieza.',
      'Registrá defer antes del if.',
    ),
    test(
      'Dos invocaciones',
      'func() bool { calls:=0; close:=func(){calls++}; Invoke(false,close); Invoke(true,close); return calls==2 }()',
      'Cada adquisición lógica recibe una limpieza.',
      'No agregues llamadas manuales además del defer.',
    ),
  ],
  hints: [
    'defer cleanup() programa la llamada.',
    'Debe aparecer antes del retorno temprano.',
    'Quitá la llamada manual que quedaría duplicada.',
  ],
  review: {
    success:
      'Ambas salidas respetan el ciclo de vida del recurso. Los tests miden el efecto de cleanup; no inspeccionan si escribiste defer.',
    pitfall: 'defer espera el final de la función, no el final de un bloque cualquiera.',
  },
  transfer: 'Agregá otra validación temprana y comprobá que la limpieza siga ocurriendo.',
  prediction: predict(
    'Un defer registrado antes de return se ejecuta…',
    ['Después de cada línea', 'Al salir de la función', 'Sólo si se llega a la última línea'],
    1,
    'El registro de defer cubre los retornos posteriores de esa invocación.',
  ),
});
add(37, {
  title: 'Desarmar la torre al revés',
  intro:
    'Adquiriste recursos en un orden y necesitás liberarlos en el inverso. Los defer pendientes funcionan como una pila: el último registrado sale primero.',
  why: 'Pasar cada nombre como argumento fija su valor al registrar la llamada. El resultado nombrado permite observar qué agregan las funciones diferidas antes de salir.',
  objective: 'ReleaseOrder devuelve los nombres en el orden inverso mediante llamadas diferidas.',
  instructions: [
    'Por cada nombre registrá un defer que lo agregue a out.',
    'Pasá el nombre como argumento de la función diferida.',
  ],
  starter:
    'func ReleaseOrder(names []string) (out []string) {\n    for _, name := range names { out = append(out, name) }\n    return\n}',
  solution:
    'func ReleaseOrder(names []string) (out []string) {\n    for _, name := range names {\n        defer func(value string) { out = append(out, value) }(name)\n    }\n    return\n}',
  tests: [
    test(
      'Tres recursos',
      'fmt.Sprint(ReleaseOrder([]string{"socket","buffer","lock"})) == "[lock buffer socket]"',
      'Las últimas adquisiciones se liberan primero.',
      'Los defer se ejecutan en orden LIFO.',
    ),
    test(
      'Nada adquirido',
      'len(ReleaseOrder(nil)) == 0',
      'Sin registro no hay limpieza inventada.',
      'El slice de salida puede quedar vacío.',
    ),
    test(
      'Conserva repeticiones',
      'fmt.Sprint(ReleaseOrder([]string{"a","b","a","c"})) == "[c a b a]"',
      'Cada registro cuenta, aunque comparta nombre.',
      'No dedupliques los recursos.',
    ),
  ],
  hints: [
    'La función diferida necesita un parámetro string.',
    'Dentro, agregá value al resultado nombrado out.',
    'El cuerpo termina con return y entonces se vacía la pila.',
  ],
  review: {
    success:
      'Visualizaste el orden LIFO de la limpieza. El test verifica el orden observado; otras implementaciones de inversión podrían producir la misma salida.',
    pitfall: 'Defer dentro de un loop acumula registros hasta que la función termina.',
  },
  transfer: 'Explicá por qué un lock interno debería liberarse antes que el recurso externo.',
  prediction: predict(
    'Registrás defer A(), luego defer B(). Se ejecutan…',
    ['A y después B', 'B y después A', 'En orden aleatorio'],
    1,
    'El último registro pendiente se ejecuta primero.',
  ),
});
add(38, {
  title: 'Capturar ahora o mirar después',
  kind: 'reparar',
  intro:
    'Dos defer observan un contador: uno debe recordar el valor original y otro el valor al salir. Un argumento evaluado ahora y una clausura consultada después no hacen lo mismo.',
  why: 'Los argumentos de una llamada diferida se evalúan al registrar defer. Una clausura sin ese argumento puede leer la variable cuando finalmente se ejecuta.',
  objective: 'Capture(start) devuelve start y start+1 usando las dos observaciones diferidas.',
  instructions: [
    'Fijá el primer valor pasándolo como argumento al defer.',
    'Dejá que el segundo defer lea n al terminar.',
  ],
  starter:
    'func Capture(start int) (before, after int) {\n    n := start\n    defer func() { before = n }()\n    defer func() { after = n }()\n    n++\n    return\n}',
  solution:
    'func Capture(start int) (before, after int) {\n    n := start\n    defer func(value int) { before = value }(n)\n    defer func() { after = n }()\n    n++\n    return\n}',
  tests: [
    test(
      'Valor inicial distinto',
      'func() bool { a,b:=Capture(5); return a==5 && b==6 }()',
      'Separa captura inicial de lectura final.',
      'Pasá n como argumento en el primer defer.',
    ),
    test(
      'Cero',
      'func() bool { a,b:=Capture(0); return a==0 && b==1 }()',
      'La observación inicial puede ser cero legítimo.',
      'No uses el valor cero para decidir si se capturó.',
    ),
    test(
      'Valor negativo',
      'func() bool { a,b:=Capture(-2); return a == -2 && b == -1 }()',
      'La regla no depende de positivos.',
      'Incrementá una sola vez.',
    ),
  ],
  hints: [
    'La primera función diferida puede recibir value int.',
    'Llamala con (n) al final del registro.',
    'La segunda clausura puede seguir leyendo n directamente.',
  ],
  review: {
    success:
      'Diferenciaste el momento de evaluar un argumento del momento de ejecutar el cuerpo. Es útil para medir cambios de estado sin confundir instantáneas.',
    pitfall:
      'Defer retrasa la llamada, pero no retrasa automáticamente la evaluación de sus argumentos.',
  },
  transfer: 'Predecí qué ocurre si incrementás n dos veces antes del return.',
  prediction: predict(
    'En defer f(n), el valor de n se obtiene…',
    ['Cuando se registra defer', 'Al terminar la función', 'Cuando f lo pide'],
    0,
    'Los argumentos se evalúan al ejecutar la sentencia defer.',
  ),
});
add(39, {
  title: 'También puede fallar el cierre',
  kind: 'reparar',
  intro:
    'El trabajo y la limpieza pueden fallar. Elegimos una política precisa: conservar el error de trabajo si existe; si no, informar el error del cierre.',
  why: 'Una función diferida puede actualizar un resultado nombrado. Eso permite observar el error de Close sin duplicar la limpieza en cada salida.',
  objective: 'Use cierra una vez y prioriza workErr sobre el error de Close.',
  instructions: [
    'Conservá el resultado nombrado err.',
    'En el defer, reemplazalo por el error de cierre sólo si err era nil.',
  ],
  starter:
    'type Resource struct { CloseErr error; Closes int }\nfunc (r *Resource) Close() error { r.Closes++; return r.CloseErr }\nfunc Use(r *Resource, workErr error) (err error) {\n    defer r.Close()\n    return workErr\n}',
  solution:
    'type Resource struct { CloseErr error; Closes int }\nfunc (r *Resource) Close() error { r.Closes++; return r.CloseErr }\nfunc Use(r *Resource, workErr error) (err error) {\n    defer func() {\n        closeErr := r.Close()\n        if err == nil { err = closeErr }\n    }()\n    return workErr\n}',
  tests: [
    test(
      'Todo funciona',
      'func() bool { r:=&Resource{}; e:=Use(r,nil); return e==nil && r.Closes==1 }()',
      'Un éxito no fabrica errores ni duplica cierres.',
      'Close debe ejecutarse una vez.',
    ),
    test(
      'Sólo falla el cierre',
      'func() bool { failure:=fmt.Errorf("cerrar"); r:=&Resource{CloseErr:failure}; e:=Use(r,nil); return e==failure && r.Closes==1 }()',
      'No debe ocultarse el error de limpieza.',
      'El resultado nombrado se puede actualizar desde defer.',
    ),
    test(
      'Dos fallos, prioridad definida',
      'func() bool { work:=fmt.Errorf("trabajo"); r:=&Resource{CloseErr:fmt.Errorf("cerrar")}; e:=Use(r,work); return e==work && r.Closes==1 }()',
      'El error primario no se reemplaza según este contrato.',
      'Sólo asigná closeErr cuando err == nil.',
    ),
  ],
  hints: [
    'defer r.Close() ignora el valor devuelto.',
    'Usá una función anónima diferida.',
    'Consultá err antes de asignar el error del cierre.',
  ],
  review: {
    success:
      'Hiciste explícita la prioridad de fallos. Otras APIs pueden combinar errores con errors.Join; acá elegimos conservar el primero por contrato.',
    pitfall: 'El valor nombrado recibe workErr al ejecutar return, antes de que corra el defer.',
  },
  transfer: 'Diseñá una variante que conserve ambos errores cuando ambos ocurren.',
  prediction: predict(
    'Si workErr existe y Close también falla, este contrato devuelve…',
    ['Sólo el error de cierre', 'El error de trabajo', 'Siempre nil'],
    1,
    'La política elegida conserva el error primario; el cierre igualmente se ejecuta.',
  ),
});
add(40, {
  title: 'Una limpieza por iteración',
  kind: 'reparar',
  intro:
    'Un loop procesa recursos de a uno. Si todos los defer pertenecen a la función externa, las limpiezas se acumulan y llegan recién al terminar el lote.',
  why: 'Una función pequeña por iteración crea el alcance necesario para defer. Así cada uso termina con su liberación antes de comenzar el siguiente.',
  objective:
    'Para cada valor ejecutá use(value) y luego release(value), antes de pasar al siguiente.',
  instructions: [
    'Mové el defer a una función interna invocada por iteración.',
    'Conservá el orden de los valores y no invoques callbacks si no hay elementos.',
  ],
  starter:
    'func ForEach(values []int, use, release func(int)) {\n    for _, value := range values {\n        defer release(value)\n        use(value)\n    }\n}',
  solution:
    'func ForEach(values []int, use, release func(int)) {\n    for _, value := range values {\n        func(n int) {\n            defer release(n)\n            use(n)\n        }(value)\n    }\n}',
  tests: [
    test(
      'Intercalación correcta',
      'func() bool { log:=""; ForEach([]int{1,2},func(n int){log+=fmt.Sprintf("U%d",n)},func(n int){log+=fmt.Sprintf("R%d",n)}); return log=="U1R1U2R2" }()',
      'Cada recurso se libera antes del próximo uso.',
      'Los defer del loop externo se acumulan.',
    ),
    test(
      'Un recurso activo como máximo',
      'func() bool { active,max:=0,0; ForEach([]int{3,4,5},func(int){active++;if active>max{max=active}},func(int){active--}); return active==0 && max==1 }()',
      'Comprueba el ciclo de vida, no sólo la salida final.',
      'El defer debe pertenecer a una invocación por elemento.',
    ),
    test(
      'Sin elementos',
      'func() bool { calls:=0; ForEach(nil,func(int){calls++},func(int){calls++}); return calls==0 }()',
      'No hay recursos que usar ni liberar.',
      'No llames callbacks fuera del recorrido.',
    ),
  ],
  hints: [
    'Las llaves del loop no crean una función nueva.',
    'Invocá func(n int) { ... }(value).',
    'Colocá defer release(n) dentro de esa función.',
  ],
  review: {
    success:
      'Ajustaste el ciclo de vida al alcance real del recurso. Esta estructura evita mantener abierto todo un lote hasta el final.',
    pitfall: 'No alcanza con agregar más bloques: defer se ejecuta al salir de una función.',
  },
  transfer: 'Explicá qué riesgo habría al abrir miles de archivos con el starter.',
  prediction: predict(
    '¿Un bloque for hace que defer corra al final de cada vuelta?',
    ['Sí', 'No, espera el retorno de su función', 'Sólo para int'],
    1,
    'Necesitás una invocación de función por vuelta para ese alcance.',
  ),
});

add(41, {
  title: 'El mensajero y el punto de encuentro',
  intro:
    'Una goroutine calcula el doble de un número y lo entrega por un canal. La función espera ese mensaje antes de retornar: no necesita adivinar cuánto tarda el trabajo.',
  why: 'Un canal sin buffer coordina emisor y receptor. Lanzar una goroutine inicia trabajo, pero la recepción es lo que espera y obtiene su resultado.',
  objective: 'Calculá n*2 en una goroutine y devolvé el mensaje recibido por un canal.',
  instructions: ['Creá make(chan int).', 'Lanzá un emisor con go y retorná la recepción <-result.'],
  starter: 'func AsyncDouble(n int) int {\n    return n\n}',
  solution:
    'func AsyncDouble(n int) int {\n    result := make(chan int)\n    go func() { result <- n * 2 }()\n    return <-result\n}',
  tests: [
    test(
      'Trabajo positivo',
      'AsyncDouble(9) == 18',
      'La respuesta contiene el cálculo terminado.',
      'El resultado debe duplicar n.',
    ),
    test(
      'Cero válido',
      'AsyncDouble(0) == 0',
      'Un mensaje cero sigue siendo un mensaje.',
      'No uses cero como señal de que el canal terminó.',
    ),
    test(
      'Resultado negativo',
      'AsyncDouble(-3) == -6',
      'El canal transporta datos, no sólo señales positivas.',
      'Aplicá la misma cuenta para cualquier signo.',
    ),
  ],
  hints: [
    'make(chan int) crea el punto de intercambio.',
    'result <- valor envía; <-result recibe.',
    'El envío debe estar en la goroutine para que ambos puedan encontrarse.',
  ],
  review: {
    success:
      'La recepción sincroniza el trabajo sin sleeps. Estos tests verifican el resultado; para practicar el concepto revisá que tu implementación use la goroutine y el canal propuestos.',
    pitfall:
      'Una goroutine no acelera necesariamente un cálculo tan pequeño; acá sirve para estudiar coordinación.',
  },
  transfer:
    'Explicá por qué enviar antes de lanzar una goroutine podría bloquear el starter modificado.',
  prediction: predict(
    'Un envío a un canal sin buffer se completa cuando…',
    ['Pasó un milisegundo', 'Hay una recepción correspondiente', 'La goroutine fue creada'],
    1,
    'El canal sin buffer requiere el encuentro entre emisor y receptor.',
  ),
});
add(42, {
  title: 'Una transmisión que sabe terminar',
  intro:
    'Un productor envía una secuencia. El consumidor usa range sobre el canal y necesita saber que no llegarán más mensajes, incluso si la secuencia está vacía.',
  why: 'El productor que controla los envíos puede cerrar el canal al terminar. El consumidor sigue leyendo los mensajes disponibles y sale cuando se agotan.',
  objective: 'Stream devuelve un canal que emite los valores en orden y luego se cierra.',
  instructions: [
    'Usá una goroutine productora y registrá defer close(out).',
    'Enviá todos los valores; el consumidor del ejercicio agotará el canal.',
  ],
  starter:
    'func Stream(values []int) <-chan int {\n    out := make(chan int)\n    close(out)\n    return out\n}',
  solution:
    'func Stream(values []int) <-chan int {\n    out := make(chan int)\n    go func() {\n        defer close(out)\n        for _, value := range values { out <- value }\n    }()\n    return out\n}',
  tests: [
    test(
      'Orden y cierre',
      'func() bool { got:=[]int{}; for n:=range Stream([]int{3,1,4}) { got=append(got,n) }; return fmt.Sprint(got)=="[3 1 4]" }()',
      'range debe recibir la secuencia y poder terminar.',
      'Cerrá el canal después del último envío.',
    ),
    test(
      'Productor vacío',
      'func() bool { count:=0; for range Stream(nil){count++}; return count==0 }()',
      'También debe cerrarse sin mensajes.',
      'El cierre no puede depender de entrar al loop.',
    ),
    test(
      'Cero es dato',
      'func() bool { sum,count:=0,0; for n:=range Stream([]int{0,-2,0}){sum+=n;count++}; return sum == -2 && count==3 }()',
      'Los ceros no indican fin por sí mismos.',
      'Usá close para señalar fin, no un valor especial.',
    ),
  ],
  hints: [
    'El canal sólo de recepción se escribe <-chan int.',
    'El productor conserva el canal bidireccional local.',
    'defer close(out) cubre también la lista vacía.',
  ],
  review: {
    success:
      'Tu protocolo diferencia datos de finalización. Esta implementación supone que el consumidor recibe todo; detenerse antes requeriría cancelación para no dejar al productor bloqueado.',
    pitfall:
      'Enviar a un canal cerrado causa panic; el dueño de los envíos debe controlar el cierre.',
  },
  transfer: 'Diseñá cómo avisarías al productor que el consumidor ya no quiere datos.',
  prediction: predict(
    'Un range sobre canal termina cuando…',
    [
      'Recibe un cero',
      'El canal se cierra y no quedan mensajes',
      'El productor deja de ejecutarse un instante',
    ],
    1,
    'Cerrar el canal señala que no habrá más valores.',
  ),
});
add(43, {
  title: 'El buzón con espacio contado',
  kind: 'reparar',
  intro:
    'Conocés la cantidad completa de mensajes y querés llenar una cola antes de devolverla. Un buffer suficiente permite esos envíos sin un receptor simultáneo.',
  why: 'La capacidad define cuántos mensajes pueden esperar. El orden de recepción de esta cola debe conservar el orden de los envíos.',
  objective: 'Queue crea un canal con capacidad len(values), lo llena en orden y lo cierra.',
  instructions: [
    'Conservá el buffer dimensionado al tamaño del lote.',
    'Corregí el orden de envío; no hace falta una goroutine.',
  ],
  starter:
    'func Queue(values []int) <-chan int {\n    out := make(chan int, len(values))\n    for i:=len(values)-1; i>=0; i-- { out <- values[i] }\n    close(out)\n    return out\n}',
  solution:
    'func Queue(values []int) <-chan int {\n    out := make(chan int, len(values))\n    for _, value := range values { out <- value }\n    close(out)\n    return out\n}',
  tests: [
    test(
      'Capacidad y mensajes listos',
      'func() bool { c:=Queue([]int{4,9}); sizeOK:=cap(c)==2 && len(c)==2; a,okA:=<-c; b,okB:=<-c; _,open:=<-c; return sizeOK && okA && okB && a==4 && b==9 && !open }()',
      'El lote cabe completo y mantiene FIFO.',
      'Recorré values desde el comienzo.',
    ),
    test(
      'Cola vacía cerrada',
      'func() bool { c:=Queue(nil); _,ok:=<-c; return cap(c)==0 && !ok }()',
      'Sin datos no debe quedar una recepción bloqueada.',
      'Cerrá incluso el canal de capacidad cero.',
    ),
    test(
      'Repetidos preservados',
      'func() bool { got:=[]int{}; for n:=range Queue([]int{2,2,1}) { got=append(got,n) }; return fmt.Sprint(got)=="[2 2 1]" }()',
      'Una cola conserva multiplicidad y orden.',
      'No ordenes ni dedupliques los mensajes.',
    ),
  ],
  hints: [
    'El starter recorre desde el último índice.',
    'Un range directo conserva el orden del slice.',
    'Cerrar no borra los mensajes almacenados.',
  ],
  review: {
    success:
      'El buffer representa un límite concreto de mensajes pendientes. Cerrar la cola impide nuevos envíos, pero permite consumir los ya guardados.',
    pitfall:
      'Agregar buffers sin calcular su papel no arregla automáticamente un protocolo que puede bloquearse.',
  },
  transfer: 'Razoná qué pasaría si la capacidad fuera len(values)-1 y no hubiera receptor.',
  prediction: predict(
    'Si cerrás un canal con dos mensajes guardados…',
    ['Los dos se pierden', 'Aún pueden recibirse', 'close espera a que desaparezcan'],
    1,
    'El cierre conserva los mensajes que ya estaban en el buffer.',
  ),
});
add(44, {
  title: 'Mirar el buzón sin quedarse esperando',
  intro:
    'Un panel consulta si ya hay una respuesta. Debe volver inmediatamente si no la hay, y distinguir un mensaje cero de la ausencia de mensaje.',
  why: 'select con default permite una operación no bloqueante. La recepción con ok distingue un canal cerrado y agotado de un mensaje real.',
  objective:
    'TryReceive devuelve un mensaje listo y true; si no hay mensaje o el canal está agotado, 0 y false.',
  instructions: [
    'Usá select con un case de recepción y default.',
    'Propagá el ok de la recepción; no agregues sleeps ni loops de espera.',
  ],
  starter: 'func TryReceive(ch <-chan int) (int, bool) {\n    return 0, false\n}',
  solution:
    'func TryReceive(ch <-chan int) (int, bool) {\n    select {\n    case value, ok := <-ch:\n        return value, ok\n    default:\n        return 0, false\n    }\n}',
  tests: [
    test(
      'Mensaje listo, incluso cero',
      'func() bool { c:=make(chan int,1); c<-0; n,ok:=TryReceive(c); return n==0 && ok && len(c)==0 }()',
      'Recibir cero no significa ausencia.',
      'Leé el bool de la recepción.',
    ),
    test(
      'Sin mensaje',
      'func() bool { c:=make(chan int); n,ok:=TryReceive(c); return n==0 && !ok }()',
      'Debe regresar sin esperar emisor.',
      'El default evita el bloqueo.',
    ),
    test(
      'Cerrado y nil',
      'func() bool { c:=make(chan int); close(c); _,a:=TryReceive(c); _,b:=TryReceive(nil); return !a && !b }()',
      'Cerrado agotado y canal nil no entregan datos nuevos.',
      'La rama default permite manejar también un canal nil.',
    ),
  ],
  hints: [
    'select elige una comunicación lista.',
    'default se usa cuando ninguna puede avanzar.',
    'El case puede declarar value, ok := <-ch.',
  ],
  review: {
    success:
      'Una consulta no bloqueante informa el estado que observó en ese instante. No garantiza que llegue o no llegue un mensaje inmediatamente después.',
    pitfall:
      'Repetir esta consulta en un loop sin espera puede desperdiciar CPU; no es un reemplazo universal de recibir normalmente.',
  },
  transfer: 'Explicá cuándo conviene esperar en una recepción normal en vez de consultar.',
  prediction: predict(
    'En select, si el canal nil es la única comunicación y hay default…',
    ['Se bloquea siempre', 'Ejecuta default', 'Provoca panic'],
    1,
    'Una comunicación sobre nil no está lista; default permite continuar.',
  ),
});
add(45, {
  title: 'Trabajo paralelo, resultado ordenado',
  kind: 'reparar',
  imports: ['sync'],
  intro:
    'Varias goroutines procesan números y pueden terminar en distinto orden. Queremos conservar la posición original de cada resultado y esperar antes de leerlo.',
  why: 'Cada worker escribe en un índice distinto. WaitGroup coordina la finalización; pasar índice y valor como argumentos deja explícito qué trabajo pertenece a cada goroutine.',
  objective: 'Devolvé los cuadrados en el mismo orden, calculados por los workers dados.',
  instructions: [
    'Corregí la cuenta de cada worker.',
    'Conservá Add antes de lanzar, Done al terminar y Wait antes del return.',
  ],
  starter:
    'func ParallelSquares(values []int) []int {\n    out := make([]int, len(values))\n    var wg sync.WaitGroup\n    for i, value := range values {\n        wg.Add(1)\n        go func(index, n int) {\n            defer wg.Done()\n            out[index] = n\n        }(i, value)\n    }\n    wg.Wait()\n    return out\n}',
  solution:
    'func ParallelSquares(values []int) []int {\n    out := make([]int, len(values))\n    var wg sync.WaitGroup\n    for i, value := range values {\n        wg.Add(1)\n        go func(index, n int) {\n            defer wg.Done()\n            out[index] = n * n\n        }(i, value)\n    }\n    wg.Wait()\n    return out\n}',
  tests: [
    test(
      'Orden independiente del scheduler',
      'fmt.Sprint(ParallelSquares([]int{3,1,5,2})) == "[9 1 25 4]"',
      'Cada respuesta ocupa la posición del dato original.',
      'Escribí el cuadrado en out[index].',
    ),
    test(
      'Vacío y cero',
      'len(ParallelSquares(nil)) == 0 && fmt.Sprint(ParallelSquares([]int{0})) == "[0]"',
      'Wait también funciona sin workers.',
      'No agregues un trabajo inexistente al contador.',
    ),
    test(
      'Fuente intacta y signos',
      'func() bool { src:=[]int{-4,-2,-4}; out:=ParallelSquares(src); return fmt.Sprint(out)=="[16 4 16]" && fmt.Sprint(src)=="[-4 -2 -4]" }()',
      'La salida tiene memoria propia y conserva repeticiones.',
      'No escribas los cuadrados sobre values.',
    ),
  ],
  hints: [
    'El cuadrado se calcula n * n.',
    'Cada worker ya tiene su índice propio.',
    'No quites Wait: protege la lectura posterior de resultados.',
  ],
  review: {
    success:
      'El orden de finalización puede variar sin alterar el orden de salida. Los tests no miden velocidad ni demuestran ausencia general de carreras; el diseño separa escrituras y espera su finalización.',
    pitfall:
      'Una goroutine por elemento no es una estrategia escalable para cualquier tamaño; un pool limita trabajo concurrente.',
  },
  transfer: 'Diseñá cómo limitarías a cuatro workers un lote de un millón de números.',
  prediction: predict(
    '¿Por qué Wait va antes de return?',
    [
      'Para ordenar por valor',
      'Para leer resultados después de que terminen los workers',
      'Para iniciar las goroutines',
    ],
    1,
    'Sin esperar, el llamador podría observar resultados antes de su escritura.',
  ),
  sources: [
    { title: 'sync.WaitGroup', url: 'https://pkg.go.dev/sync#WaitGroup' },
    { title: 'Modelo de memoria de Go', url: 'https://go.dev/ref/mem' },
  ],
});

add(46, {
  title: 'Misión KV: interpretar una orden',
  imports: ['strings'],
  intro:
    'Tu motor acepta SET clave valor, GET clave y DEL clave. Las palabras de operación ignoran mayúsculas; las claves y valores conservan su texto y no pueden contener espacios.',
  why: 'Separar parsing y ejecución permite rechazar órdenes incompletas antes de tocar datos. Fields resuelve el whitespace, pero el protocolo decide cuántos campos admite.',
  objective: 'Devolvé operación normalizada, clave, valor y error según ese protocolo.',
  instructions: [
    'Validá cantidad exacta de campos para cada operación.',
    'Ante un error devolvé tres cadenas vacías y un error; GET y DEL válidos llevan valor vacío.',
  ],
  starter:
    'func ParseCommand(line string) (string,string,string,error) {\n    fields := strings.Fields(line)\n    _ = fields\n    return "","","",fmt.Errorf("orden pendiente")\n}',
  solution:
    'func ParseCommand(line string) (string,string,string,error) {\n    fields := strings.Fields(line)\n    if len(fields)==0 { return "","","",fmt.Errorf("orden vacía") }\n    op := strings.ToUpper(fields[0])\n    if op=="SET" && len(fields)==3 { return op,fields[1],fields[2],nil }\n    if (op=="GET" || op=="DEL") && len(fields)==2 { return op,fields[1],"",nil }\n    return "","","",fmt.Errorf("orden o argumentos inválidos")\n}',
  tests: [
    test(
      'Guardar con whitespace',
      'func() bool { op,k,v,e:=ParseCommand(" set\\tNombre   Ana "); return op=="SET" && k=="Nombre" && v=="Ana" && e==nil }()',
      'Normaliza sólo la operación y separa campos.',
      'Conservá mayúsculas en clave y valor.',
    ),
    test(
      'Lectura y borrado',
      'func() bool { a,k,v,e:=ParseCommand("GET x"); b,j,w,f:=ParseCommand("del y"); return a=="GET" && k=="x" && v=="" && e==nil && b=="DEL" && j=="y" && w=="" && f==nil }()',
      'Las órdenes sin valor tienen dos campos.',
      'No exijas tres campos a todas las operaciones.',
    ),
    test(
      'Rechazo de entradas incompletas y extra',
      'func() bool { for _,s:=range []string{"","SET x","GET x extra","DROP x"} { a,b,c,e:=ParseCommand(s); if e==nil || a!="" || b!="" || c!="" {return false} }; return true }()',
      'El parser no acepta órdenes ambiguas o desconocidas.',
      'Validá longitud antes de indexar y exigí la cantidad exacta.',
    ),
  ],
  hints: [
    'Primero comprobá len(fields)==0.',
    'strings.ToUpper se aplica solamente a fields[0].',
    'Cada orden válida puede retornar inmediatamente.',
  ],
  review: {
    success:
      'Convertiste texto libre en una orden con contrato preciso. Todavía no ejecutás nada: esa separación facilita probar y extender el protocolo.',
    pitfall:
      'Fields no entiende valores entre comillas; soportarlos requeriría otro parser y otro contrato.',
  },
  transfer: 'Diseñá una operación EXISTS y decidí su cantidad exacta de argumentos.',
  prediction: predict(
    '¿SET nombre Ana María es válido con este protocolo?',
    ['Sí, siempre une el resto', 'No, tiene un campo extra', 'Sí, si Nombre empieza con mayúscula'],
    1,
    'El contrato actual limita el valor a un único campo.',
  ),
});
add(47, {
  title: 'Misión KV: un almacén listo desde cero',
  intro:
    'Querés poder declarar var store Store y usarlo sin un constructor obligatorio. El map interno necesita crearse cuando llegue la primera escritura.',
  why: 'Diseñar un valor cero útil simplifica el uso del tipo. Los métodos ocultan la inicialización y exponen únicamente guardar y consultar.',
  objective: 'Implementá Set y Get para Store; Get distingue ausente de valor vacío.',
  instructions: [
    'En Set inicializá data con make si es nil.',
    'En Get usá la consulta de map con dos resultados.',
  ],
  starter:
    'type Store struct { data map[string]string }\nfunc (s *Store) Set(key,value string) {\n    s.data[key] = value\n}\nfunc (s *Store) Get(key string) (string,bool) {\n    value := s.data[key]\n    return value, value!=""\n}',
  solution:
    'type Store struct { data map[string]string }\nfunc (s *Store) Set(key,value string) {\n    if s.data==nil { s.data=make(map[string]string) }\n    s.data[key] = value\n}\nfunc (s *Store) Get(key string) (string,bool) {\n    value, ok := s.data[key]\n    return value, ok\n}',
  tests: [
    test(
      'Primer guardado desde cero',
      'func() bool { var s Store; s.Set("lang","Go"); v,ok:=s.Get("lang"); return v=="Go" && ok }()',
      'Una instancia sin constructor debe aceptar su primera escritura.',
      'Escribir en un map nil provoca panic.',
    ),
    test(
      'Vacío y ausente',
      'func() bool { var s Store; _,before:=s.Get("x"); s.Set("x",""); v,after:=s.Get("x"); return !before && after && v=="" }()',
      'Presencia y contenido tienen significados separados.',
      'Usá el ok real del map.',
    ),
    test(
      'Reemplazo e independencia',
      'func() bool { var a,b Store; a.Set("x","uno"); a.Set("x","dos"); v,ok:=a.Get("x"); _,other:=b.Get("x"); return ok && v=="dos" && !other }()',
      'Sobrescribir afecta sólo al almacén elegido.',
      'El map debe pertenecer a la instancia, no a una variable global.',
    ),
  ],
  hints: [
    's.data == nil detecta la inicialización pendiente.',
    'make(map[string]string) crea el almacenamiento.',
    'value, ok := s.data[key] también funciona antes del primer Set.',
  ],
  review: {
    success:
      'Integraste punteros, maps y un contrato de valor cero útil. Este Store es secuencial; usarlo simultáneamente desde varias goroutines requeriría coordinación.',
    pitfall:
      'Copiar un Store después de inicializarlo copiaría el descriptor del map y compartiría sus datos.',
  },
  transfer: 'Agregá Delete que informe si realmente eliminó una clave.',
  prediction: predict(
    'Antes del primer Set, Get sobre el map nil…',
    ['Puede leer una ausencia sin panic', 'Debe crear el map siempre', 'Produce datos aleatorios'],
    0,
    'La lectura de un map nil es válida; la escritura necesita inicialización.',
  ),
  sources: [{ title: 'Maps y su valor cero', url: 'https://go.dev/blog/maps' }],
});
add(48, {
  title: 'Misión KV: ejecutar sin mutar una orden rota',
  imports: ['strings'],
  intro:
    'Tu intérprete ya puede recibir texto. Ahora SET guarda y responde OK; GET devuelve el valor o un error si falta. Una orden inválida debe dejar el almacén intacto.',
  why: 'Validar antes de mutar evita estados parcialmente aplicados. El punto donde cambiás el map debe quedar después de todas las comprobaciones de esa orden.',
  objective:
    'Implementá Apply para SET y GET; el map recibido está inicializado y las operaciones se escriben en mayúsculas.',
  instructions: [
    'Aceptá exactamente tres campos para SET y dos para GET.',
    'Rechazá todo lo demás sin alterar el map; los valores son un único campo.',
  ],
  starter:
    'func Apply(store map[string]string, command string) (string,error) {\n    fields := strings.Fields(command)\n    _ = fields\n    return "",fmt.Errorf("sin implementar")\n}',
  solution:
    'func Apply(store map[string]string, command string) (string,error) {\n    fields := strings.Fields(command)\n    if len(fields)==3 && fields[0]=="SET" {\n        store[fields[1]]=fields[2]\n        return "OK",nil\n    }\n    if len(fields)==2 && fields[0]=="GET" {\n        value,ok:=store[fields[1]]\n        if !ok { return "",fmt.Errorf("clave ausente: %s",fields[1]) }\n        return value,nil\n    }\n    return "",fmt.Errorf("orden inválida")\n}',
  tests: [
    test(
      'Ciclo guardar y leer',
      'func() bool { m:=make(map[string]string); a,e:=Apply(m,"SET color azul"); b,f:=Apply(m,"GET color"); return a=="OK" && e==nil && b=="azul" && f==nil }()',
      'Comprueba efectos y respuestas de una secuencia.',
      'SET debe escribir antes de que GET pueda leer.',
    ),
    test(
      'Clave desconocida',
      'func() bool { m:=make(map[string]string); v,e:=Apply(m,"GET perdida"); return v=="" && e!=nil && len(m)==0 }()',
      'Una lectura fallida no crea datos.',
      'Usá la presencia real del map.',
    ),
    test(
      'Orden inválida sin efectos',
      'func() bool { m:=map[string]string{"x":"original"}; _,a:=Apply(m,"SET x nuevo extra"); _,b:=Apply(m,"SET x"); _,c:=Apply(m,""); return a!=nil && b!=nil && c!=nil && len(m)==1 && m["x"]=="original" }()',
      'Argumentos extra o faltantes no deben aplicar cambios parciales.',
      'Comprobá la longitud exacta antes de escribir.',
    ),
  ],
  hints: [
    'El primer operando de && puede proteger el acceso a fields[0].',
    'En SET verificá len(fields)==3 antes de mutar.',
    'En GET, value y ok distinguen vacío de ausencia.',
  ],
  review: {
    success:
      'El motor tiene una operación observable de punta a punta. Verificar que un error no cambie estado es tan importante como probar la respuesta feliz.',
    pitfall:
      'Este formato no soporta valores con espacios, persistencia ni acceso concurrente; cada capacidad exige un contrato adicional.',
  },
  transfer: 'Sumá DEL manteniendo la regla de validar antes de cambiar estado.',
  prediction: predict(
    'Ante SET x nuevo extra, ¿cuándo conviene guardar?',
    ['Antes de validar para ahorrar trabajo', 'Nunca: la orden es inválida', 'Si x ya existía'],
    1,
    'El parser debe rechazar argumentos extra sin modificar el valor anterior.',
  ),
});
add(49, {
  title: 'Misión KV: reconstruir un snapshot',
  imports: ['strings'],
  intro:
    'El almacén recibe un snapshot en memoria: una entrada clave=valor por línea. El valor puede contener más signos igual; una línea inválida hace fallar toda la carga.',
  why: 'Separar por el primer igual preserva el resto del valor. Construir un map local permite devolverlo sólo cuando el documento completo es válido.',
  objective:
    'Leé líneas clave=valor; ignorá líneas en blanco, recortá espacios de claves y dejá los valores tal cual.',
  instructions: [
    'Rechazá líneas sin igual o con clave vacía, devolviendo nil y error.',
    'Ante claves repetidas prevalece la última; un snapshot vacío produce un map vacío válido.',
  ],
  starter:
    'func DecodeSnapshot(text string) (map[string]string,error) {\n    lines := strings.Split(text,"\\n")\n    _ = lines\n    return make(map[string]string),nil\n}',
  solution:
    'func DecodeSnapshot(text string) (map[string]string,error) {\n    out:=make(map[string]string)\n    for i,line:=range strings.Split(text,"\\n") {\n        if strings.TrimSpace(line)=="" { continue }\n        pair:=strings.SplitN(line,"=",2)\n        if len(pair)!=2 || strings.TrimSpace(pair[0])=="" {\n            return nil,fmt.Errorf("línea %d inválida",i+1)\n        }\n        key:=strings.TrimSpace(pair[0])\n        out[key]=pair[1]\n    }\n    return out,nil\n}',
  tests: [
    test(
      'El valor conserva signos y espacios',
      'func() bool { m,e:=DecodeSnapshot(" token =a=b=c\\nnota= hola "); return e==nil && len(m)==2 && m["token"]=="a=b=c" && m["nota"]==" hola " }()',
      'La separación tiene que detenerse en el primer igual.',
      'SplitN con límite 2 conserva el resto del valor.',
    ),
    test(
      'Último gana y vacío es válido',
      'func() bool { m,e:=DecodeSnapshot("x=uno\\n \\nx=dos\\nempty="); z,f:=DecodeSnapshot(""); return e==nil && m["x"]=="dos" && len(m)==2 && m["empty"]=="" && f==nil && z!=nil && len(z)==0 }()',
      'Define duplicados, valores vacíos y documentos vacíos.',
      'No confundas una clave vacía con un valor vacío.',
    ),
    test(
      'Carga fallida sin resultado parcial',
      'func() bool { a,e:=DecodeSnapshot("x=uno\\nrota"); b,f:=DecodeSnapshot(" =valor"); return a==nil && e!=nil && b==nil && f!=nil }()',
      'Un documento inválido no entrega un map parcial como válido.',
      'En el error retorná nil, no el map acumulado.',
    ),
  ],
  hints: [
    'strings.Split separa líneas; SplitN limita la división de cada entrada.',
    'Recortá solamente la clave con TrimSpace.',
    'El map local se devuelve al final, después de validar todo.',
  ],
  review: {
    success:
      'Implementaste una carga con todo-o-nada para su resultado. Preservar los valores exactamente evita corromper datos mientras intentás ser flexible con la sintaxis.',
    pitfall:
      'Este formato educativo no escapa saltos de línea dentro de valores; definir persistencia real requiere resolver esa representación.',
  },
  transfer: 'Diseñá un encoder compatible y una prueba de ida y vuelta con claves ordenadas.',
  prediction: predict(
    'La entrada token=a=b debe interpretarse como…',
    ['Clave token y valor a=b', 'Clave token=a y valor b', 'Siempre inválida'],
    0,
    'El primer igual separa la clave; los siguientes pertenecen al valor.',
  ),
});
add(50, {
  title: 'Misión final: medir trabajo, no adivinar velocidad',
  kind: 'reparar',
  intro:
    'Tenés un índice ordenado de enteros distintos. La búsqueda lineal funciona, pero inspecciona demasiadas posiciones. Vamos a medir inspecciones, sin depender del reloj ni del equipo.',
  why: 'La búsqueda binaria reduce el intervalo a la mitad por paso. Contar posiciones examinadas permite estudiar crecimiento algorítmico de manera determinista; no equivale a un benchmark de tiempo.',
  objective:
    'Implementá búsqueda binaria y devolvé índice o -1, más el número de posiciones inspeccionadas.',
  instructions: [
    'Usá un intervalo [low, high) y contá una inspección cada vez que leas el punto medio.',
    'No copies ni ordenes la entrada; ya llega ordenada y sin repetidos.',
  ],
  starter:
    'func FindSorted(values []int, target int) (int,int) {\n    probes:=0\n    for i,n:=range values {\n        probes++\n        if n==target { return i,probes }\n    }\n    return -1,probes\n}',
  solution:
    'func FindSorted(values []int, target int) (int,int) {\n    low,high,probes:=0,len(values),0\n    for low<high {\n        mid:=low+(high-low)/2\n        probes++\n        n:=values[mid]\n        if n==target { return mid,probes }\n        if n<target { low=mid+1 } else { high=mid }\n    }\n    return -1,probes\n}',
  tests: [
    test(
      'Encuentra una posición',
      'func() bool { i,p:=FindSorted([]int{2,5,8,11,14},11); return i==3 && p>0 && p<=3 }()',
      'Debe devolver el índice original con pocas inspecciones.',
      'Compará el centro y descartá la mitad que no puede contener el dato.',
    ),
    test(
      'Vacío y ausencias',
      'func() bool { i,p:=FindSorted(nil,3); a,x:=FindSorted([]int{1,3,5},0); b,y:=FindSorted([]int{1,3,5},6); return i == -1 && p==0 && a == -1 && b == -1 && x<=2 && y<=2 }()',
      'El intervalo vacío termina y las ausencias no acceden fuera de rango.',
      'El límite high es exclusivo.',
    ),
    test(
      'Un índice de 1024 entradas',
      'func() bool { values:=make([]int,1024); for i:=range values {values[i]=i*2}; at,probes:=FindSorted(values,2046); return at==1023 && probes>0 && probes<=11 && values[0]==0 && values[1023]==2046 }()',
      'El presupuesto de inspecciones distingue búsqueda binaria de lineal.',
      'Reducí el intervalo en cada iteración; la última clave no necesita 1024 lecturas.',
    ),
  ],
  hints: [
    'Iniciá low=0 y high=len(values).',
    'mid := low + (high-low)/2 evita sumar los extremos directamente.',
    'Si values[mid] es menor, low=mid+1; si es mayor, high=mid.',
  ],
  review: {
    success:
      'Ahora tenés una explicación medible de la mejora: se reduce el espacio de búsqueda. Los tests confían en el contador que devolvés y no prueban tiempos reales; revisá que aumente en cada inspección.',
    pitfall:
      'Un contador inventado podría engañar estos tests sin mejorar el algoritmo. La revisión de la invariancia del intervalo sigue siendo parte del aprendizaje.',
  },
  transfer:
    'Compará inspecciones lineales y binarias para 16, 256 y 4096 claves; después diseñá un benchmark local.',
  prediction: predict(
    'Si duplicás el tamaño de un índice ordenado, la búsqueda binaria suele necesitar…',
    [
      'Aproximadamente una inspección adicional en el peor caso',
      'El doble de inspecciones siempre',
      'La misma cantidad exacta en todos los casos',
    ],
    0,
    'Cada paso descarta cerca de la mitad; una duplicación agrega aproximadamente un nivel de búsqueda.',
  ),
  sources: [
    { title: 'Búsqueda sobre secuencias ordenadas', url: 'https://pkg.go.dev/sort#Search' },
    { title: 'Benchmarks de Go', url: 'https://pkg.go.dev/testing#hdr-Benchmarks' },
  ],
});
add(51, {
  title: 'Una primera pieza de cualquier tipo',
  intro:
    'Tu inventario necesita obtener el primer elemento de una lista de números, nombres o posiciones. El algoritmo es idéntico: el tipo del elemento puede convertirse en un parámetro.',
  why: 'T any permite transportar valores de cualquier tipo, pero no aplicarles cualquier operación. El resultado sigue siendo T y el compilador conserva esa relación.',
  objective:
    'First[T any] devuelve el primer elemento y true, o el valor cero de T y false si no hay elementos.',
  instructions: [
    'Conservá la firma genérica y atendé el slice vacío.',
    'Usá var zero T para construir un cero del tipo apropiado.',
  ],
  starter: 'func First[T any](values []T) (T,bool) {\n    var zero T\n    return zero,false\n}',
  solution:
    'func First[T any](values []T) (T,bool) {\n    if len(values)==0 { var zero T; return zero,false }\n    return values[0],true\n}',
  tests: [
    test(
      'Lista de números',
      'func() bool { n,ok:=First([]int{8,3}); return ok && n==8 }()',
      'T se infiere como int.',
      'Devolvé el elemento cero del slice, no el valor cero del tipo.',
    ),
    test(
      'Lista de nombres',
      'func() bool { s,ok:=First([]string{"Ada","Go"}); return ok && s=="Ada" }()',
      'El mismo código conserva el tipo string.',
      'No conviertas los elementos a interface{}.',
    ),
    test(
      'Vacíos con tipos distintos',
      'func() bool { n,a:=First[int](nil); s,b:=First[string](nil); return n==0 && !a && s=="" && !b }()',
      'El cero depende del parámetro de tipo.',
      'var zero T funciona sin conocer T por adelantado.',
    ),
  ],
  hints: [
    'Comprobá len antes de indexar.',
    'Los parámetros de tipo van entre corchetes.',
    'Para una entrada no vacía retorná values[0], true.',
  ],
  review: {
    success:
      'Escribiste un único algoritmo con resultados tipados. La inferencia evita escribir [int] cuando los argumentos ya revelan el tipo.',
    pitfall: 'any no autoriza sumar ni ordenar T; la restricción debe garantizar esas operaciones.',
  },
  transfer: 'Implementá Last[T any] y compará sus casos límite.',
  prediction: predict(
    '¿Qué tipo tiene el resultado de First([]string{"x"})?',
    ['interface{}', 'string', 'Siempre int'],
    1,
    'La entrada permite inferir T como string.',
  ),
});
add(52, {
  title: 'El símbolo ~ abre la familia',
  kind: 'reparar',
  intro:
    'Una moneda de tu juego es un tipo propio basado en int. Querés que una suma genérica admita tanto enteros comunes como tipos de dominio con la misma base.',
  why: 'Una unión de restricciones admite varios tipos. ~int incluye tipos cuyo tipo subyacente es int, sin convertir el resultado y perder su identidad.',
  objective: 'Sumá []T con T restringido a ~int | ~int64, preservando el tipo del total.',
  instructions: [
    'Conservá la restricción y los tipos de dominio dados.',
    'Acumulá todos los valores, sin reemplazar el total en cada vuelta.',
  ],
  starter:
    'type Coins int\ntype Distance int64\nfunc SumNumbers[T ~int | ~int64](values []T) T {\n    var total T\n    for _, n := range values { total = n }\n    return total\n}',
  solution:
    'type Coins int\ntype Distance int64\nfunc SumNumbers[T ~int | ~int64](values []T) T {\n    var total T\n    for _, n := range values { total += n }\n    return total\n}',
  tests: [
    test(
      'Enteros comunes',
      'SumNumbers([]int{2,4,-1}) == 5',
      'La operación debe acumular.',
      'Asignar n descarta lo anterior.',
    ),
    test(
      'Tipos del dominio',
      'func() bool { var c Coins=SumNumbers([]Coins{3,7}); var d Distance=SumNumbers([]Distance{10,-2}); return c==10 && d==8 }()',
      '~ acepta tipos definidos sobre las bases permitidas.',
      'El retorno debe seguir siendo T.',
    ),
    test(
      'Vacío tipado',
      'SumNumbers[int64](nil) == 0',
      'El valor cero de T actúa como suma vacía.',
      'No accedas a values[0] para inicializar.',
    ),
  ],
  hints: [
    'T permite + porque todos sus tipos admitidos lo permiten.',
    'Usá += sobre el acumulador.',
    '~ modifica el conjunto de tipos, no los valores.',
  ],
  review: {
    success:
      'El algoritmo sirve a tipos del dominio sin borrar su significado. La restricción describe qué operaciones son válidas en todo el conjunto.',
    pitfall: 'int | int64 excluiría Coins y Distance; ~int | ~int64 incluye sus tipos subyacentes.',
  },
  transfer: 'Ampliá la restricción a una familia flotante y discutí el redondeo.',
  prediction: predict(
    'type Coins int satisface ~int…',
    [
      'Sí, su tipo subyacente es int',
      'No, sólo acepta el nombre int',
      'Sólo después de convertir cada valor',
    ],
    0,
    '~ incluye los tipos definidos con esa base subyacente.',
  ),
  sources: [
    { title: 'Restricciones y tipos subyacentes', url: 'https://go.dev/blog/intro-generics' },
  ],
});
add(53, {
  title: 'Un conjunto que conserva la primera aparición',
  intro:
    'Querés eliminar duplicados de códigos o nombres, manteniendo el orden de llegada. La pertenencia necesita una clave de map válida.',
  why: 'comparable permite usar T como clave y compararlo por igualdad. No supone que T se pueda ordenar; el orden se conserva recorriendo el slice original.',
  objective:
    'Unique[T comparable] devuelve cada valor sólo la primera vez que aparece, en memoria independiente.',
  instructions: [
    'Usá un map[T]bool para recordar elementos vistos.',
    'Agregá al resultado sólo la primera aparición.',
  ],
  starter: 'func Unique[T comparable](values []T) []T {\n    return values\n}',
  solution:
    'func Unique[T comparable](values []T) []T {\n    seen:=make(map[T]bool)\n    out:=make([]T,0)\n    for _, value:=range values {\n        if !seen[value] { seen[value]=true; out=append(out,value) }\n    }\n    return out\n}',
  tests: [
    test(
      'Orden de números',
      'fmt.Sprint(Unique([]int{3,1,3,2,1})) == "[3 1 2]"',
      'Un conjunto no requiere ordenar la salida.',
      'Recorré la entrada, no el map final.',
    ),
    test(
      'Strings y cero del tipo',
      'fmt.Sprint(Unique([]string{"","go","","rust","go"})) == "[ go rust]"',
      'Un string vacío también puede ser un valor único.',
      'No uses el cero como marca de posición inexistente.',
    ),
    test(
      'Independencia y vacío',
      'func() bool { a:=[]int{4,4}; b:=Unique(a); if len(b)!=1{return false}; b[0]=9; return a[0]==4 && len(Unique[int](nil))==0 }()',
      'La salida filtrada no modifica la fuente.',
      'Creá otro slice para el resultado.',
    ),
  ],
  hints: [
    'El cero de un map[T]bool es false.',
    'Marcá el elemento después de decidir que es nuevo.',
    'append conserva el orden de primeras apariciones.',
  ],
  review: {
    success:
      'Combinaste restricción estática, índice de pertenencia y orden de entrada. Para tipos con igualdad peculiar, como float NaN, el significado de duplicado requiere más diseño.',
    pitfall: '[]int no es comparable y no puede usarse como clave directamente.',
  },
  transfer: 'Explicá por qué Unique([][]int{...}) no cumple esta restricción.',
  prediction: predict(
    '¿Por qué necesitamos comparable y no any?',
    [
      'Para ordenar de menor a mayor',
      'Para permitir T como clave del map',
      'Para convertir T a string',
    ],
    1,
    'El map necesita claves comparables por igualdad.',
  ),
});
add(54, {
  title: 'La fábrica cambia el tipo de la pieza',
  intro:
    'Un pipeline convierte códigos enteros a etiquetas. No sólo varía el dato: el tipo de salida puede ser diferente del tipo de entrada.',
  why: 'Dos parámetros A y B describen una relación: la función de transformación recibe A y produce B. El compilador verifica esa conexión en cada uso.',
  objective: 'MapSlice[A,B any] aplica convert a cada elemento y devuelve []B en el mismo orden.',
  instructions: [
    'Reservá un resultado con la longitud de entrada.',
    'Asigná convert(value) al índice correspondiente.',
  ],
  starter:
    'func MapSlice[A,B any](values []A, convert func(A)B) []B {\n    return make([]B,len(values))\n}',
  solution:
    'func MapSlice[A,B any](values []A, convert func(A)B) []B {\n    out:=make([]B,len(values))\n    for i,value:=range values { out[i]=convert(value) }\n    return out\n}',
  tests: [
    test(
      'De int a string',
      'fmt.Sprint(MapSlice([]int{2,5},func(n int)string{return fmt.Sprintf("#%d",n)})) == "[#2 #5]"',
      'Entrada y salida pueden tener tipos diferentes.',
      'Invocá la función, no dejes los ceros de B.',
    ),
    test(
      'Una llamada por elemento',
      'func() bool { calls:=0; out:=MapSlice([]string{"a","abcd"},func(s string)int{calls++;return len(s)}); return calls==2 && fmt.Sprint(out)=="[1 4]" }()',
      'Cada entrada se transforma una vez.',
      'No invoques convert una vez extra para inferir el tipo.',
    ),
    test(
      'Vacío sin callback',
      'func() bool { calls:=0; out:=MapSlice([]int{},func(n int)int{calls++;return n}); return len(out)==0 && calls==0 }()',
      'La entrada vacía no ejecuta trabajo.',
      'El tamaño sale de len, no de una llamada de prueba.',
    ),
  ],
  hints: [
    'El resultado tiene tipo []B.',
    'range entrega i y value.',
    'out[i] = convert(value) conecta ambos tipos.',
  ],
  review: {
    success:
      'Separaste el recorrido de la transformación conservando tipos concretos. Elegí esta abstracción cuando mejore claridad; un loop explícito también puede ser la mejor opción.',
    pitfall: 'Genérico no significa concurrente: esta función mantiene llamadas secuenciales.',
  },
  transfer: 'Diseñá una variante cuya transformación pueda devolver un error.',
  prediction: predict(
    'Si convert es func(string) int, A y B son…',
    ['int y string', 'string e int', 'Ambos any en ejecución'],
    1,
    'Los parámetros enlazan el tipo del argumento con el del resultado.',
  ),
});
add(55, {
  title: 'Una caja tipada que intercambia contenido',
  kind: 'reparar',
  intro:
    'Tu inventario necesita una caja que pueda guardar un valor de un tipo elegido al crearla. Reemplazar su contenido debe entregar el valor anterior.',
  why: 'Un tipo genérico declara parámetros que sus métodos reutilizan. El receptor puntero permite actualizar la instancia conservando su T concreto.',
  objective: 'Box[T].Replace(next) guarda next y devuelve el contenido anterior.',
  instructions: [
    'Conservá el receptor *Box[T].',
    'Guardá el valor anterior antes de sobrescribirlo.',
  ],
  starter:
    'type Box[T any] struct { Value T }\nfunc (b *Box[T]) Replace(next T) T {\n    b.Value=next\n    return b.Value\n}',
  solution:
    'type Box[T any] struct { Value T }\nfunc (b *Box[T]) Replace(next T) T {\n    old:=b.Value\n    b.Value=next\n    return old\n}',
  tests: [
    test(
      'Intercambio numérico',
      'func() bool { b:=Box[int]{Value:4}; old:=b.Replace(9); return old==4 && b.Value==9 }()',
      'El retorno representa el pasado y el campo el presente.',
      'Leé el valor viejo antes de escribir.',
    ),
    test(
      'Caja de strings',
      'func() bool { b:=Box[string]{Value:"rojo"}; old:=b.Replace("azul"); return old=="rojo" && b.Value=="azul" }()',
      'El método conserva el parámetro string.',
      'No uses conversiones innecesarias.',
    ),
    test(
      'Valor cero útil',
      'func() bool { var b Box[bool]; old:=b.Replace(true); return !old && b.Value }()',
      'La caja también funciona sin constructor.',
      'El contenido inicial usa el cero de T.',
    ),
  ],
  hints: [
    'old := b.Value captura el contenido anterior.',
    'Después asigná next.',
    'El return debe devolver old.',
  ],
  review: {
    success:
      'Uniste tipo genérico, estado y receptor puntero. Los métodos usan los parámetros del tipo; no declaran una lista adicional propia de parámetros genéricos.',
    pitfall: 'Cada Box[T] es un tipo instanciado distinto: Box[int] no acepta strings.',
  },
  transfer: 'Agregá Peek() T y compará receptor por valor y por puntero.',
  prediction: predict(
    '¿Box[int].Replace puede recibir un string?',
    [
      'Sí, porque T usa any',
      'No, T ya es int en esa instancia',
      'Sólo si el string contiene dígitos',
    ],
    1,
    'any permite elegir el tipo al instanciar; no cambia ese tipo en cada llamada.',
  ),
});

add(56, {
  title: 'Cambiar la puerta de entrada a una lista',
  kind: 'reparar',
  intro:
    'Una lista enlazada guarda una dirección al primer nodo. Agregar uno al comienzo debe cambiar esa dirección del llamador, incluso cuando la lista está vacía.',
  why: '**Node permite acceder a la variable que contiene *Node. No necesitás aritmética de punteros: construís un nodo y actualizás la referencia inicial.',
  objective:
    'Prepend cambia *head por un nodo nuevo que apunte al antiguo primero; head siempre será una dirección válida.',
  instructions: [
    'Guardá el valor actual de *head como Next del nodo nuevo.',
    'Escribí la nueva dirección en *head, no en una variable local.',
  ],
  starter:
    'type Node struct { Value int; Next *Node }\nfunc Prepend(head **Node,value int) {\n    node:=&Node{Value:value,Next:*head}\n    head=&node\n}',
  solution:
    'type Node struct { Value int; Next *Node }\nfunc Prepend(head **Node,value int) {\n    *head=&Node{Value:value,Next:*head}\n}',
  tests: [
    test(
      'Primera pieza',
      'func() bool { var head *Node; Prepend(&head,7); return head!=nil && head.Value==7 && head.Next==nil }()',
      'Debe reemplazarse el puntero del llamador.',
      'Reasignar head sólo cambia la copia local del doble puntero.',
    ),
    test(
      'Enlace al original',
      'func() bool { old:=&Node{Value:4}; head:=old; Prepend(&head,9); return head!=old && head.Value==9 && head.Next==old && old.Value==4 }()',
      'El nodo anterior conserva identidad y contenido.',
      'Next debe señalar el nodo anterior, no una copia desconectada.',
    ),
    test(
      'Dos inserciones',
      'func() bool { var h *Node; Prepend(&h,1); Prepend(&h,2); return h!=nil && h.Next!=nil && h.Value==2 && h.Next.Value==1 && h.Next.Next==nil }()',
      'Cada inserción conserva la cadena completa.',
      'Actualizá el comienzo sin perder el resto.',
    ),
  ],
  hints: [
    'head apunta a la variable de entrada.',
    '*head es la dirección actual del primer nodo.',
    'Asigná &Node{...} a *head.',
  ],
  review: {
    success:
      'Diferenciaste cambiar un objeto de cambiar la referencia al objeto. Go mantiene vivos los nodos alcanzables sin liberación manual de memoria.',
    pitfall: 'Este contrato admite *head nil, pero no admite head nil; son niveles distintos.',
  },
  transfer: 'Implementá Pop que retire el primer nodo y cambie head.',
  prediction: predict(
    'Si var head *Node, &head tiene tipo…',
    ['Node', '*Node', '**Node'],
    2,
    'La dirección de una variable que contiene *Node agrega otro nivel de indirección.',
  ),
});
add(57, {
  title: 'Componer un dispositivo sin herencia',
  intro:
    'Un dispositivo tiene nombre y un medidor reutilizable. Un campo embebido permite acceder a métodos del medidor desde el dispositivo.',
  why: 'La promoción de métodos facilita composición. El medidor sigue siendo un campo real; embeberlo no crea una jerarquía de subtipos como herencia clásica.',
  objective: 'Feed agrega cada muestra al medidor embebido de Device y devuelve su total.',
  instructions: [
    'Usá el método promovido d.Add para cada muestra.',
    'Conservá el nombre y el total anterior del dispositivo.',
  ],
  starter:
    'type Meter struct { Total int }\nfunc (m *Meter) Add(n int) { m.Total+=n }\ntype Device struct { Name string; Meter }\nfunc Feed(d *Device,samples []int) int {\n    return d.Total\n}',
  solution:
    'type Meter struct { Total int }\nfunc (m *Meter) Add(n int) { m.Total+=n }\ntype Device struct { Name string; Meter }\nfunc Feed(d *Device,samples []int) int {\n    for _,sample:=range samples { d.Add(sample) }\n    return d.Total\n}',
  tests: [
    test(
      'Método promovido',
      'func() bool { d:=Device{Name:"sensor"}; n:=Feed(&d,[]int{2,4}); return n==6 && d.Meter.Total==6 && d.Name=="sensor" }()',
      'La promoción opera sobre el campo embebido real.',
      'No calcules un total separado y descartes el medidor.',
    ),
    test(
      'Acumulación previa',
      'func() bool { d:=Device{Meter:Meter{Total:10}}; return Feed(&d,[]int{-3,1})==8 }()',
      'El componente conserva estado entre operaciones.',
      'No reinicies Total dentro de Feed.',
    ),
    test(
      'Entrada vacía',
      'func() bool { d:=Device{Meter:Meter{Total:5}}; return Feed(&d,nil)==5 }()',
      'No recibir muestras no borra el estado.',
      'El recorrido vacío deja el campo intacto.',
    ),
  ],
  hints: [
    'd.Add está disponible gracias al campo Meter embebido.',
    'Add ya sabe actualizar Total.',
    'Retorná d.Total después del recorrido.',
  ],
  review: {
    success:
      'Reutilizaste comportamiento por composición. d.Total y d.Meter.Total seleccionan aquí el mismo campo a través de promoción.',
    pitfall:
      'Si varios campos embebidos promueven un mismo nombre, el acceso puede ser ambiguo y exigir selección explícita.',
  },
  transfer: 'Agregá un segundo componente embebido y observá qué nombres promueve.',
  prediction: predict(
    '¿Device puede pasarse automáticamente donde se exige un Meter concreto?',
    [
      'Sí, porque hereda de Meter',
      'No, la composición no lo convierte en Meter',
      'Solamente con Total cero',
    ],
    1,
    'Podés seleccionar d.Meter, pero Device y Meter siguen siendo tipos diferentes.',
  ),
});
add(58, {
  title: 'Qué métodos promete un valor',
  kind: 'reparar',
  intro:
    'Una interfaz exige Increment(). Queremos que solamente un puntero al contador pueda satisfacerla, porque el método cambia el estado original.',
  why: 'El conjunto de métodos de T y de *T no siempre coincide. Un método declarado con receptor *T pertenece al conjunto de *T, no al de T.',
  objective:
    'Hacé que *Ticks satisfaga Incrementer y modifique N; Ticks por valor no debe satisfacerla.',
  instructions: [
    'Corregí el receptor de Increment.',
    'Conservá Bump que usa la interfaz explícitamente.',
  ],
  starter:
    'type Incrementer interface { Increment() }\ntype Ticks struct { N int }\nfunc (t Ticks) Increment() { t.N++ }\nfunc Bump(t *Ticks) { var operation Incrementer=t; operation.Increment() }',
  solution:
    'type Incrementer interface { Increment() }\ntype Ticks struct { N int }\nfunc (t *Ticks) Increment() { t.N++ }\nfunc Bump(t *Ticks) { var operation Incrementer=t; operation.Increment() }',
  tests: [
    test(
      'Mutación a través de interfaz',
      'func() bool { t:=Ticks{N:2}; Bump(&t); return t.N==3 }()',
      'El despacho de interfaz debe actualizar el objeto.',
      'Un receptor por valor modifica una copia.',
    ),
    test(
      'Conjuntos diferentes',
      'func() bool { _,v:=interface{}(Ticks{}).(Incrementer); _,p:=interface{}(&Ticks{}).(Incrementer); return !v && p }()',
      'La satisfacción de interfaz depende del conjunto de métodos.',
      'La declaración debe usar receptor *Ticks.',
    ),
    test(
      'Llamada cómoda sobre variable',
      'func() bool { t:=Ticks{}; t.Increment(); t.Increment(); return t.N==2 }()',
      'La dirección implícita permite métodos sobre una variable direccionable.',
      'No confundas la comodidad de llamada con satisfacción por valor.',
    ),
  ],
  hints: [
    'El * va en el receptor, no en la interfaz.',
    'func (t *Ticks) Increment() conserva el cambio.',
    'Go puede tomar &t en una llamada directa si t es direccionable.',
  ],
  review: {
    success:
      'Comprobaste satisfacción de interfaces, no sólo la salida del método. La llamada t.Increment() puede ser cómoda aunque el valor Ticks no implemente Incrementer.',
    pitfall: 'La toma automática de dirección en una llamada no agrega métodos al conjunto de T.',
  },
  transfer:
    'Probá explicar por qué un literal no direccionable puede comportarse distinto al llamar métodos.',
  prediction: predict(
    'Con receptor *Ticks, ¿Ticks{} satisface Incrementer?',
    [
      'Sí, porque Go siempre toma su dirección',
      'No; *Ticks sí la satisface',
      'Ninguno la satisface',
    ],
    1,
    'Los conjuntos de métodos son una regla estática distinta de la sintaxis cómoda de llamadas.',
  ),
});
add(59, {
  title: 'Actualizar el descriptor del slice ajeno',
  kind: 'reparar',
  intro:
    'Una función agrega varias muestras a un historial, pero el llamador debe ver la nueva longitud. Un slice pasado por valor no permite reemplazar su descriptor externo.',
  why: '*[]int permite actualizar el descriptor del llamador. El parámetro variádico recibe cero o más valores, que append expande mediante ...',
  objective:
    'AppendInto actualiza el slice apuntado por dst; si dst es nil, devuelve false sin escribir.',
  instructions: [
    'Validá dst antes de desreferenciar.',
    'Guardá append(*dst, values...) en *dst y devolvé true.',
  ],
  starter:
    'func AppendInto(dst *[]int,values ...int) bool {\n    if dst==nil { return false }\n    local:=append(*dst,values...)\n    _=local\n    return true\n}',
  solution:
    'func AppendInto(dst *[]int,values ...int) bool {\n    if dst==nil { return false }\n    *dst=append(*dst,values...)\n    return true\n}',
  tests: [
    test(
      'Slice inicialmente nil',
      'func() bool { var s []int; ok:=AppendInto(&s,3,4); return ok && fmt.Sprint(s)=="[3 4]" }()',
      'El descriptor del llamador recibe longitud y almacenamiento.',
      'Guardar sólo una variable local no actualiza s.',
    ),
    test(
      'Con capacidad extra',
      'func() bool { s:=make([]int,1,8); s[0]=2; AppendInto(&s,5,7); return len(s)==3 && fmt.Sprint(s)=="[2 5 7]" }()',
      'La longitud externa cambia incluso sin realocación.',
      'Siempre asigná el resultado de append.',
    ),
    test(
      'Sin valores y sin dirección',
      'func() bool { s:=[]int{1}; ok:=AppendInto(&s); return ok && len(s)==1 && !AppendInto(nil,2) }()',
      'Un variádico vacío es válido; un puntero nil no.',
      'No confundas slice nil con puntero a slice nil.',
    ),
  ],
  hints: [
    'El asterisco selecciona la variable slice externa.',
    'values... expande los argumentos para append.',
    'La asignación destino es *dst.',
  ],
  review: {
    success:
      'Separaste dos niveles: los elementos del array y el descriptor de la secuencia. En muchas APIs resulta más simple retornar el nuevo slice, como hace append.',
    pitfall: 'Usar un puntero a slice no impide compartir el array con otras vistas existentes.',
  },
  transfer: 'Reescribí la API para retornar []int y compará cuál comunica mejor el cambio.',
  prediction: predict(
    '¿Por qué no basta cambiar local?',
    [
      'Porque append está prohibido en funciones',
      'Porque local es otro descriptor',
      'Porque los slices no tienen longitud',
    ],
    1,
    'El descriptor del llamador necesita una asignación explícita o un resultado retornado.',
  ),
});
add(60, {
  title: 'Un mapa de objetos, dos niveles de copia',
  kind: 'reparar',
  intro:
    'El mapa de personajes guarda punteros a fichas mutables. Copiar el mapa conserva los punteros; editar una ficha del clon todavía podría alterar el original.',
  why: 'La independencia requiere duplicar tanto el mapa como cada objeto señalado. Los valores nil se conservan como ausencia de ficha, sin desreferenciarlos.',
  objective:
    'CloneRoster copia map[string]*Player y crea un Player independiente por cada entrada no nil.',
  instructions: [
    'Construí un map nuevo.',
    'Copiá el struct de cada puntero válido y guardá la dirección de esa copia.',
  ],
  starter:
    'type Player struct { Level int }\nfunc CloneRoster(src map[string]*Player) map[string]*Player {\n    out:=make(map[string]*Player)\n    for key,p:=range src { out[key]=p }\n    return out\n}',
  solution:
    'type Player struct { Level int }\nfunc CloneRoster(src map[string]*Player) map[string]*Player {\n    out:=make(map[string]*Player)\n    for key,p:=range src {\n        if p==nil { out[key]=nil; continue }\n        clone:=*p\n        out[key]=&clone\n    }\n    return out\n}',
  tests: [
    test(
      'Personaje independiente',
      'func() bool { src:=map[string]*Player{"a":{Level:3}}; dst:=CloneRoster(src); if dst["a"]==nil{return false}; dst["a"].Level=9; return src["a"].Level==3 && dst["a"]!=src["a"] }()',
      'También debe copiarse el objeto, no sólo el mapa.',
      'Copiar un puntero mantiene el alias.',
    ),
    test(
      'Estructura de mapa independiente',
      'func() bool { src:=map[string]*Player{"a":{Level:2}}; dst:=CloneRoster(src); delete(dst,"a"); return len(src)==1 }()',
      'Eliminar una clave del clon no afecta la fuente.',
      'Creá un map nuevo.',
    ),
    test(
      'Entradas nil y fuente vacía',
      'func() bool { dst:=CloneRoster(map[string]*Player{"x":nil}); p,ok:=dst["x"]; return ok && p==nil && len(CloneRoster(nil))==0 }()',
      'Preserva una clave con puntero nil.',
      'Comprobá p antes de usar *p.',
    ),
  ],
  hints: [
    'clone := *p copia el struct.',
    'La nueva dirección se obtiene con &clone.',
    'Para p nil, conservá la clave con valor nil.',
  ],
  review: {
    success:
      'Tu copia cruza los dos niveles mutables de este modelo. Si dos claves originales apuntan al mismo personaje, este contrato crea dos copias independientes.',
    pitfall:
      'Una copia que conserve identidades compartidas requeriría recordar qué objetos ya se clonaron.',
  },
  transfer:
    'Diseñá una versión que preserve alias internos usando un mapa de punteros originales a clones.',
  prediction: predict(
    'out[key] = src[key] copia…',
    ['El Player completo', 'Sólo el valor puntero', 'Todo el grafo de objetos'],
    1,
    'La dirección copiada sigue señalando el objeto original.',
  ),
});

add(61, {
  title: 'Cancelar sin temporizadores mágicos',
  imports: ['context', 'errors'],
  intro:
    'Una operación espera un dato, pero su dueño puede cancelar. Debe atender ambas señales y preservar la causa de cancelación.',
  why: 'Context expone Done para coordinar cancelación y Err para explicarla. Una comprobación inicial da prioridad a un contexto que ya estaba cancelado al entrar.',
  objective:
    'Await devuelve un mensaje o ctx.Err(); si el canal se cierra sin datos, devuelve un error.',
  instructions: [
    'Comprobá ctx.Err() antes del select.',
    'Luego seleccioná entre ctx.Done() y la recepción con ok; no uses sleeps.',
  ],
  starter:
    'func Await(ctx context.Context,ch <-chan int) (int,error) {\n    _=ctx\n    _=ch\n    return 0,nil\n}',
  solution:
    'func Await(ctx context.Context,ch <-chan int) (int,error) {\n    if err:=ctx.Err(); err!=nil { return 0,err }\n    select {\n    case <-ctx.Done(): return 0,ctx.Err()\n    case n,ok:=<-ch:\n        if !ok { return 0,fmt.Errorf("canal sin datos") }\n        return n,nil\n    }\n}',
  tests: [
    test(
      'Respuesta lista',
      'func() bool { ch:=make(chan int,1); ch<-7; n,e:=Await(context.Background(),ch); return n==7 && e==nil }()',
      'La ruta normal entrega el mensaje.',
      'No devuelvas antes de leer el canal.',
    ),
    test(
      'Ya cancelado tiene prioridad',
      'func() bool { ctx,cancel:=context.WithCancel(context.Background()); cancel(); ch:=make(chan int,1); ch<-9; n,e:=Await(ctx,ch); return n==0 && errors.Is(e,context.Canceled) && len(ch)==1 }()',
      'Un contexto ya cancelado no debe consumir un mensaje.',
      'La comprobación anterior al select define esta prioridad.',
    ),
    test(
      'Cierre sin dato',
      'func() bool { ch:=make(chan int); close(ch); n,e:=Await(context.Background(),ch); return n==0 && e!=nil }()',
      'El cero de un canal agotado no es una respuesta.',
      'Consultá ok al recibir.',
    ),
  ],
  hints: [
    'ctx.Err() no bloquea.',
    'ctx.Done() devuelve un canal de señal.',
    'Si ambos eventos se vuelven listos durante select, puede elegirse cualquiera.',
  ],
  review: {
    success:
      'Expresaste cancelación como parte del protocolo. El prechequeo prioriza cancelación previa; no promete prioridad absoluta si dato y cancelación aparecen simultáneamente después.',
    pitfall:
      'Crear un Context cancelable no detiene goroutines por sí solo: el trabajo debe observar su señal.',
  },
  transfer: 'Diseñá un productor que observe el mismo contexto al enviar resultados.',
  prediction: predict(
    'Si dos cases de select están listos, Go…',
    [
      'Siempre elige el primero escrito',
      'Elige uno de los casos listos sin prioridad por orden textual',
      'Ejecuta ambos',
    ],
    1,
    'No podés implementar prioridad suponiendo que el primer case gana.',
  ),
});
add(62, {
  title: 'Dos transmisiones, un cierre limpio',
  imports: ['sort'],
  intro:
    'Llegan mensajes desde dos canales. El orden entre orígenes puede variar, pero todos los mensajes deben conservarse y la función tiene que terminar cuando ambos se agotan.',
  why: 'Un canal cerrado permanece listo para recibir ceros con ok=false. Asignarle nil desactiva ese case y evita un loop que repita lecturas vacías.',
  objective:
    'CollectBoth reúne valores de dos canales que eventualmente se cierran; acepta un canal nil como desactivado.',
  instructions: [
    'Usá select mientras al menos un canal sea distinto de nil.',
    'Cuando una recepción entregue ok=false, asigná nil a ese canal.',
  ],
  starter: 'func CollectBoth(left,right <-chan int) []int {\n    return nil\n}',
  solution:
    'func CollectBoth(left,right <-chan int) []int {\n    out:=make([]int,0)\n    for left!=nil || right!=nil {\n        select {\n        case n,ok:=<-left:\n            if !ok { left=nil } else { out=append(out,n) }\n        case n,ok:=<-right:\n            if !ok { right=nil } else { out=append(out,n) }\n        }\n    }\n    return out\n}',
  tests: [
    test(
      'Conserva ambos orígenes',
      'func() bool { a:=make(chan int,2);b:=make(chan int,2);a<-1;a<-3;b<-2;b<-4;close(a);close(b);got:=CollectBoth(a,b);sort.Ints(got);return fmt.Sprint(got)=="[1 2 3 4]" }()',
      'El orden global no se presupone; sí la conservación de datos.',
      'Revisá ambos casos hasta que ambos terminen.',
    ),
    test(
      'Una entrada desactivada',
      'func() bool { ch:=make(chan int,1);ch<-0;close(ch);got:=CollectBoth(nil,ch);return len(got)==1 && got[0]==0 }()',
      'nil desactiva una entrada, y cero sigue siendo dato.',
      'ok distingue cero válido de canal agotado.',
    ),
    test(
      'Ambos agotados',
      'func() bool { a:=make(chan int);b:=make(chan int);close(a);close(b);return len(CollectBoth(a,b))==0 && len(CollectBoth(nil,nil))==0 }()',
      'Debe finalizar sin agregar ceros fantasma.',
      'Al cerrar cada entrada, poné su variable en nil.',
    ),
  ],
  hints: [
    'for left != nil || right != nil controla el fin.',
    'Un canal nil nunca queda listo en select.',
    'Agregá n sólo cuando ok sea true.',
  ],
  review: {
    success:
      'El estado de cada canal forma una pequeña máquina de finalización. Los tests comparan contenido ordenado porque imponer orden entre productores sería otro contrato.',
    pitfall:
      'Esta función espera hasta el cierre; si un productor nunca termina, necesita cancelación adicional.',
  },
  transfer: 'Extendé el protocolo para aceptar un contexto de cancelación.',
  prediction: predict(
    'Leer repetidamente un canal cerrado y vacío sin revisar ok produce…',
    ['Bloqueo en cada lectura', 'Valores cero inmediatamente', 'Panic'],
    1,
    'Por eso lo desactivamos al detectar el cierre.',
  ),
  sources: [{ title: 'Select y canales', url: 'https://go.dev/ref/spec#Select_statements' }],
});
add(63, {
  title: 'Un contador compartido con puerta',
  kind: 'reparar',
  imports: ['sync'],
  intro:
    'Muchas goroutines agregan puntajes al mismo acumulador. La operación leer-modificar-escribir necesita exclusión para que dos actualizaciones no se pisen.',
  why: 'Un Mutex protege un estado compartido; WaitGroup espera que los workers terminen. Sus roles son distintos y ninguno reemplaza automáticamente al otro.',
  objective:
    'Corregí SafeTotal.Add para acumular bajo el mutex y conservar todas las contribuciones.',
  instructions: [
    'Mantené Lock y defer Unlock alrededor de la actualización.',
    'Conservá la espera de ParallelTotal antes de leer el total.',
  ],
  starter:
    'type SafeTotal struct { mu sync.Mutex; value int }\nfunc (s *SafeTotal) Add(n int) { s.mu.Lock(); defer s.mu.Unlock(); s.value=n }\nfunc (s *SafeTotal) Value() int { s.mu.Lock(); defer s.mu.Unlock(); return s.value }\nfunc ParallelTotal(values []int) int {\n    var total SafeTotal\n    var wg sync.WaitGroup\n    for _,n:=range values { wg.Add(1); go func(x int){defer wg.Done();total.Add(x)}(n) }\n    wg.Wait()\n    return total.Value()\n}',
  solution:
    'type SafeTotal struct { mu sync.Mutex; value int }\nfunc (s *SafeTotal) Add(n int) { s.mu.Lock(); defer s.mu.Unlock(); s.value+=n }\nfunc (s *SafeTotal) Value() int { s.mu.Lock(); defer s.mu.Unlock(); return s.value }\nfunc ParallelTotal(values []int) int {\n    var total SafeTotal\n    var wg sync.WaitGroup\n    for _,n:=range values { wg.Add(1); go func(x int){defer wg.Done();total.Add(x)}(n) }\n    wg.Wait()\n    return total.Value()\n}',
  tests: [
    test(
      'Estado secuencial',
      'func() bool { var s SafeTotal; s.Add(8);s.Add(-3);return s.Value()==5 }()',
      'Add suma al estado anterior.',
      'Reemplazar value pierde contribuciones.',
    ),
    test(
      'Todos los workers cuentan',
      'ParallelTotal([]int{1,2,3,4,5}) == 15',
      'El total final conserva todos los aportes.',
      'El mutex protege la actualización compuesta.',
    ),
    test(
      'Vacío y repetidos',
      'ParallelTotal(nil)==0 && ParallelTotal([]int{2,2,2})==6',
      'Repetir un valor no elimina trabajo.',
      'No confundas conjunto de valores con lista de contribuciones.',
    ),
  ],
  hints: [
    'El bug funcional está en la asignación.',
    'value += n acumula dentro de la sección protegida.',
    'Value también toma el lock porque lee el mismo estado.',
  ],
  review: {
    success:
      'Separaste exclusión y espera. Estas pruebas funcionales no sustituyen go test -race sobre un proyecto local, que ayuda a detectar accesos sin sincronización.',
    pitfall:
      'Un Mutex no debe copiarse después de empezar a usarse; mantené receptores puntero y la misma instancia.',
  },
  transfer: 'Llevá el contador a un módulo local y ejecutá pruebas con el detector de carreras.',
  prediction: predict(
    '¿WaitGroup por sí solo evita que dos goroutines pisen una actualización?',
    ['Sí, siempre', 'No; espera finalización, no protege esa sección', 'Sólo si Add usa int'],
    1,
    'La exclusión del estado compartido la aporta el mutex en este diseño.',
  ),
  sources: [{ title: 'sync.Mutex y WaitGroup', url: 'https://pkg.go.dev/sync' }],
});
add(64, {
  title: 'Una sola goroutine gana el arranque',
  kind: 'reparar',
  imports: ['sync/atomic', 'sync'],
  intro:
    'Una tarea puede pasar de 0=pendiente a 1=ejecutando y después a 2=terminada. Si dos goroutines intentan arrancarla, una sola debe conseguirlo.',
  why: 'CompareAndSwap combina comprobación y cambio en una operación atómica. Separar Load y Store dejaría una ventana donde varios participantes podrían creer que ganaron.',
  objective:
    'Implementá Start y Finish como transiciones válidas; cada una devuelve si logró cambiar el estado.',
  instructions: [
    'Start sólo acepta 0→1 y Finish sólo 1→2.',
    'Usá CompareAndSwap y conservá State con Load.',
  ],
  starter:
    'type Job struct { state atomic.Int32 }\nfunc (j *Job) Start() bool { j.state.Store(1);return true }\nfunc (j *Job) Finish() bool { j.state.Store(2);return true }\nfunc (j *Job) State() int32 { return j.state.Load() }',
  solution:
    'type Job struct { state atomic.Int32 }\nfunc (j *Job) Start() bool { return j.state.CompareAndSwap(0,1) }\nfunc (j *Job) Finish() bool { return j.state.CompareAndSwap(1,2) }\nfunc (j *Job) State() int32 { return j.state.Load() }',
  tests: [
    test(
      'Ciclo de vida',
      'func() bool { var j Job;return j.State()==0 && j.Start() && !j.Start() && j.Finish() && !j.Finish() && j.State()==2 }()',
      'Las transiciones se aceptan una vez.',
      'Retorná el resultado real de CompareAndSwap.',
    ),
    test(
      'No terminar antes de empezar',
      'func() bool { var j Job;return !j.Finish() && j.State()==0 }()',
      'Una transición inválida no modifica el estado.',
      'Finish necesita estado previo 1.',
    ),
    test(
      'Un ganador concurrente',
      'func() bool { var j Job;var wins atomic.Int32;var wg sync.WaitGroup;for i:=0;i<16;i++{wg.Add(1);go func(){defer wg.Done();if j.Start(){wins.Add(1)}}()};wg.Wait();return wins.Load()==1 && j.State()==1 }()',
      'Varios intentos deben producir un solo ganador.',
      'Load seguido de Store no constituye una comparación y cambio indivisible.',
    ),
  ],
  hints: [
    'CompareAndSwap recibe valor esperado y nuevo.',
    'Para Start: esperado 0, nuevo 1.',
    'Para Finish: esperado 1, nuevo 2.',
  ],
  review: {
    success:
      'La máquina de estados tiene transiciones atómicas concretas. Esto no hace atómica una operación mayor que combine varios campos independientes.',
    pitfall: 'Los tipos atomic no deben copiarse después de su primer uso; usalos por puntero.',
  },
  transfer: 'Agregá un estado cancelado y definí exactamente desde cuáles estados se puede entrar.',
  prediction: predict(
    '¿Por qué Load()==0 seguido de Store(1) no alcanza?',
    [
      'Porque Load siempre devuelve cero',
      'Porque otros pueden actuar entre ambas operaciones',
      'Porque Store no cambia valores',
    ],
    1,
    'CompareAndSwap evita esa separación entre comprobar y actualizar.',
  ),
  sources: [{ title: 'sync/atomic.Int32', url: 'https://pkg.go.dev/sync/atomic#Int32' }],
});
add(65, {
  title: 'Una fábrica con cantidad fija de workers',
  kind: 'reparar',
  imports: ['sync'],
  intro:
    'Lanzar una goroutine por cada elemento puede crear demasiadas tareas. Una cantidad fija de workers consume índices de una cola y escribe cada resultado en su posición.',
  why: 'La cola distribuye trabajo y WaitGroup reúne la finalización. Índices distintos separan las escrituras sin compartir una operación append concurrente.',
  objective: 'Completá el pool para producir cuadrados ordenados; workers debe ser mayor que cero.',
  instructions: [
    'Corregí la transformación sin crear goroutines adicionales por elemento.',
    'Conservá cierre de jobs y espera de todos los workers antes del return.',
  ],
  starter:
    'func PoolSquares(values []int,workers int) ([]int,error) {\n    if workers<=0{return nil,fmt.Errorf("workers debe ser positivo")}\n    out:=make([]int,len(values))\n    jobs:=make(chan int)\n    var wg sync.WaitGroup\n    for w:=0;w<workers;w++ { wg.Add(1);go func(){defer wg.Done();for i:=range jobs {out[i]=values[i]*2}}() }\n    for i:=range values {jobs<-i}\n    close(jobs)\n    wg.Wait()\n    return out,nil\n}',
  solution:
    'func PoolSquares(values []int,workers int) ([]int,error) {\n    if workers<=0{return nil,fmt.Errorf("workers debe ser positivo")}\n    out:=make([]int,len(values))\n    jobs:=make(chan int)\n    var wg sync.WaitGroup\n    for w:=0;w<workers;w++ { wg.Add(1);go func(){defer wg.Done();for i:=range jobs {out[i]=values[i]*values[i]}}() }\n    for i:=range values {jobs<-i}\n    close(jobs)\n    wg.Wait()\n    return out,nil\n}',
  tests: [
    test(
      'Tres workers, orden original',
      'func() bool { out,e:=PoolSquares([]int{5,-2,0,3},3);return e==nil && fmt.Sprint(out)=="[25 4 0 9]" }()',
      'El índice del trabajo fija dónde guardar la salida.',
      'Cuadrado significa multiplicar el valor por sí mismo.',
    ),
    test(
      'Validación y lote vacío',
      'func() bool { a,e:=PoolSquares(nil,2);b,f:=PoolSquares([]int{2},0);return e==nil && len(a)==0 && b==nil && f!=nil }()',
      'El pool vacío termina; cero workers se rechaza antes de enviar.',
      'Sin workers, un envío bloquearía para siempre.',
    ),
    test(
      'Más datos que workers',
      'func() bool { input:=make([]int,40);for i:=range input{input[i]=i};out,e:=PoolSquares(input,2);if e!=nil || len(out)!=40{return false};for i,n:=range out{if n!=i*i{return false}};return true }()',
      'Los workers deben continuar hasta agotar la cola.',
      'Cada worker recorre jobs, no recibe un solo elemento.',
    ),
  ],
  hints: [
    'El esquema del pool ya está armado.',
    'La operación dentro del range define el trabajo.',
    'close(jobs) permite terminar a todos los consumidores.',
  ],
  review: {
    success:
      'El trabajo queda acotado por la cantidad de workers, preservando orden mediante índices. Los tests observan resultados; la estructura del código explica el límite de concurrencia.',
    pitfall:
      'Un pool no es siempre más rápido: el costo de coordinación puede superar tareas tan pequeñas.',
  },
  transfer: 'Agregá cancelación y decidí qué devolver cuando sólo se completó parte del lote.',
  prediction: predict(
    '¿Quién cierra jobs en este diseño?',
    [
      'Cada worker al terminar su primer elemento',
      'El productor después de enviar todos los índices',
      'El primer consumidor que queda libre',
    ],
    1,
    'El productor sabe que ya no habrá más envíos.',
  ),
  sources: [{ title: 'Pipelines y distribución de trabajo', url: 'https://go.dev/blog/pipelines' }],
});

add(66, {
  title: 'El archivo que se cortó en silencio',
  kind: 'reparar',
  imports: ['bufio', 'io', 'strings'],
  intro:
    'Leés líneas desde un io.Reader y descartás las vacías. Scanner termina tanto al alcanzar EOF como al encontrar un error; salir del loop no demuestra éxito.',
  why: 'Scanner.Err distingue fin normal de fallo. Su límite de token también forma parte del contrato: acá fijamos 4096 bytes para detectar líneas demasiado grandes.',
  objective:
    'ReadLines devuelve líneas recortadas no vacías; ante un error del scanner devuelve nil y error.',
  instructions: [
    'Conservá Buffer con máximo 4096 y el recorrido existente.',
    'Consultá scanner.Err después del loop antes de declarar éxito.',
  ],
  starter:
    'func ReadLines(r io.Reader) ([]string,error) {\n    scanner:=bufio.NewScanner(r)\n    scanner.Buffer(make([]byte,1024),4096)\n    out:=[]string{}\n    for scanner.Scan(){line:=strings.TrimSpace(scanner.Text());if line!=""{out=append(out,line)}}\n    return out,nil\n}',
  solution:
    'func ReadLines(r io.Reader) ([]string,error) {\n    scanner:=bufio.NewScanner(r)\n    scanner.Buffer(make([]byte,1024),4096)\n    out:=[]string{}\n    for scanner.Scan(){line:=strings.TrimSpace(scanner.Text());if line!=""{out=append(out,line)}}\n    if err:=scanner.Err();err!=nil{return nil,err}\n    return out,nil\n}',
  tests: [
    test(
      'Líneas con espacios',
      'func() bool { lines,e:=ReadLines(strings.NewReader(" uno \\n\\n dos\\n"));return e==nil && fmt.Sprint(lines)=="[uno dos]" }()',
      'Separa líneas y elimina vacías.',
      'Conservá la limpieza del texto.',
    ),
    test(
      'Entrada vacía',
      'func() bool { lines,e:=ReadLines(strings.NewReader(""));return e==nil && len(lines)==0 }()',
      'EOF normal no es un error.',
      'Scanner.Err devuelve nil al agotarse normalmente.',
    ),
    test(
      'Línea demasiado grande',
      'func() bool { lines,e:=ReadLines(strings.NewReader("ok\\n"+strings.Repeat("x",6000)));return e!=nil && lines==nil }()',
      'No devuelve un éxito parcial si el scanner falló.',
      'Consultá Err después de Scan y respetá el contrato todo-o-nada.',
    ),
  ],
  hints: [
    'Scan devuelve false por más de un motivo.',
    'El error está disponible después del recorrido.',
    'Ante err != nil retorná nil, err.',
  ],
  review: {
    success:
      'Ahora la lectura no confunde truncamiento con finalización correcta. En este laboratorio el Reader está en memoria; el mismo patrón sirve para otros orígenes.',
    pitfall:
      'El máximo de Scanner incluye detalles del token y separadores; no lo presentes como un límite exacto de caracteres visibles.',
  },
  transfer: 'Probá localmente con un archivo real y cerralo en el código que lo abre.',
  prediction: predict(
    'Cuando Scan devuelve false, sabemos…',
    [
      'Que todo se leyó sin errores',
      'Que el recorrido terminó; falta consultar Err',
      'Que el archivo estaba vacío',
    ],
    1,
    'El estado final puede ser EOF normal o un error.',
  ),
  sources: [{ title: 'bufio.Scanner', url: 'https://pkg.go.dev/bufio#Scanner' }],
});
add(67, {
  title: 'Una entrada JSON con contrato estricto',
  imports: ['encoding/json', 'strings', 'io'],
  intro:
    'Una API recibe un usuario. No queremos aceptar campos escritos por error, edades negativas ni dos documentos pegados que se interpreten como uno.',
  why: 'Decoder permite rechazar campos desconocidos. Validar el objeto y comprobar que la siguiente lectura sea EOF completa el contrato de un único documento.',
  objective:
    'DecodeUser acepta exactamente un objeto con name no vacío y age no negativo; rechaza campos desconocidos.',
  instructions: [
    'Usá Decoder y DisallowUnknownFields.',
    'Después de validar el objeto, intentá una segunda decodificación y exigí io.EOF.',
  ],
  starter:
    'type User struct { Name string `json:"name"`; Age int `json:"age"` }\nfunc DecodeUser(text string) (User,error) {\n    d:=json.NewDecoder(strings.NewReader(text))\n    var u User\n    _=io.EOF\n    if err:=d.Decode(&u);err!=nil{return User{},err}\n    return u,nil\n}',
  solution:
    'type User struct { Name string `json:"name"`; Age int `json:"age"` }\nfunc DecodeUser(text string) (User,error) {\n    d:=json.NewDecoder(strings.NewReader(text))\n    d.DisallowUnknownFields()\n    var u User\n    if err:=d.Decode(&u);err!=nil{return User{},err}\n    if u.Name=="" || u.Age<0{return User{},fmt.Errorf("usuario inválido")}\n    var extra interface{}\n    if err:=d.Decode(&extra);err!=io.EOF{return User{},fmt.Errorf("contenido adicional o inválido")}\n    return u,nil\n}',
  tests: [
    test(
      'Documento válido',
      'func() bool { u,e:=DecodeUser(`{"name":"Ada","age":30}`);return e==nil && u.Name=="Ada" && u.Age==30 }()',
      'Los tags conectan campos JSON con campos Go.',
      'Pasá &u a Decode para que pueda escribir el struct.',
    ),
    test(
      'Errores de modelo y campos',
      'func() bool { for _,s:=range []string{`{"name":"A","age":-1}`,`{"name":""}`,`{"name":"A","agge":4}`} {_,e:=DecodeUser(s);if e==nil{return false}};return true }()',
      'Validez de JSON y validez del usuario son distintas.',
      'Rechazá campos desconocidos y validá después de decodificar.',
    ),
    test(
      'Un único documento',
      'func() bool { _,a:=DecodeUser(`{"name":"A"} {"name":"B"}`);_,b:=DecodeUser(`{"name":`);u,c:=DecodeUser(`{"name":"B"}  `);return a!=nil && b!=nil && c==nil && u.Name=="B" }()',
      'Contenido adicional no equivale a whitespace final.',
      'Una segunda decodificación debe terminar en io.EOF.',
    ),
  ],
  hints: [
    'Llamá d.DisallowUnknownFields() antes de Decode.',
    'Las reglas de Name y Age pertenecen a tu aplicación.',
    'Leer un segundo valor permite detectar basura o documentos extra.',
  ],
  review: {
    success:
      'Combinaste parsing, reglas de dominio y consumo completo. El decoder estándar todavía tiene decisiones como aceptar claves duplicadas; un contrato más estricto requeriría tratarlas explícitamente.',
    pitfall:
      'DisallowUnknownFields no obliga a que todos los campos aparezcan; acá age omitido usa cero y es válido.',
  },
  transfer: 'Diferenciá age omitido de age=0 usando un campo puntero.',
  prediction: predict(
    '¿JSON sintácticamente correcto garantiza un usuario válido?',
    ['Sí', 'No; faltan reglas del dominio', 'Sólo si se usa un struct'],
    1,
    'La sintaxis no puede decidir por sí sola si una edad o nombre cumplen tu contrato.',
  ),
  sources: [{ title: 'encoding/json.Decoder', url: 'https://pkg.go.dev/encoding/json#Decoder' }],
});
add(68, {
  title: 'Los campos públicos deciden qué sale al mundo',
  kind: 'reparar',
  imports: ['encoding/json', 'strings'],
  intro:
    'Una ficha pública expone name y, si no es cero, score. El token interno no debe aparecer. Los nombres exportados y los tags controlan cómo trabaja encoding/json.',
  why: 'Un campo no exportado no se serializa normalmente con este paquete. Los tags eligen los nombres externos; omitempty elimina el cero según las reglas de JSON.',
  objective:
    'Corregí los tags de Profile para producir name y score opcional, conservando token privado.',
  instructions: [
    'Name debe tener json:"name".',
    'Score debe tener json:"score,omitempty"; no exportes token.',
  ],
  starter:
    'type Profile struct {\n    Name string `json:"Name"`\n    Score int `json:"score"`\n    token string\n}\nfunc EncodeProfile(p Profile) (string,error) {data,err:=json.Marshal(p);return string(data),err}',
  solution:
    'type Profile struct {\n    Name string `json:"name"`\n    Score int `json:"score,omitempty"`\n    token string\n}\nfunc EncodeProfile(p Profile) (string,error) {data,err:=json.Marshal(p);return string(data),err}',
  tests: [
    test(
      'Nombres de la API',
      'func() bool { s,e:=EncodeProfile(Profile{Name:"Go",Score:9});var m map[string]interface{};err:=json.Unmarshal([]byte(s),&m);return e==nil && err==nil && len(m)==2 && m["name"]=="Go" && m["score"]==float64(9) }()',
      'Las claves externas obedecen a los tags.',
      'Name y name no son la misma clave JSON.',
    ),
    test(
      'Cero omitido',
      'func() bool { s,e:=EncodeProfile(Profile{Name:"A"});var m map[string]interface{};json.Unmarshal([]byte(s),&m);_,score:=m["score"];return e==nil && len(m)==1 && !score }()',
      'Un score cero no debe aparecer.',
      'Agregá omitempty al tag del campo.',
    ),
    test(
      'Dato privado',
      'func() bool { s,e:=EncodeProfile(Profile{Name:"B",token:"secreto123"});return e==nil && !strings.Contains(s,"secreto123") && !strings.Contains(s,"token") }()',
      'El campo interno no debe exportarse.',
      'Conservá token con inicial minúscula.',
    ),
  ],
  hints: [
    'Un tag es metadata dentro de comillas invertidas.',
    'omitempty va después de una coma en el tag.',
    'Marshal inspecciona campos exportados del struct.',
  ],
  review: {
    success:
      'La representación externa tiene un contrato separado de los nombres internos. Omitir cero y representar un cero explícito son decisiones de API distintas.',
    pitfall:
      'No uses privacidad del campo como único control de secretos en toda la aplicación: otras rutas de logging o serialización pueden existir.',
  },
  transfer: 'Usá *int para representar score omitido frente a score explícitamente cero.',
  prediction: predict(
    'Con score,omitempty y Score=0, el JSON contiene…',
    ['"score":null', 'Ninguna clave score', '"score":0 siempre'],
    1,
    'El tag omite el valor vacío definido para ese tipo.',
  ),
  sources: [{ title: 'encoding/json.Marshal', url: 'https://pkg.go.dev/encoding/json#Marshal' }],
});
add(69, {
  title: 'Tu primer handler, probado sin abrir puertos',
  imports: ['net/http', 'net/http/httptest', 'strings'],
  intro:
    'El endpoint GET /health responde JSON. Otros métodos reciben 405 y otras rutas 404. httptest crea petición y respuesta en memoria: no abrimos un servidor de red.',
  why: 'Un handler depende de ResponseWriter y Request, por lo que puede probarse directamente. Los headers deben prepararse antes de escribir el cuerpo o el estado.',
  objective: 'Implementá Health con ruta, método, Content-Type y cuerpo según el contrato.',
  instructions: [
    'Rechazá primero rutas distintas de /health.',
    'Para métodos distintos de GET devolvé 405 y Allow: GET; para GET devolvé {"status":"ok"}.',
  ],
  starter:
    'func Health(w http.ResponseWriter,r *http.Request) {\n    w.WriteHeader(http.StatusOK)\n    fmt.Fprint(w,"ok")\n}',
  solution:
    'func Health(w http.ResponseWriter,r *http.Request) {\n    if r.URL.Path!="/health" {http.NotFound(w,r);return}\n    if r.Method!=http.MethodGet {w.Header().Set("Allow","GET");http.Error(w,"método no permitido",http.StatusMethodNotAllowed);return}\n    w.Header().Set("Content-Type","application/json")\n    w.WriteHeader(http.StatusOK)\n    fmt.Fprint(w,`{"status":"ok"}`)\n}',
  tests: [
    test(
      'Contrato de éxito',
      'func() bool { w:=httptest.NewRecorder();Health(w,httptest.NewRequest("GET","/health",nil));return w.Code==200 && w.Header().Get("Content-Type")=="application/json" && strings.TrimSpace(w.Body.String())==`{"status":"ok"}` }()',
      'Estado, headers y cuerpo conforman juntos la respuesta.',
      'Prepará el Content-Type antes de escribir.',
    ),
    test(
      'Método no permitido',
      'func() bool { w:=httptest.NewRecorder();Health(w,httptest.NewRequest("POST","/health",nil));return w.Code==405 && w.Header().Get("Allow")=="GET" }()',
      'El cliente recibe un método permitido.',
      'Un return evita escribir luego la respuesta de éxito.',
    ),
    test(
      'Ruta inexistente',
      'func() bool { w:=httptest.NewRecorder();Health(w,httptest.NewRequest("GET","/missing",nil));return w.Code==404 }()',
      'El handler no convierte cualquier ruta en éxito.',
      'Validá URL.Path.',
    ),
  ],
  hints: [
    'r.Method y r.URL.Path separan método y ruta.',
    'http.Error y http.NotFound escriben una respuesta y necesitan return después.',
    'w.Header().Set debe ocurrir antes del cuerpo.',
  ],
  review: {
    success:
      'Probaste un límite HTTP real en memoria, sin depender de red. Levantar un servidor, administrar timeouts y apagarlo con gracia son ejercicios de proyecto local posteriores.',
    pitfall:
      'Este handler no agrega autenticación, routing general ni políticas de producción automáticamente.',
  },
  transfer:
    'Conectá el handler a un servidor local y agregá una prueba de método HEAD con contrato explícito.',
  prediction: predict(
    '¿Por qué httptest.NewRecorder evita abrir un puerto?',
    [
      'Simula HTTP con JavaScript',
      'Implementa ResponseWriter y registra la respuesta en memoria',
      'Desactiva todos los tests',
    ],
    1,
    'El handler puede invocarse directamente con las interfaces de net/http.',
  ),
  sources: [
    {
      title: 'httptest.ResponseRecorder',
      url: 'https://pkg.go.dev/net/http/httptest#ResponseRecorder',
    },
    { title: 'net/http.Handler', url: 'https://pkg.go.dev/net/http#Handler' },
  ],
});
add(70, {
  title: 'El escritor que guardó sólo la mitad',
  kind: 'reparar',
  imports: ['io', 'bytes', 'errors'],
  intro:
    'Una salida puede rechazar una escritura o aceptar menos bytes. No queremos reportar éxito si el registro quedó incompleto.',
  why: 'io.Writer entrega cantidad y error. Un escritor correcto debe indicar error si escribe menos; esta función también detecta una implementación defectuosa que devuelve corto con nil.',
  objective:
    'WriteRecord devuelve el error original o io.ErrShortWrite si faltaron bytes, y nil sólo si escribió todo.',
  instructions: [
    'Revisá primero el error de io.WriteString.',
    'Después compará la cantidad escrita con len(record).',
  ],
  starter:
    'type LimitedWriter struct { Limit int; Err error }\nfunc (w LimitedWriter) Write(p []byte)(int,error){if w.Err!=nil{return 0,w.Err};n:=len(p);if n>w.Limit{n=w.Limit};return n,nil}\nfunc WriteRecord(w io.Writer,record string) error {\n    _,err:=io.WriteString(w,record)\n    return err\n}',
  solution:
    'type LimitedWriter struct { Limit int; Err error }\nfunc (w LimitedWriter) Write(p []byte)(int,error){if w.Err!=nil{return 0,w.Err};n:=len(p);if n>w.Limit{n=w.Limit};return n,nil}\nfunc WriteRecord(w io.Writer,record string) error {\n    n,err:=io.WriteString(w,record)\n    if err!=nil{return err}\n    if n!=len(record){return io.ErrShortWrite}\n    return nil\n}',
  tests: [
    test(
      'Destino completo',
      'func() bool { var b bytes.Buffer;e:=WriteRecord(&b,"hola🚀");return e==nil && b.String()=="hola🚀" }()',
      'La cantidad esperada se mide en bytes.',
      'len(record) usa la misma unidad que Writer.',
    ),
    test(
      'Escritura incompleta',
      'errors.Is(WriteRecord(LimitedWriter{Limit:2},"abcd"),io.ErrShortWrite)',
      'Un resultado corto no puede convertirse en éxito.',
      'Compará n con len(record).',
    ),
    test(
      'Causa original y vacío',
      'func() bool { failure:=fmt.Errorf("disco");e:=WriteRecord(LimitedWriter{Err:failure},"x");return errors.Is(e,failure) && WriteRecord(LimitedWriter{},"")==nil }()',
      'Preserva la causa real y admite un registro vacío.',
      'El error original tiene prioridad sobre el conteo corto.',
    ),
  ],
  hints: [
    'No descartes n con _.',
    'El error original se retorna antes de comprobar la cantidad.',
    'io.ErrShortWrite expresa que no se escribió todo.',
  ],
  review: {
    success:
      'Tu función comprueba el contrato completo de escritura. No reintenta automáticamente porque repetir un registro parcialmente escrito puede necesitar una política de recuperación.',
    pitfall:
      'LimitedWriter es un doble de prueba intencionalmente defectuoso para ejercitar defensa ante escrituras cortas con nil.',
  },
  transfer:
    'Diseñá un protocolo que informe cuántos bytes quedaron pendientes para reintentar con precisión.',
  prediction: predict(
    'Writer cuenta longitud en…',
    ['Caracteres visuales', 'Bytes', 'Runes siempre'],
    1,
    'Su entrada es []byte y n cuenta bytes escritos.',
  ),
  sources: [{ title: 'io.Writer y ErrShortWrite', url: 'https://pkg.go.dev/io#Writer' }],
});

add(71, {
  title: 'El explorador de APIs públicas',
  imports: ['go/ast', 'go/parser', 'go/token', 'sort'],
  intro:
    'Estás construyendo una mini herramienta de documentación. Querés listar sólo las funciones públicas de un archivo Go: nombres exportados, sin métodos ni funciones privadas.',
  why: 'Las herramientas de Go pueden usar su parser y AST oficiales. La exportación se relaciona con mayúscula inicial; los paquetes y módulos reales requieren una estructura de archivos fuera de este fragmento.',
  objective:
    'ExportedFunctions parsea source y devuelve nombres de funciones exportadas sin receptor, ordenados.',
  instructions: [
    'Parseá el archivo con parser.ParseFile.',
    'Seleccioná *ast.FuncDecl con Recv==nil y ast.IsExported; ordená con sort.Strings.',
  ],
  starter:
    'func ExportedFunctions(source string) ([]string,error) {\n    file,err:=parser.ParseFile(token.NewFileSet(),"input.go",source,0)\n    if err!=nil{return nil,err}\n    _=file\n    _=ast.IsExported\n    names:=[]string{}\n    sort.Strings(names)\n    return names,nil\n}',
  solution:
    'func ExportedFunctions(source string) ([]string,error) {\n    file,err:=parser.ParseFile(token.NewFileSet(),"input.go",source,0)\n    if err!=nil{return nil,err}\n    names:=[]string{}\n    for _,decl:=range file.Decls {\n        fn,ok:=decl.(*ast.FuncDecl)\n        if ok && fn.Recv==nil && ast.IsExported(fn.Name.Name) {names=append(names,fn.Name.Name)}\n    }\n    sort.Strings(names)\n    return names,nil\n}',
  tests: [
    test(
      'Sólo funciones exportadas',
      'func() bool { names,e:=ExportedFunctions("package demo\\nfunc Zebra(){}\\nfunc hidden(){}\\nfunc Alpha(){}\\n");return e==nil && fmt.Sprint(names)=="[Alpha Zebra]" }()',
      'El análisis respeta visibilidad y orden determinista.',
      'Seleccioná únicamente nombres exportados.',
    ),
    test(
      'Métodos y tipos no son funciones libres',
      'func() bool { names,e:=ExportedFunctions("package demo\\ntype Thing struct{}\\nfunc (Thing) Public(){}\\nconst Visible=1\\n");return e==nil && len(names)==0 }()',
      'El receptor distingue métodos de funciones libres.',
      'Comprobá fn.Recv==nil.',
    ),
    test(
      'Fuente malformada',
      'func() bool { names,e:=ExportedFunctions("package demo\\nfunc (");return names==nil && e!=nil }()',
      'La herramienta no oculta errores de sintaxis.',
      'Propagá el error del parser.',
    ),
  ],
  hints: [
    'Las declaraciones son interfaces: usá una aserción segura a *ast.FuncDecl.',
    'El nombre está en fn.Name.Name.',
    'Un método tiene un receptor en fn.Recv.',
  ],
  review: {
    success:
      'Usaste herramientas del propio lenguaje para inspeccionarlo. Esto es análisis sintáctico de un archivo, no resolución completa de imports o tipos entre paquetes.',
    pitfall:
      'Mayúscula exporta un identificador desde su paquete; el consumo real también depende de rutas de importación y reglas como internal.',
  },
  transfer:
    'En un proyecto local, creá dos paquetes y comprobá qué nombres puede importar el segundo.',
  prediction: predict(
    '¿Qué diferencia sintáctica tiene un método frente a una función libre?',
    ['Siempre retorna error', 'Tiene un receptor', 'Siempre empieza con mayúscula'],
    1,
    'El receptor conecta la declaración con un tipo.',
  ),
  sources: [
    { title: 'go/ast', url: 'https://pkg.go.dev/go/ast' },
    { title: 'Organizar código Go', url: 'https://go.dev/doc/code' },
  ],
});
add(72, {
  title: 'El reviewer aprende de una tabla de casos',
  intro:
    'En vez de repetir bloques de prueba, una tabla describe entradas, resultados esperados y nombres legibles. El loop ejecuta la misma regla para todos.',
  why: 'Separar datos y ejecución hace visibles los bordes que decidiste comprobar. Este ejercicio modela el recorrido; en un módulo local se integra con testing.T y subtests.',
  objective:
    'FailedCases devuelve los nombres de todos los casos cuyo resultado difiera de Want, preservando orden.',
  instructions: [
    'Ejecutá operation exactamente una vez por caso.',
    'Compará con Want y acumulá los nombres fallidos sin detenerte en el primero.',
  ],
  starter:
    'type TestCase struct { Name string; Input,Want int }\nfunc FailedCases(cases []TestCase,operation func(int)int) []string {\n    return nil\n}',
  solution:
    'type TestCase struct { Name string; Input,Want int }\nfunc FailedCases(cases []TestCase,operation func(int)int) []string {\n    failed:=[]string{}\n    for _,c:=range cases { if got:=operation(c.Input);got!=c.Want {failed=append(failed,c.Name)} }\n    return failed\n}',
  tests: [
    test(
      'Detecta varias discrepancias',
      'fmt.Sprint(FailedCases([]TestCase{{"uno",1,2},{"dos",2,9},{"tres",3,8}},func(n int)int{return n*2}))=="[dos tres]"',
      'Un reviewer útil informa más que el primer fallo.',
      'Compará resultado y Want en cada vuelta.',
    ),
    test(
      'Cada caso se ejecuta una vez',
      'func() bool { calls:=0;failed:=FailedCases([]TestCase{{"a",1,1},{"b",2,2}},func(n int)int{calls++;return n});return calls==2 && len(failed)==0 }()',
      'No fabriques fallos ni dupliques ejecuciones.',
      'Guardá got si necesitás consultarlo más de una vez.',
    ),
    test(
      'Tabla vacía',
      'func() bool { calls:=0;failed:=FailedCases(nil,func(n int)int{calls++;return n});return calls==0 && len(failed)==0 }()',
      'Sin casos no hay llamadas.',
      'La función no necesita una ejecución de prueba previa.',
    ),
  ],
  hints: [
    'Recorré c con range.',
    'got := operation(c.Input) produce el resultado real.',
    'Si got != c.Want, append de c.Name.',
  ],
  review: {
    success:
      'La tabla se convirtió en una especificación de ejemplos revisable. Los ejemplos no cubren todo el dominio; elegir casos y propiedades sigue siendo trabajo de diseño.',
    pitfall:
      'Esta función no reemplaza testing.T: reproduce el patrón para comprenderlo dentro del navegador.',
  },
  transfer: 'Mové la tabla a un archivo _test.go y usá t.Run con el nombre de cada caso.',
  prediction: predict(
    'Una tabla con muchos casos casi idénticos garantiza cobertura completa…',
    ['Sí, por cantidad', 'No; importa qué propiedades y bordes representan', 'Sólo si todos pasan'],
    1,
    'La diversidad de condiciones importa más que inflar el número de ejemplos.',
  ),
  sources: [
    { title: 'Subtests en Go', url: 'https://go.dev/blog/subtests' },
    { title: 'Paquete testing', url: 'https://pkg.go.dev/testing' },
  ],
});
add(73, {
  title: 'La semilla que rompió tu supuesto Unicode',
  kind: 'reparar',
  intro:
    'Tu herramienta debe invertir bytes de un string, incluso si no contiene UTF-8 válido. Una propiedad útil es que invertir dos veces devuelve exactamente la entrada.',
  why: 'Un string Go puede contener bytes arbitrarios. Convertirlo a []rune decodifica UTF-8 y puede reemplazar secuencias inválidas, perdiendo información.',
  objective:
    'ReverseBytes invierte bytes sin interpretar Unicode; debe cumplir ReverseBytes(ReverseBytes(s)) == s.',
  instructions: [
    'Trabajá con []byte en lugar de []rune.',
    'Intercambiá extremos hacia el centro y conservá bytes cero y bytes inválidos.',
  ],
  starter:
    'func ReverseBytes(text string) string {\n    data:=[]rune(text)\n    for i,j:=0,len(data)-1;i<j;i,j=i+1,j-1{data[i],data[j]=data[j],data[i]}\n    return string(data)\n}',
  solution:
    'func ReverseBytes(text string) string {\n    data:=[]byte(text)\n    for i,j:=0,len(data)-1;i<j;i,j=i+1,j-1{data[i],data[j]=data[j],data[i]}\n    return string(data)\n}',
  tests: [
    test(
      'Una dirección conocida',
      'ReverseBytes("abc")=="cba" && ReverseBytes("")==""',
      'La propiedad de ida y vuelta sola también la cumpliría no hacer nada.',
      'Incluí ejemplos que definan realmente la transformación.',
    ),
    test(
      'Semilla UTF-8 inválida',
      'func() bool { s:=string([]byte{255,0,128,65});return ReverseBytes(ReverseBytes(s))==s && ReverseBytes(s)==string([]byte{65,128,0,255}) }()',
      'No debe reemplazar bytes al decodificar.',
      'El contrato habla de bytes, no de runes.',
    ),
    test(
      'Conjunto determinista de semillas',
      'func() bool { for n:=0;n<256;n++ {s:=string([]byte{byte(n),42,0,byte(255-n)});if ReverseBytes(ReverseBytes(s))!=s{return false}};return true }()',
      'Prueba la propiedad sobre todos los valores posibles de un byte en estas posiciones.',
      'No descartes ceros ni bytes altos.',
    ),
  ],
  hints: [
    'El bug no está en el loop de inversión.',
    '[]byte preserva los bytes originales.',
    'string(data) recompone exactamente esos bytes.',
  ],
  review: {
    success:
      'Encontraste un supuesto oculto usando una propiedad y semillas adversas. Esto es una muestra determinista; el fuzzing real genera y minimiza más entradas con go test -fuzz en un proyecto.',
    pitfall:
      'Invertir bytes puede producir texto UTF-8 inválido; acá es correcto por contrato y sería incorrecto para una interfaz de texto humano.',
  },
  transfer:
    'Creá FuzzReverseBytes y agregá las semillas; incluí el ejemplo abc para evitar una propiedad demasiado débil.',
  prediction: predict(
    '¿La identidad Reverse(Reverse(s))==s demuestra por sí sola que invertiste?',
    [
      'Sí, completamente',
      'No: devolver s sin cambiar también la cumple',
      'Sólo si s contiene ASCII',
    ],
    1,
    'Una propiedad necesita complementarse con ejemplos o propiedades que distingan implementaciones incorrectas.',
  ),
  sources: [
    { title: 'Tutorial oficial de fuzzing', url: 'https://go.dev/doc/tutorial/fuzz' },
    { title: 'Strings y bytes', url: 'https://go.dev/blog/strings' },
  ],
});
add(74, {
  title: 'Optimizar con una medición de memoria',
  kind: 'reparar',
  imports: ['strings', 'testing'],
  intro:
    'Un reporte concatena muchas piezas. Volver a construir la cadena completa en cada paso puede asignar memoria repetidamente. Vamos a observar asignaciones, sin competir por milisegundos.',
  why: 'strings.Builder permite preparar capacidad y escribir por partes. testing.AllocsPerRun mide el promedio de asignaciones de llamadas reales para esta implementación y entorno.',
  objective:
    'JoinParts concatena sin separadores y usa como máximo una asignación para el lote de prueba.',
  instructions: [
    'Calculá primero el total de bytes y usá Builder.Grow.',
    'Escribí cada parte con WriteString y devolvé String.',
  ],
  starter:
    'var JoinedSink string\nfunc JoinParts(parts []string) string {\n    out:=""\n    for _,part:=range parts {out=strings.Join([]string{out,part},"")}\n    return out\n}',
  solution:
    'var JoinedSink string\nfunc JoinParts(parts []string) string {\n    total:=0\n    for _,part:=range parts {total+=len(part)}\n    var builder strings.Builder\n    builder.Grow(total)\n    for _,part:=range parts {builder.WriteString(part)}\n    return builder.String()\n}',
  tests: [
    test(
      'Contenido exacto',
      'JoinParts([]string{"Go","/","Rust"})=="Go/Rust"',
      'Optimizar no autoriza cambiar la salida.',
      'No agregues espacios ni separadores.',
    ),
    test(
      'Vacío y Unicode',
      'JoinParts(nil)=="" && JoinParts([]string{"ni","ño","🚀"})=="niño🚀"',
      'La reserva cuenta bytes, pero preserva el texto.',
      'len(part) aporta el tamaño en bytes.',
    ),
    test(
      'Asignaciones observadas',
      'func() bool { parts:=make([]string,100);for i:=range parts{parts[i]="abcdef"};allocs:=testing.AllocsPerRun(10,func(){JoinedSink=JoinParts(parts)});return len(JoinedSink)==600 && allocs<=1 }()',
      'La medición distingue reconstrucciones repetidas de una reserva suficiente.',
      'Grow debe ocurrir antes de escribir y con la capacidad total.',
    ),
  ],
  hints: [
    'Sumá len de todas las partes.',
    'Un Builder empieza útil con su valor cero.',
    'Grow(total) evita ampliar el buffer varias veces.',
  ],
  review: {
    success:
      'La mejora preserva comportamiento y tiene evidencia de asignaciones para este lote. No demuestra un tiempo menor en todos los casos; un benchmark local debe comparar cargas representativas.',
    pitfall:
      'No copies un Builder ya usado. El presupuesto de asignaciones es una medición del entorno, no una promesa eterna del lenguaje.',
  },
  transfer: 'Creá benchmarks locales de ambas versiones y revisá allocs/op además de ns/op.',
  prediction: predict(
    '¿Menos asignaciones garantiza menos tiempo en toda entrada?',
    ['Sí, siempre', 'No; hay que medir cargas y costos relevantes', 'Sólo con strings ASCII'],
    1,
    'Las asignaciones son una métrica útil, pero el tiempo también depende de otros costos.',
  ),
  sources: [
    { title: 'strings.Builder', url: 'https://pkg.go.dev/strings#Builder' },
    { title: 'testing.AllocsPerRun', url: 'https://pkg.go.dev/testing#AllocsPerRun' },
  ],
});
add(75, {
  title: 'Tu taller termina con una herramienta del lenguaje',
  kind: 'reparar',
  imports: ['go/format', 'strings'],
  intro:
    'Construiste una acción para ordenar código Go. La biblioteca go/format conoce su sintaxis y formato; si recibe una fuente rota, debe explicar el problema en lugar de fingir éxito.',
  why: 'Formatear, compilar, testear y analizar son pasos distintos. format.Source resuelve formato y errores sintácticos, pero no reemplaza comprobación de tipos ni pruebas.',
  objective: 'FormatGo devuelve el código formateado o cadena vacía y el error de formato.',
  instructions: [
    'Conservá la llamada a format.Source.',
    'Propagá su error antes de devolver éxito; el formato debe ser idempotente.',
  ],
  starter:
    'func FormatGo(source string)(string,error){\n    out,_:=format.Source([]byte(source))\n    return string(out),nil\n}',
  solution:
    'func FormatGo(source string)(string,error){\n    out,err:=format.Source([]byte(source))\n    if err!=nil{return "",err}\n    return string(out),nil\n}',
  tests: [
    test(
      'Formato real',
      'func() bool { out,e:=FormatGo("package sample\\nfunc Double(n int)int{return n*2}\\n");return e==nil && strings.Contains(out,"func Double(n int) int") && strings.Contains(out,"n * 2") }()',
      'La herramienta aplica el formato sintáctico de Go.',
      'No basta recortar espacios a mano.',
    ),
    test(
      'Error informativo',
      'func() bool { out,e:=FormatGo("package sample\\nfunc Broken(");return out=="" && e!=nil }()',
      'La fuente rota no debe presentarse como un éxito vacío.',
      'No descartes el error de format.Source.',
    ),
    test(
      'Idempotencia',
      'func() bool { a,e:=FormatGo("package sample\\nvar Answer=42\\n");b,f:=FormatGo(a);return e==nil && f==nil && a==b }()',
      'Formatear dos veces no sigue cambiando el código.',
      'Retorná exactamente la salida de format.Source.',
    ),
  ],
  hints: [
    'Recibí out y err, no out y _.',
    'Si err != nil, retorná "", err.',
    'El camino exitoso termina con string(out), nil.',
  ],
  review: {
    success:
      'Terminaste el recorrido conectando código, documentación, pruebas y herramientas oficiales. Para practicar módulos, imports entre paquetes, archivos _test.go, fuzzing sostenido, perfiles y carreras, el siguiente paso es un proyecto local real.',
    pitfall:
      'Código formateado puede no compilar o estar lógicamente mal; ninguna herramienta aislada sustituye a las demás.',
  },
  transfer:
    'Llevá tu KV a un módulo: organizá paquetes, agregá tests y ejecutá formato, pruebas, race detector y benchmarks desde la terminal.',
  prediction: predict(
    'Si format.Source tiene éxito, el programa necesariamente…',
    [
      'Tiene sintaxis formateable, pero aún puede fallar en tipos o comportamiento',
      'Ya pasó todos los tests',
      'No tiene carreras',
    ],
    0,
    'Formatear resuelve un problema concreto, no verifica todos los aspectos del programa.',
  ),
  sources: [
    { title: 'go/format', url: 'https://pkg.go.dev/go/format' },
    { title: 'Estructura de código y módulos', url: 'https://go.dev/doc/code' },
  ],
});
add(76, {
  title: 'FizzBuzz: dos reglas que pueden coincidir',
  kind: 'reparar',
  intro:
    'El juego dice Fizz para múltiplos de 3, Buzz para múltiplos de 5 y FizzBuzz cuando ambas reglas coinciden. El orden de las decisiones importa cuando una condición contiene a otra.',
  why: 'El resto cero expresa divisibilidad. Revisar primero una condición menos específica puede ocultar el caso combinado con un retorno temprano.',
  objective: 'FizzBuzz recibe n positivo y devuelve Fizz, Buzz, FizzBuzz o el número decimal.',
  instructions: [
    'Atendé la coincidencia de ambas reglas antes de retornar por una sola.',
    'Para los demás números usá fmt.Sprintf con %d.',
  ],
  starter:
    'func FizzBuzz(n int) string {\n    if n%3==0{return "Fizz"}\n    if n%5==0{return "Buzz"}\n    return fmt.Sprintf("%d",n)\n}',
  solution:
    'func FizzBuzz(n int) string {\n    if n%3==0 && n%5==0{return "FizzBuzz"}\n    if n%3==0{return "Fizz"}\n    if n%5==0{return "Buzz"}\n    return fmt.Sprintf("%d",n)\n}',
  tests: [
    test(
      'Reglas separadas',
      'FizzBuzz(9)=="Fizz" && FizzBuzz(10)=="Buzz"',
      'Cada divisor activa su palabra.',
      'El resto de n dividido por el divisor debe ser cero.',
    ),
    test(
      'Reglas superpuestas',
      'FizzBuzz(15)=="FizzBuzz" && FizzBuzz(30)=="FizzBuzz"',
      'La intersección no debe quedar tapada por el primer retorno.',
      'Comprobá ambos divisores antes de los casos simples.',
    ),
    test(
      'Sin coincidencia',
      'FizzBuzz(1)=="1" && FizzBuzz(17)=="17"',
      'Los números ordinarios conservan su representación.',
      'No devuelvas una palabra por defecto para todo.',
    ),
  ],
  hints: [
    '15 cumple las dos condiciones.',
    'Usá && para expresar esa coincidencia.',
    'Un retorno previo impediría llegar al caso combinado.',
  ],
  review: {
    success:
      'Resolviste una superposición de reglas ordenando decisiones de específica a general. La misma idea aparece en validadores y rutas.',
    pitfall: 'Agregar más condiciones no alcanza si una rama anterior ya retorna.',
  },
  transfer:
    'Agregá una tercera palabra para múltiplos de 7 y diseñá cómo combinar reglas sin ocho ramas.',
  prediction: predict(
    'Si comprobás primero n%3==0 y retornás, n=15 produce…',
    ['FizzBuzz', 'Fizz', 'Buzz'],
    1,
    'La primera condición ya coincide y termina la función.',
  ),
});
add(77, {
  title: 'El engranaje de Euclides',
  intro:
    'Dos engranajes necesitan una unidad que divida sus cantidades sin sobrante. El máximo común divisor se puede encontrar reduciendo el par con restos sucesivos.',
  why: 'Los divisores comunes de a y b también dividen a%b. Reemplazar (a,b) por (b,a%b) reduce el problema hasta que el segundo valor es cero.',
  objective:
    'GCD calcula el máximo común divisor para enteros no negativos; GCD(0,0) se define como 0.',
  instructions: [
    'Mientras b no sea cero, actualizá ambos valores a la vez.',
    'Al terminar, devolvé a.',
  ],
  starter: 'func GCD(a,b int) int {\n    return a\n}',
  solution: 'func GCD(a,b int) int {\n    for b!=0 { a,b=b,a%b }\n    return a\n}',
  tests: [
    test(
      'Divisor compartido',
      'GCD(54,24)==6 && GCD(24,54)==6',
      'El orden de entrada no altera el resultado.',
      'La reducción debe usar el resto del par anterior.',
    ),
    test(
      'Coprimos',
      'GCD(17,5)==1',
      'Si sólo comparten la unidad, el resultado es 1.',
      'No alcanza con retornar el menor.',
    ),
    test(
      'Ceros definidos',
      'GCD(0,8)==8 && GCD(8,0)==8 && GCD(0,0)==0',
      'La guardia evita calcular un resto con divisor cero.',
      'Comprobá b antes de a%b.',
    ),
  ],
  hints: [
    'El loop termina cuando b == 0.',
    'La asignación múltiple conserva los valores originales de la derecha.',
    'Escribí a, b = b, a % b.',
  ],
  review: {
    success:
      'La solución avanza mediante una cantidad que disminuye y una propiedad que se conserva. Es una explicación del algoritmo, además de ejemplos que lo prueban.',
    pitfall:
      'El contrato excluye negativos; extenderlo requiere definir normalización y considerar el mínimo int.',
  },
  transfer: 'Usá GCD para simplificar una fracción positiva, cuidando denominador cero.',
  prediction: predict(
    'Después de un paso con (54,24), el par queda…',
    ['(24,6)', '(30,24)', '(6,0)'],
    0,
    '54%24 vale 6; el nuevo par es (24,6).',
  ),
});
add(78, {
  title: 'El guardián de los números primos',
  kind: 'reparar',
  intro:
    'Un número primo es mayor que 1 y sólo admite los divisores positivos 1 y él mismo. Si tiene un divisor grande, también tiene otro pequeño que forma su pareja.',
  why: 'Basta buscar divisores hasta la raíz cuadrada. La comparación d<=n/d evita multiplicar d*d y no necesita aritmética flotante.',
  objective: 'IsPrime decide si un int no negativo es primo.',
  instructions: [
    'Rechazá n menor que 2.',
    'Probá divisores y retorná false al encontrar un resto cero.',
  ],
  starter:
    'func IsPrime(n int) bool {\n    if n<2{return true}\n    for d:=2;d<=n/d;d++{if n%d==0{return false}}\n    return true\n}',
  solution:
    'func IsPrime(n int) bool {\n    if n<2{return false}\n    for d:=2;d<=n/d;d++{if n%d==0{return false}}\n    return true\n}',
  tests: [
    test(
      'Casos que no son primos',
      '!IsPrime(0) && !IsPrime(1)',
      'La definición exige ser mayor que 1.',
      'No confundir ausencia de divisores probados con primalidad.',
    ),
    test(
      'Primos pequeños',
      'IsPrime(2) && IsPrime(3) && IsPrime(97)',
      'No rechaza el primer primo ni los impares válidos.',
      'El loop debe empezar en 2.',
    ),
    test(
      'Compuestos y cuadrados',
      '!IsPrime(9) && !IsPrime(49) && !IsPrime(100)',
      'El divisor exactamente en la raíz debe revisarse.',
      'La comparación de límite incluye igualdad.',
    ),
  ],
  hints: [
    'El starter falla antes del loop.',
    '0 y 1 no cumplen la definición de primo.',
    'Conservá <= para detectar cuadrados perfectos.',
  ],
  review: {
    success:
      'Separaste los casos de definición del procedimiento general. La frontera de la raíz explica por qué 49 es una prueba importante.',
    pitfall:
      'Este método es educativo para números moderados; no es una herramienta de generación criptográfica de primos.',
  },
  transfer: 'Construí una lista de primos hasta N y compará el trabajo con una criba.',
  prediction: predict(
    'Para detectar que 49 no es primo, ¿hay que probar 7?',
    ['Sí, el límite es inclusivo', 'No, sólo menores que 7', 'No, todos los impares son primos'],
    0,
    '7×7=49: omitir el límite perdería ese divisor.',
  ),
});
add(79, {
  title: 'Contar las luces encendidas de un registro',
  intro:
    'Un registro de 32 bits representa interruptores. Necesitamos contar cuántos están encendidos, no obtener el valor numérico del registro.',
  why: 'n & (n-1) apaga el bit encendido de menor posición. Repetir esa operación avanza una vez por cada luz, hasta llegar a cero.',
  objective: 'BitCount devuelve la cantidad de bits 1 de un uint32.',
  instructions: [
    'Usá un contador y un loop mientras n sea distinto de cero.',
    'Apagá un bit por iteración sin usar paquetes adicionales.',
  ],
  starter: 'func BitCount(n uint32) int {\n    if n==0{return 0}\n    return 1\n}',
  solution:
    'func BitCount(n uint32) int {\n    count:=0\n    for n!=0 { n &= n-1; count++ }\n    return count\n}',
  tests: [
    test(
      'Patrón disperso',
      'BitCount(21)==3',
      '21 es 10101, con tres bits encendidos.',
      'Contá bits, no posiciones ni dígitos decimales.',
    ),
    test(
      'Vacío y extremo superior',
      'BitCount(0)==0 && BitCount(uint32(1)<<31)==1',
      'El último bit también pertenece al registro.',
      'No conviertas a un entero con signo antes de recorrer.',
    ),
    test(
      'Todos encendidos',
      'BitCount(^uint32(0))==32',
      'Debe procesar todo el ancho del tipo.',
      'Cada iteración elimina exactamente un bit 1.',
    ),
  ],
  hints: [
    'Probá en papel 10100 & 10011.',
    'El cero final indica que no quedan bits encendidos.',
    'La resta sólo se hace cuando n != 0.',
  ],
  review: {
    success:
      'Usaste una propiedad binaria para reducir trabajo. Los tests revisan el resultado; revisá la operación de reducción para justificar el algoritmo.',
    pitfall:
      'El ancho fijo importa: uint32 tiene 32 posiciones, mientras que int depende de la arquitectura.',
  },
  transfer: 'Compará tu función con bits.OnesCount32 de la biblioteca estándar.',
  prediction: predict(
    'Para n=12 (1100), n&(n-1) vale…',
    ['8 (1000)', '4 (0100)', '0'],
    0,
    '1100 & 1011 elimina el bit 0100 y deja 1000.',
  ),
  sources: [
    { title: 'Operadores bit a bit', url: 'https://go.dev/ref/spec#Arithmetic_operators' },
    { title: 'math/bits.OnesCount32', url: 'https://pkg.go.dev/math/bits#OnesCount32' },
  ],
});
add(80, {
  title: 'Dos turnos, una franja compartida',
  intro:
    'Los turnos se representan como intervalos [inicio, fin): incluyen el comienzo y excluyen el final. Tocar un extremo no equivale a compartir tiempo.',
  why: 'La intersección empieza en el mayor inicio y termina en el menor final. Sólo existe duración compartida si el primero es estrictamente menor que el segundo.',
  objective:
    'Overlap devuelve inicio, fin y true para una intersección no vacía; en otro caso 0,0,false.',
  instructions: [
    'Rechazá intervalos invertidos o vacíos.',
    'Compará el mayor inicio con el menor final.',
  ],
  starter:
    'func Overlap(aStart,aEnd,bStart,bEnd int)(int,int,bool){\n    return aStart,aEnd,true\n}',
  solution:
    'func Overlap(aStart,aEnd,bStart,bEnd int)(int,int,bool){\n    if aStart>=aEnd || bStart>=bEnd{return 0,0,false}\n    start,end:=aStart,aEnd\n    if bStart>start{start=bStart}\n    if bEnd<end{end=bEnd}\n    if start>=end{return 0,0,false}\n    return start,end,true\n}',
  tests: [
    test(
      'Cruce real',
      'func() bool {a,b,ok:=Overlap(2,8,5,10);return ok && a==5 && b==8}()',
      'Selecciona las fronteras interiores.',
      'No devuelvas uno de los turnos completos.',
    ),
    test(
      'Extremos que se tocan',
      'func() bool {a,b,ok:=Overlap(1,3,3,5);return !ok && a==0 && b==0}()',
      'El final exclusivo no aporta duración.',
      'start == end corresponde a una intersección vacía.',
    ),
    test(
      'Contención e intervalo inválido',
      'func() bool {a,b,ok:=Overlap(-3,9,0,2);_,_,bad:=Overlap(4,1,0,8);return ok && a==0 && b==2 && !bad}()',
      'Contener completamente otro turno es un caso válido.',
      'Validá el orden de cada intervalo antes de combinarlo.',
    ),
  ],
  hints: [
    'Elegí el máximo de los inicios.',
    'Elegí el mínimo de los finales.',
    'Usá start < end para decidir si quedó tiempo compartido.',
  ],
  review: {
    success:
      'La convención de extremos quedó incorporada en los tests. Esa precisión evita que un turno que termina a las 3 choque con otro que empieza a las 3.',
    pitfall: 'Cambiar de intervalos semiabiertos a cerrados altera la condición de intersección.',
  },
  transfer:
    'Definí un contrato para combinar turnos adyacentes sin confundir unión con intersección.',
  prediction: predict(
    '¿[1,3) y [3,5) comparten duración?',
    ['Sí, dos unidades', 'Sí, el instante 3 pertenece a ambos', 'No'],
    2,
    '3 queda fuera del primer intervalo.',
  ),
});

add(81, {
  title: 'Anagramas con inventario de runes',
  intro:
    'Dos palabras son anagramas en este juego si contienen exactamente los mismos puntos de código con las mismas cantidades. Respetamos mayúsculas, espacios y formas Unicode.',
  why: 'Un mapa de frecuencias distingue pertenencia de multiplicidad. Recorrer runes evita tratar cada byte de una letra multibyte como una letra separada.',
  objective:
    'Anagram compara strings UTF-8 válidos sin normalizar ni ignorar ningún punto de código.',
  instructions: [
    'Contá cada rune del primer string.',
    'Restá las del segundo y verificá que no quede diferencia.',
  ],
  starter: 'func Anagram(a,b string) bool {\n    return a==b\n}',
  solution:
    'func Anagram(a,b string) bool {\n    counts:=make(map[rune]int)\n    for _,r:=range a{counts[r]++}\n    for _,r:=range b{counts[r]--}\n    for _,n:=range counts{if n!=0{return false}}\n    return true\n}',
  tests: [
    test(
      'Orden distinto, mismas cantidades',
      'Anagram("listen","silent") && Anagram("ñ🙂a","a🙂ñ")',
      'El orden no importa, la multiplicidad sí.',
      'Comparar los strings directamente no reconoce permutaciones.',
    ),
    test(
      'Cantidad y mayúsculas',
      '!Anagram("aab","abb") && !Anagram("Go","go")',
      'Un conjunto de runes sin conteos sería insuficiente.',
      'Conservá el contrato sensible a mayúsculas.',
    ),
    test(
      'Vacíos y formas Unicode distintas',
      'Anagram("","") && !Anagram("é","e\u0301")',
      'Una forma compuesta y otra descompuesta no son las mismas runes.',
      'No prometas equivalencia visual sin normalización explícita.',
    ),
  ],
  hints: [
    'Usá map[rune]int.',
    'Los conteos del segundo texto pueden restarse.',
    'Al final todos los valores deben ser cero.',
  ],
  review: {
    success:
      'Expresaste una comparación de multiconjuntos. El contrato es preciso sobre Unicode: compara puntos de código, no apariencia ni equivalencia lingüística.',
    pitfall:
      'Para ignorar acentos o equivalencias canónicas necesitarías reglas de normalización adicionales.',
  },
  transfer:
    'Diseñá otra versión que ignore espacios y mayúsculas, documentando exactamente qué transforma.',
  prediction: predict(
    '¿Un set de runes alcanza para distinguir aab de abb?',
    ['Sí, siempre', 'No, ambas contienen a y b', 'Sólo si están ordenadas'],
    1,
    'Necesitás cuántas veces aparece cada rune, no sólo si existe.',
  ),
});
add(82, {
  title: 'Empaquetar repeticiones consecutivas',
  intro:
    'Una transmisión repite símbolos. RLE agrupa rachas consecutivas: aaabb pasa a dos grupos, pero aba conserva tres porque las a no son vecinas.',
  why: 'Mantener el último grupo permite decidir entre ampliarlo o crear otro. Usar un struct evita ambigüedades de formatos como a12 cuando los símbolos pueden ser dígitos.',
  objective:
    'Runs convierte texto UTF-8 válido en []Run con Symbol rune y Count int, preservando rachas.',
  instructions: [
    'Si la rune coincide con el último grupo, incrementá Count.',
    'Si es diferente, agregá un grupo con Count=1.',
  ],
  starter:
    'type Run struct { Symbol rune; Count int }\nfunc Runs(text string) []Run {\n    out:=[]Run{}\n    for _,r:=range text{out=append(out,Run{r,1})}\n    return out\n}',
  solution:
    'type Run struct { Symbol rune; Count int }\nfunc Runs(text string) []Run {\n    out:=[]Run{}\n    for _,r:=range text {\n        if len(out)>0 && out[len(out)-1].Symbol==r {out[len(out)-1].Count++} else {out=append(out,Run{r,1})}\n    }\n    return out\n}',
  tests: [
    test(
      'Rachas largas',
      "func() bool {r:=Runs(\"aaabb\");return len(r)==2 && r[0]==(Run{'a',3}) && r[1]==(Run{'b',2})}()",
      'Agrupa únicamente símbolos vecinos.',
      'Actualizá el último elemento del slice.',
    ),
    test(
      'Reaparición separada',
      'func() bool {r:=Runs("aba");return len(r)==3 && r[0].Count==1 && r[2].Symbol==\'a\'}()',
      'No es un histograma global.',
      'La última rune importa, no si apareció alguna vez.',
    ),
    test(
      'Unicode y vacío',
      'func() bool {r:=Runs("🙂🙂ñ");return len(Runs(""))==0 && len(r)==2 && r[0]==(Run{\'🙂\',2}) && r[1]==(Run{\'ñ\',1})}()',
      'Cuenta runes sin partirlas en bytes.',
      'range sobre string decodifica runes.',
    ),
  ],
  hints: [
    'Antes de mirar el último grupo, verificá len(out)>0.',
    'La posición final es len(out)-1.',
    'Un grupo nuevo empieza con cantidad 1.',
  ],
  review: {
    success:
      'Modelaste una secuencia de grupos, no un conjunto de frecuencias. La representación estructurada permite reconstruir el texto sin adivinar dónde terminan los conteos.',
    pitfall:
      'RLE puede agrandar datos sin repeticiones; comprimir no garantiza reducir cualquier entrada.',
  },
  transfer: 'Implementá la operación inversa y probá que decodificar Runs(text) conserve el texto.',
  prediction: predict(
    'Runs("aba") genera cuántos grupos?',
    ['2', '3', '1'],
    1,
    'Las dos a no son consecutivas y pertenecen a grupos distintos.',
  ),
});
add(83, {
  title: 'El detector de palabras del chat',
  kind: 'reparar',
  imports: ['strings', 'unicode'],
  intro:
    'El chat mezcla puntuación y mayúsculas. Acá una palabra es una secuencia máxima de letras Unicode o dígitos; cualquier otro símbolo la separa.',
  why: 'FieldsFunc permite definir separadores por rune. ToLower aplica minúsculas simples de Unicode; no implementa por sí solo normalización ni todas las equivalencias de case folding.',
  objective: 'WordCounts devuelve frecuencias de palabras en minúsculas según esa definición.',
  instructions: [
    'Conservá la separación por letras y dígitos.',
    'Acumulá repeticiones en vez de asignar siempre uno.',
  ],
  starter:
    'func WordCounts(text string) map[string]int {\n    words:=strings.FieldsFunc(strings.ToLower(text),func(r rune)bool{return !unicode.IsLetter(r) && !unicode.IsDigit(r)})\n    out:=make(map[string]int)\n    for _,word:=range words{out[word]=1}\n    return out\n}',
  solution:
    'func WordCounts(text string) map[string]int {\n    words:=strings.FieldsFunc(strings.ToLower(text),func(r rune)bool{return !unicode.IsLetter(r) && !unicode.IsDigit(r)})\n    out:=make(map[string]int)\n    for _,word:=range words{out[word]++}\n    return out\n}',
  tests: [
    test(
      'Mayúsculas y puntuación',
      'func() bool {m:=WordCounts("Go, go! GO?");return len(m)==1 && m["go"]==3}()',
      'La normalización precede al conteo.',
      'Incrementá el contador existente.',
    ),
    test(
      'Letras Unicode y números',
      'func() bool {m:=WordCounts("Niño niño 42-42");return len(m)==2 && m["niño"]==2 && m["42"]==2}()',
      'Los dígitos forman palabras según este contrato.',
      'El guion es separador, no parte del token.',
    ),
    test(
      'Sólo separadores y límites',
      'func() bool {m:=WordCounts("a_b");return len(WordCounts(" ! 🙂 "))==0 && len(m)==2 && m["a"]==1 && m["b"]==1}()',
      'No crea palabras vacías ni incluye underscore.',
      'Usá exactamente la definición letras-o-dígitos.',
    ),
  ],
  hints: [
    'El parser ya produce las palabras correctas.',
    'El map tiene cero para una clave nueva.',
    'Cambiá la actualización a out[word]++.',
  ],
  review: {
    success:
      'La definición de palabra es verificable y evita expectativas implícitas. Es una tokenización educativa; idiomas sin separadores y marcas combinantes necesitan reglas más elaboradas.',
    pitfall:
      'No afirmes que esta función cuenta palabras humanas correctamente en todos los idiomas.',
  },
  transfer:
    'Decidí si el apóstrofo o las marcas combinantes deberían pertenecer a una palabra y agregá tests.',
  prediction: predict(
    'Según este contrato, a_b contiene…',
    ['Una palabra a_b', 'Dos palabras: a y b', 'Ninguna palabra'],
    1,
    'Underscore no es letra ni dígito y actúa como separador.',
  ),
  sources: [
    { title: 'unicode.IsLetter e IsDigit', url: 'https://pkg.go.dev/unicode' },
    { title: 'strings.FieldsFunc', url: 'https://pkg.go.dev/strings#FieldsFunc' },
  ],
});
add(84, {
  title: 'La ventana sin símbolos repetidos',
  intro:
    'Buscás la mayor racha contigua de runes sin repetir. Cuando aparece una repetida dentro de la ventana actual, su inicio debe saltar después de la aparición anterior.',
  why: 'Guardar el último índice de cada rune evita volver a comparar toda la ventana. El inicio nunca retrocede: una aparición que quedó afuera no invalida el tramo actual.',
  objective:
    'LongestUnique devuelve la longitud en runes del tramo contiguo más largo sin duplicados.',
  instructions: [
    'Usá índices de runes, no offsets de bytes.',
    'Actualizá start sólo si la aparición previa está dentro de la ventana.',
  ],
  starter:
    'func LongestUnique(text string) int {\n    seen:=make(map[rune]bool)\n    for _,r:=range text{seen[r]=true}\n    return len(seen)\n}',
  solution:
    'func LongestUnique(text string) int {\n    last:=make(map[rune]int)\n    start,best:=0,0\n    for i,r:=range []rune(text) {\n        if prev,ok:=last[r];ok && prev>=start{start=prev+1}\n        last[r]=i\n        if length:=i-start+1;length>best{best=length}\n    }\n    return best\n}',
  tests: [
    test(
      'Ventana, no conjunto global',
      'LongestUnique("dvdf")==3 && LongestUnique("abba")==2 && LongestUnique("aabbcc")==2',
      'La longitud debe corresponder a un tramo contiguo; aabbcc tiene tres símbolos distintos pero ninguna ventana válida de tres.',
      'No cuentes sólo runes distintas en todo el texto.',
    ),
    test(
      'Unicode con índices coherentes',
      'LongestUnique("你好你🙂")==3',
      'Los índices y longitudes usan runes.',
      'range sobre el string entrega offsets de bytes; acá recorré []rune.',
    ),
    test(
      'Vacío y repetición total',
      'LongestUnique("")==0 && LongestUnique("aaaa")==1',
      'La ventana puede empezar vacía y tener un único símbolo.',
      'El máximo no debe inicializarse artificialmente en 1.',
    ),
  ],
  hints: [
    'El mapa guarda índice, no un bool.',
    'Si prev < start, esa repetición ya quedó fuera.',
    'La longitud actual es i-start+1.',
  ],
  review: {
    success:
      'La ventana mantiene una invariancia: dentro no hay símbolos repetidos. Cada paso usa esa invariancia para avanzar sin reiniciar desde cero.',
    pitfall: 'Contar runes no equivale a contar grafemas visuales; el contrato vuelve a importar.',
  },
  transfer: 'Devolvé también el tramo ganador y definí qué hacer ante empates.',
  prediction: predict(
    'Si una rune apareció antes de start, conviene mover start hacia atrás…',
    ['Sí', 'No, ya estaba fuera de la ventana', 'Sólo si era ASCII'],
    1,
    'Retroceder reintroduciría posiciones descartadas y podría romper la invariancia.',
  ),
});
add(85, {
  title: 'Una ruta lógica sin escapar de la raíz',
  imports: ['strings'],
  intro:
    'Tu árbol virtual usa rutas absolutas con /. Un punto conserva la ubicación y dos puntos retroceden un segmento. Intentar subir por encima de la raíz es un error.',
  why: 'Un slice puede actuar como pila de segmentos. Este es un modelo lógico: no consulta archivos ni resuelve enlaces simbólicos del sistema operativo.',
  objective:
    'CleanRoute normaliza una ruta absoluta, colapsa barras y rechaza cualquier .. que supere la raíz.',
  instructions: [
    'Rechazá entradas que no empiecen con /.',
    'Procesá segmentos en orden con una pila; devolvé / si queda vacía.',
  ],
  starter:
    'func CleanRoute(route string)(string,error){\n    return strings.TrimSpace(route),nil\n}',
  solution:
    'func CleanRoute(route string)(string,error){\n    if !strings.HasPrefix(route,"/"){return "",fmt.Errorf("ruta no absoluta")}\n    stack:=[]string{}\n    for _,part:=range strings.Split(route,"/") {\n        switch part {\n        case "",".":\n        case "..": if len(stack)==0{return "",fmt.Errorf("fuera de la raíz")};stack=stack[:len(stack)-1]\n        default:stack=append(stack,part)\n        }\n    }\n    return "/"+strings.Join(stack,"/"),nil\n}',
  tests: [
    test(
      'Segmentos y barras',
      'func() bool {s,e:=CleanRoute("/a//b/../c/.");return e==nil && s=="/a/c"}()',
      'Cada .. deshace el segmento previo.',
      'Un reemplazo de texto no conoce la estructura.',
    ),
    test(
      'Raíz válida',
      'func() bool {a,e:=CleanRoute("/a/..");b,f:=CleanRoute("/");return e==nil && f==nil && a=="/" && b=="/"}()',
      'Volver exactamente a la raíz está permitido.',
      'La raíz es /, no una cadena vacía.',
    ),
    test(
      'Escape y ruta relativa',
      'func() bool {for _,s:=range []string{"/../x","/a/../../x","a/b",""}{out,e:=CleanRoute(s);if e==nil || out!=""{return false}};return true}()',
      'Rechaza un escape en el momento en que ocurre.',
      'No normalices una ruta relativa como si fuera absoluta.',
    ),
  ],
  hints: [
    'Ignorá segmentos vacíos y .',
    '.. necesita un elemento existente para retirar.',
    'Los demás segmentos se agregan sin cambiar su texto.',
  ],
  review: {
    success:
      'La pila interpreta navegación paso a paso con un límite explícito. Este ejercicio no implementa una barrera de seguridad de filesystem real.',
    pitfall:
      'En archivos reales, enlaces simbólicos, volumen, plataforma y carreras pueden cambiar el significado de una ruta.',
  },
  transfer:
    'Definí si un segmento con espacios debe conservarse o rechazarse y probá esa política.',
  prediction: predict(
    '¿/a/../../b debería convertirse silenciosamente en /b?',
    ['Sí, siempre', 'No: intenta superar la raíz', 'Sólo si b existe'],
    1,
    'El contrato rechaza el intento de escape cuando se encuentra el segundo ...',
  ),
  sources: [{ title: 'strings.Split y Join', url: 'https://pkg.go.dev/strings' }],
});

add(86, {
  title: 'Una pila que recuerda su mínimo',
  kind: 'reparar',
  intro:
    'El inventario necesita Push, Pop y Minimum. Una segunda pila puede guardar el mínimo observado a cada profundidad, de modo que retirar un elemento restaure el mínimo anterior.',
  why: 'Cada posición de mins resume el prefijo correspondiente de values. Ambas pilas deben crecer y reducirse juntas para conservar esa relación.',
  objective: 'Corregí Push para que Minimum entregue el mínimo de los valores todavía presentes.',
  instructions: [
    'Conservá Pop y Minimum.',
    'Al agregar n, guardá el menor entre n y el mínimo anterior.',
  ],
  starter:
    'type MinStack struct { values,mins []int }\nfunc(s *MinStack) Push(n int){s.values=append(s.values,n);s.mins=append(s.mins,n)}\nfunc(s *MinStack) Pop()(int,bool){if len(s.values)==0{return 0,false};i:=len(s.values)-1;n:=s.values[i];s.values=s.values[:i];s.mins=s.mins[:i];return n,true}\nfunc(s *MinStack) Minimum()(int,bool){if len(s.mins)==0{return 0,false};return s.mins[len(s.mins)-1],true}',
  solution:
    'type MinStack struct { values,mins []int }\nfunc(s *MinStack) Push(n int){\n    low:=n\n    if len(s.mins)>0 && s.mins[len(s.mins)-1]<low{low=s.mins[len(s.mins)-1]}\n    s.values=append(s.values,n);s.mins=append(s.mins,low)\n}\nfunc(s *MinStack) Pop()(int,bool){if len(s.values)==0{return 0,false};i:=len(s.values)-1;n:=s.values[i];s.values=s.values[:i];s.mins=s.mins[:i];return n,true}\nfunc(s *MinStack) Minimum()(int,bool){if len(s.mins)==0{return 0,false};return s.mins[len(s.mins)-1],true}',
  tests: [
    test(
      'Mínimo que reaparece',
      'func() bool {var s MinStack;s.Push(3);s.Push(1);s.Push(2);a,_:=s.Minimum();s.Pop();s.Pop();b,_:=s.Minimum();return a==1 && b==3}()',
      'La cima y el mínimo no son necesariamente el mismo dato.',
      'Cada profundidad recuerda el mínimo de su prefijo.',
    ),
    test(
      'Duplicados mínimos',
      'func() bool {var s MinStack;s.Push(1);s.Push(1);s.Pop();n,ok:=s.Minimum();return ok && n==1}()',
      'Retirar una copia no elimina la otra.',
      'Guardá un mínimo por nivel, incluso si se repite.',
    ),
    test(
      'Pila vacía',
      'func() bool {var s MinStack;n,a:=s.Pop();m,b:=s.Minimum();return !a && !b && n==0 && m==0}()',
      'La ausencia se informa sin panic.',
      'No indexes una pila vacía.',
    ),
  ],
  hints: [
    'El mínimo previo está al final de mins.',
    'El mínimo nuevo puede permanecer igual.',
    'values guarda n; mins guarda low.',
  ],
  review: {
    success:
      'Guardaste información auxiliar para acelerar una consulta manteniendo una invariancia entre estructuras. Los tests observan respuestas; la forma de la representación explica el costo constante de Minimum.',
    pitfall:
      'Si una operación modifica sólo una de las dos pilas, la relación entre sus posiciones se rompe.',
  },
  transfer: 'Agregá Maximum y compará el costo adicional de memoria.',
  prediction: predict(
    'Al insertar 8 cuando el mínimo actual es 3, el nuevo mínimo guardado es…',
    ['8', '3', '11'],
    1,
    'El prefijo ampliado todavía contiene el 3.',
  ),
});
add(87, {
  title: 'Cerrar la puerta correcta',
  intro:
    'Los paréntesis, corchetes y llaves deben cerrar el último grupo abierto. Contar aperturas y cierres no alcanza: ([)] tiene cantidades correctas y anidamiento incorrecto.',
  why: 'Una pila representa las aperturas pendientes. Cada cierre debe coincidir con su cima y retirarla; al final no puede quedar ningún grupo abierto.',
  objective:
    'Balanced valida (), [] y {}; ignora los demás caracteres, sin reglas de strings ni comentarios.',
  instructions: [
    'Apilá aperturas y compará cada cierre con la última.',
    'Rechazá cierres sin apertura y pilas no vacías al terminar.',
  ],
  starter: 'func Balanced(text string) bool {\n    return len(text)%2==0\n}',
  solution:
    "func Balanced(text string) bool {\n    stack:=[]rune{}\n    pairs:=map[rune]rune{')':'(',']':'[','}':'{'}\n    for _,r:=range text {\n        if r=='(' || r=='[' || r=='{'{stack=append(stack,r);continue}\n        if open,closing:=pairs[r];closing {\n            if len(stack)==0 || stack[len(stack)-1]!=open{return false}\n            stack=stack[:len(stack)-1]\n        }\n    }\n    return len(stack)==0\n}",
  tests: [
    test(
      'Anidamiento correcto',
      'Balanced("{a:[b(c)]}") && Balanced("()[]{}")',
      'Puede haber grupos anidados o consecutivos.',
      'Ignorá los caracteres ajenos a estos seis delimitadores.',
    ),
    test(
      'Orden incorrecto',
      '!Balanced("([)]") && !Balanced(")(")',
      'Las cantidades totales no prueban orden válido.',
      'El cierre debe corresponder a la cima.',
    ),
    test(
      'Pendientes, vacío y texto',
      '!Balanced("((") && Balanced("") && Balanced("hola🙂")',
      'El texto sin grupos es válido; las aperturas pendientes no.',
      'Revisá la pila al terminar.',
    ),
  ],
  hints: [
    'Un map de cierre a apertura simplifica la comparación.',
    'La cima está en len(stack)-1.',
    'Sólo retires la cima después de comprobar coincidencia.',
  ],
  review: {
    success:
      'Usaste estado pendiente para comprobar estructura anidada. Es un validador de delimitadores, no un parser completo de Go o de JSON.',
    pitfall:
      'Un paréntesis dentro de comillas sigue contando aquí porque este contrato no interpreta literales.',
  },
  transfer:
    'Devolvé la posición del primer error y decidí cómo informar una apertura nunca cerrada.',
  prediction: predict(
    '¿Por qué ([)] falla aunque cada tipo aparezca dos veces?',
    [
      'Porque hay cuatro símbolos',
      'Porque ) intenta cerrar antes al grupo equivocado',
      'Porque corchetes y paréntesis no pueden mezclarse',
    ],
    1,
    'La última apertura pendiente era [, que exige ].',
  ),
});
add(88, {
  title: 'El lugar de inserción entre duplicados',
  kind: 'reparar',
  intro:
    'Tu ranking está ordenado y puede contener empates. Querés insertar antes del primer elemento mayor o igual al objetivo, incluso si ese valor ya aparece varias veces.',
  why: 'Buscar un límite es distinto de encontrar cualquier coincidencia. Cuando el centro es igual al objetivo, la respuesta todavía puede estar más a la izquierda.',
  objective:
    'LowerBound devuelve el primer índice con values[i]>=target, o len(values) si ninguno cumple.',
  instructions: [
    'Usá búsqueda binaria en el intervalo [low,high).',
    'En igualdad seguí buscando hacia la izquierda.',
  ],
  starter:
    'func LowerBound(values []int,target int) int {\n    low,high:=0,len(values)\n    for low<high {mid:=low+(high-low)/2;if values[mid]<=target{low=mid+1}else{high=mid}}\n    return low\n}',
  solution:
    'func LowerBound(values []int,target int) int {\n    low,high:=0,len(values)\n    for low<high {mid:=low+(high-low)/2;if values[mid]<target{low=mid+1}else{high=mid}}\n    return low\n}',
  tests: [
    test(
      'Primer duplicado',
      'LowerBound([]int{1,3,3,3,8},3)==1',
      'Debe apuntar al comienzo del bloque de iguales.',
      'La igualdad pertenece a la mitad donde puede estar la respuesta.',
    ),
    test(
      'Huecos y extremos',
      'LowerBound([]int{2,5,9},4)==1 && LowerBound([]int{2,5,9},10)==3 && LowerBound([]int{2,5,9},0)==0',
      'También define posiciones de inserción para valores ausentes.',
      'len(values) es una respuesta válida al final.',
    ),
    test(
      'Vacío y todos iguales',
      'LowerBound(nil,7)==0 && LowerBound([]int{4,4},4)==0',
      'Los límites siguen funcionando sin elementos o sin variedad.',
      'No retornes un índice arbitrario al ver igualdad.',
    ),
  ],
  hints: [
    'El starter busca el primer elemento estrictamente mayor.',
    'Para lower bound, descartá el centro sólo si es menor.',
    'Cambiá <= por < en esa decisión.',
  ],
  review: {
    success:
      'Definiste una frontera estable en una colección con duplicados. Ese índice sirve para insertar y para construir búsquedas de rangos iguales.',
    pitfall:
      'La precondición es orden ascendente; verificarla requeriría trabajo adicional y no lo hace esta función.',
  },
  transfer:
    'Implementá UpperBound y calculá cuántas veces aparece un objetivo con la diferencia de límites.',
  prediction: predict(
    'Si values[mid]==target, LowerBound debe…',
    ['Retornar mid siempre', 'Continuar hacia la izquierda', 'Descartar toda la izquierda'],
    1,
    'Todavía puede haber otro igual en una posición anterior.',
  ),
  sources: [
    { title: 'sort.Search y búsqueda de fronteras', url: 'https://pkg.go.dev/sort#Search' },
  ],
});
add(89, {
  title: 'La suma que se desliza',
  intro:
    'Un monitor suma cada bloque contiguo de k muestras. Entre ventanas vecinas sale un valor y entra otro: no hace falta volver a sumar el bloque completo.',
  why: 'La suma anterior conserva casi todo el trabajo. Restar el elemento que sale y sumar el que entra actualiza exactamente la nueva ventana.',
  objective:
    'WindowSums devuelve sumas de ventanas de ancho k; k<=0 es error y k>len(values) produce una salida vacía válida.',
  instructions: [
    'Calculá la primera ventana una vez.',
    'Deslizá la suma y conservá el orden de las ventanas.',
  ],
  starter:
    'func WindowSums(values []int,k int)([]int,error){\n    if k<=0{return nil,fmt.Errorf("ancho inválido")}\n    return []int{},nil\n}',
  solution:
    'func WindowSums(values []int,k int)([]int,error){\n    if k<=0{return nil,fmt.Errorf("ancho inválido")}\n    out:=[]int{}\n    if k>len(values){return out,nil}\n    sum:=0\n    for i:=0;i<k;i++{sum+=values[i]}\n    out=append(out,sum)\n    for i:=k;i<len(values);i++{sum+=values[i]-values[i-k];out=append(out,sum)}\n    return out,nil\n}',
  tests: [
    test(
      'Ventanas vecinas',
      'func() bool {out,e:=WindowSums([]int{1,3,2,6,4},3);return e==nil && fmt.Sprint(out)=="[6 11 12]"}()',
      'Cada ventana avanza una posición.',
      'Restá values[i-k] antes de conservar el nuevo total.',
    ),
    test(
      'Signos y ancho uno',
      'func() bool {a,e:=WindowSums([]int{-2,5,-1},2);b,f:=WindowSums([]int{-2,5},1);return e==nil && f==nil && fmt.Sprint(a)=="[3 4]" && fmt.Sprint(b)=="[-2 5]"}()',
      'La actualización conserva signos y funciona con una sola muestra.',
      'No descartes negativos ni cambies la longitud de ventana.',
    ),
    test(
      'No cabe y ancho inválido',
      'func() bool {a,e:=WindowSums(nil,1);b,f:=WindowSums([]int{1},3);_,g:=WindowSums([]int{1},0);return e==nil && f==nil && len(a)==0 && len(b)==0 && g!=nil}()',
      'No existir una ventana es distinto de pedir ancho inválido.',
      'Validá k antes de preparar la primera suma.',
    ),
  ],
  hints: [
    'La primera suma usa posiciones 0 hasta k-1.',
    'Al entrar i, sale i-k.',
    'Hay len(values)-k+1 ventanas cuando k cabe.',
  ],
  review: {
    success:
      'La suma es un estado derivado que se actualiza localmente. Los tests comprueban valores; el loop de actualización explica por qué evitás recomputar cada bloque.',
    pitfall: 'Las sumas usan int; cantidades fuera de su rango requieren otro contrato numérico.',
  },
  transfer: 'Devolvé promedios flotantes usando estas sumas y la conversión antes de dividir.',
  prediction: predict(
    'Al avanzar una ventana de k elementos, cambian…',
    ['Todos los elementos necesariamente', 'El que sale y el que entra', 'Sólo el tamaño'],
    1,
    'Los k-1 elementos centrales permanecen en común.',
  ),
});
add(90, {
  title: 'Girar el tablero sin deformarlo',
  intro:
    'Un tablero rectangular gira 90 grados en sentido horario. Si tenía R filas y C columnas, el resultado tendrá C filas y R columnas.',
  why: 'La posición (r,c) se transforma en (c,R-1-r). Un slice de slices no garantiza forma rectangular por su tipo, así que tenemos que validarla.',
  objective:
    'RotateGrid crea un tablero girado e independiente; rechaza filas de distinta longitud.',
  instructions: [
    'Validá que todas las filas tengan la misma longitud.',
    'Reservá nuevas filas y aplicá la transformación de coordenadas; vacío produce vacío.',
  ],
  starter: 'func RotateGrid(grid [][]int)([][]int,error){\n    return grid,nil\n}',
  solution:
    'func RotateGrid(grid [][]int)([][]int,error){\n    if len(grid)==0{return [][]int{},nil}\n    rows,cols:=len(grid),len(grid[0])\n    for _,row:=range grid{if len(row)!=cols{return nil,fmt.Errorf("tablero irregular")}}\n    out:=make([][]int,cols)\n    for c:=0;c<cols;c++{out[c]=make([]int,rows)}\n    for r,row:=range grid{for c,value:=range row{out[c][rows-1-r]=value}}\n    return out,nil\n}',
  tests: [
    test(
      'Rectángulo no cuadrado',
      'func() bool {out,e:=RotateGrid([][]int{{1,2,3},{4,5,6}});return e==nil && fmt.Sprint(out)=="[[4 1] [5 2] [6 3]]"}()',
      'Intercambia dimensiones y gira en el sentido pedido.',
      'No confundas giro con simple transposición.',
    ),
    test(
      'Memoria independiente',
      'func() bool {src:=[][]int{{7}};out,e:=RotateGrid(src);if e!=nil || len(out)!=1 || len(out[0])!=1{return false};out[0][0]=99;return src[0][0]==7}()',
      'Modificar el tablero nuevo no altera el anterior.',
      'Cada fila de salida necesita almacenamiento propio.',
    ),
    test(
      'Irregular y vacío',
      'func() bool {a,e:=RotateGrid([][]int{{1,2},{3}});b,f:=RotateGrid(nil);c,g:=RotateGrid([][]int{{},{}});return a==nil && e!=nil && f==nil && g==nil && len(b)==0 && len(c)==0}()',
      'Valida forma antes de indexar y acepta tableros sin celdas.',
      'La longitud de la primera fila no valida las demás.',
    ),
  ],
  hints: [
    'La cantidad de filas nuevas es cols.',
    'La columna nueva es rows-1-r.',
    'La fila nueva es c.',
  ],
  review: {
    success:
      'La transformación conecta una regla de coordenadas con una representación dinámica. La prueba rectangular detecta errores que un tablero cuadrado puede ocultar.',
    pitfall: 'Copiar sólo el slice externo seguiría compartiendo las filas internas.',
  },
  transfer: 'Aplicá el giro cuatro veces y diseñá una prueba que recupere el tablero original.',
  prediction: predict(
    'Un tablero de 2 filas y 3 columnas girado tendrá…',
    ['2 filas y 3 columnas', '3 filas y 2 columnas', '6 filas y 1 columna'],
    1,
    'Las dimensiones intercambian sus roles.',
  ),
});

add(91, {
  title: 'Palabras entre comillas sin inventar un shell',
  imports: ['strings', 'unicode'],
  intro:
    'Tu consola admite grupos entre comillas dobles para conservar espacios. Las partes contiguas se unen: ab" c" forma un solo token ab c. No hay escapes ni expansión de variables.',
  why: 'Un estado inQuotes cambia qué significa un espacio. Además, una marca started permite conservar un token explícitamente vacío como "".',
  objective:
    'Tokens separa por whitespace fuera de comillas, elimina las comillas y rechaza una apertura sin cierre.',
  instructions: [
    'Recorré runes alternando el estado al ver comillas dobles.',
    'Separá tokens sólo fuera de comillas y conservá grupos vacíos explícitos.',
  ],
  starter:
    'func Tokens(text string)([]string,error){\n    _=unicode.IsSpace\n    return strings.Fields(text),nil\n}',
  solution:
    'func Tokens(text string)([]string,error){\n    out:=[]string{}\n    var token strings.Builder\n    quoted,started:=false,false\n    for _,r:=range text {\n        if r==\'"\'{quoted=!quoted;started=true;continue}\n        if unicode.IsSpace(r) && !quoted {\n            if started{out=append(out,token.String());token.Reset();started=false}\n            continue\n        }\n        token.WriteRune(r);started=true\n    }\n    if quoted{return nil,fmt.Errorf("comillas sin cerrar")}\n    if started{out=append(out,token.String())}\n    return out,nil\n}',
  tests: [
    test(
      'Valor con espacios',
      'func() bool {out,e:=Tokens(`set nombre "Ada Lovelace"`);return e==nil && len(out)==3 && out[2]=="Ada Lovelace"}()',
      'Los espacios entre comillas pertenecen al token.',
      'El estado determina si un espacio separa o se conserva.',
    ),
    test(
      'Vacío explícito y fragmentos contiguos',
      'func() bool {out,e:=Tokens(`"" ab" c"`);return e==nil && len(out)==2 && out[0]=="" && out[1]=="ab c"}()',
      'Un token vacío existe aunque el builder tenga longitud cero.',
      'La marca started debe activarse al abrir comillas.',
    ),
    test(
      'Apertura pendiente y whitespace',
      'func() bool {a,e:=Tokens(`x "rota`);b,f:=Tokens(" \\t\\n");return a==nil && e!=nil && f==nil && len(b)==0}()',
      'Una entrada incompleta no produce tokens parciales válidos.',
      'Comprobá quoted al terminar.',
    ),
  ],
  hints: [
    'Necesitás quoted y started como estados separados.',
    'Una comilla cambia el modo pero no se escribe en el token.',
    'Al separar un token, reiniciá el builder y started.',
  ],
  review: {
    success:
      'La máquina de estados distingue caracteres de control y contenido sin prometer una gramática de shell completa. El vacío explícito exigió recordar intención además de contenido.',
    pitfall: 'Una barra invertida es un carácter literal aquí: no escapa la comilla siguiente.',
  },
  transfer: 'Agregá escapes con un estado separado y definí qué secuencias son legales.',
  prediction: predict(
    '¿Por qué token.Len()>0 no alcanza para decidir si hay un token?',
    [
      'Porque los strings no tienen longitud',
      'Porque "" representa un token vacío válido',
      'Porque toda entrada debe producir un token',
    ],
    1,
    'La existencia del token y la cantidad de caracteres son datos distintos.',
  ),
  sources: [
    { title: 'strings.Builder', url: 'https://pkg.go.dev/strings#Builder' },
    { title: 'unicode.IsSpace', url: 'https://pkg.go.dev/unicode#IsSpace' },
  ],
});
add(92, {
  title: 'La calculadora de operaciones pospuestas',
  imports: ['strings', 'strconv'],
  intro:
    'En notación posfija, 3 4 + significa sumar los dos últimos números disponibles. Los operadores no necesitan paréntesis porque sus operandos ya están en la pila.',
  why: 'Cada número apila un valor y cada operación binaria consume dos. El orden importa: primero sale el operando derecho y después el izquierdo.',
  objective:
    'EvalRPN acepta enteros y los operadores +, - y * separados por whitespace; debe terminar con un único valor.',
  instructions: [
    'Validá dos operandos antes de aplicar un operador.',
    'Rechazá tokens inválidos, falta de operandos y resultados sobrantes; usá valores pequeños sin overflow.',
  ],
  starter:
    'func EvalRPN(text string)(int,error){\n    fields:=strings.Fields(text)\n    if len(fields)==1{return strconv.Atoi(fields[0])}\n    return 0,fmt.Errorf("sin implementar")\n}',
  solution:
    'func EvalRPN(text string)(int,error){\n    stack:=[]int{}\n    for _,token:=range strings.Fields(text) {\n        if token=="+" || token=="-" || token=="*" {\n            if len(stack)<2{return 0,fmt.Errorf("faltan operandos")}\n            right,left:=stack[len(stack)-1],stack[len(stack)-2]\n            stack=stack[:len(stack)-2]\n            result:=left+right\n            if token=="-"{result=left-right};if token=="*"{result=left*right}\n            stack=append(stack,result)\n        } else {n,err:=strconv.Atoi(token);if err!=nil{return 0,err};stack=append(stack,n)}\n    }\n    if len(stack)!=1{return 0,fmt.Errorf("expresión incompleta")}\n    return stack[0],nil\n}',
  tests: [
    test(
      'Composición de operaciones',
      'func() bool {n,e:=EvalRPN("3 4 + 2 *");return e==nil && n==14}()',
      'El resultado de una operación vuelve a la pila.',
      'Cada operación reemplaza dos valores por uno.',
    ),
    test(
      'Orden y enteros negativos',
      'func() bool {a,e:=EvalRPN("3 10 -");b,f:=EvalRPN("-2 3 *");return e==nil && f==nil && a == -7 && b == -6}()',
      'La resta distingue operando izquierdo y derecho.',
      'La cima es el operando derecho.',
    ),
    test(
      'Errores estructurales',
      'func() bool {for _,s:=range []string{"","1 +","1 2","hola"}{n,e:=EvalRPN(s);if e==nil || n!=0{return false}};return true}()',
      'Un resultado parcial no convierte una expresión rota en válida.',
      'Verificá también el tamaño final de la pila.',
    ),
  ],
  hints: [
    'La pila mantiene resultados pendientes.',
    'Retirá dos valores antes de agregar su resultado.',
    'Al terminar debe quedar exactamente uno.',
  ],
  review: {
    success:
      'Construiste un evaluador con un contrato pequeño y errores explícitos. La pila representa dependencias de cálculo ya disponibles.',
    pitfall:
      'Atoi distingue -2 de un operador - aislado; no alcanza inspeccionar sólo el primer carácter.',
  },
  transfer: 'Agregá división y documentá división entera y divisor cero.',
  prediction: predict(
    'En 3 10 -, el primer valor que se retira es…',
    ['3, y se calcula 10-3', '10, que será el operando derecho', 'El operador como número'],
    1,
    'La pila retira 10 primero; la cuenta es 3-10.',
  ),
  sources: [{ title: 'strconv.Atoi', url: 'https://pkg.go.dev/strconv#Atoi' }],
});
add(93, {
  title: 'La caché que recuerda qué usaste último',
  kind: 'reparar',
  imports: ['container/list'],
  intro:
    'Una caché LRU expulsa el elemento usado menos recientemente. Leer un dato también cuenta como uso: olvidarlo hace que se expulse una entrada todavía importante.',
  why: 'El map localiza entradas y una lista mantiene recencia. Mover al frente al leer o actualizar permite retirar del final al exceder la capacidad.',
  objective:
    'Corregí Get para actualizar recencia; conservá Put y una capacidad no positiva como caché desactivada.',
  instructions: [
    'Cuando Get encuentra una clave, mové su elemento al frente de order.',
    'Una lectura fallida no cambia la estructura.',
  ],
  starter:
    'type CacheEntry struct { key,value string }\ntype LRU struct { capacity int;order *list.List;index map[string]*list.Element }\nfunc NewLRU(capacity int)*LRU{return &LRU{capacity,list.New(),make(map[string]*list.Element)}}\nfunc(c *LRU) Get(key string)(string,bool){e,ok:=c.index[key];if !ok{return "",false};return e.Value.(CacheEntry).value,true}\nfunc(c *LRU) Put(key,value string){\n    if c.capacity<=0{return}\n    if e,ok:=c.index[key];ok{e.Value=CacheEntry{key,value};c.order.MoveToFront(e);return}\n    c.index[key]=c.order.PushFront(CacheEntry{key,value})\n    if c.order.Len()>c.capacity{old:=c.order.Back();delete(c.index,old.Value.(CacheEntry).key);c.order.Remove(old)}\n}',
  solution:
    'type CacheEntry struct { key,value string }\ntype LRU struct { capacity int;order *list.List;index map[string]*list.Element }\nfunc NewLRU(capacity int)*LRU{return &LRU{capacity,list.New(),make(map[string]*list.Element)}}\nfunc(c *LRU) Get(key string)(string,bool){e,ok:=c.index[key];if !ok{return "",false};c.order.MoveToFront(e);return e.Value.(CacheEntry).value,true}\nfunc(c *LRU) Put(key,value string){\n    if c.capacity<=0{return}\n    if e,ok:=c.index[key];ok{e.Value=CacheEntry{key,value};c.order.MoveToFront(e);return}\n    c.index[key]=c.order.PushFront(CacheEntry{key,value})\n    if c.order.Len()>c.capacity{old:=c.order.Back();delete(c.index,old.Value.(CacheEntry).key);c.order.Remove(old)}\n}',
  tests: [
    test(
      'Leer evita la expulsión',
      'func() bool {c:=NewLRU(2);c.Put("a","A");c.Put("b","B");c.Get("a");c.Put("c","C");a,ok:=c.Get("a");_,gone:=c.Get("b");return ok && a=="A" && !gone}()',
      'La consulta debe renovar recencia.',
      'Mové el elemento encontrado antes de devolverlo.',
    ),
    test(
      'Actualizar no duplica',
      'func() bool {c:=NewLRU(2);c.Put("a","1");c.Put("b","2");c.Put("a","3");c.Put("c","4");a,ok:=c.Get("a");_,b:=c.Get("b");return ok && a=="3" && !b && len(c.index)==2 && c.order.Len()==2}()',
      'Actualizar conserva una sola entrada y cuenta como uso.',
      'El map y la lista deben describir los mismos elementos.',
    ),
    test(
      'Desactivada y ausencias',
      'func() bool {c:=NewLRU(0);c.Put("x","X");_,ok:=c.Get("x");d:=NewLRU(1);d.Put("a","A");_,missing:=d.Get("z");return !ok && !missing && d.order.Len()==1}()',
      'Una lectura ausente no fabrica entradas.',
      'Conservá la guardia de clave inexistente.',
    ),
  ],
  hints: [
    'e ya es *list.Element.',
    'La lista ofrece MoveToFront(e).',
    'Insertá esa operación sólo en la ruta encontrada.',
  ],
  review: {
    success:
      'La política de recencia quedó reflejada en secuencias de operaciones, no sólo en valores aislados. La caché es secuencial y necesita NewLRU para inicializarse.',
    pitfall: 'Esta estructura no es segura para acceso concurrente sin sincronización adicional.',
  },
  transfer: 'Agregá estadísticas de hits y misses sin alterar la política de expulsión.',
  prediction: predict(
    'En una LRU, consultar una clave existente…',
    ['No modifica el orden', 'La vuelve la usada más recientemente', 'Siempre la elimina'],
    1,
    'Least recently used considera tanto lecturas exitosas como escrituras según este contrato.',
  ),
});
add(94, {
  title: 'Una caché con reloj que podés controlar',
  kind: 'reparar',
  intro:
    'Un dato vive durante ttl unidades desde su escritura. Pasar now como argumento permite probar vencimientos exactos sin dormir ni depender de la hora de la máquina.',
  why: 'La expiración se modela como un instante exclusivo: válido antes, vencido en ese instante o después. Esa frontera evita un paso extra de validez accidental.',
  objective:
    'Corregí Get para expirar cuando now>=expires; TTLCache debe inicializarse con make y usa enteros pequeños sin overflow.',
  instructions: [
    'Conservá Set: ttl<=0 invalida la clave.',
    'Al consultar una entrada vencida, borrala y devolvé ausencia.',
  ],
  starter:
    'type TimedValue struct { value string;expires int64 }\ntype TTLCache map[string]TimedValue\nfunc(c TTLCache) Set(key,value string,now,ttl int64){if ttl<=0{delete(c,key);return};c[key]=TimedValue{value,now+ttl}}\nfunc(c TTLCache) Get(key string,now int64)(string,bool){e,ok:=c[key];if !ok{return "",false};if now>e.expires{delete(c,key);return "",false};return e.value,true}',
  solution:
    'type TimedValue struct { value string;expires int64 }\ntype TTLCache map[string]TimedValue\nfunc(c TTLCache) Set(key,value string,now,ttl int64){if ttl<=0{delete(c,key);return};c[key]=TimedValue{value,now+ttl}}\nfunc(c TTLCache) Get(key string,now int64)(string,bool){e,ok:=c[key];if !ok{return "",false};if now>=e.expires{delete(c,key);return "",false};return e.value,true}',
  tests: [
    test(
      'Antes y exactamente al vencer',
      'func() bool {c:=make(TTLCache);c.Set("x","A",10,5);v,before:=c.Get("x",14);_,at:=c.Get("x",15);return before && v=="A" && !at && len(c)==0}()',
      'La igualdad con expires ya representa vencimiento.',
      'Usá >= en la frontera.',
    ),
    test(
      'TTL no positivo invalida',
      'func() bool {c:=make(TTLCache);c.Set("x","A",0,10);c.Set("x","B",1,0);_,ok:=c.Get("x",1);return !ok}()',
      'La escritura no válida no conserva una versión anterior.',
      'Conservá delete en la política ttl<=0.',
    ),
    test(
      'Renovar reemplaza el plazo',
      'func() bool {c:=make(TTLCache);c.Set("x","A",0,5);c.Set("x","B",4,10);v,ok:=c.Get("x",6);_,expired:=c.Get("x",14);return ok && v=="B" && !expired}()',
      'La nueva escritura reinicia el plazo de esa entrada.',
      'El vencimiento es now+ttl de la última escritura.',
    ),
  ],
  hints: [
    'La entrada dura en [now, now+ttl).',
    'El bug está en comparar el instante de vencimiento.',
    'Una consulta vencida además limpia la entrada.',
  ],
  review: {
    success:
      'Probaste fronteras temporales con un reloj inyectado como dato. Es una política de expiración perezosa: las entradas se retiran al consultarlas.',
    pitfall:
      'Una aplicación real necesita una política de reloj, límites numéricos y limpieza de entradas nunca consultadas.',
  },
  transfer: 'Agregá Purge(now) y definí cómo probarlo sin usar time.Sleep.',
  prediction: predict(
    'Si se escribe en 10 con TTL 5, consultar en 15…',
    ['Todavía es válido', 'Ya está vencido', 'Depende de la velocidad del equipo'],
    1,
    'El intervalo válido excluye el instante 15.',
  ),
  sources: [
    { title: 'Maps y borrado', url: 'https://go.dev/blog/maps' },
    { title: 'time y representación de instantes', url: 'https://pkg.go.dev/time' },
  ],
});
add(95, {
  title: 'Repetir un evento sin cobrarlo dos veces',
  intro:
    'Un registro puede contener reintentos. Si un mismo ID vuelve con el mismo delta, se aplica una vez; si vuelve con otro contenido, hay un conflicto que debemos informar.',
  why: 'Un índice de IDs guarda más que presencia: conserva el contenido ya observado para distinguir reintento de contradicción.',
  objective:
    'Replay suma deltas únicos por ID; rechaza ID vacío o un ID repetido con otro delta, devolviendo 0 y error.',
  instructions: [
    'Guardá cada delta observado por ID.',
    'Ignorá repeticiones idénticas y rechazá conflictos antes de agregar su valor.',
  ],
  starter:
    'type Event struct { ID string;Delta int }\nfunc Replay(events []Event)(int,error){\n    total:=0\n    for _,event:=range events{total+=event.Delta}\n    return total,nil\n}',
  solution:
    'type Event struct { ID string;Delta int }\nfunc Replay(events []Event)(int,error){\n    seen:=make(map[string]int)\n    total:=0\n    for _,event:=range events {\n        if event.ID==""{return 0,fmt.Errorf("ID vacío")}\n        if previous,ok:=seen[event.ID];ok{if previous!=event.Delta{return 0,fmt.Errorf("ID en conflicto: %s",event.ID)};continue}\n        seen[event.ID]=event.Delta;total+=event.Delta\n    }\n    return total,nil\n}',
  tests: [
    test(
      'Reintento idéntico',
      'func() bool {n,e:=Replay([]Event{{"a",5},{"b",2},{"a",5}});return e==nil && n==7}()',
      'Una repetición no vuelve a aplicar el delta.',
      'Comprobá el ID antes de acumular.',
    ),
    test(
      'Deltas negativos, cero y vacío',
      'func() bool {n,e:=Replay([]Event{{"a",0},{"b",-3},{"a",0}});z,f:=Replay(nil);return e==nil && n == -3 && f==nil && z==0}()',
      'Un delta cero existente necesita la presencia real del map.',
      'Usá value, ok; cero no significa ID ausente.',
    ),
    test(
      'Conflicto y falta de ID',
      'func() bool {a,e:=Replay([]Event{{"x",4},{"x",9}});b,f:=Replay([]Event{{"",3}});return a==0 && b==0 && e!=nil && f!=nil}()',
      'Contenido inconsistente invalida el resultado completo.',
      'No ignores silenciosamente un ID repetido distinto.',
    ),
  ],
  hints: [
    'seen tiene tipo map[string]int.',
    'El bool de la lectura distingue un delta cero existente.',
    'En un reintento válido usá continue.',
  ],
  review: {
    success:
      'Definiste una política de idempotencia para un lote en memoria. No equivale a garantizar exactamente una ejecución en un sistema distribuido con fallos y persistencia.',
    pitfall: 'Dos eventos distintos con IDs distintos se aplican aunque tengan el mismo delta.',
  },
  transfer:
    'Definí qué parte del estado deberías persistir para conservar esta política entre reinicios.',
  prediction: predict(
    'Dos eventos con mismo ID y distintos deltas son…',
    ['Un reintento válido', 'Un conflicto de contenido', 'Dos eventos nuevos automáticamente'],
    1,
    'El contrato usa el ID como identidad de un evento cuyo contenido debe permanecer igual.',
  ),
  sources: [{ title: 'Map lookup y presencia', url: 'https://go.dev/ref/spec#Index_expressions' }],
});

add(96, {
  title: 'Cuatro bytes aunque lleguen de a uno',
  kind: 'reparar',
  imports: ['io', 'strings', 'errors'],
  intro:
    'El encabezado de tu protocolo tiene cuatro bytes. Un Read puede entregar sólo uno aunque queden más; una lectura corta no significa por sí sola fin del mensaje.',
  why: 'io.ReadFull repite lecturas hasta llenar el destino o encontrar un error. Distingue ausencia total con EOF de un encabezado parcial con ErrUnexpectedEOF.',
  objective:
    'ReadHeader devuelve exactamente cuatro bytes o un array cero y error si el encabezado está incompleto.',
  instructions: [
    'Reemplazá el único Read por io.ReadFull.',
    'En el error devolvé [4]byte{}; no devuelvas un encabezado parcial como válido.',
  ],
  starter:
    'type OneByteReader struct { Data []byte }\nfunc(r *OneByteReader) Read(p []byte)(int,error){if len(p)==0{return 0,nil};if len(r.Data)==0{return 0,io.EOF};p[0]=r.Data[0];r.Data=r.Data[1:];return 1,nil}\nfunc ReadHeader(r io.Reader)([4]byte,error){\n    var header [4]byte\n    _,err:=r.Read(header[:])\n    if err!=nil{return [4]byte{},err}\n    return header,nil\n}',
  solution:
    'type OneByteReader struct { Data []byte }\nfunc(r *OneByteReader) Read(p []byte)(int,error){if len(p)==0{return 0,nil};if len(r.Data)==0{return 0,io.EOF};p[0]=r.Data[0];r.Data=r.Data[1:];return 1,nil}\nfunc ReadHeader(r io.Reader)([4]byte,error){\n    var header [4]byte\n    _,err:=io.ReadFull(r,header[:])\n    if err!=nil{return [4]byte{},err}\n    return header,nil\n}',
  tests: [
    test(
      'Fragmentos de un byte',
      'func() bool {r:=&OneByteReader{Data:[]byte("HEADresto")};h,e:=ReadHeader(r);return e==nil && string(h[:])=="HEAD" && string(r.Data)=="resto"}()',
      'Debe reunir fragmentos sin consumir el cuerpo.',
      'Una llamada a Read no garantiza llenar el buffer.',
    ),
    test(
      'Encabezado parcial',
      'func() bool {h,e:=ReadHeader(strings.NewReader("HE"));return h==([4]byte{}) && errors.Is(e,io.ErrUnexpectedEOF)}()',
      'Una entrada truncada se informa con su causa.',
      'ReadFull distingue lectura parcial de EOF inicial.',
    ),
    test(
      'Sin ningún byte',
      'func() bool {h,e:=ReadHeader(strings.NewReader(""));return h==([4]byte{}) && errors.Is(e,io.EOF)}()',
      'La ausencia total también produce error y resultado cero.',
      'No transformes todos los finales en éxito.',
    ),
  ],
  hints: [
    'header[:] expone el array como slice.',
    'ReadFull sabe completar exactamente len del destino.',
    'Conservá el error que devuelve.',
  ],
  review: {
    success:
      'Separaste el tamaño lógico de un mensaje del tamaño de cada lectura. El protocolo decide cuántos bytes necesita; el Reader sólo describe cómo entrega fragmentos.',
    pitfall:
      'EOF no distingue automáticamente cierre normal de mensaje truncado; esa interpretación depende del protocolo.',
  },
  transfer:
    'Leé primero una longitud y luego un cuerpo acotado, rechazando tamaños excesivos antes de reservar memoria.',
  prediction: predict(
    'Una llamada Read que devuelve n=1 y err=nil puede significar…',
    [
      'Que sólo existía un byte total',
      'Que hay un fragmento y todavía pueden venir más datos',
      'Que Reader violó siempre su contrato',
    ],
    1,
    'Read puede devolver menos bytes que el buffer disponible.',
  ),
  sources: [{ title: 'io.ReadFull', url: 'https://pkg.go.dev/io#ReadFull' }],
});
add(97, {
  title: 'El último fragmento viene con EOF',
  kind: 'reparar',
  imports: ['io', 'errors'],
  intro:
    'Un Reader puede devolver bytes y un error en la misma llamada. Si mirás el error antes de procesar n, podés perder el último fragmento de la entrada.',
  why: 'Cantidad y error responden preguntas distintas. Además, acá definimos un límite de tres lecturas consecutivas sin progreso para evitar un loop infinito con un origen defectuoso.',
  objective:
    'CountStream cuenta bytes, conserva cantidad parcial ante error, trata EOF como fin normal y tres (0,nil) seguidos como io.ErrNoProgress.',
  instructions: [
    'Sumá n antes de evaluar err.',
    'Conservá la detección de falta de progreso y reiniciala cuando lleguen datos.',
  ],
  starter:
    'type FinalReader struct { Data []byte; End error }\nfunc(r *FinalReader) Read(p []byte)(int,error){n:=copy(p,r.Data);r.Data=r.Data[n:];if len(r.Data)==0{if r.End!=nil{return n,r.End};return n,io.EOF};return n,nil}\ntype IdleReader struct { Calls int }\nfunc(r *IdleReader) Read(p []byte)(int,error){r.Calls++;return 0,nil}\nfunc CountStream(r io.Reader)(int,error){\n    buffer:=make([]byte,4);total,idle:=0,0\n    for{n,err:=r.Read(buffer);if err==io.EOF{return total,nil};if err!=nil{return total,err};total+=n;if n==0{idle++;if idle>=3{return total,io.ErrNoProgress}}else{idle=0}}\n}',
  solution:
    'type FinalReader struct { Data []byte; End error }\nfunc(r *FinalReader) Read(p []byte)(int,error){n:=copy(p,r.Data);r.Data=r.Data[n:];if len(r.Data)==0{if r.End!=nil{return n,r.End};return n,io.EOF};return n,nil}\ntype IdleReader struct { Calls int }\nfunc(r *IdleReader) Read(p []byte)(int,error){r.Calls++;return 0,nil}\nfunc CountStream(r io.Reader)(int,error){\n    buffer:=make([]byte,4);total,idle:=0,0\n    for{n,err:=r.Read(buffer);total+=n;if err==io.EOF{return total,nil};if err!=nil{return total,err};if n==0{idle++;if idle>=3{return total,io.ErrNoProgress}}else{idle=0}}\n}',
  tests: [
    test(
      'Datos junto a EOF',
      'func() bool {n,e:=CountStream(&FinalReader{Data:[]byte("abcdef")});return n==6 && e==nil}()',
      'Cuenta el último bloque antes de atender el final.',
      'Los dos bytes finales pueden venir junto con EOF.',
    ),
    test(
      'Datos junto a otro error',
      'func() bool {failure:=fmt.Errorf("fuente falló");n,e:=CountStream(&FinalReader{Data:[]byte("xy"),End:failure});return n==2 && errors.Is(e,failure)}()',
      'Una causa de error no borra bytes ya recibidos.',
      'El contrato conserva cantidad parcial.',
    ),
    test(
      'Origen sin progreso',
      'func() bool {r:=&IdleReader{};n,e:=CountStream(r);return n==0 && r.Calls==3 && errors.Is(e,io.ErrNoProgress)}()',
      'La política acota reintentos vacíos determinísticamente.',
      'No trates un único (0,nil) como EOF.',
    ),
  ],
  hints: [
    'Mové total += n antes de las ramas de error.',
    'EOF termina normalmente después de contar sus bytes.',
    'Otros errores terminan conservando total.',
  ],
  review: {
    success:
      'Interpretaste conjuntamente ambos resultados de Read. El límite de tres lecturas vacías pertenece a esta función; la interfaz Reader no establece ese número.',
    pitfall:
      'Un error junto con datos exige que el llamador defina si usa, conserva o descarta ese resultado parcial.',
  },
  transfer: 'Agregá un Reader que alterne progreso y pausas para probar el reinicio de idle.',
  prediction: predict(
    'Read devuelve n=2 y err=io.EOF. ¿Cuántos bytes nuevos hay?',
    [
      'Ninguno porque hay error',
      'Dos, que deben considerarse antes del final',
      'No se puede saber',
    ],
    1,
    'n sigue describiendo datos válidos devueltos por esa llamada.',
  ),
  sources: [{ title: 'Contrato de io.Reader', url: 'https://pkg.go.dev/io#Reader' }],
});
add(98, {
  title: 'Un byte extra para detectar el exceso',
  kind: 'reparar',
  imports: ['io', 'strings'],
  intro:
    'Leer como máximo limit bytes protege la memoria, pero no permite saber si la entrada tenía exactamente ese tamaño o era mayor. Para distinguirlos, alcanza observar un byte adicional.',
  why: 'LimitReader limita consumo y ReadAll recoge sólo esa vista. Si llegan limit+1 bytes, sabemos que el contrato de tamaño se excedió sin consumir toda la fuente.',
  objective:
    'ReadLimited acepta hasta limit bytes; si excede, devuelve nil y error. limit está entre 0 y 1000000; un negativo es error.',
  instructions: [
    'Leé mediante io.LimitReader con limit+1.',
    'Después compará la cantidad obtenida y rechazá el exceso.',
  ],
  starter:
    'func ReadLimited(r io.Reader,limit int64)([]byte,error){\n    if limit<0{return nil,fmt.Errorf("límite negativo")}\n    return io.ReadAll(io.LimitReader(r,limit))\n}',
  solution:
    'func ReadLimited(r io.Reader,limit int64)([]byte,error){\n    if limit<0{return nil,fmt.Errorf("límite negativo")}\n    data,err:=io.ReadAll(io.LimitReader(r,limit+1))\n    if err!=nil{return nil,err}\n    if int64(len(data))>limit{return nil,fmt.Errorf("entrada demasiado grande")}\n    return data,nil\n}',
  tests: [
    test(
      'Exactamente al límite',
      'func() bool {data,e:=ReadLimited(strings.NewReader("abcd"),4);return e==nil && string(data)=="abcd"}()',
      'El tamaño máximo está permitido.',
      'La comparación de exceso debe ser estricta.',
    ),
    test(
      'Exceso con consumo acotado',
      'func() bool {r:=strings.NewReader("abcdef");data,e:=ReadLimited(r,3);return data==nil && e!=nil && r.Len()==2}()',
      'Sólo se consumen limit+1 bytes para decidir.',
      'Truncar en limit ocultaría que la fuente era mayor.',
    ),
    test(
      'Límite cero y negativo',
      'func() bool {a,e:=ReadLimited(strings.NewReader(""),0);b,f:=ReadLimited(strings.NewReader("x"),0);_,g:=ReadLimited(strings.NewReader("x"),-1);return e==nil && len(a)==0 && b==nil && f!=nil && g!=nil}()',
      'Cero permite únicamente una fuente vacía.',
      'Aun con límite cero, necesitás inspeccionar si existe un byte.',
    ),
  ],
  hints: [
    'Leé un byte más que el máximo permitido.',
    'Si len(data)>limit, devolvé nil y error.',
    'Conservá la guardia antes de sumar uno.',
  ],
  review: {
    success:
      'Diferenciaste limitar consumo de validar tamaño. La técnica detecta exceso con memoria acotada y deja sin consumir el resto de la fuente.',
    pitfall:
      'El llamador debe decidir qué hacer con una fuente parcialmente consumida después del rechazo.',
  },
  transfer: 'Usá el mismo patrón para acotar un cuerpo HTTP antes de decodificarlo.',
  prediction: predict(
    'Si sólo leés limit bytes, ¿podés distinguir tamaño exacto de exceso?',
    ['Sí, siempre', 'No, ambos pueden devolver esa cantidad', 'Sólo con strings ASCII'],
    1,
    'Necesitás una observación adicional para saber si había más datos.',
  ),
  sources: [
    { title: 'io.LimitReader', url: 'https://pkg.go.dev/io#LimitReader' },
    { title: 'io.ReadAll', url: 'https://pkg.go.dev/io#ReadAll' },
  ],
});
add(99, {
  title: 'La huella de un stream, fragmento a fragmento',
  imports: ['crypto/sha256', 'io', 'strings'],
  intro:
    'Un stream puede ser grande o venir dividido. Un hash incremental recibe fragmentos y conserva un estado pequeño; no necesita juntar primero toda la entrada.',
  why: 'hash.Hash implementa io.Writer, por lo que io.Copy puede conectar un Reader directamente con el cálculo. Sum(nil) obtiene la huella sin agregar datos al hash.',
  objective:
    'Digest devuelve SHA-256 en hexadecimal del Reader completo; ante error de lectura devuelve cadena vacía y error.',
  instructions: [
    'Creá sha256.New y alimentalo con io.Copy.',
    'Atendé el error antes de formatear Sum(nil) con %x.',
  ],
  starter:
    'type FailedSource struct{}\nfunc(FailedSource) Read(p []byte)(int,error){return 0,fmt.Errorf("entrada fallida")}\nfunc Digest(r io.Reader)(string,error){\n    hash:=sha256.New()\n    return fmt.Sprintf("%x",hash.Sum(nil)),nil\n}',
  solution:
    'type FailedSource struct{}\nfunc(FailedSource) Read(p []byte)(int,error){return 0,fmt.Errorf("entrada fallida")}\nfunc Digest(r io.Reader)(string,error){\n    hash:=sha256.New()\n    if _,err:=io.Copy(hash,r);err!=nil{return "",err}\n    return fmt.Sprintf("%x",hash.Sum(nil)),nil\n}',
  tests: [
    test(
      'Huella conocida',
      'func() bool {s,e:=Digest(strings.NewReader("abc"));return e==nil && s=="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"}()',
      'El hash tiene que recibir el contenido antes de consultarse.',
      'Un hash recién creado describe la entrada vacía.',
    ),
    test(
      'Los fragmentos no cambian el contenido',
      'func() bool {a,e:=Digest(io.MultiReader(strings.NewReader("a"),strings.NewReader("bc")));b,f:=Digest(strings.NewReader("abc"));z,g:=Digest(strings.NewReader(""));return e==nil && f==nil && g==nil && a==b && z==fmt.Sprintf("%x",sha256.Sum256(nil))}()',
      'La huella depende de bytes concatenados, no de las fronteras de lectura.',
      'io.Copy entrega todo el stream al Writer.',
    ),
    test(
      'Un fallo no produce una huella de éxito',
      'func() bool {s,e:=Digest(io.MultiReader(strings.NewReader("parcial"),FailedSource{}));return s=="" && e!=nil}()',
      'Un prefijo leído no equivale al documento completo.',
      'Retorná antes de Sum cuando Copy falla.',
    ),
  ],
  hints: [
    'El hash puede pasarse como primer argumento de io.Copy.',
    'El Reader es el segundo argumento.',
    'Sum(nil) devuelve bytes que %x representa en hexadecimal.',
  ],
  review: {
    success:
      'Compusiste interfaces de lectura, escritura y cálculo incremental. Los tests verifican la huella; el uso de Copy muestra cómo evitás materializar la entrada entera.',
    pitfall:
      'Una huella sin una referencia confiable no autentica por sí sola el origen del contenido.',
  },
  transfer:
    'Usá TeeReader para calcular una huella mientras otra operación consume los mismos bytes.',
  prediction: predict(
    'Escribir "a" y después "bc" en el mismo hash produce…',
    [
      'La misma huella que escribir "abc"',
      'Una huella diferente por cada fragmentación',
      'Sólo la huella de "bc"',
    ],
    0,
    'El estado incremental incorpora los bytes en orden sin reiniciarse entre fragmentos.',
  ),
  sources: [
    { title: 'crypto/sha256.New', url: 'https://pkg.go.dev/crypto/sha256#New' },
    { title: 'hash.Hash', url: 'https://pkg.go.dev/hash#Hash' },
  ],
});
add(100, {
  title: 'La expedición se detiene cuando el dueño lo pide',
  kind: 'reparar',
  imports: ['context', 'bufio', 'io', 'strings', 'errors'],
  intro:
    'Procesás líneas con un callback secuencial. El trabajo debe detenerse si el dueño cancela o si un callback falla, contando sólo líneas completadas con éxito.',
  why: 'La cancelación cooperativa requiere revisar el contexto en límites de trabajo. Un io.Reader genérico no ofrece una forma universal de interrumpir un Read que ya está bloqueado.',
  objective:
    'WalkLines conserva líneas vacías, espera cada callback y retorna cantidad completada más el error de cancelación, callback o scanner.',
  instructions: [
    'Comprobá ctx.Err antes de cada Scan y nuevamente antes del callback.',
    'No cuentes un callback fallido ni proceses líneas posteriores; no lances goroutines.',
  ],
  starter:
    'func WalkLines(ctx context.Context,r io.Reader,visit func(string)error)(int,error){\n    scanner:=bufio.NewScanner(r);done:=0\n    for scanner.Scan(){if err:=visit(scanner.Text());err!=nil{return done,err};done++}\n    return done,scanner.Err()\n}',
  solution:
    'func WalkLines(ctx context.Context,r io.Reader,visit func(string)error)(int,error){\n    scanner:=bufio.NewScanner(r);done:=0\n    for {\n        if err:=ctx.Err();err!=nil{return done,err}\n        if !scanner.Scan(){return done,scanner.Err()}\n        if err:=ctx.Err();err!=nil{return done,err}\n        if err:=visit(scanner.Text());err!=nil{return done,err}\n        done++\n    }\n}',
  tests: [
    test(
      'Cada línea, también vacía',
      'func() bool {got:=[]string{};n,e:=WalkLines(context.Background(),strings.NewReader("a\\n\\nb"),func(s string)error{got=append(got,s);return nil});return e==nil && n==3 && len(got)==3 && got[1]=="" && got[2]=="b"}()',
      'Este contrato preserva líneas vacías.',
      'No reutilices un filtro de líneas vacías de otro ejercicio.',
    ),
    test(
      'Cancelar entre callbacks',
      'func() bool {ctx,cancel:=context.WithCancel(context.Background());defer cancel();calls:=0;n,e:=WalkLines(ctx,strings.NewReader("a\\nb\\nc"),func(string)error{calls++;cancel();return nil});return n==1 && calls==1 && errors.Is(e,context.Canceled)}()',
      'La línea terminada cuenta, pero ninguna siguiente se procesa.',
      'Volvé a comprobar el contexto antes de la próxima lectura.',
    ),
    test(
      'Fallo del callback y cancelación previa',
      'func() bool {failure:=fmt.Errorf("visitante");calls:=0;n,e:=WalkLines(context.Background(),strings.NewReader("a\\nb\\nc"),func(string)error{calls++;if calls==2{return failure};return nil});ctx,cancel:=context.WithCancel(context.Background());cancel();prior:=0;m,f:=WalkLines(ctx,strings.NewReader("x"),func(string)error{prior++;return nil});return n==1 && calls==2 && errors.Is(e,failure) && m==0 && prior==0 && errors.Is(f,context.Canceled)}()',
      'Detiene trabajo posterior y no cuenta una operación fallida.',
      'El contexto ya cancelado debe comprobarse antes de empezar.',
    ),
  ],
  hints: [
    'La condición del loop puede pasar al cuerpo para revisar ctx antes de Scan.',
    'Si Scan es false, retorná scanner.Err.',
    'Incrementá done solamente después de visit sin error.',
  ],
  review: {
    success:
      'Integraste interfaces, streaming, cancelación y un contrato de resultados parciales. Un callback lento frena naturalmente el siguiente: no hay una cola ilimitada de tareas.',
    pitfall:
      'Scanner puede leer por adelantado y un Read bloqueado no se interrumpe sólo por revisar Context. Recursos reales necesitan deadlines, cierre o APIs que admitan cancelación.',
  },
  transfer:
    'En un proyecto real, conectá una fuente cancelable, definí deadlines y probá que su bloqueo puede interrumpirse.',
  prediction: predict(
    '¿Pasar Context permite detener cualquier Read bloqueado instantáneamente?',
    [
      'Sí, automáticamente',
      'No, la fuente necesita un mecanismo compatible',
      'Sólo si el callback retorna int',
    ],
    1,
    'Context transporta una señal; cada operación debe tener una manera de observarla o interrumpirse.',
  ),
  sources: [
    { title: 'context.Context y cancelación', url: 'https://pkg.go.dev/context#Context' },
    { title: 'bufio.Scanner', url: 'https://pkg.go.dev/bufio#Scanner' },
  ],
});

export const goLab: Exercise[] = exercises;
