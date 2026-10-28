import type { ReactNode } from 'react';

interface UrlStateProviderProps {
  children: ReactNode;
}

export const UrlStateProvider = (_props: UrlStateProviderProps): ReactNode => {
  throw new Error('not implemented');
};

export function startUrlStateSync(): void {
  throw new Error('not implemented');
}
