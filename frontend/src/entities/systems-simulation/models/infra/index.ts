import { backpressureModel } from './backpressure';
import { balancingModel } from './balancing';
import { clocksModel } from './clocks';
import { lsmModel } from './lsm';
import { networkModel } from './network';
import { quorumModel } from './quorum';
import { shardingModel } from './sharding';
import { walModel } from './wal';

// Key order is the one systems-infra.js used to publish.
export const infraModels = {
  wal: walModel,
  lsm: lsmModel,
  quorum: quorumModel,
  clocks: clocksModel,
  network: networkModel,
  backpressure: backpressureModel,
  balancing: balancingModel,
  sharding: shardingModel,
};

export type InfraModels = typeof infraModels;

export type { BackpressureState } from './backpressure';
export type { BalancingState } from './balancing';
export type { ClocksState } from './clocks';
export type { LsmState } from './lsm';
export type { NetworkState } from './network';
export type { QuorumState } from './quorum';
export type { ShardingState } from './sharding';
export type { WalState } from './wal';
