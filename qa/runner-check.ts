/* Offline boundary tests for the browser compiler adapter. No remote requests. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { runSource } from './lib/sources.ts';

interface FakeResponse {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}
interface RequestOptions {
  body: string;
  credentials: string;
  signal: AbortSignal;
}
type FetchFn = (url: string, options: RequestOptions) => Promise<FakeResponse> | never;
interface RunInput {
  language: string;
  code: string;
  signal?: AbortSignal;
}
interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  errorType?: string;
  httpStatus?: number;
}
interface Runner {
  run: (input: RunInput) => Promise<RunResult>;
}
interface RunnerWindow {
  TallerRunner: Runner;
}

function setup(fetchFn: FetchFn, quick = false): Runner {
  const window = {} as RunnerWindow;
  const context = vm.createContext({
    window,
    fetch: fetchFn,
    TextEncoder,
    AbortController,
    URLSearchParams,
    setTimeout: quick ? (fn: () => void) => setTimeout(fn, 5) : setTimeout,
    clearTimeout,
  });
  runSource(context, 'runner.js');
  return window.TallerRunner;
}
const response = (data: unknown, status = 200): FakeResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});
const input: RunInput = { language: 'rust', code: 'fn main() {}' };
const tests: [string, () => Promise<void>][] = [
  [
    'Rust payload and output',
    async () => {
      const runner = setup(async (url, options) => {
        assert.equal(url, 'https://play.rust-lang.org/execute');
        assert.equal(JSON.parse(options.body).code, input.code);
        assert.equal(JSON.parse(options.body).edition, '2024');
        assert.equal(options.credentials, 'omit');
        return response({ success: true, stdout: 'hello\n', stderr: 'warning' });
      });
      const result = await runner.run(input);
      assert.equal(result.success, true);
      assert.equal(result.stdout, 'hello\n');
      assert.equal(result.stderr, 'warning');
    },
  ],
  [
    'invalid or empty source makes no request',
    async () => {
      const runner = setup(() => {
        throw new Error('Must not fetch');
      });
      assert.equal(
        (await runner.run({ language: 'javascript', code: 'alert(1)' })).errorType,
        'input',
      );
      assert.equal((await runner.run({ ...input, code: ' ' })).errorType, 'input');
      assert.equal((await runner.run({ ...input, code: 'x'.repeat(200001) })).errorType, 'input');
    },
  ],
  [
    'Go payload, stdout and stderr',
    async () => {
      const runner = setup(async (url, options) => {
        assert.equal(url, 'https://play.golang.org/compile');
        assert.equal(new URLSearchParams(options.body).get('body'), 'package main');
        return response({
          Errors: '',
          Events: [
            { Kind: 'stdout', Message: 'yes\n' },
            { Kind: 'stderr', Message: 'warning\n' },
          ],
          Status: 0,
          TestsFailed: 0,
        });
      });
      const result = await runner.run({ language: 'go', code: 'package main' });
      assert.equal(result.success, true);
      assert.equal(result.stdout, 'yes\n');
      assert.equal(result.stderr, 'warning\n');
    },
  ],
  [
    'Go compilation failure and nil events',
    async () => {
      const result = await setup(async () =>
        response({ Errors: 'compile error', Events: null, Status: 0 }),
      ).run({ language: 'go', code: 'x' });
      assert.equal(result.success, false);
      assert.equal(result.stderr, 'compile error');
    },
  ],
  [
    'Go nonzero exit cannot pass',
    async () => {
      const result = await setup(async () => response({ Errors: '', Events: null, Status: 2 })).run(
        { language: 'go', code: 'x' },
      );
      assert.equal(result.success, false);
      assert.match(result.stderr, /2/);
    },
  ],
  [
    'Rust compiler diagnostics remain exact',
    async () => {
      const result = await setup(async () =>
        response({ success: false, stdout: '', stderr: 'error[E0382]' }),
      ).run(input);
      assert.equal(result.success, false);
      assert.equal(result.stderr, 'error[E0382]');
    },
  ],
  [
    'rate limit is a transport error',
    async () => {
      const result = await setup(async () => response({}, 429)).run(input);
      assert.equal(result.errorType, 'http');
      assert.equal(result.httpStatus, 429);
      assert.equal(result.success, false);
    },
  ],
  [
    'unrecognized service response cannot pass',
    async () => {
      const result = await setup(async () => response({})).run(input);
      assert.equal(result.errorType, 'response');
      assert.equal(result.success, false);
    },
  ],
  [
    'invalid JSON cannot pass',
    async () => {
      const result = await setup(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError();
        },
      })).run(input);
      assert.equal(result.errorType, 'response');
    },
  ],
  [
    'network failure is explained',
    async () => {
      const result = await setup(async () => {
        throw new TypeError('Failed to fetch');
      }).run(input);
      assert.equal(result.errorType, 'network');
      assert.equal(result.success, false);
    },
  ],
  [
    'pre-cancelled request never fetches',
    async () => {
      const controller = new AbortController();
      controller.abort();
      const result = await setup(() => {
        throw new Error('Must not fetch');
      }).run({ ...input, signal: controller.signal });
      assert.equal(result.errorType, 'aborted');
    },
  ],
  [
    'deadline aborts the request',
    async () => {
      const runner = setup(
        (url, options) =>
          new Promise((resolve, reject) =>
            options.signal.addEventListener('abort', () => reject(new Error('Aborted'))),
          ),
        true,
      );
      assert.equal((await runner.run(input)).errorType, 'timeout');
    },
  ],
];
(async () => {
  for (const [name, test] of tests) {
    await test();
    console.log('PASS ' + name);
  }
  console.log(tests.length + '/' + tests.length + ' offline runner scenarios passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
