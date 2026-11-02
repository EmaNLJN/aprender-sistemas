import { useState } from 'react';
import { signOut } from '../../../features/sign-in';
import { useApiClient } from '../../../shared/api/http';
import {
  ServerError,
  describeFailure,
  useGuardedSubmit,
  useRetryCountdown,
  type FailureDescription,
} from '../../../shared/ui/form';

interface SignOutSectionProps {
  readonly userId: number;
  reloadDocument(): void;
}

const NOTE = 'Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.';
const SIGN_OUT_FAILED = 'No pudimos cerrar la sesión.';

function messagesFor(failure: FailureDescription | null): readonly string[] {
  if (failure === null) return [];
  if (failure.offerReload || failure.retryAfterSeconds !== null) return failure.generalMessages;
  return [SIGN_OUT_FAILED];
}

function buttonLabel(pending: boolean, failure: FailureDescription | null): string {
  if (pending) return 'Saliendo…';
  return failure === null ? 'Salir' : 'Reintentar';
}

const SignOutSection = ({ userId, reloadDocument }: SignOutSectionProps) => {
  const client = useApiClient();
  const countdown = useRetryCountdown();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<FailureDescription | null>(null);
  const leave = useGuardedSubmit(async () => {
    setPending(true);
    setFailure(null);
    const outcome = await signOut({ client, userId });
    if (outcome.kind === 'signed-out') {
      reloadDocument();
      return;
    }
    const description = describeFailure(outcome.failure, []);
    setPending(false);
    setFailure(description);
    if (description.retryAfterSeconds !== null) countdown.start(description.retryAfterSeconds);
  });
  const offerReload = failure?.offerReload === true;
  return (
    <div className="account-sign-out">
      <p className="form-hint">{NOTE}</p>
      <ServerError messages={messagesFor(failure)} takeFocus>
        {offerReload ? (
          <button className="button secondary" type="button" onClick={reloadDocument}>
            Recargar
          </button>
        ) : null}
      </ServerError>
      {offerReload ? null : (
        <button
          className="button dark"
          type="button"
          disabled={pending || countdown.waiting}
          onClick={() => void leave()}
        >
          {buttonLabel(pending, failure)}
        </button>
      )}
    </div>
  );
};

export default SignOutSection;
