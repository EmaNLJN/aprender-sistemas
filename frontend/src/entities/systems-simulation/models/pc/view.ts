import { button, cell, metric } from '../../lib/view-builders';
import type { CellTone, ModelView, ViewCell, ViewControl, ViewMetric } from '../../model/types';
import { PHASE_LABELS } from './phase-labels';
import { architectureScene } from './scene';
import { storeSuffix } from './instruction-text';
import type { PageEntry, PcState } from './types';

const EXPLANATION =
  'Recorrido sugerido: completá LOAD 1 y LOAD 2 para comparar miss/hit. Inyectá timer y hacé ACK + retorno. LOAD 9 provoca ausencia: mapeá y reintentá. Terminá el programa, cargá la escritura prohibida y comprobá que RAM[5] sigue en 21. Las metas observadas se conservan entre programas; Reiniciar todo las borra del simulador.';

const permission = (entry: PageEntry | null) => (entry ? (entry.write ? 'RW' : 'R') : '—');

function kernelControls(s: PcState): ViewControl[] {
  if (s.phase === 'irq')
    return [button('ack', 'Reconocer IRQ · ACK'), button('return', 'Retornar de IRQ')];
  if (s.phase !== 'fault' || !s.trap) return [];
  if (s.trap.cause === 'protection')
    return [button('abort', 'Kernel · terminar programa prohibido')];
  if (s.trap.cause !== 'absent') return [];
  return [
    ...(s.trap.mapped ? [] : [button('map', 'Kernel · mapear página ausente')]),
    button('return', 'Retornar y reintentar el mismo PC'),
  ];
}

function controlsOf(s: PcState): ViewControl[] {
  const step = s.halted || s.mode !== 'user' ? [] : [button('step', stepLabel(s))];
  return [
    ...step,
    ...(s.halted ? [] : [button('pulse', 'Inyectar IRQ de timer')]),
    ...kernelControls(s),
    button('program', 'Cargar programa normal', 'normal'),
    button('program', 'Probar escritura prohibida', 'protection'),
    button('reset', 'Reiniciar todo'),
  ];
}

function stepLabel(s: PcState): string {
  return s.phase === 'fetch' ? 'Un paso · CPU' : 'Un paso · ' + PHASE_LABELS[s.phase];
}

function tableRows(s: PcState): string[][] {
  const rows: string[][] = [];
  for (let vpn = 0; vpn < 3; vpn++) {
    const pte = s.table[vpn];
    const cached = s.tlb[vpn];
    rows.push(['PTE', `VPN ${vpn}`, pte ? `marco ${pte.frame}` : 'ausente', permission(pte)]);
    rows.push([
      'TLB',
      `VPN ${vpn}`,
      cached ? `marco ${cached.frame}` : 'vacía',
      permission(cached),
    ]);
  }
  for (let frame = 0; frame < 3; frame++)
    rows.push([
      'RAM',
      `marco ${frame}`,
      `PA ${frame * 4}..${frame * 4 + 3}`,
      s.ram.slice(frame * 4, frame * 4 + 4).join(' · '),
    ]);
  return rows;
}

function metricsOf(s: PcState): ViewMetric[] {
  return [
    metric('PC', s.pc),
    metric('Acumulador', s.acc),
    metric('Modo', s.mode),
    metric('TLB hit / miss', `${s.hits} / ${s.misses}`),
    metric('Faults / IRQ', `${s.faults} / ${s.interrupts}`),
    metric('Instrucciones retiradas', s.retired),
  ];
}

function programCells(s: PcState): ViewCell[] {
  return s.program.map((instruction, index) => {
    const tone: CellTone = index === s.pc ? 'active' : index < s.pc ? 'good' : 'muted';
    const text =
      instruction.op === 'HALT'
        ? 'HALT'
        : `${instruction.op} ${instruction.va}${storeSuffix(instruction)}`;
    return cell(`PC ${index}`, text, tone);
  });
}

export function pcView(s: PcState): ModelView {
  return {
    title: 'PC de bolsillo · seguí un acceso de punta a punta',
    summary: `${PHASE_LABELS[s.phase]}. Las instrucciones viven en una lista; solo los accesos de datos atraviesan esta MMU.`,
    metrics: metricsOf(s),
    cells: programCells(s),
    columns: ['Estructura', 'Índice', 'Destino', 'Permiso / contenido'],
    rows: tableRows(s),
    controls: controlsOf(s),
    log: s.log,
    scene: architectureScene(s),
    explanation: EXPLANATION,
  };
}
