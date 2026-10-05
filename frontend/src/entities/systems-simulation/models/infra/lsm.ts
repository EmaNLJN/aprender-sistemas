import { defineModel } from '../../model/define-model';
import type { SystemsModel } from '../../model/types';
import { button, cell, metric } from '../../lib/view-builders';
import {
  INFRA_LOG_LIMIT,
  achievedFlags,
  infraView,
  note,
  shown,
  withInfraBase,
  type InfraHandler,
  type InfraState,
} from './base';

interface LsmEntry {
  key: string;
  value: string;
  seq: number;
  deleted: boolean;
}

export interface LsmState extends InfraState {
  mem: LsmEntry[];
  runs: LsmEntry[][];
  seq: number;
}

type LsmAction = 'delete' | 'flush' | 'unsafe' | 'partial' | 'full';
type LsmHandler = InfraHandler<LsmState>;

function newest(entries: LsmEntry[]): LsmEntry[] {
  const byKey = new Map<string, LsmEntry>();
  for (const entry of entries) {
    const known = byKey.get(entry.key);
    if (!known || known.seq < entry.seq) byKey.set(entry.key, entry);
  }
  return [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

function lsmRead(s: LsmState): string | null {
  const latest = newest([...s.mem, ...s.runs.flat()]).find((e) => e.key === 'ore');
  return latest && !latest.deleted ? latest.value : null;
}

const deleteOre: LsmHandler = (s, ctx) => {
  s.mem.push({ key: 'ore', value: '', seq: s.seq++, deleted: true });
  note(
    s,
    ctx,
    'DELETE crea un tombstone con secuencia nueva. No borra mágicamente los datos de SST antiguas.',
  );
};

const flush: LsmHandler = (s, ctx) => {
  if (!s.mem.length) {
    note(s, ctx, 'La memtable está vacía; no se creó una SST.');
    return;
  }
  s.runs.unshift(newest(s.mem));
  s.mem = [];
  note(s, ctx, 'Flush: la memtable pasa a una nueva SST. La versión antigua sigue en otra SST.');
};

const unsafe: LsmHandler = (s, ctx) => {
  const before = lsmRead(s);
  if (s.runs.length > 1) s.runs[0] = s.runs[0].filter((e) => !e.deleted);
  if (before === null && lsmRead(s) === 'cobre') s.flags['lsm-resurrection'] = true;
  note(
    s,
    ctx,
    `Compactación insegura de solo la SST nueva: ore=${shown(lsmRead(s))}. Quitar el marcador puede revelar la versión antigua fuera del conjunto.`,
  );
};

const partial: LsmHandler = (s, ctx) => {
  if (s.runs.length > 1) {
    s.runs[0] = newest(s.runs[0]);
    if (s.runs[0].some((e) => e.deleted && e.key === 'ore') && lsmRead(s) === null)
      s.flags['lsm-retained'] = true;
  }
  note(
    s,
    ctx,
    'Compactación parcial segura: se conservan tombstones porque podrían existir versiones fuera del conjunto seleccionado.',
  );
};

const full: LsmHandler = (s, ctx) => {
  if (s.mem.length) {
    note(s, ctx, 'Primero hacé flush: esta acción compacta SST, no la memtable.');
    return;
  }
  const merged = newest(s.runs.flat());
  const hadDelete = merged.some((e) => e.key === 'ore' && e.deleted);
  s.runs = [merged.filter((e) => !e.deleted)];
  if (hadDelete && lsmRead(s) === null && s.runs[0].some((e) => e.key === 'water'))
    s.flags['lsm-reclaimed'] = true;
  note(
    s,
    ctx,
    'Se incluyeron TODAS las versiones y asumimos que no hay snapshots activos: ahora es seguro retirar los tombstones y sus valores antiguos.',
  );
};

export const lsmModel: SystemsModel<LsmState> = defineModel<LsmState, LsmAction>({
  logLimit: INFRA_LOG_LIMIT,
  initial: () =>
    withInfraBase({
      mem: [],
      runs: [
        [
          { key: 'ore', value: 'cobre', seq: 1, deleted: false },
          { key: 'water', value: 'agua', seq: 2, deleted: false },
        ],
      ],
      seq: 3,
    }),
  actions: { delete: deleteOre, flush, unsafe, partial, full },
  view: infraView((s) => ({
    title: 'El dato que volvió de la tumba',
    summary: 'La marca de borrado también es información.',
    metrics: [
      metric('Lectura ore', shown(lsmRead(s))),
      metric('SST', s.runs.length),
      metric('Memtable', s.mem.length),
    ],
    cells: [
      cell('Memtable', s.mem.map((e) => e.key + ':DEL@' + e.seq).join(' · ') || 'vacía', 'active'),
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
      button('delete', 'Borrar ore'),
      button('flush', 'Flush a SST'),
      button('unsafe', 'Provocar: tirar tombstone parcial'),
      button('partial', 'Compactar parcial conservando DEL'),
      button('full', 'Compactar todas sin snapshots'),
    ],
  })),
  achieved: achievedFlags,
});
