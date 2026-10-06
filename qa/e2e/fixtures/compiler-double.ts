import type { Page } from '@playwright/test';
import {
  PLAYGROUND_ENDPOINT,
  compilerReply,
  type CompilerKind,
  type ExerciseUnderTest,
} from '../lib/compiler-results';

export class CompilerDouble {
  readonly requests: string[] = [];

  constructor(private readonly page: Page) {}

  async answer(exercise: ExerciseUnderTest, kind: CompilerKind): Promise<void> {
    const reply = compilerReply(exercise, kind);
    await this.page.route(PLAYGROUND_ENDPOINT[exercise.language], async (route) => {
      this.requests.push(`${route.request().method()} ${route.request().url()}`);
      if (reply.kind === 'abort') await route.abort('failed');
      else await route.fulfill({ status: 200, contentType: 'application/json', json: reply.body });
    });
  }

  async hold(exercise: ExerciseUnderTest): Promise<void> {
    await this.page.route(PLAYGROUND_ENDPOINT[exercise.language], () => {
      this.requests.push(`held ${exercise.language}`);
    });
  }
}
