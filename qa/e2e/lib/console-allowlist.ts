export interface AllowedIssue {
  pattern: RegExp;
  reason: string;
}

export const CONSOLE_ALLOWLIST: readonly AllowedIssue[] = [];
