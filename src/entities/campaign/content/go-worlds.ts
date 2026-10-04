/* La campaña referencia entrenamientos existentes; no duplica sus ejercicios. */
import type { CampaignWorldDefinition } from '../model/types';

export const goWorlds: CampaignWorldDefinition[] = [
  {
    id: 'go-world-1',
    level: 'beginner',
    title: 'La estación del rover',
    subtitle: 'Decisiones pequeñas, un robot que responde',
    story:
      'Un rover de exploración quedó varado. Antes del rescate vas a revisar sus límites, cargar suministros y recuperar la brújula. La misión final convierte instrucciones en movimiento visible en el estado del robot.',
    concepts: ['Bucles y decisiones', 'Slices y arrays', 'Transiciones de estado'],
    why: 'Los programas grandes también se construyen con reglas pequeñas. Poder explicar el estado antes y después de cada comando vale más que memorizar la sintaxis de un for.',
    guide: [
      'Entrená límites, acumuladores y arrays: predecí un caso antes de ejecutar.',
      'Repará la brújula y probá qué cambia entre continue y break al cargar cajas.',
      'En el jefe, anotá X, Y, dirección y energía después de cada comando. Compará esa traza con los tests.',
    ],
    trainingIds: ['go-06', 'go-07', 'go-11'],
    challengeIds: ['go-101', 'go-102', 'go-103'],
    bossId: 'go-103',
    checkpoint: {
      question:
        'El rover completó dos pasos y falla el tercero. ¿Qué resultado conserva información útil según nuestro contrato?',
      options: [
        'El estado alcanzado y false',
        'El estado inicial y true',
        'Solo false, sin posición',
      ],
      answer: 0,
      explanation:
        'El estado parcial describe lo que sí ocurrió; false indica que el programa completo no terminó.',
    },
    badge: 'Piloto de estados',
    sources: [
      { title: 'A Tour of Go: control de flujo', url: 'https://go.dev/tour/flowcontrol/1' },
      {
        title: 'Golings: práctica adicional de comunidad',
        url: 'https://github.com/madhank93/golings',
      },
    ],
  },
  {
    id: 'go-world-2',
    level: 'medium',
    title: 'La antena de telemetría',
    subtitle: 'Los bytes también tienen reglas',
    story:
      'El rover ya se mueve, pero sus mensajes llegan cortados o alterados. Vas a definir un byte de control, comprobar errores de transmisión y abrir paquetes sin confiar a ciegas en su contenido.',
    concepts: ['Bits y límites', 'Endianness y longitudes', 'Checksums y propiedad de buffers'],
    why: 'Un protocolo funciona porque emisor y receptor acuerdan una representación exacta. La biblioteca estándar resuelve los detalles mecánicos; vos seguís siendo responsable de validar límites y contratos.',
    guide: [
      'Repasá máscaras, ventanas de slices y retornos con error.',
      'Dibujá los ocho bits del control y reutilizá hash/crc32 para la suma de comprobación.',
      'En el jefe, validá tamaño, marca, longitud y checksum antes de devolver una copia del payload.',
    ],
    trainingIds: ['go-05', 'go-15', 'go-26'],
    challengeIds: ['go-104', 'go-105', 'go-106'],
    bossId: 'go-106',
    checkpoint: {
      question: 'Un paquete tiene CRC correcto. ¿Qué podés afirmar?',
      options: [
        'Que lo envió una persona autorizada',
        'Que pasó esa comprobación de errores, sin autenticar al emisor',
        'Que no hace falta revisar su longitud',
      ],
      answer: 1,
      explanation:
        'CRC sirve para detectar errores accidentales; no es una firma ni reemplaza las validaciones estructurales.',
    },
    badge: 'Guardián de paquetes',
    sources: [
      { title: 'encoding/binary', url: 'https://pkg.go.dev/encoding/binary' },
      { title: 'hash/crc32', url: 'https://pkg.go.dev/hash/crc32' },
    ],
  },
  {
    id: 'go-world-3',
    level: 'advanced',
    title: 'El mapa de suministros',
    subtitle: 'Encontrá rutas y ordená lo que depende de otras cosas',
    story:
      'Las bases forman una red. Algunas rutas vuelven al mismo lugar y algunas tareas dependen de otras. Tu equipo necesita una ruta corta y un plan de lanzamiento reproducible.',
    concepts: ['Grafos y visitados', 'BFS y predecesores', 'Dependencias y colas de prioridad'],
    why: 'Una red puede representar caminos, paquetes o tareas. La estructura del problema decide el algoritmo: BFS minimiza saltos sin pesos; un orden topológico respeta dependencias.',
    guide: [
      'Repasá maps, orden reproducible y búsquedas con límites claros.',
      'Repará la exploración y reconstruí una ruta con predecesores, sin copiar caminos completos en cada paso.',
      'En el jefe, mantené tareas listas en container/heap y detectá cuándo una dependencia impide terminar.',
    ],
    trainingIds: ['go-16', 'go-18', 'go-88'],
    challengeIds: ['go-107', 'go-108', 'go-109'],
    bossId: 'go-109',
    checkpoint: {
      question: 'Si las rutas tienen tiempos distintos, ¿BFS garantiza el viaje más rápido?',
      options: [
        'Sí, porque siempre usa una cola',
        'Sí, si marcás visitados',
        'No; minimiza cantidad de aristas, no suma de tiempos',
      ],
      answer: 2,
      explanation:
        'Con costes distintos necesitás un algoritmo acorde, como Dijkstra para pesos no negativos.',
    },
    badge: 'Cartógrafo de dependencias',
    sources: [
      { title: 'Maps en Go', url: 'https://go.dev/blog/maps' },
      { title: 'container/heap', url: 'https://pkg.go.dev/container/heap' },
    ],
  },
  {
    id: 'go-world-4',
    level: 'expert',
    title: 'El último enlace',
    subtitle: 'Insistir con límites; detenerse con intención',
    story:
      'La conexión de la base es inestable. Debés distinguir un fallo pasajero de uno permanente, cortar una secuencia de fallos y entregar mensajes sin insistir después de una cancelación observada.',
    concepts: [
      'Circuit breaker lógico',
      'Reintentos acotados',
      'Cancelación cooperativa y orden de entrega',
    ],
    why: 'Los reintentos son una política con efectos. Limitarlos y conservar el error real evita trabajo inútil; una función externa que recibe context puede cooperar con la cancelación durante cada intento.',
    guide: [
      'Repasá prioridad de errores y puntos explícitos de cancelación.',
      'Separá estado del interruptor, clasificación de errores y presupuesto de intentos.',
      'En el jefe, observá el orden de callbacks: no empieces el siguiente mensaje hasta confirmar el actual. No hay red ni esperas reales en esta simulación.',
    ],
    trainingIds: ['go-39', 'go-61', 'go-100'],
    challengeIds: ['go-110', 'go-111', 'go-112'],
    bossId: 'go-112',
    checkpoint: {
      question:
        'El contexto se cancela mientras Send está bloqueado e ignora ctx. ¿Puede nuestro bucle interrumpirlo por la fuerza?',
      options: [
        'Sí, cancelar termina cualquier función',
        'No; Send debe cooperar o tener su propio límite',
        'Sí, si aumentamos maxAttempts',
      ],
      answer: 1,
      explanation:
        'Context comunica cancelación. No mata goroutines ni deshace efectos externos; el callback debe respetarlo.',
    },
    badge: 'Ingeniero de resiliencia',
    sources: [
      { title: 'Context y cancelación', url: 'https://pkg.go.dev/context' },
      { title: 'Rustlings: otra ruta de práctica', url: 'https://github.com/rust-lang/rustlings' },
    ],
  },
];
