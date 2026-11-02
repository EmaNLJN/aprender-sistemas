import type { CampaignBridges } from './campaign-bridges';

declare global {
  interface Window {
    TallerCampaign: Readonly<CampaignBridges & { mount: typeof mount; unmount: typeof unmount }>;
  }
}

export const mount: (
  host: HTMLElement | null,
  requestedLanguage: string,
  notify: (message: string) => void,
) => void = () => {
  throw new Error('not implemented');
};

export const unmount = (): void => {
  throw new Error('not implemented');
};
