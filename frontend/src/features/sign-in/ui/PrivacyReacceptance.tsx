import { useEffect, useRef, useState } from 'react';
import { PRIVACY_NOTICE, PrivacyNoticeText } from '../../../entities/privacy-notice';
import type { PublishedUser } from '../../../entities/session';
import { useApiClient, type ApiFailure } from '../../../shared/api/http';
import { ServerError, describeFailure, useGuardedSubmit } from '../../../shared/ui/form';
import { acceptPrivacy } from '../api/access-endpoints';
import { signOut } from '../model/sign-out';
import AccessHeading from './AccessHeading';

interface PrivacyReacceptanceProps {
  readonly account: PublishedUser;
  readonly headingLevel: 1 | 2;
  onAccepted(user: PublishedUser): void;
  onSessionLost(): void;
  reloadDocument(): void;
}

interface Problem {
  readonly messages: readonly string[];
  readonly offerReload: boolean;
}

const NOTICE_CHANGED =
  'El aviso de privacidad cambió desde la última vez que lo aceptaste. Leelo y aceptalo para seguir.';
const VERSION_CHANGED = 'El aviso de privacidad cambió: recargá la página para leer el vigente.';

function versionChanged(failure: ApiFailure): boolean {
  return (
    failure.kind === 'response' && failure.status === 422 && 'privacyVersion' in failure.fieldErrors
  );
}

function problemOf(failure: ApiFailure): Problem {
  if (versionChanged(failure)) return { messages: [VERSION_CHANGED], offerReload: true };
  const description = describeFailure(failure, []);
  return { messages: description.generalMessages, offerReload: description.offerReload };
}

const PrivacyReacceptance = ({
  account,
  headingLevel,
  onAccepted,
  onSessionLost,
  reloadDocument,
}: PrivacyReacceptanceProps) => {
  const client = useApiClient();
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    acceptButtonRef.current?.focus();
  }, []);
  const [pending, setPending] = useState<'accept' | 'leave' | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  const accept = useGuardedSubmit(async () => {
    setPending('accept');
    setProblem(null);
    const result = await acceptPrivacy(client, account.id, PRIVACY_NOTICE.version);
    if (result.ok) {
      onAccepted({ ...account, privacyAccepted: true });
      return;
    }
    setPending(null);
    if (describeFailure(result.failure, []).signedOut) {
      onSessionLost();
      return;
    }
    setProblem(problemOf(result.failure));
  });

  const leave = useGuardedSubmit(async () => {
    setPending('leave');
    setProblem(null);
    const outcome = await signOut({ client, userId: account.id });
    if (outcome.kind === 'signed-out') {
      reloadDocument();
      return;
    }
    setPending(null);
    setProblem(problemOf(outcome.failure));
  });

  return (
    <div className="form-stack">
      <AccessHeading level={headingLevel}>Aviso de privacidad</AccessHeading>
      <p>{NOTICE_CHANGED}</p>
      <PrivacyNoticeText headingLevel={headingLevel === 1 ? 2 : 3} />
      <ServerError messages={problem?.messages ?? []} takeFocus>
        {problem?.offerReload ? (
          <button className="button secondary" type="button" onClick={reloadDocument}>
            Recargar
          </button>
        ) : null}
      </ServerError>
      <div className="form-actions">
        <button
          className="button"
          type="button"
          ref={acceptButtonRef}
          disabled={pending !== null}
          onClick={() => void accept()}
        >
          {pending === 'accept' ? 'Guardando…' : 'Acepto'}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={pending !== null}
          onClick={() => void leave()}
        >
          {pending === 'leave' ? 'Saliendo…' : 'Salir'}
        </button>
      </div>
    </div>
  );
};

export default PrivacyReacceptance;
