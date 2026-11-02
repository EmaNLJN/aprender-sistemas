import { useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import { selectReadyAccount, sessionStore } from '../../../entities/session';
import AccountDialog from './AccountDialog';
import AccountEntry from './AccountEntry';

export interface AdministrationProps {
  onClose(): void;
}

interface AccountMenuProps {
  readonly entryHost: HTMLElement;
  readonly administration?: ComponentType<AdministrationProps>;
  reloadDocument(): void;
}

const AccountMenu = ({ entryHost, reloadDocument }: AccountMenuProps) => {
  const account = useStore(sessionStore, selectReadyAccount);
  const [open, setOpen] = useState(false);
  const entryRef = useRef<HTMLButtonElement>(null);
  if (account === null) return null;
  const close = (): void => {
    setOpen(false);
    entryRef.current?.focus();
  };
  return (
    <>
      {createPortal(
        <AccountEntry ref={entryRef} expanded={open} onOpen={() => setOpen(true)} />,
        entryHost,
      )}
      {open ? (
        <AccountDialog account={account} onClose={close} reloadDocument={reloadDocument} />
      ) : null}
    </>
  );
};

export default AccountMenu;
