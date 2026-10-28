import { Factory } from 'fishery';
import type { PublishedUser } from './types';

export interface SessionBody {
  user: PublishedUser | null;
  features: { passwordReset: boolean; registration: boolean };
  contentVersion: string | null;
  catalogs: unknown[];
}

export const publishedUserFactory = Factory.define<PublishedUser>(({ sequence }) => ({
  id: 40 + sequence,
  name: 'Ana Pérez',
  email: 'ana@x.com',
  role: 'student',
  privacyAccepted: true,
}));

export const sessionBodyFactory = Factory.define<SessionBody>(() => ({
  user: publishedUserFactory.build(),
  features: { passwordReset: false, registration: false },
  contentVersion: '0123456789abcdef0123456789abcdef',
  catalogs: [],
}));
