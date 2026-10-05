interface SyncAfterRunDependencies {
  syncSystems: () => void;
  syncCampaign: () => { xpGained?: number } | undefined;
  isCampaignMission: () => boolean;
  notify: (message: string) => void;
  logError: (error: unknown) => void;
  formatXp?: (xp: number) => string;
}

const defaultFormatXp = (xp: number): string =>
  `+${xp} XP. Tu progreso de campaña está actualizado.`;

// Sincroniza Sistemas y campaña con el resultado ya guardado. Un fallo aquí se informa
// pero nunca altera ni reinterpreta el resultado del compilador (ADR 0003, punto 8).
// Cada sincronización va en su propio try: un fallo de Sistemas no impide intentar campaña,
// y con uno o dos fallos el alumno recibe un único aviso.
export function syncAfterRun(dependencies: SyncAfterRunDependencies): void {
  const { syncSystems, syncCampaign, isCampaignMission, notify, logError } = dependencies;
  const formatXp = dependencies.formatXp ?? defaultFormatXp;
  let failed = false;
  const recordFailure = (error: unknown): void => {
    failed = true;
    logError(error);
  };
  try {
    syncSystems();
  } catch (error) {
    recordFailure(error);
  }
  try {
    const game = syncCampaign();
    if (game?.xpGained && isCampaignMission()) notify(formatXp(game.xpGained));
  } catch (error) {
    recordFailure(error);
  }
  if (failed) notify('No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.');
}
