import type { FunctionComponent } from 'react';
import type { PublishedUser } from '../../../entities/session';

interface LoginFormProps {
  readonly headingLevel: 1 | 2;
  readonly initialEmail: string;
  readonly notice: string | null;
  readonly passwordResetByMail: boolean;
  onSignedIn(user: PublishedUser): void;
}

const LoginForm: FunctionComponent<LoginFormProps> = () => null;

export default LoginForm;
