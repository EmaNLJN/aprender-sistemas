import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PRIVACY_NOTICE, PrivacyNoticeDialog } from '../../../entities/privacy-notice';
import { checkNewPasswordLength, type PublishedUser } from '../../../entities/session';
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
import { acceptInvitation, type InvitationDetails } from '../api/access-endpoints';
import { invitationProblem } from '../model/invitation-problem';
import AcceptPrivacyField from './AcceptPrivacyField';
import AccessHeading from './AccessHeading';
import { MISMATCH, PASSWORD_HINT, REQUIRED } from './access-texts';
import InvitationSummary from './InvitationSummary';

interface SignupValues {
  name: string;
  password: string;
  password_confirmation: string;
  accepted: boolean;
}

interface SignupFormProps {
  readonly token: string;
  readonly details: InvitationDetails;
  readonly headingLevel: 1 | 2;
  onCreated(user: PublishedUser): void;
  onGoToSignIn(): void;
}

const VISIBLE_FIELDS = ['name', 'password', 'password_confirmation'] as const;
const ACCEPT_REQUIRED = 'Para crear tu cuenta, aceptá el aviso de privacidad.';

const SignupForm = ({ token, details, headingLevel, onCreated, onGoToSignIn }: SignupFormProps) => {
  const client = useApiClient();
  const countdown = useRetryCountdown();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [offerSignIn, setOfferSignIn] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    criteriaMode: 'all',
    defaultValues: { name: '', password: '', password_confirmation: '', accepted: false },
  });

  useEffect(() => {
    setFocus('name');
  }, [setFocus]);

  const submit = useGuardedSubmit(async (values: SignupValues) => {
    const result = await acceptInvitation(client, {
      token,
      name: values.name,
      password: values.password,
      password_confirmation: values.password_confirmation,
      privacyVersion: PRIVACY_NOTICE.version,
    });
    if (result.ok) {
      onCreated(result.value);
      return;
    }
    const problem = invitationProblem(result.failure);
    const described = describeFailure(result.failure, VISIBLE_FIELDS);
    const description = problem === null ? described : { ...described, generalMessages: problem };
    showFailure(setError, description, VISIBLE_FIELDS);
    setOfferSignIn(problem !== null);
    if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
  });

  const fieldHasError = VISIBLE_FIELDS.some((field) => errors[field] !== undefined);
  return (
    <>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => void handleSubmit(submit)(event)}
      >
        <AccessHeading level={headingLevel}>Creá tu cuenta</AccessHeading>
        <InvitationSummary details={details} />
        <ServerError messages={messagesOf(errors.root?.serverError)} takeFocus={!fieldHasError}>
          {offerSignIn ? (
            <button className="button secondary" type="button" onClick={onGoToSignIn}>
              Ir al ingreso
            </button>
          ) : null}
        </ServerError>
        <TextField
          label="Tu nombre"
          autoComplete="name"
          registration={register('name', { required: REQUIRED })}
          messages={messagesOf(errors.name)}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          registration={register('password', {
            required: REQUIRED,
            validate: { length: (value) => value === '' || checkNewPasswordLength(value) },
          })}
          messages={messagesOf(errors.password)}
        />
        <PasswordField
          label="Repetí la contraseña"
          autoComplete="new-password"
          registration={register('password_confirmation', {
            required: REQUIRED,
            validate: { same: (value, values) => value === values.password || MISMATCH },
          })}
          messages={messagesOf(errors.password_confirmation)}
        />
        <AcceptPrivacyField
          registration={register('accepted', { required: ACCEPT_REQUIRED })}
          messages={messagesOf(errors.accepted)}
          onRead={() => setPrivacyOpen(true)}
        />
        <div className="form-actions">
          <button className="button" type="submit" disabled={isSubmitting || countdown.waiting}>
            {isSubmitting ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
          </button>
        </div>
      </form>
      {privacyOpen ? <PrivacyNoticeDialog onClose={() => setPrivacyOpen(false)} /> : null}
    </>
  );
};

export default SignupForm;
