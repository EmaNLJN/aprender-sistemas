import type { Exercise } from '../model/types';

// Núcleos Rust y Go de los ocho talleres lowlevel. Antes se derivaban de la ficha (tema,
// nivel, introducción, fuentes y predicción) y de `113 + índice` / `25 + índice`; ahora todo
// es dato explícito y el catálogo no se lee al evaluarse. Cada bloque `*Shared` reúne el
// texto que Rust y Go comparten.

const cacheShared = {
  title: 'Núcleo · Reproducí una traza LRU',
  instructions: [
    'Buscá la clave antes de insertar; nunca dupliques una entrada.',
    'Un hit también cambia la recencia.',
    'Separá el contador de misses de la decisión de almacenar cuando capacidad es cero.',
  ],
  hints: [
    'Una lista pequeña sirve aunque su búsqueda sea lineal.',
    'Si encontrás la clave, quitá su posición y agregala al final.',
    'Si no estaba y la lista está llena, quitá el primer elemento antes de agregar.',
  ],
  review: {
    success:
      'La traza distingue actualización de recencia, expulsión y capacidad cero. Los contadores representan accesos, no tiempo medido.',
    pitfall:
      'Este núcleo es O(accesos×capacidad). Una lista que expulsa solo por orden de inserción implementa FIFO, no LRU.',
  },
  transfer: 'Devolvé además la clave expulsada en cada paso y compará la misma traza contra FIFO.',
  intro:
    'Vas a construir una caché LRU de capacidad fija y reproducir trazas de acceso. Cada hit mueve la entrada a la posición más reciente. En este ejercicio construís un núcleo verificable del proyecto; las cuatro etapas del taller lo convierten después en una herramienta completa.',
  why: 'Separar corrección de política permite preguntar qué datos se devuelven y, después, cuántas consultas evitaste. Una política puede funcionar bien con una carga y mal con otra.',
  prediction: {
    question: 'Con orden LRU→MRU [A,B,C], leés A y luego D. ¿Qué sale?',
    options: ['A', 'B', 'C'],
    answer: 1,
    explanation: 'Leer A produce [B,C,A]; D expulsa B.',
  },
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
};

const heapShared = {
  title: 'Núcleo · Encontrá un hueco alineado',
  objective:
    'Cada hueco es (inicio,tamaño) con enteros u64/uint64. Buscá el primero en el orden recibido que contenga tamaño pedido >0, empezando en una dirección múltiplo de alineación. Alineación debe ser potencia de dos y >0. Ignorá huecos cuyo inicio+tamaño desborde. No cambies los huecos. Devolvé índice y dirección; señalá ausencia si parámetros inválidos o nada entra.',
  instructions: [
    'Calculá el padding hasta el próximo múltiplo sin sumar ciegamente alineación−1.',
    'El padding también ocupa parte del hueco disponible.',
    'Probá un final de intervalo que no cabe en u64.',
  ],
  hints: [
    'Si inicio%alineación es cero, padding=0; si no, padding=alineación−resto.',
    'Comprobá padding<=tamaño del hueco antes de restarlo.',
    'El pedido entra si pedido<=hueco.tamaño−padding y las sumas son representables.',
  ],
  review: {
    success:
      'Los casos verifican alineación, orden first-fit y rechazo de intervalos no representables. La función solo encuentra una ubicación; reservarla requiere dividir el hueco después.',
    pitfall:
      'Redondear el inicio sin descontar padding puede aceptar un bloque que termina fuera del hueco. No se manipulan punteros reales.',
  },
  transfer:
    'Devolvé los intervalos libres anterior y posterior a la reserva y probá que no se solapan con lo asignado.',
  intro:
    'Modelás un allocator con intervalos: reservar divide un hueco, liberar devuelve un bloque y coalescer une huecos contiguos. En este ejercicio construís un núcleo verificable del proyecto; las cuatro etapas del taller lo convierten después en una herramienta completa.',
  why: 'La capacidad total y el tamaño del mayor hueco responden preguntas distintas. La alineación también consume espacio aunque el objeto pedido sea pequeño.',
  prediction: {
    question: 'Hay huecos de 6 y 6 separados por un bloque vivo. ¿Entra una reserva contigua de 8?',
    options: [
      'Sí: hay 12 libres',
      'No: ningún hueco tiene 8',
      'Sí, si se cambia el nombre del bloque',
    ],
    answer: 1,
    explanation: 'La suma no vuelve contiguos los intervalos.',
  },
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
};

const mmuShared = {
  title: 'Núcleo · Traducí sin saltarte los permisos',
  instructions: [
    'Validá antes de indexar y antes de calcular dirección física.',
    'Una lectura no exige permiso de escritura.',
    'Comprobá multiplicación y suma sin depender del modo debug/release.',
  ],
  hints: [
    'VPN=VA/tamaño y offset=VA%tamaño.',
    'Separá falta de entrada de una entrada marcada no presente.',
    'Rust ofrece checked_mul/checked_add; en Go comprobá contra máximo antes de operar.',
  ],
  review: {
    success:
      'Los casos verifican offset, presencia y permiso antes de producir una dirección física. No se lee memoria real: la dirección es un número del modelo.',
    pitfall:
      'Un resultado numérico en rango no demuestra que el proceso tenga derecho a usarlo. La autorización es parte del contrato de traducción.',
  },
  transfer:
    'Agregá un bit de ejecución y una operación Fetch; distinguí leer datos de ejecutar instrucciones.',
  intro:
    'Separás una dirección virtual en número de página y offset; la tabla elige un marco físico y permisos. En este ejercicio construís un núcleo verificable del proyecto; las cuatro etapas del taller lo convierten después en una herramienta completa.',
  why: 'El mismo offset puede conservarse mientras cambia la ubicación física de la página. Una dirección válida numéricamente todavía puede estar ausente o prohibida.',
  prediction: {
    question: 'Página de tamaño 4: VA 9 usa VPN 2, mapeada al marco 3. ¿Cuál es PA?',
    options: ['9', '12', '13'],
    answer: 2,
    explanation: 'Offset=1; PA=3×4+1.',
  },
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
};

const tlbShared = {
  title: 'Núcleo · Invalidá solo las traducciones correctas',
  instructions: [
    'La condición exige coincidencia de espacio Y de página, salvo invalidación de todo el espacio.',
    'Una página idéntica de otro ASID no se elimina.',
    'Contá eliminadas a partir de tamaños o durante el filtrado.',
  ],
  hints: [
    'Pensá primero qué entrada debe borrarse; después negá la condición para conservar.',
    'Una invalidación repetida es idempotente: la segunda elimina cero.',
    'No elimines por marco físico: la clave del pedido es ASID/VPN.',
  ],
  review: {
    success:
      'Los casos verifican aislamiento entre espacios, invalidación total de un ASID e idempotencia. Es un filtro de datos que modela selección de entradas.',
    pitfall:
      'Borrar una lista no ejecuta una instrucción privilegiada real. Las TLB de otros núcleos y las barreras requieren un protocolo adicional.',
  },
  transfer:
    'Modelá dos núcleos y no declares completado el cambio hasta recibir ambas confirmaciones de invalidación.',
  intro:
    'Observás hits y misses de una TLB, provocás una traducción obsoleta y la recuperás con invalidación explícita. En este ejercicio construís un núcleo verificable del proyecto; las cuatro etapas del taller lo convierten después en una herramienta completa.',
  why: 'Modificar el dato principal y mantener sus copias coherentes son operaciones distintas. El software del sistema debe cumplir las reglas de invalidación y orden de la arquitectura.',
  prediction: {
    question:
      'Cambiaste la tabla de marco 1 a 3, pero conservaste una TLB con marco 1. En este modelo, ¿qué usa el siguiente hit?',
    options: ['Marco 1', 'Marco 3 automáticamente', 'El promedio de ambos'],
    answer: 0,
    explanation:
      'Un hit usa la copia cacheada: esa es precisamente la inconsistencia que hay que resolver.',
  },
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
};

const vmShared = {
  title: 'Núcleo · Los saltos aterrizan en instrucciones',
  instructions: [
    'Primera pasada: registrá inicios y destinos de saltos mientras avanzás según tamaño.',
    'No interpretes el valor de un operando como opcode.',
    'Segunda pasada: rechazá destinos fuera del programa o dentro de un operando.',
  ],
  hints: [
    'Un salto hacia adelante puede apuntar a un inicio que todavía no conocés en la primera pasada.',
    'SET y JNZ comparten tamaño, pero solo JNZ agrega un destino para validar.',
    'Probá [1,7,3,1,0]: el destino 1 es el operando de SET, no una instrucción.',
  ],
  review: {
    success:
      'Los casos separan estructura de instrucciones y validez de destinos. Un programa estructuralmente válido puede fallar o consumir todos sus pasos al ejecutarse.',
    pitfall:
      'Validar bytes no resuelve el problema de terminación ni demuestra que el algoritmo del programa sea correcto. El intérprete sigue necesitando límites y errores propios.',
  },
  transfer:
    'Agregá un desensamblador que muestre offset, nombre y operando solo después de superar esta validación.',
  intro:
    'Vas a especificar una ISA pequeña, validar límites de instrucciones y ejecutar un intérprete paso a paso. En este ejercicio construís un núcleo verificable del proyecto; las cuatro etapas del taller lo convierten después en una herramienta completa.',
  why: 'Un programa puede estar formado por bytes válidos y aun saltar al medio de un operando. Decodificar, validar y ejecutar son responsabilidades distintas.',
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
};

const stackShared = {
  title: 'Núcleo · CALL y RET conservan al llamador',
  instructions: [
    'Comprobá límites antes de modificar el vector o slice.',
    'El dato devuelto por RET sale del frame quitado, no del llamador.',
    'Los locales del llamador deben quedar intactos.',
  ],
  hints: [
    'CALL necesita !pila.is_empty() y len<limite.',
    'RET necesita len>1; recién entonces pop es válido.',
    'Guardar frames como valores mantiene separados los locales de cada llamada.',
  ],
  review: {
    success:
      'Los casos verifican orden LIFO, continuación y conservación del frame raíz. La pila modela invocaciones; no depende de la ubicación física de estos datos.',
    pitfall:
      'Un límite de profundidad del intérprete no es el tamaño de la pila de ejecución del compilador anfitrión. Este código administra un vector explícito.',
  },
  transfer:
    'Agregá un identificador de función a cada frame y generá un backtrace sin modificar la pila.',
  intro:
    'Representás una pila de frames con variables locales propias, continuación y límites de profundidad. En este ejercicio construís un núcleo verificable del proyecto; las cuatro etapas del taller lo convierten después en una herramienta completa.',
  why: 'Una variable local pertenece a una invocación, no al nombre global de su función. La continuación explica adónde vuelve RET, incluso al anidar llamadas.',
  prediction: {
    question:
      'main tiene local=2, f crea local=0 y lo cambia a 1. Al retornar, ¿cuánto vale el local de main?',
    options: ['1', '2', '0'],
    answer: 1,
    explanation: 'Son locales de invocaciones diferentes.',
  },
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
};

const schedulerShared = {
  title: 'Núcleo · Repartí CPU por quantum',
  instructions: [
    'Copiá el trabajo restante y armá una cola de índices con trabajo positivo.',
    'Registrá un índice por turno, no uno por unidad consumida.',
    'Descartá de la cola las tareas al llegar a cero.',
  ],
  hints: [
    'Una cola FIFO conserva el turno de las otras tareas.',
    'Restá quantum solo si alcanza: de lo contrario el restante pasa a cero.',
    'Con quantum positivo, cada turno reduce el total de trabajo; esa es la razón de terminación.',
  ],
  review: {
    success:
      'Los casos verifican rotación, quantum mayor a uno y exclusión de tareas vacías. La terminación se apoya en reducir trabajo con un quantum positivo.',
    pitfall:
      'La traza no incluye latencia de I/O, llegada de tareas nuevas ni costo de cambio de contexto. Tampoco ejecuta hilos reales.',
  },
  transfer:
    'Devolvé el tiempo de primera ejecución y finalización de cada tarea y compará varios quantums.',
  intro:
    'Implementás el núcleo determinista de un planificador round-robin y después separás listas de tareas listas, bloqueadas y terminadas. En este ejercicio construís un núcleo verificable del proyecto; las cuatro etapas del taller lo convierten después en una herramienta completa.',
  why: 'Bloqueada no significa terminada. El quantum controla cuánto puede ocupar una tarea antes de ceder, pero una política justa necesita definir llegada, espera y costos.',
  prediction: {
    question:
      'Después de consumir su quantum, A todavía tiene trabajo y B espera lista. ¿Dónde va A?',
    options: ['Al final de la cola de listos', 'A terminadas', 'De nuevo al frente siempre'],
    answer: 0,
    explanation: 'Round-robin permite que otra tarea lista reciba el próximo turno.',
  },
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
};

const interruptsShared = {
  title: 'Núcleo · Elegí y confirmá una interrupción',
  instructions: [
    'Calculá candidatas con AND de ambas máscaras.',
    'Elegí un único bit: el menos significativo que esté activo.',
    'Limpiá ese bit en pendientes conservando incluso los pendientes enmascarados.',
  ],
  hints: [
    'El índice es distinto de la máscara: IRQ3 corresponde a 1<<3.',
    'Si candidatas==0 no intentes elegir un bit.',
    'Para limpiar uno: pendientes & !(1<<indice), o &^ en Go.',
  ],
  review: {
    success:
      'Los casos verifican prioridad, máscaras y confirmación selectiva. Un evento no entregable sigue pendiente para una habilitación posterior.',
    pitfall:
      'Prioridad numérica, máscaras y ACK dependen del dispositivo. Esta operación pura no es una ISR real ni determina el comportamiento de registros MMIO.',
  },
  transfer:
    'Agregá prioridad configurable y comprobá que una IRQ de baja prioridad no quede sin atención bajo tu política.',
  intro:
    'Modelás registros de un periférico, un evento pendiente, una máscara de entrega y el ciclo entrar a ISR→atender→ACK. En este ejercicio construís un núcleo verificable del proyecto; las cuatro etapas del taller lo convierten después en una herramienta completa.',
  why: 'Los registros MMIO tienen semántica de dispositivo, no de variables comunes. Algunas escrituras activan acciones y algunas lecturas tienen efectos; el manual especifica cada caso.',
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
};

export const systemsLowlevelCores: Exercise[] = [
  {
    id: 'rust-113',
    language: 'rust',
    topicId: 'rust-systems-cache',
    topic: 'Una caché que aprende tus visitas',
    stage: 25,
    level: 'medium',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: cacheShared.intro,
    why: cacheShared.why,
    prediction: cacheShared.prediction,
    sources: cacheShared.sources,
    title: cacheShared.title,
    objective:
      'Empezá con caché vacía. Cada acceso a una clave presente es hit y la mueve a más reciente. Un miss incrementa misses y, si hay capacidad, inserta la clave expulsando la menos reciente cuando haga falta. Capacidad cero: todos misses, caché vacía. Devolvé (orden menos→más reciente, hits, misses).',
    instructions: cacheShared.instructions,
    hints: cacheShared.hints,
    review: cacheShared.review,
    transfer: cacheShared.transfer,
    starter:
      'fn simular_lru(accesos: &[i32], capacidad: usize) -> (Vec<i32>, usize, usize) {\n    todo!("reproducir accesos y recencia")\n}',
    solution:
      'fn simular_lru(accesos: &[i32], capacidad: usize) -> (Vec<i32>, usize, usize) {\n    let mut orden = Vec::new();\n    let (mut hits, mut misses) = (0, 0);\n    for &clave in accesos {\n        if let Some(i) = orden.iter().position(|&x| x == clave) {\n            hits += 1; orden.remove(i); orden.push(clave);\n        } else {\n            misses += 1;\n            if capacidad > 0 {\n                if orden.len() == capacidad { orden.remove(0); }\n                orden.push(clave);\n            }\n        }\n    }\n    (orden, hits, misses)\n}',
    tests: [
      {
        id: 't1',
        label: 'Un hit protege al reciente',
        expression: 'simular_lru(&[1, 2, 1, 3], 2) == (vec![1, 3], 1, 3)',
        why: 'El acceso repetido a 1 hace que salga 2.',
        failure: 'Promové la clave en cada hit.',
      },
      {
        id: 't2',
        label: 'Capacidad cero y entrada vacía',
        expression:
          'simular_lru(&[9, 9], 0) == (vec![], 0, 2) && simular_lru(&[], 3) == (vec![], 0, 0)',
        why: 'No tener almacenamiento no elimina los accesos contados.',
        failure: 'No intentes remove(0) sobre una caché sin capacidad.',
      },
      {
        id: 't3',
        label: 'Sin duplicados y orden final',
        expression: 'simular_lru(&[4, 4, 2, 4], 3) == (vec![2, 4], 2, 2)',
        why: 'La misma clave ocupa un solo lugar aunque se lea varias veces.',
        failure: 'Quitá la aparición anterior antes de agregar al final.',
      },
    ],
  },
  {
    id: 'go-113',
    language: 'go',
    topicId: 'go-systems-cache',
    topic: 'Una caché que aprende tus visitas',
    stage: 25,
    level: 'medium',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: ['reflect'],
    intro: cacheShared.intro,
    why: cacheShared.why,
    prediction: cacheShared.prediction,
    sources: cacheShared.sources,
    title: cacheShared.title,
    objective:
      'Empezá con caché vacía. Un hit promueve la clave a más reciente. Un miss incrementa misses y, con capacidad positiva, inserta expulsando la menos reciente si está llena. Capacidad <=0: todos misses y salida vacía. Devolvé (orden menos→más reciente, hits, misses). No modifiques accesos.',
    instructions: cacheShared.instructions,
    hints: cacheShared.hints,
    review: cacheShared.review,
    transfer: cacheShared.transfer,
    starter:
      'func SimularLRU(accesos []int, capacidad int) ([]int, int, int) {\n    return nil, 0, 0\n}',
    solution:
      'func SimularLRU(accesos []int, capacidad int) ([]int, int, int) {\n    orden := make([]int, 0)\n    hits, misses := 0, 0\n    for _, clave := range accesos {\n        index := -1\n        for i, x := range orden { if x == clave { index = i; break } }\n        if index >= 0 {\n            hits++\n            orden = append(orden[:index], orden[index+1:]...)\n            orden = append(orden, clave)\n        } else {\n            misses++\n            if capacidad > 0 {\n                if len(orden) == capacidad { orden = orden[1:] }\n                orden = append(orden, clave)\n            }\n        }\n    }\n    return orden, hits, misses\n}',
    tests: [
      {
        id: 't1',
        label: 'Un hit protege al reciente',
        expression:
          'func() bool { o,h,m := SimularLRU([]int{1,2,1,3},2); return reflect.DeepEqual(o,[]int{1,3}) && h==1 && m==3 }()',
        why: 'El acceso repetido a 1 hace que salga 2.',
        failure: 'Promové la clave en cada hit.',
      },
      {
        id: 't2',
        label: 'Sin capacidad y sin accesos',
        expression:
          'func() bool { a,h,m := SimularLRU([]int{9,9},0); b,h2,m2 := SimularLRU(nil,3); c,h3,m3 := SimularLRU([]int{1},-1); return len(a)==0 && h==0 && m==2 && len(b)==0 && h2==0 && m2==0 && len(c)==0 && h3==0 && m3==1 }()',
        why: 'Una capacidad no positiva es un contrato definido.',
        failure: 'Contá los misses incluso si no insertás.',
      },
      {
        id: 't3',
        label: 'Recencia y entrada preservada',
        expression:
          'func() bool { input := []int{4,4,2,4}; o,h,m := SimularLRU(input,3); return reflect.DeepEqual(o,[]int{2,4}) && h==2 && m==2 && reflect.DeepEqual(input,[]int{4,4,2,4}) }()',
        why: 'La caché es estado propio, separado de la traza.',
        failure: 'No uses accesos como buffer para guardar orden.',
      },
    ],
  },
  {
    id: 'rust-114',
    language: 'rust',
    topicId: 'rust-systems-heap',
    topic: 'El estacionamiento de la memoria',
    stage: 26,
    level: 'advanced',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: heapShared.intro,
    why: heapShared.why,
    prediction: heapShared.prediction,
    sources: heapShared.sources,
    title: heapShared.title,
    objective: heapShared.objective,
    instructions: heapShared.instructions,
    hints: heapShared.hints,
    review: heapShared.review,
    transfer: heapShared.transfer,
    starter:
      'fn primer_ajuste(huecos: &[(u64, u64)], pedido: u64, alineacion: u64) -> Option<(usize, u64)> {\n    todo!("encontrar first-fit alineado")\n}',
    solution:
      'fn primer_ajuste(huecos: &[(u64, u64)], pedido: u64, alineacion: u64) -> Option<(usize, u64)> {\n    if pedido == 0 || !alineacion.is_power_of_two() { return None; }\n    for (i, &(inicio, largo)) in huecos.iter().enumerate() {\n        if inicio.checked_add(largo).is_none() { continue; }\n        let resto = inicio % alineacion;\n        let padding = if resto == 0 { 0 } else { alineacion - resto };\n        if padding <= largo && pedido <= largo - padding {\n            if let Some(direccion) = inicio.checked_add(padding) { return Some((i, direccion)); }\n        }\n    }\n    None\n}',
    tests: [
      {
        id: 't1',
        label: 'El padding puede descartar el primer hueco',
        expression:
          'primer_ajuste(&[(3, 5), (16, 8)], 5, 4) == Some((1, 16)) && primer_ajuste(&[(3, 5)], 4, 4) == Some((0, 4))',
        why: 'Redondear 3 a 4 deja solo cuatro unidades útiles.',
        failure: 'Descontá el padding de la capacidad disponible.',
      },
      {
        id: 't2',
        label: 'First-fit y ajuste exacto',
        expression:
          'primer_ajuste(&[(32, 8), (0, 32)], 8, 8) == Some((0, 32)) && primer_ajuste(&[(0, 4)], 4, 1) == Some((0, 0))',
        why: 'Se respeta el orden dado y el límite superior exclusivo.',
        failure: 'First-fit no significa buscar la dirección numéricamente menor.',
      },
      {
        id: 't3',
        label: 'Parámetros y overflow',
        expression:
          'primer_ajuste(&[(0, 20)], 0, 4) == None && primer_ajuste(&[(0, 20)], 1, 3) == None && primer_ajuste(&[(0, 20)], 1, 0) == None && primer_ajuste(&[(u64::MAX-1, 4)], 1, 1) == None',
        why: 'Un intervalo desbordado no representa una región válida.',
        failure: 'checked_add valida el final del hueco antes de intentar usarlo.',
      },
    ],
  },
  {
    id: 'go-114',
    language: 'go',
    topicId: 'go-systems-heap',
    topic: 'El estacionamiento de la memoria',
    stage: 26,
    level: 'advanced',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: heapShared.intro,
    why: heapShared.why,
    prediction: heapShared.prediction,
    sources: heapShared.sources,
    title: heapShared.title,
    objective: heapShared.objective,
    instructions: heapShared.instructions,
    hints: heapShared.hints,
    review: heapShared.review,
    transfer: heapShared.transfer,
    starter:
      'type Hueco struct { Inicio, Largo uint64 }\nfunc PrimerAjuste(huecos []Hueco, pedido, alineacion uint64) (int, uint64, bool) {\n    return -1, 0, false\n}',
    solution:
      'type Hueco struct { Inicio, Largo uint64 }\nfunc PrimerAjuste(huecos []Hueco, pedido, alineacion uint64) (int, uint64, bool) {\n    if pedido == 0 || alineacion == 0 || alineacion&(alineacion-1) != 0 { return -1,0,false }\n    max := ^uint64(0)\n    for i,h := range huecos {\n        if h.Largo > max-h.Inicio { continue }\n        resto, padding := h.Inicio%alineacion, uint64(0)\n        if resto != 0 { padding = alineacion-resto }\n        if padding <= h.Largo && pedido <= h.Largo-padding && padding <= max-h.Inicio {\n            return i,h.Inicio+padding,true\n        }\n    }\n    return -1,0,false\n}',
    tests: [
      {
        id: 't1',
        label: 'El padding consume hueco',
        expression:
          'func() bool { i,a,ok := PrimerAjuste([]Hueco{{3,5},{16,8}},5,4); j,b,ok2 := PrimerAjuste([]Hueco{{3,5}},4,4); return ok && i==1 && a==16 && ok2 && j==0 && b==4 }()',
        why: 'El inicio alineado cambia la capacidad útil.',
        failure: 'Descontá padding antes de comparar pedido.',
      },
      {
        id: 't2',
        label: 'First-fit y ajuste exacto',
        expression:
          'func() bool { i,a,ok := PrimerAjuste([]Hueco{{32,8},{0,32}},8,8); j,b,ok2 := PrimerAjuste([]Hueco{{0,4}},4,1); return ok && i==0 && a==32 && ok2 && j==0 && b==0 }()',
        why: 'El orden recibido define cuál es primero.',
        failure: 'No ordenes los huecos dentro de esta búsqueda.',
      },
      {
        id: 't3',
        label: 'Validación sin wraparound',
        expression:
          'func() bool { _,_,a := PrimerAjuste([]Hueco{{0,20}},0,4); _,_,b := PrimerAjuste([]Hueco{{0,20}},1,3); _,_,c := PrimerAjuste([]Hueco{{0,20}},1,0); _,_,d := PrimerAjuste([]Hueco{{^uint64(0)-1,4}},1,1); return !a && !b && !c && !d }()',
        why: 'Go hace wrap en unsigned: hay que detectar overflow antes de sumar.',
        failure: 'Compará largo contra máximo−inicio.',
      },
    ],
  },
  {
    id: 'rust-115',
    language: 'rust',
    topicId: 'rust-systems-mmu',
    topic: 'Direcciones con pasaporte',
    stage: 27,
    level: 'advanced',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: mmuShared.intro,
    why: mmuShared.why,
    prediction: mmuShared.prediction,
    sources: mmuShared.sources,
    title: mmuShared.title,
    objective:
      'Cada entrada tiene marco, presente y escritura. Tamaño de página debe ser potencia de dos >0. Dividí VA en VPN y offset. Orden de errores: tamaño inválido→"tamano"; VPN fuera de tabla→"pagina"; no presente→"ausente"; escritura no autorizada→"permiso"; dirección física fuera de u64→"overflow". En éxito devolvé marco×tamaño+offset.',
    instructions: mmuShared.instructions,
    hints: mmuShared.hints,
    review: mmuShared.review,
    transfer: mmuShared.transfer,
    starter:
      'struct Pagina { marco: u64, presente: bool, escritura: bool }\nfn traducir(tabla: &[Pagina], tamano: u64, va: u64, escribir: bool) -> Result<u64, &\'static str> {\n    todo!("validar y traducir")\n}',
    solution:
      'struct Pagina { marco: u64, presente: bool, escritura: bool }\nfn traducir(tabla: &[Pagina], tamano: u64, va: u64, escribir: bool) -> Result<u64, &\'static str> {\n    if !tamano.is_power_of_two() { return Err("tamano"); }\n    let vpn = usize::try_from(va / tamano).map_err(|_| "pagina")?;\n    let pagina = tabla.get(vpn).ok_or("pagina")?;\n    if !pagina.presente { return Err("ausente"); }\n    if escribir && !pagina.escritura { return Err("permiso"); }\n    pagina.marco.checked_mul(tamano).and_then(|base| base.checked_add(va % tamano)).ok_or("overflow")\n}',
    tests: [
      {
        id: 't1',
        label: 'Conservar el offset y cambiar el marco',
        expression:
          '{ let t = [Pagina {marco:3,presente:true,escritura:false}, Pagina {marco:1,presente:true,escritura:true}]; traducir(&t,16,5,false)==Ok(53) && traducir(&t,16,18,true)==Ok(18) }',
        why: 'Distintas páginas usan su propio marco y el mismo offset relativo.',
        failure: 'No uses VA completa como offset.',
      },
      {
        id: 't2',
        label: 'Ausencia y protección',
        expression:
          '{ let t = [Pagina {marco:3,presente:true,escritura:false}, Pagina {marco:1,presente:false,escritura:false}]; traducir(&t,16,5,true)==Err("permiso") && traducir(&t,16,16,true)==Err("ausente") && traducir(&t,16,32,false)==Err("pagina") }',
        why: 'Los errores conservan una precedencia explícita.',
        failure: 'Presencia se comprueba antes del permiso.',
      },
      {
        id: 't3',
        label: 'Formato y aritmética',
        expression:
          '{ let t = [Pagina {marco:u64::MAX,presente:true,escritura:true}]; traducir(&t,0,0,false)==Err("tamano") && traducir(&t,3,0,false)==Err("tamano") && traducir(&t,16,1,false)==Err("overflow") }',
        why: 'Ni tamaño cero ni una dirección desbordada producen traducción.',
        failure: 'La multiplicación del marco también puede fallar.',
      },
    ],
  },
  {
    id: 'go-115',
    language: 'go',
    topicId: 'go-systems-mmu',
    topic: 'Direcciones con pasaporte',
    stage: 27,
    level: 'advanced',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: mmuShared.intro,
    why: mmuShared.why,
    prediction: mmuShared.prediction,
    sources: mmuShared.sources,
    title: mmuShared.title,
    objective:
      'Traducir devuelve (PA, motivo), con motivo="" en éxito. Tamaño debe ser potencia de dos >0. Orden de errores: tamaño inválido→"tamano"; VPN fuera→"pagina"; no presente→"ausente"; escritura prohibida→"permiso"; PA no representable en uint64→"overflow". Un error devuelve PA=0. PA=marco×tamaño+(VA%tamaño).',
    instructions: mmuShared.instructions,
    hints: mmuShared.hints,
    review: mmuShared.review,
    transfer: mmuShared.transfer,
    starter:
      'type Pagina struct { Marco uint64; Presente, Escritura bool }\nfunc Traducir(tabla []Pagina, tamano, va uint64, escribir bool) (uint64, string) {\n    return 0, "pendiente"\n}',
    solution:
      'type Pagina struct { Marco uint64; Presente, Escritura bool }\nfunc Traducir(tabla []Pagina, tamano, va uint64, escribir bool) (uint64, string) {\n    if tamano==0 || tamano&(tamano-1)!=0 { return 0,"tamano" }\n    vpn := va/tamano\n    if vpn>=uint64(len(tabla)) { return 0,"pagina" }\n    p := tabla[vpn]\n    if !p.Presente { return 0,"ausente" }\n    if escribir && !p.Escritura { return 0,"permiso" }\n    max, offset := ^uint64(0), va%tamano\n    if p.Marco>max/tamano { return 0,"overflow" }\n    base := p.Marco*tamano\n    if offset>max-base { return 0,"overflow" }\n    return base+offset,""\n}',
    tests: [
      {
        id: 't1',
        label: 'Offset y marco',
        expression:
          'func() bool { t:=[]Pagina{{3,true,false},{1,true,true}}; a,e:=Traducir(t,16,5,false); b,f:=Traducir(t,16,18,true); return a==53 && e=="" && b==18 && f=="" }()',
        why: 'La traducción conserva desplazamiento dentro de la página.',
        failure: 'Calculá VA%tamaño por separado.',
      },
      {
        id: 't2',
        label: 'Ausencia y protección',
        expression:
          'func() bool { t:=[]Pagina{{3,true,false},{1,false,false}}; _,a:=Traducir(t,16,5,true); _,b:=Traducir(t,16,16,true); _,c:=Traducir(t,16,32,false); return a=="permiso" && b=="ausente" && c=="pagina" }()',
        why: 'La entrada ausente falla antes de evaluar escritura.',
        failure: 'No indexes hasta validar VPN.',
      },
      {
        id: 't3',
        label: 'Tamaño y overflow',
        expression:
          'func() bool { t:=[]Pagina{{^uint64(0),true,true}}; _,a:=Traducir(t,0,0,false); _,b:=Traducir(t,3,0,false); p,c:=Traducir(t,16,1,false); return a=="tamano" && b=="tamano" && c=="overflow" && p==0 }()',
        why: 'Las operaciones uint64 no detectan overflow automáticamente.',
        failure: 'Compará marco con máximo/tamaño antes de multiplicar.',
      },
    ],
  },
  {
    id: 'rust-116',
    language: 'rust',
    topicId: 'rust-systems-tlb',
    topic: 'La dirección que quedó vieja',
    stage: 28,
    level: 'expert',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: tlbShared.intro,
    why: tlbShared.why,
    prediction: tlbShared.prediction,
    sources: tlbShared.sources,
    title: tlbShared.title,
    objective:
      'Una entrada TLB contiene ASID, VPN y marco. Invalidá todas las entradas que coincidan con ASID y con la VPN pedida. Si se pide todo el espacio, ignorá VPN. Conservá orden y contenido de las entradas restantes; devolvé cuántas eliminaste. Puede haber duplicados y deben salir todos. ASID=0 es válido.',
    instructions: tlbShared.instructions,
    hints: tlbShared.hints,
    review: tlbShared.review,
    transfer: tlbShared.transfer,
    starter:
      '#[derive(Debug, PartialEq)]\nstruct Entrada { asid: u16, vpn: u64, marco: u64 }\nfn invalidar(tlb: &mut Vec<Entrada>, asid: u16, vpn: Option<u64>) -> usize {\n    todo!("filtrar por ASID y VPN; None significa todo el espacio")\n}',
    solution:
      '#[derive(Debug, PartialEq)]\nstruct Entrada { asid: u16, vpn: u64, marco: u64 }\nfn invalidar(tlb: &mut Vec<Entrada>, asid: u16, vpn: Option<u64>) -> usize {\n    let antes = tlb.len();\n    tlb.retain(|e| !(e.asid == asid && vpn.is_none_or(|pagina| e.vpn == pagina)));\n    antes - tlb.len()\n}',
    tests: [
      {
        id: 't1',
        label: 'Misma página, distinto espacio',
        expression:
          '{ let mut t=vec![Entrada{asid:1,vpn:2,marco:8},Entrada{asid:2,vpn:2,marco:9},Entrada{asid:1,vpn:3,marco:4}]; let n=invalidar(&mut t,1,Some(2)); n==1 && t==vec![Entrada{asid:2,vpn:2,marco:9},Entrada{asid:1,vpn:3,marco:4}] }',
        why: 'El ASID forma parte de la identidad de la traducción.',
        failure: 'No borres todas las entradas con la misma VPN.',
      },
      {
        id: 't2',
        label: 'Todo el espacio y ASID cero',
        expression:
          '{ let mut t=vec![Entrada{asid:0,vpn:1,marco:2},Entrada{asid:4,vpn:1,marco:2},Entrada{asid:0,vpn:9,marco:3}]; invalidar(&mut t,0,None)==2 && t==vec![Entrada{asid:4,vpn:1,marco:2}] }',
        why: 'Una invalidación global del ASID no afecta a otros espacios.',
        failure: 'None amplía páginas, no espacios.',
      },
      {
        id: 't3',
        label: 'Duplicados e idempotencia',
        expression:
          '{ let mut t=vec![Entrada{asid:3,vpn:7,marco:1},Entrada{asid:3,vpn:7,marco:2}]; let a=invalidar(&mut t,3,Some(7)); let b=invalidar(&mut t,3,Some(7)); a==2 && b==0 && t.is_empty() }',
        why: 'Se eliminan todas las coincidencias y repetir no agrega efectos.',
        failure: 'Un remove de la primera coincidencia es insuficiente.',
      },
    ],
  },
  {
    id: 'go-116',
    language: 'go',
    topicId: 'go-systems-tlb',
    topic: 'La dirección que quedó vieja',
    stage: 28,
    level: 'expert',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: ['reflect'],
    intro: tlbShared.intro,
    why: tlbShared.why,
    prediction: tlbShared.prediction,
    sources: tlbShared.sources,
    title: tlbShared.title,
    objective:
      'Invalidar devuelve un slice nuevo y cantidad eliminada. Elimina coincidencias de ASID y VPN; todo=true ignora VPN. Conservá orden y todas las entradas de otros espacios. No modifiques el slice recibido. Eliminá todos los duplicados coincidentes; ASID=0 es válido.',
    instructions: tlbShared.instructions,
    hints: tlbShared.hints,
    review: tlbShared.review,
    transfer: tlbShared.transfer,
    starter:
      'type Entrada struct { ASID uint16; VPN, Marco uint64 }\nfunc Invalidar(tlb []Entrada, asid uint16, vpn uint64, todo bool) ([]Entrada, int) {\n    return tlb, 0\n}',
    solution:
      'type Entrada struct { ASID uint16; VPN, Marco uint64 }\nfunc Invalidar(tlb []Entrada, asid uint16, vpn uint64, todo bool) ([]Entrada, int) {\n    salida := make([]Entrada,0,len(tlb))\n    for _,e := range tlb {\n        if e.ASID==asid && (todo || e.VPN==vpn) { continue }\n        salida=append(salida,e)\n    }\n    return salida,len(tlb)-len(salida)\n}',
    tests: [
      {
        id: 't1',
        label: 'Aislar por espacio',
        expression:
          'func() bool { input:=[]Entrada{{1,2,8},{2,2,9},{1,3,4}}; o,n:=Invalidar(input,1,2,false); return n==1 && reflect.DeepEqual(o,[]Entrada{{2,2,9},{1,3,4}}) && reflect.DeepEqual(input,[]Entrada{{1,2,8},{2,2,9},{1,3,4}}) }()',
        why: 'El filtro conserva el original y las entradas ajenas.',
        failure: 'Reservá salida propia; no filtres sobre tlb[:0].',
      },
      {
        id: 't2',
        label: 'Todas las páginas del ASID cero',
        expression:
          'func() bool { o,n:=Invalidar([]Entrada{{0,1,2},{4,1,2},{0,9,3}},0,999,true); return n==2 && reflect.DeepEqual(o,[]Entrada{{4,1,2}}) }()',
        why: 'todo ignora VPN pero mantiene el filtro de ASID.',
        failure: 'La conjunción con ASID sigue siendo obligatoria.',
      },
      {
        id: 't3',
        label: 'Duplicados e idempotencia',
        expression:
          'func() bool { o,a:=Invalidar([]Entrada{{3,7,1},{3,7,2}},3,7,false); p,b:=Invalidar(o,3,7,false); return a==2 && b==0 && len(p)==0 }()',
        why: 'La segunda invalidación no encuentra nada más.',
        failure: 'Recorré todas las entradas.',
      },
    ],
  },
  {
    id: 'rust-117',
    language: 'rust',
    topicId: 'rust-systems-vm',
    topic: 'Construí una máquina diminuta',
    stage: 29,
    level: 'advanced',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: vmShared.intro,
    why: vmShared.why,
    prediction: vmShared.prediction,
    sources: vmShared.sources,
    title: vmShared.title,
    objective:
      'Bytecode: 0=HALT y 2=DEC ocupan un byte; 1,n=SET y 3,p=JNZ ocupan dos. p es un offset absoluto en bytes. Devolvé todos los inicios de instrucciones, ordenados. Vacío→"vacio"; opcode desconocido→"opcode"; operando faltante→"operando". Primero decodificá TODO, incluso bytes después de HALT; después verificá cada destino JNZ: debe coincidir con un inicio, o "salto". No exigís HALT ni garantizás terminación.',
    instructions: vmShared.instructions,
    hints: vmShared.hints,
    review: vmShared.review,
    transfer: vmShared.transfer,
    starter:
      'fn validar_bytecode(bytes: &[u8]) -> Result<Vec<usize>, &\'static str> {\n    todo!("decodificar límites y verificar saltos")\n}',
    solution:
      'fn validar_bytecode(bytes: &[u8]) -> Result<Vec<usize>, &\'static str> {\n    if bytes.is_empty() { return Err("vacio"); }\n    let (mut inicios, mut saltos) = (Vec::new(), Vec::new());\n    let mut pc = 0;\n    while pc < bytes.len() {\n        inicios.push(pc);\n        match bytes[pc] {\n            0 | 2 => pc += 1,\n            1 | 3 => {\n                let operando = *bytes.get(pc + 1).ok_or("operando")?;\n                if bytes[pc] == 3 { saltos.push(usize::from(operando)); }\n                pc += 2;\n            }\n            _ => return Err("opcode"),\n        }\n    }\n    if saltos.iter().any(|destino| !inicios.contains(destino)) { return Err("salto"); }\n    Ok(inicios)\n}',
    tests: [
      {
        id: 't1',
        label: 'Programa normal y salto hacia adelante',
        expression:
          'validar_bytecode(&[1,3,2,3,2,0]) == Ok(vec![0,2,3,5]) && validar_bytecode(&[3,3,2,0]) == Ok(vec![0,2,3])',
        why: 'Los destinos se verifican después de conocer todos los inicios.',
        failure: 'No rechaces un salto solo porque apunta a una instrucción aún no recorrida.',
      },
      {
        id: 't2',
        label: 'Dentro de operando o fuera del programa',
        expression:
          'validar_bytecode(&[1,7,3,1,0]) == Err("salto") && validar_bytecode(&[3,9,0]) == Err("salto")',
        why: 'Estar dentro del slice es necesario, pero no suficiente.',
        failure: 'La pertenencia se comprueba en inicios, no solo en 0..len.',
      },
      {
        id: 't3',
        label: 'Formato completo antes de destinos',
        expression:
          'validar_bytecode(&[]) == Err("vacio") && validar_bytecode(&[1]) == Err("operando") && validar_bytecode(&[3,9,8]) == Err("opcode") && validar_bytecode(&[0,8]) == Err("opcode") && validar_bytecode(&[2]) == Ok(vec![0])',
        why: 'Se revisa todo el bytecode y no se inventa un requisito de HALT.',
        failure: 'La validación estructural no ejecuta ni se detiene en HALT.',
      },
    ],
  },
  {
    id: 'go-117',
    language: 'go',
    topicId: 'go-systems-vm',
    topic: 'Construí una máquina diminuta',
    stage: 29,
    level: 'advanced',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: ['reflect'],
    intro: vmShared.intro,
    why: vmShared.why,
    prediction: vmShared.prediction,
    sources: vmShared.sources,
    title: vmShared.title,
    objective:
      'Devolvé (inicios,motivo), motivo="" en éxito y nil ante error. Formato: 0 HALT y 2 DEC son un byte; 1,n SET y 3,p JNZ son dos. p apunta a un offset de opcode. Errores: vacío "vacio", opcode desconocido "opcode", operando faltante "operando". Revisá TODO el formato primero, incluso después de HALT; luego destinos fuera de los inicios→"salto". No exigís HALT ni terminación.',
    instructions: vmShared.instructions,
    hints: vmShared.hints,
    review: vmShared.review,
    transfer: vmShared.transfer,
    starter: 'func ValidarBytecode(bytes []byte) ([]int, string) {\n    return nil, "pendiente"\n}',
    solution:
      'func ValidarBytecode(bytes []byte) ([]int, string) {\n    if len(bytes)==0 { return nil,"vacio" }\n    inicios, saltos := []int{}, []int{}\n    for pc:=0; pc<len(bytes); {\n        inicios=append(inicios,pc)\n        switch bytes[pc] {\n        case 0,2: pc++\n        case 1,3:\n            if pc+1>=len(bytes) { return nil,"operando" }\n            if bytes[pc]==3 { saltos=append(saltos,int(bytes[pc+1])) }\n            pc+=2\n        default: return nil,"opcode"\n        }\n    }\n    for _,destino:=range saltos {\n        encontrado:=false\n        for _,inicio:=range inicios { if inicio==destino { encontrado=true; break } }\n        if !encontrado { return nil,"salto" }\n    }\n    return inicios,""\n}',
    tests: [
      {
        id: 't1',
        label: 'Instrucciones y salto futuro',
        expression:
          'func() bool { a,e:=ValidarBytecode([]byte{1,3,2,3,2,0}); b,f:=ValidarBytecode([]byte{3,3,2,0}); return e=="" && f=="" && reflect.DeepEqual(a,[]int{0,2,3,5}) && reflect.DeepEqual(b,[]int{0,2,3}) }()',
        why: 'Los operandos ocupan bytes sin agregar inicios.',
        failure: 'Avanzá dos posiciones en SET y JNZ.',
      },
      {
        id: 't2',
        label: 'Destinos inválidos',
        expression:
          'func() bool { a,e:=ValidarBytecode([]byte{1,7,3,1,0}); b,f:=ValidarBytecode([]byte{3,9,0}); return a==nil && b==nil && e=="salto" && f=="salto" }()',
        why: 'No se puede saltar dentro de un operando.',
        failure: 'Buscá el destino en la lista de inicios.',
      },
      {
        id: 't3',
        label: 'Precedencia y HALT opcional',
        expression:
          'func() bool { _,a:=ValidarBytecode(nil); _,b:=ValidarBytecode([]byte{1}); _,c:=ValidarBytecode([]byte{3,9,8}); _,d:=ValidarBytecode([]byte{0,8}); v,e:=ValidarBytecode([]byte{2}); return a=="vacio" && b=="operando" && c=="opcode" && d=="opcode" && e=="" && reflect.DeepEqual(v,[]int{0}) }()',
        why: 'Un error estructural aparece antes de chequear destinos.',
        failure: 'Decodificá también lo que está después de HALT.',
      },
    ],
  },
  {
    id: 'rust-118',
    language: 'rust',
    topicId: 'rust-systems-stack',
    topic: 'Las mochilas de cada llamada',
    stage: 30,
    level: 'medium',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: stackShared.intro,
    why: stackShared.why,
    prediction: stackShared.prediction,
    sources: stackShared.sources,
    title: stackShared.title,
    objective:
      'La pila contiene un frame raíz y después los de llamadas activas. CALL agrega un frame con retorno y local dados si la pila no está vacía y su longitud es menor al límite; si no, rechaza sin cambios. RET solo quita un frame si hay más de uno y devuelve su retorno; el raíz nunca sale. En todo rechazo conservá la pila. No ejecutes el PC devuelto: solo gestionás frames.',
    instructions: stackShared.instructions,
    hints: stackShared.hints,
    review: stackShared.review,
    transfer: stackShared.transfer,
    starter:
      '#[derive(Debug, Clone, PartialEq)]\nstruct Marco { retorno: usize, local: i32 }\nfn llamar(pila: &mut Vec<Marco>, retorno: usize, local: i32, limite: usize) -> bool {\n    todo!("agregar frame solo si es válido")\n}\nfn retornar(pila: &mut Vec<Marco>) -> Option<usize> {\n    todo!("preservar frame raíz")\n}',
    solution:
      '#[derive(Debug, Clone, PartialEq)]\nstruct Marco { retorno: usize, local: i32 }\nfn llamar(pila: &mut Vec<Marco>, retorno: usize, local: i32, limite: usize) -> bool {\n    if pila.is_empty() || pila.len() >= limite { return false; }\n    pila.push(Marco { retorno, local });\n    true\n}\nfn retornar(pila: &mut Vec<Marco>) -> Option<usize> {\n    if pila.len() <= 1 { return None; }\n    pila.pop().map(|marco| marco.retorno)\n}',
    tests: [
      {
        id: 't1',
        label: 'Llamadas anidadas y retornos LIFO',
        expression:
          '{ let mut p=vec![Marco{retorno:0,local:2}]; let a=llamar(&mut p,7,10,4); let b=llamar(&mut p,12,20,4); let r=retornar(&mut p); let s=retornar(&mut p); a && b && r==Some(12) && s==Some(7) && p==vec![Marco{retorno:0,local:2}] }',
        why: 'La última llamada vuelve primero sin reemplazar al raíz.',
        failure: 'RET devuelve el retorno del frame retirado.',
      },
      {
        id: 't2',
        label: 'Locales independientes',
        expression:
          '{ let mut p=vec![Marco{retorno:0,local:9}]; let ok=llamar(&mut p,3,0,2); p[1].local=5; let r=retornar(&mut p); ok && r==Some(3) && p[0].local==9 }',
        why: 'Modificar el callee no cambia el local guardado en el llamador.',
        failure: 'No guardes todos los locales en una única variable global.',
      },
      {
        id: 't3',
        label: 'Límites sin efectos parciales',
        expression:
          '{ let mut p=vec![Marco{retorno:0,local:4}]; let antes=p.clone(); let a=llamar(&mut p,9,1,1); let b=retornar(&mut p); let mut vacia=Vec::new(); let c=llamar(&mut vacia,1,0,3); !a && b==None && !c && p==antes && vacia.is_empty() }',
        why: 'No crear sobre pila vacía ni quitar raíz forma parte del contrato.',
        failure: 'Validá todas las condiciones antes de push o pop.',
      },
    ],
  },
  {
    id: 'go-118',
    language: 'go',
    topicId: 'go-systems-stack',
    topic: 'Las mochilas de cada llamada',
    stage: 30,
    level: 'medium',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: ['reflect'],
    intro: stackShared.intro,
    why: stackShared.why,
    prediction: stackShared.prediction,
    sources: stackShared.sources,
    title: stackShared.title,
    objective:
      'Llamar recibe puntero a slice, retorno/local y límite: agrega un frame solo si len>0 y len<limite; un límite <=0 también rechaza. Retornar solo quita si len>1 y devuelve (retorno,true); rechazo→(0,false). El raíz nunca sale. No modifiques estado al rechazar. Los punteros recibidos son no nil.',
    instructions: stackShared.instructions,
    hints: stackShared.hints,
    review: stackShared.review,
    transfer: stackShared.transfer,
    starter:
      'type Marco struct { Retorno int; Local int }\nfunc Llamar(pila *[]Marco, retorno, local, limite int) bool {\n    return false\n}\nfunc Retornar(pila *[]Marco) (int, bool) {\n    return 0,false\n}',
    solution:
      'type Marco struct { Retorno int; Local int }\nfunc Llamar(pila *[]Marco, retorno, local, limite int) bool {\n    if len(*pila)==0 || len(*pila)>=limite { return false }\n    *pila=append(*pila,Marco{retorno,local})\n    return true\n}\nfunc Retornar(pila *[]Marco) (int, bool) {\n    if len(*pila)<=1 { return 0,false }\n    index:=len(*pila)-1\n    retorno:=(*pila)[index].Retorno\n    *pila=(*pila)[:index]\n    return retorno,true\n}',
    tests: [
      {
        id: 't1',
        label: 'Retornos anidados',
        expression:
          'func() bool { p:=[]Marco{{0,2}}; a:=Llamar(&p,7,10,4); b:=Llamar(&p,12,20,4); r,ok:=Retornar(&p); s,ok2:=Retornar(&p); return a && b && ok && ok2 && r==12 && s==7 && reflect.DeepEqual(p,[]Marco{{0,2}}) }()',
        why: 'CALL apila y RET usa la continuación más reciente.',
        failure: 'Leé el retorno antes de recortar el slice.',
      },
      {
        id: 't2',
        label: 'Locales separados',
        expression:
          'func() bool { p:=[]Marco{{0,9}}; ok:=Llamar(&p,3,0,2); if !ok { return false }; p[1].Local=5; r,ok2:=Retornar(&p); return ok2 && r==3 && p[0].Local==9 }()',
        why: 'Cada struct contiene el local de una invocación.',
        failure: 'El índice del frame activo es len−1.',
      },
      {
        id: 't3',
        label: 'Raíz y capacidad lógica',
        expression:
          'func() bool { p:=[]Marco{{0,4}}; a:=Llamar(&p,9,1,1); _,b:=Retornar(&p); var vacia []Marco; c:=Llamar(&vacia,1,0,3); d:=Llamar(&p,1,0,-1); return !a && !b && !c && !d && len(vacia)==0 && reflect.DeepEqual(p,[]Marco{{0,4}}) }()',
        why: 'El límite lógico no es cap(slice), y el raíz se conserva.',
        failure: 'Usá el parámetro limite para decidir si se permite otra llamada.',
      },
    ],
  },
  {
    id: 'rust-119',
    language: 'rust',
    topicId: 'rust-systems-scheduler',
    topic: 'Un kernel que reparte turnos',
    stage: 31,
    level: 'advanced',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: schedulerShared.intro,
    why: schedulerShared.why,
    prediction: schedulerShared.prediction,
    sources: schedulerShared.sources,
    title: schedulerShared.title,
    objective:
      'Todas las tareas llegan en orden de índice en tiempo cero. Cada valor indica trabajo restante; cero significa ya terminada y no se encola. Un turno consume min(quantum,restante) y registra una vez el índice. Si queda trabajo, reencolá al final. Devolvé la traza de índices por turno. Quantum cero→"quantum", incluso sin tareas. Entradas: hasta16 tareas, cada una hasta20 unidades. No modifiques la entrada.',
    instructions: schedulerShared.instructions,
    hints: schedulerShared.hints,
    review: schedulerShared.review,
    transfer: schedulerShared.transfer,
    starter:
      'use std::collections::VecDeque;\nfn turnos(trabajo: &[u32], quantum: u32) -> Result<Vec<usize>, &\'static str> {\n    todo!("planificar round-robin")\n}',
    solution:
      'use std::collections::VecDeque;\nfn turnos(trabajo: &[u32], quantum: u32) -> Result<Vec<usize>, &\'static str> {\n    if quantum == 0 { return Err("quantum"); }\n    let mut restante = trabajo.to_vec();\n    let mut cola: VecDeque<usize> = (0..restante.len()).filter(|&i| restante[i] > 0).collect();\n    let mut traza = Vec::new();\n    while let Some(id) = cola.pop_front() {\n        traza.push(id);\n        restante[id] = restante[id].saturating_sub(quantum);\n        if restante[id] > 0 { cola.push_back(id); }\n    }\n    Ok(traza)\n}',
    tests: [
      {
        id: 't1',
        label: 'Turnos de una unidad',
        expression: 'turnos(&[3,2,1],1) == Ok(vec![0,1,2,0,1,0])',
        why: 'Una tarea terminada sale mientras las demás siguen rotando.',
        failure: 'Reencolá solo si queda trabajo.',
      },
      {
        id: 't2',
        label: 'Quantum grande y tareas vacías',
        expression:
          'turnos(&[3,2,1],2) == Ok(vec![0,1,2,0]) && turnos(&[0,2,0],1) == Ok(vec![1,1])',
        why: 'Un turno puede consumir varias unidades, pero agrega un único índice.',
        failure: 'No registres un índice por cada unidad.',
      },
      {
        id: 't3',
        label: 'Validación y entrada intacta',
        expression:
          '{ let input=vec![2,1]; let r=turnos(&input,9); r==Ok(vec![0,1]) && input==vec![2,1] && turnos(&[],1)==Ok(vec![]) && turnos(&[],0)==Err("quantum") }',
        why: 'Un quantum inválido se rechaza antes del caso vacío.',
        failure: 'La función mantiene su propio trabajo restante.',
      },
    ],
  },
  {
    id: 'go-119',
    language: 'go',
    topicId: 'go-systems-scheduler',
    topic: 'Un kernel que reparte turnos',
    stage: 31,
    level: 'advanced',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: ['reflect'],
    intro: schedulerShared.intro,
    why: schedulerShared.why,
    prediction: schedulerShared.prediction,
    sources: schedulerShared.sources,
    title: schedulerShared.title,
    objective:
      'Turnos devuelve (traza,motivo), motivo="" en éxito. Todas llegan en orden de índice. Omití trabajo cero. Cada turno consume min(quantum,restante), registra una vez el índice y reencola si queda trabajo. Quantum cero→(nil,"quantum") aun sin tareas. Hasta16 tareas y20 unidades por tarea. No modifiques trabajo.',
    instructions: schedulerShared.instructions,
    hints: schedulerShared.hints,
    review: schedulerShared.review,
    transfer: schedulerShared.transfer,
    starter:
      'func Turnos(trabajo []uint32, quantum uint32) ([]int, string) {\n    return nil,"pendiente"\n}',
    solution:
      'func Turnos(trabajo []uint32, quantum uint32) ([]int, string) {\n    if quantum==0 { return nil,"quantum" }\n    restante:=append([]uint32(nil),trabajo...)\n    cola, traza:=[]int{},[]int{}\n    for i,n:=range restante { if n>0 { cola=append(cola,i) } }\n    for len(cola)>0 {\n        id:=cola[0]; cola=cola[1:]\n        traza=append(traza,id)\n        if restante[id]<=quantum { restante[id]=0 } else { restante[id]-=quantum }\n        if restante[id]>0 { cola=append(cola,id) }\n    }\n    return traza,""\n}',
    tests: [
      {
        id: 't1',
        label: 'Rotación justa',
        expression:
          'func() bool { r,e:=Turnos([]uint32{3,2,1},1); return e=="" && reflect.DeepEqual(r,[]int{0,1,2,0,1,0}) }()',
        why: 'El orden FIFO reparte turnos mientras cada tarea progresa.',
        failure: 'Sacá del frente y reencolá al final.',
      },
      {
        id: 't2',
        label: 'Quantum y tareas en cero',
        expression:
          'func() bool { a,e:=Turnos([]uint32{3,2,1},2); b,f:=Turnos([]uint32{0,2,0},1); return e=="" && f=="" && reflect.DeepEqual(a,[]int{0,1,2,0}) && reflect.DeepEqual(b,[]int{1,1}) }()',
        why: 'Trabajo cero no necesita un turno ficticio.',
        failure: 'Filtrá antes de formar la cola inicial.',
      },
      {
        id: 't3',
        label: 'Validación y copia del estado',
        expression:
          'func() bool { in:=[]uint32{2,1}; r,e:=Turnos(in,9); a,f:=Turnos(nil,1); b,g:=Turnos(nil,0); return e=="" && reflect.DeepEqual(r,[]int{0,1}) && reflect.DeepEqual(in,[]uint32{2,1}) && len(a)==0 && f=="" && b==nil && g=="quantum" }()',
        why: 'El cálculo no modifica el trabajo recibido.',
        failure: 'Copiá el slice antes de decrementar restantes.',
      },
    ],
  },
  {
    id: 'rust-120',
    language: 'rust',
    topicId: 'rust-systems-interrupts',
    topic: 'El timbre del hardware',
    stage: 32,
    level: 'expert',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: interruptsShared.intro,
    why: interruptsShared.why,
    prediction: interruptsShared.prediction,
    sources: interruptsShared.sources,
    title: interruptsShared.title,
    objective:
      'pendientes y habilitadas son máscaras de8 bits. Elegí la IRQ de menor índice entre pendientes & habilitadas. Devolvé ese índice y la máscara pendiente luego de limpiar SOLO su bit. Sin IRQ entregable, devolvé ausencia y la máscara original. La IRQ0 es la prioridad más alta de este modelo. No accedas a MMIO real.',
    instructions: interruptsShared.instructions,
    hints: interruptsShared.hints,
    review: interruptsShared.review,
    transfer: interruptsShared.transfer,
    starter:
      'fn atender_irq(pendientes: u8, habilitadas: u8) -> (Option<u8>, u8) {\n    todo!("elegir y confirmar una sola IRQ")\n}',
    solution:
      'fn atender_irq(pendientes: u8, habilitadas: u8) -> (Option<u8>, u8) {\n    let candidatas = pendientes & habilitadas;\n    if candidatas == 0 { return (None, pendientes); }\n    let indice = candidatas.trailing_zeros() as u8;\n    (Some(indice), pendientes & !(1u8 << indice))\n}',
    tests: [
      {
        id: 't1',
        label: 'Prioridad y una confirmación a la vez',
        expression:
          'atender_irq(0b1010,0b1111)==(Some(1),0b1000) && atender_irq(0b1000,0b1111)==(Some(3),0)',
        why: 'La primera atención conserva la otra IRQ lista.',
        failure: 'No limpies todas las candidatas a la vez.',
      },
      {
        id: 't2',
        label: 'El bit bajo puede estar enmascarado',
        expression:
          'atender_irq(0b1001,0b1000)==(Some(3),0b0001) && atender_irq(0b1000_0001,0b1000_0000)==(Some(7),1)',
        why: 'Elegís sobre candidatas pero limpiás sobre pendientes originales.',
        failure: 'El evento enmascarado debe conservarse.',
      },
      {
        id: 't3',
        label: 'Sin entrega no hay pérdida',
        expression:
          'atender_irq(0b0101,0b1010)==(None,0b0101) && atender_irq(0,255)==(None,0) && atender_irq(1,1)==(Some(0),0)',
        why: 'Ausencia es distinta de atender IRQ cero.',
        failure: 'Option diferencia None de Some(0).',
      },
    ],
  },
  {
    id: 'go-120',
    language: 'go',
    topicId: 'go-systems-interrupts',
    topic: 'El timbre del hardware',
    stage: 32,
    level: 'expert',
    kind: 'completar',
    minutes: 20,
    visual: 'flow',
    imports: [],
    intro: interruptsShared.intro,
    why: interruptsShared.why,
    prediction: interruptsShared.prediction,
    sources: interruptsShared.sources,
    title: interruptsShared.title,
    objective:
      'Devolvé (índice,nuevosPendientes,true) para el menor bit de pendientes & habilitadas. Limpiá solo ese bit en pendientes. Si ninguno es entregable devolvé (-1,pendientes,false). Bits0..7; IRQ0 tiene mayor prioridad. No accedas a hardware real.',
    instructions: interruptsShared.instructions,
    hints: interruptsShared.hints,
    review: interruptsShared.review,
    transfer: interruptsShared.transfer,
    starter:
      'func AtenderIRQ(pendientes, habilitadas uint8) (int, uint8, bool) {\n    return -1,pendientes,false\n}',
    solution:
      'func AtenderIRQ(pendientes, habilitadas uint8) (int, uint8, bool) {\n    candidatas:=pendientes&habilitadas\n    for i:=0;i<8;i++ {\n        bit:=uint8(1)<<uint(i)\n        if candidatas&bit!=0 { return i,pendientes&^bit,true }\n    }\n    return -1,pendientes,false\n}',
    tests: [
      {
        id: 't1',
        label: 'Una IRQ por atención',
        expression:
          'func() bool { i,p,a:=AtenderIRQ(0b1010,0b1111); j,q,b:=AtenderIRQ(p,0b1111); return a && b && i==1 && p==0b1000 && j==3 && q==0 }()',
        why: 'Confirmar una IRQ no elimina todas las demás.',
        failure: 'Limpiá únicamente el bit seleccionado.',
      },
      {
        id: 't2',
        label: 'Máscara y bit alto',
        expression:
          'func() bool { i,p,a:=AtenderIRQ(0b1001,0b1000); j,q,b:=AtenderIRQ(0b10000001,0b10000000); return a && b && i==3 && p==1 && j==7 && q==1 }()',
        why: 'Los pendientes enmascarados sobreviven.',
        failure: 'No devuelvas candidatas como nuevo pendiente.',
      },
      {
        id: 't3',
        label: 'Sin entrega y IRQ cero',
        expression:
          'func() bool { i,p,a:=AtenderIRQ(0b0101,0b1010); j,q,b:=AtenderIRQ(0,255); k,r,c:=AtenderIRQ(1,1); return !a && i==-1 && p==0b0101 && !b && j==-1 && q==0 && c && k==0 && r==0 }()',
        why: 'El booleano distingue una IRQ real de la ausencia.',
        failure: 'No uses índice0 como señal de que no hubo evento.',
      },
    ],
  },
];
