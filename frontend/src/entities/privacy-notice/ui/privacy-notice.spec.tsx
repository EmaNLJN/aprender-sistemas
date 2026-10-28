import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { PRIVACY_NOTICE } from '../config/privacy-notice';
import PrivacyNoticeDialog from './PrivacyNoticeDialog';
import PrivacyNoticeText from './PrivacyNoticeText';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

const Opener = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Aviso de privacidad
      </button>
      {open ? <PrivacyNoticeDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
};

describe('the privacy notice', () => {
  it('carries the version that the stack accepts by default', () => {
    expect(PRIVACY_NOTICE.version).toBe('2026-10-dev');
  });

  it('shows each section under a heading of the level it is given', () => {
    render(<PrivacyNoticeText headingLevel={2} />);
    for (const section of PRIVACY_NOTICE.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
    }
  });

  it('opens as a dialog named after the notice and gives the focus back when it closes', async () => {
    const user = userEvent.setup();
    render(<Opener />);
    const opener = screen.getByRole('button', { name: 'Aviso de privacidad' });
    await user.click(opener);
    expect(screen.getByRole('dialog', { name: 'Aviso de privacidad' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Aviso de privacidad' })).toBeNull();
    expect(opener).toHaveFocus();
  });
});
