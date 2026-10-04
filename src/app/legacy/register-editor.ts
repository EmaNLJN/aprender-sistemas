import { mountCodeEditor } from '../../shared/ui/code-editor';

declare global {
  interface Window {
    TallerEditor: Readonly<{ mount: typeof mountCodeEditor }>;
  }
}

// Consumidor real: lab.js usa sólo mount (name y controller.view no tenían usos).
window.TallerEditor = Object.freeze({ mount: mountCodeEditor });
