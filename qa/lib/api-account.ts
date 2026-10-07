import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { request, type IncomingMessage } from 'node:http';
import { join } from 'node:path';

export interface CheckAccount {
  cookie: string;
  password: string;
  close: () => void;
}

const root = join(import.meta.dirname, '..', '..');

function compose(args: string[], input?: string): string {
  return execFileSync('docker', ['compose', ...args], { cwd: root, encoding: 'utf8', input });
}

function cookiesOf(response: IncomingMessage): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const header of response.headers['set-cookie'] ?? []) {
    const [pair] = header.split(';');
    const separator = pair.indexOf('=');
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  return cookies;
}

function cookieHeader(cookies: Map<string, string>): string {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}

function send(
  base: string,
  method: 'GET' | 'POST',
  path: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; cookies: Map<string, string> }> {
  return new Promise((resolve, reject) => {
    const outgoing = request(`${base}${path}`, { method, headers, agent: false }, (response) => {
      response.resume();
      response.on('end', () =>
        resolve({ status: response.statusCode ?? 0, cookies: cookiesOf(response) }),
      );
    });
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}

function removeAccount(email: string): void {
  const statements = `DELETE FROM users WHERE email = '${email}'; DELETE FROM invitations WHERE email = '${email}'`;
  compose([
    'exec',
    '-T',
    'mysql',
    'sh',
    '-c',
    'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -e "$1"',
    'sh',
    statements,
  ]);
}

// FR-046: the account is created through the real path (invite, CSRF cookie, accept) and the caller
// removes it with close(), also when the check fails.
export async function openAccount(base: string): Promise<CheckAccount> {
  const email = `check-${randomBytes(6).toString('hex')}@taller.invalid`;
  const password = randomBytes(16).toString('hex');
  try {
    const invitation = compose(['exec', '-T', 'php', 'php', 'artisan', 'taller:invite', email]);
    const token = invitation.match(/#invitacion=(\S+)/)?.[1];
    if (!token) throw new Error('taller:invite did not print a link');
    const privacyVersion = compose([
      'exec',
      '-T',
      '-e',
      'HOME=/tmp',
      'php',
      'php',
      'artisan',
      'tinker',
      "--execute=echo config('taller.privacy_version');",
    ]).trim();

    const session = await send(base, 'GET', '/api/session', {});
    const xsrf = decodeURIComponent(session.cookies.get('XSRF-TOKEN') ?? '');
    const accepted = await send(
      base,
      'POST',
      '/api/auth/invitations/accept',
      {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-XSRF-TOKEN': xsrf,
        Cookie: cookieHeader(session.cookies),
      },
      JSON.stringify({
        token,
        name: 'Check',
        password,
        password_confirmation: password,
        privacyVersion,
      }),
    );
    if (accepted.status !== 201)
      throw new Error(`accepting the invitation replied ${accepted.status}`);
    const cookies = new Map([...session.cookies, ...accepted.cookies]);
    return { cookie: cookieHeader(cookies), password, close: () => removeAccount(email) };
  } catch (error) {
    removeAccount(email);
    throw error;
  }
}
