import { expect, type BrowserContext } from '@playwright/test';

export class StrictNetwork {
  readonly blocked: string[] = [];

  private constructor(private readonly origin: string) {}

  static async install(context: BrowserContext, baseURL: string): Promise<StrictNetwork> {
    const network = new StrictNetwork(new URL(baseURL).origin);
    await context.route(
      (url) => url.origin !== network.origin,
      async (route) => {
        network.blocked.push(`${route.request().method()} ${route.request().url()}`);
        await route.abort('blockedbyclient');
      },
    );
    return network;
  }

  assertNothingBlocked(): void {
    expect(this.blocked, 'Pedidos fuera del servidor de pruebas sin respuesta simulada').toEqual(
      [],
    );
  }
}
