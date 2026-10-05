import { algebraModel } from './algebra';
import { lifeModel } from './life';
import { minimaxModel } from './minimax';
import { pathfindingModel } from './pathfinding';
import { physicsModel } from './physics';
import { rasterModel } from './raster';
import { raycastModel } from './raycast';
import { transformsModel } from './transforms';

// Key order is the publication order in `window.SYSTEMS_PLAY.models`.
export const playModels = {
  transforms: transformsModel,
  raster: rasterModel,
  raycast: raycastModel,
  pathfinding: pathfindingModel,
  physics: physicsModel,
  life: lifeModel,
  algebra: algebraModel,
  minimax: minimaxModel,
};
