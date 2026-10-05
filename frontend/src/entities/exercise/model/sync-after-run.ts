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

// Syncs Systems and campaign with the already-saved result. A failure here is reported
// but never alters or reinterprets the compiler result (ADR 0003, point 8).
// Each sync runs in its own try: a Systems failure does not prevent trying campaign,
// and with one or two failures the student gets a single warning.
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
