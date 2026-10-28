import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, type BrowserContext, type Page, type Request, type Route } from '@playwright/test';
import { INVITATION, STUDENT, errorBody, type PublishedAccount } from '../lib/api-contract';

export type ApiRoute = `${'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} /api/${string}`;

export interface ApiCall {
  method: string;
  path: string;
  search: string;
  xsrf: string | undefined;
  user: string | undefined;
  body: unknown;
}

export interface ApiReply {
  status: number;
  json?: unknown;
  body?: string;
  contentType?: string;
  headers?: Record<string, string>;
}

export type ApiHandler = (call: ApiCall) => ApiReply | Promise<ApiReply>;

const MODIFYING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FEATURES = { passwordReset: false, registration: false };
const META = resolve(import.meta.dirname, '../../../build/curriculum.meta.json');
const CONTENT_VERSION = (
  JSON.parse(readFileSync(META, 'utf8')) as { documentHash: string }
).documentHash.slice(0, 32);

function callOf(request: Request): ApiCall {
  const headers = request.headers();
  const text = request.postData();
  return {
    method: request.method(),
    path: new URL(request.url()).pathname,
    search: new URL(request.url()).search,
    xsrf: headers['x-xsrf-token'],
    user: headers['x-taller-user'],
    body: text ? (JSON.parse(text) as unknown) : undefined,
  };
}

function nameOf(body: unknown): string {
  const name = (body as { name?: unknown } | undefined)?.name;
  return typeof name === 'string' ? name : '';
}

export class ApiDouble {
  account: PublishedAccount | null;
  signInAccount: PublishedAccount = STUDENT;
  readonly calls: ApiCall[] = [];
  private readonly unhandled: string[] = [];
  private readonly handlers = new Map<ApiRoute, ApiHandler>();
  private readonly queued = new Map<ApiRoute, ApiReply[]>();
  private xsrfGeneration = 1;

  private constructor(
    private readonly context: BrowserContext,
    private readonly origin: string,
    account: PublishedAccount | null,
  ) {
    this.account = account;
    this.installDefaults();
  }

  static async install(
    page: Page,
    context: BrowserContext,
    baseURL: string,
    account: PublishedAccount | null,
  ): Promise<ApiDouble> {
    const api = new ApiDouble(context, new URL(baseURL).origin, account);
    await api.setXsrfCookie();
    await page.route('**/api/**', (route) => api.handle(route));
    return api;
  }

  xsrfValue(): string {
    return `e2e-xsrf-${this.xsrfGeneration}=`;
  }

  on(route: ApiRoute, handler: ApiHandler): void {
    this.handlers.set(route, handler);
  }

  reply(route: ApiRoute, ...replies: ApiReply[]): void {
    this.queued.set(route, [...replies]);
  }

  callsTo(route: ApiRoute): ApiCall[] {
    const [method, path] = route.split(' ');
    return this.calls.filter((call) => call.method === method && call.path === path);
  }

  assertAllHandled(): void {
    expect(this.unhandled, 'Pedidos a /api sin respuesta en el doble de la API').toEqual([]);
  }

  private async setXsrfCookie(): Promise<void> {
    await this.context.addCookies([
      { name: 'XSRF-TOKEN', value: encodeURIComponent(this.xsrfValue()), url: this.origin },
    ]);
  }

  private async rotateXsrf(): Promise<void> {
    this.xsrfGeneration += 1;
    await this.setXsrfCookie();
  }

  private async handle(route: Route): Promise<void> {
    const call = callOf(route.request());
    this.calls.push(call);
    const reply = await this.replyTo(call);
    await route.fulfill({
      status: reply.status,
      headers: reply.headers,
      contentType: reply.contentType ?? (reply.json === undefined ? undefined : 'application/json'),
      body: reply.json === undefined ? reply.body : JSON.stringify(reply.json),
    });
  }

  private async replyTo(call: ApiCall): Promise<ApiReply> {
    const route = `${call.method} ${call.path}` as ApiRoute;
    if (MODIFYING.has(call.method) && call.xsrf !== this.xsrfValue()) {
      return { status: 419, json: errorBody('csrf_token_mismatch') };
    }
    const next = this.queued.get(route)?.shift();
    if (next !== undefined) return next;
    const handler = this.handlers.get(route);
    if (handler !== undefined) return handler(call);
    this.unhandled.push(route);
    return { status: 404, json: errorBody('not_found') };
  }

  private installDefaults(): void {
    this.on('GET /api/session', () => ({
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
      json: {
        user: this.account,
        features: FEATURES,
        contentVersion: CONTENT_VERSION,
        catalogs: [],
      },
    }));
    this.on('POST /api/auth/login', async () => {
      this.account = this.signInAccount;
      await this.rotateXsrf();
      return { status: 200, json: { data: this.signInAccount } };
    });
    this.on('POST /api/auth/logout', async () => {
      this.account = null;
      await this.rotateXsrf();
      return { status: 204 };
    });
    this.on('POST /api/auth/invitations/lookup', () => ({
      status: 200,
      json: { email: INVITATION.email, role: INVITATION.role, expiresAt: INVITATION.expiresAt },
    }));
    this.on('POST /api/auth/invitations/accept', async (call) => {
      const created: PublishedAccount = {
        id: 77,
        name: nameOf(call.body),
        email: INVITATION.email,
        role: 'student',
        privacyAccepted: true,
      };
      this.account = created;
      await this.rotateXsrf();
      return { status: 201, json: { data: created } };
    });
    this.on('POST /api/auth/reset-password', () => ({ status: 200, json: {} }));
    this.on('POST /api/me/privacy', () => {
      if (this.account !== null) this.account = { ...this.account, privacyAccepted: true };
      return { status: 204 };
    });
  }
}
