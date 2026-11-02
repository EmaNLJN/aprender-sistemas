import '../../styles.css';
import '../pages/project/ui/project.css';
import '../../lab.css';
import '../pages/atlas/ui/atlas.css';
import '../../campaign.css';
import '../../quest-explorers.css';
import '../pages/systems/ui/systems.css';
import '../shared/ui/form/form.css';
import '../entities/privacy-notice/ui/privacy-notice.css';
import '../features/sign-in/ui/access.css';
import '../pages/account/ui/account.css';

import { sessionStage, tokenStage } from './boot/account-stages';
import { contentGate } from './boot/content-stage';
import { legacyViews } from './boot/legacy-views';
import { runBoot } from './boot/run-boot';

// qa/load-order-check.ts reads this call: a new stage goes here and in its table.
runBoot([tokenStage, sessionStage, contentGate, legacyViews]).catch((error: unknown) => {
  console.error('No se pudo iniciar el taller.', error);
});
