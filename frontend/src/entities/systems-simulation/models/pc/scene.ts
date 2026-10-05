import type { Scene, SceneShape } from '../../model/types';
import { PC_PALETTE } from './palette';
import { PHASE_LABELS } from './phase-labels';
import type { PcState } from './types';

const { ink, green, muted, gold } = PC_PALETTE;

// Accumulates shapes in the order they are drawn: that order is the scene contract.
function createSketch() {
  const shapes: SceneShape[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, color: string = muted) =>
    shapes.push({ type: 'line', x1, y1, x2, y2, stroke: color, strokeWidth: 2 });
  const text = (x: number, y: number, value: string, color: string = ink) =>
    shapes.push({ type: 'text', x, y, text: value, fill: color, fontSize: 12 });
  const box = (
    x: number,
    y: number,
    width: number,
    name: string,
    detail: string,
    active: boolean,
  ) => {
    shapes.push({
      type: 'rect',
      x,
      y,
      width,
      height: 64,
      fill: active ? PC_PALETTE.boxActive : PC_PALETTE.boxIdle,
      stroke: active ? green : muted,
      strokeWidth: 2,
    });
    text(x + 10, y + 23, name, active ? green : ink);
    text(x + 10, y + 45, detail);
  };
  const arrow = (x1: number, y1: number, x2: number, y2: number) => {
    line(x1, y1, x2, y2);
    if (y1 === y2)
      shapes.push({
        type: 'polygon',
        points: [
          [x2, y2],
          [x2 - 6, y2 - 4],
          [x2 - 6, y2 + 4],
        ],
        fill: muted,
      });
  };
  return { shapes, line, text, box, arrow };
}

export function architectureScene(s: PcState): Scene {
  const { shapes, line, text, box, arrow } = createSketch();
  arrow(110, 62, 135, 62);
  arrow(235, 62, 280, 62);
  arrow(405, 62, 445, 62);
  box(10, 30, 100, 'CPU', `PC ${s.pc} · A ${s.acc}`, s.phase === 'fetch');
  box(135, 30, 100, 'TLB', 'traducción', s.phase === 'tlb');
  box(280, 30, 125, 'Permisos', 'LOAD / STORE', s.phase === 'permission');
  box(
    445,
    30,
    105,
    'RAM',
    s.physical === null ? '12 celdas' : `PA ${s.physical}`,
    s.phase === 'memory',
  );
  line(185, 94, 185, 145);
  line(245, 145, 300, 94);
  text(145, 126, 'MISS → PTE', green);
  line(355, 94, 355, 145, s.mode === 'kernel' ? gold : muted);
  box(140, 145, 115, 'Tabla PTE', 'marco + R/W', s.phase === 'walk');
  box(
    280,
    145,
    175,
    'Kernel educativo',
    s.trap ? `causa: ${s.trap.cause}` : 'map / ACK / retorno',
    s.mode === 'kernel',
  );
  box(10, 145, 115, 'Timer', s.irqPending ? 'pendiente' : 'sin IRQ', s.irqPending);
  line(65, 209, 65, 223);
  line(65, 223, 365, 223);
  line(365, 223, 365, 209);
  arrow(255, 177, 280, 177);
  text(18, 243, 'HIT omite la PTE; los permisos se comprueban siempre antes de RAM.', green);
  text(18, 263, 'Fault: síncrono. IRQ: externa. Las líneas son relaciones lógicas, no buses.', ink);
  return {
    width: 565,
    height: 278,
    background: PC_PALETTE.background,
    alt: `Arquitectura de la PC: ${PHASE_LABELS[s.phase]}. CPU, TLB, tabla/permisos, RAM, timer y kernel.`,
    shapes,
  };
}
