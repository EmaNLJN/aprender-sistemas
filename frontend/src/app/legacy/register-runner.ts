import { runCode } from '../../shared/api/playground';

declare global {
  interface Window {
    TallerRunner: Readonly<{ run: typeof runCode }>;
  }
}

// Consumidor real: lab.js usa sólo run (endpoints y timeoutMs no tenían usos).
window.TallerRunner = Object.freeze({ run: runCode });
