import { AccessGate, accessRequests } from '../../features/sign-in';
import { AccountMenu } from '../../pages/account';
import { ApiClientContext, type ApiClient } from '../../shared/api/http';
import { reloadDocument } from '../../shared/lib/reload-document';
import { setShellInert } from './shell-inertness';

interface AccountRootProps {
  readonly client: ApiClient;
  readonly entryHost: HTMLElement;
}

const AccountRoot = ({ client, entryHost }: AccountRootProps) => (
  <ApiClientContext value={client}>
    <AccessGate
      requests={accessRequests}
      setShellInert={setShellInert}
      reloadDocument={reloadDocument}
    />
    <AccountMenu entryHost={entryHost} reloadDocument={reloadDocument} />
  </ApiClientContext>
);

export default AccountRoot;
