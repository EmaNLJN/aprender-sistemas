import type { SystemsLanguage, SystemsWorkshop, WorkshopObjective } from '../model/types';

type WorkshopLevel = 'medium' | 'advanced' | 'expert';

interface WorkshopSource {
  title: string;
  url: string;
}

interface InfraObjective extends WorkshopObjective {
  label: string;
  why: string;
}

interface InfraPrediction {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface InfraStep {
  title: string;
  task: string;
  why: string;
  done: string;
}

// Ficha de un taller de infraestructura. El motor sólo lee los campos de `SystemsWorkshop`;
// el resto es contenido que `systems.js` dibuja.
interface InfraWorkshop extends SystemsWorkshop {
  category: 'infra';
  minutes: number;
  sources: WorkshopSource[];
  title: string;
  subtitle: string;
  level: WorkshopLevel;
  story: string;
  what: string;
  why: string;
  uses: string[];
  limits: string;
  objectives: InfraObjective[];
  prediction: InfraPrediction;
  steps: InfraStep[];
  related: Record<SystemsLanguage, string[]>;
  bridge: Record<SystemsLanguage, string>;
}

// Fichas curriculares de los talleres de infraestructura: contenido, no comportamiento.
// La simulación vive en `entities/systems-simulation/models/infra` y los núcleos
// programables en `entities/exercise/content/systems-infra-cores`. El orden de claves
// es el que publicaba systems-infra.js.
export const infraWorkshops: InfraWorkshop[] = [
  {
    id: 'wal',
    category: 'infra',
    model: 'wal',
    minutes: 40,
    sources: [
      { title: 'SQLite · Write-Ahead Logging', url: 'https://sqlite.org/wal.html' },
      { title: 'TigerBeetle · Safety', url: 'https://docs.tigerbeetle.com/concepts/safety/' },
    ],
    code: { rust: 'rust-121', go: 'go-121' },
    title: 'La base que sobrevive al apagón',
    subtitle: 'WAL, commit y recuperación',
    level: 'advanced',
    story:
      'El puesto comercial del rover confirma un saldo, se corta la energía y la cifra desaparece. Tu misión es encontrar qué promesa faltaba y construir un replay que publique solo transacciones completas.',
    what: 'Separás registros preparados, commits visibles y un prefijo durable; después reconstruís estado tras un crash.',
    why: 'Ordenar escrituras y confirmar durabilidad son decisiones distintas. Un registro COMMIT en un buffer no equivale a una barrera persistente completada.',
    uses: ['Motores de bases de datos', 'Journals de aplicaciones', 'Recuperación de servicios'],
    limits:
      'Modelo en memoria de un escritor y una clave. Sync representa una barrera durable exitosa asumida; no ejecuta fsync, no simula sectores rotos, cachés del disco, checkpoints ni fallos de hardware. No es el formato WAL de SQLite.',
    objectives: [
      {
        id: 'wal-loss',
        label: 'Perder un commit no sincronizado',
        why: 'Provocá el corte antes de sync para distinguir visibilidad de durabilidad.',
      },
      {
        id: 'wal-durable',
        label: 'Sincronizar un commit completo',
        why: 'El prefijo durable debe contener PUT y COMMIT.',
      },
      {
        id: 'wal-recovered',
        label: 'Recuperar el valor después del corte',
        why: 'Replay solo publica transacciones comprometidas dentro del prefijo sobreviviente.',
      },
    ],
    prediction: {
      question: 'PUT y COMMIT están en RAM, sin sync; ocurre un corte. ¿Qué promete este modelo?',
      options: [
        'Que el commit siempre sobrevive',
        'Que solo sobrevive el prefijo sincronizado',
        'Que el valor cero es el saldo real',
      ],
      answer: 1,
      explanation:
        'La barrera durable define qué sobrevive. Un commit visible puede perderse si aún estaba fuera de ese prefijo.',
    },
    steps: [
      {
        title: 'Registro primero',
        task: 'Definí PUT y COMMIT con un ID de transacción.',
        why: 'Un replay necesita saber qué escrituras forman una unidad.',
        done: 'Una transacción incompleta no modifica el estado recuperado.',
      },
      {
        title: 'Núcleo ejecutable',
        task: 'Implementá RecoverWAL / recover_wal con el prefijo durable explícito.',
        why: 'La lógica puede probarse sin depender del disco.',
        done: 'Pasan transacciones intercaladas, commits y un sufijo perdido.',
      },
      {
        title: 'Archivo local',
        task: 'En un proyecto propio, serializá registros y manejá errores de escritura/sync con la API oficial del sistema.',
        why: 'La promesa durable depende de un I/O exitoso y su contrato.',
        done: 'Un error de sync no recibe una confirmación durable al cliente.',
      },
      {
        title: 'Recuperación real',
        task: 'Agregá checksum, longitud y truncado del último registro; reiniciá el proceso con un archivo preparado.',
        why: 'El log real puede terminar a mitad de registro.',
        done: 'Se recupera el prefijo válido sin publicar la transacción incompleta.',
      },
    ],
    related: { rust: ['rust-98', 'rust-100'], go: ['go-96', 'go-99'] },
    bridge: {
      rust: 'Enums y BTreeMap expresan tipos de registro y escrituras pendientes; Result propaga fallos de I/O al salir del modelo.',
      go: 'Structs y maps agrupan los cambios pendientes. El commit debe aplicar una unidad completa y descartar el buffer de esa transacción.',
    },
  },
  {
    id: 'lsm',
    category: 'infra',
    model: 'lsm',
    minutes: 40,
    sources: [
      { title: 'RocksDB · Compaction', url: 'https://github.com/facebook/rocksdb/wiki/Compaction' },
    ],
    code: { rust: 'rust-122', go: 'go-122' },
    title: 'La tumba que no debía abrirse',
    subtitle: 'LSM, compactación y tombstones',
    level: 'expert',
    story:
      'Borraste ore, compactaste un archivo y el dato reapareció desde una tabla antigua. Vas a reproducir la resurrección y decidir cuándo se puede retirar un marcador de borrado.',
    what: 'Fusionás versiones por clave y secuencia; conservás tombstones salvo que el contexto de compactación demuestre que ya no ocultan versiones necesarias.',
    why: 'Un borrado lógico debe ocultar copias que siguen existiendo físicamente. Optimizar espacio sin considerar las tablas fuera de la compactación cambia el resultado de una lectura.',
    uses: ['Almacenes LSM como RocksDB', 'Índices persistentes', 'Retención y borrados lógicos'],
    limits:
      'Sin snapshots ni replicación. El descarte total solo es seguro aquí porque se incluyen todas las versiones del rango y no hay lectores históricos. Un motor real exige además sus reglas de snapshots, secuencias y niveles.',
    objectives: [
      {
        id: 'lsm-resurrection',
        label: 'Provocar una resurrección',
        why: 'Borrá, hacé flush y eliminá el tombstone de la SST nueva sin incluir la vieja.',
      },
      {
        id: 'lsm-retained',
        label: 'Conservar el borrado en una compactación parcial',
        why: 'Volvé a borrar y preservá DEL mientras la versión antigua quede afuera.',
      },
      {
        id: 'lsm-reclaimed',
        label: 'Recuperar espacio con contexto completo',
        why: 'Incluí todas las versiones, sin snapshots, y conservá las otras claves.',
      },
    ],
    prediction: {
      question:
        'Una SST externa todavía tiene el valor viejo. ¿Podés tirar el tombstone durante una compactación parcial?',
      options: [
        'Sí, porque el DELETE ya pasó',
        'Sí, si ordenás por clave',
        'No: el valor podría reaparecer',
      ],
      answer: 2,
      explanation:
        'El marcador impide que una versión anterior siga siendo visible; retirarlo requiere conocer el contexto fuera del conjunto.',
    },
    steps: [
      {
        title: 'Representar historia',
        task: 'Definí clave, secuencia y valor opcional; None/Deleted representa tombstone.',
        why: 'Vacío y borrado son estados distintos.',
        done: 'Una cadena vacía se conserva como valor válido.',
      },
      {
        title: 'Fusionar',
        task: 'Implementá la selección de mayor secuencia por clave.',
        why: 'El orden de los archivos no debe reemplazar el orden de versiones.',
        done: 'Los tests incluyen entradas desordenadas y un borrado reciente.',
      },
      {
        title: 'Contexto de descarte',
        task: 'Exponé una bandera que solo el planificador autorizado pueda activar.',
        why: 'La función de merge no conoce por sí sola todos los archivos y snapshots.',
        done: 'Con descarte deshabilitado, el tombstone continúa en el resultado.',
      },
      {
        title: 'Proyecto con tablas',
        task: 'Escribí SST pequeñas e integrá un iterador de merge antes de experimentar con RocksDB.',
        why: 'Reutilizar un motor real evita reinventar durabilidad, índices y compactación concurrente.',
        done: 'Compará la lectura antes/después de compactar y revisá snapshots antes de eliminar marcas.',
      },
    ],
    related: { rust: ['rust-88', 'rust-99'], go: ['go-18', 'go-94'] },
    bridge: {
      rust: 'Option<String> distingue tombstone de un valor vacío; BTreeMap produce un orden de salida estable.',
      go: 'Un campo Deleted separado evita confundir cadena vacía con ausencia. La secuencia decide qué entrada gana.',
    },
  },
  {
    id: 'quorum',
    category: 'infra',
    model: 'quorum',
    minutes: 40,
    sources: [
      {
        title: 'Dynamo · artículo original',
        url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
      },
      { title: 'Raft · visualizaciones y artículo', url: 'https://raft.github.io/' },
      { title: 'MIT 6.5840 · sistemas distribuidos', url: 'https://pdos.csail.mit.edu/6.5840/' },
    ],
    code: { rust: 'rust-123', go: 'go-123' },
    title: 'El archipiélago de réplicas',
    subtitle: 'Particiones, quórums y lecturas viejas',
    level: 'expert',
    story:
      'Tres estaciones guardan el mismo contador. Una queda aislada durante una actualización y después contesta una lectura. Mirá qué garantía aporta reunir respuestas y cuál sigue faltando.',
    what: 'Explorás N=3, W=2, R=1/R=2 y una reparación explícita; el núcleo verifica intersección de conjuntos, no implementa consenso.',
    why: 'La disponibilidad y la frescura dependen de quién responde. W+R>N es una propiedad de intersección bajo membresía fija, no una receta suficiente para obtener lecturas linealizables.',
    uses: ['Almacenes replicados', 'Diseño de políticas de lectura', 'Análisis de fallos de red'],
    limits:
      'Un único escritor asigna versiones globales; no hay escritores concurrentes ni membresía dinámica. Rechazamos propuestas sin W antes de instalarlas, simplificación que omite escrituras parciales. No es Raft ni demuestra linealizabilidad.',
    objectives: [
      {
        id: 'quorum-stale',
        label: 'Leer una réplica atrasada',
        why: 'Aislá C, escribí en A/B, saná la red y pedí una copia.',
      },
      {
        id: 'quorum-unavailable',
        label: 'Observar indisponibilidad de la minoría',
        why: 'Una única respuesta no satisface W=2.',
      },
      {
        id: 'quorum-repaired',
        label: 'Reparar después de sanar la red',
        why: 'Reconectar no actualiza los datos automáticamente.',
      },
    ],
    prediction: {
      question: 'Con W=2,R=2,N=3, ¿qué demuestra W+R>N por sí sola?',
      options: [
        'Consenso y elección de líder',
        'Intersección entre esos conjuntos de réplicas',
        'Disponibilidad bajo cualquier partición',
      ],
      answer: 1,
      explanation:
        'Los conjuntos se superponen. La consistencia final depende además del protocolo, versiones, concurrencia y fallos.',
    },
    steps: [
      {
        title: 'Conjuntos antes de protocolos',
        task: 'Implementá la validación N,W,R y la condición de intersección sin overflow.',
        why: 'Una propiedad matemática pequeña no debe confundirse con un servicio completo.',
        done: 'Rechazás R/W fuera de rango y distinguís W+R=N.',
      },
      {
        title: 'Versiones observables',
        task: 'Guardá versiones y respuestas por réplica en un simulador.',
        why: 'El valor de cada nodo permite explicar lecturas atrasadas.',
        done: 'La réplica aislada conserva su versión anterior.',
      },
      {
        title: 'Protocolo con referencias',
        task: 'Seguí los laboratorios MIT y visualizaciones de Raft para elegir un protocolo completo.',
        why: 'Términos, elecciones y commits requieren reglas conjuntas.',
        done: 'Podés describir qué propiedad no garantiza tu modelo de quórum.',
      },
      {
        title: 'Fallos reproducibles',
        task: 'Prepará trazas de partición, retraso y reinicio; documentá supuestos de membresía.',
        why: 'Dormir unos milisegundos no define un modelo de fallos.',
        done: 'Cada traza produce un historial que se puede revisar y repetir.',
      },
    ],
    related: { rust: ['rust-99', 'rust-110'], go: ['go-93', 'go-110'] },
    bridge: {
      rust: 'Result separa configuración inválida de una configuración válida sin intersección garantizada.',
      go: 'Validar rangos primero permite comparar W > N-R sin desbordar una suma grande.',
    },
  },
  {
    id: 'clocks',
    category: 'infra',
    model: 'clocks',
    minutes: 40,
    sources: [
      {
        title: 'Lamport · Time, Clocks, and the Ordering of Events',
        url: 'https://lamport.azurewebsites.net/pubs/time-clocks.pdf',
      },
    ],
    code: { rust: 'rust-124', go: 'go-124' },
    title: 'La oficina sin hora oficial',
    subtitle: 'Relojes Lamport y causalidad',
    level: 'advanced',
    story:
      'A, B y C registran eventos sin compartir un reloj fiable. Mandá mensajes para crear relaciones de precedencia y observá cómo los contadores se ajustan al recibir.',
    what: 'Actualizás un reloj lógico en eventos locales, envíos y recepciones con max(local, recibido)+1.',
    why: 'Si un evento precede causalmente a otro, su sello debe ser menor. La implicación inversa no existe: un contador menor no prueba que haya causado al otro.',
    uses: [
      'Ordenación de eventos',
      'Diagnóstico de sistemas distribuidos',
      'Componentes de protocolos de replicación',
    ],
    limits:
      'Sin segundos, deadlines, TTL ni leases: Lamport no mide tiempo físico. Los contadores del modelo son pequeños; el código usa checked overflow. Un orden total por nodo desempata, pero no descubre causalidad adicional.',
    objectives: [
      {
        id: 'clocks-independent',
        label: 'Crear eventos independientes con el mismo sello',
        why: 'Hacé un evento local en A y otro en B antes de enviar mensajes.',
      },
      {
        id: 'clocks-receive',
        label: 'Recibir un sello y avanzar con max+1',
        why: 'La recepción debe quedar después de ambos contadores previos.',
      },
      {
        id: 'clocks-chain',
        label: 'Crear la cadena A→B→C',
        why: 'B debe recibir de A antes de enviar a C.',
      },
    ],
    prediction: {
      question: 'Local=7, mensaje=3. ¿Nuevo reloj al recibir?',
      options: ['4', '7', '8'],
      answer: 2,
      explanation: 'Se toma max(7,3)+1. Usar solo recibido+1 haría retroceder el reloj.',
    },
    steps: [
      {
        title: 'Evento local',
        task: 'Definí un incremento que detecte overflow.',
        why: 'Un contador que vuelve a cero rompe la monotonía.',
        done: 'El máximo representable produce error sin un sello válido.',
      },
      {
        title: 'Recepción',
        task: 'Implementá max(local, remoto)+1.',
        why: 'La recepción debe ser posterior a ambos valores.',
        done: 'Pasan mensajes menores, mayores y límites enteros.',
      },
      {
        title: 'Traza causal',
        task: 'Guardá evento, nodo, sello y vínculo de envío/recepción.',
        why: 'Una lista de números sola no captura las relaciones de mensajes.',
        done: 'La traza diferencia eventos independientes y eventos conectados.',
      },
      {
        title: 'Comparación útil',
        task: 'Contrastá con vector clocks usando las fuentes originales antes de extender el modelo.',
        why: 'Detectar concurrencia exige más información que un entero.',
        done: 'Explicás por qué L(a)<L(b) no implica a→b y por qué no sirve para TTL.',
      },
    ],
    related: { rust: ['rust-74', 'rust-97'], go: ['go-64', 'go-94'] },
    bridge: {
      rust: 'checked_add devuelve Option; el llamador puede rechazar un evento cuyo sello no entra.',
      go: 'Con uint64, comprobá MaxUint64 antes de sumar; un wrap silencioso no es un reloj válido.',
    },
  },
  {
    id: 'network',
    category: 'infra',
    model: 'network',
    minutes: 40,
    sources: [
      {
        title: 'RFC 9000 · QUIC y retransmisión de información',
        url: 'https://datatracker.ietf.org/doc/html/rfc9000#section-13.3',
      },
    ],
    code: { rust: 'rust-125', go: 'go-125' },
    title: 'El correo que se desarma',
    subtitle: 'Reensamblado, duplicados y reintentos',
    level: 'advanced',
    story:
      'GOPHER llega como tres fragmentos. Podés entregarlos al revés, perder uno y enviar dos veces otro. El receptor debe reconstruir un solo mensaje sin confundir repetición con información nueva.',
    what: 'Guardás fragmentos por índice, aceptás duplicados idénticos y rechazás índices imposibles o duplicados contradictorios.',
    why: 'El transporte puede repetir información. Hacer el reensamblado idempotente evita agregar dos veces un fragmento y la validación detecta ambigüedades.',
    uses: [
      'Protocolos sobre datagramas',
      'Transferencias segmentadas',
      'Procesamiento de mensajes repetidos',
    ],
    limits:
      'Un único mensaje con cantidad fija de fragmentos. Sin sockets, cifrado, MTU, congestión ni reloj de retransmisión. No reproduce QUIC: allí se retransmite información con reglas de frames y nuevos números de paquete.',
    objectives: [
      {
        id: 'network-reordered',
        label: 'Recibir #2 antes de #0',
        why: 'El orden de llegada no define el orden del mensaje.',
      },
      {
        id: 'network-deduped',
        label: 'Ignorar una copia idéntica',
        why: 'La cantidad almacenada debe conservarse ante el duplicado.',
      },
      {
        id: 'network-assembled',
        label: 'Recuperar #1 perdido y armar GOPHER',
        why: 'La retransmisión necesaria completa el hueco sin repetir otros fragmentos.',
      },
    ],
    prediction: {
      question: 'Ya guardaste #0=GO y llega #0=XX. ¿Qué hace nuestro contrato?',
      options: ['Sobrescribe sin avisar', 'Rechaza el conflicto', 'Concatena GOXX'],
      answer: 1,
      explanation:
        'Un mismo índice con bytes distintos hace ambiguo el mensaje. No se elige silenciosamente una versión.',
    },
    steps: [
      {
        title: 'Identidad de fragmento',
        task: 'Definí índice y bytes, más una cantidad total confiable.',
        why: 'Sin identidad, una repetición parece un fragmento nuevo.',
        done: 'Un índice fuera de rango devuelve error.',
      },
      {
        title: 'Reensamblado',
        task: 'Implementá el núcleo con almacenamiento por índice.',
        why: 'La llegada desordenada no debe cambiar el resultado.',
        done: 'Duplicados iguales no agrandan el mensaje y los diferentes fallan.',
      },
      {
        title: 'Límites de recursos',
        task: 'En un proyecto local, agregá ID de mensaje, máximo de bytes y expiración con reloj monotónico.',
        why: 'Un emisor incompleto no debe retener memoria indefinidamente.',
        done: 'Mensajes distintos no comparten buffer y se respeta el presupuesto.',
      },
      {
        title: 'Transporte real',
        task: 'Usá una biblioteca de transporte mantenida y leé su política de reintentos.',
        why: 'Congestión y seguridad no se resuelven con un bucle de resend.',
        done: 'Podés provocar pérdida en pruebas sin prometer entrega exactamente una vez.',
      },
    ],
    related: { rust: ['rust-93', 'rust-106'], go: ['go-106', 'go-111'] },
    bridge: {
      rust: 'Vec<Option<Vec<u8>>> distingue hueco de un fragmento vacío; Result distingue incompleto de inválido.',
      go: 'Un slice de presencia separado distingue un []byte vacío de un fragmento que nunca llegó.',
    },
  },
  {
    id: 'backpressure',
    category: 'infra',
    model: 'backpressure',
    minutes: 40,
    sources: [{ title: 'Go · Pipelines and cancellation', url: 'https://go.dev/blog/pipelines' }],
    code: { rust: 'rust-126', go: 'go-126' },
    title: 'La fábrica que sabe decir todavía no',
    subtitle: 'Colas acotadas y presión hacia el productor',
    level: 'medium',
    story:
      'El productor fabrica tareas más rápido que el trabajador. Hacé que la cola se llene, conservá la tarea que no entra y retomá cuando se libera un espacio.',
    what: 'Modelás cola, trabajo activo y tarea pendiente por separado; después implementás un buffer circular FIFO con capacidad fija.',
    why: 'Acotar memoria obliga a decidir qué ocurre con la carga adicional. Esperar, rechazar y descartar son políticas diferentes; este modelo conserva el trabajo pendiente en el productor.',
    uses: ['Pipelines de procesamiento', 'Pools de workers', 'Control de admisión y memoria'],
    limits:
      'Pasos manuales, un productor y un trabajador. No hay bloqueo real, scheduler ni medición de throughput. La capacidad limita la cola; el trabajo activo y el pendiente ocupan estado adicional.',
    objectives: [
      {
        id: 'backpressure-blocked',
        label: 'Llenar la cola y retener una tarea',
        why: 'Una tercera tarea no debe expandir la cola de capacidad dos.',
      },
      {
        id: 'backpressure-resumed',
        label: 'Reintentar después de liberar espacio',
        why: 'La misma tarea pendiente entra sin pérdida ni cambio de identidad.',
      },
      {
        id: 'backpressure-fifo',
        label: 'Completar al menos dos tareas en orden',
        why: 'El orden FIFO se refiere a la cola; el trabajador único lo conserva al completar.',
      },
    ],
    prediction: {
      question: 'La cola está llena. ¿Qué pasa al presionar producir en este modelo?',
      options: [
        'Crece sin límite',
        'Se pierde la tarea más antigua',
        'La tarea queda pendiente con el productor',
      ],
      answer: 2,
      explanation:
        'No entra a la cola ni se descarta: el productor conserva su identidad hasta reintentar.',
    },
    steps: [
      {
        title: 'Invariante de capacidad',
        task: 'Definí head, longitud y almacenamiento fijo.',
        why: 'Capacidad reservada no es cantidad de elementos válidos.',
        done: 'La longitud siempre queda entre cero y capacidad.',
      },
      {
        title: 'Buffer circular',
        task: 'Implementá push/pop sin desplazar todos los elementos.',
        why: 'El índice modular reutiliza huecos al final del array.',
        done: 'Las pruebas fuerzan wrap-around y una capacidad cero.',
      },
      {
        title: 'Política de saturación',
        task: 'Integra rechazo explícito y reintento del productor.',
        why: 'Un false necesita una decisión del llamador.',
        done: 'La tarea rechazada no se considera completada ni se pierde.',
      },
      {
        title: 'Pipeline local',
        task: 'Sustituí el modelo por canales acotados y cierre coordinado.',
        why: 'La concurrencia introduce cancelación y propiedad del cierre.',
        done: 'Una prueba cancela con la cola llena y todos los trabajadores terminan.',
      },
    ],
    related: { rust: ['rust-35', 'rust-47'], go: ['go-43', 'go-65'] },
    bridge: {
      rust: 'Un Vec de tamaño fijo y &mut self protegen cambios locales; compartirlo entre threads requiere sincronización adicional.',
      go: 'El buffer circular de este ejercicio no es concurrente. Para varios participantes usá un canal o coordiná con un Mutex.',
    },
  },
  {
    id: 'balancing',
    category: 'infra',
    model: 'balancing',
    minutes: 40,
    sources: [
      {
        title: 'Envoy · Load balancing',
        url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/overview',
      },
      {
        title: 'Envoy · límites de circuit breaking',
        url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking',
      },
      {
        title: 'Envoy · outlier detection y fallos consecutivos',
        url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier',
      },
    ],
    code: { rust: 'rust-127', go: 'go-127' },
    title: 'El portero de la estación',
    subtitle: 'Balanceo, health y circuitos',
    level: 'advanced',
    story:
      'Tres servidores reciben trabajo. Uno no está sano, otro empieza a fallar y un tercero se llena. Elegí un destino elegible antes de comparar cargas.',
    what: 'Separás salud, circuito y cupo; elegís menor carga y liberás recursos cuando una petición termina.',
    why: 'Un algoritmo de reparto no arregla un destino incapaz de recibir trabajo. La elegibilidad debe filtrar antes de balancear y los empates necesitan una regla reproducible.',
    uses: ['Proxies de servicios', 'Despacho de jobs', 'Protección frente a fallos y saturación'],
    limits:
      'La salud y la sonda se controlan manualmente. Circuito de racha didáctico con umbral dos; Envoy también usa límites de recursos y mecanismos separados de outlier detection. Sin latencia, retries, timers ni half-open completo.',
    objectives: [
      {
        id: 'balancing-health',
        label: 'Excluir un backend no sano',
        why: 'Marcá A no sano y encaminá una petición a otro.',
      },
      {
        id: 'balancing-opened',
        label: 'Abrir B tras dos fallos consecutivos',
        why: 'Cada fallo debe corresponder a una petición activa en B.',
      },
      {
        id: 'balancing-recovered',
        label: 'Volver a elegir B tras sonda exitosa',
        why: 'La recuperación debe volver a habilitar trabajo real, no solo cambiar una etiqueta.',
      },
    ],
    prediction: {
      question:
        'A tiene carga 0 pero no está sano; B está sano con carga 1 y cupo libre. ¿Qué elegimos?',
      options: [
        'A, siempre gana cero',
        'B, primero se filtra elegibilidad',
        'Cualquier nombre al azar',
      ],
      answer: 1,
      explanation: 'La carga se compara dentro del conjunto que puede recibir una petición.',
    },
    steps: [
      {
        title: 'Elegibilidad',
        task: 'Definí healthy, open, inflight y limit.',
        why: 'Son condiciones diferentes que pueden excluir al mismo nodo.',
        done: 'Un nodo sin cupo, abierto o no sano nunca es elegido.',
      },
      {
        title: 'Selección pura',
        task: 'Implementá menor carga y desempate lexical.',
        why: 'Probar la política no necesita red.',
        done: 'Cambiar el orden del slice no cambia un empate por nombre.',
      },
      {
        title: 'Contabilidad',
        task: 'Incrementá al admitir y decrementá al terminar, también ante error.',
        why: 'Un cupo que no se libera termina simulando una caída permanente.',
        done: 'Una prueba de fallo deja la carga activa correcta.',
      },
      {
        title: 'Proxy existente',
        task: 'Compará esta política con Envoy y configurá un servicio de prueba.',
        why: 'Un proxy real ya resuelve discovery, métricas y muchas condiciones de fallo.',
        done: 'Documentás qué límite configura circuit breaking y qué mecanismo observa salud.',
      },
    ],
    related: { rust: ['rust-110', 'rust-112'], go: ['go-110', 'go-112'] },
    bridge: {
      rust: 'Una referencia al candidato evita clonar todo el backend; la función devuelve el nombre elegido sin mutar cargas.',
      go: 'Una función pura separa selección de reserva del cupo. La reserva concurrente requiere una sección coordinada aparte.',
    },
  },
  {
    id: 'sharding',
    category: 'infra',
    model: 'sharding',
    minutes: 40,
    sources: [
      {
        title: 'Envoy · Ring hash',
        url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers#ring-hash',
      },
      {
        title: 'Dynamo · particionamiento',
        url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
      },
    ],
    code: { rust: 'rust-128', go: 'go-128' },
    title: 'El anillo que se estira',
    subtitle: 'Hash consistente y movimiento de claves',
    level: 'advanced',
    story:
      'Agregás una estación D y querés redistribuir una parte del catálogo, no cambiar casi todos los destinos. Dibujá un anillo de tokens y compará con hash mod N.',
    what: 'Buscás el primer token mayor o igual que el hash y volvés al inicio si no existe. Agregar un token transfiere su intervalo desde el sucesor.',
    why: 'El mapeo desacopla la posición de una clave del número total de nodos. Reduce reasignación ante cambios, pero no promete equilibrio con pocos tokens ni migra datos automáticamente.',
    uses: ['Cachés distribuidas', 'Particionamiento de claves', 'Afinidad en balanceadores'],
    limits:
      'Hashes y tokens pequeños ya calculados, un token por nodo, sin réplicas ni fallos durante migración. El menor movimiento se observa para estas muestras; distribución, virtual nodes y claves calientes requieren más trabajo.',
    objectives: [
      {
        id: 'sharding-wrap',
        label: 'Seguir el anillo después del último token',
        why: 'Hash 95 vuelve a 10/A.',
      },
      {
        id: 'sharding-local',
        label: 'Mover solo el intervalo ganado por D',
        why: 'Al agregar 25/D, solo cambia (10,25].',
      },
      {
        id: 'sharding-compared',
        label: 'Comparar movimiento con módulo N',
        why: 'Observá la diferencia sobre el mismo conjunto fijo de claves.',
      },
    ],
    prediction: {
      question: 'Tokens 10/A,40/B,70/C: ¿quién posee hash 95?',
      options: ['A', 'B', 'C'],
      answer: 0,
      explanation: 'No hay token ≥95; la búsqueda vuelve al primer token del anillo.',
    },
    steps: [
      {
        title: 'Contrato del anillo',
        task: 'Definí tokens únicos y orden de desempate; rechazá ambigüedades.',
        why: 'Dos dueños en el mismo token requieren una política explícita.',
        done: 'Un token repetido produce error en este núcleo.',
      },
      {
        title: 'Asignación',
        task: 'Ordená una copia y buscá el sucesor con vuelta al inicio.',
        why: 'El orden de entrada no debe cambiar la propiedad de una clave.',
        done: 'Pasan fronteras exactas, wrap y anillo vacío.',
      },
      {
        title: 'Movimiento medido',
        task: 'Compará el destino de miles de hashes antes y después de agregar un nodo.',
        why: 'Un dibujo con pocos puntos no demuestra balance.',
        done: 'Registrás fracción movida y dispersión de carga por nodo.',
      },
      {
        title: 'Proyecto distribuido',
        task: 'Usá una implementación mantenida con virtual nodes o ring hash; diseñá transferencia y réplicas.',
        why: 'Asignar un dueño nuevo no mueve los bytes que ya estaban guardados.',
        done: 'Durante una migración de prueba no se pierden lecturas ni escrituras confirmadas.',
      },
    ],
    related: { rust: ['rust-87', 'rust-34'], go: ['go-88', 'go-18'] },
    bridge: {
      rust: 'Ordenar un Vec clonado conserva el slice prestado; Result informa tokens ambiguos.',
      go: 'Copiar antes de sort.Slice evita modificar la configuración del llamador mientras se calcula una asignación.',
    },
  },
];
