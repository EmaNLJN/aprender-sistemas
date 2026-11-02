import { useEffect, useState } from 'react';
import type { PublishedUser } from '../../../entities/session';
import { useApiClient, type ApiFailure } from '../../../shared/api/http';
import { describeFailure } from '../../../shared/ui/form';
import { lookupInvitation, type InvitationDetails } from '../api/access-endpoints';
import { invitationProblem } from '../model/invitation-problem';
import InvitationProblem from './InvitationProblem';
import SignupForm from './SignupForm';

interface InvitationScreenProps {
  readonly token: string;
  readonly headingLevel: 1 | 2;
  onCreated(user: PublishedUser): void;
  onGoToSignIn(): void;
}

type Lookup =
  | { readonly state: 'checking' }
  | { readonly state: 'ready'; readonly details: InvitationDetails }
  | { readonly state: 'failed'; readonly messages: readonly string[] };

function lookupFailureMessages(failure: ApiFailure): readonly string[] {
  return invitationProblem(failure) ?? describeFailure(failure, []).generalMessages;
}

const InvitationScreen = ({
  token,
  headingLevel,
  onCreated,
  onGoToSignIn,
}: InvitationScreenProps) => {
  const client = useApiClient();
  const [lookup, setLookup] = useState<Lookup>({ state: 'checking' });
  useEffect(() => {
    let active = true;
    void lookupInvitation(client, token).then((result) => {
      if (!active) return;
      setLookup(
        result.ok
          ? { state: 'ready', details: result.value }
          : { state: 'failed', messages: lookupFailureMessages(result.failure) },
      );
    });
    return () => {
      active = false;
    };
  }, [client, token]);
  if (lookup.state === 'checking') return <p role="status">Revisando tu invitación…</p>;
  if (lookup.state === 'failed') {
    return (
      <InvitationProblem
        headingLevel={headingLevel}
        messages={lookup.messages}
        onGoToSignIn={onGoToSignIn}
      />
    );
  }
  return (
    <SignupForm
      token={token}
      details={lookup.details}
      headingLevel={headingLevel}
      onCreated={onCreated}
      onGoToSignIn={onGoToSignIn}
    />
  );
};

export default InvitationScreen;
