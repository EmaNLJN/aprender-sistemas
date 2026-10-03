/* Original, deterministic teaching models. These do not access the host machine. */
import { cloneJson } from './src/shared/lib/clone-json';
window.SYSTEMS_LOWLEVEL = (() => {
  'use strict';
  const button = (action, label, value) => ({
    action,
    label,
    ...(value === undefined ? {} : { value: String(value) }),
  });
  const cell = (label, value, tone = 'muted') => ({ label, value: String(value), tone });
  const metric = (label, value) => ({ label, value: String(value) });
  const log = (state, message) => {
    state.log = [...state.log, message].slice(-12);
    return state;
  };
  const base = () => ({ flags: {}, log: [] });
  const achieved = (state) => Object.keys(state.flags).filter((id) => state.flags[id]);
  const reset = button('reset', 'Reiniciar simulación');
  const models = {};

  models.cache = {
    initial: () => ({ ...base(), entries: [], capacity: 3, hits: 0, misses: 0, evictions: 0 }),
    act(state, action, value) {
      if (action === 'reset') return this.initial();
      const s = cloneJson(state);
      if (action !== 'read' || !['A', 'B', 'C', 'D'].includes(value)) return s;
      const index = s.entries.indexOf(value);
      if (index >= 0) {
        s.entries.splice(index, 1);
        s.hits++;
        s.flags.hit = true;
        log(s, `HIT ${value}: ya estaba; pasa al extremo más reciente. No duplicamos la entrada.`);
      } else {
        s.misses++;
        s.flags.miss = true;
        if (s.entries.length === s.capacity) {
          const victim = s.entries.shift();
          s.evictions++;
          s.flags.evict = true;
          log(
            s,
            `MISS ${value}: sale ${victim}, la menos recientemente usada. No necesariamente fue la primera insertada.`,
          );
        } else log(s, `MISS ${value}: hay un lugar libre; cargamos una copia de la fuente.`);
      }
      s.entries.push(value);
      return s;
    },
    view(s) {
      return {
        title: 'Una estantería de tres lugares',
        summary: 'Izquierda: menos reciente. Derecha: más reciente. Leer también cambia el orden.',
        metrics: [
          metric('Hits', s.hits),
          metric('Misses', s.misses),
          metric('Expulsiones', s.evictions),
        ],
        cells: Array.from({ length: 3 }, (_, i) =>
          cell(
            `Lugar ${i + 1}`,
            s.entries[i] || 'Vacío',
            i === s.entries.length - 1 ? 'active' : 'muted',
          ),
        ),
        controls: ['A', 'B', 'C', 'D']
          .map((key) => button('read', `Leer ${key}`, key))
          .concat(reset),
        log: s.log,
        explanation:
          'Probá A → B → C → A → D. El segundo A es hit y protege A; al llegar D sale B. La localidad es una hipótesis sobre próximos accesos, no una garantía.',
      };
    },
    achieved,
  };

  models.heap = {
    initial: () => ({
      ...base(),
      blocks: [{ start: 0, size: 24, owner: null }],
      serial: 0,
      failures: 0,
    }),
    act(state, action, value) {
      if (action === 'reset') return this.initial();
      const s = cloneJson(state);
      if (action === 'allocate' && [4, 6, 8, 12].includes(Number(value))) {
        const size = Number(value),
          index = s.blocks.findIndex((b) => b.owner === null && b.size >= size);
        if (index < 0) {
          const free = s.blocks.filter((b) => b.owner === null).reduce((n, b) => n + b.size, 0);
          s.failures++;
          if (free >= size) s.flags.fragment = true;
          return log(
            s,
            `No entra un bloque de ${size}: hay ${free} unidades libres en total, pero ningún hueco individual suficiente.`,
          );
        }
        const b = s.blocks[index],
          owner = `A${++s.serial}`;
        const pieces = [{ start: b.start, size, owner }];
        if (b.size > size) pieces.push({ start: b.start + size, size: b.size - size, owner: null });
        s.blocks.splice(index, 1, ...pieces);
        s.flags.allocate = true;
        return log(
          s,
          `${owner} ocupa [${b.start}, ${b.start + size}). First-fit eligió el primer hueco que alcanza; el sobrante sigue libre.`,
        );
      }
      if (action === 'free') {
        const b = s.blocks.find((b) => b.owner === value);
        if (!b) return log(s, 'Ese bloque no está asignado; no cambiamos el mapa.');
        b.owner = null;
        return log(
          s,
          `Liberaste ${value}. Los bloques vecinos no se mueven. Usá Coalescer para unir huecos contiguos.`,
        );
      }
      if (action === 'coalesce') {
        const out = [];
        let merged = 0;
        for (const block of s.blocks) {
          const last = out[out.length - 1];
          if (
            last &&
            last.owner === null &&
            block.owner === null &&
            last.start + last.size === block.start
          ) {
            last.size += block.size;
            merged++;
          } else out.push({ ...block });
        }
        s.blocks = out;
        if (merged) s.flags.coalesce = true;
        return log(
          s,
          merged
            ? `Se unieron ${merged} fronteras libres. Coalescer no desplaza objetos: solo combina intervalos vecinos.`
            : 'No hay huecos libres contiguos que unir.',
        );
      }
      return s;
    },
    view(s) {
      const free = s.blocks.filter((b) => b.owner === null);
      return {
        title: 'Heap de 24 unidades',
        summary:
          'Cada intervalo incluye su inicio y excluye su final. Los bloques cubren exactamente 0..24.',
        metrics: [
          metric(
            'Libre total',
            free.reduce((n, b) => n + b.size, 0),
          ),
          metric('Mayor hueco', Math.max(0, ...free.map((b) => b.size))),
          metric('Rechazos', s.failures),
        ],
        cells: s.blocks.map((b) =>
          cell(
            `[${b.start}, ${b.start + b.size})`,
            b.owner || 'Libre',
            b.owner ? 'active' : 'good',
          ),
        ),
        controls: [4, 6, 8, 12]
          .map((n) => button('allocate', `Reservar ${n}`, n))
          .concat(
            s.blocks
              .filter((b) => b.owner)
              .map((b) => button('free', `Liberar ${b.owner}`, b.owner)),
            button('coalesce', 'Coalescer huecos'),
            reset,
          ),
        log: s.log,
        explanation:
          'Para observar fragmentación: reservá cuatro bloques de 6, liberá A2 y A4 e intentá reservar 8. Después liberá A3 y coalescé: tres huecos contiguos se vuelven uno.',
      };
    },
    achieved,
  };

  models.mmu = {
    initial: () => ({
      ...base(),
      pageSize: 4,
      table: [
        { frame: 2, write: false },
        { frame: 0, write: true },
        null,
        { frame: 1, write: true },
      ],
      last: 'Sin acceso',
      faults: 0,
    }),
    act(state, action, value) {
      if (action === 'reset') return this.initial();
      const s = cloneJson(state);
      if (action === 'map') {
        s.table[2] = { frame: 3, write: true };
        return log(
          s,
          'El software agregó VPN 2 → marco 3 con lectura/escritura. Ahora probá VA 9.',
        );
      }
      if (action === 'write-enable') {
        s.table[0].write = true;
        return log(
          s,
          'El sistema cambió el permiso de VPN 0. Este modelo no tiene TLB: el próximo acceso consulta la tabla.',
        );
      }
      if (action !== 'access') return s;
      const [addressText, mode] = String(value).split(':'),
        address = Number(addressText);
      if (!Number.isInteger(address) || address < 0 || address > 15 || !['r', 'w'].includes(mode))
        return s;
      const vpn = Math.floor(address / 4),
        offset = address % 4,
        entry = s.table[vpn];
      if (!entry) {
        s.faults++;
        s.last = 'Fallo: no presente';
        return log(
          s,
          `VA ${address} = VPN ${vpn} + offset ${offset}. No hay mapeo: no inventamos una dirección física.`,
        );
      }
      if (mode === 'w' && !entry.write) {
        s.flags.protection = true;
        s.faults++;
        s.last = 'Fallo de protección';
        return log(
          s,
          `VPN ${vpn} existe pero es de solo lectura. La escritura se rechaza antes de tocar memoria.`,
        );
      }
      const physical = entry.frame * 4 + offset;
      s.last = `VA ${address} → PA ${physical}`;
      s.flags.translate = true;
      if (vpn === 2) s.flags.map = true;
      return log(
        s,
        `${s.last}: marco ${entry.frame} × 4 + offset ${offset}. El offset se conserva; la página cambia de ubicación.`,
      );
    },
    view(s) {
      return {
        title: 'Traductor de direcciones',
        summary:
          'Páginas de cuatro unidades. Todas las entradas presentes permiten lectura; W habilita escritura.',
        metrics: [
          metric('Último acceso', s.last),
          metric('Fallos', s.faults),
          metric('Tamaño de página', 4),
        ],
        cells: s.table.map((x, i) =>
          cell(
            `VPN ${i}`,
            x ? `Marco ${x.frame} · R${x.write ? 'W' : ''}` : 'No presente',
            x ? 'good' : 'bad',
          ),
        ),
        controls: [
          button('access', 'Leer VA 1', '1:r'),
          button('access', 'Escribir VA 1', '1:w'),
          button('access', 'Leer VA 5', '5:r'),
          button('access', 'Leer VA 9', '9:r'),
          button('map', 'Mapear VPN 2 → marco 3'),
          button('write-enable', 'Dar escritura a VPN 0'),
          reset,
        ],
        log: s.log,
        explanation:
          'Probá primero lectura y escritura sobre VA 1. Después VA 9 falla hasta agregar su mapeo. El hardware MMU aplica la traducción; el sistema operativo decide tablas y permisos. Aquí ambos se representan con datos.',
      };
    },
    achieved,
  };

  models.tlb = {
    initial: () => ({
      ...base(),
      tableFrame: 1,
      cachedFrame: null,
      invalidated: false,
      hits: 0,
      misses: 0,
      last: 'Sin acceso',
    }),
    act(state, action) {
      if (action === 'reset') return this.initial();
      const s = cloneJson(state);
      if (action === 'remap') {
        s.tableFrame = 3;
        s.invalidated = false;
        return log(
          s,
          'Tabla cambiada: VPN 0 → marco 3. Dejamos intencionalmente la TLB vieja para observar el fallo de mantenimiento.',
        );
      }
      if (action === 'invalidate') {
        s.cachedFrame = null;
        s.invalidated = true;
        return log(
          s,
          'Invalidamos VPN 0 en esta TLB. El próximo acceso deberá consultar otra vez la tabla.',
        );
      }
      if (action !== 'read') return s;
      if (s.cachedFrame === null) {
        s.misses++;
        s.cachedFrame = s.tableFrame;
        log(s, `TLB MISS: la tabla provee marco ${s.tableFrame}; lo guardamos en la TLB.`);
      } else {
        s.hits++;
        s.flags.hit = true;
        log(s, `TLB HIT: usamos el marco cacheado ${s.cachedFrame} sin volver a caminar la tabla.`);
      }
      s.last = `VA 1 → PA ${s.cachedFrame * 4 + 1}`;
      if (s.cachedFrame !== s.tableFrame) {
        s.flags.stale = true;
        log(
          s,
          'Traducción obsoleta: cambiar la tabla no actualizó esta copia. Es un escenario deliberadamente incorrecto.',
        );
      }
      if (s.invalidated && s.tableFrame === 3 && s.cachedFrame === 3) s.flags.recover = true;
      return log(s, s.last);
    },
    view(s) {
      return {
        title: 'La copia rápida también necesita mantenimiento',
        summary: 'Una dirección fija: VA 1, VPN 0, offset 1. Página de cuatro unidades.',
        metrics: [
          metric('Hits TLB', s.hits),
          metric('Misses TLB', s.misses),
          metric('Resultado', s.last),
        ],
        cells: [
          cell('Tabla del sistema', `0 → ${s.tableFrame}`, 'good'),
          cell(
            'TLB del procesador',
            s.cachedFrame === null ? 'Vacía' : `0 → ${s.cachedFrame}`,
            s.cachedFrame !== null && s.cachedFrame !== s.tableFrame ? 'bad' : 'active',
          ),
        ],
        controls: [
          button('read', 'Leer VA 1'),
          button('remap', 'Cambiar tabla a marco 3'),
          button('invalidate', 'Invalidar VPN 0'),
          reset,
        ],
        log: s.log,
        explanation:
          'Leé dos veces, cambiá la tabla y leé de nuevo. La copia vieja sigue activa en este modelo. Invalidala y repetí. Una máquina real exige la operación de invalidación y el orden de memoria que especifique su arquitectura.',
      };
    },
    achieved,
  };

  models.vm = {
    initial: () => ({
      ...base(),
      bytes: [1, 3, 2, 3, 2, 0],
      pc: 0,
      accumulator: 0,
      budget: 12,
      executed: 0,
      stopped: false,
      error: '',
    }),
    act(state, action) {
      if (action === 'reset') return this.initial();
      const s = cloneJson(state);
      if (action === 'loop') {
        Object.assign(s, {
          bytes: [3, 0],
          pc: 0,
          accumulator: 1,
          budget: 4,
          executed: 0,
          stopped: false,
          error: '',
        });
        return log(
          s,
          'Cargaste JNZ 0 con acumulador 1 y presupuesto 4: el programa no progresa. Las metas observadas se conservan.',
        );
      }
      if (action === 'normal') {
        const fresh = this.initial();
        fresh.flags = s.flags;
        fresh.log = s.log;
        return log(
          fresh,
          'Programa normal cargado. Los registros vuelven al inicio; conservamos las observaciones.',
        );
      }
      if (action !== 'step' || s.stopped || s.error) return s;
      if (s.pc < 0 || s.pc >= s.bytes.length) {
        s.error = 'PC inválido';
        return log(s, s.error);
      }
      if (s.executed >= s.budget) {
        s.error = 'Presupuesto agotado';
        s.flags.bounded = true;
        return log(
          s,
          'El motor detiene un programa que consumiría pasos indefinidamente. Esto limita instrucciones, no milisegundos.',
        );
      }
      const op = s.bytes[s.pc];
      s.executed++;
      if (op === 0) {
        s.stopped = true;
        s.flags.halt = true;
        return log(
          s,
          `HALT en byte ${s.pc}: termina con acumulador ${s.accumulator}. HALT también consume un paso.`,
        );
      }
      if (op === 1) {
        s.accumulator = s.bytes[s.pc + 1];
        s.pc += 2;
        return log(s, `SET ${s.accumulator}: consume opcode y operando; PC avanza dos bytes.`);
      }
      if (op === 2) {
        s.accumulator--;
        s.pc++;
        return log(s, `DEC: acumulador=${s.accumulator}; PC avanza un byte.`);
      }
      if (op === 3) {
        const target = s.bytes[s.pc + 1],
          taken = s.accumulator !== 0;
        s.pc = taken ? target : s.pc + 2;
        if (taken) s.flags.branch = true;
        return log(
          s,
          `JNZ ${target}: ${taken ? 'salto tomado porque el acumulador no es cero' : 'no salta porque el acumulador llegó a cero'}.`,
        );
      }
      s.error = 'Opcode inválido';
      return log(s, s.error);
    },
    view(s) {
      return {
        title: 'Una máquina de seis bytes',
        summary: 'ISA didáctica: 0 HALT · 1,n SET n · 2 DEC · 3,p JNZ p. PC cuenta bytes.',
        metrics: [
          metric('PC', s.pc),
          metric('Acumulador', s.accumulator),
          metric('Pasos', `${s.executed}/${s.budget}`),
          metric('Estado', s.error || (s.stopped ? 'HALT' : 'En pausa')),
        ],
        cells: s.bytes.map((byte, i) => cell(`Byte ${i}`, byte, i === s.pc ? 'active' : 'muted')),
        controls: [
          button('step', 'Ejecutar una instrucción'),
          button('loop', 'Cargar bucle sin progreso'),
          button('normal', 'Cargar programa normal'),
          reset,
        ],
        log: s.log,
        explanation:
          'Seguí PC y acumulador hasta HALT. Luego cargá el bucle: tras cuatro instrucciones, el siguiente intento rechaza por presupuesto. El núcleo de código valida que los saltos apunten a opcodes, no a operandos.',
      };
    },
    achieved,
  };

  models.stack = {
    initial: () => ({
      ...base(),
      frames: [{ name: 'main', returnPC: null, local: 1 }],
      pc: 0,
      calls: 0,
      returns: 0,
    }),
    act(state, action, value) {
      if (action === 'reset') return this.initial();
      const s = cloneJson(state),
        top = s.frames[s.frames.length - 1];
      if (action === 'call' && ['f', 'g'].includes(value)) {
        if (s.frames.length === 4) {
          s.flags.guard = true;
          return log(s, 'Límite de cuatro frames: rechazamos CALL sin sobrescribir un retorno.');
        }
        s.frames.push({ name: value, returnPC: s.pc + 1, local: 0 });
        s.pc = 0;
        s.calls++;
        if (s.frames.length >= 3) s.flags.nested = true;
        return log(
          s,
          `CALL ${value}: guardamos la continuación y creamos un local propio. El local de ${top.name} permanece en su frame.`,
        );
      }
      if (action === 'local') {
        top.local++;
        s.pc++;
        return log(
          s,
          `Solo el local de ${top.name} cambia a ${top.local}. Los otros frames conservan sus datos.`,
        );
      }
      if (action === 'return') {
        if (s.frames.length === 1) {
          s.flags.guard = true;
          return log(s, 'main no tiene llamador. RET se rechaza y el frame raíz queda intacto.');
        }
        const frame = s.frames.pop();
        s.pc = frame.returnPC;
        s.returns++;
        s.flags.return = true;
        return log(
          s,
          `RET ${frame.name}: recuperamos PC=${s.pc}; vuelve a ser visible el local ${s.frames[s.frames.length - 1].local} del llamador.`,
        );
      }
      return s;
    },
    view(s) {
      return {
        title: 'Cada llamada lleva su mochila',
        summary:
          'Los frames se apilan de abajo hacia arriba. El frame superior es el único activo.',
        metrics: [
          metric('Profundidad', `${s.frames.length}/4`),
          metric('PC actual', s.pc),
          metric('Retornos', s.returns),
        ],
        cells: s.frames.map((f, i) =>
          cell(
            `${i}: ${f.name}`,
            `local=${f.local}`,
            i === s.frames.length - 1 ? 'active' : 'muted',
          ),
        ),
        columns: ['Función', 'Retorno guardado', 'Local'],
        rows: s.frames.map((f) => [
          f.name,
          f.returnPC === null ? 'Sin llamador' : String(f.returnPC),
          String(f.local),
        ]),
        controls: [
          button('call', 'CALL f', 'f'),
          button('call', 'CALL g', 'g'),
          button('local', 'Incrementar local'),
          button('return', 'RET'),
          reset,
        ],
        log: s.log,
        explanation:
          'Incrementá main, llamá f y luego g; cambiá un local y volvé. Provocá también un RET en main o una quinta llamada. Este es un modelo de frames; la disposición real depende del ABI y optimizaciones.',
      };
    },
    achieved,
  };

  models.scheduler = {
    initial: () => ({
      ...base(),
      jobs: { A: 3, B: 2, C: 1 },
      ready: ['A', 'B', 'C'],
      blocked: [],
      done: [],
      time: 0,
      running: 'Ninguno',
    }),
    act(state, action) {
      if (action === 'reset') return this.initial();
      const s = cloneJson(state);
      if (action === 'block' && s.ready.length) {
        const id = s.ready.shift();
        s.blocked.push(id);
        return log(
          s,
          `${id} espera I/O: sale de listos. Estar bloqueado no consume trabajo de CPU.`,
        );
      }
      if (action === 'wake' && s.blocked.length) {
        const id = s.blocked.shift();
        s.ready.push(id);
        s.flags.wake = true;
        return log(
          s,
          `Terminó la espera de ${id}; vuelve al final de listos, sin saltarse la fila.`,
        );
      }
      if (action !== 'tick') return s;
      if (!s.ready.length) {
        s.running = 'Idle';
        return log(
          s,
          s.blocked.length
            ? 'CPU idle: quedan tareas, pero todas esperan un evento.'
            : 'No queda trabajo: todas las tareas terminaron.',
        );
      }
      const id = s.ready.shift();
      s.running = id;
      s.time++;
      s.jobs[id]--;
      if (s.jobs[id] === 0) {
        s.done.push(id);
        log(s, `Tick ${s.time}: ${id} agotó su trabajo y termina; no vuelve a la cola.`);
      } else {
        if (s.ready.length) s.flags.rotate = true;
        s.ready.push(id);
        log(
          s,
          `Tick ${s.time}: ${id} usó su quantum de 1 y conserva ${s.jobs[id]} ticks; vuelve al final.`,
        );
      }
      if (s.done.length === 3) s.flags.finish = true;
      return s;
    },
    view(s) {
      return {
        title: 'Un procesador, varias tareas',
        summary:
          'Round-robin con quantum 1. A necesita 3 ticks, B 2 y C 1. No hay ejecución simultánea.',
        metrics: [
          metric('CPU consumida', s.time),
          metric('Última tarea', s.running),
          metric('Terminadas', s.done.length),
        ],
        cells: ['A', 'B', 'C'].map((id) =>
          cell(
            id,
            `${s.jobs[id]} ticks · ${s.done.includes(id) ? 'Terminó' : s.blocked.includes(id) ? 'Bloqueada' : 'Lista'}`,
            s.done.includes(id) ? 'good' : s.blocked.includes(id) ? 'bad' : 'active',
          ),
        ),
        columns: ['Listas: próximo primero', 'Bloqueadas', 'Terminadas'],
        rows: [
          [
            s.ready.join(' → ') || 'Vacía',
            s.blocked.join(', ') || 'Ninguna',
            s.done.join(', ') || 'Ninguna',
          ],
        ],
        controls: [
          button('tick', 'Consumir un quantum'),
          button('block', 'Bloquear próxima por I/O'),
          button('wake', 'Completar una espera I/O'),
          reset,
        ],
        log: s.log,
        explanation:
          'Ejecutá A, bloqueá la próxima tarea y despertala antes de seguir. Compará orden de llegada con orden de finalización. Fairness de turnos no significa que cada tarea termine al mismo tiempo.',
      };
    },
    achieved,
  };

  models.interrupts = {
    initial: () => ({
      ...base(),
      enabled: false,
      pending: false,
      inService: false,
      data: null,
      next: 65,
      received: [],
      overruns: 0,
    }),
    act(state, action) {
      if (action === 'reset') return this.initial();
      const s = cloneJson(state);
      if (action === 'inject') {
        const arriving = s.next;
        s.next = s.next === 90 ? 65 : s.next + 1;
        if (s.pending) {
          s.overruns++;
          return log(
            s,
            `Registro RX lleno: se pierde el byte ${arriving}. Un dispositivo de un solo byte necesita atención o un buffer mayor.`,
          );
        }
        s.data = arriving;
        s.pending = true;
        if (!s.enabled) s.flags.masked = true;
        return log(
          s,
          `El dispositivo puso ${s.data} en RX y activó PENDING. La máscara no impide que se registre el evento.`,
        );
      }
      if (action === 'toggle') {
        s.enabled = !s.enabled;
        return log(
          s,
          `ENABLE=${s.enabled ? 1 : 0}. Cambiar la máscara no borra PENDING ni confirma atención.`,
        );
      }
      if (action === 'dispatch') {
        if (!s.pending || !s.enabled || s.inService)
          return log(
            s,
            'No entramos a la ISR: hace falta evento pendiente, habilitación y ninguna atención activa.',
          );
        s.inService = true;
        return log(
          s,
          `Entrada a ISR: leemos RX=${s.data}. Todavía falta confirmar el evento antes de volver.`,
        );
      }
      if (action === 'ack') {
        if (!s.inService)
          return log(
            s,
            'No hay ISR activa. Este control solo confirma después de atender; no descarta eventos pendientes.',
          );
        s.received.push(s.data);
        s.pending = false;
        s.data = null;
        s.inService = false;
        s.flags.deliver = true;
        if (s.received.length >= 2) s.flags.again = true;
        return log(
          s,
          'ACK: en nuestro registro W1C escribimos 1 para borrar PENDING. La ISR retorna; un evento nuevo puede notificarse de nuevo.',
        );
      }
      return s;
    },
    view(s) {
      return {
        title: 'El timbre y su máscara',
        summary:
          'Periférico ficticio: RX guarda un byte, STATUS.PENDING avisa, ENABLE permite atender. ACK es write-one-to-clear.',
        metrics: [
          metric('Entregados', s.received.join(', ') || 'Ninguno'),
          metric('Entradas perdidas', s.overruns),
          metric('CPU', s.inService ? 'Dentro de ISR' : 'Programa principal'),
        ],
        cells: [
          cell('MMIO RX', s.data === null ? 'Vacío' : s.data, 'active'),
          cell('PENDING', Number(s.pending), s.pending ? 'bad' : 'good'),
          cell('ENABLE', Number(s.enabled), s.enabled ? 'good' : 'muted'),
        ],
        controls: [
          button('inject', 'Llega un byte'),
          button('toggle', s.enabled ? 'Enmascarar IRQ' : 'Habilitar IRQ'),
          button('dispatch', 'Intentar entrar a ISR'),
          button('ack', 'ACK y retornar'),
          reset,
        ],
        log: s.log,
        explanation:
          'Generá un evento con IRQ enmascarada; queda pendiente. Habilitá, entrá a ISR y confirmá. Repetí para recibir otro byte. Los registros y la forma de ACK cambian entre dispositivos: el manual manda.',
      };
    },
    achieved,
  };

  const workshops = [];
  const source = (title, url) => ({ title, url });
  const objective = (id, label, why) => ({ id, label, why });
  const step = (title, task, why, done) => ({ title, task, why, done });
  const quiz = (question, options, answer, explanation) => ({
    question,
    options,
    answer,
    explanation,
  });
  const add = (data) =>
    workshops.push({
      category: 'machine',
      minutes: 45,
      ...data,
      model: data.id,
      code: { rust: `rust-${113 + workshops.length}`, go: `go-${113 + workshops.length}` },
    });

  add({
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
      objective('miss', 'Provocá una carga por miss', 'Una caché vacía debe consultar su fuente.'),
      objective('hit', 'Reutilizá una clave con hit', 'Leer actualiza la recencia.'),
      objective(
        'evict',
        'Llená y expulsá la menos reciente',
        'Capacidad y política deciden qué conservar.',
      ),
    ],
    prediction: quiz(
      'Con orden LRU→MRU [A,B,C], leés A y luego D. ¿Qué sale?',
      ['A', 'B', 'C'],
      1,
      'Leer A produce [B,C,A]; D expulsa B.',
    ),
    steps: [
      step(
        'Definí el contrato',
        'Elegí capacidad, representación y comportamiento con capacidad cero.',
        'Un caso borde ambiguo se propaga a todas las operaciones.',
        'Tenés ejemplos de vacío, hit y miss.',
      ),
      step(
        'Implementá el núcleo',
        'Resolvés el ejercicio enlazado y comparás el orden después de cada lectura.',
        'Una traza permite detectar errores de recencia.',
        'Pasan las pruebas y una traza propia.',
      ),
      step(
        'Agregá una fuente de datos',
        'Creá get(key) que consulte una fuente contada en los misses y almacene su resultado.',
        'La caché debe ahorrar trabajo sin cambiar el valor devuelto.',
        'Una clave repetida devuelve igual dato con menos consultas.',
      ),
      step(
        'Evaluá otra carga',
        'Compará una secuencia repetida con un barrido mayor a la capacidad; registrá hits y misses.',
        'El rendimiento depende de la carga, no del nombre del algoritmo.',
        'Tu informe incluye la traza y ambas tasas, sin tiempos inventados.',
      ),
    ],
    sources: [
      source(
        'OSTEP · Replacement policies',
        'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf',
      ),
      source('std · Vec', 'https://doc.rust-lang.org/std/vec/struct.Vec.html'),
    ],
    related: { rust: ['rust-31', 'rust-35'], go: ['go-31', 'go-35'] },
    bridge: {
      rust: 'Llevá el simulador a Cargo y separá almacenamiento de política mediante un trait. Después evaluá un índice HashMap si necesitás operaciones O(1).',
      go: 'Llevá el simulador a un módulo Go y una interfaz para la fuente. Si varias goroutines comparten la caché, definí sincronización antes de medir.',
    },
  });

  add({
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
      objective(
        'allocate',
        'Dividí un hueco reservando memoria',
        'El sobrante mantiene su dirección y tamaño.',
      ),
      objective(
        'fragment',
        'Fallá aunque el total libre alcance',
        'Hace falta un intervalo contiguo suficiente.',
      ),
      objective(
        'coalesce',
        'Uní huecos contiguos',
        'Coalescer reorganiza metadatos sin mover objetos.',
      ),
    ],
    prediction: quiz(
      'Hay huecos de 6 y 6 separados por un bloque vivo. ¿Entra una reserva contigua de 8?',
      ['Sí: hay 12 libres', 'No: ningún hueco tiene 8', 'Sí, si se cambia el nombre del bloque'],
      1,
      'La suma no vuelve contiguos los intervalos.',
    ),
    steps: [
      step(
        'Representá intervalos',
        'Usá rangos [inicio,fin) ordenados sin solapamientos.',
        'Un invariante geométrico permite revisar todas las operaciones.',
        'Cada unidad está libre o asignada exactamente una vez.',
      ),
      step(
        'Encontrá first-fit alineado',
        'Implementá el núcleo y explicitá padding, tamaño y overflow.',
        'La primera dirección libre puede no cumplir la alineación.',
        'Pasan casos con padding y falta de espacio.',
      ),
      step(
        'Reservá y liberá',
        'Agregá IDs de asignación, split y rechazo de liberaciones desconocidas.',
        'El dueño de cada rango evita liberar dos veces.',
        'Una secuencia alloc/free conserva la capacidad total.',
      ),
      step(
        'Coalescé y mostrálos',
        'Uní vecinos libres y exportá una traza de bloques en tu CLI.',
        'Un modelo visible permite explicar fragmentación sin punteros peligrosos.',
        'Reproducís un fallo por fragmentación y su recuperación.',
      ),
    ],
    sources: [
      source(
        'OSTEP · Free-space management',
        'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf',
      ),
      source(
        'Writing an OS in Rust · Allocator designs',
        'https://os.phil-opp.com/allocator-designs/',
      ),
    ],
    related: { rust: ['rust-51', 'rust-71'], go: ['go-16', 'go-75'] },
    bridge: {
      rust: 'Empezá como simulador seguro en Cargo. Un GlobalAlloc real exige contratos de alineación, concurrencia y unsafe; el tutorial externo es otra etapa, no algo que se ejecute aquí.',
      go: 'Implementá un pool de índices sobre un buffer y medí su utilidad. Go administra objetos con su runtime y GC: este allocator de juguete no reemplaza al GC.',
    },
  });

  add({
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
      objective('translate', 'Traducí una lectura permitida', 'El offset debe preservarse.'),
      objective(
        'protection',
        'Provocá una escritura prohibida',
        'Presencia y permiso son condiciones distintas.',
      ),
      objective(
        'map',
        'Mapeá una página y accedé',
        'La política de mapeo habilita una traducción nueva.',
      ),
    ],
    prediction: quiz(
      'Página de tamaño 4: VA 9 usa VPN 2, mapeada al marco 3. ¿Cuál es PA?',
      ['9', '12', '13'],
      2,
      'Offset=1; PA=3×4+1.',
    ),
    steps: [
      step(
        'Especificá tu formato',
        'Elegí tamaño de página y entradas con marco/presente/escritura.',
        'Los formatos reales varían por arquitectura.',
        'Podés descomponer tres direcciones a mano.',
      ),
      step(
        'Implementá traducción',
        'Completá el núcleo con errores de rango, ausencia, permisos y overflow.',
        'No debe surgir una dirección física tras una validación fallida.',
        'Pasaron traducciones y rechazos.',
      ),
      step(
        'Agregá espacios de proceso',
        'Dos procesos tienen tablas distintas sobre una memoria física simulada.',
        'Aislamiento significa que igual VA puede referir a distinto PA.',
        'Probás dos procesos con VA iguales y datos separados.',
      ),
      step(
        'Conectá con un kernel educativo',
        'Leé el manejo de tablas en xv6 o el tutorial Rust y trazá una entrada real.',
        'El simulador prepara vocabulario; el kernel agrega formato y privilegios.',
        'Documentaste qué simplificaciones ya no valen fuera del modelo.',
      ),
    ],
    sources: [
      source('OSTEP · Paging', 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf'),
      source('xv6 RISC-V · Repository', 'https://github.com/mit-pdos/xv6-riscv'),
    ],
    related: { rust: ['rust-26', 'rust-69'], go: ['go-26', 'go-28'] },
    bridge: {
      rust: 'Una función pura de traducción se prueba con std. Activar paginación requiere un proyecto de kernel, tablas alineadas e instrucciones de arquitectura fuera del Playground.',
      go: 'Go sirve para implementar el simulador y herramientas de inspección. Un programa Go estándar sobre su runtime/OS no puede reemplazar la MMU del proceso.',
    },
  });

  add({
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
      objective('hit', 'Obtené un hit de traducción', 'Evita volver a consultar la tabla.'),
      objective(
        'stale',
        'Observá una copia obsoleta',
        'La tabla y la TLB pueden discrepar si se omite mantenimiento.',
      ),
      objective(
        'recover',
        'Invalidá y cargá el marco nuevo',
        'El miss posterior consulta la fuente actualizada.',
      ),
    ],
    prediction: quiz(
      'Cambiaste la tabla de marco 1 a 3, pero conservaste una TLB con marco 1. En este modelo, ¿qué usa el siguiente hit?',
      ['Marco 1', 'Marco 3 automáticamente', 'El promedio de ambos'],
      0,
      'Un hit usa la copia cacheada: esa es precisamente la inconsistencia que hay que resolver.',
    ),
    steps: [
      step(
        'Dibujá fuente y copia',
        'Añadí una TLB al traductor con métricas de hit/miss.',
        'Cachear una traducción no cambia el contrato de permisos.',
        'Podés señalar qué lectura consulta cada estructura.',
      ),
      step(
        'Invalidá selectivamente',
        'Implementá el núcleo por ASID y VPN; probá coincidencias parciales.',
        'Invalidar demasiado o demasiado poco tiene consecuencias distintas.',
        'Una entrada de otro espacio permanece intacta.',
      ),
      step(
        'Reproducí el fallo',
        'Cambiá tabla sin invalidar, observá la copia vieja y aplicá el protocolo correcto.',
        'Un test negativo muestra por qué existe la operación.',
        'Tenés trazas antes y después de invalidar.',
      ),
      step(
        'Extendé a dos núcleos',
        'Modelá dos TLB y un mensaje de invalidación con confirmación, sin hilos reales al principio.',
        'La copia de un núcleo no representa las copias de todos.',
        'La prueba no reutiliza el marco hasta ambas confirmaciones.',
      ),
    ],
    sources: [
      source('OSTEP · TLBs', 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf'),
      source('Writing an OS in Rust · Paging', 'https://os.phil-opp.com/paging-implementation/'),
    ],
    related: { rust: ['rust-34', 'rust-67'], go: ['go-31', 'go-74'] },
    bridge: {
      rust: 'Mantené el protocolo como máquina de estados comprobable. En un kernel real consultá la especificación de la arquitectura y su operación de invalidación; no alcanza con borrar un Vec.',
      go: 'Usá el modelo para entender coherencia y mensajes de confirmación. Go estándar ejecuta sobre un runtime/OS y no emite invalidaciones de TLB desde estas funciones.',
    },
  });

  add({
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
      objective('branch', 'Tomá un salto condicional', 'PC deja de avanzar secuencialmente.'),
      objective('halt', 'Terminá el programa normal', 'HALT es una instrucción explícita.'),
      objective(
        'bounded',
        'Frená el bucle por presupuesto',
        'Un límite permite observar un programa que no progresa.',
      ),
    ],
    prediction: quiz(
      'Una instrucción ocupa opcode y operando. ¿Todo índice dentro del bytecode es un destino de salto válido?',
      [
        'Sí, mientras esté en rango',
        'No: debe ser inicio de instrucción',
        'Solo si el byte es par',
      ],
      1,
      'La estructura del programa importa además del rango.',
    ),
    steps: [
      step(
        'Escribí la ISA',
        'Definí formato, tamaño, efecto y errores de HALT, SET, DEC y JNZ.',
        'Sin semántica precisa no hay intérprete comprobable.',
        'Cada opcode tiene una fila en tu especificación.',
      ),
      step(
        'Validá el bytecode',
        'Implementá el núcleo que descubre inicios y verifica saltos.',
        'Los operandos no se pueden ejecutar como instrucciones por accidente.',
        'Rechazás opcode desconocido, truncado y salto a operando.',
      ),
      step(
        'Interpretá con traza',
        'Agregá registros, loop de ejecución y presupuesto; imprimí estado antes de cada paso.',
        'Una traza explica el resultado y los bucles.',
        'El programa normal termina y el bucle agota pasos.',
      ),
      step(
        'Agregá etiquetas',
        'Creá un ensamblador mínimo que resuelva nombres a offsets y un desensamblador.',
        'Las etiquetas reducen errores manuales de direcciones.',
        'Un programa con etiquetas compila al bytecode esperado.',
      ),
    ],
    sources: [
      source('Nand2Tetris · VM project', 'https://www.nand2tetris.org/project08'),
      source('Rust Book · Enums and match', 'https://doc.rust-lang.org/book/ch06-02-match.html'),
    ],
    related: { rust: ['rust-110', 'rust-112'], go: ['go-95', 'go-100'] },
    bridge: {
      rust: 'Creá un crate con parser, validador e intérprete separados. Un enum puede representar instrucciones ya verificadas, reduciendo estados inválidos durante ejecución.',
      go: 'Creá un módulo con paquetes pequeños para ensamblar y ejecutar; usá tests de tablas y fuzzing del decodificador antes de agregar instrucciones complejas.',
    },
  });

  add({
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
      objective('nested', 'Anidá dos llamadas', 'Cada invocación crea un frame distinto.'),
      objective(
        'return',
        'Retorná a una continuación guardada',
        'El llamador recupera su contexto.',
      ),
      objective(
        'guard',
        'Rechazá un límite de pila',
        'Overflow y underflow no deben destruir frames.',
      ),
    ],
    prediction: quiz(
      'main tiene local=2, f crea local=0 y lo cambia a 1. Al retornar, ¿cuánto vale el local de main?',
      ['1', '2', '0'],
      1,
      'Son locales de invocaciones diferentes.',
    ),
    steps: [
      step(
        'Definí el frame',
        'Elegí campos para retorno y locales; reservá un frame raíz.',
        'Separar contexto evita sobrescribir al llamador.',
        'Podés dibujar main→f→g.',
      ),
      step(
        'Implementá CALL/RET',
        'Completá el núcleo con límite de profundidad y rechazo sin cambios.',
        'Los errores de estructura deben conservar la pila.',
        'Probás llamada, retorno y ambos límites.',
      ),
      step(
        'Integrá con una VM',
        'Añadí CALL y RET al proyecto bytecode, validando destinos de función.',
        'Los frames conectan control de flujo y estado local.',
        'Una función llama a otra y ambas vuelven correctamente.',
      ),
      step(
        'Construí un backtrace',
        'Mostrá nombres, PC y locales desde el frame activo hasta main.',
        'Depurar es reconstruir el camino de ejecución.',
        'Ante un error obtenés una traza que explica la cadena de llamadas.',
      ),
    ],
    sources: [
      source('Nand2Tetris · Function calls', 'https://www.nand2tetris.org/project08'),
      source(
        'Rust Book · Ownership and stack/heap',
        'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html',
      ),
    ],
    related: { rust: ['rust-07', 'rust-21'], go: ['go-07', 'go-21'] },
    bridge: {
      rust: 'Los frames del intérprete pueden vivir en un Vec aunque representen una pila. No confundas la estructura de datos con dónde almacena físicamente cada objeto el programa anfitrión.',
      go: 'Una slice de frames modela la pila de tu VM. Las pilas reales de goroutines las administra el runtime y pueden crecer: no asumas el layout del modelo.',
    },
  });

  add({
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
      objective(
        'rotate',
        'Devolvé una tarea pendiente al final',
        'Un quantum no implica finalización.',
      ),
      objective('wake', 'Bloqueá y despertá una tarea', 'Un evento la hace lista otra vez.'),
      objective('finish', 'Terminá las tres tareas', 'Una tarea sin trabajo no debe reencolarse.'),
    ],
    prediction: quiz(
      'Después de consumir su quantum, A todavía tiene trabajo y B espera lista. ¿Dónde va A?',
      ['Al final de la cola de listos', 'A terminadas', 'De nuevo al frente siempre'],
      0,
      'Round-robin permite que otra tarea lista reciba el próximo turno.',
    ),
    steps: [
      step(
        'Modelá los estados',
        'Diferenciá lista, bloqueada, ejecutando y terminada.',
        'Estados explícitos evitan ejecutar tareas que esperan un evento.',
        'Cada tarea ocupa un único estado.',
      ),
      step(
        'Implementá round-robin',
        'Completá el núcleo con quantum positivo y tareas de trabajo cero.',
        'Un quantum cero impediría progresar.',
        'Tenés una traza manual y una verificada.',
      ),
      step(
        'Agregá eventos de I/O',
        'Permití bloquear y despertar con un orden determinista de eventos.',
        'Los tiempos de espera cambian la cola disponible.',
        'Una tarea bloqueada no consume CPU antes de despertar.',
      ),
      step(
        'Medí respuesta',
        'Registrá primer turno y finalización para varias duraciones de quantum.',
        'La elección del quantum tiene compromisos observables.',
        'Comparás métricas y declarás que omitiste costos de contexto.',
      ),
    ],
    sources: [
      source('OSTEP · CPU scheduling', 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf'),
      source('xv6 RISC-V · Teaching kernel', 'https://pdos.csail.mit.edu/6.828/2025/xv6.html'),
    ],
    related: { rust: ['rust-35', 'rust-46'], go: ['go-41', 'go-45'] },
    bridge: {
      rust: 'Llevá el simulador a Cargo y después leé swtch/scheduler en xv6 para identificar lo que falta: contexto de CPU, traps, locks y privilegios.',
      go: 'Usá una función pura para la política y goroutines solo cuando estudies su interacción con el runtime. Crear goroutines no equivale a escribir el scheduler del kernel.',
    },
  });

  add({
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
      objective(
        'masked',
        'Dejá pendiente un evento enmascarado',
        'La máscara controla entrega, no borra el evento.',
      ),
      objective(
        'deliver',
        'Atendé y confirmá una IRQ',
        'ACK completa el protocolo del dispositivo.',
      ),
      objective(
        'again',
        'Recibí un segundo evento',
        'La atención anterior no debe bloquear para siempre las siguientes.',
      ),
    ],
    prediction: quiz(
      'ENABLE=0 y el periférico activa PENDING. ¿Qué sucede en este modelo?',
      [
        'Se borra el evento',
        'Queda pendiente sin entrar a ISR',
        'La CPU entra a ISR de todos modos',
      ],
      1,
      'La máscara impide la entrega; no borra el registro pendiente.',
    ),
    steps: [
      step(
        'Especificá registros',
        'Definí RX, PENDING, ENABLE y qué escrituras confirman el evento.',
        'No podés adivinar efectos de MMIO por el nombre del registro.',
        'Tenés una tabla de lectura/escritura y efectos.',
      ),
      step(
        'Elegí una IRQ',
        'Implementá el núcleo que elige el menor bit pendiente y habilitado, y solo limpia ese bit.',
        'Atender un evento no debe perder los otros.',
        'Probás múltiples pendientes y una máscara vacía.',
      ),
      step(
        'Separá ISR de trabajo',
        'La ISR encola un dato; un consumidor lo procesa fuera de la atención.',
        'Una ISR larga retrasa otras tareas e interrupciones.',
        'Definiste capacidad y política de overflow del buffer.',
      ),
      step(
        'Elegí un proyecto externo',
        'Seguí un target concreto en un emulador o placa con su manual y toolchain.',
        'Arranque, memoria, volatile, barreras y sincronización dependen del entorno.',
        'Podés explicar qué parte probaste en modelo y cuál en hardware/emulador.',
      ),
    ],
    sources: [
      source('Writing an OS in Rust · Interrupts', 'https://os.phil-opp.com/hardware-interrupts/'),
      source('Rust · Volatile writes', 'https://doc.rust-lang.org/std/ptr/fn.write_volatile.html'),
      source(
        'TinyGo · Supported language features',
        'https://tinygo.org/docs/reference/lang-support/',
      ),
      source('Go FAQ · Runtime', 'https://go.dev/doc/faq#runtime'),
      source('Writing an OS in Rust · Repository', 'https://github.com/phil-opp/blog_os'),
    ],
    related: { rust: ['rust-67', 'rust-72'], go: ['go-71', 'go-75'] },
    bridge: {
      rust: 'El modelo usa enteros seguros. Un driver real encapsula acceso volatile y contratos unsafe; volatile por sí solo no brinda atomicidad ni sincronización entre hilos.',
      go: 'Para simulación usá Go estándar. Para una placa, verificá primero soporte concreto de TinyGo y sus paquetes machine; no asumas que todo programa o dependencia de Go funciona allí.',
    },
  });

  return { workshops, models };
})();
