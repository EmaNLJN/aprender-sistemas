import type { SystemsWorkshop, WorkshopPrediction } from '../model/types';

// La ficha de lowlevel agrega la pregunta de la predicción, que el motor no interpreta.
interface LowlevelWorkshop extends SystemsWorkshop {
  prediction: WorkshopPrediction & { question: string };
}

// Fichas curriculares de los ocho talleres lowlevel: contenido, no comportamiento. Las
// simulaciones viven en `entities/systems-simulation/models/lowlevel` y los núcleos
// programables en `entities/exercise/content/systems-lowlevel-cores`. Los ids de núcleo
// (rust-113..120, go-113..120) son dato explícito, no se calculan.
export const lowlevelWorkshops: LowlevelWorkshop[] = [
  {
    category: 'machine',
    minutes: 45,
    id: 'cache',
    title: 'Una caché que aprende tus visitas',
    subtitle: 'Localidad, hits y expulsiones LRU.',
    level: 'medium',
    story:
      'La cocina tiene tres platos al alcance de la mano. Cada pedido decide qué conservar cerca y qué volver a buscar al depósito.',
    what: 'Vas a construir una caché LRU de capacidad fija y reproducir trazas de acceso. Cada hit mueve la entrada a la posición más reciente.',
    why: 'Separar corrección de política permite preguntar qué datos se devuelven y, después, cuántas consultas evitaste. Una política puede funcionar bien con una carga y mal con otra.',
    uses: [
      'Cachés de resultados en servicios',
      'Reemplazo de páginas y buffers',
      'Comprender localidad de acceso',
    ],
    limits:
      'El modelo guarda claves, no datos ni latencias. LRU exacto no describe todas las cachés de CPU: hay asociatividad, líneas, escrituras y coherencia. El núcleo usa una lista pequeña O(capacidad), no promete O(1).',
    objectives: [
      {
        id: 'miss',
        label: 'Provocá una carga por miss',
        why: 'Una caché vacía debe consultar su fuente.',
      },
      {
        id: 'hit',
        label: 'Reutilizá una clave con hit',
        why: 'Leer actualiza la recencia.',
      },
      {
        id: 'evict',
        label: 'Llená y expulsá la menos reciente',
        why: 'Capacidad y política deciden qué conservar.',
      },
    ],
    prediction: {
      question: 'Con orden LRU→MRU [A,B,C], leés A y luego D. ¿Qué sale?',
      options: ['A', 'B', 'C'],
      answer: 1,
      explanation: 'Leer A produce [B,C,A]; D expulsa B.',
    },
    steps: [
      {
        title: 'Definí el contrato',
        task: 'Elegí capacidad, representación y comportamiento con capacidad cero.',
        why: 'Un caso borde ambiguo se propaga a todas las operaciones.',
        done: 'Tenés ejemplos de vacío, hit y miss.',
      },
      {
        title: 'Implementá el núcleo',
        task: 'Resolvés el ejercicio enlazado y comparás el orden después de cada lectura.',
        why: 'Una traza permite detectar errores de recencia.',
        done: 'Pasan las pruebas y una traza propia.',
      },
      {
        title: 'Agregá una fuente de datos',
        task: 'Creá get(key) que consulte una fuente contada en los misses y almacene su resultado.',
        why: 'La caché debe ahorrar trabajo sin cambiar el valor devuelto.',
        done: 'Una clave repetida devuelve igual dato con menos consultas.',
      },
      {
        title: 'Evaluá otra carga',
        task: 'Compará una secuencia repetida con un barrido mayor a la capacidad; registrá hits y misses.',
        why: 'El rendimiento depende de la carga, no del nombre del algoritmo.',
        done: 'Tu informe incluye la traza y ambas tasas, sin tiempos inventados.',
      },
    ],
    sources: [
      {
        title: 'OSTEP · Replacement policies',
        url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf',
      },
      {
        title: 'std · Vec',
        url: 'https://doc.rust-lang.org/std/vec/struct.Vec.html',
      },
    ],
    related: {
      rust: ['rust-31', 'rust-35'],
      go: ['go-31', 'go-35'],
    },
    bridge: {
      rust: 'Llevá el simulador a Cargo y separá almacenamiento de política mediante un trait. Después evaluá un índice HashMap si necesitás operaciones O(1).',
      go: 'Llevá el simulador a un módulo Go y una interfaz para la fuente. Si varias goroutines comparten la caché, definí sincronización antes de medir.',
    },
    model: 'cache',
    code: {
      rust: 'rust-113',
      go: 'go-113',
    },
  },
  {
    category: 'machine',
    minutes: 45,
    id: 'heap',
    title: 'El estacionamiento de la memoria',
    subtitle: 'First-fit, alineación y fragmentación.',
    level: 'advanced',
    story:
      'Tenés 24 lugares consecutivos para vehículos de distintos tamaños. Muchos lugares libres no garantizan que un vehículo largo encuentre un hueco.',
    what: 'Modelás un allocator con intervalos: reservar divide un hueco, liberar devuelve un bloque y coalescer une huecos contiguos.',
    why: 'La capacidad total y el tamaño del mayor hueco responden preguntas distintas. La alineación también consume espacio aunque el objeto pedido sea pequeño.',
    uses: [
      'Entender allocators de memoria',
      'Pools de objetos y arenas',
      'Diagnosticar fragmentación en sistemas acotados',
    ],
    limits:
      'Heap acá significa región de memoria dinámica; no es un binary heap de prioridad. La simulación no entrega punteros reales, omite metadatos internos y muestra coalescing manual. El núcleo agrega alineación a una lista de huecos.',
    objectives: [
      {
        id: 'allocate',
        label: 'Dividí un hueco reservando memoria',
        why: 'El sobrante mantiene su dirección y tamaño.',
      },
      {
        id: 'fragment',
        label: 'Fallá aunque el total libre alcance',
        why: 'Hace falta un intervalo contiguo suficiente.',
      },
      {
        id: 'coalesce',
        label: 'Uní huecos contiguos',
        why: 'Coalescer reorganiza metadatos sin mover objetos.',
      },
    ],
    prediction: {
      question:
        'Hay huecos de 6 y 6 separados por un bloque vivo. ¿Entra una reserva contigua de 8?',
      options: [
        'Sí: hay 12 libres',
        'No: ningún hueco tiene 8',
        'Sí, si se cambia el nombre del bloque',
      ],
      answer: 1,
      explanation: 'La suma no vuelve contiguos los intervalos.',
    },
    steps: [
      {
        title: 'Representá intervalos',
        task: 'Usá rangos [inicio,fin) ordenados sin solapamientos.',
        why: 'Un invariante geométrico permite revisar todas las operaciones.',
        done: 'Cada unidad está libre o asignada exactamente una vez.',
      },
      {
        title: 'Encontrá first-fit alineado',
        task: 'Implementá el núcleo y explicitá padding, tamaño y overflow.',
        why: 'La primera dirección libre puede no cumplir la alineación.',
        done: 'Pasan casos con padding y falta de espacio.',
      },
      {
        title: 'Reservá y liberá',
        task: 'Agregá IDs de asignación, split y rechazo de liberaciones desconocidas.',
        why: 'El dueño de cada rango evita liberar dos veces.',
        done: 'Una secuencia alloc/free conserva la capacidad total.',
      },
      {
        title: 'Coalescé y mostrálos',
        task: 'Uní vecinos libres y exportá una traza de bloques en tu CLI.',
        why: 'Un modelo visible permite explicar fragmentación sin punteros peligrosos.',
        done: 'Reproducís un fallo por fragmentación y su recuperación.',
      },
    ],
    sources: [
      {
        title: 'OSTEP · Free-space management',
        url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf',
      },
      {
        title: 'Writing an OS in Rust · Allocator designs',
        url: 'https://os.phil-opp.com/allocator-designs/',
      },
    ],
    related: {
      rust: ['rust-51', 'rust-71'],
      go: ['go-16', 'go-75'],
    },
    bridge: {
      rust: 'Empezá como simulador seguro en Cargo. Un GlobalAlloc real exige contratos de alineación, concurrencia y unsafe; el tutorial externo es otra etapa, no algo que se ejecute aquí.',
      go: 'Implementá un pool de índices sobre un buffer y medí su utilidad. Go administra objetos con su runtime y GC: este allocator de juguete no reemplaza al GC.',
    },
    model: 'heap',
    code: {
      rust: 'rust-114',
      go: 'go-114',
    },
  },
  {
    category: 'machine',
    minutes: 45,
    id: 'mmu',
    title: 'Direcciones con pasaporte',
    subtitle: 'Páginas, marcos y permisos.',
    level: 'advanced',
    story:
      'Tu programa pide una dirección de su mapa. Antes de llegar a la memoria, un control traduce el destino y comprueba si esa operación está permitida.',
    what: 'Separás una dirección virtual en número de página y offset; la tabla elige un marco físico y permisos.',
    why: 'El mismo offset puede conservarse mientras cambia la ubicación física de la página. Una dirección válida numéricamente todavía puede estar ausente o prohibida.',
    uses: [
      'Aislamiento entre procesos',
      'Memoria virtual de sistemas operativos',
      'Depurar fallos de acceso y permisos',
    ],
    limits:
      'La MMU real es hardware gobernado por estructuras del sistema operativo. Este software simula una tabla de un nivel, sin page walks multinivel, swap, TLB, bits accessed/dirty ni privilegios completos.',
    objectives: [
      {
        id: 'translate',
        label: 'Traducí una lectura permitida',
        why: 'El offset debe preservarse.',
      },
      {
        id: 'protection',
        label: 'Provocá una escritura prohibida',
        why: 'Presencia y permiso son condiciones distintas.',
      },
      {
        id: 'map',
        label: 'Mapeá una página y accedé',
        why: 'La política de mapeo habilita una traducción nueva.',
      },
    ],
    prediction: {
      question: 'Página de tamaño 4: VA 9 usa VPN 2, mapeada al marco 3. ¿Cuál es PA?',
      options: ['9', '12', '13'],
      answer: 2,
      explanation: 'Offset=1; PA=3×4+1.',
    },
    steps: [
      {
        title: 'Especificá tu formato',
        task: 'Elegí tamaño de página y entradas con marco/presente/escritura.',
        why: 'Los formatos reales varían por arquitectura.',
        done: 'Podés descomponer tres direcciones a mano.',
      },
      {
        title: 'Implementá traducción',
        task: 'Completá el núcleo con errores de rango, ausencia, permisos y overflow.',
        why: 'No debe surgir una dirección física tras una validación fallida.',
        done: 'Pasaron traducciones y rechazos.',
      },
      {
        title: 'Agregá espacios de proceso',
        task: 'Dos procesos tienen tablas distintas sobre una memoria física simulada.',
        why: 'Aislamiento significa que igual VA puede referir a distinto PA.',
        done: 'Probás dos procesos con VA iguales y datos separados.',
      },
      {
        title: 'Conectá con un kernel educativo',
        task: 'Leé el manejo de tablas en xv6 o el tutorial Rust y trazá una entrada real.',
        why: 'El simulador prepara vocabulario; el kernel agrega formato y privilegios.',
        done: 'Documentaste qué simplificaciones ya no valen fuera del modelo.',
      },
    ],
    sources: [
      {
        title: 'OSTEP · Paging',
        url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf',
      },
      {
        title: 'xv6 RISC-V · Repository',
        url: 'https://github.com/mit-pdos/xv6-riscv',
      },
    ],
    related: {
      rust: ['rust-26', 'rust-69'],
      go: ['go-26', 'go-28'],
    },
    bridge: {
      rust: 'Una función pura de traducción se prueba con std. Activar paginación requiere un proyecto de kernel, tablas alineadas e instrucciones de arquitectura fuera del Playground.',
      go: 'Go sirve para implementar el simulador y herramientas de inspección. Un programa Go estándar sobre su runtime/OS no puede reemplazar la MMU del proceso.',
    },
    model: 'mmu',
    code: {
      rust: 'rust-115',
      go: 'go-115',
    },
  },
  {
    category: 'machine',
    minutes: 45,
    id: 'tlb',
    title: 'La dirección que quedó vieja',
    subtitle: 'Cachear traducciones también exige invalidarlas.',
    level: 'expert',
    story:
      'Actualizaste el directorio, pero el mensajero sigue usando la dirección que anotó en su bolsillo. La copia rápida ahora discrepa de la fuente.',
    what: 'Observás hits y misses de una TLB, provocás una traducción obsoleta y la recuperás con invalidación explícita.',
    why: 'Modificar el dato principal y mantener sus copias coherentes son operaciones distintas. El software del sistema debe cumplir las reglas de invalidación y orden de la arquitectura.',
    uses: [
      'Cambios de permisos y mapeos',
      'Diseño de kernels con varios núcleos',
      'Entender por qué existen TLB shootdowns',
    ],
    limits:
      'La traducción vieja es un escenario deliberadamente incorrecto. Simulamos una sola TLB y un solo espacio; no emulamos instrucciones privilegiadas, barreras, ASIDs, coherencia ni shootdown real. El núcleo practica invalidación selectiva por ASID/VPN.',
    objectives: [
      {
        id: 'hit',
        label: 'Obtené un hit de traducción',
        why: 'Evita volver a consultar la tabla.',
      },
      {
        id: 'stale',
        label: 'Observá una copia obsoleta',
        why: 'La tabla y la TLB pueden discrepar si se omite mantenimiento.',
      },
      {
        id: 'recover',
        label: 'Invalidá y cargá el marco nuevo',
        why: 'El miss posterior consulta la fuente actualizada.',
      },
    ],
    prediction: {
      question:
        'Cambiaste la tabla de marco 1 a 3, pero conservaste una TLB con marco 1. En este modelo, ¿qué usa el siguiente hit?',
      options: ['Marco 1', 'Marco 3 automáticamente', 'El promedio de ambos'],
      answer: 0,
      explanation:
        'Un hit usa la copia cacheada: esa es precisamente la inconsistencia que hay que resolver.',
    },
    steps: [
      {
        title: 'Dibujá fuente y copia',
        task: 'Añadí una TLB al traductor con métricas de hit/miss.',
        why: 'Cachear una traducción no cambia el contrato de permisos.',
        done: 'Podés señalar qué lectura consulta cada estructura.',
      },
      {
        title: 'Invalidá selectivamente',
        task: 'Implementá el núcleo por ASID y VPN; probá coincidencias parciales.',
        why: 'Invalidar demasiado o demasiado poco tiene consecuencias distintas.',
        done: 'Una entrada de otro espacio permanece intacta.',
      },
      {
        title: 'Reproducí el fallo',
        task: 'Cambiá tabla sin invalidar, observá la copia vieja y aplicá el protocolo correcto.',
        why: 'Un test negativo muestra por qué existe la operación.',
        done: 'Tenés trazas antes y después de invalidar.',
      },
      {
        title: 'Extendé a dos núcleos',
        task: 'Modelá dos TLB y un mensaje de invalidación con confirmación, sin hilos reales al principio.',
        why: 'La copia de un núcleo no representa las copias de todos.',
        done: 'La prueba no reutiliza el marco hasta ambas confirmaciones.',
      },
    ],
    sources: [
      {
        title: 'OSTEP · TLBs',
        url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf',
      },
      {
        title: 'Writing an OS in Rust · Paging',
        url: 'https://os.phil-opp.com/paging-implementation/',
      },
    ],
    related: {
      rust: ['rust-34', 'rust-67'],
      go: ['go-31', 'go-74'],
    },
    bridge: {
      rust: 'Mantené el protocolo como máquina de estados comprobable. En un kernel real consultá la especificación de la arquitectura y su operación de invalidación; no alcanza con borrar un Vec.',
      go: 'Usá el modelo para entender coherencia y mensajes de confirmación. Go estándar ejecuta sobre un runtime/OS y no emite invalidaciones de TLB desde estas funciones.',
    },
    model: 'tlb',
    code: {
      rust: 'rust-116',
      go: 'go-116',
    },
  },
  {
    category: 'machine',
    minutes: 45,
    id: 'vm',
    title: 'Construí una máquina diminuta',
    subtitle: 'Bytecode, instrucciones y límites de ejecución.',
    level: 'advanced',
    story:
      'Te entregaron seis bytes y una CPU inventada. Cada paso revela dónde termina el dato y empieza la instrucción que le da significado.',
    what: 'Vas a especificar una ISA pequeña, validar límites de instrucciones y ejecutar un intérprete paso a paso.',
    why: 'Un programa puede estar formado por bytes válidos y aun saltar al medio de un operando. Decodificar, validar y ejecutar son responsabilidades distintas.',
    uses: [
      'Intérpretes de lenguajes',
      'Motores de reglas y scripting',
      'Comprender bytecode y herramientas de depuración',
    ],
    limits:
      'Esta VM es un intérprete de una ISA inventada; no es QEMU, una JVM ni un contenedor. No ejecuta código nativo ni emula dispositivos. Un presupuesto de pasos no equivale a un sandbox general.',
    objectives: [
      {
        id: 'branch',
        label: 'Tomá un salto condicional',
        why: 'PC deja de avanzar secuencialmente.',
      },
      {
        id: 'halt',
        label: 'Terminá el programa normal',
        why: 'HALT es una instrucción explícita.',
      },
      {
        id: 'bounded',
        label: 'Frená el bucle por presupuesto',
        why: 'Un límite permite observar un programa que no progresa.',
      },
    ],
    prediction: {
      question:
        'Una instrucción ocupa opcode y operando. ¿Todo índice dentro del bytecode es un destino de salto válido?',
      options: [
        'Sí, mientras esté en rango',
        'No: debe ser inicio de instrucción',
        'Solo si el byte es par',
      ],
      answer: 1,
      explanation: 'La estructura del programa importa además del rango.',
    },
    steps: [
      {
        title: 'Escribí la ISA',
        task: 'Definí formato, tamaño, efecto y errores de HALT, SET, DEC y JNZ.',
        why: 'Sin semántica precisa no hay intérprete comprobable.',
        done: 'Cada opcode tiene una fila en tu especificación.',
      },
      {
        title: 'Validá el bytecode',
        task: 'Implementá el núcleo que descubre inicios y verifica saltos.',
        why: 'Los operandos no se pueden ejecutar como instrucciones por accidente.',
        done: 'Rechazás opcode desconocido, truncado y salto a operando.',
      },
      {
        title: 'Interpretá con traza',
        task: 'Agregá registros, loop de ejecución y presupuesto; imprimí estado antes de cada paso.',
        why: 'Una traza explica el resultado y los bucles.',
        done: 'El programa normal termina y el bucle agota pasos.',
      },
      {
        title: 'Agregá etiquetas',
        task: 'Creá un ensamblador mínimo que resuelva nombres a offsets y un desensamblador.',
        why: 'Las etiquetas reducen errores manuales de direcciones.',
        done: 'Un programa con etiquetas compila al bytecode esperado.',
      },
    ],
    sources: [
      {
        title: 'Nand2Tetris · VM project',
        url: 'https://www.nand2tetris.org/project08',
      },
      {
        title: 'Rust Book · Enums and match',
        url: 'https://doc.rust-lang.org/book/ch06-02-match.html',
      },
    ],
    related: {
      rust: ['rust-110', 'rust-112'],
      go: ['go-95', 'go-100'],
    },
    bridge: {
      rust: 'Creá un crate con parser, validador e intérprete separados. Un enum puede representar instrucciones ya verificadas, reduciendo estados inválidos durante ejecución.',
      go: 'Creá un módulo con paquetes pequeños para ensamblar y ejecutar; usá tests de tablas y fuzzing del decodificador antes de agregar instrucciones complejas.',
    },
    model: 'vm',
    code: {
      rust: 'rust-117',
      go: 'go-117',
    },
  },
  {
    category: 'machine',
    minutes: 45,
    id: 'stack',
    title: 'Las mochilas de cada llamada',
    subtitle: 'Frames, locales y direcciones de retorno.',
    level: 'medium',
    story:
      'main llama a f y f a g. Cada función deja una mochila con lo necesario para continuar cuando la siguiente termine.',
    what: 'Representás una pila de frames con variables locales propias, continuación y límites de profundidad.',
    why: 'Una variable local pertenece a una invocación, no al nombre global de su función. La continuación explica adónde vuelve RET, incluso al anidar llamadas.',
    uses: ['Comprender recursión', 'Leer stack traces', 'Implementar llamadas en una VM'],
    limits:
      'Es una pila lógica de frames, no la memoria de stack real del compilador. ABIs, registros, inlining, optimizaciones y stacks que crecen cambian la representación física.',
    objectives: [
      {
        id: 'nested',
        label: 'Anidá dos llamadas',
        why: 'Cada invocación crea un frame distinto.',
      },
      {
        id: 'return',
        label: 'Retorná a una continuación guardada',
        why: 'El llamador recupera su contexto.',
      },
      {
        id: 'guard',
        label: 'Rechazá un límite de pila',
        why: 'Overflow y underflow no deben destruir frames.',
      },
    ],
    prediction: {
      question:
        'main tiene local=2, f crea local=0 y lo cambia a 1. Al retornar, ¿cuánto vale el local de main?',
      options: ['1', '2', '0'],
      answer: 1,
      explanation: 'Son locales de invocaciones diferentes.',
    },
    steps: [
      {
        title: 'Definí el frame',
        task: 'Elegí campos para retorno y locales; reservá un frame raíz.',
        why: 'Separar contexto evita sobrescribir al llamador.',
        done: 'Podés dibujar main→f→g.',
      },
      {
        title: 'Implementá CALL/RET',
        task: 'Completá el núcleo con límite de profundidad y rechazo sin cambios.',
        why: 'Los errores de estructura deben conservar la pila.',
        done: 'Probás llamada, retorno y ambos límites.',
      },
      {
        title: 'Integrá con una VM',
        task: 'Añadí CALL y RET al proyecto bytecode, validando destinos de función.',
        why: 'Los frames conectan control de flujo y estado local.',
        done: 'Una función llama a otra y ambas vuelven correctamente.',
      },
      {
        title: 'Construí un backtrace',
        task: 'Mostrá nombres, PC y locales desde el frame activo hasta main.',
        why: 'Depurar es reconstruir el camino de ejecución.',
        done: 'Ante un error obtenés una traza que explica la cadena de llamadas.',
      },
    ],
    sources: [
      {
        title: 'Nand2Tetris · Function calls',
        url: 'https://www.nand2tetris.org/project08',
      },
      {
        title: 'Rust Book · Ownership and stack/heap',
        url: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html',
      },
    ],
    related: {
      rust: ['rust-07', 'rust-21'],
      go: ['go-07', 'go-21'],
    },
    bridge: {
      rust: 'Los frames del intérprete pueden vivir en un Vec aunque representen una pila. No confundas la estructura de datos con dónde almacena físicamente cada objeto el programa anfitrión.',
      go: 'Una slice de frames modela la pila de tu VM. Las pilas reales de goroutines las administra el runtime y pueden crecer: no asumas el layout del modelo.',
    },
    model: 'stack',
    code: {
      rust: 'rust-118',
      go: 'go-118',
    },
  },
  {
    category: 'machine',
    minutes: 45,
    id: 'scheduler',
    title: 'Un kernel que reparte turnos',
    subtitle: 'Round-robin, espera y finalización.',
    level: 'advanced',
    story:
      'Tres tareas comparten un solo sillón de CPU. Una tarea puede usar su turno, terminar o salir a esperar una respuesta de I/O.',
    what: 'Implementás el núcleo determinista de un planificador round-robin y después separás listas de tareas listas, bloqueadas y terminadas.',
    why: 'Bloqueada no significa terminada. El quantum controla cuánto puede ocupar una tarea antes de ceder, pero una política justa necesita definir llegada, espera y costos.',
    uses: [
      'Entender planificación de procesos',
      'Diseñar ejecutores cooperativos',
      'Analizar latencia y respuesta de tareas',
    ],
    limits:
      'El modelo es uniprocesador con ticks y sin costo de cambio de contexto. No crea procesos ni interrumpe la CPU real. El scheduler de goroutines de Go y un kernel moderno son más complejos que esta cola.',
    objectives: [
      {
        id: 'rotate',
        label: 'Devolvé una tarea pendiente al final',
        why: 'Un quantum no implica finalización.',
      },
      {
        id: 'wake',
        label: 'Bloqueá y despertá una tarea',
        why: 'Un evento la hace lista otra vez.',
      },
      {
        id: 'finish',
        label: 'Terminá las tres tareas',
        why: 'Una tarea sin trabajo no debe reencolarse.',
      },
    ],
    prediction: {
      question:
        'Después de consumir su quantum, A todavía tiene trabajo y B espera lista. ¿Dónde va A?',
      options: ['Al final de la cola de listos', 'A terminadas', 'De nuevo al frente siempre'],
      answer: 0,
      explanation: 'Round-robin permite que otra tarea lista reciba el próximo turno.',
    },
    steps: [
      {
        title: 'Modelá los estados',
        task: 'Diferenciá lista, bloqueada, ejecutando y terminada.',
        why: 'Estados explícitos evitan ejecutar tareas que esperan un evento.',
        done: 'Cada tarea ocupa un único estado.',
      },
      {
        title: 'Implementá round-robin',
        task: 'Completá el núcleo con quantum positivo y tareas de trabajo cero.',
        why: 'Un quantum cero impediría progresar.',
        done: 'Tenés una traza manual y una verificada.',
      },
      {
        title: 'Agregá eventos de I/O',
        task: 'Permití bloquear y despertar con un orden determinista de eventos.',
        why: 'Los tiempos de espera cambian la cola disponible.',
        done: 'Una tarea bloqueada no consume CPU antes de despertar.',
      },
      {
        title: 'Medí respuesta',
        task: 'Registrá primer turno y finalización para varias duraciones de quantum.',
        why: 'La elección del quantum tiene compromisos observables.',
        done: 'Comparás métricas y declarás que omitiste costos de contexto.',
      },
    ],
    sources: [
      {
        title: 'OSTEP · CPU scheduling',
        url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf',
      },
      {
        title: 'xv6 RISC-V · Teaching kernel',
        url: 'https://pdos.csail.mit.edu/6.828/2025/xv6.html',
      },
    ],
    related: {
      rust: ['rust-35', 'rust-46'],
      go: ['go-41', 'go-45'],
    },
    bridge: {
      rust: 'Llevá el simulador a Cargo y después leé swtch/scheduler en xv6 para identificar lo que falta: contexto de CPU, traps, locks y privilegios.',
      go: 'Usá una función pura para la política y goroutines solo cuando estudies su interacción con el runtime. Crear goroutines no equivale a escribir el scheduler del kernel.',
    },
    model: 'scheduler',
    code: {
      rust: 'rust-119',
      go: 'go-119',
    },
  },
  {
    category: 'machine',
    minutes: 45,
    id: 'interrupts',
    title: 'El timbre del hardware',
    subtitle: 'MMIO, máscaras, ISR y confirmación.',
    level: 'expert',
    story:
      'Un periférico deja un byte y toca timbre. Silenciar el timbre no elimina el byte; atender tampoco significa haber confirmado el evento.',
    what: 'Modelás registros de un periférico, un evento pendiente, una máscara de entrega y el ciclo entrar a ISR→atender→ACK.',
    why: 'Los registros MMIO tienen semántica de dispositivo, no de variables comunes. Algunas escrituras activan acciones y algunas lecturas tienen efectos; el manual especifica cada caso.',
    uses: [
      'Drivers de dispositivos',
      'Firmware en microcontroladores',
      'Manejo de timers, UART e interrupciones',
    ],
    limits:
      'No hay hardware conectado. El dispositivo ficticio usa un único byte RX y PENDING write-one-to-clear; otros dispositivos difieren. Rust bare metal requiere no_std, arranque y target; Go estándar usa runtime/OS, mientras TinyGo admite algunos targets embebidos con límites de bibliotecas y lenguaje. Ningún kernel o firmware se flashea desde este Playground.',
    objectives: [
      {
        id: 'masked',
        label: 'Dejá pendiente un evento enmascarado',
        why: 'La máscara controla entrega, no borra el evento.',
      },
      {
        id: 'deliver',
        label: 'Atendé y confirmá una IRQ',
        why: 'ACK completa el protocolo del dispositivo.',
      },
      {
        id: 'again',
        label: 'Recibí un segundo evento',
        why: 'La atención anterior no debe bloquear para siempre las siguientes.',
      },
    ],
    prediction: {
      question: 'ENABLE=0 y el periférico activa PENDING. ¿Qué sucede en este modelo?',
      options: [
        'Se borra el evento',
        'Queda pendiente sin entrar a ISR',
        'La CPU entra a ISR de todos modos',
      ],
      answer: 1,
      explanation: 'La máscara impide la entrega; no borra el registro pendiente.',
    },
    steps: [
      {
        title: 'Especificá registros',
        task: 'Definí RX, PENDING, ENABLE y qué escrituras confirman el evento.',
        why: 'No podés adivinar efectos de MMIO por el nombre del registro.',
        done: 'Tenés una tabla de lectura/escritura y efectos.',
      },
      {
        title: 'Elegí una IRQ',
        task: 'Implementá el núcleo que elige el menor bit pendiente y habilitado, y solo limpia ese bit.',
        why: 'Atender un evento no debe perder los otros.',
        done: 'Probás múltiples pendientes y una máscara vacía.',
      },
      {
        title: 'Separá ISR de trabajo',
        task: 'La ISR encola un dato; un consumidor lo procesa fuera de la atención.',
        why: 'Una ISR larga retrasa otras tareas e interrupciones.',
        done: 'Definiste capacidad y política de overflow del buffer.',
      },
      {
        title: 'Elegí un proyecto externo',
        task: 'Seguí un target concreto en un emulador o placa con su manual y toolchain.',
        why: 'Arranque, memoria, volatile, barreras y sincronización dependen del entorno.',
        done: 'Podés explicar qué parte probaste en modelo y cuál en hardware/emulador.',
      },
    ],
    sources: [
      {
        title: 'Writing an OS in Rust · Interrupts',
        url: 'https://os.phil-opp.com/hardware-interrupts/',
      },
      {
        title: 'Rust · Volatile writes',
        url: 'https://doc.rust-lang.org/std/ptr/fn.write_volatile.html',
      },
      {
        title: 'TinyGo · Supported language features',
        url: 'https://tinygo.org/docs/reference/lang-support/',
      },
      {
        title: 'Go FAQ · Runtime',
        url: 'https://go.dev/doc/faq#runtime',
      },
      {
        title: 'Writing an OS in Rust · Repository',
        url: 'https://github.com/phil-opp/blog_os',
      },
    ],
    related: {
      rust: ['rust-67', 'rust-72'],
      go: ['go-71', 'go-75'],
    },
    bridge: {
      rust: 'El modelo usa enteros seguros. Un driver real encapsula acceso volatile y contratos unsafe; volatile por sí solo no brinda atomicidad ni sincronización entre hilos.',
      go: 'Para simulación usá Go estándar. Para una placa, verificá primero soporte concreto de TinyGo y sus paquetes machine; no asumas que todo programa o dependencia de Go funciona allí.',
    },
    model: 'interrupts',
    code: {
      rust: 'rust-120',
      go: 'go-120',
    },
  },
];
