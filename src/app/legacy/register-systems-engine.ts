import { createSystemsEngine, type SystemsEngine } from '../../entities/systems-workshop';

declare global {
  interface Window {
    TallerSystemsEngine: SystemsEngine;
  }
}

window.TallerSystemsEngine = createSystemsEngine();
