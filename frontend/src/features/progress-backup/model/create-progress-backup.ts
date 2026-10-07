import type { ProgressBackup, ProgressBackupOptions } from './types';

export function createProgressBackup(options: ProgressBackupOptions): ProgressBackup {
  void options;
  throw new Error('not implemented');
}

export function assertImportSize(size: number): void {
  void size;
  throw new Error('not implemented');
}

export function importFailureNotice(error: unknown): string {
  void error;
  throw new Error('not implemented');
}
