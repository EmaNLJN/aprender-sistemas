import type { PcPhase } from './types';

export const PHASE_LABELS: Record<PcPhase, string> = {
  fetch: 'CPU · frontera de instrucciones',
  tlb: 'Consultar TLB',
  walk: 'Caminar tabla de páginas',
  permission: 'Comprobar permiso',
  memory: 'Acceder a RAM',
  fault: 'Kernel · resolver excepción',
  irq: 'Kernel · atender timer',
  halt: 'CPU detenida',
};
