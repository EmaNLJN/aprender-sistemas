import { createContext, useContext } from 'react';
import type { ApiClient } from './api-client';

export const ApiClientContext = createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (client === null) {
    throw new Error('Falta ApiClientContext: la raíz de la cuenta provee el cliente.');
  }
  return client;
}
