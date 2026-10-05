import { mountCodeEditor } from '../../shared/ui/code-editor';

declare global {
  interface Window {
    TallerEditor: Readonly<{ mount: typeof mountCodeEditor }>;
  }
}

window.TallerEditor = Object.freeze({ mount: mountCodeEditor });
