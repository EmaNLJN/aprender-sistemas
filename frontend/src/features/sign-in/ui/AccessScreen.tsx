import { useState } from 'react';
import { useStore } from 'zustand';
import { sessionStore, type PublishedUser } from '../../../entities/session';
import type { AccessRequest } from '../model/access-request';
import { EXPIRED_NOTICE } from './access-texts';
import InvitationScreen from './InvitationScreen';
import LoginForm from './LoginForm';
import PrivacyReacceptance from './PrivacyReacceptance';

interface AccessScreenProps {
  readonly request: AccessRequest;
  onFinish(user: PublishedUser): void;
  reloadDocument(): void;
}

type Screen =
  | { readonly kind: 'login'; readonly email: string; readonly notice: string | null }
  | { readonly kind: 'invitation'; readonly token: string }
  | { readonly kind: 'privacy'; readonly account: PublishedUser };

function loginScreen(notice: string | null, email = ''): Screen {
  return { kind: 'login', email, notice };
}

function initialScreen(request: AccessRequest, account: PublishedUser | null): Screen {
  if (request.token?.kind === 'invitation')
    return { kind: 'invitation', token: request.token.token };
  if (account !== null && !account.privacyAccepted) return { kind: 'privacy', account };
  return loginScreen(request.reason === 'expired' ? EXPIRED_NOTICE : null);
}

const AccessScreen = ({ request, onFinish, reloadDocument }: AccessScreenProps) => {
  const account = useStore(sessionStore, (state) => state.user);
  const passwordResetByMail = useStore(sessionStore, (state) => state.features.passwordReset);
  const [screen, setScreen] = useState(() => initialScreen(request, account));
  const level = request.presentation === 'page' ? 1 : 2;
  const signedIn = (user: PublishedUser): void => {
    if (user.privacyAccepted) onFinish(user);
    else setScreen({ kind: 'privacy', account: user });
  };
  switch (screen.kind) {
    case 'invitation':
      return (
        <InvitationScreen
          token={screen.token}
          headingLevel={level}
          onCreated={onFinish}
          onGoToSignIn={() => setScreen(loginScreen(null))}
        />
      );
    case 'privacy':
      return (
        <PrivacyReacceptance
          account={screen.account}
          headingLevel={level}
          onAccepted={onFinish}
          onSessionLost={() => setScreen(loginScreen(EXPIRED_NOTICE))}
          reloadDocument={reloadDocument}
        />
      );
    case 'login':
      return (
        <LoginForm
          headingLevel={level}
          initialEmail={screen.email}
          notice={screen.notice}
          passwordResetByMail={passwordResetByMail}
          onSignedIn={signedIn}
        />
      );
  }
};

export default AccessScreen;
