import { ServerError } from '../../../shared/ui/form';
import AccessHeading from './AccessHeading';

interface InvitationProblemProps {
  readonly headingLevel: 1 | 2;
  readonly messages: readonly string[];
  onGoToSignIn(): void;
}

const InvitationProblem = ({ headingLevel, messages, onGoToSignIn }: InvitationProblemProps) => (
  <div className="form-stack">
    <AccessHeading level={headingLevel}>Creá tu cuenta</AccessHeading>
    <ServerError messages={messages} takeFocus>
      <button className="button secondary" type="button" onClick={onGoToSignIn}>
        Ir al ingreso
      </button>
    </ServerError>
  </div>
);

export default InvitationProblem;
