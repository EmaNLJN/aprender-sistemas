import { defineModel } from '../../model/define-model';
import { button, cell, metric } from '../../lib/view-builders';
import type { ModelView } from '../../model/types';
import {
  achievedFlags,
  baseState,
  resetAction,
  resetButton,
  type LowlevelContext,
  type LowlevelHandler,
  type LowlevelState,
} from './shared';

type MmuFlag = 'protection' | 'translate' | 'map';

interface PageEntry {
  frame: number;
  write: boolean;
}

export interface MmuState extends LowlevelState<MmuFlag> {
  pageSize: number;
  table: (PageEntry | null)[];
  last: string;
  faults: number;
}

type MmuAction = 'reset' | 'map' | 'write-enable' | 'access';

const ADDRESS_LIMIT = 15;

const initialState = (): MmuState => ({
  ...baseState<MmuFlag>(),
  pageSize: 4,
  table: [{ frame: 2, write: false }, { frame: 0, write: true }, null, { frame: 1, write: true }],
  last: 'Sin acceso',
  faults: 0,
});

const mapPage: LowlevelHandler<MmuState> = (s, { log }) => {
  s.table[2] = { frame: 3, write: true };
  log(s, 'El software agregó VPN 2 → marco 3 con lectura/escritura. Ahora probá VA 9.');
};

const enableWrite: LowlevelHandler<MmuState> = (s, { log }) => {
  const entry = s.table[0];
  if (!entry) throw new Error('Estado de MMU inconsistente: falta la entrada de VPN 0');
  entry.write = true;
  log(
    s,
    'El sistema cambió el permiso de VPN 0. Este modelo no tiene TLB: el próximo acceso consulta la tabla.',
  );
};

interface Access {
  address: number;
  mode: 'r' | 'w';
}

function parseAccess(value: string | undefined): Access | null {
  const [addressText, mode] = String(value).split(':');
  const address = Number(addressText);
  if (!Number.isInteger(address) || address < 0 || address > ADDRESS_LIMIT) return null;
  return mode === 'r' || mode === 'w' ? { address, mode } : null;
}

function missingPage(s: MmuState, address: number, { log }: LowlevelContext<MmuState>): void {
  s.faults++;
  s.last = 'Fallo: no presente';
  log(
    s,
    `VA ${address} = VPN ${Math.floor(address / 4)} + offset ${address % 4}. No hay mapeo: no inventamos una dirección física.`,
  );
}

function protectedPage(s: MmuState, vpn: number, { log }: LowlevelContext<MmuState>): void {
  s.flags.protection = true;
  s.faults++;
  s.last = 'Fallo de protección';
  log(
    s,
    `VPN ${vpn} existe pero es de solo lectura. La escritura se rechaza antes de tocar memoria.`,
  );
}

function translate(
  s: MmuState,
  { address }: Access,
  entry: PageEntry,
  { log }: LowlevelContext<MmuState>,
): void {
  const offset = address % 4;
  s.last = `VA ${address} → PA ${entry.frame * 4 + offset}`;
  s.flags.translate = true;
  if (Math.floor(address / 4) === 2) s.flags.map = true;
  log(
    s,
    `${s.last}: marco ${entry.frame} × 4 + offset ${offset}. El offset se conserva; la página cambia de ubicación.`,
  );
}

const access: LowlevelHandler<MmuState> = (s, context) => {
  const request = parseAccess(context.value);
  if (!request) return;
  const vpn = Math.floor(request.address / 4);
  const entry = s.table[vpn];
  if (!entry) missingPage(s, request.address, context);
  else if (request.mode === 'w' && !entry.write) protectedPage(s, vpn, context);
  else translate(s, request, entry, context);
};

const describeEntry = (entry: PageEntry | null): string =>
  entry ? `Marco ${entry.frame} · R${entry.write ? 'W' : ''}` : 'No presente';

function mmuView(s: MmuState): ModelView {
  return {
    title: 'Traductor de direcciones',
    summary:
      'Páginas de cuatro unidades. Todas las entradas presentes permiten lectura; W habilita escritura.',
    metrics: [
      metric('Último acceso', s.last),
      metric('Fallos', s.faults),
      metric('Tamaño de página', 4),
    ],
    cells: s.table.map((entry, i) =>
      cell(`VPN ${i}`, describeEntry(entry), entry ? 'good' : 'bad'),
    ),
    controls: [
      button('access', 'Leer VA 1', '1:r'),
      button('access', 'Escribir VA 1', '1:w'),
      button('access', 'Leer VA 5', '5:r'),
      button('access', 'Leer VA 9', '9:r'),
      button('map', 'Mapear VPN 2 → marco 3'),
      button('write-enable', 'Dar escritura a VPN 0'),
      resetButton,
    ],
    log: s.log,
    explanation:
      'Probá primero lectura y escritura sobre VA 1. Después VA 9 falla hasta agregar su mapeo. El hardware MMU aplica la traducción; el sistema operativo decide tablas y permisos. Aquí ambos se representan con datos.',
  };
}

export const mmuModel = defineModel<MmuState, MmuAction>({
  logLimit: 12,
  initial: initialState,
  actions: { reset: resetAction(), map: mapPage, 'write-enable': enableWrite, access },
  view: mmuView,
  achieved: achievedFlags,
});
