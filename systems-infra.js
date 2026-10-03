/* Talleres originales. Modelos puros: sin red, disco, temporizadores ni ejecución del editor. */
(() => {
  'use strict';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const c = (action, label, value) => ({
    action,
    label,
    ...(value === undefined ? {} : { value: String(value) }),
  });
  const metric = (label, value) => ({ label, value: String(value) });
  const cell = (label, value, tone = 'muted') => ({ label, value: String(value), tone });
  const shown = (value) => (value === null || value === undefined ? '∅' : String(value));
  function note(s, message) {
    s.notice = message;
    s.log.push(message);
    s.log = s.log.slice(-8);
  }
  function model(initial, transition, describe) {
    return {
      initial: () => ({
        ...initial(),
        flags: {},
        log: [],
        notice: 'Elegí una acción y observá qué garantía cambia.',
      }),
      act(state, action, value) {
        const next = clone(state);
        transition(next, action, value);
        return next;
      },
      view(state) {
        return { ...describe(state), log: state.log.slice(), explanation: state.notice };
      },
      achieved: (state) => Object.keys(state.flags).filter((id) => state.flags[id] === true),
    };
  }
  const models = {};
  function walValue(records) {
    let pending = null,
      value = null;
    for (const record of records) {
      if (record.kind === 'put') pending = record.value;
      if (record.kind === 'commit' && pending !== null) {
        value = pending;
        pending = null;
      }
    }
    return value;
  }
  models.wal = model(
    () => ({ records: [], durable: 0, visible: null, pending: null, down: false }),
    (s, action, value) => {
      if (action === 'crash') {
        const recovered = walValue(s.records.slice(0, s.durable));
        if (s.visible !== null && s.visible !== recovered) s.flags['wal-loss'] = true;
        s.records = s.records.slice(0, s.durable);
        s.visible = null;
        s.pending = null;
        s.down = true;
        note(
          s,
          'Corte de energía: se perdió RAM y la cola no sincronizada. Solo sobrevive el prefijo durable.',
        );
        return;
      }
      if (action === 'recover') {
        s.visible = walValue(s.records.slice(0, s.durable));
        if (s.down && s.visible !== null) s.flags['wal-recovered'] = true;
        s.pending = null;
        s.down = false;
        note(
          s,
          `Replay: valor visible ${shown(s.visible)}. Los PUT sin COMMIT durable no se publican.`,
        );
        return;
      }
      if (s.down) {
        note(s, 'El proceso está caído. Ejecutá recuperación antes de aceptar otra operación.');
        return;
      }
      if (action === 'put' && ['10', '20'].includes(String(value))) {
        s.pending = Number(value);
        s.records.push({ kind: 'put', value: s.pending });
        note(
          s,
          `PUT saldo=${value} agregado al buffer del WAL; todavía no hay commit ni promesa de durabilidad.`,
        );
      } else if (action === 'commit') {
        if (s.pending === null) {
          note(s, 'No hay escritura pendiente que confirmar.');
          return;
        }
        s.records.push({ kind: 'commit' });
        s.visible = s.pending;
        s.pending = null;
        note(
          s,
          `COMMIT visible en este proceso: ${s.visible}. Aún no prometimos supervivencia a un corte.`,
        );
      } else if (action === 'sync') {
        s.durable = s.records.length;
        if (walValue(s.records) !== null) s.flags['wal-durable'] = true;
        note(
          s,
          'Barrera durable completada en el modelo: el WAL y sus commits hasta aquí sobrevivirán al corte simulado.',
        );
      }
    },
    (s) => ({
      title: 'La caja negra de la base',
      summary: 'Un escritor, una clave, un prefijo durable explícito.',
      metrics: [
        metric('Valor visible', shown(s.visible)),
        metric('Registros durables', s.durable),
        metric('Proceso', s.down ? 'caído' : 'activo'),
      ],
      cells: s.records.map((r, i) =>
        cell(
          '#' + (i + 1),
          r.kind === 'put' ? 'PUT ' + r.value : 'COMMIT',
          i < s.durable ? 'good' : 'active',
        ),
      ),
      controls: [
        c('put', 'Preparar saldo=10', 10),
        c('put', 'Preparar saldo=20', 20),
        c('commit', 'Agregar COMMIT'),
        c('sync', 'Sincronizar WAL durable'),
        c('crash', 'Cortar energía'),
        c('recover', 'Recuperar desde WAL'),
      ],
    }),
  );

  function newest(entries) {
    const byKey = new Map();
    for (const entry of entries)
      if (!byKey.has(entry.key) || byKey.get(entry.key).seq < entry.seq)
        byKey.set(entry.key, entry);
    return [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  }
  function lsmRead(s) {
    const latest = newest([...s.mem, ...s.runs.flat()]).find((e) => e.key === 'ore');
    return latest && !latest.deleted ? latest.value : null;
  }
  models.lsm = model(
    () => ({
      mem: [],
      runs: [
        [
          { key: 'ore', value: 'cobre', seq: 1, deleted: false },
          { key: 'water', value: 'agua', seq: 2, deleted: false },
        ],
      ],
      seq: 3,
    }),
    (s, action) => {
      if (action === 'delete') {
        s.mem.push({ key: 'ore', value: '', seq: s.seq++, deleted: true });
        note(
          s,
          'DELETE crea un tombstone con secuencia nueva. No borra mágicamente los datos de SST antiguas.',
        );
      } else if (action === 'flush') {
        if (!s.mem.length) {
          note(s, 'La memtable está vacía; no se creó una SST.');
          return;
        }
        s.runs.unshift(newest(s.mem));
        s.mem = [];
        note(s, 'Flush: la memtable pasa a una nueva SST. La versión antigua sigue en otra SST.');
      } else if (action === 'unsafe') {
        const before = lsmRead(s);
        if (s.runs.length > 1) s.runs[0] = s.runs[0].filter((e) => !e.deleted);
        if (before === null && lsmRead(s) === 'cobre') s.flags['lsm-resurrection'] = true;
        note(
          s,
          `Compactación insegura de solo la SST nueva: ore=${shown(lsmRead(s))}. Quitar el marcador puede revelar la versión antigua fuera del conjunto.`,
        );
      } else if (action === 'partial') {
        if (s.runs.length > 1) {
          s.runs[0] = newest(s.runs[0]);
          if (s.runs[0].some((e) => e.deleted && e.key === 'ore') && lsmRead(s) === null)
            s.flags['lsm-retained'] = true;
        }
        note(
          s,
          'Compactación parcial segura: se conservan tombstones porque podrían existir versiones fuera del conjunto seleccionado.',
        );
      } else if (action === 'full') {
        if (s.mem.length) {
          note(s, 'Primero hacé flush: esta acción compacta SST, no la memtable.');
          return;
        }
        const merged = newest(s.runs.flat()),
          hadDelete = merged.some((e) => e.key === 'ore' && e.deleted);
        s.runs = [merged.filter((e) => !e.deleted)];
        if (hadDelete && lsmRead(s) === null && s.runs[0].some((e) => e.key === 'water'))
          s.flags['lsm-reclaimed'] = true;
        note(
          s,
          'Se incluyeron TODAS las versiones y asumimos que no hay snapshots activos: ahora es seguro retirar los tombstones y sus valores antiguos.',
        );
      }
    },
    (s) => ({
      title: 'El dato que volvió de la tumba',
      summary: 'La marca de borrado también es información.',
      metrics: [
        metric('Lectura ore', shown(lsmRead(s))),
        metric('SST', s.runs.length),
        metric('Memtable', s.mem.length),
      ],
      cells: [
        cell(
          'Memtable',
          s.mem.map((e) => e.key + ':DEL@' + e.seq).join(' · ') || 'vacía',
          'active',
        ),
        ...s.runs.map((run, i) =>
          cell(
            'SST ' + i,
            run.map((e) => e.key + ':' + (e.deleted ? 'DEL' : e.value) + '@' + e.seq).join(' · ') ||
              'vacía',
            run.some((e) => e.deleted) ? 'bad' : 'muted',
          ),
        ),
      ],
      controls: [
        c('delete', 'Borrar ore'),
        c('flush', 'Flush a SST'),
        c('unsafe', 'Provocar: tirar tombstone parcial'),
        c('partial', 'Compactar parcial conservando DEL'),
        c('full', 'Compactar todas sin snapshots'),
      ],
    }),
  );

  models.quorum = model(
    () => ({
      nodes: [
        { name: 'A', version: 0 },
        { name: 'B', version: 0 },
        { name: 'C', version: 0 },
      ],
      reachable: [true, true, true],
      version: 0,
      lastRead: null,
    }),
    (s, action) => {
      if (action === 'isolate-c') {
        s.reachable = [true, true, false];
        note(s, 'C queda separada del coordinador; A y B todavía responden.');
      } else if (action === 'minority') {
        s.reachable = [false, false, true];
        note(s, 'Solo C responde al coordinador: una réplica no satisface W=2 ni R=2.');
      } else if (action === 'heal') {
        s.reachable = [true, true, true];
        note(s, 'La red vuelve; sanar la conectividad no copia los datos por sí solo.');
      } else if (action === 'write') {
        const available = s.nodes.filter((_, i) => s.reachable[i]);
        if (available.length < 2) {
          s.flags['quorum-unavailable'] = true;
          note(
            s,
            'W=2 no alcanzado. En este modelo la propuesta se rechaza antes de instalarla; sistemas reales pueden dejar escrituras parciales.',
          );
          return;
        }
        s.version++;
        for (const node of available) node.version = s.version;
        note(
          s,
          `Escritura v${s.version} confirmada por ${available.map((n) => n.name).join(', ')}. Un escritor único asigna versiones en este modelo.`,
        );
      } else if (action === 'read-one') {
        const node = s.reachable[2] ? s.nodes[2] : s.nodes.find((_, i) => s.reachable[i]);
        if (!node) return;
        s.lastRead = node.version;
        if (node.version < s.version) s.flags['quorum-stale'] = true;
        note(
          s,
          `Lectura R=1 desde ${node.name}: v${node.version}. Responder rápido no implica observar la última escritura confirmada.`,
        );
      } else if (action === 'read-quorum') {
        const responses = s.nodes.filter((_, i) => s.reachable[i]).slice(0, 2);
        if (responses.length < 2) {
          note(s, 'R=2 no alcanzado: la lectura queda indisponible.');
          return;
        }
        s.lastRead = Math.max(...responses.map((n) => n.version));
        note(
          s,
          `R=2 respondió v${s.lastRead}. W+R>N garantiza intersección de conjuntos fijos; elegir la versión exige las hipótesis adicionales de este juguete.`,
        );
      } else if (action === 'repair') {
        if (!s.reachable.every(Boolean)) {
          note(s, 'Reparación detenida: primero reuní las tres réplicas.');
          return;
        }
        const max = Math.max(...s.nodes.map((n) => n.version)),
          differed = s.nodes.some((n) => n.version < max);
        for (const node of s.nodes) node.version = max;
        if (differed && max > 0) s.flags['quorum-repaired'] = true;
        note(
          s,
          `Reparación explícita: las tres copias quedan en v${max}. No elegimos líder ni ejecutamos consenso.`,
        );
      }
    },
    (s) => ({
      title: 'Tres copias, respuestas distintas',
      summary: 'N=3, W=2; compará R=1 y R=2 bajo particiones.',
      metrics: [
        metric('Última confirmada', 'v' + s.version),
        metric('Última lectura', s.lastRead === null ? '∅' : 'v' + s.lastRead),
      ],
      cells: s.nodes.map((n, i) =>
        cell(
          n.name + (s.reachable[i] ? ' conectada' : ' aislada'),
          'v' + n.version,
          !s.reachable[i] ? 'bad' : n.version === s.version ? 'good' : 'active',
        ),
      ),
      controls: [
        c('isolate-c', 'Aislar C'),
        c('write', 'Escribir con W=2'),
        c('heal', 'Sanar red'),
        c('read-one', 'Leer una copia (prefiere C)'),
        c('read-quorum', 'Leer con R=2'),
        c('minority', 'Dejar solo C accesible'),
        c('repair', 'Reparar réplicas conectadas'),
      ],
    }),
  );

  models.clocks = model(
    () => ({ clocks: { A: 0, B: 0, C: 0 }, messages: [], events: [], sawAB: false }),
    (s, action) => {
      if (action === 'local-a' || action === 'local-b') {
        const node = action === 'local-a' ? 'A' : 'B',
          stamp = ++s.clocks[node];
        s.events.push([node, 'local', String(stamp)]);
        if (!s.messages.length && !s.sawAB && s.clocks.A === 1 && s.clocks.B === 1)
          s.flags['clocks-independent'] = true;
        note(
          s,
          `${node} ejecuta un evento local: L=${stamp}. Igualdad o desigualdad de contadores no prueba causalidad entre nodos.`,
        );
      } else if (action === 'send-ab' || action === 'send-bc') {
        const from = action === 'send-ab' ? 'A' : 'B',
          to = from === 'A' ? 'B' : 'C',
          stamp = ++s.clocks[from];
        s.messages.push({ from, to, stamp, chained: from === 'B' && s.sawAB });
        s.events.push([from, 'envía a ' + to, String(stamp)]);
        note(
          s,
          `Enviar también es un evento: ${from} incrementa a ${stamp} y adjunta ese sello al mensaje.`,
        );
      } else if (action === 'deliver') {
        const message = s.messages.shift();
        if (!message) {
          note(s, 'No hay mensaje pendiente que recibir.');
          return;
        }
        const old = s.clocks[message.to];
        s.clocks[message.to] = Math.max(old, message.stamp) + 1;
        s.events.push([message.to, 'recibe de ' + message.from, String(s.clocks[message.to])]);
        s.flags['clocks-receive'] = true;
        if (message.from === 'A' && message.to === 'B') s.sawAB = true;
        if (message.chained && message.to === 'C') s.flags['clocks-chain'] = true;
        note(
          s,
          `${message.to}: max(${old}, ${message.stamp}) + 1 = ${s.clocks[message.to]}. La recepción sucede después del envío en el orden causal.`,
        );
      }
      s.events = s.events.slice(-10);
    },
    (s) => ({
      title: 'Orden sin reloj de pared',
      summary: 'Los sellos Lamport respetan precedencia causal; no miden segundos.',
      metrics: [metric('Mensajes en tránsito', s.messages.length)],
      cells: Object.entries(s.clocks).map(([name, time]) => cell(name, 'L=' + time, 'active')),
      columns: ['Nodo', 'Evento', 'Lamport'],
      rows: s.events,
      controls: [
        c('local-a', 'Evento local A'),
        c('local-b', 'Evento local B'),
        c('send-ab', 'Enviar A → B'),
        c('send-bc', 'Enviar B → C'),
        c('deliver', 'Entregar siguiente mensaje'),
      ],
    }),
  );

  const fragments = ['GO', 'PH', 'ER'];
  models.network = model(
    () => ({ received: {}, dropped: false, retried: false, conflicts: 0 }),
    (s, action, value) => {
      if (action === 'drop-one') {
        if (!Object.hasOwn(s.received, '1')) {
          s.dropped = true;
          note(
            s,
            'El fragmento 1 se pierde antes de llegar. El receptor conserva 0 y 2 si ya los tiene.',
          );
        } else note(s, 'El fragmento 1 ya fue recibido; perder otra copia no lo borra.');
        return;
      }
      let index = Number(value),
        payload;
      if (action === 'retry-one') {
        index = 1;
        if (!s.dropped) {
          note(s, 'Primero perdé el fragmento 1 para observar una retransmisión necesaria.');
          return;
        }
        s.retried = true;
        s.dropped = false;
        payload = fragments[1];
      } else if (action === 'deliver' && [0, 1, 2].includes(index)) {
        if (index === 1 && s.dropped) {
          note(s, 'Esa copia se perdió. Usá reintentar para enviar otra copia del fragmento 1.');
          return;
        }
        payload = fragments[index];
      } else if (action === 'conflict') {
        index = 0;
        payload = 'XX';
      } else return;
      const key = String(index);
      if (Object.hasOwn(s.received, key)) {
        if (s.received[key] === payload) {
          s.flags['network-deduped'] = true;
          note(s, `Duplicado idéntico #${index}: se reconoce sin agregar datos dos veces.`);
        } else {
          s.conflicts++;
          note(
            s,
            `Conflicto #${index}: el mismo índice trae otros bytes. Rechazado; se conserva la primera copia.`,
          );
        }
      } else {
        if (index === 2 && !Object.hasOwn(s.received, '0')) s.flags['network-reordered'] = true;
        s.received[key] = payload;
        note(
          s,
          `Guardado fragmento #${index}=${payload}. La posición final depende del índice, no del orden de llegada.`,
        );
      }
      if (
        Object.keys(s.received).length === 3 &&
        s.retried &&
        [0, 1, 2].map((i) => s.received[i]).join('') === 'GOPHER'
      )
        s.flags['network-assembled'] = true;
    },
    (s) => ({
      title: 'El mensaje llega en pedazos',
      summary: 'Desordená, perdé, duplicá y reensamblá por índice.',
      metrics: [
        metric('Recibidos', Object.keys(s.received).length + '/3'),
        metric(
          'Mensaje',
          Object.keys(s.received).length === 3
            ? [0, 1, 2].map((i) => s.received[i]).join('')
            : 'incompleto',
        ),
        metric('Conflictos', s.conflicts),
      ],
      cells: fragments.map((part, i) =>
        cell(
          '#' + i,
          s.received[i] || (i === 1 && s.dropped ? 'perdido' : 'pendiente'),
          s.received[i] ? 'good' : i === 1 && s.dropped ? 'bad' : 'muted',
        ),
      ),
      controls: [
        c('deliver', 'Entregar #2', 2),
        c('deliver', 'Entregar #0', 0),
        c('drop-one', 'Perder #1'),
        c('deliver', 'Entregar #1', 1),
        c('retry-one', 'Reintentar #1'),
        c('deliver', 'Duplicar #0', 0),
        c('conflict', 'Inyectar #0 distinto'),
      ],
    }),
  );

  models.backpressure = model(
    () => ({
      capacity: 2,
      queue: [],
      active: null,
      pending: null,
      next: 1,
      completed: [],
      wasBlocked: false,
    }),
    (s, action) => {
      if (action === 'produce') {
        if (s.pending === null) s.pending = s.next++;
        if (s.queue.length === s.capacity) {
          s.wasBlocked = true;
          s.flags['backpressure-blocked'] = true;
          note(
            s,
            `Cola llena: tarea ${s.pending} queda con el productor. No se descarta ni se encola por encima del límite.`,
          );
        } else {
          const item = s.pending;
          s.queue.push(item);
          s.pending = null;
          if (s.wasBlocked) {
            s.flags['backpressure-resumed'] = true;
            s.wasBlocked = false;
          }
          note(
            s,
            `Tarea ${item} aceptada. La cola ocupa ${s.queue.length}/${s.capacity}; el trabajo activo se cuenta aparte.`,
          );
        }
      } else if (action === 'worker') {
        if (s.active === null) {
          if (!s.queue.length) {
            note(s, 'El trabajador espera: no hay tareas en la cola.');
            return;
          }
          s.active = { id: s.queue.shift(), remaining: 2 };
          note(
            s,
            `El trabajador toma ${s.active.id}; liberó un lugar. Todavía faltan dos pasos de trabajo.`,
          );
        } else {
          s.active.remaining--;
          if (s.active.remaining === 0) {
            s.completed.push(s.active.id);
            note(s, `Terminó la tarea ${s.active.id}. La siguiente aún debe salir de la cola.`);
            s.active = null;
          } else note(s, `Tarea ${s.active.id}: resta ${s.active.remaining} paso de trabajo.`);
        }
        if (
          s.completed.length >= 2 &&
          s.completed.every((id, i) => i === 0 || id > s.completed[i - 1])
        )
          s.flags['backpressure-fifo'] = true;
      }
    },
    (s) => ({
      title: 'La fábrica tiene un límite',
      summary: 'Cola de 2, un trabajador y un productor que conserva la tarea rechazada.',
      metrics: [
        metric('Cola', s.queue.length + '/2'),
        metric('Terminadas', s.completed.join(', ') || 'ninguna'),
      ],
      cells: [
        cell(
          'Productor',
          s.pending === null ? 'listo' : 'espera tarea ' + s.pending,
          s.pending === null ? 'muted' : 'bad',
        ),
        ...[0, 1].map((i) =>
          cell(
            'Slot ' + i,
            s.queue[i] === undefined ? 'libre' : 'tarea ' + s.queue[i],
            s.queue[i] === undefined ? 'muted' : 'active',
          ),
        ),
        cell(
          'Trabajador',
          s.active ? '#' + s.active.id + ' · faltan ' + s.active.remaining : 'libre',
          s.active ? 'active' : 'good',
        ),
      ],
      controls: [
        c('produce', 'Producir / reintentar pendiente'),
        c('worker', 'Avanzar trabajador un paso'),
      ],
    }),
  );

  function chooseBackend(nodes) {
    return nodes
      .filter((n) => n.healthy && !n.open && n.inflight < 2)
      .sort((a, b) => a.inflight - b.inflight || a.name.localeCompare(b.name))[0];
  }
  models.balancing = model(
    () => ({
      nodes: ['A', 'B', 'C'].map((name) => ({
        name,
        healthy: true,
        open: false,
        inflight: 0,
        failures: 0,
      })),
      last: '∅',
      probed: false,
    }),
    (s, action, value) => {
      const b = s.nodes[1];
      if (action === 'health-a') {
        s.nodes[0].healthy = !s.nodes[0].healthy;
        note(
          s,
          `Health de A: ${s.nodes[0].healthy ? 'sano' : 'no sano'}. No cancelamos las peticiones que ya estaban activas.`,
        );
      } else if (action === 'route') {
        const target = chooseBackend(s.nodes);
        if (!target) {
          s.last = 'rechazada';
          note(
            s,
            'No hay backend elegible con cupo. La petición se rechaza; no inventamos capacidad.',
          );
          return;
        }
        target.inflight++;
        s.last = target.name;
        if (!s.nodes[0].healthy && target.name !== 'A') s.flags['balancing-health'] = true;
        if (s.probed && target.name === 'B') s.flags['balancing-recovered'] = true;
        note(
          s,
          `Petición enviada a ${target.name}: menor carga elegible; empate por nombre. Salud, circuito y cupo se evalúan antes de elegir.`,
        );
      } else if (action === 'finish' && ['A', 'B', 'C'].includes(String(value))) {
        const node = s.nodes.find((n) => n.name === value);
        if (!node.inflight) {
          note(s, `No hay petición activa en ${value} para completar.`);
          return;
        }
        node.inflight--;
        if (!node.open) node.failures = 0;
        note(
          s,
          `Éxito en ${value}: libera cupo y corta la racha de fallos si el circuito sigue cerrado.`,
        );
      } else if (action === 'fail-b') {
        if (!b.inflight) {
          note(s, 'Primero encaminá una petición a B. Un fallo requiere trabajo activo.');
          return;
        }
        b.inflight--;
        if (!b.open) b.failures++;
        if (b.failures >= 2) {
          b.open = true;
          s.flags['balancing-opened'] = true;
        }
        note(
          s,
          `Fallo de B: racha ${b.failures}; circuito ${b.open ? 'abierto y excluido' : 'cerrado'}. Umbral didáctico: dos fallos consecutivos.`,
        );
      } else if (action === 'probe-b') {
        if (!b.open) {
          note(
            s,
            'B no tiene el circuito abierto. Esta sonda manual sirve para recuperarlo después del fallo.',
          );
          return;
        }
        b.open = false;
        b.failures = 0;
        b.healthy = true;
        s.probed = true;
        note(
          s,
          'La sonda manual de B tuvo éxito: cerramos el circuito. No simulamos timers ni una implementación completa de half-open.',
        );
      }
    },
    (s) => ({
      title: 'El portero de las peticiones',
      summary: 'Menor carga elegible; máximo 2 peticiones activas por backend.',
      metrics: [metric('Último destino', s.last)],
      cells: s.nodes.map((n) =>
        cell(
          n.name,
          `${n.healthy ? 'sano' : 'no sano'} · ${n.open ? 'abierto' : 'cerrado'} · ${n.inflight}/2`,
          !n.healthy || n.open ? 'bad' : n.inflight === 2 ? 'active' : 'good',
        ),
      ),
      controls: [
        c('route', 'Enviar petición'),
        c('health-a', 'Alternar health A'),
        c('finish', 'Completar éxito A', 'A'),
        c('finish', 'Completar éxito B', 'B'),
        c('finish', 'Completar éxito C', 'C'),
        c('fail-b', 'Fallar petición activa B'),
        c('probe-b', 'Sonda exitosa manual B'),
      ],
    }),
  );

  const baselineRing = [
    { token: 10, node: 'A' },
    { token: 40, node: 'B' },
    { token: 70, node: 'C' },
  ];
  const shardKeys = [5, 15, 30, 45, 65, 85, 95];
  function owner(ring, hash) {
    const sorted = ring.slice().sort((a, b) => a.token - b.token);
    return (sorted.find((n) => n.token >= hash) || sorted[0])?.node || null;
  }
  function movements(ring) {
    return shardKeys.filter((key) => owner(ring, key) !== owner(baselineRing, key));
  }
  models.sharding = model(
    () => ({ ring: clone(baselineRing), compared: false, selected: 95 }),
    (s, action) => {
      if (action === 'inspect-wrap') {
        s.selected = 95;
        if (owner(s.ring, 95) === 'A') s.flags['sharding-wrap'] = true;
        note(
          s,
          'Hash 95 supera el último token: la búsqueda vuelve al primer token, 10/A. El anillo no tiene un final especial.',
        );
      } else if (action === 'add') {
        if (s.ring.some((n) => n.node === 'D')) {
          note(s, 'D ya tiene su token 25 en el anillo.');
          return;
        }
        s.ring.push({ token: 25, node: 'D' });
        s.ring.sort((a, b) => a.token - b.token);
        const moved = movements(s.ring);
        if (
          moved.length > 0 &&
          moved.every((key) => key > 10 && key <= 25 && owner(s.ring, key) === 'D')
        )
          s.flags['sharding-local'] = true;
        note(
          s,
          `Agregar 25/D mueve únicamente hashes en (10,25]. Muestras movidas: ${moved.join(', ')}. No se migraron bytes reales.`,
        );
      } else if (action === 'compare') {
        if (!s.ring.some((n) => n.node === 'D')) {
          note(s, 'Agregá D para comparar el mismo cambio de membresía.');
          return;
        }
        const moduloMoved = shardKeys.filter((key) => 'ABC'[key % 3] !== 'ABCD'[key % 4]).length;
        s.compared = true;
        if (movements(s.ring).length < moduloMoved) s.flags['sharding-compared'] = true;
        note(
          s,
          `En estas 7 muestras: anillo mueve ${movements(s.ring).length}, hash mod N mueve ${moduloMoved}. Es un ejemplo concreto, no una garantía de equilibrio para toda carga.`,
        );
      } else if (action === 'remove') {
        s.ring = clone(baselineRing);
        s.compared = false;
        note(
          s,
          'Se retiró D: las claves de su intervalo vuelven al sucesor B. La migración de almacenamiento queda como proyecto.',
        );
      }
    },
    (s) => ({
      title: 'Repartir sin moverlo todo',
      summary:
        'Hashes ya calculados en 0…99; elegimos el primer token ≥ hash, con vuelta al inicio.',
      metrics: [
        metric('Nodos', s.ring.length),
        metric('Claves movidas', movements(s.ring).length + '/7'),
      ],
      cells: s.ring.map((n) =>
        cell('Token ' + n.token, n.node, n.node === 'D' ? 'active' : 'good'),
      ),
      columns: ['Hash', 'Antes', 'Ahora'],
      rows: shardKeys.map((key) => [String(key), owner(baselineRing, key), owner(s.ring, key)]),
      controls: [
        c('inspect-wrap', 'Inspeccionar hash 95'),
        c('add', 'Agregar D en token 25'),
        c('compare', 'Comparar con hash mod N'),
        c('remove', 'Retirar D'),
      ],
    }),
  );

  const source = {
    wal: [
      { title: 'SQLite · Write-Ahead Logging', url: 'https://sqlite.org/wal.html' },
      { title: 'TigerBeetle · Safety', url: 'https://docs.tigerbeetle.com/concepts/safety/' },
    ],
    lsm: [
      { title: 'RocksDB · Compaction', url: 'https://github.com/facebook/rocksdb/wiki/Compaction' },
    ],
    quorum: [
      {
        title: 'Dynamo · artículo original',
        url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
      },
      { title: 'Raft · visualizaciones y artículo', url: 'https://raft.github.io/' },
      { title: 'MIT 6.5840 · sistemas distribuidos', url: 'https://pdos.csail.mit.edu/6.5840/' },
    ],
    clocks: [
      {
        title: 'Lamport · Time, Clocks, and the Ordering of Events',
        url: 'https://lamport.azurewebsites.net/pubs/time-clocks.pdf',
      },
    ],
    network: [
      {
        title: 'RFC 9000 · QUIC y retransmisión de información',
        url: 'https://datatracker.ietf.org/doc/html/rfc9000#section-13.3',
      },
    ],
    backpressure: [
      { title: 'Go · Pipelines and cancellation', url: 'https://go.dev/blog/pipelines' },
    ],
    balancing: [
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
    sharding: [
      {
        title: 'Envoy · Ring hash',
        url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers#ring-hash',
      },
      {
        title: 'Dynamo · particionamiento',
        url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
      },
    ],
  };
  const goal = (id, label, why) => ({ id, label, why });
  const step = (title, task, why, done) => ({ title, task, why, done });
  const quiz = (question, options, answer, explanation) => ({
    question,
    options,
    answer,
    explanation,
  });
  const workshops = [];
  function add(id, details) {
    const index = workshops.length;
    workshops.push({
      id,
      category: 'infra',
      model: id,
      minutes: 40,
      sources: source[id],
      code: { rust: 'rust-' + (121 + index), go: 'go-' + (121 + index) },
      ...details,
    });
  }
  add('wal', {
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
      goal(
        'wal-loss',
        'Perder un commit no sincronizado',
        'Provocá el corte antes de sync para distinguir visibilidad de durabilidad.',
      ),
      goal(
        'wal-durable',
        'Sincronizar un commit completo',
        'El prefijo durable debe contener PUT y COMMIT.',
      ),
      goal(
        'wal-recovered',
        'Recuperar el valor después del corte',
        'Replay solo publica transacciones comprometidas dentro del prefijo sobreviviente.',
      ),
    ],
    prediction: quiz(
      'PUT y COMMIT están en RAM, sin sync; ocurre un corte. ¿Qué promete este modelo?',
      [
        'Que el commit siempre sobrevive',
        'Que solo sobrevive el prefijo sincronizado',
        'Que el valor cero es el saldo real',
      ],
      1,
      'La barrera durable define qué sobrevive. Un commit visible puede perderse si aún estaba fuera de ese prefijo.',
    ),
    steps: [
      step(
        'Registro primero',
        'Definí PUT y COMMIT con un ID de transacción.',
        'Un replay necesita saber qué escrituras forman una unidad.',
        'Una transacción incompleta no modifica el estado recuperado.',
      ),
      step(
        'Núcleo ejecutable',
        'Implementá RecoverWAL / recover_wal con el prefijo durable explícito.',
        'La lógica puede probarse sin depender del disco.',
        'Pasan transacciones intercaladas, commits y un sufijo perdido.',
      ),
      step(
        'Archivo local',
        'En un proyecto propio, serializá registros y manejá errores de escritura/sync con la API oficial del sistema.',
        'La promesa durable depende de un I/O exitoso y su contrato.',
        'Un error de sync no recibe una confirmación durable al cliente.',
      ),
      step(
        'Recuperación real',
        'Agregá checksum, longitud y truncado del último registro; reiniciá el proceso con un archivo preparado.',
        'El log real puede terminar a mitad de registro.',
        'Se recupera el prefijo válido sin publicar la transacción incompleta.',
      ),
    ],
    related: { rust: ['rust-98', 'rust-100'], go: ['go-96', 'go-99'] },
    bridge: {
      rust: 'Enums y BTreeMap expresan tipos de registro y escrituras pendientes; Result propaga fallos de I/O al salir del modelo.',
      go: 'Structs y maps agrupan los cambios pendientes. El commit debe aplicar una unidad completa y descartar el buffer de esa transacción.',
    },
  });
  add('lsm', {
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
      goal(
        'lsm-resurrection',
        'Provocar una resurrección',
        'Borrá, hacé flush y eliminá el tombstone de la SST nueva sin incluir la vieja.',
      ),
      goal(
        'lsm-retained',
        'Conservar el borrado en una compactación parcial',
        'Volvé a borrar y preservá DEL mientras la versión antigua quede afuera.',
      ),
      goal(
        'lsm-reclaimed',
        'Recuperar espacio con contexto completo',
        'Incluí todas las versiones, sin snapshots, y conservá las otras claves.',
      ),
    ],
    prediction: quiz(
      'Una SST externa todavía tiene el valor viejo. ¿Podés tirar el tombstone durante una compactación parcial?',
      [
        'Sí, porque el DELETE ya pasó',
        'Sí, si ordenás por clave',
        'No: el valor podría reaparecer',
      ],
      2,
      'El marcador impide que una versión anterior siga siendo visible; retirarlo requiere conocer el contexto fuera del conjunto.',
    ),
    steps: [
      step(
        'Representar historia',
        'Definí clave, secuencia y valor opcional; None/Deleted representa tombstone.',
        'Vacío y borrado son estados distintos.',
        'Una cadena vacía se conserva como valor válido.',
      ),
      step(
        'Fusionar',
        'Implementá la selección de mayor secuencia por clave.',
        'El orden de los archivos no debe reemplazar el orden de versiones.',
        'Los tests incluyen entradas desordenadas y un borrado reciente.',
      ),
      step(
        'Contexto de descarte',
        'Exponé una bandera que solo el planificador autorizado pueda activar.',
        'La función de merge no conoce por sí sola todos los archivos y snapshots.',
        'Con descarte deshabilitado, el tombstone continúa en el resultado.',
      ),
      step(
        'Proyecto con tablas',
        'Escribí SST pequeñas e integrá un iterador de merge antes de experimentar con RocksDB.',
        'Reutilizar un motor real evita reinventar durabilidad, índices y compactación concurrente.',
        'Compará la lectura antes/después de compactar y revisá snapshots antes de eliminar marcas.',
      ),
    ],
    related: { rust: ['rust-88', 'rust-99'], go: ['go-18', 'go-94'] },
    bridge: {
      rust: 'Option<String> distingue tombstone de un valor vacío; BTreeMap produce un orden de salida estable.',
      go: 'Un campo Deleted separado evita confundir cadena vacía con ausencia. La secuencia decide qué entrada gana.',
    },
  });
  add('quorum', {
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
      goal(
        'quorum-stale',
        'Leer una réplica atrasada',
        'Aislá C, escribí en A/B, saná la red y pedí una copia.',
      ),
      goal(
        'quorum-unavailable',
        'Observar indisponibilidad de la minoría',
        'Una única respuesta no satisface W=2.',
      ),
      goal(
        'quorum-repaired',
        'Reparar después de sanar la red',
        'Reconectar no actualiza los datos automáticamente.',
      ),
    ],
    prediction: quiz(
      'Con W=2,R=2,N=3, ¿qué demuestra W+R>N por sí sola?',
      [
        'Consenso y elección de líder',
        'Intersección entre esos conjuntos de réplicas',
        'Disponibilidad bajo cualquier partición',
      ],
      1,
      'Los conjuntos se superponen. La consistencia final depende además del protocolo, versiones, concurrencia y fallos.',
    ),
    steps: [
      step(
        'Conjuntos antes de protocolos',
        'Implementá la validación N,W,R y la condición de intersección sin overflow.',
        'Una propiedad matemática pequeña no debe confundirse con un servicio completo.',
        'Rechazás R/W fuera de rango y distinguís W+R=N.',
      ),
      step(
        'Versiones observables',
        'Guardá versiones y respuestas por réplica en un simulador.',
        'El valor de cada nodo permite explicar lecturas atrasadas.',
        'La réplica aislada conserva su versión anterior.',
      ),
      step(
        'Protocolo con referencias',
        'Seguí los laboratorios MIT y visualizaciones de Raft para elegir un protocolo completo.',
        'Términos, elecciones y commits requieren reglas conjuntas.',
        'Podés describir qué propiedad no garantiza tu modelo de quórum.',
      ),
      step(
        'Fallos reproducibles',
        'Prepará trazas de partición, retraso y reinicio; documentá supuestos de membresía.',
        'Dormir unos milisegundos no define un modelo de fallos.',
        'Cada traza produce un historial que se puede revisar y repetir.',
      ),
    ],
    related: { rust: ['rust-99', 'rust-110'], go: ['go-93', 'go-110'] },
    bridge: {
      rust: 'Result separa configuración inválida de una configuración válida sin intersección garantizada.',
      go: 'Validar rangos primero permite comparar W > N-R sin desbordar una suma grande.',
    },
  });
  add('clocks', {
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
      goal(
        'clocks-independent',
        'Crear eventos independientes con el mismo sello',
        'Hacé un evento local en A y otro en B antes de enviar mensajes.',
      ),
      goal(
        'clocks-receive',
        'Recibir un sello y avanzar con max+1',
        'La recepción debe quedar después de ambos contadores previos.',
      ),
      goal('clocks-chain', 'Crear la cadena A→B→C', 'B debe recibir de A antes de enviar a C.'),
    ],
    prediction: quiz(
      'Local=7, mensaje=3. ¿Nuevo reloj al recibir?',
      ['4', '7', '8'],
      2,
      'Se toma max(7,3)+1. Usar solo recibido+1 haría retroceder el reloj.',
    ),
    steps: [
      step(
        'Evento local',
        'Definí un incremento que detecte overflow.',
        'Un contador que vuelve a cero rompe la monotonía.',
        'El máximo representable produce error sin un sello válido.',
      ),
      step(
        'Recepción',
        'Implementá max(local, remoto)+1.',
        'La recepción debe ser posterior a ambos valores.',
        'Pasan mensajes menores, mayores y límites enteros.',
      ),
      step(
        'Traza causal',
        'Guardá evento, nodo, sello y vínculo de envío/recepción.',
        'Una lista de números sola no captura las relaciones de mensajes.',
        'La traza diferencia eventos independientes y eventos conectados.',
      ),
      step(
        'Comparación útil',
        'Contrastá con vector clocks usando las fuentes originales antes de extender el modelo.',
        'Detectar concurrencia exige más información que un entero.',
        'Explicás por qué L(a)<L(b) no implica a→b y por qué no sirve para TTL.',
      ),
    ],
    related: { rust: ['rust-74', 'rust-97'], go: ['go-64', 'go-94'] },
    bridge: {
      rust: 'checked_add devuelve Option; el llamador puede rechazar un evento cuyo sello no entra.',
      go: 'Con uint64, comprobá MaxUint64 antes de sumar; un wrap silencioso no es un reloj válido.',
    },
  });
  add('network', {
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
      goal(
        'network-reordered',
        'Recibir #2 antes de #0',
        'El orden de llegada no define el orden del mensaje.',
      ),
      goal(
        'network-deduped',
        'Ignorar una copia idéntica',
        'La cantidad almacenada debe conservarse ante el duplicado.',
      ),
      goal(
        'network-assembled',
        'Recuperar #1 perdido y armar GOPHER',
        'La retransmisión necesaria completa el hueco sin repetir otros fragmentos.',
      ),
    ],
    prediction: quiz(
      'Ya guardaste #0=GO y llega #0=XX. ¿Qué hace nuestro contrato?',
      ['Sobrescribe sin avisar', 'Rechaza el conflicto', 'Concatena GOXX'],
      1,
      'Un mismo índice con bytes distintos hace ambiguo el mensaje. No se elige silenciosamente una versión.',
    ),
    steps: [
      step(
        'Identidad de fragmento',
        'Definí índice y bytes, más una cantidad total confiable.',
        'Sin identidad, una repetición parece un fragmento nuevo.',
        'Un índice fuera de rango devuelve error.',
      ),
      step(
        'Reensamblado',
        'Implementá el núcleo con almacenamiento por índice.',
        'La llegada desordenada no debe cambiar el resultado.',
        'Duplicados iguales no agrandan el mensaje y los diferentes fallan.',
      ),
      step(
        'Límites de recursos',
        'En un proyecto local, agregá ID de mensaje, máximo de bytes y expiración con reloj monotónico.',
        'Un emisor incompleto no debe retener memoria indefinidamente.',
        'Mensajes distintos no comparten buffer y se respeta el presupuesto.',
      ),
      step(
        'Transporte real',
        'Usá una biblioteca de transporte mantenida y leé su política de reintentos.',
        'Congestión y seguridad no se resuelven con un bucle de resend.',
        'Podés provocar pérdida en pruebas sin prometer entrega exactamente una vez.',
      ),
    ],
    related: { rust: ['rust-93', 'rust-106'], go: ['go-106', 'go-111'] },
    bridge: {
      rust: 'Vec<Option<Vec<u8>>> distingue hueco de un fragmento vacío; Result distingue incompleto de inválido.',
      go: 'Un slice de presencia separado distingue un []byte vacío de un fragmento que nunca llegó.',
    },
  });
  add('backpressure', {
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
      goal(
        'backpressure-blocked',
        'Llenar la cola y retener una tarea',
        'Una tercera tarea no debe expandir la cola de capacidad dos.',
      ),
      goal(
        'backpressure-resumed',
        'Reintentar después de liberar espacio',
        'La misma tarea pendiente entra sin pérdida ni cambio de identidad.',
      ),
      goal(
        'backpressure-fifo',
        'Completar al menos dos tareas en orden',
        'El orden FIFO se refiere a la cola; el trabajador único lo conserva al completar.',
      ),
    ],
    prediction: quiz(
      'La cola está llena. ¿Qué pasa al presionar producir en este modelo?',
      [
        'Crece sin límite',
        'Se pierde la tarea más antigua',
        'La tarea queda pendiente con el productor',
      ],
      2,
      'No entra a la cola ni se descarta: el productor conserva su identidad hasta reintentar.',
    ),
    steps: [
      step(
        'Invariante de capacidad',
        'Definí head, longitud y almacenamiento fijo.',
        'Capacidad reservada no es cantidad de elementos válidos.',
        'La longitud siempre queda entre cero y capacidad.',
      ),
      step(
        'Buffer circular',
        'Implementá push/pop sin desplazar todos los elementos.',
        'El índice modular reutiliza huecos al final del array.',
        'Las pruebas fuerzan wrap-around y una capacidad cero.',
      ),
      step(
        'Política de saturación',
        'Integra rechazo explícito y reintento del productor.',
        'Un false necesita una decisión del llamador.',
        'La tarea rechazada no se considera completada ni se pierde.',
      ),
      step(
        'Pipeline local',
        'Sustituí el modelo por canales acotados y cierre coordinado.',
        'La concurrencia introduce cancelación y propiedad del cierre.',
        'Una prueba cancela con la cola llena y todos los trabajadores terminan.',
      ),
    ],
    related: { rust: ['rust-35', 'rust-47'], go: ['go-43', 'go-65'] },
    bridge: {
      rust: 'Un Vec de tamaño fijo y &mut self protegen cambios locales; compartirlo entre threads requiere sincronización adicional.',
      go: 'El buffer circular de este ejercicio no es concurrente. Para varios participantes usá un canal o coordiná con un Mutex.',
    },
  });
  add('balancing', {
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
      goal(
        'balancing-health',
        'Excluir un backend no sano',
        'Marcá A no sano y encaminá una petición a otro.',
      ),
      goal(
        'balancing-opened',
        'Abrir B tras dos fallos consecutivos',
        'Cada fallo debe corresponder a una petición activa en B.',
      ),
      goal(
        'balancing-recovered',
        'Volver a elegir B tras sonda exitosa',
        'La recuperación debe volver a habilitar trabajo real, no solo cambiar una etiqueta.',
      ),
    ],
    prediction: quiz(
      'A tiene carga 0 pero no está sano; B está sano con carga 1 y cupo libre. ¿Qué elegimos?',
      ['A, siempre gana cero', 'B, primero se filtra elegibilidad', 'Cualquier nombre al azar'],
      1,
      'La carga se compara dentro del conjunto que puede recibir una petición.',
    ),
    steps: [
      step(
        'Elegibilidad',
        'Definí healthy, open, inflight y limit.',
        'Son condiciones diferentes que pueden excluir al mismo nodo.',
        'Un nodo sin cupo, abierto o no sano nunca es elegido.',
      ),
      step(
        'Selección pura',
        'Implementá menor carga y desempate lexical.',
        'Probar la política no necesita red.',
        'Cambiar el orden del slice no cambia un empate por nombre.',
      ),
      step(
        'Contabilidad',
        'Incrementá al admitir y decrementá al terminar, también ante error.',
        'Un cupo que no se libera termina simulando una caída permanente.',
        'Una prueba de fallo deja la carga activa correcta.',
      ),
      step(
        'Proxy existente',
        'Compará esta política con Envoy y configurá un servicio de prueba.',
        'Un proxy real ya resuelve discovery, métricas y muchas condiciones de fallo.',
        'Documentás qué límite configura circuit breaking y qué mecanismo observa salud.',
      ),
    ],
    related: { rust: ['rust-110', 'rust-112'], go: ['go-110', 'go-112'] },
    bridge: {
      rust: 'Una referencia al candidato evita clonar todo el backend; la función devuelve el nombre elegido sin mutar cargas.',
      go: 'Una función pura separa selección de reserva del cupo. La reserva concurrente requiere una sección coordinada aparte.',
    },
  });
  add('sharding', {
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
      goal('sharding-wrap', 'Seguir el anillo después del último token', 'Hash 95 vuelve a 10/A.'),
      goal(
        'sharding-local',
        'Mover solo el intervalo ganado por D',
        'Al agregar 25/D, solo cambia (10,25].',
      ),
      goal(
        'sharding-compared',
        'Comparar movimiento con módulo N',
        'Observá la diferencia sobre el mismo conjunto fijo de claves.',
      ),
    ],
    prediction: quiz(
      'Tokens 10/A,40/B,70/C: ¿quién posee hash 95?',
      ['A', 'B', 'C'],
      0,
      'No hay token ≥95; la búsqueda vuelve al primer token del anillo.',
    ),
    steps: [
      step(
        'Contrato del anillo',
        'Definí tokens únicos y orden de desempate; rechazá ambigüedades.',
        'Dos dueños en el mismo token requieren una política explícita.',
        'Un token repetido produce error en este núcleo.',
      ),
      step(
        'Asignación',
        'Ordená una copia y buscá el sucesor con vuelta al inicio.',
        'El orden de entrada no debe cambiar la propiedad de una clave.',
        'Pasan fronteras exactas, wrap y anillo vacío.',
      ),
      step(
        'Movimiento medido',
        'Compará el destino de miles de hashes antes y después de agregar un nodo.',
        'Un dibujo con pocos puntos no demuestra balance.',
        'Registrás fracción movida y dispersión de carga por nodo.',
      ),
      step(
        'Proyecto distribuido',
        'Usá una implementación mantenida con virtual nodes o ring hash; diseñá transferencia y réplicas.',
        'Asignar un dueño nuevo no mueve los bytes que ya estaban guardados.',
        'Durante una migración de prueba no se pierden lecturas ni escrituras confirmadas.',
      ),
    ],
    related: { rust: ['rust-87', 'rust-34'], go: ['go-88', 'go-18'] },
    bridge: {
      rust: 'Ordenar un Vec clonado conserva el slice prestado; Result informa tokens ambiguos.',
      go: 'Copiar antes de sort.Slice evita modificar la configuración del llamador mientras se calcula una asignación.',
    },
  });
  window.SYSTEMS_INFRA = { workshops, models };
})();
