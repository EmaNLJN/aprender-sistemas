import { runCode } from '../../shared/api/playground';

declare global {
  interface Window {
    TallerRunner: Readonly<{ run: typeof runCode }>;
  }
}

window.TallerRunner = Object.freeze({ run: runCode });
