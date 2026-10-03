/* Original Rust learning lab. All examples use only the standard library.
   Sources explain the language; exercise wording and scenarios are original. */
window.RUST_LAB = (() => {
  const topics = [
    ['rust-basics', 'Expresiones y mutabilidad', 'ch03-01-variables-and-mutability.html'],
    ['rust-control', 'Funciones y decisiones', 'ch03-05-control-flow.html'],
    ['rust-ownership', 'Ownership y préstamos', 'ch04-02-references-and-borrowing.html'],
    ['rust-text', 'Texto, Unicode y slices', 'ch04-03-slices.html'],
    ['rust-models', 'Structs, enums y estados', 'ch06-01-defining-an-enum.html'],
    ['rust-errors', 'Option y Result', 'ch09-02-recoverable-errors-with-result.html'],
    ['rust-collections', 'Colecciones para sistemas', 'ch08-03-hash-maps.html'],
    ['rust-iterators', 'Iteradores y traits', 'ch13-02-iterators.html'],
    ['rust-generics', 'Genéricos y lifetimes', 'ch10-03-lifetime-syntax.html'],
    ['rust-systems', 'Threads y mini sistemas', 'ch16-01-threads.html'],
    ['rust-pointers', 'Box, Rc y mutabilidad interior', 'ch15-00-smart-pointers.html'],
    ['rust-advanced-traits', 'Traits avanzados y const generics', 'ch20-02-advanced-traits.html'],
    ['rust-modules', 'Módulos, macros y pruebas', 'ch07-02-defining-modules-to-control-scope-and-privacy.html'],
    ['rust-async', 'Future, Pin y concurrencia segura', 'ch17-00-async-await.html'],
    ['rust-contracts', 'RAII, unsafe y costo explícito', 'ch15-03-drop.html'],
    ['rust-rule-puzzles', 'Reglas, números y permisos', 'ch03-05-control-flow.html'],
    ['rust-text-puzzles', 'Desafíos de texto y Unicode', 'ch08-02-strings.html'],
    ['rust-sequence-puzzles', 'Pilas, búsqueda y secuencias', 'ch08-01-vectors.html'],
    ['rust-parsing-puzzles', 'Parsers y buffers acotados', 'ch09-02-recoverable-errors-with-result.html'],
    ['rust-system-puzzles', 'Cachés, journals y transacciones', 'ch08-03-hash-maps.html']
  ];
  const out = [];
  const test = (label, expression, why, failure) => ({label, expression, why, failure});
  const predict = (question, options, answer, explanation) => ({question, options, answer, explanation});
  const src = (title, url) => ({title, url});
  function add(stage, item) {
    const [topicId, topic, chapter] = topics[stage - 1];
    out.push({
      id: `rust-${String(out.length + 1).padStart(2, '0')}`, language: 'rust',
      topicId, topic, stage, kind: 'completar', minutes: stage < 4 ? 8 : 12,
      imports: [], visual: 'flow',
      sources: [src('The Rust Book · ' + topic, 'https://doc.rust-lang.org/book/' + chapter)],
      ...item,
      tests: item.tests.map((t, i) => ({id: `t${i + 1}`, ...t}))
    });
  }

  add(1, {
    title: 'La energía del reactor',
    intro: 'Una función puede devolver su última expresión sin escribir return. La firma fn energia(celdas: i32) -> i32 promete transformar un entero en otro entero.',
    why: 'Rust distingue las expresiones, que producen un valor, de las sentencias. El compilador comprueba que el valor final coincida con el tipo de retorno: esa verificación detecta muchos olvidos antes de ejecutar.',
    objective: 'Cada celda entrega 7 unidades. Calculá la energía de 0 a 1.000 celdas.',
    instructions: ['Reemplazá todo!() por el cálculo.', 'Devolvé el resultado; imprimirlo no satisface la firma.'],
    starter: 'fn energia(celdas: i32) -> i32 {\n    todo!("calcular energía")\n}',
    solution: 'fn energia(celdas: i32) -> i32 {\n    celdas * 7\n}',
    tests: [test('Tres celdas', 'energia(3) == 21', 'La salida depende del argumento.', 'Multiplicá la cantidad por la energía de una celda.'), test('Reactor vacío', 'energia(0) == 0', 'Cero conserva su significado físico.', 'No agregues una energía fija al resultado.'), test('Escala distinta', 'energia(11) == 77', 'No hay un resultado fijo para el primer ejemplo.', 'Usá celdas en la expresión, no un número de prueba.')],
    hints: ['El operador de multiplicación es *.', 'La expresión final debe tener tipo i32.', 'Escribí celdas * 7 sin punto y coma al final.'],
    review: {success: 'La firma funciona como un contrato. La última expresión entrega el valor al llamador; no necesitaste una variable temporal.', pitfall: 'println! muestra texto y devuelve (). Mostrar 21 no equivale a devolver 21.'},
    transfer: 'Agregá un parámetro potencia_por_celda y explicá qué casos probarías.',
    prediction: predict('¿Qué pasa si escribís celdas * 7; como única línea?', ['Devuelve 21 siempre', 'La función deja de devolver i32 y no compila', 'Rust ignora el punto y coma'], 1, 'El punto y coma convierte esa expresión en sentencia. El bloque queda con valor (), incompatible con -> i32.'),
    sources: [src('Rust Book · Functions', 'https://doc.rust-lang.org/book/ch03-03-how-functions-work.html')]
  });

  add(1, {
    title: 'Repará el contador inmutable', kind: 'reparar',
    intro: 'let crea por defecto una vinculación inmutable. Si el valor representa un contador que cambia, let mut expresa esa intención.',
    why: 'La mutabilidad explícita reduce el estado que necesitás seguir mentalmente. Un nombre sin mut no puede recibir una nueva asignación accidental.',
    objective: 'Partí del nivel inicial y aplicá exactamente dos incrementos de una unidad.',
    instructions: ['Conservá las dos actualizaciones del contador.', 'Repará la declaración que impide compilar. El rango usado es 0..1.000.'],
    starter: 'fn cargar(inicial: i32) -> i32 {\n    let nivel = inicial;\n    nivel += 1;\n    nivel += 1;\n    nivel\n}',
    solution: 'fn cargar(inicial: i32) -> i32 {\n    let mut nivel = inicial;\n    nivel += 1;\n    nivel += 1;\n    nivel\n}',
    tests: [test('Arranque en cero', 'cargar(0) == 2', 'Ambas actualizaciones se aplican.', 'El contador debe sumar dos unidades en total.'), test('Conserva el valor previo', 'cargar(8) == 10', 'La función no reinicia el argumento.', 'Inicializá nivel con inicial.'), test('Otra carga', 'cargar(41) == 43', 'La regla funciona independientemente de la entrada.', 'Revisá que no sobrescribas el contador con una constante.')],
    hints: ['Leé la línea señalada por E0384.', 'La variable nivel se asigna más de una vez.', 'Cambiá let nivel por let mut nivel.'],
    review: {success: 'Ahora la declaración anticipa las modificaciones. Elegir mut comunica algo sobre el ciclo de vida del valor.', pitfall: 'mut no cambia el tipo de la variable ni convierte automáticamente todos sus datos en compartibles entre threads.'},
    transfer: 'Escribí una segunda versión sin mut usando una sola expresión; compará legibilidad.',
    prediction: predict('¿Qué autoriza let mut nivel: i32 = 0?', ['Asignarle otro i32', 'Asignarle una cadena después', 'Modificar cualquier variable del programa'], 0, 'mut permite reemplazar el valor conservando el tipo declarado o inferido.')
  });

  add(1, {
    title: 'El punto y coma que se comió el resultado', kind: 'reparar',
    intro: 'Los bloques también son expresiones. Podés usarlos para limitar nombres temporales y devolver un cálculo como último valor.',
    why: 'Este diseño permite componer operaciones sin introducir asignaciones externas. Un ; cambia el valor del bloque, por lo que afecta el contrato de la función.',
    objective: 'Calculá el costo total: cantidad × 12 + 5 de envío, para cantidades entre 0 y 1.000.',
    instructions: ['Conservá el bloque que calcula total.', 'Corregí su expresión final para que entregue el número.'],
    starter: 'fn costo(cantidad: i32) -> i32 {\n    let total = {\n        let productos = cantidad * 12;\n        productos + 5;\n    };\n    total\n}',
    solution: 'fn costo(cantidad: i32) -> i32 {\n    let total = {\n        let productos = cantidad * 12;\n        productos + 5\n    };\n    total\n}',
    tests: [test('Una unidad', 'costo(1) == 17', 'El envío se agrega una vez.', 'La última expresión debe sumar 5 a productos.'), test('Solo cargo fijo', 'costo(0) == 5', 'El cargo no depende de la cantidad.', 'El cinco queda fuera de la multiplicación.'), test('Varias unidades', 'costo(4) == 53', 'Los productos escalan, el envío no.', 'No calcules cantidad * 17.')],
    hints: ['Inspeccioná el tipo que Rust infiere para total.', 'La última línea del bloque debe producir i32.', 'Quitá solamente el ; después de productos + 5.'],
    review: {success: 'El bloque ahora evalúa a un entero. productos permanece local, y total recibe únicamente el resultado.', pitfall: 'El ; después de cerrar el bloque sí termina let total = ...; y debe conservarse.'},
    transfer: 'Usá otro bloque para aplicar un descuento antes del envío.',
    prediction: predict('¿Puede usarse productos después de cerrar su bloque?', ['Sí, porque es i32', 'Sí, si total es mutable', 'No: su nombre está fuera de alcance'], 2, 'El alcance de la vinculación termina con el bloque. El valor resultante puede salir sin exportar todos los nombres internos.'),
    sources: [src('Rust Book · Statements and expressions', 'https://doc.rust-lang.org/book/ch03-03-how-functions-work.html')]
  });

  add(1, {
    title: 'Shadowing: mismo nombre, nueva etapa', kind: 'reparar',
    intro: 'Shadowing significa declarar otra vinculación con el mismo nombre. Esa nueva vinculación puede tener un tipo diferente.',
    why: 'Una transformación de texto a número no es una mutación de tipo: es un valor nuevo. Reutilizar un nombre puede expresar etapas sucesivas sin dejar todas las representaciones accesibles.',
    objective: 'Recibí una etiqueta ASCII y devolvé su longitud en bytes usando shadowing.',
    instructions: ['Reemplazá la reasignación incompatible por una nueva declaración let.', 'La función debe seguir devolviendo usize.'],
    starter: 'fn longitud(etiqueta: &str) -> usize {\n    let mut dato = etiqueta;\n    dato = dato.len();\n    dato\n}',
    solution: 'fn longitud(etiqueta: &str) -> usize {\n    let dato = etiqueta;\n    let dato = dato.len();\n    dato\n}',
    tests: [test('Etiqueta corta', 'longitud("cpu") == 3', 'La representación final es numérica.', 'len() devuelve usize; necesitás una nueva vinculación.'), test('Vacío', 'longitud("") == 0', 'No se inventan caracteres para el vacío.', 'Devolvé directamente la longitud.'), test('Etiqueta extensa', 'longitud("procesador") == 10', 'El cómputo recorre la entrada real.', 'No uses un tamaño fijo del tipo &str.')],
    hints: ['Una variable mutable conserva su tipo.', 'Otro let crea una nueva variable que oculta a la anterior.', 'Usá let dato = dato.len(); y quitá el mut innecesario.'],
    review: {success: 'La primera vinculación contiene &str; la segunda contiene usize. El compilador conoce ambos tipos en sus respectivos tramos.', pitfall: 'len() cuenta bytes de UTF-8. No generalices estos ejemplos ASCII a letras visibles.'},
    transfer: 'Probá longitud("ñ") y explicá por qué devuelve 2.',
    prediction: predict('¿Shadowing equivale a cambiar el tipo de una variable mutable?', ['Sí, son sinónimos', 'No: crea otra vinculación', 'Solo cuando el valor es numérico'], 1, 'El segundo let declara una vinculación distinta; no modifica el tipo de la primera.')
  });

  add(1, {
    title: 'Paquetes completos y bytes restantes',
    intro: 'Una tupla reúne resultados de tipos conocidos. La división entera calcula paquetes completos; el resto % conserva lo que no entra.',
    why: 'Devolver ambos valores evita perder información y mantiene una relación verificable: completos × tamaño + resto = bytes.',
    objective: 'Dividí una cantidad u32 de bytes en paquetes de 64 y devolvé (paquetes_completos, resto).',
    instructions: ['Usá / para la cantidad completa y % para el resto.', 'Devolvé una tupla (u32, u32).'],
    starter: 'fn paquetes(bytes: u32) -> (u32, u32) {\n    todo!("división y resto")\n}',
    solution: 'fn paquetes(bytes: u32) -> (u32, u32) {\n    (bytes / 64, bytes % 64)\n}',
    tests: [test('Paquete exacto', 'paquetes(128) == (2, 0)', 'Un múltiplo no genera sobrante.', 'El resto de 128 dividido por 64 es cero.'), test('Queda un fragmento', 'paquetes(150) == (2, 22)', 'La parte fraccionaria no se redondea.', 'La división entera descarta la fracción; recuperala con %.'), test('Sin bytes', 'paquetes(0) == (0, 0)', 'El elemento neutro conserva ambos ceros.', 'No fuerces un paquete cuando no hay contenido.')],
    hints: ['Una tupla se escribe con paréntesis y coma.', '150 / 64 produce 2 con enteros.', 'El cuerpo puede ser (bytes / 64, bytes % 64).'],
    review: {success: 'La tupla representa dos aspectos del mismo cálculo. Su orden forma parte del contrato.', pitfall: 'División entera no significa redondeo al más cercano: para enteros sin signo trunca hacia abajo.'},
    transfer: 'Desestructurá el resultado con let (completos, resto) y reconstruí bytes.',
    prediction: predict('Con enteros u32, ¿cuánto es 63 / 64?', ['0', '1', '0.984375'], 0, 'Ambos operandos son enteros, por lo que el resultado también lo es.'),
    sources: [src('Rust Book · Data types', 'https://doc.rust-lang.org/book/ch03-02-data-types.html')], visual: 'memory'
  });

  add(2, {
    title: 'Elegí una ruta con if',
    intro: 'if puede producir un valor. Cada rama debe entregar tipos compatibles para que el resultado tenga un tipo conocido.',
    why: 'Rust no convierte números en condiciones implícitamente. Una comparación entrega bool y hace visible la decisión.',
    objective: 'Elegí "cache" si la latencia es menor que 20 ms; desde 20 inclusive, elegí "disco".',
    instructions: ['Completá el cuerpo con if / else.', 'Devolvé los literales como &\'static str.'],
    starter: 'fn ruta(latencia_ms: u32) -> &\'static str {\n    todo!()\n}',
    solution: 'fn ruta(latencia_ms: u32) -> &\'static str {\n    if latencia_ms < 20 { "cache" } else { "disco" }\n}',
    tests: [test('Por debajo', 'ruta(19) == "cache"', 'La rama rápida incluye 19.', 'Compará con < 20.'), test('Frontera exacta', 'ruta(20) == "disco"', 'El umbral pertenece a la otra rama.', 'Menor que no incluye el límite.'), test('Muy por encima', 'ruta(900) == "disco"', 'La segunda rama cubre todo el resto.', 'No agregues un intervalo superior que no pide el contrato.')],
    hints: ['La condición es latencia_ms < 20.', 'Cada bloque termina con un literal de texto.', 'if latencia_ms < 20 { "cache" } else { "disco" }'],
    review: {success: 'Ambas ramas producen &str. Los literales están disponibles durante toda la ejecución y por eso admiten \'static.', pitfall: 'Agregar ; dentro de una sola rama introduce (), y las ramas dejan de concordar.'},
    transfer: 'Agregá una tercera categoría "red" para latencias desde 100 ms.',
    prediction: predict('¿Puede una rama devolver 7 y la otra "siete" sin envolverlos en un tipo común?', ['Sí, Rust usa any', 'No: el if necesita un tipo de resultado coherente', 'Sí, si la condición es true'], 1, 'El chequeo incluye ambas ramas, aunque una condición concreta seleccione solo una al ejecutar.')
  });

  add(2, {
    title: 'Match para un protocolo pequeño',
    intro: 'match selecciona un patrón y obliga a cubrir las posibilidades. El comodín _ agrupa los valores que no tienen un caso específico.',
    why: 'Una clasificación completa evita que un código desconocido quede sin respuesta. En protocolos, definir ese caso reduce ambigüedades.',
    objective: 'Convertí 200 en "ok", 404 en "ausente", 500 en "error" y cualquier otro número en "desconocido".',
    instructions: ['Usá match sobre codigo.', 'Incluí un brazo final _ para los códigos no listados.'],
    starter: 'fn estado(codigo: u16) -> &\'static str {\n    todo!()\n}',
    solution: 'fn estado(codigo: u16) -> &\'static str {\n    match codigo {\n        200 => "ok",\n        404 => "ausente",\n        500 => "error",\n        _ => "desconocido",\n    }\n}',
    tests: [test('Éxito', 'estado(200) == "ok"', 'El caso positivo es explícito.', 'Usá el patrón 200.'), test('Errores distintos', 'estado(404) == "ausente" && estado(500) == "error"', 'Dos clases de fallo no se confunden.', 'Cada código requiere su propio resultado.'), test('Código no reconocido', 'estado(201) == "desconocido" && estado(0) == "desconocido"', 'La clasificación es total.', 'El brazo _ debe devolver desconocido.')],
    hints: ['Cada brazo tiene patrón => expresión.', 'Los brazos se separan con coma.', 'El comodín debe quedar después de los casos específicos.'],
    review: {success: 'Definiste una respuesta para todo u16, aunque tu protocolo conozca pocos valores.', pitfall: 'Un _ primero capturaría todos los números y haría inalcanzables los casos siguientes.'},
    transfer: 'Agrupá varios códigos que compartan respuesta con patrones separados por |.',
    prediction: predict('¿Qué sucede si match sobre u16 omite el comodín y solo cubre tres números?', ['Devuelve cadena vacía', 'Lanza un panic al recibir otro código', 'No compila por patrones no exhaustivos'], 2, 'Rust exige cubrir todos los valores posibles del tipo.'),
    sources: [src('Rust Book · match', 'https://doc.rust-lang.org/book/ch06-02-match.html')]
  });

  add(2, {
    title: 'El último segundo también cuenta', kind: 'reparar',
    intro: 'a..b excluye b; a..=b lo incluye. Un rango hace explícitas las fronteras de una iteración.',
    why: 'Los errores de frontera suelen sobrevivir a ejemplos grandes. Probar cero y uno revela rápidamente si elegiste bien el intervalo.',
    objective: 'Sumá los enteros desde 1 hasta n inclusive. n está entre 0 y 1.000.',
    instructions: ['Repará el rango del for.', 'El resultado para n = 0 debe seguir siendo 0.'],
    starter: 'fn suma_hasta(n: u32) -> u32 {\n    let mut total = 0;\n    for x in 1..n { total += x; }\n    total\n}',
    solution: 'fn suma_hasta(n: u32) -> u32 {\n    let mut total = 0;\n    for x in 1..=n { total += x; }\n    total\n}',
    tests: [test('Una vuelta', 'suma_hasta(1) == 1', 'El extremo superior entra en la suma.', '1..1 está vacío; necesitás un rango inclusivo.'), test('Varias vueltas', 'suma_hasta(5) == 15', 'Se suman todos los elementos una vez.', 'La secuencia esperada es 1, 2, 3, 4, 5.'), test('Rango vacío', 'suma_hasta(0) == 0', 'Una entrada sin elementos conserva el acumulador.', 'No agregues n fuera del bucle para compensar sin pensar el caso vacío.')],
    hints: ['Compará .. y ..=.', 'El acumulador ya está bien inicializado.', 'Cambiá 1..n por 1..=n.'],
    review: {success: 'Corregiste el límite del recorrido sin agregar casos especiales. El rango descendente 1..=0 no produce elementos.', pitfall: 'No confundas un rango inclusivo con uno que cuenta automáticamente hacia atrás.'},
    transfer: 'Sumá solo los pares y agregá pruebas con n par e impar.',
    prediction: predict('¿Cuántos valores produce 0..3?', ['2', '3', '4'], 1, 'Produce 0, 1 y 2; el límite 3 está excluido.')
  });

  add(2, {
    title: 'Salir de loop con una respuesta',
    intro: 'loop repite hasta un break. Con break valor, el propio bucle produce ese valor.',
    why: 'Sirve para búsquedas con una condición de salida clara. El resultado viaja directamente desde el lugar donde encontraste la respuesta.',
    objective: 'Encontrá la primera potencia de dos mayor o igual que n. Para n = 0 devolvé 1. Rango de n: 0..=1.000.000.',
    instructions: ['Empezá en 1 y duplicá mientras sea insuficiente.', 'Terminá con break potencia al alcanzar el umbral.'],
    starter: 'fn capacidad(n: u32) -> u32 {\n    let mut potencia = 1;\n    loop {\n        todo!("comprobar o duplicar")\n    }\n}',
    solution: 'fn capacidad(n: u32) -> u32 {\n    let mut potencia = 1;\n    loop {\n        if potencia >= n { break potencia; }\n        potencia *= 2;\n    }\n}',
    tests: [test('Capacidad mínima', 'capacidad(0) == 1', 'El algoritmo tiene base incluso sin demanda.', 'Comprobá el umbral antes de duplicar.'), test('Ya es potencia', 'capacidad(8) == 8', 'No se duplica de más en la igualdad.', 'La salida debe usar >=, no solo >.'), test('Redondeo hacia arriba', 'capacidad(9) == 16', 'Se elige una potencia suficiente y mínima.', 'Duplicá desde 1 hasta cubrir n.')],
    hints: ['El if de salida va antes de *= 2.', 'break puede incluir una expresión.', 'Usá if potencia >= n { break potencia; }.'],
    review: {success: 'Cada vuelta acerca potencia al objetivo en el dominio indicado. El break devuelve el resultado del loop.', pitfall: 'Sin un dominio acotado, duplicar u32 podría desbordar. Este ejercicio limita n; una API general necesitaría checked_mul.'},
    transfer: 'Diseñá una versión que devuelva Option<u32> si no existe una potencia representable.',
    prediction: predict('¿Qué representa break 16; dentro de loop?', ['Imprime 16', 'Sale de la función siempre', 'Termina el loop y le da valor 16'], 2, 'El valor pertenece a la expresión loop; la función puede devolverlo o usarlo en otro cálculo.')
  });

  add(2, {
    title: 'Guardas antes del trabajo',
    intro: 'return permite salir temprano ante una condición excepcional. Los casos comunes quedan después de esas guardas.',
    why: 'Separar una entrada inválida del cálculo evita una división por cero y reduce la profundidad de if anidados.',
    objective: 'Calculá bytes / segundos con división entera. Si segundos es 0, devolvé 0 como política explícita de esta función.',
    instructions: ['Agregá una guarda antes de dividir.', 'No uses panic para la entrada cero: el contrato ya define una respuesta.'],
    starter: 'fn velocidad(bytes: u32, segundos: u32) -> u32 {\n    todo!()\n}',
    solution: 'fn velocidad(bytes: u32, segundos: u32) -> u32 {\n    if segundos == 0 { return 0; }\n    bytes / segundos\n}',
    tests: [test('División normal', 'velocidad(120, 3) == 40', 'El caso común conserva la operación.', 'Dividí bytes por segundos, en ese orden.'), test('Tiempo nulo', 'velocidad(120, 0) == 0', 'La guarda se ejecuta antes de la división.', 'Retorná 0 antes de evaluar bytes / segundos.'), test('Fracción truncada', 'velocidad(10, 3) == 3', 'La función mantiene aritmética entera.', 'No redondees ni conviertas a flotante.')],
    hints: ['Compará segundos == 0.', 'return 0; termina inmediatamente esta llamada.', 'Después de la guarda, devolvé bytes / segundos.'],
    review: {success: 'La entrada riesgosa tiene una salida definida. Más adelante Result permitirá distinguir una velocidad real de cero de un cálculo inválido.', pitfall: 'Este cero es una decisión del ejercicio; no es una forma universal de representar errores.'},
    transfer: 'Anotá cómo cambiaría la firma si quisieras informar "tiempo inválido".',
    prediction: predict('Si segundos es 0, ¿se evalúa la división después de return 0;?', ['Sí, Rust evalúa todo', 'No, esa llamada ya terminó', 'Solo en modo release'], 1, 'return corta el flujo de la función antes de llegar a la división.')
  });

  add(3, {
    title: 'Leer sin llevarte el String', kind: 'reparar', visual: 'ownership',
    intro: 'Pasar String por valor transfiere su propiedad. Para observar su contenido sin consumirlo, la función puede recibir &str.',
    why: 'El préstamo permite leer el mismo almacenamiento con un dueño claro. La firma expresa si una llamada conserva o entrega el recurso.',
    objective: 'Repará medir para que inspeccionar pueda medir y después devolver el String original, sin clone.',
    instructions: ['Cambiá medir para aceptar &str.', 'Pasale una referencia desde inspeccionar; medimos bytes.'],
    starter: 'fn medir(texto: String) -> usize { texto.len() }\nfn inspeccionar(texto: String) -> (String, usize) {\n    let bytes = medir(texto);\n    (texto, bytes)\n}',
    solution: 'fn medir(texto: &str) -> usize { texto.len() }\nfn inspeccionar(texto: String) -> (String, usize) {\n    let bytes = medir(&texto);\n    (texto, bytes)\n}',
    tests: [test('Dueño disponible', 'inspeccionar(String::from("cpu")) == (String::from("cpu"), 3)', 'La lectura no consume el texto.', 'El movimiento ocurre al pasar String por valor; prestalo con &.'), test('Texto vacío', 'inspeccionar(String::new()) == (String::new(), 0)', 'Un recurso vacío también conserva propiedad.', 'Devolvé el mismo texto recibido.'), test('Bytes Unicode', 'inspeccionar(String::from("ñ")) == (String::from("ñ"), 2)', 'El contrato sigue contando bytes.', 'String::len no cuenta letras.')],
    hints: ['El primer llamado mueve texto y el retorno intenta usarlo otra vez.', 'medir necesita lectura: su parámetro puede ser &str.', 'Usá medir(&texto); Rust convierte &String en &str.'],
    review: {success: 'medir tomó un préstamo temporal. Al finalizar la lectura, inspeccionar todavía puede transferir texto al resultado.', pitfall: 'clone haría desaparecer este error duplicando datos, pero ocultaría la intención de una lectura prestada.'},
    transfer: 'Agregá otra función de lectura y llamala sobre el mismo texto antes de devolverlo.',
    prediction: predict('Después de let b = a; donde a es String, ¿podés usar a?', ['Siempre: es una copia barata', 'No, salvo que hayas clonado o prestado explícitamente', 'Sí, si b es inmutable'], 1, 'String no implementa Copy. La asignación transfiere la propiedad del contenido a b.')
  });

  add(3, {
    title: 'Un préstamo que sí modifica', visual: 'ownership',
    intro: '&mut String permite cambiar un texto que pertenece al llamador. La función recibe acceso exclusivo durante ese préstamo.',
    why: 'La exclusividad evita que otro acceso observe o modifique los mismos datos mientras cambia su estructura, por ejemplo si el buffer debe crecer.',
    objective: 'Agregá exactamente un signo ! al String recibido, incluso si estaba vacío.',
    instructions: ['Mantené la firma &mut String.', 'Modificá el argumento con push; no reemplaces la función por una que devuelve otro String.'],
    starter: 'fn enfatizar(texto: &mut String) {\n    todo!()\n}',
    solution: 'fn enfatizar(texto: &mut String) {\n    texto.push(\'!\');\n}',
    tests: [test('Modifica al dueño', '{ let mut s = String::from("listo"); enfatizar(&mut s); s == "listo!" }', 'El cambio queda en el String original.', 'Usá push sobre texto.'), test('Texto vacío', '{ let mut s = String::new(); enfatizar(&mut s); s == "!" }', 'No se exige contenido previo.', 'El signo se agrega siempre.'), test('Dos llamadas', '{ let mut s = String::from("ya"); enfatizar(&mut s); enfatizar(&mut s); s == "ya!!" }', 'Los préstamos sucesivos permiten cambios acumulados.', 'Cada llamada debe agregar un signo, aunque ya exista otro.')],
    hints: ['push recibe char; escribí comillas simples.', '&mut String permite llamar a métodos mutables.', 'El cuerpo es texto.push(\'!\');.'],
    review: {success: 'El llamador conserva la propiedad y ve la mutación. Los dos préstamos de la tercera prueba son sucesivos, por eso son compatibles.', pitfall: 'mut en el nombre de una variable y &mut en una referencia expresan aspectos distintos; cambiar el nombre no concede permiso sobre datos prestados como &T.'},
    transfer: 'Escribí una variante que solo agregue ! si el texto todavía no termina con ese signo.',
    prediction: predict('¿Podés usar dos &mut activos sobre el mismo String al mismo tiempo?', ['Sí, si hacen lo mismo', 'Sí, si son pequeños', 'No: sus usos no pueden solaparse'], 2, 'Rust exige exclusividad para el acceso mutable. Dos préstamos sucesivos sí son válidos.')
  });

  add(3, {
    title: 'Copiar un número no mueve su dueño',
    intro: 'Los enteros implementan Copy: una asignación copia su valor. String tiene recursos propios y sigue otras reglas.',
    why: 'Copy se reserva para tipos cuya duplicación implícita es válida. Evita hacer una asignación aparentemente pequeña que duplique silenciosamente un buffer dinámico.',
    objective: 'Devolvé (original, aumentado): aumentado debe ser original + 1. Usá un binding mutable para aumentado.',
    instructions: ['Copiá original a otra variable.', 'Modificá solo la copia. Entradas entre -1.000 y 1.000.'],
    starter: 'fn duplicar_contador(original: i32) -> (i32, i32) {\n    todo!()\n}',
    solution: 'fn duplicar_contador(original: i32) -> (i32, i32) {\n    let mut aumentado = original;\n    aumentado += 1;\n    (original, aumentado)\n}',
    tests: [test('Valores independientes', 'duplicar_contador(4) == (4, 5)', 'La asignación conserva el original.', 'No incrementes original al preparar la pareja.'), test('Cruzar cero', 'duplicar_contador(-1) == (-1, 0)', 'Copy no depende del signo.', 'Sumá exactamente una unidad.'), test('Cero inicial', 'duplicar_contador(0) == (0, 1)', 'La copia es un valor, no un alias.', 'La primera posición debe conservar la entrada.')],
    hints: ['i32 implementa Copy.', 'let mut aumentado = original; crea otro valor independiente.', 'Devolvé (original, aumentado) después de += 1.'],
    review: {success: 'Ambos bindings son utilizables porque i32 es Copy. Mutar uno no cambia el otro.', pitfall: 'No extrapoles este comportamiento a String, Vec o cualquier tipo propio sin revisar sus traits.'},
    transfer: 'Repetí mentalmente la asignación usando String y predecí qué uso posterior fallaría.',
    prediction: predict('¿Cuál copia implícitamente su valor al asignarse?', ['String', 'Vec<i32>', 'i32'], 2, 'i32 implementa Copy; String y Vec administran almacenamiento y se mueven por defecto.'),
    sources: [src('std · Copy', 'https://doc.rust-lang.org/std/marker/trait.Copy.html')], visual: 'memory'
  });

  add(3, {
    title: 'Snapshot con una copia deliberada', visual: 'ownership',
    intro: 'clone crea un valor propio nuevo. Para String implica copiar el contenido a otro buffer.',
    why: 'Una copia explícita puede ser la decisión correcta cuando necesitás dos versiones independientes. El costo queda visible en el código.',
    objective: 'Devolvé dos Strings: el original y una versión con sufijo "-v2".',
    instructions: ['Cloná una sola vez antes de modificar la versión nueva.', 'El primer resultado debe quedar intacto.'],
    starter: 'fn versiones(original: String) -> (String, String) {\n    todo!()\n}',
    solution: 'fn versiones(original: String) -> (String, String) {\n    let mut nueva = original.clone();\n    nueva.push_str("-v2");\n    (original, nueva)\n}',
    tests: [test('Dos versiones', 'versiones(String::from("config")) == (String::from("config"), String::from("config-v2"))', 'Cada resultado conserva su contenido propio.', 'Modificá la copia, no original.'), test('Original vacío', 'versiones(String::new()) == (String::new(), String::from("-v2"))', 'Un buffer vacío se trata consistentemente.', 'El sufijo se aplica aun sin prefijo.'), test('Contenido Unicode', 'versiones(String::from("día")) == (String::from("día"), String::from("día-v2"))', 'Clonar preserva los bytes válidos de UTF-8.', 'No reconstruyas el texto por índices de bytes.')],
    hints: ['Asignar original directamente movería su propiedad.', 'clone conserva original y da un String nuevo.', 'let mut nueva = original.clone(); seguido de nueva.push_str("-v2");.'],
    review: {success: 'Elegiste pagar una copia para obtener independencia. La clonación tiene un propósito comprobable: el primer resultado no cambia.', pitfall: 'clone no es una reparación universal para préstamos: primero decidí si realmente necesitás dos valores propios.'},
    transfer: 'Diseñá otra firma que devuelva solo la versión nueva y evite la copia cuando ya no necesitás original.',
    prediction: predict('Después de clonar String y modificar la copia, ¿cambia el original?', ['No: cada String tiene contenido independiente', 'Sí: apuntan al mismo buffer mutable', 'Depende del largo'], 0, 'String::clone duplica el contenido; no crea un alias mutable compartido.'),
    sources: [src('std · String', 'https://doc.rust-lang.org/std/string/struct.String.html')]
  });

  add(3, {
    title: 'Final del préstamo, comienzo de la mutación', kind: 'reparar', visual: 'ownership',
    intro: 'Un préstamo de lectura sigue activo mientras haya un uso posterior de esa referencia. Calculá primero lo que necesitás y después modificá.',
    why: 'El compilador analiza los usos, no solamente las llaves del bloque. Un número calculado a partir del texto puede sobrevivir sin mantener prestado el texto.',
    objective: 'Devolvé los bytes previos y agregá ? al texto, sin clone.',
    instructions: ['Mové el cálculo de la longitud antes de push.', 'Guardá el número, de modo que vista no se use después de la mutación.'],
    starter: 'fn marcar(texto: &mut String) -> usize {\n    let vista = &texto[..];\n    texto.push(\'?\');\n    vista.len()\n}',
    solution: 'fn marcar(texto: &mut String) -> usize {\n    let vista = &texto[..];\n    let antes = vista.len();\n    texto.push(\'?\');\n    antes\n}',
    tests: [test('Lee antes de escribir', '{ let mut s = String::from("hola"); let n = marcar(&mut s); n == 4 && s == "hola?" }', 'El número corresponde al estado anterior.', 'Guardá la longitud antes de agregar el signo.'), test('Partir del vacío', '{ let mut s = String::new(); let n = marcar(&mut s); n == 0 && s == "?" }', 'Mutar no altera retroactivamente el número.', 'No midas al final.'), test('Tamaño en bytes', '{ let mut s = String::from("ñ"); let n = marcar(&mut s); n == 2 && s == "ñ?" }', 'El préstamo conserva la semántica de len.', 'No cambies len por chars().count().')],
    hints: ['El último uso de vista ocurre después de push en el código roto.', 'Extraé vista.len() antes de la mutación.', 'Devolvé una variable usize, sin volver a usar vista.'],
    review: {success: 'El préstamo de vista ya no es necesario al ejecutar push. El usize guardado no referencia el buffer.', pitfall: 'El problema no era que leer y escribir estén en la misma función; era el solapamiento de usos.'},
    transfer: 'Devolvé también el tamaño posterior y explicá por qué ambos números son seguros.',
    prediction: predict('¿Agregar llaves siempre es necesario para terminar un préstamo?', ['Sí, Rust solo mira bloques', 'No: puede terminar tras su último uso', 'No: todos terminan inmediatamente'], 1, 'El análisis de préstamos puede reconocer que una referencia ya no vuelve a utilizarse.')
  });

  add(4, {
    title: 'Bytes y caracteres no son lo mismo',
    intro: 'str usa UTF-8. len() mide bytes; chars().count() cuenta valores escalares Unicode.',
    why: 'Una representación UTF-8 puede usar varios bytes por carácter. Incluso chars no cuenta siempre símbolos visuales completos: algunos se forman con varios escalares.',
    objective: 'Devolvé (bytes, escalares_unicode) para el texto recibido.',
    instructions: ['Usá len para bytes y chars().count() para escalares.', 'No indexés el texto como si fuera un array de letras.'],
    starter: 'fn medidas(texto: &str) -> (usize, usize) {\n    todo!()\n}',
    solution: 'fn medidas(texto: &str) -> (usize, usize) {\n    (texto.len(), texto.chars().count())\n}',
    tests: [test('ASCII', 'medidas("cpu") == (3, 3)', 'ASCII usa un byte por escalar.', 'La pareja va en orden bytes, escalares.'), test('Acento', 'medidas("ñ") == (2, 1)', 'Un escalar puede usar varios bytes.', 'len y chars().count no son intercambiables.'), test('Emoji y vacío', 'medidas("🦀") == (4, 1) && medidas("") == (0, 0)', 'Se cubren cuatro bytes y la ausencia de datos.', 'chars cuenta escalares, no bytes.')],
    hints: ['Ambos resultados son usize.', 'chars() crea un iterador; count() lo recorre.', '(texto.len(), texto.chars().count())'],
    review: {success: 'Distinguiste almacenamiento de unidades Unicode. Esa diferencia importa al limitar paquetes o mostrar longitudes al usuario.', pitfall: 'Un emoji compuesto o una letra con marca combinante puede contener varios chars aunque se vea como un símbolo.'},
    transfer: 'Probá "e\u0301" y comparalo con "é"; describí qué mide cada número.',
    prediction: predict('¿chars().count() siempre cuenta símbolos visuales completos?', ['Sí', 'No: cuenta valores escalares Unicode', 'Solo cuenta bytes ASCII'], 1, 'Los grafemas visibles pueden combinar varios escalares. Este ejercicio no implementa segmentación de grafemas.'),
    sources: [src('std · str', 'https://doc.rust-lang.org/std/primitive.str.html')], visual: 'memory'
  });

  add(4, {
    title: 'Primer carácter sin romper UTF-8', kind: 'reparar',
    intro: 'No existe indexación directa de str por posición de carácter. chars().next() entrega Option<char>, que también representa el texto vacío.',
    why: 'Buscar por caracteres puede requerir recorrer bytes. La API evita fingir que s[0] tiene el mismo costo y significado que indexar un array.',
    objective: 'Devolvé el primer escalar Unicode, o None si no hay texto.',
    instructions: ['Reemplazá la indexación inválida.', 'La función debe devolver Option<char>.'],
    starter: 'fn inicial(texto: &str) -> Option<char> {\n    Some(texto[0])\n}',
    solution: 'fn inicial(texto: &str) -> Option<char> {\n    texto.chars().next()\n}',
    tests: [test('Letra común', 'inicial("rust") == Some(\'r\')', 'Se obtiene un char, no un byte.', 'Creá un iterador de chars.'), test('Primer emoji', 'inicial("🦀rust") == Some(\'🦀\')', 'No se corta una secuencia UTF-8.', 'La posición cero de bytes no es un char.'), test('Ausencia explícita', 'inicial("") == None', 'El vacío es un caso válido sin panic.', 'next ya entrega None cuando no hay elementos.')],
    hints: ['str no implementa acceso [usize].', 'El primer elemento de un iterador se obtiene con next().', 'Devolvé texto.chars().next() sin envolverlo otra vez.'],
    review: {success: 'next ya expresa presencia o ausencia. Usaste una operación compatible con todos los textos UTF-8 válidos.', pitfall: 'unwrap convertiría el vacío en un panic y rompería el contrato Option.'},
    transfer: 'Buscá el tercer escalar con nth(2) y probá una cadena demasiado corta.',
    prediction: predict('¿Qué tipo devuelve chars().next()?', ['char', 'u8', 'Option<char>'], 2, 'El iterador puede estar agotado; Option representa esa posibilidad.'),
    sources: [src('std · str::chars', 'https://doc.rust-lang.org/std/primitive.str.html#method.chars')]
  });

  add(4, {
    title: 'Prefijo seguro en bytes',
    intro: 'get sobre un rango de str devuelve Option<&str>. Verifica tanto los límites como que el corte coincida con fronteras de UTF-8.',
    why: 'Un slice de texto válido nunca termina a mitad de un carácter. Poder fallar sin panic es útil al procesar tamaños recibidos de otra parte del sistema.',
    objective: 'Devolvé los primeros n bytes si forman un slice válido; en otro caso, None.',
    instructions: ['Usá texto.get con el rango ..n.', 'No redondees n ni reemplaces caracteres.'],
    starter: 'fn prefijo(texto: &str, n: usize) -> Option<&str> {\n    todo!()\n}',
    solution: 'fn prefijo(texto: &str, n: usize) -> Option<&str> {\n    texto.get(..n)\n}',
    tests: [test('Frontera válida', 'prefijo("ñandú", 2) == Some("ñ")', 'Dos bytes completan ñ.', 'Pedimos bytes, no cantidad de chars.'), test('Corte interno', 'prefijo("ñandú", 1) == None', 'No se genera UTF-8 inválido.', 'get devuelve None para una frontera inválida.'), test('Fuera y en cero', 'prefijo("abc", 9) == None && prefijo("abc", 0) == Some("")', 'El vacío es válido y exceder el largo no lo es.', 'No uses []: podría causar panic.')],
    hints: ['get(..n) es la variante comprobada del slicing.', 'El resultado ya es Option<&str>.', 'Devolvé texto.get(..n).'],
    review: {success: 'El resultado presta una región del texto sin copiarla. La validación conserva la garantía de UTF-8 de &str.', pitfall: 'None puede significar límite fuera de rango o corte en un byte de continuación; ambos casos son inválidos.'},
    transfer: 'Diseñá una función que pida cantidad de chars, y compará el trabajo necesario.',
    prediction: predict('¿Qué hace "ñ".get(..1)?', ['Devuelve Some("ñ")', 'Devuelve None', 'Devuelve el primer byte como &str'], 1, 'ñ necesita dos bytes en UTF-8; un byte aislado no forma un str válido.'),
    sources: [src('std · str::get', 'https://doc.rust-lang.org/std/primitive.str.html#method.get')], visual: 'memory'
  });

  add(4, {
    title: 'Leer una orden entre espacios',
    intro: 'split_whitespace recorre palabras prestadas, omitiendo espacios iniciales y separadores repetidos.',
    why: 'Usar una API de texto evita codificar supuestos de un solo espacio ASCII. Al devolver &str, el token sigue apuntando al texto original.',
    objective: 'Devolvé el primer token, o "" cuando la entrada no contenga ninguno.',
    instructions: ['Separá con split_whitespace.', 'Convertí el None inicial en un slice vacío con unwrap_or.'],
    starter: 'fn primera_orden(linea: &str) -> &str {\n    todo!()\n}',
    solution: 'fn primera_orden(linea: &str) -> &str {\n    linea.split_whitespace().next().unwrap_or("")\n}',
    tests: [test('Comando y argumento', 'primera_orden("GET clave") == "GET"', 'Se conserva solamente el primer token.', 'Pedí next al iterador.'), test('Espacios variados', 'primera_orden(" \t SET\nclave") == "SET"', 'La separación no depende de un espacio exacto.', 'split(\' \') no cubre tabulaciones como split_whitespace.'), test('Sin tokens', 'primera_orden(" \n\t") == ""', 'No hay panic frente a entrada vacía de palabras.', 'Usá unwrap_or("") para el None.')],
    hints: ['split_whitespace omite tokens vacíos.', 'next devuelve Option<&str>.', 'Encadená .next().unwrap_or("").'],
    review: {success: 'Tokenizaste sin crear Strings nuevos. El préstamo del resultado queda asociado a la entrada.', pitfall: 'unwrap fallaría en líneas vacías; el fallback forma parte del contrato.'},
    transfer: 'Devolvé también el número de tokens y probá una línea con saltos.',
    prediction: predict('¿split_whitespace necesita copiar cada palabra a otro String?', ['Sí, siempre', 'Solo para Unicode', 'No: entrega slices prestados'], 2, 'Los tokens &str son vistas del almacenamiento existente.'),
    sources: [src('std · str::split_whitespace', 'https://doc.rust-lang.org/std/primitive.str.html#method.split_whitespace')]
  });

  add(4, {
    title: 'Una vista sobre mediciones',
    intro: '&[i32] representa una vista prestada de una secuencia. Acepta arrays, vectores y subrangos sin tomar su propiedad.',
    why: 'Elegir un slice en una firma reduce el acoplamiento a una colección concreta. La función solo pide lo que necesita: leer números consecutivos.',
    objective: 'Sumá las mediciones del slice. El vacío suma 0. Los casos usan valores cuya suma cabe en i32.',
    instructions: ['Recorré todas las mediciones sin modificar la entrada.', 'La firma debe aceptar &[i32].'],
    starter: 'fn total_mediciones(datos: &[i32]) -> i32 {\n    todo!()\n}',
    solution: 'fn total_mediciones(datos: &[i32]) -> i32 {\n    let mut total = 0;\n    for &dato in datos { total += dato; }\n    total\n}',
    tests: [test('Array prestado', 'total_mediciones(&[4, -1, 7]) == 10', 'El slice incluye negativos.', 'Sumá el valor apuntado por cada elemento.'), test('Vista parcial', '{ let v = vec![99, 2, 3, 88]; total_mediciones(&v[1..3]) == 5 && v[0] == 99 }', 'Se recorre solo el rango prestado y el dueño se conserva.', 'Usá el slice recibido sin suponer datos anteriores.'), test('Sin mediciones', 'total_mediciones(&[]) == 0', 'El acumulador tiene un elemento neutro.', 'Inicializá en cero.')],
    hints: ['for &dato in datos copia cada i32 desde su referencia.', 'Un acumulador mutable empieza en 0.', 'También podrías usar datos.iter().sum().'],
    review: {success: 'La misma función funciona con representaciones distintas. El slice transporta el acceso a los elementos y su longitud.', pitfall: 'Aceptar &Vec<i32> exigiría innecesariamente un Vec cuando la operación solo necesita una secuencia.'},
    transfer: 'Calculá suma y cantidad para preparar un promedio con caso vacío explícito.',
    prediction: predict('¿Puede &[i32] representar parte de un Vec sin copiar sus elementos?', ['Sí', 'No, siempre aloca', 'Solo si tiene un elemento'], 0, 'Un slice puede prestar un subrango contiguo de una colección.'), visual: 'memory'
  });

  add(5, {
    title: 'Una estructura para el paquete',
    intro: 'Un struct da nombres a los campos relacionados. Así no dependés de recordar el orden de una tupla.',
    why: 'Un tipo del dominio permite expresar qué significan los números y concentrar las operaciones que les corresponden.',
    objective: 'Completá payload: descontá la cabecera de 4 bytes del tamaño total; si total es menor que 4, devolvé 0.',
    instructions: ['Leé el campo total del Paquete prestado.', 'Usá una resta comprobada o saturating_sub para evitar underflow.'],
    starter: 'struct Paquete { total: u32 }\nfn payload(p: &Paquete) -> u32 {\n    todo!()\n}',
    solution: 'struct Paquete { total: u32 }\nfn payload(p: &Paquete) -> u32 {\n    p.total.saturating_sub(4)\n}',
    tests: [test('Datos útiles', 'payload(&Paquete { total: 12 }) == 8', 'Se descuenta la cabecera.', 'Restá cuatro al total.'), test('Solo cabecera', 'payload(&Paquete { total: 4 }) == 0', 'La frontera tiene carga vacía.', 'La igualdad debe entregar cero.'), test('Incompleto', 'payload(&Paquete { total: 2 }) == 0', 'La política evita restas negativas en u32.', 'saturating_sub limita el resultado inferior a cero.')],
    hints: ['El campo se accede con p.total.', 'u32 no representa números negativos.', 'p.total.saturating_sub(4) implementa esta política.'],
    review: {success: 'La estructura conserva el significado del tamaño; la operación define explícitamente qué ocurre con un paquete incompleto.', pitfall: 'Saturar a cero es una política del ejercicio. Un parser real podría preferir reportar un error.'},
    transfer: 'Agregá un campo cabecera y probá encabezados de tamaños distintos.',
    prediction: predict('¿Por qué no alcanza con p.total - 4 para cualquier u32?', ['Porque - no existe en Rust', 'Porque valores menores que 4 producirían underflow', 'Porque los campos son referencias'], 1, 'u32 no puede representar -2. Elegí explícitamente cómo tratar una resta fuera del rango.'),
    sources: [src('Rust Book · Structs', 'https://doc.rust-lang.org/book/ch05-01-defining-structs.html'), src('std · u32::saturating_sub', 'https://doc.rust-lang.org/std/primitive.u32.html#method.saturating_sub')]
  });

  add(5, {
    title: 'El método conoce su rectángulo',
    intro: 'impl agrupa métodos de un tipo. &self es una referencia al valor sobre el que se invoca el método.',
    why: 'El receptor deja claro si una operación observa, modifica o consume la instancia. area solo necesita observar.',
    objective: 'Implementá area y es_cuadrado para dimensiones entre 0 y 1.000.',
    instructions: ['Mantené &self en ambos métodos.', 'Un rectángulo es cuadrado cuando sus dos dimensiones son iguales, incluso en cero.'],
    starter: 'struct Rectangulo { ancho: u32, alto: u32 }\nimpl Rectangulo {\n    fn area(&self) -> u32 { todo!() }\n    fn es_cuadrado(&self) -> bool { todo!() }\n}',
    solution: 'struct Rectangulo { ancho: u32, alto: u32 }\nimpl Rectangulo {\n    fn area(&self) -> u32 { self.ancho * self.alto }\n    fn es_cuadrado(&self) -> bool { self.ancho == self.alto }\n}',
    tests: [test('Rectángulo común', '{ let r = Rectangulo { ancho: 3, alto: 5 }; r.area() == 15 && !r.es_cuadrado() }', 'Cada método responde una propiedad diferente.', 'Área multiplica; cuadrado compara.'), test('Cuadrado', '{ let r = Rectangulo { ancho: 4, alto: 4 }; r.area() == 16 && r.es_cuadrado() }', 'La igualdad de dimensiones importa.', 'No compares área con ancho.'), test('Dimensiones cero', '{ let r = Rectangulo { ancho: 0, alto: 0 }; r.area() == 0 && r.es_cuadrado() }', 'El contrato incluye el caso degenerado.', 'La definición del ejercicio no exige dimensiones positivas.')],
    hints: ['Los campos están en self.', 'Ambos métodos pueden llamar varias veces porque prestan la instancia.', 'Usá self.ancho * self.alto y self.ancho == self.alto.'],
    review: {success: 'Los métodos expresan comportamientos del tipo y no consumen la instancia. La segunda llamada sigue pudiendo usarla.', pitfall: 'Un método con self por valor puede consumir el receptor; elegí el receptor según la operación.'},
    transfer: 'Agregá escalar(&mut self, factor: u32) y justificá el préstamo mutable.',
    prediction: predict('¿Qué comunica &self?', ['El método consume siempre el valor', 'El método recibe un préstamo de lectura', 'El método puede modificar cualquier campo directamente'], 1, '&self equivale a self: &Self, un préstamo compartido de la instancia.'),
    sources: [src('Rust Book · Methods', 'https://doc.rust-lang.org/book/ch05-03-method-syntax.html')]
  });

  add(5, {
    title: 'Estados que el compilador conoce', kind: 'reparar',
    intro: 'Un enum define alternativas nombradas. match sobre ese enum debe responder a cada variante.',
    why: 'Cuando aparece un nuevo estado, los matches incompletos fallan al compilar. Eso ayuda a encontrar lugares que requieren una decisión nueva.',
    objective: 'Asigná prioridades: Esperando = 1, Ejecutando = 2, Terminado = 0.',
    instructions: ['Completá el brazo faltante de match.', 'Conservá los casos nombrados, sin un comodín.'],
    starter: 'enum Estado { Esperando, Ejecutando, Terminado }\nfn prioridad(e: Estado) -> u8 {\n    match e {\n        Estado::Esperando => 1,\n        Estado::Ejecutando => 2,\n    }\n}',
    solution: 'enum Estado { Esperando, Ejecutando, Terminado }\nfn prioridad(e: Estado) -> u8 {\n    match e {\n        Estado::Esperando => 1,\n        Estado::Ejecutando => 2,\n        Estado::Terminado => 0,\n    }\n}',
    tests: [test('En espera', 'prioridad(Estado::Esperando) == 1', 'El primer estado tiene su política.', 'Esperando conserva prioridad 1.'), test('En ejecución', 'prioridad(Estado::Ejecutando) == 2', 'La ejecución recibe prioridad mayor.', 'Ejecutando debe entregar 2.'), test('Trabajo finalizado', 'prioridad(Estado::Terminado) == 0', 'El nuevo estado queda cubierto.', 'Agregá Estado::Terminado => 0.')],
    hints: ['El error de exhaustividad nombra el estado faltante.', 'Cada variante se califica con Estado::.', 'Agregá Estado::Terminado => 0,.'],
    review: {success: 'Cada estado tiene una respuesta explícita. Un futuro estado nuevo volverá a requerir una decisión en este match.', pitfall: 'Un comodín puede ser apropiado, pero aquí ocultaría estados nuevos que querés revisar.'},
    transfer: 'Agregá Pausado al enum y observá qué parte del código obliga a actualizar.',
    prediction: predict('Si agregás otra variante sin cambiar este match, ¿qué pasa?', ['Error de compilación', 'Se devuelve cero automáticamente', 'Se ignora la variante nueva'], 0, 'Sin comodín, Rust detecta la variante que el match no cubre.')
  });

  add(5, {
    title: 'Cada mensaje lleva sus propios datos',
    intro: 'Las variantes de un enum pueden transportar datos diferentes. El patrón extrae esos datos al elegir la variante.',
    why: 'Una orden Ping no necesita un campo de bytes artificial. El tipo evita combinaciones sin sentido como un Ping con tamaño obligatorio.',
    objective: 'Calculá el costo: Ping = 1, Datos(n) = n, Cerrar = 0.',
    instructions: ['Hacé match sobre Mensaje.', 'Extraé el tamaño en el patrón Mensaje::Datos(n).'],
    starter: 'enum Mensaje { Ping, Datos(usize), Cerrar }\nfn costo_mensaje(m: Mensaje) -> usize {\n    todo!()\n}',
    solution: 'enum Mensaje { Ping, Datos(usize), Cerrar }\nfn costo_mensaje(m: Mensaje) -> usize {\n    match m {\n        Mensaje::Ping => 1,\n        Mensaje::Datos(n) => n,\n        Mensaje::Cerrar => 0,\n    }\n}',
    tests: [test('Control', 'costo_mensaje(Mensaje::Ping) == 1 && costo_mensaje(Mensaje::Cerrar) == 0', 'Los mensajes sin payload tienen reglas propias.', 'Ping y Cerrar no llevan n.'), test('Payload variable', 'costo_mensaje(Mensaje::Datos(128)) == 128', 'El patrón conserva el dato transportado.', 'Devolvé n al extraer Datos(n).'), test('Payload vacío', 'costo_mensaje(Mensaje::Datos(0)) == 0', 'Cero bytes sigue siendo una variante Datos válida.', 'No confundas Datos(0) con Ping.')],
    hints: ['Los paréntesis del patrón extraen el usize.', 'Los tres brazos deben devolver usize.', 'Mensaje::Datos(n) => n.'],
    review: {success: 'Separaste qué clase de mensaje llegó de la información específica de esa clase.', pitfall: 'Un enum con datos no se reemplaza en general por una constante numérica: las variantes pueden tener estructuras distintas.'},
    transfer: 'Agregá DatosComprimidos { originales: usize, comprimidos: usize } y definí su costo.',
    prediction: predict('¿Qué es n en Mensaje::Datos(n) => n?', ['Una constante global', 'Una variable que recibe el dato de esa variante', 'El número de la variante'], 1, 'El patrón enlaza el contenido de Datos a una nueva variable local.')
  });

  add(5, {
    title: 'Una transición del semáforo',
    intro: 'Modelar transiciones como funciones permite probar una máquina de estados sin temporizadores ni interfaz gráfica.',
    why: 'Un enum limita el conjunto de estados válidos. Una función pura vuelve reproducible cada paso de la transición.',
    objective: 'Implementá Rojo → Verde → Amarillo → Rojo.',
    instructions: ['Devolvé una nueva variante sin mutar estado global.', 'Conservá el derive para poder comparar resultados.'],
    starter: '#[derive(Debug, PartialEq)]\nenum Luz { Rojo, Verde, Amarillo }\nfn siguiente(luz: Luz) -> Luz {\n    todo!()\n}',
    solution: '#[derive(Debug, PartialEq)]\nenum Luz { Rojo, Verde, Amarillo }\nfn siguiente(luz: Luz) -> Luz {\n    match luz {\n        Luz::Rojo => Luz::Verde,\n        Luz::Verde => Luz::Amarillo,\n        Luz::Amarillo => Luz::Rojo,\n    }\n}',
    tests: [test('Habilitar paso', 'siguiente(Luz::Rojo) == Luz::Verde', 'Rojo conduce al estado habilitado.', 'El próximo estado de Rojo es Verde.'), test('Avisar cierre', 'siguiente(Luz::Verde) == Luz::Amarillo', 'La transición intermedia no se omite.', 'Verde no salta directamente a Rojo.'), test('Ciclo completo', 'siguiente(siguiente(siguiente(Luz::Rojo))) == Luz::Rojo', 'Tres pasos cierran el ciclo.', 'Amarillo debe devolver Rojo.')],
    hints: ['Necesitás tres brazos.', 'Cada brazo devuelve Luz, no texto.', 'Mapeá la última variante otra vez a Luz::Rojo.'],
    review: {success: 'El comportamiento completo cabe en tres transiciones comprobables. derive(PartialEq) habilita comparar instancias del enum.', pitfall: 'Una máquina real podría tener eventos y errores; no los confundas con este avance incondicional.'},
    transfer: 'Agregá un evento Emergencia que lleve cualquier estado a Rojo.',
    prediction: predict('¿Qué aporta derive(PartialEq) aquí?', ['Permite comparar dos Luz con ==', 'Hace que Luz sea automáticamente Copy', 'Ejecuta la transición en paralelo'], 0, 'PartialEq define igualdad; otros comportamientos requieren otros traits.')
  });

  add(6, {
    title: 'El primer elemento puede faltar',
    intro: 'Option<T> expresa Some(valor) o None. La ausencia deja de depender de un número especial que podría confundirse con datos reales.',
    why: 'Un slice vacío es válido. La firma recuerda a cada llamador que debe considerar la ausencia antes de usar el resultado.',
    objective: 'Devolvé una copia del primer i32 del slice, o None.',
    instructions: ['Usá first() para evitar indexación insegura.', 'Convertí Option<&i32> en Option<i32> con copied o un match.'],
    starter: 'fn primero(datos: &[i32]) -> Option<i32> {\n    todo!()\n}',
    solution: 'fn primero(datos: &[i32]) -> Option<i32> {\n    datos.first().copied()\n}',
    tests: [test('Elemento existente', 'primero(&[7, 8]) == Some(7)', 'Se copia el primer elemento, no el último.', 'first entrega la posición inicial.'), test('Cero es dato', 'primero(&[0]) == Some(0)', 'Cero no se usa como señal de ausencia.', 'Some(0) y None tienen significado diferente.'), test('Slice vacío', 'primero(&[]) == None', 'La ausencia es explícita y no causa panic.', 'Evitá datos[0] y unwrap.')],
    hints: ['first devuelve Option<&i32>.', 'i32 es Copy, por eso copied está disponible.', 'datos.first().copied()'],
    review: {success: 'La API conserva la diferencia entre tener un cero y no tener ningún valor.', pitfall: 'unwrap elimina la obligación de tratar None convirtiéndola en un posible panic.'},
    transfer: 'Escribí ultimo con last y compará los mismos casos de prueba.',
    prediction: predict('¿Some(0) es igual a None?', ['Sí, ambos son falsos', 'No: uno contiene un dato y el otro expresa ausencia', 'Depende del slice'], 1, 'Option no usa conversiones implícitas a bool; sus variantes son distintas.'),
    sources: [src('std · Option', 'https://doc.rust-lang.org/std/option/enum.Option.html')]
  });

  add(6, {
    title: 'División con un error que explica',
    intro: 'Result<T, E> separa una respuesta válida Ok de un fallo Err. El llamador recibe información sin depender de un panic.',
    why: 'Un error esperado, como un divisor inválido, forma parte del contrato. Result permite propagarlo o recuperarse de forma explícita.',
    objective: 'Dividí dos u32. Si b es cero, devolvé Err("divisor cero"); si no, Ok(a / b).',
    instructions: ['Validá b antes de la operación.', 'No uses unwrap ni panic para el caso previsto.'],
    starter: 'fn dividir(a: u32, b: u32) -> Result<u32, &\'static str> {\n    todo!()\n}',
    solution: 'fn dividir(a: u32, b: u32) -> Result<u32, &\'static str> {\n    if b == 0 { Err("divisor cero") } else { Ok(a / b) }\n}',
    tests: [test('Resultado válido', 'dividir(9, 2) == Ok(4)', 'La división sigue siendo entera.', 'Envolvé el cociente con Ok.'), test('Error descriptivo', 'dividir(9, 0) == Err("divisor cero")', 'La entrada inválida tiene un canal propio.', 'La rama de error debe ocurrir antes de dividir.'), test('Cero válido', 'dividir(0, 4) == Ok(0)', 'Cero como numerador no es un error.', 'Solo validá el divisor.')],
    hints: ['El tipo de éxito es u32 y el de error es un literal &str.', 'Err("divisor cero") cumple el tipo de error.', 'Usá un if para elegir Err u Ok.'],
    review: {success: 'El llamador puede distinguir un resultado cero de la imposibilidad de dividir. Ese dato no se pierde en un valor centinela.', pitfall: 'Err no lanza automáticamente una excepción. Es un valor que el llamador debe manejar.'},
    transfer: 'Reemplazá el texto del error por un enum con variantes propias.',
    prediction: predict('¿Devolver Err detiene todo el programa?', ['Siempre', 'Solo en modo debug', 'No: devuelve un valor de error al llamador'], 2, 'El programa decide qué hacer con Result; Err por sí mismo no equivale a panic.')
  });

  add(6, {
    title: 'Un puerto válido se construye',
    intro: 'parse::<u16>() convierte texto a un número comprobando su rango. map_err permite adaptar el error a tu dominio.',
    why: 'Primero se verifica la representación, después la regla de negocio. No todo u16 es un puerto permitido por este ejercicio.',
    objective: 'Quitá espacios exteriores y aceptá 1..=65535. Texto inválido o fuera de rango: Err("numero"); cero: Err("cero").',
    instructions: ['Parseá como u16 después de trim.', 'Separá el error de representación del valor cero.'],
    starter: 'fn puerto(texto: &str) -> Result<u16, &\'static str> {\n    todo!()\n}',
    solution: 'fn puerto(texto: &str) -> Result<u16, &\'static str> {\n    let n = texto.trim().parse::<u16>().map_err(|_| "numero")?;\n    if n == 0 { Err("cero") } else { Ok(n) }\n}',
    tests: [test('Número con espacios', 'puerto(" 8080 ") == Ok(8080)', 'La normalización precede al parseo.', 'Aplicá trim antes de parse.'), test('Cero tiene otra causa', 'puerto("0") == Err("cero")', 'Un parseo exitoso no garantiza la regla del dominio.', 'Validá cero después de obtener n.'), test('Formato y rango', 'puerto("abc") == Err("numero") && puerto("65536") == Err("numero")', 'El parser limita el rango de u16.', 'No parsees a un tipo grande y luego uses as para truncar.')],
    hints: ['Especificá u16 en parse o en la variable.', 'map_err(|_| "numero") normaliza el error de parseo.', 'Usá ? para propagar el Result antes de comparar n con cero.'],
    review: {success: 'Los errores distinguen entrada no representable de un valor representable prohibido. El cast as no reemplaza esta validación.', pitfall: '65536 as u16 truncaría el número; parse::<u16> rechaza la entrada fuera del rango.'},
    transfer: 'Definí un tipo Puerto con constructor que garantice la invariante.',
    prediction: predict('¿Qué debería ocurrir con "65536" al parsearlo como u16?', ['Se vuelve 0 silenciosamente', 'Devuelve un error', 'Se convierte en u32'], 1, 'FromStr valida que el valor sea representable por el tipo pedido.'),
    sources: [src('std · str::parse', 'https://doc.rust-lang.org/std/primitive.str.html#method.parse'), src('Rust Book · Result and ?', 'https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html')]
  });

  add(6, {
    title: 'Propagá errores sin esconderlos',
    intro: '? extrae Ok o devuelve temprano el Err desde la función actual. Permite encadenar operaciones que pueden fallar.',
    why: 'El camino exitoso se lee en orden y el error conserva su significado. No necesitás duplicar un match completo en cada paso.',
    objective: 'Parseá a y b como i32, sumalos con checked_add. Error de parseo: "numero"; overflow: "overflow".',
    instructions: ['Propagá el error de cada parseo con ?.', 'Convertí el Option de checked_add usando ok_or.'],
    starter: 'fn sumar_texto(a: &str, b: &str) -> Result<i32, &\'static str> {\n    todo!()\n}',
    solution: 'fn sumar_texto(a: &str, b: &str) -> Result<i32, &\'static str> {\n    let a = a.parse::<i32>().map_err(|_| "numero")?;\n    let b = b.parse::<i32>().map_err(|_| "numero")?;\n    a.checked_add(b).ok_or("overflow")\n}',
    tests: [test('Camino exitoso', 'sumar_texto("12", "-5") == Ok(7)', 'Los dos parseos preceden a la suma.', 'Conservá el signo al parsear i32.'), test('Dos lugares de fallo', 'sumar_texto("x", "2") == Err("numero") && sumar_texto("2", "x") == Err("numero")', 'Ningún parseo se ignora.', 'Ambos parseos necesitan map_err y ?.'), test('Overflow visible', 'sumar_texto("2147483647", "1") == Err("overflow")', 'El límite aritmético se maneja explícitamente.', 'checked_add devuelve None si el resultado no cabe.')],
    hints: ['parse::<i32>() devuelve Result.', 'checked_add devuelve Option<i32>.', 'La última línea puede ser a.checked_add(b).ok_or("overflow").'],
    review: {success: 'La función comunica dos clases de error. El comportamiento no depende de cómo se configure la comprobación de overflow del compilador.', pitfall: 'Usar + y esperar capturar siempre un panic no define una política consistente para todos los perfiles de compilación.'},
    transfer: 'Agregá un tercer operando manteniendo la propagación de errores.',
    prediction: predict('¿Qué hace ? cuando encuentra Err dentro de esta función?', ['Lo cambia por cero', 'Reintenta la operación', 'Devuelve temprano el error'], 2, 'El operador propaga el error; no lo repara ni lo descarta.'),
    sources: [src('std · i32::checked_add', 'https://doc.rust-lang.org/std/primitive.i32.html#method.checked_add'), src('Rust Book · Propagating errors', 'https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html')]
  });

  add(6, {
    title: 'Un valor por defecto con intención',
    intro: 'map transforma el contenido de Some y conserva None. unwrap_or selecciona un valor por defecto si no había contenido.',
    why: 'Estas operaciones mantienen explícita la diferencia entre dato presente y ausente durante la transformación.',
    objective: 'Para Some(nombre), devolvé "Hola, nombre". Para None, devolvé "Hola, visitante". Some("") sigue siendo un nombre presente.',
    instructions: ['Transformá la opción sin unwrap.', 'Devolvé un String propio construido con format!.'],
    starter: 'fn saludo(nombre: Option<&str>) -> String {\n    todo!()\n}',
    solution: 'fn saludo(nombre: Option<&str>) -> String {\n    format!("Hola, {}", nombre.unwrap_or("visitante"))\n}',
    tests: [test('Persona presente', 'saludo(Some("Ana")) == "Hola, Ana"', 'Se preserva el contenido de Some.', 'Insertá el nombre recibido en el mensaje.'), test('Ausencia', 'saludo(None) == "Hola, visitante"', 'El default se limita al caso None.', 'unwrap_or puede seleccionar visitante.'), test('Presente pero vacío', 'saludo(Some("")) == "Hola, "', 'Vacío y ausencia no se mezclan.', 'No filtres el nombre vacío: el contrato lo conserva.')],
    hints: ['No necesitás tratar Some("") como error.', 'unwrap_or("visitante") obtiene un &str en ambos casos.', 'format!("Hola, {}", nombre.unwrap_or("visitante"))'],
    review: {success: 'El fallback responde a la ausencia, no a un juicio implícito sobre el contenido. Esa distinción hace predecible la API.', pitfall: 'Un valor presente puede ser cero, false o una cadena vacía; ninguno equivale automáticamente a None.'},
    transfer: 'Construí la misma función con map y unwrap_or_else; identificá cuándo se crea cada String.',
    prediction: predict('¿Some("").unwrap_or("visitante") produce "visitante"?', ['No, produce la cadena vacía presente', 'Sí, porque está vacía', 'Causa panic'], 0, 'unwrap_or solo usa su alternativa cuando la opción es None.'),
    sources: [src('std · Option', 'https://doc.rust-lang.org/std/option/enum.Option.html')]
  });

  add(7, {
    title: 'Conservá solo mediciones sanas', visual: 'collections',
    intro: 'Vec::retain conserva los elementos para los que el predicado devuelve true y mantiene su orden relativo.',
    why: 'Filtrar en el mismo vector evita construir otra colección cuando el llamador permite modificar la existente.',
    objective: 'Eliminá todos los valores negativos, conservando cero, duplicados y orden.',
    instructions: ['Recibís &mut Vec<i32>; modificá ese vector.', 'Usá retain con la condición de aceptación.'],
    starter: 'fn limpiar(datos: &mut Vec<i32>) {\n    todo!()\n}',
    solution: 'fn limpiar(datos: &mut Vec<i32>) {\n    datos.retain(|x| *x >= 0);\n}',
    tests: [test('Mezcla', '{ let mut v = vec![-2, 5, 0, -1, 5]; limpiar(&mut v); v == vec![5, 0, 5] }', 'Cero, duplicados y orden se conservan.', 'La condición debe ser >= 0, sin ordenar.'), test('Todos descartados', '{ let mut v = vec![-3, -1]; limpiar(&mut v); v.is_empty() }', 'La colección puede quedar vacía.', 'retain conserva true y elimina false.'), test('Ya vacío', '{ let mut v = Vec::new(); limpiar(&mut v); v.is_empty() }', 'La operación acepta el elemento vacío.', 'No indexés el primer elemento.')],
    hints: ['La closure recibe &i32.', 'Desreferenciá x para compararlo con cero.', 'datos.retain(|x| *x >= 0);'],
    review: {success: 'La colección mantiene los datos aceptados en su orden original. El préstamo mutable expresa que la función cambia su contenido.', pitfall: 'Retener positivos con > 0 eliminaría el cero que el contrato permite.'},
    transfer: 'Hacé configurable el umbral y probá valores exactamente iguales a él.',
    prediction: predict('Si el predicado de retain devuelve false, ¿qué pasa con el elemento?', ['Se conserva', 'Se elimina', 'Se reemplaza por cero'], 1, 'retain mantiene únicamente los elementos aceptados por el predicado.'),
    sources: [src('std · Vec::retain', 'https://doc.rust-lang.org/std/vec/struct.Vec.html#method.retain')]
  });

  add(7, {
    title: 'Una pila de tareas', visual: 'collections',
    intro: 'Vec::push agrega al final y pop retira de ese mismo extremo. Juntos implementan una pila LIFO.',
    why: 'La elección de estructura determina el orden de trabajo. Una pila favorece el último elemento recibido, como en deshacer acciones.',
    objective: 'Apilá las tareas en el orden recibido y devolvé el orden de extracción usando pop.',
    instructions: ['Copiá los i32 a un Vec y retiralos hasta vaciarlo.', 'El resultado debe estar en orden inverso, sin perder duplicados.'],
    starter: 'fn procesar_pila(tareas: &[i32]) -> Vec<i32> {\n    todo!()\n}',
    solution: 'fn procesar_pila(tareas: &[i32]) -> Vec<i32> {\n    let mut pila = tareas.to_vec();\n    let mut salida = Vec::new();\n    while let Some(tarea) = pila.pop() { salida.push(tarea); }\n    salida\n}',
    tests: [test('Último entra, primero sale', 'procesar_pila(&[1, 2, 3]) == vec![3, 2, 1]', 'La estructura cumple LIFO.', 'pop retira el extremo final.'), test('Duplicados', 'procesar_pila(&[4, 4, 7]) == vec![7, 4, 4]', 'Cada tarea se procesa, aunque repita valor.', 'No conviertas a un conjunto.'), test('Sin tareas', 'procesar_pila(&[]).is_empty()', 'La primera extracción puede no existir.', 'while let maneja el None de pop.')],
    hints: ['to_vec crea un vector propio a partir del slice.', 'while let Some(tarea) = pila.pop() repite mientras haya elementos.', 'Agregá cada elemento retirado a salida.'],
    review: {success: 'Cada extracción reduce la pila y garantiza terminar. El orden observado revela la política de la estructura.', pitfall: 'Una pila no es una cola FIFO: elegir pop del final cambia qué tarea va primero.'},
    transfer: 'Compará este orden con el ejercicio de VecDeque.',
    prediction: predict('Después de push(1), push(2), ¿qué devuelve el primer pop?', ['Some(1)', 'None', 'Some(2)'], 2, 'pop retira el último elemento insertado.'),
    sources: [src('std · Vec::pop', 'https://doc.rust-lang.org/std/vec/struct.Vec.html#method.pop')]
  });

  add(7, {
    title: 'Contá eventos con HashMap', visual: 'collections',
    intro: 'HashMap relaciona claves con valores. entry permite insertar un valor inicial si falta y luego modificarlo con un único flujo.',
    why: 'El contador de frecuencias reúne búsqueda, creación y actualización sin duplicar decisiones sobre la misma clave.',
    objective: 'Contá palabras separadas por whitespace, respetando mayúsculas. Devolvé HashMap<String, usize>.',
    instructions: ['Recorré split_whitespace.', 'Usá entry(palabra.to_string()).or_insert(0) y aumentá el contador.'],
    starter: 'use std::collections::HashMap;\nfn frecuencias(texto: &str) -> HashMap<String, usize> {\n    todo!()\n}',
    solution: 'use std::collections::HashMap;\nfn frecuencias(texto: &str) -> HashMap<String, usize> {\n    let mut conteo = HashMap::new();\n    for palabra in texto.split_whitespace() {\n        *conteo.entry(palabra.to_string()).or_insert(0) += 1;\n    }\n    conteo\n}',
    tests: [test('Repeticiones', '{ let m = frecuencias("cpu ram cpu"); m.get("cpu") == Some(&2) && m.get("ram") == Some(&1) && m.len() == 2 }', 'Cada clave acumula su propia frecuencia.', 'Incrementá el valor retornado por entry.'), test('Mayúsculas y separadores', '{ let m = frecuencias("Go\tgo\nGo"); m.get("Go") == Some(&2) && m.get("go") == Some(&1) }', 'No hay normalización no solicitada.', 'Conservá la palabra original y usá split_whitespace.'), test('Sin palabras', 'frecuencias("  ").is_empty()', 'El mapa no contiene claves vacías.', 'split_whitespace evita tokens vacíos.')],
    hints: ['La clave debe ser String propio.', 'or_insert devuelve &mut usize.', 'Usá * para incrementar el contador apuntado.'],
    review: {success: 'El mapa almacena claves propias y contadores separados. Las pruebas consultan claves porque HashMap no promete orden de iteración.', pitfall: 'Comparar una lista de claves sin ordenar haría depender la prueba de un orden no garantizado.'},
    transfer: 'Normalizá a minúsculas en una variante y explicá cómo cambia el contrato.',
    prediction: predict('¿HashMap promete iterar en el orden en que insertaste las claves?', ['Sí', 'No', 'Solo cuando las claves son String'], 1, 'El orden de HashMap no forma parte de ese contrato. Ordená explícitamente si necesitás salida estable.'),
    sources: [src('std · HashMap::entry', 'https://doc.rust-lang.org/std/collections/struct.HashMap.html#method.entry')]
  });

  add(7, {
    title: 'Un conjunto con salida estable', visual: 'collections',
    intro: 'BTreeSet almacena elementos únicos y los recorre en orden. Permite expresar deduplicación y orden como propiedades de la colección.',
    why: 'Elegir la colección adecuada puede hacer innecesario mantener manualmente dos invariantes diferentes.',
    objective: 'Devolvé los i32 únicos en orden ascendente.',
    instructions: ['Insertá los valores en BTreeSet.', 'Convertí su iterador en Vec<i32>.'],
    starter: 'use std::collections::BTreeSet;\nfn unicos(datos: &[i32]) -> Vec<i32> {\n    todo!()\n}',
    solution: 'use std::collections::BTreeSet;\nfn unicos(datos: &[i32]) -> Vec<i32> {\n    let conjunto: BTreeSet<i32> = datos.iter().copied().collect();\n    conjunto.into_iter().collect()\n}',
    tests: [test('Repetidos desordenados', 'unicos(&[4, 1, 4, 2]) == vec![1, 2, 4]', 'Se cumplen unicidad y orden.', 'Un HashSet por sí solo no garantiza este orden.'), test('Negativos y cero', 'unicos(&[0, -2, 0, -2]) == vec![-2, 0]', 'El orden es numérico.', 'No conviertas los valores a texto para ordenarlos.'), test('Vacío', 'unicos(&[]).is_empty()', 'La colección vacía se transforma correctamente.', 'collect funciona también sin elementos.')],
    hints: ['iter().copied() entrega i32.', 'Anotá el tipo BTreeSet<i32> al recolectar.', 'into_iter recorre el conjunto en orden y mueve los valores.'],
    review: {success: 'La estructura se encarga de no repetir elementos y de su orden. El Vec final sirve como salida estable.', pitfall: 'Vec::dedup elimina solo duplicados consecutivos; sin ordenar primero no resolvería todos estos casos.'},
    transfer: 'Implementá otra versión con sort_unstable y dedup; compará sus pasos.',
    prediction: predict('¿Vec::dedup por sí solo convierte [2, 1, 2] en [1, 2]?', ['Sí', 'Solo con i32', 'No: elimina duplicados consecutivos'], 2, 'dedup no ordena ni busca repeticiones arbitrariamente separadas.'),
    sources: [src('std · BTreeSet', 'https://doc.rust-lang.org/std/collections/struct.BTreeSet.html')]
  });

  add(7, {
    title: 'Turnos justos con VecDeque', visual: 'collections',
    intro: 'VecDeque permite agregar al final y retirar del frente. Esa combinación implementa una cola FIFO.',
    why: 'Para una cola de trabajo, atender primero lo que llegó primero puede ser parte de la corrección, no solo una decisión de rendimiento.',
    objective: 'Construí la cola con tareas, atendé hasta limite elementos y devolvé los atendidos en orden.',
    instructions: ['Usá pop_front sobre VecDeque.', 'Si se vacía antes del límite, terminá sin panic.'],
    starter: 'use std::collections::VecDeque;\nfn atender(tareas: &[i32], limite: usize) -> Vec<i32> {\n    todo!()\n}',
    solution: 'use std::collections::VecDeque;\nfn atender(tareas: &[i32], limite: usize) -> Vec<i32> {\n    let mut cola: VecDeque<i32> = tareas.iter().copied().collect();\n    let mut salida = Vec::new();\n    for _ in 0..limite {\n        match cola.pop_front() { Some(x) => salida.push(x), None => break }\n    }\n    salida\n}',
    tests: [test('Cupo parcial', 'atender(&[10, 20, 30], 2) == vec![10, 20]', 'La extracción cumple FIFO.', 'Retirá por el frente, no por atrás.'), test('Cupo mayor a la cola', 'atender(&[7], 8) == vec![7]', 'No se inventan tareas faltantes.', 'Cortá ante None.'), test('Sin cupo', 'atender(&[1, 2], 0).is_empty() && atender(&[], 3).is_empty()', 'Cero cupo y cero tareas se manejan.', 'El bucle no debe retirar elementos antes de verificar el límite.')],
    hints: ['Recolectá copied en VecDeque<i32>.', 'Un for en 0..limite marca el máximo de extracciones.', 'match pop_front: Some va a salida; None termina el bucle.'],
    review: {success: 'La cola preserva el orden de llegada y el límite de trabajo. La estructura evita desplazar todo un Vec para cada extracción frontal.', pitfall: 'VecDeque puede estar dividido internamente en dos regiones; no supongas que siempre ofrece un slice contiguo.'},
    transfer: 'Devolvé también las tareas pendientes y comprobá que ningún elemento desaparezca.',
    prediction: predict('¿Qué pareja de operaciones modela FIFO?', ['push_back y pop_front', 'push_back y pop_back', 'sort y pop_back'], 0, 'Agregar al final y retirar del principio conserva el orden de llegada.'),
    sources: [src('std · VecDeque', 'https://doc.rust-lang.org/std/collections/struct.VecDeque.html')]
  });

  add(8, {
    title: 'Transformaciones que todavía no ocurrieron', kind: 'reparar',
    intro: 'map produce otro iterador y es perezoso: describe una transformación. collect lo consume y construye la colección resultante.',
    why: 'Separar descripción y ejecución permite encadenar pasos sin materializar una colección intermedia para cada uno.',
    objective: 'Devolvé el doble de cada valor, conservando orden. Valores entre -1.000 y 1.000.',
    instructions: ['Completá la cadena con un consumidor.', 'La salida debe ser Vec<i32>.'],
    starter: 'fn dobles(datos: &[i32]) -> Vec<i32> {\n    datos.iter().map(|x| x * 2)\n}',
    solution: 'fn dobles(datos: &[i32]) -> Vec<i32> {\n    datos.iter().map(|x| x * 2).collect()\n}',
    tests: [test('Secuencia', 'dobles(&[1, 3, 2]) == vec![2, 6, 4]', 'La transformación respeta el orden.', 'Consumí map con collect.'), test('Signos', 'dobles(&[-4, 0]) == vec![-8, 0]', 'La operación se aplica a cada valor.', 'Multiplicá por dos, sin filtrar.'), test('Vacío', 'dobles(&[]).is_empty()', 'Un pipeline vacío produce colección vacía.', 'No agregues elementos por defecto.')],
    hints: ['El tipo de map no es Vec.', 'collect usa el tipo de retorno para saber qué construir.', 'Agregá .collect() al final.'],
    review: {success: 'La cadena ahora se consume. No necesitaste escribir índices ni un acumulador manual.', pitfall: 'Crear un iterador y descartarlo puede no ejecutar ninguna de sus transformaciones.'},
    transfer: 'Insertá filter antes de map y explicá por qué cambia qué valores se transforman.',
    prediction: predict('¿map por sí solo construye inmediatamente un Vec?', ['Sí', 'No: crea un iterador perezoso', 'Solo si hay tres elementos'], 1, 'Necesitás consumir el iterador, por ejemplo con collect, sum o un for.')
  });

  add(8, {
    title: 'Un pipeline de sensores',
    intro: 'filter conserva elementos que cumplen una condición. map puede convertirlos antes de un consumidor como sum.',
    why: 'Cada paso nombra una intención: seleccionar, transformar, reducir. Esta separación ayuda a revisar la lógica sin seguir índices.',
    objective: 'Sumá el cuadrado de los valores estrictamente positivos. Entradas entre -1.000 y 1.000, como máximo 100 elementos.',
    instructions: ['Ignorá cero y negativos.', 'Usá un pipeline o un recorrido equivalente sin modificar la entrada.'],
    starter: 'fn energia_positiva(datos: &[i32]) -> i32 {\n    todo!()\n}',
    solution: 'fn energia_positiva(datos: &[i32]) -> i32 {\n    datos.iter().copied().filter(|x| *x > 0).map(|x| x * x).sum()\n}',
    tests: [test('Mezcla de signos', 'energia_positiva(&[-3, 2, 4]) == 20', 'Los negativos no se vuelven positivos al cuadrarlos antes de filtrar.', 'Filtrá según el valor original.'), test('Nada aceptado', 'energia_positiva(&[-1, 0]) == 0', 'La reducción vacía suma cero.', 'No eleves negativos antes del filtro.'), test('Solo positivos', 'energia_positiva(&[1, 2, 3]) == 14', 'Se suma cada cuadrado individual.', 'Cuadrado de la suma no es suma de cuadrados.')],
    hints: ['copied simplifica trabajar con valores i32.', 'El filtro va antes de map(|x| x * x).', 'Terminá con sum().'],
    review: {success: 'El orden del pipeline expresa la regla del dominio: decidir con el dato original y transformar solo lo aceptado.', pitfall: 'Cambiar filter y map puede cambiar el significado incluso si el código compila.'},
    transfer: 'Contá cuántos valores fueron descartados y devolvé ambas métricas.',
    prediction: predict('Si primero elevás al cuadrado y después filtrás > 0, ¿qué pasa con -3?', ['Se descarta', 'Se acepta como 9, cambiando la regla', 'No compila'], 1, 'La transformación destruye la información del signo que necesitaba el filtro.')
  });

  add(8, {
    title: 'Closures que recuerdan un umbral',
    intro: 'Una closure puede usar variables del entorno. No necesitás convertir el umbral en una variable global.',
    why: 'Capturar una configuración local mantiene juntas la regla y sus dependencias. El compilador decide cómo prestar o mover las capturas según sus usos.',
    objective: 'Contá cuántas mediciones son mayores o iguales al umbral.',
    instructions: ['Usá filter con una closure que capture umbral.', 'Contá los aceptados con count.'],
    starter: 'fn alarmas(datos: &[i32], umbral: i32) -> usize {\n    todo!()\n}',
    solution: 'fn alarmas(datos: &[i32], umbral: i32) -> usize {\n    datos.iter().copied().filter(|x| *x >= umbral).count()\n}',
    tests: [test('Incluye la frontera', 'alarmas(&[9, 10, 11], 10) == 2', 'El umbral es inclusivo.', 'Usá >=, no >.'), test('Configuración diferente', 'alarmas(&[-2, -1, 0], -1) == 2', 'La closure usa el argumento actual.', 'No fijes el umbral en una constante.'), test('Ninguna alarma', 'alarmas(&[], 0) == 0 && alarmas(&[1, 2], 3) == 0', 'Vacío y rechazo total se comportan igual en el conteo.', 'count mide aceptados, no el tamaño original.')],
    hints: ['umbral está disponible dentro de |x| ... .', 'filter recibe una referencia al elemento.', 'filter(|x| *x >= umbral).count()'],
    review: {success: 'La condición captura el umbral de esta llamada, por eso la misma función admite distintas configuraciones.', pitfall: 'La closure de filter recibe una referencia, incluso si el iterador entrega valores; esa firma evita consumir el elemento al decidir.'},
    transfer: 'Aceptá dos umbrales y contá solo valores dentro del intervalo.',
    prediction: predict('¿La closure necesita una variable global para leer umbral?', ['Sí', 'Solo si umbral cambia entre llamadas', 'No: puede capturarlo del entorno local'], 2, 'Las closures pueden acceder a variables de su contexto.'),
    sources: [src('Rust Book · Closures', 'https://doc.rust-lang.org/book/ch13-01-closures.html')]
  });

  add(8, {
    title: 'Un comportamiento compartido por contrato',
    intro: 'Un trait describe operaciones que un tipo ofrece. Una función genérica puede pedir ese comportamiento sin conocer el tipo concreto.',
    why: 'La abstracción queda limitada a lo que necesitás: calcular bytes. No obliga a que todos los mensajes compartan una estructura de campos.',
    objective: 'Implementá Bytes para Bloque y calculá el doble de su tamaño en duplicado.',
    instructions: ['Completá el método del trait y la función genérica.', 'Los tamaños de prueba son menores que 1.000.'],
    starter: 'trait Bytes { fn bytes(&self) -> usize; }\nstruct Bloque { tamano: usize }\nimpl Bytes for Bloque {\n    fn bytes(&self) -> usize { todo!() }\n}\nfn duplicado<T: Bytes>(valor: &T) -> usize {\n    todo!()\n}',
    solution: 'trait Bytes { fn bytes(&self) -> usize; }\nstruct Bloque { tamano: usize }\nimpl Bytes for Bloque {\n    fn bytes(&self) -> usize { self.tamano }\n}\nfn duplicado<T: Bytes>(valor: &T) -> usize {\n    valor.bytes() * 2\n}',
    tests: [test('Bloque concreto', 'duplicado(&Bloque { tamano: 12 }) == 24', 'La implementación entrega el campo correcto.', 'bytes devuelve tamano y duplicado lo multiplica.'), test('Tamaño vacío', 'duplicado(&Bloque { tamano: 0 }) == 0', 'El contrato incluye cero.', 'No agregues cabeceras que no se pidieron.'), test('Otro implementador', '{ struct Cabecera; impl Bytes for Cabecera { fn bytes(&self) -> usize { 7 } } duplicado(&Cabecera) == 14 }', 'La función depende del trait, no de los campos de Bloque.', 'Dentro de duplicado usá valor.bytes(), no valor.tamano.')],
    hints: ['El método de Bloque puede acceder a self.tamano.', 'T: Bytes habilita llamar bytes sobre &T.', 'La función genérica solo debe conocer el método del trait.'],
    review: {success: 'La tercera prueba aporta otro tipo sin modificar duplicado. Eso verifica el límite de la abstracción.', pitfall: 'Una restricción T: Bytes no promete campos específicos, solo los métodos declarados por el trait.'},
    transfer: 'Implementá Bytes para un tipo Texto que contenga String.',
    prediction: predict('¿Puede duplicado<T: Bytes> acceder a valor.tamano para cualquier T?', ['No: el trait garantiza métodos, no ese campo', 'Sí: todos los tipos tienen tamano', 'Solo en modo release'], 0, 'T podría ser Cabecera u otro tipo con una representación diferente.'),
    sources: [src('Rust Book · Traits', 'https://doc.rust-lang.org/book/ch10-02-traits.html')]
  });

  add(8, {
    title: 'Construí tu propio iterador',
    intro: 'Iterator exige un tipo Item y el método next. Los métodos como collect se construyen sobre ese contrato.',
    why: 'Implementar una operación pequeña conecta tu estructura con herramientas generales de recorrido y transformación.',
    objective: 'Cuenta(3) debe producir 3, 2, 1 y terminar. Cuenta(0) no produce elementos; después de terminar, siempre devuelve None.',
    instructions: ['En next, devolvé None si el contador es cero.', 'En otro caso guardá el valor, restá uno y devolvé Some(valor).'],
    starter: 'struct Cuenta(u32);\nimpl Iterator for Cuenta {\n    type Item = u32;\n    fn next(&mut self) -> Option<u32> {\n        todo!()\n    }\n}',
    solution: 'struct Cuenta(u32);\nimpl Iterator for Cuenta {\n    type Item = u32;\n    fn next(&mut self) -> Option<u32> {\n        if self.0 == 0 { return None; }\n        let actual = self.0;\n        self.0 -= 1;\n        Some(actual)\n    }\n}',
    tests: [test('Secuencia descendente', 'Cuenta(3).collect::<Vec<_>>() == vec![3, 2, 1]', 'Cada llamada avanza antes de repetir.', 'Reducí el estado después de guardar el actual.'), test('Ya agotado', '{ let mut c = Cuenta(0); c.next() == None && c.next() == None }', 'Agotarse no produce underflow.', 'Comprobá cero antes de restar.'), test('Estado paso a paso', '{ let mut c = Cuenta(1); c.next() == Some(1) && c.next() == None && c.next() == None }', 'El último elemento sale una sola vez.', 'Devolvé el valor previo a la reducción.')],
    hints: ['self.0 accede al campo de la tuple struct.', 'next necesita &mut self porque cambia el estado.', 'La guarda de cero evita tanto bucle infinito como underflow.'],
    review: {success: 'Tu tipo ya funciona con collect sin implementarlo. Cada next establece avance o finalización.', pitfall: 'No todos los iteradores prometen quedarse en None; este ejercicio sí lo exige como parte de su contrato.'},
    transfer: 'Usá Cuenta(5).filter(...) para producir únicamente los valores pares.',
    prediction: predict('Si next devuelve siempre Some(3) sin modificar estado, ¿terminará collect?', ['Sí, después de tres elementos', 'No: el iterador nunca indica finalización', 'Devuelve un vector vacío'], 1, 'collect continúa solicitando elementos hasta recibir None; next debe garantizar progreso.'),
    sources: [src('std · Iterator', 'https://doc.rust-lang.org/std/iter/trait.Iterator.html')]
  });

  add(9, {
    title: 'Mové valores sin pedirles ser Copy',
    intro: 'Los genéricos representan tipos que conocerá cada llamada. Mover valores no requiere copiar ni clonarlos.',
    why: 'Pedir menos restricciones amplía la utilidad de una función. Si solo intercambiás posiciones, Copy y Clone no aportan nada.',
    objective: 'Invertí una pareja (A, B) y devolvé (B, A), moviendo ambos valores.',
    instructions: ['Desestructurá la tupla recibida.', 'No agregues restricciones Copy o Clone.'],
    starter: 'fn invertir<A, B>(pareja: (A, B)) -> (B, A) {\n    todo!()\n}',
    solution: 'fn invertir<A, B>(pareja: (A, B)) -> (B, A) {\n    let (a, b) = pareja;\n    (b, a)\n}',
    tests: [test('Tipos distintos', 'invertir((7, "cpu")) == ("cpu", 7)', 'Cada posición conserva su tipo al cambiar de lugar.', 'La firma de salida invierte B y A.'), test('Recursos propios', 'invertir((String::from("clave"), vec![1, 2])) == (vec![1, 2], String::from("clave"))', 'La función acepta valores que no son Copy.', 'Mové los valores; no necesitás copiarlos.'), test('Tipo sin Clone', '{ struct Unico(u8); let (flag, unico) = invertir((Unico(9), true)); flag && unico.0 == 9 }', 'No se introdujeron restricciones innecesarias.', 'Desestructurar permite mover incluso un tipo sin Clone.')],
    hints: ['let (a, b) = pareja toma ambos campos.', 'Los movimientos transfieren propiedad.', 'Devolvé (b, a).'],
    review: {success: 'La función es genérica respecto de la representación y no impone capacidades que no usa.', pitfall: 'Agregar Clone por costumbre limita las entradas y puede sugerir copias que no son necesarias.'},
    transfer: 'Rotá una tupla (A, B, C) a (C, A, B) sin restricciones.',
    prediction: predict('¿Necesita A: Clone esta función para devolver a en otra posición?', ['No, puede moverlo', 'Sí, toda función genérica necesita Clone', 'Solo para String'], 0, 'Mover un valor no requiere implementar Clone.'),
    sources: [src('Rust Book · Generic data types', 'https://doc.rust-lang.org/book/ch10-01-syntax.html')], visual: 'memory'
  });

  add(9, {
    title: 'El primer elemento de cualquier tipo',
    intro: 'Devolver &T permite observar un elemento sin exigir que T sea copiable. El préstamo del resultado queda relacionado con la entrada.',
    why: 'Una firma genérica puede compartir datos pesados sin duplicarlos. La ausencia sigue representada por Option.',
    objective: 'Implementá cabeza<T> que devuelva una referencia al primer elemento, o None.',
    instructions: ['Conservá el retorno Option<&T>.', 'No agregues Copy ni Clone al parámetro T.'],
    starter: 'fn cabeza<T>(datos: &[T]) -> Option<&T> {\n    todo!()\n}',
    solution: 'fn cabeza<T>(datos: &[T]) -> Option<&T> {\n    datos.first()\n}',
    tests: [test('Enteros', 'cabeza(&[4, 8]) == Some(&4)', 'La posición inicial se conserva.', 'first devuelve una referencia.'), test('String prestado', '{ let v = vec![String::from("uno"), String::from("dos")]; cabeza(&v).map(|s| s.as_str()) == Some("uno") && v.len() == 2 }', 'No se consumen recursos propios del vector.', 'No uses into_iter sobre un vector propio.'), test('Vacío de otro tipo', 'cabeza::<bool>(&[]).is_none()', 'El contrato es genérico también sin elementos.', 'El tipo se puede especificar aunque no haya valores.')],
    hints: ['No necesitás construir ni copiar T.', 'first ya devuelve Option<&T>.', 'El cuerpo puede ser datos.first().'],
    review: {success: 'El resultado refiere al almacenamiento de la entrada. Rust impide conservar ese préstamo más allá de la vida de sus datos.', pitfall: 'La función no vuelve inmortal al elemento: el dueño debe seguir vivo mientras uses la referencia.'},
    transfer: 'Escribí cabeza_mut para permitir modificar el primer elemento con un préstamo exclusivo.',
    prediction: predict('¿Qué permite omitir lifetimes explícitos en esta firma?', ['Las referencias no tienen lifetime', 'Hay una única entrada prestada y se aplica la regla de elisión', 'T debe ser static'], 1, 'La elisión relaciona el lifetime de salida con el único lifetime de entrada.'), visual: 'memory'
  });

  add(9, {
    title: 'El mayor sin clonar la colección',
    intro: 'T: Ord garantiza un orden total. Al devolver una referencia, no necesitás T: Copy ni T: Clone.',
    why: 'Las restricciones genéricas son promesas comprobables. Pedís comparación porque el algoritmo la usa y evitás pedir capacidades ajenas.',
    objective: 'Devolvé una referencia al mayor elemento o None si el slice está vacío.',
    instructions: ['Usá iter().max() o un recorrido equivalente.', 'Mantené solamente T: Ord como restricción.'],
    starter: 'fn mayor<T: Ord>(datos: &[T]) -> Option<&T> {\n    todo!()\n}',
    solution: 'fn mayor<T: Ord>(datos: &[T]) -> Option<&T> {\n    datos.iter().max()\n}',
    tests: [test('Enteros sin ordenar', 'mayor(&[3, 9, 1]) == Some(&9)', 'Se compara toda la secuencia.', 'No asumas que el último es el mayor.'), test('Strings', '{ let v = vec![String::from("beta"), String::from("alfa")]; mayor(&v).map(|s| s.as_str()) == Some("beta") }', 'El algoritmo acepta un tipo no Copy con Ord.', 'La comparación sigue el orden de T.'), test('Ausencia y negativos', 'mayor::<i32>(&[]).is_none() && mayor(&[-7, -2, -9]) == Some(&-2)', 'No se usa cero como máximo artificial.', 'Un valor inicial fijo fallaría con todos negativos.')],
    hints: ['iter produce referencias a T.', 'max devuelve Option con el tipo de elemento del iterador.', 'datos.iter().max() ya cumple la firma.'],
    review: {success: 'La abstracción devuelve una vista del dato máximo. Ord proporciona un contrato más fuerte que una comparación parcial.', pitfall: 'f32 y f64 no implementan Ord: NaN hace que su comparación habitual sea parcial.'},
    transfer: 'Definí una struct con derives de orden y probá qué campo decide primero.',
    prediction: predict('¿Por qué esta función no pide T: Clone?', ['Porque clona con magia', 'Porque Ord incluye Clone', 'Porque devuelve una referencia existente'], 2, 'Comparar y prestar no exige duplicar el valor.'),
    sources: [src('std · Ord', 'https://doc.rust-lang.org/std/cmp/trait.Ord.html'), src('std · Iterator::max', 'https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.max')]
  });

  add(9, {
    title: 'Decí de dónde puede venir la referencia', kind: 'reparar',
    intro: 'Con dos entradas prestadas y una salida que podría venir de cualquiera, la firma necesita describir la relación de lifetimes.',
    why: 'Las anotaciones no alargan la vida de los datos. Explican qué relaciones debe verificar el compilador en cada llamada.',
    objective: 'Devolvé a si usar_a es true, o b si es false; agregá un lifetime compartido a entradas y salida.',
    instructions: ['Declarar \'a en la función permite nombrar esa relación.', 'No devuelvas String ni uses \'static para esconder el problema.'],
    starter: 'fn elegir(a: &str, b: &str, usar_a: bool) -> &str {\n    if usar_a { a } else { b }\n}',
    solution: 'fn elegir<\'a>(a: &\'a str, b: &\'a str, usar_a: bool) -> &\'a str {\n    if usar_a { a } else { b }\n}',
    tests: [test('Primera entrada', '{ let a = String::from("local"); let b = String::from("remoto"); elegir(&a, &b, true) == "local" }', 'Se devuelve una vista de a.', 'Aplicá el mismo lifetime nombrado a ambos candidatos y la salida.'), test('Segunda entrada', '{ let a = String::from("local"); let b = String::from("remoto"); elegir(&a, &b, false) == "remoto" }', 'El contrato admite cualquiera de los dos orígenes.', 'El bool selecciona b cuando es false.'), test('Entrada vacía válida', '{ let a = String::new(); let b = String::from("x"); elegir(&a, &b, true).is_empty() }', 'El contenido no altera la regla de selección.', 'No reemplaces texto vacío por otro candidato.')],
    hints: ['El compilador necesita saber qué préstamos limitan la salida.', 'La forma es fn elegir<\'a>(a: &\'a str, b: &\'a str, ...) -> &\'a str.', 'Conservá el cuerpo; repará únicamente la firma.'],
    review: {success: 'La firma permite un lifetime común durante el cual ambas referencias son válidas. La salida solo podrá usarse dentro de ese contrato.', pitfall: '\'a no obliga a que ambos dueños se creen o se destruyan al mismo tiempo; limita la región donde puede usarse el préstamo resultante.'},
    transfer: 'Intentá usar el resultado fuera del bloque donde se creó b y observá la protección del compilador.',
    prediction: predict('¿Escribir \'a hace que un String local viva más tiempo?', ['Sí, evita su destrucción', 'No, solo declara una relación que Rust verifica', 'Sí, lo mueve al heap'], 1, 'Los lifetimes no administran la duración en ejecución; describen la validez de los préstamos.'), visual: 'memory'
  });

  add(9, {
    title: 'Una estructura que presta su texto',
    intro: 'Un struct puede contener referencias. El parámetro de lifetime registra que su validez depende de datos que pertenecen a otro valor.',
    why: 'Esto permite vistas sin copias para parsers y protocolos. El costo es que el dueño original debe permanecer disponible mientras exista el uso de la vista.',
    objective: 'Construí Vista sobre el texto después de quitar espacios exteriores. El campo debe seguir siendo &str prestado.',
    instructions: ['Completá crear_vista sin String nuevo.', 'Agregá bytes() para medir el slice guardado.'],
    starter: 'struct Vista<\'a> { texto: &\'a str }\nimpl<\'a> Vista<\'a> {\n    fn bytes(&self) -> usize { todo!() }\n}\nfn crear_vista(texto: &str) -> Vista<\'_> {\n    todo!()\n}',
    solution: 'struct Vista<\'a> { texto: &\'a str }\nimpl<\'a> Vista<\'a> {\n    fn bytes(&self) -> usize { self.texto.len() }\n}\nfn crear_vista(texto: &str) -> Vista<\'_> {\n    Vista { texto: texto.trim() }\n}',
    tests: [test('Normalización sin copia', '{ let s = String::from("  cpu  "); let v = crear_vista(&s); v.texto == "cpu" && v.bytes() == 3 }', 'La vista conserva el tramo normalizado.', 'trim devuelve un slice de la entrada.'), test('Solo espacios', '{ let v = crear_vista(" \t "); v.texto.is_empty() && v.bytes() == 0 }', 'La vista vacía sigue siendo válida.', 'No inventes texto cuando trim queda vacío.'), test('Unicode', '{ let s = String::from(" ñ "); let v = crear_vista(&s); v.texto == "ñ" && v.bytes() == 2 }', 'El método mide almacenamiento UTF-8.', 'Usá len sobre el campo prestado.')],
    hints: ['Vista { texto: texto.trim() } construye la vista.', 'El lifetime \'_ se infiere desde la entrada.', 'bytes debe devolver self.texto.len().'],
    review: {success: 'La estructura guarda una vista válida del texto original. Sus métodos pueden operar sin poseer ni copiar ese texto.', pitfall: 'No podés devolver una Vista de un String creado y destruido dentro de crear_vista; una anotación no arreglaría ese dueño faltante.'},
    transfer: 'Agregá otro campo prestado para el primer token y documentá su relación con la entrada.',
    prediction: predict('¿Podés construir la vista desde un String local y devolverla después de destruir ese String?', ['No: quedaría apuntando a datos que ya no existen', 'Sí, agregando \'static', 'Sí, porque &str copia el contenido'], 0, 'Las referencias no poseen sus datos; el compilador rechaza devolver préstamos de dueños locales destruidos.'), visual: 'memory'
  });

  add(10, {
    title: 'Un trabajo que viaja a otro thread',
    intro: 'thread::spawn inicia una closure en otro hilo. move transfiere las capturas necesarias; join espera el resultado del trabajo.',
    why: 'El thread podría vivir más que el alcance que lo creó. Mover un String propio evita que dependa de una referencia local que desaparezca.',
    objective: 'Mové texto a un thread, calculá sus bytes allí y devolvé el resultado después de join.',
    instructions: ['Usá std::thread::spawn(move || ...).', 'Esperá con join; no uses sleep para adivinar cuándo terminó.'],
    starter: 'fn bytes_en_thread(texto: String) -> usize {\n    todo!()\n}',
    solution: 'fn bytes_en_thread(texto: String) -> usize {\n    let trabajo = std::thread::spawn(move || texto.len());\n    trabajo.join().expect("el trabajo de lectura no debería fallar")\n}',
    tests: [test('Resultado del trabajo', 'bytes_en_thread(String::from("worker")) == 6', 'El valor retorna desde el thread.', 'join obtiene la respuesta de la closure.'), test('Trabajo vacío', 'bytes_en_thread(String::new()) == 0', 'Crear un thread no cambia el cálculo.', 'Devolvé len, no un mensaje impreso.'), test('Unicode en memoria', 'bytes_en_thread(String::from("🦀")) == 4', 'La tarea mantiene el contrato de bytes.', 'El movimiento no convierte bytes en caracteres.')],
    hints: ['Guardá el JoinHandle retornado por spawn.', 'move captura texto por propiedad.', 'La closure devuelve texto.len(); join devuelve Result<usize, _>.'],
    review: {success: 'Los resultados coinciden con la lectura esperada. La solución propuesta mueve el String al thread y obtiene la respuesta con join: compará esos pasos con tu implementación, porque los tests de salida solos no demuestran que se haya creado un thread.', pitfall: 'expect aquí simplifica un ejemplo cuyo trabajo no tiene fallos previstos; una aplicación debe decidir qué hacer si el thread entra en panic.'},
    transfer: 'Devolvé (bytes, chars) desde el mismo thread.',
    prediction: predict('¿sleep de 10 ms garantiza que un thread terminó?', ['Sí, siempre alcanza', 'No: join es el mecanismo para esperar su terminación', 'Sí, si el texto es corto'], 1, 'La planificación depende del sistema. join espera la terminación real y entrega su resultado.')
  });

  add(10, {
    title: 'Mensajes hasta cerrar el canal',
    intro: 'mpsc::channel conecta emisores con un receptor. Recorrer el receptor termina cuando ya no quedan emisores y se consumió lo enviado.',
    why: 'Cerrar el canal comunica finalización sin inventar un número especial de fin que pueda confundirse con datos.',
    objective: 'Un thread envía 0..n; el receptor devuelve todos los valores en orden. n está entre 0 y 20.',
    instructions: ['Mové el único sender al thread productor.', 'Recolectá el receiver y hacé join al productor.'],
    starter: 'fn transmitir(n: u32) -> Vec<u32> {\n    todo!()\n}',
    solution: 'fn transmitir(n: u32) -> Vec<u32> {\n    let (tx, rx) = std::sync::mpsc::channel();\n    let productor = std::thread::spawn(move || {\n        for i in 0..n { tx.send(i).expect("receptor disponible"); }\n    });\n    let salida = rx.into_iter().collect();\n    productor.join().expect("productor sin panic");\n    salida\n}',
    tests: [test('Secuencia completa', 'transmitir(4) == vec![0, 1, 2, 3]', 'El productor único conserva el orden de sus envíos.', 'Enviá cada i de 0..n una vez.'), test('Canal sin mensajes', 'transmitir(0).is_empty()', 'La finalización no depende de recibir al menos un dato.', 'El sender debe destruirse al terminar el thread.'), test('Un único envío', 'transmitir(1) == vec![0]', 'No se usa cero como centinela de fin.', 'Cero es un mensaje normal.')],
    hints: ['move debe llevarse tx; no dejes otro sender vivo.', 'rx.into_iter().collect() consume hasta el cierre.', 'Al terminar la closure, tx se destruye y el receptor puede finalizar.'],
    review: {success: 'Los casos comprueban la secuencia devuelta. En la solución propuesta, la vida del sender define el fin de la recepción; verificá además en tu código el uso del canal y su cierre, porque devolver la secuencia directamente también pasaría estas pruebas.', pitfall: 'Conservar un clone de tx en el thread principal mantendría abierto el canal y podría bloquear la recolección.'},
    transfer: 'Agregá dos productores y explicá qué orden ya no podés dar por garantizado entre ellos.',
    prediction: predict('Si queda un sender vivo que no envía, ¿el iterador del receptor sabe que terminó todo?', ['Sí, al vaciarse la cola', 'Sí, después de un milisegundo', 'No: puede esperar más mensajes'], 2, 'Una cola momentáneamente vacía no equivale a un canal cerrado.'),
    sources: [src('std · mpsc::channel', 'https://doc.rust-lang.org/std/sync/mpsc/fn.channel.html')]
  });

  add(10, {
    title: 'Un contador compartido y sincronizado',
    intro: 'Arc comparte propiedad entre threads. Mutex controla el acceso mutable al dato interior: son responsabilidades diferentes.',
    why: 'Contar desde varios workers exige que leer, sumar y escribir el contador sea una actualización protegida. Compartir un puntero por sí solo no alcanza.',
    objective: 'Creá 4 workers; cada uno incrementa el contador veces veces. Devolvé el total después de esperar a todos. veces está entre 0 y 100.',
    instructions: ['Compartí Arc<Mutex<u32>> y cloná el Arc para cada worker.', 'Hacé join de todos antes de leer el total.'],
    starter: 'use std::sync::{Arc, Mutex};\nfn contador_compartido(veces: u32) -> u32 {\n    todo!()\n}',
    solution: 'use std::sync::{Arc, Mutex};\nfn contador_compartido(veces: u32) -> u32 {\n    let contador = Arc::new(Mutex::new(0u32));\n    let mut workers = Vec::new();\n    for _ in 0..4 {\n        let contador = Arc::clone(&contador);\n        workers.push(std::thread::spawn(move || {\n            for _ in 0..veces {\n                *contador.lock().expect("mutex sano") += 1;\n            }\n        }));\n    }\n    for worker in workers { worker.join().expect("worker sano"); }\n    let total = *contador.lock().expect("mutex sano");\n    total\n}',
    tests: [test('Cuatro workers', 'contador_compartido(3) == 12', 'El total observado coincide con cuatro subtotales de tres.', 'Cada worker debe sumar tres veces sobre el mismo contador.'), test('Sin trabajo', 'contador_compartido(0) == 0', 'El resultado del caso sin trabajo es cero.', 'Inicializá el contador en cero.'), test('Más competencia', 'contador_compartido(50) == 200', 'El total observado también coincide para más iteraciones; no demuestra ausencia de carreras.', 'Esperá todos los joins y mantené la actualización dentro del lock.')],
    hints: ['Arc::clone comparte el mismo Mutex, no duplica el contador.', 'El guard de lock permite desreferenciar y modificar.', 'El guard temporal se libera al final de la sentencia; hacé joins antes del lock final.'],
    review: {success: 'Los totales son correctos para estos casos. La solución propuesta usa Arc para propiedad, Mutex para cada actualización y join antes de leer el total. Revisá ese diseño: los tests de resultado solos no prueban concurrencia ni ausencia de carreras.', pitfall: 'No hagas join mientras mantenés un lock que los workers necesitan: podrías bloquearlos mientras esperás que terminen.'},
    transfer: 'Compará con un diseño donde cada worker devuelve su subtotal y el thread principal suma los resultados.',
    prediction: predict('¿Arc<u32> alcanza para modificar el mismo contador desde varios threads?', ['Sí, Arc hace atómicas todas las operaciones', 'No: Arc comparte propiedad; necesitás sincronizar la mutación', 'Sí, si los números son chicos'], 1, 'Arc no agrega mutabilidad sincronizada al contenido. Mutex o tipos atómicos resuelven esa otra necesidad.'),
    sources: [src('Rust Book · Shared-state concurrency', 'https://doc.rust-lang.org/book/ch16-03-shared-state.html'), src('std · Mutex', 'https://doc.rust-lang.org/std/sync/struct.Mutex.html')]
  });

  add(10, {
    title: 'Boss: del texto a una orden tipada',
    intro: 'Un parser traduce texto externo a un modelo interno. Después de validar, las demás funciones pueden trabajar con variantes claras.',
    why: 'Separar representación y significado evita repetir split y comprobaciones de cantidad de campos en cada operación.',
    objective: 'Aceptá exactamente GET clave o SET clave valor. Los tokens no contienen espacios. Cualquier otra forma devuelve Err("orden").',
    instructions: ['Separá con split_whitespace y comprobá la cantidad exacta de tokens.', 'Devolvé variantes con Strings propios; comandos distinguen mayúsculas.'],
    starter: '#[derive(Debug, PartialEq)]\nenum Orden { Get(String), Set(String, String) }\nfn parsear(linea: &str) -> Result<Orden, &\'static str> {\n    todo!()\n}',
    solution: '#[derive(Debug, PartialEq)]\nenum Orden { Get(String), Set(String, String) }\nfn parsear(linea: &str) -> Result<Orden, &\'static str> {\n    let partes: Vec<&str> = linea.split_whitespace().collect();\n    match partes.as_slice() {\n        ["GET", clave] => Ok(Orden::Get((*clave).to_string())),\n        ["SET", clave, valor] => Ok(Orden::Set((*clave).to_string(), (*valor).to_string())),\n        _ => Err("orden"),\n    }\n}',
    tests: [test('Consulta normalizada', 'parsear("  GET\tusuario ") == Ok(Orden::Get(String::from("usuario")))', 'El parser tolera separadores variados.', 'El patrón debe tener exactamente dos tokens.'), test('Escritura tipada', 'parsear("SET color azul") == Ok(Orden::Set(String::from("color"), String::from("azul")))', 'La orden conserva clave y valor por separado.', 'Convertí ambos slices en Strings propios.'), test('Rechazo sin ambigüedad', 'parsear("GET x extra") == Err("orden") && parsear("SET x") == Err("orden") && parsear("get x") == Err("orden") && parsear("") == Err("orden")', 'Se rechazan campos extra, faltantes y comandos diferentes.', 'El comodín cubre toda forma no permitida, no descartes tokens sobrantes.')],
    hints: ['Un Vec<&str> puede verse como slice con as_slice().', 'Los patrones de slice pueden exigir longitud y literales.', 'Usá ["GET", clave] y ["SET", clave, valor], con _ => Err("orden").'],
    review: {success: 'El parser garantiza la forma antes de construir la orden. El resto del programa ya no necesita comprobar si SET recibió un valor.', pitfall: 'Aceptar campos extras silenciosamente escondería errores del cliente; el contrato exige aridad exacta.'},
    transfer: 'Agregá DEL clave con su propia variante y probá tanto aceptación como rechazo.',
    prediction: predict('¿Por qué devolver un enum después de parsear?', ['Para impedir todo error de ejecución imaginable', 'Para obligar a usar threads', 'Para representar solo formas de orden ya validadas'], 2, 'El enum traslada la validación estructural al tipo que consumirá el ejecutor.'),
    sources: [src('Rust Reference · Slice patterns', 'https://doc.rust-lang.org/reference/patterns.html#slice-patterns'), src('Rust Book · Enums', 'https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html')]
  });

  add(10, {
    title: 'Boss final: tu mini almacén en memoria',
    intro: 'Combiná un mapa, parsing y respuestas explícitas en un ejecutor determinista. Cada llamada procesa una sesión independiente.',
    why: 'Separar este núcleo de archivos y sockets permite probar sus reglas sin depender del entorno. Más adelante podés conectar el mismo comportamiento a una CLI o servidor.',
    objective: 'Procesá SET clave valor → "OK"; GET clave → valor o "NOT_FOUND". Formas inválidas → "ERROR" sin modificar datos. SET reemplaza el valor previo.',
    instructions: ['Creá un HashMap nuevo para cada llamada y procesá las líneas en orden.', 'Aceptá solo la cantidad exacta de tokens, con comandos en mayúsculas.', 'Devolvé una respuesta String por cada línea.'],
    starter: 'use std::collections::HashMap;\nfn sesion(lineas: &[&str]) -> Vec<String> {\n    todo!()\n}',
    solution: 'use std::collections::HashMap;\nfn sesion(lineas: &[&str]) -> Vec<String> {\n    let mut datos: HashMap<String, String> = HashMap::new();\n    let mut respuestas = Vec::new();\n    for linea in lineas {\n        let partes: Vec<&str> = linea.split_whitespace().collect();\n        let respuesta = match partes.as_slice() {\n            ["SET", clave, valor] => {\n                datos.insert((*clave).to_string(), (*valor).to_string());\n                String::from("OK")\n            }\n            ["GET", clave] => datos.get(*clave).cloned().unwrap_or_else(|| String::from("NOT_FOUND")),\n            _ => String::from("ERROR"),\n        };\n        respuestas.push(respuesta);\n    }\n    respuestas\n}',
    tests: [test('Guardar, leer y reemplazar', 'sesion(&["SET color rojo", "GET color", "SET color azul", "GET color"]) == vec!["OK", "rojo", "OK", "azul"]', 'El estado persiste entre órdenes de la misma sesión.', 'El mapa va fuera del for y SET reemplaza el valor anterior.'), test('Error sin efectos laterales', 'sesion(&["SET x uno", "SET x dos extra", "GET x", "GET ausente"]) == vec!["OK", "ERROR", "uno", "NOT_FOUND"]', 'Una orden inválida no modifica datos existentes.', 'Validá todos los tokens antes de insertar.'), test('Sesiones independientes', 'sesion(&[]).is_empty() && sesion(&["GET color", "", "get x"]) == vec!["NOT_FOUND", "ERROR", "ERROR"]', 'No hay estado global ni líneas sin respuesta.', 'Creá el mapa dentro de la función y respondé incluso a una línea inválida.')],
    hints: ['Necesitás un HashMap<String, String> y Vec<String>.', 'El match sobre el slice valida antes de ejecutar.', 'GET puede usar get(*clave).cloned().unwrap_or_else(|| String::from("NOT_FOUND")).'],
    review: {success: 'Construiste un núcleo con estado, validación y resultados deterministas. Las pruebas verifican secuencias completas y que los errores no alteren el almacén.', pitfall: 'Este protocolo didáctico no admite valores con espacios y sus textos de error podrían coincidir con un valor guardado. Una API robusta usaría respuestas tipadas y un formato sin ambigüedad.'},
    transfer: 'Agregá DEL y devolvé un enum Respuesta. Después separá parsear, ejecutar y formatear en funciones comprobables.',
    prediction: predict('¿Dónde debe crearse el mapa para conservar datos dentro de una sesión y aislar llamadas?', ['Dentro de cada vuelta del for', 'Dentro de sesion, antes del for', 'En una variable global mutable'], 1, 'Una instancia por llamada mantiene el estado durante sus órdenes y evita compartirlo accidentalmente con otras sesiones.'),
    sources: [src('std · HashMap', 'https://doc.rust-lang.org/std/collections/struct.HashMap.html'), src('Rust Reference · Slice patterns', 'https://doc.rust-lang.org/reference/patterns.html#slice-patterns')], visual: 'collections'
  });

  add(11, {
    title: 'Una lista que cabe gracias a Box', visual: 'pointers',
    intro: 'Box<T> tiene un único dueño y guarda un T en el heap. En un tipo recursivo, la indirección evita que el tamaño incluya otra copia completa de sí mismo indefinidamente.',
    why: 'El compilador necesita conocer el tamaño del enum. El campo Box tiene tamaño conocido aunque la lista representada pueda crecer.',
    objective: 'Contá los nodos de Lista sin consumirla. Fin tiene longitud cero.',
    instructions: ['Hacé match sobre la lista prestada.', 'En Nodo, sumá uno y recorré la cola Box por referencia.'],
    starter: 'enum Lista { Fin, Nodo(i32, Box<Lista>) }\nfn longitud_lista(lista: &Lista) -> usize {\n    todo!()\n}',
    solution: 'enum Lista { Fin, Nodo(i32, Box<Lista>) }\nfn longitud_lista(lista: &Lista) -> usize {\n    match lista {\n        Lista::Fin => 0,\n        Lista::Nodo(_, cola) => 1 + longitud_lista(cola),\n    }\n}',
    tests: [test('Sin nodos', 'longitud_lista(&Lista::Fin) == 0', 'La recursión tiene un caso base.', 'Fin no contiene ningún valor.'), test('Un nodo', 'longitud_lista(&Lista::Nodo(9, Box::new(Lista::Fin))) == 1', 'Box contiene la siguiente lista.', 'Sumá uno por Nodo, no por Box y Nodo separados.'), test('Préstamo reutilizable', '{ let l = Lista::Nodo(4, Box::new(Lista::Nodo(-1, Box::new(Lista::Fin)))); longitud_lista(&l) == 2 && longitud_lista(&l) == 2 }', 'El recorrido no consume la estructura.', 'Prestá la cola; no intentes moverla desde &Lista.')],
    hints: ['Los patrones sobre &Lista prestan los campos.', 'Rust puede convertir &Box<Lista> en &Lista mediante Deref.', 'Nodo(_, cola) => 1 + longitud_lista(cola).'],
    review: {success: 'La indirección hace finita la representación de cada nodo; el préstamo permite recorrer sin transferir propiedad.', pitfall: 'Box no vuelve infinita la pila de llamadas. Una lista enorme puede necesitar un recorrido iterativo; aquí las listas son pequeñas.'},
    transfer: 'Implementá suma_lista; después escribí el recorrido con while let para evitar recursión.',
    prediction: predict('¿Qué resuelve Box en este tipo recursivo?', ['Hace conocido el tamaño de la indirección', 'Clona toda la lista al leerla', 'Permite mutación simultánea sin reglas'], 0, 'El nodo contiene un puntero propietario de tamaño conocido en lugar de otra Lista completa embebida.'),
    sources: [src('Rust Book · Box and recursive types', 'https://doc.rust-lang.org/book/ch15-01-box.html')]
  });

  add(11, {
    title: 'Compartir propiedad no es clonar datos', visual: 'pointers',
    intro: 'Rc<T> permite varios dueños dentro de un thread. Rc::clone incrementa un contador; no clona el T interior.',
    why: 'Cuando varias estructuras necesitan mantener vivo el mismo recurso, un dueño único puede no representar la relación que querés modelar.',
    objective: 'Creá un Rc<String>, cloná su Rc una vez y devolvé (dueños_con_copia, mismo_recurso, dueños_tras_drop).',
    instructions: ['Usá Rc::strong_count y Rc::ptr_eq.', 'Destruí la segunda referencia propietaria con drop antes de la última medición.'],
    starter: 'use std::rc::Rc;\nfn observar_rc(texto: String) -> (usize, bool, usize) {\n    todo!()\n}',
    solution: 'use std::rc::Rc;\nfn observar_rc(texto: String) -> (usize, bool, usize) {\n    let original = Rc::new(texto);\n    let copia = Rc::clone(&original);\n    let durante = Rc::strong_count(&original);\n    let mismo = Rc::ptr_eq(&original, &copia);\n    drop(copia);\n    (durante, mismo, Rc::strong_count(&original))\n}',
    tests: [test('Texto compartido', 'observar_rc(String::from("cache")) == (2, true, 1)', 'La copia comparte el mismo recurso y suma un dueño.', 'Usá Rc::clone, no Rc::new sobre un String clonado.'), test('String vacío', 'observar_rc(String::new()) == (2, true, 1)', 'El conteo no depende del contenido.', 'Rc cuenta dueños de la asignación, no caracteres.'), test('Contenido mayor', 'observar_rc("datos".repeat(100)) == (2, true, 1)', 'Compartir no requiere duplicar el buffer interior.', 'ptr_eq comprueba identidad, no igualdad de texto.')],
    hints: ['Rc::new toma la propiedad del String.', 'Rc::clone(&original) produce otro dueño del mismo contenido.', 'Guardá las dos primeras observaciones antes de drop(copia).'],
    review: {success: 'El contador volvió de dos a uno al soltar un dueño. El contenido se liberará al desaparecer el último Rc fuerte.', pitfall: 'Rc no es Send ni Sync. Para compartir propiedad entre threads se usa Arc, junto con la sincronización que el contenido necesite.'},
    transfer: 'Compará Rc::ptr_eq entre dos Rc creados por separado con textos iguales.',
    prediction: predict('¿Rc::clone(&x) copia todos los bytes del String interior?', ['Sí', 'No: comparte la asignación e incrementa el conteo', 'Solo si el String es largo'], 1, 'Clonar Rc copia el handle propietario; String::clone tendría un comportamiento diferente.'),
    sources: [src('std · Rc', 'https://doc.rust-lang.org/std/rc/struct.Rc.html')]
  });

  add(11, {
    title: 'Un préstamo interior que puede rechazarse', visual: 'pointers',
    intro: 'RefCell comprueba los préstamos en ejecución. try_borrow_mut devuelve un error si existe un préstamo incompatible, en lugar de provocar panic.',
    why: 'La mutabilidad interior conserva las reglas de exclusividad, pero cambia dónde se verifican. Es útil cuando una API necesita mutar mediante &self en un solo thread.',
    objective: 'Intentá incrementar un RefCell<i32> en uno. Devolvé true si pudiste, false si estaba prestado. Los valores están entre -100 y 100.',
    instructions: ['Usá try_borrow_mut y tratá ambas variantes.', 'No modifiques el valor si el préstamo es rechazado.'],
    starter: 'use std::cell::RefCell;\nfn intentar_incrementar(celda: &RefCell<i32>) -> bool {\n    todo!()\n}',
    solution: 'use std::cell::RefCell;\nfn intentar_incrementar(celda: &RefCell<i32>) -> bool {\n    match celda.try_borrow_mut() {\n        Ok(mut valor) => { *valor += 1; true }\n        Err(_) => false,\n    }\n}',
    tests: [test('Préstamo disponible', '{ let c = RefCell::new(4); intentar_incrementar(&c) && *c.borrow() == 5 }', 'La mutación modifica el dato interior.', 'Desreferenciá el guard mutable para sumar.'), test('Lector activo', '{ let c = RefCell::new(8); let lectura = c.borrow(); let rechazo = !intentar_incrementar(&c); rechazo && *lectura == 8 }', 'Un lector activo impide escritura.', 'try_borrow_mut debe manejar Err sin panic.'), test('Volver a prestar', '{ let c = RefCell::new(0); { let _guard = c.borrow_mut(); assert!(!intentar_incrementar(&c)); } intentar_incrementar(&c) && *c.borrow() == 1 }', 'Soltar el guard restablece la posibilidad de préstamo.', 'El rechazo no debe envenenar ni consumir RefCell.')],
    hints: ['try_borrow_mut devuelve Result<RefMut<_>, _>.', 'Necesitás mut en la variable del guard para modificar lo apuntado.', 'Err(_) devuelve false; Ok(mut valor) incrementa y devuelve true.'],
    review: {success: 'Las reglas siguen existiendo: múltiples lectores o un escritor. La diferencia es que ahora el conflicto es observable durante la ejecución.', pitfall: 'RefCell no sincroniza threads. Mutabilidad interior no significa automáticamente acceso concurrente seguro.'},
    transfer: 'Integrá Rc<RefCell<i32>> para que dos dueños observen el mismo contador en un thread.',
    prediction: predict('¿RefCell permite mantener un préstamo mutable y otro de lectura simultáneamente?', ['Sí, elimina las reglas', 'No: verifica el conflicto en ejecución', 'Sí, si el número es Copy'], 1, 'RefCell aplica reglas de préstamo en ejecución; la variante try permite manejar el rechazo.'),
    sources: [src('std · RefCell::try_borrow_mut', 'https://doc.rust-lang.org/std/cell/struct.RefCell.html#method.try_borrow_mut')]
  });

  add(11, {
    title: 'Una referencia débil que no retiene al dueño', visual: 'pointers',
    intro: 'Weak observa una asignación contada sin mantener vivo su contenido. upgrade intenta obtener un Rc fuerte y devuelve Option.',
    why: 'En grafos, un enlace hacia el padre puede ser débil para evitar ciclos de propiedad que retengan objetos indefinidamente.',
    objective: 'Creá Rc y Weak de un texto. Devolvé si upgrade funciona antes y después de destruir el único Rc fuerte.',
    instructions: ['Usá Rc::downgrade para crear Weak.', 'No guardes el Rc temporal de upgrade hasta después de drop del dueño.'],
    starter: 'use std::rc::Rc;\nfn vida_debil(texto: String) -> (bool, bool) {\n    todo!()\n}',
    solution: 'use std::rc::Rc;\nfn vida_debil(texto: String) -> (bool, bool) {\n    let fuerte = Rc::new(texto);\n    let debil = Rc::downgrade(&fuerte);\n    let antes = debil.upgrade().is_some();\n    drop(fuerte);\n    let despues = debil.upgrade().is_some();\n    (antes, despues)\n}',
    tests: [test('Dueño que desaparece', 'vida_debil(String::from("padre")) == (true, false)', 'Weak no prolonga la vida del contenido.', 'Destruí el último Rc fuerte antes de la segunda observación.'), test('Contenido vacío', 'vida_debil(String::new()) == (true, false)', 'La propiedad no depende del contenido.', 'No confundas is_some con String no vacío.'), test('Datos Unicode', 'vida_debil(String::from("árbol")) == (true, false)', 'El modelo de propiedad es independiente de UTF-8.', 'Usá downgrade y upgrade, no referencias al String.')],
    hints: ['downgrade no incrementa el conteo fuerte.', 'is_some consume el Option temporal; no queda un dueño fuerte retenido.', 'Después de drop(fuerte), debil.upgrade() devuelve None.'],
    review: {success: 'El enlace débil sigue existiendo, pero ya no puede obtener un contenido destruido. Option obliga a contemplar esa posibilidad.', pitfall: 'Si conservás el Rc devuelto por el primer upgrade, ese Rc pasa a ser otro dueño y mantiene vivo el contenido.'},
    transfer: 'Modelá un nodo con hijos Rc y padre Weak; dibujá qué enlaces poseen el árbol.',
    prediction: predict('¿Un Weak garantiza que upgrade siempre dará Some?', ['Sí', 'Solo si contiene String', 'No: depende de que quede algún dueño fuerte'], 2, 'Weak representa un acceso potencial, no propiedad del contenido.'),
    sources: [src('std · Weak', 'https://doc.rust-lang.org/std/rc/struct.Weak.html')]
  });

  add(11, {
    title: 'Tu tipo también puede prestar como str', visual: 'pointers',
    intro: 'Deref define el tipo al que se puede acceder al desreferenciar un wrapper. También participa en ciertas coerciones entre referencias.',
    why: 'Un wrapper puede conservar su identidad y ofrecer una vista de lectura compatible con APIs existentes. La conversión no requiere copiar el texto.',
    objective: 'Implementá Deref<Target = str> para Texto, permitiendo pasar &Texto a una función que acepta &str.',
    instructions: ['deref debe devolver un préstamo del String interior.', 'Conservá la llamada medir_str(texto) para comprobar la coerción.'],
    starter: 'use std::ops::Deref;\nstruct Texto(String);\nimpl Deref for Texto {\n    type Target = str;\n    fn deref(&self) -> &str { todo!() }\n}\nfn medir_str(s: &str) -> usize { s.len() }\nfn medir_wrapper(texto: &Texto) -> usize { medir_str(texto) }',
    solution: 'use std::ops::Deref;\nstruct Texto(String);\nimpl Deref for Texto {\n    type Target = str;\n    fn deref(&self) -> &str { self.0.as_str() }\n}\nfn medir_str(s: &str) -> usize { s.len() }\nfn medir_wrapper(texto: &Texto) -> usize { medir_str(texto) }',
    tests: [test('Coerción de lectura', 'medir_wrapper(&Texto(String::from("rust"))) == 4', 'La API recibe una vista str del wrapper.', 'Prestá self.0 con as_str.'), test('Vacío', 'medir_wrapper(&Texto(String::new())) == 0', 'No se agrega contenido en la conversión.', 'Deref debe revelar el texto real.'), test('Acceso directo', '{ let t = Texto(String::from("ñ")); (&*t) == "ñ" && medir_wrapper(&t) == 2 }', 'Desreferenciar y coercionar observan el mismo dato.', 'No devolvás una referencia a un String temporal.')],
    hints: ['El tipo asociado Target indica str, no String.', 'La firma retorna una referencia ligada a &self.', 'Devolvé self.0.as_str().'],
    review: {success: 'La conversión presta el contenido existente. Target asocia a Texto un destino concreto para Deref.', pitfall: 'Deref es parte visible de la API del tipo; no lo uses como conversión arbitraria con costos o efectos sorprendentes.'},
    transfer: 'Compará esta API con implementar AsRef<str> y pedir una conversión explícita.',
    prediction: predict('¿La coerción &Texto → &str tiene que clonar el String?', ['No: puede prestar el contenido', 'Sí, para extender su vida', 'Solo cuando tiene Unicode'], 0, 'Deref devuelve una referencia al contenido; los lifetimes siguen limitados por el dueño.'),
    sources: [src('std · Deref', 'https://doc.rust-lang.org/std/ops/trait.Deref.html')]
  });

  add(12, {
    title: 'Distintos tipos en una misma colección', visual: 'generics',
    intro: 'dyn Trait permite invocar un comportamiento cuando el tipo concreto se conoce en ejecución. Box<dyn Tarifa> posee valores de tamaños concretos diferentes detrás de una interfaz común.',
    why: 'Los genéricos sirven cuando cada instancia tiene un tipo concreto conocido; un trait object permite una colección heterogénea. El despacho dinámico implica una indirección.',
    objective: 'Implementá costo para Fija y PorByte; total suma las tarifas de todos los objetos.',
    instructions: ['Fija(n) cuesta n; PorByte { bytes, precio } cuesta bytes × precio.', 'Conservá &[Box<dyn Tarifa>] en total. Los valores y la suma caben en u32.'],
    starter: 'trait Tarifa { fn costo(&self) -> u32; }\nstruct Fija(u32);\nstruct PorByte { bytes: u32, precio: u32 }\nimpl Tarifa for Fija { fn costo(&self) -> u32 { todo!() } }\nimpl Tarifa for PorByte { fn costo(&self) -> u32 { todo!() } }\nfn total(tarifas: &[Box<dyn Tarifa>]) -> u32 { todo!() }',
    solution: 'trait Tarifa { fn costo(&self) -> u32; }\nstruct Fija(u32);\nstruct PorByte { bytes: u32, precio: u32 }\nimpl Tarifa for Fija { fn costo(&self) -> u32 { self.0 } }\nimpl Tarifa for PorByte { fn costo(&self) -> u32 { self.bytes * self.precio } }\nfn total(tarifas: &[Box<dyn Tarifa>]) -> u32 {\n    tarifas.iter().map(|t| t.costo()).sum()\n}',
    tests: [test('Colección heterogénea', '{ let t: Vec<Box<dyn Tarifa>> = vec![Box::new(Fija(5)), Box::new(PorByte { bytes: 3, precio: 2 })]; total(&t) == 11 }', 'Un recorrido acepta tipos concretos diferentes.', 'Invocá el método de la interfaz, no campos concretos.'), test('Sin tarifas', 'total(&[]) == 0', 'La suma vacía mantiene su identidad.', 'sum puede devolver cero sin casos artificiales.'), test('Extensión de la interfaz', '{ struct Gratis; impl Tarifa for Gratis { fn costo(&self) -> u32 { 0 } } let t: Vec<Box<dyn Tarifa>> = vec![Box::new(Gratis), Box::new(Fija(7))]; total(&t) == 7 }', 'La función acepta un implementador nuevo.', 'No hagas match manual sobre tipos concretos.')],
    hints: ['Cada impl conoce los campos de su tipo.', 'El trait object solo garantiza costo().', 'El total puede usar map(|t| t.costo()).sum().'],
    review: {success: 'El mismo recorrido opera sobre tipos diferentes mediante su contrato común. Box aporta propiedad e indirección; dyn aporta despacho dinámico.', pitfall: 'No todos los traits son compatibles con dyn. Por ejemplo, métodos genéricos ordinarios requieren considerar esas restricciones.'},
    transfer: 'Escribí una versión genérica total_homogeneo<T: Tarifa> y compará qué colecciones admite.',
    prediction: predict('¿Un Vec<T> genérico ordinario puede mezclar cualquier tipo implementador de Tarifa sin un wrapper común?', ['Sí, T cambia en cada posición', 'No: cada Vec tiene un único tipo de elemento', 'Solo si ambos tipos tienen igual tamaño'], 1, 'El trait object proporciona el tipo común Box<dyn Tarifa> mientras conserva implementaciones distintas.'),
    sources: [src('Rust Book · Trait objects', 'https://doc.rust-lang.org/book/ch18-02-trait-objects.html'), src('Rust Reference · Dyn compatibility', 'https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility')]
  });

  add(12, {
    title: 'Un tipo asociado para cada fuente', visual: 'generics',
    intro: 'Un tipo asociado define una parte del contrato elegida por cada implementación. Fuente::Item indica qué dato entrega esa fuente.',
    why: 'La función consumidora puede devolver elementos del tipo correcto sin decidir si son números, Strings u otra estructura.',
    objective: 'leer_dos extrae hasta dos elementos de cualquier Fuente, deteniéndose ante None.',
    instructions: ['Implementá Fuente para una cola de Strings.', 'La función genérica debe devolver Vec<F::Item> sin Copy ni Clone.'],
    starter: 'use std::collections::VecDeque;\ntrait Fuente { type Item; fn siguiente(&mut self) -> Option<Self::Item>; }\nstruct Textos(VecDeque<String>);\nimpl Fuente for Textos {\n    type Item = String;\n    fn siguiente(&mut self) -> Option<String> { todo!() }\n}\nfn leer_dos<F: Fuente>(fuente: &mut F) -> Vec<F::Item> { todo!() }',
    solution: 'use std::collections::VecDeque;\ntrait Fuente { type Item; fn siguiente(&mut self) -> Option<Self::Item>; }\nstruct Textos(VecDeque<String>);\nimpl Fuente for Textos {\n    type Item = String;\n    fn siguiente(&mut self) -> Option<String> { self.0.pop_front() }\n}\nfn leer_dos<F: Fuente>(fuente: &mut F) -> Vec<F::Item> {\n    let mut salida = Vec::new();\n    for _ in 0..2 {\n        match fuente.siguiente() { Some(x) => salida.push(x), None => break }\n    }\n    salida\n}',
    tests: [test('Mover Strings', '{ let mut f = Textos(VecDeque::from([String::from("a"), String::from("b"), String::from("c")])); leer_dos(&mut f) == vec!["a", "b"] && f.siguiente() == Some(String::from("c")) }', 'El consumo se limita a dos valores propios.', 'No recolectes toda la fuente ni clones sus elementos.'), test('Fuente agotada', '{ let mut f = Textos(VecDeque::new()); leer_dos(&mut f).is_empty() }', 'None detiene la lectura.', 'La salida puede quedar vacía.'), test('Otro Item', '{ struct Uno(bool); impl Fuente for Uno { type Item = u8; fn siguiente(&mut self) -> Option<u8> { if self.0 { self.0 = false; Some(9) } else { None } } } leer_dos(&mut Uno(true)) == vec![9u8] }', 'La salida adopta el tipo asociado u8.', 'Referí el elemento como F::Item, no String fijo.')],
    hints: ['Textos delega en pop_front.', 'F::Item nombra el tipo seleccionado por el impl.', 'Un bucle de dos pasos con match conserva la generalidad.'],
    review: {success: 'El consumidor funciona con distintas fuentes y conserva el tipo de sus datos. El tipo asociado evita fijarlo dentro del algoritmo.', pitfall: 'Un tipo asociado no es una variable que cambie de tipo entre llamadas del mismo impl.'},
    transfer: 'Reescribí Fuente como Iterator y observá qué consumidores ya vienen implementados.',
    prediction: predict('Para un mismo impl Fuente for Textos, ¿puede Item ser String en una llamada y u32 en otra?', ['No: el impl fija su tipo asociado', 'Sí, si siguiente devuelve None antes', 'Sí, depende del contenido'], 0, 'La asociación forma parte del contrato estático de esa implementación.'),
    sources: [src('Rust Book · Associated types', 'https://doc.rust-lang.org/book/ch20-02-advanced-traits.html')]
  });

  add(12, {
    title: 'Dimensiones conocidas por el tipo', visual: 'generics',
    intro: 'Los const generics permiten parametrizar un tipo o función por una constante, como la longitud de un array.',
    why: 'La firma puede relacionar dimensiones sin guardar esos tamaños como decisiones libres en ejecución. Array y Vec ofrecen contratos distintos.',
    objective: 'Sumá cada fila de una matriz [[i32; C]; R] y devolvé [i32; R]. Los casos no desbordan i32.',
    instructions: ['Conservá los parámetros const R y C.', 'Soportá cero filas y filas con cero columnas.'],
    starter: 'fn sumar_filas<const R: usize, const C: usize>(matriz: [[i32; C]; R]) -> [i32; R] {\n    todo!()\n}',
    solution: 'fn sumar_filas<const R: usize, const C: usize>(matriz: [[i32; C]; R]) -> [i32; R] {\n    let mut salida = [0; R];\n    for (i, fila) in matriz.iter().enumerate() {\n        salida[i] = fila.iter().sum();\n    }\n    salida\n}',
    tests: [test('Dos por tres', 'sumar_filas([[1, 2, 3], [4, 0, -1]]) == [6, 3]', 'Cada fila tiene una salida propia.', 'No sumes toda la matriz en una única posición.'), test('Columnas vacías', 'sumar_filas::<2, 0>([[], []]) == [0, 0]', 'La suma de una fila vacía es cero.', 'El tipo sigue teniendo dos filas.'), test('Sin filas', 'sumar_filas::<0, 3>([]) == []', 'La salida conserva R incluso cuando es cero.', 'Inicializar [0; R] funciona para R = 0.')],
    hints: ['[0; R] construye el array de salida con longitud del tipo.', 'enumerate entrega el índice de cada fila.', 'Asigná fila.iter().sum() a salida[i].'],
    review: {success: 'La cantidad de resultados queda ligada a R en la firma. Los casos de dimensiones cero son valores válidos de esos tipos.', pitfall: 'Una longitud leída de un archivo no se convierte automáticamente en const generic; para tamaño dinámico suele corresponder Vec.'},
    transfer: 'Escribí transponer<const R, const C> con salida [[i32; R]; C].',
    prediction: predict('¿[i32; 3] y [i32; 4] son el mismo tipo?', ['Sí, solo difieren los datos', 'No: la longitud forma parte del tipo', 'Solo si ambos contienen ceros'], 1, 'Los arrays incluyen longitud en su tipo; los const generics permiten escribir una función para varias longitudes.'),
    sources: [src('Rust Reference · Const generics', 'https://doc.rust-lang.org/reference/items/generics.html#const-generics')]
  });

  add(12, {
    title: 'Una closure que cambia su memoria', visual: 'generics',
    intro: 'FnMut describe una closure que puede modificar sus capturas al llamarse. FnOnce permite consumir capturas; Fn exige poder llamar mediante acceso compartido.',
    why: 'Las restricciones de closures expresan cómo un algoritmo usará el comportamiento recibido, no solamente qué parámetros y retorno tiene.',
    objective: 'Aplicá f a cada elemento de un Vec<T>, moviendo cada valor y conservando el orden.',
    instructions: ['Aceptá F: FnMut(T) -> T.', 'La función debe servir para closures con contador interno y tipos que no son Copy.'],
    starter: 'fn transformar<T, F>(datos: Vec<T>, mut f: F) -> Vec<T>\nwhere F: FnMut(T) -> T {\n    todo!()\n}',
    solution: 'fn transformar<T, F>(datos: Vec<T>, mut f: F) -> Vec<T>\nwhere F: FnMut(T) -> T {\n    let mut salida = Vec::new();\n    for dato in datos { salida.push(f(dato)); }\n    salida\n}',
    tests: [test('Captura mutable', '{ let mut n = 0; let r = transformar(vec![10, 10, 10], |x| { n += 1; x + n }); r == vec![11, 12, 13] && n == 3 }', 'La closure puede conservar estado entre llamadas.', 'Fn sería una restricción demasiado fuerte para modificar n.'), test('Valores propios', 'transformar(vec![String::from("a"), String::from("b")], |mut s| { s.push(\'!\'); s }) == vec!["a!", "b!"]', 'Los elementos se mueven sin exigir Copy.', 'Iterar el Vec por valor permite entregar cada String.'), test('No llamar en vacío', '{ let mut n = 0; let r = transformar(Vec::<i32>::new(), |x| { n += 1; x }); r.is_empty() && n == 0 }', 'No se ejecutan efectos sin elementos.', 'Una llamada de prueba a f cambiaría el contrato.')],
    hints: ['El parámetro f necesita mut para invocarlo como FnMut.', 'Un for sobre datos mueve cada T.', 'salida.push(f(dato)) realiza una llamada por elemento.'],
    review: {success: 'El trait de la closure documenta que el algoritmo puede llamarla repetidamente y que ella puede mutar su estado.', pitfall: 'move en una closure controla cómo captura; no significa automáticamente que solo implemente FnOnce.'},
    transfer: 'Construí una closure move que solo lee un String capturado y razoná qué traits puede implementar.',
    prediction: predict('¿Toda closure escrita con move solo puede llamarse una vez?', ['Sí', 'No: depende de qué haga con las capturas al ejecutarse', 'Solo cuando captura números'], 1, 'Una closure puede poseer sus capturas y aun así leerlas repetidamente sin consumirlas.'),
    sources: [src('Rust Book · Closure traits', 'https://doc.rust-lang.org/book/ch13-01-closures.html')]
  });

  add(12, {
    title: 'Una API que acepta vistas sin exigir tamaño fijo', visual: 'generics',
    intro: 'AsRef<[u8]> ofrece una conversión prestada a bytes. ?Sized permite que T sea un tipo de tamaño dinámico como str o [u8].',
    why: 'Pedir una vista de bytes admite Strings, vectores y slices sin obligar a copiarlos a una representación única.',
    objective: 'Implementá bytes_de para cualquier T que pueda prestar &[u8], incluyendo tipos no Sized.',
    instructions: ['Conservá AsRef<[u8]> + ?Sized.', 'Devolvé el largo de la vista, sin alocar ni clonar.'],
    starter: 'fn bytes_de<T: AsRef<[u8]> + ?Sized>(dato: &T) -> usize {\n    todo!()\n}',
    solution: 'fn bytes_de<T: AsRef<[u8]> + ?Sized>(dato: &T) -> usize {\n    dato.as_ref().len()\n}',
    tests: [test('str no Sized', 'bytes_de::<str>("ñ") == 2', 'La API admite directamente str detrás de una referencia.', 'Mantené ?Sized; el parámetro es &T.'), test('Colección propia', 'bytes_de(&vec![1u8, 2, 3]) == 3 && bytes_de(&String::from("cpu")) == 3', 'Representaciones distintas ofrecen la misma vista.', 'Usá AsRef en vez de un método exclusivo de String.'), test('Slice vacío', 'bytes_de::<[u8]>(&[]) == 0', 'Un slice no Sized también cumple el contrato.', 'La longitud pertenece a la vista &[u8].')],
    hints: ['AsRef habilita dato.as_ref().', 'El retorno inferido de as_ref es &[u8] por el bound.', 'Terminá con .len().'],
    review: {success: 'La firma pide exactamente una vista de bytes. ?Sized relaja el bound Sized implícito en parámetros de tipo.', pitfall: '?Sized no permite pasar cualquier dato por valor sin tamaño conocido; aquí el acceso se realiza mediante &T.'},
    transfer: 'Usá la misma firma para calcular un checksum XOR de los bytes.',
    prediction: predict('¿Qué cambia ?Sized en este parámetro genérico?', ['Quita todas las comprobaciones del tipo', 'Relaja el requisito implícito de tamaño conocido para T', 'Hace que todo se guarde en el heap'], 1, 'La referencia sigue teniendo representación conocida aunque T pueda ser str o un slice.'),
    sources: [src('std · AsRef', 'https://doc.rust-lang.org/std/convert/trait.AsRef.html'), src('std · Sized', 'https://doc.rust-lang.org/std/marker/trait.Sized.html')]
  });

  add(13, {
    title: 'Campos privados, invariantes públicas',
    intro: 'Un módulo define una frontera de privacidad. Publicar un tipo no hace públicos automáticamente sus campos.',
    why: 'Si todos deben pasar por el constructor, podés garantizar reglas como que una capacidad nunca sea cero y cambiar la representación interior después.',
    objective: 'Completá Config::nueva y capacidad. Solo capacidades 1..=100 son válidas; el campo permanece privado.',
    instructions: ['Devolvé Option<Config> desde el constructor.', 'Usá la API pública desde capacidad_valida.'],
    starter: 'mod config {\n    pub struct Config { capacidad: usize }\n    impl Config {\n        pub fn nueva(n: usize) -> Option<Self> { todo!() }\n        pub fn capacidad(&self) -> usize { todo!() }\n    }\n}\nfn capacidad_valida(n: usize) -> Option<usize> {\n    config::Config::nueva(n).map(|c| c.capacidad())\n}',
    solution: 'mod config {\n    pub struct Config { capacidad: usize }\n    impl Config {\n        pub fn nueva(n: usize) -> Option<Self> {\n            if (1..=100).contains(&n) { Some(Self { capacidad: n }) } else { None }\n        }\n        pub fn capacidad(&self) -> usize { self.capacidad }\n    }\n}\nfn capacidad_valida(n: usize) -> Option<usize> {\n    config::Config::nueva(n).map(|c| c.capacidad())\n}',
    tests: [test('Valor interior válido', 'capacidad_valida(30) == Some(30)', 'El constructor conserva el dato validado.', 'Creá Self con capacidad n.'), test('Fronteras admitidas', 'capacidad_valida(1) == Some(1) && capacidad_valida(100) == Some(100)', 'El intervalo incluye ambos extremos.', 'Usá 1..=100.'), test('Fronteras rechazadas', 'capacidad_valida(0) == None && capacidad_valida(101) == None', 'No se construyen configuraciones inválidas.', 'Validá antes de construir.')],
    hints: ['pub struct no implica pub en capacidad.', 'Self representa Config dentro de impl.', 'El getter puede leer el campo porque pertenece a la implementación en el mismo módulo.'],
    review: {success: 'La API ofrece construcción validada y lectura. El llamador no necesita conocer cómo se almacena la capacidad.', pitfall: 'Estos tests prueban el comportamiento público; respetar la consigna de no publicar el campo requiere mirar la declaración.'},
    transfer: 'Mové config a src/config.rs en un proyecto Cargo y conservá la API.',
    prediction: predict('¿pub struct Config hace que capacidad sea pública?', ['Sí', 'No: cada campo tiene su propia visibilidad', 'Solo en el mismo crate'], 1, 'Un struct público puede ocultar sus campos para proteger invariantes.'),
    sources: [src('Rust Book · Paths and privacy', 'https://doc.rust-lang.org/book/ch07-03-paths-for-referring-to-an-item-in-the-module-tree.html')]
  });

  add(13, {
    title: 'Una fachada pública para el módulo interno', kind: 'reparar',
    intro: 'pub use reexporta un elemento con una ruta pública estable. La organización interna puede quedar oculta detrás de esa fachada.',
    why: 'Los usuarios de una biblioteca no deberían depender de cada directorio o módulo interno; una API pequeña reduce el acoplamiento.',
    objective: 'Hacé accesible protocolo::Estado manteniendo interno privado. estado_listo debe devolver la variante Listo.',
    instructions: ['Agregá una reexportación pub use dentro de protocolo.', 'No cambies la ruta usada por estado_listo ni hagas público interno.'],
    starter: 'mod protocolo {\n    mod interno {\n        #[derive(Debug, PartialEq)]\n        pub enum Estado { Listo, Cerrado }\n    }\n    // Reexportar Estado aquí.\n}\nfn estado_listo() -> protocolo::Estado { protocolo::Estado::Listo }',
    solution: 'mod protocolo {\n    mod interno {\n        #[derive(Debug, PartialEq)]\n        pub enum Estado { Listo, Cerrado }\n    }\n    pub use self::interno::Estado;\n}\nfn estado_listo() -> protocolo::Estado { protocolo::Estado::Listo }',
    tests: [test('Ruta pública', 'estado_listo() == protocolo::Estado::Listo', 'El tipo existe en la fachada solicitada.', 'Reexportá el enum desde protocolo.'), test('Variantes distintas', 'protocolo::Estado::Listo != protocolo::Estado::Cerrado', 'La fachada conserva el tipo original.', 'No declares otro enum paralelo con otras reglas.'), test('Consumidor del enum', '{ let e = protocolo::Estado::Cerrado; matches!(e, protocolo::Estado::Cerrado) }', 'Otros consumidores usan únicamente la ruta pública.', 'pub use conserva acceso a las variantes públicas del enum.')],
    hints: ['use trae un nombre al alcance; pub use además lo expone.', 'Desde protocolo, interno se referencia como self::interno.', 'Agregá pub use self::interno::Estado;.'],
    review: {success: 'La ruta protocolo::Estado queda desacoplada del módulo donde se define. Reexportar no crea un tipo distinto.', pitfall: 'El elemento reexportado debe tener visibilidad suficiente; pub use no permite publicar arbitrariamente un elemento privado.'},
    transfer: 'Separá los módulos en archivos usando mod y conservá la misma ruta de consumo.',
    prediction: predict('¿pub use crea una copia independiente del enum?', ['Sí, con otras variantes', 'Solo fuera del crate', 'No: ofrece otra ruta al mismo elemento'], 2, 'Una reexportación expone el elemento existente; no duplica su definición.'),
    sources: [src('Rust Book · Bringing paths into scope', 'https://doc.rust-lang.org/book/ch07-04-bringing-paths-into-scope-with-the-use-keyword.html')]
  });

  add(13, {
    title: 'Tu primera macro con repetición',
    intro: 'macro_rules! trabaja con estructura sintáctica antes de compilar el resultado. Una repetición puede aceptar una cantidad variable de expresiones.',
    why: 'Las macros sirven cuando la forma del código es variable, pero siguen produciendo Rust que debe pasar el chequeo de tipos.',
    objective: 'Implementá sumar! para cero o más expresiones i32, con coma final opcional. Cada expresión debe evaluarse exactamente una vez.',
    instructions: ['Usá el patrón ($($x:expr),* $(,)?).', 'Acumulá cada expresión una vez en un total i32. Los ejemplos no desbordan.'],
    starter: 'macro_rules! sumar {\n    ($($x:expr),* $(,)?) => {{\n        todo!("expandir cada expresión")\n    }};\n}',
    solution: 'macro_rules! sumar {\n    ($($x:expr),* $(,)?) => {{\n        let mut total: i32 = 0;\n        $(total += $x;)*\n        total\n    }};\n}',
    tests: [test('Expresiones y coma opcional', 'sumar!(1, 2 * 3, -2,) == 5', 'La macro acepta expresiones, no solo literales.', 'Usá expr como fragmento y acumulá cada uno.'), test('Sin argumentos', 'sumar!() == 0', 'La repetición * permite cero elementos.', 'Inicializá el acumulador en cero.'), test('Efecto una vez', '{ let mut n = 0; let r = sumar!({ n += 1; n }, { n += 1; n }); r == 3 && n == 2 }', 'La expansión no duplica evaluaciones.', 'Cada $x debe aparecer una única vez en el código evaluado.')],
    hints: ['$($x:expr),* captura una lista separada por comas.', '$(total += $x;)* repite una sentencia por expresión.', 'Las llaves dobles producen un bloque expresión con temporales locales.'],
    review: {success: 'La macro genera un bloque tipado y evalúa cada argumento una vez. Esa propiedad es esencial si el argumento tiene efectos.', pitfall: 'Una macro no es texto pegado sin reglas: sus fragmentos y el código expandido deben ser válidos.'},
    transfer: 'Compará con una función que acepte &[i32] y decidí cuándo realmente necesitás la macro.',
    prediction: predict('¿Una macro puede producir código que después falle por tipos incompatibles?', ['Sí: la expansión también se verifica', 'No: las macros evitan el type checker', 'Solo si no tiene signos !'], 0, 'La expansión sucede antes del chequeo del Rust generado.'),
    sources: [src('Rust Reference · Macros by example', 'https://doc.rust-lang.org/reference/macros-by-example.html')]
  });

  add(13, {
    title: 'Una prueba que encuentra la frontera olvidada', kind: 'reparar',
    intro: 'Las pruebas unitarias viven habitualmente en un módulo #[cfg(test)] y usan #[test]. Un buen caso observa una propiedad, como normalizar dos veces sin cambiar el resultado.',
    why: 'Un ejemplo feliz puede pasar aunque falte parte del contrato. Casos de borde y propiedades revelan errores que no dependen de un único valor.',
    objective: 'Normalizá quitando whitespace exterior y pasando a minúsculas. Conservá los espacios interiores.',
    instructions: ['Repará normalizar, cuyo starter olvida una parte.', 'Leé la prueba local incluida; el navegador ejecuta los tres casos del laboratorio, no cargo test.'],
    starter: 'fn normalizar(texto: &str) -> String {\n    texto.to_lowercase()\n}\n#[cfg(test)]\nmod tests {\n    use super::normalizar;\n    #[test]\n    fn conserva_interior() { assert_eq!(normalizar(" A  B "), "a  b"); }\n}',
    solution: 'fn normalizar(texto: &str) -> String {\n    texto.trim().to_lowercase()\n}\n#[cfg(test)]\nmod tests {\n    use super::normalizar;\n    #[test]\n    fn conserva_interior() { assert_eq!(normalizar(" A  B "), "a  b"); }\n}',
    tests: [test('Whitespace exterior', 'normalizar(" \tRuSt\n") == "rust"', 'Se aplican las dos partes del contrato.', 'trim debe ejecutarse antes o después de minúsculas.'), test('Espacios interiores', 'normalizar(" A  B ") == "a  b" && normalizar(" \n ") == ""', 'La limpieza no colapsa espacios interiores.', 'split_whitespace y join alterarían contenido que debe conservarse.'), test('Idempotencia', '{ let una = normalizar("  HOLA Mundo "); normalizar(&una) == una }', 'Aplicar la operación otra vez mantiene la forma normalizada.', 'La función no debe agregar prefijos, sufijos ni cambiar más datos cada vez.')],
    hints: ['to_lowercase ya resuelve una parte.', 'trim devuelve una vista sin whitespace exterior.', 'El cuerpo puede ser texto.trim().to_lowercase().'],
    review: {success: 'Los ejemplos distinguen limpieza exterior de interior y comprueban idempotencia. El módulo #[test] queda listo para ejecutarse con cargo test en un proyecto local.', pitfall: 'Un test aprobado no demuestra todos los casos posibles. Las pruebas de integración prueban la API pública; los doctests verifican ejemplos documentados con herramientas de Cargo.'},
    transfer: 'Creá un crate local con cargo new, mové esta función a src/lib.rs y ejecutá cargo test. El laboratorio no crea ese proyecto ni simula esa ejecución.',
    prediction: predict('¿Compilar normalmente un archivo ejecuta automáticamente sus funciones #[test]?', ['Sí', 'No: requieren el modo y runner de pruebas', 'Solo si no hay main'], 1, 'cargo test prepara y ejecuta el harness de pruebas; una compilación ordinaria no es lo mismo.'),
    sources: [src('Rust Book · Test organization', 'https://doc.rust-lang.org/book/ch11-03-test-organization.html'), src('Cargo · cargo test', 'https://doc.rust-lang.org/cargo/commands/cargo-test.html')]
  });

  add(13, {
    title: 'Convertir no significa aceptar cualquier valor',
    intro: 'TryFrom expresa una conversión que puede fallar; su tipo asociado Error comunica la causa. From queda para conversiones infalibles.',
    why: 'Un newtype validado permite que el resto de la aplicación reciba un Puerto correcto sin repetir controles en cada función.',
    objective: 'Implementá TryFrom<u16> para Puerto: cero da Err("cero"); otros valores construyen Puerto.',
    instructions: ['Declarar type Error es parte de la implementación.', 'El método numero devuelve el valor validado.'],
    starter: '#[derive(Debug, PartialEq)]\nstruct Puerto(u16);\nimpl TryFrom<u16> for Puerto {\n    type Error = &\'static str;\n    fn try_from(n: u16) -> Result<Self, Self::Error> { todo!() }\n}\nimpl Puerto { fn numero(&self) -> u16 { self.0 } }',
    solution: '#[derive(Debug, PartialEq)]\nstruct Puerto(u16);\nimpl TryFrom<u16> for Puerto {\n    type Error = &\'static str;\n    fn try_from(n: u16) -> Result<Self, Self::Error> {\n        if n == 0 { Err("cero") } else { Ok(Self(n)) }\n    }\n}\nimpl Puerto { fn numero(&self) -> u16 { self.0 } }',
    tests: [test('Conversión válida', 'Puerto::try_from(8080).map(|p| p.numero()) == Ok(8080)', 'La conversión conserva el valor permitido.', 'Creá Self(n) cuando n no es cero.'), test('Conversión rechazada', 'Puerto::try_from(0) == Err("cero")', 'El error se expresa como Result.', 'No reemplaces silenciosamente cero por otro puerto.'), test('Fronteras del tipo', 'Puerto::try_from(1).map(|p| p.numero()) == Ok(1) && Puerto::try_from(u16::MAX).map(|p| p.numero()) == Ok(65535)', 'No se agregan límites que el contrato no exige.', 'Todo u16 distinto de cero es aceptado.')],
    hints: ['TryFrom devuelve Result<Self, Self::Error>.', 'Una guarda puede rechazar n == 0.', 'Ok(Self(n)) construye el newtype validado.'],
    review: {success: 'La conversión es una operación comprobable del tipo y distingue fallos de valores válidos. Mover el tipo a un módulo con campo privado reforzaría la invariante para sus consumidores.', pitfall: 'Una conversión con as no llama automáticamente a TryFrom ni realiza esta validación de dominio.'},
    transfer: 'Empaquetá el tipo en una biblioteca con campo privado y documentá ejemplos. Para dependencias reales usá Cargo.toml y cargo add localmente; este laboratorio utiliza solo std.',
    prediction: predict('¿Por qué TryFrom corresponde mejor que From aquí?', ['Porque siempre es más rápido', 'Porque la conversión tiene una entrada rechazada', 'Porque u16 no puede moverse'], 1, 'From representa una conversión infalible; TryFrom devuelve Result cuando existe una condición de fallo.'),
    sources: [src('std · TryFrom', 'https://doc.rust-lang.org/std/convert/trait.TryFrom.html'), src('Cargo · Specifying dependencies', 'https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html')]
  });

  const futureKit = 'use std::future::Future;\nuse std::pin::Pin;\nuse std::sync::Arc;\nuse std::task::{Context, Poll, Wake, Waker};\nstruct Aviso;\nimpl Wake for Aviso { fn wake(self: Arc<Self>) {} }\nfn waker_didactico() -> Waker { Waker::from(Arc::new(Aviso)) }\n';

  add(14, {
    title: 'Preguntale a un Future si ya está listo', visual: 'concurrency',
    intro: 'Future representa un cálculo que puede avanzar al recibir poll. Poll::Ready entrega el resultado; Poll::Pending indica que todavía no lo tiene.',
    why: 'El protocolo permite esperar progreso sin bloquear necesariamente un thread por tarea. El executor y el mecanismo de despertar coordinan cuándo volver a consultar.',
    objective: 'Creá ready(n × 2), consultalo una vez y devolvé Some(resultado) si está Ready, o None si está Pending. n está entre -100 y 100.',
    instructions: ['Usá el Waker seguro provisto y Context::from_waker.', 'ready es Unpin: podés prestarlo con Pin::new.'],
    starter: futureKit + 'fn consultar_listo(n: i32) -> Option<i32> {\n    todo!()\n}',
    solution: futureKit + 'fn consultar_listo(n: i32) -> Option<i32> {\n    let mut futuro = std::future::ready(n * 2);\n    let waker = waker_didactico();\n    let mut contexto = Context::from_waker(&waker);\n    match Pin::new(&mut futuro).poll(&mut contexto) {\n        Poll::Ready(valor) => Some(valor),\n        Poll::Pending => None,\n    }\n}',
    tests: [test('Resultado disponible', 'consultar_listo(4) == Some(8)', 'ready entrega el valor en el primer poll.', 'No confundas construir el Future con obtener su salida.'), test('Cero listo', 'consultar_listo(0) == Some(0)', 'Cero no significa Pending.', 'La variante Poll determina disponibilidad, no el contenido.'), test('Valor negativo', 'consultar_listo(-3) == Some(-6)', 'El cálculo preserva el signo.', 'Envolvé el resultado de Ready en Some.')],
    hints: ['El futuro se crea con std::future::ready(n * 2).', 'Context toma prestado el Waker durante poll.', 'Hacé match sobre Pin::new(&mut futuro).poll(&mut contexto).'],
    review: {success: 'Los casos verifican el resultado de un Future ya listo. La solución propuesta muestra el protocolo de poll sin necesitar un runtime externo.', pitfall: 'Este Waker no agenda tareas: sirve solo para los polls explícitos y acotados del laboratorio. No es un executor general ni implementa I/O asíncrona.'},
    transfer: 'Leé Future::poll y describí qué debe hacer una implementación antes de devolver Pending.',
    prediction: predict('¿Qué diferencia Some(0) de None en esta API didáctica?', ['Ninguna', 'Uno indica resultado listo; el otro Pending', 'Some(0) implica un error'], 1, 'Disponibilidad y contenido son dimensiones distintas, igual que las variantes de Poll.'),
    sources: [src('std · Future::poll', 'https://doc.rust-lang.org/std/future/trait.Future.html'), src('std · Wake', 'https://doc.rust-lang.org/std/task/trait.Wake.html')]
  });

  add(14, {
    title: 'Async se pone en marcha al avanzar', visual: 'concurrency',
    intro: 'Un bloque async construye un Future; su cuerpo no corre por el simple hecho de crearlo. .await compone el avance de otro Future.',
    why: 'Entender esa pereza evita esperar efectos que nunca ocurrieron porque nadie ejecutó el futuro. Async tampoco significa crear automáticamente otro thread.',
    objective: 'Construí un bloque async que incremente visitas una vez, espere ready(n), y devuelva n × 3. Observá visitas antes y después de un poll.',
    instructions: ['Completá solo el bloque async señalado.', 'Conservá las observaciones y el Box::pin; n está entre -100 y 100.'],
    starter: futureKit + 'fn observar_async(n: i32) -> (usize, Option<i32>, usize) {\n    let visitas = std::cell::Cell::new(0usize);\n    let futuro = async { todo!("incrementar, await y calcular") };\n    let antes = visitas.get();\n    let mut futuro = Box::pin(futuro);\n    let waker = waker_didactico();\n    let mut cx = Context::from_waker(&waker);\n    let valor = match futuro.as_mut().poll(&mut cx) { Poll::Ready(x) => Some(x), Poll::Pending => None };\n    (antes, valor, visitas.get())\n}',
    solution: futureKit + 'fn observar_async(n: i32) -> (usize, Option<i32>, usize) {\n    let visitas = std::cell::Cell::new(0usize);\n    let futuro = async {\n        visitas.set(visitas.get() + 1);\n        let valor = std::future::ready(n).await;\n        valor * 3\n    };\n    let antes = visitas.get();\n    let mut futuro = Box::pin(futuro);\n    let waker = waker_didactico();\n    let mut cx = Context::from_waker(&waker);\n    let valor = match futuro.as_mut().poll(&mut cx) { Poll::Ready(x) => Some(x), Poll::Pending => None };\n    (antes, valor, visitas.get())\n}',
    tests: [test('Efecto diferido', 'observar_async(5) == (0, Some(15), 1)', 'El cuerpo ocurre durante poll y no al crear el futuro.', 'El incremento debe estar dentro del bloque async.'), test('Resultado cero', 'observar_async(0) == (0, Some(0), 1)', 'El efecto sucede incluso si el resultado es cero.', 'No condicionales el incremento al argumento.'), test('Resultado negativo', 'observar_async(-2) == (0, Some(-6), 1)', 'El future aplica una transformación consistente.', 'Esperá ready(n), no ready de un valor fijo.')],
    hints: ['Cell::set permite contar con una referencia compartida local.', 'let valor = std::future::ready(n).await; obtiene el i32.', 'Dejá valor * 3 como última expresión del bloque.'],
    review: {success: 'Las observaciones separan creación y avance del cálculo. En la implementación propuesta todo ocurre en el thread que hace poll.', pitfall: 'Un await sobre ready puede terminar sin suspenderse. No todo await obliga a ceder ejecución ni a cambiar de thread.'},
    transfer: 'En un proyecto local, contrastá un Future listo con un temporizador de un runtime. Agregar dependencias y ejecutar ese runtime queda fuera de este laboratorio std.',
    prediction: predict('¿Crear un bloque async ejecuta inmediatamente su cuerpo en otro thread?', ['Sí', 'Solo si tiene await', 'No: construye un Future que debe avanzar'], 2, 'Async describe una computación suspendible; su ejecución depende de quién la consulte o espere.'),
    sources: [src('Rust Reference · Async blocks', 'https://doc.rust-lang.org/reference/expressions/block-expr.html#async-blocks'), src('std · future::ready', 'https://doc.rust-lang.org/std/future/fn.ready.html')]
  });

  add(14, {
    title: 'Pending no significa volver a empezar', visual: 'concurrency',
    intro: 'Un Future puede guardar estado entre polls. Antes de devolver Pending, debe preparar un aviso cuando pueda progresar; aquí pedimos explícitamente otra consulta.',
    why: 'El estado persistente permite continuar el cálculo sin repetir todo el trabajo. El Waker comunica posibilidad de progreso al executor.',
    objective: 'DosPasos devuelve Pending la primera vez y Ready(valor) la segunda. Guardá que ya fue visitado y llamá wake_by_ref antes del Pending.',
    instructions: ['Completá poll usando el campo visitado.', 'Este tipo es Unpin: podés acceder a sus campos mediante el Pin<&mut Self>.'],
    starter: futureKit + 'struct DosPasos { visitado: bool, valor: i32 }\nimpl Future for DosPasos {\n    type Output = i32;\n    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<\'_>) -> Poll<i32> {\n        todo!()\n    }\n}\nfn dos_polls(valor: i32) -> (bool, Option<i32>) {\n    let mut f = Box::pin(DosPasos { visitado: false, valor });\n    let w = waker_didactico();\n    let mut cx = Context::from_waker(&w);\n    let pendiente = matches!(f.as_mut().poll(&mut cx), Poll::Pending);\n    let salida = match f.as_mut().poll(&mut cx) { Poll::Ready(x) => Some(x), Poll::Pending => None };\n    (pendiente, salida)\n}',
    solution: futureKit + 'struct DosPasos { visitado: bool, valor: i32 }\nimpl Future for DosPasos {\n    type Output = i32;\n    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<\'_>) -> Poll<i32> {\n        if self.visitado { return Poll::Ready(self.valor); }\n        self.visitado = true;\n        cx.waker().wake_by_ref();\n        Poll::Pending\n    }\n}\nfn dos_polls(valor: i32) -> (bool, Option<i32>) {\n    let mut f = Box::pin(DosPasos { visitado: false, valor });\n    let w = waker_didactico();\n    let mut cx = Context::from_waker(&w);\n    let pendiente = matches!(f.as_mut().poll(&mut cx), Poll::Pending);\n    let salida = match f.as_mut().poll(&mut cx) { Poll::Ready(x) => Some(x), Poll::Pending => None };\n    (pendiente, salida)\n}',
    tests: [test('Dos estados diferentes', 'dos_polls(9) == (true, Some(9))', 'El primer poll suspende y el siguiente termina.', 'Guardá visitado antes de devolver Pending.'), test('Contenido cero', 'dos_polls(0) == (true, Some(0))', 'Disponibilidad no depende de un valor centinela.', 'Usá visitado para el estado, no valor == 0.'), test('Contenido negativo', 'dos_polls(-7) == (true, Some(-7))', 'El estado de avance no altera el resultado.', 'El segundo poll devuelve self.valor intacto.')],
    hints: ['Si visitado ya es true, devolvé Ready.', 'La primera llamada cambia visitado a true.', 'Llamá cx.waker().wake_by_ref() y después devolvé Pending.'],
    review: {success: 'Los tests observan el cambio entre dos polls. La solución propuesta también pide otro turno mediante el Waker; esa notificación debe revisarse en el código, porque el harness consulta dos veces explícitamente.', pitfall: 'Este ejercicio no implementa planificación real. Tampoco debés asumir que todos los Futures permiten volver a hacer poll después de Ready.'},
    transfer: 'Reemplazá el Waker didáctico por uno que cuente notificaciones y comprobá que el primer poll avise una vez.',
    prediction: predict('¿Pending significa que el Future perdió sus campos internos?', ['No: conserva estado para próximos polls', 'Sí: se reconstruye desde cero', 'Solo conserva el tipo'], 0, 'El mismo Future permanece vivo y puede recordar dónde quedó.'),
    sources: [src('std · Future contract', 'https://doc.rust-lang.org/std/future/trait.Future.html'), src('std · Waker', 'https://doc.rust-lang.org/std/task/struct.Waker.html')]
  });

  add(14, {
    title: 'Mover el handle de Pin conserva la asignación', visual: 'pointers',
    intro: 'Pin expresa una garantía sobre mover el valor apuntado, no una prohibición universal de mover el puntero que lo contiene. Unpin permite al tipo no depender de esa garantía.',
    why: 'Algunos Futures guardan referencias internas a su propio estado. Preservar la ubicación del valor ayuda a que esas relaciones sigan siendo válidas.',
    objective: 'Fijá un dato !Unpin con Box::pin, medí su dirección, mové el handle y comprobá que la dirección y el valor sigan iguales.',
    instructions: ['Usá PhantomPinned en el tipo provisto.', 'Completá inspeccionar_pin sin unsafe, sin extraer el valor y sin desreferenciar raw pointers.'],
    starter: 'use std::marker::PhantomPinned;\nstruct Fijo { valor: i32, _pin: PhantomPinned }\nfn inspeccionar_pin(valor: i32) -> (bool, i32) {\n    todo!()\n}',
    solution: 'use std::marker::PhantomPinned;\nstruct Fijo { valor: i32, _pin: PhantomPinned }\nfn inspeccionar_pin(valor: i32) -> (bool, i32) {\n    let original = Box::pin(Fijo { valor, _pin: PhantomPinned });\n    let antes: *const Fijo = original.as_ref().get_ref();\n    let movido = original;\n    let despues: *const Fijo = movido.as_ref().get_ref();\n    (antes == despues, movido.as_ref().get_ref().valor)\n}',
    tests: [test('Handle transferido', 'inspeccionar_pin(4) == (true, 4)', 'Mover el dueño del handle no desplaza el dato asignado.', 'Mové original al binding movido sin recrear la asignación.'), test('Dato cero', 'inspeccionar_pin(0) == (true, 0)', 'El contenido no influye en la identidad de dirección.', 'No compares el valor como sustituto de comparar direcciones.'), test('Dato negativo', 'inspeccionar_pin(-8) == (true, -8)', 'El préstamo de lectura conserva el dato.', 'get_ref permite observar sin sacar el valor del Pin.')],
    hints: ['as_ref().get_ref() entrega &Fijo.', 'Convertir &Fijo a *const Fijo y comparar direcciones es seguro.', 'let movido = original transfiere el handle, no mueve el Fijo del heap.'],
    review: {success: 'Las observaciones ilustran estabilidad de dirección al mover el handle de Box::pin. PhantomPinned hace que Fijo no implemente Unpin automáticamente.', pitfall: 'Un test de direcciones no demuestra por sí solo todas las invariantes de Pin. La seguridad proviene del contrato y de usar sus APIs seguras; no agregues get_unchecked_mut por conveniencia.'},
    transfer: 'Quitá PhantomPinned en una copia del ejemplo y estudiá qué APIs de acceso mutable habilita Unpin.',
    prediction: predict('¿Mover Pin<Box<Fijo>> a otra variable mueve necesariamente el Fijo del heap?', ['Sí', 'No: se mueve el handle propietario', 'Solo cuando valor es negativo'], 1, 'Box mantiene su asignación; cambiar el dueño del handle no relocaliza el contenido.'),
    sources: [src('std · Pin', 'https://doc.rust-lang.org/std/pin/index.html'), src('std · PhantomPinned', 'https://doc.rust-lang.org/std/marker/struct.PhantomPinned.html')]
  });

  add(14, {
    title: 'Send y Sync tienen trabajos diferentes', visual: 'concurrency',
    intro: 'Send permite transferir un valor entre threads. Sync significa que compartir &T entre threads es seguro; se relaciona con &T: Send.',
    why: 'Estos auto traits llevan las reglas de seguridad de tipos al límite entre threads. Arc comparte propiedad, pero no vuelve sincronizado a cualquier contenido.',
    objective: 'Completá eco_en_thread para transferir y devolver cualquier T: Send + \'static, usando spawn y join.',
    instructions: ['Mové el valor al thread y devolvelo desde la closure.', 'Conservá los bounds y observá las verificaciones de Send y Sync en los casos.'],
    starter: 'fn eco_en_thread<T: Send + \'static>(valor: T) -> T {\n    todo!()\n}\nfn requiere_sync<T: Sync>() {}',
    solution: 'fn eco_en_thread<T: Send + \'static>(valor: T) -> T {\n    std::thread::spawn(move || valor).join().expect("el eco no debería fallar")\n}\nfn requiere_sync<T: Sync>() {}',
    tests: [test('String propio', 'eco_en_thread(String::from("mensaje")) == "mensaje"', 'Un recurso propio Send puede transferirse.', 'Usá move para transferir la captura.'), test('Send sin ser Sync', 'eco_en_thread(std::cell::Cell::new(7)).get() == 7', 'Cell<i32> puede moverse entre threads aunque no se comparta como &Cell.', 'No agregues T: Sync si el algoritmo solo necesita transferirlo.'), test('Compartido sincronizado', '{ requiere_sync::<std::sync::Arc<std::sync::Mutex<u32>>>(); let a = std::sync::Arc::new(std::sync::Mutex::new(3)); let b = eco_en_thread(std::sync::Arc::clone(&a)); std::sync::Arc::ptr_eq(&a, &b) && *b.lock().unwrap() == 3 }', 'El compilador acepta compartir Arc<Mutex<u32>>.', 'El bound Sync se verifica al compilar la llamada genérica.')],
    hints: ['La closure puede ser move || valor.', 'join devuelve Result<T, _>.', 'Send alcanza para la transferencia; Sync no es un requisito de este algoritmo.'],
    review: {success: 'Los casos incluyen Cell, que diferencia transferencia de acceso compartido. La solución propuesta transfiere el valor con spawn; los resultados no prueban por sí solos que tu implementación haya creado un thread.', pitfall: '\'static aquí prohíbe depender de préstamos más cortos en el valor transferido; no significa que un String propio tenga que vivir para siempre. Los threads con scope permiten otros contratos.'},
    transfer: 'Intentá pasar Rc<String> en una copia local y leé el error Send. No implementes unsafe Send manualmente para silenciarlo.',
    prediction: predict('¿Que T sea Send garantiza automáticamente que T sea Sync?', ['Sí', 'No: transferir propiedad y compartir referencias son capacidades distintas', 'Solo cuando T está en el heap'], 1, 'Cell<i32> muestra la diferencia: puede transferirse, pero no ofrece acceso compartido sincronizado.'),
    sources: [src('Rust Book · Send and Sync', 'https://doc.rust-lang.org/book/ch16-04-extensible-concurrency-sync-and-send.html'), src('std · thread::spawn', 'https://doc.rust-lang.org/std/thread/fn.spawn.html')]
  });

  add(15, {
    title: 'RAII: liberar es parte del alcance', visual: 'pointers',
    intro: 'Drop permite ejecutar limpieza al destruir un valor. RAII conecta la vida del recurso con la vida de su dueño, incluso al salir de un bloque.',
    why: 'Archivos, locks y buffers pueden liberar recursos automáticamente. Un registro en memoria permite observar ese orden sin abrir archivos reales.',
    objective: 'Registrá el id de cada Recurso en Drop. cerrar crea a y después b; si temprano es true, destruye a explícitamente antes de salir del bloque.',
    instructions: ['Completá Drop y la destrucción opcional.', 'Devolvé el registro después de que ambos recursos hayan salido del alcance.'],
    starter: 'use std::rc::Rc;\nuse std::cell::RefCell;\nstruct Recurso { id: u8, registro: Rc<RefCell<Vec<u8>>> }\nimpl Drop for Recurso {\n    fn drop(&mut self) { todo!() }\n}\nfn cerrar(a: u8, b: u8, temprano: bool) -> Vec<u8> {\n    let registro = Rc::new(RefCell::new(Vec::new()));\n    {\n        let primero = Recurso { id: a, registro: Rc::clone(&registro) };\n        let _segundo = Recurso { id: b, registro: Rc::clone(&registro) };\n        if temprano { todo!("liberar primero") }\n    }\n    let salida = registro.borrow().clone();\n    salida\n}',
    solution: 'use std::rc::Rc;\nuse std::cell::RefCell;\nstruct Recurso { id: u8, registro: Rc<RefCell<Vec<u8>>> }\nimpl Drop for Recurso {\n    fn drop(&mut self) { self.registro.borrow_mut().push(self.id); }\n}\nfn cerrar(a: u8, b: u8, temprano: bool) -> Vec<u8> {\n    let registro = Rc::new(RefCell::new(Vec::new()));\n    {\n        let primero = Recurso { id: a, registro: Rc::clone(&registro) };\n        let _segundo = Recurso { id: b, registro: Rc::clone(&registro) };\n        if temprano { drop(primero); }\n    }\n    let salida = registro.borrow().clone();\n    salida\n}',
    tests: [test('Fin de alcance', 'cerrar(1, 2, false) == vec![2, 1]', 'Los bindings locales se destruyen en orden inverso.', 'El Drop registra id; no agregues registros manuales al salir.'), test('Liberación temprana', 'cerrar(1, 2, true) == vec![1, 2]', 'drop permite terminar la vida del recurso antes del bloque.', 'Usá std::mem::drop mediante drop(primero), no el método Drop::drop.'), test('Una destrucción por recurso', 'cerrar(9, 9, true) == vec![9, 9]', 'Incluso ids iguales representan dos recursos distintos.', 'El valor movido a drop no debe liberarse otra vez manualmente.')],
    hints: ['Drop recibe &mut self para limpiar el valor.', 'El registro se modifica con borrow_mut().push(self.id).', 'drop(primero) consume el recurso; el compilador gestiona su estado de movimiento.'],
    review: {success: 'El registro observa limpieza al terminar el alcance y una liberación adelantada. El recurso pasado a drop ya no puede seguir usándose.', pitfall: 'No prometas Drop ante abortos del proceso, std::mem::forget o ciclos de Rc. Los destructores tampoco deben usarse como sustituto de confirmar escrituras críticas explícitamente.'},
    transfer: 'Relacioná este patrón con MutexGuard: explicar por qué soltar el guard libera el lock.',
    prediction: predict('¿Cómo pedís una destrucción anticipada segura?', ['Llamando recurso.drop() directamente', 'Pasando el valor a drop(recurso)', 'Borrando su dirección de memoria'], 1, 'La función drop consume el valor y activa su destrucción; invocar directamente Drop::drop está prohibido.'),
    sources: [src('Rust Book · Drop', 'https://doc.rust-lang.org/book/ch15-03-drop.html'), src('Rust Reference · Destructors', 'https://doc.rust-lang.org/reference/destructors.html')]
  });

  add(15, {
    title: 'Un bloque unsafe con una justificación pequeña', visual: 'pointers',
    intro: 'Crear o comparar raw pointers puede ser seguro; desreferenciarlos exige unsafe. Quien escribe ese bloque debe garantizar validez, alineación y reglas de acceso.',
    why: 'Unsafe delimita obligaciones que el compilador no verifica automáticamente. Mantener la frontera pequeña permite revisar el argumento de seguridad.',
    objective: 'Devolvé el segundo u32 de un slice mediante as_ptr y add(1), o None si faltan elementos. Conservá una API pública segura.',
    instructions: ['Validá len antes de calcular y leer el segundo elemento.', 'Incluí un comentario SAFETY que explique por qué el puntero es válido. No uses direcciones inventadas.'],
    starter: 'fn segundo_crudo(datos: &[u32]) -> Option<u32> {\n    todo!()\n}',
    solution: 'fn segundo_crudo(datos: &[u32]) -> Option<u32> {\n    if datos.len() < 2 { return None; }\n    let puntero = datos.as_ptr();\n    // SAFETY: len >= 2 garantiza el índice 1; el slice mantiene\n    // datos vivos, inicializados y alineados durante esta lectura compartida.\n    Some(unsafe { *puntero.add(1) })\n}',
    tests: [test('Lectura válida', 'segundo_crudo(&[10, 20, 30]) == Some(20)', 'Se consulta la posición uno del slice.', 'add(1) avanza un elemento u32, no un byte.'), test('Sin segundo elemento', 'segundo_crudo(&[]) == None && segundo_crudo(&[8]) == None', 'La validación precede a cualquier lectura.', 'Salir antes del bloque unsafe evita acceder fuera del slice.'), test('Vista parcial', '{ let a = [99, 4, u32::MAX, 88]; segundo_crudo(&a[1..3]) == Some(u32::MAX) }', 'La dirección base corresponde al slice recibido.', 'No supongas el inicio de la asignación original.')],
    hints: ['El caso len < 2 devuelve None antes de construir la lectura.', 'as_ptr da un *const u32 ligado a datos válidos mientras viva el préstamo.', 'El bloque unsafe contiene únicamente *puntero.add(1).'],
    review: {success: 'Los casos verifican resultados y fronteras observables. La seguridad del bloque requiere además revisar el argumento SAFETY: pasar tests no prueba ausencia de comportamiento indefinido.', pitfall: 'La versión normal de esta operación sería datos.get(1).copied(), completamente segura y más simple. Unsafe no desactiva el resto de reglas de Rust ni aporta rendimiento por sí solo.'},
    transfer: 'Compará con get(1).copied(). En un proyecto local podés usar Miri para detectar ciertas infracciones; este laboratorio no ejecuta Miri ni demuestra seguridad completa.',
    prediction: predict('¿Un bloque unsafe hace que cualquier dirección de memoria sea válida?', ['No: las obligaciones de validez siguen vigentes', 'Sí, evita todas las verificaciones', 'Solo en modo release'], 0, 'Unsafe permite operaciones específicas y traslada obligaciones al programador; violarlas sigue siendo comportamiento indefinido.'),
    sources: [src('Rust Book · Unsafe Rust', 'https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html'), src('std · pointer::add safety', 'https://doc.rust-lang.org/std/primitive.pointer.html#method.add')]
  });

  add(15, {
    title: 'Cow: copiá solo cuando cambie el texto', visual: 'memory',
    intro: 'Cow combina una vista prestada y un valor propio. La variante permite evitar una copia cuando el dato original ya sirve.',
    why: 'Hacer visible si una transformación aloca ayuda a elegir costos según el caso común, sin sacrificar una API cómoda de lectura.',
    objective: 'Convertí solo las letras ASCII A–Z a minúsculas. Si no hay ninguna, devolvé Cow::Borrowed; si hay cambios, Cow::Owned.',
    instructions: ['Detectá mayúsculas ASCII antes de construir un String.', 'El resto de Unicode queda intacto; no implementamos case folding universal.'],
    starter: 'use std::borrow::Cow;\nfn minusculas_ascii(texto: &str) -> Cow<\'_, str> {\n    todo!()\n}',
    solution: 'use std::borrow::Cow;\nfn minusculas_ascii(texto: &str) -> Cow<\'_, str> {\n    if texto.bytes().any(|b| b.is_ascii_uppercase()) {\n        Cow::Owned(texto.to_ascii_lowercase())\n    } else {\n        Cow::Borrowed(texto)\n    }\n}',
    tests: [test('Sin copia necesaria', 'matches!(minusculas_ascii("rust"), Cow::Borrowed("rust"))', 'La representación conserva un préstamo si no cambia nada.', 'No llames to_string incondicionalmente.'), test('Cambio con dueño propio', 'matches!(minusculas_ascii("RuSt"), Cow::Owned(ref s) if s == "rust")', 'El contenido modificado vive en un String propio.', 'to_ascii_lowercase construye la salida modificada.'), test('Contrato ASCII y vacío', 'matches!(minusculas_ascii("É"), Cow::Borrowed("É")) && matches!(minusculas_ascii(""), Cow::Borrowed(""))', 'No se introduce normalización Unicode fuera del contrato.', 'Detectá A–Z con is_ascii_uppercase, no toda mayúscula Unicode.')],
    hints: ['bytes().any(...) puede detectar A–Z sin alocar.', 'Cow::Borrowed recibe &str.', 'Cow::Owned recibe el String de to_ascii_lowercase().'],
    review: {success: 'Los tests comprueban tanto contenido como variante, por lo que distinguen conservar un préstamo de construir un dueño nuevo.', pitfall: 'Cow no es siempre más rápido: la ventaja depende de cuántas entradas evitan la copia y de los costos del chequeo previo.'},
    transfer: 'Medí en un proyecto local entradas que cambian y que no cambian, con distribución realista. Este laboratorio no presenta sus tiempos de red como benchmarks de Rust.',
    prediction: predict('¿Cow::Borrowed conserva el texto después de destruir su dueño original?', ['Sí, lo clona automáticamente al destruirlo', 'No: sigue sujeto al lifetime del préstamo', 'Solo si el texto es ASCII'], 1, 'La variante prestada depende del dueño; convertir a owned explícitamente cambia esa relación.'),
    sources: [src('std · Cow', 'https://doc.rust-lang.org/std/borrow/enum.Cow.html'), src('Cargo · Build profiles', 'https://doc.rust-lang.org/cargo/reference/profiles.html')]
  });

  add(15, {
    title: 'Overflow con una política explícita',
    intro: 'checked_add, saturating_add y wrapping_add representan tres decisiones distintas: fallar, limitar al máximo o continuar módulo el rango.',
    why: 'La aritmética de un contador circular no tiene la misma política que el tamaño de un buffer. Nombrar la operación evita depender implícitamente del perfil de compilación.',
    objective: 'Para a y b u8, devolvé (resultado_checked, resultado_saturating, resultado_wrapping).',
    instructions: ['Usá los tres métodos correspondientes de u8.', 'La misma función debe definir el comportamiento con y sin overflow.'],
    starter: 'fn sumar_politicas(a: u8, b: u8) -> (Option<u8>, u8, u8) {\n    todo!()\n}',
    solution: 'fn sumar_politicas(a: u8, b: u8) -> (Option<u8>, u8, u8) {\n    (a.checked_add(b), a.saturating_add(b), a.wrapping_add(b))\n}',
    tests: [test('Sin overflow', 'sumar_politicas(10, 20) == (Some(30), 30, 30)', 'Las tres políticas coinciden cuando el resultado cabe.', 'Aplicá la misma suma a y b en los tres métodos.'), test('Cruzar el máximo', 'sumar_politicas(250, 10) == (None, 255, 4)', 'Las políticas se distinguen ante overflow.', 'u8 tiene 256 valores: wrapping continúa módulo 256.'), test('Frontera exacta', 'sumar_politicas(255, 0) == (Some(255), 255, 255) && sumar_politicas(255, 1) == (None, 255, 0)', 'Llegar al máximo es válido; excederlo cambia el resultado.', 'checked_add no falla solo por recibir 255.')],
    hints: ['Cada método toma b y opera sobre a.', 'checked_add retorna Option; los otros retornan u8.', 'Devolvé los tres resultados en el orden del contrato.'],
    review: {success: 'Cada resultado expresa una política independiente del perfil de compilación. Los límites 255 + 0 y 255 + 1 muestran dónde se separan.', pitfall: 'Saturar o envolver puede ocultar errores si lo que necesitabas era rechazar la operación. Elegí según el dominio, no para silenciar un fallo.'},
    transfer: 'Proponé una política para un índice circular y otra para calcular tamaño de una reserva. En Cargo, revisá perfiles debug/release antes de medir rendimiento real.',
    prediction: predict('¿Qué política conserva información explícita de que la suma no cabe?', ['wrapping_add', 'saturating_add', 'checked_add'], 2, 'checked_add devuelve None cuando no puede representar el resultado.'),
    sources: [src('std · u8 arithmetic', 'https://doc.rust-lang.org/std/primitive.u8.html'), src('Cargo · overflow-checks', 'https://doc.rust-lang.org/cargo/reference/profiles.html#overflow-checks')]
  });

  add(15, {
    title: 'Un error que sirve para personas y programas',
    intro: 'Un enum de errores conserva causas tipadas. Display ofrece un mensaje para personas; Error permite interoperar con APIs de errores de la biblioteca estándar.',
    why: 'La aplicación puede comparar variantes para decidir y mostrar mensajes para explicar. Mezclar ambas funciones en cadenas dificulta cambiar la redacción sin romper lógica.',
    objective: 'Validá un tamaño u16: cero produce Vacio; mayor que 64 produce DemasiadoGrande(n); los demás producen Ok(n). Implementá los mensajes indicados.',
    instructions: ['Display: Vacio → "tamano vacio"; DemasiadoGrande(n) → "tamano n supera 64".', 'Conservá la implementación de std::error::Error y el enum tipado.'],
    starter: '#[derive(Debug, PartialEq)]\nenum ErrorTamano { Vacio, DemasiadoGrande(u16) }\nimpl std::fmt::Display for ErrorTamano {\n    fn fmt(&self, f: &mut std::fmt::Formatter<\'_>) -> std::fmt::Result { todo!() }\n}\nimpl std::error::Error for ErrorTamano {}\nfn validar_tamano(n: u16) -> Result<u16, ErrorTamano> { todo!() }',
    solution: '#[derive(Debug, PartialEq)]\nenum ErrorTamano { Vacio, DemasiadoGrande(u16) }\nimpl std::fmt::Display for ErrorTamano {\n    fn fmt(&self, f: &mut std::fmt::Formatter<\'_>) -> std::fmt::Result {\n        match self {\n            Self::Vacio => write!(f, "tamano vacio"),\n            Self::DemasiadoGrande(n) => write!(f, "tamano {} supera 64", n),\n        }\n    }\n}\nimpl std::error::Error for ErrorTamano {}\nfn validar_tamano(n: u16) -> Result<u16, ErrorTamano> {\n    match n {\n        0 => Err(ErrorTamano::Vacio),\n        1..=64 => Ok(n),\n        _ => Err(ErrorTamano::DemasiadoGrande(n)),\n    }\n}',
    tests: [test('Datos válidos', 'validar_tamano(1) == Ok(1) && validar_tamano(64) == Ok(64)', 'La validación conserva valores y admite fronteras.', 'El rango válido incluye 64.'), test('Causa vacía y mensaje', 'validar_tamano(0) == Err(ErrorTamano::Vacio) && ErrorTamano::Vacio.to_string() == "tamano vacio"', 'La variante programática y su presentación están disponibles.', 'Display escribe en Formatter mediante write!.'), test('Error interoperable', '{ let error = validar_tamano(80).unwrap_err(); let causa = error == ErrorTamano::DemasiadoGrande(80); let objeto: Box<dyn std::error::Error> = Box::new(error); causa && objeto.to_string() == "tamano 80 supera 64" }', 'El dato de contexto sobrevive y Error permite una interfaz común.', 'Guardá n en la variante y usalo en Display.')],
    hints: ['match n puede usar el patrón 1..=64.', 'Display retorna el Result que produce write!.', 'Error exige Debug y Display; el derive ya aporta Debug.'],
    review: {success: 'La API conserva el número rechazado y una variante comparable. La interfaz Error permite manejar este tipo junto a otros errores cuando convenga.', pitfall: 'Box<dyn Error> simplifica ciertas fronteras, pero pierde coincidencia directa de variantes sin conocer el tipo. En bibliotecas, un enum público suele comunicar mejor los fallos esperables.'},
    transfer: 'Agregá contexto y source a un error que envuelva otro. Luego mové el núcleo a una biblioteca Cargo con unit tests, integration tests y ejemplos documentados.',
    prediction: predict('¿Conviene decidir la lógica del programa comparando el texto de Display?', ['Sí, siempre es estable', 'No: es preferible comparar variantes tipadas cuando están disponibles', 'Solo si el mensaje es corto'], 1, 'La presentación puede cambiar; las variantes expresan causas estructuradas para el programa.'),
    sources: [src('std · Error', 'https://doc.rust-lang.org/std/error/trait.Error.html'), src('std · Display', 'https://doc.rust-lang.org/std/fmt/trait.Display.html')]
  });

  add(16, {
    level: 'beginner', title: 'FizzBuzz del reactor', minutes: 8,
    intro: 'Una regla puede cumplir dos condiciones a la vez. El orden de las decisiones determina si reconocés esa intersección.',
    why: 'Antes de programar, separá casos exclusivos y compartidos. Esta habilidad aparece en validadores, permisos y reglas de negocio.',
    objective: 'Para n entre 1 y 10.000: múltiplo de 3 → "Fizz"; de 5 → "Buzz"; de ambos → "FizzBuzz"; en otro caso el número decimal.',
    instructions: ['Comprobá primero el caso combinado o combiná dos booleanos con match.', 'Devolvé String en todos los caminos.'],
    starter: 'fn fizzbuzz(n: u32) -> String {\n    todo!()\n}',
    solution: 'fn fizzbuzz(n: u32) -> String {\n    match (n % 3 == 0, n % 5 == 0) {\n        (true, true) => "FizzBuzz".to_string(),\n        (true, false) => "Fizz".to_string(),\n        (false, true) => "Buzz".to_string(),\n        (false, false) => n.to_string(),\n    }\n}',
    tests: [test('Condiciones separadas', 'fizzbuzz(9) == "Fizz" && fizzbuzz(10) == "Buzz"', 'Cada divisor activa su propia regla.', 'El resto cero indica divisibilidad.'), test('Intersección', 'fizzbuzz(15) == "FizzBuzz" && fizzbuzz(30) == "FizzBuzz"', 'No se pierde el caso que cumple ambas.', 'Un if de 3 antes del combinado escondería FizzBuzz.'), test('Número ordinario', 'fizzbuzz(1) == "1" && fizzbuzz(17) == "17"', 'El camino restante conserva el argumento.', 'Usá to_string sobre n.')],
    hints: ['n % divisor == 0 detecta un múltiplo.', 'Dos booleanos forman cuatro combinaciones.', 'match (n % 3 == 0, n % 5 == 0) permite nombrar las cuatro.'],
    review: {success: 'Las pruebas cubren reglas individuales, su intersección y el caso restante. El match de la solución vuelve visibles las cuatro combinaciones.', pitfall: 'Cumplir la primera condición no implica que la segunda sea falsa.'},
    transfer: 'Agregá una regla para múltiplos de 7 y contá cuántas combinaciones necesitarías considerar.',
    prediction: predict('Si primero devolvés Fizz cuando n % 3 == 0, ¿qué ocurre con 15?', ['Devuelve FizzBuzz automáticamente', 'El caso combinado queda oculto y devuelve Fizz', 'No compila'], 1, 'Una devolución temprana impide evaluar las reglas posteriores.'),
    sources: [src('Rust Book · match', 'https://doc.rust-lang.org/book/ch06-02-match.html')]
  });

  add(16, {
    level: 'beginner', title: 'El calendario de las excepciones', minutes: 8,
    intro: '&& y || permiten combinar predicados. Poner paréntesis puede comunicar mejor una regla aunque conozcas su precedencia.',
    why: 'Las excepciones a una regla suelen tener más valor de prueba que un ejemplo común. Un calendario es un problema pequeño con tres divisores relevantes.',
    objective: 'Un año gregoriano positivo es bisiesto si es divisible por 400, o si es divisible por 4 y no por 100.',
    instructions: ['Devolvé bool.', 'Probá un siglo bisiesto y otro que no lo sea.'],
    starter: 'fn bisiesto(anio: u32) -> bool {\n    todo!()\n}',
    solution: 'fn bisiesto(anio: u32) -> bool {\n    anio % 400 == 0 || (anio % 4 == 0 && anio % 100 != 0)\n}',
    tests: [test('Regla habitual', 'bisiesto(2024) && !bisiesto(2023)', 'Se distinguen años comunes.', 'La base es divisibilidad por cuatro.'), test('Siglo excluido', '!bisiesto(1900) && !bisiesto(2100)', 'La excepción del siglo no se omite.', 'Los múltiplos de cien requieren otra comprobación.'), test('Excepción de la excepción', 'bisiesto(2000) && bisiesto(2400)', 'Un múltiplo de cuatrocientos sí se admite.', 'No rechaces todos los siglos indiscriminadamente.')],
    hints: ['% devuelve el resto.', 'El caso divisible por 400 es suficiente por sí solo.', 'Uní ese caso con (divisible por 4 && no divisible por 100).'],
    review: {success: 'La expresión codifica la regla completa y los tests observan las dos capas de excepción.', pitfall: 'Este ejercicio usa el calendario gregoriano como regla matemática; no modela adopciones históricas de calendarios ni años no positivos.'},
    transfer: 'Implementá dias_del_anio a partir de esta función y justificá qué lógica no deberías duplicar.',
    prediction: predict('Según el contrato, ¿1900 es bisiesto?', ['Sí, porque es divisible por cuatro', 'No: es divisible por cien pero no por cuatrocientos', 'Depende del huso horario'], 1, 'La excepción del siglo rechaza 1900.'),
    sources: [src('Rust Reference · Boolean operators', 'https://doc.rust-lang.org/reference/expressions/operator-expr.html#lazy-boolean-operators')]
  });

  add(16, {
    level: 'beginner', title: 'Permisos dentro de un byte', minutes: 10, visual: 'memory',
    intro: 'Cada bit puede representar una capacidad. OR agrega bits; AND con el complemento elimina una máscara sin tocar los demás.',
    why: 'Una máscara permite actualizar permisos independientes en una representación compacta. La regla de conservación de los demás bits es parte del contrato.',
    objective: 'actualizar activa o desactiva todos los bits de mascara sobre estado, según habilitar.',
    instructions: ['Usá operadores de bits sobre u8.', 'Una máscara cero no debe modificar nada.'],
    starter: 'fn actualizar(estado: u8, mascara: u8, habilitar: bool) -> u8 {\n    todo!()\n}',
    solution: 'fn actualizar(estado: u8, mascara: u8, habilitar: bool) -> u8 {\n    if habilitar { estado | mascara } else { estado & !mascara }\n}',
    tests: [test('Activar sin borrar', 'actualizar(0b1000, 0b0011, true) == 0b1011', 'Se conservan permisos ajenos a la máscara.', 'OR combina bits; asignar mascara borraría los anteriores.'), test('Quitar solo elegidos', 'actualizar(0b1111, 0b0101, false) == 0b1010', 'La eliminación se limita a bits seleccionados.', 'AND con !mascara apaga esos bits.'), test('Operación neutra e idempotente', 'actualizar(7, 0, true) == 7 && actualizar(7, 0, false) == 7 && actualizar(3, 3, true) == 3', 'Reaplicar permisos no los alterna.', 'XOR alternaría bits y no implementa activar.')],
    hints: ['No confundas | y & con || y &&.', 'Activar es estado | mascara.', 'Desactivar es estado & !mascara.'],
    review: {success: 'Los casos comprueban conservación e idempotencia. Actualizar un permiso dos veces da el mismo resultado que hacerlo una vez.', pitfall: 'XOR sirve para alternar; usarlo para habilitar rompe la idempotencia.'},
    transfer: 'Agregá contiene_todos(estado, mascara) y definí qué debe devolver con máscara cero.',
    prediction: predict('¿Qué sucede si activás dos veces el mismo bit con OR?', ['Vuelve a apagarse', 'Permanece encendido', 'Se mueve una posición'], 1, 'OR no alterna un bit que ya era uno.'),
    sources: [src('Rust Reference · Bitwise operators', 'https://doc.rust-lang.org/reference/expressions/operator-expr.html#arithmetic-and-logical-binary-operators')]
  });

  add(16, {
    level: 'beginner', title: 'Desarmá un número decimal', minutes: 8,
    intro: 'Dividir un entero positivo por diez elimina su último dígito. El resto por diez permite observarlo antes de eliminarlo.',
    why: 'Separar estado restante y acumulador ayuda a razonar por qué un bucle termina y qué conserva en cada paso.',
    objective: 'Sumá los dígitos decimales de un u64. Para cero devolvé cero; no conviertas a texto en la solución propuesta.',
    instructions: ['Usá una copia mutable de n.', 'Extraé cada dígito con % 10 y reducí el número con / 10.'],
    starter: 'fn sumar_digitos(mut n: u64) -> u32 {\n    todo!()\n}',
    solution: 'fn sumar_digitos(mut n: u64) -> u32 {\n    let mut suma = 0u32;\n    while n > 0 {\n        suma += (n % 10) as u32;\n        n /= 10;\n    }\n    suma\n}',
    tests: [test('Dígitos con ceros', 'sumar_digitos(40506) == 15', 'Los ceros no terminan el recorrido.', 'El bucle depende de n entero, no del dígito extraído.'), test('Cero y una cifra', 'sumar_digitos(0) == 0 && sumar_digitos(8) == 8', 'La base funciona sin iteraciones especiales.', 'Inicializá la suma en cero.'), test('Rango máximo', 'sumar_digitos(u64::MAX) == 87', 'No se estrecha n antes de descomponerlo.', 'Convertí solo el resto 0..9, no todo n a u32.')],
    hints: ['n % 10 siempre cabe en u32.', 'La división de n reduce el número de dígitos.', 'Sumá el resto y luego ejecutá n /= 10.'],
    review: {success: 'El máximo u64 también funciona: cada resto está entre cero y nueve, y la suma de como máximo veinte dígitos cabe ampliamente en u32.', pitfall: 'Los tests validan el resultado; no imponen la técnica aritmética. Compará tu solución con el objetivo si usaste texto.'},
    transfer: 'Generalizá la operación a una base entre 2 y 16.',
    prediction: predict('¿n % 10 vale cero implica que ya no quedan dígitos?', ['Sí', 'No: puede ser un cero interior o final', 'Solo en u64'], 1, 'Por ejemplo, 120 tiene resto cero pero aún contiene las cifras uno y dos.'),
    sources: [src('Rust Book · Integer operations', 'https://doc.rust-lang.org/book/ch03-02-data-types.html')]
  });

  add(16, {
    level: 'beginner', title: 'Euclides reduce el problema', minutes: 10,
    intro: 'El máximo común divisor no cambia al sustituir (a, b) por (b, a % b) mientras b no sea cero.',
    why: 'Un algoritmo puede avanzar conservando una propiedad en lugar de probar todas las respuestas posibles. El resto hace disminuir el segundo componente.',
    objective: 'Calculá mcd(a, b) para u32. Por contrato mcd(a, 0) = a y mcd(0, 0) = 0.',
    instructions: ['Iterá hasta que b sea cero.', 'Guardá el resto antes de reasignar a y b.'],
    starter: 'fn mcd(mut a: u32, mut b: u32) -> u32 {\n    todo!()\n}',
    solution: 'fn mcd(mut a: u32, mut b: u32) -> u32 {\n    while b != 0 {\n        let resto = a % b;\n        a = b;\n        b = resto;\n    }\n    a\n}',
    tests: [test('Divisor compartido', 'mcd(48, 18) == 6 && mcd(18, 48) == 6', 'La respuesta no depende del orden de entradas.', 'Cada vuelta transforma ambos valores.'), test('Coprimos', 'mcd(17, 13) == 1', 'El algoritmo puede terminar en uno.', 'No presupongas un divisor mayor que uno.'), test('Ceros', 'mcd(9, 0) == 9 && mcd(0, 9) == 9 && mcd(0, 0) == 0', 'La condición evita dividir por cero.', 'Comprobá b antes de calcular a % b.')],
    hints: ['El valor temporal resto evita perder el a anterior.', 'La condición del while es b != 0.', 'Al salir, a es la respuesta.'],
    review: {success: 'La transición reduce el problema y la guarda protege la operación %. Los casos con cero son parte expresa del contrato.', pitfall: 'Reasignar a antes de calcular a % b usaría un valor cambiado y destruiría la transición.'},
    transfer: 'Contá las iteraciones para pares distintos y compará con buscar divisores uno por uno; no confundas conteo de pasos con un benchmark temporal.',
    prediction: predict('¿Por qué calcular el resto antes de a = b?', ['Para usar ambos valores de la iteración anterior', 'Porque las asignaciones son lentas', 'Porque Rust no permite dos variables mutables'], 0, 'La transición necesita a y b originales para calcular el próximo resto.'),
    sources: [src('Rust Book · Loops', 'https://doc.rust-lang.org/book/ch03-05-control-flow.html')]
  });

  add(17, {
    level: 'medium', title: 'Anagramas sin perder repeticiones',
    intro: 'Un anagrama conserva la cantidad de cada unidad de texto. En este ejercicio la unidad es char: un escalar Unicode.',
    why: 'Un conjunto comprueba presencia pero pierde multiplicidad. Ordenar dos secuencias permite comparar las cantidades sin gestionar un mapa de contadores.',
    objective: 'Devolvé true si ambos textos contienen exactamente los mismos chars, con las mismas repeticiones. Mayúsculas, espacios y acentos cuentan; no normalices Unicode.',
    instructions: ['Recolectá chars de cada texto y ordenalos.', 'Compará las secuencias completas, incluyendo longitud.'],
    starter: 'fn anagramas(a: &str, b: &str) -> bool {\n    todo!()\n}',
    solution: 'fn anagramas(a: &str, b: &str) -> bool {\n    let mut a: Vec<char> = a.chars().collect();\n    let mut b: Vec<char> = b.chars().collect();\n    a.sort_unstable();\n    b.sort_unstable();\n    a == b\n}',
    tests: [test('Orden distinto', 'anagramas("ñab", "bañ") && anagramas("", "")', 'El orden no importa y el vacío conserva el multiconjunto vacío.', 'Compará chars ordenados, no los textos originales.'), test('Repeticiones importan', '!anagramas("aab", "abb") && !anagramas("ab", "aab")', 'Un set no alcanza para contar repeticiones.', 'No dedupliques antes de comparar.'), test('Contrato literal Unicode', '!anagramas("A", "a") && !anagramas("é", "e\u{301}")', 'No se normalizan mayúsculas ni formas Unicode equivalentes.', 'La unidad es el escalar exacto, no la apariencia visual.')],
    hints: ['chars().collect::<Vec<char>>() conserva repeticiones.', 'sort_unstable no necesita preservar orden entre valores iguales.', 'Igualdad de vectores verifica longitud y cada posición.'],
    review: {success: 'La comparación conserva multiplicidad y el contrato Unicode explícito. La solución propuesta ordena en lugar de confundir un multiconjunto con un conjunto.', pitfall: 'Dos textos visualmente equivalentes pueden usar secuencias Unicode distintas. Normalizarlos requeriría otro contrato y herramientas adicionales.'},
    transfer: 'Implementá otra solución con HashMap<char, usize> y compará qué memoria necesita cada enfoque.',
    prediction: predict('¿Un HashSet<char> distingue "aab" de "abb"?', ['Sí', 'No: ambos contienen a y b', 'Solo con Unicode'], 1, 'El conjunto elimina información sobre cantidades.'),
    sources: [src('std · str::chars', 'https://doc.rust-lang.org/std/primitive.str.html#method.chars')]
  });

  add(17, {
    level: 'medium', title: 'Comprimí rachas de caracteres',
    intro: 'Run-length encoding describe cada racha consecutiva mediante un valor y su cantidad. No agrupa repeticiones separadas.',
    why: 'Representar el estado actual como la última racha permite recorrer el texto una vez. Usar pares evita ambigüedades si el propio texto contiene dígitos.',
    objective: 'Transformá texto en Vec<(char, usize)> de rachas consecutivas; por ejemplo "aaññb" → [(a,2),(ñ,2),(b,1)].',
    instructions: ['Recorré chars, no bytes.', 'Incrementá la última racha solo si su char coincide; de lo contrario creá otra.'],
    starter: 'fn codificar_rle(texto: &str) -> Vec<(char, usize)> {\n    todo!()\n}',
    solution: 'fn codificar_rle(texto: &str) -> Vec<(char, usize)> {\n    let mut rachas: Vec<(char, usize)> = Vec::new();\n    for ch in texto.chars() {\n        match rachas.last_mut() {\n            Some((previo, cantidad)) if *previo == ch => *cantidad += 1,\n            _ => rachas.push((ch, 1)),\n        }\n    }\n    rachas\n}',
    tests: [test('Rachas Unicode', 'codificar_rle("aaññb") == vec![(\'a\', 2), (\'ñ\', 2), (\'b\', 1)]', 'Una unidad Unicode no se divide en bytes.', 'Iterá chars y actualizá un contador por racha.'), test('Repetición separada', 'codificar_rle("aba") == vec![(\'a\', 1), (\'b\', 1), (\'a\', 1)]', 'Dos rachas de a permanecen separadas.', 'Compará solamente con la última racha.'), test('Vacío y dígitos', 'codificar_rle("").is_empty() && codificar_rle("111") == vec![(\'1\', 3)]', 'El formato no confunde contenido numérico con cantidad.', 'La salida son pares tipados, no una cadena ambigua.')],
    hints: ['Anotá Vec<(char, usize)> para orientar la inferencia.', 'last_mut permite cambiar el contador sin extraer el par.', 'Un match con guarda compara *previo == ch.'],
    review: {success: 'Cada racha representa un bloque contiguo y conserva su orden. Los pares tipados separan dato y metadato.', pitfall: 'RLE no siempre comprime: un texto sin repeticiones puede ocupar más espacio representado en pares.'},
    transfer: 'Componé este ejercicio con decodificar_rle y verificá el recorrido de ida y vuelta.',
    prediction: predict('¿RLE de "aba" debería juntar las dos letras a?', ['Sí, en una única racha', 'No: no son consecutivas', 'Solo si ordenás primero'], 1, 'Juntarlas destruiría el orden necesario para reconstruir el texto.'),
    sources: [src('std · slice::last_mut', 'https://doc.rust-lang.org/std/primitive.slice.html#method.last_mut')]
  });

  add(17, {
    level: 'medium', title: 'Reconstruí el mensaje por rachas',
    intro: 'Decodificar aplica cada cantidad al carácter correspondiente. El formato con pares ya distingue datos de cantidades.',
    why: 'Una transformación inversa es una buena oportunidad para comprobar qué información conserva la representación. Las rachas de longitud cero se definen aquí como vacías.',
    objective: 'Expandí &[(char, usize)] a String en el orden recibido. Cada cantidad está entre 0 y 100 y la salida tiene como máximo 1.000 chars.',
    instructions: ['Agregá el char cantidad veces con String::push.', 'No exijas que rachas adyacentes tengan caracteres distintos.'],
    starter: 'fn decodificar_rle(rachas: &[(char, usize)]) -> String {\n    todo!()\n}',
    solution: 'fn decodificar_rle(rachas: &[(char, usize)]) -> String {\n    let mut texto = String::new();\n    for &(ch, cantidad) in rachas {\n        for _ in 0..cantidad { texto.push(ch); }\n    }\n    texto\n}',
    tests: [test('Reconstrucción Unicode', 'decodificar_rle(&[(\'ñ\', 2), (\'🦀\', 1)]) == "ññ🦀"', 'push codifica correctamente cada char en UTF-8.', 'No trates un char como un único byte.'), test('Cantidades cero', 'decodificar_rle(&[(\'x\', 0), (\'a\', 2)]) == "aa" && decodificar_rle(&[]) == ""', 'Una racha vacía no agrega símbolos.', 'El rango 0..cantidad hace cero vueltas para cero.'), test('Rachas contiguas iguales', 'decodificar_rle(&[(\'1\', 2), (\'1\', 1)]) == "111"', 'No hace falta un formato canónico para decodificar.', 'Cada par aporta su propia cantidad.')],
    hints: ['El patrón &(ch, cantidad) copia ambos valores pequeños.', 'push recibe char y mantiene String válido.', 'La repetición anidada sigue el tamaño de la salida.'],
    review: {success: 'La salida conserva orden y cantidades. Rachas equivalentes pueden producir el mismo texto aunque la representación no sea canónica.', pitfall: 'Los límites del ejercicio evitan expansiones enormes. Un decodificador de entradas no confiables debe validar un presupuesto de salida antes de reservar o expandir.'},
    transfer: 'Agregá un límite de salida y devolvé Result cuando la suma de cantidades lo supere.',
    prediction: predict('¿Decodificar y volver a codificar conserva siempre exactamente los mismos pares?', ['Sí', 'No: rachas contiguas iguales y ceros pueden normalizarse', 'Solo si hay emoji'], 1, 'El texto puede ser el mismo aunque la codificación canónica junte rachas o elimine ceros.'),
    sources: [src('std · String::push', 'https://doc.rust-lang.org/std/string/struct.String.html#method.push')]
  });

  add(17, {
    level: 'medium', title: 'La palabra más larga, sin copiarla',
    intro: 'Podés comparar tokens por una métrica y devolver un slice prestado del original. El desempate es una decisión que debe aparecer en el contrato.',
    why: 'Medir bytes puede favorecer injustamente caracteres multibyte. Aquí la longitud se define por escalares Unicode y el empate conserva la primera palabra.',
    objective: 'Devolvé la palabra con más chars según split_whitespace. En empate gana la primera; sin palabras devolvé None.',
    instructions: ['Guardá la mejor palabra y su cantidad de chars.', 'Actualizá solo cuando la candidata sea estrictamente más larga.'],
    starter: 'fn palabra_larga(texto: &str) -> Option<&str> {\n    todo!()\n}',
    solution: 'fn palabra_larga(texto: &str) -> Option<&str> {\n    let mut mejor = None;\n    let mut largo = 0;\n    for palabra in texto.split_whitespace() {\n        let actual = palabra.chars().count();\n        if actual > largo { mejor = Some(palabra); largo = actual; }\n    }\n    mejor\n}',
    tests: [test('Ganador por longitud', 'palabra_larga("cpu memoria red") == Some("memoria")', 'Se compara toda la secuencia de tokens.', 'Actualizá el mejor al encontrar un largo superior.'), test('Unicode y empate', 'palabra_larga("ññ abc") == Some("abc") && palabra_larga("sol mar") == Some("sol")', 'Se cuentan chars y se respeta el primer empate.', 'Usá >, no >=, y no compares len en bytes.'), test('Separadores y vacío', 'palabra_larga(" \t\n") == None && palabra_larga("\tuno\ndosdos") == Some("dosdos")', 'La ausencia de tokens está representada.', 'split_whitespace maneja separadores variados.')],
    hints: ['La salida Option<&str> no necesita un String nuevo.', 'split_whitespace no genera palabras vacías.', 'Una comparación estricta conserva el primer candidato empatado.'],
    review: {success: 'Los casos verifican la métrica, el desempate y la ausencia. La solución devuelve una vista que sigue ligada a la entrada.', pitfall: 'chars no segmenta grafemas visuales. Si esa fuera la métrica del producto, haría falta otro contrato.'},
    transfer: 'Devolvé todas las palabras empatadas y documentá si querés conservar repetidas.',
    prediction: predict('¿Usar >= en la actualización preservaría el primer empate?', ['Sí', 'No: lo reemplazaría por el último empatado', 'No cambia nunca nada'], 1, 'En igualdad, >= autoriza actualizar y desplaza al candidato anterior.'),
    sources: [src('std · str::split_whitespace', 'https://doc.rust-lang.org/std/primitive.str.html#method.split_whitespace')]
  });

  add(17, {
    level: 'medium', title: 'Cortá por caracteres en una frontera de bytes', visual: 'memory',
    intro: 'char_indices conecta dos modelos: entrega un escalar y el offset de bytes donde comienza. Ese offset es una frontera válida para slicing.',
    why: 'Las APIs de texto suelen recibir una cantidad de caracteres pero almacenan UTF-8. Transformar la posición una vez permite devolver vistas sin reconstruir el contenido.',
    objective: 'Separá el texto después de n chars. Si n supera la cantidad disponible, devolvé (texto, "").',
    instructions: ['Buscá con char_indices().nth(n) el inicio del tramo restante.', 'Usá texto.len() si no existe ese char y devolvé dos slices.'],
    starter: 'fn dividir_chars(texto: &str, n: usize) -> (&str, &str) {\n    todo!()\n}',
    solution: 'fn dividir_chars(texto: &str, n: usize) -> (&str, &str) {\n    let corte = texto.char_indices().nth(n).map(|(i, _)| i).unwrap_or(texto.len());\n    texto.split_at(corte)\n}',
    tests: [test('Frontera Unicode', 'dividir_chars("a🦀ñz", 2) == ("a🦀", "ñz")', 'El corte no parte bytes de un escalar.', 'nth cuenta elementos; el offset devuelto sirve para split_at.'), test('Nada a la izquierda', 'dividir_chars("hola", 0) == ("", "hola")', 'El inicio también es una frontera válida.', 'El char de índice cero empieza en byte cero.'), test('Fin y exceso', 'dividir_chars("ñ", 1) == ("ñ", "") && dividir_chars("ñ", 9) == ("ñ", "") && dividir_chars("", 4) == ("", "")', 'El contrato satura en el final del texto.', 'Si nth no existe, usá len en bytes.')],
    hints: ['char_indices entrega pares (offset_en_bytes, char).', 'El n-ésimo char es el primero del tramo derecho.', 'split_at devuelve los dos préstamos con una sola frontera.'],
    review: {success: 'La función traduce una posición de chars a bytes sin cortar UTF-8. El resultado comparte almacenamiento con la entrada.', pitfall: 'La operación puede recorrer n caracteres; no la describas como acceso aleatorio constante.'},
    transfer: 'Implementá un recorte entre dos posiciones de chars y definí qué pasa si el inicio supera el final.',
    prediction: predict('¿Qué representa el usize de char_indices?', ['Una posición de bytes válida en str', 'Siempre el número de letras anteriores', 'Un identificador del carácter Unicode'], 0, 'La iteración entrega el byte inicial de cada escalar.'),
    sources: [src('std · str::char_indices', 'https://doc.rust-lang.org/std/primitive.str.html#method.char_indices')]
  });

  add(18, {
    level: 'medium', title: 'Una pila para los delimitadores', visual: 'collections',
    intro: 'Los delimitadores anidados se cierran en orden inverso al de apertura. Esa relación coincide con una pila.',
    why: 'Contar aperturas y cierres no detecta cruces como ([)]. Recordar el orden permite comprobar la estructura.',
    objective: 'Validá (), [] y {} correctamente anidados. Ignorá cualquier otro char; no hay reglas de comillas o comentarios.',
    instructions: ['Apilá aperturas.', 'Cada cierre debe corresponder a la última apertura; al terminar la pila debe estar vacía.'],
    starter: 'fn balanceado(texto: &str) -> bool {\n    todo!()\n}',
    solution: 'fn balanceado(texto: &str) -> bool {\n    let mut pila = Vec::new();\n    for ch in texto.chars() {\n        match ch {\n            \'(\' | \'[\' | \'{\' => pila.push(ch),\n            \')\' | \']\' | \'}\' => {\n                let esperado = match ch { \')\' => \'(\', \']\' => \'[\', _ => \'{\' };\n                if pila.pop() != Some(esperado) { return false; }\n            }\n            _ => {}\n        }\n    }\n    pila.is_empty()\n}',
    tests: [test('Anidación y texto', 'balanceado("f([x] + {ñ})") && balanceado("")', 'Los caracteres ajenos no afectan la estructura.', 'Ignorá letras y operadores.'), test('Cruce incorrecto', '!balanceado("([)]")', 'Cantidad igual no garantiza orden correcto.', 'Compará el cierre con la última apertura.'), test('Extremos incompletos', '!balanceado(")(") && !balanceado("(()")', 'Se rechazan cierres sin apertura y aperturas pendientes.', 'Controlá tanto pop como la pila al final.')],
    hints: ['Vec<char> puede actuar como pila con push y pop.', 'Un cierre exige el tipo de apertura correspondiente.', 'Retorná false al primer desacuerdo; al final revisá is_empty.'],
    review: {success: 'Los casos distinguen balance numérico de anidación correcta. La pila conserva exactamente las aperturas aún pendientes.', pitfall: 'Este validador no es un parser de Rust: trata delimitadores dentro de supuestas comillas como cualquier otro delimitador, según su contrato.'},
    transfer: 'Devolvé el índice de bytes del primer cierre inválido usando char_indices.',
    prediction: predict('¿Contar tres aperturas y tres cierres alcanza para validar la anidación?', ['Sí', 'No: también importa el orden y el tipo', 'Solo si no hay texto'], 1, 'Una secuencia puede tener cantidades iguales y cruces incompatibles.'),
    sources: [src('std · Vec', 'https://doc.rust-lang.org/std/vec/struct.Vec.html')]
  });

  add(18, {
    level: 'medium', title: 'Encontrá la primera posición posible',
    intro: 'Una búsqueda binaria puede buscar una frontera entre valores menores que el objetivo y valores mayores o iguales.',
    why: 'Definir un intervalo semiabierto [lo, hi) evita restar uno a cero y aclara qué parte del problema sigue pendiente.',
    objective: 'Sobre un slice ordenado ascendente, devolvé el primer índice cuyo valor sea >= objetivo; si no existe, devolvé len.',
    instructions: ['Mantené lo = 0 y hi = len con extremo superior exclusivo.', 'Si el elemento central es menor, avanzá lo; en otro caso reducí hi a mid.'],
    starter: 'fn posicion_insercion(datos: &[i32], objetivo: i32) -> usize {\n    todo!()\n}',
    solution: 'fn posicion_insercion(datos: &[i32], objetivo: i32) -> usize {\n    let (mut lo, mut hi) = (0, datos.len());\n    while lo < hi {\n        let mid = lo + (hi - lo) / 2;\n        if datos[mid] < objetivo { lo = mid + 1; } else { hi = mid; }\n    }\n    lo\n}',
    tests: [test('Duplicados al comienzo de la frontera', 'posicion_insercion(&[1, 3, 3, 3, 8], 3) == 1', 'Se devuelve el primer igual, no cualquiera.', 'La igualdad debe mover hi a mid.'), test('Hueco y final', 'posicion_insercion(&[2, 5, 9], 6) == 2 && posicion_insercion(&[2, 5, 9], 10) == 3', 'También hay respuesta sin coincidencia exacta.', 'Buscás una frontera, no solo igualdad.'), test('Inicio y vacío', 'posicion_insercion(&[4, 7], 0) == 0 && posicion_insercion(&[], 5) == 0', 'El intervalo vacío termina sin indexar.', 'La guarda lo < hi debe preceder a la lectura.')],
    hints: ['La respuesta siempre está entre cero y len inclusive.', 'mid = lo + (hi - lo) / 2 evita sumar extremos grandes.', 'También existe datos.partition_point(|x| *x < objetivo) para expresar esta frontera.'],
    review: {success: 'Los casos verifican frontera, duplicados y extremos. La solución propuesta reduce el intervalo en cada paso; los tests de salida no demuestran por sí solos complejidad logarítmica.', pitfall: 'El contrato presupone datos ordenados. Aplicarlo a una secuencia arbitraria no produce una frontera significativa.'},
    transfer: 'Obtené el rango completo de un valor usando dos fronteras: < objetivo y <= objetivo.',
    prediction: predict('Al encontrar igualdad, ¿por qué seguir hacia la izquierda?', ['Porque el igual nunca sirve', 'Porque puede existir una posición igual anterior', 'Para ordenar la entrada'], 1, 'El contrato exige el primer índice que cumple la condición.'),
    sources: [src('std · slice::partition_point', 'https://doc.rust-lang.org/std/primitive.slice.html#method.partition_point')]
  });

  add(18, {
    level: 'medium', title: 'Fusioná dos secuencias ya ordenadas', visual: 'collections',
    intro: 'Si cada entrada está ordenada, el menor elemento restante está en alguno de sus dos frentes.',
    why: 'Podés aprovechar una propiedad de los datos para evitar ordenar todo otra vez. Los duplicados son datos y deben conservarse.',
    objective: 'Fusioná dos slices ascendentes en un Vec ascendente que incluya cada elemento de ambas entradas.',
    instructions: ['Compará los frentes con dos índices.', 'Cuando una entrada termine, agregá el resto de la otra.'],
    starter: 'fn fusionar(a: &[i32], b: &[i32]) -> Vec<i32> {\n    todo!()\n}',
    solution: 'fn fusionar(a: &[i32], b: &[i32]) -> Vec<i32> {\n    let mut salida = Vec::new();\n    let (mut i, mut j) = (0, 0);\n    while i < a.len() && j < b.len() {\n        if a[i] <= b[j] { salida.push(a[i]); i += 1; }\n        else { salida.push(b[j]); j += 1; }\n    }\n    salida.extend_from_slice(&a[i..]);\n    salida.extend_from_slice(&b[j..]);\n    salida\n}',
    tests: [test('Alternancia', 'fusionar(&[1, 4, 8], &[2, 3, 9]) == vec![1, 2, 3, 4, 8, 9]', 'La elección debe repetirse después de cada extracción.', 'No concatenes simplemente entradas completas.'), test('Repetidos y negativos', 'fusionar(&[-2, 1, 1], &[-2, 1]) == vec![-2, -2, 1, 1, 1]', 'No se pierde multiplicidad.', 'Usar un set destruiría duplicados.'), test('Entradas vacías', 'fusionar(&[], &[2, 4]) == vec![2, 4] && fusionar(&[1], &[]) == vec![1] && fusionar(&[], &[]).is_empty()', 'Las colas restantes cubren también el caso sin bucle.', 'Agregá ambos tramos restantes después del while.')],
    hints: ['Avanzá solamente el índice de la entrada que aportó el elemento.', 'Elegir a en igualdad conserva sus repeticiones sin saltar b.', 'extend_from_slice agrega el resto desde cada índice.'],
    review: {success: 'La salida conserva orden y cantidades. En la solución propuesta cada elemento se copia una vez; ordenar después también podría pasar estos tests, pero desaprovecharía la precondición.', pitfall: 'El algoritmo depende del orden de ambas entradas. Los tests no prueban esa precondición para datos externos.'},
    transfer: 'Generalizá a T: Ord + Clone o diseñá una versión que consuma Vec<T> sin exigir Clone.',
    prediction: predict('¿Qué índice avanzás después de elegir a[i]?', ['Solo i', 'Ambos siempre', 'Solo j'], 0, 'El frente de b todavía no fue consumido.'),
    sources: [src('std · Vec::extend_from_slice', 'https://doc.rust-lang.org/std/vec/struct.Vec.html#method.extend_from_slice')]
  });

  add(18, {
    level: 'medium', title: 'La mejor ventana de mediciones',
    intro: 'windows(k) recorre segmentos contiguos solapados. k = 0 requiere tratarse antes porque esa llamada no acepta ventanas vacías.',
    why: 'Una ventana representa vecindad, no una selección arbitraria. El caso de todos negativos revela si inicializaste el máximo con un valor inventado.',
    objective: 'Devolvé la mayor suma de una ventana contigua de k elementos. Para k = 0 o k > len devolvé None. Como máximo hay 1.000 i32.',
    instructions: ['Convertí cada elemento a i64 antes de sumarlo.', 'Usá max sobre las sumas para conservar el caso vacío como Option.'],
    starter: 'fn mejor_ventana(datos: &[i32], k: usize) -> Option<i64> {\n    todo!()\n}',
    solution: 'fn mejor_ventana(datos: &[i32], k: usize) -> Option<i64> {\n    if k == 0 || k > datos.len() { return None; }\n    datos.windows(k).map(|w| w.iter().map(|&x| i64::from(x)).sum()).max()\n}',
    tests: [test('Vecindad', 'mejor_ventana(&[5, -9, 4, 3], 2) == Some(7)', 'La ventana exige elementos consecutivos.', 'No selecciones los dos mayores globales.'), test('Todo negativo', 'mejor_ventana(&[-8, -2, -5], 2) == Some(-7)', 'El máximo puede ser negativo.', 'Un acumulador de máximo inicializado en cero sería incorrecto.'), test('Ventanas inválidas y suma ancha', 'mejor_ventana(&[1], 0) == None && mejor_ventana(&[1], 2) == None && mejor_ventana(&[i32::MAX, i32::MAX], 2) == Some(4294967294)', 'Las guardas y el tipo intermedio protegen casos límite.', 'No sumes en i32 para convertir a i64 después.')],
    hints: ['Validá k antes de llamar a windows.', 'Cada ventana es &[i32].', 'map(|&x| i64::from(x)).sum::<i64>() amplía cada sumando.'],
    review: {success: 'Los casos verifican contigüidad, negativos y aritmética ampliada. Esta solución clara recalcula cada ventana y hace O(n·k) trabajo.', pitfall: 'Usar un iterador no convierte automáticamente el algoritmo en O(n). Una suma deslizante puede reutilizar trabajo entre ventanas.'},
    transfer: 'Implementá una suma deslizante que reste el elemento saliente y agregue el entrante; compará resultados, luego contá operaciones.',
    prediction: predict('¿Inicializar el máximo en cero es válido si todas las ventanas suman negativo?', ['Sí', 'No: cero sería una respuesta inexistente', 'Solo si k es par'], 1, 'El resultado debe pertenecer a alguna ventana válida, aunque todas sean negativas.'),
    sources: [src('std · slice::windows', 'https://doc.rust-lang.org/std/primitive.slice.html#method.windows')]
  });

  add(18, {
    level: 'medium', title: 'Dos sumandos sin reutilizar el mismo elemento', visual: 'collections',
    intro: 'Mientras avanzás, un conjunto puede recordar valores anteriores. Para cada valor actual buscás el complemento del objetivo.',
    why: 'Consultar antes de insertar evita usar el mismo elemento dos veces. El orden del recorrido define un desempate determinista.',
    objective: 'Buscá el primer elemento actual que complete una pareja con un valor anterior. Devolvé (anterior, actual). Entradas y objetivo están entre -1.000 y 1.000.',
    instructions: ['Consultá objetivo - actual en un HashSet antes de insertar actual.', 'Si no hay pareja devolvé None; duplicados en posiciones distintas sí pueden combinarse.'],
    starter: 'use std::collections::HashSet;\nfn pareja(datos: &[i32], objetivo: i32) -> Option<(i32, i32)> {\n    todo!()\n}',
    solution: 'use std::collections::HashSet;\nfn pareja(datos: &[i32], objetivo: i32) -> Option<(i32, i32)> {\n    let mut vistos = HashSet::new();\n    for &actual in datos {\n        let anterior = objetivo - actual;\n        if vistos.contains(&anterior) { return Some((anterior, actual)); }\n        vistos.insert(actual);\n    }\n    None\n}',
    tests: [test('Primer cierre de pareja', 'pareja(&[1, 4, 2, 3], 5) == Some((1, 4))', 'El primer índice actual válido decide el resultado.', 'Devolvé al encontrar la primera coincidencia.'), test('No usar dos veces el mismo', 'pareja(&[3], 6) == None && pareja(&[3, 3], 6) == Some((3, 3))', 'Se requieren dos posiciones aunque los valores coincidan.', 'Consultá antes de insertar el valor actual.'), test('Signos y ausencia', 'pareja(&[-4, 7, 2], 3) == Some((-4, 7)) && pareja(&[], 0) == None && pareja(&[1, 2], 8) == None', 'La resta busca complementos con signo.', 'No limites el conjunto a positivos.')],
    hints: ['El conjunto almacena valores, no índices, porque la salida pide valores.', 'El orden de iteración del HashSet no importa: solo hacés consultas.', 'Al terminar el for, None expresa que no hubo pareja.'],
    review: {success: 'Los casos verifican el desempate y la necesidad de dos posiciones. La solución propuesta consulta por clave, sin depender del orden interno del set.', pitfall: 'El rango acotado hace segura la resta i32 del ejercicio. Una API para cualquier i32 debería definir cómo manejar overflow.'},
    transfer: 'Devolvé índices y usá un HashMap que recuerde la primera posición de cada valor.',
    prediction: predict('Si insertás actual antes de buscar su complemento, ¿qué caso se rompe?', ['Una lista de un solo 3 con objetivo 6', 'Todas las listas vacías', 'Solo las entradas negativas'], 0, 'El set podría contener el mismo elemento actual y aparentar una segunda posición inexistente.'),
    sources: [src('std · HashSet', 'https://doc.rust-lang.org/std/collections/struct.HashSet.html')]
  });

  add(19, {
    level: 'advanced', title: 'Parseá decimal con un presupuesto de bits',
    intro: 'Cada dígito decimal transforma el acumulador mediante actual × 10 + dígito. Ambas operaciones pueden exceder el tipo destino.',
    why: 'Un parser debe validar forma y rango. Comprobar cada transición evita que una entrada demasiado grande envuelva silenciosamente el resultado.',
    objective: 'Aceptá solo dígitos ASCII, sin signos ni espacios, y devolvé u32. Errores: vacío → "vacio"; primer byte no dígito → "digito"; primer overflow → "overflow". Procesá de izquierda a derecha.',
    instructions: ['Usá bytes para esta gramática exclusivamente ASCII.', 'Aplicá checked_mul y checked_add por cada dígito; los ceros iniciales se aceptan.'],
    starter: 'fn decimal(texto: &str) -> Result<u32, &\'static str> {\n    todo!()\n}',
    solution: 'fn decimal(texto: &str) -> Result<u32, &\'static str> {\n    if texto.is_empty() { return Err("vacio"); }\n    let mut total = 0u32;\n    for byte in texto.bytes() {\n        if !byte.is_ascii_digit() { return Err("digito"); }\n        total = total.checked_mul(10)\n            .and_then(|n| n.checked_add(u32::from(byte - b\'0\')))\n            .ok_or("overflow")?;\n    }\n    Ok(total)\n}',
    tests: [test('Números y ceros iniciales', 'decimal("00042") == Ok(42) && decimal("0") == Ok(0)', 'La sintaxis permite ceros sin cambiar el valor.', 'No confundas texto cero con entrada vacía.'), test('Gramática estricta', 'decimal("") == Err("vacio") && decimal(" 3") == Err("digito") && decimal("+3") == Err("digito") && decimal("٣") == Err("digito")', 'No hay trim, signo ni dígitos Unicode en el contrato.', 'is_ascii_digit es más específico que una noción amplia de número.'), test('Límite exacto y exceso', 'decimal("4294967295") == Ok(u32::MAX) && decimal("4294967296") == Err("overflow")', 'Llegar al máximo es válido; excederlo no.', 'Comprobá tanto multiplicación como suma.')],
    hints: ['byte - b\'0\' convierte un dígito ya validado a 0..9.', 'checked_mul devuelve Option; and_then permite encadenar checked_add.', 'ok_or("overflow")? propaga el primer fallo.'],
    review: {success: 'Los casos separan gramática y rango. La solución construye el valor sin depender de si el perfil de compilación detecta overflow con operadores normales.', pitfall: 'El orden de errores importa: esta API informa el primer fallo al avanzar, no escanea primero toda la sintaxis.'},
    transfer: 'Generalizá a una base configurable y definí exactamente qué caracteres representan dígitos.',
    prediction: predict('¿Basta con checked_add si multiplicás el acumulador usando * 10 normal?', ['Sí', 'No: la multiplicación también puede desbordar', 'Solo con ceros iniciales'], 1, 'Cada operación que amplía el acumulador necesita su propia política comprobada.'),
    sources: [src('std · u32::checked_mul', 'https://doc.rust-lang.org/std/primitive.u32.html#method.checked_mul')]
  });

  add(19, {
    level: 'advanced', title: 'Hexadecimal: dos símbolos por byte', visual: 'memory',
    intro: 'Cada dígito hexadecimal representa cuatro bits. Dos nibbles forman un byte al desplazar el primero cuatro lugares y combinarlo con el segundo.',
    why: 'La gramática determina cómo agrupar la entrada. Validar antes de usar los símbolos evita aceptar parcialmente un payload mal formado.',
    objective: 'Decodificá texto hexadecimal ASCII en Vec<u8>. Mayúsculas y minúsculas se aceptan. Longitud de bytes impar → Err("largo"); byte inválido → Err("digito"); vacío → Vec vacío.',
    instructions: ['Implementá nibble para 0–9, a–f y A–F.', 'Validá longitud primero y recorré pares de bytes, sin espacios opcionales.'],
    starter: 'fn nibble(b: u8) -> Option<u8> { todo!() }\nfn desde_hex(texto: &str) -> Result<Vec<u8>, &\'static str> {\n    todo!()\n}',
    solution: 'fn nibble(b: u8) -> Option<u8> {\n    match b {\n        b\'0\'..=b\'9\' => Some(b - b\'0\'),\n        b\'a\'..=b\'f\' => Some(b - b\'a\' + 10),\n        b\'A\'..=b\'F\' => Some(b - b\'A\' + 10),\n        _ => None,\n    }\n}\nfn desde_hex(texto: &str) -> Result<Vec<u8>, &\'static str> {\n    let bytes = texto.as_bytes();\n    if bytes.len() % 2 != 0 { return Err("largo"); }\n    let mut salida = Vec::new();\n    for par in bytes.chunks_exact(2) {\n        let alto = nibble(par[0]).ok_or("digito")?;\n        let bajo = nibble(par[1]).ok_or("digito")?;\n        salida.push((alto << 4) | bajo);\n    }\n    Ok(salida)\n}',
    tests: [test('Valores y cajas mezcladas', 'desde_hex("00aF10") == Ok(vec![0, 175, 16])', 'Cada par produce exactamente un byte.', 'El primer nibble representa los cuatro bits altos.'), test('Forma incompleta', 'desde_hex("ABC") == Err("largo") && desde_hex("") == Ok(vec![])', 'La longitud impar se rechaza y el vacío es válido.', 'Comprobá longitud antes de recorrer pares.'), test('Símbolos inválidos', 'desde_hex("0g") == Err("digito") && desde_hex("é") == Err("digito") && desde_hex(" 0") == Err("digito")', 'Solo la gramática ASCII hexadecimal es válida.', 'No hagas trim ni conviertas caracteres arbitrarios.')],
    hints: ['Cada rama de nibble retorna un valor entre 0 y 15.', 'chunks_exact(2) da pares tras validar la longitud.', '(alto << 4) | bajo ensambla el byte.'],
    review: {success: 'La decodificación conserva un byte por par y rechaza datos que no pertenecen a la gramática. El uso de bytes es correcto porque el formato es ASCII.', pitfall: 'Un formato de texto Unicode general no puede cortarse así por bytes. Aquí el formato define deliberadamente un alfabeto ASCII.'},
    transfer: 'Implementá el codificador inverso con letras minúsculas y comprobá ida y vuelta para los 256 bytes.',
    prediction: predict('¿Qué valor aportan los símbolos AF?', ['10 + 15 = 25', '10 × 16 + 15 = 175', 'Un carácter Unicode'], 1, 'El primer dígito ocupa la posición de dieciséis unidades.'),
    sources: [src('std · slice::chunks_exact', 'https://doc.rust-lang.org/std/primitive.slice.html#method.chunks_exact')]
  });

  add(19, {
    level: 'advanced', title: 'Un frame binario con longitud declarada', visual: 'memory',
    intro: 'Un protocolo puede anteponer la longitud del payload. Un parser debe distinguir cabecera incompleta, payload incompleto y bytes que pertenecen al frame siguiente.',
    why: 'Recibir un buffer no garantiza que contenga exactamente un mensaje. Devolver cuántos bytes consumiste permite componer parsers sobre un flujo.',
    objective: 'Los dos primeros bytes son longitud u16 big-endian. Devolvé (payload copiado, bytes consumidos). Menos de dos bytes → "cabecera"; payload insuficiente → "datos". Permití bytes sobrantes.',
    instructions: ['Leé la longitud con u16::from_be_bytes.', 'Consumí solo 2 + longitud, incluso si el buffer contiene más datos.'],
    starter: 'fn leer_frame(datos: &[u8]) -> Result<(Vec<u8>, usize), &\'static str> {\n    todo!()\n}',
    solution: 'fn leer_frame(datos: &[u8]) -> Result<(Vec<u8>, usize), &\'static str> {\n    if datos.len() < 2 { return Err("cabecera"); }\n    let largo = usize::from(u16::from_be_bytes([datos[0], datos[1]]));\n    let fin = 2 + largo;\n    if datos.len() < fin { return Err("datos"); }\n    Ok((datos[2..fin].to_vec(), fin))\n}',
    tests: [test('Mensaje y bytes siguientes', 'leer_frame(&[0, 3, 10, 20, 30, 99]) == Ok((vec![10, 20, 30], 5))', 'Los bytes sobrantes quedan fuera del consumo.', 'El resultado consumido incluye los dos bytes de cabecera.'), test('Payload vacío', 'leer_frame(&[0, 0, 9]) == Ok((vec![], 2))', 'Cero longitud no equivale a cabecera ausente.', 'La cabecera todavía consume dos bytes.'), test('Entradas incompletas', 'leer_frame(&[0]) == Err("cabecera") && leer_frame(&[1, 0, 7]) == Err("datos")', 'La longitud big-endian 256 no se confunde con uno.', 'Validá toda la longitud antes de hacer slicing.')],
    hints: ['La cabecera debe estar completa antes de indexar datos[1].', 'from_be_bytes([a, b]) interpreta primero el byte de mayor peso.', 'El extremo del slice es 2 + largo.'],
    review: {success: 'Los casos separan tipos de truncamiento y verifican el consumo exacto. El parser puede integrarse en un lector que acumule bytes entre lecturas.', pitfall: 'Esto no abre sockets ni implementa buffering de red. Además copia el payload; una versión prestada podría evitar esa copia si su lifetime encaja.'},
    transfer: 'Procesá varios frames concatenados avanzando el buffer según bytes consumidos y definí cómo retener un último frame incompleto.',
    prediction: predict('¿[1, 0] como u16 big-endian representa qué longitud?', ['1', '256', '0'], 1, 'El primer byte tiene peso 256; el segundo tiene peso uno.'),
    sources: [src('std · u16::from_be_bytes', 'https://doc.rust-lang.org/std/primitive.u16.html#method.from_be_bytes')]
  });

  add(19, {
    level: 'advanced', title: 'La bitácora que conserva solo lo reciente', visual: 'collections',
    intro: 'Un buffer de retención acotada descarta el evento más antiguo al necesitar espacio. VecDeque expresa bien sus dos extremos.',
    why: 'El límite lógico de retención es distinto de la capacidad de memoria reservada. with_capacity por sí solo no establece una política de descarte.',
    objective: 'Procesá eventos i32 y devolvé los últimos limite valores en orden de llegada. Si limite es cero, no retengas ninguno.',
    instructions: ['Antes de agregar con push_back, quitá el frente si ya se alcanzó el límite.', 'No ordenes ni dedupliques eventos.'],
    starter: 'use std::collections::VecDeque;\nfn recientes(eventos: &[i32], limite: usize) -> Vec<i32> {\n    todo!()\n}',
    solution: 'use std::collections::VecDeque;\nfn recientes(eventos: &[i32], limite: usize) -> Vec<i32> {\n    let mut cola = VecDeque::new();\n    if limite == 0 { return Vec::new(); }\n    for &evento in eventos {\n        if cola.len() == limite { cola.pop_front(); }\n        cola.push_back(evento);\n    }\n    cola.into_iter().collect()\n}',
    tests: [test('Descartar antigüedad', 'recientes(&[1, 2, 3, 4], 2) == vec![3, 4]', 'La política retiene el sufijo en el orden original.', 'El elemento más antiguo está al frente.'), test('Sin descarte necesario', 'recientes(&[7, 7, 3], 8) == vec![7, 7, 3]', 'Repetidos y orden son parte de la bitácora.', 'El límite es máximo, no cantidad obligatoria.'), test('Límite cero y ausencia', 'recientes(&[1, 2], 0).is_empty() && recientes(&[], 3).is_empty()', 'La política cero se maneja antes de agregar.', 'Sin guarda, len == 0 y pop_front no impedirían insertar.')],
    hints: ['Separá el caso limite == 0.', 'Compará len con el límite antes de cada inserción.', 'Convertí VecDeque en Vec al finalizar para presentar la salida.'],
    review: {success: 'La salida comprueba retención y orden. La solución propuesta mantiene como máximo limite elementos durante el recorrido; los tests finales no miden el pico de memoria de otras implementaciones.', pitfall: 'VecDeque::with_capacity reserva espacio inicial, pero la colección puede crecer si insertás más. El límite pertenece a tu algoritmo.'},
    transfer: 'Devolvé también cuántos eventos se descartaron y comprobá retenidos + descartados = recibidos.',
    prediction: predict('¿with_capacity(10) impide insertar un undécimo elemento?', ['Sí', 'No: reserva capacidad, no impone un máximo lógico', 'Solo en debug'], 1, 'La estructura puede crecer; debés implementar la política de retención.'),
    sources: [src('std · VecDeque', 'https://doc.rust-lang.org/std/collections/struct.VecDeque.html')]
  });

  add(19, {
    level: 'advanced', title: 'Una calculadora de pila con errores explícitos',
    intro: 'En notación posfija, los operandos preceden a la operación: 3 4 + produce 7. La pila conserva los resultados intermedios.',
    why: 'El parser y el evaluador tienen fronteras distintas: un token puede ser inválido, faltar un operando o desbordarse una operación válida.',
    objective: 'Evaluá enteros i32 y operadores +, - y * separados por whitespace. Fallos de izquierda a derecha: token inválido → "token"; faltan operandos o quedan != 1 resultados → "pila"; overflow → "overflow".',
    instructions: ['En una operación extraé primero el operando derecho y luego el izquierdo.', 'Usá checked_add/sub/mul y exigí una única respuesta final.'],
    starter: 'fn evaluar_rpn(texto: &str) -> Result<i32, &\'static str> {\n    todo!()\n}',
    solution: 'fn evaluar_rpn(texto: &str) -> Result<i32, &\'static str> {\n    let mut pila: Vec<i32> = Vec::new();\n    for token in texto.split_whitespace() {\n        if matches!(token, "+" | "-" | "*") {\n            let derecho = pila.pop().ok_or("pila")?;\n            let izquierdo = pila.pop().ok_or("pila")?;\n            let valor = match token {\n                "+" => izquierdo.checked_add(derecho),\n                "-" => izquierdo.checked_sub(derecho),\n                _ => izquierdo.checked_mul(derecho),\n            }.ok_or("overflow")?;\n            pila.push(valor);\n        } else { pila.push(token.parse::<i32>().map_err(|_| "token")?); }\n    }\n    if pila.len() != 1 { return Err("pila"); }\n    Ok(pila[0])\n}',
    tests: [test('Operaciones compuestas y orden', 'evaluar_rpn("3 4 + 2 *") == Ok(14) && evaluar_rpn("8 3 -") == Ok(5)', 'La pila compone resultados y conserva el orden de resta.', 'El primer pop es el operando derecho.'), test('Aridad incorrecta', 'evaluar_rpn("1 +") == Err("pila") && evaluar_rpn("1 2") == Err("pila") && evaluar_rpn("") == Err("pila")', 'La estructura debe tener operandos y una única salida.', 'Controlá tanto cada pop como la cantidad final.'), test('Token y overflow', 'evaluar_rpn("x") == Err("token") && evaluar_rpn("2147483647 1 +") == Err("overflow")', 'Una forma válida todavía puede exceder el rango.', 'No uses operadores normales para las cuentas comprobadas.')],
    hints: ['Una comparación con matches! distingue los tres operadores.', 'Un token negativo como -3 se parsea como número; solo "-" es operador.', 'Result permite propagar cada clase de error con ?.'],
    review: {success: 'El evaluador combina parsing, pila y aritmética comprobada. Las pruebas de resta detectan una inversión de operandos que suma y multiplicación ocultarían.', pitfall: 'La función no admite división ni expresiones infijas con paréntesis. Extender la gramática exige actualizar el contrato y sus errores.'},
    transfer: 'Agregá división con cero y el caso i32::MIN / -1 explícitamente definidos.',
    prediction: predict('Para 8 3 -, ¿qué número sale primero de la pila?', ['8, el izquierdo', '3, el derecho', 'No importa el orden'], 1, 'La última entrada está arriba; para resta debés reconstruir izquierdo - derecho.'),
    sources: [src('std · i32 checked arithmetic', 'https://doc.rust-lang.org/std/primitive.i32.html#method.checked_sub')]
  });

  add(20, {
    level: 'expert', title: 'Una caché aprende qué usaste recientemente', minutes: 18, visual: 'collections',
    intro: 'Una política LRU descarta lo usado hace más tiempo. Un acceso a una clave existente también cambia su posición de recencia.',
    why: 'El orden de inserción no basta para representar uso. Una caché necesita actualizar metadatos incluso cuando la clave ya estaba presente.',
    objective: 'Simulá accesos a claves con capacidad fija. Cada acceso inserta o mueve la clave al extremo más reciente. Devolvé claves de menos a más reciente; capacidad cero retiene ninguna.',
    instructions: ['Eliminá una clave existente de su posición antes de agregarla al final.', 'Si una clave nueva excede la capacidad, expulsá la menos reciente.'],
    starter: 'use std::collections::VecDeque;\nfn simular_lru(accesos: &[&str], capacidad: usize) -> Vec<String> {\n    todo!()\n}',
    solution: 'use std::collections::VecDeque;\nfn simular_lru(accesos: &[&str], capacidad: usize) -> Vec<String> {\n    let mut orden: VecDeque<String> = VecDeque::new();\n    if capacidad == 0 { return Vec::new(); }\n    for &clave in accesos {\n        if let Some(i) = orden.iter().position(|k| k == clave) { orden.remove(i); }\n        else if orden.len() == capacidad { orden.pop_front(); }\n        orden.push_back(clave.to_string());\n    }\n    orden.into_iter().collect()\n}',
    tests: [test('Un hit protege de expulsión', 'simular_lru(&["a", "b", "a", "c"], 2) == vec!["a", "c"]', 'Releer a hace que b sea la menos reciente.', 'Mover un hit es parte de la política, no solo insertarlo.'), test('Una clave ocupa un lugar', 'simular_lru(&["x", "x", "x"], 3) == vec!["x"]', 'Los accesos repetidos no duplican entradas.', 'Eliminá la aparición previa antes de insertar al final.'), test('Extremos de capacidad', 'simular_lru(&["a", "b"], 0).is_empty() && simular_lru(&["a", "b"], 1) == vec!["b"] && simular_lru(&[], 2).is_empty()', 'Cero, uno y ausencia de accesos tienen políticas consistentes.', 'La capacidad lógica debe aplicarse a cada acceso.')],
    hints: ['position encuentra el índice actual de una clave.', 'Un hit ya libera su lugar; no expulsa otra clave.', 'VecDeque::remove(i) y push_back actualizan la recencia.'],
    review: {success: 'Las pruebas distinguen LRU de FIFO y verifican unicidad. La solución didáctica recorre la cola en cada acceso, por lo que cuesta O(capacidad) por acceso.', pitfall: 'Esto modela la política, no una caché O(1) de producción. Los tests de orden no demuestran complejidad ni rendimiento.'},
    transfer: 'Diseñá qué metadatos necesitarías para acceso O(1) y compará el costo y complejidad de mantenerlos.',
    prediction: predict('Con capacidad dos y accesos a,b,a,c, ¿qué clave se expulsa?', ['a, porque se insertó primero', 'b, porque a volvió a usarse', 'c, porque es nueva'], 1, 'LRU se basa en último uso; FIFO se basaría en orden de entrada.'),
    sources: [src('std · VecDeque::remove', 'https://doc.rust-lang.org/std/collections/struct.VecDeque.html#method.remove')]
  });

  add(20, {
    level: 'expert', title: 'Tiempo lógico: expiración sin sleeps', minutes: 18, visual: 'collections',
    intro: 'Una caché con TTL puede recibir el tiempo como dato. Así se prueban fronteras exactas sin esperar ni depender del reloj del sistema.',
    why: 'Inyectar tiempo separa política de infraestructura. La aritmética del deadline también debe manejarse como una operación que puede fallar.',
    objective: 'CacheTtl::poner guarda valor hasta ahora + ttl, devolviendo Err("tiempo") sin cambios si desborda. leer devuelve Some solo mientras ahora < vence; si venció, elimina la entrada. TTL cero vence de inmediato.',
    instructions: ['Usá checked_add antes de insertar.', 'leer recibe &mut self porque puede eliminar datos vencidos.'],
    starter: 'use std::collections::HashMap;\n#[derive(Default)]\nstruct CacheTtl { datos: HashMap<String, (i32, u64)> }\nimpl CacheTtl {\n    fn poner(&mut self, clave: &str, valor: i32, ahora: u64, ttl: u64) -> Result<(), &\'static str> { todo!() }\n    fn leer(&mut self, clave: &str, ahora: u64) -> Option<i32> { todo!() }\n}',
    solution: 'use std::collections::HashMap;\n#[derive(Default)]\nstruct CacheTtl { datos: HashMap<String, (i32, u64)> }\nimpl CacheTtl {\n    fn poner(&mut self, clave: &str, valor: i32, ahora: u64, ttl: u64) -> Result<(), &\'static str> {\n        let vence = ahora.checked_add(ttl).ok_or("tiempo")?;\n        self.datos.insert(clave.to_string(), (valor, vence));\n        Ok(())\n    }\n    fn leer(&mut self, clave: &str, ahora: u64) -> Option<i32> {\n        match self.datos.get(clave).copied() {\n            Some((valor, vence)) if ahora < vence => Some(valor),\n            Some(_) => { self.datos.remove(clave); None }\n            None => None,\n        }\n    }\n}',
    tests: [test('Frontera y limpieza', '{ let mut c = CacheTtl::default(); c.poner("x", 4, 10, 5).unwrap(); c.leer("x", 14) == Some(4) && c.leer("x", 15) == None && !c.datos.contains_key("x") }', 'La igualdad con vence ya es expiración y elimina el dato.', 'Usá ahora < vence, no <=.'), test('Reemplazo y TTL cero', '{ let mut c = CacheTtl::default(); c.poner("x", 1, 0, 5).unwrap(); c.poner("x", 2, 4, 10).unwrap(); c.poner("z", 9, 4, 0).unwrap(); c.leer("x", 5) == Some(2) && c.leer("z", 5) == None }', 'Poner reemplaza contenido y deadline; cero no implica eternidad.', 'Guardá ambos valores nuevos en la inserción.'), test('Overflow sin modificación', '{ let mut c = CacheTtl::default(); c.poner("x", 7, 0, 100).unwrap(); let err = c.poner("x", 9, u64::MAX, 1); err == Err("tiempo") && c.leer("x", 1) == Some(7) && c.leer("ausente", 1) == None }', 'Una escritura inválida conserva la entrada previa.', 'Calculá checked_add antes de mutar el mapa.')],
    hints: ['(i32, u64) es Copy; copied libera el préstamo de get antes de remove.', 'La guarda de match puede comprobar ahora < vence.', 'Un Result temprano evita cualquier inserción tras overflow.'],
    review: {success: 'Los tests controlan el tiempo y verifican exactamente el límite, la renovación y los errores sin efectos. No necesitaste temporizadores reales.', pitfall: 'El ejercicio admite consultas con tiempo explícito; una implementación real debe elegir una fuente monotónica y política de limpieza. No hay garantías de persistencia ni sincronización concurrente aquí.'},
    transfer: 'Agregá limpiar_vencidos(ahora) con retain y distinguí limpieza proactiva de eliminación al consultar.',
    prediction: predict('Si vence = 15, ¿leer a tiempo 15 devuelve el dato según este contrato?', ['Sí, todavía queda ese instante', 'No: la validez es ahora < vence', 'Depende de la carga del sistema'], 1, 'La frontera es una regla matemática explícita y no depende de scheduling.'),
    sources: [src('std · HashMap', 'https://doc.rust-lang.org/std/collections/struct.HashMap.html'), src('std · u64::checked_add', 'https://doc.rust-lang.org/std/primitive.u64.html#method.checked_add')]
  });

  add(20, {
    level: 'expert', title: 'Reconstruí el estado desde un journal', minutes: 18, visual: 'collections',
    intro: 'Un journal describe cambios en orden. La secuencia permite detectar saltos o repeticiones antes de aceptar la reconstrucción.',
    why: 'Guardar operaciones y reconstruir estado separa historia de snapshot. Un resultado consistente exige definir cómo se identifican faltantes y eliminaciones.',
    objective: 'Reproducí registros con secuencias exactamente 1,2,3…; cualquier desviación → Err("secuencia"). Some(v) guarda/reemplaza una clave; None la elimina aunque no exista. Como máximo hay 1.000 registros.',
    instructions: ['Construí un BTreeMap<String, i32> local para una salida ordenada por clave.', 'Devolvé el estado solo si toda la secuencia es válida.'],
    starter: 'use std::collections::BTreeMap;\nstruct Registro { secuencia: u64, clave: String, valor: Option<i32> }\nfn reg(secuencia: u64, clave: &str, valor: Option<i32>) -> Registro { Registro { secuencia, clave: clave.to_string(), valor } }\nfn reconstruir(registros: &[Registro]) -> Result<BTreeMap<String, i32>, &\'static str> {\n    todo!()\n}',
    solution: 'use std::collections::BTreeMap;\nstruct Registro { secuencia: u64, clave: String, valor: Option<i32> }\nfn reg(secuencia: u64, clave: &str, valor: Option<i32>) -> Registro { Registro { secuencia, clave: clave.to_string(), valor } }\nfn reconstruir(registros: &[Registro]) -> Result<BTreeMap<String, i32>, &\'static str> {\n    let mut estado = BTreeMap::new();\n    for (i, registro) in registros.iter().enumerate() {\n        if registro.secuencia != i as u64 + 1 { return Err("secuencia"); }\n        match registro.valor {\n            Some(v) => { estado.insert(registro.clave.clone(), v); }\n            None => { estado.remove(&registro.clave); }\n        }\n    }\n    Ok(estado)\n}',
    tests: [test('Historia y reemplazo', '{ let log = vec![reg(1, "b", Some(2)), reg(2, "a", Some(1)), reg(3, "b", Some(9))]; reconstruir(&log) == Ok(BTreeMap::from([(String::from("a"), 1), (String::from("b"), 9)])) }', 'El último valor de una clave prevalece y la salida tiene orden definido.', 'Aplicá operaciones en orden, no agrupadas por clave.'), test('Eliminar y journal vacío', '{ let log = vec![reg(1, "x", Some(3)), reg(2, "x", None), reg(3, "ausente", None)]; reconstruir(&log) == Ok(BTreeMap::new()) && reconstruir(&[]) == Ok(BTreeMap::new()) }', 'Eliminar una clave ausente es un no-op, no un fallo.', 'remove ya permite una ausencia sin panic.'), test('Secuencias rotas', 'reconstruir(&[reg(2, "x", Some(1))]) == Err("secuencia") && reconstruir(&[reg(1, "x", Some(1)), reg(1, "y", Some(2))]) == Err("secuencia")', 'Se detectan saltos y repeticiones.', 'La secuencia esperada viene de la posición, empezando en uno.')],
    hints: ['enumerate empieza en cero; el número esperado comienza en uno.', 'El límite de registros permite convertir el índice a u64 sin pérdida.', 'Cloná la clave solo al guardarla; eliminar admite &String.'],
    review: {success: 'La reconstrucción verifica continuidad y aplica la historia en orden. El mapa local evita publicar un snapshot parcial si hay un registro inválido.', pitfall: 'Este journal está en memoria y no ofrece durabilidad, checksums ni recuperación de escrituras partidas en disco. Es el núcleo lógico que esas capas podrían utilizar.'},
    transfer: 'Agregá un snapshot inicial con número de secuencia base y ajustá la validación del tramo restante.',
    prediction: predict('¿Ordenar el journal por clave antes de aplicarlo conserva siempre el significado?', ['Sí', 'No: el orden temporal de los cambios importa', 'Solo cuando hay un BTreeMap'], 1, 'Cambiar el orden puede alterar qué escritura es la última y cuándo ocurre una eliminación.'),
    sources: [src('std · BTreeMap', 'https://doc.rust-lang.org/std/collections/struct.BTreeMap.html')]
  });

  add(20, {
    level: 'expert', title: 'Una actualización con versión esperada', minutes: 15,
    intro: 'La concurrencia optimista verifica que la versión observada no cambió antes de aceptar una escritura. Acá modelamos esa regla en una operación local.',
    why: 'Comparar versiones puede detectar que una decisión se tomó sobre estado viejo. La transición debe conservar el estado completo si se rechaza.',
    objective: 'El estado es (valor i32, versión u64). Si esperada difiere, Err("conflicto"). Si sumar uno a la versión desborda, Err("version"). Si se acepta, guardá nuevo, incrementá versión y devolvé la versión nueva.',
    instructions: ['Validá conflicto antes de calcular la siguiente versión.', 'No modifiques ningún campo hasta completar ambas verificaciones.'],
    starter: 'fn escribir_versionado(estado: &mut (i32, u64), esperada: u64, nuevo: i32) -> Result<u64, &\'static str> {\n    todo!()\n}',
    solution: 'fn escribir_versionado(estado: &mut (i32, u64), esperada: u64, nuevo: i32) -> Result<u64, &\'static str> {\n    if estado.1 != esperada { return Err("conflicto"); }\n    let siguiente = estado.1.checked_add(1).ok_or("version")?;\n    *estado = (nuevo, siguiente);\n    Ok(siguiente)\n}',
    tests: [test('Escritura aceptada', '{ let mut e = (10, 4); escribir_versionado(&mut e, 4, 20) == Ok(5) && e == (20, 5) }', 'Dato y versión cambian como una única transición lógica.', 'Asigná ambos campos después de validar.'), test('Cliente con estado viejo', '{ let mut e = (20, 5); escribir_versionado(&mut e, 4, 99) == Err("conflicto") && e == (20, 5) }', 'Una versión distinta no sobrescribe información nueva.', 'El conflicto debe salir antes de mutar.'), test('Versión agotada y prioridad', '{ let mut e = (7, u64::MAX); let a = escribir_versionado(&mut e, u64::MAX, 8); let b = escribir_versionado(&mut e, 0, 9); a == Err("version") && b == Err("conflicto") && e == (7, u64::MAX) }', 'El overflow y el orden de validaciones conservan el estado.', 'Usá checked_add y respetá que conflicto se comprueba primero.')],
    hints: ['El préstamo &mut brinda acceso exclusivo durante esta llamada.', 'checked_add(1).ok_or("version")? prepara la nueva versión.', 'Una sola asignación de tupla expresa el commit lógico.'],
    review: {success: 'Los casos comprueban la transición y que ambos rechazos conserven exactamente el estado anterior.', pitfall: 'No es un compare-and-swap atómico de hardware ni resuelve acceso concurrente por sí solo. Compartir el estado entre threads requiere una frontera de sincronización apropiada.'},
    transfer: 'Encapsulá el estado en Mutex y ejecutá validación más escritura bajo el mismo guard; explicá por qué separar ambos locks sería incorrecto.',
    prediction: predict('¿Comparar la versión y escribir después bajo otro lock sería equivalente?', ['Sí', 'No: alguien podría cambiar el estado entre ambos pasos', 'Solo depende del tamaño del i32'], 1, 'La comprobación y la escritura deben pertenecer a la misma transición protegida.'),
    sources: [src('std · Mutex', 'https://doc.rust-lang.org/std/sync/struct.Mutex.html'), src('std · u64::checked_add', 'https://doc.rust-lang.org/std/primitive.u64.html#method.checked_add')]
  });

  add(20, {
    level: 'expert', title: 'Boss 100: un lote se acepta completo o no cambia nada', minutes: 22, visual: 'collections',
    intro: 'Una transacción lógica agrupa varios cambios y los publica solo si todos resultan válidos. Trabajar sobre un snapshot privado es una estrategia simple para aprender ese contrato.',
    why: 'Validar cada operación mientras mutás el estado público puede dejar cambios parciales al fallar una operación posterior. La frontera de commit separa preparación y publicación.',
    objective: 'Aplicá un lote de Poner, Sumar y Borrar. Sumar exige clave existente ("ausente") y suma i32 comprobada ("overflow"). Borrar ausente es válido. Ante cualquier error, el mapa original queda idéntico.',
    instructions: ['Cloná el mapa para preparar el lote en una copia privada.', 'Procesá en orden y propagá el primer error.', 'Reemplazá el original únicamente después de terminar todo el lote.'],
    starter: 'use std::collections::BTreeMap;\nenum Cambio { Poner(String, i32), Sumar(String, i32), Borrar(String) }\nfn aplicar_lote(datos: &mut BTreeMap<String, i32>, cambios: &[Cambio]) -> Result<(), &\'static str> {\n    todo!()\n}',
    solution: 'use std::collections::BTreeMap;\nenum Cambio { Poner(String, i32), Sumar(String, i32), Borrar(String) }\nfn aplicar_lote(datos: &mut BTreeMap<String, i32>, cambios: &[Cambio]) -> Result<(), &\'static str> {\n    let mut preparado = datos.clone();\n    for cambio in cambios {\n        match cambio {\n            Cambio::Poner(clave, valor) => { preparado.insert(clave.clone(), *valor); }\n            Cambio::Sumar(clave, delta) => {\n                let actual = preparado.get(clave).copied().ok_or("ausente")?;\n                let nuevo = actual.checked_add(*delta).ok_or("overflow")?;\n                preparado.insert(clave.clone(), nuevo);\n            }\n            Cambio::Borrar(clave) => { preparado.remove(clave); }\n        }\n    }\n    *datos = preparado;\n    Ok(())\n}',
    tests: [test('Commit de cambios dependientes', '{ let mut d = BTreeMap::from([(String::from("vieja"), 1)]); let ops = [Cambio::Poner("x".into(), 5), Cambio::Sumar("x".into(), 3), Cambio::Borrar("vieja".into())]; aplicar_lote(&mut d, &ops) == Ok(()) && d == BTreeMap::from([(String::from("x"), 8)]) }', 'Las operaciones del lote observan cambios preparados previamente.', 'Sumar debe consultar la copia de trabajo, no el original.'), test('Rollback de un error tardío', '{ let mut d = BTreeMap::from([(String::from("x"), 4)]); let antes = d.clone(); let ops = [Cambio::Poner("nueva".into(), 9), Cambio::Borrar("x".into()), Cambio::Sumar("ausente".into(), 1)]; aplicar_lote(&mut d, &ops) == Err("ausente") && d == antes }', 'El fallo restaura también escrituras y eliminaciones anteriores del lote.', 'La forma más simple es no publicar ninguna de esas mutaciones todavía.'), test('Overflow, vacío y eliminación ausente', '{ let mut d = BTreeMap::from([(String::from("x"), i32::MAX)]); let antes = d.clone(); let err = aplicar_lote(&mut d, &[Cambio::Poner("y".into(), 2), Cambio::Sumar("x".into(), 1)]); err == Err("overflow") && d == antes && aplicar_lote(&mut d, &[]) == Ok(()) && aplicar_lote(&mut d, &[Cambio::Borrar("nadie".into())]) == Ok(()) && d == antes }', 'La garantía se mantiene ante overflow y lotes neutros.', 'El commit debe ocurrir una sola vez, tras cualquier posible error.')],
    hints: ['BTreeMap<String, i32> implementa Clone porque sus claves y valores también.', 'Toda lectura y escritura del lote va a preparado.', 'La última transición es *datos = preparado; seguida de Ok(()).'],
    review: {success: 'Los casos verifican efectos dependientes, fallos tardíos y conservación exacta del estado. La solución ofrece atomicidad lógica observable entre entrada y retorno de esta función.', pitfall: 'Clonar todo el mapa cuesta tiempo y memoria. Esto no implementa durabilidad en disco, aislamiento entre threads, bloqueo de lectores ni una base de datos ACID completa.'},
    transfer: 'Compará snapshot completo con un journal de deshacer. Explicá qué nuevas pruebas necesitarías antes de agregar persistencia o concurrencia real.',
    prediction: predict('¿Cuándo se debe reemplazar el mapa original?', ['Después de cada operación exitosa', 'Solo cuando todo el lote terminó sin error', 'Antes de validar la primera operación'], 1, 'Publicar cambios parciales rompería la garantía de que un error deja el original intacto.'),
    sources: [src('std · BTreeMap::clone', 'https://doc.rust-lang.org/std/collections/struct.BTreeMap.html'), src('Rust Book · Recoverable errors', 'https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html')]
  });

  return out;
})();
