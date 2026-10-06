import { expect, type Page } from '@playwright/test';
import { CONSOLE_ALLOWLIST, type AllowedIssue } from '../lib/console-allowlist';

export interface RecordedIssue {
  kind: 'pageerror' | 'console.error';
  text: string;
}

export class PageIssues {
  private readonly recorded: RecordedIssue[] = [];
  private readonly expected: (AllowedIssue & { seen: boolean })[] = [];

  constructor(page: Page) {
    page.on('pageerror', (error) => this.recorded.push({ kind: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error')
        this.recorded.push({ kind: 'console.error', text: message.text() });
    });
  }

  expectIssue(pattern: RegExp, reason: string): void {
    this.expected.push({ pattern, reason, seen: false });
  }

  private isAllowed(issue: RecordedIssue): boolean {
    const global = CONSOLE_ALLOWLIST.some((entry) => entry.pattern.test(issue.text));
    const local = this.expected.filter((entry) => entry.pattern.test(issue.text));
    local.forEach((entry) => (entry.seen = true));
    return global || local.length > 0;
  }

  assertClean(): void {
    const unexpected = this.recorded.filter((issue) => !this.isAllowed(issue));
    expect(unexpected, 'La página registró errores que no están en la lista blanca').toEqual([]);
    const unseen = this.expected.filter((entry) => !entry.seen).map((entry) => entry.reason);
    expect(unseen, 'Se esperaba un error de la página que no ocurrió').toEqual([]);
  }
}
