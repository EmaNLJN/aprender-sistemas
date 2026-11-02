import { ServerError } from '../../../shared/ui/form';
import AccessHeading from './AccessHeading';
import { ASK_NEW_LINK } from './access-texts';
import ResetPasswordForm from './ResetPasswordForm';

interface ResetPasswordScreenProps {
  readonly token: string;
  readonly email: string | null;
  readonly headingLevel: 1 | 2;
  onDone(email: string): void;
}

const INCOMPLETE_LINK = 'El enlace para restablecer la contraseña no está completo.';

const ResetPasswordScreen = ({ token, email, headingLevel, onDone }: ResetPasswordScreenProps) => {
  if (email !== null) {
    return (
      <ResetPasswordForm token={token} email={email} headingLevel={headingLevel} onDone={onDone} />
    );
  }
  return (
    <div className="form-stack">
      <AccessHeading level={headingLevel}>Elegí una contraseña nueva</AccessHeading>
      <ServerError messages={[INCOMPLETE_LINK, ASK_NEW_LINK]} takeFocus />
    </div>
  );
};

export default ResetPasswordScreen;
