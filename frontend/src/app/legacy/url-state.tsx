import type { ReactNode } from 'react';
import { NuqsAdapter, enableHistorySync } from 'nuqs/adapters/react';

interface UrlStateProviderProps {
  children: ReactNode;
}

export const UrlStateProvider = ({ children }: UrlStateProviderProps) => (
  <NuqsAdapter defaultOptions={{ history: 'replace' }}>{children}</NuqsAdapter>
);

export function startUrlStateSync(): void {
  enableHistorySync();
}
