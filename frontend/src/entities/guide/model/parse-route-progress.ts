import type { ParsedState } from '../../../shared/lib/versioned-storage';
import type { RouteProgressV1 } from './route-progress';
import type { GuideData } from './types';

export const ROUTE_FORMAT_ERROR = 'Formato de progreso no compatible.';

export function blankRouteProgress(): RouteProgressV1 {
  throw new Error('not implemented');
}

export function parseRouteProgress(_raw: unknown, _guide: GuideData): ParsedState<RouteProgressV1> {
  throw new Error('not implemented');
}
