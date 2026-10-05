import { mountCodeEditor } from '../../shared/ui/code-editor';

declare global {
  interface Window {
    TallerEditor: Readonly<{ mount: typeof mountCodeEditor }>;
  }
}

// Real consumer: lab.js uses only mount (name and controller.view had no uses).
window.TallerEditor = Object.freeze({ mount: mountCodeEditor });
