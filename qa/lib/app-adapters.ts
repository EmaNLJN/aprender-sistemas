// Contrato entre app.js y los adaptadores `window.Taller*`: la lista única de métodos
// que app.js invoca de cada uno (verificada leyendo app.js: render, init, reinicio,
// exportación, importación en dos fases y respaldos). El DOM falso de app-shell-check se
// construye desde acá y boot-check comprueba que los adaptadores reales publiquen
// exactamente estos métodos; si app.js empieza a usar otro, se agrega acá y ambos checks lo exigen.
export const APP_ADAPTER_METHODS = {
  TallerLab: [
    'init',
    'mount',
    'unmount',
    'getExercises',
    'exportState',
    'planImport',
    'applyImport',
    'reset',
    'loadWarning',
    'backups',
  ],
  TallerAtlas: ['mount', 'unmount'],
  TallerCampaign: ['init', 'refresh', 'sync', 'mount', 'unmount'],
  TallerSystems: ['init', 'sync', 'mount', 'unmount', 'resetSimulations'],
  TallerCampaignEngine: ['exportState', 'planImport', 'applyImport', 'reset', 'backups'],
  TallerSystemsEngine: ['exportState', 'planImport', 'applyImport', 'reset', 'backups'],
} as const;

export type AdapterName = keyof typeof APP_ADAPTER_METHODS;

export const APP_ADAPTER_NAMES = Object.keys(APP_ADAPTER_METHODS) as AdapterName[];

// Métodos de `adapter` que faltan en `target`, con el nombre `Adaptador.método`.
export function missingAdapterMethods(target: Record<string, unknown>): string[] {
  return APP_ADAPTER_NAMES.flatMap((name) => {
    const adapter = target[name] as Record<string, unknown> | undefined;
    return APP_ADAPTER_METHODS[name]
      .filter((method) => typeof adapter?.[method] !== 'function')
      .map((method) => `${name}.${method}`);
  });
}
