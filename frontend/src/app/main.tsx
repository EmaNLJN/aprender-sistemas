import '../../styles.css';
import '../../lab.css';
import '../pages/atlas/ui/atlas.css';
import '../../campaign.css';
import '../../quest-explorers.css';
import '../../systems.css';

import { contentGate } from './boot/content-stage';
import { legacyViews } from './boot/legacy-views';
import { runBoot } from './boot/run-boot';

// qa/load-order-check.ts reads this call: a new stage goes here and in its table.
runBoot([contentGate, legacyViews]).catch((error: unknown) => {
  console.error('No se pudo iniciar el taller.', error);
});
