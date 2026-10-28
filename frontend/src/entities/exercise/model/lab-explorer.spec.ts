import { describe, expect, it } from 'vitest';
import {
  FIRST_STEP_NOTICE,
  applyLabExplorerOperation,
  chooseLabExplorerOption,
  genericContract,
  initialLabExplorerState,
  type LabExplorerState,
} from './lab-explorer';

function run(operations: string[], from = initialLabExplorerState()): LabExplorerState {
  return operations.reduce(applyLabExplorerOperation, from);
}

describe('the initial lab explorer state', () => {
  it('starts with both values at 10, no buffer and nobody waiting', () => {
    expect(initialLabExplorerState()).toEqual({
      value: 10,
      copy: 10,
      capacity: 0,
      queue: [],
      sender: false,
      receiver: false,
      delivered: 0,
      notice: 'Elegí qué participante da el primer paso.',
      type: 'int',
      constraint: 'ordered',
    });
    expect(FIRST_STEP_NOTICE).toBe('Elegí qué participante da el primer paso.');
  });
});

describe('an unbuffered channel', () => {
  it('leaves the producer waiting after a send', () => {
    const state = run(['send']);
    expect(state.sender).toBe(true);
    expect(state.notice).toBe(
      'El productor espera: sin buffer no puede completar el envío hasta que aparezca una recepción.',
    );
  });

  it('releases the producer and delivers one message on the next receive', () => {
    const state = run(['send', 'receive']);
    expect(state.sender).toBe(false);
    expect(state.delivered).toBe(1);
    expect(state.notice).toBe(
      'La recepción se encontró con el envío pendiente. Los dos participantes pueden continuar.',
    );
  });

  it('leaves the consumer waiting after a receive with no messages, and the next send delivers', () => {
    const waiting = run(['receive']);
    expect(waiting.receiver).toBe(true);
    expect(waiting.notice).toBe(
      'No hay mensajes: el consumidor espera un envío. Otra tarea tiene que producirlo.',
    );
    const delivered = applyLabExplorerOperation(waiting, 'send');
    expect(delivered.receiver).toBe(false);
    expect(delivered.delivered).toBe(1);
    expect(delivered.notice).toBe(
      'El consumidor ya esperaba. El mensaje se entregó y ambos pueden continuar.',
    );
  });
});

describe('a channel with a buffer of 2', () => {
  it('announces the two free places', () => {
    const state = run(['capacity-2']);
    expect(state.capacity).toBe(2);
    expect(state.notice).toBe(
      'Hay dos lugares para mensajes pendientes. Probá tres envíos seguidos.',
    );
  });

  it('fills the queue with two sends and makes the third wait', () => {
    const full = run(['capacity-2', 'send', 'send']);
    expect(full.queue).toEqual([1, 1]);
    expect(full.sender).toBe(false);
    expect(full.notice).toBe(
      'El mensaje quedó en el buffer. El productor puede continuar antes de que el consumidor lo lea.',
    );
    const waiting = applyLabExplorerOperation(full, 'send');
    expect(waiting.sender).toBe(true);
    expect(waiting.notice).toBe(
      'El buffer está lleno. Este envío espera a que una recepción libere espacio.',
    );
  });

  it('delivers one message on a receive, keeps the queue at 2 and frees the producer', () => {
    const state = run(['capacity-2', 'send', 'send', 'send', 'receive']);
    expect(state.delivered).toBe(1);
    expect(state.queue).toEqual([1, 1]);
    expect(state.sender).toBe(false);
    expect(state.notice).toBe(
      'La recepción liberó un lugar y permitió completar el envío que esperaba.',
    );
  });

  it('takes a message out of the buffer when nobody is waiting', () => {
    const state = run(['capacity-2', 'send', 'receive']);
    expect(state.queue).toEqual([]);
    expect(state.delivered).toBe(1);
    expect(state.notice).toBe('El consumidor retiró un mensaje del buffer.');
  });
});

describe('the pointer explorer', () => {
  it('copying raises the copy to 11 and leaves the original', () => {
    const state = run(['pointer-copy']);
    expect(state.copy).toBe(11);
    expect(state.value).toBe(10);
    expect(state.notice).toBe(
      'Cambió la celda B. El original conserva su valor porque copiar un entero crea otro valor independiente.',
    );
  });

  it('going through the reference raises the original to 11 and leaves the copy', () => {
    const state = run(['pointer-ref']);
    expect(state.value).toBe(11);
    expect(state.copy).toBe(10);
    expect(state.notice).toBe(
      'Cambió la celda A: la referencia o el puntero lleva al original. La copia de la celda B sigue igual.',
    );
  });
});

describe('reset and capacity operations', () => {
  it('reset returns to the initial state', () => {
    expect(run(['capacity-2', 'send', 'pointer-ref', 'reset'])).toEqual(initialLabExplorerState());
  });

  it('capacity-0 starts over with the unbuffered notice', () => {
    const state = run(['capacity-2', 'send', 'pointer-copy', 'capacity-0']);
    expect(state).toEqual({
      ...initialLabExplorerState(),
      notice:
        'Sin buffer, el envío y la recepción necesitan encontrarse. Probá iniciar uno antes que el otro.',
    });
  });

  it('capacity-2 starts over with the capacity', () => {
    const state = run(['send', 'pointer-copy', 'capacity-2']);
    expect(state.capacity).toBe(2);
    expect(state.copy).toBe(10);
    expect(state.sender).toBe(false);
    expect(state.queue).toEqual([]);
  });

  it('ignores an unknown operation', () => {
    expect(run(['nope'])).toEqual(initialLabExplorerState());
  });
});

describe('choosing a generic option', () => {
  it('changes only the chosen field', () => {
    const start = run(['pointer-copy']);
    expect(chooseLabExplorerOption(start, 'type', 'record')).toEqual({ ...start, type: 'record' });
    expect(chooseLabExplorerOption(start, 'constraint', 'display')).toEqual({
      ...start,
      constraint: 'display',
    });
  });
});

describe('purity', () => {
  it('no function mutates the state it receives', () => {
    const start = run(['capacity-2', 'send', 'send']);
    const snapshot = structuredClone(start);
    for (const operation of [
      'send',
      'receive',
      'pointer-copy',
      'pointer-ref',
      'reset',
      'capacity-0',
    ]) {
      applyLabExplorerOperation(start, operation);
    }
    chooseLabExplorerOption(start, 'type', 'string');
    expect(start).toEqual(snapshot);
  });

  it('returns a new state each time', () => {
    const start = initialLabExplorerState();
    expect(applyLabExplorerOperation(start, 'nope')).not.toBe(start);
    expect(initialLabExplorerState().queue).not.toBe(initialLabExplorerState().queue);
  });
});

describe('the generic contract table', () => {
  it.each([
    ['ordered', 'record', 'rust', false, 'Ord'],
    ['comparable', 'record', 'rust', false, 'Eq'],
    ['display', 'string', 'rust', true, 'Display'],
    ['comparable', 'record', 'go', true, 'comparable'],
    ['ordered', 'record', 'go', false, '~int | ~string'],
    ['display', 'int', 'go', true, '~int | ~string'],
  ])('%s with %s in %s', (constraint, type, language, valid, constraintName) => {
    expect(genericContract(constraint, type, language)).toEqual({ valid, constraintName });
  });
});
