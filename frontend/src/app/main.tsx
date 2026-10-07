import '../../styles.css';
import '../../lab.css';
import '../pages/atlas/ui/atlas.css';
import '../../campaign.css';
import '../../quest-explorers.css';
import '../../systems.css';

// The import order is the temporary compatibility seam for legacy window.Taller* adapters.
import './legacy/register-catalogs';
import './legacy/register-runner';
import './legacy/register-editor';
import '../../lab-explorers.js';
import '../../quest-explorers.js';
import './legacy/register-systems-lowlevel';
import './legacy/register-systems-infra';
import './legacy/register-systems-play';
import './legacy/register-systems-pc';
import '../../lab.js';
import './legacy/register-atlas';
import './legacy/register-campaign-engine';
import './legacy/register-effects';
import '../../campaign.js';
import './legacy/register-systems-engine';
import './legacy/register-project-kit';
import '../../systems.js';
import { startApp } from '../../app.js';

startApp();
