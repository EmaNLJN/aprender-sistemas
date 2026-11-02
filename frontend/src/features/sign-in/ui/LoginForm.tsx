import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PrivacyNoticeDialog } from '../../../entities/privacy-notice';
import type { PublishedUser } from '../../../entities/session';
import { useApiClient } from '../../../shared/api/http';
import {
  PasswordField,
  ServerError,
  TextField,
  describeFailure,
  messagesOf,
  showFailure,
  useGuardedSubmit,
  useRetryCountdown,
} from '../../../shared/ui/form';
import { login } from '../api/access-endpoints';
import AccessHeading from './AccessHeading';
import { REQUIRED } from './access-texts';

interface LoginValues {
  email: string;
  password: string;
  remember: boolean;
}

interface LoginFormProps {
  readonly headingLevel: 1 | 2;
  readonly initialEmail: string;
  readonly notice: string | null;
  readonly passwordResetByMail: boolean;
  onSignedIn(user: PublishedUser): void;
}

const VISIBLE_FIELDS = ['email', 'password'] as const;

const LoginForm = ({
  headingLevel,
  initialEmail,
  notice,
  passwordResetByMail,
  onSignedIn,
}: LoginFormProps) => {
  const client = useApiClient();
  const countdown = useRetryCountdown();
  const rememberId = useId();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    criteriaMode: 'all',
    defaultValues: { email: initialEmail, password: '', remember: false },
  });

  useEffect(() => {
    setFocus(initialEmail === '' ? 'email' : 'password');
  }, [setFocus, initialEmail]);

  const submit = useGuardedSubmit(async (values: LoginValues) => {
    const result = await login(client, values);
    if (result.ok) {
      onSignedIn(result.value);
      return;
    }
    const description = describeFailure(result.failure, VISIBLE_FIELDS);
    showFailure(setError, description, VISIBLE_FIELDS);
    if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
  });

  const fieldHasError = errors.email !== undefined || errors.password !== undefined;
  return (
    <>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => void handleSubmit(submit)(event)}
      >
        <AccessHeading level={headingLevel}>Ingresá al taller</AccessHeading>
        <p>Usá el email con el que te invitaron.</p>
        {notice === null ? null : <p className="access-notice">{notice}</p>}
        <ServerError messages={messagesOf(errors.root?.serverError)} takeFocus={!fieldHasError} />
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          registration={register('email', { required: REQUIRED })}
          messages={messagesOf(errors.email)}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="current-password"
          registration={register('password', { required: REQUIRED })}
          messages={messagesOf(errors.password)}
        />
        <div className="form-check">
          <input
            id={rememberId}
            type="checkbox"
            aria-describedby={`${rememberId}-hint`}
            {...register('remember')}
          />
          <label htmlFor={rememberId}>Recordarme en este navegador por 30 días</label>
        </div>
        <p id={`${rememberId}-hint`} className="form-hint">
          No la marques en una computadora compartida.
        </p>
        <div className="form-actions">
          <button className="button" type="submit" disabled={isSubmitting || countdown.waiting}>
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>
        {passwordResetByMail ? null : (
          <p className="form-hint">
            ¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.
          </p>
        )}
        <button type="button" className="text-button" onClick={() => setPrivacyOpen(true)}>
          Aviso de privacidad
        </button>
      </form>
      {privacyOpen ? <PrivacyNoticeDialog onClose={() => setPrivacyOpen(false)} /> : null}
    </>
  );
};

export default LoginForm;
