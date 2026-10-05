import { runCode } from '../../shared/api/playground';

declare global {
  interface Window {
    TallerRunner: Readonly<{ run: typeof runCode }>;
  }
}

// Real consumer: lab.js uses only run (endpoints and timeoutMs had no uses).
window.TallerRunner = Object.freeze({ run: runCode });
