/* Original educational atlas. Snippets illustrate concepts; the lab runs exercises. */
import type { LevelId } from '../../../shared/config/levels';

export type AtlasLanguage = 'rust' | 'go';
export type AtlasLevel = LevelId;

export interface AtlasSource {
  title: string;
  url: string;
}

export interface AtlasQuiz {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface AtlasConcept {
  id: string;
  level: AtlasLevel;
  category: string;
  title: string;
  summary: string;
  why: string;
  code: string;
  explanation: string;
  comparison: string;
  pitfall: string;
  quiz: AtlasQuiz;
  labId: string;
  source: AtlasSource;
  furtherSources?: AtlasSource[];
}

export type AtlasByLanguage = Record<AtlasLanguage, AtlasConcept[]>;

export const atlasByLanguage = (() => {
  const atlas: AtlasByLanguage = { rust: [], go: [] };
  const quiz = (
    question: string,
    options: string[],
    answer: number,
    explanation: string,
  ): AtlasQuiz => ({
    question,
    options,
    answer,
    explanation,
  });
  const source = (title: string, url: string): AtlasSource => ({ title, url });
  const add = (language: AtlasLanguage, item: AtlasConcept): void => {
    atlas[language].push(item);
  };

  add('rust', {
    id: 'rust-identity',
    level: 'beginner',
    category: 'Fundamentos',
    title: 'Qué lenguaje estás aprendiendo',
    summary:
      'Rust es compilado y de tipado estático. Combina programación imperativa, genérica, funcional y abstracciones orientadas a objetos sin exigir un único paradigma.',
    why: 'Su diseño intenta hacer explícitos propiedad, mutación y costos. Las comprobaciones estáticas permiten detectar usos inválidos de memoria antes de ejecutar código seguro.',
    code: 'fn energia(valores: &[i32]) -> i32 {\n    valores.iter().map(|x| x * x).sum()\n}\n// Otra implementación válida puede usar un for\n// y un acumulador mutable.',
    explanation:
      'El tipo de entrada es una vista prestada de enteros. La función describe una transformación funcional; un bucle imperativo también sería idiomático según el contexto. Rust no requiere un recolector de basura para su modelo normal de propiedad.',
    comparison:
      'A diferencia de JavaScript, los tipos de esta firma se comprueban antes de ejecutar. Frente a lenguajes con GC, Rust hace visible quién posee un recurso y cuándo se presta. Eso no convierte automáticamente cualquier programa Rust en más rápido.',
    pitfall:
      'Tipado estático y seguridad de memoria no demuestran que el algoritmo sea correcto ni que nunca haya deadlocks, fugas o errores de lógica.',
    quiz: quiz(
      '¿Rust obliga a escribir todo con iteradores funcionales?',
      ['Sí', 'No: combina varios estilos', 'Solo permite clases'],
      1,
      'Podés combinar funciones, bucles, tipos propios, traits e iteradores según el problema.',
    ),
    labId: 'rust-37',
    source: source(
      'The Rust Book · Introduction',
      'https://doc.rust-lang.org/book/ch00-00-introduction.html',
    ),
  });

  add('rust', {
    id: 'rust-syntax',
    level: 'beginner',
    category: 'Fundamentos',
    title: 'Bindings, bloques y expresiones',
    summary:
      'let crea un binding inmutable por defecto; mut habilita reasignación. Los bloques producen valores y el punto y coma puede cambiar su resultado.',
    why: 'La mutación queda señalada en el lugar donde se declara. Las expresiones permiten componer decisiones sin asignaciones temporales obligatorias.',
    code: 'let limite = 10;\nlet mut total = 0;\ntotal += 2;\nlet estado = if total < limite { "listo" } else { "lleno" };\nlet total = total.to_string(); // shadowing: nuevo binding y tipo',
    explanation:
      'El segundo let total no cambia el tipo del binding anterior: declara otro y oculta el nombre previo. En una función -> i32, la última expresión puede devolver un entero sin return; agregarle ; puede dejar el bloque con valor ().',
    comparison:
      'let no tiene la misma mutabilidad que let de JavaScript. Rust necesita mut para reasignar y no permite cambiar el tipo de ese binding mediante una asignación.',
    pitfall:
      'Inmutable no significa que nunca exista mutabilidad interior: tipos como RefCell ofrecen un contrato distinto y explícito.',
    quiz: quiz(
      '¿Qué hace let x = x.len(); si x era &str?',
      [
        'Cambia el tipo del mismo binding',
        'Crea otro binding que oculta al anterior',
        'Modifica el texto',
      ],
      1,
      'Shadowing introduce un nombre nuevo con su propio tipo y valor.',
    ),
    labId: 'rust-04',
    source: source(
      'Rust Book · Variables and mutability',
      'https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html',
    ),
  });

  add('rust', {
    id: 'rust-types',
    level: 'beginner',
    category: 'Datos y memoria',
    title: 'Tipos, conversiones y texto Unicode',
    summary:
      'Hay enteros con tamaño y signo, floats, bool, char, tuplas y arrays. String posee texto UTF-8; &str presta una vista. Un char es un escalar Unicode, no un byte.',
    why: 'Elegir el tipo define rango, representación y operaciones válidas. Una conversión puede perder información, por eso conviene distinguir casts de validación.',
    code: 'let bytes: usize = "ñ".len();       // 2\nlet escalares = "ñ".chars().count(); // 1\nlet valor: u8 = 250;\nlet seguro = u8::try_from(300u16);   // Err\nstruct UserId(u64);\nstruct OrderId(u64); // tipos nominales distintos',
    explanation:
      'Dos structs con los mismos campos siguen siendo tipos distintos: su identidad no depende solo de la forma. Las tuplas y arrays se describen por sus tipos componentes y longitud. chars no cuenta necesariamente grafemas visuales completos.',
    comparison:
      'Frente al number habitual de JavaScript, los enteros de Rust especifican rango y signo. Frente a TypeScript estructural, UserId y OrderId no son intercambiables solo por tener un campo u64.',
    pitfall:
      'Un cast as puede truncar. Para rechazar entradas fuera de rango, usá TryFrom o parse con el tipo destino.',
    quiz: quiz(
      '¿Cuánto vale "ñ".len()?',
      ['1 letra', '2 bytes', 'Depende del sistema operativo'],
      1,
      'str usa UTF-8 y len mide bytes; ñ ocupa dos.',
    ),
    labId: 'rust-16',
    source: source(
      'Rust Book · Data types',
      'https://doc.rust-lang.org/book/ch03-02-data-types.html',
    ),
  });

  add('rust', {
    id: 'rust-flow',
    level: 'beginner',
    category: 'Control y errores',
    title: 'Decisiones y recorridos explícitos',
    summary:
      'if necesita bool; match compara patrones y exige exhaustividad. for recorre iteradores, while verifica una condición y loop puede devolver un valor con break.',
    why: 'Los patrones hacen visibles las alternativas y los rangos nombran fronteras. Los enums vuelven especialmente útil la exhaustividad.',
    code: 'let categoria = match codigo {\n    200 => "ok",\n    400..=499 => "cliente",\n    _ => "otro",\n};\nfor n in 0..3 { println!("{n}"); } // 0, 1, 2\nlet valor = loop { break 7; };',
    explanation:
      '0..3 excluye 3 y 0..=3 lo incluye. Los brazos de match producen tipos compatibles. if también es una expresión, por lo que sus ramas pueden alimentar directamente una asignación.',
    comparison:
      'No hay truthiness numérica como en JavaScript o Python. match incorpora patrones y exhaustividad; va más allá de comparar constantes como un switch sencillo.',
    pitfall:
      'Un comodín _ demasiado temprano captura casos que querías distinguir. Un rango descendente común no produce automáticamente una cuenta regresiva.',
    quiz: quiz(
      '¿Qué ocurre si match sobre un enum no cubre todas sus variantes?',
      ['Devuelve cero', 'Falla al compilar', 'Ignora el valor desconocido'],
      1,
      'La exhaustividad forma parte del chequeo del lenguaje.',
    ),
    labId: 'rust-23',
    source: source(
      'Rust Book · Control flow',
      'https://doc.rust-lang.org/book/ch03-05-control-flow.html',
    ),
  });

  add('rust', {
    id: 'rust-functions',
    level: 'medium',
    category: 'Abstracción',
    title: 'Funciones y closures con capturas',
    summary:
      'fn define funciones con parámetros tipados. Las closures pueden capturar el entorno; Fn, FnMut y FnOnce describen cómo se pueden invocar.',
    why: 'El tipo de la closure expresa si puede leer, mutar o consumir capturas. Eso permite aceptar comportamientos sin ocultar cómo se usan sus recursos.',
    code: 'fn doble(x: i32) -> i32 { x * 2 }\nlet mut llamadas = 0;\nlet mut transformar = |x| {\n    llamadas += 1;\n    doble(x)\n};\nlet salida = transformar(3); // 6',
    explanation:
      'La closure necesita acceso mutable a llamadas y cumple FnMut. move controla que las capturas pasen a ser propias; no determina por sí solo que una closure solo pueda ejecutarse una vez. Consumir una captura durante la llamada es lo relevante para FnOnce.',
    comparison:
      'Como en JavaScript o Python, una función puede recibir comportamiento. Rust además refleja en traits las capacidades de invocación y verifica los préstamos de lo capturado.',
    pitfall:
      'Pedir Fn cuando tu algoritmo puede aceptar FnMut excluye innecesariamente closures con estado mutable.',
    quiz: quiz(
      '¿Una closure move siempre se consume en su primera llamada?',
      ['Sí', 'No: depende de qué hace con sus capturas', 'Solo si captura enteros'],
      1,
      'Puede poseer datos y leerlos repetidamente sin consumirlos.',
    ),
    labId: 'rust-59',
    source: source('Rust Book · Closures', 'https://doc.rust-lang.org/book/ch13-01-closures.html'),
  });

  add('rust', {
    id: 'rust-collections',
    level: 'medium',
    category: 'Datos y memoria',
    title: 'La colección expresa parte del algoritmo',
    summary:
      'Arrays tienen longitud fija; Vec crece; slices prestan una secuencia. HashMap busca por clave, BTreeSet ordena elementos únicos y VecDeque sirve para colas.',
    why: 'Orden, unicidad, propiedad y forma de acceso son contratos distintos. Elegir una estructura puede resolver una parte de la lógica sin código extra.',
    code: 'let mut datos = vec![3, 1, 3];\nlet vista: &[i32] = &datos[1..];\nassert_eq!(vista, &[1, 3]);\ndatos.push(8); // la vista ya no se usa después\nlet primero = datos.get(0); // Option<&i32>',
    explanation:
      'Vec posee sus elementos; &[T] presta un tramo y no obliga al llamador a usar un Vec. get comunica ausencia con Option. HashMap no garantiza orden de iteración: para una salida estable, ordená o elegí una colección ordenada.',
    comparison:
      'Un Vec se parece a una lista dinámica, pero su elemento T es homogéneo y prestar una vista limita las mutaciones concurrentes sobre el dueño. No tiene el contrato de un array JavaScript heterogéneo.',
    pitfall:
      'Vec::dedup elimina duplicados consecutivos; no elimina todas las repeticiones separadas sin ordenar o usar otra estrategia.',
    quiz: quiz(
      '¿Qué pide menos al llamador si solo leés una secuencia?',
      ['&Vec<T>', '&[T]', 'Vec<T> propio siempre'],
      1,
      'Un slice acepta vistas de arrays, vectores y subrangos sin exigir propiedad ni una colección concreta.',
    ),
    labId: 'rust-35',
    source: source('std · Collections', 'https://doc.rust-lang.org/std/collections/index.html'),
  });

  add('rust', {
    id: 'rust-structs',
    level: 'medium',
    category: 'Abstracción',
    title: 'Sin class: structs, métodos y composición',
    summary:
      'Rust no tiene clases con herencia de implementación. Usa structs para datos, impl para métodos y enums para alternativas; los tipos pueden componerse como campos.',
    why: 'Separar datos, comportamiento compartido y variantes evita depender de una jerarquía única para todos los problemas.',
    code: 'struct Motor { potencia: u32 }\nstruct Robot { motor: Motor }\nimpl Robot {\n    fn potencia(&self) -> u32 { self.motor.potencia }\n    fn ajustar(&mut self, n: u32) { self.motor.potencia = n; }\n}',
    explanation:
      '&self presta para observar; &mut self permite modificar; self por valor puede consumir la instancia. La privacidad de módulos protege campos. Un método constructor como new es una convención, no una palabra especial.',
    comparison:
      'Si venís de Java o C#, composición corresponde a tener otro objeto como campo. Rust admite encapsulación y polimorfismo con traits, pero no extends de structs ni constructores implícitos equivalentes.',
    pitfall:
      'La ausencia de class no significa ausencia de abstracción u orientación a objetos; necesitás identificar qué propiedades concretas querés modelar.',
    quiz: quiz(
      '¿Qué receptor comunica una modificación prestada de la instancia?',
      ['&self', '&mut self', 'Ninguno: todos son iguales'],
      1,
      '&mut self exige acceso exclusivo mientras ese préstamo se usa.',
    ),
    labId: 'rust-22',
    source: source(
      'Rust Book · Methods',
      'https://doc.rust-lang.org/book/ch05-03-method-syntax.html',
    ),
  });

  add('rust', {
    id: 'rust-interfaces',
    level: 'advanced',
    category: 'Abstracción',
    title: 'Traits: polimorfismo estático y dinámico',
    summary:
      'Un trait declara capacidades. T: Trait permite código genérico; dyn Trait permite usar implementaciones concretas distintas mediante una interfaz común en ejecución.',
    why: 'Podés elegir entre una colección homogénea con tipo concreto y una heterogénea detrás de referencias o punteros propietarios.',
    code: 'trait Costo { fn costo(&self) -> u32; }\nstruct Ticket(u32);\nimpl Costo for Ticket { fn costo(&self) -> u32 { self.0 } }\nfn estatico<T: Costo>(x: &T) -> u32 { x.costo() }\nfn dinamico(x: &dyn Costo) -> u32 { x.costo() }',
    explanation:
      'El trait se implementa explícitamente. Las llamadas genéricas normalmente se especializan para los tipos concretos; dyn usa despacho mediante una tabla de métodos. No todos los traits son compatibles con dyn.',
    comparison:
      'A diferencia de las interfaces implícitas de Go, Rust usa impl Trait for Tipo. A diferencia de una jerarquía de clases, compartir un trait no implica heredar campos.',
    pitfall:
      'dyn no elimina los requisitos de lifetimes, ownership o compatibilidad del trait. Tampoco garantiza que una alternativa sea más rápida sin medir el contexto.',
    quiz: quiz(
      '¿Qué permite Vec<Box<dyn Costo>>?',
      [
        'Guardar implementadores concretos distintos del trait',
        'Acceder a campos que no declara el trait',
        'Evitar todos los costos de indirección',
      ],
      0,
      'El tipo de elemento común oculta tipos concretos mientras mantiene el contrato Costo.',
    ),
    labId: 'rust-56',
    source: source(
      'Rust Book · Trait objects',
      'https://doc.rust-lang.org/book/ch18-02-trait-objects.html',
    ),
  });

  add('rust', {
    id: 'rust-functional',
    level: 'medium',
    category: 'Abstracción',
    title: 'Estilo funcional sin pureza obligatoria',
    summary:
      'Iteradores, closures, enums y pattern matching favorecen un estilo funcional. map y filter describen pasos perezosos que un consumidor ejecuta.',
    why: 'Separar selección, transformación y reducción puede expresar mejor la intención que mantener índices y acumuladores manuales.',
    code: 'let datos = [1, -2, 3];\nlet total: i32 = datos.iter().copied()\n    .filter(|x| *x > 0)\n    .map(|x| x * x)\n    .sum(); // 10',
    explanation:
      'map no construye un Vec por sí solo. collect, sum, count o for consumen el recorrido. El orden de filter y map puede cambiar el resultado. Rust permite efectos laterales y mutación: este estilo no convierte automáticamente una función en pura.',
    comparison:
      'A diferencia de Array.map de JavaScript, Iterator::map de Rust no materializa inmediatamente una nueva colección. La composición se parece a pipelines perezosos de otros lenguajes.',
    pitfall:
      'No uses la estética funcional como objetivo independiente: un for puede expresar mejor control de flujo complejo.',
    quiz: quiz(
      '¿Crear datos.iter().map(...) garantiza que la closure ya se ejecutó?',
      ['Sí', 'No, hace falta consumir el iterador', 'Solo cuando hay negativos'],
      1,
      'Los adaptadores de Iterator son perezosos.',
    ),
    labId: 'rust-36',
    source: source(
      'Rust Book · Iterators',
      'https://doc.rust-lang.org/book/ch13-02-iterators.html',
    ),
  });

  add('rust', {
    id: 'rust-generics',
    level: 'advanced',
    category: 'Abstracción',
    title: 'Genéricos que piden lo necesario',
    summary:
      'Los parámetros de tipo abstraen valores; los bounds declaran capacidades; los tipos asociados fijan salidas de un trait y los const generics parametrizan constantes como longitudes.',
    why: 'Una buena firma acepta todos los tipos que el algoritmo puede manejar sin pedir Clone, Copy o un tamaño fijo innecesariamente.',
    code: 'fn mayor<T: Ord>(xs: &[T]) -> Option<&T> { xs.iter().max() }\nfn cantidad<T, const N: usize>(_: &[T; N]) -> usize { N }\ntrait Fuente {\n    type Item;\n    fn siguiente(&mut self) -> Option<Self::Item>;\n}',
    explanation:
      'mayor compara y presta: no copia T. Ord garantiza orden total. N forma parte del tipo del array. Un tipo asociado Item se elige en cada impl y queda fijo para esa implementación.',
    comparison:
      'Como los genéricos de otros lenguajes, evitan duplicación por tipo. Sus restricciones se expresan mediante traits; no habilitan acceder a campos solo porque varios tipos se parezcan.',
    pitfall:
      'Un genérico no implica aceptar cualquier operación. Si el bound no promete un comportamiento, el cuerpo no puede asumirlo.',
    quiz: quiz(
      '¿Por qué mayor<T: Ord> puede funcionar con String sin T: Clone?',
      [
        'Porque clona en secreto',
        'Porque devuelve una referencia existente',
        'Porque Ord hereda Clone',
      ],
      1,
      'La comparación y el préstamo no requieren duplicar el elemento.',
    ),
    labId: 'rust-58',
    source: source('Rust Book · Generics', 'https://doc.rust-lang.org/book/ch10-01-syntax.html'),
  });

  add('rust', {
    id: 'rust-memory',
    level: 'advanced',
    category: 'Datos y memoria',
    title: 'Ownership, referencias y lifetimes',
    summary:
      'Un valor tiene un dueño; moverlo transfiere propiedad. &T presta lectura; &mut T presta acceso exclusivo. Los lifetimes describen cuánto pueden usarse las referencias.',
    why: 'Una referencia no debe sobrevivir a sus datos ni solaparse con accesos incompatibles. El compilador verifica esas relaciones para el código seguro.',
    code: "let mut texto = String::from(\"hola\");\nlet vista = &texto;\nlet bytes = vista.len(); // último uso del préstamo de lectura\ntexto.push('!');\nlet nuevo_dueno = texto; // texto ya no puede usarse\nfn elegir<'a>(a: &'a str, b: &'a str) -> &'a str {\n    if a.len() > b.len() { a } else { b }\n}",
    explanation:
      'Los enteros Copy se copian implícitamente; String se mueve por defecto. Los lifetimes no extienden la vida de los dueños: hacen explícitas relaciones que el compilador debe comprobar. El préstamo puede terminar después de su último uso.',
    comparison:
      'Frente a referencias administradas por GC, Rust exige demostrar validez de los préstamos. Frente a punteros crudos de C, las referencias seguras incluyen garantías de validez y acceso.',
    pitfall:
      'clone puede ser correcto si necesitás una copia independiente, pero usarlo para toda dificultad de préstamos puede esconder un diseño innecesariamente costoso.',
    quiz: quiz(
      '¿Agregar una anotación de lifetime hace vivir más a un String local?',
      ['Sí', 'No: expresa una relación, no cambia la duración', 'Solo con static'],
      1,
      'El dueño sigue teniendo su duración; Rust verifica que la referencia no lo exceda.',
    ),
    labId: 'rust-44',
    source: source(
      'Rust Book · Lifetimes',
      'https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html',
    ),
  });

  add('rust', {
    id: 'rust-errors',
    level: 'medium',
    category: 'Control y errores',
    title: 'Ausencia, errores y panic son decisiones distintas',
    summary:
      'Option representa presencia o ausencia. Result distingue éxito y error recuperable. ? propaga un error; panic interrumpe el flujo normal y no sustituye la validación esperable.',
    why: 'Los tipos obligan al llamador a considerar respuestas que de otro modo podrían olvidarse o confundirse con cero y cadena vacía.',
    code: 'fn puerto(s: &str) -> Result<u16, &\'static str> {\n    let n = s.parse::<u16>().map_err(|_| "numero")?;\n    if n == 0 { Err("cero") } else { Ok(n) }\n}\nlet primero = [0, 3].first(); // Some(&0), distinto de None',
    explanation:
      'Err es un valor, no una excepción lanzada automáticamente. ? devuelve temprano el error compatible desde la función. En bibliotecas, enums de errores pueden conservar causas y datos; Display aporta una presentación independiente.',
    comparison:
      'Frente a excepciones de Java o Python, los errores habituales están visibles en Result. Go también devuelve errores explícitos, pero usa resultados múltiples y el contrato error/nil.',
    pitfall:
      'unwrap transforma un caso no tratado en panic. Es razonable en algunos tests o invariantes justificadas, pero no valida una entrada externa.',
    quiz: quiz(
      '¿Some(0) y None expresan lo mismo?',
      [
        'Sí',
        'No: cero presente y ausencia son estados distintos',
        'Solo si el retorno es numérico',
      ],
      1,
      'El contenido cero es un dato válido dentro de Some.',
    ),
    labId: 'rust-29',
    source: source(
      'Rust Book · Recoverable errors',
      'https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html',
    ),
  });

  add('rust', {
    id: 'rust-modules',
    level: 'medium',
    category: 'Herramientas',
    title: 'Módulos, crates y Cargo',
    summary:
      'Un crate es una unidad de compilación; los módulos organizan nombres y privacidad. Cargo administra paquetes, dependencias, builds y herramientas del proyecto.',
    why: 'La organización permite exponer una API estable y mantener detalles internos privados, además de reproducir cómo se construye y prueba el programa.',
    code: 'mod configuracion {\n    pub struct Config { limite: usize }\n    impl Config {\n        pub fn nueva() -> Self { Self { limite: 10 } }\n        pub fn limite(&self) -> usize { self.limite }\n    }\n}\nuse configuracion::Config;\n// Proyecto local: cargo test, cargo fmt, cargo clippy',
    explanation:
      'pub en el struct no publica sus campos. pub use permite reexportar una fachada. Cargo.toml describe el paquete y dependencias; Cargo.lock registra resoluciones. Los tests unitarios, de integración y doctests observan distintas fronteras.',
    comparison:
      'Un archivo no equivale necesariamente a un módulo público ni a un paquete como en otros ecosistemas. Cargo reúne herramientas que en otros lenguajes se configuran mediante varios programas separados.',
    pitfall:
      'El laboratorio ejecuta fragmentos std; no simula un workspace real, gestión de dependencias, cargo test completo ni benchmarks de tu equipo.',
    quiz: quiz(
      '¿Publicar un struct publica automáticamente todos sus campos?',
      ['Sí', 'No', 'Solo fuera del crate'],
      1,
      'Cada campo puede mantener su propia privacidad y proteger invariantes.',
    ),
    labId: 'rust-61',
    source: source('Cargo Book · Guide', 'https://doc.rust-lang.org/cargo/guide/index.html'),
  });

  add('rust', {
    id: 'rust-concurrency',
    level: 'advanced',
    category: 'Concurrencia',
    title: 'Threads, mensajes y acceso compartido',
    summary:
      'std::thread crea threads; join espera su resultado. Los canales transfieren mensajes y Arc<Mutex<T>> combina propiedad compartida con acceso sincronizado.',
    why: 'Transferir un valor, compartir su vida y permitir escritura son problemas diferentes. Send y Sync hacen que muchas de estas reglas participen del chequeo de tipos.',
    code: 'let texto = String::from("trabajo");\nlet worker = std::thread::spawn(move || texto.len());\nlet bytes = worker.join().expect("worker sin panic");\n// Arc: varios dueños entre threads.\n// Mutex: acceso mutuamente excluyente al contenido.',
    explanation:
      'Send permite transferir propiedad entre threads; Sync permite compartir referencias. Arc por sí solo no vuelve seguro mutar cualquier contenido. join establece finalización real; sleep no prueba que un trabajo haya terminado.',
    comparison:
      'Rust exige que las transferencias respeten Send/Sync. En Go, el compilador no tiene un borrow checker equivalente; sincronización y detector de carreras cumplen otras partes del trabajo.',
    pitfall:
      'Código Rust seguro todavía puede tener deadlocks o carreras lógicas. Una suite de resultados correctos no demuestra ausencia de todas las fallas concurrentes.',
    quiz: quiz(
      '¿Arc<T> hace atómicas todas las operaciones sobre T?',
      [
        'Sí',
        'No: comparte propiedad, el contenido necesita su contrato',
        'Solo si T está en el heap',
      ],
      1,
      'Arc sincroniza su conteo propietario, no cualquier operación arbitraria sobre el valor.',
    ),
    labId: 'rust-70',
    source: source(
      'Rust Book · Send and Sync',
      'https://doc.rust-lang.org/book/ch16-04-extensible-concurrency-sync-and-send.html',
    ),
  });

  add('rust', {
    id: 'rust-async',
    level: 'expert',
    category: 'Concurrencia',
    title: 'Async, Future, Waker y Pin',
    summary:
      'async construye un Future; await compone su avance. Un executor consulta poll y usa Waker para programar nuevos intentos. Pin participa en garantizar estabilidad de ubicación cuando hace falta.',
    why: 'Muchas tareas que esperan I/O pueden compartir threads de ejecución. Para entender ese modelo hay que separar crear una tarea, avanzar su estado y ejecutarla en paralelo.',
    code: 'async fn respuesta() -> u32 {\n    let base = std::future::ready(20).await;\n    base + 2\n}\nlet futuro = respuesta(); // todavía necesita ejecución\nlet fijado = Box::pin(futuro);\n// Un executor real avanzaría este Future mediante poll.',
    explanation:
      'El cuerpo async no empieza solo por construir su Future. Pending conserva estado; Ready entrega el resultado. No todo await suspende. Un runtime externo suele ofrecer I/O, temporizadores y planificación; std define contratos fundamentales.',
    comparison:
      'Go expresa concurrencia con goroutines y operaciones que pueden bloquearlas. Rust async representa explícitamente Futures; ni una goroutine ni un Future garantizan por sí solos paralelismo simultáneo.',
    pitfall:
      'Los polls manuales y Wakers didácticos del laboratorio no son un runtime general. Bloquear un thread del executor puede impedir el progreso de otras tareas.',
    quiz: quiz(
      '¿Llamar una función async crea automáticamente un thread?',
      ['Sí', 'No: produce un Future', 'Solo si hay dos await'],
      1,
      'El executor y la manera de programar el Future determinan cómo avanza.',
    ),
    labId: 'rust-67',
    source: source('std · Future', 'https://doc.rust-lang.org/std/future/trait.Future.html'),
  });

  add('rust', {
    id: 'rust-expert',
    level: 'expert',
    category: 'Datos y memoria',
    title: 'Límites avanzados: Drop, punteros y macros',
    summary:
      'Box posee una asignación; Rc/Weak modelan propiedad compartida en un thread; RefCell comprueba préstamos en ejecución. Drop gestiona limpieza. unsafe y macros requieren revisar contratos específicos.',
    why: 'Estas herramientas cubren representaciones o abstracciones que el modelo cotidiano no expresa por sí solo. Su uso debe tener una necesidad y una justificación local claras.',
    code: 'fn primero(datos: &[u32]) -> Option<u32> {\n    if datos.is_empty() { return None; }\n    // SAFETY: el slice mantiene un u32 válido y alineado.\n    Some(unsafe { *datos.as_ptr() })\n}\n// La versión habitual sería datos.first().copied().\nmacro_rules! doble { ($x:expr) => { 2 * $x }; }',
    explanation:
      'Drop enlaza limpieza con vida del dueño; Weak evita retener contenido por un enlace no propietario. unsafe permite operaciones concretas cuya validez debés garantizar: no desactiva todas las reglas. macro_rules genera Rust que después se verifica.',
    comparison:
      'Frente al GC, Drop permite limpieza asociada al alcance pero no sustituye todas las políticas de recursos. Frente a metaprogramación por strings, macro_rules reconoce fragmentos sintácticos y genera código tipado.',
    pitfall:
      'Pasar tests no prueba que un bloque unsafe sea correcto. Rc puede formar ciclos; RefCell puede rechazar préstamos; una macro puede duplicar efectos si repite una expresión.',
    quiz: quiz(
      '¿Unsafe vuelve válida cualquier dirección de memoria?',
      ['Sí', 'No: las obligaciones de validez siguen existiendo', 'Solo con optimizaciones'],
      1,
      'Quien escribe unsafe debe demostrar que respeta las reglas que esa operación requiere.',
    ),
    labId: 'rust-72',
    source: source(
      'Rust Book · Advanced features',
      'https://doc.rust-lang.org/book/ch20-00-advanced-features.html',
    ),
    furtherSources: [
      source(
        'Especialización · Punteros inteligentes',
        'https://doc.rust-lang.org/book/ch15-00-smart-pointers.html',
      ),
      source(
        'Especialización · Drop y recursos',
        'https://doc.rust-lang.org/std/ops/trait.Drop.html',
      ),
      source(
        'Especialización · Macros declarativas',
        'https://doc.rust-lang.org/reference/macros-by-example.html',
      ),
      source('Especialización · Unsafe', 'https://doc.rust-lang.org/reference/unsafe-keyword.html'),
    ],
  });

  add('go', {
    id: 'go-identity',
    level: 'beginner',
    category: 'Fundamentos',
    title: 'Qué lenguaje estás aprendiendo',
    summary:
      'Go es compilado y de tipado estático, con recolector de basura. Favorece funciones, composición, interfaces pequeñas y concurrencia mediante goroutines y canales.',
    why: 'Su diseño busca que el código de sistemas y servicios sea legible y que equipos puedan construir, probar y mantener programas con herramientas comunes.',
    code: 'func Total(datos []int) int {\n    total := 0\n    for _, n := range datos {\n        total += n\n    }\n    return total\n}',
    explanation:
      'El ejemplo es imperativo y explícito. Go también admite funciones como valores, closures, genéricos y polimorfismo por interfaces. No exige un paradigma funcional puro ni una jerarquía de clases para organizar el programa.',
    comparison:
      'Frente a JavaScript o Python, los tipos de las operaciones se verifican antes de ejecutar. Frente a Rust, la gestión usual de memoria usa GC y no exige demostrar lifetimes de referencias con un borrow checker.',
    pitfall:
      'La sencillez de la sintaxis no elimina complejidad de diseño. Un programa con goroutines todavía puede bloquearse o tener carreras.',
    quiz: quiz(
      '¿Go exige una clase para agrupar cada función?',
      [
        'Sí',
        'No: las funciones pueden pertenecer directamente a un paquete',
        'Solo si retorna un int',
      ],
      1,
      'Los paquetes organizan funciones, tipos y otros elementos sin exigir clases.',
    ),
    labId: 'go-01',
    source: source('Go FAQ · Language design', 'https://go.dev/doc/faq'),
  });

  add('go', {
    id: 'go-syntax',
    level: 'beginner',
    category: 'Fundamentos',
    title: 'Variables, valor cero y declaraciones cortas',
    summary:
      'var declara variables; := declara e inicializa dentro de funciones. Las variables son reasignables y conservan su tipo. Todo valor tiene una forma cero.',
    why: 'El valor cero permite que muchas estructuras sean utilizables sin constructores. La distinción entre declarar y reasignar evita confusiones sobre qué variable cambia.',
    code: 'var total int        // 0\nvar activo bool      // false\nvar nombre string    // ""\ntotal = 3\nlimite := 10         // declaración local con tipo inferido\nlimite += total\nconst Maximo = 100',
    explanation:
      'En el mismo bloque, := exige al menos una variable nueva no vacía; puede reutilizar otras existentes. En un bloque interior puede ocultar una variable exterior. const define constantes, no una variante general de variable inmutable.',
    comparison:
      'A diferencia de Rust, no existe let mut: las variables Go son mutables por defecto. A diferencia de JavaScript, reasignar no cambia libremente el tipo de una variable.',
    pitfall:
      'Un := dentro de if o de otro bloque puede crear una variable nueva cuando pretendías modificar la exterior. Leé el alcance, no solo el nombre.',
    quiz: quiz(
      '¿Qué valor tiene var cantidad int antes de asignarle otro?',
      ['Indefinido', '0', 'nil'],
      1,
      'Los enteros se inicializan con su valor cero.',
    ),
    labId: 'go-03',
    source: source(
      'Go Specification · Declarations and scope',
      'https://go.dev/ref/spec#Declarations_and_scope',
    ),
  });

  add('go', {
    id: 'go-types',
    level: 'beginner',
    category: 'Datos y memoria',
    title: 'Números, tipos definidos y Unicode',
    summary:
      'Go tiene enteros, floats, complejos, bool y string. byte es alias de uint8; rune es alias de int32. Los tipos definidos tienen identidad; los aliases preservan identidad existente.',
    why: 'La representación determina rango y significado. Un string contiene bytes y puede tener UTF-8 inválido; recorrerlo como runes es otra operación.',
    code: 'type UserID int64\ntype OrderID int64 // tipo definido distinto\ntype Byte = uint8  // alias\ns := "ñ"\nbytes := len(s)          // 2\nrunes := len([]rune(s))  // 1\npromedio := float64(5) / 2 // 2.5',
    explanation:
      'int depende de la arquitectura; int32 e int64 fijan su tamaño. Una conversión numérica explícita no es necesariamente validación de rango. range sobre string decodifica UTF-8 y entrega índices de bytes y runes; un rune no equivale siempre a un grafema visible.',
    comparison:
      'Frente al number habitual de JavaScript, los tipos numéricos distinguen representación. Como en Rust, longitud en bytes y cantidad de unidades Unicode no son lo mismo; Go string puede contener bytes que no forman UTF-8 válido.',
    pitfall:
      'float64(a / b) convierte después de hacer división entera. Para obtener decimales, convertí un operando antes de dividir.',
    quiz: quiz(
      'Con a y b int, ¿float64(a / b) recupera la fracción descartada?',
      ['Sí', 'No: la división entera ya ocurrió', 'Solo si a es positivo'],
      1,
      'La conversión debe preceder a la operación si querés división flotante.',
    ),
    labId: 'go-19',
    source: source('Go Specification · Types', 'https://go.dev/ref/spec#Types'),
  });

  add('go', {
    id: 'go-flow',
    level: 'beginner',
    category: 'Control y errores',
    title: 'if, switch, for y range',
    summary:
      'if necesita bool. switch selecciona casos y no cae automáticamente al siguiente. for cubre los bucles tradicionales, condicionales e infinitos; range recorre estructuras.',
    why: 'Pocas formas sintácticas cubren muchos recorridos. Aun así, conviene entender qué valores entrega range para cada tipo.',
    code: 'for i := 0; i < 3; i++ {\n    fmt.Println(i)\n}\nfor indice, valor := range []int{8, 9} {\n    fmt.Println(indice, valor)\n}\nswitch codigo {\ncase 200: return "ok"\ncase 404: return "ausente"\ndefault: return "otro"\n}',
    explanation:
      'No hay while separado: for condicion hace ese trabajo. if y switch son sentencias, no expresiones que asignen un valor directamente. Un switch sin expresión puede organizar condiciones booleanas.',
    comparison:
      'A diferencia del switch tradicional de C o JavaScript, no necesitás break para impedir caída automática al caso siguiente. A diferencia de Rust match, un switch común no garantiza exhaustividad de un enum algebraico.',
    pitfall:
      'range sobre un map no garantiza orden estable. No bases una salida reproducible en el orden observado en una ejecución.',
    quiz: quiz(
      '¿Qué sucede al terminar un case normal de switch?',
      [
        'Continúa automáticamente al siguiente case',
        'Termina ese switch salvo control explícito diferente',
        'Repite el switch',
      ],
      1,
      'La caída al siguiente caso no es implícita; fallthrough es una instrucción explícita con reglas propias.',
    ),
    labId: 'go-08',
    source: source('Go Specification · Statements', 'https://go.dev/ref/spec#Statements'),
  });

  add('go', {
    id: 'go-functions',
    level: 'medium',
    category: 'Abstracción',
    title: 'Funciones, resultados múltiples y closures',
    summary:
      'Las funciones son valores: pueden pasarse, guardarse y devolverse. Los resultados múltiples permiten devolver un dato y su estado. Las closures capturan variables del entorno.',
    why: 'Podés introducir comportamiento y mantener estado local sin crear una clase. Los resultados múltiples hacen visibles varias dimensiones de una operación.',
    code: 'func Contador() func() int {\n    n := 0\n    return func() int { n++; return n }\n}\nfunc Dividir(a, b int) (int, bool) {\n    if b == 0 { return 0, false }\n    return a / b, true\n}',
    explanation:
      'Cada llamada a Contador crea un estado n diferente; las funciones devueltas por esa llamada mantienen acceso a su variable capturada. El bool de Dividir debe interpretarse según el contrato: no es una excepción automática.',
    comparison:
      'Las closures se parecen a las de JavaScript o Python. Go no expresa Fn/FnMut/FnOnce como Rust: la firma de función no informa si una captura será modificada.',
    pitfall:
      'Compartir la misma closure con estado entre goroutines puede introducir una carrera. Capturar una variable no agrega sincronización.',
    quiz: quiz(
      '¿Dos llamadas independientes a Contador comparten necesariamente el mismo n?',
      ['Sí', 'No: cada llamada crea su propio estado capturado', 'Solo si el retorno se guarda'],
      1,
      'Cada invocación crea una nueva variable local que puede escapar mediante su closure.',
    ),
    labId: 'go-10',
    source: source(
      'Go Specification · Function literals',
      'https://go.dev/ref/spec#Function_literals',
    ),
  });

  add('go', {
    id: 'go-collections',
    level: 'medium',
    category: 'Datos y memoria',
    title: 'Arrays, slices y maps',
    summary:
      'Un array incluye su longitud en el tipo. Un slice describe una vista sobre un array subyacente. Un map relaciona claves comparables con valores.',
    why: 'Copiar una variable no siempre copia todos los datos alcanzables. Entender qué parte se comparte evita cambios accidentales entre vistas.',
    code: 'base := []int{1, 2, 3}\nvista := base[:2]\nvista[0] = 9           // base[0] también es 9\ncopia := append([]int(nil), base...)\ncopia[0] = 7           // base no cambia por esto\nbase = append(base, 4)  // conservá el slice devuelto',
    explanation:
      'Copiar un slice copia su descriptor, que sigue señalando almacenamiento compartido. append puede reutilizar o reemplazar el array; por eso su retorno importa. Un map nil permite lecturas, pero insertar requiere inicializarlo con make o un literal.',
    comparison:
      'Rust evita ciertos solapamientos de préstamo mutable en compilación. Go permite compartir estas vistas: el programa debe coordinar cuándo sus mutaciones son intencionales.',
    pitfall:
      'Copiar un slice de structs o punteros puede seguir siendo una copia superficial de los datos anidados. Un slice nuevo no garantiza independencia profunda.',
    quiz: quiz(
      '¿b := a clona los elementos si a es un slice?',
      [
        'Sí, siempre',
        'No: copia el descriptor y puede compartir el array',
        'Solo si len(a) es pequeño',
      ],
      1,
      'La copia independiente de elementos requiere una operación adicional.',
    ),
    labId: 'go-13',
    source: source('Go Blog · Slices internals', 'https://go.dev/blog/slices-intro'),
  });

  add('go', {
    id: 'go-structs',
    level: 'medium',
    category: 'Abstracción',
    title: 'Structs, métodos y composición',
    summary:
      'Go no tiene class ni herencia clásica de implementación. Los structs agrupan datos; los métodos se asocian a tipos definidos y pueden recibir valores o punteros.',
    why: 'Un receptor puntero permite modificar el objeto original. La composición y el embedding permiten reutilizar piezas sin una jerarquía de subclases.',
    code: 'type Motor struct { Potencia int }\ntype Robot struct { Motor; Nombre string }\nfunc (r *Robot) Ajustar(n int) { r.Potencia = n }\nfunc (r Robot) PotenciaActual() int { return r.Potencia }\n// Motor embebido promueve campos y métodos permitidos.',
    explanation:
      'El receptor valor es una copia del valor recibido; si contiene slices o punteros, esos campos pueden seguir alcanzando datos compartidos. El embedding promueve nombres, pero no convierte Robot en una subclase de Motor.',
    comparison:
      'Frente a Java o C#, un método con receptor explícito hace visible la elección de valor/puntero. Frente a herencia tradicional, embedding no aporta automáticamente sustitución por el tipo embebido.',
    pitfall:
      'Un método que incrementa un campo numérico con receptor valor modifica su copia. Usá *T si el contrato exige cambiar el original.',
    quiz: quiz(
      '¿Qué receptor sirve para persistir cambios en un campo int del original?',
      ['T', '*T', 'Ambos siempre hacen lo mismo'],
      1,
      'El receptor puntero permite acceder al valor original y modificar sus campos.',
    ),
    labId: 'go-57',
    source: source('Effective Go · Embedding', 'https://go.dev/doc/effective_go#embedding'),
  });

  add('go', {
    id: 'go-interfaces',
    level: 'advanced',
    category: 'Abstracción',
    title: 'Interfaces implícitas y conjuntos de métodos',
    summary:
      'Un tipo satisface una interfaz al tener sus métodos requeridos; no declara implements. Los conjuntos de métodos de T y *T pueden diferir.',
    why: 'El consumidor puede declarar una interfaz pequeña que refleje lo que necesita, sin modificar todos los productores para anunciar esa relación.',
    code: 'type Contador struct { N int }\nfunc (c *Contador) Incrementar() { c.N++ }\ntype Incrementable interface { Incrementar() }\nvar x Incrementable = &Contador{} // *Contador satisface\n// Contador{} no tiene el mismo conjunto de métodos.',
    explanation:
      'La satisfacción de interfaces es estructural por métodos, aunque los tipos concretos definidos con nombres tienen identidad propia. Una interfaz guarda tipo dinámico y valor dinámico: un puntero nil dentro de ella puede hacer que la interfaz no sea nil.',
    comparison:
      'A diferencia de Rust, no escribís impl Trait for Tipo. A diferencia del duck typing dinámico, la asignación a una interfaz se comprueba estáticamente según conjuntos de métodos.',
    pitfall:
      'Que el compilador permita c.Incrementar() tomando la dirección de una variable no implica que Contador satisfaga una interfaz que exige ese método.',
    quiz: quiz(
      'Si una interfaz contiene (*MiError)(nil), ¿es necesariamente igual a nil?',
      [
        'Sí',
        'No: conserva un tipo dinámico aunque el puntero sea nil',
        'Solo si Error devuelve texto vacío',
      ],
      1,
      'Una interfaz nil no tiene ni tipo dinámico ni valor dinámico.',
    ),
    labId: 'go-35',
    source: source('Go FAQ · Nil interfaces', 'https://go.dev/doc/faq#nil_error'),
  });

  add('go', {
    id: 'go-functional',
    level: 'medium',
    category: 'Abstracción',
    title: 'Funciones de orden superior sin pureza obligatoria',
    summary:
      'Go permite closures y funciones de orden superior. Un estilo funcional se puede escribir con helpers genéricos, aunque un for directo suele ser una opción clara.',
    why: 'Separar una transformación de su recorrido permite reutilizar comportamiento. La elección debe ayudar a leer y comprobar el programa.',
    code: 'func Map[A, B any](xs []A, f func(A) B) []B {\n    out := make([]B, len(xs))\n    for i, x := range xs { out[i] = f(x) }\n    return out\n}\n// Map([]int{1, 2}, func(x int) int { return x * 2 })',
    explanation:
      'Este Map particular es inmediato: recorre todos los elementos y aloca la salida al llamarlo. No es una primitiva especial del lenguaje ni un iterador perezoso. La closure puede tener efectos: Go no declara pureza en el tipo func.',
    comparison:
      'Se parece a Array.map de JavaScript en evaluación inmediata. A diferencia de Iterator::map de Rust, esta implementación concreta no espera a un consumidor para ejecutarse.',
    pitfall:
      'Crear helpers funcionales para cada bucle puede dificultar depuración y control de errores. Si la función transforma y falla, diseñá también cómo se propaga el error.',
    quiz: quiz(
      '¿El tipo func(int) int garantiza ausencia de efectos laterales?',
      ['Sí', 'No: la función puede modificar capturas o realizar I/O', 'Solo si se usa en Map'],
      1,
      'La firma define parámetros y resultado, no un sistema de efectos o pureza.',
    ),
    labId: 'go-54',
    source: source('Go Specification · Function types', 'https://go.dev/ref/spec#Function_types'),
  });

  add('go', {
    id: 'go-generics',
    level: 'advanced',
    category: 'Abstracción',
    title: 'Parámetros de tipo y constraints',
    summary:
      'Los genéricos abstraen tipos. Las constraints limitan qué tipos se aceptan y qué operaciones puede usar el cuerpo. any es una interfaz vacía; comparable permite comparaciones de igualdad.',
    why: 'Una función genérica conserva información de tipos sin convertir todos los valores a una interfaz dinámica ni duplicar el algoritmo para cada tipo.',
    code: 'type Entero interface { ~int | ~int64 }\nfunc Sumar[T Entero](a, b T) T { return a + b }\ntype Puntos int\n// Sumar(Puntos(2), Puntos(3)) devuelve Puntos(5).\nfunc Primero[T any](xs []T) (T, bool) {\n    if len(xs) > 0 { return xs[0], true }\n    var cero T\n    return cero, false\n}',
    explanation:
      '~int incluye tipos cuyo tipo subyacente es int, como Puntos. Una unión expresa un conjunto de tipos admitidos. Algunas interfaces usadas como constraints no son tipos válidos para variables ordinarias.',
    comparison:
      'Como los bounds de Rust, las constraints declaran operaciones permitidas. Go no usa el mismo sistema de lifetimes ni const generics para longitudes de arrays.',
    pitfall:
      'any no habilita automáticamente +, ordenar o acceder a campos. Necesitás una constraint que justifique cada operación.',
    quiz: quiz(
      '¿Qué diferencia int de ~int en una constraint?',
      [
        'Ninguna',
        '~int incluye tipos definidos cuyo subyacente es int',
        '~int incluye todos los floats',
      ],
      1,
      'El símbolo ~ amplía el conjunto a tipos con ese subyacente.',
    ),
    labId: 'go-52',
    source: source(
      'Go Specification · Type parameters',
      'https://go.dev/ref/spec#Type_parameter_declarations',
    ),
  });

  add('go', {
    id: 'go-memory',
    level: 'advanced',
    category: 'Datos y memoria',
    title: 'Punteros, copias y recolector de basura',
    summary:
      '& obtiene una dirección; * accede al dato apuntado. Los argumentos se pasan por valor, incluidos los punteros. El GC recupera memoria que dejó de ser alcanzable; no cierra tus recursos externos automáticamente.',
    why: 'Compartir una dirección permite modificar el original. Entender la diferencia entre copiar el puntero y copiar todo el objeto explica efectos que a veces parecen pasaje por referencia.',
    code: 'func Incrementar(p *int) { (*p)++ }\nfunc Nuevo() *int {\n    n := 7\n    return &n // válido: la implementación conserva los datos\n}\nx := 2\nIncrementar(&x) // x pasa a 3',
    explanation:
      'Un puntero se copia como valor y ambas copias pueden acceder al mismo objeto. No hay aritmética ordinaria de punteros como en C. El compilador y runtime gestionan dónde debe vivir un dato que escapa; devolver &n no crea por sí solo un puntero colgante.',
    comparison:
      'A diferencia de Rust, no anotás lifetimes y puede haber múltiples aliases mutables sin rechazo estático. Eso hace más importante revisar efectos compartidos y sincronizar accesos entre goroutines.',
    pitfall:
      'GC no evita retener innecesariamente grandes arrays mediante un pequeño slice, ni resuelve carreras, ni garantiza cierre oportuno de archivos.',
    quiz: quiz(
      '¿Pasar *int a una función sigue siendo pasaje por valor?',
      [
        'Sí: se copia el puntero, que apunta al mismo dato',
        'No: Go tiene un modo especial de pasaje por referencia',
        'Solo si el número es cero',
      ],
      0,
      'Se copia el valor puntero; la mutación alcanza el dato compartido.',
    ),
    labId: 'go-22',
    source: source('Go FAQ · Stack or heap', 'https://go.dev/doc/faq#stack_or_heap'),
  });

  add('go', {
    id: 'go-errors',
    level: 'medium',
    category: 'Control y errores',
    title: 'Errores como valores con contexto',
    summary:
      'La convención habitual devuelve (T, error). nil indica ausencia de error según la API. Los errores pueden envolverse con contexto y consultarse con errors.Is o errors.As.',
    why: 'El llamador decide si reintenta, informa o propaga. Conservar la causa permite agregar información sin romper la detección del error original.',
    code: 'func Cargar() ([]byte, error) {\n    datos, err := os.ReadFile("config.txt")\n    if err != nil {\n        return nil, fmt.Errorf("cargar configuración: %w", err)\n    }\n    return datos, nil\n}\n// errors.Is(err, os.ErrNotExist) inspecciona la cadena.',
    explanation:
      'error es una interfaz con Error() string. %w mantiene una relación con la causa. errors.As permite extraer un error de un tipo relevante. El snippet ilustra una API de archivos y requiere los imports correspondientes en un proyecto local.',
    comparison:
      'Como Result de Rust, los errores están visibles en la firma, pero el compilador de Go no impide todas las omisiones de tratamiento. panic/recover existe y tiene otra finalidad que el error esperado ordinario.',
    pitfall:
      'Comparar err.Error() con una cadena mezcla presentación y lógica. Devolver un puntero nil tipado como error también puede crear una interfaz no nil.',
    quiz: quiz(
      '¿Qué verbo conserva la causa al envolver un error con fmt.Errorf?',
      ['%s', '%w', '%d'],
      1,
      '%w permite que errors.Is y errors.As recorran la relación de errores envueltos.',
    ),
    labId: 'go-28',
    source: source('Go Blog · Working with errors', 'https://go.dev/blog/go1.13-errors'),
  });

  add('go', {
    id: 'go-modules',
    level: 'medium',
    category: 'Herramientas',
    title: 'Paquetes, módulos y herramientas',
    summary:
      'Los paquetes organizan código. Los identificadores que empiezan con mayúscula pueden exportarse; los módulos agrupan paquetes y versionan dependencias mediante go.mod.',
    why: 'Una API pública pequeña reduce dependencias sobre implementación. Las herramientas estándar dan un flujo común para formato, análisis y pruebas.',
    code: 'package contador\n\ntype Contador struct { valor int }\nfunc Nuevo() *Contador { return &Contador{} }\nfunc (c *Contador) Valor() int { return c.valor }\n// Proyecto local: go test ./...\n// go test -race ./...   ·   go vet ./...\n// gofmt y go mod tidy pertenecen al flujo de herramientas.',
    explanation:
      'Contador, Nuevo y Valor son nombres exportados; valor permanece interno al paquete. Un módulo tiene una ruta y un go.mod; go.sum registra sumas de contenido utilizadas en la verificación de dependencias. Los archivos _test.go integran pruebas con el paquete testing.',
    comparison:
      'La privacidad se organiza por paquetes y nombres, no por public/private en cada declaración como otros lenguajes. Un módulo puede contener varios paquetes.',
    pitfall:
      'El laboratorio ejecuta fragmentos: no finge correr go test -race, go vet, fuzzing, builds multicarpeta o mediciones de rendimiento locales.',
    quiz: quiz(
      '¿Qué hace exportable al método Valor de este paquete?',
      ['Su nombre empieza con mayúscula', 'Que devuelva int', 'Que tenga receptor puntero'],
      0,
      'La capitalización inicial es parte de la regla de exportación, junto con el contexto de declaración.',
    ),
    labId: 'go-71',
    source: source('Go Modules Reference', 'https://go.dev/ref/mod'),
  });

  add('go', {
    id: 'go-concurrency',
    level: 'advanced',
    category: 'Concurrencia',
    title: 'Goroutines, canales y sincronización',
    summary:
      'go inicia una goroutine. Los canales comunican valores y sincronizan operaciones. Mutex, WaitGroup y atómicos cubren otras necesidades de coordinación.',
    why: 'Organizar tareas concurrentes requiere decidir quién posee los datos, quién espera a quién y cómo termina cada tarea.',
    code: 'ch := make(chan int)\ngo func() {\n    ch <- 7\n    close(ch) // este productor sabe que terminó\n}()\nfor valor := range ch {\n    fmt.Println(valor)\n}',
    explanation:
      'Un canal sin buffer sincroniza envío y recepción. range termina después de que el canal se cierre y se consuman los valores pendientes. Un canal con buffer cambia cuándo bloquea, pero no elimina la necesidad de diseñar el cierre y la finalización.',
    comparison:
      'Una goroutine no equivale a crear necesariamente un thread del sistema por tarea. Frente a Rust, Go confía en el diseño de sincronización y en herramientas como el detector de carreras para encontrar accesos incompatibles.',
    pitfall:
      'Concurrencia no significa paralelismo garantizado. Dormir para esperar trabajo es frágil; usá una señal o mecanismo de espera real.',
    quiz: quiz(
      '¿Un buffer de canal elimina automáticamente los deadlocks?',
      [
        'Sí',
        'No: solo cambia ciertas condiciones de bloqueo',
        'Solo si su tamaño es mayor que uno',
      ],
      1,
      'Todavía puede faltar un receptor, una señal de finalización o un cierre adecuado.',
    ),
    labId: 'go-42',
    source: source('Effective Go · Concurrency', 'https://go.dev/doc/effective_go#concurrency'),
  });

  add('go', {
    id: 'go-async',
    level: 'expert',
    category: 'Concurrencia',
    title: 'Esperar y cancelar sin async/await',
    summary:
      'Go no define palabras async y await. La concurrencia se expresa con goroutines, canales y APIs que coordinan espera. context.Context transporta cancelación, deadlines y valores de alcance de solicitud.',
    why: 'Una tarea que ya no necesita el llamador debería poder detener su trabajo y liberar recursos. Eso requiere cooperación de la tarea.',
    code: 'func Esperar(ctx context.Context, ch <-chan int) (int, error) {\n    select {\n    case <-ctx.Done():\n        return 0, ctx.Err()\n    case n, ok := <-ch:\n        if !ok { return 0, io.EOF }\n        return n, nil\n    }\n}',
    explanation:
      'select espera entre operaciones de canales listas. Si varias están listas, no debés asumir prioridad de la primera escrita. Cancelar un contexto no mata una goroutine: el código debe observarlo o llamar a APIs que lo respeten.',
    comparison:
      'Frente a los Futures de Rust o promesas de JavaScript, Go no marca la función con async para esperar una operación. Eso no autoriza asumir que cualquier llamada sea cancelable ni que todas las esperas consuman los mismos recursos.',
    pitfall:
      'Omitir cancel() de un contexto derivado puede retener recursos hasta que venza o se cancele su padre. No uses context como bolsa de parámetros opcionales de cualquier función.',
    quiz: quiz(
      '¿Cancelar un Context termina forzosamente todas las goroutines que lo recibieron?',
      ['Sí', 'No: deben cooperar observando la cancelación', 'Solo si se llama dos veces'],
      1,
      'La cancelación es una señal; no interrumpe arbitrariamente el código.',
    ),
    labId: 'go-61',
    source: source('context · Package documentation', 'https://pkg.go.dev/context'),
  });

  add('go', {
    id: 'go-expert',
    level: 'expert',
    category: 'Herramientas',
    title: 'Defer, reflexión y límites de unsafe',
    summary:
      'defer programa trabajo para la salida de la función. reflect inspecciona tipos en ejecución. unsafe, cgo y el ajuste del GC son especializaciones con contratos y herramientas propias.',
    why: 'La limpieza explícita y las herramientas de introspección son útiles, pero cada una cambia qué debe revisar el programador sobre costos, control y seguridad.',
    code: 'func Demo() {\n    n := 1\n    defer fmt.Println(n) // captura el argumento ahora: 1\n    defer func() { fmt.Println(n) }() // lee al salir: 2\n    n = 2\n} // imprime 2 y después 1: orden LIFO\n// reflect.TypeOf(valor) inspecciona su tipo dinámico.',
    explanation:
      'Los argumentos de defer se evalúan al registrarlo; una closure puede leer la variable al ejecutarse. Defer pertenece a la función, no al bloque del for. reflect requiere revisar kind, validez y posibilidad de modificar un valor. unsafe.Pointer y uintptr no tienen el mismo papel ante el GC. cgo permite interoperar con C y agrega reglas sobre punteros y memoria; estudiar y medir el GC requiere un proyecto y carga reales. Los enlaces de especialización amplían estas áreas: este ejemplo no las ejecuta.',
    comparison:
      'Defer se parece a una limpieza programada, pero no es un finally por bloque ni el Drop asociado al dueño de Rust. Reflexión inspecciona en ejecución; los genéricos preservan relaciones de tipos en compilación.',
    pitfall:
      'Guardar una dirección solo como uintptr no mantiene por sí mismo vivo el objeto. No uses unsafe para evitar un chequeo que no entendés; tampoco asumas que reflect permite modificar cualquier valor.',
    quiz: quiz(
      'Si registrás dos defer, ¿en qué orden se ejecutan al salir normalmente?',
      ['En el orden de registro', 'En orden inverso al registro', 'En paralelo'],
      1,
      'La pila de defer se ejecuta en orden LIFO.',
    ),
    labId: 'go-38',
    source: source(
      'Go Specification · Defer statements',
      'https://go.dev/ref/spec#Defer_statements',
    ),
    furtherSources: [
      source('Especialización · reflect', 'https://pkg.go.dev/reflect'),
      source('Especialización · unsafe', 'https://pkg.go.dev/unsafe'),
      source('Especialización · cgo', 'https://pkg.go.dev/cmd/cgo'),
      source('Especialización · Guía del GC', 'https://go.dev/doc/gc-guide'),
    ],
  });

  return atlas;
})();
