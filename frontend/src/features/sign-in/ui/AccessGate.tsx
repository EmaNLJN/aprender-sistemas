import { useSyncExternalStore } from 'react';
import { sessionStore, type PublishedUser } from '../../../entities/session';
import type { AccessRequests } from '../model/access-request';
import AccessDialog from './AccessDialog';
import AccessPage from './AccessPage';
import AccessScreen from './AccessScreen';

interface AccessGateProps {
  readonly requests: AccessRequests;
  setShellInert(inert: boolean): void;
  reloadDocument(): void;
}

const AccessGate = ({ requests, setShellInert, reloadDocument }: AccessGateProps) => {
  const request = useSyncExternalStore(requests.subscribe, requests.current);
  if (request === null) return null;
  const finish = (user: PublishedUser): void => {
    sessionStore.getState().applyUser(user);
    requests.finish(user);
  };
  const screen = (
    <AccessScreen
      key={request.id}
      request={request}
      onFinish={finish}
      reloadDocument={reloadDocument}
    />
  );
  if (request.presentation === 'page') {
    return <AccessPage setShellInert={setShellInert}>{screen}</AccessPage>;
  }
  return <AccessDialog>{screen}</AccessDialog>;
};

export default AccessGate;
