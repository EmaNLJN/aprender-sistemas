import type { Page } from '@playwright/test';
import {
  PLAYGROUND_ENDPOINT,
  compilerReply,
  type CompilerKind,
  type CompilerReply,
  type CustomOutcome,
  type ExerciseUnderTest,
} from '../lib/compiler-results';

export class CompilerDouble {
  readonly requests: string[] = [];
  readonly bodies: string[] = [];

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

  async answerWithCustom(
    exercise: ExerciseUnderTest,
    kind: CompilerKind,
    custom: CustomOutcome,
  ): Promise<void> {
    await this.fulfillWith(exercise, compilerReply(exercise, kind, custom));
  }

  async answerLater(exercise: ExerciseUnderTest, kind: CompilerKind): Promise<() => void> {
    const reply = compilerReply(exercise, kind);
    let release: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    await this.page.route(PLAYGROUND_ENDPOINT[exercise.language], async (route) => {
      this.requests.push(`held ${exercise.language}`);
      await released;
      if (reply.kind === 'abort') await route.abort('failed');
      else await route.fulfill({ status: 200, contentType: 'application/json', json: reply.body });
    });
    return release;
  }

  private async fulfillWith(exercise: ExerciseUnderTest, reply: CompilerReply): Promise<void> {
    await this.page.route(PLAYGROUND_ENDPOINT[exercise.language], async (route) => {
      this.requests.push(`${route.request().method()} ${route.request().url()}`);
      this.bodies.push(route.request().postData() ?? '');
      if (reply.kind === 'abort') await route.abort('failed');
      else await route.fulfill({ status: 200, contentType: 'application/json', json: reply.body });
    });
  }
}
