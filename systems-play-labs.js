/* Original kernels for the visual computing workshops. No external crates. */
window.SYSTEMS_PLAY_LABS = (() => {
  const labs = [];
  const topics = [
    [
      'transforms',
      'Coreografía de matrices',
      'medium',
      'https://www.cs.cornell.edu/courses/cs4620/2014fa/lectures/08transforms2d.pdf',
    ],
    ['raster', 'El taller de los píxeles', 'medium', 'https://zingl.github.io/bresenham.html'],
    [
      'raycast',
      'Linterna entre planetas',
      'advanced',
      'https://raytracing.github.io/books/RayTracingInOneWeekend.html',
    ],
    [
      'pathfinding',
      'El mapa que piensa',
      'advanced',
      'https://www.redblobgames.com/pathfinding/a-star/introduction.html',
    ],
    [
      'physics',
      'La cancha de los rebotes',
      'medium',
      'https://gafferongames.com/post/fix_your_timestep/',
    ],
    [
      'life',
      'Un jardín de reglas',
      'beginner',
      'https://www.cs.princeton.edu/courses/archive/fall15/cos126/lectures/CS.Movies.pdf',
    ],
    ['algebra', 'La máquina de polinomios', 'advanced', 'https://dlmf.nist.gov/1.11'],
    [
      'minimax',
      'El duelo de las últimas fichas',
      'expert',
      'https://inst.eecs.berkeley.edu/~cs188/textbook/games/',
    ],
  ];
  const t = (label, expression, why) => ({ label, expression, why, failure: why });
  function add(i, language, data) {
    const [topicId, topic, level, url] = topics[i];
    labs.push({
      id: language + '-' + (129 + i),
      language,
      stage: 41 + i,
      level,
      topicId: 'play-' + topicId,
      topic,
      kind: 'completar',
      minutes: 20,
      imports: [],
      visual: 'flow',
      sources: [{ title: topic + ' · fundamentos', url }],
      ...data,
      tests: data.tests.map((test, n) => ({ id: 't' + (n + 1), ...test })),
    });
  }
  const common = (
    intro,
    why,
    objective,
    hints,
    success,
    pitfall,
    question,
    options,
    answer,
    explanation,
    transfer,
  ) => ({
    intro,
    why,
    objective,
    instructions: [
      'Leé el contrato y predecí un caso antes de ejecutar.',
      'Conservá la representación indicada y verificá también sus límites.',
    ],
    hints,
    review: { success, pitfall },
    prediction: { question, options, answer, explanation },
    transfer,
  });

  const affine = common(
    'Una nave combina giros, escalas y traslaciones. Vas a componer dos transformaciones sin transformar cada punto por separado.',
    'Una matriz compuesta representa ejecutar B primero y A después. El desplazamiento de B también debe pasar por la parte lineal de A.',
    'Componé A después de B. Cada array [a,b,c,d,tx,ty] representa (a*x+c*y+tx, b*x+d*y+ty). Coeficientes enteros entre -10 y 10.',
    [
      'Separá la matriz lineal 2×2 de la traslación.',
      'Las primeras cuatro entradas salen del producto de matrices.',
      'La nueva traslación es A.lineal * B.traslación + A.traslación.',
    ],
    'Los casos distinguen la identidad, el orden de operaciones y la traslación afectada por una escala o giro.',
    'Componer A y B no suele conmutar. Este formato usa vectores columna; otra convención cambia la lectura del orden.',
    'Girar90° después de trasladar (2,0) mueve esa traslación a…',
    ['(2,0)', '(0,2)', '(-2,0)'],
    1,
    'El giro antihorario transforma también el vector de desplazamiento: (2,0) pasa a (0,2).',
    'Aplicá la matriz compuesta a todos los vértices de una figura y comparala con los dos pasos separados.',
  );
  add(0, 'rust', {
    title: 'Componé la coreografía',
    ...affine,
    starter: 'fn componer(a: [i32; 6], b: [i32; 6]) -> [i32; 6] { b }',
    solution:
      'fn componer(a: [i32; 6], b: [i32; 6]) -> [i32; 6] {\n    [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],\n     a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],\n     a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]]\n}',
    tests: [
      t(
        'El orden cambia el desplazamiento',
        'componer([0,1,-1,0,0,0],[1,0,0,1,2,0]) == [0,1,-1,0,0,2] && componer([1,0,0,1,2,0],[0,1,-1,0,0,0]) == [0,1,-1,0,2,0]',
        'La traslación previa se gira; la posterior no.',
      ),
      t(
        'Identidad a ambos lados',
        '{ let m=[2,1,3,4,-2,5]; componer([1,0,0,1,0,0],m)==m && componer(m,[1,0,0,1,0,0])==m }',
        'Identidad debe conservar los seis coeficientes.',
      ),
      t(
        'Escala y cizalla',
        'componer([2,0,0,3,1,-1],[1,0,2,1,4,5]) == [2,0,4,3,9,14]',
        'Multiplicá el desplazamiento y sumá después el desplazamiento propio de A.',
      ),
    ],
  });
  add(0, 'go', {
    title: 'Componé la coreografía',
    ...affine,
    starter: 'func Compose(a,b [6]int) [6]int { return b }',
    solution:
      'func Compose(a,b [6]int) [6]int {\n    return [6]int{a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]}\n}',
    tests: [
      t(
        'Orden de giro y traslación',
        'Compose([6]int{0,1,-1,0,0,0},[6]int{1,0,0,1,2,0}) == ([6]int{0,1,-1,0,0,2}) && Compose([6]int{1,0,0,1,2,0},[6]int{0,1,-1,0,0,0}) == ([6]int{0,1,-1,0,2,0})',
        'Un desplazamiento anterior al giro también se gira.',
      ),
      t(
        'Identidad',
        'func() bool { m:=[6]int{2,1,3,4,-2,5}; id:=[6]int{1,0,0,1,0,0}; return Compose(id,m)==m && Compose(m,id)==m }()',
        'El array incluye cuatro coeficientes lineales y dos de traslación.',
      ),
      t(
        'Escala y cizalla',
        'Compose([6]int{2,0,0,3,1,-1},[6]int{1,0,2,1,4,5}) == ([6]int{2,0,4,3,9,14})',
        'El desplazamiento de B se transforma por A antes de agregar el desplazamiento final.',
      ),
    ],
  });

  const raster = common(
    'Una línea geométrica atraviesa casilleros, pero la pantalla necesita coordenadas enteras. Conservá un error acumulado para elegir el próximo píxel.',
    'Bresenham compara el error sin dividir ni acumular fracciones. Ambos ejes pueden avanzar durante una misma iteración.',
    'Devolvé los píxeles de ambos extremos incluidos, en orden desde el inicio. Coordenadas entre -20 y20. Usá dx=abs(x1-x0), dy=-abs(y1-y0), error=dx+dy; guardá e2=2*error y avanzá x si e2>=dy, y si e2<=dx.',
    [
      'Incluí el píxel actual antes de comprobar si llegaste.',
      'Las dos decisiones usan el mismo e2, calculado antes de cambiar error.',
      'Los signos de avance dependen de cada eje; un segmento de longitud cero contiene un píxel.',
    ],
    'Las pruebas cubren pendientes distintas, coordenadas decrecientes y extremos coincidentes.',
    'La regla de empate es parte del contrato. No es antialiasing: cada píxel queda encendido o apagado.',
    'Cuando ambas condiciones de error se cumplen…',
    ['Se avanza solo x', 'Se avanza solo y', 'Se avanzan ambos ejes'],
    2,
    'Son dos if independientes: una diagonal necesita avanzar x e y en la misma vuelta.',
    'Dibujá los resultados en una grilla y compará otra política de desempate.',
  );
  add(1, 'rust', {
    title: 'Elegí el próximo píxel',
    ...raster,
    starter: 'fn pixeles(x0:i32,y0:i32,x1:i32,y1:i32)->Vec<(i32,i32)> { vec![(x0,y0)] }',
    solution:
      'fn pixeles(mut x0:i32,mut y0:i32,x1:i32,y1:i32)->Vec<(i32,i32)> {\n    let dx=(x1-x0).abs(); let dy=-(y1-y0).abs();\n    let sx=if x0<x1 {1}else{-1}; let sy=if y0<y1 {1}else{-1};\n    let mut error=dx+dy; let mut salida=Vec::new();\n    loop {\n        salida.push((x0,y0)); if x0==x1 && y0==y1 {break;}\n        let e2=2*error;\n        if e2>=dy {error+=dy; x0+=sx;}\n        if e2<=dx {error+=dx; y0+=sy;}\n    }\n    salida\n}',
    tests: [
      t(
        'Pendiente con empate',
        'pixeles(0,0,4,2)==vec![(0,0),(1,1),(2,1),(3,2),(4,2)]',
        'Guardá e2 antes de modificar el error.',
      ),
      t(
        'Ambos ejes decrecen',
        'pixeles(2,3,0,-1)==vec![(2,3),(1,2),(1,1),(0,0),(0,-1)]',
        'El signo del incremento no debe fijarse siempre en +1.',
      ),
      t(
        'Horizontal y punto',
        'pixeles(2,-1,-1,-1)==vec![(2,-1),(1,-1),(0,-1),(-1,-1)] && pixeles(3,3,3,3)==vec![(3,3)]',
        'El último extremo cuenta incluso cuando también es el primero.',
      ),
    ],
  });
  add(1, 'go', {
    title: 'Elegí el próximo píxel',
    ...raster,
    starter:
      'type Pixel struct { X,Y int }\nfunc Pixels(x0,y0,x1,y1 int) []Pixel { return []Pixel{{x0,y0}} }',
    solution:
      'type Pixel struct { X,Y int }\nfunc Pixels(x0,y0,x1,y1 int) []Pixel {\n    abs:=func(n int)int{if n<0{return -n};return n}\n    dx,dy:=abs(x1-x0),-abs(y1-y0); sx,sy:=-1,-1\n    if x0<x1{sx=1};if y0<y1{sy=1};err:=dx+dy\n    out:=[]Pixel{}\n    for {out=append(out,Pixel{x0,y0});if x0==x1 && y0==y1{break};e2:=2*err;if e2>=dy{err+=dy;x0+=sx};if e2<=dx{err+=dx;y0+=sy}}\n    return out\n}',
    tests: [
      t(
        'Pendiente con empate',
        'fmt.Sprint(Pixels(0,0,4,2))=="[{0 0} {1 1} {2 1} {3 2} {4 2}]"',
        'Las dos condiciones usan el mismo error duplicado.',
      ),
      t(
        'Coordenadas decrecientes',
        'fmt.Sprint(Pixels(2,3,0,-1))=="[{2 3} {1 2} {1 1} {0 0} {0 -1}]"',
        'Cada eje tiene su propio sentido de avance.',
      ),
      t(
        'Horizontal y punto',
        'fmt.Sprint(Pixels(2,-1,-1,-1))=="[{2 -1} {1 -1} {0 -1} {-1 -1}]" && fmt.Sprint(Pixels(3,3,3,3))=="[{3 3}]"',
        'Incluí ambos extremos sin duplicar el punto aislado.',
      ),
    ],
  });

  const ray = common(
    'Una linterna envía un rayo y un planeta es un círculo. Encontrá el primer contacto delante del origen, incluso si la linterna empieza dentro.',
    'Sustituir origen+t*dirección en la ecuación del círculo produce una cuadrática. Sus raíces describen entrada y salida; una raíz negativa queda detrás.',
    'Devolvé el menor t>=0 que satisface |origen+t*dirección-centro|=radio. Sin impacto, dirección cero o radio<=0 produce ausencia. Datos finitos con magnitud<=100. t no es distancia salvo dirección de longitud1.',
    [
      'Calculá a=d·d, b=2*(o-c)·d, c=(o-c)·(o-c)-r².',
      'Un discriminante negativo significa que no existe intersección real.',
      'Probá primero la raíz menor; si es negativa, probá la mayor.',
    ],
    'Entrada, salida desde el interior, tangencia y escala de la dirección quedan separados por los casos.',
    'Este núcleo usa coma flotante y círculos perfectos. Un trazador completo debe definir tolerancias para superficies y distancias mínimas.',
    'Si duplicás la dirección sin cambiar el rayo geométrico, t…',
    ['Se duplica', 'Se reduce a la mitad', 'No cambia'],
    1,
    'El mismo punto se alcanza con la mitad del parámetro cuando cada unidad de t avanza el doble.',
    'Probá varios círculos y elegí el impacto con menor t válido.',
  );
  add(2, 'rust', {
    title: 'Encontrá la primera intersección',
    ...ray,
    starter: 'fn impacto(o:[f64;2],d:[f64;2],centro:[f64;2],r:f64)->Option<f64>{None}',
    solution:
      'fn impacto(o:[f64;2],d:[f64;2],centro:[f64;2],r:f64)->Option<f64>{\n    let a=d[0]*d[0]+d[1]*d[1]; if a==0.0 || r<=0.0{return None;}\n    let x=o[0]-centro[0];let y=o[1]-centro[1];let b=2.0*(x*d[0]+y*d[1]);\n    let c=x*x+y*y-r*r;let disc=b*b-4.0*a*c;if disc<0.0{return None;}\n    let raiz=disc.sqrt();let t1=(-b-raiz)/(2.0*a);let t2=(-b+raiz)/(2.0*a);\n    if t1>=0.0{Some(t1)}else if t2>=0.0{Some(t2)}else{None}\n}',
    tests: [
      t(
        'Distancia y parámetro',
        'impacto([0.,0.],[1.,0.],[5.,0.],1.).map(|t|(t-4.).abs()<1e-9)==Some(true) && impacto([0.,0.],[2.,0.],[5.,0.],1.).map(|t|(t-2.).abs()<1e-9)==Some(true)',
        'No asumas que la dirección está normalizada.',
      ),
      t(
        'Interior y tangencia',
        'impacto([0.,0.],[1.,0.],[0.,0.],1.)==Some(1.) && impacto([0.,0.],[1.,0.],[5.,1.],1.)==Some(5.)',
        'Desde dentro, la raíz de salida es la primera no negativa.',
      ),
      t(
        'Ausencia y geometría inválida',
        'impacto([0.,0.],[1.,0.],[-5.,0.],1.)==None && impacto([0.,0.],[1.,0.],[5.,3.],1.)==None && impacto([0.,0.],[0.,0.],[0.,0.],1.)==None && impacto([0.,0.],[1.,0.],[0.,0.],0.)==None',
        'Distinguir discriminante, dirección y radio evita dividir por cero o aceptar impactos detrás.',
      ),
    ],
  });
  add(2, 'go', {
    title: 'Encontrá la primera intersección',
    ...ray,
    imports: ['math'],
    starter: 'func Hit(o,d,c [2]float64,r float64)(float64,bool){ _=math.Sqrt(0);return 0,false }',
    solution:
      'func Hit(o,d,center [2]float64,r float64)(float64,bool){\n    a:=d[0]*d[0]+d[1]*d[1];if a==0 || r<=0{return 0,false}\n    x,y:=o[0]-center[0],o[1]-center[1];b:=2*(x*d[0]+y*d[1]);c:=x*x+y*y-r*r\n    disc:=b*b-4*a*c;if disc<0{return 0,false};root:=math.Sqrt(disc)\n    t1,t2:=(-b-root)/(2*a),(-b+root)/(2*a)\n    if t1>=0{return t1,true};if t2>=0{return t2,true};return 0,false\n}',
    tests: [
      t(
        'Direcciones de distinta magnitud',
        'func()bool{a,ok:=Hit([2]float64{},[2]float64{1,0},[2]float64{5,0},1);b,yes:=Hit([2]float64{},[2]float64{2,0},[2]float64{5,0},1);return ok&&yes&&math.Abs(a-4)<1e-9&&math.Abs(b-2)<1e-9}()',
        'Duplicar la dirección divide t, no cambia el punto alcanzado.',
      ),
      t(
        'Interior y tangencia',
        'func()bool{a,ok:=Hit([2]float64{},[2]float64{1,0},[2]float64{},1);b,yes:=Hit([2]float64{},[2]float64{1,0},[2]float64{5,1},1);return ok&&yes&&a==1&&b==5}()',
        'La salida desde el interior puede ser la segunda raíz.',
      ),
      t(
        'No hay impacto válido',
        'func()bool{_,a:=Hit([2]float64{},[2]float64{1,0},[2]float64{-5,0},1);_,b:=Hit([2]float64{},[2]float64{1,0},[2]float64{5,3},1);_,c:=Hit([2]float64{},[2]float64{},[2]float64{},1);_,d:=Hit([2]float64{},[2]float64{1,0},[2]float64{},0);return !a&&!b&&!c&&!d}()',
        'Los errores geométricos son ausencia, no un contacto falso en t=0.',
      ),
    ],
  });

  const path = common(
    'El personaje atraviesa terreno con distintos costos. El camino de menos casilleros puede cruzar un pantano carísimo.',
    'A* combina costo real g y una cota optimista h. Manhattan es admisible aquí porque moverse es ortogonal y cada casilla transitable cuesta al menos1.',
    'Buscá el costo mínimo desde arriba-izquierda hasta abajo-derecha en una grilla rectangular de hasta10×10. 0 es muro;1…9 cuesta entrar. No cobres la casilla inicial. Ausencia si vacía, irregular, extremos bloqueados o sin ruta. Usá vecinos ortogonales.',
    [
      'Guardá el mejor costo conocido por casilla.',
      'Priorizá g + distancia Manhattan al objetivo.',
      'Si una entrada pendiente ya tiene un costo peor que el registrado, descartala.',
    ],
    'Los casos distinguen cantidad de pasos y costo, verifican el inicio gratuito y rechazan mapas inválidos.',
    'La lista abierta de esta solución se recorre para buscar el mínimo: facilita leer A*, pero una cola de prioridad escala mejor.',
    'Manhattan sigue siendo una cota admisible con costos1…9 porque…',
    [
      'Cada paso cuesta al menos1',
      'Todos los costos deben ser iguales',
      'Siempre encuentra paredes',
    ],
    0,
    'Ignorar paredes y cobrar1 por paso nunca sobreestima el costo real permitido por este contrato.',
    'Devolvé también el camino guardando padres y compará expansiones con h=0.',
  );
  add(3, 'rust', {
    title: 'El camino barato no siempre es el corto',
    ...path,
    starter: 'fn costo_ruta(g:&[Vec<u8>])->Option<u32>{None}',
    solution:
      'fn costo_ruta(g:&[Vec<u8>])->Option<u32>{\n    let filas=g.len();let cols=g.first()?.len();\n    if cols==0 || g.iter().any(|r|r.len()!=cols) || g[0][0]==0 || g[filas-1][cols-1]==0{return None;}\n    let mut costos=vec![vec![u32::MAX;cols];filas];costos[0][0]=0;\n    let mut abiertos=vec![((filas+cols-2) as u32,0u32,0usize,0usize)];\n    while !abiertos.is_empty(){\n        let i=abiertos.iter().enumerate().min_by_key(|(_,n)|n.0).unwrap().0;\n        let (_,c,f,x)=abiertos.remove(i);if c!=costos[f][x]{continue;}\n        if f==filas-1 && x==cols-1{return Some(c);}\n        for (df,dx) in [(-1isize,0isize),(0,1),(1,0),(0,-1)]{\n            let Some(nf)=f.checked_add_signed(df) else{continue;};let Some(nx)=x.checked_add_signed(dx) else{continue;};\n            if nf>=filas || nx>=cols || g[nf][nx]==0{continue;}\n            let nuevo=c+u32::from(g[nf][nx]);if nuevo<costos[nf][nx]{costos[nf][nx]=nuevo;let h=(filas-1-nf+cols-1-nx) as u32;abiertos.push((nuevo+h,nuevo,nf,nx));}\n        }\n    }\n    None\n}',
    tests: [
      t(
        'Desvío barato',
        'costo_ruta(&[vec![1,9,1],vec![1,1,1]])==Some(3) && costo_ruta(&[vec![1,2,3]])==Some(5)',
        'Se cobra entrar en cada casilla, no el inicio.',
      ),
      t(
        'Inicio y muro',
        'costo_ruta(&[vec![9]])==Some(0) && costo_ruta(&[vec![1,0],vec![0,1]])==None',
        'Una única casilla transitable no necesita movimiento.',
      ),
      t(
        'Mapas inválidos',
        'costo_ruta(&[])==None && costo_ruta(&[vec![]])==None && costo_ruta(&[vec![1,1],vec![1]])==None && costo_ruta(&[vec![0,1]])==None && costo_ruta(&[vec![1,0]])==None',
        'Validá forma y extremos antes de indexar.',
      ),
    ],
  });
  add(3, 'go', {
    title: 'El camino barato no siempre es el corto',
    ...path,
    starter: 'func RouteCost(g [][]int)(int,bool){return 0,false}',
    solution:
      'func RouteCost(g [][]int)(int,bool){\n    rows:=len(g);if rows==0||len(g[0])==0{return 0,false};cols:=len(g[0]);for _,row:=range g{if len(row)!=cols{return 0,false}}\n    if g[0][0]==0||g[rows-1][cols-1]==0{return 0,false}\n    type node struct{f,cost,r,c int};open:=[]node{{rows+cols-2,0,0,0}};best:=make([][]int,rows)\n    for r:=range best{best[r]=make([]int,cols);for c:=range best[r]{best[r][c]=1<<30}};best[0][0]=0\n    for len(open)>0{at:=0;for i:=range open{if open[i].f<open[at].f{at=i}};n:=open[at];open=append(open[:at],open[at+1:]...);if n.cost!=best[n.r][n.c]{continue};if n.r==rows-1&&n.c==cols-1{return n.cost,true}\n        for _,d:=range [][2]int{{-1,0},{0,1},{1,0},{0,-1}}{r,c:=n.r+d[0],n.c+d[1];if r<0||c<0||r>=rows||c>=cols||g[r][c]==0{continue};cost:=n.cost+g[r][c];if cost<best[r][c]{best[r][c]=cost;open=append(open,node{cost+rows-1-r+cols-1-c,cost,r,c})}}\n    };return 0,false\n}',
    tests: [
      t(
        'Costo frente a distancia',
        'func()bool{a,ok:=RouteCost([][]int{{1,9,1},{1,1,1}});b,yes:=RouteCost([][]int{{1,2,3}});return ok&&yes&&a==3&&b==5}()',
        'Un desvío puede evitar una entrada de costo9.',
      ),
      t(
        'Inicio gratis y aislamiento',
        'func()bool{a,ok:=RouteCost([][]int{{9}});_,blocked:=RouteCost([][]int{{1,0},{0,1}});return ok&&a==0&&!blocked}()',
        'El inicio cuesta0 aunque su etiqueta sea9.',
      ),
      t(
        'Validación de forma',
        'func()bool{for _,g:=range [][][]int{nil,{{}},{{1,1},{1}},{{0,1}},{{1,0}}}{_,ok:=RouteCost(g);if ok{return false}};return true}()',
        'Rechazá grillas vacías, irregulares y extremos bloqueados.',
      ),
    ],
  });

  const physics = common(
    'Antes de resolver un choque, el motor necesita saber qué región comparten dos cajas alineadas con los ejes.',
    'La intersección existe cuando los intervalos se superponen estrictamente en ambos ejes. Tocar un borde no produce área.',
    'Cada caja es [x,y,ancho,alto]. Devolvé su rectángulo de intersección si tiene área positiva; ausencia para cajas de tamaño no positivo o solo contacto. Coordenadas entre-1000 y1000 y tamaños hasta1000.',
    [
      'La esquina inicial usa máximos de los inicios.',
      'La esquina final usa mínimos de los extremos.',
      'Rechazá si ancho o alto de la intersección no es positivo.',
    ],
    'Los casos incluyen contención, posiciones negativas y contacto sin penetración.',
    'Una intersección AABB no calcula por sí sola la respuesta física ni evita que un objeto muy rápido atraviese una pared entre pasos.',
    'Dos cajas que solo comparten un borde tienen…',
    ['Intersección de área positiva', 'Área de intersección cero', 'Velocidad compartida'],
    1,
    'El intervalo común tiene longitud0 en un eje; este contrato lo trata como ausencia de penetración.',
    'Usá la región para visualizar el choque; después agregá velocidades y una política de respuesta.',
  );
  add(4, 'rust', {
    title: 'Detectá la región del choque',
    ...physics,
    starter: 'fn interseccion(a:[i32;4],b:[i32;4])->Option<[i32;4]>{None}',
    solution:
      'fn interseccion(a:[i32;4],b:[i32;4])->Option<[i32;4]>{\n    if a[2]<=0||a[3]<=0||b[2]<=0||b[3]<=0{return None;}\n    let x=a[0].max(b[0]);let y=a[1].max(b[1]);let fin_x=(a[0]+a[2]).min(b[0]+b[2]);let fin_y=(a[1]+a[3]).min(b[1]+b[3]);\n    if fin_x<=x||fin_y<=y{None}else{Some([x,y,fin_x-x,fin_y-y])}\n}',
    tests: [
      t(
        'Penetración parcial',
        'interseccion([0,0,4,4],[3,1,4,4])==Some([3,1,1,3])',
        'Intersecá los intervalos horizontal y vertical por separado.',
      ),
      t(
        'Contención y simetría',
        'interseccion([-5,-5,10,10],[-2,-1,3,2])==Some([-2,-1,3,2]) && interseccion([-2,-1,3,2],[-5,-5,10,10])==Some([-2,-1,3,2])',
        'La caja contenida es toda la intersección, sin depender del orden.',
      ),
      t(
        'Contacto y tamaños inválidos',
        'interseccion([0,0,2,2],[2,0,2,2])==None && interseccion([0,0,0,2],[0,0,3,3])==None && interseccion([0,0,2,2],[0,0,2,-1])==None',
        'No conviertas área0 ni dimensiones negativas en colisión.',
      ),
    ],
  });
  add(4, 'go', {
    title: 'Detectá la región del choque',
    ...physics,
    starter: 'func Intersection(a,b [4]int)([4]int,bool){return [4]int{},false}',
    solution:
      'func Intersection(a,b [4]int)([4]int,bool){\n    if a[2]<=0||a[3]<=0||b[2]<=0||b[3]<=0{return [4]int{},false};x,y:=a[0],a[1];if b[0]>x{x=b[0]};if b[1]>y{y=b[1]};right,bottom:=a[0]+a[2],a[1]+a[3];if b[0]+b[2]<right{right=b[0]+b[2]};if b[1]+b[3]<bottom{bottom=b[1]+b[3]};if right<=x||bottom<=y{return [4]int{},false};return [4]int{x,y,right-x,bottom-y},true\n}',
    tests: [
      t(
        'Penetración parcial',
        'func()bool{r,ok:=Intersection([4]int{0,0,4,4},[4]int{3,1,4,4});return ok&&r==([4]int{3,1,1,3})}()',
        'El ancho común es1 y el alto común3.',
      ),
      t(
        'Contención simétrica',
        'func()bool{a,b:=[4]int{-5,-5,10,10},[4]int{-2,-1,3,2};x,ok:=Intersection(a,b);y,yes:=Intersection(b,a);return ok&&yes&&x==b&&y==b}()',
        'Tomar mínimos de tamaños no basta: importan también las posiciones.',
      ),
      t(
        'Contacto y caja degenerada',
        'func()bool{_,a:=Intersection([4]int{0,0,2,2},[4]int{2,0,2,2});_,b:=Intersection([4]int{0,0,0,2},[4]int{0,0,3,3});_,c:=Intersection([4]int{0,0,2,2},[4]int{0,0,2,-1});return !a&&!b&&!c}()',
        'El área compartida debe ser estrictamente positiva.',
      ),
    ],
  });

  const life = common(
    'Un jardín digital no mueve criaturas: cada celda decide si vive mirando ocho vecinas de la generación anterior.',
    'Leer y escribir en tableros distintos mantiene la simultaneidad. Si actualizás en el lugar, el resultado depende del orden de recorrido.',
    'Calculá una generación de Conway B3/S23: una celda nace con3 vecinas y una viva sobrevive con2 o3. Fuera del tablero siempre está muerto, sin wrap. Tablero rectangular de hasta20×20; vacío, sin columnas o irregular produce salida vacía.',
    [
      'Contá los ocho desplazamientos alrededor, excluyendo(0,0).',
      'Consultá solo el tablero recibido al calcular vecinos.',
      'Creá otro tablero y aplicá vivos==3 || (actual && vivos==2).',
    ],
    'El oscilador vuelve a su forma inicial tras dos generaciones, el bloque permanece y el aislamiento desaparece.',
    'Estos bordes son finitos y muertos. Un universo infinito o toroidal puede producir otro resultado.',
    'Actualizar cada celda inmediatamente en el mismo tablero…',
    [
      'Mantiene simultaneidad',
      'Puede cambiar el resultado según el recorrido',
      'Es obligatorio para Conway',
    ],
    1,
    'Las celdas siguientes leerían valores nuevos mezclados con los de la generación anterior.',
    'Agregá un patrón glider y observá su traslación después de cuatro generaciones.',
  );
  add(5, 'rust', {
    title: 'Hacé crecer una generación',
    ...life,
    starter: 'fn siguiente(g:&[Vec<bool>])->Vec<Vec<bool>>{g.to_vec()}',
    solution:
      'fn siguiente(g:&[Vec<bool>])->Vec<Vec<bool>>{\n    let rows=g.len();if rows==0{return vec![];}let cols=g[0].len();if cols==0||g.iter().any(|r|r.len()!=cols){return vec![];}\n    let mut out=vec![vec![false;cols];rows];\n    for r in 0..rows{for c in 0..cols{let mut n=0;for dr in -1isize..=1{for dc in -1isize..=1{if dr==0&&dc==0{continue;}let rr=r as isize+dr;let cc=c as isize+dc;if rr>=0&&cc>=0&&(rr as usize)<rows&&(cc as usize)<cols&&g[rr as usize][cc as usize]{n+=1;}}}out[r][c]=n==3||(g[r][c]&&n==2);}}\n    out\n}',
    tests: [
      t(
        'Oscilador simultáneo',
        '{let mut a=vec![vec![false;5];5];a[2][1]=true;a[2][2]=true;a[2][3]=true;let mut b=vec![vec![false;5];5];b[1][2]=true;b[2][2]=true;b[3][2]=true;siguiente(&a)==b&&siguiente(&b)==a}',
        'Usá un tablero nuevo; el blinker debe rotar y volver.',
      ),
      t(
        'Bloque y sobrepoblación',
        'siguiente(&[vec![true,true],vec![true,true]])==vec![vec![true,true],vec![true,true]] && siguiente(&vec![vec![true;3];3])==vec![vec![true,false,true],vec![false,false,false],vec![true,false,true]]',
        'Una viva con3 vecinas sobrevive; con5 u8 muere.',
      ),
      t(
        'Borde muerto y entrada inválida',
        'siguiente(&[vec![true]])==vec![vec![false]] && siguiente(&[]).is_empty() && siguiente(&[vec![]]).is_empty() && siguiente(&[vec![true],vec![true,false]]).is_empty()',
        'No conectes bordes opuestos ni indexes filas irregulares.',
      ),
    ],
  });
  add(5, 'go', {
    title: 'Hacé crecer una generación',
    ...life,
    starter: 'func NextLife(g [][]bool) [][]bool{return g}',
    solution:
      'func NextLife(g [][]bool) [][]bool{\n    rows:=len(g);if rows==0||len(g[0])==0{return nil};cols:=len(g[0]);for _,row:=range g{if len(row)!=cols{return nil}}\n    out:=make([][]bool,rows);for r:=range out{out[r]=make([]bool,cols);for c:=range out[r]{n:=0;for dr:=-1;dr<=1;dr++{for dc:=-1;dc<=1;dc++{if dr==0&&dc==0{continue};rr,cc:=r+dr,c+dc;if rr>=0&&cc>=0&&rr<rows&&cc<cols&&g[rr][cc]{n++}}};out[r][c]=n==3||(g[r][c]&&n==2)}};return out\n}',
    tests: [
      t(
        'Oscilador de período2',
        'func()bool{a:=make([][]bool,5);b:=make([][]bool,5);for i:=range a{a[i]=make([]bool,5);b[i]=make([]bool,5)};for i:=1;i<=3;i++{a[2][i]=true;b[i][2]=true};return fmt.Sprint(NextLife(a))==fmt.Sprint(b)&&fmt.Sprint(NextLife(b))==fmt.Sprint(a)}()',
        'Las decisiones deben leer una misma generación.',
      ),
      t(
        'Bloque y sobrepoblación',
        'fmt.Sprint(NextLife([][]bool{{true,true},{true,true}}))=="[[true true] [true true]]" && fmt.Sprint(NextLife([][]bool{{true,true,true},{true,true,true},{true,true,true}}))=="[[true false true] [false false false] [true false true]]"',
        'Los ocho vecinos incluyen diagonales, no la celda central.',
      ),
      t(
        'Aislamiento y forma',
        'fmt.Sprint(NextLife([][]bool{{true}}))=="[[false]]" && len(NextLife(nil))==0 && len(NextLife([][]bool{{}}))==0 && len(NextLife([][]bool{{true},{true,false}}))==0',
        'Las celdas exteriores son muertas; las grillas inválidas se rechazan.',
      ),
    ],
  });

  const algebra = common(
    'Un mini sistema algebraico guarda un polinomio como coeficientes: [3,-2,0,1] representa3−2x+x³. Ahora evaluá y derivá esa estructura.',
    'Horner acumula desde el coeficiente de mayor grado. La derivada cambia cada aᵢxⁱ por i·aᵢxⁱ⁻¹: la posición del coeficiente lleva significado.',
    'Recibí coeficientes en orden creciente de potencias. Devolvé valor en x y coeficientes de la derivada, sin eliminar ceros finales. Vacío representa0; la derivada de un constante es vacía. Hasta9 coeficientes, cada uno entre-10 y10; |x|<=5.',
    [
      'Para evaluar, recorré los coeficientes desde el último hacia el primero.',
      'El acumulador se actualiza como valor*x+coeficiente.',
      'Para derivar, omití el coeficiente0 y multiplicá cada coeficiente restante por su índice.',
    ],
    'Los casos comprueban orden de coeficientes, signos, constantes y ceros que conservan la representación.',
    'Este es un CAS mínimo para polinomios enteros acotados. No simplifica expresiones arbitrarias ni usa números de precisión ilimitada.',
    'En [3,-2,0,1], la derivada se representa como…',
    ['[-2,0,3]', '[3,-2,0]', '[0,-2,3]'],
    0,
    'La constante desaparece, −2x aporta−2 y x³ aporta3x².',
    'Derivá dos veces y compará la pendiente calculada con diferencias finitas.',
  );
  add(6, 'rust', {
    title: 'Derivá una estructura, no un string',
    ...algebra,
    starter: 'fn analizar(coef:&[i64],x:i64)->(i64,Vec<i64>){(0,vec![])}',
    solution:
      'fn analizar(coef:&[i64],x:i64)->(i64,Vec<i64>){\n    let valor=coef.iter().rev().fold(0,|a,&c|a*x+c);\n    let derivada=coef.iter().enumerate().skip(1).map(|(i,&c)|i as i64*c).collect();\n    (valor,derivada)\n}',
    tests: [
      t(
        'Cúbico con huecos',
        'analizar(&[3,-2,0,1],2)==(7,vec![-2,0,3]) && analizar(&[3,-2,0,1],-1)==(4,vec![-2,0,3])',
        'El índice marca la potencia; un hueco no desaparece.',
      ),
      t(
        'Cero y constante',
        'analizar(&[],5)==(0,vec![]) && analizar(&[9],-3)==(9,vec![])',
        'No inventes una entrada para la derivada de un constante.',
      ),
      t(
        'Ceros finales preservados',
        'analizar(&[0,5,0],-2)==(-10,vec![5,0]) && analizar(&[1,2,3],0)==(1,vec![2,6])',
        'La derivada conserva las posiciones, incluso con coeficientes0.',
      ),
    ],
  });
  add(6, 'go', {
    title: 'Derivá una estructura, no un string',
    ...algebra,
    starter: 'func Analyze(coef []int64,x int64)(int64,[]int64){return 0,nil}',
    solution:
      'func Analyze(coef []int64,x int64)(int64,[]int64){\n    var value int64;for i:=len(coef)-1;i>=0;i--{value=value*x+coef[i]}\n    derivative:=[]int64{};for i:=1;i<len(coef);i++{derivative=append(derivative,int64(i)*coef[i])};return value,derivative\n}',
    tests: [
      t(
        'Cúbico con huecos',
        'func()bool{a,d:=Analyze([]int64{3,-2,0,1},2);b,e:=Analyze([]int64{3,-2,0,1},-1);return a==7&&b==4&&fmt.Sprint(d)=="[-2 0 3]"&&fmt.Sprint(e)=="[-2 0 3]"}()',
        'Recorré al revés para Horner, pero preservá el orden de la derivada.',
      ),
      t(
        'Constantes',
        'func()bool{a,d:=Analyze(nil,5);b,e:=Analyze([]int64{9},-3);return a==0&&b==9&&len(d)==0&&len(e)==0}()',
        'Un polinomio vacío vale0 y la derivada de una constante no tiene términos.',
      ),
      t(
        'Representación con ceros',
        'func()bool{a,d:=Analyze([]int64{0,5,0},-2);b,e:=Analyze([]int64{1,2,3},0);return a == -10&&b==1&&fmt.Sprint(d)=="[5 0]"&&fmt.Sprint(e)=="[2 6]"}()',
        'No elimines ceros finales si el contrato pide conservarlos.',
      ),
    ],
  });

  const mini = common(
    'Dos jugadores retiran una o dos fichas. Gana quien toma la última. La computadora explora cómo respondería un oponente que también juega bien.',
    'Negamax cambia el signo de la evaluación al cambiar de jugador. Un estado sin fichas es derrota para quien debe jugar; una jugada es ganadora si deja una derrota al rival.',
    'Elegí1 o2 fichas para maximizar el resultado con juego perfecto. Con0 fichas devolvé ausencia. En empate elegí la menor jugada. Entrada entre0 y12; resolver por búsqueda completa es suficientemente pequeño.',
    [
      'Definí la utilidad del jugador al turno: sin fichas vale−1.',
      'Evaluá una acción como el negativo del valor del estado hijo.',
      'Recorré acciones1 y2 y cambiá la elegida solo al encontrar un valor estrictamente mejor.',
    ],
    'Las pruebas separan ganar inmediatamente, dejar una posición perdedora y desempatar una derrota inevitable.',
    'La fórmula de este juego admite una solución por módulo3, pero la búsqueda sirve para aprender minimax. Juegos mayores necesitan límites de profundidad y evaluaciones aproximadas.',
    'Si al rival le queda una posición de valor−1, tu jugada vale…',
    ['−1', '0', '+1'],
    2,
    'La utilidad cambia de perspectiva al alternar el jugador: −(−1)=+1.',
    'Permití retirar1 o3 fichas y verificá si el patrón de posiciones perdedoras cambia.',
  );
  add(7, 'rust', {
    title: 'Buscá antes de tomar una ficha',
    ...mini,
    starter: 'fn mejor_jugada(n:usize)->Option<usize>{if n==0{None}else{Some(1)}}',
    solution:
      'fn valor(n:usize)->i32{if n==0{return -1;}let mut mejor=-2;for k in 1..=2.min(n){mejor=mejor.max(-valor(n-k));}mejor}\nfn mejor_jugada(n:usize)->Option<usize>{\n    if n==0{return None;}let mut elegida=1;let mut mejor=-2;\n    for k in 1..=2.min(n){let v=-valor(n-k);if v>mejor{mejor=v;elegida=k;}}\n    Some(elegida)\n}',
    tests: [
      t(
        'Últimas fichas',
        'mejor_jugada(1)==Some(1)&&mejor_jugada(2)==Some(2)',
        'Si podés terminar, esa acción gana.',
      ),
      t(
        'Ganar y desempatar',
        'mejor_jugada(3)==Some(1)&&mejor_jugada(4)==Some(1)&&mejor_jugada(5)==Some(2)&&mejor_jugada(6)==Some(1)',
        'En posiciones perdedoras ambas acciones empatan; elegí1.',
      ),
      t(
        'Terminal y patrón completo',
        'mejor_jugada(0)==None && (1..=12).all(|n|{let k=mejor_jugada(n).unwrap();if n%3==0{k==1}else{(n-k)%3==0}})',
        'Contrastá la búsqueda con la propiedad matemática en todo el dominio pequeño.',
      ),
    ],
  });
  add(7, 'go', {
    title: 'Buscá antes de tomar una ficha',
    ...mini,
    objective: mini.objective + ' En Go,0 representa ausencia.',
    starter: 'func BestMove(n int) int {if n==0{return 0};return 1}',
    solution:
      'func positionValue(n int) int{if n==0{return -1};best:=-2;for k:=1;k<=2&&k<=n;k++{v:=-positionValue(n-k);if v>best{best=v}};return best}\nfunc BestMove(n int) int{\n    if n==0{return 0};chosen,best:=1,-2\n    for k:=1;k<=2&&k<=n;k++{v:=-positionValue(n-k);if v>best{best=v;chosen=k}};return chosen\n}',
    tests: [
      t(
        'Victoria inmediata',
        'BestMove(1)==1&&BestMove(2)==2',
        'Con2 fichas retirar1 regalaría la última al rival.',
      ),
      t(
        'Patrón y desempate',
        'BestMove(3)==1&&BestMove(4)==1&&BestMove(5)==2&&BestMove(6)==1',
        'Una derrota inevitable no elimina la regla de desempate.',
      ),
      t(
        'Terminal y dominio acotado',
        'func()bool{if BestMove(0)!=0{return false};for n:=1;n<=12;n++{k:=BestMove(n);if k<1||k>2{return false};if n%3==0{if k!=1{return false}}else if (n-k)%3!=0{return false}};return true}()',
        'En Go,0 representa ausencia de movimiento; el dominio no incluye negativos.',
      ),
    ],
  });
  return labs;
})();
