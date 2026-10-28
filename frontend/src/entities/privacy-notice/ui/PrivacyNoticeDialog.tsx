import { useEffect, useId, useRef } from 'react';
import { PRIVACY_NOTICE } from '../config/privacy-notice';
import PrivacyNoticeText from './PrivacyNoticeText';

interface PrivacyNoticeDialogProps {
  onClose(): void;
}

const PrivacyNoticeDialog = ({ onClose }: PrivacyNoticeDialogProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const opener = document.activeElement;
    const element = dialog.current;
    if (element !== null && !element.open) element.showModal();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);
  return (
    <dialog ref={dialog} className="privacy-dialog" aria-labelledby={titleId} onClose={onClose}>
      <div className="dialog-content">
        <div className="dialog-top">
          <h2 id={titleId}>{PRIVACY_NOTICE.title}</h2>
          <button
            type="button"
            className="close-dialog"
            aria-label="Cerrar"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <PrivacyNoticeText headingLevel={3} />
      </div>
    </dialog>
  );
};

export default PrivacyNoticeDialog;
