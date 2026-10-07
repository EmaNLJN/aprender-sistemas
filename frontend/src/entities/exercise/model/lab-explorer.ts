export interface LabExplorerState {
  value: number;
  copy: number;
  capacity: number;
  queue: number[];
  sender: boolean;
  receiver: boolean;
  delivered: number;
  notice: string;
  type: string;
  constraint: string;
}

export interface GenericContract {
  valid: boolean;
  constraintName: string;
}

export const FIRST_STEP_NOTICE = 'Elegí qué participante da el primer paso.';

export function initialLabExplorerState(): LabExplorerState {
  return {
    value: 10,
    copy: 10,
    capacity: 0,
    queue: [],
    sender: false,
    receiver: false,
    delivered: 0,
    notice: FIRST_STEP_NOTICE,
    type: 'int',
    constraint: 'ordered',
  };
}

function send(model: LabExplorerState): void {
  if (model.receiver) {
    model.receiver = false;
    model.delivered++;
    model.notice = 'El consumidor ya esperaba. El mensaje se entregó y ambos pueden continuar.';
  } else if (model.queue.length < model.capacity) {
    model.queue.push(1);
    model.notice =
      'El mensaje quedó en el buffer. El productor puede continuar antes de que el consumidor lo lea.';
  } else {
    model.sender = true;
    model.notice = model.capacity
      ? 'El buffer está lleno. Este envío espera a que una recepción libere espacio.'
      : 'El productor espera: sin buffer no puede completar el envío hasta que aparezca una recepción.';
  }
}

function receive(model: LabExplorerState): void {
  if (model.queue.length) {
    model.queue.shift();
    model.delivered++;
    if (model.sender) {
      model.queue.push(1);
      model.sender = false;
      model.notice = 'La recepción liberó un lugar y permitió completar el envío que esperaba.';
    } else model.notice = 'El consumidor retiró un mensaje del buffer.';
  } else if (model.sender) {
    model.sender = false;
    model.delivered++;
    model.notice =
      'La recepción se encontró con el envío pendiente. Los dos participantes pueden continuar.';
  } else {
    model.receiver = true;
    model.notice =
      'No hay mensajes: el consumidor espera un envío. Otra tarea tiene que producirlo.';
  }
}

export function applyLabExplorerOperation(
  state: LabExplorerState,
  operation: string,
): LabExplorerState {
  let model: LabExplorerState = { ...state, queue: [...state.queue] };
  if (operation === 'reset') model = initialLabExplorerState();
  if (operation === 'pointer-copy') {
    model.copy++;
    model.notice =
      'Cambió la celda B. El original conserva su valor porque copiar un entero crea otro valor independiente.';
  }
  if (operation === 'pointer-ref') {
    model.value++;
    model.notice =
      'Cambió la celda A: la referencia o el puntero lleva al original. La copia de la celda B sigue igual.';
  }
  if (operation.startsWith('capacity-')) {
    model = initialLabExplorerState();
    model.capacity = Number(operation.slice(-1));
    model.notice = model.capacity
      ? 'Hay dos lugares para mensajes pendientes. Probá tres envíos seguidos.'
      : 'Sin buffer, el envío y la recepción necesitan encontrarse. Probá iniciar uno antes que el otro.';
  }
  if (operation === 'send') send(model);
  if (operation === 'receive') receive(model);
  return model;
}

export function chooseLabExplorerOption(
  state: LabExplorerState,
  field: 'constraint' | 'type',
  value: string,
): LabExplorerState {
  return { ...state, queue: [...state.queue], [field]: value };
}

export function genericContract(
  constraint: string,
  type: string,
  language: string,
): GenericContract {
  const rust = language === 'rust';
  const valid =
    constraint === 'ordered'
      ? type !== 'record'
      : constraint === 'comparable'
        ? !rust || type !== 'record'
        : type !== 'record';
  const constraintName =
    constraint === 'ordered'
      ? rust
        ? 'Ord'
        : '~int | ~string'
      : constraint === 'comparable'
        ? rust
          ? 'Eq'
          : 'comparable'
        : rust
          ? 'Display'
          : '~int | ~string';
  return { valid, constraintName };
}
