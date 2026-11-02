import { useEffect, useId, useRef, useState } from 'react';
import { PrivacyNoticeDialog } from '../../../entities/privacy-notice';
import type { PublishedUser } from '../../../entities/session';
import SignOutSection from './SignOutSection';

interface AccountDialogProps {
  readonly account: PublishedUser;
  onClose(): void;
  onAdminister?(): void;
  reloadDocument(): void;
}

const AccountDialog = ({ account, onClose, reloadDocument }: AccountDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  useEffect(() => {
    const element = dialogRef.current;
    if (element !== null && !element.open) element.showModal();
  }, []);
  return (
    <>
      <dialog
        ref={dialogRef}
        className="account-dialog"
        aria-labelledby={titleId}
        onClose={onClose}
      >
        <div className="dialog-content">
          <h2 id={titleId}>Tu cuenta</h2>
          <p className="account-identity">
            {account.name} · {account.email}
          </p>
          <button type="button" className="text-button" onClick={() => setPrivacyOpen(true)}>
            Aviso de privacidad
          </button>
          <SignOutSection userId={account.id} reloadDocument={reloadDocument} />
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Volver al taller
            </button>
          </div>
        </div>
      </dialog>
      {privacyOpen ? <PrivacyNoticeDialog onClose={() => setPrivacyOpen(false)} /> : null}
    </>
  );
};

export default AccountDialog;
