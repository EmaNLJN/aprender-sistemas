import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { checkNewPasswordLength } from '../../../entities/session';
import { useApiClient, type ApiFailure } from '../../../shared/api/http';
import {
  PasswordField,
  ServerError,
  describeFailure,
  messagesOf,
  showFailure,
  useGuardedSubmit,
  useRetryCountdown,
} from '../../../shared/ui/form';
import { resetPassword } from '../api/access-endpoints';
import AccessHeading from './AccessHeading';
import { ASK_NEW_LINK, MISMATCH, PASSWORD_HINT, REQUIRED } from './access-texts';

interface ResetValues {
  password: string;
  password_confirmation: string;
}

interface ResetPasswordFormProps {
  readonly token: string;
  readonly email: string;
  readonly headingLevel: 1 | 2;
  onDone(email: string): void;
}

const VISIBLE_FIELDS = ['password', 'password_confirmation'] as const;

function tokenRejected(failure: ApiFailure): boolean {
  return failure.kind === 'response' && 'token' in failure.fieldErrors;
}

const ResetPasswordForm = ({ token, email, headingLevel, onDone }: ResetPasswordFormProps) => {
  const client = useApiClient();
  const countdown = useRetryCountdown();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    criteriaMode: 'all',
    defaultValues: { password: '', password_confirmation: '' },
  });

  useEffect(() => {
    setFocus('password');
  }, [setFocus]);

  const submit = useGuardedSubmit(async (values: ResetValues) => {
    const result = await resetPassword(client, { token, email, ...values });
    if (result.ok) {
      onDone(email);
      return;
    }
    const described = describeFailure(result.failure, VISIBLE_FIELDS);
    const description = tokenRejected(result.failure)
      ? { ...described, generalMessages: [...described.generalMessages, ASK_NEW_LINK] }
      : described;
    showFailure(setError, description, VISIBLE_FIELDS);
    if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
  });

  const fieldHasError = VISIBLE_FIELDS.some((field) => errors[field] !== undefined);
  return (
    <form className="form-stack" noValidate onSubmit={(event) => void handleSubmit(submit)(event)}>
      <AccessHeading level={headingLevel}>Elegí una contraseña nueva</AccessHeading>
      <p>Para {email}.</p>
      <ServerError messages={messagesOf(errors.root?.serverError)} takeFocus={!fieldHasError} />
      <PasswordField
        label="Contraseña nueva"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        registration={register('password', {
          required: REQUIRED,
          validate: { length: (value) => value === '' || checkNewPasswordLength(value) },
        })}
        messages={messagesOf(errors.password)}
      />
      <PasswordField
        label="Repetí la contraseña nueva"
        autoComplete="new-password"
        registration={register('password_confirmation', {
          required: REQUIRED,
          validate: { same: (value, values) => value === values.password || MISMATCH },
        })}
        messages={messagesOf(errors.password_confirmation)}
      />
      <div className="form-actions">
        <button className="button" type="submit" disabled={isSubmitting || countdown.waiting}>
          {isSubmitting ? 'Cambiando la contraseña…' : 'Cambiar la contraseña'}
        </button>
      </div>
    </form>
  );
};

export default ResetPasswordForm;
