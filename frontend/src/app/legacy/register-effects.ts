import { celebrate, stop } from '../../shared/lib/celebration';

declare global {
  interface Window {
    TallerEffects: Readonly<{ celebrate: typeof celebrate; stop: typeof stop }>;
  }
}

window.TallerEffects = Object.freeze({ celebrate, stop });
