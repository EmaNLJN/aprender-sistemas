import type { Exercise } from '../model/types';

// Lo que comparten los núcleos Rust y Go de un taller de play. Cada núcleo agrega su título,
// su código y sus pruebas; el catálogo es dato explícito y no se lee al evaluarse.
type PlayBrief = Pick<
  Exercise,
  'intro' | 'why' | 'objective' | 'instructions' | 'hints' | 'review' | 'prediction' | 'transfer'
>;

const transformsBrief: PlayBrief = {
  intro:
    'Una nave combina giros, escalas y traslaciones. Vas a componer dos transformaciones sin transformar cada punto por separado.',
  why: 'Una matriz compuesta representa ejecutar B primero y A después. El desplazamiento de B también debe pasar por la parte lineal de A.',
  objective:
    'Componé A después de B. Cada array [a,b,c,d,tx,ty] representa (a*x+c*y+tx, b*x+d*y+ty). Coeficientes enteros entre -10 y 10.',
  instructions: [
    'Leé el contrato y predecí un caso antes de ejecutar.',
    'Conservá la representación indicada y verificá también sus límites.',
  ],
  hints: [
    'Separá la matriz lineal 2×2 de la traslación.',
    'Las primeras cuatro entradas salen del producto de matrices.',
    'La nueva traslación es A.lineal * B.traslación + A.traslación.',
  ],
  review: {
    success:
      'Los casos distinguen la identidad, el orden de operaciones y la traslación afectada por una escala o giro.',
    pitfall:
      'Componer A y B no suele conmutar. Este formato usa vectores columna; otra convención cambia la lectura del orden.',
  },
  prediction: {
    question: 'Girar90° después de trasladar (2,0) mueve esa traslación a…',
    options: ['(2,0)', '(0,2)', '(-2,0)'],
    answer: 1,
    explanation:
      'El giro antihorario transforma también el vector de desplazamiento: (2,0) pasa a (0,2).',
  },
  transfer:
    'Aplicá la matriz compuesta a todos los vértices de una figura y comparala con los dos pasos separados.',
};

const rasterBrief: PlayBrief = {
  intro:
    'Una línea geométrica atraviesa casilleros, pero la pantalla necesita coordenadas enteras. Conservá un error acumulado para elegir el próximo píxel.',
  why: 'Bresenham compara el error sin dividir ni acumular fracciones. Ambos ejes pueden avanzar durante una misma iteración.',
  objective:
    'Devolvé los píxeles de ambos extremos incluidos, en orden desde el inicio. Coordenadas entre -20 y20. Usá dx=abs(x1-x0), dy=-abs(y1-y0), error=dx+dy; guardá e2=2*error y avanzá x si e2>=dy, y si e2<=dx.',
  instructions: [
    'Leé el contrato y predecí un caso antes de ejecutar.',
    'Conservá la representación indicada y verificá también sus límites.',
  ],
  hints: [
    'Incluí el píxel actual antes de comprobar si llegaste.',
    'Las dos decisiones usan el mismo e2, calculado antes de cambiar error.',
    'Los signos de avance dependen de cada eje; un segmento de longitud cero contiene un píxel.',
  ],
  review: {
    success:
      'Las pruebas cubren pendientes distintas, coordenadas decrecientes y extremos coincidentes.',
    pitfall:
      'La regla de empate es parte del contrato. No es antialiasing: cada píxel queda encendido o apagado.',
  },
  prediction: {
    question: 'Cuando ambas condiciones de error se cumplen…',
    options: ['Se avanza solo x', 'Se avanza solo y', 'Se avanzan ambos ejes'],
    answer: 2,
    explanation:
      'Son dos if independientes: una diagonal necesita avanzar x e y en la misma vuelta.',
  },
  transfer: 'Dibujá los resultados en una grilla y compará otra política de desempate.',
};

const raycastBrief: PlayBrief = {
  intro:
    'Una linterna envía un rayo y un planeta es un círculo. Encontrá el primer contacto delante del origen, incluso si la linterna empieza dentro.',
  why: 'Sustituir origen+t*dirección en la ecuación del círculo produce una cuadrática. Sus raíces describen entrada y salida; una raíz negativa queda detrás.',
  objective:
    'Devolvé el menor t>=0 que satisface |origen+t*dirección-centro|=radio. Sin impacto, dirección cero o radio<=0 produce ausencia. Datos finitos con magnitud<=100. t no es distancia salvo dirección de longitud1.',
  instructions: [
    'Leé el contrato y predecí un caso antes de ejecutar.',
    'Conservá la representación indicada y verificá también sus límites.',
  ],
  hints: [
    'Calculá a=d·d, b=2*(o-c)·d, c=(o-c)·(o-c)-r².',
    'Un discriminante negativo significa que no existe intersección real.',
    'Probá primero la raíz menor; si es negativa, probá la mayor.',
  ],
  review: {
    success:
      'Entrada, salida desde el interior, tangencia y escala de la dirección quedan separados por los casos.',
    pitfall:
      'Este núcleo usa coma flotante y círculos perfectos. Un trazador completo debe definir tolerancias para superficies y distancias mínimas.',
  },
  prediction: {
    question: 'Si duplicás la dirección sin cambiar el rayo geométrico, t…',
    options: ['Se duplica', 'Se reduce a la mitad', 'No cambia'],
    answer: 1,
    explanation:
      'El mismo punto se alcanza con la mitad del parámetro cuando cada unidad de t avanza el doble.',
  },
  transfer: 'Probá varios círculos y elegí el impacto con menor t válido.',
};

const pathfindingBrief: PlayBrief = {
  intro:
    'El personaje atraviesa terreno con distintos costos. El camino de menos casilleros puede cruzar un pantano carísimo.',
  why: 'A* combina costo real g y una cota optimista h. Manhattan es admisible aquí porque moverse es ortogonal y cada casilla transitable cuesta al menos1.',
  objective:
    'Buscá el costo mínimo desde arriba-izquierda hasta abajo-derecha en una grilla rectangular de hasta10×10. 0 es muro;1…9 cuesta entrar. No cobres la casilla inicial. Ausencia si vacía, irregular, extremos bloqueados o sin ruta. Usá vecinos ortogonales.',
  instructions: [
    'Leé el contrato y predecí un caso antes de ejecutar.',
    'Conservá la representación indicada y verificá también sus límites.',
  ],
  hints: [
    'Guardá el mejor costo conocido por casilla.',
    'Priorizá g + distancia Manhattan al objetivo.',
    'Si una entrada pendiente ya tiene un costo peor que el registrado, descartala.',
  ],
  review: {
    success:
      'Los casos distinguen cantidad de pasos y costo, verifican el inicio gratuito y rechazan mapas inválidos.',
    pitfall:
      'La lista abierta de esta solución se recorre para buscar el mínimo: facilita leer A*, pero una cola de prioridad escala mejor.',
  },
  prediction: {
    question: 'Manhattan sigue siendo una cota admisible con costos1…9 porque…',
    options: [
      'Cada paso cuesta al menos1',
      'Todos los costos deben ser iguales',
      'Siempre encuentra paredes',
    ],
    answer: 0,
    explanation:
      'Ignorar paredes y cobrar1 por paso nunca sobreestima el costo real permitido por este contrato.',
  },
  transfer: 'Devolvé también el camino guardando padres y compará expansiones con h=0.',
};

const physicsBrief: PlayBrief = {
  intro:
    'Antes de resolver un choque, el motor necesita saber qué región comparten dos cajas alineadas con los ejes.',
  why: 'La intersección existe cuando los intervalos se superponen estrictamente en ambos ejes. Tocar un borde no produce área.',
  objective:
    'Cada caja es [x,y,ancho,alto]. Devolvé su rectángulo de intersección si tiene área positiva; ausencia para cajas de tamaño no positivo o solo contacto. Coordenadas entre-1000 y1000 y tamaños hasta1000.',
  instructions: [
    'Leé el contrato y predecí un caso antes de ejecutar.',
    'Conservá la representación indicada y verificá también sus límites.',
  ],
  hints: [
    'La esquina inicial usa máximos de los inicios.',
    'La esquina final usa mínimos de los extremos.',
    'Rechazá si ancho o alto de la intersección no es positivo.',
  ],
  review: {
    success: 'Los casos incluyen contención, posiciones negativas y contacto sin penetración.',
    pitfall:
      'Una intersección AABB no calcula por sí sola la respuesta física ni evita que un objeto muy rápido atraviese una pared entre pasos.',
  },
  prediction: {
    question: 'Dos cajas que solo comparten un borde tienen…',
    options: ['Intersección de área positiva', 'Área de intersección cero', 'Velocidad compartida'],
    answer: 1,
    explanation:
      'El intervalo común tiene longitud0 en un eje; este contrato lo trata como ausencia de penetración.',
  },
  transfer:
    'Usá la región para visualizar el choque; después agregá velocidades y una política de respuesta.',
};

const lifeBrief: PlayBrief = {
  intro:
    'Un jardín digital no mueve criaturas: cada celda decide si vive mirando ocho vecinas de la generación anterior.',
  why: 'Leer y escribir en tableros distintos mantiene la simultaneidad. Si actualizás en el lugar, el resultado depende del orden de recorrido.',
  objective:
    'Calculá una generación de Conway B3/S23: una celda nace con3 vecinas y una viva sobrevive con2 o3. Fuera del tablero siempre está muerto, sin wrap. Tablero rectangular de hasta20×20; vacío, sin columnas o irregular produce salida vacía.',
  instructions: [
    'Leé el contrato y predecí un caso antes de ejecutar.',
    'Conservá la representación indicada y verificá también sus límites.',
  ],
  hints: [
    'Contá los ocho desplazamientos alrededor, excluyendo(0,0).',
    'Consultá solo el tablero recibido al calcular vecinos.',
    'Creá otro tablero y aplicá vivos==3 || (actual && vivos==2).',
  ],
  review: {
    success:
      'El oscilador vuelve a su forma inicial tras dos generaciones, el bloque permanece y el aislamiento desaparece.',
    pitfall:
      'Estos bordes son finitos y muertos. Un universo infinito o toroidal puede producir otro resultado.',
  },
  prediction: {
    question: 'Actualizar cada celda inmediatamente en el mismo tablero…',
    options: [
      'Mantiene simultaneidad',
      'Puede cambiar el resultado según el recorrido',
      'Es obligatorio para Conway',
    ],
    answer: 1,
    explanation:
      'Las celdas siguientes leerían valores nuevos mezclados con los de la generación anterior.',
  },
  transfer: 'Agregá un patrón glider y observá su traslación después de cuatro generaciones.',
};

const algebraBrief: PlayBrief = {
  intro:
    'Un mini sistema algebraico guarda un polinomio como coeficientes: [3,-2,0,1] representa3−2x+x³. Ahora evaluá y derivá esa estructura.',
  why: 'Horner acumula desde el coeficiente de mayor grado. La derivada cambia cada aᵢxⁱ por i·aᵢxⁱ⁻¹: la posición del coeficiente lleva significado.',
  objective:
    'Recibí coeficientes en orden creciente de potencias. Devolvé valor en x y coeficientes de la derivada, sin eliminar ceros finales. Vacío representa0; la derivada de un constante es vacía. Hasta9 coeficientes, cada uno entre-10 y10; |x|<=5.',
  instructions: [
    'Leé el contrato y predecí un caso antes de ejecutar.',
    'Conservá la representación indicada y verificá también sus límites.',
  ],
  hints: [
    'Para evaluar, recorré los coeficientes desde el último hacia el primero.',
    'El acumulador se actualiza como valor*x+coeficiente.',
    'Para derivar, omití el coeficiente0 y multiplicá cada coeficiente restante por su índice.',
  ],
  review: {
    success:
      'Los casos comprueban orden de coeficientes, signos, constantes y ceros que conservan la representación.',
    pitfall:
      'Este es un CAS mínimo para polinomios enteros acotados. No simplifica expresiones arbitrarias ni usa números de precisión ilimitada.',
  },
  prediction: {
    question: 'En [3,-2,0,1], la derivada se representa como…',
    options: ['[-2,0,3]', '[3,-2,0]', '[0,-2,3]'],
    answer: 0,
    explanation: 'La constante desaparece, −2x aporta−2 y x³ aporta3x².',
  },
  transfer: 'Derivá dos veces y compará la pendiente calculada con diferencias finitas.',
};

const minimaxBrief: PlayBrief = {
  intro:
    'Dos jugadores retiran una o dos fichas. Gana quien toma la última. La computadora explora cómo respondería un oponente que también juega bien.',
  why: 'Negamax cambia el signo de la evaluación al cambiar de jugador. Un estado sin fichas es derrota para quien debe jugar; una jugada es ganadora si deja una derrota al rival.',
  objective:
    'Elegí1 o2 fichas para maximizar el resultado con juego perfecto. Con0 fichas devolvé ausencia. En empate elegí la menor jugada. Entrada entre0 y12; resolver por búsqueda completa es suficientemente pequeño.',
  instructions: [
    'Leé el contrato y predecí un caso antes de ejecutar.',
    'Conservá la representación indicada y verificá también sus límites.',
  ],
  hints: [
    'Definí la utilidad del jugador al turno: sin fichas vale−1.',
    'Evaluá una acción como el negativo del valor del estado hijo.',
    'Recorré acciones1 y2 y cambiá la elegida solo al encontrar un valor estrictamente mejor.',
  ],
  review: {
    success:
      'Las pruebas separan ganar inmediatamente, dejar una posición perdedora y desempatar una derrota inevitable.',
    pitfall:
      'La fórmula de este juego admite una solución por módulo3, pero la búsqueda sirve para aprender minimax. Juegos mayores necesitan límites de profundidad y evaluaciones aproximadas.',
  },
  prediction: {
    question: 'Si al rival le queda una posición de valor−1, tu jugada vale…',
    options: ['−1', '0', '+1'],
    answer: 2,
    explanation: 'La utilidad cambia de perspectiva al alternar el jugador: −(−1)=+1.',
  },
  transfer: 'Permití retirar1 o3 fichas y verificá si el patrón de posiciones perdedoras cambia.',
};

export const systemsPlayCores: Exercise[] = [
  {
    id: 'rust-129',
    language: 'rust',
    stage: 41,
    level: 'medium',
    topicId: 'play-transforms',
    topic: 'Coreografía de matrices',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'Coreografía de matrices · fundamentos',
        url: 'https://www.cs.cornell.edu/courses/cs4620/2014fa/lectures/08transforms2d.pdf',
      },
    ],
    title: 'Componé la coreografía',
    ...transformsBrief,
    starter: 'fn componer(a: [i32; 6], b: [i32; 6]) -> [i32; 6] { b }',
    solution: `fn componer(a: [i32; 6], b: [i32; 6]) -> [i32; 6] {
    [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
     a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
     a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]]
}`,
    tests: [
      {
        id: 't1',
        label: 'El orden cambia el desplazamiento',
        expression:
          'componer([0,1,-1,0,0,0],[1,0,0,1,2,0]) == [0,1,-1,0,0,2] && componer([1,0,0,1,2,0],[0,1,-1,0,0,0]) == [0,1,-1,0,2,0]',
        why: 'La traslación previa se gira; la posterior no.',
        failure: 'La traslación previa se gira; la posterior no.',
      },
      {
        id: 't2',
        label: 'Identidad a ambos lados',
        expression:
          '{ let m=[2,1,3,4,-2,5]; componer([1,0,0,1,0,0],m)==m && componer(m,[1,0,0,1,0,0])==m }',
        why: 'Identidad debe conservar los seis coeficientes.',
        failure: 'Identidad debe conservar los seis coeficientes.',
      },
      {
        id: 't3',
        label: 'Escala y cizalla',
        expression: 'componer([2,0,0,3,1,-1],[1,0,2,1,4,5]) == [2,0,4,3,9,14]',
        why: 'Multiplicá el desplazamiento y sumá después el desplazamiento propio de A.',
        failure: 'Multiplicá el desplazamiento y sumá después el desplazamiento propio de A.',
      },
    ],
  },
  {
    id: 'go-129',
    language: 'go',
    stage: 41,
    level: 'medium',
    topicId: 'play-transforms',
    topic: 'Coreografía de matrices',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'Coreografía de matrices · fundamentos',
        url: 'https://www.cs.cornell.edu/courses/cs4620/2014fa/lectures/08transforms2d.pdf',
      },
    ],
    title: 'Componé la coreografía',
    ...transformsBrief,
    starter: 'func Compose(a,b [6]int) [6]int { return b }',
    solution: `func Compose(a,b [6]int) [6]int {
    return [6]int{a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]}
}`,
    tests: [
      {
        id: 't1',
        label: 'Orden de giro y traslación',
        expression:
          'Compose([6]int{0,1,-1,0,0,0},[6]int{1,0,0,1,2,0}) == ([6]int{0,1,-1,0,0,2}) && Compose([6]int{1,0,0,1,2,0},[6]int{0,1,-1,0,0,0}) == ([6]int{0,1,-1,0,2,0})',
        why: 'Un desplazamiento anterior al giro también se gira.',
        failure: 'Un desplazamiento anterior al giro también se gira.',
      },
      {
        id: 't2',
        label: 'Identidad',
        expression:
          'func() bool { m:=[6]int{2,1,3,4,-2,5}; id:=[6]int{1,0,0,1,0,0}; return Compose(id,m)==m && Compose(m,id)==m }()',
        why: 'El array incluye cuatro coeficientes lineales y dos de traslación.',
        failure: 'El array incluye cuatro coeficientes lineales y dos de traslación.',
      },
      {
        id: 't3',
        label: 'Escala y cizalla',
        expression: 'Compose([6]int{2,0,0,3,1,-1},[6]int{1,0,2,1,4,5}) == ([6]int{2,0,4,3,9,14})',
        why: 'El desplazamiento de B se transforma por A antes de agregar el desplazamiento final.',
        failure:
          'El desplazamiento de B se transforma por A antes de agregar el desplazamiento final.',
      },
    ],
  },
  {
    id: 'rust-130',
    language: 'rust',
    stage: 42,
    level: 'medium',
    topicId: 'play-raster',
    topic: 'El taller de los píxeles',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'El taller de los píxeles · fundamentos',
        url: 'https://zingl.github.io/bresenham.html',
      },
    ],
    title: 'Elegí el próximo píxel',
    ...rasterBrief,
    starter: 'fn pixeles(x0:i32,y0:i32,x1:i32,y1:i32)->Vec<(i32,i32)> { vec![(x0,y0)] }',
    solution: `fn pixeles(mut x0:i32,mut y0:i32,x1:i32,y1:i32)->Vec<(i32,i32)> {
    let dx=(x1-x0).abs(); let dy=-(y1-y0).abs();
    let sx=if x0<x1 {1}else{-1}; let sy=if y0<y1 {1}else{-1};
    let mut error=dx+dy; let mut salida=Vec::new();
    loop {
        salida.push((x0,y0)); if x0==x1 && y0==y1 {break;}
        let e2=2*error;
        if e2>=dy {error+=dy; x0+=sx;}
        if e2<=dx {error+=dx; y0+=sy;}
    }
    salida
}`,
    tests: [
      {
        id: 't1',
        label: 'Pendiente con empate',
        expression: 'pixeles(0,0,4,2)==vec![(0,0),(1,1),(2,1),(3,2),(4,2)]',
        why: 'Guardá e2 antes de modificar el error.',
        failure: 'Guardá e2 antes de modificar el error.',
      },
      {
        id: 't2',
        label: 'Ambos ejes decrecen',
        expression: 'pixeles(2,3,0,-1)==vec![(2,3),(1,2),(1,1),(0,0),(0,-1)]',
        why: 'El signo del incremento no debe fijarse siempre en +1.',
        failure: 'El signo del incremento no debe fijarse siempre en +1.',
      },
      {
        id: 't3',
        label: 'Horizontal y punto',
        expression:
          'pixeles(2,-1,-1,-1)==vec![(2,-1),(1,-1),(0,-1),(-1,-1)] && pixeles(3,3,3,3)==vec![(3,3)]',
        why: 'El último extremo cuenta incluso cuando también es el primero.',
        failure: 'El último extremo cuenta incluso cuando también es el primero.',
      },
    ],
  },
  {
    id: 'go-130',
    language: 'go',
    stage: 42,
    level: 'medium',
    topicId: 'play-raster',
    topic: 'El taller de los píxeles',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'El taller de los píxeles · fundamentos',
        url: 'https://zingl.github.io/bresenham.html',
      },
    ],
    title: 'Elegí el próximo píxel',
    ...rasterBrief,
    starter: `type Pixel struct { X,Y int }
func Pixels(x0,y0,x1,y1 int) []Pixel { return []Pixel{{x0,y0}} }`,
    solution: `type Pixel struct { X,Y int }
func Pixels(x0,y0,x1,y1 int) []Pixel {
    abs:=func(n int)int{if n<0{return -n};return n}
    dx,dy:=abs(x1-x0),-abs(y1-y0); sx,sy:=-1,-1
    if x0<x1{sx=1};if y0<y1{sy=1};err:=dx+dy
    out:=[]Pixel{}
    for {out=append(out,Pixel{x0,y0});if x0==x1 && y0==y1{break};e2:=2*err;if e2>=dy{err+=dy;x0+=sx};if e2<=dx{err+=dx;y0+=sy}}
    return out
}`,
    tests: [
      {
        id: 't1',
        label: 'Pendiente con empate',
        expression: 'fmt.Sprint(Pixels(0,0,4,2))=="[{0 0} {1 1} {2 1} {3 2} {4 2}]"',
        why: 'Las dos condiciones usan el mismo error duplicado.',
        failure: 'Las dos condiciones usan el mismo error duplicado.',
      },
      {
        id: 't2',
        label: 'Coordenadas decrecientes',
        expression: 'fmt.Sprint(Pixels(2,3,0,-1))=="[{2 3} {1 2} {1 1} {0 0} {0 -1}]"',
        why: 'Cada eje tiene su propio sentido de avance.',
        failure: 'Cada eje tiene su propio sentido de avance.',
      },
      {
        id: 't3',
        label: 'Horizontal y punto',
        expression:
          'fmt.Sprint(Pixels(2,-1,-1,-1))=="[{2 -1} {1 -1} {0 -1} {-1 -1}]" && fmt.Sprint(Pixels(3,3,3,3))=="[{3 3}]"',
        why: 'Incluí ambos extremos sin duplicar el punto aislado.',
        failure: 'Incluí ambos extremos sin duplicar el punto aislado.',
      },
    ],
  },
  {
    id: 'rust-131',
    language: 'rust',
    stage: 43,
    level: 'advanced',
    topicId: 'play-raycast',
    topic: 'Linterna entre planetas',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'Linterna entre planetas · fundamentos',
        url: 'https://raytracing.github.io/books/RayTracingInOneWeekend.html',
      },
    ],
    title: 'Encontrá la primera intersección',
    ...raycastBrief,
    starter: 'fn impacto(o:[f64;2],d:[f64;2],centro:[f64;2],r:f64)->Option<f64>{None}',
    solution: `fn impacto(o:[f64;2],d:[f64;2],centro:[f64;2],r:f64)->Option<f64>{
    let a=d[0]*d[0]+d[1]*d[1]; if a==0.0 || r<=0.0{return None;}
    let x=o[0]-centro[0];let y=o[1]-centro[1];let b=2.0*(x*d[0]+y*d[1]);
    let c=x*x+y*y-r*r;let disc=b*b-4.0*a*c;if disc<0.0{return None;}
    let raiz=disc.sqrt();let t1=(-b-raiz)/(2.0*a);let t2=(-b+raiz)/(2.0*a);
    if t1>=0.0{Some(t1)}else if t2>=0.0{Some(t2)}else{None}
}`,
    tests: [
      {
        id: 't1',
        label: 'Distancia y parámetro',
        expression:
          'impacto([0.,0.],[1.,0.],[5.,0.],1.).map(|t|(t-4.).abs()<1e-9)==Some(true) && impacto([0.,0.],[2.,0.],[5.,0.],1.).map(|t|(t-2.).abs()<1e-9)==Some(true)',
        why: 'No asumas que la dirección está normalizada.',
        failure: 'No asumas que la dirección está normalizada.',
      },
      {
        id: 't2',
        label: 'Interior y tangencia',
        expression:
          'impacto([0.,0.],[1.,0.],[0.,0.],1.)==Some(1.) && impacto([0.,0.],[1.,0.],[5.,1.],1.)==Some(5.)',
        why: 'Desde dentro, la raíz de salida es la primera no negativa.',
        failure: 'Desde dentro, la raíz de salida es la primera no negativa.',
      },
      {
        id: 't3',
        label: 'Ausencia y geometría inválida',
        expression:
          'impacto([0.,0.],[1.,0.],[-5.,0.],1.)==None && impacto([0.,0.],[1.,0.],[5.,3.],1.)==None && impacto([0.,0.],[0.,0.],[0.,0.],1.)==None && impacto([0.,0.],[1.,0.],[0.,0.],0.)==None',
        why: 'Distinguir discriminante, dirección y radio evita dividir por cero o aceptar impactos detrás.',
        failure:
          'Distinguir discriminante, dirección y radio evita dividir por cero o aceptar impactos detrás.',
      },
    ],
  },
  {
    id: 'go-131',
    language: 'go',
    stage: 43,
    level: 'advanced',
    topicId: 'play-raycast',
    topic: 'Linterna entre planetas',
    kind: 'completar',
    minutes: 20,
    imports: ['math'],
    visual: 'flow',
    sources: [
      {
        title: 'Linterna entre planetas · fundamentos',
        url: 'https://raytracing.github.io/books/RayTracingInOneWeekend.html',
      },
    ],
    title: 'Encontrá la primera intersección',
    ...raycastBrief,
    starter: 'func Hit(o,d,c [2]float64,r float64)(float64,bool){ _=math.Sqrt(0);return 0,false }',
    solution: `func Hit(o,d,center [2]float64,r float64)(float64,bool){
    a:=d[0]*d[0]+d[1]*d[1];if a==0 || r<=0{return 0,false}
    x,y:=o[0]-center[0],o[1]-center[1];b:=2*(x*d[0]+y*d[1]);c:=x*x+y*y-r*r
    disc:=b*b-4*a*c;if disc<0{return 0,false};root:=math.Sqrt(disc)
    t1,t2:=(-b-root)/(2*a),(-b+root)/(2*a)
    if t1>=0{return t1,true};if t2>=0{return t2,true};return 0,false
}`,
    tests: [
      {
        id: 't1',
        label: 'Direcciones de distinta magnitud',
        expression:
          'func()bool{a,ok:=Hit([2]float64{},[2]float64{1,0},[2]float64{5,0},1);b,yes:=Hit([2]float64{},[2]float64{2,0},[2]float64{5,0},1);return ok&&yes&&math.Abs(a-4)<1e-9&&math.Abs(b-2)<1e-9}()',
        why: 'Duplicar la dirección divide t, no cambia el punto alcanzado.',
        failure: 'Duplicar la dirección divide t, no cambia el punto alcanzado.',
      },
      {
        id: 't2',
        label: 'Interior y tangencia',
        expression:
          'func()bool{a,ok:=Hit([2]float64{},[2]float64{1,0},[2]float64{},1);b,yes:=Hit([2]float64{},[2]float64{1,0},[2]float64{5,1},1);return ok&&yes&&a==1&&b==5}()',
        why: 'La salida desde el interior puede ser la segunda raíz.',
        failure: 'La salida desde el interior puede ser la segunda raíz.',
      },
      {
        id: 't3',
        label: 'No hay impacto válido',
        expression:
          'func()bool{_,a:=Hit([2]float64{},[2]float64{1,0},[2]float64{-5,0},1);_,b:=Hit([2]float64{},[2]float64{1,0},[2]float64{5,3},1);_,c:=Hit([2]float64{},[2]float64{},[2]float64{},1);_,d:=Hit([2]float64{},[2]float64{1,0},[2]float64{},0);return !a&&!b&&!c&&!d}()',
        why: 'Los errores geométricos son ausencia, no un contacto falso en t=0.',
        failure: 'Los errores geométricos son ausencia, no un contacto falso en t=0.',
      },
    ],
  },
  {
    id: 'rust-132',
    language: 'rust',
    stage: 44,
    level: 'advanced',
    topicId: 'play-pathfinding',
    topic: 'El mapa que piensa',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'El mapa que piensa · fundamentos',
        url: 'https://www.redblobgames.com/pathfinding/a-star/introduction.html',
      },
    ],
    title: 'El camino barato no siempre es el corto',
    ...pathfindingBrief,
    starter: 'fn costo_ruta(g:&[Vec<u8>])->Option<u32>{None}',
    solution: `fn costo_ruta(g:&[Vec<u8>])->Option<u32>{
    let filas=g.len();let cols=g.first()?.len();
    if cols==0 || g.iter().any(|r|r.len()!=cols) || g[0][0]==0 || g[filas-1][cols-1]==0{return None;}
    let mut costos=vec![vec![u32::MAX;cols];filas];costos[0][0]=0;
    let mut abiertos=vec![((filas+cols-2) as u32,0u32,0usize,0usize)];
    while !abiertos.is_empty(){
        let i=abiertos.iter().enumerate().min_by_key(|(_,n)|n.0).unwrap().0;
        let (_,c,f,x)=abiertos.remove(i);if c!=costos[f][x]{continue;}
        if f==filas-1 && x==cols-1{return Some(c);}
        for (df,dx) in [(-1isize,0isize),(0,1),(1,0),(0,-1)]{
            let Some(nf)=f.checked_add_signed(df) else{continue;};let Some(nx)=x.checked_add_signed(dx) else{continue;};
            if nf>=filas || nx>=cols || g[nf][nx]==0{continue;}
            let nuevo=c+u32::from(g[nf][nx]);if nuevo<costos[nf][nx]{costos[nf][nx]=nuevo;let h=(filas-1-nf+cols-1-nx) as u32;abiertos.push((nuevo+h,nuevo,nf,nx));}
        }
    }
    None
}`,
    tests: [
      {
        id: 't1',
        label: 'Desvío barato',
        expression:
          'costo_ruta(&[vec![1,9,1],vec![1,1,1]])==Some(3) && costo_ruta(&[vec![1,2,3]])==Some(5)',
        why: 'Se cobra entrar en cada casilla, no el inicio.',
        failure: 'Se cobra entrar en cada casilla, no el inicio.',
      },
      {
        id: 't2',
        label: 'Inicio y muro',
        expression: 'costo_ruta(&[vec![9]])==Some(0) && costo_ruta(&[vec![1,0],vec![0,1]])==None',
        why: 'Una única casilla transitable no necesita movimiento.',
        failure: 'Una única casilla transitable no necesita movimiento.',
      },
      {
        id: 't3',
        label: 'Mapas inválidos',
        expression:
          'costo_ruta(&[])==None && costo_ruta(&[vec![]])==None && costo_ruta(&[vec![1,1],vec![1]])==None && costo_ruta(&[vec![0,1]])==None && costo_ruta(&[vec![1,0]])==None',
        why: 'Validá forma y extremos antes de indexar.',
        failure: 'Validá forma y extremos antes de indexar.',
      },
    ],
  },
  {
    id: 'go-132',
    language: 'go',
    stage: 44,
    level: 'advanced',
    topicId: 'play-pathfinding',
    topic: 'El mapa que piensa',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'El mapa que piensa · fundamentos',
        url: 'https://www.redblobgames.com/pathfinding/a-star/introduction.html',
      },
    ],
    title: 'El camino barato no siempre es el corto',
    ...pathfindingBrief,
    starter: 'func RouteCost(g [][]int)(int,bool){return 0,false}',
    solution: `func RouteCost(g [][]int)(int,bool){
    rows:=len(g);if rows==0||len(g[0])==0{return 0,false};cols:=len(g[0]);for _,row:=range g{if len(row)!=cols{return 0,false}}
    if g[0][0]==0||g[rows-1][cols-1]==0{return 0,false}
    type node struct{f,cost,r,c int};open:=[]node{{rows+cols-2,0,0,0}};best:=make([][]int,rows)
    for r:=range best{best[r]=make([]int,cols);for c:=range best[r]{best[r][c]=1<<30}};best[0][0]=0
    for len(open)>0{at:=0;for i:=range open{if open[i].f<open[at].f{at=i}};n:=open[at];open=append(open[:at],open[at+1:]...);if n.cost!=best[n.r][n.c]{continue};if n.r==rows-1&&n.c==cols-1{return n.cost,true}
        for _,d:=range [][2]int{{-1,0},{0,1},{1,0},{0,-1}}{r,c:=n.r+d[0],n.c+d[1];if r<0||c<0||r>=rows||c>=cols||g[r][c]==0{continue};cost:=n.cost+g[r][c];if cost<best[r][c]{best[r][c]=cost;open=append(open,node{cost+rows-1-r+cols-1-c,cost,r,c})}}
    };return 0,false
}`,
    tests: [
      {
        id: 't1',
        label: 'Costo frente a distancia',
        expression:
          'func()bool{a,ok:=RouteCost([][]int{{1,9,1},{1,1,1}});b,yes:=RouteCost([][]int{{1,2,3}});return ok&&yes&&a==3&&b==5}()',
        why: 'Un desvío puede evitar una entrada de costo9.',
        failure: 'Un desvío puede evitar una entrada de costo9.',
      },
      {
        id: 't2',
        label: 'Inicio gratis y aislamiento',
        expression:
          'func()bool{a,ok:=RouteCost([][]int{{9}});_,blocked:=RouteCost([][]int{{1,0},{0,1}});return ok&&a==0&&!blocked}()',
        why: 'El inicio cuesta0 aunque su etiqueta sea9.',
        failure: 'El inicio cuesta0 aunque su etiqueta sea9.',
      },
      {
        id: 't3',
        label: 'Validación de forma',
        expression:
          'func()bool{for _,g:=range [][][]int{nil,{{}},{{1,1},{1}},{{0,1}},{{1,0}}}{_,ok:=RouteCost(g);if ok{return false}};return true}()',
        why: 'Rechazá grillas vacías, irregulares y extremos bloqueados.',
        failure: 'Rechazá grillas vacías, irregulares y extremos bloqueados.',
      },
    ],
  },
  {
    id: 'rust-133',
    language: 'rust',
    stage: 45,
    level: 'medium',
    topicId: 'play-physics',
    topic: 'La cancha de los rebotes',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'La cancha de los rebotes · fundamentos',
        url: 'https://gafferongames.com/post/fix_your_timestep/',
      },
    ],
    title: 'Detectá la región del choque',
    ...physicsBrief,
    starter: 'fn interseccion(a:[i32;4],b:[i32;4])->Option<[i32;4]>{None}',
    solution: `fn interseccion(a:[i32;4],b:[i32;4])->Option<[i32;4]>{
    if a[2]<=0||a[3]<=0||b[2]<=0||b[3]<=0{return None;}
    let x=a[0].max(b[0]);let y=a[1].max(b[1]);let fin_x=(a[0]+a[2]).min(b[0]+b[2]);let fin_y=(a[1]+a[3]).min(b[1]+b[3]);
    if fin_x<=x||fin_y<=y{None}else{Some([x,y,fin_x-x,fin_y-y])}
}`,
    tests: [
      {
        id: 't1',
        label: 'Penetración parcial',
        expression: 'interseccion([0,0,4,4],[3,1,4,4])==Some([3,1,1,3])',
        why: 'Intersecá los intervalos horizontal y vertical por separado.',
        failure: 'Intersecá los intervalos horizontal y vertical por separado.',
      },
      {
        id: 't2',
        label: 'Contención y simetría',
        expression:
          'interseccion([-5,-5,10,10],[-2,-1,3,2])==Some([-2,-1,3,2]) && interseccion([-2,-1,3,2],[-5,-5,10,10])==Some([-2,-1,3,2])',
        why: 'La caja contenida es toda la intersección, sin depender del orden.',
        failure: 'La caja contenida es toda la intersección, sin depender del orden.',
      },
      {
        id: 't3',
        label: 'Contacto y tamaños inválidos',
        expression:
          'interseccion([0,0,2,2],[2,0,2,2])==None && interseccion([0,0,0,2],[0,0,3,3])==None && interseccion([0,0,2,2],[0,0,2,-1])==None',
        why: 'No conviertas área0 ni dimensiones negativas en colisión.',
        failure: 'No conviertas área0 ni dimensiones negativas en colisión.',
      },
    ],
  },
  {
    id: 'go-133',
    language: 'go',
    stage: 45,
    level: 'medium',
    topicId: 'play-physics',
    topic: 'La cancha de los rebotes',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'La cancha de los rebotes · fundamentos',
        url: 'https://gafferongames.com/post/fix_your_timestep/',
      },
    ],
    title: 'Detectá la región del choque',
    ...physicsBrief,
    starter: 'func Intersection(a,b [4]int)([4]int,bool){return [4]int{},false}',
    solution: `func Intersection(a,b [4]int)([4]int,bool){
    if a[2]<=0||a[3]<=0||b[2]<=0||b[3]<=0{return [4]int{},false};x,y:=a[0],a[1];if b[0]>x{x=b[0]};if b[1]>y{y=b[1]};right,bottom:=a[0]+a[2],a[1]+a[3];if b[0]+b[2]<right{right=b[0]+b[2]};if b[1]+b[3]<bottom{bottom=b[1]+b[3]};if right<=x||bottom<=y{return [4]int{},false};return [4]int{x,y,right-x,bottom-y},true
}`,
    tests: [
      {
        id: 't1',
        label: 'Penetración parcial',
        expression:
          'func()bool{r,ok:=Intersection([4]int{0,0,4,4},[4]int{3,1,4,4});return ok&&r==([4]int{3,1,1,3})}()',
        why: 'El ancho común es1 y el alto común3.',
        failure: 'El ancho común es1 y el alto común3.',
      },
      {
        id: 't2',
        label: 'Contención simétrica',
        expression:
          'func()bool{a,b:=[4]int{-5,-5,10,10},[4]int{-2,-1,3,2};x,ok:=Intersection(a,b);y,yes:=Intersection(b,a);return ok&&yes&&x==b&&y==b}()',
        why: 'Tomar mínimos de tamaños no basta: importan también las posiciones.',
        failure: 'Tomar mínimos de tamaños no basta: importan también las posiciones.',
      },
      {
        id: 't3',
        label: 'Contacto y caja degenerada',
        expression:
          'func()bool{_,a:=Intersection([4]int{0,0,2,2},[4]int{2,0,2,2});_,b:=Intersection([4]int{0,0,0,2},[4]int{0,0,3,3});_,c:=Intersection([4]int{0,0,2,2},[4]int{0,0,2,-1});return !a&&!b&&!c}()',
        why: 'El área compartida debe ser estrictamente positiva.',
        failure: 'El área compartida debe ser estrictamente positiva.',
      },
    ],
  },
  {
    id: 'rust-134',
    language: 'rust',
    stage: 46,
    level: 'beginner',
    topicId: 'play-life',
    topic: 'Un jardín de reglas',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'Un jardín de reglas · fundamentos',
        url: 'https://www.cs.princeton.edu/courses/archive/fall15/cos126/lectures/CS.Movies.pdf',
      },
    ],
    title: 'Hacé crecer una generación',
    ...lifeBrief,
    starter: 'fn siguiente(g:&[Vec<bool>])->Vec<Vec<bool>>{g.to_vec()}',
    solution: `fn siguiente(g:&[Vec<bool>])->Vec<Vec<bool>>{
    let rows=g.len();if rows==0{return vec![];}let cols=g[0].len();if cols==0||g.iter().any(|r|r.len()!=cols){return vec![];}
    let mut out=vec![vec![false;cols];rows];
    for r in 0..rows{for c in 0..cols{let mut n=0;for dr in -1isize..=1{for dc in -1isize..=1{if dr==0&&dc==0{continue;}let rr=r as isize+dr;let cc=c as isize+dc;if rr>=0&&cc>=0&&(rr as usize)<rows&&(cc as usize)<cols&&g[rr as usize][cc as usize]{n+=1;}}}out[r][c]=n==3||(g[r][c]&&n==2);}}
    out
}`,
    tests: [
      {
        id: 't1',
        label: 'Oscilador simultáneo',
        expression:
          '{let mut a=vec![vec![false;5];5];a[2][1]=true;a[2][2]=true;a[2][3]=true;let mut b=vec![vec![false;5];5];b[1][2]=true;b[2][2]=true;b[3][2]=true;siguiente(&a)==b&&siguiente(&b)==a}',
        why: 'Usá un tablero nuevo; el blinker debe rotar y volver.',
        failure: 'Usá un tablero nuevo; el blinker debe rotar y volver.',
      },
      {
        id: 't2',
        label: 'Bloque y sobrepoblación',
        expression:
          'siguiente(&[vec![true,true],vec![true,true]])==vec![vec![true,true],vec![true,true]] && siguiente(&vec![vec![true;3];3])==vec![vec![true,false,true],vec![false,false,false],vec![true,false,true]]',
        why: 'Una viva con3 vecinas sobrevive; con5 u8 muere.',
        failure: 'Una viva con3 vecinas sobrevive; con5 u8 muere.',
      },
      {
        id: 't3',
        label: 'Borde muerto y entrada inválida',
        expression:
          'siguiente(&[vec![true]])==vec![vec![false]] && siguiente(&[]).is_empty() && siguiente(&[vec![]]).is_empty() && siguiente(&[vec![true],vec![true,false]]).is_empty()',
        why: 'No conectes bordes opuestos ni indexes filas irregulares.',
        failure: 'No conectes bordes opuestos ni indexes filas irregulares.',
      },
    ],
  },
  {
    id: 'go-134',
    language: 'go',
    stage: 46,
    level: 'beginner',
    topicId: 'play-life',
    topic: 'Un jardín de reglas',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'Un jardín de reglas · fundamentos',
        url: 'https://www.cs.princeton.edu/courses/archive/fall15/cos126/lectures/CS.Movies.pdf',
      },
    ],
    title: 'Hacé crecer una generación',
    ...lifeBrief,
    starter: 'func NextLife(g [][]bool) [][]bool{return g}',
    solution: `func NextLife(g [][]bool) [][]bool{
    rows:=len(g);if rows==0||len(g[0])==0{return nil};cols:=len(g[0]);for _,row:=range g{if len(row)!=cols{return nil}}
    out:=make([][]bool,rows);for r:=range out{out[r]=make([]bool,cols);for c:=range out[r]{n:=0;for dr:=-1;dr<=1;dr++{for dc:=-1;dc<=1;dc++{if dr==0&&dc==0{continue};rr,cc:=r+dr,c+dc;if rr>=0&&cc>=0&&rr<rows&&cc<cols&&g[rr][cc]{n++}}};out[r][c]=n==3||(g[r][c]&&n==2)}};return out
}`,
    tests: [
      {
        id: 't1',
        label: 'Oscilador de período2',
        expression:
          'func()bool{a:=make([][]bool,5);b:=make([][]bool,5);for i:=range a{a[i]=make([]bool,5);b[i]=make([]bool,5)};for i:=1;i<=3;i++{a[2][i]=true;b[i][2]=true};return fmt.Sprint(NextLife(a))==fmt.Sprint(b)&&fmt.Sprint(NextLife(b))==fmt.Sprint(a)}()',
        why: 'Las decisiones deben leer una misma generación.',
        failure: 'Las decisiones deben leer una misma generación.',
      },
      {
        id: 't2',
        label: 'Bloque y sobrepoblación',
        expression:
          'fmt.Sprint(NextLife([][]bool{{true,true},{true,true}}))=="[[true true] [true true]]" && fmt.Sprint(NextLife([][]bool{{true,true,true},{true,true,true},{true,true,true}}))=="[[true false true] [false false false] [true false true]]"',
        why: 'Los ocho vecinos incluyen diagonales, no la celda central.',
        failure: 'Los ocho vecinos incluyen diagonales, no la celda central.',
      },
      {
        id: 't3',
        label: 'Aislamiento y forma',
        expression:
          'fmt.Sprint(NextLife([][]bool{{true}}))=="[[false]]" && len(NextLife(nil))==0 && len(NextLife([][]bool{{}}))==0 && len(NextLife([][]bool{{true},{true,false}}))==0',
        why: 'Las celdas exteriores son muertas; las grillas inválidas se rechazan.',
        failure: 'Las celdas exteriores son muertas; las grillas inválidas se rechazan.',
      },
    ],
  },
  {
    id: 'rust-135',
    language: 'rust',
    stage: 47,
    level: 'advanced',
    topicId: 'play-algebra',
    topic: 'La máquina de polinomios',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      { title: 'La máquina de polinomios · fundamentos', url: 'https://dlmf.nist.gov/1.11' },
    ],
    title: 'Derivá una estructura, no un string',
    ...algebraBrief,
    starter: 'fn analizar(coef:&[i64],x:i64)->(i64,Vec<i64>){(0,vec![])}',
    solution: `fn analizar(coef:&[i64],x:i64)->(i64,Vec<i64>){
    let valor=coef.iter().rev().fold(0,|a,&c|a*x+c);
    let derivada=coef.iter().enumerate().skip(1).map(|(i,&c)|i as i64*c).collect();
    (valor,derivada)
}`,
    tests: [
      {
        id: 't1',
        label: 'Cúbico con huecos',
        expression:
          'analizar(&[3,-2,0,1],2)==(7,vec![-2,0,3]) && analizar(&[3,-2,0,1],-1)==(4,vec![-2,0,3])',
        why: 'El índice marca la potencia; un hueco no desaparece.',
        failure: 'El índice marca la potencia; un hueco no desaparece.',
      },
      {
        id: 't2',
        label: 'Cero y constante',
        expression: 'analizar(&[],5)==(0,vec![]) && analizar(&[9],-3)==(9,vec![])',
        why: 'No inventes una entrada para la derivada de un constante.',
        failure: 'No inventes una entrada para la derivada de un constante.',
      },
      {
        id: 't3',
        label: 'Ceros finales preservados',
        expression: 'analizar(&[0,5,0],-2)==(-10,vec![5,0]) && analizar(&[1,2,3],0)==(1,vec![2,6])',
        why: 'La derivada conserva las posiciones, incluso con coeficientes0.',
        failure: 'La derivada conserva las posiciones, incluso con coeficientes0.',
      },
    ],
  },
  {
    id: 'go-135',
    language: 'go',
    stage: 47,
    level: 'advanced',
    topicId: 'play-algebra',
    topic: 'La máquina de polinomios',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      { title: 'La máquina de polinomios · fundamentos', url: 'https://dlmf.nist.gov/1.11' },
    ],
    title: 'Derivá una estructura, no un string',
    ...algebraBrief,
    starter: 'func Analyze(coef []int64,x int64)(int64,[]int64){return 0,nil}',
    solution: `func Analyze(coef []int64,x int64)(int64,[]int64){
    var value int64;for i:=len(coef)-1;i>=0;i--{value=value*x+coef[i]}
    derivative:=[]int64{};for i:=1;i<len(coef);i++{derivative=append(derivative,int64(i)*coef[i])};return value,derivative
}`,
    tests: [
      {
        id: 't1',
        label: 'Cúbico con huecos',
        expression:
          'func()bool{a,d:=Analyze([]int64{3,-2,0,1},2);b,e:=Analyze([]int64{3,-2,0,1},-1);return a==7&&b==4&&fmt.Sprint(d)=="[-2 0 3]"&&fmt.Sprint(e)=="[-2 0 3]"}()',
        why: 'Recorré al revés para Horner, pero preservá el orden de la derivada.',
        failure: 'Recorré al revés para Horner, pero preservá el orden de la derivada.',
      },
      {
        id: 't2',
        label: 'Constantes',
        expression:
          'func()bool{a,d:=Analyze(nil,5);b,e:=Analyze([]int64{9},-3);return a==0&&b==9&&len(d)==0&&len(e)==0}()',
        why: 'Un polinomio vacío vale0 y la derivada de una constante no tiene términos.',
        failure: 'Un polinomio vacío vale0 y la derivada de una constante no tiene términos.',
      },
      {
        id: 't3',
        label: 'Representación con ceros',
        expression:
          'func()bool{a,d:=Analyze([]int64{0,5,0},-2);b,e:=Analyze([]int64{1,2,3},0);return a == -10&&b==1&&fmt.Sprint(d)=="[5 0]"&&fmt.Sprint(e)=="[2 6]"}()',
        why: 'No elimines ceros finales si el contrato pide conservarlos.',
        failure: 'No elimines ceros finales si el contrato pide conservarlos.',
      },
    ],
  },
  {
    id: 'rust-136',
    language: 'rust',
    stage: 48,
    level: 'expert',
    topicId: 'play-minimax',
    topic: 'El duelo de las últimas fichas',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'El duelo de las últimas fichas · fundamentos',
        url: 'https://inst.eecs.berkeley.edu/~cs188/textbook/games/',
      },
    ],
    title: 'Buscá antes de tomar una ficha',
    ...minimaxBrief,
    starter: 'fn mejor_jugada(n:usize)->Option<usize>{if n==0{None}else{Some(1)}}',
    solution: `fn valor(n:usize)->i32{if n==0{return -1;}let mut mejor=-2;for k in 1..=2.min(n){mejor=mejor.max(-valor(n-k));}mejor}
fn mejor_jugada(n:usize)->Option<usize>{
    if n==0{return None;}let mut elegida=1;let mut mejor=-2;
    for k in 1..=2.min(n){let v=-valor(n-k);if v>mejor{mejor=v;elegida=k;}}
    Some(elegida)
}`,
    tests: [
      {
        id: 't1',
        label: 'Últimas fichas',
        expression: 'mejor_jugada(1)==Some(1)&&mejor_jugada(2)==Some(2)',
        why: 'Si podés terminar, esa acción gana.',
        failure: 'Si podés terminar, esa acción gana.',
      },
      {
        id: 't2',
        label: 'Ganar y desempatar',
        expression:
          'mejor_jugada(3)==Some(1)&&mejor_jugada(4)==Some(1)&&mejor_jugada(5)==Some(2)&&mejor_jugada(6)==Some(1)',
        why: 'En posiciones perdedoras ambas acciones empatan; elegí1.',
        failure: 'En posiciones perdedoras ambas acciones empatan; elegí1.',
      },
      {
        id: 't3',
        label: 'Terminal y patrón completo',
        expression:
          'mejor_jugada(0)==None && (1..=12).all(|n|{let k=mejor_jugada(n).unwrap();if n%3==0{k==1}else{(n-k)%3==0}})',
        why: 'Contrastá la búsqueda con la propiedad matemática en todo el dominio pequeño.',
        failure: 'Contrastá la búsqueda con la propiedad matemática en todo el dominio pequeño.',
      },
    ],
  },
  {
    id: 'go-136',
    language: 'go',
    stage: 48,
    level: 'expert',
    topicId: 'play-minimax',
    topic: 'El duelo de las últimas fichas',
    kind: 'completar',
    minutes: 20,
    imports: [],
    visual: 'flow',
    sources: [
      {
        title: 'El duelo de las últimas fichas · fundamentos',
        url: 'https://inst.eecs.berkeley.edu/~cs188/textbook/games/',
      },
    ],
    title: 'Buscá antes de tomar una ficha',
    ...minimaxBrief,
    objective:
      'Elegí1 o2 fichas para maximizar el resultado con juego perfecto. Con0 fichas devolvé ausencia. En empate elegí la menor jugada. Entrada entre0 y12; resolver por búsqueda completa es suficientemente pequeño. En Go,0 representa ausencia.',
    starter: 'func BestMove(n int) int {if n==0{return 0};return 1}',
    solution: `func positionValue(n int) int{if n==0{return -1};best:=-2;for k:=1;k<=2&&k<=n;k++{v:=-positionValue(n-k);if v>best{best=v}};return best}
func BestMove(n int) int{
    if n==0{return 0};chosen,best:=1,-2
    for k:=1;k<=2&&k<=n;k++{v:=-positionValue(n-k);if v>best{best=v;chosen=k}};return chosen
}`,
    tests: [
      {
        id: 't1',
        label: 'Victoria inmediata',
        expression: 'BestMove(1)==1&&BestMove(2)==2',
        why: 'Con2 fichas retirar1 regalaría la última al rival.',
        failure: 'Con2 fichas retirar1 regalaría la última al rival.',
      },
      {
        id: 't2',
        label: 'Patrón y desempate',
        expression: 'BestMove(3)==1&&BestMove(4)==1&&BestMove(5)==2&&BestMove(6)==1',
        why: 'Una derrota inevitable no elimina la regla de desempate.',
        failure: 'Una derrota inevitable no elimina la regla de desempate.',
      },
      {
        id: 't3',
        label: 'Terminal y dominio acotado',
        expression:
          'func()bool{if BestMove(0)!=0{return false};for n:=1;n<=12;n++{k:=BestMove(n);if k<1||k>2{return false};if n%3==0{if k!=1{return false}}else if (n-k)%3!=0{return false}};return true}()',
        why: 'En Go,0 representa ausencia de movimiento; el dominio no incluye negativos.',
        failure: 'En Go,0 representa ausencia de movimiento; el dominio no incluye negativos.',
      },
    ],
  },
];
