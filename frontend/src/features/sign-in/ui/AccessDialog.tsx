import { useEffect, useRef, type ReactNode } from 'react';

interface AccessDialogProps {
  readonly children: ReactNode;
}

const AccessDialog = ({ children }: AccessDialogProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    if (element !== null && !element.open) element.showModal();
    return () => {
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="access-dialog"
      aria-label="Ingresá al taller"
      onClose={(event) => event.currentTarget.showModal()}
      onCancel={(event) => {
        if (event.target === event.currentTarget) event.preventDefault();
      }}
    >
      <div className="dialog-content">{children}</div>
    </dialog>
  );
};

export default AccessDialog;
