import { createRoot } from 'react-dom/client';
import AccountRoot from './AccountRoot';
import { apiClient } from './api-client';

let mounted = false;

export function mountAccountRoot(): void {
  if (mounted) return;
  const host = document.getElementById('account-root');
  const entryHost = document.getElementById('account-entry');
  if (host === null || entryHost === null) return;
  mounted = true;
  const root = createRoot(host, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar la cuenta.', error);
    },
  });
  root.render(<AccountRoot client={apiClient} entryHost={entryHost} />);
}
