export interface PrivacyNoticeSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface PrivacyNotice {
  readonly version: string;
  readonly title: string;
  readonly sections: readonly PrivacyNoticeSection[];
}

export declare const PRIVACY_NOTICE: PrivacyNotice;
