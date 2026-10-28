import { useState } from 'react';
import { useStore } from 'zustand';
import { sessionStore, type PublishedUser } from '../../../entities/session';
import type { AccessRequest } from '../model/access-request';
import LoginForm from './LoginForm';

interface AccessScreenProps {
  readonly request: AccessRequest;
  onFinish(user: PublishedUser): void;
  reloadDocument(): void;
}

interface LoginScreen {
  readonly kind: 'login';
  readonly email: string;
  readonly notice: string | null;
}

const EXPIRED_NOTICE = 'Tu sesión venció. Ingresá de nuevo para seguir.';

function initialScreen(request: AccessRequest): LoginScreen {
  return { kind: 'login', email: '', notice: request.reason === 'expired' ? EXPIRED_NOTICE : null };
}

const AccessScreen = ({ request, onFinish }: AccessScreenProps) => {
  const [screen] = useState(() => initialScreen(request));
  const passwordResetByMail = useStore(sessionStore, (state) => state.features.passwordReset);
  return (
    <LoginForm
      headingLevel={request.presentation === 'page' ? 1 : 2}
      initialEmail={screen.email}
      notice={screen.notice}
      passwordResetByMail={passwordResetByMail}
      onSignedIn={onFinish}
    />
  );
};

export default AccessScreen;
