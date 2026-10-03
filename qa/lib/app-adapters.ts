// Contrato entre app.js y los adaptadores `window.Taller*`: la lista única de métodos
// que app.js invoca de cada uno (verificada leyendo app.js: render, init, reinicio,
// exportación e importación). El DOM falso de app-shell-check se construye desde acá
// y boot-check comprueba que los adaptadores reales publiquen exactamente estos
// métodos; si app.js empieza a usar otro, se agrega acá y ambos checks lo exigen.
export const APP_ADAPTER_METHODS = {
  TallerLab: [
    'mount',
    'unmount',
    'getExercises',
    'exportState',
    'validateImport',
    'importState',
    'reset',
    'loadWarning',
  ],
  TallerAtlas: ['mount', 'unmount'],
  TallerCampaign: ['init', 'sync', 'mount', 'unmount'],
  TallerSystems: ['init', 'mount', 'unmount', 'resetSimulations'],
  TallerCampaignEngine: ['exportState', 'validateImport', 'importState', 'reset'],
  TallerSystemsEngine: ['exportState', 'validateImport', 'importState', 'reset'],
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
