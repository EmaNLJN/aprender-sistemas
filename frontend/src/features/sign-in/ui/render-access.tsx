import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, type Mock } from 'vitest';
import { sessionStore, type PublishedUser } from '../../../entities/session';
import { ApiClientContext, createApiClient, type FetchLike } from '../../../shared/api/http';
import {
  createFakeFetch,
  type FakeReply,
  type RecordedCall,
} from '../../../shared/api/http/fake-fetch';
import {
  createAccessRequests,
  type AccessRequests,
  type SignInOptions,
} from '../model/access-request';
import AccessGate from './AccessGate';

export type AccessUser = ReturnType<typeof userEvent.setup>;

export interface RenderedAccess {
  readonly user: AccessUser;
  readonly signedIn: Promise<PublishedUser>;
  readonly requests: AccessRequests;
  readonly reloadDocument: Mock<() => void>;
  readonly calls: readonly RecordedCall[];
}

const BOOT: SignInOptions = { presentation: 'page', reason: 'boot' };

export function stubDialogs(): void {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
    const delegate = this.querySelector<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex]',
    );
    if (delegate === null) this.tabIndex = -1;
    (delegate ?? this).focus();
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

export function resetSession(user: PublishedUser | null = null): void {
  sessionStore.setState({
    status: user === null ? 'signed-out' : 'signed-in',
    user,
    features: { passwordReset: false, registration: false },
    contentVersion: null,
  });
}

export function renderAccess(
  fetch: FetchLike,
  options: SignInOptions = BOOT,
  calls: readonly RecordedCall[] = [],
): RenderedAccess {
  const user = userEvent.setup();
  const client = createApiClient({ fetch, readCookies: () => 'XSRF-TOKEN=abc' });
  const requests = createAccessRequests();
  const reloadDocument = vi.fn<() => void>();
  render(
    <ApiClientContext value={client}>
      <AccessGate requests={requests} setShellInert={vi.fn()} reloadDocument={reloadDocument} />
    </ApiClientContext>,
  );
  let signedIn: Promise<PublishedUser> = new Promise<PublishedUser>(() => {});
  act(() => {
    signedIn = requests.request(options);
  });
  return { user, signedIn, requests, reloadDocument, calls };
}

export function withReplies(
  replies: readonly FakeReply[],
  options: SignInOptions = BOOT,
): RenderedAccess {
  const fake = createFakeFetch(replies);
  return renderAccess(fake.fetch, options, fake.calls);
}

export async function signIn(user: AccessUser, email: string, password: string): Promise<void> {
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}
