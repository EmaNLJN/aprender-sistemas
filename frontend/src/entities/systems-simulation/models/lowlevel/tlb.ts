import { defineModel } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView, ViewCell } from '../../model/types';
import {
  achievedFlags,
  baseState,
  resetAction,
  resetButton,
  type LowlevelHandler,
  type LowlevelState,
} from './shared';

type TlbFlag = 'hit' | 'stale' | 'recover';

export interface TlbState extends LowlevelState<TlbFlag> {
  tableFrame: number;
  cachedFrame: number | null;
  invalidated: boolean;
  hits: number;
  misses: number;
  last: string;
}

type TlbAction = 'reset' | 'remap' | 'invalidate' | 'read';

const initialState = (): TlbState => ({
  ...baseState<TlbFlag>(),
  tableFrame: 1,
  cachedFrame: null,
  invalidated: false,
  hits: 0,
  misses: 0,
  last: 'Sin acceso',
});

const remap: LowlevelHandler<TlbState> = (s, { log }) => {
  s.tableFrame = 3;
  s.invalidated = false;
  log(
    s,
    'Tabla cambiada: VPN 0 → marco 3. Dejamos intencionalmente la TLB vieja para observar el fallo de mantenimiento.',
  );
};

const invalidate: LowlevelHandler<TlbState> = (s, { log }) => {
  s.cachedFrame = null;
  s.invalidated = true;
  log(s, 'Invalidamos VPN 0 en esta TLB. El próximo acceso deberá consultar otra vez la tabla.');
};

function lookup(s: TlbState, log: (message: string) => void): number {
  if (s.cachedFrame === null) {
    s.misses++;
    s.cachedFrame = s.tableFrame;
    log(`TLB MISS: la tabla provee marco ${s.tableFrame}; lo guardamos en la TLB.`);
  } else {
    s.hits++;
    s.flags.hit = true;
    log(`TLB HIT: usamos el marco cacheado ${s.cachedFrame} sin volver a caminar la tabla.`);
  }
  return s.cachedFrame;
}

const read: LowlevelHandler<TlbState> = (s, context) => {
  const log = (message: string) => context.log(s, message);
  const frame = lookup(s, log);
  s.last = `VA 1 → PA ${frame * 4 + 1}`;
  if (frame !== s.tableFrame) {
    s.flags.stale = true;
    log(
      'Traducción obsoleta: cambiar la tabla no actualizó esta copia. Es un escenario deliberadamente incorrecto.',
    );
  }
  if (s.invalidated && s.tableFrame === 3 && frame === 3) s.flags.recover = true;
  log(s.last);
};

function describeTlb(s: TlbState): ViewCell {
  const stale = s.cachedFrame !== null && s.cachedFrame !== s.tableFrame;
  return cell(
    'TLB del procesador',
    s.cachedFrame === null ? 'Vacía' : `0 → ${s.cachedFrame}`,
    stale ? 'bad' : 'active',
  );
}

function tlbView(s: TlbState): ModelView {
  return {
    title: 'La copia rápida también necesita mantenimiento',
    summary: 'Una dirección fija: VA 1, VPN 0, offset 1. Página de cuatro unidades.',
    metrics: [
      metric('Hits TLB', s.hits),
      metric('Misses TLB', s.misses),
      metric('Resultado', s.last),
    ],
    cells: [cell('Tabla del sistema', `0 → ${s.tableFrame}`, 'good'), describeTlb(s)],
    controls: [
      button('read', 'Leer VA 1'),
      button('remap', 'Cambiar tabla a marco 3'),
      button('invalidate', 'Invalidar VPN 0'),
      resetButton,
    ],
    log: s.log,
    explanation:
      'Leé dos veces, cambiá la tabla y leé de nuevo. La copia vieja sigue activa en este modelo. Invalidala y repetí. Una máquina real exige la operación de invalidación y el orden de memoria que especifique su arquitectura.',
  };
}

export const tlbModel = defineModel<TlbState, TlbAction>({
  logLimit: 12,
  initial: initialState,
  actions: { reset: resetAction(), remap, invalidate, read },
  view: tlbView,
  achieved: achievedFlags,
});
