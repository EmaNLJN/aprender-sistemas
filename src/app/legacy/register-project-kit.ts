import {
  buildKitFiles,
  findCoreExercise,
  zipKit,
  type Kit,
  type KitArchive,
  type KitDraftRecord,
  type KitExercise,
  type KitLanguage,
  type KitOptions,
  type KitWorkshop,
} from '../../features/download-project-kit';
import { downloadBlob } from '../../shared/lib/download-file';

interface LabBridge {
  getExercises(): KitExercise[];
  exportState(): { records: Record<string, KitDraftRecord | undefined> };
}

declare global {
  interface Window {
    TallerLab?: LabBridge;
    TallerProjectKit: Readonly<{
      files: typeof files;
      archive: typeof archive;
      download: typeof download;
    }>;
  }
}

function files(workshop: KitWorkshop, language: string, options: KitOptions = {}): Kit {
  const lab = window.TallerLab as LabBridge;
  const exercise = findCoreExercise(workshop, language, lab.getExercises());
  const record = lab.exportState().records[exercise.id] || {};
  return buildKitFiles(workshop, language as KitLanguage, exercise, record, options);
}

function archive(workshop: KitWorkshop, language: string, options?: KitOptions): KitArchive {
  return zipKit(files(workshop, language, options));
}

function download(workshop: KitWorkshop, language: string): void {
  const result = archive(workshop, language);
  downloadBlob(new Blob([result.bytes], { type: 'application/zip' }), result.name);
}

window.TallerProjectKit = { files, archive, download };
