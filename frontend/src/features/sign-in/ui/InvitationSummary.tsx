import { formatLocalDateTime } from '../../../shared/lib/format-local-date-time';
import type { InvitationDetails } from '../api/access-endpoints';

interface InvitationSummaryProps {
  readonly details: InvitationDetails;
}

const InvitationSummary = ({ details }: InvitationSummaryProps) => (
  <div className="form-field">
    <p>Te invitaron con {details.email}.</p>
    {details.role === 'admin' ? <p>La cuenta va a tener rol de admin.</p> : null}
    <p>La invitación vence el {formatLocalDateTime(details.expiresAt)}.</p>
    <p>Si recargás esta página, vas a tener que abrir el enlace otra vez.</p>
  </div>
);

export default InvitationSummary;
