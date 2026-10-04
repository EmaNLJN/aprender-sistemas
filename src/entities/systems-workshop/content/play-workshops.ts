import type { SystemsWorkshop, WorkshopPrediction } from '../model/types';

// Cada paso de la ruta del taller: qué hacer, por qué y cómo se sabe que está hecho.
interface PlayStep {
  title: string;
  task: string;
  why: string;
  done: string;
}

// La ficha de play agrega la pregunta de la predicción y pasos con forma fija; el motor
// no los interpreta.
interface PlayWorkshop extends SystemsWorkshop {
  steps: PlayStep[];
  prediction: WorkshopPrediction & { question: string };
}

// Fichas curriculares de los talleres de play (gráficos, álgebra y juegos): contenido, no
// comportamiento. Las simulaciones viven en `entities/systems-simulation/models/play` y los
// núcleos programables en `entities/exercise/content/systems-play-cores`.
export const playWorkshops: PlayWorkshop[] = [
  {
    id: 'transforms',
    title: 'Coreografía de matrices',
    subtitle: 'Mové una nave y descubrí por qué el orden importa.',
    level: 'medium',
    minutes: 30,
    story:
      'El director de una escena espacial te pide mover una nave. Dos instrucciones aparentemente iguales la dejan en lugares distintos: alguien cambió el orden.',
    what: 'Un pequeño editor de transformaciones afines 2D con matrices homogéneas, vértices y operación inversa.',
    why: 'Representar cada transformación de la misma forma permite componer una escena completa sin duplicar reglas para cada objeto.',
    uses: [
      'Cámaras y objetos 2D',
      'Interfaces y animación',
      'Conversión entre sistemas de coordenadas',
    ],
    limits:
      'Modelo 2D con operaciones exactas de 90°. No representa perspectiva 3D ni la precisión de una GPU.',
    objectives: [
      {
        id: 'transforms-translation',
        label: 'Aplicar una traslación',
        why: 'Mover el origen muestra para qué existe la columna de traslación.',
      },
      {
        id: 'transforms-order',
        label: 'Comparar los dos órdenes completos',
        why: 'Los mismos operadores producen matrices distintas al permutarlos.',
      },
      {
        id: 'transforms-inverse',
        label: 'Volver con la inversa',
        why: 'Deshacer exige invertir la transformación compuesta, no solo cambiar un signo.',
      },
    ],
    prediction: {
      question: '¿Trasladar y después girar siempre equivale a girar y trasladar?',
      options: [
        'Sí, las matrices conmutan',
        'No: también puede girar el desplazamiento',
        'Solo cambia el tamaño',
      ],
      answer: 1,
      explanation:
        'Una traslación aplicada antes del giro se expresa en los ejes que después giran.',
    },
    steps: [
      {
        title: 'Representar',
        task: 'Guardá vértices y una matriz afín de seis números.',
        why: 'Una representación uniforme separa geometría de posición.',
        done: 'Transformar identidad conserva cada vértice.',
      },
      {
        title: 'Componer',
        task: 'Implementá A después de B y probá ambos órdenes.',
        why: 'El desplazamiento también participa de la composición.',
        done: 'Un ejemplo con giro y traslación produce dos ubicaciones distintas.',
      },
      {
        title: 'Dibujar',
        task: 'Mostrá original y resultado en la misma grilla.',
        why: 'Una referencia fija hace observable la transformación.',
        done: 'La nave y sus coordenadas concuerdan.',
      },
      {
        title: 'Deshacer',
        task: 'Construí la inversa cuando el determinante no sea 0.',
        why: 'Una matriz singular no puede recuperar información perdida.',
        done: 'Aplicar transformación e inversa recupera los puntos dentro de una tolerancia.',
      },
    ],
    sources: [
      {
        title: 'Cornell CS4620 · transformaciones 2D',
        url: 'https://www.cs.cornell.edu/courses/cs4620/2014fa/lectures/08transforms2d.pdf',
      },
    ],
    related: { rust: ['rust-21', 'rust-22', 'rust-36'], go: ['go-11', 'go-21', 'go-23'] },
    bridge: {
      rust: 'Arrays y tuplas fijan la representación; prestá los vértices y devolvé un nuevo Vec cuando convenga conservar el original.',
      go: 'Un array [6]float64 expresa la matriz y una struct puede nombrar sus campos; prestá atención a los slices que comparten memoria.',
    },
    category: 'play',
    model: 'transforms',
    code: { rust: 'rust-129', go: 'go-129' },
  },
  {
    id: 'raster',
    title: 'El taller de los píxeles',
    subtitle: 'Convertí una línea ideal en una decisión por casilla.',
    level: 'medium',
    minutes: 30,
    story:
      'Tu consola retro solo sabe encender píxeles enteros. Una diagonal no cae justo en las casillas y tenés que decidir dónde dibujar.',
    what: 'Un rasterizador de líneas paso a paso que muestra el error acumulado y el próximo píxel.',
    why: 'Una aproximación discreta necesita una regla de decisión explícita. El error acumulado conserva información que redondear sin contexto perdería.',
    uses: [
      'Dibujo en pantallas discretas',
      'Recorridos de grillas',
      'Plotters y herramientas gráficas sencillas',
    ],
    limits:
      'Píxeles binarios y segmentos cortos. No incluye antialiasing, grosor ni recorte de ventanas.',
    objectives: [
      {
        id: 'raster-line',
        label: 'Completar una diagonal',
        why: 'Los extremos deben aparecer y las decisiones conectan toda la línea.',
      },
      {
        id: 'raster-steep',
        label: 'Resolver una pendiente empinada',
        why: 'El eje que más avanza puede cambiar sin cambiar la idea del error.',
      },
      {
        id: 'raster-point',
        label: 'Dibujar un segmento de longitud 0',
        why: 'El caso degenerado tiene un píxel, no cero ni un bucle infinito.',
      },
    ],
    prediction: {
      question: 'Si el error pide avanzar ambos ejes, ¿qué corresponde?',
      options: ['Dos if independientes', 'Un if/else que elija un solo eje', 'Reiniciar el error'],
      answer: 0,
      explanation: 'Una transición diagonal cambia ambas coordenadas con el mismo error previo.',
    },
    steps: [
      {
        title: 'Definir',
        task: 'Fijá extremos incluidos y una política de empate.',
        why: 'Dos algoritmos pueden elegir píxeles distintos en una frontera.',
        done: 'El contrato describe exactamente la secuencia esperada.',
      },
      {
        title: 'Acumular',
        task: 'Actualizá un error entero al mover cada eje.',
        why: 'Evita recalcular una pendiente fraccional a cada paso.',
        done: 'Una línea horizontal, vertical y diagonal termina.',
      },
      {
        title: 'Visualizar',
        task: 'Superponé el segmento ideal con los píxeles calculados.',
        why: 'Ver ambas representaciones explica la aproximación.',
        done: 'Cada casilla elegida se corresponde con un elemento de la salida.',
      },
      {
        title: 'Generalizar',
        task: 'Probá todos los sentidos y el extremo coincidente.',
        why: 'Los signos y los casos degenerados exponen supuestos escondidos.',
        done: 'Tus pruebas cubren reversos y un solo punto.',
      },
    ],
    sources: [
      {
        title: 'Alois Zingl · rasterización con Bresenham',
        url: 'https://zingl.github.io/bresenham.html',
      },
      {
        title: 'Bresenham · artículo original de 1965',
        url: 'https://janmr.com/files/papers/bresenham65.pdf',
      },
    ],
    related: { rust: ['rust-08', 'rust-09', 'rust-40'], go: ['go-07', 'go-11', 'go-12'] },
    bridge: {
      rust: 'Un Vec<(i32,i32)> conserva el orden; separar dx y dy de sus signos evita conversiones innecesarias.',
      go: 'Una struct Pixel hace explícitos los ejes; append acumula la trayectoria y un for controla el punto final.',
    },
    category: 'play',
    model: 'raster',
    code: { rust: 'rust-130', go: 'go-130' },
  },
  {
    id: 'raycast',
    title: 'Linterna entre planetas',
    subtitle: 'Dispará un rayo y elegí qué superficie aparece primero.',
    level: 'advanced',
    minutes: 40,
    story:
      'Una nave escanea tres planetas. Encontrar cualquier intersección dibujaría planetas lejanos por encima de los cercanos.',
    what: 'Una escena 2D de rayos y círculos que resuelve la cuadrática y ordena impactos hacia delante.',
    why: 'Una raíz matemática solo es útil después de interpretar su signo y su distancia relativa para la escena.',
    uses: ['Selección de objetos', 'Visibilidad y ray tracing', 'Sensores y geometría de juegos'],
    limits:
      'Círculos 2D, sin iluminación física. La política de tolerancias cerca de superficies exige más trabajo en un renderizador real.',
    objectives: [
      {
        id: 'raycast-hit',
        label: 'Alcanzar una superficie',
        why: 'El discriminante permite encontrar un punto de contacto real.',
      },
      {
        id: 'raycast-miss',
        label: 'Encontrar un rayo sin impacto',
        why: 'No todos los rayos alcanzan la escena; ausencia es un resultado válido.',
      },
      {
        id: 'raycast-nearest',
        label: 'Comparar dos impactos en el mismo rayo',
        why: 'La superficie más cercana oculta la más lejana.',
      },
    ],
    prediction: {
      question: 'Si el origen está dentro de un círculo, ¿qué raíz puede ser útil?',
      options: [
        'Ninguna, siempre falla',
        'La raíz de salida no negativa',
        'Solo la raíz menor aunque sea negativa',
      ],
      answer: 1,
      explanation: 'La entrada puede quedar detrás del origen; la salida sigue estando delante.',
    },
    steps: [
      {
        title: 'Parametrizar',
        task: 'Representá el rayo como origen+t·dirección.',
        why: 'Separar trayectoria y parámetro permite comparar intersecciones.',
        done: 'Un cambio de escala en dirección modifica t pero no el punto.',
      },
      {
        title: 'Resolver',
        task: 'Sustituí el rayo en la ecuación del círculo.',
        why: 'La cuadrática conecta álgebra y geometría.',
        done: 'Hay pruebas para tangencia, ausencia y origen interior.',
      },
      {
        title: 'Ordenar',
        task: 'Elegí el menor t no negativo de todos los objetos.',
        why: 'Encontrar un objeto no demuestra que sea el primero visible.',
        done: 'Un planeta cercano oculta uno lejano.',
      },
      {
        title: 'Extender',
        task: 'Añadí normales y un color según su orientación.',
        why: 'La normal permite conectar geometría con sombreado.',
        done: 'El color cambia de forma consistente sobre la superficie.',
      },
    ],
    sources: [
      {
        title: 'Ray Tracing in One Weekend · intersecciones',
        url: 'https://raytracing.github.io/books/RayTracingInOneWeekend.html',
      },
    ],
    related: { rust: ['rust-26', 'rust-27', 'rust-37'], go: ['go-02', 'go-09', 'go-21'] },
    bridge: {
      rust: 'Option<f64> distingue ausencia de t=0. Usá f64 y definí la tolerancia en las pruebas.',
      go: 'El par (float64,bool) separa valor y presencia; math.Sqrt resuelve la raíz solo después de validar el discriminante.',
    },
    category: 'play',
    model: 'raycast',
    code: { rust: 'rust-131', go: 'go-131' },
  },
  {
    id: 'pathfinding',
    title: 'El mapa que piensa',
    subtitle: 'Abrí caminos, agregá pantanos y mirá cómo busca tu personaje.',
    level: 'advanced',
    minutes: 45,
    story:
      'El héroe puede atravesar el pantano o rodearlo. Una ruta de pocos pasos no siempre es la que menos energía consume.',
    what: 'Un explorador visual de BFS y A* con frontera, costos, paredes y reconstrucción de rutas.',
    why: 'Distinguir distancia, costo y estimación evita usar el algoritmo correcto para la pregunta equivocada.',
    uses: [
      'Navegación de personajes',
      'Planificación de rutas',
      'Exploración de grafos de estados',
    ],
    limits:
      'Grilla pequeña, vecinos ortogonales y costos positivos. No hay personajes simultáneos, suavizado ni navegación continua.',
    objectives: [
      {
        id: 'pathfinding-bfs',
        label: 'Encontrar una ruta con BFS uniforme',
        why: 'Una cola explora capas cuando cada arista tiene el mismo costo.',
      },
      {
        id: 'pathfinding-astar',
        label: 'Resolver el terreno costoso con A*',
        why: 'g+h combina lo gastado con una cota de lo que falta.',
      },
      {
        id: 'pathfinding-blocked',
        label: 'Demostrar que no existe camino',
        why: 'Agotar la frontera es distinto de detenerse demasiado pronto.',
      },
    ],
    prediction: {
      question: 'Con casillas de costos distintos, BFS garantiza…',
      options: [
        'Costo total mínimo',
        'Menos pasos, no necesariamente menor costo',
        'Siempre la misma ruta que A*',
      ],
      answer: 1,
      explanation:
        'BFS ordena por capas de aristas; no incorpora el precio de entrar a cada terreno.',
    },
    steps: [
      {
        title: 'Modelar',
        task: 'Convertí casillas transitables en nodos y movimientos en aristas.',
        why: 'La búsqueda opera sobre el grafo, no sobre una imagen.',
        done: 'Paredes y límites no generan vecinos.',
      },
      {
        title: 'Explorar',
        task: 'Implementá cola BFS y visualizá su frontera.',
        why: 'Cada capa representa un paso adicional con costo uniforme.',
        done: 'Un mapa sin camino termina al agotar la cola.',
      },
      {
        title: 'Priorizar',
        task: 'Agregá costos y la prioridad g+h de A*.',
        why: 'Una heurística admisible no sobreestima la distancia restante.',
        done: 'El mapa con pantanos elige la ruta barata.',
      },
      {
        title: 'Reconstruir',
        task: 'Guardá padres y devolvé una secuencia transitable.',
        why: 'Un costo correcto no alcanza para mover al personaje.',
        done: 'Cada paso de la ruta es vecino y su suma coincide con el costo.',
      },
    ],
    sources: [
      {
        title: 'Amit Patel · introducción a A*',
        url: 'https://www.redblobgames.com/pathfinding/a-star/introduction.html',
      },
    ],
    related: { rust: ['rust-35', 'rust-107', 'rust-109'], go: ['go-107', 'go-108', 'go-109'] },
    bridge: {
      rust: 'Guardá costos separados de la grilla y usá Option para ausencia de ruta; un BinaryHeap con orden invertido puede reemplazar la lista abierta.',
      go: 'Una struct para cada entrada de la frontera permite conservar coordenadas y costo; map o slices almacenan mejores distancias y padres.',
    },
    category: 'play',
    model: 'pathfinding',
    code: { rust: 'rust-132', go: 'go-132' },
  },
  {
    id: 'physics',
    title: 'La cancha de los rebotes',
    subtitle: 'Una colisión combina geometría, tiempo y una decisión de respuesta.',
    level: 'medium',
    minutes: 35,
    story:
      'Tu prototipo tiene una pared y una caja. El cuadrado debe rebotar, pero tocar el borde no debería teletransportarlo ni inventar penetración.',
    what: 'Un simulador discreto de AABB y reflejos con avance manual de tiempo fijo.',
    why: 'Detectar intersección, corregir posición y cambiar velocidad son responsabilidades diferentes.',
    uses: [
      'Prototipos de juegos 2D',
      'Detección rápida de contacto',
      'Simulaciones con pasos reproducibles',
    ],
    limits:
      'Sin gravedad, fricción ni rotación. Las velocidades están acotadas; una simulación discreta puede sufrir tunneling con objetos rápidos.',
    objectives: [
      {
        id: 'physics-wall',
        label: 'Reflejar en una pared',
        why: 'Cambiar el signo del componente normal invierte el movimiento contra el límite.',
      },
      {
        id: 'physics-brick',
        label: 'Rebotar en la caja interior',
        why: 'Una región de intersección permite detectar penetración y resolverla.',
      },
      {
        id: 'physics-touch',
        label: 'Distinguir contacto de penetración',
        why: 'Compartir un borde no equivale a compartir área.',
      },
    ],
    prediction: {
      question: 'Una prueba AABB al final del paso puede perder un choque si…',
      options: [
        'El objeto atraviesa una pared entera entre dos muestras',
        'El objeto está quieto',
        'La caja tiene cuatro lados',
      ],
      answer: 0,
      explanation:
        'Un objeto puede estar antes y después de la pared sin superponerla en ninguna muestra: es tunneling.',
    },
    steps: [
      {
        title: 'Detectar',
        task: 'Implementá la intersección de intervalos en x e y.',
        why: 'La geometría debe tener un contrato para bordes y cajas degeneradas.',
        done: 'Contacto sin área devuelve ausencia.',
      },
      {
        title: 'Integrar',
        task: 'Avanzá posición con un intervalo de tiempo fijo.',
        why: 'Separar simulación y frecuencia de dibujo mejora reproducibilidad.',
        done: 'La misma secuencia de pasos da el mismo estado.',
      },
      {
        title: 'Responder',
        task: 'Reflejás velocidad y corregís la penetración.',
        why: 'Cambiar velocidad sin corregir posición deja el objeto dentro de la pared.',
        done: 'Tras el choque, la caja queda fuera y puede alejarse.',
      },
      {
        title: 'Investigar',
        task: 'Aumentá la velocidad y documentá los límites.',
        why: 'Un ejemplo que falla enseña cuándo hace falta barrido continuo o subpasos.',
        done: 'Podés explicar qué casos cubre tu detector.',
      },
    ],
    sources: [
      {
        title: 'Glenn Fiedler · Fix Your Timestep',
        url: 'https://gafferongames.com/post/fix_your_timestep/',
      },
    ],
    related: { rust: ['rust-12', 'rust-22', 'rust-25'], go: ['go-21', 'go-22', 'go-23'] },
    bridge: {
      rust: 'Separá una función pura de intersección de una transición que recibe &mut Estado; preparar el nuevo estado ayuda a razonar.',
      go: 'Usá structs para caja y velocidad; un método con receptor puntero confirma el estado y las funciones de geometría pueden seguir siendo puras.',
    },
    category: 'play',
    model: 'physics',
    code: { rust: 'rust-133', go: 'go-133' },
  },
  {
    id: 'life',
    title: 'Un jardín de reglas',
    subtitle: 'Tres reglas locales hacen aparecer osciladores y criaturas viajeras.',
    level: 'beginner',
    minutes: 30,
    story:
      'No vas a programar cada movimiento de la criatura. Vas a programar cómo nace y muere una celda y observar qué emerge.',
    what: 'Un tablero de Conway con reproducción por generaciones, patrones conocidos y nacimientos visibles.',
    why: 'Separar lectura y escritura permite que una regla local produzca una transición global simultánea.',
    uses: [
      'Autómatas celulares',
      'Simulaciones discretas',
      'Experimentación con sistemas emergentes',
    ],
    limits:
      'Tablero finito con borde muerto. Los patrones pueden cambiar al alcanzar el borde y no representan organismos biológicos.',
    objectives: [
      {
        id: 'life-oscillator',
        label: 'Ver volver al oscilador',
        why: 'Un patrón de período 2 distingue tiempo de movimiento.',
      },
      {
        id: 'life-still',
        label: 'Conservar un bloque estable',
        why: 'Todas sus celdas cumplen la regla de supervivencia.',
      },
      {
        id: 'life-travel',
        label: 'Mover el glider en cuatro generaciones',
        why: 'La traslación emerge de reglas idénticas aplicadas a todas las celdas.',
      },
    ],
    prediction: {
      question: 'Una celda muerta con exactamente 3 vecinas vivas…',
      options: ['Nace', 'Permanece muerta', 'Depende del color'],
      answer: 0,
      explanation: 'B3 significa nacimiento con 3 vecinas; S23 conserva una viva con 2 o 3.',
    },
    steps: [
      {
        title: 'Representar',
        task: 'Construí una grilla de booleanos y definí sus bordes.',
        why: 'Sin un contrato del exterior, contar vecinos es ambiguo.',
        done: 'Una celda aislada no ve vecinos al otro lado del tablero.',
      },
      {
        title: 'Actualizar',
        task: 'Calculá la siguiente generación en otro buffer.',
        why: 'Leer estados nuevos durante el mismo paso rompe la simultaneidad.',
        done: 'Un blinker rota y recupera su forma después de dos pasos.',
      },
      {
        title: 'Observar',
        task: 'Marcá nacimientos y muertes con colores diferentes.',
        why: 'Contar población no alcanza para entender cómo cambia una forma.',
        done: 'El bloque es estable y el glider se traslada.',
      },
      {
        title: 'Experimentar',
        task: 'Diseñá semillas y anotá predicciones.',
        why: 'Reglas simples no vuelven triviales los resultados globales.',
        done: 'Podés comparar tu hipótesis con una secuencia de generaciones.',
      },
    ],
    sources: [
      {
        title: 'Princeton COS126 · Conway y autómatas celulares',
        url: 'https://www.cs.princeton.edu/courses/archive/fall15/cos126/lectures/CS.Movies.pdf',
      },
    ],
    related: { rust: ['rust-14', 'rust-15', 'rust-20'], go: ['go-11', 'go-13', 'go-25'] },
    bridge: {
      rust: 'Un Vec<Vec<bool>> nuevo evita mezclar préstamos de lectura y escritura. Después podés probar dos buffers reutilizables.',
      go: 'Crear filas nuevas importa: copiar solo el slice externo seguiría compartiendo los arreglos internos.',
    },
    category: 'play',
    model: 'life',
    code: { rust: 'rust-134', go: 'go-134' },
  },
  {
    id: 'algebra',
    title: 'La máquina de polinomios',
    subtitle: 'Evaluá, derivá y conectá símbolos con una curva que podés mover.',
    level: 'advanced',
    minutes: 40,
    story:
      'Tu calculadora debe entender una familia de expresiones, no una fórmula escrita a mano para cada ejemplo.',
    what: 'Un CAS mínimo de polinomios con coeficientes, evaluación de Horner y derivada simbólica.',
    why: 'Elegir una representación convierte operaciones algebraicas en transformaciones de datos verificables.',
    uses: [
      'Herramientas matemáticas',
      'Interpolación y curvas',
      'Núcleos de compiladores de expresiones',
    ],
    limits:
      'Solo polinomios pequeños con aritmética acotada. No hay parser general, factorización ni precisión arbitraria.',
    objectives: [
      {
        id: 'algebra-horner',
        label: 'Completar una evaluación de Horner',
        why: 'El acumulador muestra cómo evitar calcular cada potencia por separado.',
      },
      {
        id: 'algebra-derivative',
        label: 'Construir la derivada simbólica',
        why: 'El índice del coeficiente representa la potencia que cambia al derivar.',
      },
      {
        id: 'algebra-stationary',
        label: 'Encontrar una tangente horizontal',
        why: 'P′(x)=0 expresa una pendiente nula, no necesariamente P(x)=0.',
      },
    ],
    prediction: {
      question: 'En la parábola P(x)=x²−3, en x=0…',
      options: ['P y P′ valen 0', 'P vale −3 y P′ vale 0', 'P vale 0 y P′ vale −3'],
      answer: 1,
      explanation: 'La altura es −3, pero la pendiente en el vértice es 0.',
    },
    steps: [
      {
        title: 'Representar',
        task: 'Guardá coeficientes en orden creciente de potencias.',
        why: 'La posición es parte del significado del dato.',
        done: 'Podés representar términos faltantes sin perder su grado.',
      },
      {
        title: 'Evaluar',
        task: 'Implementá Horner y mostrá su acumulador.',
        why: 'Reutilizar el resultado parcial reduce operaciones.',
        done: 'Coincide con una evaluación directa en casos pequeños.',
      },
      {
        title: 'Derivar',
        task: 'Transformá cada coeficiente y su exponente.',
        why: 'Derivar es una operación sobre la estructura, no sobre el texto de una pantalla.',
        done: 'La derivada de una constante es el polinomio 0.',
      },
      {
        title: 'Conectar',
        task: 'Dibujá P, P′ y la tangente en un punto elegible.',
        why: 'El gráfico conecta valor, pendiente y representación simbólica.',
        done: 'Encontrás un punto donde la tangente es horizontal sin confundirlo con una raíz.',
      },
    ],
    sources: [{ title: 'NIST DLMF · esquema de Horner', url: 'https://dlmf.nist.gov/1.11' }],
    related: { rust: ['rust-36', 'rust-37', 'rust-40'], go: ['go-07', 'go-11', 'go-12'] },
    bridge: {
      rust: 'Iteradores rev, enumerate y fold expresan recorrido y acumulación; los rangos del contrato evitan overflow en este núcleo.',
      go: 'Los slices almacenan coeficientes y sus índices son exponentes; recorrer desde len−1 exige tratar también el slice vacío.',
    },
    category: 'play',
    model: 'algebra',
    code: { rust: 'rust-135', go: 'go-135' },
  },
  {
    id: 'minimax',
    title: 'El duelo de las últimas fichas',
    subtitle: 'Jugá contra una IA pequeña que puede explicar su decisión.',
    level: 'expert',
    minutes: 40,
    story:
      'Hay siete fichas y dos jugadores. El rival no adivina tu intención: explora cómo responderías y elige la jugada con mejor garantía.',
    what: 'Un juego adversarial de retirar 1 o 2 fichas, evaluado por búsqueda completa de minimax en su forma negamax.',
    why: 'Un oponente cambia el significado de una buena acción: no basta con imaginar la respuesta que más te conviene.',
    uses: [
      'IA de juegos de turnos',
      'Búsqueda adversarial',
      'Evaluación de decisiones con un rival',
    ],
    limits:
      'Juego pequeño, determinista, de información perfecta y suma cero. No equivale a una IA general ni cubre azar o información oculta.',
    objectives: [
      {
        id: 'minimax-choice',
        label: 'Elegir una jugada ganadora',
        why: 'Dejar al rival un estado perdedor transforma su −1 en tu +1.',
      },
      {
        id: 'minimax-win',
        label: 'Ganar frente al rival óptimo',
        why: 'Una ventaja inicial debe conservarse con decisiones coherentes.',
      },
      {
        id: 'minimax-loss',
        label: 'Reconocer una derrota forzada',
        why: 'Un buen algoritmo también debe informar cuando no existe victoria garantizada.',
      },
    ],
    prediction: {
      question: 'Si todas tus acciones dejan al rival una posición ganadora, tu estado vale…',
      options: ['+1', '0 automáticamente', '−1 con rival perfecto'],
      answer: 2,
      explanation:
        'El rival puede responder para ganar; desear una respuesta equivocada no cambia minimax.',
    },
    steps: [
      {
        title: 'Definir',
        task: 'Escribí acciones legales, terminales y utilidad.',
        why: 'La búsqueda solo puede ser correcta respecto de esas reglas.',
        done: 'El estado con 0 fichas es derrota para quien debería mover.',
      },
      {
        title: 'Explorar',
        task: 'Evaluá hijos cambiando la perspectiva del jugador.',
        why: 'Negar la utilidad expresa que lo bueno para el rival es malo para vos.',
        done: 'Con 2 fichas, la búsqueda recomienda retirar 2.',
      },
      {
        title: 'Elegir',
        task: 'Definí un desempate determinista.',
        why: 'Una derrota forzada puede tener varias acciones igual de malas.',
        done: 'Con 3 fichas se elige 1 según el contrato, sin inventar una victoria.',
      },
      {
        title: 'Escalar',
        task: 'Probá otro juego y límites de profundidad.',
        why: 'La búsqueda completa crece rápido; una heurística ya no garantiza el resultado final.',
        done: 'Distinguís resultado exacto de evaluación aproximada.',
      },
    ],
    sources: [
      {
        title: 'UC Berkeley CS188 · juegos y minimax',
        url: 'https://inst.eecs.berkeley.edu/~cs188/textbook/games/',
      },
    ],
    related: { rust: ['rust-06', 'rust-23', 'rust-32'], go: ['go-06', 'go-10', 'go-86'] },
    bridge: {
      rust: 'Una función recursiva pura devuelve utilidad; Option separa ausencia de acción del valor de una jugada.',
      go: 'Funciones recursivas y structs pueden representar estados; manteniendo la búsqueda pura podés probarla sin una interfaz gráfica.',
    },
    category: 'play',
    model: 'minimax',
    code: { rust: 'rust-136', go: 'go-136' },
  },
];
