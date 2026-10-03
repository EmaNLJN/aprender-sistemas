/* Campaña original: cada mundo enlaza tres prácticas previas y tres desafíos nuevos. */
window.RUST_CAMPAIGN = [
  {
    id: 'rust-world-1',
    level: 'beginner',
    title: 'Estación del robot',
    subtitle: 'Repará los controles y cruzá el hangar.',
    story:
      'Llegás a una estación detenida. Su robot conserva energía, pero la brújula confunde los ejes y el inventario no tiene controles de capacidad. Primero recuperás herramientas conocidas; después reparás, construís y probás una misión completa.',
    concepts: [
      'Estado y mutabilidad explícita',
      'Condiciones antes de escribir',
      'Transiciones con recursos limitados',
    ],
    why: 'Una variable mutable representa una parte del estado. Aprender a distinguir una acción propuesta de una acción aceptada evita gastar recursos, mezclar coordenadas y dejar valores incoherentes. La misma lógica aparece en formularios, juegos y operaciones de negocio.',
    guide: [
      'Entrená con el contador, la selección mediante if y un método de struct. Antes de ejecutar, predecí qué valor cambia y cuál debe conservarse.',
      'Repará la brújula con una tabla N/S/E/O. Después construí el inventario: acceso válido, suma comprobada y una única actualización al aceptar.',
      'En el boss, dibujá el hangar 3×3 y recorré las órdenes a mano. Compará ese recorrido con las pruebas, incluida una pared y el momento exacto en que se agota la batería.',
    ],
    trainingIds: ['rust-02', 'rust-06', 'rust-22'],
    challengeIds: ['rust-101', 'rust-102', 'rust-103'],
    bossId: 'rust-103',
    checkpoint: {
      question:
        'El robot propone moverse, pero el destino es una pared. ¿En qué momento conviene haber descontado la batería?',
      options: [
        'Al recibir cualquier orden',
        'Después de confirmar que el movimiento es válido',
        'Antes de calcular la posición candidata',
      ],
      answer: 1,
      explanation:
        'La batería pertenece a la transición aceptada. Validar primero permite rechazar una acción conservando todo el estado, sin tener que restaurarlo después.',
    },
    badge: 'Piloto de estados',
    sources: [
      {
        title: 'Rust Book · Variables and mutability',
        url: 'https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html',
      },
      {
        title: 'Rust Book · Control flow',
        url: 'https://doc.rust-lang.org/book/ch03-05-control-flow.html',
      },
    ],
  },
  {
    id: 'rust-world-2',
    level: 'medium',
    title: 'Puerto de señales',
    subtitle: 'Dale significado a cada bit del mensaje.',
    story:
      'El robot llegó al puerto, pero la compuerta espera mensajes binarios. Una cabecera de un byte identifica el protocolo, el tamaño delimita el contenido y una huella permite rechazar algunas alteraciones. Tu tarea es convertir esos bytes en datos con un contrato explícito.',
    concepts: [
      'Campos de bits y conversiones',
      'Validación de tamaños',
      'Errores y precedencia de rechazo',
    ],
    why: 'Un protocolo no se define solo por su caso feliz: también establece rangos, tamaños y qué significa cada error. Rust aporta tipos y acceso comprobado; el formato y las garantías de integridad los diseñás vos.',
    guide: [
      'Repasá un prefijo seguro, un Result explicativo y las máscaras de permisos. Separá posición en bytes, significado del campo y rango permitido.',
      'Repará el empaquetado de dos campos de cuatro bits. Construí después el checksum siguiendo una tabla de acumulador antes y después de cada byte.',
      'En el boss, escribí primero la secuencia de validaciones: mínimo, versión, largo y huella. Recién entonces extraé el payload y comprobá también un paquete vacío válido.',
    ],
    trainingIds: ['rust-18', 'rust-27', 'rust-78'],
    challengeIds: ['rust-104', 'rust-105', 'rust-106'],
    bossId: 'rust-106',
    checkpoint: {
      question: 'Dos paquetes producen la misma huella de ocho bits. ¿Qué podés concluir?',
      options: [
        'Que necesariamente son el mismo mensaje',
        'Que ambos fueron enviados por una persona autorizada',
        'Que sus huellas coinciden; todavía pueden ser mensajes distintos',
      ],
      answer: 2,
      explanation:
        'Solo hay 256 huellas posibles y muchísimos más mensajes. El checksum de este mundo comprueba una regla del formato, pero admite colisiones y no autentica al emisor.',
    },
    badge: 'Custodia del protocolo',
    sources: [
      {
        title: 'Rust Reference · Operator expressions',
        url: 'https://doc.rust-lang.org/reference/expressions/operator-expr.html',
      },
      {
        title: 'std · u8::rotate_left',
        url: 'https://doc.rust-lang.org/std/primitive.u8.html#method.rotate_left',
      },
    ],
  },
  {
    id: 'rust-world-3',
    level: 'advanced',
    title: 'Archivo de rutas',
    subtitle: 'Explorá por capas y encontrá una salida.',
    story:
      'El protocolo te dio acceso a un mapa lleno de pasillos y ciclos. La estación necesita explorar sin repetir trabajo y encontrar la salida con la menor cantidad de pasos. La estructura que elijas para pendientes cambia la forma de recorrer el mundo.',
    concepts: [
      'Colas FIFO y conjuntos visitados',
      'Predecesores y reconstrucción',
      'Búsqueda por amplitud en una grilla',
    ],
    why: 'Los algoritmos dependen de invariantes concretos: cuándo marcás un nodo, desde qué extremo extraés y qué significa cada distancia. Practicar esas decisiones explica por qué el programa termina y cuándo su resultado es mínimo.',
    guide: [
      'Repasá conjuntos con salida estable, una cola con VecDeque y una pila de delimitadores. Compará FIFO y LIFO usando el mismo dibujo de conexiones.',
      'Repará el recorrido que extrae por el extremo equivocado. Luego reconstruí un camino desde sus predecesores y detectá cadenas ausentes, fuera de rango o cíclicas.',
      'En el boss, validá la forma del mapa antes de buscar. Marcá al encolar, guardá distancia y probá un muro, un destino aislado y el caso donde ya estás en la salida.',
    ],
    trainingIds: ['rust-34', 'rust-35', 'rust-86'],
    challengeIds: ['rust-107', 'rust-108', 'rust-109'],
    bossId: 'rust-109',
    checkpoint: {
      question:
        '¿Qué cambio rompe la justificación de distancia mínima de BFS usada en este mundo?',
      options: [
        'Agregar un ciclo manteniendo visitados',
        'Hacer que algunos movimientos cuesten más que otros',
        'Permitir varias rutas de igual cantidad de pasos',
      ],
      answer: 1,
      explanation:
        'La cola procesa por cantidad de aristas, lo cual coincide con el costo solo cuando cada movimiento cuesta lo mismo. Con costos diferentes necesitás otro criterio para elegir qué expandir.',
    },
    badge: 'Cartografía de rutas',
    sources: [
      {
        title: 'std · VecDeque',
        url: 'https://doc.rust-lang.org/std/collections/struct.VecDeque.html',
      },
      {
        title: 'std · HashSet',
        url: 'https://doc.rust-lang.org/std/collections/struct.HashSet.html',
      },
    ],
  },
  {
    id: 'rust-world-4',
    level: 'expert',
    title: 'Núcleo de la máquina',
    subtitle: 'Diseñá instrucciones, errores y límites de ejecución.',
    story:
      'El último sistema de la estación es una máquina programable. Sus instrucciones parecen pequeñas, pero un signo mal leído, una transición incompleta o un salto infinito pueden cambiar todo el resultado. Vas a darle una semántica que puedas explicar y probar.',
    concepts: [
      'Bytecode e instrucciones tipadas',
      'Transiciones sin efectos parciales',
      'Interpretación con presupuesto finito',
    ],
    why: 'Un intérprete vuelve visibles decisiones que otros sistemas suelen ocultar: qué es una instrucción, cómo avanza el programa, qué estado cambia y cómo se detiene. Los enums describen alternativas válidas; Result y un límite explícito definen las salidas del motor.',
    guide: [
      'Repasá enums con datos, propagación de errores y actualizaciones con versión. Buscá en cada práctica la frontera entre preparar un cambio y confirmarlo.',
      'Repará la lectura firmada de un byte y construí la transición de una instrucción. En esta segunda misión pc ya cuenta instrucciones: no mezcles esas unidades con los offsets en bytes del decodificador.',
      'En el boss, ejecutá instrucciones tipadas con un presupuesto. Seguí pc, acumulador y contador en una tabla; probá un bucle que termina, otro que agota el límite y una dirección inválida.',
    ],
    trainingIds: ['rust-24', 'rust-29', 'rust-99'],
    challengeIds: ['rust-110', 'rust-111', 'rust-112'],
    bossId: 'rust-112',
    checkpoint: {
      question: '¿Qué garantiza el presupuesto del intérprete construido en este mundo?',
      options: [
        'Que todo programa calcula la respuesta que quiso su autor',
        'Que cada programa tarda exactamente la misma cantidad de milisegundos',
        'Que no ejecuta más instrucciones de la VM que las permitidas',
      ],
      answer: 2,
      explanation:
        'El contador acota pasos de este conjunto de instrucciones. No demuestra corrección del programa ni mide tiempo real; una futura instrucción de costo variable requeriría revisar esa garantía.',
    },
    badge: 'Arquitectura del núcleo',
    sources: [
      {
        title: 'Rust Book · Enums',
        url: 'https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html',
      },
      {
        title: 'Rust Reference · Numeric casts',
        url: 'https://doc.rust-lang.org/reference/expressions/operator-expr.html#numeric-cast',
      },
    ],
  },
];
