import type { Ref } from 'react';

interface AccountEntryProps {
  readonly ref: Ref<HTMLButtonElement>;
  readonly expanded: boolean;
  onOpen(): void;
}

const AccountEntry = ({ ref, expanded, onOpen }: AccountEntryProps) => (
  <button
    ref={ref}
    type="button"
    className="account-entry-button"
    aria-haspopup="dialog"
    aria-expanded={expanded}
    onClick={onOpen}
  >
    Tu cuenta
  </button>
);

export default AccountEntry;
