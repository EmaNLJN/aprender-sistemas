/* Deterministic visual-computing models. Pure data in, pure data out. */
window.SYSTEMS_PLAY = (() => {
  const C = {
    bg: '#14271f',
    grid: '#355044',
    ink: '#f3efdb',
    muted: '#779286',
    gold: '#edb566',
    green: '#81d9a1',
    red: '#f08c85',
    blue: '#83c5e5',
  };
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const line = (x1, y1, x2, y2, stroke = C.grid, strokeWidth = 1) => ({
    type: 'line',
    x1,
    y1,
    x2,
    y2,
    stroke,
    strokeWidth,
  });
  const rect = (x, y, width, height, fill = C.grid, stroke = C.bg) => ({
    type: 'rect',
    x,
    y,
    width,
    height,
    fill,
    stroke,
    strokeWidth: 1,
  });
  const circle = (x, y, r, fill = C.gold) => ({
    type: 'circle',
    x,
    y,
    r,
    fill,
    stroke: C.bg,
    strokeWidth: 1,
  });
  const text = (x, y, value, fill = C.ink) => ({ type: 'text', x, y, text: String(value), fill });
  const scene = (alt, shapes, width = 560, height = 310) => ({
    width,
    height,
    alt,
    background: C.bg,
    shapes,
  });
  const metric = (label, value) => ({ label, value: String(value) });
  const control = (action, label, value) => ({
    action,
    label,
    ...(value === undefined ? {} : { value: String(value) }),
  });
  const log = (state, message) => {
    state.log = [...(state.log || []), message].slice(-6);
  };
  const achieved = (state, workshop) =>
    workshop.objectives
      .filter((objective) => state.seen?.[objective.id])
      .map((objective) => objective.id);
  const remember = (state, id, condition = true) => {
    if (condition) state.seen[id] = true;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const identity = [1, 0, 0, 1, 0, 0];
  const transform = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const compose = (a, b) => [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
  const inverse = (m) => {
    const d = m[0] * m[3] - m[1] * m[2];
    return [
      m[3] / d,
      -m[1] / d,
      -m[2] / d,
      m[0] / d,
      (m[2] * m[5] - m[3] * m[4]) / d,
      (m[1] * m[4] - m[0] * m[5]) / d,
    ];
  };
  const baseShip = [
    [0, 0],
    [2, 0],
    [0, 1],
  ];
  const operations = { T: [1, 0, 0, 1, 2, 0], R: [0, 1, -1, 0, 0, 0] };
  const models = {};
  models.transforms = {
    initial: () => ({
      order: 'TR',
      step: 0,
      matrix: [...identity],
      points: copy(baseShip),
      completedOrders: [],
      seen: {},
      log: [],
    }),
    act(input, action) {
      const s = copy(input);
      if (action === 'order') {
        s.order = s.order === 'TR' ? 'RT' : 'TR';
        s.step = 0;
        s.matrix = [...identity];
        s.points = copy(baseShip);
        log(s, 'Nueva secuencia: ' + s.order.split('').join(' → ') + '.');
      }
      if (action === 'step' && s.step < 2) {
        const op = s.order[s.step];
        s.matrix = compose(operations[op], s.matrix);
        s.points = s.points.map((p) => transform(operations[op], p));
        s.step++;
        remember(s, 'transforms-translation', op === 'T' && near(s.matrix[4], 2));
        log(
          s,
          op === 'T' ? 'Traslación: cada x aumenta 2.' : 'Giro 90° antihorario: (x,y) → (−y,x).',
        );
        if (s.step === 2) {
          if (!s.completedOrders.includes(s.order)) s.completedOrders.push(s.order);
          remember(
            s,
            'transforms-order',
            s.completedOrders.includes('TR') && s.completedOrders.includes('RT'),
          );
        }
      }
      if (action === 'inverse' && s.step === 2) {
        s.points = s.points.map((p) => transform(inverse(s.matrix), p));
        remember(
          s,
          'transforms-inverse',
          s.points.every((p, i) => near(p[0], baseShip[i][0]) && near(p[1], baseShip[i][1])),
        );
        s.matrix = [...identity];
        s.step = 0;
        log(s, 'La inversa devuelve todos los vértices a su posición inicial.');
      }
      return s;
    },
    view(s) {
      const shapes = [];
      const map = ([x, y]) => [220 + x * 38, 230 - y * 38];
      for (let i = -4; i <= 7; i++) {
        let a = map([i, -1]),
          b = map([i, 5]);
        shapes.push(line(...a, ...b));
      }
      for (let i = -1; i <= 5; i++) {
        let a = map([-4, i]),
          b = map([7, i]);
        shapes.push(line(...a, ...b));
      }
      shapes.push(
        line(...map([-4, 0]), ...map([7, 0]), C.muted, 2),
        line(...map([0, -1]), ...map([0, 5]), C.muted, 2),
      );
      shapes.push({
        type: 'polygon',
        points: baseShip.map(map),
        fill: C.grid,
        stroke: C.muted,
        strokeWidth: 2,
      });
      shapes.push({
        type: 'polygon',
        points: s.points.map(map),
        fill: C.gold,
        stroke: C.ink,
        strokeWidth: 2,
      });
      s.points.forEach((p, i) => {
        const [x, y] = map(p);
        shapes.push(circle(x, y, 4, C.ink), text(x + 7, y - 7, String.fromCharCode(65 + i)));
      });
      shapes.push(
        text(20, 24, 'Nave original · gris'),
        text(20, 43, 'Nave transformada · dorado', C.gold),
      );
      const m = s.matrix;
      return {
        title: 'Tu nave obedece al orden',
        summary:
          s.order === 'TR'
            ? 'Primero trasladar, después girar.'
            : 'Primero girar, después trasladar.',
        metrics: [
          metric('Operaciones', s.step + '/2'),
          metric('Composición', s.order === 'TR' ? 'R·T' : 'T·R'),
          metric('Origen transformado', transform(m, [0, 0]).join(', ')),
        ],
        cells: s.points.map((p, i) => ({
          label: 'Vértice ' + String.fromCharCode(65 + i),
          value: '(' + p.join(', ') + ')',
          tone: 'active',
        })),
        columns: ['x', 'y', 'traslación'],
        rows: [
          [m[0], m[2], m[4]],
          [m[1], m[3], m[5]],
          [0, 0, 1],
        ].map((row) => row.map(String)),
        controls: [
          ...(s.step < 2
            ? [control('step', 'Aplicar ' + (s.order[s.step] === 'T' ? 'traslación' : 'giro 90°'))]
            : [control('inverse', 'Aplicar la inversa')]),
          control('order', 'Invertir el orden y comparar'),
        ],
        log: s.log,
        explanation:
          'Usamos vectores columna y coordenadas con y hacia arriba. La operación de la derecha actúa primero. Trasladar y girar producen posiciones distintas cuando intercambiás el orden.',
        scene: scene(
          'Grilla cartesiana con la nave original y sus vértices transformados.',
          shapes,
        ),
      };
    },
    achieved,
  };

  const rasterPresets = [
    { name: 'Diagonal suave', a: [1, 1], b: [10, 6] },
    { name: 'Pendiente empinada', a: [2, 8], b: [5, 1] },
    { name: 'Camino inverso', a: [10, 2], b: [1, 7] },
    { name: 'Un solo punto', a: [6, 4], b: [6, 4] },
  ];
  function rasterPoints(a, b) {
    let [x, y] = a;
    const [x1, y1] = b,
      dx = Math.abs(x1 - x),
      dy = -Math.abs(y1 - y),
      sx = x < x1 ? 1 : -1,
      sy = y < y1 ? 1 : -1;
    let error = dx + dy;
    const out = [];
    for (let guard = 0; guard < 100; guard++) {
      out.push({ x, y, error });
      if (x === x1 && y === y1) break;
      const e2 = 2 * error;
      if (e2 >= dy) {
        error += dy;
        x += sx;
      }
      if (e2 <= dx) {
        error += dx;
        y += sy;
      }
    }
    return out;
  }
  models.raster = {
    initial: () => ({ preset: 0, index: 1, seen: {}, log: [] }),
    act(input, action, value) {
      const s = copy(input);
      if (action === 'preset') {
        const n = Number(value);
        if (Number.isInteger(n) && n >= 0 && n < 4) {
          s.preset = n;
          s.index = 1;
          log(s, 'Segmento: ' + rasterPresets[n].name + '.');
        }
      }
      const p = rasterPresets[s.preset],
        points = rasterPoints(p.a, p.b);
      if (action === 'step') {
        s.index = Math.min(points.length, s.index + 1);
        const at = points[s.index - 1];
        log(s, 'Píxel (' + at.x + ',' + at.y + '), error=' + at.error + '.');
      }
      if (action === 'finish') {
        s.index = points.length;
        log(s, 'Segmento completo, incluidos sus extremos.');
      }
      if (s.index === points.length) {
        remember(s, 'raster-line', s.preset === 0);
        remember(s, 'raster-steep', s.preset === 1);
        remember(s, 'raster-point', points.length === 1 && same(p.a, p.b));
      }
      return s;
    },
    view(s) {
      const p = rasterPresets[s.preset],
        points = rasterPoints(p.a, p.b),
        visited = points.slice(0, s.index),
        at = visited[visited.length - 1];
      const shapes = [];
      for (let y = 0; y < 10; y++)
        for (let x = 0; x < 12; x++) {
          const hit = visited.some((q) => q.x === x && q.y === y);
          shapes.push(rect(115 + x * 25, 24 + y * 25, 23, 23, hit ? C.gold : C.grid));
        }
      const map = (p) => [127 + p[0] * 25, 36 + p[1] * 25];
      shapes.push(line(...map(p.a), ...map(p.b), C.ink, 1.5));
      shapes.push(circle(...map([at.x, at.y]), 5, C.green));
      shapes.push(text(20, 293, 'Blanco: segmento ideal. Dorado: píxeles elegidos.'));
      return {
        title: p.name,
        summary: 'El error decide cuándo subir o bajar de fila.',
        metrics: [
          metric('Píxeles', s.index + '/' + points.length),
          metric('Error actual', at.error),
          metric('Δx / Δy', p.b[0] - p.a[0] + ' / ' + (p.b[1] - p.a[1])),
        ],
        cells: visited.map((q) => ({
          label: 'Píxel',
          value: '(' + q.x + ',' + q.y + ')',
          tone: 'active',
        })),
        controls: [
          ...(s.index < points.length
            ? [control('step', 'Elegir próximo píxel'), control('finish', 'Completar segmento')]
            : []),
          ...rasterPresets.map((p, i) => control('preset', p.name, i)),
        ],
        log: s.log,
        explanation:
          'No hay antialiasing: cada casilla está encendida o apagada. Dos decisiones independientes pueden mover x e y a la vez. La grilla usa y hacia abajo, como una imagen.',
        scene: scene('Píxeles enteros comparados con el segmento geométrico ideal.', shapes),
      };
    },
    achieved,
  };

  const planets = [
    { x: 250, y: 155, r: 40, name: 'Cerca', color: C.gold },
    { x: 414, y: 155, r: 47, name: 'Lejos', color: C.blue },
    { x: 335, y: 75, r: 30, name: 'Luna', color: C.green },
  ];
  function hitCircle(o, d, c, r) {
    const x = o[0] - c[0],
      y = o[1] - c[1],
      a = d[0] * d[0] + d[1] * d[1];
    if (a === 0 || r <= 0) return null;
    const b = 2 * (x * d[0] + y * d[1]),
      disc = b * b - 4 * a * (x * x + y * y - r * r);
    if (disc < 0) return null;
    const root = Math.sqrt(disc);
    const first = (-b - root) / (2 * a),
      last = (-b + root) / (2 * a);
    return first >= 0 ? first : last >= 0 ? last : null;
  }
  const rayHits = (angle) => {
    const rad = (angle * Math.PI) / 180,
      d = [Math.cos(rad), Math.sin(rad)];
    return planets
      .map((p, index) => ({ index, t: hitCircle([50, 155], d, [p.x, p.y], p.r) }))
      .filter((h) => h.t !== null)
      .sort((a, b) => a.t - b.t);
  };
  models.raycast = {
    initial: () => ({ angle: 0, cast: false, seen: {}, log: [] }),
    act(input, action, value) {
      const s = copy(input);
      if (action === 'aim' && Number.isFinite(Number(value))) {
        s.angle = Math.max(-45, Math.min(45, s.angle + Number(value)));
        s.cast = false;
      }
      if (action === 'cast') {
        s.cast = true;
        const hits = rayHits(s.angle);
        remember(s, 'raycast-hit', hits.length > 0);
        remember(s, 'raycast-miss', hits.length === 0);
        remember(s, 'raycast-nearest', hits.length > 1 && hits[0].t < hits[1].t);
        log(
          s,
          hits.length
            ? 'Primero alcanza ' +
                planets[hits[0].index].name +
                ' en t=' +
                hits[0].t.toFixed(2) +
                '.'
            : 'Ningún círculo corta este rayo hacia delante.',
        );
      }
      return s;
    },
    view(s) {
      const angle = (s.angle * Math.PI) / 180,
        d = [Math.cos(angle), Math.sin(angle)],
        hits = s.cast ? rayHits(s.angle) : [],
        hit = hits[0];
      const rayLimit = Math.min(490, d[1] < 0 ? 145 / -d[1] : d[1] > 0 ? 125 / d[1] : Infinity);
      const distance = hit ? hit.t : rayLimit,
        end = [50 + d[0] * distance, 155 + d[1] * distance];
      const shapes = [line(50, 155, 50 + d[0] * rayLimit, 155 + d[1] * rayLimit, C.grid, 2)];
      planets.forEach((p) =>
        shapes.push(circle(p.x, p.y, p.r, p.color), text(p.x - p.r + 8, p.y + 5, p.name, C.bg)),
      );
      shapes.push({
        type: 'polygon',
        points: [
          [24, 143],
          [24, 167],
          [50, 155],
        ],
        fill: C.ink,
        stroke: C.ink,
      });
      if (s.cast) {
        shapes.push(line(50, 155, ...end, hit ? C.gold : C.red, 3));
        if (hit) shapes.push(circle(...end, 6, C.ink));
      }
      shapes.push(
        text(
          20,
          292,
          s.cast
            ? hit
              ? 'La superficie cercana oculta lo que queda detrás.'
              : 'Este disparo atraviesa espacio vacío.'
            : 'Apuntá y emití un rayo.',
        ),
      );
      return {
        title: '¿Qué planeta toca primero?',
        summary: 'No alcanza con encontrar una raíz: debe estar delante y ser la menor válida.',
        metrics: [
          metric('Ángulo', s.angle + '°'),
          metric('Intersecciones', s.cast ? hits.length : '—'),
          metric('Primer t', hit ? hit.t.toFixed(2) : '—'),
        ],
        cells: planets.map((p, i) => ({
          label: p.name,
          value: s.cast ? (hits.some((h) => h.index === i) ? 'En el rayo' : 'Fuera') : 'Sin probar',
          tone: hit?.index === i ? 'good' : 'muted',
        })),
        columns: ['Círculo', 't de entrada'],
        rows: hits.map((h) => [planets[h.index].name, h.t.toFixed(2)]),
        controls: [
          control('aim', 'Apuntar 15° arriba', -15),
          control('aim', 'Apuntar 15° abajo', 15),
          control('cast', 'Emitir rayo'),
        ],
        log: s.log,
        explanation:
          'El vector de dirección tiene longitud 1, por eso t coincide con distancia en esta escena. Los círculos simplifican las esferas de un trazador 3D; aquí no calculamos iluminación ni refracción.',
        scene: scene(
          'Linterna, tres planetas circulares y el primer punto de intersección del rayo.',
          shapes,
        ),
      };
    },
    achieved,
  };

  const gameMap = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 4, 4, 1, 1, 0],
    [0, 1, 0, 0, 0, 1, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 0, 1, 0],
    [0, 0, 0, 1, 0, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];
  const key = (r, c) => r + ',' + c;
  function pathMap(s) {
    const g = copy(gameMap);
    if (!s.weighted)
      g.forEach((row) =>
        row.forEach((v, c) => {
          if (v) row[c] = 1;
        }),
      );
    if (s.blocked) {
      g[4][7] = 0;
      g[5][6] = 0;
    }
    return g;
  }
  function pathReset(s) {
    s.open = [{ r: 1, c: 1, g: 0 }];
    s.best = { '1,1': 0 };
    s.parents = {};
    s.visited = [];
    s.path = [];
    s.done = false;
    s.cost = null;
    return s;
  }
  function pathStep(s) {
    if (s.done) return;
    const g = pathMap(s);
    let node = null;
    while (s.open.length && !node) {
      let i = 0;
      if (s.algorithm === 'astar')
        for (let j = 1; j < s.open.length; j++) {
          const a = s.open[j],
            b = s.open[i];
          if (a.g + 5 - a.r + 7 - a.c < b.g + 5 - b.r + 7 - b.c) i = j;
        }
      const n = s.open.splice(i, 1)[0];
      if (n.g === s.best[key(n.r, n.c)]) node = n;
    }
    if (!node) {
      s.done = true;
      remember(s, 'pathfinding-blocked');
      log(s, 'Frontera agotada: no existe un camino.');
      return;
    }
    const k = key(node.r, node.c);
    s.visited.push(k);
    if (k === '5,7') {
      s.done = true;
      s.cost = node.g;
      s.path = [k];
      let p = k;
      while (s.parents[p]) {
        p = s.parents[p];
        s.path.unshift(p);
      }
      remember(s, 'pathfinding-bfs', s.algorithm === 'bfs' && !s.weighted);
      remember(s, 'pathfinding-astar', s.algorithm === 'astar' && s.weighted && s.cost === 10);
      log(s, 'Ruta encontrada: costo ' + s.cost + ', ' + (s.path.length - 1) + ' pasos.');
      return;
    }
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const r = node.r + dr,
        c = node.c + dc;
      if (!g[r]?.[c]) continue;
      const nk = key(r, c),
        cost = node.g + g[r][c];
      if (s.algorithm === 'bfs') {
        if (s.best[nk] !== undefined) continue;
      } else if (s.best[nk] !== undefined && cost >= s.best[nk]) continue;
      s.best[nk] = cost;
      s.parents[nk] = k;
      s.open.push({ r, c, g: cost });
    }
    log(s, 'Expande (' + node.r + ',' + node.c + '); frontera=' + s.open.length + '.');
  }
  models.pathfinding = {
    initial: () =>
      pathReset({ algorithm: 'bfs', weighted: false, blocked: false, seen: {}, log: [] }),
    act(input, action, value) {
      let s = copy(input);
      if (action === 'algorithm') {
        s.algorithm = value === 'astar' ? 'astar' : 'bfs';
        pathReset(s);
        log(s, 'Búsqueda reiniciada con ' + s.algorithm.toUpperCase() + '.');
      }
      if (action === 'terrain') {
        s.weighted = !s.weighted;
        pathReset(s);
        log(
          s,
          s.weighted ? 'Pantanos: entrar cuesta 4.' : 'Terreno uniforme: cada entrada cuesta 1.',
        );
      }
      if (action === 'block') {
        s.blocked = !s.blocked;
        pathReset(s);
        log(s, s.blocked ? 'La salida quedó aislada.' : 'La salida vuelve a estar conectada.');
      }
      if (action === 'step') pathStep(s);
      if (action === 'finish') for (let i = 0; i < 150 && !s.done; i++) pathStep(s);
      return s;
    },
    view(s) {
      const g = pathMap(s),
        shapes = [];
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 9; c++) {
          const k = key(r, c),
            v = g[r][c],
            x = 123 + c * 35,
            y = 27 + r * 35;
          const color = !v
            ? C.grid
            : s.path.includes(k)
              ? C.gold
              : s.visited.includes(k)
                ? C.green
                : s.open.some((n) => n.r === r && n.c === c)
                  ? C.blue
                  : v > 1
                    ? '#85634c'
                    : '#264237';
          shapes.push(rect(x, y, 33, 33, color));
          if (v > 1) shapes.push(text(x + 12, y + 21, v));
          if (k === '1,1') shapes.push(text(x + 9, y + 22, 'S', C.ink));
          if (k === '5,7') shapes.push(text(x + 9, y + 22, 'G', C.ink));
        }
      shapes.push(text(20, 289, 'Celeste: frontera · verde: explorado · dorado: ruta.'));
      return {
        title: s.algorithm === 'astar' ? 'A*: costo real + estimación' : 'BFS: explorar por capas',
        summary: s.weighted
          ? 'Con pantanos, BFS minimiza pasos; A* minimiza costo.'
          : 'Con costos uniformes, BFS encuentra una ruta mínima.',
        metrics: [
          metric('Exploradas', s.visited.length),
          metric('Frontera', s.open.length),
          metric('Costo', s.cost ?? '—'),
          metric(
            'Estado',
            s.done ? (s.path.length ? 'Ruta encontrada' : 'Sin ruta') : 'En búsqueda',
          ),
        ],
        cells: s.open.slice(0, 8).map((n) => ({
          label: '(' + n.r + ',' + n.c + ')',
          value: 'g=' + n.g + ' h=' + (5 - n.r + 7 - n.c),
          tone: 'active',
        })),
        controls: [
          ...(!s.done
            ? [control('step', 'Expandir una casilla'), control('finish', 'Completar búsqueda')]
            : []),
          control('algorithm', 'Usar BFS', 'bfs'),
          control('algorithm', 'Usar A*', 'astar'),
          control('terrain', s.weighted ? 'Quitar pantanos' : 'Agregar pantanos'),
          control('block', s.blocked ? 'Reabrir salida' : 'Aislar salida'),
        ],
        log: s.log,
        explanation:
          'A* usa distancia Manhattan como cota inferior. No promete menos expansiones en todos los mapas: depende de la heurística y de los desempates. La ruta dorada conserva padres de las casillas.',
        scene: scene(
          'Mapa de juego con paredes, terreno costoso, frontera de búsqueda y camino hallado.',
          shapes,
        ),
      };
    },
    achieved,
  };

  function intersection(a, b) {
    if (a[2] <= 0 || a[3] <= 0 || b[2] <= 0 || b[3] <= 0) return null;
    const x = Math.max(a[0], b[0]),
      y = Math.max(a[1], b[1]),
      right = Math.min(a[0] + a[2], b[0] + b[2]),
      bottom = Math.min(a[1] + a[3], b[1] + b[3]);
    return right > x && bottom > y ? [x, y, right - x, bottom - y] : null;
  }
  const brick = [10, 4, 2, 3];
  function physicsPreset(name, seen = {}, history = []) {
    const configs = { brick: [4, 5, 1, 0.25], wall: [18, 1, 1.25, 0], touch: [9, 5, 0, 0] };
    const [x, y, vx, vy] = configs[name] || configs.brick;
    return { preset: name, x, y, vx, vy, step: 0, last: 'Listo', trail: [], seen, log: history };
  }
  models.physics = {
    initial: () => physicsPreset('brick'),
    act(input, action, value) {
      let s = copy(input);
      if (action === 'preset' && ['brick', 'wall', 'touch'].includes(value))
        return physicsPreset(value, s.seen, [...s.log, 'Nueva escena: ' + value + '.'].slice(-6));
      if (action === 'step') {
        let x = s.x + s.vx,
          y = s.y + s.vy,
          vx = s.vx,
          vy = s.vy;
        s.last = 'Sin choque';
        if (x < 0 || x > 19) {
          x = x < 0 ? -x : 38 - x;
          vx = -vx;
          s.last = 'Pared';
          remember(s, 'physics-wall');
        }
        if (y < 0 || y > 9) {
          y = y < 0 ? -y : 18 - y;
          vy = -vy;
          s.last = 'Pared';
          remember(s, 'physics-wall');
        }
        const overlap = intersection([x, y, 1, 1], brick);
        if (overlap) {
          if (s.x + 1 <= brick[0] || s.x >= brick[0] + brick[2]) {
            x = vx > 0 ? brick[0] - 1 : brick[0] + brick[2];
            vx = -vx;
          } else {
            y = vy > 0 ? brick[1] - 1 : brick[1] + brick[3];
            vy = -vy;
          }
          s.last = 'Caja';
          remember(s, 'physics-brick');
        }
        remember(
          s,
          'physics-touch',
          s.preset === 'touch' && !overlap && x === 9 && y === 5 && vx === 0 && vy === 0,
        );
        s.trail = [...s.trail, [s.x + 0.5, s.y + 0.5]].slice(-18);
        s.x = x;
        s.y = y;
        s.vx = vx;
        s.vy = vy;
        s.step++;
        log(s, 'Paso ' + s.step + ': ' + s.last + '; v=(' + vx + ',' + vy + ').');
      }
      return s;
    },
    view(s) {
      const shapes = [rect(50, 42, 460, 230, '#203b2e', C.muted)];
      const map = ([x, y]) => [50 + x * 23, 42 + y * 23];
      const [bX, bY] = map(brick);
      shapes.push(rect(bX, bY, brick[2] * 23, brick[3] * 23, C.red));
      s.trail.forEach((p) => shapes.push(circle(...map(p), 2, C.muted)));
      const [x, y] = map([s.x, s.y]);
      shapes.push(
        rect(x, y, 23, 23, C.gold),
        line(x + 11.5, y + 11.5, x + 11.5 + s.vx * 28, y + 11.5 + s.vy * 28, C.ink, 2),
      );
      shapes.push(text(20, 25, 'Un botón = un intervalo fijo. La flecha muestra velocidad.'));
      return {
        title: 'Mover, detectar, responder',
        summary: 'El cuadrado conserva su velocidad en magnitud al reflejar un componente.',
        metrics: [
          metric('Posición', s.x.toFixed(2) + ', ' + s.y.toFixed(2)),
          metric('Velocidad', s.vx + ', ' + s.vy),
          metric('|v|²', (s.vx * s.vx + s.vy * s.vy).toFixed(4)),
          metric('Último paso', s.last),
        ],
        cells: [
          { label: 'Caja estática', value: '[10,4,2,3]', tone: 'bad' },
          { label: 'Objeto móvil', value: '1×1', tone: 'active' },
        ],
        controls: [
          control('step', 'Avanzar un paso fijo'),
          control('preset', 'Apuntar a la caja', 'brick'),
          control('preset', 'Apuntar a la pared', 'wall'),
          control('preset', 'Probar contacto sin área', 'touch'),
        ],
        log: s.log,
        explanation:
          'Este es un modelo discreto con velocidades pequeñas y sin gravedad. No es un motor físico general: detectar solo al final de un paso puede perder colisiones de objetos muy rápidos.',
        scene: scene(
          'Cancha rectangular, obstáculo y cuadrado móvil con su trayectoria y vector de velocidad.',
          shapes,
        ),
      };
    },
    achieved,
  };

  const lifePatterns = {
    blinker: [
      [3, 3],
      [3, 4],
      [3, 5],
    ],
    block: [
      [3, 3],
      [3, 4],
      [4, 3],
      [4, 4],
    ],
    glider: [
      [2, 3],
      [3, 4],
      [4, 2],
      [4, 3],
      [4, 4],
    ],
  };
  function lifeBoard(pattern) {
    const g = Array.from({ length: 8 }, () => Array(10).fill(false));
    lifePatterns[pattern].forEach(([r, c]) => (g[r][c] = true));
    return g;
  }
  function lifeNext(g) {
    return g.map((row, r) =>
      row.map((live, c) => {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && g[r + dr]?.[c + dc]) count++;
        return count === 3 || (live && count === 2);
      }),
    );
  }
  function lifeStep(s) {
    const previous = s.grid,
      next = lifeNext(previous);
    s.born = [];
    s.died = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 10; c++) {
        if (!previous[r][c] && next[r][c]) s.born.push(key(r, c));
        if (previous[r][c] && !next[r][c]) s.died.push(key(r, c));
      }
    s.grid = next;
    s.generation++;
    remember(
      s,
      'life-oscillator',
      s.preset === 'blinker' && s.generation >= 2 && same(next, lifeBoard('blinker')),
    );
    remember(s, 'life-still', s.preset === 'block' && same(previous, next));
    if (s.preset === 'glider' && s.generation === 4) {
      const expected = Array.from({ length: 8 }, () => Array(10).fill(false));
      lifePatterns.glider.forEach(([r, c]) => (expected[r + 1][c + 1] = true));
      remember(s, 'life-travel', same(expected, next));
    }
    log(
      s,
      'Generación ' + s.generation + ': ' + s.born.length + ' nacen, ' + s.died.length + ' mueren.',
    );
  }
  models.life = {
    initial: () => ({
      preset: 'blinker',
      grid: lifeBoard('blinker'),
      generation: 0,
      born: [],
      died: [],
      seen: {},
      log: [],
    }),
    act(input, action, value) {
      const s = copy(input);
      if (action === 'pattern' && lifePatterns[value]) {
        s.preset = value;
        s.grid = lifeBoard(value);
        s.generation = 0;
        s.born = [];
        s.died = [];
        log(s, 'Semilla: ' + value + '.');
      }
      if (action === 'step') lifeStep(s);
      if (action === 'four') for (let i = 0; i < 4; i++) lifeStep(s);
      return s;
    },
    view(s) {
      const shapes = [];
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 10; c++) {
          const k = key(r, c);
          shapes.push(
            rect(
              139 + c * 28,
              26 + r * 28,
              26,
              26,
              s.grid[r][c] ? (s.born.includes(k) ? C.gold : C.green) : C.grid,
              s.died.includes(k) ? C.red : C.bg,
            ),
          );
        }
      shapes.push(text(20, 285, 'Verde: viva · dorado: recién nacida · borde rojo: murió.'));
      return {
        title: 'Un universo sin jugador',
        summary: 'Las reglas son locales; los patrones que aparecen pueden viajar u oscilar.',
        metrics: [
          metric('Generación', s.generation),
          metric('Población', s.grid.flat().filter(Boolean).length),
          metric('Nacimientos', s.born.length),
          metric('Muertes', s.died.length),
        ],
        cells: [
          { label: 'Nacimiento', value: '3 vecinas', tone: 'good' },
          { label: 'Supervivencia', value: '2 o 3 vecinas', tone: 'active' },
          { label: 'Borde', value: 'Muerto, sin wrap', tone: 'muted' },
        ],
        controls: [
          control('step', 'Una generación'),
          control('four', 'Cuatro generaciones'),
          control('pattern', 'Oscilador', 'blinker'),
          control('pattern', 'Bloque estable', 'block'),
          control('pattern', 'Glider viajero', 'glider'),
        ],
        log: s.log,
        explanation:
          'Todas las celdas leen la misma generación y escriben en otra. El tablero es finito: si un patrón alcanza un borde, ya no se comporta como en una grilla infinita.',
        scene: scene(
          'Jardín de Conway con celdas vivas, nacimientos y muertes por generación.',
          shapes,
        ),
      };
    },
    achieved,
  };

  const polynomials = [
    { name: 'x²−3', coef: [-3, 0, 1] },
    { name: 'x³−2x', coef: [0, -2, 0, 1] },
  ];
  const evaluate = (coef, x) => coef.reduceRight((acc, c) => acc * x + c, 0);
  const derivative = (coef) => coef.slice(1).map((c, i) => c * (i + 1));
  function hornerStep(s) {
    const p = polynomials[s.preset].coef;
    if (s.index >= p.length) return;
    const c = p[p.length - 1 - s.index],
      before = s.acc;
    s.acc = s.acc * s.x + c;
    s.index++;
    log(s, before + ' × ' + s.x + ' + ' + c + ' = ' + s.acc);
    remember(s, 'algebra-horner', s.index === p.length && s.acc === evaluate(p, s.x));
  }
  models.algebra = {
    initial: () => ({ preset: 0, x: 1, index: 0, acc: 0, derived: false, seen: {}, log: [] }),
    act(input, action, value) {
      const s = copy(input);
      if (action === 'x' && Number.isFinite(Number(value))) {
        s.x = Math.max(-2, Math.min(2, s.x + Number(value)));
        s.index = 0;
        s.acc = 0;
        log(s, 'Nuevo punto de evaluación x=' + s.x + '.');
      }
      if (action === 'preset') {
        s.preset = 1 - s.preset;
        s.index = 0;
        s.acc = 0;
        s.derived = false;
        log(s, 'Polinomio: ' + polynomials[s.preset].name + '.');
      }
      if (action === 'step') hornerStep(s);
      if (action === 'finish') for (let i = 0; i < 4; i++) hornerStep(s);
      if (action === 'derive') {
        s.derived = true;
        const d = derivative(polynomials[s.preset].coef);
        remember(s, 'algebra-derivative', d.length === polynomials[s.preset].coef.length - 1);
        log(s, 'Derivada por coeficientes: [' + d.join(',') + '].');
      }
      remember(
        s,
        'algebra-stationary',
        s.derived && evaluate(derivative(polynomials[s.preset].coef), s.x) === 0,
      );
      return s;
    },
    view(s) {
      const p = polynomials[s.preset],
        d = derivative(p.coef),
        shapes = [];
      const map = (x, y) => [280 + x * 100, 160 - y * 10];
      for (let x = -2; x <= 2; x++) shapes.push(line(...map(x, -12), ...map(x, 12)));
      for (let y = -10; y <= 10; y += 5) shapes.push(line(...map(-2, y), ...map(2, y)));
      shapes.push(
        line(...map(-2, 0), ...map(2, 0), C.muted, 2),
        line(...map(0, -12), ...map(0, 12), C.muted, 2),
      );
      for (let i = 0; i < 80; i++) {
        const x = -2 + i * 0.05,
          nx = x + 0.05;
        shapes.push(
          line(...map(x, evaluate(p.coef, x)), ...map(nx, evaluate(p.coef, nx)), C.gold, 2),
        );
        if (s.derived)
          shapes.push(line(...map(x, evaluate(d, x)), ...map(nx, evaluate(d, nx)), C.green, 2));
      }
      const value = evaluate(p.coef, s.x),
        slope = evaluate(d, s.x);
      if (s.derived) {
        const left = Math.max(-2, s.x - 0.45),
          right = Math.min(2, s.x + 0.45);
        shapes.push(
          line(
            ...map(left, value + slope * (left - s.x)),
            ...map(right, value + slope * (right - s.x)),
            C.blue,
            3,
          ),
        );
      }
      shapes.push(
        circle(...map(s.x, value), 5, C.ink),
        text(20, 22, 'Dorado: P(x) · verde: P′(x) · celeste: tangente'),
      );
      return {
        title: p.name,
        summary: 'La curva y su representación simbólica cuentan la misma historia.',
        metrics: [
          metric('x', s.x),
          metric('P(x)', value),
          metric('P′(x)', s.derived ? slope : '—'),
          metric('Horner', s.index + '/' + p.coef.length),
        ],
        cells: p.coef.map((c, i) => ({ label: 'x^' + i, value: String(c), tone: 'active' })),
        columns: ['Representación', 'Coeficientes'],
        rows: [
          ['P', p.coef.join(', ')],
          ['P′', s.derived ? d.join(', ') : 'Derivá para construirla'],
          ['Acumulador', String(s.acc)],
        ],
        controls: [
          control('step', 'Un paso de Horner'),
          control('finish', 'Completar Horner'),
          control('derive', 'Construir la derivada'),
          control('x', 'x −1', -1),
          control('x', 'x +1', 1),
          control('preset', 'Cambiar de polinomio'),
        ],
        log: s.log,
        explanation:
          'Horner evalúa con multiplicaciones y sumas; derivar transforma la estructura de coeficientes. La pendiente de la tangente es P′(x), no P(x). El dibujo muestra x entre −2 y 2.',
        scene: scene(
          'Gráfica del polinomio, su derivada y la tangente en el punto seleccionado.',
          shapes,
        ),
      };
    },
    achieved,
  };

  function gameValue(n) {
    if (n === 0) return -1;
    let best = -2;
    for (let k = 1; k <= 2 && k <= n; k++) best = Math.max(best, -gameValue(n - k));
    return best;
  }
  function gameBest(n) {
    let chosen = 0,
      best = -2;
    for (let k = 1; k <= 2 && k <= n; k++) {
      const v = -gameValue(n - k);
      if (v > best) {
        best = v;
        chosen = k;
      }
    }
    return chosen;
  }
  function makeGame(n, seen = {}, history = []) {
    return { n, start: n, turn: 'Vos', winner: '', analyzed: false, seen, log: history };
  }
  function gameMove(s, k) {
    if (s.winner || !Number.isInteger(k) || k < 1 || k > 2 || k > s.n) return;
    const who = s.turn;
    remember(
      s,
      'minimax-choice',
      who === 'Vos' && gameValue(s.n) === 1 && -gameValue(s.n - k) === 1,
    );
    s.n -= k;
    s.analyzed = false;
    log(s, who + ' retira ' + k + '; quedan ' + s.n + '.');
    if (s.n === 0) {
      s.winner = who;
      remember(s, 'minimax-win', who === 'Vos');
    } else s.turn = who === 'Vos' ? 'IA' : 'Vos';
  }
  models.minimax = {
    initial: () => makeGame(7),
    act(input, action, value) {
      let s = copy(input);
      if (action === 'preset' && ['6', '7'].includes(String(value)))
        return makeGame(
          Number(value),
          s.seen,
          [...s.log, 'Nueva partida con ' + value + ' fichas.'].slice(-6),
        );
      if (action === 'analyze' && !s.winner) {
        s.analyzed = true;
        remember(s, 'minimax-loss', s.n > 0 && gameValue(s.n) === -1);
        log(
          s,
          gameValue(s.n) === 1
            ? 'Existe una jugada ganadora con rival perfecto.'
            : 'No hay victoria forzada: el rival puede responder a ambas jugadas.',
        );
      }
      if (action === 'take' && s.turn === 'Vos') gameMove(s, Number(value));
      if (action === 'ai' && s.turn === 'IA') gameMove(s, gameBest(s.n));
      return s;
    },
    view(s) {
      const shapes = [];
      for (let i = 0; i < s.start; i++)
        shapes.push(circle(95 + i * 51, 47, 16, i < s.n ? C.gold : C.grid));
      shapes.push(circle(280, 118, 26, s.winner ? C.green : C.blue), text(272, 123, s.n, C.bg));
      if (!s.winner) {
        for (let k = 1; k <= 2 && k <= s.n; k++) {
          const x = k === 1 ? 155 : 405,
            v = -gameValue(s.n - k);
          shapes.push(
            line(280, 144, x, 213, C.muted, 2),
            circle(x, 237, 27, s.analyzed ? (v === 1 ? C.green : C.red) : C.grid),
            text(x - 5, 242, s.n - k, C.ink),
            text(x - 37, 191, 'Retirar ' + k),
          );
          if (s.analyzed)
            shapes.push(
              text(
                x - 52,
                290,
                v === 1 ? 'Gana el jugador actual' : 'El rival puede ganar',
                v === 1 ? C.green : C.red,
              ),
            );
        }
      } else shapes.push(text(202, 210, 'Ganador: ' + s.winner, C.green));
      return {
        title: s.winner ? 'La partida terminó' : 'Tu rival también piensa',
        summary: 'Se pueden retirar 1 o 2 fichas. Quien toma la última gana.',
        metrics: [
          metric('Quedan', s.n),
          metric('Turno', s.winner ? 'Fin' : s.turn),
          metric('Valor', s.analyzed ? (gameValue(s.n) > 0 ? '+1' : '−1') : 'Sin explorar'),
          metric('Sugerencia', s.analyzed ? gameBest(s.n) : '—'),
        ],
        cells: [
          { label: 'Utilidad +1', value: 'Victoria forzada', tone: 'good' },
          { label: 'Utilidad −1', value: 'El rival puede evitar tu victoria', tone: 'bad' },
        ],
        controls: [
          ...(!s.winner
            ? s.turn === 'Vos'
              ? [
                  control('take', 'Retirar 1', 1),
                  ...(s.n >= 2 ? [control('take', 'Retirar 2', 2)] : []),
                ]
              : [control('ai', 'Dejar responder a la IA')]
            : []),
          ...(!s.winner ? [control('analyze', 'Explorar el árbol')] : []),
          control('preset', 'Nueva partida: 7', 7),
          control('preset', 'Posición difícil: 6', 6),
        ],
        log: s.log,
        explanation:
          'Los valores corresponden al jugador cuyo turno se indica. Cada rama invierte la perspectiva: el valor de una acción es el negativo del valor del rival. Calculamos el árbol completo de este juego pequeño; el dibujo muestra sus primeras dos opciones. En empate, la IA elige retirar 1.',
        scene: scene(
          'Fichas restantes y primeras ramas del árbol de decisiones, coloreadas según el juego perfecto.',
          shapes,
        ),
      };
    },
    achieved,
  };

  const source = (title, url) => ({ title, url });
  const specifications = [
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
        [
          'Representar',
          'Guardá vértices y una matriz afín de seis números.',
          'Una representación uniforme separa geometría de posición.',
          'Transformar identidad conserva cada vértice.',
        ],
        [
          'Componer',
          'Implementá A después de B y probá ambos órdenes.',
          'El desplazamiento también participa de la composición.',
          'Un ejemplo con giro y traslación produce dos ubicaciones distintas.',
        ],
        [
          'Dibujar',
          'Mostrá original y resultado en la misma grilla.',
          'Una referencia fija hace observable la transformación.',
          'La nave y sus coordenadas concuerdan.',
        ],
        [
          'Deshacer',
          'Construí la inversa cuando el determinante no sea 0.',
          'Una matriz singular no puede recuperar información perdida.',
          'Aplicar transformación e inversa recupera los puntos dentro de una tolerancia.',
        ],
      ],
      sources: [
        source(
          'Cornell CS4620 · transformaciones 2D',
          'https://www.cs.cornell.edu/courses/cs4620/2014fa/lectures/08transforms2d.pdf',
        ),
      ],
      related: { rust: ['rust-21', 'rust-22', 'rust-36'], go: ['go-11', 'go-21', 'go-23'] },
      bridge: {
        rust: 'Arrays y tuplas fijan la representación; prestá los vértices y devolvé un nuevo Vec cuando convenga conservar el original.',
        go: 'Un array [6]float64 expresa la matriz y una struct puede nombrar sus campos; prestá atención a los slices que comparten memoria.',
      },
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
        options: [
          'Dos if independientes',
          'Un if/else que elija un solo eje',
          'Reiniciar el error',
        ],
        answer: 0,
        explanation: 'Una transición diagonal cambia ambas coordenadas con el mismo error previo.',
      },
      steps: [
        [
          'Definir',
          'Fijá extremos incluidos y una política de empate.',
          'Dos algoritmos pueden elegir píxeles distintos en una frontera.',
          'El contrato describe exactamente la secuencia esperada.',
        ],
        [
          'Acumular',
          'Actualizá un error entero al mover cada eje.',
          'Evita recalcular una pendiente fraccional a cada paso.',
          'Una línea horizontal, vertical y diagonal termina.',
        ],
        [
          'Visualizar',
          'Superponé el segmento ideal con los píxeles calculados.',
          'Ver ambas representaciones explica la aproximación.',
          'Cada casilla elegida se corresponde con un elemento de la salida.',
        ],
        [
          'Generalizar',
          'Probá todos los sentidos y el extremo coincidente.',
          'Los signos y los casos degenerados exponen supuestos escondidos.',
          'Tus pruebas cubren reversos y un solo punto.',
        ],
      ],
      sources: [
        source(
          'Alois Zingl · rasterización con Bresenham',
          'https://zingl.github.io/bresenham.html',
        ),
        source(
          'Bresenham · artículo original de 1965',
          'https://janmr.com/files/papers/bresenham65.pdf',
        ),
      ],
      related: { rust: ['rust-08', 'rust-09', 'rust-40'], go: ['go-07', 'go-11', 'go-12'] },
      bridge: {
        rust: 'Un Vec<(i32,i32)> conserva el orden; separar dx y dy de sus signos evita conversiones innecesarias.',
        go: 'Una struct Pixel hace explícitos los ejes; append acumula la trayectoria y un for controla el punto final.',
      },
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
        [
          'Parametrizar',
          'Representá el rayo como origen+t·dirección.',
          'Separar trayectoria y parámetro permite comparar intersecciones.',
          'Un cambio de escala en dirección modifica t pero no el punto.',
        ],
        [
          'Resolver',
          'Sustituí el rayo en la ecuación del círculo.',
          'La cuadrática conecta álgebra y geometría.',
          'Hay pruebas para tangencia, ausencia y origen interior.',
        ],
        [
          'Ordenar',
          'Elegí el menor t no negativo de todos los objetos.',
          'Encontrar un objeto no demuestra que sea el primero visible.',
          'Un planeta cercano oculta uno lejano.',
        ],
        [
          'Extender',
          'Añadí normales y un color según su orientación.',
          'La normal permite conectar geometría con sombreado.',
          'El color cambia de forma consistente sobre la superficie.',
        ],
      ],
      sources: [
        source(
          'Ray Tracing in One Weekend · intersecciones',
          'https://raytracing.github.io/books/RayTracingInOneWeekend.html',
        ),
      ],
      related: { rust: ['rust-26', 'rust-27', 'rust-37'], go: ['go-02', 'go-09', 'go-21'] },
      bridge: {
        rust: 'Option<f64> distingue ausencia de t=0. Usá f64 y definí la tolerancia en las pruebas.',
        go: 'El par (float64,bool) separa valor y presencia; math.Sqrt resuelve la raíz solo después de validar el discriminante.',
      },
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
        [
          'Modelar',
          'Convertí casillas transitables en nodos y movimientos en aristas.',
          'La búsqueda opera sobre el grafo, no sobre una imagen.',
          'Paredes y límites no generan vecinos.',
        ],
        [
          'Explorar',
          'Implementá cola BFS y visualizá su frontera.',
          'Cada capa representa un paso adicional con costo uniforme.',
          'Un mapa sin camino termina al agotar la cola.',
        ],
        [
          'Priorizar',
          'Agregá costos y la prioridad g+h de A*.',
          'Una heurística admisible no sobreestima la distancia restante.',
          'El mapa con pantanos elige la ruta barata.',
        ],
        [
          'Reconstruir',
          'Guardá padres y devolvé una secuencia transitable.',
          'Un costo correcto no alcanza para mover al personaje.',
          'Cada paso de la ruta es vecino y su suma coincide con el costo.',
        ],
      ],
      sources: [
        source(
          'Amit Patel · introducción a A*',
          'https://www.redblobgames.com/pathfinding/a-star/introduction.html',
        ),
      ],
      related: { rust: ['rust-35', 'rust-107', 'rust-109'], go: ['go-107', 'go-108', 'go-109'] },
      bridge: {
        rust: 'Guardá costos separados de la grilla y usá Option para ausencia de ruta; un BinaryHeap con orden invertido puede reemplazar la lista abierta.',
        go: 'Una struct para cada entrada de la frontera permite conservar coordenadas y costo; map o slices almacenan mejores distancias y padres.',
      },
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
        [
          'Detectar',
          'Implementá la intersección de intervalos en x e y.',
          'La geometría debe tener un contrato para bordes y cajas degeneradas.',
          'Contacto sin área devuelve ausencia.',
        ],
        [
          'Integrar',
          'Avanzá posición con un intervalo de tiempo fijo.',
          'Separar simulación y frecuencia de dibujo mejora reproducibilidad.',
          'La misma secuencia de pasos da el mismo estado.',
        ],
        [
          'Responder',
          'Reflejás velocidad y corregís la penetración.',
          'Cambiar velocidad sin corregir posición deja el objeto dentro de la pared.',
          'Tras el choque, la caja queda fuera y puede alejarse.',
        ],
        [
          'Investigar',
          'Aumentá la velocidad y documentá los límites.',
          'Un ejemplo que falla enseña cuándo hace falta barrido continuo o subpasos.',
          'Podés explicar qué casos cubre tu detector.',
        ],
      ],
      sources: [
        source(
          'Glenn Fiedler · Fix Your Timestep',
          'https://gafferongames.com/post/fix_your_timestep/',
        ),
      ],
      related: { rust: ['rust-12', 'rust-22', 'rust-25'], go: ['go-21', 'go-22', 'go-23'] },
      bridge: {
        rust: 'Separá una función pura de intersección de una transición que recibe &mut Estado; preparar el nuevo estado ayuda a razonar.',
        go: 'Usá structs para caja y velocidad; un método con receptor puntero confirma el estado y las funciones de geometría pueden seguir siendo puras.',
      },
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
        [
          'Representar',
          'Construí una grilla de booleanos y definí sus bordes.',
          'Sin un contrato del exterior, contar vecinos es ambiguo.',
          'Una celda aislada no ve vecinos al otro lado del tablero.',
        ],
        [
          'Actualizar',
          'Calculá la siguiente generación en otro buffer.',
          'Leer estados nuevos durante el mismo paso rompe la simultaneidad.',
          'Un blinker rota y recupera su forma después de dos pasos.',
        ],
        [
          'Observar',
          'Marcá nacimientos y muertes con colores diferentes.',
          'Contar población no alcanza para entender cómo cambia una forma.',
          'El bloque es estable y el glider se traslada.',
        ],
        [
          'Experimentar',
          'Diseñá semillas y anotá predicciones.',
          'Reglas simples no vuelven triviales los resultados globales.',
          'Podés comparar tu hipótesis con una secuencia de generaciones.',
        ],
      ],
      sources: [
        source(
          'Princeton COS126 · Conway y autómatas celulares',
          'https://www.cs.princeton.edu/courses/archive/fall15/cos126/lectures/CS.Movies.pdf',
        ),
      ],
      related: { rust: ['rust-14', 'rust-15', 'rust-20'], go: ['go-11', 'go-13', 'go-25'] },
      bridge: {
        rust: 'Un Vec<Vec<bool>> nuevo evita mezclar préstamos de lectura y escritura. Después podés probar dos buffers reutilizables.',
        go: 'Crear filas nuevas importa: copiar solo el slice externo seguiría compartiendo los arreglos internos.',
      },
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
        [
          'Representar',
          'Guardá coeficientes en orden creciente de potencias.',
          'La posición es parte del significado del dato.',
          'Podés representar términos faltantes sin perder su grado.',
        ],
        [
          'Evaluar',
          'Implementá Horner y mostrá su acumulador.',
          'Reutilizar el resultado parcial reduce operaciones.',
          'Coincide con una evaluación directa en casos pequeños.',
        ],
        [
          'Derivar',
          'Transformá cada coeficiente y su exponente.',
          'Derivar es una operación sobre la estructura, no sobre el texto de una pantalla.',
          'La derivada de una constante es el polinomio 0.',
        ],
        [
          'Conectar',
          'Dibujá P, P′ y la tangente en un punto elegible.',
          'El gráfico conecta valor, pendiente y representación simbólica.',
          'Encontrás un punto donde la tangente es horizontal sin confundirlo con una raíz.',
        ],
      ],
      sources: [source('NIST DLMF · esquema de Horner', 'https://dlmf.nist.gov/1.11')],
      related: { rust: ['rust-36', 'rust-37', 'rust-40'], go: ['go-07', 'go-11', 'go-12'] },
      bridge: {
        rust: 'Iteradores rev, enumerate y fold expresan recorrido y acumulación; los rangos del contrato evitan overflow en este núcleo.',
        go: 'Los slices almacenan coeficientes y sus índices son exponentes; recorrer desde len−1 exige tratar también el slice vacío.',
      },
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
        [
          'Definir',
          'Escribí acciones legales, terminales y utilidad.',
          'La búsqueda solo puede ser correcta respecto de esas reglas.',
          'El estado con 0 fichas es derrota para quien debería mover.',
        ],
        [
          'Explorar',
          'Evaluá hijos cambiando la perspectiva del jugador.',
          'Negar la utilidad expresa que lo bueno para el rival es malo para vos.',
          'Con 2 fichas, la búsqueda recomienda retirar 2.',
        ],
        [
          'Elegir',
          'Definí un desempate determinista.',
          'Una derrota forzada puede tener varias acciones igual de malas.',
          'Con 3 fichas se elige 1 según el contrato, sin inventar una victoria.',
        ],
        [
          'Escalar',
          'Probá otro juego y límites de profundidad.',
          'La búsqueda completa crece rápido; una heurística ya no garantiza el resultado final.',
          'Distinguís resultado exacto de evaluación aproximada.',
        ],
      ],
      sources: [
        source(
          'UC Berkeley CS188 · juegos y minimax',
          'https://inst.eecs.berkeley.edu/~cs188/textbook/games/',
        ),
      ],
      related: { rust: ['rust-06', 'rust-23', 'rust-32'], go: ['go-06', 'go-10', 'go-86'] },
      bridge: {
        rust: 'Una función recursiva pura devuelve utilidad; Option separa ausencia de acción del valor de una jugada.',
        go: 'Funciones recursivas y structs pueden representar estados; manteniendo la búsqueda pura podés probarla sin una interfaz gráfica.',
      },
    },
  ];
  const workshops = specifications.map((w, i) => ({
    ...w,
    category: 'play',
    model: w.id,
    code: { rust: 'rust-' + (129 + i), go: 'go-' + (129 + i) },
    steps: w.steps.map(([title, task, why, done]) => ({ title, task, why, done })),
  }));
  return { workshops, models };
})();
