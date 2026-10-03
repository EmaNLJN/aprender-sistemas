interface SyncAfterRunDependencies {
  syncSystems: () => void;
  syncCampaign: () => { xpGained?: number } | undefined;
  isCampaignMission: () => boolean;
  notify: (message: string) => void;
  logError: (error: unknown) => void;
}

// Sincroniza Sistemas y campaña con el resultado ya guardado. Un fallo aquí se informa
// pero nunca altera ni reinterpreta el resultado del compilador (ADR 0003, punto 8).
export function syncAfterRun(dependencies: SyncAfterRunDependencies): void {
  const { syncSystems, syncCampaign, isCampaignMission, notify, logError } = dependencies;
  try {
    syncSystems();
    const game = syncCampaign();
    if (game?.xpGained && isCampaignMission())
      notify(`+${game.xpGained} XP. Tu progreso de campaña está actualizado.`);
  } catch (error) {
    logError(error);
    notify('No se pudo actualizar campaña/Sistemas; tu resultado quedó guardado.');
  }
}
