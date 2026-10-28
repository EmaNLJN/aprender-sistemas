import type { PublishedUser } from '../../../entities/session';
import type { AccessRequest } from '../model/access-request';
import AccessHeading from './AccessHeading';

interface AccessScreenProps {
  readonly request: AccessRequest;
  onFinish(user: PublishedUser): void;
  reloadDocument(): void;
}

const AccessScreen = ({ request }: AccessScreenProps) => (
  <div className="form-stack">
    <AccessHeading level={request.presentation === 'page' ? 1 : 2}>Ingresá al taller</AccessHeading>
    <p>Usá el email con el que te invitaron.</p>
  </div>
);

export default AccessScreen;
