export const LAB_KEY = 'taller-laboratorio-v1';
export const LAB_WRITE = `set ${LAB_KEY}`;
// After a prediction or a run, the lab syncs Systems and the campaign, which save their own keys.
export const SYNC_WRITES = ['set taller-systems-v1', 'set taller-campaign-v1'];
